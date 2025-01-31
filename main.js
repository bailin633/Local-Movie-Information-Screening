const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
require('iconv-lite');
require('dotenv').config();

// 创建主应用窗口的函数
let mainWindow;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 650,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');
    mainWindow.setMenu(null);
    mainWindow.webContents.openDevTools();

    return mainWindow;
}

app.whenReady().then(() => {
    mainWindow = createMainWindow();

    ipcMain.on('open-settings-window', () => {
        createSettingsWindow();
    });
});

// 当所有窗口关闭时退出应用（Windows & Linux）
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

function createSettingsWindow() {
    const settingsWindow = new BrowserWindow({
        width: 400,
        height: 300,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    settingsWindow.setMenu(null);
    settingsWindow.loadFile('settingWindow.html');
}

// 当应用被激活时重新创建窗口（macOS）
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createMainWindow();
    }
});

// 处理打开文件对话框的 IPC 消息
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

// 处理扫描目录的 IPC 消息
ipcMain.on('scan-directory', (event, dirPath) => {
    const pythonScriptPath = path.join(__dirname, 'py', 'video_info.py');

    console.log('Python 脚本路径:', pythonScriptPath);
    console.log('要扫描的目录:', dirPath);

    if (!fs.existsSync(pythonScriptPath)) {
        console.error('未找到 Python 脚本:', pythonScriptPath);
        event.reply('video-list', { error: '未找到 Python 脚本' });
        return;
    }

    const pythonProcess = spawn('python', [pythonScriptPath, dirPath], {
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    let output = '';
    let progressRegex = /进度：(\d+)\/(\d+)/;

    pythonProcess.stdout.on('data', (data) => {
        const chunk = data.toString('utf-8');
        output += chunk;
        console.log(chunk);

        // 检查进度信息
        let match = progressRegex.exec(chunk);
        if (match) {
            let current = parseInt(match[1]);
            let total = parseInt(match[2]);
            let progress = current / total;
            mainWindow.webContents.send('scan-progress', progress);
        }
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`Python 错误: ${data.toString('utf-8')}`);
    });

    pythonProcess.on('close', (code) => {
        console.log('Python 进程退出，代码:', code);
        if (code !== 0) {
            console.error(`Python 进程异常退出，代码 ${code}`);
            event.reply('video-list', { error: '扫描目录失败' });
        } else {
            try {
                const jsonStart = output.lastIndexOf('\n最终结果:');
                const jsonString = output.slice(jsonStart).replace('\n最终结果:', '').trim();
                const videoInfos = JSON.parse(jsonString);

                console.log('Original videoInfos:', JSON.stringify(videoInfos, null, 2));

                function parseFileSize(fileSizeString) {
                    const match = fileSizeString.match(/^([\d.]+)\s*(\w+)$/);
                    if (!match) return NaN;

                    const size = parseFloat(match[1]);
                    const unit = match[2].toLowerCase();

                    const units = {
                        b: 1,
                        kb: 1024,
                        mb: 1024 * 1024,
                        gb: 1024 * 1024 * 1024,
                        tb: 1024 * 1024 * 1024 * 1024
                    };

                    return size * (units[unit] || 1);
                }

                const processedVideoInfos = videoInfos.map(info => ({
                    ...info,
                    frameRate: parseFloat(info.frameRate.toFixed(2)),
                    duration: parseFloat(info.duration.toFixed(2)),
                    fileSize: parseFloat(info.fileSize.toFixed(2)),
                    bitrate: info.bitrate ? parseFloat((info.bitrate / 1000000).toFixed(2)) : null // 将 bps 转换为 Mbps，如果存在的话
                }));

                console.log('Processed videoInfos:', JSON.stringify(processedVideoInfos, null, 2));

                event.reply('video-list', processedVideoInfos);
            } catch (error) {
                console.error('解析 Python 输出失败:', error);
                event.reply('video-list', { error: '解析视频信息失败' });
            }
        }
    });
});