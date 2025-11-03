import React from 'react'
import Glass from '../components/Glass'

export default function Notifications({ notifications }) {
  return (
    <div className="grid">
      <Glass className="card" style={{ gridColumn: 'span 12' }}>
        <h3 style={{ marginTop: 0 }}>Notifications</h3>
        <ul className="list" style={{ marginTop: 12 }}>
          {(!notifications || notifications.length === 0) && (
            <li className="glass" style={{ padding: 14 }}>No notifications yet.</li>
          )}
          {notifications.slice().reverse().map((n, i) => (
            <li key={i} className="glass" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
              <div>
                <strong>{n.teacher || 'Teacher'}</strong>{' '}
                <span style={{ opacity: 0.8 }}>{new Date(n.date).toLocaleString()}</span>
              </div>
              <div style={{ opacity: 0.95 }}>{n.message}</div>
            </li>
          ))}
        </ul>
      </Glass>
    </div>
  )
}
