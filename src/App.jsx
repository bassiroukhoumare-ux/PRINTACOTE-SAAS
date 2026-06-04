import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import PrintersPage from './pages/PrintersPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import LegalNoticePage from './pages/LegalNoticePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import MaquettePlace from './pages/MaquettePlace';
import PrinterDetailPage from './pages/PrinterDetailPage';
import NewsPage from './pages/NewsPage';
import RgpdPage from './pages/RgpdPage';
import AdminPage from './pages/AdminPage';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { updateSEO } from './lib/seo';





const Layout = ({ children, setPage, currentPage, user }) => {
    const hideNav = ['login', 'register', 'dashboard', 'admin'].includes(currentPage);
    const hideFooter = ['login', 'register', 'dashboard', 'admin'].includes(currentPage);

    return (
        <div className="relative min-h-screen bg-background text-dark selection:bg-accent selection:text-white">
            <div className="noise-overlay" />
            {!hideNav && <Navbar setPage={setPage} currentPage={currentPage} user={user} />}
            <main>{children}</main>
            {!hideFooter && (
            <footer className="bg-white text-[#3D0B37] py-16 rounded-t-[4rem] px-6 border-t border-primary/5 shadow-2xl shadow-black/5">
                <div className="container mx-auto max-w-7xl">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                        <div className="col-span-1 md:col-span-2">
                            <img src="/logo.png" alt="Printacote" className="h-10 mb-8" />
                            <p className="text-[#3D0B37]/60 max-w-md text-lg leading-relaxed font-medium">
                                La première plateforme de mise en relation entre les imprimeurs professionnels et les clients exigeants. Connectez-vous à l'expertise mondiale.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-sm font-black uppercase tracking-widest mb-8 text-primary">Navigation</h4>
                            <ul className="space-y-4 font-bold text-sm">
                                <li><button onClick={() => setPage('home')} className="hover:text-accent transition-colors">Accueil</button></li>
                                <li><button onClick={() => setPage('printers')} className="hover:text-accent transition-colors">Imprimeurs</button></li>
                                <li><button onClick={() => setPage('marketplace')} className="hover:text-accent transition-colors">Marketplace</button></li>
                                <li><button onClick={() => setPage('news')} className="hover:text-accent transition-colors">Actualités</button></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-sm font-black uppercase tracking-widest mb-8 text-primary">Légal</h4>
                            <ul className="space-y-4 font-bold text-sm">
                                <li><button onClick={() => setPage('terms')} className="hover:text-accent transition-colors">Conditions d'utilisation</button></li>
                                <li><button onClick={() => setPage('privacy')} className="hover:text-accent transition-colors">Confidentialité</button></li>
                                <li>
                                    <button onClick={() => setPage('rgpd')} className="hover:text-accent transition-colors flex items-center gap-2">
                                        <ShieldCheck size={16} className="text-accent" />
                                        <span>RGPD & Protection</span>
                                    </button>
                                </li>
                                <li><button className="hover:text-accent transition-colors">Contactez-nous</button></li>
                            </ul>
                        </div>

                    </div>
                    
                    <div className="pt-8 border-t border-[#3D0B37]/5 flex justify-center items-center">
                        <div className="text-[#3D0B37]/30 text-xs font-black uppercase tracking-widest">
                            © 2026 Printacoté - Tous droits réservés.
                        </div>
                    </div>
                </div>
            </footer>
            )}
        </div>
    );
};

const pageToPath = {
    'home': '/accueil',
    'printers': '/imprimerie',
    'printer_detail': '/imprimerie-detail',
    'news': '/actualites',
    'marketplace': '/maquette_place',
    'login': '/login',
    'register': '/inscription',
    'dashboard': '/dashboard',
    'legal': '/legal',
    'privacy': '/privacy',
    'terms': '/terms',
    'rgpd': '/rgpd',
    'admin': '/admin21'
};

const pathToPage = {
    '/': 'home',
    '/accueil': 'home',
    '/imprimerie': 'printers',
    '/imprimerie-detail': 'printer_detail',
    '/actualites': 'news',
    '/maquette_place': 'marketplace',
    '/login': 'login',
    '/inscription': 'register',
    '/dashboard': 'dashboard',
    '/legal': 'legal',
    '/privacy': 'privacy',
    '/terms': 'terms',
    '/rgpd': 'rgpd',
    '/admin21': 'admin'
};

