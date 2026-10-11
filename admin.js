
/* =========================================
   INTERNBOARD ADMIN DASHBOARD
========================================= */

const API_BASE = "http://localhost:5000/api";

const applicationsBody = document.getElementById("applicationsBody");
const statusMessage = document.getElementById("statusMessage");
const searchInput = document.getElementById("searchInput");
const resultCount = document.getElementById("resultCount");

const totalCount = document.getElementById("totalCount");
const internshipCount = document.getElementById("internshipCount");
const todayCount = document.getElementById("todayCount");

const refreshBtn = document.getElementById("refreshBtn");
const exportBtn = document.getElementById("exportBtn");
const logoutBtn = document.getElementById("logoutBtn");

const detailsModal = document.getElementById("detailsModal");
const detailName = document.getElementById("detailName");
const detailContent = document.getElementById("detailContent");

let applications = [];

/* =========================================
   ADMIN LOGIN
========================================= */

function getToken() {
    return sessionStorage.getItem("internboard_admin_token");
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.classList.toggle("error", isError);
    statusMessage.hidden = false;
}

function showLoginForm(message = "") {
    applicationsBody.innerHTML = "";
    totalCount.textContent = "—";
    internshipCount.textContent = "—";
    todayCount.textContent = "—";

    showStatus(
        message || "Please log in with your administrator account to view applications.",
        Boolean(message)
    );

    // Add a login form to the page.
    let loginPanel = document.getElementById("adminLoginPanel");

    if (!loginPanel) {
        loginPanel = document.createElement("section");
        loginPanel.id = "adminLoginPanel";
        loginPanel.className = "applications-panel";
        loginPanel.style.marginBottom = "24px";

        loginPanel.innerHTML = `
            <h2 style="margin-bottom:8px;">Admin Login</h2>
            <p style="color:#858ba1;margin-bottom:20px;">
                Sign in to securely access application records.
            </p>

            <form id="adminLoginForm" style="display:grid;gap:14px;max-width:420px;">
                <label style="display:grid;gap:7px;">
                    Email address
                    <input id="adminEmail" type="email" required
                        autocomplete="username"
                        placeholder="admin@internboard.com"
                        style="padding:12px;border:1px solid #e7e8f0;border-radius:8px;">
                </label>

                <label style="display:grid;gap:7px;">
                    Password
                    <input id="adminPassword" type="password" required
                        autocomplete="current-password"
                        placeholder="Enter your admin password"
                        style="padding:12px;border:1px solid #e7e8f0;border-radius:8px;">
                </label>

                <button type="submit"
                    style="padding:13px;border:0;border-radius:8px;background:#6956e8;color:white;font-weight:700;">
                    Sign In
                </button>

                <p id="loginMessage" role="status" style="color:#c23939;"></p>
            </form>
        `;

        const main = document.querySelector(".main-content");
        const welcomeBanner = document.querySelector(".welcome-banner");

        main.insertBefore(loginPanel, welcomeBanner.nextSibling);

        document.getElementById("adminLoginForm").addEventListener(
            "submit",
            handleLogin
        );
    }

    loginPanel.hidden = false;
}

async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById("adminEmail").value.trim();
    const password = document.getElementById("adminPassword").value;
    const loginMessage = document.getElementById("loginMessage");
    const submitButton = event.currentTarget.querySelector(
        'button[type="submit"]'
    );

    submitButton.disabled = true;
    submitButton.textContent = "Signing in...";
    loginMessage.textContent = "";

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
            throw new Error(result.message || "Login failed.");
        }

        sessionStorage.setItem(
            "internboard_admin_token",
            result.data.token
        );

        document.getElementById("adminLoginPanel").hidden = true;

        await loadApplications();
    } catch (error) {
        loginMessage.textContent =
            error.message === "Failed to fetch"
                ? "Cannot connect to the backend. Make sure npm run dev is running."
                : error.message;
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Sign In";
    }
}

/* =========================================
   LOAD APPLICATIONS
========================================= */

