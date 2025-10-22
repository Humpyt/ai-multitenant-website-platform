# Tech Stack Document

This document explains, in everyday language, the technology choices for the AI-powered multi-tenant website platform. It covers why each technology was chosen and how it all fits together.

## Frontend Technologies

We build the user interface—the part people see and interact with in their web browser—using:  

- **Next.js (App Router)**  
  A React-based framework that handles routing, server-side rendering, and static site generation out of the box. It makes pages load quickly and gives us a clear way to organize public and protected routes.  

- **React**  
  The core library for building interactive UI components. It lets us break the interface into small, reusable pieces.

- **TypeScript**  
  A strict version of JavaScript that catches errors early. It helps keep the code consistent and maintainable.

- **shadcn/ui**  
  A collection of pre-built, customizable React components. We use these for a polished, consistent look—especially in our multi-step `BusinessSetupWizard` and dashboard.

- **Tailwind CSS**  
  A utility-first styling framework. It speeds up design by letting us apply visual styles directly in our markup without writing custom CSS files.

- **react-hook-form**  
  A lightweight way to manage form state and validation. It powers our onboarding wizard, making multi-step forms smooth and easy to build.

- **Dynamic Theming**  
  Built-in support for light and dark modes. Users can toggle themes instantly, improving accessibility and comfort.

How it improves user experience:
- Fast loading and smooth navigation thanks to Next.js.  
- Consistent, modern design with shadcn/ui and Tailwind.  
- Clear, bug-resistant code aided by TypeScript.  
- Responsive, validated forms with react-hook-form.  
- Polished look-and-feel across light/dark themes.

## Backend Technologies

These power the application’s logic, data storage, and security behind the scenes:

- **Next.js API Routes**  
  Built-in serverless endpoints (e.g., `/api/tenants`, `/api/payments/webhook`). They handle requests like creating tenants, generating websites, and processing payment callbacks.

- **better-auth**  
  A simple authentication library integrated into Next.js. It secures pages and APIs, manages sign-up/sign-in flows, and protects the dashboard.

- **PostgreSQL**  
  A reliable, open-source relational database. It stores users, tenants, websites, subscriptions, and more.

- **Drizzle ORM**  
  A type-safe way to work with the database directly in TypeScript. It ensures our queries match the schema and reduces runtime errors.  
  *(Optional: Migrate to TypeORM if preferred for its migration tooling.)*

- **TypeScript**  
  Extends to the backend for consistency, better refactoring, and clearer APIs.

How these pieces fit together:
1. The user signs up via better-auth—Next.js stores their credentials and creates a user record in PostgreSQL.  
2. Protected API routes use better-auth to verify identity before allowing actions.  
3. Drizzle ORM queries or updates PostgreSQL for tenant setup, website data, and subscription status.  
4. API endpoints trigger AWS logic or payment webhooks to complete tasks.

## Infrastructure and Deployment

Our choices here ensure the app is reliable, scalable, and easy to update:

- **Docker & Docker Compose**  
  Standardize the local development environment (Next.js app + PostgreSQL). New developers can get started with a single command.

- **Vercel**  
  A cloud platform tailor-made for Next.js. It handles builds, serverless functions, and global CDN distribution automatically.

- **Git & GitHub**  
  Version control and collaboration. Branch-based workflows keep new features and fixes organized.

- **CI/CD Pipelines (e.g., GitHub Actions)**  
  Automated testing and deployments. Every push can trigger unit tests, end-to-end checks, and deploy to a preview or production environment.

- **Configuration as Code**  
  ESLint, Prettier, and TypeScript configs enforce consistent style and catch errors before they reach production.

Benefits:
- Consistent environments across teams with Docker.  
- Fast global delivery via Vercel’s CDN.  
- Safe, automated deployments through CI/CD.  
- Tracking every change with Git.

## Third-Party Integrations

We connect to several services that extend our feature set:

- **AWS SDK**  
  - **S3** for storing generated website files per tenant.  
  - **Route 53** for automating subdomain DNS setup (e.g., `tenant.yourplatform.com`).

- **Flutterwave SDK**  
  Handles payment checkout on the frontend and webhook verification on the backend. It manages subscriptions and billing status.

- **LLM Providers**  
  A pluggable interface (`LLMProvider`) with adapters for services like DeepSeek or KimiK2. Onboarding data goes to the AI to generate HTML/CSS/JS.

- **Testing Libraries**  
  - **Jest & React Testing Library** for unit and integration tests.  
  - **Playwright or Cypress** for end-to-end user-flow testing (sign-up → onboarding → payment → site generation).

These integrations let us:
- Automate infrastructure tasks (DNS, storage).  
- Process secure payments seamlessly.  
- Generate content with AI in a modular, swappable way.  
- Validate critical paths before releasing features.

## Security and Performance Considerations

We’ve built safeguards and optimizations to protect users and ensure speed:

- **Authentication & Authorization**  
  better-auth locks down pages and API routes. We check tokens on every request.

- **Input Validation & Sanitization**  
  react-hook-form on the frontend and server-side checks on APIs prevent bad data and injections.

- **Secure AWS Configurations**  
  S3 buckets are private by default; presigned URLs grant temporary, controlled access. Route 53 calls are done with least-privilege IAM roles.

- **Webhook Verification**  
  Flutterwave webhooks are validated using secret keys, ensuring we only process genuine payment events.

- **Error Handling**  
  Centralized try/catch wrappers on serverless functions. We return clear, user-friendly error messages and log details for debugging.

- **Performance Optimizations**  
  - **Server-side rendering (SSR)** for initial page loads, improving SEO and perceived speed.  
  - **Static site generation (SSG)** where possible (e.g., marketing pages).  
  - **Code splitting & lazy loading** large components only when needed.  
  - **CDN caching** via Vercel for static assets.

## Conclusion and Overall Tech Stack Summary

This platform’s tech stack is designed to:

- Deliver a **fast, polished user interface** with Next.js, React, Tailwind, and shadcn/ui.  
- Provide **secure, scalable data handling** using Next.js API routes, better-auth, PostgreSQL, and Drizzle ORM.  
- Ensure **reliable deployment** through Docker, Vercel, Git, and CI/CD pipelines.  
- Leverage **powerful third-party services**: AWS for storage and DNS, Flutterwave for payments, and AI models for content generation.  
- Maintain **high security and performance** with modern authentication, input validation, error handling, and CDN strategies.

Unique aspects:
- A **pluggable AI provider** interface that makes it easy to add or swap language models.  
- **Automated tenant provisioning** including DNS setup in one step.  
- A **component-driven design** that accelerates building complex flows like multi-step onboarding.

Together, these choices give us a flexible, robust foundation for any AI-driven, multi-tenant website platform.