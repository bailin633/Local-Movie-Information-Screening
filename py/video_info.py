import os
import sys
import json
import cv2
import re
import subprocess
import fnmatch

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

def matches_pattern(filename, patterns):
    """
    检查文件名是否匹配任何一个模式

    Args:
        filename: 文件名
        patterns: 模式列表

    Returns:
        bool: 是否匹配
    """
    if not patterns:
        return True

    for pattern in patterns:
        if fnmatch.fnmatch(filename.lower(), pattern.lower()):
            return True
    return False

def get_pattern_priority(filename, patterns):
    """
    获取文件名在模式中的优先级（匹配的模式越靠前，优先级越高）

    Args:
        filename: 文件名
        patterns: 模式列表

    Returns:
        int: 优先级（0为最高优先级，-1表示不匹配）
    """
    if not patterns:
        return 0

    for i, pattern in enumerate(patterns):
        if fnmatch.fnmatch(filename.lower(), pattern.lower()):
            return i
    return -1

def scan_directory(dir_path, max_depth=5, include_hidden=False, supported_extensions=None,
                  scan_patterns=None, scan_mode='all'):
    """
    扫描目录中的视频文件，支持深度限制和自定义扫描格式

    Args:
        dir_path: 要扫描的目录路径
        max_depth: 最大扫描深度（默认5层）
        include_hidden: 是否包含隐藏文件（默认False）
        supported_extensions: 支持的文件扩展名列表
        scan_patterns: 自定义扫描格式模式列表
        scan_mode: 扫描模式 ('all', 'pattern-only', 'pattern-priority')
    """
    # 定义视频文件扩展名
    if supported_extensions is None:
        video_extensions = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v']
    else:
        video_extensions = supported_extensions

    video_files = []
    processed_files = 0

    # 首先计算总文件数（考虑深度限制）
    total_files = 0
    for root, dirs, files in os.walk(dir_path):
        # 计算当前深度
        current_depth = root[len(dir_path):].count(os.sep)
        if current_depth >= max_depth:
            dirs.clear()  # 不再深入子目录
            continue

        # 过滤隐藏目录
        if not include_hidden:
            dirs[:] = [d for d in dirs if not d.startswith('.')]

        for file in files:
            # 跳过隐藏文件
            if not include_hidden and file.startswith('.'):
                continue

            if any(file.lower().endswith(ext) for ext in video_extensions):
                total_files += 1

    print(f"开始扫描，预计处理 {total_files} 个视频文件，最大深度: {max_depth}")

    # 遍历目录
    for root, dirs, files in os.walk(dir_path):
        # 计算当前深度
        current_depth = root[len(dir_path):].count(os.sep)
        if current_depth >= max_depth:
            dirs.clear()  # 不再深入子目录
            continue

        # 过滤隐藏目录
        if not include_hidden:
            dirs[:] = [d for d in dirs if not d.startswith('.')]

        for file in files:
            # 跳过隐藏文件
            if not include_hidden and file.startswith('.'):
                continue

            # 检查文件是否为视频文件
            if any(file.lower().endswith(ext) for ext in video_extensions):
                # 应用自定义扫描格式过滤
                if scan_mode == 'pattern-only' and scan_patterns:
                    # 仅扫描匹配模式的文件
                    if not matches_pattern(file, scan_patterns):
                        continue

                full_path = os.path.join(root, file)
                try:
                    # 获取视频信息
                    video_info = get_video_info(full_path)
                    video_info['depth'] = current_depth  # 添加深度信息

                    # 添加模式匹配信息
                    if scan_patterns:
                        priority = get_pattern_priority(file, scan_patterns)
                        video_info['pattern_priority'] = priority
                        video_info['matches_pattern'] = priority >= 0

                    # 检查 movie.nfo 文件
                    nfo_path = os.path.join(root, 'movie.nfo')
                    if os.path.exists(nfo_path):
                        title = get_title_from_nfo(nfo_path)
                        if title:
                            video_info['name'] = title

                    video_files.append(video_info)

                    # 更新进度
                    processed_files += 1
                    if total_files > 0:
                        progress = processed_files / total_files
                        print(f"进度：{processed_files}/{total_files}", flush=True)

                    # 打印处理的文件信息
                    print(f"处理文件: {video_info['name']} (深度: {current_depth})")
                    print(f"  路径: {video_info['path']}")
                    print(f"  分辨率: {video_info['resolution']}")
                    print(f"  帧率: {video_info['frameRate']}")
                    print(f"  时长: {video_info['duration']} 秒")
                    print(f"  文件大小: {video_info['fileSize']} MB")
                    print(f"  码率: {video_info['bitrate'] / 1000000:.2f} Mbps" if video_info['bitrate'] else "  码率: N/A")
                    print(f"  编码格式: {video_info['codec']}")
                    print("-" * 40)
                except Exception as e:
                    # 打印错误信息
                    print(f"处理文件 {full_path} 时出错: {str(e)}", file=sys.stderr)

    # 根据扫描模式对结果进行排序
    if scan_mode == 'pattern-priority' and scan_patterns:
        # 按模式优先级排序（匹配的文件优先，然后按模式顺序）
        video_files.sort(key=lambda x: (
            x.get('pattern_priority', 999),  # 匹配的模式优先级（越小越优先）
            not x.get('matches_pattern', False),  # 匹配的文件优先
            x['name'].lower()  # 文件名字母顺序
        ))
        print(f"按模式优先级排序完成，匹配文件: {sum(1 for f in video_files if f.get('matches_pattern', False))}")

    return video_files

