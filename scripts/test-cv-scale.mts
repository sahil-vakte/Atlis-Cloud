import assert from 'node:assert/strict';
import { parseCV } from '../lib/cv/parse';
const skills = Array.from({ length: 500_000 }, (_, n) => `LegacySkill${n}`);
skills.push('CustomPlatform', 'CustomPlatform', 'C++', 'Node.js');
const text = 'Alex Morgan\nalex.morgan@example.invalid\nLondon, United Kingdom\nSKILLS\nPython, SQL, CustomPlatform, C++, Node.js, LegacySkill499999\nEXPERIENCE\nSoftware Engineer\nExample Ltd\nJanuary 2020 - Present\nBuilt services using Python and SQL.';
const start = Date.now();
for (let i = 0; i < 3; i++) {
  const parsed = parseCV(text, 'scale-test.txt', { skills });
  for (const skill of ['Python', 'SQL', 'CustomPlatform', 'C++', 'Node.js', 'LegacySkill499999']) assert.ok(parsed.skills.includes(skill), `Missing ${skill}`);
  assert.ok(!parsed.skills.includes('LegacySkill49999'), 'Partial skill names must not match');
  assert.equal(parsed.skills.filter(s => s === 'CustomPlatform').length, 1);
  assert.equal(parsed.emails[0], 'alex.morgan@example.invalid');
}
console.log(`PASS: three CVs with 500,000 dictionary entries in ${Date.now() - start}ms; heap ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MiB.`);
