import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, MapPin, Clock, User, Store, ShoppingCart, Newspaper, CheckCircle } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const Navbar = ({ setPage, currentPage }) => {
    const navRef = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            ScrollTrigger.create({
                start: 'top -80',
                onUpdate: (self) => {
                    if (self.direction === 1 || self.progress > 0) {
                        gsap.to(navRef.current, { backgroundColor: 'rgba(242, 240, 233, 0.6)', backdropFilter: 'blur(16px)', borderColor: 'rgba(0,0,0,0.05)', color: '#1A1A1A', duration: 0.3 });
                    } else {
                        gsap.to(navRef.current, { backgroundColor: 'transparent', backdropFilter: 'blur(0px)', borderColor: 'transparent', color: '#F2F0E9', duration: 0.3 });
                    }
                }
            });
        }, navRef);
        return () => ctx.revert();
    }, []);

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full px-6 flex justify-center">
            <nav ref={navRef} className="flex items-center justify-between gap-4 md:gap-8 px-6 py-3 rounded-[2rem] border border-transparent transition-colors text-[#F2F0E9] w-full max-w-5xl bg-primary/40 backdrop-blur-md">
                <div className="flex items-center gap-8">
                    <a href="#" onClick={(e) => { e.preventDefault(); setPage('home'); }} className="font-bold text-xl font-sans tracking-tight shrink-0">Printacote</a>
                    <div className="hidden md:flex gap-6 text-sm font-medium opacity-90">
                        <a href="#" onClick={(e) => { e.preventDefault(); setPage('home'); }} className={`hover-lift ${currentPage === 'home' ? 'text-accent' : ''}`}>Accueil</a>
                        <a href="#" onClick={(e) => { e.preventDefault(); setPage('marketplace'); }} className={`hover-lift flex items-center gap-1 ${currentPage === 'marketplace' ? 'text-accent' : ''}`}><ShoppingCart size={16} /> Marketplace</a>
                        <a href="#" onClick={(e) => { e.preventDefault(); setPage('news'); }} className={`hover-lift flex items-center gap-1 ${currentPage === 'news' ? 'text-accent' : ''}`}><Newspaper size={16} /> Actualités</a>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setPage('login')} className="hidden sm:block text-sm font-bold hover:text-accent transition-colors">
                        Se connecter
                    </button>
                    <button onClick={() => setPage('register')} className="magnetic-btn bg-accent text-white px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2 shrink-0">
                        <span>S'inscrire</span>
                    </button>
                </div>
            </nav>
        </div>
    );
};

const Hero = ({ setPage }) => {
    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('.hero-text', {
                y: 40,
                opacity: 0,
                stagger: 0.08,
                ease: 'power3.out',
                duration: 1,
                delay: 0.2,
            });
        });
        return () => ctx.revert();
    }, []);

    return (
        <section className="relative h-[100dvh] w-full overflow-hidden bg-primary flex items-end">
            <div className="absolute inset-0 w-full h-full">
                <img 
                    src="https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?q=80&w=2500&auto=format&fit=crop" 
                    alt="Imprimerie numérique et couleurs CMJN" 
                    className="w-full h-full object-cover opacity-50"
                />
                <div className="absolute inset-0 bg-hero-gradient"></div>
            </div>
            
            <div className="relative z-10 w-full px-8 md:px-16 pb-24 md:pb-32 flex flex-col md:w-2/3">
                <h1 className="text-[#F2F0E9] flex flex-col gap-2">
                    <span className="hero-text text-3xl md:text-5xl font-sans font-bold tracking-tight">Printacote est la</span>
                    <span className="hero-text text-6xl md:text-8xl font-serif italic font-semibold leading-none tracking-tight">Connexion.</span>
                </h1>
                <p className="hero-text text-[#F2F0E9]/80 mt-6 text-lg max-w-xl font-sans">
                    Trouvez l'imprimerie la plus proche de vous en un instant, ou développez votre vitrine d'imprimeur numérique pour capter plus de commandes.
                </p>
                <div className="hero-text mt-10 flex flex-col sm:flex-row gap-4">
                    <button onClick={() => setPage('home')} className="magnetic-btn bg-accent text-white px-8 py-4 rounded-[2rem] text-lg font-bold flex items-center justify-center gap-2">
                        <span>Trouver un imprimeur</span>
                        <MapPin size={20} />
                    </button>
                    <button onClick={() => setPage('register')} className="magnetic-btn bg-transparent border-2 border-[#F2F0E9]/30 text-[#F2F0E9] px-8 py-4 rounded-[2rem] text-lg font-bold flex items-center justify-center gap-2 hover:bg-[#F2F0E9]/10 transition-colors">
                        <span>S'inscrire</span>
                        <User size={20} />
                    </button>
                </div>
            </div>
        </section>
    );
};

