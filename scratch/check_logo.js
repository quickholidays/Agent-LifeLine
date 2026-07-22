const sharp = require('sharp');
const path = require('path');

const logoPath = path.join(__dirname, '..', 'public', 'logo.png');

sharp(logoPath)
  .raw()
  .toBuffer({ resolveWithObject: true })
  .then(({ data, info }) => {
    const r = data[0];
    const g = data[1];
    const b = data[2];
    console.log(`Top-left pixel color: RGB(${r}, ${g}, ${b})`);
  })
  .catch(err => {
    console.error('Error reading pixels:', err);
  });
