import React, { useState, useRef } from 'react';
import { Camera, Save, Loader2, MapPin, Phone, Globe, Info, Lock, AlertCircle, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { compressImage } from '../../lib/image';

const DashboardProfile = ({ printerData, onUpdate, showToast, limits, requireUpgrade, user }) => {
    const [loading, setLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const logoInputRef = useRef(null);
    const coverInputRef = useRef(null);

    // Password modification states
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);

    // Deletion states
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [confirmEmail, setConfirmEmail] = useState('');
    const [checkUnderstand, setCheckUnderstand] = useState(false);
    const [checkConfirm, setCheckConfirm] = useState(false);
    const [deleteReason, setDeleteReason] = useState("Je ne trouve pas de clients");
    const [otherReason, setOtherReason] = useState("");
    const [deleting, setDeleting] = useState(false);

    const handleDeleteAccount = async () => {
        if (!user?.email) return;
        if (confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
            showToast("L'adresse email saisie ne correspond pas à votre compte.", "error");
            return;
        }
        if (!checkUnderstand || !checkConfirm) {
            showToast("Veuillez cocher les cases de confirmation.", "error");
            return;
        }
        setDeleting(true);
        try {
            const deletionDate = new Date();
            deletionDate.setHours(deletionDate.getHours() + 24);
            const reason = deleteReason === 'Autre' ? otherReason : deleteReason;

            if (printerData.isMock) {
                const updated = {
                    ...printerData,
                    deletion_scheduled_at: deletionDate.toISOString(),
                    deletion_reason: reason,
                    status: 'Désactivé'
                };
                localStorage.setItem(`mock_printer_${printerData.id}`, JSON.stringify(updated));
                onUpdate();
                showToast("Votre compte a été programmé pour suppression définitive dans 24 heures.", "success");
                setShowDeleteModal(false);
            } else {
                const { error } = await supabase
                    .from('printers')
                    .update({
                        deletion_scheduled_at: deletionDate.toISOString(),
                        deletion_reason: reason,
                        status: 'Désactivé'
                    })
                    .eq('id', printerData.id);
                if (error) throw error;

                // Send email to printer (or try)
                try {
                    await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer re_XeoRktvs_PsxnNiL6TgGc3Wz89BET2rY8',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            from: 'Printacoté <onboarding@resend.dev>',
                            to: user.email,
                            subject: 'Confirmation de planification de suppression de compte',
                            html: `
                                <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px;">
                                    <h2 style="color: #ea580c;">Suppression de compte planifiée</h2>
                                    <p>Bonjour ${printerData.name || 'Imprimeur'},</p>
                                    <p>Nous vous informons que la suppression de votre compte Printacoté a été planifiée suite à votre demande.</p>
                                    <p>Votre vitrine publique a été <strong>désactivée immédiatement</strong> et n'est plus visible par le public.</p>
                                    <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #fee2e2;">
                                        <p style="margin: 0; color: #991b1b; font-weight: bold;">
                                            La suppression définitive de toutes vos données aura lieu le : ${deletionDate.toLocaleString('fr-FR')} (dans 24 heures).
                                        </p>
                                    </div>
                                    <p><strong>Vous avez changé d'avis ?</strong></p>
                                    <p>Vous pouvez annuler cette procédure à tout moment durant les prochaines 24 heures en vous connectant simplement à votre tableau de bord et en clicking sur le bouton "Annuler la suppression".</p>
                                    <p>Si vous n'intervenez pas, votre compte et l'ensemble de ses données seront définitivement et irréversiblement effacés.</p>
                                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                                    <p style="font-size: 12px; color: #666; text-align: center;">Printacoté - Le réseau des imprimeurs locaux</p>
                                </div>
                            `
                        })
                    });
                } catch (emailErr) {
                    console.warn("Erreur envoi email suppression imprimante:", emailErr);
                }

                // Send email to admin
                try {
                    await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer re_XeoRktvs_PsxnNiL6TgGc3Wz89BET2rY8',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            from: 'Printacoté <onboarding@resend.dev>',
                            to: 'bskdezigner@gmail.com',
                            subject: `Alerte Suppression Compte : ${printerData.name}`,
                            html: `
                                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                                    <h2 style="color: #991b1b;">Notification Administrateur : Demande de suppression de compte</h2>
                                    <p>L'imprimerie <strong>${printerData.name}</strong> a planifié la suppression de son compte.</p>
                                    <p><strong>Détails du compte :</strong></p>
                                    <ul>
                                        <li><strong>ID :</strong> ${printerData.id}</li>
                                        <li><strong>Email de contact :</strong> ${user.email}</li>
                                        <li><strong>Ville / Pays :</strong> ${printerData.city || '-'} / ${printerData.country || 'Sénégal'}</li>
                                        <li><strong>Téléphone :</strong> ${printerData.phone || '-'}</li>
                                    </ul>
                                    <p><strong>Raison invoquée :</strong></p>
                                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; font-style: italic;">
                                        ${reason || 'Aucune raison spécifiée.'}
                                    </div>
                                    <p>La suppression est planifiée au : <strong>${deletionDate.toLocaleString('fr-FR')}</strong>.</p>
                                </div>
                            `
                        })
                    });
                } catch (emailErr) {
                    console.warn("Erreur envoi email suppression administrateur:", emailErr);
                }

                onUpdate();
                showToast("Votre compte a été programmé pour suppression définitive dans 24 heures.", "success");
                setShowDeleteModal(false);
            }
        } catch (err) {
            console.error("Erreur de suppression du compte:", err);
            showToast("Erreur lors de la planification de la suppression.", "error");
        } finally {
            setDeleting(false);
        }
    };

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
                                className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white border-4 border-white shadow-xl z-20 cursor-pointer hover:scale-110 transition-transform"
                            >
                                <Camera size={16} />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-dark/60 mt-6 text-center">Modifier Logo</p>
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
                            <p className="text-[10px] font-black uppercase tracking-widest text-dark/60 mt-4">Modifier Bannière</p>
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
                            <label className="text-[10px] font-black uppercase tracking-widest text-dark/60 ml-2">Nom de l'enseigne</label>
                            <input 
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                disabled={isNameLocked}
                                className={`w-full border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none transition-all font-bold text-dark
                                    ${isNameLocked ? 'bg-dark/5 text-dark/45 cursor-not-allowed opacity-75' : 'bg-dark/5 focus:bg-white focus:border-primary/20'}`}
                            />
                            {isNameLocked && (
                                <p className="text-[10px] text-red-500 font-bold ml-2 leading-relaxed">
                                    ⚠️ Modifiable une seule fois par mois. Prochaine modification possible dans {remainingDays} jour{remainingDays > 1 ? 's' : ''}.
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-dark/60 ml-2">Description / Slogan</label>
                            <textarea 
                                name="description"
                                rows="4"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Décrivez votre expertise en quelques mots..."
                                className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold resize-none text-dark"
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
                                <label className="text-[10px] font-black uppercase tracking-widest text-dark/60 ml-2">Pays (Non modifiable)</label>
                                <input 
                                    name="country"
                                    value={formData.country}
                                    disabled
                                    className="w-full bg-dark/5 text-dark/45 border-2 border-transparent rounded-2xl px-6 py-4 cursor-not-allowed opacity-75 font-bold text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dark/60 ml-2">Ville</label>
                                <input 
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm text-dark"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dark/60 ml-2">Téléphone</label>
                                <input 
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm text-dark"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dark/60 ml-2">Site Web</label>
                                <input 
                                    name="website"
                                    value={formData.website}
                                    onChange={handleChange}
                                    placeholder="https://..."
                                    className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm text-dark"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-dark/60 ml-2">Adresse physique</label>
                            <input 
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm text-dark"
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
                            <label className="text-[10px] font-black uppercase tracking-widest text-dark/60 ml-2">Facebook (Lien complet)</label>
                            <input 
                                name="facebook"
                                value={formData.facebook}
                                onChange={handleChange}
                                placeholder="https://facebook.com/..."
                                className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm text-dark"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-dark/60 ml-2">Instagram (Lien complet)</label>
                            <input 
                                name="instagram"
                                value={formData.instagram}
                                onChange={handleChange}
                                placeholder="https://instagram.com/..."
                                className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm text-dark"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-dark/60 ml-2">TikTok (Lien complet)</label>
                            <input 
                                name="tiktok"
                                value={formData.tiktok}
                                onChange={handleChange}
                                placeholder="https://tiktok.com/@..."
                                className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm text-dark"
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
                        <label className="text-[10px] font-black uppercase tracking-widest text-dark/60 ml-2">Nouveau mot de passe</label>
                        <input 
                            type="password"
                            required
                            disabled={isPasswordChangeLocked}
                            placeholder="Minimum 6 caractères"
                            className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm disabled:opacity-50 text-dark"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-dark/60 ml-2">Confirmer le nouveau mot de passe</label>
                        <input 
                            type="password"
                            required
                            disabled={isPasswordChangeLocked}
                            placeholder="Ressaisir le mot de passe"
                            className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm disabled:opacity-50 text-dark"
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

            {/* Danger Zone (Account Deletion) */}
            <div className="mt-12 bg-red-50 border border-red-200 rounded-[3rem] p-10 space-y-6 shadow-xl shadow-red-50">
                <div className="flex items-center gap-3 mb-2">
                    <AlertCircle size={22} className="text-red-600" />
                    <h3 className="font-bold text-red-700">Zone de danger</h3>
                </div>
                <p className="text-sm text-red-700/80 leading-relaxed font-semibold">
                    Vous pouvez planifier la suppression définitive de votre compte. 
                    Votre vitrine publique sera désactivée immédiatement, et toutes vos données (profil, services, réalisations, boutique) seront définitivement effacées sous 24 heures.
                </p>
                <div className="flex justify-start">
                    <button 
                        type="button"
                        onClick={() => {
                            setConfirmEmail('');
                            setCheckUnderstand(false);
                            setCheckConfirm(false);
                            setShowDeleteModal(true);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-red-600/20 text-sm animate-pulse"
                    >
                        <Trash2 size={16} /> Planifier la suppression de mon compte
                    </button>
                </div>
            </div>

            {showDeleteModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-primary/20 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] p-8 md:p-10 w-full max-w-lg my-8 relative z-10 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar text-dark">
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <h3 className="text-xl font-black text-red-600 uppercase tracking-wider flex items-center gap-2 font-bold">
                                <AlertCircle size={20} /> Suppression du compte
                            </h3>
                            <button onClick={() => setShowDeleteModal(false)} className="p-2 bg-dark/5 rounded-xl text-dark/60 hover:text-dark">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="p-4 bg-red-50 border border-red-200 text-xs font-semibold leading-relaxed text-red-800 rounded-2xl">
                                ⚠️ Votre vitrine sera masquée immédiatement de l'annuaire. Vous disposez d'un délai de grâce de 24 heures pour réactiver votre compte en vous y reconnectant. Passé ce délai, toutes vos données seront effacées de manière définitive et irréversible.
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dark/60 ml-2 block">
                                    Veuillez saisir votre adresse e-mail pour confirmer
                                </label>
                                <input 
                                    type="email"
                                    placeholder={user?.email || "votre@email.com"}
                                    value={confirmEmail}
                                    onChange={(e) => setConfirmEmail(e.target.value)}
                                    className="w-full bg-dark/5 border-2 border-transparent focus:border-red-500/20 rounded-2xl px-6 py-4 focus:outline-none focus:bg-white transition-all font-bold text-sm text-dark"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dark/60 ml-2 block">
                                    Pourquoi souhaitez-vous supprimer votre page ? (Optionnel)
                                </label>
                                <select 
                                    value={deleteReason}
                                    onChange={(e) => setDeleteReason(e.target.value)}
                                    className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white transition-all font-bold text-sm text-dark font-sans"
                                >
                                    <option value="Je ne trouve pas de clients">Je ne trouve pas de clients</option>
                                    <option value="Le service est trop cher">Le service est trop cher</option>
                                    <option value="J'ai trouvé une autre alternative">J'ai trouvé une autre alternative</option>
                                    <option value="Problèmes techniques récurrents">Problèmes techniques récurrents</option>
                                    <option value="Autre">Autre (Préciser ci-dessous)</option>
                                </select>
                            </div>

                            {deleteReason === 'Autre' && (
                                <div className="space-y-2 animate-in fade-in duration-300">
                                    <textarea 
                                        rows="3"
                                        placeholder="Veuillez préciser la raison..."
                                        value={otherReason}
                                        onChange={(e) => setOtherReason(e.target.value)}
                                        className="w-full bg-dark/5 border-2 border-transparent focus:border-red-500/20 rounded-2xl px-6 py-4 focus:outline-none focus:bg-white transition-all font-bold text-sm text-dark resize-none font-sans"
                                    />
                                </div>
                            )}

                            <div className="space-y-3 border-t border-dark/5 pt-4">
                                <label className="flex items-start gap-3 cursor-pointer select-none">
                                    <input 
                                        type="checkbox"
                                        checked={checkUnderstand}
                                        onChange={(e) => setCheckUnderstand(e.target.checked)}
                                        className="w-5 h-5 accent-red-600 rounded mt-0.5 font-sans"
                                    />
                                    <span className="text-xs font-semibold text-dark/70">
                                        Je comprends que ma vitrine publique sera désactivée immédiatement et ne sera plus visible.
                                    </span>
                                </label>

                                <label className="flex items-start gap-3 cursor-pointer select-none">
                                    <input 
                                        type="checkbox"
                                        checked={checkConfirm}
                                        onChange={(e) => setCheckConfirm(e.target.checked)}
                                        className="w-5 h-5 accent-red-600 rounded mt-0.5 font-sans"
                                    />
                                    <span className="text-xs font-semibold text-dark/70">
                                        Je confirme vouloir supprimer définitivement mon compte et toutes ses données sous 24 heures.
                                    </span>
                                </label>
                            </div>

                            <div className="flex gap-4 pt-4 shrink-0">
                                <button 
                                    type="button"
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 py-4 bg-dark/5 text-dark hover:bg-dark/10 rounded-2xl font-bold transition-all text-xs uppercase tracking-widest"
                                >
                                    Annuler
                                </button>
                                <button 
                                    type="button"
                                    onClick={handleDeleteAccount}
                                    disabled={deleting}
                                    className="flex-1 py-4 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 rounded-2xl font-black transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                                >
                                    {deleting ? <Loader2 className="animate-spin" size={14} /> : null}
                                    Confirmer la suppression
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardProfile;
