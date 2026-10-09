/**
 * A Storage whose quota can run out on demand. happy-dom's own localStorage can't be
 * made to throw reliably: spies on its methods neither take effect nor restore.
 */
export class FakeStorage {
  private items = new Map<string, string>();
  /** setItem() throws QuotaExceededError this many more times */
  failures = 0;

  get length() {
    return this.items.size;
  }
  key(index: number) {
    return [...this.items.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failures > 0) {
      this.failures--;
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    }
    this.items.set(key, String(value));
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
  clear() {
    this.items.clear();
  }
  keys() {
    return [...this.items.keys()];
  }
}
