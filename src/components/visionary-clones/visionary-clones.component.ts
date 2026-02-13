import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService, Scene } from '../../services/gemini.service';
import { ApiKeyService } from '../../services/api-key.service';
import { BundleService } from '../../services/bundle.service';
import { ScriptResult, MusicResult, MusicPromptModel, MetadataModel } from '../../models/bundle.model';
import { ImageModelQuality, getImageModel } from '../../models/image-models';
import { getPersonaPreset } from '../../models/persona-presets';
import JSZip from 'jszip';

type GenerationState = 'idle' | 'identity' | 'script' | 'storyboard' | 'music' | 'done' | 'error';

@Component({
  selector: 'app-visionary-clones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './visionary-clones.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [GeminiService],
})
export class VisionaryClonesComponent {
  private geminiService = inject(GeminiService);
  private apiKeyService = inject(ApiKeyService);
  private bundleService = inject(BundleService);

  // API Key management
  apiKeyInput = '';
  showApiKeyInput = signal(false);

  // Input signals
  referenceImageFile = signal<File | null>(null);
  referenceImageUrl = signal<string | null>(null);
  topic = signal<string>('');
  selectedPersona = signal<string>('Tech Consultant');
  
  // State signals
  generationState = signal<GenerationState>('idle');
  loadingMessage = signal<string>('');
  errorMessage = signal<string>('');
  isDragging = signal(false);
  
  // Output signals
  script = signal<Scene[]>([]);
  scriptResult = signal<ScriptResult | null>(null);
  storyboardImages = signal<string[]>([]);
  musicResult = signal<MusicResult | MusicPromptModel | null>(null);
  
  // Music selection
  selectedMusicGenre = signal<string>('Trap');
  selectedMusicMood = signal<string>('Confident');
  
  // Props
  propsFiles = signal<File[]>([]);
  propsUrls = signal<string[]>([]);
  propsMetadata = signal<Array<{ title?: string }>>([]);
  
  // Image model selection
  selectedImageModel = signal<ImageModelQuality>(ImageModelQuality.BEST_QUALITY);
  
  // Progress tracking
  currentStep = signal<number>(0);
  totalSteps = 4;
  
  // Music intensity (v1.2)
  musicIntensity = signal<number>(3); // Default: medium
  
  // BPM range mapping for intensity
  private readonly INTENSITY_BPM_MAP: Record<number, [number, number]> = {
    1: [60, 75],
    2: [70, 85],
    3: [80, 95],
    4: [90, 105],
    5: [100, 115]
  };

