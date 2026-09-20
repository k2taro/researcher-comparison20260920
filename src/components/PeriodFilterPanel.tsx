import React from 'react';
import { Calendar, Filter, RotateCcw, Info } from 'lucide-react';
import { AuthorFullData } from '../types';

interface PeriodFilterPanelProps {
  startYear: number;
  endYear: number;
  onStartYearChange: (year: number) => void;
  onEndYearChange: (year: number) => void;
  authors: AuthorFullData[];
  filteredAuthors: AuthorFullData[];
}

export const PeriodFilterPanel: React.FC<PeriodFilterPanelProps> = ({
  startYear,
  endYear,
  onStartYearChange,
  onEndYearChange,
  authors,
  filteredAuthors,
}) => {
  const currentYear = new Date().getFullYear();

  const presets = [
    { label: '直近10年 (2016–2025)', start: 2016, end: 2025 },
    { label: '直近5年 (2021–2025)', start: 2021, end: 2025 },
    { label: '2010年代 (2010–2019)', start: 2010, end: 2019 },
    { label: '2000年代 (2000–2009)', start: 2000, end: 2009 },
  ];

  const handlePresetClick = (s: number, e: number) => {
    onStartYearChange(s);
    onEndYearChange(e);
  };

  const handleReset = () => {
    onStartYearChange(2016);
    onEndYearChange(2025);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Filter className="w-5 h-5 text-indigo-600" />
            対象期間の絞り込み設定
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            指定した年に発行された論文のみを抽出し、各種指標（論文数・被引用数・h-index・Top10・埋め込みベクトル）をリアルタイムに再計算します
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> プリセット:
          </span>
          {presets.map((p) => {
            const isActive = startYear === p.start && endYear === p.end;
            return (
              <button
                key={p.label}
                onClick={() => handlePresetClick(p.start, p.end)}
                className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200'
                }`}
              >
                {p.label}
              </button>
            );
          })}
          <button
            onClick={handleReset}
            className="text-xs px-2 py-1 text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors cursor-pointer ml-1"
            title="デフォルト (2016-2025) にリセット"
          >
            <RotateCcw className="w-3 h-3" />
            リセット
          </button>
        </div>
      </div>

      {/* Year Range Selectors */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-700">
            開始年 (From)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1970}
              max={endYear}
              value={startYear}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) onStartYearChange(Math.min(val, endYear));
              }}
              className="w-24 px-2.5 py-1.5 text-sm bg-white border border-slate-300 rounded-md font-bold text-center text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-500 font-medium">年</span>
          </div>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-700">
            終了年 (To)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={startYear}
              max={currentYear + 2}
              value={endYear}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) onEndYearChange(Math.max(val, startYear));
              }}
              className="w-24 px-2.5 py-1.5 text-sm bg-white border border-slate-300 rounded-md font-bold text-center text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-500 font-medium">年</span>
          </div>
        </div>
      </div>

      {/* Extracted Works Count per Author */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-600">
            {startYear}年 〜 {endYear}年 の該当論文数サマリー:
          </span>
          <span className="text-[11px] text-slate-400">
            全論文データからリアルタイム抽出
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {filteredAuthors.map((filteredAuthor) => {
            const originalAuthor = authors.find((a) => a.shortId === filteredAuthor.shortId);
            const totalWorks = originalAuthor?.worksCount || filteredAuthor.works.length || 1;
            const periodWorks = filteredAuthor.worksCount;
            const percentage = Math.round((periodWorks / Math.max(totalWorks, 1)) * 100);

            return (
              <div
                key={filteredAuthor.shortId}
                className="p-2.5 rounded-lg border bg-slate-50/70 flex items-center justify-between"
                style={{ borderLeftColor: filteredAuthor.color, borderLeftWidth: '3px' }}
              >
                <div className="truncate pr-2">
                  <span className="text-xs font-bold text-slate-800 block truncate">
                    {filteredAuthor.displayName}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    h-index: <b className="text-slate-700">{filteredAuthor.hIndex}</b> | 被引用:{' '}
                    <b className="text-slate-700">{filteredAuthor.citedByCount.toLocaleString()}</b>
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-indigo-700 block">
                    {periodWorks.toLocaleString()} 篇
                  </span>
                  <span className="text-[10px] text-slate-400">
                    全体の {percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info notice */}
      <div className="mt-3.5 p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-100/80 text-[11px] text-indigo-900 flex items-center gap-2">
        <Info className="w-4 h-4 text-indigo-500 shrink-0" />
        <span>
          現在表示中のすべての比較表・グラフ・散布図は、<b>{startYear}年〜{endYear}年</b>に発行された論文のみを母集団として計算されています。
        </span>
      </div>
    </div>
  );
};
