import os
import sys
import json
import cv2
import re
import subprocess

# 设置标准输出的编码为UTF-8
sys.stdout.reconfigure(encoding='utf-8')

def get_codec_from_extension(file_path):
    """根据文件扩展名推测可能的编码格式"""
    ext = os.path.splitext(file_path)[1].lower()
    extension_codec_map = {
        '.mp4': 'H.264',
        '.mkv': 'H.264/H.265',
        '.avi': 'MPEG-4/Xvid',
        '.mov': 'H.264',
        '.wmv': 'WMV',
        '.flv': 'H.264',
        '.webm': 'VP8/VP9',
        '.m4v': 'H.264'
    }
    return extension_codec_map.get(ext, 'Unknown')

def get_video_info(file_path):
    # 打开视频文件
    video = cv2.VideoCapture(file_path)
    # 获取视频的帧率
    fps = video.get(cv2.CAP_PROP_FPS)
    # 获取视频的宽度
    width = int(video.get(cv2.CAP_PROP_FRAME_WIDTH))
    # 获取视频的高度
    height = int(video.get(cv2.CAP_PROP_FRAME_HEIGHT))
    # 获取视频的总帧数
    frame_count = int(video.get(cv2.CAP_PROP_FRAME_COUNT))
    # 计算视频时长
    duration = frame_count / fps if fps > 0 else 0
    # 释放视频对象
    video.release()

    # 获取文件大小（字节）
    file_size = os.path.getsize(file_path)
    # 将文件大小转换为MB
    file_size_mb = file_size / (1024 * 1024)

    # 使用 ffprobe 获取码率和编码格式信息
    try:
        # 运行ffprobe命令获取视频比特率
        bitrate_result = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0',
                                         '-count_packets', '-show_entries', 'stream=bit_rate',
                                         '-of', 'csv=p=0', file_path],
                                        capture_output=True, text=True)
        # 解析ffprobe的输出结果
        bitrate = int(bitrate_result.stdout.strip())
        if bitrate == 0:  # 如果 ffprobe 返回 0，我们计算一个估计值
            bitrate = (file_size * 8) / duration if duration > 0 else None
    except Exception as e:
        print(f"获取码率信息时出错: {str(e)}", file=sys.stderr)
        # 计算估计的码率
        bitrate = (file_size * 8) / duration if duration > 0 else None

    # 获取编码格式信息
    codec_name = get_codec_from_extension(file_path)  # 默认使用扩展名推测

    try:
        # 尝试使用ffprobe获取详细的编码格式信息
        codec_result = subprocess.run(['ffprobe', '-v', 'quiet', '-select_streams', 'v:0',
                                       '-show_entries', 'stream=codec_name',
                                       '-of', 'csv=p=0', file_path],
                                      capture_output=True, text=True, timeout=10)

        if codec_result.returncode == 0 and codec_result.stdout.strip():
            codec_output = codec_result.stdout.strip()
            if codec_output:
                raw_codec = codec_output.strip()
                # 将常见的编码名称转换为更友好的格式
                codec_mapping = {
                    'h264': 'H.264',
                    'hevc': 'H.265/HEVC',
                    'h265': 'H.265/HEVC',
                    'vp9': 'VP9',
                    'vp8': 'VP8',
                    'av1': 'AV1',
                    'mpeg4': 'MPEG-4',
                    'mpeg2video': 'MPEG-2',
                    'xvid': 'Xvid',
                    'wmv3': 'WMV',
                    'prores': 'ProRes',
                    'libx264': 'H.264',
                    'libx265': 'H.265/HEVC'
                }
                codec_name = codec_mapping.get(raw_codec.lower(), raw_codec)
                print(f"  ffprobe检测到编码格式: {raw_codec} -> {codec_name}")
        else:
            print(f"  ffprobe无法检测编码格式，使用扩展名推测: {codec_name}")

    except FileNotFoundError:
        print(f"  ffprobe未安装，使用扩展名推测编码格式: {codec_name}")
    except subprocess.TimeoutExpired:
        print(f"  ffprobe超时，使用扩展名推测编码格式: {codec_name}")
    except Exception as e:
        print(f"  ffprobe出错: {str(e)}，使用扩展名推测编码格式: {codec_name}")

    # 返回视频信息字典
    return {
        "path": file_path,  # 添加这行
        "name": os.path.basename(file_path),
        "resolution": f"{width}x{height}",
        "frameRate": fps,
        "duration": duration,
        "fileSize": file_size_mb,
        "bitrate": bitrate,
        "codec": codec_name  # 添加编码格式
    }

def get_title_from_nfo(nfo_path):
    # 打开并读取NFO文件
    with open(nfo_path, 'r', encoding='utf-8') as nfo_file:
        nfo_content = nfo_file.read()
        # 使用正则表达式查找标题
        title_match = re.search(r'<title>(.*?)</title>', nfo_content)
        if title_match:
            return title_match.group(1)
    return None

def scan_directory(dir_path):
    # 定义视频文件扩展名
    video_extensions = ['.mp4', '.avi', '.mkv', '.mov']
    video_files = []

    # 计算总文件数
    total_files = sum(1 for root, dirs, files in os.walk(dir_path)
                      for file in files if any(file.lower().endswith(ext) for ext in video_extensions))

    processed_files = 0
    # 遍历目录
    for root, dirs, files in os.walk(dir_path):
        for file in files:
            # 检查文件是否为视频文件
            if any(file.lower().endswith(ext) for ext in video_extensions):
                full_path = os.path.join(root, file)
                try:
                    # 获取视频信息
                    video_info = get_video_info(full_path)

                    # 检查 movie.nfo 文件
                    nfo_path = os.path.join(root, 'movie.nfo')
                    if os.path.exists(nfo_path):
                        title = get_title_from_nfo(nfo_path)
                        if title:
                            video_info['name'] = title

                    video_files.append(video_info)

                    # 更新进度
                    processed_files += 1
                    progress = processed_files / total_files
                    print(f"进度：{processed_files}/{total_files}", flush=True)

                    # 打印处理的文件信息
                    print(f"处理文件: {video_info['name']}")
                    print(f"  路径: {video_info['path']}")  # 添加这行
                    print(f"  分辨率: {video_info['resolution']}")
                    print(f"  帧率: {video_info['frameRate']}")
                    print(f"  时长: {video_info['duration']} 秒")
                    print(f"  文件大小: {video_info['fileSize']} MB")
                    print(f"  码率: {video_info['bitrate'] / 1000000:.2f} Mbps" if video_info['bitrate'] else "  码率: N/A")
                    print(f"  编码格式: {video_info['codec']}")  # 添加编码格式
                    print("-" * 40)
                except Exception as e:
                    # 打印错误信息
                    print(f"处理文件 {full_path} 时出错: {str(e)}", file=sys.stderr)

    return video_files

if __name__ == "__main__":
    # 检查是否提供了目录参数
    if len(sys.argv) > 1:
        directory = sys.argv[1]
        # 扫描目录并获取结果
        result = scan_directory(directory)
        print("\n最终结果:")
        # 打印JSON格式的结果
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        # 如果没有提供目录，打印错误信息
        print(json.dumps({"error": "未提供目录"}, ensure_ascii=False))