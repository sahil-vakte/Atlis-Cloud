import { query, one } from './db';
import type { SessionUser } from './session';

const PORTAL = new Set([3, 16, 17, 29]);
export async function dashboard(u: SessionUser) {
  if (PORTAL.has(u.role)) return portalDashboard(u);
  const c = async (sql: string, p: any[] = []) => Number((await one<{ n: number }>(sql, p))?.n ?? 0);
  const [openReqs, totalReqs, profiles, sourcing, submissions, sentToClient, activeConsultants, pendingTimesheets, pendingInvoices, prospects] = await Promise.all([
    c('SELECT COUNT(*) n FROM requirement WHERE deleted=0 AND active=1'),
    c('SELECT COUNT(*) n FROM requirement WHERE deleted=0'),
    c('SELECT COUNT(*) n FROM profile WHERE deleted=0'),
    c('SELECT COUNT(*) n FROM sourcing WHERE deleted=0'),
    c('SELECT COUNT(*) n FROM sourcing WHERE deleted=0 AND submitted=1'),
    c("SELECT COUNT(*) n FROM sourcing WHERE deleted=0 AND isSentToClient='1'"),
    c('SELECT COUNT(*) n FROM candidate_data WHERE status=1 AND (endDate IS NULL OR endDate="" OR STR_TO_DATE(endDate, "%Y-%m-%d") >= CURDATE() OR STR_TO_DATE(endDate, "%d-%m-%Y") >= CURDATE())'),
    c("SELECT COUNT(*) n FROM candidate_timesheet WHERE deleted=0 AND verificationStatus='pending'"),
    c("SELECT COUNT(*) n FROM candidate_invoice WHERE deleted=0 AND verificationStatus='pending'"),
    c('SELECT COUNT(*) n FROM prospects WHERE deleted=0'),
  ]);
  const months = await query<{ m: string; requirements: number; profiles: number; submissions: number }>(`
    SELECT m.m,
      (SELECT COUNT(*) FROM requirement r WHERE r.deleted=0 AND DATE_FORMAT(r.created_at,'%Y-%m')=m.m) requirements,
      (SELECT COUNT(*) FROM profile p WHERE p.deleted=0 AND DATE_FORMAT(p.created_at,'%Y-%m')=m.m) profiles,
      (SELECT COUNT(*) FROM sourcing s WHERE s.deleted=0 AND s.submitted=1 AND DATE_FORMAT(s.created_at,'%Y-%m')=m.m) submissions
    FROM (SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n MONTH),'%Y-%m') m FROM
      (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11) x) m
    ORDER BY m.m`);
  const pipeline = await query<{ label: string; value: number }>(`SELECT IFNULL(ps.profileStatus,'Not set') label, COUNT(*) value FROM sourcing s
    LEFT JOIN master_profile_status ps ON ps.pStatusID=s.pStatusID WHERE s.deleted=0 AND s.submitted=1 GROUP BY label ORDER BY value DESC LIMIT 12`);
  const topClients = await query<{ label: string; value: number }>(`SELECT c.clientName label, COUNT(*) value FROM requirement r JOIN master_client c ON c.clientID=r.client
    WHERE r.deleted=0 GROUP BY c.clientID ORDER BY value DESC LIMIT 8`);
  const recruiters = await query<{ label: string; sourced: number; submitted: number; sent: number }>(`SELECT TRIM(CONCAT(u.first_name,' ',IFNULL(u.last_name,''))) label,
      COUNT(s.sID) sourced, SUM(s.submitted=1) submitted, SUM(s.isSentToClient='1') sent
    FROM sourcing s JOIN users u ON u.id=s.assignedUserID WHERE s.deleted=0 AND s.created_at >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
    GROUP BY u.id ORDER BY submitted DESC, sourced DESC LIMIT 8`);
  const timesheets = await query<{ label: string; value: number }>(`SELECT IFNULL(NULLIF(verificationStatus,''),'not set') label, COUNT(*) value FROM candidate_timesheet WHERE deleted=0 GROUP BY label`);
  const invoices = await query<{ label: string; value: number }>(`SELECT IFNULL(NULLIF(verificationStatus,''),'not set') label, COUNT(*) value FROM candidate_invoice WHERE deleted=0 GROUP BY label`);
  const recentReqs = await query(`SELECT r.rID, r.roleName, c.clientName, r.location, r.created_at FROM requirement r LEFT JOIN master_client c ON c.clientID=r.client WHERE r.deleted=0 ORDER BY r.rID DESC LIMIT 6`);
  const recentSubs = await query(`SELECT s.sID, s.sourcingName, p.name candidate, r.roleName, ps.profileStatus, s.created_at FROM sourcing s LEFT JOIN profile p ON p.pID=s.profileID
    LEFT JOIN requirement r ON r.rID=s.requirementID LEFT JOIN master_profile_status ps ON ps.pStatusID=s.pStatusID WHERE s.deleted=0 AND s.submitted=1 ORDER BY s.sID DESC LIMIT 6`);
  const banners = await activeBanners(u);
  return { kind: 'internal', kpis: { openReqs, totalReqs, profiles, sourcing, submissions, sentToClient, activeConsultants, pendingTimesheets, pendingInvoices, prospects },
    months, pipeline, topClients, recruiters, timesheets, invoices, recentReqs, recentSubs, banners };
}

