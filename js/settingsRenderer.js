/**
 * 设置页面渲染器
 * 处理设置页面的所有交互和功能
 */

// 检查是否在Electron环境中
let ipcRenderer;
try {
    ipcRenderer = require('electron').ipcRenderer;
} catch (error) {
    // 如果不在Electron环境中，创建模拟的ipcRenderer
    console.log('不在Electron环境中，使用模拟IPC');
    ipcRenderer = {
        invoke: async (channel, ...args) => {
            console.log(`模拟IPC调用: ${channel}`, args);

            // 模拟不同的IPC调用
            switch (channel) {
                case 'get-settings':
                    return {}; // 返回空设置对象
                case 'save-settings':
                    console.log('模拟保存设置:', args[0]);
                    return true;
                case 'apply-settings':
                    console.log('模拟应用设置:', args[0]);
                    return true;
                case 'close-settings-window':
                    console.log('模拟关闭设置窗口');
                    if (typeof window !== 'undefined' && window.close) {
                        window.close();
                    }
                    return true;
                case 'get-system-info':
                    return {
                        platform: 'win32',
                        arch: 'x64',
                        nodeVersion: 'v16.0.0',
                        electronVersion: '13.0.0',
                        chromeVersion: '91.0.0',
                        totalMemory: 8589934592,
                        freeMemory: 4294967296,
                        cpuCount: 8
                    };
                case 'test-ffprobe':
                    return { available: true, version: '4.4.0' };
                case 'browse-directory':
                    return { canceled: false, filePaths: ['C:\\Users\\Test\\Videos'] };
                case 'clear-cache':
                case 'clear-all-data':
                    return true;
                case 'get-performance-stats':
                    return {
                        memoryUsage: 134217728,
                        cacheSize: 67108864,
                        scannedFiles: 1234
                    };
                case 'check-for-updates':
                    return { hasUpdate: false };
                case 'export-settings':
                case 'import-settings':
                    return { success: true, path: 'C:\\Users\\Test\\settings.json' };
                case 'generate-diagnostic-report':
                    return { success: true, path: 'C:\\Users\\Test\\diagnostic.txt' };
                case 'check-dependencies':
                    return [
                        { name: 'FFmpeg', available: true, status: '可用' },
                        { name: 'FFprobe', available: true, status: '可用' }
                    ];
                case 'test-performance':
                    return {
                        scanSpeed: 150,
                        memoryUsage: 134217728,
                        renderPerformance: 60,
                        diskSpeed: 104857600
                    };
                case 'open-external':
                    console.log('模拟打开外部链接:', args[0]);
                    return true;
                default:
                    console.log(`未处理的IPC调用: ${channel}`);
                    return null;
            }
        }
    };
}

// 默认设置配置
const DEFAULT_SETTINGS = {
    // 常规设置
    organizeByMetadata: false,
    autoRefresh: true,
    defaultScanPath: '',
    recentPaths: [],

    // 扫描设置
    supportedExtensions: ['.mp4', '.mkv', '.avi', '.mov'],
    customExtensions: [],
    scanDepth: 5,
    includeHidden: false,
    followSymlinks: false,
    enableFfprobe: true,
    ffprobeTimeout: 10,
    fallbackExtension: true,

    // 自定义扫描格式
    enableCustomScanFormat: false,
    scanFormatPatterns: [],
    scanMode: 'all',

    // 外观设置
    theme: 'light',
    uiScale: 100,
    compactMode: false,
    showThumbnails: false,
    backgroundBlur: true,
    blurIntensity: 15,

    // 性能设置
    gpuAcceleration: true,
    smoothAnimations: true,
    animationSpeed: 1.0,
    maxConcurrent: 4,
    cacheSize: 200,
    enableCache: true,
    autoCleanup: true,

    // 高级设置
    debugMode: false,
    devTools: false,
    logLevel: 'info'
};

// 当前设置状态
let currentSettings = { ...DEFAULT_SETTINGS };
let hasUnsavedChanges = false;

// DOM 元素引用
let elements = {};

/**
 * 初始化设置页面
 */
function initializeSettings() {
    console.log('初始化设置页面...');

    // 获取DOM元素引用
    cacheElements();

    // 设置事件监听器
    setupEventListeners();

    // 加载设置
    loadSettings();

    // 初始化UI组件
    initializeUIComponents();

    // 加载系统信息
    loadSystemInfo();

    console.log('设置页面初始化完成');
}

/**
 * 缓存DOM元素引用
 */
function cacheElements() {
    // 导航标签
    elements.navTabs = document.querySelectorAll('.nav-tab');
    elements.tabContents = document.querySelectorAll('.tab-content');

    // 滑块元素
    elements.sliders = document.querySelectorAll('input[type="range"]');

    // 按钮元素
    elements.saveButton = document.getElementById('save-settings');
    elements.cancelButton = document.getElementById('cancel-settings');
    elements.resetButton = document.getElementById('reset-settings');
    elements.closeButton = document.getElementById('close-settings');

    // 状态元素
    elements.saveStatus = document.getElementById('save-status');
    elements.ffprobeStatus = document.getElementById('ffprobe-status');

    // 确认对话框
    elements.confirmDialog = document.getElementById('confirm-dialog');
    elements.confirmTitle = document.getElementById('confirm-title');
    elements.confirmMessage = document.getElementById('confirm-message');
    elements.confirmYes = document.getElementById('confirm-yes');
    elements.confirmNo = document.getElementById('confirm-no');
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
    // 导航标签切换
    elements.navTabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // 滑块值更新
    elements.sliders.forEach(slider => {
        const valueDisplay = document.getElementById(slider.id + '-value');
        if (valueDisplay) {
            slider.addEventListener('input', (e) => {
                valueDisplay.textContent = e.target.value;
                markAsChanged();
            });
        }
    });

    // 保存和取消按钮
    elements.saveButton.addEventListener('click', saveSettings);
    elements.cancelButton.addEventListener('click', cancelChanges);
    elements.resetButton.addEventListener('click', () => {
        showConfirmDialog(
            '重置设置',
            '确定要将所有设置重置为默认值吗？此操作不可撤销。',
            resetToDefaults
        );
    });
    elements.closeButton.addEventListener('click', closeSettings);

    // 确认对话框
    elements.confirmYes.addEventListener('click', handleConfirmYes);
    elements.confirmNo.addEventListener('click', handleConfirmNo);

    // 表单元素变化监听
    document.addEventListener('change', (e) => {
        if (e.target.matches('input, select')) {
            // 检查是否是高级设置选项
            if (isAdvancedSetting(e.target)) {
                handleAdvancedSettingChange(e.target);
            } else {
                markAsChanged();

                // 特殊处理自动刷新设置
                if (e.target.id === 'auto-refresh') {
                    handleAutoRefreshToggle(e.target.checked);
                }
            }
        }
    });

    // 特殊功能按钮
    setupSpecialButtons();

    // 键盘快捷键
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // 窗口关闭前确认
    window.addEventListener('beforeunload', (e) => {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

/**
 * 设置特殊功能按钮
 */
function setupSpecialButtons() {
    // FFprobe 测试
    const testFfprobeBtn = document.getElementById('test-ffprobe');
    if (testFfprobeBtn) {
        testFfprobeBtn.addEventListener('click', testFfprobeAvailability);
    }

    // 浏览默认路径
    const browsePathBtn = document.getElementById('browse-default-path');
    if (browsePathBtn) {
        browsePathBtn.addEventListener('click', browseDefaultPath);
    }

    // 清除最近路径
    const clearRecentBtn = document.getElementById('clear-recent-paths');
    if (clearRecentBtn) {
        clearRecentBtn.addEventListener('click', clearRecentPaths);
    }

    // 添加自定义扩展名
    const addExtBtn = document.getElementById('add-custom-ext');
    if (addExtBtn) {
        addExtBtn.addEventListener('click', addCustomExtension);
    }

    // 自定义扫描格式相关
    const enableCustomFormatCheckbox = document.getElementById('enable-custom-scan-format');
    if (enableCustomFormatCheckbox) {
        enableCustomFormatCheckbox.addEventListener('change', toggleCustomFormatContainer);
    }

    const addPatternBtn = document.getElementById('add-pattern-btn');
    if (addPatternBtn) {
        addPatternBtn.addEventListener('click', addScanPattern);
    }

    const newPatternInput = document.getElementById('new-pattern');
    if (newPatternInput) {
        newPatternInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addScanPattern();
            }
        });
    }

    // 清理缓存
    const clearCacheBtn = document.getElementById('clear-cache');
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', clearCache);
    }

    // 系统诊断
    const systemInfoBtn = document.getElementById('system-info');
    if (systemInfoBtn) {
        systemInfoBtn.addEventListener('click', showSystemInfo);
    }

    const testPerfBtn = document.getElementById('test-performance');
    if (testPerfBtn) {
        testPerfBtn.addEventListener('click', testPerformance);
    }

    const checkDepsBtn = document.getElementById('check-dependencies');
    if (checkDepsBtn) {
        checkDepsBtn.addEventListener('click', checkDependencies);
    }

    const generateReportBtn = document.getElementById('generate-report');
    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', generateDiagnosticReport);
    }

    // 导入导出设置
    const exportBtn = document.getElementById('export-settings');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportSettings);
    }

    const importBtn = document.getElementById('import-settings');
    if (importBtn) {
        importBtn.addEventListener('click', importSettings);
    }

    // 关于页面按钮
    const checkUpdatesBtn = document.getElementById('check-updates');
    if (checkUpdatesBtn) {
        checkUpdatesBtn.addEventListener('click', checkForUpdates);
    }

    const viewChangelogBtn = document.getElementById('view-changelog');
    if (viewChangelogBtn) {
        viewChangelogBtn.addEventListener('click', viewChangelog);
    }

    const reportIssueBtn = document.getElementById('report-issue');
    if (reportIssueBtn) {
        reportIssueBtn.addEventListener('click', reportIssue);
    }

    // 高级设置按钮
    const clearAllDataBtn = document.getElementById('clear-all-data');
    if (clearAllDataBtn) {
        clearAllDataBtn.addEventListener('click', clearAllData);
    }

    const resetToDefaultsBtn = document.getElementById('reset-to-defaults');
    if (resetToDefaultsBtn) {
        resetToDefaultsBtn.addEventListener('click', () => {
            showConfirmDialog(
                '重置设置',
                '确定要将所有设置重置为默认值吗？此操作不可撤销。',
                resetToDefaults
            );
        });
    }
}

