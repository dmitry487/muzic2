// SPA роутинг и динамический контент
const mainContent = document.getElementById('main-content');
const navHome = document.getElementById('nav-home');
const navSearch = document.getElementById('nav-search');
const navLibrary = document.getElementById('nav-library');

function showPage(page) {
    if (page === 'Главная') {
        renderHome();
    } else if (page === 'Поиск') {
        mainContent.innerHTML = '<h2>Поиск</h2><p>Контент скоро будет...</p>';
    } else if (page === 'Моя музыка') {
        mainContent.innerHTML = '<h2>Моя музыка</h2><p>Контент скоро будет...</p>';
    }
}

navHome.onclick = () => showPage('Главная');
navSearch.onclick = () => showPage('Поиск');
navLibrary.onclick = () => showPage('Моя музыка');

showPage('Главная');

async function renderHome() {
    mainContent.innerHTML = '<div class="loading">Загрузка...</div>';
    try {
        const res = await fetch('/muzic2/public/src/api/home.php');
        const data = await res.json();
        mainContent.innerHTML = `
            <section class="main-filters">
                <button class="filter-btn active">Все</button>
                <button class="filter-btn">Музыка</button>
                <button class="filter-btn">Артисты</button>
            </section>
            <section class="main-section" id="favorites-section">
                <h3>Любимые треки</h3>
                <div class="card-row" id="favorites-row"></div>
            </section>
            <section class="main-section" id="mixes-section">
                <h3>Миксы дня</h3>
                <div class="card-row" id="mixes-row"></div>
            </section>
            <section class="main-section" id="albums-section">
                <h3>Случайные альбомы</h3>
                <div class="card-row" id="albums-row"></div>
            </section>
            <section class="main-section" id="tracks-section">
                <h3>Случайные треки</h3>
                <div class="card-row" id="tracks-row"></div>
            </section>
            <section class="main-section" id="artists-section">
                <h3>Артисты</h3>
                <div class="card-row" id="artists-row"></div>
            </section>
        `;
        renderCards('favorites-row', data.favorites, 'track');
        renderCards('mixes-row', data.mixes, 'track');
        renderCards('albums-row', data.albums, 'album');
        renderCards('tracks-row', data.tracks, 'track');
        renderCards('artists-row', data.artists, 'artist');
    } catch (e) {
        mainContent.innerHTML = '<div class="error">Ошибка загрузки главной страницы</div>';
    }
}

function renderCards(rowId, items, type) {
    let row = document.getElementById(rowId);
    if (!row) return;
    let html = '';
    if (type === 'album' || type === 'mix') {
        row.className = 'tile-row';
        html = items.map(item => `
            <div class="tile" onclick="window.playTrack && window.playTrack({src: '/muzic2/${item.file_path || ''}', title: '${escapeHtml(item.album || item.title)}', artist: '${escapeHtml(item.artist || '')}', cover: '/muzic2/${item.cover || 'tracks/covers/placeholder.jpg'}'})">
                <img class="tile-cover" src="/muzic2/${item.cover || 'tracks/covers/placeholder.jpg'}" alt="cover">
                <div class="tile-title">${escapeHtml(item.album || item.title)}</div>
                <div class="tile-desc">${escapeHtml(item.artist || '')}</div>
                <div class="tile-play">&#9654;</div>
            </div>
        `).join('');
    } else if (type === 'artist') {
        row.className = 'artist-row';
        html = items.map(item => `
            <div class="artist-tile">
                <img class="artist-avatar" src="/muzic2/${item.cover || 'tracks/covers/placeholder.jpg'}" alt="artist">
                <div class="artist-name">${escapeHtml(item.artist)}</div>
            </div>
        `).join('');
    } else if (type === 'track') {
        row.className = 'card-row';
        html = items.map(item => `
            <div class="card" onclick="window.playTrack && window.playTrack({src: '/muzic2/${item.file_path}', title: '${escapeHtml(item.title)}', artist: '${escapeHtml(item.artist)}', cover: '/muzic2/${item.cover || 'tracks/covers/placeholder.jpg'}'})">
                <img class="card-cover" src="/muzic2/${item.cover || 'tracks/covers/placeholder.jpg'}" alt="cover">
                <div class="card-info">
                    <div class="card-title">${escapeHtml(item.title)}</div>
                    <div class="card-artist">${escapeHtml(item.artist)}</div>
                    <div class="card-type">${item.album_type || ''}</div>
                </div>
            </div>
        `).join('');
    }
    row.innerHTML = html;
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"]/g, function (m) {
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m];
    });
}

