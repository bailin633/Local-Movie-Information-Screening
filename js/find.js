let videoIndex = [];

function initializeSearch(videos) {
    videoIndex = videos.map(video => ({
        ...video,
        searchString: `${video.name} ${video.resolution} ${video.frameRate} ${video.fileSize} ${video.duration}`.toLowerCase()
    }));
}

function searchVideos(query) {
    const searchTerms = query.toLowerCase().split(' ');
    return videoIndex.filter(video => 
        searchTerms.every(term => video.searchString.includes(term))
    );
}

module.exports = { initializeSearch, searchVideos };