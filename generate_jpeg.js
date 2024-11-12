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
  dqt_data.fill(0x08, 1); // Quantization table values
  jpeg_file.append_marker(0xFFDB, dqt_data);

  // DHT (Define Huffman Table) for DC and AC tables

  // DC table: always zero
  const dc_symbols = new Uint8Array(128);
  const dc_lengths = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 128, 0, 0, 0, 0, 0, 0, 0, 0]);
  jpeg_file.append_marker(0xFFC4, [0x00], dc_lengths, dc_symbols);

  // AC table: ASCII value
  // const ac_symbols = new Uint8Array([7]);
  // const ac_lengths = new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const ac_symbols = new Uint8Array([6, 5, 4, 3, 2, 1, 1]);
  const ac_lengths = new Uint8Array([0, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
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
    sof_data[7 + (i * 3)] = 0x11;           // Subsampling factors
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

  // End of Image (EOI) marker
  jpeg_file.append_marker(0xFFD9);

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

  const width = 16;
  const height = 16;
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
}
