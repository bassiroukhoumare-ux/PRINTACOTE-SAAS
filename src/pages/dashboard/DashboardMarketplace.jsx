import React from 'react';
import { Plus, Store, ShoppingBag, X, TrendingUp } from 'lucide-react';

const DashboardMarketplace = ({ printerData, onUpdate }) => {
    return (
        <div className="max-w-6xl">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                <div>
                    <h2 className="text-4xl font-black tracking-tight mb-2">Ma Boutique</h2>
                    <p className="text-dark/40 text-lg">Vendez vos designs, maquettes et produits d'impression.</p>
                </div>
                <button 
                    className="bg-primary text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                >
                    <Plus size={20} /> Ajouter un produit
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Empty State / Coming Soon Feel */}
                <div className="col-span-full bg-accent/5 border-2 border-dashed border-accent/20 rounded-[3.5rem] p-16 text-center">
                    <div className="w-20 h-20 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                        <ShoppingBag size={40} />
                    </div>
                    <h3 className="text-3xl font-black text-dark mb-4 tracking-tight">Votre boutique est prête !</h3>
                    <p className="text-dark/50 max-w-lg mx-auto text-lg leading-relaxed mb-10">
                        Configurez votre premier produit et commencez à encaisser des paiements directement via Printacote.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button className="bg-accent text-white px-10 py-5 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-2xl shadow-accent/20">
                            Ajouter mon premier produit
                            <Plus size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardMarketplace;
