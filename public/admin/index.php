<?php
require_once __DIR__ . '/../../src/config/db.php';

// API
if (isset($_GET['api'])) {
  header('Content-Type: application/json; charset=utf-8');
  $db = get_db_connection();
  $db->exec('CREATE TABLE IF NOT EXISTS artists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    cover VARCHAR(255),
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )');
  $entity = $_GET['entity'] ?? '';
  $method = $_SERVER['REQUEST_METHOD'];
  $body = null;
  if ($method !== 'GET') {
    $raw = file_get_contents('php://input');
    $j = json_decode($raw, true);
    $body = is_array($j) ? $j : $_POST;
  }
  try {
    if ($entity === 'artists') {
      if ($method === 'GET') {
        $q = trim((string)($_GET['q'] ?? ''));
        if ($q !== '') {
          $st = $db->prepare("SELECT t.artist, MIN(t.cover) AS track_cover, COUNT(*) AS tracks, a.cover AS artist_cover, a.bio AS bio FROM tracks t LEFT JOIN artists a ON TRIM(LOWER(a.name))=TRIM(LOWER(t.artist)) WHERE t.artist LIKE ? GROUP BY t.artist, a.cover, a.bio ORDER BY t.artist ASC LIMIT 500");
          $st->execute(['%'.$q.'%']);
          $rows = $st->fetchAll();
        } else {
          $rows = $db->query("SELECT t.artist, MIN(t.cover) AS track_cover, COUNT(*) AS tracks, a.cover AS artist_cover, a.bio AS bio FROM tracks t LEFT JOIN artists a ON TRIM(LOWER(a.name))=TRIM(LOWER(t.artist)) GROUP BY t.artist, a.cover, a.bio ORDER BY t.artist ASC LIMIT 200")->fetchAll();
        }
        echo json_encode(['success'=>true,'data'=>$rows], JSON_UNESCAPED_UNICODE); exit;
      }
      $action = $body['action'] ?? '';
      if ($action === 'create') {
        $name = trim((string)($body['name'] ?? ''));
        $cover = trim((string)($body['cover'] ?? ''));
        $bio = trim((string)($body['bio'] ?? ''));
        if ($name==='') throw new Exception('Введите имя');
        $st=$db->prepare('INSERT INTO artists (name, cover, bio) VALUES (?,?,?) ON DUPLICATE KEY UPDATE cover=VALUES(cover), bio=VALUES(bio)');
        $st->execute([$name,$cover,$bio]);
        echo json_encode(['success'=>true]); exit;
      }
      if ($action === 'update') {
        $name = trim((string)($body['name'] ?? ''));
        $name_new = trim((string)($body['name_new'] ?? $name));
        $cover = trim((string)($body['cover'] ?? ''));
        $bio = trim((string)($body['bio'] ?? ''));
        if ($name==='') throw new Exception('Введите имя');
        $db->beginTransaction();
        if (strcasecmp($name, $name_new)!==0) {
          $st=$db->prepare('UPDATE tracks SET artist=? WHERE TRIM(LOWER(artist))=TRIM(LOWER(?))');
          $st->execute([$name_new,$name]);
        }
        $st=$db->prepare('INSERT INTO artists (name, cover, bio) VALUES (?,?,?) ON DUPLICATE KEY UPDATE cover=VALUES(cover), bio=VALUES(bio)');
        $st->execute([$name_new,$cover,$bio]);
        $db->commit();
        echo json_encode(['success'=>true]); exit;
      }
      if ($action === 'delete') {
        $name = trim((string)($body['name'] ?? ''));
        if ($name==='') throw new Exception('Введите имя');
        $st=$db->prepare('DELETE FROM artists WHERE TRIM(LOWER(name))=TRIM(LOWER(?))');
        $st->execute([$name]);
        echo json_encode(['success'=>true]); exit;
      }
      throw new Exception('Неизвестное действие');
    }

    if ($entity === 'albums') {
      if ($method === 'GET') {
        $q = trim((string)($_GET['q'] ?? ''));
        if ($q!=='') {
          $st = $db->prepare('SELECT album, MIN(artist) AS artist, MIN(album_type) AS album_type, MIN(cover) AS cover, COUNT(*) AS track_count FROM tracks WHERE album LIKE ? GROUP BY album ORDER BY album ASC LIMIT 500');
          $st->execute(['%'.$q.'%']);
          $rows = $st->fetchAll();
        } else {
          $rows = $db->query('SELECT album, MIN(artist) AS artist, MIN(album_type) AS album_type, MIN(cover) AS cover, COUNT(*) AS track_count FROM tracks GROUP BY album ORDER BY album ASC LIMIT 200')->fetchAll();
        }
        echo json_encode(['success'=>true,'data'=>$rows], JSON_UNESCAPED_UNICODE); exit;
      }
      $action = $body['action'] ?? '';
      if ($action === 'update') {
        $album = trim((string)($body['album'] ?? ''));
        if ($album==='') throw new Exception('Введите текущее название альбома');
        $album_new = trim((string)($body['album_new'] ?? ''));
        $artist = isset($body['artist']) ? trim((string)$body['artist']) : null;
        $cover = isset($body['cover']) ? trim((string)$body['cover']) : null;
        $type = isset($body['album_type']) && in_array($body['album_type'],['album','ep','single'])? $body['album_type'] : null;
        $db->beginTransaction();
        if ($artist!==null) { $st=$db->prepare('UPDATE tracks SET artist=? WHERE TRIM(LOWER(album))=TRIM(LOWER(?))'); $st->execute([$artist,$album]); }
        if ($cover!==null) { $st=$db->prepare('UPDATE tracks SET cover=? WHERE TRIM(LOWER(album))=TRIM(LOWER(?))'); $st->execute([$cover,$album]); }
        if ($type!==null) { $st=$db->prepare('UPDATE tracks SET album_type=? WHERE TRIM(LOWER(album))=TRIM(LOWER(?))'); $st->execute([$type,$album]); }
        if ($album_new!=='') { $st=$db->prepare('UPDATE tracks SET album=? WHERE TRIM(LOWER(album))=TRIM(LOWER(?))'); $st->execute([$album_new,$album]); }
        $db->commit();
        echo json_encode(['success'=>true]); exit;
      }
      throw new Exception('Неизвестное действие');
    }

    if ($entity === 'tracks') {
      if ($method === 'GET') {
        $q = trim((string)($_GET['q'] ?? ''));
        if ($q!=='') {
          $st=$db->prepare('SELECT * FROM tracks WHERE title LIKE ? OR artist LIKE ? OR album LIKE ? ORDER BY id DESC LIMIT 500');
          $st->execute(['%'.$q.'%','%'.$q.'%','%'.$q.'%']);
          $rows=$st->fetchAll();
        } else {
          $rows=$db->query('SELECT * FROM tracks ORDER BY id DESC LIMIT 200')->fetchAll();
        }
        echo json_encode(['success'=>true,'data'=>$rows], JSON_UNESCAPED_UNICODE); exit;
      }
      $action = $body['action'] ?? '';
      if ($action === 'create') {
        $title=trim((string)($body['title']??'')); $artist=trim((string)($body['artist']??'')); $album=trim((string)($body['album']??'')); $file=trim((string)($body['file_path']??''));
        $cover=trim((string)($body['cover']??'')); $type=in_array(($body['album_type']??'album'),['album','ep','single'])?$body['album_type']:'album'; $dur=intval($body['duration']??0);
        if ($title===''||$artist===''||$album===''||$file==='') throw new Exception('Заполните обязательные поля');
        $st=$db->prepare('INSERT INTO tracks (title,artist,album,album_type,duration,file_path,cover) VALUES (?,?,?,?,?,?,?)');
        $st->execute([$title,$artist,$album,$type,$dur,$file,$cover]); echo json_encode(['success'=>true,'id'=>$db->lastInsertId()]); exit;
      }
      if ($action === 'update') {
        $id=intval($body['id']??0); if ($id<=0) throw new Exception('Неверный ID');
        $fields=['title','artist','album','album_type','duration','file_path','cover']; $set=[]; $params=[':id'=>$id];
        foreach($fields as $f){ if(array_key_exists($f,$body)){ $set[]="$f=:$f"; $params[":$f"]= $f==='duration'?intval($body[$f]):trim((string)$body[$f]); }}
        if (!$set) throw new Exception('Нечего сохранять');
        $st=$db->prepare('UPDATE tracks SET '.implode(',',$set).' WHERE id=:id'); $st->execute($params); echo json_encode(['success'=>true]); exit;
      }
      if ($action === 'delete') {
        $id=intval($body['id']??0); if ($id<=0) throw new Exception('Неверный ID');
        $st=$db->prepare('DELETE FROM tracks WHERE id=?'); $st->execute([$id]); echo json_encode(['success'=>true]); exit;
      }
      throw new Exception('Неизвестное действие');
    }

    throw new Exception('Неизвестная сущность');
  } catch (Throwable $e) {
    http_response_code(400); echo json_encode(['success'=>false,'message'=>$e->getMessage()]);
  }
  exit;
}
?>
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Админка — Очень простая</title>
<style>
  :root{--bg:#0f0f10;--panel:#16171a;--panel2:#1d1f23;--text:#e6e6e6;--muted:#a0a6ad;--accent:#1ed760;--border:#2a2d32;--ok:#8aff8a;--err:#ff9b9b}
  *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}
  header{padding:16px;background:var(--panel);border-bottom:1px solid var(--border)} header h1{margin:0 0 6px} header p{margin:0;color:var(--muted)}
  .bar{display:flex;gap:10px;padding:12px;background:var(--panel);border-bottom:1px solid var(--border);flex-wrap:wrap}
  .tab{padding:12px 16px;border-radius:12px;border:2px solid var(--border);background:var(--panel2);cursor:pointer;font-weight:700}
  .tab.active{border-color:var(--accent)}
  .controls{display:flex;gap:10px;padding:12px;flex-wrap:wrap}
  .controls input{padding:12px;border-radius:10px;border:1px solid var(--border);background:#0f1113;color:#fff;min-width:240px}
  .btn{padding:12px 16px;border-radius:12px;border:0;background:#2a2f34;color:#fff;cursor:pointer;font-weight:700}
  .btn.primary{background:var(--accent);color:#000}
  .list{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;padding:12px}
  .card{background:var(--panel2);border:1px solid var(--border);border-radius:14px;padding:12px}
  .card h3{margin:8px 0 4px}
  .small{color:var(--muted);font-size:13px}
  .img{width:100%;aspect-ratio:1;border-radius:12px;border:1px solid var(--border);object-fit:cover;background:#0e0f11}
  .row{display:flex;gap:10px;margin-top:10px}
  .status{padding:10px 12px}
  .ok{color:var(--ok)} .err{color:var(--err)}
  .modal{position:fixed;inset:0;background:rgba(0,0,0,.5);display:none;align-items:center;justify-content:center;padding:16px;z-index:1000}
  .box{background:#121317;border:1px solid var(--border);border-radius:14px;max-width:560px;width:100%;padding:16px}
  .field{margin:10px 0} .field label{display:block;margin-bottom:6px} .field input,.field textarea,.field select{width:100%;padding:12px;border-radius:10px;border:1px solid var(--border);background:#0f1113;color:#fff}
  .actions{display:flex;gap:10px;justify-content:flex-end;margin-top:12px}
</style>
</head>
<body>
<header>
  <h1>Админка (просто)</h1>
  <p>Меняйте имена, картинки и описание без кода</p>
</header>
<div class="bar">
  <button class="tab active" data-tab="artists">Артисты</button>
  <button class="tab" data-tab="albums">Альбомы</button>
  <button class="tab" data-tab="tracks">Треки</button>
</div>
<div class="controls">
  <input id="search" placeholder="Поиск..." />
  <button class="btn primary" id="add">+ Добавить</button>
</div>
<div class="list" id="list"></div>
<div class="status" id="status"></div>

<div class="modal" id="modal">
  <div class="box">
    <h2 id="mtitle">Редактирование</h2>
    <div id="mbody"></div>
    <div class="actions">
      <button class="btn" id="close">Закрыть</button>
      <button class="btn primary" id="save">Сохранить</button>
    </div>
    <div class="status" id="mstatus"></div>
  </div>
</div>

<script>
const api='index.php?api=1';
const list=document.getElementById('list'); const statusEl=document.getElementById('status'); const search=document.getElementById('search'); const add=document.getElementById('add');
const modal=document.getElementById('modal'); const mtitle=document.getElementById('mtitle'); const mbody=document.getElementById('mbody'); const mstatus=document.getElementById('mstatus'); const closeBtn=document.getElementById('close'); const saveBtn=document.getElementById('save');
let tab='artists', items=[], current=null;
function ok(t){statusEl.textContent=t||''; statusEl.className='status ok'} function err(t){statusEl.textContent=t||''; statusEl.className='status err'} function mok(t){mstatus.textContent=t||''; mstatus.className='status ok'} function merr(t){mstatus.textContent=t||''; mstatus.className='status err'}
function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
function img(src){ if(!src) return ''; const p=src.startsWith('/muzic2/')?src:('/muzic2/'+src.replace(/^\//,'')); return `<img class="img" src="${p}" onerror="this.style.display='none'">`; }
async function load(){ try{ ok('Загрузка...'); const q=search.value.trim(); const r=await fetch(`${api}&entity=${tab}${q?`&q=${encodeURIComponent(q)}`:''}`); const j=await r.json(); if(!j.success) throw new Error(j.message||'Ошибка'); items=j.data||[]; render(); ok(items.length?`Найдено: ${items.length}`:'Ничего не найдено'); }catch(e){ err(e.message)} }
function render(){ list.innerHTML=''; if(tab==='artists'){ items.forEach(a=>{ const c=document.createElement('div'); c.className='card'; const cover=a.artist_cover||a.track_cover||''; c.innerHTML=`${img(cover)}<h3>${esc(a.artist||'Без имени')}</h3><div class='small'>Треков: ${a.tracks||0}</div><div class='row'><button class='btn primary'>Изменить</button></div>`; c.querySelector('.btn.primary').onclick=()=>editArtist(a); list.appendChild(c); }); }
 if(tab==='albums'){ items.forEach(al=>{ const c=document.createElement('div'); c.className='card'; c.innerHTML=`${img(al.cover)}<h3>${esc(al.album||'Без названия')}</h3><div class='small'>Артист: ${esc(al.artist||'')}</div><div class='small'>Тип: ${esc(al.album_type||'')}</div><div class='small'>Треков: ${al.track_count||0}</div><div class='row'><button class='btn primary'>Изменить</button></div>`; c.querySelector('.btn.primary').onclick=()=>editAlbum(al); list.appendChild(c); }); }
 if(tab==='tracks'){ items.forEach(t=>{ const c=document.createElement('div'); c.className='card'; c.innerHTML=`${img(t.cover)}<h3>${esc(t.title||'Без названия')}</h3><div class='small'>Артист: ${esc(t.artist||'')}</div><div class='small'>Альбом: ${esc(t.album||'')}</div><div class='small'>Файл: ${esc(t.file_path||'')}</div><div class='row'><button class='btn primary'>Изменить</button><button class='btn' style='background:#3a1416;color:#ffb4b4' >Удалить</button></div>`; c.querySelector('.btn.primary').onclick=()=>editTrack(t); c.querySelectorAll('.btn')[1].onclick=()=>delTrack(t); list.appendChild(c); }); }
}
function openModal(title, html, it){ mtitle.textContent=title; mbody.innerHTML=html; mstatus.textContent=''; modal.style.display='flex'; current=it||null; }
function closeModal(){ modal.style.display='none'; current=null; }
closeBtn.onclick=closeModal;
async function upload(file){ const fd=new FormData(); fd.append('cover', file); const r=await fetch('../upload_cover.php',{method:'POST',body:fd}); const j=await r.json(); if(!r.ok||!j.success) throw new Error(j.message||'Ошибка загрузки'); return j.path; }
function editArtist(a){ openModal('Изменить артиста', `<div class='field'><label>Имя</label><input id='f-name' value='${esc(a.artist||'')}'></div><div class='field'><label>Фото (путь или загрузите)</label><div style='display:flex;gap:8px'><input id='f-cover' value='${esc(a.artist_cover||a.track_cover||'')}' style='flex:1'><input id='f-file' type='file' accept='image/*' style='flex:1'></div></div><div class='field'><label>Био</label><textarea id='f-bio' rows='4'>${esc(a.bio||'')}</textarea></div>` , a); saveBtn.onclick=async()=>{ try{ mok('Сохранение...'); let cover=document.getElementById('f-cover').value.trim(); const file=document.getElementById('f-file').files[0]; if(file){ cover=await upload(file); document.getElementById('f-cover').value=cover; } const payload={action:'update', name:a.artist, name_new:document.getElementById('f-name').value.trim(), cover, bio:document.getElementById('f-bio').value.trim()}; const r=await fetch(`${api}&entity=artists`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); const j=await r.json(); if(!j.success) throw new Error(j.message||'Ошибка'); closeModal(); load(); }catch(e){ merr(e.message) } } }
function editAlbum(al){ openModal('Изменить альбом', `<div class='field'><label>Альбом</label><input id='f-album' value='${esc(al.album||'')}'></div><div class='field'><label>Артист</label><input id='f-artist' value='${esc(al.artist||'')}'></div><div class='field'><label>Тип</label><select id='f-type'><option value='album' ${al.album_type==='album'?'selected':''}>Альбом</option><option value='ep' ${al.album_type==='ep'?'selected':''}>EP</option><option value='single' ${al.album_type==='single'?'selected':''}>Сингл</option></select></div><div class='field'><label>Обложка (путь или загрузите)</label><div style='display:flex;gap:8px'><input id='f-cover' value='${esc(al.cover||'')}' style='flex:1'><input id='f-file' type='file' accept='image/*' style='flex:1'></div></div>`, al); saveBtn.onclick=async()=>{ try{ mok('Сохранение...'); let cover=document.getElementById('f-cover').value.trim(); const file=document.getElementById('f-file').files[0]; if(file){ cover=await upload(file); document.getElementById('f-cover').value=cover; } const payload={action:'update', album: al.album, album_new: document.getElementById('f-album').value.trim(), artist: document.getElementById('f-artist').value.trim(), album_type: document.getElementById('f-type').value, cover}; const r=await fetch(`${api}&entity=albums`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); const j=await r.json(); if(!j.success) throw new Error(j.message||'Ошибка'); closeModal(); load(); }catch(e){ merr(e.message) } } }
function editTrack(t){ openModal('Изменить трек', `<div class='field'><label>Название</label><input id='f-title' value='${esc(t.title||'')}'></div><div class='field'><label>Артист</label><input id='f-artist' value='${esc(t.artist||'')}'></div><div class='field'><label>Альбом</label><input id='f-album' value='${esc(t.album||'')}'></div><div class='field'><label>Тип</label><select id='f-type'><option value='album' ${t.album_type==='album'?'selected':''}>Альбом</option><option value='ep' ${t.album_type==='ep'?'selected':''}>EP</option><option value='single' ${t.album_type==='single'?'selected':''}>Сингл</option></select></div><div class='field'><label>Файл (tracks/music/...)</label><input id='f-file' value='${esc(t.file_path||'')}'></div><div class='field'><label>Обложка (путь или загрузите)</label><div style='display:flex;gap:8px'><input id='f-cover' value='${esc(t.cover||'')}' style='flex:1'><input id='f-file2' type='file' accept='image/*' style='flex:1'></div></div><div class='field'><label>Длительность (сек)</label><input id='f-dur' type='number' value='${t.duration||0}'></div>`, t); saveBtn.onclick=async()=>{ try{ mok('Сохранение...'); let cover=document.getElementById('f-cover').value.trim(); const file=document.getElementById('f-file2').files[0]; if(file){ cover=await upload(file); document.getElementById('f-cover').value=cover; } const payload={action:'update', id:t.id, title:document.getElementById('f-title').value.trim(), artist:document.getElementById('f-artist').value.trim(), album:document.getElementById('f-album').value.trim(), album_type:document.getElementById('f-type').value, file_path:document.getElementById('f-file').value.trim(), cover, duration:parseInt(document.getElementById('f-dur').value||0,10)}; const r=await fetch(`${api}&entity=tracks`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); const j=await r.json(); if(!j.success) throw new Error(j.message||'Ошибка'); closeModal(); load(); }catch(e){ merr(e.message) } } }
async function delTrack(t){ if(!confirm(`Удалить трек "${t.title}"?`)) return; const r=await fetch(`${api}&entity=tracks`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete',id:t.id})}); const j=await r.json(); if(j.success){ ok('Трек удалён'); load(); } else { err(j.message||'Ошибка') } }
add.onclick=()=>{ if(tab==='artists'){ editArtist({artist:'',artist_cover:'',bio:''}); document.getElementById('f-name').value=''; saveBtn.onclick = async ()=>{ try{ mok('Сохранение...'); let cover=document.getElementById('f-cover').value.trim(); const file=document.getElementById('f-file').files[0]; if(file){ cover=await upload(file); document.getElementById('f-cover').value=cover; } const payload={action:'create', name:document.getElementById('f-name').value.trim(), cover, bio:document.getElementById('f-bio').value.trim()}; const r=await fetch(`${api}&entity=artists`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); const j=await r.json(); if(!j.success) throw new Error(j.message||'Ошибка'); closeModal(); load(); }catch(e){ merr(e.message) } } }
 else if(tab==='albums'){ editAlbum({album:'',artist:'',album_type:'album',cover:''}); }
 else if(tab==='tracks'){ editTrack({title:'',artist:'',album:'',album_type:'album',file_path:'',cover:'',duration:0}); }
};

document.querySelectorAll('.tab').forEach(b=> b.onclick=()=>{ document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active')); b.classList.add('active'); tab=b.dataset.tab; load(); });
search.oninput=()=>{ clearTimeout(search._t); search._t=setTimeout(load,300) };
load();
</script>
</body>
</html>
