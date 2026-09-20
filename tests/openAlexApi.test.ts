import { describe, it, expect } from 'vitest';
import {
  extractShortId,
  extractTopJournals,
  extractTopFields,
  extractTopTopics,
  buildAnnualTrendData,
} from '../src/services/openAlexApi';
import { WorkItem, AuthorFullData } from '../src/types';

describe('OpenAlex API Helpers', () => {
  it('extractShortId extracts author short id from URL or ID string', () => {
    expect(extractShortId('https://openalex.org/A5023880860')).toBe('A5023880860');
    expect(extractShortId('A5023880860')).toBe('A5023880860');
    expect(extractShortId('')).toBe('');
  });

  it('extractTopJournals aggregates and sorts journals by frequency', () => {
    const mockWorks: WorkItem[] = [
      {
        id: '1',
        title: 'Paper 1',
        publicationYear: 2020,
        citedByCount: 100,
        journalName: 'Nature',
        concepts: [],
        topics: [],
      },
      {
        id: '2',
        title: 'Paper 2',
        publicationYear: 2021,
        citedByCount: 80,
        journalName: 'Science',
        concepts: [],
        topics: [],
      },
      {
        id: '3',
        title: 'Paper 3',
        publicationYear: 2022,
        citedByCount: 50,
        journalName: 'Nature',
        concepts: [],
        topics: [],
      },
    ];

    const result = extractTopJournals(mockWorks, 10);
    expect(result.length).toBe(2);
    expect(result[0]).toEqual({ name: 'Nature', count: 2 });
    expect(result[1]).toEqual({ name: 'Science', count: 1 });
  });

  it('extractTopFields aggregates topics and concepts correctly', () => {
    const mockWorks: WorkItem[] = [
      {
        id: '1',
        title: 'AI Paper',
        publicationYear: 2020,
        citedByCount: 100,
        journalName: 'Nature',
        concepts: [],
        topics: [{ name: 'Deep Learning', field: 'Computer Science' }],
      },
      {
        id: '2',
        title: 'ML Paper',
        publicationYear: 2021,
        citedByCount: 80,
        journalName: 'Science',
        concepts: [],
        topics: [{ name: 'Neural Networks', field: 'Computer Science' }],
      },
      {
        id: '3',
        title: 'Biology Paper',
        publicationYear: 2022,
        citedByCount: 50,
        journalName: 'Cell',
        concepts: [],
        topics: [{ name: 'Genetics', field: 'Biology' }],
      },
    ];

    const result = extractTopFields(mockWorks, 10);
    expect(result.length).toBe(2);
    expect(result[0]).toEqual({ name: 'Computer Science', count: 2 });
    expect(result[1]).toEqual({ name: 'Biology', count: 1 });
  });

  it('extractTopTopics aggregates topics with subfield/field correctly', () => {
    const mockWorks: WorkItem[] = [
      {
        id: '1',
        title: 'Deep Learning Paper',
        publicationYear: 2020,
        citedByCount: 100,
        journalName: 'Nature',
        concepts: [],
        topics: [
          { name: 'Deep Learning', subfield: 'Artificial Intelligence', field: 'Computer Science' },
        ],
      },
      {
        id: '2',
        title: 'CNN Paper',
        publicationYear: 2021,
        citedByCount: 80,
        journalName: 'Science',
        concepts: [],
        topics: [
          { name: 'Deep Learning', subfield: 'Artificial Intelligence', field: 'Computer Science' },
          { name: 'Computer Vision', subfield: 'Computer Vision', field: 'Computer Science' },
        ],
      },
    ];

    const result = extractTopTopics(mockWorks, undefined, 10);
    expect(result.length).toBe(2);
    expect(result[0].name).toBe('Deep Learning');
    expect(result[0].count).toBe(2);
    expect(result[1].name).toBe('Computer Vision');
    expect(result[1].count).toBe(1);
  });

  it('buildAnnualTrendData formats yearly data for Recharts line chart', () => {
    const mockAuthors: AuthorFullData[] = [
      {
        id: 'https://openalex.org/A1',
        shortId: 'A1',
        displayName: 'Author One',
        worksCount: 100,
        citedByCount: 5000,
        hIndex: 30,
        i10Index: 50,
        institutions: [],
        countsByYear: [
          { year: 2020, worksCount: 10, citedByCount: 500 },
          { year: 2021, worksCount: 15, citedByCount: 800 },
        ],
        topics: [],
        color: '#4f46e5',
        lightColor: 'rgba(79, 70, 229, 0.25)',
        works: [],
        top10Works: [],
        top10Journals: [],
        top10Fields: [],
        top10Topics: [],
      },
      {
        id: 'https://openalex.org/A2',
        shortId: 'A2',
        displayName: 'Author Two',
        worksCount: 80,
        citedByCount: 4000,
        hIndex: 25,
        i10Index: 40,
        institutions: [],
        countsByYear: [
          { year: 2020, worksCount: 8, citedByCount: 400 },
          { year: 2021, worksCount: 12, citedByCount: 600 },
        ],
        topics: [],
        color: '#059669',
        lightColor: 'rgba(5, 150, 105, 0.25)',
        works: [],
        top10Works: [],
        top10Journals: [],
        top10Fields: [],
        top10Topics: [],
      },
    ];

    const trends = buildAnnualTrendData(mockAuthors, 'worksCount');
    expect(trends.length).toBeGreaterThan(0);

    const year2020 = trends.find((t) => t.year === 2020);
    expect(year2020).toBeDefined();
    expect(year2020?.['A1']).toBe(10);
    expect(year2020?.['A2']).toBe(8);
  });
});
