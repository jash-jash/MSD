import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Chart from "chart.js/auto";
import jsPDF from "jspdf";
import "jspdf-autotable";

/**
 * App.jsx — Full neon/glass dashboard connected to your backend
 * - Attendance + Sections (via /api/sections populate)
 * - Add student (/api/students)
 * - Mark attendance (/api/attendance/mark)
 * - Notifications (/api/notifications + /api/notifications/:studentId)
 * - Analytics (local history synced with today's mark)
 * - CSV/PDF exports, animations, dark mode
 */

// ---------- Backend base URL ----------
const BASE_URL =
  import.meta.env?.VITE_API_URL?.replace(/\/+$/, "") || "http://localhost:5000";

// ---------- Theme ----------
const THEME = {
  primary: "#7c3aed",
  blue: "#2563eb",
  cyan: "#06b6d4",
  green: "#22c55e",
  red: "#ef4444",
  amber: "#f59e0b",
  glass: "rgba(255,255,255,0.12)",
  glassDark: "rgba(16, 21, 35, 0.55)",
  border: "rgba(255,255,255,0.18)",
};

const springy = { type: "spring", stiffness: 480, damping: 28, mass: 0.7 };
const pageVariants = {
  initial: { opacity: 0, y: 16, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1, transition: springy },
  exit: { opacity: 0, y: -6, scale: 0.985, transition: { duration: 0.16 } },
};
const btnHover = { y: -1.5, scale: 1.02 };
const btnTap = { y: 0, scale: 0.98 };

// ---------- LocalStorage helpers ----------
const ls = {
  get: (k, fallback) => {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  del: (k) => localStorage.removeItem(k),
};

// ---------- Minimal demo seed (only if backend empty on first run) ----------
function buildSeed() {
  const data = {};
  let counter = 1;
  for (let secNum = 1; secNum <= 19; secNum++) {
    const students = [];
    for (let i = 0; i < 30; i++) {
      const id = `231FA04${String(counter).padStart(3, "0")}`;
      students.push({
        id,
        name: `Student ${id}`,
        status: Math.random() > 0.15 ? "present" : "absent",
      });
      counter++;
    }
    data[secNum] = { id: secNum, name: `Section ${secNum}`, students };
  }
  return data;
}

// ---------- History (client-side visualization only) ----------
function ensureHistory(studentId, days = 31, fallbackStatus = "present") {
  const key = `attendanceHistory_single_${studentId}`;
  const cached = ls.get(key, null);
  if (cached)
    return cached.map((r) => ({ date: new Date(r.date), status: r.status }));

  const hist = [];
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const status =
      i === 0 ? fallbackStatus : Math.random() > 0.7 ? "absent" : "present";
    hist.push({ date, status });
  }
  ls.set(key, hist);
  return hist;
}

// ---------- Exports ----------
function exportCSV(fileName, rows) {
  if (!rows?.length) return alert("No data to export!");
  const header = "Student ID,Student Name,Date,Status\n";
  const body = rows
    .map(
      (r) =>
        `${r.id},"${r.name}",${new Date(r.date).toLocaleDateString()},${
          r.status
        }`
    )
    .join("\n");
  const blob = new Blob([header + body], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Attendance_${fileName}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function exportPDF(fileName, rows) {
  if (!rows?.length) return alert("No data to export!");
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(`Attendance Report — ${fileName}`, 14, 18);
  const data = rows.map((r) => [
    r.id,
    r.name,
    new Date(r.date).toLocaleDateString(),
    r.status[0].toUpperCase() + r.status.slice(1),
  ]);
  doc.autoTable({
    head: [["Student ID", "Student Name", "Date", "Status"]],
    body: data,
    startY: 26,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [124, 58, 237] },
  });
  doc.save(`Attendance_${fileName}.pdf`);
}

// ---------- Chart ----------
function mountTrendChart(canvas, history) {
  if (!canvas) return null;
  const labels = [...history].reverse().map((h) => h.date.toLocaleDateString());
  const values = [...history]
    .reverse()
    .map((h) => (h.status === "present" ? 1 : 0));
  const colors = [...history]
    .reverse()
    .map((h) => (h.status === "present" ? THEME.green : THEME.red));
  return new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Present (1) / Absent (0)",
          data: values,
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 1,
        },
      ],
    },
    options: {
      animation: { duration: 900, easing: "easeOutQuart" },
      scales: { y: { min: 0, max: 1, ticks: { stepSize: 1 } } },
      plugins: { legend: { display: false } },
    },
  });
}

// ---------- UI Glass wrapper ----------
const Glass = ({ children, className, style, onClick }) => (
  <motion.div
    whileHover={{ translateY: -2 }}
    whileTap={{ translateY: 0.5 }}
    className={`glass ${className || ""}`}
    style={style}
    onClick={onClick}
  >
    {children}
  </motion.div>
);

