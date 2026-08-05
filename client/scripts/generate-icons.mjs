import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, "..", "public", "icons");

const standard = path.join(__dirname, "icon-source.svg");
const maskable = path.join(__dirname, "icon-source-maskable.svg");

async function run() {
  await sharp(standard).resize(192, 192).png().toFile(path.join(iconsDir, "icon-192.png"));
  await sharp(standard).resize(512, 512).png().toFile(path.join(iconsDir, "icon-512.png"));
  await sharp(maskable).resize(512, 512).png().toFile(path.join(iconsDir, "icon-512-maskable.png"));
  await sharp(maskable).resize(180, 180).png().toFile(path.join(iconsDir, "apple-touch-icon.png"));
  await sharp(standard).resize(32, 32).png().toFile(path.join(iconsDir, "favicon-32.png"));
  console.log("Icons generated in", iconsDir);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
