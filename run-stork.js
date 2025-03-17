import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 启动Stork机器人
 * @param {Object} options - 启动选项
 * @param {Array} options.accounts - 账户列表 [{username, password}]
 * @param {Array} options.proxies - 代理列表
 * @param {Object} options.config - 配置信息
 * @returns {Object} - 包含进程和状态的对象
 */
async function runStork(options = {}) {
  try {
    // 检查是否有账户
    if (!options.accounts || options.accounts.length === 0) {
      throw new Error('未提供账户信息');
    }
    
    // 确保其他选项存在
    options.proxies = options.proxies || [];
    options.config = options.config || {};
    options.config.intervalSeconds = options.config.intervalSeconds || 30;
    options.config.threads = options.config.threads || 1;
    
    // 创建临时配置文件
    const tempDir = path.join(process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.local/share'), 'merged-auto-bot');
    
    await fs.mkdir(tempDir, { recursive: true });
    
    const configPath = path.join(tempDir, 'stork-config.json');
    await fs.writeFile(configPath, JSON.stringify({
      accounts: options.accounts,
      proxies: options.proxies,
      config: options.config
    }, null, 2));
    
    // 获取脚本路径
    const scriptPath = path.join(__dirname, '../Stork-Auto-Bot/index.js');
    
    // 启动子进程
    const storkProcess = spawn('node', [scriptPath, '--config', configPath, '--gui']);
    
    // 返回进程对象
    return {
      process: storkProcess,
      
      // 关闭进程的方法
      stop() {
        if (storkProcess) {
          storkProcess.kill();
          return true;
        }
        return false;
      }
    };
    
  } catch (error) {
    console.error('启动Stork出错:', error);
    throw error;
  }
}

export { runStork }; 
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 启动Stork机器人
 * @param {Object} options - 启动选项
 * @param {Array} options.accounts - 账户列表 [{username, password}]
 * @param {Array} options.proxies - 代理列表
 * @param {Object} options.config - 配置信息
 * @returns {Object} - 包含进程和状态的对象
 */
async function runStork(options = {}) {
  try {
    // 检查是否有账户
    if (!options.accounts || options.accounts.length === 0) {
      throw new Error('未提供账户信息');
    }
    
    // 确保其他选项存在
    options.proxies = options.proxies || [];
    options.config = options.config || {};
    options.config.intervalSeconds = options.config.intervalSeconds || 30;
    options.config.threads = options.config.threads || 1;
    
    // 创建临时配置文件
    const tempDir = path.join(process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.local/share'), 'merged-auto-bot');
    
    await fs.mkdir(tempDir, { recursive: true });
    
    const configPath = path.join(tempDir, 'stork-config.json');
    await fs.writeFile(configPath, JSON.stringify({
      accounts: options.accounts,
      proxies: options.proxies,
      config: options.config
    }, null, 2));
    
    // 获取脚本路径
    const scriptPath = path.join(__dirname, '../Stork-Auto-Bot/index.js');
    
    // 启动子进程
    const storkProcess = spawn('node', [scriptPath, '--config', configPath, '--gui']);
    
    // 返回进程对象
    return {
      process: storkProcess,
      
      // 关闭进程的方法
      stop() {
        if (storkProcess) {
          storkProcess.kill();
          return true;
        }
        return false;
      }
    };
    
  } catch (error) {
    console.error('启动Stork出错:', error);
    throw error;
  }
}

export { runStork }; 