const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

require('iconv-lite');
require('dotenv').config();

let mainWindow;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 700,
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

app.whenReady().then(() => {
    mainWindow = createMainWindow();

    ipcMain.on('open-settings-window', () => {
        createSettingsWindow();
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
                
                const processedVideoInfos = videoInfos.map(info => {
                    if (!info.path) {
                        console.warn('Video info missing path:', info);
                    }
                    return {
                        ...info,
                        frameRate: parseFloat(info.frameRate.toFixed(2)),
                        duration: parseFloat(info.duration.toFixed(2)),
                        fileSize: parseFloat(info.fileSize.toFixed(2)),
                        bitrate: info.bitrate ? parseFloat((info.bitrate / 1000000).toFixed(2)) : null
                    };
                });
                
                console.log('Processed videoInfos:', JSON.stringify(processedVideoInfos, null, 2));
                event.reply('video-list', processedVideoInfos);
            } catch (error) {
                console.error('解析 Python 输出失败:', error);
                event.reply('video-list', { error: '解析视频信息失败' });
            }
        }
    });
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