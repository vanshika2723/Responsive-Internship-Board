
const API_BASE = "http://localhost:5000/api";

const loginForm = document.getElementById("adminLoginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");
const togglePassword = document.getElementById("togglePassword");

function showMessage(message, type = "error") {
  loginMessage.textContent = message;
  loginMessage.className = `message ${type === "success" ? "success" : ""}`;
}

togglePassword.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";

  passwordInput.type = isPassword ? "text" : "password";
  togglePassword.textContent = isPassword ? "Hide" : "Show";
  togglePassword.setAttribute(
    "aria-label",
    isPassword ? "Hide password" : "Show password"
  );
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showMessage("Please enter your email and password.");
    return;
  }

  loginButton.disabled = true;
  loginButton.querySelector("span:first-child").textContent = "Signing in...";
  showMessage("");

  try {
    const response = await fetch(`${API_BASE}/admin/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Login failed. Check your credentials.");
    }

    if (!result.data || !result.data.token) {
      throw new Error("The server did not return an authentication token.");
    }

    sessionStorage.setItem("internboard_admin_token", result.data.token);

    showMessage("Login successful! Opening dashboard...", "success");

    window.location.href = "admin.html";
  } catch (error) {
    if (error.name === "TypeError") {
      showMessage(
        "Cannot connect to the backend. Start your server with npm run dev."
      );
    } else {
      showMessage(error.message || "Something went wrong. Please try again.");
    }
  } finally {
    loginButton.disabled = false;
    loginButton.querySelector("span:first-child").textContent =
      "Sign in to dashboard";
  }
});
