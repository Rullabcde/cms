# PRODUCT REQUIREMENT DOCUMENT

## Credential Management System (CMS)

**Versi:** 1.0
**Tanggal:** Juni 2026
**Status:** Draft
**Owner:** Product Management & Solutions Architecture Team

---

## 1. PRODUCT OVERVIEW & OBJECTIVES

### 1.1 Latar Belakang Masalah

Perusahaan saat ini mengelola seluruh credentials infrastruktur dan aplikasi melalui Google Sheets/Spreadsheet. Pendekatan ini telah menjadi bottleneck kritis seiring dengan pertumbuhan tim dan kompleksitas sistem. Masalah-masalah yang dihadapi:

- **Data Density & Readability**: Spreadsheet dengan ribuan baris credentials menjadi sulit dibaca dan dipahami. Struktur kolom yang padat menghasilkan cognitive overload bagi tim.
- **Inefficient Search & Retrieval**: Pencarian credentials memerlukan waktu lama. Fitur filter/search di spreadsheet tidak cukup powerful untuk menangani volume data yang terus bertambah.
- **No Access Control**: Semua orang yang memiliki akses Google Drive dapat melihat SEMUA credentials tanpa terkontrol. Tidak ada granular permission management.
- **Security Risk**: Credentials disimpan dalam plain text di spreadsheet tanpa enkripsi. Penyimpanan credentials di cloud storage (Google Drive) menimbulkan exposure risk yang signifikan.
- **Audit Trail Absence**: Tidak ada tracking siapa yang mengakses, mengubah, atau menghapus credentials. Compliance dan security investigation menjadi mustahil.
- **Version Control Issues**: Perubahan credentials tidak tercatat dengan baik. Riwayat versi tidak dapat ditelusuri dengan mudah.
- **No Bulk Operation**: Operasi bulk seperti import/export credentials menjadi manual dan error-prone.

Migrasi dari spreadsheet-based system ke dedicated web application adalah prioritas strategis untuk memastikan keamanan infrastruktur dan skalabilitas operasional.

### 1.2 Tujuan Utama Aplikasi

**Security First**: Implementasi enkripsi end-to-end, RBAC, dan audit logging untuk melindungi credentials yang sensitif.

**Operational Efficiency**: Menyediakan interface yang intuitif dan responsif sehingga tim dapat mencari, mengakses, dan mengelola credentials dengan cepat tanpa context switching.

**Modern UX Design**: Desain clean, minimalis, dan modern yang mendukung dark mode dan light mode untuk kenyamanan pengguna jangka panjang.

**Scalability & Performance**: Sistem dirancang untuk menangani pertumbuhan volume credentials dan jumlah pengguna tanpa degradasi performa.

**Compliance & Auditability**: Setiap interaksi dengan sistem harus tercatat untuk keperluan compliance, security investigation, dan forensics.

### 1.3 Ruang Lingkup Proyek

#### Scope (Included)

- Web application untuk credential management dengan interface modern dan responsif.
- Autentikasi berbasis OAuth2 (Google Workspace OAuth) dengan email whitelist validation.
- Role-Based Access Control (RBAC) dengan tiga role: Admin, Editor, Viewer.
- Enkripsi AES-256-GCM untuk penyimpanan credentials di database.
- Dynamic tab management untuk kategorisasi credentials (e.g., Database, Kubernetes, Elastic).
- Real-time fuzzy search dan advanced filtering berdasarkan kategori, tags, dan metadata.
- Bulk import functionality untuk CSV/Excel dengan validation.
- Audit logging system yang mencatat setiap aksi user.
- Dark mode dan light mode support.
- User whitelist management (Admin hanya).
- Session management dan token rotation.

#### Out of Scope (Excluded)

- Credential rotation automation (scheduled credential refresh).
- Integration dengan credential storage services lain (AWS Secrets Manager, HashiCorp Vault) di fase pertama.
- Mobile application (hanya web application).
- API gateway atau credential retrieval API untuk aplikasi eksternal (future phase).
- Disaster recovery & backup automation (akan dihandle oleh infrastructure team).
- Single Sign-On (SSO) integration lebih dari OAuth2.
- Custom authentication method atau password-based login.
- Advanced analytics & reporting dashboard.
- Email notification system.

---

## 2. TECHNOLOGY STACK RECOMMENDED

### 2.1 Frontend Stack

**Framework**: Next.js 14+ dengan App Router (TypeScript)

Next.js dipilih karena:

- App Router memberikan developer experience terbaik dengan server components dan streaming.
- File-based routing yang intuitif mempercepat development.
- Built-in API routes untuk backend integration yang seamless.
- Image optimization dan automatic code splitting meningkatkan performa.
- Zero-config deployment di edge networks (Vercel, Netlify) untuk latency minimal.

**Build Tool**: Vite (jika memilih React tanpa Next.js)

Alternatif: React 18+ dengan Vite jika tim prefer maximum flexibility dan custom configuration.

**Styling**: Tailwind CSS v3+

- Utility-first CSS framework untuk rapid development.
- Excellent dark mode support dengan class-based toggling.
- Performance-optimized dengan purging unused styles.
- Responsive design system built-in.

**UI Component Library**: shadcn/ui (optional, recommended)

- Unstyled, accessible components yang dapat dikustomisasi sepenuhnya.
- Copy-paste component model untuk kontrol penuh.
- Excellent Tailwind integration.

**State Management**: React Context API + useReducer (untuk simple case) atau Zustand

- React Context API sudah cukup untuk most use cases tanpa overhead Redux.
- Zustand jika diperlukan global state dengan persistence.

**Form Handling**: React Hook Form dengan Zod validation

- Minimal re-renders, excellent performance.
- Type-safe form validation dengan Zod schema.

**Search & Filtering**: Fuse.js (client-side fuzzy search)

- Lightweight, zero-dependency fuzzy search library.
- Excellent untuk real-time search dengan latency < 50ms.

