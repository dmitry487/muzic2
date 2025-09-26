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

	navHome.onclick = () => showPage('Главная');
	navSearch.onclick = () => showPage('Поиск');
	navLibrary.onclick = () => showPage('Моя музыка');

	showPage('Главная');

	// Session state
	let currentUser = null;

	// Ensure auth modals exist globally
	ensureAuthModals();

	(async function initSession() {
		try {
			const res = await fetch('/muzic2/src/api/user.php', { credentials: 'include' });
			const data = await res.json();
			currentUser = data.authenticated ? data.user : null;
			renderAuthHeader();
		} catch (e) {
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
				<div class="user-info">
					<span class="username">${escapeHtml(currentUser.username || '')}</span>
				</div>
			`;
		} else {
			panel.innerHTML = `
				<div class="auth-buttons">
					<button id="header-login" class="btn primary">Войти</button>
					<button id="header-register" class="btn">Регистрация</button>
				</div>
			`;
			attachAuthModalTriggers();
			const headerLogin = document.getElementById('header-login');
			const headerRegister = document.getElementById('header-register');
			if (headerLogin) headerLogin.onclick = () => {
				const open = id => { document.querySelector('#auth-modals .modal-overlay').style.display='block'; document.getElementById(id).style.display='block'; };
				open('login-modal');
			};
			if (headerRegister) headerRegister.onclick = () => {
				const open = id => { document.querySelector('#auth-modals .modal-overlay').style.display='block'; document.getElementById(id).style.display='block'; };
				open('register-modal');
			};
		}
	}

	async function renderHome() {
		mainContent.innerHTML = '<div class="loading">Загрузка...</div>';
		try {
			const res = await fetch('/muzic2/public/src/api/home.php?limit_tracks=8&limit_albums=6&limit_artists=6&limit_mixes=6&limit_favorites=6');
			const data = await res.json();
			// Load liked set for current user to render green hearts
			try {
				const likesRes = await fetch('/muzic2/src/api/likes.php', { credentials: 'include' });
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
			renderCards('mixes-row', data.mixes, 'track');
			renderCards('albums-row', data.albums, 'album');
			renderCards('tracks-row', data.tracks, 'track');
			renderCards('artists-row', data.artists, 'artist');
		} catch (e) {
			mainContent.innerHTML = '<div class="error">Ошибка загрузки главной страницы</div>';
		}
	}

	// =====================
	// My Music (Favorites & Playlists)
	// =====================
	async function renderMyMusic() {
		mainContent.innerHTML = '<div class="loading">Загрузка...</div>';

		injectMyMusicStyles();

		// Require auth
		if (!currentUser) {
			mainContent.innerHTML = `
				<section class="auth-required">
					<h2>Моя музыка</h2>
					<p>Войдите, чтобы увидеть любимые треки и плейлисты.</p>
					<div class="auth-actions">
						<button id="open-login" class="btn primary">Войти</button>
						<button id="open-register" class="btn">Регистрация</button>
					</div>
				</section>
			`;
			attachAuthModalTriggers();
			ensureAuthModals();
			return;
		}

		try {
			const listsRes = await fetch('/muzic2/src/api/playlists.php', { credentials: 'include' });
			const playlistsData = await listsRes.json();
			const playlists = playlistsData.playlists || [];

			mainContent.innerHTML = `
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

			// Click handlers for playlist tiles
			playlists.forEach(pl => {
				const el = document.getElementById(`pl-${pl.id}`);
				if (el) el.onclick = () => openPlaylist(pl.id, pl.name);
			});
		} catch (e) {
			mainContent.innerHTML = '<div class="error">Ошибка загрузки</div>';
		}
	}

	// Global delegation for heart toggle
		document.addEventListener('click', async (e) => {
		const btn = e.target.closest('.heart-btn');
		if (!btn) return;
		if (!currentUser) { attachAuthModalTriggers(); const open = id => { document.querySelector('#auth-modals .modal-overlay').style.display='block'; document.getElementById(id).style.display='block'; }; open('login-modal'); return; }
		const trackId = Number(btn.getAttribute('data-track-id'));
		if (!trackId) return;
		if (btn.classList.contains('liked')) {
			await fetch('/muzic2/src/api/likes.php', { method:'DELETE', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ track_id: trackId })});
			btn.classList.remove('liked');
			window.__likedSet && window.__likedSet.delete(trackId);
				try{ document.dispatchEvent(new CustomEvent('likes:updated', { detail:{ trackId, liked:false } })); }catch(_){ }
		} else {
			await fetch('/muzic2/src/api/likes.php', { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ track_id: trackId })});
			btn.classList.add('liked');
			if (!window.__likedSet) window.__likedSet = new Set();
			window.__likedSet.add(trackId);
				try{ document.dispatchEvent(new CustomEvent('likes:updated', { detail:{ trackId, liked:true } })); }catch(_){ }
		}
	});

	function playlistTile(pl) {
		const cover = '/muzic2/public/assets/img/playlist-placeholder.png';
		return `
			<div class="tile" id="pl-${pl.id}">
				<img class="tile-cover" src="${cover}" alt="cover">
				<div class="tile-title">${escapeHtml(pl.name)}</div>
				<div class="tile-desc">Плейлист</div>
				<div class="tile-play">&#9654;</div>
			</div>
		`;
	}

	async function openPlaylist(playlistId, playlistName) {
		const view = document.getElementById('playlist-view');
		view.innerHTML = '<div class="loading">Загрузка плейлиста...</div>';
		try {
			const res = await fetch(`/muzic2/src/api/playlists.php?playlist_id=${playlistId}`, { credentials: 'include' });
			const data = await res.json();
			const tracks = data.tracks || [];
			view.innerHTML = `
				<section class="playlist-section">
					<div class="playlist-header">
						<h3>${escapeHtml(playlistName)}</h3>
						<div class="playlist-actions">
							<button class="btn" id="rename-pl">Переименовать</button>
							<button class="btn danger" id="delete-pl">Удалить</button>
						</div>
					</div>
					<div class="card-row">
						${tracks.map(t => createTrackCard(t)).join('') || '<div class="empty">Нет треков</div>'}
					</div>
				</section>
			`;

			document.getElementById('rename-pl').onclick = async () => {
				const name = prompt('Новое название', playlistName);
				if (!name) return;
				await fetch('/muzic2/src/api/playlists.php/rename', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playlist_id: playlistId, name }) });
				renderMyMusic();
			};
			document.getElementById('delete-pl').onclick = async () => {
				if (!confirm('Удалить плейлист?')) return;
				await fetch('/muzic2/src/api/playlists.php/delete', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playlist_id: playlistId }) });
				renderMyMusic();
			};
		} catch (e) {
			view.innerHTML = '<div class="error">Ошибка загрузки плейлиста</div>';
		}
	}

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
			if (errBox) { errBox.style.display='none'; errBox.textContent=''; }
			if (!login || !password) { if (errBox){ errBox.textContent='Введите логин и пароль'; errBox.style.display='block'; } return; }
			try {
				const res = await fetch('/muzic2/src/api/login.php', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login, password }) });
				let ok = res.ok;
				let payload = null;
				try { payload = await res.json(); } catch(_) { payload = null; }
				if (!ok) {
					const msg = (payload && payload.error) ? payload.error : 'Ошибка авторизации';
					if (errBox) { errBox.textContent = msg; errBox.style.display='block'; }
					return;
				}
				const uRes = await fetch('/muzic2/src/api/user.php', { credentials: 'include' });
				const u = await uRes.json();
				if (u && u.authenticated && u.user) {
					currentUser = u.user;
					closeAll();
					// Перезагрузка страницы для гарантированного применения состояния сессии везде
					window.location.reload();
				} else {
					if (errBox) { errBox.textContent = 'Сессия не установлена'; errBox.style.display='block'; }
				}
			} catch (e) {
				if (errBox) { errBox.textContent = 'Сетевая ошибка'; errBox.style.display='block'; }
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
				const res = await fetch('/muzic2/src/api/register.php', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, username, password }) });
				let ok = res.ok; let payload=null; try { payload = await res.json(); } catch(_) {}
				if (!ok) { if (errBox){ errBox.textContent=(payload&&payload.error)||'Ошибка регистрации'; errBox.style.display='block'; } return; }
				await doLoginPostRegister(username, password);
			} catch (e) {
				if (errBox) { errBox.textContent='Сетевая ошибка'; errBox.style.display='block'; }
			}
		};
		async function doLoginPostRegister(login, password){
			const errBox = document.getElementById('login-error'); if (errBox){ errBox.style.display='none'; errBox.textContent=''; }
			const res = await fetch('/muzic2/src/api/login.php', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login, password }) });
			let ok = res.ok; let payload=null; try { payload = await res.json(); } catch(_) {}
			if (!ok) { if (errBox){ errBox.textContent=(payload&&payload.error)||'Ошибка авторизации'; errBox.style.display='block'; } return; }
			const uRes = await fetch('/muzic2/src/api/user.php', { credentials: 'include' });
			const u = await uRes.json();
			if (u && u.authenticated && u.user) {
				currentUser = u.user; closeAll(); window.location.reload();
			} else {
				if (errBox){ errBox.textContent='Сессия не установлена'; errBox.style.display='block'; }
			}
		}
		const loginSubmit = document.getElementById('login-submit');
		const regSubmit = document.getElementById('reg-submit');
		if (loginSubmit) loginSubmit.onclick = doLogin;
		if (regSubmit) regSubmit.onclick = doRegister;
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
			html = items.map((item, idx) => `
				<div class="card" data-idx="${idx}">
					<img class="card-cover" loading="lazy" src="/muzic2/${item.cover || 'tracks/covers/placeholder.jpg'}" alt="cover">
					<div class="card-info">
                <div class="card-title">${escapeHtml(item.title)}</div>
                <div class="card-artist">${item.explicit? '<span class=\"exp-badge\" title=\"Нецензурная лексика\">E</span>':''}${escapeHtml(item.artist)}</div>
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
					if (window.muzic2_is_playing && typeof renderAlbumSPA === 'function') {
						renderAlbumSPA(decodeURIComponent(albumName));
					} else {
						window.location = 'album.html?album=' + albumName;
					}
				}
			};
		} else if (type === 'artist') {
			row.onclick = function(e) {
				let el = e.target;
				while (el && el !== row && !el.hasAttribute('data-artist')) el = el.parentElement;
				if (el && el.hasAttribute('data-artist')) {
					const artistName = el.getAttribute('data-artist');
					if (window.muzic2_is_playing && typeof renderArtistSPA === 'function') {
						renderArtistSPA(decodeURIComponent(artistName));
					} else {
						window.location = 'artist.html?artist=' + artistName;
					}
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

	// Minimal SPA renderers to avoid reload only when music is playing
	async function renderAlbumSPA(albumName){
		mainContent.innerHTML = '<div class="loading">Загрузка альбома...</div>';
		try {
			const res = await fetch('/muzic2/src/api/album.php?album=' + encodeURIComponent(albumName));
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
			.album-controls{display:flex;align-items:center;gap:1.2rem;margin-bottom:1.5rem}
			.album-play-btn{background:#1db954;color:#fff;border:none;border-radius:50%;width:64px;height:64px;font-size:2.5rem;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 16px rgba(30,185,84,0.15)}
			.tracks-table{width:100%;border-collapse:collapse;margin-bottom:2rem}
			.tracks-table th,.tracks-table td{padding:0.7rem 1rem;text-align:left;color:#fff;font-size:1.08rem}
			.tracks-table tr{transition:background 0.15s;cursor:pointer;position:relative}
			.tracks-table tr:hover{background:#232323}
			.track-play-btn{display:none;position:absolute;left:1.1rem;top:50%;transform:translateY(-50%);background:#1db954;color:#fff;border:none;border-radius:50%;width:32px;height:32px;font-size:1.3rem;align-items:center;justify-content:center;cursor:pointer;z-index:2;box-shadow:0 2px 8px rgba(30,185,84,0.10)}
			.tracks-table tr:hover .track-play-btn{display:flex}
			.tracks-table tr:hover .track-num{visibility:hidden}
			</style>`;
			mainContent.innerHTML = albumStyles + `
				<div class="album-header">
					<img class="album-cover" src="/muzic2/${data.cover || 'tracks/covers/placeholder.jpg'}" alt="cover">
					<div class="album-meta">
						<div class="album-title">${escapeHtml(data.title||'')}</div>
						<div class="album-artist">${escapeHtml(data.artist||'')}</div>
					</div>
				</div>
				<div class="album-controls"><button class="album-play-btn" id="album-play-btn">▶</button></div>
				<table class="tracks-table"><tbody id="tracks-tbody"></tbody></table>
			`;
			const tbody = document.getElementById('tracks-tbody');
            (data.tracks||[]).forEach((t,i)=>{
				const tr=document.createElement('tr');
				tr.innerHTML = `<td class="track-num">${i+1}</td><td class="track-title">${escapeHtml(t.title||'')}</td><td class="track-artist">${escapeHtml(t.artist||'')}</td><td class="track-duration">${t.duration||0}</td>`;
                const playBtn=document.createElement('button'); playBtn.className='track-play-btn'; playBtn.innerHTML='&#9654;'; playBtn.onclick=(e)=>{ e.stopPropagation(); const q=(data.tracks||[]).map(tt=>({ src: encodeURI('/muzic2/'+(tt.file_path||'')), title:tt.title, artist:tt.artist, cover:'/muzic2/'+(tt.cover||data.cover||'tracks/covers/placeholder.jpg'), video_url: tt.video_url||'' })); window.playTrack && window.playTrack({ ...q[i], queue:q, queueStartIndex:i }); };
				tr.children[0].style.position='relative'; tr.children[0].appendChild(playBtn);
                tr.onclick=(e)=>{ if(e.target!==playBtn){ const q=(data.tracks||[]).map(tt=>({ src: encodeURI('/muzic2/'+(tt.file_path||'')), title:tt.title, artist:tt.artist, cover:'/muzic2/'+(tt.cover||data.cover||'tracks/covers/placeholder.jpg'), video_url: tt.video_url||'' })); window.playTrack && window.playTrack({ ...q[i], queue:q, queueStartIndex:i }); } };
				tbody.appendChild(tr);
			});
            document.getElementById('album-play-btn').onclick=()=>{ const q=(data.tracks||[]).map(tt=>({ src: encodeURI('/muzic2/'+(tt.file_path||'')), title:tt.title, artist:tt.artist, cover:'/muzic2/'+(tt.cover||data.cover||'tracks/covers/placeholder.jpg'), video_url: tt.video_url||'' })); if(q.length){ window.playTrack && window.playTrack({ ...q[0], queue:q, queueStartIndex:0 }); } };
		} catch (e) {
			mainContent.innerHTML = '<div class="error">Ошибка загрузки альбома</div>';
		}
	}

	async function renderArtistSPA(artistName){
		mainContent.innerHTML = '<div class="loading">Загрузка артиста...</div>';
		try {
			// Ensure artist.css for proper layout
			ensureStyle('/muzic2/public/assets/css/artist.css');
			const res = await fetch('/muzic2/public/src/api/artist.php?artist=' + encodeURIComponent(artistName));
			const data = await res.json();
			if (data.error) { mainContent.innerHTML = '<div class="error">Артист не найден</div>'; return; }
			mainContent.innerHTML = `
				<div class="artist-hero"><div class="artist-avatar-container"><img class="artist-avatar-large" src="/muzic2/${data.cover||'tracks/covers/placeholder.jpg'}"></div><div class="artist-info"><div class="artist-verified"><span>Подтверждённый исполнитель</span></div><h1 class="artist-name-large">${escapeHtml(data.name||'')}</h1><p id="artist-listeners" class="artist-listeners"></p></div></div>
				<div class="artist-controls"><button class="play-all-btn" id="play-all-btn"><i class="fas fa-play"></i></button></div>
				<div class="popular-tracks-section"><h2>Популярные треки</h2><div id="popular-tracks" class="tracks-list-numbered"></div></div>
			`;
			document.getElementById('artist-listeners').textContent = `${(data.monthly_listeners||0).toLocaleString('ru-RU')} слушателей за месяц`;
			const list = document.getElementById('popular-tracks'); list.innerHTML='';
			(data.top_tracks||[]).forEach((t,i)=>{ const d=document.createElement('div'); d.className='track-item-numbered'; d.innerHTML=`<div class="track-number">${i+1}</div><div class="track-title-primary">${escapeHtml(t.title||'')}</div>`; d.onclick=()=>{ const q=(data.top_tracks||[]).map(tt=>({ src: encodeURI('/muzic2/'+(tt.file_path||'')), title:tt.title, artist:tt.artist, cover:'/muzic2/'+(tt.cover||data.cover||'tracks/covers/placeholder.jpg') })); window.playTrack && window.playTrack({ ...q[i], queue:q, queueStartIndex:i }); }; list.appendChild(d); });
			document.getElementById('play-all-btn').onclick=()=>{ const q=(data.top_tracks||[]).map(tt=>({ src: encodeURI('/muzic2/'+(tt.file_path||'')), title:tt.title, artist:tt.artist, cover:'/muzic2/'+(tt.cover||data.cover||'tracks/covers/placeholder.jpg') })); if(q.length){ window.playTrack && window.playTrack({ ...q[0], queue:q, queueStartIndex:0 }); } };
		} catch (e) {
			mainContent.innerHTML = '<div class="error">Ошибка загрузки артиста</div>';
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
				const response = await fetch(`/muzic2/src/api/search.php?q=${encodeURIComponent(query)}&type=${type}`);
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
					<div class="card-artist">${escapeHtml(track.artist)}</div>
					<div class="card-type">${escapeHtml(track.album || '')}</div>
				</div>
				<button class="heart-btn ${likedClass}" data-track-id="${track.id}" title="В избранное">❤</button>
			</div>
		`;
		}

		function createArtistCard(artist) {
			return `
				<div class="artist-tile" onclick="window.location.href='artist.html?artist=${encodeURIComponent(artist.name)}'">
					<img class="artist-avatar" src="/muzic2/${artist.cover || 'tracks/covers/placeholder.jpg'}" alt="avatar">
					<div class="artist-name">${escapeHtml(artist.name)}</div>
					<div class="artist-tracks">${artist.track_count} треков</div>
				</div>
			`;
		}

		function createAlbumCard(album) {
			return `
				<div class="tile" onclick="window.location.href='album.html?album=${encodeURIComponent(album.title)}'">
					<img class="tile-cover" src="/muzic2/${album.cover || 'tracks/covers/placeholder.jpg'}" alt="cover">
					<div class="tile-title">${escapeHtml(album.title)}</div>
					<div class="tile-desc">${escapeHtml(album.artist || '')}</div>
					<div class="tile-play">&#9654;</div>
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