/**
 * 切换标签页
 */
function switchTab(tabId) {
    // 移除所有活动状态
    elements.navTabs.forEach(tab => tab.classList.remove('active'));
    elements.tabContents.forEach(content => content.classList.remove('active'));

    // 激活选中的标签
    const activeTab = document.querySelector(`[data-tab="${tabId}"]`);
    const activeContent = document.getElementById(`${tabId}-tab`);

    if (activeTab && activeContent) {
        activeTab.classList.add('active');
        activeContent.classList.add('active');
    }
}

/**
 * 标记设置已更改
 */
function markAsChanged() {
    hasUnsavedChanges = true;
    elements.saveButton.disabled = false;
    elements.saveStatus.textContent = '有未保存的更改';
    elements.saveStatus.className = 'status-text';
}

/**
 * 加载设置
 */
async function loadSettings() {
    try {
        const savedSettings = await ipcRenderer.invoke('get-settings');
        currentSettings = { ...DEFAULT_SETTINGS, ...savedSettings };
        applySettingsToUI();
        hasUnsavedChanges = false;
        elements.saveStatus.textContent = '设置已加载';
        elements.saveStatus.className = 'status-text success';
    } catch (error) {
        console.error('加载设置失败:', error);
        elements.saveStatus.textContent = '加载设置失败';
        elements.saveStatus.className = 'status-text error';
    }
}

/**
 * 将设置应用到UI
 */
function applySettingsToUI() {
    // 复选框
    Object.keys(currentSettings).forEach(key => {
        const element = document.getElementById(key.replace(/([A-Z])/g, '-$1').toLowerCase());
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = currentSettings[key];
            } else if (element.type === 'range' || element.type === 'number') {
                element.value = currentSettings[key];
                // 更新显示值
                const valueDisplay = document.getElementById(element.id + '-value');
                if (valueDisplay) {
                    valueDisplay.textContent = currentSettings[key];
                }
            } else if (element.type === 'text') {
                element.value = currentSettings[key];
            } else if (element.tagName === 'SELECT') {
                element.value = currentSettings[key];
            }
        }
    });

    // 单选按钮（主题选择）
    const themeRadios = document.querySelectorAll('input[name="theme"]');
    themeRadios.forEach(radio => {
        radio.checked = radio.value === currentSettings.theme;
    });

    // 扩展名复选框
    updateExtensionCheckboxes();

    // 自定义扫描格式
    updateCustomScanFormatUI();

    // 性能设置
    updatePerformanceSettingsUI();

    // 最近路径
    updateRecentPaths();
}

/**
 * 更新扩展名复选框
 */
function updateExtensionCheckboxes() {
    // 重新生成扩展名列表
    generateExtensionList();
    // 更新统计信息
    updateExtensionStats();
    // 更新自定义扩展名管理
    updateCustomExtensionsList();
}

/**
 * 生成扩展名列表
 */
function generateExtensionList() {
    const container = document.getElementById('extension-list');
    if (!container) return;

    // 预设扩展名
    const presetExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];

    // 获取所有扩展名（预设 + 自定义）
    const allExtensions = [...new Set([...presetExtensions, ...currentSettings.supportedExtensions])];

    container.innerHTML = '';

    allExtensions.forEach(ext => {
        const isCustom = !presetExtensions.includes(ext);
        const isChecked = currentSettings.supportedExtensions.includes(ext);

        const extensionElement = document.createElement('label');
        extensionElement.className = `extension-item ${isCustom ? 'custom' : ''}`;

        extensionElement.innerHTML = `
            <input type="checkbox" id="ext-${ext.substring(1)}" ${isChecked ? 'checked' : ''}>
            <span class="checkmark"></span>
            <span class="extension-name">${ext}</span>
            ${isCustom ? `<button class="extension-remove" onclick="removeCustomExtension('${ext}')" title="删除此扩展名">×</button>` : ''}
        `;

        // 添加事件监听
        const checkbox = extensionElement.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                if (!currentSettings.supportedExtensions.includes(ext)) {
                    currentSettings.supportedExtensions.push(ext);
                }
            } else {
                const index = currentSettings.supportedExtensions.indexOf(ext);
                if (index > -1) {
                    currentSettings.supportedExtensions.splice(index, 1);
                }
            }
            updateExtensionStats();
            markAsChanged();
        });

        container.appendChild(extensionElement);
    });
}

/**
 * 更新最近路径显示
 */
async function updateRecentPaths() {
    const container = document.getElementById('recent-paths');
    if (!container) return;

    try {
        // 从后端获取最新的最近路径
        const recentPaths = await ipcRenderer.invoke('get-recent-paths');
        currentSettings.recentPaths = recentPaths;

        container.innerHTML = '';

        if (!recentPaths || recentPaths.length === 0) {
            container.innerHTML = '<p style="color: #6c757d; text-align: center; padding: 20px;">暂无最近使用的目录</p>';
            return;
        }

        recentPaths.forEach((pathItem, index) => {
            const pathElement = document.createElement('div');
            pathElement.className = 'recent-path-item';

            // 截断过长的路径显示
            const displayPath = pathItem.length > 50 ?
                '...' + pathItem.substring(pathItem.length - 47) : pathItem;

            pathElement.innerHTML = `
                <span class="recent-path-text" title="${pathItem}">${displayPath}</span>
                <div class="recent-path-actions">
                    <button class="btn btn-small btn-primary" onclick="selectRecentPath('${pathItem.replace(/'/g, "\\'")}')">选择</button>
                    <button class="recent-path-remove" onclick="removeRecentPath(${index})">×</button>
                </div>
            `;
            container.appendChild(pathElement);
        });
    } catch (error) {
        console.error('更新最近路径失败:', error);
        container.innerHTML = '<p style="color: #dc3545; text-align: center; padding: 20px;">加载最近路径失败</p>';
    }
}

/**
 * 选择最近路径
 */
