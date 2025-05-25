/**
 * 文件监控模块
 * 处理文件监控和自动刷新功能
 */

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

class FileWatcher extends EventEmitter {
    constructor() {
        super();
        this.watchers = new Map(); // 存储多个监控器
        this.watchedPaths = new Set(); // 存储被监控的路径
        this.debounceTimers = new Map(); // 防抖定时器
        this.config = {
            debounceDelay: 1000, // 防抖延迟（毫秒）
            recursive: true, // 递归监控子目录
            ignoreInitial: true, // 忽略初始扫描
            maxDepth: 5, // 最大监控深度
            excludePatterns: [
                /node_modules/,
                /\.git/,
                /\.tmp/,
                /\.temp/,
                /Thumbs\.db/,
                /\.DS_Store/
            ]
        };
        this.supportedExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];
        this.stats = {
            totalEvents: 0,
            videoEvents: 0,
            lastEventTime: null,
            watchedDirectories: 0
        };
    }

    /**
     * 检查是否为视频文件
     */
    isVideoFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return this.supportedExtensions.includes(ext);
    }

    /**
     * 检查路径是否应该被忽略
     */
    shouldIgnorePath(filePath) {
        return this.config.excludePatterns.some(pattern => pattern.test(filePath));
    }

    /**
     * 开始监控目录
     */
    startWatching(watchPath, options = {}) {
        try {
            // 验证路径
            if (!fs.existsSync(watchPath)) {
                throw new Error(`路径不存在: ${watchPath}`);
            }

            const stats = fs.statSync(watchPath);
            if (!stats.isDirectory()) {
                throw new Error(`指定的路径不是目录: ${watchPath}`);
            }

            // 如果已经在监控，先停止
            if (this.watchers.has(watchPath)) {
                this.stopWatching(watchPath);
            }

            const config = { ...this.config, ...options };
            
            console.log(`开始监控目录: ${watchPath}`);

            // 创建文件监控器
            const watcher = fs.watch(watchPath, { 
                recursive: config.recursive 
            }, (eventType, filename) => {
                this.handleFileEvent(watchPath, eventType, filename);
            });

            // 存储监控器
            this.watchers.set(watchPath, {
                watcher,
                config,
                startTime: Date.now()
            });

            this.watchedPaths.add(watchPath);
            this.stats.watchedDirectories = this.watchers.size;

            // 发送监控开始事件
            this.emit('watchStarted', {
                path: watchPath,
                config
            });

            return {
                success: true,
                watchPath,
                message: '文件监控已启动'
            };
        } catch (error) {
            console.error('启动文件监控失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 停止监控指定目录
     */
    stopWatching(watchPath) {
        try {
            const watcherInfo = this.watchers.get(watchPath);
            if (watcherInfo) {
                watcherInfo.watcher.close();
                this.watchers.delete(watchPath);
                this.watchedPaths.delete(watchPath);
                
                // 清理相关的防抖定时器
                const timerKey = `${watchPath}:*`;
                for (const [key, timer] of this.debounceTimers.entries()) {
                    if (key.startsWith(watchPath)) {
                        clearTimeout(timer);
                        this.debounceTimers.delete(key);
                    }
                }

                this.stats.watchedDirectories = this.watchers.size;
                
                console.log(`停止监控目录: ${watchPath}`);
                
                // 发送监控停止事件
                this.emit('watchStopped', {
                    path: watchPath
                });

                return { success: true };
            } else {
                return { success: false, error: '未找到对应的监控器' };
            }
        } catch (error) {
            console.error('停止文件监控失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 停止所有监控
     */
    stopAllWatching() {
        const results = [];
        for (const watchPath of this.watchedPaths) {
            results.push(this.stopWatching(watchPath));
        }
        
        // 清理所有防抖定时器
        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer);
        }
        this.debounceTimers.clear();

        console.log('所有文件监控已停止');
        return results;
    }

    /**
     * 处理文件事件
     */
    handleFileEvent(watchPath, eventType, filename) {
        if (!filename) return;

        const fullPath = path.join(watchPath, filename);
        
        // 检查是否应该忽略
        if (this.shouldIgnorePath(fullPath)) {
            return;
        }

        // 更新统计
        this.stats.totalEvents++;
        this.stats.lastEventTime = new Date();

        // 检查是否为视频文件
        const isVideo = this.isVideoFile(fullPath);
        if (isVideo) {
            this.stats.videoEvents++;
        }

        // 防抖处理
        const debounceKey = `${watchPath}:${filename}`;
        
        if (this.debounceTimers.has(debounceKey)) {
            clearTimeout(this.debounceTimers.get(debounceKey));
        }

        const timer = setTimeout(() => {
            this.processFileEvent(watchPath, eventType, filename, fullPath, isVideo);
            this.debounceTimers.delete(debounceKey);
        }, this.config.debounceDelay);

        this.debounceTimers.set(debounceKey, timer);
    }

    /**
     * 处理防抖后的文件事件
     */
    processFileEvent(watchPath, eventType, filename, fullPath, isVideo) {
        try {
            let fileExists = false;
            let fileStats = null;

            try {
                fileStats = fs.statSync(fullPath);
                fileExists = true;
            } catch (error) {
                // 文件可能已被删除
                fileExists = false;
            }

            const eventData = {
                watchPath,
                eventType,
                filename,
                fullPath,
                isVideo,
                fileExists,
                fileStats,
                timestamp: new Date()
            };

            console.log(`文件事件: ${eventType} - ${filename} (视频: ${isVideo})`);

            // 发送通用文件变化事件
            this.emit('fileChanged', eventData);

            // 如果是视频文件，发送专门的视频文件事件
            if (isVideo) {
                this.emit('videoFileChanged', eventData);
            }

            // 根据事件类型发送特定事件
            if (eventType === 'rename') {
                if (fileExists) {
                    this.emit('fileAdded', eventData);
                    if (isVideo) {
                        this.emit('videoFileAdded', eventData);
                    }
                } else {
                    this.emit('fileRemoved', eventData);
                    if (isVideo) {
                        this.emit('videoFileRemoved', eventData);
                    }
                }
            } else if (eventType === 'change') {
                this.emit('fileModified', eventData);
                if (isVideo) {
                    this.emit('videoFileModified', eventData);
                }
            }
        } catch (error) {
            console.error('处理文件事件失败:', error);
            this.emit('error', {
                error: error.message,
                watchPath,
                filename,
                eventType
            });
        }
    }

    /**
     * 获取监控状态
     */
    getWatchStatus() {
        const status = {
            isWatching: this.watchers.size > 0,
            watchedPaths: Array.from(this.watchedPaths),
            watcherCount: this.watchers.size,
            stats: { ...this.stats },
            config: { ...this.config }
        };

        return status;
    }

    /**
     * 更新配置
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('文件监控配置已更新:', this.config);
    }

    /**
     * 获取监控统计信息
     */
    getStats() {
        return {
            ...this.stats,
            uptime: this.watchers.size > 0 ? Date.now() - Math.min(...Array.from(this.watchers.values()).map(w => w.startTime)) : 0
        };
    }

    /**
     * 重置统计信息
     */
    resetStats() {
        this.stats = {
            totalEvents: 0,
            videoEvents: 0,
            lastEventTime: null,
            watchedDirectories: this.watchers.size
        };
    }

    /**
     * 检查路径是否正在被监控
     */
    isWatching(watchPath) {
        return this.watchers.has(watchPath);
    }

    /**
     * 获取所有被监控的路径
     */
    getWatchedPaths() {
        return Array.from(this.watchedPaths);
    }
}

module.exports = FileWatcher;
