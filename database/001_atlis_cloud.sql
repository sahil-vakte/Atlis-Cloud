-- atlis.cloud migration 001 — run once on top of the existing database.
-- Moves values that were hardcoded in the old Vue front end into editable tables,
-- and adds tables used by the in-house CV parser and app settings.

CREATE TABLE IF NOT EXISTS `app_options` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_key` varchar(64) NOT NULL,
  `value` varchar(191) NOT NULL,
  `label` varchar(191) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `status` tinyint(4) NOT NULL DEFAULT 1,
  `deleted` tinyint(4) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`), UNIQUE KEY `uniq_group_value` (`group_key`,`value`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO `app_options` (`group_key`,`value`,`label`,`sort_order`) VALUES
('job_type','Contract','Contract',1),('job_type','Permanent','Permanent',2),('job_type','FTC','FTC',3),('job_type','Any','Any',4),
('business_entity','TQ UK','TQ UK',1),('business_entity','TQ IND','TQ IND',2),('business_entity','TQ USA','TQ USA',3),('business_entity','TQ BV','TQ BV',4),('business_entity','VI UK','VI UK',5),('business_entity','DD UK','DD UK',6),
('closure_status','NA','NA',1),('closure_status','Awaiting','Awaiting',2),('closure_status','Joined','Joined',3),('closure_status','Backout','Backout',4),('closure_status','Rejected','Rejected',5),('closure_status','Contract End','Contract End',6),('closure_status','Position Closed','Position Closed',7),('closure_status','FNF','FNF',8),('closure_status','Abscond','Abscond',9),
('geo_region','Europe','Europe',1),('geo_region','USA','USA',2),('geo_region','Africa','Africa',3),('geo_region','Middle East','Middle East',4),('geo_region','APAC','APAC',5),('geo_region','EMEA','EMEA',6),('geo_region','ROW','ROW',7),
('contact_department','Talent Acquisition','Talent Acquisition',1),('contact_department','Vendor Management','Vendor Management',2),('contact_department','Technical Delivery','Technical Delivery',3),('contact_department','Learning and Development','Learning and Development',4),('contact_department','Miscellaneous','Miscellaneous',5),
('contact_role','Chairman/Director','Chairman/Director',1),('contact_role','Chief Experience Officer','Chief Experience Officer',2),('contact_role','Talent Acquisition VP/Director','Talent Acquisition VP/Director',3),('contact_role','Talent Acquisition Head/Manager','Talent Acquisition Head/Manager',4),('contact_role','Talent Acquisition Specialist','Talent Acquisition Specialist',5),('contact_role','Vendor Management VP/Director','Vendor Management VP/Director',6),('contact_role','Vendor Management Head/Manager','Vendor Management Head/Manager',7),('contact_role','Vendor Management Specialist','Vendor Management Specialist',8),('contact_role','Technical Delivery VP/Director','Technical Delivery VP/Director',9),('contact_role','Technical Delivery Head/Manager','Technical Delivery Head/Manager',10),('contact_role','Technical Delivery Engineer','Technical Delivery Engineer',11),('contact_role','Miscellaneous','Miscellaneous',12),
('comment_type','General','General',1),('comment_type','Query','Query',2),('comment_type','Update','Update',3),
('approval_status','0','Pending',1),('approval_status','1','Approved',2),('approval_status','2','Rejected',3),
('work_mode','Onsite','Onsite',1),('work_mode','Remote','Remote',2),('work_mode','Hybrid','Hybrid',3),
('rate_type','Per Hour','Per Hour',1),('rate_type','Per Day','Per Day',2),('rate_type','Per Month','Per Month',3),('rate_type','Per Annum','Per Annum',4),
('company_country','UK','United Kingdom',1),('company_country','IN','India',2);

CREATE TABLE IF NOT EXISTS `app_settings` (
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO `app_settings` (`setting_key`,`setting_value`) VALUES
('brand_name','atlis.cloud'),
('brand_tagline','Recruitment, workforce and consultant care in one place'),
('brand_logo_light','/brand/atlis-cloud_logo_horizontal_fullcolour.svg'),
('brand_logo_dark','/brand/atlis-cloud_logo_horizontal_reversed.svg'),
('brand_icon','/brand/atlis-cloud_icon_fullcolour.svg'),
('support_email','support@atlis.cloud'),
('date_format','dd-MM-yyyy'),
('default_page_size','25'),
('cv_max_upload_mb','15'),
('session_hours','12');

CREATE TABLE IF NOT EXISTS `cv_parse_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_type` varchar(20) DEFAULT NULL,
  `status` varchar(20) NOT NULL,
  `confidence` int(11) DEFAULT NULL,
  `duration_ms` int(11) DEFAULT NULL,
  `profile_id` int(11) DEFAULT NULL,
  `warnings` text,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Menu entries for new screens (ids chosen above the existing range)
INSERT IGNORE INTO `permissions` (`id`,`name`,`displayName`,`slug`,`href`,`check_slug`,`parent_id`,`is_menu`,`icon`,`flag`,`order`,`status`) VALUES
(500,'CV Parser','CV Parser','link','cv-parser','cv-parser',0,1,'file-search',1,3,1),
(501,'Users','Users','link','users','users',0,1,'users-cog',1,43,1),
(502,'Roles & Permissions','Roles & Permissions','link','roles','roles',0,1,'shield',1,44,1),
(503,'Settings','Settings','link','settings','settings',0,1,'settings',1,45,1),
(504,'Task Tracker','Task Tracker','link','task-tracker','task-tracker',0,1,'list-checks',1,10,1),
(505,'Email Templates','Email Templates','link','email-templates','email-templates',0,1,'mail',1,11,1);
-- Admin role (1) gets the new screens
INSERT INTO `permission_role` (`permission_id`,`role_id`)
SELECT p.id, 1 FROM `permissions` p WHERE p.id BETWEEN 500 AND 505
  AND NOT EXISTS (SELECT 1 FROM `permission_role` x WHERE x.permission_id=p.id AND x.role_id=1);

INSERT IGNORE INTO `app_options` (`group_key`,`value`,`label`,`sort_order`) VALUES
('status','1','Active',1),('status','0','Inactive',2),
('yesno','1','Yes',1),('yesno','0','No',2),
('salutation','Mr.','Mr.',1),('salutation','Mrs','Mrs',2),('salutation','Miss','Miss',3),('salutation','Ms','Ms',4),('salutation','Dr','Dr',5),
('gender','Male','Male',1),('gender','Female','Female',2),('gender','Non-binary','Non-binary',3),('gender','Transgender Male (Trans Man)','Transgender Male (Trans Man)',4),('gender','Transgender Female (Trans Woman)','Transgender Female (Trans Woman)',5),('gender','Prefer not to say','Prefer not to say',6),
('task_progress','Incomplete','Incomplete',1),('task_progress','In-Progress','In progress',2),('task_progress','Completed','Completed',3),
('do_dont','Dos','Do',1),('do_dont','Donts','Don\'t',2),
('closure_job_type','1','Contract',1),('closure_job_type','2','Permanent',2);
-- verification statuses are stored as words in the legacy data
DELETE FROM `app_options` WHERE group_key='approval_status';
INSERT IGNORE INTO `app_options` (`group_key`,`value`,`label`,`sort_order`) VALUES
('approval_status','pending','Pending',1),('approval_status','approved','Approved',2),('approval_status','rejected','Rejected',3);

INSERT IGNORE INTO `app_options` (`group_key`,`value`,`label`,`sort_order`) VALUES
('req_category','In House','In House',1),('req_category','Client Facing','Client Facing',2);
-- job type on requirements uses master_request_type (it was duplicated as a hardcoded list in the old front end)
DELETE FROM `app_options` WHERE group_key='job_type';

-- Reminder inboxes per business entity (were hardcoded in the old cron controllers) and reminder schedules
INSERT IGNORE INTO `app_options` (`group_key`,`value`,`label`,`sort_order`) VALUES
('entity_reminder_email','TQ UK','',1),('entity_reminder_email','TQ IND','',2),('entity_reminder_email','TQ USA','',3),('entity_reminder_email','TQ BV','',4),
('entity_reminder_email','DD UK','',5),('entity_reminder_email','VI UK','',6);
INSERT IGNORE INTO `app_settings` (`setting_key`,`setting_value`) VALUES
('contract_reminder_days','45,30,15'),('po_reminder_days','45,30,15'),('timesheet_reminder_days','1,3,5'),('document_reminder_days','30,7'),('reminder_email','');
