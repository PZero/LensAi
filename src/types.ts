export type PhotoStatus = 'scattata' | 'descrivendo' | 'descritto' | 'sviluppando' | 'completato';

export interface UserProfile {
  userId: string;
  email: string;
  name: string;
  geminiApiKey?: string;
  createdAt: any;
  updatedAt: any;
}

export interface PhotoItem {
  photoId: string;
  userId: string;
  originalPhotoUrl: string; // Base64 or Drive thumbnail url
  originalDriveId?: string;  // Google Drive file ID
  developedPhotoUrl?: string; // New AI developed base64 or URL
  developedDriveId?: string; // Google Drive developed file ID
  description?: string;      // Detailed description formulated by multimodal Gemini
  status: PhotoStatus;       // State of AI photo development
  styleName?: string;        // Name of applied style
  stylePrompt?: string;      // Prompt modifier associated with the style
  createdAt: any;            // Firebase ServerTimestamp or Date string
  updatedAt: any;
}

export interface CustomStyle {
  styleId: string;
  userId: string;
  name: string;
  prompt: string;
  createdAt: any;
  isDefault?: boolean;
}

export interface PhotographerStyle {
  id: string;
  name: string;
  description: string;
  prompt: string;
}

export interface Presence {
  userId: string;
  lastActive: any;
}

export const PRESET_PHOTOGRAPHERS: PhotographerStyle[] = [
  {
    id: 'tim-flach',
    name: 'Tim Flach',
    description: 'Ritratti di animali ad alto contrasto, luci da studio spettacolari, sfondo nero minimalista, dettagli incredibili. Mantiene tutti i dettagli descritti nello scatto originale but sostituisce ogni volto di persona umana con musi di animali aventi i tratti più idonei e compatibili alle espressioni originarie.',
    prompt: 'Tim Flach photography portrait style. Highly detailed intimate close-up, dramatic professional studio lighting, low key, pitch-black deep background, hyper-realistic. CRITICAL: While keeping all other described scene details completely intact, replace every human face/person with an animal face or animal snout that is structurally, physically, and emotionally aligned and highly compatible with the original human features and expressions.'
  },
  {
    id: 'steve-mccurry',
    name: 'Steve McCurry',
    description: 'Colori super saturi, caldi toni naturali, sguardi penetranti, sapore di fotogiornalismo, contrasto ricco e profonda umanità.',
    prompt: 'Steve McCurry style. National Geographic documentary photography. Rich warm natural light, highly saturated and realistic colors, shallow depth of field, sharp eyes, soulful portraiture.'
  },
  {
    id: 'ansel-adams',
    name: 'Ansel Adams',
    description: 'Paesaggi magniloquenti e dettagliati, contrasti di bianco e nero profondi, scale di grigi amplissime, maestoso e solenne.',
    prompt: 'Ansel Adams style. Majestic black and white landscape photography. High-contrast fine art monochrome, deep shadow detail, bright whites, extreme crisp clarity.'
  },
  {
    id: 'annie-leibovitz',
    name: 'Annie Leibovitz',
    description: 'Ritratti cinematografici, luci morbide e avvolgenti come dipinti classici, tonalità fredde e sofisticate.',
    prompt: 'Annie Leibovitz photography style. Cinematic editorial portrait. Soft painterly lighting, dynamic composite, rich colors with cool elegant undertone, shallow focus.'
  },
  {
    id: 'daido-moriyama',
    name: 'Daido Moriyama',
    description: 'Street-photography giapponese grezza in bianco e nero arditissimo, forte grana analogica, sfocature di movimento e fascino retrò.',
    prompt: 'Daido Moriyama style. Gritty high-contrast street monochrome photography. Heavy silver halide film grain, high drama, intentionally blurry motion, raw atmospheric Japanese Provoke style.'
  }
];
