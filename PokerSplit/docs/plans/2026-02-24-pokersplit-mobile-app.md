# PokerSplit Mobile App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a native iOS + Android Expo app for PokerSplit that shares the existing Supabase backend at pokersplit.org.

**Architecture:** Standalone Expo (managed workflow) project at `c:\sridev\PokerSplit` using TypeScript, expo-router for file-based navigation, and Zustand for state. The core business logic (settlement math, Supabase API calls) lives in `src/core/` and is a direct port of the web app's `js/utils.js` and `js/supabase.js`. The same Supabase project is shared — no schema changes required.

**Tech Stack:** Expo SDK 52, expo-router v4, TypeScript, Zustand, @supabase/supabase-js, @react-native-async-storage/async-storage, @gorhom/bottom-sheet, react-native-qrcode-svg, expo-clipboard, EAS Build + EAS Submit

---

## Reference Files (web app source at `C:/Users/svarukal/source/repos/LearningGames/PokerSplit/`)

- `js/utils.js` — source for `src/core/formatting.ts` and `src/core/settlement.ts`
- `js/supabase.js` — source for `src/core/supabaseApi.ts` (change `VITE_` → `EXPO_PUBLIC_`, remove `window.location.href`)
- `supabase-schema.sql` — shared backend schema (read-only reference)
- `js/app.js` — spec for all screen behaviors and appState shape

---

## Environment Setup Notes

The `.env.local` from the web app has the Supabase credentials. In the mobile project these become:
```
EXPO_PUBLIC_SUPABASE_URL=<same value as VITE_SUPABASE_URL>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<same value as VITE_SUPABASE_ANON_KEY>
```

---

### Task 1: Initialize Project

**Files:**
- Create: `c:/sridev/PokerSplit/` (directory)

**Step 1: Create project directory and initialize Expo**

```bash
mkdir -p c:/sridev/PokerSplit
cd c:/sridev/PokerSplit
npx create-expo-app@latest . --template blank-typescript
```

Expected output: Expo project scaffolded with TypeScript template.

**Step 2: Install dependencies**

```bash
cd c:/sridev/PokerSplit
npx expo install expo-router @supabase/supabase-js @react-native-async-storage/async-storage zustand expo-clipboard react-native-qrcode-svg @gorhom/bottom-sheet react-native-gesture-handler react-native-reanimated react-native-safe-area-context react-native-screens
```

**Step 3: Verify installation**

```bash
cd c:/sridev/PokerSplit
npx expo start --clear
```
Expected: Metro bundler starts, no errors.

**Step 4: Commit**

```bash
cd c:/sridev/PokerSplit
git init
git add .
git commit -m "feat: initialize Expo TypeScript project with dependencies"
```

---

### Task 2: Configure Project (app.json, tsconfig, babel)

**Files:**
- Modify: `c:/sridev/PokerSplit/app.json`
- Modify: `c:/sridev/PokerSplit/tsconfig.json`
- Modify: `c:/sridev/PokerSplit/babel.config.js`
- Create: `c:/sridev/PokerSplit/package.json` (update main entry)

**Step 1: Update app.json**

Replace `app.json` content with:

```json
{
  "expo": {
    "name": "PokerSplit",
    "slug": "pokersplit",
    "scheme": "pokersplit",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1a1a2e"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.pokersplit.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#1a1a2e"
      },
      "package": "com.pokersplit.app"
    },
    "plugins": [
      "expo-router",
      [
        "@react-native-async-storage/async-storage",
        {
          "exclude": []
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

**Step 2: Update package.json main entry**

In `package.json`, set:
```json
{
  "main": "expo-router/entry"
}
```

**Step 3: Update babel.config.js**

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

**Step 4: Update tsconfig.json**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.d.ts", "expo-env.d.ts"]
}
```

**Step 5: Commit**

```bash
cd c:/sridev/PokerSplit
git add .
git commit -m "feat: configure expo-router, dark theme, deep link scheme"
```

---

### Task 3: TypeScript Types

**Files:**
- Create: `c:/sridev/PokerSplit/src/core/types.ts`

**Step 1: Create types**

```typescript
// src/core/types.ts

export type GamePhase = 'playing' | 'settlement' | 'complete';

export interface Game {
  id: string;
  game_code: string;
  dealer_token: string;
  buy_in_amount: number;
  phase: GamePhase;
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  game_id: string;
  name: string;
  buy_ins: number;
  wins: number | null;
  cashed_out: boolean;
  position: number;
  created_at: string;
}

export interface Payment {
  from: string;
  to: string;
  amount: number;
}

export interface PlayerResult {
  name: string;
  invested: number;
  wins: number;
  net: number;
}

export interface SettlementResult {
  results: PlayerResult[];
  payments: Payment[];
}
```

**Step 2: Commit**

```bash
cd c:/sridev/PokerSplit
git add src/core/types.ts
git commit -m "feat: add core TypeScript types"
```

---

### Task 4: Core Formatting Utilities

**Files:**
- Create: `c:/sridev/PokerSplit/src/core/formatting.ts`

**Step 1: Port pure functions from web's `js/utils.js`**

```typescript
// src/core/formatting.ts

/**
 * Format a number as currency string
 */
export function formatCurrency(amount: number | null | undefined): string {
  return '$' + (amount || 0).toFixed(2);
}

/**
 * Generate a unique 6-character game code
 * Avoids confusing characters: 0, O, 1, I
 */
export function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
```

**Step 2: Commit**

```bash
cd c:/sridev/PokerSplit
git add src/core/formatting.ts
git commit -m "feat: add formatting utilities (formatCurrency, generateGameCode)"
```

---

### Task 5: Settlement Calculation Logic

**Files:**
- Create: `c:/sridev/PokerSplit/src/core/settlement.ts`

**Step 1: Port from web's `js/utils.js`**

```typescript
// src/core/settlement.ts

import type { Player, Payment, PlayerResult, SettlementResult } from './types';

export function calculatePot(players: Player[], buyInAmount: number): number {
  return players.reduce((sum, player) => sum + player.buy_ins * buyInAmount, 0);
}

export function calculateSettlements(
  players: Player[],
  buyInAmount: number
): SettlementResult {
  const results: PlayerResult[] = players.map((player) => ({
    name: player.name,
    invested: player.buy_ins * buyInAmount,
    wins: player.wins ?? 0,
    net: (player.wins ?? 0) - player.buy_ins * buyInAmount,
  }));

  let debtors = results
    .filter((r) => r.net < 0)
    .map((r) => ({ name: r.name, amount: Math.abs(r.net) }));

  let creditors = results
    .filter((r) => r.net > 0)
    .map((r) => ({ name: r.name, amount: r.net }));

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const payments: Payment[] = [];

  while (debtors.length > 0 && creditors.length > 0) {
    const debtor = debtors[0];
    const creditor = creditors[0];
    const payment = Math.min(debtor.amount, creditor.amount);

    if (payment > 0.01) {
      payments.push({ from: debtor.name, to: creditor.name, amount: payment });
    }

    debtor.amount -= payment;
    creditor.amount -= payment;

    if (debtor.amount < 0.01) debtors.shift();
    if (creditor.amount < 0.01) creditors.shift();
  }

  return { results, payments };
}
```

