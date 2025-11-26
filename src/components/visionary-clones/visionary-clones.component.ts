import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService, Scene } from '../../services/gemini.service';
import { ApiKeyService } from '../../services/api-key.service';

type GenerationState = 'idle' | 'identity' | 'script' | 'storyboard' | 'done' | 'error';

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
  storyboardImages = signal<string[]>([]);

  readonly personas = ['Tech Consultant', 'Cape Town Rapper', 'Motivational Speaker', 'Stoic Philosopher', 'Startup Hustler'];

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
  }

  isFormValid(): boolean {
    return !!this.referenceImageFile() && this.topic().trim().length > 0 && this.hasApiKey();
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
      this.loadingMessage.set('Phase 1/3: Analyzing your identity...');
      const characterDescription = await this.geminiService.describeIdentity(this.referenceImageFile()!);

      this.generationState.set('script');
      this.loadingMessage.set('Phase 2/3: Writing your viral script...');
      const scriptResult = await this.geminiService.generateScript(this.topic(), this.selectedPersona());
      this.script.set(scriptResult.scenes);

      this.generationState.set('storyboard');
      const generatedImages: string[] = [];
      for (const [index, scene] of this.script().entries()) {
        this.loadingMessage.set(`Phase 3/3: Generating storyboard ${index + 1} of 3...`);
        const image = await this.geminiService.generateStoryboardImage(scene.visual_prompt, characterDescription);
        generatedImages.push(image);
        this.storyboardImages.set([...generatedImages]);
      }

      this.generationState.set('done');
    } catch (error) {
      console.error('Generation failed:', error);
      this.generationState.set('error');
      this.errorMessage.set('An error occurred during generation. Please check the console for details and try again.');
    }
  }
  
  resetState(): void {
    this.generationState.set('idle');
    this.script.set([]);
    this.storyboardImages.set([]);
    this.errorMessage.set('');
    this.loadingMessage.set('');
    this.referenceImageFile.set(null);
    this.referenceImageUrl.set(null);
    this.topic.set('');

    // Reset file input so the same file can be re-uploaded
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }
}