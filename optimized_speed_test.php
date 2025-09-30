<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Optimized API Speed Test</title>
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
    <h1>Optimized API Speed Test</h1>
    
    <div id="results"></div>
    
    <button onclick="testLogin()">1. Login</button>
    <button onclick="testHomeOriginal()">2. Home Original</button>
    <button onclick="testHomeFast()">3. Home Fast</button>
    <button onclick="testLikesOriginal()">4. Likes Original</button>
    <button onclick="testLikesFast()">5. Likes Fast</button>
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
                const type = time < 500 ? 'fast' : time < 1000 ? 'success' : 'slow';
                
                addResult(`
                    Login: ${res.status} - ${time}ms<br>
                    Success: ${data.success || false}<br>
                    User: ${data.user ? data.user.username : 'none'}
                `, type);
            } catch (e) {
                addResult(`Login: ERROR - ${e.message}`, 'error');
            }
        }
        
        async function testHomeOriginal() {
            try {
                const start = Date.now();
                const res = await fetch('/muzic2/public/src/api/home.php?limit_tracks=5&limit_albums=5', { credentials: 'include' });
                const data = await res.json();
                const time = Date.now() - start;
                const type = time < 500 ? 'fast' : time < 1000 ? 'success' : 'slow';
                
                addResult(`
                    Home Original: ${res.status} - ${time}ms<br>
                    Tracks: ${data.tracks?.length || 0}<br>
                    Albums: ${data.albums?.length || 0}<br>
                    Artists: ${data.artists?.length || 0}
                `, type);
            } catch (e) {
                addResult(`Home Original: ERROR - ${e.message}`, 'error');
            }
        }
        
        async function testHomeFast() {
            try {
                const start = Date.now();
                const res = await fetch('/muzic2/public/src/api/home_fast.php?limit_tracks=5&limit_albums=5', { credentials: 'include' });
                const data = await res.json();
                const time = Date.now() - start;
                const type = time < 500 ? 'fast' : time < 1000 ? 'success' : 'slow';
                
                addResult(`
                    Home Fast: ${res.status} - ${time}ms<br>
                    Tracks: ${data.tracks?.length || 0}<br>
                    Albums: ${data.albums?.length || 0}<br>
                    Artists: ${data.artists?.length || 0}
                `, type);
            } catch (e) {
                addResult(`Home Fast: ERROR - ${e.message}`, 'error');
            }
        }
        
        async function testLikesOriginal() {
            try {
                const start = Date.now();
                const res = await fetch('/muzic2/src/api/likes.php', { credentials: 'include' });
                const data = await res.json();
                const time = Date.now() - start;
                const type = time < 500 ? 'fast' : time < 1000 ? 'success' : 'slow';
                
                addResult(`
                    Likes Original: ${res.status} - ${time}ms<br>
                    Tracks: ${data.tracks?.length || 0}<br>
                    Albums: ${data.albums?.length || 0}
                `, type);
            } catch (e) {
                addResult(`Likes Original: ERROR - ${e.message}`, 'error');
            }
        }
        
        async function testLikesFast() {
            try {
                const start = Date.now();
                const res = await fetch('/muzic2/src/api/likes_fast.php', { credentials: 'include' });
                const data = await res.json();
                const time = Date.now() - start;
                const type = time < 500 ? 'fast' : time < 1000 ? 'success' : 'slow';
                
                addResult(`
                    Likes Fast: ${res.status} - ${time}ms<br>
                    Tracks: ${data.tracks?.length || 0}<br>
                    Albums: ${data.albums?.length || 0}
                `, type);
            } catch (e) {
                addResult(`Likes Fast: ERROR - ${e.message}`, 'error');
            }
        }
        
        async function testAll() {
            results.innerHTML = '';
            addResult('Testing optimized APIs...', 'success');
            
            await testLogin();
            await testHomeOriginal();
            await testHomeFast();
            await testLikesOriginal();
            await testLikesFast();
        }
        
        // Auto-test on load
        window.onload = testAll;
    </script>
</body>
</html>
