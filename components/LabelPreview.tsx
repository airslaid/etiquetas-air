import React from "react";
import QRCode from "react-qr-code";
import { PowerBiLabelData } from "../types";

interface LabelPreviewProps {
  data: PowerBiLabelData;
  detailsUrl: string;
}

const LabelPreview: React.FC<LabelPreviewProps> = ({ data, detailsUrl }) => {
  // 10cm width total, divided by 3 columns ~ 3.33cm per label. 7cm height.
  // We will replicate the same info 3 times to fill the row.

  const LabelContent = () => (
    <div className="flex flex-col items-center justify-between h-full p-1 border-r border-dashed border-gray-300 last:border-0 overflow-hidden text-center bg-white relative">
      <div className="w-full text-left z-10">
        <h2 className="text-[8px] font-bold uppercase leading-tight truncate">
          {data.pro_st_descricao}
        </h2>
        <p className="text-[7px] text-gray-600">REF: {data.pro_st_alternativo}</p>
      </div>

      <div className="flex-grow flex items-center justify-center w-full my-1">
        <div style={{ height: "auto", margin: "0 auto", maxWidth: "100%", width: "100%" }}>
          <QRCode
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            value={detailsUrl}
          />
        </div>
      </div>

      <div className="w-full text-[6px] leading-tight text-left space-y-[1px] z-10">
        <div className="flex justify-between">
          <span>OP: <strong>{data.ord_in_codigo}</strong></span>
          <span>Lote: {data.orl_st_lotefabricacao}</span>
        </div>
        <div>Comp: {data.esv_st_valor ? data.esv_st_valor.substring(0, 20) : ""}...</div>
        {/* Helper for debugging URL issues */}
        <div className="text-[5px] text-gray-400 mt-1 text-center truncate">{detailsUrl}</div>
      </div>
    </div>
  );

  return (
    <div className="w-full flex justify-center mt-8">
      {/* Visual Container representing the 10cm x 7cm area */}
      <div
        className="bg-white text-black shadow-lg print:shadow-none print:w-[10cm] print:h-[7cm] w-[10cm] h-[7cm] flex flex-row overflow-hidden border border-gray-200 print:border-0 box-border"
        style={{ breakInside: "avoid" }}
      >
        {/* Column 1 */}
        <div className="w-1/3 h-full border-r border-gray-200 border-dashed last:border-0">
          <LabelContent />
        </div>
        {/* Column 2 */}
        <div className="w-1/3 h-full border-r border-gray-200 border-dashed last:border-0">
          <LabelContent />
        </div>
        {/* Column 3 */}
        <div className="w-1/3 h-full">
          <LabelContent />
        </div>
      </div>
    </div>
  );
};

export default LabelPreview;
