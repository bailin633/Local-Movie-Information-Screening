/**
 * 文件管理模块
 * 处理文件整理和元数据相关功能
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class FileManager {
    constructor() {
        this.supportedExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];
        this.organizationRules = {
            byResolution: true,
            byCodec: false,
            byDuration: false,
            byFileSize: false
        };
        this.progressCallback = null;
    }

    /**
     * 设置进度回调函数
     */
    setProgressCallback(callback) {
        this.progressCallback = callback;
    }

    /**
     * 报告进度
     */
    reportProgress(current, total, message) {
        if (this.progressCallback) {
            this.progressCallback({
                current,
                total,
                percentage: Math.round((current / total) * 100),
                message
            });
        }
    }

    /**
     * 检查是否为视频文件
     */
    isVideoFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return this.supportedExtensions.includes(ext);
    }

    /**
     * 获取视频元数据
     */
    async getVideoMetadata(filePath) {
        return new Promise((resolve) => {
            if (!this.isVideoFile(filePath)) {
                resolve(null);
                return;
            }

            const ffprobe = spawn('ffprobe', [
                '-v', 'quiet',
                '-print_format', 'json',
                '-show_format',
                '-show_streams',
                filePath
            ]);

            let output = '';
            let errorOutput = '';

            ffprobe.stdout.on('data', (data) => {
                output += data.toString();
            });

            ffprobe.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            ffprobe.on('close', (code) => {
                if (code === 0 && output) {
                    try {
                        const metadata = JSON.parse(output);
                        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
                        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

                        const result = {
                            filePath,
                            format: metadata.format,
                            duration: parseFloat(metadata.format.duration) || 0,
                            fileSize: parseInt(metadata.format.size) || 0,
                            bitRate: parseInt(metadata.format.bit_rate) || 0,
                            video: videoStream ? {
                                codec: videoStream.codec_name,
                                width: videoStream.width,
                                height: videoStream.height,
                                frameRate: this.parseFrameRate(videoStream.r_frame_rate),
                                bitRate: parseInt(videoStream.bit_rate) || 0
                            } : null,
                            audio: audioStream ? {
                                codec: audioStream.codec_name,
                                sampleRate: parseInt(audioStream.sample_rate) || 0,
                                channels: audioStream.channels,
                                bitRate: parseInt(audioStream.bit_rate) || 0
                            } : null
                        };

                        resolve(result);
                    } catch (parseError) {
                        console.error('解析元数据失败:', parseError);
                        resolve(null);
                    }
                } else {
                    console.error('FFprobe执行失败:', errorOutput);
                    resolve(null);
                }
            });

            ffprobe.on('error', (error) => {
                console.error('FFprobe启动失败:', error);
                resolve(null);
            });
        });
    }

    /**
     * 解析帧率
     */
    parseFrameRate(frameRateStr) {
        if (!frameRateStr) return 0;

        const parts = frameRateStr.split('/');
        if (parts.length === 2) {
            const numerator = parseFloat(parts[0]);
            const denominator = parseFloat(parts[1]);
            return denominator !== 0 ? numerator / denominator : 0;
        }

        return parseFloat(frameRateStr) || 0;
    }

    /**
     * 根据分辨率分类
     */
    categorizeByResolution(metadata) {
        if (!metadata.video) return 'unknown';

        const width = metadata.video.width;
        const height = metadata.video.height;

        if (width >= 3840 && height >= 2160) return '4K';
        if (width >= 2560 && height >= 1440) return '2K';
        if (width >= 1920 && height >= 1080) return '1080p';
        if (width >= 1280 && height >= 720) return '720p';
        if (width >= 854 && height >= 480) return '480p';
        if (width >= 640 && height >= 360) return '360p';

        return 'low_res';
    }

    /**
     * 根据编码格式分类
     */
    categorizeByCodec(metadata) {
        if (!metadata.video) return 'unknown';

        const codec = metadata.video.codec.toLowerCase();

        if (codec.includes('h264') || codec.includes('avc')) return 'H264';
        if (codec.includes('h265') || codec.includes('hevc')) return 'H265';
        if (codec.includes('vp9')) return 'VP9';
        if (codec.includes('vp8')) return 'VP8';
        if (codec.includes('av1')) return 'AV1';
        if (codec.includes('xvid')) return 'XviD';
        if (codec.includes('divx')) return 'DivX';

        return codec.toUpperCase();
    }

    /**
     * 根据时长分类
     */
    categorizeByDuration(metadata) {
        const duration = metadata.duration;

        if (duration < 300) return 'short'; // 小于5分钟
        if (duration < 1800) return 'medium'; // 5-30分钟
        if (duration < 7200) return 'long'; // 30分钟-2小时

        return 'very_long'; // 超过2小时
    }

    /**
     * 根据文件大小分类
     */
    categorizeByFileSize(metadata) {
        const sizeGB = metadata.fileSize / (1024 * 1024 * 1024);

        if (sizeGB < 0.1) return 'tiny'; // 小于100MB
        if (sizeGB < 0.5) return 'small'; // 100MB-500MB
        if (sizeGB < 2) return 'medium'; // 500MB-2GB
        if (sizeGB < 8) return 'large'; // 2GB-8GB

        return 'huge'; // 超过8GB
    }

    /**
     * 获取文件的分类路径
     */
    getOrganizedPath(basePath, metadata, rules) {
        const categories = [];

        if (rules.byResolution) {
            categories.push(this.categorizeByResolution(metadata));
        }

        if (rules.byCodec) {
            categories.push(this.categorizeByCodec(metadata));
        }

        if (rules.byDuration) {
            categories.push(this.categorizeByDuration(metadata));
        }

        if (rules.byFileSize) {
            categories.push(this.categorizeByFileSize(metadata));
        }

        if (categories.length === 0) {
            categories.push('organized');
        }

        return path.join(basePath, ...categories);
    }

    /**
     * 创建目录结构
     */
    async createDirectoryStructure(dirPath) {
        try {
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                console.log('创建目录:', dirPath);
            }
            return true;
        } catch (error) {
            console.error('创建目录失败:', error);
            return false;
        }
    }

    /**
     * 移动文件
     */
    async moveFile(sourcePath, targetPath) {
        try {
            // 确保目标目录存在
            const targetDir = path.dirname(targetPath);
            await this.createDirectoryStructure(targetDir);

            // 检查目标文件是否已存在
            if (fs.existsSync(targetPath)) {
                const ext = path.extname(targetPath);
                const name = path.basename(targetPath, ext);
                const dir = path.dirname(targetPath);
                let counter = 1;

                while (fs.existsSync(path.join(dir, `${name}_${counter}${ext}`))) {
                    counter++;
                }

                targetPath = path.join(dir, `${name}_${counter}${ext}`);
            }

            // 移动文件
            fs.renameSync(sourcePath, targetPath);
            console.log(`文件已移动: ${sourcePath} -> ${targetPath}`);

            return { success: true, newPath: targetPath };
        } catch (error) {
            console.error('移动文件失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 复制文件
     */
    async copyFile(sourcePath, targetPath) {
        try {
            // 确保目标目录存在
            const targetDir = path.dirname(targetPath);
            await this.createDirectoryStructure(targetDir);

            // 检查目标文件是否已存在
            if (fs.existsSync(targetPath)) {
                const ext = path.extname(targetPath);
                const name = path.basename(targetPath, ext);
                const dir = path.dirname(targetPath);
                let counter = 1;

                while (fs.existsSync(path.join(dir, `${name}_${counter}${ext}`))) {
                    counter++;
                }

                targetPath = path.join(dir, `${name}_${counter}${ext}`);
            }

            // 复制文件
            fs.copyFileSync(sourcePath, targetPath);
            console.log(`文件已复制: ${sourcePath} -> ${targetPath}`);

            return { success: true, newPath: targetPath };
        } catch (error) {
            console.error('复制文件失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 扫描目录中的视频文件
     */
    async scanVideoFiles(dirPath) {
        const videoFiles = [];

        try {
            const scanDirectory = (currentPath) => {
                const items = fs.readdirSync(currentPath);

                for (const item of items) {
                    const fullPath = path.join(currentPath, item);
                    const stats = fs.statSync(fullPath);

                    if (stats.isDirectory()) {
                        scanDirectory(fullPath);
                    } else if (this.isVideoFile(fullPath)) {
                        videoFiles.push(fullPath);
                    }
                }
            };

            scanDirectory(dirPath);
            return videoFiles;
        } catch (error) {
            console.error('扫描视频文件失败:', error);
            return [];
        }
    }

    /**
     * 按元数据整理文件
     */
    async organizeFilesByMetadata(sourcePath, options = {}) {
        try {
            const {
                mode = 'move', // 'move' 或 'copy'
                rules = this.organizationRules,
                dryRun = false
            } = options;

            // 扫描视频文件
            this.reportProgress(0, 100, '正在扫描视频文件...');
            const videoFiles = await this.scanVideoFiles(sourcePath);

            if (videoFiles.length === 0) {
                return {
                    success: true,
                    message: '未找到视频文件',
                    processed: 0,
                    errors: []
                };
            }

            const results = {
                success: true,
                processed: 0,
                errors: [],
                operations: []
            };

            // 处理每个视频文件
            for (let i = 0; i < videoFiles.length; i++) {
                const filePath = videoFiles[i];
                const fileName = path.basename(filePath);

                this.reportProgress(i + 1, videoFiles.length, `正在处理: ${fileName}`);

                try {
                    // 获取元数据
                    const metadata = await this.getVideoMetadata(filePath);

                    if (!metadata) {
                        results.errors.push({
                            file: filePath,
                            error: '无法获取元数据'
                        });
                        continue;
                    }

                    // 计算目标路径
                    const organizedDir = this.getOrganizedPath(sourcePath, metadata, rules);
                    const targetPath = path.join(organizedDir, fileName);

                    // 如果目标路径与源路径相同，跳过
                    if (path.resolve(filePath) === path.resolve(targetPath)) {
                        continue;
                    }

                    const operation = {
                        source: filePath,
                        target: targetPath,
                        mode,
                        metadata: {
                            resolution: this.categorizeByResolution(metadata),
                            codec: this.categorizeByCodec(metadata),
                            duration: this.categorizeByDuration(metadata),
                            fileSize: this.categorizeByFileSize(metadata)
                        }
                    };

                    if (!dryRun) {
                        // 执行文件操作
                        let operationResult;
                        if (mode === 'move') {
                            operationResult = await this.moveFile(filePath, targetPath);
                        } else {
                            operationResult = await this.copyFile(filePath, targetPath);
                        }

                        if (operationResult.success) {
                            operation.newPath = operationResult.newPath;
                            results.processed++;
                        } else {
                            results.errors.push({
                                file: filePath,
                                error: operationResult.error
                            });
                        }
                    }

                    results.operations.push(operation);
                } catch (error) {
                    results.errors.push({
                        file: filePath,
                        error: error.message
                    });
                }
            }

            this.reportProgress(videoFiles.length, videoFiles.length, '整理完成');

            return results;
        } catch (error) {
            console.error('按元数据整理文件失败:', error);
            return {
                success: false,
                error: error.message,
                processed: 0,
                errors: []
            };
        }
    }

    /**
     * 预览整理操作
     */
    async previewOrganization(sourcePath, rules = this.organizationRules) {
        return await this.organizeFilesByMetadata(sourcePath, {
            mode: 'move',
            rules,
            dryRun: true
        });
    }

    /**
     * 设置整理规则
     */
    setOrganizationRules(rules) {
        this.organizationRules = { ...this.organizationRules, ...rules };
    }

    /**
     * 获取整理规则
     */
    getOrganizationRules() {
        return { ...this.organizationRules };
    }

    /**
     * 获取支持的文件扩展名
     */
    getSupportedExtensions() {
        return [...this.supportedExtensions];
    }

    /**
     * 设置支持的文件扩展名
     */
    setSupportedExtensions(extensions) {
        this.supportedExtensions = extensions.map(ext =>
            ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`
        );
    }
}

module.exports = FileManager;
