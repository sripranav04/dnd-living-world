import React, { Suspense, lazy, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';

// ── Component map ─────────────────────────────────────────
// Add new dynamic components here as you build them.
// The agent references these by string name in mount_component instructions.

const COMPONENT_MAP: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  DungeonScene:       lazy(() => import('./dynamic/DungeonScene')),
  DungeonCombatScene: lazy(() => import('./dynamic/DungeonCombatScene')),
  ForestScene:        lazy(() => import('./dynamic/ForestScene')),
  ForestCombatScene:  lazy(() => import('./dynamic/ForestCombatScene')),
  TavernScene:        lazy(() => import('./dynamic/TavernScene')),
  NarrativeCard:      lazy(() => import('./dynamic/NarrativeCard')),
  EnvironmentBanner:  lazy(() => import('./dynamic/EnvironmentBanner')),
  CombatHUD:          lazy(() => import('./dynamic/CombatHUD')),
  // LootDisplay:        lazy(() => import('./dynamic/LootDisplay')),
  SpellEffect:        lazy(() => import('./dynamic/SpellEffect')),
};

// ── Fallback ──────────────────────────────────────────────

function SlotFallback() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px',
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      color: 'var(--color-text-muted)',
      letterSpacing: '0.15em',
    }}>
      LOADING…
    </div>
  );
}

// ── Error boundary ────────────────────────────────────────

interface ErrorBoundaryState { hasError: boolean; error?: Error }

class SlotErrorBoundary extends React.Component<
  React.PropsWithChildren<{ slotName: string }>,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error(`[DynamicSlot:${this.props.slotName}] component error:`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '8px 12px',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--color-text-danger)',
          opacity: 0.7,
          letterSpacing: '0.1em',
        }}>
          [{this.props.slotName}] component failed to load
        </div>
      );
    }
    return this.props.children;
  }
}

// ── DynamicSlot ───────────────────────────────────────────

interface DynamicSlotProps {
  /** The slot name — e.g. "game-canvas", "overlay-top" */
  slot: string;
  /** Optional wrapper class */
  className?: string;
  style?: React.CSSProperties;
}

export function DynamicSlot({ slot, className, style }: DynamicSlotProps) {
  const componentName = useGameStore((s) => s.dynamicSlots[slot]);

  const Component = useMemo(() => {
    if (!componentName) return null;
    const C = COMPONENT_MAP[componentName];
    if (!C) {
      console.warn(`[DynamicSlot] unknown component: "${componentName}"`);
      return null;
    }
    return C;
  }, [componentName]);

  if (!Component) return null;

  return (
    <SlotErrorBoundary slotName={slot}>
      <Suspense fallback={<SlotFallback />}>
        <div className={className} style={style}>
          <Component />
        </div>
      </Suspense>
    </SlotErrorBoundary>
  );
}