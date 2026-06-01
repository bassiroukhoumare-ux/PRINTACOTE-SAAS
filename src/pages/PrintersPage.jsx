import React, { useState, useEffect } from 'react';
import { Search, MapPin, Star, MessageCircle, Phone, ArrowRight, Filter, SlidersHorizontal, ChevronDown, Share2, CheckCircle2, X, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AdBanner from '../components/AdBanner';

const PrintersPage = ({ setPage, setSelectedPrinterId }) => {
    const [printers, setPrinters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedCity, setSelectedCity] = useState('Toutes les villes');
    const [selectedCountry, setSelectedCountry] = useState('Tous les pays');
    const [countrySearch, setCountrySearch] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    useEffect(() => {
        fetchPrinters();
    }, []);

    useEffect(() => {
        if (showToast) {
            const timer = setTimeout(() => setShowToast(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showToast]);

    const fetchPrinters = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('printers')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setPrinters(data);
        }
        setLoading(false);
    };

    const countries = ["Tous les pays", "Sénégal", "Côte d'Ivoire", "Mali", "Guinée", "Bénin", "Burkina Faso", "Cameroun", "Gabon", "Togo", "Niger", "Mauritanie", "France", "USA", "Canada"];
    const filteredCountries = countries.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase()));

    const cities = ["Toutes les villes", "Dakar", "Abidjan", "Bamako", "Conakry", "Cotonou", "Ouagadougou", "Douala", "Libreville", "Lomé", "Niamey", "Nouakchott", "Paris", "New York", "Montreal"];
    const categories = ['All', 'Impression Offset', 'Numérique', 'Grand Format', 'Sérigraphie', 'Packaging'];

    const filteredPrinters = printers.filter(p => 
        (!p.status || p.status === 'En ligne') &&
        (p.name?.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (filterCategory === 'All' || p.category === filterCategory) &&
        (selectedCity === 'Toutes les villes' || p.city === selectedCity) &&
        (selectedCountry === 'Tous les pays' || p.country === selectedCountry)
    );

    const sortedFilteredPrinters = [...filteredPrinters].sort((a, b) => {
        const aReviews = Array.isArray(a.reviews) ? a.reviews : [];
        const bReviews = Array.isArray(b.reviews) ? b.reviews : [];
        
        const aAvg = aReviews.length > 0 ? (aReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / aReviews.length) : 0;
        const bAvg = bReviews.length > 0 ? (bReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / bReviews.length) : 0;
        
        if (aAvg !== bAvg) {
            return bAvg - aAvg;
        }
        return bReviews.length - aReviews.length;
    });

    const sharePrinter = (id) => {
        const url = `${window.location.origin}/?printer=${id}`;
        navigator.clipboard.writeText(url);
        setShowToast(true);
    };

    return (
        <div className="min-h-screen bg-background pt-32 pb-20 px-4 md:px-6">
            <div className="container mx-auto max-w-7xl">
                <div className="mb-20">
                    <AdBanner />
                </div>
                


                {/* Intelligent Filter System */}
                <div className={`w-full mx-auto mb-20 relative z-30 transition-all duration-500 ease-out ${isSearchFocused || searchTerm ? 'max-w-2xl' : 'max-w-md'}`}>
                    <div className="bg-white rounded-full p-2 shadow-2xl border border-dark/5 flex items-center justify-between transition-all duration-500">
                        <div className="flex-1 flex items-center relative group">
                            <Search className="absolute left-4 text-dark/30 group-focus-within:text-accent transition-colors" size={18} />
                            <input 
                                type="text" 
                                placeholder="Rechercher une imprimerie..."
                                className="w-full bg-transparent pl-10 pr-4 py-2 sm:py-3 text-xs sm:text-sm font-bold focus:outline-none placeholder:text-dark/30 text-dark"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onFocus={() => setIsSearchFocused(true)}
                                onBlur={(e) => {
                                    if (!e.target.value) {
                                        setIsSearchFocused(false);
                                    }
                                }}
                            />
                        </div>
                        <button 
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-2.5 sm:px-5 sm:py-3 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shrink-0
                                ${showFilters ? 'bg-primary text-white shadow-md' : 'bg-dark/5 text-dark hover:bg-dark/10'}`}
                        >
                            <SlidersHorizontal size={14} />
                            <span className="hidden sm:inline">{showFilters ? 'Fermer' : 'Filtrer'}</span>
                        </button>
                    </div>

                    {/* Advanced Options Panel */}
                    {showFilters && (
                        <div className="absolute top-full left-0 right-0 mt-4 bg-white rounded-[3rem] p-10 shadow-2xl border border-dark/5 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-widest text-dark/30 mb-6 flex items-center gap-2">
                                        <Globe size={14} /> Pays
                                    </h4>
                                    <div className="space-y-3">
                                        <input 
                                            type="text" 
                                            placeholder="Chercher pays..." 
                                            className="w-full bg-dark/5 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none"
                                            value={countrySearch}
                                            onChange={(e) => setCountrySearch(e.target.value)}
                                        />
                                        <div className="max-h-32 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                                            {filteredCountries.map(c => (
                                                <button 
                                                    key={c}
                                                    onClick={() => setSelectedCountry(c)}
                                                    className={`w-full px-4 py-2.5 rounded-xl text-[10px] font-bold text-left transition-all ${selectedCountry === c ? 'bg-primary text-white' : 'hover:bg-dark/5 text-dark/60'}`}
                                                >
                                                    {c}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-widest text-dark/30 mb-6">Localisation</h4>
                                    <div className="max-h-44 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                                        {cities.map(city => (
                                            <button 
                                                key={city}
                                                onClick={() => setSelectedCity(city)}
                                                className={`w-full px-4 py-2.5 rounded-xl text-[10px] font-bold text-left transition-all ${selectedCity === city ? 'bg-primary text-white shadow-lg' : 'hover:bg-dark/5 text-dark/60'}`}
                                            >
                                                {city}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-widest text-dark/30 mb-6">Spécialité</h4>
                                    <div className="max-h-44 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                                        {categories.map(cat => (
                                            <button 
                                                key={cat}
                                                onClick={() => setFilterCategory(cat)}
                                                className={`w-full px-4 py-2.5 rounded-xl text-[10px] font-bold text-left transition-all ${filterCategory === cat ? 'bg-primary text-white shadow-lg' : 'hover:bg-dark/5 text-dark/60'}`}
                                            >
                                                {cat === 'All' ? 'Tous les services' : cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="bg-white rounded-[1.5rem] sm:rounded-[3rem] h-[300px] sm:h-[500px] animate-pulse border border-dark/5"></div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10 relative z-10">
                        {sortedFilteredPrinters.map((p) => (
                            <div 
                                key={p.id} 
                                onClick={() => { setSelectedPrinterId(p.id); setPage('printer_detail'); }}
                                className="group bg-white border border-dark/10 rounded-[1.5rem] sm:rounded-[3rem] overflow-hidden hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 cursor-pointer flex flex-col h-full"
                            >
                                <div className="h-32 sm:h-48 md:h-64 relative overflow-hidden">
                                    <img 
                                        src={p.cover_url || 'https://images.unsplash.com/photo-1562664347-4950157077a9?q=80&w=2500&auto=format&fit=crop'} 
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-dark/80 via-dark/20 to-transparent"></div>
                                    
                                    <div className="absolute top-3 left-3 sm:top-6 sm:left-6 flex gap-2">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); sharePrinter(p.id); }}
                                            className="bg-white/20 backdrop-blur-md p-1.5 sm:p-3 rounded-lg sm:rounded-xl text-white hover:bg-white/40 transition-all shadow-xl"
                                        >
                                            <Share2 size={12} className="sm:w-[18px] sm:h-[18px]" />
                                        </button>
                                    </div>
 
                                    <div className="absolute top-3 right-3 sm:top-6 sm:right-6 flex flex-col gap-1 sm:gap-2 items-end">
                                        <div className="bg-white/90 backdrop-blur-md px-2 py-1 sm:px-4 sm:py-2 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-dark flex items-center gap-1 sm:gap-2 shadow-xl">
                                            <div className="w-1 sm:w-1.5 sm:h-1.5 h-1 bg-[#25D366] rounded-full animate-pulse"></div>
                                            Disponible
                                        </div>
                                        {(() => {
                                            const reviewsList = Array.isArray(p.reviews) ? p.reviews : [];
                                            if (reviewsList.length === 0) return null;
                                            const avg = (reviewsList.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / reviewsList.length).toFixed(1);
                                            return (
                                                <div className="bg-white text-dark px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[9px] sm:text-xs font-black flex items-center gap-1 sm:gap-1.5 shadow-xl animate-in zoom-in-50">
                                                    <Star size={10} className="text-yellow-600 sm:w-[14px] sm:h-[14px]" fill="currentColor" />
                                                    <span>{avg} <span className="opacity-40 text-[8px] sm:text-[10px]">({reviewsList.length})</span></span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    
                                    <div className="absolute bottom-3 left-3 right-3 sm:bottom-6 sm:left-6 sm:right-6 flex items-center gap-2 sm:gap-4">
                                        <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-[0.8rem] sm:rounded-[1.2rem] border-2 border-white/20 overflow-hidden bg-white/10 backdrop-blur-md shadow-2xl shrink-0">
                                            <img src={p.logo_url} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="text-white min-w-0">
                                            <div className="flex items-center gap-1.5 mb-1 sm:mb-2">
                                                <h3 className="font-black text-xs sm:text-xl leading-none truncate">{p.name}</h3>
                                                {p.badge && (
                                                    <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[6px] sm:text-[8px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-md border border-white/20">
                                                        {p.badge === 'Vérifié' ? '✓' : p.badge}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 text-[7px] sm:text-[10px] opacity-80 uppercase tracking-widest font-black bg-white/10 w-fit px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md truncate">
                                                <MapPin size={8} className="sm:w-[10px] sm:h-[10px]" /> <span className="truncate">{p.city}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3 sm:p-6 md:p-10 space-y-3 sm:space-y-6 flex-1 flex flex-col">
                                    <p className="text-dark/60 font-medium line-clamp-2 sm:line-clamp-3 leading-relaxed text-[11px] sm:text-sm flex-1">
                                        {p.description || "Spécialiste de l'impression haute qualité. Nous accompagnons les entreprises et les particuliers dans tous leurs projets de communication visuelle."}
                                    </p>

                                    <div className="flex gap-1 sm:gap-2 flex-wrap">
                                        {p.services?.slice(0, 3).map((s, i) => (
                                            <span key={i} className="px-1.5 py-0.5 sm:px-3 sm:py-1.5 bg-dark/5 text-dark/40 rounded-full text-[7px] sm:text-[10px] font-black uppercase tracking-widest truncate">
                                                {s.name}
                                            </span>
                                        ))}
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-1.5 sm:gap-4 pt-3 sm:pt-6 border-t border-dark/5">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setSelectedPrinterId(p.id); setPage('printer_detail'); }}
                                            className="bg-[#3D0B37] text-[#F5F5DC] py-2 sm:py-4 rounded-lg sm:rounded-xl font-black text-[8px] sm:text-[10px] uppercase tracking-widest hover:scale-105 transition-transform flex items-center justify-center gap-1 sm:gap-2 shadow-lg"
                                        >
                                            Profil
                                            <ArrowRight size={10} className="sm:w-[14px] sm:h-[14px]" />
                                        </button>
                                        <button 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                supabase.rpc('increment_printer_clicks', { printer_id: p.id }).then(undefined, err => console.warn(err));
                                                const rawPhone = p.whatsapp || '221709465891';
                                                const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
                                                window.open(`https://wa.me/${cleanPhone}`, '_blank'); 
                                            }}
                                            className="bg-[#F5F5DC] text-[#3D0B37] py-2 sm:py-4 rounded-lg sm:rounded-xl font-black text-[8px] sm:text-[10px] uppercase tracking-widest hover:scale-105 transition-transform flex items-center justify-center gap-1 sm:gap-2 border border-[#3D0B37]/10 shadow-lg"
                                        >
                                            <MessageCircle size={10} className="sm:w-[16px] sm:h-[16px]" />
                                            WhatsApp
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {filteredPrinters.length === 0 && !loading && (
                            <div className="col-span-full py-32 text-center bg-white border-2 border-dashed border-dark/10 rounded-[3rem]">
                                <Search size={48} className="mx-auto text-dark/10 mb-6" />
                                <h3 className="text-xl font-bold text-dark/60 mb-2">Aucun imprimeur trouvé</h3>
                                <p className="text-dark/40">Essayez d'ajuster vos filtres (Pays, Ville, Spécialité) pour voir plus de résultats.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showToast && (
                <div className="fixed bottom-6 right-6 z-[9999] bg-[#3D0B37] text-[#F5F5DC] px-6 py-4 rounded-2xl shadow-2xl font-bold animate-in slide-in-from-bottom-4">
                    Lien de la boutique copié !
                </div>
            )}
        </div>
    );
};

export default PrintersPage;
