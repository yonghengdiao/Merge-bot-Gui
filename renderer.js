const { ipcRenderer } = require('electron');

// ==================== 通用函数 ====================

// 添加日志条目
function addLogEntry(container, message, type = 'info') {
  const logEntry = document.createElement('div');
  logEntry.className = `log-entry log-${type}`;
  logEntry.textContent = message;
  container.appendChild(logEntry);
  container.scrollTop = container.scrollHeight;
}

// 切换标签页
function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      
      // 移除所有活动状态
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      
      // 设置当前活动标签
      btn.classList.add('active');
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });
}

// 文件导入处理
function handleFileImport(fileInput, textarea) {
  fileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      textarea.value = text;
    } catch (error) {
      console.error('读取文件失败:', error);
    }
  });
}

// ==================== Walme 相关功能 ====================

// DOM元素 - Walme
const walmeStatusDot = document.getElementById('walme-status-dot');
const walmeStatusText = document.getElementById('walme-status-text');
const walmeStartBtn = document.getElementById('walme-start-btn');
const walmeStopBtn = document.getElementById('walme-stop-btn');
const walmeTokensTextarea = document.getElementById('walme-tokens-textarea');
const walmeSaveTokensBtn = document.getElementById('walme-save-tokens-btn');
const walmeImportTokensInput = document.getElementById('walme-import-tokens');
const walmeProxiesTextarea = document.getElementById('walme-proxies-textarea');
const walmeSaveProxiesBtn = document.getElementById('walme-save-proxies-btn');
const walmeImportProxiesInput = document.getElementById('walme-import-proxies');
const walmeLogContainer = document.getElementById('walme-log-container');

// 初始化Walme功能
function initWalme() {
  // 加载令牌
  ipcRenderer.send('get-walme-tokens');
  
  // 加载代理
  ipcRenderer.send('get-walme-proxies');
  
  // 启动按钮
  walmeStartBtn.addEventListener('click', () => {
    ipcRenderer.send('start-walme-bot');
  });
  
  // 停止按钮
  walmeStopBtn.addEventListener('click', () => {
    ipcRenderer.send('stop-walme-bot');
  });
  
  // 保存令牌
  walmeSaveTokensBtn.addEventListener('click', () => {
    const tokens = walmeTokensTextarea.value.split('\n')
      .map(token => token.trim())
      .filter(token => token.length > 0);
    
    ipcRenderer.send('save-walme-tokens', { tokens });
  });
  
  // 保存代理
  walmeSaveProxiesBtn.addEventListener('click', () => {
    const proxies = walmeProxiesTextarea.value.split('\n')
      .map(proxy => proxy.trim())
      .filter(proxy => proxy.length > 0);
    
    ipcRenderer.send('save-walme-proxies', { proxies });
  });
  
  // 导入令牌
  handleFileImport(walmeImportTokensInput, walmeTokensTextarea);
  
  // 导入代理
  handleFileImport(walmeImportProxiesInput, walmeProxiesTextarea);
  
  // 监听机器人状态
  ipcRenderer.on('walme-bot-status', (event, { status }) => {
    if (status === 'running') {
      walmeStatusDot.classList.remove('stopped');
      walmeStatusDot.classList.add('running');
      walmeStatusText.textContent = '运行中';
      walmeStatusText.classList.remove('status-stopped');
      walmeStatusText.classList.add('status-running');
      walmeStartBtn.disabled = true;
      walmeStopBtn.disabled = false;
    } else {
      walmeStatusDot.classList.remove('running');
      walmeStatusDot.classList.add('stopped');
      walmeStatusText.textContent = '已停止';
      walmeStatusText.classList.remove('status-running');
      walmeStatusText.classList.add('status-stopped');
      walmeStartBtn.disabled = false;
      walmeStopBtn.disabled = true;
    }
  });
  
  // 监听日志
  ipcRenderer.on('walme-log', (event, { type, message }) => {
    addLogEntry(walmeLogContainer, message, type);
  });
  
  // 监听令牌加载
  ipcRenderer.on('walme-tokens-loaded', (event, { tokens, error }) => {
    if (error) {
      console.error('加载令牌失败:', error);
      return;
    }
    
    walmeTokensTextarea.value = tokens.join('\n');
  });
  
  // 监听代理加载
  ipcRenderer.on('walme-proxies-loaded', (event, { proxies, error }) => {
    if (error) {
      console.error('加载代理失败:', error);
      return;
    }
    
    walmeProxiesTextarea.value = proxies.join('\n');
  });
  
  // 监听令牌保存
  ipcRenderer.on('walme-tokens-saved', (event, { success, error }) => {
    if (!success) {
      console.error('保存令牌失败:', error);
      addLogEntry(walmeLogContainer, `保存令牌失败: ${error}`, 'error');
      return;
    }
    
    addLogEntry(walmeLogContainer, '令牌已保存', 'success');
  });
  
  // 监听代理保存
  ipcRenderer.on('walme-proxies-saved', (event, { success, error }) => {
    if (!success) {
      console.error('保存代理失败:', error);
      addLogEntry(walmeLogContainer, `保存代理失败: ${error}`, 'error');
      return;
    }
    
    addLogEntry(walmeLogContainer, '代理已保存', 'success');
  });
}

