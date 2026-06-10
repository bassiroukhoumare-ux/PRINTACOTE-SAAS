import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { compressImage } from '../lib/image';
import { useRef } from 'react';
import {
    LayoutDashboard, User, Wrench, Image as ImageIcon,
    Store, CreditCard, LogOut, Menu, X, Eye, Star,
    MessageCircle, Plus, ChevronRight, Bell, CheckCircle2, Loader2, AlertCircle,
    Crown, Clock, Phone, MapPin, Globe, Users
} from 'lucide-react';
import DashboardOverview from './dashboard/DashboardOverview';
import DashboardProfile from './dashboard/DashboardProfile';
import DashboardServices from './dashboard/DashboardServices';
import DashboardPortfolio from './dashboard/DashboardPortfolio';
import DashboardMarketplace from './dashboard/DashboardMarketplace';
import DashboardReviews from './dashboard/DashboardReviews';
import SubscriptionPanel from '../components/SubscriptionPanel';
import UpgradeOverlay from '../components/UpgradeOverlay';
import { getSubscriptionState, getTierLimits } from '../lib/subscription';

const DashboardPage = ({ setPage, user }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [printerData, setPrinterData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [autoOpenModal, setAutoOpenModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusModalLoading, setStatusModalLoading] = useState(false);
    const [myMessages, setMyMessages] = useState([]);
    const [messagesLoading, setMessagesLoading] = useState(false);

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
    const [selectedFullMessage, setSelectedFullMessage] = useState(null);
    
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
        if (!printerData) return;
        const sub = getSubscriptionState(printerData);
        
        if (sub.status === 'active' && sub.endsAt) {
            const now = Date.now();
            const endsAtTime = new Date(sub.endsAt).getTime();
            const daysLeftBeforeGrace = Math.ceil((endsAtTime - now) / (1000 * 60 * 60 * 24));
            
            // Notification 2 jours avant l'expiration nominale
            if (daysLeftBeforeGrace > 0 && daysLeftBeforeGrace <= 2) {
                const notifId = `sub_expiring_${sub.endsAt}`;
                setNotifications(prev => {
                    if (prev.some(n => n.id === notifId)) return prev;
                    return [{
                        id: notifId,
                        title: "Abonnement bientôt expiré",
                        message: `Votre abonnement de ${sub.planId === '1m' ? '1 mois' : sub.planId === '3m' ? '3 mois' : '1 an'} arrive à terme dans ${daysLeftBeforeGrace} jour(s). Pensez à le renouveler depuis votre espace de facturation.`,
                        time: new Date().toLocaleDateString('fr-FR'),
                        read: false,
                        type: 'warning'
                    }, ...prev];
                });
            }
            
            // Notification pendant la période de grâce active
            if (sub.isGracePeriod) {
                const notifId = `sub_grace_${sub.endsAt}`;
                setNotifications(prev => {
                    if (prev.some(n => n.id === notifId)) return prev;
                    return [{
                        id: notifId,
                        title: "Période de grâce active",
                        message: `Votre abonnement a expiré, mais vous disposez d'un intervalle de grâce de 2 jours. Veuillez renouveler rapidement pour éviter la suspension de vos services.`,
                        time: new Date().toLocaleDateString('fr-FR'),
                        read: false,
                        type: 'warning'
                    }, ...prev];
                });
            }
        }
    }, [printerData]);

    useEffect(() => {
        if (!user?.id) return;

        const justRegistered = localStorage.getItem('just_registered') === 'true';
        const justResetPassword = localStorage.getItem('force_password_change') === 'true';

        if (justRegistered || justResetPassword) {
            // Simulate a new notification after 15 seconds
            const timer = setTimeout(() => {
                const key = `simulated_notif_triggered_${user.id}`;
                const hasTriggered = localStorage.getItem(key);
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
                    localStorage.setItem(key, 'true');
                }
                // Clear the flag so it doesn't trigger again
                localStorage.removeItem('just_registered');
            }, 15000);
            return () => clearTimeout(timer);
        }
    }, [notifications, user?.id]);

    // Onboarding Upload States & Refs
    const logoRef = useRef(null);
    const coverRef = useRef(null);
    const portfolioRef = useRef(null);
    const [onboardingUploading, setOnboardingUploading] = useState(false);

    const [onboardingServiceName, setOnboardingServiceName] = useState('');
    const [onboardingServiceDesc, setOnboardingServiceDesc] = useState('');
    const [onboardingServicePrice, setOnboardingServicePrice] = useState('');
    const [onboardingServiceLoading, setOnboardingServiceLoading] = useState(false);

    // Étape « Informations de l'entreprise » de l'onboarding (surtout pour les
    // inscriptions via Google, où ces champs ne sont pas fournis).
    const [bizFirstName, setBizFirstName] = useState('');
    const [bizLastName, setBizLastName] = useState('');
    const [bizWhatsapp, setBizWhatsapp] = useState('');
    const [bizCountry, setBizCountry] = useState('Sénégal');
    const [bizName, setBizName] = useState('');
    const [bizLocation, setBizLocation] = useState('');
    const [bizInfoLoading, setBizInfoLoading] = useState(false);
    const [bizSeeded, setBizSeeded] = useState(false);

    // Écran de fin d'onboarding : on n'entre dans le dashboard qu'après un clic
    // explicite sur « Accéder à mon espace ». wasIncompleteRef garantit que seul
    // celui qui vient de terminer l'onboarding voit cet écran (pas les comptes
    // déjà complets qui rechargent leur dashboard).
    const wasIncompleteRef = useRef(false);
    const [enteredSpace, setEnteredSpace] = useState(false);

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

    const truncateMessage = (text, maxLength = 150) => {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    const fetchMyMessages = async () => {
        if (!printerData?.id || printerData.isMock) return;
        setMessagesLoading(true);
        try {
            const { data, error } = await supabase
                .from('admin_messages')
                .select('*')
                .eq('printer_id', printerData.id)
                .order('created_at', { ascending: false });
            if (!error && data) {
                setMyMessages(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setMessagesLoading(false);
        }
    };

    // Auto-refresh support messages list
    useEffect(() => {
        if (activeTab === 'support' && printerData?.id) {
            fetchMyMessages();
            const interval = setInterval(fetchMyMessages, 10000);
            return () => clearInterval(interval);
        }
    }, [activeTab, printerData]);

    // Retour de la passerelle de paiement GeniusPay : on re-poll les données
    // quelques fois pour capter l'activation déclenchée par le webhook.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const payment = params.get('payment');
        if (!payment || printerData?.isMock) return;

        setActiveTab('billing');
        if (payment === 'return') {
            showToast?.('Paiement en cours de validation…', 'success');
            let tries = 0;
            const interval = setInterval(() => {
                tries += 1;
                fetchPrinterData?.();
                if (tries >= 5) clearInterval(interval);
            }, 3000);
            // Nettoyer l'URL pour éviter de re-déclencher au refresh.
            window.history.replaceState({}, '', '/dashboard');
            return () => clearInterval(interval);
        }
        if (payment === 'cancel') {
            showToast?.('Paiement annulé.', 'error');
            window.history.replaceState({}, '', '/dashboard');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [printerData?.isMock]);

    // Sync support messages to notifications in background
    useEffect(() => {
        if (!printerData?.id || printerData.isMock) return;

        const syncSupportMessages = async () => {
            try {
                const { data, error } = await supabase
                    .from('admin_messages')
                    .select('*')
                    .eq('printer_id', printerData.id)
                    .eq('direction', 'admin_to_printer')
                    .eq('is_read', false);
                
                if (!error && data && data.length > 0) {
                    setNotifications(prev => {
                        let updated = [...prev];
                        let hasNew = false;
                        data.forEach(msg => {
                            const notifId = `support_${msg.id}`;
                            if (!updated.some(n => n.id === notifId)) {
                                updated = [{
                                    id: notifId,
                                    title: msg.subject || 'Réponse du Support',
                                    message: msg.content,
                                    time: 'À l\'instant',
                                    read: false,
                                    type: 'info',
                                    isSupport: true
                                }, ...updated];
                                hasNew = true;
                            }
                        });
                        if (hasNew) {
                            showToast("Nouvelle réponse du support disponible !", "info");
                        }
                        return updated;
                    });
                }
            } catch (err) {
                console.error("Error syncing support messages to notifications:", err);
            }
        };

        syncSupportMessages();
        const interval = setInterval(syncSupportMessages, 20000);
        return () => clearInterval(interval);
    }, [printerData]);

    // Mark support messages as read in DB when activeTab is support
    useEffect(() => {
        if (activeTab === 'support' && printerData?.id && !printerData.isMock) {
            const markAsRead = async () => {
                try {
                    const { error } = await supabase.rpc('printer_mark_messages_read', {
                        p_printer_id: printerData.id
                    });
                    if (error) {
                        console.warn("RPC printer_mark_messages_read failed, trying direct table update:", error.message);
                        await supabase
                            .from('admin_messages')
                            .update({ is_read: true })
                            .eq('printer_id', printerData.id)
                            .eq('direction', 'admin_to_printer')
                            .eq('is_read', false);
                    }
                } catch (err) {
                    console.error("Error marking support messages as read:", err);
                }
            };
            markAsRead();
            
            // Also mark corresponding local support notifications as read
            setNotifications(prev => prev.map(n => n.id.startsWith('support_') ? { ...n, read: true } : n));
        }
    }, [activeTab, printerData]);

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

    const handleCancelDeletion = async () => {
        if (!window.confirm("Voulez-vous vraiment annuler la demande de suppression de votre compte et réactiver votre vitrine ?")) {
            return;
        }
        setStatusModalLoading(true);
        try {
            if (printerData.isMock) {
                const updated = {
                    ...printerData,
                    deletion_scheduled_at: null,
                    deletion_reason: null,
                    status: 'En ligne'
                };
                localStorage.setItem(`mock_printer_${user.id}`, JSON.stringify(updated));
                setPrinterData(updated);
                showToast("Demande de suppression annulée, votre compte est réactivé !", "success");
            } else {
                const { error } = await supabase
                    .from('printers')
                    .update({
                        deletion_scheduled_at: null,
                        deletion_reason: null,
                        status: 'En ligne'
                    })
                    .eq('id', printerData.id);
                if (error) throw error;

                // Send email to admin about reactivation
                try {
                    await supabase.rpc('send_deletion_email', {
                        p_printer_id: printerData.id,
                        p_type: 'cancel_admin'
                    });
                } catch (emailErr) {
                    console.warn("Erreur envoi email réactivation administrateur:", emailErr);
                }

                showToast("Demande de suppression annulée, votre compte est réactivé !", "success");
                fetchPrinterData();
            }
        } catch (err) {
            console.error("Erreur annulation suppression:", err);
            showToast("Erreur lors de la réactivation du compte.", "error");
        } finally {
            setStatusModalLoading(false);
        }
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

        try {
            const maxDimension = type === 'logo' ? 400 : 1400;
            const compressedFile = await compressImage(file, maxDimension, maxDimension, 0.85);

            const fileExt = compressedFile.name.split('.').pop();
            const fileName = `${printerData.id}/onboarding_${type}_${Date.now()}.${fileExt}`;
            
            const { error } = await supabase.storage
                .from('public-assets')
                .upload(fileName, compressedFile, { cacheControl: '3600', upsert: true });
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
                    setPrinterData(prev => ({ ...prev, logo_url: publicUrl }));
                    showToast("Photo de profil mise à jour !", "success");
                }
            } else if (type === 'cover') {
                const { error: dbErr } = await supabase
                    .from('printers')
                    .update({ cover_url: publicUrl })
                    .eq('id', printerData.id);
                if (!dbErr) {
                    setPrinterData(prev => ({ ...prev, cover_url: publicUrl }));
                    showToast("Bannière de couverture mise à jour !", "success");
                }
            } else if (type === 'portfolio') {
                const updatedPortfolio = [...(printerData.portfolio || []), { image_url: publicUrl }];
                const { error: dbErr } = await supabase
                    .from('printers')
                    .update({ portfolio: updatedPortfolio })
                    .eq('id', printerData.id);
                if (!dbErr) {
                    setPrinterData(prev => ({ ...prev, portfolio: updatedPortfolio }));
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
            setPrinterData(prev => ({ ...prev, services: updatedServices }));
            showToast("Premier service ajouté avec succès !", "success");
            setOnboardingServiceName('');
            setOnboardingServiceDesc('');
            setOnboardingServicePrice('');
        } else {
            showToast("Erreur lors de l'ajout : " + error.message, "error");
        }
        setOnboardingServiceLoading(false);
    };

    // Pré-remplit le formulaire d'infos entreprise à partir des données déjà
    // présentes (prénom/nom Google éventuels, pays par défaut...).
    useEffect(() => {
        if (printerData && !bizSeeded) {
            setBizFirstName(printerData.first_name || '');
            setBizLastName(printerData.last_name || '');
            setBizWhatsapp(printerData.whatsapp || '');
            setBizCountry(printerData.country || 'Sénégal');
            setBizName(printerData.name && printerData.name !== 'Mon Imprimerie' ? printerData.name : '');
            setBizLocation(printerData.city || '');
            setBizSeeded(true);
        }
    }, [printerData, bizSeeded]);

    const handleSaveBusinessInfo = async (e) => {
        e.preventDefault();
        if (!bizFirstName.trim() || !bizLastName.trim() || !bizWhatsapp.trim() ||
            !bizCountry.trim() || !bizName.trim() || !bizLocation.trim()) {
            showToast("Veuillez remplir tous les champs.", "error");
            return;
        }
        setBizInfoLoading(true);

        const updates = {
            first_name: bizFirstName.trim(),
            last_name: bizLastName.trim(),
            whatsapp: bizWhatsapp.trim(),
            country: bizCountry.trim(),
            name: bizName.trim(),
            city: bizLocation.trim(),
        };

        if (printerData?.isMock || user?.isMock) {
            const updated = { ...printerData, ...updates };
            setPrinterData(updated);
            localStorage.setItem(`mock_printer_${user.id}`, JSON.stringify(updated));
            showToast("Informations enregistrées (Mode Démo) !", "success");
            setBizInfoLoading(false);
            return;
        }

        const { error } = await supabase
            .from('printers')
            .update(updates)
            .eq('id', printerData.id);
        if (!error) {
            // Mise à jour locale immédiate (pas de re-fetch réseau) : plus rapide.
            setPrinterData(prev => ({ ...prev, ...updates }));
            showToast("Informations de l'entreprise enregistrées !", "success");
        } else {
            showToast("Erreur lors de l'enregistrement : " + error.message, "error");
        }
        setBizInfoLoading(false);
    };

    const menuItems = [
        { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard },
        { id: 'profile', label: 'Profil Public', icon: User },
        { id: 'services', label: 'Mes Services', icon: Wrench },
        { id: 'portfolio', label: 'Portfolio', icon: ImageIcon },
        { id: 'marketplace', label: 'Ma Boutique', icon: Store },
        { id: 'reviews', label: 'Avis Clients', icon: Star },
        { id: 'billing', label: 'Facturation', icon: CreditCard },
        { id: 'community', label: 'Communauté', icon: Users },
        { id: 'support', label: 'Contact Support', icon: MessageCircle },
    ];

    const [upgradeReason, setUpgradeReason] = useState(null);
    const limits = getTierLimits(printerData);
    const requireUpgrade = (reason) => setUpgradeReason(reason);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Force onboarding checker
    const hasBusinessInfo = printerData?.whatsapp && printerData.whatsapp.trim() !== '' &&
        printerData?.name && printerData.name !== 'Mon Imprimerie';
    const hasCustomLogo = printerData?.logo_url && !printerData.logo_url.includes('ui-avatars.com');
    const hasCustomCover = printerData?.cover_url && printerData.cover_url !== 'https://images.unsplash.com/photo-1562664347-4950157077a9?q=80&w=2500&auto=format&fit=crop';
    const hasServices = printerData?.services && printerData.services.length > 0;
    const hasPortfolio = printerData?.portfolio && printerData.portfolio.length > 0;
    const isProfileComplete = hasBusinessInfo && hasCustomLogo && hasCustomCover && hasServices && hasPortfolio;

    if (!isProfileComplete) {
        wasIncompleteRef.current = true;
        const sub = getSubscriptionState(printerData);
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

                        {sub && sub.status === 'freemium' && (
                            <div className="p-6 bg-[#C9A84C]/10 border border-[#C9A84C]/25 text-[#FAF8F5] rounded-3xl flex items-start gap-4 text-left animate-in slide-in-from-top-4 duration-500">
                                <div className="w-12 h-12 bg-[#C9A84C]/20 text-[#C9A84C] rounded-2xl flex items-center justify-center shrink-0 mt-0.5 shadow-lg shadow-[#C9A84C]/10">
                                    <Clock className="animate-pulse" size={24} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-black text-sm uppercase tracking-widest text-[#C9A84C] flex items-center gap-2">
                                        Compte Freemium Actif
                                    </h4>
                                    <p className="text-xs text-[#FAF8F5]/70 font-semibold leading-relaxed">
                                        Votre compte dispose actuellement des limites gratuites (maximum 3 services, 3 photos de portfolio et pas de vente sur la boutique). Mettez à niveau votre compte pour débloquer l'accès complet et booster votre visibilité.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Step 0 : Informations de l'entreprise (surtout inscriptions Google) */}
                        {!hasBusinessInfo && (
                            <form onSubmit={handleSaveBusinessInfo} className="space-y-4 p-6 bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-2xl">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-[#C9A84C] text-[#0F0F13] flex items-center justify-center shrink-0">
                                        <User size={16} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-base text-white">Informations de votre imprimerie</h4>
                                        <p className="text-xs text-[#FAF8F5]/45">Renseignez les coordonnées indispensables pour que les clients puissent vous trouver et vous contacter.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={15} />
                                        <input
                                            required placeholder="Prénom"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[#C9A84C]/50 text-xs font-bold text-[#FAF8F5]"
                                            value={bizFirstName} onChange={(e) => setBizFirstName(e.target.value)}
                                        />
                                    </div>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={15} />
                                        <input
                                            required placeholder="Nom"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[#C9A84C]/50 text-xs font-bold text-[#FAF8F5]"
                                            value={bizLastName} onChange={(e) => setBizLastName(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={15} />
                                        <input
                                            type="tel" required placeholder="WhatsApp (Ex: +221770000000)"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[#C9A84C]/50 text-xs font-bold text-[#FAF8F5]"
                                            value={bizWhatsapp} onChange={(e) => setBizWhatsapp(e.target.value)}
                                        />
                                    </div>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 z-10" size={15} />
                                        <select
                                            required
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[#C9A84C]/50 text-xs font-bold text-[#FAF8F5] appearance-none"
                                            value={bizCountry} onChange={(e) => setBizCountry(e.target.value)}
                                        >
                                            {["Sénégal", "Côte d'Ivoire", "Mali", "Guinée", "Bénin", "Burkina Faso", "Cameroun", "Gabon", "Togo", "Niger", "Mauritanie", "France", "USA", "Canada", "Autre"].map(c => (
                                                <option key={c} value={c} className="bg-[#0F0F13] text-white">{c}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="relative">
                                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={15} />
                                    <input
                                        required placeholder="Nom de l'imprimerie"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[#C9A84C]/50 text-xs font-bold text-[#FAF8F5]"
                                        value={bizName} onChange={(e) => setBizName(e.target.value)}
                                    />
                                </div>

                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={15} />
                                    <input
                                        required placeholder="Localisation exacte (adresse ou lien Google Maps)"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[#C9A84C]/50 text-xs font-bold text-[#FAF8F5]"
                                        value={bizLocation} onChange={(e) => setBizLocation(e.target.value)}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={bizInfoLoading}
                                    className="bg-[#C9A84C] text-[#0F0F13] px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {bizInfoLoading ? <Loader2 className="animate-spin" size={14} /> : "Enregistrer mes informations"}
                                </button>
                            </form>
                        )}

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

    // Écran de fin d'onboarding : affiché une fois tous les champs remplis, avant
    // d'entrer dans le tableau de bord (uniquement pour qui vient de terminer).
    if (wasIncompleteRef.current && !enteredSpace) {
        return (
            <div className="min-h-screen bg-[#0F0F13] flex flex-col items-center justify-center text-[#FAF8F5] font-sans p-6 selection:bg-[#C9A84C] selection:text-[#0F0F13]">
                <div className="noise-overlay opacity-5 pointer-events-none"></div>
                <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-[#C9A84C]/5 rounded-full blur-[120px] pointer-events-none"></div>

                <div className="relative z-10 max-w-xl w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
                    <div className="w-24 h-24 mx-auto rounded-[2rem] bg-[#C9A84C] text-[#0F0F13] flex items-center justify-center shadow-2xl shadow-[#C9A84C]/20">
                        <CheckCircle2 size={48} className="stroke-[2]" />
                    </div>

                    <div>
                        <span className="text-[10px] font-black text-[#C9A84C] uppercase tracking-[0.3em] mb-3 block">Profil complet</span>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                            Tout est prêt, <br />
                            <span className="italic font-serif text-[#C9A84C]">bienvenue !</span>
                        </h2>
                        <p className="text-[#FAF8F5]/60 text-sm leading-relaxed font-medium mt-4 max-w-md mx-auto">
                            Votre vitrine est configurée. Vous pouvez maintenant accéder à votre espace pour gérer votre imprimerie.
                        </p>
                    </div>

                    <button
                        onClick={() => setEnteredSpace(true)}
                        className="w-full bg-[#C9A84C] text-[#0F0F13] py-6 rounded-2xl font-black text-lg shadow-2xl shadow-[#C9A84C]/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        Accéder à mon espace
                        <ChevronRight size={24} />
                    </button>
                </div>
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
                        onClick={() => setActiveTab('community')} 
                        className="p-2.5 bg-green-500/10 text-[#25D366] rounded-xl hover:scale-105 active:scale-95 transition-transform flex items-center gap-1.5 font-black text-[10px] uppercase tracking-wider shadow-sm border border-green-500/20"
                    >
                        <Users size={14} />
                        Communauté
                    </button>
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

            {/* Mobile Bottom Navigation Bar with "+" Dropdown Menu */}
            {isMobileMenuOpen && (
                <>
                    {/* Backdrop */}
                    <div className="lg:hidden fixed inset-0 z-[98] bg-primary/20 backdrop-blur-xs" onClick={() => setIsMobileMenuOpen(false)}></div>
                    
                    {/* Floating contextual menu */}
                    <div className="lg:hidden fixed bottom-28 left-6 right-6 z-[99] bg-[#F5F5DC] border border-[#3D0B37]/10 rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-4 zoom-in-95 duration-300 flex flex-col gap-3">
                        <div className="text-[9px] font-black uppercase tracking-widest text-[#3D0B37]/40 border-b border-[#3D0B37]/5 pb-2">Plus d'options</div>
                        <div className="grid grid-cols-2 gap-3">
                            {menuItems.filter(item => ['marketplace', 'reviews', 'community', 'billing', 'support'].includes(item.id)).map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setActiveTab(item.id);
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className={`flex items-center gap-3 p-4 rounded-2xl font-bold transition-all text-xs text-left
                                        ${activeTab === item.id 
                                            ? 'bg-primary text-white shadow-lg' 
                                            : 'bg-[#FAF8F5] text-[#3D0B37]/80 border border-[#3D0B37]/5 hover:bg-primary/5 hover:text-primary'}`}
                                >
                                    <item.icon size={16} />
                                    <span>{item.id === 'community' ? 'Communauté' : item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}

            <div className="lg:hidden fixed bottom-6 left-6 right-6 z-[100] bg-[#F5F5DC] border border-[#3D0B37]/10 rounded-full px-6 py-3 flex justify-between items-center shadow-2xl shadow-[#3D0B37]/20 select-none">
                {/* Left side items */}
                <div className="flex-1 flex justify-around">
                    {menuItems.filter(item => ['overview', 'profile'].includes(item.id)).map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActiveTab(item.id);
                                setIsMobileMenuOpen(false);
                            }}
                            className={`flex flex-col items-center gap-1 transition-all ${activeTab === item.id ? 'text-[#3D0B37] scale-105 font-black' : 'text-[#3D0B37]/45 hover:text-[#3D0B37]/75'}`}
                        >
                            <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                            <span className="text-[8px] font-black uppercase tracking-wider">
                                {item.id === 'overview' ? 'Accueil' : 'Profil'}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Center "+" Button */}
                <div className="px-2 shrink-0">
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-all transform shadow-lg hover:scale-105 active:scale-95 duration-300
                            ${isMobileMenuOpen ? 'bg-red-500 rotate-45' : 'bg-primary'}`}
                    >
                        <Plus size={22} className="transition-transform duration-300" />
                    </button>
                </div>

                {/* Right side items */}
                <div className="flex-1 flex justify-around">
                    {menuItems.filter(item => ['services', 'portfolio'].includes(item.id)).map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActiveTab(item.id);
                                setIsMobileMenuOpen(false);
                            }}
                            className={`flex flex-col items-center gap-1 transition-all ${activeTab === item.id ? 'text-[#3D0B37] scale-105 font-black' : 'text-[#3D0B37]/45 hover:text-[#3D0B37]/75'}`}
                        >
                            <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                            <span className="text-[8px] font-black uppercase tracking-wider">
                                {item.id === 'services' ? 'Services' : 'Portfolio'}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 lg:p-12 p-6 pb-32 pt-24 lg:pt-12 overflow-y-auto">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
                        <div>
                            <h1 className="text-sm font-black text-primary/75 uppercase tracking-[0.3em] mb-4">Espace Professionnel</h1>
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
                        {/* Subscription Warning / Grace Period Banner */}
                        {(() => {
                            const sub = getSubscriptionState(printerData);
                            if (!printerData || printerData.isMock) return null;
                            
                            if (sub.isGracePeriod) {
                                return (
                                    <div className="mb-8 p-6 bg-amber-500/10 border-2 border-amber-500/20 text-[#3D0B37] rounded-[2rem] flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-500">
                                        <div className="flex items-center gap-4 text-left">
                                            <div className="w-12 h-12 bg-amber-500/20 text-primary rounded-xl flex items-center justify-center shrink-0">
                                                <Bell className="animate-bounce text-primary" size={22} />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-sm uppercase tracking-wider text-[#3D0B37]">Période de grâce active</h4>
                                                <p className="text-xs text-[#3D0B37]/70 font-semibold mt-0.5">Votre abonnement a expiré, mais vous disposez d'un intervalle de grâce de 2 jours pour renouveler sans coupure de service.</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setActiveTab('billing')}
                                            className="px-5 py-2.5 bg-amber-500 text-[#0F0F13] rounded-xl font-black text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-md shadow-amber-500/10 shrink-0"
                                        >
                                            Renouveler l'abonnement
                                        </button>
                                    </div>
                                );
                             }

                             if (sub.status === 'freemium') {
                                 return (
                                     <div className="mb-8 p-6 bg-[#C9A84C]/10 border-2 border-[#C9A84C]/20 text-[#3D0B37] rounded-[2rem] flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-500">
                                         <div className="flex items-center gap-4 text-left">
                                             <div className="w-12 h-12 bg-[#C9A84C]/25 text-[#3D0B37] rounded-xl flex items-center justify-center shrink-0">
                                                 <Clock size={22} />
                                             </div>
                                             <div>
                                                 <h4 className="font-black text-sm uppercase tracking-wider text-[#3D0B37]">Compte Freemium</h4>
                                                 <p className="text-xs text-[#3D0B37]/80 font-semibold mt-0.5">Vous utilisez le plan gratuit. Pour ajouter plus de 3 services, 3 projets ou publier sur la boutique, passez à l'offre Pro.</p>
                                             </div>
                                         </div>
                                         <button 
                                             onClick={() => setActiveTab('billing')}
                                             className="px-5 py-2.5 bg-[#C9A84C] text-[#0F0F13] rounded-xl font-black text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-md shadow-[#C9A84C]/10 shrink-0"
                                         >
                                             Passer au Premium
                                         </button>
                                     </div>
                                 );
                             }
                             
                             if (sub.status === 'active' && sub.endsAt) {
                                const now = Date.now();
                                const endsAtTime = new Date(sub.endsAt).getTime();
                                const daysLeftBeforeGrace = Math.ceil((endsAtTime - now) / (1000 * 60 * 60 * 24));
                                if (daysLeftBeforeGrace > 0 && daysLeftBeforeGrace <= 2) {
                                    return (
                                        <div className="mb-8 p-6 bg-[#C9A84C]/10 border-2 border-[#C9A84C]/20 text-[#3D0B37] rounded-[2rem] flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-500">
                                            <div className="flex items-center gap-4 text-left">
                                                <div className="w-12 h-12 bg-[#C9A84C]/25 text-[#3D0B37] rounded-xl flex items-center justify-center shrink-0">
                                                    <Clock size={22} />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-sm uppercase tracking-wider text-[#3D0B37]">Expiration proche</h4>
                                                    <p className="text-xs text-[#3D0B37]/80 font-semibold mt-0.5">Votre formule d'abonnement se termine dans {daysLeftBeforeGrace} jour(s). Pensez à prolonger votre accès.</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => setActiveTab('billing')}
                                                className="px-5 py-2.5 bg-[#C9A84C] text-[#0F0F13] rounded-xl font-black text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-md shadow-[#C9A84C]/10 shrink-0"
                                            >
                                                Prolonger l'accès
                                            </button>
                                        </div>
                                    );
                                }
                            }
                            return null;
                        })()}

                        {(() => {
                            if (printerData?.deletion_scheduled_at) {
                                const scheduledDate = new Date(printerData.deletion_scheduled_at);
                                if (scheduledDate > new Date()) {
                                    return (
                                        <div className="mb-8 p-6 bg-red-500/10 border border-red-500/20 rounded-[2rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl animate-in slide-in-from-top-4">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                                                    <AlertCircle size={22} />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-sm uppercase tracking-wider text-red-500 font-bold">Suppression planifiée</h4>
                                                    <p className="text-xs text-red-500/80 font-semibold mt-0.5">
                                                        Votre compte sera définitivement supprimé le {scheduledDate.toLocaleString('fr-FR')}. Votre vitrine publique est actuellement désactivée.
                                                    </p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={handleCancelDeletion}
                                                disabled={statusModalLoading}
                                                className="px-5 py-2.5 bg-red-500 text-white rounded-xl font-black text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-md shrink-0 flex items-center gap-2"
                                            >
                                                {statusModalLoading ? <Loader2 className="animate-spin" size={12} /> : null}
                                                Annuler la suppression (Réactiver)
                                            </button>
                                        </div>
                                    );
                                }
                            }
                            return null;
                        })()}

                        {activeTab === 'overview' && <DashboardOverview printerData={printerData} setActiveTab={triggerTabWithModal} limits={limits} requireUpgrade={requireUpgrade} />}
                        {activeTab === 'profile' && <DashboardProfile printerData={printerData} onUpdate={fetchPrinterData} showToast={showToast} limits={limits} requireUpgrade={requireUpgrade} user={user} />}
                        {activeTab === 'services' && <DashboardServices printerData={printerData} onUpdate={fetchPrinterData} autoOpenModal={autoOpenModal} setAutoOpenModal={setAutoOpenModal} showToast={showToast} showConfirm={showConfirm} limits={limits} requireUpgrade={requireUpgrade} />}
                        {activeTab === 'portfolio' && <DashboardPortfolio printerData={printerData} onUpdate={fetchPrinterData} autoOpenModal={autoOpenModal} setAutoOpenModal={setAutoOpenModal} showToast={showToast} showConfirm={showConfirm} limits={limits} requireUpgrade={requireUpgrade} />}
                        {activeTab === 'marketplace' && <DashboardMarketplace printerData={printerData} onUpdate={fetchPrinterData} autoOpenModal={autoOpenModal} setAutoOpenModal={setAutoOpenModal} showToast={showToast} showConfirm={showConfirm} limits={limits} requireUpgrade={requireUpgrade} />}
                        {activeTab === 'reviews' && <DashboardReviews printerData={printerData} onUpdate={fetchPrinterData} showToast={showToast} />}
                        {activeTab === 'billing' && (
                            <SubscriptionPanel printerData={printerData} user={user} showToast={showToast} />
                        )}

                        {activeTab === 'community' && (
                            <div className="bg-white border border-dark/5 rounded-[3rem] p-10 md:p-12 shadow-2xl relative overflow-hidden animate-in fade-in duration-500">
                                <div className="absolute top-0 right-0 w-[50%] h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none"></div>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 relative z-10 items-center">
                                    {/* Colonne Gauche : QR Code */}
                                    <div className="flex flex-col items-center text-center space-y-6">
                                        <div className="bg-[#fcfbf9] p-6 rounded-[2.5rem] border border-[#3D0B37]/15 shadow-xl max-w-sm w-full aspect-square overflow-hidden flex items-center justify-center">
                                            <img src="/whatsapp-community.jpg" alt="QR Code WhatsApp Printacoté Communauté" className="w-full h-full object-contain rounded-2xl" />
                                        </div>
                                        <div className="max-w-xs space-y-2">
                                            <p className="text-sm font-bold text-dark/70">
                                                Scannez ce code QR pour rejoindre la communauté Printacoté.
                                            </p>
                                            <p className="text-[11px] text-dark/40 font-medium">
                                                Ouvrez l'appareil photo ou le scanner de WhatsApp sur votre téléphone pour rejoindre instantanément.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Colonne Droite : Message + Bouton d'accès direct */}
                                    <div className="space-y-8">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C] bg-[#C9A84C]/10 px-3 py-1.5 rounded-full border border-[#C9A84C]/20">
                                                Communauté d'entraide
                                            </span>
                                            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-[#3D0B37] mt-4 mb-3">
                                                Rejoindre la communauté WhatsApp
                                            </h2>
                                            <p className="text-dark/60 text-sm md:text-base font-medium leading-relaxed">
                                                Rejoignez notre groupe WhatsApp d'imprimeurs et de professionnels du secteur. Échangez des conseils de production, partagez des opportunités commerciales et échangez avec les autres passionnés de l'impression en Afrique.
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-start gap-3 text-xs text-dark/50">
                                                <div className="w-1.5 h-1.5 bg-[#25D366] rounded-full mt-1.5 shrink-0 animate-ping"></div>
                                                <p className="font-semibold">
                                                    Groupe actif de discussion avec d'autres professionnels de l'impression numérique et offset.
                                                </p>
                                            </div>
                                            
                                            <button
                                                onClick={() => window.open('https://chat.whatsapp.com/FHRX9bhnJOV0VLjzAxLqCX?s=cl&p=i&ilr=4', '_blank')}
                                                className="w-full sm:w-auto bg-[#25D366] text-white px-8 py-5 rounded-2xl font-black text-base shadow-xl shadow-green-500/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 hover:translate-y-[-1px]"
                                            >
                                                <MessageCircle size={20} />
                                                Rejoindre la communauté
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {upgradeReason && (
                            <UpgradeOverlay
                                reason={upgradeReason}
                                printerData={printerData}
                                user={user}
                                showToast={showToast}
                                onClose={() => setUpgradeReason(null)}
                            />
                        )}
                        {activeTab === 'support' && (
                            <div className="bg-white border border-dark/5 rounded-[3rem] p-10 md:p-12 shadow-2xl relative overflow-hidden animate-in fade-in duration-500">
                                <div className="absolute top-0 right-0 w-[50%] h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none"></div>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 relative z-10">
                                    {/* Colonne Gauche : Formulaire de contact */}
                                    <div className="space-y-8">
                                        <div>
                                            <h2 className="text-3xl font-black tracking-tight mb-2">Contacter le Support</h2>
                                            <p className="text-dark/40 text-sm font-medium">Une question ou un problème technique ? Envoyez-nous un message.</p>
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

                                                // 1. Envoyer l'e-mail automatique via FormSubmit
                                                const response = await fetch('https://formsubmit.co/ajax/bskdezigner@gmail.com', {
                                                    method: 'POST',
                                                    body: formData
                                                });

                                                // 2. Insérer dans admin_messages pour la messagerie admin de Supabase
                                                if (printerData?.id && !printerData.isMock) {
                                                    await supabase.from('admin_messages').insert({
                                                        printer_id: printerData.id,
                                                        subject: subject,
                                                        content: message,
                                                        direction: 'printer_to_admin'
                                                    });
                                                    fetchMyMessages();
                                                } else if (printerData?.isMock) {
                                                    const newMockMsg = {
                                                        id: Date.now().toString(),
                                                        created_at: new Date().toISOString(),
                                                        printer_id: printerData.id,
                                                        subject: subject,
                                                        content: message,
                                                        direction: 'printer_to_admin'
                                                    };
                                                    setMyMessages(prev => [newMockMsg, ...prev]);
                                                }

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
                                        }} className="space-y-5">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Objet du message</label>
                                                <input 
                                                    name="subject"
                                                    required
                                                    placeholder="Ex: Problème d'affichage de mon logo"
                                                    className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm text-dark"
                                                />
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Votre Message</label>
                                                <textarea 
                                                    name="message"
                                                    required
                                                    rows="4"
                                                    placeholder="Décrivez en détail votre demande..."
                                                    className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold resize-none text-sm text-dark"
                                                ></textarea>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Liens additionnels (Optionnel)</label>
                                                <textarea 
                                                    name="links"
                                                    rows="2"
                                                    placeholder="Ex: Lien vers une capture d'écran, Dropbox, Google Drive..."
                                                    className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold resize-none text-xs text-dark"
                                                ></textarea>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Capture d'écran / Image (Optionnel)</label>
                                                <div className="flex items-center gap-4">
                                                    {supportFilePreview ? (
                                                        <div className="relative w-28 h-28 rounded-3xl overflow-hidden border-2 border-primary/10 group shadow-lg">
                                                            <img src={supportFilePreview} alt="Aperçu" className="w-full h-full object-cover" />
                                                            <button 
                                                                type="button"
                                                                onClick={() => {
                                                                    setSupportFile(null);
                                                                    setSupportFilePreview(null);
                                                                }}
                                                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:scale-110 active:scale-95 transition-transform shadow-md"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-dark/10 rounded-[2rem] cursor-pointer hover:bg-dark/5 hover:border-primary/20 transition-all p-4 group">
                                                            <div className="flex flex-col items-center justify-center text-center">
                                                                <ImageIcon size={22} className="text-dark/30 group-hover:text-primary/50 group-hover:scale-110 transition-all mb-1" />
                                                                <p className="text-[10px] text-dark/40 font-bold group-hover:text-dark transition-colors">Ajouter une capture d'écran</p>
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

                                            {/* Auto-filled info */}
                                            <div className="bg-[#3D0B37]/5 p-5 rounded-2xl border border-[#3D0B37]/10 text-[10px] text-[#3D0B37]/75 space-y-1 font-medium">
                                                <h4 className="font-black uppercase tracking-wider mb-1 text-[#3D0B37]">Transmis automatiquement :</h4>
                                                <div><strong>Nom :</strong> {printerData?.name || 'Non renseigné'}</div>
                                                <div><strong>Email :</strong> {user?.email || 'Non renseigné'}</div>
                                            </div>

                                            <button 
                                                type="submit"
                                                disabled={supportSubmitting}
                                                className="w-full bg-[#3D0B37] text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-[#3D0B37]/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                                            >
                                                {supportSubmitting ? (
                                                    <>
                                                        <Loader2 size={16} className="animate-spin" />
                                                        Envoi en cours...
                                                    </>
                                                ) : (
                                                    "Envoyer au Support"
                                                )}
                                            </button>
                                        </form>
                                    </div>

                                    {/* Colonne Droite : Historique des discussions */}
                                    <div className="space-y-8 lg:border-l lg:border-dark/5 lg:pl-10">
                                        <div>
                                            <h3 className="text-2xl font-black tracking-tight text-[#3D0B37] mb-1">Historique des échanges</h3>
                                            <p className="text-dark/40 text-sm font-medium">Consultez les réponses du support technique à vos demandes.</p>
                                        </div>
                                        
                                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar flex flex-col-reverse">
                                            {messagesLoading && myMessages.length === 0 ? (
                                                <div className="flex items-center justify-center py-10">
                                                    <Loader2 className="animate-spin text-primary" size={24} />
                                                </div>
                                            ) : myMessages.length === 0 ? (
                                                <div className="text-center py-12 bg-dark/5 rounded-[2rem] border border-dark/5 p-6">
                                                    <p className="text-dark/30 text-xs font-black uppercase tracking-wider">Aucun échange</p>
                                                    <p className="text-dark/40 text-xs font-medium mt-1">Vos futurs messages et réponses du support s'afficheront ici.</p>
                                                </div>
                                            ) : (
                                                myMessages.map(msg => {
                                                    const isAdmin = msg.direction === 'admin_to_printer';
                                                    return (
                                                        <div 
                                                            key={msg.id} 
                                                            className={`max-w-[85%] flex flex-col ${isAdmin ? 'self-start items-start' : 'self-end items-end'}`}
                                                        >
                                                            <div className={`p-4 rounded-3xl text-xs leading-relaxed ${
                                                                isAdmin 
                                                                    ? 'bg-primary/10 text-primary border border-primary/20 rounded-tl-none font-bold' 
                                                                    : 'bg-dark/5 text-dark rounded-tr-none border border-dark/5 font-medium'
                                                            }`}>
                                                                {!isAdmin && (
                                                                    <span className="block text-[8px] font-black uppercase tracking-wider text-dark/70 mb-1">
                                                                        Objet: {msg.subject}
                                                                    </span>
                                                                )}
                                                                <p className="whitespace-pre-wrap">{truncateMessage(msg.content)}</p>
                                                                {msg.content.length > 150 && (
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => setSelectedFullMessage(msg)}
                                                                        className={`mt-2 text-[10px] font-black uppercase tracking-wider hover:underline block ${isAdmin ? 'text-primary' : 'text-primary/70'}`}
                                                                    >
                                                                        Voir plus
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <span className="text-[8px] font-mono text-dark/30 mt-1">
                                                                {new Date(msg.created_at).toLocaleDateString('fr-FR')} à {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
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

            {/* Support Message Details Modal */}
            {selectedFullMessage && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-primary/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl border border-primary/10 animate-in zoom-in-95 duration-300 text-dark">
                        <div className="bg-primary/5 p-8 text-primary flex justify-between items-center border-b border-primary/10">
                            <div>
                                <h4 className="text-2xl font-black mb-1">Détails du message</h4>
                                <p className="text-primary/60 text-xs font-bold tracking-widest uppercase">Assistance Support</p>
                            </div>
                            <button 
                                onClick={() => setSelectedFullMessage(null)} 
                                className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center hover:bg-primary/10 transition-all shrink-0 text-primary"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-xs text-primary/50 font-bold border-b border-primary/5 pb-3">
                                    <div>
                                        <span className="text-[10px] uppercase tracking-wider text-primary/30 block mb-0.5">Expéditeur</span>
                                        <span className="text-[#3D0B37] font-black">
                                            {selectedFullMessage.direction === 'admin_to_printer' ? 'Administrateur (Support)' : 'Vous'}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] uppercase tracking-wider text-primary/30 block mb-0.5">Date & Heure</span>
                                        <span>
                                            {new Date(selectedFullMessage.created_at).toLocaleDateString('fr-FR')} à {new Date(selectedFullMessage.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                                {selectedFullMessage.subject && (
                                    <div className="bg-primary/5 p-4 rounded-2xl border border-primary/5">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-primary block mb-1">Objet</span>
                                        <span className="text-xs font-bold text-primary">{selectedFullMessage.subject}</span>
                                    </div>
                                )}
                                <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    <p className="text-sm text-primary/85 font-semibold whitespace-pre-wrap leading-relaxed">
                                        {selectedFullMessage.content}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedFullMessage(null)}
                                className="w-full bg-[#3D0B37] text-white py-4 rounded-2xl font-black text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
                            >
                                Fermer
                            </button>
                        </div>
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