**Step 2: Commit**

```bash
cd c:/sridev/PokerSplit
git add src/core/settlement.ts
git commit -m "feat: add settlement calculation logic"
```

---

### Task 6: Supabase API Layer

**Files:**
- Create: `c:/sridev/PokerSplit/src/core/supabaseApi.ts`
- Create: `c:/sridev/PokerSplit/.env` (not committed)
- Create: `c:/sridev/PokerSplit/.env.example`

**Step 1: Create .env (copy values from web app's .env.local)**

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx...
```

**Step 2: Create .env.example**

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Step 3: Create .gitignore**

```
node_modules/
.expo/
dist/
npm-debug.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*
web-build/
.env
.env.local
```

**Step 4: Create supabaseApi.ts — port from web's `js/supabase.js`**

Key change: `import.meta.env.VITE_*` → `process.env.EXPO_PUBLIC_*`. Remove `window.location.href` from feedback (pass `undefined`).

```typescript
// src/core/supabaseApi.ts

import { createClient } from '@supabase/supabase-js';
import type { Game, Player } from './types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Game operations ──────────────────────────────────────────────────────────

function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createGame(
  buyInAmount: number,
  playerNames: string[]
): Promise<{ game: Game | null; dealerToken: string | null; error: unknown }> {
  const gameCode = generateGameCode();

  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({ game_code: gameCode, buy_in_amount: buyInAmount, phase: 'playing' })
    .select()
    .single();

  if (gameError) return { game: null, dealerToken: null, error: gameError };

  const playerRecords = playerNames.map((name, index) => ({
    game_id: game.id,
    name,
    buy_ins: 1,
    position: index,
  }));

  const { error: playersError } = await supabase.from('players').insert(playerRecords);

  if (playersError) {
    await supabase.from('games').delete().eq('id', game.id);
    return { game: null, dealerToken: null, error: playersError };
  }

  return { game: game as Game, dealerToken: game.dealer_token, error: null };
}

export async function fetchGameByCode(
  gameCode: string
): Promise<{ game: Game | null; players: Player[] | null; error: unknown }> {
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('*')
    .eq('game_code', gameCode.toUpperCase())
    .single();

  if (gameError) return { game: null, players: null, error: gameError };

  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('*')
    .eq('game_id', game.id)
    .order('position');

  if (playersError) return { game: game as Game, players: null, error: playersError };

  return { game: game as Game, players: players as Player[], error: null };
}

export async function updateGamePhase(
  gameId: string,
  phase: string
): Promise<{ error: unknown }> {
  const { error } = await supabase.from('games').update({ phase }).eq('id', gameId);
  return { error };
}

// ── Player operations ────────────────────────────────────────────────────────

export async function addPlayer(
  gameId: string,
  name: string,
  position: number
): Promise<{ player: Player | null; error: unknown }> {
  const { data, error } = await supabase
    .from('players')
    .insert({ game_id: gameId, name, buy_ins: 1, position })
    .select()
    .single();
  return { player: data as Player | null, error };
}

export async function updatePlayerBuyIns(
  playerId: string,
  buyIns: number
): Promise<{ error: unknown }> {
  const { error } = await supabase
    .from('players')
    .update({ buy_ins: buyIns })
    .eq('id', playerId);
  return { error };
}

export async function updatePlayerWins(
  playerId: string,
  wins: number
): Promise<{ error: unknown }> {
  const { error } = await supabase
    .from('players')
    .update({ wins })
    .eq('id', playerId);
  return { error };
}

export async function cashOutPlayer(
  playerId: string,
  wins: number
): Promise<{ error: unknown }> {
  const { error } = await supabase
    .from('players')
    .update({ wins, cashed_out: true })
    .eq('id', playerId);
  return { error };
}

// ── Realtime ─────────────────────────────────────────────────────────────────

export function subscribeToGame(
  gameId: string,
  callback: (table: 'game' | 'players', payload: unknown) => void,
  onStatusChange?: (connected: boolean) => void
) {
  return supabase
    .channel(`game-${gameId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
      (payload) => callback('game', payload)
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
      (payload) => callback('players', payload)
    )
    .subscribe((status) => {
      onStatusChange?.(status === 'SUBSCRIBED');
    });
}
```

**Step 5: Verify types compile**

```bash
cd c:/sridev/PokerSplit
npx tsc --noEmit
```
Expected: No errors.

**Step 6: Commit**

```bash
cd c:/sridev/PokerSplit
git add src/core/supabaseApi.ts .env.example .gitignore
git commit -m "feat: add Supabase API layer (port from web app)"
```

---

### Task 7: AsyncStorage Token Utilities

**Files:**
- Create: `c:/sridev/PokerSplit/src/core/tokenStorage.ts`

**Step 1: Create tokenStorage.ts (replaces localStorage from web utils.js)**

```typescript
// src/core/tokenStorage.ts

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'pokerSplitDealerTokens';

async function getTokens(): Promise<Record<string, string>> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export async function storeDealerToken(gameCode: string, dealerToken: string): Promise<void> {
  const tokens = await getTokens();
  tokens[gameCode.toUpperCase()] = dealerToken;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export async function getDealerToken(gameCode: string): Promise<string | null> {
  const tokens = await getTokens();
  return tokens[gameCode.toUpperCase()] ?? null;
}

export async function removeDealerToken(gameCode: string): Promise<void> {
  const tokens = await getTokens();
  delete tokens[gameCode.toUpperCase()];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export async function checkIsDealer(
  gameCode: string,
  actualDealerToken: string
): Promise<boolean> {
  const stored = await getDealerToken(gameCode);
  return stored === actualDealerToken;
}
```

**Step 2: Commit**

```bash
cd c:/sridev/PokerSplit
git add src/core/tokenStorage.ts
git commit -m "feat: add AsyncStorage token utilities (replaces localStorage)"
```

---

### Task 8: Zustand Game Store

**Files:**
- Create: `c:/sridev/PokerSplit/src/store/gameStore.ts`

**Step 1: Create Zustand store (mirrors web appState)**

```typescript
// src/store/gameStore.ts

import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Game, Player } from '@/core/types';

interface GameState {
  game: Game | null;
  players: Player[];
  isDealer: boolean;
  subscription: RealtimeChannel | null;
  isConnected: boolean;

  setGame: (game: Game | null) => void;
  setPlayers: (players: Player[]) => void;
  setIsDealer: (isDealer: boolean) => void;
  setSubscription: (sub: RealtimeChannel | null) => void;
  setIsConnected: (connected: boolean) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  addPlayerToStore: (player: Player) => void;
  reset: () => void;
}

const initialState = {
  game: null,
  players: [],
  isDealer: false,
  subscription: null,
  isConnected: false,
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,

  setGame: (game) => set({ game }),
  setPlayers: (players) => set({ players }),
  setIsDealer: (isDealer) => set({ isDealer }),
  setSubscription: (subscription) => set({ subscription }),
  setIsConnected: (isConnected) => set({ isConnected }),

  updatePlayer: (playerId, updates) =>
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, ...updates } : p
      ),
    })),

  addPlayerToStore: (player) =>
    set((state) => ({
      players: [...state.players, player].sort((a, b) => a.position - b.position),
    })),

  reset: () => set(initialState),
}));
```

**Step 2: Commit**

```bash
cd c:/sridev/PokerSplit
git add src/store/gameStore.ts
git commit -m "feat: add Zustand game store"
```

---

### Task 9: useGameSubscription Hook

**Files:**
- Create: `c:/sridev/PokerSplit/src/hooks/useGameSubscription.ts`

**Step 1: Create realtime subscription hook**

```typescript
// src/hooks/useGameSubscription.ts

import { useEffect, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { subscribeToGame, fetchGameByCode } from '@/core/supabaseApi';
import type { Game, Player } from '@/core/types';

export function useGameSubscription(gameCode: string | null) {
  const { game, setGame, setPlayers, setSubscription, setIsConnected, subscription } =
    useGameStore();

  const resubscribe = useCallback(async () => {
    if (!game) return;

    // Unsubscribe previous channel
    if (subscription) {
      await subscription.unsubscribe();
    }

    const channel = subscribeToGame(
      game.id,
      async (table, payload: any) => {
        if (table === 'game') {
          if (payload.eventType === 'UPDATE') {
            setGame(payload.new as Game);
          }
        } else {
          // For player changes, re-fetch all players for simplicity
          const { players } = await fetchGameByCode(game.game_code);
          if (players) setPlayers(players);
        }
      },
      setIsConnected
    );

    setSubscription(channel);
  }, [game]);

  useEffect(() => {
    if (!game) return;
    resubscribe();

    return () => {
      subscription?.unsubscribe();
    };
  }, [game?.id]);

  return { resubscribe };
}
```

**Step 2: Commit**

```bash
cd c:/sridev/PokerSplit
git add src/hooks/useGameSubscription.ts
git commit -m "feat: add useGameSubscription realtime hook"
```

---

### Task 10: useAppStateHandler Hook

**Files:**
- Create: `c:/sridev/PokerSplit/src/hooks/useAppStateHandler.ts`

**Step 1: Create background/foreground reconnect hook**

This is mobile-specific — iOS closes WebSockets on background. On foreground resume we re-fetch + re-subscribe.

```typescript
// src/hooks/useAppStateHandler.ts

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useGameStore } from '@/store/gameStore';
import { fetchGameByCode } from '@/core/supabaseApi';

export function useAppStateHandler(resubscribe: () => Promise<void>) {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const { game, setGame, setPlayers } = useGameStore();

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      const wasBackground =
        appState.current.match(/inactive|background/) && nextState === 'active';

      if (wasBackground && game) {
        // Re-fetch as source of truth
        const { game: freshGame, players } = await fetchGameByCode(game.game_code);
        if (freshGame) setGame(freshGame);
        if (players) setPlayers(players);
        // Re-subscribe to realtime
        await resubscribe();
      }

      appState.current = nextState;
    });

    return () => subscription.remove();
  }, [game, resubscribe]);
}
```

**Step 2: Commit**

```bash
cd c:/sridev/PokerSplit
git add src/hooks/useAppStateHandler.ts
git commit -m "feat: add useAppStateHandler for iOS background reconnect"
```

---

### Task 11: Design Tokens & Theme

**Files:**
- Create: `c:/sridev/PokerSplit/src/theme.ts`

**Step 1: Create theme constants (matches web app dark theme)**

```typescript
// src/theme.ts

export const colors = {
  bg: '#1a1a2e',
  surface: '#16213e',
  card: '#0f3460',
  accent: '#e94560',
  accentGreen: '#4caf50',
  accentRed: '#f44336',
  text: '#ffffff',
  textSecondary: '#a0a8c0',
  border: '#2a3a5c',
  dealerBadge: '#e94560',
  playerBadge: '#4a90d9',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
};

export const fontSize = {
  sm: 13,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 40,
};
```

**Step 2: Commit**

```bash
cd c:/sridev/PokerSplit
git add src/theme.ts
git commit -m "feat: add design tokens / theme"
```

---

### Task 12: Toast Component

**Files:**
- Create: `c:/sridev/PokerSplit/src/components/Toast.tsx`
- Create: `c:/sridev/PokerSplit/src/hooks/useToast.ts`

**Step 1: Create Toast component**

```typescript
// src/components/Toast.tsx

import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, fontSize } from '@/theme';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  visible: boolean;
}

export function Toast({ message, type, visible }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const bg =
    type === 'success'
      ? colors.accentGreen
      : type === 'error'
      ? colors.accentRed
      : colors.card;

  return (
    <Animated.View style={[styles.container, { backgroundColor: bg, opacity }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: spacing.lg,
    right: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    zIndex: 999,
    alignItems: 'center',
  },
  text: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
```

**Step 2: Create useToast hook**

```typescript
// src/hooks/useToast.ts

import { useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';

export function useToast() {
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
    visible: boolean;
  }>({ message: '', type: 'info', visible: false });

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  }, []);

  return { toast, showToast };
}
```

**Step 3: Commit**

```bash
cd c:/sridev/PokerSplit
git add src/components/Toast.tsx src/hooks/useToast.ts
git commit -m "feat: add Toast component and useToast hook"
```

---

### Task 13: BuyInStepper Component

**Files:**
- Create: `c:/sridev/PokerSplit/src/components/BuyInStepper.tsx`

**Step 1: Create stepper component**

```typescript
// src/components/BuyInStepper.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius, fontSize } from '@/theme';

interface BuyInStepperProps {
  value: number;
  min?: number;
  max?: number;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
}

export function BuyInStepper({
  value,
  min = 1,
  max = 99,
  onIncrement,
  onDecrement,
  disabled = false,
}: BuyInStepperProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, (disabled || value <= min) && styles.disabled]}
        onPress={onDecrement}
        disabled={disabled || value <= min}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.buttonText}>−</Text>
      </TouchableOpacity>

      <Text style={styles.value}>{value}</Text>

      <TouchableOpacity
        style={[styles.button, (disabled || value >= max) && styles.disabled]}
        onPress={onIncrement}
        disabled={disabled || value >= max}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.buttonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabled: {
    opacity: 0.3,
  },
  buttonText: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
    lineHeight: 22,
  },
  value: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'center',
  },
});
```

**Step 2: Commit**

```bash
cd c:/sridev/PokerSplit
git add src/components/BuyInStepper.tsx
git commit -m "feat: add BuyInStepper component"
```

---

### Task 14: GameCodeDisplay Component

**Files:**
- Create: `c:/sridev/PokerSplit/src/components/GameCodeDisplay.tsx`

**Step 1: Create component (shows game code + share/copy buttons)**

```typescript
// src/components/GameCodeDisplay.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { colors, spacing, radius, fontSize } from '@/theme';

interface GameCodeDisplayProps {
  gameCode: string;
  onCopied?: () => void;
}

export function GameCodeDisplay({ gameCode, onCopied }: GameCodeDisplayProps) {
  const shareLink = `pokersplit://game/${gameCode}`;

  async function handleCopy() {
    await Clipboard.setStringAsync(gameCode);
    onCopied?.();
  }

  async function handleShare() {
    await Share.share({
      message: `Join my poker game! Code: ${gameCode}\n${shareLink}`,
      title: 'PokerSplit Game',
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>GAME CODE</Text>
      <Text style={styles.code}>{gameCode}</Text>
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.button} onPress={handleCopy}>
          <Text style={styles.buttonText}>Copy Code</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.shareButton]} onPress={handleShare}>
          <Text style={styles.buttonText}>Share Link</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  code: {
    color: colors.accent,
    fontSize: fontSize.xxl,
    fontWeight: '900',
    letterSpacing: 8,
    marginBottom: spacing.md,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shareButton: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  buttonText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
```

**Step 2: Commit**

```bash
cd c:/sridev/PokerSplit
git add src/components/GameCodeDisplay.tsx
git commit -m "feat: add GameCodeDisplay component with share/copy"
```

---

### Task 15: PlayerRow Component

**Files:**
- Create: `c:/sridev/PokerSplit/src/components/PlayerRow.tsx`

**Step 1: Create player row with stepper and cash-out action**

```typescript
// src/components/PlayerRow.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { BuyInStepper } from './BuyInStepper';
import { formatCurrency } from '@/core/formatting';
import { colors, spacing, radius, fontSize } from '@/theme';
import type { Player } from '@/core/types';

interface PlayerRowProps {
  player: Player;
  buyInAmount: number;
  isDealer: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  onCashOut: () => void;
}

export function PlayerRow({
  player,
  buyInAmount,
  isDealer,
  onIncrement,
  onDecrement,
  onCashOut,
}: PlayerRowProps) {
  const totalInvested = player.buy_ins * buyInAmount;

  function handleLongPress() {
    if (!isDealer || player.cashed_out) return;
    Alert.alert(
      `Cash Out ${player.name}`,
      'Enter the amount this player is leaving with.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Cash Out', style: 'destructive', onPress: onCashOut },
      ]
    );
  }

  return (
    <TouchableOpacity
      style={[styles.row, player.cashed_out && styles.cashedOut]}
      onLongPress={handleLongPress}
      delayLongPress={500}
      activeOpacity={0.8}
    >
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{player.name}</Text>
          {player.cashed_out && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Cashed Out</Text>
            </View>
          )}
        </View>
        <Text style={styles.invested}>{formatCurrency(totalInvested)} in</Text>
      </View>

      <BuyInStepper
        value={player.buy_ins}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
        disabled={!isDealer || player.cashed_out}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cashedOut: {
    opacity: 0.5,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: colors.accentGreen,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  badgeText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '700',
  },
  invested: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
});
```

**Step 2: Commit**

```bash
cd c:/sridev/PokerSplit
git add src/components/PlayerRow.tsx
git commit -m "feat: add PlayerRow component with long-press cash-out"
```

---

### Task 16: CashOutSheet Component

**Files:**
- Create: `c:/sridev/PokerSplit/src/components/CashOutSheet.tsx`

**Step 1: Create bottom sheet for cash-out amount entry**

```typescript
// src/components/CashOutSheet.tsx

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { colors, spacing, radius, fontSize } from '@/theme';
import { formatCurrency } from '@/core/formatting';

interface CashOutSheetProps {
  playerName: string | null;
  onConfirm: (amount: number) => void;
  onClose: () => void;
}

export function CashOutSheet({ playerName, onConfirm, onClose }: CashOutSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [amount, setAmount] = useState('');
  const snapPoints = ['40%'];

  useEffect(() => {
    if (playerName) {
      setAmount('');
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [playerName]);

  const handleSheetClose = useCallback(() => {
    onClose();
  }, [onClose]);

  function handleConfirm() {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed < 0) return;
    onConfirm(parsed);
  }

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={handleSheetClose}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
    >
      <BottomSheetView style={styles.content}>
        <Text style={styles.title}>Cash Out {playerName}</Text>
        <Text style={styles.subtitle}>How much are they leaving with?</Text>

        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.textSecondary}
          autoFocus
        />

        <View style={styles.buttons}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmText}>Cash Out</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  confirmText: {
    color: colors.text,
    fontWeight: '700',
  },
});
```

**Step 2: Commit**

```bash
cd c:/sridev/PokerSplit
git add src/components/CashOutSheet.tsx
git commit -m "feat: add CashOutSheet bottom sheet component"
```

---

### Task 17: QRModal Component

**Files:**
- Create: `c:/sridev/PokerSplit/src/components/QRModal.tsx`

**Step 1: Create QR code modal**

```typescript
// src/components/QRModal.tsx

