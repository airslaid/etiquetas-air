import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Printer, AlertCircle, Loader2, Database, CheckCircle2, Settings, Layers, ArrowRight } from "lucide-react";
import { getProductionDataByOP } from "../services/powerBiService";
import LabelPreview from "../components/LabelPreview";
import { PowerBiLabelData } from "../types";

const Generator: React.FC = () => {
  const [opNumber, setOpNumber] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State to hold multiple results (e.g. same OP, different lots)
  const [searchResults, setSearchResults] = useState<PowerBiLabelData[]>([]);
  // State for the currently selected label
  const [selectedLabel, setSelectedLabel] = useState<PowerBiLabelData | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opNumber) return;

    setLoading(true);
    setError(null);
    setSearchResults([]);
    setSelectedLabel(null);

    try {
      const results = await getProductionDataByOP(Number(opNumber));
      
      if (results && results.length > 0) {
        setSearchResults(results);
        // If only one result, select it automatically
        if (results.length === 1) {
          setSelectedLabel(results[0]);
        }
      } else {
        setError("OP não encontrada no banco de dados. Você já importou os dados?");
      }
    } catch (err) {
      setError("Erro ao conectar com o banco de dados.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getDetailsUrl = (data: PowerBiLabelData) => {
    const configuredUrl = localStorage.getItem("ARGOX_PUBLIC_URL");
    const baseUrl = configuredUrl || window.location.origin;
    return `${baseUrl}/#/view/${data.ord_in_codigo}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header - Hidden on Print */}
      <header className="bg-emerald-900 text-white p-4 shadow-md no-print">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg">
              <Search size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold">Gerador de Etiquetas Argox</h1>
              <div className="flex items-center gap-1 text-emerald-200 text-xs">
                 <Database size={12} />
                 <span>Conectado ao Supabase</span>
              </div>
            </div>
          </div>
          
          <Link to="/admin" className="bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition border border-emerald-600">
            <Settings size={16} />
            Admin / Importar
          </Link>
        </div>
      </header>

      <main className="flex-grow p-4 md:p-8 max-w-4xl mx-auto w-full">
        {/* Search Form - Hidden on Print */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8 no-print">
          <form onSubmit={handleSearch} className="flex gap-4 items-end">
            <div className="flex-grow">
              <label htmlFor="op" className="block text-sm font-medium text-slate-700 mb-1">
                Número da Ordem de Produção (OP)
              </label>
              <input
                id="op"
                type="number"
                placeholder="Ex: 244"
                value={opNumber}
                onChange={(e) => setOpNumber(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Search size={20} />}
              Buscar
            </button>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 border border-red-100">
              <AlertCircle size={20} />
              {error}
            </div>
          )}
        </section>

        {/* Selection Area (If multiple lots found) - Hidden on Print */}
        {searchResults.length > 1 && (
           <section className="mb-8 no-print animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                 <h3 className="text-amber-800 font-bold flex items-center gap-2 mb-3">
                    <Layers size={20} />
                    Múltiplos registros encontrados ({searchResults.length})
                 </h3>
                 <p className="text-sm text-amber-700 mb-4">
                    Esta OP possui variações de lote ou filial. Selecione qual deseja imprimir:
                 </p>
                 <div className="grid gap-3">
                    {searchResults.map((item, idx) => (
                       <button
                          key={idx}
                          onClick={() => setSelectedLabel(item)}
                          className={`
                            flex items-center justify-between p-4 rounded-lg border text-left transition
                            ${selectedLabel === item 
                                ? 'bg-amber-100 border-amber-500 ring-1 ring-amber-500' 
                                : 'bg-white border-amber-200 hover:bg-white/80 hover:border-amber-400'
                            }
                          `}
                       >
                          <div>
                             <span className="text-xs font-bold uppercase text-slate-500">Lote</span>
                             <div className="font-mono font-bold text-slate-900">{item.orl_st_lotefabricacao || "Sem lote"}</div>
                          </div>
                          <div className="text-right">
                             <span className="text-xs font-bold uppercase text-slate-500">Filial</span>
                             <div className="font-mono text-slate-900">{item.fil_in_codigo}</div>
                          </div>
                          <div className="text-right hidden sm:block">
                             <span className="text-xs font-bold uppercase text-slate-500">Data</span>
                             <div className="font-mono text-slate-900 text-sm">
                                {new Date(item.ord_dt_abertura_real).toLocaleDateString('pt-BR')}
                             </div>
                          </div>
                          {selectedLabel === item && <ArrowRight className="text-amber-600" />}
                       </button>
                    ))}
                 </div>
              </div>
           </section>
        )}

        {/* Label Preview Area */}
        {selectedLabel && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-4 no-print">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Printer size={18} />
                Pré-visualização
                <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full">
                   Lote: {selectedLabel.orl_st_lotefabricacao}
                </span>
              </h2>
              <button
                onClick={handlePrint}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition"
              >
                <Printer size={20} />
                Imprimir Etiqueta
              </button>
            </div>
            
            <div className="mb-4 text-xs text-slate-500 text-center no-print">
                Link do QR Code: <code className="bg-slate-200 px-1 py-0.5 rounded">{getDetailsUrl(selectedLabel)}</code>
            </div>

            <div className="bg-slate-200 p-8 rounded-xl flex justify-center border border-slate-300 print:p-0 print:bg-white print:border-none">
              <LabelPreview 
                data={selectedLabel} 
                detailsUrl={getDetailsUrl(selectedLabel)} 
              />
            </div>

            <div className="mt-6 p-4 bg-emerald-50 rounded-lg border border-emerald-100 text-sm text-emerald-800 no-print flex items-center gap-2">
              <CheckCircle2 size={16} />
              <div className="flex-grow">
                <p><strong>Dados carregados com sucesso.</strong></p>
                <p className="text-xs mt-1">
                  Se o QR Code estiver apontando para localhost, vá em <Link to="/admin" className="underline font-bold">Admin</Link> e configure o domínio público.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Generator;