async function selectRecentPath(selectedPath) {
    try {
        // 验证路径是否仍然有效
        const validation = await ipcRenderer.invoke('validate-path', selectedPath);

        if (validation.valid) {
            const pathInput = document.getElementById('default-scan-path');
            pathInput.value = selectedPath;
            currentSettings.defaultScanPath = selectedPath;
            markAsChanged();
            showStatusMessage('路径已选择', 'success');
        } else {
            showStatusMessage(`路径无效: ${validation.error}`, 'error');
            // 从最近路径中移除无效路径
            currentSettings.recentPaths = currentSettings.recentPaths.filter(p => p !== selectedPath);
            updateRecentPaths();
        }
    } catch (error) {
        console.error('选择最近路径失败:', error);
        showStatusMessage(`选择路径失败: ${error.message}`, 'error');
    }
}

/**
 * 移除最近路径
 */
async function removeRecentPath(index) {
    try {
        if (index >= 0 && index < currentSettings.recentPaths.length) {
            currentSettings.recentPaths.splice(index, 1);

            // 同步到后端
            const settings = { ...currentSettings };
            await ipcRenderer.invoke('save-settings', settings);

            updateRecentPaths();
            showStatusMessage('路径已移除', 'success');
        }
    } catch (error) {
        console.error('移除最近路径失败:', error);
        showStatusMessage(`移除失败: ${error.message}`, 'error');
    }
}

/**
 * 显示状态消息
 */
function showStatusMessage(message, type = 'info') {
    const statusElement = elements.saveStatus;
    if (!statusElement) return;

    statusElement.textContent = message;
    statusElement.className = `status-text ${type}`;

    // 自动清除消息
    setTimeout(() => {
        if (statusElement.textContent === message) {
            statusElement.textContent = '';
            statusElement.className = 'status-text';
        }
    }, 3000);
}

/**
 * 保存设置
 */
async function saveSettings() {
    try {
        elements.saveButton.disabled = true;
        elements.saveStatus.textContent = '正在保存...';
        elements.saveStatus.className = 'status-text';

        // 收集UI中的设置
        collectSettingsFromUI();

        // 发送到主进程保存
        await ipcRenderer.invoke('save-settings', currentSettings);

        hasUnsavedChanges = false;
        elements.saveStatus.textContent = '设置已保存';
        elements.saveStatus.className = 'status-text success';

        // 应用设置到主应用
        await ipcRenderer.invoke('apply-settings', currentSettings);

    } catch (error) {
        console.error('保存设置失败:', error);
        elements.saveStatus.textContent = '保存失败';
        elements.saveStatus.className = 'status-text error';
    } finally {
        elements.saveButton.disabled = false;
    }
}

/**
 * 从UI收集设置
 */
function collectSettingsFromUI() {
    // 复选框
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        const key = checkbox.id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        if (key in currentSettings) {
            currentSettings[key] = checkbox.checked;
        }
    });

    // 滑块和数字输入
    const ranges = document.querySelectorAll('input[type="range"], input[type="number"]');
    ranges.forEach(input => {
        const key = input.id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        if (key in currentSettings) {
            currentSettings[key] = parseFloat(input.value);
        }
    });

    // 文本输入
    const textInputs = document.querySelectorAll('input[type="text"]');
    textInputs.forEach(input => {
        const key = input.id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        if (key in currentSettings) {
            currentSettings[key] = input.value;
        }
    });

    // 选择框
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        const key = select.id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        if (key in currentSettings) {
            currentSettings[key] = select.value;
        }
    });

    // 主题选择
    const themeRadio = document.querySelector('input[name="theme"]:checked');
    if (themeRadio) {
        currentSettings.theme = themeRadio.value;
    }

    // 支持的扩展名
    const supportedExtensions = [];
    const extensionCheckboxes = document.querySelectorAll('.extension-item input[type="checkbox"]');
    extensionCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            const ext = '.' + checkbox.id.replace('ext-', '');
            supportedExtensions.push(ext);
        }
    });
    currentSettings.supportedExtensions = supportedExtensions;
}

/**
 * 取消更改
 */
function cancelChanges() {
    if (hasUnsavedChanges) {
        showConfirmDialog(
            '取消更改',
            '确定要放弃所有未保存的更改并关闭设置吗？',
            () => {
                // 放弃更改并关闭窗口
                ipcRenderer.invoke('close-settings-window');
            }
        );
    } else {
        // 没有未保存的更改，直接关闭窗口
        ipcRenderer.invoke('close-settings-window');
    }
}

/**
 * 重置为默认设置
 */
function resetToDefaults() {
    currentSettings = { ...DEFAULT_SETTINGS };
    applySettingsToUI();
    markAsChanged();
    elements.saveStatus.textContent = '已重置为默认设置';
    elements.saveStatus.className = 'status-text';
}

/**
 * 关闭设置窗口
 */
function closeSettings() {
    if (hasUnsavedChanges) {
        showConfirmDialog(
            '关闭设置',
            '有未保存的更改，确定要关闭吗？',
            () => {
                ipcRenderer.invoke('close-settings-window');
            }
        );
    } else {
        ipcRenderer.invoke('close-settings-window');
    }
}

/**
 * 显示确认对话框
 */
function showConfirmDialog(title, message, onConfirm, onCancel = null) {
    elements.confirmTitle.textContent = title;
    elements.confirmMessage.textContent = message;
    elements.confirmDialog.style.display = 'flex';

    // 存储确认和取消回调
    elements.confirmDialog.onConfirm = onConfirm;
    elements.confirmDialog.onCancel = onCancel;
}

/**
 * 隐藏确认对话框
 */
function hideConfirmDialog() {
    elements.confirmDialog.style.display = 'none';
    elements.confirmDialog.onConfirm = null;
    elements.confirmDialog.onCancel = null;
}

/**
 * 处理确认对话框的确认按钮
 */
function handleConfirmYes() {
    if (elements.confirmDialog.onConfirm) {
        elements.confirmDialog.onConfirm();
    }
    hideConfirmDialog();
}

/**
 * 处理确认对话框的取消按钮
 */
function handleConfirmNo() {
    if (elements.confirmDialog.onCancel) {
        elements.confirmDialog.onCancel();
    }
    hideConfirmDialog();
}

/**
 * 测试FFprobe可用性
 */
async function testFfprobeAvailability() {
    const button = document.getElementById('test-ffprobe');
    const status = elements.ffprobeStatus;

    button.disabled = true;
    button.textContent = '测试中...';
    status.innerHTML = '';

    try {
        const result = await ipcRenderer.invoke('test-ffprobe');

        if (result.available) {
            status.innerHTML = '<span class="status-indicator success">FFprobe 可用</span>';
            status.innerHTML += `<br><small>版本: ${result.version || '未知'}</small>`;
        } else {
            status.innerHTML = '<span class="status-indicator error">FFprobe 不可用</span>';
            status.innerHTML += `<br><small>错误: ${result.error || '未知错误'}</small>`;
        }
    } catch (error) {
        status.innerHTML = '<span class="status-indicator error">测试失败</span>';
        status.innerHTML += `<br><small>错误: ${error.message}</small>`;
    } finally {
        button.disabled = false;
        button.textContent = '测试 FFprobe 可用性';
    }
}

/**
 * 浏览默认路径
 */
async function browseDefaultPath() {
    const browseBtn = document.getElementById('browse-default-path');
    const pathInput = document.getElementById('default-scan-path');

    try {
        // 显示加载状态
        browseBtn.disabled = true;
        browseBtn.textContent = '浏览中...';

        console.log('开始浏览目录...');

        const result = await ipcRenderer.invoke('browse-directory');

        console.log('浏览目录结果:', result);

        if (result && result.error) {
            throw new Error(result.error);
        }

        if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
            const selectedPath = result.filePaths[0];

            // 验证路径
            const validation = await ipcRenderer.invoke('validate-path', selectedPath);

            if (validation.valid) {
                pathInput.value = selectedPath;
                currentSettings.defaultScanPath = selectedPath;

                // 添加到最近路径
                await ipcRenderer.invoke('add-recent-path', selectedPath);

                // 更新最近路径显示
                updateRecentPaths();

                markAsChanged();

                // 显示成功提示
                showStatusMessage('路径设置成功', 'success');
            } else {
                throw new Error(validation.error || '路径验证失败');
            }
        }
    } catch (error) {
        console.error('浏览目录失败:', error);
        showStatusMessage(`浏览目录失败: ${error.message}`, 'error');

        // 如果是权限问题，提供更详细的提示
        if (error.message.includes('权限') || error.message.includes('access')) {
            showStatusMessage('请检查目录访问权限，或尝试以管理员身份运行应用', 'error');
        }
    } finally {
        // 恢复按钮状态
        browseBtn.disabled = false;
        browseBtn.textContent = '浏览';
    }
}

