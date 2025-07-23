// SPA роутинг и динамический контент
const mainContent = document.getElementById('main-content');
const navHome = document.getElementById('nav-home');
const navSearch = document.getElementById('nav-search');
const navLibrary = document.getElementById('nav-library');

function showPage(page) {
    if (page === 'Главная') {
        mainContent.innerHTML = '<h2>Главная</h2><p>Контент скоро будет...</p>';
    } else if (page === 'Поиск') {
        mainContent.innerHTML = '<h2>Поиск</h2><p>Контент скоро будет...</p>';
    } else if (page === 'Моя музыка') {
        mainContent.innerHTML = '<h2>Моя музыка</h2><p>Контент скоро будет...</p>';
    }
}

navHome.onclick = () => showPage('Главная');
navSearch.onclick = () => showPage('Поиск');
navLibrary.onclick = () => showPage('Моя музыка');

// По умолчанию — главная
showPage('Главная');

