import React, { useState, useEffect } from 'react';
import { Plus, Wrench, X, Save, Loader2, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const DashboardServices = ({ printerData, onUpdate, autoOpenModal, setAutoOpenModal, showToast, showConfirm }) => {
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newService, setNewService] = useState({ name: '', description: '', price: '', quantity: '' });
    const [customParams, setCustomParams] = useState([]);

    useEffect(() => {
        if (autoOpenModal) {
            setIsModalOpen(true);
            setAutoOpenModal(false);
        }
    }, [autoOpenModal, setAutoOpenModal]);

    const handleAddService = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        const finalService = {
            ...newService,
            parameters: customParams.filter(p => p.label.trim() !== '' && p.value.trim() !== '')
        };
        const updatedServices = [...(printerData.services || []), finalService];
        
        if (printerData?.isMock) {
            const updatedPrinter = { ...printerData, services: updatedServices };
            localStorage.setItem(`mock_printer_${printerData.id}`, JSON.stringify(updatedPrinter));
            onUpdate();
            setIsModalOpen(false);
            setNewService({ name: '', description: '', price: '', quantity: '' });
            setCustomParams([]);
            showToast("Service ajouté avec succès (Mode Démo) !");
            setLoading(false);
            return;
        }

        const { error } = await supabase
            .from('printers')
            .update({ services: updatedServices })
            .eq('id', printerData.id);

        if (!error) {
            onUpdate();
            setIsModalOpen(false);
            setNewService({ name: '', description: '', price: '', quantity: '' });
            setCustomParams([]);
            showToast("Service ajouté avec succès !");
        } else {
            showToast("Erreur lors de l'ajout : " + error.message, 'error');
        }
        setLoading(false);
    };

    const removeService = async (index) => {
        const confirmed = await showConfirm("Suppression de service", "Êtes-vous sûr de vouloir supprimer ce service ?");
        if (!confirmed) return;
        
        const updatedServices = printerData.services.filter((_, i) => i !== index);

        if (printerData?.isMock) {
            const updatedPrinter = { ...printerData, services: updatedServices };
            localStorage.setItem(`mock_printer_${printerData.id}`, JSON.stringify(updatedPrinter));
            onUpdate();
            showToast("Service supprimé avec succès (Mode Démo) !");
            return;
        }

        const { error } = await supabase
            .from('printers')
            .update({ services: updatedServices })
            .eq('id', printerData.id);
        
        if (!error) {
            onUpdate();
            showToast("Service supprimé avec succès !");
        } else {
            showToast("Erreur lors de la suppression : " + error.message, 'error');
        }
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
                        <div>
                            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-8 group-hover:scale-110 transition-transform">
                                <Wrench size={28} />
                            </div>
                            <h3 className="text-2xl font-bold mb-3 tracking-tight">{s.name}</h3>
                            <p className="text-dark/40 text-sm leading-relaxed mb-6 font-medium">{s.description}</p>
                            {s.parameters && s.parameters.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {s.parameters.map((param, pIdx) => (
                                        <span key={pIdx} className="text-[10px] font-bold text-primary bg-primary/5 px-2.5 py-1 rounded-lg">
                                            {param.label} : {param.value}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-dark/5 mt-auto">
                            <span className="text-[10px] font-black uppercase tracking-widest text-dark/30 flex items-center gap-1.5">
                                <CreditCard size={12} />
                                Tarif
                            </span>
                            <span className="font-black text-xs text-primary bg-primary/5 px-3 py-1.5 rounded-lg">
                                {s.price ? `à partir de ${s.price} FCFA ${s.quantity ? `/ ${s.quantity}` : ''}` : 'Sur devis'}
                            </span>
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
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-primary/20 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] p-10 w-full max-w-lg relative z-10 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black">Nouveau Service</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-dark/5 rounded-xl"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddService} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Nom du service (Obligatoire)</label>
                                <input 
                                    required
                                    placeholder="Ex: Impression de Bâches"
                                    className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold"
                                    value={newService.name}
                                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Prix de départ (FCFA - Optionnel)</label>
                                    <input 
                                        type="text"
                                        placeholder="Ex: 15 000"
                                        className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm"
                                        value={newService.price}
                                        onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Pour quelle quantité ? (Optionnel)</label>
                                    <input 
                                        type="text"
                                        placeholder="Ex: 500 pièces"
                                        className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm"
                                        value={newService.quantity}
                                        onChange={(e) => setNewService({ ...newService, quantity: e.target.value })}
                                    />
                                </div>
                            </div>

                             <div className="space-y-2">
                                 <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Description courte (Obligatoire)</label>
                                 <textarea 
                                     required
                                     rows="3"
                                     placeholder="Détails sur ce que vous proposez..."
                                     className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold resize-none"
                                     value={newService.description}
                                     onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                                 ></textarea>
                             </div>
                             
                             {/* Paramètres personnalisés */}
                             <div className="space-y-4 pt-4 border-t border-dark/5">
                                 <div className="flex justify-between items-center">
                                     <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Paramètres (Ex: dimensions, pièces...)</label>
                                     <button 
                                         type="button"
                                         onClick={() => setCustomParams([...customParams, { label: '', value: '' }])}
                                         className="text-[10px] font-black uppercase text-primary hover:underline flex items-center gap-1 font-bold"
                                     >
                                         + Ajouter
                                     </button>
                                 </div>
                                 
                                 {customParams.map((p, idx) => (
                                     <div key={idx} className="flex gap-2 items-center animate-in fade-in slide-in-from-top-2">
                                         <input 
                                             placeholder="Nom (Ex: Dimensions)"
                                             className="flex-1 bg-dark/5 border-2 border-transparent rounded-xl px-4 py-3 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-xs"
                                             value={p.label}
                                             onChange={(e) => {
                                                 const updated = [...customParams];
                                                 updated[idx].label = e.target.value;
                                                 setCustomParams(updated);
                                             }}
                                         />
                                         <input 
                                             placeholder="Valeur (Ex: 2x3m)"
                                             className="flex-1 bg-dark/5 border-2 border-transparent rounded-xl px-4 py-3 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-xs"
                                             value={p.value}
                                             onChange={(e) => {
                                                 const updated = [...customParams];
                                                 updated[idx].value = e.target.value;
                                                 setCustomParams(updated);
                                             }}
                                         />
                                         <button 
                                             type="button"
                                             onClick={() => setCustomParams(customParams.filter((_, i) => i !== idx))}
                                             className="p-3 bg-red-50 text-red-500 rounded-xl hover:scale-105 active:scale-95 transition-all shrink-0"
                                         >
                                             <X size={16} />
                                         </button>
                                     </div>
                                 ))}
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
