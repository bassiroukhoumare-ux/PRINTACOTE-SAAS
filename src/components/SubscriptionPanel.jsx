import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Check, Loader2, Crown, ShieldCheck, X, Smartphone, CreditCard } from 'lucide-react';
import { PLANS, formatFcfa, getSubscriptionState } from '../lib/subscription';
import gsap from 'gsap';

// Grille des formules + lancement du checkout avec choix entre Moneroo et PayTech SN.
// Utilisé à la fois dans l'onglet "Facturation" et dans le paywall.
const SubscriptionPanel = ({ printerData, user, showToast, dark = false }) => {
    const [selectedPlanId, setSelectedPlanId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [loadingProvider, setLoadingProvider] = useState(null);
    
    const overlayRef = useRef(null);
    const modalRef = useRef(null);
    
    const sub = getSubscriptionState(printerData);

    useEffect(() => {
        if (showModal) {
            const ctx = gsap.context(() => {
                // Animation de l'arrière-plan flouté
                gsap.fromTo(overlayRef.current, 
                    { opacity: 0 }, 
                    { opacity: 1, duration: 0.3, ease: 'power2.out' }
                );
                // Animation d'entrée du modal
                gsap.fromTo(modalRef.current, 
                    { scale: 0.9, y: 20, opacity: 0 }, 
                    { scale: 1, y: 0, opacity: 1, duration: 0.4, delay: 0.05, ease: 'power3.out' }
                );
            });
            return () => ctx.revert();
        }
    }, [showModal]);

    const handleSubscribeClick = (planId) => {
        if (user?.isMock || printerData?.isMock) {
            showToast?.("Les paiements sont indisponibles en mode démonstration.", 'error');
            return;
        }
        setSelectedPlanId(planId);
        setShowModal(true);
    };

    const handleConfirmPayment = async (provider) => {
        if (!selectedPlanId) return;
        setLoadingProvider(provider);
        try {
            const edgeFunction = provider === 'paytech' ? 'paytech-checkout' : 'moneroo-checkout';
            const { data, error } = await supabase.functions.invoke(edgeFunction, {
                body: { plan: selectedPlanId },
            });
            if (error) throw error;
            if (!data?.checkoutUrl) throw new Error("Réponse de paiement invalide.");
            
            // Redirection vers la page de paiement hébergée
            window.location.href = data.checkoutUrl;
        } catch (err) {
            console.error(err);
            let errMsg = "Impossible de lancer le paiement. Réessayez plus tard.";
            if (err.context) {
                try {
                    const body = await err.context.json();
                    if (body && body.error) {
                        errMsg = body.error;
                    }
                } catch (_) {
                    try {
                        const text = await err.context.text();
                        if (text) errMsg = text;
                    } catch (_) {}
                }
            } else if (err.message) {
                errMsg = err.message;
            }
            showToast?.(errMsg, 'error');
            setLoadingProvider(null);
        }
    };

    return (
        <div className="space-y-8">
            <div className="text-center max-w-xl mx-auto">
                <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-5 ${dark ? 'bg-[#C9A84C]/15 text-[#C9A84C]' : 'bg-primary/10 text-primary'}`}>
                    <Crown size={28} />
                </div>
                <h2 className={`text-3xl md:text-4xl font-black tracking-tight ${dark ? 'text-white' : 'text-dark'}`}>
                    Choisissez votre formule
                </h2>
                <p className={`mt-3 text-base font-medium ${dark ? 'text-white/50' : 'text-dark/50'}`}>
                    Un paiement unique débloque l'accès complet à votre espace professionnel
                    pour toute la durée choisie. Sans engagement, sans renouvellement automatique.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {PLANS.map((plan) => {
                    const monthly = Math.round(plan.amount / plan.months);
                    const isLoading = selectedPlanId === plan.id && loadingProvider !== null;
                    const disabled = loadingProvider !== null || showModal;
                    return (
                        <div
                            key={plan.id}
                            className={`relative rounded-[2rem] p-7 border transition-all flex flex-col
                                ${plan.best
                                    ? 'border-transparent bg-primary text-white shadow-2xl shadow-primary/25 md:scale-105'
                                    : dark
                                        ? 'border-white/10 bg-white/5 text-white'
                                        : 'border-dark/10 bg-white text-dark'}`}
                        >
                            {plan.badge && (
                                <span className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap
                                    ${plan.best ? 'bg-[#C9A84C] text-[#0F0F13]' : 'bg-primary text-white'}`}>
                                    {plan.badge}
                                </span>
                            )}

                            <div className="mb-6">
                                <h3 className="text-sm font-black uppercase tracking-widest opacity-70">{plan.label}</h3>
                                <div className="mt-3 flex items-baseline gap-1">
                                    <span className="text-4xl font-black tracking-tight">{plan.amount.toLocaleString('fr-FR')}</span>
                                    <span className="text-sm font-bold opacity-60">FCFA</span>
                                </div>
                                <p className="text-xs font-bold opacity-50 mt-1">
                                    soit ~{formatFcfa(monthly)}/mois
                                </p>
                            </div>

                            <ul className="space-y-3 mb-8 flex-1">
                                {[
                                    'Profil public visible dans l\'annuaire',
                                    'Boutique & marketplace actives',
                                    'Portfolio et services illimités',
                                    'Statistiques de visites & contacts',
                                ].map((feat) => (
                                    <li key={feat} className="flex items-start gap-2.5 text-sm font-medium">
                                        <Check size={18} className={`shrink-0 mt-0.5 ${plan.best ? 'text-[#C9A84C]' : 'text-green-500'}`} />
                                        <span className={plan.best ? 'text-white/90' : 'opacity-80'}>{feat}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handleSubscribeClick(plan.id)}
                                disabled={disabled}
                                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-60 overflow-hidden relative group/btn
                                    ${plan.best
                                        ? 'bg-[#C9A84C] text-[#0F0F13] hover:scale-[1.03] active:scale-95 shadow-xl shadow-[#C9A84C]/20'
                                        : dark
                                            ? 'bg-white text-primary hover:scale-[1.03] active:scale-95'
                                            : 'bg-primary text-white hover:scale-[1.03] active:scale-95 shadow-xl shadow-primary/20'}`}
                                style={{ transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
                            >
                                {isLoading ? (
                                    <><Loader2 size={18} className="animate-spin" /> Redirection…</>
                                ) : (
                                    'Souscrire'
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className={`flex items-center justify-center gap-2 text-xs font-bold ${dark ? 'text-white/40' : 'text-dark/40'}`}>
                <img src="https://paytech.sn/assets/srcs/img/logo_paytech.png" className="h-4 w-auto grayscale opacity-50" alt="PayTech" />
                Paiements sécurisés par Mobile Money (Wave, Orange Money...) & Cartes bancaires.
            </div>

            {sub.planId && sub.status === 'active' && (
                <p className={`text-center text-xs font-bold ${dark ? 'text-white/50' : 'text-dark/50'}`}>
                    Souscrire de nouveau prolonge votre abonnement actuel (les mois s'ajoutent).
                </p>
            )}

            {/* Modal de sélection de la passerelle de paiement */}
            {showModal && (
                <div 
                    ref={overlayRef}
                    className="fixed inset-0 bg-[#0A0A0E]/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
                >
                    <div 
                        ref={modalRef}
                        className="relative bg-[#0F0F13] border border-white/10 max-w-md w-full rounded-[2.5rem] p-8 shadow-2xl overflow-hidden flex flex-col text-white font-sans"
                    >
                        {/* Overlay de bruit CSS */}
                        <div className="absolute inset-0 pointer-events-none noise-overlay opacity-[0.03] bg-white"></div>
                        
                        {/* En-tête */}
                        <div className="flex justify-between items-start mb-6 z-10">
                            <div>
                                <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#C9A84C]">
                                    Formule sélectionnée
                                </span>
                                <h3 className="text-xl font-bold font-serif text-[#FAF8F5] mt-1">
                                    Abonnement {PLANS.find(p => p.id === selectedPlanId)?.label}
                                </h3>
                                <p className="text-xs text-white/50 mt-1">
                                    Montant : <span className="font-bold text-[#C9A84C]">{PLANS.find(p => p.id === selectedPlanId)?.amount.toLocaleString('fr-FR')} FCFA</span>
                                </p>
                            </div>
                            <button 
                                onClick={() => {
                                    if (!loadingProvider) {
                                        setShowModal(false);
                                        setSelectedPlanId(null);
                                    }
                                }}
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        
                        {/* Choix des passerelles */}
                        <div className="space-y-4 mb-6 z-10">
                            <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                                Moyen de paiement
                            </span>
                            
                            {/* Option PayTech */}
                            <button
                                disabled={loadingProvider !== null}
                                onClick={() => handleConfirmPayment('paytech')}
                                className={`w-full text-left p-5 rounded-[2rem] border transition-all flex items-start gap-4 hover:scale-[1.02] active:scale-95 group relative overflow-hidden
                                    ${loadingProvider === 'paytech' 
                                        ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-white' 
                                        : 'border-white/10 bg-white/5 hover:bg-white/10 text-white'}`}
                                style={{ transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
                            >
                                <div className="p-3.5 rounded-2xl bg-white/10 text-[#C9A84C] group-hover:bg-[#C9A84C] group-hover:text-[#0F0F13] transition-all">
                                    <Smartphone size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm block">PayTech SN</span>
                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#C9A84C]/20 text-[#C9A84C] font-black uppercase tracking-wider">Sénégal / UEMOA</span>
                                    </div>
                                    <p className="text-xs text-white/50 mt-1">
                                        Wave, Orange Money, Free Money... (Mobile Money local)
                                    </p>
                                </div>
                                {loadingProvider === 'paytech' && (
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2">
                                        <Loader2 size={20} className="animate-spin text-[#C9A84C]" />
                                    </div>
                                )}
                            </button>
                            
                            {/* Option Moneroo */}
                            <button
                                disabled={loadingProvider !== null}
                                onClick={() => handleConfirmPayment('moneroo')}
                                className={`w-full text-left p-5 rounded-[2rem] border transition-all flex items-start gap-4 hover:scale-[1.02] active:scale-95 group relative overflow-hidden
                                    ${loadingProvider === 'moneroo' 
                                        ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-white' 
                                        : 'border-white/10 bg-white/5 hover:bg-white/10 text-white'}`}
                                style={{ transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
                            >
                                <div className="p-3.5 rounded-2xl bg-white/10 text-[#C9A84C] group-hover:bg-[#C9A84C] group-hover:text-[#0F0F13] transition-all">
                                    <CreditCard size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm block">Moneroo</span>
                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-black uppercase tracking-wider">Cartes & Multi-pays</span>
                                    </div>
                                    <p className="text-xs text-white/50 mt-1">
                                        Cartes bancaires (Visa, Mastercard) & autres Mobile Money.
                                    </p>
                                </div>
                                {loadingProvider === 'moneroo' && (
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2">
                                        <Loader2 size={20} className="animate-spin text-[#C9A84C]" />
                                    </div>
                                )}
                            </button>
                        </div>
                        
                        {/* Sécurité */}
                        <div className="flex items-center justify-center gap-2 pt-4 border-t border-white/5 text-[10px] text-white/40 uppercase tracking-widest font-black z-10">
                            <ShieldCheck size={14} className="text-green-500" />
                            Paiement crypté et sécurisé
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubscriptionPanel;
