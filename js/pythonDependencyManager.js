/**
 * Python依赖库管理模块
 * 检测和安装Python运行库
 */

const { spawn } = require('child_process');
const os = require('os');

class PythonDependencyManager {
    constructor(pythonManager) {
        this.pythonManager = pythonManager;
        
        // 定义应用程序需要的Python库
        this.requiredPackages = [
            {
                name: 'opencv-python',
                importName: 'cv2',
                description: '视频处理库 (OpenCV)',
                installCommand: 'opencv-python',
                essential: true
            },
            {
                name: 'pillow',
                importName: 'PIL',
                description: '图像处理库 (Pillow)',
                installCommand: 'pillow',
                essential: false
            },
            {
                name: 'numpy',
                importName: 'numpy',
                description: '数值计算库 (NumPy)',
                installCommand: 'numpy',
                essential: false
            }
        ];
    }

    /**
     * 检测所有必需的Python库
     */
    async checkAllDependencies() {
        console.log('开始检测Python依赖库...');
        
        if (!this.pythonManager.getPythonInfo().available) {
            return {
                success: false,
                error: 'Python运行时不可用',
                packages: []
            };
        }

        const results = [];
        
        for (const pkg of this.requiredPackages) {
            try {
                const isInstalled = await this.checkSinglePackage(pkg);
                results.push({
                    ...pkg,
                    installed: isInstalled,
                    status: isInstalled ? 'installed' : 'missing'
                });
            } catch (error) {
                results.push({
                    ...pkg,
                    installed: false,
                    status: 'error',
                    error: error.message
                });
            }
        }

        const missingEssential = results.filter(r => !r.installed && r.essential);
        const missingOptional = results.filter(r => !r.installed && !r.essential);
        
        return {
            success: true,
            packages: results,
            missingEssential: missingEssential.length,
            missingOptional: missingOptional.length,
            allInstalled: results.every(r => r.installed)
        };
    }

    /**
     * 检测单个Python库是否安装
     */
    async checkSinglePackage(pkg) {
        try {
            const result = await this.pythonManager.executePythonScript('', [
                '-c', 
                `import ${pkg.importName}; print("${pkg.importName} is available")`
            ], {
                timeout: 10000
            });
            
            return result.output.includes(`${pkg.importName} is available`);
        } catch (error) {
            console.log(`检测 ${pkg.name} 失败:`, error.message);
            return false;
        }
    }

    /**
     * 安装单个Python库
     */
    async installSinglePackage(pkg, onProgress = null) {
        console.log(`开始安装 ${pkg.name}...`);
        
        if (!this.pythonManager.getPythonInfo().available) {
            throw new Error('Python运行时不可用');
        }

        const pythonPath = this.pythonManager.pythonPath;
        
        // 尝试不同的pip命令
        const pipCommands = ['pip', 'pip3', 'python -m pip', 'py -m pip'];
        
        for (const pipCmd of pipCommands) {
            try {
                const args = pipCmd.split(' ').concat(['install', pkg.installCommand, '--user']);
                const command = args[0];
                const cmdArgs = args.slice(1);
                
                console.log(`尝试安装命令: ${command} ${cmdArgs.join(' ')}`);
                
                const result = await this.executeInstallCommand(command, cmdArgs, onProgress);
                
                // 验证安装是否成功
                const isInstalled = await this.checkSinglePackage(pkg);
                if (isInstalled) {
                    console.log(`${pkg.name} 安装成功`);
                    return {
                        success: true,
                        message: `${pkg.name} 安装成功`,
                        output: result.output
                    };
                }
            } catch (error) {
                console.log(`安装命令 ${pipCmd} 失败:`, error.message);
                continue;
            }
        }
        
        throw new Error(`所有安装方法都失败了`);
    }

    /**
     * 执行安装命令
     */
    async executeInstallCommand(command, args, onProgress = null) {
        return new Promise((resolve, reject) => {
            const process = spawn(command, args, {
                env: {
                    ...process.env,
                    PYTHONIOENCODING: 'utf-8',
                    PYTHONUNBUFFERED: '1'
                }
            });

            let output = '';
            let errorOutput = '';

            process.stdout.on('data', (data) => {
                const chunk = data.toString();
                output += chunk;
                console.log('安装输出:', chunk);
                
                if (onProgress) {
                    onProgress({
                        type: 'stdout',
                        data: chunk
                    });
                }
            });

            process.stderr.on('data', (data) => {
                const chunk = data.toString();
                errorOutput += chunk;
                console.log('安装错误:', chunk);
                
                if (onProgress) {
                    onProgress({
                        type: 'stderr',
                        data: chunk
                    });
                }
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve({
                        success: true,
                        output: output,
                        error: errorOutput
                    });
                } else {
                    reject(new Error(`安装失败，退出代码: ${code}\n错误输出: ${errorOutput}`));
                }
            });

            process.on('error', (error) => {
                reject(new Error(`进程启动失败: ${error.message}`));
            });
        });
    }

    /**
     * 批量安装所有缺失的库
     */
    async installAllMissing(onProgress = null) {
        console.log('开始批量安装缺失的Python库...');
        
        const checkResult = await this.checkAllDependencies();
        if (!checkResult.success) {
            throw new Error(checkResult.error);
        }

        const missingPackages = checkResult.packages.filter(p => !p.installed);
        if (missingPackages.length === 0) {
            return {
                success: true,
                message: '所有依赖库都已安装',
                installed: [],
                failed: []
            };
        }

        const installed = [];
        const failed = [];

        for (const pkg of missingPackages) {
            try {
                if (onProgress) {
                    onProgress({
                        type: 'status',
                        message: `正在安装 ${pkg.name}...`,
                        current: installed.length + failed.length + 1,
                        total: missingPackages.length
                    });
                }

                const result = await this.installSinglePackage(pkg, onProgress);
                installed.push({
                    package: pkg,
                    result: result
                });
            } catch (error) {
                console.error(`安装 ${pkg.name} 失败:`, error);
                failed.push({
                    package: pkg,
                    error: error.message
                });
            }
        }

        return {
            success: failed.length === 0,
            message: `安装完成: ${installed.length} 成功, ${failed.length} 失败`,
            installed: installed,
            failed: failed
        };
    }

    /**
     * 获取安装建议
     */
    getInstallationSuggestions() {
        return {
            beforeInstall: [
                '确保网络连接正常',
                '建议使用管理员权限运行应用程序',
                '安装过程可能需要几分钟时间',
                '请耐心等待，不要关闭应用程序'
            ],
            troubleshooting: [
                '如果安装失败，请检查网络连接',
                '尝试手动安装：pip install opencv-python',
                '考虑使用国内镜像：pip install -i https://pypi.tuna.tsinghua.edu.cn/simple opencv-python',
                '如果仍有问题，请联系技术支持'
            ],
            manualInstall: [
                '打开命令提示符（管理员权限）',
                '运行：pip install opencv-python',
                '运行：pip install pillow',
                '运行：pip install numpy',
                '重启应用程序'
            ]
        };
    }
}

module.exports = PythonDependencyManager;
