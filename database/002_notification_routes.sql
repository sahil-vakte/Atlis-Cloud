CREATE TABLE IF NOT EXISTS app_email_routes (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  original_email VARCHAR(254) NOT NULL,
  replacement_email TEXT NOT NULL,
  purpose TEXT NOT NULL,
  entity_keys VARCHAR(191) NOT NULL DEFAULT '',
  enabled TINYINT NOT NULL DEFAULT 0,
  updated_by INT DEFAULT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY original_email (original_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Historical reference only: these routes start disabled with no destination.
INSERT IGNORE INTO app_email_routes (original_email,replacement_email,purpose,entity_keys) VALUES
('pscare@testqtech.com','','Former PS Care inbox for TQ UK, TQ IND, TQ USA and TQ BV: contract, purchase-order and right-to-work document expiry reminders.','TQ UK,TQ IND,TQ USA,TQ BV'),
('decillion@decilliondigital.com','','Former DD UK inbox: contract, purchase-order and right-to-work document expiry reminders.','DD UK'),
('virgule@virguleinternational.com','','Former VI UK inbox: contract, purchase-order and right-to-work document expiry reminders.','VI UK');
INSERT IGNORE INTO app_settings (setting_key,setting_value) VALUES ('email_delivery_enabled','0');
