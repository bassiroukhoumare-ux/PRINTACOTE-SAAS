import React, { useEffect, useRef } from 'react';
import { ArrowRight, Store, Plus } from 'lucide-react';
import gsap from 'gsap';

const Hero = ({ setPage }) => {
    const heroRef = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('.hero-content > *', {
                y: 50,
                opacity: 0,
                stagger: 0.1,
                ease: 'power4.out',
                duration: 1.2,
                delay: 0.3,
            });
            
            gsap.to('.hero-image', {
                scale: 1.1,
                duration: 20,
                repeat: -1,
                yoyo: true,
                ease: 'none'
            });

            gsap.from('.hero-letter', {
                y: 100,
                opacity: 0,
                rotateX: -90,
                stagger: 0.05,
                duration: 1.2,
                ease: 'back.out(1.7)',
                delay: 1
            });

            gsap.from('.animated-title-part', {
                y: 100,
                opacity: 0,
                duration: 1.5,
                ease: 'power4.out',
                delay: 1.5
            });
        }, heroRef);
        return () => ctx.revert();
    }, []);

    return (
        <section ref={heroRef} className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-primary pt-20">
            {/* Background Layer */}
            <div className="absolute inset-0 z-0">
                <img 
                    src="https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?q=80&w=2500&auto=format&fit=crop" 
                    alt="Printing background" 
                    className="hero-image w-full h-full object-cover opacity-30 mix-blend-overlay"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-primary/80 via-primary/50 to-primary"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-transparent to-primary opacity-60"></div>
                
                {/* Decorative Elements */}
                <div className="absolute top-1/4 left-10 w-64 h-64 bg-accent/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-primary/40 rounded-full blur-[150px]"></div>
            </div>

            <div className="container mx-auto px-6 relative z-10">
                    <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-6">
                        <h1 className="flex flex-col gap-2">
                            <span className="text-6xl md:text-8xl font-black text-white leading-none tracking-tighter">Trouvez</span>
                            <span className="text-6xl md:text-8xl font-serif italic text-[#F5F5DC] leading-none tracking-tighter italic flex overflow-hidden">
                                {"l'imprimerie".split("").map((char, i) => (
                                    <span key={i} className="hero-letter inline-block">{char}</span>
                                ))}
                            </span>
                            <div className="overflow-hidden pb-2">
                                <span className="animated-title-part block text-2xl md:text-4xl font-bold text-[#F5F5DC]/80 tracking-tight">le plus proche de vous.</span>
                            </div>
                        </h1>
                        
                        <p className="text-base md:text-xl text-[#F5F2EB]/60 max-w-xl mx-auto font-medium leading-relaxed">
                            Connectez-vous instantanément avec les meilleurs ateliers d'impression près de chez vous.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-3 pt-4">
                            <button 
                                onClick={() => setPage('printers')} 
                                className="group bg-white text-primary px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all w-fit mx-auto sm:mx-0"
                            >
                                <Store size={16} />
                                Trouver un imprimeur
                                <ArrowRight size={16} />
                            </button>
                            
                            <button 
                                onClick={() => setPage('register')} 
                                className="bg-[#F5F5DC] text-[#3D0B37] px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all w-fit mx-auto sm:mx-0"
                            >
                                <Plus size={16} />
                                Inscrire mon imprimerie
                            </button>
                        </div>
                    </div>

                </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 animate-bounce opacity-40">
                <div className="w-px h-12 bg-gradient-to-b from-white to-transparent"></div>
            </div>
        </section>
    );
};

export default Hero;
