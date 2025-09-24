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
  
  // Inject global Back button once (navigation won't stop audio because popup player handles playback)
  (function ensureGlobalBackButton() {
  if (document.getElementById('global-back-btn')) return;
  const style = document.createElement('style');
  style.id = 'global-back-style';
  style.textContent = `
  #global-back-btn {
  position: fixed;
  left: 12px;
  top: 12px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: #1f1f1f;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,.3);
  z-index: 10000;
  display: grid;
  place-items: center;
  }
  #global-back-btn:hover { background: #262626; }
  #global-back-btn svg { pointer-events: none; }
  `;
  document.head.appendChild(style);
  const btn = document.createElement('button');
  btn.id = 'global-back-btn';
  btn.title = 'Назад';
  btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/><line x1="9" y1="12" x2="21" y2="12"/></svg>';
  btn.onclick = function() {
  try {
  if (window.history && window.history.length > 1) {
  window.history.back();
  } else {
  window.location.href = '/muzic2/public/index.php';
  }
  } catch (e) {
  window.location.href = '/muzic2/public/index.php';
  }
  };
  document.body.appendChild(btn);
  })();
  
  // Elements (scoped to player container to avoid ID conflicts on page)
  const playerContainer = playerRoot.querySelector('#player');
  const audio = playerRoot.querySelector('#audio');
  const playBtn = playerContainer.querySelector('#play-btn');
  const playIcon = playerContainer.querySelector('#play-icon');
  const pauseIcon = playerContainer.querySelector('#pause-icon');
  const prevBtn = playerContainer.querySelector('#prev-btn');
  const nextBtn = playerContainer.querySelector('#next-btn');
  const shuffleBtn = playerContainer.querySelector('#shuffle-btn');
  const repeatBtn = playerContainer.querySelector('#repeat-btn');
  const seekBar = playerContainer.querySelector('#seek-bar');
  const trackTitle = playerContainer.querySelector('#track-title');
  const trackArtist = playerContainer.querySelector('#track-artist');
  const currentTimeEl = playerContainer.querySelector('#current-time');
  const durationEl = playerContainer.querySelector('#duration');
  const cover = playerContainer.querySelector('#cover');
  const volumeBar = playerContainer.querySelector('#volume-bar');
  const queueBtn = playerContainer.querySelector('#queue-btn');
  const queuePanel = playerRoot.querySelector('#queue-panel');
  const queueClose = playerRoot.querySelector('#queue-close');
  const queueList = playerRoot.querySelector('#queue-list');

  // Persistent popup player integration
  let popupWin = null;
  let popupActive = false;
  let popupState = { currentTime: 0, duration: 0, isPlaying: false, src: '', volume: 1, title: '', artist: '', cover: '' };
  function reconnectPopup() {
    // Do not call window.open here to avoid creating about:blank popups on load
    popupWin = null;
    popupActive = false;
    return false;
  }
  function ensurePopup(allowOpen) {
    // Disable popup usage; always use inline <audio>
    return false;
  }
  window.addEventListener('message', (e) => {
    if (!e.data || typeof e.data !== 'object') return;
    if (e.data.cmd === 'popupReady') {
      popupActive = true;
      // Request current state asap
      try { popupWin && popupWin.postMessage({ cmd: 'requestState' }, '*'); } catch (err) {}
      return;
    }
    if (e.data.cmd === 'playerState') {
      popupActive = true;
      popupState = e.data;
      // Update UI from popup state
      seekBar.value = popupState.duration ? (popupState.currentTime / popupState.duration) * 100 : 0;
      currentTimeEl.textContent = formatTime(popupState.currentTime || 0);
      durationEl.textContent = formatTime(popupState.duration || 0);
      if (popupState.title) trackTitle.textContent = popupState.title;
      if (popupState.artist) trackArtist.textContent = popupState.artist;
      if (popupState.cover) cover.src = popupState.cover;
      updatePlayPauseUI();
      savePlayerStateThrottled();
    }
    if (e.data.cmd === 'playerEnded') {
      playNext(true);
    }
  });
  reconnectPopup();

  // Safe posting to popup with readiness checks and retries
  function postToPopup(message, opts = {}) {
    // Popup disabled
    return false;
    function trySend() {
      if (!popupWin || popupWin.closed) return false;
      let ready = true;
      try {
        ready = popupWin.document && popupWin.document.readyState === 'complete';
      } catch (e) {
        ready = true;
      }
      if (!ready) {
        if (attempts++ < retries) {
          setTimeout(trySend, delay);
          return true;
        }
        return false;
      }
      try {
        popupWin.postMessage(message, '*');
        return true;
      } catch (e) {
        if (attempts++ < retries) {
          setTimeout(trySend, delay);
          return true;
        }
        return false;
      }
    }
    return trySend();
  }

  // State
  const PLAYER_STATE_KEY = 'muzic2_player_state';
  const QUEUE_KEY = 'muzic2_player_queue';
  const QUEUE_INDEX_KEY = 'muzic2_player_queue_index';
  const ORIGINAL_QUEUE_KEY = 'muzic2_player_original_queue';
  const SHUFFLE_KEY = 'muzic2_player_shuffle';
  const REPEAT_KEY = 'muzic2_player_repeat'; // none | one | all
  const REPLAY_ENABLED_KEY = 'muzic2_player_replay_once_enabled';
  const REPLAY_TOKEN_KEY = 'muzic2_player_replay_token';

  let isPlaying = false;
  let trackQueue = [];
  let queueIndex = 0;
  let shuffleEnabled = false;
  let repeatMode = 'none';
  // One-time replay toggle state
  let replayOnceEnabled = false;
  let replayToken = null;
  let originalQueue = [];

  // Helpers
  function formatTime(sec) {
    sec = Math.floor(sec || 0);
    return `${Math.floor(sec / 60)}:${('0' + (sec % 60)).slice(-2)}`;
  }
  function updatePlayPauseUI() {
    const playing = popupActive ? !!popupState.isPlaying : !audio.paused;
    if (!playing) {
      playIcon.style.display = '';
      pauseIcon.style.display = 'none';
    } else {
      playIcon.style.display = 'none';
      pauseIcon.style.display = '';
    }
  }
  function updateShuffleUI() {
    const isOn = !!shuffleEnabled;
    shuffleBtn.classList.toggle('btn-active', isOn);
    shuffleBtn.setAttribute('aria-pressed', String(isOn));
    // Force visual state to persist regardless of external styles
    shuffleBtn.style.color = isOn ? '#1ed760' : '';
  }
  function updateRepeatUI() {
    // Repurposed: show one-time replay visual state
    const isOn = !!replayOnceEnabled;
    repeatBtn.title = isOn ? 'Повторить текущий трек один раз (вкл)' : 'Повторить текущий трек один раз (выкл)';
    repeatBtn.classList.toggle('btn-active', isOn);
    repeatBtn.setAttribute('aria-pressed', String(isOn));
    repeatBtn.style.color = isOn ? '#1ed760' : '';
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
    const usingPopup = popupActive;
    const state = {
      src: usingPopup ? (popupState.src || '') : audio.src,
      title: trackTitle.textContent,
      artist: trackArtist.textContent,
      cover: cover.src,
      currentTime: usingPopup ? (popupState.currentTime || 0) : audio.currentTime,
      isPlaying: usingPopup ? !!popupState.isPlaying : !audio.paused,
      volume: usingPopup ? (popupState.volume ?? audio.volume) : audio.volume,
      shuffle: shuffleEnabled,
      repeat: repeatMode,
      queueIndex,
      replayOnceEnabled,
      replayToken
    };
    localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(state));
    // Persist replay toggle separately for robustness
    localStorage.setItem(REPLAY_ENABLED_KEY, replayOnceEnabled ? '1' : '0');
    if (replayToken) localStorage.setItem(REPLAY_TOKEN_KEY, replayToken); else localStorage.removeItem(REPLAY_TOKEN_KEY);
  }
  const savePlayerStateThrottled = throttle(savePlayerState, 1000);
  function getSavedState() {
    try { return JSON.parse(localStorage.getItem(PLAYER_STATE_KEY) || 'null'); } catch (e) { return null; }
  }
  function loadPlayerState() {
    const state = getSavedState();
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
      replayOnceEnabled = !!(state.replayOnceEnabled || (localStorage.getItem(REPLAY_ENABLED_KEY) === '1'));
      replayToken = state.replayToken || localStorage.getItem(REPLAY_TOKEN_KEY) || null;
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
    // Persist original order to allow restoring after shuffle off
    localStorage.setItem(ORIGINAL_QUEUE_KEY, JSON.stringify(originalQueue && originalQueue.length ? originalQueue : trackQueue));
  }
  function loadQueue() {
    trackQueue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    queueIndex = parseInt(localStorage.getItem(QUEUE_INDEX_KEY) || '0', 10);
    if (isNaN(queueIndex) || queueIndex < 0) queueIndex = 0;
    try { originalQueue = JSON.parse(localStorage.getItem(ORIGINAL_QUEUE_KEY) || '[]'); } catch (e) { originalQueue = []; }
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
    setNowPlaying(t);
    if (popupActive || ensurePopup(true)) {
      const ok = postToPopup({ cmd: 'playTrack', src: t.src, title: t.title, artist: t.artist, cover: t.cover, currentTime: 0, volume: volumeBar.value/100, autoplay: true });
      if (!ok) {
        // fallback to inline audio if cannot control popup
        audio.src = t.src;
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        saveQueue();
        savePlayerState();
        renderQueueUI();
        return;
      }
    } else {
      audio.src = t.src;
      // start from beginning always when starting playback via control
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
    saveQueue();
    savePlayerState();
    renderQueueUI();
    // keep shuffle button visual in-sync after any track change
    updateShuffleUI();
    // If the just-started track is the one-time replay duplicate, turn the toggle off
    try {
      const t = trackQueue[queueIndex];
      if (t && replayOnceEnabled && replayToken && t._replayToken === replayToken) {
        replayOnceEnabled = false;
        replayToken = null;
        updateRepeatUI();
      }
    } catch (e) {}
  }
  function playNext(auto = false) {
    if (!trackQueue.length) return;
    if (repeatMode === 'one' && auto) {
      // replay same
      playFromQueue(queueIndex);
      return;
    }
    // Always follow current queue order; shuffle affects queue order, not next-pick randomness
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
    // Always follow current queue order; shuffle affects queue order, not prev-pick randomness
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
    // If popup is active or can be opened via this gesture, control it
    if (popupActive || ensurePopup(true)) {
      if (!popupState.src && trackQueue[queueIndex]) {
        const t = trackQueue[queueIndex];
        const ok = postToPopup({ cmd: 'playTrack', src: t.src, title: t.title, artist: t.artist, cover: t.cover, currentTime: 0, volume: volumeBar.value/100, autoplay: true });
        if (ok) return; // handled by popup
      } else {
        const ok = postToPopup({ cmd: popupState.isPlaying ? 'pause' : 'play' });
        if (ok) return; // handled by popup
      }
      // if posting failed, fall through to local audio
    }
    if (!audio.src) {
      if (trackQueue[queueIndex]) { playFromQueue(queueIndex); return; }
      if (window.initialQueue && Array.isArray(window.initialQueue) && window.initialQueue.length > 0) {
        trackQueue = window.initialQueue.slice();
        queueIndex = 0;
        saveQueue();
        playFromQueue(0);
        return;
      }
      // last resort: restore from saved state
      try {
        const state = JSON.parse(localStorage.getItem('muzic2_player_state') || 'null');
        if (state && state.src) {
          audio.src = state.src;
          audio.currentTime = state.currentTime || 0;
          trackTitle.textContent = state.title || '';
          trackArtist.textContent = state.artist || '';
          cover.src = state.cover || cover.src;
          audio.play().catch(() => {});
        }
      } catch (e) {}
      return;
    }
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  };
  audio.addEventListener('play', () => {
    if (popupActive) return;
    isPlaying = true;
    updatePlayPauseUI();
    document.getElementById('track-status').textContent = '';
    savePlayerState();
  });
  audio.addEventListener('pause', () => {
    if (popupActive) return;
    isPlaying = false;
    updatePlayPauseUI();
    document.getElementById('track-status').textContent = '';
    savePlayerState();
  });
  audio.addEventListener('timeupdate', () => {
    if (popupActive) return;
    seekBar.value = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    currentTimeEl.textContent = formatTime(audio.currentTime);
    savePlayerStateThrottled();
  });
  audio.addEventListener('loadedmetadata', () => {
    if (popupActive) return;
    durationEl.textContent = formatTime(audio.duration);
  });
  audio.addEventListener('ended', () => {
    if (popupActive) return;
    playNext(true);
  });

  seekBar.oninput = () => {
    if (popupActive) {
      if (popupState.duration) {
        const t = (seekBar.value / 100) * popupState.duration;
        const ok = postToPopup({ cmd: 'seek', currentTime: t }, { retries: 3, delay: 100 });
        if (!ok) {
          // fallback to local if needed
          if (audio.duration) audio.currentTime = (seekBar.value / 100) * audio.duration;
        }
      }
      return;
    }
    if (audio.duration) {
      audio.currentTime = (seekBar.value / 100) * audio.duration;
    }
  };
  volumeBar.oninput = () => {
    if (popupActive) {
      const ok = postToPopup({ cmd: 'setVolume', volume: volumeBar.value / 100 }, { retries: 3, delay: 100 });
      if (!ok) {
        // fallback to local update
        audio.volume = volumeBar.value / 100;
      }
    } else {
      audio.volume = volumeBar.value / 100;
    }
    savePlayerState();
  };
  shuffleBtn.onclick = () => {
    shuffleEnabled = !shuffleEnabled;
    if (shuffleEnabled) {
      // Shuffle current queue but keep the current track first
      const current = trackQueue[queueIndex];
      if (!originalQueue || !originalQueue.length) originalQueue = trackQueue.slice();
      const rest = trackQueue.filter((_, idx) => idx !== queueIndex);
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = rest[i]; rest[i] = rest[j]; rest[j] = tmp;
      }
      trackQueue = [current, ...rest];
      queueIndex = 0;
      saveQueue();
      renderQueueUI();
    } else {
      // Restore original album/order and keep current track position
      if (originalQueue && originalQueue.length) {
        const current = trackQueue[queueIndex];
        trackQueue = originalQueue.slice();
        const idx = current ? trackQueue.findIndex(t => t && current && t.src === current.src) : -1;
        queueIndex = idx >= 0 ? idx : 0;
        saveQueue();
        renderQueueUI();
      }
    }
    updateShuffleUI();
    savePlayerState();
  };
  repeatBtn.onclick = () => {
    // Toggle one-time replay of the current track
    if (!trackQueue.length) return;
    if (!replayOnceEnabled) {
      // Enable: insert a duplicate of current track right after it
      const current = trackQueue[queueIndex];
      if (!current) return;
      // Remove existing pending duplicate if any
      if (replayToken) {
        const idx = trackQueue.findIndex(x => x && x._replayToken === replayToken);
        if (idx >= 0 && idx !== queueIndex) trackQueue.splice(idx, 1);
      }
      const next = trackQueue[queueIndex + 1];
      if (next && next.src === current.src) {
        // Reuse next as the duplicate and tag it instead of adding a new one
        replayToken = 'replay_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        trackQueue[queueIndex + 1] = { ...next, _replayToken: replayToken };
      } else {
        replayToken = 'replay_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        const dup = { ...current, _replayToken: replayToken };
        trackQueue.splice(queueIndex + 1, 0, dup);
      }
      replayOnceEnabled = true;
      saveQueue();
      renderQueueUI();
    } else {
      // Disable: remove the pending duplicate from the queue
      if (replayToken) {
        const idx = trackQueue.findIndex(x => x && x._replayToken === replayToken);
        if (idx >= 0) {
          // Adjust queueIndex if needed
          if (idx < queueIndex) queueIndex = Math.max(0, queueIndex - 1);
          trackQueue.splice(idx, 1);
          saveQueue();
          renderQueueUI();
        }
      }
      // Also handle immediate-next duplicate without token
      if (!replayToken) {
        const cur = trackQueue[queueIndex];
        const next = trackQueue[queueIndex + 1];
        if (cur && next && cur.src === next.src) {
          trackQueue.splice(queueIndex + 1, 1);
          saveQueue();
          renderQueueUI();
        }
      }
      replayOnceEnabled = false;
      replayToken = null;
    }
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
  // Ensure state persists on back/forward with bfcache
  window.addEventListener('pagehide', savePlayerState);
  window.addEventListener('pageshow', () => {
    // Re-apply state if needed
    const s = getSavedState();
    if (!s || !s.src) return;
    // Restore queue and settings to avoid losing album order after back/forward
    try {
      loadQueue();
      if (typeof s.queueIndex === 'number') {
        queueIndex = s.queueIndex;
      }
      if (typeof s.shuffle !== 'undefined') {
        shuffleEnabled = !!s.shuffle;
        updateShuffleUI();
      }
      // Restore one-time replay state and reconcile duplicate
      replayOnceEnabled = !!(s.replayOnceEnabled || (localStorage.getItem(REPLAY_ENABLED_KEY) === '1'));
      replayToken = s.replayToken || localStorage.getItem(REPLAY_TOKEN_KEY) || null;
      if (replayOnceEnabled) {
        let dupIdx = -1;
        if (replayToken) dupIdx = trackQueue.findIndex(x => x && x._replayToken === replayToken);
        if (dupIdx === -1) {
          const cur = trackQueue[queueIndex];
          const next = trackQueue[queueIndex + 1];
          if (cur && next && cur.src === next.src) {
            replayToken = replayToken || ('replay_' + Date.now());
            trackQueue[queueIndex + 1] = { ...next, _replayToken: replayToken };
            saveQueue();
          } else {
            // no duplicate present anymore; keep toggle off to avoid re-adding
            replayOnceEnabled = false;
            replayToken = null;
          }
        }
      }
      updateRepeatUI();
      renderQueueUI();
    } catch (e) {}
    // If current audio source differs from saved one, switch to the saved, most recent track
    const currentSrc = audio.currentSrc || audio.src || '';
    if (!currentSrc || currentSrc !== s.src) {
      audio.src = s.src;
      trackTitle.textContent = s.title || '';
      trackArtist.textContent = s.artist || '';
      cover.src = s.cover || cover.src;
      audio.volume = s.volume !== undefined ? s.volume : audio.volume;
    }
    if (s.currentTime != null) {
      const t = Number(s.currentTime) || 0;
      // Wait for metadata to apply time accurately
      const restore = () => { audio.currentTime = t; updatePlayPauseUI(); };
      if (isNaN(audio.duration) || !isFinite(audio.duration)) {
        audio.addEventListener('loadedmetadata', function once(){ audio.removeEventListener('loadedmetadata', once); restore(); });
      } else { restore(); }
    }
    if (s.isPlaying && audio.paused) {
      audio.play().catch(()=>{});
    }
  });

  // Public API for other pages
  window.playTrack = function ({ src, title, artist, cover: coverUrl, queue = null, queueStartIndex = 0, duration = 0 }) {
    function normalizeSrc(u){
      if (!u) return '';
      if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) return u;
      if (u.startsWith('/')) return u;
      const i = u.indexOf('tracks/');
      if (i !== -1) return '/muzic2/' + u.slice(i);
      return '/muzic2/' + u.replace(/^\/+/, '');
    }
    function normalizeCover(u){
      if (!u) return '';
      if (u.startsWith('http') || u.startsWith('data:') || u.startsWith('/')) return u;
      const i = u.indexOf('tracks/');
      if (i !== -1) return '/muzic2/' + u.slice(i);
      return '/muzic2/' + u.replace(/^\/+/, '');
    }
    if (queue && Array.isArray(queue) && queue.length > 0) {
      // Ensure ordered playback when album queue starts
      shuffleEnabled = false;
      updateShuffleUI();
      trackQueue = queue.map(q => ({
        src: normalizeSrc(q.src || q.file_path || q.url || ''),
        title: q.title || '',
        artist: q.artist || '',
        cover: normalizeCover(q.cover || coverUrl || ''),
        duration: q.duration || 0
      }));
      originalQueue = trackQueue.slice();
      queueIndex = Math.max(0, Math.min(queueStartIndex, trackQueue.length - 1));
      saveQueue();
      playFromQueue(queueIndex);
      toggleQueuePanel(true);
    } else {
      // Single track
      trackQueue = [{ src: normalizeSrc(src), title, artist, cover: normalizeCover(coverUrl || ''), duration }];
      originalQueue = trackQueue.slice();
      queueIndex = 0;
      saveQueue();
      playFromQueue(0);
    }
  };

  // Backward compatibility for artist.js which may call loadTrack(track)
  window.loadTrack = function (track) {
    function normalizeSrc(u){
      if (!u) return '';
      if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) return u;
      if (u.startsWith('/')) return u;
      const i = u.indexOf('tracks/');
      if (i !== -1) return '/muzic2/' + u.slice(i);
      return '/muzic2/' + u.replace(/^\/+/, '');
    }
    function normalizeCover(u){
      if (!u) return '';
      if (u.startsWith('http') || u.startsWith('data:') || u.startsWith('/')) return u;
      const i = u.indexOf('tracks/');
      if (i !== -1) return '/muzic2/' + u.slice(i);
      return '/muzic2/' + u.replace(/^\/+/, '');
    }
    const t = {
      src: normalizeSrc(track.src || track.file_path || ''),
      title: track.title || '',
      artist: track.artist || '',
      cover: normalizeCover(track.cover || ''),
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
  // Ensure UI reflects current state after initial render
  setTimeout(updateShuffleUI, 0);
  // Sync UI with popup if already open
  if (popupActive && popupWin) {
    postToPopup({ cmd: 'play' }, { retries: 3, delay: 150 });
  }
})();
