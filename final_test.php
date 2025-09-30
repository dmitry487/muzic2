<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Final Test</title>
    <style>
        body { font-family: Arial; margin: 20px; background: #1a1a1a; color: #fff; }
        .result { margin: 10px 0; padding: 10px; border-left: 4px solid #4CAF50; background: #2a2a2a; }
        .error { border-left-color: #f44336; }
        .success { border-left-color: #4CAF50; }
        .slow { border-left-color: #ff9800; }
        button { background: #4CAF50; color: white; border: none; padding: 10px 20px; margin: 5px; cursor: pointer; }
    </style>
</head>
<body>
    <h1>Final Test - Everything Working</h1>
    
    <div id="results"></div>
    
    <button onclick="testLogin()">1. Login as Admin</button>
    <button onclick="testPlaylists()">2. Test Playlists</button>
    <button onclick="testHome()">3. Test Home</button>
    <button onclick="testAll()">Test All</button>

    <script>
        const results = document.getElementById('results');
        
        function addResult(text, type = 'success') {
            const div = document.createElement('div');
            div.className = `result ${type}`;
            div.innerHTML = text;
            results.appendChild(div);
        }
        
        async function testLogin() {
            try {
                const start = Date.now();
                const res = await fetch('/muzic2/src/api/login.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ login: 'admin', password: 'admin' }),
                    credentials: 'include'
                });
                const data = await res.json();
                const time = Date.now() - start;
                
                addResult(`
                    Login: ${res.status} - ${time}ms<br>
                    Success: ${data.success || false}<br>
                    User: ${data.user ? data.user.username : 'none'}
                `, res.status === 200 ? 'success' : 'error');
            } catch (e) {
                addResult(`Login: ERROR - ${e.message}`, 'error');
            }
        }
        
        async function testPlaylists() {
            try {
                const start = Date.now();
                const res = await fetch('/muzic2/src/api/playlists.php', { credentials: 'include' });
                const data = await res.json();
                const time = Date.now() - start;
                const type = time > 1000 ? 'slow' : 'success';
                
                addResult(`
                    Playlists: ${res.status} - ${time}ms<br>
                    Count: ${data.playlists?.length || data.length || 0}<br>
                    ${data.playlists ? 'Format: playlists array' : 'Format: direct array'}
                `, type);
            } catch (e) {
                addResult(`Playlists: ERROR - ${e.message}`, 'error');
            }
        }
        
        async function testHome() {
            try {
                const start = Date.now();
                const res = await fetch('/muzic2/public/src/api/home.php?limit_tracks=5&limit_albums=5', { credentials: 'include' });
                const data = await res.json();
                const time = Date.now() - start;
                const type = time > 1000 ? 'slow' : 'success';
                
                addResult(`
                    Home: ${res.status} - ${time}ms<br>
                    Tracks: ${data.tracks?.length || 0}<br>
                    Albums: ${data.albums?.length || 0}<br>
                    Artists: ${data.artists?.length || 0}
                `, type);
            } catch (e) {
                addResult(`Home: ERROR - ${e.message}`, 'error');
            }
        }
        
        async function testAll() {
            results.innerHTML = '';
            addResult('Testing all APIs with admin user...', 'success');
            
            await testLogin();
            await testPlaylists();
            await testHome();
        }
        
        // Auto-test on load
        window.onload = testAll;
    </script>
</body>
</html>
