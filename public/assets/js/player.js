// Независимый плеер
const playerRoot = document.getElementById('player-root');

playerRoot.innerHTML = `
  <div id="player">
    <button id="prev-btn">⏮️</button>
    <button id="play-btn">▶️</button>
    <button id="next-btn">⏭️</button>
    <span id="track-title">Трек не выбран</span>
    <input type="range" id="seek-bar" min="0" max="100" value="0">
    <span id="current-time">0:00</span> / <span id="duration">0:00</span>
    <audio id="audio" preload="none"></audio>
  </div>
`;

const audio = document.getElementById('audio');
const playBtn = document.getElementById('play-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const seekBar = document.getElementById('seek-bar');
const trackTitle = document.getElementById('track-title');
const currentTime = document.getElementById('current-time');
const duration = document.getElementById('duration');

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
  playBtn.textContent = '⏸️';
};
audio.onpause = () => {
  isPlaying = false;
  playBtn.textContent = '▶️';
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
function formatTime(sec) {
  sec = Math.floor(sec);
  return `${Math.floor(sec/60)}:${('0'+(sec%60)).slice(-2)}`;
}
// TODO: Реализация очереди, загрузки трека, автодобавления похожих треков и т.д.

