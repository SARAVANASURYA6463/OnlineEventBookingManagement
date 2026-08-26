// ================= dashboard.js =================
// Organizer Dashboard — complete rewrite

const API_BASE = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? "http://localhost:5000"
  : "https://YOUR-BACKEND-APP.onrender.com"; // 👈 replace with your real Render backend URL after deploying it

let currentOrganizer = null;

document.addEventListener("DOMContentLoaded", async () => {
  await checkAuth();
  setupModal();
  setupLogout();
  setupEventModeToggle();
  // ✅ Load events AFTER auth
  await loadEvents();
});

// ================= AUTH =================
async function checkAuth() {
  const stored = sessionStorage.getItem("organizer");
  if (stored) {
    currentOrganizer = JSON.parse(stored);
    setNavbar();
    return;
  }
  try {
    const data = await checkSession();
    if (data.loggedIn && data.user.role === "organizer") {
      currentOrganizer = data.user;
      sessionStorage.setItem("organizer", JSON.stringify(data.user));
      setNavbar();
    } else {
      window.location.href = "/Frontend/html/organizerLogIn.html";
    }
  } catch {
    window.location.href = "/Frontend/html/organizerLogIn.html";
  }
}

function setNavbar() {
  document.getElementById("organizerName").textContent  = currentOrganizer.name || "Organizer";
  document.getElementById("organizerAvatar").textContent = (currentOrganizer.name || "O").charAt(0).toUpperCase();
}

// ================= LOAD EVENTS =================
async function loadEvents() {
  const el = document.getElementById("eventsList");
  el.innerHTML = `<div class="loading">Loading events...</div>`;

  try {
    // ✅ Direct fetch — no wrapper function to avoid any issue
    const response = await fetch(
      `${API_BASE}/events?organizer_id=${currentOrganizer.id}`,
      { credentials: "include" }
    );

    if (!response.ok) {
      const err = await response.text();
      el.innerHTML = `<div class="empty-state"><p>❌ Server error: ${err}</p></div>`;
      return;
    }

    const events = await response.json();
    console.log("✅ Events loaded:", events.length, events);

    if (!Array.isArray(events)) {
      el.innerHTML = `<div class="empty-state"><p>❌ Unexpected response: ${JSON.stringify(events)}</p></div>`;
      return;
    }

    // Update stats
    let totalSeats = 0, totalFilled = 0;
    events.forEach(e => {
      totalSeats  += Number(e.total_seats)  || 0;
      totalFilled += Number(e.booked_seats) || 0;
    });

    document.getElementById("totalEvents").textContent = events.length;
    document.getElementById("totalSeats").textContent  = totalSeats;
    document.getElementById("totalFilled").textContent = totalFilled;
    document.getElementById("totalEmpty").textContent  = totalSeats - totalFilled;

    if (events.length === 0) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="icon">🎯</div>
          <p>No events yet. Click <strong>+ Add Event</strong> to create your first event!</p>
        </div>`;
      return;
    }

    // ✅ Render cards
    el.innerHTML = events.map(ev => renderCard(ev)).join("");
    window._events = events;

  } catch (err) {
    console.error("loadEvents error:", err);
    el.innerHTML = `<div class="empty-state"><p>❌ ${err.message}</p></div>`;
  }
}

// ================= RENDER CARD =================
function renderCard(ev) {
  const id        = ev.id;
  const name      = ev.name      || "Unnamed";
  const location  = ev.location  || "—";
  const type      = ev.event_type || "General";
  const mode      = ev.event_mode || "Solo";
  const desc      = ev.description || "";
  const maxT      = Number(ev.max_tickets_per_user) || 1;
  const filled    = Number(ev.booked_seats)    || 0;
  const avail     = Number(ev.available_seats) || 0;
  const total     = Number(ev.total_seats)     || 0;
  const pct       = total > 0 ? Math.round((filled / total) * 100) : 0;
  const teamInfo  = mode === "Team" && ev.team_size ? ` · Team of ${ev.team_size}` : "";

  return `
    <div class="event-card" id="card-${id}">
      <div class="event-top">
        <div class="event-info" style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
            <div class="event-name">${name}</div>
            <span class="type-badge type-${type}">${type}</span>
            <span class="mode-badge mode-${mode}">${mode}${teamInfo}</span>
          </div>
          <div class="event-meta">
            <span>📍 ${location}</span>
            <span>📅 ${fmtDate(ev.event_date)}</span>
            <span>🕐 ${fmtTime(ev.event_time)}</span>
            <span>🎟️ Max ${maxT}/user</span>
          </div>
          ${desc ? `<div style="font-size:.78rem;color:var(--muted);margin-top:6px;">${desc}</div>` : ""}
        </div>
        <div class="event-actions">
          <button class="view-btn" onclick="viewRegistrations(${id}, '${name.replace(/'/g,"\\'")}')">👥 Registrations</button>
          <button class="edit-btn"   onclick="openEditModal(${id})">✏️ Edit</button>
          <button class="delete-btn" onclick="deleteEventById(${id})">🗑️ Delete</button>
        </div>
      </div>
      <div class="seat-section">
        <div class="seat-labels">
          <span class="seat-label">Seat Occupancy</span>
          <span class="seat-label">${pct}% filled</span>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>
        <div class="seat-counts">
          <div class="seat-count-item"><span class="dot dot-filled"></span><span style="color:var(--danger)">${filled} booked</span></div>
          <div class="seat-count-item"><span class="dot dot-empty"></span><span style="color:var(--success)">${avail} available</span></div>
          <div class="seat-count-item"><span class="dot dot-max"></span><span style="color:var(--warning)">${total} total</span></div>
        </div>
      </div>
    </div>
  `;
}

// ================= FORMAT =================
function fmtDate(d) {
  if (!d) return "—";
  const s = String(d).split("T")[0];          // "2026-04-09"
  const p = s.split("-");
  if (p.length < 3) return s;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${p[2]} ${months[parseInt(p[1])-1]} ${p[0]}`;
}

