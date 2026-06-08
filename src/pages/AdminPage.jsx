import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
    LayoutDashboard, Users, Wrench, Image as ImageIcon,
    Store, Mail, LogOut, Shield, ShieldAlert, KeyRound,
    Search, Trash2, CheckCircle2, XCircle, Send, Plus, Users2,
    Loader2, Megaphone, Menu, Pencil, Save, Star, Sparkles,
    Eye, Newspaper, UserCheck, Clock, PauseCircle, PlayCircle, ArrowLeft, Video, Bell,
    CreditCard, Calendar, Link as LinkIcon
} from 'lucide-react';
import gsap from 'gsap';
import RichTextEditor from '../components/RichTextEditor';
import { compressImage } from '../lib/image';

const AdminPage = ({ setPage }) => {
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return sessionStorage.getItem('admin_authenticated') === 'true';
    });
    const [authError, setAuthError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Admin Data States
    const [stats, setStats] = useState(null);
    const [printers, setPrinters] = useState([]);
    const [products, setProducts] = useState([]);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // UI Feedback
    const [toast, setToast] = useState(null);
    
    // Search Filters
    const [searchQuery, setSearchQuery] = useState('');

    // Message Chat State
    const [selectedPrinterId, setSelectedPrinterId] = useState(null);
    const [replyContent, setReplyContent] = useState('');
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkSubject, setBulkSubject] = useState('');
    const [bulkContent, setBulkContent] = useState('');
    const [selectedBulkPrinters, setSelectedBulkPrinters] = useState([]);
    
    // Publicity Banner States
    const [bannerSettings, setBannerSettings] = useState({
        image_url: '',
        link_url: '',
        is_active: false,
        facebook_url: '',
        instagram_url: '',
        tiktok_url: '',
        media_type: 'image',   // 'image' | 'video'
        video_url: '',
        active_until: ''        // ISO ; vide = illimité
    });
    const [bannerUploading, setBannerUploading] = useState(false);
    const [bannerVideoUploading, setBannerVideoUploading] = useState(false);
    // Product Edit Modal States
    const [editingProduct, setEditingProduct] = useState(null);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [productForm, setProductForm] = useState({
        name: "",
        price: "",
        promo_price: "",
        discount: "",
        description: "",
        status: "En ligne",
        category: "Encre",
        quantity: "En stock",
        format: ""
    });
    const [actionLoading, setActionLoading] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Support Messaging States
    const [selectedFullMessage, setSelectedFullMessage] = useState(null);

    // Overview : période du graphique de trafic réel + série temporelle
    const [overviewFilter, setOverviewFilter] = useState('week');
    const [viewsSeries, setViewsSeries] = useState([]);
    const [seriesLoading, setSeriesLoading] = useState(false);

    // Services : filtre par imprimerie
    const [serviceFilter, setServiceFilter] = useState('all');

    // Marketplace : suspension temporisée d'un produit
    const [suspendModalProduct, setSuspendModalProduct] = useState(null);
    const [suspendDays, setSuspendDays] = useState('7');

    // Confirmation de déconnexion
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // Dynamic Pricing & Subscription States
    const [pricingPlans, setPricingPlans] = useState([
        { id: '1m', months: 1, label: '1 mois', amount: 200, cadence: 'tous les mois', link: '', features: ['Profil public visible dans l\'annuaire', 'Boutique & marketplace actives', 'Portfolio et services illimités', 'Statistiques de visites & contacts'] },
        { id: '3m', months: 3, label: '3 mois', amount: 18659, cadence: 'tous les 3 mois', badge: 'Populaire', link: '', features: ['Profil public visible dans l\'annuaire', 'Boutique & marketplace actives', 'Portfolio et services illimités', 'Statistiques de visites & contacts'] },
        { id: '1an', months: 12, label: '1 an', amount: 75000, cadence: 'tous les ans', badge: 'Meilleure offre', best: true, link: '', features: ['Profil public visible dans l\'annuaire', 'Boutique & marketplace actives', 'Portfolio et services illimités', 'Statistiques de visites & contacts'] }
    ]);
    const [loadingPricing, setLoadingPricing] = useState(false);
    const [selectedPrinterForSub, setSelectedPrinterForSub] = useState(null);
    const [subForm, setSubForm] = useState({
        status: 'active',
        endsAt: '',
        trialEndsAt: '',
        plan: '1m'
    });

    // Messagerie : recherche d'imprimeur à contacter
    const [messageSearch, setMessageSearch] = useState('');

    // Notifications admin
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);

    // Actualités / Blog
    const [newsList, setNewsList] = useState([]);
    const [commentsList, setCommentsList] = useState([]);
    const [newsSubTab, setNewsSubTab] = useState('articles'); // 'articles' | 'comments'
    const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
    const [coverUploading, setCoverUploading] = useState(false);
    const emptyNewsForm = { id: null, title: '', excerpt: '', content: '', image_url: '', read_time: '5 min', published: true, category: 'Actualité', tags: '', mentions: [] };
    const [newsForm, setNewsForm] = useState(emptyNewsForm);
    const [customCategory, setCustomCategory] = useState('');

    // Helper functions
    const getPortfolioImageUrl = (item) => {
        if (!item) return '';
        if (typeof item === 'string') {
            try {
                const parsed = JSON.parse(item);
                return parsed.image_url || parsed.url || item;
            } catch (e) {
                return item;
            }
        }
        return item.image_url || item.url || '';
    };

    const getPortfolioDate = (item, printerCreatedAt) => {
        if (item && typeof item === 'object' && item.created_at) {
            return new Date(item.created_at);
        }
        const url = typeof item === 'string' ? item : (item?.image_url || item?.url || '');
        const match = url.match(/portfolio_(\d+)/);
        if (match && match[1]) {
            return new Date(parseInt(match[1]));
        }
        return printerCreatedAt ? new Date(printerCreatedAt) : new Date();
    };

    const formatDate = (dateValue) => {
        if (!dateValue) return '';
        try {
            const date = new Date(dateValue);
            return date.toLocaleDateString('fr-FR') + ' à ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return '';
        }
    };

    const getPlanLabel = (planId) => {
        if (!planId) return 'Aucune';
        const plan = pricingPlans.find(p => p.id === planId);
        if (plan) return plan.label;
        if (planId === '1m') return '1 mois';
        if (planId === '3m') return '3 mois';
        if (planId === '1an') return '1 an';
        return planId;
    };

    const truncateMessage = (text, maxLength = 150) => {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    // Badges de profil attribuables aux imprimeurs.
    const BADGE_OPTIONS = ['Pro', 'Vérifié', 'Pionnier', 'Pionnière'];
    const badgeClass = (b) => {
        if (b === 'Pro') return 'bg-[#C9A84C]/15 text-[#C9A84C] border-[#C9A84C]/30';
        if (b === 'Vérifié') return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
        if (b === 'Pionnier' || b === 'Pionnière') return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
        return 'bg-white/5 text-white/40 border-white/10';
    };

    // Refs for animations
    const loginCardRef = useRef(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    useEffect(() => {
        if (!isAuthenticated) {
            gsap.fromTo(loginCardRef.current,
                { opacity: 0, scale: 0.95, y: 15 },
                { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'power3.out' }
            );
        } else {
            fetchAdminData();
        }
    }, [isAuthenticated, activeTab, refreshTrigger]);

    // Charge la série temporelle RÉELLE des vues du site (admin_get_views_timeseries)
    // à l'ouverture de l'overview et à chaque changement de période.
    useEffect(() => {
        if (!isAuthenticated || activeTab !== 'overview') return;
        let cancelled = false;
        const fetchSeries = async () => {
            setSeriesLoading(true);
            const { data, error } = await supabase.rpc('admin_get_views_timeseries', { p_period: overviewFilter });
            if (!cancelled) {
                if (error) {
                    console.warn('admin_get_views_timeseries indisponible:', error.message);
                    setViewsSeries([]);
                } else {
                    setViewsSeries(Array.isArray(data) ? data : []);
                }
                setSeriesLoading(false);
            }
        };
        fetchSeries();
        return () => { cancelled = true; };
    }, [isAuthenticated, activeTab, overviewFilter, refreshTrigger]);

    // Notifications : chargement au login + rafraîchissement à chaque changement d'onglet.
    const fetchNotifications = async () => {
        const { data, error } = await supabase.rpc('admin_get_notifications');
        if (!error && Array.isArray(data)) setNotifications(data);
    };
    useEffect(() => {
        if (isAuthenticated) fetchNotifications();
    }, [isAuthenticated, activeTab]);

    const handleMarkNotificationsRead = async () => {
        await supabase.rpc('admin_mark_notifications_read').then(undefined, () => {});
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };
    const handleClearNotifications = async () => {
        await supabase.rpc('admin_clear_notifications').then(undefined, () => {});
        setNotifications([]);
    };
    const unreadNotifications = notifications.filter(n => !n.is_read).length;

    const handleLogin = (e) => {
        e.preventDefault();
        setAuthError('');
        if (password === 'BSKGOLMY221@@') {
            setIsAuthenticated(true);
            sessionStorage.setItem('admin_authenticated', 'true');
            showToast("Authentification administrateur réussie !", "success");
        } else {
            setAuthError("Mot de passe incorrect.");
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        sessionStorage.removeItem('admin_authenticated');
        setPage('home');
    };

    const fetchAdminData = async () => {
        setLoading(true);
        try {
            // Run schema updates to ensure columns are present
            supabase.rpc('admin_run_schema_updates').then(undefined, e => console.warn(e));

            if (activeTab === 'overview') {
                const { data, error } = await supabase.rpc('admin_get_global_stats');
                if (error) {
                    console.warn("RPC admin_get_global_stats failed, falling back to direct table queries:", error.message);
                    
                    const [printersRes, productsRes] = await Promise.all([
                        supabase.from('printers').select('id, services, portfolio, views, clicks'),
                        supabase.from('products').select('id', { count: 'exact', head: true })
                    ]);
                    
                    const printersList = printersRes.data || [];
                    
                    const calculatedStats = {
                        totalPrinters: printersList.length,
                        totalServices: printersList.reduce((acc, p) => acc + (p.services?.length || 0), 0),
                        totalPortfolio: printersList.reduce((acc, p) => acc + (p.portfolio?.length || 0), 0),
                        totalProducts: productsRes.count || 0,
                        totalViews: printersList.reduce((acc, p) => acc + (p.views || 0), 0),
                        totalClicks: printersList.reduce((acc, p) => acc + (p.clicks || 0), 0)
                    };
                    setStats(calculatedStats);
                } else {
                    setStats(data || {
                        totalPrinters: 0,
                        totalServices: 0,
                        totalPortfolio: 0,
                        totalProducts: 0,
                        totalViews: 0,
                        totalClicks: 0
                    });
                }
            } else if (activeTab === 'printers' || activeTab === 'services' || activeTab === 'portfolio') {
                const { data, error } = await supabase.rpc('admin_get_printers_list');
                if (error) {
                    console.warn("RPC admin_get_printers_list failed, falling back to direct table query:", error.message);
                    const { data: tableData, error: tableError } = await supabase
                        .from('printers')
                        .select('*')
                        .order('created_at', { ascending: false });
                    
                    if (tableError) {
                        console.error("Error fetching printers table directly:", tableError.message);
                        setPrinters([]);
                    } else {
                        setPrinters(tableData || []);
                    }
                } else {
                    setPrinters(data || []);
                }
            } else if (activeTab === 'marketplace') {
                // Réactive d'abord les produits dont la suspension a expiré.
                await supabase.rpc('reactivate_expired_products').then(undefined, () => {});
                const { data, error } = await supabase
                    .from('products')
                    .select('*, printers(name, created_at)')
                    .order('name', { ascending: true });
                if (error) {
                    console.warn("Fetch products failed, setting empty:", error.message);
                    setProducts([]);
                } else {
                    setProducts(data || []);
                }
            } else if (activeTab === 'support') {
                // Charge aussi la liste des imprimeurs pour pouvoir contacter
                // n'importe lequel (pas seulement ceux qui ont déjà écrit).
                const { data: printersData } = await supabase.rpc('admin_get_printers_list');
                if (Array.isArray(printersData)) {
                    setPrinters(printersData);
                } else {
                    const { data: pt } = await supabase.from('printers').select('*').order('created_at', { ascending: false });
                    if (Array.isArray(pt)) setPrinters(pt);
                }
                const { data, error } = await supabase.rpc('admin_get_messages');
                if (error) {
                    console.warn("RPC admin_get_messages failed, falling back to direct table query:", error.message);
                    const { data: tableData, error: tableError } = await supabase
                        .from('admin_messages')
                        .select('*, printers(name, logo_url)')
                        .order('created_at', { ascending: false });
                    
                    if (tableError) {
                        console.error("Error fetching messages table directly:", tableError.message);
                        setMessages([]);
                    } else {
                        const mappedMessages = tableData?.map(msg => ({
                            id: msg.id,
                            created_at: msg.created_at,
                            printer_id: msg.printer_id,
                            printer_name: msg.printers?.name || 'Imprimerie',
                            printer_logo: msg.printers?.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.printers?.name || 'Imprimerie')}&background=random`,
                            subject: msg.subject,
                            content: msg.content,
                            is_read: msg.is_read,
                            direction: msg.direction
                        })) || [];
                        setMessages(mappedMessages);
                    }
                } else {
                    setMessages(data || []);
                }
            } else if (activeTab === 'news') {
                const [newsRes, commentsRes, printersRes] = await Promise.all([
                    supabase.rpc('admin_get_all_news'),
                    supabase.rpc('admin_get_comments'),
                    supabase.rpc('admin_get_printers_list')
                ]);
                setNewsList(Array.isArray(newsRes.data) ? newsRes.data : []);
                setCommentsList(Array.isArray(commentsRes.data) ? commentsRes.data : []);
                
                let ptList = [];
                if (printersRes.error) {
                    console.warn("RPC admin_get_printers_list failed for news, trying direct table select:", printersRes.error.message);
                    const { data: directPt } = await supabase.from('printers').select('id, name, city').order('name', { ascending: true });
                    ptList = directPt || [];
                } else {
                    ptList = printersRes.data || [];
                }
                setPrinters(ptList);

                if (newsRes.error) console.warn('admin_get_all_news:', newsRes.error.message);
            } else if (activeTab === 'advertising') {
                const normalize = (v) => ({
                    image_url: v.image_url || '',
                    link_url: v.link_url || '',
                    is_active: v.is_active || false,
                    facebook_url: v.facebook_url || '',
                    instagram_url: v.instagram_url || '',
                    tiktok_url: v.tiktok_url || '',
                    media_type: v.media_type || 'image',
                    video_url: v.video_url || '',
                    active_until: v.active_until || ''
                });
                const { data, error } = await supabase
                    .from('system_settings')
                    .select('*')
                    .eq('key', 'publicity_banner')
                    .maybeSingle();
                if (!error && data && data.value) {
                    setBannerSettings(normalize(data.value));
                } else {
                    const localBanner = localStorage.getItem('publicity_banner');
                    setBannerSettings(localBanner ? normalize(JSON.parse(localBanner)) : normalize({}));
                }
            } else if (activeTab === 'pricing') {
                const { data: printersData, error: printersErr } = await supabase.rpc('admin_get_printers_list');
                if (printersErr) {
                    const { data: directPt } = await supabase.from('printers').select('*').order('name', { ascending: true });
                    setPrinters(directPt || []);
                } else {
                    setPrinters(printersData || []);
                }

                const { data: settingsData } = await supabase
                    .from('system_settings')
                    .select('value')
                    .eq('key', 'subscription_plans')
                    .maybeSingle();
                if (settingsData && settingsData.value) {
                    setPricingPlans(settingsData.value);
                }
            }
        } catch (err) {
            console.error("Error fetching admin data:", err);
            showToast("Erreur lors de la récupération des données", "error");
        } finally {
            setLoading(false);
        }
    };

    // ── Actions Modérateurs ──────────────────────────────────────────

    // Attribue (ou retire) un badge de profil à un imprimeur.
    const handleSetBadge = async (printerId, badge) => {
        try {
            let { error } = await supabase.rpc('admin_set_printer_badge', {
                p_printer_id: printerId,
                p_badge: badge || null
            });
            if (error) {
                console.warn("RPC admin_set_printer_badge failed, trying direct update:", error.message);
                const { error: updateError } = await supabase
                    .from('printers')
                    .update({ badge: badge || null })
                    .eq('id', printerId);
                if (updateError) throw updateError;
            }
            showToast(badge ? `Badge « ${badge} » attribué.` : "Badge retiré.", "success");
            fetchAdminData();
        } catch (err) {
            console.error("Error setting badge:", err);
            showToast("Impossible de modifier le badge.", "error");
        }
    };

    const handleToggleStatus = async (printerId, currentStatus) => {
        const newStatus = currentStatus === 'En ligne' ? 'Désactivé' : 'En ligne';
        try {
            const { error } = await supabase.rpc('admin_toggle_printer_status', {
                p_printer_id: printerId,
                p_status: newStatus
            });
            if (error) {
                console.warn("RPC admin_toggle_printer_status failed, falling back to direct table update:", error.message);
                const { error: tableError } = await supabase
                    .from('printers')
                    .update({ status: newStatus })
                    .eq('id', printerId);
                if (tableError) throw tableError;
            }
            showToast(`Visibilité de la boutique mise à jour en : ${newStatus}`, "success");
            fetchAdminData();
        } catch (err) {
            console.error("Error toggling status:", err);
            showToast("Impossible de changer le statut", "error");
        }
    };

    const handleDeletePrinter = async (printerId) => {
        if (!confirm("Voulez-vous vraiment supprimer définitivement cet imprimeur et toutes ses données associées ?")) return;
        try {
            const { error } = await supabase.rpc('admin_delete_printer', { p_printer_id: printerId });
            if (error) {
                console.warn("RPC admin_delete_printer failed, falling back to direct delete:", error.message);
                const { error: tableError } = await supabase
                    .from('printers')
                    .delete()
                    .eq('id', printerId);
                if (tableError) throw tableError;
            }
            showToast("Imprimeur supprimé avec succès.", "success");
            fetchAdminData();
        } catch (err) {
            console.error("Error deleting printer:", err);
            showToast("Erreur lors de la suppression de l'imprimeur", "error");
        }
    };

    const handleDeleteService = async (printerId, servicesList, serviceName) => {
        if (!confirm(`Voulez-vous supprimer le service "${serviceName}" de cet imprimeur ?`)) return;
        const updatedServices = servicesList.filter(s => s.name !== serviceName);
        try {
            const { error } = await supabase.rpc('admin_update_printer_services', {
                p_printer_id: printerId,
                p_services: updatedServices
            });
            if (error) {
                console.warn("RPC admin_update_printer_services failed, falling back to direct update:", error.message);
                const { error: tableError } = await supabase
                    .from('printers')
                    .update({ services: updatedServices })
                    .eq('id', printerId);
                if (tableError) throw tableError;
            }
            showToast("Service supprimé.", "success");
            fetchAdminData();
        } catch (err) {
            console.error("Error deleting service:", err);
            showToast("Erreur lors de la suppression du service", "error");
        }
    };

    const handleDeletePortfolio = async (printerId, portfolioList, imageUrl) => {
        if (!confirm("Voulez-vous supprimer cette réalisation du portfolio ?")) return;
        const updatedPortfolio = portfolioList.filter(item => getPortfolioImageUrl(item) !== imageUrl);
        try {
            const { error } = await supabase.rpc('admin_update_printer_portfolio', {
                p_printer_id: printerId,
                p_portfolio: updatedPortfolio
            });
            if (error) {
                console.warn("RPC admin_update_printer_portfolio failed, falling back to direct update:", error.message);
                const { error: tableError } = await supabase
                    .from('printers')
                    .update({ portfolio: updatedPortfolio })
                    .eq('id', printerId);
                if (tableError) throw tableError;
            }
            showToast("Réalisation retirée du portfolio.", "success");
            fetchAdminData();
        } catch (err) {
            console.error("Error deleting portfolio item:", err);
            showToast("Erreur lors de la suppression de l'image", "error");
        }
    };

    const handleDeleteProduct = async (productId) => {
        if (!confirm("Voulez-vous supprimer ce produit de la marketplace ?")) return;
        try {
            const { error } = await supabase.rpc('admin_delete_product', { p_product_id: productId });
            if (error) {
                console.warn("RPC admin_delete_product failed, falling back to direct delete:", error.message);
                const { error: tableError } = await supabase
                    .from('products')
                    .delete()
                    .eq('id', productId);
                if (tableError) throw tableError;
            }
            showToast("Produit supprimé de la marketplace.", "success");
            fetchAdminData();
        } catch (err) {
            console.error("Error deleting product:", err);
            showToast("Erreur lors de la suppression du produit", "error");
        }
    };

    const handleToggleProductStatus = async (productId, currentStatus) => {
        const newStatus = currentStatus === 'En ligne' ? 'Désactivé' : 'En ligne';
        try {
            const { error } = await supabase.rpc('admin_toggle_product_status', {
                p_product_id: productId,
                p_status: newStatus
            });
            if (error) {
                console.warn("RPC admin_toggle_product_status failed, falling back to direct update:", error.message);
                const { error: dbError } = await supabase
                    .from('products')
                    .update({ status: newStatus })
                    .eq('id', productId);
                if (dbError) throw dbError;
            }
            showToast(`Produit ${newStatus === 'En ligne' ? 'activé' : 'désactivé'} avec succès.`, "success");
            fetchAdminData();
        } catch (err) {
            console.error("Error toggling product status:", err);
            showToast("Erreur lors de la mise à jour du statut", "error");
        }
    };

    // Suspend un produit pour une durée choisie (en jours). Le produit passe
    // en statut 'Suspendu' avec une date d'échéance réelle ; il redevient
    // visible automatiquement à expiration (reactivate_expired_products).
    const handleSuspendProduct = async () => {
        if (!suspendModalProduct) return;
        const days = parseInt(suspendDays, 10);
        if (!days || days < 1) {
            showToast("Veuillez choisir une durée valide.", "error");
            return;
        }
        const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
        setActionLoading(true);
        try {
            const { error } = await supabase.rpc('admin_suspend_product', {
                p_product_id: suspendModalProduct.id,
                p_until: until
            });
            if (error) {
                console.warn("RPC admin_suspend_product failed, falling back to direct update:", error.message);
                const { error: dbError } = await supabase
                    .from('products')
                    .update({ status: 'Suspendu', suspended_until: until })
                    .eq('id', suspendModalProduct.id);
                if (dbError) throw dbError;
            }
            showToast(`Produit suspendu pour ${days} jour${days > 1 ? 's' : ''}.`, "success");
            setSuspendModalProduct(null);
            setSuspendDays('7');
            fetchAdminData();
        } catch (err) {
            console.error("Error suspending product:", err);
            showToast("Erreur lors de la suspension du produit", "error");
        } finally {
            setActionLoading(false);
        }
    };

    // Lève la suspension immédiatement (remet le produit en ligne).
    const handleReactivateProduct = async (productId) => {
        try {
            const { error } = await supabase.rpc('admin_toggle_product_status', {
                p_product_id: productId,
                p_status: 'En ligne'
            });
            if (error) {
                const { error: dbError } = await supabase
                    .from('products')
                    .update({ status: 'En ligne', suspended_until: null })
                    .eq('id', productId);
                if (dbError) throw dbError;
            } else {
                await supabase.from('products').update({ suspended_until: null }).eq('id', productId).then(undefined, () => {});
            }
            showToast("Produit réactivé et remis en ligne.", "success");
            fetchAdminData();
        } catch (err) {
            console.error("Error reactivating product:", err);
            showToast("Erreur lors de la réactivation du produit", "error");
        }
    };

    const handleToggleSponsorProduct = async (product) => {
        const currentOptions = product.options || {};
        const isFeatured = !currentOptions.is_featured;
        const updatedOptions = { ...currentOptions, is_featured: isFeatured };
        
        try {
            const { error } = await supabase.rpc('admin_update_product', {
                p_product_id: product.id,
                p_name: product.name,
                p_price: Number(product.price),
                p_promo_price: product.promo_price ? Number(product.promo_price) : null,
                p_discount: product.discount ? Number(product.discount) : null,
                p_description: product.description,
                p_options: updatedOptions
            });
            
            if (error) {
                console.warn("RPC admin_update_product failed, trying direct update:", error.message);
                const { error: dbError } = await supabase
                    .from('products')
                    .update({ options: updatedOptions })
                    .eq('id', product.id);
                if (dbError) throw dbError;
            }
            
            showToast(isFeatured ? "Produit sponsorisé avec succès !" : "Sponsorisation retirée.", "success");
            fetchAdminData();
        } catch (err) {
            console.error("Error updating product:", err);
            showToast("Erreur lors de la mise à jour : " + err.message, "error");
        }
    };

    const handleOpenEditProduct = (product) => {
        setEditingProduct(product);
        setProductForm({
            name: product.name || "",
            price: product.price ? product.price.toString() : "",
            promo_price: product.promo_price ? product.promo_price.toString() : "",
            discount: product.discount ? product.discount.toString() : "",
            description: product.description || "",
            status: product.status || "En ligne",
            category: product.options?.category || "Encre",
            quantity: product.options?.quantity || "En stock",
            format: product.options?.format || ""
        });
        setIsProductModalOpen(true);
    };

    const handleSaveProduct = async (e) => {
        e.preventDefault();
        if (!editingProduct) return;
        setActionLoading(true);
        
        const updatedOptions = {
            ...(editingProduct.options || {}),
            category: productForm.category,
            quantity: productForm.quantity,
            format: productForm.format || "Standard"
        };

        const updatedProduct = {
            name: productForm.name,
            price: Number(productForm.price),
            promo_price: productForm.promo_price ? Number(productForm.promo_price) : null,
            discount: productForm.discount ? Number(productForm.discount) : null,
            description: productForm.description,
            status: productForm.status,
            options: updatedOptions
        };

        try {
            const { error } = await supabase.rpc('admin_update_product', {
                p_product_id: editingProduct.id,
                p_name: updatedProduct.name,
                p_price: updatedProduct.price,
                p_promo_price: updatedProduct.promo_price,
                p_discount: updatedProduct.discount,
                p_description: updatedProduct.description,
                p_options: updatedProduct.options
            });

            if (error) {
                console.warn("RPC admin_update_product failed, falling back to direct update:", error.message);
                const { error: dbError } = await supabase
                    .from('products')
                    .update(updatedProduct)
                    .eq('id', editingProduct.id);
                if (dbError) throw dbError;
            }

            showToast("Produit mis à jour avec succès !", "success");
            setIsProductModalOpen(false);
            setEditingProduct(null);
            fetchAdminData();
        } catch (err) {
            console.error("Error saving product:", err);
            showToast("Erreur lors de l'enregistrement", "error");
        } finally {
            setActionLoading(false);
        }
    };

    // ── Messagerie & Support Actions ──────────────────────────────────

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!replyContent.trim() || !selectedPrinterId) return;
        try {
            const { error } = await supabase.rpc('admin_send_message', {
                p_printer_id: selectedPrinterId,
                p_subject: "Réponse Support",
                p_content: replyContent
            });
            if (error) {
                console.warn("RPC admin_send_message failed, falling back to direct insert:", error.message);
                const { error: tableError } = await supabase
                    .from('admin_messages')
                    .insert({
                        printer_id: selectedPrinterId,
                        subject: "Réponse Support",
                        content: replyContent,
                        direction: 'admin_to_printer',
                        is_read: false
                    });
                if (tableError) throw tableError;
            }
            setReplyContent('');
            showToast("Message envoyé avec succès", "success");
            fetchAdminData();
        } catch (err) {
            console.error("Error sending message:", err);
            showToast("Erreur lors de l'envoi du message", "error");
        }
    };

    const handleSendBulkMessage = async (e) => {
        e.preventDefault();
        if (!bulkSubject.trim() || !bulkContent.trim() || selectedBulkPrinters.length === 0) {
            showToast("Veuillez remplir tous les champs et sélectionner au moins un imprimeur.", "error");
            return;
        }
        try {
            const { data, error } = await supabase.rpc('admin_send_message_bulk', {
                p_printer_ids: selectedBulkPrinters,
                p_subject: bulkSubject,
                p_content: bulkContent
            });
            if (error) {
                console.warn("RPC admin_send_message_bulk failed, falling back to direct bulk insert:", error.message);
                const inserts = selectedBulkPrinters.map(pid => ({
                    printer_id: pid,
                    subject: bulkSubject,
                    content: bulkContent,
                    direction: 'admin_to_printer',
                    is_read: false
                }));
                const { error: tableError } = await supabase
                    .from('admin_messages')
                    .insert(inserts);
                if (tableError) throw tableError;
            } else {
                showToast(`${data} message(s) envoyé(s) avec succès.`, "success");
            }
            setBulkSubject('');
            setBulkContent('');
            setSelectedBulkPrinters([]);
            setShowBulkModal(false);
            fetchAdminData();
        } catch (err) {
            console.error("Error sending bulk message:", err);
            showToast("Erreur lors de la diffusion du message", "error");
        }
    };

    const markAsRead = async (printerId) => {
        try {
            const { error } = await supabase.rpc('admin_mark_messages_read', { p_printer_id: printerId });
            if (error) {
                console.warn("RPC admin_mark_messages_read failed, falling back to update:", error.message);
                const { error: tableError } = await supabase
                    .from('admin_messages')
                    .update({ is_read: true })
                    .eq('printer_id', printerId)
                    .eq('direction', 'printer_to_admin');
                if (tableError) throw tableError;
            }
            fetchAdminData();
        } catch (e) {
            console.error("Error marking messages as read:", e);
        }
    };

    // ── Actualités / Blog ─────────────────────────────────────────────
    const handleOpenNewsEditor = (article = null) => {
        if (article) {
            const cat = article.category || 'Actualité';
            const isPreset = ['Actualité', 'Conseils', 'Innovation', 'Tendance', 'Technologie'].includes(cat);
            setNewsForm({
                id: article.id,
                title: article.title || '',
                excerpt: article.excerpt || '',
                content: article.content || '',
                image_url: article.image_url || '',
                read_time: article.read_time || '5 min',
                published: article.published !== false,
                category: isPreset ? cat : 'Autre',
                tags: Array.isArray(article.tags) ? article.tags.join(', ') : (article.tags || ''),
                mentions: Array.isArray(article.mentions) ? article.mentions : [],
            });
            setCustomCategory(isPreset ? '' : cat);
        } else {
            setNewsForm(emptyNewsForm);
            setCustomCategory('');
        }
        setIsNewsModalOpen(true);
    };

    const handleCoverUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCoverUploading(true);
        try {
            const compressedFile = await compressImage(file, 1200, 1200, 0.8);
            const ext = compressedFile.name.split('.').pop();
            const path = `news/cover-${Date.now()}.${ext}`;
            const { error } = await supabase.storage.from('public-assets').upload(path, compressedFile, { cacheControl: '3600', upsert: true });
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('public-assets').getPublicUrl(path);
            setNewsForm(prev => ({ ...prev, image_url: publicUrl }));
        } catch (err) {
            const reader = new FileReader();
            reader.onloadend = () => setNewsForm(prev => ({ ...prev, image_url: reader.result }));
            reader.readAsDataURL(file);
        } finally {
            setCoverUploading(false);
        }
    };

    const handleSaveNews = async (e) => {
        e.preventDefault();
        if (!newsForm.title.trim()) { showToast("Le titre est obligatoire.", "error"); return; }
        setActionLoading(true);

        // 1. Détermine la catégorie finale
        const savedCategory = newsForm.category === 'Autre' ? customCategory.trim() : newsForm.category;
        if (!savedCategory) {
            showToast("Veuillez spécifier une catégorie.", "error");
            setActionLoading(false);
            return;
        }

        // 2. Parse les tags
        const tagsArray = (newsForm.tags || '').split(',').map(t => t.trim()).filter(Boolean);

        // 3. Extrait automatiquement les mentions du contenu HTML
        const contentHtml = newsForm.content || '';
        const parsedMentions = [];
        const mentionRegex = /data-printer-id="([a-f0-9-]{36})"/g;
        let match;
        while ((match = mentionRegex.exec(contentHtml)) !== null) {
            if (!parsedMentions.includes(match[1])) {
                parsedMentions.push(match[1]);
            }
        }
        const mentionAll = contentHtml.includes('data-mention-all="true"');
        const finalMentions = mentionAll ? printers.map(p => p.id) : parsedMentions;

        // 4. Détermine les imprimeurs nouvellement mentionnés
        const originalArticle = newsList.find(a => a.id === newsForm.id);
        const oldMentions = originalArticle ? (Array.isArray(originalArticle.mentions) ? originalArticle.mentions : []) : [];
        const newlyAddedMentions = finalMentions.filter(id => !oldMentions.includes(id));

        try {
            const { data: savedId, error } = await supabase.rpc('admin_upsert_news', {
                p_id: newsForm.id,
                p_title: newsForm.title,
                p_excerpt: newsForm.excerpt,
                p_content: newsForm.content,
                p_image_url: newsForm.image_url,
                p_read_time: newsForm.read_time,
                p_published: newsForm.published,
                p_category: savedCategory,
                p_tags: tagsArray,
                p_mentions: finalMentions,
            });

            let savedArticleId = savedId || newsForm.id;

            if (error) {
                console.warn("RPC admin_upsert_news failed, trying direct upsert:", error.message);
                const payload = {
                    title: newsForm.title,
                    excerpt: newsForm.excerpt,
                    content: newsForm.content,
                    image_url: newsForm.image_url,
                    read_time: newsForm.read_time || '5 min',
                    published: newsForm.published !== false,
                    category: savedCategory,
                    tags: tagsArray,
                    mentions: finalMentions
                };
                let dbError;
                if (newsForm.id) {
                    const { error: err } = await supabase
                        .from('news')
                        .update(payload)
                        .eq('id', newsForm.id);
                    dbError = err;
                } else {
                    const { data: insertData, error: err } = await supabase
                        .from('news')
                        .insert(payload)
                        .select()
                        .single();
                    dbError = err;
                    if (insertData) savedArticleId = insertData.id;
                }
                
                if (dbError) {
                    console.warn("Direct upsert with metadata fields failed, falling back to core fields upsert:", dbError.message);
                    const corePayload = {
                        title: newsForm.title,
                        excerpt: newsForm.excerpt,
                        content: newsForm.content,
                        image_url: newsForm.image_url,
                        read_time: newsForm.read_time || '5 min',
                        published: newsForm.published !== false
                    };
                    let coreError;
                    if (newsForm.id) {
                        const { error: err } = await supabase
                            .from('news')
                            .update(corePayload)
                            .eq('id', newsForm.id);
                        coreError = err;
                    } else {
                        const { data: insertData, error: err } = await supabase
                            .from('news')
                            .insert(corePayload)
                            .select()
                            .single();
                        coreError = err;
                        if (insertData) savedArticleId = insertData.id;
                    }
                    if (coreError) throw coreError;
                }
            }

            // 5. Envoi des notifications directes de messagerie aux imprimeurs mentionnés
            if (savedArticleId && newlyAddedMentions.length > 0) {
                const subject = `🔔 Nouvelle mention : ${newsForm.title}`;
                const content = mentionAll 
                    ? `Bonjour! Un nouvel article vient d'être publié sur Printacoté : "${newsForm.title}".\n\nDécouvrez nos derniers conseils et tendances en lisant l'article ici : ${window.location.origin}/actualites?article=${savedArticleId}`
                    : `Bonjour! Votre imprimerie a été mentionnée dans notre nouvel article de blog : "${newsForm.title}".\n\nVous pouvez lire l'article complet et le partager en cliquant ici : ${window.location.origin}/actualites?article=${savedArticleId}`;
                
                await supabase.rpc('admin_send_message_bulk', {
                    p_printer_ids: newlyAddedMentions,
                    p_subject: subject,
                    p_content: content
                }).then(({ error: bulkError }) => {
                    if (bulkError) {
                        console.warn("RPC admin_send_message_bulk failed, falling back to individual support inserts:", bulkError.message);
                        newlyAddedMentions.forEach(async (pid) => {
                            await supabase.from('admin_messages').insert({
                                printer_id: pid,
                                subject: subject,
                                content: content,
                                direction: 'admin_to_printer',
                                is_read: false
                            });
                        });
                    }
                });
            }

            showToast(newsForm.id ? "Article mis à jour." : "Article publié.", "success");
            setIsNewsModalOpen(false);
            setNewsForm(emptyNewsForm);
            setCustomCategory('');
            fetchAdminData();
        } catch (err) {
            console.error("Error saving news:", err);
            showToast("Erreur lors de l'enregistrement de l'article.", "error");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteNews = async (id) => {
        if (!confirm("Supprimer définitivement cet article et ses commentaires ?")) return;
        try {
            const { error } = await supabase.rpc('admin_delete_news', { p_id: id });
            if (error) throw error;
            showToast("Article supprimé.", "success");
            fetchAdminData();
        } catch (err) {
            console.error("Error deleting news:", err);
            showToast("Erreur lors de la suppression.", "error");
        }
    };

    const handleDeleteComment = async (id) => {
        if (!confirm("Supprimer ce commentaire ?")) return;
        try {
            const { error } = await supabase.rpc('admin_delete_comment', { p_id: id });
            if (error) throw error;
            showToast("Commentaire supprimé.", "success");
            fetchAdminData();
        } catch (err) {
            console.error("Error deleting comment:", err);
            showToast("Erreur lors de la suppression du commentaire.", "error");
        }
    };

    const handleSavePricingPlans = async (e) => {
        e.preventDefault();
        setLoadingPricing(true);
        try {
            const { error } = await supabase.rpc('admin_set_setting', {
                p_key: 'subscription_plans',
                p_value: pricingPlans
            });
            if (error) {
                const { error: tableError } = await supabase
                    .from('system_settings')
                    .upsert({ key: 'subscription_plans', value: pricingPlans });
                if (tableError) throw tableError;
            }
            showToast("Tarifs d'abonnement enregistrés avec succès !", "success");
        } catch (err) {
            console.error("Erreur sauvegarde tarifs:", err);
            showToast("Erreur lors de la sauvegarde des tarifs.", "error");
        } finally {
            setLoadingPricing(false);
        }
    };

    const handleUpdatePrinterSubscription = async (e) => {
        e.preventDefault();
        if (!selectedPrinterForSub) return;
        setActionLoading(true);
        try {
            const endsAtVal = subForm.endsAt && subForm.endsAt.trim() !== '' ? new Date(subForm.endsAt).toISOString() : null;
            const trialEndsAtVal = subForm.trialEndsAt && subForm.trialEndsAt.trim() !== '' ? new Date(subForm.trialEndsAt).toISOString() : null;

            let { error } = await supabase.rpc('admin_update_printer_subscription', {
                p_printer_id: selectedPrinterForSub.id,
                p_status: subForm.status,
                p_ends_at: endsAtVal,
                p_trial_ends_at: trialEndsAtVal,
                p_plan: subForm.plan
            });
            if (error) {
                console.warn("RPC admin_update_printer_subscription failed, trying direct update:", error.message);
                const { error: updateError } = await supabase
                    .from('printers')
                    .update({
                        subscription_status: subForm.status,
                        subscription_ends_at: endsAtVal,
                        trial_ends_at: trialEndsAtVal,
                        subscription_plan: subForm.plan,
                        status: subForm.status === 'active' ? 'En ligne' : undefined
                    })
                    .eq('id', selectedPrinterForSub.id);
                if (updateError) throw updateError;
            }
            showToast(`Abonnement de "${selectedPrinterForSub.name}" mis à jour !`, "success");
            setSelectedPrinterForSub(null);
            fetchAdminData();
        } catch (err) {
            console.error("Erreur mise à jour abonnement:", err);
            showToast("Erreur lors de la modification de l'abonnement.", "error");
        } finally {
            setActionLoading(false);
        }
    };

    const handleResetAllStatistics = async () => {
        if (!window.confirm("Êtes-vous sûr de vouloir réinitialiser toutes les statistiques à zéro ? Cette action est irréversible et supprimera tout l'historique des vues et des clics.")) {
            return;
        }
        setActionLoading(true);
        try {
            const { error } = await supabase.rpc('admin_reset_all_statistics');
            if (error) {
                console.warn("RPC admin_reset_all_statistics failed, trying direct deletes:", error.message);
                
                // Fallback 1: Reset views/clicks on printers
                const { error: printersErr } = await supabase
                    .from('printers')
                    .update({ views: 0, clicks: 0 });
                if (printersErr) throw printersErr;

                // Fallback 2: Delete from site_views
                const { error: viewsErr } = await supabase
                    .from('site_views')
                    .delete()
                    .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all
                if (viewsErr) throw viewsErr;

                // Fallback 3: Delete from printer_events
                const { error: eventsErr } = await supabase
                    .from('printer_events')
                    .delete()
                    .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all
                if (eventsErr) throw eventsErr;
            }
            showToast("Toutes les statistiques ont été réinitialisées avec succès !", "success");
            setRefreshTrigger(prev => prev + 1);
        } catch (err) {
            console.error("Erreur lors de la réinitialisation des statistiques:", err);
            showToast("Erreur lors de la réinitialisation des statistiques.", "error");
        } finally {
            setActionLoading(false);
        }
    };

    const handleSaveBannerSettings = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Save to localStorage for instant local fallback
            localStorage.setItem('publicity_banner', JSON.stringify(bannerSettings));

            const { error } = await supabase.rpc('admin_set_setting', {
                p_key: 'publicity_banner',
                p_value: bannerSettings
            });
            if (error) {
                console.warn("RPC admin_set_setting failed, falling back to direct upsert:", error.message);
                const { error: tableError } = await supabase
                    .from('system_settings')
                    .upsert({ key: 'publicity_banner', value: bannerSettings });
                if (tableError) throw tableError;
            }
            showToast("Bannière publicitaire mise à jour avec succès !", "success");
        } catch (err) {
            console.error("Error saving banner settings:", err);
            // Even if DB fails, let user know it was saved locally
            showToast("Enregistré localement avec succès !", "success");
        } finally {
            setLoading(false);
        }
    };

    const handleBannerImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setBannerUploading(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `banners/pub_banner_${Date.now()}.${fileExt}`;
        try {
            const { data, error } = await supabase.storage
                .from('public-assets')
                .upload(fileName, file, { cacheControl: '3600', upsert: true });
            
            if (error) throw error;
            
            const { data: { publicUrl } } = supabase.storage
                .from('public-assets')
                .getPublicUrl(fileName);
                
            const updatedSettings = { ...bannerSettings, image_url: publicUrl };
            setBannerSettings(updatedSettings);
            localStorage.setItem('publicity_banner', JSON.stringify(updatedSettings));
            showToast("Image de la bannière importée avec succès !", "success");
        } catch (err) {
            console.warn("Storage upload failed, falling back to base64:", err.message);
            const reader = new FileReader();
            reader.onloadend = () => {
                const updatedSettings = { ...bannerSettings, image_url: reader.result };
                setBannerSettings(updatedSettings);
                localStorage.setItem('publicity_banner', JSON.stringify(updatedSettings));
                showToast("Image de la bannière importée en base64 !", "success");
            };
            reader.readAsDataURL(file);
        } finally {
            setBannerUploading(false);
        }
    };

    // Upload d'une vidéo de bannière vers le storage (pas de repli base64 :
    // les vidéos sont trop lourdes pour ça).
    const handleBannerVideoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setBannerVideoUploading(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `banners/pub_video_${Date.now()}.${fileExt}`;
        try {
            const { error } = await supabase.storage
                .from('public-assets')
                .upload(fileName, file, { cacheControl: '3600', upsert: true });
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('public-assets').getPublicUrl(fileName);
            const updatedSettings = { ...bannerSettings, video_url: publicUrl, media_type: 'video' };
            setBannerSettings(updatedSettings);
            localStorage.setItem('publicity_banner', JSON.stringify(updatedSettings));
            showToast("Vidéo de la bannière importée avec succès !", "success");
        } catch (err) {
            console.error("Video upload failed:", err);
            showToast("Échec de l'import vidéo (taille/format). Essayez un lien YouTube/Vimeo.", "error");
        } finally {
            setBannerVideoUploading(false);
        }
    };

    useEffect(() => {
        if (selectedPrinterId && activeTab === 'support') {
            markAsRead(selectedPrinterId);
        }
    }, [selectedPrinterId, messages, activeTab]);


    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#0A0A0E] flex items-center justify-center p-6 text-white relative font-sans">
                <div className="absolute inset-0 pointer-events-none noise-overlay opacity-[0.03] bg-white"></div>
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#C9A84C]/5 rounded-full blur-[120px] pointer-events-none"></div>

                <div 
                    ref={loginCardRef}
                    className="max-w-md w-full bg-[#111116] border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden"
                >
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-[#C9A84C]/10 text-[#C9A84C] flex items-center justify-center mb-6">
                            <Shield size={32} />
                        </div>
                        <span className="text-[10px] font-black text-[#C9A84C] uppercase tracking-[0.3em] mb-2 block">
                            Administration Système
                        </span>
                        <h2 className="text-3xl font-black font-serif text-[#FAF8F5]">
                            Accès Restreint.
                        </h2>
                        <p className="text-white/50 text-sm mt-3 leading-relaxed">
                            Saisissez le mot de passe d'authentification pour déverrouiller la salle de contrôle de Printacoté.
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="mt-8 space-y-4">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/30">
                                <KeyRound size={18} />
                            </div>
                            <input 
                                type="password" 
                                required
                                placeholder="Mot de passe d'accès"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-[#C9A84C]/50 focus:bg-white/10 text-[#FAF8F5] transition-all"
                            />
                        </div>
                        {authError && (
                            <p className="text-red-400 text-xs font-bold text-center mt-2 flex items-center justify-center gap-1">
                                <ShieldAlert size={14} /> {authError}
                            </p>
                        )}
                        <button
                            type="submit"
                            className="w-full py-4 bg-[#C9A84C] text-[#0F0F13] rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.03] active:scale-95 transition-all shadow-xl shadow-[#C9A84C]/20"
                            style={{ transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
                        >
                            S'authentifier
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // Filter Printers
    const filteredPrinters = printers.filter(p => {
        const query = searchQuery.toLowerCase();
        return (p.name || '').toLowerCase().includes(query) || (p.city || '').toLowerCase().includes(query) || (p.email || '').toLowerCase().includes(query);
    });

    // Chat mapping: group messages by printer
    const printersWithMessages = [];
    const messagesByPrinter = {};
    
    messages.forEach(msg => {
        if (!messagesByPrinter[msg.printer_id]) {
            messagesByPrinter[msg.printer_id] = [];
            printersWithMessages.push({
                id: msg.printer_id,
                name: msg.printer_name,
                logo: msg.printer_logo,
                unread: 0
            });
        }
        messagesByPrinter[msg.printer_id].push(msg);
        if (!msg.is_read && msg.direction === 'printer_to_admin') {
            const p = printersWithMessages.find(item => item.id === msg.printer_id);
            if (p) p.unread += 1;
        }
    });

    // Liste de conversations : TOUS les imprimeurs sont contactables (pas
    // seulement ceux qui ont déjà écrit). Ceux avec messages remontent en haut.
    const conversationList = printers
        .map(p => {
            const msgs = messagesByPrinter[p.id] || [];
            const conv = printersWithMessages.find(x => x.id === p.id);
            return {
                id: p.id,
                name: p.name,
                logo: p.logo_url,
                email: p.email,
                hasMessages: msgs.length > 0,
                lastContent: msgs[0]?.content || '',
                lastAt: msgs[0]?.created_at || null,
                unread: conv?.unread || 0,
            };
        })
        .filter(c => {
            const q = messageSearch.trim().toLowerCase();
            if (!q) return true;
            return (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
        })
        .sort((a, b) => {
            if (a.hasMessages && b.hasMessages) return new Date(b.lastAt) - new Date(a.lastAt);
            if (a.hasMessages) return -1;
            if (b.hasMessages) return 1;
            return (a.name || '').localeCompare(b.name || '');
        });
    const selectedPrinter = printers.find(p => p.id === selectedPrinterId);

    return (
        <div className="min-h-screen bg-[#0F0F13] flex flex-col lg:flex-row text-[#FAF8F5] font-sans selection:bg-[#C9A84C] selection:text-[#0F0F13]">
            <div className="noise-overlay opacity-5 pointer-events-none"></div>

            {/* Mobile Header Bar */}
            <header className="lg:hidden w-full bg-[#111116] border-b border-white/5 p-5 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="Logo" className="h-8 w-auto brightness-200" />
                    <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Admin</span>
                </div>
                <button 
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:text-white"
                >
                    <Menu size={20} />
                </button>
            </header>

            {/* Mobile Menu Drawer Overlay */}
            {isMobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 z-[200] flex">
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-black/85 backdrop-blur-md"
                        onClick={() => setIsMobileMenuOpen(false)}
                    ></div>
                    
                    {/* Drawer Content */}
                    <div className="relative w-72 max-w-[80vw] bg-[#111116] h-full flex flex-col p-6 shadow-2xl animate-in slide-in-from-left duration-300">
                        <div className="flex justify-between items-center pb-6 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <img src="/logo.png" alt="Logo" className="h-8 w-auto brightness-200" />
                                <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Admin</span>
                            </div>
                            <button 
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-1.5 rounded-lg bg-white/5 text-white/60 hover:text-white"
                            >
                                <XCircle size={18} />
                            </button>
                        </div>
                        
                        <nav className="flex-1 space-y-2 mt-8 overflow-y-auto pr-1 custom-scrollbar">
                            <button
                                onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }}
                                className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-bold text-xs uppercase tracking-wider transition-all
                                    ${activeTab === 'overview' ? 'bg-[#C9A84C] text-[#0F0F13] shadow-xl shadow-[#C9A84C]/10' : 'text-white/50 hover:bg-white/5'}`}
                            >
                                <LayoutDashboard size={18} />
                                <span>Vue d'ensemble</span>
                            </button>

                            <button
                                onClick={() => { setActiveTab('printers'); setIsMobileMenuOpen(false); }}
                                className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-bold text-xs uppercase tracking-wider transition-all
                                    ${activeTab === 'printers' ? 'bg-[#C9A84C] text-[#0F0F13] shadow-xl shadow-[#C9A84C]/10' : 'text-white/50 hover:bg-white/5'}`}
                            >
                                <Users size={18} />
                                <span>Imprimeurs</span>
                            </button>

                            <button
                                onClick={() => { setActiveTab('services'); setIsMobileMenuOpen(false); }}
                                className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-bold text-xs uppercase tracking-wider transition-all
                                    ${activeTab === 'services' ? 'bg-[#C9A84C] text-[#0F0F13] shadow-xl shadow-[#C9A84C]/10' : 'text-white/50 hover:bg-white/5'}`}
                            >
                                <Wrench size={18} />
                                <span>Services</span>
                            </button>

                            <button
                                onClick={() => { setActiveTab('portfolio'); setIsMobileMenuOpen(false); }}
                                className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-bold text-xs uppercase tracking-wider transition-all
                                    ${activeTab === 'portfolio' ? 'bg-[#C9A84C] text-[#0F0F13] shadow-xl shadow-[#C9A84C]/10' : 'text-white/50 hover:bg-white/5'}`}
                            >
                                <ImageIcon size={18} />
                                <span>Portfolio</span>
                            </button>

                            <button
                                onClick={() => { setActiveTab('marketplace'); setIsMobileMenuOpen(false); }}
                                className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-bold text-xs uppercase tracking-wider transition-all
                                    ${activeTab === 'marketplace' ? 'bg-[#C9A84C] text-[#0F0F13] shadow-xl shadow-[#C9A84C]/10' : 'text-white/50 hover:bg-white/5'}`}
                            >
                                <Store size={18} />
                                <span>Marketplace</span>
                            </button>

                            <button
                                onClick={() => { setActiveTab('support'); setIsMobileMenuOpen(false); }}
                                className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-bold text-xs uppercase tracking-wider transition-all group relative
                                    ${activeTab === 'support' ? 'bg-[#C9A84C] text-[#0F0F13] shadow-xl shadow-[#C9A84C]/10' : 'text-white/50 hover:bg-white/5'}`}
                            >
                                <Mail size={18} />
                                <span>Messagerie</span>
                                {messages.filter(m => !m.is_read && m.direction === 'printer_to_admin').length > 0 && (
                                    <span className="absolute right-4 bg-red-500 text-white font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                                        {messages.filter(m => !m.is_read && m.direction === 'printer_to_admin').length}
                                    </span>
                                )}
                            </button>

                            <button
                                onClick={() => { setActiveTab('news'); setIsMobileMenuOpen(false); }}
                                className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-bold text-xs uppercase tracking-wider transition-all
                                    ${activeTab === 'news' ? 'bg-[#C9A84C] text-[#0F0F13] shadow-xl shadow-[#C9A84C]/10' : 'text-white/50 hover:bg-white/5'}`}
                            >
                                <Newspaper size={18} />
                                <span>Actualités</span>
                            </button>

                            <button
                                onClick={() => { setActiveTab('advertising'); setIsMobileMenuOpen(false); }}
                                className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-bold text-xs uppercase tracking-wider transition-all
                                    ${activeTab === 'advertising' ? 'bg-[#C9A84C] text-[#0F0F13] shadow-xl shadow-[#C9A84C]/10' : 'text-white/50 hover:bg-white/5'}`}
                            >
                                <Megaphone size={18} />
                                <span>Publicité</span>
                            </button>

                            <button
                                onClick={() => { setActiveTab('pricing'); setIsMobileMenuOpen(false); }}
                                className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-bold text-xs uppercase tracking-wider transition-all
                                    ${activeTab === 'pricing' ? 'bg-[#C9A84C] text-[#0F0F13] shadow-xl shadow-[#C9A84C]/10' : 'text-white/50 hover:bg-white/5'}`}
                            >
                                <CreditCard size={18} />
                                <span>Abonnements</span>
                            </button>
                        </nav>

                        <div className="pt-6 border-t border-white/5">
                            <button 
                                onClick={() => setShowLogoutConfirm(true)}
                                className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-red-400 hover:bg-red-500/10 transition-colors text-xs uppercase tracking-wider"
                            >
                                <LogOut size={18} />
                                <span>Quitter</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar Administrateur */}
            <aside className="hidden lg:flex w-80 bg-[#111116] border-r border-white/5 flex-col sticky top-0 h-screen z-50">
                <div className="p-10 flex items-center gap-4">
                    <img src="/logo.png" alt="Logo" className="h-10 w-auto brightness-200" />
                    <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Admin</span>
                </div>

                <nav className="flex-1 px-6 space-y-2 mt-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-6 px-4">Menu Admin</div>
                    
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-bold text-xs uppercase tracking-wider transition-all group
                            ${activeTab === 'overview' ? 'bg-[#C9A84C] text-[#0F0F13] shadow-xl shadow-[#C9A84C]/10' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
                    >
                        <LayoutDashboard size={18} />
                        <span>Vue d'ensemble</span>
                    </button>
                    
                    <button
                        onClick={() => setActiveTab('printers')}
                        className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-bold text-xs uppercase tracking-wider transition-all group
                            ${activeTab === 'printers' ? 'bg-[#C9A84C] text-[#0F0F13] shadow-xl shadow-[#C9A84C]/10' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
                    >
                        <Users size={18} />
                        <span>Imprimeurs</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('services')}
                        className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-bold text-xs uppercase tracking-wider transition-all group
                            ${activeTab === 'services' ? 'bg-[#C9A84C] text-[#0F0F13] shadow-xl shadow-[#C9A84C]/10' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
                    >
                        <Wrench size={18} />
                        <span>Services</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('portfolio')}
                        className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-bold text-xs uppercase tracking-wider transition-all group
                            ${activeTab === 'portfolio' ? 'bg-[#C9A84C] text-[#0F0F13] shadow-xl shadow-[#C9A84C]/10' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
                    >
                        <ImageIcon size={18} />
                        <span>Portfolio</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('marketplace')}
                        className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-bold text-xs uppercase tracking-wider transition-all group
                            ${activeTab === 'marketplace' ? 'bg-[#C9A84C] text-[#0F0F13] shadow-xl shadow-[#C9A84C]/10' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
                    >
                        <Store size={18} />
                        <span>Marketplace</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('support')}
                        className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-bold text-xs uppercase tracking-wider transition-all group relative
                            ${activeTab === 'support' ? 'bg-[#C9A84C] text-[#0F0F13] shadow-xl shadow-[#C9A84C]/10' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
                    >
                        <Mail size={18} />
                        <span>Messagerie</span>
                        {messages.filter(m => !m.is_read && m.direction === 'printer_to_admin').length > 0 && (
                            <span className="absolute right-4 bg-red-500 text-white font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                                {messages.filter(m => !m.is_read && m.direction === 'printer_to_admin').length}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('news')}
                        className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-bold text-xs uppercase tracking-wider transition-all group
                            ${activeTab === 'news' ? 'bg-[#C9A84C] text-[#0F0F13] shadow-xl shadow-[#C9A84C]/10' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
                    >
                        <Newspaper size={18} />
                        <span>Actualités</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('advertising')}
                        className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-bold text-xs uppercase tracking-wider transition-all group
                            ${activeTab === 'advertising' ? 'bg-[#C9A84C] text-[#0F0F13] shadow-xl shadow-[#C9A84C]/10' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
                    >
                        <Megaphone size={18} />
                        <span>Publicité</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('pricing')}
                        className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-bold text-xs uppercase tracking-wider transition-all group
                            ${activeTab === 'pricing' ? 'bg-[#C9A84C] text-[#0F0F13] shadow-xl shadow-[#C9A84C]/10' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
                    >
                        <CreditCard size={18} />
                        <span>Abonnements</span>
                    </button>
                </nav>

                <div className="p-8 border-t border-white/5">
                    <button 
                        onClick={() => setShowLogoutConfirm(true)}
                        className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-red-400 hover:bg-red-500/10 transition-colors text-xs uppercase tracking-wider"
                    >
                        <LogOut size={18} />
                        <span>Quitter l'administration</span>
                    </button>
                </div>
            </aside>

            {/* Zone de contenu principale */}
            <main className="flex-1 p-12 overflow-y-auto h-screen relative z-10">
                <div className="max-w-6xl mx-auto space-y-8">
                    
                    {/* Header */}
                    <div className="flex justify-between items-center pb-6 border-b border-white/5">
                        <div>
                            <span className="text-[10px] font-black text-[#C9A84C] uppercase tracking-[0.3em] mb-2 block">
                                Console d'administration
                            </span>
                            <h1 className="text-3xl md:text-4xl font-black font-serif text-[#FAF8F5]">
                                {activeTab === 'overview' && "Vue d'ensemble"}
                                {activeTab === 'printers' && "Gestion des Imprimeurs"}
                                {activeTab === 'services' && "Modération des Services"}
                                {activeTab === 'portfolio' && "Modération du Portfolio"}
                                {activeTab === 'marketplace' && "Modération Marketplace"}
                                {activeTab === 'support' && "Support & Messagerie"}
                                {activeTab === 'news' && "Actualités & Blog"}
                                {activeTab === 'advertising' && "Bannière Publicitaire"}
                                {activeTab === 'pricing' && "Gestion des Tarifs & Abonnements"}
                            </h1>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Cloche de notifications */}
                            <div className="relative">
                                <button
                                    onClick={() => { setShowNotifications(s => !s); if (!showNotifications && unreadNotifications > 0) handleMarkNotificationsRead(); }}
                                    className="relative w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                                    title="Notifications"
                                >
                                    <Bell size={18} />
                                    {unreadNotifications > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">{unreadNotifications}</span>
                                    )}
                                </button>
                                {showNotifications && (
                                    <>
                                        <div className="fixed inset-0 z-[90]" onClick={() => setShowNotifications(false)} />
                                        <div className="absolute right-0 mt-2 w-[320px] sm:w-[380px] max-h-[440px] bg-[#111116] border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden flex flex-col">
                                            <div className="flex items-center justify-between p-4 border-b border-white/5">
                                                <span className="text-[11px] font-black uppercase tracking-wider text-white/60">Notifications</span>
                                                {notifications.length > 0 && (
                                                    <button onClick={handleClearNotifications} className="text-[10px] font-black uppercase tracking-wider text-red-400 hover:text-red-300">Tout effacer</button>
                                                )}
                                            </div>
                                            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/5">
                                                {notifications.length === 0 ? (
                                                    <p className="p-8 text-center text-xs text-white/30 font-bold">Aucune notification.</p>
                                                ) : notifications.map(n => (
                                                    <div key={n.id} className={`p-4 flex items-start gap-3 ${!n.is_read ? 'bg-[#C9A84C]/5' : ''}`}>
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${n.type === 'product' ? 'bg-blue-500/15 text-blue-400' : n.type === 'account' ? 'bg-green-500/15 text-green-400' : 'bg-purple-500/15 text-purple-400'}`}>
                                                            {n.type === 'product' ? <Store size={15} /> : n.type === 'account' ? <UserCheck size={15} /> : <ImageIcon size={15} />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs text-white/80 font-medium leading-snug">{n.message}</p>
                                                            <p className="text-[10px] text-white/30 font-mono mt-1">{new Date(n.created_at).toLocaleString('fr-FR')}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-white/40 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                Système Connecté
                            </div>
                        </div>
                    </div>

                    {loading && (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="animate-spin text-[#C9A84C]" size={36} />
                        </div>
                    )}

                    {!loading && (
                        <div className="animate-in fade-in duration-500">
                            {/* TAB 1: OVERVIEW */}
                            {activeTab === 'overview' && stats && (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <div className="bg-[#111116] border border-white/5 rounded-[2rem] p-6 flex items-center gap-5">
                                            <div className="w-14 h-14 bg-[#C9A84C]/10 text-[#C9A84C] rounded-2xl flex items-center justify-center shrink-0">
                                                <Users size={28} />
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-black uppercase text-white/30 tracking-widest block">Imprimeurs</span>
                                                <h3 className="text-3xl font-black mt-1">{stats.totalPrinters}</h3>
                                            </div>
                                        </div>
                                        <div className="bg-[#111116] border border-white/5 rounded-[2rem] p-6 flex items-center gap-5">
                                            <div className="w-14 h-14 bg-[#C9A84C]/10 text-[#C9A84C] rounded-2xl flex items-center justify-center shrink-0">
                                                <Wrench size={28} />
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-black uppercase text-white/30 tracking-widest block">Services publiés</span>
                                                <h3 className="text-3xl font-black mt-1">{stats.totalServices}</h3>
                                            </div>
                                        </div>
                                        <div className="bg-[#111116] border border-white/5 rounded-[2rem] p-6 flex items-center gap-5">
                                            <div className="w-14 h-14 bg-[#C9A84C]/10 text-[#C9A84C] rounded-2xl flex items-center justify-center shrink-0">
                                                <ImageIcon size={28} />
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-black uppercase text-white/30 tracking-widest block">Images Portfolio</span>
                                                <h3 className="text-3xl font-black mt-1">{stats.totalPortfolio}</h3>
                                            </div>
                                        </div>
                                        <div className="bg-[#111116] border border-white/5 rounded-[2rem] p-6 flex items-center gap-5">
                                            <div className="w-14 h-14 bg-[#C9A84C]/10 text-[#C9A84C] rounded-2xl flex items-center justify-center shrink-0">
                                                <Store size={28} />
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-black uppercase text-white/30 tracking-widest block">Produits Boutique</span>
                                                <h3 className="text-3xl font-black mt-1">{stats.totalProducts}</h3>
                                            </div>
                                        </div>
                                        <div className="bg-[#111116] border border-white/5 rounded-[2rem] p-6 flex items-center gap-5">
                                            <div className="w-14 h-14 bg-[#C9A84C]/10 text-[#C9A84C] rounded-2xl flex items-center justify-center shrink-0">
                                                <Users size={28} className="rotate-12" />
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-black uppercase text-white/30 tracking-widest block">Vues de vitrines</span>
                                                <h3 className="text-3xl font-black mt-1">{(stats.totalViews || 0).toLocaleString()}</h3>
                                            </div>
                                        </div>
                                        <div className="bg-[#111116] border border-white/5 rounded-[2rem] p-6 flex items-center gap-5">
                                            <div className="w-14 h-14 bg-[#C9A84C]/10 text-[#C9A84C] rounded-2xl flex items-center justify-center shrink-0">
                                                <Send size={28} />
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-black uppercase text-white/30 tracking-widest block">Clics de Contact</span>
                                                <h3 className="text-3xl font-black mt-1">{(stats.totalClicks || 0).toLocaleString()}</h3>
                                            </div>
                                        </div>
                                        <div className="bg-[#111116] border border-white/5 rounded-[2rem] p-6 flex items-center gap-5">
                                            <div className="w-14 h-14 bg-[#C9A84C]/10 text-[#C9A84C] rounded-2xl flex items-center justify-center shrink-0">
                                                <Eye size={28} />
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-black uppercase text-white/30 tracking-widest block">Vues du site</span>
                                                <h3 className="text-3xl font-black mt-1">{(stats.totalSiteViews || 0).toLocaleString()}</h3>
                                            </div>
                                        </div>
                                        <div className="bg-[#111116] border border-white/5 rounded-[2rem] p-6 flex items-center gap-5">
                                            <div className="w-14 h-14 bg-[#C9A84C]/10 text-[#C9A84C] rounded-2xl flex items-center justify-center shrink-0">
                                                <UserCheck size={28} />
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-black uppercase text-white/30 tracking-widest block">Visiteurs uniques</span>
                                                <h3 className="text-3xl font-black mt-1">{(stats.totalVisitors || 0).toLocaleString()}</h3>
                                            </div>
                                        </div>
                                        <div className="bg-[#111116] border border-white/5 rounded-[2rem] p-6 flex items-center gap-5">
                                            <div className="w-14 h-14 bg-[#C9A84C]/10 text-[#C9A84C] rounded-2xl flex items-center justify-center shrink-0">
                                                <Newspaper size={28} />
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-black uppercase text-white/30 tracking-widest block">Actualités publiées</span>
                                                <h3 className="text-3xl font-black mt-1">{(stats.totalNews || 0).toLocaleString()}</h3>
                                            </div>
                                        </div>
                                    </div>

                                    {(() => {
                                        const periodLabels = { today: "Aujourd'hui", week: '7 derniers jours', month: '30 derniers jours', year: '12 derniers mois' };
                                        const series = Array.isArray(viewsSeries) ? viewsSeries : [];
                                        const totalPeriodViews = series.reduce((acc, b) => acc + (b.value || 0), 0);
                                        const maxValue = series.reduce((acc, b) => Math.max(acc, b.value || 0), 0);
                                        const avgPerBucket = series.length ? (totalPeriodViews / series.length) : 0;
                                        const avgUnit = overviewFilter === 'today' ? 'heure' : overviewFilter === 'year' ? 'mois' : 'jour';
                                        const formatBucketLabel = (ts) => {
                                            const d = new Date(ts);
                                            if (overviewFilter === 'today') return `${d.getHours()}h`;
                                            if (overviewFilter === 'year') return d.toLocaleDateString('fr-FR', { month: 'short' });
                                            return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                                        };

                                        return (
                                            <div className="bg-[#111116] border border-white/5 rounded-[2.5rem] p-8 sm:p-10 shadow-xl space-y-8">
                                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                                    <div>
                                                        <h3 className="font-black text-xl tracking-tight text-white/80">Trafic réel du site</h3>
                                                        <p className="text-white/40 text-xs">Vues de pages réellement enregistrées (table site_views), par période.</p>
                                                    </div>

                                                    <div className="flex bg-white/5 p-1 rounded-2xl w-full md:w-auto overflow-x-auto border border-white/5">
                                                        {[
                                                            { id: 'today', label: 'Jour' },
                                                            { id: 'week', label: 'Semaine' },
                                                            { id: 'month', label: 'Mois' },
                                                            { id: 'year', label: 'Année' }
                                                        ].map((filter) => (
                                                            <button
                                                                key={filter.id}
                                                                onClick={() => setOverviewFilter(filter.id)}
                                                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex-1 md:flex-none
                                                                    ${overviewFilter === filter.id ? 'bg-[#C9A84C] text-[#0F0F13] shadow-md shadow-[#C9A84C]/10' : 'text-white/45 hover:text-white'}`}
                                                            >
                                                                {filter.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                    <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 flex flex-col justify-between min-h-[160px]">
                                                        <div>
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">Vues sur la période</span>
                                                            <h4 className="text-4xl font-black text-[#FAF8F5] mt-2">{totalPeriodViews.toLocaleString()}</h4>
                                                        </div>
                                                        <div className="mt-4 pt-4 border-t border-white/5">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-white/45 block">Moyenne / {avgUnit}</span>
                                                            <h4 className="text-2xl font-black text-white/80 mt-1">{avgPerBucket.toFixed(1)}</h4>
                                                        </div>
                                                    </div>

                                                    <div className="md:col-span-2 flex flex-col justify-between gap-6 overflow-hidden">
                                                        {seriesLoading ? (
                                                            <div className="flex items-center justify-center h-28 text-white/30 gap-2">
                                                                <Loader2 size={18} className="animate-spin" />
                                                                <span className="text-xs font-bold">Chargement du trafic…</span>
                                                            </div>
                                                        ) : totalPeriodViews === 0 ? (
                                                            <div className="flex flex-col items-center justify-center h-28 text-center text-white/30">
                                                                <Eye size={22} className="mb-2 opacity-50" />
                                                                <p className="text-xs font-bold">Aucune vue enregistrée sur cette période.</p>
                                                            </div>
                                                        ) : (
                                                            <div className="overflow-x-auto pb-2 custom-scrollbar">
                                                                <div className="flex items-end justify-between h-28 px-2 pt-4 border-b border-white/5 relative gap-1 min-w-[340px] sm:min-w-0">
                                                                    <div className="absolute top-0 left-0 right-0 border-t border-dashed border-white/5"></div>
                                                                    <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-white/5"></div>

                                                                    {series.map((bar, i) => {
                                                                        const value = bar.value || 0;
                                                                        const percentage = maxValue > 0 ? Math.max(value > 0 ? 6 : 0, (value / maxValue) * 100) : 0;
                                                                        return (
                                                                            <div key={i} className="flex flex-col items-center gap-2 flex-1 group min-w-0">
                                                                                <div className="relative w-full flex justify-center items-end h-20">
                                                                                    <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0A0A0E] text-white text-[9px] font-bold px-2 py-1 rounded-md pointer-events-none whitespace-nowrap z-20 shadow-xl border border-white/10">
                                                                                        {value.toLocaleString()} vue{value > 1 ? 's' : ''}
                                                                                    </div>
                                                                                    <div
                                                                                        style={{ height: `${percentage}%` }}
                                                                                        className="w-3 sm:w-6 bg-[#C9A84C] rounded-t-lg transition-all duration-700 hover:bg-[#A9882C] shadow-lg shadow-[#C9A84C]/15"
                                                                                    ></div>
                                                                                </div>
                                                                                <span className="text-[7px] sm:text-[9px] font-mono font-bold text-white/40 uppercase tracking-wider truncate max-w-full">
                                                                                    {formatBucketLabel(bar.ts)}
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between items-center text-[10px] font-bold text-white/45 uppercase tracking-wider">
                                                            <span>Période : {periodLabels[overviewFilter]}</span>
                                                            <span>Visiteurs uniques (total) : {(stats.totalVisitors || 0).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                    
                                    <div className="bg-[#111116] border border-white/5 rounded-[2.5rem] p-8 space-y-4">
                                        <h3 className="text-lg font-black uppercase tracking-wider text-white/70">Conseils de modération</h3>
                                        <p className="text-sm text-white/50 leading-relaxed">
                                            Cette console vous permet de garder le contrôle sur le contenu publié sur **Printacoté**. 
                                            Veillez à désactiver ou supprimer les profils vides ou inappropriés. Toutes les actions de suppression sont définitives dans la base de données.
                                        </p>
                                    </div>

                                    <div className="bg-[#111116] border border-white/5 rounded-[2.5rem] p-8 space-y-4">
                                        <h3 className="text-lg font-black uppercase tracking-wider text-white/70 font-bold">Actions de Maintenance</h3>
                                        <p className="text-sm text-white/50 leading-relaxed">
                                            Réinitialisez les compteurs de visites, les clics WhatsApp et l'historique du trafic réel du site.
                                        </p>
                                        <div className="pt-2">
                                            <button
                                                onClick={handleResetAllStatistics}
                                                disabled={actionLoading}
                                                className="px-5 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {actionLoading ? <Loader2 className="animate-spin" size={12} /> : <Trash2 size={12} />}
                                                Réinitialiser les statistiques
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: PRINTERS LIST */}
                            {activeTab === 'printers' && (
                                <div className="space-y-6">
                                    {/* Search Bar */}
                                    <div className="relative max-w-md w-full">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/30">
                                            <Search size={16} />
                                        </div>
                                        <input 
                                            type="text"
                                            placeholder="Rechercher par nom, ville ou e-mail..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-[#111116] border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-[#C9A84C]/40 text-white font-bold"
                                        />
                                    </div>

                                    {filteredPrinters.length === 0 ? (
                                        <div className="bg-[#111116] border border-white/5 rounded-[2.5rem] p-12 text-center text-white/40 font-bold">Aucun imprimeur trouvé.</div>
                                    ) : (
                                        <>
                                            {/* Tableau (desktop ≥ lg) */}
                                            <div className="hidden lg:block bg-[#111116] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left text-sm text-white/80 border-collapse">
                                                        <thead>
                                                            <tr className="bg-white/5 border-b border-white/5 text-[10px] font-black uppercase tracking-wider text-white/40">
                                                                <th className="p-6">Imprimerie</th>
                                                                <th className="p-6">Contact & Profil</th>
                                                                <th className="p-6">Localisation</th>
                                                                <th className="p-6">Statistiques</th>
                                                                <th className="p-6">Badge</th>
                                                                <th className="p-6 text-center">Visibilité</th>
                                                                <th className="p-6 text-right">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {filteredPrinters.map(p => (
                                                                <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                                                                    <td className="p-6">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 shrink-0">
                                                                                <img src={p.logo_url} alt="" className="w-full h-full object-cover" />
                                                                            </div>
                                                                            <div>
                                                                                <h4 className="font-bold text-white text-base flex items-center gap-2">{p.name}
                                                                                    {p.badge && <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${badgeClass(p.badge)}`}>{p.badge}</span>}
                                                                                </h4>
                                                                                <span className="text-[10px] text-white/30 block mt-0.5">Inscrit le {new Date(p.created_at).toLocaleDateString('fr-FR')}</span>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-6">
                                                                        <p className="font-semibold text-xs text-white/90 truncate max-w-[200px]">{p.email || <span className="text-white/30 italic">Email non renseigné</span>}</p>
                                                                        {p.whatsapp && (
                                                                            <a href={`https://wa.me/${(p.whatsapp || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#C9A84C] font-mono mt-1 inline-block hover:underline">WA: +{p.whatsapp}</a>
                                                                        )}
                                                                        {p.phone && (
                                                                            <a href={`tel:${p.phone}`} className="text-xs text-white/50 font-mono mt-0.5 block hover:text-white/80">Tél: {p.phone}</a>
                                                                        )}
                                                                        {!p.whatsapp && !p.phone && (
                                                                            <p className="text-[10px] text-white/25 italic mt-1">Aucun contact renseigné</p>
                                                                        )}
                                                                    </td>
                                                                    <td className="p-6 text-xs font-bold text-white/70">
                                                                        {[p.city, p.country].filter(Boolean).join(', ') || <span className="text-white/30 italic font-medium">Non défini</span>}
                                                                    </td>
                                                                    <td className="p-6 text-xs text-white/55 font-mono space-y-0.5">
                                                                        <p>{p.views || 0} vues</p>
                                                                        <p>{p.clicks || 0} clics WhatsApp</p>
                                                                    </td>
                                                                    <td className="p-6">
                                                                        <select
                                                                            value={p.badge || ''}
                                                                            onChange={(e) => handleSetBadge(p.id, e.target.value)}
                                                                            className="bg-white/5 border border-white/10 focus:border-[#C9A84C]/40 text-[11px] font-bold text-white rounded-xl px-3 py-2 focus:outline-none"
                                                                        >
                                                                            <option value="" className="bg-[#111116]">Aucun</option>
                                                                            {BADGE_OPTIONS.map(b => <option key={b} value={b} className="bg-[#111116]">{b}</option>)}
                                                                        </select>
                                                                    </td>
                                                                    <td className="p-6 text-center">
                                                                        <button
                                                                            onClick={() => handleToggleStatus(p.id, p.status)}
                                                                            className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all
                                                                                ${p.status === 'En ligne' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}
                                                                        >
                                                                            {p.status}
                                                                        </button>
                                                                    </td>
                                                                    <td className="p-6 text-right">
                                                                        <button onClick={() => handleDeletePrinter(p.id)} className="p-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl transition-all hover:scale-105 active:scale-95">
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            {/* Cartes (mobile/tablette < lg) */}
                                            <div className="lg:hidden space-y-4">
                                                {filteredPrinters.map(p => (
                                                    <div key={p.id} className="bg-[#111116] border border-white/5 rounded-[2rem] p-5 shadow-xl">
                                                        <div className="flex items-start gap-4">
                                                            <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 shrink-0">
                                                                <img src={p.logo_url} alt="" className="w-full h-full object-cover" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <h4 className="font-bold text-white text-base truncate">{p.name}</h4>
                                                                    {p.badge && <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${badgeClass(p.badge)}`}>{p.badge}</span>}
                                                                </div>
                                                                <span className="text-[10px] text-white/30 block mt-0.5">Inscrit le {new Date(p.created_at).toLocaleDateString('fr-FR')}</span>
                                                                <p className="text-xs text-white/60 mt-1 truncate">{p.email || 'Email non renseigné'}</p>
                                                            </div>
                                                            <button onClick={() => handleDeletePrinter(p.id)} className="p-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl transition-all shrink-0">
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                                                            <div className="bg-white/5 rounded-xl p-3">
                                                                <span className="text-[9px] uppercase tracking-wider text-white/30 font-black block">Localisation</span>
                                                                <span className="text-white/70 font-bold">{[p.city, p.country].filter(Boolean).join(', ') || 'Non défini'}</span>
                                                            </div>
                                                            <div className="bg-white/5 rounded-xl p-3">
                                                                <span className="text-[9px] uppercase tracking-wider text-white/30 font-black block">Activité</span>
                                                                <span className="text-white/70 font-bold font-mono">{p.views || 0} vues · {p.clicks || 0} clics</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-2 mt-3">
                                                            {p.whatsapp && <a href={`https://wa.me/${(p.whatsapp || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#C9A84C] font-mono bg-[#C9A84C]/10 px-3 py-1.5 rounded-lg">WA +{p.whatsapp}</a>}
                                                            {p.phone && <a href={`tel:${p.phone}`} className="text-[11px] text-white/60 font-mono bg-white/5 px-3 py-1.5 rounded-lg">Tél {p.phone}</a>}
                                                        </div>

                                                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                                                            <select
                                                                value={p.badge || ''}
                                                                onChange={(e) => handleSetBadge(p.id, e.target.value)}
                                                                className="flex-1 bg-white/5 border border-white/10 focus:border-[#C9A84C]/40 text-[11px] font-bold text-white rounded-xl px-3 py-2.5 focus:outline-none"
                                                            >
                                                                <option value="" className="bg-[#111116]">Badge : Aucun</option>
                                                                {BADGE_OPTIONS.map(b => <option key={b} value={b} className="bg-[#111116]">Badge : {b}</option>)}
                                                            </select>
                                                            <button
                                                                onClick={() => handleToggleStatus(p.id, p.status)}
                                                                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all shrink-0
                                                                    ${p.status === 'En ligne' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}
                                                            >
                                                                {p.status}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* TAB 3: SERVICES MODERATION */}
                            {activeTab === 'services' && (() => {
                                // Aplati tous les services réels (stockés en JSONB sur printers).
                                // Le « pays » d'un service = pays de son imprimerie (seul rattachement réel).
                                const allServices = printers.flatMap(p => (p.services || []).map(s => ({
                                    ...s,
                                    printerId: p.id,
                                    printerName: p.name,
                                    printerLogo: p.logo_url,
                                    printerCountry: p.country,
                                    printerCity: p.city,
                                    servicesList: p.services
                                })));
                                const printersWithServices = printers.filter(p => (p.services || []).length > 0);
                                const visibleServices = serviceFilter === 'all'
                                    ? allServices
                                    : allServices.filter(s => s.printerId === serviceFilter);

                                return (
                                    <div className="space-y-6">
                                        <div className="bg-[#111116] border border-white/5 rounded-[2.5rem] p-8 space-y-6">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <h3 className="text-lg font-black uppercase tracking-wider text-white/80">
                                                    Services publiés <span className="text-white/30">({visibleServices.length})</span>
                                                </h3>
                                                <select
                                                    value={serviceFilter}
                                                    onChange={(e) => setServiceFilter(e.target.value)}
                                                    className="bg-white/5 border border-white/5 focus:border-[#C9A84C]/40 text-sm font-bold text-white rounded-2xl px-4 py-2.5 focus:outline-none transition-colors max-w-full"
                                                >
                                                    <option value="all" className="bg-[#111116]">Toutes les imprimeries</option>
                                                    {printersWithServices.map(p => (
                                                        <option key={p.id} value={p.id} className="bg-[#111116]">{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {visibleServices.length === 0 ? (
                                                    <p className="text-white/40 font-bold">Aucun service publié pour le moment.</p>
                                                ) : (
                                                    visibleServices.map((s, index) => (
                                                        <div key={index} className="bg-white/5 border border-white/5 rounded-2xl p-6 flex flex-col justify-between space-y-4">
                                                            <div>
                                                                <div className="flex justify-between items-start gap-4">
                                                                        <h4 className="font-bold text-white text-base leading-tight">{s.name}</h4>
                                                                        {s.price && (
                                                                            <span className="text-xs bg-[#C9A84C]/20 text-[#C9A84C] font-black px-3 py-1 rounded-lg shrink-0">
                                                                                À partir de {Number(s.price).toLocaleString()} F
                                                                            </span>
                                                                        )}
                                                                </div>
                                                                {s.description && <p className="text-xs text-white/50 mt-2 leading-relaxed font-medium">{s.description}</p>}
                                                                {s.quantity && (
                                                                    <p className="text-[10px] text-white/40 mt-2 font-bold uppercase tracking-wider">Quantité / délai : <span className="text-white/70">{s.quantity}</span></p>
                                                                )}
                                                                {Array.isArray(s.parameters) && s.parameters.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                                                        {s.parameters.map((param, pi) => (
                                                                            <span key={pi} className="text-[9px] font-bold bg-white/5 border border-white/10 text-white/60 px-2 py-1 rounded-lg">
                                                                                {param.label} : <span className="text-[#C9A84C]">{param.value}</span>
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                    <div className="w-6 h-6 rounded-full overflow-hidden border border-white/10 shrink-0">
                                                                        <img src={s.printerLogo} alt="" className="w-full h-full object-cover" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <span className="text-[10px] font-black uppercase tracking-wider text-white/50 truncate block max-w-[150px]">{s.printerName}</span>
                                                                        <span className="text-[9px] font-bold text-white/30 truncate block max-w-[150px]">
                                                                            {[s.printerCity, s.printerCountry].filter(Boolean).join(', ') || 'Localisation non renseignée'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleDeleteService(s.printerId, s.servicesList, s.name)}
                                                                    className="p-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl transition-all shrink-0"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* TAB 4: PORTFOLIO IMAGES MODERATION */}
                            {activeTab === 'portfolio' && (
                                <div className="space-y-6">
                                    <div className="bg-[#111116] border border-white/5 rounded-[2.5rem] p-8 space-y-6">
                                        <h3 className="text-lg font-black uppercase tracking-wider text-white/80">Réalisations Portfolio</h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                                            {printers.flatMap(p => (p.portfolio || []).map(item => ({ originalItem: item, printerId: p.id, printerName: p.name, portfolioList: p.portfolio, printerCreatedAt: p.created_at }))).length === 0 ? (
                                                <p className="text-white/40 col-span-full font-bold">Aucune image publiée pour le moment.</p>
                                            ) : (
                                                printers.flatMap(p => (p.portfolio || []).map(item => ({ originalItem: item, printerId: p.id, printerName: p.name, portfolioList: p.portfolio, printerCreatedAt: p.created_at }))).map((item, index) => (
                                                    <div key={index} className="group relative bg-white/5 border border-white/5 rounded-2xl overflow-hidden aspect-square flex flex-col justify-end shadow-lg">
                                                        <img src={getPortfolioImageUrl(item.originalItem)} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-all duration-500" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none opacity-80 group-hover:opacity-95 transition-opacity"></div>
                                                        <div className="relative p-4 flex justify-between items-end z-10 w-full">
                                                            <div className="flex-1 min-w-0">
                                                                <span className="text-[10px] font-black uppercase tracking-wider text-white/80 truncate block">{item.printerName}</span>
                                                                <span className="text-[8px] font-mono text-white/40 block mt-0.5">
                                                                    le {formatDate(getPortfolioDate(item.originalItem, item.printerCreatedAt))}
                                                                </span>
                                                            </div>
                                                            <button 
                                                                onClick={() => handleDeletePortfolio(item.printerId, item.portfolioList, getPortfolioImageUrl(item.originalItem))}
                                                                className="p-2 bg-red-500 text-white rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md shrink-0 ml-2"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}


                            {/* TAB 5: MARKETPLACE PRODUCTS */}
                            {activeTab === 'marketplace' && (
                                <div className="space-y-6">
                                    <div className="bg-[#111116] border border-white/5 rounded-[2.5rem] p-8 space-y-6">
                                        <h3 className="text-lg font-black uppercase tracking-wider text-white/80">Offres Marketplace</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {products.length === 0 ? (
                                                <p className="text-white/40 col-span-full font-bold">Aucun produit publié sur la boutique.</p>
                                            ) : (
                                                products.map(p => (
                                                    <div key={p.id} className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden flex flex-col justify-between">
                                                        <div className="aspect-video w-full bg-black/20 relative">
                                                            {p.images && p.images[0] ? (
                                                                <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-white/20"><Store size={32} /></div>
                                                            )}
                                                            <div className={`absolute top-4 left-4 px-2.5 py-1 rounded-xl text-[9px] font-black shadow-lg uppercase tracking-wider
                                                                ${p.status === 'En ligne'
                                                                    ? 'bg-green-500 text-white shadow-green-500/10'
                                                                    : p.status === 'Suspendu'
                                                                        ? 'bg-amber-500 text-[#0F0F13] shadow-amber-500/10'
                                                                        : 'bg-red-500 text-white shadow-red-500/10'}`}>
                                                                {p.status === 'En ligne' ? 'En ligne' : p.status === 'Suspendu' ? 'Suspendu' : 'Désactivé'}
                                                            </div>
                                                            {p.options?.is_featured && (
                                                                <div className="absolute top-4 right-4 bg-gradient-to-r from-[#C9A84C] to-[#E6C675] text-[#0F0F13] px-2.5 py-1 rounded-xl text-[9px] font-black shadow-lg flex items-center gap-1 shadow-[#C9A84C]/10">
                                                                    <Sparkles size={8} className="animate-pulse" />
                                                                    Sponsorisé
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="p-6 space-y-4">
                                                            <div>
                                                                <h4 className="font-bold text-white text-base leading-tight">{p.name}</h4>
                                                                <p className="text-xs text-white/45 mt-1.5 font-semibold">Publié par : <span className="font-bold text-white/70">{p.printers?.name || 'Inconnu'}</span></p>
                                                                <p className="text-[9px] font-mono text-white/30 mt-0.5">
                                                                    le {formatDate(p.created_at || p.printers?.created_at)}
                                                                </p>
                                                                {p.status === 'Suspendu' && p.suspended_until && (
                                                                    <p className="text-[9px] font-bold text-amber-400/80 mt-1.5 flex items-center gap-1">
                                                                        <Clock size={10} /> Réactivation le {formatDate(p.suspended_until)}
                                                                    </p>
                                                                )}
                                                                {p.description && (
                                                                    <p className="text-[11px] text-white/45 mt-2 leading-relaxed line-clamp-2">{p.description}</p>
                                                                )}
                                                                <div className="flex flex-wrap gap-1.5 mt-3">
                                                                    {p.options?.category && (
                                                                        <span className="text-[9px] font-bold bg-white/5 border border-white/10 text-white/60 px-2 py-1 rounded-lg">{p.options.category}</span>
                                                                    )}
                                                                    {p.options?.quantity && (
                                                                        <span className="text-[9px] font-bold bg-white/5 border border-white/10 text-white/60 px-2 py-1 rounded-lg">{p.options.quantity}</span>
                                                                    )}
                                                                    {p.options?.format && p.options.format !== 'Standard' && (
                                                                        <span className="text-[9px] font-bold bg-white/5 border border-white/10 text-white/60 px-2 py-1 rounded-lg">{p.options.format}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                                                <div className="flex flex-col">
                                                                    {p.promo_price ? (
                                                                        <>
                                                                            <span className="text-sm font-black text-[#C9A84C]">{Number(p.promo_price).toLocaleString()} FCFA</span>
                                                                            <span className="text-[10px] font-bold text-white/30 line-through">{Number(p.price).toLocaleString()} FCFA{p.discount ? ` · -${p.discount}%` : ''}</span>
                                                                        </>
                                                                    ) : (
                                                                        <span className="text-sm font-black text-[#C9A84C]">{Number(p.price).toLocaleString()} FCFA</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex gap-2 flex-wrap justify-end">
                                                                    <button
                                                                        onClick={() => handleToggleSponsorProduct(p)}
                                                                        title={p.options?.is_featured ? "Retirer la sponsorisation" : "Sponsoriser le produit"}
                                                                        className={`p-2.5 rounded-xl transition-all border ${p.options?.is_featured ? 'bg-[#C9A84C]/20 text-[#C9A84C] border-[#C9A84C]/35' : 'bg-white/5 text-white/40 border-white/5 hover:text-white'}`}
                                                                    >
                                                                        <Star size={14} fill={p.options?.is_featured ? "#C9A84C" : "none"} />
                                                                    </button>
                                                                    {p.status === 'Suspendu' ? (
                                                                        <button
                                                                            onClick={() => handleReactivateProduct(p.id)}
                                                                            title="Lever la suspension (remettre en ligne)"
                                                                            className="p-2.5 rounded-xl transition-all border bg-green-500/10 text-green-400 border-green-500/15 hover:bg-green-500/20"
                                                                        >
                                                                            <PlayCircle size={14} />
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => { setSuspendDays('7'); setSuspendModalProduct(p); }}
                                                                            title="Suspendre le produit pour une durée"
                                                                            className="p-2.5 rounded-xl transition-all border bg-amber-500/10 text-amber-400 border-amber-500/15 hover:bg-amber-500/20"
                                                                        >
                                                                            <PauseCircle size={14} />
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => handleToggleProductStatus(p.id, p.status)}
                                                                        title={p.status === 'En ligne' ? "Désactiver le produit" : "Activer le produit"}
                                                                        className={`p-2.5 rounded-xl transition-all border ${p.status === 'En ligne' ? 'bg-green-500/10 text-green-400 border-green-500/15' : 'bg-red-500/10 text-red-400 border-red-500/15'}`}
                                                                    >
                                                                        {p.status === 'En ligne' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleOpenEditProduct(p)}
                                                                        title="Modifier le produit"
                                                                        className="p-2.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-xl transition-all border border-blue-500/15"
                                                                    >
                                                                        <Pencil size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteProduct(p.id)}
                                                                        title="Supprimer le produit"
                                                                        className="p-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl transition-all border border-red-500/15"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}


                            {/* TAB 6: SUPPORT MESSAGING & CHAT */}
                            {activeTab === 'support' && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8 h-[calc(100vh-180px)] lg:h-[calc(100vh-200px)]">

                                    {/* Printers List Side panel (masqué sur mobile quand un chat est ouvert) */}
                                    <div className={`bg-[#111116] border border-white/5 rounded-[2rem] overflow-hidden flex-col h-full ${selectedPrinterId ? 'hidden lg:flex' : 'flex'}`}>
                                        <div className="p-5 border-b border-white/5 flex items-center justify-between gap-2">
                                            <span className="text-[10px] font-black uppercase text-white/40 tracking-wider">Imprimeurs</span>
                                            <button
                                                onClick={() => { setSelectedBulkPrinters([]); setShowBulkModal(true); }}
                                                className="px-3.5 py-2 bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/20 rounded-xl hover:bg-[#C9A84C]/20 active:scale-95 transition-all text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0"
                                            >
                                                <Users2 size={12} /> Diffusion
                                            </button>
                                        </div>
                                        <div className="p-3 border-b border-white/5">
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/30"><Search size={14} /></div>
                                                <input
                                                    type="text"
                                                    placeholder="Rechercher un imprimeur…"
                                                    value={messageSearch}
                                                    onChange={(e) => setMessageSearch(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/5 rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:border-[#C9A84C]/40 text-white font-bold"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
                                            {conversationList.length === 0 ? (
                                                <p className="p-8 text-center text-xs text-white/30 font-bold">Aucun imprimeur trouvé.</p>
                                            ) : (
                                                conversationList.map(item => (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => setSelectedPrinterId(item.id)}
                                                        className={`w-full p-4 flex items-center gap-3.5 text-left transition-colors relative
                                                            ${selectedPrinterId === item.id ? 'bg-white/5' : 'hover:bg-white/[0.02]'}`}
                                                    >
                                                        <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden shrink-0">
                                                            <img src={item.logo} alt="" className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-bold text-sm text-white truncate">{item.name}</h4>
                                                            <p className="text-[10px] text-white/40 mt-0.5 truncate">
                                                                {item.hasMessages ? item.lastContent : <span className="italic text-white/25">Aucun message — cliquez pour écrire</span>}
                                                            </p>
                                                        </div>
                                                        {item.unread > 0 && (
                                                            <span className="bg-red-500 text-white font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                                                                {item.unread}
                                                            </span>
                                                        )}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Chat Dialog Panel */}
                                    <div className={`lg:col-span-2 bg-[#111116] border border-white/5 rounded-[2rem] flex-col h-full overflow-hidden relative ${selectedPrinterId ? 'flex' : 'hidden lg:flex'}`}>
                                        {selectedPrinterId ? (
                                            <>
                                                {/* Active chat header */}
                                                <div className="p-5 border-b border-white/5 bg-white/2 flex items-center gap-3">
                                                    <button onClick={() => setSelectedPrinterId(null)} className="lg:hidden p-2 -ml-2 text-white/60 hover:text-white shrink-0">
                                                        <ArrowLeft size={20} />
                                                    </button>
                                                    <div className="w-9 h-9 rounded-full border border-white/10 overflow-hidden shrink-0">
                                                        <img src={selectedPrinter?.logo_url} alt="" className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="font-bold text-white text-base truncate">{selectedPrinter?.name}</h3>
                                                        <p className="text-[10px] text-white/45 mt-0.5 font-bold tracking-wider truncate">{selectedPrinter?.email}</p>
                                                    </div>
                                                </div>

                                                {/* Messages Thread list */}
                                                <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 flex flex-col-reverse custom-scrollbar">
                                                    {(messagesByPrinter[selectedPrinterId] || []).length === 0 ? (
                                                        <div className="flex-1 flex flex-col items-center justify-center text-center text-white/30 py-10">
                                                            <Mail size={32} className="mb-3 opacity-50" />
                                                            <p className="text-xs font-bold">Aucun message pour le moment.</p>
                                                            <p className="text-[11px] text-white/25 mt-1">Écrivez ci-dessous pour démarrer la conversation.</p>
                                                        </div>
                                                    ) : (messagesByPrinter[selectedPrinterId] || []).map((msg) => {
                                                        const isAdmin = msg.direction === 'admin_to_printer';
                                                        return (
                                                            <div key={msg.id} className={`max-w-[85%] sm:max-w-[80%] flex flex-col ${isAdmin ? 'self-end items-end' : 'self-start items-start'}`}>
                                                                <div className={`p-4 rounded-3xl text-sm leading-relaxed ${isAdmin ? 'bg-[#C9A84C] text-[#0F0F13] rounded-tr-none font-bold shadow-md shadow-[#C9A84C]/5' : 'bg-white/5 text-white rounded-tl-none border border-white/5 font-medium'}`}>
                                                                    {!isAdmin && (
                                                                        <span className="block text-[8px] font-black uppercase tracking-widest text-[#C9A84C] mb-1.5">{msg.subject || "Demande de support"}</span>
                                                                    )}
                                                                    <p className="whitespace-pre-wrap break-words">{truncateMessage(msg.content)}</p>
                                                                    {msg.content.length > 150 && (
                                                                        <button type="button" onClick={() => setSelectedFullMessage(msg)} className={`mt-2 text-[10px] font-black uppercase tracking-wider hover:underline block ${isAdmin ? 'text-[#0F0F13]/70' : 'text-[#C9A84C]'}`}>Voir plus</button>
                                                                    )}
                                                                </div>
                                                                <span className="text-[9px] font-mono text-white/30 mt-1.5">
                                                                    {new Date(msg.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Send Reply box */}
                                                <form onSubmit={handleSendMessage} className="p-3 sm:p-5 border-t border-white/5 bg-white/2 flex gap-2 sm:gap-4">
                                                    <input
                                                        type="text"
                                                        placeholder="Votre message…"
                                                        value={replyContent}
                                                        onChange={(e) => setReplyContent(e.target.value)}
                                                        className="flex-1 bg-white/5 border border-white/5 focus:border-[#C9A84C]/40 text-sm font-bold text-white rounded-2xl px-4 sm:px-6 py-3.5 sm:py-4 focus:outline-none transition-colors min-w-0"
                                                    />
                                                    <button type="submit" disabled={!replyContent.trim()} className="px-5 sm:px-6 bg-[#C9A84C] text-[#0F0F13] rounded-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center shrink-0 shadow-lg shadow-[#C9A84C]/10 disabled:opacity-40 disabled:pointer-events-none">
                                                        <Send size={18} />
                                                    </button>
                                                </form>
                                            </>
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                                                <Mail size={40} className="text-white/20 mb-4" />
                                                <h4 className="font-bold text-lg text-white/40">Aucune discussion sélectionnée</h4>
                                                <p className="text-xs text-white/30 max-w-sm mt-2 leading-relaxed">
                                                    Sélectionnez un imprimeur à gauche pour voir l'historique ou lui envoyer un message — même s'il n'a jamais écrit.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* TAB: NEWS / BLOG */}
                            {activeTab === 'news' && (
                                <div className="space-y-6">
                                    {/* Sous-onglets + bouton nouvel article */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 w-full sm:w-auto">
                                            <button onClick={() => setNewsSubTab('articles')} className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex-1 sm:flex-none ${newsSubTab === 'articles' ? 'bg-[#C9A84C] text-[#0F0F13]' : 'text-white/50 hover:text-white'}`}>
                                                Articles ({newsList.length})
                                            </button>
                                            <button onClick={() => setNewsSubTab('comments')} className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex-1 sm:flex-none ${newsSubTab === 'comments' ? 'bg-[#C9A84C] text-[#0F0F13]' : 'text-white/50 hover:text-white'}`}>
                                                Commentaires ({commentsList.length})
                                            </button>
                                        </div>
                                        {newsSubTab === 'articles' && (
                                            <button onClick={() => handleOpenNewsEditor(null)} className="px-5 py-3 bg-[#C9A84C] text-[#0F0F13] rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-[#C9A84C]/10">
                                                <Plus size={16} /> Nouvel article
                                            </button>
                                        )}
                                    </div>

                                    {/* Liste des articles */}
                                    {newsSubTab === 'articles' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {newsList.length === 0 ? (
                                                <p className="text-white/40 col-span-full font-bold py-10 text-center">Aucun article. Cliquez sur « Nouvel article » pour commencer.</p>
                                            ) : newsList.map(a => (
                                                <div key={a.id} className="bg-[#111116] border border-white/5 rounded-[2rem] overflow-hidden flex flex-col">
                                                    <div className="aspect-video bg-black/30 relative">
                                                        {a.image_url ? <img src={a.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/20"><Newspaper size={32} /></div>}
                                                        <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${a.published ? 'bg-green-500 text-white' : 'bg-white/20 text-white backdrop-blur-md'}`}>
                                                            {a.published ? 'Publié' : 'Brouillon'}
                                                        </div>
                                                    </div>
                                                    <div className="p-5 flex flex-col flex-1">
                                                        <h4 className="font-bold text-white text-base leading-tight line-clamp-2">{a.title}</h4>
                                                        <p className="text-xs text-white/40 mt-1.5 line-clamp-2 flex-1">{a.excerpt}</p>
                                                        <p className="text-[9px] font-mono text-white/30 mt-3">{new Date(a.created_at).toLocaleDateString('fr-FR')} · {a.views || 0} vues</p>
                                                        <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                                                            <button onClick={() => handleOpenNewsEditor(a)} className="flex-1 py-2.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"><Pencil size={13} /> Modifier</button>
                                                            <button onClick={() => handleDeleteNews(a.id)} className="px-3.5 py-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl transition-all"><Trash2 size={14} /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Liste des commentaires reçus */}
                                    {newsSubTab === 'comments' && (
                                        <div className="bg-[#111116] border border-white/5 rounded-[2.5rem] p-6 sm:p-8 space-y-4">
                                            {commentsList.length === 0 ? (
                                                <p className="text-white/40 font-bold py-10 text-center">Aucun commentaire pour le moment.</p>
                                            ) : commentsList.map(c => (
                                                <div key={c.id} className="bg-white/5 border border-white/5 rounded-2xl p-5 flex items-start justify-between gap-4">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-bold text-white text-sm">{c.author_name}</span>
                                                            <span className="text-[10px] text-white/30 font-mono">{new Date(c.created_at).toLocaleDateString('fr-FR')} {new Date(c.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                        <p className="text-[10px] font-black uppercase tracking-wider text-[#C9A84C] mt-1 truncate">sur : {c.news_title || 'Article supprimé'}</p>
                                                        <p className="text-sm text-white/70 mt-2 leading-relaxed break-words">{c.content}</p>
                                                    </div>
                                                    <button onClick={() => handleDeleteComment(c.id)} className="p-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl transition-all shrink-0"><Trash2 size={14} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 7: ADVERTISING BANNER SETTINGS */}
                            {activeTab === 'advertising' && (
                                <div className="bg-[#111116] border border-white/5 rounded-[2.5rem] p-8 md:p-10 space-y-8 shadow-2xl">
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-wider text-white/80">Régie Publicitaire</h3>
                                        <p className="text-xs text-white/40 mt-1">Gérez l'affiche publicitaire affichée sur la page d'accueil et d'autres sections de la plateforme.</p>
                                    </div>
                                    
                                    <form onSubmit={handleSaveBannerSettings} className="space-y-6">
                                        {/* Status Switch */}
                                        <div className="bg-white/2 border border-white/5 rounded-2xl p-6 flex justify-between items-center">
                                            <div>
                                                <h4 className="font-bold text-white text-sm">Activer la bannière publicitaire</h4>
                                                <p className="text-xs text-white/40 mt-0.5">Si activé, votre affiche remplacera le call-to-action par défaut sur le site public.</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={bannerSettings.is_active}
                                                    onChange={(e) => setBannerSettings(prev => ({ ...prev, is_active: e.target.checked }))}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C9A84C]"></div>
                                            </label>
                                        </div>

                                        {/* Durée d'activation automatique */}
                                        <div className="bg-white/2 border border-white/5 rounded-2xl p-6 space-y-4">
                                            <div>
                                                <h4 className="font-bold text-white text-sm">Durée d'activation</h4>
                                                <p className="text-xs text-white/40 mt-0.5">La bannière se désactive automatiquement à la fin de la durée choisie.</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    { label: 'Illimitée', days: null },
                                                    { label: '24 heures', days: 1 },
                                                    { label: '7 jours', days: 7 },
                                                    { label: '30 jours', days: 30 },
                                                ].map(opt => {
                                                    const target = opt.days ? new Date(Date.now() + opt.days * 86400000) : null;
                                                    const isActive = opt.days === null ? !bannerSettings.active_until : false;
                                                    return (
                                                        <button key={opt.label} type="button"
                                                            onClick={() => setBannerSettings(prev => ({ ...prev, active_until: target ? target.toISOString() : '' }))}
                                                            className={`px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all ${isActive ? 'bg-[#C9A84C] text-[#0F0F13] border-[#C9A84C]' : 'bg-white/5 text-white/50 border-white/10 hover:text-white'}`}>
                                                            {opt.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Ou jusqu'au :</span>
                                                <input type="datetime-local"
                                                    value={bannerSettings.active_until ? new Date(bannerSettings.active_until).toISOString().slice(0, 16) : ''}
                                                    onChange={(e) => setBannerSettings(prev => ({ ...prev, active_until: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
                                                    className="bg-white/5 border border-white/10 focus:border-[#C9A84C]/40 text-sm font-bold text-white rounded-xl px-4 py-2.5 focus:outline-none" />
                                            </div>
                                            {bannerSettings.active_until && (
                                                <p className="text-[11px] font-bold text-[#C9A84C]">
                                                    Désactivation prévue le {new Date(bannerSettings.active_until).toLocaleString('fr-FR')}
                                                </p>
                                            )}
                                        </div>

                                        {/* Type de média : image ou vidéo */}
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2 mb-2 block">Type de média</label>
                                            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 w-full sm:w-fit">
                                                {[{ id: 'image', label: 'Image' }, { id: 'video', label: 'Vidéo' }].map(m => (
                                                    <button key={m.id} type="button"
                                                        onClick={() => setBannerSettings(prev => ({ ...prev, media_type: m.id }))}
                                                        className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex-1 sm:flex-none ${bannerSettings.media_type === m.id ? 'bg-[#C9A84C] text-[#0F0F13]' : 'text-white/50 hover:text-white'}`}>
                                                        {m.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Zone vidéo (lien ou upload) */}
                                        {bannerSettings.media_type === 'video' && (
                                            <div className="space-y-3 bg-white/2 border border-white/5 rounded-2xl p-6">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block">Vidéo : lien YouTube / Vimeo / .mp4</label>
                                                <input type="url" placeholder="https://youtube.com/watch?v=… ou https://…/video.mp4"
                                                    value={bannerSettings.video_url || ''}
                                                    onChange={(e) => setBannerSettings(prev => ({ ...prev, video_url: e.target.value }))}
                                                    className="w-full bg-white/5 border border-white/10 focus:border-[#C9A84C]/40 text-sm font-bold text-white rounded-2xl px-5 py-3.5 focus:outline-none" />
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/30">ou</span>
                                                    <label className="px-5 py-2.5 bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/20 rounded-xl text-[11px] font-black uppercase tracking-wider cursor-pointer hover:bg-[#C9A84C]/20 transition-all flex items-center gap-2">
                                                        {bannerVideoUploading ? <Loader2 size={14} className="animate-spin" /> : <Video size={14} />} Importer une vidéo
                                                        <input type="file" accept="video/*" className="hidden" onChange={handleBannerVideoUpload} />
                                                    </label>
                                                </div>
                                                {bannerSettings.video_url && (
                                                    <p className="text-[11px] text-green-400 font-bold truncate">Vidéo définie : {bannerSettings.video_url.slice(0, 60)}…</p>
                                                )}
                                            </div>
                                        )}

                                        {/* Redirect Link Input */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Lien de redirection (Clic sur la bannière)</label>
                                            <input 
                                                type="url"
                                                placeholder="https://wa.me/221... ou lien externe"
                                                value={bannerSettings.link_url || ''}
                                                onChange={(e) => setBannerSettings(prev => ({ ...prev, link_url: e.target.value }))}
                                                className="w-full bg-white/5 border border-white/5 focus:border-[#C9A84C]/40 text-sm font-bold text-white rounded-2xl px-6 py-4 focus:outline-none transition-colors"
                                            />
                                        </div>

                                        {/* Social Links Inputs */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Lien Facebook (Facultatif)</label>
                                                <input 
                                                    type="url"
                                                    placeholder="https://facebook.com/..."
                                                    value={bannerSettings.facebook_url || ''}
                                                    onChange={(e) => setBannerSettings(prev => ({ ...prev, facebook_url: e.target.value }))}
                                                    className="w-full bg-white/5 border border-white/5 focus:border-[#C9A84C]/40 text-sm font-bold text-white rounded-2xl px-6 py-4 focus:outline-none transition-colors"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C] ml-2">Lien Instagram (Facultatif)</label>
                                                <input 
                                                    type="url"
                                                    placeholder="https://instagram.com/..."
                                                    value={bannerSettings.instagram_url || ''}
                                                    onChange={(e) => setBannerSettings(prev => ({ ...prev, instagram_url: e.target.value }))}
                                                    className="w-full bg-white/5 border border-white/5 focus:border-[#C9A84C]/40 text-sm font-bold text-white rounded-2xl px-6 py-4 focus:outline-none transition-colors"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Lien TikTok (Facultatif)</label>
                                                <input 
                                                    type="url"
                                                    placeholder="https://tiktok.com/@..."
                                                    value={bannerSettings.tiktok_url || ''}
                                                    onChange={(e) => setBannerSettings(prev => ({ ...prev, tiktok_url: e.target.value }))}
                                                    className="w-full bg-white/5 border border-white/5 focus:border-[#C9A84C]/40 text-sm font-bold text-white rounded-2xl px-6 py-4 focus:outline-none transition-colors"
                                                />
                                            </div>
                                        </div>

                                        {/* Image Upload Area (uniquement si média = image) */}
                                        {bannerSettings.media_type !== 'video' && (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Affiche publicitaire (Format 16/7 recommandé, max 5 Mo)</label>
                                            <div className="flex flex-col md:flex-row gap-6 items-start">
                                                {bannerSettings.image_url ? (
                                                    <div className="relative w-full md:w-[480px] aspect-[16/6] bg-black/40 rounded-[2rem] overflow-hidden border border-white/10 group shadow-lg">
                                                        <img src={bannerSettings.image_url} alt="Affiche" className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                            <label className="p-3 bg-[#C9A84C] text-[#0F0F13] rounded-full hover:scale-105 transition-all cursor-pointer">
                                                                <ImageIcon size={20} />
                                                                <input 
                                                                    type="file" 
                                                                    accept="image/*" 
                                                                    className="hidden" 
                                                                    onChange={handleBannerImageUpload} 
                                                                />
                                                            </label>
                                                            <button 
                                                                type="button"
                                                                onClick={() => setBannerSettings(prev => ({ ...prev, image_url: '' }))}
                                                                className="p-3 bg-red-500 text-white rounded-full hover:scale-105 transition-all"
                                                            >
                                                                <Trash2 size={20} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <label className="flex flex-col items-center justify-center w-full md:w-[480px] aspect-[16/6] border-2 border-dashed border-white/10 rounded-[2rem] cursor-pointer hover:bg-white/5 hover:border-[#C9A84C]/35 transition-all p-6 group">
                                                        {bannerUploading ? (
                                                            <div className="flex flex-col items-center gap-3">
                                                                <Loader2 size={32} className="animate-spin text-[#C9A84C]" />
                                                                <p className="text-xs text-white/40">Importation de l'affiche...</p>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center text-center">
                                                                <ImageIcon size={32} className="text-white/20 group-hover:text-[#C9A84C] group-hover:scale-110 transition-all mb-2" />
                                                                <p className="text-xs text-white/45 font-bold group-hover:text-white">Importer l'affiche publicitaire</p>
                                                                <p className="text-[10px] text-white/25 mt-1 font-mono">JPG, PNG ou WebP</p>
                                                            </div>
                                                        )}
                                                        <input 
                                                            type="file" 
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={handleBannerImageUpload}
                                                            disabled={bannerUploading}
                                                        />
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                        )}

                                        <div className="flex justify-end pt-4">
                                            <button
                                                type="submit"
                                                className="px-8 py-4 bg-[#C9A84C] text-[#0F0F13] rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.03] active:scale-95 transition-all shadow-xl shadow-[#C9A84C]/25"
                                            >
                                                Enregistrer les modifications
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* TAB 8: PRICING & SUBSCRIPTIONS */}
                            {activeTab === 'pricing' && (
                                <div className="space-y-10">
                                    <div className="bg-[#111116] border border-white/5 rounded-[2.5rem] p-8 md:p-10 space-y-8 shadow-2xl">
                                        <div>
                                            <h3 className="text-xl font-black uppercase tracking-wider text-white/80">Configuration des Tarifs & Abonnements</h3>
                                            <p className="text-xs text-white/40 mt-1">Configurez les formules d'abonnements visibles par les imprimeurs, modifiez leurs prix, caractéristiques et liens de paiement direct.</p>
                                        </div>

                                        <form onSubmit={handleSavePricingPlans} className="space-y-8">
                                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                                {pricingPlans.map((plan, index) => (
                                                    <div key={plan.id} className="bg-white/2 border border-white/5 rounded-[2rem] p-6 space-y-6 relative">
                                                        {plan.badge && (
                                                            <span className="absolute -top-3 left-6 px-3 py-1 bg-[#C9A84C] text-[#0F0F13] rounded-full text-[9px] font-black uppercase tracking-wider">
                                                                {plan.badge}
                                                            </span>
                                                        )}
                                                        <div>
                                                            <span className="text-[9px] font-black uppercase tracking-wider text-white/30 block mb-1">Formule ID : {plan.id}</span>
                                                            <h4 className="font-bold text-white text-base">Plan {plan.label}</h4>
                                                        </div>

                                                        <div className="space-y-4 font-sans">
                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] font-black uppercase tracking-wider text-white/40 ml-2">Nom de la formule</label>
                                                                <input
                                                                    type="text"
                                                                    required
                                                                    value={plan.label}
                                                                    onChange={(e) => {
                                                                        const updated = [...pricingPlans];
                                                                        updated[index].label = e.target.value;
                                                                        setPricingPlans(updated);
                                                                    }}
                                                                    className="w-full bg-[#111116] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#C9A84C]/45"
                                                                />
                                                            </div>

                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] font-black uppercase tracking-wider text-white/40 ml-2">Montant (FCFA)</label>
                                                                <input
                                                                    type="number"
                                                                    required
                                                                    value={plan.amount}
                                                                    onChange={(e) => {
                                                                        const updated = [...pricingPlans];
                                                                        updated[index].amount = Number(e.target.value);
                                                                        setPricingPlans(updated);
                                                                    }}
                                                                    className="w-full bg-[#111116] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#C9A84C]/45"
                                                                />
                                                            </div>

                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] font-black uppercase tracking-wider text-white/40 ml-2">Durée (Mois)</label>
                                                                <input
                                                                    type="number"
                                                                    required
                                                                    value={plan.months}
                                                                    onChange={(e) => {
                                                                        const updated = [...pricingPlans];
                                                                        updated[index].months = Number(e.target.value);
                                                                        setPricingPlans(updated);
                                                                    }}
                                                                    className="w-full bg-[#111116] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#C9A84C]/45"
                                                                />
                                                            </div>

                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] font-black uppercase tracking-wider text-white/40 ml-2">Cadence de facturation</label>
                                                                <input
                                                                    type="text"
                                                                    required
                                                                    value={plan.cadence}
                                                                    onChange={(e) => {
                                                                        const updated = [...pricingPlans];
                                                                        updated[index].cadence = e.target.value;
                                                                        setPricingPlans(updated);
                                                                    }}
                                                                    className="w-full bg-[#111116] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#C9A84C]/45"
                                                                />
                                                            </div>

                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] font-black uppercase tracking-wider text-[#C9A84C] ml-2">Badge (Facultatif)</label>
                                                                <input
                                                                    type="text"
                                                                    value={plan.badge || ''}
                                                                    onChange={(e) => {
                                                                        const updated = [...pricingPlans];
                                                                        updated[index].badge = e.target.value;
                                                                        setPricingPlans(updated);
                                                                    }}
                                                                    placeholder="Ex: Populaire, Recommandé"
                                                                    className="w-full bg-[#111116] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#C9A84C]/45"
                                                                />
                                                            </div>

                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] font-black uppercase tracking-wider text-white/40 ml-2">Lien de paiement Wave / Stripe / Orange Money</label>
                                                                <input
                                                                    type="url"
                                                                    value={plan.link || ''}
                                                                    onChange={(e) => {
                                                                        const updated = [...pricingPlans];
                                                                        updated[index].link = e.target.value;
                                                                        setPricingPlans(updated);
                                                                    }}
                                                                    placeholder="https://wave.com/pay/... ou lien Stripe"
                                                                    className="w-full bg-[#111116] border border-white/10 focus:border-[#C9A84C]/45 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none"
                                                                />
                                                            </div>

                                                            <div className="space-y-2">
                                                                <label className="text-[9px] font-black uppercase tracking-wider text-white/40 ml-2 block">Caractéristiques</label>
                                                                <div className="space-y-2">
                                                                    {(plan.features || []).map((feat, fIdx) => (
                                                                        <div key={fIdx} className="flex items-center gap-2">
                                                                            <input
                                                                                type="text"
                                                                                required
                                                                                value={feat}
                                                                                onChange={(e) => {
                                                                                    const updated = [...pricingPlans];
                                                                                    updated[index].features[fIdx] = e.target.value;
                                                                                    setPricingPlans(updated);
                                                                                }}
                                                                                className="flex-1 bg-[#111116] border border-white/10 rounded-xl px-3 py-1.5 text-[11px] font-medium text-white focus:outline-none focus:border-[#C9A84C]/45"
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const updated = [...pricingPlans];
                                                                                    updated[index].features.splice(fIdx, 1);
                                                                                    setPricingPlans(updated);
                                                                                }}
                                                                                className="p-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 hover:scale-105 transition-all"
                                                                            >
                                                                                <Trash2 size={12} />
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const updated = [...pricingPlans];
                                                                            if (!updated[index].features) updated[index].features = [];
                                                                            updated[index].features.push('Nouvelle caractéristique');
                                                                            setPricingPlans(updated);
                                                                        }}
                                                                        className="w-full py-2 bg-white/5 border border-dashed border-white/10 hover:border-white/20 rounded-xl text-[10px] font-black uppercase tracking-wider text-white/50 hover:text-white"
                                                                    >
                                                                        Ajouter une caractéristique
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex justify-end pt-4">
                                                <button
                                                    type="submit"
                                                    disabled={loadingPricing}
                                                    className="px-8 py-4 bg-[#C9A84C] text-[#0F0F13] rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.03] active:scale-95 transition-all shadow-xl shadow-[#C9A84C]/25 flex items-center gap-2"
                                                >
                                                    {loadingPricing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                                    Enregistrer les Tarifs
                                                </button>
                                            </div>
                                        </form>
                                    </div>

                                    {/* Imprimateurs subscriptions list */}
                                    <div className="bg-[#111116] border border-white/5 rounded-[2.5rem] p-8 md:p-10 space-y-6 shadow-2xl">
                                        <div>
                                            <h3 className="text-xl font-black uppercase tracking-wider text-white/80">Abonnements des Imprimeurs</h3>
                                            <p className="text-xs text-white/40 mt-1">Gerez manuellement le statut d'abonnement, les dates de fin d'essai et d'accès des ateliers de la plateforme.</p>
                                        </div>

                                        {/* Search Input */}
                                        <div className="relative max-w-md w-full">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/30">
                                                <Search size={16} />
                                            </div>
                                            <input 
                                                type="text"
                                                placeholder="Rechercher par nom, ville ou e-mail..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full bg-[#111116] border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-[#C9A84C]/40 text-white font-bold"
                                            />
                                        </div>

                                        {filteredPrinters.length === 0 ? (
                                            <p className="text-xs text-white/45 font-bold text-center py-6">Aucun imprimeur trouvé.</p>
                                        ) : (
                                            <div className="overflow-x-auto rounded-2xl border border-white/5">
                                                <table className="w-full text-left text-sm text-white/85 border-collapse">
                                                    <thead>
                                                        <tr className="bg-white/5 border-b border-white/5 text-[10px] font-black uppercase tracking-wider text-white/40">
                                                            <th className="p-4">Imprimerie</th>
                                                            <th className="p-4">Statut</th>
                                                            <th className="p-4">Formule</th>
                                                            <th className="p-4">Fin de l'essai</th>
                                                            <th className="p-4">Fin d'abonnement</th>
                                                            <th className="p-4 text-right">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredPrinters.map(p => {
                                                            const isSubActive = p.subscription_ends_at && new Date(p.subscription_ends_at) > new Date();
                                                            const isTrialActive = p.trial_ends_at && new Date(p.trial_ends_at) > new Date();
                                                            let statusBadge = (
                                                                <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase border border-red-500/20 bg-red-500/10 text-red-400">
                                                                    Expiré
                                                                </span>
                                                            );
                                                            if (p.subscription_status === 'active' || isSubActive) {
                                                                statusBadge = (
                                                                    <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase border border-green-500/20 bg-green-500/10 text-green-400">
                                                                        Activé
                                                                    </span>
                                                                );
                                                            } else if (isTrialActive) {
                                                                statusBadge = (
                                                                    <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase border border-amber-500/20 bg-amber-500/10 text-amber-400">
                                                                        Essai
                                                                    </span>
                                                                );
                                                            }

                                                            return (
                                                                <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                                                                    <td className="p-4">
                                                                        <div className="flex items-center gap-3">
                                                                            {p.logo_url && (
                                                                                <img src={p.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover bg-white/10" />
                                                                            )}
                                                                            <div>
                                                                                <p className="font-bold text-white text-xs">{p.name}</p>
                                                                                <span className="text-[9px] text-white/30">{p.city} · {p.email}</span>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-4">{statusBadge}</td>
                                                                    <td className="p-4">
                                                                        <span className="font-mono text-xs uppercase text-white/70">{getPlanLabel(p.subscription_plan)}</span>
                                                                    </td>
                                                                    <td className="p-4 text-xs font-medium text-white/60">
                                                                        {p.trial_ends_at ? new Date(p.trial_ends_at).toLocaleDateString('fr-FR') : '-'}
                                                                    </td>
                                                                    <td className="p-4 text-xs font-medium text-white/60">
                                                                        {p.subscription_ends_at ? new Date(p.subscription_ends_at).toLocaleDateString('fr-FR') : '-'}
                                                                    </td>
                                                                    <td className="p-4 text-right">
                                                                        <button
                                                                            onClick={() => {
                                                                                setSelectedPrinterForSub(p);
                                                                                setSubForm({
                                                                                    status: p.subscription_status || 'expired',
                                                                                    endsAt: p.subscription_ends_at ? new Date(p.subscription_ends_at).toISOString().slice(0, 10) : '',
                                                                                    trialEndsAt: p.trial_ends_at ? new Date(p.trial_ends_at).toISOString().slice(0, 10) : '',
                                                                                    plan: p.subscription_plan || '1m'
                                                                                });
                                                                            }}
                                                                            className="px-3 py-1.5 bg-[#C9A84C]/10 text-[#C9A84C] hover:bg-[#C9A84C]/25 border border-[#C9A84C]/20 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                                                        >
                                                                            Gérer
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Custom UI Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[9999] bg-[#0E0E12] border-2 border-white/10 rounded-3xl p-6 shadow-2xl flex items-center gap-4 max-w-sm animate-in slide-in-from-bottom-5 duration-500 text-white">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white
                        ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                        <CheckCircle2 size={22} />
                    </div>
                    <div className="text-left">
                        <h4 className="font-black text-sm text-white uppercase tracking-wider">
                            {toast.type === 'success' ? 'Succès' : 'Erreur'}
                        </h4>
                        <p className="text-xs text-white/70 font-bold mt-0.5">
                            {toast.message}
                        </p>
                    </div>
                </div>
            )}

            {/* Broadcast/Bulk Messages Modal */}
            {showBulkModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#111116] border border-white/10 rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl p-8 relative flex flex-col text-white font-sans">
                        <div className="absolute inset-0 pointer-events-none noise-overlay opacity-[0.03] bg-white"></div>
                        
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-2xl font-black font-serif text-[#FAF8F5]">Message collectif</h3>
                                <p className="text-xs text-white/40 mt-1 font-bold uppercase tracking-wider">Diffuser une annonce aux imprimeurs</p>
                            </div>
                            <button 
                                onClick={() => setShowBulkModal(false)}
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSendBulkMessage} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-wider text-white/40 ml-2">Sélectionner les destinataires</label>
                                <div className="border border-white/5 bg-white/2 rounded-2xl max-h-32 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                                    <label className="flex items-center gap-2.5 text-xs font-bold text-white/80 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedBulkPrinters.length === printers.length}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedBulkPrinters(printers.map(p => p.id));
                                                } else {
                                                    setSelectedBulkPrinters([]);
                                                }
                                            }}
                                            className="rounded border-white/10 accent-[#C9A84C]"
                                        />
                                        <span>Sélectionner tout le monde ({printers.length})</span>
                                    </label>
                                    <hr className="border-white/5 my-2" />
                                    {printers.map(p => (
                                        <label key={p.id} className="flex items-center gap-2.5 text-xs text-white/70 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedBulkPrinters.includes(p.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedBulkPrinters(prev => [...prev, p.id]);
                                                    } else {
                                                        setSelectedBulkPrinters(prev => prev.filter(id => id !== p.id));
                                                    }
                                                }}
                                                className="rounded border-white/10 accent-[#C9A84C]"
                                            />
                                            <span>{p.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-wider text-white/40 ml-2">Sujet du message</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: Maintenance système / Offres promotionnelles"
                                    value={bulkSubject}
                                    onChange={(e) => setBulkSubject(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 focus:border-[#C9A84C]/45 text-xs font-bold rounded-xl px-4 py-3 focus:outline-none transition-colors"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-wider text-white/40 ml-2">Contenu du message</label>
                                <textarea
                                    required
                                    rows="4"
                                    placeholder="Saisissez le contenu du message à diffuser..."
                                    value={bulkContent}
                                    onChange={(e) => setBulkContent(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 focus:border-[#C9A84C]/45 text-xs font-bold rounded-xl px-4 py-3 focus:outline-none transition-colors resize-none"
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 mt-6 bg-[#C9A84C] text-[#0F0F13] rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.03] active:scale-95 transition-all shadow-xl shadow-[#C9A84C]/15"
                            >
                                Envoyer la diffusion ({selectedBulkPrinters.length} destinataire(s))
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* News Editor Modal */}
            {isNewsModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-[#111116] border border-white/10 rounded-[2.5rem] p-6 sm:p-8 w-full max-w-3xl my-8 relative shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl sm:text-2xl font-black text-white">{newsForm.id ? "Modifier l'article" : "Nouvel article"}</h3>
                            <button onClick={() => setIsNewsModalOpen(false)} className="p-2 bg-white/5 text-white/60 hover:text-white rounded-xl"><XCircle size={20} /></button>
                        </div>

                        <form onSubmit={handleSaveNews} className="space-y-5">
                            {/* Image de couverture */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1 mb-2 block">Image de couverture</label>
                                {newsForm.image_url ? (
                                    <div className="relative w-full aspect-[16/7] rounded-2xl overflow-hidden border border-white/10 group">
                                        <img src={newsForm.image_url} alt="" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                            <label className="p-3 bg-[#C9A84C] text-[#0F0F13] rounded-full cursor-pointer hover:scale-105 transition-all"><ImageIcon size={18} /><input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} /></label>
                                            <button type="button" onClick={() => setNewsForm(prev => ({ ...prev, image_url: '' }))} className="p-3 bg-red-500 text-white rounded-full hover:scale-105 transition-all"><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center w-full aspect-[16/7] border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:bg-white/5 hover:border-[#C9A84C]/35 transition-all">
                                        {coverUploading ? <Loader2 size={28} className="animate-spin text-[#C9A84C]" /> : (<><ImageIcon size={28} className="text-white/20 mb-2" /><span className="text-xs text-white/45 font-bold">Importer une couverture</span></>)}
                                        <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                                    </label>
                                )}
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1 mb-2 block">Titre *</label>
                                <input type="text" value={newsForm.title} onChange={(e) => setNewsForm(prev => ({ ...prev, title: e.target.value }))} placeholder="Titre de l'article" className="w-full bg-white/5 border border-white/10 focus:border-[#C9A84C]/40 text-base font-bold text-white rounded-2xl px-5 py-3.5 focus:outline-none" />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1 mb-2 block">Accroche (résumé)</label>
                                <textarea rows="2" value={newsForm.excerpt} onChange={(e) => setNewsForm(prev => ({ ...prev, excerpt: e.target.value }))} placeholder="Courte description affichée dans la liste" className="w-full bg-white/5 border border-white/10 focus:border-[#C9A84C]/40 text-sm font-medium text-white rounded-2xl px-5 py-3.5 focus:outline-none resize-none" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1 mb-2 block">Catégorie</label>
                                    <select 
                                        value={newsForm.category} 
                                        onChange={(e) => setNewsForm(prev => ({ ...prev, category: e.target.value }))} 
                                        className="w-full bg-[#111116] border border-white/10 focus:border-[#C9A84C]/45 text-sm font-bold text-[#FAF8F5] rounded-2xl px-5 py-3.5 focus:outline-none"
                                    >
                                        <option value="Actualité" className="bg-[#111116] text-[#FAF8F5]">Actualité</option>
                                        <option value="Conseils" className="bg-[#111116] text-[#FAF8F5]">Conseils</option>
                                        <option value="Innovation" className="bg-[#111116] text-[#FAF8F5]">Innovation</option>
                                        <option value="Tendance" className="bg-[#111116] text-[#FAF8F5]">Tendance</option>
                                        <option value="Technologie" className="bg-[#111116] text-[#FAF8F5]">Technologie</option>
                                        <option value="Autre" className="bg-[#111116] text-[#FAF8F5]">Autre (personnalisé)...</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1 mb-2 block">Tags (séparés par des virgules)</label>
                                    <input 
                                        type="text" 
                                        value={newsForm.tags} 
                                        onChange={(e) => setNewsForm(prev => ({ ...prev, tags: e.target.value }))} 
                                        placeholder="ex: Offset, Sénégal, 3D" 
                                        className="w-full bg-white/5 border border-white/10 focus:border-[#C9A84C]/40 text-sm font-bold text-white rounded-2xl px-5 py-3.5 focus:outline-none" 
                                    />
                                </div>
                                {newsForm.category === 'Autre' && (
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C] ml-1 mb-2 block">Nom de la catégorie personnalisée</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={customCategory} 
                                            onChange={(e) => setCustomCategory(e.target.value)} 
                                            placeholder="Saisissez votre catégorie personnalisée (ex: Tutoriels, Machines, Encre)" 
                                            className="w-full bg-white/5 border border-[#C9A84C]/40 focus:border-[#C9A84C] text-sm font-bold text-[#FAF8F5] rounded-2xl px-5 py-3.5 focus:outline-none" 
                                        />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1 mb-2 block">Contenu de l'article</label>
                                <RichTextEditor value={newsForm.content} printers={printers} onChange={(html) => setNewsForm(prev => ({ ...prev, content: html }))} />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1 mb-2 block">Imprimeurs mentionnés dans l'article</label>
                                <div className="border border-white/10 rounded-2xl p-4 bg-white/5 max-h-36 overflow-y-auto space-y-2 custom-scrollbar">
                                    {printers && printers.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {printers.map((p) => {
                                                const isChecked = newsForm.mentions.includes(p.id);
                                                return (
                                                    <label key={p.id} className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-white/5 transition-colors">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={isChecked} 
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setNewsForm(prev => ({ ...prev, mentions: [...prev.mentions, p.id] }));
                                                                } else {
                                                                    setNewsForm(prev => ({ ...prev, mentions: prev.mentions.filter(id => id !== p.id) }));
                                                                }
                                                            }}
                                                            className="rounded border-white/10 text-[#C9A84C] focus:ring-0 focus:ring-offset-0 bg-transparent w-4 h-4 cursor-pointer"
                                                        />
                                                        <div className="flex items-center gap-2">
                                                            {p.logo_url && (
                                                                <img src={p.logo_url} alt="" className="w-5 h-5 rounded-full object-cover bg-white/10" />
                                                            )}
                                                            <span className="text-xs font-bold text-white/80 line-clamp-1">{p.name} <span className="text-white/40 font-medium">({p.city})</span></span>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-white/40 font-bold text-center py-4">Aucun imprimeur enregistré pour le moment.</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                                <div className="flex-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1 mb-2 block">Temps de lecture</label>
                                    <input type="text" value={newsForm.read_time} onChange={(e) => setNewsForm(prev => ({ ...prev, read_time: e.target.value }))} placeholder="5 min" className="w-full bg-white/5 border border-white/10 focus:border-[#C9A84C]/40 text-sm font-bold text-white rounded-2xl px-5 py-3 focus:outline-none" />
                                </div>
                                <label className="flex items-center gap-3 cursor-pointer sm:mt-6">
                                    <input type="checkbox" checked={newsForm.published} onChange={(e) => setNewsForm(prev => ({ ...prev, published: e.target.checked }))} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all relative after:top-0.5 after:left-0.5 peer-checked:bg-[#C9A84C]"></div>
                                    <span className="text-xs font-bold text-white/70">Publié (visible sur le site)</span>
                                </label>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsNewsModalOpen(false)} className="flex-1 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-white/5 text-white/60 hover:text-white transition-all">Annuler</button>
                                <button type="submit" disabled={actionLoading} className="flex-1 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-[#C9A84C] text-[#0F0F13] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {newsForm.id ? 'Enregistrer' : 'Publier'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-[#111116] border border-white/10 rounded-[3rem] p-8 md:p-10 w-full max-w-md relative z-10 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center shrink-0">
                                <LogOut size={22} />
                            </div>
                            <h3 className="text-xl font-black text-white">Confirmer la déconnexion</h3>
                        </div>
                        <p className="text-sm text-white/50 font-medium mb-8 leading-relaxed">
                            Vous allez quitter la console d'administration. Vous devrez ressaisir le mot de passe pour y revenir.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="flex-1 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-white/5 text-white/60 hover:text-white transition-all"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => { setShowLogoutConfirm(false); handleLogout(); }}
                                className="flex-1 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-red-500 text-white hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <LogOut size={16} /> Se déconnecter
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Suspend Product Modal */}
            {suspendModalProduct && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-[#111116] border border-white/10 rounded-[3rem] p-8 md:p-10 w-full max-w-md relative z-10 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-white flex items-center gap-2">
                                <PauseCircle size={22} className="text-amber-400" /> Suspendre le produit
                            </h3>
                            <button onClick={() => setSuspendModalProduct(null)} className="p-2 bg-white/5 text-white/60 hover:text-white rounded-xl"><XCircle size={20} /></button>
                        </div>
                        <p className="text-sm text-white/50 font-medium mb-2 leading-relaxed">
                            « <span className="font-bold text-white/80">{suspendModalProduct.name}</span> » sera masqué de la marketplace publique pendant la durée choisie, puis réactivé automatiquement.
                        </p>
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mt-6 mb-2">Durée de suspension</label>
                        <div className="grid grid-cols-4 gap-2 mb-6">
                            {[
                                { v: '1', l: '1 jour' },
                                { v: '3', l: '3 jours' },
                                { v: '7', l: '7 jours' },
                                { v: '30', l: '30 jours' }
                            ].map(opt => (
                                <button
                                    key={opt.v}
                                    type="button"
                                    onClick={() => setSuspendDays(opt.v)}
                                    className={`py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all border
                                        ${suspendDays === opt.v ? 'bg-amber-500 text-[#0F0F13] border-amber-500' : 'bg-white/5 text-white/50 border-white/5 hover:text-white'}`}
                                >
                                    {opt.l}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 mb-8">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Ou personnalisé :</span>
                            <input
                                type="number"
                                min="1"
                                value={suspendDays}
                                onChange={(e) => setSuspendDays(e.target.value)}
                                className="w-20 bg-white/5 border border-white/5 focus:border-amber-500/40 text-sm font-bold text-white rounded-xl px-3 py-2 focus:outline-none"
                            />
                            <span className="text-xs font-bold text-white/40">jour(s)</span>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setSuspendModalProduct(null)}
                                className="flex-1 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-white/5 text-white/60 hover:text-white transition-all"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSuspendProduct}
                                disabled={actionLoading}
                                className="flex-1 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-amber-500 text-[#0F0F13] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <PauseCircle size={16} />}
                                Confirmer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Product Modal */}
            {isProductModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-300">
                    <div className="bg-[#111116] border border-white/10 rounded-[3rem] p-8 md:p-10 w-full max-w-2xl my-8 relative z-10 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-8 shrink-0">
                            <h3 className="text-2xl font-black text-white">Modifier le Produit</h3>
                            <button onClick={() => { setIsProductModalOpen(false); setEditingProduct(null); }} className="p-2 bg-white/5 text-white/60 hover:text-white rounded-xl"><XCircle size={20} /></button>
                        </div>

                        <form onSubmit={handleSaveProduct} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Nom du produit</label>
                                    <input 
                                        required
                                        placeholder="Ex: Encre Offset Cyan"
                                        className="w-full bg-white/5 border border-white/5 focus:border-[#C9A84C]/45 text-sm font-bold text-white rounded-2xl px-6 py-4 focus:outline-none transition-colors"
                                        value={productForm.name}
                                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Catégorie</label>
                                    <select 
                                        className="w-full bg-white/5 border border-white/5 focus:border-[#C9A84C]/45 text-sm font-bold text-white rounded-2xl px-6 py-4 focus:outline-none transition-colors"
                                        value={productForm.category}
                                        onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                                    >
                                        <option value="Encre" className="bg-[#111116]">Encre</option>
                                        <option value="Papier" className="bg-[#111116]">Papier</option>
                                        <option value="Machines" className="bg-[#111116]">Machines</option>
                                        <option value="Accessoires" className="bg-[#111116]">Accessoires</option>
                                        <option value="Autre" className="bg-[#111116]">Autre</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Prix (FCFA)</label>
                                    <input 
                                        required
                                        type="number"
                                        placeholder="Ex: 45000"
                                        className="w-full bg-white/5 border border-white/5 focus:border-[#C9A84C]/45 text-sm font-bold text-white rounded-2xl px-6 py-4 focus:outline-none transition-colors"
                                        value={productForm.price}
                                        onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Prix Promo (FCFA)</label>
                                    <input 
                                        type="number"
                                        placeholder="Ex: 38000"
                                        className="w-full bg-white/5 border border-white/5 focus:border-[#C9A84C]/45 text-sm font-bold text-white rounded-2xl px-6 py-4 focus:outline-none transition-colors"
                                        value={productForm.promo_price}
                                        onChange={(e) => setProductForm({ ...productForm, promo_price: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Remise (%)</label>
                                    <input 
                                        type="number"
                                        placeholder="Ex: 15"
                                        className="w-full bg-white/5 border border-white/5 focus:border-[#C9A84C]/45 text-sm font-bold text-white rounded-2xl px-6 py-4 focus:outline-none transition-colors"
                                        value={productForm.discount}
                                        onChange={(e) => setProductForm({ ...productForm, discount: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Quantité / Stock</label>
                                    <input 
                                        placeholder="Ex: 50 bidons, En Stock"
                                        className="w-full bg-white/5 border border-white/5 focus:border-[#C9A84C]/45 text-sm font-bold text-white rounded-2xl px-6 py-4 focus:outline-none transition-colors"
                                        value={productForm.quantity}
                                        onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Format / Volume</label>
                                    <input 
                                        placeholder="Ex: 5 Litres, A4, 50x70cm"
                                        className="w-full bg-white/5 border border-white/5 focus:border-[#C9A84C]/45 text-sm font-bold text-white rounded-2xl px-6 py-4 focus:outline-none transition-colors"
                                        value={productForm.format}
                                        onChange={(e) => setProductForm({ ...productForm, format: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 font-sans">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Description</label>
                                <textarea 
                                    required
                                    rows="4"
                                    placeholder="Détails du produit..."
                                    className="w-full bg-white/5 border border-white/5 focus:border-[#C9A84C]/45 text-sm font-bold text-white rounded-2xl px-6 py-4 focus:outline-none transition-colors resize-none"
                                    value={productForm.description}
                                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={actionLoading}
                                className="w-full bg-[#C9A84C] text-[#0F0F13] py-5 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-[#C9A84C]/20 uppercase tracking-widest text-xs"
                            >
                                {actionLoading ? <Loader2 className="animate-spin" size={22} /> : <Save size={22} />}
                                Enregistrer les modifications
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Support Message Details Modal */}
            {selectedFullMessage && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-[#111116] rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300">
                        <div className="bg-white/2 p-8 text-white flex justify-between items-center border-b border-white/5">
                            <div>
                                <h4 className="text-2xl font-black mb-1">Détails du message</h4>
                                <p className="text-[#C9A84C] text-xs font-bold tracking-widest uppercase">Assistance Imprimeur</p>
                            </div>
                            <button 
                                onClick={() => setSelectedFullMessage(null)} 
                                className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all shrink-0 text-white"
                            >
                                <XCircle size={20} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-xs text-white/50 font-bold border-b border-white/5 pb-3">
                                    <div>
                                        <span className="text-[10px] uppercase tracking-wider text-white/30 block mb-0.5">Expéditeur</span>
                                        <span className="text-[#C9A84C] font-black">
                                            {selectedFullMessage.direction === 'admin_to_printer' ? 'Vous (Administrateur)' : (printers.find(p => p.id === selectedFullMessage.printer_id)?.name || 'Imprimeur')}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] uppercase tracking-wider text-white/30 block mb-0.5">Date & Heure</span>
                                        <span>
                                            {formatDate(selectedFullMessage.created_at)}
                                        </span>
                                    </div>
                                </div>
                                {selectedFullMessage.subject && (
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-[#C9A84C] block mb-1">Objet</span>
                                        <span className="text-xs font-bold text-white">{selectedFullMessage.subject}</span>
                                    </div>
                                )}
                                <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    <p className="text-sm text-white/80 font-medium whitespace-pre-wrap leading-relaxed">
                                        {selectedFullMessage.content}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedFullMessage(null)}
                                className="w-full bg-[#C9A84C] text-[#0F0F13] py-4 rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-lg"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Subscription management Modal */}
            {selectedPrinterForSub && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#111116] border border-white/10 rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl p-8 relative flex flex-col text-white font-sans">
                        <div className="absolute inset-0 pointer-events-none noise-overlay opacity-[0.03] bg-white"></div>
                        
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-black font-serif text-[#FAF8F5]">Abonnement de {selectedPrinterForSub.name}</h3>
                                <p className="text-xs text-white/40 mt-1 font-bold uppercase tracking-wider">Modifier manuellement les statuts et dates d'accès</p>
                            </div>
                            <button 
                                onClick={() => setSelectedPrinterForSub(null)}
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdatePrinterSubscription} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-wider text-white/40 ml-2">Statut de l'abonnement</label>
                                <select
                                    value={subForm.status}
                                    onChange={(e) => {
                                        const newStatus = e.target.value;
                                        let newEndsAt = subForm.endsAt;
                                        let newTrialEndsAt = subForm.trialEndsAt;
                                        if (newStatus === 'trial' && !subForm.trialEndsAt) {
                                            const d = new Date();
                                            d.setDate(d.getDate() + 14);
                                            newTrialEndsAt = d.toISOString().slice(0, 10);
                                        }
                                        if (newStatus === 'active' && !subForm.endsAt) {
                                            const planMonths = subForm.plan === '1m' ? 1 : subForm.plan === '3m' ? 3 : 12;
                                            const d = new Date();
                                            d.setMonth(d.getMonth() + planMonths);
                                            newEndsAt = d.toISOString().slice(0, 10);
                                        }
                                        setSubForm({ ...subForm, status: newStatus, endsAt: newEndsAt, trialEndsAt: newTrialEndsAt });
                                    }}
                                    className="w-full bg-[#111116] border border-white/10 text-sm font-bold text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#C9A84C]/45"
                                >
                                    <option value="trial" className="bg-[#111116]">Essai gratuit (Trial)</option>
                                                                    <option value="active" className="bg-[#111116]">Activé (Payé)</option>
                                                                    <option value="expired" className="bg-[#111116]">Expiré</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-wider text-white/40 ml-2">Formule d'abonnement</label>
                                <select
                                    value={subForm.plan}
                                    onChange={(e) => {
                                        const newPlan = e.target.value;
                                        let newEndsAt = subForm.endsAt;
                                        if (subForm.status === 'active') {
                                            const planMonths = newPlan === '1m' ? 1 : newPlan === '3m' ? 3 : 12;
                                            const d = new Date();
                                            d.setMonth(d.getMonth() + planMonths);
                                            newEndsAt = d.toISOString().slice(0, 10);
                                        }
                                        setSubForm({ ...subForm, plan: newPlan, endsAt: newEndsAt });
                                    }}
                                    className="w-full bg-[#111116] border border-white/10 text-sm font-bold text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#C9A84C]/45"
                                >
                                    {pricingPlans.map(plan => (
                                        <option key={plan.id} value={plan.id} className="bg-[#111116]">Plan {plan.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-wider text-white/40 ml-2">Date de fin d'essai gratuit</label>
                                <input
                                    type="date"
                                    value={subForm.trialEndsAt}
                                    onChange={(e) => setSubForm({ ...subForm, trialEndsAt: e.target.value })}
                                    className="w-full bg-[#111116] border border-white/10 text-sm font-bold text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#C9A84C]/45"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-wider text-white/40 ml-2">Date de fin d'abonnement</label>
                                <input
                                    type="date"
                                    value={subForm.endsAt}
                                    onChange={(e) => setSubForm({ ...subForm, endsAt: e.target.value })}
                                    className="w-full bg-[#111116] border border-white/10 text-sm font-bold text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#C9A84C]/45"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={actionLoading}
                                className="w-full py-4 mt-6 bg-[#C9A84C] text-[#0F0F13] rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.03] active:scale-95 transition-all shadow-xl shadow-[#C9A84C]/15 flex items-center justify-center gap-2"
                            >
                                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                Mettre à jour l'abonnement
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPage;



