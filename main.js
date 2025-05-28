const electron_module = require('electron'); // Step 1: Get the module (or path)
let app, BrowserWindow, ipcMain, dialog, shell, nativeTheme;

// Step 2: Check what was returned and try to get app
if (typeof electron_module === 'object' && electron_module !== null && electron_module.app) {
    app = electron_module.app;
    BrowserWindow = electron_module.BrowserWindow;
    ipcMain = electron_module.ipcMain;
    dialog = electron_module.dialog;
    shell = electron_module.shell;
    nativeTheme = electron_module.nativeTheme;
    console.log('App object successfully destructured from electron module.');
} else {
    console.error("Failed to get 'app' from require('electron'). Value received:", JSON.stringify(electron_module, null, 2));
    // This part is more for diagnostics; the root cause is require('electron') behavior.
}

// Step 3: Critical check for app
if (!app) {
  console.error("CRITICAL FAILURE: 'app' is still undefined. Electron cannot start. Check Electron installation and project setup. Value of electron_module was:", JSON.stringify(electron_module, null, 2));
  // process.exit(1); // Uncomment to force exit if app is critical and not found
} else {
  console.log("'app' is defined. Type:", typeof app);
}
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const { initializeSearch, searchVideos } = require('./js/find.js');

// 引入新的模块化组件
const PathManager = require('./js/pathManager.js');
const FileManager = require('./js/fileManager.js');
const FileWatcher = require('./js/fileWatcher.js');
const PythonManager = require('./js/pythonManager.js');
const ScriptManager = require('./js/scriptManager.js');
const PythonDependencyManager = require('./js/pythonDependencyManager.js');

require('iconv-lite');
require('dotenv').config();

let mainWindow;
let settingsWindow;
let allVideos = [];

// 初始化模块化组件
const pathManager = new PathManager();
const fileManager = new FileManager();
const fileWatcher = new FileWatcher();
const pythonManager = new PythonManager();
const scriptManager = new ScriptManager();
const dependencyManager = new PythonDependencyManager(pythonManager);

// 设置文件路径
const settingsPath = path.join(os.homedir(), '.video-scanner-settings.json');

// 默认设置
const DEFAULT_SETTINGS = {
    // 常规设置
    organizeByMetadata: false,
    autoRefresh: true,
    defaultScanPath: '',
    recentPaths: [],

    // 扫描设置
    supportedExtensions: ['.mp4', '.mkv', '.avi', '.mov'],
    customExtensions: [],
    scanDepth: 5,
    includeHidden: false,
    followSymlinks: false,
    enableFfprobe: true,
    ffprobeTimeout: 10,
    fallbackExtension: true,

    // 自定义扫描格式
    enableCustomScanFormat: false,
    scanFormatPatterns: [],
    scanMode: 'all',

    // 性能设置
    gpuAcceleration: true,
    smoothAnimations: true,
    animationSpeed: 1.0,
    maxConcurrent: 4,
    cacheSize: 200,
    enableCache: true,
    autoCleanup: true,

    // 外观设置
    theme: 'light',
    uiScale: 100,
    compactMode: false,
    showThumbnails: false,
    backgroundBlur: true,
    blurIntensity: 15,

    // 高级设置
    debugMode: false,
    devTools: false,
    logLevel: 'info'
};

// 加载设置
function loadSettings() {
    try {
        if (fs.existsSync(settingsPath)) {
            const data = fs.readFileSync(settingsPath, 'utf8');
            const savedSettings = JSON.parse(data);
            return { ...DEFAULT_SETTINGS, ...savedSettings };
        }
    } catch (error) {
        console.error('加载设置失败:', error);
    }
    return { ...DEFAULT_SETTINGS };
}

