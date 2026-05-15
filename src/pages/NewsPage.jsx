import React, { useState } from 'react';
import { ArrowRight, Calendar, Clock, Eye, Share2, MessageCircle, ArrowLeft, Heart, Reply, Send, User } from 'lucide-react';

const NewsPage = ({ setPage }) => {
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [comments, setComments] = useState([
        { id: 1, author: "Moussa Diop", date: "Il y a 2 heures", text: "Article très instructif ! Le choix du papier change vraiment tout pour la perception de la marque.", likes: 12, isLiked: false, replies: [] },
        { id: 2, author: "Awa Ndiaye", date: "Il y a 5 heures", text: "Merci pour ces précisions sur le grammage. Je comprends mieux mes erreurs passées.", likes: 8, isLiked: false, replies: [] }
    ]);
    const [newComment, setNewComment] = useState({ name: '', email: '', text: '' });
    const [replyingTo, setReplyingTo] = useState(null);

    const articles = [
        {
            id: 1,
            title: "Comment choisir le bon papier pour vos impressions ?",
            desc: "Le choix du support est crucial pour le rendu final de vos documents. Découvrez nos conseils d'experts.",
            content: "Le choix du papier est l'un des aspects les plus critiques de tout projet d'impression. Il ne s'agit pas seulement d'esthétique, mais aussi de fonctionnalité et de perception de la marque. Dans cet article, nous explorons les différences entre le papier couché, le papier offset, et les papiers texturés.\n\nPourquoi le grammage est-il important ?\n\nLe grammage (exprimé en g/m²) détermine la rigidité et l'opacité du papier. Pour des cartes de visite, nous recommandons au moins 350g, tandis que pour des flyers standards, 135g à 170g suffisent largement.",
            views: "1.2k",
            date: "14 Mai 2024",
            readTime: "5 min",
            img: "https://images.unsplash.com/photo-1589330694653-ded6df03f754?q=80&w=1000&auto=format&fit=crop"
        },
        {
            id: 2,
            title: "L'impression 3D révolutionne l'artisanat local",
            desc: "Une nouvelle ère s'ouvre pour les créateurs sénégalais avec l'arrivée de machines haute précision.",
            content: "L'impression 3D n'est plus une technologie du futur ; elle est déjà là et transforme la façon dont les artisans sénégalais conçoivent leurs produits. Des bijoux aux pièces mécaniques, les possibilités sont infinies.\n\nLes avantages pour les PME :\n\n- Réduction des coûts de prototypage.\n- Personnalisation extrême des produits.\n- Rapidité de mise sur le marché.",
            views: "856",
            date: "12 Mai 2024",
            readTime: "8 min",
            img: "https://images.unsplash.com/photo-1631034300185-da943f9a74a4?q=80&w=1000&auto=format&fit=crop"
        },
        {
            id: 3,
            title: "Tendance : Le retour du Letterpress",
            desc: "Pourquoi cette technique ancienne redevient le summum du luxe pour les cartes de visite.",
            content: "Le Letterpress, ou impression typographique, est une technique ancestrale qui consiste à presser les caractères sur le papier, créant un relief palpable. C'est aujourd'hui le choix privilégié pour les marques de luxe cherchant une distinction tactile.",
            views: "2.4k",
            date: "10 Mai 2024",
            readTime: "6 min",
            img: "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1000&auto=format&fit=crop"
        }
    ];

    const handleSubmitComment = (e) => {
        e.preventDefault();
        if (!newComment.name || !newComment.text) return;
        
        const comment = {
            id: comments.length + 1,
            author: newComment.name,
            date: "À l'instant",
            text: newComment.text,
            likes: 0,
            isLiked: false,
            replies: []
        };
        
        setComments([comment, ...comments]);
        setNewComment({ name: '', email: '', text: '' });
    };

    const handleLike = (id) => {
        setComments(comments.map(c => {
            if (c.id === id) {
                return { ...c, likes: c.isLiked ? c.likes - 1 : c.likes + 1, isLiked: !c.isLiked };
            }
            return c;
        }));
    };

    const handleReply = (id) => {
        setReplyingTo(id);
        const element = document.getElementById('comment-form');
        element.scrollIntoView({ behavior: 'smooth' });
    };

    const shareArticle = (article) => {
        const message = `Découvrez cet article sur Printacote : "${article.title}" \nLien : ${window.location.origin}/?article=${article.id}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    if (selectedArticle) {
        return (
            <div className="min-h-screen bg-background pb-20 pt-32">
                <div className="container mx-auto px-6 max-w-4xl">
                    <button 
                        onClick={() => setSelectedArticle(null)}
                        className="flex items-center gap-2 text-primary font-black mb-10 hover:-translate-x-2 transition-transform"
                    >
                        <ArrowLeft size={20} />
                        Retour aux actualités
                    </button>

                    <div className="bg-white rounded-[4rem] overflow-hidden border border-primary/10 shadow-2xl mb-12">
                        <div className="aspect-video w-full">
                            <img src={selectedArticle.img} alt={selectedArticle.title} className="w-full h-full object-cover" />
                        </div>
                        
                        <div className="p-10 md:p-20">
                            <div className="flex flex-wrap items-center gap-6 text-primary/40 text-sm font-black uppercase tracking-widest mb-10">
                                <div className="flex items-center gap-2"><Calendar size={16} /> {selectedArticle.date}</div>
                                <div className="flex items-center gap-2"><Clock size={16} /> {selectedArticle.readTime}</div>
                                <div className="flex items-center gap-2"><Eye size={16} /> {selectedArticle.views} vues</div>
                            </div>

                            <h1 className="text-4xl md:text-6xl font-black text-primary mb-12 tracking-tight leading-tight">
                                {selectedArticle.title}
                            </h1>

                            <div className="prose prose-xl prose-primary max-w-none text-primary/70 font-medium leading-relaxed mb-16 whitespace-pre-line">
                                {selectedArticle.content}
                            </div>

                            <div className="pt-12 border-t border-primary/10 flex flex-wrap gap-6 items-center justify-between mb-16">
                                <div className="text-primary font-black">Partager cet article :</div>
                                <div className="flex gap-4">
                                    <button onClick={() => shareArticle(selectedArticle)} className="bg-[#25D366] text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:scale-105 transition-transform shadow-xl">
                                        <MessageCircle size={20} /> WhatsApp
                                    </button>
                                    <button className="bg-primary text-accent px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:scale-105 transition-transform shadow-xl">
                                        <Share2 size={20} /> Lien
                                    </button>
                                </div>
                            </div>

                            {/* Comments Section */}
                            <div className="pt-16 border-t border-primary/5">
                                <h3 className="text-3xl font-black text-primary mb-12 flex items-center gap-4">
                                    Commentaires <span className="text-accent text-sm bg-primary px-4 py-1 rounded-full">{comments.length}</span>
                                </h3>

                                {/* Comment Form */}
                                <form id="comment-form" onSubmit={handleSubmitComment} className="bg-primary/5 p-8 md:p-12 rounded-[3rem] mb-16 space-y-6">
                                    {replyingTo && (
                                        <div className="flex items-center justify-between bg-primary text-accent px-6 py-2 rounded-xl mb-4">
                                            <span className="text-xs font-bold uppercase tracking-widest">Réponse à un commentaire</span>
                                            <button onClick={() => setReplyingTo(null)} className="text-xs font-black">ANNULER</button>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase text-primary/40 ml-4">Nom complet</label>
                                            <input 
                                                type="text" 
                                                value={newComment.name}
                                                onChange={(e) => setNewComment({...newComment, name: e.target.value})}
                                                placeholder="Votre nom" 
                                                className="w-full bg-white border border-primary/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-accent font-bold"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase text-primary/40 ml-4">Email</label>
                                            <input 
                                                type="email" 
                                                value={newComment.email}
                                                onChange={(e) => setNewComment({...newComment, email: e.target.value})}
                                                placeholder="votre@email.com" 
                                                className="w-full bg-white border border-primary/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-accent font-bold"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-primary/40 ml-4">Votre commentaire</label>
                                        <textarea 
                                            rows="4" 
                                            value={newComment.text}
                                            onChange={(e) => setNewComment({...newComment, text: e.target.value})}
                                            placeholder={replyingTo ? "Tapez votre réponse ici..." : "Que pensez-vous de cet article ?"} 
                                            className="w-full bg-white border border-primary/10 rounded-3xl px-6 py-4 focus:outline-none focus:border-accent font-bold resize-none"
                                        ></textarea>
                                    </div>
                                    <button type="submit" className="bg-primary text-accent px-10 py-5 rounded-2xl font-black flex items-center gap-3 hover:scale-105 transition-transform shadow-xl">
                                        {replyingTo ? "Répondre" : "Publier mon commentaire"}
                                        <Send size={18} />
                                    </button>
                                </form>

                                {/* Comments List */}
                                <div className="space-y-12">
                                    {comments.map((comment) => (
                                        <div key={comment.id} className="flex gap-6 group">
                                            <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center text-primary shrink-0">
                                                <User size={32} />
                                            </div>
                                            <div className="flex-1 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="text-lg font-black text-primary">{comment.author}</h4>
                                                        <span className="text-xs font-bold text-primary/30 uppercase tracking-widest">{comment.date}</span>
                                                    </div>
                                                </div>
                                                <p className="text-primary/70 leading-relaxed font-medium text-lg">
                                                    {comment.text}
                                                </p>
                                                <div className="flex items-center gap-8 pt-2">
                                                    <button 
                                                        onClick={() => handleLike(comment.id)}
                                                        className={`flex items-center gap-2 transition-colors text-sm font-black uppercase tracking-widest ${comment.isLiked ? 'text-red-500' : 'text-primary/40 hover:text-red-500'}`}
                                                    >
                                                        <Heart size={16} fill={comment.isLiked ? "currentColor" : "none"} /> {comment.likes} J'aime
                                                    </button>
                                                    <button 
                                                        onClick={() => handleReply(comment.id)}
                                                        className="flex items-center gap-2 text-primary/40 hover:text-accent transition-colors text-sm font-black uppercase tracking-widest"
                                                    >
                                                        <Reply size={16} /> Répondre
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-32">
            <div className="bg-primary pt-40 pb-24 px-6 rounded-b-[4rem] relative overflow-hidden text-center">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-accent rounded-full blur-[120px]"></div>
                </div>
                
                <div className="container mx-auto max-w-4xl relative z-10">
                    <h1 className="text-5xl md:text-7xl font-black text-[#F5F5DC] mb-8 tracking-tighter">
                        Actualités <span className="italic font-serif text-white">& Blog.</span>
                    </h1>
                    <p className="text-[#F5F5DC]/60 text-xl font-medium max-w-2xl mx-auto">
                        Restez informé des dernières tendances et conseils du monde de l'impression au Sénégal.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-6 -mt-12 relative z-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {articles.map((article) => (
                        <div 
                            key={article.id} 
                            onClick={() => setSelectedArticle(article)}
                            className="group bg-white rounded-[3rem] overflow-hidden border border-primary/10 shadow-xl hover:shadow-2xl transition-all duration-500 cursor-pointer"
                        >
                            <div className="aspect-[16/10] overflow-hidden relative">
                                <img src={article.img} alt={article.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                <div className="absolute top-6 left-6 bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                    <Eye size={14} /> {article.views}
                                </div>
                            </div>
                            <div className="p-10">
                                <div className="flex items-center gap-4 text-primary/40 text-[10px] font-black uppercase tracking-widest mb-6">
                                    <span className="flex items-center gap-1.5"><Calendar size={12} /> {article.date}</span>
                                    <span className="flex items-center gap-1.5"><Clock size={12} /> {article.readTime}</span>
                                </div>
                                <h3 className="text-2xl font-black text-primary mb-6 group-hover:text-accent transition-colors leading-tight">
                                    {article.title}
                                </h3>
                                <p className="text-primary/60 font-medium mb-10 line-clamp-2">
                                    {article.desc}
                                </p>
                                <button className="flex items-center gap-2 text-primary font-black group-hover:gap-4 transition-all">
                                    Lire l'article <ArrowRight size={20} className="text-accent" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default NewsPage;
