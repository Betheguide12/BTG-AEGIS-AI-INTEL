/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";

declare global {
  const __AEGIS_KEY__: string;
}

// Aegis-Safe Key Resolution: Prevents "process is not defined" crash in standard browsers
const keyVar = typeof __AEGIS_KEY__ !== 'undefined' ? __AEGIS_KEY__ : "";
const ai = new GoogleGenAI({ apiKey: keyVar });

export const isAegisOnline = () => !!keyVar;

export async function getRealTimeIntel() {
  if (!keyVar) {
    console.warn("AEGIS CORE: API Key missing. Ensure GEMINI_API_KEY, Ge, or GE is set in deployment config.");
    return null;
  }

  const fetchWithRetry = async (retryCount = 0): Promise<any> => {
    try {
      const useTools = retryCount < 2; // Try without tools on the last retry
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "IDENTITY: AEGIS INTEL INGESTION. TASK: List exactly 5 high-impact breaking global security, cyber-threat, or geopolitical events from the last 12 hours. SOURCES: Prioritize OSINT (Social Media/Breaking News), CYBINT (Cyber Attacks), and SIGINT (Signals/Satellite). FORMAT: Clean JSON array. FIELDS: 'source' (SIGINT/OSINT/CYBINT/GEOINT/HUMINT), 'message' (tactical summary), 'severity' (LOW/MEDIUM/HIGH/CRITICAL), 'timestamp', 'location' (object with 'lat' and 'lng').",
        config: {
          tools: useTools ? [{ googleSearch: {} }] : [],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                source: { type: Type.STRING },
                message: { type: Type.STRING },
                severity: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
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

      const text = response.text;
      if (!text) throw new Error("Empty response from AEGIS CORE");
      return JSON.parse(text);
    } catch (error: any) {
      if (retryCount < 3) {
        const backoff = 1000 * (retryCount + 1);
        console.warn(`AEGIS CORE: Ingestion hiccup (Attempt ${retryCount + 1}). Retrying in ${backoff}ms...`);
        await new Promise(r => setTimeout(r, backoff));
        return fetchWithRetry(retryCount + 1);
      }
      console.error("AEGIS CORE: Critical sync failure. Intelligence stream temporarily interrupted.", error);
      return null;
    }
  };

  return fetchWithRetry();
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
