/**
 * Module registry — one entry per screen of the old system.
 * The generic list / form / detail / export engine reads everything from here and from lib/schema.json,
 * so adding a column to the database or a module here needs no new UI code.
 */
import type { SessionUser } from './session';

export type Scope = (u: SessionUser) => { sql: string; params: any[] } | null;

export type ModuleDef = {
  key: string;
  label: string;
  singular: string;
  table: string;
  group: string;
  /** permission check_slug / href(s) that grant access (any match). Admin (role 1) always has access. */
  perms: string[];
  /** Permission option prefix e.g. 'req' → req_add, req_edit, req_delete, req_restore, req_export */
  actionPrefix?: string;
  titleField: string;
  listColumns: string[];
  searchColumns: string[];
  lookups?: Record<string, string>; // column → lookup key (prefix 'opt:' for app_options group)
  multi?: string[]; // columns holding comma-separated ids
  filters?: string[];
  baseWhere?: string;
  softDelete?: string | null; // column used for soft delete, null = hard delete
  defaultSort?: string;
  hidden?: string[]; // never show in forms
  readOnly?: boolean;
  formSections?: { title: string; fields: string[] }[];
  related?: { module: string; fk: string; label?: string }[];
  scope?: Scope;
  files?: string[]; // columns that hold an uploaded file name
  defaults?: Record<string, any>;
  icon?: string;
  /** Portal permissions that allow consultants / companies to add and edit their OWN (scoped) records. */
  portalEdit?: string[];
  /** Column holding candidate_data.cdID; filled with the portal user's own engagement on create. */
  ownerConsultantCol?: string;
};

const STATUS = { status: 'opt:status' };
const portal = {
  candidate: (col: string): Scope => (u) => (u.role === 16 || u.role === 3) && u.profileID ? { sql: `${col}=?`, params: [u.profileID] } : null,
  consultantOf: (col: string): Scope => (u) => {
    if ((u.role === 16 || u.role === 3) && u.profileID) return { sql: `${col} IN (SELECT cdID FROM candidate_data WHERE profileID=?)`, params: [u.profileID] };
    if (u.role === 17 && u.companyID) return { sql: `${col} IN (SELECT cdID FROM candidate_data WHERE companyID=?)`, params: [u.companyID] };
    if (u.role === 29 && u.subVendorID) return { sql: `${col} IN (SELECT cdID FROM candidate_data WHERE subVendorID=?)`, params: [u.subVendorID] };
    return null;
  },
  profileOf: (col: string): Scope => (u) => {
    if ((u.role === 16 || u.role === 3) && u.profileID) return { sql: `${col}=?`, params: [u.profileID] };
    if (u.role === 17 && u.companyID) return { sql: `${col} IN (SELECT profileID FROM candidate_data WHERE companyID=?)`, params: [u.companyID] };
    if (u.role === 29 && u.subVendorID) return { sql: `${col} IN (SELECT profileID FROM candidate_data WHERE subVendorID=?)`, params: [u.subVendorID] };
    if (u.role === 26) return { sql: `${col} IN (SELECT pID FROM profile WHERE vendorId IN (SELECT vendorID FROM master_vendor WHERE userID=?))`, params: [u.id] };
    return null;
  },
};

