// Frontend auth: signup, login, role routing, and nav toggles
(function () {
    const STORAGE_KEY = "nsp_auth";

    // Dynamic API Base URL detection:
    // If running locally on port 3000 (Docker Compose / static server without reverse proxy), hit http://localhost:5000
    // If running in production behind AWS ALB (same host/domain), use relative path ''
    const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port === '3000'
        ? 'http://localhost:5000'
        : '';

    // function to fetch the user detail stored in local storage through JWT
    function getAuth() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); }
        catch { return null; }
    }
    function setAuth(value) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    }
    function clearAuth() {
        localStorage.removeItem(STORAGE_KEY);
    }

    function updateNav() {
        const auth = getAuth();

        // Getting Auth Buttons
        const btnLogin = document.getElementById("btn-login");
        const btnSignup = document.getElementById("btn-signup");
        const btnLogout = document.getElementById("btn-logout");

        // Get Nav Links
        const navUpload = document.getElementById("nav-upload");
        const navAllNotes = document.getElementById("nav-all-notes");

        if (auth && auth.token) {
            // User is logged-in
            if (btnLogin) btnLogin.style.display = "none";
            if (btnSignup) btnSignup.style.display = "none";
            if (btnLogout) btnLogout.style.display = "inline-flex";

            // Show "Upload" for all logged-in users
            if (navUpload) navUpload.style.display = "inline";

            // Hide "All Notes" for teachers
            if (auth.user?.role === 'teacher') {
                if (navAllNotes) navAllNotes.style.display = "none";
            } else {
                if (navAllNotes) navAllNotes.style.display = "inline";
            }
        } else {
            // User is logged-out
            if (btnLogin) btnLogin.style.display = "inline-flex";
            if (btnSignup) btnSignup.style.display = "inline-flex";
            if (btnLogout) btnLogout.style.display = "none";

            // Hide "Upload" if not logged in
            if (navUpload) navUpload.style.display = "none";
            // Show "All Notes" for logged-out users
            if (navAllNotes) navAllNotes.style.display = "inline";
        }
    }

    // Route after login based on role
    function routeAfterLogin(role) {
        if (role === "teacher") {
            window.location.href = "teacher-notes.html";
        } else {
            window.location.href = "all-notes.html";
        }
    }

    async function signup(payload) {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || `Signup failed (${res.status})`);
        return data;
    }

    async function login(payload) {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || `Login failed (${res.status})`);
        return data;
    }

    // Handle logout button
    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", function (e) {
            e.preventDefault();
            clearAuth();
            updateNav();
            window.location.href = "index.html";
        });
    }

    // Handle signup form
    const signupForm = document.getElementById("signup-form");
    if (signupForm) {
        signupForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const submitBtn = document.getElementById("signup-submit");
            if (submitBtn) submitBtn.disabled = true;

            const form = e.currentTarget;
            const name = form.querySelector("#u-name").value.trim();
            const email = form.querySelector("#email-add").value.trim();
            const password = form.querySelector("#password").value;
            const role = (form.querySelector("#role")?.value || "student").toLowerCase();

            try {
                const data = await signup({ name, email, password, role });
                setAuth(data);
                updateNav();
                routeAfterLogin(data?.user?.role);
            } catch (err) {
                alert(err.message || "Sign up failed. Please try again.");
                console.error("Signup error:", err);
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // Handle login form
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const submitBtn = document.getElementById("login-submit");
            if (submitBtn) submitBtn.disabled = true;

            const form = e.currentTarget;
            const email = form.querySelector("#email-add").value.trim();
            const password = form.querySelector("#password").value;

            try {
                const data = await login({ email, password });
                setAuth(data);
                updateNav();
                routeAfterLogin(data?.user?.role);
            } catch (err) {
                alert(err.message || "Login failed. Please check your credentials.");
                console.error("Login error:", err);
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // Initial nav update
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", updateNav);
    } else {
        updateNav();
    }
})();