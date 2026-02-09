export interface Set {
  id: string;
  weight: number;
  reps: number;
  completed: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  sets: Set[];
}

export interface Workout {
  id: string;
  name: string; // e.g., "Chest Day"
  date: string; // ISO string
  exercises: Exercise[];
  status: 'active' | 'completed';
  durationSeconds: number;
}

export interface User {
  id: string;
  name: string;
  email?: string;
}

export type ViewState = 'DASHBOARD' | 'ACTIVE_WORKOUT' | 'HISTORY' | 'PROFILE';

export interface AIAdvice {
  exerciseName: string;
  tip: string;
}
