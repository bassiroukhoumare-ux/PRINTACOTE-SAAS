import React, { useState, useEffect, useRef } from 'react';
import { Plus, Store, ShoppingBag, X, Trash2, Loader2, DollarSign, Tag, Archive, Pencil } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { compressImage } from '../../lib/image';

const DashboardMarketplace = ({ printerData, onUpdate, autoOpenModal, setAutoOpenModal, showToast, showConfirm, limits, requireUpgrade }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const productImageRef = useRef(null);
    const [uploadedImageUrl, setUploadedImageUrl] = useState('');
    const [uploadingImage, setUploadingImage] = useState(false);

    useEffect(() => {
        if (autoOpenModal) {
            openAddModal();
            setAutoOpenModal(false);
        }
    }, [autoOpenModal, setAutoOpenModal]);

    const [newProduct, setNewProduct] = useState({
        name: '',
        price: '',
        promo_price: '',
        discount: '',
        description: '',
        quantity: 'En stock',
        format: '',
        quality: '',
        category: 'Encre',
    });

    const [editingProduct, setEditingProduct] = useState(null);
    const [customCategory, setCustomCategory] = useState('');

    const openAddModal = () => {
        if (limits && products.length >= limits.maxProducts) { requireUpgrade?.('produits'); return; }
        setEditingProduct(null);
        setNewProduct({
            name: '',
            price: '',
            promo_price: '',
            discount: '',
            description: '',
            quantity: 'En stock',
            format: '',
            quality: '',
            category: 'Encre',
        });
        setCustomCategory('');
        setUploadedImageUrl('');
        setIsModalOpen(true);
    };

    const handleEditProduct = (product) => {
        setEditingProduct(product);
        const cat = product.options?.category || 'Encre';
        const isStandard = ['Encre', 'Papier', 'Machines', 'Accessoires'].includes(cat);
        setNewProduct({
            name: product.name,
            price: product.price.toString(),
            promo_price: product.promo_price ? product.promo_price.toString() : '',
            discount: product.discount ? product.discount.toString() : '',
            description: product.description,
            quantity: product.options?.quantity || 'En stock',
            format: product.options?.format || '',
            quality: product.options?.quality || '',
            category: isStandard ? cat : 'Autre',
        });
        setCustomCategory(isStandard ? '' : cat);
        setUploadedImageUrl(product.images?.[0] || '');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
        setNewProduct({
            name: '',
            price: '',
            promo_price: '',
            discount: '',
            description: '',
            quantity: 'En stock',
            format: '',
            quality: '',
            category: 'Encre',
        });
        setCustomCategory('');
        setUploadedImageUrl('');
    };

    useEffect(() => {
        if (printerData) {
            fetchProducts();
        }
    }, [printerData]);

    const fetchProducts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('printer_id', printerData.id)
            .order('name', { ascending: true });

        if (!error && data) {
            setProducts(data);
        }
        setLoading(false);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingImage(true);
        try {
            const compressedFile = await compressImage(file, 1000, 1000, 0.8);
            const fileExt = compressedFile.name.split('.').pop();
            const fileName = `${printerData.id}/product_${Date.now()}.${fileExt}`;

            const { data, error } = await supabase.storage
                .from('public-assets')
                .upload(fileName, compressedFile, { cacheControl: '3600', upsert: true });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('public-assets')
                .getPublicUrl(fileName);

            setUploadedImageUrl(publicUrl);
        } catch (storageError) {
            console.warn("Storage upload failed for product, falling back to base64:", storageError.message);
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadedImageUrl(reader.result);
            };
            reader.readAsDataURL(file);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        setActionLoading(true);

        const imgUrl = uploadedImageUrl || 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc53e?q=80&w=1000';
        const catValue = newProduct.category === 'Autre' ? customCategory : newProduct.category;

        const productPayload = {
            printer_id: printerData.id,
            name: newProduct.name,
            price: parseFloat(newProduct.price),
            promo_price: newProduct.promo_price ? parseFloat(newProduct.promo_price) : null,
            discount: newProduct.discount ? parseInt(newProduct.discount) : null,
            description: newProduct.description,
            images: [imgUrl],
            options: {
                quantity: newProduct.quantity,
                format: newProduct.format || 'Standard',
                quality: newProduct.quality || 'Standard',
                category: catValue || 'Encre',
            }
        };

        let result;
        if (editingProduct) {
            result = await supabase
                .from('products')
                .update(productPayload)
                .eq('id', editingProduct.id);
        } else {
            result = await supabase
                .from('products')
                .insert([productPayload]);
        }

        const { error } = result;

        if (!error) {
            showToast(editingProduct ? 'Produit modifié avec succès !' : 'Produit ajouté avec succès !');
            handleCloseModal();
            fetchProducts();
            if (onUpdate) onUpdate();
        } else {
            showToast("Erreur lors de l'enregistrement : " + error.message, 'error');
        }
        setActionLoading(false);
    };

    const handleDeleteProduct = async (productId) => {
        const confirmed = await showConfirm("Retirer le produit", "Voulez-vous vraiment retirer ce produit de votre boutique ?");
        if (!confirmed) return;

        setActionLoading(true);
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId);

        if (!error) {
            showToast('Produit retiré avec succès !');
            fetchProducts();
            if (onUpdate) onUpdate();
        } else {
            showToast("Erreur lors de la suppression : " + error.message, 'error');
        }
        setActionLoading(false);
    };

    return (
        <div className="max-w-6xl">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                <div>
                    <h2 className="text-4xl font-black tracking-tight mb-2">Ma Boutique</h2>
                    <p className="text-dark/40 text-lg">Gérez vos consommables, maquettes et matériels d'impression en vente.</p>
                </div>
                <button 
                    onClick={openAddModal}
                    className={`px-8 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all active:scale-95 hover:scale-105 shadow-2xl
                        ${limits && limits.maxProducts === 0 ? 'bg-dark/5 text-dark/35 shadow-none' : 'bg-primary text-white shadow-primary/20'}`}
                >
                    <Plus size={20} /> Ajouter un produit
                </button>
            </header>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-primary" size={48} />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {products.map((p) => (
                        <div key={p.id} className="group bg-white rounded-[3rem] overflow-hidden border border-dark/10 hover:shadow-2xl transition-all duration-500 flex flex-col h-full relative">
                            <div className="absolute top-6 right-6 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => handleEditProduct(p)}
                                    className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                                >
                                    <Pencil size={18} />
                                </button>
                                <button 
                                    onClick={() => handleDeleteProduct(p.id)}
                                    className="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                            <div className="relative aspect-[4/3] overflow-hidden">
                                <img src={p.images?.[0] || 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc53e?q=80&w=1000'} alt={p.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                {p.discount && (
                                    <div className="absolute top-6 left-6 bg-red-500 text-white px-3 py-1.5 rounded-xl text-xs font-black shadow-xl">
                                        -{p.discount}%
                                    </div>
                                )}
                            </div>
                            <div className="p-8 flex flex-col flex-1">
                                <div className="flex justify-between items-start gap-4 mb-3">
                                    <h3 className="text-xl font-black text-primary tracking-tight leading-tight group-hover:text-primary/75 transition-colors">{p.name}</h3>
                                    <div className="text-right shrink-0">
                                        {p.promo_price ? (
                                            <>
                                                <div className="text-primary font-black text-lg">{p.promo_price} FCFA</div>
                                                <div className="text-xs text-dark/30 line-through font-bold">{p.price} FCFA</div>
                                            </>
                                        ) : (
                                            <div className="text-primary font-black text-lg">{p.price} FCFA</div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[#3D0B37]/65 mb-3">{p.options?.category || 'Consommable'}</div>
                                <p className="text-primary/60 text-sm font-medium mb-6 line-clamp-3 leading-relaxed flex-1">
                                    {p.description}
                                </p>
                                <div className="flex items-center justify-between pt-4 border-t border-primary/5 text-xs font-bold text-dark/40">
                                    <span>Stock : {p.options?.quantity || 'En stock'}</span>
                                    <span>Format : {p.options?.format || 'Standard'}</span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {products.length === 0 && (
                        limits && limits.maxProducts === 0 ? (
                            <div className="col-span-full bg-[#3D0B37]/5 border-2 border-dashed border-red-500/20 rounded-[3.5rem] p-16 text-center">
                                <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8">
                                    <Archive size={40} />
                                </div>
                                <h3 className="text-3xl font-black text-[#3D0B37] mb-4 tracking-tight">Boutique réservée aux membres Pro</h3>
                                <p className="text-[#3D0B37]/60 max-w-lg mx-auto text-lg leading-relaxed mb-10">
                                    La publication d'articles sur la boutique / marketplace est réservée aux abonnés Premium. Mettez votre compte à niveau pour vendre vos matériels et consommables.
                                </p>
                                <button 
                                    onClick={() => requireUpgrade?.('produits')}
                                    className="bg-primary text-white px-10 py-5 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-2xl shadow-primary/20 mx-auto"
                                >
                                    Découvrir les offres Premium
                                </button>
                            </div>
                        ) : (
                            <div className="col-span-full bg-[#3D0B37]/5 border-2 border-dashed border-[#3D0B37]/20 rounded-[3.5rem] p-16 text-center">
                                <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                                    <ShoppingBag size={40} />
                                </div>
                                <h3 className="text-3xl font-black text-[#3D0B37] mb-4 tracking-tight">Votre boutique est prête !</h3>
                                <p className="text-[#3D0B37]/60 max-w-lg mx-auto text-lg leading-relaxed mb-10">
                                    Ajoutez votre premier consommable, encre, papier ou matériel et commencez à recevoir des prospects qualifiés.
                                </p>
                                <button 
                                    onClick={openAddModal}
                                    className="bg-primary text-white px-10 py-5 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-2xl shadow-primary/20 mx-auto"
                                >
                                    Ajouter mon premier produit
                                    <Plus size={20} />
                                </button>
                            </div>
                        )
                    )}
                </div>
            )}

            {/* Add Product Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-primary/20 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] p-8 md:p-10 w-full max-w-2xl my-8 relative z-10 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-8 shrink-0">
                            <h3 className="text-2xl font-black">{editingProduct ? 'Modifier le Produit' : 'Nouveau Produit'}</h3>
                            <button onClick={handleCloseModal} className="p-2 bg-dark/5 rounded-xl"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleAddProduct} className="space-y-6">
                            {/* Image Selection Area */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dark/60 ml-2">Image du produit</label>
                                <input 
                                    type="file" 
                                    ref={productImageRef} 
                                    onChange={handleImageUpload} 
                                    accept="image/*" 
                                    className="hidden" 
                                />
                                <div 
                                    onClick={() => productImageRef.current?.click()}
                                    className="h-44 bg-dark/5 rounded-[2rem] border-2 border-dashed border-dark/15 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-dark/10 transition-all overflow-hidden relative"
                                >
                                    {uploadingImage ? (
                                        <Loader2 className="animate-spin text-primary" size={32} />
                                    ) : uploadedImageUrl ? (
                                        <img src={uploadedImageUrl} alt="Product preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <ShoppingBag size={32} className="text-dark/40" />
                                            <span className="font-bold text-xs uppercase tracking-widest text-dark/60">Cliquez pour choisir une photo</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-dark/60 ml-2">Nom du produit</label>
                                    <input 
                                        required
                                        placeholder="Ex: Encre Offset Cyan"
                                        className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-dark"
                                        value={newProduct.name}
                                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-dark/60 ml-2">Catégorie</label>
                                    <select 
                                        className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm text-dark"
                                        value={newProduct.category}
                                        onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                                    >
                                        <option value="Encre">Encre</option>
                                        <option value="Papier">Papier</option>
                                        <option value="Machines">Machines</option>
                                        <option value="Accessoires">Accessoires</option>
                                        <option value="Autre">Autre</option>
                                    </select>
                                </div>
                            </div>

                            {newProduct.category === 'Autre' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-dark/60 ml-2">Préciser la catégorie (Autre)</label>
                                    <input 
                                        required
                                        placeholder="Ex: Nettoyant, Pièces détachées..."
                                        className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-dark"
                                        value={customCategory}
                                        onChange={(e) => setCustomCategory(e.target.value)}
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-dark/60 ml-2">Prix (FCFA)</label>
                                    <input 
                                        required
                                        type="number"
                                        placeholder="Ex: 45000"
                                        className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm text-dark"
                                        value={newProduct.price}
                                        onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-dark/60 ml-2">Prix Promo (FCFA)</label>
                                    <input 
                                        type="number"
                                        placeholder="Ex: 38000"
                                        className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm text-dark"
                                        value={newProduct.promo_price}
                                        onChange={(e) => setNewProduct({ ...newProduct, promo_price: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-dark/60 ml-2">Remise (%)</label>
                                    <input 
                                        type="number"
                                        placeholder="Ex: 15"
                                        className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm text-dark"
                                        value={newProduct.discount}
                                        onChange={(e) => setNewProduct({ ...newProduct, discount: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-dark/60 ml-2">Quantité / Stock</label>
                                    <input 
                                        placeholder="Ex: 50 bidons, En Stock"
                                        className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm text-dark"
                                        value={newProduct.quantity}
                                        onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-dark/60 ml-2">Format / Volume</label>
                                    <input 
                                        placeholder="Ex: 5 Litres, A4, 50x70cm"
                                        className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm text-dark"
                                        value={newProduct.format}
                                        onChange={(e) => setNewProduct({ ...newProduct, format: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-dark/60 ml-2">Qualité / Type</label>
                                    <input 
                                        placeholder="Ex: Couché Brillant, Premium"
                                        className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm text-dark"
                                        value={newProduct.quality}
                                        onChange={(e) => setNewProduct({ ...newProduct, quality: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dark/60 ml-2">Description</label>
                                <textarea 
                                    required
                                    rows="4"
                                    placeholder="Détails du produit, état, conditions de livraison..."
                                    className="w-full bg-dark/5 border-2 border-transparent rounded-2xl px-6 py-4 focus:outline-none focus:bg-white focus:border-primary/20 transition-all font-bold resize-none text-dark"
                                    value={newProduct.description}
                                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                                ></textarea>
                            </div>

                            <button 
                                type="submit" 
                                disabled={actionLoading || uploadingImage}
                                className="w-full bg-primary text-white py-5 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-primary/20"
                            >
                                {actionLoading ? <Loader2 className="animate-spin" /> : <><Plus size={22} /> {editingProduct ? 'Enregistrer les modifications' : 'Mettre en vente le produit'}</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardMarketplace;
