// Money Money - Kids Money Learning Game
// Main Game Logic

// ============================================
// Game Data
// ============================================
const MONEY_DATA = {
    coins: [
        {
            id: 'penny',
            name: 'Penny',
            value: 1,
            displayValue: '1¢',
            class: 'penny',
            fact: 'The penny has Abraham Lincoln on it. He was the 16th President of the United States!'
        },
        {
            id: 'nickel',
            name: 'Nickel',
            value: 5,
            displayValue: '5¢',
            class: 'nickel',
            fact: 'The nickel has Thomas Jefferson on it. He wrote the Declaration of Independence!'
        },
        {
            id: 'dime',
            name: 'Dime',
            value: 10,
            displayValue: '10¢',
            class: 'dime',
            fact: 'The dime is the smallest coin but worth more than a penny or nickel! It has Franklin D. Roosevelt on it.'
        },
        {
            id: 'quarter',
            name: 'Quarter',
            value: 25,
            displayValue: '25¢',
            class: 'quarter',
            fact: 'The quarter has George Washington on it. Four quarters make one dollar!'
        }
    ],
    bills: [
        {
            id: 'one',
            name: 'One Dollar Bill',
            value: 100,
            displayValue: '$1',
            class: 'bill',
            fact: 'The one dollar bill has George Washington on it. 100 pennies equal one dollar!'
        },
        {
            id: 'five',
            name: 'Five Dollar Bill',
            value: 500,
            displayValue: '$5',
            class: 'bill',
            fact: 'The five dollar bill has Abraham Lincoln on it. He\'s also on the penny!'
        },
        {
            id: 'ten',
            name: 'Ten Dollar Bill',
            value: 1000,
            displayValue: '$10',
            class: 'bill',
            fact: 'The ten dollar bill has Alexander Hamilton on it. He helped create our money system!'
        },
        {
            id: 'twenty',
            name: 'Twenty Dollar Bill',
            value: 2000,
            displayValue: '$20',
            class: 'bill',
            fact: 'The twenty dollar bill has Andrew Jackson on it. It\'s one of the most common bills!'
        }
    ]
};

const SHOP_ITEMS = [
    { name: 'Apple', icon: '🍎', price: 35 },
    { name: 'Banana', icon: '🍌', price: 25 },
    { name: 'Cookie', icon: '🍪', price: 50 },
    { name: 'Juice Box', icon: '🧃', price: 75 },
    { name: 'Candy Bar', icon: '🍫', price: 85 },
    { name: 'Ice Cream', icon: '🍦', price: 150 },
    { name: 'Pizza Slice', icon: '🍕', price: 200 },
    { name: 'Toy Car', icon: '🚗', price: 350 },
    { name: 'Book', icon: '📚', price: 499 },
    { name: 'Teddy Bear', icon: '🧸', price: 750 }
];

// ============================================
// Game State
// ============================================
let gameState = {
    currentMode: 'menu',
    soundEnabled: true,
    totalStars: 0,

    // Piggy Bank state
    piggyBank: {
        level: 1,
        targetAmount: 0,
        currentAmount: 0,
        droppedCoins: []
    },

    // Shop Keeper state
    shop: {
        currentItem: null,
        payment: 0,
        changeGiven: 0,
        starsEarned: 0
    },

    // Money Match state
    match: {
        mode: 'practice',
        score: 0,
        timer: 60,
        timerInterval: null,
        questionCount: 0,
        highScores: []
    }
};

// ============================================
// Audio Context for Sound Effects
// ============================================
let audioContext = null;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

function playSound(type) {
    if (!gameState.soundEnabled) return;

    try {
        const ctx = initAudio();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        switch (type) {
            case 'coin':
                oscillator.frequency.setValueAtTime(800, ctx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.2);
                break;

            case 'correct':
                oscillator.frequency.setValueAtTime(523, ctx.currentTime);
                oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
                oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
                gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.4);
                break;

            case 'incorrect':
                oscillator.frequency.setValueAtTime(200, ctx.currentTime);
                oscillator.frequency.setValueAtTime(150, ctx.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.3);
                break;

            case 'celebration':
                const notes = [523, 587, 659, 698, 784, 880, 988, 1047];
                notes.forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
                    gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.1);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.15);
                    osc.start(ctx.currentTime + i * 0.1);
                    osc.stop(ctx.currentTime + i * 0.1 + 0.15);
                });
                break;

            case 'click':
                oscillator.frequency.setValueAtTime(600, ctx.currentTime);
                gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.05);
                break;
        }
    } catch (e) {
        console.log('Audio not available');
    }
}

