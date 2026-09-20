import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendingUp, FileText, Quote } from 'lucide-react';
import { AuthorFullData } from '../types';
import { buildAnnualTrendData } from '../services/openAlexApi';

interface AnnualTrendsChartProps {
  authors: AuthorFullData[];
  yearRange?: [number, number];
}

export const AnnualTrendsChart: React.FC<AnnualTrendsChartProps> = ({ authors, yearRange }) => {
  const [activeTab, setActiveTab] = useState<'both' | 'works' | 'citations'>('both');

  if (authors.length === 0) return null;

  const worksTrendData = buildAnnualTrendData(authors, 'worksCount', yearRange);
  const citationsTrendData = buildAnnualTrendData(authors, 'citedByCount', yearRange);

  // Custom Tooltip component for recharts
  const renderCustomTooltip = (unit: string) => {
    return ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-md text-xs">
            <p className="font-bold text-slate-800 mb-1.5">{label}年</p>
            <div className="space-y-1">
              {payload.map((entry: any) => {
                const author = authors.find((a) => a.shortId === entry.dataKey);
                const name = author?.displayName || entry.name;
                const value = entry.value ?? 0;
                return (
                  <div key={entry.dataKey} className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: entry.color }}
                      />
                      {name}:
                    </span>
                    <span className="font-bold text-slate-900">
                      {value.toLocaleString()} {unit}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
      return null;
    };
  };

  const formatYAxisCitations = (tickItem: number) => {
    if (tickItem >= 1000000) return `${(tickItem / 1000000).toFixed(1)}M`;
    if (tickItem >= 1000) return `${(tickItem / 1000).toFixed(0)}k`;
    return `${tickItem}`;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            年次推移の比較（論文数・被引用数）
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            過去15年間の論文出版ペースおよび被引用数の推移を折れ線グラフで可視化
          </p>
        </div>

        {/* View Mode Selector */}
        <div className="flex rounded-lg bg-slate-100 p-1 text-xs self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('both')}
            className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
              activeTab === 'both'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            並列表示
          </button>
          <button
            onClick={() => setActiveTab('works')}
            className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === 'works'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3 h-3 text-blue-600" />
            論文数推移
          </button>
          <button
            onClick={() => setActiveTab('citations')}
            className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === 'citations'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Quote className="w-3 h-3 text-emerald-600" />
            被引用数推移
          </button>
        </div>
      </div>

      <div
        className={`grid gap-6 ${
          activeTab === 'both' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
        }`}
      >
        {/* Line Chart 1: 論文数年次推移 */}
        {(activeTab === 'both' || activeTab === 'works') && (
          <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-200/80">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                論文数 年次推移 (篇/年)
              </h4>
              <span className="text-[11px] text-slate-400">OpenAlex counts_by_year</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={worksTrendData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={renderCustomTooltip('篇')} />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                    formatter={(shortId) => {
                      const a = authors.find((author) => author.shortId === shortId);
                      return a?.displayName || shortId;
                    }}
                  />
                  {authors.map((author) => (
                    <Line
                      key={author.shortId}
                      type="monotone"
                      dataKey={author.shortId}
                      name={author.displayName}
                      stroke={author.color}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: author.color }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Line Chart 2: 被引用数年次推移 */}
        {(activeTab === 'both' || activeTab === 'citations') && (
          <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-200/80">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Quote className="w-4 h-4 text-emerald-600" />
                被引用数 年次推移 (回/年)
              </h4>
              <span className="text-[11px] text-slate-400">OpenAlex counts_by_year</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={citationsTrendData}
                  margin={{ top: 10, right: 20, left: -5, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatYAxisCitations}
                  />
                  <Tooltip content={renderCustomTooltip('回')} />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                    formatter={(shortId) => {
                      const a = authors.find((author) => author.shortId === shortId);
                      return a?.displayName || shortId;
                    }}
                  />
                  {authors.map((author) => (
                    <Line
                      key={author.shortId}
                      type="monotone"
                      dataKey={author.shortId}
                      name={author.displayName}
                      stroke={author.color}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: author.color }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
