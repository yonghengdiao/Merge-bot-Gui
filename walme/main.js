const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const log = require('electron-log');
const { spawn } = require('child_process');

let mainWindow;
let botProcess = null;
let isRunning = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 700,
    minHeight: 500,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, 'icon.ico'),
    resizable: true,
    autoHideMenuBar: true
  });

  mainWindow.loadFile('index.html');
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (botProcess) {
      botProcess.kill();
      botProcess = null;
    }
  });

  // 开发环境下打开开发者工具
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// 启动机器人
ipcMain.on('start-bot', async () => {
  if (isRunning) return;
  
  try {
    isRunning = true;
    mainWindow.webContents.send('bot-status', { status: 'running' });
    
    botProcess = spawn('node', ['index.js']);
    
    botProcess.stdout.on('data', (data) => {
      const output = data.toString();
      mainWindow.webContents.send('log', { type: 'info', message: output });
    });
    
    botProcess.stderr.on('data', (data) => {
      const output = data.toString();
      mainWindow.webContents.send('log', { type: 'error', message: output });
    });
    
    botProcess.on('close', (code) => {
      isRunning = false;
      mainWindow.webContents.send('bot-status', { status: 'stopped' });
      mainWindow.webContents.send('log', { 
        type: code === 0 ? 'info' : 'error', 
        message: `机器人进程已退出，退出代码: ${code}` 
      });
      botProcess = null;
    });
  } catch (error) {
    isRunning = false;
    mainWindow.webContents.send('bot-status', { status: 'stopped' });
    mainWindow.webContents.send('log', { 
      type: 'error', 
      message: `启动机器人失败: ${error.message}` 
    });
    log.error('启动机器人失败:', error);
  }
});

// 停止机器人
ipcMain.on('stop-bot', () => {
  if (!isRunning || !botProcess) return;
  
  try {
    botProcess.kill();
    mainWindow.webContents.send('log', { type: 'info', message: '机器人已被用户停止' });
  } catch (error) {
    mainWindow.webContents.send('log', { 
      type: 'error', 
      message: `停止机器人失败: ${error.message}` 
    });
    log.error('停止机器人失败:', error);
  }
});

// 读取令牌
ipcMain.on('get-tokens', async () => {
  try {
    const data = await fs.readFile(path.join(__dirname, 'tokens.txt'), 'utf8');
    const tokens = data.split('\n')
      .map(token => token.trim())
      .filter(token => token.length > 0);
    
    mainWindow.webContents.send('tokens-loaded', { tokens });
  } catch (error) {
    mainWindow.webContents.send('tokens-loaded', { tokens: [], error: error.message });
    log.error('加载令牌失败:', error);
  }
});

// 保存令牌
ipcMain.on('save-tokens', async (event, { tokens }) => {
  try {
    await fs.writeFile(path.join(__dirname, 'tokens.txt'), tokens.join('\n'));
    mainWindow.webContents.send('tokens-saved', { success: true });
  } catch (error) {
    mainWindow.webContents.send('tokens-saved', { success: false, error: error.message });
    log.error('保存令牌失败:', error);
  }
});

// 读取代理
ipcMain.on('get-proxies', async () => {
  try {
    const data = await fs.readFile(path.join(__dirname, 'proxies.txt'), 'utf8');
    const proxies = data.split('\n')
      .map(proxy => proxy.trim())
      .filter(proxy => proxy.length > 0);
    
    mainWindow.webContents.send('proxies-loaded', { proxies });
  } catch (error) {
    mainWindow.webContents.send('proxies-loaded', { proxies: [], error: error.message });
    log.error('加载代理失败:', error);
  }
});

// 保存代理
ipcMain.on('save-proxies', async (event, { proxies }) => {
  try {
    await fs.writeFile(path.join(__dirname, 'proxies.txt'), proxies.join('\n'));
    mainWindow.webContents.send('proxies-saved', { success: true });
  } catch (error) {
    mainWindow.webContents.send('proxies-saved', { success: false, error: error.message });
    log.error('保存代理失败:', error);
  }
});