const mainContent = document.getElementById('main-content');
const navHome = document.getElementById('nav-home');
const navSearch = document.getElementById('nav-search');
const navLibrary = document.getElementById('nav-library');

// Guard: run only if home navigation exists on this page
if (mainContent && navHome && navSearch && navLibrary) {
	function showPage(page) {
		if (page === 'Главная') {
			renderHome();
	} else if (page === 'Поиск') {
		renderSearch();
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
				const playBtn=document.createElement('button'); playBtn.className='track-play-btn'; playBtn.innerHTML='&#9654;'; playBtn.onclick=(e)=>{ e.stopPropagation(); const q=(data.tracks||[]).map(tt=>({ src: encodeURI('/muzic2/'+(tt.src||'')), title:tt.title, artist:tt.artist, cover:'/muzic2/'+(tt.cover||data.cover||'tracks/covers/placeholder.jpg') })); window.playTrack && window.playTrack({ ...q[i], queue:q, queueStartIndex:i }); };
				tr.children[0].style.position='relative'; tr.children[0].appendChild(playBtn);
				tr.onclick=(e)=>{ if(e.target!==playBtn){ const q=(data.tracks||[]).map(tt=>({ src: encodeURI('/muzic2/'+(tt.src||'')), title:tt.title, artist:tt.artist, cover:'/muzic2/'+(tt.cover||data.cover||'tracks/covers/placeholder.jpg') })); window.playTrack && window.playTrack({ ...q[i], queue:q, queueStartIndex:i }); } };
				tbody.appendChild(tr);
			});
			document.getElementById('album-play-btn').onclick=()=>{ const q=(data.tracks||[]).map(tt=>({ src: encodeURI('/muzic2/'+(tt.src||'')), title:tt.title, artist:tt.artist, cover:'/muzic2/'+(tt.cover||data.cover||'tracks/covers/placeholder.jpg') })); if(q.length){ window.playTrack && window.playTrack({ ...q[0], queue:q, queueStartIndex:0 }); } };
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
			(data.top_tracks||[]).forEach((t,i)=>{ const d=document.createElement('div'); d.className='track-item-numbered'; d.innerHTML=`<div class="track-number">${i+1}</div><div class="track-title-primary">${escapeHtml(t.title||'')}</div>`; d.onclick=()=>{ const q=(data.top_tracks||[]).map(tt=>({ src: encodeURI('/muzic2/'+(tt.src||'')), title:tt.title, artist:tt.artist, cover:'/muzic2/'+(tt.cover||data.cover||'tracks/covers/placeholder.jpg') })); window.playTrack && window.playTrack({ ...q[i], queue:q, queueStartIndex:i }); }; list.appendChild(d); });
			document.getElementById('play-all-btn').onclick=()=>{ const q=(data.top_tracks||[]).map(tt=>({ src: encodeURI('/muzic2/'+(tt.src||'')), title:tt.title, artist:tt.artist, cover:'/muzic2/'+(tt.cover||data.cover||'tracks/covers/placeholder.jpg') })); if(q.length){ window.playTrack && window.playTrack({ ...q[0], queue:q, queueStartIndex:0 }); } };
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
			return `
				<div class="card" onclick="playTrack('${encodeURIComponent(track.src)}', '${encodeURIComponent(track.title)}', '${encodeURIComponent(track.artist)}', '${encodeURIComponent(track.cover)}')">
					<img class="card-cover" src="/muzic2/${track.cover || 'tracks/covers/placeholder.jpg'}" alt="cover">
					<div class="card-info">
						<div class="card-title">${escapeHtml(track.title)}</div>
						<div class="card-artist">${escapeHtml(track.artist)}</div>
						<div class="card-type">${escapeHtml(track.album || '')}</div>
					</div>
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

