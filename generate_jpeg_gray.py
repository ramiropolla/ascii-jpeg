import struct
import sys

def write_marker(file, marker, data=b""):
    """Helper function to write JPEG marker and data."""
    file.write(struct.pack(">H", marker))  # Write marker
    file.write(struct.pack(">H", len(data) + 2))  # Write segment length
    file.write(data)  # Write data

def generate_jpeg(filename, ascii_file, comment="ASCII JPEG"):
    with open(filename, "wb") as f:
        # Start of Image (SOI) marker
        f.write(b"\xFF\xD8")

        # COM marker
        write_marker(f, 0xFFFE, comment.encode("ascii"))

        # DQT (Define Quantization Table)
        # One quantization table, with each value set to 1
        dqt_data = b"\x00" + b"\x01" * 64
        write_marker(f, 0xFFDB, dqt_data)

        # DHT (Define Huffman Table) for DC and AC tables

        # DC is always zero
        dc_symbols = bytes([0] * 128)
        dc_lengths = bytes([0, 0, 0, 0, 0, 0, 0, 128, 0, 0, 0, 0, 0, 0, 0, 0])

        # AC is ascii value
        if False:
            ac_symbols = bytes([6, 5, 4, 3, 2, 1])
            ac_lengths = bytes([0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0])
        else:
            ac_symbols = bytes([7])
            ac_lengths = bytes([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])

        # Write DC tables (table IDs 0 and 1 for Y and CbCr components)
        write_marker(f, 0xFFC4, struct.pack("B", 0x00) + dc_lengths + dc_symbols)  # DC table for Y

        # Write AC tables (table IDs 0x10 and 0x11 for Y and CbCr components)
        write_marker(f, 0xFFC4, struct.pack("B", 0x10) + ac_lengths + ac_symbols)  # AC table for Y

        # SOF (Start of Frame) for Baseline DCT, non-differential, Huffman coding
        sof_data = struct.pack(">BHHB" + "BBB" * 1,
                               8,         # Precision (Bits per sample)
                               8, 8,  # Image dimensions (Width x Height)
                               1,         # Number of color components
                               1, 0x11, 0)  # Y component: ID=1, subsampling=2x2, quant table=0
        write_marker(f, 0xFFC0, sof_data)

        # SOS (Start of Scan)
        sos_data = struct.pack("B", 1) + \
                   struct.pack("BB", 1, 0x00) + \
                   b"\x00\x3F\x00"  # Spectral selection and approximation
        write_marker(f, 0xFFDA, sos_data)

        if True:
            # Read ASCII file content for SOS data
            with open(ascii_file, "rb") as ascii_f:
                sos_content = ascii_f.read()
            f.write(sos_content)  # Write raw ASCII data as SOS data
        else:
            f.write(ascii_file.encode("ascii"))

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python generate_jpeg.py output.jpg input.txt")
        sys.exit(1)
    output_filename = sys.argv[1]
    ascii_filename = sys.argv[2]
    generate_jpeg(output_filename, ascii_filename)
