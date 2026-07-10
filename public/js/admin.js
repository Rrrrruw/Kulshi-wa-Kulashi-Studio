function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function recentSongCard(song) {
  const cover = song.coverImageUrl
    ? `<img src="${song.coverImageUrl}" alt="" class="admin-card-cover" />`
    : `<div class="admin-card-cover admin-card-cover-empty"></div>`;

  return `
    <article class="media-card admin-recent-card">
      ${cover}
      <div>
        <strong>${escapeHtml(song.title)}</strong>
        <p style="color:var(--muted); margin:2px 0 0; font-size:0.85rem;">${escapeHtml(song.artist || 'فنان غير معروف')}</p>
      </div>
    </article>
  `;
}

async function loadRecentSongs() {
  const grid = document.getElementById('admin-recent-grid');
  const empty = document.getElementById('admin-recent-empty');

  try {
    const res = await fetch('/api/songs');
    if (!res.ok) throw new Error('فشل الطلب');
    const songs = await res.json();

    if (!Array.isArray(songs) || songs.length === 0) {
      grid.style.display = 'none';
      empty.style.display = 'block';
      return;
    }

    grid.innerHTML = songs.slice(0, 8).map(recentSongCard).join('');
    grid.style.display = 'grid';
    empty.style.display = 'none';
  } catch (err) {
    grid.style.display = 'none';
    empty.style.display = 'block';
  }
}

function setupAdminForm() {
  const form = document.getElementById('admin-song-form');
  const statusEl = document.getElementById('admin-status');
  const btn = form.querySelector('.upload-btn');
  const btnText = document.getElementById('admin-btn-text');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusEl.textContent = '';
    statusEl.className = 'upload-status';
    btn.disabled = true;
    btnText.textContent = 'جارٍ النشر...';

    try {
      const formData = new FormData(form); // يشمل title, artist, audioUrl, وملف الغلاف (cover) تلقائياً

      const res = await fetch('/api/songs/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'تعذّر نشر الأغنية');
      }

      statusEl.textContent = 'تم نشر الأغنية بنجاح — راح تلقاها فوراً بالموقع الرئيسي ✓';
      statusEl.className = 'upload-status success';
      form.reset();
      await loadRecentSongs();
    } catch (err) {
      statusEl.textContent = err.message || 'حدث خطأ غير متوقع';
      statusEl.className = 'upload-status error';
    } finally {
      btn.disabled = false;
      btnText.textContent = 'نشر الأغنية على الموقع';
    }
  });
}

// =========================================================
// طلبات رفع الأغاني (الموافقة / الرفض)
// =========================================================

const requestStatusLabels = {
  pending: { text: 'قيد المراجعة', className: 'badge-pending' },
  approved: { text: 'مقبولة ✓', className: 'badge-approved' },
  rejected: { text: 'مرفوضة', className: 'badge-rejected' },
};

let currentRequestsFilter = 'pending';

function requestAdminCard(req) {
  const status = requestStatusLabels[req.status] || requestStatusLabels.pending;
  const cover = req.coverImageUrl
    ? `<img src="${req.coverImageUrl}" alt="" class="admin-card-cover" />`
    : `<div class="admin-card-cover admin-card-cover-empty"></div>`;

  const notes = req.notes ? `<p class="request-note">ملاحظة: ${escapeHtml(req.notes)}</p>` : '';
  const requester = `<p class="request-requester">بواسطة: ${escapeHtml(req.requestedBy?.name || 'مستخدم')} — ${escapeHtml(req.requestedBy?.email || '')}</p>`;

  const actions =
    req.status === 'pending'
      ? `
        <div class="request-actions">
          <button type="button" class="request-approve-btn" data-id="${req._id}">قبول ونشر</button>
          <button type="button" class="request-reject-btn" data-id="${req._id}">رفض</button>
        </div>
        <div class="request-reject-form" id="reject-form-${req._id}" hidden>
          <input type="text" placeholder="سبب الرفض (اختياري)" class="reject-reason-input" id="reject-reason-${req._id}" />
          <button type="button" class="request-reject-confirm-btn" data-id="${req._id}">تأكيد الرفض</button>
        </div>
      `
      : req.status === 'rejected' && req.rejectReason
      ? `<p class="request-reason">السبب: ${escapeHtml(req.rejectReason)}</p>`
      : '';

  return `
    <article class="media-card admin-recent-card request-card">
      ${cover}
      <div>
        <strong>${escapeHtml(req.title)}</strong>
        <p style="color:var(--muted); margin:2px 0 0; font-size:0.85rem;">${escapeHtml(req.artist || 'فنان غير معروف')}</p>
        <span class="status-badge ${status.className}">${status.text}</span>
        ${req.audioUrl ? `<audio controls preload="none" src="${req.audioUrl}" class="request-audio"></audio>` : ''}
        ${notes}
        ${requester}
        ${actions}
      </div>
    </article>
  `;
}

