import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { AuthorSearch } from './components/AuthorSearch';
import { SelectedAuthorsBar } from './components/SelectedAuthorsBar';
import { MetricsOverview } from './components/MetricsOverview';
import { AnnualTrendsChart } from './components/AnnualTrendsChart';
import { TopPapersTable } from './components/TopPapersTable';
import { TopJournalsTable } from './components/TopJournalsTable';
import { TopTopicsTable } from './components/TopTopicsTable';
import { TopFieldsTable } from './components/TopFieldsTable';
import { ResearcherVectorScatter } from './components/ResearcherVectorScatter';
import { PeriodFilterPanel } from './components/PeriodFilterPanel';
import { AuthorSummary, AuthorFullData, WorkItem } from './types';
import {
  AUTHOR_COLOR_PALETTE,
  fetchAllAuthorWorks,
  extractTopJournals,
  extractTopFields,
  extractTopTopics,
} from './services/openAlexApi';
import { exportAuthorDataToJson } from './services/storage';
import { SAMPLE_PRESETS, SamplePreset } from './data/sampleAuthors';
import { loadPresetBinaryData } from './services/binaryPresetLoader';
import { filterAuthorDataByYearRange } from './utils/periodFilter';
import { Layers, Calendar } from 'lucide-react';

export default function App() {
  const [selectedAuthors, setSelectedAuthors] = useState<AuthorFullData[]>([]);
  const [activeTab, setActiveTab] = useState<'all-time' | 'custom-period'>('all-time');
  const [periodStartYear, setPeriodStartYear] = useState<number>(2016);
  const [periodEndYear, setPeriodEndYear] = useState<number>(2025);

  // Initialize with pre-downloaded high-performance binary preset data (Yoshua Bengio vs Yann LeCun)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const binaryAuthors = await loadPresetBinaryData();
      if (isMounted) {
        if (binaryAuthors && binaryAuthors.length > 0) {
          setSelectedAuthors(binaryAuthors);
        } else {
          // Fallback to preset if binary load failed
          applyPreset(SAMPLE_PRESETS[0]);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute period-filtered dataset in memory with instant reactivity
  const filteredAuthors = useMemo(() => {
    return selectedAuthors.map((author) =>
      filterAuthorDataByYearRange(author, periodStartYear, periodEndYear)
    );
  }, [selectedAuthors, periodStartYear, periodEndYear]);

  const displayedAuthors = activeTab === 'custom-period' ? filteredAuthors : selectedAuthors;
  const currentPeriodLabel =
    activeTab === 'custom-period' ? `${periodStartYear}年〜${periodEndYear}年` : undefined;

  const loadAllWorksForAuthor = async (authorShortId: string, bypassCache = false) => {
    try {
      const { works, isFromCache } = await fetchAllAuthorWorks(
        authorShortId,
        (progress) => {
          setSelectedAuthors((prev) =>
            prev.map((a) =>
              a.shortId === authorShortId
                ? {
                    ...a,
                    loadingProgress: progress,
                  }
                : a
            )
          );
        },
        bypassCache
      );

      const topWorks = [...works]
        .sort((x, y) => y.citedByCount - x.citedByCount)
        .slice(0, 10);
      const topJournals = extractTopJournals(works, 10);
      const topFields = extractTopFields(works, 10);
      const topTopics = extractTopTopics(works, undefined, 10);

      setSelectedAuthors((prev) =>
        prev.map((a) =>
          a.shortId === authorShortId
            ? {
                ...a,
                works,
                top10Works: topWorks,
                top10Journals: topJournals,
                top10Fields: topFields,
                top10Topics: topTopics.length > 0 ? topTopics : extractTopTopics(works, a.topics, 10),
                isLoadingWorks: false,
                isCached: isFromCache,
                loadingProgress: undefined,
              }
            : a
        )
      );
    } catch (err) {
      console.error(`Failed to fetch all works for ${authorShortId}:`, err);
      setSelectedAuthors((prev) =>
        prev.map((a) =>
          a.shortId === authorShortId
            ? { ...a, isLoadingWorks: false, loadingProgress: undefined }
            : a
        )
      );
    }
  };

  const applyPreset = async (preset: SamplePreset) => {
    if (preset.id === 'ai-pioneers') {
      const binaryAuthors = await loadPresetBinaryData();
      if (binaryAuthors && binaryAuthors.length > 0) {
        setSelectedAuthors(binaryAuthors);
        return;
      }
    }

    const fullAuthors: AuthorFullData[] = preset.authors.map((a, idx) => {
      const palette = AUTHOR_COLOR_PALETTE[idx % AUTHOR_COLOR_PALETTE.length];
      const topWorks = [...a.works]
        .sort((x, y) => y.citedByCount - x.citedByCount)
        .slice(0, 10);
      const topJournals = extractTopJournals(a.works, 10);
      const topFields = extractTopFields(a.works, 10);
      const topTopics = extractTopTopics(a.works, a.summary.topics, 10);

      return {
        ...a.summary,
        color: palette.primary,
        lightColor: palette.light,
        works: a.works,
        top10Works: topWorks,
        top10Journals: topJournals,
        top10Fields: topFields,
        top10Topics: topTopics,
        isLoadingWorks: false,
        isCached: true,
      };
    });

    setSelectedAuthors(fullAuthors);

    // Fetch and sync full works from OpenAlex API or IndexedDB cache for each preset author
    preset.authors.forEach((a) => {
      loadAllWorksForAuthor(a.summary.shortId);
    });
  };

  const handleSelectAuthor = async (authorSummary: AuthorSummary) => {
    // Check if already selected
    if (selectedAuthors.some((a) => a.shortId === authorSummary.shortId)) {
      return;
    }

    const nextColorIndex = selectedAuthors.length % AUTHOR_COLOR_PALETTE.length;
    const palette = AUTHOR_COLOR_PALETTE[nextColorIndex];

    const newAuthor: AuthorFullData = {
      ...authorSummary,
      color: palette.primary,
      lightColor: palette.light,
      works: [],
      top10Works: [],
      top10Journals: [],
      top10Fields: [],
      top10Topics: extractTopTopics([], authorSummary.topics, 10),
      isLoadingWorks: true,
    };

    setSelectedAuthors((prev) => [...prev, newAuthor]);
    await loadAllWorksForAuthor(authorSummary.shortId);
  };

  const handleDownloadAuthorJson = (author: AuthorFullData) => {
    exportAuthorDataToJson(author);
  };

  const handleRefreshAuthorWorks = (authorShortId: string) => {
    setSelectedAuthors((prev) =>
      prev.map((a) => (a.shortId === authorShortId ? { ...a, isLoadingWorks: true } : a))
    );
    loadAllWorksForAuthor(authorShortId, true);
  };

  const handleRemoveAuthor = (authorShortId: string) => {
    setSelectedAuthors((prev) => prev.filter((a) => a.shortId !== authorShortId));
  };

  const handleClearAll = () => {
    setSelectedAuthors([]);
  };

  const selectedIds = selectedAuthors.map((a) => a.shortId);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 font-sans pb-16">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Section 1: Search & List Up */}
        <section id="section-search">
          <AuthorSearch
            selectedAuthorIds={selectedIds}
            onSelectAuthor={handleSelectAuthor}
            onApplyPreset={applyPreset}
          />
        </section>

        {/* Section 2: Selected Candidates Bar */}
        <section id="section-selected-authors">
          <SelectedAuthorsBar
            authors={selectedAuthors}
            onRemoveAuthor={handleRemoveAuthor}
            onClearAll={handleClearAll}
            onDownloadAuthorJson={handleDownloadAuthorJson}
            onRefreshAuthorWorks={handleRefreshAuthorWorks}
          />
        </section>

        {/* Comparison Sections (shown when authors are selected) */}
        {selectedAuthors.length > 0 && (
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('all-time')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                    activeTab === 'all-time'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>全期間（通算）</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-normal ${
                      activeTab === 'all-time'
                        ? 'bg-indigo-700/60 text-indigo-100'
                        : 'bg-slate-200/80 text-slate-600'
                    }`}
                  >
                    全論文
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('custom-period')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                    activeTab === 'custom-period'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>期間指定（年次絞り込み）</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                      activeTab === 'custom-period'
                        ? 'bg-indigo-700/60 text-indigo-100'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    }`}
                  >
                    {periodStartYear}〜{periodEndYear}年
                  </span>
                </button>
              </div>

              <div className="text-xs text-slate-500 px-2 py-1">
                {activeTab === 'all-time' ? (
                  <span>全収録論文に基づく生涯研究業績の比較</span>
                ) : (
                  <span>
                    指定年（{periodStartYear}〜{periodEndYear}年）の発行論文のみを抽出して全指標を再計算
                  </span>
                )}
              </div>
            </div>

            {/* Filter Control Panel (shown only in custom-period tab) */}
            {activeTab === 'custom-period' && (
              <PeriodFilterPanel
                startYear={periodStartYear}
                endYear={periodEndYear}
                onStartYearChange={setPeriodStartYear}
                onEndYearChange={setPeriodEndYear}
                authors={selectedAuthors}
                filteredAuthors={filteredAuthors}
              />
            )}

            {/* 3-1: 主要指標 (論文数、被引用数、h-index) */}
            <section id="section-metrics">
              <MetricsOverview
                authors={displayedAuthors}
                periodLabel={currentPeriodLabel}
              />
            </section>

            {/* 3-2: 論文数年次推移 & 被引用数年次推移 (折れ線グラフ) */}
            <section id="section-annual-trends">
              <AnnualTrendsChart
                authors={displayedAuthors}
                yearRange={activeTab === 'custom-period' ? [periodStartYear, periodEndYear] : undefined}
              />
            </section>

            {/* 3-3: 被引用数top10論文 (表形式) */}
            <section id="section-top-papers">
              <TopPapersTable authors={displayedAuthors} />
            </section>

            {/* 3-4: 発表トピックtop10 (表形式: トピック名・サブフィールド表示に余裕を持たせた横幅) */}
            <section id="section-top-topics">
              <TopTopicsTable authors={displayedAuthors} />
            </section>

            {/* 3-5 & 3-6: 発表ジャーナルtop10 & 発表分野top10 (表形式: 2列構成で各表の横幅を拡大) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section id="section-top-journals">
                <TopJournalsTable authors={displayedAuthors} />
              </section>
              <section id="section-top-fields">
                <TopFieldsTable authors={displayedAuthors} />
              </section>
            </div>

            {/* 4: 研究者ベクトル化 (散布図: Transformers.js + PCA) */}
            <section id="section-vector-scatter">
              <ResearcherVectorScatter authors={displayedAuthors} />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
