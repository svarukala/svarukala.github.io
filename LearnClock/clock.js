// Game state
let currentMode = 'easy';
let currentTime = { hours: 0, minutes: 0 };
let correctAnswer = '';
let score = { correct: 0, total: 0 };
let answered = false;
let use24Hour = false;

// DOM elements
const canvas = document.getElementById('clock');
const ctx = canvas.getContext('2d');
const modeButtons = document.querySelectorAll('.mode-btn');
const answerButtons = document.querySelectorAll('.answer-btn');
const nextButton = document.getElementById('next-btn');
const correctDisplay = document.getElementById('correct');
const totalDisplay = document.getElementById('total');

// Initialize
function init() {
    setupEventListeners();
    generateNewQuestion();
}

function setupEventListeners() {
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            resetScore();
            generateNewQuestion();
        });
    });

    answerButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!answered) {
                checkAnswer(btn);
            }
        });
    });

    nextButton.addEventListener('click', generateNewQuestion);
}

function resetScore() {
    score = { correct: 0, total: 0 };
    updateScoreDisplay();
}

function updateScoreDisplay() {
    correctDisplay.textContent = score.correct;
    totalDisplay.textContent = score.total;
}

// Time generation based on difficulty
function generateTime(mode) {
    let hours, minutes;

    if (mode === 'easy' || mode === 'medium') {
        // 12-hour format, 5-minute intervals
        hours = Math.floor(Math.random() * 12) + 1;
        minutes = Math.floor(Math.random() * 12) * 5;
        use24Hour = false;
    } else {
        // Hard mode: any minute, possibly 24-hour
        hours = Math.floor(Math.random() * 12) + 1;
        minutes = Math.floor(Math.random() * 60);
        use24Hour = Math.random() > 0.5;
    }

    return { hours, minutes };
}

// Format time string
function formatTime(hours, minutes, is24Hour = false) {
    let displayHours = hours;
    let suffix = '';

    if (is24Hour) {
        // Convert to 24-hour format randomly (AM or PM)
        const isPM = Math.random() > 0.5;
        if (isPM && hours !== 12) {
            displayHours = hours + 12;
        } else if (!isPM && hours === 12) {
            displayHours = 0;
        }
        return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } else {
        return `${hours}:${minutes.toString().padStart(2, '0')}`;
    }
}

// Generate wrong answers that are close to correct
function generateChoices(correctTime, mode) {
    const choices = [];
    const is24Hour = mode === 'hard' && use24Hour;

    // Format correct answer
    correctAnswer = formatTime(correctTime.hours, correctTime.minutes, is24Hour);
    choices.push(correctAnswer);

    // Generate 3 wrong answers
    while (choices.length < 4) {
        let wrongHours = correctTime.hours;
        let wrongMinutes = correctTime.minutes;

        // Randomly modify hours or minutes
        const modifyType = Math.random();

        if (modifyType < 0.4) {
            // Modify hours
            const hourDelta = Math.random() > 0.5 ? 1 : -1;
            wrongHours = correctTime.hours + hourDelta;
            if (wrongHours > 12) wrongHours = 1;
            if (wrongHours < 1) wrongHours = 12;
        } else if (modifyType < 0.8) {
            // Modify minutes
            if (mode === 'easy' || mode === 'medium') {
                // 5-minute intervals
                const minuteDelta = (Math.random() > 0.5 ? 1 : -1) * 5 * (Math.floor(Math.random() * 3) + 1);
                wrongMinutes = (correctTime.minutes + minuteDelta + 60) % 60;
            } else {
                // Any minute
                const minuteDelta = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 15) + 5);
                wrongMinutes = (correctTime.minutes + minuteDelta + 60) % 60;
            }
        } else {
            // Modify both
            const hourDelta = Math.random() > 0.5 ? 1 : -1;
            wrongHours = correctTime.hours + hourDelta;
            if (wrongHours > 12) wrongHours = 1;
            if (wrongHours < 1) wrongHours = 12;

            if (mode === 'easy' || mode === 'medium') {
                const minuteDelta = (Math.random() > 0.5 ? 1 : -1) * 5;
                wrongMinutes = (correctTime.minutes + minuteDelta + 60) % 60;
            } else {
                const minuteDelta = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 10) + 5);
                wrongMinutes = (correctTime.minutes + minuteDelta + 60) % 60;
            }
        }

        const wrongAnswer = formatTime(wrongHours, wrongMinutes, is24Hour);

        // Ensure unique answers
        if (!choices.includes(wrongAnswer)) {
            choices.push(wrongAnswer);
        }
    }

    // Shuffle choices
    return shuffleArray(choices);
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Generate new question
function generateNewQuestion() {
    answered = false;
    nextButton.disabled = true;

    // Reset answer button styles
    answerButtons.forEach(btn => {
        btn.classList.remove('correct', 'incorrect');
        btn.disabled = false;
    });

    // Generate new time
    currentTime = generateTime(currentMode);

    // Generate choices
    const choices = generateChoices(currentTime, currentMode);

    // Update answer buttons
    answerButtons.forEach((btn, index) => {
        btn.textContent = choices[index];
    });

    // Draw clock
    drawClock(currentTime, currentMode);
}

