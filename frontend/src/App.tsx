import React, { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { useGameStream } from './hooks/useGameStream';
import { TopBar } from './components/panels/TopBar';
import { LeftPanel } from './components/panels/LeftPanel';
import { MapViewport } from './components/panels/MapViewport';
import { NarrativePanel } from './components/panels/NarrativePanel';
import { RightPanel } from './components/panels/RightPanel';
import { DynamicSlot } from './components/DynamicSlot';
import './styles/themes.css';

// Inner component so useGameStream can share context with NarrativePanel
function GameShell() {
  const theme = useGameStore((s) => s.theme);
  const mountComponent = useGameStore((s) => s.mountComponent);
  const { sendAction } = useGameStream(); // mounts → triggers session/start

  // Mount the procedural scene immediately on load
  React.useEffect(() => {
    mountComponent('map-scene', 'DungeonScene');
  }, [mountComponent]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div style={ROOT_STYLE}>
      <TopBar onNewCampaign={function (): void {
        throw new Error('Function not implemented.');
      } } />
      <div style={MAIN_STYLE}>
        <LeftPanel />
        <div style={CENTER_STYLE}>
          <div style={MAP_AREA_STYLE}>
            {/* Scene fills entire map area — sits behind MapViewport overlay elements */}
            <DynamicSlot slot="map-scene" style={{
              position: 'absolute', inset: 0, zIndex: 0,
              width: '100%', height: '100%',
            }} />
            <MapViewport />
            <DynamicSlot slot="map-overlay" style={{
              position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20,
            }} />
          </div>
          <div style={NARRATIVE_AREA_STYLE}>
            <NarrativePanel sendAction={sendAction} />
            <DynamicSlot slot="narrative-extra" />
          </div>
        </div>
        <RightPanel />
      </div>
      <DynamicSlot slot="fullscreen" style={{ position: 'fixed', inset: 0, zIndex: 100 }} />
    </div>
  );
}

export default function App() {
  return <GameShell />;
}

const ROOT_STYLE: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', height: '100vh',
  overflow: 'hidden', background: 'var(--color-bg-base)', color: 'var(--color-text-primary)',
};
const MAIN_STYLE: React.CSSProperties = {
  flex: 1, display: 'grid', gridTemplateColumns: '280px 1fr 260px',
  overflow: 'hidden', minHeight: 0,
};
const CENTER_STYLE: React.CSSProperties = {
  display: 'grid', gridTemplateRows: '1fr 240px',
  overflow: 'hidden', minHeight: 0, position: 'relative',
};
const MAP_AREA_STYLE: React.CSSProperties = { position: 'relative', overflow: 'hidden', minHeight: 0 };
const NARRATIVE_AREA_STYLE: React.CSSProperties = { display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 };