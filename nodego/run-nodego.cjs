
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
console.log(`📊 配置：Ping间隔=4分钟`);

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
  console.log(`NodeGo机器人已退出，退出代码: ${code}`);
});

process.on('SIGINT', () => {
  botProcess.kill();
  process.exit(0);
});