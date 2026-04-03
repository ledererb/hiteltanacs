import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, ListTodo, Settings, Users, LogOut, Loader2, Banknote } from 'lucide-react';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
      }
      setIsInitializing(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Ügyfelek', href: '/clients', icon: Users },
    { name: 'Kanban', href: '/kanban', icon: ListTodo },
    { name: 'Pénzügyek', href: '/billing', icon: Banknote },
    { name: 'Beállítások', href: '/settings', icon: Settings },
  ];

  if (isInitializing) {
    return (
       <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center transition-colors">
           <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
       </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white flex flex-col pt-8 pb-4">
        <div className="px-6 pb-8">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-primary-200">
            EnergiApp CRM
          </h1>
          <p className="text-slate-400 text-sm mt-1">Pályázatkezelő</p>
        </div>
        
        <nav className="flex-1 space-y-1 px-4">
          {navigation.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={clsx(
                  isActive ? 'bg-primary-900 text-primary-300' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                  'group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200'
                )}
              >
                <Icon
                  className={clsx(
                    isActive ? 'text-primary-400' : 'text-slate-400 group-hover:text-white',
                    'mr-3 flex-shrink-0 h-5 w-5 transition-colors'
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="px-4 mt-auto">
          <button onClick={handleLogout} className="flex items-center w-full px-4 py-3 text-sm font-medium text-slate-300 rounded-xl hover:bg-slate-800 hover:text-white transition-all">
            <LogOut className="mr-3 flex-shrink-0 h-5 w-5 text-slate-400 group-hover:text-white" />
            Kilépés
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 py-4 z-10 sticky top-0 transition-colors">
          <div className="flex items-center space-x-4">
               {/* Contextual search or breadcrumbs could go here */}
               <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight transition-colors">
                {navigation.find(x => location.pathname.includes(x.href))?.name || 'EnergiApp'}
               </h2>
          </div>
          <div className="flex items-center space-x-4">
             <div className="h-9 w-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold border border-primary-200">
               TA
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 relative">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
