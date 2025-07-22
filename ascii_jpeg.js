const comment_text = "ascii.jpeg <https://jpeg.ffglitch.org/ascii>";
const comment_data = Uint8Array.from(comment_text.split("").map(c => c.charCodeAt(0)));

const image_size_values = {
  "8x8":     { width:   8, height:   8 },
  "16x16":   { width:  16, height:  16 },
  "32x32":   { width:  32, height:  32 },
  "48x48":   { width:  48, height:  48 },
  "64x64":   { width:  64, height:  64 },
  "96x96":   { width:  96, height:  96 },
  "128x128": { width: 128, height: 128 },
};

// convert:
// 444: subsampling = [ 0x11, 0x11, 0x11 ];
// 422: subsampling = [ 0x21, 0x11, 0x11 ];
// 420: subsampling = [ 0x22, 0x11, 0x11 ];
// ffmpeg:
// 444: subsampling = [ 0x12, 0x12, 0x12 ];
// 422: subsampling = [ 0x22, 0x12, 0x12 ];
// 420: subsampling = [ 0x22, 0x11, 0x11 ];
const pixfmt_values = {
  "Grayscale": [ 0x11 ],
  "YUV444":    [ 0x11, 0x11, 0x11 ],
  "YUV422":    [ 0x22, 0x12, 0x12 ],
  "YUV420":    [ 0x22, 0x11, 0x11 ],
};

const fill_with_zeros = false;
const l7 = fill_with_zeros ? 127 : 0;

function n_bits(nb_xbits)
{
  const quant = nb_xbits ? (128 >> nb_xbits) : 1;
  const count = (128 >> nb_xbits);
  const lengths = new Uint8Array([0, 0, 0, 0, 0, 0, 0, l7, 0, 0, 0, 0, 0, 0, 0, 0]);
  const symbols = new Uint8Array(count + l7).fill(nb_xbits, 0, count);
  lengths[7 - nb_xbits] += count;
  return { suggested_quant: quant, lengths: lengths, symbols: symbols };
}

function run_n_bits(nb_xbits)
{
  const quant = (256 >> nb_xbits);
  const count = (127 >> nb_xbits);
  const count7 = 127 - (count << nb_xbits);
  const lengths = new Uint8Array([0, 0, 0, 0, 0, 0, 0, count7 + l7, 0, 0, 0, 0, 0, 0, 0, 0]);
  const symbols = new Uint8Array(count + count7 + l7);
  const start_at = (0x40 >> nb_xbits);
  for ( let i = 0; i < start_at; i++ )
    symbols[i] = nb_xbits;
  for ( let i = start_at; i < count; i++ )
    symbols[i] = nb_xbits | (((i - start_at) & 15) << 4);
  lengths[7 - nb_xbits] = count;
  return { suggested_quant: quant, lengths: lengths, symbols: symbols };
}

