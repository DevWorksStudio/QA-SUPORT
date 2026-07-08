import { useState } from 'react';
import { ClipboardCheck, FileText, MessageSquare, AlertCircle, CheckCircle2, ChevronRight, RefreshCw, Upload, Image as ImageIcon, X } from 'lucide-react';

interface AuditResult {
  dataCrossReference: {
    isCompliant: boolean;
    divergencesFound: string;
  };
  technicalQuality: {
    isResolved: boolean;
    unansweredQuestions: string;
    observation: string;
  };
  softSkills: {
    score: number;
    postureAnalysis: string;
  };
  overallFeedback: string;
}

export default function App() {
  const [whatsappChat, setWhatsappChat] = useState('');
  const [jiraTicket, setJiraTicket] = useState('');
  const [whatsappFiles, setWhatsappFiles] = useState<string[]>([]);
  const [jiraFiles, setJiraFiles] = useState<string[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState('');

  const handleMultipleFileUpload = async (files: FileList | null, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (!files) return;
    const newFiles = await Promise.all(
      Array.from(files).map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      })
    );
    setter((prev) => [...prev, ...newFiles]);
  };

  const isPdf = (base64String: string) => base64String.startsWith('data:application/pdf');

  const handleAudit = async () => {
    if ((!whatsappChat.trim() && whatsappFiles.length === 0) || (!jiraTicket.trim() && jiraFiles.length === 0)) {
      setError('Por favor, forneça o texto ou print/PDF do WhatsApp e o do JIRA.');
      return;
    }

    setIsAuditing(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          whatsappChat, 
          jiraTicket,
          whatsappFiles,
          jiraFiles
        }),
      });

      const responseText = await response.text();
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error("Erro no servidor: A resposta não é um formato JSON válido.");
      }

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao realizar auditoria');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Erro inesperado de conexão.');
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col">
      <header className="bg-slate-900 text-white px-6 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-5 h-5 text-blue-400" />
          <h1 className="text-[18px] font-semibold text-white">QA Auditor</h1>
        </div>
      </header>

      <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div className="space-y-4 bg-white rounded-lg border border-slate-200 p-4">
            {/* WhatsApp Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2">
                  <MessageSquare className="w-3 h-3 text-emerald-500" /> Transcrição do WhatsApp
                </label>
                <label className="cursor-pointer bg-slate-50 border border-slate-200 py-1 px-3 rounded text-[11px] font-semibold flex items-center gap-1.5">
                  <Upload className="w-3 h-3" /> Anexar ({whatsappFiles.length})
                  <input type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(e) => handleMultipleFileUpload(e.target.files, setWhatsappFiles)} />
                </label>
              </div>
              <textarea value={whatsappChat} onChange={(e) => setWhatsappChat(e.target.value)} className="w-full h-48 p-3 rounded border bg-slate-50 focus:ring-1 focus:ring-blue-500 text-[13px] resize-none" placeholder="Cole o log do WhatsApp..." />
            </div>

            {/* JIRA Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2">
                  <FileText className="w-3 h-3 text-blue-500" /> Ticket do JIRA
                </label>
                <label className="cursor-pointer bg-slate-50 border border-slate-200 py-1 px-3 rounded text-[11px] font-semibold flex items-center gap-1.5">
                  <Upload className="w-3 h-3" /> Anexar ({jiraFiles.length})
                  <input type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(e) => handleMultipleFileUpload(e.target.files, setJiraFiles)} />
                </label>
              </div>
              <textarea value={jiraTicket} onChange={(e) => setJiraTicket(e.target.value)} className="w-full h-48 p-3 rounded border bg-slate-50 focus:ring-1 focus:ring-blue-500 text-[13px] resize-none" placeholder="Cole o ticket do JIRA..." />
            </div>

            {error && <div className="p-4 bg-red-50 text-red-700 text-sm rounded flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}

            <button onClick={handleAudit} disabled={isAuditing} className="w-full bg-slate-900 text-white py-3 rounded font-bold flex items-center justify-center gap-2">
              {isAuditing ? <RefreshCw className="animate-spin" /> : <>Gerar Auditoria <ChevronRight /></>}
            </button>
          </div>

          {/* Results Display */}
          <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
            {result ? (
              <div className="space-y-4">
                <div className={`p-4 rounded border-l-4 ${result.dataCrossReference.isCompliant ? 'border-emerald-500' : 'border-red-500'}`}>
                  <h2 className="font-bold">Cruzamento de Dados</h2>
                  <p className="text-sm">{result.dataCrossReference.divergencesFound}</p>
                </div>
                <div className="p-4 bg-white rounded border">
                  <h2 className="font-bold">Feedback Final</h2>
                  <p className="text-sm">{result.overallFeedback}</p>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-400 py-20">Aguardando análise...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
