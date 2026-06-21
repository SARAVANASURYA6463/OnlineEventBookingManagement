// ================= organizerSignIn.js =================
// Handles Organizer SignIn / Register Page (Screen 5)

document.addEventListener("DOMContentLoaded", () => {

  const signinBtn     = document.getElementById("signinBtn");
  const nameInput     = document.getElementById("name");
  const emailInput    = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const confirmInput  = document.getElementById("confirmPassword");
  const errorMsg      = document.getElementById("errorMsg");
  const successMsg    = document.getElementById("successMsg");
  const spinner       = document.getElementById("spinner");
  const btnText       = document.getElementById("btnText");

  // Show error
  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.add("show");
    successMsg.classList.remove("show");
  }

  // Show success
  function showSuccess(msg) {
    successMsg.textContent = msg;
    successMsg.classList.add("show");
    errorMsg.classList.remove("show");
  }

  // Loading state
  function setLoading(isLoading) {
    signinBtn.disabled = isLoading;
    spinner.classList.toggle("show", isLoading);
    btnText.textContent = isLoading ? "Creating account..." : "✨ Create Account";
  }

  // SignIn button click
  signinBtn.addEventListener("click", async () => {

    const name            = nameInput.value.trim();
    const email           = emailInput.value.trim();
    const password        = passwordInput.value.trim();
    const confirmPassword = confirmInput.value.trim();

    // Validations
    if (!name || !email || !password || !confirmPassword) {
      showError("⚠️ All fields are required.");
      return;
    }

    if (!email.includes("@")) {
      showError("⚠️ Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      showError("⚠️ Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      showError("⚠️ Passwords do not match.");
      return;
    }

    setLoading(true);

   try {
  const data = await organizerRegister(name, email, password);

  if (data.message === "Organizer registered successfully") {
    showSuccess("✅ Account created! Redirecting to login...");

    setTimeout(() => {
      window.location.href = "/Frontend/html/organizerLogIn.html";
    }, 1500);

  } else if (data.error === "Email already registered") {
    showError("❌ This email is already registered. Try logging in.");

  } else {
    showError("❌ " + (data.error || "Registration failed. Try again."));
  }

} catch (err) {
  showError("❌ Server error. Please make sure the backend is running.");
} finally {
  setLoading(false);
}

  });

  // Enter key support
  [nameInput, emailInput, passwordInput, confirmInput].forEach(input => {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") signinBtn.click();
    });
  });

});