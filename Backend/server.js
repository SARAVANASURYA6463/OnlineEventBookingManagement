const cors    = require("cors");
const express = require("express");
const mysql   = require("mysql2");
const bcrypt  = require("bcrypt");
const session = require("express-session");

const app = express();

app.use(cors({
  origin: "http://127.0.0.1:5500",
  credentials: true,
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

app.use(session({
  secret: "eventease_secret_key",
  resave: true,
  saveUninitialized: true,
  cookie: { maxAge: 1000*60*60*24, httpOnly: false, sameSite: "lax", secure: false }
}));

const db = mysql.createConnection({
  host:"localhost", user:"root", password:"6463", database:"eventdb"
});

db.connect(err => {
  if (err) { console.error("DB failed:", err.message); return; }
  console.log("Connected to MySQL");
  createTables();
});

function createTables() {
  db.query(`CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL DEFAULT 'Admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  db.query(`CREATE TABLE IF NOT EXISTS organizers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    status ENUM('pending','approved','blocked') NOT NULL DEFAULT 'approved',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  db.query(`CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    status ENUM('active','blocked') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  db.query(`CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    location VARCHAR(200) NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    total_seats INT NOT NULL,
    available_seats INT NOT NULL,
    max_tickets_per_user INT NOT NULL DEFAULT 1,
    event_type VARCHAR(100) NOT NULL DEFAULT 'General',
    event_mode ENUM('Solo','Team') NOT NULL DEFAULT 'Solo',
    team_size INT DEFAULT NULL,
    description TEXT,
    status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved',
    organizer_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES organizers(id) ON DELETE CASCADE
  )`);

  db.query(`CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_id INT NOT NULL,
    ticket_id VARCHAR(100) NOT NULL,
    tickets_count INT NOT NULL DEFAULT 1,
    attendee_name VARCHAR(100) NOT NULL,
    attendee_email VARCHAR(100) NOT NULL,
    attendee_phone VARCHAR(20) NOT NULL,
    status ENUM('confirmed','cancelled') NOT NULL DEFAULT 'confirmed',
    booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
  )`);

  console.log("Tables ready ✅");
}

// ===================================================
// ADMIN AUTH
// ===================================================

app.post("/admin/login", (req, res) => {
  const { admin_id, password } = req.body;
  if (!admin_id || !password) return res.status(400).json({ error: "All fields required" });

  db.query("SELECT * FROM admins WHERE admin_id=?", [admin_id], async (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.json({ success: false, message: "Invalid admin ID" });

    const match = await bcrypt.compare(password, rows[0].password);
    if (!match) return res.json({ success: false, message: "Invalid password" });

    req.session.user = { id: rows[0].id, name: rows[0].name, admin_id: rows[0].admin_id, role: "admin" };
    req.session.save(err => {
      if (err) return res.status(500).json({ error: "Session error" });
      res.json({ success: true, admin: { id: rows[0].id, name: rows[0].name, admin_id: rows[0].admin_id, role: "admin" } });
    });
  });
});

// ===================================================
// ORGANIZER AUTH
// ===================================================

app.post("/organizer/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: "All fields required" });

  db.query("SELECT id FROM organizers WHERE email=?", [email], async (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length) return res.status(409).json({ error: "Email already registered" });

    const hash = await bcrypt.hash(password, 10);
    db.query("INSERT INTO organizers (name,email,password) VALUES(?,?,?)", [name,email,hash], err => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Organizer registered successfully" });
    });
  });
});

app.post("/organizer/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "All fields required" });

  db.query("SELECT * FROM organizers WHERE email=?", [email], async (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.json({ success: false, message: "Invalid email" });
    if (rows[0].status === "blocked") return res.json({ success: false, message: "Your account is blocked. Contact admin." });

    const match = await bcrypt.compare(password, rows[0].password);
    if (!match) return res.json({ success: false, message: "Invalid password" });

    req.session.user = { id: rows[0].id, name: rows[0].name, email: rows[0].email, role: "organizer" };
    req.session.save(err => {
      if (err) return res.status(500).json({ error: "Session error" });
      const { password: _, ...data } = rows[0];
      res.json({ success: true, user: { ...data, role: "organizer" } });
    });
  });
});

// ===================================================
// USER AUTH
// ===================================================

app.post("/user/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: "All fields required" });

  db.query("SELECT id FROM users WHERE email=?", [email], async (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length) return res.status(409).json({ error: "Email already registered" });

    const hash = await bcrypt.hash(password, 10);
    db.query("INSERT INTO users (name,email,password) VALUES(?,?,?)", [name,email,hash], err => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "User registered successfully" });
    });
  });
});

app.post("/user/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "All fields required" });

  db.query("SELECT * FROM users WHERE email=?", [email], async (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.json({ success: false, message: "Invalid email" });
    if (rows[0].status === "blocked") return res.json({ success: false, message: "Your account is blocked. Contact admin." });

    const match = await bcrypt.compare(password, rows[0].password);
    if (!match) return res.json({ success: false, message: "Invalid password" });

    req.session.user = { id: rows[0].id, name: rows[0].name, email: rows[0].email, role: "user" };
    req.session.save(err => {
      if (err) return res.status(500).json({ error: "Session error" });
      const { password: _, ...data } = rows[0];
      res.json({ success: true, user: { ...data, role: "user" } });
    });
  });
});

// ===================================================
// SESSION
// ===================================================

app.get("/session", (req, res) => {
  if (req.session && req.session.user) res.json({ loggedIn: true, user: req.session.user });
  else res.json({ loggedIn: false });
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ message: "Logged out" }));
});

// ===================================================
// EVENTS
// ===================================================

app.get("/events", (req, res) => {
  const orgId = (req.session.user?.role === "organizer")
    ? req.session.user.id
    : req.query.organizer_id || null;

  if (orgId) {
    db.query(
      `SELECT e.*, (e.total_seats - e.available_seats) AS booked_seats
       FROM events e WHERE e.organizer_id=?
       ORDER BY e.event_date ASC, e.event_time ASC`,
      [orgId],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
      }
    );
  } else {
    db.query(
      `SELECT e.*, o.name AS organizer_name,
         (e.total_seats - e.available_seats) AS booked_seats
       FROM events e JOIN organizers o ON e.organizer_id=o.id
       WHERE e.status='approved'
       ORDER BY e.event_date ASC, e.event_time ASC`,
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
      }
    );
  }
});

app.get("/events/:id/registrations", (req, res) => {
  const orgId = req.session.user?.role === "organizer"
    ? req.session.user.id : req.query.organizer_id;
  if (!orgId) return res.status(401).json({ error: "Unauthorized" });

  db.query(
    `SELECT b.*, u.name AS user_name, u.email AS user_email
     FROM bookings b JOIN users u ON b.user_id=u.id
     JOIN events e ON b.event_id=e.id
     WHERE b.event_id=? AND e.organizer_id=?
     ORDER BY b.booked_at DESC`,
    [req.params.id, orgId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.post("/events", (req, res) => {
  const orgId = req.session.user?.role === "organizer"
    ? req.session.user.id : req.body.organizer_id;
  if (!orgId) return res.status(401).json({ error: "Unauthorized" });

  const { name, location, event_date, event_time, total_seats,
          max_tickets_per_user, event_type, event_mode, team_size, description } = req.body;

  if (!name||!location||!event_date||!event_time||!total_seats||!event_type||!event_mode)
    return res.status(400).json({ error: "All required fields must be filled." });

  const seats = parseInt(total_seats);
  db.query(
    `INSERT INTO events(name,location,event_date,event_time,total_seats,available_seats,
       max_tickets_per_user,event_type,event_mode,team_size,description,organizer_id)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
    [name,location,event_date,event_time,seats,seats,
     parseInt(max_tickets_per_user)||1, event_type,event_mode,
     parseInt(team_size)||null, description||"", parseInt(orgId)],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Event added successfully" });
    }
  );
});