// ============================================
// Utility Functions
// ============================================
function formatMoney(cents) {
    if (cents >= 100) {
        const dollars = Math.floor(cents / 100);
        const remainingCents = cents % 100;
        if (remainingCents === 0) {
            return `$${dollars}.00`;
        }
        return `$${dollars}.${remainingCents.toString().padStart(2, '0')}`;
    }
    return `${cents}¢`;
}

function formatMoneyFull(cents) {
    const dollars = Math.floor(cents / 100);
    const remainingCents = cents % 100;
    return `$${dollars}.${remainingCents.toString().padStart(2, '0')}`;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// ============================================
// DOM Element Creation
// ============================================
function createCoinElement(coinData, draggable = false, small = false) {
    const coin = document.createElement('div');
    coin.className = `coin ${coinData.class}${small ? ' small' : ''}`;
    coin.dataset.value = coinData.value;
    coin.dataset.id = coinData.id;
    coin.textContent = coinData.displayValue;

    if (draggable) {
        coin.draggable = true;
        coin.addEventListener('dragstart', handleDragStart);
        coin.addEventListener('dragend', handleDragEnd);

        // Touch events for mobile
        coin.addEventListener('touchstart', handleTouchStart, { passive: false });
        coin.addEventListener('touchmove', handleTouchMove, { passive: false });
        coin.addEventListener('touchend', handleTouchEnd);
    }

    return coin;
}

function createBillElement(billData, draggable = false, small = false) {
    const bill = document.createElement('div');
    bill.className = `bill${small ? ' small' : ''}`;
    bill.dataset.value = billData.value;
    bill.dataset.id = billData.id;
    bill.textContent = billData.displayValue;

    if (draggable) {
        bill.draggable = true;
        bill.addEventListener('dragstart', handleDragStart);
        bill.addEventListener('dragend', handleDragEnd);

        // Touch events for mobile
        bill.addEventListener('touchstart', handleTouchStart, { passive: false });
        bill.addEventListener('touchmove', handleTouchMove, { passive: false });
        bill.addEventListener('touchend', handleTouchEnd);
    }

    return bill;
}

// ============================================
// Drag and Drop Handlers
// ============================================
let draggedElement = null;
let touchClone = null;
let touchStartX, touchStartY;

function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.value);
    playSound('click');
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    draggedElement = null;
}

function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;

    draggedElement = this;

    // Create a clone for visual feedback
    touchClone = this.cloneNode(true);
    touchClone.style.position = 'fixed';
    touchClone.style.zIndex = '1000';
    touchClone.style.opacity = '0.8';
    touchClone.style.pointerEvents = 'none';
    touchClone.style.left = (touch.clientX - this.offsetWidth / 2) + 'px';
    touchClone.style.top = (touch.clientY - this.offsetHeight / 2) + 'px';
    document.body.appendChild(touchClone);

    this.classList.add('dragging');
    playSound('click');
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!touchClone) return;

    const touch = e.touches[0];
    touchClone.style.left = (touch.clientX - draggedElement.offsetWidth / 2) + 'px';
    touchClone.style.top = (touch.clientY - draggedElement.offsetHeight / 2) + 'px';

    // Check if over drop zone
    const dropZone = document.querySelector('.drop-zone');
    if (dropZone) {
        const rect = dropZone.getBoundingClientRect();
        if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
            touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
            dropZone.classList.add('drag-over');
        } else {
            dropZone.classList.remove('drag-over');
        }
    }
}

