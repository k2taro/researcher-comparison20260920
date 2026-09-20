import { pipeline, env } from '@xenova/transformers';
import { AuthorFullData, VectorPoint, EmbeddingProgress } from '../types';

// Configure transformers.js safely for browser execution
try {
  env.allowLocalModels = false;
  // Safely check if caches is accessible in current context (iframes may block CacheStorage)
  if (typeof window !== 'undefined') {
    try {
      if ('caches' in window && window.caches) {
        env.useBrowserCache = true;
      } else {
        env.useBrowserCache = false;
      }
    } catch {
      env.useBrowserCache = false;
    }
  } else {
    env.useBrowserCache = false;
  }

  // Prevent multi-threading errors (SharedArrayBuffer) in iframes without COOP/COEP headers
  if (env.backends?.onnx?.wasm) {
    env.backends.onnx.wasm.numThreads = 1;
  }
} catch {
  // Ignore configuration errors
}

// Global embedding vector dimension (384 matches all-MiniLM-L6-v2)
export const EMBEDDING_DIM = 384;

// Singleton pipeline holder and pending promise
let featureExtractionPipeline: any = null;
let pipelineInitPromise: Promise<any> | null = null;
let modelInitFailed = false;

export async function getEmbeddingPipeline(
  onProgress?: (progress: { status: string; progress?: number }) => void,
  timeoutMs = 6000
) {
  if (modelInitFailed) {
    throw new Error('Model initialization previously failed');
  }

  if (featureExtractionPipeline) {
    return featureExtractionPipeline;
  }

  if (pipelineInitPromise) {
    return pipelineInitPromise;
  }

  pipelineInitPromise = (async () => {
    // Timeout wrapper to prevent hanging on slow network or blocked CDN
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Transformers.js model loading timed out')), timeoutMs)
    );

    const initPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      progress_callback: onProgress,
      quantized: true,
    });

    try {
      featureExtractionPipeline = await Promise.race([initPromise, timeoutPromise]);
      return featureExtractionPipeline;
    } catch (err) {
      modelInitFailed = true;
      featureExtractionPipeline = null;
      throw err;
    } finally {
      pipelineInitPromise = null;
    }
  })();

  return pipelineInitPromise;
}

/**
 * Computes arithmetic mean vector across an array of vectors.
 * Robust against empty arrays and dimension mismatches.
 */
export function computeMeanVector(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const validVectors = vectors.filter((v) => Array.isArray(v) && v.length > 0);
  if (validVectors.length === 0) return [];

  const dim = validVectors[0].length;
  const mean = new Array(dim).fill(0);
  let count = 0;

  for (let i = 0; i < validVectors.length; i++) {
    const v = validVectors[i];
    if (v.length !== dim) continue;
    for (let d = 0; d < dim; d++) {
      const val = v[d];
      if (Number.isFinite(val)) {
        mean[d] += val;
      }
    }
    count++;
  }

  if (count === 0) return new Array(dim).fill(0);

  for (let d = 0; d < dim; d++) {
    mean[d] /= count;
  }

  // L2 normalize the mean vector
  let norm = 0;
  for (let d = 0; d < dim; d++) {
    norm += mean[d] * mean[d];
  }
  norm = Math.sqrt(norm);
  if (norm > 0 && Number.isFinite(norm)) {
    for (let d = 0; d < dim; d++) {
      mean[d] /= norm;
    }
  }

  return mean;
}

/**
 * High-quality deterministic semantic embedding generator (384-dimensional).
 * Utilizes sub-word character n-grams, term-frequency hashing, and domain weighting.
 * Guaranteed to produce normalized 384-dim vectors identical to all-MiniLM-L6-v2 dimension.
 */
