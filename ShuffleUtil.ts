// Shuffle utility functions for pile-based shuffling algorithms

export function shuffle<T>(list: T[]): void {
  // Fisher-Yates shuffle
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = list[i];
    list[i] = list[j];
    list[j] = temp;
  }
}

export function invertPerm(perm: number[]): number[] {
  const result = new Array(perm.length);

  for (let i = 0; i < perm.length; i++) {
    result[perm[i]] = i;
  }

  return result;
}

export function pileCapacity(numPiles: number, numRounds: number): number {
  return Math.floor(Math.pow(numPiles, numRounds));
}

export function cumulativeDescents(perm: number[]): number[] {
  const result = new Array(perm.length);
  result[0] = 0;
  for (let i = 1; i < perm.length; i++) {
    result[i] = result[i - 1] + (perm[i] < perm[i - 1] ? 1 : 0);
  }
  return result;
}

export function cumulativeAscents(perm: number[]): number[] {
  const result = new Array(perm.length);
  result[0] = 0;
  for (let i = 1; i < perm.length; i++) {
    result[i] = result[i - 1] + (perm[i] > perm[i - 1] ? 1 : 0);
  }
  return result;
}

export function ascendingRuns(perm: number[]): Array<[number, number]> {
  const result: Array<[number, number]> = [];
  let currStart = 0;
  for (let i = 1; i < perm.length; i++) {
    if (perm[i] < perm[i - 1]) {
      result.push([currStart, i]); // "end"
      currStart = i;
    }
  }
  result.push([currStart, perm.length]);
  return result;
}

export function computeQueueShuffleRounds(
  perm: number[],
  numPiles: number,
  spreadOut: boolean = true
): number[][] {
  const virtualPiles = cumulativeDescents(perm);
  const nVirtualPiles = virtualPiles[virtualPiles.length - 1] + 1;
  const nRounds = ceil(Math.log(nVirtualPiles) / Math.log(numPiles));

  if (spreadOut) {
    spreadVirtualPiles(virtualPiles, numPiles, nRounds);
  }

  return basicRounds(virtualPiles, numPiles, nRounds);
}

export function computeStackShuffleRounds(
  perm: number[],
  numPiles: number,
  spreadOut: boolean = true
): number[][] {
  const virtualQueues = cumulativeDescents(perm);
  const nVirtualQueues = virtualQueues[virtualQueues.length - 1] + 1;
  const nQueueRounds = ceilEven(Math.log(nVirtualQueues) / Math.log(numPiles));

  const virtualStacks = cumulativeAscents(perm);
  const nVirtualStacks = virtualStacks[virtualStacks.length - 1] + 1;
  const nStackRounds = ceilOdd(Math.log(nVirtualStacks) / Math.log(numPiles));

  let virtualPiles: number[];
  let nRounds: number;

  if (nQueueRounds < nStackRounds) {
    virtualPiles = virtualQueues;
    nRounds = nQueueRounds;
  } else {
    virtualPiles = virtualStacks;
    nRounds = nStackRounds;
  }

  if (spreadOut) {
    spreadVirtualPiles(virtualPiles, numPiles, nRounds);
  }

  const result = basicRounds(virtualPiles, numPiles, nRounds);
  enstackify(result, numPiles);

  return result;
}

export function basicRounds(
  virtualPiles: number[],
  nPiles: number,
  nRounds: number
): number[][] {
  const nCards = virtualPiles.length;
  const result: number[][] = Array.from({ length: nRounds }, () => new Array(nCards));

  // first pass
  for (let r = 0; r < nRounds; r++) {
    for (let i = 0; i < nCards; i++) {
      const [nextVirtualPile, currPile] = divMod(virtualPiles[i], nPiles);
      result[r][i] = currPile;
      virtualPiles[i] = nextVirtualPile;
    }
  }

  return result;
}

export function enstackify(rounds: number[][], nPiles: number): void {
  const nRounds = rounds.length;
  const nCards = rounds[0].length;

  for (let r = nRounds - 2; r >= 0; r -= 2) {
    for (let i = 0; i < nCards; i++) {
      rounds[r][i] = nPiles - 1 - rounds[r][i];
    }
  }
}

export function spreadVirtualPiles(
  virtualPiles: number[],
  numPiles: number,
  nRounds: number
): void {
  // Spread stuff out.

  const nCards = virtualPiles.length;

  // 1. split big piles greedily as much as possible
  const capacity = pileCapacity(numPiles, nRounds);
  const target = Math.min(capacity, nCards);

  while (virtualPiles[virtualPiles.length - 1] + 1 < target) {
    splitLongestRun(virtualPiles); // TODO: Could be more efficient.
  }

  // 2. scale
  const m = (capacity - 1) / (target - 1);
  for (let k = 0; k < virtualPiles.length; k++) {
    virtualPiles[k] = floor(m * virtualPiles[k]);
  }
}

export function splitLongestRun(virtualPiles: number[]): void {
  const [a, b] = longestRun(virtualPiles);
  const start = ceil((a + b) / 2);
  for (let k = start; k < virtualPiles.length; k++) {
    virtualPiles[k] += 1;
  }
}

export function longestRun(virtualPiles: number[]): [number, number] {
  // find longest start
  let start = 0,
    longestStart = 0,
    longestEnd = -1;

  let k = 0;
  for (k = 1; k <= virtualPiles.length; k++) {
    if (k === virtualPiles.length || virtualPiles[k] !== virtualPiles[k - 1]) {
      if (k - start > longestEnd - longestStart) {
        longestStart = start;
        longestEnd = k;
      }
      start = k;
    }
  }

  return [longestStart, longestEnd];
}

export function floor(x: number): number {
  return Math.floor(x);
}

export function ceil(x: number): number {
  return Math.ceil(x);
}

export function ceilEven(x: number): number {
  return ceil(x / 2) * 2;
}

export function ceilOdd(x: number): number {
  return ceilEven(x - 1) + 1;
}

export function dealQueues(
  seq: number[],
  faceToPile: number[],
  piles: number[][]
): void {
  for (let k = 0; k < seq.length; k++) {
    const face = seq[k];
    const pile = faceToPile[face];
    piles[pile].push(face);
  }
}

export function dealStacks(
  seq: number[],
  faceToPile: number[],
  piles: number[][]
): void {
  for (let k = 0; k < seq.length; k++) {
    const face = seq[k];
    const pile = faceToPile[face];
    piles[pile].unshift(face);
  }
}

export function createPiles(nPiles: number): number[][] {
  return Array.from({ length: nPiles }, () => []);
}

export function collectPiles(piles: number[][]): number[] {
  const result: number[] = [];
  for (const pile of piles) {
    result.push(...pile);
  }
  return result;
}

export function permString(perm: number[]): string {
  return perm.join(' ');
}

export function divMod(a: number, b: number): [number, number] {
  return [Math.floor(a / b), a % b];
}
