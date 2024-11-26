import * as std from "std";
import * as os from "os";

const comment_text = "ASCII JPEG <https://jpeg.ffglitch.org/ascii>";
const comment_data = Uint8Array.from(comment_text.split("").map(c => c.charCodeAt(0)));

class JpegFile
{
  constructor()
  {
    this.segments = [];
  }

  append_marker(marker, ...args)
  {
    const length = args.reduce((sum, arr) => sum + arr.length, 0);
    const segment = new Uint8Array(length ? 4 : 2);
    segment[0] = marker >> 8;
    segment[1] = marker;
    if ( length )
    {
      segment[2] = (length + 2) >> 8;
      segment[3] = (length + 2);
    }
    this.segments.push(segment);
    args.forEach((data) => {
      this.segments.push(data);
    });
  }

  append_data(data)
  {
    this.segments.push(data);
  }

  generate()
  {
    const length = this.segments.reduce((sum, arr) => sum + arr.length, 0);
    const data = new Uint8Array(length);
    let offset = 0;
    this.segments.forEach(segment => {
      data.set(segment, offset);
      offset += segment.length;
    });
    return data;
  }
}

function generateJPEG(width, height, nb_components, ascii_data)
{
  const jpeg_file = new JpegFile();

  // Start of Image (SOI) marker
  jpeg_file.append_marker(0xFFD8);

  // COM marker
  jpeg_file.append_marker(0xFFFE, comment_data);

  // DQT (Define Quantization Table)
  const dqt_data = new Uint8Array(65);
  dqt_data[0] = 0x00; // Precision and table ID
  dqt_data.fill(0x80, 1); // Quantization table values
  jpeg_file.append_marker(0xFFDB, dqt_data);

  // DHT (Define Huffman Table) for DC and AC tables

  // DC table: always zero
  const dc_type = 3;
  let dc_lengths;
  let dc_symbols;
  switch ( dc_type )
  {
  case 0:
    dc_lengths = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 128, 0, 0, 0, 0, 0, 0, 0, 0]);
    dc_symbols = new Uint8Array(128);
    break;
  case 1:
    dc_lengths = new Uint8Array([0, 0, 0, 0, 0, 0, 64, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    dc_symbols = new Uint8Array(64);
    dc_symbols.fill(1);
    break;
  case 2:
    dc_lengths = new Uint8Array([0, 0, 0, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    dc_symbols = new Uint8Array(32);
    dc_symbols.fill(2);
    break;
  case 3:
    dc_lengths = new Uint8Array([0, 0, 0, 0, 16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    dc_symbols = new Uint8Array(16);
    dc_symbols.fill(3);
    break;
  }
  jpeg_file.append_marker(0xFFC4, [0x00], dc_lengths, dc_symbols);

  // AC table: ASCII value
  const ac_type = 0;
  let ac_lengths;
  let ac_symbols;
  switch ( ac_type )
  {
  case 20:
    // 0xxxxxxx
    // 1xxxxxxx
    ac_lengths = new Uint8Array([2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    ac_symbols = new Uint8Array([7, 7]);
    break;
  case 0:
    // every byte is EOB.
    ac_lengths = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 128, 0, 0, 0, 0, 0, 0, 0, 0]);
    ac_symbols = new Uint8Array(128);
    break;
  case 1:
    // 0xxxxxxx
    ac_lengths = new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    ac_symbols = new Uint8Array([7]);
    break;
  case 2:
    // 00xxxxxx
    // 01xxxxxx
    ac_lengths = new Uint8Array([0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    ac_symbols = new Uint8Array([6, 6]);
    break;
  case 3:
    // 00xxxxxx
    // 010xxxxx
    // 011xxxxx
    ac_lengths = new Uint8Array([0, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    ac_symbols = new Uint8Array([6, 5, 5]);
    break;
  case 4:
    // 00xxxxxx
    // 010xxxxx
    // 0110xxxx
    // 0111xxxx
    ac_lengths = new Uint8Array([0, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    ac_symbols = new Uint8Array([6, 5, 4, 4]);
    break;
  case 5:
    // 00xxxxxx
    // 010xxxxx
    // 0110xxxx
    // 01110xxx
    // 01111xxx
    ac_lengths = new Uint8Array([0, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    ac_symbols = new Uint8Array([6, 5, 4, 3, 3]);
    break;
  case 6:
    // 00xxxxxx
    // 010xxxxx
    // 0110xxxx
    // 01110xxx
    // 011110xx
    // 011111xx
    ac_lengths = new Uint8Array([0, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    ac_symbols = new Uint8Array([6, 5, 4, 3, 2, 2]);
    break;
  case 7:
    // 00xxxxxx
    // 010xxxxx
    // 0110xxxx
    // 01110xxx
    // 011110xx
    // 0111110x
    // 0111111x
    ac_lengths = new Uint8Array([0, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    ac_symbols = new Uint8Array([6, 5, 4, 3, 2, 1, 1]);
    break;
  case 10:
    // every 2 bytes are (ignored) + (8 bits),
    // except for a few values which are EOB.
    ac_lengths = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 128, 0, 0, 0, 0, 0, 0, 0, 0]);
    ac_symbols = new Uint8Array(128);
    ac_symbols.fill(0x08);
    if ( 1 )
    {
      ac_symbols[0x0d] = 0; // 00001101
      ac_symbols[0x0a] = 0; // 00001010
    }
    else
    {
      ac_symbols[0x20] = 0; // 00100000
    }
    break;
  case 11:
    // every byte is EOB, except for ' ' which is 8 bits.
    ac_lengths = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 128, 0, 0, 0, 0, 0, 0, 0, 0]);
    ac_symbols = new Uint8Array(128);
    ac_symbols[0x0A] = 8; // \n
    ac_symbols[0x0D] = 8; // \r
    ac_symbols[0x20] = 8; // SPACE
    ac_symbols[0x21] = 8; // !
    ac_symbols[0x22] = 8; // "
    ac_symbols[0x23] = 8; // #
    ac_symbols[0x24] = 8; // $
    ac_symbols[0x25] = 8; // %
    ac_symbols[0x26] = 8; // &
    ac_symbols[0x27] = 8; // '
    ac_symbols[0x28] = 8; // (
    ac_symbols[0x29] = 8; // )
    ac_symbols[0x2A] = 8; // *
    ac_symbols[0x2B] = 8; // +
    ac_symbols[0x2C] = 8; // ,
    ac_symbols[0x2D] = 8; // -
    ac_symbols[0x2E] = 8; // .
    ac_symbols[0x2F] = 8; // /
    ac_symbols[0x41] = 8; // A
    ac_symbols[0x42] = 8; // B
    ac_symbols[0x43] = 8; // C
    ac_symbols[0x44] = 8; // D
    ac_symbols[0x45] = 8; // E
    ac_symbols[0x46] = 8; // F
    ac_symbols[0x47] = 8; // G
    ac_symbols[0x48] = 8; // H
    ac_symbols[0x49] = 8; // I
    ac_symbols[0x4A] = 8; // J
    ac_symbols[0x4B] = 8; // K
    ac_symbols[0x4C] = 8; // L
    ac_symbols[0x4D] = 8; // M
    ac_symbols[0x4E] = 8; // N
    ac_symbols[0x4F] = 8; // O
    ac_symbols[0x50] = 8; // P
    ac_symbols[0x51] = 8; // Q
    ac_symbols[0x52] = 8; // R
    ac_symbols[0x53] = 8; // S
    ac_symbols[0x54] = 8; // T
    ac_symbols[0x55] = 8; // U
    ac_symbols[0x56] = 8; // V
    ac_symbols[0x57] = 8; // W
    ac_symbols[0x58] = 8; // X
    ac_symbols[0x59] = 8; // Y
    ac_symbols[0x5A] = 8; // Z
  case 12:
    // every byte is EOB, except for ' ' which is 8 bits.
    ac_lengths = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 128, 0, 0, 0, 0, 0, 0, 0, 0]);
    ac_symbols = new Uint8Array(128);
    ac_symbols.fill(8);
    ac_symbols[0x61] = 0; // a
    ac_symbols[0x62] = 0; // b
    ac_symbols[0x63] = 0; // c
    ac_symbols[0x64] = 0; // d
    ac_symbols[0x65] = 0; // e
    ac_symbols[0x66] = 0; // f
    ac_symbols[0x67] = 0; // g
    ac_symbols[0x68] = 0; // h
    ac_symbols[0x69] = 0; // i
    ac_symbols[0x6A] = 0; // j
    ac_symbols[0x6B] = 0; // k
    ac_symbols[0x6C] = 0; // l
    ac_symbols[0x6D] = 0; // m
    ac_symbols[0x6E] = 0; // n
    ac_symbols[0x6F] = 0; // o
    ac_symbols[0x70] = 0; // p
    ac_symbols[0x71] = 0; // q
    ac_symbols[0x72] = 0; // r
    ac_symbols[0x73] = 0; // s
    ac_symbols[0x74] = 0; // t
    ac_symbols[0x75] = 0; // u
    ac_symbols[0x76] = 0; // v
    ac_symbols[0x77] = 0; // w
    ac_symbols[0x78] = 0; // x
    ac_symbols[0x79] = 0; // y
    ac_symbols[0x7A] = 0; // z
    break;
  }
  jpeg_file.append_marker(0xFFC4, [0x10], ac_lengths, ac_symbols);

  // SOF (Start of Frame) for Baseline DCT, non-differential, Huffman coding
  const sof_length = 6 + nb_components * 3;
  const sof_data = new Uint8Array(sof_length);
  sof_data[0] = 8;              // Sample precision
  sof_data[1] = height >> 8;    // Height
  sof_data[2] = height;
  sof_data[3] = width >> 8;     // Width
  sof_data[4] = width;
  sof_data[5] = nb_components;  // Number of components
  for ( let i = 0; i < nb_components; i++ )
  {
    sof_data[6 + (i * 3)] = 1 + i;          // Component identifier
    sof_data[7 + (i * 3)] = (i == 0) ? 0x11 : 0x22;           // Subsampling factors
    sof_data[8 + (i * 3)] = 0;              // Quantization table index
  }
  jpeg_file.append_marker(0xFFC0, sof_data);

  // SOS (Start of Scan)
  const sos_length = 1 + nb_components * 2 + 3;
  const sos_data = new Uint8Array(sos_length);
  sos_data[0] = nb_components;
  for ( let i = 0; i < nb_components; i++ )
  {
    sos_data[1 + (i * 2)] = 1 + i;          // Component identifier
    sos_data[2 + (i * 2)] = 0x00;
  }
  sos_data[1 + (nb_components * 2) + 0] = 0x00;
  sos_data[1 + (nb_components * 2) + 1] = 0x3F;
  sos_data[1 + (nb_components * 2) + 2] = 0x00;
  jpeg_file.append_marker(0xFFDA, sos_data);

  // Write ASCII data as SOS content
  jpeg_file.append_data(ascii_data);

  if ( false )
  {
    // End of Image (EOI) marker
    jpeg_file.append_marker(0xFFD9);
  }

  // Concatenate all segments into a single Uint8Array
  return jpeg_file.generate();
}

function main(argc, argv)
{
  if ( argc < 3 )
  {
    print("usage: ./qjs " + scriptArgs[0] + " <ascii.txt> <output.jpeg>");
    return 1;
  }

  const ascii_txt = argv[1];
  const ascii_file = std.open(ascii_txt, "rb");
  ascii_file.seek(0, std.SEEK_END);
  const ascii_data = new Uint8Array(ascii_file.tell());
  ascii_file.seek(0, std.SEEK_SET);
  ascii_file.read(ascii_data.buffer, 0, ascii_data.length);
  ascii_file.close();

  const output_jpeg = argv[2];

  const width = 512;
  const height = 512;
  const nb_components = 3;

  const jpeg_data = generateJPEG(width, height, nb_components, ascii_data);

  const jpeg_file = std.open(output_jpeg, "wb");
  jpeg_file.write(jpeg_data.buffer, 0, jpeg_data.length);
  jpeg_file.close();
}

try {
  await main(scriptArgs.length, scriptArgs, this);
} catch (e) {
  console.log("Uncaught exception!");
  console.log(e);
  if ( e.stack )
    console.log(e.stack);
  std.exit(1);
}