const App = () => {
    const getInitialPage = () => {
        const path = window.location.pathname;
        const params = new URLSearchParams(window.location.search);
        if (path === '/imprimerie-detail' && (params.get('id') || params.get('printer'))) {
            return 'printer_detail';
        }
        return pathToPage[path] || 'home';
    };

    const [page, setPage] = useState(getInitialPage);
    const [user, setUser] = useState(null);
    const [selectedPrinterId, setSelectedPrinterId] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('id') || params.get('printer') || null;
    });
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    // Sync state change to URL
    useEffect(() => {
        const currentPath = window.location.pathname;
        const targetPath = pageToPath[page] || '/accueil';
        const params = new URLSearchParams(window.location.search);
        
        if (page === 'printer_detail' && selectedPrinterId) {
            params.set('id', selectedPrinterId);
            const searchStr = params.toString();
            if (currentPath !== targetPath || window.location.search !== `?${searchStr}`) {
                window.history.replaceState(null, '', `${targetPath}?${searchStr}`);
            }
        } else if (page === 'news') {
            const articleId = params.get('article');
            if (articleId) {
                params.set('article', articleId);
                window.history.replaceState(null, '', `${targetPath}?${params.toString()}`);
            } else {
                if (currentPath !== targetPath) {
                    window.history.pushState(null, '', targetPath);
                }
            }
        } else {
            // Clear parameter query strings on other pages
            if (currentPath !== targetPath || window.location.search !== '') {
                window.history.pushState(null, '', targetPath);
            }
        }
    }, [page, selectedPrinterId]);

    // Handle browser back/forward buttons
    useEffect(() => {
        const handlePopState = () => {
            const path = window.location.pathname;
            const nextPage = pathToPage[path] || 'home';
            setPage(nextPage);
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    useEffect(() => {
        if (showSuccessToast) {
            const timer = setTimeout(() => {
                setShowSuccessToast(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [showSuccessToast]);

    // Suivi réel du trafic : enregistre chaque vue de page publique dans
    // site_views (table horodatée). On ignore la console d'administration
    // pour ne pas gonfler les statistiques. L'identifiant visiteur persiste
    // dans localStorage pour distinguer les visiteurs uniques.
    useEffect(() => {
        if (page === 'admin') return;
        let visitorId = localStorage.getItem('visitor_id');
        if (!visitorId) {
            visitorId = (crypto.randomUUID && crypto.randomUUID()) ||
                `v_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            localStorage.setItem('visitor_id', visitorId);
        }
        const path = pageToPath[page] || window.location.pathname;
        supabase
            .rpc('record_site_view', { p_path: path, p_visitor_id: visitorId })
            .then(({ error }) => {
                if (error) console.warn('record_site_view indisponible:', error.message);
            });
    }, [page]);

    useEffect(() => {
        // Check for mock session first (OTP demo mode)
        const mockSession = localStorage.getItem('mock_user_session');
        if (mockSession) {
            try {
                const mockUser = JSON.parse(mockSession);
                setUser(mockUser);
            } catch (e) {
                localStorage.removeItem('mock_user_session');
            }
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            // Only set from Supabase if no mock session is active
            if (!localStorage.getItem('mock_user_session')) {
                setUser(session?.user ?? null);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            // If a mock session exists, don't let Supabase override it
            if (localStorage.getItem('mock_user_session')) {
                return;
            }
            setUser(session?.user ?? null);
            if (session?.user) {
                const hash = window.location.hash;
                // Only redirect if on login/register, or if verifying email (hash has type=signup)
                if (page === 'login' || page === 'register' || hash.includes('type=signup')) {
                    setPage('dashboard');
                    if (page === 'register' || hash.includes('type=signup')) {
                        localStorage.setItem('just_registered', 'true');
                    }
                    if (hash.includes('type=signup')) {
                        setShowSuccessToast(true);
                        // Clean up hash from URL to keep it pristine
                        window.history.replaceState(null, null, window.location.pathname + window.location.search);
                    }
                }
            } else {
                if (page === 'dashboard') setPage('home');
            }
        });

        return () => subscription.unsubscribe();
    }, [page, showSuccessToast]);

    useEffect(() => {
        window.scrollTo(0, 0);
        
        // Dynamic SEO for static pages
        const defaultDesc = "Découvrez Printacoté, la plateforme de référence qui connecte les clients à l'imprimeur idéal près de chez eux, tout en permettant aux imprimeurs locaux de prospérer et d'étendre leur visibilité.";
        const defaultImg = "/og-image.png";
        
        if (page === 'home') {
            updateSEO({
                title: "Printacoté — Trouvez l'imprimeur idéal près de chez vous",
                description: defaultDesc,
                imageUrl: defaultImg,
                url: "/"
            });
        } else if (page === 'printers') {
            updateSEO({
                title: "Annuaire des Imprimeurs — Printacoté",
                description: "Trouvez et contactez les meilleurs imprimeurs professionnels et ateliers d'impression à Dakar et dans tout le Sénégal.",
                imageUrl: defaultImg,
                url: "/imprimerie"
            });
        } else if (page === 'marketplace') {
            updateSEO({
                title: "Boutique & Marketplace — Printacoté",
                description: "Achetez et revendez du matériel d'impression professionnel, consommables et papiers sur la marketplace de Printacoté.",
                imageUrl: defaultImg,
                url: "/maquette_place"
            });
        } else if (page === 'login') {
            updateSEO({
                title: "Connexion Espace Pro — Printacoté",
                description: "Connectez-vous à votre espace professionnel pour gérer votre imprimerie en ligne.",
                imageUrl: defaultImg,
                url: "/login"
            });
        } else if (page === 'register') {
            updateSEO({
                title: "Inscription Imprimerie — Printacoté",
                description: "Rejoignez Printacoté, créez votre vitrine en ligne gratuitement et recevez des demandes de devis de clients.",
                imageUrl: defaultImg,
                url: "/inscription"
            });
        } else if (page === 'dashboard') {
            updateSEO({
                title: "Tableau de Bord — Printacoté",
                description: "Gérer votre vitrine, vos services, votre portfolio et vos produits sur votre tableau de bord Printacoté.",
                imageUrl: defaultImg,
                url: "/dashboard"
            });
        } else if (page === 'admin') {
            updateSEO({
                title: "Console d'Administration — Printacoté",
                description: "Salle de contrôle d'administration système Printacoté.",
                imageUrl: defaultImg,
                url: "/admin21"
            });
        }
    }, [page]);

    return (
        <Layout setPage={setPage} currentPage={page} user={user}>
            {page === 'home' && <HomePage setPage={setPage} />}
            {page === 'printers' && <PrintersPage setPage={setPage} setSelectedPrinterId={setSelectedPrinterId} />}
            {page === 'printer_detail' && <PrinterDetailPage id={selectedPrinterId} setPage={setPage} />}
            {page === 'news' && <NewsPage setPage={setPage} setSelectedPrinterId={setSelectedPrinterId} />}
            {page === 'marketplace' && <MaquettePlace setPage={setPage} />}
            {page === 'login' && <LoginPage setPage={setPage} setUser={setUser} />}
            {page === 'register' && <RegisterPage setPage={setPage} />}
            {page === 'dashboard' && <DashboardPage setPage={setPage} user={user} />}
            {page === 'admin' && <AdminPage setPage={setPage} />}
            {page === 'legal' && <LegalNoticePage setPage={setPage} />}
            {page === 'privacy' && <PrivacyPolicyPage setPage={setPage} />}
            {page === 'terms' && <TermsOfServicePage setPage={setPage} />}
            {page === 'rgpd' && <RgpdPage setPage={setPage} />}
            
            {showSuccessToast && (
                <div className="fixed bottom-6 right-6 z-[9999] bg-[#F5F5DC] border-2 border-[#3D0B37]/10 rounded-3xl p-6 shadow-2xl flex items-center gap-4 max-w-sm animate-in slide-in-from-bottom-5 duration-500">
                    <div className="w-10 h-10 rounded-xl bg-[#3D0B37] text-[#F5F5DC] flex items-center justify-center shrink-0">
                        <CheckCircle2 size={22} />
                    </div>
                    <div className="text-left">
                        <h4 className="font-black text-sm text-[#3D0B37] uppercase tracking-wider">Connexion réussie</h4>
                        <p className="text-xs text-[#3D0B37]/70 font-bold mt-0.5">Votre compte a été activé avec succès !</p>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default App;
