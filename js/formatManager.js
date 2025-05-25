/**
 * 文件格式管理模块
 * 负责管理支持的视频文件格式和验证
 */

class FormatManager {
    constructor() {
        // 预定义的格式集合
        this.presets = {
            common: ['.mp4', '.mkv', '.avi', '.mov'],
            all: ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.3gp', '.asf', '.rm', '.rmvb'],
            hd: ['.mp4', '.mkv', '.mov', '.m4v', '.webm'],
            streaming: ['.mp4', '.webm', '.mov'],
            legacy: ['.avi', '.wmv', '.flv', '.asf', '.rm', '.rmvb']
        };

        // 格式信息数据库
        this.formatInfo = {
            '.mp4': {
                name: 'MP4',
                description: 'MPEG-4 Part 14',
                category: 'modern',
                quality: 'high',
                compatibility: 'excellent',
                codecs: ['H.264', 'H.265', 'AV1']
            },
            '.mkv': {
                name: 'Matroska',
                description: 'Matroska Video',
                category: 'modern',
                quality: 'high',
                compatibility: 'good',
                codecs: ['H.264', 'H.265', 'VP9', 'AV1']
            },
            '.avi': {
                name: 'AVI',
                description: 'Audio Video Interleave',
                category: 'legacy',
                quality: 'medium',
                compatibility: 'excellent',
                codecs: ['DivX', 'Xvid', 'H.264']
            },
            '.mov': {
                name: 'QuickTime',
                description: 'QuickTime Movie',
                category: 'modern',
                quality: 'high',
                compatibility: 'good',
                codecs: ['H.264', 'H.265', 'ProRes']
            },
            '.wmv': {
                name: 'WMV',
                description: 'Windows Media Video',
                category: 'legacy',
                quality: 'medium',
                compatibility: 'windows',
                codecs: ['WMV', 'VC-1']
            },
            '.flv': {
                name: 'Flash Video',
                description: 'Flash Video Format',
                category: 'legacy',
                quality: 'low',
                compatibility: 'limited',
                codecs: ['H.264', 'VP6']
            },
            '.webm': {
                name: 'WebM',
                description: 'WebM Video Format',
                category: 'modern',
                quality: 'high',
                compatibility: 'web',
                codecs: ['VP8', 'VP9', 'AV1']
            },
            '.m4v': {
                name: 'M4V',
                description: 'iTunes Video',
                category: 'modern',
                quality: 'high',
                compatibility: 'apple',
                codecs: ['H.264', 'H.265']
            }
        };

        this.enabledFormats = new Set(this.presets.common);
    }

    /**
     * 获取预设格式
     */
    getPreset(presetName) {
        return this.presets[presetName] || [];
    }

    /**
     * 获取所有预设
     */
    getAllPresets() {
        return Object.keys(this.presets);
    }

    /**
     * 应用预设格式
     */
    applyPreset(presetName) {
        const preset = this.getPreset(presetName);
        if (preset.length > 0) {
            this.enabledFormats = new Set(preset);
            return true;
        }
        return false;
    }

    /**
     * 添加格式
     */
    addFormat(format) {
        const normalizedFormat = this.normalizeFormat(format);
        const validation = this.validateFormat(normalizedFormat);
        
        if (validation.isValid) {
            this.enabledFormats.add(normalizedFormat);
            return { success: true, format: normalizedFormat };
        } else {
            return { success: false, errors: validation.errors };
        }
    }

    /**
     * 批量添加格式
     */
    addFormats(formats) {
        const results = {
            added: [],
            failed: [],
            duplicates: []
        };

        formats.forEach(format => {
            const normalizedFormat = this.normalizeFormat(format);
            
            if (this.enabledFormats.has(normalizedFormat)) {
                results.duplicates.push(normalizedFormat);
                return;
            }

            const validation = this.validateFormat(normalizedFormat);
            if (validation.isValid) {
                this.enabledFormats.add(normalizedFormat);
                results.added.push(normalizedFormat);
            } else {
                results.failed.push({
                    format: normalizedFormat,
                    errors: validation.errors
                });
            }
        });

        return results;
    }

    /**
     * 移除格式
     */
    removeFormat(format) {
        const normalizedFormat = this.normalizeFormat(format);
        const removed = this.enabledFormats.delete(normalizedFormat);
        return removed;
    }

    /**
     * 清空所有格式
     */
    clearFormats() {
        this.enabledFormats.clear();
    }

    /**
     * 获取已启用的格式
     */
    getEnabledFormats() {
        return Array.from(this.enabledFormats).sort();
    }

    /**
     * 检查格式是否已启用
     */
    isFormatEnabled(format) {
        const normalizedFormat = this.normalizeFormat(format);
        return this.enabledFormats.has(normalizedFormat);
    }

