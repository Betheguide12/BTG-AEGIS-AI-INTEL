/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";

declare global {
  const __AEGIS_KEY__: string;
}

const keyVar = typeof __AEGIS_KEY__ !== 'undefined' ? __AEGIS_KEY__ : (process.env.GEMINI_API_KEY || "");
const ai = new GoogleGenAI({ apiKey: keyVar });

export async function getRealTimeIntel() {
  if (!keyVar) {
    console.warn("AEGIS CORE: API Key missing. Ensure GEMINI_API_KEY, Ge, or GE is set in deployment config.");
    return null;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "List the top 5 breaking global security, cyber-threat, and geopolitical news items from the last 2 hours. Return as a clean JSON array of objects with 'source' (SIGINT/OSINT/CYBINT), 'message', 'severity' (LOW/HIGH/CRITICAL), 'timestamp', and 'location' (an object with 'lat' and 'lng' approximate coordinates for the event).",
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              source: { type: Type.STRING },
              message: { type: Type.STRING },
              severity: { type: Type.STRING },
              timestamp: { type: Type.STRING },
              location: {
                type: Type.OBJECT,
                properties: {
                  lat: { type: Type.NUMBER },
                  lng: { type: Type.NUMBER }
                },
                required: ["lat", "lng"]
              }
            },
            required: ["source", "message", "severity", "timestamp", "location"]
          }
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Intel ingestion failed:", error);
    return null;
  }
}

export async function getOracleBriefing(context: string) {
  if (!keyVar) return "AEGIS OFFLINE";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `AEGIS ORACLE BRIEFING REQUEST. Context: ${context}. Provide paths: ALPHA (Efficient), OMEGA (Victory), GHOST (Undetectable).`,
    });

    return response.text;
  } catch (error) {
    return "SIGNAL INTERRUPTED.";
  }
}
