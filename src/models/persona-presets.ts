export interface PersonaPreset {
  name: string;
  script_keywords: string[];
  color_palette: string[];
  camera_style: string;
  music_defaults: {
    genre: string;
    mood: string;
  };
}

export const PERSONA_PRESETS: Record<string, PersonaPreset> = {
  'Tech Consultant': {
    name: 'Tech Consultant',
    script_keywords: ['systems thinking', 'South Africa', 'AI clarity', 'innovation', 'digital transformation'],
    color_palette: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'],
    camera_style: 'clean interview, ideal lighting, professional backdrop',
    music_defaults: {
      genre: 'Cinematic',
      mood: 'Confident'
    }
  },
  'Cape Town Rapper': {
    name: 'Cape Town Rapper',
    script_keywords: ['hustle', 'Cape Town', 'street smart', 'authentic', 'grind'],
    color_palette: ['#dc2626', '#ef4444', '#f97316', '#fbbf24'],
    camera_style: 'urban street, natural lighting, dynamic angles',
    music_defaults: {
      genre: 'Trap',
      mood: 'Confident'
    }
  },
  'Motivational Speaker': {
    name: 'Motivational Speaker',
    script_keywords: ['inspiration', 'growth mindset', 'potential', 'success', 'transformation'],
    color_palette: ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd'],
    camera_style: 'warm lighting, engaging eye contact, inspirational setting',
    music_defaults: {
      genre: 'Cinematic',
      mood: 'Motivational'
    }
  },
  'Storyteller': {
    name: 'Storyteller',
    script_keywords: ['narrative', 'journey', 'experience', 'emotion', 'connection'],
    color_palette: ['#059669', '#10b981', '#34d399', '#6ee7b7'],
    camera_style: 'intimate framing, soft lighting, natural environment',
    music_defaults: {
      genre: 'Ambient',
      mood: 'Calm'
    }
  },
  'Teacher/Educator': {
    name: 'Teacher/Educator',
    script_keywords: ['learning', 'knowledge', 'understanding', 'education', 'clarity'],
    color_palette: ['#0891b2', '#06b6d4', '#22d3ee', '#67e8f9'],
    camera_style: 'clear presentation, good lighting, educational setting',
    music_defaults: {
      genre: 'Lo-fi',
      mood: 'Calm'
    }
  }
};

export function getPersonaPreset(personaName: string): PersonaPreset | undefined {
  return PERSONA_PRESETS[personaName];
}
