const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src', 'data', 'json');
const destDir = path.join(__dirname, '..', 'public', 'data', 'json');

if (fs.existsSync(srcDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  fs.cpSync(srcDir, destDir, { recursive: true });
  console.log(`Copied data from ${srcDir} to ${destDir}`);
} else {
  console.warn(`Source directory does not exist: ${srcDir}`);
}
