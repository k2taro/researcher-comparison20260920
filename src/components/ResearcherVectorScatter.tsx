import React, { useState, useEffect, useRef } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { Sparkles, RefreshCw, Loader2, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { AuthorFullData, VectorPoint, EmbeddingProgress } from '../types';
import { vectorizeResearchersAndPapers } from '../services/vectorization';

interface ResearcherVectorScatterProps {
  authors: AuthorFullData[];
}

export const ResearcherVectorScatter: React.FC<ResearcherVectorScatterProps> = ({ authors }) => {
  const [points, setPoints] = useState<VectorPoint[]>([]);
  const [progress, setProgress] = useState<EmbeddingProgress>({
    status: 'idle',
    message: '',
    percent: 0,
  });
  const [hasRun, setHasRun] = useState(false);
  const activeRunRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);

  const runVectorization = async (forceOffline = false) => {
    if (authors.length === 0) return;
    if (isRunningRef.current) return; // Prevent concurrent re-entrancy

    isRunningRef.current = true;
    const runId = ++activeRunRef.current;
    setProgress({
      status: 'loading_model',
      message: forceOffline
        ? '高速オフライン意味ベクトルエンジンを準備中...'
        : 'Transformers.js 埋め込みモデル初期化中...',
      percent: 5,
    });

    try {
      const resultPoints = await vectorizeResearchersAndPapers(
        authors,
        (p) => {
          if (activeRunRef.current === runId) {
            setProgress(p);
          }
        },
        { forceOfflineFallback: forceOffline }
      );

      if (activeRunRef.current === runId) {
        setPoints(resultPoints);
        setHasRun(true);
      }
    } catch (err: any) {
      console.warn('Vectorization error encountered, retrying with offline fallback:', err);
      // Auto-fallback to offline resilient vectorization to prevent user-facing errors
      try {
        const fallbackPoints = await vectorizeResearchersAndPapers(
          authors,
          (p) => {
            if (activeRunRef.current === runId) {
              setProgress(p);
            }
          },
          { forceOfflineFallback: true }
        );

        if (activeRunRef.current === runId) {
          setPoints(fallbackPoints);
          setHasRun(true);
        }
      } catch (innerErr: any) {
        console.error('Fatal vectorization failure:', innerErr);
        if (activeRunRef.current === runId) {
          setProgress({
            status: 'error',
            message: `ベクトル化処理中にエラーが発生しました (${innerErr?.message || '計算エラー'})。再試行してください。`,
            percent: 0,
          });
        }
      }
    } finally {
      isRunningRef.current = false;
    }
  };

  // Create a signature of the current authors and their top10Works to detect period filter changes
  const authorsSignature = authors
    .map((a) => `${a.shortId}:${(a.top10Works || []).map((w) => w.id).join('-')}`)
    .join('|');

  // Automatically vectorize when authors or their top10 works change (e.g., period filter toggled)
  useEffect(() => {
    if (authors.length > 0 && authors.every((a) => !a.isLoadingWorks)) {
      runVectorization();
    }
  }, [authorsSignature]);

  if (authors.length === 0) return null;

  const isWorking =
    progress.status === 'loading_model' ||
    progress.status === 'embedding' ||
    progress.status === 'projecting';

  // Separate papers and researcher centroids for clear layering
  const paperPoints = points.filter((p) => p.type === 'paper');
  const researcherPoints = points.filter((p) => p.type === 'researcher');

  // Custom Tooltip
  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: VectorPoint = payload[0].payload;
      const isResearcher = data.type === 'researcher';

      return (
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-lg text-xs max-w-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: data.color }}
            />
            <span
              className={`font-bold ${
                isResearcher ? 'text-indigo-900 text-sm' : 'text-slate-800'
              }`}
            >
              {isResearcher ? `${data.authorName}（研究者）` : data.authorName}
            </span>
          </div>

          {isResearcher ? (
            <div className="space-y-1 text-slate-600 bg-indigo-50/60 p-2 rounded border border-indigo-100">
              <p className="font-semibold text-indigo-700 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                研究者重心ベクトル
              </p>
              <p className="text-[11px] text-slate-500">
                被引用数Top10論文タイトルの平均埋め込みベクトル
              </p>
              <p className="text-[11px] font-mono text-slate-700">
                座標: ({data.x.toFixed(1)}, {data.y.toFixed(1)})
              </p>
            </div>
          ) : (
            <div className="space-y-1 text-slate-600">
              <p className="font-medium text-slate-900 line-clamp-2">「{data.title}」</p>
              {data.year && <p className="text-[11px] text-slate-500">出版年: {data.year}年</p>}
              {data.citedByCount !== undefined && (
                <p className="text-[11px] font-semibold text-emerald-600">
                  被引用数: {data.citedByCount.toLocaleString()} 回
                </p>
              )}
              {data.journalName && (
                <p className="text-[10px] text-slate-400 line-clamp-1">{data.journalName}</p>
              )}
              <p className="text-[10px] font-mono text-slate-400">
                2D座標: ({data.x.toFixed(1)}, {data.y.toFixed(1)})
              </p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            研究者ベクトル化：散布図（Transformers.js + PCA）
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            被引用数Top10論文のタイトルを軽量モデル(all-MiniLM-L6-v2)でベクトル化し、平均値を研究者ベクトルとしてプロット
          </p>
        </div>

        <button
          onClick={() => runVectorization(false)}
          disabled={isWorking}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          {isWorking ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          ベクトル再計算
        </button>
      </div>

      {/* Progress Bar / Status Banner */}
      {isWorking && (
        <div className="mb-4 p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 text-xs">
          <div className="flex items-center justify-between text-purple-800 font-medium mb-1.5">
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
              {progress.message}
            </span>
            <span className="font-mono font-bold">{progress.percent}%</span>
          </div>
          <div className="w-full bg-purple-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-purple-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}

      {progress.status === 'error' && (
        <div className="mb-4 p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{progress.message}</span>
          </div>
          <button
            onClick={() => runVectorization(true)}
            className="px-3 py-1 bg-white hover:bg-red-50 text-red-700 border border-red-300 rounded font-medium text-xs transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
          >
            オフライン高速モードで再試行
          </button>
        </div>
      )}

      {/* Scatter Plot Visualizer */}
      <div className="relative rounded-xl border border-slate-200 bg-slate-50/40 p-4">
        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 text-xs pb-3 border-b border-slate-200/80">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-800 border-2 border-white shadow-xs" />
              <span className="font-semibold text-slate-800">
                濃い色（同サイズ・白枠）: 研究者ベクトル（Top10論文平均重心）
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-400/40 border border-slate-400" />
              <span className="text-slate-600">
                薄い色（同サイズ・半透明）: 各論文タイトル (Top10論文)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {authors.map((author) => (
              <span key={author.shortId} className="flex items-center gap-1 font-medium text-slate-700">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: author.color }}
                />
                {author.displayName.split(' ')[0]}
              </span>
            ))}
          </div>
        </div>

        {points.length > 0 ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="主成分1 (PC1)"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  label={{
                    value: '主成分1 (PC1: 意味空間の第1軸)',
                    position: 'insideBottom',
                    offset: -10,
                    fontSize: 11,
                    fill: '#64748b',
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="主成分2 (PC2)"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  label={{
                    value: '主成分2 (PC2: 意味空間の第2軸)',
                    angle: -90,
                    position: 'insideLeft',
                    fontSize: 11,
                    fill: '#64748b',
                    offset: 10,
                  }}
                />
                <Tooltip content={<CustomScatterTooltip />} />

                {/* Layer 1: Papers (faint / light color, same radius as researcher) */}
                <Scatter
                  name="Papers"
                  data={paperPoints}
                  shape={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (cx == null || cy == null || isNaN(cx) || isNaN(cy)) return null;
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={6.5}
                        fill={payload?.color || '#94a3b8'}
                        fillOpacity={0.35}
                        stroke={payload?.color || '#94a3b8'}
                        strokeWidth={1.5}
                        cursor="pointer"
                      />
                    );
                  }}
                />

                {/* Layer 2: Researcher Centroids (dark solid color, crisp white border, same radius) */}
                <Scatter
                  name="Researchers"
                  data={researcherPoints}
                  shape={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (cx == null || cy == null || isNaN(cx) || isNaN(cy)) return null;
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={6.5}
                        fill={payload?.color || '#0f172a'}
                        fillOpacity={1}
                        stroke="#ffffff"
                        strokeWidth={2.5}
                        className="drop-shadow-xs"
                        cursor="pointer"
                      />
                    );
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-72 flex flex-col items-center justify-center text-slate-400 text-xs">
            <Loader2 className="w-6 h-6 animate-spin mb-2 text-indigo-500" />
            ベクトル化と散布図を準備中...
          </div>
        )}
      </div>

      {/* Methodology and Details Note */}
      <div className="mt-4 p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-800">
              研究者ベクトル化の手法について
            </p>
            <p className="text-slate-600 leading-relaxed">
              各研究者の被引用数Top10論文タイトルを <span className="font-semibold text-slate-900">Transformers.js (all-MiniLM-L6-v2)</span> を用いて384次元の埋め込みベクトルに変換しています。それらの算術平均値を研究者の
              <span className="font-semibold text-indigo-700">「研究者重心ベクトル」</span>
              として採用し、主成分分析（PCA）で2次元に投影・散布図上に可視化しています。
            </p>
            <p className="text-slate-500 text-[11px]">
              ※ 散布図上で研究者の重心（濃い丸）が互いに近いほど、代表論文の関心や研究領域が意味的に近似していることを示し、周囲の薄い点は各論文の個別テーマの広がりを表します。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
