import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Check, Loader2, Crown, ShieldCheck, Clock } from 'lucide-react';
import { PLANS, formatMoney, getSubscriptionState, CURRENCIES } from '../lib/subscription';

// Grille des formules + redirection vers le lien de paiement Wave/Stripe configuré par l'admin.
// Utilisé dans l'onglet "Facturation" du dashboard et l'overlay d'upgrade.
const SubscriptionPanel = ({ printerData, user, showToast, dark = false, reason = null }) => {
    const [plans, setPlans] = useState(PLANS);
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [loadingPlan, setLoadingPlan] = useState(null);
    const [currency, setCurrency] = useState('XOF');
    const sub = getSubscriptionState(printerData);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const { data, error } = await supabase
                    .from('system_settings')
                    .select('value')
                    .eq('key', 'subscription_plans')
                    .maybeSingle();
                if (!error && data && data.value) {
                    setPlans(data.value);
                }
            } catch (err) {
                console.error("Erreur lors de la récupération des plans d'abonnement:", err);
            } finally {
                setLoadingPlans(false);
            }
        };
        fetchPlans();
    }, []);

    const handleSubscribe = async (planId) => {
        const plan = plans.find(p => p.id === planId);
        if (!plan) return;

        if (user?.isMock || printerData?.isMock) {
            showToast?.("Les paiements sont indisponibles en mode démonstration.", 'error');
            return;
        }

        if (!plan.link) {
            showToast?.("Ce plan de paiement n'a pas encore de lien configuré. Veuillez contacter le support.", 'error');
            return;
        }

        setLoadingPlan(planId);
        // Redirection vers la page de paiement Wave / Stripe / Orange Money externe configurée.
        window.location.href = plan.link;
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
                    {reason || "Un paiement unique débloque l'accès complet à votre espace professionnel pour toute la durée choisie. Sans engagement, sans renouvellement automatique."}
                </p>

                <div className="mt-6 inline-flex rounded-2xl bg-dark/5 p-1">
                    {CURRENCIES.map((c) => (
                        <button
                            key={c.code}
                            type="button"
                            onClick={() => setCurrency(c.code)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all
                                ${currency === c.code ? 'bg-primary text-white shadow' : 'text-dark/40 hover:text-dark/70'}`}
                        >
                            {c.symbol}
                        </button>
                    ))}
                </div>
            </div>

            {loadingPlans ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-white/50">
                    <Loader2 size={36} className="animate-spin text-[#C9A84C]" />
                    <p className="text-sm font-bold">Chargement des formules...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {plans.map((plan) => {
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
                                        <span className="text-4xl font-black tracking-tight">{formatMoney(plan.amount, currency)}</span>
                                    </div>
                                    <p className="text-xs font-bold opacity-50 mt-1">
                                        facturé {plan.cadence} · soit ~{formatMoney(monthly, currency)}/mois
                                    </p>
                                </div>

                                <ul className="space-y-3 mb-8 flex-1">
                                    {(plan.features || [
                                        'Profil public visible dans l\'annuaire',
                                        'Boutique & marketplace actives',
                                        'Portfolio et services illimités',
                                        'Statistiques de visites & contacts',
                                    ]).map((feat) => (
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
            )}

            <div className={`p-6 rounded-[2rem] border text-xs font-semibold leading-relaxed flex items-start gap-4 text-left max-w-2xl mx-auto
                ${dark 
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' 
                    : 'bg-amber-500/10 border-amber-500/20 text-[#3D0B37]'}`}
            >
                <Clock className={`shrink-0 mt-0.5 ${dark ? 'text-amber-400' : 'text-primary'}`} size={18} />
                <div className="space-y-1">
                    <h4 className="font-black uppercase tracking-wider text-[10px]">Vérification requise (24h)</h4>
                    <p className={dark ? 'text-white/70' : 'text-[#3D0B37]/70'}>
                        Après votre paiement, un délai de <strong>24 heures minimum</strong> est nécessaire pour valider la transaction et vérifier les informations de votre imprimerie. Une fois cette étape confirmée, vous recevrez un e-mail de confirmation vous informant que votre accès a été débloqué.
                    </p>
                </div>
            </div>

            <div className="space-y-2 text-center">
                <div className={`flex items-center justify-center gap-2 text-xs font-bold ${dark ? 'text-white/40' : 'text-dark/40'}`}>
                    <ShieldCheck size={16} className="opacity-50" />
                    Paiement sécurisé — Mobile Money (Wave, Orange, MTN, Moov) & carte bancaire.
                </div>
                <p className={`text-[11px] font-medium ${dark ? 'text-white/30' : 'text-dark/30'}`}>
                    Paiement unique pour la période choisie · renouvellement manuel (rappel avant expiration) · prix affichés en {currency}, débité en FCFA.
                </p>
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