const recruitment: ModuleDef[] = [
  {
    key: 'requirements', label: 'Requirements', singular: 'Requirement', table: 'requirement', group: 'Recruitment', icon: 'clipboard-list',
    perms: ['requirements'], actionPrefix: 'req', titleField: 'roleName', softDelete: 'deleted', defaultSort: 'rID DESC',
    listColumns: ['rID', 'roleName', 'client', 'location', 'jobType', 'openPositions', 'priority', 'assignUserID', 'reqStatusID', 'active', 'created_at'],
    searchColumns: ['roleName', 'location', 'skillset', 'jobDescription', 'clientreqID', 'reqID', 'city', 'country'],
    lookups: { client: 'client', assignUserID: 'recruiter', regionID: 'region', teamID: 'team', ir35status: 'ir35', duration: 'duration', cCurrencyID: 'currency', bCurrencyID: 'currency', pocID: 'poc', pocRMid: 'poc', priority: 'priority', endClientID: 'endClient', accountID: 'account', reqStatusID: 'reqStatus', technologyID: 'technology', technologyRoleID: 'technologyRole', jobType: 'reqType', workMode: 'opt:work_mode', crateType: 'opt:rate_type', brateType: 'opt:rate_type', created_by_id: 'user', reqType: 'opt:req_category', active: 'opt:yesno', publish: 'opt:yesno', skillset: 'skill', technologyRoleIDs: 'technologyRole' },
    multi: ['assignUserID', 'regionID', 'teamID', 'jobType', 'pocRMid', 'technologyRoleIDs', 'skillset'],
    filters: ['client', 'priority', 'reqStatusID', 'assignUserID', 'regionID', 'teamID', 'jobType', 'pocID', 'skillset', 'active'],
    hidden: ['deleted', 'deleted_at', 'latitude', 'longitude', 'subCount', 'isSendUpdateEmail', 'isReqFromExcel', 'sendToEJB', 'ejbUrl', 'reqStatus'],
    formSections: [
      { title: 'Role', fields: ['roleName', 'clientreqID', 'client', 'endClientID', 'accountID', 'pocID', 'pocRMid', 'jobType', 'reqType', 'priority', 'reqStatusID', 'openPositions', 'duration', 'experience'] },
      { title: 'Location & working pattern', fields: ['location', 'city', 'state', 'country', 'zipcode', 'fulladdress', 'workMode', 'onsiteOn', 'hybridnoofdays'] },
      { title: 'Rates', fields: ['cCurrencyID', 'cRate', 'crateType', 'bCurrencyID', 'bRate', 'brateType', 'ir35status', 'payroll'] },
      { title: 'Assignment', fields: ['assignUserID', 'regionID', 'teamID', 'submissionFrom', 'submissionFormat', 'technologyID', 'technologyRoleID'] },
      { title: 'Description', fields: ['skillset', 'jobDescription', 'summary', 'additionalNotes', 'subject'] },
      { title: 'Publishing', fields: ['active', 'publish', 'showVendors', 'isBroadcast', 'isTechRequirment'] },
    ],
    related: [
      { module: 'sourcing', fk: 'requirementID', label: 'Sourcing' },
      { module: 'submissions', fk: 'requirementID', label: 'Submissions' },
      { module: 'requirement-comments', fk: 'requirementID', label: 'Comments' },
      { module: 'job-descriptions', fk: 'reqID', label: 'Structured JD' },
      { module: 'approach-candidates', fk: 'reqID', label: 'Approached candidates' },
    ],
    scope: (u) => {
      if (u.role === 31) return { sql: 'client IN (SELECT clientID FROM master_client WHERE userID=? OR user_id=?)', params: [u.id, u.id] };
      if (u.role === 26) return { sql: 'showVendors=1 AND active=1', params: [] };
      return null;
    },
    defaults: { active: 1, publish: 1, deleted: 0, cRate: '', priority: '' },
  },
  {
    key: 'profiles', portalEdit: ['candidate-my-profile'], label: 'Profiles', singular: 'Profile', table: 'profile', group: 'Recruitment', icon: 'user-round',
    perms: ['profile', 'candidate-my-profile'], actionPrefix: 'profile', titleField: 'name', softDelete: 'deleted', defaultSort: 'pID DESC',
    listColumns: ['pID', 'name', 'primaryEmail', 'primaryContact', 'currentLocation', 'designationID', 'skillset', 'assignedUserID', 'resumeName', 'created_at'],
    searchColumns: ['name', 'primaryEmail', 'primaryContact', 'skillset', 'currentLocation', 'cvContent', 'linkedin', 'city', 'country'],
    lookups: { assignedUserID: 'recruiter', regionID: 'region', teamID: 'team', nationality: 'nationality', workAuthID: 'workauth', vendorId: 'vendor', designationID: 'designation', profileSource: 'source', created_by_id: 'user', mr_miss: 'opt:salutation', gender: 'opt:gender', doNotCall: 'opt:yesno', skillset: 'skill', technologyRoleIDs: 'technologyRole' },
    multi: ['assignedUserID', 'regionID', 'teamID', 'skillset', 'technologyRoleIDs'],
    filters: ['assignedUserID', 'designationID', 'skillset', 'nationality', 'workAuthID', 'profileSource', 'vendorId', 'regionID', 'doNotCall'],
    files: ['resumeName', 'passportFileName', 'visaFileName', 'utilityBillFileName', 'drivingLicenceFileName', 'rtwFileName', 'greencardFileName', 'maskcvmanualFileName'],
    hidden: ['deleted', 'serverDetailsJson', 'latitude', 'longitude', 'isCvUploadedOnAws', 'userID', 'user_id', 'isProfileFromTestQ', 'isSentToCpp', 'isSentToEjb', 'cvContent'],
    formSections: [
      { title: 'Personal details', fields: ['mr_miss', 'name', 'primaryEmail', 'countryCode', 'primaryContact', 'alternateContactNo', 'dob', 'gender', 'linkedin'] },
      { title: 'Location', fields: ['currentLocation', 'city', 'state', 'country', 'zipcode', 'fulladdress', 'locationType'] },
      { title: 'Professional', fields: ['designationID', 'skillset', 'educationBackground', 'description', 'technologyRoleIDs'] },
      { title: 'Right to work', fields: ['nationality', 'byBirth', 'orignalnationality', 'workAuthID', 'workauthType', 'nationalInsuranceNo'] },
      { title: 'Ownership', fields: ['assignedUserID', 'regionID', 'teamID', 'profileSource', 'vendorId'] },
      { title: 'Compliance & notes', fields: ['doNotCall', 'dncMessage', 'consentStatus', 'gdprNotice', 'feedback', 'AdditionalNotes'] },
      { title: 'Emergency contact', fields: ['emergencyContactName', 'emergencyContactNo', 'emergencyContactEmailID'] },
    ],
    related: [
      { module: 'sourcing', fk: 'profileID', label: 'Sourcing' },
      { module: 'submissions', fk: 'profileID', label: 'Submissions' },
      { module: 'cv-versions', fk: 'pID', label: 'CV versions' },
      { module: 'consultants', fk: 'profileID', label: 'Engagements' },
      { module: 'parsed-cv-data', fk: 'profileID', label: 'Parsed CV data' },
      { module: 'profile-activity', fk: 'pID', label: 'Activity' },
    ],
    scope: portal.profileOf('pID'),
    defaults: { deleted: 0, fulladdress: '' },
  },
  {
    key: 'sourcing', label: 'Sourcing', singular: 'Sourcing', table: 'sourcing', group: 'Recruitment', icon: 'search',
    perms: ['sourcing'], actionPrefix: 'sourcing', titleField: 'sourcingName', softDelete: 'deleted', defaultSort: 'sID DESC',
    listColumns: ['sID', 'sourcingName', 'requirementID', 'profileID', 'clientID', 'cStatusID', 'pStatusID', 'assignedUserID', 'submitted', 'created_at'],
    searchColumns: ['sourcingName', 'currentLocation', 'notes', 'profileSummary', 'currentOrganization', 'currentDesignation', 'expertiseSkillsSets'],
    lookups: { requirementID: 'requirement', profileID: 'profile', assignedUserID: 'recruiter', regionID: 'region', teamID: 'team', clientID: 'client', nationalityID: 'nationality', workAuthID: 'workauth', durationID: 'duration', cStatusID: 'callStatus', sourceID: 'source', pStatusID: 'profileStatus', rejectionStage: 'rejection', cCurrencyID: 'currency', bCurrencyID: 'currency', CcurrencyID2: 'currency', bcurrencyID2: 'currency', entity: 'opt:business_entity', submitted: 'opt:yesno', created_by_id: 'user', modified_by_id: 'user' },
    multi: ['assignedUserID', 'teamID', 'regionID'],
    filters: ['requirementID', 'clientID', 'cStatusID', 'pStatusID', 'assignedUserID', 'sourceID', 'submitted', 'entity'],
    baseWhere: '1=1',
    hidden: ['deleted', 'deleted_at', 'signatureImagebase64', 'htmlMaskprivew', 'token', 'signatureCode', 'callStatusIdDummy', 'unique_pid', 'unique_sid', 'assigned_user_id', 'rtrCandidateDetails'],
    formSections: [
      { title: 'Match', fields: ['sourcingName', 'requirementID', 'profileID', 'clientID', 'entity', 'sourceID', 'assignedUserID', 'regionID', 'teamID'] },
      { title: 'Status', fields: ['cStatusID', 'pStatusID', 'rejectionStage', 'submitted', 'availability', 'noticePeriod', 'interview1', 'interview2', 'interview3'] },
      { title: 'Candidate', fields: ['currentLocation', 'currentOrganization', 'currentDesignation', 'currentCtc', 'totalExperience', 'relevantExperience', 'nationalityID', 'workAuthID', 'durationID', 'willingnessToRelocate', 'educationBackground'] },
      { title: 'Rates', fields: ['cCurrencyID', 'rateExpected', 'CpaymentMode', 'CtaxTerm', 'bCurrencyID', 'rateBilling', 'BpaymentMode', 'BtaxTerm'] },
      { title: 'Notes', fields: ['profileSummary', 'expertiseSkillsSets', 'notes', 'additionalNotes', 'internalNotes', 'candidateSkillMatrix'] },
    ],
    related: [{ module: 'skill-ratings', fk: 'sID', label: 'Skill ratings' }, { module: 'rtr-logs', fk: 'sourcingId', label: 'RTR emails' }],
    scope: portal.profileOf('profileID'),
    defaults: { deleted: 0, submitted: 0, signatureImagebase64: '' },
  },
  {
    key: 'submissions', label: 'Submissions', singular: 'Submission', table: 'sourcing', group: 'Recruitment', icon: 'send',
    perms: ['submission'], actionPrefix: 'submission', titleField: 'sourcingName', softDelete: 'deleted', defaultSort: 'sID DESC',
    baseWhere: 'submitted=1',
    listColumns: ['sID', 'generateSubmissionID', 'sourcingName', 'requirementID', 'profileID', 'clientID', 'pStatusID', 'entity', 'isSentToClient', 'submitted_date', 'assignedUserID'],
    searchColumns: ['sourcingName', 'generateSubmissionID', 'notes', 'profileSummary', 'currentOrganization'],
    lookups: { requirementID: 'requirement', profileID: 'profile', assignedUserID: 'recruiter', clientID: 'client', pStatusID: 'profileStatus', cStatusID: 'callStatus', rejectionStage: 'rejection', entity: 'opt:business_entity', isSentToClient: 'opt:yesno', regionID: 'region', teamID: 'team', cCurrencyID: 'currency', bCurrencyID: 'currency' },
    multi: ['assignedUserID', 'teamID', 'regionID'],
    filters: ['clientID', 'pStatusID', 'entity', 'isSentToClient', 'assignedUserID', 'rejectionStage'],
    hidden: ['deleted', 'deleted_at', 'signatureImagebase64', 'htmlMaskprivew', 'token', 'signatureCode', 'rtrCandidateDetails'],
    related: [{ module: 'submission-comments', fk: 'submissionId', label: 'Feedback & comments' }, { module: 'client-submission-logs', fk: 'submissionID', label: 'Sent to client log' }],
    scope: portal.profileOf('profileID'),
    defaults: { deleted: 0, submitted: 1, signatureImagebase64: '' },
  },
  {
    key: 'pipeline', label: 'Pipeline', singular: 'Pipeline entry', table: 'sourcing', group: 'Recruitment', icon: 'git-branch', readOnly: true,
    perms: ['pipeline', 'submission'], titleField: 'sourcingName', softDelete: 'deleted', defaultSort: 'profileStatusChangeDate DESC',
    baseWhere: 'submitted=1 AND isSentToClient=1',
    listColumns: ['sID', 'sourcingName', 'requirementID', 'clientID', 'pStatusID', 'interview1', 'interview2', 'interview3', 'profileStatusChangeDate'],
    searchColumns: ['sourcingName'], lookups: { requirementID: 'requirement', clientID: 'client', pStatusID: 'profileStatus' }, filters: ['clientID', 'pStatusID'],
  },
  {
    key: 'feedback-tracker', label: 'Feedback Tracker', singular: 'Feedback', table: 'comments', group: 'Recruitment', icon: 'message-square',
    perms: ['tracker', 'feedback-tracker'], titleField: 'comment', softDelete: 'deleted', defaultSort: 'id DESC',
    listColumns: ['id', 'submissionId', 'commentType', 'comment', 'interviewDateTime', 'userId', 'created_at'],
    searchColumns: ['comment', 'from_email', 'to_email'], lookups: { submissionId: 'sourcing', userId: 'user', commentType: 'opt:comment_type' }, filters: ['commentType', 'userId'],
    files: ['attachment'],
  },
  { key: 'submission-comments', label: 'Submission comments', singular: 'Comment', table: 'comments', group: 'Recruitment', perms: ['submission', 'tracker'], titleField: 'comment', softDelete: 'deleted', defaultSort: 'id DESC', listColumns: ['id', 'commentType', 'comment', 'interviewDateTime', 'userId', 'created_at'], searchColumns: ['comment'], lookups: { submissionId: 'sourcing', userId: 'user', commentType: 'opt:comment_type' }, files: ['attachment'] },
  { key: 'requirement-comments', label: 'Requirement comments', singular: 'Comment', table: 'requirement_comments', group: 'Recruitment', perms: ['requirements'], titleField: 'comment', softDelete: 'deleted', defaultSort: 'id DESC', listColumns: ['id', 'commentType', 'comment', 'userId', 'created_at'], searchColumns: ['comment'], lookups: { requirementID: 'requirement', userId: 'user', commentType: 'opt:comment_type' }, files: ['attachment'] },
  { key: 'job-descriptions', label: 'Structured job descriptions', singular: 'Job description', table: 'requirment_job_description', group: 'Recruitment', perms: ['requirements'], titleField: 'reqID', softDelete: null, defaultSort: 'id DESC', listColumns: ['id', 'reqID', 'experience', 'skills', 'mustHave', 'created_at'], searchColumns: ['jobDescription', 'skills'], lookups: { reqID: 'requirement' } },
  { key: 'approach-candidates', label: 'Approached candidates', singular: 'Approach', table: 'approach_candidate', group: 'Recruitment', perms: ['requirements', 'sourcing'], titleField: 'name', softDelete: null, defaultSort: 'approachCandidateID DESC', listColumns: ['approachCandidateID', 'name', 'email', 'contactNo', 'reqID', 'profileSource', 'created_at'], searchColumns: ['name', 'email', 'note'], lookups: { reqID: 'requirement', userID: 'user' }, files: ['attachment'] },
  { key: 'cv-versions', label: 'CV versions', singular: 'CV', table: 'cvprofile', group: 'Recruitment', perms: ['profile'], titleField: 'cvName', softDelete: 'deleted', defaultSort: 'cvID DESC', listColumns: ['cvID', 'cvName', 'uploadedDate', 'isDefault', 'userID'], searchColumns: ['cvName'], lookups: { pID: 'profile', userID: 'user', isDefault: 'opt:yesno' }, files: ['cvName'] },
  { key: 'parsed-cv-data', label: 'Parsed CV data', singular: 'Parsed CV', table: 'maskcvparcing', group: 'Recruitment', perms: ['profile'], titleField: 'profession', softDelete: null, defaultSort: 'id DESC', listColumns: ['id', 'profileID', 'profession', 'totalYearsExperience', 'skills', 'updated_at'], searchColumns: ['skills', 'profession', 'summary'], lookups: { profileID: 'profile' } },
  { key: 'mask-cv-settings', label: 'Masked CV settings', singular: 'Masked CV setting', table: 'maskcv_condition', group: 'Recruitment', perms: ['submission'], titleField: 'id', softDelete: null, listColumns: ['id', 'sourcingID', 'profileID', 'totalExp', 'skills'], searchColumns: [], lookups: { sourcingID: 'sourcing', profileID: 'profile' } },
  { key: 'skill-ratings', label: 'Skill ratings', singular: 'Skill rating', table: 'skill_rating', group: 'Recruitment', perms: ['sourcing'], titleField: 'skill', softDelete: 'deleted', listColumns: ['id', 'skill', 'rating', 'experience'], searchColumns: ['skill'], lookups: { sID: 'sourcing' } },
  { key: 'rtr-logs', label: 'RTR email log', singular: 'RTR email', table: 'rtr_email_logs', group: 'Recruitment', perms: ['sourcing'], titleField: 'emailTo', softDelete: null, readOnly: true, listColumns: ['id', 'sourcingId', 'emailFrom', 'emailTo', 'added_date'], searchColumns: ['emailTo'], lookups: { sourcingId: 'sourcing' } },
  { key: 'client-submission-logs', label: 'Email logs', singular: 'Email log', table: 'client_submission_logs', group: 'Recruitment', perms: ['submission-logs', 'submission'], titleField: 'id', softDelete: null, readOnly: true, defaultSort: 'id DESC', listColumns: ['id', 'submissionID', 'clientID', 'fromID', 'toPocID', 'created_at'], searchColumns: [], lookups: { submissionID: 'sourcing', clientID: 'client', fromID: 'user', toPocID: 'poc' } },
  { key: 'favourite-profiles', label: 'Favourite profiles', singular: 'Favourite', table: 'favorite_profile', group: 'Recruitment', perms: ['profile'], titleField: 'pID', softDelete: 'deleted', listColumns: ['id', 'pID', 'userID', 'created_at'], searchColumns: [], lookups: { pID: 'profile', userID: 'user' } },
  { key: 'client-profiles', label: 'Profiles shared with clients', singular: 'Client profile', table: 'clientprofiles', group: 'Recruitment', perms: ['profile'], titleField: 'pID', softDelete: 'deleted', listColumns: ['clientProfileID', 'pID', 'clientID', 'uploadeddate', 'isdefault'], searchColumns: [], lookups: { pID: 'profile', clientID: 'client' } },
  { key: 'client-requirements', label: 'Client-submitted requirements', singular: 'Client requirement', table: 'client_requirement', group: 'Recruitment', perms: ['requirements'], titleField: 'roleName', softDelete: 'is_deleted', listColumns: ['id', 'roleName', 'name', 'email', 'location', 'openPositions', 'budget', 'status', 'created_at'], searchColumns: ['roleName', 'name', 'email', 'description'] },
  { key: 'internships', label: 'Internship applications', singular: 'Application', table: 'internship', group: 'Recruitment', perms: ['profile'], titleField: 'name', softDelete: null, listColumns: ['id', 'name', 'email', 'phoneNo', 'collageName', 'degree', 'internshipRole', 'created_at'], searchColumns: ['name', 'email', 'collageName'] },
];

