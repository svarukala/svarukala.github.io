// Main Application Logic
import {
    createGame,
    fetchGameByCode,
    updateGamePhase,
    addPlayer as addPlayerToDb,
    updatePlayerBuyIns,
    updatePlayerWins,
    cashOutPlayer,
    subscribeToGame,
    submitFeedback,
    fetchGameStats
} from './supabase.js';

import {
    storeDealerToken,
    getDealerToken,
    isDealer,
    getGameCodeFromURL,
    setGameCodeInURL,
    clearGameCodeFromURL,
    getShareableLink,
    copyToClipboard,
    formatCurrency,
    calculatePot,
    calculateSettlements,
    showToast
} from './utils.js';

// ============================================
// APPLICATION STATE
// ============================================

let appState = {
    currentView: 'home', // 'home', 'setup', 'game', 'settlement', 'results'
    game: null,
    players: [],
    isDealer: false,
    subscription: null,
    cashOutPlayerId: null
};

// ============================================
// DOM ELEMENTS
// ============================================

const views = {
    home: document.getElementById('home-view'),
    setup: document.getElementById('setup-view'),
    game: document.getElementById('game-view'),
    settlement: document.getElementById('settlement-view'),
    results: document.getElementById('results-view')
};

// ============================================
// VIEW MANAGEMENT
// ============================================

function showView(viewName) {
    Object.keys(views).forEach(key => {
        views[key].classList.toggle('hidden', key !== viewName);
    });
    appState.currentView = viewName;

    if (viewName === 'home') {
        scheduleSurveyBubble();
    } else {
        hideSurveyBubble();
    }
}

// ============================================
// SURVEY BUBBLE
// ============================================

let surveyBubbleTimer = null;

function scheduleSurveyBubble() {
    const dismissed = localStorage.getItem('pokerSplitSurveyDismissed');
    if (dismissed) return;

    surveyBubbleTimer = setTimeout(() => {
        const bubble = document.getElementById('survey-bubble');
        const dot = document.getElementById('survey-dot');
        bubble.classList.add('show');
        dot.classList.add('show');
    }, 1800);
}

function hideSurveyBubble() {
    clearTimeout(surveyBubbleTimer);
    const bubble = document.getElementById('survey-bubble');
    const dot = document.getElementById('survey-dot');
    bubble.classList.remove('show');
    dot.classList.remove('show');
}

window.dismissSurveyBubble = function(event) {
    event.stopPropagation();
    localStorage.setItem('pokerSplitSurveyDismissed', '1');
    hideSurveyBubble();
};

window.openSurveyFeedback = function() {
    hideSurveyBubble();
    localStorage.setItem('pokerSplitSurveyDismissed', '1');
    window.openFeedback();
};

// ============================================
// HOME VIEW
// ============================================

function initHomeView() {
    document.getElementById('btn-new-game').addEventListener('click', () => {
        showView('setup');
        initSetupView();
    });

    document.getElementById('btn-join-game').addEventListener('click', () => {
        const codeInput = document.getElementById('join-game-code');
        const code = codeInput.value.trim().toUpperCase();
        if (code.length === 6) {
            joinGame(code);
        } else {
            showToast('Please enter a valid 6-character code', 'error');
        }
    });

    document.getElementById('join-game-code').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('btn-join-game').click();
        }
    });

    // Load game stats
    loadGameStats();
}

async function loadGameStats() {
    const statsContainer = document.getElementById('game-stats');
    if (!statsContainer) return;

    try {
        const { active, completed, total, error } = await fetchGameStats();

        if (error) {
            statsContainer.classList.add('hidden');
            return;
        }

        // Update the display
        document.getElementById('stat-active').textContent = active.toLocaleString();
        document.getElementById('stat-completed').textContent = completed.toLocaleString();
        document.getElementById('stat-total').textContent = total.toLocaleString();

        // Show the stats with animation
        statsContainer.classList.remove('hidden');
        statsContainer.classList.add('stats-visible');
    } catch (err) {
        console.error('Failed to load game stats:', err);
        statsContainer.classList.add('hidden');
    }
}

