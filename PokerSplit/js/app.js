// Main Application Logic
import {
    createGame,
    fetchGameByCode,
    fetchGamesByCodes,
    cancelGame,
    updateGamePhase,
    addPlayer as addPlayerToDb,
    updatePlayerBuyIns,
    updatePlayerWins,
    cashOutPlayer,
    updatePlayerUserId,
    subscribeToGame,
    submitFeedback,
    fetchGameStats
} from './supabase.js';

import {
    storeDealerToken,
    getDealerToken,
    getDealerTokens,
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

import {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    getCurrentUser,
    onAuthStateChange,
    updateDisplayName,
    getDisplayName
} from './auth.js';

import { finalizeGameStats, fetchHistory, fetchLeaderboard } from './statsApi.js';
import { fetchPlayerPool, addToPool, removeFromPool, syncNamesToPool } from './playerPoolApi.js';

// ============================================
// APPLICATION STATE
// ============================================

let appState = {
    currentView: 'home',
    game: null,
    players: [],
    isDealer: false,
    subscription: null,
    cashOutPlayerId: null,
    user: null,
    claimSlotShown: false,
    poolPlayers: []
};

// ============================================
// DOM ELEMENTS
// ============================================

const views = {
    home: document.getElementById('home-view'),
    setup: document.getElementById('setup-view'),
    game: document.getElementById('game-view'),
    settlement: document.getElementById('settlement-view'),
    results: document.getElementById('results-view'),
    history: document.getElementById('history-view'),
    leaderboard: document.getElementById('leaderboard-view'),
    players: document.getElementById('players-view'),
    profile: document.getElementById('profile-view')
};

// ============================================
// VIEW MANAGEMENT
// ============================================

function showView(viewName) {
    Object.keys(views).forEach(key => {
        if (views[key]) views[key].classList.toggle('hidden', key !== viewName);
    });
    appState.currentView = viewName;

    if (viewName === 'home') {
        scheduleSurveyBubble();
    } else {
        hideSurveyBubble();
    }
}

// Expose showView globally so HTML onclick attrs can call it
window.showView = showView;

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
// AUTH STATE & HEADER
// ============================================

function updateHeaderProfileBtn(user) {
    const btn = document.getElementById('profile-btn');
    if (!btn) return;

    if (user) {
        const initial = (user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'U')
            .charAt(0).toUpperCase();
        btn.innerHTML = `<span class="avatar-initial">${initial}</span>`;
        btn.title = user.email || 'Profile';
    } else {
        btn.innerHTML = 'Sign In';
        btn.title = 'Sign in to track your games';
    }
}

function updateHomeAuthFeatures(user) {
    const authSection = document.getElementById('auth-features-section');
    const signInPrompt = document.getElementById('sign-in-prompt');
    if (authSection) authSection.classList.toggle('hidden', !user);
    if (signInPrompt) signInPrompt.classList.toggle('hidden', !!user);
}

window.openAuthOrProfile = function() {
    if (appState.user) {
        showView('profile');
        renderProfileView();
    } else {
        openAuthModal('signin');
    }
};

// ============================================
// AUTH MODAL
// ============================================

let authMode = 'signin'; // 'signin' | 'signup'

function openAuthModal(mode = 'signin') {
    authMode = mode;
    renderAuthModal();
    document.getElementById('auth-modal').classList.remove('hidden');
}

function renderAuthModal() {
    const titleEl = document.getElementById('auth-modal-title');
    const switchEl = document.getElementById('auth-switch-text');
    const nameGroup = document.getElementById('auth-name-group');
    const submitBtn = document.getElementById('btn-auth-submit');

    if (authMode === 'signin') {
        if (titleEl) titleEl.textContent = 'Sign In';
        if (submitBtn) submitBtn.textContent = 'Sign In';
        if (nameGroup) nameGroup.classList.add('hidden');
        if (switchEl) switchEl.innerHTML = `No account? <a href="#" onclick="window.switchAuthMode('signup'); return false;">Sign Up</a>`;
    } else {
        if (titleEl) titleEl.textContent = 'Create Account';
        if (submitBtn) submitBtn.textContent = 'Create Account';
        if (nameGroup) nameGroup.classList.remove('hidden');
        if (switchEl) switchEl.innerHTML = `Have an account? <a href="#" onclick="window.switchAuthMode('signin'); return false;">Sign In</a>`;
    }

    // Clear fields and errors
    ['auth-email', 'auth-password', 'auth-name'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const errEl = document.getElementById('auth-error');
    if (errEl) errEl.textContent = '';
}

window.switchAuthMode = function(mode) {
    authMode = mode;
    renderAuthModal();
};

window.closeAuth = function() {
    document.getElementById('auth-modal').classList.add('hidden');
};

window.closeAuthOnOverlay = function(event) {
    if (event.target.id === 'auth-modal') window.closeAuth();
};

window.submitAuth = async function() {
    const email = document.getElementById('auth-email')?.value.trim();
    const password = document.getElementById('auth-password')?.value;
    const name = document.getElementById('auth-name')?.value.trim();
    const errEl = document.getElementById('auth-error');
    const btn = document.getElementById('btn-auth-submit');

    if (!email || !password) {
        if (errEl) errEl.textContent = 'Please enter email and password.';
        return;
    }

    const originalText = btn.textContent;
    btn.disabled = true;
    btn.classList.add('loading');
    if (errEl) errEl.textContent = '';

    try {
        let result;
        if (authMode === 'signup') {
            result = await signUpWithEmail(email, password, name);
            if (!result.error) {
                showToast('Account created! Check your email to confirm.', 'success');
                window.closeAuth();
            }
        } else {
            result = await signInWithEmail(email, password);
            if (!result.error) {
                showToast('Welcome back!', 'success');
                window.closeAuth();
            }
        }

        if (result.error) {
            if (errEl) errEl.textContent = result.error.message || 'Authentication failed.';
        }
    } catch (err) {
        if (errEl) errEl.textContent = err.message || 'Unexpected error.';
    } finally {
        btn.disabled = false;
        btn.classList.remove('loading');
        btn.textContent = originalText;
    }
};

window.submitGoogleAuth = async function() {
    const { error } = await signInWithGoogle();
    if (error) showToast('Google sign-in failed: ' + error.message, 'error');
    // On success the browser navigates away; Supabase handles the redirect
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

    loadGameStats();
    loadMyGames();
}

async function loadGameStats() {
    const statsContainer = document.getElementById('game-stats');
    if (!statsContainer) return;

    try {
        const { active, completed, total, error } = await fetchGameStats();
        if (error) { statsContainer.classList.add('hidden'); return; }

        document.getElementById('stat-active').textContent = active.toLocaleString();
        document.getElementById('stat-completed').textContent = completed.toLocaleString();
        document.getElementById('stat-total').textContent = total.toLocaleString();

        statsContainer.classList.remove('hidden');
        statsContainer.classList.add('stats-visible');
    } catch (err) {
        console.error('Failed to load game stats:', err);
        statsContainer.classList.add('hidden');
    }
}

// ============================================
// MY GAMES (dealer's active games from localStorage)
// ============================================

async function loadMyGames() {
    const tokens = getDealerTokens();
    const codes = Object.keys(tokens);
    if (codes.length === 0) return;

    const { games, error } = await fetchGamesByCodes(codes);
    if (error) return;

    const activeGames = games.filter(g => g.phase === 'playing' || g.phase === 'settlement');
    if (activeGames.length === 0) return;

    document.getElementById('my-games-section').classList.remove('hidden');
    document.getElementById('my-games-list').innerHTML = activeGames.map(game => `
        <div class="my-game-card" onclick="window.resumeGame('${game.game_code}')">
            <span class="my-game-code">${game.game_code}</span>
            <span class="my-game-meta">${formatCurrency(game.buy_in_amount)} buy-in</span>
            <span class="phase-tag phase-tag-${game.phase}">${game.phase}</span>
            <button class="btn-resume" onclick="event.stopPropagation(); window.resumeGame('${game.game_code}')">Resume</button>
        </div>
    `).join('');
}

window.resumeGame = function(code) {
    joinGame(code);
};

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

    // Show pool picker if user is logged in
    if (appState.user && appState.poolPlayers.length > 0) {
        renderPoolPicker();
    }

    document.getElementById('btn-start-game').addEventListener('click', startNewGame);
    document.getElementById('btn-back-to-home').addEventListener('click', () => {
        showView('home');
    });
}

function renderPoolPicker() {
    const section = document.getElementById('pool-picker-section');
    const chips = document.getElementById('pool-picker-chips');
    if (!section || !chips) return;

    section.classList.remove('hidden');
    chips.innerHTML = appState.poolPlayers.map(p => `
        <button class="pool-chip-btn" onclick="window.fillFromPool('${escapeHtml(p.name)}')" type="button">
            ${escapeHtml(p.name)}
        </button>
    `).join('');
}

window.fillFromPool = function(name) {
    // Fill the next empty player name input
    const inputs = document.querySelectorAll('.player-name');
    for (const input of inputs) {
        if (!input.value.trim()) {
            input.value = name;
            input.focus();
            return;
        }
    }
    // If all filled, replace the last one
    if (inputs.length > 0) {
        inputs[inputs.length - 1].value = name;
    }
};

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

    const btn = document.getElementById('btn-start-game');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.classList.add('loading');

    try {
        const createdBy = appState.user?.id || null;
        const { game, dealerToken, error } = await createGame(buyInAmount, players, createdBy);

        if (error) {
            showToast('Failed to create game: ' + error.message, 'error');
            return;
        }

        // Sync player names to pool if user is logged in
        if (appState.user) {
            syncNamesToPool(appState.user.id, players).catch(() => {});
        }

        storeDealerToken(game.game_code, dealerToken);
        setGameCodeInURL(game.game_code);
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
    appState.claimSlotShown = false;

    subscribeToGameUpdates(game.id);

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
        case 'cancelled':
            showToast('This game has been cancelled', 'error');
            clearGameCodeFromURL();
            showView('home');
            return;
        default:
            showView('game');
            renderGameView();
    }

    // Offer claim-slot prompt to signed-in non-dealers
    maybeShowClaimSlot();
}

