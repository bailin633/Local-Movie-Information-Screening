/**
 * 测试脚本：验证目录扫描优化和扫描深度功能
 */

const PathManager = require('./js/pathManager.js');
const fs = require('fs');
const path = require('path');

async function testPathManagerOptimizations() {
    console.log('=== PathManager 优化测试 ===\n');
    
    const pathManager = new PathManager();
    
    // 测试1: 缓存功能
    console.log('1. 测试缓存功能...');
    const testPath = 'F:\\Core_1'; // 使用当前目录进行测试
    
    if (fs.existsSync(testPath)) {
        console.log(`测试路径: ${testPath}`);
        
        // 第一次验证（应该执行实际验证）
        console.time('首次路径验证');
        const result1 = pathManager.validatePath(testPath);
        console.timeEnd('首次路径验证');
        console.log('首次验证结果:', result1);
        
        // 第二次验证（应该使用缓存）
        console.time('缓存路径验证');
        const result2 = pathManager.validatePath(testPath);
        console.timeEnd('缓存路径验证');
        console.log('缓存验证结果:', result2);
        
        console.log('缓存统计:', pathManager.getCacheStats());
    } else {
        console.log('测试路径不存在，跳过缓存测试');
    }
    
    console.log('\n2. 测试异步目录扫描...');
    
    // 测试2: 异步扫描功能
    if (fs.existsSync(testPath)) {
        try {
            console.time('异步目录扫描');
            
            const scanOptions = {
                maxDepth: 2, // 限制深度为2层
                includeHidden: false,
                extensions: ['.js', '.json'], // 测试用文件类型
                useCache: true,
                progressCallback: (progress) => {
                    if (progress.processed % 10 === 0) {
                        console.log(`进度: 已处理 ${progress.processed} 个项目，找到 ${progress.found} 个文件`);
                    }
                }
            };
            
            const scanResult = await pathManager.scanDirectoryAsync(testPath, scanOptions);
            console.timeEnd('异步目录扫描');
            
            console.log('扫描结果:');
            console.log(`- 成功: ${scanResult.success}`);
            console.log(`- 找到文件数: ${scanResult.files ? scanResult.files.length : 0}`);
            console.log(`- 总处理项目: ${scanResult.totalProcessed}`);
            console.log(`- 扫描深度: ${scanResult.scanDepth}`);
            
            if (scanResult.files && scanResult.files.length > 0) {
                console.log('前5个文件:');
                scanResult.files.slice(0, 5).forEach((file, index) => {
                    console.log(`  ${index + 1}. ${file.name} (深度: ${file.depth})`);
                });
            }
            
        } catch (error) {
            console.error('异步扫描失败:', error);
        }
    }
    
    console.log('\n3. 测试缓存清理...');
    console.log('清理前缓存统计:', pathManager.getCacheStats());
    pathManager.clearAllCache();
    console.log('清理后缓存统计:', pathManager.getCacheStats());
    
    console.log('\n=== PathManager 优化测试完成 ===');
}

async function testPythonScriptDepth() {
    console.log('\n=== Python 脚本深度测试 ===\n');
    
    const { spawn } = require('child_process');
    const pythonScriptPath = path.join(__dirname, 'py', 'video_info.py');
    const testDir = 'F:\\Core_1'; // 测试目录
    
    if (!fs.existsSync(pythonScriptPath)) {
        console.log('Python 脚本不存在，跳过测试');
        return;
    }
    
    if (!fs.existsSync(testDir)) {
        console.log('测试目录不存在，跳过测试');
        return;
    }
    
    console.log('测试 Python 脚本的深度限制功能...');
    
    return new Promise((resolve) => {
        const pythonArgs = [
            pythonScriptPath,
            testDir,
            '--max-depth=2',
            '--extensions=.js,.json,.md'
        ];
        
        console.log('执行命令:', 'python', pythonArgs.join(' '));
        
        const pythonProcess = spawn('python', pythonArgs, {
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
        });
        
        let output = '';
        let errorOutput = '';
        
        pythonProcess.stdout.on('data', (data) => {
            const chunk = data.toString('utf-8');
            output += chunk;
            console.log('Python 输出:', chunk.trim());
        });
        
        pythonProcess.stderr.on('data', (data) => {
            const errorChunk = data.toString('utf-8');
            errorOutput += errorChunk;
            console.error('Python 错误:', errorChunk.trim());
        });
        
        pythonProcess.on('close', (code) => {
            console.log(`Python 进程退出，代码: ${code}`);
            
            if (code === 0) {
                try {
                    const jsonStart = output.lastIndexOf('\n最终结果:');
                    if (jsonStart !== -1) {
                        const jsonString = output.slice(jsonStart).replace('\n最终结果:', '').trim();
                        const result = JSON.parse(jsonString);
                        
                        console.log('Python 脚本测试结果:');
                        console.log(`- 找到文件数: ${result.length}`);
                        
                        if (result.length > 0) {
                            console.log('文件深度分布:');
                            const depthCount = {};
                            result.forEach(file => {
                                const depth = file.depth || 0;
                                depthCount[depth] = (depthCount[depth] || 0) + 1;
                            });
                            
                            Object.keys(depthCount).sort().forEach(depth => {
                                console.log(`  深度 ${depth}: ${depthCount[depth]} 个文件`);
                            });
                        }
                    }
                } catch (parseError) {
                    console.error('解析 Python 输出失败:', parseError);
                }
            } else {
                console.error('Python 脚本执行失败');
            }
            
            resolve();
        });
        
        // 设置超时
        setTimeout(() => {
            pythonProcess.kill();
            console.log('Python 进程超时，已终止');
            resolve();
        }, 30000); // 30秒超时
    });
}

async function runAllTests() {
    try {
        await testPathManagerOptimizations();
        await testPythonScriptDepth();
        console.log('\n所有测试完成！');
    } catch (error) {
        console.error('测试过程中发生错误:', error);
    }
}

// 运行测试
if (require.main === module) {
    runAllTests();
}

module.exports = {
    testPathManagerOptimizations,
    testPythonScriptDepth,
    runAllTests
};