import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors, spacing, radius, fontSize } from '@/theme';

interface QRModalProps {
  visible: boolean;
  gameCode: string;
  onClose: () => void;
}

export function QRModal({ visible, gameCode, onClose }: QRModalProps) {
  const link = `pokersplit://game/${gameCode}`;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <View style={styles.card}>
          <Text style={styles.title}>Scan to Join</Text>
          <View style={styles.qr}>
            <QRCode value={link} size={220} color={colors.text} backgroundColor={colors.surface} />
          </View>
          <Text style={styles.code}>{gameCode}</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    width: 300,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
    marginBottom: spacing.lg,
  },
  qr: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  code: {
    color: colors.accent,
    fontSize: fontSize.xl,
    fontWeight: '900',
    letterSpacing: 6,
    marginBottom: spacing.lg,
  },
  closeButton: {
    backgroundColor: colors.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
```

**Step 2: Commit**

```bash
cd c:/sridev/PokerSplit
git add src/components/QRModal.tsx
git commit -m "feat: add QRModal component"
```

---

### Task 18: Root Layout

**Files:**
- Create: `c:/sridev/PokerSplit/app/_layout.tsx`

**Step 1: Create root layout with GestureHandler + SafeArea + theme**

```typescript
// app/_layout.tsx

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: '800' },
            contentStyle: { backgroundColor: colors.bg },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="index" options={{ title: 'PokerSplit', headerShown: false }} />
          <Stack.Screen name="setup" options={{ title: 'New Game' }} />
          <Stack.Screen name="game/[code]" options={{ title: 'Game' }} />
          <Stack.Screen name="settlement/[code]" options={{ title: 'Settlement' }} />
          <Stack.Screen name="results/[code]" options={{ title: 'Results' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
```

**Step 2: Commit**

```bash
cd c:/sridev/PokerSplit
git add app/_layout.tsx
git commit -m "feat: add root layout with gesture handler and safe area"
```

---

### Task 19: Home Screen

**Files:**
- Create: `c:/sridev/PokerSplit/app/index.tsx`

**Step 1: Create home screen**

```typescript
// app/index.tsx

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useGameStore } from '@/store/gameStore';
import { fetchGameByCode } from '@/core/supabaseApi';
import { checkIsDealer } from '@/core/tokenStorage';
import { colors, spacing, radius, fontSize } from '@/theme';

export default function HomeScreen() {
  const [gameCode, setGameCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setGame, setPlayers, setIsDealer, reset } = useGameStore();

  async function handleJoinGame() {
    const code = gameCode.trim().toUpperCase();
    if (code.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-character game code.');
      return;
    }

    setIsLoading(true);
    const { game, players, error } = await fetchGameByCode(code);
    setIsLoading(false);

    if (error || !game || !players) {
      Alert.alert('Game Not Found', 'No game found with that code. Check the code and try again.');
      return;
    }

    const dealer = await checkIsDealer(code, game.dealer_token);
    reset();
    setGame(game);
    setPlayers(players);
    setIsDealer(dealer);

    if (game.phase === 'playing') {
      router.push(`/game/${code}`);
    } else if (game.phase === 'settlement') {
      router.push(`/settlement/${code}`);
    } else {
      router.push(`/results/${code}`);
    }
  }

  function handleNewGame() {
    reset();
    router.push('/setup');
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.hero}>
          <Text style={styles.logo}>♠</Text>
          <Text style={styles.title}>PokerSplit</Text>
          <Text style={styles.subtitle}>Track buy-ins. Settle fast.</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleNewGame}>
            <Text style={styles.primaryText}>New Game</Text>
            <Text style={styles.primarySub}>Dealer — create & manage</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or join existing</Text>
            <View style={styles.dividerLine} />
          </View>

          <TextInput
            style={styles.codeInput}
            value={gameCode}
            onChangeText={setGameCode}
            placeholder="Enter game code"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="characters"
            maxLength={6}
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.secondaryButton, !gameCode && styles.disabled]}
            onPress={handleJoinGame}
            disabled={!gameCode || isLoading}
          >
            <Text style={styles.secondaryText}>
              {isLoading ? 'Joining...' : 'Join Game'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, justifyContent: 'center', padding: spacing.xl },
  hero: { alignItems: 'center', marginBottom: spacing.xl * 2 },
  logo: { fontSize: 64, marginBottom: spacing.sm },
  title: { color: colors.text, fontSize: fontSize.xxl, fontWeight: '900' },
  subtitle: { color: colors.textSecondary, fontSize: fontSize.md, marginTop: spacing.xs },
  actions: { gap: spacing.md },
  primaryButton: {
    backgroundColor: colors.accent,
    padding: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  primaryText: { color: colors.text, fontSize: fontSize.lg, fontWeight: '800' },
  primarySub: { color: 'rgba(255,255,255,0.7)', fontSize: fontSize.sm, marginTop: 2 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textSecondary, fontSize: fontSize.sm },
  codeInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButton: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
  disabled: { opacity: 0.4 },
});
```

**Step 2: Verify Metro can parse the screen**

```bash
cd c:/sridev/PokerSplit
npx expo start --clear
```
Navigate to the home screen in simulator/device. Expected: Home screen renders with two options.

**Step 3: Commit**

```bash
cd c:/sridev/PokerSplit
git add app/index.tsx
git commit -m "feat: add Home screen (new game + join game)"
```

---

### Task 20: Setup Screen

**Files:**
- Create: `c:/sridev/PokerSplit/app/setup.tsx`

**Step 1: Create setup screen with player names + buy-in amount**

```typescript
// app/setup.tsx

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { createGame } from '@/core/supabaseApi';
import { storeDealerToken } from '@/core/tokenStorage';
import { useGameStore } from '@/store/gameStore';
import { BuyInStepper } from '@/components/BuyInStepper';
import { colors, spacing, radius, fontSize } from '@/theme';

