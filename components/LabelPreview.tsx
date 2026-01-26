import React from "react";
import QRCode from "react-qr-code";
import { PowerBiLabelData } from "../types";

interface LabelPreviewProps {
  data: PowerBiLabelData;
  detailsUrl: string;
}

const LabelPreview: React.FC<LabelPreviewProps> = ({ data, detailsUrl }) => {
  // Configuração física: 10cm largura x 7cm altura total.
  // Dividido em 3 colunas, cada etiqueta tem ~3.33cm de largura por 7cm de altura.

  const LabelContent = () => (
    <div className="flex flex-col items-center h-full pt-1 pb-1 relative bg-white overflow-hidden box-border">
      
      {/* Topo: Texto fixo */}
      <span className="text-[7px] uppercase font-sans text-black leading-none mt-1 mb-2 tracking-tight">
        Produzido no Brasil
      </span>

      {/* Meio: QR Code */}
      {/* Mantido em 60% */}
      <div className="w-[60%] aspect-square flex items-center justify-center mb-1">
        <QRCode
          style={{ height: "100%", width: "100%" }}
          value={detailsUrl}
          viewBox={`0 0 256 256`}
        />
      </div>

      {/* Fundo: Textos Rotacionados */}
      {/* 
         Rotação -90 graus.
         O texto flui de baixo para cima na etiqueta física.
         A ordem visual agora será:
         1. Nome da Empresa (Quebrado)
         2. Código do Produto (Abaixo da empresa)
      */}
      <div className="flex-grow w-full relative">
         <div className="absolute inset-0 flex items-center justify-center">
            {/* O container gira -90 graus */}
            <div className="flex flex-col items-center justify-center -rotate-90 origin-center transform translate-y-2">
                 
                 {/* Nome da Empresa - Quebrado em 2 linhas e centralizado */}
                 <div className="flex flex-col items-center justify-center mb-1 leading-none">
                    {/* Aumentado significativamente para destaque */}
                    <span className="text-[11px] font-black whitespace-nowrap uppercase text-black font-sans tracking-tight">
                       AIR SLAID
                    </span>
                    {/* Aumentado para o limite da largura */}
                    <span className="text-[8px] font-bold whitespace-nowrap uppercase text-black font-sans tracking-wide">
                       TECIDOS TÉCNICOS LTDA
                    </span>
                 </div>

                 {/* Código do Produto - Abaixo do nome da empresa */}
                 <span className="text-[16px] font-black whitespace-nowrap uppercase text-black font-sans leading-none tracking-tighter">
                   {data.pro_st_alternativo || "CÓDIGO"}
                 </span>

            </div>
         </div>
      </div>
    </div>
  );

  return (
    <div className="w-full flex justify-center mt-8">
      {/* Container Visual representando a área de 10cm x 7cm */}
      {/* 
          ALTERAÇÃO DE IMPRESSÃO:
          Adicionado 'print:fixed print:top-0 print:left-0 print:z-[9999] print:m-0'.
          Isso remove a etiqueta do fluxo normal da página HTML e a cola no canto superior esquerdo
          do papel, garantindo que ocupe os 10cm x 7cm definidos sem margens extras do layout do site.
      */}
      <div
        className="bg-white text-black shadow-lg 
                   print:shadow-none print:border-none print:fixed print:top-0 print:left-0 print:z-[9999] print:m-0
                   print:w-[10cm] print:h-[7cm] 
                   w-[10cm] h-[7cm] 
                   flex flex-row overflow-hidden border border-gray-200 box-border"
        style={{ breakInside: "avoid" }}
      >
        {/* Coluna 1 */}
        <div className="w-1/3 h-full border-r border-gray-300 border-dashed last:border-0">
          <LabelContent />
        </div>
        {/* Coluna 2 */}
        <div className="w-1/3 h-full border-r border-gray-300 border-dashed last:border-0">
          <LabelContent />
        </div>
        {/* Coluna 3 */}
        <div className="w-1/3 h-full">
          <LabelContent />
        </div>
      </div>
    </div>
  );
};

export default LabelPreview;