// ==================== Fireverse 相关功能 ====================

// DOM元素 - Fireverse
const fireverseStatusDot = document.getElementById('fireverse-status-dot');
const fireverseStatusText = document.getElementById('fireverse-status-text');
const fireverseStartBtn = document.getElementById('fireverse-start-btn');
const fireverseStopBtn = document.getElementById('fireverse-stop-btn');
const fireverseWalletsTextarea = document.getElementById('fireverse-wallets-textarea');
const fireverseSaveWalletsBtn = document.getElementById('fireverse-save-wallets-btn');
const fireverseImportWalletsInput = document.getElementById('fireverse-import-wallets');
const fireverseUpdateToken = document.getElementById('fireverse-update-token');
const fireverseInviteCode = document.getElementById('fireverse-invite-code');
const fireverseLogContainer = document.getElementById('fireverse-log-container');

// 初始化Fireverse功能
function initFireverse() {
  // 加载钱包
  ipcRenderer.send('get-fireverse-wallets');
  
  // 启动按钮
  fireverseStartBtn.addEventListener('click', () => {
    const updateToken = fireverseUpdateToken.value;
    const inviteCode = fireverseInviteCode.value;
    
    ipcRenderer.send('start-fireverse-bot', { updateToken, inviteCode });
  });
  
  // 停止按钮
  fireverseStopBtn.addEventListener('click', () => {
    ipcRenderer.send('stop-fireverse-bot');
  });
  
  // 保存钱包
  fireverseSaveWalletsBtn.addEventListener('click', () => {
    const wallets = fireverseWalletsTextarea.value.split('\n')
      .map(wallet => wallet.trim())
      .filter(wallet => wallet.length > 0);
    
    ipcRenderer.send('save-fireverse-wallets', { wallets });
  });
  
  // 导入钱包
  handleFileImport(fireverseImportWalletsInput, fireverseWalletsTextarea);
  
  // 监听机器人状态
  ipcRenderer.on('fireverse-bot-status', (event, { status }) => {
    if (status === 'running') {
      fireverseStatusDot.classList.remove('stopped');
      fireverseStatusDot.classList.add('running');
      fireverseStatusText.textContent = '运行中';
      fireverseStatusText.classList.remove('status-stopped');
      fireverseStatusText.classList.add('status-running');
      fireverseStartBtn.disabled = true;
      fireverseStopBtn.disabled = false;
    } else {
      fireverseStatusDot.classList.remove('running');
      fireverseStatusDot.classList.add('stopped');
      fireverseStatusText.textContent = '已停止';
      fireverseStatusText.classList.remove('status-running');
      fireverseStatusText.classList.add('status-stopped');
      fireverseStartBtn.disabled = false;
      fireverseStopBtn.disabled = true;
    }
  });
  
  // 监听日志
  ipcRenderer.on('fireverse-log', (event, { type, message }) => {
    addLogEntry(fireverseLogContainer, message, type);
  });
  
  // 监听钱包加载
  ipcRenderer.on('fireverse-wallets-loaded', (event, { wallets, error }) => {
    if (error) {
      console.error('加载钱包失败:', error);
      return;
    }
    
    fireverseWalletsTextarea.value = wallets.join('\n');
  });
  
  // 监听钱包保存
  ipcRenderer.on('fireverse-wallets-saved', (event, { success, error }) => {
    if (!success) {
      console.error('保存钱包失败:', error);
      addLogEntry(fireverseLogContainer, `保存钱包失败: ${error}`, 'error');
      return;
    }
    
    addLogEntry(fireverseLogContainer, '钱包已保存', 'success');
  });
}