// ---------- Network helper ----------
async function api(path, opts = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} — ${text}`);
  }
  return res.json().catch(() => ({}));
}

export default function App() {
  // Head: favicon + fonts + Material Icons
  useEffect(() => {
    const fav = document.createElement("link");
    fav.rel = "icon";
    fav.type = "image/svg+xml";
    fav.href = "https://vite.dev/logo.svg";
    document.head.appendChild(fav);

    const f1 = document.createElement("link");
    f1.rel = "preconnect";
    f1.href = "https://fonts.gstatic.com";
    f1.crossOrigin = "anonymous";

    const f2 = document.createElement("link");
    f2.rel = "stylesheet";
    f2.href =
      "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&family=Space+Grotesk:wght@400;600;700&display=swap";

    const mi = document.createElement("link");
    mi.rel = "stylesheet";
    mi.href = "https://fonts.googleapis.com/icon?family=Material+Icons";

    document.head.append(f1, f2, mi);
    return () => {
      fav.remove();
      f1.remove();
      f2.remove();
      mi.remove();
    };
  }, []);

  // Theme & layout
  const [dark, setDark] = useState(ls.get("darkMode_singlefile", true));
  useEffect(() => {
    document.body.classList.toggle("dark", dark);
    ls.set("darkMode_singlefile", dark);
  }, [dark]);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userType, setUserType] = useState(ls.get("userType_singlefile", null));
  const [page, setPage] = useState(
    userType ? (userType === "teacher" ? "teacher" : "student") : "login"
  );

  // ---------- Backend data ----------
  const [sections, setSections] = useState([]); // [{_id, name, students:[{id,name,status,...}]}]
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [sectionId, setSectionId] = useState(""); // a Mongo _id

  // seed for first paint (optional)
  const [seed, setSeed] = useState(buildSeed());

  // Fetch sections on load
  const loadSections = async () => {
    try {
      setLoading(true);
      setErr("");
      const list = await api("/api/sections");
      setSections(list || []);
      if (!sectionId && list?.length) setSectionId(list[0]._id);
    } catch (e) {
      setErr(
        e?.message ||
          "Failed to load sections. Ensure backend is running on port 5000."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentSection = useMemo(() => {
    if (!sections?.length || !sectionId) return null;
    return sections.find((s) => s._id === sectionId) || null;
  }, [sections, sectionId]);

  // ---------- Student auth-ish (demo) ----------
  const [studentId, setStudentId] = useState(
    ls.get("studentId_singlefile", "231FA04001")
  );
  const [teacherName, setTeacherName] = useState(
    ls.get("teacherName_singlefile", "")
  );
  useEffect(() => ls.set("studentId_singlefile", studentId), [studentId]);
  useEffect(() => ls.set("teacherName_singlefile", teacherName), [teacherName]);
  useEffect(() => {
    if (userType) ls.set("userType_singlefile", userType);
    else ls.del("userType_singlefile");
  }, [userType]);

  // Lookup student across loaded sections
  const studentInfo = useMemo(() => {
    if (!studentId || !sections?.length) return null;
    for (const sec of sections) {
      const st = (sec.students || []).find((s) => s.id === studentId);
      if (st) return { ...st, section: sec.name, sectionObjectId: sec._id };
    }
    // Fallback to seed (first run without data)
    for (const sec of Object.values(seed)) {
      const st = sec.students.find((s) => s.id === studentId);
      if (st) return { ...st, section: sec.name, sectionObjectId: null };
    }
    return null;
  }, [studentId, sections, seed]);

  // ---------- History (local) ----------
  const history = useMemo(() => {
    if (!studentInfo) return [];
    return ensureHistory(studentInfo.id, 31, studentInfo.status || "present");
  }, [studentInfo]);

  // ---------- Notifications ----------
  const [notifications, setNotifications] = useState([]);
  const loadNotifications = async (sid) => {
    try {
      const data = await api(`/api/notifications/${sid}`);
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    }
  };

  // Load notifications when a student logs in
  useEffect(() => {
    if (userType === "student" && studentInfo?.id) {
      loadNotifications(studentInfo.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userType, studentInfo?.id]);

  // Play sound on notifications present (student)
  useEffect(() => {
    if (userType !== "student") return;
    if (!notifications?.length) return;
    const audio = document.getElementById("notificationSound");
    document.body.classList.add("vibrate");
    audio?.play().catch(() => {});
    const t = setTimeout(() => {
      document.body.classList.remove("vibrate");
      try {
        audio?.pause();
        if (audio) audio.currentTime = 0;
      } catch {}
    }, 1600);
    return () => clearTimeout(t);
  }, [userType, notifications]);

  // ---------- Actions ----------
  const doLoginStudent = () => {
    const exists =
      sections.some((sec) => sec.students?.some((s) => s.id === studentId)) ||
      Object.values(seed).some((sec) =>
        sec.students.some((s) => s.id === studentId)
      );
    if (!exists) return alert("Invalid Student ID. Try 231FA04001.");
    setUserType("student");
    setPage("student");
  };

  const doLoginTeacher = (u, p) => {
    if (!u || !p) return alert("Enter both username & password");
    setTeacherName(u);
    setUserType("teacher");
    setPage("teacher");
  };

  const logout = () => {
    setUserType(null);
    setPage("login");
    setTeacherName("");
  };

  const refreshAfterChange = async () => {
    await loadSections();
  };

  const addStudent = async (name, id, secMongoId) => {
    try {
      if (!name || !id || !secMongoId) return alert("Fill all fields");
      setLoading(true);
      setErr("");
      await api("/api/students", {
        method: "POST",
        body: JSON.stringify({ name, id, sectionId: secMongoId }),
      });
      await refreshAfterChange();
      alert("Student added ✅");
    } catch (e) {
      alert(`Add student failed: ${e?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = async (sid, status) => {
    try {
      setErr("");
      await api("/api/attendance/mark", {
        method: "POST",
        body: JSON.stringify({ studentId: sid, status }),
      });
      // Sync local chart history (today)
      const key = `attendanceHistory_single_${sid}`;
      const hist = ensureHistory(sid, 31);
      hist[0].status = status;
      ls.set(key, hist);
      await refreshAfterChange();
    } catch (e) {
      alert(`Mark failed: ${e?.message || "Unknown error"}`);
    }
  };

  const notifyOne = async (sid, message) => {
    try {
      const teacher = teacherName || "Unknown";
      await api("/api/notifications", {
        method: "POST",
        body: JSON.stringify({ studentId: sid, teacher, message }),
      });
      if (userType === "student" && studentInfo?.id === sid) {
        await loadNotifications(sid);
      }
      alert("Notification sent! ✅");
    } catch (e) {
      alert(`Notification failed: ${e?.message || "Unknown error"}`);
    }
  };

  const notifyAll = async () => {
    const s = currentSection;
    if (!s) return;
    try {
      setLoading(true);
      const students = s.students || [];
      await Promise.all(
        students.map((st) =>
          notifyOne(st.id, "Your recent attendance needs attention.")
        )
      );
      alert(`Notifications sent to ${s.name}`);
    } finally {
      setLoading(false);
    }
  };

  const sectionTodayRows = (sectionMongoId) => {
    const s =
      sections.find((x) => x._id === sectionMongoId) ||
      Object.values(seed).find((x) => String(x.id) === String(sectionMongoId));
    if (!s) return [];
    return (s.students || []).map((st) => {
      const h = ensureHistory(st.id, 1, st.status)[0];
      return { id: st.id, name: st.name, date: h.date, status: h.status };
    });
  };

  // ---------- Stats for student ----------
  const stats = useMemo(() => {
    const total = history.length;
    const present = history.filter((r) => r.status === "present").length;
    const absent = total - present;
    const rate = total ? ((present / total) * 100).toFixed(2) : "0.00";
    return { total, present, absent, rate };
  }, [history]);

  // ---------- Chart ----------
  const chartRef = useRef(null);
  const chartObj = useRef(null);
  useEffect(() => {
    if (page !== "analytics" || !chartRef.current) return;
    chartObj.current?.destroy();
    chartObj.current = mountTrendChart(chartRef.current, history);
    return () => {
      chartObj.current?.destroy();
      chartObj.current = null;
    };
  }, [page, history]);

  const [showAdd, setShowAdd] = useState(false);

  return (
    <>
      {/* ====== Styles (inline) ====== */}
      <style>{`
        :root{
          --bg:#060915;
          --bg-light:#0d1224;
          --card:${THEME.glass};
          --card-dark:${THEME.glassDark};
          --border:${THEME.border};
          --text:#0b1020;
          --text-inv:#eaf0ff;
          --halo1:#6a00ff33;
          --halo2:#00e5ff33;
          --halo3:#ff00aa22;
        }
        *{box-sizing:border-box}
        html, body, #root{height:100%}
        body{
          margin:0;
          font-family:Poppins, Space Grotesk, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
          background: linear-gradient(120deg, var(--bg) 0%, #020408 100%);
          color: var(--text-inv);
          overflow-x:hidden;
          transition: background .3s ease, color .3s ease;
        }
        body::before{
          content:"";
          position: fixed; inset: -30vh -30vw;
          background:
            radial-gradient(70rem 60rem at -10% -10%, var(--halo1), transparent 60%),
            radial-gradient(60rem 55rem at 110% 15%, var(--halo2), transparent 60%),
            radial-gradient(80rem 70rem at 50% 120%, var(--halo3), transparent 60%);
          pointer-events:none; z-index:-3; filter: blur(30px) saturate(120%);
        }
        /* floating particles */
        .particles{position:fixed; inset:0; pointer-events:none; z-index:-1; overflow:hidden}
        .dot{
          position:absolute; width:8px; height:8px; border-radius:50%;
          background: radial-gradient(circle, #fff 0%, #b5c6ff 40%, transparent 70%);
          opacity:.12; filter: blur(1px);
          animation: float 12s linear infinite;
        }
        @keyframes float {
          0%{ transform: translateY(110vh) translateX(0) }
          100%{ transform: translateY(-10vh) translateX(10vw) }
        }

        /* Glass core */
        .glass{
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 16px;
          backdrop-filter: blur(16px) saturate(140%);
          box-shadow:
            0 10px 30px rgba(0,0,0,0.35),
            inset 0 1px 0 rgba(255,255,255,0.1);
        }
        .dark .glass{ background: var(--card-dark) }

        .layout{ display:flex; min-height:100vh; gap:18px; padding:18px }
        .sidebar{
          width: 280px; padding:16px; position: sticky; top:18px; height: calc(100vh - 36px);
          display:flex; flex-direction:column; gap:14px;
        }
        .brand{
          display:flex; align-items:center; gap:10px; font-weight:800; font-size:20px; letter-spacing:.3px;
        }
        .brand .material-icons{ color:${THEME.cyan}; text-shadow:0 0 14px ${
        THEME.cyan
      }55 }
        .tagline{ font-size:12px; opacity:.75; margin-top:-6px }

        .nav{ display:flex; flex-direction:column; gap:10px; margin-top:8px }
        .nav button{
          all:unset; cursor:pointer; padding:12px 14px; border-radius:12px; display:flex; align-items:center; gap:12px;
          color:#d9defe; border:1px solid transparent; transition:.2s ease;
        }
        .nav button:hover{ background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.16); box-shadow: 0 0 0 3px rgba(124,58,237,.18) inset }
        .nav .active{ background: linear-gradient(180deg, rgba(124,58,237,.3), rgba(124,58,237,.1)); border-color: rgba(124,58,237,.55); color:#fff }

        .collapse{
          display:none;
          position: fixed; left:16px; bottom:16px; z-index:5;
        }

        .main{ flex:1; display:flex; flex-direction:column; gap:18px }
        .header{ display:flex; align-items:center; justify-content:space-between; padding:16px 18px }
        .heading{ font-weight:800; letter-spacing:.3px; font-size:18px; display:flex; align-items:center; gap:10px }
        .heading .shine{
          background: linear-gradient(90deg, #fff, #b9c0ff, #fff);
          -webkit-background-clip:text; background-clip:text; color:transparent;
          background-size: 300% 100%; animation: shine 4s ease-in-out infinite;
        }
        @keyframes shine { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }

        .actions{ display:flex; gap:10px }
        .btn{
          all:unset; cursor:pointer; padding:10px 14px; border:1px solid rgba(255,255,255,0.16); border-radius:12px;
          background: linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06)); transition: transform .15s ease;
        }
        .btn.purple{ background: linear-gradient(180deg, rgba(124,58,237,0.42), rgba(124,58,237,0.14)); border-color: rgba(124,58,237,0.6); box-shadow: 0 0 18px ${
          THEME.primary
        }22 }
        .btn.green{ background: linear-gradient(180deg, rgba(34,197,94,0.35), rgba(34,197,94,0.12)); border-color: rgba(34,197,94,0.6) }
        .btn.red{ background: linear-gradient(180deg, rgba(239,68,68,0.35), rgba(239,68,68,0.12)); border-color: rgba(239,68,68,0.6) }
        .btn.blue{ background: linear-gradient(180deg, rgba(37,99,235,0.35), rgba(37,99,235,0.12)); border-color: rgba(37,99,235,0.6) }

        .grid{ display:grid; grid-template-columns: repeat(12, 1fr); gap:14px }
        .card{ padding:16px }
        .stat{ display:flex; flex-direction:column; gap:6px }
        .stat .big{ font-size:28px; font-weight:800 }
        .list{ list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px }
        .list li{ padding: 10px 12px; border-radius: 12px; display:flex; align-items:center; justify-content:space-between; gap: 10px }

        .pill{ padding:6px 10px; border-radius: 999px; font-size:12px; letter-spacing:.3px; border:1px solid transparent }
        .pill.green{ background: rgba(34,197,94,0.18); border-color: rgba(34,197,94,0.5) }
        .pill.red{ background: rgba(239,68,68,0.18); border-color: rgba(239,68,68,0.5) }
        .pill.blue{ background: rgba(59,130,246,0.18); border-color: rgba(59,130,246,0.5) }

        .select, .input{
          width:100%; padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,0.22);
          background: rgba(255,255,255,0.08); color:#fff; outline:none;
        }
        .row{ display:flex; gap:10px; flex-wrap:wrap }
        .split{ display:grid; grid-template-columns: 1fr 1fr; gap: 14px }

        .toggle-row{ display:flex; align-items:center; justify-content:space-between }
        .toggle{
          width:64px; height:36px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2);
          border-radius:999px; position:relative;
        }
        .knob{
          position:absolute; top:4px; left:4px; width:28px; height:28px; border-radius:50%;
          background: linear-gradient(180deg,#fff,#d7defa);
          box-shadow: 0 6px 16px rgba(0,0,0,0.3), 0 0 0 4px rgba(255,255,255,0.06) inset;
          transition: transform .25s ease;
        }
        .toggle.on .knob{ transform: translateX(28px) }

        .vibrate{ animation: vibrate .1s infinite alternate }
        @keyframes vibrate{
          0%{ transform: translate(0,0) } 25%{ transform: translate(1px, 1px) } 50%{ transform: translate(-1px, -1px) }
          75%{ transform: translate(1px, -1px) } 100%{ transform: translate(0,0) }
        }

        @media (max-width: 1100px){
          .layout{ padding:14px }
          .sidebar{ position: fixed; z-index: 6; inset: 14px auto 14px 14px; height: auto; max-height: calc(100vh - 28px); transform: translateX(${
            sidebarOpen ? 0 : "-120%"
          }); transition: transform .25s ease; }
          .collapse{ display:block }
          .main{ margin-left: 0 }
        }
      `}</style>

      {/* Particles */}
      <div className="particles" aria-hidden>
        {Array.from({ length: 26 }).map((_, i) => (
          <span
            key={i}
            className="dot"
            style={{
              left: `${(i * 33) % 100}vw`,
              animationDelay: `${i * 0.8}s`,
              opacity: 0.08 + (i % 5) * 0.02,
              transform: `translateY(${(i * 60) % 100}vh)`,
            }}
          />
        ))}
      </div>

      {/* Notification sound */}
      <audio
        id="notificationSound"
        src="https://www.soundjay.com/buttons/beep-01a.mp3"
        preload="auto"
      />

      <div className="layout">
        {/* Sidebar */}
        <Glass
          className="sidebar"
          style={{ borderColor: "rgba(124,58,237,0.35)" }}
        >
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
                page ===
                (userType === "teacher"
                  ? "teacher"
                  : userType
                  ? "student"
                  : "login")
                  ? "active"
                  : ""
              }
              onClick={() =>
                setPage(
                  userType
                    ? userType === "teacher"
                      ? "teacher"
                      : "student"
                    : "login"
                )
              }
            >
              <span className="material-icons">dashboard</span> Dashboard
            </motion.button>

            <motion.button
              whileHover={btnHover}
              whileTap={btnTap}
              className={page === "calendar" ? "active" : ""}
              onClick={() => setPage("calendar")}
              disabled={!studentInfo}
              style={{ opacity: studentInfo ? 1 : 0.5 }}
            >
              <span className="material-icons">calendar_month</span> Calendar
            </motion.button>

            <motion.button
              whileHover={btnHover}
              whileTap={btnTap}
              className={page === "analytics" ? "active" : ""}
              onClick={() => setPage("analytics")}
              disabled={!studentInfo}
              style={{ opacity: studentInfo ? 1 : 0.5 }}
            >
              <span className="material-icons">query_stats</span> Analytics
            </motion.button>

            <motion.button
              whileHover={btnHover}
              whileTap={btnTap}
              className={page === "notifications" ? "active" : ""}
              onClick={() => setPage("notifications")}
              disabled={!studentInfo}
              style={{ opacity: studentInfo ? 1 : 0.5 }}
            >
              <span className="material-icons">notifications</span>
              &nbsp;Notifications
            </motion.button>

            <motion.button
              whileHover={btnHover}
              whileTap={btnTap}
              className={page === "settings" ? "active" : ""}
              onClick={() => setPage("settings")}
            >
              <span className="material-icons">settings</span> Settings
            </motion.button>
          </div>

          <div style={{ flex: 1 }} />

          <div className="toggle-row">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="material-icons">dark_mode</span> Theme
            </div>
            <div
              className={`toggle ${dark ? "on" : ""}`}
              role="button"
              aria-label="Toggle dark mode"
              onClick={() => setDark((d) => !d)}
            >
              <div className="knob" />
            </div>
          </div>
        </Glass>

        {/* Mobile Sidebar Toggle */}
        <motion.button
          whileHover={btnHover}
          whileTap={btnTap}
          className="collapse btn purple"
          onClick={() => setSidebarOpen((s) => !s)}
        >
          <span className="material-icons">
            {sidebarOpen ? "close" : "menu"}
          </span>
        </motion.button>

        {/* Main */}
        <div className="main">
          {/* Header */}
          <Glass className="header">
            <div className="heading">
              <span className="material-icons">auto_awesome</span>
              <span className="shine">
                {userType
                  ? userType === "teacher"
                    ? "Teacher Panel"
                    : "Student Panel"
                  : "Welcome"}
              </span>
            </div>
            <div className="actions">
              {userType && (
                <motion.button
                  whileHover={btnHover}
                  whileTap={btnTap}
                  className="btn"
                  onClick={logout}
                >
                  <span
                    className="material-icons"
                    style={{ verticalAlign: "middle" }}
                  >
                    logout
                  </span>{" "}
                  Logout
                </motion.button>
              )}
            </div>
          </Glass>

          {/* Backend load status */}
          {(loading || err) && (
            <Glass className="card" style={{ padding: 12 }}>
              {loading && <div>Loading from backend...</div>}
              {err && (
                <div style={{ color: "#ffb4b4" }}>
                  <strong>Error:</strong> {err}
                </div>
              )}
            </Glass>
          )}

          {/* Pages */}
          <AnimatePresence mode="wait">
            {page === "login" && (
              <motion.div
                key="login"
                className="grid"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <Glass className="card" style={{ gridColumn: "span 6" }}>
                  <h3 style={{ margin: "0 0 8px 0" }}>
                    <span
                      className="material-icons"
                      style={{ color: THEME.green, verticalAlign: "middle" }}
                    >
                      verified_user
                    </span>{" "}
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
                  <motion.button
                    whileHover={btnHover}
                    whileTap={btnTap}
                    className="btn purple"
                    style={{ marginTop: 10 }}
                    onClick={doLoginStudent}
                  >
                    <span
                      className="material-icons"
                      style={{ verticalAlign: "middle" }}
                    >
                      login
                    </span>{" "}
                    Login as Student
                  </motion.button>
                </Glass>

                <Glass className="card" style={{ gridColumn: "span 6" }}>
                  <h3 style={{ margin: "0 0 8px 0" }}>
                    <span
                      className="material-icons"
                      style={{ color: THEME.cyan, verticalAlign: "middle" }}
                    >
                      manage_accounts
                    </span>{" "}
                    Teacher Login
                  </h3>
                  <div className="row">
                    <input
                      className="input"
                      placeholder="Username"
                      value={teacherName}
                      onChange={(e) => setTeacherName(e.target.value)}
                    />
                    <input
                      className="input"
                      placeholder="Password"
                      type="password"
                    />
                  </div>
                  <motion.button
                    whileHover={btnHover}
                    whileTap={btnTap}
                    className="btn blue"
                    style={{ marginTop: 10 }}
                    onClick={() => doLoginTeacher(teacherName, "pass")}
                  >
                    <span
                      className="material-icons"
                      style={{ verticalAlign: "middle" }}
                    >
                      login
                    </span>{" "}
                    Login as Teacher
                  </motion.button>
                </Glass>
              </motion.div>
            )}

            {/* Student Dashboard */}
            {page === "student" && userType === "student" && studentInfo && (
              <motion.div
                key="student"
                className="grid"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <Glass className="card" style={{ gridColumn: "span 12" }}>
                  <h2 style={{ margin: 0 }}>
                    Welcome back, <strong>{studentInfo.name}</strong>
                  </h2>
                  <div style={{ opacity: 0.9, marginTop: 6 }}>
                    ID: {studentInfo.id} &nbsp; | &nbsp; Section:{" "}
                    {studentInfo.section}
                  </div>
                </Glass>

                {/* Stats */}
                <Glass className="card" style={{ gridColumn: "span 3" }}>
                  <div className="stat">
                    <div>Attendance Rate</div>
                    <div className="big" style={{ color: THEME.cyan }}>
                      {stats.rate}%
                    </div>
                  </div>
                </Glass>
                <Glass className="card" style={{ gridColumn: "span 3" }}>
                  <div className="stat">
                    <div>Days Present</div>
                    <div className="big" style={{ color: THEME.green }}>
                      {stats.present}
                    </div>
                  </div>
                </Glass>
                <Glass className="card" style={{ gridColumn: "span 3" }}>
                  <div className="stat">
                    <div>Days Absent</div>
                    <div className="big" style={{ color: THEME.red }}>
                      {stats.absent}
                    </div>
                  </div>
                </Glass>
                <Glass className="card" style={{ gridColumn: "span 3" }}>
                  <div className="stat">
                    <div>Total Days</div>
                    <div className="big">{stats.total}</div>
                  </div>
                </Glass>

                {/* Recent */}
                <Glass className="card" style={{ gridColumn: "span 8" }}>
                  <h3 style={{ marginTop: 0 }}>Recent Attendance</h3>
                  <ul className="list">
                    {history.slice(0, 7).map((r, i) => (
                      <li
                        key={i}
                        className="glass"
                        style={{ border: "1px solid rgba(255,255,255,0.12)" }}
                      >
                        <span>{r.date.toLocaleDateString()}</span>
                        <span
                          className={`pill ${
                            r.status === "present" ? "green" : "red"
                          }`}
                        >
                          {r.status === "present" ? "Present" : "Absent"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Glass>

                {/* Export */}
                <Glass className="card" style={{ gridColumn: "span 4" }}>
                  <h3 style={{ marginTop: 0 }}>Export</h3>
                  <div className="row">
                    <motion.button
                      whileHover={btnHover}
                      whileTap={btnTap}
                      className="btn"
                      onClick={() =>
                        exportCSV(
                          studentInfo.id,
                          history.map((h) => ({
                            ...h,
                            id: studentInfo.id,
                            name: studentInfo.name,
                          }))
                        )
                      }
                    >
                      <span
                        className="material-icons"
                        style={{ verticalAlign: "middle" }}
                      >
                        table_view
                      </span>{" "}
                      CSV
                    </motion.button>
                    <motion.button
                      whileHover={btnHover}
                      whileTap={btnTap}
                      className="btn"
                      onClick={() =>
                        exportPDF(
                          studentInfo.id,
                          history.map((h) => ({
                            ...h,
                            id: studentInfo.id,
                            name: studentInfo.name,
                          }))
                        )
                      }
                    >
                      <span
                        className="material-icons"
                        style={{ verticalAlign: "middle" }}
                      >
                        picture_as_pdf
                      </span>{" "}
                      PDF
                    </motion.button>
                  </div>
                </Glass>
              </motion.div>
            )}

            {/* Teacher Dashboard */}
            {page === "teacher" && userType === "teacher" && (
              <motion.div
                key="teacher"
                className="grid"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <Glass className="card" style={{ gridColumn: "span 12" }}>
                  <div className="row" style={{ alignItems: "center" }}>
                    <select
                      className="select"
                      value={sectionId || ""}
                      onChange={(e) => setSectionId(e.target.value)}
                      style={{ maxWidth: 320 }}
                    >
                      {sections.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name}
                        </option>
                      ))}
                    </select>

                    <motion.button
                      whileHover={btnHover}
                      whileTap={btnTap}
                      className="btn green"
                      onClick={async () => {
                        const s = currentSection;
                        if (!s) return;
                        await Promise.all(
                          (s.students || []).map((st) =>
                            markAttendance(st.id, "present")
                          )
                        );
                      }}
                    >
                      <span
                        className="material-icons"
                        style={{ verticalAlign: "middle" }}
                      >
                        task_alt
                      </span>{" "}
                      Mark All Present
                    </motion.button>

                    <motion.button
                      whileHover={btnHover}
                      whileTap={btnTap}
                      className="btn red"
                      onClick={async () => {
                        const s = currentSection;
                        if (!s) return;
                        await Promise.all(
                          (s.students || []).map((st) =>
                            markAttendance(st.id, "absent")
                          )
                        );
                      }}
                    >
                      <span
                        className="material-icons"
                        style={{ verticalAlign: "middle" }}
                      >
                        cancel
                      </span>{" "}
                      Mark All Absent
                    </motion.button>

                    <div style={{ flex: 1 }} />

                    <motion.button
                      whileHover={btnHover}
                      whileTap={btnTap}
                      className="btn"
                      onClick={() => {
                        const rows = sectionTodayRows(sectionId);
                        exportCSV(`Section-${sectionId}-Today`, rows);
                      }}
                    >
                      <span
                        className="material-icons"
                        style={{ verticalAlign: "middle" }}
                      >
                        grid_on
                      </span>{" "}
                      Export CSV
                    </motion.button>
                    <motion.button
                      whileHover={btnHover}
                      whileTap={btnTap}
                      className="btn"
                      onClick={() => {
                        const rows = sectionTodayRows(sectionId);
                        exportPDF(`Section-${sectionId}-Today`, rows);
                      }}
                    >
                      <span
                        className="material-icons"
                        style={{ verticalAlign: "middle" }}
                      >
                        picture_as_pdf
                      </span>{" "}
                      Export PDF
                    </motion.button>

                    <motion.button
                      whileHover={btnHover}
                      whileTap={btnTap}
                      className="btn purple"
                      onClick={() => setShowAdd((s) => !s)}
                    >
                      <span
                        className="material-icons"
                        style={{ verticalAlign: "middle" }}
                      >
                        person_add
                      </span>{" "}
                      {showAdd ? "Close" : "Add Student"}
                    </motion.button>
                  </div>
                </Glass>

                <AnimatePresence>
                  {showAdd && (
                    <motion.div
                      variants={pageVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="card glass"
                      style={{ gridColumn: "span 12" }}
                    >
                      <h3 style={{ marginTop: 0 }}>Add New Student</h3>
                      <div className="split">
                        <input
                          id="newName"
                          className="input"
                          placeholder="Full Name"
                        />
                        <input
                          id="newId"
                          className="input"
                          placeholder="Registration Number (unique)"
                        />
                      </div>
                      <div className="row" style={{ marginTop: 10 }}>
                        <select
                          id="newSec"
                          className="select"
                          defaultValue={sectionId || ""}
                          style={{ maxWidth: 320 }}
                        >
                          {sections.map((s) => (
                            <option key={s._id} value={s._id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        <motion.button
                          whileHover={btnHover}
                          whileTap={btnTap}
                          className="btn green"
                          onClick={async () => {
                            const name = document
                              .getElementById("newName")
                              .value.trim();
                            const id = document
                              .getElementById("newId")
                              .value.trim();
                            const sec = document.getElementById("newSec").value;
                            if (!name || !id || !sec)
                              return alert("Fill all fields");
                            await addStudent(name, id, sec);
                            setShowAdd(false);
                            setSectionId(sec);
                          }}
                        >
                          <span
                            className="material-icons"
                            style={{ verticalAlign: "middle" }}
                          >
                            add_task
                          </span>{" "}
                          Add
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Glass className="card" style={{ gridColumn: "span 12" }}>
                  <div
                    className="row"
                    style={{
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <h3 style={{ margin: 0 }}>
                      Students — {currentSection ? currentSection.name : "—"}
                    </h3>
                    <motion.button
                      whileHover={btnHover}
                      whileTap={btnTap}
                      className="btn purple"
                      onClick={notifyAll}
                    >
                      <span
                        className="material-icons"
                        style={{ verticalAlign: "middle" }}
                      >
                        campaign
                      </span>{" "}
                      Notify All
                    </motion.button>
                  </div>

                  <ul className="list" style={{ marginTop: 12 }}>
                    {(currentSection?.students || []).map((st) => (
                      <li
                        key={st._id || st.id}
                        className="glass"
                        style={{ border: "1px solid rgba(255,255,255,0.12)" }}
                      >
                        <div>
                          <strong>{st.name}</strong>{" "}
                          <span style={{ opacity: 0.85 }}>({st.id})</span>
                        </div>
                        <div className="row">
                          <span
                            className={`pill ${
                              st.status === "present" ? "green" : "red"
                            }`}
                          >
                            {st.status === "present" ? "Present" : "Absent"}
                          </span>
                          <motion.button
                            whileHover={btnHover}
                            whileTap={btnTap}
                            className="btn green"
                            onClick={() => markAttendance(st.id, "present")}
                          >
                            + Present
                          </motion.button>
                          <motion.button
                            whileHover={btnHover}
                            whileTap={btnTap}
                            className="btn red"
                            onClick={() => markAttendance(st.id, "absent")}
                          >
                            + Absent
                          </motion.button>
                          <motion.button
                            whileHover={btnHover}
                            whileTap={btnTap}
                            className="btn"
                            onClick={() =>
                              notifyOne(
                                st.id,
                                "Your recent attendance needs attention."
                              )
                            }
                          >
                            <span
                              className="material-icons"
                              style={{ verticalAlign: "middle" }}
                            >
                              notifications_active
                            </span>{" "}
                            Notify
                          </motion.button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Glass>
              </motion.div>
            )}

            {/* Calendar */}
            {page === "calendar" && studentInfo && (
              <motion.div
                key="calendar"
                className="grid"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <Glass className="card" style={{ gridColumn: "span 12" }}>
                  <h3 style={{ marginTop: 0 }}>This Month's Attendance</h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                      gap: 10,
                      marginTop: 10,
                    }}
                  >
                    {[...history].reverse().map((rec, i) => (
                      <div
                        key={i}
                        className="glass"
                        style={{
                          textAlign: "center",
                          padding: 12,
                          border:
                            rec.status === "present"
                              ? "1px solid rgba(34,197,94,0.7)"
                              : "1px solid rgba(239,68,68,0.7)",
                          background:
                            rec.status === "present"
                              ? "linear-gradient(180deg,rgba(34,197,94,.18),rgba(34,197,94,.08))"
                              : "linear-gradient(180deg,rgba(239,68,68,.18),rgba(239,68,68,.08))",
                        }}
                        title={`${rec.date.toLocaleDateString()}: ${
                          rec.status
                        }`}
                      >
                        <div style={{ fontWeight: 800 }}>
                          {rec.date.getDate()}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.9 }}>
                          {rec.status === "present" ? "Present" : "Absent"}
                        </div>
                      </div>
                    ))}
                  </div>
                </Glass>
              </motion.div>
            )}

            {/* Analytics */}
            {page === "analytics" && studentInfo && (
              <motion.div
                key="analytics"
                className="grid"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <Glass className="card" style={{ gridColumn: "span 12" }}>
                  <h3 style={{ marginTop: 0 }}>Attendance Analytics</h3>
                  <canvas
                    ref={chartRef}
                    style={{ width: "100%", height: 340 }}
                  />
                </Glass>
              </motion.div>
            )}

            {/* Notifications */}
            {page === "notifications" && studentInfo && (
              <motion.div
                key="notifications"
                className="grid"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <Glass className="card" style={{ gridColumn: "span 12" }}>
                  <h3 style={{ marginTop: 0 }}>Notifications</h3>
                  <ul className="list" style={{ marginTop: 12 }}>
                    {(!notifications || notifications.length === 0) && (
                      <li className="glass" style={{ padding: 14 }}>
                        No notifications yet.
                      </li>
                    )}
                    {notifications
                      .slice()
                      .reverse()
                      .map((n, i) => (
                        <li
                          key={i}
                          className="glass"
                          style={{ border: "1px solid rgba(255,255,255,0.12)" }}
                        >
                          <div>
                            <strong>{n.teacher || "Teacher"}</strong>{" "}
                            <span style={{ opacity: 0.8 }}>
                              {new Date(n.date).toLocaleString()}
                            </span>
                          </div>
                          <div style={{ opacity: 0.95 }}>{n.message}</div>
                        </li>
                      ))}
                  </ul>
                </Glass>
              </motion.div>
            )}

            {/* Settings */}
            {page === "settings" && (
              <motion.div
                key="settings"
                className="grid"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <Glass className="card" style={{ gridColumn: "span 12" }}>
                  <h3 style={{ marginTop: 0 }}>Settings</h3>
                  <div className="row">
                    <div className="glass card" style={{ padding: 14 }}>
                      <div className="toggle-row" style={{ gap: 16 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span className="material-icons">dark_mode</span> Dark
                          Mode
                        </div>
                        <div
                          className={`toggle ${dark ? "on" : ""}`}
                          onClick={() => setDark((d) => !d)}
                          role="button"
                          aria-label="Toggle dark mode"
                        >
                          <div className="knob" />
                        </div>
                      </div>
                    </div>
                    <div className="glass card" style={{ padding: 14 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 8,
                        }}
                      >
                        <span className="material-icons">info</span> Demo Info
                      </div>
                      <div style={{ opacity: 0.9, fontSize: 14 }}>
                        Backend URL: <code>{BASE_URL}</code>
                      </div>
                      <div style={{ opacity: 0.9, fontSize: 14, marginTop: 6 }}>
                        Demo Student ID: <code>231FA04001</code>
                      </div>
                    </div>
                  </div>
                </Glass>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
