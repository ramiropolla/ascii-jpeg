#!/bin/sh

# set -e
# set -x

ASCII_JPEG_DIR="$1"

for I in ${ASCII_JPEG_DIR}/*.jpeg; do
    PNG_PATH="${I/.jpeg/.png}"
    convert ${I} -set colorspace RGB -filter point -resize 512x512! -colorspace RGB -depth 8 ${PNG_PATH}
done

for I in ${ASCII_JPEG_DIR}/*.txt; do
    PNG_PATH="${I/.txt/.png}"
    convert -size 512x192 xc:black -font DejaVu-Sans-Mono -pointsize 32 -fill "#bb86fc" -gravity NorthWest -annotate +32+32 "@${I}" ${PNG_PATH}
done

set -e
set -x

MP4_PATH="${ASCII_JPEG_DIR}/ascii_jpeg.mp4"
ffmpeg -r 10 -i "${ASCII_JPEG_DIR}/ascii_%4d.png" \
       -r 10 -i "${ASCII_JPEG_DIR}/jpeg_%4d.png" \
       -filter_complex "[0:v]format=rgb24[a];[1:v]format=rgb24[b];[a][b]vstack=inputs=2" \
       -c:v libx264 -profile:v high -level:v 4.0 \
       -preset slow -crf 23 \
       -movflags +faststart \
       -pix_fmt yuv420p -y ${MP4_PATH}
echo ${MP4_PATH}
