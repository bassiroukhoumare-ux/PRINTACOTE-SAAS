import { supabase } from './supabase';

// Lance la connexion / inscription via Google (OAuth). Partagé par la page de
// connexion et la page d'inscription : le flux OAuth est identique, Supabase
// crée le compte automatiquement s'il n'existe pas encore.
export const signInWithGoogle = async () => {
    // Une éventuelle session mock (mode démo OTP) empêcherait App.jsx de
    // prendre en compte la vraie session Google : on la nettoie avant.
    localStorage.removeItem('mock_user_session');

    return supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}/dashboard`,
        },
    });
};