const dht_values = {
  "[1] skip":   n_bits(0), // 0xxxxxxx
  "[1] 1 bit":  n_bits(1), // 0xxxxxxV -1, 1
  "[1] 2 bits": n_bits(2), // 0xxxxxVV -3..-2, 2..3
  "[1] 3 bits": n_bits(3), // 0xxxxVVV -7..-4, 4..7
  "[1] 4 bits": n_bits(4), // 0xxxVVVV -15..-8, 8..15
  "[1] 5 bits": n_bits(5), // 0xxVVVVV -31..-16, 16..31
  "[1] 6 bits": n_bits(6), // 0xVVVVVV -63..-32, 32..63
  "[1] 7 bits": n_bits(7), // 0VVVVVVV -127..-64, 64..127
  "[1] 1-6 bits": (() => {
    // full range
    // 00VVVVVV -63..-32, 32..63
    // 010VVVVV -31..-16, 16..31
    // 0110VVVV -15..-8, 8..15
    // 01110VVV -7..-4, 4..7
    // 011110VV -3..-2, 2..3
    // 0111110V -1, 1
    // 0111111V -1, 1
    const quant = 4;
    const count = 7;
    const lengths = new Uint8Array([0, 1, 1, 1, 1, 1, 2, l7, 0, 0, 0, 0, 0, 0, 0, 0]);
    const symbols = new Uint8Array(count + l7);
    symbols[0] = 6;
    symbols[1] = 5;
    symbols[2] = 4;
    symbols[3] = 3;
    symbols[4] = 2;
    symbols[5] = 1;
    symbols[6] = 1;
    return { suggested_quant: quant, lengths: lengths, symbols: symbols };
  })(),
  "[1] run + 1 bit":  run_n_bits(1),
  "[1] run + 2 bits": run_n_bits(2),
  "[1] run + 3 bits": run_n_bits(3),
  "[1] run + 4 bits": run_n_bits(4),

  "[1] word blocks": (() => {
    // 0000     -> EOB control codes (includes CR LF)
    // 0001     -> EOB control codes
    // 0010     -> EOB (space) !"#$%&'()*+,-./
    // 0011xxxx -> 4 bits 0-9 :;<=>?
    // 0100xxxx -> 4 bits @ A-O
    // 0101xxxx -> 4 bits P-Z [\]^_
    // 0110xxxx -> 4 bits ` a-o
    // 0111xxxx -> 4 bits p-z {|}~ (del)
    // 1000     -> EOB
    // 1001     -> EOB
    // 1010     -> EOB
    // 1011     -> EOB
    // 1100     -> EOB
    // 1101     -> EOB
    // 1110     -> EOB
    // 11110000 -> EOB
    // 11110001 -> EOB
    // 11110010 -> EOB
    // 11110011 -> EOB
    // 11110100 -> EOB
    // 11110101 -> EOB
    // 11110110 -> EOB
    // 11110111 -> EOB
    // 11111000 -> EOB
    // 11111001 -> EOB
    // 11111010 -> EOB
    // 11111011 -> EOB
    // 11111100 -> EOB
    // 11111101 -> EOB
    // 11111110 -> EOB
    // 11111111 -> does not happen
    // NOTE:
    //   LF (0x0a) 0000 1010 => EOB EOB
    //   CR (0x0d) 0000 1110 => EOB EOB
    // space(0x20) 0010 0000 => EOB EOB
    const quant = 16;
    const lengths = new Uint8Array([0, 0, 0, 15, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0]);
    const symbols = new Uint8Array(30);
    for ( let i = 3; i < 8; i++ )
      symbols[i] = 4;
    return { suggested_quant: quant, lengths: lengths, symbols: symbols };
  })(),
  "[1] line blocks": (() => {
    // 0000     -> EOB control codes (includes CR LF)
    // 0001     -> EOB control codes
    // 0010xxxx -> 4 bits (space) !"#$%&'()*+,-./
    // 0011xxxx -> 4 bits 0-9 :;<=>?
    // 0100xxxx -> 4 bits @ A-O
    // 0101xxxx -> 4 bits P-Z [\]^_
    // 0110xxxx -> 4 bits ` a-o
    // 0111xxxx -> 4 bits p-z {|}~ (del)
    // 1000     -> EOB
    // 1001     -> EOB
    // 1010     -> EOB
    // 1011     -> EOB
    // 1100     -> EOB
    // 1101     -> EOB
    // 1110     -> EOB
    // 11110000 -> EOB
    // 11110001 -> EOB
    // 11110010 -> EOB
    // 11110011 -> EOB
    // 11110100 -> EOB
    // 11110101 -> EOB
    // 11110110 -> EOB
    // 11110111 -> EOB
    // 11111000 -> EOB
    // 11111001 -> EOB
    // 11111010 -> EOB
    // 11111011 -> EOB
    // 11111100 -> EOB
    // 11111101 -> EOB
    // 11111110 -> EOB
    // 11111111 -> does not happen
    // NOTE:
    //   LF (0x0a) 0000 1010 => EOB EOB
    //   CR (0x0d) 0000 1110 => EOB EOB
    const quant = 16;
    const lengths = new Uint8Array([0, 0, 0, 15, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0]);
    const symbols = new Uint8Array(30);
    for ( let i = 2; i < 8; i++ )
      symbols[i] = 4;
    return { suggested_quant: quant, lengths: lengths, symbols: symbols };
  })(),

  "[2] skip 8 + 8 bits": (() => {
    // every 2 bytes are (ignored) + (8 bits),
    // except for a few values which are EOB.
    const quant = 2;
    const lengths = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 128, 0, 0, 0, 0, 0, 0, 0, 0]);
    const symbols = new Uint8Array(128).fill(8);
    // symbols[0x0A] = 0; // \n
    // symbols[0x0D] = 0; // \r
    // symbols[0x20] = 0; // SPACE
    // symbols[0x21] = 0; // !
    // symbols[0x22] = 0; // "
    // symbols[0x23] = 0; // #
    // symbols[0x24] = 0; // $
    // symbols[0x25] = 0; // %
    // symbols[0x26] = 0; // &
    // symbols[0x27] = 0; // '
    // symbols[0x28] = 0; // (
    // symbols[0x29] = 0; // )
    // symbols[0x2A] = 0; // *
    // symbols[0x2B] = 0; // +
    // symbols[0x2C] = 0; // ,
    // symbols[0x2D] = 0; // -
    // symbols[0x2E] = 0; // .
    // symbols[0x2F] = 0; // /
    // symbols[0x41] = 0; // A
    // symbols[0x42] = 0; // B
    // symbols[0x43] = 0; // C
    // symbols[0x44] = 0; // D
    // symbols[0x45] = 0; // E
    // symbols[0x46] = 0; // F
    // symbols[0x47] = 0; // G
    // symbols[0x48] = 0; // H
    // symbols[0x49] = 0; // I
    // symbols[0x4A] = 0; // J
    // symbols[0x4B] = 0; // K
    // symbols[0x4C] = 0; // L
    // symbols[0x4D] = 0; // M
    // symbols[0x4E] = 0; // N
    // symbols[0x4F] = 0; // O
    // symbols[0x50] = 0; // P
    // symbols[0x51] = 0; // Q
    // symbols[0x52] = 0; // R
    // symbols[0x53] = 0; // S
    // symbols[0x54] = 0; // T
    // symbols[0x55] = 0; // U
    // symbols[0x56] = 0; // V
    // symbols[0x57] = 0; // W
    // symbols[0x58] = 0; // X
    // symbols[0x59] = 0; // Y
    // symbols[0x5A] = 0; // Z
    return { suggested_quant: quant, lengths: lengths, symbols: symbols };
  })(),
  "[2] skip 8 + 8 bits (lines)": (() => {
    // every 2 bytes are (ignored) + (8 bits),
    // except for a few values which are EOB.
    const quant = 2;
    const lengths = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 128, 0, 0, 0, 0, 0, 0, 0, 0]);
    const symbols = new Uint8Array(128).fill(8);
    symbols[0x0A] = 0; // \n
    symbols[0x0D] = 0; // \r
    return { suggested_quant: quant, lengths: lengths, symbols: symbols };
  })(),
  "[2] skip 8 + 8 bits (words)": (() => {
    // every 2 bytes are (ignored) + (8 bits),
    // except for a few values which are EOB.
    const quant = 2;
    const lengths = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 128, 0, 0, 0, 0, 0, 0, 0, 0]);
    const symbols = new Uint8Array(128).fill(8);
    symbols[0x20] = 0; // SPACE
    return { suggested_quant: quant, lengths: lengths, symbols: symbols };
  })(),
  // TODO skip 7 bit byte
  // TODO read 7 bit byte
};

