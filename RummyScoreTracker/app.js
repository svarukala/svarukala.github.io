// Rummy Score Tracker - App Logic

// ============================================
// State Management
// ============================================
const STORAGE_KEY = 'rummyScoreTracker';

let gameState = {
    config: {
        dropCount: 25,
        middleDropCount: 40,
        fullCount: 80,
        gameCount: 101
    },
    players: [],
    currentRound: 0,
    currentScreen: 'config'
};

// Modal state
let modalState = {
    playerId: null,
    round: null
};

// Undo history stack (stores previous game states)
const MAX_UNDO_HISTORY = 20;
let undoHistory = [];

// ============================================
// Initialization
// ============================================
function init() {
    loadState();
    initEventListeners();
    renderScreen();
}

function initEventListeners() {
    // Home button
    document.getElementById('home-btn').addEventListener('click', confirmNewGame);

    // Config screen
    document.getElementById('btn-start-game').addEventListener('click', startGame);

    // Tracker screen
    document.getElementById('btn-add-player').addEventListener('click', addPlayerFromInput);
    document.getElementById('new-player-name').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addPlayerFromInput();
    });
    document.getElementById('btn-add-round').addEventListener('click', addRound);
    document.getElementById('btn-new-game').addEventListener('click', confirmNewGame);
    document.getElementById('btn-undo').addEventListener('click', undo);

    // Keyboard shortcut for undo (Ctrl+Z)
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && gameState.currentScreen === 'tracker') {
            e.preventDefault();
            undo();
        }
    });

    // Score modal
    document.getElementById('btn-close-modal').addEventListener('click', closeScoreModal);
    document.getElementById('score-modal').addEventListener('click', (e) => {
        if (e.target.id === 'score-modal') closeScoreModal();
    });
    document.querySelectorAll('.score-option').forEach(btn => {
        btn.addEventListener('click', () => handleScoreOption(btn.dataset.score));
    });
    document.getElementById('btn-apply-custom').addEventListener('click', applyCustomScore);
    document.getElementById('custom-score').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') applyCustomScore();
    });

    // Winner modal
    document.getElementById('winner-modal').addEventListener('click', (e) => {
        if (e.target.id === 'winner-modal') closeWinnerModal();
    });
    document.getElementById('btn-play-again').addEventListener('click', () => {
        closeWinnerModal();
        playAgain();
    });

    // Config inputs - save on change
    ['drop-count', 'middle-drop-count', 'full-count', 'game-count'].forEach(id => {
        document.getElementById(id).addEventListener('change', saveConfigFromInputs);
    });
}

// ============================================
// State Persistence
// ============================================
function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
    updateUndoButton();
}

// ============================================
// Undo Functionality
// ============================================
function saveToUndoHistory() {
    // Deep copy current state before making changes
    const stateCopy = JSON.parse(JSON.stringify(gameState));
    undoHistory.push(stateCopy);

    // Limit history size
    if (undoHistory.length > MAX_UNDO_HISTORY) {
        undoHistory.shift();
    }
}

function undo() {
    if (undoHistory.length === 0) {
        showToast('Nothing to undo', 'info');
        return;
    }

    // Restore previous state
    const previousState = undoHistory.pop();
    gameState = previousState;

    saveState();
    renderTable();
    showToast('Undone!', 'success');
}

function updateUndoButton() {
    const undoBtn = document.getElementById('btn-undo');
    if (undoBtn) {
        undoBtn.disabled = undoHistory.length === 0;
    }
}

function clearUndoHistory() {
    undoHistory = [];
    updateUndoButton();
}

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        const parsed = JSON.parse(saved);
        gameState = { ...gameState, ...parsed };
    }
    updateConfigInputs();
}

function updateConfigInputs() {
    document.getElementById('drop-count').value = gameState.config.dropCount;
    document.getElementById('middle-drop-count').value = gameState.config.middleDropCount;
    document.getElementById('full-count').value = gameState.config.fullCount;
    document.getElementById('game-count').value = gameState.config.gameCount;
}