/**
 * 清除最近路径
 */
async function clearRecentPaths() {
    showConfirmDialog(
        '清除历史',
        '确定要清除所有最近使用的目录吗？',
        async () => {
            try {
                const result = await ipcRenderer.invoke('clear-recent-paths');
                if (result.success) {
                    currentSettings.recentPaths = [];
                    updateRecentPaths();
                    markAsChanged();
                    showStatusMessage('历史记录已清除', 'success');
                } else {
                    throw new Error(result.error || '清除失败');
                }
            } catch (error) {
                console.error('清除最近路径失败:', error);
                showStatusMessage(`清除失败: ${error.message}`, 'error');
            }
        }
    );
}

/**
 * 更新扩展名统计
 */
function updateExtensionStats() {
    const selectedCount = document.getElementById('selected-count');
    if (selectedCount) {
        selectedCount.textContent = currentSettings.supportedExtensions.length;
    }
}

/**
 * 更新自定义扩展名列表
 */
function updateCustomExtensionsList() {
    const container = document.getElementById('custom-extensions-list');
    if (!container) return;

    const presetExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];
    const customExtensions = currentSettings.supportedExtensions.filter(ext => !presetExtensions.includes(ext));

    container.innerHTML = '';

    if (customExtensions.length === 0) {
        container.innerHTML = '<div class="empty-extensions">暂无自定义扩展名</div>';
        return;
    }

    customExtensions.forEach(ext => {
        const tagElement = document.createElement('div');
        tagElement.className = 'custom-extension-tag';
        tagElement.innerHTML = `
            <span>${ext}</span>
            <button class="remove-tag" onclick="removeCustomExtension('${ext}')" title="删除此扩展名">×</button>
        `;
        container.appendChild(tagElement);
    });
}

/**
 * 移除自定义扩展名
 */
function removeCustomExtension(extension) {
    const index = currentSettings.supportedExtensions.indexOf(extension);
    if (index > -1) {
        currentSettings.supportedExtensions.splice(index, 1);
        updateExtensionCheckboxes();
        markAsChanged();
        showStatusMessage(`已移除扩展名: ${extension}`, 'success');
    }
}

/**
 * 验证扩展名格式
 */
function validateExtension(extension) {
    // 基本验证：必须以.开头，只包含字母数字
    const validFormat = /^\.[a-zA-Z0-9]+$/;
    return validFormat.test(extension);
}

/**
 * 添加自定义扩展名
 */
function addCustomExtension() {
    const input = document.getElementById('custom-extensions');
    const extensions = input.value.split(',').map(ext => ext.trim()).filter(ext => ext);

    if (extensions.length === 0) {
        showStatusMessage('请输入有效的扩展名', 'error');
        return;
    }

    let addedCount = 0;
    let errorCount = 0;

    extensions.forEach(ext => {
        // 确保以.开头
        if (!ext.startsWith('.')) ext = '.' + ext;

        // 验证格式
        if (!validateExtension(ext)) {
            errorCount++;
            return;
        }

        // 检查是否已存在
        if (currentSettings.supportedExtensions.includes(ext)) {
            return;
        }

        // 添加到设置
        currentSettings.supportedExtensions.push(ext);
        addedCount++;
    });

    input.value = '';

    if (addedCount > 0) {
        updateExtensionCheckboxes();
        markAsChanged();
        showStatusMessage(`已添加 ${addedCount} 个扩展名`, 'success');
    }

    if (errorCount > 0) {
        showStatusMessage(`${errorCount} 个扩展名格式无效`, 'warning');
    }
}

/**
 * 设置预设扩展名组
 */
function setPresetExtensions(preset) {
    const presets = {
        common: ['.mp4', '.mkv', '.avi', '.mov'],
        all: ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.ts', '.rmvb', '.3gp', '.asf', '.divx'],
        hd: ['.mp4', '.mkv', '.mov', '.webm', '.m4v'],
        none: []
    };

    if (presets[preset]) {
        currentSettings.supportedExtensions = [...presets[preset]];
        updateExtensionCheckboxes();
        markAsChanged();
        showStatusMessage(`已应用${getPresetName(preset)}`, 'success');
    }
}

/**
 * 获取预设名称
 */
function getPresetName(preset) {
    const names = {
        common: '常用格式',
        all: '全部格式',
        hd: '高清格式',
        none: '清除选择'
    };
    return names[preset] || preset;
}

/**
 * 检测GPU加速状态
 */
async function detectGPUAcceleration() {
    try {
        const gpuInfo = await ipcRenderer.invoke('get-gpu-info');
        const gpuStatusElement = document.getElementById('gpu-status');
        const gpuDetailsElement = document.getElementById('gpu-details');

        if (gpuStatusElement) {
            if (gpuInfo.error) {
                gpuStatusElement.textContent = '检测失败';
                gpuStatusElement.className = 'status-error';
            } else if (gpuInfo.hardwareAcceleration) {
                gpuStatusElement.textContent = '已启用';
                gpuStatusElement.className = 'status-success';
            } else {
                gpuStatusElement.textContent = '已禁用';
                gpuStatusElement.className = 'status-warning';
            }
        }

        if (gpuDetailsElement && !gpuInfo.error) {
            const details = [];
            if (gpuInfo.gpuInfo && gpuInfo.gpuInfo.auxAttributes) {
                details.push(`GPU: ${gpuInfo.gpuInfo.auxAttributes.vendorId || '未知'}`);
            }
            if (gpuInfo.gpuFeatureStatus) {
                const features = Object.keys(gpuInfo.gpuFeatureStatus).filter(key =>
                    gpuInfo.gpuFeatureStatus[key] === 'enabled'
                ).length;
                details.push(`启用功能: ${features}`);
            }
            gpuDetailsElement.textContent = details.join(' | ') || '无详细信息';
        }

        return gpuInfo;
    } catch (error) {
        console.error('检测GPU加速失败:', error);
        const gpuStatusElement = document.getElementById('gpu-status');
        if (gpuStatusElement) {
            gpuStatusElement.textContent = '检测失败';
            gpuStatusElement.className = 'status-error';
        }
        return null;
    }
}

/**
 * 测试GPU性能
 */
async function testGPUPerformance() {
    const testButton = document.getElementById('test-gpu-performance');
    const resultElement = document.getElementById('gpu-test-result');

    if (testButton) {
        testButton.disabled = true;
        testButton.textContent = '测试中...';
    }

    try {
        const result = await ipcRenderer.invoke('test-gpu-performance');

        if (resultElement) {
            if (result.error) {
                resultElement.textContent = `测试失败: ${result.error}`;
                resultElement.className = 'test-result error';
            } else {
                const fps = result.fps || 0;
                const renderTime = result.renderTime || 0;
                let performance = '差';

                if (fps > 45) performance = '优秀';
                else if (fps > 30) performance = '良好';
                else if (fps > 15) performance = '一般';

                resultElement.innerHTML = `
                    <div>渲染时间: ${renderTime}ms</div>
                    <div>估算FPS: ${fps}</div>
                    <div>性能评级: ${performance}</div>
                `;
                resultElement.className = `test-result ${performance === '优秀' ? 'success' : performance === '良好' ? 'warning' : 'error'}`;
            }
        }

        showStatusMessage('GPU性能测试完成', 'success');
    } catch (error) {
        console.error('GPU性能测试失败:', error);
        if (resultElement) {
            resultElement.textContent = `测试失败: ${error.message}`;
            resultElement.className = 'test-result error';
        }
        showStatusMessage('GPU性能测试失败', 'error');
    } finally {
        if (testButton) {
            testButton.disabled = false;
            testButton.textContent = '测试GPU性能';
        }
    }
}

/**
 * 更新动画速度显示
 */
