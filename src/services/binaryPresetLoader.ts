import { decode } from '@msgpack/msgpack';
import { AuthorSummary, WorkItem, JournalItem, FieldItem, TopicItem, AuthorFullData } from '../types';
import { AUTHOR_COLOR_PALETTE } from './openAlexApi';
import { saveCachedAuthorWorks } from './storage';

export interface PresetBinaryAuthor {
  summary: AuthorSummary;
  works: WorkItem[];
  top10Works: WorkItem[];
  top10Journals: JournalItem[];
  top10Fields: FieldItem[];
  top10Topics: TopicItem[];
}

export interface PresetBinaryPayload {
  version: number;
  id?: string;
  generatedAt: string;
  description: string;
  authors: PresetBinaryAuthor[];
}

function getBinaryFileBaseName(presetId?: string): string {
  if (presetId === 'nobel-stemcell') {
    return 'preset-nobel-stemcell';
  }
  return 'preset-authors';
}

/**
 * Loads pre-downloaded preset author data from high-performance binary format (.bin.gz or .bin)
 * using MessagePack deserialization and warms up the local IndexedDB cache.
 * Supports both AI pioneers and Nobel stem cell (iPS) presets.
 */
export async function loadPresetBinaryData(presetId = 'ai-pioneers'): Promise<AuthorFullData[] | null> {
  try {
    const baseName = getBinaryFileBaseName(presetId);
    let arrayBuffer: ArrayBuffer | null = null;

    // Resolve base path dynamically for GitHub Pages and sub-directory deployment compatibility
    const baseUrl = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL ? import.meta.env.BASE_URL : './';
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

    // 1. First attempt: fast download via gzipped binary with browser DecompressionStream
    try {
      if (typeof window !== 'undefined' && 'DecompressionStream' in window) {
        const gzRes = await fetch(`${cleanBase}data/${baseName}.bin.gz`);
        if (gzRes.ok && gzRes.body) {
          const ds = new DecompressionStream('gzip');
          const decompressedStream = gzRes.body.pipeThrough(ds);
          arrayBuffer = await new Response(decompressedStream).arrayBuffer();
        }
      }
    } catch (gzErr) {
      console.warn('Gzip stream decompression not available or failed, falling back to uncompressed binary:', gzErr);
    }

    // 2. Fallback: fetch uncompressed MessagePack binary (.bin)
    if (!arrayBuffer) {
      const binRes = await fetch(`${cleanBase}data/${baseName}.bin`);
      if (!binRes.ok) {
        throw new Error(`Failed to fetch preset binary ${baseName}: ${binRes.status} ${binRes.statusText}`);
      }
      arrayBuffer = await binRes.arrayBuffer();
    }

    // 3. Ultra-fast binary MessagePack decoding
    const decoded = decode(new Uint8Array(arrayBuffer)) as unknown as PresetBinaryPayload;
    if (!decoded || !Array.isArray(decoded.authors) || decoded.authors.length === 0) {
      throw new Error(`Invalid binary payload structure for ${baseName}`);
    }

    // 4. Map to AuthorFullData and warm up IndexedDB in background
    const fullAuthors: AuthorFullData[] = decoded.authors.map((authorData, idx) => {
      const palette = AUTHOR_COLOR_PALETTE[idx % AUTHOR_COLOR_PALETTE.length];

      // Asynchronously pre-cache in IndexedDB so subsequent operations never need to re-query OpenAlex
      saveCachedAuthorWorks(
        authorData.summary.shortId,
        authorData.works,
        authorData.summary.worksCount
      ).catch((err) => {
        console.warn('Failed to pre-warm IndexedDB cache for preset author:', err);
      });

      return {
        ...authorData.summary,
        color: palette.primary,
        lightColor: palette.light,
        works: authorData.works,
        top10Works: authorData.top10Works,
        top10Journals: authorData.top10Journals,
        top10Fields: authorData.top10Fields,
        top10Topics: authorData.top10Topics,
        isLoadingWorks: false,
        isCached: true,
      };
    });

    return fullAuthors;
  } catch (err) {
    console.warn(`Failed to load binary preset data (${presetId}):`, err);
    return null;
  }
}

/**
 * Pre-warms IndexedDB in background with all available presets (AI pioneers and iPS researchers)
 * so switching presets or querying them is instant without network requests.
 */
export function warmUpAllPresetsInBackground(): void {
  setTimeout(() => {
    loadPresetBinaryData('ai-pioneers').catch(() => {});
    loadPresetBinaryData('nobel-stemcell').catch(() => {});
  }, 1000);
}