function saveConfigFromInputs() {
    gameState.config.dropCount = parseInt(document.getElementById('drop-count').value) || 25;
    gameState.config.middleDropCount = parseInt(document.getElementById('middle-drop-count').value) || 40;
    gameState.config.fullCount = parseInt(document.getElementById('full-count').value) || 80;
    gameState.config.gameCount = parseInt(document.getElementById('game-count').value) || 101;
    saveState();
}

// ============================================
// Screen Management
// ============================================
function renderScreen() {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
        screen.classList.add('hidden');
    });

    // Show current screen
    const currentScreen = document.getElementById(`${gameState.currentScreen}-screen`);
    if (currentScreen) {
        currentScreen.classList.remove('hidden');
        currentScreen.classList.add('active');
    }

    // Update displays based on screen
    if (gameState.currentScreen === 'tracker') {
        updateConfigDisplay();
        updateModalValues();
        renderTable();
    }
}

function showScreen(screenId) {
    gameState.currentScreen = screenId;
    saveState();
    renderScreen();
}

// ============================================
// Game Flow
// ============================================
function startGame() {
    saveConfigFromInputs();
    gameState.currentRound = 0;
    showScreen('tracker');
}

function createPlayer(name) {
    return {
        id: Date.now() + Math.random(),
        name: name,
        scores: [],
        total: 0,
        status: 'active'
    };
}

function resetGame() {
    gameState.players = [];
    gameState.currentRound = 0;
    clearUndoHistory();
    showScreen('config');
    saveState();
}

function playAgain() {
    // Keep the same players but reset their scores and status
    gameState.players.forEach(player => {
        player.scores = [];
        player.total = 0;
        player.status = 'active';
    });
    gameState.currentRound = 0;
    clearUndoHistory();
    saveState();
    renderTable();
    showToast('New game started with same players!', 'success');
}

function confirmNewGame() {
    if (gameState.currentScreen === 'tracker' && gameState.players.length > 0) {
        if (confirm('Are you sure you want to start a new game? Current progress will be lost.')) {
            resetGame();
        }
    } else {
        resetGame();
    }
}

// ============================================
// Player Management
// ============================================
function addPlayerFromInput() {
    const input = document.getElementById('new-player-name');
    const name = input.value.trim();

    if (!name) {
        showToast('Please enter a player name', 'error');
        return;
    }

    // Check for duplicate names
    if (gameState.players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        showToast('Player already exists', 'error');
        return;
    }

    addPlayer(name);
    input.value = '';
    input.focus();
}

function addPlayer(name) {
    const player = createPlayer(name);

    // Initialize scores for existing rounds
    for (let i = 0; i < gameState.currentRound; i++) {
        player.scores.push(null);
    }

    gameState.players.push(player);
    saveState();
    renderTable();
    showToast(`${name} added!`, 'success');
}

function removePlayer(playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return;

    // Only allow removing eliminated players
    if (player.status !== 'eliminated') {
        showToast('Can only remove eliminated players', 'error');
        return;
    }

    if (confirm(`Remove ${player.name} from the game?`)) {
        saveToUndoHistory();
        gameState.players = gameState.players.filter(p => p.id !== playerId);
        saveState();
        renderTable();
        checkGameOver();
        showToast(`${player.name} removed`, 'info');
    }
}

// ============================================
// Round Management
// ============================================
function isCurrentRoundComplete() {
    // If no rounds yet, allow adding first round
    if (gameState.currentRound === 0) return true;

    const missingPlayers = getMissingScorePlayers();
    return missingPlayers.length === 0;
}

function getMissingScorePlayers() {
    if (gameState.currentRound === 0) return [];

    const currentRoundIndex = gameState.currentRound - 1;

    // Only active players need scores for the current round
    // Eliminated players don't participate in subsequent rounds
    return gameState.players.filter(p =>
        p.status === 'active' && p.scores[currentRoundIndex] === null
    );
}

function addRound() {
    // Check if there are active players
    const activePlayers = gameState.players.filter(p => p.status === 'active');
    if (activePlayers.length < 2) {
        showToast('Need at least 2 active players', 'error');
        return;
    }

    // Check if current round is complete
    if (!isCurrentRoundComplete()) {
        const missingPlayers = getMissingScorePlayers();
        const names = missingPlayers.map(p => p.name).join(', ');
        showToast(`Enter scores for: ${names}`, 'error');
        return;
    }

    saveToUndoHistory();
    gameState.currentRound++;

    // Add null score for each player for the new round
    gameState.players.forEach(player => {
        player.scores.push(null);
    });

    saveState();
    renderTable();
    showToast(`Round ${gameState.currentRound} started`, 'info');
}

