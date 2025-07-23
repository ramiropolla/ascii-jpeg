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

# MKV_PATH="${ASCII_JPEG_DIR}/ascii_jpeg.mkv"
# ffmpeg -r 10 -i "${ASCII_JPEG_DIR}/ascii_%4d.png" -pix_fmt yuv444p -y ${MKV_PATH}
# echo ${MKV_PATH}
#
# MKV_PATH="${ASCII_JPEG_DIR}/jpeg_txt.mkv"
# ffmpeg -r 10 -i "${ASCII_JPEG_DIR}/jpeg_%4d.png" -pix_fmt yuv444p -y ${MKV_PATH}
# echo ${MKV_PATH}

MKV_PATH="${ASCII_JPEG_DIR}/ascii_jpeg.mkv"
ffmpeg -r 10 -i "${ASCII_JPEG_DIR}/ascii_%4d.png" \
       -r 10 -i "${ASCII_JPEG_DIR}/jpeg_%4d.png" \
       -filter_complex "[0:v]format=rgb24[a];[1:v]format=rgb24[b];[a][b]vstack=inputs=2" \
       -pix_fmt yuv444p -y ${MKV_PATH}
echo ${MKV_PATH}
