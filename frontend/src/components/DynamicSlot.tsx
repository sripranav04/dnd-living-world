import { lazy, Suspense } from 'react'
import { useGameStore } from '../store/gameStore'

interface Props {
  slot: string
}

export function DynamicSlot({ slot }: Props) {
  const slotData = useGameStore((s) => s.dynamicSlots[slot])

  if (!slotData) return null

  const componentMap: Record<string, React.LazyExoticComponent<any>> = {
    EnvironmentBanner: lazy(() => import('./dynamic/EnvironmentBanner')),
    NarrativeCard:     lazy(() => import('./dynamic/NarrativeCard')),
    CombatHUD:         lazy(() => import('./dynamic/CombatHUD')),
    LootDisplay:       lazy(() => import('./dynamic/LootDisplay')),
    SpellEffect:       lazy(() => import('./dynamic/SpellEffect')),
  }

  const Component = componentMap[slotData.componentName]

  if (!Component) {
    console.warn(`DynamicSlot: unknown component "${slotData.componentName}"`)
    return null
  }

  return (
    <Suspense fallback={
      <div style={{ height: 60, background: 'var(--bg-surface)', borderRadius: 8, opacity: 0.4 }} />
    }>
      <Component data={slotData.payload} />
    </Suspense>
  )
}
