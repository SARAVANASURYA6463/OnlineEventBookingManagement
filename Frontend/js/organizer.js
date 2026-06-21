// ================= organizer.js =================
// Handles the Organizer Login / SignIn choice page (Screen 2)

document.addEventListener("DOMContentLoaded", () => {

  // Get buttons
  const loginBtn = document.getElementById("loginBtn");
  const signinBtn = document.getElementById("signinBtn");

  // Login button → go to Organizer Login Page (Screen 4)
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      window.location.href = "/Frontend/html/organizerLogIn.html";
    });
  }

  // SignIn button → go to Organizer SignIn Page (Screen 5)
  if (signinBtn) {
    signinBtn.addEventListener("click", () => {
window.location.href = "/Frontend/html/organizerSignIn.html";
    });
  }

});