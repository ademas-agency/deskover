#!/bin/bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"

capture() {
  local html_file="$1"
  local jpg_file="$2"
  local width="${3:-1080}"
  local height="${4:-1350}"
  
  "$CHROME" --headless --disable-gpu --screenshot="$jpg_file" \
    --window-size=${width},${height} \
    --default-background-color=0 \
    --hide-scrollbars \
    "file://$html_file" 2>/dev/null
  
  if [ -f "$jpg_file" ]; then
    echo "  ✓ $(basename "$jpg_file")"
  else
    echo "  ✗ Failed: $(basename "$jpg_file")"
  fi
}

echo "Capturing slides..."
for html in "$BASE_DIR"/*/slides/*.html; do
  if [ -f "$html" ]; then
    dir=$(dirname "$html")
    name=$(basename "$html" .html)
    capture "$html" "${dir}/${name}.jpg"
  fi
done

echo "Done!"
