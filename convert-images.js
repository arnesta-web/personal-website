const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// ─── НАСТРОЙКИ ──────────────────────────────────────────────────────────────
const IMAGES_DIR = path.join(__dirname, 'images');   // папка с проектами
const MAX_WIDTH = 1680;                              // максимальная ширина
const MAX_HEIGHT = null;                             // null = без ограничения высоты

const WEBP_MODE = 'lossy';          // 'lossy' / 'nearLossless' / 'lossless'
const WEBP_QUALITY = 92;            // качество (0–100)
const WEBP_EFFORT = 6;              // 6 – макс. сжатие, медленнее, но файл меньше

const DELETE_ORIGINALS = false;     // ★ поставь true, когда убедишься, что всё ок

// ─── ОДИН ПРОЕКТ ────────────────────────────────────────────────────────────
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

    // Собираем настройки WebP
    let webpOptions;
    switch (WEBP_MODE) {
      case 'lossless':
        webpOptions = { lossless: true, effort: WEBP_EFFORT };
        break;
      case 'nearLossless':
        webpOptions = { nearLossless: true, quality: WEBP_QUALITY, effort: WEBP_EFFORT };
        break;
      case 'lossy':
      default:
        webpOptions = { lossless: false, quality: WEBP_QUALITY, effort: WEBP_EFFORT, smartSubsample: true };
        break;
    }

    await sharp(inputPath)
      .resize(MAX_WIDTH, MAX_HEIGHT, {
        withoutEnlargement: true,   // не увеличивать маленькие
        fit: 'inside',              // вписать с сохранением пропорций
      })
      .webp(webpOptions)
      .toFile(outputPath);

    // Удаляем оригинал, если включён флаг
    if (DELETE_ORIGINALS) {
      fs.unlinkSync(inputPath);
    }

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

// ─── ЗАПУСК ─────────────────────────────────────────────────────────────────
(async () => {
  if (!fs.existsSync(IMAGES_DIR)) {
    console.log('⚠️  Папка images не найдена. Создайте её и положите внутрь папки проектов.');
    return;
  }

  const projectDirs = fs.readdirSync(IMAGES_DIR).filter(name => {
    return fs.statSync(path.join(IMAGES_DIR, name)).isDirectory();
  });

  if (projectDirs.length === 0) {
    console.log('⚠️  В папке images нет подпапок проектов.');
    return;
  }

  console.log('🖼  Оптимизация изображений в WebP (режим ' + WEBP_MODE + ', качество ' + WEBP_QUALITY + ', effort ' + WEBP_EFFORT + ')...\n');

  const manifest = {};

  for (const dir of projectDirs) {
    console.log(`📁 ${dir}`);
    manifest[dir] = await processProject(dir);
  }

  // Сохраняем манифест (опционально, пригодится для динамической подгрузки)
  const manifestPath = path.join(__dirname, 'images-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n✅  Готово! Манифест сохранён в ${manifestPath}`);

  if (DELETE_ORIGINALS) {
    console.log('🗑️  Оригиналы удалены.');
  } else {
    console.log('💡 Оригиналы сохранены. Чтобы удалять автоматически, поставьте DELETE_ORIGINALS = true в начале скрипта.');
  }
})();