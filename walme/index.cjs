const fs = require('fs').promises;
const axios = require('axios');
const SocksProxyAgent = require('socks-proxy-agent').SocksProxyAgent;
const HttpProxyAgent = require('http-proxy-agent').HttpProxyAgent;
const HttpsProxyAgent = require('https-proxy-agent').HttpsProxyAgent;
const path = require('path');
const chalk = require('chalk');

// 直接启动机器人
runBot();

const BASE_URL = 'https://api.walme.io/waitlist/tasks';
const PROFILE_URL = 'https://api.walme.io/user/profile';
const COMPLETED_TASKS_FILE = path.join(__dirname, 'completed_tasks.json');
const PROXIES_FILE = path.join(__dirname, 'proxies.txt');

async function getAccessTokens() {
    try {
        const tokenData = await fs.readFile(path.join(__dirname, 'tokens.txt'), 'utf8');
        const tokens = tokenData.split('\n')
            .map(token => token.trim())
            .filter(token => token.length > 0);
        
        if (tokens.length === 0) {
            throw new Error('No tokens found in tokens.txt');
        }
        return tokens;
    } catch (error) {
        console.error(chalk.red.bold(`[错误] 无法读取tokens.txt中的令牌: ${error.message}`));
        throw error;
    }
}

async function getProxies() {
    try {
        const proxyData = await fs.readFile(PROXIES_FILE, 'utf8');
        const proxies = proxyData.split('\n')
            .map(proxy => proxy.trim())
            .filter(proxy => proxy.length > 0);
        
        if (proxies.length === 0) {
            console.log(chalk.yellow(`[警告] 在${PROXIES_FILE}中未找到代理。将不使用代理运行。`));
            return [];
        }
        
        console.log(chalk.white(`🌐 [信息] 已从${PROXIES_FILE}加载${proxies.length}个代理`));
        return proxies;
    } catch (error) {
        console.error(chalk.yellow(`[警告] 无法从${PROXIES_FILE}读取代理: ${error.message}。将不使用代理运行。`));
        return [];
    }
}

function createProxyAgent(proxyString) {
    try {
        let protocol, host, port, auth;
        
        if (proxyString.includes('://')) {
            const url = new URL(proxyString);
            protocol = url.protocol.replace(':', '');
            host = url.hostname;
            port = url.port;
            auth = url.username && url.password ? `${url.username}:${url.password}` : null;
        } 
        else {
            const parts = proxyString.split(':');
            if (parts.length >= 2) {
                if (parts.length === 2) {
                    
                    [host, port] = parts;
                    protocol = 'http';
                } else if (parts.length === 4) {
                    
                    [host, port, ...auth] = parts;
                    auth = auth.join(':');
                    protocol = 'http'; 
                } else if (proxyString.includes('@')) {
                    const [credentials, server] = proxyString.split('@');
                    auth = credentials;
                    [host, port] = server.split(':');
                    protocol = 'http'; 
                }
            }
        }
        
        if (!host || !port) {
            throw new Error(`Invalid proxy format: ${proxyString}`);
        }
        
        let proxyType = protocol?.toLowerCase() || 'http';
        
        if (proxyType.startsWith('socks')) {
            const socksOptions = {
                hostname: host,
                port: parseInt(port)
            };
            
            if (auth) {
                const [username, password] = auth.split(':');
                socksOptions.username = username;
                socksOptions.password = password;
            }
            
            const socksUrl = `socks${proxyType.endsWith('5') ? '5' : '4'}://${auth ? auth + '@' : ''}${host}:${port}`;
            return new SocksProxyAgent(socksUrl);
        } 
        else {
            const httpProxyUrl = `http://${auth ? auth + '@' : ''}${host}:${port}`;
            return {
                http: new HttpProxyAgent(httpProxyUrl),
                https: new HttpsProxyAgent(httpProxyUrl)
            };
        }
    } catch (error) {
        console.error(chalk.red.bold(`[错误] 创建代理代理失败: ${error.message}`));
        return null;
    }
}

