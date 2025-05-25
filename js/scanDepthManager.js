/**
 * 扫描深度管理模块
 * 负责控制文件扫描的递归深度和相关逻辑
 */

const path = require('path');
const fs = require('fs').promises;

class ScanDepthManager {
    constructor() {
        this.maxDepth = 5; // 默认最大深度
        this.currentDepth = 0;
        this.scannedPaths = new Set();
        this.depthStats = new Map(); // 记录每个深度的文件数量
    }

    /**
     * 设置最大扫描深度
     */
    setMaxDepth(depth) {
        this.maxDepth = Math.max(1, Math.min(10, depth));
        console.log(`设置扫描深度: ${this.maxDepth}`);
    }

    /**
     * 获取当前最大深度
     */
    getMaxDepth() {
        return this.maxDepth;
    }

    /**
     * 重置扫描状态
     */
    reset() {
        this.currentDepth = 0;
        this.scannedPaths.clear();
        this.depthStats.clear();
    }

    /**
     * 检查是否应该继续扫描指定深度
     */
    shouldScanDepth(currentDepth) {
        return currentDepth <= this.maxDepth;
    }

    /**
     * 递归扫描目录，应用深度限制
     */
    async scanDirectory(dirPath, supportedExtensions, options = {}) {
        const {
            includeHidden = false,
            followSymlinks = false,
            onProgress = null,
            onError = null
        } = options;

        this.reset();
        const results = [];
        
        try {
            await this._scanDirectoryRecursive(
                dirPath, 
                0, 
                supportedExtensions, 
                results, 
                {
                    includeHidden,
                    followSymlinks,
                    onProgress,
                    onError
                }
            );
        } catch (error) {
            console.error('扫描目录时发生错误:', error);
            if (onError) onError(error);
        }

        return {
            files: results,
            stats: this.getDepthStats(),
            totalFiles: results.length,
            maxDepthReached: Math.max(...Array.from(this.depthStats.keys()), 0)
        };
    }