const DEFAULT_BUY_IN = 20;
const DEFAULT_PLAYER_COUNT = 6;

export default function SetupScreen() {
  const [playerCount, setPlayerCount] = useState(DEFAULT_PLAYER_COUNT);
  const [playerNames, setPlayerNames] = useState<string[]>(
    Array.from({ length: DEFAULT_PLAYER_COUNT }, (_, i) => `Player ${i + 1}`)
  );
  const [buyInAmount, setBuyInAmount] = useState(String(DEFAULT_BUY_IN));
  const [isLoading, setIsLoading] = useState(false);
  const { setGame, setPlayers, setIsDealer, reset } = useGameStore();

  function handlePlayerCountChange(newCount: number) {
    setPlayerCount(newCount);
    setPlayerNames((prev) => {
      if (newCount > prev.length) {
        return [...prev, ...Array.from({ length: newCount - prev.length }, (_, i) => `Player ${prev.length + i + 1}`)];
      }
      return prev.slice(0, newCount);
    });
  }

  function handleNameChange(index: number, name: string) {
    setPlayerNames((prev) => prev.map((n, i) => (i === index ? name : n)));
  }

  async function handleStartGame() {
    const amount = parseFloat(buyInAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Buy-In', 'Please enter a valid buy-in amount.');
      return;
    }

    const names = playerNames.map((n) => n.trim()).filter(Boolean);
    if (names.length < 2) {
      Alert.alert('Need Players', 'Add at least 2 players to start a game.');
      return;
    }

    setIsLoading(true);
    const { game, dealerToken, error } = await createGame(amount, names);
    setIsLoading(false);

    if (error || !game || !dealerToken) {
      Alert.alert('Error', 'Failed to create game. Check your connection and try again.');
      return;
    }

    await storeDealerToken(game.game_code, dealerToken);

    const { game: fetchedGame, players } = await import('@/core/supabaseApi').then(
      (api) => api.fetchGameByCode(game.game_code)
    );

    reset();
    setGame(fetchedGame ?? game);
    setPlayers(players ?? []);
    setIsDealer(true);

    router.replace(`/game/${game.game_code}`);
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <FlatList
          data={playerNames}
          keyExtractor={(_, i) => String(i)}
          ListHeaderComponent={
            <View>
              <View style={styles.field}>
                <Text style={styles.label}>Buy-In Amount ($)</Text>
                <TextInput
                  style={styles.input}
                  value={buyInAmount}
                  onChangeText={setBuyInAmount}
                  keyboardType="decimal-pad"
                  placeholder="20"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={[styles.field, styles.row]}>
                <Text style={styles.label}>Number of Players</Text>
                <BuyInStepper
                  value={playerCount}
                  min={2}
                  max={20}
                  onIncrement={() => handlePlayerCountChange(playerCount + 1)}
                  onDecrement={() => handlePlayerCountChange(playerCount - 1)}
                />
              </View>

              <Text style={[styles.label, { marginBottom: spacing.sm }]}>Player Names</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <TextInput
              style={[styles.input, { marginBottom: spacing.sm }]}
              value={item}
              onChangeText={(name) => handleNameChange(index, name)}
              placeholder={`Player ${index + 1}`}
              placeholderTextColor={colors.textSecondary}
            />
          )}
          contentContainerStyle={styles.list}
        />

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.startButton, isLoading && styles.disabled]}
            onPress={handleStartGame}
            disabled={isLoading}
          >
            <Text style={styles.startText}>
              {isLoading ? 'Creating Game...' : '🃏 Start Game'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1 },
  list: { padding: spacing.lg, paddingBottom: 100 },
  field: { marginBottom: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  startButton: {
    backgroundColor: colors.accent,
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  startText: { color: colors.text, fontSize: fontSize.lg, fontWeight: '800' },
  disabled: { opacity: 0.5 },
});
```

**Step 2: Commit**

```bash
cd c:/sridev/PokerSplit
git add app/setup.tsx
git commit -m "feat: add Setup screen (player names, buy-in amount)"
```

---

### Task 21: Game Screen

**Files:**
- Create: `c:/sridev/PokerSplit/app/game/[code].tsx`
- Create: `c:/sridev/PokerSplit/app/game/` (directory)

**Step 1: Create active game screen**

```typescript
// app/game/[code].tsx