const Features = () => {
    return (
        <section id="features" className="py-24 md:py-32 px-6 md:px-16 bg-[#F2F0E9]">
            <div className="max-w-7xl mx-auto flex flex-col gap-16">
                <div className="text-center max-w-3xl mx-auto mb-8">
                    <h2 className="text-4xl md:text-5xl font-serif italic font-bold text-dark">Une plateforme, deux écosystèmes.</h2>
                    <p className="mt-4 text-lg text-dark/70 font-sans">Que vous ayez besoin d'imprimer ou que vous soyez le professionnel derrière les machines, nous avons optimisé l'expérience pour vous.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Client Card */}
                    <div className="bg-white rounded-[3rem] p-10 md:p-14 shadow-sm border border-dark/5 flex flex-col hover-lift">
                        <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-8">
                            <User size={32} />
                        </div>
                        <h3 className="text-3xl font-bold font-sans text-dark tracking-tight">Pour les Clients</h3>
                        <p className="text-dark/70 mt-4 text-lg leading-relaxed">
                            Trouvez l'imprimeur idéal autour de vous. Comparez les offres, envoyez vos fichiers et suivez vos impressions en temps réel.
                        </p>
                        <ul className="mt-8 flex flex-col gap-4 font-mono text-sm text-dark/80">
                            <li className="flex items-center gap-3"><CheckCircle size={20} className="text-accent" /> <span>Géolocalisation des imprimeries</span></li>
                            <li className="flex items-center gap-3"><CheckCircle size={20} className="text-accent" /> <span>Comparaison de devis instantanée</span></li>
                            <li className="flex items-center gap-3"><CheckCircle size={20} className="text-accent" /> <span>Suivi de production en ligne</span></li>
                        </ul>
                        <div className="mt-12 mt-auto relative h-48 rounded-[2rem] bg-background border border-dark/5 overflow-hidden flex items-center justify-center">
                            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#1A1A1A 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                            <div className="relative z-10 bg-white p-4 rounded-xl shadow-lg flex items-center gap-4 animate-bounce" style={{ animationDuration: '3s' }}>
                                <MapPin size={24} className="text-accent" />
                                <div>
                                    <div className="font-bold text-sm">Imprimerie Express</div>
                                    <div className="text-xs text-dark/50">À 1.2 km de vous</div>
                                </div>
                                <div className="ml-4 bg-accent/10 text-accent text-xs font-bold px-2 py-1 rounded">Ouvert</div>
                            </div>
                        </div>
                    </div>

                    {/* Printer Card */}
                    <div className="bg-primary text-background rounded-[3rem] p-10 md:p-14 shadow-lg flex flex-col hover-lift relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-[80px] -mr-20 -mt-20"></div>
                        <div className="relative z-10">
                            <div className="w-16 h-16 bg-background/10 text-background rounded-2xl flex items-center justify-center mb-8">
                                <Store size={32} />
                            </div>
                            <h3 className="text-3xl font-bold font-sans text-background tracking-tight">Pour les Imprimeurs</h3>
                            <p className="text-background/80 mt-4 text-lg leading-relaxed">
                                Digitalisez votre activité. Déployez une vitrine en 2 minutes, recevez des commandes, et accédez à notre marketplace de consommables.
                            </p>
                            <ul className="mt-8 flex flex-col gap-4 font-mono text-sm text-background/90">
                                <li className="flex items-center gap-3"><CheckCircle size={20} className="text-accent" /> <span>Vitrine numérique optimisée SEO</span></li>
                                <li className="flex items-center gap-3"><CheckCircle size={20} className="text-accent" /> <span>Gestion des commandes simplifiée</span></li>
                                <li className="flex items-center gap-3"><CheckCircle size={20} className="text-accent" /> <span>Achat/Revente de consommables</span></li>
                            </ul>
                        </div>
                        <div className="mt-12 mt-auto relative h-48 rounded-[2rem] bg-dark/50 border border-background/10 overflow-hidden flex flex-col items-center justify-end p-6 z-10">
                            <div className="w-full bg-background/10 h-8 rounded-md mb-3 flex items-center px-4">
                                <div className="w-2 h-2 rounded-full bg-accent animate-pulse mr-2"></div>
                                <div className="text-xs font-mono opacity-70">Nouvelle commande #4092</div>
                            </div>
                            <div className="w-full bg-background/5 h-8 rounded-md mb-3 flex items-center px-4">
                                <div className="w-2 h-2 rounded-full bg-background/50 mr-2"></div>
                                <div className="text-xs font-mono opacity-50">Commande #4091 livrée</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

const Philosophy = () => {
    const textRef = useRef(null);
    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('.philo-line', {
                scrollTrigger: {
                    trigger: textRef.current,
                    start: 'top 80%',
                },
                y: 40,
                opacity: 0,
                stagger: 0.15,
                duration: 1,
                ease: 'power3.out',
            });
        }, textRef);
        return () => ctx.revert();
    }, []);

    return (
        <section className="relative py-32 md:py-40 px-6 md:px-16 bg-dark text-background overflow-hidden philo-section">
            <div className="absolute inset-0 w-full h-full opacity-15">
                <img 
                    src="https://images.unsplash.com/photo-1586075010923-2dd4570fb338?q=80&w=2500&auto=format&fit=crop" 
                    alt="Texture papier et impression" 
                    className="w-full h-full object-cover grayscale"
                />
            </div>
            <div ref={textRef} className="relative z-10 max-w-4xl mx-auto flex flex-col gap-12">
                <p className="philo-line text-lg md:text-xl font-sans text-background/60">
                    La plupart des plateformes se concentrent sur : l'intermédiation complexe et lente.
                </p>
                <h2 className="philo-line text-4xl sm:text-5xl md:text-7xl font-serif italic font-semibold leading-tight">
                    Nous nous concentrons sur : <span className="text-accent not-italic font-sans tracking-tight block mt-2">l'instantanéité.</span>
                </h2>
            </div>
        </section>
    );
};

