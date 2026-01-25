# Poker Split - Implementation Plan

## Overview
A browser-based utility for managing poker game settlements. The app helps dealers track buy-ins throughout a game and calculate final settlements between players.

## Features

### 1. Game Setup Phase
- Input field for number of players (2-10)
- Dynamic form to enter player names
- Input field for buy-in amount (currency value)
- "Start Game" button to initialize the game

### 2. Game In-Progress Phase
- Display a table showing:
  - Player name
  - Number of buy-ins
  - Total invested (buy-ins × buy-in amount)
  - "Add Buy-in" button per player
- Running total of pot size at the bottom
- "End Game" button to proceed to settlement

### 3. Game End / Settlement Phase
- Input field for each player to enter their final chip count (wins)
- Validation: total wins must equal total pot
- "Calculate Settlement" button

### 4. Settlement Results
- Display settlement table showing:
  - Each player's total invested
  - Each player's final amount (wins)
  - Net result (profit/loss)
- Payment instructions table showing:
  - Who pays whom
  - Amount to transfer
- Algorithm: Match players who owe money with players who are owed, minimizing number of transactions

## Technical Structure

### HTML Structure
```
- Header with app title
- Setup Section (initially visible)
  - Player count input
  - Player names form (dynamic)
  - Buy-in amount input
  - Start Game button
- Game Section (hidden until game starts)
  - Players table with buy-in tracking
  - Add buy-in buttons
  - Pot total display
  - End Game button
- Settlement Section (hidden until game ends)
  - Wins input form
  - Calculate button
- Results Section (hidden until calculated)
  - Summary table
  - Payment instructions table
  - New Game button
```

### CSS Styling
- Clean, card-table themed design (green felt aesthetic)
- Responsive layout for mobile/tablet use at poker table
- Clear visual hierarchy between sections
- Button states (hover, active, disabled)
- Table styling with alternating row colors
- Input validation visual feedback

### JavaScript Logic

#### State Management
```javascript
gameState = {
  buyInAmount: 0,
  players: [
    { name: string, buyIns: number, wins: number }
  ],
  phase: 'setup' | 'playing' | 'settlement' | 'complete'
}
```

#### Key Functions
1. `initializeGame()` - Create player objects with 1 buy-in each
2. `addBuyIn(playerIndex)` - Increment player's buy-in count
3. `calculatePot()` - Sum of all buy-ins × buy-in amount
4. `validateWins()` - Ensure total wins equals pot
5. `calculateSettlements()` - Determine who pays whom
6. `resetGame()` - Return to setup phase

#### Settlement Algorithm
1. Calculate net for each player: `net = wins - (buyIns × buyInAmount)`
2. Separate players into debtors (net < 0) and creditors (net > 0)
3. Sort debtors by amount owed (descending)
4. Sort creditors by amount owed (descending)
5. Match payments to minimize transactions:
   - Take largest debtor and largest creditor
   - Transfer min(debt, credit)
   - Update remaining amounts
   - Repeat until all settled

## User Flow
1. Dealer opens app
2. Enters number of players → player name fields appear
3. Enters all player names and buy-in amount
4. Clicks "Start Game" → game table appears with 1 buy-in each
5. During game, clicks "Add Buy-in" as players rebuy
6. Clicks "End Game" → wins input fields appear
7. Enters final amounts for each player
8. Clicks "Calculate" → settlement instructions displayed
9. Players settle up using the payment table
10. Dealer clicks "New Game" to start fresh

## Validation Rules
- Minimum 2 players, maximum 10 players
- Player names cannot be empty
- Buy-in amount must be positive number
- Wins must be non-negative numbers
- Total wins must equal total pot (with small tolerance for rounding)

## Edge Cases to Handle
- Single large debtor paying multiple creditors
- Single large creditor receiving from multiple debtors
- Player breaks even (no payment needed)
- All players have same result (shouldn't happen but handle gracefully)
- Decimal amounts in buy-ins and wins
