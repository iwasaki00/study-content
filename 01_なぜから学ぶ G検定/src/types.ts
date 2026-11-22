export interface Course {
  id: string;
  title: string;
  lessonIds: string[];
}
export interface Lesson {
  id: string;
  title: string;
  courseId: string;
  sceneIds: string[];
  syllabusIds: string[];
}
export interface Scene {
  id: string;
  title: string;
  eyebrow: string;
  prompt: string;
}
export interface Concept {
  id: string;
  name: string;
  description: string;
}
export interface Relationship {
  id: string;
  from: string;
  to: string;
  type: "前提知識" | "比較" | "応用" | "関連";
}
export interface SyllabusItem {
  id: string;
  title: string;
  source: string;
  version: string;
  checkedAt: string;
}
export interface Question {
  id: string;
  version: number;
  text: string;
  options: { text: string; explanation: string }[];
  answer: number;
  clue: string;
  conceptIds: string[];
  sourceIds: string[];
}
export interface QuestionAttempt {
  id: string;
  questionId: string;
  version: number;
  selected: number;
  correct: boolean;
  answeredAt: string;
  sessionId: string;
}
export interface EpisodeProgress {
  stage: "sorting" | "records" | "routes" | "ending";
  grouped: boolean;
  compared: boolean;
  priority: "speed" | "care";
}
export interface LearningProgress {
  episode?: EpisodeProgress;
  id: string;
  lessonId: string;
  scene: number;
  questionIndex: number;
  completed: boolean;
  visited: number[];
  updatedAt: string;
  sessionId: string;
  /** Kept for v0.1.0 backups; the prediction form is no longer shown. */
  predictions: number[];
  started?: boolean;
  storySampleAdded?: boolean;
  prologueScroll?: number;
  introStage?: "prologue" | "ai-trial" | "sorting";
  challenge: number | null;
  challengeLabelled: boolean;
}
export interface ReviewState {
  id: string;
  questionId: string;
  dueAt: string;
  reason: "correct" | "incorrect" | "manual";
  updatedAt: string;
}
export interface Settings {
  id: "settings";
  speed: number;
}
export interface LessonCompletion {
  id: string;
  lessonId: string;
  sessionId: string;
  recordedAt: string;
}
export interface EvaluationProgress {
  id: "progress-L004";
  lessonId: "L004";
  stage: "intro" | "discovery" | "comparison" | "ending" | "quiz";
  visited: EvaluationProgress["stage"][];
  questionIndex: number;
  sessionId: string;
  updatedAt: string;
  completed: boolean;
}
export interface GeneralizationProgress {
  id: "progress-L005";
  lessonId: "L005";
  stage: "intro" | "practice" | "refined" | "comparison" | "ending";
  visited: GeneralizationProgress["stage"][];
  prediction: "basic" | "refined" | "same" | null;
  sessionId: string;
  updatedAt: string;
  completed: boolean;
}
export interface FairnessProgress {
  id: "progress-L006";
  lessonId: "L006";
  stage:
    | "intro"
    | "results"
    | "investigation"
    | "lighting"
    | "bias"
    | "fairness"
    | "ending"
    | "quiz"
    | "details";
  visited: FairnessProgress["stage"][];
  lightingAdjusted: boolean;
  questionIndex: number;
  sessionId: string;
  updatedAt: string;
  completed: boolean;
}
export interface Backup {
  cnn?: CnnProgress;
  cnnAttempts?: QuestionAttempt[];
  training?: TrainingProgress;
  trainingAttempts?: QuestionAttempt[];
  deepLearning?: DeepLearningProgress;
  deepLearningAttempts?: QuestionAttempt[];
  fairness?: FairnessProgress;
  fairnessAttempts?: QuestionAttempt[];
  generalization?: GeneralizationProgress;
  evaluation?: EvaluationProgress;
  evaluationAttempts?: QuestionAttempt[];
  completions?: LessonCompletion[];
  formatVersion: 1;
  exportedAt: string;
  attempts: QuestionAttempt[];
  progress: LearningProgress;
  reviews: ReviewState[];
  settings: Settings;
}
export interface DeepLearningProgress {
  id: "progress-L007";
  lessonId: "L007";
  stage:
    | "intro"
    | "photos"
    | "pixels"
    | "layers"
    | "training"
    | "uses"
    | "ending"
    | "quiz"
    | "details";
  visited: DeepLearningProgress["stage"][];
  examplesShown: boolean;
  animal: number | null;
  pixelExpanded: boolean;
  pixelX: number;
  pixelY: number;
  networkStep: number;
  networkSeen: boolean;
  flow: "training" | "inference";
  questionIndex: number;
  sessionId: string;
  updatedAt: string;
  completed: boolean;
}
export interface TrainingRow {
  id: string;
  ear: number;
  nose: number;
  label: number;
}
export interface TrainingPoint {
  step: number;
  loss: number;
  correct: number;
  catScore: number;
}
export interface TrainingProgress {
  id: "progress-L008";
  lessonId: "L008";
  stage:
    | "intro"
    | "features"
    | "loss"
    | "update"
    | "practice"
    | "evaluation"
    | "ending"
    | "quiz"
    | "details";
  visited: TrainingProgress["stage"][];
  parameters: number[];
  previousParameters: number[];
  updates: number;
  history: TrainingPoint[];
  trainedOnce: boolean;
  evaluated: boolean;
  openDives: string[];
  modelDetails: boolean;
  questionIndex: number;
  sessionId: string;
  updatedAt: string;
  completed: boolean;
}
export interface CnnProgress {
  id: "progress-L009";
  lessonId: "L009";
  stage:
    | "intro"
    | "pixels"
    | "window"
    | "filters"
    | "pooling"
    | "cnn"
    | "ending"
    | "quiz"
    | "details";
  visited: CnnProgress["stage"][];
  image: "cat" | "dog";
  filter: "A" | "B" | "C";
  position: number;
  pixel: number;
  poolStage: number;
  poolDone: boolean;
  poolPosition: number;
  cnnStep: number;
  mathOpen: boolean;
  openDives: string[];
  questionIndex: number;
  sessionId: string;
  updatedAt: string;
  completed: boolean;
}
