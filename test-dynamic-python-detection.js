/**
 * 测试动态Python检测功能
 */

const PythonManager = require('./js/pythonManager.js');

async function testDynamicPythonDetection() {
    console.log('=== 动态Python检测测试 ===\n');
    
    const pythonManager = new PythonManager();
    
    console.log('1. 测试Python信息获取:');
    const pythonInfo = pythonManager.getPythonInfo();
    console.log('   Python可用:', pythonInfo.available);
    console.log('   Python路径:', pythonInfo.path);
    console.log('   Python版本:', pythonInfo.version);
    console.log('   是否打包:', pythonInfo.isPackaged);
    console.log('   是否内嵌:', pythonInfo.isEmbedded);
    console.log('   是否便携:', pythonInfo.isPortable);
    console.log('');
    
    console.log('2. 测试Python可用性:');
    try {
        const testResult = await pythonManager.testPython();
        console.log('   测试结果:', testResult);
    } catch (error) {
        console.log('   测试失败:', error.message);
    }
    console.log('');
    
    console.log('3. 测试简单Python脚本执行:');
    try {
        const result = await pythonManager.executePythonScript('', ['-c', 'print("Hello from Python!")'], {
            timeout: 5000
        });
        console.log('   执行成功:', result.output.trim());
    } catch (error) {
        console.log('   执行失败:', error.message);
    }
    console.log('');
    
    console.log('4. 测试Python版本获取:');
    try {
        const result = await pythonManager.executePythonScript('', ['--version'], {
            timeout: 5000
        });
        console.log('   版本信息:', result.output.trim() || result.error.trim());
    } catch (error) {
        console.log('   版本获取失败:', error.message);
    }
    console.log('');
    
    console.log('=== 测试完成 ===');
}

// 如果直接运行此脚本
if (require.main === module) {
    testDynamicPythonDetection().catch(console.error);
}

module.exports = { testDynamicPythonDetection };
