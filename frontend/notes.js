// Simple frontend for All Notes / Teacher Notes pages
(function () {
    const state = {
        page: 1,
        pageSize: 9,
        total: 0,
        query: "",
        subject: "",
        sort: "recent"
    };

    const root = document.getElementById("notes-root");
    if (!root) return;

    const pageType = root.getAttribute("data-page");

    const controls = {
        search: document.getElementById("notes-search"),
        subject: document.getElementById("notes-subject"),
        sort: document.getElementById("notes-sort"),
        grid: document.getElementById("notes-grid"),
        count: document.getElementById("notes-count"),
        prev: document.getElementById("notes-prev"),
        next: document.getElementById("notes-next")
    };

    function endpoint() {
        const base = "http://localhost:5000/api/notes";
        const params = new URLSearchParams();
        if (pageType === "teacher") params.set("role", "teacher");
        if (state.query) params.set("q", state.query);
        if (state.subject) params.set("subject", state.subject);
        if (state.sort) params.set("sort", state.sort);
        params.set("page", String(state.page));
        params.set("limit", String(state.pageSize));
        return `${base}?${params.toString()}`;
    }

    function renderSkeleton(count) {
        controls.grid.innerHTML = Array.from({ length: count })
            .map(() => (
                '<div class="note-card skeleton">\
                    <div class="sk-title"></div>\
                    <div class="sk-meta"></div>\
                    <div class="sk-meta short"></div>\
                    <div class="sk-actions"></div>\
                </div>'
            )).join("");
    }

    function star(rating) {
        const r = Math.max(0, Math.min(5, Number(rating) || 0));
        return `${r.toFixed(1)} ★`;
    }

    // --- Updated Card Function ---
    function card(note) {
        const verified = note.verified ? '<span class="badge badge-verified">Verified</span>' : "";
        const uploader = note.uploaderName ? `Uploaded by ${note.uploaderName}` : "";
        const subject = note.subject ? `Subject: ${note.subject}` : "";
        
        // View link (direct link to file)
        const viewHref = note.viewUrl || "#";
        // Download link
        const downloadHref = `http://localhost:5000/api/notes/download/${note._id}`;

        return (
            '<div class="note-card">\
                <h3 class="note-title">' + (note.title || "Untitled") + '</h3>\
                <div class="note-meta">' + uploader + ' ' + verified + '</div>\
                <div class="note-meta">' + subject + '</div>\
                <div class="note-footer">\
                    <span class="note-rating">' + star(note.rating) + '</span>\
                    <!-- Added a div to group buttons -->\
                    <div class="note-actions">\
                        <a class="button-p btn-view" href="' + viewHref + '" target="_blank" rel="noopener">View</a>\
                        <a class="button-p btn-download" href="' + downloadHref + '">Download</a>\
                    </div>\
                </div>\
            </div>'
        );
    }

    function render(data) {
        state.total = data.total || (Array.isArray(data.notes) ? data.notes.length : 0);
        const notes = data.notes || [];
        controls.grid.innerHTML = notes.map(card).join("");
        const start = (state.page - 1) * state.pageSize + 1;
        const end = Math.min(state.page * state.pageSize, state.total);
        controls.count.textContent = state.total > 0 ? `${start}-${end} of ${state.total}` : "No results";
        controls.prev.disabled = state.page <= 1;
        const hasMore = state.total > state.page * state.pageSize;
        controls.next.disabled = !hasMore;
    }

    async function load() {
        renderSkeleton(6);
        try {
            const token = (function(){ try { return JSON.parse(localStorage.getItem("nsp_auth")||"null")?.token; } catch { return null; } })();
            const headers = { "Accept": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;
            const res = await fetch(endpoint(), { headers });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            render(json);
        } catch (err) {
            controls.grid.innerHTML = '<div class="notes-error">Failed to load notes. Please try again.</div>';
            controls.count.textContent = "";
            console.error(err);
        }
    }

    // Event wiring 
    if (controls.search) {
        controls.search.addEventListener("input", function (e) {
            state.query = e.target.value.trim();
            state.page = 1;
            load();
        });
    }
    if (controls.subject) {
        controls.subject.addEventListener("change", function (e) {
            state.subject = e.target.value;
            state.page = 1;
            load();
        });
    }
    if (controls.sort) {
        controls.sort.addEventListener("change", function (e) {
            state.sort = e.target.value;
            state.page = 1;
            load();
        });
    }
    if (controls.prev) {
        controls.prev.addEventListener("click", function () {
            if (state.page > 1) {
                state.page -= 1;
                load();
            }
        });
    }
    if (controls.next) {
        controls.next.addEventListener("click", function () {
            state.page += 1;
            load();
        });
    }

    // Initial load
    load();
})();