const consultantClosure: ModuleDef = {
  key: 'consultants', label: 'Contract Closures', singular: 'Consultant', table: 'candidate_data', group: 'PS Care', icon: 'handshake',
  perms: ['contract-closures', 'pscare_contractClosure', 'umbrella-contracts-list', 'sub-vendor-engagements', 'ownCompany-my-contract'], actionPrefix: 'contractClosure', titleField: 'candidateName', softDelete: null, defaultSort: 'cdID DESC',
  listColumns: ['cdID', 'profileID', 'candidateName', 'candidateEmailID', 'primaryContactNo', 'role', 'jobLocation', 'endClient', 'recruiterID', 'jobType', 'startDate', 'endDate', 'candidatureStatus', 'companyID'],
  searchColumns: ['candidateName', 'candidateEmailID', 'role', 'endClient', 'jobLocation', 'referenceID', 'vendorName'],
  lookups: { profileID: 'profile', userID: 'user', sourcingID: 'sourcing', companyID: 'company', subVendorID: 'subVendor', pocID: 'poc', recruiterID: 'recruiter', nationalityID: 'nationality', visaStatusID: 'visa', engagementType: 'engagementType', incentiveID: 'incentive', jobType: 'opt:closure_job_type', candidatureStatus: 'opt:closure_status', status: 'opt:status' },
  filters: ['recruiterID', 'companyID', 'subVendorID', 'pocID', 'jobType', 'candidatureStatus', 'engagementType'],
  hidden: ['candidatePassword', 'invoiceConsentToken', 'invoiceConsentLinkExpiry', 'quarterKey'],
  formSections: [
    { title: 'Engagement', fields: ['candidateName', 'candidateEmailID', 'primaryContactNo', 'role', 'jobType', 'engagementType', 'closerType', 'candidatureStatus', 'startDate', 'endDate', 'jobLocation', 'endClient', 'implementationPartner', 'referenceID'] },
    { title: 'Links', fields: ['profileID', 'sourcingID', 'recruiterID', 'pocID', 'companyID', 'subVendorID', 'vendorName'] },
    { title: 'Commercials', fields: ['candidateRate', 'rateBilling', 'IR35Status', 'paymentTerm', 'paymentCycle', 'timesheetCycle', 'dailyMarginGbp', 'marginGbp', 'marginPure', 'marginOutgoing', 'othercost', 'incentiveID'] },
    { title: 'Access', fields: ['istimesheetAccess', 'isinvoiceAccess', 'isexpensesAccess', 'isvatAccess', 'timesheetReminder'] },
    { title: 'Personal', fields: ['residentialStreetAddress', 'residentialCity', 'residentialPostCode', 'nationalityID', 'visaStatusID', 'nationalInsuranceNo', 'emergencyContactName', 'emergencyContactNo', 'emergencyContactEmailID'] },
    { title: 'Limited company', fields: ['regiCompanyName', 'regiCompanyNo', 'regiCompanyVATNo', 'regiCompanyUTR', 'regiCompanyStreetAddress', 'regiCompanyCity', 'regiCompanyPostCode', 'regiCompanyAccountHolderName', 'regiCompanyBankAccountNo', 'regiCompanyBankSortCode', 'regiCompanyBankIBANno', 'regiCompanyBankSWIFTno', 'regiCompanyBankAddr'] },
    { title: 'Client contacts', fields: ['rmName', 'rmEmail', 'rmMobile', 'spocName', 'spocEmail', 'spocMobile'] },
  ],
  related: [
    { module: 'consultant-progress', fk: 'cdID', label: 'Onboarding progress' },
    { module: 'timesheets', fk: 'pID', label: 'Timesheets' },
    { module: 'invoices', fk: 'pID', label: 'Invoices' },
    { module: 'candidate-documents', fk: 'pID', label: 'Documents' },
    { module: 'contracts', fk: 'cdID', label: 'Contracts' },
    { module: 'po-details', fk: 'cdID', label: 'Purchase orders' },
    { module: 'expenses', fk: 'cdID', label: 'Expenses' },
    { module: 'client-invoices', fk: 'cdID', label: 'Client invoices' },
    { module: 'pscare-comments', fk: 'consultantId', label: 'PS Care comments' },
    { module: 'bank-details', fk: 'cdID', label: 'Bank details' },
    { module: 'consultant-activity', fk: 'cdID', label: 'Activity' },
  ],
  scope: (u) => {
    if ((u.role === 16 || u.role === 3) && u.profileID) return { sql: 'profileID=?', params: [u.profileID] };
    if (u.role === 17 && u.companyID) return { sql: 'companyID=?', params: [u.companyID] };
    if (u.role === 29 && u.subVendorID) return { sql: 'subVendorID=?', params: [u.subVendorID] };
    return null;
  },
};

