const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
require('iconv-lite');
require('dotenv').config();

// 创建主应用窗口的函数
function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 600,
        // 允许用户自由调整窗口大小
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile('index.html');
    win.setMenu(null);

    // 开发者工具已被注释掉
    // win.webContents.openDevTools();

    return win;
}

// 当 Electron 完成初始化时创建窗口
let mainWindow;
app.whenReady().then(() => {
    mainWindow = createWindow();
});

// 当所有窗口关闭时退出应用（Windows & Linux）
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// 当应用被激活时重新创建窗口（macOS）
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createWindow();
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
                event.reply('video-list', videoInfos);
            } catch (error) {
                console.error('解析 Python 输出失败:', error);
                event.reply('video-list', { error: '解析视频信息失败' });
            }
        }
    });
});