const CTA = ({ setPage }) => (
    <section className="py-24 md:py-32 px-4 md:px-16 bg-[#F2F0E9] flex justify-center">
        <div className="bg-primary text-background rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-16 w-full max-w-5xl flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-hero-gradient opacity-30"></div>
            <div className="relative z-10 flex flex-col items-center gap-8">
                <h2 className="text-3xl sm:text-4xl md:text-6xl font-sans font-bold tracking-tight">Prêt à rejoindre l'écosystème ?</h2>
                <p className="text-base sm:text-lg md:text-xl text-background/80 max-w-2xl font-sans">
                    Que vous soyez imprimeur ou client, trouvez votre place dans le réseau local dès aujourd'hui.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full sm:w-auto">
                    <button onClick={() => setPage('register')} className="magnetic-btn bg-accent text-white px-8 py-4 rounded-full font-bold text-lg w-full sm:w-auto">
                        Créer un compte
                    </button>
                </div>
            </div>
        </div>
    </section>
);

const Footer = ({ setPage }) => (
    <footer className="bg-dark text-background rounded-t-[3rem] sm:rounded-t-[4rem] px-8 md:px-16 pt-24 pb-12 flex flex-col gap-12 sm:gap-16 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 border-b border-background/10 pb-12 sm:pb-16">
            <div className="flex flex-col gap-6 md:col-span-2">
                <div className="font-bold text-3xl font-sans tracking-tight">Printacote</div>
                <p className="text-background/60 max-w-sm font-sans">La connexion instantanée entre imprimeurs et clients locaux. Marketplace et annuaire numérique de confiance.</p>
            </div>
            <div className="flex flex-col gap-4">
                <h4 className="font-mono text-sm uppercase text-background/40">Plateforme</h4>
                <a href="#" onClick={(e) => { e.preventDefault(); setPage('home'); }} className="hover:text-accent transition-colors">Accueil</a>
                <a href="#" onClick={(e) => { e.preventDefault(); setPage('marketplace'); }} className="hover:text-accent transition-colors">Marketplace</a>
                <a href="#" onClick={(e) => { e.preventDefault(); setPage('news'); }} className="hover:text-accent transition-colors">Actualités</a>
            </div>
            <div className="flex flex-col gap-4">
                <h4 className="font-mono text-sm uppercase text-background/40">Accès</h4>
                <a href="#" onClick={(e) => { e.preventDefault(); setPage('login'); }} className="hover:text-accent transition-colors">Se connecter</a>
                <a href="#" onClick={(e) => { e.preventDefault(); setPage('register'); }} className="hover:text-accent transition-colors">Créer un compte</a>
            </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
            <p className="text-background/40 text-sm">© 2026 Printacote. Tous droits réservés.</p>
            <div className="flex items-center gap-2 bg-background/5 px-4 py-2 rounded-full">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="font-mono text-xs text-background/80">Système Opérationnel</span>
            </div>
        </div>
    </footer>
);

