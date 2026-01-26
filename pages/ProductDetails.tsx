import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { TABLE_NAME } from "../constants";
import { PowerBiLabelData } from "../types";
import { Package, Calendar, Tag, Layers, AlertCircle, Loader2, Home } from "lucide-react";

const ProductDetails: React.FC = () => {
  // Now we get the OP Number directly from the URL (e.g., /view/244)
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
        // Ensure opNumber is treated as a number for the query
        const opInt = parseInt(opNumber, 10);
        if (isNaN(opInt)) {
             throw new Error("O código da OP é inválido.");
        }

        // Query Supabase for the specific record
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
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <p>Carregando informações...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center font-sans">
        <div className="bg-red-100 p-4 rounded-full mb-4 text-red-600">
           <AlertCircle size={40} />
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Erro ao Ler Etiqueta</h1>
        <p className="text-slate-600 mb-6 max-w-xs mx-auto">{error}</p>
        <Link to="/" className="text-blue-600 font-semibold hover:underline flex items-center gap-2">
            <Home size={18} />
            Voltar para o Início
        </Link>
      </div>
    );
  }

  // This is the "HTML" template that is rendered for the client
  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-10">
      <div className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
           <Link to="/" className="text-slate-400 hover:text-slate-600">
             <Home size={20} />
           </Link>
           <h1 className="font-bold text-lg text-slate-900">Ficha Técnica</h1>
           <div className="w-5" /> {/* Spacer */}
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Main Product Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1 leading-tight">{product.pro_st_descricao}</h2>
          <p className="text-slate-500 text-sm mt-2 font-mono bg-slate-100 inline-block px-2 py-1 rounded">REF: {product.pro_st_alternativo}</p>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-start gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Tag size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ordem de Produção</p>
              <p className="font-medium text-slate-800 text-lg">{product.ord_in_codigo}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-start gap-3">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Layers size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lote de Fabricação</p>
              <p className="font-medium text-slate-800">{product.orl_st_lotefabricacao}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-start gap-3">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Data Fabricação</p>
              <p className="font-medium text-slate-800">
                {product.ord_dt_abertura_real 
                  ? new Date(product.ord_dt_abertura_real).toLocaleDateString('pt-BR') 
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Composition Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3 border-b border-slate-100 pb-2">
            Composição e Materiais
          </h3>
          <p className="text-slate-600 leading-relaxed text-sm">
            {product.esv_st_valor}
          </p>
        </div>
        
        <div className="text-center pt-8 pb-4 space-y-2">
           <p className="text-xs text-slate-400">Filial de Origem: {product.fil_in_codigo}</p>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