// ==================== Stork 相关功能 ====================

// DOM元素 - Stork
const storkStatusDot = document.getElementById('stork-status-dot');
const storkStatusText = document.getElementById('stork-status-text');
const storkStartBtn = document.getElementById('stork-start-btn');
const storkStopBtn = document.getElementById('stork-stop-btn');
const storkAccountList = document.getElementById('stork-account-list');
const storkUsername = document.getElementById('stork-username');
const storkPassword = document.getElementById('stork-password');
const storkAddAccountBtn = document.getElementById('stork-add-account-btn');
const storkProxiesTextarea = document.getElementById('stork-proxies-textarea');
const storkSaveProxiesBtn = document.getElementById('stork-save-proxies-btn');
const storkImportProxiesInput = document.getElementById('stork-import-proxies');
const storkInterval = document.getElementById('stork-interval');
const storkThreads = document.getElementById('stork-threads');
const storkLogContainer = document.getElementById('stork-log-container');

// 账户列表
let storkAccounts = [];

// 初始化Stork功能
function initStork() {
  // 加载账户
  ipcRenderer.send('get-stork-accounts');
  
  // 加载代理
  ipcRenderer.send('get-stork-proxies');
  
  // 加载配置
  ipcRenderer.send('get-stork-config');
  
  // 启动按钮
  storkStartBtn.addEventListener('click', () => {
    const config = {
      intervalSeconds: parseInt(storkInterval.value, 10),
      threads: parseInt(storkThreads.value, 10)
    };
    
    ipcRenderer.send('start-stork-bot', { config });
  });
  
  // 停止按钮
  storkStopBtn.addEventListener('click', () => {
    ipcRenderer.send('stop-stork-bot');
  });
  
  // 添加账户按钮
  storkAddAccountBtn.addEventListener('click', () => {
    const username = storkUsername.value.trim();
    const password = storkPassword.value.trim();
    
    if (username && password) {
      // 检查是否已存在相同账户
      if (!storkAccounts.some(account => account.username === username)) {
        storkAccounts.push({ username, password });
        ipcRenderer.send('save-stork-accounts', { accounts: storkAccounts });
        storkUsername.value = '';
        storkPassword.value = '';
        renderStorkAccounts();
      } else {
        addLogEntry(storkLogContainer, `账户 ${username} 已存在`, 'warning');
      }
    } else {
      addLogEntry(storkLogContainer, '用户名和密码不能为空', 'error');
    }
  });
  
  // 保存代理
  storkSaveProxiesBtn.addEventListener('click', () => {
    const proxies = storkProxiesTextarea.value.split('\n')
      .map(proxy => proxy.trim())
      .filter(proxy => proxy.length > 0);
    
    ipcRenderer.send('save-stork-proxies', { proxies });
  });
  
  // 导入代理
  handleFileImport(storkImportProxiesInput, storkProxiesTextarea);
  
  // 监听配置变更
  storkInterval.addEventListener('change', () => {
    saveStorkConfig();
  });
  
  storkThreads.addEventListener('change', () => {
    saveStorkConfig();
  });
  
  // 监听机器人状态
  ipcRenderer.on('stork-bot-status', (event, { status }) => {
    if (status === 'running') {
      storkStatusDot.classList.remove('stopped');
      storkStatusDot.classList.add('running');
      storkStatusText.textContent = '运行中';
      storkStatusText.classList.remove('status-stopped');
      storkStatusText.classList.add('status-running');
      storkStartBtn.disabled = true;
      storkStopBtn.disabled = false;
    } else {
      storkStatusDot.classList.remove('running');
      storkStatusDot.classList.add('stopped');
      storkStatusText.textContent = '已停止';
      storkStatusText.classList.remove('status-running');
      storkStatusText.classList.add('status-stopped');
      storkStartBtn.disabled = false;
      storkStopBtn.disabled = true;
    }
  });
  
  // 监听日志
  ipcRenderer.on('stork-log', (event, { type, message }) => {
    addLogEntry(storkLogContainer, message, type);
  });
  
  // 监听账户加载
  ipcRenderer.on('stork-accounts-loaded', (event, { accounts, error }) => {
    if (error) {
      console.error('加载账户失败:', error);
      return;
    }
    
    storkAccounts = accounts;
    renderStorkAccounts();
  });
  
  // 监听代理加载
  ipcRenderer.on('stork-proxies-loaded', (event, { proxies, error }) => {
    if (error) {
      console.error('加载代理失败:', error);
      return;
    }
    
    storkProxiesTextarea.value = proxies.join('\n');
  });
  
  // 监听配置加载
  ipcRenderer.on('stork-config-loaded', (event, { config, error }) => {
    if (error) {
      console.error('加载配置失败:', error);
      return;
    }
    
    storkInterval.value = config.intervalSeconds || 30;
    storkThreads.value = config.threads || 1;
  });
  
  // 监听账户保存
  ipcRenderer.on('stork-accounts-saved', (event, { success, error }) => {
    if (!success) {
      console.error('保存账户失败:', error);
      addLogEntry(storkLogContainer, `保存账户失败: ${error}`, 'error');
      return;
    }
    
    addLogEntry(storkLogContainer, '账户已保存', 'success');
  });
  
  // 监听代理保存
  ipcRenderer.on('stork-proxies-saved', (event, { success, error }) => {
    if (!success) {
      console.error('保存代理失败:', error);
      addLogEntry(storkLogContainer, `保存代理失败: ${error}`, 'error');
      return;
    }
    
    addLogEntry(storkLogContainer, '代理已保存', 'success');
  });
  
  // 监听用户统计
  ipcRenderer.on('stork-user-stats', (event, { stats }) => {
    displayStorkStats(stats);
  });
}

