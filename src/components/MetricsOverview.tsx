import React from 'react';
import { Award, FileText, Quote, TrendingUp, BarChart3 } from 'lucide-react';
import { AuthorFullData } from '../types';

interface MetricsOverviewProps {
  authors: AuthorFullData[];
  periodLabel?: string;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({ authors, periodLabel }) => {
  if (authors.length === 0) return null;

  // Calculate highest values for highlighting
  const maxWorks = Math.max(...authors.map((a) => a.worksCount), 1);
  const maxCitations = Math.max(...authors.map((a) => a.citedByCount), 1);
  const maxHIndex = Math.max(...authors.map((a) => a.hIndex), 1);
  const maxI10Index = Math.max(...authors.map((a) => a.i10Index), 1);
  const maxAvgCited = Math.max(
    ...authors.map((a) => (a.worksCount > 0 ? a.citedByCount / a.worksCount : 0)),
    1
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            主要指標の比較 (論文数・被引用数・h-index)
            {periodLabel && (
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                {periodLabel}
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {periodLabel
              ? `各研究者の研究生産性と学術的インパクト (${periodLabel}に発行された論文のみを母集団として再計算)`
              : '各研究者の総合的な研究生産性と学術的インパクトの比較指標'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: 論文数 (Works Count) */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600" />
              総論文数 (Works)
            </span>
            <span className="text-[10px] text-slate-400">生産性</span>
          </div>

          <div className="space-y-3">
            {authors.map((author) => {
              const ratio = (author.worksCount / maxWorks) * 100;
              const isTop = author.worksCount === maxWorks && authors.length > 1;

              return (
                <div key={author.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 truncate max-w-[130px]">
                      {author.displayName}
                    </span>
                    <span className="font-bold text-slate-900 flex items-center gap-1">
                      {author.worksCount.toLocaleString()} 篇
                      {isTop && <span className="text-[10px] text-amber-500 font-bold">★Top</span>}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(ratio, 4)}%`,
                        backgroundColor: author.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Metric 2: 被引用数 (Cited by Count) */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Quote className="w-4 h-4 text-emerald-600" />
              総被引用数 (Citations)
            </span>
            <span className="text-[10px] text-slate-400">影響力</span>
          </div>

          <div className="space-y-3">
            {authors.map((author) => {
              const ratio = (author.citedByCount / maxCitations) * 100;
              const isTop = author.citedByCount === maxCitations && authors.length > 1;

              return (
                <div key={author.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 truncate max-w-[130px]">
                      {author.displayName}
                    </span>
                    <span className="font-bold text-slate-900 flex items-center gap-1">
                      {author.citedByCount.toLocaleString()} 回
                      {isTop && <span className="text-[10px] text-amber-500 font-bold">★Top</span>}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(ratio, 4)}%`,
                        backgroundColor: author.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Metric 3: h-index */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              h-index (研究インパクト指標)
            </span>
            <span className="text-[10px] text-slate-400">質と量の両立</span>
          </div>

          <div className="space-y-3">
            {authors.map((author) => {
              const ratio = (author.hIndex / maxHIndex) * 100;
              const isTop = author.hIndex === maxHIndex && authors.length > 1;

              return (
                <div key={author.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 truncate max-w-[130px]">
                      {author.displayName}
                    </span>
                    <span className="font-bold text-slate-900 flex items-center gap-1">
                      <span className="text-base" style={{ color: author.color }}>
                        {author.hIndex}
                      </span>
                      {isTop && <span className="text-[10px] text-amber-500 font-bold">★Top</span>}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(ratio, 4)}%`,
                        backgroundColor: author.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Secondary Metrics comparison table */}
      <div className="mt-4 pt-4 border-t border-slate-100 overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="text-slate-400 border-b border-slate-200 pb-2">
              <th className="py-2 px-3 font-semibold">研究者</th>
              <th className="py-2 px-3 font-semibold text-right">総論文数</th>
              <th className="py-2 px-3 font-semibold text-right">総被引用数</th>
              <th className="py-2 px-3 font-semibold text-right">h-index</th>
              <th className="py-2 px-3 font-semibold text-right">i10-index (10引用以上)</th>
              <th className="py-2 px-3 font-semibold text-right">論文1篇あたり平均被引用</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {authors.map((author) => {
              const avgCited =
                author.worksCount > 0 ? (author.citedByCount / author.worksCount).toFixed(1) : '0';
              return (
                <tr key={author.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: author.color }}
                    />
                    {author.displayName}
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium">
                    {author.worksCount.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium">
                    {author.citedByCount.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold" style={{ color: author.color }}>
                    {author.hIndex}
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium">
                    {author.i10Index ? author.i10Index.toLocaleString() : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium text-slate-600">
                    {avgCited} 回/篇
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
