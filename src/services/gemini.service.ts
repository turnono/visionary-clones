import { Injectable, inject } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';
import { ApiKeyService } from './api-key.service';
import { ScriptResult, MusicParams, MusicResult, MusicPromptModel, ScriptModel } from '../models/bundle.model';
import { ImageModelQuality, getImageModel } from '../models/image-models';
import { getPersonaPreset } from '../models/persona-presets';

export interface Scene {
  beat: string;
  script: string;
  visual_prompt: string;
}

export interface ScriptGenerationResult {
  scenes: Scene[];
  global_visual_style: string;
}

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private apiKeyService = inject(ApiKeyService);
  private ai: GoogleGenAI | null = null;
  
  constructor() {
    // Initialize AI client when API key is available
    const apiKey = this.apiKeyService.apiKey();
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }
  
  updateApiKey(apiKey: string): void {
    this.ai = new GoogleGenAI({ apiKey });
  }
  
  private ensureAiClient(): GoogleGenAI {
    if (!this.ai) {
      const apiKey = this.apiKeyService.apiKey();
      if (!apiKey) {
        throw new Error('API key is not set. Please configure your Google AI API key.');
      }
      this.ai = new GoogleGenAI({ apiKey });
    }
    return this.ai;
  }
  
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  }

  buildStoryboardPrompt(params: {
    topic: string;
    persona?: string;
    identityDescription?: string;
    sceneDescription: string;
    sceneNumber: number;
    global_visual_style?: string;
    props?: string[];
  }): string {
    const { topic, persona, identityDescription, sceneDescription, sceneNumber, global_visual_style, props } = params;
    
    const cameraAngles = ['medium shot', 'close-up', 'wide shot'];
    const cameraAngle = cameraAngles[sceneNumber % 3];
    
    // Get persona preset for camera style (v1.2)
    const preset = persona ? getPersonaPreset(persona) : null;
    const cameraStyle = preset?.camera_style || 'professional, cinematic, 8k, highly detailed';
    
    // Construct the prompt components
    let subjectPart = '';
    if (identityDescription) {
      subjectPart = `SUBJECT: ${identityDescription}`;
    } else if (global_visual_style) {
      // If no specific identity, the global style helps define the look
      subjectPart = `SUBJECT: Consistent character matching the style: ${global_visual_style}`;
    }

    let stylePart = '';
    if (persona) {
      stylePart = `PERSONA STYLE: ${persona}`;
    }
    
    let globalStylePart = '';
    if (global_visual_style) {
      globalStylePart = `GLOBAL VISUAL STYLE (MUST FOLLOW): ${global_visual_style}`;
    }

    let prompt = `Create a photorealistic 9:16 portrait image.

${subjectPart}
${stylePart}
${globalStylePart}
SCENE: ${sceneDescription}
TOPIC CONTEXT: ${topic}

TECHNICAL REQUIREMENTS:
- Camera angle: ${cameraAngle}
- Camera style: ${cameraStyle}
- Aspect ratio: 9:16 vertical portrait
- Lighting: Consistent, professional, cinematic
- Color palette: Warm, vibrant, Instagram-ready
- No text, logos, or watermarks
- Perfect hands and facial features`;

    // v1.2: Include props in scene description
    if (props && props.length > 0) {
      prompt += `\n\nINCLUDE THESE ELEMENTS: ${props.join(', ')}.
These should be naturally integrated into the scene, either in hand, on a surface, or visible in the frame.`;
    }

    return prompt;
  }

  async describeIdentity(image: File): Promise<string> {
    const ai = this.ensureAiClient();
    const base64Image = await this.fileToBase64(image);
    const imagePart = {
      inlineData: {
        mimeType: image.type,
        data: base64Image,
      },
    };
    const textPart = {
      text: "Forensically describe the person in this portrait in detail. Focus on key, consistent features like facial structure, hair style and color, eye color, and any distinct clothing they are wearing (e.g., 'a person with short brown hair, blue eyes, wearing a blue hoodie'). This will be used as an 'Identity Lock' for generating other images of the same person."
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
    });
    
    return response.text.trim();
  }

  async generateScript(topic: string, persona?: string): Promise<ScriptGenerationResult> {
    const ai = this.ensureAiClient();
    const personaContext = persona ? `Your persona is a ${persona}.` : "You are a Cinematic Director creating a viral movie scene.";
    
    const prompt = `You are a viral video scriptwriter. ${personaContext} The topic is "${topic}". 
    
    Generate a 24-second vertical video script for TikTok/Reels, split into three 8-second beats: The Hook, The Flow/Insight, and The Punchline.
    
    For each beat, provide:
    1. "script": The spoken dialog/voiceover (must be short enough to fit in 8 seconds).
    2. "visual_prompt": A DETAILED VEO3 VIDEO GENERATION PROMPT. 
       - It MUST describe the visual scene, lighting, and camera angle.
       - It MUST explicitly include the spoken dialog as a direct instruction.
       - EXAMPLE FORMAT: "Cinematic medium shot of a [persona description] in a [setting], speaking directly to the camera with confidence. The subject is saying: '[exact script text]'. Professional lighting, 4k, high detail."
    
    Additionally, generate a "global_visual_style" field. This should be a detailed description of the overall visual aesthetic, color grading, lighting, and main character appearance (if any) that should be CONSISTENT across all three scenes. This ensures the 3 scenes look like they belong to the same movie.

    Return ONLY a JSON object.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  beat: { type: Type.STRING },
                  script: { type: Type.STRING },
                  visual_prompt: { type: Type.STRING },
                },
                required: ['beat', 'script', 'visual_prompt']
              }
            },
            global_visual_style: { type: Type.STRING }
          },
          required: ['scenes', 'global_visual_style']
        }
      }
    });

    return JSON.parse(response.text.trim());
  }

  async generateStoryboardImage(
    visualPrompt: string,
    characterDescription: string,
    modelQuality: ImageModelQuality = ImageModelQuality.BEST_QUALITY,
    topic: string = '',
    persona: string = '',
    sceneNumber: number = 0,
    props?: string[],
    globalVisualStyle?: string
  ): Promise<string> {
    const ai = this.ensureAiClient();
    const model = getImageModel(modelQuality);
    
    // Build enhanced prompt using buildStoryboardPrompt
    const fullPrompt = this.buildStoryboardPrompt({
      topic,
      persona,
      identityDescription: characterDescription,
      sceneDescription: visualPrompt,
      sceneNumber,
      global_visual_style: globalVisualStyle,
      props
    });
    
    // Use appropriate API based on model type
    if (model.isGeminiNative) {
      // Gemini native image generation
      const response = await ai.models.generateContent({
        model: model.id,
        contents: fullPrompt,
      });
      
      // Extract image from response
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      throw new Error('No image data in Gemini response');
    } else {
      // Imagen API
      const response = await ai.models.generateImages({
        model: model.id,
        prompt: fullPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '9:16',
        },
      });

      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      return `data:image/png;base64,${base64ImageBytes}`;
    }
  }

  async generateMusicPrompt(params: MusicParams): Promise<MusicPromptModel> {
    const ai = this.ensureAiClient();
    
    const prompt = `Generate a detailed music prompt for a 24-second TikTok/Reels soundtrack.

REQUIREMENTS:
- Persona: ${params.persona}
- Mood: ${params.mood}
- Topic: ${params.topic}
- Emotional Direction: ${params.emotionalDirection}

Create a structured music prompt with:
1. Genre matching the persona's vibe
2. BPM range appropriate for the mood
3. 24-second structure: intro (4s), build (8s), drop (8s), outro (4s)
4. Keywords for music generation tools
5. Instrumental only (no vocals)

Return ONLY a JSON object matching this schema:
{
  "genre": "specific genre (trap/cinematic/afrobeat/lofi/ambient)",
  "mood": "specific mood",
  "duration": 24,
  "bpm_range": [min_bpm, max_bpm],
  "structure": {
    "intro": 4,
    "build": 8,
    "drop": 8,
    "outro": 4
  },
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "persona": "${params.persona}",
  "topic": "${params.topic}"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            genre: { type: Type.STRING },
            mood: { type: Type.STRING },
            duration: { type: Type.NUMBER },
            bpm_range: {
              type: Type.ARRAY,
              items: { type: Type.NUMBER }
            },
            intensity: { type: Type.NUMBER },  // NEW in v1.2
            structure: {
              type: Type.OBJECT,
              properties: {
                intro: { type: Type.NUMBER },
                build: { type: Type.NUMBER },
                drop: { type: Type.NUMBER },
                outro: { type: Type.NUMBER }
              }
            },
            keywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            persona: { type: Type.STRING },
            topic: { type: Type.STRING }
          },
          required: ['genre', 'mood', 'duration', 'bpm_range', 'intensity', 'structure', 'keywords', 'persona', 'topic']
        }
      }
    });

    return JSON.parse(response.text.trim());
  }
}
