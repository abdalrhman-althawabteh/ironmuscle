import { GoogleGenAI } from "@google/genai";
import { Exercise } from "../types";

// Initialize Gemini
// Note: In a real production app, ensure this is handled via a secure backend proxy or carefully managed env vars.
const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

export const getExerciseAdvice = async (exercise: Exercise, history: Exercise[]): Promise<string> => {
  if (!apiKey) {
    return "AI insights require an API Key.";
  }

  try {
    const historyText = history.length > 0 
      ? `Previous performance: ${history.map(h => `${h.sets.length} sets, max weight ${Math.max(...h.sets.map(s => s.weight))}kg`).join('; ')}.` 
      : "No previous history.";

    const currentPerformance = `Current sets: ${exercise.sets.map(s => `${s.weight}kg x ${s.reps}`).join(', ')}.`;

    const prompt = `
      You are an expert strength and conditioning coach. 
      The user is currently performing: ${exercise.name}.
      ${historyText}
      ${currentPerformance}
      
      Give one short, actionable tip (max 20 words) to improve their form or intensity for the next set. Be motivating.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Keep pushing!";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Focus on your form and breathing.";
  }
};

export const getWorkoutSummaryAnalysis = async (workoutName: string, duration: number, exercises: Exercise[]): Promise<string> => {
  if (!apiKey) return "Great workout!";

  try {
     const prompt = `
      Analyze this workout session:
      Type: ${workoutName}
      Duration: ${Math.floor(duration / 60)} minutes
      Exercises: ${exercises.map(e => `${e.name} (${e.sets.length} sets)`).join(', ')}.
      
      Provide a 2-sentence summary of the effort and a suggestion for recovery.
     `;

     const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    return response.text || "Good job completing your session.";
  } catch (error) {
    return "Great effort today!";
  }
}