import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, SafeAreaView, TextInput,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useGameStore } from '@/store/gameStore';
import { useGameSubscription } from '@/hooks/useGameSubscription';
import { useAppStateHandler } from '@/hooks/useAppStateHandler';
import { useToast } from '@/hooks/useToast';
import { Toast } from '@/components/Toast';
import { PlayerRow } from '@/components/PlayerRow';
import { GameCodeDisplay } from '@/components/GameCodeDisplay';
import { CashOutSheet } from '@/components/CashOutSheet';
import { QRModal } from '@/components/QRModal';
import {
  updatePlayerBuyIns,
  updateGamePhase,
  addPlayer,
  cashOutPlayer,
  fetchGameByCode,
} from '@/core/supabaseApi';
import { calculatePot, formatCurrency } from '@/core/formatting';
import { colors, spacing, radius, fontSize } from '@/theme';

export default function GameScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { game, players, isDealer, setGame, setPlayers } = useGameStore();
  const { resubscribe } = useGameSubscription(code ?? null);
  useAppStateHandler(resubscribe);

  const { toast, showToast } = useToast();
  const [cashOutPlayer_id, setCashOutPlayerId] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [addingPlayer, setAddingPlayer] = useState(false);

  // If navigated directly via deep link, load game from Supabase
  useEffect(() => {
    if (!game && code) {
      fetchGameByCode(code).then(({ game: g, players: p }) => {
        if (g) setGame(g);
        if (p) setPlayers(p);
      });
    }
  }, []);

  const pot = game ? calculatePot(players, game.buy_in_amount) : 0;
  const cashingOutPlayer = players.find((p) => p.id === cashOutPlayer_id);

  async function handleBuyInChange(playerId: string, delta: number) {
    if (!isDealer) return;
    const player = players.find((p) => p.id === playerId);
    if (!player) return;
    const newCount = player.buy_ins + delta;
    if (newCount < 1) return;
    await updatePlayerBuyIns(playerId, newCount);
  }

  async function handleAddPlayer() {
    if (!game || !newPlayerName.trim()) return;
    const { player, error } = await addPlayer(
      game.id,
      newPlayerName.trim(),
      players.length
    );
    if (error || !player) {
      showToast('Failed to add player', 'error');
      return;
    }
    setNewPlayerName('');
    setAddingPlayer(false);
    showToast(`${player.name} added`, 'success');
  }

  async function handleCashOut(amount: number) {
    if (!cashOutPlayer_id) return;
    const { error } = await cashOutPlayer(cashOutPlayer_id, amount);
    if (error) {
      showToast('Cash out failed', 'error');
    } else {
      showToast('Player cashed out', 'success');
    }
    setCashOutPlayerId(null);
  }

  async function handleEndGame() {
    if (!game || !isDealer) return;
    Alert.alert(
      'End Game',
      'Move to settlement? Players can no longer buy in.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Game',
          onPress: async () => {
            await updateGamePhase(game.id, 'settlement');
            router.replace(`/settlement/${game.game_code}`);
          },
        },
      ]
    );
  }

  if (!game) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Loading game...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={players}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={
          <View>
            <GameCodeDisplay
              gameCode={game.game_code}
              onCopied={() => showToast('Code copied!', 'success')}
            />

            <View style={styles.potRow}>
              <Text style={styles.potLabel}>Total Pot</Text>
              <Text style={styles.potValue}>{formatCurrency(pot)}</Text>
              <TouchableOpacity onPress={() => setShowQR(true)}>
                <Text style={styles.qrButton}>QR</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.badge, isDealer ? styles.dealerBadge : styles.playerBadge]}>
              <Text style={styles.badgeText}>{isDealer ? '♦ Dealer' : '👁 Viewing'}</Text>
            </View>

            <Text style={styles.sectionTitle}>Players</Text>
          </View>
        }
        renderItem={({ item }) => (
          <PlayerRow
            player={item}
            buyInAmount={game.buy_in_amount}
            isDealer={isDealer}
            onIncrement={() => handleBuyInChange(item.id, 1)}
            onDecrement={() => handleBuyInChange(item.id, -1)}
            onCashOut={() => setCashOutPlayerId(item.id)}
          />
        )}
        ListFooterComponent={
          isDealer ? (
            <View style={styles.footer}>
              {addingPlayer ? (
                <View style={styles.addPlayerRow}>
                  <TextInput
                    style={styles.addPlayerInput}
                    value={newPlayerName}
                    onChangeText={setNewPlayerName}
                    placeholder="Player name"
                    placeholderTextColor={colors.textSecondary}
                    autoFocus
                  />
                  <TouchableOpacity style={styles.addButton} onPress={handleAddPlayer}>
                    <Text style={styles.addButtonText}>Add</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setAddingPlayer(false)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.addPlayerButton}
                  onPress={() => setAddingPlayer(true)}
                >
                  <Text style={styles.addPlayerText}>+ Add Player</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.endButton} onPress={handleEndGame}>
                <Text style={styles.endButtonText}>End Game → Settle</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        contentContainerStyle={styles.list}
      />

      <CashOutSheet
        playerName={cashingOutPlayer?.name ?? null}
        onConfirm={handleCashOut}
        onClose={() => setCashOutPlayerId(null)}
      />

      <QRModal
        visible={showQR}
        gameCode={game.game_code}
        onClose={() => setShowQR(false)}
      />

      <Toast {...toast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loading: { color: colors.textSecondary, textAlign: 'center', marginTop: 100, fontSize: fontSize.md },
  list: { padding: spacing.md, paddingBottom: 40 },
  potRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  potLabel: { color: colors.textSecondary, fontSize: fontSize.sm, flex: 1 },
  potValue: { color: colors.text, fontSize: fontSize.lg, fontWeight: '800' },
  qrButton: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginLeft: spacing.md,
    padding: spacing.xs,
  },
  badge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm, marginBottom: spacing.md },
  dealerBadge: { backgroundColor: colors.dealerBadge },
  playerBadge: { backgroundColor: colors.playerBadge },
  badgeText: { color: colors.text, fontSize: fontSize.sm, fontWeight: '700' },
  sectionTitle: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.sm },
  footer: { marginTop: spacing.lg, gap: spacing.sm },
  addPlayerRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  addPlayerInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addButton: { backgroundColor: colors.accent, padding: spacing.sm, borderRadius: radius.sm },
  addButtonText: { color: colors.text, fontWeight: '700' },
  cancelText: { color: colors.textSecondary, fontWeight: '600' },
  addPlayerButton: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addPlayerText: { color: colors.textSecondary, fontWeight: '600' },
  endButton: {
    backgroundColor: colors.accent,
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  endButtonText: { color: colors.text, fontSize: fontSize.md, fontWeight: '800' },
});
```

**Step 2: Test game screen renders**

```bash
cd c:/sridev/PokerSplit
npx expo start
```
Create a game via Setup screen, verify navigation to Game screen, players listed.

**Step 3: Commit**

```bash
cd c:/sridev/PokerSplit
git add app/game/
git commit -m "feat: add Game screen with buy-in management and realtime"
```

---

### Task 22: Settlement Screen

**Files:**
- Create: `c:/sridev/PokerSplit/app/settlement/[code].tsx`
- Create: `c:/sridev/PokerSplit/app/settlement/` (directory)

**Step 1: Create settlement screen with KeyboardAvoidingView**

```typescript
// app/settlement/[code].tsx

