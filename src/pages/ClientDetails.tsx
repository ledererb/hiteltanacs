import { useParams } from 'react-router-dom';
import { UserCircle, Briefcase, FileSignature, Save, UploadCloud } from 'lucide-react';
import { useForm } from 'react-hook-form';

export default function ClientDetails() {
  const { id } = useParams();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: id === 'new' ? '' : 'Kovács János',
      co_debtor: id === 'new' ? '' : 'Kovácsné Szabó Éva',
      income: id === 'new' ? '' : '450000',
    }
  });

  const onSubmit = (data: any) => {
    console.log("Saved specific client data:", data);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
         <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
               {id === 'new' ? 'Új Ügyfél Felvitele' : 'Ügyfél Adatlap'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
               Nincs szükség papírra, minden adat egy felületen.
            </p>
         </div>
         <div className="flex space-x-3">
             <button className="inline-flex items-center justify-center rounded-xl bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700 shadow-sm ring-1 ring-inset ring-primary-600/20 hover:bg-primary-100 transition-all">
               <FileSignature className="w-4 h-4 mr-2" />
               Iratok Generálása
             </button>
             <button onClick={handleSubmit(onSubmit)} className="inline-flex items-center justify-center rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-500/20 hover:bg-primary-600 hover:-translate-y-0.5 transition-all">
               <Save className="w-4 h-4 mr-2" />
               Mentés
             </button>
         </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
          <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-primary-400 to-primary-600"></div>
          
          <div className="p-8">
             <div className="flex items-center gap-4 mb-8">
                 <div className="p-3 rounded-full bg-primary-50 text-primary-600 ring-1 ring-primary-100">
                     <UserCircle className="w-8 h-8" />
                 </div>
                 <div>
                     <h2 className="text-lg font-semibold text-slate-900">Alapadatok</h2>
                     <p className="text-sm text-slate-500">Ügyfél és adóstárs azonosító adatai</p>
                 </div>
             </div>

             <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2">
                   <label className="block text-sm font-medium text-slate-700 mb-1">Pályázó (Adós) Neve *</label>
                   <input {...register('name')} className="block w-full rounded-xl border-0 py-2.5 px-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-all" />
                </div>
                
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Adóstárs Neve</label>
                   <input {...register('co_debtor')} className="block w-full rounded-xl border-0 py-2.5 px-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-all" />
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Havi nettó jövedelem (Ft)</label>
                   <input {...register('income')} type="number" className="block w-full rounded-xl border-0 py-2.5 px-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-all" />
                </div>
             </form>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Projekt Box */}
         <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
             <div className="flex items-center gap-4 mb-6">
                 <div className="p-2 rounded-full bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                     <Briefcase className="w-6 h-6" />
                 </div>
                 <h2 className="text-lg font-semibold text-slate-900">Aktív Projektek</h2>
             </div>
             
             {id === 'new' ? (
                <div className="text-center py-6 text-slate-500 text-sm italic">Mentsd el az ügyfelet a projekt felviteléhez.</div>
             ) : (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                        <div>
                           <div className="font-semibold text-sm text-slate-900">Szigetelés + Nyílászáró</div>
                           <div className="text-xs text-slate-500 mt-0.5">Beruházási elemek</div>
                        </div>
                        <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
                           Előkészítés
                        </span>
                    </div>
                </div>
             )}
         </div>

         {/* File feltöltés Box */}
         <div className="bg-slate-50 rounded-2xl shadow-inner border border-slate-200 p-8 flex flex-col items-center justify-center text-center">
             <UploadCloud className="w-12 h-12 text-slate-400 mb-4" />
             <h3 className="text-slate-900 font-medium mb-1">Feltöltés a Supabase Storage-ba</h3>
             <p className="text-sm text-slate-500 mb-6 max-w-[250px]">
                 Töltsd fel az energetikai HET igazolásokat vagy egyéb mellékleteket
             </p>
             <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition-all">
                 Fájlok kiválasztása
             </button>
         </div>
      </div>
      
    </div>
  );
}
