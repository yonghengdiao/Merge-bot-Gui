const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// 从命令行参数获取选项
const updateToken = process.argv[2] || 'n';
const inviteCode = process.argv[3] || 'wanfeng';

console.log(`🔧 配置信息：更新Token: ${updateToken}, 邀请码: ${inviteCode}`);

// 拦截所有readline的question调用，直接返回预设答案，不显示问题
global.AUTO_ANSWERS = {
  '是否需要更新Token': updateToken,
  '邀请码': inviteCode,
  '是否现在获取Token': 'y'
};

// 完全替换readline的接口，防止任何交互提示
class MockReadline {
  constructor() {}

  question(query, callback) {
    let answer = '';
    
    // 根据问题提供预设答案，不显示问题
    if (query.includes('更新Token')) {
      answer = updateToken;
    } else if (query.includes('邀请码')) {
      answer = inviteCode;
    } else if (query.includes('获取Token')) {
      answer = 'y';
    }
    
    // 不输出问题，直接返回答案
    console.log(`自动回答已处理，使用值: ${answer}`);
    
    // 立即调用回调，不等待用户输入
    callback(answer);
  }
}

// 使用模拟的readline
global.rl = new MockReadline();

// 运行原始脚本
require('./new_index.cjs');
    