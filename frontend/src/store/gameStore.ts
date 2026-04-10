import { create } from 'zustand';

// ── Types ─────────────────────────────────────────────────

export type Theme = 'dark-gothic' | 'bright-forest' | 'warm-tavern';

export type LogEntryType = 'attack' | 'spell' | 'heal' | 'move' | 'system';

export interface CharacterStats {
  id: string;
  name: string;
  class: string;
  race: string;
  level: number;
  hp: number;
  maxHp: number;
  ac: number;
  speed: number;
  avatar: string;           // emoji or URL
  statusEffects: string[];
  isActive: boolean;        // current initiative turn
  isDowned: boolean;
  extraStats?: Record<string, string | number>;
}

export interface InitiativeEntry {
  id: string;
  name: string;
  roll: number;
  isEnemy: boolean;
  isCurrent: boolean;
}

export interface WorldState {
  locationName: string;
  biome: string;
  description: string;
  conditions: string[];
  round: number | null;
  inCombat: boolean;
}

export interface NarrativeEntry {
  id: string;
  speaker: 'dm' | 'player';
  speakerLabel: string;
  text: string;
  timestamp: number;
}

export interface LogEntry {
  id: string;
  text: string;
  type: LogEntryType;
  timestamp: number;
}

export interface DynamicSlotMap {
  [slotName: string]: string | null; // slotName → componentName
}

export interface TokenPosition {
  id: string;
  name: string;
  type: 'player' | 'enemy' | 'npc';
  avatar: string;
  x: number; // percentage 0–100
  y: number; // percentage 0–100
  isActive: boolean;
}

export interface SessionStats {
  kills: number;
  gold: number;
  xp: number;
}

// ── UI Instruction (matches what agent emits) ─────────────

export type UIInstruction =
  | { type: 'update_theme';   theme: Theme }
  | { type: 'mount_component'; slot: string; componentName: string | null }
  | { type: 'update_stats';   party: Partial<CharacterStats>[] }
  | { type: 'update_world';   world: Partial<WorldState> }
  | { type: 'update_initiative'; order: InitiativeEntry[] }
  | { type: 'move_token';     tokenId: string; x: number; y: number }
  | { type: 'add_token';      token: TokenPosition }
  | { type: 'remove_token';   tokenId: string }
  | { type: 'update_session'; stats: Partial<SessionStats> }
  | { type: 'screen_shake' }
  | { type: 'spell_effect';   x: number; y: number; color?: string };

// ── Store interface ───────────────────────────────────────

interface GameStore {
  // Narrative
  narrativeHistory: NarrativeEntry[];
  appendNarrative: (entry: Omit<NarrativeEntry, 'id' | 'timestamp'>) => void;
  clearNarrative: () => void;

  // Combat log
  combatLog: LogEntry[];
  appendLog: (text: string, type: LogEntryType) => void;

  // Party
  party: CharacterStats[];
  setParty: (party: CharacterStats[]) => void;
  updateCharacter: (id: string, updates: Partial<CharacterStats>) => void;

  // Initiative
  initiative: InitiativeEntry[];
  setInitiative: (order: InitiativeEntry[]) => void;

  // World / environment
  world: WorldState;
  setWorld: (updates: Partial<WorldState>) => void;

  // Map tokens
  tokens: TokenPosition[];
  setTokens: (tokens: TokenPosition[]) => void;
  moveToken: (id: string, x: number, y: number) => void;
  addToken: (token: TokenPosition) => void;
  removeToken: (id: string) => void;

  // Dynamic component slots
  dynamicSlots: DynamicSlotMap;
  mountComponent: (slot: string, componentName: string | null) => void;

  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Session stats
  sessionStats: SessionStats;
  updateSessionStats: (updates: Partial<SessionStats>) => void;

  // Streaming state
  isDmTyping: boolean;
  setDmTyping: (v: boolean) => void;

  // Spell FX (pulse triggers re-render in MapViewport)
  spellFxQueue: Array<{ id: string; x: number; y: number; color: string }>;
  triggerSpellFx: (x: number, y: number, color?: string) => void;
  consumeSpellFx: (id: string) => void;

  // Screen shake
  isShaking: boolean;
  triggerShake: () => void;

  // Master dispatcher — called by useGameStream for every ui_instruction
  applyUIInstruction: (instruction: UIInstruction) => void;
}

// ── Default data ──────────────────────────────────────────

