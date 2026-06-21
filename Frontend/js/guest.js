// ================= guest.js =================
// Guest Page — Screen 12
// Guest can browse events but clicking Book redirects to userSignIn

let allEvents = [];

document.addEventListener("DOMContentLoaded", async () => {
  await loadEvents();
  setupSearch();
});

// ================= LOAD EVENTS =================
async function loadEvents() {
  const eventsList = document.getElementById("eventsList");
  eventsList.innerHTML = `<div class="loading">Loading events...</div>`;

  try {
    allEvents = await getEvents();

    if (allEvents.length === 0) {
      eventsList.innerHTML = `
        <div class="empty-state">
          <div class="icon">🎯</div>
          <p>No events available right now. Check back later!</p>
        </div>
      `;
      return;
    }

    renderEvents(allEvents);

  } catch (err) {
    eventsList.innerHTML = `
      <div class="empty-state">
        <p>❌ Failed to load events. Make sure backend is running.</p>
      </div>
    `;
    console.error("Load events error:", err);
  }
}

// ================= RENDER EVENTS =================
function renderEvents(events) {
  const eventsList = document.getElementById("eventsList");

  if (events.length === 0) {
    eventsList.innerHTML = `
      <div class="empty-state">
        <div class="icon">🔍</div>
        <p>No events found matching your search.</p>
      </div>
    `;
    return;
  }

  eventsList.innerHTML = events.map(event => {
    const isFull = event.seats <= 0;
    const isLow  = event.seats > 0 && event.seats <= 10;

    const seatClass = isFull ? "full" : isLow ? "low" : "";
    const seatText  = isFull ? "Sold Out" : `${event.seats} seats left`;

    return `
      <div class="event-card">
        <div class="event-info">
          <div class="event-name">${event.name}</div>
          <div class="event-meta">
            <span>📍 ${event.location}</span>
            <span>📅 ${formatDate(event.date_time)}</span>
            <span class="seats-badge ${seatClass}">🪑 ${seatText}</span>
          </div>
          ${event.organizer_name ? `<div style="font-size:0.75rem;color:var(--muted);margin-top:4px;">by ${event.organizer_name}</div>` : ""}
          ${event.description ? `<div style="font-size:0.8rem;color:var(--muted);margin-top:4px;">${event.description}</div>` : ""}
        </div>
        <button
          class="book-btn"
          ${isFull ? "disabled" : ""}
          onclick="${isFull ? "" : "showLoginModal()"}"
        >
          ${isFull ? "Sold Out" : "🎟️ Book"}
        </button>
      </div>
    `;
  }).join("");
}

// ================= SHOW LOGIN MODAL =================
// When guest clicks Book → show modal → redirect to userSignIn
function showLoginModal() {
  document.getElementById("loginModal").classList.add("show");
}

// ================= SEARCH =================
function setupSearch() {
  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
      renderEvents(allEvents);
      return;
    }
    const filtered = allEvents.filter(e =>
      e.name.toLowerCase().includes(query) ||
      e.location.toLowerCase().includes(query)
    );
    renderEvents(filtered);
  });
}

// ================= FORMAT DATE =================
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}