// ================= api.js =================
const BASE_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? "http://localhost:5000"
  : "https://YOUR-BACKEND-APP.onrender.com"; // 👈 replace with your real Render backend URL after deploying it

// ================= ADMIN AUTH =================
async function adminLogin(admin_id, password) {
  const res = await fetch(`${BASE_URL}/admin/login`, {
    method:"POST", headers:{"Content-Type":"application/json"},
    credentials:"include", body: JSON.stringify({admin_id, password})
  });
  return res.json();
}

// ================= ORGANIZER AUTH =================
async function organizerLogin(email, password) {
  const res = await fetch(`${BASE_URL}/organizer/login`, {
    method:"POST", headers:{"Content-Type":"application/json"},
    credentials:"include", body: JSON.stringify({email,password})
  });
  return res.json();
}

async function organizerRegister(name, email, password) {
  const res = await fetch(`${BASE_URL}/organizer/register`, {
    method:"POST", headers:{"Content-Type":"application/json"},
    credentials:"include", body: JSON.stringify({name,email,password})
  });
  return res.json();
}

// ================= USER AUTH =================
async function userLogin(email, password) {
  const res = await fetch(`${BASE_URL}/user/login`, {
    method:"POST", headers:{"Content-Type":"application/json"},
    credentials:"include", body: JSON.stringify({email,password})
  });
  return res.json();
}

async function userRegister(name, email, password) {
  const res = await fetch(`${BASE_URL}/user/register`, {
    method:"POST", headers:{"Content-Type":"application/json"},
    credentials:"include", body: JSON.stringify({name,email,password})
  });
  return res.json();
}

// ================= SESSION =================
async function checkSession() {
  const res = await fetch(`${BASE_URL}/session`, { credentials:"include" });
  return res.json();
}

async function logoutUser() {
  const res = await fetch(`${BASE_URL}/logout`, { method:"POST", credentials:"include" });
  return res.json();
}

// ================= EVENTS =================
async function getEvents(organizer_id = null) {
  const url = organizer_id
    ? `${BASE_URL}/events?organizer_id=${organizer_id}`
    : `${BASE_URL}/events`;
  const res = await fetch(url, { credentials:"include" });
  return res.json();
}

async function addEvent(eventData) {
  const payload = {
    ...eventData,
    organizer_id:         Number(eventData.organizer_id),
    total_seats:          Number(eventData.total_seats),
    max_tickets_per_user: Number(eventData.max_tickets_per_user)||1,
    team_size:            eventData.team_size ? Number(eventData.team_size) : null
  };
  const res = await fetch(`${BASE_URL}/events`, {
    method:"POST", headers:{"Content-Type":"application/json"},
    credentials:"include", body: JSON.stringify(payload)
  });
  return res.json();
}

async function updateEvent(id, eventData) {
  const payload = {
    ...eventData,
    organizer_id:         Number(eventData.organizer_id),
    total_seats:          Number(eventData.total_seats),
    max_tickets_per_user: Number(eventData.max_tickets_per_user)||1,
    team_size:            eventData.team_size ? Number(eventData.team_size) : null
  };
  const res = await fetch(`${BASE_URL}/events/${id}`, {
    method:"PUT", headers:{"Content-Type":"application/json"},
    credentials:"include", body: JSON.stringify(payload)
  });
  return res.json();
}

async function deleteEvent(id, organizer_id) {
  const res = await fetch(`${BASE_URL}/events/${id}?organizer_id=${Number(organizer_id)}`, {
    method:"DELETE", credentials:"include"
  });
  return res.json();
}

async function getEventRegistrations(event_id, organizer_id) {
  const res = await fetch(`${BASE_URL}/events/${event_id}/registrations?organizer_id=${organizer_id}`, {
    credentials:"include"
  });
  return res.json();
}

// ================= BOOKINGS =================
async function bookEvent(user_id, event_id, tickets_count, attendee_name, attendee_email, attendee_phone) {
  const res = await fetch(`${BASE_URL}/bookings`, {
    method:"POST", headers:{"Content-Type":"application/json"},
    credentials:"include",
    body: JSON.stringify({
      user_id:Number(user_id), event_id:Number(event_id),
      tickets_count:Number(tickets_count),
      attendee_name, attendee_email, attendee_phone
    })
  });
  return res.json();
}

async function getMyBookings(user_id) {
  const res = await fetch(`${BASE_URL}/mybookings/${user_id}`, { credentials:"include" });
  return res.json();
}