**HTTP Client**: Axios atau Fetch API dengan TanStack Query

- TanStack Query (React Query) untuk state management dari server data.
- Automatic caching, refetching, dan background synchronization.

**Code Quality**: ESLint, Prettier, TypeScript strict mode

- Type safety dengan TypeScript strict configuration.
- Code formatting consistency dengan Prettier.

### 2.2 Backend Stack

**Framework**: Go 1.21+ dengan Fiber Web Framework

Go dengan Fiber dipilih karena:

- Extremely high performance (~12000 req/sec) dengan latency sub-millisecond.
- Minimal memory footprint cocok untuk containerized deployment.
- Fast compilation dan deployment.
- Excellent untuk I/O-heavy operations (database queries, encryption).

**Alternative**: Node.js dengan NestJS atau FastAPI dengan Python

- **NestJS**: Jika tim lebih familiar dengan TypeScript. Performance masih acceptable (3000-5000 req/sec).
- **FastAPI**: Python dengan ASGI server (Uvicorn). Good balance antara development speed dan performance (2000-3000 req/sec).

**Database ORM**: GORM (untuk Go) / Prisma (untuk Node.js) / SQLAlchemy (untuk Python)

- GORM: Powerful ORM untuk Go dengan excellent query building dan hooks untuk audit logging.
- Prisma: Type-safe, auto-generated, migration-first ORM untuk TypeScript/JavaScript.
- SQLAlchemy: Mature ORM untuk Python dengan relationship mapping yang powerful.

**Database**: PostgreSQL 15+ (Primary)

PostgreSQL dipilih karena:

- Excellent untuk structured data dan complex queries.
- JSONB support untuk flexible metadata storage.
- Row-level security (RLS) untuk multi-tenant isolation (jika needed).
- Excellent audit & logging capabilities.
- Open-source, mature, widely adopted.

**Encryption Library**:

- Go: `crypto/aes` (standard library) + `golang.org/x/crypto/chacha20poly1305`
- Node.js: `crypto` (Node.js built-in) atau `tweetnacl.js`
- Python: `cryptography` library dengan Fernet atau AES-GCM

**Key Management**: Environment variables (Development) / HashiCorp Consul / AWS Secrets Manager (Production)

- Development: Master encryption key disimpan di `.env.local` (never committed).
- Production: Integration dengan HashiCorp Consul atau AWS Secrets Manager untuk key rotation dan security.

**Middleware & Security**:

- CORS middleware dengan whitelist domain.
- Rate limiting (10-100 req/min per IP).
- Helmet.js (untuk Node.js) atau equivalent security headers.
- CSRF protection dengan double-submit cookie pattern.
- XSS protection dengan Content Security Policy (CSP).

**Authentication Library**:

- Go: `golang.org/x/oauth2` untuk OAuth2 client.
- Node.js: `passport.js` dengan Google OAuth2 strategy atau `next-auth` (untuk Next.js).
- Python: `authlib` atau `python-jose` untuk JWT handling.

**Session Management**:

- JWT-based stateless sessions dengan short-lived access tokens (15 minutes) dan refresh tokens (7 days).
- Token rotation on each refresh untuk enhanced security.
- Blacklist mechanism untuk token revocation (Redis cache atau in-memory store).

**Logging & Monitoring**:

- Go: `zap` logger (structured logging).
- Node.js: `winston` atau `pino` (structured logging).
- Python: `structlog` untuk structured logging.
- Integration dengan ELK stack atau CloudWatch untuk centralized logging.

### 2.3 Database Schema (Conceptual)

Rancangan tabel utama akan dijabarkan di section 7.

### 2.4 Infrastructure & Deployment

**Containerization**: Docker

- Multi-stage Dockerfile untuk optimized image size.
- Backend container size target: < 50MB.
- Frontend container size target: < 100MB.

**Orchestration**: Kubernetes (jika infrastructure sudah ada) atau Docker Compose (untuk development/small deployments)

**Reverse Proxy & Load Balancing**: Nginx atau HAProxy

- SSL/TLS termination.
- Rate limiting per endpoint.
- Gzip compression untuk response optimization.

**CI/CD**: GitLab CI / GitHub Actions

- Automated testing on every push.
- Automated deployment to staging/production.
- Automated security scanning (SAST, dependency scanning).

**Monitoring & Alerting**: Prometheus + Grafana / ELK Stack

- Metrics: Response time, error rate, request count, database query time.
- Logs: Centralized logging dengan structured format.
- Alerts: Critical errors, high latency, high error rate.

---

## 3. SECURITY REQUIREMENTS

Security adalah prioritas utama dalam sistem ini karena menangani sensitive credentials. Berikut adalah requirements yang non-negotiable:

### 3.1 Enkripsi Data at Rest

**Encryption Algorithm**: AES-256-GCM

- **Why GCM**: Authenticated encryption dengan built-in integrity checking.
- **Why AES-256**: 256-bit key strength sudah secure terhadap quantum computing threats untuk dekade mendatang.

**Implementation Details**:

- Setiap field credential (username, password, API key, connection string) dienkripsi dengan AES-256-GCM secara terpisah.
- Setiap encryption operation menggunakan random 12-byte nonce (IV).
- Authentication tag (16 bytes) disimpan bersama ciphertext untuk integrity verification.
- Database field structure:
  ```
  credentials table:
  - id (UUID)
  - category_id (foreign key)
  - name (plain text, searchable)
  - description (plain text)
  - credential_username_encrypted (BYTEA) + nonce (BYTEA)
  - credential_password_encrypted (BYTEA) + nonce (BYTEA)
  - credential_value_encrypted (BYTEA) + nonce (BYTEA) -- generic field untuk API key, token, dll
  - metadata_json (JSONB) -- tags, custom fields (encrypted if sensitive)
  - created_at, updated_at
  - created_by_user_id, updated_by_user_id
  ```

**Decryption**: Hanya dilakukan di-memory di backend sebelum dikirim ke frontend. Never log plaintext credentials.

