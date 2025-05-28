const { ipcRenderer } = require('electron');

let openFilePathButton;
let selectedFilePath = null;
let selectedVideo = null;
let allVideos = []; // 存储所有视频信息

document.addEventListener('DOMContentLoaded', () => {
    const selectPathButton = document.getElementById('select-path');
    const pathInput = document.getElementById('path-input');
    openFilePathButton = document.getElementById('open-file-path');
    const resizer = document.querySelector('.resizer');
    const leftPane = document.querySelector('.video-overview');
    const rightPane = document.querySelector('.video-info');
    const container = document.querySelector('.main-content');
    const loadingContainer = document.getElementById('loading-container');
    const progressBar = document.getElementById('progress');
    const loadingText = document.getElementById('loading-text');
    const resolutionOptions = document.querySelectorAll('input[name="resolution"]');
    const videoTableBody = document.getElementById('video-table').querySelector('tbody');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');

    openFilePathButton.style.display = 'none';
    let currentResolution = '全部';

    document.getElementById('settings-button').addEventListener('click', () => {
        ipcRenderer.send('open-settings-window');
    });

    document.getElementById('python-diagnostic-button').addEventListener('click', async () => {
        try {
            const result = await ipcRenderer.invoke('open-python-diagnostic');
            if (!result) {
                alert('无法打开Python诊断工具');
            }
        } catch (error) {
            console.error('打开Python诊断工具失败:', error);
            alert('打开Python诊断工具失败: ' + error.message);
        }
    });

    function filterVideosByResolution(resolution) {
        const resolutionRanges = {
            '全部': { min: 0, max: Infinity },
            '1080P': { min: 1920, max: 1920 },
            '2K': { min: 2048, max: 2560 },
            '4K': { min: 3840, max: 4096 }
        };

        const range = resolutionRanges[resolution];
        const filteredVideos = allVideos.filter(info => {
            const videoWidth = parseInt(info.resolution.split('x')[0], 10);
            return videoWidth >= range.min && videoWidth <= range.max;
        });

        displayVideos(filteredVideos);
    }

    function displayVideos(videos) {
        videoTableBody.innerHTML = '';
        videos.forEach(info => {
            const row = createVideoElement(info);
            videoTableBody.appendChild(row);
        });
    }

    resolutionOptions.forEach(option => {
        option.addEventListener('change', () => {
            currentResolution = option.value;
            filterVideosByResolution(currentResolution);
        });
    });

    let isResizing = false;
    let initialX;
    let initialLeftWidth;
    let containerWidth;
    let animationId;

    // 优化的拖拽处理函数
    function handleMouseMove(e) {
        if (!isResizing) return;

        // 取消之前的动画帧
        if (animationId) {
            cancelAnimationFrame(animationId);
        }

        // 使用 requestAnimationFrame 优化性能
        animationId = requestAnimationFrame(() => {
            const dx = e.clientX - initialX;
            const newLeftWidth = initialLeftWidth + dx;

            // 设置最小和最大宽度限制（更合理的比例）
            const resizerWidth = 20; // 包括margin的resizer宽度
            const minWidth = Math.max(250, containerWidth * 0.2); // 最小20%
            const maxWidth = Math.min(containerWidth - 250 - resizerWidth, containerWidth * 0.8); // 最大80%

            // 边界检查和平滑处理
            let clampedWidth = Math.max(minWidth, Math.min(maxWidth, newLeftWidth));

            const leftPercentage = (clampedWidth / containerWidth) * 100;

            // 使用更高效的样式更新，避免重排
            leftPane.style.flexBasis = `${leftPercentage}%`;
            leftPane.style.flexGrow = '0';
            leftPane.style.flexShrink = '0';

            // 右侧面板自动填充剩余空间
            rightPane.style.flexBasis = 'auto';
            rightPane.style.flexGrow = '1';
            rightPane.style.flexShrink = '1';
        });
    }

    // 开始拖拽的通用函数
    function startResize(clientX) {
        isResizing = true;
        initialX = clientX;
        initialLeftWidth = leftPane.getBoundingClientRect().width;
        containerWidth = container.getBoundingClientRect().width;

        // 添加拖拽状态类
        document.body.classList.add('resizing');
        resizer.classList.add('active');

        // 阻止文本选择
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';
    }

    // 结束拖拽的通用函数
    function endResize() {
        if (isResizing) {
            isResizing = false;

            // 清理动画帧
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }

            // 移除拖拽状态类
            document.body.classList.remove('resizing');
            resizer.classList.remove('active');

            // 恢复默认样式
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        }
    }

    // 鼠标事件
    resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startResize(e.clientX);
    });

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', endResize);

    // 触摸事件支持（移动设备）
    resizer.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
            startResize(e.touches[0].clientX);
        }
    });

    document.addEventListener('touchmove', (e) => {
        if (isResizing && e.touches.length === 1) {
            handleMouseMove({ clientX: e.touches[0].clientX });
        }
    });

    document.addEventListener('touchend', endResize);

    // 窗口大小改变时重新计算容器宽度
    window.addEventListener('resize', () => {
        if (!isResizing) {
            containerWidth = container.getBoundingClientRect().width;
        }
    });

    selectPathButton.addEventListener('click', () => {
        ipcRenderer.send('open-file-dialog');
    });

    pathInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            const path = pathInput.value.trim();
            if (path) {
                handlePathSelection(path);
            }
        }
    });

    function handlePathSelection(path) {
        loadingContainer.style.display = 'block';
        progressBar.style.width = '0%';
        loadingText.textContent = '加载中 (0%)';

        // 获取当前设置并传递扫描选项
        ipcRenderer.invoke('get-settings').then(settings => {
            const scanOptions = {
                scanDepth: settings.scanDepth || 5,
                includeHidden: settings.includeHidden || false,
                supportedExtensions: settings.supportedExtensions || ['.mp4', '.mkv', '.avi', '.mov']
            };

            console.log('使用扫描选项:', scanOptions);
            ipcRenderer.send('scan-directory', path, scanOptions);
        }).catch(error => {
            console.error('获取设置失败，使用默认选项:', error);
            // 使用默认选项
            const defaultScanOptions = {
                scanDepth: 5,
                includeHidden: false,
                supportedExtensions: ['.mp4', '.mkv', '.avi', '.mov']
            };
            ipcRenderer.send('scan-directory', path, defaultScanOptions);
        });
    }

    openFilePathButton.addEventListener('click', () => {
        if (selectedFilePath) {
            ipcRenderer.send('open-file-location', selectedFilePath);
        } else {
            alert('请先选择一个视频文件');
        }
    });

    const playVideoButton = document.getElementById('play-video');

    playVideoButton.addEventListener('click', () => {
        if (selectedVideo && selectedVideo.path) {
            ipcRenderer.send('play-video', selectedVideo.path);
        } else {
            alert('请先选择一个视频');
        }
    });

    // 搜索功能
    searchButton.addEventListener('click', () => {
        const searchTerm = searchInput.value.trim();
        if (searchTerm) {
            ipcRenderer.send('search-videos', searchTerm);
        }
    });

    searchInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            const searchTerm = searchInput.value.trim();
            if (searchTerm) {
                ipcRenderer.send('search-videos', searchTerm);
            }
        }
    });

    // IPC 事件监听
    ipcRenderer.on('selected-directory', (event, path) => {
        pathInput.value = path;
        handlePathSelection(path);
    });

    ipcRenderer.on('scan-progress', (event, progress) => {
        const percentage = Math.round(progress * 100);
        progressBar.style.width = `${percentage}%`;
        loadingText.textContent = `加载中 (${percentage}%)`;
    });

    ipcRenderer.on('video-list', (_, result) => {
        if (result.error) {
            console.error('扫描目录失败:', result.error);
            alert(`扫描目录失败: ${result.error}`);
            loadingContainer.style.display = 'none';
            return;
        }

        if (!Array.isArray(result)) {
            console.error('接收到的视频列表无效:', result);
            alert('接收到的视频列表无效，请重试。');
            loadingContainer.style.display = 'none';
            return;
        }

        allVideos = result.filter(video => video && typeof video === 'object').map(video => {
            if (!video.path) {
                console.warn('视频缺少路径:', video);
            }
            return video;
        });

        if (allVideos.length === 0) {
            console.warn('未找到有效的视频文件');
            alert('未找到有效的视频文件，请检查选择的文件夹。');
        }

        filterVideosByResolution('全部');
        loadingContainer.style.display = 'none';
    });

    ipcRenderer.on('open-file-location-result', (event, result) => {
        if (!result.success) {
            console.error('Failed to open file location:', result.error);
            alert('无法打开文件位置');
        }
    });

    ipcRenderer.on('search-results', (event, results) => {
        displayVideos(results);
    });

    // 监听Python依赖检测结果
    ipcRenderer.on('python-dependencies-check', (event, data) => {
        handleDependencyCheckResult(data);
    });

    // 监听来自设置的默认路径设置
    ipcRenderer.on('set-default-path', (event, defaultPath) => {
        console.log('收到默认路径设置:', defaultPath);
        if (defaultPath && pathInput) {
            pathInput.value = defaultPath;
            // 可选：自动开始扫描
            // handlePathSelection(defaultPath);
        }
    });

    // 监听文件系统变化事件
    ipcRenderer.on('file-system-changed', (event, data) => {
        console.log('检测到文件系统变化:', data);

        // 如果当前有扫描的目录，可以选择重新扫描
        if (pathInput.value && data.isVideo) {
            console.log('检测到视频文件变化，可能需要重新扫描');
            // 这里可以添加自动重新扫描的逻辑
            // 或者显示一个提示让用户选择是否重新扫描
        }
    });
});