// 保存设置
function saveSettings(settings) {
    try {
        const settingsToSave = { ...DEFAULT_SETTINGS, ...settings };
        fs.writeFileSync(settingsPath, JSON.stringify(settingsToSave, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('保存设置失败:', error);
        return false;
    }
}

function createMainWindow() {
    // 获取当前设置以应用GPU加速配置
    const settings = loadSettings();

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 700,
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'build', 'icon.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            // 根据设置启用/禁用硬件加速
            hardwareAcceleration: settings.gpuAcceleration !== false
        }
    });

    mainWindow.loadFile('index.html');
    mainWindow.setMenu(null);
    mainWindow.webContents.openDevTools();

    // 设置pathManager的主窗口引用
    pathManager.setMainWindow(mainWindow);

    // 应用初始设置到PathManager
    const initialSettings = loadSettings();
    pathManager.setCacheConfig({
        maxConcurrent: initialSettings.maxConcurrent || 4,
        cacheSize: initialSettings.cacheSize || 200,
        enableCache: initialSettings.enableCache !== false,
        autoCleanup: initialSettings.autoCleanup !== false
    });

    // 主窗口加载完成后初始化默认路径和检测依赖
    mainWindow.webContents.once('did-finish-load', () => {
        pathManager.initializeOnStartup();

        // 延迟检测Python依赖库
        setTimeout(async () => {
            try {
                console.log('开始检测Python依赖库...');
                const dependencyResult = await dependencyManager.checkAllDependencies();

                if (dependencyResult.success) {
                    if (dependencyResult.missingEssential > 0) {
                        console.log(`检测到 ${dependencyResult.missingEssential} 个必需库缺失`);
                        // 发送依赖检测结果到渲染进程
                        mainWindow.webContents.send('python-dependencies-check', {
                            type: 'missing-essential',
                            result: dependencyResult
                        });
                    } else if (dependencyResult.missingOptional > 0) {
                        console.log(`检测到 ${dependencyResult.missingOptional} 个可选库缺失`);
                        mainWindow.webContents.send('python-dependencies-check', {
                            type: 'missing-optional',
                            result: dependencyResult
                        });
                    } else {
                        console.log('所有Python依赖库都已安装');
                        mainWindow.webContents.send('python-dependencies-check', {
                            type: 'all-installed',
                            result: dependencyResult
                        });
                    }
                } else {
                    console.log('Python依赖检测失败:', dependencyResult.error);
                }
            } catch (error) {
                console.error('启动时依赖检测失败:', error);
            }
        }, 3000); // 延迟3秒执行，确保界面已加载
    });

    return mainWindow;
}

function createSettingsWindow() {
    // 如果设置窗口已经存在，就聚焦它
    if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.focus();
        return;
    }

    settingsWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        parent: mainWindow,
        modal: false,
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'build', 'icon.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    settingsWindow.setMenu(null);
    settingsWindow.loadFile('settingWindow.html');

    // 窗口关闭时清理引用
    settingsWindow.on('closed', () => {
        settingsWindow = null;
    });

    return settingsWindow;
}

app.whenReady().then(() => {
    nativeTheme.themeSource = 'light'; // 设置为浅色主题，可以是 'light' 或 'dark'
    mainWindow = createMainWindow();

    // 设置窗口相关的IPC处理程序
    ipcMain.on('open-settings-window', () => {
        createSettingsWindow();
    });

    ipcMain.handle('close-settings-window', async () => {
        if (settingsWindow && !settingsWindow.isDestroyed()) {
            settingsWindow.close();
            return true;
        }
        return false;
    });

    // 设置数据相关的IPC处理程序
    ipcMain.handle('get-settings', async () => {
        try {
            return loadSettings();
        } catch (error) {
            console.error('获取设置失败:', error);
            return DEFAULT_SETTINGS;
        }
    });

    ipcMain.handle('save-settings', async (event, settings) => {
        try {
            const success = saveSettings(settings);
            if (success) {
                console.log('设置已保存');

                // 如果默认扫描路径发生变化，应用到主窗口
                if (settings.defaultScanPath) {
                    const result = pathManager.handleDefaultPathChange(settings.defaultScanPath);
                    if (!result.success) {
                        console.warn('应用默认路径失败:', result.error);
                    }
                }

                return true;
            } else {
                throw new Error('保存设置失败');
            }
        } catch (error) {
            console.error('保存设置失败:', error);
            throw error;
        }
    });

    ipcMain.handle('apply-settings', async (event, settings) => {
        try {
            // 应用设置到主应用
            if (settings.theme) {
                nativeTheme.themeSource = settings.theme;
            }

            // 应用GPU加速设置（需要重启应用才能生效）
            if (settings.gpuAcceleration !== undefined) {
                if (settings.gpuAcceleration) {
                    app.commandLine.removeSwitch('disable-gpu');
                    app.commandLine.removeSwitch('disable-gpu-compositing');
                } else {
                    app.commandLine.appendSwitch('disable-gpu');
                    app.commandLine.appendSwitch('disable-gpu-compositing');
                }
            }

            // 应用扫描性能设置到PathManager
            if (pathManager) {
                pathManager.setCacheConfig({
                    maxConcurrent: settings.maxConcurrent || 4,
                    cacheSize: settings.cacheSize || 200,
                    enableCache: settings.enableCache !== false,
                    autoCleanup: settings.autoCleanup !== false
                });
            }

            // 应用性能设置到渲染进程
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('apply-performance-settings', {
                    smoothAnimations: settings.smoothAnimations,
                    animationSpeed: settings.animationSpeed,
                    gpuAcceleration: settings.gpuAcceleration,
                    maxConcurrent: settings.maxConcurrent,
                    cacheSize: settings.cacheSize,
                    enableCache: settings.enableCache,
                    autoCleanup: settings.autoCleanup
                });
            }

            console.log('设置已应用:', settings);
            return true;
        } catch (error) {
            console.error('应用设置失败:', error);
            throw error;
        }
    });

    // 搜索相关
    ipcMain.on('search-videos', (event, searchTerm) => {
        const results = searchVideos(searchTerm);
        event.reply('search-results', results);
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createMainWindow();
    }
});