### 3.2 Enkripsi Data in Transit

- **TLS 1.3 Minimum**: Semua komunikasi antara client-server harus encrypted dengan TLS 1.3 atau lebih baru.
- **Certificate Management**: Self-signed cert untuk development, Let's Encrypt untuk production (auto-renewal).
- **HSTS Header**: Enforce HTTPS dengan `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`.

### 3.3 Key Management

**Master Encryption Key (MEK)**:

- Single master key yang digunakan untuk encrypt/decrypt semua credentials.
- **Development**: Stored di `.env.local` file (never committed to git).
- **Production**: Stored di external key management service:
  - HashiCorp Consul dengan automatic rotation setiap 90 hari.
  - AWS KMS dengan customer-managed CMK (cost: ~$1/month + API calls).
  - Azure Key Vault atau GCP Cloud KMS (equivalent).

**Key Rotation Strategy**:

- MEK dirotasi setiap 90 hari.
- Saat rotation, semua credentials di-decrypt dengan old key dan re-encrypt dengan new key (background job).
- Old key disimpan dalam key archive untuk backwards compatibility (jika needed untuk decryption).

**Key Access Control**:

- Hanya backend service yang memiliki akses ke MEK.
- Frontend TIDAK pernah menerima plaintext MEK atau encryption keys.

### 3.4 Session Management & Token Handling

**Authentication Flow**:

1. User mengklik "Login with Google".
2. Browser redirect ke OAuth2 provider (Google Workspace).
3. User authorize akses.
4. Backend menerima authorization code, validate dengan Google servers.
5. Backend check email di whitelist.
6. Jika valid, generate JWT tokens.
7. Return `access_token` (short-lived, 15 min) dan `refresh_token` (long-lived, 7 days) dalam HTTP-only cookie.

**Token Structure** (JWT Claims):

```json
{
  "sub": "user@company.com",
  "user_id": "uuid",
  "role": "editor",
  "iat": 1234567890,
  "exp": 1234569690,
  "aud": "credential-management-system"
}
```

**Token Storage**:

- Access token & refresh token disimpan dalam HTTP-only, Secure, SameSite=Strict cookie.
- Frontend tidak punya direct access ke token value (untuk prevent XSS theft).

**Token Refresh**:

- Frontend setiap 10 menit (atau saat mendapat 401) melakukan refresh request.
- Backend validate refresh token dan issue new access token.
- Refresh token juga di-rotate untuk prevent token replay attacks.

**Token Blacklisting** (Logout):

- Saat user logout, refresh token dimasukkan ke blacklist (Redis cache dengan TTL = refresh token expiry).
- Subsequent refresh attempt akan ditolak.

**CSRF Protection**:

- Backend issue `csrf_token` di initial page load.
- Setiap state-changing request (POST, PUT, DELETE) harus include `X-CSRF-Token` header.
- Backend validate token sebelum processing request.

### 3.5 Password & Sensitive Data Handling

**Password Hashing** (untuk internal use, e.g., API keys yang user set):

- Gunakan bcrypt dengan cost factor 12.
- Jangan simpan password plaintext di database.

**Sensitive Data Logging**:

- NEVER log plaintext credentials, tokens, atau API keys.
- Jika logging necessary untuk debugging, hash atau truncate sensitive values.
- Log format: `User (user_id=abc123) accessed credential (cred_id=xyz789) at 2026-06-12T10:00:00Z`

**Memory Handling**:

- Zero-out sensitive data dari memory setelah processing (di-applicable untuk low-level languages).
- Go: Use `runtime.SetFinalizer` untuk cleanup; Node.js/Python: rely on GC.

### 3.6 Input Validation & Injection Prevention

**All Inputs Must Be Validated**:

- Email format validation dengan RFC 5322 regex.
- URL validation untuk connection strings.
- Length limits: Credential name max 255 chars, password max 2048 chars.
- Character whitelist/blacklist: Reject input dengan suspicious patterns.

**SQL Injection Prevention**:

- ALWAYS use parameterized queries (prepared statements).
- Never concatenate user input ke SQL queries.
- ORM layers (GORM, Prisma, SQLAlchemy) auto-protect jika digunakan correctly.

**XSS Prevention**:

- Frontend framework (React) auto-escapes HTML content.
- Jika perlu render HTML, gunakan `DOMPurify` library.
- Content Security Policy (CSP) header: `default-src 'self'; script-src 'self' 'nonce-{random}'`

**Command Injection Prevention**:

- Jangan call shell commands dengan user-controlled input.
- Jika necessary, gunakan parameterized command execution (e.g., `exec.Command` di Go dengan args array).

### 3.7 Audit Logging

**Audit Log Schema**:

```
audit_logs table:
- id (UUID)
- user_id (foreign key to users)
- action (string): 'CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT'
- resource_type (string): 'credential', 'user', 'whitelist', 'category', 'session'
- resource_id (string): ID dari resource yang di-access
- change_summary (text): Apa yang berubah (e.g., "password updated")
- old_value (JSONB, encrypted): Previous value (jika applicable)
- new_value (JSONB, encrypted): Current value (jika applicable)
- ip_address (string): Source IP address
- user_agent (string): Browser/client information
- status (string): 'SUCCESS' atau 'FAILURE'
- error_message (text, nullable): Error detail jika terjadi failure
- created_at (timestamp)
```

**Events to Audit**:

- **User Management**: Create, update, delete user; change role; enable/disable user.
- **Credential Access**: View credential detail (including which fields accessed); export credentials.
- **Credential Modification**: Create, update, delete credential; bulk import.
- **Category/Tab Management**: Create, update, delete category.
- **Whitelist Management**: Add, remove, bulk import email.
- **Session**: Login success/failure, logout, token refresh.

**Audit Log Retention**:

- Logs disimpan selama minimal 2 tahun untuk compliance.
- Automated archival ke cold storage (S3 Glacier, Azure Archive) setelah 90 hari untuk cost optimization.