app.put("/events/:id", (req, res) => {
  const orgId = req.session.user?.role === "organizer"
    ? req.session.user.id : req.body.organizer_id;
  if (!orgId) return res.status(401).json({ error: "Unauthorized" });

  const { name, location, event_date, event_time, total_seats,
          max_tickets_per_user, event_type, event_mode, team_size, description } = req.body;

  db.query(
    `UPDATE events SET name=?,location=?,event_date=?,event_time=?,total_seats=?,
       max_tickets_per_user=?,event_type=?,event_mode=?,team_size=?,description=?
     WHERE id=? AND organizer_id=?`,
    [name,location,event_date,event_time,parseInt(total_seats),
     parseInt(max_tickets_per_user)||1,event_type,event_mode,
     parseInt(team_size)||null,description||"",req.params.id,parseInt(orgId)],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows===0) return res.status(403).json({ error: "Not authorized" });
      res.json({ message: "Event updated successfully" });
    }
  );
});

app.delete("/events/:id", (req, res) => {
  const orgId = req.session.user?.role === "organizer"
    ? req.session.user.id : req.query.organizer_id;
  if (!orgId) return res.status(401).json({ error: "Unauthorized" });

  db.query("DELETE FROM events WHERE id=? AND organizer_id=?",
    [req.params.id, parseInt(orgId)],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows===0) return res.status(403).json({ error: "Not authorized" });
      res.json({ message: "Event deleted successfully" });
    }
  );
});

