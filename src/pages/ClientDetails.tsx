import { useParams, useNavigate } from 'react-router-dom';
import { UserCircle, Briefcase, FileSignature, Save, UploadCloud, Loader2, AlertCircle, CheckCircle2, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function ClientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeProjects, setActiveProjects] = useState<any[]>([]);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      name: '',
      co_debtor: '',
      income: '',
    }
  });

  useEffect(() => {
    if (id && id !== 'new') {
      const fetchClientInfo = async () => {
        try {
          const { data: client, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', id)
            .single();
            
          if (error) throw error;
          if (client) {
            reset({
              name: client.name || '',
              co_debtor: client.co_debtor_name || '',
              income: client.income_data?.net_income?.toString() || '',
            });
          }

          const { data: projects, error: projectsError } = await supabase
            .from('projects')
            .select('*')
            .eq('client_id', id)
            .order('created_at', { ascending: false });
            
          if (projectsError) throw projectsError;
          if (projects) {
             setActiveProjects(projects);
          }
        } catch (err) {
          console.error("Hiba az ügyfél adatainak letöltésekor:", err);
        }
      };
      
      fetchClientInfo();
    } else {
      reset({ name: '', co_debtor: '', income: '' });
      setActiveProjects([]);
    }
  }, [id, reset]);

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        throw new Error('Nem vagy bejelentkezve! Kérlek lépj be a mentéshez.');
      }

      const user = sessionData.session.user;

      const payload = {
        name: data.name,
        co_debtor_name: data.co_debtor,
        income_data: { net_income: data.income ? parseInt(data.income) : 0 },
        user_id: user.id
      };

      if (id === 'new') {
        const { data: insertedData, error } = await supabase
          .from('clients')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        
        // MVP: Automatikus projekt létrehozása az új ügyfélhez, hogy a Kanbanon megjelenjen
        const { error: projectError } = await supabase
          .from('projects')
          .insert([{
            client_id: insertedData.id,
            status: 'előkészítés',
            user_id: user.id
          }]);

        if (projectError) throw projectError;
        
        setSubmitStatus('success');
        
        setTimeout(() => {
          navigate(`/clients/${insertedData.id}`);
        }, 1500);

      } else {
        const { error } = await supabase
          .from('clients')
          .update(payload)
          .eq('id', id);

        if (error) throw error;
        
        setSubmitStatus('success');
        setTimeout(() => setSubmitStatus('idle'), 3000);
      }
      
    } catch (err: any) {
      console.error("Hiba történt mentéskor:", err);
      setSubmitStatus('error');
      setErrorMessage(err.message || 'Ismeretlen hiba történt az adatbázis mentés során.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateProject = async () => {
    if (!id || id === 'new') return;
    setIsCreatingProject(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Nincs aktív bejelentkezés");

      const { data, error } = await supabase
        .from('projects')
        .insert([{ 
          client_id: id, 
          status: 'előkészítés',
          user_id: sessionData.session.user.id,
          notes: newProjectName
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      // Frissítjük a felületet az új projekttel
      if (data) {
        setActiveProjects(prev => [data, ...prev]);
        setIsProjectModalOpen(false);
        setNewProjectName('');
      }
    } catch (err: any) {
      console.error("Hiba az új projekt létrehozásakor:", err);
      alert("Sikertelen létrehozás: " + err.message);
    } finally {
      setIsCreatingProject(false);
    }
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
             <button disabled={isSubmitting} onClick={handleSubmit(onSubmit)} className="inline-flex items-center justify-center rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-500/20 hover:bg-primary-600 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed">
               {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
               ) : (
                  <Save className="w-4 h-4 mr-2" />
               )}
               {isSubmitting ? 'Mentés folyamatban...' : 'Mentés'}
             </button>
         </div>
      </div>

      {submitStatus === 'error' && (
        <div className="rounded-xl bg-red-50 p-4 border border-red-200 flex items-start">
           <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
           <div>
             <h3 className="text-sm font-medium text-red-800">Sikertelen mentés</h3>
             <div className="text-sm text-red-700 mt-1">{errorMessage}</div>
           </div>
        </div>
      )}

      {submitStatus === 'success' && (
        <div className="rounded-xl bg-green-50 p-4 border border-green-200 flex items-start">
           <CheckCircle2 className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
           <div>
             <h3 className="text-sm font-medium text-green-800">Sikeres mentés!</h3>
             <div className="text-sm text-green-700 mt-1">Az ügyfél adatai rendben rögzítve lettek a rendszerben.</div>
           </div>
        </div>
      )}

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
             <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-4">
                     <div className="p-2 rounded-full bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                         <Briefcase className="w-6 h-6" />
                     </div>
                     <h2 className="text-lg font-semibold text-slate-900">Aktív Projektek</h2>
                 </div>
                 
                 {id !== 'new' && (
                     <button
                        type="button"
                        onClick={() => setIsProjectModalOpen(true)}
                        className="inline-flex items-center justify-center rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm ring-1 ring-inset ring-blue-600/20 hover:bg-blue-50 transition-all"
                     >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Új Projekt
                     </button>
                 )}
             </div>
             
             {id === 'new' ? (
                <div className="text-center py-6 text-slate-500 text-sm italic">Mentsd el az ügyfelet a projekt felviteléhez.</div>
             ) : activeProjects.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-sm italic">Nincsenek rögzített projektek ehhez az ügyfélhez.</div>
             ) : (
                <div className="space-y-3">
                   {activeProjects.map(project => (
                     <div key={project.id} className="rounded-xl border border-slate-200 overflow-hidden">
                         <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                             <div>
                                <div className="font-semibold text-sm text-slate-900">
                                  {project.notes ? project.notes : `Projekt: #${project.id.substring(0,8)}`}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">Létrehozva: {new Date(project.created_at).toLocaleDateString('hu-HU')}</div>
                             </div>
                             <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20 capitalize">
                                {project.status}
                             </span>
                         </div>
                     </div>
                   ))}
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
      
      {/* Új Projekt Modal */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">Új Projekt Indítása</h3>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Projekt Megnevezése</label>
              <input 
                type="text" 
                value={newProjectName} 
                onChange={(e) => setNewProjectName(e.target.value)} 
                placeholder="Pl: Napelem és hőszivattyú telepítés"
                className="block w-full rounded-xl border-0 py-2.5 px-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-primary-500 transition-all font-medium"
                autoFocus
              />
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setIsProjectModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl shadow-sm hover:bg-slate-50 transition-colors"
              >
                Mégse
              </button>
              <button 
                onClick={handleCreateProject}
                disabled={!newProjectName.trim() || isCreatingProject}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl shadow-sm hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isCreatingProject && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Létrehozás
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