// ============================================
// SETUP VIEW (New Game)
// ============================================

function initSetupView() {
    const playerCountInput = document.getElementById('player-count');
    const playerNamesContainer = document.getElementById('player-names-container');

    function updatePlayerInputs() {
        const count = parseInt(playerCountInput.value) || 4;
        playerNamesContainer.innerHTML = '';

        for (let i = 0; i < count; i++) {
            const div = document.createElement('div');
            div.className = 'player-name-input';
            div.innerHTML = `
                <span>${i + 1}.</span>
                <input type="text" class="player-name" placeholder="Player ${i + 1}" data-index="${i}">
            `;
            playerNamesContainer.appendChild(div);
        }
    }

    playerCountInput.addEventListener('change', updatePlayerInputs);
    playerCountInput.addEventListener('input', updatePlayerInputs);
    updatePlayerInputs();

    document.getElementById('btn-start-game').addEventListener('click', startNewGame);
    document.getElementById('btn-back-to-home').addEventListener('click', () => {
        showView('home');
    });
}

async function startNewGame() {
    const playerCount = parseInt(document.getElementById('player-count').value);
    const buyInAmount = parseFloat(document.getElementById('buyin-amount').value);

    if (playerCount < 2 || playerCount > 10) {
        showToast('Please enter between 2 and 10 players', 'error');
        return;
    }

    if (buyInAmount <= 0 || isNaN(buyInAmount)) {
        showToast('Please enter a valid buy-in amount', 'error');
        return;
    }

    const nameInputs = document.querySelectorAll('.player-name');
    const players = [];

    nameInputs.forEach((input, index) => {
        const name = input.value.trim() || `Player ${index + 1}`;
        players.push(name);
    });

    // Show loading state
    const btn = document.getElementById('btn-start-game');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.classList.add('loading');

    try {
        const { game, dealerToken, error } = await createGame(buyInAmount, players);

        if (error) {
            showToast('Failed to create game: ' + error.message, 'error');
            return;
        }

        // Store dealer token
        storeDealerToken(game.game_code, dealerToken);

        // Update URL
        setGameCodeInURL(game.game_code);

        // Load the game
        await loadGame(game.game_code);

        showToast('Game created! Share the code with players.', 'success');
    } catch (err) {
        showToast('Error creating game: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.classList.remove('loading');
        btn.textContent = originalText;
    }
}

// ============================================
// JOIN GAME
// ============================================

async function joinGame(gameCode) {
    const btn = document.getElementById('btn-join-game');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.classList.add('loading');

    try {
        const { game, players, error } = await fetchGameByCode(gameCode);

        if (error || !game) {
            showToast('Game not found. Check the code and try again.', 'error');
            return;
        }

        setGameCodeInURL(gameCode);
        await loadGame(gameCode);
    } catch (err) {
        showToast('Error joining game: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.classList.remove('loading');
        btn.textContent = originalText;
    }
}

// ============================================
// LOAD GAME
// ============================================

async function loadGame(gameCode) {
    const { game, players, error } = await fetchGameByCode(gameCode);

    if (error || !game) {
        showToast('Failed to load game', 'error');
        showView('home');
        return;
    }

    appState.game = game;
    appState.players = players;
    appState.isDealer = isDealer(gameCode, game.dealer_token);

    // Subscribe to real-time updates
    subscribeToGameUpdates(game.id);

    // Show appropriate view based on game phase
    switch (game.phase) {
        case 'playing':
            showView('game');
            renderGameView();
            break;
        case 'settlement':
            showView('settlement');
            renderSettlementView();
            break;
        case 'complete':
            showView('results');
            renderResultsView();
            break;
        default:
            showView('game');
            renderGameView();
    }
}

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

function subscribeToGameUpdates(gameId) {
    // Unsubscribe from previous subscription
    if (appState.subscription) {
        appState.subscription.unsubscribe();
    }

    appState.subscription = subscribeToGame(gameId, async (table, payload) => {
        console.log('Real-time update:', table, payload);

        // Check if user is actively editing (has focus on an input)
        const isEditing = document.activeElement?.classList.contains('wins-input');

        // Reload game data
        const { game, players } = await fetchGameByCode(appState.game.game_code);

        if (game) {
            const phaseChanged = game.phase !== appState.game.phase;
            appState.game = game;

            // Merge player data carefully to preserve local edits
            if (isEditing && appState.currentView === 'settlement' && appState.isDealer) {
                // Only update non-wins fields to preserve user's typing
                players.forEach(newPlayer => {
                    const existing = appState.players.find(p => p.id === newPlayer.id);
                    if (existing) {
                        existing.buy_ins = newPlayer.buy_ins;
                        existing.name = newPlayer.name;
                        // Don't overwrite wins if we're editing
                    } else {
                        appState.players.push(newPlayer);
                    }
                });
            } else {
                appState.players = players;
            }

            // Re-render current view (skip if editing settlement as dealer)
            if (!(isEditing && appState.currentView === 'settlement' && appState.isDealer)) {
                switch (appState.currentView) {
                    case 'game':
                        renderGameView();
                        break;
                    case 'settlement':
                        renderSettlementView();
                        break;
                    case 'results':
                        renderResultsView();
                        break;
                }
            }

            // Check if phase changed - always handle phase changes
            if (phaseChanged) {
                switch (game.phase) {
                    case 'playing':
                        showView('game');
                        renderGameView();
                        break;
                    case 'settlement':
                        showView('settlement');
                        renderSettlementView();
                        break;
                    case 'complete':
                        showView('results');
                        renderResultsView();
                        break;
                }
            }
        }
    }, (connected) => {
        // Update connection status indicator
        updateConnectionStatus(connected);
    });
}

// ============================================
// GAME VIEW
// ============================================

function renderGameView() {
    const game = appState.game;
    const players = appState.players;
    const isDealerMode = appState.isDealer;

    // Update game code display
    document.getElementById('game-code-display').textContent = game.game_code;
    document.getElementById('buyin-display').textContent = formatCurrency(game.buy_in_amount);

    // Show/hide dealer controls
    document.querySelectorAll('.dealer-only').forEach(el => {
        el.classList.toggle('hidden', !isDealerMode);
    });

    // Show player mode indicator
    document.getElementById('player-mode-indicator').classList.toggle('hidden', isDealerMode);

    // Render players table
    const tbody = document.getElementById('game-players-body');
    tbody.innerHTML = '';

    players.forEach((player, index) => {
        const invested = player.buy_ins * game.buy_in_amount;
        const isCashedOut = player.cashed_out;
        const row = document.createElement('tr');

        if (isCashedOut) {
            row.className = 'player-cashed-out';
        }

        if (isCashedOut) {
            // Cashed out player - show badge, no controls
            row.innerHTML = `
                <td>
                    ${player.name}
                    <span class="cashed-out-badge">Cashed Out: ${formatCurrency(player.wins)}</span>
                </td>
                <td>${player.buy_ins}</td>
                <td>${formatCurrency(invested)}</td>
                <td class="dealer-only ${isDealerMode ? '' : 'hidden'}"></td>
            `;
        } else {
            // Active player - show controls
            row.innerHTML = `
                <td>${player.name}</td>
                <td>${player.buy_ins}</td>
                <td>${formatCurrency(invested)}</td>
                <td class="dealer-only ${isDealerMode ? '' : 'hidden'}">
                    <div class="stepper">
                        <button class="stepper-btn minus" onclick="window.removeBuyIn('${player.id}', ${player.buy_ins})" ${player.buy_ins <= 1 ? 'disabled' : ''} title="Remove buy-in">−</button>
                        <button class="stepper-btn plus" onclick="window.addBuyIn('${player.id}', ${player.buy_ins})" title="Add buy-in">+</button>
                    </div>
                    <button class="btn-cashout" onclick="window.openCashOut('${player.id}')" title="Cash out player">Cash Out</button>
                </td>
            `;
        }
        tbody.appendChild(row);
    });

    // Update pot total
    const pot = calculatePot(players, game.buy_in_amount);
    document.getElementById('pot-total').textContent = formatCurrency(pot);
}

// Global functions for onclick handlers
window.addBuyIn = async function(playerId, currentBuyIns) {
    await updatePlayerBuyIns(playerId, currentBuyIns + 1);
};

window.removeBuyIn = async function(playerId, currentBuyIns) {
    if (currentBuyIns > 1) {
        await updatePlayerBuyIns(playerId, currentBuyIns - 1);
    }
};

window.addNewPlayer = async function() {
    const input = document.getElementById('new-player-name');
    const name = input.value.trim() || `Player ${appState.players.length + 1}`;

    await addPlayerToDb(appState.game.id, name, appState.players.length);
    input.value = '';
    showToast(`${name} added to the game`, 'success');
};

window.shareGame = async function() {
    const btn = document.getElementById('btn-copy-link');
    const link = getShareableLink(appState.game.game_code);
    const success = await copyToClipboard(link);

    if (success) {
        btn.textContent = 'Copied!';
        btn.classList.add('copy-success');
        showToast('Link copied to clipboard!', 'success');
        setTimeout(() => {
            btn.textContent = 'Copy Link';
            btn.classList.remove('copy-success');
        }, 2000);
    } else {
        showToast('Failed to copy link', 'error');
    }
};

window.copyGameCode = async function() {
    const btn = document.getElementById('btn-copy-code');
    const codeDisplay = document.getElementById('game-code-display');
    const success = await copyToClipboard(appState.game.game_code);

    if (success) {
        btn.textContent = 'Copied!';
        codeDisplay.classList.add('copy-success');
        showToast('Code copied!', 'success');
        setTimeout(() => {
            btn.textContent = 'Copy Code';
            codeDisplay.classList.remove('copy-success');
        }, 2000);
    } else {
        showToast('Failed to copy code', 'error');
    }
};

// Cash Out Modal Functions
window.openCashOut = function(playerId) {
    const player = appState.players.find(p => p.id === playerId);
    if (!player) return;

    appState.cashOutPlayerId = playerId;
    const invested = player.buy_ins * appState.game.buy_in_amount;

    document.getElementById('cashout-player-name').textContent = player.name;
    document.getElementById('cashout-invested').textContent = formatCurrency(invested);
    document.getElementById('cashout-amount').value = '';
    document.getElementById('cashout-modal').classList.remove('hidden');
    document.getElementById('cashout-amount').focus();
};

window.closeCashOut = function() {
    document.getElementById('cashout-modal').classList.add('hidden');
    appState.cashOutPlayerId = null;
};

window.closeCashOutOnOverlay = function(event) {
    if (event.target.id === 'cashout-modal') {
        window.closeCashOut();
    }
};

window.confirmCashOut = async function() {
    const playerId = appState.cashOutPlayerId;
    if (!playerId) return;

    const amountInput = document.getElementById('cashout-amount');
    const amount = parseFloat(amountInput.value);

    if (isNaN(amount) || amount < 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }

    const player = appState.players.find(p => p.id === playerId);
    if (!player) return;

    const btn = document.getElementById('btn-confirm-cashout');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.classList.add('loading');

    try {
        const { error } = await cashOutPlayer(playerId, amount);

        if (error) {
            showToast('Failed to cash out player: ' + error.message, 'error');
            return;
        }

        showToast(`${player.name} cashed out with ${formatCurrency(amount)}`, 'success');
        window.closeCashOut();
    } catch (err) {
        showToast('Error cashing out: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.classList.remove('loading');
        btn.textContent = originalText;
    }
};

// QR Code toggle
let qrVisible = false;
window.toggleQR = function() {
    const container = document.getElementById('qr-container');
    const btn = document.getElementById('btn-show-qr');
    qrVisible = !qrVisible;

    if (qrVisible) {
        container.classList.remove('hidden');
        btn.textContent = 'Hide QR';
        generateQRCode();
    } else {
        container.classList.add('hidden');
        btn.textContent = 'Show QR';
    }
};

function generateQRCode() {
    const canvas = document.getElementById('qr-canvas');
    const link = getShareableLink(appState.game.game_code);

    if (typeof QRious !== 'undefined') {
        try {
            new QRious({
                element: canvas,
                value: link,
                size: 200,
                foreground: '#1a472a',
                background: '#ffffff',
                level: 'M'
            });
        } catch (error) {
            console.error('QR Code error:', error);
            showToast('Failed to generate QR code', 'error');
        }
    } else {
        console.error('QRious library not loaded');
        showToast('QR code library not loaded', 'error');
    }
}

// Update connection status
function updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connection-status');
    if (statusEl) {
        if (connected) {
            statusEl.className = 'connection-status connected';
            statusEl.innerHTML = '<span class="status-dot"></span><span>Live</span>';
        } else {
            statusEl.className = 'connection-status disconnected';
            statusEl.innerHTML = '<span class="status-dot"></span><span>Offline</span>';
        }
    }
}

window.endGame = async function() {
    if (confirm('End the game and enter final amounts?')) {
        await updateGamePhase(appState.game.id, 'settlement');
    }
};

// ============================================
// SETTLEMENT VIEW
// ============================================

function renderSettlementView(preserveFocus = false) {
    const game = appState.game;
    const players = appState.players;
    const isDealerMode = appState.isDealer;

    // Save currently focused element
    const activeElement = document.activeElement;
    const focusedId = activeElement?.id;

    // Show/hide dealer controls
    document.querySelectorAll('.dealer-only').forEach(el => {
        el.classList.toggle('hidden', !isDealerMode);
    });
    document.getElementById('player-mode-settlement').classList.toggle('hidden', isDealerMode);

    const pot = calculatePot(players, game.buy_in_amount);
    document.getElementById('settlement-pot-total').textContent = formatCurrency(pot);

    // Render settlement table
    const tbody = document.getElementById('settlement-players-body');
    tbody.innerHTML = '';

    players.forEach((player) => {
        const invested = player.buy_ins * game.buy_in_amount;
        const isCashedOut = player.cashed_out;
        const row = document.createElement('tr');

        if (isCashedOut) {
            row.className = 'player-cashed-out';
        }

        if (isCashedOut) {
            // Cashed out player - show locked wins (read-only for everyone)
            row.innerHTML = `
                <td>
                    ${player.name}
                    <span class="cashed-out-badge">Cashed Out</span>
                </td>
                <td>${formatCurrency(invested)}</td>
                <td class="locked-wins">${formatCurrency(player.wins)}</td>
            `;
        } else if (isDealerMode) {
            // Active player - dealer can edit
            // Get current input value if it exists (preserve user's typing)
            const existingInput = document.getElementById(`wins-${player.id}`);
            const currentValue = existingInput ? existingInput.value : (player.wins || '');

            row.innerHTML = `
                <td>${player.name}</td>
                <td>${formatCurrency(invested)}</td>
                <td>
                    <input type="number" class="wins-input"
                        id="wins-${player.id}"
                        min="0" step="0.01"
                        value="${currentValue}"
                        oninput="window.updateEnteredTotalLocal()"
                        onblur="window.saveWins('${player.id}', this.value)">
                </td>
            `;
        } else {
            // Active player - player view (read-only)
            row.innerHTML = `
                <td>${player.name}</td>
                <td>${formatCurrency(invested)}</td>
                <td>${player.wins !== null ? formatCurrency(player.wins) : '-'}</td>
            `;
        }
        tbody.appendChild(row);
    });

    updateEnteredTotal();

    // Restore focus if needed
    if (preserveFocus && focusedId) {
        const elementToFocus = document.getElementById(focusedId);
        if (elementToFocus) {
            elementToFocus.focus();
        }
    }
}

// Update total locally without saving to database (called on input)
window.updateEnteredTotalLocal = function() {
    updateEnteredTotal();
};

// Save wins to database (called on blur)
window.saveWins = async function(playerId, value) {
    const wins = parseFloat(value) || 0;
    // Update local state to prevent re-render from overwriting
    const player = appState.players.find(p => p.id === playerId);
    if (player) {
        player.wins = wins;
    }
    await updatePlayerWins(playerId, wins);
};

function updateEnteredTotal() {
    const players = appState.players;
    const game = appState.game;
    const pot = calculatePot(players, game.buy_in_amount);

    let total = 0;
    players.forEach(player => {
        if (player.cashed_out) {
            // Cashed out players - use their saved wins value
            total += player.wins || 0;
        } else {
            // Active players - check input field first, then saved value
            const input = document.getElementById(`wins-${player.id}`);
            const value = input ? parseFloat(input.value) || 0 : (player.wins || 0);
            total += value;
        }
    });

    const enteredSpan = document.getElementById('entered-total');
    enteredSpan.textContent = formatCurrency(total);

    const diff = Math.abs(total - pot);
    enteredSpan.style.color = diff < 0.01 ? '#28a745' : '#dc3545';
}

window.calculateResults = async function() {
    const players = appState.players;
    const game = appState.game;
    const pot = calculatePot(players, game.buy_in_amount);

    // Validate totals and save wins
    let total = 0;
    for (const player of players) {
        if (player.cashed_out) {
            // Cashed out players - use their already saved wins
            total += player.wins || 0;
        } else {
            // Active players - get from input and save
            const input = document.getElementById(`wins-${player.id}`);
            const value = parseFloat(input?.value) || 0;
            total += value;

            // Save wins to database
            await updatePlayerWins(player.id, value);
        }
    }

    const diff = Math.abs(total - pot);
    if (diff >= 0.01) {
        showToast(`Total (${formatCurrency(total)}) doesn't match pot (${formatCurrency(pot)})`, 'error');
        return;
    }

    await updateGamePhase(appState.game.id, 'complete');
};

window.backToGame = async function() {
    await updateGamePhase(appState.game.id, 'playing');
};

// ============================================
// RESULTS VIEW
// ============================================

function renderResultsView() {
    const game = appState.game;
    const players = appState.players;

    const { results, payments } = calculateSettlements(players, game.buy_in_amount);

    // Render summary table
    const summaryBody = document.getElementById('summary-body');
    summaryBody.innerHTML = '';

    results.forEach(result => {
        let netClass = 'result-neutral';
        let netPrefix = '';

        if (result.net > 0.01) {
            netClass = 'result-positive';
            netPrefix = '+';
        } else if (result.net < -0.01) {
            netClass = 'result-negative';
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${result.name}</td>
            <td>${formatCurrency(result.invested)}</td>
            <td>${formatCurrency(result.wins)}</td>
            <td class="${netClass}">${netPrefix}${formatCurrency(result.net)}</td>
        `;
        summaryBody.appendChild(row);
    });

    // Render payments table
    const paymentsBody = document.getElementById('payments-body');
    paymentsBody.innerHTML = '';

    if (payments.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="4" style="text-align: center;">Everyone broke even!</td>';
        paymentsBody.appendChild(row);
    } else {
        payments.forEach(payment => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${payment.from}</strong></td>
                <td class="payment-arrow">pays &rarr;</td>
                <td><strong>${payment.to}</strong></td>
                <td><strong>${formatCurrency(payment.amount)}</strong></td>
            `;
            paymentsBody.appendChild(row);
        });
    }
}

window.newGame = function() {
    // Unsubscribe from real-time updates
    if (appState.subscription) {
        appState.subscription.unsubscribe();
    }

    // Reset state
    appState = {
        currentView: 'home',
        game: null,
        players: [],
        isDealer: false,
        subscription: null,
        cashOutPlayerId: null
    };

    clearGameCodeFromURL();
    showView('home');
};

// ============================================
// SHARE RESULTS
// ============================================

window.shareResults = async function() {
    if (!appState.game || !appState.players.length) {
        showToast('No game data to share', 'error');
        return;
    }

    const buyInAmount = appState.game.buy_in_amount;
    const pot = calculatePot(appState.players, buyInAmount);
    const { results, payments } = calculateSettlements(appState.players, buyInAmount);

    // Build the share text
    let shareText = `🃏 Poker Game Settled!\n\n`;
    shareText += `💰 Total Pot: ${formatCurrency(pot)}\n`;
    shareText += `👥 Players: ${appState.players.length}\n\n`;

    // Player results summary
    shareText += `📊 Results:\n`;
    results.forEach(result => {
        let netPrefix = '';
        if (result.net > 0.01) {
            netPrefix = '+';
        }
        shareText += `• ${result.name}: ${netPrefix}${formatCurrency(result.net)} (In: ${formatCurrency(result.invested)}, Out: ${formatCurrency(result.wins)})\n`;
    });

    // Payment instructions
    if (payments.length > 0) {
        shareText += `\n💸 Settle Up:\n`;
        payments.forEach(payment => {
            shareText += `• ${payment.from} → ${payment.to}: ${formatCurrency(payment.amount)}\n`;
        });
    } else {
        shareText += `\n✅ Everyone broke even!\n`;
    }

    shareText += `\n──────────────\n`;
    shareText += `Settle your poker games at:\n`;
    shareText += `https://pokersplit.org`;

    // Try Web Share API first (works great on mobile)
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Poker Game Settled - PokerSplit',
                text: shareText
            });
            showToast('Shared successfully!');
            return;
        } catch (err) {
            // User cancelled or share failed, fall through to clipboard
            if (err.name === 'AbortError') {
                return; // User cancelled
            }
        }
    }

    // Fallback: copy to clipboard
    const success = await copyToClipboard(shareText);
    if (success) {
        showToast('Summary copied to clipboard!');
    } else {
        showToast('Failed to copy', 'error');
    }
};