// ===================================================
// BOOKINGS
// ===================================================

app.post("/bookings", (req, res) => {
  const { user_id, event_id, tickets_count,
          attendee_name, attendee_email, attendee_phone } = req.body;
  const count = parseInt(tickets_count)||1;

  if (!user_id||!event_id) return res.status(400).json({ error: "user_id and event_id required" });
  if (!attendee_name||!attendee_email||!attendee_phone)
    return res.status(400).json({ error: "Attendee details required" });

  db.query("SELECT * FROM events WHERE id=?", [event_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: "Event not found" });

    const ev = rows[0];
    if (ev.available_seats < count) return res.status(400).json({ error: `Only ${ev.available_seats} seats left` });
    if (count > ev.max_tickets_per_user) return res.status(400).json({ error: `Max ${ev.max_tickets_per_user} tickets/user` });

    db.query("SELECT SUM(tickets_count) AS t FROM bookings WHERE user_id=? AND event_id=? AND status='confirmed'",
      [user_id, event_id],
      (err, rows2) => {
        const already = rows2[0].t || 0;
        if (already + count > ev.max_tickets_per_user)
          return res.status(400).json({ error: `Already booked ${already}. Max is ${ev.max_tickets_per_user}.` });

        const ticket_id = "TKT-" + Date.now();
        db.query(
          `INSERT INTO bookings(user_id,event_id,ticket_id,tickets_count,attendee_name,attendee_email,attendee_phone)
           VALUES(?,?,?,?,?,?,?)`,
          [user_id,event_id,ticket_id,count,attendee_name,attendee_email,attendee_phone],
          (err) => {
            if (err) return res.status(500).json({ error: err.message });
            db.query("UPDATE events SET available_seats=available_seats-? WHERE id=?", [count,event_id]);
            res.json({ message: "Booking successful", ticket_id, tickets_count: count });
          }
        );
      }
    );
  });
});