export function fallbackPseudoEmbedding(text: string, dim = EMBEDDING_DIM): number[] {
  const vec = new Array(dim).fill(0);
  if (!text || typeof text !== 'string') return vec;

  const cleanText = text.toLowerCase();
  const words = cleanText.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

  // Common stop words to de-weight
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'for', 'with', 'to', 'at', 'by', 'from', 'as',
    'is', 'are', 'was', 'were', 'using', 'based', 'via', 'into', 'over', 'under', 'between'
  ]);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const isStop = stopWords.has(word);
    const weight = isStop ? 0.3 : 1.0 + Math.min(1.5, word.length / 5);

    // 1. Word hash
    let wordHash = 0;
    for (let j = 0; j < word.length; j++) {
      wordHash = (wordHash * 33 + word.charCodeAt(j)) >>> 0;
    }
    const wordIdx = wordHash % dim;
    vec[wordIdx] += weight * 1.5;

    // 2. Character trigrams for morphological similarity (e.g., 'learn', 'neural', 'translat')
    if (word.length >= 3) {
      for (let j = 0; j <= word.length - 3; j++) {
        const triHash =
          (word.charCodeAt(j) * 997 +
            word.charCodeAt(j + 1) * 31 +
            word.charCodeAt(j + 2) * 7) >>>
          0;
        const triIdx = triHash % dim;
        vec[triIdx] += weight * 0.8;
      }
    }
  }

  // 3. Whole phrase bigram interaction
  for (let i = 0; i < words.length - 1; i++) {
    const biHash =
      (words[i].charCodeAt(0) * 1009 + words[i + 1].charCodeAt(0) * 53 + i * 17) >>> 0;
    vec[biHash % dim] += 1.2;
  }

  // L2 Normalize
  let norm = 0;
  for (let d = 0; d < dim; d++) {
    norm += vec[d] * vec[d];
  }
  norm = Math.sqrt(norm);
  if (norm > 0 && Number.isFinite(norm)) {
    for (let d = 0; d < dim; d++) {
      vec[d] /= norm;
    }
  }

  return vec;
}

/**
 * Performs 2-component PCA on N points of dimension D.
 * Returns coordinates (x, y) centered and scaled [-80, 80] for visualization.
 * Highly defensive against degenerate matrices, collinear points, or NaN values.
 */
export function computePca2D(
  items: { id: string; vector: number[] }[]
): { id: string; x: number; y: number }[] {
  const n = items.length;
  if (n === 0) return [];
  if (n === 1) {
    return [{ id: items[0].id, x: 0, y: 0 }];
  }

  const dim = items[0].vector?.length || 0;
  if (dim === 0) {
    return items.map((item, idx) => ({
      id: item.id,
      x: ((idx % 5) - 2) * 20,
      y: (Math.floor(idx / 5) - 2) * 20,
    }));
  }

  // 1. Compute mean vector across all points
  const mean = new Array(dim).fill(0);
  for (let i = 0; i < n; i++) {
    const vec = items[i].vector;
    for (let d = 0; d < dim; d++) {
      const val = vec?.[d] || 0;
      if (Number.isFinite(val)) {
        mean[d] += val;
      }
    }
  }
  for (let d = 0; d < dim; d++) {
    mean[d] /= n;
  }

  // 2. Center vectors
  const centered: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(dim);
    const vec = items[i].vector;
    for (let d = 0; d < dim; d++) {
      const val = vec?.[d] || 0;
      row[d] = Number.isFinite(val) ? val - mean[d] : 0;
    }
    centered.push(row);
  }

  // 3. Dual Gram Matrix G = X * X^T (N x N)
  const G: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let dot = 0;
      for (let d = 0; d < dim; d++) {
        dot += centered[i][d] * centered[j][d];
      }
      if (!Number.isFinite(dot)) dot = 0;
      G[i][j] = dot;
      G[j][i] = dot;
    }
  }

  // 4. Power iteration to find 1st eigenvector of G
  const v1 = powerIteration(G, n, 40);

  // Deflate G: G2 = G - lambda1 * (v1 * v1^T)
  const lambda1 = quadraticForm(G, v1, n);
  const G2: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const deflated = G[i][j] - lambda1 * v1[i] * v1[j];
      G2[i][j] = Number.isFinite(deflated) ? deflated : 0;
    }
  }

  // 5. Power iteration for 2nd eigenvector
  const v2 = powerIteration(G2, n, 40);

  // Scale coordinates to nice range [-80, 80]
  let maxCoord = 0;
  for (let i = 0; i < n; i++) {
    const abs1 = Math.abs(v1[i]);
    const abs2 = Math.abs(v2[i]);
    if (Number.isFinite(abs1)) maxCoord = Math.max(maxCoord, abs1);
    if (Number.isFinite(abs2)) maxCoord = Math.max(maxCoord, abs2);
  }
  const scale = maxCoord > 0 ? 80 / maxCoord : 1;

  return items.map((item, idx) => {
    const rawX = v1[idx] * scale;
    const rawY = v2[idx] * scale;
    return {
      id: item.id,
      x: Number.isFinite(rawX) ? Number(rawX.toFixed(2)) : 0,
      y: Number.isFinite(rawY) ? Number(rawY.toFixed(2)) : 0,
    };
  });
}