const DEFAULT_PARTY: CharacterStats[] = [
  {
    id: 'aldric',
    name: 'Aldric Stonehaven',
    class: 'Fighter',
    race: 'Human',
    level: 5,
    hp: 42,
    maxHp: 54,
    ac: 18,
    speed: 30,
    avatar: '⚔',
    statusEffects: ['Shield of Faith'],
    isActive: true,
    isDowned: false,
    extraStats: { 'Action Surge': '1/1' },
  },
  {
    id: 'lyra',
    name: 'Lyra Moonwhisper',
    class: 'Wizard',
    race: 'Elf',
    level: 5,
    hp: 19,
    maxHp: 35,
    ac: 13,
    speed: 30,
    avatar: '✦',
    statusEffects: ['Poisoned'],
    isActive: false,
    isDowned: false,
    extraStats: { 'Spell DC': 15 },
  },
  {
    id: 'thane',
    name: 'Brother Thane',
    class: 'Cleric',
    race: 'Dwarf',
    level: 5,
    hp: 40,
    maxHp: 45,
    ac: 16,
    speed: 25,
    avatar: '☽',
    statusEffects: [],
    isActive: false,
    isDowned: false,
    extraStats: { 'Channel': '2/2' },
  },
  {
    id: 'vex',
    name: 'Vex Shadowstep',
    class: 'Rogue',
    race: 'Tiefling',
    level: 5,
    hp: 8,
    maxHp: 36,
    ac: 15,
    speed: 30,
    avatar: '🗡',
    statusEffects: ['Burning 1d4'],
    isActive: false,
    isDowned: false,
    extraStats: { 'Sneak Atk': '3d6' },
  },
];

const DEFAULT_INITIATIVE: InitiativeEntry[] = [
  { id: 'aldric',   name: 'Aldric',           roll: 22, isEnemy: false, isCurrent: true  },
  { id: 'wraith',   name: 'Shadow Wraith',     roll: 19, isEnemy: true,  isCurrent: false },
  { id: 'lyra',     name: 'Lyra',              roll: 17, isEnemy: false, isCurrent: false },
  { id: 'skelarch', name: 'Skeleton Archer',   roll: 14, isEnemy: true,  isCurrent: false },
  { id: 'vex',      name: 'Vex',               roll: 11, isEnemy: false, isCurrent: false },
  { id: 'thane',    name: 'Thane',             roll: 8,  isEnemy: false, isCurrent: false },
];

const DEFAULT_WORLD: WorldState = {
  locationName: 'The Vault of Shadows',
  biome: 'Gothic Horror · Underground',
  description: "A collapsed necromancer's treasury. Bones and scattered coin. The ceiling breathes.",
  conditions: ['Darkness', 'Difficult Terrain', 'Unhallowed'],
  round: 3,
  inCombat: true,
};

const DEFAULT_TOKENS: TokenPosition[] = [
  { id: 'aldric',   name: 'Aldric',         type: 'player', avatar: '⚔', x: 42, y: 45, isActive: true  },
  { id: 'lyra',     name: 'Lyra',           type: 'player', avatar: '✦', x: 48, y: 52, isActive: false },
  { id: 'thane',    name: 'Thane',          type: 'player', avatar: '☽', x: 38, y: 48, isActive: false },
  { id: 'vex',      name: 'Vex',            type: 'player', avatar: '🗡', x: 52, y: 40, isActive: false },
  { id: 'wraith',   name: 'Shadow Wraith',  type: 'enemy',  avatar: '☠', x: 60, y: 35, isActive: false },
  { id: 'skelarch', name: 'Skel. Archer',   type: 'enemy',  avatar: '🏹', x: 68, y: 30, isActive: false },
  { id: 'merchant', name: 'Merchant',       type: 'npc',    avatar: '?', x: 45, y: 65, isActive: false },
];

// ── Store ─────────────────────────────────────────────────

let _idCounter = 0;
const uid = () => `${Date.now()}-${_idCounter++}`;

