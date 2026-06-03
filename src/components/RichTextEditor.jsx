import React, { useRef, useEffect, useState } from 'react';
import {
    Bold, Italic, Underline, Heading2, Heading3, List, ListOrdered,
    Quote, Link2, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, Loader2,
    Palette, ChevronDown, AtSign
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { compressImage } from '../lib/image';

// Éditeur WYSIWYG maison basé sur contentEditable + document.execCommand.
// `value` = HTML, `onChange(html)` à chaque modification.
const RichTextEditor = ({ value, onChange, printers, placeholder = 'Rédigez votre article…' }) => {
    const editorRef = useRef(null);
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [selectedColor, setSelectedColor] = useState('inherit');

    // Mentions (@) States
    const [showMentionList, setShowMentionList] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [mentionIndex, setMentionIndex] = useState(0);

    const handleMentionButtonClick = (e) => {
        e.preventDefault();
        editorRef.current?.focus();
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const atNode = document.createTextNode('@');
            range.insertNode(atNode);
            range.collapse(false);
            
            const newRange = document.createRange();
            newRange.setStartAfter(atNode);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            
            setShowMentionList(true);
            setMentionSearch('');
            setMentionIndex(0);
            emit();
        } else {
            setShowMentionList(!showMentionList);
            setMentionSearch('');
            setMentionIndex(0);
        }
    };

    const colors = [
        { name: 'Par défaut', value: 'inherit', class: 'border border-white/20 bg-transparent' },
        { name: 'Champagne', value: '#C9A84C', class: 'bg-[#C9A84C]' },
        { name: 'Ivoire', value: '#FAF8F5', class: 'bg-[#FAF8F5]' },
        { name: 'Corail', value: '#E8634A', class: 'bg-[#E8634A]' },
        { name: 'Bleu', value: '#2563EB', class: 'bg-[#2563EB]' },
        { name: 'Vert', value: '#10B981', class: 'bg-[#10B981]' },
        { name: 'Jaune', value: '#FBBF24', class: 'bg-[#FBBF24]' },
        { name: 'Violet', value: '#7B61FF', class: 'bg-[#7B61FF]' },
        { name: 'Sombre', value: '#0D0D12', class: 'bg-[#0D0D12]' },
    ];

    // Construit la liste filtrée d'imprimeurs avec l'option globale @Tous
    const allOption = { id: 'all', name: 'Tous', isAll: true, city: 'Tous les imprimeurs' };
    const printerList = [allOption, ...(printers || [])];
    const filteredPrinters = printerList.filter(p => 
        p.name.toLowerCase().includes(mentionSearch.toLowerCase()) ||
        p.city.toLowerCase().includes(mentionSearch.toLowerCase())
    );

    // Initialise / resynchronise le HTML sans casser le curseur pendant la frappe.
    useEffect(() => {
        const el = editorRef.current;
        if (el && document.activeElement !== el && el.innerHTML !== (value || '')) {
            el.innerHTML = value || '';
        }
    }, [value]);

    const emit = () => onChange(editorRef.current?.innerHTML || '');

    const exec = (command, arg = null) => {
        editorRef.current?.focus();
        try {
            // Force l'utilisation d'inline CSS standard <span> au lieu des balises dépréciées <font>
            document.execCommand('styleWithCSS', false, true);
        } catch (e) {}
        document.execCommand(command, false, arg);
        emit();
    };

    const setBlock = (tag) => exec('formatBlock', tag);

    const addLink = () => {
        const url = window.prompt('URL du lien (https://…)');
        if (url) exec('createLink', url);
    };

    const insertImageUrl = (url) => {
        editorRef.current?.focus();
        document.execCommand('insertHTML', false, `<img src="${url}" alt="" style="max-width:100%;border-radius:1rem;margin:1rem 0;" />`);
        emit();
    };

    const onPickImage = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const compressedFile = await compressImage(file, 1200, 1200, 0.8);
            const ext = compressedFile.name.split('.').pop();
            const path = `news/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
            const { error } = await supabase.storage.from('public-assets').upload(path, compressedFile, { cacheControl: '3600', upsert: true });
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('public-assets').getPublicUrl(path);
            insertImageUrl(publicUrl);
        } catch (err) {
            // Repli : insertion en base64 si le storage échoue.
            const reader = new FileReader();
            reader.onloadend = () => insertImageUrl(reader.result);
            reader.readAsDataURL(file);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Gestion du clavier pour le sélecteur de mentions
    const handleKeyDown = (e) => {
        if (showMentionList) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMentionIndex(prev => (prev + 1) % filteredPrinters.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMentionIndex(prev => (prev - 1 + filteredPrinters.length) % filteredPrinters.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredPrinters[mentionIndex]) {
                    insertMention(filteredPrinters[mentionIndex]);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setShowMentionList(false);
            }
        }
    };
    // Détection de la saisie d'un caractère @ avec recherche relative au curseur
    const handleInput = (e) => {
        emit();
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        
        const container = range.startContainer;
        const offset = range.startOffset;
        if (container.nodeType !== Node.TEXT_NODE) {
            setShowMentionList(false);
            return;
        }

        const text = container.textContent || '';
        const textBeforeCursor = text.substring(0, offset);
        
        // Trouve le dernier caractère @ avant le curseur
        const lastAtIdx = textBeforeCursor.lastIndexOf('@');
        if (lastAtIdx !== -1) {
            // Vérifie que le caractère précédant le @ soit un espace ou le début du nœud
            const charBeforeAt = lastAtIdx > 0 ? textBeforeCursor[lastAtIdx - 1] : ' ';
            if (/\s/.test(charBeforeAt)) {
                const searchStr = textBeforeCursor.substring(lastAtIdx + 1);
                // Vérifie qu'il n'y ait pas d'espace entre le @ et le curseur
                if (!/\s/.test(searchStr)) {
                    setShowMentionList(true);
                    setMentionSearch(searchStr);
                    setMentionIndex(0);
                    return;
                }
            }
        }
        setShowMentionList(false);
    };

    // Insertion du tag HTML de mention en supprimant l'invite de recherche @saisie
    const insertMention = (printer) => {
        editorRef.current?.focus();
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        
        const container = range.startContainer;
        const offset = range.startOffset;
        if (container.nodeType !== Node.TEXT_NODE) return;

        const text = container.textContent || '';
        const textBeforeCursor = text.substring(0, offset);
        const lastAtIdx = textBeforeCursor.lastIndexOf('@');
        if (lastAtIdx === -1) return;

        // Modifie l'étendue du range pour cibler exactement du caractère "@" jusqu'au curseur
        range.setStart(container, lastAtIdx);
        range.setEnd(container, offset);
        range.deleteContents();
        
        // Crée le tag de mention
        const el = document.createElement('span');
        el.className = 'mention-tag';
        if (printer.isAll) {
            el.setAttribute('data-mention-all', 'true');
            el.style.cssText = 'color: #E8634A; font-weight: bold; background: rgba(232, 99, 74, 0.1); padding: 2px 6px; border-radius: 4px; display: inline-block; pointer-events: none;';
            el.innerText = '@Tous';
        } else {
            el.setAttribute('data-printer-id', printer.id);
            el.style.cssText = 'color: #C9A84C; font-weight: bold; background: rgba(201, 168, 76, 0.1); padding: 2px 6px; border-radius: 4px; display: inline-block; pointer-events: none;';
            el.innerText = `@${printer.name}`;
        }
        range.insertNode(el);
        
        // Ajoute un espace insécable après la mention pour pouvoir continuer à écrire
        const space = document.createTextNode('\u00A0');
        range.collapse(false);
        range.insertNode(space);
        
        // Repositionne le curseur après l'espace insécable
        const newRange = document.createRange();
        newRange.setStartAfter(space);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        setShowMentionList(false);
        emit();
    };

    const Btn = ({ onClick, title, children }) => (
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClick} title={title}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0">
            {children}
        </button>
    );
    const Sep = () => <span className="w-px h-5 bg-white/10 mx-1 shrink-0" />;

    return (
        <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/5 relative">
            {/* Barre d'outils */}
            <div className="flex items-center flex-wrap gap-0.5 p-2 border-b border-white/10 bg-[#0F0F13] sticky top-0 z-10">
                <Btn onClick={() => exec('bold')} title="Gras"><Bold size={16} /></Btn>
                <Btn onClick={() => exec('italic')} title="Italique"><Italic size={16} /></Btn>
                <Btn onClick={() => exec('underline')} title="Souligné"><Underline size={16} /></Btn>
                <Sep />
                {/* Sélecteur de couleur */}
                <div className="relative shrink-0 flex items-center">
                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        title="Couleur du texte"
                        className="h-9 px-2 flex items-center gap-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <Palette size={16} style={{ color: selectedColor !== 'inherit' ? selectedColor : undefined }} />
                        <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: selectedColor !== 'inherit' ? selectedColor : 'transparent' }} />
                        <ChevronDown size={12} className={`transition-transform duration-200 ${showColorPicker ? 'rotate-180' : ''}`} />
                    </button>
                    {showColorPicker && (
                        <>
                            <div className="fixed inset-0 z-20" onClick={() => setShowColorPicker(false)} />
                            <div className="absolute left-0 top-full mt-1 p-2 bg-[#111116] border border-white/10 rounded-xl shadow-2xl flex flex-col gap-2 z-30 w-44">
                                <div className="grid grid-cols-5 gap-1.5">
                                    {colors.map((c) => (
                                        <button
                                            key={c.name}
                                            type="button"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => {
                                                exec('foreColor', c.value);
                                                setSelectedColor(c.value);
                                                setShowColorPicker(false);
                                            }}
                                            title={c.name}
                                            className={`w-6 h-6 rounded-full border border-white/5 transition-transform hover:scale-110 active:scale-95 shrink-0 ${c.class}`}
                                        />
                                    ))}
                                    {/* Couleur personnalisée */}
                                    <label
                                        onMouseDown={(e) => e.preventDefault()}
                                        className="w-6 h-6 rounded-full cursor-pointer border border-white/20 bg-gradient-to-tr from-red-500 via-green-500 to-blue-500 flex items-center justify-center overflow-hidden transition-transform hover:scale-110 active:scale-95 shrink-0"
                                        title="Couleur personnalisée"
                                    >
                                        <input
                                            type="color"
                                            value={selectedColor !== 'inherit' ? selectedColor : '#C9A84C'}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                exec('foreColor', val);
                                                setSelectedColor(val);
                                            }}
                                            className="sr-only"
                                        />
                                    </label>
                                </div>
                                <div className="text-[9px] font-black uppercase tracking-wider text-center text-white/30 pt-1.5 border-t border-white/5">
                                    Texte
                                </div>
                            </div>
                        </>
                    )}
                </div>
                <Sep />
                <Btn onClick={() => setBlock('<h2>')} title="Grand titre"><Heading2 size={16} /></Btn>
                <Btn onClick={() => setBlock('<h3>')} title="Sous-titre"><Heading3 size={16} /></Btn>
                <Btn onClick={() => setBlock('<p>')} title="Paragraphe"><span className="text-xs font-black">P</span></Btn>
                <Sep />
                <Btn onClick={() => exec('insertUnorderedList')} title="Liste à puces"><List size={16} /></Btn>
                <Btn onClick={() => exec('insertOrderedList')} title="Liste numérotée"><ListOrdered size={16} /></Btn>
                <Btn onClick={() => setBlock('<blockquote>')} title="Citation"><Quote size={16} /></Btn>
                <Sep />
                <Btn onClick={() => exec('justifyLeft')} title="Aligner à gauche"><AlignLeft size={16} /></Btn>
                <Btn onClick={() => exec('justifyCenter')} title="Centrer"><AlignCenter size={16} /></Btn>
                <Btn onClick={() => exec('justifyRight')} title="Aligner à droite"><AlignRight size={16} /></Btn>
                <Sep />
                <Btn onClick={addLink} title="Insérer un lien"><Link2 size={16} /></Btn>
                <Btn onClick={handleMentionButtonClick} title="Mentionner un imprimeur (@)"><AtSign size={16} /></Btn>
                <Btn onClick={() => fileInputRef.current?.click()} title="Insérer une image">
                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
                </Btn>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
            </div>

            {/* Liste de sélection des mentions */}
            {showMentionList && filteredPrinters.length > 0 && (
                <div className="absolute left-4 bottom-14 max-h-48 w-64 bg-[#111116] border border-white/10 rounded-2xl shadow-2xl overflow-y-auto z-40 p-2 space-y-1 custom-scrollbar">
                    <div className="text-[9px] font-black uppercase tracking-wider text-white/30 px-3 py-1.5 border-b border-white/5 mb-1">
                        Mentionner (Entrée)
                    </div>
                    {filteredPrinters.map((p, idx) => (
                        <button
                            key={p.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => insertMention(p)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors
                                ${idx === mentionIndex ? 'bg-[#C9A84C] text-[#0F0F13]' : 'text-white/80 hover:bg-white/5 hover:text-white'}`}
                        >
                            <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${p.isAll ? 'bg-red-400 animate-pulse' : 'bg-[#C9A84C]'}`} />
                                <span className="text-xs font-bold truncate max-w-[150px]">{p.name}</span>
                            </div>
                            <span className={`text-[9px] uppercase tracking-wider font-bold shrink-0 ${idx === mentionIndex ? 'text-[#0F0F13]/60' : 'text-white/30'}`}>
                                {p.city}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* Zone d'édition */}
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onBlur={emit}
                data-placeholder={placeholder}
                className="rte-content min-h-[280px] max-h-[55vh] overflow-y-auto p-5 text-white/90 text-sm leading-relaxed focus:outline-none custom-scrollbar"
            />
        </div>
    );
};

export default RichTextEditor;
