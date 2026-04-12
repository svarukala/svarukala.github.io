// Player Pool API — manage a user's regular players list
import { supabase } from './supabase.js';

/**
 * Fetch all active pool players for a user, sorted by name.
 * @param {string} userId
 */
export async function fetchPlayerPool(userId) {
    const { data, error } = await supabase
        .from('user_players')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('name');

    return { players: data || [], error };
}

/**
 * Add a new player to the pool.
 * @param {string} userId
 * @param {string} name
 */
export async function addToPool(userId, name) {
    const { data, error } = await supabase
        .from('user_players')
        .insert({ user_id: userId, name, is_active: true })
        .select()
        .single();

    return { player: data, error };
}

/**
 * Soft-delete a pool player (sets is_active = false).
 * @param {string} playerId - UUID from user_players table
 */
export async function removeFromPool(playerId) {
    const { error } = await supabase
        .from('user_players')
        .update({ is_active: false })
        .eq('id', playerId);

    return { error };
}

/**
 * Rename a pool player.
 * @param {string} playerId - UUID from user_players table
 * @param {string} newName
 */
export async function renamePoolEntry(playerId, newName) {
    const { error } = await supabase
        .from('user_players')
        .update({ name: newName })
        .eq('id', playerId);

    return { error };
}

/**
 * Add any names that don't already exist in the pool.
 * Skips names that are already present (case-sensitive match).
 * @param {string} userId
 * @param {string[]} names
 */
export async function syncNamesToPool(userId, names) {
    const { players: existing } = await fetchPlayerPool(userId);
    const existingNames = new Set(existing.map(p => p.name));

    const toAdd = names.filter(n => n && !existingNames.has(n));

    for (const name of toAdd) {
        await supabase
            .from('user_players')
            .insert({ user_id: userId, name, is_active: true });
    }
}
