<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Quick Debug</title>
    <style>
        body { font-family: Arial; margin: 20px; background: #1a1a1a; color: #fff; }
        .result { margin: 10px 0; padding: 10px; border-left: 4px solid #4CAF50; background: #2a2a2a; }
        .error { border-left-color: #f44336; }
        button { background: #4CAF50; color: white; border: none; padding: 10px 20px; margin: 5px; cursor: pointer; }
    </style>
</head>
<body>
    <h1>Quick Debug</h1>
    
    <div id="results"></div>
    
    <button onclick="testAll()">Test All</button>
    <button onclick="testAuth()">Test Auth</button>
    <button onclick="testPlaylists()">Test Playlists</button>

    <script>
        const results = document.getElementById('results');
        
        function addResult(text, isError = false) {
            const div = document.createElement('div');
            div.className = isError ? 'result error' : 'result';
            div.innerHTML = text;
            results.appendChild(div);
        }
        
        async function testAll() {
            results.innerHTML = '';
            addResult('Testing all APIs...');
            
            // Test auth
            try {
                const authRes = await fetch('/muzic2/src/api/user.php', { credentials: 'include' });
                const authData = await authRes.json();
                addResult(`Auth: ${authRes.status} - ${authData.user_id ? 'Logged in as ' + authData.username : 'Not logged in'}`);
            } catch (e) {
                addResult(`Auth: ERROR - ${e.message}`, true);
            }
            
            // Test playlists
            try {
                const plRes = await fetch('/muzic2/src/api/playlists.php', { credentials: 'include' });
                const plData = await plRes.json();
                addResult(`Playlists: ${plRes.status} - ${plData.length} playlists`);
            } catch (e) {
                addResult(`Playlists: ERROR - ${e.message}`, true);
            }
            
            // Test likes
            try {
                const likesRes = await fetch('/muzic2/src/api/likes.php', { credentials: 'include' });
                const likesData = await likesRes.json();
                addResult(`Likes: ${likesRes.status} - ${likesData.tracks?.length || 0} tracks, ${likesData.albums?.length || 0} albums`);
            } catch (e) {
                addResult(`Likes: ERROR - ${e.message}`, true);
            }
            
            // Test home
            try {
                const homeRes = await fetch('/muzic2/public/src/api/home.php', { credentials: 'include' });
                const homeData = await homeRes.json();
                addResult(`Home: ${homeRes.status} - ${homeData.tracks?.length || 0} tracks, ${homeData.albums?.length || 0} albums`);
            } catch (e) {
                addResult(`Home: ERROR - ${e.message}`, true);
            }
        }
        
        async function testAuth() {
            try {
                const res = await fetch('/muzic2/src/api/login.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: 'admin', password: 'admin' }),
                    credentials: 'include'
                });
                const data = await res.json();
                addResult(`Login: ${res.status} - ${data.message || 'Success'}`);
            } catch (e) {
                addResult(`Login: ERROR - ${e.message}`, true);
            }
        }
        
        async function testPlaylists() {
            try {
                const res = await fetch('/muzic2/src/api/playlists.php', { credentials: 'include' });
                const data = await res.json();
                addResult(`Playlists: ${res.status} - ${data.length} playlists`);
                if (data.length > 0) {
                    addResult(`First playlist: ${data[0].name} (ID: ${data[0].id})`);
                }
            } catch (e) {
                addResult(`Playlists: ERROR - ${e.message}`, true);
            }
        }
        
        // Auto-test on load
        window.onload = testAll;
    </script>
</body>
</html>
