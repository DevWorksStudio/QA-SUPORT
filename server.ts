import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
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
    const { whatsappChat, jiraTicketId, whatsappFiles = [] } = req.body;

    if (!whatsappChat && whatsappFiles.length === 0) {
      return res.status(400).json({ error: "Forneça o texto ou os arquivos/prints do WhatsApp." });
    }
    if (!jiraTicketId || jiraTicketId.trim() === '') {
      return res.status(400).json({ error: "Forneça o número do ticket do JIRA." });
    }

    const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
    const JIRA_USERNAME = process.env.JIRA_USERNAME;
    const JIRA_PASSWORD = process.env.JIRA_PASSWORD;

    if (!JIRA_BASE_URL || !JIRA_USERNAME || !JIRA_PASSWORD) {
        return res.status(500).json({ error: "Configurações de autenticação do JIRA ausentes no servidor." });
    }

    const token = Buffer.from(`${JIRA_USERNAME}:${JIRA_PASSWORD}`, "utf8").toString("base64");

    const jiraResponse = await fetch(`${JIRA_BASE_URL}/rest/api/2/issue/${jiraTicketId}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${token}`
      }
    });

    if (!jiraResponse.ok) {
        return res.status(jiraResponse.status).json({ error: `Erro ao buscar ticket no JIRA: ${jiraResponse.statusText}` });
    }

    const jiraData = await jiraResponse.json();
    const jiraTicketText = `Título: ${jiraData.fields?.summary || 'N/A'}\nDescrição: ${jiraData.fields?.description || 'N/A'}`;

    let promptTexto = `Atue como um Especialista Sênior de QA e Auditoria de Suporte. Audite o atendimento cruzando a conversa com o ticket.\n\n`;
    const contents: any[] = [];

    if (whatsappChat) promptTexto += `--- [CONVERSA DO WHATSAPP - TEXTO] ---\n${whatsappChat}\n\n`;
    if (whatsappFiles.length > 0) promptTexto += `--- [CONVERSA DO WHATSAPP - ARQUIVOS (PDF/IMAGEM)] ---\nOs arquivos da conversa (${whatsappFiles.length} anexos) estão incluídos na requisição.\n\n`;
    
    promptTexto += `--- [TICKET DO JIRA - TEXTO (Gerado via API)] ---\nTicket ID: ${jiraTicketId}\n${jiraTicketText}\n\n`;

    promptTexto += `Retorne estritamente um JSON com:
{
  "dataCrossReference": { "isCompliant": true, "divergencesFound": "..." },
  "technicalQuality": { "isResolved": true, "unansweredQuestions": "...", "observation": "..." },
  "softSkills": { "score": 0, "postureAnalysis": "..." },
  "overallFeedback": "..."
}`;

    contents.push(promptTexto);
    
    for (const file of whatsappFiles) contents.push(parseBase64ToGeminiPart(file));

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

// Mantendo a compatibilidade do ambiente de visualização local (AI Studio / Vite)
// O bloco abaixo só afeta execução local, mas garante que o app funciona fora da Vercel
async function startServer() {
  const PORT = 3000;
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

// Em Vercel Serverless Functions o entrypoint detecta a ausência do processo principal
// e chama diretamente o "export default app". 
// Aqui verificamos se estamos em script direto para subir a porta local.
if (import.meta.url === `file://${process.argv[1]}` || process.env.NODE_ENV !== "production") {
  startServer();
}

export default app;
