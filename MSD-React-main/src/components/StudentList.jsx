import React from 'react'
import { motion } from 'framer-motion'

const btnHover = { y: -1.5, scale: 1.02 }
const btnTap = { y: 0, scale: 0.98 }

export default function StudentList({ students, markAttendance, notifyOne }) {
  return (
    <ul className="list" style={{ marginTop: 12 }}>
      {(students || []).map((st) => (
        <li
          key={st._id || st.id}
          className="glass"
          style={{ border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <div>
            <strong>{st.name}</strong> <span style={{ opacity: 0.85 }}>({st.id})</span>
          </div>
          <div className="row">
            <span className={`pill ${st.status === 'present' ? 'green' : 'red'}`}>
              {st.status === 'present' ? 'Present' : 'Absent'}
            </span>
            <motion.button
              whileHover={btnHover}
              whileTap={btnTap}
              className="btn green"
              onClick={() => markAttendance(st.id, 'present')}
            >
              + Present
            </motion.button>
            <motion.button
              whileHover={btnHover}
              whileTap={btnTap}
              className="btn red"
              onClick={() => markAttendance(st.id, 'absent')}
            >
              + Absent
            </motion.button>
            <motion.button
              whileHover={btnHover}
              whileTap={btnTap}
              className="btn"
              onClick={() => notifyOne(st.id, 'Your recent attendance needs attention.')}
            >
              <span className="material-icons" style={{ verticalAlign: 'middle' }}>
                notifications_active
              </span>{' '}
              Notify
            </motion.button>
          </div>
        </li>
      ))}
    </ul>
  )
}