import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useGameStore } from '@/store/gameStore';
import { useGameSubscription } from '@/hooks/useGameSubscription';
import { updatePlayerWins, updateGamePhase, fetchGameByCode } from '@/core/supabaseApi';
import { calculatePot } from '@/core/settlement';
import { formatCurrency } from '@/core/formatting';
import { colors, spacing, radius, fontSize } from '@/theme';

export default function SettlementScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { game, players, isDealer, setGame, setPlayers } = useGameStore();
  const { resubscribe } = useGameSubscription(code ?? null);

  const [wins, setWins] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!game && code) {
      fetchGameByCode(code).then(({ game: g, players: p }) => {
        if (g) setGame(g);
        if (p) setPlayers(p);
      });
    }
  }, []);

  // Pre-fill wins from existing data
  useEffect(() => {
    const initial: Record<string, string> = {};
    players.forEach((p) => {
      if (p.wins !== null) initial[p.id] = String(p.wins);
    });
    setWins(initial);
  }, [players]);

  if (!game) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </SafeAreaView>
    );
  }

  const pot = calculatePot(players, game.buy_in_amount);
  const enteredTotal = Object.values(wins).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
  const totalMatch = Math.abs(enteredTotal - pot) < 0.01;

  async function handleWinsBlur(playerId: string) {
    if (!isDealer) return;
    const val = parseFloat(wins[playerId] ?? '');
    if (!isNaN(val)) {
      await updatePlayerWins(playerId, val);
    }
  }

  async function handleCalculate() {
    if (!totalMatch) {
      Alert.alert('Total Mismatch', `Entered: ${formatCurrency(enteredTotal)}\nExpected: ${formatCurrency(pot)}\n\nAmounts must match the pot.`);
      return;
    }
    await updateGamePhase(game.id, 'complete');
    router.replace(`/results/${game.game_code}`);
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        {/* Sticky validation bar */}
        <View style={[styles.validationBar, totalMatch ? styles.validMatch : styles.invalidMatch]}>
          <Text style={styles.validationText}>
            Entered: {formatCurrency(enteredTotal)} / Pot: {formatCurrency(pot)}
          </Text>
          {totalMatch && <Text style={styles.checkmark}>✓ Balanced</Text>}
        </View>

        <FlatList
          data={players}
          keyExtractor={(p) => p.id}
          ListHeaderComponent={
            <Text style={styles.instruction}>
              Enter each player's final cash-out amount
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.playerRow}>
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>{item.name}</Text>
                <Text style={styles.invested}>
                  Invested: {formatCurrency(item.buy_ins * game.buy_in_amount)}
                </Text>
              </View>
              <TextInput
                style={[styles.winsInput, !isDealer && styles.readOnly]}
                value={wins[item.id] ?? ''}
                onChangeText={(v) => setWins((prev) => ({ ...prev, [item.id]: v }))}
                onBlur={() => handleWinsBlur(item.id)}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                editable={isDealer}
              />
            </View>
          )}
          contentContainerStyle={styles.list}
        />

        {isDealer && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.calculateButton, !totalMatch && styles.disabled]}
              onPress={handleCalculate}
              disabled={!totalMatch}
            >
              <Text style={styles.calculateText}>Calculate Settlement →</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  kav: { flex: 1 },
  loading: { color: colors.textSecondary, textAlign: 'center', marginTop: 100 },
  validationBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  validMatch: { backgroundColor: 'rgba(76, 175, 80, 0.15)' },
  invalidMatch: { backgroundColor: 'rgba(244, 67, 54, 0.10)' },
  validationText: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  checkmark: { color: colors.accentGreen, fontWeight: '800' },
  instruction: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  list: { padding: spacing.md, paddingBottom: 100 },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  playerInfo: { flex: 1 },
  playerName: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
  invested: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 },
  winsInput: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    padding: spacing.sm,
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
    width: 90,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: colors.border,
  },
  readOnly: { opacity: 0.6 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  calculateButton: {
    backgroundColor: colors.accent,
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  calculateText: { color: colors.text, fontSize: fontSize.md, fontWeight: '800' },
  disabled: { opacity: 0.4 },
});
```

**Step 2: Commit**

```bash
cd c:/sridev/PokerSplit
git add app/settlement/
git commit -m "feat: add Settlement screen with KeyboardAvoidingView pot validation"
```

---

### Task 23: Results Screen

**Files:**
- Create: `c:/sridev/PokerSplit/app/results/[code].tsx`
- Create: `c:/sridev/PokerSplit/app/results/` (directory)

**Step 1: Create results screen with settlement display and native Share**

```typescript
// app/results/[code].tsx