function createVideoElement(video) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${truncateName(video.name)}</td>
        <td>${video.resolution || 'N/A'}</td>
        <td>${video.frameRate ? video.frameRate.toFixed(2) + ' fps' : 'N/A'}</td>
    `;
    row.addEventListener('click', () => {
        document.querySelectorAll('#video-table tr').forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');
        selectedVideo = video;
        displayVideoInfo(video);
    });
    return row;
}

function formatFileSize(sizeInMB) {
    if (sizeInMB == null) return 'N/A';
    const units = ['MB', 'GB', 'TB'];
    let size = sizeInMB;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
}

function formatDuration(seconds) {
    if (seconds == null) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}分${remainingSeconds.toString().padStart(2, '0')}秒`;
}

function truncateName(name, maxLength = 12) {
    return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
}

function displayVideoInfo(video) {
    const videoDetails = document.getElementById('video-details');
    const formattedBitrate = video.bitrate != null ? `${video.bitrate.toFixed(2)} Mbps` : 'N/A';
    const codecName = video.codec || 'N/A';

    videoDetails.innerHTML = `
        <p><strong>文件名：</strong>${video.name}</p>
        <p><strong>分辨率：</strong>${video.resolution || 'N/A'} | <strong>码率：</strong>${formattedBitrate} | <strong>编码格式：</strong>${codecName}</p>
        <p><strong>帧率：</strong>${video.frameRate ? video.frameRate.toFixed(2) + ' fps' : 'N/A'}</p>
        <p><strong>大小：</strong>${formatFileSize(video.fileSize)}</p>
        <p><strong>时长：</strong>${formatDuration(video.duration)}</p>
    `;
    selectedFilePath = video.path;
    selectedVideo = video;
    openFilePathButton.style.display = 'inline-block';
}

