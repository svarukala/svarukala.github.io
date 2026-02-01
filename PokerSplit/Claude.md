# Poker Split - Implementation Plan

## Overview
A browser-based utility for managing poker game settlements. The app helps dealers track buy-ins throughout a game and calculate final settlements between players.

---

# Phase 1: Original Single-File Implementation (COMPLETED)

## Features
- Game setup with player count, names, and buy-in amount
- Track buy-ins during game
- Add players mid-game
- Settlement calculation
- Payment instructions
- localStorage persistence
- Restored game banner with dismiss functionality

---

# Phase 2: Supabase Backend + Vercel Deployment Plan

## Overview
Convert the app to use Supabase as backend database with unique game codes for sharing. Dealers can edit games, players can only view. Deploy to Vercel.

## Architecture

### Tech Stack
- **Frontend**: HTML/CSS/JavaScript (keep simple, no framework)
- **Backend**: Supabase (PostgreSQL + Real-time subscriptions)
- **Hosting**: Vercel (static site with serverless functions if needed)
- **Local Development**: Vite dev server + Supabase local/cloud

### Project Structure
```
PokerSplit/
├── index.html          # Main app entry point
├── css/
│   └── styles.css      # Extracted styles
├── js/
│   ├── app.js          # Main application logic
│   ├── supabase.js     # Supabase client & API calls
│   ├── ui.js           # UI rendering functions
│   └── utils.js        # Helper functions
├── api/                # Vercel serverless functions (optional)
│   └── create-game.js  # Server-side game creation
├── package.json        # Dependencies
├── vercel.json         # Vercel configuration
├── .env.local          # Local environment variables
├── .env.example        # Example env file for reference
└── Claude.md           # This plan file
```

## Database Schema (Supabase)

### Tables

#### `games`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| game_code | varchar(6) | Unique 6-character code (e.g., "ABC123") |
| dealer_token | uuid | Secret token for dealer edit access |
| buy_in_amount | decimal | Amount per buy-in |
| phase | varchar(20) | 'setup', 'playing', 'settlement', 'complete' |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

#### `players`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| game_id | uuid | Foreign key to games |
| name | varchar(100) | Player name |
| buy_ins | integer | Number of buy-ins |
| wins | decimal | Final amount (nullable until settlement) |
| position | integer | Order in the list |
| created_at | timestamp | Creation time |

#### `settlements` (optional, for history)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| game_id | uuid | Foreign key to games |
| from_player | varchar(100) | Payer name |
| to_player | varchar(100) | Receiver name |
| amount | decimal | Payment amount |

### Row Level Security (RLS) Policies
- **Games**: Anyone can read by game_code, only dealer_token holder can update
- **Players**: Anyone can read by game_id, only dealer_token holder can insert/update/delete

---

## Implementation Phases

### Phase 2A: Project Setup & Supabase Configuration
**Goal**: Set up project structure and Supabase database

**Tasks**:
1. Create Supabase project (cloud or local)
2. Set up database tables with schema above
3. Configure Row Level Security policies
4. Create `.env.local` with Supabase credentials
5. Set up project structure (separate files)
6. Install dependencies (Supabase JS client)
7. Create basic `supabase.js` with client initialization
8. Test database connection locally

**Deliverables**:
- Working Supabase database with tables
- Project structure set up
- Supabase client connecting successfully

---

### Phase 2B: Dealer Flow - Create & Edit Games
**Goal**: Dealer can create games with unique codes and edit them

**Tasks**:
1. Generate unique 6-character game codes
2. Generate dealer tokens for edit access
3. Store dealer token in localStorage (per game)
4. Create game in Supabase on "Start Game"
5. Display game code prominently to dealer
6. Add "Share Game" button with copy link functionality
7. Update game data in Supabase on:
   - Add/remove buy-in
   - Add player
   - End game (phase change)
   - Enter wins
   - Calculate settlement
8. Show dealer-only controls when dealer token matches

**URL Structure**:
- Dealer view: `/?game=ABC123` (with dealer_token in localStorage)
- Player view: `/?game=ABC123` (no dealer_token)

**Deliverables**:
- Dealer can create game and see unique code
- Game data persists in Supabase
- Share link functionality works

---

### Phase 2C: Player Flow - View-Only Access
**Goal**: Players can view game by entering code or using shared link

**Tasks**:
1. Add "Join Game" option on home screen
2. Input field for game code entry
3. Fetch game data by code from Supabase
4. Display game in read-only mode:
   - Hide all edit buttons
   - Hide add player form
   - Hide wins input fields (until settlement)
   - Show settlement results when complete
5. Handle invalid/expired game codes gracefully
6. Parse game code from URL query parameter

