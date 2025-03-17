const { ipcRenderer } = require('electron');

// DOM元素
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const tokensTextarea = document.getElementById('tokens-textarea');
const saveTokensBtn = document.getElementById('save-tokens-btn');
const importTokensInput = document.getElementById('import-tokens');
const proxiesTextarea = document.getElementById('proxies-textarea');
const saveProxiesBtn = document.getElementById('save-proxies-btn');
const importProxiesInput = document.getElementById('import-proxies');
const logContainer = document.getElementById('log-container');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  // 加载令牌
  ipcRenderer.send('get-tokens');
  
  // 加载代理
  ipcRenderer.send('get-proxies');
});

// 启动机器人
startBtn.addEventListener('click', () => {
  ipcRenderer.send('start-bot');
});

// 停止机器人
stopBtn.addEventListener('click', () => {
  ipcRenderer.send('stop-bot');
});

// 保存令牌
saveTokensBtn.addEventListener('click', () => {
  const tokens = tokensTextarea.value.split('\n')
    .map(token => token.trim())
    .filter(token => token.length > 0);
  
  ipcRenderer.send('save-tokens', { tokens });
  addLogEntry('info', '正在保存令牌...');
});

// 导入令牌文件
importTokensInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    const text = await readFile(file);
    tokensTextarea.value = text;
    addLogEntry('info', `已导入令牌文件: ${file.name}`);
  } catch (error) {
    addLogEntry('error', `导入令牌文件失败: ${error.message}`);
  }
  
  event.target.value = '';
});

// 保存代理
saveProxiesBtn.addEventListener('click', () => {
  const proxies = proxiesTextarea.value.split('\n')
    .map(proxy => proxy.trim())
    .filter(proxy => proxy.length > 0);
  
  ipcRenderer.send('save-proxies', { proxies });
  addLogEntry('info', '正在保存代理...');
});

// 导入代理文件
importProxiesInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    const text = await readFile(file);
    proxiesTextarea.value = text;
    addLogEntry('info', `已导入代理文件: ${file.name}`);
  } catch (error) {
    addLogEntry('error', `导入代理文件失败: ${error.message}`);
  }
  
  event.target.value = '';
});

// 读取文件
function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
}

// 添加日志条目
function addLogEntry(type, message) {
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  entry.textContent = message;
  logContainer.appendChild(entry);
  logContainer.scrollTop = logContainer.scrollHeight;
}

// 更新机器人状态
ipcRenderer.on('bot-status', (event, { status }) => {
  if (status === 'running') {
    statusDot.className = 'status-dot running';
    statusText.textContent = '运行中';
    statusText.className = 'status-running';
    startBtn.disabled = true;
    stopBtn.disabled = false;
  } else {
    statusDot.className = 'status-dot stopped';
    statusText.textContent = '已停止';
    statusText.className = 'status-stopped';
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }
});

// 接收日志
ipcRenderer.on('log', (event, { type, message }) => {
  addLogEntry(type, message);
});

// 令牌加载完成
ipcRenderer.on('tokens-loaded', (event, { tokens, error }) => {
  if (error) {
    addLogEntry('warning', `加载令牌失败: ${error}`);
    return;
  }
  
  tokensTextarea.value = tokens.join('\n');
  addLogEntry('info', `已加载 ${tokens.length} 个令牌`);
});

// 令牌保存完成
ipcRenderer.on('tokens-saved', (event, { success, error }) => {
  if (success) {
    addLogEntry('success', '令牌保存成功');
  } else {
    addLogEntry('error', `令牌保存失败: ${error}`);
  }
});

// 代理加载完成
ipcRenderer.on('proxies-loaded', (event, { proxies, error }) => {
  if (error) {
    addLogEntry('warning', `加载代理失败: ${error}`);
    return;
  }
  
  proxiesTextarea.value = proxies.join('\n');
  addLogEntry('info', `已加载 ${proxies.length} 个代理`);
});

// 代理保存完成
ipcRenderer.on('proxies-saved', (event, { success, error }) => {
  if (success) {
    addLogEntry('success', '代理保存成功');
  } else {
    addLogEntry('error', `代理保存失败: ${error}`);
  }
});