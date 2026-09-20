import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { encode } from '@msgpack/msgpack';

const MAILTO = 'mailto=openalex-compare-app@example.com';
const OPENALEX_BASE_URL = 'https://api.openalex.org';

const PRESET_GROUPS = [
  {
    id: 'ai-pioneers',
    outputBaseNames: ['preset-authors', 'preset-ai-pioneers'],
    description: 'Pre-downloaded binary dataset for Yoshua Bengio & Yann LeCun',
    authors: [
      { shortId: 'A5086198262', canonicalName: 'Yoshua Bengio' },
      { shortId: 'A5001226970', canonicalName: 'Yann LeCun' },
    ],
  },
  {
    id: 'nobel-stemcell',
    outputBaseNames: ['preset-nobel-stemcell'],
    description: 'Pre-downloaded binary dataset for Shinya Yamanaka & Jennifer Doudna',
    authors: [
      { shortId: 'A5081862387', canonicalName: 'Shinya Yamanaka' },
      { shortId: 'A5067184382', canonicalName: 'Jennifer A. Doudna' },
    ],
  },
];

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAuthorSummary(shortId) {
  const url = `${OPENALEX_BASE_URL}/authors/${shortId}?${MAILTO}`;
  console.log(`Fetching author summary for ${shortId}...`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch author ${shortId}: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();

  return {
    id: data.id,
    shortId,
    displayName: data.display_name,
    worksCount: data.works_count || 0,
    citedByCount: data.cited_by_count || 0,
    hIndex: data.summary_stats?.h_index || 0,
    i10Index: data.summary_stats?.i10_index || 0,
    institutions: (data.last_known_institutions || []).map((inst) => ({
      displayName: inst.display_name || '',
      countryCode: inst.country_code || '',
    })),
    countsByYear: (data.counts_by_year || [])
      .map((c) => ({
        year: c.year,
        worksCount: c.works_count || 0,
        citedByCount: c.cited_by_count || 0,
      }))
      .sort((a, b) => a.year - b.year),
    topics: (data.topics || []).slice(0, 15).map((t) => ({
      name: t.display_name || '',
      count: t.count || 0,
      subfield: t.subfield?.display_name,
      field: t.field?.display_name,
    })),
  };
}

async function fetchAllWorksForAuthor(shortId, expectedCount) {
  const allWorks = [];
  let page = 1;
  const perPage = 200;
  const totalPages = Math.min(Math.ceil((expectedCount || 1) / perPage), 25);

  console.log(`Fetching all works for ${shortId} (expected ~${expectedCount} works, ~${totalPages} pages)...`);

  while (page <= totalPages) {
    const url = `${OPENALEX_BASE_URL}/works?filter=author.id:${shortId}&per_page=${perPage}&page=${page}&select=id,title,publication_year,cited_by_count,primary_location,concepts,topics&${MAILTO}`;
    console.log(`  Page ${page}/${totalPages}...`);

    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  Warning: page ${page} failed (${res.status}). Retrying once...`);
      await sleep(500);
      const retryRes = await fetch(url);
      if (!retryRes.ok) break;
    }

    const data = await res.json();
    const results = data.results || [];
    if (results.length === 0) break;

    for (const item of results) {
      allWorks.push({
        id: item.id || '',
        title: item.title || 'Untitled',
        publicationYear: item.publication_year || 0,
        citedByCount: item.cited_by_count || 0,
        journalName: item.primary_location?.source?.display_name || '',
        doi: item.doi || undefined,
        landingPageUrl: item.primary_location?.landing_page_url || undefined,
        concepts: (item.concepts || []).slice(0, 4).map((c) => ({
          name: c.display_name || '',
          level: c.level || 0,
          score: c.score || 0,
        })),
        topics: (item.topics || []).slice(0, 3).map((t) => ({
          name: t.display_name || '',
          subfield: t.subfield?.display_name,
          field: t.field?.display_name,
          domain: t.domain?.display_name,
        })),
      });
    }

    if (results.length < perPage) break;
    page++;
    await sleep(100);
  }

  console.log(`  Successfully fetched ${allWorks.length} works for ${shortId}`);
  return allWorks;
}

function extractTopJournals(works, limit = 10) {
  const map = new Map();
  for (const work of works) {
    const name = work.journalName || 'その他';
    map.set(name, (map.get(name) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function extractTopFields(works, limit = 10) {
  const map = new Map();
  for (const work of works) {
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

function extractTopTopics(works, fallbackAuthorTopics, limit = 10) {
  const map = new Map();
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

async function processPresetGroup(group, outDir) {
  console.log(`\n=== Processing Preset Group: ${group.id} ===`);

  const presetPayload = {
    version: 1,
    id: group.id,
    generatedAt: new Date().toISOString(),
    description: group.description,
    authors: [],
  };

  for (const authorInfo of group.authors) {
    const summary = await fetchAuthorSummary(authorInfo.shortId);
    const works = await fetchAllWorksForAuthor(authorInfo.shortId, summary.worksCount);

    const top10Works = [...works]
      .sort((a, b) => b.citedByCount - a.citedByCount)
      .slice(0, 10);
    const top10Journals = extractTopJournals(works, 10);
    const top10Fields = extractTopFields(works, 10);
    const top10Topics = extractTopTopics(works, summary.topics, 10);

    presetPayload.authors.push({
      summary,
      works,
      top10Works,
      top10Journals,
      top10Fields,
      top10Topics,
    });

    await sleep(200);
  }

  const binaryBuffer = encode(presetPayload);
  const gzippedBuffer = zlib.gzipSync(binaryBuffer);

  for (const baseName of group.outputBaseNames) {
    const binPath = path.join(outDir, `${baseName}.bin`);
    const gzPath = path.join(outDir, `${baseName}.bin.gz`);

    fs.writeFileSync(binPath, Buffer.from(binaryBuffer));
    fs.writeFileSync(gzPath, gzippedBuffer);

    const binStats = fs.statSync(binPath);
    const gzStats = fs.statSync(gzPath);
    console.log(` -> Wrote ${binPath} (${(binStats.size / 1024).toFixed(2)} KB)`);
    console.log(` -> Wrote ${gzPath} (${(gzStats.size / 1024).toFixed(2)} KB)`);
  }
}

async function main() {
  const targetGroupArg = process.argv[2];
  const outDir = path.resolve(process.cwd(), 'public/data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const groupsToProcess = targetGroupArg
    ? PRESET_GROUPS.filter((g) => g.id === targetGroupArg)
    : PRESET_GROUPS;

  if (groupsToProcess.length === 0) {
    console.error(`Group '${targetGroupArg}' not found. Available: ${PRESET_GROUPS.map((g) => g.id).join(', ')}`);
    process.exit(1);
  }

  for (const group of groupsToProcess) {
    await processPresetGroup(group, outDir);
  }

  console.log('\nAll preset downloads completed successfully!');
}

main().catch((err) => {
  console.error('Error downloading preset data:', err);
  process.exit(1);
});
