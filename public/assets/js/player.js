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
      /* Lyrics */
      #lyrics-container { display: none; position: fixed; left: 50%; transform: translateX(-50%); bottom: 76px; width: min(820px, 92vw); max-height: 42vh; overflow: hidden; padding: 18px 14px; background: rgba(0,0,0,0.7); backdrop-filter: blur(6px); border: 1px solid #242424; border-radius: 14px; box-shadow: 0 12px 30px rgba(0,0,0,.55); z-index: 9500; }
      #lyrics-list { display: flex; flex-direction: column; align-items: center; gap: 8px; transition: transform .35s ease; will-change: transform; }
      #lyrics-container .lyric-line { color: #b3b3b3; opacity: .35; text-align: center; font-size: 1.1rem; line-height: 1.6; }
      #lyrics-container .lyric-line.active { opacity: 1; color: #fff; font-weight: 700; font-size: 1.6rem; }

      /* Fullscreen karaoke (Yandex-style) */
      #lyrics-fs { position: fixed; top: 0; left: 0; right: 0; bottom: 110px; background: #0f0f0f; display: none; z-index: 9000; }
      #lyrics-fs-underlay { position: fixed; inset: 0; z-index: 0; display: none; overflow: hidden; pointer-events: none; }
      #lyrics-fs-underlay img, #lyrics-fs-underlay video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: blur(16px) brightness(0.45) saturate(1.05); transform: scale(1.06); }
      #lyrics-fs-underlay video { opacity: 0.85; }
      #lyrics-fs-bg { position: absolute; inset: 0; overflow: hidden; z-index: 0; }
      #lyrics-fs-bg img, #lyrics-fs-bg video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: blur(16px) brightness(0.45) saturate(1.05); transform: scale(1.06); }
      #lyrics-fs-bg video { opacity: 0.85; }
      #lyrics-fs-close { position: absolute; top: 20px; right: 24px; width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.08); color: #fff; border: 1px solid #2a2a2a; cursor: pointer; font-size: 24px; line-height: 44px; text-align: center; }
      #lyrics-fs-mode { position: absolute; top: 20px; right: 78px; width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.08); color: #fff; border: 1px solid #2a2a2a; cursor: pointer; font-size: 18px; line-height: 44px; text-align: center; }
      #lyrics-fs-grid { position: absolute; inset: 0; display: grid; grid-template-columns: 520px 1fr; gap: 48px; align-items: center; padding: 80px 72px 120px; z-index: 1; }
      #lyrics-fs-meta { display: flex; flex-direction: column; gap: 18px; justify-content: center; }
      #lyrics-fs-cover { width: 260px; height: 260px; border-radius: 18px; object-fit: cover; background: #111; box-shadow: 0 24px 70px rgba(0,0,0,.55); }
      #lyrics-fs-video-wrap { width: 100%; max-width: 100%; aspect-ratio: 16/9; background:#000; border-radius:18px; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,.45); display:none; }
      #lyrics-fs-video-embed { width:100%; height:100%; display:none; background:#000; }
      #lyrics-fs-video-embed::-webkit-media-controls { display: none !important; }
      #lyrics-fs-video-cover { width:100%; height:100%; object-fit:cover; display:none; background:#000; }
      #lyrics-fs-title { color: #fff; font-size: 30px; font-weight: 800; }
      #lyrics-fs-artist { color: #bdbdbd; font-size: 18px; }
      #lyrics-fs-panel { position: relative; width: 100%; margin: 0 auto; overflow: hidden; }
      #lyrics-fs-inner { position: relative; height: calc(100vh - 80px - 120px); max-height: 70vh; display: block; overflow: auto; scroll-behavior: smooth; }
      #lyrics-fs.static #lyrics-fs-inner { overflow: auto; align-items: flex-start; justify-content: center; }
      #lyrics-fs.static #lyrics-fs-list { transform: none !important; padding: 24px 16px 24px; }
      #lyrics-fs.static .lyric-line { opacity: .6; }
      #lyrics-fs.static .lyric-line.active { opacity: 1; }
      #lyrics-fs-list { display: flex; flex-direction: column; align-items: center; gap: 20px; transition: transform .45s ease; will-change: transform; padding: 0 16px; }
      #lyrics-fs-inner .lyric-line { color: #7e7e7e; opacity: .26; text-align: center; font-weight: 700; letter-spacing: 0.1px; font-size: clamp(18px, 2.1vw, 28px); line-height: 1.6; max-width: 980px; transition: opacity .35s ease, color .35s ease; }
      #lyrics-fs-inner .lyric-line.active { opacity: 1; color: #ffffff; font-weight: 800; font-size: clamp(24px, 3.2vw, 48px); text-shadow: 0 2px 18px rgba(0,0,0,0.4); }
      .lyrics-fs-fade { display: none; }
      @media (max-width: 960px) {
        #lyrics-fs-grid { grid-template-columns: 1fr; gap: 16px; padding: 72px 20px 110px; }
        #lyrics-fs-meta { align-items: center; text-align: center; }
        #lyrics-fs-cover { width: 160px; height: 160px; }
        #lyrics-fs-inner .lyric-line.active { font-size: clamp(26px, 6vw, 44px); }
      }
      #like-btn { background: transparent; border: none; color: #bbb; cursor: pointer; padding: 6px; border-radius: 50%; pointer-events: auto; }
      #like-btn.btn-active { color: #1ed760; }
      .volume-bar { width: 120px; }
      .btn-active { color: #1ed760; }
      /* Queue panel */
      #queue-panel { position: fixed; right: 12px; bottom: 76px; width: 360px; max-height: 55vh; overflow: auto; background: #0f0f0f; color: #fff; border: 1px solid #242424; border-radius: 12px; box-shadow: 0 12px 30px rgba(0,0,0,.5); display: none; z-index: 10000; }
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

      /* Fullscreen mode */
      #fullscreen-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: #000; z-index: 9999; display: none; }
      #fullscreen-content { position: absolute; top: 0; left: 0; width: 100%; height: calc(100vh - 100px); display: flex; flex-direction: column; align-items: center; justify-content: center; }
      #fullscreen-cover { max-width: 50vh; max-height: 50vh; width: auto; height: auto; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.8); }
      #fullscreen-video { max-width: 100vw; max-height: calc(100vh - 100px); width: auto; height: auto; }
      #fullscreen-info { position: absolute; bottom: 60px; left: 50%; transform: translateX(-50%); text-align: center; color: #fff; }
      #fullscreen-title { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.3rem; }
      #fullscreen-artist { font-size: 1rem; color: #b3b3b3; }
      .exp-badge{ display:inline-block; width:16px; height:16px; line-height:16px; text-align:center; margin:0 6px 0 0; border:0; border-radius:3px; font-size:10px; font-weight:800; color:#2b2b2b; background:#cfcfcf; vertical-align:middle }
      #fullscreen-close { position: absolute; top: 20px; right: 20px; background: rgba(0,0,0,0.5); border: none; color: #fff; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
      #fullscreen-back { position: absolute; top: 20px; left: 20px; background: rgba(0,0,0,0.5); border: none; color: #fff; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }

      /* Responsive player layout */
      @media (max-width: 900px) {
        #player { grid-template-columns: 1fr; row-gap: 8px; padding: 8px; }
        .player-left { justify-content: center; }
        .player-right { justify-content: center; }
        .player-progress { grid-template-columns: auto 1fr auto; gap: 8px; }
      }
      @media (max-width: 600px) {
        .cover { width: 44px; height: 44px; }
        .volume-bar { width: 80px; }
        .player-controls { gap: 8px; }
        #current-time, #duration { font-size: 0.85rem; }
      }
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
          <button id="lyrics-btn" title="Текст (караоке)">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h9"/><path d="M17 3h4v4"/><path d="M21 3l-7 7"/></svg>
          </button>
        </div>
        <div class="player-progress">
          <span id="current-time">0:00</span>
          <input type="range" id="seek-bar" min="0" max="100" value="0">
          <span id="duration">0:00</span>
        </div>
        <div id="lyrics-container"></div>
      </div>
      <div class="player-right">
        <button id="like-btn" type="button" title="В избранное">❤</button>
        <button id="queue-btn" title="Очередь">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="17" y2="18"/><polyline points="19 16 21 18 19 20"/></svg>
        </button>
        <button id="video-btn" title="Видео">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" ry="2"/><polygon points="10 9 15 12 10 15 10 9"/></svg>
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
    <div id="fullscreen-overlay">
      <div id="fullscreen-content">
        <img id="fullscreen-cover" src="" alt="cover" style="display: none;">
        <video id="fullscreen-video" style="display: none;" controls></video>
        <div id="fullscreen-info">
          <div id="fullscreen-title"></div>
          <div id="fullscreen-artist"></div>
        </div>
        <button id="fullscreen-back">←</button>
        <button id="fullscreen-close">×</button>
      </div>
    </div>
    <div id="lyrics-fs-underlay"><img id="lyrics-fs-underlay-img" alt="bg" style="display:none;"><video id="lyrics-fs-underlay-video" playsinline muted loop style="display:none;"></video></div>
    <div id="lyrics-fs">
      <div id="lyrics-fs-bg"><img id="lyrics-fs-bg-img" alt="bg" style="display:none;"><video id="lyrics-fs-bg-video" playsinline muted loop style="display:none;"></video></div>
      <button id="lyrics-fs-close" title="Закрыть">×</button>
      <button id="lyrics-fs-mode" title="Показать весь текст">≡</button>
      <div id="lyrics-fs-grid">
        <div id="lyrics-fs-meta">
          <img id="lyrics-fs-cover" src="" alt="cover" />
          <div id="lyrics-fs-video-wrap">
          <video id="lyrics-fs-video-embed" playsinline></video>
            <img id="lyrics-fs-video-cover" alt="cover" />
          </div>
          <div id="lyrics-fs-title"></div>
          <div id="lyrics-fs-artist"></div>
        </div>
        <div id="lyrics-fs-panel">
          <div class="lyrics-fs-fade top"></div>
          <div id="lyrics-fs-inner"><div id="lyrics-fs-list"></div><div id="lyrics-fs-dots"><span class="lyrics-dot"></span><span class="lyrics-dot"></span><span class="lyrics-dot"></span><span class="lyrics-dot"></span></div></div>
          <div class="lyrics-fs-fade bottom"></div>
        </div>
      </div>
    </div>
    <div id="queue-panel">
      <div id="queue-header">
        <span id="queue-title">Очередь воспроизведения</span>
        <button id="queue-close">Закрыть</button>
      </div>
      <ul id="queue-list"></ul>
    </div>
      <div id="video-panel" style="display:none; position: fixed; right: 12px; bottom: 76px; width: 420px; max-height: 55vh; background: #000; color: #fff; border: 1px solid #242424; border-radius: 12px; box-shadow: 0 12px 30px rgba(0,0,0,.5); overflow: hidden;">
        <button id="video-close" title="Закрыть" style="position:absolute; top:8px; right:8px; width:28px; height:28px; border:none; border-radius:50%; background:#2a2a2a; color:#b3b3b3; cursor:pointer; display:grid; place-items:center; z-index:2;">×</button>
        <div style="margin:0; padding:0;">
          <video id="inline-video" style="display:none; width:100%; height:auto; max-height:55vh; background:#000;" controls playsinline></video>
          <img id="inline-cover" alt="cover" style="display:none; width:100%; height:auto; max-height:55vh; object-fit:cover; background:#000;" />
        </div>
      </div>
  `;
  
  // Global back button removed per design (caused overlap). Use SPA navigation instead.
  
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
  const lyricsBtn = playerContainer.querySelector('#lyrics-btn');
  const seekBar = playerContainer.querySelector('#seek-bar');
  const trackTitle = playerContainer.querySelector('#track-title');
  const trackArtist = playerContainer.querySelector('#track-artist');
  const currentTimeEl = playerContainer.querySelector('#current-time');
  const durationEl = playerContainer.querySelector('#duration');
  const cover = playerContainer.querySelector('#cover');
  const volumeBar = playerContainer.querySelector('#volume-bar');
  const volumeBtn = playerContainer.querySelector('#volume-btn');
  const fullscreenBtn = playerContainer.querySelector('#fullscreen-btn');
  const videoBtn = playerContainer.querySelector('#video-btn');
  const queueBtn = playerContainer.querySelector('#queue-btn');
  const likeBtn = playerContainer.querySelector('#like-btn');
  const queuePanel = playerRoot.querySelector('#queue-panel');
  const queueClose = playerRoot.querySelector('#queue-close');
  const queueList = playerRoot.querySelector('#queue-list');
  const videoPanel = playerRoot.querySelector('#video-panel');
  const videoClose = playerRoot.querySelector('#video-close');
  const inlineVideo = playerRoot.querySelector('#inline-video');
  const inlineCover = playerRoot.querySelector('#inline-cover');
  const fullscreenOverlay = playerRoot.querySelector('#fullscreen-overlay');
  const fullscreenCover = playerRoot.querySelector('#fullscreen-cover');
  const fullscreenVideo = playerRoot.querySelector('#fullscreen-video');
  const fullscreenTitle = playerRoot.querySelector('#fullscreen-title');
  const fullscreenArtist = playerRoot.querySelector('#fullscreen-artist');
  const fullscreenClose = playerRoot.querySelector('#fullscreen-close');
  const fullscreenBack = playerRoot.querySelector('#fullscreen-back');
  const lyricsContainer = playerContainer.querySelector('#lyrics-container');
  const lyricsFs = playerRoot.querySelector('#lyrics-fs');
  const lyricsFsUnderlay = playerRoot.querySelector('#lyrics-fs-underlay');
  const lyricsFsUnderlayImg = playerRoot.querySelector('#lyrics-fs-underlay-img');
  const lyricsFsUnderlayVideo = playerRoot.querySelector('#lyrics-fs-underlay-video');
  const lyricsFsBgImg = playerRoot.querySelector('#lyrics-fs-bg-img');
  const lyricsFsBgVideo = playerRoot.querySelector('#lyrics-fs-bg-video');
  const lyricsFsClose = playerRoot.querySelector('#lyrics-fs-close');
  const lyricsFsMode = playerRoot.querySelector('#lyrics-fs-mode');
  const lyricsFsInner = playerRoot.querySelector('#lyrics-fs-inner');
  const lyricsFsList = playerRoot.querySelector('#lyrics-fs-list');
  const lyricsFsCover = playerRoot.querySelector('#lyrics-fs-cover');
  const lyricsFsTitle = playerRoot.querySelector('#lyrics-fs-title');
  const lyricsFsArtist = playerRoot.querySelector('#lyrics-fs-artist');
  const lyricsFsDots = playerRoot.querySelector('#lyrics-fs-dots');
  const lyricsFsDotsArr = lyricsFsDots ? Array.from(lyricsFsDots.querySelectorAll('.lyrics-dot')) : [];
  const lyricsFsVideoWrap = playerRoot.querySelector('#lyrics-fs-video-wrap');
  const lyricsFsVideo = playerRoot.querySelector('#lyrics-fs-video-embed');
  const lyricsFsVideoCover = playerRoot.querySelector('#lyrics-fs-video-cover');

  // Lyrics state
  let lyricsLines = []; // [{time:number, text:string}]
  let lyricsVisible = false;
  let currentLyricsIndex = -1;
  let lastTrackTitle = '';
  let lastTrackArtist = '';
  let userScrolling = false;
  let scrollResumeTimer = null;
  let lyricsSyncLocked = false; // lock centering until first timestamp

  // Keep active line anchored at ~32% helper
  function scrollLyricsToAnchorForIndex(targetIndex) {
    if (!lyricsVisible || !lyricsFsInner || !lyricsFsList) return;
    const fsLines = lyricsFsList.querySelectorAll('.lyric-line');
    const el = fsLines && fsLines[targetIndex] ? fsLines[targetIndex] : null;
    if (!el) return;
    const anchor = Math.round(lyricsFsInner.clientHeight * 0.32);
    const top = Math.max(0, el.offsetTop - anchor);
    try { lyricsFsInner.scrollTo({ top, behavior: 'smooth' }); } catch(_) {}
  }

  // Click-to-seek on lyrics lines (inline and fullscreen karaoke)
  function handleLyricClick(event) {
    const target = event.target && event.target.closest ? event.target.closest('.lyric-line') : null;
    if (!target) return;
    const timeAttr = target.getAttribute('data-time');
    const idxAttr = target.getAttribute('data-idx');
    const seekTime = parseFloat(timeAttr || '0');
    const targetIdx = parseInt(idxAttr || '-1', 10);
    if (!isFinite(seekTime) || seekTime < 0) return;

    let usedVideo = false;
    // If karaoke video is shown, seek video; otherwise seek audio
    if (lyricsFsVideo && lyricsFsVideo.style.display === 'block' && !lyricsFsVideo.ended) {
      try { lyricsFsVideo.currentTime = seekTime; lyricsFsVideo.play().catch(()=>{}); usedVideo = true; } catch(_) {}
    }
    if (!usedVideo && typeof audio !== 'undefined' && audio) {
      try { audio.currentTime = seekTime; audio.play().catch(()=>{}); } catch(_) {}
    }

    // Reset active classes to avoid stale highlight, then re-evaluate and scroll to anchor
    try {
      const inlineActives = lyricsContainer ? lyricsContainer.querySelectorAll('.lyric-line.active') : [];
      inlineActives && inlineActives.forEach && inlineActives.forEach(el => el.classList.remove('active'));
      const fsActives = lyricsFsList ? lyricsFsList.querySelectorAll('.lyric-line.active') : [];
      fsActives && fsActives.forEach && fsActives.forEach(el => el.classList.remove('active'));
    } catch(_) {}
    try { currentLyricsIndex = -1; } catch(_) { currentLyricsIndex = -1; }
    try { updateLyricsHighlight(seekTime); } catch(_) {}
    if (lyricsVisible) {
      userScrolling = false;
      if (scrollResumeTimer) { try { clearTimeout(scrollResumeTimer); } catch(_) {} scrollResumeTimer = null; }
      try { scrollLyricsToAnchorForIndex(Math.max(0, isFinite(targetIdx) ? targetIdx : 0)); } catch(_) {}
    }
  }

  function parseLRC(lrcText) {
    const lines = [];
    if (!lrcText) return lines;
    const tagRe = /\[(\d{1,2})[:.](\d{2})(?:[.:](\d{1,2}))?\]/g; // supports mm:ss.xx and mm.ss.cc
    lrcText.split(/\r?\n/).forEach(raw => {
      if (!raw) return;
      const times = [];
      let m;
      while ((m = tagRe.exec(raw)) !== null) {
        const min = parseInt(m[1], 10) || 0;
        const sec = parseInt(m[2], 10) || 0;
        const cs = parseInt(m[3] || '0', 10) || 0;
        const t = min * 60 + sec + (cs / 100);
        times.push(t);
      }
      const text = raw.replace(tagRe, '').trim();
      if (times.length && text) {
        times.forEach(t => lines.push({ time: t, text }));
      }
    });
    return lines.sort((a,b)=>a.time-b.time);
  }

  async function loadLyricsForTrack(trackId) {
    try {
      if (!lyricsContainer) return;
      // Always query lyrics API; if id нет, отправляем title/artist
      let url = '';
      if (trackId) { url = '/muzic2/src/api/lyrics.php?track_id='+encodeURIComponent(trackId); }
      else {
        const params = new URLSearchParams();
        if (lastTrackTitle) params.set('title', lastTrackTitle);
        if (lastTrackArtist) params.set('artist', lastTrackArtist);
        url = '/muzic2/src/api/lyrics.php?'+params.toString();
      }
      lyricsContainer.innerHTML = '<div class="lyric-line">Загрузка…</div>';
      const res = await fetch(url);
      if (!res.ok) { lyricsLines = []; renderLyrics(); return; }
      let data = null; try { data = await res.json(); } catch(e){ data = null; }
      const lrcText = data && typeof data.lrc === 'string' ? data.lrc : '';
      lyricsLines = parseLRC(lrcText);
      // If no [mm:ss.xx] tags, approximate timings line-by-line
      if (!lyricsLines.length && lrcText.trim()) {
        const rawLines = lrcText.split(/\r?\n/).filter(s=>s.trim()!=='');
        if (rawLines.length > 0) {
          const total = (isFinite(audio && audio.duration) && audio.duration>0) ? audio.duration : (rawLines.length * 3);
          const step = Math.max(1, total / (rawLines.length + 1));
          lyricsLines = rawLines.map((txt, i) => ({ time: (i+1)*step, text: txt }));
        } else {
          lyricsLines = [{ time: 0, text: lrcText }];
        }
      }
      renderLyrics();
    } catch(e) {
      lyricsLines = [];
      renderLyrics();
    }
  }

  async function fetchAndRenderLyricsDirect() {
    try {
      if (!lyricsContainer) return;
      lyricsContainer.innerHTML = '<div class="lyric-line">Загрузка…</div>';
      // Try title+artist first
      const params = new URLSearchParams();
      if (lastTrackTitle) params.set('title', lastTrackTitle);
      if (lastTrackArtist) params.set('artist', lastTrackArtist);
      let res = await fetch('/muzic2/src/api/lyrics.php?' + params.toString());
      let data = null; try { data = await res.json(); } catch(_) { data = null; }
      let lrcText = data && typeof data.lrc === 'string' ? data.lrc : '';
      if (!lrcText && currentTrackId) {
        // fallback to id
        res = await fetch('/muzic2/src/api/lyrics.php?track_id=' + encodeURIComponent(currentTrackId));
        try { data = await res.json(); } catch(_) { data = null; }
        lrcText = data && typeof data.lrc === 'string' ? data.lrc : '';
      }
      lyricsLines = parseLRC(lrcText);
      if (!lyricsLines.length && lrcText.trim()) {
        lyricsLines = [{ time: 0, text: lrcText }];
      }
      renderLyrics();
      updateLyricsHighlight(audio.currentTime || 0);
    } catch(_) {
      lyricsContainer.innerHTML = '<div class="lyric-line">Нет текста</div>';
    }
  }

  function renderLyrics() {
    if (!lyricsContainer) return;
    if (!lyricsLines.length) { lyricsContainer.innerHTML = '<div id="lyrics-list"><div class="lyric-line">Нет текста</div></div>'; if (lyricsFsList) lyricsFsList.innerHTML = '<div class="lyric-line">Нет текста</div>'; return; }
    const listHtml = lyricsLines.map((l, i) => `<div class=\"lyric-line\" data-idx=\"${i}\" data-time=\"${l.time}\">${escapeHtml(l.text||'')}</div>`).join('');
    lyricsContainer.innerHTML = `<div id="lyrics-list">${listHtml}</div>`;
    if (lyricsFsList) {
      lyricsFsList.innerHTML = listHtml;
      try { lyricsFsList.style.transform = 'translateY(0)'; } catch(_) {}
    }
    // Bind click handlers (event delegation) once per render
    try {
      const inlineList = lyricsContainer.querySelector('#lyrics-list');
      if (inlineList) {
        inlineList.removeEventListener('click', handleLyricClick);
        inlineList.addEventListener('click', handleLyricClick);
      }
    } catch(_) {}
    try {
      if (lyricsFsInner) {
        lyricsFsInner.removeEventListener('click', handleLyricClick);
        lyricsFsInner.addEventListener('click', handleLyricClick);
      }
    } catch(_) {}
    currentLyricsIndex = -1;
    // Center from the start
    const list = lyricsContainer.querySelector('#lyrics-list');
    if (list) list.style.transform = 'translateY(0)';
    // No forced highlight; render neutral until timeupdate
    if (lyricsFsList && lyricsFsInner) {
      try {
        // do nothing; let timeupdate add .active when time reaches first tag
        currentLyricsIndex = -1; // позволим timeupdate выбрать корректный индекс
        // Show preroll dots initially if there is a gap before first line
        if (lyricsFsDots) {
          // remove dots feature per user request
          lyricsFsDots.style.display = 'none';
          lyricsFsDotsArr && lyricsFsDotsArr.forEach(d => d.classList.remove('on'));
        }
        // Position first line at ~32% from top by padding the list; keep scrollTop at 0
        const anchor = Math.round((lyricsFsInner.clientHeight) * 0.32);
        lyricsFsList.style.paddingTop = anchor + 'px';
        try { lyricsFsInner.scrollTop = 0; } catch(_) {}
      } catch(_) {}
    }
  }

  function updateLyricsHighlight(currentSec) {
    if (!lyricsVisible || !lyricsLines.length) return;
    // Recompute from scratch so seeking backward/forward updates correctly
    let idx = -1;
    const linesRef = lyricsLines;
    // Linear scan is fine for typical lyric counts; replace with binary search if needed
    while ((idx + 1) < linesRef.length && linesRef[idx + 1].time <= currentSec + 0.05) idx++;
    // Do not force first line until timestamp; idx stays -1 before first tag

    // Dots removed
    if (idx !== currentLyricsIndex) {
      const prev = currentLyricsIndex;
      currentLyricsIndex = idx;
      const list = lyricsContainer.querySelector('#lyrics-list');
      const lines = lyricsContainer.querySelectorAll('.lyric-line');
      const fsLines = lyricsFsList ? lyricsFsList.querySelectorAll('.lyric-line') : [];
      if (lines.length) {
        if (prev >= 0 && lines[prev]) lines[prev].classList.remove('active');
        if (idx >= 0 && lines[idx]) requestAnimationFrame(()=>lines[idx].classList.add('active'));
        const active = lines[idx];
        if (!lyricsSyncLocked && active && typeof active.offsetTop === 'number' && list) {
          const containerH = lyricsContainer.clientHeight || 0;
          const target = (containerH / 2) - (active.offsetTop + active.clientHeight / 2);
          list.style.transform = `translateY(${Math.round(target)}px)`;
        }
      }
      if (fsLines && fsLines.length) {
        if (prev >= 0 && fsLines[prev]) fsLines[prev].classList.remove('active');
        if (idx >= 0 && fsLines[idx]) requestAnimationFrame(()=>fsLines[idx].classList.add('active'));
        const fsActive = fsLines[idx];
        // Auto-scroll container to keep active line at ~32% from top if user isn't scrolling
        if (lyricsFsInner && fsActive && !userScrolling) {
          const anchor = Math.round((lyricsFsInner.clientHeight) * 0.32);
          const targetTop = fsActive.offsetTop - anchor;
          lyricsFsInner.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
        }
      }
    }
  }

  // Pause auto-scroll when user scrolls; resume after inactivity
  if (lyricsFsInner) {
    const pauseMs = 1800;
    const onUserScroll = () => {
      userScrolling = true;
      if (scrollResumeTimer) clearTimeout(scrollResumeTimer);
      scrollResumeTimer = setTimeout(() => { userScrolling = false; }, pauseMs);
    };
    lyricsFsInner.addEventListener('wheel', onUserScroll, { passive: true });
    lyricsFsInner.addEventListener('touchmove', onUserScroll, { passive: true });
    lyricsFsInner.addEventListener('scroll', onUserScroll, { passive: true });
  }

  // Ensure page content is not covered by the fixed player: add bottom padding dynamically
  function adjustContentPadding() {
    try {
      const h = playerContainer ? playerContainer.getBoundingClientRect().height : 0;
      const extra = 28; // small breathing room above player
      document.body.style.paddingBottom = (h + extra) + 'px';
    } catch (_) {}
  }
  adjustContentPadding();
  window.addEventListener('resize', adjustContentPadding);

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
  const VIDEO_STATE_KEY = 'muzic2_player_video_state';

  let isPlaying = false;
  let trackQueue = [];
  let queueIndex = 0;
  let shuffleEnabled = false;
  let repeatMode = 'none';
  // One-time replay toggle state
  let replayOnceEnabled = false;
  let replayToken = null;
  let isMuted = false;
  let previousVolume = 1;
  let isFullscreen = false;
  let originalQueue = [];
  let currentTrackId = null;
  let likedSet = new Set();
  let autoplayEnabled = true; // Always enabled by default

  // Helpers
  function formatTime(sec) {
    sec = Math.floor(sec || 0);
    return `${Math.floor(sec / 60)}:${('0' + (sec % 60)).slice(-2)}`;
  }
  
  // Load random tracks for autoplay
  async function loadRandomTracks(count = 20) {
    try {
      console.log('Loading random tracks for autoplay, count:', count);
      const response = await fetch(`/muzic2/public/src/api/random_tracks.php?limit=${count}`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success && data.tracks) {
        console.log('Loaded random tracks:', data.tracks.length);
        return data.tracks;
      } else {
        console.error('Failed to load random tracks:', data.error);
        return [];
      }
    } catch (error) {
      console.error('Error loading random tracks:', error);
      return [];
    }
  }
  function updatePlayPauseUI() {
    // Prefer inline video state if video panel is open
    let playing;
    if (videoPanel && videoPanel.style.display === 'block' && inlineVideo) {
      try { playing = !inlineVideo.paused && !inlineVideo.ended; } catch(_) { playing = !audio.paused; }
    } else {
      playing = popupActive ? !!popupState.isPlaying : !audio.paused;
    }
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
  

  // Likes helpers
  async function loadLikes() {
    try {
      const r = await fetch('/muzic2/src/api/likes.php', { credentials: 'include' });
      const j = await r.json();
      likedSet = new Set((j.tracks||[]).map(t=>t.id));
    } catch (e) { likedSet = new Set(); }
  }
  function updatePlayerLikeUI() {
    if (!likeBtn) return;
    const liked = currentTrackId && likedSet.has(currentTrackId);
    likeBtn.classList.toggle('btn-active', !!liked);
    likeBtn.title = liked ? 'Убрать из любимых' : 'В избранное';
  }
  document.addEventListener('likes:updated', (e) => {
    const d = e.detail || {}; const id = d.trackId; const liked = !!d.liked;
    if (!id) return;
    if (liked) likedSet.add(id); else likedSet.delete(id);
    if (currentTrackId === id) updatePlayerLikeUI();
  });
  async function loadLikes() {
    try {
      const r = await fetch('/muzic2/src/api/likes.php', { credentials: 'include' });
      const j = await r.json();
      likedSet = new Set((j.tracks||[]).map(t=>t.id));
    } catch (e) { likedSet = new Set(); }
  }
  function updatePlayerLikeUI() {
    if (!likeBtn) return;
    const liked = currentTrackId && likedSet.has(currentTrackId);
    likeBtn.classList.toggle('btn-active', !!liked);
    likeBtn.title = liked ? 'Убрать из любимых' : 'В избранное';
  }

  async function loadLikes() {
    try {
      const r = await fetch('/muzic2/src/api/likes.php', { credentials: 'include' });
      const j = await r.json();
      likedSet = new Set((j.tracks||[]).map(t=>t.id));
    } catch (e) { likedSet = new Set(); }
  }
  function updatePlayerLikeUI() {
    if (!likeBtn) return;
    const liked = currentTrackId && likedSet.has(currentTrackId);
    likeBtn.classList.toggle('btn-active', !!liked);
    likeBtn.title = liked ? 'Убрать из любимых' : 'В избранное';
  }

  function updateMuteUI() {
    if (!volumeBtn) return;
    if (isMuted) {
      volumeBtn.title = 'Включить звук';
      volumeBtn.classList.add('btn-active');
      volumeBtn.setAttribute('aria-pressed', 'true');
      volumeBtn.style.color = '#1ed760';
      // Change icon to muted speaker
      volumeBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
    } else {
      volumeBtn.title = 'Отключить звук';
      volumeBtn.classList.remove('btn-active');
      volumeBtn.setAttribute('aria-pressed', 'false');
      volumeBtn.style.color = '';
      // Change icon to normal speaker
      volumeBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
    }
  }

  function updateFullscreenUI() {
    if (!fullscreenBtn) return;
    if (isFullscreen) {
      fullscreenBtn.title = 'Выйти из полноэкранного режима';
      fullscreenBtn.classList.add('btn-active');
      fullscreenBtn.setAttribute('aria-pressed', 'true');
      fullscreenBtn.style.color = '#1ed760';
      // Change icon to exit fullscreen
      fullscreenBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>';
    } else {
      fullscreenBtn.title = 'Полноэкранный режим';
      fullscreenBtn.classList.remove('btn-active');
      fullscreenBtn.setAttribute('aria-pressed', 'false');
      fullscreenBtn.style.color = '';
      // Change icon to enter fullscreen
      fullscreenBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';
    }
  }

  function enterFullscreen() {
    if (!fullscreenOverlay || !trackQueue[queueIndex]) return;
    
    const currentTrack = trackQueue[queueIndex];
    isFullscreen = true;
    
    // Update fullscreen content
    fullscreenTitle.textContent = currentTrack.title || '';
    fullscreenArtist.textContent = currentTrack.artist || '';
    
    // Check if there's a video source (you can extend this logic)
    const hasVideo = currentTrack.video || false; // Add video property to tracks if needed
    
    if (hasVideo && currentTrack.video) {
      fullscreenVideo.src = currentTrack.video;
      fullscreenVideo.style.display = 'block';
      fullscreenCover.style.display = 'none';
      fullscreenVideo.play().catch(() => {});
      
      // Remove existing ended listener to avoid duplicates
      try {
        fullscreenVideo.removeEventListener('ended', handleFullscreenVideoEnded);
      } catch(_) {}
      
      // Add ended event listener for fullscreen video
      const handleFullscreenVideoEnded = () => {
        console.log('Fullscreen video ended, playing next track');
        playNext(true);
      };
      fullscreenVideo.addEventListener('ended', handleFullscreenVideoEnded);
    } else {
      fullscreenCover.src = currentTrack.cover || '';
      fullscreenCover.style.display = 'block';
      fullscreenVideo.style.display = 'none';
      fullscreenVideo.src = '';
    }
    
    // Move player to fullscreen overlay
    if (playerContainer && fullscreenOverlay) {
      fullscreenOverlay.appendChild(playerContainer);
      playerContainer.style.position = 'absolute';
      playerContainer.style.bottom = '0';
      playerContainer.style.left = '0';
      playerContainer.style.width = '100%';
      playerContainer.style.zIndex = '10000';
    }
    
    fullscreenOverlay.style.display = 'flex';
    updateFullscreenUI();
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }


  function exitFullscreen() {
    if (!fullscreenOverlay) return;
    
    isFullscreen = false;
    fullscreenOverlay.style.display = 'none';
    fullscreenVideo.pause();
    fullscreenVideo.src = '';
    
    // Move player back to original position
    if (playerContainer && playerRoot) {
      playerRoot.appendChild(playerContainer);
      playerContainer.style.position = '';
      playerContainer.style.bottom = '';
      playerContainer.style.left = '';
      playerContainer.style.width = '';
      playerContainer.style.zIndex = '';
    }
    
    updateFullscreenUI();
    
    // Restore body scroll
    document.body.style.overflow = '';
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
      replayToken,
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
      updateMuteUI();
      updateFullscreenUI();

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

  // Video state persistence
  function saveVideoState(state) {
    try {
      const toSave = {
        open: !!(state && state.open),
        url: state && state.url ? String(state.url) : (playerContainer.dataset && playerContainer.dataset.videoUrl) || '',
        currentTime: typeof state.currentTime === 'number' ? state.currentTime : (inlineVideo && !isNaN(inlineVideo.currentTime) ? inlineVideo.currentTime : (audio.currentTime||0)),
        playing: !!(state && state.playing)
      };
      localStorage.setItem(VIDEO_STATE_KEY, JSON.stringify(toSave));
    } catch(_) {}
  }
  function loadVideoState() {
    try { return JSON.parse(localStorage.getItem(VIDEO_STATE_KEY) || 'null'); } catch(_) { return null; }
  }
  function loadQueue() {
    const storedQueue = localStorage.getItem(QUEUE_KEY) || '[]';
    console.log('Loading queue from localStorage:', storedQueue);
    trackQueue = JSON.parse(storedQueue);
    queueIndex = parseInt(localStorage.getItem(QUEUE_INDEX_KEY) || '0', 10);
    if (isNaN(queueIndex) || queueIndex < 0) queueIndex = 0;
    try { originalQueue = JSON.parse(localStorage.getItem(ORIGINAL_QUEUE_KEY) || '[]'); } catch (e) { originalQueue = []; }
    console.log('Loaded queue length:', trackQueue.length);
    console.log('Loaded queue index:', queueIndex);
    if (trackQueue.length > 0) {
      console.log('First track in loaded queue:', trackQueue[0]);
    }
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
      const base = (t && typeof t.artist === 'string') ? t.artist.trim() : '';
      const feats = (t && typeof t.feats === 'string') ? t.feats.trim() : '';
      const combined = feats ? (base ? `${base}, ${feats}` : feats) : base;
      li.innerHTML = `
        <div class="queue-idx">${idx + 1}</div>
        <div>
          <div class="queue-title">${escapeHtml(t.title || '')}</div>
          <div class="queue-artist">${escapeHtml(combined)}</div>
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
    // Render E badge before artist name (consistent with cards)
    try {
      const base = (t && typeof t.artist === 'string') ? t.artist.trim() : '';
      const feats = (t && typeof t.feats === 'string') ? t.feats.trim() : '';
      const combinedArtist = feats ? (base ? `${base}, ${feats}` : feats) : base;
      trackArtist.innerHTML = (t.explicit ? '<span class="exp-badge" title="Нецензурная лексика">E</span>' : '') + escapeHtml(combinedArtist);
    } catch(_) { trackArtist.textContent = t.artist || ''; }
    if (cover) cover.src = t.cover || (cover.src || '');
    currentTrackId = t.id || null;
    lastTrackTitle = String(t.title||'');
    lastTrackArtist = String(t.artist||'');
    // Update karaoke meta immediately on track change when overlay is visible
    try {
      if (lyricsVisible) {
        if (lyricsFsCover) lyricsFsCover.src = t.cover || (cover && cover.src) || '';
        if (lyricsFsTitle) lyricsFsTitle.textContent = t.title || '';
        if (lyricsFsArtist) lyricsFsArtist.textContent = t.artist || '';
        // reset video cover in karaoke panel
        if (lyricsFsVideo && !t.video_url) {
          try { lyricsFsVideo.pause(); lyricsFsVideo.removeAttribute('src'); lyricsFsVideo.load(); } catch(_) {}
          if (lyricsFsVideoCover) lyricsFsVideoCover.src = t.cover || '';
        }
      }
    } catch(_) {}
    // Reset scroll pause and re-anchor to first line for new track
    userScrolling = false;
    if (scrollResumeTimer) { try { clearTimeout(scrollResumeTimer); } catch(_) {} scrollResumeTimer = null; }
    currentLyricsIndex = -1;
    // Reset karaoke on track change
    if (lyricsContainer) lyricsContainer.innerHTML = lyricsVisible ? '<div class="lyric-line">Загрузка…</div>' : '';
    currentLyricsIndex = -1;
    lyricsLines = [];
    if (lyricsVisible) {
      fetchAndRenderLyricsDirect();
      // Ensure initial anchor after render
      setTimeout(() => { scrollLyricsToAnchorForIndex(0); }, 50);
    } else if (currentTrackId) {
      // Preload silently in background if hidden
      loadLyricsForTrack(currentTrackId);
    }
    // Attach video URL (if any) to current track
    playerContainer.dataset.videoUrl = t.video_url || '';
    try { console.debug('[player] setNowPlaying video_url =', t.video_url||''); } catch(_){ }
    updatePlayerLikeUI();
    // If video panel opened, refresh its media to reflect the new track
    try {
      if (videoPanel && videoPanel.style.display === 'block') {
        openInlineMedia(playerContainer.dataset.videoUrl || '', cover.src || '');
      }
    } catch (_) {}
  }

  // Toggle lyrics button
  if (lyricsBtn) lyricsBtn.onclick = () => {
    lyricsVisible = !lyricsVisible;
    const useFullscreen = true;
    if (useFullscreen) {
      if (lyricsFs) {
        lyricsFs.style.display = lyricsVisible ? 'block' : 'none';
      }
      // Ensure player pinned and visible above underlay
      try {
        if (playerContainer) {
          playerContainer.style.position = lyricsVisible ? 'fixed' : '';
          playerContainer.style.left = lyricsVisible ? '0' : '';
          playerContainer.style.right = lyricsVisible ? '0' : '';
          playerContainer.style.bottom = lyricsVisible ? '0' : '';
          playerContainer.style.zIndex = lyricsVisible ? '12000' : '';
        }
      } catch(_) {}
      // Show underlay background behind player too (fills gray corners) while karaoke open
      try {
        if (lyricsFsUnderlay) lyricsFsUnderlay.style.display = lyricsVisible ? 'block' : 'none';
        // sync the same background source
        const bgCover = (cover && cover.src) ? cover.src : '';
        if (lyricsFsUnderlayImg) { lyricsFsUnderlayImg.src = bgCover; lyricsFsUnderlayImg.style.display = bgCover ? 'block' : 'none'; }
        if (lyricsFsUnderlayVideo) {
          let bgVideoUrl = '';
          const ds = (playerContainer.dataset && typeof playerContainer.dataset.videoUrl !== 'undefined') ? playerContainer.dataset.videoUrl : '';
          bgVideoUrl = ds && ds.trim() !== '' ? ds : ((trackQueue[queueIndex] && trackQueue[queueIndex].video_url) ? trackQueue[queueIndex].video_url : '');
          if (bgVideoUrl && !/^https?:/i.test(bgVideoUrl) && bgVideoUrl.indexOf('/public/src/api/video.php?f=') === -1) {
            const i = bgVideoUrl.indexOf('tracks/');
            const rel = i !== -1 ? bgVideoUrl.slice(i) : bgVideoUrl.replace(/^\/+/, '');
            bgVideoUrl = '/muzic2/public/src/api/video.php?f=' + encodeURIComponent(rel);
          }
          if (bgVideoUrl) {
            lyricsFsUnderlayVideo.src = bgVideoUrl; lyricsFsUnderlayVideo.currentTime = 0; lyricsFsUnderlayVideo.play().catch(()=>{}); lyricsFsUnderlayVideo.style.display='block';
          } else {
            lyricsFsUnderlayVideo.pause(); lyricsFsUnderlayVideo.removeAttribute('src'); lyricsFsUnderlayVideo.load(); lyricsFsUnderlayVideo.style.display='none';
          }
        }
      } catch(_) {}
      if (lyricsContainer) lyricsContainer.style.display = 'none';
      // Keep player in place; overlay leaves bottom 120px free for it
      document.body.style.overflow = lyricsVisible ? 'hidden' : '';
      // Keep player visible above background (no gray gaps)
    } else {
      if (lyricsContainer) lyricsContainer.style.display = lyricsVisible ? 'block' : 'none';
    }
    if (lyricsVisible) {
      lyricsSyncLocked = true;
      // Fill meta like on the screenshot
      try {
        if (lyricsFsCover) lyricsFsCover.src = cover && cover.src ? cover.src : '';
        if (lyricsFsTitle) lyricsFsTitle.textContent = lastTrackTitle || '';
        if (lyricsFsArtist) lyricsFsArtist.textContent = lastTrackArtist || '';
        // Background: show video if available via karaoke slot, else cover
        const bgCover = (cover && cover.src) ? cover.src : '';
        if (lyricsFsBgImg) { lyricsFsBgImg.src = bgCover; lyricsFsBgImg.style.display = bgCover ? 'block' : 'none'; }
        if (lyricsFsBgVideo) {
          let bgVideoUrl = '';
          try {
            const ds = (playerContainer.dataset && typeof playerContainer.dataset.videoUrl !== 'undefined') ? playerContainer.dataset.videoUrl : '';
            bgVideoUrl = ds && ds.trim() !== '' ? ds : ((trackQueue[queueIndex] && trackQueue[queueIndex].video_url) ? trackQueue[queueIndex].video_url : '');
            if (bgVideoUrl && !/^https?:/i.test(bgVideoUrl) && bgVideoUrl.indexOf('/public/src/api/video.php?f=') === -1) {
              const i = bgVideoUrl.indexOf('tracks/');
              const rel = i !== -1 ? bgVideoUrl.slice(i) : bgVideoUrl.replace(/^\/+/, '');
              bgVideoUrl = '/muzic2/public/src/api/video.php?f=' + encodeURIComponent(rel);
            }
          } catch(_) {}
          if (bgVideoUrl) {
            try { lyricsFsBgVideo.src = bgVideoUrl; lyricsFsBgVideo.currentTime = 0; lyricsFsBgVideo.play().catch(()=>{}); lyricsFsBgVideo.style.display = 'block'; } catch(_) {}
          } else {
            try { lyricsFsBgVideo.pause(); lyricsFsBgVideo.removeAttribute('src'); lyricsFsBgVideo.load(); lyricsFsBgVideo.style.display = 'none'; } catch(_) {}
          }
        }
      } catch(_) {}
      fetchAndRenderLyricsDirect();
    }
    lyricsBtn.classList.toggle('btn-active', lyricsVisible);
  };

  const hideKaraoke = () => {
    lyricsVisible = false;
    if (lyricsFs) { lyricsFs.style.display = 'none'; }
    // Unpin player
    try {
      if (playerContainer) {
        playerContainer.style.position = '';
        playerContainer.style.left = '';
        playerContainer.style.right = '';
        playerContainer.style.bottom = '';
        playerContainer.style.zIndex = '';
      }
    } catch(_) {}
    try {
      if (lyricsFsUnderlay) lyricsFsUnderlay.style.display = 'none';
      if (lyricsFsUnderlayVideo) { lyricsFsUnderlayVideo.pause(); lyricsFsUnderlayVideo.removeAttribute('src'); lyricsFsUnderlayVideo.load(); lyricsFsUnderlayVideo.style.display='none'; }
    } catch(_) {}
    document.body.style.overflow = '';
    lyricsBtn && lyricsBtn.classList.remove('btn-active');
    lyricsSyncLocked = false;
    // Stop karaoke video if playing
    try { if (lyricsFsVideo) { lyricsFsVideo.pause(); lyricsFsVideo.removeAttribute('src'); lyricsFsVideo.load(); } } catch(_) {}
    try { if (lyricsFsVideoWrap) lyricsFsVideoWrap.style.display='none'; } catch(_) {}
    // Stop background video
    try { if (lyricsFsBgVideo) { lyricsFsBgVideo.pause(); lyricsFsBgVideo.removeAttribute('src'); lyricsFsBgVideo.load(); lyricsFsBgVideo.style.display='none'; } } catch(_) {}
    // Restore audio sound
    try { audio.muted = false; } catch(_) {}
    // Player remains visible during karaoke; nothing to restore
  };
  if (lyricsFsClose) lyricsFsClose.onclick = hideKaraoke;
  document.addEventListener('keydown', (e)=>{ if (lyricsVisible && e.key==='Escape') hideKaraoke(); });

  if (lyricsFsMode) {
    try { lyricsFsMode.style.display = 'none'; } catch(_) {}
    lyricsFsMode.onclick = () => {
    if (!lyricsFs) return;
    const isStatic = lyricsFs.classList.toggle('static');
    lyricsFsMode.title = isStatic ? 'Режим караоке (по строкам)' : 'Показать весь текст';
    };
  }

  // Update lyrics on timeupdate
  audio.addEventListener('timeupdate', () => {
    if (!lyricsVisible) return;
    // If karaoke video is playing in left slot, sync from it to keep scrolling
    let t = audio.currentTime || 0;
    try {
      if (lyricsFsVideo && lyricsFsVideoWrap && lyricsFsVideo.style.display === 'block' && !lyricsFsVideo.paused && !lyricsFsVideo.ended) {
        t = isNaN(lyricsFsVideo.currentTime) ? t : lyricsFsVideo.currentTime;
      }
    } catch(_) {}
    updateLyricsHighlight(t);
  });
  // Re-highlight on seek (user dragged to start or anywhere)
  audio.addEventListener('seeked', () => {
    if (!lyricsVisible) return;
    let t = audio.currentTime || 0;
    try {
      if (lyricsFsVideo && lyricsFsVideoWrap && lyricsFsVideo.style.display === 'block' && !lyricsFsVideo.paused && !lyricsFsVideo.ended) {
        t = isNaN(lyricsFsVideo.currentTime) ? t : lyricsFsVideo.currentTime;
      }
    } catch(_) {}
    // Reset current index so highlight recalculates cleanly and scroll to anchor
    try { currentLyricsIndex = -1; } catch(_) {}
    updateLyricsHighlight(t);
    if (lyricsVisible && typeof scrollLyricsToAnchorForIndex === 'function') {
      // Find nearest index to current time for centering
      let idx = 0;
      for (let i = 0; i < lyricsLines.length; i++) { if (lyricsLines[i].time <= t) idx = i; else break; }
      try { scrollLyricsToAnchorForIndex(idx); } catch(_) {}
    }
  });
  window.playFromQueue = function(idx) {
    console.log('playFromQueue called with index:', idx);
    console.log('trackQueue length:', trackQueue.length);
    console.log('Full trackQueue:', trackQueue);
    if (!trackQueue[idx]) {
      console.log('No track at index', idx);
      console.log('Available indices:', trackQueue.map((t, i) => i));
      return;
    }
    queueIndex = idx;
    const t = trackQueue[idx];
    console.log('Playing track:', t.title, 'from queue');
    console.log('Track src:', t.src);
    console.log('Track cover:', t.cover);
    console.log('Track object:', t);
    
    // Check if current track has video, if not and video panel is open, close it
    if (!t.video_url && videoPanel && videoPanel.style.display === 'block') {
      console.log('Current track has no video, closing video panel');
      // Close video panel and resume audio playback
      try { inlineVideo.pause(); } catch(_) {}
      inlineVideo.removeAttribute('src'); 
      inlineVideo.load();
      if (inlineCover) inlineCover.style.display = 'none';
      videoPanel.style.display = 'none';
      // Resume audio playback
      try { audio.play().catch(()=>{}); } catch(_) {}
      updatePlayPauseUI();
    }
    
    // ПРОВЕРЯЕМ: если src содержит URL страницы, заменяем на file_path
    if (t.src && t.src.includes('artist.html')) {
      console.log('WARNING: Track src contains URL page, replacing with file_path');
      t.src = t.file_path || '';
      console.log('Replaced src with file_path:', t.src);
    }
    
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
      console.log('Setting audio.src to:', t.src);
      audio.src = t.src;
      // start from beginning always when starting playback via control
      audio.currentTime = 0;
      console.log('Attempting to play audio...');
      audio.play().catch((error) => {
        console.error('Audio play failed:', error);
        console.error('Audio src:', audio.src);
        console.error('Audio readyState:', audio.readyState);
      });
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
  async function playNext(auto = false) {
    console.log('playNext called, auto:', auto, 'trackQueue length:', trackQueue.length, 'queueIndex:', queueIndex);
    console.log('repeatMode:', repeatMode);
    if (!trackQueue.length) {
      console.log('No tracks in queue, cannot play next');
      return;
    }
    if (repeatMode === 'one' && auto) {
      // replay same
      console.log('Replaying same track due to repeat mode');
      playFromQueue(queueIndex);
      return;
    }
    // Always follow current queue order; shuffle affects queue order, not next-pick randomness
    if (queueIndex + 1 < trackQueue.length) {
      console.log('Playing next track at index:', queueIndex + 1);
      console.log('Next track:', trackQueue[queueIndex + 1] ? trackQueue[queueIndex + 1].title : 'none');
      
      // Check if next track has video, if not and video panel is open, close it
      const nextTrack = trackQueue[queueIndex + 1];
      if (nextTrack && !nextTrack.video_url && videoPanel && videoPanel.style.display === 'block') {
        console.log('Next track has no video, closing video panel');
        // Close video panel and resume audio playback
        try { inlineVideo.pause(); } catch(_) {}
        inlineVideo.removeAttribute('src'); 
        inlineVideo.load();
        if (inlineCover) inlineCover.style.display = 'none';
        videoPanel.style.display = 'none';
        // Resume audio playback
        try { audio.play().catch(()=>{}); } catch(_) {}
        updatePlayPauseUI();
      }
      
      playFromQueue(queueIndex + 1);
    } else if (repeatMode === 'all') {
      console.log('Repeating from beginning');
      
      // Check if first track has video, if not and video panel is open, close it
      const firstTrack = trackQueue[0];
      if (firstTrack && !firstTrack.video_url && videoPanel && videoPanel.style.display === 'block') {
        console.log('First track has no video, closing video panel');
        // Close video panel and resume audio playback
        try { inlineVideo.pause(); } catch(_) {}
        inlineVideo.removeAttribute('src'); 
        inlineVideo.load();
        if (inlineCover) inlineCover.style.display = 'none';
        videoPanel.style.display = 'none';
        // Resume audio playback
        try { audio.play().catch(()=>{}); } catch(_) {}
        updatePlayPauseUI();
      }
      
      playFromQueue(0);
    } else {
      console.log('No more tracks in queue');
      // If autoplay is enabled, load random tracks
      if (autoplayEnabled) {
        console.log('Autoplay enabled, loading random tracks...');
        try {
          const randomTracks = await loadRandomTracks(20);
          if (randomTracks.length > 0) {
            console.log('Loaded random tracks for autoplay:', randomTracks.length);
            // Replace current queue with random tracks
            trackQueue = randomTracks;
            originalQueue = randomTracks.slice();
            queueIndex = 0;
            saveQueue();
            renderQueueUI();
            playFromQueue(0);
            return;
          }
        } catch (error) {
          console.error('Failed to load random tracks for autoplay:', error);
        }
      }
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
      const prevTrack = trackQueue[queueIndex - 1];
      // Check if previous track has video, if not and video panel is open, close it
      if (prevTrack && !prevTrack.video_url && videoPanel && videoPanel.style.display === 'block') {
        console.log('Previous track has no video, closing video panel');
        // Close video panel and resume audio playback
        try { inlineVideo.pause(); } catch(_) {}
        inlineVideo.removeAttribute('src'); 
        inlineVideo.load();
        if (inlineCover) inlineCover.style.display = 'none';
        videoPanel.style.display = 'none';
        // Resume audio playback
        try { audio.play().catch(()=>{}); } catch(_) {}
        updatePlayPauseUI();
      }
      playFromQueue(queueIndex - 1);
    } else if (repeatMode === 'all') {
      const lastTrack = trackQueue[trackQueue.length - 1];
      // Check if last track has video, if not and video panel is open, close it
      if (lastTrack && !lastTrack.video_url && videoPanel && videoPanel.style.display === 'block') {
        console.log('Last track has no video, closing video panel');
        // Close video panel and resume audio playback
        try { inlineVideo.pause(); } catch(_) {}
        inlineVideo.removeAttribute('src'); 
        inlineVideo.load();
        if (inlineCover) inlineCover.style.display = 'none';
        videoPanel.style.display = 'none';
        // Resume audio playback
        try { audio.play().catch(()=>{}); } catch(_) {}
        updatePlayPauseUI();
      }
      playFromQueue(trackQueue.length - 1);
    } else {
      audio.currentTime = 0;
    }
  }

  // Navigation functions
  async function playNext(auto = false) {
    if (!trackQueue.length) return;
    if (repeatMode === 'one' && auto) {
      playFromQueue(queueIndex);
      return;
    }
    
    if (queueIndex + 1 < trackQueue.length) {
      playFromQueue(queueIndex + 1);
    } else if (repeatMode === 'all') {
      playFromQueue(0);
    } else {
      if (autoplayEnabled) {
        try {
          const randomTracks = await loadRandomTracks(20);
          if (randomTracks.length > 0) {
            trackQueue = randomTracks;
            originalQueue = randomTracks.slice();
            queueIndex = 0;
            saveQueue();
            playFromQueue(0);
          }
        } catch (error) {
          console.error('Failed to load random tracks:', error);
        }
      }
    }
  }

  function playPrev() {
    if (!trackQueue.length) return;
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
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
    // If inline video is visible, control video instead of audio
    if (videoPanel && videoPanel.style.display === 'block' && inlineVideo) {
      const paused = inlineVideo.paused || inlineVideo.ended;
      if (paused) {
        try { inlineVideo.currentTime = isNaN(audio.currentTime) ? (inlineVideo.currentTime||0) : (audio.currentTime||0); } catch(_) {}
        inlineVideo.play().catch(()=>{});
        try { audio.pause(); } catch(_) {}
      } else {
        try { inlineVideo.pause(); } catch(_) {}
      }
      return;
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
    // If video panel is open, let video take over sound and sync time
    if (videoPanel && videoPanel.style.display === 'block' && inlineVideo) {
      try { inlineVideo.currentTime = isNaN(audio.currentTime) ? (inlineVideo.currentTime||0) : (audio.currentTime||0); } catch(_) {}
      try { inlineVideo.play().catch(()=>{}); } catch(_) {}
      try { audio.pause(); } catch(_) {}
    }
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
    // If video is playing, don't update progress bar - let video handle it
    if (videoPanel && videoPanel.style.display === 'block' && inlineVideo && !inlineVideo.ended) {
      return;
    }
    seekBar.value = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    currentTimeEl.textContent = formatTime(audio.currentTime);
    savePlayerStateThrottled();
  });
  audio.addEventListener('loadedmetadata', () => {
    if (popupActive) return;
    // If video is playing, don't update duration - let video handle it
    if (videoPanel && videoPanel.style.display === 'block' && inlineVideo && !inlineVideo.ended) {
      return;
    }
    durationEl.textContent = formatTime(audio.duration);
  });
  audio.addEventListener('ended', () => {
    console.log('Audio ended event triggered');
    if (popupActive) {
      console.log('Popup is active, skipping playNext');
      return;
    }
    // If video is playing, don't trigger playNext - let video handle it
    if (videoPanel && videoPanel.style.display === 'block' && inlineVideo && !inlineVideo.ended) {
      console.log('Video is still playing, not calling playNext yet');
      return;
    }
    // Keep karaoke anchor on the last active line before switching
    try { if (lyricsVisible && currentLyricsIndex >= 0) scrollLyricsToAnchorForIndex(currentLyricsIndex); } catch(_) {}
    console.log('Calling playNext(true)');
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
    // Sync inline video position when visible
    if (videoPanel && videoPanel.style.display === 'block' && inlineVideo && inlineVideo.duration) {
      try { inlineVideo.currentTime = (seekBar.value / 100) * inlineVideo.duration; } catch(_) {}
    }
  };
  volumeBar.oninput = () => {
    const newVolume = volumeBar.value / 100;
    if (popupActive) {
      const ok = postToPopup({ cmd: 'setVolume', volume: newVolume }, { retries: 3, delay: 100 });
      if (!ok) {
        // fallback to local update
        audio.volume = newVolume;
      }
    } else {
      audio.volume = newVolume;
    }
    // If user manually changes volume, unmute
    if (isMuted && newVolume > 0) {
      isMuted = false;
      updateMuteUI();
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
    
    // Update fullscreen content if in fullscreen mode
    if (isFullscreen && fullscreenOverlay) {
      const currentTrack = trackQueue[queueIndex];
      if (currentTrack) {
        fullscreenTitle.textContent = currentTrack.title || '';
        fullscreenArtist.textContent = currentTrack.artist || '';
        
        const hasVideo = currentTrack.video || false;
        if (hasVideo && currentTrack.video) {
          fullscreenVideo.src = currentTrack.video;
          fullscreenVideo.style.display = 'block';
          fullscreenCover.style.display = 'none';
          fullscreenVideo.play().catch(() => {});
        } else {
          fullscreenCover.src = currentTrack.cover || '';
          fullscreenCover.style.display = 'block';
          fullscreenVideo.style.display = 'none';
          fullscreenVideo.src = '';
        }
      }
    }
    
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

  // Helper: open inline media panel with robust fallback from video to cover
  function openInlineMedia(url, coverSrc) {
    if (!videoPanel) return;
    videoPanel.style.display = 'block';
    // Reset states
    try { inlineVideo.pause(); } catch(_) {}
    // Reset sources
    try { while (inlineVideo.firstChild) inlineVideo.removeChild(inlineVideo.firstChild); } catch(_){ }
    inlineVideo.removeAttribute('src');
    inlineVideo.load();
    inlineVideo.style.display = 'none';
    if (inlineCover) { inlineCover.style.display = 'none'; }

    // If no URL – show cover but DO NOT restart or seek audio
    if (!url) {
      if (inlineCover) { inlineCover.src = coverSrc || ''; inlineCover.style.display = 'block'; }
      // Keep video panel open as visualizer; ensure UI reflects current play state
      updatePlayPauseUI();
      return;
    }

    // Setup event handlers for fallback
    const onError = () => {
      inlineVideo.style.display = 'none';
      if (inlineCover) { inlineCover.src = coverSrc || ''; inlineCover.style.display = 'block'; }
      inlineVideo.removeEventListener('error', onError);
      inlineVideo.removeEventListener('loadeddata', onLoaded);
      inlineVideo.removeEventListener('canplay', onLoaded);
      saveVideoState({ open: true, url, currentTime: audio.currentTime||0, playing: false });
    };
    const onLoaded = () => {
      if (inlineCover) inlineCover.style.display = 'none';
      inlineVideo.style.display = 'block';
      // Align to captured resume time (dataset) or current audio time with retries to avoid starting from 0
      let resumeTime = 0; try { resumeTime = parseFloat(playerContainer.dataset.resumeTime || '0') || 0; } catch(_) {}
      if (!resumeTime) { try { resumeTime = audio.currentTime || 0; } catch(_) {} }
      const trySetTime = () => { try { inlineVideo.currentTime = resumeTime; } catch(_) {} };
      trySetTime();
      let attempts = 0;
      const ensurePosition = () => {
        attempts++;
        try {
          const ok = !isNaN(inlineVideo.currentTime) && Math.abs(inlineVideo.currentTime - resumeTime) < 0.35;
          if (!ok && attempts < 10) { setTimeout(ensurePosition, 60); trySetTime(); return; }
        } catch(_) { if (attempts < 10) { setTimeout(ensurePosition, 60); trySetTime(); return; } }
        const shouldPlay = playerContainer.dataset.wasPlayingVideoSwitch === '1' || !audio.paused;
        if (shouldPlay) { try { inlineVideo.play().catch(()=>{}); } catch(_) {} try { audio.pause(); } catch(_) {} }
        updatePlayPauseUI();
        saveVideoState({ open: true, url, currentTime: inlineVideo.currentTime||0, playing: shouldPlay });
      };
      setTimeout(ensurePosition, 0);
      inlineVideo.removeEventListener('error', onError);
      inlineVideo.removeEventListener('loadeddata', onLoaded);
      inlineVideo.removeEventListener('canplay', onLoaded);
      clearTimeout(fallbackTimer);
    };
    inlineVideo.addEventListener('error', onError);
    inlineVideo.addEventListener('loadeddata', onLoaded);
    inlineVideo.addEventListener('canplay', onLoaded);
    // Показать видео сразу, а не ждать событий (если что — сработает onError)
    inlineVideo.style.display = 'block';
    if (inlineCover) inlineCover.style.display = 'none';
    inlineVideo.poster = coverSrc || '';
    // Safety fallback: если через 4s нет readyState>=2, оставляем видео, не скрываем его
    const fallbackTimer = setTimeout(() => { /* noop, держим видео видимым */ }, 4000);
    // Build <source> with explicit type to avoid MIME sniffing issues
    const lower = (url||'').toLowerCase();
    const type = lower.endsWith('.webm') ? 'video/webm' : 'video/mp4';
    const source = document.createElement('source');
    // Do not double-encode. Assume url already properly encoded.
    source.src = url;
    source.type = type;
    inlineVideo.appendChild(source);
    inlineVideo.load();

    // Remove existing event listeners to avoid duplicates
    try {
      inlineVideo.removeEventListener('timeupdate', handleVideoTimeUpdate);
      inlineVideo.removeEventListener('loadedmetadata', handleVideoLoadedMetadata);
      inlineVideo.removeEventListener('seeked', handleVideoSeeked);
      inlineVideo.removeEventListener('ended', handleVideoEnded);
      inlineVideo.removeEventListener('play', handleVideoPlay);
      inlineVideo.removeEventListener('pause', handleVideoPause);
    } catch(_) {}

    // Define event handlers
    const handleVideoTimeUpdate = () => {
      if (videoPanel && videoPanel.style.display === 'block') {
        try {
          seekBar.value = inlineVideo.duration ? (inlineVideo.currentTime / inlineVideo.duration) * 100 : 0;
          currentTimeEl.textContent = formatTime(inlineVideo.currentTime || 0);
          if (!isNaN(inlineVideo.currentTime)) audio.currentTime = inlineVideo.currentTime;
          savePlayerStateThrottled();
        } catch(_) {}
      }
    };
    
    const handleVideoLoadedMetadata = () => {
      if (videoPanel && videoPanel.style.display === 'block') {
        try { durationEl.textContent = formatTime(inlineVideo.duration || 0); } catch(_) {}
      }
    };
    
    const handleVideoSeeked = () => {
      if (videoPanel && videoPanel.style.display === 'block') {
        try { audio.currentTime = inlineVideo.currentTime || 0; } catch(_) {}
      }
    };
    
    const handleVideoEnded = () => {
      console.log('Inline video ended, playing next track');
      if (videoPanel && videoPanel.style.display === 'block') {
        playNext(true);
      }
    };
    
    const handleVideoPlay = () => { 
      try { audio.pause(); } catch(_) {} 
      updatePlayPauseUI(); 
      saveVideoState({ open: true, url, currentTime: inlineVideo.currentTime||0, playing: true }); 
    };
    
    const handleVideoPause = () => { 
      updatePlayPauseUI(); 
      saveVideoState({ open: true, url, currentTime: inlineVideo.currentTime||0, playing: false }); 
    };

    // Keep UI and audio time in sync with video when panel visible
    try {
      inlineVideo.addEventListener('timeupdate', handleVideoTimeUpdate);
      inlineVideo.addEventListener('loadedmetadata', handleVideoLoadedMetadata);
      inlineVideo.addEventListener('seeked', handleVideoSeeked);
      inlineVideo.addEventListener('ended', handleVideoEnded);
      inlineVideo.addEventListener('play', handleVideoPlay);
      inlineVideo.addEventListener('pause', handleVideoPause);
    } catch(_) {}
  }

  // Video button: if karaoke open, show video inside karaoke left panel; else use inline panel
  if (videoBtn) videoBtn.onclick = () => {
    if (lyricsVisible && lyricsFsVideoWrap) {
      // Open video in karaoke slot
      const ds = (playerContainer.dataset && typeof playerContainer.dataset.videoUrl !== 'undefined') ? playerContainer.dataset.videoUrl : '';
      let url = ds && ds.trim() !== '' ? ds : ((trackQueue[queueIndex] && trackQueue[queueIndex].video_url) ? trackQueue[queueIndex].video_url : '');
      // Normalize relative paths like "tracks/video/.." via API proxy for proper serving
      if (url && !/^https?:/i.test(url) && url.indexOf('/public/src/api/video.php?f=') === -1) {
        const i = url.indexOf('tracks/');
        const rel = i !== -1 ? url.slice(i) : url.replace(/^\/+/, '');
        url = '/muzic2/public/src/api/video.php?f=' + encodeURIComponent(rel);
      }
      if (!url) {
        // no video: show cover placeholder (keep at top of left column)
        lyricsFsVideoWrap.style.display = 'block';
        if (lyricsFsCover) lyricsFsCover.style.display = 'none';
        if (lyricsFsVideo) { try { lyricsFsVideo.pause(); } catch(_) {}; lyricsFsVideo.src=''; lyricsFsVideo.style.display='none'; }
        if (lyricsFsVideoCover) { lyricsFsVideoCover.src = (cover && cover.src) ? cover.src : ''; lyricsFsVideoCover.style.display='block'; }
        return;
      }
      // Reset states
      try { lyricsFsVideo.pause(); } catch(_) {}
      if (lyricsFsVideo) {
        lyricsFsVideo.style.display = 'block';
        lyricsFsVideo.src = url;
        lyricsFsVideo.currentTime = isNaN(audio.currentTime) ? 0 : (audio.currentTime||0);
        // ensure no native controls
        try { lyricsFsVideo.controls = false; } catch(_) {}
        lyricsFsVideo.play().catch(()=>{});
      }
      if (lyricsFsVideoCover) lyricsFsVideoCover.style.display = 'none';
      if (lyricsFsCover) lyricsFsCover.style.display = 'none';
      lyricsFsVideoWrap.style.display = 'block';
      // Make sure audio element is muted and video outputs the sound
      try { audio.muted = true; } catch(_) {}
      try { lyricsFsVideo.muted = false; } catch(_) {}
      // Ensure timeupdate keeps running while video plays
      try {
        if (lyricsFsVideo) {
          const rebroadcast = () => { try { updateLyricsHighlight(lyricsFsVideo.currentTime||0); } catch(_) {} };
          lyricsFsVideo.removeEventListener('timeupdate', rebroadcast);
          lyricsFsVideo.addEventListener('timeupdate', rebroadcast);
          // Also fix highlight after manual seek in karaoke video
          const onSeeked = () => {
            try { currentLyricsIndex = -1; } catch(_) {}
            try {
              const t = isNaN(lyricsFsVideo.currentTime) ? 0 : (lyricsFsVideo.currentTime||0);
              updateLyricsHighlight(t);
              // Scroll to nearest line to keep anchor
              if (lyricsVisible && typeof scrollLyricsToAnchorForIndex === 'function') {
                let idx = 0;
                for (let i = 0; i < lyricsLines.length; i++) { if (lyricsLines[i].time <= t) idx = i; else break; }
                scrollLyricsToAnchorForIndex(idx);
              }
            } catch(_) {}
          };
          lyricsFsVideo.removeEventListener('seeked', onSeeked);
          lyricsFsVideo.addEventListener('seeked', onSeeked);
        }
      } catch(_) {}
      return;
    }
    const ds = (playerContainer.dataset && typeof playerContainer.dataset.videoUrl !== 'undefined') ? playerContainer.dataset.videoUrl : '';
    let url = ds && ds.trim() !== '' ? ds : ((trackQueue[queueIndex] && trackQueue[queueIndex].video_url) ? trackQueue[queueIndex].video_url : '');
    // If looks like raw tracks/... path, route via proxy for proper Content-Type
    if (url && !/^https?:/i.test(url) && url.indexOf('/public/src/api/video.php?f=') === -1) {
      const i = url.indexOf('tracks/');
      const rel = i !== -1 ? url.slice(i) : url.replace(/^\/+/, '');
      url = '/muzic2/public/src/api/video.php?f=' + encodeURIComponent(rel);
    }
    try { console.debug('[player] video button URL =', url); } catch(_){ }
    if (!videoPanel) return;
    const visible = videoPanel.style.display === 'block';
    if (visible) {
      // Capture position and playing state BEFORE clearing the source
      let t = 0; let wasPlaying = false; let hadMedia = false;
      try { hadMedia = !!(inlineVideo.currentSrc || inlineVideo.readyState >= 1); } catch(_) { hadMedia=false; }
      try { t = inlineVideo.currentTime || 0; wasPlaying = !inlineVideo.paused && !inlineVideo.ended; } catch(_) {}
      try { inlineVideo.pause(); } catch(_) {}
      inlineVideo.removeAttribute('src'); inlineVideo.load();
      if (inlineCover) inlineCover.style.display = 'none';
      videoPanel.style.display = 'none';
      // Restore audio to captured position and resume if video was playing
      const resumeAudio = () => {
        // Only seek if video actually had media; otherwise don't jump to 0
        if (hadMedia) { try { audio.currentTime = t; } catch(_) {} }
        if (wasPlaying) { try { audio.play().catch(()=>{}); } catch(_) {} }
      };
      if (isNaN(audio.duration) || !isFinite(audio.duration) || audio.readyState < 1) {
        const once = function(){ audio.removeEventListener('loadedmetadata', once); resumeAudio(); };
        audio.addEventListener('loadedmetadata', once);
      } else {
        resumeAudio();
      }
      updatePlayPauseUI();
      return;
    }
    // Capture current audio time and play-state for precise resume inside openInlineMedia
    try { playerContainer.dataset.resumeTime = String(audio.currentTime || 0); playerContainer.dataset.wasPlayingVideoSwitch = (!audio.paused) ? '1' : '0'; } catch(_) {}
    openInlineMedia(url, (cover && cover.src) ? cover.src : '');
  };
  if (videoClose) videoClose.onclick = () => { let t=0, wasPlaying=false, hadMedia=false; try { hadMedia = !!(inlineVideo.currentSrc || inlineVideo.readyState >= 1); t = inlineVideo.currentTime || 0; wasPlaying = !inlineVideo.paused && !inlineVideo.ended; } catch(_){}; try { inlineVideo.pause(); } catch(_){}; inlineVideo.src=''; if (inlineCover) inlineCover.style.display='none'; videoPanel.style.display='none'; if (hadMedia) { try { audio.currentTime = t; } catch(_){} } if (wasPlaying) { try { audio.play().catch(()=>{}); } catch(_) {} } updatePlayPauseUI(); };

  fullscreenBtn.onclick = () => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  };
  if (likeBtn) likeBtn.onclick = async () => {
    if (!currentTrackId) return;
    if (likedSet.has(currentTrackId)) {
      await fetch('/muzic2/src/api/likes.php', { method:'DELETE', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ track_id: currentTrackId })});
      likedSet.delete(currentTrackId);
    } else {
      await fetch('/muzic2/src/api/likes.php', { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ track_id: currentTrackId })});
      likedSet.add(currentTrackId);
    }
    updatePlayerLikeUI();
    try { document.dispatchEvent(new CustomEvent('likes:updated', { detail:{ trackId: currentTrackId, liked: likedSet.has(currentTrackId) } })); } catch(_) {}
  };
  if (likeBtn) likeBtn.onclick = async () => {
    if (!currentTrackId) return;
    // Ensure we have current liked set
    if (!likedSet || typeof likedSet.has !== 'function') likedSet = new Set();
    if (likedSet.has(currentTrackId)) {
      await fetch('/muzic2/src/api/likes.php', { method:'DELETE', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ track_id: currentTrackId })});
      likedSet.delete(currentTrackId);
    } else {
      await fetch('/muzic2/src/api/likes.php', { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ track_id: currentTrackId })});
      likedSet.add(currentTrackId);
    }
    updatePlayerLikeUI();
    // Broadcast change so hearts update elsewhere
    try { document.dispatchEvent(new CustomEvent('likes:updated', { detail: { trackId: currentTrackId, liked: likedSet.has(currentTrackId) } })); } catch (_) {}
  };

  // Like button
  likeBtn && (likeBtn.onclick = async () => {
    // ensure likes loaded
    if (!likedSet || !likedSet.size) await loadLikes();
    if (!currentTrackId) return;
    if (likedSet.has(currentTrackId)) {
      await fetch('/muzic2/src/api/likes.php', { method:'DELETE', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ track_id: currentTrackId })});
      likedSet.delete(currentTrackId);
    } else {
      await fetch('/muzic2/src/api/likes.php', { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ track_id: currentTrackId })});
      likedSet.add(currentTrackId);
    }
    updatePlayerLikeUI();
  });

  fullscreenClose.onclick = () => exitFullscreen();
  fullscreenBack.onclick = () => exitFullscreen();

  // Handle Escape key to exit fullscreen
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isFullscreen) {
      exitFullscreen();
    }
  });

  volumeBtn.onclick = () => {
    if (isMuted) {
      // Unmute: restore previous volume
      isMuted = false;
      audio.volume = previousVolume;
      volumeBar.value = Math.round(previousVolume * 100);
      if (popupActive) {
        postToPopup({ cmd: 'setVolume', volume: previousVolume });
      }
    } else {
      // Mute: save current volume and set to 0
      previousVolume = audio.volume;
      isMuted = true;
      audio.volume = 0;
      volumeBar.value = 0;
      if (popupActive) {
        postToPopup({ cmd: 'setVolume', volume: 0 });
      }
    }
    updateMuteUI();
    savePlayerState();
  };

  // Persistence wiring
  ;['play', 'pause', 'seeked', 'volumechange', 'ended'].forEach(event => {
    audio.addEventListener(event, savePlayerState);
  });
  // Save on tab hide and before page unload to not lose position
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // Save current state on hide
      savePlayerState();
      // If video is playing, note it so we can resume on return
      try {
        const wasVideoOpen = (videoPanel && videoPanel.style.display==='block');
        const wasVideoPlaying = wasVideoOpen && inlineVideo && !inlineVideo.paused;
        playerContainer.dataset.wasPlayingOnHide = (wasVideoPlaying || (!wasVideoOpen && !audio.paused)) ? '1' : '0';
        // Persist video panel state
        if (wasVideoOpen) {
          saveVideoState({ open: true, url: (playerContainer.dataset && playerContainer.dataset.videoUrl) || '', currentTime: inlineVideo && !isNaN(inlineVideo.currentTime)? inlineVideo.currentTime : (audio.currentTime||0), playing: !!wasVideoPlaying });
        } else {
          saveVideoState({ open: false, url: (playerContainer.dataset && playerContainer.dataset.videoUrl) || '', currentTime: audio.currentTime||0, playing: !audio.paused });
        }
      } catch(_) {}
    } else if (document.visibilityState === 'visible') {
      // On return, if video panel open, resume video playback at synced time
      const vstate = loadVideoState();
      if (vstate && vstate.open) {
        // Re-open video panel if it was open before navigation/tab switch
        try {
          const url = vstate.url || (playerContainer.dataset && playerContainer.dataset.videoUrl) || '';
          openInlineMedia(url, (cover && cover.src) ? cover.src : '');
          const apply = () => {
            try { inlineVideo.currentTime = vstate.currentTime || 0; } catch(_) {}
            if (vstate.playing) {
              let tries = 0; const tryPlay = () => { tries++; inlineVideo.play().then(updatePlayPauseUI).catch(()=>{ if (tries < 5) setTimeout(tryPlay, 120); }); };
              tryPlay();
              try { audio.pause(); } catch(_) {}
            }
          };
          if (inlineVideo && inlineVideo.readyState >= 1) apply(); else setTimeout(apply, 120);
        } catch(_) {}
      } else {
        // If only audio was playing before hide, resume audio
        const shouldResume = playerContainer.dataset.wasPlayingOnHide === '1';
        if (shouldResume && audio.paused) {
          // Make sure we don't jump to start if metadata not ready
          const resume = () => { try { audio.play().catch(()=>{}); } catch(_) {} };
          if (isNaN(audio.duration) || !isFinite(audio.duration) || audio.readyState < 1) {
            const once = function(){ audio.removeEventListener('loadedmetadata', once); resume(); };
            audio.addEventListener('loadedmetadata', once);
          } else { resume(); }
        }
      }
      // Clear flag
      delete playerContainer.dataset.wasPlayingOnHide;
      updatePlayPauseUI();
    }
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
  window.playTrack = function (arg) {
    console.log('playTrack called with:', arg);
    console.log('Current trackQueue length before playTrack:', trackQueue.length);
    
    // Support legacy positional signature: playTrack(src, title, artist, cover)
    let src, title, artist, coverUrl, queue = null, queueStartIndex = 0, duration = 0, id = undefined;
    if (typeof arg === 'object' && arg !== null) {
      ({ src, title, artist, cover: coverUrl, queue = null, queueStartIndex = 0, duration = 0, id } = arg);
    } else {
      src = arguments[0]; title = arguments[1]; artist = arguments[2]; coverUrl = arguments[3];
    }
    
    console.log('playTrack queue parameter:', queue);
    console.log('playTrack queueStartIndex:', queueStartIndex);
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
    function normalizeVideo(u){
      if (!u) return '';
      if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) return u;
      if (u.startsWith('/')) return u;
      const i = u.indexOf('tracks/');
      if (i !== -1) return '/muzic2/' + u.slice(i);
      return '/muzic2/' + u.replace(/^\/+/, '');
    }
    if (queue && Array.isArray(queue) && queue.length > 0) {
      console.log('Using provided queue with', queue.length, 'tracks');
      // Ensure ordered playback when album queue starts
      shuffleEnabled = false;
      updateShuffleUI();
      trackQueue = queue.map(q => ({
        src: normalizeSrc(q.src || q.file_path || q.url || ''),
        title: q.title || '',
        artist: q.artist || '',
        feats: q.feats || '',
        cover: normalizeCover(q.cover || coverUrl || ''),
        duration: q.duration || 0,
        id: q.id || q.track_id || undefined,
        video_url: normalizeVideo(q.video_url || '')
      }));
      originalQueue = trackQueue.slice();
      queueIndex = Math.max(0, Math.min(queueStartIndex, trackQueue.length - 1));
      saveQueue();
      playFromQueue(queueIndex);
      toggleQueuePanel(true);
    } else {
      console.log('No queue provided, creating single track queue');
      console.log('This will overwrite existing queue of', trackQueue.length, 'tracks');
      // Single track
      trackQueue = [{ src: normalizeSrc(src), title, artist, feats: (arguments[0] && arguments[0].feats) ? arguments[0].feats : '', cover: normalizeCover(coverUrl || ''), duration, id, video_url: normalizeVideo((arguments[0] && arguments[0].video_url) ? arguments[0].video_url : '') }];
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
      src: normalizeSrc(track.file_path || ''),
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

  // Set queue function for external use
  window.setQueue = function(queue, startIndex = 0) {
    console.log('setQueue called with queue length:', queue ? queue.length : 'null', 'startIndex:', startIndex);
    console.log('Current trackQueue length before setQueue:', trackQueue.length);
    
    if (!Array.isArray(queue) || queue.length === 0) {
      console.log('Invalid queue provided to setQueue');
      return;
    }
    
    console.log('Setting queue with', queue.length, 'tracks, starting from index', startIndex);
    console.log('First few tracks:', queue.slice(0, 3).map(t => ({ title: t.title, artist: t.artist, src: t.src })));
    
    // Update internal queue variables
    trackQueue = queue;
    queueIndex = startIndex;
    
    // Save queue to localStorage
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    localStorage.setItem(QUEUE_INDEX_KEY, String(queueIndex));
    
    // Update queue UI
    renderQueueUI();
    
    console.log('Queue set successfully, trackQueue length:', trackQueue.length, 'queueIndex:', queueIndex);
    console.log('Current track in queue:', trackQueue[queueIndex] ? trackQueue[queueIndex].title : 'none');
    console.log('Current track src:', trackQueue[queueIndex] ? trackQueue[queueIndex].src : 'none');
  };

  // Initialize from storage
  loadQueue();
  loadPlayerState();
  updateShuffleUI();
  updateRepeatUI();
  updateMuteUI();
  updateFullscreenUI();
  // Load likes after render
  loadLikes().then(updatePlayerLikeUI).catch(()=>{});
  renderQueueUI();
  // Ensure UI reflects current state after initial render
  setTimeout(updateShuffleUI, 0);
  // Sync UI with popup if already open
  if (popupActive && popupWin) {
    postToPopup({ cmd: 'play' }, { retries: 3, delay: 150 });
  }

  // Detect operating system
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const isWindows = navigator.platform.toUpperCase().indexOf('WIN') >= 0;
  
  // F7 and F9 keys handler (cross-platform)
  document.addEventListener('keydown', (e) => {
    // Try multiple approaches for F-keys
    const isF7 = e.keyCode === 118 || e.code === 'F7' || e.key === 'F7';
    const isF9 = e.keyCode === 120 || e.code === 'F9' || e.key === 'F9';
    
    if (isF7 || isF9) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      if (isF7) {
        console.log('F7 pressed - Previous track');
        playPrev();
      } else if (isF9) {
        console.log('F9 pressed - Next track');
        playNext(false);
      }
      return false;
    }
  }, true); // Use capture phase
  
  // Alternative: Try with modifier keys (Mac specific)
  if (isMac) {
    document.addEventListener('keydown', (e) => {
      // On Mac, F-keys might need modifier keys
      if ((e.keyCode === 118 || e.keyCode === 120) && (e.altKey || e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        if (e.keyCode === 118) { // Modifier+F7
          console.log('Modifier+F7 pressed - Previous track');
          playPrev();
        } else if (e.keyCode === 120) { // Modifier+F9
          console.log('Modifier+F9 pressed - Next track');
          playNext(false);
        }
        return false;
      }
    }, true);
  }
  
  // Windows-specific keys
  if (isWindows) {
    document.addEventListener('keydown', (e) => {
      // Windows media keys and additional shortcuts
      if (e.code === 'MediaPlayPause' || e.keyCode === 179) {
        e.preventDefault();
        if (isPlaying) {
          audio.pause();
        } else {
          audio.play();
        }
      } else if (e.code === 'MediaTrackNext' || e.keyCode === 176) {
        e.preventDefault();
        playNext(false);
      } else if (e.code === 'MediaTrackPrevious' || e.keyCode === 177) {
        e.preventDefault();
        playPrev();
      } else if (e.code === 'MediaStop' || e.keyCode === 178) {
        e.preventDefault();
        audio.pause();
      }
      // Windows-specific F-key combinations
      else if (e.keyCode === 118 && e.ctrlKey) { // Ctrl+F7
        e.preventDefault();
        playPrev();
      } else if (e.keyCode === 120 && e.ctrlKey) { // Ctrl+F9
        e.preventDefault();
        playNext(false);
      }
    });
  }
  
  // Debug: Log all key events to see what's happening
  document.addEventListener('keydown', (e) => {
    if (e.keyCode >= 112 && e.keyCode <= 123) { // F1-F12 range
      console.log('F-key detected:', {
        keyCode: e.keyCode,
        key: e.key,
        code: e.code,
        altKey: e.altKey,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey
      });
    }
  });
  
  // Show instructions based on OS
  if (isMac) {
    console.log('🍎 Mac: Для работы F7/F9:');
    console.log('1. System Preferences → Keyboard → Shortcuts');
    console.log('2. Отключите системные сочетания для F7/F9');
    console.log('3. Или включите "Use F1, F2, etc. keys as standard function keys"');
    console.log('4. Или используйте Fn+F7/F9');
  } else if (isWindows) {
    console.log('🪟 Windows: Поддерживаемые клавиши:');
    console.log('• F7/F9 - переключение треков');
    console.log('• Ctrl+F7/Ctrl+F9 - альтернативное переключение');
    console.log('• Media клавиши - Play/Pause, Next, Previous, Stop');
  } else {
    console.log('🖥️ Другая ОС: Поддерживаемые клавиши:');
    console.log('• F7/F9 - переключение треков');
    console.log('• Media клавиши - Play/Pause, Next, Previous, Stop');
  }
  
  // Try to detect if F-keys work without Fn (Mac only)
  if (isMac) {
    let fnRequired = false;
    let testAttempts = 0;
    
    const testFKeys = () => {
      testAttempts++;
      if (testAttempts > 3) {
        if (fnRequired) {
          console.log('⚠️ F7/F9 требуют нажатия Fn. Настройте Mac для работы без Fn:');
          console.log('System Preferences → Keyboard → "Use F1, F2, etc. keys as standard function keys"');
        }
        return;
      }
      
      // Show test message
      console.log(`🧪 Тест ${testAttempts}: Нажмите F7 или F9 (без Fn) для проверки...`);
      
      const testHandler = (e) => {
        if (e.keyCode === 118 || e.keyCode === 120) {
          if (!e.altKey && !e.metaKey && !e.ctrlKey) {
            console.log('✅ F-клавиши работают без Fn!');
            fnRequired = false;
          } else {
            console.log('⚠️ F-клавиши требуют модификаторы');
            fnRequired = true;
          }
          document.removeEventListener('keydown', testHandler);
          setTimeout(testFKeys, 2000);
        }
      };
      
      document.addEventListener('keydown', testHandler);
      setTimeout(() => {
        document.removeEventListener('keydown', testHandler);
        if (testAttempts <= 3) {
          setTimeout(testFKeys, 2000);
        }
      }, 3000);
    };
    
    // Start test after 2 seconds
    setTimeout(testFKeys, 2000);
  }

  // Universal media keys support (all OS)
  document.addEventListener('keydown', (e) => {
    if (e.code === 'MediaPlayPause') {
      e.preventDefault();
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
    } else if (e.code === 'MediaTrackNext') {
      e.preventDefault();
      playNext(false);
    } else if (e.code === 'MediaTrackPrevious') {
      e.preventDefault();
      playPrev();
    } else if (e.code === 'MediaStop') {
      e.preventDefault();
      audio.pause();
    }
  });
})();
