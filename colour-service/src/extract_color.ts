/**
 * src/extract_color.ts
 *
 * Exact copy of HA's src/common/image/extract_color.ts
 * Uses node-vibrant (Node.js version, not browser bundle) with the exact
 * customGenerator that HA registers as its default palette generator.
 */
import type { Swatch, Vec3 } from "@vibrant/color";
import Vibrant from "node-vibrant";
import { getRGBContrastRatio } from "./rgb";

const CONTRAST_RATIO = 4.5;
const COLOR_SIMILARITY_THRESHOLD = 150;

const customGenerator = (colors: Swatch[]) => {
  colors.sort((colorA, colorB) => colorB.population - colorA.population);

  const backgroundColor = colors[0];
  let foregroundColor: Vec3 | undefined;

  const contrastRatios = new Map<string, number>();
  const approvedContrastRatio = (hex: string, rgb: Swatch["rgb"]) => {
    if (!contrastRatios.has(hex)) {
      contrastRatios.set(hex, getRGBContrastRatio(backgroundColor.rgb, rgb));
    }
    return contrastRatios.get(hex)! > CONTRAST_RATIO;
  };

  for (let i = 1; i < colors.length && foregroundColor === undefined; i++) {
    if (approvedContrastRatio(colors[i].hex, colors[i].rgb)) {
      foregroundColor = colors[i].rgb;
      break;
    }

    const currentColor = colors[i];
    for (let j = i + 1; j < colors.length; j++) {
      const compareColor = colors[j];
      const diffScore =
        Math.abs(currentColor.rgb[0] - compareColor.rgb[0]) +
        Math.abs(currentColor.rgb[1] - compareColor.rgb[1]) +
        Math.abs(currentColor.rgb[2] - compareColor.rgb[2]);

      if (diffScore > COLOR_SIMILARITY_THRESHOLD) continue;

      if (approvedContrastRatio(compareColor.hex, compareColor.rgb)) {
        foregroundColor = compareColor.rgb;
        break;
      }
    }
  }

  if (foregroundColor === undefined) {
    // Same fallback as HA: getYiq() < 200 → white, else black
    // node-vibrant Swatch has a getYiq() method
    foregroundColor =
      (backgroundColor as any).getYiq() < 200
        ? [255, 255, 255]
        : [0, 0, 0];
  }

  return {
    foreground: new (backgroundColor as any).constructor(foregroundColor, 0) as Swatch,
    background: backgroundColor,
  };
};

// Register the custom generator as default — same as HA does with:
// Vibrant._pipeline.generator.register("default", customGenerator)
// In node-vibrant v3 this is the correct API:
(Vibrant as any).DefaultOpts = {
  ...((Vibrant as any).DefaultOpts || {}),
};

export const extractColors = (url: string, downsampleColors = 16) =>
  new Vibrant(url, {
    colorCount: downsampleColors,
    generator: customGenerator as any,
  })
    .getPalette()
    .then((palette) => {
      // getPalette() returns an object { Vibrant, Muted, DarkVibrant, ... }
      // We need to run our generator on the array of swatches
      const swatches = Object.values(palette).filter(Boolean) as Swatch[];
      const { foreground, background } = customGenerator(swatches);
      return { background, foreground };
    });
