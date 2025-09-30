<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>API Speed Test</title>
    <style>
        body { font-family: Arial; margin: 20px; background: #1a1a1a; color: #fff; }
        .result { margin: 10px 0; padding: 10px; border-left: 4px solid #4CAF50; background: #2a2a2a; }
        .error { border-left-color: #f44336; }
        .slow { border-left-color: #ff9800; }
        button { background: #4CAF50; color: white; border: none; padding: 10px 20px; margin: 5px; cursor: pointer; }
    </style>
</head>
<body>
    <h1>API Speed Test</h1>
    
    <div id="results"></div>
    
    <button onclick="testLogin()">1. Login</button>
    <button onclick="testOriginalPlaylists()">2. Original Playlists</button>
    <button onclick="testFastPlaylists()">3. Fast Playlists</button>
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
                    body: JSON.stringify({ username: 'admin', password: 'admin' }),
                    credentials: 'include'
                });
                const data = await res.json();
                const time = Date.now() - start;
                addResult(`Login: ${res.status} - ${time}ms - ${data.message || 'Success'}`);
            } catch (e) {
                addResult(`Login: ERROR - ${e.message}`, 'error');
            }
        }
        
        async function testOriginalPlaylists() {
            try {
                const start = Date.now();
                const res = await fetch('/muzic2/src/api/playlists.php', { credentials: 'include' });
                const data = await res.json();
                const time = Date.now() - start;
                const type = time > 1000 ? 'slow' : 'success';
                addResult(`Original Playlists: ${res.status} - ${time}ms - ${data.length || data.playlists?.length || 0} playlists`, type);
            } catch (e) {
                addResult(`Original Playlists: ERROR - ${e.message}`, 'error');
            }
        }
        
        async function testFastPlaylists() {
            try {
                const start = Date.now();
                const res = await fetch('/muzic2/src/api/playlists_fast.php', { credentials: 'include' });
                const data = await res.json();
                const time = Date.now() - start;
                const type = time > 1000 ? 'slow' : 'success';
                addResult(`Fast Playlists: ${res.status} - ${time}ms - ${data.length || 0} playlists`, type);
            } catch (e) {
                addResult(`Fast Playlists: ERROR - ${e.message}`, 'error');
            }
        }
        
        async function testAll() {
            results.innerHTML = '';
            addResult('Testing all APIs...');
            
            await testLogin();
            await testOriginalPlaylists();
            await testFastPlaylists();
        }
        
        // Auto-test on load
        window.onload = testAll;
    </script>
</body>
</html>
