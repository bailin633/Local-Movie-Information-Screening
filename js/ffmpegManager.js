/**
 * FFmpeg/FFprobe 管理模块
 * 负责FFmpeg路径检测、版本验证和元数据提取
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

class FFmpegManager {
    constructor() {
        this.ffmpegPath = null;
        this.ffprobePath = null;
        this.version = null;
        this.isAvailable = false;
        this.preferredPath = 'F:\\Core_1\\ffmpeg\\bin\\';
        this.timeout = 15000; // 默认超时时间15秒
    }

    /**
     * 初始化FFmpeg管理器
     */
    async initialize() {
        console.log('初始化FFmpeg管理器...');
        await this.detectFFmpegPath();
        return this.isAvailable;
    }

    /**
     * 检测FFmpeg路径
     */
    async detectFFmpegPath() {
        console.log('检测FFmpeg路径...');
        
        // 1. 优先检查指定路径
        if (await this.checkPath(this.preferredPath)) {
            this.ffmpegPath = path.join(this.preferredPath, 'ffmpeg.exe');
            this.ffprobePath = path.join(this.preferredPath, 'ffprobe.exe');
            console.log(`使用优先路径: ${this.preferredPath}`);
            return true;
        }

        // 2. 检查系统PATH
        if (await this.checkSystemPath()) {
            this.ffmpegPath = 'ffmpeg';
            this.ffprobePath = 'ffprobe';
            console.log('使用系统PATH中的FFmpeg');
            return true;
        }

        // 3. 检查常见安装位置
        const commonPaths = [
            'C:\\ffmpeg\\bin\\',
            'C:\\Program Files\\ffmpeg\\bin\\',
            'C:\\Program Files (x86)\\ffmpeg\\bin\\',
            path.join(os.homedir(), 'ffmpeg', 'bin'),
        ];

        for (const commonPath of commonPaths) {
            if (await this.checkPath(commonPath)) {
                this.ffmpegPath = path.join(commonPath, 'ffmpeg.exe');
                this.ffprobePath = path.join(commonPath, 'ffprobe.exe');
                console.log(`使用常见路径: ${commonPath}`);
                return true;
            }
        }

        console.log('未找到FFmpeg');
        this.isAvailable = false;
        return false;
    }

    /**
     * 检查指定路径是否存在FFmpeg
     */
    async checkPath(dirPath) {
        try {
            const ffmpegExe = path.join(dirPath, 'ffmpeg.exe');
            const ffprobeExe = path.join(dirPath, 'ffprobe.exe');
            
            await fs.access(ffmpegExe);
            await fs.access(ffprobeExe);
            
            // 验证可执行性
            const version = await this.getVersionFromPath(ffmpegExe);
            if (version) {
                this.version = version;
                this.isAvailable = true;
                return true;
            }
        } catch (error) {
            // 路径不存在或不可访问
        }
        return false;
    }

    /**
     * 检查系统PATH中的FFmpeg
     */
    async checkSystemPath() {
        try {
            const version = await this.getVersionFromPath('ffmpeg');
            if (version) {
                this.version = version;
                this.isAvailable = true;
                return true;
            }
        } catch (error) {
            // 系统PATH中没有FFmpeg
        }
        return false;
    }

    /**
     * 获取FFmpeg版本信息
     */
    async getVersionFromPath(executablePath) {
        return new Promise((resolve) => {
            const process = spawn(executablePath, ['-version'], {
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let output = '';
            process.stdout.on('data', (data) => {
                output += data.toString();
            });

            process.stderr.on('data', (data) => {
                output += data.toString();
            });

            const timeout = setTimeout(() => {
                process.kill();
                resolve(null);
            }, 5000);

            process.on('close', (code) => {
                clearTimeout(timeout);
                if (code === 0 || output.includes('ffmpeg version')) {
                    const versionMatch = output.match(/ffmpeg version (\S+)/);
                    resolve(versionMatch ? versionMatch[1] : 'unknown');
                } else {
                    resolve(null);
                }
            });

            process.on('error', () => {
                clearTimeout(timeout);
                resolve(null);
            });
        });
    }

    /**
     * 设置自定义FFmpeg路径
     */
    async setCustomPath(customPath) {
        if (await this.checkPath(customPath)) {
            this.ffmpegPath = path.join(customPath, 'ffmpeg.exe');
            this.ffprobePath = path.join(customPath, 'ffprobe.exe');
            console.log(`设置自定义路径: ${customPath}`);
            return true;
        }
        return false;
    }

    /**
     * 获取视频文件的详细元数据
     */
    async getVideoMetadata(filePath) {
        if (!this.isAvailable) {
            throw new Error('FFprobe不可用');
        }

        return new Promise((resolve, reject) => {
            const args = [
                '-v', 'quiet',
                '-print_format', 'json',
                '-show_format',
                '-show_streams',
                filePath
            ];

            const process = spawn(this.ffprobePath, args, {
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let output = '';
            let errorOutput = '';

            process.stdout.on('data', (data) => {
                output += data.toString();
            });

            process.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            const timeout = setTimeout(() => {
                process.kill();
                reject(new Error(`FFprobe超时: ${this.timeout}ms`));
            }, this.timeout);

            process.on('close', (code) => {
                clearTimeout(timeout);
                
                if (code === 0 && output) {
                    try {
                        const metadata = JSON.parse(output);
                        resolve(this.parseMetadata(metadata));
                    } catch (parseError) {
                        reject(new Error(`解析元数据失败: ${parseError.message}`));
                    }
                } else {
                    reject(new Error(`FFprobe执行失败 (code: ${code}): ${errorOutput}`));
                }
            });

            process.on('error', (error) => {
                clearTimeout(timeout);
                reject(new Error(`FFprobe进程错误: ${error.message}`));
            });
        });
    }

    /**
     * 解析FFprobe输出的元数据
     */
    parseMetadata(rawMetadata) {
        const result = {
            format: {},
            video: {},
            audio: {},
            streams: []
        };

        // 解析格式信息
        if (rawMetadata.format) {
            result.format = {
                filename: rawMetadata.format.filename,
                formatName: rawMetadata.format.format_name,
                formatLongName: rawMetadata.format.format_long_name,
                duration: parseFloat(rawMetadata.format.duration) || 0,
                size: parseInt(rawMetadata.format.size) || 0,
                bitRate: parseInt(rawMetadata.format.bit_rate) || 0,
                tags: rawMetadata.format.tags || {}
            };
        }

        // 解析流信息
        if (rawMetadata.streams && Array.isArray(rawMetadata.streams)) {
            rawMetadata.streams.forEach(stream => {
                const streamInfo = {
                    index: stream.index,
                    codecType: stream.codec_type,
                    codecName: stream.codec_name,
                    codecLongName: stream.codec_long_name,
                    duration: parseFloat(stream.duration) || 0,
                    bitRate: parseInt(stream.bit_rate) || 0,
                    tags: stream.tags || {}
                };

                if (stream.codec_type === 'video') {
                    streamInfo.width = stream.width || 0;
                    streamInfo.height = stream.height || 0;
                    streamInfo.aspectRatio = stream.display_aspect_ratio;
                    streamInfo.frameRate = this.parseFrameRate(stream.r_frame_rate);
                    streamInfo.pixelFormat = stream.pix_fmt;
                    
                    // 设置主要视频流信息
                    if (!result.video.codecName) {
                        result.video = { ...streamInfo };
                    }
                } else if (stream.codec_type === 'audio') {
                    streamInfo.sampleRate = parseInt(stream.sample_rate) || 0;
                    streamInfo.channels = stream.channels || 0;
                    streamInfo.channelLayout = stream.channel_layout;
                    
                    // 设置主要音频流信息
                    if (!result.audio.codecName) {
                        result.audio = { ...streamInfo };
                    }
                }

                result.streams.push(streamInfo);
            });
        }

        return result;
    }

    /**
     * 解析帧率字符串
     */
    parseFrameRate(frameRateStr) {
        if (!frameRateStr || frameRateStr === '0/0') return 0;
        
        const parts = frameRateStr.split('/');
        if (parts.length === 2) {
            const numerator = parseFloat(parts[0]);
            const denominator = parseFloat(parts[1]);
            if (denominator !== 0) {
                return Math.round((numerator / denominator) * 100) / 100;
            }
        }
        return 0;
    }

    /**
     * 测试FFprobe功能
     */
    async testFFprobe(testFilePath = null) {
        if (!this.isAvailable) {
            return {
                success: false,
                error: 'FFprobe不可用',
                details: 'FFmpeg/FFprobe未正确安装或配置'
            };
        }

        try {
            // 如果没有提供测试文件，创建一个临时测试
            if (!testFilePath) {
                return await this.testFFprobeVersion();
            }

            const metadata = await this.getVideoMetadata(testFilePath);
            return {
                success: true,
                metadata: metadata,
                message: 'FFprobe功能正常'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                details: '测试文件元数据提取失败'
            };
        }
    }

    /**
     * 测试FFprobe版本
     */
    async testFFprobeVersion() {
        try {
            const version = await this.getVersionFromPath(this.ffprobePath);
            if (version) {
                return {
                    success: true,
                    version: version,
                    message: 'FFprobe版本检测成功'
                };
            } else {
                return {
                    success: false,
                    error: '无法获取FFprobe版本',
                    details: 'FFprobe可能未正确安装'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message,
                details: 'FFprobe版本检测失败'
            };
        }
    }

    /**
     * 设置超时时间
     */
    setTimeout(timeoutMs) {
        this.timeout = timeoutMs;
    }

    /**
     * 获取状态信息
     */
    getStatus() {
        return {
            isAvailable: this.isAvailable,
            ffmpegPath: this.ffmpegPath,
            ffprobePath: this.ffprobePath,
            version: this.version,
            timeout: this.timeout
        };
    }
}

module.exports = FFmpegManager;
