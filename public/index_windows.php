<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Muzic2 — Музыкальный сервис</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <link rel="icon" href="../favicon.ico" type="image/x-icon">
</head>
<body>
    <div id="app">
        <header id="main-header">
            <div class="logo">Muzic2</div>
            <nav id="main-nav">
                <button id="nav-home">Главная</button>
                <button id="nav-search">Поиск</button>
                <button id="nav-library">Моя музыка</button>
            </nav>
        </header>
        <main id="main-content">
            <div class="loading">Загрузка...</div>
        </main>
        <div id="player-root"></div>
    </div>
    
    <script>
        // Принудительно используем HTTP вместо HTTPS
        if (location.protocol === 'https:') {
            location.replace('http:' + location.href.substring(5));
        }
        
        // Загружаем оптимизированный JS для Windows
        const script = document.createElement('script');
        script.src = 'assets/js/app_windows.js';
        script.onload = () => {
            console.log('Windows optimized app loaded');
        };
        script.onerror = () => {
            // Fallback на обычную версию
            const fallbackScript = document.createElement('script');
            fallbackScript.src = 'assets/js/app.js';
            document.head.appendChild(fallbackScript);
        };
        document.head.appendChild(script);
    </script>
</body>
</html>
