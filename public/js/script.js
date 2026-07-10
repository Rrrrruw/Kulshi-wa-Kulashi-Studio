// =========================================================
// 1) جلب الأغاني والألعاب من الـ API وعرضها
// =========================================================

let currentSongs = []; // نحتفظ بقائمة الأغاني في الذاكرة عشان زر "تشغيل" يعرف بيانات كل أغنية

async function loadCollection({ endpoint, gridId, emptyId, renderCard, onLoaded }) {
  const grid = document.getElementById(gridId);
  const empty = document.getElementById(emptyId);

  try {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error('فشل الطلب');
    const items = await res.json();

    if (onLoaded) onLoaded(items);

    if (!Array.isArray(items) || items.length === 0) {
      grid.style.display = 'none';
      empty.style.display = 'block';
      return;
    }

    grid.innerHTML = items.map(renderCard).join('');
    grid.style.display = 'grid';
    empty.style.display = 'none';
  } catch (err) {
    // السيرفر غير متصل بعد أو لا يوجد اتصال بقاعدة البيانات — إبقاء حالة الفراغ ظاهرة
    grid.style.display = 'none';
    empty.style.display = 'block';
  }
}

function songCard(song) {
  const cover = song.coverImageUrl
    ? `<img src="${song.coverImageUrl}" alt="" class="card-cover" />`
    : `<div class="card-cover-empty"></div>`;

  return `
    <article class="media-card" data-song-id="${song._id}">
      ${cover}
      <strong>${escapeHtml(song.title)}</strong>
      <p style="color:var(--muted); margin:0; font-size:0.9rem;">${escapeHtml(song.artist || 'فنان غير معروف')}</p>
      <button class="card-play" data-song-id="${song._id}" type="button">
        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        <span>تشغيل</span>
      </button>
    </article>
  `;
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function refreshSongs() {
  return loadCollection({
    endpoint: '/api/songs',
    gridId: 'songs-grid',
    emptyId: 'songs-empty',
    renderCard: songCard,
    onLoaded: (items) => { currentSongs = items; },
  });
}

// =========================================================
// 2) المشغل الثابت أسفل الصفحة
//    - عنصر <audio> واحد يبقى في الصفحة طوال الوقت (لا يُعاد إنشاؤه أبداً)
//    - لذلك الصوت يستمر بالتشغيل حتى لو تنقّلت بين الأقسام أو غيّرت التبويب،
//      طالما ما سكّرت الصفحة نفسها أو عملت لها تحديث (refresh).
// =========================================================

function setupPlayer() {
  const audio = document.getElementById('audio-player');
  const bar = document.getElementById('player-bar');
  const titleEl = document.getElementById('player-title');
  const artistEl = document.getElementById('player-artist');
  const toggleBtn = document.getElementById('player-toggle');
  const iconPlay = document.getElementById('icon-play');
  const iconPause = document.getElementById('icon-pause');
  const seek = document.getElementById('player-seek');
  const currentTimeEl = document.getElementById('player-current');
  const durationEl = document.getElementById('player-duration');

  let activeCardBtn = null;

  function formatTime(sec) {
    if (!isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function setPlayingIcon(isPlaying) {
    iconPlay.hidden = isPlaying;
    iconPause.hidden = !isPlaying;
  }

  function playSong(song, sourceBtn) {
    if (!song.audioUrl) return;

    // لو ضغطنا نفس الأغنية اللي شغالة حالياً -> نعمل تشغيل/إيقاف فقط
    if (audio.dataset.songId === song._id) {
      if (audio.paused) audio.play(); else audio.pause();
      return;
    }

    audio.src = song.audioUrl;
    audio.dataset.songId = song._id;
    audio.play();

    titleEl.textContent = song.title;
    artistEl.textContent = song.artist;
    bar.hidden = false;
    document.body.classList.add('has-player');

    if (activeCardBtn) activeCardBtn.classList.remove('is-playing');
    if (sourceBtn) {
      sourceBtn.classList.add('is-playing');
      activeCardBtn = sourceBtn;
    }

    // ميتاداتا لشاشة القفل / أزرار التحكم بالوسائط في النظام (لمسة إضافية)
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artist,
        album: song.album || '',
      });
    }
  }

  // تفويض النقر على أزرار "تشغيل" داخل بطاقات الأغاني (حتى لو أُعيد بناء القائمة)
  document.getElementById('songs-grid').addEventListener('click', (e) => {
    const btn = e.target.closest('.card-play');
    if (!btn) return;
    const song = currentSongs.find((s) => s._id === btn.dataset.songId);
    if (song) playSong(song, btn);
  });

  toggleBtn.addEventListener('click', () => {
    if (!audio.src) return;
    if (audio.paused) audio.play(); else audio.pause();
  });

  audio.addEventListener('play', () => setPlayingIcon(true));
  audio.addEventListener('pause', () => setPlayingIcon(false));

  audio.addEventListener('loadedmetadata', () => {
    durationEl.textContent = formatTime(audio.duration);
    seek.max = Math.floor(audio.duration) || 0;
  });

  audio.addEventListener('timeupdate', () => {
    currentTimeEl.textContent = formatTime(audio.currentTime);
    seek.value = Math.floor(audio.currentTime);
  });

  seek.addEventListener('input', () => {
    audio.currentTime = Number(seek.value);
  });

  audio.addEventListener('ended', () => {
    if (activeCardBtn) activeCardBtn.classList.remove('is-playing');
  });
}

// =========================================================
// تشغيل كل شيء بعد تحميل الصفحة
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  refreshSongs();
  setupPlayer();
});
