const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow;
let loadingWindow;

const isDev = !app.isPackaged;
const PORT = process.env.PORT || 5000;

// Setup fallback environment variables for production/packaged mode
if (!isDev) {
  process.env.NODE_ENV = 'production';
  if (!process.env.MONGO_URI) {
    process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/techmart';
  }
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'techmart_jwt_secret_key_2026_packaged_electron';
  }
  if (!process.env.JWT_REFRESH_SECRET) {
    process.env.JWT_REFRESH_SECRET = 'techmart_refresh_secret_key_2026_packaged_electron';
  }
  process.env.PORT = PORT;

  // Start the Express backend server
  try {
    require(path.join(__dirname, '../backend/server.js'));
  } catch (error) {
    console.error('Failed to start Express backend:', error);
  }
}

function createLoadingWindow() {
  loadingWindow = new BrowserWindow({
    width: 420,
    height: 340,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  loadingWindow.loadFile(path.join(__dirname, 'loading.html'));
  loadingWindow.on('closed', () => (loadingWindow = null));
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false, // Hidden until ready
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load custom menu
  createMenu();

  const healthUrl = `http://localhost:${PORT}/api/health`;
  const appUrl = isDev ? 'http://localhost:5173' : `http://localhost:${PORT}`;

  // Poll Express backend health check, then display main window
  const checkBackendAndShow = () => {
    http
      .get(healthUrl, (res) => {
        if (res.statusCode === 200) {
          mainWindow.loadURL(appUrl);
          mainWindow.once('ready-to-show', () => {
            if (loadingWindow) {
              loadingWindow.close();
            }
            mainWindow.show();
            mainWindow.focus();
          });
        } else {
          setTimeout(checkBackendAndShow, 1000);
        }
      })
      .on('error', () => {
        setTimeout(checkBackendAndShow, 1000);
      });
  };

  checkBackendAndShow();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forcereload' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'close' }
      ]
    }
  ];

  if (isDev) {
    template[2].submenu.push(
      { type: 'separator' },
      { role: 'toggledevtools' }
    );
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.on('ready', () => {
  createLoadingWindow();
  createMainWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});
