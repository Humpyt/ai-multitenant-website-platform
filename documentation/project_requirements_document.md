# Project Requirements Document

## 1. Project Overview

You’re building an AI-powered, multi-tenant website platform where each user can sign up, configure their own “tenant” site, and instantly generate a fully functional website using AI. The platform handles user authentication, tenant onboarding, automated DNS provisioning, AI-driven content generation, and secure storage for each tenant’s site assets. By the end of the flow, a business owner will have their own subdomain (e.g., `mycompany.yourplatform.com`) hosting a site generated from their inputs.

This solution solves the pain point of small businesses and entrepreneurs who lack design or development resources but need a professional web presence. Key success criteria include: seamless sign-up and onboarding, reliable AI site generation, automated DNS/subdomain provisioning, easy access to a protected dashboard, and a smooth payment/subscription flow to activate and manage tenant sites.

## 2. In-Scope vs. Out-of-Scope

### In-Scope (Version 1.0)
- User authentication and session management via better-auth.
- Multi-step BusinessSetupWizard for tenant creation (collects business name, branding, content preferences, billing info).
- Backend models for User, Tenant, TenantWebsite, Subscription in a relational database (PostgreSQL with TypeORM or Drizzle ORM).
- API routes in Next.js for:
  - `POST /api/tenants` (create tenant, trigger Route 53 subdomain),
  - `POST /api/tenants/[id]/generate-website` (invoke LLM, store files in S3),
  - `GET/PUT /api/tenants/[id]/website` (fetch/update site files),
  - `POST /api/payments/webhook` (handle Flutterwave callbacks).
- AI integration layer (`LLMProvider` interface) with at least one adapter (e.g., GPT-4 via OpenAI API).
- AWS SDK for S3 file storage (tenant-specific buckets/folders) and Route 53 subdomain record creation.
- Protected user dashboard listing all tenant sites, their generation status, preview links, and subscription status.
- Integration of Flutterwave SDK for payment and subscription activation.
- Dark/light theme toggle across the app.

### Out-of-Scope (Future Releases)
- Drag-and-drop or WYSIWYG site editor.
- Custom domains beyond `*.yourplatform.com`.
- Multi-language or localization support.
- Advanced team permissions or multi-user collaboration per tenant.
- Analytics dashboard (traffic, conversions).
- Mobile applications (native or hybrid).
- Built-in automated testing suite (to be added separately).

## 3. User Flow

A new visitor lands on the public landing page and clicks “Sign Up.” They register with email/password, verify their account, and are redirected to the BusinessSetupWizard. Through a series of steps, they provide their business name, select branding options (colors, fonts), enter content preferences (industry, pages needed), and submit billing details. When they finish, the platform calls the tenant creation API, sets up a subdomain in Route 53, and kicks off the AI generation process in the background.

Once generation completes (a few seconds to a minute, depending on LLM latency), the user is taken to their protected dashboard. Here they see a list of their websites with status indicators (e.g., “Generating,” “Live”), a preview button, and management actions (re-generate site, view code, update billing). If the subscription is inactive, they’re prompted to complete payment via Flutterwave. Upon successful payment webhook verification, the tenant’s status flips to “Active,” and they can visit their live subdomain immediately.

## 4. Core Features

- Authentication & Authorization: Sign-up/sign-in flows, session handling, route protection.
- Tenant Onboarding Wizard: Multi-step form (react-hook-form + shadcn/ui).
- Multi-Tenant Data Model: Users ➔ Tenants ➔ TenantWebsites ➔ Subscriptions.
- Subdomain Provisioning: AWS Route 53 API integration.
- AI Website Generation API: `LLMProvider` abstraction, pluggable adapters, input validation.
- File Storage: AWS S3 buckets for HTML/CSS/JS assets per tenant.
- Dashboard UI: List, status, preview, regenerate actions.
- Payment Integration: Flutterwave checkout and secure webhook handling.
- Theming: Light/dark mode switch.
- API Routes: Next.js App Router endpoints for all backend operations.

## 5. Tech Stack & Tools

- Frontend: Next.js (App Router), React, Tailwind CSS, shadcn/ui, react-hook-form.
- Backend: Next.js API Routes (Node.js), optionally Express for a separate service.
- Database: PostgreSQL with TypeORM (or Drizzle ORM) for type-safe models.
- Authentication: better-auth library.
- AI/LLM: OpenAI GPT-4 (via openai-node SDK) or other providers (DeepSeek, KimiK2).
- Cloud Services:
  - AWS SDK v3 for S3 (object storage) and Route 53 (DNS automation).
  - Flutterwave SDK for payment initiation (frontend) and verification (backend).
- Containerization: Docker + docker-compose for local dev (Next.js + PostgreSQL).
- IDE & Plugins: Visual Studio Code, Cursor AI plugin (optional), Windsurf for code navigation.

## 6. Non-Functional Requirements

- Performance: API responses under 500 ms (excluding LLM calls). LLM calls expected 2–10 s; show loading indicators.
- Security: HTTPS-only, secure cookies or JWT, input validation on all endpoints, verify webhook signatures, least-privilege AWS IAM roles, encrypted environment variables.
- Availability: 99.9% uptime for the dashboard; retry logic for AWS/LLM API failures.
- Scalability: Stateless Next.js instances behind a load balancer; S3 for static assets; database connection pooling.
- Usability: 95+ Lighthouse score on Core Web Vitals; responsive design on desktop and mobile.
- Compliance: GDPR-ready data deletion flows; PCI DSS considerations for payment data (offloaded to Flutterwave).

## 7. Constraints & Assumptions

- You have an AWS account with permissions for S3 and Route 53.
- Flutterwave supports your target regions and currency.
- A stable OpenAI (or equivalent) API key is available and within rate limits.
- Subdomain DNS propagation may take up to 60 seconds; user experience must account for this.
- The platform uses a single PostgreSQL database for all tenants (row-level isolation via tenantId).

## 8. Known Issues & Potential Pitfalls

- LLM Latency & Rate Limits: Mitigate with retry/backoff and a polling strategy for generation status updates.
- DNS Propagation Delays: Show a friendly message (“Setting up your site, this may take up to a minute”).
- S3 Consistency: New uploads may take a few seconds to be visible; handle 404s gracefully with retries.
- Webhook Delivery: Ensure idempotent processing of payment webhooks and secure signature verification.
- ORM Migration: If switching from Drizzle to TypeORM, plan a migration path and update all import paths.
- Error Handling: Centralize API error responses and display clear user-facing messages.

---

This document captures all requirements, flows, and constraints for an AI-powered, multi-tenant website platform. The next steps—detailed Tech Stack Document, Frontend Guidelines, Backend Structure—can be generated directly from this blueprint without ambiguity.