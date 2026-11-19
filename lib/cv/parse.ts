/**
 * atlis.cloud CV parser — rule-based, deterministic, runs entirely on your server.
 * Input: plain text (from extract.ts). Output: structured candidate data with per-field confidence.
 */
import { findPhoneNumbersInText, type CountryCode } from 'libphonenumber-js/max';
import {
  SKILL_ALIASES, AMBIGUOUS_SKILLS, SECTION_HEADINGS, LANGUAGES, CITIES, COUNTRIES, UK_POSTCODE, DEGREE_PATTERNS, INSTITUTION,
  COMPANY_SUFFIX, TITLE_WORDS, NAME_STOPWORDS,
} from './dictionary';

export type WorkEntry = { title: string; company: string; location: string; startDate: string | null; endDate: string | null; current: boolean; months: number; description: string };
export type EducationEntry = { degree: string; field: string; institution: string; year: string; grade: string; raw: string };
export type ParsedCV = {
  name: string; firstName: string; lastName: string;
  emails: string[]; phoneNumbers: string[]; phones: { e164: string; national: string; country: string; callingCode: string }[];
  country_code: string;
  location: { formatted: string; city: string; state: string; country: string; countryCode: string; postcode: string };
  linkedin: string; github: string; websites: string[];
  designation: string; currentCompany: string;
  totalYearsExperience: number | null; statedYearsExperience: number | null;
  workExperience: WorkEntry[]; education: EducationEntry[];
  skills: string[]; certifications: string[]; languages: string[];
  summary: string; dob: string; gender: string; nationality: string; noticePeriod: string; maritalStatus: string; workAuthorisation: string;
  sections: Record<string, string>;
  confidence: Record<string, number> & { overall: number };
  warnings: string[];
  full_text: string;
};
export type Dictionaries = { skills?: string[]; designations?: string[]; cities?: Record<string, [string, string]>; countries?: Record<string, string> };

// ---------------------------------------------------------------- helpers
const MONTHS: Record<string, number> = { jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12 };
const MONTH_RE = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const PRESENT_RE = '(?:present|current(?:ly)?|till\\s+(?:date|now)|to\\s+date|until\\s+now|now|ongoing|today|date|continuing)';
const POINT_RE = `(?:${MONTH_RE}\\.?[\\s,'’\`-]*(?:\\d{4}|\\d{2})|\\d{1,2}[/.-]\\d{1,2}[/.-](?:\\d{4}|\\d{2})|\\d{1,2}[/.-]\\d{4}|\\d{4}[/.-]\\d{1,2}|(?:19|20)\\d{2})`;
const RANGE_RE = new RegExp(`(?<![\\d/])(?:(?:from|since)\\s+)?(${POINT_RE})\\s*(?:-|–|—|−|~|→|to|till|until|upto|up\\s+to|\\bthru\\b)\\s*(${POINT_RE}|${PRESENT_RE})(?![\\d/])`, 'gi');
const SINCE_RE = new RegExp(`\\b(?:since|from)\\s+(${POINT_RE})(?![\\d/])`, 'gi');

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s'-])([a-z])/g, (_, a, b) => a + b.toUpperCase()).replace(/\b(Mc)([a-z])/g, (_, a, b) => a + b.toUpperCase());
const clean = (s: string) => s.replace(/\s+/g, ' ').replace(/^[\s•\-–—:|,*>]+|[\s•\-–—:|,*]+$/g, '').replace(/^\(\s*([^()]*?)\s*\)$/, '$1').trim();
const uniq = <T,>(a: T[]) => [...new Set(a)];
const uniqCI = (a: string[]) => { const seen = new Set<string>(); return a.filter((x) => { const k = x.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }); };

export function normaliseText(raw: string): string {
  let t = raw.normalize('NFKC')
    .replace(/[\u200b-\u200f\u2060\ufeff]/g, '')
    .replace(/\u00a0|\u2007|\u202f/g, ' ')
    .replace(/[\u2022\u25cf\u25aa\u25a0\u25e6\u25cb\u25ba\u2713\u2714\u27a2\u2756\u00b7\u2043\u2219\uf0b7\uf0a7\uf0d8\uf076\uf0fc\u25b8\u25b6\u2023\u279c\u27a4]/g, '•')
    .replace(/\r\n?/g, '\n').replace(/\t/g, '   ');
  // collapse letter-spaced headings: "E X P E R I E N C E"
  t = t.replace(/^((?:[A-Z] ){3,}[A-Z])\s*$/gm, (m) => m.replace(/ /g, ''));
  // join emails broken across spaces by some PDF generators
  t = t.replace(/([A-Za-z0-9._%+-])\s+@\s*([A-Za-z0-9-]+\.)/g, '$1@$2').replace(/([A-Za-z0-9._%+-])@\s+([A-Za-z0-9-]+\.)/g, '$1@$2');
  return t.split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\n{3,}/g, '\n\n');
}