// ============================================
// Score Management
// ============================================
function openScoreModal(playerId, round) {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return;

    // Don't allow editing for eliminated players
    if (player.status === 'eliminated') {
        showToast('Player is eliminated', 'error');
        return;
    }

    modalState.playerId = playerId;
    modalState.round = round;

    document.getElementById('modal-player-name').textContent = player.name;
    document.getElementById('modal-round-num').textContent = round + 1;

    // Pre-fill custom score if exists
    const existingScore = player.scores[round];
    document.getElementById('custom-score').value = existingScore !== null ? existingScore : '';

    document.getElementById('score-modal').classList.remove('hidden');
}

function closeScoreModal() {
    document.getElementById('score-modal').classList.add('hidden');
    modalState.playerId = null;
    modalState.round = null;
}

function handleScoreOption(scoreType) {
    let score;
    switch (scoreType) {
        case 'winner':
            score = 0;
            break;
        case 'drop':
            score = gameState.config.dropCount;
            break;
        case 'middleDrop':
            score = gameState.config.middleDropCount;
            break;
        case 'full':
            score = gameState.config.fullCount;
            break;
        default:
            return;
    }

    const success = setScore(modalState.playerId, modalState.round, score);
    if (success) {
        closeScoreModal();
    }
}

function applyCustomScore() {
    const input = document.getElementById('custom-score');
    const score = parseInt(input.value);

    if (isNaN(score) || score < 0) {
        showToast('Please enter a valid score', 'error');
        return;
    }

    const success = setScore(modalState.playerId, modalState.round, score);
    if (success) {
        closeScoreModal();
    }
}

function getRoundWinner(round) {
    // Returns the player who has 0 points (winner) in the given round, or null if no winner yet
    return gameState.players.find(p => p.scores[round] === 0) || null;
}

function setScore(playerId, round, score) {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return false;

    // Check if trying to set winner (0 points) when there's already a winner in this round
    if (score === 0) {
        const existingWinner = getRoundWinner(round);
        if (existingWinner && existingWinner.id !== playerId) {
            showToast(`${existingWinner.name} is already the winner of Round ${round + 1}`, 'error');
            return false;
        }
    }

    // Save to undo history before making changes
    saveToUndoHistory();

    player.scores[round] = score;
    calculateTotals();
    saveState();
    renderTable();
    checkGameOver();
    return true;
}

function calculateTotals() {
    gameState.players.forEach(player => {
        player.total = player.scores.reduce((sum, score) => {
            return sum + (score !== null ? score : 0);
        }, 0);

        // Update status based on total (can change in either direction for undo support)
        if (player.total >= gameState.config.gameCount) {
            player.status = 'eliminated';
        } else {
            player.status = 'active';
        }
    });
}

// ============================================
// Table Rendering
// ============================================
function renderTable() {
    renderTableHeader();
    renderTableBody();
}

function renderTableHeader() {
    const headerRow = document.getElementById('table-header');

    // Build header HTML
    let html = '<th class="player-col">Player</th>';

    // Round columns
    for (let i = 0; i < gameState.currentRound; i++) {
        html += `<th class="round-col">R${i + 1}</th>`;
    }

    // Total and status columns
    html += '<th class="total-col">Total</th>';
    html += '<th class="status-col">Status</th>';
    html += '<th class="action-col"></th>';

    headerRow.innerHTML = html;
}