**Audit Log Access**:

- Hanya Admin yang dapat view audit logs.
- Audit logs TIDAK boleh di-delete (immutable).
- Changes to audit logs sendiri harus di-audit.

### 3.8 Rate Limiting & DDoS Protection

**Rate Limiting**:

- Login endpoint: Max 5 failed attempts per 15 minutes per IP.
- API endpoints: 100 req/min per authenticated user; 10 req/min per IP (unauthenticated).
- Bulk import: Max 1 import per 5 minutes per user (prevent abuse).

**Response**: Return HTTP 429 dengan `Retry-After` header.

**DDoS Protection**:

- Implement di reverse proxy (Nginx) level.
- WAF (Web Application Firewall) jika feasible (e.g., CloudFlare, AWS WAF).

### 3.9 Data Backup & Recovery

**Backup Strategy**:

- Incremental daily backups dengan retention 30 days.
- Weekly full backup dengan retention 90 days.
- Backups disimpan di separate geographic region dari production.

**Encryption**: Backups juga dienkripsi dengan MEK (atau separate backup encryption key).

**Recovery Testing**: Quarterly recovery drills untuk ensure restore process berjalan correctly.

### 3.10 Dependency Security

**Vulnerability Scanning**:

- Automated scanning untuk known vulnerabilities di dependencies.
- GitLab/GitHub dependabot untuk automatic PR saat update available.
- Security audit sebelum setiap production deployment.

**Least Privilege**:

- Backend service berjalan dengan minimal required permissions.
- Database user hanya memiliki SELECT, INSERT, UPDATE, DELETE (no ALTER TABLE, DROP, etc.).

---

## 4. USER MANAGEMENT & AUTHENTICATION

### 4.1 Authentication Method

**Primary Authentication**: OAuth2 dengan Google Workspace

Dipilih karena:

- Enterprise-grade security built-in.
- No password management burden (Google handle password security).
- SAML / MFA support via Google Workspace.
- Scalable untuk organization dengan ribuan users.

**Implementation**:

- Backend implement OAuth2 client library untuk Google.
- Redirect URI: `https://cms.company.com/auth/callback`
- Scope: `openid email profile`
- Session timeout: 30 minutes (access token 15 min, refresh 7 days).

**Alternative (Not Recommended for This Phase)**:

- SAML 2.0: Jika organization menggunakan non-Google IdP (e.g., Okta, Azure AD). Implementation lebih kompleks, skip untuk MVP.

### 4.2 Email Whitelist

**Concept**: Hanya users dengan registered email di whitelist yang dapat login, meskipun credentials Google mereka valid.

**Database Schema**:

```
whitelist_emails table:
- id (UUID)
- email (string, unique, indexed)
- is_active (boolean, default: true)
- created_at (timestamp)
- created_by_user_id (UUID, foreign key)
- notes (text, nullable)
```

**Login Flow with Whitelist**:

1. User OAuth successful dengan Google (email: user@company.com).
2. Backend query whitelist_emails WHERE email='user@company.com' AND is_active=true.
3. Jika found: Create session & issue tokens. Jika not found: Return 403 Forbidden dengan pesan "Email not authorized".

**Bulk Add to Whitelist** (Admin):

- Upload CSV dengan single column: email.
- Backend validate email format, deduplicate.
- Batch insert ke whitelist_emails table.
- Log in audit trail: "Admin imported 50 emails to whitelist".

**Whitelist Management UI** (Admin):

- List all whitelisted emails dengan active status.
- Add single email (manual).
- Remove email (deactivate).
- Bulk import CSV.
- Search/filter whitelist.

### 4.3 Role-Based Access Control (RBAC)

**Roles**:

| Role       | Description                                                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Admin**  | Full system access. Manage users, whitelist, categories, import/export. View audit logs.                                      |
| **Editor** | Manage credentials (create, read, update, delete). Bulk import. Read-only access to categories. No user/whitelist management. |
| **Viewer** | Read-only access to credentials. Search, filter, view detail. Cannot modify data.                                             |

**Permission Matrix**:

| Feature                        | Admin | Editor | Viewer |
| ------------------------------ | ----- | ------ | ------ |
| **Credential Management**      |       |        |        |
| View credentials list          | Yes   | Yes    | Yes    |
| View credential detail         | Yes   | Yes    | Yes    |
| Create credential              | Yes   | Yes    | No     |
| Update credential              | Yes   | Yes    | No     |
| Delete credential              | Yes   | Yes    | No     |
| Export credentials             | Yes   | Yes    | No     |
| **Category Management**        |       |        |        |
| View categories                | Yes   | Yes    | Yes    |
| Create category                | Yes   | No     | No     |
| Update category name/desc      | Yes   | No     | No     |
| Delete category                | Yes   | No     | No     |
| **User Management**            |       |        |        |
| View users list                | Yes   | No     | No     |
| Create/invite user             | Yes   | No     | No     |
| Update user role               | Yes   | No     | No     |
| Deactivate user                | Yes   | No     | No     |
| View audit logs                | Yes   | No     | No     |
| **Whitelist Management**       |       |        |        |
| View whitelist                 | Yes   | No     | No     |
| Add email                      | Yes   | No     | No     |
| Remove email                   | Yes   | No     | No     |
| Bulk import whitelist          | Yes   | No     | No     |
| **Bulk Operations**            |       |        |        |
| Bulk import credentials        | Yes   | Yes    | No     |
| Bulk export credentials        | Yes   | Yes    | No     |
| **Search & Filter**            |       |        |        |
| Search credentials (real-time) | Yes   | Yes    | Yes    |
| Filter by category             | Yes   | Yes    | Yes    |
| Filter by tags                 | Yes   | Yes    | Yes    |

**Implementation**:

- Role stored di users table: `role` (enum: 'admin', 'editor', 'viewer').
- Backend middleware check user role sebelum allow akses ke protected routes/operations.
- Frontend: Conditional rendering berdasarkan user role (jangan rely 100%, backend harus enforce).

