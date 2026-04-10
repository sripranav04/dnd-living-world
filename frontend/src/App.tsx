import React, { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { TopBar } from './components/panels/TopBar';
import { LeftPanel } from './components/panels/LeftPanel';
import { MapViewport } from './components/panels/MapViewport';
import { NarrativePanel } from './components/panels/NarrativePanel';
import { RightPanel } from './components/panels/RightPanel';
import { DynamicSlot } from './components/DynamicSlot';
import './styles/themes.css';

// ── App ───────────────────────────────────────────────────

export default function App() {
  const theme = useGameStore((s) => s.theme);

  // Sync initial theme to <html data-theme>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div style={ROOT_STYLE}>
      {/* ── Top bar ── */}
      <TopBar />

      {/* ── Main 3-column layout ── */}
      <div style={MAIN_STYLE}>

        {/* Left — party / initiative */}
        <LeftPanel />

        {/* Center — map + narrative stacked */}
        <div style={CENTER_STYLE}>
          {/* Map viewport (upper) */}
          <div style={MAP_AREA_STYLE}>
            <MapViewport />
            {/* Dynamic overlay slot — agent can mount components here */}
            <DynamicSlot
              slot="map-overlay"
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 20,
              }}
            />
          </div>

          {/* Narrative + input (lower) */}
          <div style={NARRATIVE_AREA_STYLE}>
            <NarrativePanel />
            {/* Dynamic slot below narrative — e.g. LootDisplay */}
            <DynamicSlot slot="narrative-extra" />
          </div>
        </div>

        {/* Right — environment / dice / combat log */}
        <RightPanel />
      </div>

      {/* Full-screen overlay slot — for cutscenes, level-up screens, etc. */}
      <DynamicSlot
        slot="fullscreen"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
        }}
      />
    </div>
  );
}

// ── Inline layout styles ──────────────────────────────────
// Using inline styles for the structural skeleton so Vite HMR
// never blows away layout during component hot-reloads.

const ROOT_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  overflow: 'hidden',
  background: 'var(--color-bg-base)',
  color: 'var(--color-text-primary)',
};

const MAIN_STYLE: React.CSSProperties = {
  flex: 1,
  display: 'grid',
  gridTemplateColumns: '280px 1fr 260px',
  overflow: 'hidden',
  minHeight: 0,
};

const CENTER_STYLE: React.CSSProperties = {
  display: 'grid',
  gridTemplateRows: '1fr 240px',
  overflow: 'hidden',
  minHeight: 0,
  position: 'relative',
};

const MAP_AREA_STYLE: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  minHeight: 0,
};

const NARRATIVE_AREA_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  minHeight: 0,
};