import React, { useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Share, SafeAreaView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useGameStore } from '@/store/gameStore';
import { fetchGameByCode } from '@/core/supabaseApi';
import { calculateSettlements } from '@/core/settlement';
import { formatCurrency } from '@/core/formatting';
import { colors, spacing, radius, fontSize } from '@/theme';

export default function ResultsScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { game, players, setGame, setPlayers, reset } = useGameStore();

  useEffect(() => {
    if (!game && code) {
      fetchGameByCode(code).then(({ game: g, players: p }) => {
        if (g) setGame(g);
        if (p) setPlayers(p);
      });
    }
  }, []);

  const settlement = useMemo(() => {
    if (!game || players.length === 0) return null;
    return calculateSettlements(players, game.buy_in_amount);
  }, [game, players]);

  async function handleShare() {
    if (!settlement || !game) return;
    const lines = settlement.payments.map(
      (p) => `${p.from} → ${p.to}: ${formatCurrency(p.amount)}`
    );
    const text = `PokerSplit Results (${game.game_code})\n\n${lines.join('\n') || 'No payments needed!'}`;
    await Share.share({ message: text, title: 'PokerSplit Results' });
  }

  function handleNewGame() {
    reset();
    router.replace('/');
  }

  if (!game || !settlement) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Loading results...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={settlement.payments}
        keyExtractor={(_, i) => String(i)}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Settlement</Text>
            <Text style={styles.subtitle}>Game {game.game_code}</Text>

            {/* Player net results */}
            <Text style={styles.sectionTitle}>NET RESULTS</Text>
            {settlement.results.map((r) => (
              <View key={r.name} style={styles.resultRow}>
                <Text style={styles.resultName}>{r.name}</Text>
                <Text style={[styles.resultNet, r.net >= 0 ? styles.positive : styles.negative]}>
                  {r.net >= 0 ? '+' : ''}{formatCurrency(r.net)}
                </Text>
              </View>
            ))}

            <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>PAYMENTS</Text>
            {settlement.payments.length === 0 && (
              <Text style={styles.noPayments}>🎉 No payments needed!</Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.paymentCard}>
            <Text style={styles.paymentFrom}>{item.from}</Text>
            <View style={styles.arrow}>
              <Text style={styles.arrowText}>→</Text>
              <Text style={styles.paymentAmount}>{formatCurrency(item.amount)}</Text>
            </View>
            <Text style={styles.paymentTo}>{item.to}</Text>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Text style={styles.shareText}>Share Results</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.newGameButton} onPress={handleNewGame}>
              <Text style={styles.newGameText}>New Game</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loading: { color: colors.textSecondary, textAlign: 'center', marginTop: 100 },
  list: { padding: spacing.md },
  title: { color: colors.text, fontSize: fontSize.xxl, fontWeight: '900', textAlign: 'center', marginBottom: spacing.xs },
  subtitle: { color: colors.textSecondary, fontSize: fontSize.md, textAlign: 'center', marginBottom: spacing.xl },
  sectionTitle: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.sm },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultName: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  resultNet: { fontSize: fontSize.md, fontWeight: '800' },
  positive: { color: colors.accentGreen },
  negative: { color: colors.accentRed },
  noPayments: { color: colors.textSecondary, textAlign: 'center', fontSize: fontSize.md, marginVertical: spacing.lg },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentFrom: { color: colors.text, fontWeight: '700', fontSize: fontSize.md, flex: 1 },
  arrow: { alignItems: 'center', gap: 2 },
  arrowText: { color: colors.textSecondary, fontSize: fontSize.md },
  paymentAmount: { color: colors.accent, fontWeight: '800', fontSize: fontSize.md },
  paymentTo: { color: colors.text, fontWeight: '700', fontSize: fontSize.md, flex: 1, textAlign: 'right' },
  footer: { gap: spacing.sm, marginTop: spacing.xl },
  shareButton: {
    backgroundColor: colors.accent,
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  shareText: { color: colors.text, fontSize: fontSize.md, fontWeight: '800' },
  newGameButton: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  newGameText: { color: colors.textSecondary, fontWeight: '600' },
});
```

**Step 2: Commit**

```bash
cd c:/sridev/PokerSplit
git add app/results/
git commit -m "feat: add Results screen with settlement display and native Share"
```

---

### Task 24: Deep Link Configuration

**Files:**
- Modify: `c:/sridev/PokerSplit/app.json`

**Step 1: Deep links are already configured by `"scheme": "pokersplit"` and expo-router**

Verify `pokersplit://game/ABC123` maps to `app/game/[code].tsx`. No additional config needed — expo-router handles this automatically when scheme is set.