// 渲染账户列表
function renderStorkAccounts() {
  storkAccountList.innerHTML = '';
  
  if (storkAccounts.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'account-empty';
    emptyMessage.textContent = '暂无账户，请添加账户';
    storkAccountList.appendChild(emptyMessage);
    return;
  }
  
  storkAccounts.forEach((account, index) => {
    const accountItem = document.createElement('div');
    accountItem.className = 'account-item';
    
    const accountInfo = document.createElement('div');
    accountInfo.className = 'account-info';
    
    const username = document.createElement('div');
    username.className = 'account-username';
    username.textContent = account.username;
    
    accountInfo.appendChild(username);
    accountItem.appendChild(accountInfo);
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'account-remove';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
      storkAccounts.splice(index, 1);
      ipcRenderer.send('save-stork-accounts', { accounts: storkAccounts });
      renderStorkAccounts();
    });
    
    accountItem.appendChild(removeBtn);
    storkAccountList.appendChild(accountItem);
  });
}

// 保存Stork配置
function saveStorkConfig() {
  const config = {
    intervalSeconds: parseInt(storkInterval.value, 10),
    threads: parseInt(storkThreads.value, 10)
  };
  
  ipcRenderer.send('save-stork-config', { config });
}

// 显示用户统计信息
function displayStorkStats(statsData) {
  // 创建或更新统计表格
  let statsDiv = document.getElementById('stork-stats');
  
  if (!statsDiv) {
    statsDiv = document.createElement('div');
    statsDiv.id = 'stork-stats';
    statsDiv.className = 'stats-container';
    storkLogContainer.parentNode.insertBefore(statsDiv, storkLogContainer);
  }
  
  // 创建表头
  const statsHeader = document.createElement('div');
  statsHeader.className = 'stats-header';
  
  const statsTitle = document.createElement('div');
  statsTitle.className = 'stats-title';
  statsTitle.textContent = '用户统计信息';
  
  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'stats-refresh';
  refreshBtn.textContent = '刷新';
  refreshBtn.addEventListener('click', () => {
    ipcRenderer.send('get-stork-stats');
  });
  
  statsHeader.appendChild(statsTitle);
  statsHeader.appendChild(refreshBtn);
  
  // 创建表格
  const table = document.createElement('table');
  table.className = 'stats-table';
  
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
  const headers = ['账户', '验证次数', '奖励积分', '级别'];
  headers.forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    headerRow.appendChild(th);
  });
  
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  const tbody = document.createElement('tbody');
  
  // 填充表格数据
  statsData.forEach(stat => {
    const row = document.createElement('tr');
    
    const usernameCell = document.createElement('td');
    usernameCell.textContent = stat.username;
    
    const validationsCell = document.createElement('td');
    validationsCell.textContent = stat.validations || 0;
    
    const pointsCell = document.createElement('td');
    pointsCell.textContent = stat.points || 0;
    
    const levelCell = document.createElement('td');
    levelCell.textContent = stat.level || 0;
    
    row.appendChild(usernameCell);
    row.appendChild(validationsCell);
    row.appendChild(pointsCell);
    row.appendChild(levelCell);
    
    tbody.appendChild(row);
  });
  
  table.appendChild(tbody);
  
  // 更新DOM
  statsDiv.innerHTML = '';
  statsDiv.appendChild(statsHeader);
  statsDiv.appendChild(table);
}

