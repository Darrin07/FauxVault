-- Restricted role used only by the SQL injection vulnerability module.
-- BYPASSRLS lets injection payloads escape the WHERE clause (the demo's whole point).
-- SELECT-only grants on transactions and public_accounts contain the blast radius:
-- DROP, writes, and identity-pool reads (users, raw accounts) are rejected at the DB.
-- Idempotent: re-runs cleanly so test setup and local-dev provisioning can both invoke it.

DROP VIEW IF EXISTS public_accounts;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fauxvault_sqli_lab') THEN
    CREATE ROLE fauxvault_sqli_lab
      WITH LOGIN
           PASSWORD :'sqli_lab_password'
           NOINHERIT
           NOSUPERUSER
           NOCREATEDB
           NOCREATEROLE
           BYPASSRLS;
  ELSE
    ALTER ROLE fauxvault_sqli_lab WITH PASSWORD :'sqli_lab_password';
  END IF;
END
$$;

-- Public-data projection over accounts. Exposes balance and account number only;
-- omits user_id and account_id so the view cannot be used to chain attacks back
-- to a user identity. Definer's-rights semantics: when fauxvault_sqli_lab queries
-- this view, the inner SELECT against `accounts` runs as the view owner. Pinning
-- ownership to CURRENT_USER (always the bootstrap superuser when this script is
-- run correctly) keeps the "view bypasses accounts RLS" guarantee load-bearing.
CREATE VIEW public_accounts AS
SELECT account_number, balance
FROM accounts;

ALTER VIEW public_accounts OWNER TO CURRENT_USER;

-- Minimal grants. No DDL, no writes.
GRANT USAGE ON SCHEMA public TO fauxvault_sqli_lab;
GRANT SELECT ON transactions TO fauxvault_sqli_lab;
GRANT SELECT ON public_accounts TO fauxvault_sqli_lab;