### 4.4 User Onboarding Flow

**Step 1**: Admin add email ke whitelist.

**Step 2**: User receive notification (email atau via Slack) bahwa dia sudah bisa login.

**Step 3**: User click "Login with Company Credentials" button.

**Step 4**: User redirect ke Google OAuth consent screen.

**Step 5**: User authorize.

**Step 6**: Backend validate email di whitelist, create user record di database, issue tokens.

**Step 7**: User landing di dashboard dengan default categories (Database, Kubernetes, Elastic).

**Default Role Assignment**: First user menjadi Admin. Users selanjutnya default menjadi Viewer (Admin dapat change role).

---

## 5. UI/UX FEATURES & SPECIFICATIONS

### 5.1 Design Philosophy

**Aesthetic**: Modern, clean, minimalis. Prioritas pada clarity dan functionality daripada decoration.

**Inspiration**: GitHub, Linear, Vercel dashboard design language—professional, organized, dan tidak cluttered.

**Color Palette**:

- **Light Mode**:
  - Background: #FFFFFF (pure white)
  - Surface: #F5F5F5 (light gray)
  - Text: #1F1F1F (dark gray, tidak pure black untuk readability)
  - Accent: #0066FF (modern blue, primary action)
  - Danger: #FF3B30 (red, untuk delete action)
  - Success: #34C759 (green, untuk confirmation)

- **Dark Mode**:
  - Background: #0F1117 (dark navy, GitHub style)
  - Surface: #1C1F26
  - Text: #E6EDEF (light gray)
  - Accent: #58A6FF (light blue)
  - Danger: #FF7B72
  - Success: #3FB950

**Typography**:

