-- Add only fields directly used by the new application; other fields are discovered from the live schema.
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='candidate_data' AND COLUMN_NAME='rateBilling'),'SELECT 1','ALTER TABLE `candidate_data` ADD COLUMN `rateBilling` varchar(255) NULL DEFAULT NULL');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='candidate_documents' AND COLUMN_NAME='validityofRTW'),'SELECT 1','ALTER TABLE `candidate_documents` ADD COLUMN `validityofRTW` varchar(50) NULL DEFAULT NULL');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='rtr_email_logs' AND COLUMN_NAME='added_date'),'SELECT 1','ALTER TABLE `rtr_email_logs` ADD COLUMN `added_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='task_tracker' AND COLUMN_NAME='progressStatus'),'SELECT 1','ALTER TABLE `task_tracker` ADD COLUMN `progressStatus` enum(''In-Progress'',''Completed'',''Incomplete'') NULL DEFAULT NULL');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='pass_word'),'SELECT 1','ALTER TABLE `users` ADD COLUMN `pass_word` varchar(255) NULL DEFAULT NULL');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
CREATE TABLE IF NOT EXISTS `master_supplier` (
  `supplierID` int(11) NOT NULL,
  `regiCompanyName` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `verifyCompanyName` tinyint(1) NOT NULL DEFAULT 0,
  `regiCompanyStreetAddress` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `verifyCompanyAddr` tinyint(1) NOT NULL DEFAULT 0,
  `regiCompanyCity` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `verifyCompanyCity` tinyint(1) NOT NULL DEFAULT 0,
  `regiCompanyPostCode` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `verifyCompanyPostalCode` tinyint(1) NOT NULL DEFAULT 0,
  `regiCompanyNo` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `verifyCompanyNo` tinyint(1) NOT NULL DEFAULT 0,
  `regiCompanyVATNo` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `verifyVatNo` tinyint(1) NOT NULL DEFAULT 0,
  `companyEmailID` varchar(255) DEFAULT NULL,
  `companyPassword` text DEFAULT NULL,
  `regiCompanyUTR` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `verifyUTR` tinyint(1) NOT NULL DEFAULT 0,
  `regiCompanyBankAccountNo` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `verifyBankAccNo` tinyint(1) NOT NULL DEFAULT 0,
  `regiCompanyBankSortCode` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `verifyBankSortCode` tinyint(1) NOT NULL DEFAULT 0,
  `regiCompanyBankAddr` text CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `verifyBankAddr` tinyint(1) NOT NULL DEFAULT 0,
  `regiCompanyAccountHolderName` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `verifyAccHolderNm` tinyint(1) NOT NULL DEFAULT 0,
  `contactPersonName` varchar(255) DEFAULT NULL,
  `contactPersonEmail` varchar(255) DEFAULT NULL,
  `contactPersonPhone` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  `deleted` tinyint(4) DEFAULT 0,
  `status` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
