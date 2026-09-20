import { describe, it, expect } from 'vitest';
import { SAMPLE_PRESETS } from '../src/data/sampleAuthors';
import { extractTopJournals, extractTopFields } from '../src/services/openAlexApi';

describe('Sample Presets Integrity', () => {
  it('contains valid curated presets with at least 2 authors each', () => {
    expect(SAMPLE_PRESETS.length).toBeGreaterThanOrEqual(2);

    for (const preset of SAMPLE_PRESETS) {
      expect(preset.id).toBeDefined();
      expect(preset.name).toBeDefined();
      expect(preset.authors.length).toBeGreaterThanOrEqual(2);

      for (const author of preset.authors) {
        expect(author.summary.displayName).toBeDefined();
        expect(author.summary.worksCount).toBeGreaterThan(0);
        expect(author.summary.citedByCount).toBeGreaterThan(0);
        expect(author.summary.hIndex).toBeGreaterThan(0);
        expect(author.works.length).toBeGreaterThan(0);

        // Verify journals and fields can be extracted
        const journals = extractTopJournals(author.works, 5);
        expect(journals.length).toBeGreaterThan(0);

        const fields = extractTopFields(author.works, 5);
        expect(fields.length).toBeGreaterThan(0);
      }
    }
  });
});
