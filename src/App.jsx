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





const Layout = ({ children, setPage, currentPage, user }) => {
    const hideNav = ['login', 'register', 'dashboard'].includes(currentPage);
    const hideFooter = ['login', 'register', 'dashboard'].includes(currentPage);

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
                                La première plateforme SaaS de mise en relation entre les imprimeurs professionnels et les clients exigeants. Connectez-vous à l'expertise mondiale.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-sm font-black uppercase tracking-widest mb-8 text-accent">Navigation</h4>
                            <ul className="space-y-4 font-bold text-sm">
                                <li><button onClick={() => setPage('home')} className="hover:text-accent transition-colors">Accueil</button></li>
                                <li><button onClick={() => setPage('printers')} className="hover:text-accent transition-colors">Imprimeurs</button></li>
                                <li><button onClick={() => setPage('marketplace')} className="hover:text-accent transition-colors">Marketplace</button></li>
                                <li><button onClick={() => setPage('news')} className="hover:text-accent transition-colors">Actualités</button></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-sm font-black uppercase tracking-widest mb-8 text-accent">Légal</h4>
                            <ul className="space-y-4 font-bold text-sm">
                                <li><button onClick={() => setPage('terms')} className="hover:text-accent transition-colors">Conditions d'utilisation</button></li>
                                <li><button onClick={() => setPage('privacy')} className="hover:text-accent transition-colors">Confidentialité</button></li>
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

const App = () => {
    const [page, setPage] = useState('home');
    const [user, setUser] = useState(null);
    const [selectedPrinterId, setSelectedPrinterId] = useState(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                // Only redirect if on login/register
                if (page === 'login' || page === 'register') setPage('dashboard');
            } else {
                if (page === 'dashboard') setPage('home');
            }
        });

        return () => subscription.unsubscribe();
    }, [page]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [page]);

    return (
        <Layout setPage={setPage} currentPage={page} user={user}>
            {page === 'home' && <HomePage setPage={setPage} />}
            {page === 'printers' && <PrintersPage setPage={setPage} setSelectedPrinterId={setSelectedPrinterId} />}
            {page === 'printer_detail' && <PrinterDetailPage id={selectedPrinterId} setPage={setPage} />}
            {page === 'news' && <NewsPage setPage={setPage} />}
            {page === 'marketplace' && <MaquettePlace setPage={setPage} />}
            {page === 'login' && <LoginPage setPage={setPage} />}
            {page === 'register' && <RegisterPage setPage={setPage} />}
            {page === 'dashboard' && <DashboardPage setPage={setPage} user={user} />}
            {page === 'legal' && <LegalNoticePage setPage={setPage} />}
            {page === 'privacy' && <PrivacyPolicyPage setPage={setPage} />}
            {page === 'terms' && <TermsOfServicePage setPage={setPage} />}
        </Layout>
    );
};

export default App;
