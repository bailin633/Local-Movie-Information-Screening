/**
 * Python脚本管理模块
 * 处理Python脚本的路径检测和临时复制
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { app } = require('electron');

class ScriptManager {
    constructor() {
        this.tempScriptPath = null;
        this.scriptContent = null;
    }

    /**
     * 获取Python脚本路径
     */
    getPythonScriptPath() {
        const possiblePaths = [];

        if (app.isPackaged) {
            // 打包后的应用程序，尝试多个可能的路径
            const appPath = path.dirname(process.execPath);
            possiblePaths.push(
                path.join(process.resourcesPath, 'py', 'video_info.py'),
                path.join(appPath, 'py', 'video_info.py'),
                path.join(appPath, 'resources', 'py', 'video_info.py'),
                path.join(__dirname, '..', 'py', 'video_info.py')
            );
        } else {
            // 开发环境
            possiblePaths.push(path.join(__dirname, '..', 'py', 'video_info.py'));
        }

        // 查找第一个存在的脚本路径
        const scriptPath = possiblePaths.find(p => fs.existsSync(p));

        console.log('ScriptManager - 尝试的路径:', possiblePaths);
        console.log('ScriptManager - 找到的脚本路径:', scriptPath);

        return scriptPath;
    }

    /**
     * 确保Python脚本可访问
     */
    async ensureScriptAccessible() {
        // 首先尝试直接路径
        let scriptPath = this.getPythonScriptPath();

        if (scriptPath && fs.existsSync(scriptPath)) {
            console.log('ScriptManager - 使用直接路径:', scriptPath);
            return scriptPath;
        }

        // 如果直接路径不可用，尝试从内嵌资源创建临时脚本
        console.log('ScriptManager - 直接路径不可用，尝试创建临时脚本');

        try {
            return await this.createTempScript();
        } catch (error) {
            console.error('ScriptManager - 创建临时脚本失败:', error);
            throw new Error(`无法访问Python脚本: ${error.message}`);
        }
    }

    /**
     * 创建临时Python脚本
     */
    async createTempScript() {
        if (this.tempScriptPath && fs.existsSync(this.tempScriptPath)) {
            console.log('ScriptManager - 使用现有临时脚本:', this.tempScriptPath);
            return this.tempScriptPath;
        }

        // 获取脚本内容
        const scriptContent = this.getEmbeddedScriptContent();

        // 创建临时目录
        const tempDir = path.join(os.tmpdir(), 'video-scanner-py');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // 创建临时脚本文件
        this.tempScriptPath = path.join(tempDir, 'video_info.py');
        fs.writeFileSync(this.tempScriptPath, scriptContent, 'utf8');

        console.log('ScriptManager - 临时脚本已创建:', this.tempScriptPath);
        return this.tempScriptPath;
    }

    /**
     * 获取内嵌的Python脚本内容
     */
    getEmbeddedScriptContent() {
        // 如果已经缓存了脚本内容，直接返回
        if (this.scriptContent) {
            return this.scriptContent;
        }

        // 尝试从各种可能的位置读取脚本
        const possiblePaths = [
            path.join(__dirname, '..', 'py', 'video_info.py'),
            path.join(process.resourcesPath || '', 'py', 'video_info.py'),
            path.join(process.cwd(), 'py', 'video_info.py')
        ];

        for (const scriptPath of possiblePaths) {
            try {
                if (fs.existsSync(scriptPath)) {
                    this.scriptContent = fs.readFileSync(scriptPath, 'utf8');
                    console.log('ScriptManager - 从以下位置读取脚本内容:', scriptPath);
                    return this.scriptContent;
                }
            } catch (error) {
                console.warn('ScriptManager - 读取脚本失败:', scriptPath, error.message);
            }
        }

        // 如果都失败了，使用内嵌的脚本内容
        console.log('ScriptManager - 使用内嵌的脚本内容');
        this.scriptContent = this.getFallbackScriptContent();
        return this.scriptContent;
    }

    /**
     * 获取备用的Python脚本内容
     */
    getFallbackScriptContent() {
        return `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
视频信息扫描脚本 - 备用版本
"""

import os
import sys
import json
import subprocess

def get_video_info(file_path):
    """获取视频文件信息"""
    try:
        # 基本文件信息
        stat = os.stat(file_path)
        file_size = stat.st_size / (1024 * 1024)  # MB

        return {
            'name': os.path.basename(file_path),
            'path': file_path,
            'fileSize': round(file_size, 2),
            'resolution': 'Unknown',
            'frameRate': 0,
            'duration': 0,
            'bitrate': None,
            'codec': 'Unknown',
            'depth': 0
        }
    except Exception as e:
        print(f"处理文件 {file_path} 时出错: {str(e)}", file=sys.stderr)
        return None

def scan_directory(dir_path, max_depth=5, include_hidden=False, supported_extensions=None):
    """扫描目录中的视频文件"""
    if supported_extensions is None:
        video_extensions = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v']
    else:
        video_extensions = supported_extensions

    video_files = []
    processed_files = 0

    print(f"开始扫描，最大深度: {max_depth}")

    for root, dirs, files in os.walk(dir_path):
        current_depth = root[len(dir_path):].count(os.sep)
        if current_depth >= max_depth:
            dirs.clear()
            continue

        if not include_hidden:
            dirs[:] = [d for d in dirs if not d.startswith('.')]

        for file in files:
            if not include_hidden and file.startswith('.'):
                continue

            if any(file.lower().endswith(ext) for ext in video_extensions):
                full_path = os.path.join(root, file)
                video_info = get_video_info(full_path)
                if video_info:
                    video_info['depth'] = current_depth
                    video_files.append(video_info)
                    processed_files += 1
                    print(f"进度：{processed_files}/未知")
                    print(f"处理文件: {video_info['name']} (深度: {current_depth})")

    return video_files

if __name__ == "__main__":
    if len(sys.argv) > 1:
        directory = sys.argv[1]
        max_depth = 5
        include_hidden = False
        supported_extensions = None

        for i in range(2, len(sys.argv)):
            arg = sys.argv[i]
            if arg.startswith('--max-depth='):
                try:
                    max_depth = int(arg.split('=')[1])
                except ValueError:
                    print(f"无效的深度参数: {arg}", file=sys.stderr)
            elif arg == '--include-hidden':
                include_hidden = True
            elif arg.startswith('--extensions='):
                try:
                    ext_str = arg.split('=')[1]
                    supported_extensions = [ext.strip() for ext in ext_str.split(',')]
                except:
                    print(f"无效的扩展名参数: {arg}", file=sys.stderr)

        result = scan_directory(directory, max_depth, include_hidden, supported_extensions)
        print("\\n最终结果:")
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(json.dumps({"error": "未提供目录"}, ensure_ascii=False))
`;
    }

    /**
     * 清理临时脚本
     */
    cleanup() {
        if (this.tempScriptPath && fs.existsSync(this.tempScriptPath)) {
            try {
                fs.unlinkSync(this.tempScriptPath);
                console.log('ScriptManager - 临时脚本已清理:', this.tempScriptPath);
            } catch (error) {
                console.warn('ScriptManager - 清理临时脚本失败:', error.message);
            }
            this.tempScriptPath = null;
        }
    }

    /**
     * 获取脚本信息
     */
    getScriptInfo() {
        const directPath = this.getPythonScriptPath();
        return {
            directPath: directPath,
            directPathExists: directPath ? fs.existsSync(directPath) : false,
            tempPath: this.tempScriptPath,
            tempPathExists: this.tempScriptPath ? fs.existsSync(this.tempScriptPath) : false,
            hasScriptContent: !!this.scriptContent
        };
    }
}

module.exports = ScriptManager;