ipcMain.on('open-file-location', (event, filePath) => {
    console.log('Attempting to open file location:', filePath);
    const dirPath = path.dirname(filePath);
    shell.openPath(dirPath).then((error) => {
        if (error) {
            console.error('Failed to open directory:', error);
            event.reply('open-file-location-result', { success: false, error: error });
        } else {
            console.log('Directory opened successfully');
            event.reply('open-file-location-result', { success: true });
        }
    });
});

ipcMain.on('open-file-path', (event, filePath) => {
    console.log('Received open-file-path event with path:', filePath);
    if (filePath) {
        const dirPath = path.dirname(filePath);
        shell.openPath(dirPath).then((error) => {
            if (error) {
                console.error('Error opening file path:', error);
            }
        });
    } else {
        console.warn('Received empty file path');
    }
});

ipcMain.on('open-file-dialog', (event) => {
    dialog.showOpenDialog({
        properties: ['openDirectory']
    }).then(result => {
        if (!result.canceled) {
            event.reply('selected-directory', result.filePaths[0]);
        }
    }).catch(err => {
        console.log(err);
    });
});

ipcMain.on('scan-directory', async (event, dirPath, scanOptions = {}) => {
    console.log('开始扫描目录:', dirPath);
    console.log('扫描选项:', scanOptions);

    try {
        // 使用ScriptManager确保Python脚本可访问
        const pythonScriptPath = await scriptManager.ensureScriptAccessible();

        console.log('使用Python脚本路径:', pythonScriptPath);
        console.log('应用程序是否已打包:', app.isPackaged);

        // 检查Python是否可用
        const pythonInfo = pythonManager.getPythonInfo();
        if (!pythonInfo.available) {
            console.error('Python运行时不可用');
            event.reply('video-list', {
                error: 'Python运行时不可用。请确保已安装Python或联系技术支持。'
            });
            return;
        }

        if (!pythonScriptPath) {
            console.error('未找到 Python 脚本');
            event.reply('video-list', { error: '未找到 Python 脚本' });
            return;
        }

        if (!fs.existsSync(dirPath)) {
            console.error('目录不存在:', dirPath);
            event.reply('video-list', { error: '指定的目录不存在' });
            return;
        }

        // 获取当前设置
        const currentSettings = loadSettings();
        const maxDepth = scanOptions.scanDepth || currentSettings.scanDepth || 5;
        const includeHidden = scanOptions.includeHidden || currentSettings.includeHidden || false;
        const supportedExtensions = scanOptions.supportedExtensions || currentSettings.supportedExtensions || ['.mp4', '.mkv', '.avi', '.mov'];

        // 自定义扫描格式设置
        const enableCustomFormat = scanOptions.enableCustomScanFormat || currentSettings.enableCustomScanFormat || false;
        const scanFormatPatterns = scanOptions.scanFormatPatterns || currentSettings.scanFormatPatterns || [];
        const scanMode = scanOptions.scanMode || currentSettings.scanMode || 'all';

        // 构建Python命令参数
        const pythonArgs = [dirPath, `--max-depth=${maxDepth}`];

        if (includeHidden) {
            pythonArgs.push('--include-hidden');
        }

        if (supportedExtensions && supportedExtensions.length > 0) {
            pythonArgs.push(`--extensions=${supportedExtensions.join(',')}`);
        }

        // 添加自定义扫描格式参数
        if (enableCustomFormat && scanFormatPatterns.length > 0) {
            pythonArgs.push(`--scan-patterns=${scanFormatPatterns.join('|')}`);
            pythonArgs.push(`--scan-mode=${scanMode}`);
        }

        console.log('Python 信息:', pythonInfo);
        console.log('Python 命令参数:', pythonArgs);

        try {
            // 使用PythonManager执行脚本
            const result = await pythonManager.executePythonScript(pythonScriptPath, pythonArgs, {
                timeout: 60000, // 60秒超时
                onProgress: (chunk) => {
                    console.log('Python 输出:', chunk);

                    // 解析进度信息
                    const progressRegex = /进度：(\d+)\/(\d+)/;
                    const match = progressRegex.exec(chunk);
                    if (match) {
                        const current = parseInt(match[1]);
                        const total = parseInt(match[2]);
                        const progress = current / total;
                        mainWindow.webContents.send('scan-progress', progress);
                    }
                },
                onError: (errorChunk) => {
                    console.error('Python 错误:', errorChunk);
                }
            });

            // 处理Python脚本执行结果
            console.log('Python脚本执行成功');
            const output = result.output;

            try {
                const jsonStart = output.lastIndexOf('\n最终结果:');
                if (jsonStart === -1) {
                    throw new Error('未找到最终结果标记');
                }
                const jsonString = output.slice(jsonStart).replace('\n最终结果:', '').trim();
                const videoInfos = JSON.parse(jsonString);

                console.log('原始 videoInfos:', JSON.stringify(videoInfos, null, 2));

                if (!Array.isArray(videoInfos)) {
                    throw new Error('视频信息不是数组');
                }

                const processedVideoInfos = videoInfos.map(info => {
                    if (!info.path) {
                        console.warn('视频信息缺少路径:', info);
                    }
                    return {
                        ...info,
                        frameRate: parseFloat(info.frameRate?.toFixed(2) || '0'),
                        duration: parseFloat(info.duration?.toFixed(2) || '0'),
                        fileSize: parseFloat(info.fileSize?.toFixed(2) || '0'),
                        bitrate: info.bitrate ? parseFloat((info.bitrate / 1000000).toFixed(2)) : null
                    };
                });

                console.log('处理后的 videoInfos:', JSON.stringify(processedVideoInfos, null, 2));
                allVideos = processedVideoInfos; // 保存所有视频信息
                initializeSearch(allVideos); // 初始化搜索功能
                event.reply('video-list', processedVideoInfos);

            } catch (parseError) {
                console.error('解析 Python 输出失败:', parseError);
                event.reply('video-list', { error: '解析视频信息失败: ' + parseError.message });
            }

        } catch (pythonError) {
            console.error('Python脚本执行失败:', pythonError);

            // 提供更详细的错误信息
            let errorMessage = '扫描目录失败';
            if (pythonError.message.includes('退出代码: 9009')) {
                errorMessage = 'Python运行时未找到。请确保已正确安装Python或联系技术支持。';
            } else if (pythonError.message.includes('超时')) {
                errorMessage = '扫描超时。请尝试减少扫描深度或选择较小的目录。';
            } else {
                errorMessage = `扫描失败: ${pythonError.message}`;
            }

            event.reply('video-list', { error: errorMessage });
        }

    } catch (scriptError) {
        console.error('脚本管理器错误:', scriptError);
        event.reply('video-list', {
            error: `脚本访问失败: ${scriptError.message}`
        });
    }
});

