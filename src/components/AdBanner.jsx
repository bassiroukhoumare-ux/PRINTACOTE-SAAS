import React, { useState, useEffect } from 'react';
import { Phone, ArrowRight, MessageCircle, X, Clock, Zap, Info, Image as ImageIcon, Video, Palette } from 'lucide-react';
import { supabase } from '../lib/supabase';

// La bannière est active si is_active et que la durée n'est pas expirée.
const isBannerActive = (v) => {
    if (!v || !v.is_active) return false;
    if (v.active_until && new Date(v.active_until) <= new Date()) return false;
    return !!(v.image_url || v.video_url);
};

// Convertit une URL YouTube/Vimeo en URL d'intégration (sinon null).
const toEmbedUrl = (url) => {
    if (!url) return null;
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&mute=1&loop=1&playlist=${yt[1]}&controls=0&modestbranding=1&rel=0`;
    const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vm) return `https://player.vimeo.com/video/${vm[1]}?autoplay=1&muted=1&loop=1&background=1`;
    return null;
};

const AdBanner = ({ dark = false }) => {
    const [showTariffs, setShowTariffs] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [customBanner, setCustomBanner] = useState(null);

    useEffect(() => {
        const fetchBanner = async () => {
            try {
                const { data, error } = await supabase
                    .from('system_settings')
                    .select('*')
                    .eq('key', 'publicity_banner')
                    .maybeSingle();
                if (!error && data && data.value && isBannerActive(data.value)) {
                    setCustomBanner(data.value);
                } else {
                    const localBanner = localStorage.getItem('publicity_banner');
                    if (localBanner) {
                        const parsed = JSON.parse(localBanner);
                        if (isBannerActive(parsed)) setCustomBanner(parsed);
                    }
                }
            } catch (err) {
                console.error("Error fetching publicity banner:", err);
            }
        };
        fetchBanner();
    }, []);

    if (customBanner) {
        const embedUrl = customBanner.media_type === 'video' ? toEmbedUrl(customBanner.video_url) : null;
        const isVideo = customBanner.media_type === 'video' && !!customBanner.video_url;
        return (
            <div
                className="w-full max-w-[1000px] aspect-[16/7] mx-auto border rounded-[2rem] sm:rounded-[3rem] overflow-hidden block relative group shadow-xl hover:scale-[1.01] transition-transform duration-500"
                style={{ borderColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(61,11,55,0.1)' }}
            >
                {/* Main click redirect layer */}
                <a
                    href={customBanner.link_url || '#'}
                    target={customBanner.link_url ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="absolute inset-0 z-0 block w-full h-full"
                >
                    {isVideo ? (
                        embedUrl ? (
                            <iframe
                                src={embedUrl}
                                title="Publicité Partenaire"
                                allow="autoplay; encrypted-media; picture-in-picture"
                                allowFullScreen
                                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                                style={{ border: 0, width: '100%', height: '100%' }}
                            />
                        ) : (
                            <video
                                src={customBanner.video_url}
                                autoPlay muted loop playsInline
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                        )
                    ) : (
                        <img
                            src={customBanner.image_url}
                            alt="Publicité Partenaire"
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent flex items-end p-6 sm:p-8 pointer-events-none">
                        <span className="text-[8px] sm:text-[9px] font-black text-white bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full uppercase tracking-widest relative z-10">
                            Sponsorisé
                        </span>
                    </div>
                </a>

                {/* Floating Social Links Layer */}
                {(customBanner.facebook_url || customBanner.instagram_url || customBanner.tiktok_url) && (
                    <div 
                        className="absolute top-4 right-4 z-20 flex gap-2"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                    >
                        {customBanner.facebook_url && (
                            <a 
                                href={customBanner.facebook_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white hover:bg-[#C9A84C] hover:text-[#0F0F13] flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg"
                                title="Facebook"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                    <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
                                </svg>
                            </a>
                        )}
                        {customBanner.instagram_url && (
                            <a 
                                href={customBanner.instagram_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white hover:bg-[#C9A84C] hover:text-[#0F0F13] flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg"
                                title="Instagram"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <svg className="w-4 h-4 stroke-current stroke-2 fill-none" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                                </svg>
                            </a>
                        )}
                        {customBanner.tiktok_url && (
                            <a 
                                href={customBanner.tiktok_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white hover:bg-[#C9A84C] hover:text-[#0F0F13] flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg"
                                title="TikTok"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                    <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.09-1.51-.12-.09-.23-.2-.35-.3-.02 2.37.01 4.74-.01 7.11-.1 1.94-.78 3.87-2.12 5.25-1.55 1.61-3.9 2.52-6.13 2.41-2.22-.04-4.52-1.03-5.74-2.88-1.5-2.2-1.39-5.46.36-7.51 1.34-1.62 3.48-2.52 5.56-2.4v3.98c-1.12-.09-2.31.28-3.04 1.17-.79.94-.78 2.45-.04 3.41.74 1 2.06 1.41 3.23 1.16 1.07-.18 2.01-1.04 2.22-2.12.1-.47.1-.96.1-1.44V.02z"/>
                                </svg>
                            </a>
                        )}
                    </div>
                )}
            </div>
        );
    }

    const tariffs = [
        { duration: 15, price: "10 000 FCFA" },
        { duration: 30, price: "18 000 FCFA" },
        { duration: 45, price: "25 000 FCFA" },
        { duration: 90, price: "45 000 FCFA", label: "3 mois" }
    ];

    const contactWhatsApp = (duration, price) => {
        const message = `Bonjour, je souhaite exposer ma publicité sur votre plateforme pour une durée de ${duration} jours au prix de ${price}.`;
        window.open(`https://wa.me/221709465891?text=${encodeURIComponent(message)}`, '_blank');
    };

    return (
        <>
            <div className={`w-full max-w-[1000px] min-h-[250px] md:h-[250px] mx-auto border rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-center md:justify-between gap-4 md:gap-10 relative overflow-hidden group
                ${dark ? 'bg-white/5 border-white/10' : 'bg-primary/5 border-primary/10'}`}>
                {/* Background Decorative Blur */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-[80px] -mr-32 -mt-32 group-hover:scale-150 transition-transform duration-700"></div>
                
                <div className="relative z-10 text-center md:text-left flex flex-col justify-center">
                    <div className={`w-fit mx-auto md:mx-0 inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-2 sm:mb-4
                        ${dark ? 'bg-white/10 text-accent' : 'bg-primary/10 text-primary'}`}>
                        Espace Partenaire
                    </div>
                    <h3 className={`font-black text-lg sm:text-2xl md:text-3xl lg:text-4xl leading-tight mb-2 sm:mb-4 ${dark ? 'text-accent' : 'text-primary'}`}>
                        Propulsez votre marque ici.
                    </h3>
                    <p className={`hidden md:block text-base lg:text-lg max-w-xl font-medium ${dark ? 'text-white/60' : 'text-primary/60'}`}>
                        Rejoignez la régie publicitaire Printacote et touchez directement vos futurs clients en quête d'impression.
                    </p>
                </div>
                
                <div className="flex flex-row md:flex-col lg:flex-row gap-2 sm:gap-4 relative z-10 w-full sm:w-auto shrink-0 justify-center">
                    <button 
                        onClick={() => setShowTariffs(true)}
                        className="bg-[#F5F5DC] text-[#3D0B37] px-4 py-2.5 sm:px-8 sm:py-5 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 sm:gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl"
                    >
                        <MessageCircle size={16} className="sm:w-5 sm:h-5" />
                        Contacter le support
                    </button>
                    <button 
                        onClick={() => setShowInfo(true)}
                        className={`px-4 py-2.5 sm:px-8 sm:py-5 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 sm:gap-3 transition-all border
                            ${dark ? 'bg-white/5 border-white/10 text-accent hover:bg-white/10' : 'bg-white border-primary/10 text-primary hover:bg-primary/5'}`}
                    >
                        En savoir plus
                        <ArrowRight size={16} className="sm:w-5 sm:h-5" />
                    </button>
                </div>
            </div>

            {/* Tariffs Popup */}
            {showTariffs && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-primary/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] sm:rounded-[3rem] w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-primary/10 animate-in zoom-in-95 duration-300">
                        <div className="bg-primary p-6 sm:p-8 text-accent flex justify-between items-center shrink-0">
                            <div>
                                <h4 className="text-xl sm:text-2xl font-black mb-1">Tarifs Publicitaires</h4>
                                <p className="text-accent/60 text-[10px] sm:text-sm font-bold tracking-wider uppercase">Choisissez votre durée</p>
                            </div>
                            <button onClick={() => setShowTariffs(false)} className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-xl sm:rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all shrink-0">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 sm:p-8 space-y-4 overflow-y-auto custom-scrollbar">
                            <div className="bg-accent/5 p-4 sm:p-6 rounded-2xl border border-primary/5 mb-2 sm:mb-6">
                                <p className="text-primary/70 text-xs sm:text-sm font-medium leading-relaxed">
                                    Exposez votre bannière publicitaire à des milliers d'utilisateurs qualifiés. La conception de votre affiche est <span className="font-black text-primary">offerte</span>.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:gap-4">
                                {tariffs.map((t, i) => (
                                    <button 
                                        key={i}
                                        onClick={() => contactWhatsApp(t.duration, t.price)}
                                        className="flex items-center justify-between p-4 sm:p-6 bg-white border border-primary/5 rounded-2xl hover:border-primary/30 hover:bg-primary hover:text-accent transition-all group"
                                    >
                                        <div className="flex items-center gap-3 sm:gap-4">
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/5 flex items-center justify-center group-hover:bg-accent/10 shrink-0">
                                                <Clock size={18} className="sm:w-5 sm:h-5" />
                                            </div>
                                            <div className="text-left">
                                                <div className="font-black text-sm sm:text-lg leading-tight">{t.label || `${t.duration} jours`}</div>
                                                <div className="text-[9px] sm:text-sm opacity-60 font-bold uppercase tracking-widest">Exposition Garantie</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                                            <div className="text-base sm:text-xl font-black">{t.price}</div>
                                            <Zap size={18} className="text-yellow-500 group-hover:text-accent shrink-0 sm:w-5 sm:h-5" fill="currentColor" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Info Popup */}
            {showInfo && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-primary/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] sm:rounded-[3rem] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-primary/10 animate-in zoom-in-95 duration-300">
                        <div className="bg-primary p-6 sm:p-10 text-accent flex justify-between items-start shrink-0">
                            <div>
                                <h4 className="text-2xl sm:text-3xl font-black mb-1 sm:mb-2">Concept Publicitaire</h4>
                                <p className="text-accent/60 font-bold tracking-widest uppercase text-[10px] sm:text-xs">Propulsez votre activité</p>
                            </div>
                            <button onClick={() => setShowInfo(false)} className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-xl sm:rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all shrink-0">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 sm:p-10 space-y-6 sm:space-y-10 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                                <div className="space-y-2 sm:space-y-4">
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/5 rounded-2xl flex items-center justify-center text-primary shrink-0">
                                        <ImageIcon size={24} className="sm:w-7 sm:h-7" />
                                    </div>
                                    <h5 className="text-lg sm:text-xl font-black text-primary">Affiches & Photos</h5>
                                    <p className="text-primary/60 text-xs sm:text-sm leading-relaxed font-medium">
                                        Exposez vos produits via des visuels haute définition. Nous prenons en charge la **conception graphique** de votre affiche gratuitement dès la souscription.
                                    </p>
                                </div>
                                <div className="space-y-2 sm:space-y-4">
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/5 rounded-2xl flex items-center justify-center text-primary shrink-0">
                                        <Video size={24} className="sm:w-7 sm:h-7" />
                                    </div>
                                    <h5 className="text-lg sm:text-xl font-black text-primary">Vidéos & Animations</h5>
                                    <p className="text-primary/60 text-xs sm:text-sm leading-relaxed font-medium">
                                        Captivez l'audience avec des vidéos ou des affiches animées. *Note : La création vidéo est facturée séparément du prix d'exposition.*
                                    </p>
                                </div>
                            </div>

                            <div className="bg-accent rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-8 border border-primary/10 flex items-start gap-4 sm:gap-6">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-xl flex items-center justify-center text-accent shrink-0">
                                    <Palette size={20} className="sm:w-6 sm:h-6" />
                                </div>
                                <div>
                                    <h5 className="text-sm sm:text-lg font-black text-primary mb-1 sm:mb-2">Conception incluse</h5>
                                    <p className="text-primary/70 text-xs sm:text-sm font-medium leading-relaxed">
                                        Pour toute campagne d'affichage, notre équipe créative construit votre visuel publicitaire pour garantir un impact maximal auprès des imprimeurs et clients.
                                    </p>
                                </div>
                            </div>

                            <button 
                                onClick={() => { setShowInfo(false); setShowTariffs(true); }}
                                className="w-full bg-primary text-accent py-4 sm:py-6 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform shadow-xl shrink-0"
                            >
                                Voir les tarifs d'exposition
                                <ArrowRight size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AdBanner;
