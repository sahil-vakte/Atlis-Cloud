'use client';

import { useState } from 'react';
import { api } from '@/lib/client';
import { useToast } from './ui';

export type McpClientDetails = {
  platform: 'claude' | 'chatgpt';
  client_id: string;
  client_secret: string;
  redirect_uri: string;
};

type McpSetup = { enabled: boolean; eligible: boolean; origin: string; resource: string; scope: string };

export default function McpSetupPanel({ userId, setup, issued }: { userId: string; setup: McpSetup; issued: McpClientDetails | null }) {
  const toast = useToast();
  const [platform, setPlatform] = useState<'claude' | 'chatgpt'>('claude');
  const [callback, setCallback] = useState('');
  const [generated, setGenerated] = useState<McpClientDetails | null>(null);
  const [busy, setBusy] = useState(false);
  const client = generated?.platform === platform ? generated : issued?.platform === platform ? issued : null;
  const redirect = platform === 'claude' ? 'https://claude.ai/api/mcp/auth_callback' : callback.trim();
  const fields: [string, string][] = [
    ['MCP URL', setup.resource],
    ['Authentication', 'OAuth'],
    ['OAuth issuer', setup.origin],
    ['Authorization URL', setup.origin + '/api/mcp/oauth/authorize'],
    ['Token URL', setup.origin + '/api/mcp/oauth/token'],
    ['Scope', setup.scope],
    ['Redirect URL', client?.redirect_uri || redirect],
  ];
  if (client) fields.push(['Client ID', client.client_id], ['Client secret', client.client_secret]);

  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); toast('success', 'Copied to clipboard'); }
    catch { toast('error', 'Could not copy automatically. Select and copy the field.'); }
  };

  const create = async () => {
    setBusy(true);
    try {
      const result = await api('/api/users/' + userId + '/mcp', {
        method: 'POST', json: { action: 'issue_client', platform, redirect_uri: redirect },
      });
      setGenerated(result.client);
      toast('success', 'MCP client secret created');
    } catch (error: any) { toast('error', error.message); }
    finally { setBusy(false); }
  };

  if (!setup.enabled) return null;
  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate2">MCP connection setup</h2>
          <p className="mt-1 text-sm text-slate2">Use these details to connect this Atlis account. The client secret is shown once.</p>
        </div>
        <button type="button" className="btn-outline btn-sm" onClick={() => copy(fields.filter(([, value]) => value).map(([label, value]) => label + ': ' + value).join('\n'))}>Copy all details</button>
      </div>
      <div className="mb-4 grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <label className="block">
          <span className="label">AI platform</span>
          <select className="input" value={platform} onChange={(e) => setPlatform(e.target.value as 'claude' | 'chatgpt')}>
            <option value="claude">Claude</option><option value="chatgpt">ChatGPT</option>
          </select>
        </label>
        {platform === 'chatgpt' && <label className="block">
          <span className="label">ChatGPT callback shown in connector setup</span>
          <input className="input" type="url" value={callback} onChange={(e) => setCallback(e.target.value)} placeholder="https://chatgpt.com/connector/oauth/…" />
        </label>}
        {!client && <div><button type="button" className="btn-primary btn-sm" disabled={busy || !redirect} onClick={create}>
          {busy ? 'Generating…' : 'Generate client ID and secret'}
        </button></div>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {fields.filter(([, value]) => value).map(([label, value]) => (
          <div key={label}>
            <label className="label" htmlFor={'mcp-' + label.toLowerCase().replaceAll(' ', '-')}>{label}</label>
            <div className="flex gap-2">
              <input id={'mcp-' + label.toLowerCase().replaceAll(' ', '-')} className="input min-w-0 flex-1" value={value} readOnly autoComplete="off" spellCheck={false} />
              <button type="button" className="btn-outline btn-sm" aria-label={'Copy ' + label.toLowerCase()} onClick={() => copy(value)}>Copy</button>
            </div>
          </div>
        ))}
      </div>
      {!client && <p className="mt-4 text-xs text-slate2">Generating credentials replaces any previously issued credentials for this user on the selected platform.</p>}
    </section>
  );
}
