import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import {
  rgbaToGray,
  correlate3,
  windowTerms,
  relu,
  maxPool2,
  mapColors,
  kernels,
  pipeline,
  newCnnProgress,
} from "./cnn";
import { cnnQuestions, cnnDives, cnnSources, cnnStages } from "../data/cnn";
import {
  emptyBackup,
  beginCnn,
  completeCnn,
  beginEvaluation,
  beginGeneralization,
  beginFairness,
  beginDeepLearning,
  beginTraining,
  validateBackup,
  mergeBackups,
  grade,
  restartLesson,
} from "./learning";
import { learn } from "./training";
import "fake-indexeddb/auto";
import { loadState, saveState } from "./storage";
function png(name: string) {
  const b = readFileSync(
    new URL(
      "../../public/illustrations/l009/" + name + "-16.png",
      import.meta.url,
    ),
  );
  expect([...b.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(b.readUInt32BE(16)).toBe(16);
  expect(b.readUInt32BE(20)).toBe(16);
  expect(b[25]).toBe(6);
  const parts: Buffer[] = [];
  for (let at = 8; at < b.length;) {
    const n = b.readUInt32BE(at),
      type = b.toString("ascii", at + 4, at + 8);
    if (type === "IDAT") parts.push(b.subarray(at + 8, at + 8 + n));
    at += n + 12;
  }
  const raw = inflateSync(Buffer.concat(parts)),
    rgba: number[] = [];
  for (let row = 0; row < 16; row++) {
    expect(raw[row * 65]).toBe(0);
    rgba.push(...raw.subarray(row * 65 + 1, row * 65 + 65));
  }
  return rgba;
}
it("both original assets are real 16x16 RGBA PNGs and produce different data", () => {
  const cat = png("cat"),
    dog = png("dog");
  expect(cat).toHaveLength(1024);
  expect(cat).not.toEqual(dog);
  for (const rgba of [cat, dog]) {
    const g = rgbaToGray(rgba);
    expect(g).toHaveLength(256);
    expect(g.every((v) => v >= 0 && v <= 1)).toBe(true);
  }
});
it("white alpha compositing and weighted normalized grayscale match hand-computed colors", () => {
  const values = rgbaToGray([
    255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 0, 0, 0, 0, 255, 0, 0, 128,
  ]);
  expect(values[0]).toBeCloseTo(0.2126, 12);
  expect(values[1]).toBeCloseTo(0.7152, 12);
  expect(values[2]).toBeCloseTo(0.0722, 12);
  expect(values[3]).toBeCloseTo(1, 12);
  expect(values[4]).toBeCloseTo(0.2126 + ((1 - 0.2126) * 127) / 255, 12);
});
it("hand matrices confirm sum, orientation and no kernel reversal", () => {
  expect(correlate3([0, 0, 1, 0, 0, 1, 0, 0, 1], 3, kernels.A).values).toEqual([
    3,
  ]);
  const input = Array.from({ length: 9 }, (_, i) => i);
  expect(correlate3(input, 3, kernels.A).values).toEqual([6]);
  expect(correlate3(input, 3, kernels.B).values).toEqual([18]);
  expect(correlate3(input, 3, kernels.C).values[0]).toBeCloseTo(4, 12);
  expect(() => correlate3([], 3, kernels.A)).toThrow();
  expect(() => windowTerms(input, 3, 1, 0, kernels.A)).toThrow();
});
it("all 196 positions in every filter equal an independent nine-term loop on actual PNG values", () => {
  const data = rgbaToGray(png("cat"));
  for (const k of Object.values(kernels)) {
    const r = correlate3(data, 16, k);
    expect([r.width, r.height, r.values.length]).toEqual([14, 14, 196]);
    for (let y = 0; y < 14; y++)
      for (let x = 0; x < 14; x++) {
        let sum = 0;
        for (let j = 0; j < 3; j++)
          for (let i = 0; i < 3; i++)
            sum += data[(y + j) * 16 + x + i] * k[j * 3 + i];
        expect(r.values[y * 14 + x]).toBeCloseTo(sum, 12);
      }
  }
});
it("A/B/C and cat/dog produce distinct maps with positive, negative and zero values preserved", () => {
  const cat = rgbaToGray(png("cat")),
    dog = rgbaToGray(png("dog")),
    a = pipeline(cat, kernels.A),
    b = pipeline(cat, kernels.B),
    c = pipeline(cat, kernels.C);
  expect(a.conv.values).not.toEqual(b.conv.values);
  expect(a.conv.values).not.toEqual(c.conv.values);
  expect(a.conv.values).not.toEqual(pipeline(dog, kernels.A).conv.values);
  expect(a.conv.values.some((v) => v < 0)).toBe(true);
  expect(a.conv.values.some((v) => v > 0)).toBe(true);
  expect(c.conv.values.every((v) => v >= 0 && v <= 1)).toBe(true);
});
it("ReLU and 2x2 stride2 max pooling match hand values and actual 14-to-7 maps", () => {
  expect(relu([-2, -0, 0, 0.25, 3])).toEqual([0, 0, 0, 0.25, 3]);
  expect(
    maxPool2([1, 2, 5, 4, 3, 0, 7, 6, -1, 8, 2, 3, 4, 5, 6, 9], 4).values,
  ).toEqual([3, 7, 8, 9]);
  const p = pipeline(rgbaToGray(png("cat")), kernels.A);
  expect(p.activated.every((v) => v >= 0)).toBe(true);
  expect([p.pooled.width, p.pooled.height, p.pooled.values.length]).toEqual([
    7, 7, 49,
  ]);
  for (let y = 0; y < 7; y++)
    for (let x = 0; x < 7; x++) {
      const values = [
        p.activated[y * 2 * 14 + x * 2],
        p.activated[y * 2 * 14 + x * 2 + 1],
        p.activated[(y * 2 + 1) * 14 + x * 2],
        p.activated[(y * 2 + 1) * 14 + x * 2 + 1],
      ];
      expect(p.pooled.values[y * 7 + x]).toBe(Math.max(...values));
    }
});
it("visual normalization never changes raw data and distinguishes negative/zero/positive", () => {
  const raw = Object.freeze([-2, 0, 2]),
    before = [...raw],
    colors = mapColors(raw);
  expect(raw).toEqual(before);
  expect(colors[0]).not.toEqual(colors[1]);
  expect(colors[1]).not.toEqual(colors[2]);
  expect(colors[0][2]).toBeGreaterThan(colors[0][0]);
  expect(colors[2][0]).toBeGreaterThan(colors[2][2]);
});
const legacy = () => {
  let b = beginTraining(
    beginDeepLearning(
      beginFairness(beginGeneralization(beginEvaluation(emptyBackup()))),
    ),
  );
  b.training = learn(b.training!, 50);
  b.training.stage = "practice";
  b.training.visited = ["intro", "features", "loss", "update", "practice"];
  return b;
};
it("save/reload resumes same image/filter/position/open dives, preserving all six old lessons", async () => {
  const old = legacy(),
    b = beginCnn(old);
  Object.assign(b.cnn!, {
    stage: "filters",
    visited: cnnStages.slice(0, 4),
    image: "dog",
    filter: "B",
    position: 137,
    mathOpen: true,
    openDives: ["L009-D02"],
  });
  await saveState(b);
  expect(await loadState()).toEqual(b);
  expect(beginCnn(b)).toBe(b);
  const reset = beginCnn(b, true);
  for (const key of [
    "progress",
    "evaluation",
    "generalization",
    "fairness",
    "deepLearning",
    "training",
    "attempts",
    "reviews",
    "settings",
  ] as const)
    expect(reset[key]).toEqual(old[key]);
  expect(reset.cnn!.position).toBe(0);
  expect(reset.cnn!.filter).toBe("A");
  expect(restartLesson(b).cnn).toEqual(b.cnn);
  expect(mergeBackups(b, old).cnn).toEqual(b.cnn);
});
it("completion is quiz-free, restart preserves answers/completions and review can change the pipeline display", () => {
  const b = beginCnn(legacy());
  expect(() => completeCnn(b)).toThrow();
  Object.assign(b.cnn!, {
    stage: "ending",
    visited: [...cnnStages],
    poolStage: 3,
    poolDone: true,
  });
  b.cnnAttempts = [
    grade(cnnQuestions[0].id, 0, b.cnn!.sessionId, cnnQuestions),
  ];
  const done = completeCnn(b),
    again = beginCnn(done, true);
  expect(validateBackup(done)).toEqual(done);
  expect(again.cnnAttempts).toEqual(b.cnnAttempts);
  expect(again.completions).toEqual(done.completions);
  done.cnn!.stage = "pooling";
  done.cnn!.poolStage = 0;
  expect(validateBackup(done)).toEqual(done);
  for (const change of [
    { position: 196 },
    { pixel: 256 },
    { poolPosition: 49 },
    { filter: "Z" },
    { poolDone: false },
  ]) {
    const bad = structuredClone(b);
    Object.assign(bad.cnn!, change);
    expect(() => validateBackup(bad)).toThrow();
  }
});
it("five questions grade all options and five explanations cite valid sources", () => {
  expect(cnnQuestions).toHaveLength(5);
  for (const q of cnnQuestions) {
    expect(q.options).toHaveLength(4);
    q.options.forEach((o, i) => {
      expect(o.explanation.length).toBeGreaterThan(20);
      expect(grade(q.id, i, "test", cnnQuestions).correct).toBe(i === q.answer);
    });
    q.sourceIds.forEach((id) =>
      expect(cnnSources.some((s) => s.id === id)).toBe(true),
    );
  }
  expect(cnnDives).toHaveLength(5);
  for (const d of cnnDives) {
    expect(d.detail.length).toBeGreaterThan(30);
    d.sources.forEach((id) =>
      expect(cnnSources.some((s) => s.id === id)).toBe(true),
    );
  }
});
