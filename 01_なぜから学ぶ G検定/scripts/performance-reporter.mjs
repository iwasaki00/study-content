import fs from "node:fs";
// Record evidence about cumulative scenario and screenshot costs, without changing time limits.
export default class PerformanceReporter {
  results = [];
  steps = new WeakMap();
  onStepEnd(test, result, step) {
    if (!/screenshot/i.test(step.title)) return;
    const list = this.steps.get(result) ?? [];
    list.push({ title: step.title, milliseconds: step.duration });
    this.steps.set(result, list);
  }
  onTestEnd(test, result) {
    const screenshots = this.steps.get(result) ?? [];
    this.results.push({
      project: test.parent.project()?.name,
      title: test.title,
      repeat: test.repeatEachIndex,
      retry: result.retry,
      status: result.status,
      durationMs: result.duration,
      screenshotCount: screenshots.length,
      screenshotMs: screenshots.reduce((n, s) => n + s.milliseconds, 0),
      screenshots,
      error: result.error?.message,
    });
  }
  onEnd(result) {
    const file =
      process.env.LEARNING_PERF_REPORT ?? "docs/performance-v0.1.9.json";
    fs.writeFileSync(
      file,
      JSON.stringify(
        {
          status: result.status,
          workers: "Configured single worker; timeout remains 45000ms",
          cases: this.results,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(`Performance evidence: ${file}`);
  }
}
