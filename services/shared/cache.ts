// ─── Miamo Shared Cache Layer ─────────────────────────
// In-process LRU cache with TTL — zero-dependency, production-ready
// Works across all microservices without external Redis dependency
// Uses DSA: LRU eviction via doubly-linked list + HashMap (O(1) get/set/delete)

interface CacheEntry<T> {
  key: string;
  value: T;
  expiresAt: number;
  prev: CacheEntry<T> | null;
  next: CacheEntry<T> | null;
}

/**
 * Least Recently Used (LRU) cache with time-to-live (TTL) expiration.
 *
 * Uses a doubly-linked list + HashMap for O(1) get/set/delete.
 * When capacity is exceeded, the least recently accessed entry is evicted.
 * TTL-expired entries are lazily evicted on access.
 *
 * @template T - The type of cached values
 *
 * @example
 * ```ts
 * const cache = new LRUCache<UserProfile>(500);
 * cache.set('user:123', profile, 600_000); // 10-min TTL
 * const hit = cache.get('user:123'); // moves to head, returns profile or null
 * ```
 */
export class LRUCache<T = any> {
  private map = new Map<string, CacheEntry<T>>();
  private head: CacheEntry<T> | null = null;  // Most recently used
  private tail: CacheEntry<T> | null = null;  // Least recently used
  private maxSize: number;
  private hits = 0;
  private misses = 0;

  /** @param maxSize - Maximum number of entries before LRU eviction (default: 1000) */
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  private detach(entry: CacheEntry<T>) {
    if (entry.prev) entry.prev.next = entry.next;
    else this.head = entry.next;
    if (entry.next) entry.next.prev = entry.prev;
    else this.tail = entry.prev;
    entry.prev = null;
    entry.next = null;
  }

  private attachToHead(entry: CacheEntry<T>) {
    entry.next = this.head;
    entry.prev = null;
    if (this.head) this.head.prev = entry;
    this.head = entry;
    if (!this.tail) this.tail = entry;
  }

  /**
   * Retrieve a cached value by key. Moves the entry to the head (most recently used).
   * Returns `null` if the key is missing or the entry has expired (lazy eviction).
   * @param key - Cache key to look up
   * @returns The cached value, or `null` if not found / expired
   */
  get(key: string): T | null {
    const entry = this.map.get(key);
    if (!entry) { this.misses++; return null; }
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      this.misses++;
      return null;
    }
    // Move to head (most recently used)
    this.detach(entry);
    this.attachToHead(entry);
    this.hits++;
    return entry.value;
  }

  /**
   * Insert or update a cache entry. Evicts the LRU entry if at capacity.
   * @param key - Cache key
   * @param value - Value to store
   * @param ttlMs - Time-to-live in milliseconds
   */
  set(key: string, value: T, ttlMs: number): void {
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      existing.expiresAt = Date.now() + ttlMs;
      this.detach(existing);
      this.attachToHead(existing);
      return;
    }
    // Evict LRU if at capacity
    while (this.map.size >= this.maxSize && this.tail) {
      this.map.delete(this.tail.key);
      this.detach(this.tail);
    }
    const entry: CacheEntry<T> = { key, value, expiresAt: Date.now() + ttlMs, prev: null, next: null };
    this.map.set(key, entry);
    this.attachToHead(entry);
  }

  /**
   * Remove a specific entry from the cache.
   * @param key - Cache key to remove
   * @returns `true` if the entry existed and was removed
   */
  delete(key: string): boolean {
    const entry = this.map.get(key);
    if (!entry) return false;
    this.detach(entry);
    this.map.delete(key);
    return true;
  }

  /** Invalidate all keys matching a prefix */
  invalidatePrefix(prefix: string): number {
    let count = 0;
    for (const key of this.map.keys()) {
      if (key.startsWith(prefix)) { this.delete(key); count++; }
    }
    return count;
  }

  /** Remove all entries from the cache and reset internal pointers. */
  clear(): void {
    this.map.clear();
    this.head = null;
    this.tail = null;
  }

  get size(): number { return this.map.size; }
  get stats(): { hits: number; misses: number; hitRate: number; size: number } {
    const total = this.hits + this.misses;
    return { hits: this.hits, misses: this.misses, hitRate: total > 0 ? this.hits / total : 0, size: this.map.size };
  }
}