function fmtTime(t) {
  if (!t) return "—";
  const p  = String(t).split(":");
  const h  = parseInt(p[0]);
  const m  = parseInt(p[1]);
  const ap = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2,"0")} ${ap}`;
}

// ================= ALERTS =================
function showSuccess(msg) {
  const el = document.getElementById("successMsg");
  el.textContent = msg; el.classList.add("show");
  document.getElementById("errorMsg").classList.remove("show");
  setTimeout(() => el.classList.remove("show"), 3000);
}

function showError(msg) {
  const el = document.getElementById("errorMsg");
  el.textContent = msg; el.classList.add("show");
  document.getElementById("successMsg").classList.remove("show");
  setTimeout(() => el.classList.remove("show"), 3000);
}

// ================= EVENT MODE TOGGLE =================
function setupEventModeToggle() {
  const modeSelect = document.getElementById("eventMode");
  const teamGroup  = document.getElementById("teamSizeGroup");

  modeSelect.addEventListener("change", () => {
    if (modeSelect.value === "Team") {
      teamGroup.classList.add("show");
      document.getElementById("teamSize").required = true;
    } else {
      teamGroup.classList.remove("show");
      document.getElementById("teamSize").required = false;
      document.getElementById("teamSize").value = "";
    }
  });
}

// ================= MODAL SETUP =================
function setupModal() {
  const modal     = document.getElementById("eventModal");
  const addBtn    = document.getElementById("addEventBtn");
  const cancelBtn = document.getElementById("modalCancelBtn");
  const submitBtn = document.getElementById("modalSubmitBtn");

  addBtn.addEventListener("click", () => {
    document.getElementById("modalTitle").textContent     = "Add New Event";
    document.getElementById("modalSubmitBtn").textContent = "Add Event";
    document.getElementById("editEventId").value = "";
    clearModal();
    modal.classList.add("show");
  });

  cancelBtn.addEventListener("click", () => { modal.classList.remove("show"); clearModal(); });

  modal.addEventListener("click", e => {
    if (e.target === modal) { modal.classList.remove("show"); clearModal(); }
  });

  submitBtn.addEventListener("click", async () => {
    const editId      = document.getElementById("editEventId").value;
    const name        = document.getElementById("eventName").value.trim();
    const location    = document.getElementById("eventLocation").value.trim();
    const event_date  = document.getElementById("eventDate").value;
    const event_time  = document.getElementById("eventTime").value;
    const total_seats = document.getElementById("eventSeats").value;
    const max_tickets = document.getElementById("maxTickets").value;
    const event_type  = document.getElementById("eventType").value;
    const event_mode  = document.getElementById("eventMode").value;
    const team_size   = document.getElementById("teamSize").value;
    const description = document.getElementById("eventDescription").value.trim();
    const modalError  = document.getElementById("modalError");

    // Validate
    if (!name || !location || !event_date || !event_time || !total_seats || !event_type || !event_mode) {
      modalError.textContent = "⚠️ All fields except description are required.";
      modalError.classList.add("show"); return;
    }
    if (event_mode === "Team" && !team_size) {
      modalError.textContent = "⚠️ Please enter team size for Team events.";
      modalError.classList.add("show"); return;
    }

    modalError.classList.remove("show");
    submitBtn.disabled    = true;
    submitBtn.textContent = "Saving...";

    const eventData = {
      name, location, event_date, event_time,
      total_seats:          Number(total_seats),
      max_tickets_per_user: Number(max_tickets) || 1,
      event_type, event_mode,
      team_size: event_mode === "Team" ? Number(team_size) : null,
      description,
      organizer_id: Number(currentOrganizer.id)
    };

    try {
      // ✅ Direct fetch to avoid any wrapper issues
      const url    = editId
        ? `${API_BASE}/events/${editId}`
        : `${API_BASE}/events`;
      const method = editId ? "PUT" : "POST";

      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(eventData)
      });
      const data = await res.json();

      if (data.message) {
        showSuccess(editId ? "✅ Event updated!" : "✅ Event added!");
        modal.classList.remove("show");
        clearModal();
        await loadEvents();
      } else {
        modalError.textContent = "❌ " + (data.error || "Something went wrong.");
        modalError.classList.add("show");
      }
    } catch (err) {
      console.error("Submit error:", err);
      modalError.textContent = "❌ Server error: " + err.message;
      modalError.classList.add("show");
    } finally {
      submitBtn.disabled    = false;
      submitBtn.textContent = editId ? "Update Event" : "Add Event";
    }
  });
}

// ================= EDIT MODAL =================
function openEditModal(id) {
  const events = window._events || [];
  const ev     = events.find(e => e.id === id);
  if (!ev) return;

  document.getElementById("modalTitle").textContent     = "Edit Event";
  document.getElementById("modalSubmitBtn").textContent = "Update Event";
  document.getElementById("editEventId").value          = id;
  document.getElementById("eventName").value            = ev.name || "";
  document.getElementById("eventLocation").value        = ev.location || "";
  document.getElementById("eventDate").value            = ev.event_date ? String(ev.event_date).split("T")[0] : "";
  document.getElementById("eventTime").value            = ev.event_time ? String(ev.event_time).slice(0,5) : "";
  document.getElementById("eventSeats").value           = ev.total_seats || "";
  document.getElementById("maxTickets").value           = ev.max_tickets_per_user || 1;
  document.getElementById("eventType").value            = ev.event_type || "";
  document.getElementById("eventMode").value            = ev.event_mode || "Solo";
  document.getElementById("teamSize").value             = ev.team_size || "";
  document.getElementById("eventDescription").value     = ev.description || "";
  document.getElementById("modalError").classList.remove("show");

  // Show team size if Team mode
  const teamGroup = document.getElementById("teamSizeGroup");
  if (ev.event_mode === "Team") teamGroup.classList.add("show");
  else teamGroup.classList.remove("show");

  document.getElementById("eventModal").classList.add("show");
}

// ================= CLEAR MODAL =================
function clearModal() {
  ["eventName","eventLocation","eventDate","eventTime",
   "eventSeats","eventDescription","editEventId","teamSize"].forEach(id => {
    document.getElementById(id).value = "";
  });
  document.getElementById("maxTickets").value = "1";
  document.getElementById("eventType").value  = "";
  document.getElementById("eventMode").value  = "";
  document.getElementById("teamSizeGroup").classList.remove("show");
  document.getElementById("modalError").classList.remove("show");
}

// ================= VIEW REGISTRATIONS =================
async function viewRegistrations(eventId, eventName) {
  document.getElementById("regModalTitle").textContent   = `Registrations — ${eventName}`;
  document.getElementById("regModalSubtitle").textContent = "Loading...";
  document.getElementById("regContent").innerHTML = `<div class="loading">Loading registrations...</div>`;
  document.getElementById("regModal").classList.add("show");

  try {
    const res  = await fetch(
      `${API_BASE}/events/${eventId}/registrations?organizer_id=${currentOrganizer.id}`,
      { credentials: "include" }
    );
    const data = await res.json();

    if (!Array.isArray(data)) {
      document.getElementById("regContent").innerHTML = `<p style="color:var(--danger)">Error: ${data.error}</p>`;
      return;
    }

    document.getElementById("regModalSubtitle").textContent = `${data.length} registration(s) found`;

    if (data.length === 0) {
      document.getElementById("regContent").innerHTML = `
        <div class="empty-state">
          <div class="icon">👥</div>
          <p>No registrations yet for this event.</p>
        </div>`;
      return;
    }

    document.getElementById("regContent").innerHTML = `
      <table class="reg-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Attendee Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Tickets</th>
            <th>Ticket ID</th>
            <th>Booked At</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((r, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${r.attendee_name}</td>
              <td>${r.attendee_email}</td>
              <td>${r.attendee_phone}</td>
              <td><span class="reg-count">${r.tickets_count}</span></td>
              <td style="font-size:.75rem;color:var(--accent)">${r.ticket_id}</td>
              <td style="font-size:.75rem;color:var(--muted)">${new Date(r.booked_at).toLocaleString("en-IN")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

  } catch (err) {
    document.getElementById("regContent").innerHTML = `<p style="color:var(--danger)">Error: ${err.message}</p>`;
  }
}

function closeRegModal() {
  document.getElementById("regModal").classList.remove("show");
}

// Close reg modal on overlay click
document.getElementById("regModal")?.addEventListener("click", e => {
  if (e.target === document.getElementById("regModal")) closeRegModal();
});

// ================= DELETE =================
async function deleteEventById(id) {
  if (!confirm("Are you sure you want to delete this event?")) return;

  try {
    const res  = await fetch(
      `${API_BASE}/events/${id}?organizer_id=${currentOrganizer.id}`,
      { method: "DELETE", credentials: "include" }
    );
    const data = await res.json();

    if (data.message) {
      showSuccess("✅ Event deleted!");
      await loadEvents();
    } else {
      showError("❌ " + (data.error || "Failed to delete."));
    }
  } catch (err) {
    showError("❌ " + err.message);
  }
}

// ================= LOGOUT =================
function setupLogout() {
  document.getElementById("logoutBtn").addEventListener("click", async () => {
    try { await logoutUser(); } catch {}
    sessionStorage.removeItem("organizer");
    window.location.href = "/Frontend/html/organizerLogIn.html";
  });
}