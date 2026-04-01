import { useParams, useNavigate } from 'react-router-dom';
import { UserCircle, Briefcase, FileSignature, Save, UploadCloud, Loader2, AlertCircle, CheckCircle2, Plus, Trash2, Download } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import clsx from 'clsx';
import { 
  generateMeghatalmazas, 
  generateNyilatkozat, 
  generateOsszefoglaloNyilatkozat, 
  generateHorizontalis,
  generateTulajdonosiNyilatkozat,
  generateTulajdonosiHozzajarulas,
  generatePepNyilatkozat,
  generateKhrNyilatkozat
} from '../lib/pdfGenerator';

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
  
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadProjectId, setUploadProjectId] = useState('');
  const [uploadDocType, setUploadDocType] = useState('nyilatkozat');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfType, setPdfType] = useState<
    'nyilatkozat' | 'meghatalmazás' | 'osszefoglalo' | 'horizontalis' | 
    'tulajdonosi_nyilatkozat' | 'tulajdonosi_hozzajarulas' | 'pep_nyilatkozat' | 'khr_nyilatkozat'
  >('nyilatkozat');
  const [pdfProjectId, setPdfProjectId] = useState('');

  // Új űrlap statek a tulajdonosokhoz és KHR hitelekhez
  const [owners, setOwners] = useState<{name: string, share: string, address: string}[]>([]);
  const [existingLoans, setExistingLoans] = useState<{bank: string, amount: string, monthly: string}[]>([]);

  const [isContractorModalOpen, setIsContractorModalOpen] = useState(false);
  const [contractorProjectId, setContractorProjectId] = useState('');
  const [newContractorName, setNewContractorName] = useState('');
  const [newContractorRole, setNewContractorRole] = useState('Napelem telepítő');
  const [isAddingContractor, setIsAddingContractor] = useState(false);

  // Beruházási elemek (Investment items) state
  const [isInvestmentModalOpen, setIsInvestmentModalOpen] = useState(false);
  const [investmentProjectId, setInvestmentProjectId] = useState('');
  const [currentInvestmentItems, setCurrentInvestmentItems] = useState<string[]>([]);
  const [isSavingInvestments, setIsSavingInvestments] = useState(false);

  // A választható beruházási kategóriák a dokumentáció alapján
  const INVESTMENT_OPTIONS = [
    { id: 'hoszigeteles', label: 'Hőszigetelés (homlokzati, födém)' },
    { id: 'nyilaszaro_csere', label: 'Nyílászáró csere (ablak, ajtó)' },
    { id: 'futeskorszerusites', label: 'Fűtéskorszerűsítés (hőszivattyú, kazáncsere)' },
    { id: 'hmv_modernizalas', label: 'Használati melegvíz rendszer modernizálása' },
    { id: 'napelemes_rendszer', label: 'Napelemes rendszer' }
  ];

  const { register, handleSubmit, reset, getValues } = useForm({
    defaultValues: {
      name: '',
      co_debtor: '',
      income: '',
      email: '',
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
              email: client.email || '',
            });
            setOwners(client.owners || []);
            setExistingLoans(client.existing_loans || []);
          }

          const { data: projects, error: projectsError } = await supabase
            .from('projects')
            .select('*')
            .eq('client_id', id)
            .order('created_at', { ascending: false });
            
          if (projectsError) throw projectsError;
          if (projects) {
             setActiveProjects(projects);
             if (projects.length > 0) {
                 setUploadProjectId(projects[0].id); // Alapértelmezett projekt a feltöltéshez
                 setPdfProjectId(projects[0].id); // Alapértelmezett projekt az iratgeneráláshoz
             }
             
             // Dokumentumok betöltése a projektekhez
             const projectIds = projects.map(p => p.id);
             if (projectIds.length > 0) {
                 const { data: docs } = await supabase
                    .from('documents')
                    .select('*')
                    .in('project_id', projectIds)
                    .order('created_at', { ascending: false });
                 if (docs) setDocuments(docs);
             }
          }
        } catch (err) {
          console.error("Hiba az ügyfél adatainak letöltésekor:", err);
        }
      };
      
      fetchClientInfo();
    } else {
      reset({ name: '', co_debtor: '', income: '', email: '' });
      setOwners([]);
      setExistingLoans([]);
      setActiveProjects([]);
      setDocuments([]);
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
        owners: owners,
        existing_loans: existingLoans,
        email: data.email,
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !uploadProjectId) return;

    setIsUploading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Nincs aktív bejelentkezés");

      // Fájl feltöltése a Supabase Storage-ba
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${sessionData.session.user.id}/${uploadProjectId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Adatbázis bejegyzés a dokumentumokhoz
      const { data: docData, error: dbError } = await supabase
        .from('documents')
        .insert([{
          project_id: uploadProjectId,
          doc_type: uploadDocType,
          storage_path: filePath,
          uploaded_by: sessionData.session.user.id
        }])
        .select()
        .single();

      if (dbError) throw dbError;

      if (docData) {
        setDocuments(prev => [docData, ...prev]);
        const projectMatch = activeProjects.find(p => p.id === uploadProjectId);
        alert(`Sikeres feltöltés a(z) '${projectMatch?.notes || 'Kiválasztott projekt'}' projekthez!`);
      }
    } catch (err: any) {
       console.error("Hiba fájlfeltöltéskor:", err);
       alert("Sikertelen feltöltés: " + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (path: string, originalName: string) => {
    try {
      const { data, error } = await supabase.storage.from('documents').download(path);
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = originalName;
      document.body.appendChild(link);
      link.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err) {
      console.error("Hiba letöltéskor:", err);
      alert("A fájl letöltése nem sikerült.");
    }
  };

  const handleDeleteDocument = async (docId: string, storagePath: string) => {
    if (!confirm('Biztosan véglegesen törlöd ezt a dokumentumot? A fájl a szerverről is elveszik!')) return;
    try {
       // Storage törlés
       const { error: storageError } = await supabase.storage.from('documents').remove([storagePath]);
       if (storageError) console.warn("Figyelmeztetés: Storage-ből nem sikerült törölni a fájlt", storageError);

       // Adatbázis rekord törlése
       const { error: dbError } = await supabase.from('documents').delete().eq('id', docId);
       if (dbError) throw dbError;

       // Frontend filterezés
       setDocuments(prev => prev.filter(d => d.id !== docId));
       
    } catch (err: any) {
       console.error("Hiba dokumentum törlésekor:", err);
       alert("Sikertelen törlés: " + err.message);
    }
  };

  const openContractorModal = (projectId: string) => {
    setContractorProjectId(projectId);
    setNewContractorName('');
    setNewContractorRole('Napelem telepítő');
    setIsContractorModalOpen(true);
  };

  const handleAddContractor = async () => {
    if (!contractorProjectId || !newContractorName.trim()) return;
    setIsAddingContractor(true);

    try {
       const project = activeProjects.find(p => p.id === contractorProjectId);
       if (!project) throw new Error("Projekt nem található");

       const currentContractors = project.contractors || [];
       const updatedContractors = [...currentContractors, { name: newContractorName.trim(), role: newContractorRole }];

       const { error } = await supabase
         .from('projects')
         .update({ contractors: updatedContractors })
         .eq('id', contractorProjectId);

       if (error) throw error;

       setActiveProjects(prev => prev.map(p => p.id === contractorProjectId ? { ...p, contractors: updatedContractors } : p));
       setIsContractorModalOpen(false);
    } catch (err: any) {
       console.error("Hiba kivitelező rögzítésekor", err);
       alert("Sikertelen hozzáadás: " + err.message);
    } finally {
       setIsAddingContractor(false);
    }
  };

   const handleRemoveContractor = async (projectId: string, indexToRemove: number) => {
    if (!confirm('Biztosan törlöd ezt a kivitelezőt? A törlés befolyásolhatja a már kiszámított díjakat, ha az események lefutottak.')) return;
    try {
       const project = activeProjects.find(p => p.id === projectId);
       if (!project) return;
       
       const updatedContractors = project.contractors.filter((_: any, idx: number) => idx !== indexToRemove);

       const { error } = await supabase
         .from('projects')
         .update({ contractors: updatedContractors })
         .eq('id', projectId);

       if (error) throw error;
       setActiveProjects(prev => prev.map(p => p.id === projectId ? { ...p, contractors: updatedContractors } : p));
    } catch (err: any) {
       alert("Hiba törléskor: " + err.message);
    }
  };

  const openInvestmentModal = (projectId: string, existingItems: any) => {
    setInvestmentProjectId(projectId);
    setCurrentInvestmentItems(Array.isArray(existingItems) ? existingItems : []);
    setIsInvestmentModalOpen(true);
  };

  const toggleInvestmentItem = (itemId: string) => {
    setCurrentInvestmentItems(prev => 
      prev.includes(itemId) ? prev.filter(i => i !== itemId) : [...prev, itemId]
    );
  };

  const handleSaveInvestments = async () => {
    if (!investmentProjectId) return;
    
    // Alapvető validáció
    if (currentInvestmentItems.length === 0) {
      if (!confirm('Üresen hagyod a beruházási listát? İgy az Összefoglaló nyilatkozatban nem fog semmi megjelenni a felújításnál!')) {
         return;
      }
    }

    setIsSavingInvestments(true);
    try {
      const { error } = await supabase
         .from('projects')
         .update({ investment_items: currentInvestmentItems })
         .eq('id', investmentProjectId);
         
      if (error) throw error;
      
      setActiveProjects(prev => prev.map(p => 
         p.id === investmentProjectId ? { ...p, investment_items: currentInvestmentItems } : p
      ));
      
      setIsInvestmentModalOpen(false);
    } catch (err: any) {
      console.error("Hiba a beruházási elemek mentésekor:", err);
      alert("A beruházási elemek mentése nem sikerült: " + err.message);
    } finally {
      setIsSavingInvestments(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!id || id === 'new' || !pdfProjectId) {
      alert("A generáláshoz az ügyfélnek legalább egy mentett projekttel kell rendelkeznie!");
      return;
    }
    setIsGeneratingPdf(true);
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Nincs aktív bejelentkezés");

      const formValues = getValues();
      const projectMatch = activeProjects.find(p => p.id === pdfProjectId);

      const clientData = {
        clientName: formValues.name,
        coDebtorName: formValues.co_debtor,
        projectNotes: projectMatch?.notes,
        investmentItems: projectMatch?.investment_items,
        owners: owners,
        existingLoans: existingLoans
      };

      let pdfBlob: Blob;
      if (pdfType === 'nyilatkozat') {
        pdfBlob = generateNyilatkozat(clientData);
      } else if (pdfType === 'meghatalmazás') {
        pdfBlob = generateMeghatalmazas(clientData);
      } else if (pdfType === 'osszefoglalo') {
        pdfBlob = generateOsszefoglaloNyilatkozat(clientData);
      } else if (pdfType === 'horizontalis') {
        pdfBlob = generateHorizontalis(clientData);
      } else if (pdfType === 'tulajdonosi_nyilatkozat') {
        pdfBlob = generateTulajdonosiNyilatkozat(clientData);
      } else if (pdfType === 'tulajdonosi_hozzajarulas') {
        pdfBlob = generateTulajdonosiHozzajarulas(clientData);
      } else if (pdfType === 'pep_nyilatkozat') {
        pdfBlob = generatePepNyilatkozat(clientData);
      } else if (pdfType === 'khr_nyilatkozat') {
        pdfBlob = generateKhrNyilatkozat(clientData);
      } else {
        throw new Error("Ismeretlen PDF típus");
      }

      const safeName = formValues.name.replace(/[^a-zA-Z0-9]/g, '_') || 'ugyfel';
      let typeLabel = '';
      if (pdfType === 'nyilatkozat') typeLabel = 'Adatkezelesi_Nyilatkozat';
      else if (pdfType === 'meghatalmazás') typeLabel = 'Meghatalmazas';
      else if (pdfType === 'osszefoglalo') typeLabel = 'Osszefoglalo';
      else if (pdfType === 'horizontalis') typeLabel = 'Horizontalis_Kovetelmenyek';
      else if (pdfType === 'tulajdonosi_nyilatkozat') typeLabel = 'Tulajdonosi_Nyilatkozat';
      else if (pdfType === 'tulajdonosi_hozzajarulas') typeLabel = 'Tulajdonosi_Hozzajarulas';
      else if (pdfType === 'pep_nyilatkozat') typeLabel = 'PEP_Nyilatkozat';
      else if (pdfType === 'khr_nyilatkozat') typeLabel = 'KHR_Nyilatkozat';

      const timestamp = new Date().getTime();
      const fileName = `${typeLabel}_${safeName}_${timestamp}.pdf`;
      const filePath = `${sessionData.session.user.id}/${pdfProjectId}/${fileName}`;

      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: docData, error: dbError } = await supabase
        .from('documents')
        .insert([{
          project_id: pdfProjectId,
          doc_type: pdfType,
          storage_path: filePath,
          uploaded_by: sessionData.session.user.id
        }])
        .select()
        .single();
        
      if (dbError) throw dbError;

      if (docData) {
          setDocuments(prev => [docData, ...prev]);
      }

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(link);

      setIsPdfModalOpen(false);
      
    } catch (err: any) {
      console.error("Hiba az irat generálásakor:", err);
      alert("Hiba történt az irat generálásakor: " + err.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 transition-colors">
         <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
               {id === 'new' ? 'Új Ügyfél Felvitele' : 'Ügyfél Adatlap'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 transition-colors">
               Nincs szükség papírra, minden adat egy felületen.
            </p>
         </div>
         <div className="flex space-x-3">
             <button 
               type="button"
               onClick={() => setIsPdfModalOpen(true)}
               disabled={id === 'new'}
               className="inline-flex items-center justify-center rounded-xl bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700 shadow-sm ring-1 ring-inset ring-primary-600/20 hover:bg-primary-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
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
        <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-900/50 flex items-start">
           <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mr-3 flex-shrink-0 mt-0.5" />
           <div>
             <h3 className="text-sm font-medium text-green-800 dark:text-green-300">Sikeres mentés!</h3>
             <div className="text-sm text-green-700 dark:text-green-400 mt-1">Az ügyfél adatai rendben rögzítve lettek a rendszerben.</div>
           </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative transition-colors">
          <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-primary-400 to-primary-600"></div>
          
          <div className="p-8">
             <div className="flex items-center gap-4 mb-8">
                 <div className="p-3 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 ring-1 ring-primary-100 dark:ring-primary-800">
                     <UserCircle className="w-8 h-8" />
                 </div>
                 <div>
                     <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Alapadatok</h2>
                     <p className="text-sm text-slate-500 dark:text-slate-400">Ügyfél és adóstárs azonosító adatai</p>
                 </div>
             </div>

             <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2">
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pályázó (Adós) Neve *</label>
                   <input {...register('name')} className="block w-full rounded-xl border-0 py-2.5 px-4 text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-all" />
                </div>
                
                <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Adóstárs Neve</label>
                   <input {...register('co_debtor')} className="block w-full rounded-xl border-0 py-2.5 px-4 text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-all" />
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">E-mail Cím</label>
                   <input {...register('email')} type="email" placeholder="ugyfel@peldacim.hu" className="block w-full rounded-xl border-0 py-2.5 px-4 text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-all" />
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Havi nettó jövedelem (Ft)</label>
                   <input {...register('income')} type="number" className="block w-full rounded-xl border-0 py-2.5 px-4 text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-all" />
                </div>
             </form>

             {/* Tulajdonosok */}
             <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Ingatlan Tulajdonosok</h3>
                  <button type="button" onClick={() => setOwners([...owners, { name: '', share: '', address: '' }])} className="text-xs flex items-center text-primary-600 dark:text-primary-400 font-medium hover:text-primary-700 transition">
                     <Plus className="w-4 h-4 mr-1" /> Új hozzáadása
                  </button>
                </div>
                {owners.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">Nincs rögzítve tulajdonos. (Bizonyos dokumentumokhoz szükséges)</p>
                ) : (
                  <div className="space-y-3">
                     {owners.map((owner, idx) => (
                        <div key={idx} className="flex flex-col md:flex-row gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors">
                           <input placeholder="Név" value={owner.name} onChange={e => { const newO = [...owners]; newO[idx].name = e.target.value; setOwners(newO); }} className="flex-1 text-sm rounded-lg border-0 bg-white dark:bg-slate-900 px-3 py-2 shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white" />
                           <input placeholder="Hányad (pl. 1/2)" value={owner.share} onChange={e => { const newO = [...owners]; newO[idx].share = e.target.value; setOwners(newO); }} className="w-full md:w-32 text-sm rounded-lg border-0 bg-white dark:bg-slate-900 px-3 py-2 shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white" />
                           <input placeholder="Cím / HRSZ" value={owner.address} onChange={e => { const newO = [...owners]; newO[idx].address = e.target.value; setOwners(newO); }} className="flex-1 text-sm rounded-lg border-0 bg-white dark:bg-slate-900 px-3 py-2 shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white" />
                           <button type="button" onClick={() => { const newO = [...owners]; newO.splice(idx, 1); setOwners(newO); }} className="text-xs text-red-500 hover:text-red-700 font-medium px-2 uppercase my-auto tracking-wider">Törlés</button>
                        </div>
                     ))}
                  </div>
                )}
             </div>

             {/* KHR Hitelek */}
             <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Meglévő Hitelek (KHR)</h3>
                  <button type="button" onClick={() => setExistingLoans([...existingLoans, { bank: '', amount: '', monthly: '' }])} className="text-xs flex items-center text-primary-600 dark:text-primary-400 font-medium hover:text-primary-700 transition">
                     <Plus className="w-4 h-4 mr-1" /> Új hitel
                  </button>
                </div>
                {existingLoans.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">Nincs rögzítve fennálló hátralék vagy meglévő hitel.</p>
                ) : (
                  <div className="space-y-3">
                     {existingLoans.map((loan, idx) => (
                        <div key={idx} className="flex flex-col md:flex-row gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors">
                           <input placeholder="Bank / Hitelintézet" value={loan.bank} onChange={e => { const newL = [...existingLoans]; newL[idx].bank = e.target.value; setExistingLoans(newL); }} className="flex-1 text-sm rounded-lg border-0 bg-white dark:bg-slate-900 px-3 py-2 shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white" />
                           <input placeholder="Tőketartozás (Ft)" type="number" value={loan.amount} onChange={e => { const newL = [...existingLoans]; newL[idx].amount = e.target.value; setExistingLoans(newL); }} className="flex-1 text-sm rounded-lg border-0 bg-white dark:bg-slate-900 px-3 py-2 shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white" />
                           <input placeholder="Törlesztő (Ft/hó)" type="number" value={loan.monthly} onChange={e => { const newL = [...existingLoans]; newL[idx].monthly = e.target.value; setExistingLoans(newL); }} className="flex-1 text-sm rounded-lg border-0 bg-white dark:bg-slate-900 px-3 py-2 shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white" />
                           <button type="button" onClick={() => { const newL = [...existingLoans]; newL.splice(idx, 1); setExistingLoans(newL); }} className="text-xs text-red-500 hover:text-red-700 font-medium px-2 uppercase my-auto tracking-wider">Törlés</button>
                        </div>
                     ))}
                  </div>
                )}
             </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Projekt Box */}
         <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 transition-colors">
             <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-4">
                     <div className="p-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 ring-1 ring-blue-100 dark:ring-blue-800">
                         <Briefcase className="w-6 h-6" />
                     </div>
                     <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Aktív Projektek</h2>
                 </div>
                 
                 {id !== 'new' && (
                     <button
                        type="button"
                        onClick={() => setIsProjectModalOpen(true)}
                        className="inline-flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 shadow-sm ring-1 ring-inset ring-blue-600/20 dark:ring-blue-500/30 hover:bg-blue-50 dark:hover:bg-slate-700 transition-all"
                     >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Új Projekt
                     </button>
                 )}
             </div>
             
             {id === 'new' ? (
                <div className="text-center py-6 text-slate-500 dark:text-slate-400 text-sm italic">Mentsd el az ügyfelet a projekt felviteléhez.</div>
             ) : activeProjects.length === 0 ? (
                <div className="text-center py-6 text-slate-500 dark:text-slate-400 text-sm italic">Nincsenek rögzített projektek ehhez az ügyfélhez.</div>
             ) : (
                <div className="space-y-3">
                   {activeProjects.map(project => (
                     <div key={project.id} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                         <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                             <div>
                                <div className="font-semibold text-sm text-slate-900 dark:text-white">
                                  {project.notes ? project.notes : `Projekt: #${project.id.substring(0,8)}`}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Létrehozva: {new Date(project.created_at).toLocaleDateString('hu-HU')}</div>
                             </div>
                             <span className="inline-flex items-center rounded-md bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 text-xs font-medium text-yellow-800 dark:text-yellow-400 ring-1 ring-inset ring-yellow-600/20 dark:ring-yellow-500/30 capitalize">
                                {project.status}
                             </span>
                         </div>
                          <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                             <div className="flex justify-between items-center mb-2">
                                 <h5 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Beruházási Elemek</h5>
                                 <button onClick={() => openInvestmentModal(project.id, project.investment_items)} className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium flex items-center">
                                    Kezelés
                                 </button>
                             </div>
                             {project.investment_items && project.investment_items.length > 0 ? (
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {project.investment_items.map((item: string) => {
                                      const label = INVESTMENT_OPTIONS.find(o => o.id === item)?.label || item;
                                      return (
                                        <span key={item} className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 ring-1 ring-inset ring-slate-200 dark:ring-slate-700">
                                            {label.split(' ')[0]} {/* Rövidített vizuális megjelenítés */}
                                        </span>
                                      );
                                  })}
                                </div>
                             ) : (
                                <p className="text-xs text-slate-400 dark:text-slate-500 italic mb-2">Nincs rögzített elem a PDF generáláshoz.</p>
                             )}
                          </div>

                          <div className="p-3 bg-white dark:bg-slate-900">
                             <div className="flex justify-between items-center mb-2">
                                 <h5 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kivitelezők</h5>
                                 <button onClick={() => openContractorModal(project.id)} className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium flex items-center">
                                    <Plus className="w-3 h-3 mr-0.5" /> Új hozzáadása
                                 </button>
                             </div>
                             {project.contractors && project.contractors.length > 0 ? (
                                <ul className="space-y-1 mb-4">
                                   {project.contractors.map((c: any, idx: number) => (
                                       <li key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                                          <div className="flex items-center gap-2">
                                             <div className="w-1.5 h-1.5 rounded-full bg-primary-400"></div>
                                             <span className="font-semibold text-xs text-slate-700 dark:text-slate-200">{c.name}</span>
                                             <span className="text-slate-400 dark:text-slate-500 text-xs">({c.role})</span>
                                          </div>
                                          <button onClick={() => handleRemoveContractor(project.id, idx)} className="text-[10px] uppercase tracking-wider font-semibold text-red-500 hover:text-red-700 focus:outline-none">Törlés</button>
                                       </li>
                                   ))}
                                </ul>
                             ) : (
                                <p className="text-xs text-slate-400 dark:text-slate-500 italic mb-4">Nincs még kivitelező rögzítve.</p>
                             )}
                          </div>
                     </div>
                   ))}
                </div>
             )}
         </div>

         {/* Központosított Dokumentumtár UI */}
         {activeProjects.length > 0 && documents.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
               <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-6 py-4 flex items-center justify-between">
                  <div>
                     <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                        <FileSignature className="w-5 h-5 mr-2 text-primary-500" /> Dokumentumtár
                     </h3>
                     <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Az ügyfélhez generált és feltöltött összes fájl kezelése.
                     </p>
                  </div>
               </div>
               
               <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                     <thead className="bg-slate-50 dark:bg-slate-900/80">
                        <tr>
                           <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Megnevezés / Típus</th>
                           <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Projekt</th>
                           <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Feltöltve</th>
                           <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Műveletek</th>
                        </tr>
                     </thead>
                     <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                        {documents.map(doc => {
                           const projectMatch = activeProjects.find(p => p.id === doc.project_id);
                           const projectName = projectMatch ? (projectMatch.notes || `[#${projectMatch.id.substring(0,8)}]`) : 'Projekt';
                           const friendlyName = doc.doc_type.replace('_', ' ');

                           return (
                              <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                 <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                       <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center mr-3 border border-primary-100 dark:border-primary-800/50">
                                          <FileSignature className="w-4 h-4" />
                                       </div>
                                       <div>
                                          <div className="font-medium text-slate-900 dark:text-slate-100 capitalize">{friendlyName}</div>
                                          <div className="text-xs text-slate-500 dark:text-slate-400">PDF Dokumentum</div>
                                       </div>
                                    </div>
                                 </td>
                                 <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-slate-600 dark:text-slate-300">{projectName}</div>
                                 </td>
                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                    {new Date(doc.created_at).toLocaleDateString('hu-HU')}
                                 </td>
                                 <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-3">
                                       <button 
                                          onClick={() => handleDownload(doc.storage_path, `${friendlyName}.pdf`)}
                                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors tooltip flex items-center"
                                          title="Fájl letöltése"
                                       >
                                          <Download className="w-4 h-4" />
                                       </button>
                                       <button 
                                          onClick={() => handleDeleteDocument(doc.id, doc.storage_path)}
                                          className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors tooltip flex items-center"
                                          title="Törlés a szerverről"
                                       >
                                          <Trash2 className="w-4 h-4" />
                                       </button>
                                    </div>
                                 </td>
                              </tr>
                           )
                        })}
                     </tbody>
                  </table>
               </div>
            </div>
         )}
         {/* File feltöltés Box */}
         <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl shadow-inner border border-slate-200 dark:border-slate-700 p-8 flex flex-col items-center justify-center text-center transition-colors">
             <UploadCloud className="w-12 h-12 text-slate-400 dark:text-slate-500 mb-4" />
             <h3 className="text-slate-900 dark:text-white font-medium mb-1">Feltöltés a Supabase Storage-ba</h3>
             <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-[250px]">
                 Töltsd fel az energetikai HET igazolásokat vagy egyéb mellékleteket
             </p>
             
             {id !== 'new' && activeProjects.length > 0 ? (
               <div className="w-full max-w-sm flex flex-col gap-3 text-left mb-6">
                 <div>
                   <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Cél projekt</label>
                   <select 
                     value={uploadProjectId}
                     onChange={e => setUploadProjectId(e.target.value)}
                     className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 py-2 px-3 text-sm focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm transition-all"
                   >
                     {activeProjects.map(p => (
                       <option value={p.id} key={p.id}>{p.notes || `Projekt #${p.id.substring(0,8)}`}</option>
                     ))}
                   </select>
                 </div>
                 <div>
                   <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Dokumentum típusa</label>
                   <select 
                     value={uploadDocType}
                     onChange={e => setUploadDocType(e.target.value)}
                     className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 py-2 px-3 text-sm focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm transition-all"
                   >
                      <option value="het_start">HET alapállapot</option>
                      <option value="het_planned">HET tervezett állapot</option>
                      <option value="het_final">HET megvalósult állapot</option>
                      <option value="árajánlat">Árajánlat / Költségvetés</option>
                      <option value="nyilatkozat">Adatvédelmi Nyilatkozat</option>
                      <option value="meghatalmazás">Meghatalmazás</option>
                      <option value="osszefoglalo">Összefoglaló Nyilatkozat</option>
                      <option value="horizontalis">Horizontális Követelmények</option>
                      <option value="hiánypótlás">Hiánypótlás</option>
                   </select>
                 </div>
               </div>
             ) : (
                <div className="text-xs text-amber-600 dark:text-amber-400 mb-4 font-medium px-4 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  Feltöltéshez mentsd el az ügyfelet és hozz létre legalább egy projektet!
                </div>
             )}
             
             <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
             
             <button 
                 onClick={() => fileInputRef.current?.click()}
                 disabled={isUploading || id === 'new' || activeProjects.length === 0}
                 className="rounded-xl flex items-center bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
             >
                 {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-primary-500" /> : null}
                 {isUploading ? 'Feltöltés...' : 'Fájlok kiválasztása'}
             </button>
         </div>
      </div>
      
      {/* Új Projekt Modal */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Új Projekt Indítása</h3>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Projekt Megnevezése</label>
              <input 
                type="text" 
                value={newProjectName} 
                onChange={(e) => setNewProjectName(e.target.value)} 
                placeholder="Pl: Napelem és hőszivattyú telepítés"
                className="block w-full rounded-xl border-0 py-2.5 px-4 text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 focus:ring-2 focus:ring-primary-500 transition-all font-medium"
                autoFocus
              />
            </div>
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button 
                onClick={() => setIsProjectModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
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

      {/* PDF Generáló Modal */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Automatikus Iratgenerálás</h3>
            </div>
            
            {activeProjects.length === 0 ? (
               <div className="p-6 text-center text-amber-600 dark:text-amber-400 text-sm font-medium">
                  Az iratok generálásához az ügyfélnek legalább egy felvitt projekttel kell rendelkeznie. Kérlek előbb hozz létre egy projektet!
               </div>
            ) : (
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Cél projekt</label>
                    <select 
                        value={pdfProjectId}
                        onChange={(e) => setPdfProjectId(e.target.value)}
                        className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 py-2.5 px-3 text-sm focus:ring-primary-500 focus:border-primary-500 shadow-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                        {activeProjects.map(p => (
                          <option value={p.id} key={p.id}>{p.notes || `Projekt #${p.id.substring(0,8)}`}</option>
                        ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Irat Típusa</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                        <label className={clsx(
                            "relative flex cursor-pointer rounded-xl border p-4 shadow-sm focus:outline-none transition-all",
                            pdfType === 'nyilatkozat' ? "bg-primary-50 dark:bg-primary-900/30 border-primary-500 ring-1 ring-primary-500" : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
                        )}>
                            <input type="radio" value="nyilatkozat" checked={pdfType === 'nyilatkozat'} onChange={(e) => setPdfType(e.target.value as any)} className="sr-only" />
                            <span className="flex flex-1">
                               <span className="flex flex-col">
                                  <span className="block text-sm font-medium text-slate-900 dark:text-white">Adatkezelési Nyilatkozat</span>
                                  <span className="mt-1 flex items-center text-xs text-slate-500 dark:text-slate-400">GDPR és hitelügyintézési hozzájárulás.</span>
                               </span>
                            </span>
                            <CheckCircle2 className={clsx("h-5 w-5", pdfType === 'nyilatkozat' ? "text-primary-600 dark:text-primary-400" : "text-transparent")} />
                        </label>

                        <label className={clsx(
                            "relative flex cursor-pointer rounded-xl border p-4 shadow-sm focus:outline-none transition-all",
                            pdfType === 'meghatalmazás' ? "bg-primary-50 dark:bg-primary-900/30 border-primary-500 ring-1 ring-primary-500" : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
                        )}>
                            <input type="radio" value="meghatalmazás" checked={pdfType === 'meghatalmazás'} onChange={(e) => setPdfType(e.target.value as any)} className="sr-only" />
                            <span className="flex flex-1">
                               <span className="flex flex-col">
                                  <span className="block text-sm font-medium text-slate-900 dark:text-white">Meghatalmazás (4 pld.)</span>
                                  <span className="mt-1 flex items-center text-xs text-slate-500 dark:text-slate-400">Teljeskörű megbízás és képviselet (4 oldal).</span>
                               </span>
                            </span>
                            <CheckCircle2 className={clsx("h-5 w-5", pdfType === 'meghatalmazás' ? "text-primary-600 dark:text-primary-400" : "text-transparent")} />
                        </label>

                        <label className={clsx(
                            "relative flex cursor-pointer rounded-xl border p-4 shadow-sm focus:outline-none transition-all",
                            pdfType === 'osszefoglalo' ? "bg-primary-50 dark:bg-primary-900/30 border-primary-500 ring-1 ring-primary-500" : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
                        )}>
                            <input type="radio" value="osszefoglalo" checked={pdfType === 'osszefoglalo'} onChange={(e) => setPdfType(e.target.value as any)} className="sr-only" />
                            <span className="flex flex-1">
                               <span className="flex flex-col">
                                  <span className="block text-sm font-medium text-slate-900 dark:text-white">Összefoglaló Nyilatkozat</span>
                                  <span className="mt-1 flex items-center text-xs text-slate-500 dark:text-slate-400">Szerződött beruházások listázása a Klienssel.</span>
                               </span>
                            </span>
                            <CheckCircle2 className={clsx("h-5 w-5", pdfType === 'osszefoglalo' ? "text-primary-600 dark:text-primary-400" : "text-transparent")} />
                        </label>

                        <label className={clsx(
                            "relative flex cursor-pointer rounded-xl border p-4 shadow-sm focus:outline-none transition-all",
                            pdfType === 'horizontalis' ? "bg-primary-50 dark:bg-primary-900/30 border-primary-500 ring-1 ring-primary-500" : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
                        )}>
                            <input type="radio" value="horizontalis" checked={pdfType === 'horizontalis'} onChange={(e) => setPdfType(e.target.value as any)} className="sr-only" />
                            <span className="flex flex-1">
                               <span className="flex flex-col">
                                  <span className="block text-sm font-medium text-slate-900 dark:text-white">Horizontális Követelmények</span>
                                  <span className="mt-1 flex items-center text-xs text-slate-500 dark:text-slate-400">Pipa lista a műszaki ellenőr számára.</span>
                               </span>
                            </span>
                            <CheckCircle2 className={clsx("h-5 w-5", pdfType === 'horizontalis' ? "text-primary-600 dark:text-primary-400" : "text-transparent")} />
                        </label>

                        <label className={clsx(
                            "relative flex cursor-pointer rounded-xl border p-4 shadow-sm focus:outline-none transition-all",
                            pdfType === 'tulajdonosi_nyilatkozat' ? "bg-primary-50 dark:bg-primary-900/30 border-primary-500 ring-1 ring-primary-500" : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
                        )}>
                            <input type="radio" value="tulajdonosi_nyilatkozat" checked={pdfType === 'tulajdonosi_nyilatkozat'} onChange={(e) => setPdfType(e.target.value as any)} className="sr-only" />
                            <span className="flex flex-1">
                               <span className="flex flex-col">
                                  <span className="block text-sm font-medium text-slate-900 dark:text-white">Tulajdonosi Nyilatkozat</span>
                                  <span className="mt-1 flex items-center text-xs text-slate-500 dark:text-slate-400">Tulajdoni arányok feltüntetése.</span>
                               </span>
                            </span>
                            <CheckCircle2 className={clsx("h-5 w-5", pdfType === 'tulajdonosi_nyilatkozat' ? "text-primary-600 dark:text-primary-400" : "text-transparent")} />
                        </label>

                        <label className={clsx(
                            "relative flex cursor-pointer rounded-xl border p-4 shadow-sm focus:outline-none transition-all",
                            pdfType === 'tulajdonosi_hozzajarulas' ? "bg-primary-50 dark:bg-primary-900/30 border-primary-500 ring-1 ring-primary-500" : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
                        )}>
                            <input type="radio" value="tulajdonosi_hozzajarulas" checked={pdfType === 'tulajdonosi_hozzajarulas'} onChange={(e) => setPdfType(e.target.value as any)} className="sr-only" />
                            <span className="flex flex-1">
                               <span className="flex flex-col">
                                  <span className="block text-sm font-medium text-slate-900 dark:text-white">Tulajdonosi Hozzájárulás</span>
                                  <span className="mt-1 flex items-center text-xs text-slate-500 dark:text-slate-400">A projektbe történő beleegyezés és aláírás.</span>
                               </span>
                            </span>
                            <CheckCircle2 className={clsx("h-5 w-5", pdfType === 'tulajdonosi_hozzajarulas' ? "text-primary-600 dark:text-primary-400" : "text-transparent")} />
                        </label>

                        <label className={clsx(
                            "relative flex cursor-pointer rounded-xl border p-4 shadow-sm focus:outline-none transition-all",
                            pdfType === 'pep_nyilatkozat' ? "bg-primary-50 dark:bg-primary-900/30 border-primary-500 ring-1 ring-primary-500" : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
                        )}>
                            <input type="radio" value="pep_nyilatkozat" checked={pdfType === 'pep_nyilatkozat'} onChange={(e) => setPdfType(e.target.value as any)} className="sr-only" />
                            <span className="flex flex-1">
                               <span className="flex flex-col">
                                  <span className="block text-sm font-medium text-slate-900 dark:text-white">Kiemelt Közszereplői</span>
                                  <span className="mt-1 flex items-center text-xs text-slate-500 dark:text-slate-400">PEP státusz megállapítása.</span>
                               </span>
                            </span>
                            <CheckCircle2 className={clsx("h-5 w-5", pdfType === 'pep_nyilatkozat' ? "text-primary-600 dark:text-primary-400" : "text-transparent")} />
                        </label>

                        <label className={clsx(
                            "relative flex cursor-pointer rounded-xl border p-4 shadow-sm focus:outline-none transition-all",
                            pdfType === 'khr_nyilatkozat' ? "bg-primary-50 dark:bg-primary-900/30 border-primary-500 ring-1 ring-primary-500" : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
                        )}>
                            <input type="radio" value="khr_nyilatkozat" checked={pdfType === 'khr_nyilatkozat'} onChange={(e) => setPdfType(e.target.value as any)} className="sr-only" />
                            <span className="flex flex-1">
                               <span className="flex flex-col">
                                  <span className="block text-sm font-medium text-slate-900 dark:text-white">Meglévő Hitelek (KHR)</span>
                                  <span className="mt-1 flex items-center text-xs text-slate-500 dark:text-slate-400">Fennálló banki tartozások deklarálása.</span>
                               </span>
                            </span>
                            <CheckCircle2 className={clsx("h-5 w-5", pdfType === 'khr_nyilatkozat' ? "text-primary-600 dark:text-primary-400" : "text-transparent")} />
                        </label>
                    </div>
                  </div>
                </div>
            )}

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setIsPdfModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl shadow-sm hover:bg-slate-50 transition-colors"
              >
                Mégse
              </button>
              <button 
                onClick={handleGeneratePdf}
                disabled={activeProjects.length === 0 || isGeneratingPdf}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl shadow-sm hover:bg-primary-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingPdf && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Irat Letöltése & Mentése
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kivitelező Hozzáadása Modal */}
      {isContractorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
               <h3 className="text-lg font-semibold text-slate-900">Új Kivitelező Felvitele</h3>
            </div>
            <div className="p-6 space-y-4">
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cégnév / Személy neve</label>
                  <input
                     type="text"
                     value={newContractorName}
                     onChange={e => setNewContractorName(e.target.value)}
                     className="block w-full rounded-xl border border-slate-300 py-2.5 px-3 text-sm focus:ring-primary-500 focus:border-primary-500 shadow-sm outline-none"
                     placeholder="Pl. Solar Expert Kft."
                     autoFocus
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Munkakör / Kategória</label>
                  <select
                     value={newContractorRole}
                     onChange={e => setNewContractorRole(e.target.value)}
                     className="block w-full rounded-xl border border-slate-300 py-2.5 px-3 text-sm focus:ring-primary-500 focus:border-primary-500 shadow-sm bg-white outline-none"
                  >
                     <option value="Napelem telepítő">Napelem telepítő</option>
                     <option value="Hőszivattyús szakember">Hőszivattyús szakember</option>
                     <option value="Villanyszerelő">Villanyszerelő</option>
                     <option value="Szigetelő mester">Szigetelő mester</option>
                     <option value="Egyéb szaki">Egyéb szakember</option>
                  </select>
               </div>
               <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg flex items-start mt-2">
                  <Briefcase className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Extra kivitelezők beállítása esetén a rendszer a "Beadás" fázisnál extra +20.000 Ft tételeket ad a Számlázandó összegekhez!</span>
               </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setIsContractorModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl shadow-sm hover:bg-slate-50 transition-colors"
              >
                Mégse
              </button>
              <button 
                onClick={handleAddContractor}
                disabled={!newContractorName.trim() || isAddingContractor}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl shadow-sm hover:bg-primary-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAddingContractor && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Rögzítés
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Beruházási Elemek Modal */}
      {isInvestmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
               <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Beruházási Elemek Kezelése</h3>
               <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Ezek az adatok fognak megjelenni a generált 'Horizontális Követelmények' és az 'Összefoglaló Nyilatkozat' pdf dokumentumokon.</p>
            </div>
            
            <div className="p-6 space-y-4">
              {INVESTMENT_OPTIONS.map((option) => (
                 <label 
                    key={option.id}
                    className={clsx(
                       "relative flex cursor-pointer rounded-xl border p-4 shadow-sm focus:outline-none transition-all items-center",
                       currentInvestmentItems.includes(option.id) 
                          ? "bg-primary-50 dark:bg-primary-900/20 border-primary-500 ring-1 ring-primary-500" 
                          : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                    )}
                 >
                    <input 
                       type="checkbox" 
                       className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 mr-4"
                       checked={currentInvestmentItems.includes(option.id)}
                       onChange={() => toggleInvestmentItem(option.id)}
                    />
                    <span className="flex-1 font-medium text-slate-900 dark:text-slate-200">{option.label}</span>
                 </label>
              ))}
              
              <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 flex items-start">
                 <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mr-3 flex-shrink-0 mt-0.5" />
                 <p className="text-xs text-amber-800 dark:text-amber-300">
                    A Napelemes rendszer feltételhez kötött engedélyezése: A fenti kapcsolóval rögzíthető az elem az adatbázisban, ha a jövőbeli pályázati kiírás lehetővé teszi!
                 </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button 
                onClick={() => setIsInvestmentModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Mégse
              </button>
              <button 
                onClick={handleSaveInvestments}
                disabled={isSavingInvestments}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl shadow-sm hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {isSavingInvestments && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Elemek Mentése
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
