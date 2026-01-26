import React from "react";
import QRCode from "react-qr-code";
import { PowerBiLabelData } from "../types";

interface LabelPreviewProps {
  data: PowerBiLabelData;
  detailsUrl: string;
}

const LabelPreview: React.FC<LabelPreviewProps> = ({ data, detailsUrl }) => {
  // Configuração física: 10cm largura x 7cm altura total.
  // Ajuste 1: Container com padding-left de 6mm.
  // Ajuste 2: Removidas as bordas (border-dashed).
  // Ajuste 3: Adicionado padding-left nas colunas 2 e 3.
  // Ajuste 4: Aumentado padding-top interno (pt-3) e tamanho das fontes da empresa.

  const LabelContent = () => (
    <div className="flex flex-col items-center h-full pt-3 pb-1 relative bg-white overflow-hidden box-border">
      
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
                    <span className="text-[14px] font-black whitespace-nowrap uppercase text-black font-sans tracking-tight">
                       AIR SLAID
                    </span>
                    <span className="text-[10px] font-bold whitespace-nowrap uppercase text-black font-sans tracking-wide">
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
      {/* Container Visual: 10cm x 7cm com Padding Left de 6mm */}
      <div
        className="bg-white text-black shadow-lg 
                   print:shadow-none print:border-none print:fixed print:top-0 print:left-0 print:z-[9999] print:m-0
                   print:w-[10cm] print:h-[7cm]
                   w-[10cm] h-[7cm] 
                   flex flex-row overflow-hidden border border-gray-200 box-border"
        style={{ 
          breakInside: "avoid",
          paddingLeft: "6mm" 
        }}
      >
        {/* Coluna 1 */}
        <div className="w-1/3 h-full">
          <LabelContent />
        </div>
        
        {/* Coluna 2 - Adicionado pl-[4mm] para afastar da primeira */}
        <div className="w-1/3 h-full pl-[4mm]">
          <LabelContent />
        </div>
        
        {/* Coluna 3 - Adicionado pl-[4mm] para afastar da segunda */}
        <div className="w-1/3 h-full pl-[4mm]">
          <LabelContent />
        </div>
      </div>
    </div>
  );
};

export default LabelPreview;