// 处理Python依赖检测结果
function handleDependencyCheckResult(data) {
    console.log('收到Python依赖检测结果:', data);

    if (data.type === 'missing-essential') {
        // 显示必需库缺失的警告
        showDependencyWarning(
            '⚠️ 缺少必需的Python库',
            `检测到 ${data.result.missingEssential} 个必需的Python库未安装，这可能导致扫描功能无法正常工作。`,
            '立即安装',
            () => openPythonDiagnostic()
        );
    } else if (data.type === 'missing-optional') {
        // 显示可选库缺失的提示
        showDependencyInfo(
            'ℹ️ 可选Python库未安装',
            `检测到 ${data.result.missingOptional} 个可选的Python库未安装，建议安装以获得更好的功能体验。`,
            '查看详情',
            () => openPythonDiagnostic()
        );
    } else if (data.type === 'all-installed') {
        console.log('所有Python依赖库都已安装');
    }
}

// 显示依赖警告（必需库缺失）
function showDependencyWarning(title, message, buttonText, buttonAction) {
    // 创建警告横幅
    const warningBanner = document.createElement('div');
    warningBanner.id = 'dependency-warning';
    warningBanner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background-color: #f39c12;
        color: white;
        padding: 15px;
        text-align: center;
        z-index: 1000;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        font-weight: bold;
    `;

    warningBanner.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto;">
            <div style="flex: 1;">
                <span style="font-size: 16px;">${title}</span>
                <br>
                <span style="font-size: 14px; font-weight: normal;">${message}</span>
            </div>
            <div style="display: flex; gap: 10px;">
                <button onclick="openPythonDiagnostic()" style="
                    background-color: #e67e22;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: bold;
                ">${buttonText}</button>
                <button onclick="closeDependencyWarning()" style="
                    background-color: transparent;
                    color: white;
                    border: 1px solid white;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                ">关闭</button>
            </div>
        </div>
    `;

    // 移除现有的警告（如果有）
    const existingWarning = document.getElementById('dependency-warning');
    if (existingWarning) {
        existingWarning.remove();
    }

    document.body.insertBefore(warningBanner, document.body.firstChild);

    // 调整主内容的上边距
    document.body.style.paddingTop = '80px';
}