function updateAnimationSpeedDisplay() {
    const slider = document.getElementById('animation-speed');
    const display = document.getElementById('animation-speed-value');

    if (slider && display) {
        const value = parseFloat(slider.value);
        display.textContent = `${value}x`;

        // 实时预览动画速度
        const root = document.documentElement;
        root.style.setProperty('--animation-speed', value.toString());

        // 更新动画持续时间
        const baseTransitionDuration = 0.3;
        const adjustedDuration = baseTransitionDuration / value;
        root.style.setProperty('--transition-duration', `${adjustedDuration}s`);
        root.style.setProperty('--transition-duration-fast', `${adjustedDuration * 0.5}s`);
        root.style.setProperty('--transition-duration-slow', `${adjustedDuration * 1.5}s`);
    }
}

/**
 * 更新性能设置UI
 */
function updatePerformanceSettingsUI() {
    // GPU加速复选框
    const gpuAccelerationCheckbox = document.getElementById('gpu-acceleration');
    if (gpuAccelerationCheckbox) {
        gpuAccelerationCheckbox.checked = currentSettings.gpuAcceleration !== false;
    }

    // 平滑动画复选框
    const smoothAnimationsCheckbox = document.getElementById('smooth-animations');
    if (smoothAnimationsCheckbox) {
        smoothAnimationsCheckbox.checked = currentSettings.smoothAnimations !== false;
    }

    // 动画速度滑块
    const animationSpeedSlider = document.getElementById('animation-speed');
    if (animationSpeedSlider) {
        animationSpeedSlider.value = currentSettings.animationSpeed || 1.0;
        updateAnimationSpeedDisplay();
    }

    // 扫描性能设置
    const maxConcurrentInput = document.getElementById('max-concurrent');
    if (maxConcurrentInput) {
        maxConcurrentInput.value = currentSettings.maxConcurrent || 4;
    }

    const cacheSizeInput = document.getElementById('cache-size');
    if (cacheSizeInput) {
        cacheSizeInput.value = currentSettings.cacheSize || 200;
    }

    const enableCacheCheckbox = document.getElementById('enable-cache');
    if (enableCacheCheckbox) {
        enableCacheCheckbox.checked = currentSettings.enableCache !== false;
    }

    const autoCleanupCheckbox = document.getElementById('auto-cleanup');
    if (autoCleanupCheckbox) {
        autoCleanupCheckbox.checked = currentSettings.autoCleanup !== false;
    }

    // 自动检测GPU状态
    setTimeout(() => {
        detectGPUAcceleration();
        updatePerformanceStats();
    }, 500);
}

/**
 * 更新性能统计信息
 */
async function updatePerformanceStats() {
    try {
        // 获取缓存统计信息
        const cacheStats = await ipcRenderer.invoke('get-cache-stats');

        // 获取内存使用情况
        const memoryInfo = await ipcRenderer.invoke('get-system-info');

        // 更新内存使用显示
        const memoryUsageElement = document.getElementById('memory-usage');
        if (memoryUsageElement && memoryInfo) {
            const memoryUsageMB = Math.round(memoryInfo.memoryUsage / 1024 / 1024);
            memoryUsageElement.textContent = `${memoryUsageMB} MB`;
        }

        // 更新缓存使用显示
        const cacheUsageElement = document.getElementById('cache-usage');
        if (cacheUsageElement && cacheStats) {
            cacheUsageElement.textContent = `${cacheStats.cacheSizeMB} / ${cacheStats.maxCacheSizeMB} MB`;
        }

        // 更新已扫描文件数
        const scannedFilesElement = document.getElementById('scanned-files');
        if (scannedFilesElement && cacheStats) {
            scannedFilesElement.textContent = `${cacheStats.scanCacheSize} 个缓存项`;
        }

        console.log('性能统计已更新:', { cacheStats, memoryInfo });
    } catch (error) {
        console.error('更新性能统计失败:', error);
    }
}

/**
 * 清理缓存
 */
async function clearCache() {
    try {
        const result = await ipcRenderer.invoke('clear-path-cache');

        if (result.success) {
            showStatusMessage('缓存已清理', 'success');

            // 更新性能统计显示
            setTimeout(() => {
                updatePerformanceStats();
            }, 500);
        } else {
            showStatusMessage('清理缓存失败', 'error');
        }
    } catch (error) {
        console.error('清理缓存失败:', error);
        showStatusMessage('清理缓存失败', 'error');
    }
}

/**
 * 切换自定义格式容器显示
 */
function toggleCustomFormatContainer() {
    const checkbox = document.getElementById('enable-custom-scan-format');
    const container = document.getElementById('custom-format-container');

    if (checkbox && container) {
        if (checkbox.checked) {
            container.style.display = 'block';
            // 初始化模式列表
            updatePatternList();
        } else {
            container.style.display = 'none';
        }
        markAsChanged();
    }
}

/**
 * 添加扫描模式
 */
function addScanPattern() {
    const input = document.getElementById('new-pattern');
    const pattern = input.value.trim();

    if (!pattern) {
        showStatusMessage('请输入有效的扫描模式', 'error');
        return;
    }

    // 验证模式格式
    if (!validatePattern(pattern)) {
        showStatusMessage('模式格式无效，请检查通配符使用', 'error');
        return;
    }

    // 检查是否已存在
    if (currentSettings.scanFormatPatterns.includes(pattern)) {
        showStatusMessage('该模式已存在', 'warning');
        return;
    }

    // 添加到设置
    currentSettings.scanFormatPatterns.push(pattern);
    input.value = '';
    updatePatternList();
    markAsChanged();
    showStatusMessage('扫描模式已添加', 'success');
}

/**
 * 移除扫描模式
 */
function removeScanPattern(index) {
    if (index >= 0 && index < currentSettings.scanFormatPatterns.length) {
        const removedPattern = currentSettings.scanFormatPatterns.splice(index, 1)[0];
        updatePatternList();
        markAsChanged();
        showStatusMessage(`已移除模式: ${removedPattern}`, 'success');
    }
}

/**
 * 验证模式格式
 */
function validatePattern(pattern) {
    // 基本验证：检查是否包含有效字符
    const validChars = /^[a-zA-Z0-9\*\?\[\]\-_\.\s\u4e00-\u9fff]+$/;
    return validChars.test(pattern);
}

/**
 * 更新模式列表显示
 */
function updatePatternList() {
    const container = document.getElementById('pattern-list');
    if (!container) return;

    container.innerHTML = '';

    if (currentSettings.scanFormatPatterns.length === 0) {
        container.innerHTML = '<div class="empty-patterns">暂无自定义扫描模式</div>';
        return;
    }

    currentSettings.scanFormatPatterns.forEach((pattern, index) => {
        const patternElement = document.createElement('div');
        patternElement.className = 'pattern-item';
        patternElement.innerHTML = `
            <span class="pattern-text">${pattern}</span>
            <button class="pattern-remove" onclick="removeScanPattern(${index})" title="删除此模式">×</button>
        `;
        container.appendChild(patternElement);
    });
}

/**
 * 更新自定义扫描格式UI
 */
function updateCustomScanFormatUI() {
    const enableCheckbox = document.getElementById('enable-custom-scan-format');
    const container = document.getElementById('custom-format-container');
    const scanModeSelect = document.getElementById('scan-mode');

    if (enableCheckbox) {
        enableCheckbox.checked = currentSettings.enableCustomScanFormat;
    }

    if (container) {
        container.style.display = currentSettings.enableCustomScanFormat ? 'block' : 'none';
    }

    if (scanModeSelect) {
        scanModeSelect.value = currentSettings.scanMode || 'all';
    }

    // 更新模式列表
    updatePatternList();
}

/**
 * 清理缓存
 */
async function clearCache() {
    try {
        await ipcRenderer.invoke('clear-cache');
        elements.saveStatus.textContent = '缓存已清理';
        elements.saveStatus.className = 'status-text success';
        updatePerformanceStats();
    } catch (error) {
        console.error('清理缓存失败:', error);
        elements.saveStatus.textContent = '清理缓存失败';
        elements.saveStatus.className = 'status-text error';
    }
}

/**
 * 更新性能统计
 */
async function updatePerformanceStats() {
    try {
        const stats = await ipcRenderer.invoke('get-performance-stats');

        const memoryUsage = document.getElementById('memory-usage');
        const cacheUsage = document.getElementById('cache-usage');
        const scannedFiles = document.getElementById('scanned-files');

        if (memoryUsage) memoryUsage.textContent = formatBytes(stats.memoryUsage || 0);
        if (cacheUsage) cacheUsage.textContent = formatBytes(stats.cacheSize || 0);
        if (scannedFiles) scannedFiles.textContent = stats.scannedFiles || 0;
    } catch (error) {
        console.error('获取性能统计失败:', error);
    }
}

