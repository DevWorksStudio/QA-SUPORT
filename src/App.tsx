import { useState } from 'react';
import { ClipboardCheck, FileText, MessageSquare, AlertCircle, CheckCircle2, ChevronRight, RefreshCw, Upload, X } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Inicializa o SDK diretamente com a chave da Vercel
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");

interface AuditResult {
  dataCrossReference: { isCompliant: boolean; divergencesFound: string; };
  technicalQuality: { isResolved: boolean; unansweredQuestions: string; observation: string; };
  softSkills: { score: number; postureAnalysis: string; };
  overallFeedback: string;
}

export default function App() {
  const [whatsappChat, setWhatsappChat] = useState('');
  const [jiraTicket, setJiraTicket] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState('');

  const handleAudit = async () => {
    if (!whatsappChat.trim() || !jiraTicket.trim()) {
      setError('Por favor, preencha os dados do WhatsApp e do JIRA.');
      return;
    }

    setIsAuditing(true);
    setError('');
    setResult(null);

    try {
      // Usa o modelo flash que é rápido e eficiente
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `Atue como um Especialista Sênior de QA. Audite o atendimento cruzando a conversa com o ticket.
      WHATSAPP: ${whatsappChat}
      JIRA: ${jiraTicket}
      
      Retorne estritamente um JSON (sem texto antes ou depois):
      {
        "dataCrossReference": { "isCompliant": true, "divergencesFound": "..." },
        "technicalQuality": { "isResolved": true, "unansweredQuestions": "...", "observation": "..." },
        "softSkills": { "score": 0, "postureAnalysis": "..." },
        "overallFeedback": "..."
      }`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      // Limpeza básica caso a IA retorne markdown
      const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '');
      
      setResult(JSON.parse(jsonString));
    } catch (err: any) {
      console.error(err);
      setError('Erro ao conectar com Gemini: ' + err.message);
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans p-8">
      <header className="max-w-4xl mx-auto bg-slate-900 text-white p-6 rounded-t-lg flex justify-between items-center">
        <h1 className="font-bold flex items-center gap-2"><ClipboardCheck className="text-blue-400" /> QA Auditor Direct</h1>
      </header>

      <div className="max-w-4xl mx-auto bg-white p-6 rounded-b-lg shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
        <textarea className="w-full h-48 p-3 border rounded bg-slate-50" placeholder="Log WhatsApp..." value={whatsappChat} onChange={e => setWhatsappChat(e.target.value)} />
        <textarea className="w-full h-48 p-3 border rounded bg-slate-50" placeholder="Ticket JIRA..." value={jiraTicket} onChange={e => setJiraTicket(e.target.value)} />
        
        {error && <div className="col-span-2 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
        
        <button onClick={handleAudit} disabled={isAuditing} className="col-span-2 bg-slate-900 text-white py-3 rounded font-bold hover:bg-slate-800 disabled:opacity-50">
          {isAuditing ? <RefreshCw className="animate-spin mx-auto" /> : "Gerar Auditoria QA"}
        </button>
      </div>

      {result && (
        <div className="max-w-4xl mx-auto mt-6 bg-white p-6 rounded shadow-sm space-y-4">
          <h2 className="font-bold text-lg border-b pb-2">Resultado da Auditoria</h2>
          <p><strong>Divergências:</strong> {result.dataCrossReference.divergencesFound}</p>
          <p><strong>Feedback:</strong> {result.overallFeedback}</p>
        </div>
      )}
    </div>
  );
}
