import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emailList, routeRecipients, routeEmailReferences } from '../lib/email-routing';
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
test('legacy template contact references use enabled replacements and suppress unconfigured addresses', () => {
  const routes = [{original_email:'old@testqtech.com',replacement_email:'care@example.com',enabled:true}];
  assert.equal(routeEmailReferences('<a href="mailto:old@testqtech.com">old@testqtech.com</a>',routes,true),'<a href="mailto:care@example.com">care@example.com</a>');
  assert.equal(routeEmailReferences('Contact old@decilliondigital.com',[]),'Contact ');
  assert.equal(routeEmailReferences('Contact current@example.com',[]),'Contact current@example.com');
});
