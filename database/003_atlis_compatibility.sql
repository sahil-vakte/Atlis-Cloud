-- Additive compatibility fields for the older atlis database. Existing values are never overwritten.
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='candidate_data' AND COLUMN_NAME='rateBilling'),'SELECT 1','ALTER TABLE `candidate_data` ADD COLUMN `rateBilling` varchar(255) NULL DEFAULT NULL');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='candidate_documents' AND COLUMN_NAME='validityofRTW'),'SELECT 1','ALTER TABLE `candidate_documents` ADD COLUMN `validityofRTW` varchar(50) NULL DEFAULT NULL');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='maskcvparcing' AND COLUMN_NAME='htmlMaskprivew'),'SELECT 1','ALTER TABLE `maskcvparcing` ADD COLUMN `htmlMaskprivew` longtext NULL DEFAULT NULL');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='profile' AND COLUMN_NAME='is_login'),'SELECT 1','ALTER TABLE `profile` ADD COLUMN `is_login` int NOT NULL DEFAULT ''0''');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='requirement' AND COLUMN_NAME='reqStatus'),'SELECT 1','ALTER TABLE `requirement` ADD COLUMN `reqStatus` int NULL DEFAULT NULL');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='rtr_email_logs' AND COLUMN_NAME='added_date'),'SELECT 1','ALTER TABLE `rtr_email_logs` ADD COLUMN `added_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='rtr_email_logs' AND COLUMN_NAME='updated_date'),'SELECT 1','ALTER TABLE `rtr_email_logs` ADD COLUMN `updated_date` timestamp NULL DEFAULT NULL');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sourcing' AND COLUMN_NAME='candidateProfilePicture'),'SELECT 1','ALTER TABLE `sourcing` ADD COLUMN `candidateProfilePicture` varchar(255) NULL DEFAULT NULL');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='spothrm_users' AND COLUMN_NAME='nationalityID'),'SELECT 1','ALTER TABLE `spothrm_users` ADD COLUMN `nationalityID` int NOT NULL');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='spothrm_users' AND COLUMN_NAME='employeesStatus'),'SELECT 1','ALTER TABLE `spothrm_users` ADD COLUMN `employeesStatus` tinyint NOT NULL DEFAULT ''0''');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='spothrm_users' AND COLUMN_NAME='workmodeID'),'SELECT 1','ALTER TABLE `spothrm_users` ADD COLUMN `workmodeID` tinyint NOT NULL DEFAULT ''0''');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='spothrm_users' AND COLUMN_NAME='driverLicenseNumber'),'SELECT 1','ALTER TABLE `spothrm_users` ADD COLUMN `driverLicenseNumber` varchar(250) NULL DEFAULT NULL');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='spothrm_users' AND COLUMN_NAME='licenseExpiryDate'),'SELECT 1','ALTER TABLE `spothrm_users` ADD COLUMN `licenseExpiryDate` date NULL DEFAULT NULL');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='spothrm_users' AND COLUMN_NAME='empDeactivatedOn'),'SELECT 1','ALTER TABLE `spothrm_users` ADD COLUMN `empDeactivatedOn` varchar(255) NULL DEFAULT NULL');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='spothrm_users' AND COLUMN_NAME='location'),'SELECT 1','ALTER TABLE `spothrm_users` ADD COLUMN `location` varchar(256) NULL DEFAULT NULL');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='spothrm_users' AND COLUMN_NAME='salarySlabID'),'SELECT 1','ALTER TABLE `spothrm_users` ADD COLUMN `salarySlabID` int NOT NULL');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='spothrm_users' AND COLUMN_NAME='jobTitleID'),'SELECT 1','ALTER TABLE `spothrm_users` ADD COLUMN `jobTitleID` int NOT NULL');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='spothrm_users' AND COLUMN_NAME='medicalCondition'),'SELECT 1','ALTER TABLE `spothrm_users` ADD COLUMN `medicalCondition` varchar(256) NULL DEFAULT NULL');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='spothrm_users' AND COLUMN_NAME='contactDetailsAdd'),'SELECT 1','ALTER TABLE `spothrm_users` ADD COLUMN `contactDetailsAdd` tinyint NOT NULL DEFAULT ''1''');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='spothrm_users' AND COLUMN_NAME='weeklyWorkHours'),'SELECT 1','ALTER TABLE `spothrm_users` ADD COLUMN `weeklyWorkHours` varchar(256) NULL DEFAULT NULL');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='spothrm_users' AND COLUMN_NAME='workingCapacity'),'SELECT 1','ALTER TABLE `spothrm_users` ADD COLUMN `workingCapacity` varchar(256) NULL DEFAULT NULL');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='spothrm_users' AND COLUMN_NAME='otp'),'SELECT 1','ALTER TABLE `spothrm_users` ADD COLUMN `otp` varchar(250) NULL DEFAULT NULL');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='spothrm_users' AND COLUMN_NAME='otpToken'),'SELECT 1','ALTER TABLE `spothrm_users` ADD COLUMN `otpToken` varchar(250) NULL DEFAULT NULL');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='spothrm_users' AND COLUMN_NAME='next6month'),'SELECT 1','ALTER TABLE `spothrm_users` ADD COLUMN `next6month` date NULL DEFAULT NULL');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='spothrm_users' AND COLUMN_NAME='resetPasswordKey'),'SELECT 1','ALTER TABLE `spothrm_users` ADD COLUMN `resetPasswordKey` varchar(150) NULL DEFAULT NULL');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='task_tracker' AND COLUMN_NAME='progressStatus'),'SELECT 1','ALTER TABLE `task_tracker` ADD COLUMN `progressStatus` enum(''In-Progress'',''Completed'',''Incomplete'') NULL DEFAULT NULL');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='pass_word'),'SELECT 1','ALTER TABLE `users` ADD COLUMN `pass_word` varchar(255) NULL DEFAULT NULL');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='otpEmailSend'),'SELECT 1','ALTER TABLE `users` ADD COLUMN `otpEmailSend` int NULL DEFAULT NULL');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='otp'),'SELECT 1','ALTER TABLE `users` ADD COLUMN `otp` varchar(100) NULL DEFAULT NULL');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='otpToken'),'SELECT 1','ALTER TABLE `users` ADD COLUMN `otpToken` varchar(100) NULL DEFAULT NULL');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='otpExpiredAt'),'SELECT 1','ALTER TABLE `users` ADD COLUMN `otpExpiredAt` varchar(255) NULL DEFAULT NULL');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='otpVerified'),'SELECT 1','ALTER TABLE `users` ADD COLUMN `otpVerified` int NOT NULL DEFAULT ''0''');
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
