# Security Guidelines for AI-Powered Multi-Tenant Website Platform

This document outlines the security principles, practices, and controls you must apply to the Next.js full-stack starter template as you build out a multi-tenant, AI-driven website platform. It incorporates **Defense in Depth**, **Least Privilege**, and **Secure by Design** principles.

---

## 1. Authentication & Access Control

- **Robust Authentication**
  - Use `better-auth` (or a proven alternative) with strong password policies: minimum 12 characters, mixed case, numerals, and symbols.
  - Store passwords hashed with Argon2 or bcrypt plus a unique salt per user.
- **Session & JWT Management**
  - If using JWTs, sign with RS256 or HS256; never allow the `none` algorithm.
  - Validate `exp`, `iat`, and `iss` claims on each request.
  - Store session identifiers in `HttpOnly`, `Secure`, and `SameSite=Strict` cookies.
  - Enforce idle and absolute session timeouts; invalidate sessions on logout.
- **Role-Based Access Control (RBAC)**
  - Define roles (`admin`, `tenant_owner`, `editor`, etc.) and map actions to roles.
  - Enforce server-side checks on every API route (e.g., `authMiddleware` before `POST /api/tenants`).
- **Multi-Factor Authentication**
  - Offer optional MFA (TOTP or WebAuthn) for tenant owners and administrative users.

## 2. Multi-Tenancy Isolation

- **Tenant Data Partitioning**
  - Enforce a `tenant_id` filter on all database queries; never rely on client-supplied tenant identifiers without verification.
  - Use database row-level security (PostgreSQL RLS) or schema-per-tenant if scale permits.
- **Subdomain Routing**
  - Validate incoming `Host` header against your allowed tenant subdomain pattern (`*.ugbiz.com`).
  - Map subdomains to tenant contexts securely (avoid open proxies).
- **Storage Isolation**
  - In Amazon S3, use per-tenant folders or prefixes.
  - Apply bucket policies to limit access by IAM role, tenant, and object prefix.

## 3. Input Handling & Processing

- **Server-Side Validation**
  - Never trust client input. Use a schema validation library (e.g., Zod) on all API routes.
  - Validate JSON, strings, numbers, and file uploads (type, extension, size).
- **Prevent Injection**
  - Use parameterized queries through Drizzle ORM or TypeORM.
  - Sanitize any dynamic content before passing to templating engines to prevent SSR template injection.
- **XSS & CSP**
  - Escape or encode all user-supplied data rendered in the DOM.
  - Implement a strict Content Security Policy (CSP) header:
    ```
    Content-Security-Policy: default-src 'self'; script-src 'self'; img-src 'self' https://*.amazonaws.com;
    ```
- **CSRF Protection**
  - For state-changing endpoints, require an anti-CSRF token (Synchronizer Token Pattern) or use `sameSite=Strict` cookies.
- **Secure File Uploads**
  - Validate file types by checking magic bytes.
  - Store uploads outside of `public/` or restrict access via signed URLs.

## 4. API & Web Application Security

- **HTTPS Everywhere**
  - Enforce TLS 1.2+ on all client and internal API traffic.
  - Redirect HTTP to HTTPS at the edge (Vercel, load balancer).
- **Rate Limiting & Throttling**
  - Protect login, tenant creation, LLM requests, and webhook endpoints with per-IP and per-tenant rate limits.
- **CORS Policy**
  - Restrict `Access-Control-Allow-Origin` to trusted domains only (`https://app.ugbiz.com`).
- **Least Privilege for API Routes**
  - Only expose the minimal HTTP methods required (`GET` for reads, `POST` for writes).
- **API Versioning**
  - Prefix routes with `/api/v1/…`; plan for deprecation and migration paths.

## 5. Data Protection & Privacy

- **Encryption at Rest & Transit**
  - Enable TLS for database connections.
  - Encrypt sensitive columns (e.g., OAuth tokens, PII) in the database with AES-256.
- **Secrets Management**
  - Store API keys and secrets in a secrets manager (AWS Secrets Manager, Vault). Avoid checking them into Git.
- **PII Handling**
  - Collect only necessary personal data; mask or redact PII in logs.
  - Implement data retention and deletion policies to comply with GDPR/CCPA.

## 6. AWS & Infrastructure Security

- **IAM & Least Privilege**
  - Create dedicated IAM roles for Next.js runtime, Lambda functions, and CI/CD pipelines.
  - Grant S3 `PutObject`/`GetObject` only on tenant prefixes.
  - Grant Route 53 `ChangeResourceRecordSets` only on the managed hosted zone.
- **S3 Bucket Hardening**
  - Block public access at the bucket level.
  - Require server-side encryption (SSE-S3 or SSE-KMS).
- **Network Security**
  - Use VPC endpoints for S3 and Secrets Manager.
  - Restrict RDS access to only the VPC subnets where the application runs.
- **Docker & Container Security**
  - Base images: use minimal, official Node.js images (e.g., `node:18-alpine`).
  - Scan images with automated tools (Trivy, Clair).
  - Drop unnecessary Linux capabilities and run containers as non-root.

## 7. Third-Party Integrations

- **LLM Provider Security**
  - Communicate with LLM APIs over TLS.
  - Validate and sanitize prompts/responses to avoid injection of malicious code.
  - Monitor usage and implement quotas to prevent abuse and runaway costs.
- **Flutterwave Webhook Handling**
  - Validate webhook signatures and timestamps.
  - Enforce idempotency to safely handle retries.
  - Use a raw body parser to verify HMAC before JSON parsing.

## 8. DevOps & CI/CD Security

- **CI/CD Pipeline**
  - Enforce branch protection, code reviews, and mandatory security scans (SAST, SCA) before merge.
  - Store deploy credentials in secure vaults; never expose them in logs.
- **Configuration Management**
  - Manage environment-specific configuration (dev, staging, prod) via infrastructure-as-code (Terraform, CloudFormation).
  - Rotate secrets and credentials on a regular schedule.

## 9. Dependency & Vulnerability Management

- **Lockfiles & Pinning**
  - Commit `package-lock.json` or `yarn.lock` and pin direct dependencies.
- **Automated Scanning**
  - Integrate Dependabot or Snyk to detect CVEs in dependencies.
  - Review and apply security patches promptly.

## 10. Monitoring, Logging & Incident Response

- **Centralized Logging**
  - Send structured logs to a logging service (CloudWatch, Elastic) with sensitive data redacted.
- **Alerts & Metrics**
  - Monitor 5xx errors, authentication failures, webhook failures, and unusual rate-limit triggers.
- **Incident Playbook**
  - Document procedures for key compromises (API key leak, RDS breach) and practice regular drills.

---

Adhering to these guidelines ensures your AI-powered multi-tenant platform is secure by design, resilient against common web threats, and compliant with data privacy regulations. Always review your implementation for emerging threats and continuously refine your security posture.
