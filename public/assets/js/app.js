// Принудительно используем HTTP вместо HTTPS
if (location.protocol === 'https:') {
    location.replace('http:' + location.href.substring(5));
}

// Измеряем время загрузки только для Windows
console.log('User Agent:', navigator.userAgent);

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
const API_ORIGIN = (window.location && window.location.protocol && window.location.protocol.startsWith('http'))
    ? window.location.origin
    : (window.API_ORIGIN || 'http://localhost:8888');
const api = (path) => (String(path).startsWith('http') ? path : API_ORIGIN + path);
const getLikesAPI = () => api(isWindows ? '/muzic2/src/api/windows_likes.php' : '/muzic2/src/api/likes.php');
window.API_ORIGIN = API_ORIGIN;

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
            // Optimistic render from localStorage to avoid header lag
            try {
                const cached = localStorage.getItem('currentUser');
                if (cached) {
                    currentUser = JSON.parse(cached);
                    renderAuthHeader();
                }
            } catch(_) {}
			try {
				const res = await fetch(api('/muzic2/src/api/user_windows.php'), { credentials: 'include' });
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
                if (logoutBtn){ logoutBtn.onclick = async ()=>{ try{ await fetch(api('/muzic2/src/api/logout.php'),{ method:'POST', credentials:'include' }); }catch(_){} try{ localStorage.removeItem('currentUser'); }catch(_){} location.reload(); } }
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
    // Inject responsive styles for home cards (mobile)
    const homeMobileStyles = `
    <style id="home-mobile-styles">
      .card-row,.tile-row{display:grid;grid-template-columns:repeat(6,1fr);gap:18px}
      .tile{position:relative;background:#181818;border-radius:18px;overflow:hidden;padding-bottom:10px;transition:transform .15s}
      .tile:hover{transform:translateY(-2px)}
      .tile-cover{width:100%;aspect-ratio:1/1;object-fit:cover;display:block}
      .tile-title{font-weight:800;color:#fff;margin:.6rem .6rem .2rem}
      .tile-desc{color:#bdbdbd;margin:0 .6rem;font-size:.95rem}
      .artist-row .tile-title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      @media(max-width:1024px){.card-row,.tile-row{grid-template-columns:repeat(4,1fr)}}
      @media(max-width:768px){.card-row,.tile-row{grid-template-columns:repeat(3,1fr)}.tile-title{font-size:1rem}.tile-desc{font-size:.88rem}}
      @media(max-width:560px){.card-row,.tile-row{grid-template-columns:repeat(2,1fr);gap:14px}.tile{border-radius:16px}.tile-title{font-size:.98rem}.tile-desc{font-size:.84rem}}
      @media(max-width:400px){.card-row,.tile-row{grid-template-columns:1fr;gap:12px}}
    </style>`;
    try { const old = document.getElementById('home-mobile-styles'); if (old) old.remove(); } catch(_) {}
    try { document.head.insertAdjacentHTML('beforeend', homeMobileStyles); } catch(_) {}
		try { ensureStyle('/muzic2/public/assets/css/home_modern.css'); } catch(_) {}
		// Inject compact modern cards for mixes and random tracks
		const homeCardStyles = `
		<style id="home-cards-compact">
		.card-row { display:grid; grid-template-columns:repeat(6,1fr); gap:16px }
		.card { background:#181818; border-radius:18px; padding:10px 12px; display:flex; align-items:center; gap:12px; min-height:72px; position:relative; overflow:hidden }
		.card-cover { width:56px; height:56px; border-radius:12px; object-fit:cover; flex:0 0 auto }
		.card-info { min-width:0 }
		.card-title { color:#fff; font-weight:800; font-size:1rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
		.card-artist { color:#b3b3b3; font-size:.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
		.card-type { color:#22c55e; font-size:.86rem; font-weight:700; margin-top:2px }
		.card:hover { background:#1f1f1f }
		/* Mix pill look */
		#mixes-row .card { border-radius:22px }
		@media(max-width:1024px){ .card-row{grid-template-columns:repeat(4,1fr)} }
		@media(max-width:768px){ .card-row{grid-template-columns:repeat(2,1fr)} .card{min-height:64px} .card-cover{width:52px;height:52px} }
		@media(max-width:480px){ .card-row{grid-template-columns:1fr} .card-cover{width:48px;height:48px} }
		</style>`;
		try { const old = document.getElementById('home-cards-compact'); if (old) old.remove(); document.head.insertAdjacentHTML('beforeend', homeCardStyles); } catch(_) {}

		function injectHero(preferredAlbumCover) {
			try {
				const heroCover = '/muzic2/' + (String(preferredAlbumCover||'tracks/covers/m1000x1000.jpeg').replace(/^\/+/, ''));
				const hero = `
				<section class="home-hero">
					<div class="hero-bg" style="background-image:url('${heroCover}')"></div>
					<div class="hero-scrim"></div>
					<div class="hero-content">
						<h1>Продолжим слушать</h1>
						<p>Подборка для вас — треки, альбомы и артисты</p>
						<div class="hero-actions">
							<button class="hero-btn" id="hero-search-btn">Поиск</button>
							<button class="hero-btn primary" id="hero-library-btn">Моя музыка</button>
						</div>
						<div class="hero-spotlights">
							<div class="spotlight pulse" id="pulse-tile">
								<div class="pulse-wave"></div>
								<div class="pulse-label">
									<div class="pulse-title">Пульс</div>
									<div class="pulse-sub">Персональный поток прямо сейчас</div>
								</div>
							</div>
						</div>
					</div>
				</section>`;
				mainContent.insertAdjacentHTML('afterbegin', hero);
				const sb = document.getElementById('hero-search-btn'); if (sb) sb.onclick = () => showPage('Поиск');
				const lb = document.getElementById('hero-library-btn'); if (lb) lb.onclick = () => showPage('Моя музыка');
				const pt = document.getElementById('pulse-tile'); if (pt) pt.onclick = startPulse;
				try {
					const bg = document.querySelector('.home-hero .hero-bg');
					if (bg) {
						let ticking = false;
						const onScroll = () => { if (ticking) return; ticking = true; requestAnimationFrame(()=>{ const y = window.scrollY||0; bg.style.transform = `translateY(${Math.min(30, y*0.08)}px) scale(1.08)`; ticking = false; }); };
						window.addEventListener('scroll', onScroll, { passive: true });
					}
				} catch(_) {}
			} catch(_) {}
		}

		async function startPulse() {
			try {
				let recents = [];
				try { recents = JSON.parse(localStorage.getItem('muzic2_recent_listening_v1')||'[]'); } catch(_) { recents = []; }
			const recentArtists = new Set(recents.map(x=>String(x.artist||'').trim()).filter(Boolean));
			const recentGenres = new Set(recents.map(x=>String(x.genre||'').toLowerCase().trim()).filter(Boolean));

			// Derive preferred artists from user likes (tracks + albums)
			let preferredArtists = new Set();
			try {
				const likesRes = await fetch(getLikesAPI(), { credentials: 'include' });
				const likes = await likesRes.json();
				(likes.tracks||[]).forEach(t => { const a = String(t.artist||'').trim(); if (a) preferredArtists.add(a); if (t.genre) recentGenres.add(String(t.genre).toLowerCase()); });
				(likes.albums||[]).forEach(a => { const ar = String(a.artist||a.artist_name||'').trim(); if (ar) preferredArtists.add(ar); });
			} catch(_) { /* not logged in or no likes */ }
			// If no preferred artists yet, fall back to recent artists
			if (!preferredArtists.size) preferredArtists = new Set(recentArtists);
				const likedSet = (window.__likedSet instanceof Set) ? window.__likedSet : new Set();
				let candidates = [];
				if (isWindows) {
					const r = await fetch(api('/muzic2/src/api/home_windows.php')); const d = await r.json();
					candidates = (d.tracks||[]).concat(d.mixes||[]).filter(Boolean);
				} else {
					const r = await fetch(api('/muzic2/public/src/api/home.php?limit_tracks=60&limit_mixes=60')); const d = await r.json();
					candidates = (d.tracks||[]).concat(d.mixes||[]).filter(Boolean);
				}
			const scored = candidates.map(t => {
					const artist = String(t.artist||'').trim();
					let score = 0;
				// Strongly focus on preferred artists from likes
				if (preferredArtists.has(artist)) score += 6; else if (recentArtists.has(artist)) score += 2.5;
					if (likedSet.size && likedSet.has(t.id)) score += 2;
					const feats = String(t.feats||'').split(',').map(s=>s.trim()).filter(Boolean);
					if (feats.some(f => recentArtists.has(f))) score += 1;
				// Genre coherence if available
				const genre = String(t.genre||'').toLowerCase().trim();
				if (genre && recentGenres.size && recentGenres.has(genre)) score += 1.5;
					score += Math.random()*0.5;
					return { t, score };
				});
			scored.sort((a,b)=>b.score-a.score);

			// Diversify by artist: group, then interleave while limiting repetition
			const byArtist = new Map();
			for (const item of scored) {
				const artist = String(item.t.artist||'').trim();
				if (!artist) continue;
				if (!byArtist.has(artist)) byArtist.set(artist, []);
				byArtist.get(artist).push(item);
			}
			// Sort each artist bucket by score desc
			for (const [,arr] of byArtist) arr.sort((a,b)=>b.score-a.score);

			// Priority list of artists by their top score
			const artistOrder = Array.from(byArtist.keys()).sort((a,b)=>{
				const as = byArtist.get(a)[0]?.score||0; const bs = byArtist.get(b)[0]?.score||0; return bs-as;
			});

			const seen = new Set();
			const queue = [];
			const perArtistLimitFirstChunk = 2; // max per artist in first 10 items
			const firstChunkSize = 10;
			const perArtistCounts = new Map();
			let lastArtist = '';

			function takeNextDifferentArtist() {
				for (let i=0;i<artistOrder.length;i++) {
					const artist = artistOrder[i];
					if (!byArtist.get(artist)?.length) continue;
					if (artist === lastArtist && artistOrder.length>1) continue;
					// Enforce early chunk cap
					if (queue.length < firstChunkSize) {
						const cnt = perArtistCounts.get(artist)||0;
						if (cnt >= perArtistLimitFirstChunk) continue;
					}
					return artist;
				}
				// fallback any
				for (const artist of artistOrder) {
					if (byArtist.get(artist)?.length) return artist;
				}
				return null;
			}

			while (queue.length < 30) {
				const artist = takeNextDifferentArtist();
				if (!artist) break;
				const item = byArtist.get(artist).shift();
				const t = item.t;
				let s = t.src || t.file_path || '';
				if (!s) continue;
				if (!/^https?:/i.test(s)) s = (s.indexOf('tracks/')!==-1) ? ('/muzic2/' + s.slice(s.indexOf('tracks/'))) : ('/muzic2/' + s.replace(/^\/+/, ''));
				if (seen.has(s)) continue; seen.add(s);
				queue.push({ src: encodeURI(s), title: t.title, artist: t.artist, cover: '/muzic2/' + (t.cover || 'tracks/covers/placeholder.jpg'), video_url: t.video_url || '' });
				perArtistCounts.set(artist, (perArtistCounts.get(artist)||0)+1);
				lastArtist = artist;
			}
				if (queue.length) {
					window.setQueue && window.setQueue(queue, 0);
					window.playFromQueue ? window.playFromQueue(0) : (window.playTrack && window.playTrack(queue[0]));
				}
			} catch (e) { console.error('Pulse error', e); }
		}

		console.log('renderHome - isWindows:', isWindows);
		if (isWindows) {
			console.log('Windows detected - using ultra-fast API');
			try {
                const res = await fetch(api('/muzic2/src/api/home_windows.php'));
				const data = await res.json();
                mainContent.innerHTML = `
					<section class="main-filters">
						<button class="filter-btn active">Все</button>
						<button class="filter-btn">Музыка</button>
						<button class="filter-btn">Артисты</button>
					</section>
                
                    <section class="queue-shortcut" id="queue-shortcut" style="display:none;">
                        <button id="open-queue" class="btn" style="display:flex;align-items:center;gap:8px;background:#1db954;color:#000;border:none;border-radius:12px;padding:8px 12px;font-weight:800;">
                            <span style="font-size:16px;">☰</span> Очередь
                        </button>
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
                    <section class="main-section" id="tracks-section" style="position:relative;">
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
                            <h3 style="margin:0;">Случайные треки</h3>
                            <button id="open-queue-inline" class="btn" style="display:none;align-items:center;gap:8px;background:#262626;color:#fff;border:1px solid #333;border-radius:10px;padding:6px 10px;font-weight:700;">☰ Очередь</button>
                        </div>
						<div class="card-row" id="tracks-row"></div>
					</section>
					<section class="main-section" id="artists-section">
						<h3>Артисты</h3>
						<div class="card-row" id="artists-row"></div>
					</section>
				`;
                // Mobile-only show queue buttons
                try {
                    const isMobile = window.matchMedia && window.matchMedia('(max-width: 600px)').matches;
                    const btn1 = document.getElementById('open-queue');
                    const btn2 = document.getElementById('open-queue-inline');
                    if (isMobile) {
                        if (btn1) btn1.parentElement.style.display = 'block';
                        if (btn2) btn2.style.display = 'inline-flex';
                        const open = () => { try { window.toggleQueuePanel ? window.toggleQueuePanel(true) : (window.dispatchEvent(new CustomEvent('player:queue:open')), null); } catch(_) {} };
                        if (btn1) btn1.onclick = open;
                        if (btn2) btn2.onclick = open;
                    }
                } catch(_) {}
				injectHero((data.albums && data.albums[0] && data.albums[0].cover) || '');
				renderCards('favorites-row', data.favorites, 'track');
				renderCards('mixes-row', data.mixes, 'track');
				renderCards('albums-row', data.albums, 'album');
				renderCards('tracks-row', data.tracks, 'track');
				renderCards('artists-row', data.artists, 'artist');
				// likes async (as before)
				setTimeout(async () => {
					try {
						const likesRes = await fetch(getLikesAPI(), { credentials: 'include' });
						const likes = await likesRes.json();
						window.__likedSet = new Set((likes.tracks||[]).map(t=>t.id));
						window.__likedAlbums = new Set((likes.albums||[]).map(a=>a.album_title || a.title));
						document.querySelectorAll('.heart-btn[data-track-id]').forEach(btn => {
							const id = Number(btn.getAttribute('data-track-id'));
							applyHeartState(btn, window.__likedSet.has(id));
						});
						document.querySelectorAll('.album-heart-btn[data-album-title]').forEach(btn => {
							const title = btn.getAttribute('data-album-title');
							if (window.__likedAlbums.has(title)) btn.classList.add('liked');
						});
					} catch(_) {}
				}, 0);
				return;
			} catch (e) {
				console.error('Windows API error:', e);
				mainContent.innerHTML = '<div class="error">Ошибка загрузки главной страницы</div>';
				return;
			}
		}
		
		// Mac path
		try {
			const res = await fetch(api('/muzic2/public/src/api/home.php?limit_tracks=8&limit_albums=6&limit_artists=10&limit_mixes=6&limit_favorites=6'));
			const data = await res.json();
			try { const likesRes = await fetch(getLikesAPI(), { credentials: 'include' }); const likes = await likesRes.json(); window.__likedSet = new Set((likes.tracks||[]).map(t=>t.id)); } catch(e){ window.__likedSet = new Set(); }
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
                <section class="main-section" id="tracks-section" style="position:relative;">
                    <h3 style="margin:0 0 12px 0;">Случайные треки</h3>
					<div class="card-row" id="tracks-row"></div>
				</section>
				<section class="main-section" id="artists-section">
					<h3>Артисты</h3>
					<div class="card-row" id="artists-row"></div>
				</section>
			`;
			injectHero((data.albums && data.albums[0] && data.albums[0].cover) || '');
			renderCards('mixes-row', data.mixes, 'track');
			renderCards('albums-row', data.albums, 'album');
			renderCards('tracks-row', data.tracks, 'track');
			renderCards('artists-row', data.artists, 'artist');
            // Removed extra queue buttons on home for clean UI
			addFilterButtonHandlers();
		} catch (e) {
			mainContent.innerHTML = '<div class="error">Ошибка загрузки</div>';
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
		// Windows: мгновенный скелет + фоновые загрузки
		if (isWindows) {
			console.log('Windows detected - fast My Music');
			injectMyMusicStyles();
				mainContent.innerHTML = `
					<div class="my-music-container">
					<div class="my-music-header"><h2>Моя музыка</h2></div>
						<div class="my-music-content">
							<div class="playlists-section">
								<h3>Плейлисты</h3>
							<div class="playlists-grid" id="playlists-grid"><div class="empty">Загрузка плейлистов…</div></div>
							</div>
							<div class="favorite-albums-section">
								<h3>Любимые альбомы</h3>
							<div class="albums-grid" id="favorite-albums-grid"><div class="empty">Загрузка любимых альбомов…</div></div>
								</div>
							</div>
				</div>`;

			// Плейлисты — в фоне
			(void async function(){
				try {
					const listsRes = await fetch(api('/muzic2/src/api/playlists_windows.php'), { credentials: 'include' });
					const playlistsData = await listsRes.json();
					const playlists = playlistsData.playlists || [];
					const grid = document.getElementById('playlists-grid');
					if (grid) {
						grid.innerHTML = playlists.length ? playlists.map(pl => `
							<div class="playlist-tile" data-playlist-id="${pl.id}" data-playlist-name="${pl.name}">
								<div class="playlist-cover">${pl.cover ? `<img src="${pl.cover}" alt="${pl.name}">` : '<div class="playlist-placeholder">🎵</div>'}</div>
								<div class="playlist-info"><h4>${pl.name}</h4><p>${pl.track_count || 0} треков</p></div>
							</div>`).join('') : '<div class="empty">Плейлистов пока нет</div>';
					}
					// Навешиваем клики
					document.querySelectorAll('#playlists-grid .playlist-tile').forEach(tile => {
						tile.onclick = (e)=>{
							e.preventDefault(); e.stopPropagation();
							const playlistId = tile.dataset.playlistId;
							const playlistName = tile.dataset.playlistName;
							if (playlistId && playlistName) { openPlaylist(playlistId, playlistName); }
						};
					});
				} catch (_) {}
			})();

			// Любимые альбомы — в фоне, без тяжёлых сопоставлений
			(void async function(){
				try {
					const favGrid = document.getElementById('favorite-albums-grid');
					if (!favGrid) return;
					const likesRes = await fetch(getLikesAPI(), { credentials: 'include' });
					const likesData = await likesRes.json();
					const likedAlbums = likesData.albums || [];
					window.__likedAlbums = new Set(likedAlbums.map(a => a.album_title));
					favGrid.innerHTML = likedAlbums.length ? likedAlbums.map(a => createAlbumCard({ title: a.album_title, artist: 'Любимый альбом', cover: 'tracks/covers/placeholder.jpg' })).join('') : '<div class="empty">Пока нет любимых альбомов</div>';
				} catch(_) {}
			})();

			// Обновляем сердечки после загрузки лайков
			(void async function(){
				try {
					const likesRes = await fetch(getLikesAPI(), { credentials: 'include' });
					const likes = await likesRes.json();
					window.__likedSet = new Set((likes.tracks||[]).map(t=>t.id));
					window.__likedAlbums = new Set((likes.albums||[]).map(a=>a.album_title || a.title));
					// Обновляем иконки лайков на странице
					document.querySelectorAll('.heart-btn[data-track-id]').forEach(btn => {
						const id = Number(btn.getAttribute('data-track-id'));
						if (window.__likedSet.has(id)) btn.classList.add('liked');
					});
					document.querySelectorAll('.album-heart-btn[data-album-title]').forEach(btn => {
						const title = btn.getAttribute('data-album-title');
						if (window.__likedAlbums.has(title)) btn.classList.add('liked');
					});
				} catch(_) {}
			})();

				return;
		}
		
		// Оригинальная логика для Mac
		mainContent.innerHTML = '<div class="loading">Загрузка...</div>';
		injectMyMusicStyles();

		try {
			const listsRes = await fetch(api('/muzic2/src/api/playlists.php'), { credentials: 'include' });
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
					const allAlbumsRes = await fetch(api('/muzic2/src/api/all_albums.php'));
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

	// Capture-phase guard: prevent autoplay when clicking artist names
	document.addEventListener('click', (e)=>{
		const artistLink = e.target && e.target.closest ? e.target.closest('.artist-link') : null;
		if (artistLink) { e.preventDefault(); e.stopPropagation(); const name = artistLink.getAttribute('data-artist')||''; try { navigateTo('artist', { artist: name }); } catch(_){} return; }
		// For heart clicks we do NOT stop propagation; bubbling handler needs them
		// const heart = e.target && e.target.closest ? e.target.closest('.heart-btn, .album-like-btn') : null;
		// if (heart) { /* allow to bubble */ }
	}, true);

function applyHeartState(btn, liked) {
	if (!btn) return;
	const state = !!liked;
	btn.classList.toggle('liked', state);
	btn.setAttribute('aria-pressed', String(state));
	btn.setAttribute('title', state ? 'Убрать из избранного' : 'Добавить в избранное');
	btn.setAttribute('aria-label', state ? 'Убрать из избранного' : 'Добавить в избранное');
	try { btn.textContent = state ? '♥' : '♡'; } catch(_){}
}

// Direct like toggle function (reliable, used by inline onclick)
async function toggleTrackLike(trackId, buttonEl) {
    try {
        if (!currentUser) {
            try{ attachAuthModalTriggers(); const open = id => { document.querySelector('#auth-modals .modal-overlay').style.display='block'; const m=document.getElementById(id); if (m) m.style.display='block'; }; open('login-modal'); }catch(_){ }
            return;
        }
        const btn = buttonEl || document.querySelector(`.heart-btn[data-track-id="${trackId}"]`);
        if (!btn) return;
        const wasLiked = btn.classList.contains('liked');
        applyHeartState(btn, !wasLiked);
        try { btn.classList.add('pulse'); setTimeout(()=>btn.classList.remove('pulse'), 180); } catch(_){ }
        if (!window.__likedSet) window.__likedSet = new Set();
        if (wasLiked) window.__likedSet.delete(Number(trackId)); else window.__likedSet.add(Number(trackId));
        const method = wasLiked ? 'DELETE' : 'POST';
        const res = await fetch(getLikesAPI(), { method, credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ track_id: Number(trackId) })});
        if (!res.ok) throw new Error('Like request failed: ' + res.status);
        try{ document.dispatchEvent(new CustomEvent('likes:updated', { detail:{ trackId:Number(trackId), liked: !wasLiked } })); }catch(_){ }
    } catch (err) {
        // Soft fail: revert UI
        try {
            const btn = buttonEl || document.querySelector(`.heart-btn[data-track-id="${trackId}"]`);
            if (!btn) return;
            applyHeartState(btn, wasLiked);
        } catch(_){ }
        try { if (wasLiked) { window.__likedSet.add(Number(trackId)); } else { window.__likedSet.delete(Number(trackId)); } } catch(_){ }
        console.error('toggleTrackLike failed', err);
    }
}

window.toggleTrackLike = toggleTrackLike;

	// Global delegation for heart toggle and artist links (bubbling phase business logic)
		document.addEventListener('click', async (e) => {
		// Handle artist link clicks
		const artistLink = e.target.closest('.artist-link');
		if (artistLink) {
			e.preventDefault();
			e.stopPropagation();
			const artistName = artistLink.getAttribute('data-artist') || '';
			try { navigateTo('artist', { artist: artistName }); } catch(_) {}
			return;
		}
		
		const btn = (e.target && typeof e.target.closest === 'function')
			? e.target.closest('.heart-btn, .album-like-btn')
			: null;
		if (!btn) return;
		// Consume the event so other click handlers (e.g., play on card) don't interfere
		e.preventDefault();
		e.stopPropagation();

		// Keyboard support: activate on Enter/Space
		if (e.type === 'keydown') {
			const key = e.key || '';
			if (key !== 'Enter' && key !== ' ') return;
		}
		// Require auth for any like actions (tracks or albums)
		if (!currentUser) {
			try{ attachAuthModalTriggers(); const open = id => { document.querySelector('#auth-modals .modal-overlay').style.display='block'; const m=document.getElementById(id); if (m) m.style.display='block'; }; open('login-modal'); }catch(_){ }
			return;
		}
		
		// Handle track likes (delegated to helper)
		if (btn.hasAttribute('data-track-id')) {
			await toggleTrackLike(btn.getAttribute('data-track-id'), btn);
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
			const res = await fetch(api(`/muzic2/src/api/playlists.php?playlist_id=${playlistId}`), { credentials: 'include' });
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
            /* Home cards base (used on main) */
            .card-row,.tile-row{display:grid;grid-template-columns:repeat(6,1fr);gap:18px}
            .tile{position:relative;background:#181818;border-radius:18px;overflow:hidden;padding-bottom:10px;transition:transform .15s}
            .tile:hover{transform:translateY(-2px)}
            .tile-cover{width:100%;aspect-ratio:1/1;object-fit:cover;display:block}
            .tile-title{font-weight:800;color:#fff;margin:.6rem .6rem .2rem}
            .tile-desc{color:#bdbdbd;margin:0 .6rem;font-size:.95rem}
            /* Prevent artist names overlap */
            .artist-row .tile-title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
            /* Responsive grids */
            @media(max-width:1024px){.card-row,.tile-row{grid-template-columns:repeat(4,1fr)}}
            @media(max-width:768px){.card-row,.tile-row{grid-template-columns:repeat(3,1fr)}.tile-title{font-size:1rem}.tile-desc{font-size:.88rem}}
            @media(max-width:560px){.card-row,.tile-row{grid-template-columns:repeat(2,1fr);gap:14px}.tile{border-radius:16px}.tile-title{font-size:.98rem}.tile-desc{font-size:.84rem}}
            @media(max-width:400px){.card-row,.tile-row{grid-template-columns:1fr;gap:12px}}
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
                        <td class="track-title">${t.explicit?'<span class="exp-badge">E</span>':''}${escapeHtml(t.title||'')}<div class="track-artist">${renderArtistInline((t.feats && String(t.feats).trim()) ? `${t.artist||''}, ${t.feats}` : (t.artist||''))}</div></td>
                        <td class="track-duration">${mm}:${String(ss).padStart(2,'0')}</td>`;
                    // Click on artist name navigates to artist page, not play
                    tr.addEventListener('click', (e)=>{
                        const link = e.target && e.target.closest ? e.target.closest('.artist-link') : null;
                        if (link) {
                            e.preventDefault(); e.stopPropagation();
                            const name = link.getAttribute('data-artist') || '';
                            try { navigateTo('artist', { artist: name }); } catch(_) {}
                        }
                    });
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
	await fetch(api('/muzic2/src/api/playlists.php'), { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
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
                    try { localStorage.setItem('currentUser', JSON.stringify(currentUser)); } catch(_) {}
					closeAll();
					renderAuthHeader();
					return;
				}
				// Mac (or fallback): verify via GET user endpoint
				const uRes = await fetch(getUserAPI(), { credentials: 'include' });
				const u = await uRes.json();
				if (u && u.authenticated && u.user) {
					currentUser = u.user;
                    try { localStorage.setItem('currentUser', JSON.stringify(currentUser)); } catch(_) {}
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
                        try { localStorage.setItem('currentUser', JSON.stringify(currentUser)); } catch(_) {}
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
                <div class="card-artist">${item.explicit? '<span class="exp-badge" title="Нецензурная лексика">E</span>':''}${renderArtistInline(item.feats && String(item.feats).trim() ? `${item.artist}, ${item.feats}` : item.artist)}</div>
						<div class="card-type">${item.album_type || ''}</div>
					</div>
					<button type="button" class="heart-btn" data-track-id="${item.id || idx}" title="Добавить в избранное" aria-label="Добавить в избранное" aria-pressed="false" tabindex="0">♡</button>
					<button class="kebab" title="Ещё">⋮</button>
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

		// Add kebab menu handlers for tracks
		if (type === 'track') {
			row.querySelectorAll('.kebab').forEach((kebab, idx) => {
				kebab.onclick = (e) => {
					e.stopPropagation();
					showContextMenu(e, items[idx], idx);
				};
			});
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
			/* Mobile adjustments */
			@media (max-width: 768px){
			  .album-header{gap:1rem;margin-top:1rem;margin-bottom:1rem;align-items:center}
			  .album-cover{width:120px;height:120px;border-radius:14px}
			  .album-title{font-size:2rem;line-height:1.15;margin:0}
			  .album-artist{font-size:1rem}
			  .album-info{font-size:0.9rem;margin-top:0.25rem}
			  .album-controls{gap:0.8rem;margin:0.8rem 0 1rem}
			  .album-play-btn{width:56px;height:56px;font-size:2.1rem}
			  .album-like-btn{width:40px;height:40px}
			  .tracks-table th,.tracks-table td{padding:0.6rem 0.7rem;font-size:0.98rem}
			  .tracks-table td.track-title .track-artist{font-size:0.92rem}
			}
			@media (max-width: 480px){
			  .album-cover{width:104px;height:104px}
			  .album-title{font-size:1.7rem}
			  .album-artist{font-size:0.95rem}
			  .album-info{font-size:0.86rem}
			  .tracks-table th:nth-child(1), .tracks-table td.track-num{width:2rem}
			  .tracks-table th:nth-child(3), .tracks-table td.track-duration{width:3.6rem}
			}
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
						<div class="track-artist">${renderArtistInline(combinedArtist)}</div>
					</td>
					<td class="track-duration">${durationFormatted}</td>
					<td class="track-like"><button class="heart-btn ${likedClass}" data-track-id="${t.id}" title="В избранное">❤</button></td>
				`;
				// Make artist names clickable inside album tracks
				tr.addEventListener('click', (e)=>{
					const link = e.target && e.target.closest ? e.target.closest('.artist-link') : null;
					if (link) {
						e.preventDefault(); e.stopPropagation();
						const name = link.getAttribute('data-artist') || '';
						try { navigateTo('artist', { artist: name }); } catch(_) {}
					}
				});
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
		// Единая логика загрузки лайков альбомов (Windows и Mac)
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
			const allAlbumsRes = await fetch(api('/muzic2/src/api/all_albums.php'));
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
			.search-tracks-list { display: flex; flex-direction: column; gap: 0.75rem; }
			.search-track-card { position: relative; display: flex; align-items: center; gap: 1rem; padding: 0.9rem 1.1rem; border-radius: 18px; background: rgba(22, 22, 22, 0.92); border: 1px solid rgba(255, 255, 255, 0.04); transition: transform 0.25s ease, background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease; }
			.search-track-card:hover { transform: translateY(-2px); background: rgba(30, 30, 30, 0.95); border-color: rgba(29, 185, 84, 0.35); box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35); }
			.search-track-cover-wrap { width: 68px; height: 68px; border-radius: 16px; overflow: hidden; flex-shrink: 0; cursor: pointer; position: relative; }
			.search-track-cover { width: 100%; height: 100%; object-fit: cover; display: block; }
			.search-track-meta { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; cursor: pointer; }
			.search-track-title { display: flex; align-items: center; gap: 0.4rem; font-size: 1.05rem; font-weight: 600; color: #fff; }
			.search-track-title .exp-badge { position: relative; top: -1px; }
			.search-track-artist { color: #b3b3b3; font-size: 0.9rem; }
			.search-track-album { color: #6f6f6f; font-size: 0.82rem; }
			.search-track-actions { display: flex; align-items: center; gap: 0.6rem; margin-left: 1rem; }
			.search-track-play { width: 44px; height: 44px; border-radius: 50%; border: none; background: #1db954; color: #000; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s ease, box-shadow 0.2s ease; }
			.search-track-play:hover { transform: scale(1.05); box-shadow: 0 8px 20px rgba(29, 185, 84, 0.35); }
			.search-track-card .heart-btn { position: static !important; width: 44px; height: 44px; border-radius: 50%; background: #202020; border: 1px solid #2d2d2d; color: #b5b5b5; display: flex; align-items: center; justify-content: center; font-size: 18px; transition: all 0.25s ease; }
			.search-track-card .heart-btn:hover { color: #ffffff; border-color: #3a3a3a; }
			.search-track-card .heart-btn.liked { background: #1db954; border-color: #1db954; color: #000; }
			.search-track-card .heart-btn.liked:hover { color: #000; }
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
					html += '<div class="search-section"><h4>Треки</h4><div class="search-tracks-list">';
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
						html = '<div class="search-tracks-list">' + results.map(item => createTrackCard(item)).join('') + '</div>';
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
			const esc = v => String(v == null ? '' : v).replace(/'/g, "\\'");
			const coverPath = '/muzic2/' + String(track.cover || 'tracks/covers/placeholder.jpg').replace(/^\/+/, '');
			const play = `(()=>{ try{ let s='${esc(track.src||track.file_path||'')}'.trim(); if(!/^https?:/i.test(s)) s = (s.indexOf('tracks/')!==-1? '/muzic2/'+s.slice(s.indexOf('tracks/')) : '/muzic2/'+s.replace(/^\\/+/, '')); playTrack({ src: encodeURI(s), title: '${esc(track.title)}', artist: '${esc(track.artist)}', cover: '${esc(coverPath)}', id: ${track.id||0}, video_url: '${esc(track.video_url||'')}', explicit: ${track.explicit?1:0} }); }catch(e){ console.error('search play error', e); } })()`;
			const artistLine = track.feats && String(track.feats).trim()
				? `${track.artist}, ${track.feats}`
				: track.artist;
			const albumLine = track.album ? `<div class="search-track-album">${escapeHtml(track.album)}</div>` : '';
			return `
				<div class="search-track-card">
					<div class="search-track-cover-wrap" onclick="${play}">
						<img class="search-track-cover" loading="lazy" decoding="async" src="${escapeHtml(coverPath)}" alt="${escapeHtml(track.title || 'cover')}" onerror="this.onerror=null;this.src='/muzic2/tracks/covers/placeholder.jpg'">
					</div>
					<div class="search-track-meta" onclick="${play}">
						<div class="search-track-title">
							${escapeHtml(track.title)}
							${track.explicit ? ' <span class="exp-badge" title="Нецензурная лексика">E</span>' : ''}
						</div>
						<div class="search-track-artist">${renderArtistInline(artistLine)}</div>
						${albumLine}
					</div>
					<div class="search-track-actions">
						<button type="button" class="search-track-play" onclick="${play}" aria-label="Слушать трек">&#9654;</button>
						<button type="button" class="heart-btn ${likedClass}" data-track-id="${track.id}" title="В избранное">❤</button>
					</div>
				</div>
			`;
		}

		function createArtistCard(artist) {
			return `
				<div class="artist-tile" onclick="navigateTo('artist', { artist: '${encodeURIComponent(artist.name)}' })">
					<img class="artist-avatar" loading="lazy" src="/muzic2/${artist.cover || 'tracks/covers/placeholder.jpg'}" alt="avatar">
					<div class="artist-name">${renderArtistInline(artist.name)}</div>
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

	function renderContinueListening() {
		try {
			const raw = localStorage.getItem('muzic2_recent_listening_v1') || '[]';
			let items = [];
			try { items = JSON.parse(raw) || []; } catch(_) { items = []; }
			items = items.filter(x => x && x.src).slice(0, 8);
			if (!items.length) return;
			const sec = document.createElement('section');
			sec.className = 'continue-listening-section';
			sec.innerHTML = '<h3>Продолжить слушать</h3><div class="continue-grid" id="continue-grid"></div>';
			const anchor = document.querySelector('.home-hero') || mainContent.firstElementChild;
			if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(sec, anchor.nextSibling);
			const grid = sec.querySelector('#continue-grid');
			const html = items.map(it => {
				const cover = it.cover || '/muzic2/tracks/covers/placeholder.jpg';
				const pct = it.duration ? Math.max(0, Math.min(100, Math.round((it.currentTime/it.duration)*100))) : 0;
				return `
				<div class="continue-card" data-src="${escapeHtml(it.src)}" data-title="${escapeHtml(it.title||'')}" data-artist="${escapeHtml(it.artist||'')}" data-cover="${escapeHtml(cover)}">
					<div class="cc-cover-wrap">
						<img class="cc-cover" loading="lazy" decoding="async" src="${escapeHtml(cover)}" alt="cover" onerror="this.onerror=null;this.src='/muzic2/tracks/covers/placeholder.jpg'">
						<div class="cc-progress"><div class="cc-bar" style="width:${pct}%"></div></div>
					</div>
					<div class="cc-meta">
						<div class="cc-title">${escapeHtml(it.title||'')}</div>
						<div class="cc-artist">${escapeHtml(it.artist||'')}</div>
					</div>
				</div>`;
			}).join('');
			grid.innerHTML = html;
			grid.onclick = (e)=>{
				const card = e.target.closest('.continue-card'); if (!card) return;
				const src = card.getAttribute('data-src');
				const title = card.getAttribute('data-title')||'';
				const artist = card.getAttribute('data-artist')||'';
				const cover = card.getAttribute('data-cover')||'';
				try { playTrack({ src, title, artist, cover }); } catch(_) {}
			};
		} catch(_) {}
	}
}

function renderArtistInline(artistString) {
    if (!artistString) return '';
    try {
        const parts = String(artistString).split(',').map(s => s.trim()).filter(Boolean);
        return parts.map(p => `<span class="artist-link" data-artist="${escapeHtml(p)}">${escapeHtml(p)}</span>`).join(', ');
    } catch (_) { return escapeHtml(artistString); }
}

function buildStories(data) {
	try {
		const storiesInner = document.getElementById('stories-inner'); if (!storiesInner) return;
		const bubbles = [];
		if (data.artists && data.artists.length) {
			data.artists.slice(0,12).forEach(a=>{
				bubbles.push({ type:'artist', title: a.name || a.artist, cover: a.cover });
			});
		}
		if (data.albums && data.albums.length) {
			data.albums.slice(0,8).forEach(al=>{
				bubbles.push({ type:'album', title: al.title, cover: al.cover });
			});
		}
		storiesInner.innerHTML = bubbles.map(b=>{
			const img = '/muzic2/' + String(b.cover || 'tracks/covers/placeholder.jpg').replace(/^\/+/, '');
			return `<div class="story" data-type="${b.type}" data-title="${escapeHtml(b.title||'')}"><img src="${img}" alt="${escapeHtml(b.title||'')}"><div class="story-label">${escapeHtml(b.title||'')}</div></div>`;
		}).join('');
		storiesInner.onclick = (e)=>{
			const st = e.target.closest('.story'); if (!st) return;
			const type = st.getAttribute('data-type'); const title = st.getAttribute('data-title');
			if (type === 'artist') navigateTo('artist', { artist: title }); else if (type === 'album') navigateTo('album', { album: title });
		};
	} catch(_) {}
}

function buildSpotlight(data) {
	try {
		const grid = document.getElementById('spotlight-grid'); if (!grid) return;
		const picks = [];
		if (data.albums && data.albums.length) picks.push(...data.albums.slice(0,2).map(a=>({kind:'album', title:a.title, cover:a.cover})));
		if (data.tracks && data.tracks.length) picks.push(...data.tracks.slice(0,4).map(t=>({kind:'track', title:t.title, artist:t.artist, cover:t.cover, src:t.src||t.file_path})));
		grid.innerHTML = picks.map(p=>{
			const img = '/muzic2/' + String(p.cover || 'tracks/covers/placeholder.jpg').replace(/^\/+/, '');
			if (p.kind==='album') return `<div class="spotlight-card album" data-album="${escapeHtml(p.title)}"><img src="${img}"><div class="spotlight-meta"><div class="spotlight-title">${escapeHtml(p.title)}</div><div class="spotlight-sub">Альбом</div></div></div>`;
			return `<div class="spotlight-card track" data-title="${escapeHtml(p.title)}" data-artist="${escapeHtml(p.artist||'')}" data-src="${escapeHtml(p.src||'')}"><img src="${img}"><div class="spotlight-meta"><div class="spotlight-title">${escapeHtml(p.title)}</div><div class="spotlight-sub">${escapeHtml(p.artist||'')}</div></div></div>`;
		}).join('');
		grid.onclick = (e)=>{
			const card = e.target.closest('.spotlight-card'); if (!card) return;
			if (card.classList.contains('album')) { navigateTo('album', { album: card.getAttribute('data-album') }); return; }
			const src = card.getAttribute('data-src')||''; const title = card.getAttribute('data-title')||''; const artist = card.getAttribute('data-artist')||'';
			if (src) {
				try { playTrack({ src, title, artist, cover: card.querySelector('img')?.getAttribute('src')||'' }); } catch(_) {}
			}
		};
	} catch(_) {}
}

function upgradeRowsToHScroll() {
	try {
		['favorites-row','mixes-row','albums-row','tracks-row','artists-row'].forEach(id=>{
			const row = document.getElementById(id); if (!row) return;
			row.classList.add('hscroll');
			const wrap = row.parentElement; if (!wrap) return;
			const navLeft = document.createElement('button'); navLeft.className='row-nav left'; navLeft.innerHTML='‹';
			const navRight = document.createElement('button'); navRight.className='row-nav right'; navRight.innerHTML='›';
			wrap.style.position='relative'; wrap.appendChild(navLeft); wrap.appendChild(navRight);
			navLeft.onclick=()=>{ row.scrollBy({ left: -Math.max(300, row.clientWidth*0.6), behavior: 'smooth' }); };
			navRight.onclick=()=>{ row.scrollBy({ left: Math.max(300, row.clientWidth*0.6), behavior: 'smooth' }); };
		});
	} catch(_) {}
}

// Context menu for kebab button - works on all devices
function showContextMenu(event, track, trackIndex) {
	// Remove existing context menu
	const existingMenu = document.querySelector('.context-menu');
	if (existingMenu) {
		existingMenu.remove();
	}
	
	// Create context menu
	const menu = document.createElement('div');
	menu.className = 'context-menu show';
	
	// Get track data
	const trackTitle = track.title || '';
	const trackArtist = track.artist || '';
	const trackAlbum = track.album || '';
	
	// Create menu items
	const addToFavorites = document.createElement('button');
	addToFavorites.className = 'context-menu-item';
	addToFavorites.textContent = 'Добавить в избранное';
	addToFavorites.onclick = () => {
		toggleLike(track.id || trackIndex);
		menu.remove();
	};
	
	const goToArtist = document.createElement('button');
	goToArtist.className = 'context-menu-item';
	goToArtist.textContent = 'Перейти к артисту';
	goToArtist.onclick = () => {
		if (trackArtist) {
			navigateTo('artist', { artist: trackArtist });
		}
		menu.remove();
	};
	
	const goToAlbum = document.createElement('button');
	goToAlbum.className = 'context-menu-item';
	goToAlbum.textContent = 'Перейти к альбому';
	goToAlbum.onclick = () => {
		if (trackAlbum) {
			navigateTo('album', { album: trackAlbum });
		}
		menu.remove();
	};
	
	// Add items to menu
	menu.appendChild(addToFavorites);
	if (trackArtist) menu.appendChild(goToArtist);
	if (trackAlbum) menu.appendChild(goToAlbum);
	
	// Position menu - fixed positioning relative to button
	const rect = event.target.getBoundingClientRect();
	const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
	const scrollY = window.pageYOffset || document.documentElement.scrollTop;
	const menuWidth = 180;
	
	// Calculate absolute position (including scroll)
	const absoluteLeft = rect.left + scrollX;
	const absoluteTop = rect.bottom + scrollY;
	
	// Calculate horizontal position
	let left = absoluteLeft - menuWidth + rect.width; // Align right edge of menu with right edge of button
	if (left < 10) {
		left = absoluteLeft; // Show to the right if not enough space on left
	}
	
	// Position menu directly below the button
	menu.style.position = 'absolute';
	menu.style.left = left + 'px';
	menu.style.top = (absoluteTop + 5) + 'px';
	
	// Debug positioning
	console.log('Button rect:', rect);
	console.log('Scroll:', { scrollX, scrollY });
	console.log('Menu position:', { left: left + 'px', top: (absoluteTop + 5) + 'px' });
	
	// Add to document
	document.body.appendChild(menu);
	
	// Close menu when clicking outside
	const closeMenu = (e) => {
		if (!menu.contains(e.target)) {
			menu.remove();
			document.removeEventListener('click', closeMenu);
		}
	};
	
	setTimeout(() => {
		document.addEventListener('click', closeMenu);
	}, 100);
}

