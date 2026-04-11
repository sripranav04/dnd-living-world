import { create } from 'zustand';

// Shared dice state — bridges RightPanel (roller) and NarrativePanel (input)

export interface DiceRoll {
  expr: string;       // e.g. "d20", "2d6 [3+4]"
  total: number;
  sides: number;
  isCrit: boolean;
  isFumble: boolean;
  usedInAction: boolean;
}

interface DiceStore {
  lastRoll: DiceRoll | null;
  pendingRoll: DiceRoll | null;  // roll waiting to be used in an action
  setRoll: (roll: DiceRoll) => void;
  consumeRoll: () => void;       // called when player submits action with roll
  manualRoll: (total: number, sides: number) => void;
}

export const useDiceStore = create<DiceStore>((set) => ({
  lastRoll: null,
  pendingRoll: null,

  setRoll: (roll) => set({ lastRoll: roll, pendingRoll: roll }),

  consumeRoll: () => set((s) => ({
    pendingRoll: null,
    lastRoll: s.lastRoll ? { ...s.lastRoll, usedInAction: true } : null,
  })),

  manualRoll: (total, sides) => {
    const roll: DiceRoll = {
      expr: `d${sides} (manual)`,
      total,
      sides,
      isCrit: sides === 20 && total === 20,
      isFumble: sides === 20 && total === 1,
      usedInAction: false,
    };
    set({ lastRoll: roll, pendingRoll: roll });
  },
}));