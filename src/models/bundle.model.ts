// Script result from Gemini
export interface ScriptResult {
  hook: string;
  flow: string;
  punchline: string;
  onScreenText: string[];
  personaNotes: string;
  emotionalDirection: string;
}

// Music generation parameters
export interface MusicParams {
  persona: string;
  mood: string;
  topic: string;
  emotionalDirection: string;
}

// Music generation result
export interface MusicResult {
  prompt: string;
  genre: string;
  mood: string;
  duration: string;
}

// Bundle metadata
export interface BundleMetadata {
  persona: string;
  topic: string;
  musicGenre: string;
  musicMood: string;
  generatedAt: string;
  version: string;
}

// Complete bundle
export interface Bundle {
  script: ScriptResult;
  storyboardImages: string[];
  musicPrompt: MusicResult;
  props: string[];
  metadata: BundleMetadata;
}
