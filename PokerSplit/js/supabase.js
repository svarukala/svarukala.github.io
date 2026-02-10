// Supabase Client Configuration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables. Check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// GAME OPERATIONS
// ============================================

/**
 * Generate a unique 6-character game code
 */
function generateGameCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0,O,1,I)
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Create a new game
 * @param {number} buyInAmount - The buy-in amount for the game
 * @param {Array} players - Array of player names
 * @returns {Object} - { game, dealerToken, error }
 */
export async function createGame(buyInAmount, players) {
    const gameCode = generateGameCode();

    // Insert the game
    const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({
            game_code: gameCode,
            buy_in_amount: buyInAmount,
            phase: 'playing'
        })
        .select()
        .single();

    if (gameError) {
        console.error('Error creating game:', gameError);
        return { game: null, dealerToken: null, error: gameError };
    }

    // Insert players
    const playerRecords = players.map((name, index) => ({
        game_id: game.id,
        name: name,
        buy_ins: 1,
        position: index
    }));

    const { error: playersError } = await supabase
        .from('players')
        .insert(playerRecords);

    if (playersError) {
        console.error('Error creating players:', playersError);
        // Clean up the game if players failed
        await supabase.from('games').delete().eq('id', game.id);
        return { game: null, dealerToken: null, error: playersError };
    }

    return {
        game: game,
        dealerToken: game.dealer_token,
        error: null
    };
}

/**
 * Fetch a game by its code
 * @param {string} gameCode - The 6-character game code
 * @returns {Object} - { game, players, error }
 */
export async function fetchGameByCode(gameCode) {
    const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('game_code', gameCode.toUpperCase())
        .single();

    if (gameError) {
        console.error('Error fetching game:', gameError);
        return { game: null, players: null, error: gameError };
    }

    const { data: players, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', game.id)
        .order('position');

    if (playersError) {
        console.error('Error fetching players:', playersError);
        return { game: game, players: null, error: playersError };
    }

    return { game, players, error: null };
}

/**
 * Update game phase
 * @param {string} gameId - The game UUID
 * @param {string} phase - New phase ('playing', 'settlement', 'complete')
 */
export async function updateGamePhase(gameId, phase) {
    const { error } = await supabase
        .from('games')
        .update({ phase })
        .eq('id', gameId);

    if (error) {
        console.error('Error updating game phase:', error);
    }
    return { error };
}

// ============================================
// PLAYER OPERATIONS
// ============================================

/**
 * Add a new player to a game
 * @param {string} gameId - The game UUID
 * @param {string} name - Player name
 * @param {number} position - Player position in list
 */
export async function addPlayer(gameId, name, position) {
    const { data, error } = await supabase
        .from('players')
        .insert({
            game_id: gameId,
            name: name,
            buy_ins: 1,
            position: position
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding player:', error);
    }
    return { player: data, error };
}

/**
 * Update player buy-ins
 * @param {string} playerId - The player UUID
 * @param {number} buyIns - New buy-in count
 */
export async function updatePlayerBuyIns(playerId, buyIns) {
    const { error } = await supabase
        .from('players')
        .update({ buy_ins: buyIns })
        .eq('id', playerId);

    if (error) {
        console.error('Error updating player buy-ins:', error);
    }
    return { error };
}

/**
 * Update player wins (settlement)
 * @param {string} playerId - The player UUID
 * @param {number} wins - Final amount
 */
export async function updatePlayerWins(playerId, wins) {
    const { error } = await supabase
        .from('players')
        .update({ wins: wins })
        .eq('id', playerId);

    if (error) {
        console.error('Error updating player wins:', error);
    }
    return { error };
}

/**
 * Cash out a player mid-game
 * @param {string} playerId - The player UUID
 * @param {number} wins - Final amount the player is leaving with
 */
export async function cashOutPlayer(playerId, wins) {
    const { error } = await supabase
        .from('players')
        .update({ wins: wins, cashed_out: true })
        .eq('id', playerId);

    if (error) {
        console.error('Error cashing out player:', error);
    }
    return { error };
}

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

/**
 * Subscribe to game changes
 * @param {string} gameId - The game UUID
 * @param {Function} callback - Function to call on changes
 * @param {Function} onStatusChange - Function to call on connection status changes
 * @returns {Object} - Subscription object (call .unsubscribe() to stop)
 */
export function subscribeToGame(gameId, callback, onStatusChange = null) {
    const channel = supabase
        .channel(`game-${gameId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'games',
                filter: `id=eq.${gameId}`
            },
            (payload) => {
                callback('game', payload);
            }
        )
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'players',
                filter: `game_id=eq.${gameId}`
            },
            (payload) => {
                callback('players', payload);
            }
        )
        .subscribe((status) => {
            console.log('Subscription status:', status);
            if (onStatusChange) {
                onStatusChange(status === 'SUBSCRIBED');
            }
        });

    return channel;
}

// ============================================
// FEEDBACK
// ============================================

/**
 * Submit user feedback
 * @param {Object} feedback - { rating, message, email }
 * @returns {Object} - { success, error }
 */
export async function submitFeedback(feedback) {
    const { error } = await supabase
        .from('feedback')
        .insert({
            rating: feedback.rating,
            message: feedback.message || null,
            email: feedback.email || null,
            page_url: window.location.href,
            user_agent: navigator.userAgent
        });

    if (error) {
        console.error('Error submitting feedback:', error);
        return { success: false, error };
    }

    return { success: true, error: null };
}

/**
 * Fetch game statistics (counts by phase)
 * @returns {Object} - { active, completed, total, error }
 */
export async function fetchGameStats() {
    try {
        // Get active games (playing phase)
        const { count: activeCount, error: activeError } = await supabase
            .from('games')
            .select('*', { count: 'exact', head: true })
            .eq('phase', 'playing');

        if (activeError) {
            console.error('Error fetching active games:', activeError);
            return { active: 0, completed: 0, total: 0, error: activeError };
        }

        // Get completed/settled games
        const { count: completedCount, error: completedError } = await supabase
            .from('games')
            .select('*', { count: 'exact', head: true })
            .in('phase', ['complete', 'settlement']);

        if (completedError) {
            console.error('Error fetching completed games:', completedError);
            return { active: 0, completed: 0, total: 0, error: completedError };
        }

        return {
            active: activeCount || 0,
            completed: completedCount || 0,
            total: (activeCount || 0) + (completedCount || 0),
            error: null
        };
    } catch (err) {
        console.error('Error fetching game stats:', err);
        return { active: 0, completed: 0, total: 0, error: err };
    }
}

/**
 * Test the database connection
 * @returns {boolean} - True if connected successfully
 */
export async function testConnection() {
    try {
        const { data, error } = await supabase
            .from('games')
            .select('count')
            .limit(1);

        if (error) {
            console.error('Connection test failed:', error);
            return false;
        }
        console.log('Supabase connection successful!');
        return true;
    } catch (err) {
        console.error('Connection test error:', err);
        return false;
    }
}
