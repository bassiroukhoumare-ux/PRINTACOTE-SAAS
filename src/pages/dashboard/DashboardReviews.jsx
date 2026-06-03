import React, { useState } from 'react';
import { Star, MessageSquare, CornerDownRight, Send, User, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const DashboardReviews = ({ printerData, onUpdate, showToast }) => {
    const [replyingToId, setReplyingToId] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [savingId, setSavingId] = useState(null);

    const getReviews = () => {
        const rawReviews = printerData?.reviews;
        if (!rawReviews) return [];
        if (typeof rawReviews === 'string') {
            try { return JSON.parse(rawReviews); } catch (e) { return []; }
        }
        return Array.isArray(rawReviews) ? rawReviews : [];
    };

    const reviews = getReviews();

    const handleSaveReply = async (reviewId) => {
        if (!replyText.trim()) return;
        setSavingId(reviewId);

        const updatedReviews = reviews.map(r => {
            if (r.id === reviewId) {
                return {
                    ...r,
                    reply: replyText,
                    replyDate: new Date().toLocaleDateString('fr-FR')
                };
            }
            return r;
        });

        // Mode Démo fallback
        if (printerData?.isMock) {
            const updatedPrinter = { ...printerData, reviews: updatedReviews };
            localStorage.setItem(`mock_printer_${printerData.id}`, JSON.stringify(updatedPrinter));
            onUpdate();
            showToast("Votre réponse a été enregistrée (Mode Démo) !", "success");
            setReplyingToId(null);
            setReplyText('');
            setSavingId(null);
            return;
        }

        const { error } = await supabase
            .from('printers')
            .update({ reviews: updatedReviews })
            .eq('id', printerData.id);

        if (!error) {
            showToast("Votre réponse a été enregistrée avec succès !", "success");
            await onUpdate();
            setReplyingToId(null);
            setReplyText('');
        } else {
            showToast("Erreur lors de l'enregistrement de la réponse : " + error.message, "error");
        }
        setSavingId(null);
    };

    const handleStartReply = (review) => {
        setReplyingToId(review.id);
        setReplyText(review.reply || '');
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-dark/5 pb-6">
                <div>
                    <h2 className="text-2xl sm:text-4xl font-black text-dark tracking-tight">Avis Clients</h2>
                    <p className="text-dark/40 text-xs sm:text-sm font-medium mt-1">
                        Consultez et répondez aux avis laissés par vos clients sur votre profil public.
                    </p>
                </div>
            </div>

            {/* List of reviews */}
            <div className="space-y-6">
                {reviews.length === 0 ? (
                    <div className="py-24 text-center bg-white border-2 border-dashed border-dark/10 rounded-[3rem] space-y-4">
                        <div className="w-16 h-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-600 mx-auto">
                            <Star size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-dark/70">Aucun avis pour le moment</h3>
                        <p className="text-dark/40 text-sm max-w-sm mx-auto leading-relaxed">
                            Les évaluations de vos clients apparaîtront ici dès qu'ils auront laissé un commentaire sur votre boutique.
                        </p>
                    </div>
                ) : (
                    reviews.map((rev) => (
                        <div key={rev.id} className="bg-white border border-dark/5 rounded-[2rem] p-6 sm:p-8 hover:shadow-xl transition-all duration-300 relative overflow-hidden">
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary shrink-0">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-dark text-base leading-tight">{rev.author}</h4>
                                        <span className="text-[10px] text-dark/40 font-mono font-bold uppercase tracking-wider">{rev.date}</span>
                                    </div>
                                </div>
                                <div className="flex gap-1 bg-yellow-500/5 px-3.5 py-1.5 rounded-full border border-yellow-500/10 shrink-0">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <Star key={s} size={14} className="text-yellow-600" fill={s <= rev.rating ? "currentColor" : "none"} />
                                    ))}
                                </div>
                            </div>

                            <p className="text-dark/70 font-medium leading-relaxed mb-6 text-sm">
                                "{rev.text}"
                            </p>

                            {/* Existing Reply */}
                            {rev.reply && replyingToId !== rev.id && (
                                <div className="mt-4 bg-[#FAF8F5] border border-dark/5 rounded-[1.5rem] p-5 pl-6 relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#C9A84C] rounded-l-[1.5rem]"></div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 text-[#C9A84C]">
                                            <CornerDownRight size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-wider">Votre réponse</span>
                                        </div>
                                        <span className="text-[9px] font-mono text-dark/40 font-bold uppercase tracking-wider">{rev.replyDate || rev.date}</span>
                                    </div>
                                    <p className="text-dark/70 text-xs font-semibold leading-relaxed">
                                        {rev.reply}
                                    </p>
                                    <div className="mt-4 flex gap-2">
                                        <button 
                                            onClick={() => handleStartReply(rev)}
                                            className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C] hover:underline"
                                        >
                                            Modifier
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Reply Input Form */}
                            {replyingToId === rev.id ? (
                                <div className="mt-4 bg-[#FAF8F5] border border-dark/5 rounded-[1.5rem] p-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                                        <MessageSquare size={14} />
                                        <span>Rédiger votre réponse</span>
                                    </div>
                                    <textarea
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="Répondez à ce client de manière professionnelle..."
                                        className="w-full bg-white border border-dark/10 rounded-xl p-4 text-sm text-dark focus:outline-none focus:border-primary transition-all min-h-[100px]"
                                    ></textarea>
                                    <div className="flex gap-2 justify-end">
                                        <button 
                                            onClick={() => setReplyingToId(null)}
                                            className="px-4 py-2 bg-dark/5 text-dark hover:bg-dark/10 rounded-lg text-xs font-black uppercase tracking-widest"
                                        >
                                            Annuler
                                        </button>
                                        <button 
                                            onClick={() => handleSaveReply(rev.id)}
                                            disabled={savingId === rev.id}
                                            className="px-5 py-2 bg-[#FAF8F5] text-primary border border-primary/20 hover:scale-[1.02] active:scale-95 transition-all rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                                        >
                                            {savingId === rev.id ? (
                                                <>
                                                    <Loader2 size={12} className="animate-spin" /> Envoi...
                                                </>
                                            ) : (
                                                <>
                                                    <Send size={12} /> Enregistrer
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                !rev.reply && (
                                    <button 
                                        onClick={() => handleStartReply(rev)}
                                        className="mt-2 bg-dark/5 hover:bg-dark/10 text-dark px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors"
                                    >
                                        <MessageSquare size={12} />
                                        Répondre
                                    </button>
                                )
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default DashboardReviews;
