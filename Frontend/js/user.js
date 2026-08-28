// ================= user.js =================
// Handles User Entry Page (Login / Sign In)

document.addEventListener("DOMContentLoaded", () => {

  const loginBtn  = document.getElementById("loginBtn");
  const signinBtn = document.getElementById("signinBtn");

  // ================= LOGIN BUTTON =================
  loginBtn.addEventListener("click", () => {
    // ✅ redirect to user login page
    window.location.href = "/html/userLogin.html";
  });

  // ================= SIGN IN BUTTON =================
  signinBtn.addEventListener("click", () => {
    // ✅ redirect to user register page
    window.location.href = "/html/userSignIn.html";
  });

});