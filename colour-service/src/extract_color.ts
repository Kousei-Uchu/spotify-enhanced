import type { Swatch, Vec3 } from "@vibrant/color";
import Vibrant from "node-vibrant";
import { getRGBContrastRatio } from "./rgb";

const CONTRAST_RATIO = 4.5;
const COLOR_SIMILARITY_THRESHOLD = 150;

const customGenerator = (swatches: Swatch[]) => {
  swatches.sort((a, b) => b.population - a.population);

  const backgroundColor = swatches[0];
  let foregroundColor: Vec3 | undefined;

  const contrastRatios = new Map<string, number>();
  const approvedContrastRatio = (hex: string, rgb: Swatch["rgb"]) => {
    if (!contrastRatios.has(hex)) {
      contrastRatios.set(hex, getRGBContrastRatio(backgroundColor.rgb, rgb));
    }
    return contrastRatios.get(hex)! > CONTRAST_RATIO;
  };

  for (let i = 1; i < swatches.length && foregroundColor === undefined; i++) {
    if (approvedContrastRatio(swatches[i].hex, swatches[i].rgb)) {
      foregroundColor = swatches[i].rgb;
      break;
    }
    const current = swatches[i];
    for (let j = i + 1; j < swatches.length; j++) {
      const compare = swatches[j];
      const diff =
        Math.abs(current.rgb[0] - compare.rgb[0]) +
        Math.abs(current.rgb[1] - compare.rgb[1]) +
        Math.abs(current.rgb[2] - compare.rgb[2]);
      if (diff > COLOR_SIMILARITY_THRESHOLD) continue;
      if (approvedContrastRatio(compare.hex, compare.rgb)) {
        foregroundColor = compare.rgb;
        break;
      }
    }
  }

  if (foregroundColor === undefined) {
    foregroundColor = (backgroundColor as any).getYiq() < 200
      ? [255, 255, 255]
      : [0, 0, 0];
  }

  return { background: backgroundColor, foreground: foregroundColor };
};

const toHex = (rgb: Vec3) =>
  "#" + (rgb as number[]).map(v => Math.round(v).toString(16).padStart(2, "0")).join("");

export const extractColors = async (url: string) => {
  const palette = await new Vibrant(url, { colorCount: 16 }).getPalette();
  const swatches = Object.values(palette).filter(Boolean) as Swatch[];
  const { background, foreground } = customGenerator(swatches);
  return {
    background: { hex: background.hex },
    foreground: { hex: Array.isArray(foreground) ? toHex(foreground as Vec3) : (foreground as any).hex },
  };
};
