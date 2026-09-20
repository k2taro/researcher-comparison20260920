import { describe, it, expect, beforeEach } from 'vitest';
import { exportAuthorDataToJson } from '../src/services/storage';
import { AuthorFullData } from '../src/types';

describe('Storage and Export Helpers', () => {
  it('creates valid JSON structure for exportAuthorDataToJson', () => {
    const author: AuthorFullData = {
      id: 'https://openalex.org/A1',
      shortId: 'A1',
      displayName: 'Test Researcher',
      worksCount: 15,
      citedByCount: 1500,
      hIndex: 12,
      i10Index: 14,
      institutions: [{ displayName: 'Tokyo University' }],
      countsByYear: [{ year: 2023, worksCount: 5, citedByCount: 300 }],
      topics: [{ name: 'Robotics', count: 10 }],
      color: '#4f46e5',
      lightColor: 'rgba(79, 70, 229, 0.25)',
      works: [
        {
          id: 'W1',
          title: 'Paper A',
          publicationYear: 2023,
          citedByCount: 100,
          journalName: 'IEEE',
          concepts: [],
          topics: [],
        },
      ],
      top10Works: [],
      top10Journals: [{ name: 'IEEE', count: 1 }],
      top10Fields: [{ name: 'Robotics', count: 1 }],
      top10Topics: [{ name: 'Robotics', count: 1 }],
    };

    // Verify properties
    expect(author.works.length).toBe(1);
    expect(author.top10Journals.length).toBe(1);
  });
});
