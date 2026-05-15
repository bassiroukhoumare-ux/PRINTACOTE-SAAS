# Printacote SaaS - Résumé du Projet

## Objectif de l'application
Printacote est une plateforme SaaS permettant de connecter instantanément les imprimeurs locaux avec leurs clients. Elle offre une visibilité numérique aux imprimeurs et facilite la recherche de services d'impression certifiés pour les clients.

## Fonctionnalités Implémentées
- **Annuaire des Imprimeurs** : Recherche par géolocalisation et filtres de services.
- **Profils Imprimeurs Haute-Fidélité** : Présentation détaillée, portfolio, et contact direct.
- **Interactive Map** : Intégration d'OpenStreetMap pour visualiser les imprimeries.
- **Dashboard Imprimeur** : 
    - Vue d'ensemble des statistiques (vues, clics WhatsApp).
    - Gestion du profil public et des contacts.
    - Gestion des services (Offset, Numérique, etc.).
    - Gestion du portfolio (upload/gestion des réalisations).
    - Interface Marketplace pour la vente de consommables.
- **Marketplace Publique** : Espace d'achat/revente de matériel professionnel.
- **Blog/Actualités** : Conseils et tendances du secteur.

## Structure des fichiers
- `src/App.jsx` : Composant principal gérant les vues (SPA) et la logique métier.
- `src/index.css` : Configuration globale de Tailwind CSS et styles personnalisés (overlay de bruit, animations).
- `public/` : Assets statiques et icônes.

## Technologies Utilisées
- **Frontend** : React 19, Tailwind CSS v3.4.
- **Animations** : GSAP 3 (ScrollTrigger, Magnetic Buttons).
- **Icônes** : Lucide React.
- **Cartographie** : OpenStreetMap (Iframe integration).
- **Outils** : Vite.

## Décisions de Design
- **Esthétique** : Utilisation du preset "Luxe de Minuit" (Obsidienne, Champagne, Ivoire) pour un rendu premium.
- **Typographie** : Combinaison de *Inter* pour la clarté et *Playfair Display* pour l'élégance éditoriale.
- **Expérience Utilisateur** : Micro-animations (effets magnétiques, lift au survol) pour un aspect "instrument digital".
- **Accessibilité** : Liens directs WhatsApp et Téléphone pour une conversion rapide.

## Instructions pour les futures IA
- Maintenir le système de design fixe (rayons `rounded-[2rem]`, overlay de bruit).
- Utiliser `gsap.context()` pour toute nouvelle animation.
- Garder la structure SPA basée sur l'état `page` et `activeTab` pour le dashboard.
- Privilégier les intégrations sans clé API (comme OpenStreetMap) pour la simplicité de déploiement.
