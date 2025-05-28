/**
 * 测试Python脚本路径检测
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function testPythonScriptPath() {
    console.log('=== Python脚本路径测试 ===\n');
    
    // 模拟不同的环境
    const environments = [
        { name: '开发环境', isPackaged: false },
        { name: '打包环境', isPackaged: true }
    ];
    
    environments.forEach(env => {
        console.log(`${env.name}:`);
        
        let pythonScriptPath;
        
        if (env.isPackaged) {
            // 模拟打包后的路径
            const mockResourcesPath = 'C:\\Users\\Administrator\\AppData\\Local\\Programs\\Video Scanner\\resources';
            pythonScriptPath = path.join(mockResourcesPath, 'py', 'video_info.py');
        } else {
            // 开发环境路径
            pythonScriptPath = path.join(__dirname, 'py', 'video_info.py');
        }
        
        console.log(`  预期路径: ${pythonScriptPath}`);
        console.log(`  文件存在: ${fs.existsSync(pythonScriptPath) ? '✅' : '❌'}`);
        
        if (fs.existsSync(pythonScriptPath)) {
            const stats = fs.statSync(pythonScriptPath);
            console.log(`  文件大小: ${stats.size} bytes`);
            console.log(`  修改时间: ${stats.mtime.toLocaleString()}`);
        }
        
        console.log('');
    });
    
    // 检查当前实际路径
    console.log('当前实际情况:');
    console.log(`  __dirname: ${__dirname}`);
    console.log(`  process.cwd(): ${process.cwd()}`);
    console.log(`  process.resourcesPath: ${process.resourcesPath || '未定义'}`);
    
    // 检查py目录
    const pyDir = path.join(__dirname, 'py');
    console.log(`  py目录: ${pyDir}`);
    console.log(`  py目录存在: ${fs.existsSync(pyDir) ? '✅' : '❌'}`);
    
    if (fs.existsSync(pyDir)) {
        const files = fs.readdirSync(pyDir);
        console.log(`  py目录内容: ${files.join(', ')}`);
    }
    
    console.log('\n=== 测试完成 ===');
}

// 如果直接运行此脚本
if (require.main === module) {
    testPythonScriptPath();
}

module.exports = { testPythonScriptPath };
