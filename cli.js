const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  generateJPEG,
  pixfmt_values,
  dht_values,
  preset_values
} = require('./ascii_jpeg');

// Example usage:
const width = 16;
const height = 16;

const subsampling = pixfmt_values["YUV444"];

const dqt_dc = dht_values["[1] word blocks"];
const dqt_ac = dht_values["[1] word blocks"];

const components = subsampling.map(sub => ({
  subsampling: sub,
  dqt: new Uint8Array(64).fill(16),
  dht_dc: { lengths: dqt_dc.lengths, symbols: dqt_dc.symbols },
  dht_ac: { lengths: dqt_ac.lengths, symbols: dqt_ac.symbols },
}));

const ascii_text = "Welcome to ascii.jpeg, the plain text image generator!\n";

const temp_dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ascii-jpeg-'));

function break_lines(str, every)
{
  let result = "";
  for (let i = 0; i < str.length; i += every) {
    result += str.slice(i, i + every) + '\n';
  }
  return result;
}

for (let i = 0; i < ascii_text.length; i++) {
  const ascii_data = ascii_text.slice(0, i + 1);
  const ascii_path = path.join(temp_dir, "jpeg_" + String(i).padStart(4, '0') + ".txt");
  const ascii_with_lines = break_lines(ascii_data, 23);
  fs.writeFileSync(ascii_path, ascii_with_lines);
  const jpeg_data = generateJPEG(width, height, components, ascii_data);
  const jpeg_path = path.join(temp_dir, "ascii_" + String(i).padStart(4, '0') + ".jpeg");
  fs.writeFileSync(jpeg_path, jpeg_data);
}

console.log(temp_dir);
