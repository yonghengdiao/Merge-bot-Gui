const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

// 定义日志文件路径
const logFilePath = path.join(process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.local/share'), 'merged-auto-bot', 'kile-logs.txt');

/**
 * 启动Kile AI机器人
 * @param {Object} config - 配置对象
 * @param {Array<string>} config.wallets - 钱包地址列表
 * @param {Array<string>} config.proxies - 代理地址列表
 * @param {Array<string>} config.agents - 要启用的AI代理列表 
 * @param {number} config.minSuccessCount - 每个钱包最小成功次数
 * @param {number} config.maxSuccessCount - 每个钱包最大成功次数
 * @returns {Object} - 进程对象和错误处理方法
 */
async function runKileBot(config = {}) {
  try {
    // 确保配置项存在
    config.wallets = config.wallets || [];
    config.proxies = config.proxies || [];
    config.agents = config.agents || ['professor', 'crypto', 'sherlock'];
    config.minSuccessCount = config.minSuccessCount || 3;
    config.maxSuccessCount = config.maxSuccessCount || 5;
    
    // 检查钱包是否存在
    if (config.wallets.length === 0) {
      throw new Error('没有提供钱包地址');
    }
    
    // 创建日志目录
    await fs.mkdir(path.dirname(logFilePath), { recursive: true });
    
    // 清空旧日志
    try {
      await fs.writeFile(logFilePath, '');
    } catch (error) {
      console.error('清空日志文件失败:', error);
    }
    
    // 记录启动信息
    await appendToLog(`[INFO] Kile AI Bot启动于 ${new Date().toLocaleString()}`);
    await appendToLog(`[CONFIG] 启用的代理: ${config.agents.join(', ')}`);
    await appendToLog(`[CONFIG] 钱包数量: ${config.wallets.length}`);
    await appendToLog(`[CONFIG] 代理数量: ${config.proxies.length}`);
    await appendToLog(`[CONFIG] 每个钱包成功次数范围: ${config.minSuccessCount}-${config.maxSuccessCount}`);
    
    // 拼接脚本路径
    const scriptPath = path.join(__dirname, '../Kile_Ai_Bot-main/index.js');
    
    // 创建临时配置文件
    const tempConfigPath = path.join(process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.local/share'), 'merged-auto-bot', 'kile-temp-config.json');
    
    await fs.writeFile(tempConfigPath, JSON.stringify(config, null, 2));
    
    // 设置环境变量
    const env = {
      ...process.env,
      KILE_CONFIG_PATH: tempConfigPath,
      KILE_GUI_MODE: 'true',
      KILE_LOG_PATH: logFilePath
    };
    
    // 启动子进程
    const kileProcess = spawn('node', [scriptPath], { env });
    
    // 处理标准输出
    kileProcess.stdout.on('data', async (data) => {
      const message = data.toString().trim();
      if (message) {
        console.log(message);
        await appendToLog(message);
      }
    });
    
    // 处理标准错误
    kileProcess.stderr.on('data', async (data) => {
      const message = data.toString().trim();
      if (message) {
        console.error(message);
        await appendToLog(`[ERROR] ${message}`);
      }
    });
    
    // 进程退出
    kileProcess.on('close', async (code) => {
      await appendToLog(`[INFO] Kile AI Bot已退出，退出代码: ${code}`);
    });
    
    // 返回进程对象和错误处理方法
    return {
      process: kileProcess,
      handleError: async (error) => {
        console.error('Kile AI Bot出错:', error);
        await appendToLog(`[ERROR] ${error.message}`);
      }
    };
    
  } catch (error) {
    console.error('启动Kile AI Bot失败:', error);
    await appendToLog(`[FATAL] 启动Kile AI Bot失败: ${error.message}`);
    throw error;
  }
}

/**
 * 向日志文件追加内容
 * @param {string} message - 日志消息
 */
async function appendToLog(message) {
  try {
    // 添加时间戳
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    
    // 追加到日志文件
    await fs.appendFile(logFilePath, logMessage);
  } catch (error) {
    console.error('写入日志失败:', error);
  }
}

module.exports = { runKileBot }; 