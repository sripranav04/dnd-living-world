export default function CombatHUD({ data }: { data: any }) {
  const combatants: any[] = data?.combatants || []
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>COMBAT</div>
      {combatants.map((c: any) => (
        <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ width: 100, fontSize: 13 }}>{c.name}</span>
          <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
            <div style={{ width: `${(c.hp / c.max_hp) * 100}%`, height: '100%', background: 'var(--health-bar)', borderRadius: 3, transition: 'width 0.5s' }} />
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.hp}/{c.max_hp}</span>
        </div>
      ))}
    </div>
  )
}