// ============================================
// CLAIM SLOT
// ============================================

function maybeShowClaimSlot() {
    if (!appState.user || appState.isDealer || appState.claimSlotShown) return;

    const unclaimed = appState.players.filter(p => !p.user_id);
    if (unclaimed.length === 0) return;

    // Don't prompt if this user already claimed a slot in this game
    const alreadyClaimed = appState.players.some(p => p.user_id === appState.user.id);
    if (alreadyClaimed) return;

    appState.claimSlotShown = true;

    const list = document.getElementById('claim-player-list');
    if (list) {
        list.innerHTML = unclaimed.map(p => `
            <button class="pool-chip-btn claim-btn" onclick="window.claimSlot('${p.id}')">
                ${escapeHtml(p.name)}
            </button>
        `).join('');
    }

    document.getElementById('claim-slot-modal').classList.remove('hidden');
}

window.claimSlot = async function(playerId) {
    if (!appState.user) return;

    const { error } = await updatePlayerUserId(playerId, appState.user.id);
    if (error) {
        showToast('Could not claim slot: ' + error.message, 'error');
    } else {
        showToast('You claimed your spot!', 'success');
        // If game is already complete, record stats immediately
        if (appState.game?.phase === 'complete') {
            finalizeGameStats(appState.game.id, appState.game.game_code, appState.game.buy_in_amount).catch(() => {});
        }
    }
    window.closeClaimSlot();
};

