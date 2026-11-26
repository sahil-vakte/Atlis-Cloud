import { consultantNameSql } from './consultant-context';

/**
 * Lookup registry: every foreign-key style column in the legacy schema points at one of these.
 * Dropdowns, list labels, filters and exports all resolve through here, so nothing is hardcoded in the UI.
 */
export type Lookup = {
  table: string;
  value: string;
  label: string; // SQL expression
  where?: string; // extra SQL condition for active options
  order?: string;
};

const active = (extra = '') => `IFNULL(deleted,0)=0${extra}`;

export const LOOKUPS: Record<string, Lookup> = {
  user: { table: 'users', value: 'id', label: "TRIM(CONCAT(IFNULL(first_name,''),' ',IFNULL(last_name,'')))", where: active(' AND status=1'), order: 'first_name' },
  recruiter: { table: 'users', value: 'id', label: "TRIM(CONCAT(IFNULL(first_name,''),' ',IFNULL(last_name,'')))", where: active(' AND status=1 AND (isRecruiter=1 OR role_type IN (1,2,14))'), order: 'first_name' },
  role: { table: 'roles', value: 'id', label: 'title', where: "status='1'", order: 'title' },
  client: { table: 'master_client', value: 'clientID', label: 'clientName', where: active(), order: 'clientName' },
  endClient: { table: 'master_end_client', value: 'id', label: 'endClientName', where: active(), order: 'endClientName' },
  region: { table: 'master_regions', value: 'regionID', label: 'regionName', where: active(), order: 'regionName' },
  team: { table: 'master_team', value: 'teamID', label: 'teamName', where: active(), order: 'teamName' },
  ir35: { table: 'master_ir35', value: 'irID', label: 'IR35', where: active() },
  duration: { table: 'master_duration', value: 'durationID', label: 'duration', where: active(), order: 'listOrder' },
  currency: { table: 'master_currency', value: 'currencyID', label: 'currencyType', where: active() },
  poc: { table: 'master_poc', value: 'pocID', label: "COALESCE(NULLIF(pocName,''),TRIM(CONCAT(IFNULL(firstName,''),' ',IFNULL(lastName,''))))", where: active() },
  priority: { table: 'master_priority', value: 'priorityID', label: 'priority', where: active() },
  account: { table: 'master_accounts', value: 'accountID', label: 'name', where: active() },
  reqStatus: { table: 'master_requirement_status', value: 'id', label: 'requirementStatus', where: active() },
  reqType: { table: 'master_request_type', value: 'reqTypeID', label: 'requestType', where: active() },
  technology: { table: 'master_technology', value: 'technologySubGroupID', label: 'name', where: active() , order: 'name'},
  technologyGroup: { table: 'technology_group', value: 'technologyGroupID', label: 'groupName', where: active() },
  technologyRole: { table: 'master_technology_role', value: 'id', label: 'roleName', where: active(), order: 'roleName' },
  technologyCategory: { table: 'technology_category', value: 'technologyCategoryID', label: 'technologyCategoryName', where: active() },
  technologySubCategory: { table: 'technology_sub_category', value: 'technologySubCategoryID', label: 'technologySubCategoryName', where: active() },
  nationality: { table: 'master_nationality', value: 'nationalityID', label: 'nationality', where: active(), order: 'nationality' },
  country: { table: 'master_country', value: 'id', label: 'countryName', where: active(), order: 'countryName' },
  workauth: { table: 'master_workauth', value: 'workauthID', label: 'workAuth', where: active() },
  visa: { table: 'master_visa_status', value: 'vsID', label: 'visa_status', where: active() },
  vendor: { table: 'master_vendor', value: 'vendorID', label: 'vendorName', where: active(), order: 'vendorName' },
  subVendor: { table: 'master_sub_vendor', value: 'id', label: 'regiCompanyName', where: active() },
  company: { table: 'master_company', value: 'id', label: 'regiCompanyName', where: active() },
  supplier: { table: 'master_supplier', value: 'supplierID', label: 'regiCompanyName' },
  designation: { table: 'master_designation', value: 'designationID', label: 'designationName', where: active(), order: 'designationName' },
  source: { table: 'master_source', value: 'sourceID', label: 'source', where: active() },
  callStatus: { table: 'master_call_status', value: 'cStatusID', label: 'callStatus', where: active() },
  profileStatus: { table: 'master_profile_status', value: 'pStatusID', label: 'profileStatus', where: active() },
  rejection: { table: 'master_rejection_stage', value: 'rejectionID', label: 'rejectionType', where: active() },
  entity: { table: 'master_entity', value: 'entityID', label: 'entityName', where: active() },
  location: { table: 'master_location', value: 'locationID', label: 'location', where: active() },
  skill: { table: 'master_skills', value: 'skillID', label: 'skillset', where: active(), order: 'skillset' },
  service: { table: 'master_services', value: 'id', label: 'serviceName', where: 'IFNULL(is_deleted,0)=0' },
  docList: { table: 'doc_list_master', value: 'dlID', label: 'doc_list_title', where: active() },
  clientDocType: { table: 'master_client_documenttype', value: 'id', label: 'typeName', where: active() },
  kbCategory: { table: 'knowledge_base_category', value: 'id', label: 'name', where: active() },
  emailCategory: { table: 'email_category', value: 'emailcategoryID', label: 'categoryName', where: active() },
  pscareCommentType: { table: 'pscare_comment_type', value: 'id', label: 'commentType', where: active() },
  engagementType: { table: 'pscare_engagement_type', value: 'id', label: 'engagementType', where: active() },
  contractType: { table: 'master_contract', value: 'id', label: 'contract_type', where: active() },
  incentive: { table: 'revised_incentive_structure', value: 'incentiveID', label: 'closureType', where: active() },
  implementationPartner: { table: 'master_implementation_partner', value: 'ipID', label: 'implemetationPartnerName' },
  skillMainCategory: { table: 'skill_main_categories', value: 'id', label: 'mainCategory', where: active() },
  skillCategory: { table: 'skill_categories', value: 'id', label: 'category', where: active() },
  skillSubCategory: { table: 'skill_sub_categories', value: 'id', label: 'subCategory', where: active() },
  prospect: { table: 'prospects', value: 'id', label: 'companyName', where: active() },
  prospectContact: { table: 'prospects_contact', value: 'prospectContactID', label: "TRIM(CONCAT(IFNULL(firstName,''),' ',IFNULL(lastName,'')))", where: active() },
  profile: { table: 'profile', value: 'pID', label: "CONCAT(IFNULL(name,''),' (P',pID,')')", where: 'deleted=0', order: 'name' },
  requirement: { table: 'requirement', value: 'rID', label: "CONCAT(IFNULL(roleName,''),' (R',rID,')')", where: 'deleted=0', order: 'rID DESC' },
  sourcing: { table: 'sourcing', value: 'sID', label: "CONCAT(IFNULL(sourcingName,''),' (S',sID,')')", where: 'deleted=0', order: 'sID DESC' },
  consultant: { table: 'candidate_data', value: 'cdID', label: "CONCAT(" + consultantNameSql + ",' (C',cdID,')')", order: 'cdID DESC' },
  expense: { table: 'expenserequest', value: 'expID', label: "CONCAT('EXP',expID,' ',IFNULL(expenseMonth,''),' ',IFNULL(expenseYear,''))" },
  contact: { table: 'contact', value: 'contactID', label: "TRIM(CONCAT(IFNULL(firstName,''),' ',IFNULL(lastName,'')))" },
  permissionParent: { table: 'permissions', value: 'id', label: 'name', where: 'parent_id=0' },
  emailTemplate: { table: 'email_template', value: 'email_template_id', label: 'email_template_name', where: active() },
  pscareTemplate: { table: 'pscare_email_template', value: 'templateID', label: 'templateName', where: active() },
};

/** Option groups held in app_options (editable in Masters → Dropdown Options). */
export const optionGroup = (group: string): Lookup => ({
  table: 'app_options', value: 'value', label: 'label', where: `group_key='${group.replace(/[^a-z_]/g, '')}' AND deleted=0 AND status=1`, order: 'sort_order',
});

export function resolveLookup(key: string): Lookup {
  if (key.startsWith('opt:')) return optionGroup(key.slice(4));
  const l = LOOKUPS[key];
  if (!l) throw new Error(`Unknown lookup ${key}`);
  return l;
}
