// ================= adminDashboard.js =================
const API = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? "http://localhost:5000"
  : "https://YOUR-BACKEND-APP.onrender.com"; // 👈 replace with your real Render backend URL after deploying it
let currentAdmin = null;
let monthlyChart = null;
let typeChart    = null;

document.addEventListener("DOMContentLoaded", async () => {
  // Auth check
  const stored = sessionStorage.getItem("admin");
  if (!stored) { window.location.href = "/Frontend/html/adminLogin.html"; return; }
  currentAdmin = JSON.parse(stored);

  document.getElementById("adminName").textContent   = currentAdmin.name || "Admin";
  document.getElementById("adminAvatar").textContent = (currentAdmin.name || "A").charAt(0).toUpperCase();

  // Load dashboard by default
  await loadDashboard();
});

// ===================================================
// NAVIGATION
// ===================================================
function showPage(page) {
  document.querySelectorAll(".page-section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.getElementById(`page-${page}`).classList.add("active");
  event.currentTarget.classList.add("active");

  // Load data for section
  if (page === "dashboard")  loadDashboard();
  if (page === "users")      loadUsers();
  if (page === "organizers") loadOrganizers();
  if (page === "events")     loadAdminEvents();
  if (page === "bookings")   loadBookings();
}

// ===================================================
// TOAST
// ===================================================
function toast(msg, type = "success") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = `alert-toast ${type} show`;
  setTimeout(() => el.classList.remove("show"), 3000);
}

// ===================================================
// MODAL
// ===================================================
function closeModal(id) {
  document.getElementById(id).classList.remove("show");
}

// ===================================================
// FILTER TABLE
// ===================================================
function filterTable(tableId, query) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const q = query.toLowerCase();
  table.querySelectorAll("tbody tr").forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? "" : "none";
  });
}

// ===================================================
// DASHBOARD
// ===================================================
async function loadDashboard() {
  try {
    const res  = await fetch(`${API}/admin/stats?admin_id=${currentAdmin.id}`, { credentials: "include" });
    const data = await res.json();

    document.getElementById("stat-users").textContent    = data.totalUsers    || 0;
    document.getElementById("stat-events").textContent   = data.totalEvents   || 0;
    document.getElementById("stat-bookings").textContent = data.totalBookings  || 0;
    document.getElementById("stat-blocked").textContent  = data.blockedUsers   || 0;

    // Monthly chart
    const monthly = Array.isArray(data.monthlyBookings) ? data.monthlyBookings.reverse() : [];
    if (monthlyChart) monthlyChart.destroy();
    const mCtx = document.getElementById("monthlyChart").getContext("2d");
    monthlyChart = new Chart(mCtx, {
      type: "bar",
      data: {
        labels: monthly.map(r => r.month),
        datasets: [{
          label: "Bookings",
          data: monthly.map(r => r.count),
          backgroundColor: "rgba(108,99,255,0.5)",
          borderColor: "#6c63ff",
          borderWidth: 1, borderRadius: 6
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: "#7a7a8c" }, grid: { color: "rgba(255,255,255,0.05)" } },
          y: { ticks: { color: "#7a7a8c" }, grid: { color: "rgba(255,255,255,0.05)" } }
        }
      }
    });

    // Type chart
    const types = Array.isArray(data.eventsByType) ? data.eventsByType : [];
    if (typeChart) typeChart.destroy();
    const tCtx = document.getElementById("typeChart").getContext("2d");
    typeChart = new Chart(tCtx, {
      type: "doughnut",
      data: {
        labels: types.map(r => r.event_type),
        datasets: [{
          data: types.map(r => r.count),
          backgroundColor: ["#6c63ff","#3ecfcf","#ff9f43","#ff6584","#32c864","#43beff","#c396ff","#ff8250","#ffc843","#aaa"]
        }]
      },
      options: {
        plugins: { legend: { labels: { color: "#7a7a8c", font: { size: 11 } } } }
      }
    });

    // Recent bookings
    const recent = Array.isArray(data.recentBookings) ? data.recentBookings : [];
    document.getElementById("recentBookings").innerHTML = recent.length === 0
      ? `<div class="empty">No bookings yet.</div>`
      : `<table><thead><tr><th>Ticket</th><th>Attendee</th><th>Event</th><th>Tickets</th><th>Status</th><th>Booked At</th></tr></thead>
         <tbody>${recent.map(b => `
           <tr>
             <td style="font-size:.75rem;color:#6c63ff">${b.ticket_id}</td>
             <td>${b.attendee_name}</td>
             <td>${b.event_name}</td>
             <td>${b.tickets_count}</td>
             <td><span class="badge badge-${b.status}">${b.status}</span></td>
             <td style="font-size:.75rem;color:var(--muted)">${new Date(b.booked_at).toLocaleString("en-IN")}</td>
           </tr>`).join("")}
         </tbody></table>`;

  } catch (err) {
    console.error("Dashboard error:", err);
  }
}

