import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emailList, routeRecipients } from '../lib/email-routing';
test('legacy destinations are blocked even without a configured route', () => {
  assert.equal(routeRecipients('owner@example.com,old@testqtech.com,old@decilliondigital.com,old@virguleinternational.com', []), 'owner@example.com');
});
test('enabled replacements route To/CC/BCC inputs and deduplicate', () => {
  const routes = [{ original_email:'old@testqtech.com', replacement_email:'team@example.com,team@example.com', enabled:true }];
  for (const field of ['old@testqtech.com', 'OLD@TESTQTECH.COM;team@example.com']) assert.equal(routeRecipients(field,routes),'team@example.com');
});
test('disabled replacements suppress recipients', () => {
  assert.equal(routeRecipients('old@testqtech.com',[{original_email:'old@testqtech.com',replacement_email:'team@example.com',enabled:false}]),'');
});
test('invalid destinations, header injection and legacy replacements are rejected', () => {
  assert.throws(()=>emailList('valid@example.com\r\nBcc: other@example.com'));
  assert.throws(()=>emailList('not-an-email'));
  assert.throws(()=>routeRecipients('old@testqtech.com',[{original_email:'old@testqtech.com',replacement_email:'other@testqtech.com',enabled:true}]));
});
