<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Fixed Login Test</title>
    <style>
        body { font-family: Arial; margin: 20px; background: #1a1a1a; color: #fff; }
        .result { margin: 10px 0; padding: 10px; border-left: 4px solid #4CAF50; background: #2a2a2a; }
        .error { border-left-color: #f44336; }
        .success { border-left-color: #4CAF50; }
        button { background: #4CAF50; color: white; border: none; padding: 10px 20px; margin: 5px; cursor: pointer; }
    </style>
</head>
<body>
    <h1>Fixed Login Test</h1>
    
    <div id="results"></div>
    
    <button onclick="testCorrectLogin()">Test Correct Login</button>
    <button onclick="testPlaylists()">Test Playlists</button>
    <button onclick="testAll()">Test All</button>

    <script>
        const results = document.getElementById('results');
        
        function addResult(text, type = 'success') {
            const div = document.createElement('div');
            div.className = `result ${type}`;
            div.innerHTML = text;
            results.appendChild(div);
        }
        
        async function testCorrectLogin() {
            try {
                const start = Date.now();
                const res = await fetch('/muzic2/src/api/login.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ login: 'admin', password: 'admin' }), // Use 'login' instead of 'username'
                    credentials: 'include'
                });
                const data = await res.json();
                const time = Date.now() - start;
                
                addResult(`
                    Login Test: ${res.status} - ${time}ms<br>
                    Success: ${data.success || false}<br>
                    Message: ${data.message || data.error || 'none'}<br>
                    User: ${data.user ? JSON.stringify(data.user) : 'none'}
                `, res.status === 200 ? 'success' : 'error');
            } catch (e) {
                addResult(`Login Test: ERROR - ${e.message}`, 'error');
            }
        }
        
        async function testPlaylists() {
            try {
                const start = Date.now();
                const res = await fetch('/muzic2/src/api/playlists.php', { credentials: 'include' });
                const data = await res.json();
                const time = Date.now() - start;
                
                addResult(`
                    Playlists Test: ${res.status} - ${time}ms<br>
                    Playlists: ${data.playlists?.length || data.length || 0}<br>
                    Error: ${data.error || 'none'}
                `, res.status === 200 ? 'success' : 'error');
            } catch (e) {
                addResult(`Playlists Test: ERROR - ${e.message}`, 'error');
            }
        }
        
        async function testAll() {
            results.innerHTML = '';
            addResult('Testing with correct login field...', 'success');
            
            await testCorrectLogin();
            await testPlaylists();
        }
        
        // Auto-test on load
        window.onload = testAll;
    </script>
</body>
</html>
