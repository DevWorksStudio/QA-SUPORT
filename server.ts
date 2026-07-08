import express from "express";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
app.use(express.json({ limit: "50mb" }));

// Inicialização oficial do SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

function parseBase64ToGeminiPart(base64DataUri: string) {
  const matches = base64DataUri.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return { inlineData: { data: base64DataUri, mimeType: "image/png" } };
  }
  return { inlineData: { data: matches[2], mimeType: matches[1] } };
}

// Rota de API isolada
app.post("/api/audit", async (req, res) => {
  try {
    const { whatsappChat, jiraTicket, whatsappFiles = [], jiraFiles = [] } = req.body;

    if (!whatsappChat && whatsappFiles.length === 0) {
      return res.status(400).json({ error: "Forneça o conteúdo do WhatsApp." });
    }
    if (!jiraTicket && jiraFiles.length === 0) {
      return res.status(400).json({ error: "Forneça o conteúdo do JIRA." });
    }

    let promptTexto = `Atue como um Especialista Sênior de QA. Audite o atendimento cruzando a conversa com o ticket.\n\n`;
    const contents: any[] = [];

    if (whatsappChat) promptTexto += `--- [CONVERSA DO WHATSAPP] ---\n${whatsappChat}\n\n`;
    if (jiraTicket) promptTexto += `--- [TICKET DO JIRA] ---\n${jiraTicket}\n\n`;

    promptTexto += `Retorne estritamente um JSON (sem explicações):
{
  "dataCrossReference": { "isCompliant": true, "divergencesFound": "..." },
  "technicalQuality": { "isResolved": true, "unansweredQuestions": "...", "observation": "..." },
  "softSkills": { "score": 0, "postureAnalysis": "..." },
  "overallFeedback": "..."
}`;

    contents.push(promptTexto);
    for (const file of whatsappFiles) contents.push(parseBase64ToGeminiPart(file));
    for (const file of jiraFiles) contents.push(parseBase64ToGeminiPart(file));

    const response = await model.generateContent({
      contents: contents,
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
    });

    const resultText = response.response.text();
    // Limpeza de possíveis blocos markdown
    const jsonString = resultText.replace(/```json/g, '').replace(/```/g, '');
    res.json(JSON.parse(jsonString || "{}"));
    
  } catch (error: any) {
    console.error("Audit API Error:", error);
    res.status(500).json({ error: error.message || "Erro interno no servidor" });
  }
});

// Servir o front-end apenas se a rota NÃO começar com /api
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));

app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Exportação para Vercel
export default app;
