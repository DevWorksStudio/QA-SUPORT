import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json({ limit: "10mb" }));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function parseBase64ToGeminiPart(base64DataUri: string) {
  const matches = base64DataUri.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return { inlineData: { data: base64DataUri, mimeType: "image/png" } };
  }
  return { inlineData: { data: matches[2], mimeType: matches[1] } };
}

app.post("/api/audit", async (req, res) => {
  try {
    const { whatsappChat, jiraTicket, whatsappImage, jiraImage } = req.body;

    if (!whatsappChat && !whatsappImage) {
      return res.status(400).json({ error: "Forneça o texto ou o print do WhatsApp." });
    }
    if (!jiraTicket && !jiraImage) {
      return res.status(400).json({ error: "Forneça o texto ou o print do JIRA." });
    }

    let promptTexto = `Atue como um Especialista Sênior de QA e Auditoria de Suporte. Audite o atendimento cruzando a conversa com o ticket.\n\n`;
    const contents: any[] = [];

    if (whatsappChat) promptTexto += `--- [CONVERSA DO WHATSAPP - TEXTO] ---\n${whatsappChat}\n\n`;
    if (whatsappImage) promptTexto += `--- [CONVERSA DO WHATSAPP - IMAGEM] ---\nO print da conversa está anexado.\n\n`;
    if (jiraTicket) promptTexto += `--- [TICKET DO JIRA - TEXTO] ---\n${jiraTicket}\n\n`;
    if (jiraImage) promptTexto += `--- [TICKET DO JIRA - IMAGEM] ---\nO print do ticket está anexado.\n\n`;

    promptTexto += `Retorne estritamente um JSON com:
{
  "dataCrossReference": { "isCompliant": true, "divergencesFound": "..." },
  "technicalQuality": { "isResolved": true, "unansweredQuestions": "...", "observation": "..." },
  "softSkills": { "score": 0, "postureAnalysis": "..." },
  "overallFeedback": "..."
}`;

    contents.push(promptTexto);
    if (whatsappImage) contents.push(parseBase64ToGeminiPart(whatsappImage));
    if (jiraImage) contents.push(parseBase64ToGeminiPart(jiraImage));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: { responseMimeType: "application/json", temperature: 0.2 }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Audit API Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default app;
