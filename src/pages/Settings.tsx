import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, KeyRound, Loader2, CheckCircle2, ShieldCheck, Mail, AlertCircle, Palette, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function Settings() {
  const [userEmail, setUserEmail] = useState<string | undefined>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
       setUserEmail(data.session?.user?.email);
    });
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setStatus('error');
      setErrorMessage('A megadott jelszavak nem egyeznek meg!');
      return;
    }
    if (newPassword.length < 6) {
      setStatus('error');
      setErrorMessage('A jelszónak biztonsági okokból legalább 6 karakter hosszúnak kell lennie.');
      return;
    }

    setLoading(true);
    setStatus('idle');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      setStatus('success');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setStatus('idle'), 5000);
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || 'Sikertelen kommunikáció a Supabase szerverrel.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">Beállítások</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 transition-colors">Felhasználói profil és biztonsági beállítások</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
         <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-6 flex justify-between items-center transition-colors">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full flex justify-center items-center shadow-inner transition-colors">
                  <User className="w-6 h-6" />
               </div>
               <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Fiók Adatai</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Bejelentkezve ezzel a címmel</p>
               </div>
            </div>
            <div className="hidden sm:flex items-center text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/50 shadow-sm transition-colors">
               <ShieldCheck className="w-4 h-4 mr-1.5" /> Hitelesített munkatárs
            </div>
         </div>
         <div className="p-6">
            <div className="flex items-center px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 transition-colors">
               <Mail className="w-5 h-5 text-slate-400 dark:text-slate-500 mr-3" />
               <span className="text-slate-700 dark:text-slate-300 font-medium">{userEmail || 'Betöltés...'}</span>
            </div>
         </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
         <div className="border-b border-slate-200 dark:border-slate-800 p-6 flex items-center gap-3 transition-colors">
            <KeyRound className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Jelszó Módosítása</h3>
         </div>
         
         <div className="p-6">
            {status === 'success' && (
               <div className="mb-6 rounded-xl bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-800/50 flex items-start transition-colors">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mr-3 mt-0.5" />
                  <div>
                     <h3 className="text-sm font-medium text-green-800 dark:text-green-300">Sikeres művelet!</h3>
                     <p className="text-sm text-green-700 dark:text-green-400/80 mt-1">A jelszavad biztonságosan frissült a rendszerben.</p>
                  </div>
               </div>
            )}

            {status === 'error' && (
               <div className="mb-6 rounded-xl bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800/50 flex items-start transition-colors">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-3 mt-0.5" />
                  <div>
                     <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Sikertelen módosítás</h3>
                     <p className="text-sm text-red-700 dark:text-red-400/80 mt-1">{errorMessage}</p>
                  </div>
               </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-sm">
               <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Új Pályázó Jelszó</label>
                  <input 
                     type="password" 
                     value={newPassword}
                     onChange={e => setNewPassword(e.target.value)}
                     className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 py-2.5 px-3 text-sm focus:ring-primary-500 focus:border-primary-500 shadow-sm dark:bg-slate-800 text-slate-900 dark:text-white transition-colors"
                     placeholder="Minimum 6 karakter hosszú"
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Jelszó megerősítése</label>
                  <input 
                     type="password" 
                     value={confirmPassword}
                     onChange={e => setConfirmPassword(e.target.value)}
                     className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 py-2.5 px-3 text-sm focus:ring-primary-500 focus:border-primary-500 shadow-sm dark:bg-slate-800 text-slate-900 dark:text-white transition-colors"
                     placeholder="Gépeld be újra az azonosításhoz"
                  />
               </div>
               <div className="pt-2">
                  <button 
                     type="submit"
                     disabled={loading || !newPassword || !confirmPassword}
                     className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full"
                  >
                     {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                     Módosítás mentése
                  </button>
               </div>
            </form>
         </div>
      </div>
      
      {/* Téma (Kinézet) Beállítások */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
         <div className="border-b border-slate-200 dark:border-slate-800 p-6 flex items-center gap-3 transition-colors">
            <Palette className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Megjelenés</h3>
         </div>
         <div className="p-6">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Válaszd ki az alkalmazás színvilágát (Világos, Sötét vagy Automatikus Rendszer Szintű).</p>
            
            <div className="grid grid-cols-3 gap-3 max-w-lg">
               <button
                  onClick={() => setTheme('light')}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
               >
                  <Sun className="w-6 h-6" />
                  <span className="text-sm font-semibold">Világos</span>
               </button>
               <button
                  onClick={() => setTheme('dark')}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
               >
                  <Moon className="w-6 h-6 outline-none" />
                  <span className="text-sm font-semibold">Sötét</span>
               </button>
               <button
                  onClick={() => setTheme('system')}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === 'system' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
               >
                  <Monitor className="w-6 h-6" />
                  <span className="text-sm font-semibold">Rendszer</span>
               </button>
            </div>
         </div>
      </div>

    </div>
  );
}
