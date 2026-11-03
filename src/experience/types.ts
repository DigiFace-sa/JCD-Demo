/** Per-frame update. `delta` is seconds since the last frame (clamped); `elapsed` is total seconds. */
export interface Updatable {
  update(delta: number, elapsed: number): void;
}

/** Releases every GPU resource and listener the object created. Must be safe to call once. */
export interface Disposable {
  dispose(): void;
}
