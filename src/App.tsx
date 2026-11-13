import { useEffect, useState } from 'react'
import type { AppData, Purchase } from './logic/data'
import { askToKeepData, load, save } from './storage'
import HomeScreen from './screens/HomeScreen'
import PurchaseScreen from './screens/PurchaseScreen'
import DaysScreen from './screens/DaysScreen'
import StoresScreen from './screens/StoresScreen'
import MoreScreen from './screens/MoreScreen'

export type Tab = 'home' | 'days' | 'add' | 'stores' | 'more'

export interface ScreenProps {
  data: AppData
  update: (next: AppData) => void
  go: (tab: Tab) => void
  edit: (p: Purchase) => void
  toast: (msg: string) => void
}

const TABS: { tab: Tab; label: string; icon: string }[] = [
  { tab: 'home', label: 'Home', icon: '⌂' },
  { tab: 'days', label: 'Days', icon: '☰' },
  { tab: 'add', label: 'Add', icon: '+' },
  { tab: 'stores', label: 'Stores', icon: '🛒' },
  { tab: 'more', label: 'More', icon: '⋯' }
]

export default function App() {
  const [data, setData] = useState<AppData>(load)
  const [tab, setTab] = useState<Tab>('home')
  const [editing, setEditing] = useState<Purchase | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => { void askToKeepData() }, [])
  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(''), 2500)
    return () => clearTimeout(t)
  }, [message])

  const update = (next: AppData) => {
    setData(next)
    if (!save(next)) setMessage('Could not save on this phone!')
  }
  const go = (t: Tab) => {
    setEditing(null)
    setTab(t)
    window.scrollTo(0, 0)
  }
  const props: ScreenProps = {
    data, update, go, toast: setMessage,
    edit: (p) => { setEditing(p); setTab('add'); window.scrollTo(0, 0) }
  }

  return (
    <>
      <main className="screen">
        {tab === 'home' && <HomeScreen {...props} />}
        {tab === 'add' && <PurchaseScreen key={editing?.id ?? 'new'} {...props} editing={editing} />}
        {tab === 'days' && <DaysScreen {...props} />}
        {tab === 'stores' && <StoresScreen {...props} />}
        {tab === 'more' && <MoreScreen {...props} />}
      </main>
      {message && <div className="toast" role="status">{message}</div>}
      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.tab} className={`tab ${t.tab === 'add' ? 'tab-add' : ''} ${tab === t.tab ? 'on' : ''}`} onClick={() => go(t.tab)}>
            <span className="tab-icon" aria-hidden>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
