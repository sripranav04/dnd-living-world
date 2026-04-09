export default function EnvironmentBanner({ data }: { data: any }) {
  return (
    <div style={{ borderLeft: '3px solid var(--accent)', paddingLeft: 12, marginBottom: 16 }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--accent)' }}>{data?.name}</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{data?.description}</div>
    </div>
  )
}