window.closeClaimSlot = function() {
    document.getElementById('claim-slot-modal').classList.add('hidden');
};

window.closeClaimSlotOnOverlay = function(event) {
    if (event.target.id === 'claim-slot-modal') window.closeClaimSlot();
};

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

function subscribeToGameUpdates(gameId) {
    if (appState.subscription) {
        appState.subscription.unsubscribe();
    }

    appState.subscription = subscribeToGame(gameId, async (table, payload) => {
        console.log('Real-time update:', table, payload);

        const isEditing = document.activeElement?.classList.contains('wins-input');
        const { game, players } = await fetchGameByCode(appState.game.game_code);

        if (game) {
            const phaseChanged = game.phase !== appState.game.phase;
            appState.game = game;

            if (isEditing && appState.currentView === 'settlement' && appState.isDealer) {
                players.forEach(newPlayer => {
                    const existing = appState.players.find(p => p.id === newPlayer.id);
                    if (existing) {
                        existing.buy_ins = newPlayer.buy_ins;
                        existing.name = newPlayer.name;
                    } else {
                        appState.players.push(newPlayer);
                    }
                });
            } else {
                appState.players = players;
            }

            if (!(isEditing && appState.currentView === 'settlement' && appState.isDealer)) {
                switch (appState.currentView) {
                    case 'game':       renderGameView();       break;
                    case 'settlement': renderSettlementView(); break;
                    case 'results':    renderResultsView();    break;
                }
            }

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
                        maybeShowClaimSlot();
                        break;
                    case 'cancelled':
                        showToast('This game has been cancelled', 'error');
                        clearGameCodeFromURL();
                        showView('home');
                        break;
                }
            }
        }
    }, (connected) => {
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

    document.getElementById('game-code-display').textContent = game.game_code;
    document.getElementById('buyin-display').textContent = formatCurrency(game.buy_in_amount);

    document.querySelectorAll('.dealer-only').forEach(el => {
        el.classList.toggle('hidden', !isDealerMode);
    });
    document.getElementById('player-mode-indicator').classList.toggle('hidden', isDealerMode);

    const tbody = document.getElementById('game-players-body');
    tbody.innerHTML = '';

    players.forEach((player) => {
        const invested = player.buy_ins * game.buy_in_amount;
        const isCashedOut = player.cashed_out;
        const row = document.createElement('tr');
        if (isCashedOut) row.className = 'player-cashed-out';

        if (isCashedOut) {
            row.innerHTML = `
                <td>
                    ${escapeHtml(player.name)}
                    <span class="cashed-out-badge">Cashed Out: ${formatCurrency(player.wins)}</span>
                </td>
                <td>${player.buy_ins}</td>
                <td>${formatCurrency(invested)}</td>
                <td class="dealer-only ${isDealerMode ? '' : 'hidden'}"></td>
            `;
        } else {
            row.innerHTML = `
                <td>${escapeHtml(player.name)}</td>
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

    const pot = calculatePot(players, game.buy_in_amount);
    document.getElementById('pot-total').textContent = formatCurrency(pot);
}

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
        setTimeout(() => { btn.textContent = 'Copy Link'; btn.classList.remove('copy-success'); }, 2000);
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
        setTimeout(() => { btn.textContent = 'Copy Code'; codeDisplay.classList.remove('copy-success'); }, 2000);
    } else {
        showToast('Failed to copy code', 'error');
    }
};

// Cash Out Modal
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
    if (event.target.id === 'cashout-modal') window.closeCashOut();
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
        if (error) { showToast('Failed to cash out player: ' + error.message, 'error'); return; }
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

// QR Code
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
            new QRious({ element: canvas, value: link, size: 200, foreground: '#1a472a', background: '#ffffff', level: 'M' });
        } catch (error) {
            console.error('QR Code error:', error);
            showToast('Failed to generate QR code', 'error');
        }
    } else {
        showToast('QR code library not loaded', 'error');
    }
}

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

window.cancelGame = async function() {
    if (!confirm('Cancel this game? This cannot be undone.')) return;
    const { error } = await cancelGame(appState.game.id);
    if (error) { showToast('Failed to cancel game', 'error'); return; }
    window.newGame();
};

// ============================================
// SETTLEMENT VIEW
// ============================================

function renderSettlementView() {
    const game = appState.game;
    const players = appState.players;
    const isDealerMode = appState.isDealer;

    document.querySelectorAll('.dealer-only').forEach(el => {
        el.classList.toggle('hidden', !isDealerMode);
    });
    document.getElementById('player-mode-settlement').classList.toggle('hidden', isDealerMode);

    const pot = calculatePot(players, game.buy_in_amount);
    document.getElementById('settlement-pot-total').textContent = formatCurrency(pot);

    const tbody = document.getElementById('settlement-players-body');
    tbody.innerHTML = '';

    players.forEach((player) => {
        const invested = player.buy_ins * game.buy_in_amount;
        const isCashedOut = player.cashed_out;
        const row = document.createElement('tr');
        if (isCashedOut) row.className = 'player-cashed-out';

        if (isCashedOut) {
            row.innerHTML = `
                <td>${escapeHtml(player.name)}<span class="cashed-out-badge">Cashed Out</span></td>
                <td>${formatCurrency(invested)}</td>
                <td class="locked-wins">${formatCurrency(player.wins)}</td>
            `;
        } else if (isDealerMode) {
            const existingInput = document.getElementById(`wins-${player.id}`);
            const currentValue = existingInput ? existingInput.value : (player.wins || '');
            row.innerHTML = `
                <td>${escapeHtml(player.name)}</td>
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
            row.innerHTML = `
                <td>${escapeHtml(player.name)}</td>
                <td>${formatCurrency(invested)}</td>
                <td>${player.wins !== null ? formatCurrency(player.wins) : '-'}</td>
            `;
        }
        tbody.appendChild(row);
    });

    updateEnteredTotal();
}

