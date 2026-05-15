import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const LoginPage = ({ setPage }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            setPage('dashboard');
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 pt-32">
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#3D0B37]/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#F5F5DC]/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="w-full max-w-5xl bg-white rounded-[4rem] border border-dark/10 shadow-2xl overflow-hidden relative z-10 flex flex-col md:flex-row min-h-[600px]">
                <div className="md:w-[40%] p-12 md:p-16 flex flex-col justify-between bg-[#3D0B37] text-white relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                    <div>
                        <button onClick={() => setPage('home')} className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-12">
                            <ArrowLeft size={18} /> Retour
                        </button>
                        <h1 className="text-4xl font-black tracking-tight mb-6">Heureux de vous revoir.</h1>
                        <p className="text-white/40 leading-relaxed">Accédez à votre espace professionnel et gérez vos commandes en toute simplicité.</p>
                    </div>
                    <div className="mt-12">
                        <img src="/logo.png" alt="Logo" className="h-12 w-auto brightness-200 opacity-20" />
                    </div>
                </div>

                <div className="md:w-[60%] p-12 md:p-20 flex flex-col justify-center bg-white">
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl flex items-start gap-3 text-sm">
                                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-dark/30 ml-2">Email Professionnel</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-dark/20 group-focus-within:text-primary transition-colors" size={18} />
                                <input 
                                    type="email" 
                                    required
                                    placeholder="nom@votreimprimerie.com"
                                    className="w-full bg-dark/5 border border-transparent rounded-2xl pl-12 pr-6 py-4 focus:outline-none focus:bg-white focus:border-primary/30 transition-all font-bold"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-dark/30 ml-2">Mot de passe</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-dark/20 group-focus-within:text-primary transition-colors" size={18} />
                                <input 
                                    type="password" 
                                    required
                                    placeholder="••••••••"
                                    className="w-full bg-dark/5 border border-transparent rounded-2xl pl-12 pr-6 py-4 focus:outline-none focus:bg-white focus:border-primary/30 transition-all font-bold"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-[#F5F5DC] text-[#3D0B37] py-5 rounded-2xl font-black text-lg shadow-xl shadow-black/10 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <>Se connecter <ArrowRight size={20} /></>}
                        </button>
                    </form>

                    <div className="mt-10 text-center space-y-4">
                        <button className="text-sm font-bold text-dark/40 hover:text-primary transition-colors">Mot de passe oublié ?</button>
                        <div className="pt-6 border-t border-dark/5">
                            <span className="text-sm text-dark/40">Pas encore de compte ? </span>
                            <button onClick={() => setPage('register')} className="text-sm font-black text-primary hover:underline">Inscrire mon imprimerie</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
