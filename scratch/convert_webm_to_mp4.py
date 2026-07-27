import sys
import os
import subprocess

def convert_webm_to_mp4(input_file, output_file=None):
    # Check if input file exists
    if not os.path.isfile(input_file):
        print(f"Error: Input file '{input_file}' not found.")
        sys.exit(1)

    # Resolve output file name
    if not output_file:
        base, _ = os.path.splitext(input_file)
        output_file = f"{base}.mp4"

    print(f"Converting '{input_file}' to '{output_file}'...")

    # Run FFmpeg command
    cmd = [
        "ffmpeg",
        "-i", input_file,
        "-c:v", "libx264",
        "-preset", "slow",
        "-crf", "22",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        "-y",
        output_file
    ]

    try:
        # Run process and capture output
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if result.returncode == 0:
            print(f"✅ Success! Output file saved to: {output_file}")
        else:
            print("❌ Error: Conversion failed.")
            print(result.stderr)
            sys.exit(1)
    except FileNotFoundError:
        print("Error: FFmpeg is not installed. Please install it first:")
        print("  Ubuntu/Debian: sudo apt update && sudo apt install ffmpeg")
        print("  macOS: brew install ffmpeg")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python convert_webm_to_mp4.py <input_file.webm> [output_file.mp4]")
        sys.exit(1)
    
    in_file = sys.argv[1]
    out_file = sys.argv[2] if len(sys.argv) > 2 else None
    convert_webm_to_mp4(in_file, out_file)
