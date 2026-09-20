import { AuthorSummary, WorkItem, AuthorFullData, TopicItem } from '../types';
import { getCachedAuthorWorks, saveCachedAuthorWorks } from './storage';

const OPENALEX_BASE_URL = 'https://api.openalex.org';
const MAILTO = 'mailto=openalex-compare-app@example.com';

export const AUTHOR_COLOR_PALETTE = [
  { primary: '#4f46e5', light: 'rgba(79, 70, 229, 0.25)', label: 'Indigo' },
  { primary: '#059669', light: 'rgba(5, 150, 105, 0.25)', label: 'Emerald' },
  { primary: '#d97706', light: 'rgba(217, 119, 6, 0.25)', label: 'Amber' },
  { primary: '#e11d48', light: 'rgba(225, 29, 72, 0.25)', label: 'Rose' },
  { primary: '#0284c7', light: 'rgba(2, 132, 199, 0.25)', label: 'Sky' },
  { primary: '#7c3aed', light: 'rgba(124, 58, 237, 0.25)', label: 'Violet' },
];

export function extractShortId(fullIdOrUrl: string): string {
  if (!fullIdOrUrl) return '';
  const parts = fullIdOrUrl.split('/');
  return parts[parts.length - 1] || fullIdOrUrl;
}

export async function searchAuthors(query: string, limit = 8): Promise<AuthorSummary[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const url = `${OPENALEX_BASE_URL}/authors?search=${encodeURIComponent(
    query.trim()
  )}&per-page=${limit}&${MAILTO}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OpenAlex API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const rawAuthors: any[] = data.results || [];

  return rawAuthors.map((item) => {
    const shortId = extractShortId(item.id);
    const institutions = (item.last_known_institutions || []).map((inst: any) => ({
      displayName: inst.display_name || '',
      countryCode: inst.country_code || '',
    }));

    const countsByYear = (item.counts_by_year || [])
      .map((c: any) => ({
        year: c.year,
        worksCount: c.works_count || 0,
        citedByCount: c.cited_by_count || 0,
      }))
      .sort((a: any, b: any) => a.year - b.year);

    const topics = (item.topics || item.x_concepts || [])
      .slice(0, 10)
      .map((t: any) => ({
        name: t.display_name || '',
        count: t.count || 0,
        field: t.field?.display_name || t.subfield?.display_name || '',
      }));

    return {
      id: item.id,
      shortId,
      displayName: item.display_name || '名前不明',
      worksCount: item.works_count || 0,
      citedByCount: item.cited_by_count || 0,
      hIndex: item.summary_stats?.h_index ?? 0,
      i10Index: item.summary_stats?.i10_index ?? 0,
      institutions,
      countsByYear,
      topics,
    };
  });
}

export interface FetchProgress {
  current: number;
  total: number;
  percent: number;
  page: number;
}

export async function fetchAllAuthorWorks(
  authorShortId: string,
  onProgress?: (progress: FetchProgress) => void,
  bypassCache = false
): Promise<{ works: WorkItem[]; isFromCache: boolean }> {
  const cleanId = extractShortId(authorShortId);

  // 1. Check local IndexedDB cache first to avoid repeating API requests
  if (!bypassCache) {
    const cachedWorks = await getCachedAuthorWorks(cleanId);
    if (cachedWorks && cachedWorks.length > 0) {
      if (onProgress) {
        onProgress({
          current: cachedWorks.length,
          total: cachedWorks.length,
          percent: 100,
          page: 1,
        });
      }
      return { works: cachedWorks, isFromCache: true };
    }
  }

  // 2. Paginated cursor fetch from OpenAlex API (200 works per page)
  const allWorks: WorkItem[] = [];
  let cursor = '*';
  let page = 1;
  let totalCount = 0;
  const maxPages = 25; // Safety cap (up to 5,000 papers)

  while (cursor && page <= maxPages) {
    const url = `${OPENALEX_BASE_URL}/works?filter=author.id:${cleanId}&sort=cited_by_count:desc&per-page=200&cursor=${encodeURIComponent(
      cursor
    )}&${MAILTO}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenAlex Works API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const rawWorks: any[] = data.results || [];
    totalCount = data.meta?.count || totalCount || rawWorks.length;

    const mappedWorks: WorkItem[] = rawWorks.map((item) => {
      const journalName =
        item.primary_location?.source?.display_name ||
        item.host_venue?.display_name ||
        item.locations?.[0]?.source?.display_name ||
        'その他 / プレプリント等';

      const concepts = (item.concepts || []).map((c: any) => ({
        name: c.display_name || '',
        level: c.level ?? 0,
        score: c.score ?? 0,
      }));

      const topics = (item.topics || []).map((t: any) => ({
        name: t.display_name || '',
        subfield: t.subfield?.display_name,
        field: t.field?.display_name,
      }));

      return {
        id: item.id,
        title: item.title || '無題 (No title)',
        publicationYear: item.publication_year || 0,
        citedByCount: item.cited_by_count || 0,
        journalName,
        doi: item.doi || (item.ids?.doi ? `https://doi.org/${item.ids.doi}` : undefined),
        landingPageUrl: item.primary_location?.landing_page_url || item.doi || item.id,
        concepts,
        topics,
      };
    });

    allWorks.push(...mappedWorks);

    const effectiveTotal = Math.max(totalCount, allWorks.length);
    const percent = Math.min(100, Math.round((allWorks.length / effectiveTotal) * 100));

    if (onProgress) {
      onProgress({
        current: allWorks.length,
        total: effectiveTotal,
        percent,
        page,
      });
    }

    const nextCursor = data.meta?.next_cursor;
    if (!nextCursor || rawWorks.length === 0 || allWorks.length >= totalCount) {
      break;
    }
    cursor = nextCursor;
    page++;

    // Small polite delay between pages
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  // 3. Save all fetched works into local IndexedDB
  await saveCachedAuthorWorks(cleanId, allWorks, allWorks.length);

  return { works: allWorks, isFromCache: false };
}

