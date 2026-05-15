import React from 'react';
import { Shield, Lock, Eye } from 'lucide-react';

const PrivacyPolicyPage = ({ setPage }) => {
    const sections = [
        { title: "Collecte des Données", content: "Nous collectons les données nécessaires à votre inscription : nom, email, téléphone et informations sur votre entreprise d'impression." },
        { title: "Utilisation des Données", content: "Vos données sont utilisées pour vous mettre en relation avec des clients et améliorer nos services de mise en relation." },
        { title: "Partage des Données", content: "Nous ne vendons jamais vos données personnelles à des tiers. Elles sont partagées uniquement avec les prestataires techniques nécessaires." },
        { title: "Protection des Données", content: "Vos données sont chiffrées et stockées sur des serveurs sécurisés bénéficiant des dernières normes de sécurité." },
        { title: "Vos Droits", content: "Vous disposez d'un droit d'accès, de rectification et de suppression de vos données à tout moment depuis votre tableau de bord." },
        { title: "Durée de Conservation", content: "Nous conservons vos données tant que votre compte est actif ou tant que nécessaire pour vous fournir nos services." },
        { title: "Cookies et Traceurs", content: "Nous utilisons des cookies techniques et analytiques pour assurer le bon fonctionnement du site et mesurer son audience." },
        { title: "Communication", content: "Nous pouvons vous envoyer des emails relatifs à votre compte ou à nos nouveaux services, sauf opposition de votre part." },
        { title: "Modifications", content: "Nous nous réservons le droit de modifier cette politique de confidentialité pour nous conformer aux évolutions légales." },
        { title: "Contact", content: "Pour toute question concernant vos données, contactez notre délégué à la protection des données à dpo@printacote.com." }
    ];

    return (
        <div className="min-h-screen bg-background pt-40 pb-20 px-6">
            <div className="container mx-auto max-w-4xl">
                <div className="flex items-center gap-4 mb-12">
                    <div className="w-16 h-16 bg-primary/10 rounded-[2rem] flex items-center justify-center text-primary">
                        <Shield size={32} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-dark tracking-tight">Politique de Confidentialité</h1>
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

export default PrivacyPolicyPage;
