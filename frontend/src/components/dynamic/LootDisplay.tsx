export default function LootDisplay({ data }: { data: any }) {
  const items: string[] = data?.items || []
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 8 }}>LOOT FOUND</div>
      {items.map((item, i) => (
        <div key={i} style={{ fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>{item}</div>
      ))}
    </div>
  )
}
