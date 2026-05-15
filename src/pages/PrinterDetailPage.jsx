import React, { useEffect, useState } from 'react';
import { MapPin, Star, MessageCircle, Phone, ArrowLeft, CheckCircle, Image as ImageIcon, ExternalLink, Globe, User, Send, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';

const PrinterDetailPage = ({ id, setPage }) => {
    const [printer, setPrinter] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reviews, setReviews] = useState([
        { id: 1, author: "Amadou Diallo", rating: 5, text: "Excellent travail sur mes dépliants. Très réactif sur WhatsApp.", date: "Il y a 3 jours" },
        { id: 2, author: "Fatou Kane", rating: 4, text: "Qualité d'impression irréprochable. Un peu d'attente pour la livraison mais ça valait le coup.", date: "Il y a 1 semaine" }
    ]);
    const [newReview, setNewReview] = useState({ rating: 5, text: '' });

    useEffect(() => {
        if (id) {
            fetchPrinter();
        }
    }, [id]);

    const fetchPrinter = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('printers')
            .select('*')
            .eq('id', id)
            .single();

        if (!error && data) {
            setPrinter(data);
        }
        setLoading(false);
    };

    const handlePublishReview = () => {
        if (!newReview.text) return;
        const review = {
            id: reviews.length + 1,
            author: "Client Anonyme",
            rating: newReview.rating,
            text: newReview.text,
            date: "À l'instant"
        };
        setReviews([review, ...reviews]);
        setNewReview({ rating: 5, text: '' });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-primary border-t-accent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!printer) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
                <h2 className="text-2xl font-black text-primary">Imprimeur non trouvé</h2>
                <button onClick={() => setPage('printers')} className="bg-primary text-accent px-8 py-4 rounded-full font-bold">Retour à la liste</button>
            </div>
        );
    }

    const atelierServices = [
        { name: "Cartes de Visite", desc: "Impression haute fidélité sur papier 350g, finition mate ou brillante.", price: "à partir de 15 000 FCFA / 100 unités" },
        { name: "Flyers & Dépliants", desc: "Idéal pour vos campagnes promotionnelles. Papier 135g haute qualité.", price: "à partir de 25 000 FCFA / 500 unités" },
        { name: "Bâches & Grand Format", desc: "Impression résistante aux intempéries pour vos enseignes et événements.", price: "à partir de 8 500 FCFA / m²" },
        { name: "Conception Graphique", desc: "Besoin d'un design ? Notre équipe s'occupe de créer vos maquettes pro.", price: "sur devis" }
    ];

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Hero Profile */}
            <div className="h-[50vh] relative overflow-hidden">
                <img 
                    src={printer.cover_url || 'https://images.unsplash.com/photo-1562664347-4950157077a9?q=80&w=2500&auto=format&fit=crop'} 
                    className="w-full h-full object-cover" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/40 to-transparent"></div>
                <button 
                    onClick={() => setPage('printers')}
                    className="absolute top-32 left-8 bg-white/10 backdrop-blur-md text-white p-4 rounded-full border border-white/20 hover:bg-white/20 transition-all z-20"
                >
                    <ArrowLeft size={24} />
                </button>
            </div>

            <div className="container mx-auto px-6 -mt-32 relative z-10">
                <div className="flex flex-col lg:flex-row gap-10">
                    {/* Main Content */}
                    <div className="lg:w-2/3 space-y-10">
                        <div className="bg-white rounded-[3rem] p-10 md:p-16 border border-primary/10 shadow-2xl">
                            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center mb-10">
                                <div className="w-32 h-32 rounded-[2.5rem] border-4 border-white shadow-2xl overflow-hidden bg-white shrink-0">
                                    <img src={printer.logo_url} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <h1 className="text-4xl md:text-5xl font-black text-primary tracking-tight">{printer.name}</h1>
                                    <div className="flex items-center gap-4 text-primary/60 font-bold">
                                        <div className="flex items-center gap-1.5"><MapPin size={18} /> {printer.city}, {printer.neighborhood || 'Quartier Pro'}</div>
                                        <div className="flex items-center gap-1.5"><Star size={18} className="text-yellow-600" fill="currentColor" /> {printer.rating} ({reviews.length} avis)</div>
                                    </div>
                                </div>
                                <div className="flex gap-4 shrink-0 w-full md:w-auto">
                                    <button 
                                        onClick={() => window.open(`https://wa.me/${printer.whatsapp || '221709465891'}`, '_blank')}
                                        className="flex-1 md:flex-none bg-[#25D366] text-white px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:scale-105 transition-transform shadow-xl"
                                    >
                                        <MessageCircle size={20} />
                                        WhatsApp
                                    </button>
                                    <button 
                                        onClick={() => window.location.href = `tel:${printer.phone || '221709465891'}`}
                                        className="flex-1 md:flex-none bg-[#F5F5DC] text-[#3D0B37] px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:scale-105 transition-transform shadow-xl border border-[#3D0B37]/10"
                                    >
                                        <Phone size={20} />
                                        Appeler
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-2xl font-black text-primary flex items-center gap-3">
                                    À propos de nous
                                </h3>
                                <p className="text-primary/60 text-lg leading-relaxed font-medium">
                                    {printer.description || "Spécialiste de l'impression haute qualité au Sénégal. Nous accompagnons les entreprises et les particuliers dans tous leurs projets de communication visuelle."}
                                </p>
                            </div>
                        </div>

                        {/* Services Section - NEW */}
                        <div className="bg-white rounded-[3rem] p-10 md:p-16 border border-primary/10 shadow-2xl space-y-10">
                            <div className="flex items-center justify-between">
                                <h3 className="text-3xl font-black text-primary flex items-center gap-4">
                                    <CheckCircle size={32} className="text-primary" />
                                    Nos Services
                                </h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {atelierServices.map((service, i) => (
                                    <div key={i} className="bg-primary/5 p-8 rounded-[2rem] border border-primary/5 hover:bg-primary hover:text-white transition-all duration-500 group">
                                        <h4 className="text-xl font-black mb-3">{service.name}</h4>
                                        <p className="text-sm opacity-60 mb-6 font-medium leading-relaxed group-hover:text-white/80">{service.desc}</p>
                                        <div className="flex items-center justify-between pt-4 border-t border-primary/10 group-hover:border-white/10">
                                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                                                <CreditCard size={14} />
                                                Tarif
                                            </div>
                                            <div className="font-black text-sm">{service.price}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Localization Section - NEW */}
                        <div className="bg-white rounded-[3rem] p-10 md:p-16 border border-primary/10 shadow-2xl space-y-10">
                            <h3 className="text-3xl font-black text-primary flex items-center gap-4">
                                <MapPin size={32} className="text-primary" />
                                Localisation & Itinéraire
                            </h3>
                            <div className="rounded-[2.5rem] overflow-hidden h-[400px] border border-primary/10 relative shadow-inner">
                                <iframe 
                                    width="100%" 
                                    height="100%" 
                                    frameBorder="0" 
                                    scrolling="no" 
                                    marginHeight="0" 
                                    marginWidth="0" 
                                    src={`https://www.openstreetmap.org/export/embed.html?bbox=-17.5,14.5,-14.5,15.5&layer=mapnik&marker=${printer.city === 'Dakar' ? '14.7167,-17.4677' : '14.6937,-17.4441'}`}
                                    className="grayscale opacity-80"
                                ></iframe>
                                <div className="absolute inset-0 bg-primary/5 pointer-events-none"></div>
                            </div>
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-primary/5 rounded-[2rem] border border-primary/5">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white">
                                        <MapPin size={24} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest text-primary/40">Adresse exacte</p>
                                        <p className="font-bold text-primary">{printer.city}, {printer.neighborhood || 'Sénégal'}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(printer.name + ' ' + printer.city)}`, '_blank')}
                                    className="w-full md:w-auto bg-[#3D0B37] text-[#F5F5DC] px-8 py-4 rounded-xl font-black flex items-center justify-center gap-2 hover:scale-105 transition-transform shadow-xl"
                                >
                                    Suivre l'itinéraire
                                    <ExternalLink size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Reviews Section */}
                        <div className="bg-white rounded-[3rem] p-10 md:p-16 border border-primary/10 shadow-2xl space-y-10">
                            <h3 className="text-3xl font-black text-primary flex items-center gap-4">
                                <Star size={32} className="text-yellow-600" />
                                Avis Clients
                            </h3>
                            
                            <div className="space-y-8">
                                <div className="p-8 bg-primary/5 rounded-[2rem] border border-primary/5 mb-12">
                                    <h4 className="text-lg font-black text-primary mb-6">Laisser un avis</h4>
                                    <div className="space-y-6">
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <button 
                                                    key={star} 
                                                    onClick={() => setNewReview({...newReview, rating: star})}
                                                    className="text-yellow-600 hover:scale-110 transition-transform"
                                                >
                                                    <Star size={24} fill={star <= newReview.rating ? "currentColor" : "none"} />
                                                </button>
                                            ))}
                                        </div>
                                        <textarea 
                                            value={newReview.text}
                                            onChange={(e) => setNewReview({...newReview, text: e.target.value})}
                                            placeholder="Partagez votre expérience avec cet imprimeur..." 
                                            className="w-full bg-white border border-primary/10 rounded-2xl p-6 text-primary focus:outline-none focus:border-primary transition-all min-h-[120px]"
                                        ></textarea>
                                        <button 
                                            onClick={handlePublishReview}
                                            className="bg-[#F5F5DC] text-[#3D0B37] px-8 py-4 rounded-xl font-black hover:scale-105 transition-transform shadow-lg border border-[#3D0B37]/10"
                                        >
                                            Publier mon avis
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    {reviews.map((rev) => (
                                        <div key={rev.id} className="flex gap-6 pb-8 border-b border-primary/5 last:border-0">
                                            <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center text-primary shrink-0">
                                                <User size={28} />
                                            </div>
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-black text-primary">{rev.author}</h4>
                                                    <span className="text-xs font-bold text-primary/30 uppercase tracking-widest">{rev.date}</span>
                                                </div>
                                                <div className="flex gap-1">
                                                    {[1, 2, 3, 4, 5].map(s => (
                                                        <Star key={s} size={14} className="text-yellow-600" fill={s <= rev.rating ? "currentColor" : "none"} />
                                                    ))}
                                                </div>
                                                <p className="text-primary/70 font-medium leading-relaxed">
                                                    {rev.text}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Portfolio */}
                    <div className="lg:w-1/3 space-y-10">
                        <div className="bg-[#F5F5DC] rounded-[3rem] p-10 text-[#3D0B37] shadow-2xl border border-[#3D0B37]/10">
                            <h3 className="text-2xl font-black mb-8 leading-tight flex items-center gap-3 text-[#3D0B37]">
                                <ImageIcon size={24} />
                                Portfolio
                            </h3>
                            <div className="grid grid-cols-1 gap-6">
                                {[
                                    "https://images.unsplash.com/photo-1544431950-21da23bd9918?q=80&w=1000&auto=format&fit=crop",
                                    "https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=1000&auto=format&fit=crop",
                                    "https://images.unsplash.com/photo-1589330694653-ded6df03f754?q=80&w=1000&auto=format&fit=crop"
                                ].map((img, i) => (
                                    <div key={i} className="aspect-video rounded-2xl overflow-hidden border border-accent/10">
                                        <img src={img} className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrinterDetailPage;
