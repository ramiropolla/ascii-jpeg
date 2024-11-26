const default_ascii = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. 
Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. 
Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`;

const comment_text = "ASCII JPEG <https://jpeg.ffglitch.org/ascii>";
const comment_data = Uint8Array.from(comment_text.split("").map(c => c.charCodeAt(0)));

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
      segment[2] = ((length + 2) >> 8) & 0xFF;
      segment[3] = (length + 2) & 0xFF;
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

function generateJPEG(width, height, components, ascii_data) {
  const jpeg_file = new JpegFile();

  // Start of Image (SOI) marker
  jpeg_file.append_marker(0xFFD8);

  // COM marker
  jpeg_file.append_marker(0xFFFE, comment_data);

  const nb_components = components.length;

  // DQT (Define Quantization Table)
  for (let i = 0; i < nb_components; i++) {
    const quant_dc = components[i][0];
    const quant_ac = components[i][1];
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
    const huff_dc = parseInt(components[i][2]); // DC Huffman type
    const huff_ac = parseInt(components[i][3]); // AC Huffman type

    // DC table
    let dc_lengths, dc_symbols;
    switch (huff_dc) {
      case 0:
        dc_lengths = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 128, 0, 0, 0, 0, 0, 0, 0, 0]);
        dc_symbols = new Uint8Array(128);
        break;
      case 1:
        dc_lengths = new Uint8Array([0, 0, 0, 0, 0, 0, 64, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        dc_symbols = new Uint8Array(64).fill(1);
        break;
      case 2:
        dc_lengths = new Uint8Array([0, 0, 0, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        dc_symbols = new Uint8Array(32).fill(2);
        break;
      case 3:
        dc_lengths = new Uint8Array([0, 0, 0, 0, 16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        dc_symbols = new Uint8Array(16).fill(3);
        break;
      // Add more cases as needed
      default:
        console.error('Invalid DC Huffman type:', huff_dc);
        return null;
    }
    jpeg_file.append_marker(0xFFC4, Uint8Array.from([0x00 | i]), dc_lengths, dc_symbols);

    // AC table
    let ac_lengths, ac_symbols;
    switch (huff_ac) {
      case 0:
        ac_lengths = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 128, 0, 0, 0, 0, 0, 0, 0, 0]);
        ac_symbols = new Uint8Array(128);
        break;
      case 1:
        ac_lengths = new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        ac_symbols = new Uint8Array([7]);
        break;
      case 2:
        ac_lengths = new Uint8Array([0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        ac_symbols = new Uint8Array([6, 6]);
        break;
      case 3:
        ac_lengths = new Uint8Array([0, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        ac_symbols = new Uint8Array([6, 5, 5]);
        break;
      // Add more cases as needed
      default:
        console.error('Invalid AC Huffman type:', huff_ac);
        return null;
    }
    jpeg_file.append_marker(0xFFC4, Uint8Array.from([0x10 | i]), ac_lengths, ac_symbols);
  }

  // SOF (Start of Frame)
  const sof_length = 6 + nb_components * 3;
  const sof_data = new Uint8Array(sof_length);
  sof_data[0] = 8;              // Sample precision
  sof_data[1] = (height >> 8) & 0xFF;    // Height
  sof_data[2] = height & 0xFF;
  sof_data[3] = (width >> 8) & 0xFF;     // Width
  sof_data[4] = width & 0xFF;
  sof_data[5] = nb_components;  // Number of components
  for (let i = 0; i < nb_components; i++) {
    sof_data[6 + (i * 3)] = 1 + i;          // Component identifier
    sof_data[7 + (i * 3)] = 0x11;           // Subsampling factors
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
  const jpegData = generateJPEG(width, height, components, ascii);

  if (jpegData) {
    // Create a Blob and set the src of the image
    const blob = new Blob([jpegData], { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);

    // Set the src attribute of the image with id "jpeg"
    const jpegImage = document.getElementById('jpeg');
    jpegImage.src = url;

    // Store the blob globally for download
    window.jpeg_blob = blob;

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

      // Optionally, store the PNG blob for download
      canvas.toBlob(function(pngBlob) {
        window.png_blob = pngBlob;
      }, 'image/png');
    };
  } else {
    console.error('Failed to generate JPEG data.');
  }
}