async function portalDashboard(u: SessionUser) {
  let cd = '1=0'; const p: any[] = [];
  if ((u.role === 16 || u.role === 3) && u.profileID) { cd = 'profileID=?'; p.push(u.profileID); }
  else if (u.role === 17 && u.companyID) { cd = 'companyID=?'; p.push(u.companyID); }
  else if (u.role === 29 && u.subVendorID) { cd = 'subVendorID=?'; p.push(u.subVendorID); }
  const consultants = await query<any>(`SELECT c.cdID, c.profileID, COALESCE(NULLIF(c.candidateName,''), pr.name) candidateName, c.role, c.endClient, c.startDate, c.endDate FROM candidate_data c LEFT JOIN profile pr ON pr.pID=c.profileID WHERE ${cd.replace(/(profileID|companyID|subVendorID)/, 'c.$1')} ORDER BY c.cdID DESC LIMIT 20`, p);
  const cdids = consultants.map((c) => c.cdID);
  const inList = (a: any[]) => (a.length ? a.map(() => '?').join(',') : 'NULL');
  // legacy schema: candidate_timesheet.pID / candidate_invoice.pID hold candidate_data.cdID
  const ts = await query<any>(`SELECT verificationStatus label, COUNT(*) value FROM candidate_timesheet WHERE deleted=0 AND pID IN (${inList(cdids)}) GROUP BY label`, cdids);
  const inv = await query<any>(`SELECT verificationStatus label, COUNT(*) value, SUM(grossAmount) amount FROM candidate_invoice WHERE deleted=0 AND pID IN (${inList(cdids)}) GROUP BY label`, cdids);
  const exp = await query<any>(`SELECT verificationStatus label, COUNT(*) value FROM expenserequest WHERE deleted=0 AND cdID IN (${inList(cdids)}) GROUP BY label`, cdids);
  const updates = await query<any>('SELECT updateID, updateName, updateDate, description FROM master_update WHERE deleted=0 AND status=1 ORDER BY updateID DESC LIMIT 5');
  return { kind: 'portal', consultants, timesheets: ts, invoices: inv, expenses: exp, updates, banners: await activeBanners(u) };
}

async function activeBanners(u: SessionUser) {
  try {
    return await query<any>(`SELECT id, title FROM notification_alert WHERE deleted=0 AND status=1 AND (role IS NULL OR role='' OR FIND_IN_SET(?, role))
      AND (startDate IS NULL OR startDate='' OR startDate <= CURDATE()) AND (endDate IS NULL OR endDate='' OR endDate >= CURDATE())`, [String(u.role)]);
  } catch { return []; }
}

export function dateRange(url: URL) {
  const days = url.searchParams.get('days');
  const to = url.searchParams.get('to') || new Date().toISOString().slice(0, 10);
  let from = url.searchParams.get('from') || '';
  if (!from) { const d = new Date(); d.setDate(d.getDate() - Number(days || 30)); from = d.toISOString().slice(0, 10); }
  return { from, to };
}

/** Recruiter performance: columns are generated from master_regions and master_profile_status — nothing hardcoded. */
export async function recruiterReport(from: string, to: string, teamID?: string) {
  const regions = await query<{ regionID: number; regionName: string }>('SELECT regionID, regionName FROM master_regions WHERE deleted=0 ORDER BY regionID');
  const statuses = await query<{ pStatusID: number; profileStatus: string }>(
    'SELECT pStatusID, profileStatus FROM master_profile_status WHERE deleted=0 AND pStatusID IN (SELECT DISTINCT pStatusID FROM sourcing WHERE deleted=0) ORDER BY pStatusID');
  const params: any[] = [];
  const regionCols = regions.map((r) => { params.push(String(r.regionID), `${from} 00:00:00`, `${to} 23:59:59`); return `SUM(FIND_IN_SET(?, s.regionID) AND s.isSentToClient='1' AND s.sentToClient_date BETWEEN ? AND ?) \`r_${r.regionID}\``; });
  const statusCols = statuses.map((s) => { params.push(s.pStatusID); return `SUM(s.pStatusID=?) \`s_${s.pStatusID}\``; });
  params.push(`${from} 00:00:00`, `${to} 23:59:59`);
  let teamSql = '';
  if (teamID) { teamSql = ' AND FIND_IN_SET(?, u.teamID)'; }
  const rows = await query<any>(`SELECT u.id, TRIM(CONCAT(u.first_name,' ',IFNULL(u.last_name,''))) name,
      COUNT(s.sID) sourced, SUM(s.submitted=1) submitted, SUM(s.isSentToClient='1') sentToClient
      ${regionCols.length ? ',' + regionCols.join(',') : ''} ${statusCols.length ? ',' + statusCols.join(',') : ''}
    FROM users u LEFT JOIN sourcing s ON s.assignedUserID=u.id AND s.deleted=0 AND IFNULL(s.profileStatusChangeDate, s.created_at) BETWEEN ? AND ?
    WHERE u.deleted=0 AND u.status=1 AND (u.isRecruiter=1 OR u.role_type IN (1,2,14)) ${teamSql}
    GROUP BY u.id HAVING sourced>0 OR submitted>0 ORDER BY submitted DESC, sourced DESC`, teamID ? [...params, teamID] : params);
  return {
    columns: [
      { key: 'sourced', label: 'Sourced' }, { key: 'submitted', label: 'Submitted' }, { key: 'sentToClient', label: 'Sent to client' },
      ...regions.map((r) => ({ key: `r_${r.regionID}`, label: `Sent · ${r.regionName}` })),
      ...statuses.map((s) => ({ key: `s_${s.pStatusID}`, label: s.profileStatus })),
    ],
    rows: rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v ?? 0]))),
  };
}