function handleTouchEnd(e) {
    if (!draggedElement) return;

    const touch = e.changedTouches[0];

    // Find drop zone under touch point
    if (touchClone) {
        touchClone.remove();
        touchClone = null;
    }

    const dropZone = document.querySelector('.drop-zone');
    if (dropZone) {
        const rect = dropZone.getBoundingClientRect();
        if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
            touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
            // Dropped in zone
            handleDropInZone(dropZone, draggedElement);
        }
        dropZone.classList.remove('drag-over');
    }

    draggedElement.classList.remove('dragging');
    draggedElement = null;
}

function handleDropInZone(dropZone, element) {
    const value = parseInt(element.dataset.value);

    if (gameState.currentMode === 'piggybank') {
        gameState.piggyBank.currentAmount += value;
        gameState.piggyBank.droppedCoins.push(element.dataset.id);
        updatePiggyBankDisplay();
        playSound('coin');
    } else if (gameState.currentMode === 'shopkeeper') {
        gameState.shop.changeGiven += value;
        updateShopChangeDisplay();
        playSound('coin');
    }
}

function setupDropZone(dropZone) {
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');

        if (draggedElement) {
            handleDropInZone(dropZone, draggedElement);
        }
    });
}

// ============================================
// Screen Navigation
// ============================================
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }

    // Update game state
    if (screenId === 'main-menu') {
        gameState.currentMode = 'menu';
    } else if (screenId === 'safari-mode') {
        gameState.currentMode = 'safari';
        initSafariMode();
    } else if (screenId === 'piggybank-mode') {
        gameState.currentMode = 'piggybank';
        initPiggyBankMode();
    } else if (screenId === 'shopkeeper-mode') {
        gameState.currentMode = 'shopkeeper';
        initShopKeeperMode();
    } else if (screenId === 'moneymatch-mode') {
        gameState.currentMode = 'moneymatch';
        initMoneyMatchMode();
    }
}

// ============================================
// Coin Safari Mode
// ============================================
function initSafariMode() {
    const container = document.getElementById('safari-coins');
    container.innerHTML = '';

    // Add all coins
    MONEY_DATA.coins.forEach(coinData => {
        const coin = createCoinElement(coinData);
        coin.addEventListener('click', () => showCoinInfo(coinData));
        container.appendChild(coin);
    });

    // Add all bills
    MONEY_DATA.bills.forEach(billData => {
        const bill = createBillElement(billData);
        bill.addEventListener('click', () => showCoinInfo(billData));
        container.appendChild(bill);
    });
}

function showCoinInfo(moneyData) {
    playSound('click');

    const card = document.getElementById('coin-info-card');
    const coinDisplay = document.getElementById('card-coin-display');
    const coinName = document.getElementById('card-coin-name');
    const coinValue = document.getElementById('card-coin-value');
    const coinFact = document.getElementById('card-coin-fact');

    // Create display element
    coinDisplay.innerHTML = '';
    if (moneyData.class === 'bill') {
        const bill = createBillElement(moneyData);
        coinDisplay.appendChild(bill);
    } else {
        const coin = createCoinElement(moneyData);
        coinDisplay.appendChild(coin);
    }

    coinName.textContent = moneyData.name;
    coinValue.textContent = moneyData.displayValue;
    coinFact.textContent = moneyData.fact;

    card.classList.remove('hidden');
}

function closeCoinInfoCard() {
    document.getElementById('coin-info-card').classList.add('hidden');
}

// ============================================
// Piggy Bank Challenge Mode
// ============================================
function initPiggyBankMode() {
    resetPiggyBank();
    generatePiggyBankTarget();
    populatePiggyBankCoins();

    const dropZone = document.getElementById('piggy-bank-drop');
    setupDropZone(dropZone);
}

function resetPiggyBank() {
    gameState.piggyBank.currentAmount = 0;
    gameState.piggyBank.droppedCoins = [];
    updatePiggyBankDisplay();
}

