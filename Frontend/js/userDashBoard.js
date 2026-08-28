// ================= userDashboard.js =================
let currentUser = null;
let allEvents   = [];
let activeType  = "All";

document.addEventListener("DOMContentLoaded", async () => {
  await checkAuth();
  await loadEvents();
  setupSearch();
  setupFilters();
  setupLogout();
});

// ================= AUTH =================
async function checkAuth() {
  try {
    const stored = sessionStorage.getItem("user");
    if (stored) {
      currentUser = JSON.parse(stored);
      document.getElementById("userName").textContent = currentUser.name;
      document.getElementById("userId").textContent   = "ID: " + currentUser.id;
      document.getElementById("userAvatar").textContent = currentUser.name.charAt(0).toUpperCase();
      return;
    }
    const data = await checkSession();
    if (data.loggedIn && data.user.role === "user") {
      currentUser = data.user;
      sessionStorage.setItem("user", JSON.stringify(data.user));
      document.getElementById("userName").textContent   = currentUser.name;
      document.getElementById("userId").textContent     = "ID: " + currentUser.id;
      document.getElementById("userAvatar").textContent = currentUser.name.charAt(0).toUpperCase();
    } else {
      window.location.href = "/html/userLogIn.html";
    }
  } catch (err) {
    window.location.href = "/html/userLogIn.html";
  }
}

// ================= LOAD EVENTS =================
async function loadEvents() {
  const eventsList = document.getElementById("eventsList");
  eventsList.innerHTML = `<div class="loading">Loading events...</div>`;
  try {
    allEvents = await getEvents();
    renderEvents(allEvents);
  } catch (err) {
    eventsList.innerHTML = `<div class="empty-state"><p>❌ Failed to load events.</p></div>`;
  }
}

// ================= RENDER EVENTS =================
function renderEvents(events) {
  const eventsList = document.getElementById("eventsList");
  const filtered   = activeType === "All" ? events : events.filter(e => e.event_type === activeType);

  if (filtered.length === 0) {
    eventsList.innerHTML = `<div class="empty-state"><div class="icon">🔍</div><p>No events found.</p></div>`;
    return;
  }

  eventsList.innerHTML = filtered.map(event => {
    const available = event.total_seats - event.booked_seats;
    const isFull    = available <= 0;
    const isLow     = available > 0 && available <= 10;
    const seatClass = isFull ? "full" : isLow ? "low" : "";
    const seatText  = isFull ? "Sold Out" : `${available} seats left`;
    const maxTickets = event.max_tickets_per_user || 1;

    return `
      <div class="event-card">
        <div class="event-info">
          <div class="event-type-badge">${event.event_type}</div>
          <div class="event-name">${event.name}</div>
          <div class="event-meta">
            <span>📍 ${event.location}</span>
            <span>📅 ${formatDate(event.event_date)}</span>
            <span>⏰ ${formatTime(event.event_time)}</span>
            <span class="seats-badge ${seatClass}">🪑 ${seatText}</span>
          </div>
          ${event.organizer_name ? `<div style="font-size:0.74rem;color:var(--muted);margin-top:4px;">by ${event.organizer_name}</div>` : ""}
          <div class="max-info">🎫 Max ${maxTickets} ticket(s) per user</div>
        </div>

        <div class="book-section">
          ${!isFull ? `
            <div class="ticket-input-row">
              <span class="ticket-label">Qty:</span>
              <input type="number" class="ticket-count" id="qty-${event.id}" value="1" min="1" max="${maxTickets}"/>
            </div>
          ` : ""}
          <button
            class="book-btn"
            ${isFull ? "disabled" : ""}
            onclick="${isFull ? "" : `goToConfirmation(${event.id}, '${escapeStr(event.name)}', '${event.event_date}', '${event.event_time}', '${escapeStr(event.location)}', ${available}, ${maxTickets})`}"
          >
            ${isFull ? "Sold Out" : "🎟️ Book"}
          </button>
        </div>
      </div>
    `;
  }).join("");
}

// ================= GO TO CONFIRMATION =================
function goToConfirmation(id, name, event_date, event_time, location, available, maxTickets) {
  const qtyInput = document.getElementById("qty-" + id);
  const qty      = qtyInput ? parseInt(qtyInput.value) || 1 : 1;

  if (qty < 1) { alert("Please enter at least 1 ticket."); return; }
  if (qty > maxTickets) { alert(`Max ${maxTickets} ticket(s) allowed per user.`); return; }
  if (qty > available) { alert(`Only ${available} seats available.`); return; }

  sessionStorage.setItem("selectedEvent", JSON.stringify({
    id, name, event_date, event_time, location, available, maxTickets, qty
  }));
  window.location.href = "/html/bookingConfirmation.html";
}

// ================= SEARCH =================
function setupSearch() {
  document.getElementById("searchInput").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = q
      ? allEvents.filter(ev => ev.name.toLowerCase().includes(q) || ev.location.toLowerCase().includes(q) || ev.event_type.toLowerCase().includes(q))
      : allEvents;
    renderEvents(filtered);
  });
}

// ================= FILTERS =================
function setupFilters() {
  document.getElementById("filterTabs").addEventListener("click", (e) => {
    if (!e.target.classList.contains("filter-tab")) return;
    document.querySelectorAll(".filter-tab").forEach(t => t.classList.remove("active"));
    e.target.classList.add("active");
    activeType = e.target.dataset.type;
    renderEvents(allEvents);
  });
}

// ================= FORMAT =================
function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(timeStr) {
  if (!timeStr) return "—";
  const [h, m] = timeStr.split(":");
  const hour   = parseInt(h);
  const ampm   = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

function escapeStr(str) {
  return String(str).replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

// ================= LOGOUT =================
function setupLogout() {
  document.getElementById("logoutBtn").addEventListener("click", async () => {
    try { await logoutUser(); } catch (err) {}
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("selectedEvent");
    window.location.href = "/html/userLogIn.html";
  });
}