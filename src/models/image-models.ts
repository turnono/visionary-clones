// CRITICAL: DO NOT CHANGE THE AI MODELS DEFINED IN THIS FILE.
// The user has manually configured these for specific internal models (Nano Banana).
export enum ImageModelQuality {
  BEST_QUALITY = 'best',
  FAST = 'fast',
  ARTISTIC = 'artistic'
}

export interface ImageModel {
  id: string;
  name: string;
  quality: ImageModelQuality;
  description: string;
  maxResolution: string;
  isGeminiNative: boolean;
}

export const IMAGE_MODELS: Record<ImageModelQuality, ImageModel> = {
  [ImageModelQuality.BEST_QUALITY]: {
    id: 'imagen-4.0-generate-001',
    name: 'Imagen 4',
    quality: ImageModelQuality.BEST_QUALITY,
    description: 'Best photorealism and detail',
    maxResolution: '1024x1024',
    isGeminiNative: false
  },
  [ImageModelQuality.FAST]: {
    id: 'gemini-2.5-flash-image',
    name: 'Nano Banana',
    quality: ImageModelQuality.FAST,
    description: 'Fast generation, 1024px',
    maxResolution: '1024x1024',
    isGeminiNative: true
  },
  [ImageModelQuality.ARTISTIC]: {
    id: 'gemini-3-pro-image-preview',
    name: 'Nano Banana Pro',
    quality: ImageModelQuality.ARTISTIC,
    description: 'Professional quality, 4K capable',
    maxResolution: '4096x4096', 
    isGeminiNative: true
  }
};

export function getImageModel(quality: ImageModelQuality): ImageModel {
  return IMAGE_MODELS[quality];
}