// ============================================
// FEEDBACK
// ============================================

window.openFeedback = function() {
    document.getElementById('feedback-modal').classList.remove('hidden');
};

window.closeFeedback = function() {
    document.getElementById('feedback-modal').classList.add('hidden');
    // Reset form
    document.querySelectorAll('input[name="rating"]').forEach(r => r.checked = false);
    document.getElementById('feedback-message').value = '';
    document.getElementById('feedback-email').value = '';
};

window.closeFeedbackOnOverlay = function(event) {
    if (event.target.id === 'feedback-modal') {
        window.closeFeedback();
    }
};

window.submitFeedback = async function() {
    const ratingInput = document.querySelector('input[name="rating"]:checked');
    const message = document.getElementById('feedback-message').value.trim();
    const email = document.getElementById('feedback-email').value.trim();

    if (!ratingInput && !message) {
        showToast('Please provide a rating or message', 'error');
        return;
    }

    const btn = document.getElementById('btn-submit-feedback');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.classList.add('loading');

    try {
        const { success, error } = await submitFeedback({
            rating: ratingInput ? parseInt(ratingInput.value) : null,
            message: message || null,
            email: email || null
        });

        if (success) {
            showToast('Thank you for your feedback!', 'success');
            window.closeFeedback();
        } else {
            showToast('Failed to submit feedback. Please try again.', 'error');
        }
    } catch (err) {
        console.error('Feedback error:', err);
        showToast('Error submitting feedback', 'error');
    } finally {
        btn.disabled = false;
        btn.classList.remove('loading');
        btn.textContent = originalText;
    }
};

// ============================================
// INITIALIZATION
// ============================================

async function init() {
    initHomeView();

    // Check for game code in URL
    const gameCode = getGameCodeFromURL();

    if (gameCode) {
        // Try to load the game
        showView('home'); // Show home first while loading
        document.getElementById('join-game-code').value = gameCode;
        await joinGame(gameCode);
    } else {
        showView('home');
    }
}

// Start the app
init();
