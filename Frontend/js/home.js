// ================= HOME PAGE JS =================

// Runs when page loads
document.addEventListener("DOMContentLoaded", () => {
  console.log("Home page loaded");

  checkUserSession();
});

// ================= SESSION CHECK =================
async function checkUserSession() {
  try {
    // make sure api.js has this function
    if (typeof checkSession !== "function") {
      console.warn("checkSession() not found");
      return;
    }

    const session = await checkSession();

    // OPTIONAL LOGIC (do not force redirect)
    if (session && session.user) {
      console.log("User already logged in:", session.user);
    } else {
      console.log("No active session");
    }

  } catch (error) {
    console.error("Session check failed:", error);
  }
}