// Оптимизированная версия app.js для Windows
// Принудительно используем HTTP вместо HTTPS
if (location.protocol === 'https:') {
    location.replace('http:' + location.href.substring(5));
}

const mainContent = document.getElementById('main-content');
const navHome = document.getElementById('nav-home');
const navSearch = document.getElementById('nav-search');
const navLibrary = document.getElementById('nav-library');
const mainHeader = document.getElementById('main-header');

// Guard: run only if home navigation exists on this page
if (mainContent && navHome && navSearch && navLibrary) {
	function showPage(page) {
		if (page === 'Главная') {
			renderHome();
	} else if (page === 'Поиск') {
		renderSearch();
		} else if (page === 'Моя музыка') {
			renderMyMusic();
		}
	}

	navHome.onclick = () => navigateTo('home');
	navSearch.onclick = () => showPage('Поиск');
	navLibrary.onclick = () => showPage('Моя музыка');

	// Session state
	let currentUser = null;

	// Ensure auth modals exist globally
	ensureAuthModals();

	(async function initSession() {
		try {
			// Используем оптимизированные API для Windows с таймаутом
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 секунды таймаут
			
			const res = await fetch('src/api/user_windows.php', { 
				credentials: 'include',
				signal: controller.signal,
				cache: 'no-cache'
			});
			clearTimeout(timeoutId);
			const data = await res.json();
			currentUser = data.authenticated ? data.user : null;
			renderAuthHeader();
		} catch (e) {
			console.log('Session init failed, continuing without auth');
			currentUser = null;
			renderAuthHeader();
		}
	})();

	function mountUserPanel() {
		if (!mainHeader) return null;
		let panel = document.getElementById('user-panel');
		if (!panel) {
			panel = document.createElement('div');
			panel.id = 'user-panel';
			mainHeader.appendChild(panel);
		}
		return panel;
	}

	function renderAuthHeader() {
		const panel = mountUserPanel();
		if (!panel) return;

		if (currentUser) {
			panel.innerHTML = `
				<span>Привет, ${currentUser.username}</span>
				<button onclick="logout()">Выйти</button>
			`;
		} else {
			panel.innerHTML = `
				<button onclick="open('login-modal')">Войти</button>
				<button onclick="open('register-modal')">Регистрация</button>
			`;
		}
	}

	async function renderHome() {
		mainContent.innerHTML = '<div class="loading">Загрузка...</div>';
		try {
			// Пробуем разные API пути для Windows
			const apiPaths = [
				'src/api/home_windows.php',
				'src/api/home.php',
				'../src/api/home.php',
				'/muzic2/src/api/home.php'
			];
			
			let data = null;
			for (const path of apiPaths) {
				try {
					const controller = new AbortController();
					const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 секунд таймаут
					
					const res = await fetch(path, { 
						signal: controller.signal,
						cache: 'no-cache'
					});
					clearTimeout(timeoutId);
					
					if (res.ok) {
						data = await res.json();
						console.log('Successfully loaded data from:', path);
						break;
					}
				} catch (e) {
					console.log('Failed to load from:', path, e.message);
					continue;
				}
			}
			
			if (!data) {
				throw new Error('Не удалось загрузить данные ни с одного API');
			}
			
			// Загружаем лайки параллельно с таймаутом
			window.__likedSet = new Set();
			try {
				const likesPaths = [
					'src/api/likes_windows.php',
					'src/api/likes.php',
					'../src/api/likes.php',
					'/muzic2/src/api/likes.php'
				];
				
				for (const path of likesPaths) {
					try {
						const likesController = new AbortController();
						const likesTimeoutId = setTimeout(() => likesController.abort(), 3000);
						
						const likesRes = await fetch(path, { 
							credentials: 'include',
							signal: likesController.signal,
							cache: 'no-cache'
						});
						clearTimeout(likesTimeoutId);
						
						if (likesRes.ok) {
							const likes = await likesRes.json();
							window.__likedSet = new Set((likes.tracks||[]).map(t=>t.id));
							console.log('Successfully loaded likes from:', path);
							break;
						}
					} catch (e) {
						continue;
					}
				}
			} catch(e){ 
				console.log('Likes loading failed, continuing without likes');
				window.__likedSet = new Set(); 
			}
			
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

	// Упрощенные функции для Windows
	function renderCards(containerId, items, type) {
		const container = document.getElementById(containerId);
		if (!container || !items) return;
		
		container.innerHTML = items.map(item => {
			if (type === 'track') {
				return createTrackCard(item);
			} else if (type === 'album') {
				return createAlbumCard(item);
			} else if (type === 'artist') {
				return createArtistCard(item);
			}
			return '';
		}).join('');
	}

	function createTrackCard(track) {
		const isLiked = window.__likedSet && window.__likedSet.has(track.id);
		return `
			<div class="card track-card" data-track-id="${track.id}">
				<div class="card-cover">
					<img src="${track.cover || 'assets/images/default-cover.jpg'}" alt="${track.title}">
					<button class="play-btn" onclick="playTrack(${track.id})">▶</button>
				</div>
				<div class="card-info">
					<h4>${track.title}</h4>
					<p>${track.artist}</p>
					<button class="heart-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike(${track.id})">♥</button>
				</div>
			</div>
		`;
	}

	function createAlbumCard(album) {
		return `
			<div class="card album-card" onclick="navigateTo('album', '${encodeURIComponent(album.album)}', '${encodeURIComponent(album.artist)}')">
				<div class="card-cover">
					<img src="${album.cover || 'assets/images/default-cover.jpg'}" alt="${album.album}">
				</div>
				<div class="card-info">
					<h4>${album.album}</h4>
					<p>${album.artist}</p>
				</div>
			</div>
		`;
	}

	function createArtistCard(artist) {
		return `
			<div class="card artist-card" onclick="navigateTo('artist', '${encodeURIComponent(artist.artist)}')">
				<div class="card-cover">
					<img src="${artist.cover || 'assets/images/default-cover.jpg'}" alt="${artist.artist}">
				</div>
				<div class="card-info">
					<h4>${artist.artist}</h4>
				</div>
			</div>
		`;
	}

	// Упрощенные функции навигации
	function navigateTo(type, ...params) {
		if (type === 'home') {
			renderHome();
		} else if (type === 'album') {
			renderAlbum(params[0], params[1]);
		} else if (type === 'artist') {
			renderArtist(params[0]);
		}
	}

	function renderAlbum(albumTitle, artist) {
		mainContent.innerHTML = `<h2>${decodeURIComponent(albumTitle)} - ${decodeURIComponent(artist)}</h2><p>Загрузка альбома...</p>`;
	}

	function renderArtist(artistName) {
		mainContent.innerHTML = `<h2>${decodeURIComponent(artistName)}</h2><p>Загрузка артиста...</p>`;
	}

	function renderSearch() {
		mainContent.innerHTML = '<h2>Поиск</h2><p>Функция поиска в разработке</p>';
	}

	function renderMyMusic() {
		mainContent.innerHTML = '<h2>Моя музыка</h2><p>Функция в разработке</p>';
	}

	// Упрощенные функции
	function playTrack(trackId) {
		console.log('Playing track:', trackId);
	}

	function toggleLike(trackId) {
		console.log('Toggle like:', trackId);
	}

	function logout() {
		currentUser = null;
		renderAuthHeader();
	}

	function open(modalId) {
		console.log('Open modal:', modalId);
	}

	function ensureAuthModals() {
		// Упрощенная версия без модальных окон
	}

	// Запускаем главную страницу
	renderHome();
}