const preset_values = {
  "skip DC | full range AC":   [ "[1] skip",                    "[1] 1-6 bits"                ],
  "skip DC | run + 3 bits":    [ "[1] skip",                    "[1] run + 3 bits"            ],
  "full range DC | skip AC":   [ "[1] 1-6 bits",                "[1] skip"                    ],
  "word blocks":               [ "[1] word blocks",             "[1] word blocks"             ],
  "line blocks":               [ "[1] line blocks",             "[1] line blocks"             ],
  "2 chars":                   [ "[2] skip 8 + 8 bits",         "[2] skip 8 + 8 bits"         ],
  "2 chars (lines)":           [ "[2] skip 8 + 8 bits (lines)", "[2] skip 8 + 8 bits (lines)" ],
  "2 chars (words)":           [ "[2] skip 8 + 8 bits (words)", "[2] skip 8 + 8 bits (words)" ],
  "skip DC | 2 chars":         [ "[1] skip",                    "[2] skip 8 + 8 bits"         ],
  "skip DC | 2 chars (lines)": [ "[1] skip",                    "[2] skip 8 + 8 bits (lines)" ],
  "skip DC | 2 chars (words)": [ "[1] skip",                    "[2] skip 8 + 8 bits (words)" ],
};

function decode_xbits(code, len)
{
  const signbit = 1 << (len - 1);
  const sign = (code & signbit) ? 0 : -1;
  if ( sign )
    return code - ((-1) & ((1 << len) - 1));
  return code;
}

function encode_binary_str(huffbits, nb_xbits, huffcode, xbits)
{
  let ret = "";
  for (let i = 0; i < huffbits; i++)
    ret += (huffcode & (1 << (huffbits - i - 1))) ? '1' : '0';
  for (let i = 0; i < nb_xbits; i++)
    ret += (xbits & (1 << (nb_xbits - i - 1))) ? '1' : '0';
  return ret;
}