/**
 * 格式化字节数
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 显示系统信息
 */
async function showSystemInfo() {
    try {
        const info = await ipcRenderer.invoke('get-system-info');
        const results = document.getElementById('diagnostic-results');

        results.innerHTML = `
            <h4>系统信息</h4>
            <p><strong>操作系统:</strong> ${info.platform} ${info.arch}</p>
            <p><strong>Node.js 版本:</strong> ${info.nodeVersion}</p>
            <p><strong>Electron 版本:</strong> ${info.electronVersion}</p>
            <p><strong>Chrome 版本:</strong> ${info.chromeVersion}</p>
            <p><strong>总内存:</strong> ${formatBytes(info.totalMemory)}</p>
            <p><strong>可用内存:</strong> ${formatBytes(info.freeMemory)}</p>
            <p><strong>CPU 核心数:</strong> ${info.cpuCount}</p>
        `;
        results.classList.add('show');
    } catch (error) {
        console.error('获取系统信息失败:', error);
    }
}

/**
 * 性能测试
 */
async function testPerformance() {
    try {
        const button = document.getElementById('test-performance');
        button.disabled = true;
        button.textContent = '测试中...';

        const result = await ipcRenderer.invoke('test-performance');
        const results = document.getElementById('diagnostic-results');

        results.innerHTML = `
            <h4>性能测试结果</h4>
            <p><strong>文件扫描速度:</strong> ${result.scanSpeed} 文件/秒</p>
            <p><strong>内存使用:</strong> ${formatBytes(result.memoryUsage)}</p>
            <p><strong>渲染性能:</strong> ${result.renderPerformance} FPS</p>
            <p><strong>磁盘读取速度:</strong> ${formatBytes(result.diskSpeed)}/秒</p>
        `;
        results.classList.add('show');

        button.textContent = '性能测试';
        button.disabled = false;
    } catch (error) {
        console.error('性能测试失败:', error);
    }
}

/**
 * 检查依赖
 */
async function checkDependencies() {
    try {
        const result = await ipcRenderer.invoke('check-dependencies');
        const results = document.getElementById('diagnostic-results');

        let html = '<h4>依赖检查结果</h4>';
        result.forEach(dep => {
            const status = dep.available ? '✅' : '❌';
            html += `<p>${status} <strong>${dep.name}:</strong> ${dep.status}</p>`;
        });

        results.innerHTML = html;
        results.classList.add('show');
    } catch (error) {
        console.error('检查依赖失败:', error);
    }
}

/**
 * 生成诊断报告
 */
async function generateDiagnosticReport() {
    try {
        const result = await ipcRenderer.invoke('generate-diagnostic-report');
        if (result.success) {
            elements.saveStatus.textContent = `诊断报告已保存到: ${result.path}`;
            elements.saveStatus.className = 'status-text success';
        }
    } catch (error) {
        console.error('生成诊断报告失败:', error);
        elements.saveStatus.textContent = '生成诊断报告失败';
        elements.saveStatus.className = 'status-text error';
    }
}

/**
 * 导出设置
 */
async function exportSettings() {
    try {
        const result = await ipcRenderer.invoke('export-settings');
        if (result.success) {
            elements.saveStatus.textContent = `设置已导出到: ${result.path}`;
            elements.saveStatus.className = 'status-text success';
        }
    } catch (error) {
        console.error('导出设置失败:', error);
        elements.saveStatus.textContent = '导出设置失败';
        elements.saveStatus.className = 'status-text error';
    }
}

/**
 * 导入设置
 */
async function importSettings() {
    try {
        const result = await ipcRenderer.invoke('import-settings');
        if (result.success) {
            currentSettings = { ...DEFAULT_SETTINGS, ...result.settings };
            applySettingsToUI();
            markAsChanged();
            elements.saveStatus.textContent = '设置已导入';
            elements.saveStatus.className = 'status-text success';
        }
    } catch (error) {
        console.error('导入设置失败:', error);
        elements.saveStatus.textContent = '导入设置失败';
        elements.saveStatus.className = 'status-text error';
    }
}

/**
 * 清除所有数据
 */
async function clearAllData() {
    showConfirmDialog(
        '清除所有数据',
        '⚠️ 警告：此操作将清除所有应用数据，包括设置、缓存和历史记录。\n\n此操作不可撤销，确定要继续吗？',
        async () => {
            try {
                await ipcRenderer.invoke('clear-all-data');
                elements.saveStatus.textContent = '所有数据已清除';
                elements.saveStatus.className = 'status-text success';

                // 重置为默认设置
                currentSettings = { ...DEFAULT_SETTINGS };
                applySettingsToUI();
                hasUnsavedChanges = false;
            } catch (error) {
                console.error('清除数据失败:', error);
                elements.saveStatus.textContent = '清除数据失败';
                elements.saveStatus.className = 'status-text error';
            }
        }
    );
}

/**
 * 检查更新
 */
async function checkForUpdates() {
    try {
        const button = document.getElementById('check-updates');
        button.disabled = true;
        button.textContent = '检查中...';

        const result = await ipcRenderer.invoke('check-for-updates');

        if (result.hasUpdate) {
            elements.saveStatus.textContent = `发现新版本: ${result.version}`;
            elements.saveStatus.className = 'status-text success';
        } else {
            elements.saveStatus.textContent = '当前已是最新版本';
            elements.saveStatus.className = 'status-text';
        }

        button.textContent = '检查更新';
        button.disabled = false;
    } catch (error) {
        console.error('检查更新失败:', error);
        elements.saveStatus.textContent = '检查更新失败';
        elements.saveStatus.className = 'status-text error';
    }
}

/**
 * 查看更新日志
 */
function viewChangelog() {
    ipcRenderer.invoke('open-external', 'https://github.com/your-repo/releases');
}

/**
 * 反馈问题
 */
function reportIssue() {
    ipcRenderer.invoke('open-external', 'https://github.com/bailin633/Local-Movie-Information-Screening/issues');
}

/**
 * 加载系统信息到关于页面
 */
async function loadSystemInfo() {
    try {
        const info = await ipcRenderer.invoke('get-system-info');

        const electronVersion = document.getElementById('electron-version');
        const nodeVersion = document.getElementById('node-version');
        const chromeVersion = document.getElementById('chrome-version');
        const osInfo = document.getElementById('os-info');

        if (electronVersion) electronVersion.textContent = info.electronVersion || '--';
        if (nodeVersion) nodeVersion.textContent = info.nodeVersion || '--';
        if (chromeVersion) chromeVersion.textContent = info.chromeVersion || '--';
        if (osInfo) osInfo.textContent = `${info.platform} ${info.arch}` || '--';
    } catch (error) {
        console.error('加载系统信息失败:', error);
    }
}

/**
 * 初始化UI组件
 */
function initializeUIComponents() {
    // 定期更新性能统计
    setInterval(updatePerformanceStats, 5000);

    // 初始化滑块值显示
    elements.sliders.forEach(slider => {
        const valueDisplay = document.getElementById(slider.id + '-value');
        if (valueDisplay) {
            valueDisplay.textContent = slider.value;
        }
    });
}

/**
 * 检查是否为高级设置选项
 */
function isAdvancedSetting(element) {
    const advancedSettings = [
        'debug-mode',
        'dev-tools',
        'log-level'
    ];
    return advancedSettings.includes(element.id);
}

/**
 * 处理高级设置更改
 */
function handleAdvancedSettingChange(element) {
    const settingName = getSettingDisplayName(element.id);
    const warningMessage = getAdvancedSettingWarning(element.id);

    showConfirmDialog(
        '高级设置确认',
        `您正在修改高级设置"${settingName}"。\n\n${warningMessage}\n\n确定要继续吗？`,
        () => {
            markAsChanged();
        },
        () => {
            // 取消更改，恢复原值
            revertSettingValue(element);
        }
    );
}

/**
 * 获取设置显示名称
 */
function getSettingDisplayName(settingId) {
    const displayNames = {
        'debug-mode': '调试模式',
        'dev-tools': '开发者工具',
        'log-level': '日志级别'
    };
    return displayNames[settingId] || settingId;
}

/**
 * 获取高级设置警告信息
 */
