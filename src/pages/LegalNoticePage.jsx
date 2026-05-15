import React from 'react';
import { Shield, FileText, Scale } from 'lucide-react';

const LegalNoticePage = ({ setPage }) => {
    const sections = [
        { title: "Éditeur du Site", content: "Le site Printacote est édité par la société PRINTACOTE SAAS, Société par Actions Simplifiée au capital de 1 000 000 FCFA, immatriculée au Registre du Commerce et du Crédit Mobilier de Dakar." },
        { title: "Siège Social", content: "Le siège social est situé à Dakar, Sénégal. Contact : contact@printacote.com." },
        { title: "Directeur de la Publication", content: "Le Directeur de la publication du site est Amadou Fall, en sa qualité de Président." },
        { title: "Hébergement", content: "Le site est hébergé par Supabase Inc., 800 Market St, San Francisco, CA 94102, USA." },
        { title: "Propriété Intellectuelle", content: "L'ensemble des contenus de ce site (textes, images, logos, icônes) est la propriété exclusive de Printacote ou de ses partenaires." },
        { title: "Données Personnelles", content: "Conformément à la loi sénégalaise sur la protection des données personnelles, vous disposez d'un droit d'accès et de rectification." },
        { title: "Cookies", content: "Le site utilise des cookies pour améliorer l'expérience utilisateur et réaliser des statistiques de visites." },
        { title: "Responsabilité", content: "Printacote ne saurait être tenu responsable des erreurs présentes sur le site ou de l'indisponibilité du service." },
        { title: "Liens Hypertextes", content: "Le site peut contenir des liens vers d'autres sites. Printacote n'exerce aucun contrôle sur le contenu de ces sites tiers." },
        { title: "Droit Applicable", content: "Les présentes mentions légales sont soumises au droit sénégalais. Tout litige sera porté devant les tribunaux de Dakar." }
    ];

    return (
        <div className="min-h-screen bg-background pt-40 pb-20 px-6">
            <div className="container mx-auto max-w-4xl">
                <div className="flex items-center gap-4 mb-12">
                    <div className="w-16 h-16 bg-primary/10 rounded-[2rem] flex items-center justify-center text-primary">
                        <Scale size={32} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-dark tracking-tight">Mentions Légales</h1>
                        <p className="text-dark/40 font-bold uppercase tracking-widest text-xs mt-2">Dernière mise à jour : Mai 2026</p>
                    </div>
                </div>

                <div className="bg-white rounded-[3rem] border border-dark/5 p-12 shadow-2xl space-y-12">
                    {sections.map((section, index) => (
                        <div key={index} className="space-y-4">
                            <h2 className="text-xl font-black text-dark flex items-center gap-3">
                                <span className="text-primary text-sm font-mono opacity-50">{String(index + 1).padStart(2, '0')}.</span>
                                {section.title}
                            </h2>
                            <p className="text-dark/60 leading-relaxed font-medium pl-10 border-l-2 border-primary/10">
                                {section.content}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="mt-12 text-center">
                    <button onClick={() => setPage('home')} className="text-primary font-black hover:underline underline-offset-8">Retour à l'accueil</button>
                </div>
            </div>
        </div>
    );
};

export default LegalNoticePage;
