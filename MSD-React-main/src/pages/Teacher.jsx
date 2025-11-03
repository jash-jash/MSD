import React, { useState } from 'react'
import Glass from '../components/Glass'
import StudentList from '../components/StudentList'
import { motion } from 'framer-motion'
import { exportCSV, exportPDF } from './shared'

const btnHover = { y: -1.5, scale: 1.02 }
const btnTap = { y: 0, scale: 0.98 }

export default function Teacher({ sections, sectionId, setSectionId, currentSection, markAttendance, notifyOne, sectionTodayRows, addStudent }) {
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="grid">
      <Glass className="card" style={{ gridColumn: 'span 12' }}>
        <div className="row" style={{ alignItems: 'center' }}>
          <select className="select" value={sectionId || ''} onChange={(e) => setSectionId(e.target.value)} style={{ maxWidth: 320 }}>
            {sections.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>

          <motion.button whileHover={btnHover} whileTap={btnTap} className="btn green" onClick={async () => {
            const s = currentSection; if (!s) return;
            await Promise.all((s.students || []).map((st) => markAttendance(st.id, 'present')))
          }}>
            <span className="material-icons" style={{ verticalAlign: 'middle' }}>task_alt</span> Mark All Present
          </motion.button>

          <motion.button whileHover={btnHover} whileTap={btnTap} className="btn red" onClick={async () => {
            const s = currentSection; if (!s) return;
            await Promise.all((s.students || []).map((st) => markAttendance(st.id, 'absent')))
          }}>
            <span className="material-icons" style={{ verticalAlign: 'middle' }}>cancel</span> Mark All Absent
          </motion.button>

          <div style={{ flex: 1 }} />

          <button className="btn" onClick={() => exportCSV(`Section-${sectionId}-Today`, sectionTodayRows(sectionId))}>
            <span className="material-icons" style={{ verticalAlign: 'middle' }}>grid_on</span> Export CSV
          </button>
          <button className="btn" onClick={() => exportPDF(`Section-${sectionId}-Today`, sectionTodayRows(sectionId))}>
            <span className="material-icons" style={{ verticalAlign: 'middle' }}>picture_as_pdf</span> Export PDF
          </button>

          <motion.button whileHover={btnHover} whileTap={btnTap} className="btn purple" onClick={() => setShowAdd((s) => !s)}>
            <span className="material-icons" style={{ verticalAlign: 'middle' }}>person_add</span> {showAdd ? 'Close' : 'Add Student'}
          </motion.button>
        </div>
      </Glass>

      {showAdd && (
        <div className="card glass" style={{ gridColumn: 'span 12' }}>
          <h3 style={{ marginTop: 0 }}>Add New Student</h3>
          <div className="split">
            <input id="newName" className="input" placeholder="Full Name" />
            <input id="newId" className="input" placeholder="Registration Number (unique)" />
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <select id="newSec" className="select" defaultValue={sectionId || ''} style={{ maxWidth: 320 }}>
              {sections.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            <motion.button whileHover={btnHover} whileTap={btnTap} className="btn green" onClick={async () => {
              const name = document.getElementById('newName').value.trim()
              const id = document.getElementById('newId').value.trim()
              const sec = document.getElementById('newSec').value
              if (!name || !id || !sec) return alert('Fill all fields')
              await addStudent(name, id, sec)
              setShowAdd(false); 
            }}>
              <span className="material-icons" style={{ verticalAlign: 'middle' }}>add_task</span> Add
            </motion.button>
          </div>
        </div>
      )}

      <Glass className="card" style={{ gridColumn: 'span 12' }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Students — {currentSection ? currentSection.name : '—'}</h3>
          <motion.button whileHover={btnHover} whileTap={btnTap} className="btn purple" onClick={() => {
            const s = currentSection; if (!s) return;
            Promise.all((s.students || []).map((st) => notifyOne(st.id, 'Your recent attendance needs attention.')))
              .then(() => alert(`Notifications sent to ${s.name}`))
          }}>
            <span className="material-icons" style={{ verticalAlign: 'middle' }}>campaign</span> Notify All
          </motion.button>
        </div>
        <StudentList students={currentSection?.students || []} markAttendance={markAttendance} notifyOne={notifyOne} />
      </Glass>
    </div>
  )
}