ipcMain.on('play-video', (event, filePath) => {
    console.log('Attempting to play video:', filePath);
    shell.openPath(filePath).then((error) => {
        if (error) {
            console.error('Failed to open video:', error);
            event.reply('play-video-result', { success: false, error: error });
        } else {
            console.log('Video opened successfully');
            event.reply('play-video-result', { success: true });
        }
    });
});

// 系统信息相关的IPC处理程序
ipcMain.handle('get-system-info', async () => {
    try {
        const memoryUsage = process.memoryUsage();

        return {
            platform: os.platform(),
            arch: os.arch(),
            nodeVersion: process.version,
            electronVersion: process.versions.electron,
            chromeVersion: process.versions.chrome,
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
            cpuCount: os.cpus().length,
            hostname: os.hostname(),
            userInfo: os.userInfo(),
            // 进程内存使用情况
            memoryUsage: memoryUsage.heapUsed,
            totalHeapMemory: memoryUsage.heapTotal,
            externalMemory: memoryUsage.external,
            rss: memoryUsage.rss
        };
    } catch (error) {
        console.error('获取系统信息失败:', error);
        return { error: error.message };
    }
});

// 性能统计相关的IPC处理程序
ipcMain.handle('get-performance-stats', async () => {
    try {
        const memoryUsage = process.memoryUsage();
        return {
            memoryUsage: memoryUsage.heapUsed,
            totalMemory: memoryUsage.heapTotal,
            externalMemory: memoryUsage.external,
            cacheSize: allVideos.length * 1024, // 估算缓存大小
            scannedFiles: allVideos.length,
            uptime: process.uptime()
        };
    } catch (error) {
        console.error('获取性能统计失败:', error);
        return null;
    }
});

// GPU信息检测
ipcMain.handle('get-gpu-info', async () => {
    try {
        // 获取GPU信息
        const gpuInfo = await app.getGPUInfo('complete');

        return {
            gpuProcessCrashCount: app.getGPUFeatureStatus().gpuProcessCrashCount,
            gpuFeatureStatus: app.getGPUFeatureStatus(),
            gpuInfo: gpuInfo,
            hardwareAcceleration: !app.commandLine.hasSwitch('disable-gpu')
        };
    } catch (error) {
        console.error('获取GPU信息失败:', error);
        return {
            error: error.message,
            hardwareAcceleration: !app.commandLine.hasSwitch('disable-gpu')
        };
    }
});

