// ================= organizerLogIn.js =================
// Handles Organizer Login Page (Screen 4)

document.addEventListener("DOMContentLoaded", () => {

  const loginBtn      = document.getElementById("loginBtn");
  const emailInput    = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const errorMsg      = document.getElementById("errorMsg");
  const successMsg    = document.getElementById("successMsg");
  const spinner       = document.getElementById("spinner");
  const btnText       = document.getElementById("btnText");

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.add("show");
    successMsg.classList.remove("show");
  }

  function showSuccess(msg) {
    successMsg.textContent = msg;
    successMsg.classList.add("show");
    errorMsg.classList.remove("show");
  }

  function setLoading(isLoading) {
    loginBtn.disabled = isLoading;
    spinner.classList.toggle("show", isLoading);
    btnText.textContent = isLoading ? "Logging in..." : "🔑 Login";
  }

  loginBtn.addEventListener("click", async () => {

    const email    = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      showError("⚠️ Please enter your email and password.");
      return;
    }

    if (!email.includes("@")) {
      showError("⚠️ Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const data = await organizerLogin(email, password);

      if (data.success) {
        showSuccess("✅ Login successful! Redirecting...");

        // ✅ Save in sessionStorage as backup for session issues
        sessionStorage.setItem("organizer", JSON.stringify(data.user));

        setTimeout(() => {
          window.location.href = "/html/OrganizerDashBoard.html";
        }, 1000);

      } else {
        showError("❌ " + (data.message || "Invalid email or password."));
      }

    } catch (err) {
      showError("❌ Server error. Please make sure the backend is running.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }

  });

  [emailInput, passwordInput].forEach(input => {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") loginBtn.click();
    });
  });

});