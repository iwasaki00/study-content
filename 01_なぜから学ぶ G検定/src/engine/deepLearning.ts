import type { DeepLearningProgress } from "../types";
import { deepStoryStages } from "../data/deepLearning";
export const newDeepLearningProgress = (): DeepLearningProgress => ({
  id: "progress-L007",
  lessonId: "L007",
  stage: "intro",
  visited: ["intro"],
  examplesShown: false,
  animal: null,
  pixelExpanded: false,
  pixelX: 16,
  pixelY: 16,
  networkStep: 0,
  networkSeen: false,
  flow: "training",
  questionIndex: 0,
  completed: false,
  sessionId: crypto.randomUUID(),
  updatedAt: new Date().toISOString(),
});
export const deepLearningFinished = (p: DeepLearningProgress) =>
  p.examplesShown &&
  p.animal !== null &&
  p.pixelExpanded &&
  p.networkSeen &&
  deepStoryStages.every((s) => p.visited.includes(s));
export function pixelAt(
  rgba: ArrayLike<number>,
  width: number,
  x: number,
  y: number,
) {
  if (
    !Number.isInteger(width) ||
    width < 1 ||
    rgba.length % (width * 4) ||
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    x >= width ||
    y < 0 ||
    y >= rgba.length / (width * 4)
  )
    throw Error("画素の位置が不正です");
  const i = (y * width + x) * 4;
  return [rgba[i], rgba[i + 1], rgba[i + 2]] as const;
}
export function grayscale(rgba: ArrayLike<number>) {
  if (rgba.length % 4) throw Error("RGBAデータが不正です");
  return Array.from({ length: rgba.length / 4 }, (_, i) =>
    Math.round(
      0.2126 * rgba[i * 4] +
        0.7152 * rgba[i * 4 + 1] +
        0.0722 * rgba[i * 4 + 2],
    ),
  );
}
export const fixedFilters = {
  edge: [-1, 0, 1, -1, 0, 1, -1, 0, 1],
  average: Array.from({ length: 9 }, () => 1 / 9),
} as const;
// ML convention: cross-correlation (kernel is not flipped). Valid, stride 1.
export function convolve3x3(
  input: readonly number[],
  width: number,
  filter: readonly number[],
) {
  if (
    !Number.isInteger(width) ||
    width < 3 ||
    input.length % width ||
    input.length / width < 3 ||
    filter.length !== 9 ||
    [...input, ...filter].some((v) => !Number.isFinite(v))
  )
    throw Error("フィルタの入力が不正です");
  const outputWidth = width - 2,
    outputHeight = input.length / width - 2;
  return Array.from({ length: outputWidth * outputHeight }, (_, i) => {
    const x = i % outputWidth,
      y = Math.floor(i / outputWidth);
    return filter.reduce(
      (sum, weight, k) =>
        sum + input[(y + Math.floor(k / 3)) * width + x + (k % 3)] * weight,
      0,
    );
  });
}
