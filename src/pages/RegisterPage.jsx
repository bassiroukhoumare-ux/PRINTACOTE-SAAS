import React, { useState, useEffect } from 'react';
import { Mail, Lock, ArrowRight, ArrowLeft, Loader2, AlertCircle, User, Store, MapPin, Phone, Globe, Search, ChevronDown, Check, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
        setLoading(true);
        setError('');

        const finalCountry = showCustomCountryInput ? customCountry : country;

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    first_name: firstName,
                    last_name: lastName,
                }
            }
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
            return;
        }

        if (authData.user) {
            const { error: profileError } = await supabase.from('printers').insert([
                {
                    owner_id: authData.user.id,
                    name: businessName,
                    city: city,
                    country: finalCountry,
                    whatsapp: whatsapp,
                    first_name: firstName,
                    last_name: lastName,
                    logo_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(businessName)}&background=random`,
                    cover_url: 'https://images.unsplash.com/photo-1562664347-4950157077a9?q=80&w=2500&auto=format&fit=crop',
                    rating: 5.0,
                    views: 0
                }
            ]);

            if (profileError) {
                setError(profileError.message);
                setLoading(false);
            } else {
                setSuccess(true);
                setLoading(false);
            }
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 pt-32 pb-20">
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#F5F5DC]/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#3D0B37]/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="w-full max-w-5xl bg-white rounded-[4rem] border border-dark/10 shadow-2xl overflow-hidden relative z-10 flex flex-col md:flex-row min-h-[850px]">
                <div className="md:w-[35%] p-12 md:p-16 flex flex-col justify-between bg-[#F5F5DC] text-[#3D0B37] relative">
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

                <div className="md:w-[65%] p-10 md:p-16 flex flex-col justify-center bg-white overflow-y-auto max-h-[90vh]">
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

                        <button 
                            type="submit" disabled={loading}
                            className="w-full bg-[#3D0B37] text-[#F5F5DC] py-4 rounded-xl font-black text-sm shadow-xl shadow-black/10 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <>Créer mon compte <ArrowRight size={18} /></>}
                        </button>
                    </form>

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
