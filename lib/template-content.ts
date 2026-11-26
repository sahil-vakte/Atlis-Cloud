/** Keep stored placeholders intact until a caller supplies their values. */
export function templateVariables(value: string) {
  return [...new Set(Array.from(value.matchAll(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}|\{([A-Za-z0-9_]+)\}|##([A-Za-z0-9_]+)##/g), m => m[1] || m[2] || m[3]))];
}

export function fillTemplate(tpl: string, vars: Record<string, any>) {
  return String(tpl || '').replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}|\{([A-Za-z0-9_]+)\}|##([A-Za-z0-9_]+)##/g,
    (match, a, b, c) => Object.prototype.hasOwnProperty.call(vars, a || b || c) ? String(vars[a || b || c] ?? '') : match);
}

export const legacyTemplateBrand = /tamis|testq|decillion|v[ui]rgule/i;

export function escapeEmailText(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Preview is isolated from the app and cannot run scripts, navigate or load remote content. */
export function templatePreview(body: string) {
  return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"><style>body{margin:0;padding:24px;background:#f3f6fb;color:#0b1b3f;font:15px/1.7 Arial,sans-serif}main{max-width:560px;margin:auto;background:white;border:1px solid #e5eaf3;border-radius:12px;overflow:hidden}header{background:#00297b;color:white;padding:24px 28px;font-size:23px;font-weight:bold}article{padding:28px;overflow-wrap:anywhere}footer{border-top:1px solid #e5eaf3;padding:18px 28px;color:#576e9a;font-size:13px}table{max-width:100%;border-collapse:collapse}td,th{border:1px solid #e5eaf3;padding:8px}img{max-width:100%}a{color:#00297b}</style></head><body><main><header>atlis.cloud</header><article>${body}</article><footer>Atlis Cloud · support@atlis.cloud</footer></main></body></html>`;
}
