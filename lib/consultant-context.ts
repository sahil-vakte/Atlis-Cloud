import type { SessionUser } from './session';

const present = (value: string) =>
  "CASE WHEN UPPER(TRIM(" + value + ")) NOT IN ('', 'NULL', 'N/A') THEN TRIM(" + value + ") END";
const profile = (column: string) =>
  '(SELECT ' + present('p.' + column) + ' FROM profile p WHERE p.pID=candidate_data.profileID)';
const context = (column: string) =>
  '(SELECT ' + column + ' FROM pscare_engagement_context h WHERE h.cdID=candidate_data.cdID AND h.profileID=candidate_data.profileID)';
const coalesce = (...args: string[]) => 'COALESCE(' + args.join(', ') + ')';
const prefer = (col: string, fallback: string) => coalesce(present('candidate_data.' + col), fallback);

export const consultantNameSql = coalesce(
  present('candidate_data.candidateName'),
  profile('name'),
  context('h.historicalName'),
  "CONCAT('Consultant #', candidate_data.cdID)",
);

const basicFields: Record<string, string> = {
  candidateName: consultantNameSql,
  role: prefer('role', context('h.roleName')),
  jobLocation: prefer('jobLocation', context('h.jobLocation')),
  endClient: prefer('endClient', coalesce(context('h.endClientName'),
    context('(SELECT ' + present('ec.endClientName') + ' FROM master_end_client ec WHERE ec.id=h.endClientID)'))),
};

const contactFields: Record<string, string> = {
  candidateEmailID: prefer('candidateEmailID', profile('primaryEmail')),
  primaryContactNo: prefer('primaryContactNo', profile('primaryContact')),
  alternateContactNo: prefer('alternateContactNo', profile('alternateContactNo')),
};

const personalFields: Record<string, string> = {
  residentialStreetAddress: prefer('residentialStreetAddress', profile('profileAddressStreet')),
  residentialCity: prefer('residentialCity', profile('profileAddressCity')),
  residentialPostCode: prefer('residentialPostCode', profile('profileAddressPostalCode')),
  nationalityID: prefer('nationalityID', profile('nationality')),
  nationalInsuranceNo: prefer('nationalInsuranceNo', profile('nationalInsuranceNo')),
  emergencyContactName: prefer('emergencyContactName', profile('emergencyContactName')),
  emergencyContactNo: prefer('emergencyContactNo', profile('emergencyContactNo')),
  emergencyContactEmailID: prefer('emergencyContactEmailID', profile('emergencyContactEmailID')),
};

export function consultantDisplayFields(table: string, user: SessionUser): Record<string, string> {
  if (table !== 'candidate_data') return {};
  const ownProfile = (user.role === 3 || user.role === 16) && !!user.profileID;
  const staff = [1, 2, 14, 18, 21, 22, 27, 28, 30].includes(user.role);
  return {
    ...basicFields,
    ...(staff || ownProfile ? contactFields : {}),
    ...(staff ? {
      engagementClient: context('(SELECT ' + present('mc.clientName') + ' FROM master_client mc WHERE mc.clientID=h.clientID)'),
    } : {}),
    ...(user.role === 1 || user.role === 18 || ownProfile ? personalFields : {}),
  };
}