// 显示依赖信息（可选库缺失）
function showDependencyInfo(title, message, buttonText, buttonAction) {
    // 创建信息横幅
    const infoBanner = document.createElement('div');
    infoBanner.id = 'dependency-info';
    infoBanner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background-color: #3498db;
        color: white;
        padding: 12px;
        text-align: center;
        z-index: 1000;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;

    infoBanner.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto;">
            <div style="flex: 1;">
                <span style="font-size: 14px;">${title}</span>
                <span style="font-size: 13px; margin-left: 10px;">${message}</span>
            </div>
            <div style="display: flex; gap: 10px;">
                <button onclick="openPythonDiagnostic()" style="
                    background-color: #2980b9;
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                ">${buttonText}</button>
                <button onclick="closeDependencyInfo()" style="
                    background-color: transparent;
                    color: white;
                    border: 1px solid white;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                ">关闭</button>
            </div>
        </div>
    `;

    // 移除现有的信息（如果有）
    const existingInfo = document.getElementById('dependency-info');
    if (existingInfo) {
        existingInfo.remove();
    }

    document.body.insertBefore(infoBanner, document.body.firstChild);

    // 调整主内容的上边距
    document.body.style.paddingTop = '60px';
}

// 打开Python诊断工具
function openPythonDiagnostic() {
    ipcRenderer.invoke('open-python-diagnostic').then(result => {
        if (!result) {
            alert('无法打开Python诊断工具');
        }
    }).catch(error => {
        console.error('打开Python诊断工具失败:', error);
        alert('打开Python诊断工具失败: ' + error.message);
    });
}

// 关闭依赖警告
function closeDependencyWarning() {
    const warning = document.getElementById('dependency-warning');
    if (warning) {
        warning.remove();
        document.body.style.paddingTop = '0';
    }
}

// 关闭依赖信息
function closeDependencyInfo() {
    const info = document.getElementById('dependency-info');
    if (info) {
        info.remove();
        document.body.style.paddingTop = '0';
    }
}