import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { TABLE_NAME } from "../constants";
import { PowerBiLabelData } from "../types";
import { AlertCircle, Loader2 } from "lucide-react";

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 gap-3">
        <Loader2 className="animate-spin text-[#9f1239]" size={32} />
        <p className="font-medium text-sm tracking-wide">Carregando detalhes...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center font-sans">
        <div className="bg-red-50 p-4 rounded-full mb-4 text-red-600 shadow-sm">
           <AlertCircle size={40} />
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Produto não encontrado</h1>
        <p className="text-slate-600 mb-6 max-w-xs mx-auto text-sm">{error}</p>
      </div>
    );
  }

  // Componente reutilizável para os Cards
  const DetailCard = ({ label, value, isBig = false }: { label: string, value: string | number, isBig?: boolean }) => (
    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] w-full transition-all hover:shadow-md">
      <h3 className="text-[10px] font-bold text-[#9f1239] uppercase tracking-widest mb-1.5 font-sans">
        {label}
      </h3>
      <p className={`text-slate-900 font-semibold ${isBig ? 'text-2xl' : 'text-lg'} leading-tight break-words`}>
        {value}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-12">
      {/* Header com Logo */}
      <div className="bg-white pt-10 pb-8 px-6 flex justify-center shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] mb-6 sticky top-0 z-10 backdrop-blur-sm bg-white/95">
         {/* 
            IMPORTANTE: Coloque o arquivo 'logo-airslaid.png' dentro da pasta 'public' na raiz do projeto.
         */}
         <img 
            src="/logo-airslaid.png" 
            alt="Grupo Air Slaid - Solução em Filtragem" 
            className="w-64 h-auto object-contain"
            onError={(e) => {
                // Fallback caso a imagem não seja encontrada na pasta public
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                    const textNode = document.createElement("div");
                    textNode.className = "text-center";
                    textNode.innerHTML = `
                      <div class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Grupo</div>
                      <div class="text-3xl font-bold text-[#9f1239] tracking-tighter leading-none">air <span class="font-light">slaid</span></div>
                      <div class="text-[9px] font-medium text-gray-400 uppercase tracking-widest mt-1">Solução em Filtragem</div>
                      <div class="text-[8px] text-red-400 mt-2 font-mono">logo-airslaid.png não encontrado</div>
                    `;
                    parent.appendChild(textNode);
                }
            }}
         />
      </div>

      <div className="max-w-md mx-auto px-5 flex flex-col gap-4">
        
        {/* 1. Ordem de Produção - Destaque Principal */}
        <DetailCard 
            label="Ordem de Produção" 
            value={product.ord_in_codigo} 
            isBig={true}
        />

        {/* 2. Número do Lote */}
        <DetailCard 
            label="Número do Lote" 
            value={product.orl_st_lotefabricacao || "N/A"} 
        />

        {/* 3. Código do Produto */}
        <DetailCard 
            label="Código do Produto" 
            value={product.pro_st_alternativo} 
        />

        {/* 4. Descrição */}
        <DetailCard 
            label="Descrição" 
            value={product.pro_st_descricao} 
        />

        {/* 5. Data de Fabricação */}
        <DetailCard 
            label="Data de Fabricação" 
            value={product.ord_dt_abertura_real 
                ? new Date(product.ord_dt_abertura_real).toLocaleDateString('pt-BR') 
                : 'N/A'} 
        />

        {/* 6. Composição */}
        <DetailCard 
            label="Composição" 
            value={product.esv_st_valor || "Não informada"} 
        />
        
        {/* Rodapé decorativo */}
        <div className="mt-8 text-center">
            <div className="h-1 w-12 bg-slate-200 rounded-full mx-auto mb-3"></div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Grupo Air Slaid</p>
        </div>

      </div>
    </div>
  );
};

export default ProductDetails;