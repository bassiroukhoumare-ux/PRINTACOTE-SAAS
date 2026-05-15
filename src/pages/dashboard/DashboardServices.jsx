import React, { useState } from 'react';
import { Plus, Wrench, X, Save, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const DashboardServices = ({ printerData, onUpdate }) => {
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newService, setNewService] = useState({ name: '', description: '' });

    const handleAddService = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        const updatedServices = [...(printerData.services || []), newService];
        
        const { error } = await supabase
            .from('printers')
            .update({ services: updatedServices })
            .eq('id', printerData.id);

        if (!error) {
            onUpdate();
            setIsModalOpen(false);
            setNewService({ name: '', description: '' });
        }
        setLoading(false);
    };

    const removeService = async (index) => {
        const updatedServices = printerData.services.filter((_, i) => i !== index);
        const { error } = await supabase
            .from('printers')
            .update({ services: updatedServices })
            .eq('id', printerData.id);
        
        if (!error) onUpdate();
    };

    return (
        <div className="max-w-5xl">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                <div>
                    <h2 className="text-4xl font-black tracking-tight mb-2">Services & Expertises</h2>
                    <p className="text-dark/40 text-lg">Définissez ce que vous savez faire le mieux.</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-primary text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                >
                    <Plus size={20} /> Ajouter un service
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {printerData?.services?.map((s, i) => (
                    <div key={i} className="bg-white border border-dark/5 rounded-[2.5rem] p-10 flex flex-col justify-between group hover:shadow-2xl transition-all duration-500 relative">
                        <button 
                            onClick={() => removeService(i)}
                            className="absolute top-6 right-6 w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X size={20} />
                        </button>
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-8 group-hover:scale-110 transition-transform">
                            <Wrench size={28} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold mb-3 tracking-tight">{s.name}</h3>
                            <p className="text-dark/40 leading-relaxed">{s.description}</p>
                        </div>
                    </div>
                ))}

                {(!printerData?.services || printerData.services.length === 0) && (
                    <div className="col-span-full py-24 text-center bg-white border-2 border-dashed border-dark/10 rounded-[3rem]">
                        <Wrench size={48} className="mx-auto text-dark/10 mb-6" />
                        <h3 className="text-xl font-bold text-dark/40 mb-2">Aucun service listé</h3>
                        <p className="text-dark/30">Ajoutez vos expertises pour attirer plus de clients.</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-dark/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                    <div className="bg-white rounded-[3rem] p-10 w-full max-w-lg relative z-10 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black">Nouveau Service</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-dark/5 rounded-xl"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddService} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Nom du service</label>
                                <input 
                                    required
                                    placeholder="Ex: Impression de Bâches"
                                    className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold"
                                    value={newService.name}
                                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Description courte</label>
                                <textarea 
                                    required
                                    rows="3"
                                    placeholder="Détails sur ce que vous proposez..."
                                    className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold resize-none"
                                    value={newService.description}
                                    onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                                ></textarea>
                            </div>
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full bg-primary text-white py-5 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-primary/20"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <><Plus size={22} /> Ajouter le service</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardServices;
