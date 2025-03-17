import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import log from 'electron-log';
import { spawn } from 'child_process';
import { dirname } from 'path';
import { HiPinBot } from './modules/hipin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow;
let walmeProcess = null;
let fireverseProcess = null;
let isWalmeRunning = false;
let isFireverseRunning = false;
let storkProcess = null;
let isStorkRunning = false;
let nodegoProcess = null;
let isNodeGoRunning = false;
let hipinBot = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
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
    if (walmeProcess) {
      walmeProcess.kill();
      walmeProcess = null;
    }
    if (fireverseProcess) {
      fireverseProcess.kill();
      fireverseProcess = null;
    }
    if (storkProcess) {
      storkProcess.kill();
      storkProcess = null;
    }
    if (nodegoProcess) {
      nodegoProcess.kill();
      nodegoProcess = null;
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // 创建hipin目录
  if (!fs.existsSync(path.join(__dirname, 'hipin'))) {
    fs.mkdirSync(path.join(__dirname, 'hipin'));
  }
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// ==================== Walme 相关功能 ====================

// 启动Walme机器人
ipcMain.on('start-walme-bot', async () => {
  if (isWalmeRunning) return;
  
  try {
    isWalmeRunning = true;
    mainWindow.webContents.send('walme-bot-status', { status: 'running' });
    
    // 确保Walme项目文件夹存在
    const walmeDir = path.join(__dirname, 'walme');
    try {
      await fs.promises.mkdir(walmeDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    walmeProcess = spawn('node', [path.join(__dirname, 'walme', 'index.cjs')]);
    
    walmeProcess.stdout.on('data', (data) => {
      const output = data.toString();
      mainWindow.webContents.send('walme-log', { type: 'info', message: output });
    });
    
    walmeProcess.stderr.on('data', (data) => {
      const output = data.toString();
      mainWindow.webContents.send('walme-log', { type: 'error', message: output });
    });
    
    walmeProcess.on('close', (code) => {
      isWalmeRunning = false;
      mainWindow.webContents.send('walme-bot-status', { status: 'stopped' });
      mainWindow.webContents.send('walme-log', { 
        type: code === 0 ? 'info' : 'error', 
        message: `Walme机器人进程已退出，退出代码: ${code}` 
      });
      walmeProcess = null;
    });
  } catch (error) {
    isWalmeRunning = false;
    mainWindow.webContents.send('walme-bot-status', { status: 'stopped' });
    mainWindow.webContents.send('walme-log', { 
      type: 'error', 
      message: `启动Walme机器人失败: ${error.message}` 
    });
    log.error('启动Walme机器人失败:', error);
  }
});

// 停止Walme机器人
ipcMain.on('stop-walme-bot', () => {
  if (!isWalmeRunning || !walmeProcess) return;
  
  try {
    walmeProcess.kill();
    mainWindow.webContents.send('walme-log', { type: 'info', message: 'Walme机器人已被用户停止' });
  } catch (error) {
    mainWindow.webContents.send('walme-log', { 
      type: 'error', 
      message: `停止Walme机器人失败: ${error.message}` 
    });
    log.error('停止Walme机器人失败:', error);
  }
});

// 读取Walme令牌
ipcMain.on('get-walme-tokens', async () => {
  try {
    const walmeDir = path.join(__dirname, 'walme');
    try {
      await fs.promises.mkdir(walmeDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    const tokensPath = path.join(walmeDir, 'tokens.txt');
    
    try {
      const data = await fs.promises.readFile(tokensPath, 'utf8');
      const tokens = data.split('\n')
        .map(token => token.trim())
        .filter(token => token.length > 0);
      
      mainWindow.webContents.send('walme-tokens-loaded', { tokens });
    } catch (err) {
      if (err.code === 'ENOENT') {
        // 文件不存在，创建空文件
        await fs.promises.writeFile(tokensPath, '');
        mainWindow.webContents.send('walme-tokens-loaded', { tokens: [] });
      } else {
        throw err;
      }
    }
  } catch (error) {
    mainWindow.webContents.send('walme-tokens-loaded', { tokens: [], error: error.message });
    log.error('加载Walme令牌失败:', error);
  }
});

// 保存Walme令牌
ipcMain.on('save-walme-tokens', async (event, { tokens }) => {
  try {
    const walmeDir = path.join(__dirname, 'walme');
    try {
      await fs.promises.mkdir(walmeDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    await fs.promises.writeFile(path.join(walmeDir, 'tokens.txt'), tokens.join('\n'));
    mainWindow.webContents.send('walme-tokens-saved', { success: true });
  } catch (error) {
    mainWindow.webContents.send('walme-tokens-saved', { success: false, error: error.message });
    log.error('保存Walme令牌失败:', error);
  }
});

// 读取Walme代理
ipcMain.on('get-walme-proxies', async () => {
  try {
    const walmeDir = path.join(__dirname, 'walme');
    try {
      await fs.promises.mkdir(walmeDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    const proxiesPath = path.join(walmeDir, 'proxies.txt');
    
    try {
      const data = await fs.promises.readFile(proxiesPath, 'utf8');
      const proxies = data.split('\n')
        .map(proxy => proxy.trim())
        .filter(proxy => proxy.length > 0);
      
      mainWindow.webContents.send('walme-proxies-loaded', { proxies });
    } catch (err) {
      if (err.code === 'ENOENT') {
        // 文件不存在，创建空文件
        await fs.promises.writeFile(proxiesPath, '');
        mainWindow.webContents.send('walme-proxies-loaded', { proxies: [] });
      } else {
        throw err;
      }
    }
  } catch (error) {
    mainWindow.webContents.send('walme-proxies-loaded', { proxies: [], error: error.message });
    log.error('加载Walme代理失败:', error);
  }
});

// 保存Walme代理
ipcMain.on('save-walme-proxies', async (event, { proxies }) => {
  try {
    const walmeDir = path.join(__dirname, 'walme');
    try {
      await fs.promises.mkdir(walmeDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    await fs.promises.writeFile(path.join(walmeDir, 'proxies.txt'), proxies.join('\n'));
    mainWindow.webContents.send('walme-proxies-saved', { success: true });
  } catch (error) {
    mainWindow.webContents.send('walme-proxies-saved', { success: false, error: error.message });
    log.error('保存Walme代理失败:', error);
  }
});

// ==================== Fireverse 相关功能 ====================

// 启动Fireverse机器人
ipcMain.on('start-fireverse-bot', async (event, { updateToken, inviteCode }) => {
  if (isFireverseRunning) return;
  
  try {
    isFireverseRunning = true;
    mainWindow.webContents.send('fireverse-bot-status', { status: 'running' });
    
    // 确保Fireverse项目文件夹存在
    const fireverseDir = path.join(__dirname, 'fireverse');
    try {
      await fs.promises.mkdir(fireverseDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    mainWindow.webContents.send('fireverse-log', { 
      type: 'info', 
      message: `🚀 启动Fireverse机器人 - 更新Token: ${updateToken}, 邀请码: ${inviteCode}` 
    });
    
    // 直接运行run.cjs并传递参数
    fireverseProcess = spawn('node', [
      path.join(fireverseDir, 'run.cjs'),
      updateToken,
      inviteCode
    ], { cwd: fireverseDir });
    
    fireverseProcess.stdout.on('data', (data) => {
      const output = data.toString();
      mainWindow.webContents.send('fireverse-log', { type: 'info', message: output });
    });
    
    fireverseProcess.stderr.on('data', (data) => {
      const output = data.toString();
      mainWindow.webContents.send('fireverse-log', { type: 'error', message: output });
    });
    
    fireverseProcess.on('close', (code) => {
      isFireverseRunning = false;
      mainWindow.webContents.send('fireverse-bot-status', { status: 'stopped' });
      mainWindow.webContents.send('fireverse-log', { 
        type: code === 0 ? 'info' : 'error', 
        message: `Fireverse机器人进程已退出，退出代码: ${code}` 
      });
      fireverseProcess = null;
    });
  } catch (error) {
    isFireverseRunning = false;
    mainWindow.webContents.send('fireverse-bot-status', { status: 'stopped' });
    mainWindow.webContents.send('fireverse-log', { 
      type: 'error', 
      message: `启动Fireverse机器人失败: ${error.message}` 
    });
    log.error('启动Fireverse机器人失败:', error);
  }
});

// 停止Fireverse机器人
ipcMain.on('stop-fireverse-bot', () => {
  if (!isFireverseRunning || !fireverseProcess) return;
  
  try {
    fireverseProcess.kill();
    mainWindow.webContents.send('fireverse-log', { type: 'info', message: 'Fireverse机器人已被用户停止' });
  } catch (error) {
    mainWindow.webContents.send('fireverse-log', { 
      type: 'error', 
      message: `停止Fireverse机器人失败: ${error.message}` 
    });
    log.error('停止Fireverse机器人失败:', error);
  }
});

// 读取Fireverse令牌
ipcMain.on('get-fireverse-tokens', async () => {
  try {
    const fireverseDir = path.join(__dirname, 'fireverse');
    try {
      await fs.promises.mkdir(fireverseDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    const tokensPath = path.join(fireverseDir, 'tokens.txt');
    
    try {
      const data = await fs.promises.readFile(tokensPath, 'utf8');
      const tokens = data.split('\n')
        .map(token => token.trim())
        .filter(token => token.length > 0);
      
      mainWindow.webContents.send('fireverse-tokens-loaded', { tokens });
    } catch (err) {
      if (err.code === 'ENOENT') {
        // 文件不存在，创建空文件
        await fs.promises.writeFile(tokensPath, '');
        mainWindow.webContents.send('fireverse-tokens-loaded', { tokens: [] });
      } else {
        throw err;
      }
    }
  } catch (error) {
    mainWindow.webContents.send('fireverse-tokens-loaded', { tokens: [], error: error.message });
    log.error('加载Fireverse令牌失败:', error);
  }
});

// 保存Fireverse令牌
ipcMain.on('save-fireverse-tokens', async (event, { tokens }) => {
  try {
    const fireverseDir = path.join(__dirname, 'fireverse');
    try {
      await fs.promises.mkdir(fireverseDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    await fs.promises.writeFile(path.join(fireverseDir, 'tokens.txt'), tokens.join('\n'));
    mainWindow.webContents.send('fireverse-tokens-saved', { success: true });
  } catch (error) {
    mainWindow.webContents.send('fireverse-tokens-saved', { success: false, error: error.message });
    log.error('保存Fireverse令牌失败:', error);
  }
});

// 读取Fireverse钱包
ipcMain.on('get-fireverse-wallets', async () => {
  try {
    const fireverseDir = path.join(__dirname, 'fireverse');
    try {
      await fs.promises.mkdir(fireverseDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    const walletsPath = path.join(fireverseDir, 'wallets.txt');
    
    try {
      const data = await fs.promises.readFile(walletsPath, 'utf8');
      const wallets = data.split('\n')
        .map(wallet => wallet.trim())
        .filter(wallet => wallet.length > 0);
      
      mainWindow.webContents.send('fireverse-wallets-loaded', { wallets });
    } catch (err) {
      if (err.code === 'ENOENT') {
        // 文件不存在，创建空文件
        await fs.promises.writeFile(walletsPath, '');
        mainWindow.webContents.send('fireverse-wallets-loaded', { wallets: [] });
      } else {
        throw err;
      }
    }
  } catch (error) {
    mainWindow.webContents.send('fireverse-wallets-loaded', { wallets: [], error: error.message });
    log.error('加载Fireverse钱包失败:', error);
  }
});

// 保存Fireverse钱包
ipcMain.on('save-fireverse-wallets', async (event, { wallets }) => {
  try {
    const fireverseDir = path.join(__dirname, 'fireverse');
    try {
      await fs.promises.mkdir(fireverseDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    await fs.promises.writeFile(path.join(fireverseDir, 'wallets.txt'), wallets.join('\n'));
    mainWindow.webContents.send('fireverse-wallets-saved', { success: true });
  } catch (error) {
    mainWindow.webContents.send('fireverse-wallets-saved', { success: false, error: error.message });
    log.error('保存Fireverse钱包失败:', error);
  }
});

// ==================== Stork 相关功能 ====================

// 启动Stork机器人
ipcMain.on('start-stork-bot', async (event, { config }) => {
  if (isStorkRunning) return;
  
  try {
    isStorkRunning = true;
    mainWindow.webContents.send('stork-bot-status', { status: 'running' });
    
    // 确保Stork项目文件夹存在
    const storkDir = path.join(__dirname, 'stork');
    try {
      await fs.promises.mkdir(storkDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    // 保存配置
    await saveStorkConfig(config);
    
    // 使用CommonJS脚本启动Stork机器人
    storkProcess = spawn('node', [path.join(storkDir, 'run-stork.cjs')], { 
      cwd: storkDir
    });
    
    storkProcess.stdout.on('data', (data) => {
      const output = data.toString();
      mainWindow.webContents.send('stork-log', { type: 'info', message: output });
    });
    
    storkProcess.stderr.on('data', (data) => {
      const output = data.toString();
      mainWindow.webContents.send('stork-log', { type: 'error', message: output });
    });
    
    storkProcess.on('close', (code) => {
      isStorkRunning = false;
      mainWindow.webContents.send('stork-bot-status', { status: 'stopped' });
      mainWindow.webContents.send('stork-log', { 
        type: code === 0 ? 'info' : 'error', 
        message: `Stork机器人进程已退出，退出代码: ${code}` 
      });
      storkProcess = null;
    });
    
    // 定期获取统计信息
    const statsInterval = setInterval(() => {
      if (isStorkRunning) {
        getStorkStats();
      } else {
        clearInterval(statsInterval);
      }
    }, 60000); // 每分钟更新一次
    
    // 初始获取统计信息
    setTimeout(getStorkStats, 5000);
    
  } catch (error) {
    isStorkRunning = false;
    mainWindow.webContents.send('stork-bot-status', { status: 'stopped' });
    mainWindow.webContents.send('stork-log', { 
      type: 'error', 
      message: `启动Stork机器人失败: ${error.message}` 
    });
    log.error('启动Stork机器人失败:', error);
  }
});

// 停止Stork机器人
ipcMain.on('stop-stork-bot', () => {
  if (!isStorkRunning || !storkProcess) return;
  
  try {
    storkProcess.kill();
    mainWindow.webContents.send('stork-log', { type: 'info', message: 'Stork机器人已被用户停止' });
  } catch (error) {
    mainWindow.webContents.send('stork-log', { 
      type: 'error', 
      message: `停止Stork机器人失败: ${error.message}` 
    });
    log.error('停止Stork机器人失败:', error);
  }
});

// 读取Stork账户
ipcMain.on('get-stork-accounts', async () => {
  try {
    const storkDir = path.join(__dirname, 'stork');
    try {
      await fs.promises.mkdir(storkDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    const accountsPath = path.join(storkDir, 'accounts.json');
    
    try {
      const data = await fs.promises.readFile(accountsPath, 'utf8');
      const accounts = JSON.parse(data);
      
      mainWindow.webContents.send('stork-accounts-loaded', { accounts });
    } catch (err) {
      if (err.code === 'ENOENT') {
        // 文件不存在，创建空文件
        await fs.promises.writeFile(accountsPath, '[]', 'utf8');
        mainWindow.webContents.send('stork-accounts-loaded', { accounts: [] });
      } else {
        throw err;
      }
    }
  } catch (error) {
    mainWindow.webContents.send('stork-accounts-loaded', { accounts: [], error: error.message });
    log.error('加载Stork账户失败:', error);
  }
});

// 保存Stork账户
ipcMain.on('save-stork-accounts', async (event, { accounts }) => {
  try {
    const storkDir = path.join(__dirname, 'stork');
    try {
      await fs.promises.mkdir(storkDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    await fs.promises.writeFile(path.join(storkDir, 'accounts.json'), JSON.stringify(accounts, null, 2), 'utf8');
    mainWindow.webContents.send('stork-accounts-saved', { success: true });
  } catch (error) {
    mainWindow.webContents.send('stork-accounts-saved', { success: false, error: error.message });
    log.error('保存Stork账户失败:', error);
  }
});

// 读取Stork代理
ipcMain.on('get-stork-proxies', async () => {
  try {
    const storkDir = path.join(__dirname, 'stork');
    try {
      await fs.promises.mkdir(storkDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    const proxiesPath = path.join(storkDir, 'proxies.txt');
    
    try {
      const data = await fs.promises.readFile(proxiesPath, 'utf8');
      const proxies = data.split('\n')
        .map(proxy => proxy.trim())
        .filter(proxy => proxy.length > 0);
      
      mainWindow.webContents.send('stork-proxies-loaded', { proxies });
    } catch (err) {
      if (err.code === 'ENOENT') {
        // 文件不存在，创建空文件
        await fs.promises.writeFile(proxiesPath, '', 'utf8');
        mainWindow.webContents.send('stork-proxies-loaded', { proxies: [] });
      } else {
        throw err;
      }
    }
  } catch (error) {
    mainWindow.webContents.send('stork-proxies-loaded', { proxies: [], error: error.message });
    log.error('加载Stork代理失败:', error);
  }
});

// 保存Stork代理
ipcMain.on('save-stork-proxies', async (event, { proxies }) => {
  try {
    const storkDir = path.join(__dirname, 'stork');
    try {
      await fs.promises.mkdir(storkDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    await fs.promises.writeFile(path.join(storkDir, 'proxies.txt'), proxies.join('\n'), 'utf8');
    mainWindow.webContents.send('stork-proxies-saved', { success: true });
  } catch (error) {
    mainWindow.webContents.send('stork-proxies-saved', { success: false, error: error.message });
    log.error('保存Stork代理失败:', error);
  }
});

// 读取Stork配置
ipcMain.on('get-stork-config', async () => {
  try {
    const storkDir = path.join(__dirname, 'stork');
    try {
      await fs.promises.mkdir(storkDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    const configPath = path.join(storkDir, 'config.json');
    
    try {
      const data = await fs.promises.readFile(configPath, 'utf8');
      const config = JSON.parse(data);
      
      mainWindow.webContents.send('stork-config-loaded', { config });
    } catch (err) {
      if (err.code === 'ENOENT') {
        // 文件不存在，创建默认配置
        const defaultConfig = {
          intervalSeconds: 30,
          threads: 1
        };
        await fs.promises.writeFile(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
        mainWindow.webContents.send('stork-config-loaded', { config: defaultConfig });
      } else {
        throw err;
      }
    }
  } catch (error) {
    mainWindow.webContents.send('stork-config-loaded', { 
      config: { intervalSeconds: 30, threads: 1 }, 
      error: error.message 
    });
    log.error('加载Stork配置失败:', error);
  }
});

// 保存Stork配置
ipcMain.on('save-stork-config', async (event, { config }) => {
  try {
    await saveStorkConfig(config);
    mainWindow.webContents.send('stork-config-saved', { success: true });
  } catch (error) {
    mainWindow.webContents.send('stork-config-saved', { success: false, error: error.message });
    log.error('保存Stork配置失败:', error);
  }
});

// 获取用户统计信息
ipcMain.on('get-stork-stats', async () => {
  try {
    await getStorkStats();
  } catch (error) {
    log.error('获取Stork用户统计失败:', error);
  }
});

// 保存Stork配置的辅助函数
async function saveStorkConfig(config) {
  const storkDir = path.join(__dirname, 'stork');
  try {
    await fs.promises.mkdir(storkDir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
  
  const configPath = path.join(storkDir, 'config.json');
  await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
}

// 生成用户统计数据的辅助函数
async function getStorkStats() {
  try {
    const storkDir = path.join(__dirname, 'stork');
    const accountsPath = path.join(storkDir, 'accounts.json');
    
    if (!fs.promises.existsSync(accountsPath)) {
      return;
    }
    
    const accountsData = JSON.parse(await fs.promises.readFile(accountsPath, 'utf8'));
    
    // 模拟从存储中获取统计数据
    // 实际项目中，这些数据应从实际运行状态或数据库中获取
    const statsData = accountsData.map(account => {
      return {
        username: account.username,
        validations: Math.floor(Math.random() * 1000), // 模拟数据
        points: Math.floor(Math.random() * 10000),    // 模拟数据
        level: Math.floor(Math.random() * 10) + 1     // 模拟数据
      };
    });
    
    mainWindow.webContents.send('stork-user-stats', { stats: statsData });
  } catch (error) {
    log.error('获取Stork用户统计失败:', error);
  }
}

// ==================== NodeGo 相关功能 ====================

// 启动NodeGo机器人
ipcMain.on('start-nodego-bot', async (event, { config }) => {
  if (isNodeGoRunning) return;
  
  try {
    isNodeGoRunning = true;
    mainWindow.webContents.send('nodego-bot-status', { status: 'running' });
    
    // 确保NodeGo项目文件夹存在
    const nodegoDir = path.join(__dirname, 'nodego');
    try {
      await fs.promises.mkdir(nodegoDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    // 保存配置
    await saveNodeGoConfig(config);
    
    // 创建一个Node.js脚本来运行NodeGo机器人
    const runScriptPath = path.join(nodegoDir, 'run-nodego.cjs');
    const scriptContent = `
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// 从配置文件中获取配置
const configPath = path.join(__dirname, 'config.json');
let config = {
  pingInterval: 4 // 默认4-6分钟间隔
};

if (fs.existsSync(configPath)) {
  try {
    const data = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(data);
  } catch (err) {
    console.error('加载配置出错:', err);
  }
}

// 确保data.txt和proxies.txt存在于nodego目录下
function setupFiles() {
  // 从tokens.txt复制到data.txt (NodeGo的要求)
  const tokensPath = path.join(__dirname, 'tokens.txt');
  const dataPath = path.join(__dirname, 'data.txt');
  
  if (fs.existsSync(tokensPath)) {
    try {
      fs.copyFileSync(tokensPath, dataPath);
      console.log('✅ 成功复制tokens.txt到data.txt');
    } catch (err) {
      console.error('复制tokens.txt到data.txt失败:', err);
    }
  } else {
    console.error('⚠️ tokens.txt不存在');
  }
  
  // 确保proxies.txt文件存在
  const proxiesPath = path.join(__dirname, 'proxies.txt');
  if (!fs.existsSync(proxiesPath)) {
    try {
      fs.writeFileSync(proxiesPath, '');
      console.log('✅ 成功创建空的proxies.txt文件');
    } catch (err) {
      console.error('创建proxies.txt文件失败:', err);
    }
  }
}

setupFiles();

// 运行NodeGo-Auto-Bot
console.log('🚀 启动NodeGo自动化工具...');
console.log(\`📊 配置：Ping间隔=${config.pingInterval}分钟\`);

// 将时间间隔参数传递给环境变量
const nodegoIndexPath = path.join(__dirname, 'index.js');
const botProcess = spawn('node', [nodegoIndexPath], { 
  stdio: 'inherit',
  env: {
    ...process.env,
    NODEGO_PING_INTERVAL: config.pingInterval.toString()
  }
});

botProcess.on('close', (code) => {
  console.log(\`NodeGo机器人已退出，退出代码: \${code}\`);
});

process.on('SIGINT', () => {
  botProcess.kill();
  process.exit(0);
});`;
    
    await fs.promises.writeFile(runScriptPath, scriptContent, 'utf8');
    
    // 创建或更新nodego/index.js文件
    const nodegoIndexPath = path.join(nodegoDir, 'index.js');
    await copyNodeGoFiles();
    
    // 修改ping间隔环境变量
    const pingInterval = config.pingInterval || 4;
    
    // 启动机器人
    nodegoProcess = spawn('node', [runScriptPath], { 
      cwd: nodegoDir
    });
    
    nodegoProcess.stdout.on('data', (data) => {
      const output = data.toString();
      mainWindow.webContents.send('nodego-log', { type: 'info', message: output });
    });
    
    nodegoProcess.stderr.on('data', (data) => {
      const output = data.toString();
      mainWindow.webContents.send('nodego-log', { type: 'error', message: output });
    });
    
    nodegoProcess.on('close', (code) => {
      isNodeGoRunning = false;
      mainWindow.webContents.send('nodego-bot-status', { status: 'stopped' });
      mainWindow.webContents.send('nodego-log', { 
        type: code === 0 ? 'info' : 'error', 
        message: `NodeGo机器人进程已退出，退出代码: ${code}` 
      });
      nodegoProcess = null;
    });
    
  } catch (error) {
    isNodeGoRunning = false;
    mainWindow.webContents.send('nodego-bot-status', { status: 'stopped' });
    mainWindow.webContents.send('nodego-log', { 
      type: 'error', 
      message: `启动NodeGo机器人失败: ${error.message}` 
    });
    log.error('启动NodeGo机器人失败:', error);
  }
});

// 停止NodeGo机器人
ipcMain.on('stop-nodego-bot', () => {
  if (!isNodeGoRunning || !nodegoProcess) return;
  
  try {
    nodegoProcess.kill();
    mainWindow.webContents.send('nodego-log', { type: 'info', message: 'NodeGo机器人已被用户停止' });
  } catch (error) {
    mainWindow.webContents.send('nodego-log', { 
      type: 'error', 
      message: `停止NodeGo机器人失败: ${error.message}` 
    });
    log.error('停止NodeGo机器人失败:', error);
  }
});

// 读取NodeGo令牌
ipcMain.on('get-nodego-tokens', async () => {
  try {
    const nodegoDir = path.join(__dirname, 'nodego');
    try {
      await fs.promises.mkdir(nodegoDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    const tokensPath = path.join(nodegoDir, 'tokens.txt');
    
    try {
      const data = await fs.promises.readFile(tokensPath, 'utf8');
      const tokens = data.split('\n')
        .map(token => token.trim())
        .filter(token => token.length > 0);
      
      mainWindow.webContents.send('nodego-tokens-loaded', { tokens });
    } catch (err) {
      if (err.code === 'ENOENT') {
        // 文件不存在，创建空文件
        await fs.promises.writeFile(tokensPath, '', 'utf8');
        mainWindow.webContents.send('nodego-tokens-loaded', { tokens: [] });
      } else {
        throw err;
      }
    }
  } catch (error) {
    mainWindow.webContents.send('nodego-tokens-loaded', { tokens: [], error: error.message });
    log.error('加载NodeGo令牌失败:', error);
  }
});

// 保存NodeGo令牌
ipcMain.on('save-nodego-tokens', async (event, { tokens }) => {
  try {
    const nodegoDir = path.join(__dirname, 'nodego');
    try {
      await fs.promises.mkdir(nodegoDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    await fs.promises.writeFile(path.join(nodegoDir, 'tokens.txt'), tokens.join('\n'), 'utf8');
    
    // 同时更新data.txt (NodeGo需要这个文件)
    await fs.promises.writeFile(path.join(nodegoDir, 'data.txt'), tokens.join('\n'), 'utf8');
    
    mainWindow.webContents.send('nodego-tokens-saved', { success: true });
  } catch (error) {
    mainWindow.webContents.send('nodego-tokens-saved', { success: false, error: error.message });
    log.error('保存NodeGo令牌失败:', error);
  }
});

// 读取NodeGo代理
ipcMain.on('get-nodego-proxies', async () => {
  try {
    const nodegoDir = path.join(__dirname, 'nodego');
    try {
      await fs.promises.mkdir(nodegoDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    const proxiesPath = path.join(nodegoDir, 'proxies.txt');
    
    try {
      const data = await fs.promises.readFile(proxiesPath, 'utf8');
      const proxies = data.split('\n')
        .map(proxy => proxy.trim())
        .filter(proxy => proxy.length > 0);
      
      mainWindow.webContents.send('nodego-proxies-loaded', { proxies });
    } catch (err) {
      if (err.code === 'ENOENT') {
        // 文件不存在，创建空文件
        await fs.promises.writeFile(proxiesPath, '', 'utf8');
        mainWindow.webContents.send('nodego-proxies-loaded', { proxies: [] });
      } else {
        throw err;
      }
    }
  } catch (error) {
    mainWindow.webContents.send('nodego-proxies-loaded', { proxies: [], error: error.message });
    log.error('加载NodeGo代理失败:', error);
  }
});

// 保存NodeGo代理
ipcMain.on('save-nodego-proxies', async (event, { proxies }) => {
  try {
    const nodegoDir = path.join(__dirname, 'nodego');
    try {
      await fs.promises.mkdir(nodegoDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    await fs.promises.writeFile(path.join(nodegoDir, 'proxies.txt'), proxies.join('\n'), 'utf8');
    mainWindow.webContents.send('nodego-proxies-saved', { success: true });
  } catch (error) {
    mainWindow.webContents.send('nodego-proxies-saved', { success: false, error: error.message });
    log.error('保存NodeGo代理失败:', error);
  }
});

// 读取NodeGo配置
ipcMain.on('get-nodego-config', async () => {
  try {
    const nodegoDir = path.join(__dirname, 'nodego');
    try {
      await fs.promises.mkdir(nodegoDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    const configPath = path.join(nodegoDir, 'config.json');
    
    try {
      const data = await fs.promises.readFile(configPath, 'utf8');
      const config = JSON.parse(data);
      
      mainWindow.webContents.send('nodego-config-loaded', { config });
    } catch (err) {
      if (err.code === 'ENOENT') {
        // 文件不存在，创建默认配置
        const defaultConfig = {
          pingInterval: 4
        };
        await fs.promises.writeFile(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
        mainWindow.webContents.send('nodego-config-loaded', { config: defaultConfig });
      } else {
        throw err;
      }
    }
  } catch (error) {
    mainWindow.webContents.send('nodego-config-loaded', { 
      config: { pingInterval: 4 }, 
      error: error.message 
    });
    log.error('加载NodeGo配置失败:', error);
  }
});

// 保存NodeGo配置的辅助函数
async function saveNodeGoConfig(config) {
  const nodegoDir = path.join(__dirname, 'nodego');
  try {
    await fs.promises.mkdir(nodegoDir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
  
  const configPath = path.join(nodegoDir, 'config.json');
  await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
}

// 复制NodeGo文件的辅助函数
async function copyNodeGoFiles() {
  const sourceDir = path.join(__dirname, '..', 'NodeGo-Auto-Bot');
  const targetDir = path.join(__dirname, 'nodego');
  
  // 检查源目录是否存在
  try {
    await fs.promises.access(sourceDir);
  } catch (error) {
    mainWindow.webContents.send('nodego-log', { 
      type: 'error', 
      message: `无法访问NodeGo-Auto-Bot源目录: ${error.message}` 
    });
    return;
  }
  
  // 要复制的文件列表
  const filesToCopy = ['index.js', 'banner.js', 'nodego-pinger.js'];
  
  for (const file of filesToCopy) {
    try {
      const sourceFile = path.join(sourceDir, file);
      const targetFile = path.join(targetDir, file);
      
      // 检查源文件是否存在
      try {
        await fs.promises.access(sourceFile);
      } catch (error) {
        mainWindow.webContents.send('nodego-log', { 
          type: 'error', 
          message: `源文件不存在: ${file}` 
        });
        continue;
      }
      
      // 复制文件
      await fs.promises.copyFile(sourceFile, targetFile);
      
      mainWindow.webContents.send('nodego-log', { 
        type: 'info', 
        message: `✅ 成功复制文件: ${file}` 
      });
    } catch (error) {
      mainWindow.webContents.send('nodego-log', { 
        type: 'error', 
        message: `复制文件失败 ${file}: ${error.message}` 
      });
    }
  }
  
  // 修改index.js中的延迟函数，根据配置设置ping间隔
  try {
    const indexPath = path.join(targetDir, 'index.js');
    let indexContent = await fs.promises.readFile(indexPath, 'utf8');
    
    // 替换随机延迟函数
    indexContent = indexContent.replace(
      /randomDelay\(\)\s*{\s*return\s*Math\.floor\(Math\.random\(\)\s*\*\s*\d+\)\s*\+\s*\d+;\s*}/,
      `randomDelay() {
    const baseInterval = process.env.NODEGO_PING_INTERVAL || 4;
    const minDelay = baseInterval * 60000;
    const maxDelay = (baseInterval + 2) * 60000;
    return Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;
  }`
    );
    
    await fs.promises.writeFile(indexPath, indexContent, 'utf8');
    
    mainWindow.webContents.send('nodego-log', { 
      type: 'info', 
      message: '✅ 成功更新ping间隔配置' 
    });
  } catch (error) {
    mainWindow.webContents.send('nodego-log', { 
      type: 'error', 
      message: `修改index.js失败: ${error.message}` 
    });
  }
}

// 加载HiPin账号
function loadHiPinAccounts() {
    mainWindow.webContents.send('hipin:accounts', []);
}

// 保存HiPin账号
function saveHiPinAccounts() {
    // 不做任何事情，新方法已经替代它
}

// HiPin IPC事件处理
ipcMain.on('hipin:load-accounts', () => {
    loadHiPinAccounts();
});

ipcMain.on('hipin:add-account', (event, token) => {
    hipinAccounts.push({ token });
    saveHiPinAccounts();
    mainWindow.webContents.send('hipin:accounts', hipinAccounts);
    mainWindow.webContents.send('hipin:log', { message: '添加账号成功', type: 'success' });
});

ipcMain.on('hipin:remove-account', (event, index) => {
    hipinAccounts.splice(index, 1);
    saveHiPinAccounts();
    mainWindow.webContents.send('hipin:accounts', hipinAccounts);
    mainWindow.webContents.send('hipin:log', { message: '删除账号成功', type: 'success' });
});

// HiPin相关函数
async function loadHiPinToken() {
    try {
        const tokenPath = path.join(__dirname, 'hipin', 'token.txt');
        if (fs.existsSync(tokenPath)) {
            const token = await fs.promises.readFile(tokenPath, 'utf8');
            mainWindow.webContents.send('hipin:token', token);
        } else {
            mainWindow.webContents.send('hipin:token', '');
        }
    } catch (e) {
        console.error('读取HiPin token失败:', e);
        mainWindow.webContents.send('hipin:token', '');
    }
}

async function saveHiPinToken(token) {
    try {
        const tokenPath = path.join(__dirname, 'hipin', 'token.txt');
        await fs.promises.writeFile(tokenPath, token);
        mainWindow.webContents.send('hipin:log', { message: '保存令牌成功', type: 'success' });
    } catch (e) {
        console.error('保存HiPin token失败:', e);
        mainWindow.webContents.send('hipin:log', { message: '保存令牌失败: ' + e.message, type: 'error' });
    }
}

// HiPin IPC事件处理
ipcMain.on('hipin:load-token', () => {
    loadHiPinToken();
});

ipcMain.on('hipin:save-token', (event, token) => {
    saveHiPinToken(token);
});

ipcMain.on('hipin:start', async () => {
    if (hipinBot) {
        mainWindow.webContents.send('hipin:log', { message: '机器人已在运行中', type: 'error' });
        return;
    }

    try {
        hipinBot = new HiPinBot();
        
        // 设置事件监听
        hipinBot.on('status', (status) => {
            mainWindow.webContents.send('hipin:status', status);
        });
        
        hipinBot.on('stats', (stats) => {
            mainWindow.webContents.send('hipin:stats', stats);
        });
        
        hipinBot.on('log', (message, type) => {
            mainWindow.webContents.send('hipin:log', { message, type });
        });
        
        hipinBot.on('error', (error) => {
            mainWindow.webContents.send('hipin:log', { message: error, type: 'error' });
        });

        // 启动机器人
        await hipinBot.start();
        mainWindow.webContents.send('hipin:log', { message: '机器人启动成功', type: 'success' });
    } catch (e) {
        mainWindow.webContents.send('hipin:log', { message: '启动失败: ' + e.message, type: 'error' });
        hipinBot = null;
    }
});

ipcMain.on('hipin:stop', () => {
    if (hipinBot) {
        // 添加一个标记正在停止状态
        mainWindow.webContents.send('hipin:log', { message: '正在停止机器人...', type: 'info' });
        
        try {
            // 调用停止方法
            hipinBot.stop();
            
            // 10秒后如果仍未停止，强制结束
            setTimeout(() => {
                if (hipinBot) {
                    mainWindow.webContents.send('hipin:log', { message: '机器人停止超时，强制结束', type: 'warning' });
                    hipinBot = null;
                    mainWindow.webContents.send('hipin:status', { running: false });
                }
            }, 10000);
        } catch (error) {
            mainWindow.webContents.send('hipin:log', { message: `停止机器人错误: ${error.message}`, type: 'error' });
            hipinBot = null;
            mainWindow.webContents.send('hipin:status', { running: false });
        }
    }
}); 