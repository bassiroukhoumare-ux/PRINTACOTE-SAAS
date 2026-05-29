import React, { useState, useEffect } from 'react';
import { ShoppingBag, Search, ShoppingCart, ArrowRight, MessageCircle, SlidersHorizontal, X, Globe, MapPin, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AdBanner from '../components/AdBanner';

const MaquettePlace = ({ setPage }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('Tous');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    const categories = [
        "Tous",
        ...new Set([
            "Encre",
            "Papier",
            "Machines",
            "Accessoires",
            ...items.map(item => item.category).filter(cat => cat && cat !== 'Tous')
        ])
    ];

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('products')
            .select('*, printers(name, country, city, description, whatsapp, status)')
            .eq('status', 'En ligne');

        if (!error && data) {
            const activeProducts = data.filter(item => !item.printers || !item.printers.status || item.printers.status === 'En ligne');
            const mapped = activeProducts.map(item => ({
                id: item.id,
                printerId: item.printer_id,
                title: item.name,
                price: `${parseFloat(item.price).toLocaleString()} FCFA`,
                category: item.options?.category || 'Encre',
                country: item.printers?.country || 'Sénégal',
                city: item.printers?.city || 'Dakar',
                img: item.images?.[0] || 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc53e?q=80&w=1000',
                desc: item.description,
                sellerName: item.printers?.name || 'Imprimerie Partenaire',
                sellerDesc: item.printers?.description || "Atelier d'impression professionnel certifié.",
                whatsapp: item.printers?.whatsapp || '221709465891',
                promoPrice: item.promo_price ? `${parseFloat(item.promo_price).toLocaleString()} FCFA` : null,
                discount: item.discount
            }));
            setItems(mapped);
        } else {
            console.error("Error loading products:", error);
        }
        setLoading(false);
    };

    const filteredItems = items.filter(item => 
        (item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
         item.desc.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (filterCategory === 'Tous' || item.category === filterCategory)
    );

    const contactSeller = (product) => {
        if (product.printerId) {
            supabase.rpc('increment_printer_clicks', { printer_id: product.printerId }).catch(err => console.warn(err));
        }
        const productUrl = `${window.location.origin}/?product=${product.id}`;
        const message = `Bonjour, je suis intéressé par le produit "${product.title}" au prix de ${product.promoPrice || product.price}. \nLien du produit : ${productUrl} \n\nEnvoyé depuis printacote.com`;
        const phone = product.whatsapp || '221709465891';
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    return (
        <div className="min-h-screen bg-[#3D0B37] pb-20">
            {/* Header Area */}
            <div className="bg-primary pt-40 pb-24 px-6 rounded-b-[4rem] text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent rounded-full blur-[120px]"></div>
                </div>
                
                <div className="container mx-auto max-w-4xl relative z-10">
                    <h1 className="text-4xl md:text-7xl font-black text-[#F5F5DC] mb-0 tracking-tighter leading-tight">
                        Marketplace <br /><span className="italic font-serif">Pro.</span>
                    </h1>
                </div>
            </div>

            {/* Intelligent Filter System */}
            <div className={`container mx-auto px-6 -mt-8 relative z-30 transition-all duration-500 ease-out ${isSearchFocused || searchTerm ? 'max-w-2xl' : 'max-w-md'}`}>
                <div className="bg-white rounded-full p-2 shadow-2xl border border-dark/5 flex items-center justify-between transition-all duration-500">
                    <div className="flex-1 flex items-center relative group">
                        <Search className="absolute left-4 text-dark/30 group-focus-within:text-accent transition-colors" size={18} />
                        <input 
                            type="text" 
                            placeholder="Rechercher un produit..."
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
                    <div className="absolute top-full left-6 right-6 mt-4 bg-white rounded-[3rem] p-10 shadow-2xl border border-dark/5 animate-in fade-in slide-in-from-top-4 duration-500">
                        <h4 className="text-xs font-black uppercase tracking-widest text-dark/30 mb-6">Catégories de consommables</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {categories.map(cat => (
                                <button 
                                    key={cat}
                                    onClick={() => setFilterCategory(cat)}
                                    className={`px-6 py-4 rounded-xl text-xs font-bold text-left transition-all ${filterCategory === cat ? 'bg-primary text-white shadow-lg' : 'bg-dark/5 text-dark hover:bg-dark/10'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Grid Area */}
            <div className="container mx-auto px-6 py-20 relative z-10 max-w-7xl">
                {!loading && !selectedProduct && (
                    <div className="mb-20">
                        <AdBanner dark={true} />
                    </div>
                )}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin text-white" size={48} />
                    </div>
                ) : selectedProduct ? (
                    <div className="animate-in fade-in slide-in-from-bottom-10 duration-700">
                        <button onClick={() => setSelectedProduct(null)} className="flex items-center gap-2 text-[#F5F5DC] font-bold mb-10 hover:translate-x-[-4px] transition-transform">
                            <ArrowRight className="rotate-180" size={20} />
                            Retour au catalogue
                        </button>
                        
                        <div className="bg-white rounded-[4rem] overflow-hidden border border-primary/10 shadow-2xl flex flex-col lg:flex-row">
                            <div className="lg:w-1/2 aspect-square">
                                <img src={selectedProduct.img} alt={selectedProduct.title} className="w-full h-full object-cover" />
                            </div>
                            <div className="lg:w-1/2 p-6 sm:p-12 lg:p-20 flex flex-col justify-center">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="px-4 py-2 bg-primary/5 rounded-full text-primary text-xs font-black uppercase tracking-widest w-fit border border-primary/10">
                                        {selectedProduct.category}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-accent">
                                        <Globe size={14} />
                                        Disponible au {selectedProduct.country}
                                    </div>
                                </div>
                                <h2 className="text-4xl md:text-5xl font-black text-primary mb-4 leading-tight">{selectedProduct.title}</h2>
                                <div className="flex items-center gap-4 mb-8">
                                    {selectedProduct.promoPrice ? (
                                        <>
                                            <div className="text-3xl font-black text-primary">{selectedProduct.promoPrice}</div>
                                            <div className="text-lg text-dark/30 line-through font-bold">{selectedProduct.price}</div>
                                        </>
                                    ) : (
                                        <div className="text-3xl font-black text-primary">{selectedProduct.price}</div>
                                    )}
                                </div>

                                {/* Seller Card */}
                                <div className="bg-primary/5 p-6 rounded-[2rem] border border-primary/10 mb-10">
                                    <div className="text-[9px] font-black uppercase tracking-[0.15em] text-primary/45 mb-2 flex items-center gap-1.5">
                                        <MapPin size={10} /> Vendu par
                                    </div>
                                    <h4 className="text-lg font-black text-primary mb-1">{selectedProduct.sellerName}</h4>
                                    <div className="text-xs text-primary/60 font-bold mb-2">📍 {selectedProduct.city}, {selectedProduct.country}</div>
                                    <p className="text-xs text-primary/65 leading-relaxed">{selectedProduct.sellerDesc}</p>
                                </div>
                                
                                <p className="text-primary/60 text-lg leading-relaxed mb-12 font-medium">
                                    {selectedProduct.desc}
                                </p>
                                
                                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                                    <button 
                                        onClick={() => contactSeller(selectedProduct)}
                                        className="bg-[#3D0B37] text-[#F5F5DC] px-6 sm:px-10 py-4 sm:py-5 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-2xl border border-white/10"
                                    >
                                        <ShoppingCart size={20} />
                                        Acheter le produit
                                    </button>
                                    <button 
                                        onClick={() => contactSeller(selectedProduct)}
                                        className="bg-[#F5F5DC] text-[#3D0B37] px-6 sm:px-10 py-4 sm:py-5 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-2xl"
                                    >
                                        <MessageCircle size={20} />
                                        Contacter le vendeur
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
                        {filteredItems.map((item, i) => (
                            <div key={i} onClick={() => setSelectedProduct(item)} className="group bg-white rounded-[1.5rem] sm:rounded-[3rem] overflow-hidden border border-primary/10 hover:shadow-2xl transition-all duration-500 cursor-pointer flex flex-col h-full">
                                <div className="relative aspect-[4/3] overflow-hidden">
                                    <img src={item.img} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    <div className="absolute top-3 right-3 sm:top-6 sm:right-6 bg-primary text-accent px-2.5 py-1 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl text-[8px] sm:text-xs font-black shadow-xl">
                                        {item.category}
                                    </div>
                                    <div className="absolute bottom-3 left-3 sm:bottom-6 sm:left-6 bg-white/90 backdrop-blur-md px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-dark flex items-center gap-1 sm:gap-1.5 shadow-xl">
                                        <Globe size={10} className="text-accent" />
                                        {item.country}
                                    </div>
                                    {item.discount && (
                                        <div className="absolute top-3 left-3 sm:top-6 sm:left-6 bg-red-500 text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[8px] sm:text-xs font-black shadow-xl">
                                            -{item.discount}%
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 sm:p-6 md:p-10 flex flex-col flex-1">
                                    <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-1 sm:gap-4 mb-2 sm:mb-3">
                                        <h3 className="text-sm sm:text-xl font-black text-primary tracking-tight leading-tight group-hover:text-accent transition-colors w-full sm:max-w-[70%] truncate sm:whitespace-normal">{item.title}</h3>
                                        <div className="text-right shrink-0">
                                            {item.promoPrice ? (
                                                <>
                                                    <div className="text-primary font-black text-xs sm:text-lg">{item.promoPrice}</div>
                                                    <div className="text-[10px] sm:text-xs text-dark/30 line-through font-bold">{item.price}</div>
                                                </>
                                            ) : (
                                                <div className="text-primary font-black text-xs sm:text-lg">{item.price}</div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-[8px] sm:text-[10px] font-bold text-primary/40 mb-2 sm:mb-3 truncate">📍 {item.sellerName} ({item.city})</div>
                                    <p className="text-primary/60 text-xs sm:text-sm font-medium mb-4 sm:mb-8 line-clamp-2 flex-1">
                                        {item.desc}
                                    </p>
                                    <div className="grid grid-cols-2 gap-1.5 sm:gap-3 pt-3 sm:pt-6 border-t border-primary/5">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); contactSeller(item); }}
                                            className="w-full bg-[#F5F5DC] text-[#3D0B37] py-2 sm:py-4 rounded-lg sm:rounded-xl font-black text-[8px] sm:text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 sm:gap-2 hover:scale-105 transition-transform shadow-xl border border-[#3D0B37]/10"
                                        >
                                            <MessageCircle size={12} className="sm:w-[18px] sm:h-[18px]" />
                                            WhatsApp
                                        </button>
                                        <button 
                                            className="w-full bg-primary text-white py-2 sm:py-4 rounded-lg sm:rounded-xl font-black text-[8px] sm:text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 sm:gap-2 hover:bg-primary/90 transition-colors"
                                        >
                                            Détails
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {filteredItems.length === 0 && (
                            <div className="col-span-full py-32 text-center bg-white/5 border-2 border-dashed border-white/10 rounded-[3rem]">
                                <ShoppingBag size={48} className="mx-auto text-white/10 mb-6" />
                                <h3 className="text-xl font-bold text-white/60 mb-2">Aucun produit trouvé</h3>
                                <p className="text-white/40">Essayez d'ajuster vos filtres pour voir plus de consommables.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MaquettePlace;
