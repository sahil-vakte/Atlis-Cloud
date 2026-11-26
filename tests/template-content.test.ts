import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fillTemplate, templateVariables, templatePreview } from '../lib/template-content';
import { rebrandTemplateText, rebrandTemplateRow } from '../lib/template-branding';

test('all stored placeholder styles are recognised and filled without swallowing unknown values', () => {
  const text = 'Hi ##CANDIDATE_NAME## {{ role }} {month} ##UNKNOWN##';
  assert.deepEqual(templateVariables(text), ['CANDIDATE_NAME', 'role', 'month', 'UNKNOWN']);
  assert.equal(fillTemplate(text, { CANDIDATE_NAME: 'Sam', role: 'Engineer', month: 'May' }), 'Hi Sam Engineer May ##UNKNOWN##');
  assert.equal(fillTemplate('{toString}', {}), '{toString}');
});
test('template cleanup preserves client references and variables while removing inherited branding', () => {
  const result = rebrandTemplateText('TAMIS TESTQBV Decillion Digital Virgule International ##CLIENT## Birlasoft <a href="mailto:care@testqtech.com">care@testqtech.com</a>');
  assert.doesNotMatch(result, /tamis|testq|decillion|virgule/i);
  assert.match(result, /##CLIENT## Birlasoft/); assert.match(result, /mailto:support@atlis.cloud/);
  assert.equal(rebrandTemplateText(result), result);
});
test('copied legal details and escalation contacts are not relabelled as Atlis legal facts', () => {
  const result = rebrandTemplateText('<li>Address: 49C The Parade, Oadby</li><li>VAT Number: 929658959</li><li>VAT Number: NL868391712B01</li>');
  assert.doesNotMatch(result, /49C|929658959|NL868391712B01/); assert.match(result, /signed agreement/);
  const patch = rebrandTemplateRow('email_template', { email_template_name: 'Compliance Escalation Matrix', email_template_html: 'Old directors and telephone numbers' });
  assert.match(patch.email_template_html, /support@atlis.cloud/); assert.doesNotMatch(patch.email_template_html, /Old directors/);
  assert.deepEqual(rebrandTemplateRow('email_template', patch), {});
});
test('preview disables external content and scripts', () => {
  assert.match(templatePreview('<p>Hello</p>'), /default-src 'none'/);
  assert.match(templatePreview('<p>Hello</p>'), /<article><p>Hello<\/p><\/article>/);
});
