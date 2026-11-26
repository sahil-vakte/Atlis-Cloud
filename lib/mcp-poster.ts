import { createCanvas, loadImage, type SKRSContext2D } from '@napi-rs/canvas';
import path from 'node:path';
import QRCode from 'qrcode';

type PosterRole = {
  title: string; location: string; employment_type: string | null;
  experience: string; skills: string | null; work_mode: string | null;
  description: string; summary: string;
};
type Card = { heading: string; items: string[] };

const pay = /(?:[$£€¥₹]\s*\d|\b(?:GBP|USD|EUR|JPY|INR)\s*\d|\b\d[\d,.]*\s*k?\s*(?:GBP|USD|EUR|JPY|INR)\b|\b\d{2,3}\s*k\b|\b(?:salary|compensation|remuneration|day rate|hourly rate|daily rate|pay range|pay rate|fixed pay|variable pay|fixed salary|base salary|OTE)\b)/i;
const internal = /\b(?:client JR|internal only|confidential|do not publish|do not post|bill rate|client rate)\b/i;
const clean = (value: string | null | undefined) => {
  if (!value) return '';
  const index = value.search(pay);
  return (index < 0 ? value : value.slice(0, index)).replace(/[\s(|–—,;:-]+$/, '').trim();
};

export function posterContent(role: PosterRole) {
  const title = clean(role.title) || 'Open role';
  const themeText = [title, role.skills].filter(Boolean).join(' ');
  const theme = /\b(?:support|help\s?desk|service desk|desktop|end.user|workplace|onsite technician)\b/i.test(themeText) ? 1
    : /\b(?:aws|azure|gcp|cloud|infrastructure|cyber(?:security)?|devops|network|sre|kubernetes)\b/i.test(themeText) && !/\b(?:SAP|advisory|business transformation)\b/i.test(title) ? 0 : 2;
  const responsibilities: string[] = [];
  const requirements: string[] = [];
  let section: string[] | undefined;
  let summary = '';
  for (const raw of (role.description || '').split(/\r?\n/)) {
    let line = raw.trim();
    if (!line || pay.test(line) || internal.test(line)) continue;
    const heading = /^(?:(?:key |main |core |role and )?(responsibilities|duties|what you.ll do|what you will do)|(required qualifications|minimum qualifications|essential skills|key skills|requirements|must.have(?: experience| skills)?|what you need|what you.ll need))\s*(?::\s*(.*))?$/i.exec(line);
    if (heading) {
      section = heading[1] ? responsibilities : requirements;
      line = heading[3] || '';
      if (!line) continue;
    } else if (/^(?:preferred qualifications|nice.to.have|success measures|benefits|about (?:us|the company)|how to apply)\b/i.test(line)) {
      section = undefined;
      continue;
    }
    const bullet = /^(?:[•*–-]|\d+[.)])\s+/.test(line);
    line = line.replace(/^(?:[•*–-]|\d+[.)])\s+/, '').replace(/\s+/g, ' ').trim();
    if (section && (bullet || line.length >= 36 || heading) && section.length < 3) section.push(line);
    else if (!section && !summary && line.length >= 45 && !/^(?:location|experience|employment|apply)\s*:/i.test(line)) summary = line;
  }
  const explicitSummary = (role.summary || '').split(/\r?\n/).find((line) => line.trim().length > 30 && !pay.test(line) && !internal.test(line));
  const cards: Card[] = [];
  if (responsibilities.length) cards.push({ heading: 'Key responsibilities', items: responsibilities });
  if (!requirements.length && role.skills && !pay.test(role.skills) && !internal.test(role.skills)) {
    requirements.push(...role.skills.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean).slice(0, 3));
  }
  if (requirements.length) cards.push({ heading: 'What you need', items: requirements });
  return { title, theme, location: clean(role.location), employment: clean(role.employment_type),
    experience: clean(role.experience), workMode: clean(role.work_mode), summary: (explicitSummary || summary).trim(), cards };
}

function clipText(ctx: SKRSContext2D, text: string, width: number) {
  if (ctx.measureText(text).width <= width) return text;
  const pieces = Array.from(text);
  while (pieces.length && ctx.measureText(pieces.join('') + '…').width > width) pieces.pop();
  return pieces.join('').trimEnd() + '…';
}
function wrap(ctx: SKRSContext2D, text: string, width: number, count: number) {
  const rows: string[] = [];
  let row = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = row ? row + ' ' + word : word;
    if (row && ctx.measureText(next).width > width) { rows.push(row); row = word; }
    else row = next;
  }
  if (row) rows.push(row);
  if (rows.length > count) rows[count - 1] += '…';
  return rows.slice(0, count).map((line) => clipText(ctx, line, width));
}
function rounded(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number, color: string) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
}