function generatePiggyBankTarget() {
    const level = gameState.piggyBank.level;
    let min, max;

    switch (level) {
        case 1: // Easy - small amounts, coins only
            min = 5;
            max = 50;
            break;
        case 2: // Medium - larger amounts
            min = 50;
            max = 200;
            break;
        case 3: // Hard - includes dollars
            min = 100;
            max = 500;
            break;
        default:
            min = 5;
            max = 50;
    }

    // Generate amount that's achievable with common coin combinations
    let target;
    if (level === 1) {
        target = getRandomInt(1, 10) * 5; // Multiples of 5
    } else if (level === 2) {
        target = getRandomInt(2, 8) * 25; // Multiples of 25
    } else {
        target = getRandomInt(1, 5) * 100 + getRandomInt(0, 3) * 25;
    }

    gameState.piggyBank.targetAmount = target;
    document.getElementById('target-amount').textContent = formatMoney(target);
}

function populatePiggyBankCoins() {
    const container = document.getElementById('piggy-coins');
    container.innerHTML = '';

    const level = gameState.piggyBank.level;

    // Add coins
    MONEY_DATA.coins.forEach(coinData => {
        // Add multiple of each coin type
        const count = coinData.value <= 5 ? 10 : (coinData.value <= 10 ? 8 : 6);
        for (let i = 0; i < count; i++) {
            const coin = createCoinElement(coinData, true, true);
            container.appendChild(coin);
        }
    });

    // Add bills for higher levels
    if (level >= 2) {
        for (let i = 0; i < 3; i++) {
            const bill = createBillElement(MONEY_DATA.bills[0], true, true); // $1 bills
            container.appendChild(bill);
        }
    }

    if (level >= 3) {
        for (let i = 0; i < 2; i++) {
            const bill = createBillElement(MONEY_DATA.bills[1], true, true); // $5 bills
            container.appendChild(bill);
        }
    }
}

function updatePiggyBankDisplay() {
    document.getElementById('current-amount').textContent = formatMoney(gameState.piggyBank.currentAmount);
}

function checkPiggyBankAnswer() {
    const current = gameState.piggyBank.currentAmount;
    const target = gameState.piggyBank.targetAmount;

    if (current === target) {
        playSound('correct');
        const stars = calculateStars(gameState.piggyBank.droppedCoins.length);
        showCelebration('Perfect!', stars);
        gameState.totalStars += stars;
        updateTotalStars();
        saveProgress();

        // Generate new target after celebration
        setTimeout(() => {
            resetPiggyBank();
            generatePiggyBankTarget();
            populatePiggyBankCoins();
        }, 2000);
    } else if (current > target) {
        playSound('incorrect');
        showFeedback('Too much! Try again.', false);
    } else {
        playSound('incorrect');
        showFeedback('Not enough yet! Keep adding.', false);
    }
}

function calculateStars(moveCount) {
    // Fewer moves = more stars
    if (moveCount <= 3) return 3;
    if (moveCount <= 5) return 2;
    return 1;
}

function setPiggyBankLevel(level) {
    gameState.piggyBank.level = level;

    // Update button states
    document.querySelectorAll('#piggy-difficulty .diff-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.level) === level);
    });

    resetPiggyBank();
    generatePiggyBankTarget();
    populatePiggyBankCoins();
}

// ============================================
// Shop Keeper Mode
// ============================================
function initShopKeeperMode() {
    renderShopItems();
    document.getElementById('transaction-area').classList.add('hidden');

    const dropZone = document.getElementById('change-given');
    setupDropZone(dropZone);
}

function renderShopItems() {
    const container = document.getElementById('shop-items');
    container.innerHTML = '';

    SHOP_ITEMS.forEach((item, index) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'shop-item';
        itemEl.innerHTML = `
            <div class="shop-item-icon">${item.icon}</div>
            <div class="shop-item-name">${item.name}</div>
            <div class="shop-item-price">${formatMoney(item.price)}</div>
        `;
        itemEl.addEventListener('click', () => selectShopItem(item));
        container.appendChild(itemEl);
    });
}

