import React, { useState } from 'react';
import { Phone, ArrowRight, MessageCircle, X, Clock, Zap, Info, Image as ImageIcon, Video, Palette } from 'lucide-react';

const AdBanner = () => {
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
            <div className="w-full bg-primary/5 border border-primary/10 rounded-[3rem] p-8 md:p-12 mb-12 flex flex-col lg:flex-row items-center justify-between gap-10 relative overflow-hidden group">
                {/* Background Decorative Blur */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-[80px] -mr-32 -mt-32 group-hover:scale-150 transition-transform duration-700"></div>
                
                <div className="relative z-10 text-center lg:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/20 text-accent rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                        Espace Partenaire
                    </div>
                    <h3 className="font-black text-3xl md:text-4xl text-primary leading-tight mb-4">
                        Propulsez votre marque ici.
                    </h3>
                    <p className="text-primary/60 text-lg max-w-xl font-medium">
                        Rejoignez la régie publicitaire Printacote et touchez directement vos futurs clients en quête d'impression.
                    </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 relative z-10 w-full lg:w-auto">
                    <button 
                        onClick={() => setShowTariffs(true)}
                        className="bg-[#F5F5DC] text-[#3D0B37] px-8 py-5 rounded-2xl font-black flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl"
                    >
                        <MessageCircle size={20} />
                        Contacter le support
                    </button>
                    <button 
                        onClick={() => setShowInfo(true)}
                        className="bg-white border border-primary/10 text-primary px-8 py-5 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-primary/5 transition-all"
                    >
                        En savoir plus
                        <ArrowRight size={20} />
                    </button>
                </div>
            </div>

            {/* Tariffs Popup */}
            {showTariffs && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-primary/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] w-full max-w-xl overflow-hidden shadow-2xl border border-primary/10 animate-in zoom-in-95 duration-300">
                        <div className="bg-primary p-8 text-accent flex justify-between items-center">
                            <div>
                                <h4 className="text-2xl font-black mb-1">Tarifs Publicitaires</h4>
                                <p className="text-accent/60 text-sm font-bold tracking-wider uppercase">Choisissez votre durée</p>
                            </div>
                            <button onClick={() => setShowTariffs(false)} className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-4">
                            <div className="bg-accent/5 p-6 rounded-2xl border border-primary/5 mb-6">
                                <p className="text-primary/70 font-medium leading-relaxed">
                                    Exposez votre bannière publicitaire à des milliers d'utilisateurs qualifiés. La conception de votre affiche est <span className="font-black text-primary">offerte</span>.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {tariffs.map((t, i) => (
                                    <button 
                                        key={i}
                                        onClick={() => contactWhatsApp(t.duration, t.price)}
                                        className="flex items-center justify-between p-6 bg-white border border-primary/5 rounded-2xl hover:border-primary/30 hover:bg-primary hover:text-accent transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center group-hover:bg-accent/10">
                                                <Clock size={20} />
                                            </div>
                                            <div className="text-left">
                                                <div className="font-black text-lg">{t.label || `${t.duration} jours`}</div>
                                                <div className="text-sm opacity-60 font-bold uppercase tracking-widest">Exposition Garantie</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-xl font-black">{t.price}</div>
                                            <Zap size={20} className="text-yellow-500 group-hover:text-accent" fill="currentColor" />
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-primary/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl border border-primary/10 animate-in zoom-in-95 duration-300">
                        <div className="bg-primary p-10 text-accent flex justify-between items-start">
                            <div>
                                <h4 className="text-3xl font-black mb-2">Concept Publicitaire</h4>
                                <p className="text-accent/60 font-bold tracking-widest uppercase text-xs">Propulsez votre activité</p>
                            </div>
                            <button onClick={() => setShowInfo(false)} className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-10 space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center text-primary">
                                        <ImageIcon size={28} />
                                    </div>
                                    <h5 className="text-xl font-black text-primary">Affiches & Photos</h5>
                                    <p className="text-primary/60 text-sm leading-relaxed font-medium">
                                        Exposez vos produits via des visuels haute définition. Nous prenons en charge la **conception graphique** de votre affiche gratuitement dès la souscription.
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center text-primary">
                                        <Video size={28} />
                                    </div>
                                    <h5 className="text-xl font-black text-primary">Vidéos & Animations</h5>
                                    <p className="text-primary/60 text-sm leading-relaxed font-medium">
                                        Captivez l'audience avec des vidéos ou des affiches animées. *Note : La création vidéo est facturée séparément du prix d'exposition.*
                                    </p>
                                </div>
                            </div>

                            <div className="bg-accent rounded-[2rem] p-8 border border-primary/10 flex items-start gap-6">
                                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-accent shrink-0">
                                    <Palette size={24} />
                                </div>
                                <div>
                                    <h5 className="text-lg font-black text-primary mb-2">Conception incluse</h5>
                                    <p className="text-primary/70 text-sm font-medium leading-relaxed">
                                        Pour toute campagne d'affichage, notre équipe créative construit votre visuel publicitaire pour garantir un impact maximal auprès des imprimeurs et clients.
                                    </p>
                                </div>
                            </div>

                            <button 
                                onClick={() => { setShowInfo(false); setShowTariffs(true); }}
                                className="w-full bg-primary text-accent py-6 rounded-2xl font-black flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform shadow-xl"
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
