import fs from "fs";
import path from "path";

async function downloadFonts() {
  const fontDir = path.join(process.cwd(), "assets", "fonts");
  if (!fs.existsSync(fontDir)) {
    fs.mkdirSync(fontDir, { recursive: true });
  }

  const regularUrl =
    "https://fonts.gstatic.com/s/notosansbengali/v33/Cn-SJsCGWQxOjaGwMQ6fIiMywrNJIky6nvd8BjzVMvJx2mcSPVFpVEqE-6KmsolLudA.ttf";
  const boldUrl =
    "https://fonts.gstatic.com/s/notosansbengali/v33/Cn-SJsCGWQxOjaGwMQ6fIiMywrNJIky6nvd8BjzVMvJx2mcSPVFpVEqE-6Kmsm5MudA.ttf";

  console.log("Downloading Regular font...");
  const resReg = await fetch(regularUrl);
  const bufReg = Buffer.from(await resReg.arrayBuffer());
  fs.writeFileSync(path.join(fontDir, "NotoSansBengali-Regular.ttf"), bufReg);
  console.log("Saved Regular font, bytes:", bufReg.length);

  console.log("Downloading Bold font...");
  const resBold = await fetch(boldUrl);
  const bufBold = Buffer.from(await resBold.arrayBuffer());
  fs.writeFileSync(path.join(fontDir, "NotoSansBengali-Bold.ttf"), bufBold);
  console.log("Saved Bold font, bytes:", bufBold.length);
}

downloadFonts()
  .then(() => console.log("Font download complete."))
  .catch((err) => {
    console.error("Font download failed:", err);
    process.exit(1);
  });
