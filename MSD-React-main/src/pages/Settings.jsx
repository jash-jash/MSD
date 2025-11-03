import React from 'react'
import Glass from '../components/Glass'
import { BASE_URL } from '../utils/api'

export default function Settings({ dark, setDark }) {
  return (
    <div className="grid">
      <Glass className="card" style={{ gridColumn: 'span 12' }}>
        <h3 style={{ marginTop: 0 }}>Settings</h3>
        <div className="row">
          <div className="glass card" style={{ padding: 14 }}>
            <div className="toggle-row" style={{ gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-icons">dark_mode</span> Dark Mode
              </div>
              <div className={`toggle ${dark ? 'on' : ''}`} onClick={() => setDark((d) => !d)} role="button" aria-label="Toggle dark mode">
                <div className="knob" />
              </div>
            </div>
          </div>
          <div className="glass card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span className="material-icons">info</span> Info
            </div>
            <div style={{ opacity: 0.9, fontSize: 14 }}>Backend URL: <code>{BASE_URL}</code></div>
            <div style={{ opacity: 0.9, fontSize: 14, marginTop: 6 }}>Demo Student ID: <code>231FA04001</code></div>
          </div>
        </div>
      </Glass>
    </div>
  )
}