**UI Changes**:
- Home screen with two options: "New Game (Dealer)" / "Join Game (Player)"
- Read-only mode styling (subtle visual difference)
- "Viewing as Player" indicator

**Deliverables**:
- Players can join via code or link
- Read-only view works correctly
- Clear visual distinction between dealer/player modes

---

### Phase 2D: Real-time Updates
**Goal**: Players see live updates as dealer makes changes

**Tasks**:
1. Set up Supabase real-time subscriptions
2. Subscribe to game changes on join
3. Subscribe to player changes (add/remove/update)
4. Update UI automatically when data changes
5. Handle connection drops gracefully
6. Show "Live" indicator when connected
7. Unsubscribe on page leave

**Deliverables**:
- Players see dealer updates in real-time
- Connection status indicator
- Graceful reconnection handling

---

### Phase 2E: Local Development & Testing
**Goal**: Ensure smooth local development experience

**Tasks**:
1. Set up Vite or similar for local dev server
2. Configure environment variables for local/prod
3. Test all flows locally:
   - Dealer creates game
   - Player joins via code
   - Player joins via link
   - Real-time updates work
   - Settlement calculation works
4. Add error handling for network issues
5. Fallback to localStorage if offline (optional)

**Deliverables**:
- `npm run dev` starts local server
- All features work locally
- Clear error messages for issues

---

### Phase 2F: Vercel Deployment
**Goal**: Deploy app to Vercel

**Tasks**:
1. Create `vercel.json` configuration
2. Set up Vercel project
3. Configure environment variables in Vercel dashboard
4. Set up automatic deployments from git (optional)
5. Configure custom domain (optional)
6. Test production deployment:
   - Create game
   - Share link
   - Join as player
   - Real-time updates
7. Set up Supabase production project (if using local for dev)

**Deliverables**:
- App deployed to Vercel
- Production URL works
- Environment variables configured

---

### Phase 2G: Polish & Enhancements
**Goal**: Final polish and nice-to-have features

**Tasks**:
1. Add loading states for all async operations
2. Add error toasts/notifications
3. Improve mobile responsiveness
4. Add "Copy Link" with visual feedback
5. Add QR code for game link (optional)
6. Add game expiration (auto-delete after 24h)
7. Rate limiting on game creation (optional)
8. Analytics/logging (optional)

**Deliverables**:
- Polished user experience
- Production-ready app

---

## User Flows (Updated)

### Dealer Flow
1. Opens app → sees "New Game" and "Join Game" options
2. Clicks "New Game"
3. Fills in player count, names, buy-in amount
4. Clicks "Start Game"
5. **NEW**: Sees unique game code (e.g., "ABC123") prominently displayed
6. **NEW**: Can click "Share Link" to copy `https://app.com/?game=ABC123`
7. Continues as before: add buy-ins, add players, end game, settlement
8. All changes sync to Supabase in real-time

### Player Flow
1. Opens app → sees "New Game" and "Join Game" options
2. **Option A**: Clicks "Join Game", enters code "ABC123"
3. **Option B**: Opens shared link `https://app.com/?game=ABC123`
4. Sees game in read-only mode
5. Sees live updates as dealer makes changes
6. Can view settlement results when game ends

---

## Security Considerations

1. **Dealer Token**:
   - Generated server-side or with crypto API
   - Stored only in dealer's localStorage
   - Required for all write operations
   - Never exposed in URLs or to other users

2. **Game Code**:
   - Short, memorable, case-insensitive
   - Collision-resistant (6 chars = 2B+ combinations)
   - Can be regenerated if needed

3. **Row Level Security**:
   - All write operations require valid dealer_token
   - Read operations only require valid game_code
   - No direct database access from client

4. **Data Privacy**:
   - No user accounts required
   - Games auto-expire after 24 hours (optional)
   - No sensitive data stored

---

## Environment Variables

```env
# .env.local (local development)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxx...

# Vercel Environment Variables (production)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxx...
```

---

## Commands Reference

```bash
# Local development
npm install          # Install dependencies
npm run dev          # Start local dev server

# Production build
npm run build        # Build for production
npm run preview      # Preview production build locally

# Deployment
vercel               # Deploy to Vercel (CLI)
vercel --prod        # Deploy to production
```

---

## Original Single-File Features Reference

### Features (Phase 1 - Completed)
- Game setup with player count, names, buy-in amount
- Track buy-ins during game with add/remove buttons
- Add players mid-game
- Settlement calculation with validation
- Payment instructions (minimized transactions)
- localStorage persistence
- Restored game banner
- Responsive design

### Settlement Algorithm
1. Calculate net for each player: `net = wins - (buyIns × buyInAmount)`
2. Separate players into debtors (net < 0) and creditors (net > 0)
3. Sort by amount (descending)
4. Match payments to minimize transactions