- **Sans-Serif (Body, UI)**: Inter, System Font Stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`)
- **Monospace (Credentials)**: JetBrains Mono, Fira Code, atau `SFMono` (Apple)
- **Font Sizes**:
  - H1 (Page title): 32px, 700 weight
  - H2 (Section title): 24px, 700 weight
  - H3 (Subsection): 18px, 600 weight
  - Body: 14px, 400 weight (default)
  - Small: 12px, 400 weight
  - Monospace credential value: 13px, 400 weight

### 5.2 Dark Mode & Light Mode

**Implementation**:

- Checkbox di top-right navbar untuk theme toggle.
- Preference disimpan di browser localStorage & user preferences di database.
- System preference detection menggunakan `prefers-color-scheme` media query sebagai default.
- Seamless transition antara mode dengan CSS transition (150ms).

**CSS Variables Approach**:

```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #1f1f1f;
  --border-color: #e0e0e0;
  --accent-blue: #0066ff;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #0f1117;
    --bg-secondary: #1c1f26;
    --text-primary: #e6edef;
    --border-color: #404040;
    --accent-blue: #58a6ff;
  }
}

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}
```

**Testing**: Verify dark mode readability, contrast ratio (WCAG AA minimum 4.5:1), dan no hardcoded colors.

### 5.3 Responsive Design

**Breakpoints**:

- **Mobile**: < 640px (portrait phone)
- **Tablet**: 640px - 1024px (landscape phone, tablet)
- **Desktop**: > 1024px

**Navigation**:

- Desktop: Sidebar fixed di kiri.
- Mobile: Hamburger menu (collapsible sidebar).

**Layout**:

- Credentials list: 1 column mobile, 2 columns tablet, 2-3 columns desktop (grid).
- Modal/dialogs: Full-width di mobile, 600px max-width di desktop.

### 5.4 Accessibility (WCAG 2.1 AA)

- Semantic HTML: Use `<header>`, `<nav>`, `<main>`, `<section>` appropriately.
- ARIA labels: `aria-label`, `aria-describedby` untuk interactive elements.
- Focus management: Tab order logical, focus indicator visible.
- Color contrast: Minimum 4.5:1 untuk normal text, 3:1 untuk large text.
- Keyboard navigation: Semua feature accessible via keyboard (no mouse required).

---

## 6. CORE FUNCTIONAL FEATURES

### 6.1 Dashboard & Navigation

**Layout**:

```
┌─────────────────────────────────────────────────┐
│ LOGO    Creds     Search bar      👤 Settings  │  ← Navbar
├──────────┬─────────────────────────────────────┤
│          │                                       │
│ Sidebar  │ CONTENT AREA                         │
│          │                                       │
│ Database │ ┌─────────────────────────────────┐ │
│ Elastic  │ │ Credentials: Database           │ │
│ Kube     │ │ ┌──────────┬──────────────────┐ │ │
│ [+]      │ │ │ MySQL    │ Production DB   │ │ │
│          │ │ │ postgres │ username: ****  │ │ │
│ ┌─────┐  │ │ └──────────┴──────────────────┘ │ │
│ │View │  │ │ ┌──────────┬──────────────────┐ │ │
│ │logs │  │ │ │ MongoDB  │ Analytics       │ │ │
│ └─────┘  │ │ │ nosql    │ username: ****  │ │ │
│          │ │ └──────────┴──────────────────┘ │ │
│          │ └─────────────────────────────────┘ │
│          │                                       │
└──────────┴─────────────────────────────────────┘
```

**Sidebar**:

- Logo di top.
- List of dynamic categories/tabs (Database, Elastic, Kubernetes, dll).
- [+] button untuk add new category (Admin only).
- "View Audit Logs" link di bottom (Admin only).
- "Settings" link (user profile, theme toggle).

**Navbar** (Top bar):

- Left: Logo atau hamburger menu (mobile).
- Center: Search bar (with clear X button, placeholder: "Search credentials...").
- Right: Theme toggle, user menu (profile, logout).

### 6.2 Dynamic Custom Tabs

**Admin Feature**: Create, rename, delete credential categories.

**UI for Tab Management**:

- Right-click di category di sidebar → context menu → Edit / Delete.
- Atau button "New Category" → modal dengan form.

**Form Fields**:

- Name: Required, max 50 chars, unique.
- Description: Optional, max 200 chars.
- Color (optional): Untuk visual differentiation. Predefined palette (6-8 colors).
- Icon (optional): Material Icons set.

**Constraints**:

- Minimum 1 category harus ada (default: "General").
- Delete category hanya bisa jika credentials di category sudah dipindahkan/dihapus.

### 6.3 Search & Filtering

**Real-Time Fuzzy Search**:

- User ketik di search bar, hasil update instantly (< 100ms).
- Search across: credential name, description, tags.
- Algorithm: Fuse.js dengan threshold 0.3 (permissive fuzzy matching).
- Example: Typing "mydb" match "mysql_production_db" dan "my-database-backup".

**Search Results Display**:

```
Search: "prod" (found 12 results)
────────────────────────────────
✓ prod_mysql_db (Database)
✓ production_elasticsearch (Elastic)
✓ prod_k8s_sa (Kubernetes)
...
```

**Advanced Filtering** (Sidebar):

- Filter by Category: Checkboxes untuk selected categories (multi-select).
- Filter by Tags: Input dengan autocomplete dari existing tags.
- Filter by Created Date Range: Datepicker (optional, advanced).

**Filter Combination**: Search + category filter + tags = AND logic.

Example: `Search "db" + Category "Database" + Tag "production"` = credentials matching semua kriteria.

**Sort Options**:

- Recently Updated (default)
- Alphabetical (A-Z)
- Created Date (newest first)

### 6.4 Credential Management

**View Credential Detail**:

- Card/modal dengan semua fields:
  - Name
  - Category
  - Description
  - Tags (e.g., "production", "backup", "critical")
  - Credential fields (username, password, API key, connection string, dll)
  - Created by (user name + timestamp)
  - Updated by (user name + timestamp)
  - Actions: Edit, Delete, Copy to Clipboard

**Create/Edit Credential**:

- Form modal dengan fields:
  - Name: Required, max 255 chars
  - Category: Dropdown (required)
  - Description: Optional, textarea
  - Tags: Input dengan comma-separated atau chip-style
  - Dynamic Credential Fields:
    - Multiple field pairs: [Label] [Value (password input untuk sensitive)]
    - Add more fields button
  - Example:
    ```
    + Credential Fields
    Username: postgres
    Password: [••••••••]
    Host: db.prod.company.com
    Port: 5432
    [+ Add another field]
    ```
  - Save & Cancel buttons

**Delete Credential**:

- Confirmation dialog dengan warning.
- Soft delete (mark as deleted, tidak langsung remove dari database).
- Hard delete untuk production jika absolutely needed (audit trail harus clear).

**Copy to Clipboard**:

- Button di credential detail: "Copy Password" / "Copy API Key".
- Copy value ke clipboard, trigger toast notification: "Copied to clipboard".
- Clipboard auto-clear setelah 30 seconds untuk security.

### 6.5 Bulk Import Credentials

**Feature**: Admin dan Editor dapat import credentials massal dari CSV/Excel.

**File Format**:

```csv
Category,Name,Description,Tags,Field1_Label,Field1_Value,Field2_Label,Field2_Value
Database,MySQL Prod,Production MySQL,prod;critical,Username,postgres,Password,secret123
Database,PostgreSQL Backup,Backup database,backup,Host,backup.db.local,Port,5432
```

**Import Flow**:

1. User click "Import" button.
2. File picker dialog untuk upload CSV/Excel.
3. Backend validate file:
   - File size max 10MB.
   - Check header row.
   - Validate data format, email, required fields.
4. Preview screen dengan validation results:
   ```
   Rows found: 150
   Valid rows: 148
   Errors: 2
   ┌─────────────────────────┐
   │ Row 15: Missing category│
   │ Row 42: Invalid format  │
   └─────────────────────────┘
   [Import 148 Valid Rows]  [Cancel]
   ```
5. Backend insert valid rows (atomically, all or nothing).
6. Success notification dengan summary: "Imported 148 credentials successfully".

**Whitelist Email Bulk Import**:

- Same flow tetapi untuk whitelist_emails table.
- CSV dengan single column: email.

### 6.6 Audit Log Viewer

**Feature**: Admin only. View all historical actions dalam sistem.

**Log Display** (Filterable table):

| User              | Action | Resource                  | Time                | Status  | Details                  |
| ----------------- | ------ | ------------------------- | ------------------- | ------- | ------------------------ |
| alice@company.com | UPDATE | credential:db_prod_mysql  | 2026-06-12 10:30:45 | SUCCESS | Password updated         |
| bob@company.com   | VIEW   | credential:api_key_stripe | 2026-06-12 09:15:22 | SUCCESS | Viewed detail            |
| alice@company.com | DELETE | category:staging          | 2026-06-11 16:45:00 | FAILURE | Category has credentials |

**Filters**:

- Date range (datepicker).
- User (autocomplete dari users).
- Action (dropdown: CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, IMPORT, EXPORT).
- Resource type (dropdown: credential, user, category, session).
- Status (radio: All, Success, Failure).

**Export Audit Log**:

- Admin dapat export filtered logs ke CSV.

---

## 7. DATA SCHEMA

### 7.1 Database Tables

#### Users Table

```
users
├── id                   UUID PRIMARY KEY
├── email               STRING UNIQUE NOT NULL
├── google_oauth_sub    STRING UNIQUE NOT NULL
├── role                ENUM ('admin', 'editor', 'viewer') DEFAULT 'viewer'
├── is_active           BOOLEAN DEFAULT true
├── created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
├── updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
├── last_login_at       TIMESTAMP NULLABLE
└── INDEX (email)
```

#### WhitelistEmails Table

```
whitelist_emails
├── id                  UUID PRIMARY KEY
├── email               STRING UNIQUE NOT NULL
├── is_active           BOOLEAN DEFAULT true
├── created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
├── created_by_user_id  UUID FOREIGN KEY (users.id)
├── notes               TEXT NULLABLE
└── INDEX (email)
```

#### Categories Table

```
categories
├── id                  UUID PRIMARY KEY
├── name                STRING NOT NULL UNIQUE
├── description         TEXT NULLABLE
├── color               STRING NULLABLE (hex: #0066FF)
├── icon                STRING NULLABLE (Material Icon name)
├── is_default          BOOLEAN DEFAULT false
├── created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
├── created_by_user_id  UUID FOREIGN KEY (users.id)
├── updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
├── updated_by_user_id  UUID FOREIGN KEY (users.id)
└── INDEX (name)
```

#### Credentials Table

```
credentials
├── id                          UUID PRIMARY KEY
├── category_id                 UUID FOREIGN KEY (categories.id)
├── name                        STRING NOT NULL (searchable, indexed)
├── description                 TEXT NULLABLE
├── tags                        JSONB (array of strings, indexed)
├── metadata_json               JSONB (custom fields, optional)
│
├── credential_fields           JSONB (encrypted, structure below)
│   ├── [key1]: { value: BYTEA, nonce: BYTEA }
│   └── [key2]: { value: BYTEA, nonce: BYTEA }
│
├── is_deleted                  BOOLEAN DEFAULT false
├── created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
├── created_by_user_id          UUID FOREIGN KEY (users.id)
├── updated_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
├── updated_by_user_id          UUID FOREIGN KEY (users.id)
│
├── INDEX (category_id)
├── INDEX (name)
├── INDEX (tags) using GIN (JSONB)
└── FULL TEXT SEARCH INDEX (name, description)
```

**Credential Fields Structure**:

```json
{
  "username": {
    "value": "<encrypted bytes>",
    "nonce": "<12 bytes nonce>",
    "algorithm": "aes-256-gcm"
  },
  "password": {
    "value": "<encrypted bytes>",
    "nonce": "<12 bytes nonce>",
    "algorithm": "aes-256-gcm"
  },
  "api_key": {
    "value": "<encrypted bytes>",
    "nonce": "<12 bytes nonce>",
    "algorithm": "aes-256-gcm"
  }
}
```

#### AuditLogs Table

```
audit_logs
├── id                  UUID PRIMARY KEY
├── user_id             UUID FOREIGN KEY (users.id)
├── action              STRING (CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, IMPORT, EXPORT)
├── resource_type       STRING (credential, user, category, whitelist, session)
├── resource_id         STRING (UUID atau identifier)
├── change_summary      TEXT (deskripsi singkat perubahan)
├── old_value           JSONB NULLABLE (encrypted, optional)
├── new_value           JSONB NULLABLE (encrypted, optional)
├── ip_address          STRING
├── user_agent          STRING
├── status              ENUM ('SUCCESS', 'FAILURE')
├── error_message       TEXT NULLABLE
├── created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
│
├── INDEX (user_id)
├── INDEX (created_at)
├── INDEX (resource_type, resource_id)
└── INDEX (action)
```

#### Sessions Table (Optional, untuk stateful session storage)

```
sessions
├── id                  UUID PRIMARY KEY
├── user_id             UUID FOREIGN KEY (users.id)
├── refresh_token_hash  STRING (bcrypt hash dari refresh token)
├── is_revoked          BOOLEAN DEFAULT false
├── created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
├── expires_at          TIMESTAMP
├── ip_address          STRING
├── user_agent          STRING
│
└── INDEX (user_id, expires_at)
```

### 7.2 Database Constraints & Relationships

**Foreign Keys**:

- credentials.category_id → categories.id (ON DELETE CASCADE)
- credentials.created_by_user_id → users.id (ON DELETE SET NULL)
- credentials.updated_by_user_id → users.id (ON DELETE SET NULL)
- audit_logs.user_id → users.id (ON DELETE SET NULL)
- whitelist_emails.created_by_user_id → users.id (ON DELETE SET NULL)

**Unique Constraints**:

- users(email)
- users(google_oauth_sub)
- whitelist_emails(email)
- categories(name)

**Indexes**:

- credentials(category_id) for fast filtering by category.
- credentials(name) for search performance.
- credentials(tags) using JSONB GIN index.
- users(email).
- audit_logs(created_at) for log queries.
- whitelist_emails(email).

---

## 8. NON-FUNCTIONAL REQUIREMENTS

### 8.1 Performance

**Target Metrics**:

- **Page Load Time** (First Contentful Paint): < 1 second.
- **Search Response Time**: < 100ms (fuzzy search dengan 1000 credentials).
- **API Response Time**: < 200ms (p95) untuk most endpoints.
- **Database Query Time**: < 50ms (p95) untuk typical queries.

**Optimization Strategies**:

- Frontend:
  - Code splitting dengan dynamic imports.
  - Image lazy loading.
  - CSS & JS minification, gzip compression.
  - Service worker untuk offline caching (optional).
  - Virtual scrolling untuk large lists (1000+ items).

- Backend:
  - Database query optimization (indexes, EXPLAIN ANALYZE).
  - Connection pooling (min 10, max 50 connections).
  - Caching layer (Redis) untuk frequently accessed data:
    - Categories list (TTL: 1 hour).
    - User roles (TTL: 30 minutes).
    - Whitelist emails (TTL: 15 minutes).
  - API response compression (gzip).
  - Pagination (default limit: 50 per page).

- Database:
  - Appropriate indexes (b-tree, gin, hash).
  - Statistics update via ANALYZE command (weekly).
  - Slow query logging untuk identify bottlenecks.

**Monitoring**:

- APM tools (DataDog, New Relic, atau Prometheus + Grafana).
- Real User Monitoring (RUM) untuk frontend performance.
- Database performance dashboard.

### 8.2 Availability & Uptime

**Target SLA**: 99.5% uptime (< 3.6 hours downtime per month).

**High Availability Setup**:

- Load balancing: Nginx/HAProxy dengan health checks.
- Backend: Minimal 2 replicas di production (untuk graceful rolling updates).
- Database: PostgreSQL replication (master-slave) atau PostgreSQL HA dengan patroni/stolon.
- Disaster recovery: Backup & restore testing setiap quarter.

**Graceful Degradation**:

- Jika backend down: Return 503 Service Unavailable.
- Jika cache down: Query database directly (slower tapi functional).
- Jika audit logging fails: Log locally dan retry async (don't block user action).

### 8.3 Scalability

**Horizontal Scaling**:

- Backend: Stateless design (no session state di backend). Deploy multiple instances behind load balancer.
- Database: Read replicas untuk high read volume (read-heavy workload).
- Cache: Redis cluster untuk distribute cache across multiple nodes.

**Vertical Scaling**:

- Database: Upgrade CPU/RAM untuk handling more connections.
- Cache: Increase memory allocation.

**Future Considerations**:

- Sharding untuk database (jika credentials reach 10M+).
- CDN untuk static assets.
- Message queue (RabbitMQ, Kafka) untuk async tasks (bulk import, audit log archival).

### 8.4 Maintainability

**Code Quality**:

- TypeScript strict mode (frontend & backend).
- Linting: ESLint, Prettier.
- Code review mandatory sebelum merge.
- Unit test coverage target: 80%+.
- Integration test untuk critical workflows.

**Documentation**:

- API documentation (OpenAPI/Swagger).
- Database schema diagram & data dictionary.
- Runbook untuk common operations (backup, restore, upgrade).
- Architecture decision records (ADR).

**Deployment**:

- Infrastructure as Code (Terraform, Ansible).
- Automated rollback on deployment failure.
- Canary deployments untuk production (5% → 25% → 100%).

### 8.5 Disaster Recovery

**RTO** (Recovery Time Objective): 1 hour.
**RPO** (Recovery Point Objective): 15 minutes.

**Backup Strategy**:

- Incremental daily snapshots (15-minute interval).
- Weekly full backup.
- Backup retention: 30 days local, 90 days cold storage.
- Off-site backup (separate AWS region or cloud provider).

**Recovery Procedure**:

1. Detect failure (automated monitoring).
2. Failover to backup infrastructure (automated).
3. Restore database dari latest backup.
4. Validate data integrity.
5. Resume service.

**Testing**: Quarterly disaster recovery drills (full restore to staging environment).

---

## 9. SUCCESS CRITERIA & METRICS

### 9.1 Functional Success Criteria

- All users dapat login hanya dengan authorized email (OAuth + whitelist).
- Credentials dapat dicari dengan fuzzy search dalam < 100ms.
- All actions tercatat di audit log tanpa exception.
- Credentials encrypted dengan AES-256-GCM tanpa plaintext di database.
- RBAC berfungsi: Viewer tidak bisa modify, Editor tidak bisa manage users.
- Bulk import 1000+ credentials berjalan < 5 seconds.
- Dark mode / light mode seamless switch tanpa flicker.

### 9.2 Non-Functional Success Criteria

- Page load time < 1 second (p95).
- API response time < 200ms (p95).
- System availability 99.5%+.
- Zero credential exposure in logs / error messages.
- All vulnerability scans pass (SAST, dependency check).

### 9.3 Adoption Metrics

- 90%+ of team adopt CMS within 3 months (vs spreadsheet).
- Average time to find credential: < 10 seconds.
- User satisfaction (NPS) > 7.5/10.
- Support ticket reduction (spreadsheet-related issues): 100%.

---

## 10. TIMELINE & RESOURCE ALLOCATION

### Phase 1: MVP (Weeks 1-6)

- Backend: Authentication, RBAC, basic CRUD untuk credentials.
- Frontend: Dashboard, credential list, search, create/edit.
- Database: Schema design & setup.
- Security: Encryption, audit logging, rate limiting.
- Deliverable: MVP siap untuk internal testing.

### Phase 2: Polish & Hardening (Weeks 7-10)

- UI refinement, dark mode, responsive design.
- Bulk import feature.
- Audit log viewer.
- Security audit & penetration testing.
- Performance optimization.
- Deliverable: Production-ready sistem.

### Phase 3: Deployment & Monitoring (Weeks 11-12)

- Infrastructure setup (Kubernetes, load balancer, monitoring).
- Data migration dari spreadsheet.
- User training & documentation.
- Go-live.
- Post-launch support & bug fixes.

---

## 11. APPENDICES

### A. Glossary

- **CMS**: Credential Management System.
- **MEK**: Master Encryption Key.
- **RBAC**: Role-Based Access Control.
- **OAuth2**: Open Authorization 2.0 protocol.
- **KMS**: Key Management Service.
- **JWT**: JSON Web Token.
- **CSRF**: Cross-Site Request Forgery.
- **XSS**: Cross-Site Scripting.
- **AES-256-GCM**: Advanced Encryption Standard with 256-bit key in Galois/Counter Mode.
- **Audit Log**: Immutable record of all system actions untuk compliance & forensics.

### B. References & Standards

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework
- PostgreSQL Security: https://www.postgresql.org/docs/current/sql-syntax.html
- OAuth2 RFC: https://tools.ietf.org/html/rfc6749
- AES-GCM: https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf

### C. Future Enhancements (Out of Scope MVP)

- Credential rotation automation (scheduled password refresh).
- Integration dengan external secret managers (AWS Secrets Manager, HashiCorp Vault).
- Mobile application.
- Credential retrieval API untuk applications.
- Advanced analytics dashboard.
- Email notifications untuk credential changes.
- Two-factor authentication (2FA).
- IP whitelisting untuk API access.
- Webhook support untuk external integrations.

---

**END OF DOCUMENT**

---

Catatan: Dokumen ini dirancang untuk export ke PDF dengan formatting clean tanpa emoji. Semua konten telah distruktur dengan headers hierarchy yang jelas (H1, H2, H3) dan tables untuk mudah dibaca baik dalam Markdown maupun PDF.
