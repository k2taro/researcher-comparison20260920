import { describe, it, expect } from 'vitest';
import { filterAuthorDataByYearRange } from '../src/utils/periodFilter';
import { AuthorFullData, WorkItem } from '../src/types';

describe('Period Filter and Metrics Calculation', () => {
  const dummyWorks: WorkItem[] = [
    {
      id: 'W1',
      title: 'Work 2015',
      publicationYear: 2015,
      citedByCount: 100,
      journalName: 'Nature',
      concepts: [],
      topics: [{ name: 'Deep Learning', field: 'Computer Science' }],
    },
    {
      id: 'W2',
      title: 'Work 2018 A',
      publicationYear: 2018,
      citedByCount: 50,
      journalName: 'NeurIPS',
      concepts: [],
      topics: [{ name: 'Deep Learning', field: 'Computer Science' }],
    },
    {
      id: 'W3',
      title: 'Work 2018 B',
      publicationYear: 2018,
      citedByCount: 20,
      journalName: 'ICML',
      concepts: [],
      topics: [{ name: 'Reinforcement Learning', field: 'Computer Science' }],
    },
    {
      id: 'W4',
      title: 'Work 2021',
      publicationYear: 2021,
      citedByCount: 15,
      journalName: 'ICLR',
      concepts: [],
      topics: [{ name: 'Transformers', field: 'Computer Science' }],
    },
    {
      id: 'W5',
      title: 'Work 2024',
      publicationYear: 2024,
      citedByCount: 5,
      journalName: 'NeurIPS',
      concepts: [],
      topics: [{ name: 'Generative AI', field: 'Computer Science' }],
    },
  ];

  const dummyAuthor: AuthorFullData = {
    id: 'https://openalex.org/A123',
    shortId: 'A123',
    displayName: 'Test Researcher',
    worksCount: 5,
    citedByCount: 190,
    hIndex: 4,
    i10Index: 4,
    institutions: [{ displayName: 'Test Lab' }],
    countsByYear: [],
    topics: [],
    color: '#4f46e5',
    lightColor: 'rgba(79, 70, 229, 0.1)',
    works: dummyWorks,
    top10Works: [],
    top10Journals: [],
    top10Fields: [],
    top10Topics: [],
  };

  it('filters works strictly to 2016 - 2025 and calculates accurate metrics', () => {
    const filtered = filterAuthorDataByYearRange(dummyAuthor, 2016, 2025);

    // Should include 2018 A (50), 2018 B (20), 2021 (15), 2024 (5) -> 4 works
    expect(filtered.worksCount).toBe(4);
    expect(filtered.works.length).toBe(4);

    // Citations = 50 + 20 + 15 + 5 = 90
    expect(filtered.citedByCount).toBe(90);

    // Citations sorted: [50, 20, 15, 5]
    // 1st: 50 >= 1 (yes)
    // 2nd: 20 >= 2 (yes)
    // 3rd: 15 >= 3 (yes)
    // 4th: 5 >= 4 (yes)
    // h-index should be 4
    expect(filtered.hIndex).toBe(4);

    // i10-index: works with >= 10 citations (50, 20, 15) -> 3
    expect(filtered.i10Index).toBe(3);

    // Check year range in countsByYear
    expect(filtered.countsByYear.length).toBe(10); // 2016 to 2025 inclusive
    const y2018 = filtered.countsByYear.find((c) => c.year === 2018);
    expect(y2018?.worksCount).toBe(2);
    expect(y2018?.citedByCount).toBe(70);

    const y2016 = filtered.countsByYear.find((c) => c.year === 2016);
    expect(y2016?.worksCount).toBe(0);
    expect(y2016?.citedByCount).toBe(0);
  });

  it('filters to a narrower window, e.g. 2020 - 2022', () => {
    const filtered = filterAuthorDataByYearRange(dummyAuthor, 2020, 2022);

    // Only 2021 work (cited 15)
    expect(filtered.worksCount).toBe(1);
    expect(filtered.citedByCount).toBe(15);
    expect(filtered.hIndex).toBe(1);
    expect(filtered.i10Index).toBe(1);
  });
});
