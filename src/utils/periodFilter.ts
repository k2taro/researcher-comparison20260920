import { AuthorFullData, WorkItem } from '../types';
import { extractTopJournals, extractTopFields, extractTopTopics } from '../services/openAlexApi';

/**
 * Calculates academic metrics for a researcher strictly limited to papers published
 * within the specified year range [startYear, endYear].
 */
export function filterAuthorDataByYearRange(
  author: AuthorFullData,
  startYear: number,
  endYear: number
): AuthorFullData {
  const minYear = Math.min(startYear, endYear);
  const maxYear = Math.max(startYear, endYear);

  // If author has no works loaded yet, return skeleton
  if (!author.works || author.works.length === 0) {
    const emptyCountsByYear: { year: number; worksCount: number; citedByCount: number }[] = [];
    for (let y = minYear; y <= maxYear; y++) {
      emptyCountsByYear.push({ year: y, worksCount: 0, citedByCount: 0 });
    }
    return {
      ...author,
      worksCount: 0,
      citedByCount: 0,
      hIndex: 0,
      i10Index: 0,
      countsByYear: emptyCountsByYear,
      works: [],
      top10Works: [],
      top10Journals: [],
      top10Fields: [],
      top10Topics: [],
    };
  }

  // 1. Filter works by publication year
  const filteredWorks: WorkItem[] = author.works.filter(
    (work) => work.publicationYear >= minYear && work.publicationYear <= maxYear
  );

  // 2. Total citations of papers in this period
  const totalCitations = filteredWorks.reduce(
    (sum, work) => sum + (work.citedByCount || 0),
    0
  );

  // 3. Compute period-specific h-index
  const sortedCitations = filteredWorks
    .map((w) => w.citedByCount || 0)
    .sort((a, b) => b - a);

  let hIndex = 0;
  for (let i = 0; i < sortedCitations.length; i++) {
    if (sortedCitations[i] >= i + 1) {
      hIndex = i + 1;
    } else {
      break;
    }
  }

  // 4. Compute period-specific i10-index (papers with >= 10 citations)
  const i10Index = filteredWorks.filter((w) => (w.citedByCount || 0) >= 10).length;

  // 5. Build year-by-year distribution for the period
  const countsByYear: { year: number; worksCount: number; citedByCount: number }[] = [];
  for (let y = minYear; y <= maxYear; y++) {
    const worksInYear = filteredWorks.filter((w) => w.publicationYear === y);
    countsByYear.push({
      year: y,
      worksCount: worksInYear.length,
      citedByCount: worksInYear.reduce((sum, w) => sum + (w.citedByCount || 0), 0),
    });
  }

  // 6. Compute top 10 works, journals, fields, and topics strictly for this period
  const top10Works = [...filteredWorks]
    .sort((a, b) => b.citedByCount - a.citedByCount)
    .slice(0, 10);

  const top10Journals = extractTopJournals(filteredWorks, 10);
  const top10Fields = extractTopFields(filteredWorks, 10);
  const top10Topics = extractTopTopics(filteredWorks, undefined, 10);

  return {
    ...author,
    worksCount: filteredWorks.length,
    citedByCount: totalCitations,
    hIndex,
    i10Index,
    countsByYear,
    works: filteredWorks,
    top10Works,
    top10Journals,
    top10Fields,
    top10Topics,
  };
}
