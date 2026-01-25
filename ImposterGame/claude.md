# Imposter Game - Implementation Plan

## Overview
A browser-based party game (similar to Among Us word game) implemented as a single HTML file with embedded JavaScript and CSS. Players pass a single device around, and each player sees either a secret word or an "imposter" message.

---

## Game Flow

### Phase 1: Configuration Screen
1. Display game title and "Configure New Game" button
2. Configuration options:
   - **Number of Players**: Input field (minimum 3, default 4)
   - **Number of Imposters**: Input field (minimum 1, must be less than total players)
   - **Word Selection Method** (radio buttons, mutually exclusive):
     - Option A: Manual entry - text input for the secret word
     - Option B: AI-generated - uses OpenAI API to generate a random word
   - **OpenAI Settings** (collapsible/expandable section):
     - API Key input field (password type)
     - "Save to Browser" button (stores in localStorage)
     - Status indicator showing if key is saved

### Phase 2: Game Initialization
1. On "Start Game" button click:
   - Validate all inputs (player count, imposter count, word availability)
   - If AI word generation selected, make API call to OpenAI
   - Randomly select which player numbers will be imposters
   - Store game state (word, player count, imposter indices)
   - Transition to passing phase

### Phase 3: Phone Passing Loop
1. **Handoff Screen** (shown to lead player first):
   - Display: "Pass the phone to Player #1"
   - Button: "Ready" (to prevent accidental reveals)

2. **Player Turn Screen** (for each player 1 through N):
   - Display: "Player #X - Your Turn"
   - Button: "Show My Word" (hidden content until clicked)
   - On click, reveal either:
     - The secret word (if not an imposter)
     - "YOU ARE THE IMPOSTER" message (if selected as imposter)
   - Button: "Hide and Pass to Next Player"
   - On hide: transition to next player's handoff screen

3. **Loop** until all players have seen their role

### Phase 4: Game Ready Screen
1. Display: "All players have received their roles!"
2. Display: "The game is ready - start discussing!"
3. Instructions reminder for gameplay
4. Button: "Start New Game" (returns to Configuration Screen)

---

## Technical Architecture

### HTML Structure
```
- Container div (centered, max-width for mobile)
  - Screen 1: Configuration
  - Screen 2: Handoff (pass phone prompt)
  - Screen 3: Player reveal (show word/imposter)
  - Screen 4: Game ready
- Only one screen visible at a time (CSS display toggle)
```

### CSS Styling
- Mobile-first responsive design
- Large touch-friendly buttons
- High contrast text for readability
- Distinct visual styling for:
  - Normal word reveal (friendly color scheme)
  - Imposter reveal (red/warning color scheme)
- Smooth transitions between screens
- Card-style containers with shadows

### JavaScript Components

#### State Management
```javascript
const gameState = {
  totalPlayers: 0,
  totalImposters: 0,
  secretWord: '',
  imposterIndices: [], // Array of player numbers who are imposters
  currentPlayer: 0,
  gamePhase: 'config' // 'config' | 'passing' | 'reveal' | 'ready'
};
```

#### Key Functions
1. `initGame()` - Reset state, show config screen
2. `validateConfig()` - Check all inputs are valid
3. `selectImposters(playerCount, imposterCount)` - Randomly pick imposter indices
4. `generateWordWithAI(apiKey)` - Call OpenAI API for random word
5. `startGame()` - Initialize game state and begin passing phase
6. `showHandoffScreen(playerNum)` - Display "pass to player X" message
7. `revealRole(playerNum)` - Show word or imposter message
8. `hideAndPass()` - Hide content and move to next player
9. `checkGameComplete()` - Determine if all players have gone
10. `showGameReady()` - Display final screen

#### localStorage Functions
1. `saveApiKey(key)` - Store OpenAI API key
2. `loadApiKey()` - Retrieve stored API key
3. `clearApiKey()` - Remove stored key

#### OpenAI Integration
```javascript
async function generateWord(apiKey) {
  // POST to https://api.openai.com/v1/chat/completions
  // System prompt: "Generate a single common noun for a word guessing game"
  // Return the generated word
}
```

---

## UI/UX Considerations

### Mobile Optimization
- Full viewport height screens
- Large, easily tappable buttons (min 48px height)
- Readable font sizes (16px minimum)
- Prevent zoom on double-tap

### Security/Privacy
- Word is only shown when button is explicitly clicked
- Clear visual separation between screens
- No accidental reveals during handoff

### Error Handling
- Show clear error messages for:
  - Invalid player/imposter counts
  - Missing word input
  - OpenAI API failures
  - Network errors

### Accessibility
- High contrast colors
- Large tap targets
- Clear visual hierarchy
- Screen reader friendly labels

---

## File Structure
Single file: `imposter-game.html`
- `<style>` block with all CSS
- `<body>` with HTML structure
- `<script>` block with all JavaScript

---

## Implementation Checklist

- [x] Create HTML skeleton with all screen containers
- [x] Implement CSS styling (mobile-first)
- [x] Build configuration screen with all inputs
- [x] Implement localStorage for API key persistence
- [x] Create imposter selection randomization logic
- [x] Build phone passing flow screens
- [x] Implement reveal/hide functionality
- [x] Add OpenAI API integration for word generation
- [x] Create game completion screen
- [x] Add input validation and error handling
- [x] Test on mobile devices
- [x] Add transitions and polish

---

## Testing Scenarios

1. **Minimum game**: 3 players, 1 imposter
2. **Large game**: 10 players, 3 imposters
3. **Manual word entry**: Verify word displays correctly
4. **AI word generation**: Test with valid/invalid API keys
5. **Edge cases**: Imposter count = players - 1
6. **Restart flow**: Complete game and start new one