// ===================================================
// USERS
// ===================================================
async function loadUsers() {
  document.getElementById("usersTableWrap").innerHTML = `<div class="loading">Loading...</div>`;
  try {
    const res   = await fetch(`${API}/admin/users?admin_id=${currentAdmin.id}`, { credentials: "include" });
    const users = await res.json();

    if (!users.length) { document.getElementById("usersTableWrap").innerHTML = `<div class="empty">No users found.</div>`; return; }

    document.getElementById("usersTableWrap").innerHTML = `
      <table id="userTable">
        <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Bookings</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
        <tbody>${users.map(u => `
          <tr>
            <td>#${u.id}</td>
            <td>${u.name}</td>
            <td>${u.email}</td>
            <td>${u.booking_count}</td>
            <td><span class="badge badge-${u.status}">${u.status}</span></td>
            <td style="font-size:.75rem;color:var(--muted)">${new Date(u.created_at).toLocaleDateString("en-IN")}</td>
            <td style="display:flex;gap:6px;flex-wrap:wrap;">
              <button class="btn-sm btn-view" onclick="viewUserBookings(${u.id},'${u.name}')">📋 Bookings</button>
              ${u.status === "active"
                ? `<button class="btn-sm btn-block" onclick="updateUserStatus(${u.id},'blocked')">🚫 Block</button>`
                : `<button class="btn-sm btn-unblock" onclick="updateUserStatus(${u.id},'active')">✅ Unblock</button>`}
              <button class="btn-sm btn-delete" onclick="deleteUser(${u.id})">🗑️ Delete</button>
            </td>
          </tr>`).join("")}
        </tbody>
      </table>`;
  } catch (err) {
    document.getElementById("usersTableWrap").innerHTML = `<div class="empty">Error: ${err.message}</div>`;
  }
}

async function updateUserStatus(id, status) {
  if (!confirm(`${status === "blocked" ? "Block" : "Unblock"} this user?`)) return;
  try {
    const res  = await fetch(`${API}/admin/users/${id}/status`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status, admin_id: currentAdmin.id })
    });
    const data = await res.json();
    toast(data.message || "Updated!"); loadUsers();
  } catch (err) { toast(err.message, "error"); }
}

async function deleteUser(id) {
  if (!confirm("Permanently delete this user and all their data?")) return;
  try {
    const res  = await fetch(`${API}/admin/users/${id}?admin_id=${currentAdmin.id}`, {
      method: "DELETE", credentials: "include"
    });
    const data = await res.json();
    toast(data.message || "Deleted!"); loadUsers();
  } catch (err) { toast(err.message, "error"); }
}

async function viewUserBookings(userId, userName) {
  document.getElementById("userBookingsTitle").textContent = `Bookings — ${userName}`;
  document.getElementById("userBookingsContent").innerHTML = `<div class="loading">Loading...</div>`;
  document.getElementById("userBookingsModal").classList.add("show");

  try {
    const res      = await fetch(`${API}/admin/users/${userId}/bookings?admin_id=${currentAdmin.id}`, { credentials: "include" });
    const bookings = await res.json();

    if (!bookings.length) {
      document.getElementById("userBookingsContent").innerHTML = `<div class="empty">No bookings found.</div>`;
      return;
    }

    document.getElementById("userBookingsContent").innerHTML = `
      <table>
        <thead><tr><th>Ticket</th><th>Event</th><th>Date</th><th>Tickets</th><th>Status</th></tr></thead>
        <tbody>${bookings.map(b => `
          <tr>
            <td style="font-size:.75rem;color:#6c63ff">${b.ticket_id}</td>
            <td>${b.event_name}</td>
            <td>${b.event_date ? new Date(b.event_date).toLocaleDateString("en-IN") : "—"}</td>
            <td>${b.tickets_count}</td>
            <td><span class="badge badge-${b.status}">${b.status}</span></td>
          </tr>`).join("")}
        </tbody>
      </table>`;
  } catch (err) {
    document.getElementById("userBookingsContent").innerHTML = `<div class="empty">Error: ${err.message}</div>`;
  }
}

