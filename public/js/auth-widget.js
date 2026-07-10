// يعرض حالة تسجيل الدخول (زر دخول أو الصورة الرمزية + زر خروج) داخل أي صفحة فيها #account-slot
async function loadAuthWidget() {
  const slot = document.getElementById('account-slot');
  if (!slot) return null;

  try {
    const res = await fetch('/auth/me');
    const data = await res.json();

    if (data.user) {
      const avatar = data.user.avatar
        ? `<img src="${data.user.avatar}" alt="" class="account-avatar" />`
        : `<span class="account-avatar account-avatar-empty"></span>`;

      slot.innerHTML = `
        <div class="account-chip">
          ${avatar}
          <span class="account-name">${escapeAuthHtml(data.user.name || 'مستخدم')}</span>
          <a href="#" id="account-logout" class="nav-link music-hover">خروج</a>
        </div>
      `;

      document.getElementById('account-logout').addEventListener('click', async (e) => {
        e.preventDefault();
        await fetch('/auth/logout', { method: 'POST' });
        window.location.reload();
      });
    } else {
      slot.innerHTML = `<a href="/auth/google" class="nav-link music-hover">تسجيل الدخول</a>`;
    }

    return data.user;
  } catch (err) {
    slot.innerHTML = '';
    return null;
  }
}

function escapeAuthHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

document.addEventListener('DOMContentLoaded', loadAuthWidget);
