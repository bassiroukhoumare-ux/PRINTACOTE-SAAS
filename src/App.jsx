import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, MapPin, Clock, User, Store, ShoppingCart, Newspaper, CheckCircle, Star, MessageCircle, Phone, Award, Menu, X, ArrowLeft, Image as ImageIcon } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const Navbar = ({ setPage, currentPage }) => {
    const navRef = useRef(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleNav = (page) => {
        setPage(page);
        setIsMobileMenuOpen(false);
    };

    useEffect(() => {
        const ctx = gsap.context(() => {
            ScrollTrigger.create({
                start: 'top -80',
                onUpdate: (self) => {
                    if (self.direction === 1 || self.progress > 0) {
                        gsap.to(navRef.current, { backgroundColor: 'rgba(245, 242, 235, 0.8)', backdropFilter: 'blur(16px)', borderColor: 'rgba(0,0,0,0.05)', color: '#1A1518', duration: 0.3 });
                    } else {
                        gsap.to(navRef.current, { backgroundColor: 'transparent', backdropFilter: 'blur(0px)', borderColor: 'transparent', color: '#F5F2EB', duration: 0.3 });
                    }
                }
            });
        }, navRef);
        return () => ctx.revert();
    }, []);

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full px-6 flex justify-center">
            <nav ref={navRef} className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-8 px-6 py-3 rounded-[2rem] border border-transparent transition-colors text-[#F5F2EB] w-full max-w-5xl bg-primary/40 backdrop-blur-md">
                <div className="flex items-center justify-between w-full md:w-auto">
                    <a href="#" onClick={(e) => { e.preventDefault(); handleNav('home'); }} className="font-bold text-xl font-sans tracking-tight shrink-0">Printacote</a>
                    <button className="md:hidden p-1" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
                
                <div className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row gap-6 text-sm font-medium opacity-90 mt-4 md:mt-0`}>
                    <a href="#" onClick={(e) => { e.preventDefault(); handleNav('home'); }} className={`hover-lift ${currentPage === 'home' ? 'text-accent' : ''}`}>Accueil</a>
                    <a href="#" onClick={(e) => { e.preventDefault(); handleNav('printers'); }} className={`hover-lift flex items-center gap-1 ${currentPage === 'printers' || currentPage === 'printer_detail' ? 'text-accent' : ''}`}><Store size={16} /> Imprimeurs</a>
                    <a href="#" onClick={(e) => { e.preventDefault(); handleNav('marketplace'); }} className={`hover-lift flex items-center gap-1 ${currentPage === 'marketplace' ? 'text-accent' : ''}`}><ShoppingCart size={16} /> Marketplace</a>
                    <a href="#" onClick={(e) => { e.preventDefault(); handleNav('news'); }} className={`hover-lift flex items-center gap-1 ${currentPage === 'news' ? 'text-accent' : ''}`}><Newspaper size={16} /> Actualités</a>
                </div>

                <div className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row items-center gap-3 mt-4 md:mt-0`}>
                    <button onClick={() => handleNav('login')} className="text-sm font-bold hover:text-accent transition-colors">
                        Se connecter
                    </button>
                    <button onClick={() => handleNav('register')} className="magnetic-btn bg-accent text-white px-5 py-2 rounded-full text-sm font-bold flex items-center justify-center gap-2 shrink-0 w-full md:w-auto">
                        <span>Inscrire mon imprimerie</span>
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
        <section className="relative min-h-[100dvh] w-full overflow-hidden bg-primary flex items-center justify-center text-center pt-24 pb-16">
            <div className="absolute inset-0 w-full h-full">
                <img 
                    src="https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?q=80&w=2500&auto=format&fit=crop" 
                    alt="Imprimerie numérique et couleurs CMJN" 
                    className="w-full h-full object-cover opacity-40 mix-blend-overlay"
                />
                <div className="absolute inset-0 bg-hero-gradient"></div>
                <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-primary/90 to-transparent"></div>
            </div>
            
            <div className="relative z-10 w-full px-6 md:px-16 flex flex-col items-center">
                <h1 className="text-[#F5F2EB] flex flex-col gap-2 items-center">
                    <span className="hero-text text-5xl md:text-7xl lg:text-8xl font-sans font-bold leading-tight tracking-tight max-w-5xl">Trouvez l'imprimeur le plus proche de vous.</span>
                </h1>
                <p className="hero-text text-[#F5F2EB]/80 mt-8 text-lg md:text-xl max-w-2xl font-sans">
                    Découvrez les professionnels certifiés en un instant, ou développez votre vitrine numérique pour capter plus de commandes locales.
                </p>
                <div className="hero-text mt-12 flex flex-col sm:flex-row gap-4">
                    <button onClick={() => setPage('printers')} className="magnetic-btn bg-accent text-white px-8 py-4 rounded-[2rem] text-lg font-bold flex items-center justify-center gap-2">
                        <span>Trouver un imprimeur</span>
                        <MapPin size={20} />
                    </button>
                    <button onClick={() => setPage('register')} className="magnetic-btn bg-transparent border-2 border-[#F5F2EB]/30 text-[#F5F2EB] px-8 py-4 rounded-[2rem] text-lg font-bold flex items-center justify-center gap-2 hover:bg-[#F5F2EB]/10 transition-colors">
                        <span>Inscrire mon imprimerie</span>
                        <User size={20} />
                    </button>
                </div>
            </div>
        </section>
    );
};

