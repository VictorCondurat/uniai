# UniAI - The Enterprise-Ready AI Gateway

<p align="center">
<a href="https://uniai.victorcondurat.dev" target="_blank">
<img src="https://img.shields.io/website?label=Live%20Demo&style=for-the-badge&up_message=online&url=https%3A%2F%2Funiai.victorcondurat.dev" alt="Live Demo">
</a>
<a href="https://github.com/victorcondurat/uniai/blob/main/LICENSE" target="_blank">
<img src="https://img.shields.io/github/license/victorcondurat/uniai?style=for-the-badge" alt="License">
</a>
<a href="https://github.com/victorcondurat/uniai" target="_blank">
<img src="https://img.shields.io/github/last-commit/victorcondurat/uniai?style=for-the-badge" alt="Last Commit">
</a>
</p>

## Vision

As AI transitions from experimental technology to an operational necessity, organizations face a new challenge: managing a fragmented ecosystem of AI providers. Each new model and provider introduces complexity in billing, security, and integration. UniAI was built to solve this. It is the infrastructure layer that enterprises need to adopt AI efficiently, securely, and sustainably at scale, abstracting away the complexity of multi-provider management into a single, reliable platform.

This project was developed as part of the Bachelor's Thesis at the Faculty of Computer Science, "Alexandru Ioan Cuza" University of Iași, and represents a complete, production-ready system.

## ✨ Key Features

