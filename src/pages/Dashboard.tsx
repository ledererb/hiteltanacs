import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState({
    totalClients: 0,
    activeProjects: 0,
    pendingBilling: 0
  });
  
  const [projectDistribution, setProjectDistribution] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) return;
        
        const { data, error } = await supabase
          .from('clients')
          .select('id, name, created_at, projects(id, status)');
          
        if (error) throw error;
        
        const mappedClients = data.map((client: any) => ({
          status: client.projects && client.projects.length > 0 ? client.projects[0].status : 'nincs feltöltve',
          projectCount: client.projects ? client.projects.length : 0,
        }));

        // További statisztikák lekérése a Billing táblából
        const { data: billingData } = await supabase
          .from('billing_events')
          .select('amount_huf, sent_to_billing, event_type');

        const pendingBilling = (billingData || []).filter(e => !e.sent_to_billing).reduce((acc, curr) => acc + curr.amount_huf, 0);
        const totalProjects = mappedClients.reduce((acc, curr) => acc + curr.projectCount, 0);

        // Chart adatok előállítása
        const statusCounts = mappedClients.reduce((acc: any, client: any) => {
           if (client.status === 'nincs feltöltve') return acc;
           acc[client.status] = (acc[client.status] || 0) + 1;
           return acc;
        }, {});
        
        const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
        const distributionData = Object.entries(statusCounts).map(([name, value], index) => ({ 
           name: name.charAt(0).toUpperCase() + name.slice(1), 
           value,
           color: COLORS[index % COLORS.length]
        }));

        const revenueByEvent = (billingData || []).reduce((acc: any, curr: any) => {
           const typeStr = curr.event_type.charAt(0).toUpperCase() + curr.event_type.slice(1);
           if (!acc[typeStr]) acc[typeStr] = { name: typeStr, Fuggoben: 0, Kiszamlazott: 0 };
           if (curr.sent_to_billing) acc[typeStr].Kiszamlazott += curr.amount_huf;
           else acc[typeStr].Fuggoben += curr.amount_huf;
           return acc;
        }, {});
        
        setProjectDistribution(distributionData);
        setRevenueData(Object.values(revenueByEvent));

        setDashboardStats({
          totalClients: mappedClients.length,
          activeProjects: totalProjects,
          pendingBilling
        });
      } catch (error) {
        console.error('Hiba a dashboard adatok lekérdezésekor:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">Vezetői Műszerfal</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 transition-colors">Áttekintés a statisztikákról és pénzügyekről.</p>
        </div>
      </div>

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Kiszámlázható Kintlévőség</p>
              <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300">
                 {new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(dashboardStats.pendingBilling)}
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Automatikusan számítva a projekt státuszokból</p>
           </div>
           
           <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Aktív Projektek Száma</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
                 {dashboardStats.activeProjects} <span className="text-lg font-medium text-slate-400 dark:text-slate-500">db</span>
              </h3>
              <p className="text-xs text-blue-500 dark:text-blue-400 font-medium mt-2 flex items-center">
                 Jelenleg futó energetikai munkák
              </p>
           </div>

           <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Rögzített Ügyfelek</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
                 {dashboardStats.totalClients} <span className="text-lg font-medium text-slate-400 dark:text-slate-500">fő</span>
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">A teljes portfólió ügyféllistája</p>
           </div>
        </div>
      )}

      {/* --- Statisztikai Interaktív Grafikonok --- */}
      {!loading && (projectDistribution.length > 0 || revenueData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Projekt Állapotok Tölcsére</h3>
              <div className="h-64">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                       <Pie data={projectDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {projectDistribution.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                       </Pie>
                       <Tooltip formatter={(value) => [`${value} db`, "Projektek"]} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                       <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                 </ResponsiveContainer>
              </div>
           </div>

           <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Számlázási Kimutatások Tömbönként</h3>
              <div className="h-64">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                       <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${value / 1000}e Ft`} tick={{fill: '#64748b', fontSize: 12}} />
                       <Tooltip formatter={(value) => [new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(value as number), 'Összeg']} cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', color: 'black'}} />
                       <Legend verticalAlign="top" height={36} wrapperStyle={{paddingBottom: '20px'}} />
                       <Bar dataKey="Fuggoben" name="Kiszámlázható Kintlévőség" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} stackId="a" />
                       <Bar dataKey="Kiszamlazott" name="Kiszámlázva" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={40} stackId="a" />
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
