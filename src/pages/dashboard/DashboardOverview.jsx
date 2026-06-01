import React, { useState, useEffect } from 'react';
import { Star, TrendingUp, MessageSquare, Eye, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const DashboardOverview = ({ printerData, setActiveTab }) => {
    const [periodFilter, setPeriodFilter] = useState('week');
    const [realStats, setRealStats] = useState(null);
    const [clicksSeries, setClicksSeries] = useState([]);
    const [seriesLoading, setSeriesLoading] = useState(false);

    const getReviews = () => {
        const rawReviews = printerData?.reviews;
        if (!rawReviews) return [];
        if (typeof rawReviews === 'string') {
            try { return JSON.parse(rawReviews); } catch (e) { return []; }
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

    // Totaux réels : cumul stocké sur le profil (fallback) + résumé RPC.
    const totalViews = realStats?.totalViews ?? (printerData?.views || 0);
    const totalClicks = realStats?.totalClicks ?? (printerData?.clicks || 0);
    const monthViews = realStats?.monthViews ?? 0;

    // Récupère le résumé chiffré réel de l'imprimeur.
    useEffect(() => {
        if (!printerData?.id || printerData?.isMock) return;
        let cancelled = false;
        supabase.rpc('get_printer_stats', { p_printer_id: printerData.id }).then(({ data, error }) => {
            if (cancelled) return;
            if (error) { console.warn('get_printer_stats indisponible:', error.message); return; }
            setRealStats(data || null);
        });
        return () => { cancelled = true; };
    }, [printerData?.id, printerData?.isMock]);

    // Récupère la série temporelle réelle des clics WhatsApp selon la période.
    useEffect(() => {
        if (!printerData?.id || printerData?.isMock) { setClicksSeries([]); return; }
        let cancelled = false;
        setSeriesLoading(true);
        supabase.rpc('get_printer_event_timeseries', {
            p_printer_id: printerData.id,
            p_type: 'whatsapp_click',
            p_period: periodFilter,
        }).then(({ data, error }) => {
            if (cancelled) return;
            if (error) { console.warn('get_printer_event_timeseries indisponible:', error.message); setClicksSeries([]); }
            else setClicksSeries(Array.isArray(data) ? data : []);
            setSeriesLoading(false);
        });
        return () => { cancelled = true; };
    }, [printerData?.id, printerData?.isMock, periodFilter]);

    const series = Array.isArray(clicksSeries) ? clicksSeries : [];
    const periodClicks = series.reduce((acc, b) => acc + (b.value || 0), 0);
    const maxValue = series.reduce((acc, b) => Math.max(acc, b.value || 0), 0);
    const periodDays = periodFilter === 'today' ? 1 : periodFilter === 'week' ? 7 : periodFilter === 'month' ? 30 : 365;
    const avgUnit = periodFilter === 'today' ? 'heure' : periodFilter === 'year' ? 'mois' : 'jour';
    const formatBucketLabel = (ts) => {
        const d = new Date(ts);
        if (periodFilter === 'today') return `${d.getHours()}h`;
        if (periodFilter === 'year') return d.toLocaleDateString('fr-FR', { month: 'short' });
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    };
    const periodLabels = { today: "Aujourd'hui", week: '7 derniers jours', month: '30 derniers jours', year: '12 derniers mois' };

    const stats = [
        { label: 'Visites Profil', value: totalViews, sub: 'Vues réelles cumulées', icon: Eye, color: 'bg-primary text-white' },
        { label: `Visites - ${getMonthName()}`, value: monthViews, sub: 'Visites ce mois-ci', icon: TrendingUp, color: 'bg-accent text-[#3D0B37]' },
        { label: 'Clics WhatsApp', value: totalClicks, sub: 'Demandes de contact', icon: MessageSquare, color: 'bg-[#25D366] text-white' },
        { label: 'Note Moyenne', value: reviewCount > 0 ? displayRating.toFixed(1) : '0', sub: `Basé sur ${reviewCount} avis réel${reviewCount > 1 ? 's' : ''}`, icon: Star, color: 'bg-yellow-500 text-white' },
    ];

    return (
        <div className="space-y-8 sm:space-y-12">
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

            {/* Analyse des Clics WhatsApp Section (données réelles) */}
            <div className="bg-white border border-dark/5 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-12 shadow-xl shadow-dark/5 space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h3 className="font-black text-xl sm:text-2xl tracking-tight mb-2">Analyse des Clics WhatsApp</h3>
                        <p className="text-dark/40 text-sm">Clics réels sur vos boutons de contact, enregistrés sur votre page publique.</p>
                    </div>
                    <div className="flex bg-dark/5 p-1 rounded-2xl w-full md:w-auto overflow-x-auto">
                        {[
                            { id: 'today', label: 'Jour' },
                            { id: 'week', label: 'Semaine' },
                            { id: 'month', label: 'Mois' },
                            { id: 'year', label: 'Année' }
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                    <div className="bg-[#25D366]/5 rounded-[2rem] p-6 sm:p-8 border border-[#25D366]/10 flex flex-col justify-between min-h-[150px]">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#25D366]">Clics sur la période</span>
                            <h4 className="text-3xl sm:text-4xl font-black text-dark mt-2">{periodClicks} clic{periodClicks > 1 ? 's' : ''}</h4>
                        </div>
                        <div className="mt-4 pt-4 border-t border-dark/5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-dark/40 block">Moyenne / {avgUnit}</span>
                            <h4 className="text-xl font-black text-dark/70 mt-1">{(periodClicks / Math.max(1, series.length || periodDays)).toFixed(1)}</h4>
                        </div>
                    </div>

                    <div className="md:col-span-2 flex flex-col justify-between gap-6 overflow-hidden">
                        {seriesLoading ? (
                            <div className="flex items-center justify-center h-28 text-dark/30 gap-2">
                                <Loader2 size={18} className="animate-spin" /> <span className="text-xs font-bold">Chargement…</span>
                            </div>
                        ) : periodClicks === 0 ? (
                            <div className="flex flex-col items-center justify-center h-28 text-center text-dark/30">
                                <MessageSquare size={22} className="mb-2 opacity-50" />
                                <p className="text-xs font-bold">Aucun clic WhatsApp sur cette période.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto pb-2 custom-scrollbar">
                                <div className="flex items-end justify-between h-28 px-2 pt-4 border-b border-dark/5 relative gap-1 min-w-[340px] sm:min-w-0">
                                    <div className="absolute top-0 left-0 right-0 border-t border-dashed border-dark/5"></div>
                                    <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-dark/5"></div>
                                    {series.map((bar, i) => {
                                        const value = bar.value || 0;
                                        const percentage = maxValue > 0 ? Math.max(value > 0 ? 6 : 0, (value / maxValue) * 100) : 0;
                                        return (
                                            <div key={i} className="flex flex-col items-center gap-2 flex-1 group min-w-0">
                                                <div className="relative w-full flex justify-center items-end h-20">
                                                    <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-dark text-white text-[9px] font-bold px-2 py-1 rounded-md pointer-events-none whitespace-nowrap z-20 shadow-xl">
                                                        {value} clic{value > 1 ? 's' : ''}
                                                    </div>
                                                    <div style={{ height: `${percentage}%` }} className="w-3 sm:w-6 bg-[#25D366] rounded-t-lg transition-all duration-700 hover:bg-[#128C7E] shadow-lg shadow-[#25D366]/15"></div>
                                                </div>
                                                <span className="text-[7px] sm:text-[9px] font-mono font-bold text-dark/40 uppercase tracking-wider truncate max-w-full">
                                                    {formatBucketLabel(bar.ts)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        <div className="flex justify-between items-center text-[10px] sm:text-xs font-bold text-dark/45 uppercase tracking-wider">
                            <span>Période : {periodLabels[periodFilter]}</span>
                            <span>Taux de conversion : {((totalClicks / Math.max(1, totalViews)) * 100).toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions Rapides (pleine largeur) */}
            <div className="bg-[#3D0B37] rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-12 text-[#F5F5DC] relative overflow-hidden shadow-2xl border border-primary/5">
                <div className="absolute top-0 right-0 w-[50%] h-full bg-gradient-to-l from-primary/10 to-transparent"></div>
                <h3 className="text-2xl sm:text-3xl font-black mb-6 tracking-tight">Actions Rapides</h3>
                <p className="text-[#F5F5DC]/60 max-w-md mb-10 leading-relaxed text-base font-medium">
                    Accédez instantanément aux fonctionnalités clés pour enrichir votre vitrine et augmenter vos opportunités commerciales.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
                    <button onClick={() => setActiveTab('services')} className="bg-[#F5F5DC] text-[#3D0B37] py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-xl shrink-0">
                        + Service
                    </button>
                    <button onClick={() => setActiveTab('portfolio')} className="bg-white/10 hover:bg-white/20 text-white py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-2">
                        + Réalisation
                    </button>
                    <button onClick={() => setActiveTab('marketplace')} className="bg-accent text-white py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-xl">
                        + Produit
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DashboardOverview;
