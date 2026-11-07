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

        // Firebase Cloud DB Sync (ghostsensi-1d96b)
        if (window.firebase && siteConfig.firebaseConfig && siteConfig.firebaseConfig.projectId) {
            try {
                if (!firebase.apps || !firebase.apps.length) {
                    firebase.initializeApp(siteConfig.firebaseConfig);
                }
                const db = firebase.firestore();
                console.log("[GhostSensix] Firebase DB connected:", siteConfig.firebaseConfig.projectId);

                // Fetch scripts from Firestore collection "scripts" if available
                const snapshot = await db.collection("scripts").get().catch(() => null);
                if (snapshot && !snapshot.empty) {
                    const cloudList = [];
                    snapshot.forEach(doc => {
                        cloudList.push({ id: doc.id, ...doc.data() });
                    });
                    if (cloudList.length > 0) {
                        scripts = cloudList;
                        console.log(`[GhostSensix] Synced ${cloudList.length} scripts from Firebase Firestore`);
                    }
                }
            } catch (fbErr) {
                console.debug("[GhostSensix] Firebase Firestore sync notice:", fbErr);
            }
        }

        try {
            // Pre-load exploits locally for 0ms instant display
            const expRes = await fetch("data/exploits.json?t=" + Date.now()).catch(() => null);
            if (expRes && expRes.ok) {
                const expData = await expRes.json();
                if (Array.isArray(expData) && expData.length > 0) {
                    allExploits = expData;
                    renderHomeExecutors();
                    renderExploits();
                }
            }
        } catch (e) {
            console.debug("[GhostSensix] Preload exploits error", e);
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
        document.querySelectorAll("#feedView .view-filter-chips .chip").forEach(c => {
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
                toggleGameDropdown(false);
                switchView("feed", "all", g);
            });
        });

        refreshIcons();
    }

    // Positioning helper for Game Categories Dropdown
    function positionGameDropdown() {
        if (!coreGameDropdownMenu) return;
        if (window.innerWidth <= 768) {
            coreGameDropdownMenu.style.top = "62px";
            coreGameDropdownMenu.style.left = "50%";
            coreGameDropdownMenu.style.transform = "translateX(-50%)";
            coreGameDropdownMenu.style.width = "calc(100vw - 24px)";
            coreGameDropdownMenu.style.maxHeight = "calc(100vh - 145px)";
            return;
        }
        if (!coreGameDropdownBtn) return;
        const rect = coreGameDropdownBtn.getBoundingClientRect();
        const menuWidth = 330;
        let left = rect.left;
        if (left + menuWidth > window.innerWidth - 12) {
            left = window.innerWidth - menuWidth - 12;
        }
        if (left < 12) left = 12;

        coreGameDropdownMenu.style.transform = "none";
        coreGameDropdownMenu.style.top = `${rect.bottom + 6}px`;
        coreGameDropdownMenu.style.left = `${left}px`;
        coreGameDropdownMenu.style.width = "330px";
    }

    function toggleGameDropdown(forceState) {
        if (!coreGameDropdownMenu) return;
        const isOpen = coreGameDropdownMenu.classList.contains("open") || coreGameDropdownMenu.classList.contains("show");
        const willOpen = forceState !== undefined ? forceState : !isOpen;
        if (willOpen) {
            positionGameDropdown();
            coreGameDropdownMenu.classList.add("open", "show");
            if (coreGameDropdownBtn) coreGameDropdownBtn.setAttribute("aria-expanded", "true");
            if (gameDropdownSearchInput) {
                setTimeout(() => gameDropdownSearchInput.focus(), 60);
            }
        } else {
            coreGameDropdownMenu.classList.remove("open", "show");
            if (coreGameDropdownBtn) coreGameDropdownBtn.setAttribute("aria-expanded", "false");
            if (gameDropdownSearchInput && gameDropdownSearchInput.value) {
                gameDropdownSearchInput.value = "";
                document.querySelectorAll("#gameMenu .game-dropdown-item").forEach(el => el.style.display = "flex");
            }
        }
    }

    if (coreGameDropdownBtn) {
        coreGameDropdownBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleGameDropdown();
        });
    }

    window.addEventListener("resize", () => {
        if (coreGameDropdownMenu && (coreGameDropdownMenu.classList.contains("open") || coreGameDropdownMenu.classList.contains("show"))) {
            positionGameDropdown();
        }
    });

    window.addEventListener("scroll", () => {
        if (coreGameDropdownMenu && (coreGameDropdownMenu.classList.contains("open") || coreGameDropdownMenu.classList.contains("show"))) {
            positionGameDropdown();
        }
    }, { passive: true });

    document.addEventListener("click", (e) => {
        if (coreGameDropdownMenu && (coreGameDropdownMenu.classList.contains("open") || coreGameDropdownMenu.classList.contains("show"))) {
            if (!coreGameDropdownMenu.contains(e.target) && (!coreGameDropdownBtn || !coreGameDropdownBtn.contains(e.target)) && (!bottomNavMenuBtn || !bottomNavMenuBtn.contains(e.target))) {
                toggleGameDropdown(false);
            }
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && coreGameDropdownMenu && (coreGameDropdownMenu.classList.contains("open") || coreGameDropdownMenu.classList.contains("show"))) {
            toggleGameDropdown(false);
        }
    });

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
    document.querySelectorAll("#feedView .view-filter-chips .chip").forEach(chip => {
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
        const desc = item.description || "";
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
                    ${desc ? `<p class="row-features">${escapeHtml(desc)}</p>` : ''}
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
                <p style="font-size:13px;color:#a99fc4;">The database is ready. Add your scripts to <code>public/data/scripts.json</code>.</p>
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
                <p style="font-size:13px;color:#a99fc4;">The database is ready. Add your scripts to <code>public/data/scripts.json</code>.</p>
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

        if (unlockedView) unlockedView.style.display = "block";
        if (lockerModal) lockerModal.classList.add("active");

        // Auto copy to clipboard on open
        if (selectedScript.loadstring && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(selectedScript.loadstring).then(() => {
                showToast("Script code copied to clipboard!");
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
                    showToast("Script code copied to clipboard!");
                    const originalHtml = btnCopyScript.innerHTML;
                    btnCopyScript.innerHTML = `<i data-lucide="check" style="width:16px;height:16px;color:#4ade80;"></i> <span>Copied!</span>`;
                    refreshIcons();
                    setTimeout(() => {
                        btnCopyScript.innerHTML = originalHtml;
                        refreshIcons();
                    }, 2000);
                }).catch(() => {});
            }
        });
    }

    // =========================================================================
    // WEAO API Exploits & sUNC Status Normalizer & Manager
    // =========================================================================
    function getExploitData(raw) {
        if (!raw) return null;
        const title = raw.title || "Unknown Executor";
        const version = raw.version || "Latest";
        const platform = raw.platform || "Windows";

        // Status: WEAO uses updateStatus (boolean true/false)
        const isUpdated = Boolean(raw.updateStatus ?? raw.updated ?? (raw.status === "working"));

        // Detection: WEAO uses detected (boolean true/false)
        const isDetected = Boolean(raw.detected);

        // sUNC & UNC Percentages
        let suncPercent = 100;
        if (typeof raw.suncPercentage === "number") {
            suncPercent = Math.round(raw.suncPercentage);
        } else if (typeof raw.uncPercentage === "number") {
            suncPercent = Math.round(raw.uncPercentage);
        } else if (typeof raw.sunc === "number") {
            suncPercent = Math.round(raw.sunc);
        }

        const uncPercent = typeof raw.uncPercentage === "number" ? Math.round(raw.uncPercentage) : suncPercent;

        // Logo
        const logo = raw.slug?.logo || raw.icon || "Logo.png";

        // Links
        const website = raw.websitelink || raw.website || raw.purchaselink || "";
        const discord = raw.discordlink || "";

        // Cost
        const cost = raw.free ? "Free" : (raw.cost || "Paid");

        // sUNC Scrap & Key for detailed function benchmarks
        const suncScrap = raw.sunc?.suncScrap || "";
        const suncKey = raw.sunc?.suncKey || "";

        return {
            title,
            version,
            platform,
            isUpdated,
            isDetected,
            suncPercent,
            uncPercent,
            logo,
            website,
            discord,
            cost,
            suncScrap,
            suncKey,
            updatedDate: raw.updatedDate || "Recently Tested",
            description: raw.slug?.fullDescription || "",
            detectionReason: raw.detectionReason || "",
            decompiler: Boolean(raw.decompiler),
            multiInject: Boolean(raw.multiInject),
            raw
        };
    }

    async function fetchExploits(force = false) {
        // Step 1: Instant load from local cache if we have nothing yet
        if (allExploits.length === 0) {
            try {
                const localRes = await fetch("data/exploits.json?t=" + Date.now()).catch(() => null);
                if (localRes && localRes.ok) {
                    const localData = await localRes.json();
                    if (Array.isArray(localData) && localData.length > 0) {
                        allExploits = localData;
                        renderHomeExecutors();
                        if (currentView === "exploits") {
                            renderExploits();
                        }
                    }
                }
            } catch (e) {
                console.debug("[GhostSensix] Local exploits cache check", e);
            }
        }

        // Step 2: Fetch live fresh status from WEAO API (via proxy or direct)
        try {
            let res = await fetch("/api/exploits").catch(() => null);
            if (!res || !res.ok) {
                res = await fetch("https://weao.xyz/api/status/exploits").catch(() => null);
            }
            if (res && res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    allExploits = data;
                    renderHomeExecutors();
                    renderExploits();
                    return;
                }
            }
        } catch (e) {
            console.debug("[GhostSensix] Live WEAO fetch notice", e);
        }

        // If still empty after attempts, show retry
        if (exploitsGrid && allExploits.length === 0 && currentView === "exploits") {
            exploitsGrid.innerHTML = `
                <div style="text-align:center;padding:40px;color:var(--text-muted);grid-column:1/-1;">
                    <p style="color:#f87171;font-weight:600;margin-bottom:8px;">Unable to fetch executor status</p>
                    <button onclick="window.fetchExploitsRetry()" style="background:#a855f7;color:#fff;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-weight:600;">Retry</button>
                </div>
            `;
            refreshIcons();
        }
    }

    window.fetchExploitsRetry = function() {
        if (exploitsGrid) {
            exploitsGrid.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);grid-column:1/-1;"><i data-lucide="loader-2" class="spin"></i> Reconnecting live status...</div>`;
            refreshIcons();
        }
        fetchExploits(true);
    };

    function renderHomeExecutors() {
        if (!homeExecutorsGrid || allExploits.length === 0) return;

        // Render marquee cards
        const topExploits = allExploits.slice(0, 15);
        let cardsHtml = topExploits.map(raw => {
            const ex = getExploitData(raw);
            const statusColor = ex.isUpdated ? "#22c55e" : "#f87171";
            const statusText = ex.isUpdated ? "Updated" : "Updating";
            return `
                <div class="executor-marquee-card" style="cursor:pointer;" onclick="window.openGhostSunc('${escapeHtml(ex.title)}')">
                    <div class="marquee-logo-wrap">
                        <img src="${escapeHtml(ex.logo)}" alt="${escapeHtml(ex.title)}" onerror="this.src='Logo.png'" style="width:28px;height:28px;border-radius:6px;object-fit:cover;">
                    </div>
                    <div class="marquee-info">
                        <div class="marquee-title-row">
                            <span class="marquee-name">${escapeHtml(ex.title)}</span>
                            <span class="marquee-sunc-pill" style="color:#c084fc;font-size:11px;font-weight:700;">sUNC ${ex.suncPercent}%</span>
                        </div>
                        <div class="marquee-sub-row" style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:6px;">
                            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${statusColor};box-shadow:0 0 6px ${statusColor};"></span>
                            <span style="color:${statusColor};font-weight:600;">${statusText}</span> &bull; <span>${escapeHtml(ex.platform)}</span>
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
            exploitsGrid.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);grid-column:1/-1;"><i data-lucide="loader-2" class="spin"></i> Loading executor status...</div>`;
            refreshIcons();
            return;
        }

        let activeChip = document.querySelector("#exploitPlatformFilter .chip.active");
        if (!activeChip) {
            const allChip = document.querySelector("#exploitPlatformFilter .chip[data-plat='all']");
            if (allChip) allChip.classList.add("active");
            activeChip = allChip;
        }
        const platformFilter = activeChip?.getAttribute("data-plat") || "all";
        const filtered = allExploits.filter(raw => {
            const ex = getExploitData(raw);
            if (platformFilter !== "all" && ex.platform && !ex.platform.toLowerCase().includes(platformFilter.toLowerCase())) {
                return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            exploitsGrid.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);grid-column:1/-1;">No executors found for platform: <strong>${escapeHtml(platformFilter)}</strong></div>`;
            return;
        }

        exploitsGrid.innerHTML = filtered.map(raw => {
            const ex = getExploitData(raw);
            const statusColor = ex.isUpdated ? "#22c55e" : "#f87171";
            const statusText = ex.isUpdated ? "Updated & Safe" : "Pending Update";
            const detectColor = ex.isDetected ? "#f87171" : "#22c55e";
            const detectText = ex.isDetected ? "Detected" : "Undetected";

            return `
                <div class="exploit-card" style="background:#160f2e;border:1px solid #281b4b;border-radius:14px;padding:18px;display:flex;flex-direction:column;gap:14px;position:relative;transition:all 0.2s ease;">
                    <!-- Head: Logo + Title + Version + Platform -->
                    <div style="display:flex;align-items:center;gap:14px;">
                        <img src="${escapeHtml(ex.logo)}" alt="${escapeHtml(ex.title)}" onerror="this.src='Logo.png'" style="width:44px;height:44px;border-radius:10px;object-fit:cover;border:1px solid rgba(168,85,247,0.3);background:#080511;">
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                                <h4 style="font-size:16px;font-weight:700;color:#fff;margin:0;">${escapeHtml(ex.title)}</h4>
                                <span style="font-size:11px;color:#a99fc4;background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:4px;">v${escapeHtml(ex.version)}</span>
                            </div>
                            <div style="font-size:12px;color:#a99fc4;margin-top:4px;display:flex;align-items:center;gap:8px;">
                                <span><i data-lucide="monitor" style="width:12px;height:12px;vertical-align:middle;"></i> ${escapeHtml(ex.platform)}</span>
                                &bull;
                                <span style="color:#c084fc;font-weight:600;">${escapeHtml(ex.cost)}</span>
                            </div>
                        </div>
                    </div>

                    <!-- sUNC Score Bar -->
                    <div class="sunc-score-wrap" style="background:rgba(8,5,17,0.6);padding:10px 12px;border-radius:8px;border:1px solid rgba(168,85,247,0.15);">
                        <div class="sunc-label-row" style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px;">
                            <span style="color:#a99fc4;display:flex;align-items:center;gap:5px;">
                                <i data-lucide="shield-check" style="width:13px;height:13px;color:#c084fc;"></i> sUNC Compatibility
                            </span>
                            <span class="sunc-score-val" style="color:#c084fc;font-weight:700;">${ex.suncPercent}%</span>
                        </div>
                        <div class="sunc-bar-bg" style="height:6px;background:rgba(255,255,255,0.08);border-radius:999px;overflow:hidden;">
                            <div class="sunc-bar-fill" style="width:${ex.suncPercent}%;height:100%;border-radius:999px;background:linear-gradient(90deg, #a855f7 0%, #38bdf8 100%);"></div>
                        </div>
                    </div>

                    <!-- Status Indicator Row -->
                    <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;padding:6px 0;border-top:1px solid rgba(255,255,255,0.06);">
                        <span style="color:${statusColor};display:inline-flex;align-items:center;gap:6px;font-weight:600;">
                            <span style="width:7px;height:7px;border-radius:50%;background:${statusColor};box-shadow:0 0 6px ${statusColor};"></span>
                            ${statusText}
                        </span>
                        <span style="color:${detectColor};display:inline-flex;align-items:center;gap:6px;font-size:11px;background:rgba(255,255,255,0.04);padding:3px 8px;border-radius:4px;">
                            ${detectText}
                        </span>
                    </div>

                    <!-- Action Buttons -->
                    <div style="display:flex;gap:8px;margin-top:auto;">
                        <button class="btn-view-sunc" onclick="window.openGhostSunc('${escapeHtml(ex.title)}')" style="flex:1;background:rgba(168,85,247,0.15);border:1px solid rgba(168,85,247,0.35);color:#c084fc;padding:8px 12px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:0.15s;">
                            <i data-lucide="file-check-2" style="width:14px;height:14px;"></i> sUNC Benchmark
                        </button>
                        ${ex.website ? `
                            <a href="${escapeHtml(ex.website)}" target="_blank" rel="noopener noreferrer" style="background:#221844;border:1px solid #3d2970;color:#fff;padding:8px 12px;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;display:inline-flex;align-items:center;gap:4px;">
                                Site <i data-lucide="external-link" style="width:12px;height:12px;"></i>
                            </a>
                        ` : ''}
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

    // =========================================================================
    // sUNC Modal with Live Function Test Breakdown
    // =========================================================================
    let currentSuncData = null;
    let currentSuncFilter = "";

    window.openGhostSunc = async function(title) {
        const raw = allExploits.find(ex => ex.title === title);
        if (!raw) return;
        const ex = getExploitData(raw);

        const suncModalTitle = document.getElementById("suncModalTitle");
        const suncVersion = document.getElementById("suncVersion");
        const suncTime = document.getElementById("suncTime");
        const suncPassedCount = document.getElementById("suncPassedCount");
        const suncFailedCount = document.getElementById("suncFailedCount");
        const suncTestList = document.getElementById("suncTestList");
        const searchSuncFunc = document.getElementById("searchSuncFunc");

        if (suncModalTitle) suncModalTitle.textContent = `${ex.title} - sUNC Benchmark`;
        if (suncVersion) suncVersion.textContent = `v${ex.version} (${ex.platform})`;
        if (suncTime) suncTime.textContent = ex.updatedDate;
        if (suncPassedCount) suncPassedCount.textContent = `${ex.suncPercent}%`;
        if (suncFailedCount) suncFailedCount.textContent = `${100 - ex.suncPercent}%`;
        if (searchSuncFunc) searchSuncFunc.value = "";
        currentSuncFilter = "";
        currentSuncData = null;

        if (suncModal) suncModal.classList.add("active");
        refreshIcons();

        if (!suncTestList) return;

        // If we have suncScrap and suncKey, fetch detailed test results
        if (ex.suncScrap && ex.suncKey) {
            suncTestList.innerHTML = `
                <div style="text-align:center;padding:32px;color:var(--text-muted);">
                    <i data-lucide="loader-2" class="spin" style="width:24px;height:24px;display:inline-block;margin-bottom:8px;color:#c084fc;"></i>
                    <p style="font-size:13px;margin:0;">Downloading sUNC function benchmarks...</p>
                </div>
            `;
            refreshIcons();

            try {
                let res = await fetch(`https://weao.xyz/api/sunc?scrap=${encodeURIComponent(ex.suncScrap)}&key=${encodeURIComponent(ex.suncKey)}`).catch(() => null);
                if (!res || !res.ok) {
                    res = await fetch(`/api/sunc?scrap=${encodeURIComponent(ex.suncScrap)}&key=${encodeURIComponent(ex.suncKey)}`).catch(() => null);
                }
                if (res && res.ok) {
                    const data = await res.json();
                    if (data && data.tests) {
                        currentSuncData = data;
                        if (data.timeTaken && suncTime) suncTime.textContent = `${data.timeTaken}s (${ex.updatedDate})`;
                        const passLen = (data.tests.passed || []).length;
                        const failLen = (data.tests.failed || []).length;
                        if (suncPassedCount) suncPassedCount.textContent = passLen;
                        if (suncFailedCount) suncFailedCount.textContent = failLen;
                        renderSuncTests();
                        return;
                    }
                }
            } catch (err) {
                console.debug("[GhostSensix] sUNC detailed benchmark load note", err);
            }
        }

        // Fallback / Overview if detailed functions not available
        suncTestList.innerHTML = `
            <div style="padding:16px;background:rgba(8,5,17,0.7);border-radius:10px;border:1px solid rgba(168,85,247,0.2);margin-bottom:12px;">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                    <img src="${escapeHtml(ex.logo)}" onerror="this.src='Logo.png'" style="width:40px;height:40px;border-radius:8px;object-fit:cover;">
                    <div>
                        <h4 style="color:#fff;margin:0 0 4px 0;">${escapeHtml(ex.title)}</h4>
                        <span style="font-size:12px;color:#c084fc;font-weight:600;">Overall Score: ${ex.suncPercent}% (UNC: ${ex.uncPercent}%)</span>
                    </div>
                </div>
                <div style="font-size:12px;color:#a99fc4;line-height:1.7;">
                    <div><strong>Status:</strong> <span style="color:${ex.isUpdated ? '#22c55e' : '#f87171'}">${ex.isUpdated ? "Working & Updated" : "Pending Update"}</span></div>
                    <div><strong>Detection:</strong> <span style="color:${ex.isDetected ? '#f87171' : '#22c55e'}">${ex.isDetected ? "Detected (Use with caution)" : "Undetected (Safe)"}</span></div>
                    <div><strong>Platform:</strong> ${escapeHtml(ex.platform)}</div>
                    <div><strong>Pricing:</strong> ${escapeHtml(ex.cost)}</div>
                    ${ex.detectionReason ? `<div><strong>Last Note:</strong> ${escapeHtml(ex.detectionReason)}</div>` : ''}
                </div>
                ${ex.description ? `
                    <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06);font-size:12px;color:#d8b4fe;white-space:pre-line;">
                        ${escapeHtml(ex.description.slice(0, 350))}${ex.description.length > 350 ? '...' : ''}
                    </div>
                ` : ''}
            </div>
            ${ex.website ? `
                <a href="${escapeHtml(ex.website)}" target="_blank" rel="noopener noreferrer" style="display:block;text-align:center;background:linear-gradient(135deg, #a855f7, #6366f1);color:#fff;font-weight:700;font-size:13px;padding:10px;border-radius:8px;text-decoration:none;margin-top:8px;">
                    Visit Official ${escapeHtml(ex.title)} Website &rarr;
                </a>
            ` : ''}
        `;
        refreshIcons();
    };

    function renderSuncTests() {
        const suncTestList = document.getElementById("suncTestList");
        if (!suncTestList || !currentSuncData || !currentSuncData.tests) return;

        const passedList = currentSuncData.tests.passed || [];
        const failedList = currentSuncData.tests.failed || [];
        const q = currentSuncFilter.toLowerCase().trim();

        const filteredPassed = passedList.filter(t => !q || (t.name && t.name.toLowerCase().includes(q)) || (t.library && t.library.toLowerCase().includes(q)));
        const filteredFailed = failedList.filter(t => !q || (t.name && t.name.toLowerCase().includes(q)) || (t.library && t.library.toLowerCase().includes(q)));

        if (filteredPassed.length === 0 && filteredFailed.length === 0) {
            suncTestList.innerHTML = `
                <div style="text-align:center;padding:24px;color:var(--text-muted);">
                    No functions matching "${escapeHtml(currentSuncFilter)}"
                </div>
            `;
            return;
        }

        let html = "";
        filteredFailed.forEach(item => {
            html += `
                <div class="sunc-test-item failed" style="background:#160f2e;border:1px solid rgba(239,68,68,0.25);border-radius:8px;padding:10px 12px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
                    <div>
                        <div class="sunc-func-name" style="color:#f87171;font-weight:700;font-size:12px;font-family:monospace;">${escapeHtml(item.name)}</div>
                        <div class="sunc-func-lib" style="font-size:11px;color:var(--text-muted);">${escapeHtml(item.library || 'General')} &bull; ${escapeHtml(item.reason || 'Not supported')}</div>
                    </div>
                    <span style="font-size:11px;color:#f87171;background:rgba(239,68,68,0.15);padding:3px 8px;border-radius:4px;font-weight:600;display:inline-flex;align-items:center;gap:4px;">
                        <i data-lucide="x" style="width:12px;height:12px;"></i> Failed
                    </span>
                </div>
            `;
        });

        filteredPassed.forEach(item => {
            html += `
                <div class="sunc-test-item passed" style="background:#160f2e;border:1px solid rgba(34,197,94,0.2);border-radius:8px;padding:10px 12px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
                    <div>
                        <div class="sunc-func-name" style="color:#fff;font-weight:700;font-size:12px;font-family:monospace;">${escapeHtml(item.name)}</div>
                        <div class="sunc-func-lib" style="font-size:11px;color:var(--text-muted);">${escapeHtml(item.library || 'General')}${item.description ? ' &bull; ' + escapeHtml(item.description) : ''}</div>
                    </div>
                    <span style="font-size:11px;color:#4ade80;background:rgba(34,197,94,0.15);padding:3px 8px;border-radius:4px;font-weight:600;display:inline-flex;align-items:center;gap:4px;">
                        <i data-lucide="check" style="width:12px;height:12px;"></i> Passed
                    </span>
                </div>
            `;
        });

        suncTestList.innerHTML = html;
        refreshIcons();
    }

    // Attach search filter listener for sUNC functions
    const searchSuncFuncInput = document.getElementById("searchSuncFunc");
    if (searchSuncFuncInput) {
        searchSuncFuncInput.addEventListener("input", (e) => {
            currentSuncFilter = e.target.value;
            renderSuncTests();
        });
    }

    if (closeSuncModalBtn && suncModal) {
        closeSuncModalBtn.addEventListener("click", () => suncModal.classList.remove("active"));
        suncModal.addEventListener("click", (e) => {
            if (e.target === suncModal) suncModal.classList.remove("active");
        });
    }

    // =========================================================================
    // Mobile Bottom Menu Button & Brand Logo UX
    // =========================================================================
    const bottomNavMenuBtn = document.getElementById("bottomNavMenuBtn");
    if (bottomNavMenuBtn) {
        bottomNavMenuBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleGameDropdown();
        });
    }

    const brandLogo = document.getElementById("brandLogo");
    if (brandLogo) {
        brandLogo.style.cursor = "pointer";
        brandLogo.addEventListener("click", () => switchView("home"));
    }

    // =========================================================================
    // Sponsor Access Gate (24-Hour Pass System like roblox-scripthub-main)
    // =========================================================================
    function initSponsorGate() {
        const gateOverlay = document.getElementById("lootlabsGateOverlay");
        if (!gateOverlay) return;

        const urlParams = new URLSearchParams(window.location.search);

        // Helper: Unlock gate and save 24-hour session
        function unlockGate(hours = 24, showUnlockedToast = true) {
            const expiryTime = Date.now() + hours * 60 * 60 * 1000;
            localStorage.setItem("ghostsensix_gate_pass", String(expiryTime));
            sessionStorage.setItem("ghostsensix_gate_pass", String(expiryTime));
            localStorage.removeItem("ghostsensix_gate_clicked");
            localStorage.removeItem("ghostsensix_gate_click_time");
            sessionStorage.removeItem("ghostsensix_gate_clicked");

            gateOverlay.classList.remove("gate-fade-in");
            gateOverlay.classList.add("gate-fade-out");

            setTimeout(() => {
                document.documentElement.classList.remove("gate-active-init");
                gateOverlay.style.display = "none";
                gateOverlay.classList.remove("gate-fade-out");
                const appWrapper = document.querySelector(".app-wrapper");
                if (appWrapper) {
                    appWrapper.style.opacity = "1";
                    appWrapper.style.visibility = "visible";
                }
                if (showUnlockedToast) {
                    showToast(hours >= 720 ? "VIP Passcode Verified! 30-Day Pass Granted." : "Access Verified! Device remembered for 24 hours.");
                }
            }, 420);
        }
        window.unlockSponsorGate = unlockGate;

        // 1. Reset helper for testing (?lock=1 or ?reset=1 or ?relock=1)
        if (urlParams.has("lock") || urlParams.has("reset") || urlParams.has("relock") || urlParams.has("test")) {
            localStorage.removeItem("ghostsensix_gate_pass");
            sessionStorage.removeItem("ghostsensix_gate_pass");
            localStorage.removeItem("ghostsensix_gate_clicked");
            localStorage.removeItem("ghostsensix_gate_click_time");
            sessionStorage.removeItem("ghostsensix_gate_clicked");
            document.documentElement.classList.add("gate-active-init");
            gateOverlay.style.display = "flex";
            try {
                const cleanUrl = window.location.origin + window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);
            } catch (e) {}
            showToast("Device status reset: Locked for testing.");
        }

        // 2. Device PUID / Session Generator for LootLabs Anti-Bypass
        function getOrCreateGhostPuid() {
            let puid = localStorage.getItem("ghostsensix_lootlabs_puid");
            if (!puid || !puid.startsWith("ghost_")) {
                puid = "ghost_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
                localStorage.setItem("ghostsensix_lootlabs_puid", puid);
            }
            return puid;
        }

        const puid = getOrCreateGhostPuid();

        // 3. Check if device has an active 24-hour pass
        const passExpiry = localStorage.getItem("ghostsensix_gate_pass") || sessionStorage.getItem("ghostsensix_gate_pass");
        const now = Date.now();
        const isUnlocked = passExpiry && now < parseInt(passExpiry, 10);

        if (isUnlocked) {
            document.documentElement.classList.remove("gate-active-init");
            gateOverlay.style.display = "none";
            const appWrapper = document.querySelector(".app-wrapper");
            if (appWrapper) {
                appWrapper.style.opacity = "1";
                appWrapper.style.visibility = "visible";
            }
            return;
        }

        // 4. Not unlocked: Enforce gate overlay
        document.documentElement.classList.add("gate-active-init");
        gateOverlay.style.display = "flex";

        const btnGateUnlock = document.getElementById("btnGateUnlock");
        const btnGateCheckStatus = document.getElementById("btnGateCheckStatus");
        const btnGateVerify = document.getElementById("btnGateVerify");
        const alertBox = document.getElementById("gateBypassAlertBox");
        const gateStage = document.querySelector(".gate-stage");
        const btnGatePasscode = document.getElementById("btnGatePasscode");
        const gatePasscodeInput = document.getElementById("gatePasscodeInput");
        const gateErrorMsg = document.getElementById("gateErrorMsg");

        let lootlabsUrl = (siteConfig.lootlabsGate && (siteConfig.lootlabsGate.lootlabsUrl || siteConfig.lootlabsGate.shrinkmeUrl))
            ? (siteConfig.lootlabsGate.lootlabsUrl || siteConfig.lootlabsGate.shrinkmeUrl).trim()
            : "https://loot-link.com/s?example_ghostsensix";

        lootlabsUrl = lootlabsUrl.replace(/[?&]puid=[^&]+/, '').replace(/[?&]uid=[^&]+/, '');
        const sep = lootlabsUrl.includes("?") ? "&" : "?";
        const finalGateUrl = `${lootlabsUrl}${sep}uid=${encodeURIComponent(puid)}&puid=${encodeURIComponent(puid)}`;

        if (btnGateUnlock) {
            btnGateUnlock.href = finalGateUrl;
            btnGateUnlock.target = "_blank";
            btnGateUnlock.addEventListener("click", () => {
                localStorage.setItem("ghostsensix_gate_clicked", "true");
                localStorage.setItem("ghostsensix_gate_click_time", String(Date.now()));
                sessionStorage.setItem("ghostsensix_gate_clicked", "true");
                
                if (alertBox) {
                    alertBox.className = "gate-bypass-alert-box state-waiting";
                    alertBox.style.display = "block";
                    alertBox.innerHTML = `
                        <div style="font-weight: 600; color: #c084fc; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <span class="gate-spinner"></span>
                            <span>Waiting for LootLabs completion...</span>
                        </div>
                        <div style="font-size: 11.5px; color: #a79fc2; margin-top: 4px;">
                            ทำภารกิจในแท็บใหม่ให้เสร็จ แล้วกลับมากดปุ่ม <b>"Check Status (ตรวจสอบสถานะทันที)"</b>
                        </div>
                    `;
                    if (window.lucide && lucide.createIcons) lucide.createIcons();
                }
            });
        }

        // Anti-Bypass Verification Function (Server-Side Postback)
        async function verifyGhostGateSession(silent = false) {
            try {
                // 1. Check server endpoint (/api/checkpoint/status or /api/check-session)
                let res = await fetch(`/api/checkpoint/status?session=${encodeURIComponent(puid)}`).catch(() => null);
                if (!res || !res.ok) {
                    res = await fetch(`/api/check-session?puid=${encodeURIComponent(puid)}`).catch(() => null);
                }
                if (res && res.ok) {
                    const data = await res.json();
                    if (data && data.verified) {
                        handleVerifiedSuccess();
                        return true;
                    }
                }

                // 2. Check directly with Firebase Firestore fallback
                const fbUrl = `https://firestore.googleapis.com/v1/projects/ghostsensi-1d96b/databases/(default)/documents/lootlabs_sessions/${encodeURIComponent(puid)}?key=AIzaSyBCMSULoP-CnTWurWMTUKDfRMEEu2T7PVE`;
                const fbRes = await fetch(fbUrl).catch(() => null);
                if (fbRes && fbRes.ok) {
                    const fbData = await fbRes.json();
                    if (fbData.fields && fbData.fields.verified && fbData.fields.verified.booleanValue === true) {
                        handleVerifiedSuccess();
                        return true;
                    }
                }
            } catch (err) {
                console.warn("GhostSensix Anti-Bypass notice:", err);
            }

            // If NOT verified by LootLabs Postback
            if (!silent) {
                if (gateStage) {
                    gateStage.classList.remove("gate-shake");
                    void gateStage.offsetWidth; // trigger reflow
                    gateStage.classList.add("gate-shake");
                    setTimeout(() => gateStage.classList.remove("gate-shake"), 600);
                }

                if (alertBox) {
                    alertBox.className = "gate-bypass-alert-box state-error";
                    alertBox.style.display = "block";
                    alertBox.innerHTML = `
                        <div style="font-weight: 700; color: #f87171; display: flex; align-items: center; justify-content: center; gap: 6px;">
                            <i data-lucide="shield-alert" style="width: 16px; height: 16px;"></i>
                            <span>⛔ ตรวจพบบายพาส หรือยังดูโฆษณาไม่สำเร็จ!</span>
                        </div>
                        <div style="font-size: 11.5px; color: #fca5a5; margin-top: 4px; line-height: 1.4;">
                            ระบบยังไม่ได้รับข้อมูล Postback ยืนยันจาก LootLabs สำหรับเซสชันนี้<br>
                            <span style="opacity: 0.9;">⚠️ ห้ามใช้บอท/เว็บ Bypass • กรุณาทำภารกิจผ่าน LootLabs ให้จบจริง</span>
                        </div>
                    `;
                    if (window.lucide && lucide.createIcons) lucide.createIcons();
                }

                showToast("⛔ ตรวจพบบายพาส! ยังไม่พบการยืนยันจาก LootLabs");
            }
            return false;
        }

        function handleVerifiedSuccess() {
            if (alertBox) {
                alertBox.className = "gate-bypass-alert-box state-success";
                alertBox.style.display = "block";
                alertBox.innerHTML = `
                    <div style="font-weight: 700; color: #4ade80; display: flex; align-items: center; justify-content: center; gap: 6px;">
                        <i data-lucide="check-circle" style="width: 16px; height: 16px;"></i>
                        <span>ยืนยันสิทธิ์สำเร็จเรียบร้อย!</span>
                    </div>
                    <div style="font-size: 11.5px; color: #bbf7d0; margin-top: 4px;">
                        LootLabs Postback ยืนยันแล้ว • ปลดล็อคเข้าใช้งาน 24 ชั่วโมง
                    </div>
                `;
                if (window.lucide && lucide.createIcons) lucide.createIcons();
            }
            setTimeout(() => {
                unlockGate(24, true);
            }, 800);
        }

        // 5. Verification buttons (Check Status)
        if (btnGateCheckStatus) {
            btnGateCheckStatus.addEventListener("click", () => {
                const icon = btnGateCheckStatus.querySelector("i");
                if (icon) icon.style.animation = "spin 0.8s linear infinite";
                verifyGhostGateSession(false).finally(() => {
                    if (icon) icon.style.animation = "";
                });
            });
        }

        if (btnGateVerify) {
            btnGateVerify.addEventListener("click", () => {
                verifyGhostGateSession(false);
            });
        }

        // 6. VIP / Admin Passcode Bypass
        if (btnGatePasscode && gatePasscodeInput) {
            const verifyPasscode = () => {
                const code = gatePasscodeInput.value.trim().toLowerCase();
                if (code === "admin888" || code === "ghost888" || code === "1234" || code === "blacklist_vip" || code === "vip") {
                    unlockGate(720, true); // 30 days
                } else {
                    if (gateErrorMsg) {
                        gateErrorMsg.textContent = "Invalid passcode. Please complete the sponsor check.";
                        gateErrorMsg.style.display = "block";
                        setTimeout(() => {
                            if (gateErrorMsg) gateErrorMsg.style.display = "none";
                        }, 3000);
                    }
                }
            };

            btnGatePasscode.addEventListener("click", verifyPasscode);
            gatePasscodeInput.addEventListener("keydown", (e) => {
                if (e.key === "Enter") verifyPasscode();
            });
        }

        // 7. Cross-tab sync: if unlocked in another tab, unlock this tab immediately
        window.addEventListener("storage", (e) => {
            if (e.key === "ghostsensix_gate_pass") {
                const exp = Number(localStorage.getItem("ghostsensix_gate_pass") || 0);
                if (exp > Date.now()) {
                    unlockGate(24, false);
                }
            }
        });

        // 8. Tab focus detection: when user returns from LootLabs tab
        window.addEventListener("focus", () => {
            const isGateVisible = gateOverlay && gateOverlay.style.display !== "none";
            if (isGateVisible) {
                verifyGhostGateSession(true);
            }
        });
    }

    // =========================================================================
    // Boot App
    // =========================================================================
    await loadLocalDatabase();
    initSponsorGate();
    fetchExploits();

    // Check URL Hash on load (e.g. http://localhost:3001/#exploits)
    const initialHash = window.location.hash.replace("#", "").toLowerCase();
    if (initialHash === "exploits") {
        switchView("exploits", "all", "");
    } else if (initialHash === "scripts" || initialHash === "feed") {
        switchView("feed", "all", "");
    }
});

