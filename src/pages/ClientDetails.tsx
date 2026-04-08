import { useParams, useNavigate } from 'react-router-dom';
import { UserCircle, Briefcase, FileSignature, Save, UploadCloud, Loader2, AlertCircle, CheckCircle2, Plus, Trash2, Download, FileSpreadsheet } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import clsx from 'clsx';
import { generateProjectDocuments, generateDebugPdf } from '../services/pdfService';
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
// Removed excelService import


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
  
  const [documents, setDocuments] = useState<any[]>([]);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const [activeReplaceDoc, setActiveReplaceDoc] = useState<any>(null);

  // PDF Generálás Modal States
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProjectId, setPdfProjectId] = useState('');
  const [pdfType, setPdfType] = useState<
    'nyilatkozat' | 'meghatalmazás' | 'osszefoglalo' | 'horizontalis' | 
    'tulajdonosi_nyilatkozat' | 'tulajdonosi_hozzajarulas' | 'pep_nyilatkozat' | 'khr_nyilatkozat' | 'meghatalmazás_mfb_ados' | 'meghatalmazás_mfb_adostars' | 'debug_pdf_mfb'
  >('nyilatkozat');

  // Dokumentum Feltöltés Modal States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadDocType, setUploadDocType] = useState('Kérelem HET');
  const [uploadFile, setUploadFile] = useState<File | null>(null);



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
      birth_name: '',
      birth_place: '',
      birth_date: '',
      mothers_name: '',
      tax_id: ''
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
              birth_name: client.birth_name || '',
              birth_place: client.birth_place || '',
              birth_date: client.birth_date || '',
              mothers_name: client.mothers_name || '',
              tax_id: client.tax_id || ''
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
                 setPdfProjectId(projects[0].id);
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
      reset({ name: '', co_debtor: '', income: '', email: '', birth_name: '', birth_place: '', birth_date: '', mothers_name: '', tax_id: '' });
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
        birth_name: data.birth_name,
        birth_place: data.birth_place,
        birth_date: data.birth_date,
        mothers_name: data.mothers_name,
        tax_id: data.tax_id,
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
      } else if (pdfType === 'meghatalmazás_mfb_ados' || pdfType === 'meghatalmazás_mfb_adostars') {
        const applicantType = pdfType === 'meghatalmazás_mfb_ados' ? 'ados' : 'adostars';
        const result = await generateProjectDocuments(pdfProjectId, applicantType);
        if (!result.blob) throw new Error("Hiba a hivatalos MFB pdf generálásakor.");
        pdfBlob = result.blob;
      } else if (pdfType === 'debug_pdf_mfb') {
        const result = await generateDebugPdf('ML104U-Megbizott-penzugyi-tanacsado-meghatalmazasa_KEHOP.pdf');
        if (!result.blob) throw new Error("Hiba a debug PDF generálásakor.");
        pdfBlob = result.blob;
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
      else if (pdfType === 'meghatalmazás_mfb_ados') typeLabel = 'MFB_Hivatalos_Meghatalmazas_Ados';
      else if (pdfType === 'meghatalmazás_mfb_adostars') typeLabel = 'MFB_Hivatalos_Meghatalmazas_Adostars';
      else if (pdfType === 'debug_pdf_mfb') typeLabel = 'DEBUG_PDF_Meghatalmazas';

      const timestamp = new Date().getTime();
      const fileName = `${typeLabel}_${safeName}_${timestamp}.pdf`;

      // Csak letöltjük a gépünkre, NINCS Supabase Storage feltöltés
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(link);

      // Lokális, még nem feltöltött állapotú "Ghost" rekord hozzáadása a táblázathoz
      const ghostDoc = {
        id: `local_${Date.now()}`,
        project_id: pdfProjectId,
        doc_type: pdfType,
        storage_path: '',
        created_at: new Date().toISOString(),
        isLocal: true
      };
      setDocuments(prev => [ghostDoc, ...prev]);

      setIsPdfModalOpen(false);
      
    } catch (err: any) {
      console.error("Hiba az irat generálásakor:", err);
      alert("Hiba történt az irat generálásakor: " + err.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleUploadDocument = async () => {
    if (!id || id === 'new') return;
    if (!pdfProjectId) {
      alert("Nincs kiválasztott projekt! Kérlek előbb indíts egyet.");
      return;
    }
    if (!uploadFile) {
      alert("Kérlek válassz ki egy feltöltendő fájlt!");
      return;
    }
    
    setIsUploadingDoc(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Nincs aktív bejelentkezés");

      const fileExt = uploadFile.name.split('.').pop() || 'pdf';
      let fileTypeLabel = 'Dokumentum';
      if (uploadDocType === 'Kérelem HET') fileTypeLabel = 'Kerelem_HET';
      if (uploadDocType === 'Záró HET') fileTypeLabel = 'Zaro_HET';
      if (uploadDocType === 'Hiánypótlás') fileTypeLabel = 'Hianypotlas';
      if (uploadDocType === 'Árajánlat') fileTypeLabel = 'Arajanlat';

      const fileName = `${pdfProjectId}_${fileTypeLabel}_${Date.now()}.${fileExt}`;
      const newStoragePath = `${sessionData.session.user.id}/${pdfProjectId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(newStoragePath, uploadFile);
      if (uploadError) throw uploadError;

      const { data: insertedDoc, error: insertError } = await supabase
        .from('documents')
        .insert([{
          project_id: pdfProjectId,
          doc_type: uploadDocType,
          storage_path: newStoragePath,
          uploaded_by: sessionData.session.user.id
        }])
        .select()
        .single();
      if (insertError) throw insertError;
      
      if (insertedDoc) {
          setDocuments(prev => [insertedDoc, ...prev]);
      }
      
      setIsUploadModalOpen(false);
      setUploadFile(null);
    } catch (err: any) {
      console.error("Hiba a feltöltéskor:", err);
      alert("Hiba: " + err.message);
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleReplaceDocumentClick = (doc: any) => {
    if (window.confirm('Kijelented és igazolod, hogy a dokumentum fizikailag vagy digitálisan hitelesítve (aláírva) van a kérelmező(k) által?\n\nCsak ALÁÍRT fájl tölthető fel!')) {
       setActiveReplaceDoc(doc);
       if (replaceFileInputRef.current) replaceFileInputRef.current.click();
    }
  };

  const handleReplaceFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeReplaceDoc) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Nincs aktív bejelentkezés");

      const fileExt = file.name.split('.').pop();
      const fileName = `signed_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const newStoragePath = `${sessionData.session.user.id}/${activeReplaceDoc.project_id}/${fileName}`;

      // Upload new file
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(newStoragePath, file);
      if (uploadError) throw uploadError;

      if (activeReplaceDoc.isLocal) {
         // Insert brand new to Supabase since it's just a local UI placeholder
         const { data: insertedDoc, error: insertError } = await supabase
           .from('documents')
           .insert([{
             project_id: activeReplaceDoc.project_id,
             doc_type: activeReplaceDoc.doc_type,
             storage_path: newStoragePath,
             uploaded_by: sessionData.session.user.id
           }])
           .select()
           .single();
         if (insertError) throw insertError;
         
         if (insertedDoc) {
             setDocuments(prev => prev.map(d => d.id === activeReplaceDoc.id ? insertedDoc : d));
             alert('Sikeresen létrejött és felkerült a szerverre!');
         }
      } else {
         // Update DB record
         const { data: updatedDoc, error: updateError } = await supabase
           .from('documents')
           .update({ storage_path: newStoragePath, updated_at: new Date().toISOString() })
           .eq('id', activeReplaceDoc.id)
           .select()
           .single();
         if (updateError) throw updateError;

         // Remove old file from storage (optional, for cleanup)
         if (activeReplaceDoc.storage_path) {
            supabase.storage.from('documents').remove([activeReplaceDoc.storage_path]).catch(console.error);
         }

         if (updatedDoc) {
           setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
           alert('Sikeresen kicserélve az aláírt változatra!');
         }
      }
    } catch (err: any) {
      console.error("Hiba fájlcsere során:", err);
      alert("Hiba: " + err.message);
    } finally {
      setActiveReplaceDoc(null);
      if (replaceFileInputRef.current) replaceFileInputRef.current.value = '';
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
               onClick={() => setIsUploadModalOpen(true)}
               disabled={id === 'new'}
               className="inline-flex items-center justify-center rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm ring-1 ring-inset ring-emerald-600/20 hover:bg-emerald-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
               <UploadCloud className="w-4 h-4 mr-2" />
               Dokumentum Feltöltés
             </button>

             <button 
               type="button"
               onClick={() => {
                 if (!pdfProjectId && activeProjects.length > 0) {
                    setPdfProjectId(activeProjects[0].id);
                 }
                 setIsPdfModalOpen(true);
               }}
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
                <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Születési Név</label>
                   <input {...register('birth_name')} className="block w-full rounded-xl border-0 py-2.5 px-4 text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-all" />
                </div>
                
                <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Anyja Neve</label>
                   <input {...register('mothers_name')} className="block w-full rounded-xl border-0 py-2.5 px-4 text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-all" />
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Születési Hely</label>
                   <input {...register('birth_place')} className="block w-full rounded-xl border-0 py-2.5 px-4 text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-all" />
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Születési Idő</label>
                   <input {...register('birth_date')} type="date" className="block w-full rounded-xl border-0 py-2.5 px-4 text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-all" />
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Adóazonosító Jel</label>
                   <input {...register('tax_id')} className="block w-full rounded-xl border-0 py-2.5 px-4 text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-all" />
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

      <div className="flex flex-col gap-8">
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
                           
                           let friendlyName = doc.doc_type;
                           if (doc.doc_type === 'het_start') friendlyName = 'HET alapállapot';
                           else if (doc.doc_type === 'het_planned') friendlyName = 'HET tervezett állapot';
                           else if (doc.doc_type === 'het_final') friendlyName = 'HET megvalósult állapot';
                           else if (doc.doc_type === 'árajánlat') friendlyName = 'Árajánlat / Költségvetés';
                           else if (doc.doc_type === 'nyilatkozat') friendlyName = 'Adatvédelmi Nyilatkozat';
                           else if (doc.doc_type === 'meghatalmazás') friendlyName = 'Meghatalmazás (Hagyományos)';
                           else if (doc.doc_type === 'osszefoglalo') friendlyName = 'Összefoglaló Nyilatkozat';
                           else if (doc.doc_type === 'horizontalis') friendlyName = 'Horizontális Követelmények';
                           else if (doc.doc_type === 'hiánypótlás') friendlyName = 'Hiánypótlás';
                           else if (doc.doc_type === 'tulajdonosi_nyilatkozat') friendlyName = 'Tulajdonosi Nyilatkozat';
                           else if (doc.doc_type === 'tulajdonosi_hozzajarulas') friendlyName = 'Tulajdonosi Hozzájárulás';
                           else if (doc.doc_type === 'pep_nyilatkozat') friendlyName = 'Közszereplői (PEP) Nyilatkozat';
                           else if (doc.doc_type === 'khr_nyilatkozat') friendlyName = 'KHR Nyilatkozat';
                           else friendlyName = friendlyName.replace('_', ' ');                           return (
                              <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                 <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                       <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center mr-3 border border-primary-100 dark:border-primary-800/50">
                                          <FileSignature className="w-4 h-4" />
                                       </div>
                                       <div>
                                          <div className="font-medium text-slate-900 dark:text-slate-100 capitalize flex items-center">
                                            {friendlyName}
                                            {doc.isLocal && <span className="ml-2 inline-block text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-bold">Aláírásra vár</span>}
                                          </div>
                                          <div className="text-xs text-slate-500 dark:text-slate-400">PDF Dokumentum</div>
                                       </div>
                                    </div>
                                 </td>
                                 <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-slate-600 dark:text-slate-300">{projectName}</div>
                                 </td>
                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                    {doc.isLocal ? '-' : new Date(doc.created_at).toLocaleDateString('hu-HU')}
                                 </td>
                                 <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-3">
                                       {!doc.isLocal && (
                                          <button 
                                             onClick={() => handleDownload(doc.storage_path, `${friendlyName}.pdf`)}
                                             className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors tooltip flex items-center"
                                             title="Fájl letöltése"
                                          >
                                             <Download className="w-4 h-4" />
                                          </button>
                                       )}
                                       <button 
                                          onClick={() => handleReplaceDocumentClick(doc)}
                                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors tooltip flex items-center"
                                          title="Aláírt példány Feltöltése"
                                       >
                                          <UploadCloud className="w-4 h-4" />
                                       </button>
                                       <button 
                                          onClick={() => {
                                             if (doc.isLocal) {
                                                setDocuments(prev => prev.filter(d => d.id !== doc.id));
                                             } else {
                                                handleDeleteDocument(doc.id, doc.storage_path);
                                             }
                                          }}
                                          className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors tooltip flex items-center"
                                          title="Törlés a listából / szerverről"
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
         <input type="file" ref={replaceFileInputRef} className="hidden" onChange={handleReplaceFileChange} accept="application/pdf,image/*" />
      </div>

      {/* Automatikus Iratgenerálás Modal */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
               <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                  <FileSignature className="w-5 h-5 mr-2 text-primary-500" />
                  Automatikus Iratgenerálás
               </h3>
            </div>
            
            <div className="p-6 space-y-5">
               <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-xs p-4 rounded-xl flex items-start leading-relaxed border border-blue-100 dark:border-blue-800/50">
                  <Briefcase className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                  <div>A rendszer a letöltésnél már a <b>mentett adatokat</b> használja. Ha módosítottál űrlap mezőket, <b>először kattints a Mentés gombra</b>! Az iratot ez a modal <b>nem tölti fel a gépről</b>, csak letölti az üres kitöltött változatot aláírásra!</div>
               </div>

               <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Melyik projekthez kapcsolódik az irat?</label>
                  <select
                     value={pdfProjectId}
                     onChange={e => setPdfProjectId(e.target.value)}
                     className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 py-3 px-4 text-sm focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-slate-900 shadow-sm transition-all text-slate-900 dark:text-white"
                  >
                     {activeProjects.length === 0 && <option value="">Nincs mentett projekt!</option>}
                     {activeProjects.map(p => (
                       <option value={p.id} key={p.id}>{p.notes || `Projekt #${p.id.substring(0,8)}`}</option>
                     ))}
                  </select>
               </div>

               <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Generálandó dokumentum típusa</label>
                  <select
                     value={pdfType}
                     onChange={e => setPdfType(e.target.value as any)}
                     className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 py-3 px-4 text-sm focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-slate-900 shadow-sm transition-all text-slate-900 dark:text-white"
                  >
                     <option value="nyilatkozat">Adatvédelmi Nyilatkozat</option>
                     <option value="meghatalmazás">Meghatalmazás</option>
                     <option value="osszefoglalo">Összefoglaló Nyilatkozat</option>
                     <option value="horizontalis">Horizontális Követelmények</option>
                     <option value="tulajdonosi_nyilatkozat">Tulajdonosi Nyilatkozat</option>
                     <option value="tulajdonosi_hozzajarulas">Tulajdonosi Hozzájárulás</option>
                     <option value="pep_nyilatkozat">Közszereplői (PEP) Nyilatkozat</option>
                     <option value="khr_nyilatkozat">KHR Nyilatkozat</option>
                     <option value="meghatalmazás_mfb_ados" className="font-bold text-primary-600">MFB Hivatalos meghatalmazás - adós</option>
                     <option value="meghatalmazás_mfb_adostars" className="font-bold text-primary-600">MFB Hivatalos meghatalmazás - adóstárs</option>
                     <option value="debug_pdf_mfb" className="italic text-slate-500">PDF Sablon Teszt (Debug)</option>
                  </select>
               </div>
            </div>

            <div className="px-6 py-5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 rounded-b-2xl">
              <button 
                onClick={() => setIsPdfModalOpen(false)}
                className="px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700"
              >
                Mégse
              </button>
              <button 
                onClick={handleGeneratePdf}
                disabled={!pdfProjectId || isGeneratingPdf || activeProjects.length === 0}
                className="px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-xl shadow-md shadow-primary-500/20 hover:bg-primary-700 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
              >
                {isGeneratingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSignature className="w-4 h-4 mr-2" />}
                {isGeneratingPdf ? 'Generálás folyamatban...' : 'Generálás és Letöltés'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Dokumentum Feltöltő Modal (HET, Árajánlat, Hiánypótlás) */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
               <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                  <UploadCloud className="w-5 h-5 mr-2 text-emerald-500" />
                  Dokumentum Feltöltése
               </h3>
            </div>
            
            <div className="p-6 space-y-5">
               <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 text-xs p-4 rounded-xl flex items-start leading-relaxed border border-emerald-100 dark:border-emerald-800/50">
                  <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  <div>Ebbe a modulba kizárólag érintetlen, nyers (például AVDH-val kódolt) fájlok tölthetők fel (Storage Upload API). A rendszer garantálja, hogy a feltöltés a fájlok módosítása nélkül történik!</div>
               </div>
               
               <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Melyik projekthez kapcsolódik?</label>
                  <select
                     value={pdfProjectId}
                     onChange={e => setPdfProjectId(e.target.value)}
                     className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 py-3 px-4 text-sm focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-slate-900 shadow-sm transition-all text-slate-900 dark:text-white"
                  >
                     {activeProjects.length === 0 && <option value="">Nincs mentett projekt!</option>}
                     {activeProjects.map(p => (
                       <option value={p.id} key={p.id}>{p.notes || `Projekt #${p.id.substring(0,8)}`}</option>
                     ))}
                  </select>
               </div>

               <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Feltöltés típusa</label>
                  <select
                     value={uploadDocType}
                     onChange={e => setUploadDocType(e.target.value)}
                     className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 py-3 px-4 text-sm focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-slate-900 shadow-sm transition-all text-slate-900 dark:text-white"
                  >
                     <option value="Kérelem HET">HET/ML156U - Kölcsönkérelem benyújtásához (Kezdeti+Tervezett)</option>
                     <option value="Záró HET">HET/ML156U - Záró nyilatkozat</option>
                     <option value="Hiánypótlás">Hiánypótlás (Kódolt PDF / Egyéb)</option>
                     <option value="Árajánlat">Lepecsételt árajánlat</option>
                  </select>
               </div>

               <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Fájl (PDF vagy Excel)</label>
                  <input
                     type="file"
                     accept=".pdf,.xls,.xlsx"
                     onChange={e => setUploadFile(e.target.files?.[0] || null)}
                     className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 py-2.5 px-3 text-sm focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-slate-900 shadow-sm transition-all text-slate-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
               </div>
            </div>

            <div className="px-6 py-5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 rounded-b-2xl">
              <button 
                onClick={() => { setIsUploadModalOpen(false); setUploadFile(null); }}
                className="px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700"
              >
                Mégse
              </button>
              <button 
                onClick={handleUploadDocument}
                disabled={isUploadingDoc || !uploadFile || !pdfProjectId}
                className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-xl shadow-md shadow-emerald-500/20 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
              >
                {isUploadingDoc ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                {isUploadingDoc ? 'Feltöltés folyamatban...' : 'Feltöltés a Dokumentumtárba'}
              </button>
            </div>
          </div>
        </div>
      )}

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
