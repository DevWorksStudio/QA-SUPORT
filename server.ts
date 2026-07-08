import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json({ limit: "50mb" }));

// Inicialização segura
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

function parseBase64ToGeminiPart(base64DataUri: string) {
  const matches = base64DataUri.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return { inlineData: { data: base64DataUri, mimeType: "image/png" } };
  }
  return { inlineData: { data: matches[2], mimeType: matches[1] } };
}

// Rota de API
app.post("/api/audit", async (req, res) => {
  try {
    const { whatsappChat, jiraTicket, whatsappFiles = [], jiraFiles = [] } = req.body;

    if (!whatsappChat && whatsappFiles.length === 0) {
      return res.status(400).json({ error: "Forneça o conteúdo do WhatsApp." });
    }
    if (!jiraTicket && jiraFiles.length === 0) {
      return res.status(400).json({ error: "Forneça o conteúdo do JIRA." });
    }

    let promptTexto = `Atue como um Especialista Sênior de QA e Auditoria de Suporte. Audite o atendimento cruzando a conversa com o ticket.\n\n`;
    const contents: any[] = [];

    if (whatsappChat) promptTexto += `--- [CONVERSA DO WHATSAPP - TEXTO] ---\n${whatsappChat}\n\n`;
    if (whatsappFiles.length > 0) promptTexto += `--- [CONVERSA DO WHATSAPP - ARQUIVOS] ---\nArquivos incluídos (${whatsappFiles.length}).\n\n`;
    
    if (jiraTicket) promptTexto += `--- [TICKET DO JIRA - TEXTO] ---\n${jiraTicket}\n\n`;
    if (jiraFiles.length > 0) promptTexto += `--- [TICKET DO JIRA - ARQUIVOS] ---\nArquivos incluídos (${jiraFiles.length}).\n\n`;

    promptTexto += `Retorne estritamente um JSON com:
{
  "dataCrossReference": { "isCompliant": true, "divergencesFound": "..." },
  "technicalQuality": { "isResolved": true, "unansweredQuestions": "...", "observation": "..." },
  "softSkills": { "score": 0, "postureAnalysis": "..." },
  "overallFeedback": "..."
}`;

    contents.push(promptTexto);
    for (const file of whatsappFiles) contents.push(parseBase64ToGeminiPart(file));
    for (const file of jiraFiles) contents.push(parseBase64ToGeminiPart(file));

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", // Atualizado para um modelo estável
      contents: contents,
      config: { responseMimeType: "application/json", temperature: 0.2 }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Audit API Error:", error);
    res.status(500).json({ error: error.message || "Erro interno" });
  }
});

// Configuração de ambiente
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    // Modo Desenvolvimento (Local)
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Modo Produção (Vercel)
    // Importante: A Vercel serve o frontend automaticamente via vercel.json, 
    // não precisamos do express.static aqui para não gerar conflito.
    app.use(express.static(path.join(process.cwd(), 'dist')));
  }
}

// Inicialização condicional para não travar a Vercel
if (process.env.NODE_ENV !== "production") {
  setupServer().then(() => {
    app.listen(3000, "0.0.0.0", () => console.log("Local server: http://localhost:3000"));
  });
} else {
  setupServer();
}

export default app;
