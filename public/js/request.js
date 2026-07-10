function escapeReqHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const statusLabels = {
  pending: { text: 'قيد المراجعة', className: 'badge-pending' },
  approved: { text: 'مقبولة ✓', className: 'badge-approved' },
  rejected: { text: 'مرفوضة', className: 'badge-rejected' },
};

function requestCard(req) {
  const status = statusLabels[req.status] || statusLabels.pending;
  const cover = req.coverImageUrl
    ? `<img src="${req.coverImageUrl}" alt="" class="admin-card-cover" />`
    : `<div class="admin-card-cover admin-card-cover-empty"></div>`;

  const reason =
    req.status === 'rejected' && req.rejectReason
      ? `<p class="request-reason">السبب: ${escapeReqHtml(req.rejectReason)}</p>`
      : '';

  return `
    <article class="media-card admin-recent-card">
      ${cover}
      <div>
        <strong>${escapeReqHtml(req.title)}</strong>
        <p style="color:var(--muted); margin:2px 0 0; font-size:0.85rem;">${escapeReqHtml(req.artist || 'فنان غير معروف')}</p>
        <span class="status-badge ${status.className}">${status.text}</span>
        ${reason}
      </div>
    </article>
  `;
}

async function loadMyRequests() {
  const list = document.getElementById('my-requests-list');
  const empty = document.getElementById('my-requests-empty');

  try {
    const res = await fetch('/api/requests/mine');
    if (!res.ok) throw new Error('فشل الطلب');
    const requests = await res.json();

    if (!Array.isArray(requests) || requests.length === 0) {
      list.style.display = 'none';
      empty.style.display = 'block';
      return;
    }

    list.innerHTML = requests.map(requestCard).join('');
    list.style.display = 'grid';
    empty.style.display = 'none';
  } catch (err) {
    list.style.display = 'none';
    empty.style.display = 'block';
  }
}

function setupRequestForm() {
  const form = document.getElementById('request-form');
  const statusEl = document.getElementById('req-status');
  const btn = form.querySelector('.upload-btn');
  const btnText = document.getElementById('req-btn-text');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusEl.textContent = '';
    statusEl.className = 'upload-status';
    btn.disabled = true;
    btnText.textContent = 'جارٍ الإرسال...';

    try {
      const formData = new FormData(form);
      const res = await fetch('/api/requests', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'تعذّر إرسال الطلب');

      statusEl.textContent = 'تم إرسال طلبك بنجاح، بانتظار مراجعة صاحب الموقع ✓';
      statusEl.className = 'upload-status success';
      form.reset();
      await loadMyRequests();
    } catch (err) {
      statusEl.textContent = err.message || 'حدث خطأ غير متوقع';
      statusEl.className = 'upload-status error';
    } finally {
      btn.disabled = false;
      btnText.textContent = 'إرسال الطلب';
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await loadAuthWidget();

  const loggedOutView = document.getElementById('logged-out-view');
  const loggedInView = document.getElementById('logged-in-view');

  if (user) {
    loggedOutView.hidden = true;
    loggedInView.hidden = false;
    setupRequestForm();
    loadMyRequests();
  } else {
    loggedOutView.hidden = false;
    loggedInView.hidden = true;

    const params = new URLSearchParams(window.location.search);
    if (params.get('login') === 'failed') {
      document.getElementById('login-failed-msg').hidden = false;
    }
  }
});
