/**
 * 应用程序构建脚本
 * 自动化构建和打包流程
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUILD_CONFIG = {
    includePythonRuntime: false, // 是否包含Python运行时
    cleanBuild: true,           // 是否清理构建目录
    createInstaller: true,      // 是否创建安装程序
    skipTests: false           // 是否跳过测试
};

function log(message) {
    console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
}

function error(message) {
    console.error(`[${new Date().toLocaleTimeString()}] ❌ ${message}`);
}

function success(message) {
    console.log(`[${new Date().toLocaleTimeString()}] ✅ ${message}`);
}

function runCommand(command, description) {
    log(`执行: ${description}`);
    try {
        execSync(command, { stdio: 'inherit' });
        success(`完成: ${description}`);
    } catch (err) {
        error(`失败: ${description}`);
        throw err;
    }
}

function checkPrerequisites() {
    log('检查构建前提条件...');
    
    // 检查Node.js版本
    const nodeVersion = process.version;
    log(`Node.js版本: ${nodeVersion}`);
    
    // 检查npm
    try {
        const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
        log(`npm版本: ${npmVersion}`);
    } catch (err) {
        throw new Error('npm未找到');
    }
    
    // 检查package.json
    if (!fs.existsSync('package.json')) {
        throw new Error('package.json未找到');
    }
    
    // 检查必要的文件
    const requiredFiles = [
        'main.js',
        'js/pythonManager.js',
        'js/pathManager.js',
        'py/video_info.py'
    ];
    
    for (const file of requiredFiles) {
        if (!fs.existsSync(file)) {
            throw new Error(`必要文件未找到: ${file}`);
        }
    }
    
    success('前提条件检查通过');
}

function cleanBuildDirectory() {
    if (!BUILD_CONFIG.cleanBuild) {
        log('跳过清理构建目录');
        return;
    }
    
    log('清理构建目录...');
    
    const dirsToClean = ['dist', 'build/temp'];
    
    for (const dir of dirsToClean) {
        if (fs.existsSync(dir)) {
            try {
                fs.rmSync(dir, { recursive: true, force: true });
                log(`清理目录: ${dir}`);
            } catch (err) {
                error(`清理目录失败 ${dir}: ${err.message}`);
            }
        }
    }
    
    success('构建目录清理完成');
}

function installDependencies() {
    log('安装依赖...');
    runCommand('npm install', '安装npm依赖');
}

function runTests() {
    if (BUILD_CONFIG.skipTests) {
        log('跳过测试');
        return;
    }
    
    log('运行测试...');
    
    try {
        // 运行优化测试
        runCommand('node test-optimizations.js', '运行优化测试');
        
        // 测试Python管理器
        runCommand('node -e "const PM = require(\'./js/pythonManager.js\'); const pm = new PM(); pm.testPython().then(r => console.log(\'Python测试:\', r.available ? \'通过\' : \'失败\'));"', '测试Python管理器');
        
        success('所有测试通过');
    } catch (err) {
        error('测试失败');
        throw err;
    }
}

function setupPythonRuntime() {
    if (!BUILD_CONFIG.includePythonRuntime) {
        log('跳过Python运行时设置');
        return;
    }
    
    log('设置Python运行时...');
    
    try {
        runCommand('node setup-python-runtime.js', '设置Python运行时');
        success('Python运行时设置完成');
    } catch (err) {
        error('Python运行时设置失败');
        log('继续构建，但应用程序将依赖系统Python');
    }
}

function buildApplication() {
    log('构建应用程序...');
    
    try {
        runCommand('npm run build', '构建Electron应用程序');
        success('应用程序构建完成');
        
        // 检查构建结果
        if (fs.existsSync('dist')) {
            const distFiles = fs.readdirSync('dist');
            log(`构建输出文件: ${distFiles.join(', ')}`);
            
            // 查找安装程序
            const installerFiles = distFiles.filter(file => 
                file.endsWith('.exe') && file.includes('Setup')
            );
            
            if (installerFiles.length > 0) {
                success(`安装程序已创建: ${installerFiles.join(', ')}`);
            }
        }
        
    } catch (err) {
        error('应用程序构建失败');
        throw err;
    }
}

function generateBuildReport() {
    log('生成构建报告...');
    
    const report = {
        buildTime: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        config: BUILD_CONFIG,
        files: []
    };
    
    if (fs.existsSync('dist')) {
        const distFiles = fs.readdirSync('dist');
        report.files = distFiles.map(file => {
            const filePath = path.join('dist', file);
            const stats = fs.statSync(filePath);
            return {
                name: file,
                size: stats.size,
                created: stats.birthtime
            };
        });
    }
    
    const reportPath = path.join('dist', 'build-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    success(`构建报告已生成: ${reportPath}`);
}

async function main() {
    try {
        console.log('=== Video Scanner 应用程序构建工具 ===\n');
        
        log('开始构建流程...');
        
        // 1. 检查前提条件
        checkPrerequisites();
        
        // 2. 清理构建目录
        cleanBuildDirectory();
        
        // 3. 安装依赖
        installDependencies();
        
        // 4. 运行测试
        runTests();
        
        // 5. 设置Python运行时（可选）
        setupPythonRuntime();
        
        // 6. 构建应用程序
        buildApplication();
        
        // 7. 生成构建报告
        generateBuildReport();
        
        console.log('\n🎉 构建完成！');
        console.log('\n📦 构建输出位置: ./dist/');
        console.log('📋 构建报告: ./dist/build-report.json');
        
        if (BUILD_CONFIG.includePythonRuntime) {
            console.log('🐍 Python运行时已包含，应用程序可在无Python环境中运行');
        } else {
            console.log('⚠️  应用程序需要系统安装Python才能正常工作');
        }
        
        console.log('\n✨ 安装程序特性:');
        console.log('  • 用户可自定义安装位置');
        console.log('  • 智能Python运行时检测');
        console.log('  • 完整的卸载支持');
        console.log('  • 桌面和开始菜单快捷方式');
        
    } catch (err) {
        console.error('\n💥 构建失败:', err.message);
        process.exit(1);
    }
}

// 解析命令行参数
if (process.argv.includes('--with-python')) {
    BUILD_CONFIG.includePythonRuntime = true;
}

if (process.argv.includes('--skip-tests')) {
    BUILD_CONFIG.skipTests = true;
}

if (process.argv.includes('--no-clean')) {
    BUILD_CONFIG.cleanBuild = false;
}

// 运行构建
if (require.main === module) {
    main();
}

module.exports = {
    BUILD_CONFIG,
    main,
    checkPrerequisites,
    buildApplication
};
