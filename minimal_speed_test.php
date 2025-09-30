<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Minimal Speed Test</title>
    <style>
        body { font-family: Arial; margin: 20px; background: #1a1a1a; color: #fff; }
        .result { margin: 10px 0; padding: 10px; border-left: 4px solid #4CAF50; background: #2a2a2a; }
        .error { border-left-color: #f44336; }
        .success { border-left-color: #4CAF50; }
        .slow { border-left-color: #ff9800; }
        .fast { border-left-color: #4CAF50; }
        button { background: #4CAF50; color: white; border: none; padding: 10px 20px; margin: 5px; cursor: pointer; }
    </style>
</head>
<body>
    <h1>Minimal Speed Test</h1>
    
    <div id="results"></div>
    
    <button onclick="testLogin()">1. Login</button>
    <button onclick="testHome()">2. Home</button>
    <button onclick="testPlaylists()">3. Playlists</button>
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
                const res = await fetch('/muzic2/minimal_api.php?action=login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ login: 'admin', password: 'admin' })
                });
                const data = await res.json();
                const time = Date.now() - start;
                const type = time < 200 ? 'fast' : time < 500 ? 'success' : 'slow';
                
                addResult(`
                    Login: ${res.status} - ${time}ms<br>
                    Success: ${data.success || false}<br>
                    User: ${data.user ? data.user.username : 'none'}
                `, type);
            } catch (e) {
                addResult(`Login: ERROR - ${e.message}`, 'error');
            }
        }
        
        async function testHome() {
            try {
                const start = Date.now();
                const res = await fetch('/muzic2/minimal_api.php?action=home');
                const data = await res.json();
                const time = Date.now() - start;
                const type = time < 200 ? 'fast' : time < 500 ? 'success' : 'slow';
                
                addResult(`
                    Home: ${res.status} - ${time}ms<br>
                    Tracks: ${data.tracks?.length || 0}<br>
                    Albums: ${data.albums?.length || 0}
                `, type);
            } catch (e) {
                addResult(`Home: ERROR - ${e.message}`, 'error');
            }
        }
        
        async function testPlaylists() {
            try {
                const start = Date.now();
                const res = await fetch('/muzic2/minimal_api.php?action=playlists');
                const data = await res.json();
                const time = Date.now() - start;
                const type = time < 200 ? 'fast' : time < 500 ? 'success' : 'slow';
                
                addResult(`
                    Playlists: ${res.status} - ${time}ms<br>
                    Count: ${data.length || 0}<br>
                    ${data.length > 0 ? `First: ${data[0].name}` : 'No playlists'}
                `, type);
            } catch (e) {
                addResult(`Playlists: ERROR - ${e.message}`, 'error');
            }
        }
        
        async function testAll() {
            results.innerHTML = '';
            addResult('Testing minimal API...', 'success');
            
            await testLogin();
            await testHome();
            await testPlaylists();
        }
        
        // Auto-test on load
        window.onload = testAll;
    </script>
</body>
</html>
