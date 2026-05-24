import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set large JSON body limit for base64 image uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Endpoints
  
  // 1. Photo Description API
  app.post("/api/gemini/describe", async (req, res) => {
    try {
      const apiKey = req.headers['x-gemini-api-key'] as string;
      const { originalPhotoUrl, userPromptModifier, customSystemPrompt } = req.body;
      
      if (!apiKey) {
        return res.status(400).json({ error: "Fornisci la tua API Key di Gemini nelle Impostazioni per proseguire." });
      }
      if (!originalPhotoUrl) {
        return res.status(400).json({ error: "Fotografia originale mancante." });
      }

      // Initialize dynamic GoogleGenAI instance using user's private key
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      // Prepare image parts for Multimodal model
      const match = originalPhotoUrl.match(/^data:([^;]+);base64,(.+)$/);
      let mimeType = "image/jpeg";
      let base64Data = originalPhotoUrl;
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }

      const imagePart = {
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      };

      const defaultSystemPrompt = `Descrivi minuziosamente questa fotografia in ogni singolo dettaglio per consentire a un generatore di immagini AI di ricrearla in modo eccezionale. 
Analizza attentamente e descrivi esaurientemente nel testo:
1. Il soggetto principale (se ci sono persone o animali descrivi espressioni del viso, emozioni, sorrisi, fisionomia, pose, umori ed interazioni).
2. L'abbigliamento e vestiti (colori, tessuti, stile, accessori, texture).
3. L'ambiente spaziale e lo sfondo (interno/esterno, oggetti sullo sfondo, dinamica, elementi naturali, architetture).
4. Le luci e l'illuminazione (direzione della luce, ombre, intensità, luci dorate, soffuse o flash, ora del giorno).
5. I colori dominanti (saturazione, contrasto energetico o tonalità tenui, palette cromatica).
6. Le prospettive e la composizione d'inquadratura (distanza, angolazione, profondità di campo sfocata, grana cinematografica).

Scrivi la descrizione interamente in lingua italiana, in modo fluido, narrativo, ricco e suggestivo, senza fare elenchi puntati o riepiloghi freddi. Crea una vera e propria opera poematica di descrizione visuale.`;

      const activePrompt = customSystemPrompt && typeof customSystemPrompt === "string" && customSystemPrompt.trim().length > 0
        ? customSystemPrompt.trim()
        : defaultSystemPrompt;

      const instruction = userPromptModifier 
        ? `${activePrompt}\n\nNota speciale o stile richiesto dall'utente nello scatto: ${userPromptModifier}`
        : activePrompt;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          imagePart,
          { text: instruction }
        ]
      });

      const descriptionText = response.text;
      if (!descriptionText) {
        throw new Error("Gemini non ha generato alcuna descrizione.");
      }

      res.json({ description: descriptionText.trim() });
    } catch (err: any) {
      console.error("Describe photo error:", err);
      res.status(500).json({ error: err.message || "Errore nella generazione della descrizione." });
    }
  });

  // 2. Photo Development AI Generation API
  app.post("/api/gemini/develop", async (req, res) => {
    try {
      const apiKey = req.headers['x-gemini-api-key'] as string;
      const { description, stylePrompt } = req.body;

      if (!apiKey) {
        return res.status(400).json({ error: "Fornisci la tua API Key di Gemini nelle Impostazioni per proseguire." });
      }
      if (!description) {
        return res.status(400).json({ error: "Descrizione testuale mancante." });
      }

      // Initialize dynamic GoogleGenAI instance
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      // Construct powerful prompt fusing detail description & artistic style
      const masterPrompt = `Professional high quality award-winning fine-art masterwork photo. Recounting: ${description} \n\nDirecting artistic camera aesthetic to match exactly: ${stylePrompt || 'Masterful photography style, hyper detailed, professional composition.'}`;

      let developedBase64 = "";
      const errorMsgs: string[] = [];

      // Cascade Model 1: Try gemini-2.5-flash-image (generateContent) - Standard, robust image generation
      try {
        console.log("Tentativo primario con model: 'gemini-2.5-flash-image'...");
        const imageResult = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: [{ text: masterPrompt }],
          config: {
            imageConfig: {
              aspectRatio: "1:1"
            }
          }
        });

        const parts = imageResult.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData) {
            developedBase64 = part.inlineData.data;
            break;
          }
        }
        if (developedBase64) {
          console.log("Successo con model: gemini-2.5-flash-image!");
        } else {
          errorMsgs.push("gemini-2.5-flash-image non ha restituito byte immagine.");
        }
      } catch (err: any) {
        console.warn("gemini-2.5-flash-image fallito:", err?.message || err);
        errorMsgs.push(`gemini-2.5-flash-image fallito: ${err?.message || err}`);
      }

      // Cascade Model 2: Try dedicated Imagen 3 Standard (generateImages)
      if (!developedBase64) {
        try {
          console.log("Tentativo alternativo con model: 'imagen-3.0-generate-002' via generateImages...");
          const response30 = await ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: masterPrompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '1:1',
            },
          });
          const imgBytes = response30.generatedImages?.[0]?.image?.imageBytes;
          if (imgBytes) {
            developedBase64 = imgBytes;
            console.log("Successo con model: imagen-3.0-generate-002!");
          } else {
            errorMsgs.push("imagen-3.0-generate-002 non ha restituito byte immagine.");
          }
        } catch (err: any) {
          console.warn("imagen-3.0-generate-002 fallito:", err?.message || err);
          errorMsgs.push(`imagen-3.0-generate-002 fallito: ${err?.message || err}`);
        }
      }

      // Cascade Model 3: Try dedicated Imagen 3 Fast (generateImages)
      if (!developedBase64) {
        try {
          console.log("Tentativo alternativo con model: 'imagen-3.0-fast-generate-001'...");
          const responseFast = await ai.models.generateImages({
            model: 'imagen-3.0-fast-generate-001',
            prompt: masterPrompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '1:1',
            },
          });
          const imgBytesFast = responseFast.generatedImages?.[0]?.image?.imageBytes;
          if (imgBytesFast) {
            developedBase64 = imgBytesFast;
            console.log("Successo con model: imagen-3.0-fast-generate-001!");
          } else {
            errorMsgs.push("imagen-3.0-fast-generate-001 non ha restituito byte immagine.");
          }
        } catch (err: any) {
          console.warn("imagen-3.0-fast-generate-001 fallito:", err?.message || err);
          errorMsgs.push(`imagen-3.0-fast-generate-001 fallito: ${err?.message || err}`);
        }
      }

      // Cascade Model 4: Try gemini-3.1-flash-image-preview (generateContent)
      if (!developedBase64) {
        try {
          console.log("Tentativo finale di riserva con model: 'gemini-3.1-flash-image-preview'...");
          const imageResult = await ai.models.generateContent({
            model: 'gemini-3.1-flash-image-preview',
            contents: [{ text: masterPrompt }],
            config: {
              imageConfig: {
                aspectRatio: "1:1",
                imageSize: "1K"
              }
            }
          });

          const parts = imageResult.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            if (part.inlineData) {
              developedBase64 = part.inlineData.data;
              break;
            } else if (part.text) {
              console.warn("gemini-3.1-flash-image-preview ha restituito testo anziché byte immagine:", part.text);
              errorMsgs.push(`gemini-3.1-flash-image-preview ha restituito testo d'errore/notifica: "${part.text}"`);
            }
          }
          if (developedBase64) {
            console.log("Successo con model: gemini-3.1-flash-image-preview!");
          }
        } catch (err: any) {
          console.warn("gemini-3.1-flash-image-preview fallito:", err?.message || err);
          errorMsgs.push(`gemini-3.1-flash-image-preview fallito: ${err?.message || err}`);
        }
      }

      if (!developedBase64) {
        throw new Error(`Nessun modello di sviluppo immagine è riuscito a processare la tua richiesta.\n\nDettagli diagnostica di errore:\n${errorMsgs.map((m, i) => `${i + 1}. ${m}`).join("\n")}`);
      }

      res.json({ imageBytes: developedBase64 });
    } catch (err: any) {
      console.error("Develop photo error:", err);
      res.status(500).json({ error: err.message || "Errore nello sviluppo dell'immagine d'arte." });
    }
  });

  // Serve static assets and index.html in production, mount Vite in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server and Vite booting on http://localhost:${PORT}`);
  });
}

startServer();