    /**
     * 递归扫描目录的内部实现
     */
    async _scanDirectoryRecursive(dirPath, currentDepth, supportedExtensions, results, options) {
        // 检查深度限制
        if (!this.shouldScanDepth(currentDepth)) {
            console.log(`达到最大扫描深度 ${this.maxDepth}，跳过: ${dirPath}`);
            return;
        }

        // 避免重复扫描
        const normalizedPath = path.normalize(dirPath);
        if (this.scannedPaths.has(normalizedPath)) {
            return;
        }
        this.scannedPaths.add(normalizedPath);

        // 初始化深度统计
        if (!this.depthStats.has(currentDepth)) {
            this.depthStats.set(currentDepth, { files: 0, directories: 0 });
        }

        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                
                // 跳过隐藏文件（如果设置不包含）
                if (!options.includeHidden && entry.name.startsWith('.')) {
                    continue;
                }

                try {
                    if (entry.isDirectory()) {
                        this.depthStats.get(currentDepth).directories++;
                        
                        // 递归扫描子目录
                        await this._scanDirectoryRecursive(
                            fullPath,
                            currentDepth + 1,
                            supportedExtensions,
                            results,
                            options
                        );
                        
                    } else if (entry.isFile()) {
                        // 检查文件扩展名
                        const ext = path.extname(entry.name).toLowerCase();
                        if (supportedExtensions.includes(ext)) {
                            const stats = await fs.stat(fullPath);
                            
                            const fileInfo = {
                                path: fullPath,
                                name: entry.name,
                                size: stats.size,
                                modified: stats.mtime,
                                depth: currentDepth,
                                extension: ext,
                                directory: dirPath
                            };
                            
                            results.push(fileInfo);
                            this.depthStats.get(currentDepth).files++;
                            
                            // 报告进度
                            if (options.onProgress) {
                                options.onProgress({
                                    type: 'file',
                                    path: fullPath,
                                    depth: currentDepth,
                                    totalFiles: results.length
                                });
                            }
                        }
                        
                    } else if (entry.isSymbolicLink() && options.followSymlinks) {
                        // 处理符号链接
                        try {
                            const realPath = await fs.realpath(fullPath);
                            const realStats = await fs.stat(realPath);
                            
                            if (realStats.isDirectory()) {
                                await this._scanDirectoryRecursive(
                                    realPath,
                                    currentDepth + 1,
                                    supportedExtensions,
                                    results,
                                    options
                                );
                            } else if (realStats.isFile()) {
                                const ext = path.extname(entry.name).toLowerCase();
                                if (supportedExtensions.includes(ext)) {
                                    const fileInfo = {
                                        path: fullPath,
                                        realPath: realPath,
                                        name: entry.name,
                                        size: realStats.size,
                                        modified: realStats.mtime,
                                        depth: currentDepth,
                                        extension: ext,
                                        directory: dirPath,
                                        isSymlink: true
                                    };
                                    
                                    results.push(fileInfo);
                                    this.depthStats.get(currentDepth).files++;
                                }
                            }
                        } catch (symlinkError) {
                            console.warn(`处理符号链接失败: ${fullPath}`, symlinkError.message);
                        }
                    }
                } catch (entryError) {
                    console.warn(`处理条目失败: ${fullPath}`, entryError.message);
                    if (options.onError) {
                        options.onError({
                            type: 'entry',
                            path: fullPath,
                            error: entryError
                        });
                    }
                }
            }
        } catch (dirError) {
            console.error(`读取目录失败: ${dirPath}`, dirError.message);
            if (options.onError) {
                options.onError({
                    type: 'directory',
                    path: dirPath,
                    error: dirError
                });
            }
        }
    }

    /**
     * 获取深度统计信息
     */
    getDepthStats() {
        const stats = {};
        for (const [depth, data] of this.depthStats.entries()) {
            stats[depth] = {
                depth: depth,
                files: data.files,
                directories: data.directories,
                total: data.files + data.directories
            };
        }
        return stats;
    }

    /**
     * 获取深度预览信息
     */
    async getDepthPreview(dirPath, maxPreviewDepth = 3) {
        const preview = {
            totalDirectories: 0,
            depthBreakdown: {},
            estimatedFiles: 0,
            warnings: []
        };

        try {
            await this._previewDirectoryDepth(dirPath, 0, maxPreviewDepth, preview);
        } catch (error) {
            preview.warnings.push(`预览失败: ${error.message}`);
        }

        return preview;
    }

    /**
     * 预览目录深度的内部实现
     */
    async _previewDirectoryDepth(dirPath, currentDepth, maxDepth, preview) {
        if (currentDepth > maxDepth) return;

        if (!preview.depthBreakdown[currentDepth]) {
            preview.depthBreakdown[currentDepth] = {
                directories: 0,
                estimatedFiles: 0
            };
        }

        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                if (entry.name.startsWith('.')) continue; // 跳过隐藏文件
                
                const fullPath = path.join(dirPath, entry.name);
                
                if (entry.isDirectory()) {
                    preview.totalDirectories++;
                    preview.depthBreakdown[currentDepth].directories++;
                    
                    if (currentDepth < maxDepth) {
                        await this._previewDirectoryDepth(fullPath, currentDepth + 1, maxDepth, preview);
                    }
                } else if (entry.isFile()) {
                    preview.depthBreakdown[currentDepth].estimatedFiles++;
                    preview.estimatedFiles++;
                }
            }
        } catch (error) {
            preview.warnings.push(`无法访问目录 ${dirPath}: ${error.message}`);
        }
    }

    /**
     * 生成深度建议
     */
    generateDepthRecommendation(directoryStats) {
        const recommendations = [];
        
        if (directoryStats.totalDirectories === 0) {
            recommendations.push({
                type: 'info',
                message: '目录中没有子文件夹，深度设置为1即可'
            });
            return { recommendedDepth: 1, recommendations };
        }

        if (directoryStats.totalDirectories > 1000) {
            recommendations.push({
                type: 'warning',
                message: '检测到大量子目录，建议限制扫描深度以提高性能'
            });
        }

        // 根据目录结构推荐深度
        const maxDepthWithContent = Math.max(...Object.keys(directoryStats.depthBreakdown).map(Number));
        let recommendedDepth = Math.min(maxDepthWithContent + 1, 7);

        if (recommendedDepth <= 2) {
            recommendations.push({
                type: 'info',
                message: '目录结构较浅，推荐使用较小的扫描深度'
            });
        } else if (recommendedDepth >= 6) {
            recommendations.push({
                type: 'warning',
                message: '目录结构较深，扫描可能需要较长时间'
            });
            recommendedDepth = 6; // 限制推荐深度
        }

        return { recommendedDepth, recommendations };
    }

    /**
     * 验证扫描深度设置
     */
    validateDepthSetting(depth, directoryPath = null) {
        const validation = {
            isValid: true,
            warnings: [],
            errors: []
        };

        if (depth < 1 || depth > 10) {
            validation.isValid = false;
            validation.errors.push('扫描深度必须在1-10之间');
        }

        if (depth > 8) {
            validation.warnings.push('深度设置过大可能导致扫描时间过长');
        }

        if (depth === 1) {
            validation.warnings.push('深度为1只会扫描根目录，可能遗漏子目录中的文件');
        }

        return validation;
    }
}

module.exports = ScanDepthManager;