export const useGameStore = create<GameStore>((set, get) => ({

  // ── Narrative ───────────────────────────────────────────
  narrativeHistory: [
    {
      id: uid(),
      speaker: 'dm',
      speakerLabel: 'Dungeon Master',
      text: "The torchlight gutters and nearly dies as a shadow coils across the vault ceiling. The wraith descends — a shrieking column of darkness and cold — its hollow eyes finding Aldric first. You hear the distant scream of someone it once was.",
      timestamp: Date.now(),
    },
  ],

  appendNarrative: (entry) =>
    set((s) => ({
      narrativeHistory: [
        ...s.narrativeHistory,
        { ...entry, id: uid(), timestamp: Date.now() },
      ],
    })),

  clearNarrative: () => set({ narrativeHistory: [] }),

  // ── Combat log ─────────────────────────────────────────
  combatLog: [
    { id: uid(), text: '— encounter begins: round 1 —', type: 'system', timestamp: Date.now() },
    { id: uid(), text: 'Aldric moves to E4', type: 'move', timestamp: Date.now() },
    { id: uid(), text: 'Aldric → Wraith · longsword · roll 18 · hit · 12 dmg', type: 'attack', timestamp: Date.now() },
    { id: uid(), text: 'Lyra casts Ray of Enfeeblement → Wraith · CON save 12 · fail', type: 'spell', timestamp: Date.now() },
    { id: uid(), text: 'Vex: sneak attack → Skeleton · 3d6+4 = 16 dmg · crit!', type: 'attack', timestamp: Date.now() },
    { id: uid(), text: '— round 3 begins — Aldric\'s turn —', type: 'system', timestamp: Date.now() },
  ],

  appendLog: (text, type) =>
    set((s) => ({
      combatLog: [
        ...s.combatLog.slice(-99), // keep last 100
        { id: uid(), text, type, timestamp: Date.now() },
      ],
    })),

  // ── Party ───────────────────────────────────────────────
  party: DEFAULT_PARTY,
  setParty: (party) => set({ party }),
  updateCharacter: (id, updates) =>
    set((s) => ({
      party: s.party.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),

  // ── Initiative ──────────────────────────────────────────
  initiative: DEFAULT_INITIATIVE,
  setInitiative: (order) => set({ initiative: order }),

  // ── World ───────────────────────────────────────────────
  world: DEFAULT_WORLD,
  setWorld: (updates) =>
    set((s) => ({ world: { ...s.world, ...updates } })),

  // ── Tokens ─────────────────────────────────────────────
  tokens: DEFAULT_TOKENS,
  setTokens: (tokens) => set({ tokens }),
  moveToken: (id, x, y) =>
    set((s) => ({
      tokens: s.tokens.map((t) => (t.id === id ? { ...t, x, y } : t)),
    })),
  addToken: (token) =>
    set((s) => ({ tokens: [...s.tokens, token] })),
  removeToken: (id) =>
    set((s) => ({ tokens: s.tokens.filter((t) => t.id !== id) })),

  // ── Dynamic slots ───────────────────────────────────────
  dynamicSlots: {},
  mountComponent: (slot, componentName) =>
    set((s) => ({
      dynamicSlots: { ...s.dynamicSlots, [slot]: componentName },
    })),

  // ── Theme ───────────────────────────────────────────────
  theme: 'dark-gothic',
  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },

  // ── Session stats ───────────────────────────────────────
  sessionStats: { kills: 3, gold: 247, xp: 1200 },
  updateSessionStats: (updates) =>
    set((s) => ({ sessionStats: { ...s.sessionStats, ...updates } })),

  // ── Streaming ───────────────────────────────────────────
  isDmTyping: false,
  setDmTyping: (v) => set({ isDmTyping: v }),

  // ── Spell FX ────────────────────────────────────────────
  spellFxQueue: [],
  triggerSpellFx: (x, y, color = '#6eb5d4') =>
    set((s) => ({
      spellFxQueue: [...s.spellFxQueue, { id: uid(), x, y, color }],
    })),
  consumeSpellFx: (id) =>
    set((s) => ({
      spellFxQueue: s.spellFxQueue.filter((fx) => fx.id !== id),
    })),

  // ── Screen shake ─────────────────────────────────────────
  isShaking: false,
  triggerShake: () => {
    set({ isShaking: true });
    setTimeout(() => set({ isShaking: false }), 600);
  },

  // ── Master UI instruction dispatcher ────────────────────
  applyUIInstruction: (instruction) => {
    const store = get();
    switch (instruction.type) {
      case 'update_theme':
        store.setTheme(instruction.theme);
        break;

      case 'mount_component':
        store.mountComponent(instruction.slot, instruction.componentName);
        break;

      case 'update_stats':
        instruction.party.forEach((update) => {
          if (update.id) store.updateCharacter(update.id, update);
        });
        break;

      case 'update_world':
        store.setWorld(instruction.world);
        break;

      case 'update_initiative':
        store.setInitiative(instruction.order);
        break;

      case 'move_token':
        store.moveToken(instruction.tokenId, instruction.x, instruction.y);
        break;

      case 'add_token':
        store.addToken(instruction.token);
        break;

      case 'remove_token':
        store.removeToken(instruction.tokenId);
        break;

      case 'update_session':
        store.updateSessionStats(instruction.stats);
        break;

      case 'screen_shake':
        store.triggerShake();
        break;

      case 'spell_effect':
        store.triggerSpellFx(instruction.x, instruction.y, instruction.color);
        break;
    }
  },
}));