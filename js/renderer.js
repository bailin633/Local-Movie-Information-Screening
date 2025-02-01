const { ipcRenderer } = require('electron');
// 移除 const path = require('path');

let openFilePathButton;
let selectedFilePath = null;
let selectedVideo = null;

document.getElementById('settings-button').addEventListener('click', () => {
    ipcRenderer.send('open-settings-window');
});

document.addEventListener('DOMContentLoaded', () => {
    const selectPathButton = document.getElementById('select-path');
    const pathInput = document.getElementById('path-input');
    openFilePathButton = document.getElementById('open-file-path'); // 初始化全局变量
    const resizer = document.querySelector('.resizer');

    // 初始时隐藏按钮
    openFilePathButton.style.display = 'none';
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

    // 打开文件路径按钮事件
    openFilePathButton.addEventListener('click', () => {
        console.log('Open file path button clicked');
        if (selectedFilePath) { // 修改这行
            console.log('Sending open-file-location event with path:', selectedFilePath);
            ipcRenderer.send('open-file-location', selectedFilePath);
        } else {
            console.log('No file path selected');
            // 可以在这里添加一个用户提示，比如显示一个错误消息
            alert('请先选择一个视频文件');
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

    ipcRenderer.on('video-list', (_, videos) => {
        allVideos = videos.map(video => {
            if (!video.path) {
                console.warn('Video missing path:', video);
            }
            return video;
        });
        // 触发初始筛选（显示所有视频）
        filterVideosByResolution('全部');
        loadingContainer.style.display = 'none';
    });

    ipcRenderer.on('open-file-location-result', (event, result) => {
        if (result.success) {
            console.log('File location opened successfully');
        } else {
            console.error('Failed to open file location:', result.error);
            // 可以在这里添加一个用户提示，比如显示一个错误消息
        }
    });

    const playVideoButton = document.getElementById('play-video');
    
    function playVideoHandler() {
        console.log('Play button clicked, selectedVideo:', selectedVideo);
        if (selectedVideo && selectedVideo.path) {
            console.log('Attempting to play video:', selectedVideo.path);
            ipcRenderer.send('play-video', selectedVideo.path);
        } else {
            console.log('No video selected or path missing');
            alert('请先选择一个视频');
        }
    }
    
    playVideoButton.addEventListener('click', playVideoHandler);
    
    // 在选择视频的地方（可能是在表格行的点击事件中），更新 selectedVideo
    function updateSelectedVideo(video) {
        selectedVideo = video;
        // 更新 UI 显示选中视频的详细信息
        updateVideoDetails(video);
    }
    
    // 更新视频详细信息的函数
    function updateVideoDetails(video) {
        document.getElementById('video-name').textContent = `名称: ${video.name}`;
        document.getElementById('video-resolution').textContent = `分辨率: ${video.resolution}`;
        document.getElementById('video-frame-rate').textContent = `帧率: ${video.frameRate}`;
        document.getElementById('video-size').textContent = `大小: ${video.fileSize.toFixed(2)} MB`;
        document.getElementById('video-duration').textContent = `时长: ${video.duration.toFixed(2)} 秒`;
    }
});

function createVideoTable(videos) {
    const tableBody = document.querySelector('#video-table tbody');
    tableBody.innerHTML = '';
    videos.forEach((video, index) => {
        const row = createVideoElement(video);
        tableBody.appendChild(row);
    });
}

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
        console.log('Video row clicked, setting selectedVideo:', video);
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
    console.log('Entering displayVideoInfo with video:', video);
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

    // 更新选中的文件路径和选中的视频
    selectedFilePath = video.path;
    selectedVideo = video;
    console.log('Updated selectedVideo:', selectedVideo);

    // 显示打开文件路径按钮
    openFilePathButton.style.display = 'inline-block';

    console.log('Video info:', video);
}