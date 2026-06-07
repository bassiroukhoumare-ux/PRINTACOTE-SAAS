import React, { useState, useRef } from 'react';
import { Camera, Save, Loader2, MapPin, Phone, Globe, Info, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { compressImage } from '../../lib/image';

const DashboardProfile = ({ printerData, onUpdate, showToast, limits, requireUpgrade }) => {
    const [loading, setLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const logoInputRef = useRef(null);
    const coverInputRef = useRef(null);

    // Password modification states
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);

    const getRemainingPasswordDays = () => {
        const lastChange = localStorage.getItem('last_password_change_date');
        if (!lastChange) return 0;
        const lastChangeDate = new Date(lastChange);
        const nextAllowed = new Date(lastChangeDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        const diffTime = nextAllowed - new Date();
        return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    };

    const remainingPassDays = getRemainingPasswordDays();
    const isPasswordChangeLocked = remainingPassDays > 0;

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        if (isPasswordChangeLocked) {
            showToast(`Vous ne pouvez modifier votre mot de passe qu'une fois par mois. Réessayez dans ${remainingPassDays} jour(s).`, 'error');
            return;
        }
        if (newPassword !== confirmPassword) {
            showToast('Les mots de passe ne correspondent pas.', 'error');
            return;
        }
        if (newPassword.length < 6) {
            showToast('Le mot de passe doit faire au moins 6 caractères.', 'error');
            return;
        }
        
        setPasswordLoading(true);
        if (printerData?.isMock) {
            showToast('Votre mot de passe a été modifié avec succès (Mode Démo) !');
            setNewPassword('');
            setConfirmPassword('');
            localStorage.setItem('last_password_change_date', new Date().toISOString());
        } else {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (!error) {
                showToast('Votre mot de passe a été modifié avec succès !');
                setNewPassword('');
                setConfirmPassword('');
                localStorage.setItem('last_password_change_date', new Date().toISOString());
            } else {
                showToast('Erreur lors de la modification : ' + error.message, 'error');
            }
        }
        setPasswordLoading(false);
    };

    const [formData, setFormData] = useState({
        name: printerData?.name || '',
        description: printerData?.description || '',
        city: printerData?.city || '',
        phone: printerData?.phone || '',
        website: printerData?.website || '',
        address: printerData?.address || '',
        facebook: printerData?.facebook || '',
        instagram: printerData?.instagram || '',
        tiktok: printerData?.tiktok || '',
        country: printerData?.country || 'Sénégal',
    });

    const canEditName = () => {
        if (!printerData?.name_last_modified_at) return true;
        const lastModified = new Date(printerData.name_last_modified_at);
        const diffTime = Math.abs(new Date() - lastModified);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 30;
    };

    const getRemainingDays = () => {
        if (!printerData?.name_last_modified_at) return 0;
        const lastModified = new Date(printerData.name_last_modified_at);
        const nextAllowed = new Date(lastModified.getTime() + 30 * 24 * 60 * 60 * 1000);
        const diffTime = nextAllowed - new Date();
        return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setUploadingImage(true);

        if (printerData?.isMock) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result;
                const updatedPrinter = {
                    ...printerData,
                    [type === 'logo' ? 'logo_url' : 'cover_url']: base64String
                };
                localStorage.setItem(`mock_printer_${printerData.id}`, JSON.stringify(updatedPrinter));
                onUpdate();
                showToast('Image mise à jour avec succès (Mode Démo) !');
                setUploadingImage(false);
            };
            reader.readAsDataURL(file);
            return;
        }

        try {
            // Compress the image before uploading
            const maxDimension = type === 'logo' ? 400 : 1400;
            const compressedFile = await compressImage(file, maxDimension, maxDimension, 0.85);

            const fileExt = compressedFile.name.split('.').pop();
            const fileName = `${printerData.id}/${type}_${Date.now()}.${fileExt}`;

            // Attempt Supabase Storage Upload
            const { data, error } = await supabase.storage
                .from('public-assets')
                .upload(fileName, compressedFile, { cacheControl: '3600', upsert: true });
                
            if (error) throw error;
            
            const { data: { publicUrl } } = supabase.storage
                .from('public-assets')
                .getPublicUrl(fileName);
                
            const { error: updateError } = await supabase
                .from('printers')
                .update({ [type === 'logo' ? 'logo_url' : 'cover_url']: publicUrl })
                .eq('id', printerData.id);
                
            if (updateError) throw updateError;
            
            onUpdate();
            showToast('Image mise à jour avec succès !');
        } catch (storageError) {
            console.warn("Storage upload failed, falling back to base64:", storageError.message);
            // Base64 Fallback
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result;
                const { error: dbError } = await supabase
                    .from('printers')
                    .update({ [type === 'logo' ? 'logo_url' : 'cover_url']: base64String })
                    .eq('id', printerData.id);
                
                if (!dbError) {
                    onUpdate();
                    showToast('Image mise à jour avec succès !');
                } else {
                    showToast('Erreur lors de la mise à jour : ' + dbError.message, 'error');
                }
            };
            reader.readAsDataURL(file);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        const payload = { ...formData };
        delete payload.country; // Country is not modifiable
        
        // Handle name edit constraint
        if (formData.name !== printerData.name) {
            if (!canEditName()) {
                showToast("Erreur : Le nom de l'enseigne ne peut être modifié qu'une fois par mois.", 'error');
                setLoading(false);
                return;
            }
            payload.name_last_modified_at = new Date().toISOString();
        }
        
        if (limits && !limits.canSocialLinks) {
            delete payload.facebook;
            delete payload.instagram;
            delete payload.tiktok;
        }

        if (printerData?.isMock) {
            const updatedPrinter = { ...printerData, ...payload };
            localStorage.setItem(`mock_printer_${printerData.id}`, JSON.stringify(updatedPrinter));
            onUpdate();
            showToast('Profil mis à jour avec succès (Mode Démo) !');
            setLoading(false);
            return;
        }

        const { error } = await supabase
            .from('printers')
            .update(payload)
            .eq('id', printerData.id);

        if (!error) {
            onUpdate();
            showToast('Profil mis à jour avec succès !');
        } else {
            showToast('Erreur lors de la mise à jour : ' + error.message, 'error');
        }
        setLoading(false);
    };

    const isNameLocked = !canEditName();
    const remainingDays = isNameLocked ? getRemainingDays() : 0;

    return (
        <div className="max-w-4xl">
            <header className="mb-12">
                <h2 className="text-4xl font-black tracking-tight mb-2">Editer Profil Public</h2>
                <p className="text-dark/40 text-lg">Ces informations seront visibles par tous vos clients sur votre page vitrine.</p>
            </header>

            {/* Hidden File Inputs */}
            <input 
                type="file" 
                ref={logoInputRef} 
                onChange={(e) => handleFileChange(e, 'logo')} 
                accept="image/*" 
                className="hidden" 
            />
            <input 
                type="file" 
                ref={coverInputRef} 
                onChange={(e) => handleFileChange(e, 'cover')} 
                accept="image/*" 
                className="hidden" 
            />

            <form onSubmit={handleUpdate} className="space-y-12">
                {/* Visual Identity */}
                <div className="bg-white border border-dark/5 rounded-[3rem] p-10 space-y-10 shadow-xl shadow-dark/5 relative">
                    {uploadingImage && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 rounded-[3rem] flex items-center justify-center">
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="animate-spin text-primary" size={32} />
                                <span className="font-bold text-xs uppercase tracking-widest text-primary">Téléchargement...</span>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                            <Camera size={20} />
                        </div>
                        <h3 className="text-xl font-bold">Identité Visuelle</h3>
                    </div>

                    <div className="flex flex-col md:flex-row gap-12 items-start">
                        {/* Logo Upload Box */}
                        <div className="relative group mx-auto md:mx-0">
                            <div 
                                onClick={() => logoInputRef.current?.click()}
                                className="w-32 h-32 rounded-[2.5rem] bg-dark/5 overflow-hidden border-4 border-white shadow-2xl relative z-10 cursor-pointer group"
                            >
                                <img src={printerData?.logo_url} alt="Logo" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Camera size={24} className="text-white animate-pulse" />
                                </div>
                            </div>
                            <div 
                                onClick={() => logoInputRef.current?.click()}
                                className="absolute -bottom-2 -right-2 w-10 h-10 bg-accent rounded-full flex items-center justify-center text-white border-4 border-white shadow-xl z-20 cursor-pointer hover:scale-110 transition-transform"
                            >
                                <Camera size={16} />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-dark/30 mt-6 text-center">Modifier Logo</p>
                        </div>

                        {/* Cover Upload Box */}
                        <div className="flex-1 w-full relative group">
                            <div 
                                onClick={() => coverInputRef.current?.click()}
                                className="h-40 rounded-[2.5rem] bg-dark/5 overflow-hidden border-4 border-white shadow-2xl relative z-10 cursor-pointer"
                            >
                                <img src={printerData?.cover_url} alt="Cover" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Camera size={32} className="text-white animate-pulse" />
                                </div>
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-dark/30 mt-4">Modifier Bannière</p>
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
                                disabled={isNameLocked}
                                className={`w-full border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none transition-all font-bold 
                                    ${isNameLocked ? 'bg-dark/5 text-dark/40 cursor-not-allowed opacity-75' : 'bg-dark/5 focus:bg-white focus:border-primary/20'}`}
                            />
                            {isNameLocked && (
                                <p className="text-[10px] text-red-500 font-bold ml-2 leading-relaxed">
                                    ⚠️ Modifiable une seule fois par mois. Prochaine modification possible dans {remainingDays} jour{remainingDays > 1 ? 's' : ''}.
                                </p>
                            )}
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
                                <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Pays (Non modifiable)</label>
                                <input 
                                    name="country"
                                    value={formData.country}
                                    disabled
                                    className="w-full bg-dark/5 text-dark/45 border-2 border-transparent rounded-2xl px-6 py-4 cursor-not-allowed opacity-75 font-bold text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Ville</label>
                                <input 
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Téléphone</label>
                                <input 
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Site Web</label>
                                <input 
                                    name="website"
                                    value={formData.website}
                                    onChange={handleChange}
                                    placeholder="https://..."
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
                    </div>
                </div>

                {/* Social Networks */}
                <div className="bg-white border border-dark/5 rounded-[3rem] p-10 space-y-6 shadow-xl shadow-dark/5 relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-4">
                        <Globe size={18} className="text-primary" />
                        <h3 className="font-bold">Réseaux Sociaux</h3>
                    </div>

                    {limits && !limits.canSocialLinks && (
                        <button
                            type="button"
                            onClick={() => requireUpgrade?.('social')}
                            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/70 backdrop-blur-sm text-center px-6"
                        >
                            <Lock size={28} className="text-primary" />
                            <span className="font-black text-dark">Réservé aux abonnés</span>
                            <span className="text-xs font-bold text-primary underline">Débloquer avec un abonnement</span>
                        </button>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Facebook (Lien complet)</label>
                            <input 
                                name="facebook"
                                value={formData.facebook}
                                onChange={handleChange}
                                placeholder="https://facebook.com/..."
                                className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Instagram (Lien complet)</label>
                            <input 
                                name="instagram"
                                value={formData.instagram}
                                onChange={handleChange}
                                placeholder="https://instagram.com/..."
                                className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">TikTok (Lien complet)</label>
                            <input 
                                name="tiktok"
                                value={formData.tiktok}
                                onChange={handleChange}
                                placeholder="https://tiktok.com/@..."
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

            {/* Security Section (Password Modification) */}
            <form onSubmit={handlePasswordUpdate} className="mt-12 bg-white border border-dark/5 rounded-[3rem] p-10 space-y-8 shadow-xl shadow-dark/5">
                <div className="flex items-center gap-3 mb-4">
                    <Lock size={18} className="text-primary" />
                    <h3 className="font-bold">Sécurité & Mot de passe</h3>
                </div>

                {isPasswordChangeLocked && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 p-6 rounded-2xl text-xs font-semibold leading-relaxed">
                        ⚠️ Vous ne pouvez modifier votre mot de passe qu'une fois toutes les 30 secondes ou une fois par mois pour la sécurité de votre compte. 
                        Prochaine modification autorisée dans <span className="font-black text-amber-950">{remainingPassDays} jours</span>.
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Nouveau mot de passe</label>
                        <input 
                            type="password"
                            required
                            disabled={isPasswordChangeLocked}
                            placeholder="Minimum 6 caractères"
                            className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm disabled:opacity-50"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-dark/30 ml-2">Confirmer le nouveau mot de passe</label>
                        <input 
                            type="password"
                            required
                            disabled={isPasswordChangeLocked}
                            placeholder="Ressaisir le mot de passe"
                            className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm disabled:opacity-50"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button 
                        type="submit" 
                        disabled={passwordLoading || isPasswordChangeLocked}
                        className="bg-primary text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20 disabled:opacity-50 text-sm"
                    >
                        {passwordLoading ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Mettre à jour le mot de passe</>}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default DashboardProfile;
