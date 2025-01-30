import os
import sys
import json
import cv2

sys.stdout.reconfigure(encoding='utf-8')

def get_video_info(file_path):
    video = cv2.VideoCapture(file_path)
    fps = video.get(cv2.CAP_PROP_FPS)
    width = int(video.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(video.get(cv2.CAP_PROP_FRAME_HEIGHT))
    video.release()
    return {
        "name": os.path.basename(file_path),
        "resolution": f"{width}x{height}",
        "frameRate": f"{fps:.2f}"
    }

def scan_directory(dir_path):
    video_extensions = ['.mp4', '.avi', '.mkv', '.mov']
    video_files = []

    # 首先计算总文件数
    total_files = sum(1 for root, dirs, files in os.walk(dir_path)
                      for file in files if any(file.lower().endswith(ext) for ext in video_extensions))

    processed_files = 0
    for root, dirs, files in os.walk(dir_path):
        for file in files:
            if any(file.lower().endswith(ext) for ext in video_extensions):
                full_path = os.path.join(root, file)
                try:
                    video_info = get_video_info(full_path)
                    video_files.append(video_info)

                    processed_files += 1
                    progress = processed_files / total_files
                    print(f"进度：{processed_files}/{total_files}", flush=True)

                    # 可以保留这些详细输出，但它们不会影响进度显示
                    print(f"处理文件: {video_info['name']}")
                    print(f"  分辨率: {video_info['resolution']}")
                    print(f"  帧率: {video_info['frameRate']}")
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