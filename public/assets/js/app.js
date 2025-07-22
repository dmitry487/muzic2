// SPA роутинг и динамический контент
const mainContent = document.getElementById('main-content');
const navHome = document.getElementById('nav-home');
const navSearch = document.getElementById('nav-search');
const navLibrary = document.getElementById('nav-library');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const userInfo = document.getElementById('user-info');

function showPage(page) {
    // TODO: Загрузка контента для page (home, search, library)
    mainContent.innerHTML = `<h2>${page}</h2><p>Контент скоро будет...</p>`;
}

navHome.onclick = () => showPage('Главная');
navSearch.onclick = () => showPage('Поиск');
navLibrary.onclick = () => showPage('Моя музыка');

// Авторизация/регистрация (заглушки)
loginBtn.onclick = () => {
    // TODO: Показать модалку логина
    alert('Окно логина (скоро)');
};
registerBtn.onclick = () => {
    // TODO: Показать модалку регистрации
    alert('Окно регистрации (скоро)');
};
logoutBtn.onclick = () => {
    // TODO: Выход
    alert('Выход (скоро)');
};

// По умолчанию — главная
showPage('Главная');

