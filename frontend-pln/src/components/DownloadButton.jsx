import React from "react";
import { Download } from "lucide-react";

const DownloadButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 bg-[#17A2B8] hover:bg-[#138496] text-white rounded-lg text-xs font-bold transition-all shadow-lg active:scale-95"
    >
      <Download size={14} />
      <span>Unduh Data</span>
    </button>
  );
};

export default DownloadButton;
