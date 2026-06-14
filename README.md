# Credential Management System (CMS)

A secure, modern, and high-performance **Credential Management System** designed to replace manual secret tracking (like spreadsheets) with a robust infrastructure. Built with a focus on **Security First**, **Operational Efficiency**, and **Modern UX**.

![Dashboard Preview](./edit.png)

## Key Features

- **End-to-End Security**: Every credential is encrypted using **AES-256-GCM** at the database level.
- **Role-Based Access Control (RBAC)**: Granular permissions for Admin, Editor, and Viewer roles.
- **Modern Dashboard**: A minimalist, high-performance UI, featuring:
  - Real-time fuzzy search.
  - Dynamic category management.
  - Dark/Light mode support.
- **Audit Logging**: Comprehensive immutable logs for every user action (who accessed what and when).
- **Bulk Operations**: Seamlessly import credentials from CSV/Excel.
- **Secure Authentication**: OAuth2 integration (Google Workspace) with email whitelist validation.

## Tech Stack

### Backend

- **Language**: Go (Golang)
- **Framework**: Fiber (High-performance web framework)
- **Database**: PostgreSQL (Primary storage)
- **Encryption**: `crypto/aes` + GCM (Authenticated Encryption)
- **ORM**: GORM

### Frontend

- **Framework**: Next.js (TypeScript, App Router)
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI & Radix UI
- **State Management**: React Context & TanStack Query

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Google OAuth Credentials (for Authentication)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Rullabcde/cms.git
   cd cms
   ```

2. **Setup environment variables:**
   Copy `.env.example` to `.env` and fill in your details:

   ```bash
   cp .env.example .env
   ```

3. **Run with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

The dashboard will be available at `http://localhost:3000`.

## Security Architecture

- **Encryption at Rest**: We use a Master Encryption Key (MEK) to encrypt sensitive fields.
- **Encryption in Transit**: TLS 1.3 minimum required for all communication.
- **Session Management**: JWT-based stateless sessions with HTTP-only cookies and token rotation.
- **Database Security**: Parameterized queries to prevent SQL injection and Row-Level Security (RLS) readiness.

## License

Distributed under the MIT License. See `LICENSE` for more information.

---
