/**
 * 路径管理模块
 * 处理默认路径管理和应用逻辑
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class PathManager {
    constructor() {
        this.settingsPath = path.join(os.homedir(), '.video-scanner-settings.json');
        this.mainWindow = null;
        this.currentDefaultPath = '';
    }

    /**
     * 设置主窗口引用
     */
    setMainWindow(window) {
        this.mainWindow = window;
    }

    /**
     * 加载默认扫描路径
     */
    loadDefaultPath() {
        try {
            if (fs.existsSync(this.settingsPath)) {
                const settings = JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
                this.currentDefaultPath = settings.defaultScanPath || '';
                return this.currentDefaultPath;
            }
        } catch (error) {
            console.error('加载默认路径失败:', error);
        }
        return '';
    }

    /**
     * 保存默认扫描路径
     */
    saveDefaultPath(newPath) {
        try {
            let settings = {};
            if (fs.existsSync(this.settingsPath)) {
                settings = JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
            }
            
            settings.defaultScanPath = newPath;
            fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2), 'utf8');
            this.currentDefaultPath = newPath;
            
            console.log('默认路径已保存:', newPath);
            return true;
        } catch (error) {
            console.error('保存默认路径失败:', error);
            return false;
        }
    }

    /**
     * 应用默认路径到主窗口
     */
    applyDefaultPathToMainWindow() {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) {
            console.warn('主窗口不可用，无法应用默认路径');
            return false;
        }

        if (!this.currentDefaultPath) {
            console.log('没有设置默认路径');
            return false;
        }

        try {
            // 验证路径是否仍然有效
            if (!fs.existsSync(this.currentDefaultPath)) {
                console.warn('默认路径不存在:', this.currentDefaultPath);
                return false;
            }

            // 发送路径到主窗口
            this.mainWindow.webContents.send('set-default-path', this.currentDefaultPath);
            console.log('默认路径已应用到主窗口:', this.currentDefaultPath);
            return true;
        } catch (error) {
            console.error('应用默认路径到主窗口失败:', error);
            return false;
        }
    }

    /**
     * 应用启动时初始化默认路径
     */
    initializeOnStartup() {
        const defaultPath = this.loadDefaultPath();
        if (defaultPath) {
            console.log('应用启动时加载默认路径:', defaultPath);
            // 延迟应用，确保主窗口已完全加载
            setTimeout(() => {
                this.applyDefaultPathToMainWindow();
            }, 1000);
        }
    }

    /**
     * 处理默认路径更改
     */
    handleDefaultPathChange(newPath) {
        try {
            // 验证新路径
            if (!newPath || typeof newPath !== 'string') {
                throw new Error('无效的路径');
            }

            if (!fs.existsSync(newPath)) {
                throw new Error('路径不存在');
            }

            const stats = fs.statSync(newPath);
            if (!stats.isDirectory()) {
                throw new Error('指定的路径不是目录');
            }

            // 保存新路径
            const success = this.saveDefaultPath(newPath);
            if (!success) {
                throw new Error('保存路径失败');
            }

            // 立即应用到主窗口
            this.applyDefaultPathToMainWindow();

            return { success: true, path: newPath };
        } catch (error) {
            console.error('处理默认路径更改失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取当前默认路径
     */
    getCurrentDefaultPath() {
        return this.currentDefaultPath;
    }

    /**
     * 验证路径是否有效
     */
    validatePath(pathToValidate) {
        try {
            if (!pathToValidate || typeof pathToValidate !== 'string') {
                return { valid: false, error: '路径不能为空' };
            }

            if (!fs.existsSync(pathToValidate)) {
                return { valid: false, error: '路径不存在' };
            }

            const stats = fs.statSync(pathToValidate);
            if (!stats.isDirectory()) {
                return { valid: false, error: '指定的路径不是目录' };
            }

            // 检查读取权限
            try {
                fs.accessSync(pathToValidate, fs.constants.R_OK);
            } catch (accessError) {
                return { valid: false, error: '没有读取权限' };
            }

            return { valid: true, path: pathToValidate };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    /**
     * 获取路径信息
     */
    getPathInfo(targetPath) {
        try {
            if (!fs.existsSync(targetPath)) {
                return null;
            }

            const stats = fs.statSync(targetPath);
            return {
                path: targetPath,
                isDirectory: stats.isDirectory(),
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                accessed: stats.atime
            };
        } catch (error) {
            console.error('获取路径信息失败:', error);
            return null;
        }
    }

    /**
     * 清理无效的最近路径
     */
    cleanupRecentPaths() {
        try {
            if (!fs.existsSync(this.settingsPath)) {
                return { success: true, cleaned: 0 };
            }

            const settings = JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
            if (!settings.recentPaths || !Array.isArray(settings.recentPaths)) {
                return { success: true, cleaned: 0 };
            }

            const originalCount = settings.recentPaths.length;
            settings.recentPaths = settings.recentPaths.filter(path => {
                try {
                    return fs.existsSync(path) && fs.statSync(path).isDirectory();
                } catch {
                    return false;
                }
            });

            const cleanedCount = originalCount - settings.recentPaths.length;
            
            if (cleanedCount > 0) {
                fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2), 'utf8');
                console.log(`清理了 ${cleanedCount} 个无效的最近路径`);
            }

            return { success: true, cleaned: cleanedCount };
        } catch (error) {
            console.error('清理最近路径失败:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = PathManager;
