import React from 'react';
import { Users, X, Loader2, ExternalLink, Download, RotateCw, Database } from 'lucide-react';
import { AuthorFullData } from '../types';

interface SelectedAuthorsBarProps {
  authors: AuthorFullData[];
  onRemoveAuthor: (authorId: string) => void;
  onClearAll: () => void;
  onDownloadAuthorJson?: (author: AuthorFullData) => void;
  onRefreshAuthorWorks?: (authorShortId: string) => void;
}

export const SelectedAuthorsBar: React.FC<SelectedAuthorsBarProps> = ({
  authors,
  onRemoveAuthor,
  onClearAll,
  onDownloadAuthorJson,
  onRefreshAuthorWorks,
}) => {
  if (authors.length === 0) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6 text-center">
        <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700">比較対象の研究者が選択されていません</p>
        <p className="text-xs text-slate-500 mt-1">
          上の検索バーで研究者を検索するか、「クイック比較」プリセットをクリックしてください（2名以上の比較がおすすめです）
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-sm font-bold text-slate-800">
            選択中の比較対象研究者 ({authors.length}名)
          </h3>
          <span className="hidden sm:inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            <Database className="w-3 h-3 text-slate-400" />
            全論文ローカル保存 (IndexedDB)
          </span>
        </div>
        {authors.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs text-slate-500 hover:text-red-600 transition-colors font-medium cursor-pointer"
          >
            すべて解除
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {authors.map((author) => {
          return (
            <div
              key={author.id}
              className="relative rounded-lg border p-3 bg-slate-50/50 transition-all flex flex-col justify-between"
              style={{
                borderColor: author.color,
                borderLeftWidth: '4px',
              }}
            >
              <div>
                <div className="flex items-start justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: author.color }}
                    />
                    <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
                      {author.displayName}
                    </h4>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {onDownloadAuthorJson && author.works.length > 0 && (
                      <button
                        onClick={() => onDownloadAuthorJson(author)}
                        className="text-slate-400 hover:text-indigo-600 p-1 rounded-md hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="全論文・指標データをJSONファイルとしてダウンロード"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onRefreshAuthorWorks && !author.isLoadingWorks && (
                      <button
                        onClick={() => onRefreshAuthorWorks(author.shortId)}
                        className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="キャッシュを無視して最新の全論文をAPIから再取得"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onRemoveAuthor(author.shortId)}
                      className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-200/60 transition-colors cursor-pointer"
                      title="比較から外す"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-500 line-clamp-1 mt-1 pl-5">
                  {author.institutions[0]?.displayName || '所属情報なし'}
                </p>

                <div className="grid grid-cols-3 gap-1.5 mt-2.5 pt-2 border-t border-slate-200 text-center text-xs">
                  <div className="bg-white py-1 px-1.5 rounded border border-slate-200/60">
                    <span className="text-[10px] text-slate-400 block">総論文数</span>
                    <span className="font-semibold text-slate-800 text-xs">
                      {author.worksCount.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white py-1 px-1.5 rounded border border-slate-200/60">
                    <span className="text-[10px] text-slate-400 block">被引用数</span>
                    <span className="font-semibold text-slate-800 text-xs">
                      {author.citedByCount >= 10000
                        ? `${(author.citedByCount / 1000).toFixed(1)}k`
                        : author.citedByCount.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white py-1 px-1.5 rounded border border-slate-200/60">
                    <span className="text-[10px] text-slate-400 block">h-index</span>
                    <span className="font-bold text-xs" style={{ color: author.color }}>
                      {author.hIndex}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-col gap-1 text-[11px] text-slate-500">
                {author.isLoadingWorks ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-amber-600 font-medium">
                      <span className="inline-flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        全論文取得中 (200件/頁)
                      </span>
                      {author.loadingProgress && (
                        <span>
                          {author.loadingProgress.current} / {author.loadingProgress.total} 篇 (
                          {author.loadingProgress.percent}%)
                        </span>
                      )}
                    </div>
                    {author.loadingProgress && (
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${author.loadingProgress.percent}%` }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                      <span>✓</span>
                      <span>全 {author.works.length.toLocaleString()} 篇 ローカル保持</span>
                      {author.isCached && (
                        <span className="bg-slate-200/80 text-slate-600 text-[9px] px-1 py-0.2 rounded">
                          キャッシュ
                        </span>
                      )}
                    </span>

                    <a
                      href={`https://openalex.org/${author.shortId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                      title="OpenAlexプロフィール"
                    >
                      <span>OpenAlex</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
