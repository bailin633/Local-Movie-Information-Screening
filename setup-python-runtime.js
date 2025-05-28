/**
 * Python运行时设置脚本
 * 用于下载和配置便携式Python运行时
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const PYTHON_RUNTIME_DIR = path.join(__dirname, 'python-runtime');
const PYTHON_VERSION = '3.9.13';
const PYTHON_DOWNLOAD_URL = `https://www.python.org/ftp/python/${PYTHON_VERSION}/python-${PYTHON_VERSION}-embed-amd64.zip`;

async function downloadFile(url, destination) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destination);
        
        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                // 处理重定向
                return downloadFile(response.headers.location, destination)
                    .then(resolve)
                    .catch(reject);
            }
            
            if (response.statusCode !== 200) {
                reject(new Error(`下载失败: ${response.statusCode}`));
                return;
            }
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                resolve();
            });
            
            file.on('error', (err) => {
                fs.unlink(destination, () => {}); // 删除部分下载的文件
                reject(err);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function extractZip(zipPath, extractPath) {
    try {
        // 使用PowerShell解压（Windows）
        if (process.platform === 'win32') {
            const command = `powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractPath}' -Force"`;
            execSync(command, { stdio: 'inherit' });
        } else {
            // Unix系统使用unzip
            execSync(`unzip -o "${zipPath}" -d "${extractPath}"`, { stdio: 'inherit' });
        }
        console.log('解压完成');
    } catch (error) {
        console.error('解压失败:', error.message);
        throw error;
    }
}

async function setupPythonRuntime() {
    console.log('开始设置Python运行时...');
    
    try {
        // 创建运行时目录
        if (!fs.existsSync(PYTHON_RUNTIME_DIR)) {
            fs.mkdirSync(PYTHON_RUNTIME_DIR, { recursive: true });
            console.log('创建Python运行时目录:', PYTHON_RUNTIME_DIR);
        }
        
        const zipPath = path.join(PYTHON_RUNTIME_DIR, 'python-embed.zip');
        
        // 检查是否已经存在Python运行时
        const pythonExePath = path.join(PYTHON_RUNTIME_DIR, 'python.exe');
        if (fs.existsSync(pythonExePath)) {
            console.log('Python运行时已存在，跳过下载');
            return pythonExePath;
        }
        
        console.log('下载Python嵌入式版本...');
        console.log('下载URL:', PYTHON_DOWNLOAD_URL);
        
        await downloadFile(PYTHON_DOWNLOAD_URL, zipPath);
        console.log('下载完成');
        
        console.log('解压Python运行时...');
        await extractZip(zipPath, PYTHON_RUNTIME_DIR);
        
        // 删除zip文件
        fs.unlinkSync(zipPath);
        console.log('清理临时文件');
        
        // 验证Python是否可用
        if (fs.existsSync(pythonExePath)) {
            console.log('Python运行时设置成功:', pythonExePath);
            
            // 测试Python
            try {
                const result = execSync(`"${pythonExePath}" --version`, { encoding: 'utf8' });
                console.log('Python版本:', result.trim());
            } catch (testError) {
                console.warn('Python测试失败:', testError.message);
            }
            
            return pythonExePath;
        } else {
            throw new Error('Python运行时设置失败：未找到python.exe');
        }
        
    } catch (error) {
        console.error('设置Python运行时失败:', error.message);
        throw error;
    }
}

async function createPythonRuntimeInfo() {
    const infoPath = path.join(PYTHON_RUNTIME_DIR, 'runtime-info.json');
    const info = {
        version: PYTHON_VERSION,
        setupDate: new Date().toISOString(),
        platform: process.platform,
        arch: process.arch,
        downloadUrl: PYTHON_DOWNLOAD_URL
    };
    
    fs.writeFileSync(infoPath, JSON.stringify(info, null, 2));
    console.log('创建运行时信息文件:', infoPath);
}

// 主函数
async function main() {
    try {
        console.log('=== Python运行时设置工具 ===');
        console.log('目标目录:', PYTHON_RUNTIME_DIR);
        
        const pythonPath = await setupPythonRuntime();
        await createPythonRuntimeInfo();
        
        console.log('\n✅ Python运行时设置完成！');
        console.log('Python路径:', pythonPath);
        console.log('\n现在可以运行以下命令打包应用程序：');
        console.log('npm run build');
        
    } catch (error) {
        console.error('\n❌ 设置失败:', error.message);
        console.log('\n请手动下载Python嵌入式版本并解压到:', PYTHON_RUNTIME_DIR);
        console.log('下载地址:', PYTHON_DOWNLOAD_URL);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = {
    setupPythonRuntime,
    createPythonRuntimeInfo,
    PYTHON_RUNTIME_DIR,
    PYTHON_VERSION
};
