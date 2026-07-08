import { GoogleGenerativeAI } from "@google/generative-ai";

// Inicializa o cliente com a chave da Vercel
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");

const handleAudit = async () => {
  if ((!whatsappChat.trim() && whatsappFiles.length === 0) || (!jiraTicket.trim() && jiraFiles.length === 0)) {
    setError('Por favor, forneça o conteúdo de ambos.');
    return;
  }

  setIsAuditing(true);
  setError('');
  setResult(null);

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Atue como um Especialista Sênior de QA. Audite o atendimento cruzando a conversa com o ticket.
    WHATSAPP: ${whatsappChat}
    JIRA: ${jiraTicket}
    Retorne estritamente o JSON seguindo esta estrutura:
    {
      "dataCrossReference": { "isCompliant": true, "divergencesFound": "..." },
      "technicalQuality": { "isResolved": true, "unansweredQuestions": "...", "observation": "..." },
      "softSkills": { "score": 0, "postureAnalysis": "..." },
      "overallFeedback": "..."
    }`;

    // Chamada direta para o Google
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Limpeza de blocos de código markdown que a IA às vezes retorna
    const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '');
    setResult(JSON.parse(jsonString));

  } catch (err: any) {
    console.error(err);
    setError('Erro ao conectar com Gemini: ' + err.message);
  } finally {
    setIsAuditing(false);
  }
};
