/* ==========================================================================
   GateFlow Realtime Dashboard Logic
   - Live Firestore Synchronization (/api/locker/list, /api/locker, /api/gate/track)
   - Real Clicks & Unlocks Analytics
   - In-place Link Configuration & CRUD (Preserving Slugs)
   ========================================================================== */

let allLockers = [];
let currentDeletingSlug = null;
let currentChartMetric = 'clicks'; // 'clicks' | 'unlocks' | 'revenue'

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initMonetagSettings();
  loadRealLockers();
});

// 1. Navigation Tabs Handling
function initNavigation() {
  const sidebarItems = document.querySelectorAll('.sidebar-item[data-view]');
  const views = document.querySelectorAll('.dashboard-view');
  const pageTitle = document.getElementById('pageTitle');

  const titles = {
    overview: 'ภาพรวม & จัดการลิงก์',
    analytics: 'สถิติเชิงลึก & กราฟประสิทธิภาพ',
    rates: 'อัตราจ่าย CPM & เครือข่ายโฆษณา',
    settings: 'ตั้งค่าระบบ & Direct Links'
  };

  sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
      const viewKey = item.dataset.view;
      if (!viewKey) return;

      sidebarItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      views.forEach(v => v.classList.remove('active'));
      const activeView = document.getElementById(`view${capitalize(viewKey)}`);
      if (activeView) activeView.classList.add('active');

      if (pageTitle && titles[viewKey]) {
        pageTitle.textContent = titles[viewKey];
      }

      if (viewKey === 'analytics') {
        renderChart();
      }

      if (window.lucide) lucide.createIcons();
    });
  });
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// 2. Fetch Lockers from Firestore API
async function loadRealLockers() {
  const tbody = document.getElementById('lockersTableBody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 36px; color: var(--text-muted);">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
            <i data-lucide="loader-2" class="spin" style="width: 24px; height: 24px; color: #38bdf8;"></i>
            <span>กำลังดึงข้อมูลล่าสุดจาก Firestore...</span>
          </div>
        </td>
      </tr>
    `;
    if (window.lucide) lucide.createIcons();
  }

  try {
    const res = await fetch('/api/locker/list');
    if (!res.ok) throw new Error('API request failed');
    const data = await res.json();
    if (data && data.success && Array.isArray(data.lockers)) {
      allLockers = data.lockers;
    } else {
      allLockers = [];
    }
  } catch (err) {
    console.warn('Could not load from API, checking fallback:', err);
  }

  renderStats();
  renderLockersTable();
  renderChart();
}

// 3. Render Metric Cards
function renderStats() {
  const totalClicksEl = document.getElementById('statTotalClicks');
  const totalUnlocksEl = document.getElementById('statTotalUnlocks');
  const conversionEl = document.getElementById('statConversion');
  const totalLinksEl = document.getElementById('statTotalLinks');
  const totalRevenueEl = document.getElementById('statTotalRevenue');
  const lockerCountBadge = document.getElementById('lockerCountBadge');

  const statRobloxClicks = document.getElementById('statRobloxClicks');
  const statRobloxUnlocks = document.getElementById('statRobloxUnlocks');
  const statFfClicks = document.getElementById('statFfClicks');
  const statFfUnlocks = document.getElementById('statFfUnlocks');

  let totalClicks = 0;
  let totalUnlocks = 0;
  let robloxClicks = 0;
  let robloxUnlocks = 0;
  let ffClicks = 0;
  let ffUnlocks = 0;

  allLockers.forEach(l => {
    const clk = Number(l.clicks) || 0;
    const unl = Number(l.unlocks) || 0;
    totalClicks += clk;
    totalUnlocks += unl;

    const ch = (l.ch || '').toLowerCase();
    if (ch.includes('ghost') || ch.includes('free fire')) {
      ffClicks += clk;
      ffUnlocks += unl;
    } else {
      robloxClicks += clk;
      robloxUnlocks += unl;
    }
  });

  const passRate = totalClicks > 0 ? ((totalUnlocks / totalClicks) * 100).toFixed(1) : '0.0';
  const estimatedRevenue = (totalClicks * 0.0038).toFixed(2); // $3.80 CPM

  if (totalClicksEl) totalClicksEl.textContent = totalClicks.toLocaleString();
  if (totalUnlocksEl) totalUnlocksEl.textContent = totalUnlocks.toLocaleString();
  if (conversionEl) conversionEl.textContent = `${passRate}%`;
  if (totalLinksEl) totalLinksEl.textContent = allLockers.length.toString();
  if (totalRevenueEl) totalRevenueEl.textContent = `$${estimatedRevenue}`;
  if (lockerCountBadge) lockerCountBadge.textContent = `${allLockers.length} รายการ`;

  if (statRobloxClicks) statRobloxClicks.textContent = robloxClicks.toLocaleString();
  if (statRobloxUnlocks) statRobloxUnlocks.textContent = robloxUnlocks.toLocaleString();
  if (statFfClicks) statFfClicks.textContent = ffClicks.toLocaleString();
  if (statFfUnlocks) statFfUnlocks.textContent = ffUnlocks.toLocaleString();
}

// 4. Render Lockers Table
function renderLockersTable(filterQuery = '') {
  const tbody = document.getElementById('lockersTableBody');
  if (!tbody) return;

  const query = (filterQuery || '').trim().toLowerCase();
  const filtered = allLockers.filter(l => {
    if (!query) return true;
    return (l.title || '').toLowerCase().includes(query) ||
           (l.slug || '').toLowerCase().includes(query) ||
           (l.ch || '').toLowerCase().includes(query) ||
           (l.url || '').toLowerCase().includes(query);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
            <i data-lucide="inbox" style="width: 32px; height: 32px; opacity: 0.5;"></i>
            <span style="font-size: 14px; font-weight: 600;">ไม่พบล็อกเกอร์ที่ตรงกับคำค้นหา</span>
            <span style="font-size: 12px;">สร้างลิงก์แรกของคุณเพื่อเริ่มกระจายและรับสถิติคนเข้าชม</span>
          </div>
        </td>
      </tr>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  const origin = window.location.origin;

  tbody.innerHTML = filtered.map(l => {
    const slug = l.slug || '';
    const fullShortUrl = `${origin}/l/${slug}`;
    const clk = Number(l.clicks) || 0;
    const unl = Number(l.unlocks) || 0;
    const rate = clk > 0 ? ((unl / clk) * 100).toFixed(0) : 0;

    let rateClass = 'rate-low';
    if (rate >= 60) rateClass = 'rate-high';
    else if (rate >= 30) rateClass = 'rate-mid';

    const isGhost = (l.ch || '').toLowerCase().includes('ghost');
    const chBadge = isGhost 
      ? `<span class="cell-channel-badge badge-ff"><i data-lucide="crosshair" style="width: 12px; height: 12px;"></i> @GhostSensix</span>`
      : `<span class="cell-channel-badge badge-roblox"><i data-lucide="youtube" style="width: 12px; height: 12px;"></i> @Blacklistxyx</span>`;

    const adCount = l.ads !== undefined ? l.ads : 3;
    const adBadge = `<span style="font-size: 11px; color: #fbbf24; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.25); padding: 1px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 3px;"><i data-lucide="sparkles" style="width: 10px; height: 10px;"></i> ${adCount} โฆษณา</span>`;

    let destPreview = '';
    if (l.script) {
      destPreview = `<span style="display: inline-flex; align-items: center; gap: 4px; color: #38bdf8; font-size: 11.5px; font-family: monospace; background: rgba(56, 189, 248, 0.1); padding: 2px 6px; border-radius: 4px;"><i data-lucide="code" style="width: 12px; height: 12px;"></i> โค้ดสคริปต์ (${l.script.length} chars)</span>`;
    } else if (l.url) {
      destPreview = `<a href="${escapeHtml(l.url)}" target="_blank" style="color: var(--text-secondary); text-decoration: none; font-size: 12px; max-width: 200px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(l.url)}">${escapeHtml(l.url)}</a>`;
    } else {
      destPreview = `<span style="color: var(--text-muted); font-size: 12px;">-</span>`;
    }

    return `
      <tr>
        <td>
          <div style="display: flex; flex-direction: column; gap: 3px;">
            <span style="font-weight: 700; color: #FFFFFF; font-size: 13.5px;">${escapeHtml(l.title || slug)}</span>
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <code style="color: #38BDF8; font-size: 12px; font-weight: 600; background: rgba(56, 189, 248, 0.08); padding: 1px 6px; border-radius: 4px;">/l/${escapeHtml(slug)}</code>
              ${adBadge}
              <button type="button" class="btn-action-icon" style="width: 22px; height: 22px;" title="คัดลอกลิงก์สั้น" onclick="copyShortUrl('${escapeHtml(slug)}')">
                <i data-lucide="copy" style="width: 12px; height: 12px;"></i>
              </button>
            </div>
          </div>
        </td>

        <td>
          ${chBadge}
        </td>

        <td>
          ${destPreview}
        </td>

        <td style="text-align: center;">
          <span style="font-weight: 800; font-size: 14px; color: #FFFFFF;">${clk.toLocaleString()}</span>
        </td>

        <td style="text-align: center;">
          <span style="font-weight: 800; font-size: 14px; color: #10B981;">${unl.toLocaleString()}</span>
        </td>

        <td style="text-align: center;">
          <span class="rate-badge ${rateClass}">
            <i data-lucide="trending-up" style="width: 11px; height: 11px;"></i>
            <span>${rate}%</span>
          </span>
        </td>

        <td style="text-align: right;">
          <div style="display: inline-flex; gap: 6px; align-items: center;">
            <button type="button" class="btn-action-icon btn-action-edit" title="แก้ไขการตั้งค่า (ปลายทาง/ชื่อ/ช่อง)" onclick="openEditModal('${escapeHtml(slug)}')">
              <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
            </button>
            <a href="${fullShortUrl}" target="_blank" class="btn-action-icon" title="ทดสอบเปิดหน้านี้">
              <i data-lucide="external-link" style="width: 14px; height: 14px;"></i>
            </a>
            <button type="button" class="btn-action-icon btn-action-delete" title="ลบลิงก์นี้" onclick="openDeleteModal('${escapeHtml(slug)}')">
              <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function handleSearchLockers(query) {
  renderLockersTable(query);
}

// 5. One-Click Copy Short URL
window.copyShortUrl = function(slug) {
  const url = `${window.location.origin}/l/${slug}`;
  navigator.clipboard.writeText(url).then(() => {
    showToast(`📋 คัดลอกลิงก์สั้นแล้ว: ${url}`, 'success');
  }).catch(() => {
    prompt('คัดลอกลิงก์:', url);
  });
};

// 6. Quick Link Shorten Handling
window.handleQuickShorten = async function(e) {
  e.preventDefault();
  const inputTarget = document.getElementById('quickTargetUrl').value.trim();
  const inputTitle = document.getElementById('quickTitle').value.trim();
  const inputAlias = document.getElementById('quickAlias').value.trim();
  const inputCh = document.getElementById('quickChannel').value;
  const inputAds = parseInt(document.getElementById('quickAds')?.value || '3', 10);

  if (!inputTarget) return;

  const btn = document.getElementById('btnQuickShorten');
  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader-2" class="spin" style="width: 15px; height: 15px;"></i> สร้าง...`;
  if (window.lucide) lucide.createIcons();

  const isScript = inputTarget.includes('loadstring') || inputTarget.includes('getgenv') || inputTarget.length > 250;
  const payload = {
    url: isScript ? '' : inputTarget,
    script: isScript ? inputTarget : '',
    title: inputTitle || (isScript ? 'สคริปต์แจกฟรี' : 'ไฟล์ดาวน์โหลดฟรี'),
    desc: 'ทำภารกิจด้านล่างเพื่อปลดล็อก',
    slug: inputAlias,
    ch: inputCh,
    ads: inputAds
  };

  try {
    const res = await fetch('/api/locker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success && data.slug) {
      const fullUrl = `${window.location.origin}/l/${data.slug}`;
      document.getElementById('quickGeneratedUrl').textContent = fullUrl;
      document.getElementById('btnTestQuickResult').href = fullUrl;
      document.getElementById('quickResultBox').style.display = 'flex';
      showToast('🎉 สร้างลิงก์สำเร็จแล้ว!', 'success');
      loadRealLockers();
    } else {
      showToast(data.error || 'สร้างไม่สำเร็จ กรุณาลองใหม่', 'error');
    }
  } catch (err) {
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="scissors" style="width: 16px; height: 16px;"></i> สร้างลิงก์`;
    if (window.lucide) lucide.createIcons();
  }
};

window.copyQuickUrl = function() {
  const url = document.getElementById('quickGeneratedUrl').textContent;
  if (!url) return;
  navigator.clipboard.writeText(url).then(() => {
    showToast('📋 คัดลอกลิงก์สำเร็จ!', 'success');
  });
};

// 7. Edit Locker Modal & Logic
let currentEditMode = 'url'; // 'url' | 'script'

window.openEditModal = function(slug) {
  const locker = allLockers.find(l => l.slug === slug);
  if (!locker) return;

  document.getElementById('editSlug').value = locker.slug;
  document.getElementById('editSlugBadge').textContent = `/l/${locker.slug}`;
  document.getElementById('editTitle').value = locker.title || '';
  document.getElementById('editDesc').value = locker.desc || '';
  document.getElementById('editUrl').value = locker.url || '';
  document.getElementById('editScript').value = locker.script || '';

  const chSelect = document.getElementById('editChannel');
  if (chSelect) {
    const isGhost = (locker.ch || '').toLowerCase().includes('ghost');
    chSelect.value = isGhost ? 'GhostSensix' : 'Blacklistxyx';
  }

  const adsSelect = document.getElementById('editAds');
  if (adsSelect) {
    adsSelect.value = locker.ads !== undefined ? locker.ads : '3';
  }

  if (locker.script && !locker.url) {
    switchEditMode('script');
  } else {
    switchEditMode('url');
  }

  const modal = document.getElementById('editLockerModal');
  if (modal) modal.classList.add('active');
  if (window.lucide) lucide.createIcons();
};

window.closeEditModal = function() {
  const modal = document.getElementById('editLockerModal');
  if (modal) modal.classList.remove('active');
};

window.switchEditMode = function(mode) {
  currentEditMode = mode;
  const tabUrl = document.getElementById('editTabUrl');
  const tabScript = document.getElementById('editTabScript');
  const grpUrl = document.getElementById('editGrpUrl');
  const grpScript = document.getElementById('editGrpScript');

  if (mode === 'url') {
    tabUrl.style.background = '#2563EB';
    tabUrl.style.color = '#FFFFFF';
    tabScript.style.background = 'transparent';
    tabScript.style.color = '#94A3B8';
    grpUrl.style.display = 'block';
    grpScript.style.display = 'none';
  } else {
    tabScript.style.background = '#2563EB';
    tabScript.style.color = '#FFFFFF';
    tabUrl.style.background = 'transparent';
    tabUrl.style.color = '#94A3B8';
    grpScript.style.display = 'block';
    grpUrl.style.display = 'none';
  }
};

window.handleSaveEditLocker = async function(e) {
  e.preventDefault();
  const slug = document.getElementById('editSlug').value.trim();
  const title = document.getElementById('editTitle').value.trim();
  const desc = document.getElementById('editDesc').value.trim();
  const ch = document.getElementById('editChannel').value;
  const ads = parseInt(document.getElementById('editAds').value, 10);
  const urlVal = currentEditMode === 'url' ? document.getElementById('editUrl').value.trim() : '';
  const scriptVal = currentEditMode === 'script' ? document.getElementById('editScript').value.trim() : '';

  const btn = document.getElementById('btnSaveEdit');
  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader-2" class="spin" style="width: 15px; height: 15px;"></i> กำลังบันทึก...`;
  if (window.lucide) lucide.createIcons();

  const payload = {
    slug: slug,
    title: title,
    desc: desc,
    url: urlVal,
    script: scriptVal,
    ch: ch,
    ads: ads
  };

  try {
    const res = await fetch('/api/locker', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      showToast('✅ อัปเดตข้อมูลสำเร็จ! ลิงก์เดิมใช้งานได้ทันที', 'success', 3500);
      closeEditModal();
      loadRealLockers();
    } else {
      showToast(data.error || 'บันทึกไม่สำเร็จ', 'error');
    }
  } catch (err) {
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="check" style="width: 16px; height: 16px;"></i> บันทึกการเปลี่ยนแปลง`;
    if (window.lucide) lucide.createIcons();
  }
};

// 8. Delete Modal & Logic
window.openDeleteModal = function(slug) {
  currentDeletingSlug = slug;
  const el = document.getElementById('deleteSlugTarget');
  if (el) el.textContent = `/l/${slug}`;
  const modal = document.getElementById('deleteModal');
  if (modal) modal.classList.add('active');
  if (window.lucide) lucide.createIcons();
};

window.closeDeleteModal = function() {
  currentDeletingSlug = null;
  const modal = document.getElementById('deleteModal');
  if (modal) modal.classList.remove('active');
};

window.confirmDeleteLocker = async function() {
  if (!currentDeletingSlug) return;
  const btn = document.getElementById('btnConfirmDelete');
  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader-2" class="spin" style="width: 15px; height: 15px;"></i> กำลังลบ...`;
  if (window.lucide) lucide.createIcons();

  try {
    const res = await fetch(`/api/locker?slug=${encodeURIComponent(currentDeletingSlug)}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data.success) {
      showToast('🗑️ ลบ Locker เรียบร้อยแล้ว', 'info');
      closeDeleteModal();
      loadRealLockers();
    } else {
      showToast(data.error || 'ลบไม่สำเร็จ', 'error');
    }
  } catch (err) {
    showToast('เกิดข้อผิดพลาดในการลบ', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="trash-2" style="width: 14px; height: 14px;"></i> ยืนยันการลบ`;
    if (window.lucide) lucide.createIcons();
  }
};

// 9. Create Locker Modal
window.openCreateModal = function() {
  const modal = document.getElementById('createLockerModal');
  if (modal) modal.classList.add('active');
  if (window.lucide) lucide.createIcons();
};

window.closeCreateModal = function() {
  const modal = document.getElementById('createLockerModal');
  if (modal) modal.classList.remove('active');
};

window.handleCreateModalSubmit = async function(e) {
  e.preventDefault();
  const dest = document.getElementById('inputDestinationUrl').value.trim();
  const name = document.getElementById('inputLockerName').value.trim();
  const slug = document.getElementById('inputLockerSlug').value.trim();
  const ch = document.getElementById('inputLockerChannel').value;
  const ads = parseInt(document.getElementById('inputLockerAds')?.value || '3', 10);

  if (!dest) return;

  const btn = document.getElementById('btnSubmitCreate');
  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader-2" class="spin" style="width: 15px; height: 15px;"></i> กำลังสร้าง...`;
  if (window.lucide) lucide.createIcons();

  const isScript = dest.includes('loadstring') || dest.includes('getgenv') || dest.length > 250;
  const payload = {
    url: isScript ? '' : dest,
    script: isScript ? dest : '',
    title: name || (isScript ? 'แจกสคริปต์ฟรี' : 'ไฟล์ดาวน์โหลด'),
    desc: 'ทำภารกิจด้านล่างเพื่อปลดล็อก',
    slug: slug,
    ch: ch,
    ads: ads
  };

  try {
    const res = await fetch('/api/locker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success && data.slug) {
      showToast(`🎉 สร้าง Locker /l/${data.slug} สำเร็จ!`, 'success');
      closeCreateModal();
      loadRealLockers();
    } else {
      showToast(data.error || 'สร้างไม่สำเร็จ', 'error');
    }
  } catch (err) {
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="check" style="width: 16px; height: 16px;"></i> สร้างและเปิดใช้งาน`;
    if (window.lucide) lucide.createIcons();
  }
};

// 10. Performance SVG Chart Rendering
function renderChart() {
  const container = document.getElementById('chartContainer');
  if (!container) return;

  const labels = allLockers.map(l => l.slug || 'slug');
  const values = allLockers.map(l => {
    if (currentChartMetric === 'unlocks') return Number(l.unlocks) || 0;
    if (currentChartMetric === 'revenue') return Number((Number(l.clicks) || 0) * 0.0038);
    return Number(l.clicks) || 0;
  });

  if (labels.length === 0) {
    container.innerHTML = `<span style="color: var(--text-muted); font-size: 13px;">ยังไม่มีข้อมูลสำหรับสร้างกราฟ</span>`;
    return;
  }

  const maxVal = Math.max(...values, 5);
  const width = 700;
  const height = 240;
  const padLeft = 40;
  const padRight = 20;
  const padBottom = 40;
  const padTop = 20;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const stepX = chartW / Math.max(labels.length, 1);
  const barWidth = Math.min(stepX * 0.55, 48);

  const bars = values.map((val, idx) => {
    const barH = (val / maxVal) * chartH;
    const x = padLeft + (idx * stepX) + (stepX - barWidth) / 2;
    const y = padTop + (chartH - barH);
    const label = labels[idx];
    const displayVal = currentChartMetric === 'revenue' ? `$${val.toFixed(2)}` : val.toLocaleString();

    return `
      <g>
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="5" fill="url(#barGradient)" opacity="0.9">
          <animate attributeName="height" from="0" to="${barH}" dur="0.5s" fill="freeze" />
          <animate attributeName="y" from="${padTop + chartH}" to="${y}" dur="0.5s" fill="freeze" />
        </rect>
        <text x="${x + barWidth / 2}" y="${y - 8}" text-anchor="middle" fill="#FFFFFF" font-size="11" font-weight="700">${displayVal}</text>
        <text x="${x + barWidth / 2}" y="${padTop + chartH + 20}" text-anchor="middle" fill="#94A3B8" font-size="11" font-weight="600">/l/${escapeHtml(label)}</text>
      </g>
    `;
  }).join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%; overflow: visible;">
      <defs>
        <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#38BDF8" />
          <stop offset="100%" stop-color="#6366F1" />
        </linearGradient>
      </defs>
      <!-- Base Axis Line -->
      <line x1="${padLeft}" y1="${padTop + chartH}" x2="${width - padRight}" y2="${padTop + chartH}" stroke="rgba(255,255,255,0.12)" stroke-width="1" />
      ${bars}
    </svg>
  `;
}

window.switchChartMetric = function(metric) {
  currentChartMetric = metric;
  document.querySelectorAll('.chart-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.chartMetric === metric);
  });
  renderChart();
};

// 11. Toast Notifications
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.style.cssText = `
    background: #0F172A;
    border: 1px solid ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#38BDF8'};
    color: #FFFFFF;
    padding: 12px 18px;
    border-radius: 8px;
    font-size: 13.5px;
    font-weight: 600;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    gap: 8px;
    animation: toast-in 0.25s ease;
  `;
  toast.textContent = message;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// 12. Monetag Settings Management
function initMonetagSettings() {
  try {
    const custom = localStorage.getItem('monetag_custom_pool');
    if (custom) {
      const pool = JSON.parse(custom);
      if (pool[0] && document.getElementById('setAdLink1')) document.getElementById('setAdLink1').value = pool[0];
      if (pool[1] && document.getElementById('setAdLink2')) document.getElementById('setAdLink2').value = pool[1];
      if (pool[2] && document.getElementById('setAdLink3')) document.getElementById('setAdLink3').value = pool[2];
      if (pool[3] && document.getElementById('setAdLink4')) document.getElementById('setAdLink4').value = pool[3];
    }
  } catch (e) {}
}

window.saveMonetagSettings = function() {
  const l1 = (document.getElementById('setAdLink1')?.value || '').trim();
  const l2 = (document.getElementById('setAdLink2')?.value || '').trim();
  const l3 = (document.getElementById('setAdLink3')?.value || '').trim();
  const l4 = (document.getElementById('setAdLink4')?.value || '').trim();
  const pool = [l1, l2, l3, l4].filter(Boolean);

  if (pool.length === 0) {
    showToast('กรุณาระบุลิงก์ Monetag อย่างน้อย 1 ลิงก์', 'error');
    return;
  }

  localStorage.setItem('monetag_custom_pool', JSON.stringify(pool));
  showToast('✅ บันทึกการตั้งค่าลิงก์ Monetag เรียบร้อยแล้ว!', 'success');
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
