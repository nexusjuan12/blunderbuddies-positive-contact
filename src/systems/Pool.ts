/** Fixed-size object pool. Everything is allocated up front; `obtain` never allocates. */
export class Pool<T extends { active: boolean }> {
  readonly items: T[] = [];
  private cursor = 0;

  constructor(size: number, factory: (index: number) => T) {
    for (let i = 0; i < size; i++) this.items.push(factory(i));
  }

  /** Returns an inactive item, or null if the pool is exhausted. */
  obtain(): T | null {
    const items = this.items;
    const n = items.length;
    for (let i = 0; i < n; i++) {
      const idx = (this.cursor + i) % n;
      if (!items[idx].active) {
        this.cursor = (idx + 1) % n;
        return items[idx];
      }
    }
    return null;
  }

  countActive(): number {
    let c = 0;
    for (let i = 0; i < this.items.length; i++) if (this.items[i].active) c++;
    return c;
  }
}