const Printers = ({ setPage, setSelectedPrinter }) => {
    const printersList = [
        {
            id: 1,
            name: "L'Atelier Print",
            desc: "Spécialiste de l'impression numérique et grand format. Service express disponible.",
            rating: 4.9,
            isPro: true,
            location: "Médina, Dakar",
            services: ["Impression Numérique", "Offset", "Grand Format"],
            cover: "https://images.unsplash.com/photo-1598425237654-4fb98471ce3b?q=80&w=800&auto=format&fit=crop",
            avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=200&auto=format&fit=crop"
        },
        {
            id: 2,
            name: "Imprimerie du Centre",
            desc: "Expert en offset, carnets et brochures. Finitions premium.",
            rating: 4.7,
            isPro: true,
            location: "Plateau, Dakar",
            services: ["Offset", "Reliure", "Brochures", "Cartes de visite"],
            cover: "https://images.unsplash.com/photo-1562664377-709f2c337eb2?q=80&w=800&auto=format&fit=crop",
            avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop"
        },
        {
            id: 3,
            name: "CopieRapide Pro",
            desc: "Copies, reliures, et impressions simples pour étudiants et entreprises.",
            rating: 4.5,
            isPro: false,
            location: "Point E, Dakar",
            services: ["Photocopie", "Reliure spirale", "Flyers"],
            cover: "https://images.unsplash.com/photo-1603484477859-abe6a73f9366?q=80&w=800&auto=format&fit=crop",
            avatar: "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=200&auto=format&fit=crop"
        },
        {
            id: 4,
            name: "CréaPrint Studio",
            desc: "Flocage, sérigraphie et objets publicitaires personnalisés.",
            rating: 4.8,
            isPro: true,
            location: "Almadies, Dakar",
            services: ["Sérigraphie", "Flocage T-shirt", "Objets Pub", "Bâches"],
            cover: "https://images.unsplash.com/photo-1507206130118-b5907f817163?q=80&w=800&auto=format&fit=crop",
            avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop"
        }
    ];

    const handlePrinterClick = (printer) => {
        setSelectedPrinter(printer);
        setPage('printer_detail');
    };

    return (
        <div className="min-h-screen pt-32 pb-24 px-6 md:px-16 bg-background">
            <div className="max-w-7xl mx-auto">
                <div className="mb-12">
                    <h1 className="text-4xl md:text-6xl font-serif italic font-bold text-dark mb-4">Imprimeurs à proximité</h1>
                    <p className="text-lg text-dark/70 font-sans max-w-2xl">Découvrez les professionnels certifiés prêts à réaliser vos projets d'impression.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {printersList.map(printer => (
                        <div key={printer.id} onClick={() => handlePrinterClick(printer)} className="bg-white rounded-[2rem] overflow-hidden border border-dark/5 hover-lift shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative transition-all group cursor-pointer">
                            {/* Cover */}
                            <div className="h-36 w-full relative">
                                <img src={printer.cover} alt="Cover" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-gradient-to-t from-dark/60 to-transparent"></div>
                            </div>
                            
                            {/* Avatar */}
                            <div className="absolute top-24 left-6 w-20 h-20 rounded-[1rem] border-4 border-white overflow-hidden bg-background shadow-sm z-10">
                                <img src={printer.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            </div>
                            
                            {/* Badges */}
                            {printer.isPro && (
                                <div className="absolute top-4 right-4 bg-accent text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md backdrop-blur-sm bg-accent/90">
                                    <Award size={14} /> PRO
                                </div>
                            )}
                            
                            {/* Content */}
                            <div className="pt-12 px-6 pb-6 bg-white relative z-0">
                                <div className="flex justify-between items-start mb-2 mt-2">
                                    <h3 className="text-xl font-bold font-sans text-dark tracking-tight">{printer.name}</h3>
                                    <div className="flex items-center gap-1 text-[#D4A843] bg-[#D4A843]/10 px-2 py-1 rounded-md">
                                        <Star size={14} fill="currentColor" />
                                        <span className="text-sm font-bold text-dark">{printer.rating}</span>
                                    </div>
                                </div>
                                <p className="text-dark/70 text-sm mb-8 leading-relaxed min-h-[40px]">{printer.desc}</p>
                                
                                {/* Buttons */}
                                <div className="flex gap-3">
                                    <button onClick={(e) => e.stopPropagation()} className="flex-1 bg-[#25D366]/10 text-[#25D366] py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#25D366] hover:text-white transition-colors font-bold text-sm">
                                        <MessageCircle size={18} /> WhatsApp
                                    </button>
                                    <button onClick={(e) => e.stopPropagation()} className="flex-1 bg-primary/10 text-primary py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-colors font-bold text-sm">
                                        <Phone size={18} /> Appeler
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const PrinterDetail = ({ printer, setPage }) => {
    useEffect(() => {
        if (!printer) {
            setPage('printers');
        }
    }, [printer, setPage]);

    if (!printer) return null;

    return (
        <div className="min-h-screen pt-32 pb-24 px-6 md:px-16 bg-background">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => setPage('printers')} className="mb-8 flex items-center gap-2 text-dark/60 hover:text-dark transition-colors font-bold text-sm">
                    <ArrowLeft size={16} /> Retour aux imprimeurs
                </button>

                <div className="bg-white rounded-[3rem] overflow-hidden border border-dark/5 shadow-sm relative">
                    <div className="h-64 md:h-80 w-full relative">
                        <img src={printer.cover} alt="Cover" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-dark/80 to-transparent"></div>
                        {printer.isPro && (
                            <div className="absolute top-6 right-6 bg-accent text-white text-sm font-bold px-4 py-2 rounded-full flex items-center gap-2 shadow-lg backdrop-blur-sm bg-accent/90">
                                <Award size={16} /> COMPTE PRO
                            </div>
                        )}
                    </div>

                    <div className="absolute top-48 md:top-64 left-8 md:left-12 w-32 h-32 md:w-40 md:h-40 rounded-[2rem] border-8 border-white overflow-hidden bg-background shadow-lg z-10">
                        <img src={printer.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    </div>

                    <div className="pt-20 md:pt-28 px-8 md:px-12 pb-12">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
                            <div>
                                <h1 className="text-3xl md:text-5xl font-bold font-sans text-dark tracking-tight mb-2">{printer.name}</h1>
                                <div className="flex flex-wrap items-center gap-4 text-dark/60 font-medium text-sm mt-4">
                                    <div className="flex items-center gap-1 text-[#D4A843] bg-[#D4A843]/10 px-3 py-1.5 rounded-md">
                                        <Star size={16} fill="currentColor" />
                                        <span className="font-bold text-dark">{printer.rating}</span>
                                    </div>
                                    <span className="flex items-center gap-1 bg-dark/5 px-3 py-1.5 rounded-md"><MapPin size={16} /> {printer.location || "Dakar, Sénégal"}</span>
                                </div>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                                <button className="flex-1 md:flex-none bg-[#25D366] text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#20bd5a] transition-colors font-bold text-sm">
                                    <MessageCircle size={18} /> WhatsApp
                                </button>
                                <button className="flex-1 md:flex-none bg-primary text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors font-bold text-sm">
                                    <Phone size={18} /> Appeler
                                </button>
                            </div>
                        </div>

                        <p className="text-lg text-dark/70 leading-relaxed mb-12 max-w-2xl">{printer.desc}</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div>
                                <h3 className="text-xl font-bold font-sans mb-6 flex items-center gap-2"><Clock size={20} className="text-accent" /> Horaires d'ouverture</h3>
                                <div className="bg-background rounded-2xl p-6 border border-dark/5">
                                    <ul className="space-y-3 text-sm">
                                        <li className="flex justify-between border-b border-dark/5 pb-2"><span className="text-dark/60">Lundi - Vendredi</span><span className="font-bold text-dark">08:00 - 18:00</span></li>
                                        <li className="flex justify-between border-b border-dark/5 pb-2"><span className="text-dark/60">Samedi</span><span className="font-bold text-dark">09:00 - 14:00</span></li>
                                        <li className="flex justify-between text-accent"><span className="text-accent/60">Dimanche</span><span className="font-bold">Fermé</span></li>
                                    </ul>
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="text-xl font-bold font-sans mb-6 flex items-center gap-2"><Store size={20} className="text-accent" /> Services proposés</h3>
                                <div className="flex flex-wrap gap-2">
                                    {(printer.services || ["Impression Numérique", "Offset", "Grand Format", "Reliure"]).map((s, i) => (
                                        <span key={i} className="bg-primary/5 text-primary border border-primary/10 px-4 py-2 rounded-lg text-sm font-bold">
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-12">
                            <h3 className="text-xl font-bold font-sans mb-6 flex items-center gap-2"><ImageIcon size={20} className="text-accent" /> Réalisations</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="aspect-square bg-dark/5 rounded-2xl overflow-hidden hover-lift cursor-pointer relative group">
                                        <img src={`https://images.unsplash.com/photo-1586075010923-2dd4570fb338?q=80&w=400&auto=format&fit=crop&sig=${i * printer.id}`} className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-dark/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-12 pt-12 border-t border-dark/5">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                                <h3 className="text-xl font-bold font-sans flex items-center gap-2">Notes et avis</h3>
                                <button className="magnetic-btn bg-dark text-white px-6 py-2 rounded-full text-sm font-bold">Laisser un avis</button>
                            </div>
                            <div className="bg-background rounded-2xl p-6 md:p-8 border border-dark/5 flex flex-col sm:flex-row gap-8 items-center">
                                <div className="text-center sm:w-1/3">
                                    <div className="text-6xl font-bold text-dark font-sans tracking-tight mb-2">{printer.rating}</div>
                                    <div className="flex gap-1 text-[#D4A843] justify-center">
                                        {[1,2,3,4,5].map(i => <Star key={i} size={20} fill={i <= Math.floor(printer.rating) ? "currentColor" : "transparent"} />)}
                                    </div>
                                    <div className="text-sm text-dark/50 mt-2 font-medium">Basé sur 124 avis</div>
                                </div>
                                <div className="flex-1 w-full space-y-3">
                                    {[5,4,3,2,1].map(r => (
                                        <div key={r} className="flex items-center gap-3 text-sm font-mono text-dark/70">
                                            <span className="w-8">{r} <Star size={12} className="inline mb-1" /></span>
                                            <div className="flex-1 h-2.5 bg-dark/10 rounded-full overflow-hidden">
                                                <div className="h-full bg-[#D4A843] rounded-full" style={{ width: `${r === 5 ? 70 : r === 4 ? 20 : r === 3 ? 5 : 2}%` }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Features = () => {
    return (
        <section id="features" className="py-24 md:py-32 px-6 md:px-16 bg-background">
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
                            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#1A1518 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
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
    <section className="py-24 md:py-32 px-4 md:px-16 bg-background flex justify-center">
        <div className="bg-primary text-background rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-16 w-full max-w-5xl flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-hero-gradient opacity-50"></div>
            <div className="relative z-10 flex flex-col items-center gap-8">
                <h2 className="text-3xl sm:text-4xl md:text-6xl font-sans font-bold tracking-tight">Prêt à rejoindre l'écosystème ?</h2>
                <p className="text-base sm:text-lg md:text-xl text-background/80 max-w-2xl font-sans">
                    Que vous soyez imprimeur ou client, trouvez votre place dans le réseau local dès aujourd'hui.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full sm:w-auto">
                    <button onClick={() => setPage('register')} className="magnetic-btn bg-accent text-white px-8 py-4 rounded-full font-bold text-lg w-full sm:w-auto">
                        Inscrire mon imprimerie
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
                <a href="#" onClick={(e) => { e.preventDefault(); setPage('printers'); }} className="hover:text-accent transition-colors">Imprimeurs</a>
                <a href="#" onClick={(e) => { e.preventDefault(); setPage('marketplace'); }} className="hover:text-accent transition-colors">Marketplace</a>
                <a href="#" onClick={(e) => { e.preventDefault(); setPage('news'); }} className="hover:text-accent transition-colors">Actualités</a>
            </div>
            <div className="flex flex-col gap-4">
                <h4 className="font-mono text-sm uppercase text-background/40">Accès</h4>
                <a href="#" onClick={(e) => { e.preventDefault(); setPage('login'); }} className="hover:text-accent transition-colors">Se connecter</a>
                <a href="#" onClick={(e) => { e.preventDefault(); setPage('register'); }} className="hover:text-accent transition-colors">Inscrire mon imprimerie</a>
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
                    Pas encore de compte ? <button onClick={() => setPage('register')} className="text-accent font-bold hover:underline">Inscrire mon imprimerie</button>
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

const Layout = ({ children, setPage, currentPage }) => {
    return (
        <div className="relative w-full min-h-screen flex flex-col font-sans bg-background text-dark">
            <div className="noise-overlay z-0" />
            <Navbar setPage={setPage} currentPage={currentPage} />
            <main className="flex-1 relative z-10 w-full flex flex-col">
                {children}
            </main>
            {currentPage !== 'login' && currentPage !== 'register' && <Footer setPage={setPage} />}
        </div>
    );
};

export default function App() {
    const [page, setPage] = useState('home');
    const [selectedPrinter, setSelectedPrinter] = useState(null);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [page]);

    return (
        <Layout setPage={setPage} currentPage={page}>
            {page === 'home' && <Home setPage={setPage} />}
            {page === 'printers' && <Printers setPage={setPage} setSelectedPrinter={setSelectedPrinter} />}
            {page === 'printer_detail' && <PrinterDetail printer={selectedPrinter} setPage={setPage} />}
            {page === 'marketplace' && <Marketplace />}
            {page === 'news' && <News />}
            {page === 'login' && <Login setPage={setPage} />}
            {page === 'register' && <Register setPage={setPage} />}
        </Layout>
    );
}
