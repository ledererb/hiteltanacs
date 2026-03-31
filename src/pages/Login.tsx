import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Leaf } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // const { error } = await supabase.auth.signInWithPassword({ email, password });
    // For MVP prototyping UI, we navigate immediately:
    setTimeout(() => {
      setLoading(false);
      navigate('/dashboard');
    }, 800);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - form */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24 bg-white z-10 shadow-2xl rounded-r-3xl">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="flex items-center space-x-3 mb-8">
             <div className="bg-primary-500 p-2 rounded-xl shadow-lg shadow-primary-500/30">
                <Leaf className="w-8 h-8 text-white" />
             </div>
             <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">EnergiApp</h2>
          </div>
          <h2 className="mt-8 text-2xl font-semibold leading-9 tracking-tight text-slate-800">
            Jelentkezz be a fiókodba
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            A Pályázatkezelő & Iratgeneráló Rendszerhez
          </p>

          <div className="mt-10">
            <div>
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium leading-6 text-slate-900">
                    E-mail cím
                  </label>
                  <div className="mt-2">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full rounded-xl border-0 py-2.5 px-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium leading-6 text-slate-900">
                    Jelszó
                  </label>
                  <div className="mt-2">
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-xl border-0 py-2.5 px-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6 transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-primary-500 focus:ring-primary-500"
                    />
                    <label className="ml-3 block text-sm leading-6 text-slate-700">
                      Emlékezz rám
                    </label>
                  </div>

                  <div className="text-sm leading-6">
                    <a href="#" className="font-semibold text-primary-600 hover:text-primary-500 transition-colors">
                      Elfelejtett jelszó?
                    </a>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full justify-center rounded-xl bg-primary-500 px-3 py-3 text-sm font-semibold text-white shadow-xl shadow-primary-500/20 hover:bg-primary-600 hover:-translate-y-0.5 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:opacity-70 disabled:hover:translate-y-0"
                  >
                    {loading ? 'Bejelentkezés...' : 'Bejelentkezés'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right side - decorative backgrond */}
      <div className="relative hidden w-0 flex-1 lg:block bg-gradient-to-br from-primary-50 to-primary-100">
         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-10 mix-blend-multiply" />
         <div className="absolute inset-x-0 bottom-0 top-0 flex flex-col justify-center px-16 z-10 pointer-events-none text-center items-center">
             <div className="max-w-xl backdrop-blur-3xl bg-white/40 p-12 rounded-[2.5rem] border border-white/60 shadow-2xl">
                 <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-400 mb-6">
                     Automatizált Energiahatékonyság
                 </h2>
                 <p className="text-lg text-slate-700 font-medium leading-relaxed">
                     Kezeld a pályázatokat, generáld az iratokat és kövesd a számlázást egyetlen modern felületen. 30% hatékonyságjavulás garantált.
                 </p>
             </div>
         </div>
      </div>
    </div>
  );
}