app.get("/mybookings/:user_id", (req, res) => {
  db.query(
    `SELECT b.*,e.id AS event_id,e.name,e.location,e.event_date,e.event_time,e.event_type,e.event_mode
     FROM bookings b JOIN events e ON b.event_id=e.id
     WHERE b.user_id=?`,
    [req.params.user_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// ===================================================
// ADMIN ROUTES
// ===================================================

// Middleware: check admin session
function adminAuth(req, res, next) {
  const isAdmin = req.session.user?.role === "admin"
    || req.query.admin_id || req.body.admin_id;

  if (!isAdmin) return res.status(401).json({ error: "Admin access required" });
  next();
}

// --- DASHBOARD STATS ---
app.get("/admin/stats", adminAuth, (req, res) => {
  const queries = {
    totalUsers:      "SELECT COUNT(*) AS count FROM users",
    totalOrganizers: "SELECT COUNT(*) AS count FROM organizers",
    totalEvents:     "SELECT COUNT(*) AS count FROM events",
    totalBookings:   "SELECT COUNT(*) AS count FROM bookings WHERE status='confirmed'",
    cancelledBookings: "SELECT COUNT(*) AS count FROM bookings WHERE status='cancelled'",
    blockedUsers:    "SELECT COUNT(*) AS count FROM users WHERE status='blocked'",
    blockedOrgs:     "SELECT COUNT(*) AS count FROM organizers WHERE status='blocked'",
    pendingEvents:   "SELECT COUNT(*) AS count FROM events WHERE status='pending'",
    monthlyBookings: `SELECT DATE_FORMAT(booked_at,'%Y-%m') AS month, COUNT(*) AS count
                      FROM bookings WHERE status='confirmed'
                      GROUP BY month ORDER BY month DESC LIMIT 6`,
    eventsByType:    `SELECT event_type, COUNT(*) AS count FROM events GROUP BY event_type`,
    recentBookings:  `SELECT b.ticket_id, b.attendee_name, b.attendee_email,
                        b.tickets_count, b.booked_at, b.status,
                        e.name AS event_name, u.name AS user_name
                      FROM bookings b
                      JOIN events e ON b.event_id=e.id
                      JOIN users u ON b.user_id=u.id
                      ORDER BY b.booked_at DESC LIMIT 5`
  };

  const results = {};
  const keys = Object.keys(queries);
  let done = 0;

  keys.forEach(key => {
    db.query(queries[key], (err, rows) => {
      if (err) { results[key] = null; }
      else {
        results[key] = rows[0]?.count !== undefined ? rows[0].count : rows;
      }
      done++;
      if (done === keys.length) res.json(results);
    });
  });
});

// --- USER MANAGEMENT ---
app.get("/admin/users", adminAuth, (req, res) => {
  db.query(
    `SELECT u.id, u.name, u.email, u.status, u.created_at,
       COUNT(b.id) AS booking_count
     FROM users u LEFT JOIN bookings b ON u.id=b.user_id
     GROUP BY u.id ORDER BY u.created_at DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.get("/admin/users/:id/bookings", adminAuth, (req, res) => {
  db.query(
    `SELECT b.*, e.name AS event_name, e.location, e.event_date, e.event_time
     FROM bookings b JOIN events e ON b.event_id=e.id
     WHERE b.user_id=? ORDER BY b.booked_at DESC`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.put("/admin/users/:id/status", adminAuth, (req, res) => {
  const { status } = req.body; // 'active' or 'blocked'
  db.query("UPDATE users SET status=? WHERE id=?", [status, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: `User ${status} successfully` });
  });
});

app.delete("/admin/users/:id", adminAuth, (req, res) => {
  db.query("DELETE FROM users WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "User deleted successfully" });
  });
});

// --- ORGANIZER MANAGEMENT ---
app.get("/admin/organizers", adminAuth, (req, res) => {
  db.query(
    `SELECT o.id, o.name, o.email, o.status, o.created_at,
       COUNT(e.id) AS event_count
     FROM organizers o LEFT JOIN events e ON o.id=e.organizer_id
     GROUP BY o.id ORDER BY o.created_at DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.put("/admin/organizers/:id/status", adminAuth, (req, res) => {
  const { status } = req.body; // 'approved' or 'blocked'
  db.query("UPDATE organizers SET status=? WHERE id=?", [status, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: `Organizer ${status} successfully` });
  });
});

app.delete("/admin/organizers/:id", adminAuth, (req, res) => {
  db.query("DELETE FROM organizers WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Organizer deleted successfully" });
  });
});

// --- EVENT MANAGEMENT ---
app.get("/admin/events", adminAuth, (req, res) => {
  db.query(
    `SELECT e.*, o.name AS organizer_name,
       (e.total_seats - e.available_seats) AS booked_seats,
       COUNT(b.id) AS booking_count
     FROM events e
     JOIN organizers o ON e.organizer_id=o.id
     LEFT JOIN bookings b ON e.id=b.event_id AND b.status='confirmed'
     GROUP BY e.id ORDER BY e.created_at DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.put("/admin/events/:id/status", adminAuth, (req, res) => {
  const { status } = req.body; // 'approved' or 'rejected'
  db.query("UPDATE events SET status=? WHERE id=?", [status, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: `Event ${status} successfully` });
  });
});

app.put("/admin/events/:id", adminAuth, (req, res) => {
  const { name, location, event_date, event_time, total_seats,
          max_tickets_per_user, event_type, event_mode, team_size, description } = req.body;
  db.query(
    `UPDATE events SET name=?,location=?,event_date=?,event_time=?,total_seats=?,
       max_tickets_per_user=?,event_type=?,event_mode=?,team_size=?,description=?
     WHERE id=?`,
    [name,location,event_date,event_time,parseInt(total_seats),
     parseInt(max_tickets_per_user)||1,event_type,event_mode,
     parseInt(team_size)||null,description||"",req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Event updated successfully" });
    }
  );
});

app.delete("/admin/events/:id", adminAuth, (req, res) => {
  db.query("DELETE FROM events WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Event deleted successfully" });
  });
});

// --- BOOKING MANAGEMENT ---
app.get("/admin/bookings", adminAuth, (req, res) => {
  db.query(
    `SELECT b.*, u.name AS user_name, u.email AS user_email,
       e.name AS event_name, e.location, e.event_date, e.event_type,
       o.name AS organizer_name
     FROM bookings b
     JOIN users u ON b.user_id=u.id
     JOIN events e ON b.event_id=e.id
     JOIN organizers o ON e.organizer_id=o.id
     ORDER BY b.booked_at DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.put("/admin/bookings/:id/cancel", adminAuth, (req, res) => {
  // Get booking first
  db.query("SELECT * FROM bookings WHERE id=?", [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: "Booking not found" });
    if (rows[0].status === "cancelled") return res.status(400).json({ error: "Already cancelled" });

    const { event_id, tickets_count } = rows[0];

    db.query("UPDATE bookings SET status='cancelled' WHERE id=?", [req.params.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      // Restore seats
      db.query("UPDATE events SET available_seats=available_seats+? WHERE id=?", [tickets_count, event_id]);
      res.json({ message: "Booking cancelled and seats restored" });
    });
  });
});

// --- REPORTS ---
app.get("/admin/reports/daily", adminAuth, (req, res) => {
  db.query(
    `SELECT DATE(booked_at) AS date,
       COUNT(*) AS bookings,
       SUM(tickets_count) AS tickets
     FROM bookings WHERE status='confirmed'
     GROUP BY DATE(booked_at)
     ORDER BY date DESC LIMIT 30`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.get("/admin/reports/monthly", adminAuth, (req, res) => {
  db.query(
    `SELECT DATE_FORMAT(booked_at,'%Y-%m') AS month,
       COUNT(*) AS bookings,
       SUM(tickets_count) AS tickets
     FROM bookings WHERE status='confirmed'
     GROUP BY month ORDER BY month DESC LIMIT 12`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.get("/admin/reports/export", adminAuth, (req, res) => {
  db.query(
    `SELECT b.ticket_id, b.attendee_name, b.attendee_email, b.attendee_phone,
       b.tickets_count, b.status, b.booked_at,
       e.name AS event_name, e.location, e.event_date, e.event_type,
       u.name AS user_name, o.name AS organizer_name
     FROM bookings b
     JOIN events e ON b.event_id=e.id
     JOIN users u ON b.user_id=u.id
     JOIN organizers o ON e.organizer_id=o.id
     ORDER BY b.booked_at DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      // Build CSV
      const headers = Object.keys(rows[0] || {}).join(",");
      const csvRows = rows.map(r =>
        Object.values(r).map(v =>
          `"${String(v || "").replace(/"/g, '""')}"`
        ).join(",")
      );
      const csv = [headers, ...csvRows].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=eventease-report.csv");
      res.send(csv);
    }
  );
});

app.listen(5000, () => console.log("Server running on port 5000"));