// ==================== NodeGo 相关功能 ====================

// DOM元素 - NodeGo
const nodegoStatusDot = document.getElementById('nodego-status-dot');
const nodegoStatusText = document.getElementById('nodego-status-text');
const nodegoStartBtn = document.getElementById('nodego-start-btn');
const nodegoStopBtn = document.getElementById('nodego-stop-btn');
const nodegoTokensTextarea = document.getElementById('nodego-tokens-textarea');
const nodegoSaveTokensBtn = document.getElementById('nodego-save-tokens-btn');
const nodegoImportTokensInput = document.getElementById('nodego-import-tokens');
const nodegoProxiesTextarea = document.getElementById('nodego-proxies-textarea');
const nodegoSaveProxiesBtn = document.getElementById('nodego-save-proxies-btn');
const nodegoImportProxiesInput = document.getElementById('nodego-import-proxies');
const nodegoPingInterval = document.getElementById('nodego-ping-interval');
const nodegoLogContainer = document.getElementById('nodego-log-container');

// 初始化NodeGo功能
function initNodeGo() {
  // 加载令牌
  ipcRenderer.send('get-nodego-tokens');
  
  // 加载代理
  ipcRenderer.send('get-nodego-proxies');
  
  // 加载配置
  ipcRenderer.send('get-nodego-config');
  
  // 启动按钮
  nodegoStartBtn.addEventListener('click', () => {
    const config = {
      pingInterval: parseInt(nodegoPingInterval.value, 10)
    };
    
    ipcRenderer.send('start-nodego-bot', { config });
  });
  
  // 停止按钮
  nodegoStopBtn.addEventListener('click', () => {
    ipcRenderer.send('stop-nodego-bot');
  });
  
  // 保存令牌
  nodegoSaveTokensBtn.addEventListener('click', () => {
    const tokens = nodegoTokensTextarea.value.split('\n')
      .map(token => token.trim())
      .filter(token => token.length > 0);
    
    ipcRenderer.send('save-nodego-tokens', { tokens });
  });
  
  // 导入令牌
  handleFileImport(nodegoImportTokensInput, nodegoTokensTextarea);
  
  // 保存代理
  nodegoSaveProxiesBtn.addEventListener('click', () => {
    const proxies = nodegoProxiesTextarea.value.split('\n')
      .map(proxy => proxy.trim())
      .filter(proxy => proxy.length > 0);
    
    ipcRenderer.send('save-nodego-proxies', { proxies });
  });
  
  // 导入代理
  handleFileImport(nodegoImportProxiesInput, nodegoProxiesTextarea);
  
  // 监听机器人状态
  ipcRenderer.on('nodego-bot-status', (event, { status }) => {
    if (status === 'running') {
      nodegoStatusDot.classList.remove('stopped');
      nodegoStatusDot.classList.add('running');
      nodegoStatusText.textContent = '运行中';
      nodegoStatusText.classList.remove('status-stopped');
      nodegoStatusText.classList.add('status-running');
      nodegoStartBtn.disabled = true;
      nodegoStopBtn.disabled = false;
    } else {
      nodegoStatusDot.classList.remove('running');
      nodegoStatusDot.classList.add('stopped');
      nodegoStatusText.textContent = '已停止';
      nodegoStatusText.classList.remove('status-running');
      nodegoStatusText.classList.add('status-stopped');
      nodegoStartBtn.disabled = false;
      nodegoStopBtn.disabled = true;
    }
  });
  
  // 监听令牌加载
  ipcRenderer.on('nodego-tokens-loaded', (event, { tokens, error }) => {
    if (error) {
      console.error('加载NodeGo令牌失败:', error);
      return;
    }
    
    nodegoTokensTextarea.value = tokens.join('\n');
  });
  
  // 监听令牌保存
  ipcRenderer.on('nodego-tokens-saved', (event, { success, error }) => {
    if (success) {
      addLogEntry(nodegoLogContainer, '✅ NodeGo令牌已保存', 'success');
    } else {
      addLogEntry(nodegoLogContainer, `❌ 保存NodeGo令牌失败: ${error}`, 'error');
    }
  });
  
  // 监听代理加载
  ipcRenderer.on('nodego-proxies-loaded', (event, { proxies, error }) => {
    if (error) {
      console.error('加载NodeGo代理失败:', error);
      return;
    }
    
    nodegoProxiesTextarea.value = proxies.join('\n');
  });
  
  // 监听代理保存
  ipcRenderer.on('nodego-proxies-saved', (event, { success, error }) => {
    if (success) {
      addLogEntry(nodegoLogContainer, '✅ NodeGo代理已保存', 'success');
    } else {
      addLogEntry(nodegoLogContainer, `❌ 保存NodeGo代理失败: ${error}`, 'error');
    }
  });
  
  // 监听配置加载
  ipcRenderer.on('nodego-config-loaded', (event, { config, error }) => {
    if (error) {
      console.error('加载NodeGo配置失败:', error);
      return;
    }
    
    nodegoPingInterval.value = config.pingInterval.toString();
  });
  
  // 监听日志
  ipcRenderer.on('nodego-log', (event, { type, message }) => {
    addLogEntry(nodegoLogContainer, message, type);
  });
}