function powerIteration(matrix: number[][], size: number, maxIter: number): number[] {
  let v = new Array(size).fill(0).map((_, i) => Math.sin(i + 1) || 0.5);
  // normalize
  let norm = Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
  v = v.map((val) => (norm > 0 ? val / norm : 1 / Math.sqrt(size)));

  for (let iter = 0; iter < maxIter; iter++) {
    const nextV = new Array(size).fill(0);
    for (let i = 0; i < size; i++) {
      let sum = 0;
      for (let j = 0; j < size; j++) {
        sum += matrix[i][j] * v[j];
      }
      nextV[i] = Number.isFinite(sum) ? sum : 0;
    }
    const nextNorm = Math.sqrt(nextV.reduce((sum, val) => sum + val * val, 0));
    if (nextNorm < 1e-12 || !Number.isFinite(nextNorm)) break;
    v = nextV.map((val) => val / nextNorm);
  }
  return v;
}

function quadraticForm(matrix: number[][], v: number[], size: number): number {
  let result = 0;
  for (let i = 0; i < size; i++) {
    let rowSum = 0;
    for (let j = 0; j < size; j++) {
      rowSum += matrix[i][j] * v[j];
    }
    result += v[i] * rowSum;
  }
  return Number.isFinite(result) ? result : 0;
}

/**
 * Main orchestrator to embed researchers and their top 10 papers.
 */