function selectShopItem(item) {
    playSound('click');

    gameState.shop.currentItem = item;

    // Calculate payment (always give a round amount higher than price)
    let payment;
    if (item.price <= 100) {
        payment = 100;
    } else if (item.price <= 500) {
        payment = Math.ceil(item.price / 100) * 100 + 100;
    } else {
        payment = Math.ceil(item.price / 500) * 500 + 500;
    }

    gameState.shop.payment = payment;
    gameState.shop.changeGiven = 0;

    // Update display
    document.getElementById('item-bought').textContent = `${item.icon} ${item.name}`;
    document.getElementById('item-price').textContent = formatMoney(item.price);
    document.getElementById('customer-payment').textContent = formatMoneyFull(payment);

    document.getElementById('shop-items').classList.add('hidden');
    document.getElementById('transaction-area').classList.remove('hidden');

    populateChangeCoins();
    updateShopChangeDisplay();
}

function populateChangeCoins() {
    const container = document.getElementById('change-coins');
    container.innerHTML = '';

    // Add various coins and bills for making change
    MONEY_DATA.coins.forEach(coinData => {
        for (let i = 0; i < 8; i++) {
            const coin = createCoinElement(coinData, true, true);
            container.appendChild(coin);
        }
    });

    // Add $1 and $5 bills
    for (let i = 0; i < 4; i++) {
        const bill = createBillElement(MONEY_DATA.bills[0], true, true);
        container.appendChild(bill);
    }
    for (let i = 0; i < 2; i++) {
        const bill = createBillElement(MONEY_DATA.bills[1], true, true);
        container.appendChild(bill);
    }
}

function updateShopChangeDisplay() {
    document.getElementById('change-input-display').textContent = formatMoneyFull(gameState.shop.changeGiven);
}

function checkShopChange() {
    const item = gameState.shop.currentItem;
    const correctChange = gameState.shop.payment - item.price;
    const givenChange = gameState.shop.changeGiven;

    if (givenChange === correctChange) {
        playSound('correct');
        gameState.shop.starsEarned++;
        gameState.totalStars++;
        updateTotalStars();
        document.getElementById('shop-star-count').textContent = gameState.shop.starsEarned;

        showFeedback('Correct change! Great job!', true);
        saveProgress();

        // Return to shop after delay
        setTimeout(() => {
            document.getElementById('shop-items').classList.remove('hidden');
            document.getElementById('transaction-area').classList.add('hidden');
            renderShopItems();
        }, 1500);
    } else if (givenChange > correctChange) {
        playSound('incorrect');
        showFeedback('Too much change! Try again.', false);
    } else {
        playSound('incorrect');
        showFeedback('Not enough change! Keep adding.', false);
    }
}

function resetShopChange() {
    gameState.shop.changeGiven = 0;
    updateShopChangeDisplay();
    populateChangeCoins();
}

// ============================================
// Money Match Mode
// ============================================
function initMoneyMatchMode() {
    gameState.match.score = 0;
    gameState.match.questionCount = 0;
    document.getElementById('match-points').textContent = '0';
    document.getElementById('match-question').innerHTML = '<p>Press "Start Quiz" to begin!</p>';
    document.getElementById('match-options').innerHTML = '';
    document.getElementById('match-start').classList.remove('hidden');

    loadHighScores();
}

function startMoneyMatch() {
    gameState.match.score = 0;
    gameState.match.questionCount = 0;
    document.getElementById('match-points').textContent = '0';
    document.getElementById('match-start').classList.add('hidden');

    if (gameState.match.mode === 'timed') {
        gameState.match.timer = 60;
        document.getElementById('match-timer').classList.remove('hidden');
        document.getElementById('timer-display').textContent = '60';
        startTimer();
    } else {
        document.getElementById('match-timer').classList.add('hidden');
    }

    generateMatchQuestion();
}

function startTimer() {
    gameState.match.timerInterval = setInterval(() => {
        gameState.match.timer--;
        document.getElementById('timer-display').textContent = gameState.match.timer;

        if (gameState.match.timer <= 0) {
            endMoneyMatch();
        }
    }, 1000);
}

