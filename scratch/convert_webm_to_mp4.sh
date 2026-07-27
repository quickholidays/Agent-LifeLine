#!/bin/bash

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "Error: ffmpeg is not installed. Please install it first:"
    echo "  Ubuntu/Debian: sudo apt update && sudo apt install ffmpeg"
    echo "  macOS (Homebrew): brew install ffmpeg"
    exit 1
fi

# Check if file argument is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <input_file.webm> [output_file.mp4]"
    exit 1
fi

INPUT_FILE="$1"

# Check if input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: Input file '$INPUT_FILE' not found."
    exit 1
fi

# Set output file name if not provided
if [ -z "$2" ]; then
    OUTPUT_FILE="${INPUT_FILE%.*}.mp4"
else
    OUTPUT_FILE="$2"
fi

echo "Converting '$INPUT_FILE' to '$OUTPUT_FILE'..."

# Convert using ffmpeg with high-quality H.264 video and AAC audio encoding
ffmpeg -i "$INPUT_FILE" \
       -c:v libx264 \
       -preset slow \
       -crf 22 \
       -c:a aac \
       -b:a 192k \
       -movflags +faststart \
       -y \
       "$OUTPUT_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Success! Output file saved to: $OUTPUT_FILE"
else
    echo "❌ Error: Conversion failed."
    exit 1
fi
