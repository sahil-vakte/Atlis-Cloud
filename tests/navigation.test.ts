import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveMenuHref } from '../lib/modules';
test('CRM parent and old bookmarked paths resolve to the existing prospects module',()=>{
  for(const href of ['crm-prospect-list','/crm-prospect-list','/legacy/crm-prospect-list','crm-account-list']) assert.equal(resolveMenuHref(href),'/m/crm-prospects');
});
test('configured application links remain usable and external links are not executed',()=>{
  assert.equal(resolveMenuHref('/m/crm-contacts'),'/m/crm-contacts');
  assert.equal(resolveMenuHref('/admin/notification-emails'),'/admin/notification-emails');
  assert.match(resolveMenuHref('javascript:alert(1)'),/^\/legacy\//);
  assert.match(resolveMenuHref('//example.com'),/^\/legacy\//);
});
