import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json({ limit: "50mb" }));

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
    const { whatsappChat, jiraTicket, whatsappFiles = [], jiraFiles = [] } = req.body;

    if (!whatsappChat && whatsappFiles.length === 0) {
      return res.status(400).json({ error: "Forneça o texto ou os arquivos/prints do WhatsApp." });
    }
    if (!jiraTicket && jiraFiles.length === 0) {
      return res.status(400).json({ error: "Forneça o texto ou os arquivos/prints do JIRA." });
    }

    let promptTexto = `Atue como um Especialista Sênior de QA e Auditoria de Suporte. Audite o atendimento cruzando a conversa com o ticket.\n\n`;
    const contents: any[] = [];

    if (whatsappChat) promptTexto += `--- [CONVERSA DO WHATSAPP - TEXTO] ---\n${whatsappChat}\n\n`;
    if (whatsappFiles.length > 0) promptTexto += `--- [CONVERSA DO WHATSAPP - ARQUIVOS (PDF/IMAGEM)] ---\nOs arquivos da conversa (${whatsappFiles.length} anexos) estão incluídos na requisição.\n\n`;
    if (jiraTicket) promptTexto += `--- [TICKET DO JIRA - TEXTO] ---\n${jiraTicket}\n\n`;
    if (jiraFiles.length > 0) promptTexto += `--- [TICKET DO JIRA - ARQUIVOS (PDF/IMAGEM)] ---\nOs arquivos do ticket (${jiraFiles.length} anexos) estão incluídos na requisição.\n\n`;

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
      model: "gemini-2.5-flash",
      contents: contents,
      config: { responseMimeType: "application/json", temperature: 0.2 }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
