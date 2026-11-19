CREATE TABLE IF NOT EXISTS app_user_mfa (
  user_id INT NOT NULL PRIMARY KEY,
  secret_cipher TEXT NOT NULL,
  enabled TINYINT NOT NULL DEFAULT 0,
  last_counter BIGINT NOT NULL DEFAULT -1,
  failed_attempts INT NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS app_auth_challenges (
  token_hash CHAR(64) PRIMARY KEY,
  user_id INT NOT NULL,
  password_fingerprint CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  INDEX(user_id), INDEX(expires_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS app_auth_limits (
  bucket CHAR(64) PRIMARY KEY,
  attempts INT NOT NULL,
  resets_at DATETIME NOT NULL
) ENGINE=InnoDB;