export async function technologyReport() {
  return query<any>(`SELECT g.groupName \`group\`, t.name technology, COUNT(DISTINCT p.pID) profiles
    FROM master_technology_role tr
    JOIN master_technology t ON t.technologySubGroupID=tr.technologySubGroupID
    LEFT JOIN technology_group g ON g.technologyGroupID=tr.technologyGroupID
    JOIN profile p ON p.deleted=0 AND FIND_IN_SET(tr.id, REPLACE(p.technologyRoleIDs,' ',''))
    GROUP BY g.groupName, t.name ORDER BY profiles DESC LIMIT 200`);
}

export async function pscareReport(from: string, to: string) {
  const byStatus = await query<any>(`SELECT IFNULL(NULLIF(candidatureStatus,''),'Not set') label, COUNT(*) value FROM candidate_data GROUP BY label ORDER BY value DESC`);
  const byClient = await query<any>(`SELECT IFNULL(NULLIF(endClient,''),'Not set') label, COUNT(*) value FROM candidate_data GROUP BY label ORDER BY value DESC LIMIT 15`);
  const byRecruiter = await query<any>(`SELECT TRIM(CONCAT(IFNULL(u.first_name,''),' ',IFNULL(u.last_name,''))) label, COUNT(*) value FROM candidate_data c LEFT JOIN users u ON u.id=c.recruiterID GROUP BY c.recruiterID ORDER BY value DESC LIMIT 15`);
  const starts = await query<any>(`SELECT DATE_FORMAT(created_at,'%Y-%m') label, COUNT(*) value FROM candidate_data WHERE created_at BETWEEN ? AND ? GROUP BY label ORDER BY label`, [`${from} 00:00:00`, `${to} 23:59:59`]);
  const ending = await query<any>(`SELECT cdID, candidateName, role, endClient, endDate FROM candidate_data
    WHERE COALESCE(STR_TO_DATE(endDate,'%Y-%m-%d'), STR_TO_DATE(endDate,'%d-%m-%Y')) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 60 DAY) ORDER BY endDate LIMIT 50`);
  return { byStatus, byClient, byRecruiter, starts, ending };
}

export async function requirementsReport(from: string, to: string) {
  const byClient = await query<any>(`SELECT IFNULL(c.clientName,'Not set') label, COUNT(*) value, SUM(r.openPositions) positions, SUM(r.subCount) submissions
    FROM requirement r LEFT JOIN master_client c ON c.clientID=r.client WHERE r.deleted=0 AND r.created_at BETWEEN ? AND ? GROUP BY r.client ORDER BY value DESC`, [`${from} 00:00:00`, `${to} 23:59:59`]);
  const byStatus = await query<any>(`SELECT IFNULL(st.requirementStatus, IF(r.active=1,'Open','Inactive')) label, COUNT(*) value FROM requirement r
    LEFT JOIN master_requirement_status st ON st.id=r.reqStatusID WHERE r.deleted=0 GROUP BY label`);
  const byPriority = await query<any>(`SELECT IFNULL(p.priority,'Not set') label, COUNT(*) value FROM requirement r LEFT JOIN master_priority p ON p.priorityID=r.priority WHERE r.deleted=0 GROUP BY label`);
  const ageing = await query<any>(`SELECT r.rID, r.roleName, c.clientName, DATEDIFF(CURDATE(), r.created_at) days,
      (SELECT COUNT(*) FROM sourcing s WHERE s.requirementID=r.rID AND s.deleted=0) sourced,
      (SELECT COUNT(*) FROM sourcing s WHERE s.requirementID=r.rID AND s.deleted=0 AND s.submitted=1) submitted
    FROM requirement r LEFT JOIN master_client c ON c.clientID=r.client WHERE r.deleted=0 AND r.active=1 ORDER BY days DESC LIMIT 50`);
  return { byClient, byStatus, byPriority, ageing };
}