// ===================================================
// ORGANIZERS
// ===================================================
async function loadOrganizers() {
  document.getElementById("orgsTableWrap").innerHTML = `<div class="loading">Loading...</div>`;
  try {
    const res  = await fetch(`${API}/admin/organizers?admin_id=${currentAdmin.id}`, { credentials: "include" });
    const orgs = await res.json();

    if (!orgs.length) { document.getElementById("orgsTableWrap").innerHTML = `<div class="empty">No organizers found.</div>`; return; }

    document.getElementById("orgsTableWrap").innerHTML = `
      <table id="orgTable">
        <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Events</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
        <tbody>${orgs.map(o => `
          <tr>
            <td>#${o.id}</td>
            <td>${o.name}</td>
            <td>${o.email}</td>
            <td>${o.event_count}</td>
            <td><span class="badge badge-${o.status}">${o.status}</span></td>
            <td style="font-size:.75rem;color:var(--muted)">${new Date(o.created_at).toLocaleDateString("en-IN")}</td>
            <td style="display:flex;gap:6px;flex-wrap:wrap;">
              ${o.status !== "approved"
                ? `<button class="btn-sm btn-approve" onclick="updateOrgStatus(${o.id},'approved')">✅ Approve</button>`
                : `<button class="btn-sm btn-block" onclick="updateOrgStatus(${o.id},'blocked')">🚫 Block</button>`}
              <button class="btn-sm btn-delete" onclick="deleteOrg(${o.id})">🗑️ Remove</button>
            </td>
          </tr>`).join("")}
        </tbody>
      </table>`;
  } catch (err) {
    document.getElementById("orgsTableWrap").innerHTML = `<div class="empty">Error: ${err.message}</div>`;
  }
}

async function updateOrgStatus(id, status) {
  if (!confirm(`${status} this organizer?`)) return;
  try {
    const res  = await fetch(`${API}/admin/organizers/${id}/status`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status, admin_id: currentAdmin.id })
    });
    const data = await res.json();
    toast(data.message || "Updated!"); loadOrganizers();
  } catch (err) { toast(err.message, "error"); }
}

async function deleteOrg(id) {
  if (!confirm("Remove this organizer and all their events?")) return;
  try {
    const res  = await fetch(`${API}/admin/organizers/${id}?admin_id=${currentAdmin.id}`, {
      method: "DELETE", credentials: "include"
    });
    const data = await res.json();
    toast(data.message || "Deleted!"); loadOrganizers();
  } catch (err) { toast(err.message, "error"); }
}

// ===================================================
// EVENTS
// ===================================================
async function loadAdminEvents() {
  document.getElementById("eventsTableWrap").innerHTML = `<div class="loading">Loading...</div>`;
  try {
    const res    = await fetch(`${API}/admin/events?admin_id=${currentAdmin.id}`, { credentials: "include" });
    const events = await res.json();

    if (!events.length) { document.getElementById("eventsTableWrap").innerHTML = `<div class="empty">No events found.</div>`; return; }

    document.getElementById("eventsTableWrap").innerHTML = `
      <table id="eventTable">
        <thead><tr><th>ID</th><th>Event</th><th>Organizer</th><th>Type</th><th>Date</th><th>Seats</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${events.map(e => `
          <tr>
            <td>#${e.id}</td>
            <td>${e.name}</td>
            <td>${e.organizer_name}</td>
            <td>${e.event_type}</td>
            <td>${e.event_date ? new Date(e.event_date).toLocaleDateString("en-IN") : "—"}</td>
            <td>${e.booked_seats||0}/${e.total_seats}</td>
            <td><span class="badge badge-${e.status}">${e.status}</span></td>
            <td style="display:flex;gap:6px;flex-wrap:wrap;">
              ${e.status !== "approved"
                ? `<button class="btn-sm btn-approve" onclick="updateEventStatus(${e.id},'approved')">✅ Approve</button>`
                : `<button class="btn-sm btn-cancel" onclick="updateEventStatus(${e.id},'rejected')">❌ Reject</button>`}
              <button class="btn-sm btn-delete" onclick="deleteAdminEvent(${e.id})">🗑️ Delete</button>
            </td>
          </tr>`).join("")}
        </tbody>
      </table>`;
  } catch (err) {
    document.getElementById("eventsTableWrap").innerHTML = `<div class="empty">Error: ${err.message}</div>`;
  }
}

async function updateEventStatus(id, status) {
  try {
    const res  = await fetch(`${API}/admin/events/${id}/status`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status, admin_id: currentAdmin.id })
    });
    const data = await res.json();
    toast(data.message || "Updated!"); loadAdminEvents();
  } catch (err) { toast(err.message, "error"); }
}

