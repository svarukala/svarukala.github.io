// Admin-specific Supabase operations
import { supabase } from './supabase.js';

export async function fetchAllGames() {
    const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('created_at', { ascending: false });
    return { games: data || [], error };
}

export async function fetchGamePlayers(gameId) {
    const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', gameId)
        .order('position');
    return { players: data || [], error };
}

export async function deleteGame(gameId) {
    const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', gameId);
    return { error };
}
