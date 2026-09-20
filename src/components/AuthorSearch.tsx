import React, { useState } from 'react';
import { Search, Loader2, Plus, Check, UserPlus, Sparkles, AlertCircle } from 'lucide-react';
import { AuthorSummary } from '../types';
import { searchAuthors } from '../services/openAlexApi';
import { SAMPLE_PRESETS, SamplePreset } from '../data/sampleAuthors';

interface AuthorSearchProps {
  selectedAuthorIds: string[];
  onSelectAuthor: (author: AuthorSummary) => void;
  onApplyPreset: (preset: SamplePreset) => void;
}

export const AuthorSearch: React.FC<AuthorSearchProps> = ({
  selectedAuthorIds,
  onSelectAuthor,
  onApplyPreset,
}) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<AuthorSummary[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setErrorMessage(null);
    setHasSearched(true);

    try {
      const results = await searchAuthors(query.trim(), 8);
      setSearchResults(results);
    } catch (err: any) {
      console.error('Author search failed:', err);
      setErrorMessage(
        'OpenAlexからの研究者検索に失敗しました。時間をおいて再試行するか、プリセットをご利用ください。'
      );
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Search className="w-4 h-4 text-indigo-600" />
            1. 研究者を検索して比較対象をリストアップ
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            OpenAlexデータベースから研究者名（英語またはローマ字）で検索し、複数名を選択して比較できます
          </p>
        </div>

        {/* Presets for quick start */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> クイック比較:
          </span>
          {SAMPLE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onApplyPreset(preset)}
              className="text-xs px-2.5 py-1 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border border-slate-200 text-slate-700 transition-colors font-medium cursor-pointer"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input Form */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="研究者名を入力 (例: Yoshua Bengio, Yann LeCun, Shinya Yamanaka, Geoffrey Hinton)..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-800"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>
        <button
          type="submit"
          disabled={isSearching || !query.trim()}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
        >
          {isSearching ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              検索中...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              検索
            </>
          )}
        </button>
      </form>

      {/* Error Message */}
      {errorMessage && (
        <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Search Results List */}
      {searchResults.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold text-slate-600">
              検索候補 ({searchResults.length}件):
            </span>
            <span className="text-xs text-slate-400">
              クリックして比較リストに追加
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {searchResults.map((author) => {
              const isSelected = selectedAuthorIds.includes(author.id) || selectedAuthorIds.includes(author.shortId);
              const primaryInstitution =
                author.institutions[0]?.displayName || '所属機関情報なし';

              return (
                <div
                  key={author.id}
                  className={`p-3 rounded-lg border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-200 ring-1 ring-indigo-200'
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1.5">
                      <h4 className="font-semibold text-sm text-slate-900 leading-snug line-clamp-1">
                        {author.displayName}
                      </h4>
                      {author.institutions[0]?.countryCode && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                          {author.institutions[0].countryCode}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                      {primaryInstitution}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                      <div>
                        <span className="text-[10px] text-slate-400 block">論文数</span>
                        <span className="font-medium">{author.worksCount.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">被引用数</span>
                        <span className="font-medium">{author.citedByCount.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">h-index</span>
                        <span className="font-medium text-indigo-600">{author.hIndex}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-end">
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 text-xs text-indigo-700 font-medium px-2 py-1 rounded bg-indigo-100/70">
                        <Check className="w-3.5 h-3.5" />
                        選択済み
                      </span>
                    ) : (
                      <button
                        onClick={() => onSelectAuthor(author)}
                        className="inline-flex items-center gap-1 text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1 rounded font-medium transition-colors cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        比較に追加
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {hasSearched && !isSearching && searchResults.length === 0 && !errorMessage && (
        <div className="mt-4 p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-lg">
          該当する研究者が見つかりませんでした。綴りを確認するか、フルネームで再度検索してください。
        </div>
      )}
    </div>
  );
};