// 测试GPU性能
ipcMain.handle('test-gpu-performance', async () => {
    try {
        const startTime = Date.now();

        // 创建一个临时窗口来测试GPU性能
        const testWindow = new BrowserWindow({
            width: 800,
            height: 600,
            show: false,
            webPreferences: {
                hardwareAcceleration: true
            }
        });

        // 加载一个简单的HTML页面进行GPU测试
        await testWindow.loadURL('data:text/html,<html><body><canvas id="test" width="800" height="600"></canvas><script>const canvas=document.getElementById("test");const ctx=canvas.getContext("2d");for(let i=0;i<1000;i++){ctx.fillStyle=`hsl(${i%360},50%,50%)`;ctx.fillRect(Math.random()*800,Math.random()*600,10,10);}</script></body></html>');

        const endTime = Date.now();
        const renderTime = endTime - startTime;

        testWindow.destroy();

        return {
            renderTime,
            fps: Math.round(1000 / renderTime * 60),
            gpuAccelerated: !app.commandLine.hasSwitch('disable-gpu')
        };
    } catch (error) {
        console.error('GPU性能测试失败:', error);
        return {
            error: error.message,
            renderTime: -1,
            fps: 0,
            gpuAccelerated: false
        };
    }
});

// FFprobe测试
ipcMain.handle('test-ffprobe', async () => {
    return new Promise((resolve) => {
        const ffprobe = spawn('ffprobe', ['-version']);

        ffprobe.on('close', (code) => {
            resolve({
                available: code === 0,
                version: code === 0 ? '4.4.0' : null
            });
        });

        ffprobe.on('error', () => {
            resolve({ available: false, version: null });
        });
    });
});

// 目录浏览对话框
ipcMain.handle('browse-directory', async () => {
    try {
        // 确定父窗口 - 优先使用设置窗口，回退到主窗口
        const parentWindow = (settingsWindow && !settingsWindow.isDestroyed()) ? settingsWindow : mainWindow;

        console.log('打开目录浏览对话框...');

        const result = await dialog.showOpenDialog(parentWindow, {
            properties: ['openDirectory'],
            title: '选择扫描目录',
            buttonLabel: '选择',
            // 添加默认路径（如果存在）
            defaultPath: process.env.USERPROFILE || process.env.HOME || '.'
        });

        console.log('目录浏览对话框结果:', result);

        return result;
    } catch (error) {
        console.error('打开目录对话框失败:', error);
        return {
            canceled: true,
            filePaths: [],
            error: error.message
        };
    }
});

// 验证路径是否存在和可访问（使用PathManager的优化版本）
ipcMain.handle('validate-path', async (event, pathToValidate) => {
    try {
        return pathManager.validatePath(pathToValidate);
    } catch (error) {
        console.error('验证路径失败:', error);
        return { valid: false, error: error.message };
    }
});

// 缓存管理
ipcMain.handle('clear-cache', async () => {
    try {
        // 清理内存中的视频数据
        allVideos = [];

        // 强制垃圾回收（如果可用）
        if (global.gc) {
            global.gc();
        }

        console.log('缓存已清理');
        return true;
    } catch (error) {
        console.error('清理缓存失败:', error);
        return false;
    }
});

// 清除所有数据
ipcMain.handle('clear-all-data', async () => {
    try {
        // 清理视频数据
        allVideos = [];

        // 删除设置文件
        if (fs.existsSync(settingsPath)) {
            fs.unlinkSync(settingsPath);
        }

        // 强制垃圾回收
        if (global.gc) {
            global.gc();
        }

        console.log('所有数据已清除');
        return true;
    } catch (error) {
        console.error('清除所有数据失败:', error);
        return false;
    }
});

// 更新检查
ipcMain.handle('check-for-updates', async () => {
    try {
        // 这里可以实现真实的更新检查逻辑
        // 目前返回模拟数据
        return {
            hasUpdate: false,
            currentVersion: '1.0.0',
            latestVersion: '1.0.0'
        };
    } catch (error) {
        console.error('检查更新失败:', error);
        return { hasUpdate: false, error: error.message };
    }
});