// ─── Singleton Cache Instances ───────────────────────
// Separate caches for different data types with appropriate sizes

/** Profile cache — user profiles, 10min TTL */
export const profileCache = new LRUCache(500);

/** Discover cache — discover results, 30s TTL */
export const discoverCache = new LRUCache(200);

/** Feed cache — feed results, 30s TTL */
export const feedCache = new LRUCache(200);

/** AI Match cache — suggestions, 5min TTL */
export const aiMatchCache = new LRUCache(100);

/** Activity aggregation cache — user behavior summaries, 15min TTL */
export const activityCache = new LRUCache(300);

/** General cache — miscellaneous data */
export const generalCache = new LRUCache(500);

// ─── TTL Constants (milliseconds) ────────────────────
export const TTL = {
  PROFILE: 10 * 60 * 1000,      // 10 minutes
  DISCOVER: 30 * 1000,           // 30 seconds
  FEED: 30 * 1000,               // 30 seconds
  AI_MATCH: 5 * 60 * 1000,       // 5 minutes
  ACTIVITY_SUMMARY: 15 * 60 * 1000, // 15 minutes
  CHAT_SUGGESTIONS: 2 * 60 * 1000,  // 2 minutes
  VIBE: 60 * 1000,               // 1 minute
  SHORT: 10 * 1000,              // 10 seconds
  MEDIUM: 60 * 1000,             // 1 minute
  LONG: 30 * 60 * 1000,          // 30 minutes
} as const;

// ─── Priority Queue (Min-Heap) for Top-K scoring ─────
// Used in AI match and discover algorithms for efficient O(n log k) top-K selection
/**
 * Bounded min-heap for efficient top-K selection.
 *
 * Maintains at most `maxSize` elements. When full, new items are only inserted
 * if their score exceeds the current minimum — giving O(n log k) top-K from n candidates.
 *
 * @template T - The type of items stored in the heap
 *
 * @example
 * ```ts
 * const heap = new MinHeap<UserProfile>(20); // keep top 20
 * for (const candidate of candidates) {
 *   heap.push(scoreForYou(candidate), candidate);
 * }
 * const top20 = heap.drain(); // sorted descending
 * ```
 */
export class MinHeap<T> {
  private heap: { score: number; item: T }[] = [];
  private maxSize: number;

  /** @param maxSize - Maximum number of items to retain (top-K) */
  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  private parent(i: number) { return Math.floor((i - 1) / 2); }
  private left(i: number) { return 2 * i + 1; }
  private right(i: number) { return 2 * i + 2; }

  private swap(i: number, j: number) {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  private siftUp(i: number) {
    while (i > 0 && this.heap[this.parent(i)].score > this.heap[i].score) {
      this.swap(i, this.parent(i));
      i = this.parent(i);
    }
  }

  private siftDown(i: number) {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const l = this.left(i), r = this.right(i);
      if (l < n && this.heap[l].score < this.heap[smallest].score) smallest = l;
      if (r < n && this.heap[r].score < this.heap[smallest].score) smallest = r;
      if (smallest === i) break;
      this.swap(i, smallest);
      i = smallest;
    }
  }

  /** Push item. If heap is full, only keeps if score > min (top-K). O(log k) */
  push(score: number, item: T): void {
    if (this.heap.length < this.maxSize) {
      this.heap.push({ score, item });
      this.siftUp(this.heap.length - 1);
    } else if (score > this.heap[0].score) {
      this.heap[0] = { score, item };
      this.siftDown(0);
    }
  }

  /** Extract all items sorted by score descending. O(k log k) */
  drain(): T[] {
    const result: { score: number; item: T }[] = [...this.heap];
    result.sort((a, b) => b.score - a.score);
    this.heap = [];
    return result.map(r => r.item);
  }

  get size(): number { return this.heap.length; }
  get min(): number | undefined { return this.heap[0]?.score; }
}

// ─── Trie for Autocomplete Search ────────────────────
// Used for fast prefix-based user/interest search
interface TrieNode {
  children: Map<string, TrieNode>;
  isEnd: boolean;
  data: any[];  // Store associated data at terminal nodes
}

