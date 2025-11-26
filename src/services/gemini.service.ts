import { Injectable, inject } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';
import { ApiKeyService } from './api-key.service';
import { ScriptResult, MusicParams, MusicResult } from '../models/bundle.model';

// Legacy Scene interface for backward compatibility
export interface Scene {
  beat: string;
  script: string;
  visual_prompt: string;
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

  async generateScript(topic: string, persona: string): Promise<{ scenes: Scene[] }> {
    const ai = this.ensureAiClient();
    const prompt = `You are a viral video scriptwriter. Your persona is a ${persona}. The topic is "${topic}". Generate a 24-second vertical video script for TikTok/Reels, split into three 8-second beats: The Hook, The Flow/Insight, and The Punchline. For each beat, provide a short, evocative visual prompt for an AI image generator. Return ONLY a JSON object.`;
    
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
            }
          }
        }
      }
    });

    return JSON.parse(response.text.trim());
  }

  async generateStoryboardImage(visualPrompt: string, characterDescription: string): Promise<string> {
    const ai = this.ensureAiClient();
    const fullPrompt = `${visualPrompt}, featuring a person who is ${characterDescription}. Hyper-realistic photo, cinematic lighting, dramatic. Vertical 9:16 aspect ratio.`;
    
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
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

  async generateMusicPrompt(params: MusicParams): Promise<MusicResult> {
    const ai = this.ensureAiClient();
    
    const prompt = `Generate a detailed music prompt for a 24-second soundtrack.

REQUIREMENTS:
- Persona: ${params.persona}
- Mood: ${params.mood}
- Topic: ${params.topic}
- Emotional Direction: ${params.emotionalDirection}

Create a detailed music prompt that:
1. Matches the persona's vibe and style
2. Reflects the emotional direction
3. Is 24 seconds long
4. Is instrumental only (no vocals)
5. Is TikTok/Reels-ready

Return ONLY a JSON object with this structure:
{
  "prompt": "detailed music generation prompt",
  "genre": "specific genre",
  "mood": "specific mood",
  "duration": "24s"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            prompt: { type: Type.STRING },
            genre: { type: Type.STRING },
            mood: { type: Type.STRING },
            duration: { type: Type.STRING },
          },
          required: ['prompt', 'genre', 'mood', 'duration']
        }
      }
    });

    return JSON.parse(response.text.trim());
  }
}