async function loadApplications() {
    const token = getToken();

    if (!token) {
        showLoginForm();
        return;
    }

    refreshBtn.disabled = true;
    showStatus("Loading applications...");

    try {
        const response = await fetch(`${API_BASE}/admin/applications`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (response.status === 401 || response.status === 403) {
            sessionStorage.removeItem("internboard_admin_token");
            showLoginForm("Your session expired or is invalid. Please sign in again.");
            return;
        }

        if (!response.ok) {
            throw new Error(result.message || "Unable to load applications.");
        }

        applications = Array.isArray(result.data) ? result.data : [];

        updateStats();
        renderApplications();

        statusMessage.hidden = true;

        const loginPanel = document.getElementById("adminLoginPanel");

        if (loginPanel) {
            loginPanel.hidden = true;
        }
    } catch (error) {
        showStatus(
            error.message === "Failed to fetch"
                ? "Cannot connect to the backend. Ensure the server is running on port 5000."
                : error.message,
            true
        );
    } finally {
        refreshBtn.disabled = false;
    }
}

/* =========================================
   DASHBOARD STATS
========================================= */

function updateStats() {
    const uniqueInternships = new Set(
        applications.map(application => application.internship_id)
    );

    const today = new Date().toLocaleDateString("en-CA");

    const todayApplications = applications.filter(application => {
        const date = new Date(
            application.created_at.replace(" ", "T") + "Z"
        );

        return !Number.isNaN(date.getTime()) &&
            date.toLocaleDateString("en-CA") === today;
    });

    totalCount.textContent = applications.length;
    internshipCount.textContent = uniqueInternships.size;
    todayCount.textContent = todayApplications.length;
}

/* =========================================
   RENDER APPLICATION TABLE
========================================= */

function renderApplications() {
    const query = searchInput.value.trim().toLowerCase();

    const filtered = applications.filter(application => {
        const searchable = [
            application.applicant_name,
            application.applicant_email,
            application.internship_title,
            application.internship_domain,
            application.internship_id
        ].join(" ").toLowerCase();

        return searchable.includes(query);
    });

    resultCount.textContent =
        `${filtered.length} application${filtered.length === 1 ? "" : "s"}`;

    if (!filtered.length) {
        applicationsBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-row">
                    ${applications.length
                        ? "No applications match your search."
                        : "No applications have been submitted yet."}
                </td>
            </tr>
        `;
        return;
    }

    applicationsBody.innerHTML = filtered.map(application => {
        const name = escapeHTML(application.applicant_name);
        const email = escapeHTML(application.applicant_email);
        const title = escapeHTML(application.internship_title);
        const domain = escapeHTML(application.internship_domain);
        const initials = escapeHTML(
            (application.applicant_name || "A")
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map(part => part[0])
                .join("")
                .toUpperCase()
        );

        const date = new Date(
            application.created_at.replace(" ", "T") + "Z"
        );

        const formattedDate = Number.isNaN(date.getTime())
            ? escapeHTML(application.created_at)
            : escapeHTML(date.toLocaleDateString());

        let portfolioLink = "—";

        if (application.portfolio_url) {
            try {
                const url = new URL(application.portfolio_url);

                if (["http:", "https:"].includes(url.protocol)) {
                    portfolioLink = `
                        <a class="portfolio-link"
                           href="${escapeHTML(url.href)}"
                           target="_blank"
                           rel="noopener noreferrer">Open ↗</a>
                    `;
                }
            } catch {
                portfolioLink = "Invalid URL";
            }
        }

        return `
            <tr>
                <td>
                    <div class="applicant-cell">
                        <div class="applicant-avatar">${initials}</div>
                        <div>
                            <div class="applicant-name">${name}</div>
                            <div class="applicant-email">${email}</div>
                        </div>
                    </div>
                </td>
                <td><span class="internship-name">${title}</span></td>
                <td><span class="domain-tag">${domain}</span></td>
                <td>${formattedDate}</td>
                <td>${portfolioLink}</td>
                <td>
                    <button class="view-btn" data-application-id="${Number(application.id)}">
                        View Details
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

/* =========================================
   APPLICATION DETAILS
========================================= */

function addDetail(label, value, isMessage = false) {
    const item = document.createElement("div");
    item.className = "detail-item";

    const heading = document.createElement("span");
    heading.className = "detail-label";
    heading.textContent = label;

    const content = document.createElement("div");
    content.className = "detail-value";

    // Always render user-submitted content as text, not HTML.
    content.textContent = value || "Not provided";

    if (isMessage) {
        content.style.whiteSpace = "pre-wrap";
    }

    item.append(heading, content);
    detailContent.appendChild(item);
}

applicationsBody.addEventListener("click", event => {
    const button = event.target.closest("[data-application-id]");

    if (!button) return;

    const application = applications.find(
        item => item.id === Number(button.dataset.applicationId)
    );

    if (!application) return;

    detailName.textContent = application.applicant_name || "Applicant";
    detailContent.replaceChildren();

    addDetail("Email", application.applicant_email);
    addDetail("Internship", application.internship_title);
    addDetail("Domain", application.internship_domain);
    addDetail("Internship ID", application.internship_id);
    addDetail("Portfolio URL", application.portfolio_url);
    addDetail("Cover Message", application.cover_message, true);
    addDetail("Submitted At", application.created_at);

    if (application.portfolio_url) {
        try {
            const url = new URL(application.portfolio_url);

            if (["http:", "https:"].includes(url.protocol)) {
                const link = document.createElement("a");
                link.href = url.href;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.textContent = "Open portfolio in a new tab ↗";

                const item = document.createElement("div");
                item.className = "detail-item";
                item.appendChild(link);
                detailContent.appendChild(item);
            }
        } catch {
            // Invalid URLs are shown as text only.
        }
    }

    detailsModal.hidden = false;
});

document.getElementById("closeModal").addEventListener("click", () => {
    detailsModal.hidden = true;
});

detailsModal.addEventListener("click", event => {
    if (event.target === detailsModal) {
        detailsModal.hidden = true;
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        detailsModal.hidden = true;
    }
});

/* =========================================
   SEARCH, REFRESH AND CSV EXPORT
========================================= */

searchInput.addEventListener("input", renderApplications);

refreshBtn.addEventListener("click", loadApplications);

logoutBtn.addEventListener("click", () => {
  sessionStorage.removeItem("internboard_admin_token");
  window.location.href = "admin-login.html";
});
exportBtn.addEventListener("click", () => {
    const query = searchInput.value.trim().toLowerCase();

    const filtered = applications.filter(application => {
        const searchable = [
            application.applicant_name,
            application.applicant_email,
            application.internship_title,
            application.internship_domain,
            application.internship_id
        ].join(" ").toLowerCase();

        return searchable.includes(query);
    });

    if (!filtered.length) {
        showStatus("There are no applications to export.", true);
        return;
    }

    const columns = [
        ["Applicant Name", "applicant_name"],
        ["Applicant Email", "applicant_email"],
        ["Internship ID", "internship_id"],
        ["Internship Title", "internship_title"],
        ["Domain", "internship_domain"],
        ["Portfolio", "portfolio_url"],
        ["Cover Message", "cover_message"],
        ["Submitted At", "created_at"]
    ];

    const csvEscape = value => {
        // Prevent spreadsheet formula injection in exported data.
        let text = String(value ?? "");

        if (/^[\s]*[=+\-@\t\r]/.test(text)) {
            text = "'" + text;
        }

        return '"' + text.replace(/"/g, '""') + '"';
    };

    const csv = [
        columns.map(column => csvEscape(column[0])).join(","),
        ...filtered.map(application =>
            columns.map(([, key]) => csvEscape(application[key])).join(",")
        )
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "internboard-applications.csv";
    link.click();

    URL.revokeObjectURL(url);
});

/* =========================================
   INITIALIZE
========================================= */

loadApplications();
