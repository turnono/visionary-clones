// v1.1 Script Model with camera notes
export interface ScriptModel {
  hook: string;
  flow: string;
  punchline: string;
  camera_notes: {
    hook?: string;
    flow?: string;
    punchline?: string;
  };
  persona_voice: string;
  duration_seconds: number;
}

// Legacy ScriptResult for backward compatibility
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

// v1.1 Music Prompt Model with BPM and structure
export interface MusicPromptModel {
  genre: string;
  mood: string;
  duration: number;
  bpm_range: [number, number];
  intensity: number;  // NEW in v1.2: 1-5 scale
  structure: {
    intro: number;
    build: number;
    drop: number;
    outro: number;
  };
  keywords: string[];
  persona: string;
  topic: string;
}

// Legacy MusicResult for backward compatibility
export interface MusicResult {
  prompt: string;
  genre: string;
  mood: string;
  duration: string;
}

// Storyboard Model
export interface StoryboardModel {
  sceneNumber: number;
  beat: string;
  imageUrl: string;
  prompt: string;
  modelUsed: string;
}

// Prop Model
export interface PropModel {
  title?: string;
  imageUrl: string;
}

// v1.1 Metadata Model with model info
export interface MetadataModel {
  timestamp: number;
  persona: string;
  topic: string;
  image_model_used: string;
  script_model_used: string;
  music_prompt_version: string;
  props_count: number;
}

// Legacy BundleMetadata for backward compatibility
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
  script: ScriptModel | ScriptResult;
  storyboardImages: string[];
  musicPrompt: MusicPromptModel | MusicResult;
  props: string[];
  metadata: MetadataModel | BundleMetadata;
}
