import React, { useState, useEffect } from 'react';
import { Star, TrendingUp, MessageSquare, Eye, Loader2, QrCode, Download, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const DashboardOverview = ({ printerData, setActiveTab, limits, requireUpgrade }) => {
    const [periodFilter, setPeriodFilter] = useState('all');
    const [realStats, setRealStats] = useState(null);
    const [viewsSeries, setViewsSeries] = useState([]);
    const [clicksSeries, setClicksSeries] = useState([]);
    const [statsLoading, setStatsLoading] = useState(false);

    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    const profileUrl = `${window.location.origin}/imprimerie-detail?id=${printerData?.id || ''}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(profileUrl)}`;

    const getImageBase64 = (url) => {
        return new Promise((resolve) => {
            if (!url) {
                resolve(null);
                return;
            }
            if (url.startsWith('data:')) {
                resolve(url);
                return;
            }

            // Try standard fetch first (good for CORS-enabled APIs)
            fetch(url)
                .then(res => res.blob())
                .then(blob => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = () => resolve(null);
                    reader.readAsDataURL(blob);
                })
                .catch(() => {
                    // Canvas fallback if fetch fails (e.g. CORS block on direct fetch but image loading allows it if crossOrigin is set)
                    const img = new Image();
                    img.crossOrigin = 'Anonymous';
                    img.onload = () => {
                        try {
                            const canvas = document.createElement('canvas');
                            canvas.width = img.naturalWidth || img.width;
                            canvas.height = img.naturalHeight || img.height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0);
                            const dataURL = canvas.toDataURL('image/jpeg');
                            resolve(dataURL);
                        } catch (e) {
                            resolve(null);
                        }
                    };
                    img.onerror = () => resolve(null);
                    img.src = url;
                });
        });
    };

    const handleDownloadPDF = async () => {
        setIsGeneratingPDF(true);
        try {
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // 1. Fetch QR Code image
            const qrCodeBase64 = await getImageBase64(qrCodeUrl);
            if (!qrCodeBase64) {
                alert("Erreur lors de la génération du code QR. Veuillez réessayer.");
                setIsGeneratingPDF(false);
                return;
            }

            // 2. Fetch Logo image (if available)
            let logoBase64 = null;
            if (printerData?.logo_url) {
                logoBase64 = await getImageBase64(printerData.logo_url);
            }

            // 3. Draw Background & Borders
            doc.setFillColor(13, 13, 18); // #0D0D12 Obsidian
            doc.rect(0, 0, 210, 297, 'F');
            doc.setFillColor(250, 248, 245); // #FAF8F5 Ivory
            doc.rect(8, 8, 194, 281, 'F');

            // 4. Draw Logo or Initials Monogram
            const centerX = 105;
            const logoY = 48;
            const logoRadius = 15;
            const name = printerData?.name || 'Printacoté';

            const drawMonogram = (pdfDoc, cx, cy, r) => {
                pdfDoc.setFillColor(13, 13, 18); // Obsidian #0D0D12
                pdfDoc.circle(cx, cy, r, 'F');
                
                pdfDoc.setDrawColor(201, 168, 76); // Champagne #C9A84C
                pdfDoc.setLineWidth(1.5);
                pdfDoc.circle(cx, cy, r, 'S');
                
                const initials = name
                    .split(' ')
                    .map(w => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                    
                pdfDoc.setTextColor(201, 168, 76); // Champagne
                pdfDoc.setFont('Helvetica', 'bold');
                pdfDoc.setFontSize(26);
                pdfDoc.text(initials, cx, cy + 3.5, { align: 'center' });
            };
            
            if (logoBase64) {
                try {
                    // White circle background for transparent logos
                    doc.setFillColor(255, 255, 255);
                    doc.circle(centerX, logoY, logoRadius, 'F');
                    
                    // Draw circular border
                    doc.setDrawColor(201, 168, 76); // #C9A84C Champagne
                    doc.setLineWidth(1.5);
                    doc.circle(centerX, logoY, logoRadius, 'S');

                    // Draw logo image (contained inside circular region)
                    try {
                        doc.saveGraphicsState();
                        doc.circle(centerX, logoY, logoRadius, 'F');
                        doc.clip();
                        doc.addImage(logoBase64, 'JPEG', centerX - logoRadius, logoY - logoRadius, logoRadius * 2, logoRadius * 2);
                        doc.restoreGraphicsState();
                    } catch (clipError) {
                        // Fallback without clipping
                        const imgSize = 22;
                        doc.addImage(logoBase64, 'JPEG', centerX - imgSize / 2, logoY - imgSize / 2, imgSize, imgSize);
                    }
                } catch (err) {
                    drawMonogram(doc, centerX, logoY, logoRadius);
                }
            } else {
                drawMonogram(doc, centerX, logoY, logoRadius);
            }

            // 5. Draw Title & Subtitle
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(13, 13, 18);
            doc.text(name.toUpperCase(), centerX, 78, { align: 'center' });
            
            // Horizontal line separator
            doc.setDrawColor(201, 168, 76);
            doc.setLineWidth(0.4);
            doc.line(centerX - 20, 84, centerX + 20, 84);

            // CTA text
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(18);
            doc.setTextColor(13, 13, 18);
            doc.text("SCANNEZ CE CODE QR", centerX, 98, { align: 'center' });
            
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(12);
            doc.setTextColor(42, 42, 53); // #2A2A35 Slate
            doc.text("pour visiter notre profil en ligne", centerX, 106, { align: 'center' });

            // 6. Draw QR Code Frame & Image
            const frameSize = 110;
            const frameX = centerX - frameSize / 2;
            const frameY = 125;
            const qrSize = 86;
            const qrX = centerX - qrSize / 2;
            const qrY = frameY + (frameSize - qrSize) / 2;

            // Draw white background
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(frameX, frameY, frameSize, frameSize, 8, 8, 'F');
            
            // Draw Champagne border
            doc.setDrawColor(201, 168, 76); // Champagne #C9A84C
            doc.setLineWidth(2);
            doc.roundedRect(frameX, frameY, frameSize, frameSize, 8, 8, 'D');

            // Draw QR Code
            doc.addImage(qrCodeBase64, 'JPEG', qrX, qrY, qrSize, qrSize);

            // 7. Draw Footer divider & text
            doc.setDrawColor(13, 13, 18);
            doc.setLineWidth(0.2);
            doc.line(8 + 15, 260, 210 - 8 - 15, 260);

            doc.setFont('Courier', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(13, 13, 18);
            doc.text("GÉNÉRÉ SUR WWW.PRINTACOTE.COM", centerX, 267, { align: 'center' });

            // 8. Direct Download
            const fileName = `affiche_qr_${name.toLowerCase().replace(/\s+/g, '_')}.pdf`;
            doc.save(fileName);

        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Erreur lors de la génération du PDF.");
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const handleDownloadPNG = async () => {
        try {
            const response = await fetch(qrCodeUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `qrcode_${printerData?.name?.toLowerCase().replace(/\s+/g, '_') || 'boutique'}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (e) {
            window.open(qrCodeUrl, '_blank');
        }
    };

    const getReviews = () => {
        const rawReviews = printerData?.reviews;
        if (!rawReviews) return [];
        if (typeof rawReviews === 'string') {
            try { return JSON.parse(rawReviews); } catch (e) { return []; }
        }
        return Array.isArray(rawReviews) ? rawReviews : [];
    };

    const reviews = getReviews();
    const reviewCount = reviews.length;
    const displayRating = reviewCount > 0 ? (printerData?.rating || 0) : 0;

    // Fetch cumulative overall stats once on mount
    useEffect(() => {
        if (!printerData?.id || printerData?.isMock) return;
        let cancelled = false;
        supabase.rpc('get_printer_stats', { p_printer_id: printerData.id }).then(({ data, error }) => {
            if (cancelled) return;
            if (error) { console.warn('get_printer_stats unavailable:', error.message); return; }
            setRealStats(data || null);
        });
        return () => { cancelled = true; };
    }, [printerData?.id, printerData?.isMock]);

    // Fetch timeseries in parallel for views and clicks when a filter is active
    useEffect(() => {
        if (!printerData?.id || printerData?.isMock || periodFilter === 'all') {
            setViewsSeries([]);
            setClicksSeries([]);
            return;
        }

        let cancelled = false;
        setStatsLoading(true);

        Promise.all([
            supabase.rpc('get_printer_event_timeseries', {
                p_printer_id: printerData.id,
                p_type: 'view',
                p_period: periodFilter,
            }),
            supabase.rpc('get_printer_event_timeseries', {
                p_printer_id: printerData.id,
                p_type: 'whatsapp_click',
                p_period: periodFilter,
            })
        ]).then(([resViews, resClicks]) => {
            if (cancelled) return;
            setViewsSeries(Array.isArray(resViews.data) ? resViews.data : []);
            setClicksSeries(Array.isArray(resClicks.data) ? resClicks.data : []);
            setStatsLoading(false);
        }).catch((err) => {
            if (cancelled) return;
            console.error('Error loading analytics series:', err);
            setStatsLoading(false);
        });

        return () => { cancelled = true; };
    }, [printerData?.id, printerData?.isMock, periodFilter]);

    const getPeriodSum = (series) => {
        return series.reduce((acc, bar) => acc + (bar.value || 0), 0);
    };

    const displayViews = periodFilter === 'all'
        ? (realStats?.totalViews ?? (printerData?.views || 0))
        : getPeriodSum(viewsSeries);

    const displayClicks = periodFilter === 'all'
        ? (realStats?.totalClicks ?? (printerData?.clicks || 0))
        : getPeriodSum(clicksSeries);



    const getFilterLabel = () => {
        if (periodFilter === 'all') return 'Tout';
        if (periodFilter === 'today') return "Aujourd'hui";
        if (periodFilter === 'week') return 'Semaine';
        if (periodFilter === 'month') return 'Mois';
        return 'Année';
    };

    const stats = [
        { label: 'Visites Profil', value: displayViews, sub: periodFilter === 'all' ? 'Vues réelles cumulées' : `Vues : ${getFilterLabel()}`, icon: Eye, color: 'bg-primary text-white' },
        { label: 'Clics WhatsApp', value: displayClicks, sub: periodFilter === 'all' ? 'Demandes de contact' : `Clics : ${getFilterLabel()}`, icon: MessageSquare, color: 'bg-[#25D366] text-white' },
        { label: 'Note Moyenne', value: reviewCount > 0 ? displayRating.toFixed(1) : '0', sub: `Basé sur ${reviewCount} avis réel${reviewCount > 1 ? 's' : ''}`, icon: Star, color: 'bg-yellow-500 text-white' },
    ];

    return (
        <div className="space-y-8 sm:space-y-12">
            {/* Header / Period Selector */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-dark/5 pb-6">
                <div>
                    <h2 className="text-xl sm:text-2xl font-black text-dark tracking-tight">Vue d'ensemble</h2>
                    <p className="text-dark/40 text-xs sm:text-sm font-medium mt-1">
                        Suivez les performances de votre vitrine en temps réel.
                    </p>
                </div>
                <div className="flex bg-dark/5 p-1 rounded-2xl w-full sm:w-auto overflow-x-auto">
                    {[
                        { id: 'all', label: 'Tout' },
                        { id: 'today', label: 'Jour' },
                        { id: 'week', label: 'Semaine' },
                        { id: 'month', label: 'Mois' },
                        { id: 'year', label: 'Année' }
                    ].map((filter) => (
                        <button
                            key={filter.id}
                            onClick={() => setPeriodFilter(filter.id)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex-1 sm:flex-none
                                ${periodFilter === filter.id ? 'bg-primary text-white shadow-md' : 'text-dark/50 hover:text-dark'}`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
                {stats.map((stat, i) => {
                    const locked = limits && !limits.canSeeStats && (i === 0 || i === 1);
                    return (
                    <div key={i} className="bg-white border border-dark/5 rounded-[1.5rem] sm:rounded-[2.5rem] p-5 sm:p-10 flex flex-col justify-between min-h-[150px] sm:min-h-[220px] hover:shadow-2xl transition-all duration-500 group relative overflow-hidden">
                        {locked && (
                            <button
                                type="button"
                                onClick={() => requireUpgrade?.('stats')}
                                className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-[inherit] bg-white/60 backdrop-blur-md text-center"
                            >
                                <Lock size={22} className="text-primary" />
                                <span className="text-[11px] font-black uppercase tracking-widest text-primary">Abonnés</span>
                            </button>
                        )}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-dark/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                        <div className="flex justify-between items-start relative z-10">
                            <span className="text-dark/40 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em]">{stat.label}</span>
                            <div className={`w-8 h-8 sm:w-12 sm:h-12 ${stat.color} rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg`}>
                                <stat.icon size={16} className="sm:w-5 sm:h-5" />
                            </div>
                        </div>
                        <div className="relative z-10 mt-4 sm:mt-8">
                            {statsLoading && (stat.label !== 'Note Moyenne') ? (
                                <div className="flex items-center h-12">
                                    <Loader2 className="animate-spin text-primary" size={24} />
                                </div>
                            ) : (
                                <div className="text-2xl sm:text-5xl font-black text-dark tracking-tight mb-1 sm:mb-2">{stat.value}</div>
                            )}
                            <div className="flex items-center gap-1.5 sm:gap-2 text-[8px] sm:text-[10px] font-mono font-bold text-dark/30 uppercase tracking-widest">
                                <TrendingUp size={10} className="text-green-500 sm:w-3 sm:h-3" />
                                {stat.sub}
                            </div>
                        </div>
                    </div>
                    );
                })}
            </div>

            {/* Actions Rapides & Code QR de Vitrine (côte à côte) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Actions Rapides */}
                <div className="bg-[#3D0B37] rounded-[2rem] p-8 sm:p-10 text-[#F5F5DC] relative overflow-hidden shadow-xl border border-primary/5 flex flex-col justify-between min-h-[300px]">
                    <div className="absolute top-0 right-0 w-[40%] h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none"></div>
                    <div>
                        <h3 className="text-xl sm:text-2xl font-black mb-2 tracking-tight">Actions Rapides</h3>
                        <p className="text-[#F5F5DC]/60 text-xs sm:text-sm font-medium leading-relaxed">
                            Accédez instantanément aux raccourcis pour enrichir votre vitrine en ligne et augmenter vos opportunités.
                        </p>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-6 sm:mt-10 relative z-10">
                        <button onClick={() => setActiveTab('services')} className="bg-[#F5F5DC] text-[#3D0B37] py-3.5 px-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-1 shadow-md">
                            + Service
                        </button>
                        <button onClick={() => setActiveTab('portfolio')} className="bg-white/10 hover:bg-white/20 text-white py-3.5 px-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-1">
                            + Projet
                        </button>
                        <button onClick={() => setActiveTab('marketplace')} className="bg-accent text-white py-3.5 px-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-1 shadow-md">
                            + Produit
                        </button>
                    </div>
                </div>

                {/* Code QR de Vitrine */}
                <div className="bg-white border border-dark/5 rounded-[2rem] p-8 sm:p-10 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 min-h-[300px]">
                    <div className="flex-1 space-y-4 text-left">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                                <QrCode size={16} />
                            </div>
                            <h3 className="font-black text-lg sm:text-xl tracking-tight">Code QR de Vitrine</h3>
                        </div>
                        <p className="text-dark/50 text-xs leading-relaxed font-medium">
                            Téléchargez le code QR officiel de votre boutique en ligne. Vous pouvez l'intégrer à vos propres affiches ou supports publicitaires.
                        </p>
                        <div className="flex flex-col gap-2 pt-2">
                            <button 
                                onClick={handleDownloadPNG}
                                className="bg-primary hover:bg-primary/90 text-[#FAF8F5] py-3.5 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-lg w-full"
                            >
                                <Download size={14} /> Télécharger Image (PNG)
                            </button>
                            <button 
                                onClick={handleDownloadPDF}
                                disabled={isGeneratingPDF}
                                className="bg-dark/5 hover:bg-dark/10 text-dark py-3.5 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-2 w-full disabled:opacity-50"
                            >
                                {isGeneratingPDF ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" /> Génération...
                                    </>
                                ) : (
                                    <>
                                        <Download size={14} /> Télécharger Affiche (PDF)
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                    
                    <div className="shrink-0 bg-white p-3 rounded-2xl border border-dark/10 shadow-md flex items-center justify-center w-36 h-36">
                        <img 
                            src={qrCodeUrl} 
                            alt="Code QR" 
                            className="w-full h-full object-contain" 
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardOverview;
