export function nextGreaterElements(arr: number[]): number[] {
  const n = arr.length;
  const result = new Array<number>(n).fill(-1);
  const stack: number[] = [];
  for (let i = 0; i < n; i++) {
    while (stack.length > 0 && arr[stack[stack.length - 1]] < arr[i]) {
      result[stack.pop()!] = arr[i];
    }
    stack.push(i);
  }
  return result;
}

export function previousLessElements(arr: number[]): number[] {
  const n = arr.length;
  const result = new Array<number>(n).fill(-1);
  const stack: number[] = [];
  for (let i = 0; i < n; i++) {
    while (stack.length > 0 && arr[stack[stack.length - 1]] >= arr[i]) {
      stack.pop();
    }
    if (stack.length > 0) result[i] = arr[stack[stack.length - 1]];
    stack.push(i);
  }
  return result;
}

export function largestRectangleInHistogram(heights: number[]): number {
  const stack: number[] = [];
  let maxArea = 0;
  const ext = [...heights, 0];
  for (let i = 0; i < ext.length; i++) {
    while (stack.length > 0 && ext[stack[stack.length - 1]] > ext[i]) {
      const top = stack.pop()!;
      const left = stack.length === 0 ? -1 : stack[stack.length - 1];
      const width = i - left - 1;
      maxArea = Math.max(maxArea, ext[top] * width);
    }
    stack.push(i);
  }
  return maxArea;
}
