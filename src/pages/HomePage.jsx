import React, { useEffect, useRef } from 'react';
import Hero from '../components/Hero';
import AdBanner from '../components/AdBanner';
import { ArrowRight, CheckCircle, MapPin, Star, ShieldCheck, Zap, Globe } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const HomePage = ({ setPage }) => {
    const sectionRef = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('.feature-card', {
                scrollTrigger: {
                    trigger: '.features-grid',
                    start: 'top 80%',
                },
                y: 50,
                opacity: 0,
                stagger: 0.1,
                ease: 'power3.out',
                duration: 1
            });
        }, sectionRef);
        return () => ctx.revert();
    }, []);

    return (
        <div ref={sectionRef} className="bg-background text-primary">
            <Hero setPage={setPage} />

            <section className="py-12 container mx-auto px-6">
                <AdBanner />
            </section>

            {/* Why Us Section - Re-developed with Brand Palette */}
            <section className="py-32 bg-[#3D0B37] rounded-[4rem] text-white overflow-hidden relative mb-20 shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#F5F5DC]/5 rounded-full blur-[120px] -mr-48 -mt-48"></div>
                
                <div className="container mx-auto px-6 relative z-10">
                    <div className="flex flex-col items-center text-center mb-24">
                        <h2 className="text-xs font-mono text-[#3D0B37] uppercase tracking-[0.4em] font-black mb-6 px-6 py-2 bg-[#F5F5DC] rounded-full inline-block">Pourquoi nous choisir ?</h2>
                        <h3 className="text-4xl md:text-7xl font-black text-white tracking-tighter max-w-3xl leading-[1.1]">
                            La plateforme qui connecte <br/><span className="italic font-serif text-[#F5F5DC]">le talent et la demande.</span>
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* For Clients */}
                        <div className="bg-white/5 backdrop-blur-md rounded-[3rem] p-12 border border-white/10 shadow-xl hover:bg-white/10 transition-all duration-500 group">
                            <div className="w-20 h-20 bg-[#F5F5DC] rounded-[2rem] flex items-center justify-center text-[#3D0B37] mb-10 shadow-2xl group-hover:scale-110 transition-transform">
                                <Star size={40} fill="currentColor" />
                            </div>
                            <h4 className="text-3xl font-black text-white mb-8">Pour les Clients</h4>
                            <ul className="space-y-6">
                                {[
                                    "Trouvez l'imprimeur idéal en quelques clics grâce à la géolocalisation.",
                                    "Accédez à des ateliers certifiés pour une qualité garantie.",
                                    "Commandez vos maquettes prêtes à l'emploi sur notre marketplace.",
                                    "Gagnez du temps avec des devis instantanés via WhatsApp."
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-4 text-white/70 font-medium text-lg">
                                        <CheckCircle size={24} className="text-[#F5F5DC] mt-1 shrink-0" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* For Printers */}
                        <div className="bg-[#F5F5DC] rounded-[3rem] p-12 shadow-2xl hover:scale-[1.02] transition-all duration-500 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#3D0B37]/5 rounded-full -mr-32 -mt-32"></div>
                            <div className="w-20 h-20 bg-[#3D0B37] rounded-[2rem] flex items-center justify-center text-[#F5F5DC] mb-10 shadow-2xl group-hover:scale-110 transition-transform">
                                <Zap size={40} fill="currentColor" />
                            </div>
                            <h4 className="text-3xl font-black text-[#3D0B37] mb-8">Pour les Imprimeurs</h4>
                            <ul className="space-y-6">
                                {[
                                    "Augmentez votre visibilité numérique sans effort technique.",
                                    "Gérez vos commandes et votre portfolio via un dashboard pro.",
                                    "Vendez vos surplus de matériel sur notre marketplace dédiée.",
                                    "Rejoignez une communauté d'experts et développez votre réseau."
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-4 text-[#3D0B37]/80 font-medium text-lg">
                                        <CheckCircle size={24} className="text-[#3D0B37] mt-1 shrink-0" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust Section - Beige Lin Palette */}
            <section className="py-32 bg-[#F5F5DC] rounded-[4rem] text-[#3D0B37] overflow-hidden relative mb-20 shadow-xl border border-primary/5">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="grid-beige" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#3D0B37" strokeWidth="1" strokeOpacity="0.1"/>
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid-beige)" />
                    </svg>
                </div>
                
                <div className="container mx-auto px-6 flex flex-col lg:flex-row items-center gap-20 relative z-10">
                    <div className="lg:w-1/2 space-y-10">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#3D0B37]/5 rounded-full border border-[#3D0B37]/10 text-[#3D0B37] text-xs font-bold uppercase tracking-widest">
                            Impact Local
                        </div>
                        <h2 className="text-5xl md:text-7xl font-black leading-[1.1] tracking-tight text-[#3D0B37]">
                            Digitalisez votre <br />
                            <span className="italic font-serif">atelier d'impression.</span>
                        </h2>
                        <p className="text-[#3D0B37]/70 text-xl leading-relaxed max-w-xl font-medium">
                            Printacote offre aux imprimeurs une vitrine numérique puissante pour atteindre de nouveaux clients et gérer leur catalogue de produits facilement.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-10 items-center">
                            <button onClick={() => setPage('register')} className="bg-[#3D0B37] text-[#F5F5DC] px-10 py-5 rounded-2xl font-black flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-2xl">
                                Inscrire mon imprimerie
                                <ArrowRight size={20} />
                            </button>
                        </div>
                    </div>
                    
                    <div className="lg:w-1/2 relative">
                        <div className="relative group">
                            <div className="absolute -inset-4 bg-primary/20 rounded-[4rem] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                            <div className="relative bg-white/5 backdrop-blur-xl rounded-[3rem] p-4 border border-white/10 shadow-2xl overflow-hidden">
                                <img 
                                    src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop" 
                                    alt="Dashboard Analytics" 
                                    className="rounded-[2rem] shadow-2xl transition-transform duration-700 group-hover:scale-[1.02]"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#3D0B37]/40 to-transparent pointer-events-none"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HomePage;
