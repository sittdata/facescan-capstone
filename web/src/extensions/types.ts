export interface StylingAdvice {
  hairstyles: string[];
  glasses: string[];
  aesthetic_focus: string[];
}

export interface FaceShapeResult {
  shape: string;
  name_th: string;
  confidence: number;
  probabilities: Record<string, number>;
  description: string;
  hairstyles: string[];
  glasses: string[];
  aesthetic_focus: string[];
  styling?: {
    female: StylingAdvice;
    male: StylingAdvice;
  };
  metrics: Record<string, number>;
}

export interface SimulationParams {
  rhinoplasty: number;
  lip_augmentation: number;
  chin_augmentation: number;
}