function generateMatchQuestion() {
    const questionTypes = ['identify_value', 'count_coins', 'which_more', 'make_amount'];
    const type = questionTypes[getRandomInt(0, questionTypes.length - 1)];

    const questionBox = document.getElementById('match-question');
    const optionsGrid = document.getElementById('match-options');
    optionsGrid.innerHTML = '';

    let correctAnswer;
    let options = [];

    switch (type) {
        case 'identify_value':
            const money = Math.random() > 0.5
                ? MONEY_DATA.coins[getRandomInt(0, MONEY_DATA.coins.length - 1)]
                : MONEY_DATA.bills[getRandomInt(0, MONEY_DATA.bills.length - 1)];

            questionBox.innerHTML = `
                <p>How much is this worth?</p>
                <div class="question-coins">
                    <div class="${money.class === 'bill' ? 'bill' : 'coin ' + money.class}">${money.displayValue}</div>
                </div>
            `;

            correctAnswer = money.displayValue;
            options = [correctAnswer];

            // Generate wrong answers
            const allValues = [...MONEY_DATA.coins, ...MONEY_DATA.bills].map(m => m.displayValue);
            while (options.length < 4) {
                const wrongAnswer = allValues[getRandomInt(0, allValues.length - 1)];
                if (!options.includes(wrongAnswer)) {
                    options.push(wrongAnswer);
                }
            }
            break;

        case 'count_coins':
            const coinCount = getRandomInt(2, 4);
            const selectedCoins = [];
            let total = 0;

            for (let i = 0; i < coinCount; i++) {
                const coin = MONEY_DATA.coins[getRandomInt(0, MONEY_DATA.coins.length - 1)];
                selectedCoins.push(coin);
                total += coin.value;
            }

            questionBox.innerHTML = `
                <p>How much money is this?</p>
                <div class="question-coins">
                    ${selectedCoins.map(c => `<div class="coin ${c.class} small">${c.displayValue}</div>`).join('')}
                </div>
            `;

            correctAnswer = formatMoney(total);
            options = [correctAnswer];

            // Generate plausible wrong answers
            while (options.length < 4) {
                const wrongTotal = total + (getRandomInt(-3, 3) * 5);
                if (wrongTotal > 0 && wrongTotal !== total) {
                    const wrongAnswer = formatMoney(wrongTotal);
                    if (!options.includes(wrongAnswer)) {
                        options.push(wrongAnswer);
                    }
                }
            }
            break;

        case 'which_more':
            const coin1 = MONEY_DATA.coins[getRandomInt(0, MONEY_DATA.coins.length - 1)];
            let coin2 = MONEY_DATA.coins[getRandomInt(0, MONEY_DATA.coins.length - 1)];
            while (coin2.value === coin1.value) {
                coin2 = MONEY_DATA.coins[getRandomInt(0, MONEY_DATA.coins.length - 1)];
            }

            questionBox.innerHTML = `
                <p>Which coin is worth MORE?</p>
                <div class="question-coins">
                    <div class="coin ${coin1.class}">${coin1.displayValue}</div>
                    <span style="font-size: 2rem; margin: 0 20px;">or</span>
                    <div class="coin ${coin2.class}">${coin2.displayValue}</div>
                </div>
            `;

            correctAnswer = coin1.value > coin2.value ? coin1.name : coin2.name;
            options = [coin1.name, coin2.name];
            break;

        case 'make_amount':
            const targetAmount = getRandomInt(1, 4) * 25;

            questionBox.innerHTML = `
                <p>Which coins make ${formatMoney(targetAmount)}?</p>
            `;

            // Generate correct combination
            const correctCombo = generateCoinCombo(targetAmount);
            correctAnswer = correctCombo;
            options = [correctAnswer];

            // Generate wrong combinations
            for (let i = 0; i < 3; i++) {
                const wrongAmount = targetAmount + (getRandomInt(-2, 2) * 5);
                if (wrongAmount > 0 && wrongAmount !== targetAmount) {
                    const wrongCombo = generateCoinCombo(wrongAmount);
                    if (!options.includes(wrongCombo)) {
                        options.push(wrongCombo);
                    }
                }
            }

            // Ensure we have 4 options
            while (options.length < 4) {
                const extraAmount = getRandomInt(1, 10) * 5;
                const extraCombo = generateCoinCombo(extraAmount);
                if (!options.includes(extraCombo)) {
                    options.push(extraCombo);
                }
            }
            break;
    }

    // Shuffle and display options
    options = shuffleArray(options);

    options.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = option;
        btn.addEventListener('click', () => checkMatchAnswer(option, correctAnswer, btn));
        optionsGrid.appendChild(btn);
    });
}