// Check answer
function checkAnswer(selectedButton) {
    answered = true;
    score.total++;

    const selectedAnswer = selectedButton.textContent;

    if (selectedAnswer === correctAnswer) {
        selectedButton.classList.add('correct');
        score.correct++;
    } else {
        selectedButton.classList.add('incorrect');
        // Show correct answer
        answerButtons.forEach(btn => {
            if (btn.textContent === correctAnswer) {
                btn.classList.add('correct');
            }
        });
    }

    // Disable all buttons
    answerButtons.forEach(btn => btn.disabled = true);
    nextButton.disabled = false;
    updateScoreDisplay();
}

// Clock drawing functions
function drawClock(time, mode) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw clock face
    drawClockFace(centerX, centerY, radius);

    // Draw numbers based on mode
    drawNumbers(centerX, centerY, radius, mode);

    // Draw tick marks
    drawTickMarks(centerX, centerY, radius, mode);

    // Draw hands
    drawHands(centerX, centerY, radius, time);

    // Draw center dot
    drawCenterDot(centerX, centerY);
}

function drawClockFace(cx, cy, radius) {
    // Outer circle
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Inner circle (decorative)
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 10, 0, 2 * Math.PI);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawNumbers(cx, cy, radius, mode) {
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#334155';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let numbersToShow = [];

    if (mode === 'easy') {
        // Show all numbers
        numbersToShow = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    } else if (mode === 'medium') {
        // Show only 12, 3, 6, 9
        numbersToShow = [12, 3, 6, 9];
    } else {
        // Hard mode: randomly show none or 12, 3, 6, 9
        if (Math.random() > 0.5) {
            numbersToShow = [12, 3, 6, 9];
        }
        // else show no numbers
    }

    numbersToShow.forEach(num => {
        const angle = (num - 3) * (Math.PI / 6);
        const x = cx + Math.cos(angle) * (radius - 35);
        const y = cy + Math.sin(angle) * (radius - 35);
        ctx.fillText(num.toString(), x, y);
    });
}

function drawTickMarks(cx, cy, radius, mode) {
    for (let i = 0; i < 60; i++) {
        const angle = (i - 15) * (Math.PI / 30);
        const isHourMark = i % 5 === 0;

        const innerRadius = isHourMark ? radius - 20 : radius - 15;
        const outerRadius = radius - 8;

        const x1 = cx + Math.cos(angle) * innerRadius;
        const y1 = cy + Math.sin(angle) * innerRadius;
        const x2 = cx + Math.cos(angle) * outerRadius;
        const y2 = cy + Math.sin(angle) * outerRadius;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = isHourMark ? '#334155' : '#94a3b8';
        ctx.lineWidth = isHourMark ? 3 : 1;
        ctx.stroke();
    }
}

function drawHands(cx, cy, radius, time) {
    const { hours, minutes } = time;

    // Calculate angles
    // Minute hand: 360 degrees / 60 minutes = 6 degrees per minute
    const minuteAngle = (minutes - 15) * (Math.PI / 30);

    // Hour hand: 360 degrees / 12 hours = 30 degrees per hour
    // Plus adjustment for minutes (30 degrees / 60 minutes = 0.5 degrees per minute)
    const hourAngle = ((hours % 12) - 3 + minutes / 60) * (Math.PI / 6);

    // Draw hour hand (shorter, thicker)
    drawHand(cx, cy, hourAngle, radius * 0.5, 8, '#334155');

    // Draw minute hand (longer, thinner)
    drawHand(cx, cy, minuteAngle, radius * 0.75, 5, '#667eea');
}

function drawHand(cx, cy, angle, length, width, color) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
        cx + Math.cos(angle) * length,
        cy + Math.sin(angle) * length
    );
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
}

function drawCenterDot(cx, cy) {
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#334155';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#667eea';
    ctx.fill();
}

// Start the app
init();
