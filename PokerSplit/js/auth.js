// Auth API — Supabase authentication for PokerSplit web
import { supabase } from './supabase.js';

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { user: null, error };
    await ensureUserProfile(data.user);
    return { user: data.user, error: null };
}

/**
 * Create a new account with email, password, and optional display name
 */
export async function signUpWithEmail(email, password, displayName) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName || email.split('@')[0] } }
    });
    if (error) return { user: null, error };
    if (data.user) await ensureUserProfile(data.user);
    return { user: data.user, error: null };
}

/**
 * Redirect to Google OAuth — browser navigates away and returns to origin
 */
export async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
    });
    return { error };
}

/**
 * Sign out the current user
 */
export async function signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
}

/**
 * Get the currently authenticated user (null if not signed in)
 */
export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

/**
 * Upsert a user_profiles row for the given user.
 * Derives display_name from OAuth metadata or email prefix.
 * Uses ignoreDuplicates so an existing custom name is never overwritten.
 */
export async function ensureUserProfile(user) {
    if (!user) return;
    const displayName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.user_metadata?.display_name ||
        user.email?.split('@')[0] ||
        'Player';

    await supabase
        .from('user_profiles')
        .upsert({ id: user.id, display_name: displayName }, { onConflict: 'id', ignoreDuplicates: true });
}

/**
 * Subscribe to auth state changes.
 * callback(user, event) — user is null when signed out.
 * Returns the subscription object (call .data.subscription.unsubscribe() to stop).
 */
export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
        const user = session?.user || null;
        if (user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
            await ensureUserProfile(user);
        }
        callback(user, event);
    });
}

/**
 * Update the display name for a user
 */
export async function updateDisplayName(userId, displayName) {
    const { error } = await supabase
        .from('user_profiles')
        .update({ display_name: displayName })
        .eq('id', userId);
    return { error };
}

/**
 * Fetch the display name for a user
 */
export async function getDisplayName(userId) {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('id', userId)
        .single();
    return { displayName: data?.display_name || null, error };
}
