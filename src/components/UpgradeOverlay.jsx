import React from 'react';
import { X } from 'lucide-react';
import SubscriptionPanel from './SubscriptionPanel';

// Overlay plein écran de facturation, déclenché quand un compte gratuit atteint
// un quota ou touche une fonction réservée. Réutilise SubscriptionPanel.
const REASONS = {
    services: "Vous avez atteint la limite de 3 services du compte gratuit. Abonnez-vous pour en ajouter sans limite.",
    portfolio: "Vous avez atteint la limite de 3 réalisations du compte gratuit. Abonnez-vous pour un portfolio illimité.",
    produits: "Vous avez atteint la limite de 2 produits du compte gratuit. Abonnez-vous pour une boutique illimitée.",
    social: "Les liens vers vos réseaux sociaux sont réservés aux abonnés. Abonnez-vous pour les activer.",
    stats: "Les statistiques de visites et de clics sont réservées aux abonnés. Abonnez-vous pour y accéder.",
};

const UpgradeOverlay = ({ reason, printerData, user, showToast, onClose }) => {
    const message = REASONS[reason] || "Passez à un abonnement pour débloquer toutes les fonctionnalités.";
    return (
        <div className="fixed inset-0 z-[300] flex items-start justify-center overflow-y-auto bg-dark/40 backdrop-blur-sm p-4 md:p-10 animate-in fade-in duration-300">
            <div className="relative w-full max-w-5xl bg-background rounded-[3rem] p-8 md:p-12 my-6 shadow-2xl animate-in zoom-in-95 duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 w-11 h-11 bg-dark/5 hover:bg-dark/10 rounded-full flex items-center justify-center transition-colors z-10"
                    aria-label="Fermer"
                >
                    <X size={20} />
                </button>
                <SubscriptionPanel
                    printerData={printerData}
                    user={user}
                    showToast={showToast}
                    reason={message}
                />
            </div>
        </div>
    );
};

export default UpgradeOverlay;
