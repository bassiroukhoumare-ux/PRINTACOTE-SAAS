import React from 'react';
import { Plus, Image as ImageIcon, X } from 'lucide-react';

const DashboardPortfolio = ({ printerData, onUpdate }) => {
    return (
        <div className="max-w-6xl">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                <div>
                    <h2 className="text-4xl font-black tracking-tight mb-2">Portfolio</h2>
                    <p className="text-dark/40 text-lg">Mettez en avant vos plus belles réalisations visuelles.</p>
                </div>
                <button 
                    className="bg-primary text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                >
                    <Plus size={20} /> Uploader un projet
                </button>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {printerData?.portfolio?.map((item, i) => (
                    <div key={i} className="aspect-square bg-white rounded-[2.5rem] overflow-hidden relative group shadow-xl border border-dark/5">
                        <img src={item.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-dark/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-6">
                            <button className="bg-red-500 text-white p-4 rounded-2xl hover:scale-110 transition-transform shadow-2xl">
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                ))}

                {(!printerData?.portfolio || printerData.portfolio.length === 0) && (
                    <div className="col-span-full py-32 text-center bg-white border-2 border-dashed border-dark/10 rounded-[3.5rem]">
                        <ImageIcon size={64} className="mx-auto text-dark/10 mb-8" />
                        <h3 className="text-2xl font-black text-dark/40 mb-4 tracking-tight">Votre portfolio est vide</h3>
                        <p className="text-dark/30 max-w-sm mx-auto">Une vitrine visuelle augmente vos chances d'obtenir des commandes de 40%.</p>
                        <button className="mt-8 px-8 py-4 bg-dark/5 text-dark font-bold rounded-2xl hover:bg-dark/10 transition-all">Commencer à uploader</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardPortfolio;
