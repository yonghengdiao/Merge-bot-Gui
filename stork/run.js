
import { spawn } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 从配置文件中获取配置
const configPath = path.join(__dirname, 'config.json');
let config = {
  intervalSeconds: 30,
  threads: 1
};

if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    console.error('加载配置出错:', err);
  }
}

// 创建accounts.js文件
const accountsPath = path.join(__dirname, 'accounts.js');
try {
  const accountsContent = JSON.parse(fs.readFileSync(path.join(__dirname, 'accounts.json'), 'utf8'));
  const accountsJsContent = `export const accounts = ${JSON.stringify(accountsContent, null, 2)};`;
  fs.writeFileSync(accountsPath, accountsJsContent, 'utf8');
  console.log('✅ 成功创建accounts.js文件');
} catch (err) {
  console.error('创建accounts.js文件失败:', err);
  process.exit(1);
}

// 运行主脚本
console.log('🚀 启动Stork自动化工具...');
console.log(`📊 配置：验证间隔=${config.intervalSeconds}秒, 线程数=${config.threads}`);

const indexPath = path.join(__dirname, 'index.js');
const botProcess = spawn('node', [indexPath], { 
  stdio: 'inherit',
  env: {
    ...process.env,
    STORK_INTERVAL_SECONDS: config.intervalSeconds.toString(),
    STORK_THREADS: config.threads.toString()
  }
});

botProcess.on('close', (code) => {
  console.log(`Stork机器人已退出，退出代码: ${code}`);
});

process.on('SIGINT', () => {
  botProcess.kill();
  process.exit(0);
});
    