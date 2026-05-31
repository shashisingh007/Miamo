export interface KnapsackItem {
  weight: number;
  value: number;
}

export interface KnapsackResult {
  maxValue: number;
  selected: number[];
}

export function knapsack01(items: KnapsackItem[], capacity: number): KnapsackResult {
  if (!Number.isInteger(capacity) || capacity < 0) {
    throw new RangeError('capacity must be a non-negative integer');
  }
  for (const it of items) {
    if (!Number.isInteger(it.weight) || it.weight < 0) {
      throw new RangeError('item weight must be a non-negative integer');
    }
    if (it.value < 0) {
      throw new RangeError('item value must be non-negative');
    }
  }
  const n = items.length;
  if (n === 0 || capacity === 0) return { maxValue: 0, selected: [] };

  const dp: number[][] = [];
  for (let i = 0; i <= n; i++) dp.push(new Array<number>(capacity + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    const { weight, value } = items[i - 1];
    for (let w = 0; w <= capacity; w++) {
      dp[i][w] = dp[i - 1][w];
      if (weight <= w) {
        const take = dp[i - 1][w - weight] + value;
        if (take > dp[i][w]) dp[i][w] = take;
      }
    }
  }

  const selected: number[] = [];
  let w = capacity;
  for (let i = n; i >= 1; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      selected.push(i - 1);
      w -= items[i - 1].weight;
    }
  }
  selected.reverse();
  return { maxValue: dp[n][capacity], selected };
}