// ==================== HiPin 相关功能 ====================

// HiPin 相关DOM元素
const hipinStatusDot = document.getElementById('hipin-status-dot');
const hipinStatusText = document.getElementById('hipin-status-text');
const hipinStartBtn = document.getElementById('hipin-start-btn');
const hipinStopBtn = document.getElementById('hipin-stop-btn');
const hipinTokensTextarea = document.getElementById('hipin-tokens-textarea');
const hipinSaveTokensBtn = document.getElementById('hipin-save-tokens-btn');
const hipinImportTokens = document.getElementById('hipin-import-tokens');
const hipinLogContainer = document.getElementById('hipin-log-container');

// HiPin 统计信息元素
const hipinUsername = document.getElementById('hipin-username');
const hipinCheckin = document.getElementById('hipin-checkin');
const hipinLevel = document.getElementById('hipin-level');
const hipinNextLevelPoints = document.getElementById('hipin-next-level-points');
const hipinNextLevelPower = document.getElementById('hipin-next-level-power');
const hipinDataPower = document.getElementById('hipin-data-power');
const hipinPoints = document.getElementById('hipin-points');

// 初始化HiPin
function initHiPin() {
    // 加载令牌
    ipcRenderer.send('hipin:load-token');
    
    // 绑定事件
    hipinStartBtn.addEventListener('click', () => {
        ipcRenderer.send('hipin:start');
        hipinStartBtn.disabled = true;
        hipinStopBtn.disabled = false;
    });
    
    hipinStopBtn.addEventListener('click', () => {
        ipcRenderer.send('hipin:stop');
        hipinStartBtn.disabled = false;
        hipinStopBtn.disabled = true;
    });
    
    hipinSaveTokensBtn.addEventListener('click', () => {
        const tokens = hipinTokensTextarea.value.trim();
        ipcRenderer.send('hipin:save-token', tokens);
    });
    
    // 导入令牌文件
    handleFileImport(hipinImportTokens, hipinTokensTextarea);
}

