import React from 'react';
import { Phone, ArrowRight, Globe, MessageCircle, Send, Mail, MapPin } from 'lucide-react';

const Footer = ({ setPage }) => {
    return (
        <footer className="bg-white text-[#3D0B37] pt-24 pb-12 rounded-t-[4rem] relative overflow-hidden border-t border-[#3D0B37]/5">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#3D0B37]/5 rounded-full blur-[150px] -mr-48 -mt-48"></div>
            
            <div className="container mx-auto px-6 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
                    <div className="space-y-8">
                        <img src="/logo.png" alt="Printacote" className="h-16 w-auto" />
                        <p className="text-[#3D0B37]/50 leading-relaxed font-medium">
                            La première plateforme de mise en relation entre imprimeurs locaux et clients au Sénégal. Simplifier l'impression pour tous.
                        </p>

                    </div>
                    
                    <div>
                        <h4 className="text-xl font-bold mb-8">Navigation</h4>
                        <ul className="space-y-4">
                            {['home', 'printers', 'marketplace', 'news'].map((p) => (
                                <li key={p}>
                                    <button 
                                        onClick={() => setPage(p)}
                                        className="text-[#3D0B37]/50 hover:text-[#3D0B37] transition-colors capitalize font-bold"
                                    >
                                        {p === 'home' ? 'Accueil' : p === 'printers' ? 'Imprimeurs' : p === 'marketplace' ? 'Maquettes' : 'Actualités'}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                    
                    <div>
                        <h4 className="text-xl font-bold mb-8">Légal</h4>
                        <ul className="space-y-4">
                            <li><button onClick={() => setPage('legal')} className="text-[#3D0B37]/40 hover:text-[#3D0B37] transition-colors text-sm font-bold">Mentions Légales</button></li>
                            <li><button onClick={() => setPage('terms')} className="text-[#3D0B37]/40 hover:text-[#3D0B37] transition-colors text-sm font-bold">Conditions d'Utilisation</button></li>
                            <li><button onClick={() => setPage('privacy')} className="text-[#3D0B37]/40 hover:text-[#3D0B37] transition-colors text-sm font-bold">Confidentialité</button></li>
                        </ul>
                    </div>
                    

                </div>
                
                <div className="pt-12 border-t border-[#3D0B37]/5 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-[#3D0B37]/30 text-sm font-black uppercase tracking-widest">
                        © 2024 Printacote. Fait avec passion pour le Sénégal.
                    </div>

                </div>
            </div>
        </footer>
    );
};

export default Footer;
