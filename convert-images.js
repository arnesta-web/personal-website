const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const IMAGES_DIR = path.join(__dirname, 'images');

// ─── Настройки (можно менять под себя) ──────────────────────────────────────
const MAX_WIDTH = 1900;          // максимальная ширина, высота подстроится
const MAX_HEIGHT = null;         // можно задать число, если нужно ограничить высоту
const WEBP_QUALITY = 90;         // качество near-lossless (0–100), 90 — оптимально

// Удалять ли оригиналы после успешной конвертации
const DELETE_ORIGINALS = false;  // пока false, чтобы проверить результат

// ─── Обработка одной папки проекта ──────────────────────────────────────────
async function processProject(projectName) {
  const projectPath = path.join(IMAGES_DIR, projectName);
  const files = fs.readdirSync(projectPath);

  // только растровые картинки, не webp
  const images = files.filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ['.jpg', '.jpeg', '.png'].includes(ext);
  });

  const result = [];   // имена получившихся webp-файлов
  let counter = 1;

  for (const imgFile of images) {
    const inputPath = path.join(projectPath, imgFile);
    const outputName = `${projectName}_${counter}.webp`;
    const outputPath = path.join(projectPath, outputName);

    console.log(`  → ${imgFile}  =>  ${outputName}`);

    await sharp(inputPath)
      .resize(MAX_WIDTH, MAX_HEIGHT, {
        withoutEnlargement: true,
        fit: 'inside',
      })
      .webp({
        nearLossless: true,
        quality: WEBP_QUALITY,
      })
      .toFile(outputPath);

    // удаляем оригинал, если включено
    if (DELETE_ORIGINALS) {
      fs.unlinkSync(inputPath);
    }

    result.push(outputName);
    counter++;
  }

  if (images.length === 0) {
    console.log(`  (нет новых изображений для конвертации)`);
  } else {
    console.log(`  Готово: ${images.length} шт.`);
  }

  return result;
}

// ─── Главная ─────────────────────────────────────────────────────────────────
(async () => {
  // собираем список подпапок в images
  const projectDirs = fs.readdirSync(IMAGES_DIR).filter(name => {
    return fs.statSync(path.join(IMAGES_DIR, name)).isDirectory();
  });

  console.log('🖼  Конвертация изображений в WebP (near-lossless)…\n');
  const manifest = {};

  for (const dir of projectDirs) {
    console.log(`📁 ${dir}`);
    manifest[dir] = await processProject(dir);
  }

  // сохраняем манифест для возможной динамической подгрузки в будущем
  const manifestPath = path.join(__dirname, 'images-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n✅  Готово! Манифест сохранён в ${manifestPath}`);
})();