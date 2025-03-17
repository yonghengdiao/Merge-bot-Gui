const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 项目根目录
const rootDir = __dirname;
const walmeDir = path.join(rootDir, 'walme');
const fireverseDir = path.join(rootDir, 'fireverse');

// 原始项目路径
const originalWalmePath = path.join(rootDir, '..', 'Walme-Auto-Bot');
const originalFireversePath = path.join(rootDir, '..', 'Fireverse_AutoGetTokens_bot-main');

// 确保目录存在
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`创建目录：${dirPath}`);
  }
}

// 复制文件
function copyFile(source, destination) {
  try {
    fs.copyFileSync(source, destination);
    console.log(`复制文件：${source} -> ${destination}`);
  } catch (error) {
    console.error(`复制文件失败：${source}`, error);
  }
}

// 复制目录下的所有js文件
function copyJsFiles(sourceDir, destDir) {
  if (!fs.existsSync(sourceDir)) {
    console.error(`源目录不存在：${sourceDir}`);
    return;
  }

  const files = fs.readdirSync(sourceDir);
  for (const file of files) {
    if (file.endsWith('.js')) {
      const sourcePath = path.join(sourceDir, file);
      const destPath = path.join(destDir, file);
      copyFile(sourcePath, destPath);
    }
  }
}

// 设置空文件
function setupEmptyFile(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '');
    console.log(`创建空文件：${filePath}`);
  }
}

// 主函数
function setup() {
  console.log('开始设置合并项目...');

  // 确保目录存在
  ensureDirectoryExists(walmeDir);
  ensureDirectoryExists(fireverseDir);

  // 复制Walme项目的文件
  console.log('\n复制Walme项目文件...');
  copyJsFiles(originalWalmePath, walmeDir);
  
  // 复制Fireverse项目的文件
  console.log('\n复制Fireverse项目文件...');
  copyJsFiles(originalFireversePath, fireverseDir);

  // 设置空的配置文件
  console.log('\n设置配置文件...');
  setupEmptyFile(path.join(walmeDir, 'tokens.txt'));
  setupEmptyFile(path.join(walmeDir, 'proxies.txt'));
  setupEmptyFile(path.join(walmeDir, 'completed_tasks.json'));
  setupEmptyFile(path.join(fireverseDir, 'tokens.txt'));
  setupEmptyFile(path.join(fireverseDir, 'wallets.txt'));

  console.log('\n设置完成！');
  console.log('\n使用以下命令启动应用：');
  console.log('npm install');
  console.log('npm start');
}

// 执行设置
setup(); 