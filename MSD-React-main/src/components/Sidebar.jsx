import React from 'react'
import { motion } from 'framer-motion'

const btnHover = { y: -1.5, scale: 1.02 }
const btnTap = { y: 0, scale: 0.98 }

export default function Sidebar({ page, setPage, sidebarOpen, setSidebarOpen, dark, setDark, userType }) {
  return (
    <>
      <div className="sidebar glass" style={{ borderColor: 'rgba(124,58,237,0.35)' }}>
        <div className="brand">
          <span className="material-icons">bolt</span>
          <span className="shine">HyperAttend</span>
        </div>
        <div className="tagline">Neon-glass attendance dashboard</div>

        <div className="nav">
          <motion.button
            whileHover={btnHover}
            whileTap={btnTap}
            className={
              page === (userType === 'teacher' ? 'teacher' : userType ? 'student' : 'login') ? 'active' : ''
            }
            onClick={() =>
              setPage(userType ? (userType === 'teacher' ? 'teacher' : 'student') : 'login')
            }
          >
            <span className="material-icons">dashboard</span> Dashboard
          </motion.button>

          <motion.button
            whileHover={btnHover}
            whileTap={btnTap}
            className={page === 'calendar' ? 'active' : ''}
            onClick={() => setPage('calendar')}
          >
            <span className="material-icons">calendar_month</span> Calendar
          </motion.button>

          <motion.button
            whileHover={btnHover}
            whileTap={btnTap}
            className={page === 'analytics' ? 'active' : ''}
            onClick={() => setPage('analytics')}
          >
            <span className="material-icons">query_stats</span> Analytics
          </motion.button>

          <motion.button
            whileHover={btnHover}
            whileTap={btnTap}
            className={page === 'notifications' ? 'active' : ''}
            onClick={() => setPage('notifications')}
          >
            <span className="material-icons">notifications</span>&nbsp;Notifications
          </motion.button>

          <motion.button
            whileHover={btnHover}
            whileTap={btnTap}
            className={page === 'settings' ? 'active' : ''}
            onClick={() => setPage('settings')}
          >
            <span className="material-icons">settings</span> Settings
          </motion.button>
        </div>

        <div style={{ flex: 1 }} />

        <div className="toggle-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-icons">dark_mode</span> Theme
          </div>
          <div
            className={`toggle ${dark ? 'on' : ''}`}
            role="button"
            aria-label="Toggle dark mode"
            onClick={() => setDark((d) => !d)}
          >
            <div className="knob" />
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Toggle */}
      <motion.button
        whileHover={btnHover}
        whileTap={btnTap}
        className="collapse btn purple"
        onClick={() => setSidebarOpen((s) => !s)}
      >
        <span className="material-icons">{sidebarOpen ? 'close' : 'menu'}</span>
      </motion.button>
    </>
  )
}