function generateCoinCombo(amount) {
    const parts = [];
    let remaining = amount;

    if (remaining >= 25) {
        const quarters = Math.floor(remaining / 25);
        parts.push(`${quarters}Q`);
        remaining %= 25;
    }
    if (remaining >= 10) {
        const dimes = Math.floor(remaining / 10);
        parts.push(`${dimes}D`);
        remaining %= 10;
    }
    if (remaining >= 5) {
        const nickels = Math.floor(remaining / 5);
        parts.push(`${nickels}N`);
        remaining %= 5;
    }
    if (remaining > 0) {
        parts.push(`${remaining}P`);
    }

    return parts.join(' + ') || '0';
}

function checkMatchAnswer(selected, correct, button) {
    const allButtons = document.querySelectorAll('.option-btn');
    allButtons.forEach(btn => btn.disabled = true);

    if (selected === correct) {
        playSound('correct');
        button.classList.add('correct');
        gameState.match.score += 10;
        document.getElementById('match-points').textContent = gameState.match.score;
    } else {
        playSound('incorrect');
        button.classList.add('incorrect');
        // Highlight correct answer
        allButtons.forEach(btn => {
            if (btn.textContent === correct) {
                btn.classList.add('correct');
            }
        });
    }

    gameState.match.questionCount++;

    // Check if should continue
    setTimeout(() => {
        if (gameState.match.mode === 'practice') {
            if (gameState.match.questionCount < 10) {
                generateMatchQuestion();
            } else {
                endMoneyMatch();
            }
        } else if (gameState.match.timer > 0) {
            generateMatchQuestion();
        }
    }, 1000);
}

function endMoneyMatch() {
    if (gameState.match.timerInterval) {
        clearInterval(gameState.match.timerInterval);
        gameState.match.timerInterval = null;
    }

    const score = gameState.match.score;
    const stars = Math.ceil(score / 30);

    playSound('celebration');
    showCelebration(`Score: ${score}`, Math.min(stars, 3));

    // Save high score
    if (gameState.match.mode === 'timed') {
        saveHighScore(score);
    }

    gameState.totalStars += Math.min(stars, 3);
    updateTotalStars();
    saveProgress();

    document.getElementById('match-start').classList.remove('hidden');
    document.getElementById('match-question').innerHTML = '<p>Press "Start Quiz" to play again!</p>';
    document.getElementById('match-options').innerHTML = '';
}

function setMatchMode(mode) {
    gameState.match.mode = mode;

    document.querySelectorAll('#match-difficulty .diff-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    if (mode === 'timed') {
        document.getElementById('leaderboard').classList.remove('hidden');
    } else {
        document.getElementById('leaderboard').classList.add('hidden');
    }
}

// ============================================
// Celebration & Feedback
// ============================================
function showCelebration(message, stars) {
    const overlay = document.getElementById('celebration-overlay');
    const messageEl = document.getElementById('celebration-message');
    const starsEl = document.getElementById('stars-earned');

    messageEl.textContent = message;
    starsEl.textContent = '⭐'.repeat(stars);

    // Create confetti
    createConfetti();

    overlay.classList.remove('hidden');
    playSound('celebration');
}

function hideCelebration() {
    document.getElementById('celebration-overlay').classList.add('hidden');
    document.getElementById('confetti-container').innerHTML = '';
}

