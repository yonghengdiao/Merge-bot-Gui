import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import EventEmitter from 'events';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://prod-api.pinai.tech';

export class HiPinBot extends EventEmitter {
    constructor() {
        super();
        this.isRunning = false;
        this.headers = {
            'accept': 'application/json',
            'accept-language': 'en-US,en;q=0.9',
            'lang': 'en-US',
            'content-type': 'application/json',
            'sec-ch-ua': '"Chromium";v="133", "Microsoft Edge WebView2";v="133", "Not(A:Brand";v="99", "Microsoft Edge";v="133"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            'Referer': 'https://web.pinai.tech/',
            'Referrer-Policy': 'strict-origin-when-cross-origin'
        };
    }

    async getToken() {
        try {
            const token = await fs.readFile(path.join(__dirname, '../hipin/token.txt'), 'utf8');
            const cleanToken = token.split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#'))[0];
            
            if (!cleanToken) {
                throw new Error('token.txt文件为空或格式不正确');
            }
            
            return `Bearer ${cleanToken}`;
        } catch (e) {
            throw new Error('读取token.txt失败: ' + e.message);
        }
    }

    async checkHome() {
        try {
            const res = await axios.get(`${BASE_URL}/home`, { headers: this.headers });
            const data = res.data;

            return {
                name: data.user_info?.name || 'N/A',
                isTodayCheckin: data.is_today_checkin,
                currentLevel: data.current_model?.current_level || 'N/A',
                nextLevelPoints: data.current_model?.next_level_need_point || 'N/A',
                nextLevelPower: data.current_model?.next_level_add_power || 'N/A',
                dataPower: data.data_power || 'N/A',
                pinPoints: data.pin_points || 'N/A',
                pinPointsNumber: data.pin_points_in_number || 'N/A'
            };
        } catch (e) {
            throw new Error('获取主页信息失败: ' + e.message);
        }
    }

    async getRandomTasks() {
        try {
            const res = await axios.get(`${BASE_URL}/task/random_task_list`, { headers: this.headers });
            return res.data;
        } catch (e) {
            throw new Error('获取任务列表失败: ' + e.message);
        }
    }

    async claimTask(taskId) {
        try {
            const res = await axios.post(`${BASE_URL}/task/${taskId}/claim`, {}, { headers: this.headers });
            return res.data;
        } catch (e) {
            throw new Error(`领取任务 ${taskId} 失败: ` + e.message);
        }
    }

    async collectResources(type, count = 1) {
        try {
            const body = [{ type, count }];
            const res = await axios.post(`${BASE_URL}/home/collect`, body, { headers: this.headers });
            return res.data;
        } catch (e) {
            throw new Error(`收集资源 ${type} 失败: ` + e.message);
        }
    }

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this._forceStop = false;

        try {
            const token = await this.getToken();
            this.headers.authorization = token;

            // 发送正确的运行状态
            this.emit('log', '机器人启动成功', 'success');
            this.emit('status', { running: true });

            while (this.isRunning) {
                // 检查是否被强制停止
                if (this._forceStop) {
                    this.isRunning = false;
                    break;
                }

                // 检查主页信息
                try {
                    const homeInfo = await this.checkHome();
                    
                    // 更新界面上的统计信息
                    this.emit('stats', homeInfo);
                    
                    // 发送状态更新 - 注意不改变running状态
                    this.emit('log', `已获取用户信息: ${homeInfo.name}`, 'info');

                    // 获取并完成任务
                    const tasks = await this.getRandomTasks();
                    if (tasks?.data?.length) {
                        this.emit('log', `获取到${tasks.data.length}个任务`, 'info');

                        for (const task of tasks.data) {
                            // 检查是否被强制停止
                            if (this._forceStop || !this.isRunning) {
                                this.isRunning = false;
                                break;
                            }

                            if (task.id) {
                                try {
                                    await this.claimTask(task.id);
                                    this.emit('log', `领取任务 ${task.id} 成功`, 'success');
                                } catch (taskError) {
                                    this.emit('log', `领取任务 ${task.id} 失败: ${taskError.message}`, 'error');
                                }
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            }
                        }
                    }

                    // 如果已停止，跳出循环
                    if (!this.isRunning) break;

                    // 收集资源
                    const resources = ['Twitter', 'Google', 'Telegram'];
                    for (const resource of resources) {
                        // 检查是否被强制停止
                        if (this._forceStop || !this.isRunning) {
                            this.isRunning = false;
                            break;
                        }

                        try {
                            await this.collectResources(resource);
                            this.emit('log', `收集资源 ${resource} 成功`, 'success');
                        } catch (err) {
                            this.emit('log', `收集资源 ${resource} 失败: ${err.message}`, 'error');
                        }
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }

                    // 如果已停止，跳出循环
                    if (!this.isRunning) break;

                    // 等待下一轮
                    this.emit('log', '等待下一轮操作...', 'info');
                    for (let i = 0; i < 10; i++) {
                        if (this._forceStop || !this.isRunning) {
                            this.isRunning = false;
                            break;
                        }
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                } catch (loopError) {
                    this.emit('log', `循环执行错误: ${loopError.message}`, 'error');
                    // 不终止机器人，等待5秒后继续
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }

            this.emit('log', '机器人已停止运行', 'info');
            this.emit('status', { running: false });
        } catch (e) {
            this.emit('log', `启动失败: ${e.message}`, 'error');
            this.emit('status', { running: false });
            this.isRunning = false;
            this._forceStop = false;
        }
    }

    stop() {
        this.isRunning = false;
        this._forceStop = true;
        this.emit('log', '正在停止机器人...', 'info');
    }
} 