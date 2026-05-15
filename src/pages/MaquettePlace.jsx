import React, { useState } from 'react';
import { ShoppingBag, Search, Filter, ShoppingCart, Star, ArrowRight, MessageCircle, SlidersHorizontal, ChevronDown, X, Globe } from 'lucide-react';

const MaquettePlace = ({ setPage }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('Tous');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const categories = ["Tous", "Encre", "Papier", "Machines", "Accessoires"];
    
    const items = [
        { id: 1, title: "Encre Offset Premium - Cyan", price: "45 000 FCFA", category: "Encre", country: "Sénégal", rating: 4.8, sales: 124, img: "https://images.unsplash.com/photo-1585776245991-cf89dd7fc53e?q=80&w=1000&auto=format&fit=crop", desc: "Encre haute densité pour une reproduction fidèle des couleurs sur tous types de supports." },
        { id: 2, title: "Papier Couché Brillant 135g - 500 f.", price: "12 500 FCFA", category: "Papier", country: "Côte d'Ivoire", rating: 4.9, sales: 89, img: "https://images.unsplash.com/photo-1589330694653-ded6df03f754?q=80&w=1000&auto=format&fit=crop", desc: "Papier de qualité supérieure idéal pour vos flyers et brochures publicitaires." },
        { id: 3, title: "Presse Numérique Pro X-200", price: "2 500 000 FCFA", category: "Machines", country: "Sénégal", rating: 5.0, sales: 45, img: "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1000&auto=format&fit=crop", desc: "Machine d'impression numérique haute performance pour gros volumes." },
        { id: 4, title: "Plaques Offset Thermiques", price: "85 000 FCFA", category: "Accessoires", country: "Mali", rating: 4.7, sales: 210, img: "https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=1000&auto=format&fit=crop", desc: "Plaques de haute précision pour un transfert d'image optimal sur presse." },
        { id: 5, title: "Vernis UV Séchage Rapide", price: "35 000 FCFA", category: "Encre", country: "Sénégal", rating: 4.9, sales: 67, img: "https://images.unsplash.com/photo-1572044162444-ad60f128bde2?q=80&w=1000&auto=format&fit=crop", desc: "Vernis de protection haute brillance pour une finition professionnelle." },
        { id: 6, title: "Massicot Hydraulique 52cm", price: "85 000 FCFA", category: "Machines", country: "Sénégal", rating: 4.6, sales: 156, img: "https://images.unsplash.com/photo-1544431950-21da23bd9918?q=80&w=1000&auto=format&fit=crop", desc: "Coupe précise et sécurisée pour tous vos travaux de finition." }
    ];

    const filteredItems = items.filter(item => 
        (item.title.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (filterCategory === 'Tous' || item.category === filterCategory)
    );

    const contactSeller = (product) => {
        const productUrl = `${window.location.origin}/?product=${product.id}`;
        const message = `Bonjour, je suis intéressé par le produit "${product.title}" au prix de ${product.price}. \nLien du produit : ${productUrl} \n\nEnvoyé depuis printacote.com`;
        window.open(`https://wa.me/221709465891?text=${encodeURIComponent(message)}`, '_blank');
    };

    return (
        <div className="min-h-screen bg-[#3D0B37] pb-20">
            {/* Header Area */}
            <div className="bg-primary pt-40 pb-24 px-6 rounded-b-[4rem] text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent rounded-full blur-[120px]"></div>
                </div>
                
                <div className="container mx-auto max-w-4xl relative z-10">
                    <h1 className="text-4xl md:text-7xl font-black text-[#F5F5DC] mb-8 tracking-tighter leading-tight">
                        Marketplace <br /><span className="italic font-serif">Pro.</span>
                    </h1>
                    <p className="text-[#F5F5DC]/60 text-lg md:text-xl mb-12 max-w-2xl mx-auto font-medium">
                        Équipez votre atelier avec les meilleurs consommables et machines certifiés.
                    </p>
                </div>
            </div>

            {/* Intelligent Filter System */}
            <div className="container mx-auto px-6 -mt-8 relative z-30 max-w-3xl">
                <div className="bg-white rounded-[2.5rem] p-3 shadow-2xl border border-dark/5 flex items-center gap-3">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-dark/30 group-focus-within:text-accent transition-colors" size={24} />
                        <input 
                            type="text" 
                            placeholder="Rechercher un produit..."
                            className="w-full bg-transparent pl-16 pr-8 py-5 text-lg font-bold focus:outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-8 py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 transition-all
                            ${showFilters ? 'bg-primary text-white shadow-xl' : 'bg-dark/5 text-dark hover:bg-dark/10'}`}
                    >
                        <SlidersHorizontal size={20} />
                        {showFilters ? 'Fermer' : 'Filtrer'}
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
            <div className="container mx-auto px-6 py-20 relative z-10">
                {selectedProduct ? (
                    <div className="animate-in fade-in slide-in-from-bottom-10 duration-700">
                        <button onClick={() => setSelectedProduct(null)} className="flex items-center gap-2 text-[#F5F5DC] font-bold mb-10 hover:translate-x-[-4px] transition-transform">
                            <ArrowRight className="rotate-180" size={20} />
                            Retour au catalogue
                        </button>
                        
                        <div className="bg-white rounded-[4rem] overflow-hidden border border-primary/10 shadow-2xl flex flex-col lg:flex-row">
                            <div className="lg:w-1/2 aspect-square">
                                <img src={selectedProduct.img} alt={selectedProduct.title} className="w-full h-full object-cover" />
                            </div>
                            <div className="lg:w-1/2 p-12 md:p-20 flex flex-col justify-center">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="px-4 py-2 bg-primary/5 rounded-full text-primary text-xs font-black uppercase tracking-widest w-fit border border-primary/10">
                                        {selectedProduct.category}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-accent">
                                        <Globe size={14} />
                                        Disponible au {selectedProduct.country}
                                    </div>
                                </div>
                                <h2 className="text-4xl md:text-5xl font-black text-primary mb-6 leading-tight">{selectedProduct.title}</h2>
                                <div className="text-3xl font-black text-primary mb-10">{selectedProduct.price}</div>
                                
                                <p className="text-primary/60 text-lg leading-relaxed mb-12 font-medium">
                                    {selectedProduct.desc}
                                </p>
                                
                                <div className="flex flex-col sm:flex-row gap-6">
                                    <button 
                                        onClick={() => contactSeller(selectedProduct)}
                                        className="bg-[#3D0B37] text-[#F5F5DC] px-10 py-5 rounded-2xl font-black flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-2xl border border-white/10"
                                    >
                                        <ShoppingCart size={20} />
                                        Acheter le produit
                                    </button>
                                    <button 
                                        onClick={() => contactSeller(selectedProduct)}
                                        className="bg-[#F5F5DC] text-[#3D0B37] px-10 py-5 rounded-2xl font-black flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-2xl"
                                    >
                                        <MessageCircle size={20} />
                                        Contacter le vendeur
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {filteredItems.map((item, i) => (
                            <div key={i} onClick={() => setSelectedProduct(item)} className="group bg-white rounded-[3rem] overflow-hidden border border-primary/10 hover:shadow-2xl transition-all duration-500 cursor-pointer flex flex-col h-full">
                                <div className="relative aspect-[4/3] overflow-hidden">
                                    <img src={item.img} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    <div className="absolute top-6 right-6 bg-primary text-accent px-4 py-2 rounded-2xl text-xs font-black shadow-xl">
                                        {item.category}
                                    </div>
                                    <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-dark flex items-center gap-1.5 shadow-xl">
                                        <Globe size={12} className="text-accent" />
                                        {item.country}
                                    </div>
                                </div>
                                <div className="p-10 flex flex-col flex-1">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-xl font-black text-primary tracking-tight max-w-[70%] leading-tight group-hover:text-accent transition-colors">{item.title}</h3>
                                        <div className="text-primary font-black text-lg">{item.price}</div>
                                    </div>
                                    <p className="text-primary/60 text-sm font-medium mb-8 line-clamp-2 flex-1">
                                        {item.desc}
                                    </p>
                                    <div className="flex flex-col gap-3 pt-6 border-t border-primary/5">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); contactSeller(item); }}
                                            className="w-full bg-[#F5F5DC] text-[#3D0B37] py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-105 transition-transform shadow-xl border border-[#3D0B37]/10"
                                        >
                                            <MessageCircle size={18} />
                                            WhatsApp
                                        </button>
                                        <button 
                                            className="w-full bg-primary text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
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
