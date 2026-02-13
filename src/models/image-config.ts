// CRITICAL: DO NOT CHANGE THE AI MODELS DEFINED IN THIS FILE.
// The user has manually configured these for specific internal models (Nano Banana).
export interface ImageModelConfig {
  model: string;
  label: string;
  description: string;
  maxResolution: string;
  isGeminiNative: boolean;
}

export const IMAGE_MODEL_CONFIGS: ImageModelConfig[] = [
  {
    model: 'imagen-4.0-generate-001',
    label: 'Imagen 4',
    description: 'Best photorealism and detail',
    maxResolution: '1024x1024',
    isGeminiNative: false
  },
  {
    model: 'gemini-2.5-flash-image',
    label: 'Nano Banana',
    description: 'Fast generation, 1024px',
    maxResolution: '1024x1024',
    isGeminiNative: true
  },
  {
    model: 'gemini-3-pro-image-preview',
    label: 'Nano Banana Pro',
    description: 'Professional quality, 4K capable',
    maxResolution: '4096x4096',
    isGeminiNative: true
  },
];

export function getImageModelConfig(modelId: string): ImageModelConfig | undefined {
  return IMAGE_MODEL_CONFIGS.find(config => config.model === modelId);
}
