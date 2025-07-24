<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Muzic2 — Музыкальный сервис</title>
    <link rel="stylesheet" href="assets/css/style.css">
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
            <section class="main-filters">
                <button class="filter-btn active">Все</button>
                <button class="filter-btn">Музыка</button>
                <button class="filter-btn">Артисты</button>
            </section>
            <section class="main-section" id="favorites-section">
                <h3>Любимые треки</h3>
                <div class="card-row" id="favorites-row"></div>
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
        </main>
        <div id="player-root"></div>
    </div>
    <script src="assets/js/app.js"></script>
    <script src="assets/js/player.js"></script>
</body>
</html> 