import React, { useState, useEffect } from 'react';
import { Mail, Lock, ArrowRight, ArrowLeft, Loader2, AlertCircle, User, Store, MapPin, Phone, Globe, Search, ChevronDown, Check, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { signInWithGoogle } from '../lib/auth';

const RegisterPage = ({ setPage }) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [country, setCountry] = useState('Sénégal');
    const [customCountry, setCustomCountry] = useState('');
    const [showCustomCountryInput, setShowCustomCountryInput] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [city, setCity] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    
    // Checkbox states for terms and info confirmation
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [confirmInfoCorrect, setConfirmInfoCorrect] = useState(false);
    
    // Country Selector State
    const [isCountryMenuOpen, setIsCountryMenuOpen] = useState(false);
    const [countrySearch, setCountrySearch] = useState('');

    const countries = [
        "Sénégal", "Côte d'Ivoire", "Mali", "Guinée", "Bénin", "Burkina Faso", 
        "Cameroun", "Gabon", "Togo", "Niger", "Mauritanie", "France", "USA", "Canada", "Autre (Saisir manuellement)"
    ].sort((a, b) => a === "Autre (Saisir manuellement)" ? 1 : b === "Autre (Saisir manuellement)" ? -1 : a.localeCompare(b));

    const filteredCountries = countries.filter(c => 
        c.toLowerCase().includes(countrySearch.toLowerCase())
    );

    const handleRegister = async (e) => {
        e.preventDefault();
        
        if (!acceptTerms || !confirmInfoCorrect) {
            setError("Vous devez accepter les conditions d'utilisation et confirmer l'exactitude de vos informations.");
            return;
        }

        setLoading(true);
        setError('');
        const finalCountry = showCustomCountryInput ? customCountry : country;

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/`,
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    business_name: businessName,
                    city: city,
                    country: finalCountry,
                    whatsapp: whatsapp
                }
            }
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
            return;
        }

        if (authData.user) {
            setSuccess(true);
            setLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        setLoading(true);
        setError('');

        const { error: googleError } = await signInWithGoogle();

        // En cas de succès, le navigateur est immédiatement redirigé vers Google :
        // ce code n'est atteint qu'en cas d'erreur. Les infos manquantes (WhatsApp,
        // nom de l'imprimerie, localisation...) seront collectées à la première
        // connexion via l'écran de configuration obligatoire du tableau de bord.
        if (googleError) {
            setError(googleError.message);
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-6 pt-32 pb-20">
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#F5F5DC]/10 rounded-full blur-[120px]"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#3D0B37]/10 rounded-full blur-[100px]"></div>
                </div>

                <div className="w-full max-w-5xl bg-white rounded-[2rem] md:rounded-[4rem] border border-dark/10 shadow-2xl overflow-hidden relative z-10 flex flex-col md:flex-row h-auto md:min-h-[800px]">
                    <div className="md:w-[35%] p-6 sm:p-12 md:p-16 flex flex-col justify-between bg-[#F5F5DC] text-[#3D0B37] relative">
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/40 rounded-full blur-2xl"></div>
                        <div>
                            <button onClick={() => setPage('home')} className="flex items-center gap-2 text-dark/40 hover:text-dark transition-colors mb-12">
                                <ArrowLeft size={18} /> Accueil
                            </button>
                            <h1 className="text-4xl font-black tracking-tight mb-6">Rejoignez le <br />Réseau Mondial.</h1>
                            <p className="text-dark/40 leading-relaxed">Connectez votre imprimerie aux clients les plus exigeants, où qu'ils soient.</p>
                        </div>
                        <div className="mt-12">
                            <img src="/logo.png" alt="Logo" className="h-10 w-auto opacity-30 grayscale" />
                        </div>
                    </div>

                    <div className="md:w-[65%] p-6 sm:p-10 md:p-16 flex flex-col justify-center items-center text-center bg-white">
                        <div className="w-24 h-24 bg-[#F5F5DC] rounded-[2.5rem] flex items-center justify-center text-[#3D0B37] mb-8 shadow-xl shadow-black/5 animate-pulse">
                            <Mail size={40} className="stroke-[1.5]" />
                        </div>
                        <h2 className="text-3xl font-black text-[#3D0B37] mb-6 tracking-tight">Presque fini !</h2>
                        <p className="text-dark/60 text-lg leading-relaxed max-w-md mb-8">
                            Un e-mail de confirmation a été envoyé à l'adresse <strong className="text-[#3D0B37]">{email}</strong>.
                        </p>
                        <div className="bg-[#F5F5DC]/40 border border-[#3D0B37]/5 rounded-3xl p-6 text-sm text-[#3D0B37]/80 max-w-md mb-10 leading-relaxed font-medium">
                            Veuillez cliquer sur le lien de validation présent dans ce message pour activer votre compte.
                            <br />
                            <span className="block mt-3 text-xs opacity-65 italic">
                                Pensez à vérifier votre dossier de courriers indésirables (Spams) si vous ne recevez rien d'ici quelques minutes.
                            </span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <button 
                                onClick={() => setPage('login')} 
                                className="flex-1 bg-[#3D0B37] text-[#F5F5DC] py-4 rounded-xl font-black text-sm shadow-xl shadow-black/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                Se connecter
                                <ArrowRight size={18} />
                            </button>
                            <button 
                                onClick={() => setPage('home')} 
                                className="flex-1 bg-dark/5 text-dark hover:bg-dark/10 py-4 rounded-xl font-bold text-sm transition-all"
                            >
                                Retour à l'accueil
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 pt-32 pb-20">
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#F5F5DC]/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#3D0B37]/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="w-full max-w-5xl bg-white rounded-[2rem] md:rounded-[4rem] border border-dark/10 shadow-2xl overflow-hidden relative z-10 flex flex-col md:flex-row h-auto md:min-h-[800px]">
                <div className="md:w-[35%] p-6 sm:p-12 md:p-16 flex flex-col justify-between bg-[#F5F5DC] text-[#3D0B37] relative">
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/40 rounded-full blur-2xl"></div>
                    <div>
                        <button onClick={() => setPage('home')} className="flex items-center gap-2 text-dark/40 hover:text-dark transition-colors mb-12">
                            <ArrowLeft size={18} /> Accueil
                        </button>
                        <h1 className="text-4xl font-black tracking-tight mb-6">Rejoignez le <br />Réseau Mondial.</h1>
                        <p className="text-dark/40 leading-relaxed">Connectez votre imprimerie aux clients les plus exigeants, où qu'ils soient.</p>
                    </div>
                    <div className="mt-12">
                        <img src="/logo.png" alt="Logo" className="h-10 w-auto opacity-30 grayscale" />
                    </div>
                </div>

                <div className="md:w-[65%] p-6 sm:p-10 md:p-16 flex flex-col justify-center bg-white">
                    <form onSubmit={handleRegister} className="space-y-4">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl flex items-start gap-3 text-sm">
                                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Prénom</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-dark/20 group-focus-within:text-accent transition-colors" size={16} />
                                    <input 
                                        type="text" required placeholder="Amadou"
                                        className="w-full bg-dark/5 border border-transparent rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:bg-white focus:border-accent/30 transition-all font-bold text-sm"
                                        value={firstName} onChange={(e) => setFirstName(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Nom</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-dark/20 group-focus-within:text-accent transition-colors" size={16} />
                                    <input 
                                        type="text" required placeholder="Ndiaye"
                                        className="w-full bg-dark/5 border border-transparent rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:bg-white focus:border-accent/30 transition-all font-bold text-sm"
                                        value={lastName} onChange={(e) => setLastName(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">WhatsApp (avec indicatif)</label>
                                <div className="relative group">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-dark/20 group-focus-within:text-accent transition-colors" size={16} />
                                    <input 
                                        type="tel" required placeholder="Ex: +221770000000"
                                        className="w-full bg-dark/5 border border-transparent rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:bg-white focus:border-accent/30 transition-all font-bold text-sm"
                                        value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Pays</label>
                                <div className="relative">
                                    {!showCustomCountryInput ? (
                                        <button 
                                            type="button"
                                            onClick={() => setIsCountryMenuOpen(!isCountryMenuOpen)}
                                            className="w-full bg-dark/5 border border-transparent rounded-xl pl-4 pr-4 py-3 focus:outline-none focus:bg-white focus:border-accent/30 transition-all font-bold text-sm flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Globe size={16} className="text-dark/20" />
                                                {country}
                                            </div>
                                            <ChevronDown size={16} className={`transition-transform duration-300 ${isCountryMenuOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                    ) : (
                                        <div className="relative group">
                                            <Edit2 className="absolute left-4 top-1/2 -translate-y-1/2 text-dark/20 group-focus-within:text-accent transition-colors" size={16} />
                                            <input 
                                                type="text" required placeholder="Saisir votre pays..."
                                                className="w-full bg-dark/5 border border-transparent rounded-xl pl-11 pr-12 py-3 focus:outline-none focus:bg-white focus:border-accent/30 transition-all font-bold text-sm"
                                                value={customCountry} onChange={(e) => setCustomCountry(e.target.value)}
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => setShowCustomCountryInput(false)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-accent hover:underline"
                                            >
                                                Liste
                                            </button>
                                        </div>
                                    )}

                                    {isCountryMenuOpen && !showCustomCountryInput && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-dark/5 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="p-3 border-b border-dark/5">
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/20" size={14} />
                                                    <input 
                                                        type="text" 
                                                        placeholder="Rechercher un pays..."
                                                        className="w-full bg-dark/5 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none"
                                                        value={countrySearch}
                                                        onChange={(e) => setCountrySearch(e.target.value)}
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-[200px] overflow-y-auto py-2">
                                                {filteredCountries.map(c => (
                                                    <button 
                                                        key={c}
                                                        type="button"
                                                        onClick={() => { 
                                                            if (c === "Autre (Saisir manuellement)") {
                                                                setShowCustomCountryInput(true);
                                                            } else {
                                                                setCountry(c);
                                                            }
                                                            setIsCountryMenuOpen(false); 
                                                            setCountrySearch(''); 
                                                        }}
                                                        className="w-full px-4 py-2.5 text-left text-xs font-bold hover:bg-primary/5 transition-colors flex items-center justify-between"
                                                    >
                                                        {c}
                                                        {country === c && <Check size={14} className="text-accent" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Nom de l'imprimerie</label>
                            <div className="relative group">
                                <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-dark/20 group-focus-within:text-accent transition-colors" size={16} />
                                <input 
                                    type="text" required placeholder="Ex: Print Master Paris"
                                    className="w-full bg-dark/5 border border-transparent rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:bg-white focus:border-accent/30 transition-all font-bold text-sm"
                                    value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Localisation exacte (Adresse ou Google Maps)</label>
                            <div className="relative group">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-dark/20 group-focus-within:text-accent transition-colors" size={16} />
                                <input 
                                    type="text" required placeholder="Ex: Avenue Cheikh Anta Diop, Dakar..."
                                    className="w-full bg-dark/5 border border-transparent rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:bg-white focus:border-accent/30 transition-all font-bold text-sm"
                                    value={city} onChange={(e) => setCity(e.target.value)}
                                />
                            </div>
                            <p className="text-[9px] text-dark/30 font-medium ml-2 italic">Indiquez votre emplacement réel pour permettre aux clients de vous trouver facilement.</p>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-dark/20 group-focus-within:text-accent transition-colors" size={16} />
                                <input 
                                    type="email" required placeholder="contact@imprimerie.com"
                                    className="w-full bg-dark/5 border border-transparent rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:bg-white focus:border-accent/30 transition-all font-bold text-sm"
                                    value={email} onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Mot de passe</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-dark/20 group-focus-within:text-accent transition-colors" size={16} />
                                <input 
                                    type="password" required placeholder="8+ caractères"
                                    className="w-full bg-dark/5 border border-transparent rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:bg-white focus:border-accent/30 transition-all font-bold text-sm"
                                    value={password} onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-3 pt-2 text-left">
                            <label className="flex items-start gap-3 cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    required
                                    className="mt-1 accent-[#3D0B37] h-4 w-4 rounded border-dark/25 focus:ring-[#3D0B37]"
                                    checked={acceptTerms} 
                                    onChange={(e) => setAcceptTerms(e.target.checked)} 
                                />
                                <span className="text-xs text-dark/60 font-medium group-hover:text-dark transition-colors">
                                    J'accepte les <button type="button" onClick={() => setPage('terms')} className="font-bold underline text-[#3D0B37] hover:text-[#3D0B37]/80">conditions d'utilisation</button> et la <button type="button" onClick={() => setPage('privacy')} className="font-bold underline text-[#3D0B37] hover:text-[#3D0B37]/80">politique de confidentialité</button>.*
                                </span>
                            </label>
                            
                            <label className="flex items-start gap-3 cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    required
                                    className="mt-1 accent-[#3D0B37] h-4 w-4 rounded border-dark/25 focus:ring-[#3D0B37]"
                                    checked={confirmInfoCorrect} 
                                    onChange={(e) => setConfirmInfoCorrect(e.target.checked)} 
                                />
                                <span className="text-xs text-dark/60 font-medium group-hover:text-dark transition-colors">
                                    Je certifie que toutes les informations saisies sont correctes. En cas de fausse information, je comprends que mon compte sera banni.*
                                </span>
                            </label>
                        </div>

                        <button 
                            type="submit" disabled={loading || !acceptTerms || !confirmInfoCorrect}
                            className="w-full bg-[#3D0B37] text-[#F5F5DC] py-4 rounded-xl font-black text-sm shadow-xl shadow-black/10 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <>Créer mon compte <ArrowRight size={18} /></>}
                        </button>
                    </form>

                    {/* Inscription via Google (OAuth) */}
                    <div className="flex items-center gap-4 my-6">
                        <div className="h-px flex-1 bg-dark/10" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-dark/30">ou</span>
                        <div className="h-px flex-1 bg-dark/10" />
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleSignup}
                        disabled={loading}
                        className="w-full bg-white border border-dark/10 text-dark py-4 rounded-xl font-black text-sm hover:bg-dark/5 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
                        </svg>
                        S'inscrire avec Google
                    </button>

                    <p className="text-[9px] text-dark/30 font-medium text-center mt-3 italic px-4">
                        Avec Google, vous compléterez les informations de votre imprimerie (WhatsApp, localisation…) lors de votre première connexion.
                    </p>

                    <div className="mt-6 text-center">
                        <span className="text-xs text-dark/40">Déjà membre ? </span>
                        <button onClick={() => setPage('login')} className="text-xs font-black text-[#3D0B37] hover:underline">Se connecter</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
