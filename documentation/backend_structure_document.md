# Backend Structure Document

## 1. Backend Architecture

We’ve organized the backend into clear, modular parts to keep things easy to understand, extend, and scale:

- **Next.js API Routes**
  - Handles all HTTP requests (sign-up, tenant creation, AI generation, payments, etc.)
  - Lives alongside the frontend in the same codebase, simplifying deployment and sharing code (e.g., types, utilities)
- **Service Layer (`/lib/` folder)**
  - Encapsulates business logic for:
    - Authentication (Better-Auth)
    - AI content generation (LLMProvider adapters)
    - AWS interactions (S3 uploads, Route 53 DNS provisioning)
    - Payments (Flutterwave SDK integration)
- **Database Layer**
  - Uses a type-safe ORM (currently Drizzle, with an easy path to migrate to TypeORM)
  - Keeps SQL definitions, migrations, and queries in one place, reducing errors and improving maintainability

How this supports your goals:
- **Scalability**: Each API route is stateless, so you can scale horizontally (add more instances) without sharing in-memory data.
- **Maintainability**: Clear folder structure (`app/`, `lib/`, `db/`) and separation of concerns mean new developers can find and fix code quickly.
- **Performance**: Serverless functions (e.g., on Vercel) spin up on demand and auto-scale based on traffic; heavy work (AI calls, file uploads) happens asynchronously or in background functions.

## 2. Database Management

- **Technology**:
  - Primary: PostgreSQL (relational SQL database)
  - ORM: Drizzle ORM (type-safe, easy migrations). Optional migration to TypeORM if you prefer its ecosystem.
- **Data Organization**:
  - **Users** table tracks every registered account
  - **Tenants** table links each tenant to one user (multi-tenancy core)
  - **Websites** table (tenant_websites) stores references to generated site assets in S3
  - **Subscriptions** table records billing status and payment details
- **Practices**:
  - **Migrations**: Keep all schema changes in versioned migration files to ensure consistency across environments
  - **Indexes**: Add indexes on foreign keys (`user_id`, `tenant_id`) and unique columns (`email`, `subdomain`) for fast lookups
  - **Connection Pooling**: Use a pool to reuse database connections and reduce overhead under load

## 3. Database Schema

### Human-Readable Overview

- **users**: Stores user login info
- **tenants**: Represents a tenant account (one per user) with a unique subdomain
- **tenant_websites**: Tracks each tenant’s generated site files in S3
- **subscriptions**: Records the payment plan and status for each tenant

### PostgreSQL Schema (SQL)

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tenants table
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, suspended
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tenant Websites table
CREATE TABLE tenant_websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  s3_key TEXT NOT NULL, -- path to index.html or zipped site
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan TEXT NOT NULL, -- e.g., 'free', 'pro', 'enterprise'
  provider TEXT NOT NULL, -- e.g., 'flutterwave'
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, cancelled
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 4. API Design and Endpoints

We use **RESTful** API routes in Next.js under `/app/api/`:

- **Authentication**
  - `POST /api/auth/signup` ➔ register a new user
  - `POST /api/auth/signin` ➔ log in and receive a session token
  - Protected routes check the token via Better-Auth middleware

- **Tenants**
  - `POST /api/tenants` ➔ create a tenant record, trigger Route 53 DNS setup for `subdomain.yourdomain.com`
  - `GET /api/tenants` ➔ list all tenants for the logged-in user

- **AI Website Generation**
  - `POST /api/tenants/[tenantId]/generate-website` ➔ accept onboarding data, call LLMProvider, store generated site in S3, create or update `tenant_websites` record

- **Website Editing**
  - `GET /api/tenants/[tenantId]/website` ➔ fetch the current site content (from S3)
  - `PUT /api/tenants/[tenantId]/website` ➔ upload updated site content to S3

- **Payments**
  - `POST /api/payments/webhook` ➔ receive and verify Flutterwave callbacks, update subscription status

## 5. Hosting Solutions

- **Frontend & API**: Vercel (optimized for Next.js, built-in CDN, zero-config deployments)
- **Object Storage**: AWS S3 (stores generated HTML/CSS/JS securely)
- **DNS**: AWS Route 53 (automates subdomain provisioning via AWS SDK)

Why these choices:
- **Reliability**: Vercel and AWS are battle-tested, globally distributed services
- **Scalability**: Both auto-scale under load
- **Cost-Effectiveness**: Pay-as-you-go pricing keeps costs low in early stages

## 6. Infrastructure Components

- **Load Balancer & CDN**
  - Vercel’s edge network distributes static assets worldwide
  - API routes also live on the edge, reducing latency

- **Caching**
  - Next.js ISR (Incremental Static Regeneration) for public pages
  - In-memory caching (e.g., using a Redis add-on) can be added for heavy data endpoints

- **Containerization (Local Dev)**
  - Docker + docker-compose spins up Next.js and PostgreSQL locally with one command

- **Background Jobs (Optional)**
  - Use serverless functions or a queue (e.g., AWS SQS) for long-running tasks like mass site generation

## 7. Security Measures

- **Authentication & Authorization**
  - Better-Auth secures routes; users can only access their own tenants
  - Role checks (owner vs. editor) can be added to protect sensitive endpoints

- **Data Encryption**
  - All traffic over HTTPS
  - S3 buckets set to encrypt objects at rest

- **Secrets Management**
  - Environment variables (e.g., AWS keys, Flutterwave secret) stored in Vercel’s config or a secrets manager

- **Webhook Verification**
  - Verify Flutterwave payloads using their signature header

- **Database Security**
  - Least-privilege user for migrations and runtime
  - Network rules restricting direct DB access to the API layer

## 8. Monitoring and Maintenance

- **Logging & Error Tracking**
  - Integrate Sentry or Datadog to capture runtime errors, stack traces, and performance metrics
  - Vercel Analytics for high-level traffic and response insights

- **Health Checks & Alerts**
  - Simple `/healthz` endpoint returning status
  - Configure alerting (e.g., Slack, email) when errors exceed a threshold

- **Database Backups & Migrations**
  - Scheduled automated backups of the PostgreSQL instance
  - Versioned migration scripts (Drizzle or TypeORM) run at deploy time

- **CI/CD**
  - GitHub Actions or Vercel’s built-in pipeline automatically runs tests, linting, and deployments on each push

## 9. Conclusion and Overall Backend Summary

This backend is designed to be:

- **Modular**: Clearly separated areas for API routes, business logic, and data management
- **Scalable**: Stateless routes, auto-scaling hosting, and managed cloud services
- **Secure**: Industry-standard auth, encryption, and secrets handling
- **Maintainable**: Type-safe ORM, migration system, and centralized service modules

Unique strengths:
- **AI-Driven Multi-Tenant Focus**: Built-in hooks for LLM providers, automated DNS, and S3 workflows
- **Full-Stack in One Repo**: Shared code between frontend and backend speeds up development

With this setup, you have a rock-solid foundation to build, test, and run your AI-powered multi-tenant website platform without surprises or hidden complexity.