/**
 * Prefix tree (trie) for fast autocomplete search.
 *
 * Supports O(m) insert and O(m + results) prefix search,
 * where m is the key length. Uses lazy node creation for memory efficiency.
 *
 * @example
 * ```ts
 * const trie = new Trie();
 * trie.insert('photography', { id: '1' });
 * trie.insert('philosophy', { id: '2' });
 * const results = trie.search('photo'); // [{ word: 'photography', data: [...] }]
 * ```
 */
export class Trie {
  private root: TrieNode = { children: new Map(), isEnd: false, data: [] };

  /**
   * Insert a word into the trie with optional associated data.
   * @param word - The string key to insert (case-insensitive)
   * @param data - Optional payload stored at the terminal node
   */
  insert(word: string, data?: any): void {
    let node = this.root;
    for (const char of word.toLowerCase()) {
      if (!node.children.has(char)) {
        node.children.set(char, { children: new Map(), isEnd: false, data: [] });
      }
      node = node.children.get(char)!;
    }
    node.isEnd = true;
    if (data) node.data.push(data);
  }

  /** Find all words with given prefix. Returns up to `limit` results. */
  search(prefix: string, limit = 10): { word: string; data: any[] }[] {
    let node = this.root;
    for (const char of prefix.toLowerCase()) {
      if (!node.children.has(char)) return [];
      node = node.children.get(char)!;
    }
    const results: { word: string; data: any[] }[] = [];
    this.collectWords(node, prefix.toLowerCase(), results, limit);
    return results;
  }

  private collectWords(node: TrieNode, prefix: string, results: { word: string; data: any[] }[], limit: number) {
    if (results.length >= limit) return;
    if (node.isEnd) results.push({ word: prefix, data: node.data });
    for (const [char, child] of node.children) {
      if (results.length >= limit) return;
      this.collectWords(child, prefix + char, results, limit);
    }
  }

  /**
   * Check if an exact word exists in the trie.
   * @param word - The string key to check (case-insensitive)
   * @returns `true` if the exact word was previously inserted
   */
  has(word: string): boolean {
    let node = this.root;
    for (const char of word.toLowerCase()) {
      if (!node.children.has(char)) return false;
      node = node.children.get(char)!;
    }
    return node.isEnd;
  }
}

// ─── Bloom Filter for Quick Set Membership ───────────
// Used to quickly check if a user has already been shown in discover (no false negatives)
/**
 * Probabilistic set membership filter using a bit array with multiple hash functions.
 *
 * `add()` inserts items; `mightContain()` checks membership.
 * False positives are possible (≈1% with default settings), but false negatives are not.
 * Used in Discover to efficiently skip already-shown profiles without a DB query.
 *
 * @example
 * ```ts
 * const filter = new BloomFilter(10000, 0.01);
 * filter.add(userId);
 * if (!filter.mightContain(candidateId)) {
 *   // Definitely NOT seen before — safe to show
 * }
 * ```
 */
export class BloomFilter {
  private bitArray: Uint8Array;
  private size: number;
  private hashCount: number;

  /**
   * @param expectedItems - Estimated number of items to insert (affects bit array size)
   * @param falsePositiveRate - Target false positive rate (default: 0.01 = 1%)
   */
  constructor(expectedItems = 10000, falsePositiveRate = 0.01) {
    this.size = Math.ceil(-expectedItems * Math.log(falsePositiveRate) / (Math.LN2 * Math.LN2));
    this.hashCount = Math.ceil((this.size / expectedItems) * Math.LN2);
    this.bitArray = new Uint8Array(Math.ceil(this.size / 8));
  }

  private hash(str: string, seed: number): number {
    let h = seed;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h) % this.size;
  }

  /**
   * Add an item to the Bloom filter. O(k) where k = number of hash functions.
   * @param item - String identifier to add
   */
  add(item: string): void {
    for (let i = 0; i < this.hashCount; i++) {
      const bit = this.hash(item, i * 0x9e3779b9);
      this.bitArray[Math.floor(bit / 8)] |= (1 << (bit % 8));
    }
  }

  /** Check if item might be in set. False = definitely not in set. True = probably in set. */
  mightContain(item: string): boolean {
    for (let i = 0; i < this.hashCount; i++) {
      const bit = this.hash(item, i * 0x9e3779b9);
      if (!(this.bitArray[Math.floor(bit / 8)] & (1 << (bit % 8)))) return false;
    }
    return true;
  }
}