export async function fetchAuthorWorks(authorShortId: string, limit = 100): Promise<WorkItem[]> {
  const result = await fetchAllAuthorWorks(authorShortId);
  return result.works.slice(0, limit);
}

export function extractTopJournals(works: WorkItem[], limit = 10): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const work of works) {
    const name = work.journalName || 'その他';
    map.set(name, (map.get(name) || 0) + 1);
  }

  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function extractTopFields(works: WorkItem[], limit = 10): { name: string; count: number }[] {
  const map = new Map<string, number>();

  for (const work of works) {
    // Prefer topics field or top concepts
    if (work.topics && work.topics.length > 0) {
      for (const t of work.topics) {
        const fieldName = t.field || t.subfield || t.name;
        if (fieldName) {
          map.set(fieldName, (map.get(fieldName) || 0) + 1);
        }
      }
    } else if (work.concepts && work.concepts.length > 0) {
      for (const c of work.concepts) {
        if (c.name && c.level <= 2) {
          map.set(c.name, (map.get(c.name) || 0) + 1);
        }
      }
    }
  }

  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function extractTopTopics(
  works: WorkItem[],
  fallbackAuthorTopics?: { name: string; count?: number; subfield?: string; field?: string }[],
  limit = 10
): TopicItem[] {
  const map = new Map<string, { count: number; subfield?: string; field?: string }>();

  for (const work of works) {
    if (work.topics && work.topics.length > 0) {
      for (const t of work.topics) {
        if (t.name) {
          const existing = map.get(t.name);
          if (existing) {
            existing.count += 1;
          } else {
            map.set(t.name, {
              count: 1,
              subfield: t.subfield,
              field: t.field,
            });
          }
        }
      }
    }
  }

  if (map.size > 0) {
    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        subfield: data.subfield,
        field: data.field,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  // Fallback to author's official topics from /authors if works don't yet have individual topics
  if (fallbackAuthorTopics && fallbackAuthorTopics.length > 0) {
    return fallbackAuthorTopics.slice(0, limit).map((t) => ({
      name: t.name,
      count: t.count || 0,
      subfield: t.subfield,
      field: t.field,
    }));
  }

  return [];
}

export function buildAnnualTrendData(
  authors: AuthorFullData[],
  metric: 'worksCount' | 'citedByCount',
  yearRange?: [number, number]
): { year: number; [key: string]: number }[] {
  if (authors.length === 0) return [];

  let startYear: number;
  let endYear: number;

  if (yearRange && yearRange.length === 2) {
    startYear = Math.min(yearRange[0], yearRange[1]);
    endYear = Math.max(yearRange[0], yearRange[1]);
  } else {
    // If authors have countsByYear, determine range
    const allYears = authors.flatMap((a) => (a.countsByYear || []).map((c) => c.year));
    if (allYears.length > 0) {
      startYear = Math.min(...allYears);
      endYear = Math.max(...allYears);
    } else {
      const currentYear = new Date().getFullYear();
      startYear = currentYear - 15;
      endYear = currentYear;
    }
  }

  const yearMap = new Map<number, { year: number; [key: string]: number }>();

  for (let y = startYear; y <= endYear; y++) {
    yearMap.set(y, { year: y });
  }

  for (const author of authors) {
    for (const item of author.countsByYear || []) {
      if (item.year >= startYear && item.year <= endYear) {
        const entry = yearMap.get(item.year) || { year: item.year };
        entry[author.shortId] = item[metric] || 0;
        yearMap.set(item.year, entry);
      }
    }
  }

  return Array.from(yearMap.values()).sort((a, b) => a.year - b.year);
}
