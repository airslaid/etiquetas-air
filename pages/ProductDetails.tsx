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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500 gap-3">
        <Loader2 className="animate-spin text-rose-700" size={32} />
        <p>Carregando...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center font-sans">
        <div className="bg-red-50 p-4 rounded-full mb-4 text-red-600">
           <AlertCircle size={40} />
        </div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Ops! Algo deu errado.</h1>
        <p className="text-gray-600 mb-6 max-w-xs mx-auto">{error}</p>
      </div>
    );
  }

  // Componente reutilizável para os Cards
  const DetailCard = ({ label, value, isBig = false }: { label: string, value: string | number, isBig?: boolean }) => (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] w-full mb-4">
      <h3 className="text-[11px] font-bold text-[#9f1239] uppercase tracking-wider mb-2 font-sans">
        {label}
      </h3>
      <p className={`text-gray-900 font-medium ${isBig ? 'text-xl' : 'text-lg'} leading-snug break-words`}>
        {value}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans pb-10">
      {/* Header com Logo */}
      <div className="bg-white pt-8 pb-6 px-4 flex justify-center mb-2">
         {/* Logo Air Slaid - Usando URL externa para garantir exibição imediata. 
             Para produção, recomenda-se colocar o arquivo 'logo.png' na pasta public e usar src="/logo.png" */}
         <img 
            src="https://airslaid.com.br/wp-content/uploads/2021/04/Logo-Air-Slaid-1.png" 
            alt="Grupo Air Slaid" 
            className="h-16 object-contain"
            onError={(e) => {
                // Fallback caso a imagem não carregue
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                    const textNode = document.createElement("div");
                    textNode.className = "text-2xl font-bold text-[#9f1239] tracking-tighter";
                    textNode.innerHTML = "air <span class='font-light'>slaid</span>";
                    parent.appendChild(textNode);
                }
            }}
         />
      </div>

      <div className="max-w-md mx-auto px-5">
        
        {/* 1. Ordem de Produção */}
        <DetailCard 
            label="Ordem de Produção" 
            value={product.ord_in_codigo} 
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
        
        <div className="mt-8 text-center opacity-40">
            <div className="h-1 w-16 bg-gray-300 rounded-full mx-auto mb-2"></div>
        </div>

      </div>
    </div>
  );
};

export default ProductDetails;