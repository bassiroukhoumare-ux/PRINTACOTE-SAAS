import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRef } from 'react';
import {
    LayoutDashboard, User, Wrench, Image as ImageIcon,
    Store, CreditCard, LogOut, Menu, X, Eye, Star,
    MessageCircle, Plus, ChevronRight, Bell, CheckCircle2, Loader2, AlertCircle,
    Crown, Clock
} from 'lucide-react';
import DashboardOverview from './dashboard/DashboardOverview';
import DashboardProfile from './dashboard/DashboardProfile';
import DashboardServices from './dashboard/DashboardServices';
import DashboardPortfolio from './dashboard/DashboardPortfolio';
import DashboardMarketplace from './dashboard/DashboardMarketplace';
import SubscriptionPanel from '../components/SubscriptionPanel';
import { getSubscriptionState } from '../lib/subscription';

const DashboardPage = ({ setPage, user }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [printerData, setPrinterData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [autoOpenModal, setAutoOpenModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusModalLoading, setStatusModalLoading] = useState(false);

    // Forced password change state
    const [forcePasswordChange, setForcePasswordChange] = useState(() => {
        return localStorage.getItem('force_password_change') === 'true';
    });
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passError, setPassError] = useState('');

    const handleForcedPasswordUpdate = async (e) => {
        e.preventDefault();
        setPassError('');
        if (newPassword !== confirmPassword) {
            setPassError("Les mots de passe ne correspondent pas.");
            return;
        }
        if (newPassword.length < 6) {
            setPassError("Le mot de passe doit faire au moins 6 caractères.");
            return;
        }

        setPasswordLoading(true);
        if (user?.isMock) {
            localStorage.setItem(`mock_password_${user.email}`, newPassword);
            localStorage.removeItem('force_password_change');
            setForcePasswordChange(false);
            showToast("Votre mot de passe a été modifié avec succès (Mode Démo) !", "success");
        } else {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (!error) {
                localStorage.removeItem('force_password_change');
                setForcePasswordChange(false);
                showToast("Votre mot de passe a été modifié avec succès !", "success");
            } else {
                setPassError("Erreur : " + error.message);
            }
        }
        setPasswordLoading(false);
    };

    // Custom UI Toasts & Modals States
    const [toast, setToast] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState(null);

    // Notification & Support States
    const [showNotifications, setShowNotifications] = useState(false);
    const [supportFile, setSupportFile] = useState(null);
    const [supportFilePreview, setSupportFilePreview] = useState(null);
    const [supportSubmitting, setSupportSubmitting] = useState(false);
    const [notifications, setNotifications] = useState(() => {
        const stored = localStorage.getItem('printacote_notifications');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {}
        }
        return [
            {
                id: '1',
                title: 'Bienvenue sur Printacoté',
                message: 'Complétez votre profil en ajoutant votre logo et une couverture pour être visible.',
                time: 'Il y a 1 jour',
                read: false,
                type: 'info'
            },
            {
                id: '2',
                title: 'Statut de la boutique',
                message: 'Votre boutique est configurée par défaut en statut "Désactivé" pour modération.',
                time: 'Il y a 1 jour',
                read: false,
                type: 'warning'
            },
            {
                id: '3',
                title: 'Conseil Support',
                message: 'Vous pouvez à tout moment contacter notre support technique depuis votre espace dédié.',
                time: 'Il y a quelques heures',
                read: false,
                type: 'info'
            }
        ];
    });

    useEffect(() => {
        localStorage.setItem('printacote_notifications', JSON.stringify(notifications));
    }, [notifications]);

    useEffect(() => {
        // Simulate a new notification after 15 seconds
        const timer = setTimeout(() => {
            const hasTriggered = sessionStorage.getItem('simulated_notif_triggered');
            if (!hasTriggered) {
                const newNotif = {
                    id: Date.now().toString(),
                    title: 'Message d\'administration',
                    message: 'Votre boutique a passé avec succès les vérifications préliminaires.',
                    time: 'À l\'instant',
                    read: false,
                    type: 'success'
                };
                setNotifications(prev => [newNotif, ...prev]);
                showToast("Nouveau message disponible dans vos notifications", "info");
                sessionStorage.setItem('simulated_notif_triggered', 'true');
            }
        }, 15000);
        return () => clearTimeout(timer);
    }, [notifications]);

    // Onboarding Upload States & Refs
    const logoRef = useRef(null);
    const coverRef = useRef(null);
    const portfolioRef = useRef(null);
    const [onboardingUploading, setOnboardingUploading] = useState(false);

    const [onboardingServiceName, setOnboardingServiceName] = useState('');
    const [onboardingServiceDesc, setOnboardingServiceDesc] = useState('');
    const [onboardingServicePrice, setOnboardingServicePrice] = useState('');
    const [onboardingServiceLoading, setOnboardingServiceLoading] = useState(false);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    const showConfirm = (title, message) => {
        return new Promise((resolve) => {
            setConfirmDialog({
                title,
                message,
                resolve
            });
        });
    };

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const triggerTabWithModal = (tab) => {
        setActiveTab(tab);
        setAutoOpenModal(true);
    };

    useEffect(() => {
        if (user) {
            fetchPrinterData();
        }
    }, [user]);

    // Retour depuis la page de paiement Moneroo (?payment=return).
    // Le webhook active l'abonnement côté serveur ; on rafraîchit les données
    // plusieurs fois pour récupérer la mise à jour, puis on nettoie l'URL.
    useEffect(() => {
        if (!user) return;
        const params = new URLSearchParams(window.location.search);
        if (params.get('payment') !== 'return') return;

        setActiveTab('billing');
        showToast("Vérification de votre paiement en cours…", 'success');
        window.history.replaceState(null, '', '/dashboard');

        let attempts = 0;
        const poll = setInterval(async () => {
            attempts += 1;
            await fetchPrinterData();
            if (attempts >= 5) clearInterval(poll);
        }, 3000);
        return () => clearInterval(poll);
    }, [user]);

    const fetchPrinterData = async () => {
        if (!printerData) setLoading(true);

        if (user?.isMock) {
            const localPrinter = localStorage.getItem(`mock_printer_${user.id}`);
            if (localPrinter) {
                setPrinterData(JSON.parse(localPrinter));
            } else {
                const newMockPrinter = {
                    id: user.id,
                    name: 'Imprimerie Prototype',
                    first_name: 'Jean',
                    last_name: 'Dupont',
                    description: 'Votre partenaire d\'impression haut de gamme et sur mesure.',
                    city: 'Dakar',
                    country: 'Sénégal',
                    whatsapp: '221770000000',
                    phone: '221330000000',
                    logo_url: 'https://ui-avatars.com/api/?name=Imprimerie+Prototype&background=random',
                    cover_url: 'https://images.unsplash.com/photo-1562664347-4950157077a9?q=80&w=2500&auto=format&fit=crop',
                    rating: 4.8,
                    views: 124,
                    clicks: 42,
                    status: 'En ligne',
                    services: [],
                    portfolio: [],
                    isMock: true
                };
                localStorage.setItem(`mock_printer_${user.id}`, JSON.stringify(newMockPrinter));
                setPrinterData(newMockPrinter);
            }
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from('printers')
            .select('*')
            .eq('owner_id', user.id)
            .single();

        if (!error && data) {
            let currentData = data;
            // Check for 24h automatic activation
            if (data.status === 'Désactivé') {
                const createdAt = new Date(data.created_at);
                const now = new Date();
                const diffTime = Math.abs(now - createdAt);
                const diffHours = diffTime / (1000 * 60 * 60);
                if (diffHours >= 24) {
                    const { error: updateError } = await supabase
                        .from('printers')
                        .update({ status: 'En ligne' })
                        .eq('id', data.id);
                    if (!updateError) {
                        currentData = { ...data, status: 'En ligne' };
                        setTimeout(() => {
                            showToast("Votre profil a été activé automatiquement après 24 heures.", 'success');
                        }, 500);
                    }
                }
            }
            setPrinterData(currentData);
        }
        setLoading(false);
    };

    const toggleShopStatus = () => {
        setShowStatusModal(true);
    };

    const handleUpdateStatus = async () => {
        if (!printerData) return;
        setStatusModalLoading(true);
        const newStatus = printerData.status === 'En ligne' ? 'Désactivé' : 'En ligne';

        if (printerData.isMock || user?.isMock) {
            const updated = { ...printerData, status: newStatus };
            setPrinterData(updated);
            localStorage.setItem(`mock_printer_${user.id}`, JSON.stringify(updated));
            setShowStatusModal(false);
            showToast(
                `Boutique ${newStatus === 'En ligne' ? 'activée et visible' : 'désactivée et masquée'} avec succès.`,
                'success'
            );
            setStatusModalLoading(false);
            return;
        }

        const { error } = await supabase
            .from('printers')
            .update({ status: newStatus })
            .eq('id', printerData.id);

        if (!error) {
            setPrinterData({ ...printerData, status: newStatus });
            setShowStatusModal(false);
            showToast(
                `Boutique ${newStatus === 'En ligne' ? 'activée et visible' : 'désactivée et masquée'} avec succès.`,
                'success'
            );
        } else {
            showToast("Erreur lors de la modification du statut : " + error.message, 'error');
        }
        setStatusModalLoading(false);
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const handleLogout = async () => {
        const confirmed = await showConfirm("Déconnexion", "Êtes-vous sûr de vouloir vous déconnecter ?");
        if (confirmed) {
            // Always clean mock session data
            localStorage.removeItem('mock_user_session');
            localStorage.removeItem('force_password_change');
            if (user?.isMock) {
                setPage('home');
                window.location.reload();
            } else {
                await supabase.auth.signOut();
            }
        }
    };

    const handleOnboardingFile = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;
        setOnboardingUploading(true);

        if (printerData?.isMock || user?.isMock) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result;
                let updatedPrinter;
                if (type === 'logo') {
                    updatedPrinter = { ...printerData, logo_url: base64String };
                } else if (type === 'cover') {
                    updatedPrinter = { ...printerData, cover_url: base64String };
                } else if (type === 'portfolio') {
                    updatedPrinter = { ...printerData, portfolio: [...(printerData.portfolio || []), { image_url: base64String }] };
                }
                setPrinterData(updatedPrinter);
                localStorage.setItem(`mock_printer_${user.id}`, JSON.stringify(updatedPrinter));
                showToast("Élément mis à jour (Mode Démo) !", "success");
                setOnboardingUploading(false);
            };
            reader.readAsDataURL(file);
            return;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${printerData.id}/onboarding_${type}_${Date.now()}.${fileExt}`;
        
        try {
            const { error } = await supabase.storage
                .from('public-assets')
                .upload(fileName, file, { cacheControl: '3600', upsert: true });
            if (error) throw error;
            
            const { data: { publicUrl } } = supabase.storage
                .from('public-assets')
                .getPublicUrl(fileName);
                
            if (type === 'logo') {
                const { error: dbErr } = await supabase
                    .from('printers')
                    .update({ logo_url: publicUrl })
                    .eq('id', printerData.id);
                if (!dbErr) {
                    await fetchPrinterData();
                    showToast("Photo de profil mise à jour !", "success");
                }
            } else if (type === 'cover') {
                const { error: dbErr } = await supabase
                    .from('printers')
                    .update({ cover_url: publicUrl })
                    .eq('id', printerData.id);
                if (!dbErr) {
                    await fetchPrinterData();
                    showToast("Bannière de couverture mise à jour !", "success");
                }
            } else if (type === 'portfolio') {
                const updatedPortfolio = [...(printerData.portfolio || []), { image_url: publicUrl }];
                const { error: dbErr } = await supabase
                    .from('printers')
                    .update({ portfolio: updatedPortfolio })
                    .eq('id', printerData.id);
                if (!dbErr) {
                    await fetchPrinterData();
                    showToast("Première réalisation ajoutée !", "success");
                }
            }
        } catch (err) {
            console.warn("Storage upload failed, fallback to base64", err);
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result;
                let dbErr;
                if (type === 'logo') {
                    const res = await supabase.from('printers').update({ logo_url: base64String }).eq('id', printerData.id);
                    dbErr = res.error;
                } else if (type === 'cover') {
                    const res = await supabase.from('printers').update({ cover_url: base64String }).eq('id', printerData.id);
                    dbErr = res.error;
                } else if (type === 'portfolio') {
                    const updatedPortfolio = [...(printerData.portfolio || []), { image_url: base64String }];
                    const res = await supabase.from('printers').update({ portfolio: updatedPortfolio }).eq('id', printerData.id);
                    dbErr = res.error;
                }
                if (!dbErr) {
                    await fetchPrinterData();
                    showToast("Élément mis à jour !", "success");
                } else {
                    showToast("Erreur lors de la mise à jour : " + dbErr.message, "error");
                }
            };
            reader.readAsDataURL(file);
        } finally {
            setOnboardingUploading(false);
        }
    };

    const handleAddOnboardingService = async (e) => {
        e.preventDefault();
        if (!onboardingServiceName.trim() || !onboardingServiceDesc.trim()) return;
        setOnboardingServiceLoading(true);

        if (printerData?.isMock || user?.isMock) {
            const newServiceItem = {
                name: onboardingServiceName,
                description: onboardingServiceDesc,
                price: onboardingServicePrice,
                parameters: []
            };
            const updatedServices = [...(printerData.services || []), newServiceItem];
            const updatedPrinter = { ...printerData, services: updatedServices };
            setPrinterData(updatedPrinter);
            localStorage.setItem(`mock_printer_${user.id}`, JSON.stringify(updatedPrinter));
            showToast("Premier service ajouté avec succès (Mode Démo) !", "success");
            setOnboardingServiceName('');
            setOnboardingServiceDesc('');
            setOnboardingServicePrice('');
            setOnboardingServiceLoading(false);
            return;
        }

        const newServiceItem = {
            name: onboardingServiceName,
            description: onboardingServiceDesc,
            price: onboardingServicePrice,
            parameters: []
        };
        const updatedServices = [...(printerData.services || []), newServiceItem];
        const { error } = await supabase
            .from('printers')
            .update({ services: updatedServices })
            .eq('id', printerData.id);
        if (!error) {
            await fetchPrinterData();
            showToast("Premier service ajouté avec succès !", "success");
            setOnboardingServiceName('');
            setOnboardingServiceDesc('');
            setOnboardingServicePrice('');
        } else {
            showToast("Erreur lors de l'ajout : " + error.message, "error");
        }
        setOnboardingServiceLoading(false);
    };

    const menuItems = [
        { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard },
        { id: 'profile', label: 'Profil Public', icon: User },
        { id: 'services', label: 'Mes Services', icon: Wrench },
        { id: 'portfolio', label: 'Portfolio', icon: ImageIcon },
        { id: 'marketplace', label: 'Ma Boutique', icon: Store },
        { id: 'billing', label: 'Facturation', icon: CreditCard },
        { id: 'support', label: 'Contact Support', icon: MessageCircle },
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    // État d'abonnement (essai / actif / expiré)
    const sub = getSubscriptionState(printerData);

    // Paywall : essai terminé ET aucun abonnement actif → accès bloqué.
    if (printerData && !sub.hasAccess) {
        return (
            <div className="min-h-screen bg-[#0F0F13] flex flex-col text-[#FAF8F5] font-sans selection:bg-[#C9A84C] selection:text-[#0F0F13]">
                <div className="noise-overlay opacity-5 pointer-events-none"></div>

                <header className="px-8 py-6 border-b border-white/10 flex justify-between items-center bg-[#0F0F13]/85 backdrop-blur-xl sticky top-0 z-50">
                    <img src="/logo.png" alt="Logo" className="h-10 w-auto brightness-200" />
                    <button
                        onClick={handleLogout}
                        className="px-6 py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 active:scale-95 transition-all font-black text-xs uppercase tracking-wider flex items-center gap-2"
                    >
                        <LogOut size={16} />
                        Déconnexion
                    </button>
                </header>

                <main className="flex-1 flex items-center justify-center p-6 md:p-12 relative z-10">
                    <div className="max-w-5xl w-full space-y-10">
                        <div className="text-center max-w-2xl mx-auto">
                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 text-red-300 border border-red-500/20 text-[11px] font-black uppercase tracking-widest mb-6">
                                <Clock size={14} /> Votre essai gratuit est terminé
                            </span>
                            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
                                Réactivez votre <span className="italic font-serif text-[#C9A84C]">vitrine.</span>
                            </h1>
                            <p className="text-[#FAF8F5]/60 text-base md:text-lg leading-relaxed font-medium mt-5">
                                Votre profil est actuellement masqué de l'annuaire. Choisissez une
                                formule pour réactiver instantanément votre boutique et votre visibilité.
                            </p>
                        </div>

                        <SubscriptionPanel printerData={printerData} user={user} showToast={showToast} dark />
                    </div>
                </main>
            </div>
        );
    }

    // Force onboarding checker
    const hasCustomLogo = printerData?.logo_url && !printerData.logo_url.includes('ui-avatars.com');
    const hasCustomCover = printerData?.cover_url && printerData.cover_url !== 'https://images.unsplash.com/photo-1562664347-4950157077a9?q=80&w=2500&auto=format&fit=crop';
    const hasServices = printerData?.services && printerData.services.length > 0;
    const hasPortfolio = printerData?.portfolio && printerData.portfolio.length > 0;
    const isProfileComplete = hasCustomLogo && hasCustomCover && hasServices && hasPortfolio;

    if (!isProfileComplete) {
        return (
            <div className="min-h-screen bg-[#0F0F13] flex flex-col text-[#FAF8F5] font-sans selection:bg-[#C9A84C] selection:text-[#0F0F13]">
                <div className="noise-overlay opacity-5 pointer-events-none"></div>
                
                {/* Hidden Onboarding File Inputs */}
                <input type="file" ref={logoRef} onChange={(e) => handleOnboardingFile(e, 'logo')} accept="image/*" className="hidden" />
                <input type="file" ref={coverRef} onChange={(e) => handleOnboardingFile(e, 'cover')} accept="image/*" className="hidden" />
                <input type="file" ref={portfolioRef} onChange={(e) => handleOnboardingFile(e, 'portfolio')} accept="image/*" className="hidden" />

                <header className="px-8 py-6 border-b border-white/10 flex justify-between items-center bg-[#0F0F13]/85 backdrop-blur-xl sticky top-0 z-50">
                    <img src="/logo.png" alt="Logo" className="h-10 w-auto brightness-200" />
                    <button 
                        onClick={handleLogout} 
                        className="px-6 py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 active:scale-95 transition-all font-black text-xs uppercase tracking-wider flex items-center gap-2"
                    >
                        <LogOut size={16} />
                        Déconnexion
                    </button>
                </header>

                <main className="flex-1 flex items-center justify-center p-6 md:p-12 relative z-10">
                    <div className="max-w-3xl w-full bg-white/5 border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden space-y-10">
                        {onboardingUploading && (
                            <div className="absolute inset-0 bg-[#0F0F13]/90 backdrop-blur-md z-50 flex flex-col items-center justify-center gap-4">
                                <Loader2 className="animate-spin text-[#C9A84C]" size={40} />
                                <span className="font-mono text-xs uppercase tracking-widest text-[#C9A84C]">Envoi en cours...</span>
                            </div>
                        )}
                        <div className="absolute top-0 right-0 w-80 h-80 bg-[#C9A84C]/5 rounded-full blur-[100px] pointer-events-none"></div>

                        <div>
                            <span className="text-[10px] font-black text-[#C9A84C] uppercase tracking-[0.3em] mb-2 block">Configuration Obligatoire</span>
                            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                                Finalisez votre Profil <br />
                                <span className="italic font-serif text-[#C9A84C]">Professionnel.</span>
                            </h2>
                            <p className="text-[#FAF8F5]/60 text-sm leading-relaxed font-medium mt-4">
                                Pour garantir le sérieux et la qualité de la plateforme, vous devez configurer ces 4 éléments avant d'accéder au tableau de bord complet et d'activer votre vitrine.
                            </p>
                        </div>

                        {/* Onboarding Checklist */}
                        <div className="space-y-6">
                            {/* Step 1: Logo */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 bg-white/5 border border-white/5 rounded-2xl">
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                                        ${hasCustomLogo ? 'bg-green-500 text-white' : 'bg-white/10 text-white/40'}`}>
                                        {hasCustomLogo ? '✓' : '1'}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-base text-white">Photo de profil / Logo</h4>
                                        <p className="text-xs text-[#FAF8F5]/45">Uploadez le logo ou la photo de votre enseigne.</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => logoRef.current?.click()}
                                    className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shrink-0
                                        ${hasCustomLogo ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-[#C9A84C] text-[#0F0F13] hover:scale-105 active:scale-95'}`}
                                >
                                    {hasCustomLogo ? 'Modifier' : 'Uploader'}
                                </button>
                            </div>

                            {/* Step 2: Cover */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 bg-white/5 border border-white/5 rounded-2xl">
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                                        ${hasCustomCover ? 'bg-green-500 text-white' : 'bg-white/10 text-white/40'}`}>
                                        {hasCustomCover ? '✓' : '2'}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-base text-white">Bannière de couverture</h4>
                                        <p className="text-xs text-[#FAF8F5]/45">Uploadez une image représentative de votre atelier ou de vos locaux.</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => coverRef.current?.click()}
                                    className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shrink-0
                                        ${hasCustomCover ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-[#C9A84C] text-[#0F0F13] hover:scale-105 active:scale-95'}`}
                                >
                                    {hasCustomCover ? 'Modifier' : 'Uploader'}
                                </button>
                            </div>

                            {/* Step 3: First Service */}
                            <div className="flex flex-col gap-4 p-6 bg-white/5 border border-white/5 rounded-2xl">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                                            ${hasServices ? 'bg-green-500 text-white' : 'bg-white/10 text-white/40'}`}>
                                            {hasServices ? '✓' : '3'}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-base text-white">Premier service / Spécialité</h4>
                                            <p className="text-xs text-[#FAF8F5]/45">Détaillez une première offre de votre entreprise.</p>
                                        </div>
                                    </div>
                                    {hasServices && (
                                        <span className="px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-xl font-bold text-xs shrink-0">Ajouté</span>
                                    )}
                                </div>

                                {!hasServices && (
                                    <form onSubmit={handleAddOnboardingService} className="mt-4 space-y-4 border-t border-white/5 pt-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <input 
                                                required
                                                placeholder="Nom du service (Ex: Impression Offset)"
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#C9A84C]/50 text-xs font-bold text-[#FAF8F5]"
                                                value={onboardingServiceName}
                                                onChange={(e) => setOnboardingServiceName(e.target.value)}
                                            />
                                            <input 
                                                placeholder="Prix de départ (FCFA - Ex: 5 000)"
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#C9A84C]/50 text-xs font-bold text-[#FAF8F5]"
                                                value={onboardingServicePrice}
                                                onChange={(e) => setOnboardingServicePrice(e.target.value)}
                                            />
                                        </div>
                                        <textarea 
                                            required
                                            rows="2"
                                            placeholder="Description courte..."
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#C9A84C]/50 text-xs font-bold text-[#FAF8F5] resize-none"
                                            value={onboardingServiceDesc}
                                            onChange={(e) => setOnboardingServiceDesc(e.target.value)}
                                        ></textarea>
                                        <button 
                                            type="submit"
                                            disabled={onboardingServiceLoading}
                                            className="bg-[#C9A84C] text-[#0F0F13] px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                        >
                                            {onboardingServiceLoading ? <Loader2 className="animate-spin" size={14} /> : "Enregistrer mon premier service"}
                                        </button>
                                    </form>
                                )}
                            </div>

                            {/* Step 4: Portfolio */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 bg-white/5 border border-white/5 rounded-2xl">
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                                        ${hasPortfolio ? 'bg-green-500 text-white' : 'bg-white/10 text-white/40'}`}>
                                        {hasPortfolio ? '✓' : '4'}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-base text-white">Première réalisation</h4>
                                        <p className="text-xs text-[#FAF8F5]/45">Ajoutez une image montrant un projet fini au portfolio.</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => portfolioRef.current?.click()}
                                    className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shrink-0
                                        ${hasPortfolio ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-[#C9A84C] text-[#0F0F13] hover:scale-105 active:scale-95'}`}
                                >
                                    {hasPortfolio ? 'Uploader une autre' : 'Uploader'}
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
                
                {/* Onboarding Toast */}
                {toast && (
                    <div className="fixed bottom-6 right-6 z-[9999] bg-[#0E0E12] border-2 border-white/10 rounded-3xl p-6 shadow-2xl flex items-center gap-4 max-w-sm animate-in slide-in-from-bottom-5 duration-500 text-white">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white
                            ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                            <CheckCircle2 size={22} />
                        </div>
                        <div className="text-left">
                            <h4 className="font-black text-sm text-white uppercase tracking-wider">
                                {toast.type === 'success' ? 'Succès' : 'Information'}
                            </h4>
                            <p className="text-xs text-white/70 font-bold mt-0.5">
                                {toast.message}
                            </p>
                        </div>
                    </div>
                )}

                {/* Custom Confirmation dialog inside Onboarding */}
                {confirmDialog && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-primary/45 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl border border-primary/10 animate-in zoom-in-95 duration-300 text-dark">
                            <div className="bg-primary p-8 text-accent flex justify-between items-center">
                                <div>
                                    <h4 className="text-xl font-black mb-1 text-white">{confirmDialog.title}</h4>
                                    <p className="text-accent/60 text-[10px] font-bold tracking-widest uppercase">Confirmation requise</p>
                                </div>
                                <button 
                                    onClick={() => {
                                        confirmDialog.resolve(false);
                                        setConfirmDialog(null);
                                    }} 
                                    className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-all text-white"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-8 space-y-6">
                                <p className="text-dark/70 text-sm leading-relaxed font-medium">
                                    {confirmDialog.message}
                                </p>
                                <div className="flex gap-4 pt-4 border-t border-dark/5">
                                    <button 
                                        onClick={() => {
                                            confirmDialog.resolve(false);
                                            setConfirmDialog(null);
                                        }}
                                        className="flex-1 bg-dark/5 hover:bg-dark/10 py-4 rounded-xl font-bold text-sm text-dark transition-all"
                                    >
                                        Annuler
                                    </button>
                                    <button 
                                        onClick={() => {
                                            confirmDialog.resolve(true);
                                            setConfirmDialog(null);
                                        }}
                                        className="flex-1 bg-red-500 hover:bg-red-600 py-4 rounded-xl font-black text-sm text-white transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-red-500/20"
                                    >
                                        Confirmer
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex text-dark font-sans selection:bg-accent selection:text-white">
            <div className="noise-overlay opacity-5 pointer-events-none"></div>

            {/* Sidebar Desktop */}
            <aside className="hidden lg:flex flex-col w-80 bg-white border-r border-dark/5 sticky top-0 h-screen z-50">
                <div className="p-10 flex items-center gap-4">
                    <img src="/logo.png" alt="Logo" className="h-12 w-auto" />
                </div>

                <nav className="flex-1 px-6 space-y-2 mt-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-dark/30 mb-6 px-4">Menu Principal</div>
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-bold transition-all group
                                ${activeTab === item.id ? 'bg-primary text-white shadow-2xl shadow-primary/20' : 'text-dark/50 hover:bg-dark/5 hover:text-dark'}`}
                        >
                            <item.icon size={20} className={activeTab === item.id ? '' : 'group-hover:scale-110 transition-transform'} />
                            <span>{item.label}</span>
                            {activeTab === item.id && <ChevronRight size={16} className="ml-auto opacity-50" />}
                        </button>
                    ))}
                </nav>

                <div className="p-8 border-t border-dark/5">
                    <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-red-500 hover:bg-red-50 transition-colors"
                    >
                        <LogOut size={20} />
                        <span>Déconnexion</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-dark/5 px-6 py-4 flex items-center justify-between">
                <img src="/logo.png" alt="Logo" className="h-8 w-auto" />
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setActiveTab('support')} 
                        className="p-2.5 bg-primary/10 text-primary rounded-xl hover:scale-105 active:scale-95 transition-transform flex items-center gap-1.5 font-black text-[10px] uppercase tracking-wider shadow-sm border border-primary/20"
                    >
                        <MessageCircle size={14} />
                        Support
                    </button>
                    <button 
                        onClick={handleLogout} 
                        className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:scale-105 active:scale-95 transition-transform flex items-center gap-1.5 font-black text-[10px] uppercase tracking-wider shadow-sm border border-red-100"
                    >
                        <LogOut size={14} />
                        Déconnexion
                    </button>
                </div>
            </div>

            {/* Mobile Bottom Navigation Bar */}
            <div className="lg:hidden fixed bottom-6 left-6 right-6 z-[100] bg-[#F5F5DC] border border-[#3D0B37]/10 rounded-full px-6 py-4 flex justify-around items-center shadow-2xl shadow-[#3D0B37]/20">
                {menuItems.filter(item => !['billing', 'support'].includes(item.id)).map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === item.id ? 'text-[#3D0B37] scale-110 font-black' : 'text-[#3D0B37]/40 hover:text-[#3D0B37]/70'}`}
                    >
                        <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                        <span className="text-[8px] font-black uppercase tracking-wider">
                            {item.id === 'overview' ? 'Accueil' : item.id === 'profile' ? 'Profil' : item.id === 'services' ? 'Services' : item.id === 'portfolio' ? 'Portfolio' : 'Boutique'}
                        </span>
                    </button>
                ))}
            </div>

            {/* Main Content Area */}
            <main className="flex-1 lg:p-12 p-6 pb-32 pt-24 lg:pt-12 overflow-y-auto">
                <div className="max-w-6xl mx-auto">
                    {/* Bannière essai gratuit */}
                    {sub.isTrial && (
                        <button
                            onClick={() => setActiveTab('billing')}
                            className="w-full mb-8 group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-primary text-white rounded-[1.75rem] px-7 py-5 shadow-2xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all text-left"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-2xl bg-[#C9A84C]/20 text-[#C9A84C] flex items-center justify-center shrink-0">
                                    <Clock size={22} />
                                </div>
                                <div>
                                    <p className="font-black text-sm">
                                        Essai gratuit — {sub.daysLeft} jour{sub.daysLeft > 1 ? 's' : ''} restant{sub.daysLeft > 1 ? 's' : ''}
                                    </p>
                                    <p className="text-white/60 text-xs font-medium mt-0.5">
                                        Souscrivez avant la fin pour ne pas perdre votre visibilité.
                                    </p>
                                </div>
                            </div>
                            <span className="bg-[#C9A84C] text-[#0F0F13] px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 shrink-0">
                                <Crown size={15} /> Voir les formules
                            </span>
                        </button>
                    )}

                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
                        <div>
                            <h1 className="text-sm font-black text-accent uppercase tracking-[0.3em] mb-4">Espace Professionnel</h1>
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 rounded-[2rem] border-4 border-white shadow-2xl overflow-hidden bg-white">
                                    <img src={printerData?.logo_url} alt="Logo" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h2 className="text-3xl md:text-5xl font-black tracking-tight text-dark">{printerData?.name}</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className={`w-2 h-2 rounded-full ${printerData?.status === 'En ligne' ? 'bg-[#25D366]' : 'bg-red-500 animate-pulse'}`}></div>
                                        <span className="text-[10px] font-mono text-dark/40 uppercase tracking-widest font-bold">
                                            {printerData?.status === 'En ligne' ? 'Actif' : 'Désactivé'} • {printerData?.city || 'Sénégal'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4">
                            <button 
                                onClick={toggleShopStatus}
                                className={`px-6 py-4 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-md text-xs uppercase tracking-widest
                                    ${printerData?.status === 'En ligne' 
                                        ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20' 
                                        : 'bg-green-500/10 text-green-500 hover:bg-green-500/20 border border-green-500/20'}`}
                            >
                                {printerData?.status === 'En ligne' ? 'Désactiver boutique' : 'Activer boutique'}
                            </button>
                            <div className="relative">
                                <button 
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className="w-14 h-14 bg-white border border-dark/5 rounded-2xl flex items-center justify-center text-dark/40 hover:text-dark transition-all shadow-xl shadow-dark/5 relative"
                                >
                                    {notifications.filter(n => !n.read).length > 0 && (
                                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                                            {notifications.filter(n => !n.read).length}
                                        </div>
                                    )}
                                    <Bell size={24} />
                                </button>

                                {showNotifications && (
                                    <>
                                        <div className="fixed inset-0 z-[140]" onClick={() => setShowNotifications(false)}></div>
                                        <div className="absolute right-0 top-full mt-4 w-80 sm:w-96 bg-[#FAF8F5] border border-[#3D0B37]/10 rounded-[2rem] p-6 shadow-2xl z-[150] space-y-4 animate-in fade-in slide-in-from-top-5 duration-300">
                                            <div className="flex items-center justify-between border-b border-[#3D0B37]/10 pb-3">
                                                <h4 className="font-black text-xs uppercase tracking-widest text-[#3D0B37]">Notifications</h4>
                                                {notifications.filter(n => !n.read).length > 0 && (
                                                    <button 
                                                        onClick={() => {
                                                            setNotifications(notifications.map(n => ({ ...n, read: true })));
                                                            showToast("Toutes les notifications ont été marquées comme lues.", "success");
                                                        }}
                                                        className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline animate-pulse"
                                                    >
                                                        Tout lire
                                                    </button>
                                                )}
                                            </div>
                                            
                                            <div className="max-h-64 overflow-y-auto space-y-3 custom-scrollbar">
                                                {notifications.length === 0 ? (
                                                    <p className="text-center text-xs text-[#3D0B37]/30 py-6 font-bold">Aucune notification</p>
                                                ) : (
                                                    notifications.map(n => (
                                                        <div 
                                                            key={n.id} 
                                                            className={`p-4 rounded-2xl border transition-all text-left relative ${
                                                                n.read 
                                                                    ? 'bg-[#3D0B37]/2 border-transparent text-[#3D0B37]/50' 
                                                                    : 'bg-[#3D0B37]/5 border-[#3D0B37]/10 text-[#3D0B37] font-bold shadow-md shadow-[#3D0B37]/2'
                                                            }`}
                                                        >
                                                            <div className="flex justify-between items-start gap-2">
                                                                <span className="text-[10px] uppercase tracking-wider font-black">{n.title}</span>
                                                                <span className="text-[8px] opacity-40 font-mono shrink-0">{n.time}</span>
                                                            </div>
                                                            <p className="text-[11px] leading-relaxed mt-1.5 opacity-75 font-medium">{n.message}</p>
                                                            {!n.read && (
                                                                <button 
                                                                    onClick={() => {
                                                                        setNotifications(notifications.map(notif => notif.id === n.id ? { ...notif, read: true } : notif));
                                                                    }}
                                                                    className="text-[9px] font-black uppercase text-primary hover:underline mt-2.5 block"
                                                                >
                                                                    Marquer comme lu
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                            <button 
                                onClick={() => setPage('home')}
                                className="bg-dark text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-dark/20"
                            >
                                <Eye size={20} />
                                <span className="hidden sm:inline">Voir mon site public</span>
                            </button>
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                        {activeTab === 'overview' && <DashboardOverview printerData={printerData} setActiveTab={triggerTabWithModal} />}
                        {activeTab === 'profile' && <DashboardProfile printerData={printerData} onUpdate={fetchPrinterData} showToast={showToast} />}
                        {activeTab === 'services' && <DashboardServices printerData={printerData} onUpdate={fetchPrinterData} autoOpenModal={autoOpenModal} setAutoOpenModal={setAutoOpenModal} showToast={showToast} showConfirm={showConfirm} />}
                        {activeTab === 'portfolio' && <DashboardPortfolio printerData={printerData} onUpdate={fetchPrinterData} autoOpenModal={autoOpenModal} setAutoOpenModal={setAutoOpenModal} showToast={showToast} showConfirm={showConfirm} />}
                        {activeTab === 'marketplace' && <DashboardMarketplace printerData={printerData} onUpdate={fetchPrinterData} autoOpenModal={autoOpenModal} setAutoOpenModal={setAutoOpenModal} showToast={showToast} showConfirm={showConfirm} />}
                        {activeTab === 'support' && (
                            <div className="bg-white border border-dark/5 rounded-[3rem] p-10 md:p-16 shadow-2xl relative overflow-hidden space-y-10 animate-in fade-in duration-500">
                                <div className="absolute top-0 right-0 w-[50%] h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none"></div>
                                
                                <div>
                                    <h2 className="text-4xl font-black tracking-tight mb-2">Contacter le Support</h2>
                                    <p className="text-dark/40 text-lg">Une question ou un problème technique ? Envoyez-nous un message.</p>
                                </div>

                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    const subject = e.target.subject.value;
                                    const message = e.target.message.value;
                                    const links = e.target.links.value;
                                    
                                    setSupportSubmitting(true);
                                    
                                    try {
                                        const formData = new FormData();
                                        formData.append('Nom de l\'imprimeur', printerData?.name || 'Non renseigné');
                                        formData.append('Personne qui gère l\'imprimerie', `${printerData?.first_name || ''} ${printerData?.last_name || ''}`);
                                        formData.append('Adresse e-mail', user?.email || 'Non renseignée');
                                        formData.append('Numéro WhatsApp', printerData?.whatsapp || 'Non renseigné');
                                        formData.append('_subject', `[Printacote Support] ${subject}`);
                                        formData.append('Sujet', subject);
                                        formData.append('Message', message);
                                        formData.append('Liens additionnels', links || 'Aucun');
                                        
                                        if (supportFile) {
                                            formData.append('attachment', supportFile);
                                        }

                                        const response = await fetch('https://formsubmit.co/ajax/bskdezigner@gmail.com', {
                                            method: 'POST',
                                            body: formData
                                        });

                                        if (response.ok) {
                                            showToast("Votre message a été envoyé avec succès !", "success");
                                            e.target.reset();
                                            setSupportFile(null);
                                            setSupportFilePreview(null);
                                        } else {
                                            showToast("Une erreur est survenue lors de l'envoi. Veuillez réessayer.", "error");
                                        }
                                    } catch (error) {
                                        showToast("Impossible de contacter le serveur de messagerie.", "error");
                                    } finally {
                                        setSupportSubmitting(false);
                                    }
                                }} className="space-y-6 max-w-2xl relative z-10">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Objet du message</label>
                                        <input 
                                            name="subject"
                                            required
                                            placeholder="Ex: Problème d'affichage de mon logo"
                                            className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm"
                                        />
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Votre Message</label>
                                        <textarea 
                                            name="message"
                                            required
                                            rows="5"
                                            placeholder="Décrivez en détail votre demande..."
                                            className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold resize-none text-sm"
                                        ></textarea>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Liens additionnels (Optionnel)</label>
                                        <textarea 
                                            name="links"
                                            rows="2"
                                            placeholder="Ex: Lien vers une capture d'écran, Dropbox, Google Drive..."
                                            className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold resize-none text-xs"
                                        ></textarea>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Capture d'écran / Image (Optionnel)</label>
                                        <div className="flex items-center gap-4">
                                            {supportFilePreview ? (
                                                <div className="relative w-32 h-32 rounded-3xl overflow-hidden border-2 border-primary/10 group shadow-lg">
                                                    <img src={supportFilePreview} alt="Aperçu" className="w-full h-full object-cover" />
                                                    <button 
                                                        type="button"
                                                        onClick={() => {
                                                            setSupportFile(null);
                                                            setSupportFilePreview(null);
                                                        }}
                                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:scale-110 active:scale-90 transition-transform shadow-md"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-dark/10 rounded-[2rem] cursor-pointer hover:bg-dark/5 hover:border-primary/20 transition-all p-6 group">
                                                    <div className="flex flex-col items-center justify-center text-center">
                                                        <ImageIcon size={28} className="text-dark/30 group-hover:text-primary/50 group-hover:scale-110 transition-all mb-2" />
                                                        <p className="text-xs text-dark/40 font-bold group-hover:text-dark transition-colors">Cliquez pour ajouter une capture d'écran</p>
                                                        <p className="text-[9px] text-dark/30 mt-1 uppercase tracking-wider font-bold">Formats acceptés : PNG, JPG, JPEG (Max 5Mo)</p>
                                                    </div>
                                                    <input 
                                                        type="file" 
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                if (file.size > 5 * 1024 * 1024) {
                                                                    showToast("L'image ne doit pas dépasser 5 Mo.", "error");
                                                                    return;
                                                                }
                                                                setSupportFile(file);
                                                                const reader = new FileReader();
                                                                reader.onloadend = () => {
                                                                    setSupportFilePreview(reader.result);
                                                                };
                                                                reader.readAsDataURL(file);
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    {/* Auto-filled information preview */}
                                    <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 text-xs text-primary/70 space-y-2 font-medium">
                                        <h4 className="font-black uppercase tracking-wider mb-2 text-primary">Informations transmises automatiquement :</h4>
                                        <div><strong className="text-primary">Nom de l'imprimeur :</strong> {printerData?.name || 'Non renseigné'}</div>
                                        <div><strong className="text-primary">Personne qui gère l'imprimerie :</strong> {printerData?.first_name || ''} {printerData?.last_name || ''}</div>
                                        <div><strong className="text-primary">Adresse e-mail :</strong> {user?.email || 'Non renseignée'}</div>
                                        <div><strong className="text-primary">Numéro WhatsApp :</strong> {printerData?.whatsapp || 'Non renseigné'}</div>
                                    </div>

                                    <button 
                                        type="submit"
                                        disabled={supportSubmitting}
                                        className="bg-primary text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        {supportSubmitting ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                Envoi en cours...
                                            </>
                                        ) : (
                                            "Envoyer le message au Support"
                                        )}
                                    </button>
                                </form>
                            </div>
                        )}
                        {activeTab === 'billing' && (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                {/* Statut courant de l'abonnement */}
                                <div className={`rounded-[2rem] p-8 border flex flex-col sm:flex-row sm:items-center justify-between gap-6
                                    ${sub.status === 'active'
                                        ? 'bg-green-500/5 border-green-500/20'
                                        : sub.status === 'trial'
                                            ? 'bg-primary/5 border-primary/15'
                                            : 'bg-red-500/5 border-red-500/20'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0
                                            ${sub.status === 'active' ? 'bg-green-500/15 text-green-600' : sub.status === 'trial' ? 'bg-primary/10 text-primary' : 'bg-red-500/15 text-red-500'}`}>
                                            {sub.status === 'active' ? <Crown size={26} /> : <Clock size={26} />}
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-dark/40">Votre abonnement</span>
                                            <h3 className="text-xl font-black text-dark mt-0.5">
                                                {sub.status === 'active' && 'Abonnement actif'}
                                                {sub.status === 'trial' && 'Période d\'essai'}
                                                {sub.status === 'expired' && 'Abonnement expiré'}
                                            </h3>
                                            {sub.endsAt && (
                                                <p className="text-xs font-bold text-dark/50 mt-0.5">
                                                    {sub.hasAccess
                                                        ? `Expire le ${sub.endsAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} (${sub.daysLeft} j restants)`
                                                        : `Terminé le ${sub.endsAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Grille des formules */}
                                <div className="bg-white border border-dark/5 rounded-[3rem] p-8 md:p-12 shadow-2xl">
                                    <SubscriptionPanel printerData={printerData} user={user} showToast={showToast} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Custom Status Toggle Modal */}
            {showStatusModal && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-primary/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl border border-primary/10 animate-in zoom-in-95 duration-300">
                        <div className="bg-primary p-8 text-accent flex justify-between items-center">
                            <div>
                                <h4 className="text-2xl font-black mb-1">
                                    {printerData?.status === 'En ligne' ? 'Désactiver la boutique ?' : 'Activer la boutique ?'}
                                </h4>
                                <p className="text-accent/60 text-xs font-bold tracking-widest uppercase">Gestion de la visibilité</p>
                            </div>
                            <button 
                                onClick={() => setShowStatusModal(false)} 
                                className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all shrink-0 text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            {printerData?.status === 'En ligne' ? (
                                <div className="space-y-4">
                                    <div className="bg-red-500/10 border border-red-500/20 text-red-600 p-6 rounded-2xl text-sm font-medium leading-relaxed">
                                        ⚠️ <strong>Attention :</strong> En désactivant votre boutique, les effets suivants s'appliqueront :
                                        <ul className="list-disc list-inside mt-3 space-y-2 text-xs text-red-600/80">
                                            <li>Votre profil d'imprimerie ne sera plus répertorié dans l'annuaire public.</li>
                                            <li>Tous vos produits en vente sur la marketplace seront temporairement masqués.</li>
                                            <li>Les clients ne pourront plus accéder à vos coordonnées publiques.</li>
                                        </ul>
                                    </div>
                                    <p className="text-dark/60 text-sm leading-relaxed">
                                        Vous pourrez réactiver votre boutique à tout moment depuis ce tableau de bord pour restaurer votre visibilité.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-green-500/10 border border-green-500/20 text-green-700 p-6 rounded-2xl text-sm font-medium leading-relaxed">
                                        ✨ <strong>Félicitations :</strong> En activant votre boutique :
                                        <ul className="list-disc list-inside mt-3 space-y-2 text-xs text-green-700/80">
                                            <li>Votre profil réapparaîtra instantanément dans l'annuaire des imprimeurs.</li>
                                            <li>Vos produits de la marketplace seront à nouveau visibles et prêts à la vente.</li>
                                            <li>Les clients pourront vous contacter directement via WhatsApp.</li>
                                        </ul>
                                    </div>
                                    <p className="text-dark/60 text-sm leading-relaxed">
                                        Votre visibilité sera restaurée immédiatement pour attirer de nouveaux clients.
                                    </p>
                                </div>
                            )}
                            
                            <div className="flex gap-4 pt-4 border-t border-dark/5">
                                <button 
                                    onClick={() => setShowStatusModal(false)}
                                    className="flex-1 bg-dark/5 hover:bg-dark/10 py-4 rounded-xl font-bold text-sm text-dark transition-all"
                                >
                                    Annuler
                                </button>
                                <button 
                                    onClick={handleUpdateStatus}
                                    disabled={statusModalLoading}
                                    className={`flex-1 py-4 rounded-xl font-black text-sm text-white transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2
                                        ${printerData?.status === 'En ligne' ? 'bg-red-500 shadow-lg shadow-red-500/20' : 'bg-green-500 shadow-lg shadow-green-500/20'}`}
                                >
                                    {statusModalLoading ? 'Mise à jour...' : printerData?.status === 'En ligne' ? 'Confirmer la désactivation' : 'Confirmer l\'activation'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom confirmation dialog */}
            {confirmDialog && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-primary/45 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl border border-primary/10 animate-in zoom-in-95 duration-300 text-dark">
                        <div className="bg-primary p-8 text-accent flex justify-between items-center">
                            <div>
                                <h4 className="text-xl font-black mb-1 text-white">{confirmDialog.title}</h4>
                                <p className="text-accent/60 text-[10px] font-bold tracking-widest uppercase">Confirmation requise</p>
                            </div>
                            <button 
                                onClick={() => {
                                    confirmDialog.resolve(false);
                                    setConfirmDialog(null);
                                }} 
                                className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-all text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <p className="text-dark/70 text-sm leading-relaxed font-medium">
                                {confirmDialog.message}
                            </p>
                            <div className="flex gap-4 pt-4 border-t border-dark/5">
                                <button 
                                    onClick={() => {
                                        confirmDialog.resolve(false);
                                        setConfirmDialog(null);
                                    }}
                                    className="flex-1 bg-dark/5 hover:bg-dark/10 py-4 rounded-xl font-bold text-sm text-dark transition-all"
                                >
                                    Annuler
                                </button>
                                <button 
                                    onClick={() => {
                                        confirmDialog.resolve(true);
                                        setConfirmDialog(null);
                                    }}
                                    className="flex-1 bg-red-500 hover:bg-red-600 py-4 rounded-xl font-black text-sm text-white transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-red-500/20"
                                >
                                    Confirmer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Forced Password Change Modal */}
            {forcePasswordChange && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-[#3D0B37]/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl border border-[#3D0B37]/10 animate-in zoom-in-95 duration-300 text-dark">
                        <div className="bg-[#3D0B37] p-8 text-[#FAF8F5] flex justify-between items-center">
                            <div>
                                <h4 className="text-2xl font-black mb-1">Mot de passe temporaire détecté</h4>
                                <p className="text-accent/60 text-xs font-bold tracking-widest uppercase">Modification Obligatoire</p>
                            </div>
                        </div>
                        <form onSubmit={handleForcedPasswordUpdate} className="p-8 space-y-6">
                            <p className="text-dark/50 text-xs leading-relaxed font-semibold">
                                Vous êtes connecté à l'aide d'un code de récupération. Par mesure de sécurité, veuillez définir un nouveau mot de passe pour votre compte avant d'accéder au tableau de bord.
                            </p>
                            
                            {passError && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-start gap-2 text-xs">
                                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                    <span>{passError}</span>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Nouveau mot de passe</label>
                                <input 
                                    type="password"
                                    required
                                    placeholder="Minimum 6 caractères"
                                    className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Confirmer le mot de passe</label>
                                <input 
                                    type="password"
                                    required
                                    placeholder="Ressaisir le mot de passe"
                                    className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>

                            <button 
                                type="submit"
                                disabled={passwordLoading}
                                className="w-full bg-primary text-white py-5 rounded-[2rem] font-black text-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-xl shadow-primary/25 disabled:opacity-50"
                            >
                                {passwordLoading ? <Loader2 className="animate-spin" size={20} /> : "Enregistrer et accéder au site"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Custom generalized toast */}
            {toast && (
                <div className="fixed bottom-24 lg:bottom-6 right-6 z-[9999] bg-white border-2 border-primary/10 rounded-3xl p-6 shadow-2xl flex items-center gap-4 max-w-sm animate-in slide-in-from-bottom-5 duration-500 text-dark">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white
                        ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                        <CheckCircle2 size={22} />
                    </div>
                    <div className="text-left">
                        <h4 className="font-black text-sm text-primary uppercase tracking-wider">
                            {toast.type === 'success' ? 'Succès' : 'Information'}
                        </h4>
                        <p className="text-xs text-primary/70 font-bold mt-0.5">
                            {toast.message}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;
