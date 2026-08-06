// Upload page behavior with auth guard
(function () {
    const STORAGE_KEY = "nsp_auth";
    const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port === '3000'
        ? 'http://localhost:5000'
        : '';

    function getAuth() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); }
        catch { return null; }
    }

    const form = document.getElementById("upload-form");
    if (!form) return;

    const auth = getAuth();
    if (!auth || !auth.token) {
        // Not logged in -> redirect to login
        alert("Please login first to upload notes.");
        window.location.href = "login.html";
        return;
    }

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        const submitBtn = document.getElementById("upload-submit");
        if (submitBtn) submitBtn.disabled = true;

        try {
            const fd = new FormData(form);
            const res = await fetch(`${API_BASE}/api/notes/upload`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${auth.token}` },
                body: fd
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                alert(data.message || "Upload failed!");
                if (submitBtn) submitBtn.disabled = false;
                return;
            }

            alert("Upload successful!");
            window.location.href = "all-notes.html";
        } catch (err) {
            console.error("Upload error:", err);
            alert("Upload failed! Please check your network connection.");
            if (submitBtn) submitBtn.disabled = false;
        }
    });
})();
