import React, { useRef, useEffect, useState } from 'react';
import {
    Bold, Italic, Underline, Heading2, Heading3, List, ListOrdered,
    Quote, Link2, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// Éditeur WYSIWYG maison basé sur contentEditable + document.execCommand.
// `value` = HTML, `onChange(html)` à chaque modification.
const RichTextEditor = ({ value, onChange, placeholder = 'Rédigez votre article…' }) => {
    const editorRef = useRef(null);
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);

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
            const ext = file.name.split('.').pop();
            const path = `news/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
            const { error } = await supabase.storage.from('public-assets').upload(path, file, { cacheControl: '3600', upsert: true });
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

    const Btn = ({ onClick, title, children }) => (
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClick} title={title}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0">
            {children}
        </button>
    );
    const Sep = () => <span className="w-px h-5 bg-white/10 mx-1 shrink-0" />;

    return (
        <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/5">
            {/* Barre d'outils */}
            <div className="flex items-center flex-wrap gap-0.5 p-2 border-b border-white/10 bg-[#0F0F13] sticky top-0 z-10">
                <Btn onClick={() => exec('bold')} title="Gras"><Bold size={16} /></Btn>
                <Btn onClick={() => exec('italic')} title="Italique"><Italic size={16} /></Btn>
                <Btn onClick={() => exec('underline')} title="Souligné"><Underline size={16} /></Btn>
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
                <Btn onClick={() => fileInputRef.current?.click()} title="Insérer une image">
                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
                </Btn>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
            </div>

            {/* Zone d'édition */}
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={emit}
                onBlur={emit}
                data-placeholder={placeholder}
                className="rte-content min-h-[280px] max-h-[55vh] overflow-y-auto p-5 text-white/90 text-sm leading-relaxed focus:outline-none custom-scrollbar"
            />
        </div>
    );
};

export default RichTextEditor;
