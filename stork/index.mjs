// Stork Oracle自动化工具 - 使用明确的ES模块扩展名
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 获取环境变量设置
const INTERVAL_SECONDS = parseInt(process.env.STORK_INTERVAL_SECONDS || '30', 10);
const THREADS = parseInt(process.env.STORK_THREADS || '1', 10);

console.log('Stork Oracle自动化工具已启动');
console.log(`配置: 验证间隔=${INTERVAL_SECONDS}秒, 线程数=${THREADS}`);

// 加载账户
async function loadAccounts() {
  try {
    const accountsPath = path.join(__dirname, 'accounts.json');
    const data = await fs.readFile(accountsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('加载账户出错:', error.message);
    return [];
  }
}

// 加载代理
async function loadProxies() {
  try {
    const proxiesPath = path.join(__dirname, 'proxies.txt');
    const data = await fs.readFile(proxiesPath, 'utf8');
    return data.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  } catch (error) {
    console.error('加载代理出错:', error.message);
    return [];
  }
}

// 主要验证函数
async function validateAccount(account, proxy = null) {
  console.log(`开始验证账户: ${account.username}`);
  // 这里是账户验证的模拟逻辑
  // 实际实现中，这里会包含真实的验证逻辑

  // 模拟随机延迟
  const delay = Math.floor(Math.random() * 2000) + 1000;
  await new Promise(resolve => setTimeout(resolve, delay));

  console.log(`账户 ${account.username} 验证完成`);
  return true;
}

// 主循环
async function main() {
  const accounts = await loadAccounts();
  const proxies = await loadProxies();

  if (accounts.length === 0) {
    console.error('没有找到账户，请添加账户后重试');
    process.exit(1);
  }

  console.log(`已加载 ${accounts.length} 个账户`);
  console.log(`已加载 ${proxies.length} 个代理`);

  // 创建验证队列
  let running = true;
  let iterations = 0;

  // 定义工作线程
  const worker = async (id) => {
    console.log(`工作线程 #${id} 已启动`);
    
    while (running) {
      for (const account of accounts) {
        if (!running) break;
        
        // 选择代理 (如果有)
        const proxy = proxies.length > 0 
          ? proxies[Math.floor(Math.random() * proxies.length)] 
          : null;
        
        try {
          await validateAccount(account, proxy);
        } catch (error) {
          console.error(`验证账户 ${account.username} 时出错:`, error.message);
        }
        
        // 在验证间隔之间等待
        await new Promise(resolve => setTimeout(resolve, INTERVAL_SECONDS * 1000));
      }
      
      iterations++;
      console.log(`完成第 ${iterations} 轮验证`);
    }
  };

  // 启动工作线程
  const workers = [];
  for (let i = 0; i < THREADS; i++) {
    workers.push(worker(i + 1));
  }

  // 处理优雅退出
  process.on('SIGINT', () => {
    console.log('正在停止...');
    running = false;
  });

  // 等待所有工作线程
  await Promise.all(workers);
}

// 运行主函数
main().catch(error => {
  console.error('程序运行出错:', error);
  process.exit(1);
}); 