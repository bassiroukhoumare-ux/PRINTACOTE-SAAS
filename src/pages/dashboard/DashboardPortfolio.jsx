import React, { useState, useRef, useEffect } from 'react';
import { Plus, Image as ImageIcon, X, Loader2, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const DashboardPortfolio = ({ printerData, onUpdate, autoOpenModal, setAutoOpenModal }) => {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const [activeImage, setActiveImage] = useState(null);

    useEffect(() => {
        if (autoOpenModal) {
            fileInputRef.current?.click();
            setAutoOpenModal(false);
        }
    }, [autoOpenModal, setAutoOpenModal]);

    const getImageUrl = (item) => {
        if (!item) return '';
        if (typeof item === 'string') {
            try {
                const parsed = JSON.parse(item);
                return parsed.image_url || parsed.url || item;
            } catch (e) {
                return item;
            }
        }
        return item.image_url || item.url || '';
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `${printerData.id}/portfolio_${Date.now()}.${fileExt}`;

        try {
            // Attempt Supabase Storage Upload
            const { data, error } = await supabase.storage
                .from('public-assets')
                .upload(fileName, file, { cacheControl: '3600', upsert: true });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('public-assets')
                .getPublicUrl(fileName);

            const updatedPortfolio = [...(printerData.portfolio || []), { image_url: publicUrl }];

            const { error: updateError } = await supabase
                .from('printers')
                .update({ portfolio: updatedPortfolio })
                .eq('id', printerData.id);

            if (updateError) throw updateError;

            onUpdate();
            alert('Réalisation ajoutée au portfolio !');
        } catch (storageError) {
            console.warn("Storage upload failed, falling back to base64:", storageError.message);
            // Base64 Fallback
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result;
                const updatedPortfolio = [...(printerData.portfolio || []), { image_url: base64String }];
                const { error: dbError } = await supabase
                    .from('printers')
                    .update({ portfolio: updatedPortfolio })
                    .eq('id', printerData.id);

                if (!dbError) {
                    onUpdate();
                    alert('Réalisation ajoutée au portfolio !');
                } else {
                    alert("Erreur lors de l'ajout : " + dbError.message);
                }
            };
            reader.readAsDataURL(file);
        } finally {
            setUploading(false);
        }
    };

    const removePortfolioItem = async (index) => {
        if (!window.confirm("Voulez-vous vraiment supprimer cette réalisation ?")) return;

        const updatedPortfolio = printerData.portfolio.filter((_, i) => i !== index);

        const { error } = await supabase
            .from('printers')
            .update({ portfolio: updatedPortfolio })
            .eq('id', printerData.id);

        if (!error) {
            onUpdate();
        } else {
            alert("Erreur lors de la suppression : " + error.message);
        }
    };

    return (
        <div className="max-w-6xl">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                <div>
                    <h2 className="text-4xl font-black tracking-tight mb-2">Portfolio</h2>
                    <p className="text-dark/40 text-lg">Mettez en avant vos plus belles réalisations visuelles.</p>
                </div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    className="hidden" 
                />
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="bg-primary text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                    {uploading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                    Uploader un projet
                </button>
            </header>
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {printerData?.portfolio?.map((item, i) => (
                    <div key={i} className="aspect-square bg-white rounded-[2.5rem] overflow-hidden relative group shadow-xl border border-dark/5">
                        <img src={getImageUrl(item)} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-dark/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 p-6">
                            <button 
                                onClick={() => setActiveImage(getImageUrl(item))}
                                className="bg-white text-dark p-4 rounded-2xl hover:scale-110 transition-transform shadow-2xl cursor-pointer"
                            >
                                <Eye size={20} />
                            </button>
                            <button 
                                onClick={() => removePortfolioItem(i)}
                                className="bg-red-500 text-white p-4 rounded-2xl hover:scale-110 transition-transform shadow-2xl"
                            >
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
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-8 px-8 py-4 bg-dark/5 text-dark font-bold rounded-2xl hover:bg-dark/10 transition-all"
                        >
                            Commencer à uploader
                        </button>
                    </div>
                )}
            </div>

            {/* Image Lightbox Modal */}
            {activeImage && (
                <div 
                    onClick={() => setActiveImage(null)}
                    className="fixed inset-0 z-[300] bg-dark/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-300"
                >
                    <button 
                        onClick={() => setActiveImage(null)}
                        className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-[310]"
                    >
                        <X size={24} />
                    </button>
                    <div className="max-w-5xl max-h-[90vh] rounded-[2.5rem] overflow-hidden border-4 border-white/20 shadow-2xl relative z-[305] animate-in zoom-in-95 duration-300">
                        <img 
                            src={activeImage} 
                            alt="Agrandissement" 
                            className="max-w-full max-h-[85vh] object-contain pointer-events-none" 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPortfolio;
