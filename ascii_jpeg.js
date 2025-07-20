const comment_text = "ascii.jpeg <https://jpeg.ffglitch.org/ascii>";
const comment_data = Uint8Array.from(comment_text.split("").map(c => c.charCodeAt(0)));

const image_size_values = {
  "8x8":     { width:   8, height:   8 },
  "16x16":   { width:  16, height:  16 },
  "32x32":   { width:  32, height:  32 },
  "64x64":   { width:  64, height:  64 },
  "128x128": { width: 128, height: 128 },
};
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
  const quant = (128 >> nb_xbits);
  const count = (128 >> nb_xbits);
  const lengths = new Uint8Array([0, 0, 0, 0, 0, 0, 0, l7, 0, 0, 0, 0, 0, 0, 0, 0]);
  const symbols = new Uint8Array(count + l7).fill(nb_xbits, 0, count);
  lengths[7 - nb_xbits] += count;
  return { suggested_quant: quant, lengths: lengths, symbols: symbols };
}

function run_n_bits(nb_xbits)
{
  const quant = (255 >> nb_xbits);
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
  "[1] 1 lsb":  n_bits(1), // 0xxxxxxV -1, 1
  "[1] 2 lsbs": n_bits(2), // 0xxxxxVV -3..-2, 2..3
  "[1] 3 lsbs": n_bits(3), // 0xxxxVVV -7..-4, 4..7
  "[1] 4 lsbs": n_bits(4), // 0xxxVVVV -15..-8, 8..15
  "[1] 5 lsbs": n_bits(5), // 0xxVVVVV -31..-16, 16..31
  "[1] 6 lsbs": n_bits(6), // 0xVVVVVV -63..-32, 32..63
  "[1] 7 lsbs": n_bits(7), // 0VVVVVVV -127..-64, 64..127
  "[1] 1-6 lsbs": (() => {
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
  "[1] run + 1 lsb":  run_n_bits(1),
  "[1] run + 2 lsbs": run_n_bits(2),
  "[1] run + 3 lsbs": run_n_bits(3),
  "[1] run + 4 lsbs": run_n_bits(4),

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

  "[2] skip 8 + 8 lsbs": (() => {
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
};

const preset_values = {
  // "[1] skip"
  // "[1] 1 lsb"
  // "[1] 2 lsbs"
  // "[1] 3 lsbs"
  // "[1] 4 lsbs"
  // "[1] 5 lsbs"
  // "[1] 6 lsbs"
  // "[1] 7 lsbs"
  // "[1] 1-6 lsbs"
  // "[1] run + 1 lsb"
  // "[1] run + 2 lsbs"
  // "[1] run + 3 lsbs"
  // "[1] run + 4 lsbs"
  // "[1] word blocks"
  // "[1] line blocks"
  // "[2] skip 8 + 8 lsbs"
  "none": null,
  "skip DC | full range AC": [ "[1] skip", "[1] 1-6 lsbs" ],
  "skip DC | run + 3 lsbs": [ "[1] skip", "[1] run + 3 lsbs" ],
  "full range DC | skip AC": [ "[1] 1-6 lsbs", "[1] skip" ],
  "word blocks": [ "[1] word blocks", "[1] word blocks" ],
  "line blocks": [ "[1] line blocks", "[1] line blocks" ],
  "2 chars": [ "[2] skip 8 + 8 lsbs", "[2] skip 8 + 8 lsbs" ],
};

const text_values = {
  "lorem_ipsum":         lorem_ipsum,
  "ne_me_quitte_pas":    ne_me_quitte_pas,
  "poema_de_sete_faces": poema_de_sete_faces,
  "faroeste_caboclo":    faroeste_caboclo,
};

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

// Global variable to store the JPEG blob
window.jpeg_blob = null;
window.txt_blob = null;

function get_dht(val, klass)
{
  const fill_with_zeros = true;
  // const fill_with_zeros = true;
  const l7 = fill_with_zeros ? 127 : 0;
  // val = klass == 0 ? 0 : 23; // skip for dc, poetry for ac
  let count, lengths, symbols, quant;
  let count7;
  switch (val) {
    case -7:
      quant = 1;
      // WIP there will never be a sequence of 7 1s in a row.
      // if DC and AC are 7-bit, this will work.
      count = 127;
      lengths = new Uint8Array([0, 0, 0, 0, 0, 0, count, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      symbols = new Uint8Array(count);
      if ( klass == 0 )
        break;
      symbols.fill(7);
      for ( let xxx = 0x20; xxx < 0x40; xxx++ )
        symbols[xxx >> 1] = 0;
      break;
    // TODO add skip (7 bits)

    case 9:
      // every 2 bytes are (ignored) + (8 bits),
      // except for a few values which are EOB.
      quant = 2;
      lengths = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 128, 0, 0, 0, 0, 0, 0, 0, 0]);
      symbols = new Uint8Array(128).fill(8);
      symbols[0x0A] = 0; // \n
      symbols[0x0D] = 0; // \r
      symbols[0x20] = 0; // SPACE
      symbols[0x21] = 0; // !
      symbols[0x22] = 0; // "
      symbols[0x23] = 0; // #
      symbols[0x24] = 0; // $
      symbols[0x25] = 0; // %
      symbols[0x26] = 0; // &
      symbols[0x27] = 0; // '
      symbols[0x28] = 0; // (
      symbols[0x29] = 0; // )
      symbols[0x2A] = 0; // *
      symbols[0x2B] = 0; // +
      symbols[0x2C] = 0; // ,
      symbols[0x2D] = 0; // -
      symbols[0x2E] = 0; // .
      symbols[0x2F] = 0; // /
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
      break;

    case 10:
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
      quant = 16;
      lengths = new Uint8Array([0, 0, 0, 15, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0]);
      symbols = new Uint8Array(30);
      for ( let i = 3; i < 8; i++ )
        symbols[i] = 4;
      break;

    // TODO same thing without run
    // similar to n bits, but:
    // - adds a run value to the codes (breaks ffmpeg if not done carefully)
    // - turns the last count7 codes into EOB
    case 21:
      // 1 bit
      // -1, 1
      // 0xxxxxxV
      quant = 1;
      count = 61;
      count7 = 5;
      lengths = new Uint8Array([0, 0, 0, 0, 0, 0, count, count7 + l7, 0, 0, 0, 0, 0, 0, 0, 0]);
      symbols = new Uint8Array(count + count7 + l7);
      for ( let i = 0; i < count; i++ )
        symbols[i] = 1 | ((i & 15) << 4);
      break;
    case 22:
      // 2 bits
      // -3..-2, 2..3
      // 0xxxxxVV
      quant = 1;
      count = 30;
      count7 = 7;
      lengths = new Uint8Array([0, 0, 0, 0, 0, count, 0, count7 + l7, 0, 0, 0, 0, 0, 0, 0, 0]);
      symbols = new Uint8Array(count + count7 + l7);
      for ( let i = 0; i < count; i++ )
        symbols[i] = 2 | ((i & 15) << 4);
      break;
    case 23:
      // 3 bits
      // -7..-4, 4..7
      // 0xxxxVVV
      quant = 1;
      count = 15;
      count7 = 7;
      lengths = new Uint8Array([0, 0, 0, 0, count, 0, 0, count7 + l7, 0, 0, 0, 0, 0, 0, 0, 0]);
      symbols = new Uint8Array(count + count7 + l7);
      for ( let i = 0; i < count; i++ )
        symbols[i] = 3 | ((i & 15) << 4);
      break;

    default:
      console.error('Invalid DC Huffman type:', val);
      break;
  }
  return [ lengths, symbols, quant ];
}

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
  // return '\\o' + ascii_val.toString(8).padStart(3, '0');
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

function generateJPEG(colorspace, width, height, components, ascii_data)
{
  let subsampling;
  // convert:
  // 444: subsampling = [ 0x11, 0x11, 0x11 ];
  // 422: subsampling = [ 0x21, 0x11, 0x11 ];
  // 420: subsampling = [ 0x22, 0x11, 0x11 ];
  // ffmpeg:
  // 444: subsampling = [ 0x12, 0x12, 0x12 ];
  // 422: subsampling = [ 0x22, 0x12, 0x12 ];
  // 420: subsampling = [ 0x22, 0x11, 0x11 ];
  switch (colorspace) {
    case "Grayscale":
      subsampling = [ 0x11 ];
      break;
    case "YUV444":
      subsampling = [ 0x11, 0x11, 0x11 ];
      break;
    case "YUV422":
      subsampling = [ 0x22, 0x12, 0x12 ];
      break;
    case "YUV420":
      subsampling = [ 0x22, 0x11, 0x11 ];
      break;
  }

  const jpeg_file = new JpegFile();

  // Start of Image (SOI) marker
  jpeg_file.append_marker(0xFFD8);

  // COM marker
  jpeg_file.append_marker(0xFFFE, comment_data);

  const nb_components = components.length;

  // Component params
  let component_params = [];
  for (let i = 0; i < nb_components; i++) {
    const dc_params = dht_values[components[i][2]];
    const ac_params = dht_values[components[i][3]];
    component_params[i] = [
      dc_params.suggested_quant,
      ac_params.suggested_quant,
      dc_params,
      ac_params,
    ];
  }

  // DQT (Define Quantization Table)
  for (let i = 0; i < nb_components; i++) {
    const quant_dc = component_params[i][0];
    const quant_ac = component_params[i][1];
    const dqt_data = new Uint8Array(65);

    // Precision and table ID
    dqt_data[0] = i;
    // Set DC value
    dqt_data[1] = quant_dc;
    // Fill with AC value
    dqt_data.fill(quant_ac, 2);

    jpeg_file.append_marker(0xFFDB, dqt_data);
  }

  // DHT (Define Huffman Table)
  for (let i = 0; i < nb_components; i++) {
    // DC table
    const dc_lengths = component_params[i][2].lengths;
    const dc_symbols = component_params[i][2].symbols;
    // dump_dht(`[${i}.dc]`, dc_lengths, dc_symbols);
    if (!dc_lengths)
        return null;
    jpeg_file.append_marker(0xFFC4, Uint8Array.from([0x00 | i]), dc_lengths, dc_symbols);

    // AC table
    const ac_lengths = component_params[i][3].lengths;
    const ac_symbols = component_params[i][3].symbols;
    dump_dht(`[${i}.ac]`, ac_lengths, ac_symbols);
    if (!ac_lengths)
        return null;
    jpeg_file.append_marker(0xFFC4, Uint8Array.from([0x10 | i]), ac_lengths, ac_symbols);
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
    sof_data[6 + (i * 3)] = 1 + i;          // Component identifier
    sof_data[7 + (i * 3)] = subsampling[i]; // Subsampling factors
    sof_data[8 + (i * 3)] = i;              // Quantization table index
  }
  jpeg_file.append_marker(0xFFC0, sof_data);

  // SOS (Start of Scan)
  const sos_length = 1 + nb_components * 2 + 3;
  const sos_data = new Uint8Array(sos_length);
  sos_data[0] = nb_components;
  for (let i = 0; i < nb_components; i++) {
    sos_data[1 + (i * 2)] = 1 + i;          // Component identifier
    sos_data[2 + (i * 2)] = (i << 4) | i;   // Huffman table indices
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

function ascii_jpeg(colorspace, components, ascii, width, height) {
  // Generate the JPEG data
  const jpegData = generateJPEG(colorspace, width, height, components, ascii);

  if (jpegData) {
    // Create a Blob and set the src of the image
    const blob = new Blob([jpegData], { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);

    // Set the src attribute of the image with id "jpeg"
    const jpegImage = document.getElementById('jpeg');
    jpegImage.src = url;

    // Store the blob globally for download
    window.jpeg_blob = blob;

    const txt_blob = new Blob([jpegData], { type: 'text/plain' });
    window.txt_blob = txt_blob;

    // When the JPEG image loads, create a scaled version for the PNG image
    jpegImage.onload = function() {
      // Create a canvas
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');

      // Disable image smoothing for nearest-neighbor scaling
      ctx.imageSmoothingEnabled = false;

      // Draw the JPEG image scaled up to 512x512
      ctx.drawImage(jpegImage, 0, 0, width, height, 0, 0, 512, 512);

      // Set the PNG image source to the canvas data
      const pngUrl = canvas.toDataURL('image/png');
      const pngImage = document.getElementById('png');
      pngImage.src = pngUrl;

      // Store the PNG blob for download
      canvas.toBlob(function(pngBlob) {
        window.png_blob = pngBlob;
      }, 'image/png');
    };
  } else {
    console.error('Failed to generate JPEG data.');
  }
}
