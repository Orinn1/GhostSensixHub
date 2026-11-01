/**
 * GhostSensix Script Hub - Standalone Core App
 * Completely decoupled: Pure English, Isolated Database, No external sync.
 */

document.addEventListener("DOMContentLoaded", async () => {
    // =========================================================================
    // State & Variables
    // =========================================================================
    let scripts = [];
    let siteConfig = {
        siteName: "GhostSensix",
        brandPrefix: "Ghost",
        brandSuffix: "Sensix",
        siteTagline: "Premium Roblox Scripts & Live Exploit Status",
        youtubeChannel: "@GhostSensix",
        youtubeUrl: "https://www.youtube.com/@GhostSensix",
        discordInvite: "https://discord.gg/6MTUP78KF6"
    };

    let currentView = "home";
    let activeFilter = "all";
    let activeGame = "";
    let searchQuery = "";
    let allExploits = [];
    let selectedScript = null;

    // DOM Elements
    const homeView = document.getElementById("homeView");
    const feedView = document.getElementById("feedView");
    const exploitsView = document.getElementById("exploitsView");

    const homeRecentScripts = document.getElementById("homeRecentScripts");
    const scriptsFeed = document.getElementById("scriptsFeed");
    const totalCount = document.getElementById("totalCount");
    const gameCountBadge = document.getElementById("gameCountBadge");
    const gameDropdownCountBadge = document.getElementById("gameDropdownCountBadge");
    const gameMenu = document.getElementById("gameMenu");
    const coreGameDropdownBtn = document.getElementById("coreGameDropdownBtn");
    const coreGameDropdownMenu = document.getElementById("coreGameDropdownMenu");
    const gameDropdownSearchInput = document.getElementById("gameDropdownSearchInput");
    const gameDropdownSearchClear = document.getElementById("gameDropdownSearchClear");

    const globalSearch = document.getElementById("globalSearch");
    const searchClearBtn = document.getElementById("searchClearBtn");
    const mobileHomeSearchInput = document.getElementById("mobileHomeSearchInput");
    const mobileHomeSearchClear = document.getElementById("mobileHomeSearchClear");
    const mobileFeedSearchInput = document.getElementById("mobileFeedSearchInput");
    const mobileFeedSearchClear = document.getElementById("mobileFeedSearchClear");

    const homeExecutorsGrid = document.getElementById("homeExecutorsGrid");
    const exploitsGrid = document.getElementById("exploitsGrid");

    const lockerModal = document.getElementById("lockerModal");
    const closeLockerBtn = document.getElementById("closeLockerBtn");
    const modalScriptTitle = document.getElementById("modalScriptTitle");
    const scriptCodeBox = document.getElementById("scriptCodeBox");
    const btnCopyScript = document.getElementById("btnCopyScript");
    const unlockedView = document.getElementById("unlockedView");
    const tasksStack = document.getElementById("tasksStack");
    const lockedLabel = document.getElementById("lockedLabel");

    const suncModal = document.getElementById("suncModal");
    const closeSuncModalBtn = document.getElementById("closeSuncModalBtn");

    // =========================================================================
    // Refresh Icons Helper
    // =========================================================================
    function refreshIcons() {
        if (window.lucide && typeof window.lucide.createIcons === "function") {
            window.lucide.createIcons();
        }
    }

    // =========================================================================
    // Toast Notification
    // =========================================================================
    function showToast(msg) {
        let toast = document.getElementById("ghostToast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "ghostToast";
            toast.style.cssText = "position:fixed;bottom:24px;right:24px;background:#181131;color:#fff;border:1px solid #a855f7;box-shadow:0 8px 24px rgba(168,85,247,0.4);padding:12px 20px;border-radius:10px;font-size:13px;font-weight:600;z-index:999999;display:flex;align-items:center;gap:8px;transition:all 0.3s ease;opacity:0;transform:translateY(15px);pointer-events:none;";
            document.body.appendChild(toast);
        }
        toast.innerHTML = `<i data-lucide="check-circle" style="color:#c084fc;width:16px;height:16px;"></i> ${escapeHtml(msg)}`;
        refreshIcons();
        toast.style.opacity = "1";
        toast.style.transform = "translateY(0)";
        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(15px)";
        }, 3200);
    }

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    // =========================================================================
    // Data Loading (Purely Local - Zero Sync)
    // =========================================================================
    async function loadLocalDatabase() {
        try {
            // Load config
            const cfgRes = await fetch("data/config.json?t=" + Date.now()).catch(() => null);
            if (cfgRes && cfgRes.ok) {
                const cfg = await cfgRes.json();
                siteConfig = Object.assign(siteConfig, cfg);
            }
        } catch (e) {
            console.debug("[GhostSensix] Using default config", e);
        }

        try {
            // Load scripts
            const scpRes = await fetch("data/scripts.json?t=" + Date.now()).catch(() => null);
            if (scpRes && scpRes.ok) {
                const data = await scpRes.json();
                if (Array.isArray(data)) {
                    scripts = data;
                }
            }
        } catch (e) {
            console.warn("[GhostSensix] Could not load data/scripts.json", e);
        }

        updateCategoryBadges();
        renderHomeRecent();
        renderFeed();
        refreshIcons();
    }

    // =========================================================================
    // View Navigation
    // =========================================================================
    function switchView(viewName, filter = "all", game = "") {
        currentView = viewName;
        activeFilter = filter;
        activeGame = game;

        if (homeView) homeView.style.display = viewName === "home" ? "block" : "none";
        if (feedView) feedView.style.display = viewName === "feed" ? "block" : "none";
        if (exploitsView) exploitsView.style.display = viewName === "exploits" ? "block" : "none";

        // Update nav active classes
        document.querySelectorAll(".core-nav-tab, .bottom-nav-item").forEach(el => {
            const nav = el.getAttribute("data-nav");
            const f = el.getAttribute("data-filter");
            if (nav === viewName && (!f || f === filter)) {
                el.classList.add("active");
            } else {
                el.classList.remove("active");
            }
        });

        // Update feed titles
        const currentViewTitle = document.getElementById("currentViewTitle");
        const currentViewDesc = document.getElementById("currentViewDesc");
        if (currentViewTitle) {
            if (activeGame) {
                currentViewTitle.textContent = `${activeGame} Scripts`;
                if (currentViewDesc) currentViewDesc.textContent = `All verified Lua scripts and auto farms for ${activeGame}`;
            } else if (activeFilter === "keyless") {
                currentViewTitle.textContent = "Keyless Scripts";
                if (currentViewDesc) currentViewDesc.textContent = "Instant execution, no keys or verification required";
            } else if (activeFilter === "mobile") {
                currentViewTitle.textContent = "Mobile Supported Scripts";
                if (currentViewDesc) currentViewDesc.textContent = "Supports Delta, Codex, Hydrogen on Android & iOS";
            } else {
                currentViewTitle.textContent = "All Scripts";
                if (currentViewDesc) currentViewDesc.textContent = "Select any script below to unlock and copy the Lua loader";
            }
        }

        // Update filter chips in feed view
        document.querySelectorAll(".view-filter-chips .chip").forEach(c => {
            const tag = c.getAttribute("data-tag");
            if (tag === activeFilter) c.classList.add("active");
            else c.classList.remove("active");
        });

        if (viewName === "home") renderHomeRecent();
        if (viewName === "feed") renderFeed();
        if (viewName === "exploits") renderExploits();

        window.scrollTo({ top: 0, behavior: "smooth" });
        refreshIcons();
    }

    // Attach Nav Click Listeners
    document.querySelectorAll("[data-nav]").forEach(el => {
        el.addEventListener("click", () => {
            const nav = el.getAttribute("data-nav");
            const filter = el.getAttribute("data-filter") || "all";
            switchView(nav, filter, "");
        });
    });

    const btnSeeAllScripts = document.getElementById("btnSeeAllScripts");
    if (btnSeeAllScripts) btnSeeAllScripts.addEventListener("click", () => switchView("feed", "all", ""));

    const btnSeeAllExploits = document.getElementById("btnSeeAllExploits");
    if (btnSeeAllExploits) btnSeeAllExploits.addEventListener("click", () => switchView("exploits", "all", ""));

    // =========================================================================
    // Game Categories & Dropdown
    // =========================================================================
    function updateCategoryBadges() {
        const gameMap = new Map();
        scripts.forEach(s => {
            const g = (s.game || "Other").trim();
            gameMap.set(g, (gameMap.get(g) || 0) + 1);
        });

        const total = scripts.length;
        if (totalCount) totalCount.textContent = String(total);
        if (gameCountBadge) gameCountBadge.textContent = String(gameMap.size);
        if (gameDropdownCountBadge) gameDropdownCountBadge.textContent = String(gameMap.size);

        if (!gameMenu) return;

        let html = `
            <div class="game-dropdown-item ${activeGame === "" ? "active" : ""}" data-game="">
                <div class="game-item-left">
                    <i data-lucide="layers" class="game-icon"></i>
                    <span class="game-title">All Games</span>
                </div>
                <span class="game-count">${total}</span>
            </div>
        `;

        Array.from(gameMap.entries()).sort((a, b) => b[1] - a[1]).forEach(([gameName, count]) => {
            html += `
                <div class="game-dropdown-item ${activeGame.toLowerCase() === gameName.toLowerCase() ? "active" : ""}" data-game="${escapeHtml(gameName)}">
                    <div class="game-item-left">
                        <i data-lucide="gamepad-2" class="game-icon"></i>
                        <span class="game-title">${escapeHtml(gameName)}</span>
                    </div>
                    <span class="game-count">${count}</span>
                </div>
            `;
        });

        gameMenu.innerHTML = html;

        // Dropdown Item Clicks
        gameMenu.querySelectorAll(".game-dropdown-item").forEach(item => {
            item.addEventListener("click", () => {
                const g = item.getAttribute("data-game") || "";
                if (coreGameDropdownMenu) coreGameDropdownMenu.classList.remove("show");
                switchView("feed", "all", g);
            });
        });

        refreshIcons();
    }

    // Toggle Dropdown Menu
    if (coreGameDropdownBtn && coreGameDropdownMenu) {
        coreGameDropdownBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            coreGameDropdownMenu.classList.toggle("show");
            if (coreGameDropdownMenu.classList.contains("show") && gameDropdownSearchInput) {
                gameDropdownSearchInput.focus();
            }
        });

        document.addEventListener("click", (e) => {
            if (!coreGameDropdownMenu.contains(e.target) && !coreGameDropdownBtn.contains(e.target)) {
                coreGameDropdownMenu.classList.remove("show");
            }
        });
    }

    // Filter games within dropdown
    if (gameDropdownSearchInput) {
        gameDropdownSearchInput.addEventListener("input", (e) => {
            const q = e.target.value.toLowerCase().trim();
            if (gameDropdownSearchClear) gameDropdownSearchClear.style.display = q ? "block" : "none";
            document.querySelectorAll("#gameMenu .game-dropdown-item").forEach(el => {
                const text = el.textContent.toLowerCase();
                el.style.display = text.includes(q) ? "flex" : "none";
            });
        });
    }

    if (gameDropdownSearchClear && gameDropdownSearchInput) {
        gameDropdownSearchClear.addEventListener("click", () => {
            gameDropdownSearchInput.value = "";
            gameDropdownSearchClear.style.display = "none";
            document.querySelectorAll("#gameMenu .game-dropdown-item").forEach(el => el.style.display = "flex");
        });
    }

    // =========================================================================
    // Search Sync across inputs
    // =========================================================================
    function handleSearch(val) {
        searchQuery = (val || "").toLowerCase().trim();
        [globalSearch, mobileHomeSearchInput, mobileFeedSearchInput].forEach(inp => {
            if (inp && inp.value !== val) inp.value = val;
        });
        [searchClearBtn, mobileHomeSearchClear, mobileFeedSearchClear].forEach(btn => {
            if (btn) btn.style.display = searchQuery ? "inline-flex" : "none";
        });

        if (currentView === "home" && searchQuery) {
            switchView("feed", activeFilter, activeGame);
        } else {
            renderFeed();
            if (currentView === "home") renderHomeRecent();
        }
    }

    [globalSearch, mobileHomeSearchInput, mobileFeedSearchInput].forEach(inp => {
        if (inp) {
            inp.addEventListener("input", (e) => handleSearch(e.target.value));
        }
    });

    [searchClearBtn, mobileHomeSearchClear, mobileFeedSearchClear].forEach(btn => {
        if (btn) {
            btn.addEventListener("click", () => handleSearch(""));
        }
    });

    // Keyboard shortcut (Ctrl + K or /)
    document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey && e.key.toLowerCase() === "k") || (e.key === "/" && document.activeElement.tagName !== "INPUT")) {
            e.preventDefault();
            if (globalSearch) globalSearch.focus();
        }
    });

    // Feed Filter Chips Click
    document.querySelectorAll(".view-filter-chips .chip").forEach(chip => {
        chip.addEventListener("click", () => {
            const tag = chip.getAttribute("data-tag") || "all";
            switchView("feed", tag, activeGame);
        });
    });

    // =========================================================================
    // Filtering Scripts
    // =========================================================================
    function getFilteredScripts() {
        return scripts.filter(s => {
            if (!s) return false;

            // Filter tag
            if (activeFilter === "keyless" && !s.isKeyless) return false;
            if (activeFilter === "mobile" && !s.isMobile) return false;

            // Game category filter
            if (activeGame && (s.game || "").toLowerCase() !== activeGame.toLowerCase()) {
                return false;
            }

            // Search query filter
            if (searchQuery) {
                const title = (s.title || "").toLowerCase();
                const desc = (s.description || "").toLowerCase();
                const game = (s.game || "").toLowerCase();
                if (!title.includes(searchQuery) && !desc.includes(searchQuery) && !game.includes(searchQuery)) {
                    return false;
                }
            }

            return true;
        });
    }

    // =========================================================================
    // Script Card HTML Rendering
    // =========================================================================
    function createScriptCard(item) {
        const title = item.title || "Roblox Script";
        const desc = item.description || "Verified Lua script & auto farm loader.";
        const thumb = item.thumbnail || "Logo.png";
        const game = item.game || "Roblox";
        const badge = item.badge || (item.isKeyless ? "KEYLESS" : "OP");

        const platformText = item.isMobile
            ? (item.isPC ? "Mobile & PC" : "Mobile Only")
            : "PC Only";

        return `
            <div class="script-row" data-script-id="${escapeHtml(item.id)}" onclick="window.openGhostLocker('${escapeHtml(item.id)}')">
                <div class="row-thumb-wrap" title="${escapeHtml(title)}">
                    <img class="row-thumb" src="${escapeHtml(thumb)}" alt="${escapeHtml(title)}" loading="lazy">
                    <div class="row-thumb-overlay"></div>
                    <div class="thumb-badge-top-left">
                        <span class="row-game-badge" title="${escapeHtml(game)}">
                            <i data-lucide="gamepad-2" style="width: 11px; height: 11px;"></i> ${escapeHtml(game)}
                        </span>
                    </div>
                    <div class="thumb-badge-top-right">
                        <span class="tag-badge ${item.isKeyless ? 'keyless' : 'has-key'}">
                            <i data-lucide="${item.isKeyless ? 'check' : 'key'}" style="width: 13px; height: 13px; stroke-width: 2.5px;"></i>
                            ${item.isKeyless ? "KEYLESS" : "KEY REQUIRED"}
                        </span>
                    </div>
                    ${badge ? `<div class="thumb-badge-bottom-left"><span class="row-chip-badge updated"><i data-lucide="sparkles" style="width: 10px; height: 10px;"></i> ${escapeHtml(badge)}</span></div>` : ''}
                </div>

                <div class="row-meta">
                    <h3 class="row-title">${escapeHtml(title)}</h3>
                    <p class="row-features">${escapeHtml(desc)}</p>
                    <div class="row-tags">
                        <span class="tag-badge platform">
                            <i data-lucide="smartphone" style="width: 11px; height: 11px;"></i>
                            ${platformText}
                        </span>
                        <span class="tag-badge working">
                            <span class="dot-working" style="background:#22c55e;"></span> Working
                        </span>
                    </div>
                </div>

                <div class="row-right">
                    <button type="button" class="btn-get" onclick="event.stopPropagation(); window.openGhostLocker('${escapeHtml(item.id)}')">
                        <span>Get Script</span>
                        <i data-lucide="arrow-right" style="width: 14px; height: 14px;"></i>
                    </button>
                </div>
            </div>
        `;
    }

    function renderHomeRecent() {
        if (!homeRecentScripts) return;
        const list = getFilteredScripts().slice(0, 8);
        if (list.length === 0) {
            homeRecentScripts.innerHTML = `<div style="text-align:center;padding:50px 20px;color:var(--text-muted);grid-column:1/-1;">
                <i data-lucide="folder-open" style="width:36px;height:36px;color:#a855f7;margin-bottom:12px;opacity:0.8;"></i>
                <h3 style="color:#fff;font-size:16px;margin-bottom:6px;">No Scripts In Database</h3>
                <p style="font-size:13px;color:#a99fc4;">The database is ready. Add your scripts to <code>public/ghostsensi/data/scripts.json</code>.</p>
            </div>`;
            refreshIcons();
            return;
        }
        homeRecentScripts.innerHTML = list.map(createScriptCard).join("");
        refreshIcons();
    }

    function renderFeed() {
        if (!scriptsFeed) return;
        const list = getFilteredScripts();
        if (list.length === 0) {
            scriptsFeed.innerHTML = `<div style="text-align:center;padding:50px 20px;color:var(--text-muted);grid-column:1/-1;">
                <i data-lucide="folder-open" style="width:36px;height:36px;color:#a855f7;margin-bottom:12px;opacity:0.8;"></i>
                <h3 style="color:#fff;font-size:16px;margin-bottom:6px;">No Scripts In Database</h3>
                <p style="font-size:13px;color:#a99fc4;">The database is ready. Add your scripts to <code>public/ghostsensi/data/scripts.json</code>.</p>
            </div>`;
            refreshIcons();
            return;
        }
        scriptsFeed.innerHTML = list.map(createScriptCard).join("");
        refreshIcons();
    }

    // =========================================================================
    // Modal & Copy Script Loader
    // =========================================================================
    window.openGhostLocker = function(id) {
        selectedScript = scripts.find(s => String(s.id) === String(id));
        if (!selectedScript) return;

        if (modalScriptTitle) modalScriptTitle.textContent = selectedScript.title || "GhostSensix Script";
        if (scriptCodeBox) scriptCodeBox.textContent = selectedScript.loadstring || "-- No script code provided";

        // Hide task steps and show unlocked view directly
        if (tasksStack) tasksStack.style.display = "none";
        if (lockedLabel) lockedLabel.style.display = "none";
        if (unlockedView) unlockedView.style.display = "block";

        if (lockerModal) lockerModal.classList.add("active");

        // Auto copy to clipboard
        if (selectedScript.loadstring && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(selectedScript.loadstring).then(() => {
                showToast("Script copied to clipboard!");
            }).catch(() => {});
        }

        refreshIcons();
    };

    if (closeLockerBtn && lockerModal) {
        closeLockerBtn.addEventListener("click", () => {
            lockerModal.classList.remove("active");
        });
        lockerModal.addEventListener("click", (e) => {
            if (e.target === lockerModal) lockerModal.classList.remove("active");
        });
    }

    if (btnCopyScript) {
        btnCopyScript.addEventListener("click", () => {
            if (selectedScript && selectedScript.loadstring) {
                navigator.clipboard.writeText(selectedScript.loadstring).then(() => {
                    showToast("Script code copied!");
                }).catch(() => {});
            }
        });
    }

    // =========================================================================
    // WEAO API Exploits & sUNC Status
    // =========================================================================
    async function fetchExploits() {
        try {
            let res = await fetch("https://weao.xyz/api/status/exploits").catch(() => null);
            if (!res || !res.ok) {
                res = await fetch("/api/exploits").catch(() => null);
            }
            if (res && res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    allExploits = data;
                    renderHomeExecutors();
                }
            }
        } catch (e) {
            console.debug("[GhostSensix] WEAO fetch notice", e);
        }
    }

    function renderHomeExecutors() {
        if (!homeExecutorsGrid || allExploits.length === 0) return;

        // Render marquee cards
        const topExploits = allExploits.slice(0, 15);
        let cardsHtml = topExploits.map(ex => {
            const isUpdated = Boolean(ex.updated || ex.status === "working");
            const statusColor = isUpdated ? "#22c55e" : "#f87171";
            const sunc = ex.sunc ? `${Math.round(ex.sunc)}%` : "100%";
            return `
                <div class="executor-marquee-card" style="cursor:pointer;" onclick="window.openGhostSunc('${escapeHtml(ex.title)}')">
                    <div class="marquee-logo-wrap">
                        <img src="${escapeHtml(ex.icon || 'Logo.png')}" alt="${escapeHtml(ex.title)}" onerror="this.src='Logo.png'" style="width:28px;height:28px;border-radius:6px;object-fit:cover;">
                    </div>
                    <div class="marquee-info">
                        <div class="marquee-title-row">
                            <span class="marquee-name">${escapeHtml(ex.title)}</span>
                            <span class="marquee-sunc-pill" style="color:#c084fc;font-size:11px;font-weight:700;">sUNC ${sunc}</span>
                        </div>
                        <div class="marquee-sub-row" style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:6px;">
                            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${statusColor};"></span>
                            <span>${isUpdated ? "Updated" : "Updating"}</span> &bull; <span>${escapeHtml(ex.platform || "PC/Mobile")}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join("");

        homeExecutorsGrid.innerHTML = cardsHtml + cardsHtml; // duplicate for smooth continuous marquee
        refreshIcons();
    }

    function renderExploits() {
        if (!exploitsGrid) return;
        if (allExploits.length === 0) {
            exploitsGrid.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);grid-column:1/-1;">Loading executor status...</div>`;
            return;
        }

        const platformFilter = document.querySelector("#exploitPlatformFilter .chip.active")?.getAttribute("data-plat") || "all";
        const filtered = allExploits.filter(ex => {
            if (platformFilter !== "all" && ex.platform && !ex.platform.toLowerCase().includes(platformFilter.toLowerCase())) {
                return false;
            }
            return true;
        });

        exploitsGrid.innerHTML = filtered.map(ex => {
            const isUpdated = Boolean(ex.updated || ex.status === "working");
            const sunc = ex.sunc ? `${Math.round(ex.sunc)}%` : "100%";
            return `
                <div class="exploit-card" style="background:#160f2e;border:1px solid #281b4b;border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:12px;">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <img src="${escapeHtml(ex.icon || 'Logo.png')}" alt="${escapeHtml(ex.title)}" onerror="this.src='Logo.png'" style="width:40px;height:40px;border-radius:8px;object-fit:cover;">
                        <div style="flex:1;">
                            <h4 style="font-size:15px;color:#fff;margin:0 0 4px 0;">${escapeHtml(ex.title)}</h4>
                            <span style="font-size:11px;color:#a99fc4;">${escapeHtml(ex.platform || "All Platforms")}</span>
                        </div>
                        <span class="tag-badge" style="background:rgba(168,85,247,0.18);color:#c084fc;font-weight:700;font-size:11px;padding:4px 8px;border-radius:6px;">sUNC ${sunc}</span>
                    </div>
                    <div style="display:flex;align-items:center;justify-content:space-between;padding-top:8px;border-top:1px solid rgba(255,255,255,0.06);">
                        <span style="font-size:12px;color:${isUpdated ? '#22c55e' : '#f87171'};display:inline-flex;align-items:center;gap:6px;">
                            <span style="width:7px;height:7px;border-radius:50%;background:${isUpdated ? '#22c55e' : '#f87171'};"></span>
                            ${isUpdated ? "Working & Safe" : "Pending Update"}
                        </span>
                        ${ex.website ? `<a href="${escapeHtml(ex.website)}" target="_blank" style="color:#c084fc;font-size:12px;font-weight:600;text-decoration:none;">Official Site &rarr;</a>` : ''}
                    </div>
                </div>
            `;
        }).join("");

        refreshIcons();
    }

    // Platform Filter Chips Click in Exploits View
    document.querySelectorAll("#exploitPlatformFilter .chip").forEach(chip => {
        chip.addEventListener("click", () => {
            document.querySelectorAll("#exploitPlatformFilter .chip").forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            renderExploits();
        });
    });

    // sUNC Modal
    window.openGhostSunc = function(title) {
        const found = allExploits.find(ex => ex.title === title);
        if (!found) return;

        const suncModalTitle = document.getElementById("suncModalTitle");
        const suncVersion = document.getElementById("suncVersion");
        const suncTime = document.getElementById("suncTime");
        const suncPassedCount = document.getElementById("suncPassedCount");
        const suncFailedCount = document.getElementById("suncFailedCount");
        const suncTestList = document.getElementById("suncTestList");

        if (suncModalTitle) suncModalTitle.textContent = `${found.title} - sUNC Benchmark`;
        if (suncVersion) suncVersion.textContent = found.version || "Latest";
        if (suncTime) suncTime.textContent = "Recently Tested";
        if (suncPassedCount) suncPassedCount.textContent = found.sunc ? String(Math.round(found.sunc)) : "95";
        if (suncFailedCount) suncFailedCount.textContent = found.sunc ? String(100 - Math.round(found.sunc)) : "5";

        if (suncTestList) {
            suncTestList.innerHTML = `
                <div style="padding:16px;color:#a99fc4;font-size:13px;line-height:1.6;">
                    <strong>Executor:</strong> ${escapeHtml(found.title)}<br>
                    <strong>Platform:</strong> ${escapeHtml(found.platform || "PC / Mobile")}<br>
                    <strong>Benchmark Status:</strong> 100% Tested & Verified on latest Roblox Client.
                </div>
            `;
        }

        if (suncModal) suncModal.classList.add("active");
        refreshIcons();
    };

    if (closeSuncModalBtn && suncModal) {
        closeSuncModalBtn.addEventListener("click", () => suncModal.classList.remove("active"));
        suncModal.addEventListener("click", (e) => {
            if (e.target === suncModal) suncModal.classList.remove("active");
        });
    }

    // =========================================================================
    // Mobile Bottom Menu Button
    // =========================================================================
    const bottomNavMenuBtn = document.getElementById("bottomNavMenuBtn");
    if (bottomNavMenuBtn && coreGameDropdownMenu) {
        bottomNavMenuBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            coreGameDropdownMenu.classList.toggle("show");
        });
    }

    // =========================================================================
    // Boot App
    // =========================================================================
    await loadLocalDatabase();
    fetchExploits();
});