window.updateEnteredTotalLocal = function() { updateEnteredTotal(); };

window.saveWins = async function(playerId, value) {
    const wins = parseFloat(value) || 0;
    const player = appState.players.find(p => p.id === playerId);
    if (player) player.wins = wins;
    await updatePlayerWins(playerId, wins);
};

function updateEnteredTotal() {
    const players = appState.players;
    const game = appState.game;
    const pot = calculatePot(players, game.buy_in_amount);

    let total = 0;
    players.forEach(player => {
        if (player.cashed_out) {
            total += player.wins || 0;
        } else {
            const input = document.getElementById(`wins-${player.id}`);
            total += input ? parseFloat(input.value) || 0 : (player.wins || 0);
        }
    });

    const enteredSpan = document.getElementById('entered-total');
    enteredSpan.textContent = formatCurrency(total);
    enteredSpan.style.color = Math.abs(total - pot) < 0.01 ? '#28a745' : '#dc3545';
}

window.calculateResults = async function() {
    const players = appState.players;
    const game = appState.game;
    const pot = calculatePot(players, game.buy_in_amount);

    let total = 0;
    for (const player of players) {
        if (player.cashed_out) {
            total += player.wins || 0;
        } else {
            const input = document.getElementById(`wins-${player.id}`);
            const value = parseFloat(input?.value) || 0;
            total += value;
            await updatePlayerWins(player.id, value);
        }
    }

    const diff = Math.abs(total - pot);
    if (diff >= 0.01) {
        showToast(`Total (${formatCurrency(total)}) doesn't match pot (${formatCurrency(pot)})`, 'error');
        return;
    }

    await updateGamePhase(appState.game.id, 'complete');

    // Record stats for all players with linked user accounts (fire-and-forget)
    finalizeGameStats(appState.game.id, appState.game.game_code, appState.game.buy_in_amount).catch(() => {});
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

    const summaryBody = document.getElementById('summary-body');
    summaryBody.innerHTML = '';

    results.forEach(result => {
        let netClass = 'result-neutral';
        let netPrefix = '';
        if (result.net > 0.01) { netClass = 'result-positive'; netPrefix = '+'; }
        else if (result.net < -0.01) { netClass = 'result-negative'; }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(result.name)}</td>
            <td>${formatCurrency(result.invested)}</td>
            <td>${formatCurrency(result.wins)}</td>
            <td class="${netClass}">${netPrefix}${formatCurrency(result.net)}</td>
        `;
        summaryBody.appendChild(row);
    });

    const paymentsBody = document.getElementById('payments-body');
    paymentsBody.innerHTML = '';

    if (payments.length === 0) {
        paymentsBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Everyone broke even!</td></tr>';
    } else {
        payments.forEach(payment => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${escapeHtml(payment.from)}</strong></td>
                <td class="payment-arrow">pays &rarr;</td>
                <td><strong>${escapeHtml(payment.to)}</strong></td>
                <td><strong>${formatCurrency(payment.amount)}</strong></td>
            `;
            paymentsBody.appendChild(row);
        });
    }
}

