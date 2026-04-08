import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Filter, MoreVertical, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Clients() {
  const navigate = useNavigate();
  
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Mind');

  useEffect(() => {
    async function fetchClients() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) return;
        
        const { data, error } = await supabase
          .from('clients')
          .select('id, name, co_debtor_name, created_at, projects(id, status)')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        const mappedClients = data.map((client: any) => ({
          id: client.id,
          name: client.name,
          co_debtor: client.co_debtor_name || '-',
          status: client.projects && client.projects.length > 0 ? client.projects[0].status : 'nincs feltöltve',
          projectCount: client.projects ? client.projects.length : 0,
          created: new Date(client.created_at).toISOString().split('T')[0]
        }));
        
        setClients(mappedClients);
      } catch (error) {
        console.error('Hiba az ügyfelek lekérdezésekor:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchClients();
  }, []);

  const handleDeleteClient = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!window.confirm(`Biztosan törölni szeretnéd az ügyfelet: ${name}?\n\nFigyelem: A művelet a háttérben beállított szabályok szerint az ügyfélhez kapcsolódó adatokat is törölheti. Ezt nem lehet visszavonni.`)) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }
      
      setClients(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      console.error('Hiba törléskor:', err);
      alert('Nem sikerült törölni az ügyfelet. Hiba: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'előkészítés': return <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">Előkészítés</span>;
      case 'beadás': return <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">Beadás</span>;
      case 'folyósítás': return <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Folyósítás</span>;
      default: return <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10 capitalize">{status}</span>;
    }
  };

  const filteredClients = clients.filter(client => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = client.name.toLowerCase().includes(query) || client.co_debtor.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'Mind' || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">Ügyfelek</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 transition-colors">Itt kezelheted az összes rögzített ügyfelet és pályázatot.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/clients/new')}
            className="inline-flex items-center justify-center rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-500/20 hover:bg-primary-600 hover:-translate-y-0.5 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Új Ügyfél
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors">
            <div className="relative w-full max-w-sm">
               <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                 <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
               </div>
               <input
                 type="text"
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
                 className="block w-full rounded-lg border-0 py-2 pl-10 pr-3 text-slate-900 dark:text-slate-100 ring-1 ring-inset ring-slate-300 dark:ring-slate-700 bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6 transition-all shadow-sm"
                 placeholder="Keresés név vagy adóstárs alapján..."
               />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
               <Filter className="h-4 w-4 text-slate-400 dark:text-slate-500 hidden sm:block" />
               <select 
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="block w-full sm:w-auto rounded-lg border border-slate-300 dark:border-slate-700 py-2 pl-3 pr-8 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 ring-0 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6 cursor-pointer shadow-sm outline-none transition-colors"
               >
                  <option value="Mind">Minden Állapot</option>
                  <option value="előkészítés">Előkészítés</option>
                  <option value="beadás">Beadás</option>
                  <option value="hiánypótlás">Hiánypótlás</option>
                  <option value="szerződéskötés">Szerződéskötés</option>
                  <option value="folyósítás">Folyósítás</option>
                  <option value="zárás">Zárás</option>
                  <option value="nincs feltöltve">Dosszié nélküliek</option>
               </select>
            </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 transition-colors">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 transition-colors">
                <th scope="col" className="py-3.5 pl-6 pr-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ügyfél neve</th>
                <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Adóstárs</th>
                <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Projekt Státusz</th>
                <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Dátum</th>
                <th scope="col" className="relative py-3.5 pl-3 pr-6 sm:pr-6"><span className="sr-only">Műveletek</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 transition-colors">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    Adatok betöltése...
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Nincs találat a keresésre.</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Próbálkozz más szűrőfeltétellel vagy névvel.</p>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => navigate(`/clients/${client.id}`)}>
                    <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{client.name}</div>
                      <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{client.projectCount} aktív projekt</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 dark:text-slate-400">{client.co_debtor}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">{getStatusBadge(client.status)}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 dark:text-slate-400">{client.created}</td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3 px-2">
                         <button onClick={(e) => handleDeleteClient(e, client.id, client.name)} className="text-slate-400 hover:text-rose-600 transition-colors p-1" title="Ügyfél törlése">
                            <Trash2 className="w-4 h-4" />
                         </button>
                         <button onClick={(e) => e.stopPropagation()} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1">
                            <MoreVertical className="w-4 h-4" />
                         </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
