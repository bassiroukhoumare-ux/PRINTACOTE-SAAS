import React, { useState } from 'react';
import { Phone, ArrowRight, MessageCircle, X, Clock, Zap, Info, Image as ImageIcon, Video, Palette } from 'lucide-react';

const AdBanner = ({ dark = false }) => {
    const [showTariffs, setShowTariffs] = useState(false);
    const [showInfo, setShowInfo] = useState(false);

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
