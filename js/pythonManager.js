/**
 * Python运行时管理模块
 * 处理Python路径检测、内嵌Python运行时和跨平台兼容性
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

class PythonManager {
    constructor() {
        this.pythonPath = null;
        this.isEmbedded = false;
        this.isPortable = false;

        // 检测是否为打包后的应用
        this.isPackaged = process.env.NODE_ENV === 'production' ||
                         (process.mainModule && process.mainModule.filename &&
                          (process.mainModule.filename.indexOf('app.asar') !== -1 ||
                           process.mainModule.filename.indexOf('resources') !== -1)) ||
                         (require.main && require.main.filename &&
                          (require.main.filename.indexOf('app.asar') !== -1 ||
                           require.main.filename.indexOf('resources') !== -1));

        this.initializePythonPath();
    }

    /**
     * 初始化Python路径
     */
    initializePythonPath() {
        console.log('初始化Python路径...');
        console.log('是否为打包应用:', this.isPackaged);

        if (this.isPackaged) {
            // 打包后的应用，尝试使用内嵌Python
            this.pythonPath = this.findEmbeddedPython();
            if (this.pythonPath) {
                this.isEmbedded = true;
                console.log('使用内嵌Python:', this.pythonPath);
                return;
            }
        }

        // 尝试系统Python
        this.pythonPath = this.findSystemPython();
        if (this.pythonPath) {
            console.log('使用系统Python:', this.pythonPath);
            return;
        }

        // 尝试便携式Python
        this.pythonPath = this.findPortablePython();
        if (this.pythonPath) {
            this.isPortable = true;
            console.log('使用便携式Python:', this.pythonPath);
            return;
        }

        console.warn('未找到可用的Python运行时');
    }

    /**
     * 查找内嵌的Python运行时
     */
    findEmbeddedPython() {
        try {
            // 获取应用程序资源目录
            const resourcesPath = process.resourcesPath || path.join(__dirname, '..');
            const embeddedPythonPaths = [
                path.join(resourcesPath, 'python-runtime', 'python.exe'),
                path.join(resourcesPath, 'python-runtime', 'Scripts', 'python.exe'),
                path.join(resourcesPath, 'app', 'python-runtime', 'python.exe'),
                path.join(__dirname, '..', 'python-runtime', 'python.exe'),
                path.join(process.cwd(), 'python-runtime', 'python.exe')
            ];

            for (const pythonPath of embeddedPythonPaths) {
                console.log('检查内嵌Python路径:', pythonPath);
                if (fs.existsSync(pythonPath)) {
                    console.log('找到内嵌Python:', pythonPath);
                    return pythonPath;
                }
            }
        } catch (error) {
            console.error('查找内嵌Python时出错:', error);
        }

        return null;
    }

    /**
     * 查找系统Python
     */
    findSystemPython() {
        const pythonCommands = ['python', 'python3', 'py'];

        for (const cmd of pythonCommands) {
            try {
                // 使用where命令(Windows)或which命令(Unix)查找Python
                const findCommand = os.platform() === 'win32' ? 'where' : 'which';
                const result = require('child_process').execSync(`${findCommand} ${cmd}`, {
                    encoding: 'utf8',
                    timeout: 5000,
                    stdio: ['pipe', 'pipe', 'pipe'] // 避免stderr干扰
                });

                const pythonPath = result.trim().split('\n')[0];
                if (pythonPath && fs.existsSync(pythonPath)) {
                    console.log(`找到系统Python (${cmd}):`, pythonPath);
                    return cmd; // 返回命令名，让系统处理路径
                }
            } catch (error) {
                // 继续尝试下一个命令
                console.log(`未找到 ${cmd}:`, error.message);
            }
        }

        // 如果命令查找失败，尝试其他方法
        console.log('命令查找失败，尝试其他Python检测方法...');

        // 首先尝试注册表查找
        const registryPath = this.findPythonFromRegistry();
        if (registryPath) {
            return registryPath;
        }

        // 然后尝试常见路径
        return this.findCommonPythonPaths();
    }

    /**
     * 从Windows注册表查找Python安装
     */
    findPythonFromRegistry() {
        if (os.platform() !== 'win32') {
            return null;
        }

        console.log('尝试从注册表查找Python...');

        try {
            const { execSync } = require('child_process');

            // 查询注册表中的Python安装信息
            const registryKeys = [
                'HKEY_LOCAL_MACHINE\\SOFTWARE\\Python',
                'HKEY_CURRENT_USER\\SOFTWARE\\Python',
                'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Python'
            ];

            for (const regKey of registryKeys) {
                try {
                    const regOutput = execSync(`reg query "${regKey}" /s`, {
                        encoding: 'utf8',
                        timeout: 10000,
                        stdio: ['pipe', 'pipe', 'pipe']
                    });

                    // 解析注册表输出查找InstallPath
                    const lines = regOutput.split('\n');
                    for (const line of lines) {
                        if (line.includes('InstallPath') && line.includes('REG_SZ')) {
                            const match = line.match(/REG_SZ\s+(.+)/);
                            if (match) {
                                const installPath = match[1].trim();
                                const pythonExe = path.join(installPath, 'python.exe');
                                if (fs.existsSync(pythonExe)) {
                                    console.log('从注册表找到Python:', pythonExe);
                                    return pythonExe;
                                }
                            }
                        }
                    }
                } catch (regError) {
                    // 忽略单个注册表键的错误，继续尝试其他键
                    continue;
                }
            }
        } catch (error) {
            console.log('注册表查找失败:', error.message);
        }

        return null;
    }

    /**
     * 动态查找所有可能的Python安装路径
     */
    findCommonPythonPaths() {
        console.log('开始动态搜索Python安装路径...');

        // 生成可能的Python版本列表（从3.6到3.15，涵盖当前和未来版本）
        const pythonVersions = [];
        for (let major = 3; major <= 3; major++) {
            for (let minor = 6; minor <= 15; minor++) {
                pythonVersions.push(`${major}${minor}`);
                pythonVersions.push(`${major}.${minor}`);
            }
        }

        const basePaths = [
            // Windows系统级安装路径
            'C:\\Python{version}\\python.exe',
            'C:\\Program Files\\Python{version}\\python.exe',
            'C:\\Program Files (x86)\\Python{version}\\python.exe',
            // 用户级安装路径
            path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Python', 'Python{version}', 'python.exe'),
            // Microsoft Store安装路径
            path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'WindowsApps', 'python{version}', 'python.exe'),
            // Anaconda路径
            path.join(os.homedir(), 'anaconda3', 'python.exe'),
            path.join(os.homedir(), 'miniconda3', 'python.exe'),
            'C:\\ProgramData\\Anaconda3\\python.exe',
            'C:\\ProgramData\\Miniconda3\\python.exe'
        ];

        // 动态生成所有可能的路径
        const allPossiblePaths = [];

        // 添加版本相关的路径
        for (const basePath of basePaths) {
            if (basePath.includes('{version}')) {
                for (const version of pythonVersions) {
                    allPossiblePaths.push(basePath.replace(/\{version\}/g, version));
                }
            } else {
                allPossiblePaths.push(basePath);
            }
        }

        // 添加一些通用路径
        allPossiblePaths.push(
            // 通用路径
            'C:\\Python\\python.exe',
            path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Python', 'python.exe'),
            // 开发环境常见路径
            'C:\\tools\\python\\python.exe',
            'D:\\Python\\python.exe'
        );

        console.log(`生成了 ${allPossiblePaths.length} 个可能的Python路径`);

        // 检查每个路径
        for (const pythonPath of allPossiblePaths) {
            try {
                if (fs.existsSync(pythonPath)) {
                    console.log('找到Python安装:', pythonPath);

                    // 验证这个Python是否可执行
                    try {
                        const { execSync } = require('child_process');
                        const versionOutput = execSync(`"${pythonPath}" --version`, {
                            encoding: 'utf8',
                            timeout: 5000,
                            stdio: ['pipe', 'pipe', 'pipe']
                        });
                        console.log(`验证Python版本: ${versionOutput.trim()}`);
                        return pythonPath;
                    } catch (versionError) {
                        console.warn(`Python路径存在但无法执行: ${pythonPath}`, versionError.message);
                        continue;
                    }
                }
            } catch (error) {
                // 忽略路径检查错误，继续下一个
                continue;
            }
        }

        console.log('未找到任何可用的Python安装');
        return null;
    }

    /**
     * 查找便携式Python
     */
    findPortablePython() {
        const portablePaths = [
            path.join(process.cwd(), 'python', 'python.exe'),
            path.join(process.cwd(), 'Python', 'python.exe'),
            path.join(os.homedir(), 'python', 'python.exe'),
            'C:\\Python39\\python.exe',
            'C:\\Python38\\python.exe',
            'C:\\Python37\\python.exe'
        ];

        for (const pythonPath of portablePaths) {
            if (fs.existsSync(pythonPath)) {
                console.log('找到便携式Python:', pythonPath);
                return pythonPath;
            }
        }

        return null;
    }

    /**
     * 测试Python是否可用
     */
    async testPython(pythonPath = null) {
        const testPath = pythonPath || this.pythonPath;
        if (!testPath) {
            return { available: false, error: 'Python路径未设置' };
        }

        return new Promise((resolve) => {
            const pythonProcess = spawn(testPath, ['--version'], {
                timeout: 10000,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let output = '';
            let errorOutput = '';

            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    const version = (output + errorOutput).trim();
                    resolve({
                        available: true,
                        version: version,
                        path: testPath,
                        isEmbedded: this.isEmbedded,
                        isPortable: this.isPortable
                    });
                } else {
                    resolve({
                        available: false,
                        error: `Python测试失败，退出代码: ${code}`,
                        output: errorOutput
                    });
                }
            });

            pythonProcess.on('error', (error) => {
                resolve({
                    available: false,
                    error: `Python启动失败: ${error.message}`,
                    code: error.code
                });
            });
        });
    }

    /**
     * 确保Python脚本可访问（处理asar打包问题）
     */
    async ensureScriptAccessible(scriptPath) {
        // 检查脚本是否在asar包中
        if (scriptPath.includes('app.asar')) {
            console.log('检测到asar打包的脚本，需要提取到临时目录');

            const tempDir = path.join(os.tmpdir(), 'video-scanner-scripts');
            const scriptName = path.basename(scriptPath);
            const tempScriptPath = path.join(tempDir, scriptName);

            try {
                // 创建临时目录
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }

                // 读取asar中的脚本内容
                const scriptContent = fs.readFileSync(scriptPath, 'utf8');

                // 写入临时文件
                fs.writeFileSync(tempScriptPath, scriptContent, 'utf8');

                console.log('Python脚本已提取到:', tempScriptPath);
                return tempScriptPath;

            } catch (error) {
                console.error('提取Python脚本失败:', error);
                throw new Error(`无法提取Python脚本: ${error.message}`);
            }
        }

        // 如果不在asar中，直接返回原路径
        return scriptPath;
    }

    /**
     * 执行Python脚本
     */
    async executePythonScript(scriptPath, args = [], options = {}) {
        if (!this.pythonPath) {
            throw new Error('Python运行时不可用');
        }

        const defaultOptions = {
            timeout: 30000,
            encoding: 'utf8',
            env: {
                ...process.env,
                PYTHONIOENCODING: 'utf-8',
                PYTHONUNBUFFERED: '1'
            }
        };

        const finalOptions = { ...defaultOptions, ...options };
        let fullArgs;

        // 如果scriptPath为空或者args的第一个参数是Python选项（如-c, --version等），直接使用args
        if (!scriptPath || (args.length > 0 && args[0].startsWith('-'))) {
            fullArgs = args;
        } else {
            // 确保脚本可访问
            const accessibleScriptPath = await this.ensureScriptAccessible(scriptPath);
            fullArgs = [accessibleScriptPath, ...args];
        }

        console.log('执行Python脚本:', this.pythonPath, fullArgs);

        return new Promise((resolve, reject) => {
            const pythonProcess = spawn(this.pythonPath, fullArgs, finalOptions);

            let output = '';
            let errorOutput = '';

            pythonProcess.stdout.on('data', (data) => {
                const chunk = data.toString(finalOptions.encoding);
                output += chunk;

                // 如果有进度回调，调用它
                if (options.onProgress) {
                    options.onProgress(chunk);
                }
            });

            pythonProcess.stderr.on('data', (data) => {
                const errorChunk = data.toString(finalOptions.encoding);
                errorOutput += errorChunk;

                // 如果有错误回调，调用它
                if (options.onError) {
                    options.onError(errorChunk);
                }
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    resolve({
                        success: true,
                        output: output,
                        errorOutput: errorOutput,
                        exitCode: code
                    });
                } else {
                    reject(new Error(`Python脚本执行失败，退出代码: ${code}\n错误输出: ${errorOutput}`));
                }
            });

            pythonProcess.on('error', (error) => {
                reject(new Error(`Python进程启动失败: ${error.message}`));
            });

            // 设置超时
            if (finalOptions.timeout) {
                setTimeout(() => {
                    pythonProcess.kill();
                    reject(new Error(`Python脚本执行超时 (${finalOptions.timeout}ms)`));
                }, finalOptions.timeout);
            }
        });
    }

    /**
     * 获取Python信息
     */
    getPythonInfo() {
        return {
            path: this.pythonPath,
            isEmbedded: this.isEmbedded,
            isPortable: this.isPortable,
            isPackaged: this.isPackaged,
            available: !!this.pythonPath
        };
    }

    /**
     * 设置自定义Python路径
     */
    setPythonPath(customPath) {
        if (fs.existsSync(customPath)) {
            this.pythonPath = customPath;
            this.isEmbedded = false;
            this.isPortable = true;
            console.log('设置自定义Python路径:', customPath);
            return true;
        }
        return false;
    }
}

module.exports = PythonManager;
