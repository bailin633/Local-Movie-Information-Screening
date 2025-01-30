const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const selectPathButton = document.getElementById('select-path');
    const resizer = document.getElementById('resizer');
    const leftPane = document.querySelector('.video-overview');
    const rightPane = document.querySelector('.video-info');
    const container = document.querySelector('.main-content');
    const loadingContainer = document.getElementById('loading-container');
    const progressBar = document.getElementById('progress');
    const loadingText = document.getElementById('loading-text');

    selectPathButton.addEventListener('click', () => {
        ipcRenderer.send('open-file-dialog');
    });

    let isResizing = false;
    let startX;
    let startLeftWidth;

    resizer.addEventListener('mousedown', startResizing);

    function startResizing(e) {
        isResizing = true;
        startX = e.clientX;
        startLeftWidth = leftPane.offsetWidth;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResizing);
        document.body.style.cursor = 'col-resize';
    }

    function handleMouseMove(e) {
        if (!isResizing) return;
        const dx = e.clientX - startX;
        const newLeftWidth = startLeftWidth + dx;
        const containerWidth = container.offsetWidth;

        if (newLeftWidth > 100 && newLeftWidth < containerWidth - 100) {
            leftPane.style.flexBasis = `${newLeftWidth}px`;
            rightPane.style.flexBasis = `${containerWidth - newLeftWidth - resizer.offsetWidth}px`;
        }
    }

    function stopResizing() {
        isResizing = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResizing);
        document.body.style.cursor = '';
    }

    ipcRenderer.on('selected-directory', (event, path) => {
        document.getElementById('path-input').value = path;
        // 显示加载容器并重置进度条
        loadingContainer.style.display = 'block';
        progressBar.style.width = '0%';
        loadingText.textContent = '加载中 (0%)';
        ipcRenderer.send('scan-directory', path);
    });

    ipcRenderer.on('scan-progress', (event, progress) => {
        const percentage = Math.round(progress * 100);
        progressBar.style.width = `${percentage}%`;
        loadingText.textContent = `加载中 (${percentage}%)`;
    });

    ipcRenderer.on('video-list', (_, videos) => {
        // 隐藏加载容器
        loadingContainer.style.display = 'none';

        const tableBody = document.querySelector('#video-table tbody');
        tableBody.innerHTML = '';

        videos.forEach(video => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${truncateName(video.name)}</td>
                <td>${video.resolution || 'N/A'}</td>
                <td>${video.frameRate || 'N/A'}</td>
            `;
            tableBody.appendChild(row);

            row.addEventListener('click', () => displayVideoInfo(video));
        });
    });
});

function truncateName(name, maxLength = 12) {
    return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
}

function displayVideoInfo(video) {
    const videoDetails = document.getElementById('video-details');
    videoDetails.innerHTML = `
        <p><strong>文件名：</strong>${video.name}</p>
        <p><strong>分辨率：</strong>${video.resolution || 'N/A'}</p>
        <p><strong>帧率：</strong>${video.frameRate ? video.frameRate + ' fps' : 'N/A'}</p>
        <p><strong>大小：</strong>${video.size || 'N/A'}</p>
        <p><strong>时长：</strong>${video.duration || 'N/A'}</p>
    `;
}