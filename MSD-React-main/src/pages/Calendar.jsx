import React, { useMemo } from 'react'
import Glass from '../components/Glass'
import { ensureHistory } from './shared'

export default function Calendar({ studentInfo }) {
  const history = useMemo(() => {
    if (!studentInfo) return []
    return ensureHistory(studentInfo.id, 31, studentInfo.status || 'present')
  }, [studentInfo])

  return (
    <div className="grid">
      <Glass className="card" style={{ gridColumn: 'span 12' }}>
        <h3 style={{ marginTop: 0 }}>This Month's Attendance</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 10, marginTop: 10 }}>
          {[...history].reverse().map((rec, i) => (
            <div key={i} className="glass" style={{
              textAlign: 'center', padding: 12,
              border: rec.status === 'present' ? '1px solid rgba(34,197,94,0.7)' : '1px solid rgba(239,68,68,0.7)',
              background: rec.status === 'present' ? 'linear-gradient(180deg,rgba(34,197,94,.18),rgba(34,197,94,.08))'
                                                   : 'linear-gradient(180deg,rgba(239,68,68,.18),rgba(239,68,68,.08))',
            }} title={`${rec.date.toLocaleDateString()}: ${rec.status}`}>
              <div style={{ fontWeight: 800 }}>{rec.date.getDate()}</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>{rec.status === 'present' ? 'Present' : 'Absent'}</div>
            </div>
          ))}
        </div>
      </Glass>
    </div>
  )
}