const psCare: ModuleDef[] = [
  consultantClosure,
  {
    ...consultantClosure,
    key: 'permanent-closures',
    label: 'Permanent Closures',
    singular: 'Closure',
    perms: ['contract-closures', 'pscare_permanentClosure'],
    actionPrefix: 'permanentClosure',
    baseWhere: "(TRIM(jobType)='2' OR jobType LIKE '%Permanent%')",
  },
  { key: 'consultant-progress', label: 'Onboarding progress', singular: 'Progress', table: 'candidate_progress', group: 'PS Care', perms: ['contract-closures'], titleField: 'cdID', softDelete: null, listColumns: ['id', 'cdID', 'welcome_email', 'documentation', 'contract', 'background_verification', 'invoice_status', 'incentive_status'], searchColumns: [], lookups: { cdID: 'consultant' } },
  { key: 'contracts', label: 'Contracts', singular: 'Contract', table: 'candidate_contract', group: 'PS Care', icon: 'file-signature', perms: ['contract-closures', 'my-contract', 'ownCompany-my-contract', 'umbrella-contracts-list'], titleField: 'contractType', softDelete: null, defaultSort: 'id DESC', listColumns: ['id', 'cdID', 'contractType', 'fromDate', 'toDate', 'rateExpected', 'status', 'created_at'], searchColumns: ['contractType', 'fileName'], lookups: { cdID: 'consultant', cCurrencyID: 'currency', contractType: 'contractType' }, files: ['fileName', 'signedContractFileName'], scope: portal.consultantOf('cdID') },
  { key: 'po-details', label: 'Purchase orders', singular: 'PO', table: 'po_details', group: 'PS Care', perms: ['contract-closures'], titleField: 'po_no', softDelete: null, listColumns: ['id', 'cdID', 'po_no', 'po_start_date', 'po_end_date', 'po_currency', 'po_value', 'status'], searchColumns: ['po_no'], lookups: { cdID: 'consultant', po_currency: 'currency' }, files: ['po_attachment'] },
  { key: 'timesheets', portalEdit: ['umbrella-timesheet', 'ownCompany-timesheet', 'sub-vendor-timesheet'], label: 'Timesheets', singular: 'Timesheet', table: 'candidate_timesheet', group: 'PS Care', icon: 'calendar-days', perms: ['pscare_timesheets', 'umbrella-timesheet', 'ownCompany-timesheet', 'sub-vendor-timesheet', 'contract-closures'], actionPrefix: 'timesheet', titleField: 'timesheetMonth', softDelete: 'deleted', defaultSort: 'timesheetID DESC', listColumns: ['timesheetID', 'pID', 'timesheetMonth', 'fromDate', 'toDate', 'totalWorkingDays', 'verificationStatus', 'verifiedByID', 'created_at'], searchColumns: ['timesheetMonth', 'note', 'adminRemark'], lookups: { pID: 'consultant', verifiedByID: 'user', verificationStatus: 'opt:approval_status' }, filters: ['verificationStatus', 'pID'], files: ['uploadedDoc', 'approvalDoc'], scope: portal.consultantOf('pID'), ownerConsultantCol: 'pID' },
  { key: 'invoices', portalEdit: ['umbrella-invoice', 'ownCompany-invoice', 'sub-vendor-invoice'], label: 'Consultant invoices', singular: 'Invoice', table: 'candidate_invoice', group: 'PS Care', icon: 'receipt', perms: ['pscare_invoices', 'umbrella-invoice', 'ownCompany-invoice', 'sub-vendor-invoice', 'contract-closures'], actionPrefix: 'invoice', titleField: 'invoiceNo', softDelete: 'deleted', defaultSort: 'invoiceID DESC', listColumns: ['invoiceID', 'invoiceNo', 'pID', 'invoiceMonth', 'amount', 'vatAmount', 'grossAmount', 'currencyID', 'verificationStatus', 'payDate'], searchColumns: ['invoiceNo', 'invoiceMonth', 'adminRemark'], lookups: { pID: 'consultant', currencyID: 'currency', verifiedByID: 'user', verificationStatus: 'opt:approval_status' }, filters: ['verificationStatus', 'currencyID', 'invoiceType'], files: ['uploadedDoc', 'paidInvAttachment'], scope: portal.consultantOf('pID'), ownerConsultantCol: 'pID' },
  { key: 'client-invoices', label: 'Client invoices', singular: 'Client invoice', table: 'client_invoice', group: 'Finance', icon: 'landmark', perms: ['contract-closures', 'crm-account-list'], titleField: 'invoiceNo', softDelete: 'deleted', defaultSort: 'id DESC', listColumns: ['id', 'invoiceNo', 'cdID', 'clientID', 'invoiceMonth', 'amount', 'currencyID', 'dueDate', 'verificationStatus'], searchColumns: ['invoiceNo'], lookups: { cdID: 'consultant', clientID: 'client', currencyID: 'currency', verificationStatus: 'opt:approval_status' }, files: ['uploadedDoc'] },
  { key: 'expenses', portalEdit: ['my-expenses'], label: 'Expenses', singular: 'Expense claim', table: 'expenserequest', group: 'PS Care', icon: 'wallet', perms: ['my-expenses', 'pscare_expenses', 'contract-closures'], titleField: 'expenseMonth', softDelete: 'deleted', defaultSort: 'expID DESC', listColumns: ['expID', 'cdID', 'expenseMonth', 'expenseYear', 'fromDate', 'toDate', 'currencyID', 'verificationStatus', 'created_at'], searchColumns: ['expenseMonth', 'remark'], lookups: { cdID: 'consultant', currencyID: 'currency', verificationStatus: 'opt:approval_status' }, filters: ['verificationStatus'], related: [{ module: 'expense-lines', fk: 'expID', label: 'Expense lines' }], scope: portal.consultantOf('cdID'), ownerConsultantCol: 'cdID' },
  { key: 'expense-lines', portalEdit: ['my-expenses'], label: 'Expense lines', singular: 'Expense line', table: 'expensedetailsrequest', group: 'PS Care', perms: ['my-expenses', 'pscare_expenses', 'contract-closures'], titleField: 'expenseType', softDelete: 'deleted', listColumns: ['expDetailsID', 'expID', 'expenseType', 'expenseNature', 'currency', 'amount', 'verificationStatus'], searchColumns: ['expenseType', 'remark'], lookups: { expID: 'expense', currency: 'currency', verificationStatus: 'opt:approval_status' }, files: ['documentName'] },
  { key: 'pscare-comments', label: 'PS Care comments', singular: 'Comment', table: 'pscare_comments', group: 'PS Care', perms: ['contract-closures'], titleField: 'comment', softDelete: 'deleted', defaultSort: 'id DESC', listColumns: ['id', 'consultantId', 'pscareCommentType', 'comment', 'userId', 'created_at'], searchColumns: ['comment'], lookups: { consultantId: 'consultant', userId: 'user', pscareCommentType: 'pscareCommentType' }, files: ['uploadedDoc'] },
  { key: 'bank-details', portalEdit: ['candidate-my-profile'], label: 'Bank details', singular: 'Bank detail', table: 'independentbankdetails', group: 'PS Care', perms: ['contract-closures', 'candidate-my-profile'], titleField: 'bankName', softDelete: 'deleted', listColumns: ['id', 'cdID', 'bankHolderName', 'bankName', 'bankCurrency', 'payContry'], searchColumns: ['bankHolderName', 'bankName'], lookups: { cdID: 'consultant' }, files: ['independentbankProofFile'], scope: portal.consultantOf('cdID'), ownerConsultantCol: 'cdID' },
  { key: 'candidate-documents', portalEdit: ['candidate-my-profile', 'umbrella-company-info'], label: 'Candidate documents', singular: 'Document', table: 'candidate_documents', group: 'PS Care', icon: 'folder-open', perms: ['contract-closures', 'profile', 'candidate-my-profile'], titleField: 'documentTitle', softDelete: null, defaultSort: 'documentID DESC', listColumns: ['documentID', 'pID', 'docListID', 'documentTitle', 'approvalStatus', 'validityofRTW', 'dateAdded'], searchColumns: ['documentTitle'], lookups: { pID: 'consultant', docListID: 'docList', approvedBy: 'user', approvalStatus: 'opt:approval_status' }, files: ['filePath'], scope: portal.consultantOf('pID'), ownerConsultantCol: 'pID' },
  { key: 'email-preferences', label: 'Email preferences', singular: 'Preference', table: 'preferenceemail', group: 'PS Care', perms: ['contract-closures'], titleField: 'cdID', softDelete: null, listColumns: ['id', 'cdID', 'ccEmail', 'bccEmail'], searchColumns: [], lookups: { cdID: 'consultant' } },
  { key: 'pscare-email-log', label: 'PS Care email log', singular: 'Email', table: 'email_log', group: 'PS Care', icon: 'mail-check', perms: ['pscare_emails', 'contract-closures'], titleField: 'subject', softDelete: 'deleted', readOnly: true, defaultSort: 'emailLogID DESC', listColumns: ['emailLogID', 'subject', 'emailTo', 'templateID', 'scheduling', 'emailStatus', 'created_at'], searchColumns: ['subject', 'emailTo'], lookups: { templateID: 'pscareTemplate', authUserID: 'user' } },
  { key: 'reminder-email-log', label: 'Reminder email log', singular: 'Email', table: 'cronjob_email_log', group: 'PS Care', perms: ['contract-closures'], titleField: 'subject', softDelete: null, readOnly: true, defaultSort: 'id DESC', listColumns: ['id', 'cdID', 'type', 'toemail', 'subject', 'date'], searchColumns: ['subject', 'toemail'], lookups: { cdID: 'consultant' } },
  { key: 'contract-pdfs', label: 'Contract annexures', singular: 'Annexure', table: 'contract_pdf_details', group: 'PS Care', perms: ['contract-closures'], titleField: 'pdfID', softDelete: null, listColumns: ['pdfID', 'candidateID', 'annexureAFileName', 'annexureBFileName', 'candidateAnnexureAStatus', 'candidateAnnexureBStatus'], searchColumns: [] },
  { key: 'invoice-exceptions', label: 'Invoice exception emails', singular: 'Exception', table: 'invoiceexceptionemail', group: 'Finance', perms: ['contract-closures'], titleField: 'AR_subject', softDelete: null, listColumns: ['id', 'invoiceID', 'AR_to', 'AR_subject', 'ARstatus'], searchColumns: ['AR_subject'] },
];

