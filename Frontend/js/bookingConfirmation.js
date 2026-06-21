// ================= bookingConfirmation.js =================

let currentUser   = null;
let selectedEvent = null;

document.addEventListener("DOMContentLoaded", async () => {
  await checkAuth();
  loadEventDetails();
  setupConfirmBtn();
});

// ================= AUTH =================
async function checkAuth() {
  try {
    const stored = sessionStorage.getItem("user");
    if (stored) {
      currentUser = JSON.parse(stored);
    } else {
      const data = await checkSession();
      if (data.loggedIn && data.user.role === "user") {
        currentUser = data.user;
      } else {
        window.location.href = "/Frontend/html/userLogIn.html";
        return;
      }
    }
    document.getElementById("userName").textContent = currentUser.name;
    document.getElementById("userAvatar").textContent = currentUser.name.charAt(0).toUpperCase();

    // Pre-fill email
    document.getElementById("attendeeEmail").value = currentUser.email || "";
    document.getElementById("attendeeName").value  = currentUser.name  || "";

  } catch (err) {
    window.location.href = "/Frontend/html/userLogIn.html";
  }
}

// ================= LOAD EVENT DETAILS =================
function loadEventDetails() {
  const stored = sessionStorage.getItem("selectedEvent");
  if (!stored) { window.location.href = "/Frontend/html/userDashboard.html"; return; }

  selectedEvent = JSON.parse(stored);

  document.getElementById("eventName").textContent     = selectedEvent.name;
  document.getElementById("eventType").textContent     = selectedEvent.event_type || "General";
  document.getElementById("eventDate").textContent     = formatDate(selectedEvent.date);
  document.getElementById("eventTime").textContent     = formatTime(selectedEvent.time);
  document.getElementById("eventLocation").textContent = selectedEvent.location;
  document.getElementById("eventSeats").textContent    = selectedEvent.seats + " seats";
  document.getElementById("ticketsInfo").textContent   =
    `🎟️ Booking ${selectedEvent.tickets_count} ticket${selectedEvent.tickets_count > 1 ? "s" : ""}`;
}

// ================= CONFIRM =================
function setupConfirmBtn() {
  const confirmBtn = document.getElementById("confirmBtn");
  const spinner    = document.getElementById("spinner");
  const btnText    = document.getElementById("btnText");
  const errorMsg   = document.getElementById("errorMsg");

  confirmBtn.addEventListener("click", async () => {
    const attendeeName  = document.getElementById("attendeeName").value.trim();
    const attendeeEmail = document.getElementById("attendeeEmail").value.trim();
    const attendeePhone = document.getElementById("attendeePhone").value.trim();

    // Validate
    if (!attendeeName || !attendeeEmail || !attendeePhone) {
      errorMsg.textContent = "⚠️ Please fill in all your details.";
      errorMsg.classList.add("show");
      return;
    }

    if (!attendeeEmail.includes("@")) {
      errorMsg.textContent = "⚠️ Please enter a valid email address.";
      errorMsg.classList.add("show");
      return;
    }

    if (attendeePhone.length < 7) {
      errorMsg.textContent = "⚠️ Please enter a valid phone number.";
      errorMsg.classList.add("show");
      return;
    }

    errorMsg.classList.remove("show");
    confirmBtn.disabled = true;
    spinner.classList.add("show");
    btnText.textContent = "Booking...";

    try {
      const data = await bookEvent(
        currentUser.id,
        selectedEvent.id,
        selectedEvent.tickets_count,
        attendeeName,
        attendeeEmail,
        attendeePhone
      );

      if (data.message === "Booking successful") {
        // Save full ticket info for ticket page
        sessionStorage.setItem("ticket", JSON.stringify({
          ticket_id       : data.ticket_id,
          tickets_count   : data.tickets_count,
          event_id        : selectedEvent.id,
          event_name      : selectedEvent.name,
          event_type      : selectedEvent.event_type || "General",
          event_location  : selectedEvent.location,
          event_date      : selectedEvent.date,
          event_time      : selectedEvent.time,
          attendee_name   : attendeeName,
          attendee_email  : attendeeEmail,
          attendee_phone  : attendeePhone,
          booked_at       : new Date().toISOString()
        }));

        sessionStorage.removeItem("selectedEvent");
        window.location.href = "/Frontend/html/ticket.html";

      } else {
        errorMsg.textContent = "❌ " + (data.error || "Booking failed.");
        errorMsg.classList.add("show");
        confirmBtn.disabled = false;
        spinner.classList.remove("show");
        btnText.textContent = "✅ Confirm Booking";
      }

    } catch (err) {
      errorMsg.textContent = "❌ Server error. Make sure backend is running.";
      errorMsg.classList.add("show");
      confirmBtn.disabled = false;
      spinner.classList.remove("show");
      btnText.textContent = "✅ Confirm Booking";
    }
  });
}

// ================= FORMAT =================
function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function formatTime(t) {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const d = new Date(); d.setHours(h, m);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}