// Artist page functionality with robust image path handling and fallbacks
let currentArtist = null;
let artistTracks = [];

// Simple SVG placeholder for images (avoids missing asset files)
const PLACEHOLDER_COVER = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#667eea"/>
      <stop offset="100%" stop-color="#764ba2"/>
    </linearGradient>
  </defs>
  <rect width="300" height="300" fill="url(#g)"/>
  <g fill="#ffffff" opacity="0.9">
    <circle cx="100" cy="150" r="35"/>
    <rect x="145" y="115" width="60" height="70" rx="10"/>
  </g>
</svg>`);

// Normalize/resolve cover path for usage from /public/* pages
function resolveCoverPath(p) {
    if (!p || typeof p !== 'string' || p.trim() === '') return PLACEHOLDER_COVER;
    const s = p.trim();
    if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:')) return s;
    // Ensure paths stored as 'tracks/...' are reachable from /public/* by prefixing '../'
    const idx = s.indexOf('tracks/');
    if (idx !== -1) {
        return '../' + s.slice(idx);
    }
    // Assets already under /public/assets can be used as-is
    if (s.startsWith('assets/')) return s;
    // Default fallback
    return PLACEHOLDER_COVER;
}

function attachImgFallback(imgEl) {
    if (!imgEl) return;
    imgEl.addEventListener('error', () => {
        imgEl.src = PLACEHOLDER_COVER;
    }, { once: true });
}

// Initialize artist page
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const artistName = urlParams.get('artist');
    
    if (artistName) {
        // Preload images if it's Kai Angel
        if (artistName.toLowerCase().includes('kai angel')) {
            preloadKaiAngelImages();
        }
        loadArtistData(artistName);
    } else {
        // Redirect to home if no artist specified
        window.location.href = 'index.php';
    }
});

// Load artist data from API
async function loadArtistData(artistName) {
    try {
        const response = await fetch(`src/api/artist.php?artist=${encodeURIComponent(artistName)}`);
        const data = await response.json();
        
        if (data.error) {
            console.error('Error loading artist:', data.error);
            showError('Артист не найден');
            return;
        }
        
        currentArtist = data;
        artistTracks = data.top_tracks || [];
        
        renderArtistPage(data);
        
    } catch (error) {
        console.error('Error fetching artist data:', error);
        showError('Ошибка загрузки данных артиста');
    }
}

// Render artist page
function renderArtistPage(artist) {
    // Set artist avatar with better image handling
    const avatar = document.getElementById('artist-avatar');
    if (avatar) {
        // Use specific images for Kai Angel
        let avatarSrc = artist.cover;
        if (artist.name && artist.name.toLowerCase().includes('kai angel')) {
            // Use the portrait image for avatar
            avatarSrc = 'tracks/covers/Снимок экрана 2025-07-19 в 11.56.58.png';
        }
        avatar.src = resolveCoverPath(avatarSrc);
        avatar.alt = artist.name || 'Artist';
        attachImgFallback(avatar);
        
        // Add loading animation
        avatar.style.opacity = '0';
        avatar.onload = () => {
            avatar.style.transition = 'opacity 0.3s ease';
            avatar.style.opacity = '1';
        };
    }
    
    // Set artist name with better text handling
    const nameElement = document.getElementById('artist-name');
    if (nameElement) {
        nameElement.textContent = artist.name || '';
        // Add class for specific styling
        if (artist.name && artist.name.toLowerCase().includes('kai angel')) {
            nameElement.parentElement.parentElement.classList.add('kai-angel');
        }
    }
    
    // Set monthly listeners
    const listenersElement = document.getElementById('artist-listeners');
    if (listenersElement) {
        listenersElement.textContent = `${formatNumber(artist.monthly_listeners)} слушателей за месяц`;
    }
    
    // Render popular tracks
    renderPopularTracks(artist.top_tracks || []);
    
    // Render albums
    renderAlbums(artist.albums || []);
    
    // Set up event listeners
    setupEventListeners();
}

// Render popular tracks
function renderPopularTracks(tracks) {
    const container = document.getElementById('popular-tracks');
    if (!container) return;
    
    container.innerHTML = '';
    
    tracks.forEach((track, index) => {
        const trackElement = createTrackElement(track, index + 1);
        container.appendChild(trackElement);
    });
}

// Create track element
function createTrackElement(track, number) {
    const trackDiv = document.createElement('div');
    trackDiv.className = 'track-item-numbered';
    trackDiv.dataset.trackId = track.id;
    
    // Format duration
    const duration = formatDuration(track.duration);
    
    // Generate realistic play count based on track position
    const basePlays = 1000000 - (number * 100000);
    const playCount = formatNumber(Math.max(basePlays, 100000));
    
    // Use better cover images for Kai Angel tracks
    let coverSrc = track.cover;
    if (track.artist && track.artist.toLowerCase().includes('kai angel')) {
        if (track.album && track.album.toLowerCase().includes('angel may cry')) {
            coverSrc = 'tracks/covers/Kai-Angel-ANGEL-MAY-CRY-07.jpg';
        } else if (track.album && track.album.toLowerCase().includes('angel may cry 2')) {
            coverSrc = 'tracks/covers/Снимок экрана 2025-07-14 в 07.03.03.png';
        }
    }
    const finalCover = resolveCoverPath(coverSrc);
    
    trackDiv.innerHTML = `
        <div class="track-number">${number}</div>
        <div class="track-play-icon" style="display: none;">
            <i class="fas fa-play"></i>
        </div>
        <img class="track-cover-small" src="${finalCover}" alt="${track.title || ''}" loading="lazy">
        <div class="track-details">
            <div class="track-title-primary" title="${track.title || ''}">${track.title || ''}</div>
            <div class="track-stats">
                ${Math.random() > 0.7 ? '<span class="track-explicit">E</span>' : ''}
                <span class="track-plays">${playCount}</span>
            </div>
        </div>
        <div class="track-duration">${duration}</div>
        <button class="track-like-btn">
            <i class="far fa-heart"></i>
        </button>
        <button class="track-more-btn">
            <i class="fas fa-ellipsis-h"></i>
        </button>
    `;
    
    // Fallback for image
    const img = trackDiv.querySelector('img.track-cover-small');
    attachImgFallback(img);
    
    // Add click event to play track
    trackDiv.addEventListener('click', (e) => {
        if (!e.target.closest('.track-like-btn') && !e.target.closest('.track-more-btn')) {
            playTrack(track);
        }
    });
    
    // Add like button functionality
    const likeBtn = trackDiv.querySelector('.track-like-btn');
    likeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleLike(likeBtn);
    });
    
    return trackDiv;
}

// Render albums
function renderAlbums(albums) {
    const container = document.getElementById('albums-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    albums.forEach(album => {
        const albumElement = createAlbumElement(album);
        container.appendChild(albumElement);
    });
}

// Create album element
function createAlbumElement(album) {
    const albumDiv = document.createElement('div');
    albumDiv.className = 'album-card';
    albumDiv.dataset.albumTitle = album.title;
    
    // Format album type
    const albumType = album.type === 'album' ? 'Альбом' : 
                     album.type === 'ep' ? 'EP' : 'Сингл';

    const finalCover = resolveCoverPath(album.cover);
    
    albumDiv.innerHTML = `
        <img class="album-cover" src="${finalCover}" alt="${album.title || ''}" loading="lazy">
        <div class="album-title">${album.title || ''}</div>
        <div class="album-info">${albumType} • ${album.track_count} трек${getTrackWordEnding(album.track_count)}</div>
        <button class="album-play-btn">
            <i class="fas fa-play"></i>
        </button>
    `;

    const img = albumDiv.querySelector('img.album-cover');
    attachImgFallback(img);
    
    // Add click event to open album
    albumDiv.addEventListener('click', (e) => {
        if (!e.target.closest('.album-play-btn')) {
            openAlbum(album.title);
        }
    });
    
    // Add play button functionality
    const playBtn = albumDiv.querySelector('.album-play-btn');
    playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        playAlbum(album.title);
    });
    
    return albumDiv;
}

// Setup event listeners
function setupEventListeners() {
    // Play all button
    const playAllBtn = document.getElementById('play-all-btn');
    if (playAllBtn) {
        playAllBtn.addEventListener('click', () => {
            if (artistTracks.length > 0) {
                playTrack(artistTracks[0]);
            }
        });
    }
    
    // Shuffle button
    const shuffleBtn = document.getElementById('shuffle-btn');
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', () => {
            if (artistTracks.length > 0) {
                const randomTrack = artistTracks[Math.floor(Math.random() * artistTracks.length)];
                playTrack(randomTrack);
            }
        });
    }
    
    // Follow button
    const followBtn = document.getElementById('follow-btn');
    if (followBtn) {
        followBtn.addEventListener('click', toggleFollow);
    }
    
    // Show more tracks button
    const showMoreBtn = document.getElementById('show-more-tracks');
    if (showMoreBtn) {
        showMoreBtn.addEventListener('click', showMoreTracks);
    }
}

// Play track function
function playTrack(track) {
    if (!track) return;
    
    // Update player with track info
    const trackTitle = document.getElementById('track-title');
    const trackArtist = document.getElementById('track-artist');
    const currentCover = document.getElementById('current-cover');
    
    if (trackTitle) trackTitle.textContent = track.title || '';
    if (trackArtist) trackArtist.textContent = track.artist || '';
    if (currentCover) {
        currentCover.src = resolveCoverPath(track.cover);
        attachImgFallback(currentCover);
    }
    
    // Use existing player functionality if available
    if (window.loadTrack) {
        window.loadTrack(track);
    }
    
    console.log('Playing track:', track.title);
}

// Play album function
function playAlbum(albumTitle) {
    window.location.href = `album.html?album=${encodeURIComponent(albumTitle)}`;
}

// Open album function
function openAlbum(albumTitle) {
    window.location.href = `album.html?album=${encodeURIComponent(albumTitle)}`;
}

// Toggle like function
function toggleLike(likeBtn) {
    const icon = likeBtn.querySelector('i');
    if (icon.classList.contains('far')) {
        icon.classList.remove('far');
        icon.classList.add('fas');
        likeBtn.style.color = '#1ed760';
    } else {
        icon.classList.remove('fas');
        icon.classList.add('far');
        likeBtn.style.color = '#b3b3b3';
    }
}

// Toggle follow function
function toggleFollow() {
    const followBtn = document.getElementById('follow-btn');
    if (followBtn.textContent.trim() === 'Уже подписаны') {
        followBtn.textContent = 'Подписаться';
        followBtn.style.background = '#1ed760';
        followBtn.style.color = '#000';
    } else {
        followBtn.textContent = 'Уже подписаны';
        followBtn.style.background = 'none';
        followBtn.style.color = '#fff';
    }
}

// Show more tracks function
function showMoreTracks() {
    // In a real app, this would load more tracks from the API
    alert('Функция "Показать больше треков" будет реализована в будущих версиях');
}

// Utility functions
function formatDuration(seconds) {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Image loading optimization
function preloadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = resolveCoverPath(src);
    });
}

// Preload Kai Angel images for better performance
async function preloadKaiAngelImages() {
    const images = [
        'tracks/covers/Снимок экрана 2025-07-19 в 11.56.58.png',
        'tracks/covers/Kai-Angel-ANGEL-MAY-CRY-07.jpg',
        'tracks/covers/Снимок экрана 2025-07-14 в 07.03.03.png'
    ];
    
    try {
        await Promise.all(images.map(src => preloadImage(src)));
        console.log('Kai Angel images preloaded successfully');
    } catch (error) {
        console.warn('Some images failed to preload:', error);
    }
}

function formatNumber(num) {
    if (typeof num !== 'number') return '0';
    return num.toLocaleString('ru-RU');
}

function getTrackWordEnding(count) {
    if (count % 10 === 1 && count % 100 !== 11) {
        return '';
    } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
        return 'а';
    } else {
        return 'ов';
    }
}

function showError(message) {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #fff;">
                <h2>Ошибка</h2>
                <p>${message}</p>
                <button onclick="window.location.href='index.php'" style="background: #1ed760; color: #000; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">
                    Вернуться на главную
                </button>
            </div>
        `;
    }
}
