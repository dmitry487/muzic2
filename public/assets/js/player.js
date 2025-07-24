// Независимый современный плеер с SVG-иконками
const playerRoot = document.getElementById('player-root');

playerRoot.innerHTML = `
  <div id="player">
    <div class="player-left">
      <img id="cover" src="https://via.placeholder.com/56x56?text=♪" alt="cover" class="cover">
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
        <button id="repeat-btn" title="Повтор">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
        </button>
      </div>
      <div class="player-progress">
        <span id="current-time">0:00</span>
        <input type="range" id="seek-bar" min="0" max="100" value="0">
        <span id="duration">0:00</span>
      </div>
    </div>
    <div class="player-right">
      <button title="Очередь">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="17" y2="18"/><polyline points="19 16 21 18 19 20"/></svg>
      </button>
      <button title="Текст">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="17" x2="20" y2="17"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="7" x2="20" y2="7"/></svg>
      </button>
      <button title="Наушники">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h3"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2H3"/></svg>
      </button>
      <button title="Громкость">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
      </button>
      <input type="range" id="volume-bar" min="0" max="100" value="100" class="volume-bar">
      <button title="Fullscreen">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
      </button>
    </div>
    <audio id="audio" preload="none"></audio>
  </div>
`;

const audio = document.getElementById('audio');
const playBtn = document.getElementById('play-btn');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const seekBar = document.getElementById('seek-bar');
const trackTitle = document.getElementById('track-title');
const trackArtist = document.getElementById('track-artist');
const currentTime = document.getElementById('current-time');
const duration = document.getElementById('duration');
const cover = document.getElementById('cover');
const volumeBar = document.getElementById('volume-bar');

let isPlaying = false;
let currentTrack = null;
let trackQueue = [];

playBtn.onclick = () => {
  if (!audio.src) return;
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
};
audio.onplay = () => {
  isPlaying = true;
  playIcon.style.display = 'none';
  pauseIcon.style.display = '';
};
audio.onpause = () => {
  isPlaying = false;
  playIcon.style.display = '';
  pauseIcon.style.display = 'none';
};
audio.ontimeupdate = () => {
  seekBar.value = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
  currentTime.textContent = formatTime(audio.currentTime);
};
audio.onloadedmetadata = () => {
  duration.textContent = formatTime(audio.duration);
};
seekBar.oninput = () => {
  if (audio.duration) {
    audio.currentTime = (seekBar.value / 100) * audio.duration;
  }
};
volumeBar.oninput = () => {
  audio.volume = volumeBar.value / 100;
};
function formatTime(sec) {
  sec = Math.floor(sec);
  return `${Math.floor(sec/60)}:${('0'+(sec%60)).slice(-2)}`;
}
// TODO: Реализация очереди, загрузки трека, автодобавления похожих треков и т.д.

window.playTrack = function({src, title, artist, cover}) {
  if (!src) return;
  audio.src = src;
  audio.play();
  trackTitle.textContent = title || '';
  trackArtist.textContent = artist || '';
  cover && (document.getElementById('cover').src = cover);
};