const companies: ModuleDef[] = [
  { key: 'clients', label: 'Clients', singular: 'Client', table: 'master_client', group: 'Clients & Vendors', icon: 'building-2', perms: ['psMaster', 'clientmasters', 'crm-account-list'], titleField: 'clientName', softDelete: 'deleted', defaultSort: 'clientID DESC', listColumns: ['clientID', 'clientName', 'refNumber', 'primaryContactName', 'primaryEmail', 'clientAddressCity', 'clientAddressCountry', 'assignedUserID', 'status'], searchColumns: ['clientName', 'email', 'primaryEmail', 'primaryContactName', 'website', 'refNumber'], lookups: { region_id: 'region', team_id: 'team', assignedUserID: 'user', bdmID: 'user', entityID: 'entity', serviceID: 'service', priority: 'priority', status: 'opt:status' }, multi: ['region_id', 'team_id', 'assignedUserID', 'serviceID'], filters: ['assignedUserID', 'region_id', 'status'], files: ['clientLogo'], related: [{ module: 'pocs', fk: 'client_id', label: 'Points of contact' }, { module: 'client-documents', fk: 'clientID', label: 'Documents' }, { module: 'requirements', fk: 'client', label: 'Requirements' }] },
  { key: 'pocs', label: 'Client POCs', singular: 'POC', table: 'master_poc', group: 'Clients & Vendors', icon: 'contact', perms: ['psMaster', 'clientmasters'], titleField: 'pocName', softDelete: 'deleted', defaultSort: 'pocID DESC', listColumns: ['pocID', 'pocName', 'client_id', 'primaryEmail', 'primaryContact', 'pocLocation', 'status'], searchColumns: ['pocName', 'firstName', 'lastName', 'primaryEmail'], lookups: { client_id: 'client', region_id: 'region', status: 'opt:status' }, filters: ['client_id'] },
  { key: 'client-documents', label: 'Client documents', singular: 'Document', table: 'client_documents', group: 'Clients & Vendors', perms: ['psMaster', 'clientmasters', 'crm-account-list'], titleField: 'documentName', softDelete: 'deleted', listColumns: ['clientDocumentID', 'documentName', 'clientID', 'documentTypeID', 'startDate', 'endDate', 'entity', 'status'], searchColumns: ['documentName', 'comment'], lookups: { clientID: 'client', userID: 'user', documentTypeID: 'clientDocType', entity: 'opt:business_entity' }, files: ['documentFile'] },
  { key: 'end-clients', label: 'End clients', singular: 'End client', table: 'master_end_client', group: 'Clients & Vendors', perms: ['psMaster'], titleField: 'endClientName', softDelete: 'deleted', listColumns: ['id', 'endClientName', 'sector', 'country', 'regionID', 'status'], searchColumns: ['endClientName', 'sector'], lookups: { regionID: 'region', status: 'opt:status' } },
  { key: 'vendors', label: 'Vendors', singular: 'Vendor', table: 'master_vendor', group: 'Clients & Vendors', icon: 'store', perms: ['vendormaster', 'psMaster'], titleField: 'vendorName', softDelete: 'deleted', defaultSort: 'vendorID DESC', listColumns: ['vendorID', 'vendorName', 'pocNameOne', 'pocEmailOne', 'vendorLocation', 'vendorCountry', 'assignManager', 'status'], searchColumns: ['vendorName', 'pocNameOne', 'pocEmailOne', 'vendorSkillsets', 'vendorWebsite'], lookups: { assignManager: 'user', currencyID: 'currency', serviceID: 'service', userID: 'user', status: 'opt:status' }, multi: ['serviceID'], filters: ['assignManager', 'vendorCountry'], related: [{ module: 'vendor-financials', fk: 'vendorID', label: 'Financials' }, { module: 'vendor-partners', fk: 'vendorID', label: 'Statutory information' }] },
  { key: 'vendor-financials', label: 'Vendor financials', singular: 'Financial year', table: 'vendorfinancialinfo', group: 'Clients & Vendors', perms: ['vendormaster', 'vendor-finance'], titleField: 'financialYear', softDelete: null, listColumns: ['financialID', 'vendorID', 'financialYear', 'financialTurnover', 'financialProfit'], searchColumns: [], lookups: { vendorID: 'vendor' } },
  { key: 'vendor-partners', label: 'Vendor statutory information', singular: 'Partner', table: 'statutoryinformation', group: 'Clients & Vendors', perms: ['vendormaster'], titleField: 'partnersName', softDelete: 'deleted', listColumns: ['id', 'vendorID', 'partnersName', 'partnersType', 'dateofJoining'], searchColumns: ['partnersName'], lookups: { vendorID: 'vendor' } },
  { key: 'companies', portalEdit: ['umbrella-company-info', 'ownCompany-company-info'], label: 'Umbrella & own companies', singular: 'Company', table: 'master_company', group: 'Clients & Vendors', icon: 'building', perms: ['psMaster', 'umbrella-company-info', 'ownCompany-company-info', 'companyMaster'], titleField: 'regiCompanyName', softDelete: 'deleted', defaultSort: 'id DESC', listColumns: ['id', 'regiCompanyName', 'companyType', 'regiCompanyEmail', 'companyPhoneNo', 'regiCompanyNo', 'status'], searchColumns: ['regiCompanyName', 'regiCompanyEmail', 'regiCompanyNo', 'refNumber'], lookups: { userID: 'user', countryID: 'country', bankCurrency: 'currency', status: 'opt:status' }, files: ['proofOfBank', 'insuranceProof'], related: [{ module: 'company-documents', fk: 'companyID', label: 'Documents' }, { module: 'consultants', fk: 'companyID', label: 'Consultants' }], scope: (u) => (u.role === 17 && u.companyID ? { sql: 'id=?', params: [u.companyID] } : null) },
  { key: 'company-documents', portalEdit: ['umbrella-company-info'], label: 'Company documents', singular: 'Document', table: 'company_documents', group: 'Clients & Vendors', perms: ['psMaster', 'umbrella-company-info'], titleField: 'documentTitle', softDelete: null, listColumns: ['id', 'companyID', 'documentTitle', 'docListID', 'approvalStatus', 'startDate', 'endDate'], searchColumns: ['documentTitle'], lookups: { companyID: 'company', docListID: 'docList', approvalStatus: 'opt:approval_status' }, files: ['filePath'] },
  { key: 'sub-vendors', portalEdit: ['sub-vendor-info'], label: 'Sub-vendors', singular: 'Sub-vendor', table: 'master_sub_vendor', group: 'Clients & Vendors', icon: 'network', perms: ['psMaster', 'sub-vendor-info'], titleField: 'regiCompanyName', softDelete: 'deleted', listColumns: ['id', 'regiCompanyName', 'regiCompanyEmail', 'companyPhoneNo', 'regiCompanyNo', 'status'], searchColumns: ['regiCompanyName', 'regiCompanyEmail'], lookups: { userID: 'user', countryID: 'country', bankCurrency: 'currency', status: 'opt:status' }, files: ['proofOfBank', 'insuranceProof'], related: [{ module: 'sub-vendor-documents', fk: 'subVendorID', label: 'Documents' }, { module: 'consultants', fk: 'subVendorID', label: 'Consultants' }], scope: (u) => (u.role === 29 && u.subVendorID ? { sql: 'id=?', params: [u.subVendorID] } : null) },
  { key: 'sub-vendor-documents', portalEdit: ['sub-vendor-info'], label: 'Sub-vendor documents', singular: 'Document', table: 'subvendor_documents', group: 'Clients & Vendors', perms: ['psMaster', 'sub-vendor-info'], titleField: 'documentTitle', softDelete: null, listColumns: ['id', 'subVendorID', 'documentTitle', 'approvalStatus', 'startDate', 'endDate'], searchColumns: ['documentTitle'], lookups: { subVendorID: 'subVendor', docListID: 'docList', approvalStatus: 'opt:approval_status' }, files: ['filePath'] },
  { key: 'suppliers', label: 'Suppliers', singular: 'Supplier', table: 'master_supplier', group: 'Clients & Vendors', perms: ['psMaster'], titleField: 'regiCompanyName', softDelete: null, listColumns: ['supplierID', 'regiCompanyName', 'regiCompanyCity', 'regiCompanyNo', 'companyEmailID'], searchColumns: ['regiCompanyName'] },
  { key: 'implementation-partners', label: 'Implementation partners', singular: 'Partner', table: 'master_implementation_partner', group: 'Clients & Vendors', perms: ['psMaster'], titleField: 'implemetationPartnerName', softDelete: null, listColumns: ['ipID', 'implemetationPartnerName', 'clientID', 'location', 'noticePeriod', 'status'], searchColumns: ['implemetationPartnerName'], lookups: { clientID: 'client' } },
];

