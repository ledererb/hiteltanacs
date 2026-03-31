import { Printer } from 'lucide-react';
import React from 'react';

interface PrintPDFProps {
  title: string;
  clientName: string;
  content: React.ReactNode;
}

export default function PrintPDF({ title, clientName, content }: PrintPDFProps) {
  const handlePrint = () => {
    // In a full application, this would open a new window or use a library like jsPDF
    // MVP: using native print stylesheet triggers
    window.print();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 max-w-2xl mx-auto my-8 print:shadow-none print:border-none print:p-0 print:m-0">
      {/* Hide controls when printing */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100 print:hidden">
         <div>
            <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
            <p className="text-sm text-slate-500">Készült: {new Date().toLocaleDateString('hu-HU')}</p>
         </div>
         <button 
           onClick={handlePrint}
           className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-all"
         >
           <Printer className="w-4 h-4 mr-2" />
           Nyomtatás / Mentés PDF-ként
         </button>
      </div>

      {/* The Printable Document Body */}
      <div className="print-content text-slate-900 leading-relaxed text-left text-sm">
         <div className="text-center mb-10 font-bold text-xl uppercase tracking-wider">
            {title}
         </div>
         
         {content}
         
         <div className="mt-20 flex justify-between">
            <div className="text-center border-t border-slate-900 pt-2 w-48">
               <span className="block text-xs uppercase tracking-wider font-semibold">Kelt: {new Date().toLocaleDateString('hu-HU')}</span>
            </div>
            <div className="text-center border-t border-slate-900 pt-2 w-48">
               <span className="block text-xs uppercase tracking-wider font-semibold mb-6"> {clientName} </span>
               <span className="text-xs text-slate-500">(Aláírás)</span>
            </div>
         </div>
      </div>
    </div>
  );
}
