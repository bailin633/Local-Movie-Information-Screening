const { ipcRenderer } = require('electron');

document.getElementById('settings-button').addEventListener('click', () => {
    ipcRenderer.send('open-settings-window');
});

// This function is now moved inside the DOMContentLoaded event listener

document.addEventListener('DOMContentLoaded', () => {
    const selectPathButton = document.getElementById('select-path');
    const pathInput = document.getElementById('path-input');
    const resizer = document.querySelector('.resizer');
    const leftPane = document.querySelector('.video-overview');
    const rightPane = document.querySelector('.video-info');
    const container = document.querySelector('.main-content');
    const loadingContainer = document.getElementById('loading-container');
    const progressBar = document.getElementById('progress');
    const loadingText = document.getElementById('loading-text');
    const resolutionOptions = document.querySelectorAll('input[name="resolution"]');
    const videoTableBody = document.getElementById('video-table').querySelector('tbody');

    let allVideos = []; // 存储所有视频信息
    let currentResolution = '全部'; // 默认选中全部分辨率

    function filterVideosByResolution(resolution) {
        // 定义分辨率范围
        const resolutionRanges = {
            '全部': { min: 0, max: Infinity },
            '1080P': { min: 1920, max: 1920 },
            '2K': { min: 2048, max: 2560 },
            '4K': { min: 3840, max: 4096 }
        };

        const range = resolutionRanges[resolution];

        // 清空当前视频列表
        videoTableBody.innerHTML = '';

        // 过滤并显示符合条件的视频
        allVideos.forEach(info => {
            const videoWidth = parseInt(info.resolution.split('x')[0], 10);
            if (videoWidth >= range.min && videoWidth <= range.max) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${truncateName(info.name)}</td>
                    <td>${info.resolution}</td>
                    <td>${info.frameRate ? info.frameRate.toFixed(2) + ' fps' : 'N/A'}</td>
                `;
                row.addEventListener('click', () => {
                    document.querySelectorAll('#video-table tr').forEach(r => r.classList.remove('selected'));
                    row.classList.add('selected');
                    displayVideoInfo(info);
                });
                videoTableBody.appendChild(row);
            }
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

    // Resizer event listeners
    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        initialX = e.clientX;
        initialLeftWidth = leftPane.getBoundingClientRect().width;
        document.body.classList.add('resizing');
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const dx = e.clientX - initialX;
        const newLeftWidth = initialLeftWidth + dx;
        const containerWidth = container.getBoundingClientRect().width;

        if (newLeftWidth > 100 && newLeftWidth < containerWidth - 100) {
            const leftPercentage = (newLeftWidth / containerWidth) * 100;
            leftPane.style.flex = `0 0 ${leftPercentage}%`;
            rightPane.style.flex = `1`;
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.classList.remove('resizing');
        }
    });

    // 选择路径按钮事件
    selectPathButton.addEventListener('click', () => {
        ipcRenderer.send('open-file-dialog');
    });

    // 路径输入框回车事件
    pathInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            const path = pathInput.value.trim();
            if (path) {
                handlePathSelection(path);
            }
        }
    });

    // 处理路径选择
    function handlePathSelection(path) {
        loadingContainer.style.display = 'block';
        progressBar.style.width = '0%';
        loadingText.textContent = '加载中 (0%)';
        ipcRenderer.send('scan-directory', path);
    }

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

    ipcRenderer.on('video-list', (_, videos) => {
        allVideos = videos; // 存储所有视频信息
        // 触发初始筛选（显示所有视频）
        filterVideosByResolution('全部');
        loadingContainer.style.display = 'none';
    });
});

function createVideoTable(videos) {
    const tableBody = document.querySelector('#video-table tbody');
    tableBody.innerHTML = '';
    videos.forEach((video, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${truncateName(video.name)}</td>
            <td>${video.resolution || 'N/A'}</td>
            <td>${video.frameRate ? video.frameRate.toFixed(2) + ' fps' : 'N/A'}</td>
        `;
        row.addEventListener('click', () => {
            document.querySelectorAll('#video-table tr').forEach(r => r.classList.remove('selected'));
            row.classList.add('selected');
            displayVideoInfo(video);
        });
        tableBody.appendChild(row);
    });
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
    
    // 格式化码率
    const formattedBitrate = video.bitrate != null ? `${video.bitrate.toFixed(2)} Mbps` : 'N/A';
    
    videoDetails.innerHTML = `
        <p><strong>文件名：</strong>${video.name}</p>
        <p><strong>分辨率：</strong>${video.resolution || 'N/A'} | <strong>码率：</strong>${formattedBitrate}</p>
        <p><strong>帧率：</strong>${video.frameRate ? video.frameRate.toFixed(2) + ' fps' : 'N/A'}</p>
        <p><strong>大小：</strong>${formatFileSize(video.fileSize)}</p>
        <p><strong>时长：</strong>${formatDuration(video.duration)}</p>
    `;
    
    console.log('Video info:', video); // 添加这行来调试
}