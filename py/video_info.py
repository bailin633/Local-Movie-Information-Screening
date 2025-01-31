import os
import sys
import json
import cv2
import re
import subprocess

sys.stdout.reconfigure(encoding='utf-8')

def get_video_info(file_path):
    video = cv2.VideoCapture(file_path)
    fps = video.get(cv2.CAP_PROP_FPS)
    width = int(video.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(video.get(cv2.CAP_PROP_FRAME_HEIGHT))
    frame_count = int(video.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = frame_count / fps if fps > 0 else 0
    video.release()

    file_size = os.path.getsize(file_path)
    file_size_mb = file_size / (1024 * 1024)  # 转换为MB

    # 使用 ffprobe 获取码率信息
    try:
        result = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0',
                                 '-count_packets', '-show_entries', 'stream=bit_rate',
                                 '-of', 'csv=p=0', file_path],
                                capture_output=True, text=True)
        bitrate = int(result.stdout.strip())
        if bitrate == 0:  # 如果 ffprobe 返回 0，我们计算一个估计值
            bitrate = (file_size * 8) / duration if duration > 0 else None
    except Exception as e:
        print(f"获取码率信息时出错: {str(e)}", file=sys.stderr)
        # 计算估计的码率
        bitrate = (file_size * 8) / duration if duration > 0 else None

    return {
        "name": os.path.basename(file_path),
        "resolution": f"{width}x{height}",
        "frameRate": fps,
        "duration": duration,
        "fileSize": file_size_mb,
        "bitrate": bitrate  # 新增：比特率
    }

def get_title_from_nfo(nfo_path):
    with open(nfo_path, 'r', encoding='utf-8') as nfo_file:
        nfo_content = nfo_file.read()
        title_match = re.search(r'<title>(.*?)</title>', nfo_content)
        if title_match:
            return title_match.group(1)
    return None

def scan_directory(dir_path):
    video_extensions = ['.mp4', '.avi', '.mkv', '.mov']
    video_files = []

    total_files = sum(1 for root, dirs, files in os.walk(dir_path)
                      for file in files if any(file.lower().endswith(ext) for ext in video_extensions))

    processed_files = 0
    for root, dirs, files in os.walk(dir_path):
        for file in files:
            if any(file.lower().endswith(ext) for ext in video_extensions):
                full_path = os.path.join(root, file)
                try:
                    video_info = get_video_info(full_path)

                    # 检查 movie.nfo 文件
                    nfo_path = os.path.join(root, 'movie.nfo')
                    if os.path.exists(nfo_path):
                        title = get_title_from_nfo(nfo_path)
                        if title:
                            video_info['name'] = title

                    video_files.append(video_info)

                    processed_files += 1
                    progress = processed_files / total_files
                    print(f"进度：{processed_files}/{total_files}", flush=True)

                    print(f"处理文件: {video_info['name']}")
                    print(f"  分辨率: {video_info['resolution']}")
                    print(f"  帧率: {video_info['frameRate']}")
                    print(f"  时长: {video_info['duration']} 秒")
                    print(f"  文件大小: {video_info['fileSize']} MB")
                    print(f"  码率: {video_info['bitrate'] / 1000000:.2f} Mbps" if video_info['bitrate'] else "  码率: N/A")
                    print("-" * 40)
                except Exception as e:
                    print(f"处理文件 {full_path} 时出错: {str(e)}", file=sys.stderr)

    return video_files

if __name__ == "__main__":
    if len(sys.argv) > 1:
        directory = sys.argv[1]
        result = scan_directory(directory)
        print("\n最终结果:")
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(json.dumps({"error": "未提供目录"}, ensure_ascii=False))