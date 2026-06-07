import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, ArrowLeft, Loader2, AlertCircle, CheckCircle2, ShieldAlert, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { signInWithGoogle } from '../lib/auth';

const SUPPORT_WHATSAPP = '221709465891'; // Numéro de support officiel Printacoté

const getDeviceDetails = () => {
    const ua = navigator.userAgent;
    let device = "Ordinateur";
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) {
        device = "Mobile / Tablette";
    }
    
    let os = "Système inconnu";
    if (/Windows/i.test(ua)) os = "Windows";
    else if (/Macintosh|Mac OS X/i.test(ua)) os = "macOS";
    else if (/Android/i.test(ua)) os = "Android";
    else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
    else if (/Linux/i.test(ua)) os = "Linux";
    
    let browser = "Navigateur inconnu";
    if (/Chrome/i.test(ua)) browser = "Chrome";
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
    else if (/Firefox/i.test(ua)) browser = "Firefox";
    else if (/Edge/i.test(ua)) browser = "Edge";
    
    return `${device} (${os} - ${browser})`;
};

const LoginPage = ({ setPage, setUser }) => {
    const [view, setView] = useState('login'); // 'login' | 'forgot' | 'verify'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    
    // OTP / Recovery simulation states
    const [recoveryCode, setRecoveryCode] = useState('');
    const [enteredCode, setEnteredCode] = useState('');
    const [demoMode, setDemoMode] = useState(false);
    const [codeTimestamp, setCodeTimestamp] = useState(null);
    const [limitReached, setLimitReached] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            setPage('dashboard');
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');

        const { error } = await signInWithGoogle();

        // En cas de succès, le navigateur est immédiatement redirigé vers Google :
        // ce code n'est atteint qu'en cas d'erreur.
        if (error) {
            setError(error.message);
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMessage('');

        // Limit Check: Max 2 requests per 30 days per email address
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        const localRequestsKey = `recovery_requests_${email}`;
        const storedRequests = localStorage.getItem(localRequestsKey);
        let requests = storedRequests ? JSON.parse(storedRequests) : [];
        
        const now = Date.now();
        // Filter out requests older than 30 days
        requests = requests.filter(ts => now - ts < thirtyDaysMs);
        
        if (requests.length >= 2) {
            setError("Limite de sécurité atteinte : Vous ne pouvez générer que 2 codes de récupération par mois pour cette adresse email.");
            setLimitReached(true);
            setLoading(false);
            return;
        }

        // Generate a 6-digit verification code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Retrieve device and location metadata
        const deviceDetails = getDeviceDetails();
        let clientIp = 'Inconnu';
        let clientLocation = 'Inconnue';

        try {
            const ipPromise = fetch('https://ipapi.co/json/').then(r => r.json());
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000));
            const ipData = await Promise.race([ipPromise, timeoutPromise]);
            if (ipData && ipData.ip) {
                clientIp = ipData.ip;
                clientLocation = `${ipData.city || ''}, ${ipData.region || ''}, ${ipData.country_name || ''}`.replace(/^, |, $/, '').trim();
                if (!clientLocation) {
                    clientLocation = ipData.country_name || 'Inconnue';
                }
            }
        } catch (err) {
            console.warn("Could not fetch client metadata:", err.message);
        }

        let emailSent = false;
        try {
            // Call Supabase stored procedure / RPC to send custom HTML recovery email via Resend
            const { error: rpcError } = await supabase.rpc('send_recovery_email', {
                email_to: email,
                recovery_code: code,
                client_ip: clientIp,
                client_location: clientLocation,
                client_device: deviceDetails
            });
            
            if (!rpcError) {
                emailSent = true;
            } else {
                console.warn("RPC recovery email failed, using screen fallback:", rpcError.message);
            }
        } catch (err) {
            console.warn("RPC recovery email call error:", err.message);
        }

        if (emailSent) {
            setSuccessMessage(`Un e-mail de récupération contenant votre code de vérification à 6 chiffres a été envoyé à l'adresse ${email}.`);
            setRecoveryCode(code);
            setDemoMode(false);
            setCodeTimestamp(now);
            
            // Track the request
            requests.push(now);
            localStorage.setItem(localRequestsKey, JSON.stringify(requests));
        } else {
            setSuccessMessage(`[DÉMO FALLBACK] La fonction SQL d'envoi n'est pas installée sur Supabase. Votre code de récupération est :`);
            setRecoveryCode(code);
            setDemoMode(true);
            setCodeTimestamp(now);
            
            // Still register in demo to let them test the limit rule
            requests.push(now);
            localStorage.setItem(localRequestsKey, JSON.stringify(requests));
        }

        setView('verify');
        setLoading(false);
    };

    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Expiration check: Code is only valid for 60 seconds
        if (codeTimestamp && Date.now() - codeTimestamp > 60000) {
            setError("Ce code de récupération a expiré (limite de 60 secondes). Veuillez en générer un nouveau.");
            setLoading(false);
            return;
        }

        // Try standard Supabase OTP verification first in case SMTP/OTP is functional
        let supabaseSuccess = false;
        try {
            const { data, error: verifyError } = await supabase.auth.verifyOtp({
                email,
                token: enteredCode,
                type: 'email'
            });

            if (!verifyError && data?.user) {
                supabaseSuccess = true;
            }
        } catch (err) {
            console.warn("Supabase OTP verification bypassed:", err.message);
        }

        if (supabaseSuccess) {
            localStorage.setItem('force_password_change', 'true');
            setPage('dashboard');
            setLoading(false);
            return;
        }

        // Local Simulation Bypass check
        if (enteredCode === recoveryCode) {
            // Log in as mock user
            const mockUser = {
                id: 'mock-uuid-printer-id',
                email: email,
                isMock: true
            };
            setUser(mockUser);
            localStorage.setItem('mock_user_session', JSON.stringify(mockUser));
            localStorage.setItem('force_password_change', 'true');
            setPage('dashboard');
        } else {
            setError("Le code de vérification est incorrect ou a expiré.");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 pt-32">
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#3D0B37]/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#F5F5DC]/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="w-full max-w-5xl bg-white rounded-[4rem] border border-dark/10 shadow-2xl overflow-hidden relative z-10 flex flex-col md:flex-row min-h-[600px]">
                {/* Left Panel */}
                <div className="md:w-[40%] p-12 md:p-16 flex flex-col justify-between bg-[#3D0B37] text-white relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                    <div>
                        <button 
                            onClick={() => {
                                if (view === 'login') {
                                    setPage('home');
                                } else {
                                    setView('login');
                                    setError('');
                                    setSuccessMessage('');
                                }
                            }} 
                            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-12"
                        >
                            <ArrowLeft size={18} /> Retour
                        </button>
                        
                        {view === 'login' && (
                            <>
                                <h1 className="text-4xl font-black tracking-tight mb-6">Heureux de vous revoir.</h1>
                                <p className="text-white/40 leading-relaxed">Accédez à votre espace professionnel et gérez vos commandes en toute simplicité.</p>
                            </>
                        )}

                        {view === 'forgot' && (
                            <>
                                <h1 className="text-4xl font-black tracking-tight mb-6">Mot de passe oublié ?</h1>
                                <p className="text-white/40 leading-relaxed">Saisissez votre e-mail de connexion. Nous allons simuler l'envoi d'un code temporaire pour vous connecter.</p>
                            </>
                        )}

                        {view === 'verify' && (
                            <>
                                <h1 className="text-4xl font-black tracking-tight mb-6">Vérification du code.</h1>
                                <p className="text-white/40 leading-relaxed">Entrez le code temporaire à 6 chiffres affiché à l'écran pour récupérer l'accès à votre compte.</p>
                            </>
                        )}
                    </div>
                    <div className="mt-12">
                        <img src="/logo.png" alt="Logo" className="h-12 w-auto brightness-200 opacity-90" />
                    </div>
                </div>

                {/* Right Panel / Forms */}
                <div className="md:w-[60%] p-12 md:p-20 flex flex-col justify-center bg-white">
                    {/* Error Alerts */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl flex items-start gap-3 text-sm mb-6 animate-in fade-in duration-300">
                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* VIEW 1: Standard Login */}
                    {view === 'login' && (
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-dark/30 ml-2">Email Professionnel</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-dark/20 group-focus-within:text-primary transition-colors" size={18} />
                                    <input 
                                        type="email" 
                                        required
                                        placeholder="nom@votreimprimerie.com"
                                        className="w-full bg-dark/5 border border-transparent rounded-2xl pl-12 pr-6 py-4 focus:outline-none focus:bg-white focus:border-primary/30 transition-all font-bold"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-dark/30 ml-2">Mot de passe</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-dark/20 group-focus-within:text-primary transition-colors" size={18} />
                                    <input 
                                        type="password" 
                                        required
                                        placeholder="••••••••"
                                        className="w-full bg-dark/5 border border-transparent rounded-2xl pl-12 pr-6 py-4 focus:outline-none focus:bg-white focus:border-primary/30 transition-all font-bold"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full bg-[#F5F5DC] text-[#3D0B37] py-5 rounded-2xl font-black text-lg shadow-xl shadow-black/10 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <>Se connecter <ArrowRight size={20} /></>}
                            </button>
                        </form>
                    )}

                    {/* Connexion Google (OAuth) — uniquement sur la vue login */}
                    {view === 'login' && (
                        <>
                            <div className="flex items-center gap-4 my-8">
                                <div className="h-px flex-1 bg-dark/10" />
                                <span className="text-xs font-black uppercase tracking-widest text-dark/30">ou</span>
                                <div className="h-px flex-1 bg-dark/10" />
                            </div>

                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                className="w-full bg-white border border-dark/10 text-dark py-5 rounded-2xl font-black text-lg hover:bg-dark/5 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
                                </svg>
                                Se connecter avec Google
                            </button>
                        </>
                    )}

                    {/* VIEW 2: Forgot Password */}
                    {view === 'forgot' && (
                        limitReached ? (
                            <div className="space-y-6 text-center animate-in fade-in duration-500">
                                <div className="bg-red-500/10 border border-red-500/20 text-red-600 p-6 rounded-[2rem] flex flex-col gap-2 text-xs font-semibold leading-relaxed">
                                    <ShieldAlert size={28} className="text-red-500 mx-auto mb-2 animate-bounce" />
                                    <span className="font-black uppercase tracking-wider text-[10px]">Sécurité : Limite de demande atteinte</span>
                                    <p>Vous avez généré plus de 2 codes de récupération au cours des 30 derniers jours pour cette adresse e-mail. Pour des raisons de sécurité, les demandes automatiques sont bloquées.</p>
                                </div>
                                <p className="text-dark/40 text-sm font-semibold">
                                    Veuillez contacter le support administratif de Printacoté pour réinitialiser manuellement vos accès de connexion.
                                </p>
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        window.open(`https://wa.me/${SUPPORT_WHATSAPP}?text=Bonjour%20Support%20Printacoté,%20j'ai%20atteint%20la%20limite%20de%20récupération%20de%20mot%20de%20passe%20pour%20mon%20adresse%20email%20:%20${email}`, '_blank');
                                    }}
                                    className="w-full bg-[#25D366] text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-green-500/15 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                    <MessageCircle size={20} /> Contacter le Support sur WhatsApp
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleForgotPassword} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-dark/30 ml-2">Saisir votre adresse e-mail</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-dark/20 group-focus-within:text-primary transition-colors" size={18} />
                                        <input 
                                            type="email" 
                                            required
                                            placeholder="nom@votreimprimerie.com"
                                            className="w-full bg-dark/5 border border-transparent rounded-2xl pl-12 pr-6 py-4 focus:outline-none focus:bg-white focus:border-primary/30 transition-all font-bold"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    className="w-full bg-[#F5F5DC] text-[#3D0B37] py-5 rounded-2xl font-black text-lg shadow-xl shadow-black/10 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : <>Générer le code <ArrowRight size={20} /></>}
                                </button>
                            </form>
                        )
                    )}

                    {/* VIEW 3: Verify Code & Demo Recovery Banner */}
                    {view === 'verify' && (
                        <form onSubmit={handleVerifyCode} className="space-y-6">
                            {successMessage && (
                                <div className="bg-[#FAF8F5] border border-[#3D0B37]/10 p-4 rounded-2xl flex items-start gap-3 text-xs text-[#3D0B37] font-medium leading-relaxed">
                                    <CheckCircle2 size={16} className="shrink-0 text-primary mt-0.5" />
                                    <span>{successMessage}</span>
                                </div>
                            )}

                            {/* Demo Recovery Display Banner */}
                            {demoMode && recoveryCode && (
                                <div className="bg-amber-50 border-2 border-dashed border-amber-200 p-6 rounded-[2rem] flex flex-col gap-2 text-xs text-amber-800 font-medium leading-relaxed animate-pulse">
                                    <div className="flex items-center gap-2">
                                        <ShieldAlert size={16} className="text-amber-600" />
                                        <span className="font-black uppercase tracking-wider text-[10px] text-amber-700">Mode Démo • Code de Récupération</span>
                                    </div>
                                    <p>Si la messagerie SMTP de Supabase n'est pas activée, copiez-collez ce code temporaire simulé :</p>
                                    <div className="flex items-center justify-between bg-white border border-amber-200 rounded-xl px-4 py-3 mt-1 shadow-sm">
                                        <span className="font-mono text-lg font-black text-amber-900 tracking-widest">{recoveryCode}</span>
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                setEnteredCode(recoveryCode);
                                            }}
                                            className="text-[10px] font-black uppercase text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            Saisir auto.
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-dark/30 ml-2">Code de vérification</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-dark/20 group-focus-within:text-primary transition-colors" size={18} />
                                    <input 
                                        type="text" 
                                        required
                                        maxLength={6}
                                        placeholder="Ex: 582910"
                                        className="w-full bg-dark/5 border border-transparent rounded-2xl pl-12 pr-6 py-4 focus:outline-none focus:bg-white focus:border-primary/30 transition-all font-mono font-bold tracking-widest text-lg"
                                        value={enteredCode}
                                        onChange={(e) => setEnteredCode(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full bg-[#F5F5DC] text-[#3D0B37] py-5 rounded-2xl font-black text-lg shadow-xl shadow-black/10 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <>Se connecter <ArrowRight size={20} /></>}
                            </button>
                        </form>
                    )}

                    {/* Bottom Actions */}
                    <div className="mt-10 text-center space-y-4">
                        {view === 'login' && (
                            <button 
                                onClick={() => {
                                    setView('forgot');
                                    setError('');
                                    setSuccessMessage('');
                                }} 
                                className="text-sm font-bold text-dark/40 hover:text-primary transition-colors"
                            >
                                Mot de passe oublié ?
                            </button>
                        )}
                        {view !== 'login' && (
                            <button 
                                onClick={() => {
                                    setView('login');
                                    setError('');
                                    setSuccessMessage('');
                                }} 
                                className="text-sm font-bold text-dark/40 hover:text-primary transition-colors"
                            >
                                Retourner à la page de connexion
                            </button>
                        )}
                        <div className="pt-6 border-t border-dark/5">
                            <span className="text-sm text-dark/40">Pas encore de compte ? </span>
                            <button onClick={() => setPage('register')} className="text-sm font-black text-primary hover:underline">Inscrire mon imprimerie</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