// --- Pages ---

const Home = ({ setPage }) => (
    <>
        <Hero setPage={setPage} />
        <Features />
        <Philosophy />
        <CTA setPage={setPage} />
    </>
);

const Marketplace = () => {
    const products = [
        { id: 1, name: "Encre Cyan Pro 500ml", price: "45.00 €", category: "Encre" },
        { id: 2, name: "Papier Couché Brillant 300g (x500)", price: "120.00 €", category: "Papier" },
        { id: 3, name: "Cartouche Toner Noir XL", price: "85.00 €", category: "Toner" },
        { id: 4, name: "Rouleau Adhésif Vinyle Blanc 50m", price: "210.00 €", category: "Support" },
        { id: 5, name: "Pièce de rechange Traceur Tête", price: "450.00 €", category: "Matériel" },
        { id: 6, name: "Papier Recyclé Mat 135g (x1000)", price: "65.00 €", category: "Papier" }
    ];

    return (
        <div className="min-h-screen pt-32 pb-24 px-6 md:px-16 bg-background">
            <div className="max-w-7xl mx-auto">
                <div className="mb-12">
                    <h1 className="text-4xl md:text-6xl font-serif italic font-bold text-dark mb-4">Marketplace Consommables</h1>
                    <p className="text-lg text-dark/70 max-w-2xl">L'espace dédié aux imprimeurs pour acheter et revendre du matériel et des consommables professionnels.</p>
                </div>
                <div className="flex flex-col md:flex-row gap-8">
                    <div className="w-full md:w-64 shrink-0">
                        <div className="bg-white p-6 rounded-[2rem] border border-dark/5 sticky top-32">
                            <h3 className="font-bold text-lg mb-4">Catégories</h3>
                            <div className="flex flex-col gap-3 text-dark/70">
                                <label className="flex items-center gap-2"><input type="checkbox" className="accent-accent" /> Encres & Toners</label>
                                <label className="flex items-center gap-2"><input type="checkbox" className="accent-accent" /> Papiers & Supports</label>
                                <label className="flex items-center gap-2"><input type="checkbox" className="accent-accent" /> Pièces & Matériel</label>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {products.map(p => (
                            <div key={p.id} className="bg-white rounded-[2rem] p-6 border border-dark/5 flex flex-col hover-lift transition-all">
                                <div className="w-full h-40 bg-background rounded-xl mb-4 flex items-center justify-center text-dark/20">
                                    <ShoppingCart size={40} />
                                </div>
                                <div className="text-xs font-mono text-accent mb-2 uppercase">{p.category}</div>
                                <h4 className="font-bold text-lg mb-2">{p.name}</h4>
                                <div className="mt-auto pt-4 flex items-center justify-between border-t border-dark/5">
                                    <span className="font-mono font-bold text-xl">{p.price}</span>
                                    <button className="bg-dark text-white p-2 rounded-lg hover:bg-accent transition-colors"><ShoppingCart size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const News = () => {
    const articles = [
        { id: 1, title: "L'évolution de l'impression numérique en 2026", date: "12 Mai 2026", excerpt: "Découvrez comment les nouvelles technologies réduisent les coûts et accélèrent la production..." },
        { id: 2, title: "Comment choisir le bon papier pour ses flyers ?", date: "05 Mai 2026", excerpt: "Le grammage, la finition, le pelliculage... Tout ce qu'il faut savoir pour un rendu professionnel." },
        { id: 3, title: "L'éco-responsabilité dans le domaine de l'imprimerie", date: "28 Avr 2026", excerpt: "Les encres végétales et le papier recyclé sont désormais la norme. Analyse de cette transition." }
    ];

    return (
        <div className="min-h-screen pt-32 pb-24 px-6 md:px-16 bg-background">
            <div className="max-w-5xl mx-auto">
                <div className="mb-12 text-center">
                    <h1 className="text-4xl md:text-6xl font-serif italic font-bold text-dark mb-4">Actualités de l'Imprimerie</h1>
                    <p className="text-lg text-dark/70">Restez informé des dernières tendances et conseils du monde de l'impression.</p>
                </div>
                <div className="flex flex-col gap-8">
                    {articles.map(a => (
                        <article key={a.id} className="bg-white p-8 rounded-[2rem] border border-dark/5 hover-lift flex flex-col md:flex-row gap-8 items-center cursor-pointer">
                            <div className="w-full md:w-64 h-48 bg-dark/5 rounded-xl shrink-0 flex items-center justify-center text-dark/20">
                                <Newspaper size={48} />
                            </div>
                            <div className="flex-1">
                                <div className="text-accent font-mono text-sm mb-3">{a.date}</div>
                                <h2 className="text-2xl font-bold font-sans mb-4">{a.title}</h2>
                                <p className="text-dark/70 leading-relaxed mb-6">{a.excerpt}</p>
                                <span className="text-primary font-bold hover:text-accent transition-colors flex items-center gap-1">Lire la suite <ArrowRight size={16} /></span>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </div>
    );
};

const Login = ({ setPage }) => {
    return (
        <div className="min-h-screen flex items-center justify-center px-6 bg-background bg-[url('https://images.unsplash.com/photo-1562664347-4950157077a9?q=80&w=2500&auto=format&fit=crop')] bg-cover bg-center">
            <div className="absolute inset-0 bg-primary/80 backdrop-blur-sm"></div>
            <div className="relative z-10 w-full max-w-md bg-white p-10 rounded-[3rem] shadow-2xl">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-dark font-sans tracking-tight">Bon retour.</h2>
                    <p className="text-dark/60 mt-2">Connectez-vous à votre espace Printacote.</p>
                </div>
                <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); setPage('home'); }}>
                    <div>
                        <label className="block text-sm font-bold text-dark mb-2">Email</label>
                        <input type="email" placeholder="contact@exemple.com" className="w-full bg-background border border-dark/10 rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-colors" required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-dark mb-2">Mot de passe</label>
                        <input type="password" placeholder="••••••••" className="w-full bg-background border border-dark/10 rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-colors" required />
                    </div>
                    <div className="flex justify-end">
                        <a href="#" className="text-sm text-accent hover:underline">Mot de passe oublié ?</a>
                    </div>
                    <button type="submit" className="magnetic-btn bg-dark text-white font-bold py-4 rounded-xl mt-2 w-full">
                        Se connecter
                    </button>
                </form>
                <div className="mt-8 text-center text-sm text-dark/60">
                    Pas encore de compte ? <button onClick={() => setPage('register')} className="text-accent font-bold hover:underline">S'inscrire</button>
                </div>
            </div>
        </div>
    );
};

const Register = ({ setPage }) => {
    const [role, setRole] = useState('client');

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-24 bg-background bg-[url('https://images.unsplash.com/photo-1562664347-4950157077a9?q=80&w=2500&auto=format&fit=crop')] bg-cover bg-center">
            <div className="absolute inset-0 bg-primary/80 backdrop-blur-sm"></div>
            <div className="relative z-10 w-full max-w-lg bg-white p-10 rounded-[3rem] shadow-2xl">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-dark font-sans tracking-tight">Rejoindre le réseau.</h2>
                    <p className="text-dark/60 mt-2">Créez votre compte en quelques secondes.</p>
                </div>
                
                <div className="flex bg-background rounded-xl p-1 mb-8">
                    <button 
                        onClick={() => setRole('client')}
                        className={`flex-1 py-3 text-sm font-bold rounded-lg transition-colors ${role === 'client' ? 'bg-white shadow-sm text-dark' : 'text-dark/50 hover:text-dark'}`}
                    >
                        Je suis un Client
                    </button>
                    <button 
                        onClick={() => setRole('printer')}
                        className={`flex-1 py-3 text-sm font-bold rounded-lg transition-colors ${role === 'printer' ? 'bg-white shadow-sm text-dark' : 'text-dark/50 hover:text-dark'}`}
                    >
                        Je suis un Imprimeur
                    </button>
                </div>

                <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); setPage('home'); }}>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-dark mb-2">Prénom</label>
                            <input type="text" className="w-full bg-background border border-dark/10 rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-colors" required />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-dark mb-2">Nom</label>
                            <input type="text" className="w-full bg-background border border-dark/10 rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-colors" required />
                        </div>
                    </div>
                    {role === 'printer' && (
                        <div>
                            <label className="block text-sm font-bold text-dark mb-2">Nom de l'imprimerie</label>
                            <input type="text" placeholder="Ex: Imprimerie Express" className="w-full bg-background border border-dark/10 rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-colors" required />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-bold text-dark mb-2">Email</label>
                        <input type="email" className="w-full bg-background border border-dark/10 rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-colors" required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-dark mb-2">Mot de passe</label>
                        <input type="password" placeholder="••••••••" className="w-full bg-background border border-dark/10 rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-colors" required />
                    </div>
                    <button type="submit" className="magnetic-btn bg-accent text-white font-bold py-4 rounded-xl mt-2 w-full">
                        Créer mon compte
                    </button>
                </form>
                <div className="mt-8 text-center text-sm text-dark/60">
                    Déjà un compte ? <button onClick={() => setPage('login')} className="text-dark font-bold hover:underline">Se connecter</button>
                </div>
            </div>
        </div>
    );
};

export default function App() {
    const [page, setPage] = useState('home');

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [page]);

    return (
        <div className="relative w-full">
            <div className="noise-overlay" />
            <Navbar setPage={setPage} currentPage={page} />
            
            {page === 'home' && <Home setPage={setPage} />}
            {page === 'marketplace' && <Marketplace />}
            {page === 'news' && <News />}
            {page === 'login' && <Login setPage={setPage} />}
            {page === 'register' && <Register setPage={setPage} />}
            
            {page !== 'login' && page !== 'register' && <Footer setPage={setPage} />}
        </div>
    );
}
