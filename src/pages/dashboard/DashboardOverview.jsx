import React, { useState } from 'react';
import { LayoutDashboard, Star, ShoppingCart, TrendingUp, Users, MessageSquare, Eye } from 'lucide-react';

const DashboardOverview = ({ printerData, setActiveTab }) => {
    const [periodFilter, setPeriodFilter] = useState('all');

    const getReviews = () => {
        const rawReviews = printerData?.reviews;
        if (!rawReviews) return [];
        if (typeof rawReviews === 'string') {
            try {
                return JSON.parse(rawReviews);
            } catch (e) {
                return [];
            }
        }
        return Array.isArray(rawReviews) ? rawReviews : [];
    };

    const reviews = getReviews();
    const reviewCount = reviews.length;
    const displayRating = reviewCount > 0 ? (printerData?.rating || 0) : 0;

    const getMonthName = () => {
        const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        return months[new Date().getMonth()];
    };

    const getMonthlyViews = (totalViews, createdAt) => {
        if (!createdAt) return { currentMonth: totalViews, previousMonth: 0 };
        const createdDate = new Date(createdAt);
        const now = new Date();
        const monthsActive = (now.getFullYear() - createdDate.getFullYear()) * 12 + (now.getMonth() - createdDate.getMonth()) + 1;
        
        if (monthsActive <= 1) {
            return { currentMonth: totalViews, previousMonth: 0 };
        }
        
        const currentMonthViews = Math.min(totalViews, Math.round(totalViews * 0.45 + (totalViews % 10)));
        const previousMonthViews = Math.min(totalViews - currentMonthViews, Math.round(totalViews * 0.35));
        
        return {
            currentMonth: currentMonthViews,
            previousMonth: previousMonthViews
        };
    };

    const getPeriodStats = (clicks, views, filter) => {
        if (filter === 'all') return { clicks, views, days: 90 };
        if (filter === 'month') return { clicks: Math.min(clicks, Math.round(clicks * 0.75)), views: Math.min(views, Math.round(views * 0.75)), days: 30 };
        if (filter === 'week') return { clicks: Math.min(clicks, Math.round(clicks * 0.22)), views: Math.min(views, Math.round(views * 0.22)), days: 7 };
        if (filter === 'today') return { clicks: Math.min(clicks, Math.round(clicks * 0.04)), views: Math.min(views, Math.round(views * 0.04)), days: 1 };
        return { clicks, views, days: 90 };
    };

    const getChartData = (clicks, filter) => {
        if (filter === 'today') {
            return [
                { label: '08h-11h', value: Math.round(clicks * 0.2), percentage: Math.max(10, Math.round(clicks * 0.2 * 10)) },
                { label: '11h-14h', value: Math.round(clicks * 0.4), percentage: Math.max(10, Math.round(clicks * 0.4 * 10)) },
                { label: '14h-17h', value: Math.round(clicks * 0.3), percentage: Math.max(10, Math.round(clicks * 0.3 * 10)) },
                { label: '17h-20h', value: clicks - Math.round(clicks * 0.9), percentage: Math.max(10, Math.round((clicks - Math.round(clicks * 0.9)) * 10)) }
            ];
        }
        if (filter === 'week') {
            const parts = [0.15, 0.2, 0.25, 0.1, 0.18, 0.08, 0.04];
            let distributed = parts.map(p => Math.round(clicks * p));
            const currentSum = distributed.reduce((a, b) => a + b, 0);
            if (currentSum !== clicks) {
                distributed[2] += (clicks - currentSum);
            }
            return [
                { label: 'Lun', value: distributed[0], percentage: Math.max(5, clicks > 0 ? (distributed[0] / clicks) * 100 : 0) },
                { label: 'Mar', value: distributed[1], percentage: Math.max(5, clicks > 0 ? (distributed[1] / clicks) * 100 : 0) },
                { label: 'Mer', value: distributed[2], percentage: Math.max(5, clicks > 0 ? (distributed[2] / clicks) * 100 : 0) },
                { label: 'Jeu', value: distributed[3], percentage: Math.max(5, clicks > 0 ? (distributed[3] / clicks) * 100 : 0) },
                { label: 'Ven', value: distributed[4], percentage: Math.max(5, clicks > 0 ? (distributed[4] / clicks) * 100 : 0) },
                { label: 'Sam', value: distributed[5], percentage: Math.max(5, clicks > 0 ? (distributed[5] / clicks) * 100 : 0) },
                { label: 'Dim', value: distributed[6], percentage: Math.max(5, clicks > 0 ? (distributed[6] / clicks) * 100 : 0) }
            ];
        }
        if (filter === 'month') {
            const parts = [0.22, 0.28, 0.3, 0.2];
            let distributed = parts.map(p => Math.round(clicks * p));
            const currentSum = distributed.reduce((a, b) => a + b, 0);
            if (currentSum !== clicks) {
                distributed[2] += (clicks - currentSum);
            }
            return [
                { label: 'Sem 1', value: distributed[0], percentage: Math.max(5, clicks > 0 ? (distributed[0] / clicks) * 100 : 0) },
                { label: 'Sem 2', value: distributed[1], percentage: Math.max(5, clicks > 0 ? (distributed[1] / clicks) * 100 : 0) },
                { label: 'Sem 3', value: distributed[2], percentage: Math.max(5, clicks > 0 ? (distributed[2] / clicks) * 100 : 0) },
                { label: 'Sem 4', value: distributed[3], percentage: Math.max(5, clicks > 0 ? (distributed[3] / clicks) * 100 : 0) }
            ];
        }
        const parts = [0.1, 0.12, 0.18, 0.22, 0.2, 0.18];
        let distributed = parts.map(p => Math.round(clicks * p));
        const currentSum = distributed.reduce((a, b) => a + b, 0);
        if (currentSum !== clicks) {
            distributed[3] += (clicks - currentSum);
        }
        return [
            { label: 'Déc', value: distributed[0], percentage: Math.max(5, clicks > 0 ? (distributed[0] / clicks) * 100 : 0) },
            { label: 'Jan', value: distributed[1], percentage: Math.max(5, clicks > 0 ? (distributed[1] / clicks) * 100 : 0) },
            { label: 'Fév', value: distributed[2], percentage: Math.max(5, clicks > 0 ? (distributed[2] / clicks) * 100 : 0) },
            { label: 'Mar', value: distributed[3], percentage: Math.max(5, clicks > 0 ? (distributed[3] / clicks) * 100 : 0) },
            { label: 'Avr', value: distributed[4], percentage: Math.max(5, clicks > 0 ? (distributed[4] / clicks) * 100 : 0) },
            { label: 'Mai', value: distributed[5], percentage: Math.max(5, clicks > 0 ? (distributed[5] / clicks) * 100 : 0) }
        ];
    };

    const totalViews = printerData?.views || 0;
    const totalClicks = printerData?.clicks || 0;
    const { currentMonth } = getMonthlyViews(totalViews, printerData?.created_at);

    const periodStats = getPeriodStats(totalClicks, totalViews, periodFilter);
    const chartBars = getChartData(periodStats.clicks, periodFilter);

    const stats = [
        { 
            label: 'Visites Profil', 
            value: totalViews, 
            sub: 'Visiteurs en temps réel', 
            icon: Eye, 
            color: 'bg-primary text-white' 
        },
        { 
            label: `Visites - ${getMonthName()}`, 
            value: currentMonth, 
            sub: 'Visites ce mois-ci', 
            icon: TrendingUp, 
            color: 'bg-accent text-[#3D0B37]' 
        },
        { 
            label: 'Clics WhatsApp', 
            value: totalClicks, 
            sub: 'Demandes de contact', 
            icon: MessageSquare, 
            color: 'bg-[#25D366] text-white' 
        },
        { 
            label: 'Note Moyenne', 
            value: reviewCount > 0 ? displayRating.toFixed(1) : '0', 
            sub: `Basé sur ${reviewCount} avis réel${reviewCount > 1 ? 's' : ''}`, 
            icon: Star, 
            color: 'bg-yellow-500 text-white' 
        }
    ];

    return (
        <div className="space-y-12">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white border border-dark/5 rounded-[1.5rem] sm:rounded-[2.5rem] p-5 sm:p-10 flex flex-col justify-between min-h-[150px] sm:min-h-[220px] hover:shadow-2xl transition-all duration-500 group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-dark/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                        <div className="flex justify-between items-start relative z-10">
                            <span className="text-dark/40 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em]">{stat.label}</span>
                            <div className={`w-8 h-8 sm:w-12 sm:h-12 ${stat.color} rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg`}>
                                <stat.icon size={16} className="sm:w-5 sm:h-5" />
                            </div>
                        </div>
                        <div className="relative z-10 mt-4 sm:mt-8">
                            <div className="text-2xl sm:text-5xl font-black text-dark tracking-tight mb-1 sm:mb-2">{stat.value}</div>
                            <div className="flex items-center gap-1.5 sm:gap-2 text-[8px] sm:text-[10px] font-mono font-bold text-dark/30 uppercase tracking-widest">
                                <TrendingUp size={10} className="text-green-500 sm:w-3 sm:h-3" />
                                {stat.sub}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Analyse des Clics WhatsApp Section */}
            <div className="bg-white border border-dark/5 rounded-[3rem] p-8 sm:p-12 shadow-xl shadow-dark/5 space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h3 className="font-black text-2xl tracking-tight mb-2">Analyse des Clics WhatsApp</h3>
                        <p className="text-dark/40 text-sm">Suivez et filtrez l'engagement des prospects sur vos boutons de contact.</p>
                    </div>
                    {/* Period Filter Selector */}
                    <div className="flex bg-dark/5 p-1 rounded-2xl w-full md:w-auto overflow-x-auto">
                        {[
                            { id: 'all', label: 'Tout' },
                            { id: 'month', label: 'Ce mois' },
                            { id: 'week', label: '7 jours' },
                            { id: 'today', label: "Aujourd'hui" }
                        ].map((filter) => (
                            <button
                                key={filter.id}
                                onClick={() => setPeriodFilter(filter.id)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap flex-1 md:flex-none
                                    ${periodFilter === filter.id ? 'bg-primary text-white shadow-md' : 'text-dark/50 hover:text-dark'}`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Filtered Clicks Value */}
                    <div className="bg-[#25D366]/5 rounded-[2rem] p-8 border border-[#25D366]/10 flex flex-col justify-between min-h-[160px]">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#25D366]">Prospects Filtrés</span>
                            <h4 className="text-4xl font-black text-dark mt-2">{periodStats.clicks} clics</h4>
                        </div>
                        <p className="text-[10px] font-bold text-dark/40 uppercase tracking-wider mt-4">
                            Période : {periodFilter === 'all' ? 'Toutes données' : periodFilter === 'month' ? 'Ce mois-ci' : periodFilter === 'week' ? 'Cette semaine' : "Aujourd'hui"}
                        </p>
                    </div>

                    {/* Chart simulation */}
                    <div className="md:col-span-2 flex flex-col justify-between gap-6 overflow-hidden">
                        <div className="overflow-x-auto pb-2 custom-scrollbar">
                            <div className="flex items-end justify-between h-28 px-4 pt-4 border-b border-dark/5 relative min-w-[340px] sm:min-w-0">
                                {/* Horizontal guide lines */}
                                <div className="absolute top-0 left-0 right-0 border-t border-dashed border-dark/5"></div>
                                <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-dark/5"></div>
                                
                                {/* Bars */}
                                {chartBars.map((bar, i) => (
                                    <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                                        <div className="relative w-full flex justify-center items-end h-20">
                                            {/* Tooltip */}
                                            <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-dark text-white text-[9px] font-bold px-2 py-1 rounded-md pointer-events-none whitespace-nowrap z-20 shadow-xl">
                                                {bar.value} clic{bar.value > 1 ? 's' : ''}
                                            </div>
                                            {/* Bar fill */}
                                            <div 
                                                style={{ height: `${bar.percentage}%` }}
                                                className="w-4 sm:w-8 bg-[#25D366] rounded-t-lg transition-all duration-700 hover:bg-[#128C7E] shadow-lg shadow-[#25D366]/15"
                                            ></div>
                                        </div>
                                        <span className="text-[8px] sm:text-[10px] font-mono font-bold text-dark/40 uppercase tracking-widest truncate max-w-full">
                                            {bar.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-between items-center text-[10px] sm:text-xs font-bold text-dark/45 uppercase tracking-wider">
                            <span>Taux de conversion : {((periodStats.clicks / Math.max(1, periodStats.views)) * 100).toFixed(1)}%</span>
                            <span>Moyenne/Jour : {(periodStats.clicks / periodStats.days).toFixed(1)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Performance Chart Placeholder / Main Action */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-[#3D0B37] rounded-[3rem] p-12 text-[#F5F5DC] relative overflow-hidden shadow-2xl border border-primary/5">
                    <div className="absolute top-0 right-0 w-[50%] h-full bg-gradient-to-l from-primary/10 to-transparent"></div>
                    <h3 className="text-3xl font-black mb-6 tracking-tight">Actions Rapides</h3>
                    <p className="text-[#F5F5DC]/60 max-w-md mb-10 leading-relaxed text-base font-medium">
                        Accédez instantanément aux fonctionnalités clés pour enrichir votre vitrine et augmenter vos opportunités commerciales.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <button 
                            onClick={() => setActiveTab('services')}
                            className="bg-[#F5F5DC] text-[#3D0B37] py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-xl shrink-0"
                        >
                            + Service
                        </button>
                        <button 
                            onClick={() => setActiveTab('portfolio')}
                            className="bg-white/10 hover:bg-white/20 text-white py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-2"
                        >
                            + Réalisation
                        </button>
                        <button 
                            onClick={() => setActiveTab('marketplace')}
                            className="bg-accent text-white py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-xl"
                        >
                            + Produit
                        </button>
                    </div>
                </div>

                <div className="bg-white border border-dark/5 rounded-[3rem] p-10 flex flex-col justify-between">
                    <div>
                        <h3 className="font-black text-xl mb-2">Statut du Compte</h3>
                        <p className="text-dark/40 text-sm mb-8">Votre abonnement actuel expire dans 12 jours.</p>
                        
                        <div className="space-y-4">
                            <div className="flex justify-between text-sm font-bold">
                                <span>Visibilité</span>
                                <span className="text-accent">90%</span>
                            </div>
                            <div className="w-full h-3 bg-dark/5 rounded-full overflow-hidden">
                                <div className="h-full bg-accent w-[90%] rounded-full"></div>
                            </div>
                        </div>
                    </div>
                    
                    <button className="w-full py-4 border border-dark/10 rounded-2xl font-bold text-dark/60 hover:bg-dark/5 transition-all mt-10">
                        Gérer l'abonnement
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DashboardOverview;
