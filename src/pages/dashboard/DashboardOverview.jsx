import React from 'react';
import { LayoutDashboard, Star, ShoppingCart, TrendingUp, Users, MessageSquare } from 'lucide-react';

const DashboardOverview = ({ printerData, setActiveTab }) => {
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

    const stat = { 
        label: 'Note Moyenne', 
        value: reviewCount > 0 ? displayRating.toFixed(1) : '0', 
        sub: `Basé sur ${reviewCount} avis réel${reviewCount > 1 ? 's' : ''}`, 
        icon: Star, 
        color: 'bg-yellow-500' 
    };

    return (
        <div className="space-y-12">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white border border-dark/5 rounded-[2.5rem] p-10 flex flex-col justify-between min-h-[220px] hover:shadow-2xl transition-all duration-500 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-dark/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <span className="text-dark/40 text-xs font-black uppercase tracking-[0.2em]">{stat.label}</span>
                        <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                            <stat.icon size={20} />
                        </div>
                    </div>
                    <div className="relative z-10 mt-8">
                        <div className="text-5xl font-black text-dark tracking-tight mb-2">{stat.value}</div>
                        <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-dark/30 uppercase tracking-widest">
                            <TrendingUp size={12} className="text-green-500" />
                            {stat.sub}
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