const crm: ModuleDef[] = [
  { key: 'crm-prospects', label: 'Prospects', singular: 'Prospect', table: 'prospects', group: 'CRM', icon: 'target', perms: ['crm-prospect-list', 'crm-account-list', 'crm-leads', 'crm-opportunities'], titleField: 'companyName', softDelete: 'deleted', defaultSort: 'id DESC', listColumns: ['id', 'companyName', 'email', 'website', 'clientAddressCity', 'clientAddressCountry', 'priority', 'progressStage', 'inPipeline', 'winLost'], searchColumns: ['companyName', 'email', 'website', 'accountSummary', 'agenda'], lookups: { region_id: 'region', serviceID: 'service', priority: 'priority', connectorID: 'opt:yesno' }, multi: ['serviceID', 'region_id'], filters: ['priority', 'progressStage', 'clientAddressCountry'], files: ['clientLogo', 'attachmentFile'], related: [{ module: 'crm-contacts', fk: 'prospectID', label: 'Contacts' }, { module: 'crm-prospect-comments', fk: 'prospectID', label: 'Comments' }, { module: 'crm-prospect-documents', fk: 'prospectID', label: 'Documents' }, { module: 'crm-connectors', fk: 'prospectId', label: 'Connectors' }] },
  { key: 'crm-contacts', label: 'Prospect contacts', singular: 'Contact', table: 'prospects_contact', group: 'CRM', icon: 'contact-round', perms: ['crm-account-list', 'crm-contacts'], titleField: 'firstName', softDelete: 'deleted', defaultSort: 'prospectContactID DESC', listColumns: ['prospectContactID', 'firstName', 'lastName', 'designation', 'email', 'phoneNo', 'prospectID', 'country'], searchColumns: ['firstName', 'lastName', 'email', 'designation'], lookups: { prospectID: 'prospect' }, filters: ['prospectID'], related: [{ module: 'crm-contact-comments', fk: 'prospectContactID', label: 'Comments' }] },
  { key: 'crm-prospect-comments', label: 'Prospect comments', singular: 'Comment', table: 'prospect_comment', group: 'CRM', perms: ['crm-account-list'], titleField: 'comment', softDelete: 'deleted', listColumns: ['prospectCommentID', 'prospectID', 'comment', 'userID', 'created_at'], searchColumns: ['comment'], lookups: { prospectID: 'prospect', userID: 'user' }, files: ['attachment'] },
  { key: 'crm-contact-comments', label: 'Contact comments', singular: 'Comment', table: 'prospect_contact_comment', group: 'CRM', perms: ['crm-account-list'], titleField: 'comment', softDelete: 'deleted', listColumns: ['prospectContactCommentId', 'prospectContactID', 'comment', 'userID', 'created_at'], searchColumns: ['comment'], lookups: { prospectContactID: 'prospectContact', prospectID: 'prospect', userID: 'user' }, files: ['attachment'] },
  { key: 'crm-prospect-documents', label: 'Prospect documents', singular: 'Document', table: 'prospect_documents', group: 'CRM', perms: ['crm-account-list'], titleField: 'documentName', softDelete: 'deleted', listColumns: ['prospectDocumentID', 'documentName', 'prospectID', 'startDate', 'endDate'], searchColumns: ['documentName'], lookups: { prospectID: 'prospect', userID: 'user', documentTypeID: 'clientDocType' }, files: ['documentFile'] },
  { key: 'crm-connectors', label: 'Connectors', singular: 'Connector', table: 'prospects_connectors', group: 'CRM', perms: ['crm-account-list', 'connector-master'], titleField: 'firstName', softDelete: 'deleted', listColumns: ['prospectConnectorId', 'firstName', 'lastName', 'email', 'phoneNo', 'prospectId'], searchColumns: ['firstName', 'lastName', 'email'], lookups: { prospectId: 'prospect' } },
  { key: 'crm-accounts', label: 'Accounts', singular: 'Account', table: 'master_accounts', group: 'CRM', icon: 'briefcase', perms: ['crm-account-list'], titleField: 'name', softDelete: 'deleted', listColumns: ['accountID', 'refNumber', 'name', 'country', 'type', 'progressStage', 'status'], searchColumns: ['name', 'refNumber'], related: [{ module: 'crm-account-comments', fk: 'accountID', label: 'Comments' }, { module: 'crm-account-contacts', fk: 'pocID', label: 'Contacts' }] },
  { key: 'crm-account-comments', label: 'Account comments', singular: 'Comment', table: 'account_comments', group: 'CRM', perms: ['crm-account-list'], titleField: 'comment', softDelete: 'deleted', listColumns: ['id', 'accountID', 'commentType', 'comment', 'userId', 'created_at'], searchColumns: ['comment'], lookups: { accountID: 'account', userId: 'user', commentType: 'opt:comment_type' }, files: ['attachment'] },
  { key: 'crm-account-contacts', label: 'Account contacts', singular: 'Contact', table: 'contact', group: 'CRM', perms: ['crm-account-list', 'crm-contacts'], titleField: 'firstName', softDelete: null, listColumns: ['contactID', 'firstName', 'lastName', 'email', 'phoneNo', 'type', 'city'], searchColumns: ['firstName', 'lastName', 'email'], lookups: { pocID: 'account' }, related: [{ module: 'crm-contact-notes', fk: 'contactID', label: 'Notes' }] },
  { key: 'crm-contact-notes', label: 'Contact notes', singular: 'Note', table: 'contact_notes', group: 'CRM', perms: ['crm-account-list'], titleField: 'comments', softDelete: 'deleted', listColumns: ['noteID', 'contactID', 'comments', 'userID', 'created_at'], searchColumns: ['comments'], lookups: { contactID: 'contact', userID: 'user' }, files: ['uploadedDoc'] },
  { key: 'linkedin-tracking', label: 'LinkedIn tracking', singular: 'Week', table: 'linkedin_tracking', group: 'CRM', icon: 'linkedin', perms: ['crm-account-list', 'users'], titleField: 'weekDateRange', softDelete: 'deleted', listColumns: ['id', 'account', 'userID', 'weekDateRange', 'followers', 'connections'], searchColumns: ['account'], lookups: { userID: 'user' }, files: ['attachment'] },
];

