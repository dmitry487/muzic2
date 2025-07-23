// SPA роутинг и динамический контент
const mainContent = document.getElementById('main-content');
const navHome = document.getElementById('nav-home');
const navSearch = document.getElementById('nav-search');
const navLibrary = document.getElementById('nav-library');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const userInfo = document.getElementById('user-info');

function showPage(page) {
    // TODO: Загрузка контента для page (home, search, library)
    mainContent.innerHTML = `<h2>${page}</h2><p>Контент скоро будет...</p>`;
}

navHome.onclick = () => showPage('Главная');
navSearch.onclick = () => showPage('Поиск');
navLibrary.onclick = () => showPage('Моя музыка');

// --- Модальные окна логина и регистрации ---
const modalRoot = document.getElementById('modal-root');

function openModal(type) {
    let html = '';
    if (type === 'login') {
        html = `
        <div class="modal" id="login-modal">
            <button class="close-modal" title="Закрыть">×</button>
            <h2>Вход</h2>
            <form id="login-form" autocomplete="on">
                <label>Email или логин
                    <input type="text" name="login" required autocomplete="username">
                </label>
                <label>Пароль
                    <input type="password" name="password" required autocomplete="current-password">
                </label>
                <div class="error" id="login-error"></div>
                <button type="submit">Войти</button>
            </form>
        </div>`;
    } else if (type === 'register') {
        html = `
        <div class="modal" id="register-modal">
            <button class="close-modal" title="Закрыть">×</button>
            <h2>Регистрация</h2>
            <form id="register-form" autocomplete="on">
                <label>Email
                    <input type="email" name="email" required autocomplete="email">
                </label>
                <label>Логин
                    <input type="text" name="username" required autocomplete="username">
                </label>
                <label>Пароль
                    <input type="password" name="password" required autocomplete="new-password">
                </label>
                <div class="error" id="register-error"></div>
                <button type="submit">Зарегистрироваться</button>
            </form>
        </div>`;
    }
    modalRoot.innerHTML = html;
    modalRoot.style.display = 'flex';
    // Закрытие по крестику и клику вне модалки
    modalRoot.querySelector('.close-modal').onclick = closeModal;
    modalRoot.onclick = (e) => { if (e.target === modalRoot) closeModal(); };
    // Обработка форм
    if (type === 'login') {
        document.getElementById('login-form').onsubmit = async (e) => {
            e.preventDefault();
            const form = e.target;
            const login = form.login.value.trim();
            const password = form.password.value;
            const errorDiv = document.getElementById('login-error');
            errorDiv.textContent = '';
            try {
                const res = await fetch('/public/api.php/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ login, password })
                });
                const data = await res.json();
                if (data.success) {
                    closeModal();
                    showUser(data.user);
                } else {
                    errorDiv.textContent = data.error || 'Ошибка входа';
                }
            } catch (err) {
                errorDiv.textContent = 'Ошибка сети';
            }
        };
    } else if (type === 'register') {
        document.getElementById('register-form').onsubmit = async (e) => {
            e.preventDefault();
            const form = e.target;
            const email = form.email.value.trim();
            const username = form.username.value.trim();
            const password = form.password.value;
            const errorDiv = document.getElementById('register-error');
            errorDiv.textContent = '';
            try {
                const res = await fetch('/public/api.php/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, username, password })
                });
                const data = await res.json();
                if (data.success) {
                    closeModal();
                    openModal('login');
                } else {
                    errorDiv.textContent = data.error || 'Ошибка регистрации';
                }
            } catch (err) {
                errorDiv.textContent = 'Ошибка сети';
            }
        };
    }
}
function closeModal() {
    modalRoot.style.display = 'none';
    modalRoot.innerHTML = '';
}
// Кнопки для открытия модалок
loginBtn.onclick = () => openModal('login');
registerBtn.onclick = () => openModal('register');

function showUser(user) {
    userInfo.textContent = user.username || user.email;
    userInfo.style.display = '';
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'none';
    logoutBtn.style.display = '';
}

function showWelcome() {
    document.getElementById('main-header').style.display = 'none';
    document.getElementById('player-root').style.display = 'none';
    mainContent.innerHTML = `
      <div class="welcome-screen">
        <div class="welcome-logo">Muzic2</div>
        <div class="welcome-slogan">Музыка для твоего настроения</div>
        <div class="welcome-actions">
          <button class="welcome-btn" id="welcome-login">Войти</button>
          <button class="welcome-btn" id="welcome-register">Зарегистрироваться</button>
        </div>
      </div>
    `;
    document.getElementById('welcome-login').onclick = () => openModal('login');
    document.getElementById('welcome-register').onclick = () => openModal('register');
}

// Переопределяем showUser чтобы возвращать основной интерфейс
function showUser(user) {
    userInfo.textContent = user.username || user.email;
    userInfo.style.display = '';
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'none';
    logoutBtn.style.display = '';
    document.getElementById('main-header').style.display = '';
    document.getElementById('player-root').style.display = '';
    showPage('Главная');
}

// При загрузке — показываем welcome, если не авторизован
window.addEventListener('DOMContentLoaded', () => {
    // Можно добавить проверку авторизации через fetch, если нужно
    showWelcome();
});


// Загрузка треков и отображение на главной
async function loadTracks() {
    mainContent.innerHTML = '<div class="loading">Загрузка треков...</div>';
    try {
        const res = await fetch('/public/api.php/api/tracks');
        const data = await res.json();
        if (data.tracks && data.tracks.length) {
            mainContent.innerHTML = `<div class="tracks-list">${data.tracks.map(track => `
                <div class="track-card">
                    <img src="${track.cover || 'https://via.placeholder.com/56x56?text=♪'}" alt="cover" class="track-cover">
                    <div class="track-meta">
                        <div class="track-title">${track.title}</div>
                        <div class="track-artist">${track.artist_name || ''}</div>
                    </div>
                    <button class="track-play-btn" title="Слушать" data-src="${track.file_path}" data-title="${track.title}" data-artist="${track.artist_name || ''}" data-cover="${track.cover || ''}">
                        ▶️
                    </button>
                </div>
            `).join('')}</div>`;
            // Вешаем обработчик на play
            document.querySelectorAll('.track-play-btn').forEach(btn => {
                btn.onclick = () => {
                    window.playTrack({
                        src: btn.dataset.src,
                        title: btn.dataset.title,
                        artist: btn.dataset.artist,
                        cover: btn.dataset.cover
                    });
                };
            });
        } else {
            mainContent.innerHTML = '<div class="empty">Нет треков</div>';
        }
    } catch (e) {
        mainContent.innerHTML = '<div class="error">Ошибка загрузки треков</div>';
    }
}
// Переопределяем showPage для главной
function showPage(page) {
    if (page === 'Главная') loadTracks();
    else mainContent.innerHTML = `<h2>${page}</h2><p>Контент скоро будет...</p>`;
}
// Глобальная функция для плеера
window.playTrack = function({src, title, artist, cover}) {
    const audio = document.getElementById('audio');
    const trackTitle = document.getElementById('track-title');
    const trackArtist = document.getElementById('track-artist');
    const coverImg = document.getElementById('cover');
    audio.src = src;
    audio.play();
    trackTitle.textContent = title;
    trackArtist.textContent = artist;
    if (cover) coverImg.src = cover;
};

// По умолчанию — главная
showPage('Главная');