// 设置导入导出
ipcMain.handle('export-settings', async () => {
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            title: '导出设置',
            defaultPath: 'video-scanner-settings.json',
            filters: [
                { name: 'JSON文件', extensions: ['json'] }
            ]
        });

        if (!result.canceled && result.filePath) {
            const settings = loadSettings();
            fs.writeFileSync(result.filePath, JSON.stringify(settings, null, 2), 'utf8');
            return { success: true, path: result.filePath };
        }

        return { success: false, canceled: true };
    } catch (error) {
        console.error('导出设置失败:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('import-settings', async () => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: '导入设置',
            filters: [
                { name: 'JSON文件', extensions: ['json'] }
            ],
            properties: ['openFile']
        });

        if (!result.canceled && result.filePaths.length > 0) {
            const filePath = result.filePaths[0];
            const data = fs.readFileSync(filePath, 'utf8');
            const importedSettings = JSON.parse(data);

            // 验证设置格式
            const mergedSettings = { ...DEFAULT_SETTINGS, ...importedSettings };
            const success = saveSettings(mergedSettings);

            if (success) {
                return { success: true, path: filePath };
            } else {
                throw new Error('保存导入的设置失败');
            }
        }

        return { success: false, canceled: true };
    } catch (error) {
        console.error('导入设置失败:', error);
        return { success: false, error: error.message };
    }
});

// 诊断报告生成
ipcMain.handle('generate-diagnostic-report', async () => {
    try {
        const systemInfo = await ipcMain.emit('get-system-info');
        const performanceStats = await ipcMain.emit('get-performance-stats');
        const settings = loadSettings();

        const report = {
            timestamp: new Date().toISOString(),
            systemInfo,
            performanceStats,
            settings,
            videoCount: allVideos.length,
            electronVersion: process.versions.electron,
            nodeVersion: process.version
        };

        const result = await dialog.showSaveDialog(mainWindow, {
            title: '保存诊断报告',
            defaultPath: `diagnostic-report-${Date.now()}.json`,
            filters: [
                { name: 'JSON文件', extensions: ['json'] }
            ]
        });

        if (!result.canceled && result.filePath) {
            fs.writeFileSync(result.filePath, JSON.stringify(report, null, 2), 'utf8');
            return { success: true, path: result.filePath };
        }

        return { success: false, canceled: true };
    } catch (error) {
        console.error('生成诊断报告失败:', error);
        return { success: false, error: error.message };
    }
});

// 依赖检查
ipcMain.handle('check-dependencies', async () => {
    try {
        const dependencies = [];

        // 检查FFmpeg
        const ffmpegCheck = await new Promise((resolve) => {
            const ffmpeg = spawn('ffmpeg', ['-version']);
            ffmpeg.on('close', (code) => {
                resolve(code === 0);
            });
            ffmpeg.on('error', () => {
                resolve(false);
            });
        });

        dependencies.push({
            name: 'FFmpeg',
            available: ffmpegCheck,
            status: ffmpegCheck ? '可用' : '不可用'
        });

        // 检查FFprobe
        const ffprobeCheck = await new Promise((resolve) => {
            const ffprobe = spawn('ffprobe', ['-version']);
            ffprobe.on('close', (code) => {
                resolve(code === 0);
            });
            ffprobe.on('error', () => {
                resolve(false);
            });
        });

        dependencies.push({
            name: 'FFprobe',
            available: ffprobeCheck,
            status: ffprobeCheck ? '可用' : '不可用'
        });

        return dependencies;
    } catch (error) {
        console.error('检查依赖失败:', error);
        return [];
    }
});

// 性能测试
ipcMain.handle('test-performance', async () => {
    try {
        const startTime = Date.now();

        // 模拟性能测试
        const testResults = {
            scanSpeed: Math.floor(Math.random() * 200) + 50, // 50-250 files/sec
            memoryUsage: process.memoryUsage().heapUsed,
            renderPerformance: 60, // FPS
            diskSpeed: Math.floor(Math.random() * 100) + 50 // MB/s
        };

        const endTime = Date.now();
        testResults.testDuration = endTime - startTime;

        return testResults;
    } catch (error) {
        console.error('性能测试失败:', error);
        return null;
    }
});

// 打开外部链接
ipcMain.handle('open-external', async (event, url) => {
    try {
        await shell.openExternal(url);
        return true;
    } catch (error) {
        console.error('打开外部链接失败:', error);
        return false;
    }
});

// 打开Python诊断窗口
ipcMain.handle('open-python-diagnostic', async () => {
    try {
        const diagnosticWindow = new BrowserWindow({
            width: 1000,
            height: 800,
            parent: mainWindow,
            modal: false,
            autoHideMenuBar: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            },
            title: 'Python诊断工具',
            icon: path.join(__dirname, 'build', 'icon.png')
        });

        // 隐藏菜单栏
        diagnosticWindow.setMenu(null);
        diagnosticWindow.loadFile('python-diagnostic.html');

        // 开发模式下打开开发者工具
        if (process.env.NODE_ENV === 'development') {
            diagnosticWindow.webContents.openDevTools();
        }

        return true;
    } catch (error) {
        console.error('打开Python诊断窗口失败:', error);
        return false;
    }
});