function renderTableBody() {
    const tbody = document.getElementById('table-body');

    if (gameState.players.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="${3 + gameState.currentRound}" class="empty-state">
                    Add players to start tracking scores
                </td>
            </tr>
        `;
        return;
    }

    let html = '';

    gameState.players.forEach(player => {
        const isEliminated = player.status === 'eliminated';
        const rowClass = isEliminated ? 'player-eliminated' : '';

        html += `<tr class="${rowClass}" data-player-id="${player.id}">`;

        // Player name
        html += `<td class="player-col"><span class="player-name">${escapeHtml(player.name)}</span></td>`;

        // Round scores
        for (let i = 0; i < gameState.currentRound; i++) {
            const score = player.scores[i];
            const scoreClass = getScoreClass(score, isEliminated);
            const displayScore = score !== null ? score : '-';
            const cellClass = isEliminated ? 'score-cell disabled' : 'score-cell';

            html += `<td class="${cellClass} ${scoreClass}" onclick="openScoreModal(${player.id}, ${i})">${displayScore}</td>`;
        }

        // Total
        html += `<td class="total-col">${player.total}</td>`;

        // Status
        const statusClass = isEliminated ? 'status-eliminated' : 'status-active';
        const statusText = isEliminated ? 'Out' : 'Active';
        html += `<td class="status-col"><span class="${statusClass}">${statusText}</span></td>`;

        // Remove button (only enabled for eliminated players)
        const removeDisabled = isEliminated ? '' : 'disabled';
        const removeTitle = isEliminated ? 'Remove player' : 'Can only remove eliminated players';
        html += `<td class="action-col">
            <button class="btn-remove-player" onclick="removePlayer(${player.id})" title="${removeTitle}" ${removeDisabled}>
                &times;
            </button>
        </td>`;

        html += '</tr>';
    });

    tbody.innerHTML = html;
}

function getScoreClass(score, isEliminated) {
    if (isEliminated || score === null) return '';

    if (score === 0) return 'has-score winner-score';
    if (score === gameState.config.dropCount) return 'has-score drop-score';
    if (score === gameState.config.middleDropCount) return 'has-score middle-drop-score';
    if (score === gameState.config.fullCount) return 'has-score full-score';

    return 'has-score';
}

// ============================================
// Game Over Check
// ============================================
function checkGameOver() {
    const activePlayers = gameState.players.filter(p => p.status === 'active');

    if (activePlayers.length === 1 && gameState.players.length > 1) {
        // We have a winner!
        const winner = activePlayers[0];
        showWinnerModal(winner);
    } else if (activePlayers.length === 0 && gameState.players.length > 0) {
        // All players eliminated (rare edge case)
        showToast('All players eliminated!', 'info');
    }
}

function showWinnerModal(winner) {
    document.getElementById('winner-name').textContent = winner.name;

    // Generate final standings
    const standings = [...gameState.players]
        .sort((a, b) => a.total - b.total);

    const standingsList = document.getElementById('final-standings-list');
    standingsList.innerHTML = standings.map((player, index) => `
        <li>
            <span class="standing-name">${index + 1}. ${escapeHtml(player.name)}</span>
            <span class="standing-score">${player.total} pts</span>
        </li>
    `).join('');

    // Create confetti
    createConfetti();

    document.getElementById('winner-modal').classList.remove('hidden');
}

function closeWinnerModal() {
    document.getElementById('winner-modal').classList.add('hidden');
    document.getElementById('confetti-container').innerHTML = '';
}

function createConfetti() {
    const container = document.getElementById('confetti-container');
    container.innerHTML = '';

    const colors = ['#FFD700', '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#f44336'];

    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
        container.appendChild(confetti);
    }
}

// ============================================
// UI Updates
// ============================================
function updateConfigDisplay() {
    document.getElementById('display-drop').textContent = gameState.config.dropCount;
    document.getElementById('display-mid').textContent = gameState.config.middleDropCount;
    document.getElementById('display-full').textContent = gameState.config.fullCount;
    document.getElementById('display-out').textContent = gameState.config.gameCount;
}

function updateModalValues() {
    document.querySelector('.drop-value').textContent = gameState.config.dropCount;
    document.querySelector('.middle-drop-value').textContent = gameState.config.middleDropCount;
    document.querySelector('.full-value').textContent = gameState.config.fullCount;
}

// ============================================
// Toast Notifications
// ============================================
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    toastMessage.textContent = message;
    toast.className = `toast ${type}`;

    // Show toast
    setTimeout(() => toast.classList.add('show'), 10);

    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ============================================
// Utility Functions
// ============================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions available globally for onclick handlers
window.openScoreModal = openScoreModal;
window.removePlayer = removePlayer;

// ============================================
// Start the app
// ============================================
document.addEventListener('DOMContentLoaded', init);
