# Frontend Guideline Document for ai-multitenant-website-platform

This document outlines how the frontend of the AI-powered multi-tenant website platform is built. It covers the overall structure, design ideas, styling, components, state handling, navigation, performance tips, testing, and more. By following these guidelines, developers and designers can clearly understand and work on the user interface without confusion.

## 1. Frontend Architecture

**Tools and Frameworks**
- **Next.js** (App Router): handles page structure, server-side rendering, and API routes.  
- **React**: the core library for building user interfaces.  
- **TypeScript**: adds type safety to JavaScript, catching errors early.  
- **Tailwind CSS**: a utility-first approach for styling.  
- **shadcn/ui**: a ready-made component library that sits on top of Tailwind.  
- **react-hook-form**: simplifies building and validating multi-step forms.  
- **better-auth**: manages user sign-up, sign-in, and secure areas of the app.

**How It Supports Scalability, Maintainability & Performance**
- **File-based Routing**: Next.js maps files under `/app` to URLs, making it easy to add or change pages.  
- **Component-Driven**: UI lives in small, reusable pieces. Changes in one place propagate everywhere.  
- **API Routes**: Backend-like endpoints live alongside pages, so frontend and backend logic stay in one project.  
- **Type Safety**: TypeScript and Drizzle (or TypeORM) keep data models predictable.  
- **Theming + JIT CSS**: Tailwind’s Just-In-Time engine only ships the styles you need, helping page load speed.

## 2. Design Principles

**1. Usability**
- Clear labels, simple forms, and step-by-step guidance.  
- Consistent placement of menus, buttons, and feedback messages.

**2. Accessibility**
- High-contrast color combinations.  
- Semantic HTML elements (e.g., `<button>`, `<nav>`, `<main>`).  
- `aria-` attributes and keyboard navigation support.

**3. Responsiveness**
- Mobile-first design: layouts and components adapt to phone, tablet, and desktop.  
- Fluid grids and flexible images ensure content looks good at any size.

**4. Consistency & Branding**
- Shared color palette, typography, and spacing rules.  
- Reusable components (`Button`, `Card`, `FormInput`) follow the same style guidelines.

## 3. Styling and Theming

**Styling Approach**
- **Utility-First with Tailwind CSS**: Write classes like `px-4`, `bg-primary`, `text-center` directly in markup.  
- No separate CSS files or BEM naming—everything lives alongside the component.

**Theming**
- **Light & Dark Modes**: Powered by `next-themes`. Users toggle a switch; colors update everywhere.  
- Theme values are defined in `tailwind.config.js` under `theme.extend.colors`.

**Visual Style**
- **Modern Flat Design**: Clean lines, subtle shadows, and clear typography.  
- **Glassmorphism Accents**: Light, translucent panels on top of blurred backgrounds (where needed for overlays).

**Color Palette**
- Primary: `#4F46E5` (indigo)  
- Primary Light: `#6366F1`  
- Secondary: `#10B981` (emerald)  
- Accent: `#F59E0B` (amber)  
- Neutral Light: `#F3F4F6` (gray-100)  
- Neutral Dark: `#1F2937` (gray-800)  
- Success: `#10B981`, Error: `#EF4444`

**Typography**
- **Font Family**: `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`  
- **Headings**: Bold, larger sizes; **Body**: Regular weight, comfortable line height.

## 4. Component Structure

**Folder Organization**
- `/components/`: small, reusable UI pieces (buttons, form fields, cards).  
- `/components/wizard/`: the multi-step `BusinessSetupWizard`.  
- `/components/dashboard/`: cards and lists for the protected area.

**Naming & File Structure**
- One component per file (e.g., `Button.tsx`).  
- Uppercase filenames match component names.  
- Barrel files (`index.ts`) export related components together.

**Reuse & Composition**
- Build small building blocks (e.g., `TextInput`) then compose them into bigger pieces (e.g., `SettingsForm`).  
- Keep components focused—each has one job to do.

## 5. State Management

**Local State**
- **react-hook-form** handles form fields, validation states, and multi-step wizard progress.

**Global State**
- **better-auth Context**: wraps the app to provide `user` and `auth` state.  
- **Theme Context**: supplied by `next-themes` for light/dark mode.

**Data Fetching**
- Use React’s built-in `useEffect` and `fetch`, or opt into a library like **SWR** for cache-and-revalidate patterns.  
- Keep UI in sync by sharing state through Context or lifting it up to page-level components.

## 6. Routing and Navigation

**Next.js App Router**
- Files in `/app` automatically become routes: `/app/sign-up`, `/app/dashboard`, `/app/onboarding`, etc.  
- Nested folders map to nested paths.

**Protected Pages**
- Wrap dashboard routes with `requireAuth` (from `better-auth`). Unauthenticated users redirect to sign-in.

**Client Navigation**
- Use Next.js’s `Link` component for page-to-page jumps.  
- Use `useRouter()` for redirects after form submissions or sign-in.

**Dynamic Subdomain Routing** (Future)
- Custom server logic reads the hostname (e.g., `toms.yourplatform.com`) to load the right tenant’s site.

## 7. Performance Optimization

**Lazy Loading & Code Splitting**
- Use `next/dynamic` to load heavy components (like the site editor) only when needed.  
- Let Next.js automatically split code by route.

**Asset Optimization**
- Use `<Image>` from `next/image` for responsive, optimized images.  
- Enable Tailwind’s PurgeCSS (built in) to remove unused CSS.

**Caching & CDN**
- Leverage Next.js’s built-in caching headers.  
- Host static assets and images on a CDN (e.g., Vercel or S3 + CloudFront).

## 8. Testing and Quality Assurance

**Unit Testing**
- **Jest** + **React Testing Library**: test components in isolation (forms, buttons, validation).  
- Mock `better-auth` and API calls where needed.

**Integration Testing**
- Test how pages and API routes work together using tools like **Supertest** for endpoints in `/api`.

**End-to-End Testing**
- **Playwright** or **Cypress**: simulate real user flows—sign-up → onboarding → payment → site generation.

**Linting & Formatting**
- **ESLint** with TypeScript rules ensures code consistency.  
- **Prettier** auto-formats files on save or pre-commit.

## 9. Conclusion and Overall Frontend Summary

This frontend setup uses Next.js, React, and Tailwind CSS to deliver a fast, scalable, and maintainable user interface. By following these guidelines—component-driven structure, clear design principles, consistent theming, and thorough testing—you’ll ensure that the AI-powered multi-tenant platform remains easy to build on and delightful for end users. The combination of modern tools, solid patterns, and careful performance tuning makes this codebase a strong foundation for any future enhancements.