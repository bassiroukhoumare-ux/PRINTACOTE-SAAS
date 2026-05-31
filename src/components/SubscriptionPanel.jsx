import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Check, Loader2, Crown, ShieldCheck } from 'lucide-react';
import { PLANS, formatFcfa, getSubscriptionState } from '../lib/subscription';

// Grille des formules + lancement du checkout Moneroo.
// Utilisé à la fois dans l'onglet "Facturation" et dans le paywall.
const SubscriptionPanel = ({ printerData, user, showToast, dark = false }) => {
    const [loadingPlan, setLoadingPlan] = useState(null);
    const sub = getSubscriptionState(printerData);

    const handleSubscribe = async (planId) => {
        if (user?.isMock || printerData?.isMock) {
            showToast?.("Les paiements sont indisponibles en mode démonstration.", 'error');
            return;
        }
        setLoadingPlan(planId);
        try {
            const { data, error } = await supabase.functions.invoke('moneroo-checkout', {
                body: { plan: planId },
            });
            if (error) throw error;
            if (!data?.checkoutUrl) throw new Error("Réponse de paiement invalide.");
            // Redirection vers la page de paiement hébergée Moneroo.
            window.location.href = data.checkoutUrl;
        } catch (err) {
            console.error(err);
            showToast?.(
                err.message || "Impossible de lancer le paiement. Réessayez plus tard.",
                'error'
            );
            setLoadingPlan(null);
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
                    const isLoading = loadingPlan === plan.id;
                    const disabled = loadingPlan !== null;
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
                                onClick={() => handleSubscribe(plan.id)}
                                disabled={disabled}
                                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-60
                                    ${plan.best
                                        ? 'bg-[#C9A84C] text-[#0F0F13] hover:scale-[1.02] active:scale-95 shadow-xl shadow-[#C9A84C]/20'
                                        : dark
                                            ? 'bg-white text-primary hover:scale-[1.02] active:scale-95'
                                            : 'bg-primary text-white hover:scale-[1.02] active:scale-95 shadow-xl shadow-primary/20'}`}
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
                <ShieldCheck size={16} />
                Paiement sécurisé via Moneroo — Mobile Money (Wave, Orange Money…) & carte bancaire.
            </div>

            {sub.planId && sub.status === 'active' && (
                <p className={`text-center text-xs font-bold ${dark ? 'text-white/50' : 'text-dark/50'}`}>
                    Souscrire de nouveau prolonge votre abonnement actuel (les mois s'ajoutent).
                </p>
            )}
        </div>
    );
};

export default SubscriptionPanel;