  readonly personas = ['Cinematic Mode', 'Tech Consultant', 'Cape Town Rapper', 'Motivational Speaker', 'Storyteller', 'Teacher/Educator'];
  readonly musicGenres = ['Trap', 'Cinematic', 'Afrobeat', 'Lo-fi', 'Ambient'];
  readonly musicMoods = ['Calm', 'Confident', 'Motivational', 'Dramatic'];
  readonly imageModelQualities = [
    { value: ImageModelQuality.BEST_QUALITY, label: 'Best Quality', description: 'Imagen 4 - Best photorealism' },
    { value: ImageModelQuality.FAST, label: 'Fast', description: 'Gemini 2.5 Flash - Quick generation' },
    { value: ImageModelQuality.ARTISTIC, label: 'Artistic', description: 'Gemini 3 Pro - 4K capable' }
  ];

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.handleFile(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    if (event.dataTransfer?.files[0]) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  private handleFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('Invalid file type. Please upload an image.');
      return;
    }
    this.referenceImageFile.set(file);
    const reader = new FileReader();
    reader.onload = (e: any) => this.referenceImageUrl.set(e.target.result);
    reader.readAsDataURL(file);
  }
  
  updateTopic(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.topic.set(input.value);
  }

  selectPersona(persona: string): void {
    this.selectedPersona.set(persona);
    
    // v1.2: Auto-populate music defaults from persona preset
    const preset = getPersonaPreset(persona);
    if (preset) {
      this.selectedMusicGenre.set(preset.music_defaults.genre);
      this.selectedMusicMood.set(preset.music_defaults.mood);
    }
  }

  isFormValid(): boolean {
    // v1.3: Image and Persona are now optional. Only Topic and API Key are required.
    return this.topic().trim().length > 0 && this.hasApiKey();
  }

  hasApiKey(): boolean {
    return this.apiKeyService.hasApiKey();
  }

  saveApiKey(): void {
    const key = this.apiKeyInput.trim();
    if (key) {
      this.apiKeyService.setApiKey(key);
      this.geminiService.updateApiKey(key);
      this.showApiKeyInput.set(false);
      this.apiKeyInput = '';
    }
  }

  toggleApiKeyInput(): void {
    this.showApiKeyInput.set(!this.showApiKeyInput());
  }

  async generate(): Promise<void> {
    if (!this.isFormValid()) return;
    
    this.generationState.set('identity');
    this.script.set([]);
    this.storyboardImages.set([]);
    this.errorMessage.set('');

    try {
      this.currentStep.set(1);
      
      // v1.3: Optional Identity Analysis
      let characterDescription = '';
      if (this.referenceImageFile()) {
        this.loadingMessage.set('Step 1/4: Analyzing your identity...');
        characterDescription = await this.geminiService.describeIdentity(this.referenceImageFile()!);
      } else {
        this.loadingMessage.set('Step 1/4: Skipping identity analysis (Movie Mode)...');
        // Small delay to show the step
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      this.generationState.set('script');
      this.currentStep.set(2);
      this.loadingMessage.set('Step 2/4: Writing your viral script...');
      
      // v1.3: Handle optional persona
      const persona = this.selectedPersona() === 'Cinematic Mode' ? undefined : this.selectedPersona();
      const scriptResult = await this.geminiService.generateScript(this.topic(), persona);
      
      this.script.set(scriptResult.scenes);

      this.generationState.set('storyboard');
      this.currentStep.set(3);
      const generatedImages: string[] = [];
      const propTitles = this.propsMetadata().map(p => p.title).filter(Boolean) as string[];
      
      for (const [index, scene] of this.script().entries()) {
        this.loadingMessage.set(`Step 3/4: Generating storyboard ${index + 1} of 3...`);
        const image = await this.geminiService.generateStoryboardImage(
          scene.visual_prompt,
          characterDescription,
          this.selectedImageModel(),
          this.topic(),
          persona || '', // Pass empty string if undefined
          index,
          propTitles.length > 0 ? propTitles : undefined,
          scriptResult.global_visual_style // v1.3: Pass global style
        );
        generatedImages.push(image);
        this.storyboardImages.set([...generatedImages]);
      }

      this.generationState.set('music');
      this.currentStep.set(4);
      this.loadingMessage.set('Step 4/4: Creating your music prompt...');
      const musicResult = await this.geminiService.generateMusicPrompt({
        persona: persona || 'Cinematic',
        mood: this.selectedMusicMood(),
        topic: this.topic(),
        emotionalDirection: scriptResult.scenes[0]?.script || ''
      });
      this.musicResult.set(musicResult);

      this.generationState.set('done');
    } catch (error) {
      console.error('Generation failed:', error);
      this.generationState.set('error');
      this.errorMessage.set('An error occurred during generation. Please check the console for details and try again.');
    }
  }

  selectMusicGenre(genre: string): void {
    this.selectedMusicGenre.set(genre);
  }

  selectMusicMood(mood: string): void {
    this.selectedMusicMood.set(mood);
  }

  selectImageModel(quality: ImageModelQuality): void {
    this.selectedImageModel.set(quality);
  }

  updatePropMetadata(index: number, title: string): void {
    const metadata = this.propsMetadata();
    metadata[index] = { title };
    this.propsMetadata.set([...metadata]);
  }

  // v1.2: Music intensity methods
  updateMusicIntensity(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value);
    this.musicIntensity.set(value);
  }

  getBpmRangeForIntensity(intensity: number): [number, number] {
    return this.INTENSITY_BPM_MAP[intensity] || [80, 95];
  }

  // v1.2: Progress step names
  getStepName(step: number): string {
    const steps = ['Identity Analysis', 'Script Writing', 'Storyboard Generation', 'Music Creation'];
    return steps[step - 1] || '';
  }

  onPropsUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files).slice(0, 3); // Max 3 props
      this.propsFiles.set(files);
      
      // Generate preview URLs
      const urls: string[] = [];
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          urls.push(e.target.result);
          if (urls.length === files.length) {
            this.propsUrls.set(urls);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  }

  async downloadBundle(): Promise<void> {
    if (!this.script().length || !this.storyboardImages().length) {
      return;
    }

    const selectedModel = getImageModel(this.selectedImageModel());

    await this.bundleService.createAndDownloadBundle({
      script: {
        hook: this.script()[0]?.script || '',
        flow: this.script()[1]?.script || '',
        punchline: this.script()[2]?.script || '',
        onScreenText: [],
        personaNotes: '',
        emotionalDirection: ''
      },
      storyboardImages: this.storyboardImages(),
      musicPrompt: this.musicResult() || {
        prompt: '',
        genre: this.selectedMusicGenre(),
        mood: this.selectedMusicMood(),
        duration: '24s'
      },
      props: this.propsUrls(),
      metadata: {
        timestamp: Date.now(),
        persona: this.selectedPersona(),
        topic: this.topic(),
        musicGenre: this.selectedMusicGenre(),
        musicMood: this.selectedMusicMood(),
        image_model_used: selectedModel.name,
        script_model_used: 'gemini-2.5-flash',
        music_prompt_version: 'v1.1',
        props_count: this.propsFiles().length
      }
    });
  }
  
  resetState(): void {
    this.generationState.set('idle');
    this.script.set([]);
    this.scriptResult.set(null);
    this.storyboardImages.set([]);
    this.musicResult.set(null);
    this.propsFiles.set([]);
    this.propsUrls.set([]);
    this.propsMetadata.set([]);
    this.currentStep.set(0);
    this.errorMessage.set('');
    this.loadingMessage.set('');
    this.referenceImageFile.set(null);
    this.referenceImageUrl.set(null);
    this.topic.set('');

    // Reset file inputs
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    const propsInput = document.getElementById('props-upload') as HTMLInputElement;
    if (propsInput) {
      propsInput.value = '';
    }
  }

  // v1.2: Individual download methods
  async downloadScriptOnly(): Promise<void> {
    if (!this.script().length) return;
    
    const scriptData = {
      hook: this.script()[0]?.script || '',
      flow: this.script()[1]?.script || '',
      punchline: this.script()[2]?.script || ''
    };
    
    const blob = new Blob([JSON.stringify(scriptData, null, 2)], { type: 'application/json' });
    this.downloadBlob(blob, 'script.json');
  }

  async downloadStoryboardsOnly(): Promise<void> {
    if (!this.storyboardImages().length) return;
    
    const zip = new JSZip();
    this.storyboardImages().forEach((img, i) => {
      const base64 = img.split(',')[1];
      zip.file(`scene${i + 1}.png`, base64, { base64: true });
    });
    
    const blob = await zip.generateAsync({ type: 'blob' });
    this.downloadBlob(blob, 'storyboards.zip');
  }

  async downloadMusicPromptOnly(): Promise<void> {
    if (!this.musicResult()) return;
    
    const blob = new Blob([JSON.stringify(this.musicResult(), null, 2)], { type: 'application/json' });
    this.downloadBlob(blob, 'music-prompt.json');
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}