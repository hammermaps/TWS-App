// scripts/generate-icons.cjs
// Generates PNG icons from the SVG sources in public/icons
const fs = require('fs')
const path = require('path')

async function main() {
  const sharp = require('sharp')
  const srcDir = path.join(__dirname, '..', 'public', 'icons')
  const outDir = srcDir
  const prefer = 'icon-512.svg'
  const fallback = 'icon-192.svg'

  let src = path.join(srcDir, prefer)
  if (!fs.existsSync(src)) {
    src = path.join(srcDir, fallback)
    if (!fs.existsSync(src)) {
      console.error('No source SVG found. Please ensure public/icons/icon-512.svg or icon-192.svg exists.')
      process.exit(1)
    }
  }

  const sizes = [48, 72, 96, 144, 192, 256, 384, 512]

  console.log('Generating PNG icons from', src)
  await Promise.all(
    sizes.map(async (size) => {
      const out = path.join(outDir, `icon-${size}.png`)
      await sharp(src)
        .resize(size, size, { fit: 'contain' })
        .png()
        .toFile(out)
      console.log('wrote', out)
    }),
  )

  // also generate adaptive icon foreground/background placeholders
  const adaptiveFg = path.join(outDir, 'adaptive-icon-foreground.png')
  const adaptiveBg = path.join(outDir, 'adaptive-icon-background.png')
  await sharp(src).resize(432, 432).png().toFile(adaptiveFg)
  await sharp({
    create: {
      width: 1080,
      height: 1080,
      channels: 4,
      background: '#2563eb',
    },
  })
    .png()
    .toFile(adaptiveBg)
  console.log('wrote', adaptiveFg)
  console.log('wrote', adaptiveBg)

  console.log('All icons generated.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