    /**
     * 标准化格式字符串
     */
    normalizeFormat(format) {
        if (!format) return '';
        
        let normalized = format.toString().trim().toLowerCase();
        
        // 确保以点开头
        if (!normalized.startsWith('.')) {
            normalized = '.' + normalized;
        }
        
        return normalized;
    }

    /**
     * 验证格式
     */
    validateFormat(format) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: []
        };

        // 基本格式检查
        if (!format || typeof format !== 'string') {
            validation.isValid = false;
            validation.errors.push('格式不能为空');
            return validation;
        }

        // 长度检查
        if (format.length < 2 || format.length > 10) {
            validation.isValid = false;
            validation.errors.push('格式长度必须在2-10个字符之间');
        }

        // 字符检查
        if (!/^\.[\w\d]+$/.test(format)) {
            validation.isValid = false;
            validation.errors.push('格式只能包含字母、数字和点号');
        }

        // 检查是否为已知格式
        if (!this.formatInfo[format]) {
            validation.warnings.push('这是一个未知的视频格式');
        }

        // 检查常见错误格式
        const commonMistakes = {
            '.jpeg': '这是图片格式，不是视频格式',
            '.jpg': '这是图片格式，不是视频格式',
            '.png': '这是图片格式，不是视频格式',
            '.gif': '这是动画格式，通常不被视为视频格式',
            '.txt': '这是文本格式，不是视频格式',
            '.doc': '这是文档格式，不是视频格式'
        };

        if (commonMistakes[format]) {
            validation.isValid = false;
            validation.errors.push(commonMistakes[format]);
        }

        return validation;
    }

    /**
     * 解析格式字符串（支持逗号分隔）
     */
    parseFormatString(formatString) {
        if (!formatString) return [];
        
        return formatString
            .split(',')
            .map(f => f.trim())
            .filter(f => f.length > 0)
            .map(f => this.normalizeFormat(f));
    }

    /**
     * 获取格式信息
     */
    getFormatInfo(format) {
        const normalizedFormat = this.normalizeFormat(format);
        return this.formatInfo[normalizedFormat] || {
            name: normalizedFormat.substring(1).toUpperCase(),
            description: '未知格式',
            category: 'unknown',
            quality: 'unknown',
            compatibility: 'unknown',
            codecs: []
        };
    }

    /**
     * 获取格式统计
     */
    getFormatStats() {
        const stats = {
            total: this.enabledFormats.size,
            byCategory: {},
            byQuality: {},
            byCompatibility: {}
        };

        this.enabledFormats.forEach(format => {
            const info = this.getFormatInfo(format);
            
            // 按类别统计
            stats.byCategory[info.category] = (stats.byCategory[info.category] || 0) + 1;
            
            // 按质量统计
            stats.byQuality[info.quality] = (stats.byQuality[info.quality] || 0) + 1;
            
            // 按兼容性统计
            stats.byCompatibility[info.compatibility] = (stats.byCompatibility[info.compatibility] || 0) + 1;
        });

        return stats;
    }

    /**
     * 生成格式建议
     */
    generateRecommendations() {
        const recommendations = [];
        const stats = this.getFormatStats();

        if (stats.total === 0) {
            recommendations.push({
                type: 'error',
                message: '没有启用任何格式，请至少选择一种视频格式'
            });
        } else if (stats.total === 1) {
            recommendations.push({
                type: 'warning',
                message: '只启用了一种格式，可能会遗漏其他格式的视频文件'
            });
        }

        if (!this.enabledFormats.has('.mp4')) {
            recommendations.push({
                type: 'info',
                message: '建议启用MP4格式，这是最常见的视频格式'
            });
        }

        if (stats.byCategory.legacy > stats.byCategory.modern) {
            recommendations.push({
                type: 'warning',
                message: '启用的传统格式较多，建议优先使用现代格式以获得更好的质量和兼容性'
            });
        }

        if (stats.total > 8) {
            recommendations.push({
                type: 'info',
                message: '启用的格式较多，扫描时间可能会增加'
            });
        }

        return recommendations;
    }

    /**
     * 导出配置
     */
    exportConfig() {
        return {
            enabledFormats: this.getEnabledFormats(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 导入配置
     */
    importConfig(config) {
        if (!config || !Array.isArray(config.enabledFormats)) {
            return { success: false, error: '无效的配置格式' };
        }

        const results = this.addFormats(config.enabledFormats);
        return {
            success: true,
            imported: results.added.length,
            failed: results.failed.length,
            duplicates: results.duplicates.length,
            details: results
        };
    }

    /**
     * 重置为默认格式
     */
    resetToDefaults() {
        this.enabledFormats = new Set(this.presets.common);
    }
}

module.exports = FormatManager;
