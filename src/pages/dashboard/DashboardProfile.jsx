import React, { useState } from 'react';
import { Camera, Save, Loader2, MapPin, Phone, Globe, Mail, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const DashboardProfile = ({ printerData, onUpdate }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: printerData?.name || '',
        description: printerData?.description || '',
        city: printerData?.city || '',
        phone: printerData?.phone || '',
        website: printerData?.website || '',
        address: printerData?.address || '',
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        const { error } = await supabase
            .from('printers')
            .update(formData)
            .eq('id', printerData.id);

        if (!error) {
            onUpdate();
            alert('Profil mis à jour avec succès !');
        }
        setLoading(false);
    };

    return (
        <div className="max-w-4xl">
            <header className="mb-12">
                <h2 className="text-4xl font-black tracking-tight mb-2">Editer Profil Public</h2>
                <p className="text-dark/40 text-lg">Ces informations seront visibles par tous vos clients sur votre page vitrine.</p>
            </header>

            <form onSubmit={handleUpdate} className="space-y-12">
                {/* Visual Identity */}
                <div className="bg-white border border-dark/5 rounded-[3rem] p-10 space-y-10 shadow-xl shadow-dark/5">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                            <Camera size={20} />
                        </div>
                        <h3 className="text-xl font-bold">Identité Visuelle</h3>
                    </div>

                    <div className="flex flex-col md:flex-row gap-12 items-start">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-[2.5rem] bg-dark/5 overflow-hidden border-4 border-white shadow-2xl relative z-10">
                                <img src={printerData?.logo_url} alt="Logo" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                    <Camera size={24} className="text-white" />
                                </div>
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-accent rounded-full flex items-center justify-center text-white border-4 border-white shadow-xl z-20">
                                <Camera size={16} />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-dark/30 mt-6 text-center">Logo</p>
                        </div>

                        <div className="flex-1 w-full relative group">
                            <div className="h-40 rounded-[2.5rem] bg-dark/5 overflow-hidden border-4 border-white shadow-2xl relative z-10">
                                <img src={printerData?.cover_url} alt="Cover" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                    <Camera size={32} className="text-white" />
                                </div>
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-dark/30 mt-4">Photo de couverture</p>
                        </div>
                    </div>
                </div>

                {/* Information Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6 bg-white border border-dark/5 rounded-[3rem] p-10 shadow-xl shadow-dark/5">
                        <div className="flex items-center gap-3 mb-4">
                            <Info size={18} className="text-primary" />
                            <h3 className="font-bold">Informations de base</h3>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Nom de l'enseigne</label>
                            <input 
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Description / Slogan</label>
                            <textarea 
                                name="description"
                                rows="4"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Décrivez votre expertise en quelques mots..."
                                className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold resize-none"
                            ></textarea>
                        </div>
                    </div>

                    <div className="space-y-6 bg-white border border-dark/5 rounded-[3rem] p-10 shadow-xl shadow-dark/5">
                        <div className="flex items-center gap-3 mb-4">
                            <MapPin size={18} className="text-primary" />
                            <h3 className="font-bold">Coordonnées</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Ville</label>
                                <input 
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Téléphone</label>
                                <input 
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Adresse physique</label>
                            <input 
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Site Web (Optionnel)</label>
                            <input 
                                name="website"
                                value={formData.website}
                                onChange={handleChange}
                                placeholder="https://..."
                                className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-8">
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="bg-primary text-white px-12 py-5 rounded-[2rem] font-black text-lg flex items-center gap-3 shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <><Save size={22} /> Enregistrer les modifications</>}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default DashboardProfile;
