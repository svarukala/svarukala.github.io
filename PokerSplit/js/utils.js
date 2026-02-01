// Utility Functions

/**
 * Store dealer token for a game in localStorage
 * @param {string} gameCode - The game code
 * @param {string} dealerToken - The dealer's secret token
 */
export function storeDealerToken(gameCode, dealerToken) {
    const tokens = getDealerTokens();
    tokens[gameCode.toUpperCase()] = dealerToken;
    localStorage.setItem('pokerSplitDealerTokens', JSON.stringify(tokens));
}

/**
 * Get dealer token for a game
 * @param {string} gameCode - The game code
 * @returns {string|null} - The dealer token or null if not found
 */
export function getDealerToken(gameCode) {
    const tokens = getDealerTokens();
    return tokens[gameCode.toUpperCase()] || null;
}

/**
 * Get all stored dealer tokens
 * @returns {Object} - Map of game codes to dealer tokens
 */
export function getDealerTokens() {
    try {
        const stored = localStorage.getItem('pokerSplitDealerTokens');
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

/**
 * Remove dealer token for a game
 * @param {string} gameCode - The game code
 */
export function removeDealerToken(gameCode) {
    const tokens = getDealerTokens();
    delete tokens[gameCode.toUpperCase()];
    localStorage.setItem('pokerSplitDealerTokens', JSON.stringify(tokens));
}

/**
 * Check if current user is the dealer for a game
 * @param {string} gameCode - The game code
 * @param {string} actualDealerToken - The token from the database
 * @returns {boolean}
 */
export function isDealer(gameCode, actualDealerToken) {
    const storedToken = getDealerToken(gameCode);
    return storedToken && storedToken === actualDealerToken;
}

/**
 * Get game code from URL query parameter
 * @returns {string|null}
 */
export function getGameCodeFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('game')?.toUpperCase() || null;
}

/**
 * Update URL with game code (without page reload)
 * @param {string} gameCode
 */
export function setGameCodeInURL(gameCode) {
    const url = new URL(window.location);
    url.searchParams.set('game', gameCode.toUpperCase());
    window.history.pushState({}, '', url);
}

/**
 * Clear game code from URL
 */
export function clearGameCodeFromURL() {
    const url = new URL(window.location);
    url.searchParams.delete('game');
    window.history.pushState({}, '', url);
}

/**
 * Generate shareable game link
 * @param {string} gameCode
 * @returns {string}
 */
export function getShareableLink(gameCode) {
    const url = new URL(window.location.origin);
    url.searchParams.set('game', gameCode.toUpperCase());
    return url.toString();
}

/**
 * Copy text to clipboard
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        return success;
    }
}

/**
 * Format currency
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
    return '$' + (amount || 0).toFixed(2);
}

/**
 * Calculate total pot
 * @param {Array} players - Array of player objects
 * @param {number} buyInAmount
 * @returns {number}
 */
export function calculatePot(players, buyInAmount) {
    return players.reduce((sum, player) => {
        return sum + (player.buy_ins * buyInAmount);
    }, 0);
}

/**
 * Calculate settlements (who pays whom)
 * @param {Array} players - Array of player objects with wins
 * @param {number} buyInAmount
 * @returns {Array} - Array of { from, to, amount }
 */
export function calculateSettlements(players, buyInAmount) {
    // Calculate net for each player
    const results = players.map(player => ({
        name: player.name,
        invested: player.buy_ins * buyInAmount,
        wins: player.wins || 0,
        net: (player.wins || 0) - (player.buy_ins * buyInAmount)
    }));

    // Separate into debtors and creditors
    let debtors = results.filter(r => r.net < 0).map(r => ({
        name: r.name,
        amount: Math.abs(r.net)
    }));

    let creditors = results.filter(r => r.net > 0).map(r => ({
        name: r.name,
        amount: r.net
    }));

    // Sort by amount descending
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    // Calculate payments
    const payments = [];

    while (debtors.length > 0 && creditors.length > 0) {
        const debtor = debtors[0];
        const creditor = creditors[0];

        const payment = Math.min(debtor.amount, creditor.amount);

        if (payment > 0.01) {
            payments.push({
                from: debtor.name,
                to: creditor.name,
                amount: payment
            });
        }

        debtor.amount -= payment;
        creditor.amount -= payment;

        if (debtor.amount < 0.01) debtors.shift();
        if (creditor.amount < 0.01) creditors.shift();
    }

    return { results, payments };
}

/**
 * Show a toast notification
 * @param {string} message
 * @param {string} type - 'success', 'error', 'info'
 */
export function showToast(message, type = 'info') {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
