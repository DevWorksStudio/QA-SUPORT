import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/audit", async (req, res) => {
    try {
      const { whatsappChat, jiraTicket } = req.body;

      if (!whatsappChat || !jiraTicket) {
        return res.status(400).json({ error: "Missing whatsappChat or jiraTicket data." });
      }

      const prompt = `
Atue como um Especialista Sênior de QA (Garantia da Qualidade) e Auditoria de Suporte.

Seu objetivo é auditar o atendimento ao cliente, garantindo que a execução real do suporte condiga com os processos internos da empresa. Você deve cruzar a transcrição bruta do atendimento com o registro oficial documentado no sistema JIRA.

Aqui estão os dados:
--- WhatsApp Chat / Transcrição ---
${whatsappChat}

--- JIRA Ticket / Registro ---
${jiraTicket}

Realize a auditoria baseada nos três critérios abaixo e retorne estritamente um objeto JSON com os resultados, sem formatações Markdown ao redor do JSON ou textos adicionais:

1. Cruzamento de Dados (Conformidade)
* O teor, o problema raiz e a solução aplicados na conversa do WhatsApp estão fielmente refletidos no ticket do JIRA?
* Identifique se houve omissão de informações críticas ou se o analista registrou algo diferente do que realmente aconteceu na conversa.

2. Resolução e Qualidade Técnica
* O analista seguiu um fluxo lógico de troubleshooting?
* Ele respondeu a todas as dúvidas levantadas pelo cliente ou ignorou alguma pergunta secundária?
* A solução aplicada realmente resolve o problema apontado ou o fechamento do ticket foi prematuro?

3. Soft Skills e Postura
* Analise a cordialidade, a empatia e a clareza da comunicação.
* O atendimento seguiu um padrão profissional de postura desde a saudação inicial até o encerramento da conversa?

Formato de Saída Obrigatório (JSON Estrito):
{
  "dataCrossReference": {
    "isCompliant": true,
    "divergencesFound": "Descreva de forma direta as divergências entre o WhatsApp e o JIRA, ou escreva 'Nenhuma divergência' se estiver conforme."
  },
  "technicalQuality": {
    "isResolved": true,
    "unansweredQuestions": "Liste perguntas do cliente que foram ignoradas, ou escreva 'Nenhuma'.",
    "observation": "Análise técnica sobre o fluxo de resolução adotado pelo analista."
  },
  "softSkills": {
    "score": 0, /* Score de 0 a 100 */
    "postureAnalysis": "Avaliação sobre a cordialidade, empatia e profissionalismo."
  },
  "overallFeedback": "Um parágrafo curto e direto com o feedback final para o analista de suporte."
}
      `.trim();

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2
        }
      });

      const jsonText = response.text;
      if (!jsonText) {
        throw new Error("Empty response from AI");
      }
      
      const auditResult = JSON.parse(jsonText);
      res.json(auditResult);
    } catch (error: any) {
      console.error("Audit API Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate audit report" });
    }
  });

  // Vite middleware for development
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