function to_ascii_char(ascii_val)
{
  if (ascii_val > 0x1F && ascii_val < 0x7F)
    return String.fromCharCode(ascii_val);
  switch (ascii_val) {
  case 0x00: return '\\0';
  case 0x07: return '\\a';
  case 0x08: return '\\b';
  case 0x09: return '\\t';
  case 0x0A: return '\\n';
  case 0x0B: return '\\v';
  case 0x0C: return '\\f';
  case 0x0D: return '\\r';
  }
  return '\\x' + ascii_val.toString(16).toUpperCase().padStart(2, '0');
}

function dump_dht(str, lengths, symbols)
{
  // console.log(str, lengths, symbols);
  if ( 0 ) {
    const codes = [];
    let nb_codes = 0;
    let huffcode = 0;
    for (const [i, length] of lengths.entries()) {
      for (let j = 0; j < length; j++) {
        codes.push({
          "huffbits": i + 1,
          "nb_xbits": symbols[nb_codes],
          "huffcode": huffcode,
        });
        nb_codes += 1;
        huffcode += 1;
      }
      huffcode = huffcode << 1;
    }
    console.log(str, codes);
  } else {
    const codes = [];
    let nb_codes = 0;
    let huffcode = 0;
    for (const [i, length] of lengths.entries()) {
      const huffbits = i + 1;
      for (let j = 0; j < length; j++) {
        const zero_run = symbols[nb_codes] >> 4;
        const nb_xbits = symbols[nb_codes] & 15;
        for (let k = 0; k < 1 << nb_xbits; k++) {
          const huffcode_str = encode_binary_str(huffbits, nb_xbits, huffcode, k);
          const xbits_val = decode_xbits(k, nb_xbits);
          const ascii_val = parseInt(huffcode_str, 2);
          const ascii_char = to_ascii_char(ascii_val);
          codes.push({
            "huffcode": huffcode_str,
            "ascii_val": ascii_val,
            "ascii_char": ascii_char,
            "zero_run": zero_run,
            "value": xbits_val,
          });
          // console.log(huffcode_str, ascii_val, ascii_char, xbits_val);
        }
        nb_codes += 1;
        huffcode += 1;
      }
      huffcode = huffcode << 1;
    }
    if ( 0 ) {
      console.log(codes.toSorted((l, r) => {
        return l.value - r.value;
      }));
    } else {
      console.log(codes);
    }
  }

  // for ( int i = 0; i < 16; i++ )
  // {
  //   int length = dht_lengths[i];
  //   for ( int j = 0; j < length; j++ )
  //   {
  //     code_t *pcode = &codes[nb_codes];
  //     pcode->huffbits = i + 1;
  //     pcode->nb_xbits = dht_symbols[nb_codes];
  //     pcode->huffcode = huffcode;
  //     nb_codes++;
  //     huffcode++;
  //   }
  //   huffcode <<= 1;
  // }
  // console.log(str, codes);
}

function deduplicate_dqt(cur_component_dqt, dqt, dqt_json)
{
  const cur_component_dqt_json = JSON.stringify(cur_component_dqt);
  if (cur_component_dqt_json in dqt_json)
    return dqt_json[cur_component_dqt_json];
  const dqt_index = dqt.length;
  dqt.push(cur_component_dqt);
  dqt_json[cur_component_dqt_json] = dqt_index;
  return dqt_index;
}

function deduplicate_dht(cur_component_dht, dht, dht_json)
{
  const cur_component_dht_json = JSON.stringify(cur_component_dht);
  if (cur_component_dht_json in dht_json)
    return dht_json[cur_component_dht_json];
  const dht_index = dht.length;
  cur_component_dht.written = false;
  dht.push(cur_component_dht);
  dht_json[cur_component_dht_json] = dht_index;
  return dht_index;
}

function deduplicate_tables(components)
{
  const dqt = [];
  const dht_dc = [];
  const dht_ac = [];
  const dqt_json = {};
  const dht_dc_json = {};
  const dht_ac_json = {};

  for (const component of components) {
    component.dqt_index    = deduplicate_dqt(component.dqt,    dqt,    dqt_json);
    component.dht_dc_index = deduplicate_dht(component.dht_dc, dht_dc, dht_dc_json);
    component.dht_ac_index = deduplicate_dht(component.dht_ac, dht_ac, dht_ac_json);
  }

  return { dqt, dht_dc, dht_ac };
}

class JpegFile {
  constructor() {
    this.segments = [];
  }

