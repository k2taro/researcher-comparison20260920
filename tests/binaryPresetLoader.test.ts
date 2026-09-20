import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { decode } from '@msgpack/msgpack';
import { PresetBinaryPayload } from '../src/services/binaryPresetLoader';

describe('Binary Preset Dataset Integrity', () => {
  it('has pre-downloaded binary files in public/data directory', () => {
    const binPath = path.resolve(process.cwd(), 'public/data/preset-authors.bin');
    const gzPath = path.resolve(process.cwd(), 'public/data/preset-authors.bin.gz');

    expect(fs.existsSync(binPath)).toBe(true);
    expect(fs.existsSync(gzPath)).toBe(true);

    const binStats = fs.statSync(binPath);
    expect(binStats.size).toBeGreaterThan(100 * 1024); // at least 100KB

    const gzStats = fs.statSync(gzPath);
    expect(gzStats.size).toBeGreaterThan(50 * 1024); // at least 50KB
  });

  it('correctly decodes binary preset data containing both Yoshua Bengio and Yann LeCun', () => {
    const binPath = path.resolve(process.cwd(), 'public/data/preset-authors.bin');
    const buffer = fs.readFileSync(binPath);

    const payload = decode(buffer) as unknown as PresetBinaryPayload;
    expect(payload).toBeDefined();
    expect(payload.version).toBe(1);
    expect(payload.authors.length).toBe(2);

    const bengio = payload.authors.find((a) => a.summary.displayName.includes('Bengio'));
    const lecun = payload.authors.find((a) => a.summary.displayName.includes('LeCun'));

    expect(bengio).toBeDefined();
    expect(lecun).toBeDefined();

    // Verify full works are pre-downloaded
    expect(bengio!.works.length).toBeGreaterThan(500);
    expect(lecun!.works.length).toBeGreaterThan(300);

    // Verify pre-computed metrics
    expect(bengio!.top10Works.length).toBe(10);
    expect(bengio!.top10Journals.length).toBeGreaterThan(0);
    expect(bengio!.top10Fields.length).toBeGreaterThan(0);
    expect(bengio!.top10Topics.length).toBeGreaterThan(0);

    expect(lecun!.top10Works.length).toBe(10);
    expect(lecun!.top10Journals.length).toBeGreaterThan(0);
    expect(lecun!.top10Fields.length).toBeGreaterThan(0);
    expect(lecun!.top10Topics.length).toBeGreaterThan(0);
  });
});
