import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { TABLE_NAME } from "../constants";
import { PowerBiLabelData } from "../types";
import { 
  AlertCircle, 
  Loader2, 
  Package, 
  Calendar, 
  Layers, 
  FileText, 
  Beaker,
  Hash
} from "lucide-react";

const ProductDetails: React.FC = () => {
  const { opNumber } = useParams<{ opNumber: string }>();
  const [product, setProduct] = useState<PowerBiLabelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!opNumber) {
        setError("Número de OP não fornecido na URL.");
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const opInt = parseInt(opNumber, 10);
        if (isNaN(opInt)) {
             throw new Error("O código da OP é inválido.");
        }

        const { data, error } = await supabase
          .from(TABLE_NAME)
          .select('*')
          .eq('ord_in_codigo', opInt)
          .single();

        if (error) {
             if (error.code === 'PGRST116') throw new Error(`Produto com OP ${opNumber} não encontrado.`);
             throw error;
        }
        setProduct(data as PowerBiLabelData);
      } catch (err: any) {
        console.error("Error fetching product:", err);
        setError(err.message || "Erro ao carregar detalhes do produto.");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [opNumber]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 gap-4">
        <div className="relative">
            <div className="absolute inset-0 bg-rose-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <Loader2 className="animate-spin text-[#9f1239] relative z-10" size={40} />
        </div>
        <p className="font-medium text-sm tracking-wide text-slate-600 animate-pulse">Carregando informações...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center font-sans">
        <div className="bg-white p-6 rounded-2xl mb-6 text-red-500 shadow-lg shadow-red-100 border border-red-50">
           <AlertCircle size={48} strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Produto não encontrado</h1>
        <p className="text-slate-500 mb-6 max-w-xs mx-auto text-sm leading-relaxed">{error}</p>
      </div>
    );
  }

  // Componente de Cartão Moderno
  const InfoCard = ({ 
    label, 
    value, 
    icon: Icon, 
    fullWidth = false,
    highlight = false
  }: { 
    label: string, 
    value: string | number, 
    icon: any, 
    fullWidth?: boolean,
    highlight?: boolean
  }) => (
    <div className={`
      relative overflow-hidden group
      bg-white p-5 rounded-2xl 
      border border-slate-100 
      shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)]
      transition-all duration-300 hover:shadow-xl hover:-translate-y-1
      ${fullWidth ? 'col-span-2' : 'col-span-2 sm:col-span-1'}
    `}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-sans flex items-center gap-1.5">
          <Icon size={12} className="text-[#9f1239]" />
          {label}
        </h3>
        {highlight && (
           <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
        )}
      </div>
      <p className={`
        font-semibold text-slate-900 leading-tight break-words
        ${highlight ? 'text-xl' : 'text-lg'}
        ${String(value).length > 30 ? 'text-base' : ''}
      `}>
        {value}
      </p>
      
      {/* Elemento decorativo de fundo */}
      <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-slate-900 pointer-events-none transform group-hover:scale-110 transition-transform duration-500">
        <Icon size={80} strokeWidth={1} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-16">
      
      {/* Header Glassmorphism */}
      <div className="sticky top-0 z-20 backdrop-blur-md bg-white/80 border-b border-white/20 shadow-sm px-6 py-4 flex justify-center transition-all">
         <img 
            src="/logo-airslaid.png" 
            alt="Air Slaid" 
            className="h-8 w-auto object-contain transition-opacity duration-300"
            onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.querySelector('.fallback-logo')?.classList.remove('hidden');
            }}
         />
         {/* Fallback caso a imagem não carregue */}
         <div className="fallback-logo hidden text-center leading-none select-none">
            <span className="block text-xl font-black text-[#9f1239] tracking-tighter">air slaid</span>
         </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-6 flex flex-col gap-6">
        
        {/* HERO SECTION: Ordem de Produção */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-8 shadow-2xl shadow-slate-200">
            {/* Background Gradient & Effects */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-[#9f1239] blur-3xl opacity-20"></div>
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-blue-600 blur-3xl opacity-10"></div>
            
            <div className="relative z-10 text-center">
                <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10 mb-3">
                    <Hash size={12} className="text-rose-300" />
                    <span className="text-[10px] font-bold tracking-widest uppercase text-rose-100">Ordem de Produção</span>
                </div>
                <h1 className="text-5xl font-black tracking-tight mb-1 font-sans">
                    {product.ord_in_codigo}
                </h1>
                <p className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                   Registro Verificado
                </p>
            </div>
        </div>

        {/* GRID LAYOUT */}
        <div className="grid grid-cols-2 gap-4">
            
            {/* Código do Produto */}
            <InfoCard 
                label="Código" 
                value={product.pro_st_alternativo} 
                icon={Package}
                highlight
            />

            {/* Lote */}
            <InfoCard 
                label="Lote" 
                value={product.orl_st_lotefabricacao || "N/A"} 
                icon={Layers} 
            />

            {/* Descrição - Full Width */}
            <InfoCard 
                label="Descrição do Material" 
                value={product.pro_st_descricao} 
                icon={FileText} 
                fullWidth 
            />

            {/* Data */}
            <InfoCard 
                label="Fabricação" 
                value={product.ord_dt_abertura_real 
                    ? new Date(product.ord_dt_abertura_real).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: 'long', year: 'numeric'
                    })
                    : 'N/A'} 
                icon={Calendar} 
            />

            {/* Composição */}
            <InfoCard 
                label="Composição" 
                value={product.esv_st_valor || "—"} 
                icon={Beaker} 
            />

        </div>
        
        {/* Footer Minimalista */}
        <div className="mt-8 text-center opacity-60">
            <div className="flex justify-center items-center gap-2 mb-2">
                <div className="h-px w-8 bg-slate-300"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Air Slaid Technical Fabrics</span>
                <div className="h-px w-8 bg-slate-300"></div>
            </div>
            <p className="text-[9px] text-slate-400">
                Informações geradas automaticamente via sistema de produção.
            </p>
        </div>

      </div>
    </div>
  );
};

export default ProductDetails;