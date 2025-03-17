const fs = require('fs').promises;
const path = require('path');
const HiPinBot = require('../modules/hipin');

async function getToken() {
    try {
        const token = await fs.readFile(path.join(__dirname, 'token.txt'), 'utf8');
        const cleanToken = token.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'))[0];
        
        if (!cleanToken) {
            throw new Error('token.txt文件为空或格式不正确');
        }
        
        return cleanToken;
    } catch (e) {
        console.error('❌ 读取token.txt失败:', e.message);
        process.exit(1);
    }
}

async function main() {
    try {
        console.log('\n=====================================');
        console.log('  Hi Pin 自动机器人 - 合并版');
        console.log('=====================================\n');

        // 创建HiPin机器人实例
        const bot = new HiPinBot();
        
        // 监听事件
        bot.on('status', (status) => {
            if (status.type === 'home') {
                console.log('===== 账号信息 =====');
                console.log(`👤 用户名: ${status.data.name}`);
                console.log(`✅ 今日签到: ${status.data.isTodayCheckin ? '是' : '否'}`);
                console.log(`📊 当前等级: ${status.data.currentLevel}`);
                console.log(`⬆️ 下一等级所需积分: ${status.data.nextLevelPoints}`);
                console.log(`⚡ 下一等级增加能量: ${status.data.nextLevelPower}`);
                console.log(`🔋 数据能量: ${status.data.dataPower}`);
                console.log(`💎 Pin积分: ${status.data.pinPoints}`);
            } else if (status.type === 'tasks') {
                console.log('===== 任务信息 =====');
                console.log(`📋 找到 ${status.data.count} 个任务`);
            } else if (status.type === 'task_claimed') {
                console.log(`✅ 任务 ${status.data.taskId}: 已领取`);
            } else if (status.type === 'resource_collected') {
                console.log(`💰 ${status.data.resource}: 已收集`);
            }
        });
        
        bot.on('error', (error) => {
            console.error(`❌ 错误: ${error}`);
        });
        
        // 启动机器人
        await bot.start();
    } catch (e) {
        console.error('💥 机器人崩溃:', e.message);
        console.log('🔄 5秒后重启...');
        setTimeout(() => main(), 5000);
    }
}

// 处理异常
process.on('unhandledRejection', (e) => console.error('⚠️ 未处理的Promise拒绝:', e.message));
process.on('uncaughtException', (e) => console.error('⚠️ 未捕获的异常:', e.message));

// 启动
main(); 