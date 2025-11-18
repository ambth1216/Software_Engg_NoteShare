// Upload page behavior with auth guard
// Assumed endpoint: POST /api/notes (multipart) fields: title, subject, file

(function () {
    const STORAGE_KEY = "nsp_auth";
    function getAuth() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); }
        catch { return null; }
    }

    const form = document.getElementById("upload-form");
    if (!form) return;

    const auth = getAuth();
    if (!auth || !auth.token) {
        // Not logged in → send to login
        window.location.href = "login.html";
        return;
    }

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        const fd = new FormData(form);
        const res = await fetch("http://localhost:5000/api/notes/upload", {
            method: "POST",
            headers: { "Authorization": `Bearer ${auth.token}` },
            body: fd
        });
        if (!res.ok) {
            // eslint-disable-next-line no-alert
            alert("Upload fail!")
            console.log("failed to upload");
            return ;
        }
        // eslint-disable-next-line no-alert
        alert("Upload successful!");
        window.location.href = "all-notes.html";
    });
})();


