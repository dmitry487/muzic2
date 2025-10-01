// Принудительно используем HTTP вместо HTTPS
if (location.protocol === 'https:') {
    location.replace('http:' + location.href.substring(5));
}

// Измеряем время загрузки только для Windows
const isWindows = navigator.userAgent.indexOf('Windows') !== -1;
console.log('User Agent:', navigator.userAgent);
console.log('isWindows:', isWindows);
if (isWindows) {
    window.startTime = Date.now();
    console.log('Windows detected - starting load timer');
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

	// SPA will handle initial page load

	// Session state
	let currentUser = null;

// Detect operating system
const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const isWindows = navigator.platform.toUpperCase().indexOf('WIN') >= 0;

// API endpoints based on OS
const getAuthAPI = () => isWindows ? '/muzic2/src/api/windows_auth.php' : '/muzic2/src/api/login.php';
const getUserAPI = () => isWindows ? '/muzic2/src/api/windows_auth.php' : '/muzic2/src/api/user.php';
const getLikesAPI = () => isWindows ? '/muzic2/src/api/windows_likes.php' : '/muzic2/src/api/likes.php';

	// Ensure auth modals exist globally
	ensureAuthModals();

	// Wait for DOM to be ready
	function waitForDOM() {
		return new Promise((resolve) => {
			if (document.readyState === 'loading') {
				document.addEventListener('DOMContentLoaded', resolve);
			} else {
				resolve();
			}
		});
	}

	(async function initSession() {
		// Wait for DOM to be ready
		await waitForDOM();
		// Ультра-быстрая инициализация сессии для Windows
		if (isWindows) {
			console.log('Windows detected - using ultra-fast session init');
			try {
				const res = await fetch('/muzic2/src/api/user_windows.php', { credentials: 'include' });
				const data = await res.json();
				currentUser = data.authenticated ? data.user : null;
				renderAuthHeader();
			} catch (e) {
				console.error('Windows session init error:', e);
				currentUser = null;
				renderAuthHeader();
			}
			
			// Принудительно показываем кнопки авторизации, если пользователь не авторизован
			if (!currentUser) {
				setTimeout(() => {
					renderAuthHeader();
				}, 100);
			}
			return;
		}
		
		// Оригинальная логика для Mac
		try {
			const res = await fetch(getUserAPI(), { credentials: 'include' });
			const data = await res.json();
			currentUser = data.authenticated ? data.user : null;
			renderAuthHeader();
		} catch (e) {
			console.error('Session init error:', e);
			currentUser = null;
			renderAuthHeader();
		}
		
		// Принудительно показываем кнопки авторизации, если пользователь не авторизован
		if (!currentUser) {
			setTimeout(() => {
				renderAuthHeader();
			}, 100);
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
				<div class="user-menu">
					<button id="user-menu-btn" class="btn">${escapeHtml(currentUser.username || '')}</button>
					<div id="user-menu-popover" class="popover" style="display:none; position:absolute; right:12px; top:52px; background:#1a1a1a; border:1px solid #333; border-radius:12px; padding:12px; min-width:240px; z-index:1000; box-shadow:0 8px 24px rgba(0,0,0,.4)">
						<div style="padding:8px 4px; color:#b3b3b3">${escapeHtml(currentUser.username || '')}</div>
						<hr style="border:0;border-top:1px solid #2a2a2a; margin:8px 0">
						<button id="logout-btn" class="btn" style="width:100%; background:#2a2f34; color:#fff; border:0; padding:.6rem 1rem; border-radius:8px; cursor:pointer;">Выйти</button>
					</div>
				</div>
			`;
			const btn = document.getElementById('user-menu-btn');
			const pop = document.getElementById('user-menu-popover');
			if (btn && pop) {
				btn.onclick = (e) => { e.stopPropagation(); pop.style.display = pop.style.display==='none'?'block':'none'; };
				document.addEventListener('click', (e)=>{ if(pop.style.display==='block' && !e.target.closest('#user-menu-popover') && e.target!==btn){ pop.style.display='none'; } });
				const logoutBtn = document.getElementById('logout-btn');
				if (logoutBtn){ logoutBtn.onclick = async ()=>{ try{ await fetch('/muzic2/src/api/logout.php',{ method:'POST', credentials:'include' }); location.reload(); }catch(_){ location.reload(); } } }
			}
		} else {
			panel.innerHTML = `
				<div class="auth-buttons">
					<button id="header-login" class="btn primary">Войти</button>
					<button id="header-register" class="btn">Регистрация</button>
				</div>
			`;
			// Robust modal opening for header buttons
			attachAuthModalTriggers();
			const headerLogin = document.getElementById('header-login');
			const headerRegister = document.getElementById('header-register');
			const openModal = (id) => {
				try {
					ensureAuthModals();
					const o = document.querySelector('#auth-modals .modal-overlay');
					const c = document.querySelector('#auth-modals .modal-center');
					if (!o || !c) return;
					o.style.display='block';
					c.style.display='flex';
					document.querySelectorAll('#auth-modals .modal').forEach(m=>m.style.display='none');
					const box = document.getElementById(id);
					if (box) box.style.display='block';
					setTimeout(()=>{ const first = document.querySelector(`#${id} input`); if(first) first.focus(); }, 0);
				} catch(e) {}
			};
			if (headerLogin) headerLogin.onclick = () => openModal('login-modal');
			if (headerRegister) headerRegister.onclick = () => openModal('register-modal');
		}
	}

	async function renderHome() {
		mainContent.innerHTML = '<div class="loading">Загрузка...</div>';
		
		// Для Windows используем ультра-быстрый API
		console.log('renderHome - isWindows:', isWindows);
		if (isWindows) {
			console.log('Windows detected - using ultra-fast API');
			try {
				const res = await fetch('/muzic2/src/api/home_windows.php');
				const data = await res.json();
				
				// Отключаем лайки для Windows (самая медленная часть)
				window.__likedSet = new Set();
				
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
				
				addFilterButtonHandlers();
				
				// Показываем время загрузки для Windows
				const loadTime = Date.now() - (window.startTime || Date.now());
				console.log('Windows page load time:', loadTime + 'ms');
				const header = document.querySelector('#main-header .logo');
				if (header) {
					header.textContent = `Muzic2 (${loadTime}ms)`;
				}
				return;
			} catch (e) {
				console.error('Windows API error:', e);
				mainContent.innerHTML = '<div class="error">Ошибка загрузки главной страницы</div>';
				return;
			}
		}
		
		// Оригинальная логика для Mac
		try {
			const res = await fetch('/muzic2/public/src/api/home.php?limit_tracks=8&limit_albums=6&limit_artists=6&limit_mixes=6&limit_favorites=6');
			const data = await res.json();
			// Load liked set for current user to render green hearts
			try {
				const likesRes = await fetch(getLikesAPI(), { credentials: 'include' });
				const likes = await likesRes.json();
				window.__likedSet = new Set((likes.tracks||[]).map(t=>t.id));
			} catch(e){ window.__likedSet = new Set(); }
			
			mainContent.innerHTML = `
				<section class="main-filters">
					<button class="filter-btn active">Все</button>
					<button class="filter-btn">Музыка</button>
					<button class="filter-btn">Артисты</button>
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
			// Favorites удалены с главной: открываем их в разделе "Моя музыка"
			renderCards('mixes-row', data.mixes, 'track');
			renderCards('albums-row', data.albums, 'album');
			renderCards('tracks-row', data.tracks, 'track');
			renderCards('artists-row', data.artists, 'artist');
			
			addFilterButtonHandlers();
		} catch (e) {
			mainContent.innerHTML = '<div class="error">Ошибка загрузки главной страницы</div>';
		}
	}

	async function addFilterButtonHandlers() {
		const filterBtns = document.querySelectorAll('.filter-btn');
		
		filterBtns.forEach(btn => {
			btn.addEventListener('click', async () => {
				filterBtns.forEach(b => b.classList.remove('active'));
				btn.classList.add('active');
				
				const filterType = btn.textContent.trim();
				console.log('Filter clicked:', filterType);
				
				if (filterType === 'Все') {
					document.querySelectorAll('.main-section').forEach(section => {
						section.style.display = 'block';
					});
				} else if (filterType === 'Музыка') {
					document.querySelectorAll('.main-section').forEach(section => {
						section.style.display = 'none';
					});

					const tracksSection = document.getElementById('tracks-section');
					const albumsSection = document.getElementById('albums-section');
					
					if (tracksSection) {
						tracksSection.style.display = 'block';
						tracksSection.querySelector('h3').textContent = 'Случайные треки';
						await loadMusicContent('tracks', 15);
					}
					
					if (albumsSection) {
						albumsSection.style.display = 'block';
						albumsSection.querySelector('h3').textContent = 'Случайные альбомы';
						await loadMusicContent('albums', 12);
					}
				} else if (filterType === 'Артисты') {
					document.querySelectorAll('.main-section').forEach(section => {
						section.style.display = 'none';
					});
					
					const artistsSection = document.getElementById('artists-section');
					if (artistsSection) {
						artistsSection.style.display = 'block';
						artistsSection.querySelector('h3').textContent = 'Артисты';
						await loadMusicContent('artists', 24);
					}
				}
			});
		});
	}
	
	async function loadMusicContent(type, limit) {
		try {
			let url, containerId;
			
			if (type === 'tracks') {
				url = `/muzic2/public/src/api/random_tracks.php?limit=${limit}`;
				containerId = 'tracks-row';
			} else if (type === 'albums') {
				url = `/muzic2/public/src/api/home.php?limit_albums=${limit}`;
				containerId = 'albums-row';
			} else if (type === 'artists') {
				url = `/muzic2/public/src/api/home.php?limit_artists=${limit}`;
				containerId = 'artists-row';
			}
			
			const response = await fetch(url, { credentials: 'include' });
			const data = await response.json();
			
			if (type === 'tracks') {
				renderCards(containerId, data.tracks || [], 'track');
			} else if (type === 'albums') {
				renderCards(containerId, data.albums || [], 'album');
			} else if (type === 'artists') {
				renderCards(containerId, data.artists || [], 'artist');
			}
		} catch (error) {
			console.error('Error loading music content:', error);
		}
	}
	

	// =====================
	// Helper Functions
	// =====================
	function createAlbumCard(album) {
		return `
			<div class="tile" onclick="navigateTo('album', { album: '${encodeURIComponent(album.title)}' })">
				<img class="tile-cover" loading="lazy" src="/muzic2/${album.cover || 'tracks/covers/placeholder.jpg'}" alt="cover">
				<div class="tile-title">${escapeHtml(album.title)}</div>
				<div class="tile-desc">${escapeHtml(album.artist || '')}</div>
				<div class="tile-play">&#9654;</div>
			</div>
		`;
	}

	// =====================
	// My Music (Favorites & Playlists)
	// =====================
	async function renderMyMusic() {
		// Упрощенная "Моя музыка" для Windows (без лайков)
		if (isWindows) {
			console.log('Windows detected - using simplified My Music');
			mainContent.innerHTML = '<div class="loading">Загрузка...</div>';
			injectMyMusicStyles();

			try {
				const listsRes = await fetch('/muzic2/src/api/playlists_windows.php', { credentials: 'include' });
				const playlistsData = await listsRes.json();
				const playlists = playlistsData.playlists || [];

				// Отключаем лайки альбомов для Windows
				window.__likedAlbums = new Set();

				mainContent.innerHTML = `
					<div class="my-music-container">
						<div class="my-music-header">
							<h2>Моя музыка</h2>
						</div>
						<div class="my-music-content">
							<div class="playlists-section">
								<h3>Плейлисты</h3>
								<div class="playlists-grid" id="playlists-grid">
									${playlists.map(pl => `
										<div class="playlist-tile" data-playlist-id="${pl.id}" data-playlist-name="${pl.name}">
											<div class="playlist-cover">
												${pl.cover ? `<img src="${pl.cover}" alt="${pl.name}">` : '<div class="playlist-placeholder">🎵</div>'}
											</div>
											<div class="playlist-info">
												<h4>${pl.name}</h4>
												<p>${pl.track_count || 0} треков</p>
											</div>
										</div>
									`).join('')}
								</div>
							</div>
							<div class="favorite-albums-section">
								<h3>Любимые альбомы</h3>
								<div class="albums-grid" id="favorite-albums-grid">
									<p>Функция лайков отключена для оптимизации скорости на Windows</p>
								</div>
							</div>
						</div>
					</div>
				`;
				
				// Показываем время загрузки для Windows
				const loadTime = Date.now() - (window.startTime || Date.now());
				console.log('Windows My Music load time:', loadTime + 'ms');
				return;
			} catch (e) {
				console.error('Windows My Music error:', e);
				mainContent.innerHTML = '<div class="error">Ошибка загрузки моей музыки</div>';
				return;
			}
		}
		
		// Оригинальная логика для Mac
		mainContent.innerHTML = '<div class="loading">Загрузка...</div>';
		injectMyMusicStyles();

		try {
			const listsRes = await fetch('/muzic2/src/api/playlists.php', { credentials: 'include' });
			const playlistsData = await listsRes.json();
			const playlists = playlistsData.playlists || [];

			// Load liked albums
			const likesRes = await fetch(getLikesAPI(), { credentials: 'include' });
			const likesData = await likesRes.json();
			const likedAlbums = likesData.albums || [];

			// Get full album info for liked albums
			let albumCards = '<div class="empty">Пока нет любимых альбомов</div>';
			if (likedAlbums.length > 0) {
				try {
					// Get all albums from dedicated API
					const allAlbumsRes = await fetch('/muzic2/src/api/all_albums.php');
					const allAlbumsData = await allAlbumsRes.json();
					const allAlbums = allAlbumsData.albums || [];
					
					// Match liked albums with full album data
					const matchedAlbums = await Promise.all(likedAlbums.map(async (likedAlbum) => {
						// Try exact match first
						let matched = allAlbums.find(album => 
							album.album && album.album.toLowerCase() === likedAlbum.album_title.toLowerCase()
						);
						
						// If no exact match, try partial match
						if (!matched) {
							matched = allAlbums.find(album => 
								album.album && album.album.toLowerCase().includes(likedAlbum.album_title.toLowerCase())
							);
						}
						
						// If still no match, try reverse partial match
						if (!matched) {
							matched = allAlbums.find(album => 
								album.album && likedAlbum.album_title.toLowerCase().includes(album.album.toLowerCase())
							);
						}
						
						// If still no match, try to find by searching tracks
						if (!matched) {
							try {
								// Используем быстрый API для Windows
								const searchApiUrl = isWindows ? 
									`/muzic2/src/api/search_windows.php?q=${encodeURIComponent(likedAlbum.album_title)}&type=albums` :
									`/muzic2/src/api/search.php?q=${encodeURIComponent(likedAlbum.album_title)}&type=albums`;
								
								const searchRes = await fetch(searchApiUrl);
								const searchData = await searchRes.json();
								if (searchData.albums && searchData.albums.length > 0) {
									matched = searchData.albums[0];
								}
							} catch (e) {
								// Ignore search errors
							}
						}
						
						return matched ? {
							title: matched.album || matched.title,
							artist: matched.artist,
							cover: matched.cover
						} : {
							title: likedAlbum.album_title,
							artist: 'Неизвестный артист',
							cover: 'tracks/covers/placeholder.jpg'
						};
					}));
					
					albumCards = matchedAlbums.map(album => createAlbumCard(album)).join('');
				} catch (e) {
					console.error('Error loading album info:', e);
					// Fallback: show albums with basic info
					albumCards = likedAlbums.map(album => createAlbumCard({
						title: album.album_title,
						artist: 'Неизвестный артист',
						cover: 'tracks/covers/placeholder.jpg'
					})).join('');
				}
			}

			mainContent.innerHTML = `
				<section class="my-section">
					<div class="my-header">
						<h2>Любимые альбомы</h2>
					</div>
					<div class="tile-row" id="albums-row">
						${albumCards}
					</div>
				</section>
				<section class="my-section">
					<div class="my-header">
						<h2>Мои плейлисты</h2>
						<div class="my-actions">
							<button id="create-playlist" class="btn primary">Создать плейлист</button>
						</div>
					</div>
					<div class="tile-row" id="playlists-row">
						${playlists.map(pl => playlistTile(pl)).join('') || '<div class="empty">Пока нет плейлистов</div>'}
					</div>
				</section>
				<div id="playlist-view"></div>
			`;

			document.getElementById('create-playlist').onclick = () => openCreatePlaylistDialog();

			// Robust click binding for playlist tiles (no reliance on global delegation)
			const tiles = document.querySelectorAll('#playlists-row .playlist-tile');
			tiles.forEach(tile => {
				tile.onclick = (e)=>{
					e.preventDefault(); e.stopPropagation();
					const playlistId = tile.dataset.playlistId;
					const playlistName = tile.dataset.playlistName;
					if (playlistId && playlistName) { openPlaylist(playlistId, playlistName); }
				};
			});
			// Do not auto-open any playlist; open only on explicit user click
		} catch (e) {
			mainContent.innerHTML = '<div class="error">Ошибка загрузки</div>';
		}
	}

	// Global delegation for heart toggle
		document.addEventListener('click', async (e) => {
		const btn = e.target.closest('.heart-btn, .album-like-btn');
		if (!btn) return;
		if (!currentUser) { attachAuthModalTriggers(); const open = id => { document.querySelector('#auth-modals .modal-overlay').style.display='block'; document.getElementById(id).style.display='block'; }; open('login-modal'); return; }
		
		// Handle track likes
		const trackId = Number(btn.getAttribute('data-track-id'));
		if (trackId) {
			if (btn.classList.contains('liked')) {
				await fetch(getLikesAPI(), { method:'DELETE', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ track_id: trackId })});
				btn.classList.remove('liked');
				window.__likedSet && window.__likedSet.delete(trackId);
				try{ document.dispatchEvent(new CustomEvent('likes:updated', { detail:{ trackId, liked:false } })); }catch(_){ }
			} else {
				await fetch(getLikesAPI(), { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ track_id: trackId })});
				btn.classList.add('liked');
				if (!window.__likedSet) window.__likedSet = new Set();
				window.__likedSet.add(trackId);
				try{ document.dispatchEvent(new CustomEvent('likes:updated', { detail:{ trackId, liked:true } })); }catch(_){ }
			}
			return;
		}
		
		// Handle album likes
		const albumTitle = btn.getAttribute('data-album-title');
		if (albumTitle) {
			try {
				if (btn.classList.contains('liked')) {
					const res = await fetch(getLikesAPI(), { method:'DELETE', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ album_title: albumTitle })});
					if (res.ok) {
						btn.classList.remove('liked');
						window.__likedAlbums && window.__likedAlbums.delete(albumTitle);
						// Update all album buttons with same title
						document.querySelectorAll(`[data-album-title="${albumTitle}"]`).forEach(b => b.classList.remove('liked'));
						// Force reload album likes to sync state
						setTimeout(() => loadAlbumLikes(), 100);
					} else {
						console.error('Failed to remove album like:', res.status);
					}
				} else {
					const res = await fetch(getLikesAPI(), { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ album_title: albumTitle })});
					if (res.ok) {
						btn.classList.add('liked');
						if (!window.__likedAlbums) window.__likedAlbums = new Set();
						window.__likedAlbums.add(albumTitle);
						// Update all album buttons with same title
						document.querySelectorAll(`[data-album-title="${albumTitle}"]`).forEach(b => b.classList.add('liked'));
						// Force reload album likes to sync state
						setTimeout(() => loadAlbumLikes(), 100);
					} else {
						console.error('Failed to add album like:', res.status);
					}
				}
			} catch (error) {
				console.error('Error handling album like:', error);
			}
		}
	});

	function playlistTile(pl) {
		// Use special cover for "Любимые треки" playlist, otherwise use placeholder
		const isFavorites = (String(pl.name||'').trim().toLowerCase() === 'любимые треки');
		const cover = isFavorites ? '/muzic2/public/assets/img/playlist-placeholder.png' : (pl.cover ? `/muzic2/${pl.cover}` : '/muzic2/public/assets/img/playlist-placeholder.png');
		const safeName = escapeHtml(pl.name);
		return `
			<div class="tile playlist-tile" id="pl-${pl.id}" data-playlist-id="${pl.id}" data-playlist-name="${safeName}" data-cover="${cover}" style="cursor: pointer;" onclick="window.openPlaylistProxy && window.openPlaylistProxy('${pl.id}','${safeName.replace(/'/g,"\'")}','${cover}')">
				<img class="tile-cover" src="${cover}" alt="cover">
				<div class="tile-title">${safeName}</div>
				<div class="tile-desc">Плейлист</div>
				<div class="tile-play">&#9654;</div>
			</div>
		`;
	}

    async function openPlaylist(playlistId, playlistName, coverOverride) {
        // Render playlist as album-like page (full-page), even if empty
		try {
			const res = await fetch(`/muzic2/src/api/playlists.php?playlist_id=${playlistId}`, { credentials: 'include' });
			const data = await res.json();
            const tracks = Array.isArray(data.tracks) ? data.tracks : [];
            // Determine cover: prefer cover passed from tile, else special for favorites or first track
            let cover = coverOverride || '';
            if (!cover) {
                const isFavorites = (String(playlistName||'').trim().toLowerCase() === 'любимые треки');
                cover = isFavorites ? '/muzic2/public/assets/img/playlist-placeholder.png' : ('/muzic2/' + ((tracks[0] && tracks[0].cover) || 'tracks/covers/placeholder.jpg'));
            }
            const finalCover = encodeURI(cover);
            const totalDuration = tracks.reduce((s,t)=> s + (parseInt(t.duration)||0), 0);
            const minutes = Math.floor(totalDuration/60); const seconds = totalDuration%60;
            // Build page
            const albumStyles = `
            <style>
            .album-header{display:flex;align-items:flex-end;gap:2.5rem;margin-top:2.5rem;margin-bottom:2.5rem}
            .album-cover{width:220px;height:220px;border-radius:18px;object-fit:cover;box-shadow:0 8px 32px rgba(30,185,84,0.18);background:#181818}
            .album-meta{display:flex;flex-direction:column;gap:1.2rem}
            .album-title{font-size:3.2rem;font-weight:900;color:#fff;margin-bottom:0.5rem}
            .album-artist{font-size:1.3rem;color:#b3b3b3;font-weight:600}
            .tracks-table{width:100%;border-collapse:collapse;margin-bottom:2rem}
            .tracks-table th,.tracks-table td{padding:0.7rem 1rem;text-align:left;color:#fff;font-size:1.08rem}
            .tracks-table th{color:#b3b3b3;font-weight:600;font-size:1.02rem;border-bottom:1px solid #232323}
            .tracks-table tr{transition:background 0.15s;cursor:pointer;position:relative}
            .tracks-table tr:hover{background:#232323}
            .track-num{color:#b3b3b3;width:2.5rem;font-size:1.02rem}
            .track-title .track-artist{color:#b3b3b3;font-size:1.01rem;font-weight:400;margin-top:0.2rem}
            .track-duration{color:#b3b3b3;font-size:1.01rem;text-align:center;width:4.5rem;vertical-align:middle}
            .exp-badge{display:inline-block;width:16px;height:16px;line-height:16px;text-align:center;margin:0 6px 0 0;border:0;border-radius:3px;font-size:10px;font-weight:800;color:#2b2b2b;background:#cfcfcf;vertical-align:middle}
            </style>`;
            mainContent.innerHTML = albumStyles + `
                <div class="album-header">
                    <img class="album-cover" loading="lazy" src="${finalCover}" alt="cover" onerror="this.onerror=null;this.src='/muzic2/tracks/covers/m1000x1000.jpeg';">
                    <div class="album-meta">
                        <div class="album-title">${escapeHtml(playlistName)}</div>
                        <div class="album-artist">Плейлист • ${tracks.length} треков • ${minutes}:${String(seconds).padStart(2,'0')}</div>
						</div>
					</div>
                <table class="tracks-table">
                    <thead><tr><th>#</th><th>Название</th><th>⏱</th></tr></thead>
                    <tbody id="tracks-tbody"></tbody>
                </table>
            `;
            const tbody = document.getElementById('tracks-tbody');
            if (!tracks.length) {
                const tr=document.createElement('tr'); tr.innerHTML = `<td class="track-num">—</td><td class="track-title"><div class="track-artist">Пока нет треков. Лайкайте треки сердечком — они появятся здесь.</div></td><td class="track-duration">0:00</td>`; tbody.appendChild(tr);
            } else {
                tracks.forEach((t,i)=>{
                    const tr=document.createElement('tr');
                    const d = parseInt(t.duration)||0; const mm=Math.floor(d/60); const ss=d%60;
                    tr.innerHTML = `
                        <td class="track-num">${i+1}</td>
                        <td class="track-title">${t.explicit?'<span class="exp-badge">E</span>':''}${escapeHtml(t.title||'')}<div class="track-artist">${escapeHtml((t.feats && String(t.feats).trim()) ? `${t.artist||''}, ${t.feats}` : (t.artist||''))}</div></td>
                        <td class="track-duration">${mm}:${String(ss).padStart(2,'0')}</td>`;
                    tr.onclick = ()=>{
                        const q = tracks.map(tt=>({
                            src: (/^https?:/i.test(tt.src||'')) ? tt.src : ('/muzic2/' + ((tt.src||'').indexOf('tracks/')!==-1 ? (tt.src||'').slice((tt.src||'').indexOf('tracks/')) : (tt.src||'').replace(/^\/+/, ''))),
                            title: tt.title,
                            artist: (tt.feats && String(tt.feats).trim()) ? `${tt.artist||''}, ${tt.feats}` : (tt.artist||''),
                            feats: tt.feats||'',
                            cover: '/muzic2/' + (tt.cover || 'tracks/covers/placeholder.jpg'),
                            video_url: tt.video_url || ''
                        }));
                        window.playTrack && window.playTrack({ queue:q, queueStartIndex:i });
                    };
                    tbody.appendChild(tr);
                });
            }
		} catch (e) {
            mainContent.innerHTML = '<div class="error">Ошибка загрузки плейлиста</div>';
		}
	}

	// Expose safe proxy for inline onclick
	window.openPlaylistProxy = function(pid, pname, cover){ try{ openPlaylist(pid, pname, cover); }catch(_){} };

	async function openCreatePlaylistDialog() {
		const name = prompt('Название плейлиста');
		if (!name) return;
		await fetch('/muzic2/src/api/playlists.php', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
		renderMyMusic();
	}

	function injectMyMusicStyles() {
		if (document.getElementById('mymusic-styles')) return;
		const s = document.createElement('style');
		s.id = 'mymusic-styles';
		s.textContent = `
			.my-section { margin: 2rem 0; }
			.my-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
			.my-actions { display: flex; gap: .5rem; }
			.btn { background: #333; color: #fff; border: none; padding: .5rem 1rem; border-radius: 6px; cursor: pointer; }
			.btn.primary { background: #1db954; }
			.btn.danger { background: #c0392b; }
			.empty { color: #666; padding: 1rem; }
			.auth-required { text-align: center; padding: 3rem 1rem; }
			.auth-actions { display: flex; gap: .5rem; justify-content: center; margin-top: 1rem; }
			.card { position: relative; }
			.heart-btn { position:absolute; right:.5rem; bottom:.5rem; background:#222; border:1px solid #333; color:#bbb; border-radius:999px; width:36px; height:36px; cursor:pointer; }
			.heart-btn.liked { background:#1db954; border-color:#1db954; color:#fff; }
			
			#playlist-view {
				display: block;
				margin-top: 2rem;
			}
			
			.playlist-section {
				background: #1a1a1a;
				border-radius: 8px;
				padding: 1.5rem;
			}
			
			.playlist-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 1.5rem;
				padding-bottom: 1rem;
				border-bottom: 1px solid #333;
			}
			
			.playlist-header h3 {
				color: #fff;
				margin: 0;
				font-size: 1.5rem;
			}
			
			.playlist-actions {
				display: flex;
				gap: 0.5rem;
			}
			
			.playlist-actions .btn {
				padding: 0.5rem 1rem;
				font-size: 0.9rem;
			}
			
			.playlist-actions .btn.danger {
				background: #dc3545;
				color: white;
			}
			
		`;
		document.head.appendChild(s);
	}

	// =====================
	// Auth Modals (basic)
	// =====================
	function ensureAuthModals() {
		if (document.getElementById('auth-modals')) return;
		const wrap = document.createElement('div');
		wrap.id = 'auth-modals';
		wrap.innerHTML = `
			<div class="modal-overlay" style="display:none"></div>
			<div class="modal-center" style="display:none">
				<div class="modal" id="login-modal" role="dialog" aria-modal="true" style="display:none">
					<h3>Вход</h3>
					<input id="login-login" placeholder="Email или логин" autocomplete="username">
					<input id="login-password" type="password" placeholder="Пароль" autocomplete="current-password">
					<div id="login-error" class="modal-error" style="display:none"></div>
					<div class="modal-actions">
						<button id="login-submit" class="btn primary">Войти</button>
						<button id="login-close" class="btn">Отмена</button>
					</div>
				</div>
				<div class="modal" id="register-modal" role="dialog" aria-modal="true" style="display:none">
					<h3>Регистрация</h3>
					<input id="reg-email" placeholder="Email" autocomplete="email">
					<input id="reg-username" placeholder="Логин" autocomplete="username">
					<input id="reg-password" type="password" placeholder="Пароль (мин. 6)" autocomplete="new-password">
					<div id="reg-error" class="modal-error" style="display:none"></div>
					<div class="modal-actions">
						<button id="reg-submit" class="btn primary">Создать</button>
						<button id="reg-close" class="btn">Отмена</button>
					</div>
				</div>
			</div>
		`;
		document.body.appendChild(wrap);
		const styles = document.createElement('style');
		styles.textContent = `
			.modal-overlay{ position:fixed; inset:0; background:rgba(0,0,0,.7); backdrop-filter: blur(2px); z-index:20000; }
			.modal-center{ position:fixed; inset:0; display:flex; align-items:center; justify-content:center; z-index:20001; pointer-events:none; }
			.modal{ position:relative; background:#181818; color:#fff; border:1px solid #2a2a2a; border-radius:12px; padding:1rem; width:92%; max-width:420px; box-shadow:0 20px 60px rgba(0,0,0,.6); pointer-events:auto; }
			.modal h3{ margin:0 0 .8rem 0; font-weight:700; }
			.modal input{ width:100%; margin:.4rem 0; padding:.7rem .8rem; border:1px solid #333; border-radius:8px; background:#121212; color:#fff; outline:none; }
			.modal input:focus{ border-color:#1db954; }
			.modal-actions{ margin-top:.7rem; display:flex; gap:.5rem; justify-content:flex-end; }
			.modal-error{ margin-top:.4rem; background:#2a1b1b; color:#ff6b6b; border:1px solid #4b2323; border-radius:8px; padding:.6rem .8rem; font-size:.92rem; }
		`;
		document.head.appendChild(styles);
	}

	function attachAuthModalTriggers() {
		const overlay = () => document.querySelector('#auth-modals .modal-overlay');
		const center = () => document.querySelector('#auth-modals .modal-center');
		const open = id => { ensureAuthModals(); const o=overlay(); const c=center(); o.style.display='block'; c.style.display='flex'; document.querySelectorAll('#auth-modals .modal').forEach(m=>m.style.display='none'); document.getElementById(id).style.display='block'; setTimeout(()=>{ const first=document.querySelector(`#${id} input`); if(first) first.focus(); }, 0); };
		const closeAll = () => { const o=overlay(); const c=center(); if(o) o.style.display='none'; if(c) c.style.display='none'; document.querySelectorAll('#auth-modals .modal').forEach(m=>m.style.display='none'); };
		const loginBtn = document.getElementById('open-login');
		const regBtn = document.getElementById('open-register');
		if (loginBtn) loginBtn.onclick = () => open('login-modal');
		if (regBtn) regBtn.onclick = () => open('register-modal');
		ensureAuthModals();
		const loginClose = document.getElementById('login-close');
		const regClose = document.getElementById('reg-close');
		if (loginClose) loginClose.onclick = closeAll;
		if (regClose) regClose.onclick = closeAll;
		const ov = overlay(); if (ov) ov.onclick = closeAll;
		document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closeAll(); });
		const doLogin = async () => {
			const login = document.getElementById('login-login').value.trim();
			const password = document.getElementById('login-password').value;
			const errBox = document.getElementById('login-error');
			const submitBtn = document.getElementById('login-submit');
			if (errBox) { errBox.style.display='none'; errBox.textContent=''; }
			if (!login || !password) { if (errBox){ errBox.textContent='Введите логин и пароль'; errBox.style.display='block'; } return; }
			try {
				if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Входим...'; }
				console.log('[Auth] Windows doLogin start');
				const authAPI = getAuthAPI();
				const res = await fetch(authAPI, { 
					method: 'POST', 
					credentials: 'include', 
					headers: { 'Content-Type': 'application/json' }, 
					body: JSON.stringify({ 
						action: 'login',
						login, 
						password 
					}) 
				});
				let ok = res.ok;
				let payload = null;
				try { payload = await res.json(); } catch(_) { payload = null; }
				if (!ok) {
					const msg = (payload && payload.error) ? payload.error : 'Ошибка авторизации';
					if (errBox) { errBox.textContent = msg; errBox.style.display='block'; }
					if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Войти'; }
					return;
				}
				// Ultra-fast path for Windows: trust API payload and avoid extra roundtrip
				if (isWindows && payload && payload.user) {
					currentUser = payload.user;
					closeAll();
					renderAuthHeader();
					return;
				}
				// Mac (or fallback): verify via GET user endpoint
				const uRes = await fetch(getUserAPI(), { credentials: 'include' });
				const u = await uRes.json();
				if (u && u.authenticated && u.user) {
					currentUser = u.user;
					closeAll();
					window.location.reload();
				} else {
					if (errBox) { errBox.textContent = 'Сессия не установлена'; errBox.style.display='block'; }
					if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Войти'; }
				}
			} catch (e) {
				if (errBox) { errBox.textContent = 'Сетевая ошибка'; errBox.style.display='block'; }
				if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Войти'; }
			}
		};
		const doRegister = async () => {
			const email = document.getElementById('reg-email').value.trim();
			const username = document.getElementById('reg-username').value.trim();
			const password = document.getElementById('reg-password').value;
			const errBox = document.getElementById('reg-error');
			if (errBox) { errBox.style.display='none'; errBox.textContent=''; }
			if (!email || !username || !password) { if (errBox){ errBox.textContent='Заполните все поля'; errBox.style.display='block'; } return; }
			try {
				const authAPI = getAuthAPI();
			const res = await fetch(authAPI, { 
					method: 'POST', 
					credentials: 'include', 
					headers: { 'Content-Type': 'application/json' }, 
					body: JSON.stringify({ 
						action: 'register',
						email, 
						username, 
						password 
					}) 
				});
				let ok = res.ok; let payload=null; try { payload = await res.json(); } catch(_) {}
				if (!ok) { if (errBox){ errBox.textContent=(payload&&payload.error)||'Ошибка регистрации'; errBox.style.display='block'; } return; }
			// Ultra-fast path for Windows: server already set session and returns user
			if (isWindows && payload && payload.success) {
				try {
					// Immediately login without extra roundtrips
					const loginAPI = getAuthAPI();
					const lr = await fetch(loginAPI, {
						method: 'POST',
						credentials: 'include',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ action:'login', login: username, password })
					});
					let lp = null; try { lp = await lr.json(); } catch(_){ lp = null; }
					if (lr.ok && lp && lp.user) {
						currentUser = lp.user;
						closeAll();
						renderAuthHeader();
						return;
					}
				} catch(_) {}
			}
			// Fallback (Mac or if fast path failed)
				await doLoginPostRegister(username, password);
			} catch (e) {
				if (errBox) { errBox.textContent='Сетевая ошибка'; errBox.style.display='block'; }
			}
		};
		async function doLoginPostRegister(login, password){
			const errBox = document.getElementById('login-error'); if (errBox){ errBox.style.display='none'; errBox.textContent=''; }
			const authAPI = getAuthAPI();
			const res = await fetch(authAPI, { 
				method: 'POST', 
				credentials: 'include', 
				headers: { 'Content-Type': 'application/json' }, 
				body: JSON.stringify({ 
					action: 'login',
					login, 
					password 
				}) 
			});
			let ok = res.ok; let payload=null; try { payload = await res.json(); } catch(_) {}
			if (!ok) { if (errBox){ errBox.textContent=(payload&&payload.error)||'Ошибка авторизации'; errBox.style.display='block'; } return; }
			const uRes = await fetch(getUserAPI(), { credentials: 'include' });
			const u = await uRes.json();
			if (u && u.authenticated && u.user) {
				currentUser = u.user; closeAll(); window.location.reload();
			} else {
				if (errBox){ errBox.textContent='Сессия не установлена'; errBox.style.display='block'; }
			}
		}
		const loginSubmit = document.getElementById('login-submit');
		const regSubmit = document.getElementById('reg-submit');
		if (loginSubmit) {
			loginSubmit.onclick = doLogin;
			// Enter key within login inputs
			const loginInput = document.getElementById('login-login');
			const passInput = document.getElementById('login-password');
			[loginInput, passInput].forEach(inp => {
				if (inp) inp.addEventListener('keydown', (e)=>{ if (e.key === 'Enter') { e.preventDefault(); doLogin(); } });
			});
		}
		if (regSubmit) regSubmit.onclick = doRegister;
		// Fallback delegated handler in case direct binding missed
		document.addEventListener('click', (e)=>{
			const btn = e.target && e.target.closest && e.target.closest('#login-submit');
			if (btn) { e.preventDefault(); doLogin(); }
		}, true);
	}

	function renderCards(rowId, items, type) {
		let row = document.getElementById(rowId);
		if (!row) return;
		let html = '';
		if (type === 'album') {
			row.className = 'tile-row';
			html = items.map((item, idx) => `
				<div class="tile" data-album="${encodeURIComponent(item.album)}" data-idx="${idx}">
					<img class="tile-cover" loading="lazy" src="/muzic2/${item.cover || 'tracks/covers/placeholder.jpg'}" alt="cover">
					<div class="tile-title">${escapeHtml(item.album)}</div>
					<div class="tile-desc">${escapeHtml(item.artist || '')}</div>
					<div class="tile-play">&#9654;</div>
				</div>
			`).join('');
		} else if (type === 'mix') {
			row.className = 'tile-row';
			html = items.map((item, idx) => `
				<div class="tile" data-idx="${idx}">
					<img class="tile-cover" loading="lazy" src="/muzic2/${item.cover || 'tracks/covers/placeholder.jpg'}" alt="cover">
					<div class="tile-title">${escapeHtml(item.album || item.title)}</div>
					<div class="tile-desc">${escapeHtml(item.artist || '')}</div>
					<div class="tile-play">&#9654;</div>
				</div>
			`).join('');
		} else if (type === 'artist') {
			row.className = 'artist-row';
			html = items.map(item => `
				<div class="artist-tile" data-artist="${encodeURIComponent(item.artist)}">
					<img class="artist-avatar" loading="lazy" src="/muzic2/${item.cover || 'tracks/covers/placeholder.jpg'}" alt="artist">
					<div class="artist-name">${escapeHtml(item.artist)}</div>
				</div>
			`).join('');
        } else if (type === 'track') {
			row.className = 'card-row';
			html = items.map((item, idx) => {
				// Правильно обрабатываем путь к обложке
				let coverPath = item.cover || 'tracks/covers/placeholder.jpg';
				if (coverPath && !coverPath.startsWith('/muzic2/') && !coverPath.startsWith('http')) {
					coverPath = '/muzic2/' + coverPath;
				}
				return `
				<div class="card" data-idx="${idx}">
					<img class="card-cover" loading="lazy" src="${coverPath}" alt="cover">
					<div class="card-info">
                <div class="card-title">${escapeHtml(item.title)}</div>
                <div class="card-artist">${item.explicit? '<span class=\"exp-badge\" title=\"Нецензурная лексика\">E</span>':''}${escapeHtml(item.feats && String(item.feats).trim() ? `${item.artist}, ${item.feats}` : item.artist)}</div>
						<div class="card-type">${item.album_type || ''}</div>
					</div>
				</div>
			`;
			}).join('');
		}
		row.innerHTML = html;

		if (type === 'album') {
			row.onclick = function(e) {
				let el = e.target;
				while (el && el !== row && !el.hasAttribute('data-album')) el = el.parentElement;
				if (el && el.hasAttribute('data-album')) {
					const albumName = el.getAttribute('data-album');
					navigateTo('album', { album: decodeURIComponent(albumName) });
				}
			};
		} else if (type === 'artist') {
			row.onclick = function(e) {
				let el = e.target;
				while (el && el !== row && !el.hasAttribute('data-artist')) el = el.parentElement;
				if (el && el.hasAttribute('data-artist')) {
					const artistName = el.getAttribute('data-artist');
					navigateTo('artist', { artist: decodeURIComponent(artistName) });
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
                        feats: i.feats || '',
						cover: '/muzic2/' + (i.cover || 'tracks/covers/placeholder.jpg'),
						video_url: i.video_url || ''
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

	function ensureStyle(href){
		if (!href) return;
		const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
		if (links.some(l => (l.getAttribute('href')||'').includes(href))) return;
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = href;
		document.head.appendChild(link);
	}

	// SPA Navigation System
	window.currentPage = 'home';
	let currentParams = {};

	function navigateTo(page, params = {}) {
		window.currentPage = page;
		currentParams = params;
		
		// Update URL without reload
		const url = new URL(window.location);
		if (page === 'home') {
			url.search = '';
		} else if (page === 'album') {
			url.search = `?album=${encodeURIComponent(params.album || '')}`;
		} else if (page === 'artist') {
			url.search = `?artist=${encodeURIComponent(params.artist || '')}`;
		}
		window.history.pushState({ page, params }, '', url);
		
		// Render page
		if (page === 'home') {
			showPage('Главная');
		} else if (page === 'album') {
			renderAlbumSPA(params.album);
		} else if (page === 'artist') {
			renderArtistSPA(params.artist);
		}
	}

	// Handle browser back/forward
	window.addEventListener('popstate', (event) => {
		if (event.state) {
			window.currentPage = event.state.page;
			currentParams = event.state.params;
			if (window.currentPage === 'home') {
				showPage('Главная');
			} else if (window.currentPage === 'album') {
				renderAlbumSPA(currentParams.album);
			} else if (window.currentPage === 'artist') {
				renderArtistSPA(currentParams.artist);
			}
		} else {
			// Handle direct URL access
			const urlParams = new URLSearchParams(window.location.search);
			if (urlParams.has('album')) {
				navigateTo('album', { album: urlParams.get('album') });
			} else if (urlParams.has('artist')) {
				navigateTo('artist', { artist: urlParams.get('artist') });
			} else {
				navigateTo('home');
			}
		}
	});

	// Initialize SPA on page load
	(function initSPA() {
		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.has('album')) {
			navigateTo('album', { album: urlParams.get('album') });
		} else if (urlParams.has('artist')) {
			navigateTo('artist', { artist: urlParams.get('artist') });
		} else {
			navigateTo('home');
		}
	})();

	// Minimal SPA renderers to avoid reload only when music is playing
	async function renderAlbumSPA(albumName){
		mainContent.innerHTML = '<div class="loading">Загрузка альбома...</div>';
		try {
			// Decode the album name if it's URL encoded
			const decodedAlbumName = decodeURIComponent(albumName);
			
			// Используем быстрый API для Windows
			const apiUrl = isWindows ? 
				`/muzic2/src/api/album_windows.php?album=${encodeURIComponent(decodedAlbumName)}` :
				`/muzic2/src/api/album.php?album=${encodeURIComponent(decodedAlbumName)}`;
			
			const res = await fetch(apiUrl);
			const data = await res.json();
			if (data.error) { mainContent.innerHTML = '<div class="error">Альбом не найден</div>'; return; }
			// Inject album page styles (from album.html) for correct layout
			const albumStyles = `
			<style>
			.album-header{display:flex;align-items:flex-end;gap:2.5rem;margin-top:2.5rem;margin-bottom:2.5rem}
			.album-cover{width:220px;height:220px;border-radius:18px;object-fit:cover;box-shadow:0 8px 32px rgba(30,185,84,0.18);background:#181818}
			.album-meta{display:flex;flex-direction:column;gap:1.2rem}
			.album-title{font-size:3.2rem;font-weight:900;color:#fff;margin-bottom:0.5rem}
			.album-artist{font-size:1.3rem;color:#b3b3b3;font-weight:600}
			.album-info{font-size:1.1rem;color:#b3b3b3;margin-top:0.5rem}
			.album-controls{display:flex;align-items:center;gap:1.2rem;margin-bottom:1.5rem}
			.album-play-btn{background:#1db954;color:#fff;border:none;border-radius:50%;width:64px;height:64px;font-size:2.5rem;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 16px rgba(30,185,84,0.15);transition:background 0.18s,transform 0.18s}
			.album-play-btn:hover{background:#17a74a;transform:scale(1.06)}
			.album-like-btn{background:transparent;border:1px solid #535353;color:#bbb;border-radius:50%;width:48px;height:48px;font-size:1.5rem;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s}
			.album-like-btn:hover{border-color:#fff;transform:scale(1.05)}
			.album-like-btn.liked{background:#1db954;border-color:#1db954;color:#fff}
			.tracks-table{width:100%;border-collapse:collapse;margin-bottom:2rem}
			.tracks-table th,.tracks-table td{padding:0.7rem 1rem;text-align:left;color:#fff;font-size:1.08rem}
			.tracks-table th{color:#b3b3b3;font-weight:600;font-size:1.02rem;border-bottom:1px solid #232323}
			.tracks-table tr{transition:background 0.15s;cursor:pointer;position:relative}
			.tracks-table tr:hover{background:#232323}
			.track-play-btn{display:none;position:absolute;left:1.1rem;top:50%;transform:translateY(-50%);background:#1db954;color:#fff;border:none;border-radius:50%;width:32px;height:32px;font-size:1.3rem;align-items:center;justify-content:center;cursor:pointer;z-index:10;box-shadow:0 2px 8px rgba(30,185,84,0.10);transition:background 0.18s,transform 0.18s}
			.tracks-table tr:hover .track-play-btn{display:flex}
			.tracks-table tr:hover .track-num{visibility:hidden}
			.tracks-table td.track-num{color:#b3b3b3;width:2.5rem;font-size:1.02rem}
			.tracks-table td.track-title{font-weight:700;color:#fff}
			.tracks-table td.track-title .track-artist{color:#b3b3b3;font-size:1.01rem;font-weight:400;margin-top:0.2rem}
			.tracks-table td.track-duration{color:#b3b3b3;font-size:1.01rem;text-align:center;width:4.5rem;vertical-align:middle}
			.tracks-table td.track-like{text-align:center;width:3rem;vertical-align:middle}
			.tracks-table .heart-btn{background:transparent;border:none;color:#bbb;cursor:pointer;padding:4px;border-radius:50%;font-size:16px;transition:color 0.2s}
			.tracks-table .heart-btn.liked{color:#1ed760}
			.track-item-numbered{display:flex;align-items:center;gap:1rem;padding:0.5rem;border-radius:4px;cursor:pointer;transition:background 0.2s}
			.track-item-numbered:hover{background:#232323}
			.track-item-numbered .track-like{flex-shrink:0}
			.track-item-numbered .heart-btn{background:transparent;border:none;color:#bbb;cursor:pointer;padding:4px;border-radius:50%;font-size:16px;transition:color 0.2s}
			.track-item-numbered .heart-btn.liked{color:#1ed760}
			.album-card{position:relative}
			.album-heart-btn{position:absolute;right:0.5rem;bottom:0.5rem;background:#222;border:1px solid #333;color:#bbb;border-radius:50%;width:32px;height:32px;cursor:pointer;font-size:14px;transition:all 0.2s}
			.album-heart-btn.liked{background:#1db954;border-color:#1db954;color:#fff}
			.exp-badge{display:inline-block;width:16px;height:16px;line-height:16px;text-align:center;margin:0 6px 0 0;border:0;border-radius:3px;font-size:10px;font-weight:800;color:#2b2b2b;background:#cfcfcf;vertical-align:middle}
			</style>`;
			// Calculate album duration and track count
			const trackCount = (data.tracks || []).length;
			const totalDuration = (data.tracks || []).reduce((sum, track) => sum + (parseInt(track.duration) || 0), 0);
			const minutes = Math.floor(totalDuration / 60);
			const seconds = totalDuration % 60;
			const durationText = `${minutes} мин. ${seconds} сек.`;
			
            // Compose combined artist text with feats aggregated across tracks
            const featsSet = new Set((data.tracks||[]).flatMap(t => (t.feats? String(t.feats).split(',').map(x=>x.trim()).filter(Boolean):[])));
            const featsText = Array.from(featsSet).filter(n=>n && n.toLowerCase()!==String(data.artist||'').toLowerCase()).join(', ');
            const albumArtistCombined = featsText ? `${data.artist||''}, ${featsText}` : (data.artist||'');
			
			mainContent.innerHTML = albumStyles + `
				<div class="album-header">
					<img class="album-cover" loading="lazy" src="/muzic2/${data.cover || 'tracks/covers/placeholder.jpg'}" alt="cover">
					<div class="album-meta">
						<div class="album-title">${escapeHtml(data.title||'')}</div>
						<div class="album-artist">${escapeHtml(albumArtistCombined)}</div>
						<div class="album-info">${escapeHtml(albumArtistCombined)} • 2025 • ${trackCount} треков, ${durationText}</div>
					</div>
				</div>
				<div class="album-controls">
					<button class="album-play-btn" id="album-play-btn">▶</button>
					<button class="album-like-btn heart-btn" id="album-like-btn" data-album-title="${escapeHtml(data.title||'')}" title="В избранные альбомы">❤</button>
				</div>
				<table class="tracks-table">
					<thead>
						<tr>
							<th>#</th>
							<th>Название</th>
							<th>⏱</th>
							<th>❤</th>
						</tr>
					</thead>
					<tbody id="tracks-tbody"></tbody>
				</table>
			`;
			const tbody = document.getElementById('tracks-tbody');
            (data.tracks||[]).forEach((t,i)=>{
				const tr=document.createElement('tr');
				// Format duration from seconds to MM:SS
				const duration = parseInt(t.duration) || 0;
				const minutes = Math.floor(duration / 60);
				const seconds = duration % 60;
				const durationFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
				
				const likedClass = window.__likedSet && window.__likedSet.has(t.id) ? 'liked' : '';
                const combinedArtist = (t.feats && String(t.feats).trim()) ? `${t.artist||''}, ${t.feats}` : (t.artist||'');
				tr.innerHTML = `
					<td class="track-num">${i+1}</td>
					<td class="track-title">
						${t.explicit ? '<span class="exp-badge">E</span>' : ''}${escapeHtml(t.title||'')}
						<div class="track-artist">${escapeHtml(combinedArtist)}</div>
					</td>
					<td class="track-duration">${durationFormatted}</td>
					<td class="track-like"><button class="heart-btn ${likedClass}" data-track-id="${t.id}" title="В избранное">❤</button></td>
				`;
                const playBtn=document.createElement('button'); playBtn.className='track-play-btn'; playBtn.innerHTML='&#9654;'; playBtn.onclick=(e)=>{ 
					e.stopPropagation(); 
					const q=(data.tracks||[]).map(tt=>{
						const s = tt.src || tt.file_path || '';
						if(!s) return null;
						const src = /^https?:/i.test(s) ? s : (s.indexOf('tracks/') !== -1 ? '/muzic2/' + s.slice(s.indexOf('tracks/')) : '/muzic2/' + s.replace(/^\/+/, ''));
						return { src: encodeURI(src), title: tt.title, artist: tt.artist, cover: '/muzic2/' + (tt.cover || data.cover || 'tracks/covers/placeholder.jpg'), video_url: tt.video_url || '' };
					}).filter(t => t !== null);
					if(q.length){ 
						window.setQueue && window.setQueue(q, i); 
						window.playFromQueue && window.playFromQueue(i); 
					} 
				};
				tr.children[0].style.position='relative'; tr.children[0].appendChild(playBtn);
                tr.onclick=(e)=>{ 
					if(e.target!==playBtn){ 
						const q=(data.tracks||[]).map(tt=>{
							const s = tt.src || tt.file_path || '';
							if(!s) return null;
							const src = /^https?:/i.test(s) ? s : (s.indexOf('tracks/') !== -1 ? '/muzic2/' + s.slice(s.indexOf('tracks/')) : '/muzic2/' + s.replace(/^\/+/, ''));
							return { src: encodeURI(src), title: tt.title, artist: tt.artist, cover: '/muzic2/' + (tt.cover || data.cover || 'tracks/covers/placeholder.jpg'), video_url: tt.video_url || '' };
						}).filter(t => t !== null);
						if(q.length){ 
							window.setQueue && window.setQueue(q, i); 
							window.playFromQueue && window.playFromQueue(i); 
						} 
					} 
				};
				tbody.appendChild(tr);
			});
            document.getElementById('album-play-btn').onclick=()=>{ 
				const q=(data.tracks||[]).map(tt=>{
					const s = tt.src || tt.file_path || '';
					if(!s) return null;
					const src = /^https?:/i.test(s) ? s : (s.indexOf('tracks/') !== -1 ? '/muzic2/' + s.slice(s.indexOf('tracks/')) : '/muzic2/' + s.replace(/^\/+/, ''));
					return { src: encodeURI(src), title: tt.title, artist: tt.artist, cover: '/muzic2/' + (tt.cover || data.cover || 'tracks/covers/placeholder.jpg'), video_url: tt.video_url || '' };
				}).filter(t => t !== null);
				if(q.length){ 
					window.setQueue && window.setQueue(q, 0); 
					window.playFromQueue && window.playFromQueue(0); 
				} 
			};
			
			// Load album likes for this album after DOM is ready
			setTimeout(() => {
				loadAlbumLikes();
			}, 100);
		} catch (e) {
			mainContent.innerHTML = '<div class="error">Ошибка загрузки альбома</div>';
		}
	}

	async function renderArtistSPA(artistName){
		mainContent.innerHTML = '<div class="loading">Загрузка артиста...</div>';
		try {
		// Ensure artist.css for proper layout
		ensureStyle('/muzic2/public/assets/css/artist.css');
		
		// Add Font Awesome for icons
		if (!document.querySelector('link[href*="font-awesome"]')) {
			const fontAwesome = document.createElement('link');
			fontAwesome.rel = 'stylesheet';
			fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
			document.head.appendChild(fontAwesome);
		}
		
		// Add artist control button styles
		const artistControlStyles = document.createElement('style');
		artistControlStyles.textContent = `
			.artist-controls {
				display: flex;
				align-items: center;
				gap: 1rem;
				padding: 1.5rem 2rem;
				margin-bottom: 2rem;
			}
			.play-all-btn, .shuffle-btn, .follow-btn, .more-btn {
				background: transparent;
				border: 1px solid #535353;
				color: #fff;
				padding: 0.5rem 1rem;
				border-radius: 20px;
				cursor: pointer;
				font-size: 0.9rem;
				transition: all 0.2s ease;
			}
			.play-all-btn {
				background: #1db954;
				border-color: #1db954;
				padding: 0.75rem 2rem;
				font-size: 1rem;
				font-weight: 600;
			}
			.play-all-btn:hover {
				background: #1ed760;
				transform: scale(1.05);
			}
			.shuffle-btn:hover, .follow-btn:hover, .more-btn:hover {
				border-color: #fff;
				transform: scale(1.05);
			}
			.follow-btn {
				background: transparent;
				border-color: #535353;
			}
			.more-btn {
				background: transparent;
				border: none;
				padding: 0.5rem;
				font-size: 1.2rem;
			}
			.artist-name-large {
				color: #b3b3b3 !important;
				font-size: 3rem;
				font-weight: 900;
				margin: 0;
			}
		`;
		document.head.appendChild(artistControlStyles);
		
			// Decode the artist name if it's URL encoded
			const decodedArtistName = decodeURIComponent(artistName);
			
			// Используем быстрый API для Windows
			const apiUrl = isWindows ? 
				`/muzic2/src/api/artist_windows.php?artist=${encodeURIComponent(decodedArtistName)}` :
				`/muzic2/public/src/api/artist.php?artist=${encodeURIComponent(decodedArtistName)}`;
			
			const res = await fetch(apiUrl);
			const data = await res.json();
			if (data.error) { mainContent.innerHTML = '<div class="error">Артист не найден</div>'; return; }
			
			// Calculate monthly listeners (random for demo)
			const monthlyListeners = Math.floor(Math.random() * 5000000) + 1000000;
			
			mainContent.innerHTML = `
				<div class="artist-page">
					<div class="artist-hero" style="--artist-bg: url('/muzic2/${data.cover||'tracks/covers/placeholder.jpg'}')">
						<div class="artist-avatar-container">
							<img class="artist-avatar-large" loading="lazy" src="/muzic2/${data.cover||'tracks/covers/placeholder.jpg'}" alt="Artist Avatar">
						</div>
						<div class="artist-info">
							<div class="artist-verified">
								<i class="fas fa-check-circle"></i>
								<span>Подтверждённый исполнитель</span>
							</div>
							<h1 class="artist-name-large">${escapeHtml(data.name||'')}</h1>
							<p class="artist-listeners">${monthlyListeners.toLocaleString('ru-RU')} слушателей за месяц</p>
						</div>
					</div>

					<div class="artist-controls">
						<button class="play-all-btn" id="play-all-btn">
							<i class="fas fa-play"></i>
						</button>
						<button class="shuffle-btn" id="shuffle-btn">
							<i class="fas fa-random"></i>
						</button>
						<button class="follow-btn" id="follow-btn">
							Уже подписаны
						</button>
						<button class="more-btn" id="more-btn">
							<i class="fas fa-ellipsis-h"></i>
						</button>
					</div>

					<div class="popular-tracks-section">
						<h2>Популярные треки</h2>
						<div id="popular-tracks" class="tracks-list-numbered"></div>
						<button class="show-more-btn" id="show-more-tracks">Ещё</button>
					</div>

					<div class="albums-section">
						<div class="section-header">
							<h2>Альбомы</h2>
							<button class="show-all-btn">Показать все</button>
						</div>
						<div id="albums-list" class="albums-grid"></div>
					</div>

					<div class="videos-section">
						<div class="section-header">
							<h2>Видео</h2>
						</div>
						<div id="videos-list" class="albums-grid"></div>
					</div>
				</div>
			`;
			
			// Load popular tracks
			const list = document.getElementById('popular-tracks'); 
			list.innerHTML='';
			(data.top_tracks||[]).forEach((t,i)=>{ 
				const d=document.createElement('div'); 
				d.className='track-item-numbered'; 
				const likedClass = window.__likedSet && window.__likedSet.has(t.id) ? 'liked' : '';
                const combined = (t.feats && String(t.feats).trim()) ? `${t.artist}, ${t.feats}` : (t.artist||'');
				d.innerHTML=`
					<div class="track-number">${i+1}</div>
					<div class="track-info">
						<div class="track-title-primary">${t.explicit ? '<span class="exp-badge">E</span>' : ''}${escapeHtml(t.title||'')}</div>
						<div class="track-artist-secondary">${escapeHtml(combined)}</div>
					</div>
					<div class="track-duration">${Math.floor((t.duration||0)/60)}:${((t.duration||0)%60).toString().padStart(2,'0')}</div>
					<div class="track-like"><button class="heart-btn ${likedClass}" data-track-id="${t.id}" title="В избранное">❤</button></div>
				`; 
				d.onclick=()=>{ 
					const q=(data.top_tracks||[]).map(tt=>{
						const s = tt.file_path || '';
						if(!s) return null;
						const src = /^https?:/i.test(s) ? s : (s.indexOf('tracks/') !== -1 ? '/muzic2/' + s.slice(s.indexOf('tracks/')) : '/muzic2/' + s.replace(/^\/+/, ''));
						return { src: encodeURI(src), title: tt.title, artist: tt.artist, cover: '/muzic2/' + (tt.cover || data.cover || 'tracks/covers/placeholder.jpg'), video_url: tt.video_url || '' };
					}).filter(t => t !== null);
					if(q.length){ 
						window.setQueue && window.setQueue(q, i); 
						window.playFromQueue && window.playFromQueue(i); 
					} 
				}; 
				list.appendChild(d); 
			});
			
			// Play all button
			document.getElementById('play-all-btn').onclick=()=>{ 
				const q=(data.top_tracks||[]).map(tt=>{
					const s = tt.file_path || '';
					if(!s) return null;
					const src = /^https?:/i.test(s) ? s : (s.indexOf('tracks/') !== -1 ? '/muzic2/' + s.slice(s.indexOf('tracks/')) : '/muzic2/' + s.replace(/^\/+/, ''));
					return { src: encodeURI(src), title: tt.title, artist: tt.artist, cover: '/muzic2/' + (tt.cover || data.cover || 'tracks/covers/placeholder.jpg'), video_url: tt.video_url || '' };
				}).filter(t => t !== null);
				if(q.length){ 
					window.setQueue && window.setQueue(q, 0); 
					window.playFromQueue && window.playFromQueue(0); 
				} 
			};
			
			// Load artist albums
			loadArtistAlbums(artistName);
			
			// Load album likes after DOM is ready
			setTimeout(() => {
				loadAlbumLikes();
			}, 100);
		} catch (e) {
			mainContent.innerHTML = '<div class="error">Ошибка загрузки артиста</div>';
		}
	}

	// Load artist albums
	async function loadArtistAlbums(artistName) {
		try {
			const albumsList = document.getElementById('albums-list');
			if (!albumsList) return;
			
			// Для Windows используем данные из artist_windows.php
			if (isWindows) {
				// Получаем данные артиста, которые уже загружены
				const apiUrl = `/muzic2/src/api/artist_windows.php?artist=${encodeURIComponent(artistName)}`;
				const res = await fetch(apiUrl);
				const data = await res.json();
				
				if (data.albums && data.albums.length > 0) {
					albumsList.innerHTML = '';
					data.albums.slice(0, 6).forEach(album => {
						const albumDiv = document.createElement('div');
						albumDiv.className = 'album-card';
						albumDiv.innerHTML = `
							<img class="album-cover" loading="lazy" src="/muzic2/${album.cover || 'tracks/covers/placeholder.jpg'}" alt="album cover">
							<div class="album-title">${escapeHtml(album.album || '')}</div>
							<div class="album-artist">${escapeHtml(artistName)}</div>
							<button class="heart-btn album-heart-btn" data-album-title="${escapeHtml(album.album || '')}" title="В избранные альбомы">❤</button>
						`;
						albumDiv.onclick = (e) => {
							if (!e.target.classList.contains('heart-btn')) {
								navigateTo('album', { album: album.album });
							}
						};
						albumsList.appendChild(albumDiv);
					});
				}
			} else {
				// Оригинальная логика для Mac
				const apiUrl = `/muzic2/src/api/search.php?q=${encodeURIComponent(artistName)}&type=albums`;
				const res = await fetch(apiUrl);
				const data = await res.json();
				
				if (data.albums && data.albums.length > 0) {
					albumsList.innerHTML = '';
					data.albums.slice(0, 6).forEach(album => {
						const albumDiv = document.createElement('div');
						albumDiv.className = 'album-card';
						albumDiv.innerHTML = `
							<img class="album-cover" loading="lazy" src="/muzic2/${album.cover || 'tracks/covers/placeholder.jpg'}" alt="album cover">
							<div class="album-title">${escapeHtml(album.title || '')}</div>
							<div class="album-artist">${escapeHtml(album.artist || '')}</div>
							<button class="heart-btn album-heart-btn" data-album-title="${escapeHtml(album.title || '')}" title="В избранные альбомы">❤</button>
						`;
						albumDiv.onclick = (e) => {
							if (!e.target.classList.contains('heart-btn')) {
								navigateTo('album', { album: album.title });
							}
						};
						albumsList.appendChild(albumDiv);
					});
				}
			}
		} catch (e) {
			console.error('Error loading artist albums:', e);
		}
	}

	// Load album likes
	async function loadAlbumLikes() {
		// Отключаем альбомные лайки только для Windows для тестирования скорости
		if (isWindows) {
			console.log('Windows detected - skipping album likes for speed test');
			window.__likedAlbums = new Set();
			return;
		}
		
		// Оригинальная логика для Mac
		try {
			const res = await fetch(getLikesAPI(), { credentials: 'include' });
			const data = await res.json();
			window.__likedAlbums = new Set((data.albums || []).map(a => a.album_title || a.title));
			
			// Update album heart buttons on artist pages
			document.querySelectorAll('.album-heart-btn').forEach(btn => {
				const albumTitle = btn.getAttribute('data-album-title');
				if (window.__likedAlbums && window.__likedAlbums.has(albumTitle)) {
					btn.classList.add('liked');
				} else {
					btn.classList.remove('liked');
				}
			});
			
			// Update album like button on album page
			const albumLikeBtn = document.getElementById('album-like-btn');
			if (albumLikeBtn) {
				const albumTitle = albumLikeBtn.getAttribute('data-album-title');
				if (window.__likedAlbums && window.__likedAlbums.has(albumTitle)) {
					albumLikeBtn.classList.add('liked');
				} else {
					albumLikeBtn.classList.remove('liked');
				}
			}
			
			// Update "My Music" section if it's currently displayed
			if (window.currentPage === 'home' && document.getElementById('albums-row')) {
				updateMyMusicAlbums();
			}
		} catch (e) {
			window.__likedAlbums = new Set();
		}
	}
	
	// Update albums in "My Music" section
	async function updateMyMusicAlbums() {
		const albumsRow = document.getElementById('albums-row');
		if (!albumsRow) return;
		
		try {
			const likesRes = await fetch(getLikesAPI(), { credentials: 'include' });
			const likesData = await likesRes.json();
			const likedAlbums = likesData.albums || [];
			
			if (likedAlbums.length === 0) {
				albumsRow.innerHTML = '<div class="empty">Пока нет любимых альбомов</div>';
				return;
			}
			
			// Get all albums from dedicated API
			const allAlbumsRes = await fetch('/muzic2/src/api/all_albums.php');
			const allAlbumsData = await allAlbumsRes.json();
			const allAlbums = allAlbumsData.albums || [];
			
			// Match liked albums with full album data
			const matchedAlbums = await Promise.all(likedAlbums.map(async (likedAlbum) => {
				// Try exact match first
				let matched = allAlbums.find(album => 
					album.album && album.album.toLowerCase() === likedAlbum.album_title.toLowerCase()
				);
				
				// If no exact match, try partial match
				if (!matched) {
					matched = allAlbums.find(album => 
						album.album && album.album.toLowerCase().includes(likedAlbum.album_title.toLowerCase())
					);
				}
				
				// If still no match, try reverse partial match
				if (!matched) {
					matched = allAlbums.find(album => 
						album.album && likedAlbum.album_title.toLowerCase().includes(album.album.toLowerCase())
					);
				}
				
				// If still no match, try to find by searching tracks
				if (!matched) {
					try {
						// Используем быстрый API для Windows
						const searchApiUrl = isWindows ? 
							`/muzic2/src/api/search_windows.php?q=${encodeURIComponent(likedAlbum.album_title)}&type=albums` :
							`/muzic2/src/api/search.php?q=${encodeURIComponent(likedAlbum.album_title)}&type=albums`;
						
						const searchRes = await fetch(searchApiUrl);
						const searchData = await searchRes.json();
						if (searchData.albums && searchData.albums.length > 0) {
							matched = searchData.albums[0];
						}
					} catch (e) {
						// Ignore search errors
					}
				}
				
				return matched ? {
					title: matched.album || matched.title,
					artist: matched.artist,
					cover: matched.cover
				} : {
					title: likedAlbum.album_title,
					artist: 'Неизвестный артист',
					cover: 'tracks/covers/placeholder.jpg'
				};
			}));
			
			albumsRow.innerHTML = matchedAlbums.map(album => createAlbumCard(album)).join('');
		} catch (e) {
			// Silent fail
		}
	}

	// Search functionality
	async function renderSearch() {
		mainContent.innerHTML = `
			<div class="search-container">
				<div class="search-header">
					<div class="search-input-container">
						<input type="text" id="search-input" placeholder="Поиск музыки, артистов, альбомов..." autocomplete="off">
						<button id="search-btn" class="search-btn">🔍</button>
					</div>
					<div class="search-filters">
						<button class="search-filter-btn active" data-type="all">Все</button>
						<button class="search-filter-btn" data-type="tracks">Треки</button>
						<button class="search-filter-btn" data-type="artists">Артисты</button>
						<button class="search-filter-btn" data-type="albums">Альбомы</button>
					</div>
				</div>
				<div id="search-results" class="search-results">
					<div class="search-placeholder">
						<h3>Начните поиск</h3>
						<p>Введите название трека, артиста или альбома</p>
					</div>
				</div>
			</div>
		`;

		// Add search styles
		const searchStyles = document.createElement('style');
		searchStyles.textContent = `
			.search-container { padding: 2rem; max-width: 1200px; margin: 0 auto; }
			.search-header { margin-bottom: 2rem; }
			.search-input-container { position: relative; margin-bottom: 1.5rem; }
			#search-input { 
				width: 100%; 
				padding: 1rem 3rem 1rem 1rem; 
				font-size: 1.1rem; 
				border: 2px solid #333; 
				border-radius: 25px; 
				background: #1a1a1a; 
				color: #fff; 
				outline: none;
				transition: border-color 0.3s;
			}
			#search-input:focus { border-color: #1db954; }
			.search-btn { 
				position: absolute; 
				right: 0.5rem; 
				top: 50%; 
				transform: translateY(-50%); 
				background: #1db954; 
				border: none; 
				border-radius: 50%; 
				width: 40px; 
				height: 40px; 
				cursor: pointer; 
				font-size: 1.2rem;
			}
			.search-filters { display: flex; gap: 1rem; flex-wrap: wrap; }
			.search-filter-btn { 
				padding: 0.5rem 1rem; 
				background: #333; 
				border: none; 
				border-radius: 20px; 
				color: #fff; 
				cursor: pointer; 
				transition: all 0.3s;
			}
			.search-filter-btn.active, .search-filter-btn:hover { background: #1db954; }
			.search-results { min-height: 400px; }
			.search-placeholder { 
				text-align: center; 
				padding: 4rem 2rem; 
				color: #666; 
			}
			.search-placeholder h3 { font-size: 1.5rem; margin-bottom: 0.5rem; }
			.search-section { margin-bottom: 2rem; }
			.search-section h4 { 
				font-size: 1.3rem; 
				margin-bottom: 1rem; 
				color: #fff; 
				border-bottom: 2px solid #333; 
				padding-bottom: 0.5rem; 
			}
			.search-loading { text-align: center; padding: 2rem; color: #666; }
			.search-error { text-align: center; padding: 2rem; color: #ff6b6b; }
			.no-results { text-align: center; padding: 2rem; color: #666; }
		`;
		document.head.appendChild(searchStyles);

		// Setup event listeners
		const searchInput = document.getElementById('search-input');
		const searchBtn = document.getElementById('search-btn');
		const searchResults = document.getElementById('search-results');
		const filterBtns = document.querySelectorAll('.search-filter-btn');

		let currentType = 'all';
		let searchTimeout;

		// Search input handler
		searchInput.addEventListener('input', (e) => {
			clearTimeout(searchTimeout);
			const query = e.target.value.trim();
			
			if (query.length < 2) {
				showSearchPlaceholder();
				return;
			}

			searchTimeout = setTimeout(() => {
				performSearch(query, currentType);
			}, 300);
		});

		// Search button handler
		searchBtn.addEventListener('click', () => {
			const query = searchInput.value.trim();
			if (query.length >= 2) {
				performSearch(query, currentType);
			}
		});

		// Filter buttons handler
		filterBtns.forEach(btn => {
			btn.addEventListener('click', () => {
				filterBtns.forEach(b => b.classList.remove('active'));
				btn.classList.add('active');
				currentType = btn.dataset.type;
				
				const query = searchInput.value.trim();
				if (query.length >= 2) {
					performSearch(query, currentType);
				}
			});
		});

		// Enter key handler
		searchInput.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') {
				const query = searchInput.value.trim();
				if (query.length >= 2) {
					performSearch(query, currentType);
				}
			}
		});

		async function performSearch(query, type) {
			searchResults.innerHTML = '<div class="search-loading">Поиск...</div>';
			
			try {
				// Используем быстрый API для Windows
				const apiUrl = isWindows ? 
					`/muzic2/src/api/search_windows.php?q=${encodeURIComponent(query)}&type=${type}` :
					`/muzic2/src/api/search.php?q=${encodeURIComponent(query)}&type=${type}`;
				
				const response = await fetch(apiUrl);
				const data = await response.json();
				
				if (data.error) {
					searchResults.innerHTML = `<div class="search-error">Ошибка: ${data.error}</div>`;
					return;
				}
				
				displaySearchResults(data, query);
			} catch (error) {
				searchResults.innerHTML = '<div class="search-error">Ошибка при поиске</div>';
			}
		}

		function displaySearchResults(data, query) {
			let html = '';
			
			if (currentType === 'all') {
				// Show all results grouped by type
				if (data.tracks.length > 0) {
					html += '<div class="search-section"><h4>Треки</h4><div class="card-row search-tracks-row">';
					html += data.tracks.map(track => createTrackCard(track)).join('');
					html += '</div></div>';
				}
				
				if (data.artists.length > 0) {
					html += '<div class="search-section"><h4>Артисты</h4><div class="artist-row search-artists-row">';
					html += data.artists.map(artist => createArtistCard(artist)).join('');
					html += '</div></div>';
				}
				
				if (data.albums.length > 0) {
					html += '<div class="search-section"><h4>Альбомы</h4><div class="tile-row search-albums-row">';
					html += data.albums.map(album => createAlbumCard(album)).join('');
					html += '</div></div>';
				}
			} else {
				// Show specific type results
				const results = data[currentType] || [];
				if (results.length > 0) {
					if (currentType === 'tracks') {
						html = '<div class="card-row search-tracks-row">' + results.map(item => createTrackCard(item)).join('') + '</div>';
					} else if (currentType === 'artists') {
						html = '<div class="artist-row search-artists-row">' + results.map(item => createArtistCard(item)).join('') + '</div>';
					} else if (currentType === 'albums') {
						html = '<div class="tile-row search-albums-row">' + results.map(item => createAlbumCard(item)).join('') + '</div>';
					}
				}
			}
			
			if (!html) {
				html = '<div class="no-results">Ничего не найдено</div>';
			}
			
			searchResults.innerHTML = html;
		}

		function createTrackCard(track) {
			const likedClass = window.__likedSet && window.__likedSet.has(track.id) ? 'liked' : '';
			// Do not URL-encode values here; player will normalize paths. Escape single quotes for inline handler safety.
			const esc = v => String(v==null?'':v).replace(/'/g, "\\'");
			const play = `playTrack({ src: '${esc(track.file_path)}', title: '${esc(track.title)}', artist: '${esc(track.artist)}', cover: '${esc(track.cover)}', id: ${track.id||0}, video_url: '${esc(track.video_url||'')}', explicit: ${track.explicit?1:0} })`;
		return `
			<div class="card">
				<img class="card-cover" src="/muzic2/${track.cover || 'tracks/covers/placeholder.jpg'}" alt="cover" onclick="${play}">
				<div class="card-info" onclick="${play}">
					<div class="card-title">${escapeHtml(track.title)}${track.explicit? ' <span class="exp-badge" title="Нецензурная лексика">E</span>':''}</div>
                    <div class="card-artist">${escapeHtml(track.feats && String(track.feats).trim() ? `${track.artist}, ${track.feats}` : track.artist)}</div>
					<div class="card-type">${escapeHtml(track.album || '')}</div>
				</div>
				<button class="heart-btn ${likedClass}" data-track-id="${track.id}" title="В избранное">❤</button>
			</div>
		`;
		}

		function createArtistCard(artist) {
			return `
				<div class="artist-tile" onclick="navigateTo('artist', { artist: '${encodeURIComponent(artist.name)}' })">
					<img class="artist-avatar" loading="lazy" src="/muzic2/${artist.cover || 'tracks/covers/placeholder.jpg'}" alt="avatar">
					<div class="artist-name">${escapeHtml(artist.name)}</div>
					<div class="artist-tracks">${artist.track_count} треков</div>
				</div>
			`;
		}


		function showSearchPlaceholder() {
			searchResults.innerHTML = `
				<div class="search-placeholder">
					<h3>Начните поиск</h3>
					<p>Введите название трека, артиста или альбома</p>
				</div>
			`;
		}
	}
}