const content: ModuleDef[] = [
  { key: 'knowledge-base', label: 'Knowledge Base', singular: 'Article', table: 'knowledge_base_article', group: 'Workspace', icon: 'book-open', perms: ['knowledge-base'], actionPrefix: 'knowledgebase', titleField: 'name', softDelete: 'deleted', defaultSort: 'id DESC', listColumns: ['id', 'name', 'categoryID', 'type', 'language', 'publish_date', 'expiration_date', 'status'], searchColumns: ['name', 'description', 'body'], lookups: { categoryID: 'kbCategory', regionId: 'region', status: 'opt:status' }, filters: ['categoryID', 'status'], files: ['attachment'] },
  { key: 'kb-categories', label: 'Knowledge Base categories', singular: 'Category', table: 'knowledge_base_category', group: 'Masters', perms: ['knowledge-base', 'psMaster'], titleField: 'name', softDelete: 'deleted', listColumns: ['id', 'name', 'roleType', 'order', 'status'], searchColumns: ['name'], lookups: { roleType: 'role', parent_id: 'kbCategory', status: 'opt:status' } },
  { key: 'task-tracker', label: 'Task Tracker', singular: 'Task', table: 'task_tracker', group: 'Workspace', icon: 'list-checks', perms: ['task-tracker'], titleField: 'taskType', softDelete: 'deleted', defaultSort: 'id DESC', listColumns: ['id', 'taskType', 'description', 'assignUser', 'scheduling', 'progressStatus', 'userID', 'created_at'], searchColumns: ['taskType', 'description'], lookups: { userID: 'user', assignUser: 'user', progressStatus: 'opt:task_progress' }, multi: ['assignUser'], filters: ['assignUser', 'progressStatus'], defaults: { status: 1, deleted: 0 } },
  { key: 'updates', label: 'Updates', singular: 'Update', table: 'master_update', group: 'Workspace', icon: 'megaphone', perms: ['new-updates'], titleField: 'updateName', softDelete: 'deleted', defaultSort: 'updateID DESC', listColumns: ['updateID', 'updateName', 'updateDate', 'status'], searchColumns: ['updateName', 'description'], lookups: { status: 'opt:status' } },
  { key: 'versions', label: 'Versions', singular: 'Version', table: 'master_version', group: 'Workspace', icon: 'history', perms: ['version-history'], actionPrefix: 'version', titleField: 'versionName', softDelete: 'deleted', defaultSort: 'versionID DESC', listColumns: ['versionID', 'versionName', 'roleID', 'versionDate', 'status'], searchColumns: ['versionName', 'description'], lookups: { roleID: 'role', status: 'opt:status' } },
  { key: 'dos-donts', label: "Do's & Don'ts", singular: 'Guideline', table: 'dosanddont', group: 'Workspace', icon: 'list-todo', perms: ['psMaster', 'dashboard'], titleField: 'description', softDelete: 'deleted', listColumns: ['id', 'entity', 'type', 'description', 'status'], searchColumns: ['description'], lookups: { status: 'opt:status', type: 'opt:do_dont' } },
  { key: 'notification-alerts', label: 'Notification banners', singular: 'Banner', table: 'notification_alert', group: 'Workspace', icon: 'bell-ring', perms: ['psMaster'], titleField: 'title', softDelete: 'deleted', listColumns: ['id', 'title', 'role', 'startDate', 'endDate', 'status'], searchColumns: ['title'], lookups: { role: 'role', status: 'opt:status' }, multi: ['role'] },
  { key: 'notifications', label: 'Notifications', singular: 'Notification', table: 'notification', group: 'Workspace', perms: ['dashboard'], titleField: 'description', softDelete: null, readOnly: true, defaultSort: 'notificationID DESC', listColumns: ['notificationID', 'type', 'description', 'assignedUserID', 'created_at'], searchColumns: ['description'], lookups: { assignedUserID: 'user' } },
  { key: 'email-templates', label: 'Email Templates', singular: 'Email template', table: 'email_template', group: 'Workspace', icon: 'mail', perms: ['email-templates', 'psMaster'], titleField: 'email_template_name', softDelete: 'deleted', listColumns: ['email_template_id', 'email_template_name', 'email_template_subject', 'email_template_from', 'status'], searchColumns: ['email_template_name', 'email_template_subject'], lookups: { status: 'opt:status' } },
  { key: 'pscare-templates', label: 'PS Care email templates', singular: 'Template', table: 'pscare_email_template', group: 'PS Care', icon: 'mail-plus', perms: ['pscare_emails', 'contract-closures'], titleField: 'templateName', softDelete: 'deleted', listColumns: ['templateID', 'templateName', 'subject', 'emailcategoryID', 'status'], searchColumns: ['templateName', 'subject', 'description'], lookups: { emailcategoryID: 'emailCategory', status: 'opt:status' } },
];

const admin: ModuleDef[] = [
  { key: 'users', label: 'Users', singular: 'User', table: 'users', group: 'Administration', icon: 'users', perms: ['users'], titleField: 'first_name', softDelete: 'deleted', defaultSort: 'id DESC', listColumns: ['id', 'first_name', 'last_name', 'email', 'role_type', 'designation', 'teamID', 'regionID', 'status', 'isLogin'], searchColumns: ['first_name', 'last_name', 'email', 'designation', 'contact_no'], lookups: { role_type: 'role', regionID: 'region', teamID: 'team', companyID: 'company', subVendorID: 'subVendor', profileID: 'profile', assignRecruiter: 'user', status: 'opt:status', isLogin: 'opt:yesno', isRecruiter: 'opt:yesno', publicip: 'opt:yesno', IsViewOnlyAccess: 'opt:yesno' }, multi: ['regionID', 'teamID', 'assignRecruiter'], filters: ['role_type', 'teamID', 'regionID', 'status'], hidden: ['password', 'pass_word', 'emailKey', 'tokenLogin', 'otp', 'otpToken', 'otpExpiredAt', 'otpVerified', 'otpEmailSend', 'deleted', 'deleted_at', 'uid'],
    formSections: [
      { title: 'Account', fields: ['first_name', 'last_name', 'email', 'user_name', 'role_type', 'designation', 'status', 'isLogin', 'IsViewOnlyAccess'] },
      { title: 'Contact', fields: ['countryCode', 'contact_no', 'alternateCountryCode', 'alternate_contact_no', 'telephone_no'] },
      { title: 'Organisation', fields: ['regionID', 'teamID', 'isRecruiter', 'assignRecruiter', 'joiningDate', 'companyID', 'subVendorID', 'profileID', 'companyAccess'] },
      { title: 'Security', fields: ['publicip', 'ipAddress'] },
    ], related: [{ module: 'login-logs', fk: 'user_id', label: 'Login history' }] },
  { key: 'login-logs', label: 'Login history', singular: 'Login', table: 'login_logs', group: 'Administration', perms: ['users'], titleField: 'email', softDelete: null, readOnly: true, defaultSort: 'id DESC', listColumns: ['id', 'user_id', 'email', 'ip_address', 'publicIPAddress', 'role_type', 'created_at'], searchColumns: ['email', 'ip_address'], lookups: { user_id: 'user', role_type: 'role' } },
  { key: 'activity-log', label: 'Activity log', singular: 'Activity', table: 'master_activity_log', group: 'Administration', icon: 'activity', perms: ['activity-log', 'users'], titleField: 'action', softDelete: null, readOnly: true, defaultSort: 'id DESC', listColumns: ['id', 'userID', 'page', 'tab', 'action', 'created_at'], searchColumns: ['action', 'page'], lookups: { userID: 'user' }, filters: ['userID', 'page'] },
  { key: 'consultant-activity', label: 'Consultant activity', singular: 'Activity', table: 'activity_log', group: 'Administration', perms: ['contract-closures', 'activity-log'], titleField: 'action', softDelete: null, readOnly: true, defaultSort: 'id DESC', listColumns: ['id', 'cdID', 'userID', 'tab', 'action', 'created_at'], searchColumns: ['action'], lookups: { userID: 'user', cdID: 'consultant' } },
  { key: 'profile-activity', label: 'Profile activity', singular: 'Activity', table: 'ps_activity_log', group: 'Administration', perms: ['profile', 'activity-log'], titleField: 'action', softDelete: null, readOnly: true, defaultSort: 'id DESC', listColumns: ['id', 'pID', 'userID', 'page', 'tab', 'action', 'created_at'], searchColumns: ['action'], lookups: { userID: 'user', pID: 'profile' } },
  { key: 'admin-actions', label: 'Admin actions', singular: 'Action', table: 'admin_action', group: 'Administration', perms: ['users'], titleField: 'action', softDelete: null, readOnly: true, defaultSort: 'id DESC', listColumns: ['id', 'admin_id', 'action', 'action_model', 'action_id', 'ip_address', 'created_at'], searchColumns: ['action', 'action_model'], lookups: { admin_id: 'user' } },
  { key: 'cv-download-tracking', label: 'CV download tracking', singular: 'Download record', table: 'cv_download_tracking', group: 'Administration', perms: ['users'], titleField: 'user_id', softDelete: null, listColumns: ['id', 'user_id', 'download_count', 'document_download_count', 'last_download_time'], searchColumns: [], lookups: { user_id: 'user' } },
  { key: 'cv-parse-log', label: 'CV parser log', singular: 'Parse', table: 'cv_parse_log', group: 'Administration', perms: ['cv-parser', 'users'], titleField: 'file_name', softDelete: null, readOnly: true, defaultSort: 'id DESC', listColumns: ['id', 'file_name', 'file_type', 'status', 'confidence', 'duration_ms', 'profile_id', 'user_id', 'created_at'], searchColumns: ['file_name'], lookups: { user_id: 'user', profile_id: 'profile' } },
  { key: 'email-settings', label: 'SMTP settings', singular: 'SMTP account', table: 'email_settings', group: 'Administration', perms: ['settings', 'users'], titleField: 'type', softDelete: null, listColumns: ['id', 'type', 'smtp_host', 'smtp_username', 'smtp_title'], searchColumns: ['type'] },
  { key: 'spothrm-users', label: 'SpotHRM users', singular: 'SpotHRM user', table: 'spothrm_users', group: 'Administration', perms: ['users'], titleField: 'name', softDelete: 'is_deleted', listColumns: ['id', 'name', 'username', 'employeeID', 'email', 'phoneNumber', 'status'], searchColumns: ['name', 'email', 'username'], hidden: ['password'] },
  { key: 'parser-usage', label: 'Legacy parser usage', singular: 'Day', table: 'affinda_count', group: 'Administration', perms: ['users'], titleField: 'count', softDelete: null, readOnly: true, defaultSort: 'id DESC', listColumns: ['id', 'count', 'portalCount', 'testqCareerCount', 'spotHRMCount', 'created_at'], searchColumns: [] },
  { key: 'pocreports', label: 'POC report snapshots', singular: 'Snapshot', table: 'pocreports', group: 'Administration', perms: ['recruiter-report'], titleField: 'id', softDelete: null, readOnly: true, listColumns: ['id', 'pocID', 'rID', 'sendToclient', 'Shortlisted', 'Selected', 'Rejected', 'Joined'], searchColumns: [], lookups: { pocID: 'poc', rID: 'requirement' } },
];

