const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// Путь к контенту приложения
const contentPath = path.join(__dirname, '../content');

// Регистрируем кастомный протокол для работы без сервера
function registerFileProtocol() {
  protocol.registerFileProtocol('app', (request, callback) => {
    const url = request.url.replace('app://', '');
    const filePath = path.join(contentPath, url);
    
    // Безопасность: проверяем, что файл находится в contentPath
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(path.normalize(contentPath))) {
      callback({ error: -6 }); // FILE_NOT_FOUND
      return;
    }
    
    callback({ path: normalizedPath });
  });
}

// Перехватываем fetch запросы для API
function setupAPIIinterceptor() {
  protocol.interceptHttpProtocol('http', (request, callback) => {
    const url = new URL(request.url);
    
    // Если это API запрос, перенаправляем на локальный файл
    if (url.pathname.includes('/api/') || url.pathname.includes('/src/api/')) {
      const apiName = url.pathname.split('/').pop().replace('.php', '');
      const jsonPath = path.join(contentPath, 'api', apiName + '.json');
      
      if (fs.existsSync(jsonPath)) {
        const data = fs.readFileSync(jsonPath, 'utf8');
        callback({
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          data: Buffer.from(data)
        });
        return;
      }
    }
    
    // Для остальных запросов используем стандартную обработку
    callback({});
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Отключаем для работы с file://
      allowRunningInsecureContent: true
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f0f0f'
  });

  // Загружаем index.html напрямую через file://
  const indexPath = path.join(contentPath, 'index.html');
  console.log('Loading index.html from:', indexPath);
  console.log('Content path:', contentPath);
  console.log('Tracks path exists:', fs.existsSync(path.join(contentPath, 'tracks')));
  
  mainWindow.loadFile(indexPath, {
    query: { app: 'true' }
  });
  
  // Открываем DevTools для отладки
  mainWindow.webContents.openDevTools();
  
  // Логируем ошибки загрузки
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', validatedURL, errorCode, errorDescription);
  });
  
  // Логируем консольные сообщения из рендерера
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer ${level}]:`, message);
  });
}

app.whenReady().then(() => {
  // Регистрируем протоколы перед созданием окна
  registerFileProtocol();
  setupAPIIinterceptor();
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

