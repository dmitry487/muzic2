// Redesigned player: start-from-beginning on play, persistent state, full controls, queue panel
(function () {
  const playerRoot = document.getElementById('player-root');
  if (!playerRoot) return;

  playerRoot.innerHTML = `
    <style>
      #player { display: grid; grid-template-columns: 1fr 2fr 1fr; align-items: center; gap: 12px; padding: 10px 12px; border-top: 1px solid #222; background: #121212; color: #fff; }
      .player-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
      .cover { width: 56px; height: 56px; object-fit: cover; border-radius: 8px; background: #222; }
      .track-info { min-width: 0; }
      #track-title { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      #track-artist { color: #b3b3b3; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      #track-status { color: #1ed760; font-size: 0.85rem; }
      .player-center { display: flex; flex-direction: column; gap: 6px; }
      .player-controls { display: flex; align-items: center; justify-content: center; gap: 12px; }
      .player-controls button { background: transparent; border: none; color: #fff; cursor: pointer; padding: 6px; border-radius: 50%; }
      .player-controls button:hover { background: #1f1f1f; }
      .player-progress { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px; }
      #seek-bar { width: 100%; }
      .player-right { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
      .volume-bar { width: 120px; }
      .btn-active { color: #1ed760; }
      /* Queue panel */
      #queue-panel { position: fixed; right: 12px; bottom: 76px; width: 360px; max-height: 55vh; overflow: auto; background: #0f0f0f; color: #fff; border: 1px solid #242424; border-radius: 12px; box-shadow: 0 12px 30px rgba(0,0,0,.5); display: none; }
      #queue-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid #1f1f1f; position: sticky; top: 0; background: #0f0f0f; z-index: 1; }
      #queue-title { font-weight: 600; }
      #queue-close { background: transparent; border: none; color: #b3b3b3; cursor: pointer; }
      #queue-list { list-style: none; margin: 0; padding: 8px; }
      .queue-item { display: grid; grid-template-columns: 24px 1fr auto; gap: 8px; align-items: center; padding: 8px; border-radius: 8px; cursor: pointer; }
      .queue-item:hover { background: #1a1a1a; }
      .queue-idx { color: #777; text-align: right; }
      .queue-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .queue-artist { color: #9aa0a6; font-size: 0.86rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .queue-meta { color: #666; font-size: 0.8rem; }
      .queue-current { background: #1a1f1a; }
    </style>
    <div id="player">
      <div class="player-left">
        <img id="cover" src="https://via.placeholder.com/56x56?text=%E2%99%AA" alt="cover" class="cover">
        <div class="track-info">
          <div id="track-title">Название трека</div>
          <div id="track-artist">Артист</div>
        </div>
        <span id="track-status" class="track-status"></span>
      </div>
      <div class="player-center">
        <div class="player-controls">
          <button id="shuffle-btn" title="Случайно">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
          </button>
          <button id="prev-btn" title="Назад">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg>
          </button>
          <button id="play-btn" title="Воспроизвести">
            <svg id="play-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>
            <svg id="pause-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:none;"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          </button>
          <button id="next-btn" title="Вперёд">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
          </button>
          <button id="repeat-btn" title="Повтор: выкл">
            <svg id="repeat-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          </button>
        </div>
        <div class="player-progress">
          <span id="current-time">0:00</span>
          <input type="range" id="seek-bar" min="0" max="100" value="0">
          <span id="duration">0:00</span>
        </div>
      </div>
      <div class="player-right">
        <button id="queue-btn" title="Очередь">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="17" y2="18"/><polyline points="19 16 21 18 19 20"/></svg>
        </button>
        <button id="lyrics-btn" title="Текст">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="17" x2="20" y2="17"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="7" x2="20" y2="7"/></svg>
        </button>
        <button id="device-btn" title="Устройство">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h3"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2H3"/></svg>
        </button>
        <button id="volume-btn" title="Громкость">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
        </button>
        <input type="range" id="volume-bar" min="0" max="100" value="100" class="volume-bar">
        <button id="fullscreen-btn" title="Fullscreen">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
        </button>
      </div>
      <audio id="audio" preload="auto"></audio>
    </div>
    <div id="queue-panel">
      <div id="queue-header">
        <span id="queue-title">Очередь воспроизведения</span>
        <button id="queue-close">Закрыть</button>
      </div>
      <ul id="queue-list"></ul>
    </div>
  `;

  // Elements
  const audio = document.getElementById('audio');
  const playBtn = document.getElementById('play-btn');
  const playIcon = document.getElementById('play-icon');
  const pauseIcon = document.getElementById('pause-icon');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const shuffleBtn = document.getElementById('shuffle-btn');
  const repeatBtn = document.getElementById('repeat-btn');
  const seekBar = document.getElementById('seek-bar');
  const trackTitle = document.getElementById('track-title');
  const trackArtist = document.getElementById('track-artist');
  const currentTimeEl = document.getElementById('current-time');
  const durationEl = document.getElementById('duration');
  const cover = document.getElementById('cover');
  const volumeBar = document.getElementById('volume-bar');
  const queueBtn = document.getElementById('queue-btn');
  const queuePanel = document.getElementById('queue-panel');
  const queueClose = document.getElementById('queue-close');
  const queueList = document.getElementById('queue-list');

  // State
  const PLAYER_STATE_KEY = 'muzic2_player_state';
  const QUEUE_KEY = 'muzic2_player_queue';
  const QUEUE_INDEX_KEY = 'muzic2_player_queue_index';
  const SHUFFLE_KEY = 'muzic2_player_shuffle';
  const REPEAT_KEY = 'muzic2_player_repeat'; // none | one | all

  let isPlaying = false;
  let trackQueue = [];
  let queueIndex = 0;
  let shuffleEnabled = false;
  let repeatMode = 'none';

  // Helpers
  function formatTime(sec) {
    sec = Math.floor(sec || 0);
    return `${Math.floor(sec / 60)}:${('0' + (sec % 60)).slice(-2)}`;
  }
  function updatePlayPauseUI() {
    if (audio.paused) {
      playIcon.style.display = '';
      pauseIcon.style.display = 'none';
    } else {
      playIcon.style.display = 'none';
      pauseIcon.style.display = '';
    }
  }
  function updateShuffleUI() {
    shuffleBtn.classList.toggle('btn-active', shuffleEnabled);
  }
  function updateRepeatUI() {
    const titles = { none: 'Повтор: выкл', one: 'Повтор: один', all: 'Повтор: все' };
    repeatBtn.title = titles[repeatMode];
    repeatBtn.classList.toggle('btn-active', repeatMode !== 'none');
  }

  // Throttle helper to limit frequent storage writes
  function throttle(fn, ms) {
    let last = 0;
    return function (...args) {
      const now = Date.now();
      if (now - last >= ms) {
        last = now;
        return fn.apply(this, args);
      }
    };
  }

  // Persistence
  function savePlayerState() {
    const state = {
      src: audio.src,
      title: trackTitle.textContent,
      artist: trackArtist.textContent,
      cover: cover.src,
      currentTime: audio.currentTime,
      isPlaying: !audio.paused,
      volume: audio.volume,
      shuffle: shuffleEnabled,
      repeat: repeatMode,
      queueIndex
    };
    localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(state));
  }
  const savePlayerStateThrottled = throttle(savePlayerState, 1000);
  function loadPlayerState() {
    const state = JSON.parse(localStorage.getItem(PLAYER_STATE_KEY) || 'null');
    if (state && state.src) {
      audio.src = state.src;
      trackTitle.textContent = state.title || '';
      trackArtist.textContent = state.artist || '';
      cover.src = state.cover || '';
      audio.volume = state.volume !== undefined ? state.volume : 1;
      volumeBar.value = Math.round(audio.volume * 100);
      shuffleEnabled = !!state.shuffle;
      repeatMode = state.repeat || 'none';
      queueIndex = typeof state.queueIndex === 'number' ? state.queueIndex : 0;
      updateShuffleUI();
      updateRepeatUI();

      audio.addEventListener('loadedmetadata', function restoreOnce() {
        audio.currentTime = state.currentTime || 0;
        seekBar.value = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
        currentTimeEl.textContent = formatTime(audio.currentTime);
        durationEl.textContent = formatTime(audio.duration);
        if (state.isPlaying) {
          audio.play().catch(() => {});
        }
        audio.removeEventListener('loadedmetadata', restoreOnce);
      });
    }
  }
  function saveQueue() {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(trackQueue));
    localStorage.setItem(QUEUE_INDEX_KEY, String(queueIndex));
  }
  function loadQueue() {
    trackQueue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    queueIndex = parseInt(localStorage.getItem(QUEUE_INDEX_KEY) || '0', 10);
    if (isNaN(queueIndex) || queueIndex < 0) queueIndex = 0;
  }

  // Queue UI
  function toggleQueuePanel(show) {
    const isVisible = queuePanel.style.display === 'block';
    const willShow = show !== undefined ? show : !isVisible;
    queuePanel.style.display = willShow ? 'block' : 'none';
    if (willShow) renderQueueUI();
  }
  function renderQueueUI() {
    queueList.innerHTML = '';
    if (!trackQueue.length) {
      const li = document.createElement('li');
      li.style.padding = '12px';
      li.style.color = '#9aa0a6';
      li.textContent = 'Очередь пуста';
      queueList.appendChild(li);
      return;
    }
    // Show tracks in normal order with current track highlighted
    trackQueue.forEach((t, idx) => {
      const li = document.createElement('li');
      li.className = 'queue-item' + (idx === queueIndex ? ' queue-current' : '');
      li.innerHTML = `
        <div class="queue-idx">${idx + 1}</div>
        <div>
          <div class="queue-title">${escapeHtml(t.title || '')}</div>
          <div class="queue-artist">${escapeHtml(t.artist || '')}</div>
        </div>
        <div class="queue-meta">${t.duration ? formatTime(t.duration) : ''}</div>
      `;
      li.onclick = () => {
        playFromQueue(idx);
      };
      queueList.appendChild(li);
    });
  }

  // Core playback
  function setNowPlaying(t) {
    trackTitle.textContent = t.title || '';
    trackArtist.textContent = t.artist || '';
    cover.src = t.cover || cover.src;
  }
  function playFromQueue(idx) {
    if (!trackQueue[idx]) return;
    queueIndex = idx;
    const t = trackQueue[idx];
    audio.src = t.src;
    setNowPlaying(t);
    // start from beginning always when starting playback via control
    audio.currentTime = 0;
    audio.play().catch(() => {});
    saveQueue();
    savePlayerState();
    renderQueueUI();
  }
  function playNext(auto = false) {
    if (!trackQueue.length) return;
    if (repeatMode === 'one' && auto) {
      // replay same
      playFromQueue(queueIndex);
      return;
    }
    if (shuffleEnabled) {
      let nextIdx = Math.floor(Math.random() * trackQueue.length);
      if (trackQueue.length > 1 && nextIdx === queueIndex) {
        nextIdx = (queueIndex + 1) % trackQueue.length;
      }
      playFromQueue(nextIdx);
      return;
    }
    if (queueIndex + 1 < trackQueue.length) {
      playFromQueue(queueIndex + 1);
    } else if (repeatMode === 'all') {
      playFromQueue(0);
    }
  }
  function playPrev() {
    if (!trackQueue.length) return;
    if (audio.currentTime > 3) {
      // restart current if played > 3s
      audio.currentTime = 0;
      return;
    }
    if (shuffleEnabled) {
      let prevIdx = Math.floor(Math.random() * trackQueue.length);
      if (trackQueue.length > 1 && prevIdx === queueIndex) prevIdx = (queueIndex + trackQueue.length - 1) % trackQueue.length;
      playFromQueue(prevIdx);
      return;
    }
    if (queueIndex > 0) {
      playFromQueue(queueIndex - 1);
    } else if (repeatMode === 'all') {
      playFromQueue(trackQueue.length - 1);
    } else {
      audio.currentTime = 0;
    }
  }

  // Events
  playBtn.onclick = () => {
    if (!audio.src) {
      // try play current queue item
      if (trackQueue[queueIndex]) {
        playFromQueue(queueIndex);
      }
      return;
    }
    // Do NOT reset position on play; resume from currentTime
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  };
  audio.addEventListener('play', () => {
    isPlaying = true;
    updatePlayPauseUI();
    document.getElementById('track-status').textContent = '';
    savePlayerState();
  });
  audio.addEventListener('pause', () => {
    isPlaying = false;
    updatePlayPauseUI();
    document.getElementById('track-status').textContent = '';
    savePlayerState();
  });
  audio.addEventListener('timeupdate', () => {
    seekBar.value = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    currentTimeEl.textContent = formatTime(audio.currentTime);
    // Persist progress regularly so we can resume across navigation
    savePlayerStateThrottled();
  });
  audio.addEventListener('loadedmetadata', () => {
    durationEl.textContent = formatTime(audio.duration);
  });
  audio.addEventListener('ended', () => {
    playNext(true);
  });

  seekBar.oninput = () => {
    if (audio.duration) {
      audio.currentTime = (seekBar.value / 100) * audio.duration;
    }
  };
  volumeBar.oninput = () => {
    audio.volume = volumeBar.value / 100;
    savePlayerState();
  };
  shuffleBtn.onclick = () => {
    shuffleEnabled = !shuffleEnabled;
    updateShuffleUI();
    savePlayerState();
  };
  repeatBtn.onclick = () => {
    repeatMode = repeatMode === 'none' ? 'one' : repeatMode === 'one' ? 'all' : 'none';
    updateRepeatUI();
    savePlayerState();
  };
  nextBtn.onclick = () => playNext(false);
  prevBtn.onclick = () => playPrev();

  queueBtn.onclick = () => toggleQueuePanel();
  queueClose.onclick = () => toggleQueuePanel(false);

  // Persistence wiring
  ;['play', 'pause', 'seeked', 'volumechange', 'ended'].forEach(event => {
    audio.addEventListener(event, savePlayerState);
  });
  // Save on tab hide and before page unload to not lose position
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') savePlayerState();
  });
  window.addEventListener('beforeunload', savePlayerState);

  // Public API for other pages
  window.playTrack = function ({ src, title, artist, cover: coverUrl, queue = null, queueStartIndex = 0, duration = 0 }) {
    if (queue && Array.isArray(queue) && queue.length > 0) {
      trackQueue = queue.map(q => ({
        src: q.src || q.file_path || q.url || '',
        title: q.title || '',
        artist: q.artist || '',
        cover: q.cover || coverUrl || '',
        duration: q.duration || 0
      }));
      queueIndex = Math.max(0, Math.min(queueStartIndex, trackQueue.length - 1));
      saveQueue();
      playFromQueue(queueIndex);
      toggleQueuePanel(true);
    } else {
      // Single track
      trackQueue = [{ src, title, artist, cover: coverUrl || '', duration }];
      queueIndex = 0;
      saveQueue();
      playFromQueue(0);
    }
  };

  // Backward compatibility for artist.js which may call loadTrack(track)
  window.loadTrack = function (track) {
    const t = {
      src: track.src || track.file_path || '',
      title: track.title || '',
      artist: track.artist || '',
      cover: track.cover || '',
      duration: track.duration || 0
    };
    window.playTrack({ ...t });
  };

  // Utility
  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"]/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m];
    });
  }

  // Initialize from storage
  loadQueue();
  loadPlayerState();
  updateShuffleUI();
  updateRepeatUI();
  renderQueueUI();
})();
