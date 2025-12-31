
import { GoogleGenAI } from "@google/genai";

const ai = process.env.API_KEY ? new GoogleGenAI({ apiKey: process.env.API_KEY }) : null;

const STATIC_TIPS = [
  "ECC P-256 provides a high security margin with shorter keys than RSA, making it ideal for mobile and web environments.",
  "Never reuse the same private key for multiple different types of high-value documents if you suspect key compromise.",
  "AES-GCM is an authenticated encryption mode that provides both confidentiality and data integrity.",
  "Your private key is the only way to recover your data. If lost, the file is gone forever.",
  "Browser-local encryption ensures that even if our website is down, you can use a saved copy to decrypt your files."
];

export const getSecurityAdvise = async (topic: string) => {
  if (!ai) {
    return STATIC_TIPS[Math.floor(Math.random() * STATIC_TIPS.length)];
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide a concise, expert security tip about: ${topic}. Focus on Elliptic Curve Cryptography (ECC) and file safety. Keep it under 60 words. Mention that this tool works offline.`,
      config: {
        temperature: 0.7,
      }
    });
    return response.text || STATIC_TIPS[0];
  } catch (err) {
    console.debug("Gemini connection skipped or failed, using local tip.");
    return STATIC_TIPS[Math.floor(Math.random() * STATIC_TIPS.length)];
  }
};