function getAdvancedSettingWarning(settingId) {
    const warnings = {
        'debug-mode': '启用调试模式可能会影响应用性能，并在控制台显示详细的调试信息。',
        'dev-tools': '启用开发者工具将允许访问浏览器开发者控制台，这可能会暴露敏感信息。',
        'log-level': '更改日志级别可能会影响日志文件的大小和应用性能。'
    };
    return warnings[settingId] || '此设置可能会影响应用的行为或性能。';
}

/**
 * 恢复设置值
 */
function revertSettingValue(element) {
    const key = element.id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    if (key in currentSettings) {
        if (element.type === 'checkbox') {
            element.checked = currentSettings[key];
        } else {
            element.value = currentSettings[key];
        }
    }
}

/**
 * 处理键盘快捷键
 */
function handleKeyboardShortcuts(e) {
    // Ctrl+S 保存
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveSettings();
    }

    // Escape 关闭对话框或窗口
    if (e.key === 'Escape') {
        if (elements.confirmDialog.style.display === 'flex') {
            hideConfirmDialog();
        } else {
            closeSettings();
        }
    }

    // Ctrl+R 重置
    if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        showConfirmDialog(
            '重置设置',
            '确定要将所有设置重置为默认值吗？',
            resetToDefaults
        );
    }
}

/**
 * 处理自动刷新设置切换
 */
async function handleAutoRefreshToggle(enabled) {
    try {
        if (enabled) {
            // 启用自动刷新 - 开始监控当前扫描路径
            const currentPath = currentSettings.defaultScanPath;
            if (currentPath) {
                const result = await ipcRenderer.invoke('start-file-watching', currentPath);
                if (result.success) {
                    showStatusMessage('文件监控已启用', 'success');
                } else {
                    showStatusMessage(`启用文件监控失败: ${result.error}`, 'error');
                }
            }
        } else {
            // 禁用自动刷新 - 停止文件监控
            const result = await ipcRenderer.invoke('stop-file-watching');
            if (result.success) {
                showStatusMessage('文件监控已禁用', 'info');
            }
        }
    } catch (error) {
        console.error('切换自动刷新失败:', error);
        showStatusMessage(`切换自动刷新失败: ${error.message}`, 'error');
    }
}

/**
 * 处理按元数据整理功能
 */
async function handleOrganizeByMetadata(enabled) {
    if (enabled) {
        showStatusMessage('按元数据整理功能已启用', 'success');

        // 显示整理选项对话框
        showOrganizeOptionsDialog();
    } else {
        showStatusMessage('按元数据整理功能已禁用', 'info');
    }
}

/**
 * 显示整理选项对话框
 */
function showOrganizeOptionsDialog() {
    // 创建整理选项对话框
    const dialog = document.createElement('div');
    dialog.className = 'modal organize-dialog';
    dialog.innerHTML = `
        <div class="modal-content">
            <h3>文件整理选项</h3>
            <div class="organize-options">
                <div class="option-group">
                    <h4>整理规则</h4>
                    <label class="setting-label">
                        <input type="checkbox" id="organize-by-resolution" checked>
                        <span class="checkmark"></span>
                        <span class="label-title">按分辨率分类</span>
                    </label>
                    <label class="setting-label">
                        <input type="checkbox" id="organize-by-codec">
                        <span class="checkmark"></span>
                        <span class="label-title">按编码格式分类</span>
                    </label>
                    <label class="setting-label">
                        <input type="checkbox" id="organize-by-duration">
                        <span class="checkmark"></span>
                        <span class="label-title">按时长分类</span>
                    </label>
                    <label class="setting-label">
                        <input type="checkbox" id="organize-by-filesize">
                        <span class="checkmark"></span>
                        <span class="label-title">按文件大小分类</span>
                    </label>
                </div>
                <div class="option-group">
                    <h4>操作模式</h4>
                    <label class="setting-label">
                        <input type="radio" name="organize-mode" value="move" checked>
                        <span class="checkmark"></span>
                        <span class="label-title">移动文件</span>
                    </label>
                    <label class="setting-label">
                        <input type="radio" name="organize-mode" value="copy">
                        <span class="checkmark"></span>
                        <span class="label-title">复制文件</span>
                    </label>
                </div>
            </div>
            <div class="modal-actions">
                <button id="preview-organize" class="btn btn-secondary">预览</button>
                <button id="start-organize" class="btn btn-primary">开始整理</button>
                <button id="cancel-organize" class="btn btn-secondary">取消</button>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);
    dialog.style.display = 'flex';

    // 绑定事件
    document.getElementById('preview-organize').addEventListener('click', previewOrganization);
    document.getElementById('start-organize').addEventListener('click', startOrganization);
    document.getElementById('cancel-organize').addEventListener('click', () => {
        document.body.removeChild(dialog);
    });
}

/**
 * 预览文件整理
 */
async function previewOrganization() {
    try {
        const sourcePath = currentSettings.defaultScanPath;
        if (!sourcePath) {
            showStatusMessage('请先设置默认扫描目录', 'error');
            return;
        }

        const rules = getOrganizeRules();
        showStatusMessage('正在预览整理操作...', 'info');

        const result = await ipcRenderer.invoke('preview-file-organization', sourcePath, rules);

        if (result.success) {
            showOrganizePreview(result);
        } else {
            showStatusMessage(`预览失败: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('预览整理失败:', error);
        showStatusMessage(`预览失败: ${error.message}`, 'error');
    }
}

/**
 * 开始文件整理
 */
async function startOrganization() {
    try {
        const sourcePath = currentSettings.defaultScanPath;
        if (!sourcePath) {
            showStatusMessage('请先设置默认扫描目录', 'error');
            return;
        }

        const rules = getOrganizeRules();
        const mode = document.querySelector('input[name="organize-mode"]:checked').value;

        showStatusMessage('正在整理文件...', 'info');

        const result = await ipcRenderer.invoke('organize-files-by-metadata', sourcePath, {
            mode,
            rules,
            dryRun: false
        });

        if (result.success) {
            showStatusMessage(`整理完成！处理了 ${result.processed} 个文件`, 'success');
            if (result.errors.length > 0) {
                console.warn('整理过程中的错误:', result.errors);
            }
        } else {
            showStatusMessage(`整理失败: ${result.error}`, 'error');
        }

        // 关闭对话框
        const dialog = document.querySelector('.organize-dialog');
        if (dialog) {
            document.body.removeChild(dialog);
        }
    } catch (error) {
        console.error('文件整理失败:', error);
        showStatusMessage(`整理失败: ${error.message}`, 'error');
    }
}

/**
 * 获取整理规则
 */
function getOrganizeRules() {
    return {
        byResolution: document.getElementById('organize-by-resolution').checked,
        byCodec: document.getElementById('organize-by-codec').checked,
        byDuration: document.getElementById('organize-by-duration').checked,
        byFileSize: document.getElementById('organize-by-filesize').checked
    };
}

/**
 * 显示整理预览
 */
function showOrganizePreview(result) {
    const previewDialog = document.createElement('div');
    previewDialog.className = 'modal preview-dialog';

    let previewContent = '<h3>整理预览</h3>';

    if (result.operations.length === 0) {
        previewContent += '<p>没有找到需要整理的文件</p>';
    } else {
        previewContent += `<p>将要处理 ${result.operations.length} 个文件：</p>`;
        previewContent += '<div class="preview-list">';

        result.operations.slice(0, 10).forEach(op => {
            const fileName = op.source.split(/[/\\]/).pop();
            const targetDir = op.target.split(/[/\\]/).slice(-2, -1)[0];
            previewContent += `
                <div class="preview-item">
                    <span class="file-name">${fileName}</span>
                    <span class="arrow">→</span>
                    <span class="target-dir">${targetDir}/</span>
                </div>
            `;
        });

        if (result.operations.length > 10) {
            previewContent += `<p>...还有 ${result.operations.length - 10} 个文件</p>`;
        }

        previewContent += '</div>';
    }

    previewDialog.innerHTML = `
        <div class="modal-content">
            ${previewContent}
            <div class="modal-actions">
                <button id="close-preview" class="btn btn-secondary">关闭</button>
            </div>
        </div>
    `;

    document.body.appendChild(previewDialog);
    previewDialog.style.display = 'flex';

    document.getElementById('close-preview').addEventListener('click', () => {
        document.body.removeChild(previewDialog);
    });
}

