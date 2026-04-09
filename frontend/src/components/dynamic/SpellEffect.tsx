import { useEffect, useState } from 'react'

export default function SpellEffect({ data }: { data: any }) {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3000)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null
  return (
    <div style={{ textAlign: 'center', padding: 20, fontSize: 28, color: 'var(--accent)' }}>
      {data?.emoji || '?'} {data?.name} {data?.emoji || '?'}
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{data?.description}</div>
    </div>
  )
}