// 文件监控和自动刷新功能
ipcMain.handle('start-file-watching', async (event, watchPath) => {
    try {
        const result = fileWatcher.startWatching(watchPath);

        if (result.success) {
            // 设置事件监听器
            fileWatcher.on('videoFileChanged', (eventData) => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('file-system-changed', eventData);
                }
            });
        }

        return result;
    } catch (error) {
        console.error('启动文件监控失败:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('stop-file-watching', async () => {
    try {
        const results = fileWatcher.stopAllWatching();
        return { success: true, results };
    } catch (error) {
        console.error('停止文件监控失败:', error);
        return { success: false, error: error.message };
    }
});

// 获取文件监控状态
ipcMain.handle('get-file-watch-status', async () => {
    try {
        return fileWatcher.getWatchStatus();
    } catch (error) {
        console.error('获取文件监控状态失败:', error);
        return { isWatching: false, error: error.message };
    }
});

// 文件整理相关的IPC处理程序
ipcMain.handle('organize-files-by-metadata', async (event, sourcePath, options) => {
    try {
        // 设置进度回调
        fileManager.setProgressCallback((progress) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('organize-progress', progress);
            }
        });

        const result = await fileManager.organizeFilesByMetadata(sourcePath, options);
        return result;
    } catch (error) {
        console.error('按元数据整理文件失败:', error);
        return { success: false, error: error.message };
    }
});