**Step 2: Test deep link manually (simulator)**

```bash
# iOS Simulator
xcrun simctl openurl booted "pokersplit://game/ABC123"

# Android Emulator
adb shell am start -W -a android.intent.action.VIEW -d "pokersplit://game/ABC123"
```
Expected: App opens on Game screen with code "ABC123".

**Step 3: Commit**

```bash
cd c:/sridev/PokerSplit
git add app.json
git commit -m "feat: verify deep link scheme configuration"
```

---

### Task 25: EAS Build Configuration

**Files:**
- Create: `c:/sridev/PokerSplit/eas.json`

**Step 1: Install EAS CLI**

```bash
npm install -g eas-cli
eas login
```

**Step 2: Create eas.json**

```json
{
  "cli": {
    "version": ">= 10.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "YOUR_ASC_APP_ID",
        "appleTeamId": "YOUR_TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-key.json",
        "track": "internal"
      }
    }
  }
}
```

**Step 3: Initialize EAS project**

```bash
cd c:/sridev/PokerSplit
eas build:configure
```
Expected: Creates EAS project, updates `app.json` with `extra.eas.projectId`.

**Step 4: Set environment variables in EAS**

```bash
eas env:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://xxxxx.supabase.co" --environment production
eas env:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJxxxx..." --environment production
# Repeat for preview and development
```

**Step 5: Commit**

```bash
cd c:/sridev/PokerSplit
git add eas.json
git commit -m "feat: add EAS build configuration"
```

---

### Task 26: Preview Build & Test

**Step 1: Build for TestFlight (iOS) and Android Internal**

```bash
cd c:/sridev/PokerSplit
eas build --platform all --profile preview
```
Expected: Build submitted to EAS, returns build URLs.

**Step 2: Install on device**

- iOS: Install via TestFlight or direct IPA install
- Android: Install APK via EAS download URL

**Step 3: Full end-to-end test checklist**

- [ ] Create game as dealer, game code displayed
- [ ] Share link copies/opens correctly
- [ ] QR code displays and is scannable
- [ ] Join game as player (separate device or simulator)
- [ ] Player view is read-only
- [ ] Buy-in changes sync in real-time to player
- [ ] Add player mid-game syncs
- [ ] Cash out player via long-press + bottom sheet
- [ ] End game → Settlement screen
- [ ] Enter wins, pot validation bar works
- [ ] Calculate settlement → Results screen
- [ ] Results: net amounts color-coded, payments listed
- [ ] Share results uses native share sheet
- [ ] Background/foreground: data re-fetched on resume
- [ ] Deep link `pokersplit://game/ABC123` opens correct game

**Step 4: Commit**

```bash
cd c:/sridev/PokerSplit
git tag v1.0.0-preview
git push origin main --tags
```

---

### Task 27: Production Build & Submit

**Step 1: Build for production**

```bash
cd c:/sridev/PokerSplit
eas build --platform all --profile production
```

**Step 2: Submit to stores**

```bash
eas submit --platform ios
eas submit --platform android
```

**Step 3: Store metadata**

- **App name**: "PokerSplit - Poker Buy-In Tracker"
- **Subtitle**: "Settlement Calculator"
- **Description**: Focus on "poker settlement calculator", "buy-in tracker", avoid "winnings"
- **Category**: Utilities (iOS), Finance (Android)

---

## File Reference Map

| File | Purpose |
|------|---------|
| `src/core/types.ts` | Game, Player, Payment TypeScript types |
| `src/core/formatting.ts` | formatCurrency, generateGameCode |
| `src/core/settlement.ts` | calculatePot, calculateSettlements |
| `src/core/supabaseApi.ts` | All Supabase CRUD + realtime |
| `src/core/tokenStorage.ts` | AsyncStorage dealer token CRUD |
| `src/store/gameStore.ts` | Zustand state (game, players, isDealer) |
| `src/hooks/useGameSubscription.ts` | Supabase realtime subscription |
| `src/hooks/useAppStateHandler.ts` | iOS background reconnect |
| `src/hooks/useToast.ts` | Toast state management |
| `src/theme.ts` | Design tokens (colors, spacing, typography) |
| `src/components/Toast.tsx` | Animated toast notification |
| `src/components/BuyInStepper.tsx` | +/- stepper for buy-in count |
| `src/components/GameCodeDisplay.tsx` | Code display + share/copy buttons |
| `src/components/PlayerRow.tsx` | Player list item with stepper |
| `src/components/CashOutSheet.tsx` | Bottom sheet for cash-out amount |
| `src/components/QRModal.tsx` | QR code modal |
| `app/_layout.tsx` | Root layout (GestureHandler + SafeArea) |
| `app/index.tsx` | Home screen |
| `app/setup.tsx` | New game setup |
| `app/game/[code].tsx` | Active game screen |
| `app/settlement/[code].tsx` | Settlement entry screen |
| `app/results/[code].tsx` | Results + payment instructions |
| `app.json` | Expo config + deep link scheme |
| `eas.json` | EAS Build profiles |
