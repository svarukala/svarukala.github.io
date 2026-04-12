// Stats API — game history and leaderboard for PokerSplit web
import { supabase } from './supabase.js';

/**
 * Record stats for all players with a linked user_id whose wins have been entered.
 * Called after a game completes. Idempotent — upserts on (user_id, game_id).
 *
 * Unlike the mobile version's cashed_out filter, the web version records stats
 * for any player with user_id set whose wins are non-null (covers both mid-game
 * cashouts and end-game settlements).
 *
 * @param {string} gameId
 * @param {string} gameCode
 * @param {number} buyInAmount
 */
export async function finalizeGameStats(gameId, gameCode, buyInAmount) {
    const { data: players, error } = await supabase
        .from('players')
        .select('user_id, buy_ins, wins')
        .eq('game_id', gameId)
        .not('user_id', 'is', null)
        .not('wins', 'is', null);

    if (error) {
        console.error('Error fetching players for stats:', error);
        return { error };
    }

    if (!players || players.length === 0) return { error: null };

    const records = players.map(p => ({
        user_id: p.user_id,
        game_id: gameId,
        game_code: gameCode,
        invested: p.buy_ins * buyInAmount,
        wins: p.wins,
        net_result: p.wins - (p.buy_ins * buyInAmount),
        played_at: new Date().toISOString()
    }));

    const { error: upsertError } = await supabase
        .from('user_game_stats')
        .upsert(records, { onConflict: 'user_id,game_id' });

    if (upsertError) {
        console.error('Error upserting game stats:', upsertError);
    }

    return { error: upsertError };
}

/**
 * Fetch all game history for a user, most recent first.
 * @param {string} userId
 */
export async function fetchHistory(userId) {
    const { data, error } = await supabase
        .from('user_game_stats')
        .select('*')
        .eq('user_id', userId)
        .order('played_at', { ascending: false });

    return { history: data || [], error };
}

/**
 * Fetch the leaderboard via the get_leaderboard RPC.
 * @param {'all'|'monthly'|'weekly'} timeframe
 * @param {'net'|'winrate'} metric
 */
export async function fetchLeaderboard(timeframe = 'all', metric = 'net') {
    const { data, error } = await supabase.rpc('get_leaderboard', { timeframe, metric });

    if (error) {
        console.error('Error fetching leaderboard:', error);
    }

    return { leaderboard: data || [], error };
}