function parsePoint(s: string, isEnd: boolean): { y: number; m: number } | null {
  const v = s.trim().toLowerCase().replace(/[’'`]/g, ' ');
  const nowY = new Date().getFullYear();
  const yy = (n: number) => (n < 100 ? (n <= (nowY % 100) + 1 ? 2000 + n : 1900 + n) : n);
  let m: RegExpMatchArray | null;
  if ((m = v.match(new RegExp(`^(${MONTH_RE})\\.?[\\s,-]*(\\d{4}|\\d{2})$`)))) return { y: yy(+m[2]), m: MONTHS[m[1].slice(0, 3)] || MONTHS[m[1]] };
  if ((m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})$/))) { const a = +m[1], b = +m[2]; return { y: yy(+m[3]), m: b <= 12 ? b : a <= 12 ? a : 1 }; }
  if ((m = v.match(/^(\d{1,2})[/.-](\d{4})$/))) return +m[1] >= 1 && +m[1] <= 12 ? { y: +m[2], m: +m[1] } : null;
  if ((m = v.match(/^(\d{4})[/.-](\d{1,2})$/))) return +m[2] >= 1 && +m[2] <= 12 ? { y: +m[1], m: +m[2] } : null;
  if ((m = v.match(/^((?:19|20)\d{2})$/))) return { y: +m[1], m: isEnd ? 12 : 1 };
  return null;
}
const isPresent = (s: string) => new RegExp(`^${PRESENT_RE}$`, 'i').test(s.trim());
const monthIndex = (p: { y: number; m: number }) => p.y * 12 + (p.m - 1);
const fmt = (p: { y: number; m: number }) => `${p.y}-${String(p.m).padStart(2, '0')}`;

type Range = { start: { y: number; m: number }; end: { y: number; m: number }; current: boolean; text: string; index: number };
function findRanges(line: string): Range[] {
  const out: Range[] = [];
  const now = new Date();
  const nowP = { y: now.getFullYear(), m: now.getMonth() + 1 };
  RANGE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RANGE_RE.exec(line))) {
    const s = parsePoint(m[1], false);
    const cur = isPresent(m[2]);
    const e = cur ? nowP : parsePoint(m[2], true);
    if (!s || !e) continue;
    if (s.y < 1960 || e.y > nowP.y + 1 || monthIndex(e) < monthIndex(s) || e.y - s.y > 50) continue;
    out.push({ start: s, end: monthIndex(e) > monthIndex(nowP) ? nowP : e, current: cur, text: m[0], index: m.index });
  }
  if (!out.length) {
    SINCE_RE.lastIndex = 0;
    while ((m = SINCE_RE.exec(line))) {
      const s = parsePoint(m[1], false);
      if (s && s.y >= 1960 && monthIndex(s) <= monthIndex(nowP)) out.push({ start: s, end: nowP, current: true, text: m[0], index: m.index });
    }
  }
  return out;
}