async function getUserProfile(token, proxyAgent) {
    try {
        const config = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        };
        
        if (proxyAgent) {
            if (proxyAgent.http && proxyAgent.https) {
                config.httpAgent = proxyAgent.http;
                config.httpsAgent = proxyAgent.https;
            } else {
                config.httpsAgent = proxyAgent;
                config.httpAgent = proxyAgent;
            }
        }
        
        const response = await axios.get(PROFILE_URL, config);
        const { email, nickname } = response.data;
        console.log(chalk.white(`✨ [信息] 已获取个人资料 - 邮箱: ${email}, 昵称: ${nickname}`));
        return { email, nickname };
    } catch (error) {
        console.error(chalk.red.bold(`[错误] 获取用户资料失败: ${error.response?.data?.message || error.message}`));
        throw error;
    }
}

async function getTasks(token, proxyAgent) {
    try {
        const config = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        };
        
        if (proxyAgent) {
            if (proxyAgent.http && proxyAgent.https) {
                config.httpAgent = proxyAgent.http;
                config.httpsAgent = proxyAgent.https;
            } else {
                config.httpsAgent = proxyAgent;
                config.httpAgent = proxyAgent;
            }
        }
        
        const response = await axios.get(BASE_URL, config);
        return response.data;
    } catch (error) {
        console.error(chalk.red.bold(`[错误] 获取任务列表失败: ${error.response?.data?.message || error.message}`));
        throw error;
    }
}

async function completeTask(taskId, token, proxyAgent) {
    try {
        const config = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        };
        
        if (proxyAgent) {
            if (proxyAgent.http && proxyAgent.https) {
                config.httpAgent = proxyAgent.http;
                config.httpsAgent = proxyAgent.https;
            } else {
                config.httpsAgent = proxyAgent;
                config.httpAgent = proxyAgent;
            }
        }
        
        const response = await axios.patch(`${BASE_URL}/${taskId}`, {}, config);
        console.log(chalk.green(`✅ [成功] 任务 ${taskId} 已处理: ${response.data.title}`));
        return response.data;
    } catch (error) {
        console.error(chalk.red.bold(`[错误] 处理任务 ${taskId} 失败: ${error.response?.data?.message || error.message}`));
        throw error;
    }
}

