# Mandatory authenticator sign-in

All users, including administrators, must verify a TOTP code before a full session is issued. Password verification issues a separate ten-minute, HttpOnly challenge cookie. Existing sessions issued before this feature are rejected.

First sign-in displays a locally generated QR code and an optional manual setup key. Enrollment completes only after a valid code. Later sign-ins never return the secret or QR. Standard six-digit, 30-second TOTP apps are supported. No email is sent by this flow.

Secrets use AES-256-GCM with the independent `MFA_ENCRYPTION_KEY` (64 hexadecimal characters). Keep this key with the protected server configuration backup; SQL backups alone cannot recover enrolled authenticators. Do not rotate or delete this key during ordinary deployments.

Five failed codes lock verification for 15 minutes per account, including across fresh password challenges. Password attempts are limited per email and source IP. Verification locks database rows to prevent concurrent challenge/code reuse. Deactivated/deleted accounts cannot continue authenticated requests.

Recovery requires an administrator/operator to verify the user's identity. There is deliberately no email, password-only, or recovery-code bypass. A server operator can remove the affected account's `app_auth_challenges` and `app_user_mfa` rows to require fresh enrollment. Existing sessions must also be invalidated (rotate `JWT_SECRET` and restart the service; this signs out everyone). Preserve `MFA_ENCRYPTION_KEY`. Do not reset an account solely on an unverified email request.

Validation: `npm run test:auth` checks cryptography and TOTP vectors. With migrations applied and the app running, `npm run test:auth-flow` creates a temporary account, tests enrollment, verification, access denial, replay, concurrency, lockout, expiry and deactivation, then removes it. Set `AUTH_TEST_URL` to target a different local port. It never enrolls existing accounts or sends email.
