// ================= adminLogin.js =================

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn  = document.getElementById("loginBtn");
  const adminId   = document.getElementById("adminId");
  const password  = document.getElementById("password");
  const errorMsg  = document.getElementById("errorMsg");
  const successMsg= document.getElementById("successMsg");
  const spinner   = document.getElementById("spinner");
  const btnText   = document.getElementById("btnText");

  function showError(msg) {
    errorMsg.textContent = msg; errorMsg.classList.add("show");
    successMsg.classList.remove("show");
  }
  function showSuccess(msg) {
    successMsg.textContent = msg; successMsg.classList.add("show");
    errorMsg.classList.remove("show");
  }
  function setLoading(v) {
    loginBtn.disabled = v;
    spinner.classList.toggle("show", v);
    btnText.textContent = v ? "Logging in..." : "🔐 Admin Login";
  }

  const API_BASE = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:5000"
    : "https://YOUR-BACKEND-APP.onrender.com"; // 👈 replace with your real Render backend URL after deploying it

  loginBtn.addEventListener("click", async () => {
    const id  = adminId.value.trim();
    const pwd = password.value.trim();

    if (!id || !pwd) { showError("⚠️ Please enter Admin ID and Password."); return; }

    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ admin_id: id, password: pwd })
      });
      const data = await res.json();

      if (data.success) {
        showSuccess("✅ Login successful! Redirecting...");
        sessionStorage.setItem("admin", JSON.stringify(data.admin));
        setTimeout(() => {
          window.location.href = "/Frontend/html/adminDashBoard.html";
        }, 800);
      } else {
        showError("❌ " + (data.message || "Invalid credentials."));
      }
    } catch (err) {
      showError("❌ Server error. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  });

  [adminId, password].forEach(el => {
    el.addEventListener("keydown", e => { if (e.key === "Enter") loginBtn.click(); });
  });
});