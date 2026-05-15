import React from 'react';
import { FileText, CheckCircle, AlertTriangle } from 'lucide-react';

const TermsOfServicePage = ({ setPage }) => {
    const sections = [
        { title: "Acceptation des Conditions", content: "L'utilisation du site Printacote implique l'acceptation pleine et entière des présentes conditions générales d'utilisation." },
        { title: "Description du Service", content: "Printacote est une plateforme de mise en relation entre des imprimeurs professionnels et des clients potentiels." },
        { title: "Inscription et Compte", content: "Chaque utilisateur est responsable de la confidentialité de ses identifiants et des activités liées à son compte." },
        { title: "Engagements de l'Imprimeur", content: "L'imprimeur s'engage à fournir des informations exactes sur ses services et à honorer les prestations commandées." },
        { title: "Propriété du Contenu", content: "L'utilisateur reste propriétaire des contenus qu'il publie, mais concède à Printacote une licence d'utilisation pour le fonctionnement du service." },
        { title: "Interdictions", content: "Il est strictement interdit de publier du contenu illégal, injurieux ou de tenter de nuire à l'intégrité technique de la plateforme." },
        { title: "Suspension de Compte", content: "Printacote se réserve le droit de suspendre tout compte ne respectant pas les présentes conditions ou nuisant à l'image du service." },
        { title: "Limitation de Responsabilité", content: "Printacote n'intervient pas dans les transactions financières directes entre imprimeurs et clients et décline toute responsabilité en cas de litige." },
        { title: "Tarification", content: "L'inscription de base est gratuite. Printacote se réserve le droit de proposer des services premium payants à l'avenir." },
        { title: "Litiges", content: "Les parties s'efforceront de résoudre tout litige à l'amiable. À défaut, les tribunaux de Dakar seront seuls compétents." }
    ];

    return (
        <div className="min-h-screen bg-background pt-40 pb-20 px-6">
            <div className="container mx-auto max-w-4xl">
                <div className="flex items-center gap-4 mb-12">
                    <div className="w-16 h-16 bg-primary/10 rounded-[2rem] flex items-center justify-center text-primary">
                        <FileText size={32} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-dark tracking-tight">Conditions Générales</h1>
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

export default TermsOfServicePage;