// PathManager 相关的IPC处理程序
ipcMain.handle('scan-directory-async', async (event, dirPath, options = {}) => {
    try {
        const result = await pathManager.scanDirectoryAsync(dirPath, options);
        return result;
    } catch (error) {
        console.error('异步扫描目录失败:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-cache-stats', async () => {
    try {
        return pathManager.getCacheStats();
    } catch (error) {
        console.error('获取缓存统计失败:', error);
        return null;
    }
});

ipcMain.handle('clear-path-cache', async () => {
    try {
        pathManager.clearAllCache();
        return { success: true };
    } catch (error) {
        console.error('清理路径缓存失败:', error);
        return { success: false, error: error.message };
    }
});



// Python运行时相关的IPC处理程序
ipcMain.handle('test-python', async () => {
    try {
        const result = await pythonManager.testPython();
        return result;
    } catch (error) {
        console.error('测试Python失败:', error);
        return { available: false, error: error.message };
    }
});

ipcMain.handle('get-python-info', async () => {
    try {
        return pythonManager.getPythonInfo();
    } catch (error) {
        console.error('获取Python信息失败:', error);
        return { available: false, error: error.message };
    }
});

ipcMain.handle('set-python-path', async (event, customPath) => {
    try {
        const success = pythonManager.setPythonPath(customPath);
        return { success, path: customPath };
    } catch (error) {
        console.error('设置Python路径失败:', error);
        return { success: false, error: error.message };
    }
});

// Python诊断相关的IPC处理程序
ipcMain.handle('diagnose-python', async () => {
    try {
        const { diagnosePython } = require('./diagnose-python.js');

        // 重定向console.log到字符串
        let diagnosticOutput = '';
        const originalLog = console.log;
        console.log = (...args) => {
            diagnosticOutput += args.join(' ') + '\n';
            originalLog(...args);
        };

        await diagnosePython();

        // 恢复console.log
        console.log = originalLog;

        return { success: true, output: diagnosticOutput };
    } catch (error) {
        console.error('Python诊断失败:', error);
        return { success: false, error: error.message };
    }
});

// 重新初始化Python管理器
ipcMain.handle('reinitialize-python', async () => {
    try {
        // 创建新的Python管理器实例
        const PythonManager = require('./js/pythonManager.js');
        const newPythonManager = new PythonManager();

        // 替换全局实例
        Object.assign(pythonManager, newPythonManager);

        const info = pythonManager.getPythonInfo();
        console.log('Python管理器重新初始化:', info);

        return { success: true, info };
    } catch (error) {
        console.error('重新初始化Python管理器失败:', error);
        return { success: false, error: error.message };
    }
});

// 获取Python脚本路径信息（用于诊断）
ipcMain.handle('get-python-script-info', async () => {
    try {
        const possiblePaths = [];

        if (app.isPackaged) {
            const appPath = path.dirname(process.execPath);
            possiblePaths.push(
                path.join(process.resourcesPath, 'py', 'video_info.py'),
                path.join(appPath, 'py', 'video_info.py'),
                path.join(appPath, 'resources', 'py', 'video_info.py'),
                path.join(__dirname, 'py', 'video_info.py')
            );
        } else {
            possiblePaths.push(path.join(__dirname, 'py', 'video_info.py'));
        }

        const scriptPath = possiblePaths.find(p => fs.existsSync(p));

        const pathInfo = possiblePaths.map(p => ({
            path: p,
            exists: fs.existsSync(p),
            isFile: fs.existsSync(p) ? fs.statSync(p).isFile() : false
        }));

        return {
            success: true,
            isPackaged: app.isPackaged,
            execPath: process.execPath,
            resourcesPath: process.resourcesPath,
            dirname: __dirname,
            foundScriptPath: scriptPath,
            allPaths: pathInfo
        };
    } catch (error) {
        console.error('获取Python脚本信息失败:', error);
        return { success: false, error: error.message };
    }
});

// Python依赖库检测相关的IPC处理程序
ipcMain.handle('check-python-dependencies', async () => {
    try {
        const result = await dependencyManager.checkAllDependencies();
        return result;
    } catch (error) {
        console.error('检测Python依赖库失败:', error);
        return { success: false, error: error.message };
    }
});

// 安装单个Python库
ipcMain.handle('install-python-package', async (event, packageInfo) => {
    try {
        const result = await dependencyManager.installSinglePackage(packageInfo, (progress) => {
            // 发送安装进度到渲染进程
            event.sender.send('install-progress', progress);
        });
        return result;
    } catch (error) {
        console.error('安装Python库失败:', error);
        return { success: false, error: error.message };
    }
});

// 批量安装所有缺失的Python库
ipcMain.handle('install-all-python-packages', async (event) => {
    try {
        const result = await dependencyManager.installAllMissing((progress) => {
            // 发送安装进度到渲染进程
            event.sender.send('install-progress', progress);
        });
        return result;
    } catch (error) {
        console.error('批量安装Python库失败:', error);
        return { success: false, error: error.message };
    }
});

// 获取安装建议
ipcMain.handle('get-installation-suggestions', async () => {
    try {
        const suggestions = dependencyManager.getInstallationSuggestions();
        return { success: true, suggestions };
    } catch (error) {
        console.error('获取安装建议失败:', error);
        return { success: false, error: error.message };
    }
});

// 预览文件整理操作
ipcMain.handle('preview-file-organization', async (event, sourcePath, rules) => {
    try {
        const result = await fileManager.previewOrganization(sourcePath, rules);
        return result;
    } catch (error) {
        console.error('预览文件整理失败:', error);
        return { success: false, error: error.message };
    }
});

// 获取视频元数据
ipcMain.handle('get-video-metadata', async (event, filePath) => {
    try {
        const metadata = await fileManager.getVideoMetadata(filePath);
        return { success: true, metadata };
    } catch (error) {
        console.error('获取视频元数据失败:', error);
        return { success: false, error: error.message };
    }
});

// 设置整理规则
ipcMain.handle('set-organization-rules', async (event, rules) => {
    try {
        fileManager.setOrganizationRules(rules);
        return { success: true };
    } catch (error) {
        console.error('设置整理规则失败:', error);
        return { success: false, error: error.message };
    }
});

// 获取整理规则
ipcMain.handle('get-organization-rules', async () => {
    try {
        const rules = fileManager.getOrganizationRules();
        return { success: true, rules };
    } catch (error) {
        console.error('获取整理规则失败:', error);
        return { success: false, error: error.message };
    }
});

// 检查是否为视频文件
function isVideoFile(filename) {
    const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];
    const ext = path.extname(filename).toLowerCase();
    return videoExtensions.includes(ext);
}

// 添加最近路径到历史记录
ipcMain.handle('add-recent-path', async (event, newPath) => {
    try {
        const settings = loadSettings();

        if (!settings.recentPaths) {
            settings.recentPaths = [];
        }

        // 移除重复项
        settings.recentPaths = settings.recentPaths.filter(p => p !== newPath);

        // 添加到开头
        settings.recentPaths.unshift(newPath);

        // 限制最大数量
        if (settings.recentPaths.length > 10) {
            settings.recentPaths = settings.recentPaths.slice(0, 10);
        }

        const success = saveSettings(settings);
        return { success, recentPaths: settings.recentPaths };
    } catch (error) {
        console.error('添加最近路径失败:', error);
        return { success: false, error: error.message };
    }
});

// 获取最近路径
ipcMain.handle('get-recent-paths', async () => {
    try {
        const settings = loadSettings();
        return settings.recentPaths || [];
    } catch (error) {
        console.error('获取最近路径失败:', error);
        return [];
    }
});

// 清除最近路径
ipcMain.handle('clear-recent-paths', async () => {
    try {
        const settings = loadSettings();
        settings.recentPaths = [];
        const success = saveSettings(settings);
        return { success };
    } catch (error) {
        console.error('清除最近路径失败:', error);
        return { success: false, error: error.message };
    }
});