// 更新HiPin统计信息
function updateHiPinStats(stats) {
    hipinUsername.textContent = stats.name;
    hipinCheckin.textContent = stats.isTodayCheckin ? '是' : '否';
    hipinLevel.textContent = stats.currentLevel;
    hipinNextLevelPoints.textContent = stats.nextLevelPoints;
    hipinNextLevelPower.textContent = stats.nextLevelPower;
    hipinDataPower.textContent = stats.dataPower;
    hipinPoints.textContent = stats.pinPoints;
}

// 添加HiPin日志
function addHiPinLog(message, type = 'info') {
    const div = document.createElement('div');
    div.className = `log-entry log-${type}`;
    div.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    hipinLogContainer.appendChild(div);
    hipinLogContainer.scrollTop = hipinLogContainer.scrollHeight;
}

// HiPin IPC事件处理
ipcRenderer.on('hipin:status', (event, status) => {
    if (status.running) {
        hipinStatusDot.className = 'status-dot running';
        hipinStatusText.textContent = '运行中';
        hipinStartBtn.disabled = true;
        hipinStopBtn.disabled = false;
    } else {
        hipinStatusDot.className = 'status-dot stopped';
        hipinStatusText.textContent = '已停止';
        hipinStartBtn.disabled = false;
        hipinStopBtn.disabled = true;
    }
});

ipcRenderer.on('hipin:token', (event, token) => {
    hipinTokensTextarea.value = token || '';
});

ipcRenderer.on('hipin:stats', (event, stats) => {
    updateHiPinStats(stats);
});

ipcRenderer.on('hipin:log', (event, { message, type }) => {
    addHiPinLog(message, type);
});

// ==================== 初始化 ====================

document.addEventListener('DOMContentLoaded', () => {
  // 设置标签页
  setupTabs();
  
  // 初始化Walme功能
  initWalme();
  
  // 初始化Fireverse功能
  initFireverse();
  
  // 添加Stork初始化
  initStork();
  
  // 添加NodeGo初始化
  initNodeGo();
  
  // 添加HiPin初始化
  initHiPin();
  
  // 添加初始日志
  addLogEntry(walmeLogContainer, '欢迎使用Walme自动化工具', 'info');
  addLogEntry(fireverseLogContainer, '欢迎使用Fireverse自动化工具', 'info');
  addLogEntry(storkLogContainer, '欢迎使用Stork自动化工具', 'info');
  addLogEntry(nodegoLogContainer, '欢迎使用NodeGo自动化工具', 'info');
}); 