window.newGame = function() {
    if (appState.subscription) appState.subscription.unsubscribe();

    // Preserve user across game reset
    const savedUser = appState.user;
    const savedPool = appState.poolPlayers;

    appState = {
        currentView: 'home',
        game: null,
        players: [],
        isDealer: false,
        subscription: null,
        cashOutPlayerId: null,
        user: savedUser,
        claimSlotShown: false,
        poolPlayers: savedPool
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

    let shareText = `🃏 Poker Game Settled!\n\n`;
    shareText += `💰 Total Pot: ${formatCurrency(pot)}\n`;
    shareText += `👥 Players: ${appState.players.length}\n\n`;
    shareText += `📊 Results:\n`;
    results.forEach(result => {
        const prefix = result.net > 0.01 ? '+' : '';
        shareText += `• ${result.name}: ${prefix}${formatCurrency(result.net)} (In: ${formatCurrency(result.invested)}, Out: ${formatCurrency(result.wins)})\n`;
    });

    if (payments.length > 0) {
        shareText += `\n💸 Settle Up:\n`;
        payments.forEach(p => { shareText += `• ${p.from} → ${p.to}: ${formatCurrency(p.amount)}\n`; });
    } else {
        shareText += `\n✅ Everyone broke even!\n`;
    }
    shareText += `\n──────────────\nSettle your poker games at:\nhttps://pokersplit.org`;

    if (navigator.share) {
        try {
            await navigator.share({ title: 'Poker Game Settled - PokerSplit', text: shareText });
            showToast('Shared successfully!');
            return;
        } catch (err) {
            if (err.name === 'AbortError') return;
        }
    }

    const success = await copyToClipboard(shareText);
    if (success) showToast('Summary copied to clipboard!');
    else showToast('Failed to copy', 'error');
};

// ============================================
// HISTORY VIEW
// ============================================

window.showHistoryView = async function() {
    showView('history');
    const container = document.getElementById('history-list');
    container.innerHTML = '<p style="color:#666; text-align:center; padding:20px;">Loading...</p>';

    if (!appState.user) {
        container.innerHTML = '<p style="color:#666; text-align:center; padding:20px;">Sign in to view your history.</p>';
        return;
    }

    const { history, error } = await fetchHistory(appState.user.id);
    if (error || history.length === 0) {
        container.innerHTML = '<p style="color:#666; text-align:center; padding:20px;">No games recorded yet. Play a few games to see your history!</p>';
        return;
    }

    container.innerHTML = history.map(entry => {
        const netClass = entry.net_result > 0.01 ? 'net-positive' : entry.net_result < -0.01 ? 'net-negative' : 'net-neutral';
        const netPrefix = entry.net_result > 0.01 ? '+' : '';
        const date = new Date(entry.played_at).toLocaleDateString();
        return `
            <div class="history-item">
                <div class="history-meta">
                    <span class="history-code">${escapeHtml(entry.game_code)}</span>
                    <span class="history-date">${date}</span>
                </div>
                <div class="history-stats">
                    <span>In: <strong>${formatCurrency(entry.invested)}</strong></span>
                    <span>Out: <strong>${formatCurrency(entry.wins)}</strong></span>
                    <span class="${netClass}"><strong>${netPrefix}${formatCurrency(entry.net_result)}</strong></span>
                </div>
            </div>
        `;
    }).join('');
};

// ============================================
// LEADERBOARD VIEW
// ============================================

let leaderboardTimeframe = 'all';
let leaderboardMetric = 'net';

window.showLeaderboardView = async function() {
    showView('leaderboard');
    await loadLeaderboard();
};

async function loadLeaderboard() {
    const container = document.getElementById('leaderboard-list');
    container.innerHTML = '<p style="color:#666; text-align:center; padding:20px;">Loading...</p>';

    // Sync active tab UI
    document.querySelectorAll('.lb-tab-timeframe').forEach(btn => {
        btn.classList.toggle('tab-active', btn.dataset.value === leaderboardTimeframe);
    });
    document.querySelectorAll('.lb-tab-metric').forEach(btn => {
        btn.classList.toggle('tab-active', btn.dataset.value === leaderboardMetric);
    });

    const { leaderboard, error } = await fetchLeaderboard(leaderboardTimeframe, leaderboardMetric);

    if (error || leaderboard.length === 0) {
        container.innerHTML = '<p style="color:#666; text-align:center; padding:20px;">No leaderboard data yet.</p>';
        return;
    }

    const rows = leaderboard.map((entry, i) => {
        const rank = i + 1;
        const rankBadge = rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`;
        const metricValue = leaderboardMetric === 'net'
            ? formatCurrency(entry.total_net)
            : `${(entry.win_rate * 100).toFixed(1)}%`;
        return `
            <tr>
                <td><span class="rank-badge">${rankBadge}</span></td>
                <td><strong>${escapeHtml(entry.display_name)}</strong></td>
                <td>${entry.games_played}</td>
                <td>${entry.games_won}</td>
                <td class="${entry.total_net >= 0 ? 'net-positive' : 'net-negative'}">${metricValue}</td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Player</th>
                    <th>Played</th>
                    <th>Won</th>
                    <th>${leaderboardMetric === 'net' ? 'Net $' : 'Win Rate'}</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

window.setLeaderboardTimeframe = function(value) {
    leaderboardTimeframe = value;
    loadLeaderboard();
};

window.setLeaderboardMetric = function(value) {
    leaderboardMetric = value;
    loadLeaderboard();
};

// ============================================
// PLAYER POOL VIEW
// ============================================

window.showPlayersView = async function() {
    showView('players');
    await loadPoolView();
};

async function loadPoolView() {
    const container = document.getElementById('pool-list');
    if (!container) return;

    if (!appState.user) {
        container.innerHTML = '<p style="color:#666;">Sign in to manage your player pool.</p>';
        return;
    }

    container.innerHTML = '<p style="color:#666;">Loading...</p>';
    const { players, error } = await fetchPlayerPool(appState.user.id);
    appState.poolPlayers = players;

    if (error) { container.innerHTML = '<p style="color:#dc3545;">Failed to load players.</p>'; return; }

    if (players.length === 0) {
        container.innerHTML = '<p style="color:#666; padding: 10px 0;">No players in your pool yet. Add some below!</p>';
        return;
    }

    container.innerHTML = players.map(p => `
        <div class="pool-player-item">
            <span class="pool-player-name">${escapeHtml(p.name)}</span>
            <button class="btn-remove-pool" onclick="window.removePoolPlayer('${p.id}')" title="Remove">✕</button>
        </div>
    `).join('');
}

window.addPoolPlayer = async function() {
    if (!appState.user) { openAuthModal('signin'); return; }

    const input = document.getElementById('new-pool-player');
    const name = input.value.trim();
    if (!name) { showToast('Enter a player name', 'error'); return; }

    const { error } = await addToPool(appState.user.id, name);
    if (error) { showToast('Failed to add player: ' + error.message, 'error'); return; }

    input.value = '';
    showToast(`${name} added to your pool`, 'success');
    await loadPoolView();
};

window.removePoolPlayer = async function(playerId) {
    const { error } = await removeFromPool(playerId);
    if (error) { showToast('Failed to remove player', 'error'); return; }
    await loadPoolView();
};

// ============================================
// PROFILE VIEW
// ============================================

async function renderProfileView() {
    const user = appState.user;
    if (!user) { showView('home'); return; }

    const { displayName } = await getDisplayName(user.id);
    const container = document.getElementById('profile-info');
    if (!container) return;

    const email = user.email || '';
    const initial = (displayName || email || 'U').charAt(0).toUpperCase();

    container.innerHTML = `
        <div style="text-align: center; margin-bottom: 24px;">
            <div class="profile-avatar-large">${initial}</div>
            <p style="color: #666; font-size: 0.9rem; margin-top: 8px;">${escapeHtml(email)}</p>
        </div>

        <div class="form-group">
            <label for="profile-display-name">Display Name</label>
            <input type="text" id="profile-display-name" value="${escapeHtml(displayName || '')}" placeholder="Your display name">
        </div>

        <div class="btn-group">
            <button onclick="window.saveProfileName()">Save Name</button>
            <button class="secondary" onclick="window.signOutUser()" style="background:#fff;color:#dc3545;border:1.5px solid #dc3545;">Sign Out</button>
        </div>
    `;
}

window.saveProfileName = async function() {
    if (!appState.user) return;
    const input = document.getElementById('profile-display-name');
    const name = input?.value.trim();
    if (!name) { showToast('Please enter a name', 'error'); return; }

    const { error } = await updateDisplayName(appState.user.id, name);
    if (error) { showToast('Failed to save name', 'error'); return; }
    showToast('Name saved!', 'success');
    updateHeaderProfileBtn(appState.user);
};

window.signOutUser = async function() {
    await signOut();
    appState.user = null;
    appState.poolPlayers = [];
    updateHeaderProfileBtn(null);
    updateHomeAuthFeatures(null);
    showView('home');
    showToast('Signed out', 'info');
};

// ============================================
// FEEDBACK
// ============================================

window.openFeedback = function() {
    document.getElementById('feedback-modal').classList.remove('hidden');
};

window.closeFeedback = function() {
    document.getElementById('feedback-modal').classList.add('hidden');
    document.querySelectorAll('input[name="rating"]').forEach(r => r.checked = false);
    document.getElementById('feedback-message').value = '';
    document.getElementById('feedback-email').value = '';
};

window.closeFeedbackOnOverlay = function(event) {
    if (event.target.id === 'feedback-modal') window.closeFeedback();
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
        showToast('Error submitting feedback', 'error');
    } finally {
        btn.disabled = false;
        btn.classList.remove('loading');
        btn.textContent = originalText;
    }
};

// ============================================
// UTILITIES
// ============================================

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ============================================
// INITIALIZATION
// ============================================

async function init() {
    // Set up auth state listener
    onAuthStateChange(async (user, event) => {
        appState.user = user;
        updateHeaderProfileBtn(user);
        updateHomeAuthFeatures(user);

        if (user) {
            const { players } = await fetchPlayerPool(user.id);
            appState.poolPlayers = players;
        } else {
            appState.poolPlayers = [];
        }
    });

    initHomeView();

    // Check for game code in URL
    const gameCode = getGameCodeFromURL();
    if (gameCode) {
        showView('home');
        document.getElementById('join-game-code').value = gameCode;
        await joinGame(gameCode);
    } else {
        showView('home');
    }
}

init();
