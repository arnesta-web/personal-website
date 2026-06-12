const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const IMAGES_DIR = path.join(__dirname, 'images');
const SIZES = [800, 1400, 2000];   // ширины, которые будут создаваться
const WEBP_QUALITY = 92;
const WEBP_EFFORT = 6;
const DELETE_ORIGINALS = false;      // потом поменяешь на true

async function processProject(projectName) {
  const projectPath = path.join(IMAGES_DIR, projectName);
  const files = fs.readdirSync(projectPath).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ['.jpg', '.jpeg', '.png'].includes(ext);
  });

  const manifest = {};
  let counter = 1;

  for (const imgFile of files) {
    const inputPath = path.join(projectPath, imgFile);
    const baseName = `${projectName}_${counter}`;
    const outputs = [];

    for (const width of SIZES) {
      const outputName = `${baseName}-${width}.webp`;
      const outputPath = path.join(projectPath, outputName);
      await sharp(inputPath)
        .resize(width, null, { withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY, effort: WEBP_EFFORT, smartSubsample: true })
        .toFile(outputPath);
      outputs.push({ width, file: outputName });
    }

    if (DELETE_ORIGINALS) fs.unlinkSync(inputPath);

    manifest[baseName] = outputs;
    counter++;
  }

  return manifest;
}

(async () => {
  const projectDirs = fs.readdirSync(IMAGES_DIR).filter(name =>
    fs.statSync(path.join(IMAGES_DIR, name)).isDirectory()
  );
  const fullManifest = {};

  for (const dir of projectDirs) {
    console.log(`📁 ${dir}`);
    fullManifest[dir] = await processProject(dir);
  }

  fs.writeFileSync(
    path.join(__dirname, 'images-manifest.json'),
    JSON.stringify(fullManifest, null, 2)
  );
  console.log('✅ Все размеры сгенерированы.');
})();