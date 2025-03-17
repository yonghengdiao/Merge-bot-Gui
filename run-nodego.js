import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 启动NodeGo Pinger服务
 * @param {Object} config - 配置信息
 * @param {Array<string>} config.tokens - 令牌列表
 * @param {Array<string>} config.proxies - 代理列表
 * @param {number} config.pingInterval - Ping间隔时间(分钟)
 * @returns {Object} - 包含进程和相关方法的对象
 */
async function runNodeGoPinger(config = {}) {
  try {
    // 确保有有效配置
    config.tokens = config.tokens || [];
    config.proxies = config.proxies || [];
    config.pingInterval = config.pingInterval || 4;
    
    if (!config.tokens || config.tokens.length === 0) {
      throw new Error('没有提供有效的令牌');
    }
    
    // 获取脚本路径
    const scriptPath = path.join(__dirname, '../NodeGo-Auto-Bot/nodego-pinger.js');
    
    // 创建临时配置文件
    const tempDir = path.join(process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.local/share'), 'merged-auto-bot');
    
    await fs.mkdir(tempDir, { recursive: true });
    
    const configPath = path.join(tempDir, 'nodego-config.json');
    await fs.writeFile(configPath, JSON.stringify({
      tokens: config.tokens,
      proxies: config.proxies,
      pingInterval: config.pingInterval
    }, null, 2));
    
    // 设置环境变量
    const env = {
      ...process.env,
      NODEGO_CONFIG_PATH: configPath,
      NODEGO_GUI_MODE: 'true'
    };
    
    // 启动子进程
    const nodegoProcess = spawn('node', [scriptPath], { env });
    
    // 返回进程对象和相关方法
    return {
      process: nodegoProcess,
      isRunning: true,
      
      // 获取状态
      getStatus() {
        return this.isRunning ? 'running' : 'stopped';
      },
      
      // 关闭进程的方法
      async stop() {
        if (this.isRunning && this.process) {
          this.process.kill();
          this.isRunning = false;
          return true;
        }
        return false;
      }
    };
  } catch (error) {
    console.error('启动NodeGo Pinger出错:', error);
    throw error;
  }
}

export { runNodeGoPinger }; 