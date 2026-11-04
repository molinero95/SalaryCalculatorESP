// Reviewed historical proposal copies, never a substitute for current enacted law.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export const sourceArchivesPath = new URL('../data/source-archives.json', import.meta.url);

export async function inspectArchive(proposal, archive, read = readFile) {
  try {
    if (
      proposal.sourceType !== 'official' ||
      archive.url !== proposal.url ||
      !/^\d{4}-\d{2}(-\d{2})?$/.test(proposal.date) ||
      Number(proposal.date.slice(0, 4)) >= Number(archive.reviewedAt?.slice(0, 4)) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(archive.reviewedAt) ||
      !/^[a-z0-9-]+\.pdf$/.test(archive.file) ||
      !/^[a-f0-9]{64}$/.test(archive.sha256) ||
      typeof archive.evidence !== 'string' ||
      archive.evidence.trim().length < 8
    )
      throw new Error('Invalid historical source archive');
    const bytes = await read(new URL(`../data/source-archives/${archive.file}`, import.meta.url));
    if (bytes.length > 20 * 1024 * 1024 || bytes.subarray(0, 5).toString() !== '%PDF-')
      throw new Error('Invalid archived PDF');
    if (createHash('sha256').update(bytes).digest('hex') !== archive.sha256)
      throw new Error('Archived PDF fingerprint mismatch');
    return {
      url: proposal.url,
      contentType: 'application/pdf',
      bytes: bytes.length,
      sha256: archive.sha256,
      archive: { file: archive.file, reviewedAt: archive.reviewedAt, evidence: archive.evidence },
    };
  } catch (error) {
    return { url: proposal.url, error: error.message };
  }
}