async function loadRequests(status) {
  const list = document.getElementById('requests-list');
  const empty = document.getElementById('requests-empty');
  if (!list) return;

  try {
    const url = status ? `/api/requests?status=${status}` : '/api/requests';
    const res = await fetch(url);
    if (!res.ok) throw new Error('فشل الطلب');
    const requests = await res.json();

    if (!Array.isArray(requests) || requests.length === 0) {
      list.style.display = 'none';
      empty.style.display = 'block';
      return;
    }

    list.innerHTML = requests.map(requestAdminCard).join('');
    list.style.display = 'grid';
    empty.style.display = 'none';
  } catch (err) {
    list.style.display = 'none';
    empty.style.display = 'block';
  }
}

function setupRequestsSection() {
  const section = document.getElementById('requests-section');
  if (!section) return;

  const filterBar = document.getElementById('requests-filter');
  filterBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.upload-tab');
    if (!btn) return;
    filterBar.querySelectorAll('.upload-tab').forEach((b) => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    currentRequestsFilter = btn.dataset.status;
    loadRequests(currentRequestsFilter);
  });

  const list = document.getElementById('requests-list');
  list.addEventListener('click', async (e) => {
    const approveBtn = e.target.closest('.request-approve-btn');
    const rejectBtn = e.target.closest('.request-reject-btn');
    const rejectConfirmBtn = e.target.closest('.request-reject-confirm-btn');

    if (approveBtn) {
      const id = approveBtn.dataset.id;
      approveBtn.disabled = true;
      approveBtn.textContent = 'جارٍ النشر...';
      try {
        const res = await fetch(`/api/requests/${id}/approve`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'تعذّرت الموافقة');
        await loadRequests(currentRequestsFilter);
        await loadRecentSongs();
      } catch (err) {
        alert(err.message || 'حدث خطأ غير متوقع');
        approveBtn.disabled = false;
        approveBtn.textContent = 'قبول ونشر';
      }
      return;
    }

    if (rejectBtn) {
      const id = rejectBtn.dataset.id;
      const form = document.getElementById(`reject-form-${id}`);
      if (form) form.hidden = !form.hidden;
      return;
    }

    if (rejectConfirmBtn) {
      const id = rejectConfirmBtn.dataset.id;
      const reasonInput = document.getElementById(`reject-reason-${id}`);
      const reason = reasonInput ? reasonInput.value : '';
      rejectConfirmBtn.disabled = true;
      rejectConfirmBtn.textContent = 'جارٍ الرفض...';
      try {
        const res = await fetch(`/api/requests/${id}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'تعذّر الرفض');
        await loadRequests(currentRequestsFilter);
      } catch (err) {
        alert(err.message || 'حدث خطأ غير متوقع');
        rejectConfirmBtn.disabled = false;
        rejectConfirmBtn.textContent = 'تأكيد الرفض';
      }
    }
  });

  loadRequests(currentRequestsFilter);
}

function setupLogout() {
  const link = document.getElementById('admin-logout');
  if (!link) return;
  link.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } finally {
      window.location.href = 'admin.html';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupAdminForm();
  loadRecentSongs();
  setupRequestsSection();
  setupLogout();
});
