const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const IMAGES_DIR = path.join(__dirname, 'images');
const QUALITY = 85; // качество webp от 1 до 100

// Рекурсивно ищем все папки проектов
const projectDirs = fs.readdirSync(IMAGES_DIR).filter(name => {
  return fs.statSync(path.join(IMAGES_DIR, name)).isDirectory();
});

async function processProject(projectName) {
  const projectPath = path.join(IMAGES_DIR, projectName);
  const files = fs.readdirSync(projectPath);

  // Отбираем только изображения (jpg, jpeg, png) — не webp
  const images = files.filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ['.jpg', '.jpeg', '.png'].includes(ext);
  });

  let counter = 1;
  for (const imgFile of images) {
    const inputPath = path.join(projectPath, imgFile);
    const outputName = `${projectName}_${counter}.webp`;
    const outputPath = path.join(projectPath, outputName);

    console.log(`  → ${imgFile}  =>  ${outputName}`);

    await sharp(inputPath)
      .webp({ quality: QUALITY })
      .toFile(outputPath);

    // Удаляем оригинал (раскомментируй, когда убедишься, что всё работает)
    fs.unlinkSync(inputPath);

    counter++;
  }

  if (images.length === 0) {
    console.log(`  (нет новых изображений)`);
  } else {
    console.log(`  Готово: ${images.length} шт.`);
  }
}

(async () => {
  console.log('🖼  Конвертация изображений в WebP...\n');
  for (const dir of projectDirs) {
    console.log(`📁 ${dir}`);
    await processProject(dir);
  }
  console.log('\n✅  Готово!');
})();