if __name__ == "__main__":
    # 检查是否提供了目录参数
    if len(sys.argv) > 1:
        directory = sys.argv[1]

        # 解析可选参数
        max_depth = 5  # 默认深度
        include_hidden = False  # 默认不包含隐藏文件
        supported_extensions = None  # 使用默认扩展名
        scan_patterns = None  # 自定义扫描格式
        scan_mode = 'all'  # 扫描模式

        # 解析命令行参数
        for i in range(2, len(sys.argv)):
            arg = sys.argv[i]
            if arg.startswith('--max-depth='):
                try:
                    max_depth = int(arg.split('=')[1])
                    print(f"设置扫描深度: {max_depth}")
                except ValueError:
                    print(f"无效的深度参数: {arg}", file=sys.stderr)
            elif arg == '--include-hidden':
                include_hidden = True
                print("启用隐藏文件扫描")
            elif arg.startswith('--extensions='):
                try:
                    ext_str = arg.split('=')[1]
                    supported_extensions = [ext.strip() for ext in ext_str.split(',')]
                    print(f"使用自定义扩展名: {supported_extensions}")
                except:
                    print(f"无效的扩展名参数: {arg}", file=sys.stderr)
            elif arg.startswith('--scan-patterns='):
                try:
                    pattern_str = arg.split('=')[1]
                    scan_patterns = [pattern.strip() for pattern in pattern_str.split('|')]
                    print(f"使用自定义扫描格式: {scan_patterns}")
                except:
                    print(f"无效的扫描格式参数: {arg}", file=sys.stderr)
            elif arg.startswith('--scan-mode='):
                try:
                    scan_mode = arg.split('=')[1]
                    if scan_mode not in ['all', 'pattern-only', 'pattern-priority']:
                        scan_mode = 'all'
                        print(f"无效的扫描模式，使用默认模式: all", file=sys.stderr)
                    else:
                        print(f"设置扫描模式: {scan_mode}")
                except:
                    print(f"无效的扫描模式参数: {arg}", file=sys.stderr)

        # 扫描目录并获取结果
        result = scan_directory(directory, max_depth, include_hidden, supported_extensions,
                               scan_patterns, scan_mode)
        print("\n最终结果:")
        # 打印JSON格式的结果
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        # 如果没有提供目录，打印错误信息
        print(json.dumps({"error": "未提供目录"}, ensure_ascii=False))