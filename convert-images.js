const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const IMAGES_DIR = path.join(__dirname, 'images');
const QUALITY = 100;          // качество WebP (0–100)
const MAX_WIDTH = 1400;      // максимальная ширина
const MAX_HEIGHT = null;     // максимальная высота (null = не ограничивать)

async function processProject(projectName) {
  const projectPath = path.join(IMAGES_DIR, projectName);
  const files = fs.readdirSync(projectPath);
  const images = files.filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ['.jpg', '.jpeg', '.png'].includes(ext);
  });

  const result = [];
  let counter = 1;

  for (const imgFile of images) {
    const inputPath = path.join(projectPath, imgFile);
    const outputName = `${projectName}_${counter}.webp`;
    const outputPath = path.join(projectPath, outputName);

    console.log(`  → ${imgFile}  =>  ${outputName}`);

    await sharp(inputPath)
      .resize(MAX_WIDTH, MAX_HEIGHT, { withoutEnlargement: true, fit: 'inside' })
      .webp({ quality: QUALITY })
      .toFile(outputPath);

    // Удаляем оригинал (раскомментируй, когда проверишь результат)
    fs.unlinkSync(inputPath);

    result.push(outputName);
    counter++;
  }

  if (images.length === 0) {
    console.log(`  (нет новых изображений)`);
  } else {
    console.log(`  Готово: ${images.length} шт.`);
  }

  return result;
}

(async () => {
  const projectDirs = fs.readdirSync(IMAGES_DIR).filter(name => {
    return fs.statSync(path.join(IMAGES_DIR, name)).isDirectory();
  });

  console.log('🖼  Конвертация изображений в WebP с ресайзом...\n');
  const manifest = {};

  for (const dir of projectDirs) {
    console.log(`📁 ${dir}`);
    manifest[dir] = await processProject(dir);
  }

  const manifestPath = path.join(__dirname, 'images-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n✅  Готово! Манифест сохранён в ${manifestPath}`);
})();