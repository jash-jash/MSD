import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Glass from '../components/Glass'
import { ls } from '../utils/storage'

const btnHover = { y: -1.5, scale: 1.02 }
const btnTap = { y: 0, scale: 0.98 }

export default function Login({ setUserType, setPage, studentId, setStudentId, teacherName, setTeacherName, sections, seed }) {
  const doLoginStudent = () => {
    const exists =
      sections.some((sec) => sec.students?.some((s) => s.id === studentId)) ||
      Object.values(seed).some((sec) => sec.students.some((s) => s.id === studentId))
    if (!exists) return alert('Invalid Student ID. Try 231FA04001.')
    setUserType('student'); setPage('student')
  }
  const doLoginTeacher = (u, p) => {
    if (!u || !p) return alert('Enter both username & password')
    setUserType('teacher'); setPage('teacher')
  }

  return (
    <div className="grid">
      <Glass className="card" style={{ gridColumn: 'span 6' }}>
        <h3 style={{ margin: '0 0 8px 0' }}>
          <span className="material-icons" style={{ color: '#22c55e', verticalAlign: 'middle' }}>verified_user</span>{' '}
          Student Login
        </h3>
        <div className="row">
          <input
            className="input"
            placeholder="Student ID (e.g., 231FA04001)"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value.trim())}
          />
        </div>
        <motion.button whileHover={btnHover} whileTap={btnTap} className="btn purple" style={{ marginTop: 10 }} onClick={doLoginStudent}>
          <span className="material-icons" style={{ verticalAlign: 'middle' }}>login</span>{' '}
          Login as Student
        </motion.button>
      </Glass>

      <Glass className="card" style={{ gridColumn: 'span 6' }}>
        <h3 style={{ margin: '0 0 8px 0' }}>
          <span className="material-icons" style={{ color: '#06b6d4', verticalAlign: 'middle' }}>manage_accounts</span>{' '}
          Teacher Login
        </h3>
        <div className="row">
          <input className="input" placeholder="Username" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
          <input className="input" placeholder="Password" type="password" />
        </div>
        <motion.button whileHover={btnHover} whileTap={btnTap} className="btn blue" style={{ marginTop: 10 }} onClick={() => doLoginTeacher(teacherName, 'pass')}>
          <span className="material-icons" style={{ verticalAlign: 'middle' }}>login</span>{' '}
          Login as Teacher
        </motion.button>
      </Glass>
    </div>
  )
}
