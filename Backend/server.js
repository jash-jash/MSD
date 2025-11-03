// ===================== IMPORTS =====================
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// ===================== DATABASE CONNECTION =====================
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/hyperattend", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    ssl: true,
    tlsAllowInvalidCertificates: true, // Windows fix
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => console.log("🟢 MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ===================== SCHEMAS & MODELS =====================
const sectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
});
const Section = mongoose.model("Section", sectionSchema);

const studentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  section: { type: mongoose.Schema.Types.ObjectId, ref: "Section" },
  status: { type: String, enum: ["present", "absent"], default: "present" },
});
const Student = mongoose.model("Student", studentSchema);

const notificationSchema = new mongoose.Schema({
  studentId: String,
  teacher: String,
  message: String,
  date: { type: Date, default: Date.now },
});
const Notification = mongoose.model("Notification", notificationSchema);

// ===================== ROUTES =====================

// Root route
app.get("/", (_, res) => res.send("✅ HyperAttend backend is running"));

// ---- Students ----
app.get("/api/students", async (_, res) => {
  const students = await Student.find().populate("section");
  res.json(students);
});

app.post("/api/students", async (req, res) => {
  try {
    const { id, name, sectionId } = req.body;
    const student = new Student({ id, name, section: sectionId });
    await student.save();
    if (sectionId) {
      const section = await Section.findById(sectionId);
      if (section) {
        section.students.push(student._id);
        await section.save();
      }
    }
    res.status(201).json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Attendance ----
app.post("/api/attendance/mark", async (req, res) => {
  try {
    const { studentId, status } = req.body;
    await Student.findOneAndUpdate({ id: studentId }, { status });
    res.json({ message: "Attendance updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/attendance/summary/:studentId", async (req, res) => {
  try {
    const student = await Student.findOne({ id: req.params.studentId });
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Notifications ----
app.post("/api/notifications", async (req, res) => {
  try {
    const { studentId, teacher, message } = req.body;
    const notif = new Notification({ studentId, teacher, message });
    await notif.save();
    res.status(201).json(notif);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/notifications/:studentId", async (req, res) => {
  try {
    const list = await Notification.find({ studentId: req.params.studentId });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Sections ----
app.post("/api/sections", async (req, res) => {
  try {
    const section = new Section({ name: req.body.name });
    await section.save();
    res.status(201).json(section);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/sections", async (_, res) => {
  const sections = await Section.find().populate("students");
  res.json(sections);
});

// ---- SEED ROUTE (19 sections × 30 students) ----
app.get("/api/seed", async (req, res) => {
  try {
    await Section.deleteMany({});
    await Student.deleteMany({});
    console.log("🧹 Cleared old data...");

    let counter = 1;
    for (let secNum = 1; secNum <= 19; secNum++) {
      const section = new Section({ name: `Section ${secNum}`, students: [] });
      for (let i = 0; i < 30; i++) {
        const id = `231FA04${String(counter).padStart(3, "0")}`;
        const student = new Student({
          id,
          name: `Student ${id}`,
          section: section._id,
          status: Math.random() > 0.2 ? "present" : "absent",
        });
        await student.save();
        section.students.push(student._id);
        counter++;
      }
      await section.save();
    }

    res.send(
      "✅ Seeded 19 sections × 30 students each (231FA04001–231FA04360)"
    );
  } catch (err) {
    console.error("❌ Seed error:", err);
    res.status(500).send("Seeding failed");
  }
});

// ===================== START SERVER =====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