  append_marker(marker, ...args) {
    const length = args.reduce((sum, arr) => sum + arr.length, 0);
    const segment = new Uint8Array(length ? 4 : 2);
    segment[0] = marker >> 8;
    segment[1] = marker;
    if (length) {
      segment[2] = (length + 2) >> 8;
      segment[3] = (length + 2);
    }
    this.segments.push(segment);
    args.forEach((data) => {
      this.segments.push(data);
    });
  }

  append_data(data) {
    this.segments.push(data);
  }

  generate() {
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

function generateJPEG(width, height, components, ascii_data)
{
  const jpeg_file = new JpegFile();
  const nb_components = components.length;

  const { dqt, dht_dc, dht_ac } = deduplicate_tables(components);

  // Start of Image (SOI) marker
  jpeg_file.append_marker(0xFFD8);

  // COM marker
  jpeg_file.append_marker(0xFFFE, comment_data);

  // DQT (Define Quantization Table)
  for (let i = 0; i < dqt.length; i++) {
    const dqt_data = new Uint8Array(65);
    dqt_data[0] = i;          // Precision and table ID
    dqt_data.set(dqt[i], 1);  // DQT values (DC + 63 AC)
    jpeg_file.append_marker(0xFFDB, dqt_data);
  }

  // DHT (Define Huffman Table)
  for (const component of components) {
    // DC table
    const dht_dc_index = component.dht_dc_index;
    const cur_dht_dc = dht_dc[dht_dc_index];
    if (!cur_dht_dc.written) {
      const dc_lengths = cur_dht_dc.lengths;
      const dc_symbols = cur_dht_dc.symbols;
      // dump_dht(`[${dht_dc_index}.dc]`, dc_lengths, dc_symbols);
      jpeg_file.append_marker(0xFFC4, Uint8Array.from([0x00 | dht_dc_index]), dc_lengths, dc_symbols);
      cur_dht_dc.written = true;
    }

    // AC table
    const dht_ac_index = component.dht_ac_index;
    const cur_dht_ac = dht_ac[dht_ac_index];
    if (!cur_dht_ac.written) {
      const ac_lengths = cur_dht_ac.lengths;
      const ac_symbols = cur_dht_ac.symbols;
      // dump_dht(`[${dht_ac_index}.ac]`, ac_lengths, ac_symbols);
      jpeg_file.append_marker(0xFFC4, Uint8Array.from([0x10 | dht_ac_index]), ac_lengths, ac_symbols);
      cur_dht_ac.written = true;
    }
  }

  // SOF (Start of Frame)
  const sof_length = 6 + nb_components * 3;
  const sof_data = new Uint8Array(sof_length);
  sof_data[0] = 8;              // Sample precision
  sof_data[1] = height >> 8;    // Height
  sof_data[2] = height;
  sof_data[3] = width >> 8;     // Width
  sof_data[4] = width;
  sof_data[5] = nb_components;  // Number of components
  for (let i = 0; i < nb_components; i++) {
    const subsampling = components[i].subsampling;
    const dqt_index   = components[i].dqt_index;
    sof_data[6 + (i * 3)] = 1 + i;        // Component identifier
    sof_data[7 + (i * 3)] = subsampling;  // Subsampling factors
    sof_data[8 + (i * 3)] = dqt_index;    // Quantization table index
  }
  jpeg_file.append_marker(0xFFC0, sof_data);

  // SOS (Start of Scan)
  const sos_length = 1 + nb_components * 2 + 3;
  const sos_data = new Uint8Array(sos_length);
  sos_data[0] = nb_components;
  for (let i = 0; i < nb_components; i++) {
    const dht_dc_index = components[i].dht_dc_index;
    const dht_ac_index = components[i].dht_ac_index;
    const dht_indices = (dht_dc_index << 4) | dht_ac_index;
    sos_data[1 + (i * 2)] = 1 + i;        // Component identifier
    sos_data[2 + (i * 2)] = dht_indices;  // Huffman table indices
  }
  sos_data[1 + (nb_components * 2) + 0] = 0x00;
  sos_data[1 + (nb_components * 2) + 1] = 0x3F;
  sos_data[1 + (nb_components * 2) + 2] = 0x00;
  jpeg_file.append_marker(0xFFDA, sos_data);

  // Write ASCII data as SOS content
  const ascii_bytes = Uint8Array.from(ascii_data.split('').map(c => c.charCodeAt(0)));
  jpeg_file.append_data(ascii_bytes);

  // End of Image (EOI) marker
  jpeg_file.append_marker(0xFFD9);

  // Return the generated JPEG data
  return jpeg_file.generate();
}