async function deleteAdminEvent(id) {
  if (!confirm("Delete this event permanently?")) return;
  try {
    const res  = await fetch(`${API}/admin/events/${id}?admin_id=${currentAdmin.id}`, {
      method: "DELETE", credentials: "include"
    });
    const data = await res.json();
    toast(data.message || "Deleted!"); loadAdminEvents();
  } catch (err) { toast(err.message, "error"); }
}

// ===================================================
// BOOKINGS
// ===================================================
async function loadBookings() {
  document.getElementById("bookingsTableWrap").innerHTML = `<div class="loading">Loading...</div>`;
  try {
    const res      = await fetch(`${API}/admin/bookings?admin_id=${currentAdmin.id}`, { credentials: "include" });
    const bookings = await res.json();

    if (!bookings.length) { document.getElementById("bookingsTableWrap").innerHTML = `<div class="empty">No bookings found.</div>`; return; }

    document.getElementById("bookingsTableWrap").innerHTML = `
      <table id="bookingTable">
        <thead><tr><th>Ticket</th><th>Attendee</th><th>Event</th><th>Organizer</th><th>Tickets</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
        <tbody>${bookings.map(b => `
          <tr>
            <td style="font-size:.75rem;color:#6c63ff">${b.ticket_id}</td>
            <td>${b.attendee_name}<br/><span style="font-size:.72rem;color:var(--muted)">${b.attendee_email}</span></td>
            <td>${b.event_name}</td>
            <td>${b.organizer_name}</td>
            <td>${b.tickets_count}</td>
            <td><span class="badge badge-${b.status}">${b.status}</span></td>
            <td style="font-size:.75rem;color:var(--muted)">${new Date(b.booked_at).toLocaleString("en-IN")}</td>
            <td>
              ${b.status === "confirmed"
                ? `<button class="btn-sm btn-cancel" onclick="cancelBooking(${b.id})">❌ Cancel</button>`
                : `<span style="color:var(--muted);font-size:.75rem">Cancelled</span>`}
            </td>
          </tr>`).join("")}
        </tbody>
      </table>`;
  } catch (err) {
    document.getElementById("bookingsTableWrap").innerHTML = `<div class="empty">Error: ${err.message}</div>`;
  }
}

async function cancelBooking(id) {
  if (!confirm("Cancel this booking and restore the seat?")) return;
  try {
    const res  = await fetch(`${API}/admin/bookings/${id}/cancel`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ admin_id: currentAdmin.id })
    });
    const data = await res.json();
    toast(data.message || "Booking cancelled!"); loadBookings();
  } catch (err) { toast(err.message, "error"); }
}

// ===================================================
// REPORTS
// ===================================================
async function loadReport(type) {
  document.getElementById("reportTitle").textContent = type === "daily" ? "📅 Daily Report" : "📆 Monthly Report";
  document.getElementById("reportTableWrap").innerHTML = `<div class="loading">Loading...</div>`;

  try {
    const res  = await fetch(`${API}/admin/reports/${type}?admin_id=${currentAdmin.id}`, { credentials: "include" });
    const rows = await res.json();

    if (!rows.length) { document.getElementById("reportTableWrap").innerHTML = `<div class="empty">No data yet.</div>`; return; }

    const label = type === "daily" ? "Date" : "Month";
    document.getElementById("reportTableWrap").innerHTML = `
      <table>
        <thead><tr><th>${label}</th><th>Bookings</th><th>Tickets Sold</th></tr></thead>
        <tbody>${rows.map(r => `
          <tr>
            <td>${r.date || r.month}</td>
            <td>${r.bookings}</td>
            <td>${r.tickets}</td>
          </tr>`).join("")}
        </tbody>
      </table>`;
  } catch (err) {
    document.getElementById("reportTableWrap").innerHTML = `<div class="empty">Error: ${err.message}</div>`;
  }
}

async function exportCSV() {
  try {
    window.open(`${API}/admin/reports/export?admin_id=${currentAdmin.id}`, "_blank");
    toast("✅ CSV export started!");
  } catch (err) { toast(err.message, "error"); }
}

// ===================================================
// LOGOUT
// ===================================================
async function adminLogout() {
  try { await fetch(`${API}/logout`, { method: "POST", credentials: "include" }); } catch {}
  sessionStorage.removeItem("admin");
  window.location.href = "/Frontend/html/adminLogIn.html";
}