/**
 * 添加路径验证的实时反馈
 */
function setupPathValidation() {
    const pathInput = document.getElementById('default-scan-path');
    if (!pathInput) return;

    let validationTimeout;

    pathInput.addEventListener('input', (e) => {
        clearTimeout(validationTimeout);

        const path = e.target.value.trim();
        if (!path) {
            e.target.classList.remove('valid', 'invalid');
            return;
        }

        // 延迟验证，避免频繁调用
        validationTimeout = setTimeout(async () => {
            try {
                const validation = await ipcRenderer.invoke('validate-path', path);

                if (validation.valid) {
                    e.target.classList.remove('invalid');
                    e.target.classList.add('valid');
                } else {
                    e.target.classList.remove('valid');
                    e.target.classList.add('invalid');
                    e.target.title = validation.error;
                }
            } catch (error) {
                console.error('路径验证失败:', error);
                e.target.classList.remove('valid');
                e.target.classList.add('invalid');
            }
        }, 500);
    });
}

/**
 * 添加帮助提示
 */
function setupHelpTooltips() {
    const helpElements = document.querySelectorAll('[data-help]');

    helpElements.forEach(element => {
        const helpText = element.getAttribute('data-help');
        if (helpText) {
            element.title = helpText;
            element.style.cursor = 'help';
        }
    });
}

/**
 * 初始化所有增强功能
 */
function initializeEnhancements() {
    setupPathValidation();
    setupHelpTooltips();

    // 监听来自主进程的文件系统变化事件
    if (typeof ipcRenderer !== 'undefined' && ipcRenderer.on) {
        ipcRenderer.on('file-system-changed', (event, data) => {
            console.log('检测到文件系统变化:', data);
            showStatusMessage(`检测到文件变化: ${data.filename}`, 'info');
        });

        // 监听整理进度事件
        ipcRenderer.on('organize-progress', (event, progress) => {
            updateOrganizeProgress(progress);
        });
    }

    // 添加按元数据整理的事件监听
    const organizeCheckbox = document.getElementById('organize-by-metadata');
    if (organizeCheckbox) {
        organizeCheckbox.addEventListener('change', (e) => {
            handleOrganizeByMetadata(e.target.checked);
        });
    }

    // 添加自定义扩展名按钮
    const addExtBtn = document.getElementById('add-custom-ext');
    if (addExtBtn) {
        addExtBtn.addEventListener('click', addCustomExtension);
    }

    // 预设扩展名组按钮
    const presetButtons = {
        'preset-common': 'common',
        'preset-all': 'all',
        'preset-hd': 'hd',
        'preset-none': 'none'
    };

    Object.entries(presetButtons).forEach(([buttonId, preset]) => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', () => setPresetExtensions(preset));
        }
    });

    // 自定义扩展名输入框回车事件
    const customExtInput = document.getElementById('custom-extensions');
    if (customExtInput) {
        customExtInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addCustomExtension();
            }
        });
    }

    // GPU检测按钮
    const detectGpuBtn = document.getElementById('detect-gpu');
    if (detectGpuBtn) {
        detectGpuBtn.addEventListener('click', detectGPUAcceleration);
    }

    // GPU性能测试按钮
    const testGpuBtn = document.getElementById('test-gpu-performance');
    if (testGpuBtn) {
        testGpuBtn.addEventListener('click', testGPUPerformance);
    }

    // 动画速度滑块
    const animationSpeedSlider = document.getElementById('animation-speed');
    if (animationSpeedSlider) {
        animationSpeedSlider.addEventListener('input', updateAnimationSpeedDisplay);
        animationSpeedSlider.addEventListener('change', () => {
            currentSettings.animationSpeed = parseFloat(animationSpeedSlider.value);
            markAsChanged();
        });
    }

    // 平滑动画复选框
    const smoothAnimationsCheckbox = document.getElementById('smooth-animations');
    if (smoothAnimationsCheckbox) {
        smoothAnimationsCheckbox.addEventListener('change', (e) => {
            currentSettings.smoothAnimations = e.target.checked;

            // 立即应用动画设置
            const root = document.documentElement;
            if (e.target.checked) {
                root.classList.remove('no-animations');
            } else {
                root.classList.add('no-animations');
            }

            markAsChanged();
        });
    }

    // GPU加速复选框
    const gpuAccelerationCheckbox = document.getElementById('gpu-acceleration');
    if (gpuAccelerationCheckbox) {
        gpuAccelerationCheckbox.addEventListener('change', (e) => {
            currentSettings.gpuAcceleration = e.target.checked;

            // 立即应用GPU设置
            const root = document.documentElement;
            if (e.target.checked) {
                root.classList.remove('no-gpu');
            } else {
                root.classList.add('no-gpu');
            }

            markAsChanged();
            showStatusMessage('GPU加速设置将在重启应用后生效', 'warning');
        });
    }

    // 扫描性能设置事件监听器
    const maxConcurrentInput = document.getElementById('max-concurrent');
    if (maxConcurrentInput) {
        maxConcurrentInput.addEventListener('change', (e) => {
            const value = parseInt(e.target.value);
            if (value >= 1 && value <= 16) {
                currentSettings.maxConcurrent = value;
                markAsChanged();
                showStatusMessage(`并发扫描数已设置为 ${value}`, 'success');
            }
        });
    }

    const cacheSizeInput = document.getElementById('cache-size');
    if (cacheSizeInput) {
        cacheSizeInput.addEventListener('change', (e) => {
            const value = parseInt(e.target.value);
            if (value >= 50 && value <= 1000) {
                currentSettings.cacheSize = value;
                markAsChanged();
                showStatusMessage(`缓存大小已设置为 ${value} MB`, 'success');
            }
        });
    }

    const enableCacheCheckbox = document.getElementById('enable-cache');
    if (enableCacheCheckbox) {
        enableCacheCheckbox.addEventListener('change', (e) => {
            currentSettings.enableCache = e.target.checked;
            markAsChanged();
            showStatusMessage(e.target.checked ? '缓存已启用' : '缓存已禁用', 'info');
        });
    }

    const autoCleanupCheckbox = document.getElementById('auto-cleanup');
    if (autoCleanupCheckbox) {
        autoCleanupCheckbox.addEventListener('change', (e) => {
            currentSettings.autoCleanup = e.target.checked;
            markAsChanged();
            showStatusMessage(e.target.checked ? '自动清理已启用' : '自动清理已禁用', 'info');
        });
    }

    // 清理缓存按钮
    const clearCacheBtn = document.getElementById('clear-cache');
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', clearCache);
    }
}

/**
 * 更新整理进度
 */
function updateOrganizeProgress(progress) {
    const statusEl = elements.saveStatus;
    if (statusEl) {
        statusEl.textContent = `${progress.message} (${progress.percentage}%)`;
        statusEl.className = 'status-text info';
    }
}

/**
 * 处理自动刷新设置切换
 */
async function handleAutoRefreshToggle(enabled) {
    try {
        if (enabled) {
            // 启用自动刷新
            const result = await ipcRenderer.invoke('start-file-watching', currentSettings.defaultScanPath || '');
            if (result.success) {
                showStatusMessage('自动刷新已启用', 'success');
                console.log('文件监控已启动');
            } else {
                showStatusMessage(`启用自动刷新失败: ${result.error}`, 'error');
                // 如果启动失败，取消勾选
                const autoRefreshCheckbox = document.getElementById('auto-refresh');
                if (autoRefreshCheckbox) {
                    autoRefreshCheckbox.checked = false;
                    currentSettings.autoRefresh = false;
                }
            }
        } else {
            // 禁用自动刷新
            const result = await ipcRenderer.invoke('stop-file-watching');
            if (result.success) {
                showStatusMessage('自动刷新已禁用', 'success');
                console.log('文件监控已停止');
            } else {
                showStatusMessage(`禁用自动刷新失败: ${result.error}`, 'error');
            }
        }
    } catch (error) {
        console.error('切换自动刷新失败:', error);
        showStatusMessage(`操作失败: ${error.message}`, 'error');

        // 发生错误时恢复复选框状态
        const autoRefreshCheckbox = document.getElementById('auto-refresh');
        if (autoRefreshCheckbox) {
            autoRefreshCheckbox.checked = !enabled;
            currentSettings.autoRefresh = !enabled;
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initializeSettings();
    initializeEnhancements();
});
