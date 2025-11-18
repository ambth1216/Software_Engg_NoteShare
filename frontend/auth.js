// Frontend auth: signup, login, role routing, and nav toggles
(function () {
    const STORAGE_KEY = "nsp_auth";


    // function to fetch the user detail that stored in local storage through JWT
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
            // user is loged-in
            // Toggle Auth Buttons
            if (btnLogin) btnLogin.style.display = "none";
            if (btnSignup) btnSignup.style.display = "none";
            if (btnLogout) btnLogout.style.display = "inline-flex";

            // Showing "Upload" for all logged-in users
            if (navUpload) navUpload.style.display = "inline";

            // Hide "All Notes" for teachers
            if (auth.user?.role === 'teacher') {
                if (navAllNotes) navAllNotes.style.display = "none";
            } else {
                if (navAllNotes) navAllNotes.style.display = "inline";
            }

        } else {
            // User is Logged-out

            // Toggle Auth Buttons
            if (btnLogin) btnLogin.style.display = "inline-flex";
            if (btnSignup) btnSignup.style.display = "inline-flex";
            if (btnLogout) btnLogout.style.display = "none";

            // Toggle Nav Links
            // Hide "Upload" if not logged in
            if (navUpload) navUpload.style.display = "none";
            // Show "All Notes" for logged-out users
            if (navAllNotes) navAllNotes.style.display = "inline";
        }
    }

    // after logging-in teachers will be navigated to the "Teacher's Notes" and students will be navigated to the "All notes"
    function routeAfterLogin(role) {
        if (role === "teacher") {
            window.location.href = "teacher-notes.html";
        } else {
            window.location.href = "all-notes.html";
        }
    }

    async function signup(payload) {
        const res = await fetch("http://localhost:5000/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`Signup failed: ${res.status}`);
        return await res.json();
    }

    async function login(payload) {
        const res = await fetch("http://localhost:5000/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`Login failed: ${res.status}`);
        return await res.json();
    }

    // Handle logout
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
                alert("Sign up failed. Please try again.");
                console.error(err);
            }
        });
    }

    // Handle login form
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const form = e.currentTarget;
            const email = form.querySelector("#email-add").value.trim();
            const password = form.querySelector("#password").value;
            try {
                const data = await login({ email, password });
                setAuth(data);
                updateNav();
                routeAfterLogin(data?.user?.role);
            } catch (err) {
                alert("Login failed. Please check your credentials.");
                console.error(err);
            }
        });
    }

    // Initial nav paint on page load
    updateNav();
})();