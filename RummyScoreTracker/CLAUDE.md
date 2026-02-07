# Rummy Score Tracker

A web-based score tracking application for Rummy card games. Track player scores across multiple rounds, manage eliminations, and determine the winner.

## Features

### Game Configuration
- **Drop Count** (default: 25) - Points for early drop
- **Middle Drop Count** (default: 40) - Points for mid-game drop
- **Full Count** (default: 80) - Points for losing without valid declaration
- **Game Count** (default: 101) - Elimination threshold

### Score Tracking
- Dynamic player management (add players during game)
- Remove only eliminated players (prevents accidental removal)
- Add rounds as game progresses
- Score entry options per player per round:
  - Winner (0 points) - only one winner per round allowed
  - Drop (configurable)
  - Middle Drop (configurable)
  - Full (configurable)
  - Custom points (manual entry)
- Auto-calculated totals
- Player status: "Active" or "Out" (eliminated when total >= game count)
- Visual distinction for eliminated players (greyed out rows)

### Undo Functionality
- Undo button to reverse last action
- Keyboard shortcut: Ctrl+Z (Cmd+Z on Mac)
- Stores up to 20 previous states
- Supports undoing: score entries, round additions, player removals
- Properly restores player status (can un-eliminate a player)

### Round Validation
- Cannot add new round until all active players have scores
- Shows which players are missing scores
- Eliminated players don't need scores for subsequent rounds

### Winner Celebration
- Triggers when only 1 active player remains
- Shows winner name with trophy animation
- Displays final standings sorted by score
- Confetti animation
- "Play Again" keeps same players, resets scores
- "New Game" returns to config screen

### Data Persistence
- All data saved to localStorage
- Survives browser refresh
- Stores: config, players, scores, current screen

## File Structure

```
RummyScoreTracker/
├── index.html    # Main HTML structure
├── styles.css    # All styling (responsive)
├── app.js        # Game logic and state management
└── CLAUDE.md     # This file
```

## Technical Details

### State Structure (app.js)
```javascript
gameState = {
  config: {
    dropCount: 25,
    middleDropCount: 40,
    fullCount: 80,
    gameCount: 101
  },
  players: [
    { id, name, scores: [], total: 0, status: 'active'|'eliminated' }
  ],
  currentRound: 0,
  currentScreen: 'config' | 'tracker'
}
```

### Key Functions
- `saveState()` / `loadState()` - localStorage persistence
- `saveToUndoHistory()` / `undo()` - Undo functionality
- `addPlayer()` / `removePlayer()` - Player management
- `addRound()` - Add new round (with validation)
- `setScore()` - Record score (validates single winner per round)
- `calculateTotals()` - Update totals and elimination status
- `renderTable()` - Re-render the score table
- `checkGameOver()` - Check for winner
- `playAgain()` - Reset scores, keep players
- `resetGame()` - Full reset to config screen

### CSS Color Scheme
```css
--primary-green: #4CAF50;   /* Active status, Winner scores */
--primary-red: #f44336;     /* Eliminated status, Full scores */
--primary-blue: #2196F3;    /* Undo button */
--primary-orange: #FF9800;  /* Drop scores */
```

### Responsive Design
- Mobile-friendly with horizontal scroll for score table
- Stacked layouts on smaller screens
- Touch-friendly buttons and inputs

## Game Rules Enforced

1. **Single Winner Per Round**: Only one player can have 0 points in a round
2. **Elimination**: Player is "Out" when total >= game count
3. **Round Completion**: All active players must have scores before new round
4. **Remove Restriction**: Only eliminated players can be removed
5. **Game Over**: When only 1 active player remains, they win

## Browser Compatibility

Works in modern browsers with:
- localStorage support
- CSS Grid and Flexbox
- ES6 JavaScript