// Simple master tables: [key, label, table, titleField, extra lookups]
const simpleMasters: [string, string, string, string, Record<string, string>?][] = [
  ['master-visa', 'Visa statuses', 'master_visa_status', 'visa_status', { country_id: 'country', region_id: 'region' }],
  ['master-nationality', 'Nationalities', 'master_nationality', 'nationality', { countryId: 'country' }],
  ['master-priority', 'Priorities', 'master_priority', 'priority'],
  ['master-designation', 'Designations', 'master_designation', 'designationName'],
  ['master-workauth', 'Work authorisations', 'master_workauth', 'workAuth'],
  ['master-skills', 'Skills', 'master_skills', 'skillset'],
  ['master-request-type', 'Request types', 'master_request_type', 'requestType'],
  ['master-doc-list', 'Document list', 'doc_list_master', 'doc_list_title', { visaStatusID: 'visa', parentID: 'docList' }],
  ['master-recruiters', 'Internal recruiters', 'master_internal_recruiter', 'recruiterName'],
  ['master-location', 'Locations', 'master_location', 'location'],
  ['master-contract', 'Contract types', 'master_contract', 'contract_type'],
  ['master-email-category', 'Email categories', 'email_category', 'categoryName'],
  ['master-call-status', 'Call statuses', 'master_call_status', 'callStatus'],
  ['master-client-doc-type', 'Client document types', 'master_client_documenttype', 'typeName'],
  ['master-profile-status', 'Profile statuses', 'master_profile_status', 'profileStatus'],
  ['master-source', 'Sources', 'master_source', 'source'],
  ['master-duration', 'Durations', 'master_duration', 'duration'],
  ['master-team', 'Teams', 'master_team', 'teamName', { regionID: 'region', assignManager: 'user' }],
  ['master-currency', 'Currencies', 'master_currency', 'currencyType'],
  ['master-rejection-stage', 'Rejection stages', 'master_rejection_stage', 'rejectionType'],
  ['master-ir35', 'IR35 statuses', 'master_ir35', 'IR35', { region_id: 'region' }],
  ['master-regions', 'Regions', 'master_regions', 'regionName'],
  ['master-country', 'Countries', 'master_country', 'countryName'],
  ['master-country-dial', 'Country dial codes', 'master_country', 'countryName'],
  ['master-entity', 'Entities', 'master_entity', 'entityName'],
  ['master-services', 'Services', 'master_services', 'serviceName', { parentID: 'service', mainparentID: 'service' }],
  ['master-incentive', 'Revised incentive structure', 'revised_incentive_structure', 'closureType'],
  ['master-pscare-comment-type', 'PS Care comment types', 'pscare_comment_type', 'commentType'],
  ['master-engagement-type', 'Engagement types', 'pscare_engagement_type', 'engagementType'],
  ['master-requirement-status', 'Requirement statuses', 'master_requirement_status', 'requirementStatus'],
  ['master-technology-group', 'Technology groups', 'technology_group', 'groupName'],
  ['master-technology', 'Technology sub-groups', 'master_technology', 'name', { technologyGroupID: 'technologyGroup' }],
  ['master-technology-category', 'Technology categories', 'technology_category', 'technologyCategoryName', { technologyGroupID: 'technologyGroup', technologySubGroupID: 'technology' }],
  ['master-technology-sub-category', 'Technology sub-categories', 'technology_sub_category', 'technologySubCategoryName', { technologyGroupID: 'technologyGroup', technologySubGroupID: 'technology', technologyCategoryID: 'technologyCategory' }],
  ['master-technology-role', 'Technology roles', 'master_technology_role', 'roleName', { technologyGroupID: 'technologyGroup', technologySubGroupID: 'technology', technologyCategoryID: 'technologyCategory', technologySubCategoryID: 'technologySubCategory' }],
  ['master-subtechnology', 'Sub-technologies (legacy)', 'master_subtechnology', 'subtechnologyname'],
  ['master-skill-main-category', 'Skill main categories', 'skill_main_categories', 'mainCategory'],
  ['master-skill-category', 'Skill categories', 'skill_categories', 'category', { mainCategoryID: 'skillMainCategory' }],
  ['master-skill-sub-category', 'Skill sub-categories', 'skill_sub_categories', 'subCategory', { mainCategoryID: 'skillMainCategory', categoryID: 'skillCategory' }],
  ['master-technology-skills', 'Technology skills', 'technology_skills', 'skills', { mainCategoryID: 'skillMainCategory', categoryID: 'skillCategory', subCategoryID: 'skillSubCategory' }],
  ['master-options', 'Dropdown options', 'app_options', 'label'],
];

const masters: ModuleDef[] = simpleMasters.map(([key, label, table, titleField, lk]) => ({
  key, label, singular: label.replace(/ies$/, 'y').replace(/s$/, ''), table, group: 'Masters', perms: ['psMaster'], titleField,
  softDelete: ['master_services'].includes(table) ? 'is_deleted' : ['master_supplier'].includes(table) ? null : 'deleted',
  listColumns: [], searchColumns: table === 'master_country' ? [titleField, 'countryCode', 'countryDialCode'] : [titleField], lookups: { status: 'opt:status', assignedUserID: 'user', ...(lk || {}) },
  filters: table === 'app_options' ? ['group_key'] : Object.keys(lk || {}).slice(0, 3),
}));

export const MODULES: ModuleDef[] = [...recruitment, ...psCare, ...companies, ...crm, ...content, ...admin, ...masters].filter(m => !!__schema[m.table]);

// Columns that always point at a user, wherever they appear, get a user lookup automatically
import { schema as __schema } from './schema';
const USER_COLS = ['created_by_id', 'modified_by_id', 'assigned_user_id', 'assignedUserID', 'userID', 'userId', 'user_id', 'verifiedByID', 'approvedBy', 'authUserID', 'admin_id', 'profile_added_by', 'sourcing_added_by'];
for (const m of MODULES) {
  const t = __schema[m.table]; if (!t) continue;
  m.lookups ||= {};
  for (const c of USER_COLS) if (!m.lookups[c] && t.columns.some((x) => x.name === c) && !(m.key === 'users')) m.lookups[c] = 'user';
}
export const MODULE_MAP: Record<string, ModuleDef> = Object.fromEntries(MODULES.map((m) => [m.key, m]));
export const getModule = (key: string) => MODULE_MAP[key];

/** Maps the legacy menu hrefs stored in the `permissions` table onto new routes. */
export const HREF_ROUTES: Record<string, string> = {
  dashboard: '/dashboard', requirements: '/m/requirements', profile: '/m/profiles', sourcing: '/m/sourcing', submission: '/m/submissions',
  pipeline: '/m/pipeline', 'feedback-tracker': '/m/feedback-tracker', 'contract-closures': '/m/consultants', 'umbrella-contracts-list': '/m/consultants',
  'sub-vendor-engagements': '/m/consultants', 'ownCompany-my-contract': '/m/contracts', 'my-contract': '/m/contracts', 'umbrella-contracts': '/m/contracts',
  'umbrella-company-info': '/m/companies', 'ownCompany-company-info': '/m/companies', 'sub-vendor-info': '/m/sub-vendors', 'vendor-company': '/m/vendors',
  'umbrella-timesheet': '/m/timesheets', 'ownCompany-timesheet': '/m/timesheets', 'sub-vendor-timesheet': '/m/timesheets',
  'umbrella-invoice': '/m/invoices', 'ownCompany-invoice': '/m/invoices', 'sub-vendor-invoice': '/m/invoices',
  'my-expenses': '/m/expenses', 'candidate-my-profile': '/me', vendormaster: '/m/vendors', 'knowledge-base': '/m/knowledge-base',
  'crm-account-list': '/m/crm-prospects', 'crm-contacts': '/m/crm-contacts', 'crm-opportunities': '/m/crm-prospects', 'crm-leads': '/m/crm-prospects',
  'crm-prospect-list': '/m/crm-prospects',
  'new-updates': '/m/updates', 'version-history': '/m/versions', psMaster: '/masters', 'recruiter-report': '/reports', 'technology-profiles-report': '/reports/technology',
  'activity-log': '/m/activity-log', HelpIndex: '/help', 'submission-logs': '/m/client-submission-logs', 'cv-parser': '/cv-parser', users: '/m/users', roles: '/roles',
  settings: '/settings', 'task-tracker': '/m/task-tracker', 'email-templates': '/m/email-templates', 'vendor-documents': '/m/sub-vendor-documents', 'vendor-finance': '/m/vendor-financials',
  'vendor-opportunities': '/m/requirements', 'vendor-contact': '/m/contracts', 'my-company': '/m/companies',
};

/** Accept old slugs and already-configured local application paths. */
export function resolveMenuHref(href: string | null | undefined) {
  const raw = String(href || '').trim();
  const slug = raw.replace(/^\/+/, '').replace(/^legacy\//, '');
  if (HREF_ROUTES[slug]) return HREF_ROUTES[slug];
  if (MODULE_MAP[slug]) return `/m/${slug}`;
  if (/^\/(?!\/)(?:m\/|admin\/|dashboard(?:$|\?)|masters(?:$|\?)|roles(?:$|\?)|settings(?:$|\?)|reports(?:\/|$|\?))/.test(raw)) return raw;
  return `/legacy/${encodeURIComponent(slug || 'unknown')}`;
}
