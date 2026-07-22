const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const inputPath = path.join(__dirname, '..', 'public', 'logo.png');
const tempPath = path.join(__dirname, '..', 'public', 'logo_temp.png');

sharp(inputPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })
  .then(({ data, info }) => {
    const { width, height } = info;
    const channels = 4;
    const buffer = Buffer.alloc(width * height * channels);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i+1];
      const b = data[i+2];

      // If R, G, B are all greater than 240, make it transparent
      if (r > 240 && g > 240 && b > 240) {
        buffer[i] = 0;
        buffer[i+1] = 0;
        buffer[i+2] = 0;
        buffer[i+3] = 0;
      } else {
        buffer[i] = r;
        buffer[i+1] = g;
        buffer[i+2] = b;
        buffer[i+3] = 255;
      }
    }

    // Convert raw buffer back to sharp, trim transparency margins, resize to 256x256 max, and write to file
    sharp(buffer, { raw: { width, height, channels } })
      .trim()
      .resize({ width: 256, height: 256, fit: 'inside' })
      .png({ compressionLevel: 9, quality: 85 })
      .toFile(tempPath)
      .then(() => {
        // Swap temp file to logo.png
        fs.unlinkSync(inputPath);
        fs.renameSync(tempPath, inputPath);
        console.log('Background removed and logo optimized successfully!');
      })
      .catch(err => {
        console.error('Error writing optimized logo:', err);
      });
  })
  .catch(err => {
    console.error('Error processing pixels:', err);
  });
