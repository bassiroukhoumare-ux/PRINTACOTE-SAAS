import React, { useState, useEffect } from 'react';
import { ArrowRight, Calendar, Clock, Eye, Share2, MessageCircle, ArrowLeft, Send, User, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { updateSEO } from '../lib/seo';

// Formate un nombre de vues réel (entier) en format compact (ex. 1200 -> "1.2k").
const formatViews = (value) => {
    const n = Number(value) || 0;
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}k`;
    return `${n}`;
};

// Optimise le chargement des images d'Unsplash en ajoutant des paramètres de compression
const optimizeImage = (url, width = 800) => {
    if (!url) return '';
    if (url.includes('images.unsplash.com')) {
        const base = url.split('?')[0];
        return `${base}?auto=format&fit=crop&w=${width}&q=80`;
    }
    return url;
};

// Nettoie le contenu HTML des couleurs trop claires (comme le blanc ou l'ivoire) 
// pour qu'elles s'adaptent harmonieusement au fond clair de la page publique.
const cleanContent = (html) => {
    if (!html) return '';
    // Remplace les couleurs trop claires dans les attributs style
    let cleaned = html.replace(/color\s*:\s*([^;'">]+)/gi, (match, color) => {
        const trimmed = color.trim().toLowerCase();
        if (trimmed === '#ffffff' || trimmed === '#fff' || trimmed === '#faf8f5' || trimmed === '#f5f3ee' || trimmed === '#f0eff4' || trimmed === 'white' || trimmed === '#f5f5dc') {
            return 'color: inherit';
        }
        const rgbMatch = trimmed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
            const r = parseInt(rgbMatch[1]);
            const g = parseInt(rgbMatch[2]);
            const b = parseInt(rgbMatch[3]);
            if (r > 200 && g > 200 && b > 200) {
                return 'color: inherit';
            }
        }
        return match;
    });
    // Remplace les couleurs trop claires dans les balises <font color="...">
    cleaned = cleaned.replace(/color\s*=\s*["']([^"']+)["']/gi, (match, color) => {
        const trimmed = color.trim().toLowerCase();
        if (trimmed === '#ffffff' || trimmed === '#fff' || trimmed === '#faf8f5' || trimmed === '#f5f3ee' || trimmed === '#f0eff4' || trimmed === 'white' || trimmed === '#f5f5dc') {
            return 'color="inherit"';
        }
        const rgbMatch = trimmed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
            const r = parseInt(rgbMatch[1]);
            const g = parseInt(rgbMatch[2]);
            const b = parseInt(rgbMatch[3]);
            if (r > 200 && g > 200 && b > 200) {
                return 'color="inherit"';
            }
        }
        return match;
    });
    return cleaned;
};

const NewsPage = ({ setPage, setSelectedPrinterId }) => {
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [comments, setComments] = useState([]);
    const [mentionedPrinters, setMentionedPrinters] = useState([]);
    const [newComment, setNewComment] = useState({ name: '', email: '', text: '' });
    const [commentSubmitting, setCommentSubmitting] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [copied, setCopied] = useState(false);

    // Articles réellement affichés : chargés UNIQUEMENT depuis la table news.
    const [articles, setArticles] = useState([]);
    const [loadingNews, setLoadingNews] = useState(true);

    // Charge les articles au démarrage
    useEffect(() => {
        const fetchNews = async () => {
            const { data, error } = await supabase
                .from('news')
                .select('*')
                .eq('published', true)
                .order('created_at', { ascending: false });
            if (!error && Array.isArray(data)) {
                const mapped = data.map((n) => ({
                    id: n.id,
                    title: n.title,
                    desc: n.excerpt || '',
                    content: n.content || '',
                    views: formatViews(n.views),
                    date: new Date(n.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
                    readTime: n.read_time || '5 min',
                    img: n.image_url,
                    category: n.category || 'Actualité',
                    tags: Array.isArray(n.tags) ? n.tags : [],
                    mentions: Array.isArray(n.mentions) ? n.mentions : []
                }));
                setArticles(mapped);
                
                // Routage par URL : auto-sélection de l'article si l'ID est dans les paramètres d'URL (?article=ID)
                const params = new URLSearchParams(window.location.search);
                const articleId = params.get('article');
                if (articleId) {
                    const found = mapped.find(a => a.id === articleId);
                    if (found) {
                        setSelectedArticle(found);
                    }
                }
            }
            setLoadingNews(false);
        };
        fetchNews();
    }, []);

    // Met à jour l'URL lors de la sélection/désélection d'un article pour conserver les liens de partage
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (selectedArticle?.id) {
            if (params.get('article') !== selectedArticle.id) {
                params.set('article', selectedArticle.id);
                window.history.pushState(null, '', `?${params.toString()}`);
            }
        } else {
            if (params.has('article')) {
                params.delete('article');
                const search = params.toString();
                window.history.pushState(null, '', search ? `?${search}` : window.location.pathname);
            }
        }
    }, [selectedArticle]);

    // Charge les commentaires et imprimeurs mentionnés à l'ouverture d'un article.
    useEffect(() => {
        if (!selectedArticle?.id) { 
            setComments([]); 
            setMentionedPrinters([]);
            
            // Restore blog list view SEO
            updateSEO({
                title: "Actualités & Blog — Printacoté",
                description: "Restez informé des dernières tendances et conseils du monde de l'impression professionnelle au Sénégal.",
                imageUrl: "/og-image.png",
                url: "/actualites"
            });
            return; 
        }
        let cancelled = false;

        // Update article detail SEO
        updateSEO({
            title: `${selectedArticle.title} — Actualités Printacoté`,
            description: selectedArticle.desc || "Lisez notre dernier article sur le blog de Printacoté.",
            imageUrl: selectedArticle.img || "/og-image.png",
            url: `/actualites?article=${selectedArticle.id}`
        });

        const loadComments = async () => {
            const { data } = await supabase
                .from('comments')
                .select('*')
                .eq('news_id', selectedArticle.id)
                .eq('approved', true)
                .order('created_at', { ascending: false });
            if (!cancelled) setComments(Array.isArray(data) ? data : []);
        };

        const loadMentions = async () => {
            if (selectedArticle.mentions && selectedArticle.mentions.length > 0) {
                const { data } = await supabase
                    .from('printers')
                    .select('id, name, city, logo_url')
                    .in('id', selectedArticle.mentions);
                if (!cancelled) setMentionedPrinters(Array.isArray(data) ? data : []);
            } else {
                if (!cancelled) setMentionedPrinters([]);
            }
        };

        loadComments();
        loadMentions();
        supabase.rpc('increment_news_views', { p_id: selectedArticle.id }).then(undefined, () => {});
        return () => { cancelled = true; };
    }, [selectedArticle?.id]);

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!newComment.name.trim() || !newComment.text.trim() || !selectedArticle?.id) return;
        setCommentSubmitting(true);
        const { data, error } = await supabase
            .from('comments')
            .insert({
                news_id: selectedArticle.id,
                author_name: newComment.name.trim(),
                author_email: newComment.email.trim() || null,
                content: newComment.text.trim(),
            })
            .select()
            .single();
        if (!error && data) {
            setComments([data, ...comments]);
            setNewComment({ name: '', email: '', text: '' });
        }
        setCommentSubmitting(false);
    };

    const relativeDate = (iso) => {
        try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); }
        catch (e) { return ''; }
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
                            <img src={optimizeImage(selectedArticle.img, 1200)} alt={selectedArticle.title} loading="lazy" className="w-full h-full object-cover" />
                        </div>
                        
                        <div className="p-10 md:p-20">
                            <div className="flex flex-wrap items-center justify-between gap-6 mb-10">
                                <div className="flex flex-wrap items-center gap-6 text-primary/40 text-sm font-black uppercase tracking-widest">
                                    <div className="flex items-center gap-2"><Calendar size={16} /> {selectedArticle.date}</div>
                                    <div className="flex items-center gap-2"><Clock size={16} /> {selectedArticle.readTime}</div>
                                    <div className="flex items-center gap-2"><Eye size={16} /> {selectedArticle.views} vues</div>
                                </div>
                                {selectedArticle.category && (
                                    <span className="bg-primary text-accent text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-lg shadow-primary/5">
                                        {selectedArticle.category}
                                    </span>
                                )}
                            </div>

                            <h1 className="text-4xl md:text-6xl font-black text-primary mb-6 tracking-tight leading-tight">
                                {selectedArticle.title}
                            </h1>

                            {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-12">
                                    {selectedArticle.tags.map(t => (
                                        <span key={t} className="text-xs font-black uppercase tracking-wider text-primary/50 bg-primary/5 border border-primary/10 px-3 py-1.5 rounded-xl">
                                            #{t}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="prose-news max-w-none mb-16" dangerouslySetInnerHTML={{ __html: cleanContent(selectedArticle.content) }} />

                            {/* Section Imprimeurs mentionnés */}
                            {mentionedPrinters && mentionedPrinters.length > 0 && (
                                <div className="pt-12 border-t border-primary/10 mb-16">
                                    <h4 className="text-lg font-black text-primary mb-6 uppercase tracking-wider">
                                        Imprimeurs mis en avant dans cet article
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {mentionedPrinters.map(p => (
                                            <div 
                                                key={p.id}
                                                onClick={() => {
                                                    if (setSelectedPrinterId) {
                                                        setSelectedPrinterId(p.id);
                                                        setPage('printer_detail');
                                                    }
                                                }}
                                                className="flex items-center gap-4 p-4 bg-primary/5 border border-primary/10 rounded-3xl hover:bg-primary/10 transition-colors cursor-pointer group"
                                            >
                                                <div className="w-12 h-12 rounded-xl bg-white border border-primary/10 overflow-hidden flex items-center justify-center shrink-0">
                                                    {p.logo_url ? (
                                                        <img src={optimizeImage(p.logo_url, 120)} alt="" loading="lazy" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-xs font-black text-primary/40">{p.name.slice(0, 2).toUpperCase()}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <h5 className="font-black text-primary group-hover:text-accent transition-colors leading-tight text-sm">
                                                        {p.name}
                                                    </h5>
                                                    <span className="text-[10px] font-bold text-primary/30 uppercase tracking-widest block mt-0.5">
                                                        {p.city}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="pt-12 border-t border-primary/10 flex flex-wrap gap-6 items-center justify-between mb-16">
                                <div className="text-primary font-black">Partager cet article :</div>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => setShowShareModal(true)} 
                                        className="bg-primary text-accent px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/10"
                                    >
                                        <Share2 size={20} /> Partager l'article
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
                                            placeholder="Que pensez-vous de cet article ?"
                                            className="w-full bg-white border border-primary/10 rounded-3xl px-6 py-4 focus:outline-none focus:border-accent font-bold resize-none"
                                        ></textarea>
                                    </div>
                                    <button type="submit" disabled={commentSubmitting} className="bg-primary text-accent px-10 py-5 rounded-2xl font-black flex items-center gap-3 hover:scale-105 transition-transform shadow-xl disabled:opacity-50">
                                        {commentSubmitting ? 'Envoi…' : 'Publier mon commentaire'}
                                        <Send size={18} />
                                    </button>
                                </form>

                                {/* Comments List */}
                                <div className="space-y-12">
                                    {comments.length === 0 && (
                                        <p className="text-primary/40 font-bold text-center py-8">Soyez le premier à commenter cet article.</p>
                                    )}
                                    {comments.map((comment) => (
                                        <div key={comment.id} className="flex gap-6 group">
                                            <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center text-primary shrink-0">
                                                <User size={32} />
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <h4 className="text-lg font-black text-primary">{comment.author_name}</h4>
                                                <span className="text-xs font-bold text-primary/30 uppercase tracking-widest">{relativeDate(comment.created_at)}</span>
                                                <p className="text-primary/70 leading-relaxed font-medium text-lg pt-2">
                                                    {comment.content}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modal de Partage Premium */}
                {showShareModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white border border-primary/15 rounded-[3rem] p-6 sm:p-8 w-full max-w-xl relative shadow-2xl animate-in zoom-in-95 duration-300">
                            {/* Header */}
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-black text-primary">Partager l'article</h3>
                                <button onClick={() => setShowShareModal(false)} className="p-2 text-primary/40 hover:text-primary transition-colors rounded-xl hover:bg-primary/5">
                                    <XCircle size={22} />
                                </button>
                            </div>

                            {/* Aperçu Réel Carte de Partage (Mockup Facebook) */}
                            <div className="border border-primary/10 rounded-2xl bg-primary/5 p-4 mb-6 shadow-inner text-left font-sans">
                                {/* FB Profile Header */}
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-9 h-9 rounded-full bg-primary text-accent flex items-center justify-center text-xs font-black">
                                        P
                                    </div>
                                    <div>
                                        <div className="text-xs font-black text-primary leading-tight">Printacoté</div>
                                        <div className="text-[10px] font-bold text-primary/30 uppercase tracking-wider flex items-center gap-1">
                                            À l'instant • 🌐
                                        </div>
                                    </div>
                                </div>
                                
                                {/* FB Text comment */}
                                <p className="text-xs text-primary/80 font-bold mb-3">
                                    Découvrez notre dernier article sur Printacoté ! 💡👇
                                </p>

                                {/* FB Card Embed */}
                                <div className="border border-primary/10 rounded-xl overflow-hidden bg-white hover:bg-primary/5 transition-colors cursor-pointer">
                                    <div className="aspect-[16/9] w-full border-b border-primary/5 overflow-hidden">
                                        <img src={optimizeImage(selectedArticle.img, 600)} alt="" loading="lazy" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="p-3.5 space-y-1">
                                        <span className="text-[9px] font-black text-primary/30 uppercase tracking-widest block">
                                            PRINTACOTE.COM
                                        </span>
                                        <h4 className="text-xs font-black text-primary leading-snug line-clamp-1">
                                            {selectedArticle.title}
                                        </h4>
                                        <p className="text-[10px] font-medium text-primary/50 line-clamp-2 leading-relaxed">
                                            {selectedArticle.desc}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Boutons de partage direct */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <button 
                                    onClick={() => {
                                        const url = `${window.location.origin}/actualites?article=${selectedArticle.id}`;
                                        window.open(`https://wa.me/?text=${encodeURIComponent(`Découvrez cet article sur Printacoté : "${selectedArticle.title}" \nLien : ${url}`)}`, '_blank');
                                    }}
                                    className="bg-[#25D366] text-white py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-md"
                                >
                                    <MessageCircle size={16} /> WhatsApp
                                </button>
                                <button 
                                    onClick={() => {
                                        const url = `${window.location.origin}/actualites?article=${selectedArticle.id}`;
                                        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
                                    }}
                                    className="bg-[#1877F2] text-white py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-md"
                                >
                                    <Share2 size={16} /> Facebook
                                </button>
                                <button 
                                    onClick={() => {
                                        const url = `${window.location.origin}/actualites?article=${selectedArticle.id}`;
                                        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
                                    }}
                                    className="bg-[#0A66C2] text-white py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-md"
                                >
                                    <Share2 size={16} /> LinkedIn
                                </button>
                                <button 
                                    onClick={() => {
                                        const url = `${window.location.origin}/actualites?article=${selectedArticle.id}`;
                                        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(selectedArticle.title)}&url=${encodeURIComponent(url)}`, '_blank');
                                    }}
                                    className="bg-black text-white py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-md"
                                >
                                    <Share2 size={16} /> Twitter / X
                                </button>
                            </div>

                            {/* Copier le lien direct */}
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    readOnly
                                    value={`${window.location.origin}/actualites?article=${selectedArticle.id}`}
                                    className="flex-1 bg-primary/5 border border-primary/10 rounded-xl px-4 py-2 text-xs font-bold text-primary/70 focus:outline-none"
                                />
                                <button 
                                    onClick={() => {
                                        const url = `${window.location.origin}/actualites?article=${selectedArticle.id}`;
                                        navigator.clipboard.writeText(url);
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 2000);
                                    }}
                                    className="bg-primary text-accent px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-primary/95 flex items-center gap-1.5 transition-colors shrink-0"
                                >
                                    {copied ? 'Copié !' : 'Copier'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
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
                {!loadingNews && articles.length === 0 && (
                    <div className="bg-white rounded-[3rem] border border-primary/10 shadow-xl p-16 text-center max-w-2xl mx-auto">
                        <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-6 text-primary">
                            <Calendar size={32} />
                        </div>
                        <h3 className="text-2xl font-black text-primary mb-3">Aucune actualité pour le moment</h3>
                        <p className="text-primary/50 font-medium">Nos premiers articles arrivent très bientôt. Revenez prochainement !</p>
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {articles.map((article) => (
                        <div 
                            key={article.id} 
                            onClick={() => setSelectedArticle(article)}
                            className="group bg-white rounded-[3rem] overflow-hidden border border-primary/10 shadow-xl hover:shadow-2xl transition-all duration-500 cursor-pointer flex flex-col justify-between"
                        >
                            <div>
                                <div className="aspect-[16/10] overflow-hidden relative">
                                    <img src={optimizeImage(article.img, 800)} alt={article.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    <div className="absolute top-6 left-6 bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                        <Eye size={14} /> {article.views}
                                    </div>
                                </div>
                                <div className="p-10 pb-0">
                                    <div className="flex items-center justify-between gap-4 mb-6">
                                        <div className="flex items-center gap-4 text-primary/40 text-[10px] font-black uppercase tracking-widest">
                                            <span className="flex items-center gap-1.5"><Calendar size={12} /> {article.date}</span>
                                            <span className="flex items-center gap-1.5"><Clock size={12} /> {article.readTime}</span>
                                        </div>
                                        {article.category && (
                                            <span className="bg-primary/5 text-primary border border-primary/10 text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
                                                {article.category}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-2xl font-black text-primary mb-4 group-hover:text-accent transition-colors leading-tight line-clamp-2">
                                        {article.title}
                                    </h3>
                                    <p className="text-primary/60 font-medium mb-4 line-clamp-2">
                                        {article.desc}
                                    </p>
                                    
                                    {article.tags && article.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mb-6">
                                            {article.tags.map(t => (
                                                <span key={t} className="text-[9px] font-black text-primary/40 bg-primary/5 px-2.5 py-1 rounded-lg">
                                                    #{t}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="p-10 pt-0">
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
