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

    useEffect(() => {
        fetchPrinters();
    }, []);

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
        (p.name?.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (filterCategory === 'All' || p.category === filterCategory) &&
        (selectedCity === 'Toutes les villes' || p.city === selectedCity) &&
        (selectedCountry === 'Tous les pays' || p.country === selectedCountry)
    );

    const sharePrinter = (id) => {
        const url = `${window.location.origin}/?printer=${id}`;
        navigator.clipboard.writeText(url);
        alert('Lien de la boutique copié !');
    };

    return (
        <div className="min-h-screen bg-background pt-32 pb-20 px-4 md:px-6">
            <div className="container mx-auto max-w-7xl">
                <div className="mb-20">
                    <AdBanner />
                </div>
                
                {/* Minimalist Header */}
                <div className="flex flex-col items-center text-center max-w-4xl mx-auto mb-16 space-y-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-full border border-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.3em]">
                        Annuaire International
                    </div>
                    <h1 className="text-5xl md:text-8xl font-black text-dark tracking-tighter leading-none">
                        L'expertise <br /> <span className="text-primary italic font-serif">sans frontières.</span>
                    </h1>
                </div>

                {/* Intelligent Filter System */}
                <div className="max-w-3xl mx-auto mb-20 relative z-30">
                    <div className="bg-white rounded-[2.5rem] p-3 shadow-2xl border border-dark/5 flex items-center gap-3">
                        <div className="flex-1 relative group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-dark/30 group-focus-within:text-accent transition-colors" size={24} />
                            <input 
                                type="text" 
                                placeholder="Rechercher une imprimerie..."
                                className="w-full bg-transparent pl-16 pr-8 py-5 text-lg font-bold focus:outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button 
                            onClick={() => setShowFilters(!showFilters)}
                            className={`px-8 py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 transition-all
                                ${showFilters ? 'bg-primary text-white' : 'bg-dark/5 text-dark hover:bg-dark/10'}`}
                        >
                            <SlidersHorizontal size={20} />
                            {showFilters ? 'Fermer' : 'Filtrer'}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="bg-white rounded-[3rem] h-[500px] animate-pulse border border-dark/5"></div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 relative z-10">
                        {filteredPrinters.map((p) => (
                            <div 
                                key={p.id} 
                                onClick={() => { setSelectedPrinterId(p.id); setPage('printer_detail'); }}
                                className="group bg-white border border-dark/10 rounded-[3rem] overflow-hidden hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 cursor-pointer flex flex-col h-full"
                            >
                                <div className="h-64 relative overflow-hidden">
                                    <img 
                                        src={p.cover_url || 'https://images.unsplash.com/photo-1562664347-4950157077a9?q=80&w=2500&auto=format&fit=crop'} 
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-dark/80 via-dark/20 to-transparent"></div>
                                    
                                    <div className="absolute top-6 left-6 flex gap-2">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); sharePrinter(p.id); }}
                                            className="bg-white/20 backdrop-blur-md p-3 rounded-xl text-white hover:bg-white/40 transition-all shadow-xl"
                                        >
                                            <Share2 size={18} />
                                        </button>
                                    </div>

                                    <div className="absolute top-6 right-6 flex flex-col gap-2 items-end">
                                        <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-dark flex items-center gap-2 shadow-xl">
                                            <div className="w-1.5 h-1.5 bg-[#25D366] rounded-full animate-pulse"></div>
                                            Disponible
                                        </div>
                                        {p.rating && (
                                            <div className="bg-white text-dark px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 shadow-xl">
                                                <Star size={14} className="text-yellow-600" fill="currentColor" />
                                                {p.rating}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="absolute bottom-6 left-6 right-6 flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-[1.2rem] border-4 border-white/20 overflow-hidden bg-white/10 backdrop-blur-md shadow-2xl shrink-0">
                                            <img src={p.logo_url} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="text-white">
                                            <h3 className="font-black text-xl leading-none mb-2">{p.name}</h3>
                                            <div className="flex items-center gap-1.5 text-[10px] opacity-80 uppercase tracking-widest font-black bg-white/10 w-fit px-2 py-1 rounded-md">
                                                <MapPin size={10} /> {p.city}, {p.country}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-10 space-y-6 flex-1 flex flex-col">
                                    <p className="text-dark/60 font-medium line-clamp-3 leading-relaxed text-sm flex-1">
                                        {p.description || "Spécialiste de l'impression haute qualité. Nous accompagnons les entreprises et les particuliers dans tous leurs projets de communication visuelle."}
                                    </p>

                                    <div className="flex gap-2 flex-wrap">
                                        {p.services?.slice(0, 3).map((s, i) => (
                                            <span key={i} className="px-3 py-1.5 bg-dark/5 text-dark/40 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                {s.name}
                                            </span>
                                        ))}
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-dark/5">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setSelectedPrinterId(p.id); setPage('printer_detail'); }}
                                            className="bg-[#3D0B37] text-[#F5F5DC] py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-lg"
                                        >
                                            Profil Pro
                                            <ArrowRight size={14} />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${p.whatsapp || '221709465891'}`, '_blank'); }}
                                            className="bg-[#F5F5DC] text-[#3D0B37] py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-transform flex items-center justify-center gap-2 border border-[#3D0B37]/10 shadow-lg"
                                        >
                                            <MessageCircle size={16} />
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
        </div>
    );
};

export default PrintersPage;
