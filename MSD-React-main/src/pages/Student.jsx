import React, { useMemo, useRef, useEffect } from 'react'
import Glass from '../components/Glass'
import StatCard from '../components/StatCard'
import Chart from 'chart.js/auto'
import { THEME, ensureHistory, exportCSV, exportPDF } from './shared'

export default function Student({ studentInfo }) {
  const history = useMemo(() => {
    if (!studentInfo) return []
    return ensureHistory(studentInfo.id, 31, studentInfo.status || 'present')
  }, [studentInfo])

  const stats = useMemo(() => {
    const total = history.length
    const present = history.filter((r) => r.status === 'present').length
    const absent = total - present
    const rate = total ? ((present / total) * 100).toFixed(2) : '0.00'
    return { total, present, absent, rate }
  }, [history])

  const chartRef = useRef(null)
  const chartObj = useRef(null)
  useEffect(() => {
    if (!chartRef.current) return
    chartObj.current?.destroy()
    const labels = [...history].reverse().map((h) => h.date.toLocaleDateString())
    const values = [...history].reverse().map((h) => (h.status === 'present' ? 1 : 0))
    const colors = [...history].reverse().map((h) => (h.status === 'present' ? THEME.green : THEME.red))
    chartObj.current = new Chart(chartRef.current, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Present (1)/Absent (0)', data: values, backgroundColor: colors, borderColor: colors, borderWidth: 1 }] },
      options: { scales: { y: { min: 0, max: 1, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false } } }
    })
    return () => { chartObj.current?.destroy(); chartObj.current = null }
  }, [history])

  if (!studentInfo) return null

  return (
    <div className="grid">
      <Glass className="card" style={{ gridColumn: 'span 12' }}>
        <h2 style={{ margin: 0 }}>Welcome back, <strong>{studentInfo.name}</strong></h2>
        <div style={{ opacity: 0.9, marginTop: 6 }}>ID: {studentInfo.id} &nbsp; | &nbsp; Section: {studentInfo.section}</div>
      </Glass>

      <div style={{ display: 'contents' }}>
        <div style={{ gridColumn: 'span 3' }}><StatCard title="Attendance Rate" value={`${stats.rate}%`} color={THEME.cyan} /></div>
        <div style={{ gridColumn: 'span 3' }}><StatCard title="Days Present" value={stats.present} color={THEME.green} /></div>
        <div style={{ gridColumn: 'span 3' }}><StatCard title="Days Absent" value={stats.absent} color={THEME.red} /></div>
        <div style={{ gridColumn: 'span 3' }}><StatCard title="Total Days" value={stats.total} /></div>
      </div>

      <Glass className="card" style={{ gridColumn: 'span 8' }}>
        <h3 style={{ marginTop: 0 }}>Recent Attendance</h3>
        <ul className="list">
          {history.slice(0, 7).map((r, i) => (
            <li key={i} className="glass" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
              <span>{r.date.toLocaleDateString()}</span>
              <span className={`pill ${r.status === 'present' ? 'green' : 'red'}`}>
                {r.status === 'present' ? 'Present' : 'Absent'}
              </span>
            </li>
          ))}
        </ul>
      </Glass>

      <Glass className="card" style={{ gridColumn: 'span 4' }}>
        <h3 style={{ marginTop: 0 }}>Export</h3>
        <div className="row">
          <button className="btn" onClick={() => exportCSV(studentInfo.id, history.map((h) => ({ ...h, id: studentInfo.id, name: studentInfo.name })))}>
            <span className="material-icons" style={{ verticalAlign: 'middle' }}>table_view</span> CSV
          </button>
          <button className="btn" onClick={() => exportPDF(studentInfo.id, history.map((h) => ({ ...h, id: studentInfo.id, name: studentInfo.name })))}>
            <span className="material-icons" style={{ verticalAlign: 'middle' }}>picture_as_pdf</span> PDF
          </button>
        </div>
      </Glass>

      <Glass className="card" style={{ gridColumn: 'span 12' }}>
        <h3 style={{ marginTop: 0 }}>Attendance Analytics</h3>
        <canvas ref={chartRef} style={{ width: '100%', height: 340 }} />
      </Glass>
    </div>
  )
}
