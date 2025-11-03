import React, { useEffect, useMemo, useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Glass from './components/Glass'
import Login from './pages/Login'
import Student from './pages/Student'
import Teacher from './pages/Teacher'
import Calendar from './pages/Calendar'
import Analytics from './pages/Analytics'
import Notifications from './pages/Notifications'
import Settings from './pages/Settings'
import { ls } from './utils/storage'
import { api } from './utils/api'

export default function App() {
  // Theme & layout
  const [dark, setDark] = useState(ls.get('darkMode_singlefile', true))
  useEffect(() => { document.body.classList.toggle('dark', dark); ls.set('darkMode_singlefile', dark) }, [dark])
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Page & auth-ish
  const [userType, setUserType] = useState(ls.get('userType_singlefile', null))
  const [page, setPage] = useState(userType ? (userType === 'teacher' ? 'teacher' : 'student') : 'login')
  useEffect(() => { if (userType) ls.set('userType_singlefile', userType); else ls.del('userType_singlefile') }, [userType])

  // Data
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [sectionId, setSectionId] = useState('')

  // seed for first paint (optional)
  function buildSeed(){
    const data = {}; let counter = 1
    for (let secNum = 1; secNum <= 19; secNum++) {
      const students = []
      for (let i = 0; i < 30; i++) {
        const id = `231FA04${String(counter).padStart(3, '0')}`
        students.push({ id, name: `Student ${id}`, status: Math.random() > 0.15 ? 'present' : 'absent' })
        counter++
      }
      data[secNum] = { id: secNum, name: `Section ${secNum}`, students }
    }
    return data
  }
  const [seed] = useState(buildSeed())

  // Fetch sections on load
  const loadSections = async () => {
    try {
      setLoading(true); setErr('')
      const list = await api('/api/sections')
      setSections(list || [])
      if (!sectionId && list?.length) setSectionId(list[0]._id)
    } catch (e) {
      setErr(e?.message || 'Failed to load sections. Ensure backend is running.')
    } finally { setLoading(false) }
  }
  useEffect(() => { loadSections() }, [])

  const currentSection = useMemo(() => {
    if (!sections?.length || !sectionId) return null
    return sections.find((s) => s._id === sectionId) || null
  }, [sections, sectionId])

  // Student auth-ish
  const [studentId, setStudentId] = useState(ls.get('studentId_singlefile', '231FA04001'))
  const [teacherName, setTeacherName] = useState(ls.get('teacherName_singlefile', ''))
  useEffect(() => ls.set('studentId_singlefile', studentId), [studentId])
  useEffect(() => ls.set('teacherName_singlefile', teacherName), [teacherName])

  // Lookup student across sections/seed
  const studentInfo = useMemo(() => {
    if (!studentId) return null
    for (const sec of sections) {
      const st = (sec.students || []).find((s) => s.id === studentId)
      if (st) return { ...st, section: sec.name, sectionObjectId: sec._id }
    }
    for (const sec of Object.values(seed)) {
      const st = sec.students.find((s) => s.id === studentId)
      if (st) return { ...st, section: sec.name, sectionObjectId: null }
    }
    return null
  }, [studentId, sections, seed])

  // Notifications
  const [notifications, setNotifications] = useState([])
  const loadNotifications = async (sid) => {
    try { const data = await api(`/api/notifications/${sid}`); setNotifications(Array.isArray(data) ? data : []) }
    catch { setNotifications([]) }
  }
  useEffect(() => { if (userType === 'student' && studentInfo?.id) loadNotifications(studentInfo.id) }, [userType, studentInfo?.id])

  // Actions
  const logout = () => { setUserType(null); setPage('login'); setTeacherName('') }
  const refreshAfterChange = async () => { await loadSections() }
  const addStudent = async (name, id, secMongoId) => {
    try {
      if (!name || !id || !secMongoId) return alert('Fill all fields')
      setLoading(true); setErr('')
      await api('/api/students', { method: 'POST', body: JSON.stringify({ name, id, sectionId: secMongoId }) })
      await refreshAfterChange()
      alert('Student added ✅')
    } catch (e) { alert(`Add student failed: ${e?.message || 'Unknown error'}`) }
    finally { setLoading(false) }
  }
  const markAttendance = async (sid, status) => {
    try {
      setErr('')
      await api('/api/attendance/mark', { method: 'POST', body: JSON.stringify({ studentId: sid, status }) })
      // sync day 0 in local history
      const key = `attendanceHistory_single_${sid}`
      try {
        const v = localStorage.getItem(key)
        const hist = v ? JSON.parse(v).map((r) => ({ ...r, date: new Date(r.date) })) : []
        if (hist[0]) { hist[0].status = status; localStorage.setItem(key, JSON.stringify(hist)) }
      } catch {}
      await refreshAfterChange()
    } catch (e) { alert(`Mark failed: ${e?.message || 'Unknown error'}`) }
  }
  const notifyOne = async (sid, message) => {
    try {
      const teacher = teacherName || 'Unknown'
      await api('/api/notifications', { method: 'POST', body: JSON.stringify({ studentId: sid, teacher, message }) })
      if (userType === 'student' && studentInfo?.id === sid) await loadNotifications(sid)
      alert('Notification sent! ✅')
    } catch (e) { alert(`Notification failed: ${e?.message || 'Unknown error'}`) }
  }
  const sectionTodayRows = (sectionMongoId) => {
    const s = sections.find((x) => x._id === sectionMongoId)
    if (!s) return []
    return (s.students || []).map((st) => {
      const h = [{ date: new Date(), status: st.status }][0]
      return { id: st.id, name: st.name, date: h.date, status: h.status }
    })
  }

  // Styles injected (same as your single-file)
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      :root{
        --bg:#060915; --bg-light:#0d1224;
        --card:rgba(255,255,255,0.12); --card-dark:rgba(16,21,35,0.55);
        --border:rgba(255,255,255,0.18); --text-inv:#eaf0ff;
      }
      *{box-sizing:border-box}
      html, body, #root{height:100%}
      body{margin:0;font-family:Poppins, Space Grotesk, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
        background: linear-gradient(120deg, var(--bg) 0%, #020408 100%); color: var(--text-inv); overflow-x:hidden; transition: background .3s ease, color .3s ease;}
      body::before{content:""; position: fixed; inset: -30vh -30vw;
        background: radial-gradient(70rem 60rem at -10% -10%, #6a00ff33, transparent 60%),
                    radial-gradient(60rem 55rem at 110% 15%, #00e5ff33, transparent 60%),
                    radial-gradient(80rem 70rem at 50% 120%, #ff00aa22, transparent 60%);
        pointer-events:none; z-index:-3; filter: blur(30px) saturate(120%);}
      .glass{ background: var(--card); border: 1px solid var(--border); border-radius: 16px; backdrop-filter: blur(16px) saturate(140%);
        box-shadow: 0 10px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1); }
      .dark .glass{ background: var(--card-dark) }
      .layout{ display:flex; min-height:100vh; gap:18px; padding:18px }
      .sidebar{ width: 280px; padding:16px; position: sticky; top:18px; height: calc(100vh - 36px); display:flex; flex-direction:column; gap:14px }
      .brand{ display:flex; align-items:center; gap:10px; font-weight:800; font-size:20px; letter-spacing:.3px }
      .brand .material-icons{ color:#06b6d4; text-shadow:0 0 14px #06b6d455 }
      .tagline{ font-size:12px; opacity:.75; margin-top:-6px }
      .nav{ display:flex; flex-direction:column; gap:10px; margin-top:8px }
      .nav button{ all:unset; cursor:pointer; padding:12px 14px; border-radius:12px; display:flex; align-items:center; gap:12px; color:#d9defe; border:1px solid transparent; transition:.2s ease }
      .nav button:hover{ background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.16); box-shadow: 0 0 0 3px rgba(124,58,237,.18) inset }
      .nav .active{ background: linear-gradient(180deg, rgba(124,58,237,.3), rgba(124,58,237,.1)); border-color: rgba(124,58,237,.55); color:#fff }
      .collapse{ display:none; position: fixed; left:16px; bottom:16px; z-index:5 }
      .main{ flex:1; display:flex; flex-direction:column; gap:18px }
      .header{ display:flex; align-items:center; justify-content:space-between; padding:16px 18px }
      .heading{ font-weight:800; letter-spacing:.3px; font-size:18px; display:flex; align-items:center; gap:10px }
      .heading .shine{ background: linear-gradient(90deg, #fff, #b9c0ff, #fff); -webkit-background-clip:text; background-clip:text; color:transparent; background-size: 300% 100%; animation: shine 4s ease-in-out infinite }
      @keyframes shine { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
      .actions{ display:flex; gap:10px }
      .btn{ all:unset; cursor:pointer; padding:10px 14px; border:1px solid rgba(255,255,255,0.16); border-radius:12px; background: linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06)); transition: transform .15s ease }
      .btn.purple{ background: linear-gradient(180deg, rgba(124,58,237,0.42), rgba(124,58,237,0.14)); border-color: rgba(124,58,237,0.6); box-shadow: 0 0 18px #7c3aed22 }
      .btn.green{ background: linear-gradient(180deg, rgba(34,197,94,0.35), rgba(34,197,94,0.12)); border-color: rgba(34,197,94,0.6) }
      .btn.red{ background: linear-gradient(180deg, rgba(239,68,68,0.35), rgba(239,68,68,0.12)); border-color: rgba(239,68,68,0.6) }
      .btn.blue{ background: linear-gradient(180deg, rgba(37,99,235,0.35), rgba(37,99,235,0.12)); border-color: rgba(37,99,235,0.6) }
      .grid{ display:grid; grid-template-columns: repeat(12, 1fr); gap:14px }
      .card{ padding:16px }
      .stat{ display:flex; flex-direction:column; gap:6px } .stat .big{ font-size:28px; font-weight:800 }
      .list{ list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px }
      .list li{ padding: 10px 12px; border-radius: 12px; display:flex; align-items:center; justify-content:space-between; gap: 10px }
      .pill{ padding:6px 10px; border-radius: 999px; font-size:12px; letter-spacing:.3px; border:1px solid transparent }
      .pill.green{ background: rgba(34,197,94,0.18); border-color: rgba(34,197,94,0.5) }
      .pill.red{ background: rgba(239,68,68,0.18); border-color: rgba(239,68,68,0.5) }
      .pill.blue{ background: rgba(59,130,246,0.18); border-color: rgba(59,130,246,0.5) }
      .select, .input{ width:100%; padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,0.22); background: rgba(255,255,255,0.08); color:#fff; outline:none }
      .row{ display:flex; gap:10px; flex-wrap:wrap }
      .split{ display:grid; grid-template-columns: 1fr 1fr; gap: 14px }
      .toggle-row{ display:flex; align-items:center; justify-content:space-between }
      .toggle{ width:64px; height:36px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); border-radius:999px; position:relative }
      .knob{ position:absolute; top:4px; left:4px; width:28px; height:28px; border-radius:50%; background: linear-gradient(180deg,#fff,#d7defa);
        box-shadow: 0 6px 16px rgba(0,0,0,0.3), 0 0 0 4px rgba(255,255,255,0.06) inset; transition: transform .25s ease }
      .toggle.on .knob{ transform: translateX(28px) }
      @media (max-width: 1100px){
        .layout{ padding:14px }
        .sidebar{ position: fixed; z-index: 6; inset: 14px auto 14px 14px; height: auto; max-height: calc(100vh - 28px); transform: translateX(${sidebarOpen ? 0 : '-120%'}); transition: transform .25s ease; }
        .collapse{ display:block }
        .main{ margin-left: 0 }
      }`
    document.head.appendChild(style)
    return () => style.remove()
  }, [sidebarOpen])

  // Header logout
  const Header = () => (
    <Glass className="header">
      <div className="heading">
        <span className="material-icons">auto_awesome</span>
        <span className="shine">{userType ? (userType === 'teacher' ? 'Teacher Panel' : 'Student Panel') : 'Welcome'}</span>
      </div>
      <div className="actions">
        {userType && (
          <button className="btn" onClick={() => { setUserType(null); setPage('login') }}>
            <span className="material-icons" style={{ verticalAlign: 'middle' }}>logout</span> Logout
          </button>
        )}
      </div>
    </Glass>
  )

  return (
    <div className="layout">
      <Sidebar page={page} setPage={setPage} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} dark={dark} setDark={setDark} userType={userType} />

      <div className="main">
        <Header />

        {(loading || err) && (
          <Glass className="card" style={{ padding: 12 }}>
            {loading && <div>Loading from backend...</div>}
            {err && <div style={{ color: '#ffb4b4' }}><strong>Error:</strong> {err}</div>}
          </Glass>
        )}

        {page === 'login' && (
          <Login setUserType={setUserType} setPage={setPage}
                 studentId={studentId} setStudentId={setStudentId}
                 teacherName={teacherName} setTeacherName={setTeacherName}
                 sections={sections} seed={{ ...seed }} />
        )}

        {page === 'student' && userType === 'student' && (
          <Student studentInfo={(() => {
            if (!studentId) return null
            for (const sec of sections) {
              const st = (sec.students || []).find((s) => s.id === studentId)
              if (st) return { ...st, section: sec.name, sectionObjectId: sec._id }
            }
            return null
          })()} />
        )}

        {page === 'teacher' && userType === 'teacher' && (
          <Teacher
            sections={sections}
            sectionId={sectionId}
            setSectionId={setSectionId}
            currentSection={sections.find((s) => s._id === sectionId)}
            markAttendance={markAttendance}
            notifyOne={notifyOne}
            sectionTodayRows={sectionTodayRows}
            addStudent={addStudent}
          />
        )}

        {page === 'calendar' && <Calendar studentInfo={sections.flatMap(s => s.students.map(st => ({...st, section:s.name}))).find(st => st.id === studentId)} />}
        {page === 'analytics' && <Analytics />}
        {page === 'notifications' && <Notifications notifications={[]} />}
        {page === 'settings' && <Settings dark={dark} setDark={setDark} />}
      </div>
    </div>
  )
}
