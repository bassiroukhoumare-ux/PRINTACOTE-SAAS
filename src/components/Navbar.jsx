import React, { useState, useEffect, useRef } from 'react';
import { Store, ShoppingCart, Newspaper, LayoutDashboard, Plus, Menu, X, Home as LucideHome, User } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const Navbar = ({ setPage, currentPage, user }) => {
    const navRef = useRef(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showPlusMenu, setShowPlusMenu] = useState(false);

    useEffect(() => {
        const ctx = gsap.context(() => {
            ScrollTrigger.create({
                start: 'top -80',
                onUpdate: (self) => {
                    if (self.direction === 1 || self.progress > 0) {
                        gsap.to(navRef.current, { 
                            backgroundColor: 'rgba(250, 248, 245, 0.8)', 
                            backdropFilter: 'blur(16px)', 
                            borderColor: 'rgba(0,0,0,0.05)', 
                            color: '#3D0B37', 
                            paddingTop: '0.75rem',
                            paddingBottom: '0.75rem',
                            duration: 0.3 
                        });
                    } else {
                        gsap.to(navRef.current, { 
                            backgroundColor: 'transparent', 
                            backdropFilter: 'blur(0px)', 
                            borderColor: 'transparent', 
                            color: currentPage === 'home' ? '#F5F5DC' : '#3D0B37', 
                            paddingTop: '1.25rem',
                            paddingBottom: '1.25rem',
                            duration: 0.3 
                        });
                    }
                }
            });
        }, navRef);
        return () => ctx.revert();
    }, [currentPage]);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const navLinks = [
        { id: 'home', label: 'Accueil', icon: LucideHome },
        { id: 'printers', label: 'Imprimeurs', icon: Store },
        { id: 'marketplace', label: 'Maquettes', icon: ShoppingCart },
        { id: 'news', label: 'Actualités', icon: Newspaper },
    ];

    return (
        <>
            <div className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 md:px-8 py-4 pointer-events-none">
                <nav 
                    ref={navRef} 
                    className={`flex items-center justify-between px-6 py-4 rounded-[2rem] border border-transparent transition-all w-full max-w-6xl pointer-events-auto shadow-xl overflow-hidden
                        ${currentPage === 'home' ? 'text-[#F5F2EB]' : 'text-dark bg-white/40 backdrop-blur-md border-dark/5'}`}
                >
                    <div className="noise-overlay opacity-5 pointer-events-none"></div>
                    
                    <a href="#" onClick={(e) => { e.preventDefault(); setPage('home'); }} className="flex items-center gap-2 group relative z-10">
                        <img src="/logo.png" alt="Printacote" className="h-8 md:h-12 w-auto object-contain transition-transform group-hover:scale-105" />
                    </a>
                    
                    {/* Desktop Menu */}
                    <div className="hidden lg:flex items-center gap-8 text-sm font-bold relative z-10">
                        {navLinks.map((link) => (
                            <button 
                                key={link.id}
                                onClick={() => setPage(link.id)}
                                className={`flex items-center gap-2 transition-all hover:text-accent group
                                    ${currentPage === link.id ? 'text-accent' : ''}`}
                            >
                                <link.icon size={16} className="group-hover:rotate-12 transition-transform" />
                                <span>{link.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 relative z-10">
                        {user ? (
                            <button 
                                onClick={() => setPage('dashboard')} 
                                className="bg-accent text-white px-5 py-2.5 rounded-full text-xs md:text-sm font-bold flex items-center gap-2 shadow-lg shadow-accent/20 hover:scale-105 active:scale-95 transition-all"
                            >
                                <LayoutDashboard size={16} />
                                <span className="hidden sm:inline">Mon Compte</span>
                            </button>
                        ) : (
                            <>
                                <button 
                                    onClick={() => setPage('login')} 
                                    className="text-sm font-bold hover:text-accent transition-colors hidden md:block px-4 py-2"
                                >
                                    Connexion
                                </button>
                                <button 
                                    onClick={() => setPage('login')} 
                                    className="bg-[#F5F5DC] text-[#3D0B37] px-8 py-3 rounded-full text-sm font-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/10"
                                >
                                    Se connecter
                                </button>
                            </>
                        )}
                        <button 
                            onClick={toggleSidebar} 
                            className="lg:hidden p-2 hover:bg-black/5 rounded-full transition-colors"
                        >
                            <Menu size={24} />
                        </button>
                    </div>
                </nav>
            </div>

            {/* Mobile Side Drawer */}
            <div 
                className={`fixed inset-0 z-[100] lg:hidden transition-all duration-500 ${isSidebarOpen ? 'visible' : 'invisible pointer-events-none'}`}
            >
                <div 
                    className={`absolute inset-0 bg-dark/60 backdrop-blur-sm transition-opacity duration-500 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`} 
                    onClick={toggleSidebar}
                ></div>
                <div 
                    className={`absolute top-0 right-0 h-full w-[85%] max-w-sm bg-background shadow-2xl p-8 flex flex-col gap-10 transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
                >
                    <div className="flex justify-between items-center">
                        <img src="/logo.png" alt="Printacote" className="h-10 w-auto" />
                        <button onClick={toggleSidebar} className="p-3 bg-dark/5 rounded-2xl hover:bg-dark/10 transition-colors"><X size={20} /></button>
                    </div>
                    
                    <div className="flex flex-col gap-8">
                        <div className="text-[10px] font-mono text-dark/30 uppercase tracking-[0.3em] font-bold">Explorer</div>
                        <nav className="flex flex-col gap-4">
                            {navLinks.map((link) => (
                                <button 
                                    key={link.id}
                                    onClick={() => { setPage(link.id); toggleSidebar(); }} 
                                    className={`flex items-center gap-4 text-xl font-bold p-4 rounded-[1.5rem] transition-all
                                        ${currentPage === link.id ? 'bg-primary text-white shadow-xl' : 'text-dark hover:bg-dark/5'}`}
                                >
                                    <link.icon size={24} />
                                    <span>{link.label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="mt-auto pt-8 border-t border-dark/5 flex flex-col gap-4">
                        {!user ? (
                            <>
                                <button onClick={() => { setPage('login'); toggleSidebar(); }} className="w-full bg-[#F5F5DC] text-[#3D0B37] py-4 rounded-2xl font-black shadow-xl shadow-black/10">Se connecter</button>
                            </>
                        ) : (
                            <button onClick={() => { setPage('dashboard'); toggleSidebar(); }} className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2">
                                <LayoutDashboard size={18} /> Mon Tableau de Bord
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Navigation */}
            {currentPage !== 'dashboard' && (
                <div className="lg:hidden fixed bottom-6 left-6 right-6 z-50 bg-[#F5F5DC] border border-[#3D0B37]/10 rounded-full px-10 py-5 flex justify-between items-center shadow-2xl shadow-[#3D0B37]/20">
                    <button onClick={() => setPage('home')} className={`flex flex-col items-center gap-1.5 transition-all ${currentPage === 'home' ? 'text-[#3D0B37] scale-110' : 'text-[#3D0B37]/40 hover:text-[#3D0B37]'}`}>
                        <LucideHome size={26} strokeWidth={currentPage === 'home' ? 2.5 : 2} />
                        <span className="text-[10px] font-black uppercase tracking-[0.1em]">Accueil</span>
                    </button>
                    <button onClick={() => setPage('printers')} className={`flex flex-col items-center gap-1.5 transition-all ${currentPage === 'printers' ? 'text-[#3D0B37] scale-110' : 'text-[#3D0B37]/40 hover:text-[#3D0B37]'}`}>
                        <Store size={26} strokeWidth={currentPage === 'printers' ? 2.5 : 2} />
                        <span className="text-[10px] font-black uppercase tracking-[0.1em]">Imprimerie</span>
                    </button>
                    <button onClick={() => setPage('marketplace')} className={`flex flex-col items-center gap-1.5 transition-all ${currentPage === 'marketplace' ? 'text-[#3D0B37] scale-110' : 'text-[#3D0B37]/40 hover:text-[#3D0B37]'}`}>
                        <ShoppingCart size={26} strokeWidth={currentPage === 'marketplace' ? 2.5 : 2} />
                        <span className="text-[10px] font-black uppercase tracking-[0.1em]">Maquettes</span>
                    </button>
                </div>
            )}
        </>
    );
};

export default Navbar;
