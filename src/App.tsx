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
  const [jiraTicketId, setJiraTicketId] = useState('');
  
  const [whatsappFiles, setWhatsappFiles] = useState<string[]>([]);
  
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
    if ((!whatsappChat.trim() && whatsappFiles.length === 0) || !jiraTicketId.trim()) {
      setError('Por favor, forneça o texto ou print/PDF do WhatsApp e o Número do Ticket do JIRA.');
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
          jiraTicketId,
          whatsappFiles
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao realizar auditoria');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Erro inesperado de conexão. Tente novamente.');
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 text-white px-6 h-16 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-blue-400" />
            <h1 className="text-[18px] font-semibold tracking-tight text-white">QA Auditor</h1>
          </div>
          <p className="text-slate-400 text-sm hidden md:block">Auditoria de Suporte. Cruzamento de WhatsApp vs. JIRA.</p>
        </div>
        <div>
           <span className="bg-blue-500 px-3 py-1 rounded-full text-[12px] font-bold uppercase text-white">Auditoria</span>
        </div>
      </header>

      <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start h-full">
          
          {/* Input Section */}
          <div className="space-y-4 bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm p-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center space-x-2 text-[11px] font-bold text-slate-500 uppercase">
                  <MessageSquare className="w-3 h-3 text-emerald-500" />
                  <span>Transcrição do WhatsApp</span>
                </label>
                <label className="cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-semibold py-1 px-3 rounded flex items-center gap-1.5 transition-colors">
                  <Upload className="w-3 h-3" />
                  <span>Anexar Arquivos ({whatsappFiles.length})</span>
                  <input 
                    type="file" 
                    accept="image/*,application/pdf"
                    multiple
                    className="hidden" 
                    onChange={(e) => {
                      handleMultipleFileUpload(e.target.files, setWhatsappFiles);
                      e.target.value = '';
                    }} 
                  />
                </label>
              </div>
              
              {whatsappFiles.length > 0 && (
                <div className="mb-3 flex gap-2 overflow-x-auto pb-2">
                  {whatsappFiles.map((file, idx) => (
                    <div key={idx} className="relative w-20 h-20 shrink-0 rounded border border-slate-200 overflow-hidden group bg-slate-100 flex items-center justify-center">
                      {isPdf(file) ? (
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <FileText className="w-8 h-8" />
                          <span className="text-[10px] mt-1 font-bold">PDF</span>
                        </div>
                      ) : (
                        <img src={file} alt={`WhatsApp Preview ${idx + 1}`} className="w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <button onClick={() => setWhatsappFiles(prev => prev.filter((_, i) => i !== idx))} className="bg-white text-slate-800 p-1.5 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors">
                           <X className="w-4 h-4" />
                         </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <textarea
                value={whatsappChat}
                onChange={(e) => setWhatsappChat(e.target.value)}
                placeholder="Cole aqui o log da conversa com o cliente..."
                className="w-full h-48 p-3 rounded border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none text-[13px] font-sans text-slate-800"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center space-x-2 text-[11px] font-bold text-slate-500 uppercase">
                  <FileText className="w-3 h-3 text-blue-500" />
                  <span>ID do Ticket do JIRA</span>
                </label>
              </div>

              <input
                type="text"
                value={jiraTicketId}
                onChange={(e) => setJiraTicketId(e.target.value)}
                placeholder="Ex: MXPED-91680"
                className="w-full p-3 rounded border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-[13px] font-sans text-slate-800"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button
              onClick={handleAudit}
              disabled={isAuditing}
              className="w-full flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isAuditing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Analisando Dados...</span>
                </>
              ) : (
                <>
                  <span>Gerar Auditoria QA</span>
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          {/* Results Section */}
          <div className="space-y-4">
            {!result && !isAuditing ? (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 bg-white rounded-lg border border-slate-200 shadow-sm text-slate-400">
                <ClipboardCheck className="w-12 h-12 mb-4 opacity-20" />
                <h3 className="text-sm font-semibold text-slate-600 mb-1">Aguardando Dados</h3>
                <p className="text-[13px]">Preencha as informações ao lado e clique em Gerar Auditoria.</p>
              </div>
            ) : isAuditing ? (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center space-y-4 p-12 bg-white rounded-lg border border-slate-200 shadow-sm">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                <div className="text-center">
                  <p className="font-semibold text-[14px] text-slate-800">Avaliando conformidade...</p>
                  <p className="text-[13px] text-slate-500">Aguarde um momento.</p>
                </div>
              </div>
            ) : result ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* 1. Conformidade */}
                <div className={`bg-white p-5 rounded-xl shadow border border-slate-200 border-l-4 ${result.dataCrossReference.isCompliant ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[16px] font-bold text-slate-800">1. Cruzamento de Dados</h2>
                    <span className={`flex items-center gap-1.5 text-[12px] font-bold ${result.dataCrossReference.isCompliant ? 'text-emerald-500' : 'text-red-500'}`}>
                      {result.dataCrossReference.isCompliant ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      <span>{result.dataCrossReference.isCompliant ? 'CONFORME' : 'DIVERGÊNCIA ENCONTRADA'}</span>
                    </span>
                  </div>
                  <div className="text-[13px] leading-relaxed text-slate-600 mt-2">
                    <strong className="text-slate-800 block mb-1">Divergências Encontradas:</strong>
                    <p>{result.dataCrossReference.divergencesFound}</p>
                  </div>
                </div>

                {/* 2. Qualidade Técnica */}
                <div className={`bg-white p-5 rounded-xl shadow border border-slate-200 border-l-4 ${result.technicalQuality.isResolved ? 'border-l-emerald-500' : 'border-l-amber-500'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[16px] font-bold text-slate-800">2. Qualidade Técnica</h2>
                    <span className={`flex items-center gap-1.5 text-[12px] font-bold ${result.technicalQuality.isResolved ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {result.technicalQuality.isResolved ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      <span>{result.technicalQuality.isResolved ? 'RESOLVIDO' : 'NÃO RESOLVIDO OU PREMATURO'}</span>
                    </span>
                  </div>
                  <div className="space-y-3 mt-2 text-[13px] leading-relaxed text-slate-600">
                    <div>
                      <strong className="text-slate-800 block mb-1">Perguntas Ignoradas (Cliente):</strong>
                      <p>{result.technicalQuality.unansweredQuestions}</p>
                    </div>
                    <div>
                      <strong className="text-slate-800 block mb-1">Observação Técnica:</strong>
                      <p>{result.technicalQuality.observation}</p>
                    </div>
                  </div>
                </div>

                {/* 3. Soft Skills */}
                <div className="bg-white p-5 rounded-xl shadow border border-slate-200 border-l-4 border-l-blue-500">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[16px] font-bold text-slate-800">3. Soft Skills e Postura</h2>
                    <div className="w-12 h-12 rounded-full border-4 border-emerald-500 flex items-center justify-center font-bold text-[18px] text-slate-800">
                      {result.softSkills.score}
                    </div>
                  </div>
                  <div className="text-[13px] leading-relaxed text-slate-600 mt-2">
                    <strong className="text-slate-800 block mb-1">Análise de Postura:</strong>
                    <p>{result.softSkills.postureAnalysis}</p>
                  </div>
                </div>

                {/* Overall Feedback */}
                <div className="bg-slate-900 p-5 rounded-xl shadow text-slate-200 font-mono text-[12px] leading-relaxed">
                   <h2 className="text-[14px] font-bold text-white mb-2 font-sans">Feedback Final</h2>
                   <p>
                     {result.overallFeedback}
                   </p>
                </div>

              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
