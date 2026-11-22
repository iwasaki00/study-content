import type { CnnProgress } from "../types";
import { cnnStages } from "../data/cnn";
export const kernels = {
  A: [-1, 0, 1, -1, 0, 1, -1, 0, 1],
  B: [-1, -1, -1, 0, 0, 0, 1, 1, 1],
  C: Array(9).fill(1 / 9) as number[],
} as const;
export function rgbaToGray(rgba: ArrayLike<number>) {
  if (rgba.length % 4) throw Error("RGBAデータが不正です");
  return Array.from({ length: rgba.length / 4 }, (_, i) => {
    const a = rgba[i * 4 + 3] / 255,
      rgb = [rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]].map(
        (v) => v * a + 255 * (1 - a),
      );
    if ([...rgb, a].some((v) => !Number.isFinite(v)) || a < 0 || a > 1)
      throw Error("画素値が不正です");
    return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  });
}
export function windowTerms(
  data: readonly number[],
  width: number,
  x: number,
  y: number,
  kernel: readonly number[],
) {
  if (
    !Number.isInteger(width) ||
    width < 3 ||
    data.length % width ||
    kernel.length !== 9 ||
    [...data, ...kernel].some((v) => !Number.isFinite(v)) ||
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    x > width - 3 ||
    y < 0 ||
    y > data.length / width - 3
  )
    throw Error("選択範囲が不正です");
  return kernel.map((weight, k) => {
    const value = data[(y + Math.floor(k / 3)) * width + x + (k % 3)];
    return { value, weight, product: value * weight };
  });
}
export function correlate3(
  data: readonly number[],
  width: number,
  kernel: readonly number[],
) {
  if (data.length / width < 3) throw Error("画像が小さすぎます");
  const height = data.length / width,
    outWidth = width - 2,
    outHeight = height - 2;
  const values = Array.from({ length: outWidth * outHeight }, (_, i) =>
    windowTerms(
      data,
      width,
      i % outWidth,
      Math.floor(i / outWidth),
      kernel,
    ).reduce((sum, t) => sum + t.product, 0),
  );
  return { width: outWidth, height: outHeight, values };
}
export const relu = (values: readonly number[]) =>
  values.map((v) => Math.max(0, v));
export function maxPool2(values: readonly number[], width: number) {
  if (
    !Number.isInteger(width) ||
    width < 2 ||
    values.length % width ||
    width % 2 ||
    (values.length / width) % 2 ||
    values.some((v) => !Number.isFinite(v))
  )
    throw Error("2×2でまとめられる画像が必要です");
  const outWidth = width / 2,
    outHeight = values.length / width / 2;
  return {
    width: outWidth,
    height: outHeight,
    values: Array.from({ length: outWidth * outHeight }, (_, i) => {
      const x = (i % outWidth) * 2,
        y = Math.floor(i / outWidth) * 2;
      return Math.max(
        values[y * width + x],
        values[y * width + x + 1],
        values[(y + 1) * width + x],
        values[(y + 1) * width + x + 1],
      );
    }),
  };
}
export function pipeline(data: readonly number[], kernel: readonly number[]) {
  const conv = correlate3(data, 16, kernel),
    activated = relu(conv.values),
    pooled = maxPool2(activated, 14);
  return { conv, activated, pooled };
}
export function mapColors(values: readonly number[], signed = true) {
  const max = Math.max(1e-12, ...values.map(Math.abs)),
    zero = [246, 242, 232];
  return values.map((v) => {
    const t = Math.min(1, Math.abs(v) / max),
      end = v < 0 && signed ? [42, 85, 150] : [184, 79, 31];
    return zero.map((z, i) => Math.round(z + (end[i] - z) * t));
  });
}
export const newCnnProgress = (): CnnProgress => ({
  id: "progress-L009",
  lessonId: "L009",
  stage: "intro",
  visited: ["intro"],
  image: "cat",
  filter: "A",
  position: 0,
  pixel: 0,
  poolStage: 0,
  poolDone: false,
  poolPosition: 0,
  cnnStep: 0,
  mathOpen: false,
  openDives: [],
  questionIndex: 0,
  sessionId: crypto.randomUUID(),
  updatedAt: new Date().toISOString(),
  completed: false,
});
export const cnnFinished = (p: CnnProgress) =>
  p.poolDone && cnnStages.every((s) => p.visited.includes(s));
