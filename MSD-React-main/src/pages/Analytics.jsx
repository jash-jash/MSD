import React from 'react'
import Glass from '../components/Glass'

export default function Analytics() {
  return (
    <div className="grid">
      <Glass className="card" style={{ gridColumn: 'span 12' }}>
        <h3 style={{ marginTop: 0 }}>Analytics</h3>
        <div>Student analytics are shown on the Student dashboard chart.</div>
      </Glass>
    </div>
  )
}