function createConfetti() {
    const container = document.getElementById('confetti-container');
    container.innerHTML = '';

    const colors = ['#FFD700', '#FF69B4', '#4CAF50', '#2196F3', '#FF9800', '#9C27B0'];

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

function showFeedback(message, isSuccess) {
    const popup = document.getElementById('feedback-popup');
    const icon = document.getElementById('feedback-icon');
    const text = document.getElementById('feedback-text');

    popup.className = `popup ${isSuccess ? 'success' : 'error'}`;
    icon.textContent = isSuccess ? '✓' : '✗';
    text.textContent = message;

    popup.classList.remove('hidden');

    setTimeout(() => {
        popup.classList.add('hidden');
    }, 2000);
}

// ============================================
// Progress & Storage
// ============================================
function saveProgress() {
    const data = {
        totalStars: gameState.totalStars,
        shopStars: gameState.shop.starsEarned,
        highScores: gameState.match.highScores
    };
    localStorage.setItem('moneyMoneyProgress', JSON.stringify(data));
}

function loadProgress() {
    const data = localStorage.getItem('moneyMoneyProgress');
    if (data) {
        const parsed = JSON.parse(data);
        gameState.totalStars = parsed.totalStars || 0;
        gameState.shop.starsEarned = parsed.shopStars || 0;
        gameState.match.highScores = parsed.highScores || [];
        updateTotalStars();
    }
}

function updateTotalStars() {
    document.getElementById('total-stars').textContent = gameState.totalStars;
}

function saveHighScore(score) {
    gameState.match.highScores.push(score);
    gameState.match.highScores.sort((a, b) => b - a);
    gameState.match.highScores = gameState.match.highScores.slice(0, 5);
    saveProgress();
    loadHighScores();
}

function loadHighScores() {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';

    if (gameState.match.highScores.length === 0) {
        list.innerHTML = '<li>No scores yet!</li>';
        return;
    }

    gameState.match.highScores.forEach((score, index) => {
        const li = document.createElement('li');
        li.textContent = `${score} points`;
        list.appendChild(li);
    });
}

// ============================================
// Event Listeners
// ============================================
function initEventListeners() {
    // Home button
    document.getElementById('home-btn').addEventListener('click', () => {
        playSound('click');
        showScreen('main-menu');
    });

    // Sound toggle
    document.getElementById('sound-toggle').addEventListener('click', () => {
        gameState.soundEnabled = !gameState.soundEnabled;
        document.getElementById('sound-toggle').textContent = gameState.soundEnabled ? '🔊' : '🔇';
        if (gameState.soundEnabled) playSound('click');
    });

    // Menu buttons
    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            playSound('click');
            const mode = btn.dataset.mode;
            switch (mode) {
                case 'safari':
                    showScreen('safari-mode');
                    break;
                case 'piggybank':
                    showScreen('piggybank-mode');
                    break;
                case 'shopkeeper':
                    showScreen('shopkeeper-mode');
                    break;
                case 'moneymatch':
                    showScreen('moneymatch-mode');
                    break;
            }
        });
    });

    // Coin Safari - close card
    document.querySelector('.close-card-btn').addEventListener('click', closeCoinInfoCard);

    // Piggy Bank controls
    document.getElementById('piggy-reset').addEventListener('click', () => {
        playSound('click');
        resetPiggyBank();
        populatePiggyBankCoins();
    });

    document.getElementById('piggy-check').addEventListener('click', () => {
        checkPiggyBankAnswer();
    });

    // Piggy Bank difficulty
    document.querySelectorAll('#piggy-difficulty .diff-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            playSound('click');
            setPiggyBankLevel(parseInt(btn.dataset.level));
        });
    });

    // Shop Keeper controls
    document.getElementById('shop-reset').addEventListener('click', () => {
        playSound('click');
        resetShopChange();
    });

    document.getElementById('shop-check').addEventListener('click', () => {
        checkShopChange();
    });

    // Money Match controls
    document.getElementById('match-start').addEventListener('click', () => {
        playSound('click');
        startMoneyMatch();
    });

    // Money Match difficulty
    document.querySelectorAll('#match-difficulty .diff-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            playSound('click');
            setMatchMode(btn.dataset.mode);
        });
    });

    // Celebration continue
    document.getElementById('celebration-continue').addEventListener('click', () => {
        playSound('click');
        hideCelebration();
    });
}

// ============================================
// Initialize Game
// ============================================
function init() {
    loadProgress();
    initEventListeners();
    showScreen('main-menu');

    // Initialize audio on first user interaction
    document.addEventListener('click', () => {
        initAudio();
    }, { once: true });
}

// Start the game when DOM is ready
document.addEventListener('DOMContentLoaded', init);
