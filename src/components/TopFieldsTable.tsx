import React, { useState } from 'react';
import { Layers, Tag } from 'lucide-react';
import { AuthorFullData } from '../types';

interface TopFieldsTableProps {
  authors: AuthorFullData[];
}

export const TopFieldsTable: React.FC<TopFieldsTableProps> = ({ authors }) => {
  const [activeAuthorId, setActiveAuthorId] = useState<string>(
    authors[0]?.shortId || ''
  );

  if (authors.length === 0) return null;

  const currentAuthor =
    authors.find((a) => a.shortId === activeAuthorId) || authors[0];

  const topFields = currentAuthor?.top10Fields || [];
  const maxCount = Math.max(...topFields.map((f) => f.count), 1);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            発表分野 Top 10（表形式）
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            全取得論文（{currentAuthor?.works.length.toLocaleString()} 篇）の分類データ（Topics / Concepts）から集計した研究専門分野の上位10件
          </p>
        </div>

        {/* Author tabs */}
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg text-xs self-start sm:self-auto">
          {authors.map((author) => (
            <button
              key={author.shortId}
              onClick={() => setActiveAuthorId(author.shortId)}
              className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                currentAuthor?.shortId === author.shortId
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: author.color }}
              />
              {author.displayName.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-xs text-left">
          <thead>
            <tr className="text-slate-400 border-b border-slate-200 bg-slate-50/70">
              <th className="py-2.5 px-3 font-semibold w-12 text-center">順位</th>
              <th className="py-2.5 px-3 font-semibold min-w-[240px]">研究分野 / トピック</th>
              <th className="py-2.5 px-3 font-semibold w-24 text-right">関連論文数</th>
              <th className="py-2.5 px-3 font-semibold w-36">相対重要度</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {topFields.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-400">
                  研究分野・トピックデータ集計中
                </td>
              </tr>
            ) : (
              topFields.map((field, idx) => {
                const rank = idx + 1;
                const percent = Math.round((field.count / maxCount) * 100);

                return (
                  <tr key={field.name} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-center font-bold text-slate-500">
                      {rank}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      <div className="flex items-start gap-2">
                        <Tag className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-snug break-words" title={field.name}>
                          {field.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-900 font-mono">
                      {field.count} 篇
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-1.5 rounded-full transition-all duration-300"
                            style={{
                              width: `${percent}%`,
                              backgroundColor: currentAuthor.color,
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 w-8 text-right font-mono">
                          {percent}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
