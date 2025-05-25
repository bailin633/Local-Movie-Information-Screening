#!/usr/bin/env python3
"""
Test script to verify codec detection functionality
"""
import subprocess
import sys
import os

def test_ffprobe_availability():
    """Test if ffprobe is available and working"""
    try:
        result = subprocess.run(['ffprobe', '-version'], 
                              capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            print("âœ? ffprobe is available")
            print(f"Version info: {result.stdout.split()[0:3]}")
            return True
        else:
            print("â? ffprobe is not working properly")
            return False
    except FileNotFoundError:
        print("â? ffprobe is not installed or not in PATH")
        return False
    except Exception as e:
        print(f"â? Error testing ffprobe: {e}")
        return False

def test_codec_detection(file_path):
    """Test codec detection on a specific file"""
    if not os.path.exists(file_path):
        print(f"â? Test file not found: {file_path}")
        return
    
    print(f"\nðŸ” Testing codec detection on: {file_path}")
    
    try:
        # Test the exact command used in the main script
        codec_result = subprocess.run(['ffprobe', '-v', 'quiet', '-select_streams', 'v:0',
                                       '-show_entries', 'stream=codec_name,codec_long_name',
                                       '-of', 'csv=p=0', file_path],
                                      capture_output=True, text=True, timeout=10)
        
        print(f"Return code: {codec_result.returncode}")
        print(f"Stdout: '{codec_result.stdout.strip()}'")
        print(f"Stderr: '{codec_result.stderr.strip()}'")
        
        if codec_result.returncode == 0 and codec_result.stdout.strip():
            codec_output = codec_result.stdout.strip()
            codec_parts = codec_output.split(',')
            if len(codec_parts) >= 1 and codec_parts[0]:
                codec_name = codec_parts[0].strip()
                print(f"âœ? Detected codec: {codec_name}")
                
                # Apply mapping
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
                    'prores': 'ProRes'
                }
                friendly_name = codec_mapping.get(codec_name.lower(), codec_name)
                print(f"âœ? Friendly name: {friendly_name}")
            else:
                print("â? No codec name found in output")
        else:
            print("â? ffprobe failed or returned empty output")
            
    except Exception as e:
        print(f"â? Error during codec detection: {e}")

def main():
    print("ðŸ§ª Codec Detection Test")
    print("=" * 50)
    
    # Test ffprobe availability
    if not test_ffprobe_availability():
        print("\nðŸ’¡ To install ffprobe:")
        print("   - Windows: Download from https://ffmpeg.org/download.html")
        print("   - macOS: brew install ffmpeg")
        print("   - Linux: sudo apt install ffmpeg")
        return
    
    # Test with a sample file if provided
    if len(sys.argv) > 1:
        test_file = sys.argv[1]
        test_codec_detection(test_file)
    else:
        print("\nðŸ’¡ Usage: python test_codec.py <video_file_path>")
        print("   Example: python test_codec.py sample.mp4")

if __name__ == "__main__":
    main()
