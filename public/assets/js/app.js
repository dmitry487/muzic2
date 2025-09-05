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
        renderCards('mixes-row', data.mixes, 'mix');
        renderCards('albums-row', data.albums, 'album');
        renderCards('tracks-row', data.tracks, 'track');
        renderCards('artists-row', data.artists, 'artist');
        // Prepare initial queue for the main Play button
        (function prepareInitialQueue() {
            const srcItems = (data.favorites && data.favorites.length ? data.favorites : data.tracks) || [];
            const qRaw = srcItems.map(i => ({
                src: '/muzic2/' + (i.file_path || ''),
                title: i.title,
                artist: i.artist || '',
                cover: '/muzic2/' + (i.cover || 'tracks/covers/placeholder.jpg')
            }));
            window.initialQueue = qRaw.map(t => ({ ...t, src: encodeURI(t.src) }));
        })();
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
        row.className = 'mix-row';
        html = items.map((item, idx) => `
            <div class="mix-card" data-idx="${idx}" data-mix-id="${item.id}">
                <div class="mix-cover-container">
                    <img class="mix-cover" src="/muzic2/${item.cover || 'tracks/covers/placeholder.jpg'}" alt="mix cover">
                    <div class="mix-overlay">
                        <button class="mix-play-btn">
                            <i class="fas fa-play"></i>
                        </button>
                        <div class="mix-info-overlay">
                            <span class="mix-track-count">${item.track_count || 0} треков</span>
                            <span class="mix-duration">${formatDuration(item.total_duration || 0)}</span>
                        </div>
                    </div>
                </div>
                <div class="mix-content">
                    <h3 class="mix-title">${escapeHtml(item.title)}</h3>
                    <p class="mix-description">${escapeHtml(item.description || '')}</p>
                    <div class="mix-stats">
                        <span class="mix-likes">
                            <i class="far fa-heart"></i>
                            ${Math.floor(Math.random() * 1000) + 100}
                        </span>
                        <span class="mix-plays">
                            <i class="fas fa-play"></i>
                            ${formatNumber(Math.floor(Math.random() * 100000) + 10000)}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
    } else if (type === 'artist') {
        row.className = 'artist-row';
        html = items.map((item, idx) => `
            <div class="artist-tile" data-artist="${encodeURIComponent(item.artist)}" data-idx="${idx}">
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
    } else if (type === 'mix') {
        row.onclick = function(e) {
            let el = e.target;
            while (el && el !== row && !el.hasAttribute('data-mix-id')) el = el.parentElement;
            if (el && el.hasAttribute('data-mix-id')) {
                const idx = parseInt(el.getAttribute('data-idx'), 10);
                const mix = items[idx];
                if (mix && mix.tracks && mix.tracks.length > 0) {
                    // Build queue from file_path coming from API
                    const queue = mix.tracks.map(track => ({
                        src: '/muzic2/' + (track.file_path || ''),
                        title: track.title,
                        artist: track.artist,
                        cover: '/muzic2/' + (track.cover || mix.cover)
                    }));
                    // encode URIs for safety
                    const safeQueue = queue.map(t => ({ ...t, src: encodeURI(t.src) }));
                    window.playTrack({
                        ...safeQueue[0],
                        queue: safeQueue,
                        queueStartIndex: 0
                    });
                }
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
    } else if (type === 'track') {
        row.onclick = function(e) {
            let el = e.target;
            while (el && el !== row && !el.hasAttribute('data-idx')) el = el.parentElement;
            if (el && el.hasAttribute('data-idx')) {
                const idx = parseInt(el.getAttribute('data-idx'), 10);
                const queueRaw = items.map(i => ({
                    src: '/muzic2/' + (i.file_path || ''),
                    title: i.title,
                    artist: i.artist || '',
                    cover: '/muzic2/' + (i.cover || 'tracks/covers/placeholder.jpg')
                }));
                const queue = queueRaw.map(t => ({ ...t, src: encodeURI(t.src) }));
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

function formatDuration(seconds) {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function formatNumber(num) {
    if (num >= 1000000) {
        return Math.floor(num / 1000000) + 'M';
    } else if (num >= 1000) {
        return Math.floor(num / 1000) + 'K';
    }
    return num.toString();
}