// ---------------------------------------------------------------- sections
const HEADING_INDEX: [string, string][] = Object.entries(SECTION_HEADINGS).flatMap(([k, arr]) => arr.map((h) => [h, k] as [string, string]));
function headingOf(line: string): { key: string; rest: string } | null {
  const raw = line.trim();
  if (!raw || raw.length > 60) return null;
  const m = raw.match(/^[•#*\-\s]*([A-Za-z&/ ,'-]{3,45}?)\s*(?::|-|–)\s*(.*)$/);
  const candidates: [string, string][] = [[raw, '']];
  if (m) candidates.push([m[1], m[2]]);
  for (const [head, rest] of candidates) {
    const norm = head.toLowerCase().replace(/[^a-z&/ ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!norm || norm.split(' ').length > 6) continue;
    for (const [h, k] of HEADING_INDEX) if (norm === h) return { key: k, rest };
  }
  return null;
}
type Section = { key: string; start: number; end: number; lines: string[] };
function splitSections(lines: string[]): Section[] {
  const out: Section[] = [{ key: 'header', start: 0, end: 0, lines: [] }];
  lines.forEach((l, i) => {
    const h = headingOf(l);
    // headings are usually short and either Title/UPPER case, or followed by content
    if (h && (h.rest || l.trim() === l.trim().toUpperCase() || /^[A-Z]/.test(l.trim()) || l.trim().endsWith(':'))) {
      out[out.length - 1].end = i;
      out.push({ key: h.key, start: i, end: lines.length, lines: h.rest ? [h.rest] : [] });
    } else out[out.length - 1].lines.push(l);
  });
  out[out.length - 1].end = lines.length;
  return out;
}

// ---------------------------------------------------------------- skills
type SkillMatcher = { canonical: string; re: RegExp; ambiguous: boolean; itemOnly?: boolean };
let builtinMatchers: SkillMatcher[] | null = null;
const COMMON_WORDS = new Set(['design', 'testing', 'management', 'sales', 'marketing', 'support', 'development', 'analysis', 'planning', 'training', 'operations', 'research', 'reporting', 'security', 'networking', 'communication', 'leadership', 'strategy', 'finance', 'administration', 'documentation', 'coordination', 'writing', 'teaching', 'cloud', 'mobile', 'web', 'data', 'database', 'server', 'windows', 'office', 'word', 'access', 'project', 'service', 'services', 'process', 'quality', 'teamwork', 'go', 'r', 'c', 'v', 'swift', 'spring', 'rust', 'dart', 'oracle', 'express', 'unity', 'crm', 'erp', 'it', 'hr', 'ai', 'ml', 'ui', 'ux']);
function makeRe(alias: string) {
  return new RegExp(`(?<![A-Za-z0-9+#])${esc(alias).replace(/\\ /g, '[\\s-]+')}(?![A-Za-z0-9+#]|[./][A-Za-z0-9])`, 'i');
}
function buildMatchers(extra: string[] = []): SkillMatcher[] {
  if (!builtinMatchers) {
    builtinMatchers = [];
    for (const [canon, aliases] of Object.entries(SKILL_ALIASES)) {
      const all = uniq([canon, ...aliases]).filter((a) => a.length >= 1);
      for (const a of all) builtinMatchers.push({ canonical: canon, re: makeRe(a), ambiguous: AMBIGUOUS_SKILLS.has(canon) || a.length <= 2 || COMMON_WORDS.has(a.toLowerCase()) });
    }
  }
  const known = new Set(Object.entries(SKILL_ALIASES).flatMap(([c, a]) => [c, ...a]).map((x) => x.toLowerCase()));
  const dbm: SkillMatcher[] = [];
  for (const s of extra) {
    const v = s.trim();
    if (v.length < 2 || v.length > 40 || /^\d+$/.test(v) || known.has(v.toLowerCase()) || /[(){}\[\]]/.test(v)) continue;
    if (/\b(developer|engineer|manager|consultant|analyst|architect|executive|specialist|officer|lead|intern|trainee|recruiter|administrator|tester)s?$/i.test(v)) continue; // job titles, not skills
    known.add(v.toLowerCase());
    const plainWord = /^[A-Z]?[a-z]+$/.test(v);
    dbm.push({ canonical: v, re: makeRe(v), ambiguous: v.length <= 3 || COMMON_WORDS.has(v.toLowerCase()) || plainWord, itemOnly: plainWord } as any);
  }
  return [...builtinMatchers, ...dbm];
}

function extractSkills(text: string, skillText: string, extra: string[]): string[] {
  const matchers = buildMatchers(extra);
  const score = new Map<string, number>();
  const skillItems = skillText.split(/[,;|•\n]|\s\/\s|\s{3,}|\s+-\s+|\band\b/).map((x) => clean(x.replace(/^[^:]{2,40}:\s*/, ''))).filter((x) => x.length >= 1 && x.length <= 40);
  const itemSet = new Set(skillItems.map((x) => x.toLowerCase()));
  const strict = matchers.filter((x) => !x.ambiguous && x.canonical.length > 2).slice(0, 600);
  for (const mt of matchers) {
    const inSkills = mt.re.test(skillText);
    const inText = inSkills || mt.re.test(text);
    if (!inText) continue;
    if (mt.ambiguous) {
      // ambiguous names (C, R, Go, Spring, Sales …) count when listed in a skills section,
      // or when they sit on a line together with an unambiguous technical skill
      if (mt.canonical.length <= 2 || mt.itemOnly) { if (!inSkills || !itemSet.has(mt.canonical.toLowerCase())) continue; }
      else if (!inSkills) {
        const line = text.split('\n').find((l) => mt.re.test(l));
        if (!line || !strict.some((o) => o !== mt && o.re.test(line))) continue;
      }
    }
    const prev = score.get(mt.canonical) || 0;
    score.set(mt.canonical, Math.max(prev, inSkills ? 3 : 1) + (prev ? 0.5 : 0));
  }
  // unknown but clearly listed skills in the skills section
  const extras: string[] = [];
  for (const it of skillItems) {
    if (it.length < 2 || it.split(/\s+/).length > 4 || /[.!?]$/.test(it) || /^\d/.test(it) || /^[a-z]+$/.test(it) || /\b(years?|experience|proficient|knowledge|good|excellent|basic|strong|working|familiar|understanding|ability)\b/i.test(it)) continue;
    const low = it.toLowerCase();
    const covered = [...score.keys()].some((k) => k.toLowerCase() === low || (SKILL_ALIASES[k] || []).some((a) => a.toLowerCase() === low) || k.toLowerCase().endsWith(' ' + low));
    if (!covered) extras.push(it);
  }
  const ranked = [...score.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  return uniqCI([...ranked, ...extras.slice(0, 25)]).slice(0, 80);
}

// ---------------------------------------------------------------- contact
const EMAIL_RE = /[A-Za-z0-9][A-Za-z0-9._%+-]*@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,24}/g;
function extractEmails(text: string) {
  const t = text.replace(/\s*\[\s*at\s*\]\s*|\s+\(at\)\s+/gi, '@').replace(/\s*\[\s*dot\s*\]\s*/gi, '.');
  return uniq((t.match(EMAIL_RE) || []).map((e) => e.replace(/^mailto:/i, '').replace(/\.$/, '').toLowerCase()))
    .filter((e) => !/\.(png|jpg|jpeg|gif)$/.test(e) && !/example\.com$/.test(e));
}
function extractPhones(text: string, countries: string[]) {
  const out = new Map<string, { e164: string; national: string; country: string; callingCode: string }>();
  const possible: any[] = [];
  // remove date ranges so they are never mistaken for phone numbers
  const t = text.replace(RANGE_RE, ' ').replace(/\b(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}\b/g, ' ')
    .replace(/(\+\d[\d ().-]{3,14}\d)[ \t]*\n[ \t]*(\d[\d -]{3,12}\d)(?!\d)/g, '$1 $2');
  for (const c of uniq([...countries, 'GB', 'IN', 'US'])) {
    try {
      for (const f of findPhoneNumbersInText(t, { defaultCountry: c as CountryCode, leniency: 'POSSIBLE' } as any)) {
        const n = f.number;
        if (!n.isValid()) { if (n.isPossible() && /\+/.test(f.number.number)) possible.push(n); continue; }
        if (out.has(n.number)) continue;
        out.set(n.number, { e164: n.number, national: n.formatNational(), country: n.country || '', callingCode: '+' + n.countryCallingCode });
      }
    } catch { /* ignore */ }
    if (out.size) break;
  }
  if (!out.size) {
    // numbers that are well-formed but outside known allocated ranges (new ranges, test numbers)
    for (const n of possible) if (!out.has(n.number) && String(n.nationalNumber).length >= 8)
      out.set(n.number, { e164: n.number, national: n.formatNational(), country: n.country || '', callingCode: '+' + n.countryCallingCode });
  }
  return [...out.values()].slice(0, 4);
}
function extractLinks(text: string) {
  const urls = uniq((text.match(/(?:https?:\/\/|www\.)[^\s,;()<>"']+|(?:[a-z0-9-]+\.)?(?:linkedin\.com|github\.com|gitlab\.com|behance\.net|dribbble\.com|stackoverflow\.com)\/[^\s,;()<>"']+/gi) || []).map((u) => u.replace(/[.)\]]+$/, '')));
  const linkedin = urls.find((u) => /linkedin\.com\/(in|pub)\//i.test(u)) || '';
  const github = urls.find((u) => /github\.com\/[^/]+/i.test(u) && !/github\.com\/(features|about)/i.test(u)) || '';
  const websites = urls.filter((u) => u !== linkedin && u !== github && !/linkedin\.com|mailto:/i.test(u));
  const norm = (u: string) => (u && !/^https?:/i.test(u) ? 'https://' + u : u);
  return { linkedin: norm(linkedin), github: norm(github), websites: websites.map(norm).slice(0, 5) };
}

// ---------------------------------------------------------------- name
function nameScore(line: string, emails: string[], designations: Set<string>, cities: Record<string, any>) {
  let s = clean(line.replace(/^(name|candidate name|full name)\s*[:\-]\s*/i, '').replace(/^(?:curriculum\s+vitae|résumé|resume|cv|bio[- ]?data|profile)\s*(?:of|for|[:\-–—|])\s*/i, ''));
  s = s.replace(/\s*[|,]\s*.*$/, '').replace(/\s{3,}.*$/, '').trim();
  if (!s || s.length < 3 || s.length > 45) return { s, score: -1 };
  if (/[@\d:/\\]|www\.|http/i.test(s)) return { s, score: -1 };
  if (NAME_STOPWORDS.test(s)) return { s, score: -1 };
  const words = s.split(/\s+/);
  if (words.length < 2 || words.length > 5) return { s, score: words.length === 1 && s.length > 2 ? 0.5 : -1 };
  if (!words.every((w) => /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ.'’-]*$/.test(w))) return { s, score: -1 };
  if (designations.has(s.toLowerCase()) || TITLE_WORDS.test(s) || COMPANY_SUFFIX.test(s)) return { s, score: -1 };
  if (cities[titleCase(s)] || COUNTRIES[s]) return { s, score: -1 };
  if (words.some((w) => COUNTRIES[w] || COUNTRIES[titleCase(w)] || cities[titleCase(w)])) return { s, score: -1 };
  let score = 2;
  if (words.every((w) => /^[A-Z]/.test(w))) score += 1.5;
  if (s === s.toUpperCase()) score += 0.5;
  if (words.length <= 3) score += 0.5;
  const locals = emails.map((e) => e.split('@')[0].toLowerCase().replace(/[^a-z]/g, ''));
  const parts = words.map((w) => w.toLowerCase().replace(/[^a-z]/g, '')).filter((w) => w.length > 1);
  if (locals.some((l) => parts.filter((p) => l.includes(p)).length >= 1)) score += 2.5;
  if (locals.some((l) => parts.filter((p) => l.includes(p)).length >= 2)) score += 1;
  return { s, score };
}
function extractName(lines: string[], emails: string[], fileName: string, designations: Set<string>, cities: Record<string, any>) {
  const labelled = lines.find((l) => /^\s*(?:name|full name|candidate name)\s*[:\-]\s*\S/i.test(l));
  if (labelled) {
    const r = nameScore(labelled, emails, designations, cities);
    if (r.score > 0) return { name: titleCaseIfUpper(r.s), confidence: 95 };
  }
  let best = { s: '', score: 0, idx: 99 };
  lines.slice(0, 25).forEach((l, i) => {
    const r = nameScore(l, emails, designations, cities);
    const adj = r.score - i * 0.12; // earlier lines are more likely
    if (adj > best.score) best = { s: r.s, score: adj, idx: i };
  });
  if (best.score >= 2) return { name: titleCaseIfUpper(best.s), confidence: Math.min(98, Math.round(55 + best.score * 7)) };
  // fall back to the e-mail address, then the file name
  const fromEmail = emails[0]?.split('@')[0].split(/[._-]+/).filter((p) => /^[a-z]{2,}$/i.test(p));
  if (fromEmail && fromEmail.length >= 2) return { name: titleCase(fromEmail.slice(0, 3).join(' ')), confidence: 55 };
  const fromFile = fileName.replace(/\.[^.]+$/, '').replace(/\b(cv|resume|curriculum|vitae|updated|latest|final|new|profile|\d+)\b/gi, ' ').replace(/[_\-.]+/g, ' ').trim();
  if (/^[A-Za-z]+(\s+[A-Za-z]+){1,3}$/.test(fromFile)) return { name: titleCase(fromFile), confidence: 45 };
  if (best.s) return { name: titleCaseIfUpper(best.s), confidence: 35 };
  return { name: '', confidence: 0 };
}
const titleCaseIfUpper = (s: string) => (s === s.toUpperCase() || s === s.toLowerCase() ? titleCase(s) : s);

// ---------------------------------------------------------------- location
function extractLocation(headerText: string, fullText: string, cities: Record<string, [string, string]>, countries: Record<string, string>) {
  const res = { formatted: '', city: '', state: '', country: '', countryCode: '', postcode: '' };
  const labelled = fullText.match(/^\s*(?:current\s+)?(?:location|address|residence|based in|city|current city|residential address|lives in)\s*[:\-]\s*(.+)$/im);
  const zones = [labelled?.[1] || '', headerText, fullText.slice(0, 1500)];
  const cityNames = Object.keys(cities).sort((a, b) => b.length - a.length);
  outer: for (const z of zones) {
    if (!z) continue;
    for (const c of cityNames) {
      if (new RegExp(`(?<![A-Za-z])${esc(c)}(?![A-Za-z])`, 'i').test(z)) {
        res.city = c; res.country = cities[c][0]; res.countryCode = cities[c][1];
        break outer;
      }
    }
  }
  const pc = (labelled?.[1] || headerText).toUpperCase().match(UK_POSTCODE);
  if (pc) { res.postcode = pc[1].replace(/\s*(\d[A-Z]{2})$/, ' $1'); if (!res.countryCode) { res.country = 'United Kingdom'; res.countryCode = 'GB'; } }
  if (!res.country) {
    for (const z of zones) {
      const hit = Object.keys(countries).sort((a, b) => b.length - a.length).find((k) => new RegExp(`(?<![A-Za-z])${esc(k)}(?![A-Za-z])`).test(z));
      if (hit) { res.country = Object.entries(countries).find(([k, v]) => v === countries[hit] && k.length > 3)?.[0] || hit; res.countryCode = countries[hit]; break; }
    }
  }
  if (labelled?.[1]) res.formatted = clean(labelled[1]).slice(0, 160);
  else res.formatted = [res.city, res.postcode, res.country].filter(Boolean).join(', ');
  return res;
}

// ---------------------------------------------------------------- experience
const STRONG_CO = /\b(Ltd|Limited|LLP|LLC|Inc|Incorporated|Corp|Corporation|PLC|Pvt|Private|GmbH|AG|S\.A\.|B\.V\.|BV|SA|SpA|Co\.|Company|Group|Bank|Holdings|Partners|University|College|School|Institute|Hospital|Council|Trust|NHS|Ministry|Department)\b\.?/i;
const LABEL_SEG = /^(duration|period|project|project description|client|role|designation|organi[sz]ation|company|employer|location|responsibilities|key responsibilities|environment|team size|technologies)$/i;
function titleScore(s: string, designations: Set<string>) {
  const l = s.toLowerCase();
  if (designations.has(l)) return 3;
  const words = s.split(/[\s-]+/);
  if (TITLE_WORDS.test(words.slice(-2).join(' '))) return 2.2;
  return TITLE_WORDS.test(s) ? 1 : 0;
}
function companyScore(s: string) {
  if (STRONG_CO.test(s)) return 3;
  return COMPANY_SUFFIX.test(s) ? 1.5 : 0;
}
function splitTitleCompany(segs0: string[], designations: Set<string>, cities: Record<string, any>) {
  let location = '';
  const segs: string[] = [];
  for (const s0 of segs0) {
    const s = clean(s0.replace(/^\s*(?:\d{1,2}|[a-z])[.)]\s*/i, '').replace(/^(?:company|employer|organi[sz]ation|designation|role|position|title)\s*[:\-]\s*/i, ''));
    if (!s || s.length > 90 || LABEL_SEG.test(s)) continue;
    if (!location && (cities[titleCase(s)] || cities[s] || COUNTRIES[s] || /^(remote|hybrid|onsite)$/i.test(s))) { location = s; continue; }
    segs.push(s);
  }
  let title = '', company = '';
  const scored = segs.map((s) => ({ s, t: titleScore(s, designations), c: companyScore(s) }));
  const bestT = [...scored].filter((x) => x.t > 0 && x.t >= x.c).sort((a, b) => b.t - b.c - (a.t - a.c))[0];
  if (bestT) title = bestT.s;
  const bestC = [...scored].filter((x) => x.s !== title && x.c > 0).sort((a, b) => b.c - a.c)[0];
  if (bestC) company = bestC.s;
  const rest = segs.filter((x) => x !== title && x !== company);
  if (!company && rest.length) company = rest.shift()!;
  if (!title && rest.length) title = rest.shift()!;
  return { title, company, location };
}

function extractWork(expLines: string[], designations: Set<string>, cities: Record<string, any>) {
  const entries: WorkEntry[] = [];
  const idx: { i: number; r: Range }[] = [];
  expLines.forEach((l, i) => findRanges(l).forEach((r) => idx.push({ i, r })));
  // keep only one range per line (the first)
  const perLine = new Map<number, Range>();
  idx.forEach(({ i, r }) => { if (!perLine.has(i)) perLine.set(i, r); });
  const lineIdx = [...perLine.keys()].sort((a, b) => a - b);
  lineIdx.forEach((li, k) => {
    const r = perLine.get(li)!;
    const prevEnd = k > 0 ? lineIdx[k - 1] : -1;
    const nextStart = k < lineIdx.length - 1 ? lineIdx[k + 1] : expLines.length;
    const sameLine = expLines[li].replace(r.text, ' ').replace(/\(\s*\)|\[\s*\]/g, ' ');
    const segsOf = (l: string) => l.split(/\s*\|\s*|\s{3,}|\s+[–—-]\s+|\s*,\s*(?=[A-Z])|\s+at\s+|\s+@\s+|\t|•/).map(clean).filter((x) => x && !/^\d+\s*(yrs?|years?|months?|mos?)\b/i.test(x) && !/^\(?\d+(\.\d+)?\s*(yrs?|years?)/i.test(x));
    let segs = segsOf(sameLine);
    // look at up to 2 lines above (that belong to this entry) and 1 below
    const above: string[] = [];
    for (let j = li - 1; j > prevEnd && j >= li - 3; j--) {
      const l = expLines[j].trim();
      if (!l) { if (above.length) break; continue; }
      if (/^•/.test(l) || l.length > 100) break;
      if (/^(?:(?:period|duration|dates?|from|to|employer|company|organi[sz]ation|role|designation|position|title|job title|location)\s*\|?\s*){2,}$/i.test(l)) break;
      above.unshift(l);
    }
    if (segs.filter((s) => s.length > 1).length < 2) segs = [...above.flatMap(segsOf), ...segs];
    let descStart = li + 1;
    if (segs.length < 2 && li + 1 < nextStart) {
      const below = expLines[li + 1]?.trim();
      if (below && !/^•/.test(below) && below.length < 90) { segs.push(...segsOf(below)); descStart = li + 2; }
    }
    const { title, company, location } = splitTitleCompany(segs, designations, cities);
    const descEnd = Math.min(nextStart - (above.length && k < lineIdx.length - 1 ? 0 : 0), expLines.length);
    const desc = expLines.slice(descStart, descEnd).filter((l) => l.trim()).filter((l, n, arr) => {
      // don't swallow the next entry's title/company lines
      const nextLi = lineIdx[k + 1];
      return !(nextLi != null && descStart + n >= nextLi - 2 && !/^•/.test(l.trim()) && l.trim().length < 90 && n >= arr.length - 2);
    }).join('\n').trim();
    const months = monthIndex(r.end) - monthIndex(r.start) + 1;
    entries.push({ title, company, location, startDate: fmt(r.start), endDate: r.current ? null : fmt(r.end), current: r.current, months, description: desc.slice(0, 2500) });
  });
  return entries;
}

function mergeMonths(entries: { start: number; end: number }[]) {
  const s = [...entries].sort((a, b) => a.start - b.start);
  let total = 0; let cur: { start: number; end: number } | null = null;
  for (const e of s) {
    if (!cur) { cur = { ...e }; continue; }
    if (e.start <= cur.end + 1) cur.end = Math.max(cur.end, e.end);
    else { total += cur.end - cur.start + 1; cur = { ...e }; }
  }
  if (cur) total += cur.end - cur.start + 1;
  return total;
}

// ---------------------------------------------------------------- education
function extractEducation(lines: string[]): EducationEntry[] {
  const out: EducationEntry[] = [];
  const used = new Set<number>();
  lines.forEach((l, i) => {
    if (used.has(i)) return;
    const hit = DEGREE_PATTERNS.find(([re]) => re.test(l));
    if (!hit) return;
    const ctx = [lines[i - 1] || '', l, lines[i + 1] || '', lines[i + 2] || ''];
    const instLine = [l, ctx[2], ctx[0], ctx[3]].find((x) => INSTITUTION.test(x)) || '';
    const years = (ctx.slice(1, 4).join(' ').match(/\b(19[6-9]\d|20[0-4]\d)\b/g) || []);
    const grade = (ctx.slice(1, 3).join(' ').match(/\b(?:CGPA|GPA|CPI|SGPA)\s*[:\-]?\s*\d+(?:\.\d+)?(?:\s*\/\s*\d+)?|\b\d{2}(?:\.\d+)?\s*%|\b(?:First|Upper Second|Lower Second|Second|Third)[- ]Class(?: Honours)?|\b2:[12]\b|\bDistinction\b|\bMerit\b/i) || [''])[0];
    const field = (l.match(/\b(?:in|of)\s+([A-Z][A-Za-z&,\- ]{2,60}?)(?:\s*[,(|–-]|\s+from\b|\s+at\b|$)/) || ['', ''])[1];
    let inst = '';
    if (instLine) {
      const m = instLine.match(/((?:(?:[A-Z][A-Za-z.&'’-]*|of|and|&|for|the)\s+){0,8}(?:University|Universit[ée]|College|Institute|Institution|School|Academy|Polytechnic|IIT|NIT|IIM|BITS|Vidyalaya|Vidyapeeth|Mahavidyalaya)(?:\s+(?:of|for|and|&|the|[A-Z][A-Za-z.&'’-]*)){0,6})/);
      inst = clean((m?.[1] || '').replace(/^(?:of|and|for|the)\s+/i, '').replace(/\s+(?:of|and|for|the|with|in)$/i, ''));
    }
    const paren = l.match(/\(([A-Z][A-Za-z&,.\- ]{3,70})\)/);
    out.push({ degree: hit[1], field: clean(field || paren?.[1] || ''), institution: clean(inst), year: years.length ? years[years.length - 1] : '', grade: clean(grade), raw: clean(l).slice(0, 200) });
    used.add(i);
    if (instLine === ctx[2]) used.add(i + 1);
  });
  // de-duplicate same degree+year
  return out.filter((e, i) => out.findIndex((x) => x.degree === e.degree && x.year === e.year && x.institution === e.institution) === i).slice(0, 10);
}

// ---------------------------------------------------------------- main
export function parseCV(rawText: string, fileName = '', dict: Dictionaries = {}): ParsedCV {
  const text = normaliseText(rawText);
  const lines = text.split('\n');
  const nonEmpty = lines.filter((l) => l.trim());
  const warnings: string[] = [];
  const cities = { ...CITIES, ...(dict.cities || {}) };
  const countries = { ...COUNTRIES, ...(dict.countries || {}) };
  const designations = new Set((dict.designations || []).map((d) => d.toLowerCase().trim()).filter((d) => d.length > 3));

  const sections = splitSections(lines);
  const sec = (k: string) => sections.filter((s) => s.key === k).map((s) => s.lines.join('\n')).join('\n').trim();
  const secLines = (k: string) => sections.filter((s) => s.key === k).flatMap((s) => s.lines);
  const headerText = (sections[0].lines.join('\n') + '\n' + sec('personal')).slice(0, 2500);

  const emails = extractEmails(text);
  const links = extractLinks(text);
  const location = extractLocation(headerText, text, cities, countries);
  const phoneCountries = uniq([location.countryCode, ...emails.map((e) => (e.endsWith('.uk') ? 'GB' : e.endsWith('.in') ? 'IN' : '')), ].filter(Boolean));
  const phones = extractPhones(headerText + '\n' + text.slice(0, 4000), phoneCountries);
  if (!location.countryCode && phones[0]?.country) {
    location.countryCode = phones[0].country;
    location.country = Object.entries(countries).find(([k, v]) => v === phones[0].country && k.length > 3)?.[0] || '';
    if (!location.formatted) location.formatted = location.country;
  }

  const skillSecLines = new Set(sections.filter((x) => x.key !== 'header' && x.key !== 'personal').flatMap((x) => x.lines.map((l) => l.trim())));
  const headerLines = sections.filter((x) => x.key === 'header' || x.key === 'personal').flatMap((x) => x.lines).filter((l) => l.trim());
  const nameCandidates = (headerLines.length >= 1 ? headerLines : nonEmpty).filter((l) => !skillSecLines.has(l.trim()) || headerLines.length);
  const allSkillNames = new Set([...Object.keys(SKILL_ALIASES), ...(dict.skills || [])].map((x) => x.toLowerCase()));
  const nm = extractName(nameCandidates.filter((l) => !allSkillNames.has(clean(l).toLowerCase()) && !/,/.test(l.replace(/^[^,]{2,45}\s*\|/, ''))), emails, fileName, designations, cities);
  const nameParts = nm.name.split(/\s+/).filter(Boolean);

  // experience — prefer the experience section; else lines that are not in education
  let expLines = secLines('experience');
  if (!expLines.filter((l) => findRanges(l).length).length) {
    const edu = new Set(sections.filter((s) => ['education', 'certifications', 'header', 'projects'].includes(s.key)).flatMap((s) => s.lines));
    expLines = lines.filter((l) => !edu.has(l));
  }
  const work = extractWork(expLines, designations, cities).filter((w) => w.title || w.company || w.months > 0);
  const totalMonths = mergeMonths(work.map((w) => {
    const [sy, sm] = (w.startDate || '').split('-').map(Number);
    const end = w.endDate ? w.endDate.split('-').map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1];
    return { start: sy * 12 + sm - 1, end: end[0] * 12 + end[1] - 1 };
  }));
  const stated = text.match(/(\d{1,2}(?:\.\d{1,2})?)\s*\+?\s*(?:years?|yrs?)(?:\s+(?:and\s+)?\d{1,2}\s*months?)?(?:\s+of)?\s+(?:[\w-]+\s+){0,4}?(?:experience|exp\b)/i);
  const statedYears = stated ? Number(stated[1]) : null;
  let total: number | null = work.length ? Math.round((totalMonths / 12) * 10) / 10 : null;
  if (total == null && statedYears != null) total = statedYears;
  if (total != null && statedYears != null && Math.abs(total - statedYears) > 3 && work.length < 2) total = statedYears;

  // designation & company
  let designation = work[0]?.title || '';
  let currentCompany = work.find((w) => w.current)?.company || work[0]?.company || '';
  if (!designation) {
    const near = nonEmpty.slice(0, 8).find((l) => l !== nm.name && (TITLE_WORDS.test(l) || designations.has(clean(l).toLowerCase())) && l.length < 70 && !/@|\d{5}/.test(l));
    if (near) designation = clean(near.split(/\s*[|,]\s*/)[0]);
  }
  const labelledRole = text.match(/^\s*(?:current\s+)?(?:designation|job title|position|current role)\s*[:\-]\s*(.+)$/im);
  if (labelledRole) designation = clean(labelledRole[1]);
  const labelledCo = text.match(/^\s*(?:current\s+)?(?:company|employer|organi[sz]ation)\s*[:\-]\s*(.+)$/im);
  if (labelledCo) currentCompany = clean(labelledCo[1]);

  const skillText = sec('skills');
  const eduSet = new Set(secLines('education'));
  const skillSource = lines.filter((l) => !eduSet.has(l)).join('\n');
  const skills = extractSkills(skillSource, skillText, dict.skills || []);

  const eduLines = secLines('education').length ? secLines('education') : lines;
  const education = extractEducation(eduLines);

  const certLines = secLines('certifications').map(clean).filter((l) => l.length > 3 && l.length < 140 && !headingOf(l));
  const certRe = /\b(AWS Certified[^,\n]{0,60}|Microsoft Certified[^,\n]{0,60}|AZ-\d{3}|DP-\d{3}|PL-\d{3}|MB-\d{3}|PMP|PRINCE2(?: [A-Za-z]+)?|ITIL(?: v?\d)?(?: Foundation)?|Certified Scrum Master|CSM|PSM ?I{1,3}|CISSP|CISM|CISA|CEH|CompTIA [A-Za-z+]+|CCNA|CCNP|OCP|OCA|Salesforce Certified[^,\n]{0,50}|Google Cloud Certified[^,\n]{0,50}|ISTQB[^,\n]{0,40}|Six Sigma[^,\n]{0,30}|CIPD[^,\n]{0,20}|ACCA|CIMA|CFA)\b/g;
  const certifications = uniqCI([...certLines, ...(text.match(certRe) || []).map(clean)]).slice(0, 25);

  const langSrc = sec('languages') + '\n' + (text.match(/^\s*(?:languages?(?: known| spoken)?)\s*[:\-]\s*(.+)$/im)?.[1] || '');
  const languages = LANGUAGES.filter((l) => new RegExp(`\\b${l}\\b`, 'i').test(langSrc));

  let summary = sec('summary');
  if (!summary) {
    const para = text.split(/\n\s*\n/).slice(0, 5).find((p) => p.split(/\s+/).length >= 25 && !EMAIL_RE.test(p) && !findRanges(p).length);
    EMAIL_RE.lastIndex = 0;
    summary = para || '';
  }
  summary = summary.replace(/\s*\n\s*/g, ' ').trim().slice(0, 1500);

  const label = (re: RegExp) => clean(text.match(re)?.[1] || '');
  const dob = label(/^\s*(?:date of birth|d\.?o\.?b\.?|birth date|born)\s*[:\-]?\s*(.{6,30})$/im).replace(/\s{2,}.*/, '');
  const gender = label(/^\s*(?:gender|sex)\s*[:\-]\s*(male|female|non[- ]binary|other|m|f)\b/im);
  const nationality = label(/^\s*(?:nationality|citizenship)\s*[:\-]\s*([A-Za-z ]{3,30})/im);
  const noticePeriod = label(/^\s*(?:notice period|availability|available from)\s*[:\-]\s*(.{2,40})$/im) || clean(text.match(/\b(immediate(?:ly)? (?:available|joiner)|serving notice[^.\n]{0,40}|\d{1,3}\s*(?:days?|weeks?|months?)\s+notice(?: period)?)\b/i)?.[1] || '');
  const maritalStatus = label(/^\s*marital status\s*[:\-]\s*([A-Za-z]{3,15})/im);
  const workAuthorisation = label(/^\s*(?:visa(?: status)?|work (?:permit|authori[sz]ation)|right to work|immigration status)\s*[:\-]\s*(.{2,60})$/im);

  // ---------------- confidence & warnings
  const confidence: any = {
    name: nm.confidence,
    email: emails.length ? 98 : 0,
    phone: phones.length ? 95 : 0,
    location: location.city ? 85 : location.country ? 60 : 0,
    skills: skills.length >= 5 ? 90 : skills.length ? 60 : 0,
    experience: work.length ? 85 : statedYears != null ? 60 : 0,
    education: education.length ? 85 : 0,
  };
  confidence.overall = Math.round(confidence.name * 0.25 + confidence.email * 0.2 + confidence.phone * 0.15 + confidence.skills * 0.15 + confidence.experience * 0.15 + confidence.location * 0.05 + confidence.education * 0.05);
  if (!emails.length) warnings.push('No email address found.');
  if (!phones.length) warnings.push('No phone number found.');
  if (nm.confidence < 60) warnings.push('Candidate name is a best guess — please confirm.');
  if (emails.length > 1) warnings.push(`${emails.length} email addresses found; the first is used as primary.`);
  if (!work.length) warnings.push('No dated work history found.');

  return {
    name: nm.name, firstName: nameParts[0] || '', lastName: nameParts.slice(1).join(' '),
    emails, phoneNumbers: phones.map((p) => p.e164), phones, country_code: phones[0]?.callingCode || '',
    location, ...links, designation, currentCompany,
    totalYearsExperience: total, statedYearsExperience: statedYears,
    workExperience: work, education, skills, certifications, languages, summary,
    dob, gender: gender ? titleCase(gender.replace(/^m$/i, 'Male').replace(/^f$/i, 'Female')) : '', nationality, noticePeriod, maritalStatus, workAuthorisation,
    sections: Object.fromEntries(Object.keys(SECTION_HEADINGS).map((k) => [k, sec(k)]).filter(([, v]) => v)),
    confidence, warnings, full_text: text,
  };
}
