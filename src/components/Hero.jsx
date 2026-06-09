import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Store, Plus } from 'lucide-react';
import gsap from 'gsap';

const ROTATING_WORDS = [
    'page en ligne.',
    'page sur internet.',
    'présence en ligne.',
    'place sur internet.',
    'espace en ligne.',
    'adresse en ligne.',
];

const Hero = ({ setPage }) => {
    const heroRef = useRef(null);
    const line3Ref = useRef(null);
    const ctaRef = useRef(null);
    const [wordIndex, setWordIndex] = useState(0);

    // ── Entrance animation (lines appear all at once, bottom → top) ──
    useEffect(() => {
        const ctx = gsap.context(() => {
            const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

            gsap.to('.hero-image', {
                scale: 1.05,
                duration: 16,
                repeat: -1,
                yoyo: true,
                ease: 'none',
            });

            tl.from('.hero-line', {
                y: '110%',
                opacity: 0,
                stagger: 0.1,
                duration: 0.85,
                delay: 0.15,
            });

            tl.from('.hero-subtitle', {
                y: 14,
                opacity: 0,
                duration: 0.65,
            }, '-=0.45');

            if (ctaRef.current) {
                tl.from(ctaRef.current.children, {
                    y: 10,
                    opacity: 0,
                    stagger: 0.08,
                    duration: 0.55,
                    clearProps: 'all',
                }, '-=0.4');
            }
        }, heroRef);

        return () => ctx.revert();
    }, []);

    // ── Rotating line 3 ──
    useEffect(() => {
        const interval = setInterval(() => {
            const el = line3Ref.current;
            if (!el) return;

            // Slide out upward
            gsap.to(el, {
                y: '-40%',
                opacity: 0,
                duration: 0.38,
                ease: 'power2.in',
                onComplete: () => {
                    setWordIndex(prev => (prev + 1) % ROTATING_WORDS.length);
                    // Reset position below, then slide in
                    gsap.fromTo(
                        el,
                        { y: '40%', opacity: 0 },
                        { y: '0%', opacity: 1, duration: 0.45, ease: 'power3.out' }
                    );
                },
            });
        }, 2800);

        return () => clearInterval(interval);
    }, []);

    return (
        <section
            ref={heroRef}
            className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-primary pt-20"
        >
            {/* Background */}
            <div className="absolute inset-0 z-0">
                <img
                    src="https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?q=80&w=2500&auto=format&fit=crop"
                    alt="Impression professionnelle"
                    className="hero-image w-full h-full object-cover opacity-30 mix-blend-overlay"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-primary/80 via-primary/50 to-primary" />
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-transparent to-primary opacity-60" />
                <div className="absolute top-1/4 left-10 w-64 h-64 bg-accent/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-primary/40 rounded-full blur-[150px]" />
            </div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-5">

                    {/* ── TITRE ── */}
                    <h1 className="flex flex-col items-center w-full select-none leading-[1.1] tracking-tight">

                        {/* Ligne 1 */}
                        <div className="overflow-hidden pb-[0.05em]">
                            <span
                                className="hero-line block font-black text-white
                                    text-[clamp(2.3rem,6vw,4.8rem)]"
                            >
                                Votre imprimerie
                            </span>
                        </div>

                        {/* Ligne 2 */}
                        <div className="overflow-hidden pb-[0.05em]">
                            <span
                                className="hero-line block font-black text-white
                                    text-[clamp(2.3rem,6vw,4.8rem)]"
                            >
                                mérite sa propre
                            </span>
                        </div>

                        {/* Ligne 3 — rotating, légèrement plus grande pour la mettre en valeur */}
                        <div className="overflow-hidden pt-[0.1em]">
                            <span
                                className="hero-line block font-black text-[#F5F5DC]
                                    text-[clamp(2.5rem,6.5vw,5.2rem)]"
                            >
                                <span ref={line3Ref} className="inline-block">
                                    {ROTATING_WORDS[wordIndex]}
                                </span>
                            </span>
                        </div>
                    </h1>

                    {/* ── SOUS-TITRE ── */}
                    <h2 className="hero-subtitle text-xs md:text-sm text-[#F5F2EB]/60 max-w-md mx-auto font-medium leading-relaxed">
                        Créez la vôtre en quelques minutes <br className="sm:hidden" />et laissez de nouveaux clients <br className="sm:hidden" />vous trouver près de chez vous.
                    </h2>

                    {/* ── CTA ── */}
                    <div ref={ctaRef} className="hero-cta flex justify-center pt-4">
                        <button
                            onClick={() => setPage('register')}
                            className="bg-[#F5F5DC] text-[#3D0B37] px-10 py-5 rounded-[2rem] text-base md:text-lg font-black flex items-center justify-center gap-3 shadow-2xl hover:scale-105 active:scale-95 transition-all w-fit font-sans"
                        >
                            <Plus size={20} />
                            Inscrire mon imprimerie gratuitement
                        </button>
                    </div>
                </div>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 animate-bounce opacity-40">
                <div className="w-px h-12 bg-gradient-to-b from-white to-transparent" />
            </div>
        </section>
    );
};

export default Hero;
