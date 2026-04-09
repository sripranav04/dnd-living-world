export default function NarrativeCard({ data }: { data: any }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 12 }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>{data?.location}</p>
      <p style={{ lineHeight: 1.7 }}>{data?.description}</p>
    </div>
  )
}
