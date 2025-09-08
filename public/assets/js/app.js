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
    if (type === 'album') {
        row.className = 'tile-row';
        html = items.map((item, idx) => `
            <div class="tile" data-album="${encodeURIComponent(item.album)}" data-idx="${idx}">
                <img class="tile-cover" src="/muzic2/${item.cover || 'tracks/covers/placeholder.jpg'}" alt="cover">
                <div class="tile-title">${escapeHtml(item.album)}</div>
                <div class="tile-desc">${escapeHtml(item.artist || '')}</div>
                <div class="tile-play">&#9654;</div>
            </div>
        `).join('');
    } else if (type === 'mix') {
        row.className = 'tile-row';
        html = items.map((item, idx) => `
            <div class="tile" data-idx="${idx}">
                <img class="tile-cover" src="/muzic2/${item.cover || 'tracks/covers/placeholder.jpg'}" alt="cover">
                <div class="tile-title">${escapeHtml(item.album || item.title)}</div>
                <div class="tile-desc">${escapeHtml(item.artist || '')}</div>
                <div class="tile-play">&#9654;</div>
            </div>
        `).join('');
    } else if (type === 'artist') {
        row.className = 'artist-row';
        html = items.map(item => `
            <div class="artist-tile" data-artist="${encodeURIComponent(item.artist)}">
                <img class="artist-avatar" src="/muzic2/${item.cover || 'tracks/covers/placeholder.jpg'}" alt="artist">
                <div class="artist-name">${escapeHtml(item.artist)}</div>
            </div>
        `).join('');
    } else if (type === 'track') {
        row.className = 'card-row';
        html = items.map((item, idx) => `
            <div class="card" data-idx="${idx}">
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

    if (type === 'album') {
        row.onclick = function(e) {
            let el = e.target;
            while (el && el !== row && !el.hasAttribute('data-album')) el = el.parentElement;
            if (el && el.hasAttribute('data-album')) {
                const albumName = el.getAttribute('data-album');
                window.location = 'album.html?album=' + albumName;
            }
        };
    } else if (type === 'artist') {
        row.onclick = function(e) {
            let el = e.target;
            while (el && el !== row && !el.hasAttribute('data-artist')) el = el.parentElement;
            if (el && el.hasAttribute('data-artist')) {
                const artistName = el.getAttribute('data-artist');
                window.location = 'artist.html?artist=' + artistName;
            }
        };
    } else if (type === 'mix' || type === 'track') {
        row.onclick = function(e) {
            let el = e.target;
            while (el && el !== row && !el.hasAttribute('data-idx')) el = el.parentElement;
            if (el && el.hasAttribute('data-idx')) {
                const idx = parseInt(el.getAttribute('data-idx'), 10);
                const queue = items.map(i => ({
                    src: '/muzic2/' + (i.file_path || ''),
                    title: i.title,
                    artist: i.artist || '',
                    cover: '/muzic2/' + (i.cover || 'tracks/covers/placeholder.jpg')
                }));
                window.playTrack({
                    ...queue[idx],
                    queue,
                    queueStartIndex: idx
                });
            }
        };
    }
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"]/g, function (m) {
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m];
    });
}

// removed inline album/artist router; restored original behavior