- **Unified API Gateway**: A single, OpenAI-compatible API endpoint (\`/api/v1/chat/completions\`) to access models from OpenAI, Anthropic, Google AI, and more.

- **Enterprise-Grade Security**: Granular API key management, IP whitelisting, domain validation, comprehensive audit logs, and role-based access control.

- **Advanced Cost Management**: Real-time usage tracking, budget controls (daily, monthly, total), and cost optimization via intelligent prompt caching.

- **Intelligent Routing & Fallback**: Configure sophisticated fallback chains to ensure reliability and optimize for cost and performance during provider outages or failures.

- **Team Collaboration**: Project-based resource isolation with distinct member roles (Owner, Admin, Member, Billing).

- **Developer-First Experience**: Drop-in compatibility with OpenAI SDKs, real-time streaming support, a simulation console, and an intuitive dashboard for analytics and management.

- **Automated Invoicing**: Professional, detailed monthly PDF invoices generated automatically for streamlined financial operations.

## 🚀 Live Demo

A live, fully functional version of the platform is deployed on Vercel. You can create an account and explore all features.

**URL**: [uniai.victorcondurat.dev](https://uniai.victorcondurat.dev)

## 🛠️ Technology Stack

UniAI is built with a modern, scalable, and type-safe technology stack, designed for rapid development and enterprise-grade reliability.

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 14 (App Router, Turbopack) |
| **Language** | TypeScript |
| **Database** | PostgreSQL (hosted on Neon) |
| **ORM** | Prisma |
| **Authentication** | NextAuth.js (Google OAuth & Email/Password) |
| **Styling** | Tailwind CSS with shadcn/ui for a component-based system |
| **UI Components** | Radix UI, Framer Motion, Sonner (Toasts) |
| **State Management** | TanStack Query (React Query) for server state |
| **Forms** | React Hook Form with Zod for validation |
| **Data Viz** | Recharts |
| **Deployment** | Vercel |
| **Transactional Email** | Resend |

## ⚙️ Local Development Setup

To run the project locally, follow these steps:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/victorcondurat/uniai.git
   cd uniai
   ```

2. **Install dependencies:**
   This project uses npm as the package manager.
   ```bash
   npm install
   ```

3. **Setup environment variables:**
   Create a \`.env.local\` file in the root of the project by copying the example file.
   ```bash
   cp .env.example .env.local
   ```
   Now, fill in the required values in \`.env.local\`. See the Environment Setup section below for details.

4. **Run database migrations:**
   This command applies the schema.prisma definitions to your PostgreSQL database.
   ```bash
   npx prisma migrate dev
   ```

5. **(Optional) Seed the database:**
   To populate the database with initial data (e.g., model provider info), run the seed script.
   ```bash
   npm run seed
   ```

6. **Start the development server:**
   This command starts the Next.js development server with Turbopack for maximum speed.
   ```bash
   npm run dev
   ```

The application should now be running on http://localhost:3000.

## 🔑 Environment Setup

The \`.env.local\` file is crucial for the application to function. Below are the essential variables you need to configure:

| Variable | Description | Required |
|----------|-------------|----------|
| \`DATABASE_URL\` | Connection string for your PostgreSQL database. | ✓ |
| \`DIRECT_URL\` | Direct connection string for Prisma Migrate. | ✓ |
| \`NEXTAUTH_URL\` | The canonical URL of your deployment. | ✓ |
| \`NEXTAUTH_SECRET\` | A secret key for NextAuth.js session signing. | ✓ |
| \`GOOGLE_CLIENT_ID\` | Google OAuth Client ID for login functionality. | ✓ |
| \`GOOGLE_CLIENT_SECRET\` | Google OAuth Client Secret for login. | ✓ |
| \`OPENAI_API_KEY\` | Your API key for the OpenAI provider. | ✓ |
| \`ANTHROPIC_API_KEY\` | Your API key for the Anthropic provider. |  ✓|
| \`RESEND_API_KEY\` | API key for Resend to handle transactional emails. | ✓ |
| \`FROM_EMAIL\` | The "from" email address for sending emails. | ✓ |
| \`CRON_SECRET\` | A secret to protect cron job endpoints. | ✓ |

**Note**: The \`env.example\` file contains additional variables for business and invoice configuration, which can be customized as needed.

## 🗂️ Data Model

The core of UniAI is its robust and relational data model, managed by Prisma. It is designed to be the single source of truth for all platform operations.

<details>
<summary><strong>Click to view the main Prisma schema models</strong></summary>

- **User**: The central entity, representing an individual or an organization. Manages billing and owns Projects.

- **Project**: An isolated container for AI workloads. Manages members, API keys, and budgets.

- **ProjectMember**: Defines the relationship between a User and a Project with specific roles (OWNER, ADMIN, etc.).

- **ApiKey**: The atomic unit of access control. Contains permissions, usage limits, rate limits, and security policies (IP/domain whitelisting).

- **Usage**: An immutable record generated for every API call, tracking tokens, cost, latency, and success status.

- **Invoice**: A monthly summary of all Usage records for a User, generated automatically.

- **FallbackChain**: A predefined sequence of actions (e.g., retry with a different model) triggered by specific conditions like errors or high latency.

- **AuditLog**: A comprehensive log of all significant actions performed on the platform, crucial for security and compliance.

</details>

## 📂 Project Structure

The project follows the standard Next.js App Router structure, with a clear separation of concerns to ensure maintainability and scalability.

```
├── app/                  # Next.js App Router: pages, layouts, API routes
│   ├── (dashboard)/      # Protected routes accessible after login
│   └── api/              # Backend API endpoints, organized by resource
│       ├── auth/         # Authentication logic
│       ├── projects/     # Project management
│       ├── keys/         # API Key management
│       └── v1/           # Public-facing AI Gateway API
├── components/           # Reusable React components (UI, forms, etc.)
│   ├── dashboard/        # High-level components for dashboard pages
│   └── ui/               # Base UI components from shadcn/ui
├── lib/                  # Core logic, helpers, database clients, utils
│   ├── auth.ts           # Authentication configuration
│   └── prisma.ts         # Prisma client instance
├── prisma/               # Prisma schema, migrations, and seed script
└── ... 
```

## 🗺️ Roadmap

The long-term vision for UniAI is to evolve from a gateway into a complete AI platform ecosystem. Key areas for future development include:

- **Agent Infrastructure**: Tools for building stateful, multi-step AI agents.

- **Advanced SDKs**: Official SDKs for Python, Go, and other languages.

- **Model Evaluation & A/B Testing**: Frameworks to systematically compare model performance and cost.

- **Expanded Provider Support**: Integration with more providers like Cohere, Mistral, and Replicate.

For a detailed overview, see the Roadmap chapter in the Bachelor's Thesis document (consider uploading it and linking it here).

## 📄 License

This project is proprietary software. All rights reserved by Victor Condurat.
