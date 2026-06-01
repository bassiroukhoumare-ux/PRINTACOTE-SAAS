import React from 'react';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

const SECTIONS = [
    {
        t: "1. Responsable du traitement",
        c: "Les données personnelles collectées sur Printacoté sont traitées par Printacoté, plateforme de mise en relation entre imprimeurs et clients au Sénégal. Pour toute question relative à vos données, vous pouvez nous contacter via l'adresse de support indiquée sur le site."
    },
    {
        t: "2. Données que nous collectons",
        c: "Nous collectons : les informations de compte imprimeur (nom de l'imprimerie, prénom, nom, e-mail, numéro WhatsApp/téléphone, ville, pays, adresse), les contenus que vous publiez (logo, couverture, services, portfolio, produits), ainsi que des données techniques d'usage (pages vues, clics de contact, statistiques de visite anonymisées)."
    },
    {
        t: "3. Finalités du traitement",
        c: "Vos données servent à : créer et gérer votre vitrine, afficher vos services et produits au public, mettre les clients en relation avec vous (WhatsApp/téléphone), produire vos statistiques de visites et de contacts, assurer le support, et faire fonctionner et sécuriser la plateforme."
    },
    {
        t: "4. Base légale",
        c: "Le traitement repose sur votre consentement (création de compte et publication), sur l'exécution du service que vous demandez, et sur notre intérêt légitime à assurer la sécurité et l'amélioration de la plateforme."
    },
    {
        t: "5. Consentement",
        c: "En créant un compte et en publiant du contenu, vous consentez au traitement décrit ici. Vous pouvez retirer votre consentement à tout moment en désactivant votre boutique ou en supprimant votre compte, sans effet rétroactif sur les traitements déjà réalisés."
    },
    {
        t: "6. Durée de conservation",
        c: "Vos données sont conservées tant que votre compte est actif. Après suppression du compte, elles sont effacées ou anonymisées dans un délai raisonnable, sauf obligation légale de conservation (par exemple à des fins comptables pour les paiements)."
    },
    {
        t: "7. Destinataires des données",
        c: "Vos coordonnées publiques (nom, ville, WhatsApp) sont visibles des visiteurs afin de permettre la prise de contact. Les données de compte ne sont accessibles qu'à vous et à l'équipe d'administration de Printacoté pour la modération et le support."
    },
    {
        t: "8. Sous-traitants et hébergement",
        c: "Nous faisons appel à des prestataires techniques : Supabase (hébergement de la base de données, authentification et stockage des fichiers), les passerelles de paiement (Moneroo, PayTech) pour les abonnements, et Resend pour l'envoi d'e-mails transactionnels. Chacun ne traite que les données nécessaires à sa fonction."
    },
    {
        t: "9. Transferts hors du Sénégal",
        c: "Certains prestataires peuvent héberger ou traiter des données en dehors du Sénégal. Nous veillons à ce que ces transferts s'accompagnent de garanties appropriées de protection des données."
    },
    {
        t: "10. Sécurité des données",
        c: "Nous mettons en œuvre des mesures techniques et organisationnelles : chiffrement des connexions (HTTPS), contrôle d'accès par règles de sécurité au niveau de la base (RLS), restriction des opérations sensibles, et bonnes pratiques de gestion des accès administrateur."
    },
    {
        t: "11. Droit d'accès",
        c: "Vous avez le droit d'obtenir la confirmation que vos données sont traitées et d'y accéder. La plupart de vos données sont directement consultables et modifiables depuis votre tableau de bord imprimeur."
    },
    {
        t: "12. Droit de rectification",
        c: "Vous pouvez corriger à tout moment les informations inexactes ou incomplètes de votre profil, de vos services, de votre portfolio et de vos produits depuis votre espace personnel."
    },
    {
        t: "13. Droit à l'effacement",
        c: "Vous pouvez demander la suppression de vos données et de votre compte. La suppression entraîne le retrait de votre vitrine, de vos services, de votre portfolio et de vos produits du site public."
    },
    {
        t: "14. Droit d'opposition et de limitation",
        c: "Vous pouvez vous opposer à certains traitements ou en demander la limitation, notamment en désactivant votre boutique, ce qui la rend invisible au public tout en conservant vos données."
    },
    {
        t: "15. Droit à la portabilité",
        c: "Vous pouvez demander à recevoir les données que vous nous avez fournies dans un format structuré et couramment utilisé, afin de les réutiliser ou de les transmettre à un autre service."
    },
    {
        t: "16. Cookies et traceurs",
        c: "Nous utilisons un stockage local minimal nécessaire au fonctionnement (session de connexion, identifiant de visiteur anonyme pour les statistiques de trafic). Aucune publicité comportementale tierce n'est mise en place."
    },
    {
        t: "17. Données des mineurs",
        c: "La plateforme s'adresse à des professionnels de l'impression. Nous ne collectons pas sciemment de données concernant des mineurs ; si tel était le cas, elles seraient supprimées sur signalement."
    },
    {
        t: "18. Réclamation auprès d'une autorité",
        c: "Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la Commission de Protection des Données Personnelles (CDP) du Sénégal, ou de l'autorité compétente de votre pays de résidence."
    },
    {
        t: "19. Modifications de la politique",
        c: "Cette politique peut évoluer. Toute modification importante sera signalée sur le site. La date de dernière mise à jour figure ci-dessous."
    },
    {
        t: "20. Nous contacter",
        c: "Pour exercer vos droits ou pour toute question relative à la protection de vos données, contactez notre support depuis votre tableau de bord ou via les coordonnées de contact du site. Nous nous engageons à répondre dans un délai raisonnable."
    },
];

const RgpdPage = ({ setPage }) => {
    return (
        <div className="min-h-screen bg-background pb-32">
            <div className="bg-primary pt-40 pb-24 px-6 rounded-b-[4rem] relative overflow-hidden text-center">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-accent rounded-full blur-[120px]"></div>
                </div>
                <div className="container mx-auto max-w-4xl relative z-10">
                    <div className="inline-flex items-center gap-2 bg-white/10 text-[#F5F5DC] px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
                        <ShieldCheck size={14} /> Protection des données
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-[#F5F5DC] mb-6 tracking-tighter">
                        RGPD <span className="italic font-serif text-white">& Confidentialité.</span>
                    </h1>
                    <p className="text-[#F5F5DC]/60 text-lg font-medium max-w-2xl mx-auto">
                        Comment nous collectons, utilisons et protégeons vos données personnelles, et quels sont vos droits.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-6 -mt-12 relative z-20 max-w-4xl">
                <button onClick={() => setPage('home')} className="flex items-center gap-2 text-primary font-black mb-8 hover:-translate-x-2 transition-transform">
                    <ArrowLeft size={20} /> Retour à l'accueil
                </button>

                <div className="bg-white rounded-[3rem] border border-primary/10 shadow-2xl p-8 md:p-16 space-y-10">
                    {SECTIONS.map((s, i) => (
                        <div key={i} className="border-b border-primary/5 last:border-0 pb-10 last:pb-0">
                            <h2 className="text-xl md:text-2xl font-black text-primary mb-4 tracking-tight">{s.t}</h2>
                            <p className="text-primary/70 leading-relaxed font-medium">{s.c}</p>
                        </div>
                    ))}
                    <p className="text-xs text-primary/30 font-bold uppercase tracking-widest pt-4">
                        Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RgpdPage;
