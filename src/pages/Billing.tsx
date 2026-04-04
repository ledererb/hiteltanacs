import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, AlertCircle, Clock, Banknote } from 'lucide-react';
import clsx from 'clsx';

interface BillingEvent {
  id: string;
  project_id: string;
  event_type: 'indulás' | 'beadás' | 'extra_kivitelező' | 'lehívás';
  amount_huf: number;
  sent_to_billing: boolean;
  sent_at: string | null;
  invoice_number?: string | null;
  created_at: string;
  project: {
    notes: string;
    clients: {
      name: string;
    } | null;
  }
}

export default function Billing() {
  const [events, setEvents] = useState<BillingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'billed'>('pending');
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('billing_events')
        .select(`
          id, event_type, amount_huf, sent_to_billing, sent_at, invoice_number, created_at,
          projects(notes, clients(name))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedData = data.map((item: any) => ({
        ...item,
        project: {
          notes: item.projects?.notes || '',
          clients: {
            name: Array.isArray(item.projects?.clients) ? item.projects.clients[0]?.name : item.projects?.clients?.name
          }
        }
      })) as BillingEvent[];
      
      setEvents(formattedData);
    } catch (err) {
      console.error('Lekérdezési hiba:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleGenerateInvoice = async (eventId: string) => {
    if (generatingId) return;
    try {
      setGeneratingId(eventId);
      
      const { data, error } = await supabase.functions.invoke('generate-invoice', {
        body: { event_id: eventId }
      });

      if (error) {
        console.error('Edge Function hiba:', error);
        alert('Hiba a számla generálásakor: ' + error.message);
        return;
      }

      if (data && data.success) {
        // Optimistic update
        setEvents(prev => prev.map(e => e.id === eventId ? { 
          ...e, 
          sent_to_billing: true, 
          sent_at: new Date().toISOString(),
          invoice_number: data.invoice_number
        } : e));
      } else {
        alert('Ismeretlen hiba: ' + JSON.stringify(data));
      }
    } catch (error: any) {
      console.error(error);
      alert('Hálózati hiba: ' + error.message);
    } finally {
      setGeneratingId(null);
    }
  };

  const filteredEvents = events.filter(e => {
    if (filter === 'pending') return !e.sent_to_billing;
    if (filter === 'billed') return e.sent_to_billing;
    return true;
  });

  const totalOutstanding = events.filter(e => !e.sent_to_billing).reduce((acc, curr) => acc + curr.amount_huf, 0);
  const totalBilled = events.filter(e => e.sent_to_billing).reduce((acc, curr) => acc + curr.amount_huf, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">Pénzügyek</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 transition-colors">Automatikus események és kintlévőségek áttekintése</p>
        </div>
      </div>
      
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center transition-colors">
            <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-xl border border-amber-200 dark:border-amber-800/50 mr-5 transition-colors">
                <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
                 <p className="text-sm font-medium text-slate-500 dark:text-slate-400 transition-colors">Kiszámlázásra vár</p>
                 <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 transition-colors">
                    {new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(totalOutstanding)}
                 </p>
            </div>
         </div>
         <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center transition-colors">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/50 mr-5 transition-colors">
                <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
                 <p className="text-sm font-medium text-slate-500 dark:text-slate-400 transition-colors">Már kiszámlázva (Összesen)</p>
                 <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 transition-colors">
                    {new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(totalBilled)}
                 </p>
            </div>
         </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
         <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 transition-colors">
            <div className="flex space-x-2">
                <button onClick={() => setFilter('pending')} className={clsx("px-4 py-2 text-sm font-semibold rounded-lg transition-all", filter==='pending' ? "bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800")}>
                   Függő tételek
                </button>
                <button onClick={() => setFilter('billed')} className={clsx("px-4 py-2 text-sm font-semibold rounded-lg transition-all", filter==='billed' ? "bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800")}>
                   Rendezve
                </button>
                <button onClick={() => setFilter('all')} className={clsx("px-4 py-2 text-sm font-semibold rounded-lg transition-all", filter==='all' ? "bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800")}>
                   Összes
                </button>
            </div>
         </div>
         
         <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 transition-colors">
               <thead className="bg-white dark:bg-slate-900 transition-colors">
                  <tr>
                     <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ügyfél & Projekt</th>
                     <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Apropó</th>
                     <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Dátum</th>
                     <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Összeg</th>
                     <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Státusz</th>
                  </tr>
               </thead>
               <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
                  {loading ? (
                     <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                            <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                            Adatok betöltése...
                        </td>
                     </tr>
                  ) : filteredEvents.length === 0 ? (
                     <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                            Nincsenek megjeleníthető események.
                        </td>
                     </tr>
                  ) : (
                     filteredEvents.map(event => (
                        <tr key={event.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                           <td className="px-6 py-4">
                               <div className="font-medium text-slate-900 dark:text-slate-100">{event.project.clients?.name || 'Ismeretlen'}</div>
                               <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[200px] truncate">{event.project.notes || 'Nincs projekt megnevezés'}</div>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap">
                               <span className={clsx("inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                                   event.event_type === 'indulás' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 ring-blue-600/20 dark:ring-blue-500/30' : 
                                   event.event_type === 'beadás' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 ring-purple-600/20 dark:ring-purple-500/30' :
                                   'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 ring-emerald-600/20 dark:ring-emerald-500/30'
                               )}>
                                  {event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)}
                               </span>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                               {new Date(event.created_at).toLocaleDateString('hu-HU')}
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-700 dark:text-slate-300">
                               {new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(event.amount_huf)}
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                               <button 
                                   onClick={() => !event.sent_to_billing && handleGenerateInvoice(event.id)}
                                   disabled={generatingId === event.id || event.sent_to_billing}
                                   className={clsx("inline-flex items-center px-3 py-1.5 rounded-lg font-medium text-sm transition-all shadow-sm ring-1 ring-inset",
                                      event.sent_to_billing 
                                          ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 ring-emerald-600/20 dark:ring-emerald-800" 
                                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 ring-slate-300 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white disabled:opacity-50")}
                                >
                                   {generatingId === event.id ? (
                                       <><Clock className="w-4 h-4 mr-1.5 animate-spin" /> Generálás...</>
                                   ) : event.sent_to_billing ? (
                                       <div className="flex flex-col items-end">
                                          <div className="flex items-center"><CheckCircle className="w-4 h-4 mr-1.5" /> Kiszámlázva</div>
                                          {event.invoice_number && <span className="text-xs font-mono opacity-80 mt-0.5">{event.invoice_number}</span>}
                                       </div>
                                   ) : (
                                       <><Banknote className="w-4 h-4 mr-1.5" /> Számla kiállítása</>
                                   )}
                               </button>
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
