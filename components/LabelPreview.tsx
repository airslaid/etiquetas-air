import React from "react";
import QRCode from "react-qr-code";
import { PowerBiLabelData } from "../types";

interface LabelPreviewProps {
  data: PowerBiLabelData;
  detailsUrl: string;
}

const LabelPreview: React.FC<LabelPreviewProps> = ({ data, detailsUrl }) => {
  // Configuração física: 10cm largura x 7cm altura total.
  // Ajuste: Adicionado 2mm de margem a esquerda (padding-left) para corrigir corte na impressão.
  // O container continua com 10cm totais, mas o conteúdo interno desloca para a direita.

  const LabelContent = () => (
    <div className="flex flex-col items-center h-full pt-1 pb-1 relative bg-white overflow-hidden box-border">
      
      {/* Topo: Texto fixo */}
      <span className="text-[7px] uppercase font-sans text-black leading-none mt-1 mb-2 tracking-tight">
        Produzido no Brasil
      </span>

      {/* Meio: QR Code */}
      <div className="w-[60%] aspect-square flex items-center justify-center mb-1">
        <QRCode
          style={{ height: "100%", width: "100%" }}
          value={detailsUrl}
          viewBox={`0 0 256 256`}
        />
      </div>

      {/* Fundo: Textos Rotacionados */}
      <div className="flex-grow w-full relative">
         <div className="absolute inset-0 flex items-center justify-center">
            {/* O container gira -90 graus */}
            <div className="flex flex-col items-center justify-center -rotate-90 origin-center transform translate-y-2">
                 
                 {/* Nome da Empresa */}
                 <div className="flex flex-col items-center justify-center mb-1 leading-none">
                    <span className="text-[11px] font-black whitespace-nowrap uppercase text-black font-sans tracking-tight">
                       AIR SLAID
                    </span>
                    <span className="text-[8px] font-bold whitespace-nowrap uppercase text-black font-sans tracking-wide">
                       TECIDOS TÉCNICOS LTDA
                    </span>
                 </div>

                 {/* Código do Produto */}
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
      {/* Container Visual: 10cm x 7cm com Padding Left de 2mm */}
      <div
        className="bg-white text-black shadow-lg 
                   print:shadow-none print:border-none print:fixed print:top-0 print:left-0 print:z-[9999] print:m-0
                   print:w-[10cm] print:h-[7cm]
                   w-[10cm] h-[7cm] 
                   flex flex-row overflow-hidden border border-gray-200 box-border"
        style={{ 
          breakInside: "avoid",
          paddingLeft: "2mm" // Adicionando a margem solicitada
        }}
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