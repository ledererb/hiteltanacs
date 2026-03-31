import { useState } from 'react';
import { Plus, Search, Filter, MoreVertical, FileDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  
  // Mock adatok MVPhöz
  const clients = [
    { id: '1', name: 'Kovács János', co_debtor: 'Kovácsné Szabó Éva', status: 'előkészítés', projectCount: 1, created: '2026-03-20' },
    { id: '2', name: 'Nagy Kft.', co_debtor: '-', status: 'beadás', projectCount: 2, created: '2026-03-25' },
    { id: '3', name: 'Tóth István', co_debtor: '-', status: 'folyósítás', projectCount: 1, created: '2026-03-28' }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'előkészítés': return <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">Előkészítés</span>;
      case 'beadás': return <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">Beadás</span>;
      case 'folyósítás': return <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Folyósítás</span>;
      default: return <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ügyfelek & Projektek</h1>
          <p className="text-sm text-slate-500 mt-1">Összes aktív pályázatod és ügyfeled egy helyen.</p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition-all">
            <Filter className="w-4 h-4 mr-2" />
            Szűrés
          </button>
          <button 
            onClick={() => navigate('/clients/new')}
            className="inline-flex items-center justify-center rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-500/20 hover:bg-primary-600 hover:-translate-y-0.5 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Új Ügyfél
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="border-b border-slate-200 bg-slate-50/50 p-4 shrink-0 flex items-center justify-between">
            <div className="relative w-full max-w-sm">
               <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                 <Search className="h-4 w-4 text-slate-400" />
               </div>
               <input
                 type="text"
                 className="block w-full rounded-lg border-0 py-2 pl-10 pr-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6 transition-all"
                 placeholder="Keresés név vagy azonosító alapján..."
               />
            </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="bg-slate-50">
                <th scope="col" className="py-3.5 pl-6 pr-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ügyfél neve</th>
                <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Adóstárs</th>
                <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Projekt Státusz</th>
                <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Dátum</th>
                <th scope="col" className="relative py-3.5 pl-3 pr-6 sm:pr-6"><span className="sr-only">Műveletek</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50/70 transition-colors cursor-pointer" onClick={() => navigate(`/clients/${client.id}`)}>
                  <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm">
                    <div className="font-medium text-slate-900">{client.name}</div>
                    <div className="text-slate-500 text-xs mt-0.5">{client.projectCount} aktív projekt</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{client.co_debtor}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">{getStatusBadge(client.status)}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{client.created}</td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                       <button className="text-slate-400 hover:text-primary-600 transition-colors" title="Iratok generálása">
                          <FileDown className="w-4 h-4" />
                       </button>
                       <button className="text-slate-400 hover:text-slate-900 transition-colors">
                          <MoreVertical className="w-4 h-4" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