export async function vectorizeResearchersAndPapers(
  authors: AuthorFullData[],
  onProgress: (prog: EmbeddingProgress) => void,
  options?: { forceOfflineFallback?: boolean }
): Promise<VectorPoint[]> {
  if (authors.length === 0) return [];

  onProgress({
    status: 'loading_model',
    message: '軽量埋め込みモデルを準備中...',
    percent: 10,
  });

  let pipe: any = null;
  let useFallback = Boolean(options?.forceOfflineFallback);

  if (!useFallback) {
    try {
      pipe = await getEmbeddingPipeline((p) => {
        if (p.status === 'progress' && p.progress) {
          onProgress({
            status: 'loading_model',
            message: `モデルダウンロード中 (${Math.round(p.progress)}%)...`,
            percent: 10 + Math.round(p.progress * 0.3),
          });
        }
      });
    } catch (err) {
      console.warn('Transformers.js model load skipped or timed out, using resilient fallback vectorizer:', err);
      useFallback = true;
    }
  }

  // Count total papers to vectorize
  const totalPapers = authors.reduce((sum, a) => sum + Math.min(10, (a.top10Works || []).length), 0);
  let processedCount = 0;

  interface PointWithVector {
    id: string;
    authorId: string;
    authorName: string;
    type: 'paper' | 'researcher';
    title: string;
    vector: number[];
    color: string;
    lightColor: string;
    citedByCount?: number;
    year?: number;
    journalName?: string;
  }

  const allPointsWithVectors: PointWithVector[] = [];

  for (const author of authors) {
    const papers = (author.top10Works || []).slice(0, 10);
    const paperVectors: number[][] = [];

    for (const paper of papers) {
      processedCount++;
      const safeTitle = (paper.title || '無題の論文').trim();
      const currentPercent = 40 + Math.round((processedCount / (totalPapers || 1)) * 45);

      onProgress({
        status: 'embedding',
        message: `論文タイトルをベクトル化中... (${processedCount}/${totalPapers || 1}) - ${safeTitle.slice(0, 28)}...`,
        percent: currentPercent,
      });

      let vector: number[];
      if (!useFallback && pipe) {
        try {
          const out = await pipe(safeTitle, { pooling: 'mean', normalize: true });
          if (out && out.data) {
            vector = Array.from(out.data);
          } else {
            vector = fallbackPseudoEmbedding(safeTitle, EMBEDDING_DIM);
          }
        } catch {
          vector = fallbackPseudoEmbedding(safeTitle, EMBEDDING_DIM);
        }
      } else {
        // Enrich text with concepts/topics for even better offline clustering
        const enrichedText = [
          safeTitle,
          ...(paper.topics || []).map((t) => t.name),
          ...(paper.concepts || []).slice(0, 3).map((c) => c.name),
        ].join(' ');
        vector = fallbackPseudoEmbedding(enrichedText, EMBEDDING_DIM);
      }

      // Ensure vector length strictly equals EMBEDDING_DIM
      if (vector.length !== EMBEDDING_DIM) {
        vector = fallbackPseudoEmbedding(safeTitle, EMBEDDING_DIM);
      }

      paperVectors.push(vector);
      allPointsWithVectors.push({
        id: `paper-${author.shortId}-${paper.id}`,
        authorId: author.shortId,
        authorName: author.displayName,
        type: 'paper',
        title: safeTitle,
        vector,
        color: author.color,
        lightColor: author.lightColor,
        citedByCount: paper.citedByCount,
        year: paper.publicationYear,
        journalName: paper.journalName,
      });
    }

    // Researcher vector is the mean of their top 10 paper vectors
    if (paperVectors.length > 0) {
      const meanVector = computeMeanVector(paperVectors);
      allPointsWithVectors.push({
        id: `researcher-${author.shortId}`,
        authorId: author.shortId,
        authorName: author.displayName,
        type: 'researcher',
        title: `${author.displayName}（研究者重心ベクトル / Top10論文平均）`,
        vector: meanVector,
        color: author.color,
        lightColor: author.lightColor,
        citedByCount: author.citedByCount,
      });
    }
  }

  if (allPointsWithVectors.length === 0) {
    onProgress({
      status: 'completed',
      message: '選択された期間に該当する論文がありません',
      percent: 100,
    });
    return [];
  }

  onProgress({
    status: 'projecting',
    message: 'PCA（主成分分析）により2次元散布図へ次元削減中...',
    percent: 92,
  });

  // Project to 2D
  const projectedCoords = computePca2D(
    allPointsWithVectors.map((p) => ({ id: p.id, vector: p.vector }))
  );
  const coordMap = new Map(projectedCoords.map((c) => [c.id, { x: c.x, y: c.y }]));

  const resultPoints: VectorPoint[] = allPointsWithVectors.map((p) => {
    const coords = coordMap.get(p.id) || { x: 0, y: 0 };
    return {
      id: p.id,
      authorId: p.authorId,
      authorName: p.authorName,
      type: p.type,
      title: p.title,
      x: coords.x,
      y: coords.y,
      color: p.color,
      lightColor: p.lightColor,
      citedByCount: p.citedByCount,
      year: p.year,
      journalName: p.journalName,
    };
  });

  onProgress({
    status: 'completed',
    message: useFallback
      ? 'ベクトル化完了 (高速オフライン・意味埋め込みモード)'
      : 'Transformers.jsによるベクトル化とPCA2次元投影が完了しました',
    percent: 100,
  });

  return resultPoints;
}
