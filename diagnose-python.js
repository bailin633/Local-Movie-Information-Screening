/**
 * Python诊断工具
 * 用于诊断Python检测问题
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const os = require('os');

async function diagnosePython() {
    console.log('=== Python环境诊断工具 ===\n');

    // 1. 系统信息
    console.log('1. 系统信息:');
    console.log(`   操作系统: ${os.platform()} ${os.release()}`);
    console.log(`   架构: ${os.arch()}`);
    console.log(`   Node.js版本: ${process.version}`);
    console.log(`   当前工作目录: ${process.cwd()}`);
    console.log(`   应用程序路径: ${process.execPath}`);
    console.log(`   资源路径: ${process.resourcesPath || '未定义'}`);
    console.log(`   主模块: ${require.main ? require.main.filename : '未定义'}`);
    console.log('');

    // 2. 环境变量检查
    console.log('2. 环境变量检查:');
    console.log(`   PATH: ${process.env.PATH ? '已设置' : '未设置'}`);
    console.log(`   PYTHONPATH: ${process.env.PYTHONPATH || '未设置'}`);
    console.log(`   PYTHON: ${process.env.PYTHON || '未设置'}`);
    console.log('');

    // 3. Python命令检测
    console.log('3. Python命令检测:');
    const pythonCommands = ['python', 'python3', 'py'];

    for (const cmd of pythonCommands) {
        try {
            const findCommand = os.platform() === 'win32' ? 'where' : 'which';
            const result = execSync(`${findCommand} ${cmd}`, {
                encoding: 'utf8',
                timeout: 5000,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            const pythonPath = result.trim().split('\n')[0];
            console.log(`   ✅ ${cmd}: ${pythonPath}`);

            // 测试版本
            try {
                const versionResult = execSync(`${cmd} --version`, {
                    encoding: 'utf8',
                    timeout: 5000,
                    stdio: ['pipe', 'pipe', 'pipe']
                });
                console.log(`      版本: ${versionResult.trim()}`);
            } catch (versionError) {
                console.log(`      版本检测失败: ${versionError.message}`);
            }

        } catch (error) {
            console.log(`   ❌ ${cmd}: 未找到 (${error.message})`);
        }
    }
    console.log('');

    // 4. 常见Python安装路径检查
    console.log('4. 常见Python安装路径检查:');
    const commonPaths = [
        'C:\\Python39\\python.exe',
        'C:\\Python38\\python.exe',
        'C:\\Python37\\python.exe',
        'C:\\Python310\\python.exe',
        'C:\\Python311\\python.exe',
        'C:\\Python312\\python.exe',
        'C:\\Users\\Administrator\\AppData\\Local\\Programs\\Python\\Python39\\python.exe',
        'C:\\Users\\Administrator\\AppData\\Local\\Programs\\Python\\Python310\\python.exe',
        'C:\\Users\\Administrator\\AppData\\Local\\Programs\\Python\\Python311\\python.exe',
        'C:\\Users\\Administrator\\AppData\\Local\\Programs\\Python\\Python312\\python.exe',
        'C:\\Program Files\\Python39\\python.exe',
        'C:\\Program Files\\Python310\\python.exe',
        'C:\\Program Files\\Python311\\python.exe',
        'C:\\Program Files\\Python312\\python.exe'
    ];

    for (const pythonPath of commonPaths) {
        if (fs.existsSync(pythonPath)) {
            console.log(`   ✅ 找到: ${pythonPath}`);

            // 测试这个Python
            try {
                const versionResult = execSync(`"${pythonPath}" --version`, {
                    encoding: 'utf8',
                    timeout: 5000
                });
                console.log(`      版本: ${versionResult.trim()}`);
            } catch (versionError) {
                console.log(`      版本检测失败: ${versionError.message}`);
            }
        }
    }
    console.log('');

    // 5. PythonManager测试
    console.log('5. PythonManager测试:');
    try {
        const PythonManager = require('./js/pythonManager.js');
        const pm = new PythonManager();

        console.log(`   检测到的Python路径: ${pm.pythonPath || '未检测到'}`);
        console.log(`   是否为打包应用: ${pm.isPackaged}`);
        console.log(`   是否为内嵌Python: ${pm.isEmbedded}`);
        console.log(`   是否为便携式Python: ${pm.isPortable}`);

        const testResult = await pm.testPython();
        console.log(`   Python可用性测试: ${testResult.available ? '✅ 通过' : '❌ 失败'}`);
        if (testResult.available) {
            console.log(`   版本: ${testResult.version}`);
            console.log(`   路径: ${testResult.path}`);
        } else {
            console.log(`   错误: ${testResult.error}`);
        }

    } catch (pmError) {
        console.log(`   ❌ PythonManager测试失败: ${pmError.message}`);
    }
    console.log('');

    // 6. 建议
    console.log('6. 建议和解决方案:');
    console.log('   如果Python未被检测到，请尝试:');
    console.log('   1. 确认Python已正确安装');
    console.log('   2. 将Python添加到系统PATH环境变量');
    console.log('   3. 重启应用程序');
    console.log('   4. 使用完整路径手动设置Python');
    console.log('');

    console.log('=== 诊断完成 ===');
}

// 如果直接运行此脚本
if (require.main === module) {
    diagnosePython().catch(console.error);
}

module.exports = { diagnosePython };
