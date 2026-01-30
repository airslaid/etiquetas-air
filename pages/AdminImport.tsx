import React, { useState, useEffect } from "react";
import { syncPowerBiToSupabase } from "../services/powerBiService";
import { RefreshCw, Database, CheckCircle2, AlertTriangle, ArrowLeft, Loader2, ShieldCheck, XCircle, Globe, Save, Copy, Terminal } from "lucide-react";
import { Link } from "react-router-dom";

const AdminImport: React.FC = () => {
  const [syncing, setSyncing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [successCount, setSuccessCount] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [dbSchemaError, setDbSchemaError] = useState(false);
  
  // Configuration State
  const [publicUrl, setPublicUrl] = useState("");
  const [configSaved, setConfigSaved] = useState(false);

  useEffect(() => {
    // Load saved URL or default to current origin
    const saved = localStorage.getItem("ARGOX_PUBLIC_URL");
    if (saved) {
      setPublicUrl(saved);
    } else {
      setPublicUrl(window.location.origin);
    }
  }, []);

  const handleSaveConfig = () => {
    // Remove trailing slash if present
    const cleanUrl = publicUrl.replace(/\/$/, "");
    localStorage.setItem("ARGOX_PUBLIC_URL", cleanUrl);
    setPublicUrl(cleanUrl);
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 3000);
  };

  const handleSync = async () => {
    setSyncing(true);
    setHasError(false);
    setDbSchemaError(false);
    setLogs(["Iniciando processo de sincronização..."]);
    setSuccessCount(0);

    try {
      const count = await syncPowerBiToSupabase((msg) => {
        setLogs(prev => [...prev, msg]);
      });
      
      setSuccessCount(count);
      setLogs(prev => [...prev, "Sincronização finalizada com sucesso."]);
    } catch (error: any) {
      setHasError(true);
      setLogs(prev => [...prev, "FALHA FATAL NA SINCRONIZAÇÃO."]);
      
      // Detect Duplicate Key Error (Supabase/Postgres Code 23505)
      if (error?.code === '23505' || error?.message?.includes('duplicate key') || error?.message?.includes('23505')) {
          setDbSchemaError(true);
      }
    } finally {
      setSyncing(false);
    }
  };

  const sqlFixCommand = `ALTER TABLE "REL_ETIQUETAS" DROP CONSTRAINT IF EXISTS "REL_ETIQUETAS_pkey";
ALTER TABLE "REL_ETIQUETAS" DROP CONSTRAINT IF EXISTS "REL_ETIQUETAS_ord_in_codigo_key";
ALTER TABLE "REL_ETIQUETAS" ADD PRIMARY KEY (ord_in_codigo, fil_in_codigo, orl_st_lotefabricacao);`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-6 font-sans">
      <div className="max-w-3xl mx-auto w-full">
        <div className="mb-6">
          <Link to="/" className="text-slate-500 hover:text-slate-800 flex items-center gap-2 mb-4">
            <ArrowLeft size={20} />
            Voltar para Gerador
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Administração</h1>
        </div>

        {/* Configuration Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Globe size={24} />
                </div>
                <div className="flex-grow">
                    <h3 className="font-bold text-slate-800 text-lg">Configuração do QR Code</h3>
                    <p className="text-slate-600 text-sm mb-4">
                        Defina o endereço público onde o site está hospedado (Vercel). 
                        Isso garante que o QR Code funcione para o seu cliente, mesmo que você imprima de um computador local.
                    </p>
                    
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={publicUrl}
                            onChange={(e) => setPublicUrl(e.target.value)}
                            placeholder="Ex: https://minha-empresa.vercel.app"
                            className="flex-grow px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <button 
                            onClick={handleSaveConfig}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
                        >
                            {configSaved ? <CheckCircle2 size={16} /> : <Save size={16} />}
                            Salvar
                        </button>
                    </div>
                    {configSaved && <p className="text-xs text-green-600 mt-2 font-semibold">Configuração salva com sucesso!</p>}
                </div>
            </div>
        </div>
        
        {/* DB FIX WIZARD - Shown when 23505 Error happens */}
        {dbSchemaError && (
            <div className="bg-rose-50 border-l-4 border-rose-500 p-6 rounded-r-xl shadow-md mb-8 animate-in fade-in slide-in-from-top-4">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="text-rose-600 shrink-0" size={24} />
                    <div className="w-full">
                        <h3 className="font-bold text-rose-800 text-lg">Erro de Estrutura no Banco de Dados Detectado</h3>
                        <p className="text-rose-700 text-sm mt-1 mb-3">
                            O Supabase está bloqueando a importação porque a coluna <code>ord_in_codigo</code> foi definida como Única. 
                            Para permitir múltiplas etiquetas (lotes/filiais diferentes) para a mesma OP, você precisa ajustar a Chave Primária.
                        </p>
                        
                        <div className="bg-slate-900 rounded-lg p-4 relative group">
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => navigator.clipboard.writeText(sqlFixCommand)}
                                    className="bg-white/10 hover:bg-white/20 text-white p-1.5 rounded text-xs flex items-center gap-1"
                                >
                                    <Copy size={12} /> Copiar
                                </button>
                            </div>
                            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono mb-2 border-b border-white/10 pb-2">
                                <Terminal size={14} /> SQL Editor
                            </div>
                            <pre className="text-rose-100 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                                {sqlFixCommand}
                            </pre>
                        </div>
                        
                        <div className="mt-4 flex gap-2">
                            <a 
                                href="https://supabase.com/dashboard/project/_/sql/new" 
                                target="_blank"
                                rel="noreferrer"
                                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-bold inline-flex items-center gap-2 transition"
                            >
                                <Terminal size={16} />
                                Abrir Supabase SQL Editor
                            </a>
                        </div>
                        <p className="text-rose-600 text-xs mt-2 italic">
                            Cole o código acima no SQL Editor do Supabase e clique em RUN. Depois tente importar novamente.
                        </p>
                    </div>
                </div>
            </div>
        )}

        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
          <div className="flex flex-col items-center justify-center py-8">
             <div className="bg-yellow-50 p-6 rounded-2xl w-full max-w-lg border border-yellow-100 mb-8">
                <div className="text-center mb-6">
                  <Database size={48} className="text-yellow-600 mx-auto mb-3" />
                  <h3 className="font-bold text-yellow-800 text-lg mb-2">Sincronizar Power BI</h3>
                  <p className="text-sm text-yellow-700">
                    Isso trará as últimas ordens de produção para o sistema.<br/>
                    As páginas HTML são geradas automaticamente na hora do acesso.
                  </p>
                </div>
                
                <button 
                  onClick={handleSync}
                  disabled={syncing}
                  className={`w-full py-4 px-6 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-3 shadow-lg transition-all
                    ${syncing 
                      ? "bg-slate-400 cursor-not-allowed" 
                      : "bg-blue-600 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98]"
                    }`}
                >
                  {syncing ? (
                    <>
                      <Loader2 className="animate-spin" size={24} />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={24} />
                      Atualizar Agora
                    </>
                  )}
                </button>
             </div>
          </div>

          <div className="mt-2">
            <h3 className={`font-semibold mb-3 flex items-center gap-2 ${hasError ? "text-red-600" : "text-slate-800"}`}>
              {hasError ? <XCircle size={18} /> : <ShieldCheck size={18} />}
              Log de Sincronização
            </h3>
            <div className={`bg-slate-900 text-slate-300 p-4 rounded-lg font-mono text-xs h-48 overflow-y-auto shadow-inner whitespace-pre-wrap ${hasError ? "border-2 border-red-500" : ""}`}>
              {logs.length === 0 && <p className="opacity-50 italic">Aguardando início da sincronização...</p>}
              {logs.map((log, i) => (
                <div key={i} className="mb-1 border-b border-slate-800 pb-1 last:border-0 break-words">{log}</div>
              ))}
            </div>
          </div>

          {successCount > 0 && !syncing && (
            <div className="mt-6 p-4 bg-emerald-50 text-emerald-800 rounded-lg flex items-center gap-3 border border-emerald-100 animate-in fade-in slide-in-from-bottom-2">
              <CheckCircle2 size={24} />
              <div>
                <p className="font-bold">{successCount} registros atualizados!</p>
                <p className="text-sm">As etiquetas já estão prontas para impressão.</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100 text-blue-800 text-xs flex gap-3">
            <AlertTriangle className="shrink-0" size={16} />
            <div>
                <p className="font-bold mb-1">Nota sobre Variáveis de Ambiente</p>
                <p>Certifique-se de que <code>SUPABASE_URL</code> e <code>SUPABASE_SERVICE_ROLE_KEY</code> estão configurados no painel da Vercel (Project Settings).</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminImport;