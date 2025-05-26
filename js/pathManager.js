/**
 * 路径管理模块
 * 处理默认路径管理和应用逻辑
 * 优化版本：支持异步处理、缓存机制和性能优化
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const os = require('os');

class PathManager {
    constructor() {
        this.settingsPath = path.join(os.homedir(), '.video-scanner-settings.json');
        this.mainWindow = null;
        this.currentDefaultPath = '';

        // 性能优化相关
        this.scanCache = new Map(); // 扫描结果缓存
        this.pathValidationCache = new Map(); // 路径验证缓存
        this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存过期
        this.maxConcurrentScans = 4; // 最大并发扫描数
        this.currentScans = 0; // 当前扫描数
        this.scanQueue = []; // 扫描队列

        // 支持的视频扩展名
        this.videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];

        // 定期清理缓存
        this.startCacheCleanup();
    }

    /**
     * 设置主窗口引用
     */
    setMainWindow(window) {
        this.mainWindow = window;
    }

    /**
     * 启动缓存清理定时器
     */
    startCacheCleanup() {
        setInterval(() => {
            this.cleanupExpiredCache();
        }, this.cacheTimeout);
    }

    /**
     * 清理过期缓存
     */
    cleanupExpiredCache() {
        const now = Date.now();

        // 清理扫描缓存
        for (const [key, value] of this.scanCache.entries()) {
            if (now - value.timestamp > this.cacheTimeout) {
                this.scanCache.delete(key);
            }
        }

        // 清理路径验证缓存
        for (const [key, value] of this.pathValidationCache.entries()) {
            if (now - value.timestamp > this.cacheTimeout) {
                this.pathValidationCache.delete(key);
            }
        }

        console.log(`缓存清理完成，扫描缓存: ${this.scanCache.size}, 验证缓存: ${this.pathValidationCache.size}`);
    }

    /**
     * 加载默认扫描路径
     */
    loadDefaultPath() {
        try {
            if (fsSync.existsSync(this.settingsPath)) {
                const settings = JSON.parse(fsSync.readFileSync(this.settingsPath, 'utf8'));
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
            if (fsSync.existsSync(this.settingsPath)) {
                settings = JSON.parse(fsSync.readFileSync(this.settingsPath, 'utf8'));
            }

            settings.defaultScanPath = newPath;
            fsSync.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2), 'utf8');
            this.currentDefaultPath = newPath;

            // 清理相关缓存
            this.clearPathCache(newPath);

            console.log('默认路径已保存:', newPath);
            return true;
        } catch (error) {
            console.error('保存默认路径失败:', error);
            return false;
        }
    }

    /**
     * 清理路径相关缓存
     */
    clearPathCache(targetPath) {
        // 清理扫描缓存
        for (const [key] of this.scanCache.entries()) {
            if (key.startsWith(targetPath)) {
                this.scanCache.delete(key);
            }
        }

        // 清理验证缓存
        this.pathValidationCache.delete(targetPath);
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
            if (!fsSync.existsSync(this.currentDefaultPath)) {
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

            if (!fsSync.existsSync(newPath)) {
                throw new Error('路径不存在');
            }

            const stats = fsSync.statSync(newPath);
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
     * 验证路径是否有效（支持缓存）
     */
    validatePath(pathToValidate) {
        try {
            if (!pathToValidate || typeof pathToValidate !== 'string') {
                return { valid: false, error: '路径不能为空' };
            }

            // 检查缓存
            const cached = this.pathValidationCache.get(pathToValidate);
            if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.result;
            }

            if (!fsSync.existsSync(pathToValidate)) {
                const result = { valid: false, error: '路径不存在' };
                this.pathValidationCache.set(pathToValidate, {
                    result,
                    timestamp: Date.now()
                });
                return result;
            }

            const stats = fsSync.statSync(pathToValidate);
            if (!stats.isDirectory()) {
                const result = { valid: false, error: '指定的路径不是目录' };
                this.pathValidationCache.set(pathToValidate, {
                    result,
                    timestamp: Date.now()
                });
                return result;
            }

            // 检查读取权限
            try {
                fsSync.accessSync(pathToValidate, fsSync.constants.R_OK);
            } catch (accessError) {
                const result = { valid: false, error: '没有读取权限' };
                this.pathValidationCache.set(pathToValidate, {
                    result,
                    timestamp: Date.now()
                });
                return result;
            }

            const result = { valid: true, path: pathToValidate };
            this.pathValidationCache.set(pathToValidate, {
                result,
                timestamp: Date.now()
            });
            return result;
        } catch (error) {
            const result = { valid: false, error: error.message };
            this.pathValidationCache.set(pathToValidate, {
                result,
                timestamp: Date.now()
            });
            return result;
        }
    }

    /**
     * 获取路径信息
     */
    getPathInfo(targetPath) {
        try {
            if (!fsSync.existsSync(targetPath)) {
                return null;
            }

            const stats = fsSync.statSync(targetPath);
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
            if (!fsSync.existsSync(this.settingsPath)) {
                return { success: true, cleaned: 0 };
            }

            const settings = JSON.parse(fsSync.readFileSync(this.settingsPath, 'utf8'));
            if (!settings.recentPaths || !Array.isArray(settings.recentPaths)) {
                return { success: true, cleaned: 0 };
            }

            const originalCount = settings.recentPaths.length;
            settings.recentPaths = settings.recentPaths.filter(path => {
                try {
                    return fsSync.existsSync(path) && fsSync.statSync(path).isDirectory();
                } catch {
                    return false;
                }
            });

            const cleanedCount = originalCount - settings.recentPaths.length;

            if (cleanedCount > 0) {
                fsSync.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2), 'utf8');
                console.log(`清理了 ${cleanedCount} 个无效的最近路径`);
            }

            return { success: true, cleaned: cleanedCount };
        } catch (error) {
            console.error('清理最近路径失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 异步扫描目录中的视频文件（优化版本）
     */
    async scanDirectoryAsync(dirPath, options = {}) {
        const {
            maxDepth = 5,
            includeHidden = false,
            extensions = this.videoExtensions,
            useCache = true,
            progressCallback = null
        } = options;

        const cacheKey = `${dirPath}:${maxDepth}:${includeHidden}:${extensions.join(',')}`;

        // 检查缓存
        if (useCache) {
            const cached = this.scanCache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log('使用缓存结果:', cacheKey);
                return cached.result;
            }
        }

        try {
            const result = await this.performDirectoryScan(dirPath, maxDepth, includeHidden, extensions, progressCallback);

            // 缓存结果
            if (useCache) {
                this.scanCache.set(cacheKey, {
                    result,
                    timestamp: Date.now()
                });
            }

            return result;
        } catch (error) {
            console.error('异步扫描目录失败:', error);
            throw error;
        }
    }

    /**
     * 执行目录扫描的核心逻辑
     */
    async performDirectoryScan(dirPath, maxDepth, includeHidden, extensions, progressCallback) {
        const videoFiles = [];
        const processedDirs = new Set();
        let totalProcessed = 0;

        const scanRecursive = async (currentPath, currentDepth) => {
            if (currentDepth > maxDepth) {
                return;
            }

            // 避免循环引用
            const realPath = fsSync.realpathSync(currentPath);
            if (processedDirs.has(realPath)) {
                return;
            }
            processedDirs.add(realPath);

            try {
                const items = await fs.readdir(currentPath);
                const batches = this.createBatches(items, 10); // 每批处理10个项目

                for (const batch of batches) {
                    await Promise.all(batch.map(async (item) => {
                        // 跳过隐藏文件（如果设置不包含）
                        if (!includeHidden && item.startsWith('.')) {
                            return;
                        }

                        const fullPath = path.join(currentPath, item);

                        try {
                            const stats = await fs.stat(fullPath);

                            if (stats.isDirectory()) {
                                await scanRecursive(fullPath, currentDepth + 1);
                            } else if (this.isVideoFile(fullPath, extensions)) {
                                videoFiles.push({
                                    path: fullPath,
                                    name: item,
                                    size: stats.size,
                                    modified: stats.mtime,
                                    depth: currentDepth
                                });
                            }

                            totalProcessed++;
                            if (progressCallback && totalProcessed % 50 === 0) {
                                progressCallback({
                                    processed: totalProcessed,
                                    currentPath: fullPath,
                                    found: videoFiles.length
                                });
                            }
                        } catch (itemError) {
                            console.warn(`处理项目失败 ${fullPath}:`, itemError.message);
                        }
                    }));
                }
            } catch (error) {
                console.warn(`读取目录失败 ${currentPath}:`, error.message);
            }
        };

        await scanRecursive(dirPath, 0);

        return {
            success: true,
            files: videoFiles,
            totalProcessed,
            scanDepth: maxDepth,
            timestamp: Date.now()
        };
    }

    /**
     * 创建批次处理数组
     */
    createBatches(array, batchSize) {
        const batches = [];
        for (let i = 0; i < array.length; i += batchSize) {
            batches.push(array.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * 检查是否为视频文件
     */
    isVideoFile(filePath, extensions = this.videoExtensions) {
        const ext = path.extname(filePath).toLowerCase();
        return extensions.includes(ext);
    }

    /**
     * 获取缓存统计信息
     */
    getCacheStats() {
        return {
            scanCacheSize: this.scanCache.size,
            validationCacheSize: this.pathValidationCache.size,
            currentScans: this.currentScans,
            queueLength: this.scanQueue.length
        };
    }

    /**
     * 清理所有缓存
     */
    clearAllCache() {
        this.scanCache.clear();
        this.pathValidationCache.clear();
        console.log('所有缓存已清理');
    }

    /**
     * 设置缓存配置
     */
    setCacheConfig(config) {
        if (config.timeout) this.cacheTimeout = config.timeout;
        if (config.maxConcurrent) this.maxConcurrentScans = config.maxConcurrent;
        if (config.videoExtensions) this.videoExtensions = config.videoExtensions;
    }
}

module.exports = PathManager;
