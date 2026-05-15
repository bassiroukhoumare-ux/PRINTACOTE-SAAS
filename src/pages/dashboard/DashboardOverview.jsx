import React from 'react';
import { LayoutDashboard, Star, ShoppingCart, TrendingUp, Users, MessageSquare } from 'lucide-react';

const DashboardOverview = ({ printerData }) => {
    const stats = [
        { label: 'Vues Profil', value: printerData?.views || '0', sub: '+12% ce mois', icon: Users, color: 'bg-primary' },
        { label: 'Note Moyenne', value: printerData?.rating || '5.0', sub: 'Basé sur 0 avis', icon: Star, color: 'bg-yellow-500' },
        { label: 'Ventes Market', value: '0', sub: '0 CFA gagnés', icon: ShoppingCart, color: 'bg-green-500' },
        { label: 'Lead WhatsApp', value: '0', sub: '0 clics ce jour', icon: MessageSquare, color: 'bg-accent' },
    ];

    return (
        <div className="space-y-12">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white border border-dark/5 rounded-[2.5rem] p-10 flex flex-col justify-between min-h-[220px] hover:shadow-2xl transition-all duration-500 group relative overflow-hidden">
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
                ))}
            </div>

            {/* Performance Chart Placeholder / Main Action */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-dark rounded-[3rem] p-12 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[50%] h-full bg-gradient-to-l from-primary/20 to-transparent"></div>
                    <h3 className="text-3xl font-black mb-6 tracking-tight">Boostez votre visibilité.</h3>
                    <p className="text-white/40 max-w-md mb-10 leading-relaxed text-lg">
                        Complétez votre profil à 100% pour apparaître en haut des résultats de recherche et capter plus de clients locaux.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button className="bg-primary text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-105 transition-transform">
                            Lancer une campagne
                        </button>
                        <button className="bg-white/10 text-white px-8 py-4 rounded-2xl font-bold hover:bg-white/20 transition-all">
                            Voir statistiques détaillées
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
