import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fullTextPrefix, searchPattern, searchTerms } from '../lib/search';

test('search keeps all words and treats wildcard characters literally', () => {
  assert.deepEqual(searchTerms('  one two three four five six seven  '), ['one','two','three','four','five','six','seven']);
  assert.equal(searchPattern('100%_match!'), '%100!%!_match!!%');
  assert.equal(searchPattern("O'Brien"), "%O'Brien%");
  assert.deepEqual(searchTerms('  '), []);
  assert.equal(fullTextPrefix('Azure'), 'Azure*');
  assert.equal(fullTextPrefix('+Azure'), null);
});

test('CV resolution handles local, legacy and cloud files without crossing profile paths', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlis-files-'));
  process.env.UPLOAD_DIR = path.join(root, 'uploads');
  process.env.LEGACY_UPLOAD_DIR = path.join(root, 'legacy');
  delete process.env.LEGACY_CV_S3_BUCKET;
  const { resolveRecordFile } = await import('../lib/files');
  const { legacyCvKey } = await import('../lib/legacy-cv');
  const { getModule } = await import('../lib/modules');
  const m = getModule('profiles');
  const folder = path.join(root, 'legacy/candidate_resumes/42');
  try {
    await fs.mkdir(folder, { recursive: true });
    const file = path.join(folder, 'Resume.pdf');
    await fs.writeFile(file, '%PDF-1.4');
    assert.equal(await resolveRecordFile(m, { pID:42, resumeName:'Resume.pdf' }, 'resumeName'), file);
    assert.equal(await resolveRecordFile(m, { pID:42, resumeName:'uploads\\candidate_resumes\\42\\Resume.pdf' }, 'resumeName'), file);
    assert.equal(await resolveRecordFile(m, { pID:42, resumeName:'NULL' }, 'resumeName'), null);
    assert.equal(await resolveRecordFile(m, { pID:42, resumeName:'../Resume.pdf' }, 'resumeName'), null);
    assert.equal(legacyCvKey('profiles',{pID:42,resumeName:'candidate_resumes/42/Resume.pdf'},'resumeName'),'42/Resume.pdf');
    assert.equal(legacyCvKey('profiles',{pID:42,passportFileName:'passport.pdf'},'passportFileName'),null);
    assert.equal(legacyCvKey('cv-versions',{pID:42,cvName:'Resume.pdf'},'cvName'),'42/Resume.pdf');
    process.env.LEGACY_CV_BACKUP_DIR = path.join(root, 's3-backup');
    await fs.mkdir(path.join(process.env.LEGACY_CV_BACKUP_DIR, '44'), { recursive: true });
    const backupFile = path.join(process.env.LEGACY_CV_BACKUP_DIR, '44', 'Original.pdf');
    await fs.writeFile(backupFile, '%PDF-backup');
    assert.equal(await resolveRecordFile(m, {pID:44,resumeName:'Original.pdf'}, 'resumeName'), backupFile);
    assert.equal(await resolveRecordFile(getModule('cv-versions'), {pID:44,cvName:'Original.pdf'}, 'cvName'), backupFile);
    const { S3Client } = await import('@aws-sdk/client-s3');
    const original = S3Client.prototype.send;
    let reads = 0;
    process.env.LEGACY_CV_S3_BUCKET = 'test-bucket';
    S3Client.prototype.send = (async (command: any) => {
      reads++; assert.equal(command.input.Key,'43/Cloud.pdf');
      return { Body: { transformToByteArray: async () => Buffer.from('%PDF-cloud') } };
    }) as any;
    try {
      const row = {pID:43,resumeName:'Cloud.pdf'};
      const resolved = await resolveRecordFile(m,row,'resumeName');
      assert.ok(resolved);
      assert.equal(await fs.readFile(resolved!,'utf8'),'%PDF-cloud');
      assert.equal(await resolveRecordFile(m,row,'resumeName'),resolved);
      assert.equal(reads,1);
    } finally { S3Client.prototype.send = original; }
  } finally { await fs.rm(root,{recursive:true,force:true}); }
});
