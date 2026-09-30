/** Skippable video cutscenes (processed by tools/process_assets.py; streamed when needed, not preloaded). */
export const CUTSCENES = {
  /** Story intro: plays once per session after the first Buddy select. */
  intro: { file: 'cutscene-intro.mp4' },
} as const;

export type CutsceneId = keyof typeof CUTSCENES;
