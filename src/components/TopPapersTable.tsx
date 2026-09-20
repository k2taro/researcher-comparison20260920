import React, { useState } from 'react';
import { BookMarked, ExternalLink, Quote, Calendar, Award } from 'lucide-react';
import { AuthorFullData, WorkItem } from '../types';

interface TopPapersTableProps {
  authors: AuthorFullData[];
}

export const TopPapersTable: React.FC<TopPapersTableProps> = ({ authors }) => {
  const [selectedAuthorFilter, setSelectedAuthorFilter] = useState<string>('all');

  if (authors.length === 0) return null;

  interface PaperWithAuthor extends WorkItem {
    authorName: string;
    authorColor: string;
    authorShortId: string;
  }

  // Flatten top 10 papers per author
  const papersByAuthor: PaperWithAuthor[] = [];
  for (const author of authors) {
    const topWorks = (author.top10Works || []).slice(0, 10);
    for (const work of topWorks) {
      papersByAuthor.push({
        ...work,
        authorName: author.displayName,
        authorColor: author.color,
        authorShortId: author.shortId,
      });
    }
  }

  // Filter or sort
  let displayedPapers: PaperWithAuthor[] = [];
  if (selectedAuthorFilter === 'all') {
    // Show top cited overall among selected authors
    displayedPapers = [...papersByAuthor]
      .sort((a, b) => b.citedByCount - a.citedByCount)
      .slice(0, 10);
  } else {
    displayedPapers = papersByAuthor
      .filter((p) => p.authorShortId === selectedAuthorFilter)
      .sort((a, b) => b.citedByCount - a.citedByCount)
      .slice(0, 10);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-indigo-600" />
            被引用数 Top 10 論文（表形式）
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            各研究者の学術的影響力を牽引する主要論文の一覧
          </p>
        </div>

        {/* Filter by Author */}
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg text-xs self-start sm:self-auto">
          <button
            onClick={() => setSelectedAuthorFilter('all')}
            className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
              selectedAuthorFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            全体Top10
          </button>
          {authors.map((author) => (
            <button
              key={author.shortId}
              onClick={() => setSelectedAuthorFilter(author.shortId)}
              className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedAuthorFilter === author.shortId
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
        <table className="w-full min-w-[850px] text-xs text-left">
          <thead>
            <tr className="text-slate-400 border-b border-slate-200 bg-slate-50/70">
              <th className="py-2.5 px-3 font-semibold w-12 text-center">順位</th>
              <th className="py-2.5 px-3 font-semibold w-28">著者</th>
              <th className="py-2.5 px-3 font-semibold min-w-[280px]">論文タイトル</th>
              <th className="py-2.5 px-3 font-semibold w-16 text-center">出版年</th>
              <th className="py-2.5 px-3 font-semibold w-28 text-right">被引用数</th>
              <th className="py-2.5 px-3 font-semibold min-w-[200px]">掲載ジャーナル / 会議</th>
              <th className="py-2.5 px-3 font-semibold w-16 text-center">リンク</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {displayedPapers.map((paper, idx) => {
              const rank = idx + 1;
              const linkUrl = paper.landingPageUrl || paper.doi;

              return (
                <tr key={`${paper.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold ${
                        rank === 1
                          ? 'bg-amber-100 text-amber-800'
                          : rank === 2
                          ? 'bg-slate-200 text-slate-700'
                          : rank === 3
                          ? 'bg-orange-100 text-orange-800'
                          : 'text-slate-500'
                      }`}
                    >
                      {rank}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border"
                      style={{
                        borderColor: paper.authorColor,
                        backgroundColor: `${paper.authorColor}15`,
                        color: paper.authorColor,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: paper.authorColor }}
                      />
                      {paper.authorName.split(' ')[0]}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-medium text-slate-900 line-clamp-2 leading-snug break-words" title={paper.title}>
                      {paper.title}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center text-slate-500 font-mono">
                    {paper.publicationYear || '-'}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="font-bold text-slate-900 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200/60 inline-block font-mono">
                      {paper.citedByCount.toLocaleString()} 回
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-slate-600 line-clamp-2 leading-snug break-words" title={paper.journalName}>
                      {paper.journalName || '未登録'}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {linkUrl ? (
                      <a
                        href={linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors"
                        title="論文詳細 / DOIを開く"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
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