export async function renderRecruitmentPoster(role: PosterRole, application: string | null) {
  const content = posterContent(role);
  const canvas = createCanvas(1200, 1200);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#E9F3FE';
  ctx.fillRect(0, 0, 1200, 1200);

  const art = await loadImage(path.join(process.cwd(), 'assets/mcp/poster-backgrounds.png'));
  const tile = art.width / 3;
  ctx.fillStyle = '#081B3F';
  ctx.fillRect(0, 0, 1200, 585);
  ctx.save();
  ctx.beginPath(); ctx.moveTo(835, 0); ctx.lineTo(1200, 0); ctx.lineTo(1200, 585); ctx.lineTo(600, 585); ctx.closePath(); ctx.clip();
  ctx.drawImage(art, content.theme * tile, 0, tile, art.height, 600, 0, 600, 585);
  const fade = ctx.createLinearGradient(650, 0, 1160, 0);
  fade.addColorStop(0, '#081B3F'); fade.addColorStop(.45, '#081B3FAA'); fade.addColorStop(1, '#081B3F00');
  ctx.fillStyle = fade; ctx.fillRect(600, 0, 600, 585);
  ctx.restore();
  ctx.fillStyle = '#147BEF';
  ctx.fillRect(0, 575, 1200, 10);

  rounded(ctx, 60, 51, 280, 52, 10, '#FFC532');
  ctx.font = 'bold 27px sans-serif';
  ctx.fillStyle = '#081B3F';
  ctx.fillText('WE’RE HIRING', 81, 85);

  const textWidth = 765;
  let titleSize = 74;
  ctx.font = 'bold ' + titleSize + 'px sans-serif';
  while (titleSize > 52 && wrap(ctx, content.title, textWidth, 4).length > 3) {
    titleSize -= 4; ctx.font = 'bold ' + titleSize + 'px sans-serif';
  }
  const titleLines = wrap(ctx, content.title, textWidth, 3);
  const titleStart = 180;
  ctx.fillStyle = '#FFFFFF';
  titleLines.forEach((line, i) => ctx.fillText(line, 60, titleStart + i * (titleSize + 6)));
  const summaryY = titleStart + (titleLines.length - 1) * (titleSize + 6) + 57;
  ctx.fillStyle = '#D9E9FD';
  ctx.font = '30px sans-serif';
  wrap(ctx, content.summary, 710, 2).forEach((line, i) => ctx.fillText(line, 62, summaryY + i * 37));

  const facts = [
    ['LOCATION', content.location], ['EMPLOYMENT', content.employment || content.workMode], ['EXPERIENCE', content.experience],
  ].filter(([, value]) => value);
  const factWidth = 1080 / Math.max(facts.length, 1);
  if (facts.length) {
    rounded(ctx, 60, 488, 1080, 72, 12, '#0D2F61EB');
    facts.forEach(([label, value], i) => {
      const x = 82 + i * factWidth;
      ctx.fillStyle = '#8DC4FF'; ctx.font = 'bold 15px sans-serif'; ctx.fillText(label, x, 509);
      ctx.fillStyle = '#FFFFFF'; ctx.font = "bold 22px sans-serif";
      wrap(ctx, value, factWidth - 40, 2).forEach((line, index) => ctx.fillText(line, x, 533 + index * 22));
    });
  }

  const cards = content.cards;
  const cardWidth = cards.length === 1 ? 1080 : 528;
  cards.forEach(({ heading, items }, i) => {
    const x = 60 + i * 552;
    rounded(ctx, x, 624, cardWidth, 318, 20, '#FFFFFF');
    rounded(ctx, x + 27, 653, 9, 35, 4, '#1378E8');
    ctx.fillStyle = '#0B2249'; ctx.font = 'bold 34px sans-serif'; ctx.fillText(heading, x + 52, 681);
    let y = 738;
    for (const item of items.slice(0, 3)) {
      ctx.fillStyle = '#1378E8'; ctx.beginPath(); ctx.arc(x + 41, y - 8, 5, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = '#183255'; ctx.font = '26px sans-serif';
      const lines = wrap(ctx, item, cardWidth - 83, 2);
      lines.forEach((line, j) => ctx.fillText(line, x + 57, y + j * 30));
      y += lines.length * 30 + 15;
    }
  });
  if (!cards.length) {
    ctx.save();
    ctx.beginPath(); ctx.roundRect(60, 624, 1080, 318, 20); ctx.clip();
    const cropHeight = tile * 318 / 1080;
    ctx.drawImage(art, content.theme * tile, (art.height - cropHeight) / 2, tile, cropHeight, 60, 624, 1080, 318);
    ctx.restore();
  }

  ctx.fillStyle = '#081B3F'; ctx.fillRect(0, 981, 1200, 219);
  rounded(ctx, 60, 1022, 350, 65, 13, '#FFC532');
  ctx.fillStyle = '#081B3F'; ctx.font = 'bold 32px sans-serif';
  ctx.fillText(application ? 'Apply now  →' : 'Applications pending', 82, 1065);
  ctx.fillStyle = '#DCEBFF'; ctx.font = '25px sans-serif';
  ctx.fillText(application ? 'Upload your CV on Atlis.cloud' : 'Draft for recruiter review', 61, 1130);
  if (application) {
    const qr = await loadImage(await QRCode.toBuffer(application, { width: 164, margin: 4, errorCorrectionLevel: 'M' }));
    ctx.drawImage(qr, 974, 1008, 164, 164);
  }
  return canvas.toBuffer('image/png');
}
