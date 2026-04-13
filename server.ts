import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  let openaiClient: OpenAI | null = null;

  app.post("/api/chat", async (req, res) => {
    const { provider, model, prompt, systemInstruction, baseUrl, apiKey } = req.body;
    
    try {
      if (provider === 'google') {
        const response = await gemini.models.generateContent({
          model: model || 'gemini-2.5-pro',
          contents: prompt,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.7,
          }
        });
        res.json({ text: response.text });
      } else if (provider === 'openai' || provider === 'custom') {
        const keyToUse = apiKey || process.env.OPENAI_API_KEY;
        if (!keyToUse && !baseUrl) {
          return res.status(400).json({ error: '未配置 API Key 或 Base URL。请在设置中添加。' });
        }
        
        const client = new OpenAI({ 
          apiKey: keyToUse || 'dummy-key', 
          baseURL: baseUrl || undefined 
        });
        
        const response = await client.chat.completions.create({
          model: model || 'gpt-4o',
          messages: [
            { role: 'system', content: systemInstruction || 'You are a helpful assistant.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7
        });
        res.json({ text: response.choices[0].message.content });
      } else {
        res.status(400).json({ error: '不支持的 AI 提供商' });
      }
    } catch (error: any) {
      console.error("AI Error:", error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  });

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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
