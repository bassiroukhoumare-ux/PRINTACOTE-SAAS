import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
    LayoutDashboard, Users, Wrench, Image as ImageIcon,
    Store, Mail, LogOut, Shield, ShieldAlert, KeyRound,
    Search, Trash2, CheckCircle2, XCircle, Send, Plus, Users2,
    Loader2
} from 'lucide-react';
import gsap from 'gsap';

const AdminPage = ({ setPage }) => {
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return sessionStorage.getItem('admin_authenticated') === 'true';
    });
    const [authError, setAuthError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');

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
    }, [isAuthenticated, activeTab]);

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
            if (activeTab === 'overview') {
                const { data, error } = await supabase.rpc('admin_get_global_stats');
                if (error) throw error;
                setStats(data);
            } else if (activeTab === 'printers' || activeTab === 'services' || activeTab === 'portfolio') {
                const { data, error } = await supabase.rpc('admin_get_printers_list');
                if (error) throw error;
                setPrinters(data || []);
            } else if (activeTab === 'marketplace') {
                // Fetch products and resolve printer names
                const { data, error } = await supabase
                    .from('products')
                    .select('*, printers(name)');
                if (error) throw error;
                setProducts(data || []);
            } else if (activeTab === 'support') {
                const { data, error } = await supabase.rpc('admin_get_messages');
                if (error) throw error;
                setMessages(data || []);
                
                // Automatically select first printer if none selected
                if (data && data.length > 0 && !selectedPrinterId) {
                    setSelectedPrinterId(data[0].printer_id);
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

    const handleToggleStatus = async (printerId, currentStatus) => {
        const newStatus = currentStatus === 'En ligne' ? 'Désactivé' : 'En ligne';
        try {
            const { error } = await supabase.rpc('admin_toggle_printer_status', {
                p_printer_id: printerId,
                p_status: newStatus
            });
            if (error) throw error;
            showToast(`Visibilité de la boutique mise à jour en : ${newStatus}`, "success");
            fetchAdminData();
        } catch (err) {
            showToast("Impossible de changer le statut", "error");
        }
    };

    const handleDeletePrinter = async (printerId) => {
        if (!confirm("Voulez-vous vraiment supprimer définitivement cet imprimeur et toutes ses données associées ?")) return;
        try {
            const { error } = await supabase.rpc('admin_delete_printer', { p_printer_id: printerId });
            if (error) throw error;
            showToast("Imprimeur supprimé avec succès.", "success");
            fetchAdminData();
        } catch (err) {
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
            if (error) throw error;
            showToast("Service supprimé.", "success");
            fetchAdminData();
        } catch (err) {
            showToast("Erreur lors de la suppression du service", "error");
        }
    };

    const handleDeletePortfolio = async (printerId, portfolioList, imageUrl) => {
        if (!confirm("Voulez-vous supprimer cette réalisation du portfolio ?")) return;
        const updatedPortfolio = portfolioList.filter(item => item.image_url !== imageUrl);
        try {
            const { error } = await supabase.rpc('admin_update_printer_portfolio', {
                p_printer_id: printerId,
                p_portfolio: updatedPortfolio
            });
            if (error) throw error;
            showToast("Réalisation retirée du portfolio.", "success");
            fetchAdminData();
        } catch (err) {
            showToast("Erreur lors de la suppression de l'image", "error");
        }
    };

    const handleDeleteProduct = async (productId) => {
        if (!confirm("Voulez-vous supprimer ce produit de la marketplace ?")) return;
        try {
            const { error } = await supabase.rpc('admin_delete_product', { p_product_id: productId });
            if (error) throw error;
            showToast("Produit supprimé de la marketplace.", "success");
            fetchAdminData();
        } catch (err) {
            showToast("Erreur lors de la suppression du produit", "error");
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
            if (error) throw error;
            setReplyContent('');
            showToast("Message envoyé avec succès", "success");
            fetchAdminData();
        } catch (err) {
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
            if (error) throw error;
            showToast(`${data} message(s) envoyé(s) avec succès.`, "success");
            setBulkSubject('');
            setBulkContent('');
            setSelectedBulkPrinters([]);
            setShowBulkModal(false);
            fetchAdminData();
        } catch (err) {
            showToast("Erreur lors de la diffusion du message", "error");
        }
    };

    const markAsRead = async (printerId) => {
        try {
            await supabase.rpc('admin_mark_messages_read', { p_printer_id: printerId });
            fetchAdminData();
        } catch (e) {}
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

    return (
        <div className="min-h-screen bg-[#0F0F13] flex text-[#FAF8F5] font-sans selection:bg-[#C9A84C] selection:text-[#0F0F13]">
            <div className="noise-overlay opacity-5 pointer-events-none"></div>

            {/* Sidebar Administrateur */}
            <aside className="w-80 bg-[#111116] border-r border-white/5 flex flex-col sticky top-0 h-screen z-50">
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
                </nav>

                <div className="p-8 border-t border-white/5">
                    <button 
                        onClick={handleLogout}
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
                            </h1>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono text-white/40 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            Système Connecté
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
                                                <h3 className="text-3xl font-black mt-1">{stats.totalViews.toLocaleString()}</h3>
                                            </div>
                                        </div>
                                        <div className="bg-[#111116] border border-white/5 rounded-[2rem] p-6 flex items-center gap-5">
                                            <div className="w-14 h-14 bg-[#C9A84C]/10 text-[#C9A84C] rounded-2xl flex items-center justify-center shrink-0">
                                                <Send size={28} />
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-black uppercase text-white/30 tracking-widest block">Clics de Contact</span>
                                                <h3 className="text-3xl font-black mt-1">{stats.totalClicks.toLocaleString()}</h3>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-[#111116] border border-white/5 rounded-[2.5rem] p-8 space-y-4">
                                        <h3 className="text-lg font-black uppercase tracking-wider text-white/70">Conseils de modération</h3>
                                        <p className="text-sm text-white/50 leading-relaxed">
                                            Cette console vous permet de garder le contrôle sur le contenu publié sur **Printacoté**. 
                                            Veillez à désactiver ou supprimer les profils vides ou inappropriés. Toutes les actions de suppression sont définitives dans la base de données.
                                        </p>
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

                                    <div className="bg-[#111116] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm text-white/80 border-collapse">
                                                <thead>
                                                    <tr className="bg-white/5 border-b border-white/5 text-[10px] font-black uppercase tracking-wider text-white/40">
                                                        <th className="p-6">Imprimerie</th>
                                                        <th className="p-6">Contact & Profil</th>
                                                        <th className="p-6">Localisation</th>
                                                        <th className="p-6">Statistiques</th>
                                                        <th className="p-6 text-center">Visibilité</th>
                                                        <th className="p-6 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredPrinters.length === 0 ? (
                                                        <tr>
                                                            <td colSpan="6" className="p-12 text-center text-white/40 font-bold">Aucun imprimeur trouvé.</td>
                                                        </tr>
                                                    ) : (
                                                        filteredPrinters.map(p => (
                                                            <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                                                                <td className="p-6 flex items-center gap-4">
                                                                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 shrink-0">
                                                                        <img src={p.logo_url} alt="" className="w-full h-full object-cover" />
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="font-bold text-white text-base">{p.name}</h4>
                                                                        <span className="text-[10px] text-white/30 block mt-0.5">Inscrit le {new Date(p.created_at).toLocaleDateString('fr-FR')}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="p-6">
                                                                    <p className="font-semibold text-xs text-white/90">{p.email}</p>
                                                                    {p.whatsapp && (
                                                                        <p className="text-xs text-[#C9A84C] font-mono mt-1">WA: +{p.whatsapp}</p>
                                                                    )}
                                                                </td>
                                                                <td className="p-6 text-xs font-bold text-white/70">
                                                                    {p.city ? `${p.city}, ${p.country}` : 'Non défini'}
                                                                </td>
                                                                <td className="p-6 text-xs text-white/55 font-mono space-y-0.5">
                                                                    <p>{p.views || 0} vues</p>
                                                                    <p>{p.clicks || 0} clics WhatsApp</p>
                                                                </td>
                                                                <td className="p-6 text-center">
                                                                    <button
                                                                        onClick={() => handleToggleStatus(p.id, p.status)}
                                                                        className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all
                                                                            ${p.status === 'En ligne' 
                                                                                ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                                                                                : 'bg-red-500/10 text-red-400 border-red-500/20'}`}
                                                                    >
                                                                        {p.status}
                                                                    </button>
                                                                </td>
                                                                <td className="p-6 text-right">
                                                                    <button 
                                                                        onClick={() => handleDeletePrinter(p.id)}
                                                                        className="p-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl transition-all hover:scale-105 active:scale-95"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: SERVICES MODERATION */}
                            {activeTab === 'services' && (
                                <div className="space-y-6">
                                    <div className="bg-[#111116] border border-white/5 rounded-[2.5rem] p-8 space-y-6">
                                        <h3 className="text-lg font-black uppercase tracking-wider text-white/80">Services publiés</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {printers.flatMap(p => (p.services || []).map(s => ({ ...s, printerId: p.id, printerName: p.name, printerLogo: p.logo_url, servicesList: p.services }))).length === 0 ? (
                                                <p className="text-white/40 font-bold">Aucun service publié pour le moment.</p>
                                            ) : (
                                                printers.flatMap(p => (p.services || []).map(s => ({ ...s, printerId: p.id, printerName: p.name, printerLogo: p.logo_url, servicesList: p.services }))).map((s, index) => (
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
                                                            <p className="text-xs text-white/50 mt-2 leading-relaxed font-medium">{s.description}</p>
                                                        </div>
                                                        <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-6 h-6 rounded-full overflow-hidden border border-white/10 shrink-0">
                                                                    <img src={s.printerLogo} alt="" className="w-full h-full object-cover" />
                                                                </div>
                                                                <span className="text-[10px] font-black uppercase tracking-wider text-white/40 truncate max-w-[150px]">{s.printerName}</span>
                                                            </div>
                                                            <button
                                                                onClick={() => handleDeleteService(s.printerId, s.servicesList, s.name)}
                                                                className="p-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl transition-all"
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
                            )}

                            {/* TAB 4: PORTFOLIO IMAGES MODERATION */}
                            {activeTab === 'portfolio' && (
                                <div className="space-y-6">
                                    <div className="bg-[#111116] border border-white/5 rounded-[2.5rem] p-8 space-y-6">
                                        <h3 className="text-lg font-black uppercase tracking-wider text-white/80">Réalisations Portfolio</h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                                            {printers.flatMap(p => (p.portfolio || []).map(item => ({ ...item, printerId: p.id, printerName: p.name, portfolioList: p.portfolio }))).length === 0 ? (
                                                <p className="text-white/40 col-span-full font-bold">Aucune image publiée pour le moment.</p>
                                            ) : (
                                                printers.flatMap(p => (p.portfolio || []).map(item => ({ ...item, printerId: p.id, printerName: p.name, portfolioList: p.portfolio }))).map((item, index) => (
                                                    <div key={index} className="group relative bg-white/5 border border-white/5 rounded-2xl overflow-hidden aspect-square flex flex-col justify-end shadow-lg">
                                                        <img src={item.image_url} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-all duration-500" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none opacity-80 group-hover:opacity-95 transition-opacity"></div>
                                                        <div className="relative p-4 flex justify-between items-center z-10">
                                                            <span className="text-[10px] font-black uppercase tracking-wider text-white/60 truncate max-w-[120px]">{item.printerName}</span>
                                                            <button 
                                                                onClick={() => handleDeletePortfolio(item.printerId, item.portfolioList, item.image_url)}
                                                                className="p-2 bg-red-500 text-white rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md"
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
                                                        </div>
                                                        <div className="p-6 space-y-4">
                                                            <div>
                                                                <h4 className="font-bold text-white text-base leading-tight">{p.name}</h4>
                                                                <p className="text-xs text-white/40 mt-1">Publié par : <span className="font-bold text-white/60">{p.printers?.name || 'Inconnu'}</span></p>
                                                            </div>
                                                            <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                                                <span className="text-sm font-black text-[#C9A84C]">{Number(p.price).toLocaleString()} FCFA</span>
                                                                <button
                                                                    onClick={() => handleDeleteProduct(p.id)}
                                                                    className="p-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl transition-all"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
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
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-200px)]">
                                    
                                    {/* Printers List Side panel */}
                                    <div className="bg-[#111116] border border-white/5 rounded-[2rem] overflow-hidden flex flex-col h-full">
                                        <div className="p-5 border-b border-white/5 flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase text-white/40 tracking-wider">Discussions</span>
                                            <button 
                                                onClick={() => {
                                                    setSelectedBulkPrinters([]);
                                                    setShowBulkModal(true);
                                                }}
                                                className="px-3.5 py-2 bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/20 rounded-xl hover:bg-[#C9A84C]/20 active:scale-95 transition-all text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"
                                            >
                                                <Users2 size={12} /> Diffusion
                                            </button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
                                            {printersWithMessages.length === 0 ? (
                                                <p className="p-8 text-center text-xs text-white/30 font-bold">Aucun message d'assistance reçu.</p>
                                            ) : (
                                                printersWithMessages.map(item => (
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
                                                                {messagesByPrinter[item.id]?.[0]?.content}
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
                                    <div className="lg:col-span-2 bg-[#111116] border border-white/5 rounded-[2rem] flex flex-col h-full overflow-hidden relative">
                                        {selectedPrinterId && messagesByPrinter[selectedPrinterId] ? (
                                            <>
                                                {/* Active chat header */}
                                                <div className="p-5 border-b border-white/5 bg-white/2 flex items-center justify-between">
                                                    <div>
                                                        <h3 className="font-bold text-white text-base">
                                                            {printers.find(p => p.id === selectedPrinterId)?.name}
                                                        </h3>
                                                        <p className="text-[10px] text-white/45 mt-0.5 font-bold uppercase tracking-wider">
                                                            {printers.find(p => p.id === selectedPrinterId)?.email}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Messages Thread list */}
                                                <div className="flex-1 p-6 overflow-y-auto space-y-4 flex flex-col-reverse custom-scrollbar">
                                                    {messagesByPrinter[selectedPrinterId].map((msg) => {
                                                        const isAdmin = msg.direction === 'admin_to_printer';
                                                        return (
                                                            <div 
                                                                key={msg.id} 
                                                                className={`max-w-[80%] flex flex-col ${isAdmin ? 'self-end items-end' : 'self-start items-start'}`}
                                                            >
                                                                <div className={`p-4 rounded-3xl text-sm leading-relaxed ${
                                                                    isAdmin 
                                                                        ? 'bg-[#C9A84C] text-[#0F0F13] rounded-tr-none font-bold shadow-md shadow-[#C9A84C]/5' 
                                                                        : 'bg-white/5 text-white rounded-tl-none border border-white/5 font-medium'
                                                                }`}>
                                                                    {!isAdmin && (
                                                                        <span className="block text-[8px] font-black uppercase tracking-widest text-[#C9A84C] mb-1.5">
                                                                            {msg.subject || "Demande de support"}
                                                                        </span>
                                                                    )}
                                                                    <p>{msg.content}</p>
                                                                </div>
                                                                <span className="text-[9px] font-mono text-white/30 mt-1.5">
                                                                    {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Send Reply box */}
                                                <form onSubmit={handleSendMessage} className="p-5 border-t border-white/5 bg-white/2 flex gap-4">
                                                    <input
                                                        type="text"
                                                        placeholder="Votre réponse d'assistance..."
                                                        value={replyContent}
                                                        onChange={(e) => setReplyContent(e.target.value)}
                                                        className="flex-1 bg-white/5 border border-white/5 focus:border-[#C9A84C]/40 text-sm font-bold text-white rounded-2xl px-6 py-4 focus:outline-none transition-colors"
                                                    />
                                                    <button
                                                        type="submit"
                                                        className="px-6 bg-[#C9A84C] text-[#0F0F13] rounded-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center shrink-0 shadow-lg shadow-[#C9A84C]/10"
                                                    >
                                                        <Send size={18} />
                                                    </button>
                                                </form>
                                            </>
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                                                <Mail size={40} className="text-white/20 mb-4 animate-bounce" />
                                                <h4 className="font-bold text-lg text-white/40">Aucune discussion sélectionnée</h4>
                                                <p className="text-xs text-white/30 max-w-sm mt-2 leading-relaxed">
                                                    Sélectionnez une imprimerie sur le volet gauche pour voir l'historique ou lui envoyer un message.
                                                </p>
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
        </div>
    );
};

export default AdminPage;
