import fs from 'node:fs/promises';
import path from 'node:path';
import { UPLOAD_ROOT } from './storage';
import type { ModuleDef } from './modules';

/** Where the old Laravel app kept uploads (copy laravel/public/uploads here, or point the env var at it). */
export const LEGACY_ROOT = path.resolve(process.env.LEGACY_UPLOAD_DIR || './storage/legacy-uploads');

// folder templates used by the legacy controllers for columns that store only a file name
const LEGACY_FOLDERS: Record<string, Record<string, string[]>> = {
  profiles: { resumeName: ['candidate_resumes/{pID}'], passportFileName: ['candidate_resumes/{pID}'], visaFileName: ['candidate_resumes/{pID}'], utilityBillFileName: ['candidate_resumes/{pID}'], drivingLicenceFileName: ['candidate_resumes/{pID}'], rtwFileName: ['candidate_resumes/{pID}'], greencardFileName: ['candidate_resumes/{pID}'], maskcvmanualFileName: ['candidate_resumes/{pID}', 'maskCV'] },
  'cv-versions': { cvName: ['candidate_resumes/{pID}'] },
  'client-documents': { documentFile: ['client_document', 'client_document/{clientID}'] },
  'crm-prospect-documents': { documentFile: ['prospect_document', 'prospect_document/{prospectID}'] },
  'submission-comments': { attachment: ['comments', 'submission-comments', 'requirementcomment-attachments'] },
  'feedback-tracker': { attachment: ['comments', 'submission-comments'] },
  'requirement-comments': { attachment: ['requirementcomment-attachments'] },
  'pscare-comments': { uploadedDoc: ['psCareComments/{consultantId}'] },
  'approach-candidates': { attachment: ['approach-candidate', 'approach_candidate'] },
  'crm-prospects': { clientLogo: ['prospect'], attachmentFile: ['prospect_document'] },
  clients: { clientLogo: ['clientLogo', 'client_logo', 'logo'] },
  'linkedin-tracking': { attachment: ['linkedin', 'linkedin-tracking'] },
};

const fill = (tpl: string, row: any) => tpl.replace(/\{(\w+)\}/g, (_, k) => String(row[k] ?? ''));
const strip = (p: string) => p.replace(/^\/+/, '').replace(/^public\//, '').replace(/^uploads\//, '');

export async function resolveRecordFile(m: ModuleDef, row: any, col: string): Promise<string | null> {
  const v = String(row[col] ?? '').trim();
  if (!v) return null;
  const rels: string[] = [];
  if (v.includes('/')) rels.push(strip(v));
  const NAME_COLS = ['documentTitle', 'fileName', 'uploadedDoc', 'documentName', 'docFileName', 'signedContractFileName'];
  for (const folderCol of ['filePath', 'destinationPath', 'signedContractPath']) {
    if (!row[folderCol]) continue;
    const folder = strip(String(row[folderCol]));
    if (folderCol !== col) rels.push(path.posix.join(folder, path.basename(v)));
    else for (const n of NAME_COLS) if (row[n]) rels.push(path.posix.join(folder, path.basename(String(row[n]))));
  }
  for (const tpl of LEGACY_FOLDERS[m.key]?.[col] || []) rels.push(path.posix.join(fill(tpl, row), path.basename(v)));
  rels.push(path.posix.join(m.key, path.basename(v)), path.basename(v));
  for (const root of [UPLOAD_ROOT, LEGACY_ROOT]) {
    for (const rel of rels) {
      const full = path.resolve(root, rel);
      if (!full.startsWith(root)) continue;
      try { const st = await fs.stat(full); if (st.isFile()) return full; } catch { /* try next */ }
    }
  }
  return null;
}
