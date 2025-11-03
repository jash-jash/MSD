import jsPDF from 'jspdf'
import 'jspdf-autotable'

export const THEME = {
  primary: '#7c3aed',
  blue: '#2563eb',
  cyan: '#06b6d4',
  green: '#22c55e',
  red: '#ef4444',
  amber: '#f59e0b',
  glass: 'rgba(255,255,255,0.12)',
  glassDark: 'rgba(16, 21, 35, 0.55)',
  border: 'rgba(255,255,255,0.18)',
}

export function ensureHistory(studentId, days = 31, fallbackStatus = 'present') {
  const key = `attendanceHistory_single_${studentId}`
  try {
    const v = localStorage.getItem(key)
    if (v) return JSON.parse(v).map((r) => ({ date: new Date(r.date), status: r.status }))
  } catch {}

  const hist = []
  for (let i = 0; i < days; i++) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const status = i === 0 ? fallbackStatus : Math.random() > 0.7 ? 'absent' : 'present'
    hist.push({ date, status })
  }
  localStorage.setItem(key, JSON.stringify(hist))
  return hist
}

export function exportCSV(fileName, rows) {
  if (!rows?.length) return alert('No data to export!')
  const header = 'Student ID,Student Name,Date,Status\n'
  const body = rows.map((r) => `${r.id},"${r.name}",${new Date(r.date).toLocaleDateString()},${r.status}`).join('\n')
  const blob = new Blob([header + body], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `Attendance_${fileName}.csv`
  document.body.appendChild(a); a.click(); a.remove()
}

export function exportPDF(fileName, rows) {
  if (!rows?.length) return alert('No data to export!')
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text(`Attendance Report — ${fileName}`, 14, 18)
  const data = rows.map((r) => [r.id, r.name, new Date(r.date).toLocaleDateString(), r.status[0].toUpperCase() + r.status.slice(1)])
  doc.autoTable({
    head: [['Student ID', 'Student Name', 'Date', 'Status']],
    body: data,
    startY: 26,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [124, 58, 237] },
  })
  doc.save(`Attendance_${fileName}.pdf`)
}
