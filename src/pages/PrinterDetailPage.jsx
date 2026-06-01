import React, { useEffect, useState } from 'react';
import { MapPin, Star, MessageCircle, Phone, ArrowLeft, CheckCircle, Image as ImageIcon, ExternalLink, Globe, User, Send, CreditCard, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

const PrinterDetailPage = ({ id, setPage }) => {
    const [printer, setPrinter] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reviews, setReviews] = useState([]);
    const [newReview, setNewReview] = useState({ rating: 5, text: '' });
    const [activeImage, setActiveImage] = useState(null);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const getImageUrl = (item) => {
        if (!item) return '';
        if (typeof item === 'string') {
            try {
                const parsed = JSON.parse(item);
                return parsed.image_url || parsed.url || item;
            } catch (e) {
                return item;
            }
        }
        return item.image_url || item.url || '';
    };

    useEffect(() => {
        if (id) {
            fetchPrinter();
        } else {
            setLoading(false);
        }
    }, [id]);

    const fetchPrinter = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('printers')
                .select('*')
                .eq('id', id)
                .single();

            if (!error && data) {
                setPrinter(data);
                
                // Track profile view in the background
                supabase.rpc('increment_printer_views', { printer_id: id }).then(undefined, e => {
                    console.warn("Could not increment views:", e);
                });

                let dbReviews = [];
                if (data.reviews) {
                    if (typeof data.reviews === 'string') {
                        try {
                            dbReviews = JSON.parse(data.reviews);
                        } catch (e) {
                            dbReviews = [];
                        }
                    } else if (Array.isArray(data.reviews)) {
                        dbReviews = data.reviews;
                    }
                }
                setReviews(dbReviews);
            }
        } catch (e) {
            console.error("Error fetching printer:", e);
        } finally {
            setLoading(false);
        }
    };

    const handlePublishReview = async () => {
        if (!newReview.text) return;
        const review = {
            id: reviews.length + 1,
            author: "Client Anonyme",
            rating: newReview.rating,
            text: newReview.text,
            date: new Date().toLocaleDateString('fr-FR')
        };
        const updatedReviews = [review, ...reviews];
        
        // Calculate new average rating
        const totalRating = updatedReviews.reduce((acc, r) => acc + r.rating, 0);
        const averageRating = parseFloat((totalRating / updatedReviews.length).toFixed(1));

        const { error } = await supabase
            .from('printers')
            .update({ 
                reviews: updatedReviews,
                rating: averageRating
            })
            .eq('id', printer.id);

        if (!error) {
            setReviews(updatedReviews);
            setPrinter({
                ...printer,
                reviews: updatedReviews,
                rating: averageRating
            });
            setNewReview({ rating: 5, text: '' });
            setToast({ message: "Votre avis a été publié avec succès !", type: 'success' });
        } else {
            setToast({ message: "Erreur lors de la publication de l'avis : " + error.message, type: 'error' });
        }
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

    return (
        <div className="min-h-screen bg-background pb-20">
            {toast && (
                <div className={`fixed bottom-8 right-8 z-[500] px-6 py-4 rounded-2xl shadow-2xl text-white font-bold animate-in slide-in-from-bottom-4 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.message}
                </div>
            )}
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
                             <div className="flex flex-col sm:flex-row gap-8 items-start mb-8 pb-8 border-b border-primary/5">
                                 <div className="w-32 h-32 rounded-[2.5rem] border-4 border-white shadow-2xl overflow-hidden bg-white shrink-0 mx-auto sm:mx-0">
                                     <img src={printer.logo_url} className="w-full h-full object-cover" />
                                 </div>
                                  <div className="flex-1 space-y-3 text-center sm:text-left">
                                      <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
                                          <h1 className="text-4xl md:text-5xl font-black text-primary tracking-tight leading-tight">{printer.name}</h1>
                                          {printer.badge && (
                                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border
                                                  ${printer.badge === 'Pro' ? 'bg-[#C9A84C]/15 text-[#9A7B2E] border-[#C9A84C]/40'
                                                    : printer.badge === 'Vérifié' ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                                                    : 'bg-purple-500/10 text-purple-600 border-purple-500/30'}`}>
                                                  {printer.badge === 'Vérifié' ? '✓ Vérifié' : printer.badge}
                                              </span>
                                          )}
                                      </div>
                                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-primary/60 font-bold text-sm">
                                          <div className="flex items-center gap-1.5"><MapPin size={18} /> {printer.city}, {printer.neighborhood || 'Quartier Pro'}</div>
                                          {reviews.length > 0 && (
                                              <div className="flex items-center gap-1.5"><Star size={18} className="text-yellow-600" fill="currentColor" /> {printer.rating} ({reviews.length} {reviews.length > 1 ? 'avis' : 'avis'})</div>
                                          )}
                                      </div>
                                      {/* Social Links */}
                                      <div className="flex justify-center sm:justify-start gap-3 pt-2">
                                          {printer.facebook && (
                                              <a href={printer.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-primary/5 hover:bg-primary hover:text-white flex items-center justify-center text-primary transition-all" title="Facebook">
                                                  <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.8c4.56-.93 8-4.96 8-9.8z"/>
                                                  </svg>
                                              </a>
                                          )}
                                          {printer.instagram && (
                                              <a href={printer.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-primary/5 hover:bg-primary hover:text-white flex items-center justify-center text-primary transition-all" title="Instagram">
                                                  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                                                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                                                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                                                  </svg>
                                              </a>
                                          )}
                                          {printer.tiktok && (
                                              <a href={printer.tiktok} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-primary/5 hover:bg-primary hover:text-white flex items-center justify-center text-primary transition-all" title="TikTok">
                                                  <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .8.11V9.4a6.27 6.27 0 0 0-3.11 0 6.34 6.34 0 0 0-4.25 5.85 6.34 6.34 0 0 0 10.82 4.48 6.34 6.34 0 0 0 2.23-4.82V7.9c1.24.85 2.75 1.35 4.37 1.35V5.8a4.86 4.86 0 0 1-3.7-2.11z"/>
                                                  </svg>
                                              </a>
                                          )}
                                      </div>
                                  </div>
                              </div>
                              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                                  <button 
                                      onClick={() => {
                                          supabase.rpc('increment_printer_clicks', { printer_id: printer.id }).then(undefined, err => console.warn(err));
                                          const rawPhone = printer.whatsapp || '221709465891';
                                          const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
                                          window.open(`https://wa.me/${cleanPhone}`, '_blank');
                                      }}
                                      className="flex-1 sm:flex-none bg-[#25D366] text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:scale-105 transition-transform shadow-xl"
                                  >
                                      <MessageCircle size={20} />
                                      WhatsApp
                                  </button>
                                  <button 
                                      onClick={() => window.location.href = `tel:${printer.phone || '221709465891'}`}
                                      className="flex-1 sm:flex-none bg-[#F5F5DC] text-[#3D0B37] px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:scale-105 transition-transform shadow-xl border border-[#3D0B37]/10"
                                  >
                                      <Phone size={20} />
                                      Appeler
                                  </button>
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

                        {/* Services Section */}
                        <div className="bg-white rounded-[3rem] p-10 md:p-16 border border-primary/10 shadow-2xl space-y-10">
                            <div className="flex items-center justify-between">
                                <h3 className="text-3xl font-black text-primary flex items-center gap-4">
                                    <CheckCircle size={32} className="text-primary" />
                                    Nos Services
                                </h3>
                            </div>
                            
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 {printer.services && printer.services.length > 0 ? (
                                     printer.services.map((service, i) => (
                                         <div key={i} className="bg-primary/5 p-8 rounded-[2rem] border border-primary/5 hover:bg-primary hover:text-white transition-all duration-500 group flex flex-col justify-between">
                                             <div>
                                                 <h4 className="text-xl font-black mb-3">{service.name}</h4>
                                                 <p className="text-sm opacity-60 mb-6 font-medium leading-relaxed group-hover:text-white/80">{service.description}</p>
                                                 {service.parameters && service.parameters.length > 0 && (
                                                     <div className="flex flex-wrap gap-2 mb-6">
                                                         {service.parameters.map((param, pIdx) => (
                                                             <span key={pIdx} className="text-[10px] font-bold text-primary bg-primary/10 group-hover:bg-white/20 group-hover:text-white px-2.5 py-1 rounded-lg transition-colors">
                                                                 {param.label} : {param.value}
                                                             </span>
                                                         ))}
                                                     </div>
                                                 )}
                                             </div>
                                             <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 border-t border-primary/10 group-hover:border-white/10 gap-3">
                                                 <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest shrink-0">
                                                     <CreditCard size={14} />
                                                     Tarif
                                                 </div>
                                                 <div className="font-black text-sm text-left sm:text-right">
                                                     {service.price ? `à partir de ${service.price} FCFA ${service.quantity ? `/ ${service.quantity}` : ''}` : 'Sur devis'}
                                                 </div>
                                             </div>
                                         </div>
                                     ))
                                 ) : (
                                     <div className="col-span-full py-12 text-center text-primary/45 font-bold">
                                         Aucun service répertorié pour le moment.
                                     </div>
                                 )}
                             </div>
                        </div>

                        {/* Localization Section */}
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
                                 {printer.portfolio && printer.portfolio.length > 0 ? (
                                     printer.portfolio.map((item, i) => (
                                         <div 
                                             key={i} 
                                             onClick={() => setActiveImage(getImageUrl(item))}
                                             className="aspect-video rounded-2xl overflow-hidden border border-accent/10 cursor-zoom-in hover:opacity-90 transition-all shadow-lg"
                                         >
                                             <img src={getImageUrl(item)} className="w-full h-full object-cover" />
                                         </div>
                                     ))
                                 ) : (
                                     <div className="text-center py-10 opacity-50 font-bold text-xs uppercase tracking-widest">
                                         Aucune réalisation disponible.
                                     </div>
                                 )}
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Image Lightbox Modal */}
            {activeImage && (
                <div 
                    onClick={() => setActiveImage(null)}
                    className="fixed inset-0 z-[300] bg-dark/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-300"
                >
                    <button 
                        onClick={() => setActiveImage(null)}
                        className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-white/20 text-[#F5F5DC] rounded-full transition-colors z-[310]"
                    >
                        <X size={24} />
                    </button>
                    <div className="max-w-5xl max-h-[90vh] rounded-[2.5rem] overflow-hidden border-4 border-white/20 shadow-2xl relative z-[305] animate-in zoom-in-95 duration-300">
                        <img 
                            src={activeImage} 
                            alt="Agrandissement de la réalisation" 
                            className="max-w-full max-h-[85vh] object-contain pointer-events-none" 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default PrinterDetailPage;