async function loadCompletedTasks() {
    try {
        const data = await fs.readFile(COMPLETED_TASKS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

async function saveCompletedTasks(completedTasks) {
    try {
        await fs.writeFile(COMPLETED_TASKS_FILE, JSON.stringify(completedTasks, null, 2));
    } catch (error) {
        console.error(chalk.red.bold(`[错误] 保存已完成任务失败: ${error.message}`));
    }
}

async function dailyCheckIn(day, completedTasks, profile) {
    const today = new Date().toISOString().split('T')[0];
    if (!completedTasks[profile.email]) completedTasks[profile.email] = { checkInDays: {} };
    
    if (!completedTasks[profile.email].checkInDays[today]) {
        console.log(chalk.yellow(`🌟 [信息] ${profile.email} - 第${day}天 - 7天挑战: 提升您的XP - 签到成功!`));
        completedTasks[profile.email].checkInDays[today] = true;

        if (Object.keys(completedTasks[profile.email].checkInDays).length === 7) {
            console.log(chalk.green.bold(`🎉 [成功] ${profile.email} - 7天挑战已完成! 获得XP提升!`));
        }
    } else {
        console.log(chalk.yellow(`⏳ [信息] ${profile.email} - 今天已经签到 (${today})`));
    }
    return completedTasks;
}

function startCountdown() {
    const nextRun = new Date();
    nextRun.setHours(nextRun.getHours() + 24);
    const totalMs = 24 * 60 * 60 * 1000;

    const interval = setInterval(() => {
        const now = new Date();
        const timeLeft = nextRun - now;

        if (timeLeft <= 0) {
            clearInterval(interval);
            console.log(chalk.blue.bold('🚀 [信息] 倒计时完成。开始下一轮运行...'));
        } else {
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            const progress = Math.floor((1 - timeLeft / totalMs) * 10);
            const bar = '█'.repeat(progress) + '░'.repeat(10 - progress);

            process.stdout.write(
                `\r${chalk.yellow('⏰ [信息] 下次运行倒计时:')} ${hours}小时 ${minutes}分钟 ${seconds}秒 ${chalk.white(`[${bar}]`)}`
            );
        }
    }, 1000);

    return nextRun;
}

async function processAccount(token, completedTasks, proxyAgent) {
    try {
        console.log(chalk.white('👤 [信息] 正在获取用户资料...'));
        const profile = await getUserProfile(token, proxyAgent);

        const dayCount = completedTasks[profile.email]?.checkInDays 
            ? Object.keys(completedTasks[profile.email].checkInDays).length + 1 
            : 1;
            
        if (dayCount <= 7) {
            completedTasks = await dailyCheckIn(dayCount, completedTasks, profile);
        } else {
            console.log(chalk.cyan(`🏆 [信息] ${profile.email} - 7天挑战已经完成!`));
        }

        console.log(chalk.white(`📋 [信息] ${profile.email} - 正在获取任务列表...`));
        const tasks = await getTasks(token, proxyAgent);
        console.log(chalk.white(`📋 [信息] ${profile.email} - 已获取任务列表，总任务数: ${tasks.length}`));

        const pendingTasks = tasks.filter(task => 
            task.status === 'new' && (!completedTasks[profile.email]?.tasks || !completedTasks[profile.email].tasks[task.id])
        );
        console.log(chalk.white(`📋 [信息] ${profile.email} - 新的待处理任务: ${pendingTasks.length}`));

        for (const task of pendingTasks) {
            console.log(chalk.yellow(`🔧 [信息] ${profile.email} - 正在处理任务: ${task.title} (ID: ${task.id})`));

            if (task.child && task.child.length > 0) {
                for (const childTask of task.child) {
                    if (childTask.status === 'new' && (!completedTasks[profile.email]?.tasks || !completedTasks[profile.email].tasks[childTask.id])) {
                        await completeTask(childTask.id, token, proxyAgent);
                        if (!completedTasks[profile.email].tasks) completedTasks[profile.email].tasks = {};
                        completedTasks[profile.email].tasks[childTask.id] = true;
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            } else {
                await completeTask(task.id, token, proxyAgent);
                if (!completedTasks[profile.email].tasks) completedTasks[profile.email].tasks = {};
                completedTasks[profile.email].tasks[task.id] = true;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.log(chalk.green.bold(`🎉 [成功] ${profile.email} - 所有新任务已处理完成`));
        return completedTasks;

    } catch (error) {
        console.error(chalk.red.bold(`💥 [错误] 账户处理失败: ${error.message}`));
        return completedTasks;
    }
}

async function runBot() {
    try {
        console.log(chalk.cyan.bold('═══════════════════════════════════════'));
        console.log(chalk.cyan.bold('   Walme 自动机器人 - 空投助手   '));
        console.log(chalk.cyan.bold('═══════════════════════════════════════'));

        console.log(chalk.white('🔑 [信息] 正在获取访问令牌...'));
        const tokens = await getAccessTokens();
        console.log(chalk.white(`🔑 [信息] 已成功获取 ${tokens.length} 个令牌`));

        console.log(chalk.white('🌐 [信息] 正在加载代理...'));
        const proxies = await getProxies();
        
        let completedTasks = await loadCompletedTasks();

        while (true) {
            console.log(chalk.cyan('─'.repeat(40)));

            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i];
                
                let proxyAgent = null;
                if (proxies.length > 0) {
                    const proxyIndex = i % proxies.length;
                    const proxyString = proxies[proxyIndex];
                    console.log(chalk.white(`🌐 [信息] 使用代理: ${proxyString.replace(/:[^:]*@/, ':****@')}`));
                    proxyAgent = createProxyAgent(proxyString);
                    
                    if (!proxyAgent) {
                        console.log(chalk.yellow(`[警告] 无法为代理创建代理代理: ${proxyString}。将不使用代理继续。`));
                    }
                }
                
                completedTasks = await processAccount(token, completedTasks, proxyAgent);
                await new Promise(resolve => setTimeout(resolve, 2000)); 
            }

            await saveCompletedTasks(completedTasks);

            const nextRunTime = startCountdown();
            await new Promise(resolve => setTimeout(resolve, nextRunTime - new Date()));
            console.log('');
        }
    } catch (error) {
        console.error(chalk.red.bold(`💥 [错误] 机器人执行失败: ${error.message}`));
    }
}