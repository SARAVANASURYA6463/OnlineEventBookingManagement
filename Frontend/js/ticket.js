// ================= ticket.js =================
// Ticket Page — Screen 13

let ticketData = null;

document.addEventListener("DOMContentLoaded", () => {
  loadTicket();
  setupShare();
  setupDownloadPDF();
});

// ================= LOAD TICKET =================
function loadTicket() {
  const stored = sessionStorage.getItem("ticket");
  if (!stored) {
    window.location.href = "/Frontend/html/userDashboard.html";
    return;
  }

  ticketData = JSON.parse(stored);
  const bookedAt = new Date(ticketData.booked_at);

  document.getElementById("ticketId").textContent       = ticketData.ticket_id;
  document.getElementById("eventName").textContent      = ticketData.event_name;
  document.getElementById("eventId").textContent        = "#" + ticketData.event_id;
  document.getElementById("eventType").textContent      = ticketData.event_type || "General";
  document.getElementById("eventDate").textContent      = formatDate(ticketData.event_date);
  document.getElementById("eventTime").textContent      = formatTime(ticketData.event_time);
  document.getElementById("eventLocation").textContent  = ticketData.event_location;
  document.getElementById("ticketsCount").textContent   = ticketData.tickets_count + " ticket(s)";
  document.getElementById("attendeeName").textContent   = ticketData.attendee_name;
  document.getElementById("attendeeEmail").textContent  = ticketData.attendee_email;
  document.getElementById("attendeePhone").textContent  = ticketData.attendee_phone;
  document.getElementById("bookingDate").textContent    = bookedAt.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  document.getElementById("bookingTime").textContent    = bookedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
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

// ================= SHARE =================
function setupShare() {
  document.getElementById("shareBtn").addEventListener("click", () => {
    if (!ticketData) return;

    const bookedAt = new Date(ticketData.booked_at);

    const text = `🎟️ EventEase Ticket
━━━━━━━━━━━━━━━━━━
Ticket ID   : ${ticketData.ticket_id}
Event       : ${ticketData.event_name}
Type        : ${ticketData.event_type}
Date        : ${formatDate(ticketData.event_date)}
Time        : ${formatTime(ticketData.event_time)}
Location    : ${ticketData.event_location}
Tickets     : ${ticketData.tickets_count}
━━━━━━━━━━━━━━━━━━
Attendee    : ${ticketData.attendee_name}
Email       : ${ticketData.attendee_email}
Phone       : ${ticketData.attendee_phone}
Booked on   : ${bookedAt.toLocaleString("en-IN")}
━━━━━━━━━━━━━━━━━━`;

    document.getElementById("shareText").textContent = text;
    document.getElementById("shareModal").classList.add("show");

    document.getElementById("copyBtn").onclick = () => {
      navigator.clipboard.writeText(text).then(() => {
        document.getElementById("copyBtn").textContent = "✅ Copied!";
        setTimeout(() => {
          document.getElementById("copyBtn").textContent = "📋 Copy to Clipboard";
        }, 2000);
      });
    };
  });
}

// ================= DOWNLOAD PDF =================
function setupDownloadPDF() {
  document.getElementById("downloadBtn").addEventListener("click", () => {
    if (!ticketData) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });

    const W = 148; // A5 width in mm
    const bookedAt = new Date(ticketData.booked_at);

    // ── Background ──
    doc.setFillColor(10, 10, 15);
    doc.rect(0, 0, W, 210, "F");

    // ── Header gradient bar ──
    doc.setFillColor(30, 40, 60);
    doc.roundedRect(8, 8, W - 16, 36, 4, 4, "F");

    // ── Header text ──
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(62, 207, 207);
    doc.text("EventEase", W / 2, 20, { align: "center" });

    doc.setFontSize(9);
    doc.setTextColor(120, 120, 140);
    doc.text("BOOKING CONFIRMED", W / 2, 27, { align: "center" });

    doc.setFontSize(11);
    doc.setTextColor(240, 240, 245);
    doc.text("🎉 Your Ticket", W / 2, 36, { align: "center" });

    // ── Ticket ID box ──
    doc.setFillColor(20, 30, 40);
    doc.roundedRect(8, 50, W - 16, 16, 3, 3, "F");
    doc.setDrawColor(62, 207, 207);
    doc.setLineDashPattern([2, 2], 0);
    doc.roundedRect(8, 50, W - 16, 16, 3, 3, "S");
    doc.setLineDashPattern([], 0);

    doc.setFontSize(7);
    doc.setTextColor(120, 120, 140);
    doc.text("TICKET ID", W / 2, 56, { align: "center" });

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(62, 207, 207);
    doc.text(ticketData.ticket_id, W / 2, 63, { align: "center" });

    // ── Section: Event Info ──
    let y = 76;

    function sectionHeader(title) {
      doc.setFillColor(25, 25, 35);
      doc.rect(8, y - 4, W - 16, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(62, 207, 207);
      doc.text(title, W / 2, y + 1, { align: "center" });
      y += 8;
    }

    function detailRow(label, value) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 140);
      doc.text(label, 14, y);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(240, 240, 245);
      doc.text(String(value), W - 14, y, { align: "right" });

      doc.setDrawColor(40, 40, 55);
      doc.line(14, y + 2, W - 14, y + 2);
      y += 9;
    }

    sectionHeader("── EVENT INFORMATION ──");

    detailRow("Event Name",  ticketData.event_name);
    detailRow("Event ID",    "#" + ticketData.event_id);
    detailRow("Type",        ticketData.event_type || "General");
    detailRow("Date",        formatDate(ticketData.event_date));
    detailRow("Time",        formatTime(ticketData.event_time));
    detailRow("Location",    ticketData.event_location);
    detailRow("Tickets",     ticketData.tickets_count + " ticket(s)");

    y += 4;

    // Dashed divider
    doc.setDrawColor(40, 40, 55);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(8, y, W - 8, y);
    doc.setLineDashPattern([], 0);
    y += 6;

    sectionHeader("── ATTENDEE INFORMATION ──");

    detailRow("Name",         ticketData.attendee_name);
    detailRow("Email",        ticketData.attendee_email);
    detailRow("Phone",        ticketData.attendee_phone);
    detailRow("Booking Date", bookedAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }));
    detailRow("Booking Time", bookedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));

    y += 4;

    // ── Footer ──
    doc.setFillColor(20, 30, 40);
    doc.roundedRect(8, y, W - 16, 14, 3, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(62, 207, 207);
    doc.text("Thank you for booking with EventEase!", W / 2, y + 6, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 140);
    doc.text("Please show this ticket at the event entrance.", W / 2, y + 11, { align: "center" });

    // ── Save ──
    doc.save(`EventEase-Ticket-${ticketData.ticket_id}.pdf`);
  });
}