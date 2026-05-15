import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
    LayoutDashboard, User, Wrench, Image as ImageIcon, 
    Store, CreditCard, LogOut, Menu, X, Eye, Star,
    MessageCircle, Plus, ChevronRight, Bell
} from 'lucide-react';
import DashboardOverview from './dashboard/DashboardOverview';
import DashboardProfile from './dashboard/DashboardProfile';
import DashboardServices from './dashboard/DashboardServices';
import DashboardPortfolio from './dashboard/DashboardPortfolio';
import DashboardMarketplace from './dashboard/DashboardMarketplace';

const DashboardPage = ({ setPage, user }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [printerData, setPrinterData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchPrinterData();
        }
    }, [user]);

    const fetchPrinterData = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('printers')
            .select('*')
            .eq('owner_id', user.id)
            .single();

        if (!error && data) {
            setPrinterData(data);
        }
        setLoading(false);
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const menuItems = [
        { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard },
        { id: 'profile', label: 'Profil Public', icon: User },
        { id: 'services', label: 'Mes Services', icon: Wrench },
        { id: 'portfolio', label: 'Portfolio', icon: ImageIcon },
        { id: 'marketplace', label: 'Ma Boutique', icon: Store },
        { id: 'billing', label: 'Facturation', icon: CreditCard },
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
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
                        onClick={() => supabase.auth.signOut()}
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
                <button onClick={toggleSidebar} className="p-2 bg-dark/5 rounded-xl">
                    {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="lg:hidden fixed inset-0 z-[90] bg-dark/60 backdrop-blur-sm" onClick={toggleSidebar}></div>
            )}
            <aside className={`lg:hidden fixed top-0 right-0 bottom-0 w-4/5 max-w-xs bg-white z-[95] p-10 flex flex-col transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <nav className="flex-1 space-y-4 mt-20">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => { setActiveTab(item.id); toggleSidebar(); }}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all
                                ${activeTab === item.id ? 'bg-primary text-white shadow-xl' : 'text-dark/50 hover:bg-dark/5'}`}
                        >
                            <item.icon size={24} />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>
                <button 
                    onClick={() => supabase.auth.signOut()}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl font-bold text-red-500 border border-red-100"
                >
                    <LogOut size={20} />
                    <span>Déconnexion</span>
                </button>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 lg:p-12 p-6 pt-24 lg:pt-12 overflow-y-auto">
                <div className="max-w-6xl mx-auto">
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
                                        <div className="w-2 h-2 rounded-full bg-[#25D366]"></div>
                                        <span className="text-[10px] font-mono text-dark/40 uppercase tracking-widest font-bold">Actif • Dakar</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <button className="w-14 h-14 bg-white border border-dark/5 rounded-2xl flex items-center justify-center text-dark/40 hover:text-dark transition-all shadow-xl shadow-dark/5 relative">
                                <div className="absolute top-4 right-4 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                <Bell size={24} />
                            </button>
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
                        {activeTab === 'overview' && <DashboardOverview printerData={printerData} />}
                        {activeTab === 'profile' && <DashboardProfile printerData={printerData} onUpdate={fetchPrinterData} />}
                        {activeTab === 'services' && <DashboardServices printerData={printerData} onUpdate={fetchPrinterData} />}
                        {activeTab === 'portfolio' && <DashboardPortfolio printerData={printerData} onUpdate={fetchPrinterData} />}
                        {activeTab === 'marketplace' && <DashboardMarketplace printerData={printerData} onUpdate={fetchPrinterData} />}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DashboardPage;
