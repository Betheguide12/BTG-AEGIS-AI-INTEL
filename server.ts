import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // AI CORE Initialization (Server Side - Secure)
  const apiKey = process.env.GEMINI_API_KEY || process.env.Ge || process.env.GE || "";
  const ai = new GoogleGenAI({ apiKey });

  app.use(express.json());

  // API ROUTES
  app.get("/api/health", (req, res) => {
    res.json({ status: "online", secure: !!apiKey });
  });

  app.get("/api/intel", async (req, res) => {
    if (!apiKey) {
      return res.status(503).json({ error: "AEGIS_OFFLINE", message: "API Key missing in environment." });
    }

    const fetchWithRetry = async (retryCount = 0): Promise<any> => {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: "IDENTITY: AEGIS INTEL INGESTION. TASK: List exactly 5 high-impact breaking global security, cyber-threat, or geopolitical events from the last 12 hours. SOURCES: Prioritize OSINT (Social Media/Breaking News), CYBINT (Cyber Attacks), and SIGINT (Signals/Satellite). FORMAT: Clean JSON array. FIELDS: 'source' (SIGINT/OSINT/CYBINT/GEOINT/HUMINT), 'message' (tactical summary), 'severity' (LOW/MEDIUM/HIGH/CRITICAL), 'timestamp', 'location' (object with 'lat' and 'lng').",
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

        return JSON.parse(response.text);
      } catch (error: any) {
        if (retryCount < 2 && !error.message?.includes('429')) {
          await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
          return fetchWithRetry(retryCount + 1);
        }
        throw error;
      }
    };

    try {
      const data = await fetchWithRetry();
      res.json(data);
    } catch (error: any) {
      console.error("Server Intel Error:", error);
      const status = error.message?.includes('429') ? 429 : 500;
      res.status(status).json({ error: "INGESTION_FAILED", details: error.message });
    }
  });

  app.post("/api/oracle", async (req, res) => {
    if (!apiKey) return res.status(503).json({ error: "OFFLINE" });
    const { context } = req.body;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `AEGIS ORACLE BRIEFING REQUEST. Context: ${context}. Provide paths: ALPHA (Efficient), OMEGA (Victory), GHOST (Undetectable).`,
      });
      res.json({ text: response.text });
    } catch (error) {
       res.status(500).json({ error: "SIGNAL_INTERRUPTED" });
    }
  });

  // VITE MIDDLEWARE / STATIC ASSETS
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AEGIS CORE online at http://localhost:${PORT}`);
  });
}

startServer();
