import React from 'react'

export default function StatCard({ title, value, color }) {
  return (
    <div className="card glass">
      <div className="stat">
        <div>{title}</div>
        <div className="big" style={{ color }}>{value}</div>
      </div>
    </div>
  )
}
