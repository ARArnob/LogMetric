<h1 align="center">📊 LogMetric</h1>

<p align="center">
  <em>A modern, multi-tenant log telemetry platform built for scale and visibility.</em>
</p>

<p align="center">
  <a href="https://www.oracle.com/java/"><img src="https://img.shields.io/badge/Java-17-orange.svg" alt="Java Version"></a>
  <a href="https://spring.io/projects/spring-boot"><img src="https://img.shields.io/badge/Spring%20Boot-4.0.6-brightgreen.svg" alt="Spring Boot"></a>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16-black.svg" alt="Next.js"></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-61DAFB.svg" alt="React"></a>
  <a href="https://www.rabbitmq.com/"><img src="https://img.shields.io/badge/RabbitMQ-Enabled-red.svg" alt="RabbitMQ"></a>
  <a href="https://www.elastic.co/"><img src="https://img.shields.io/badge/Elasticsearch-Enabled-blue.svg" alt="Elasticsearch"></a>
  <a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/PostgreSQL-Enabled-blue.svg" alt="PostgreSQL"></a>
</p>

---

**LogMetric** is a high-performance log ingestion and analysis platform. Organizations can securely ingest logs via API keys, while the backend asynchronously clusters them by structural patterns using RabbitMQ and Elasticsearch. The Next.js dashboard provides real-time streaming, anomaly-based alerting, and team management.

## ✨ Key Features

- **Multi-Tenant Architecture**: Strict `Organization → System → ApiKey` hierarchy to ensure absolute data isolation.
- **Pattern Clustering**: Automatically groups similar logs by stripping variables and hashing templates, saving massive storage space.
- **Real-Time Visibility**: Live tail streaming using Server-Sent Events (SSE) directly to the dashboard.
- **Smart Alerting**: Anomaly detection (Z-score, entropy, error rate, parameter cardinality) with cooldown-gated email notifications.
- **Robust Security**: Dual auth (JWT + API Keys), OTP email verification, and strict Role-Based Access Control (RBAC).
- **Beautiful UI**: Built with Next.js & TailwindCSS. Includes full theme support (Midnight, Daylight, Amber CRT), responsive design, and keyboard shortcuts.

## 🚀 Quick Start

### 1. Start Infrastructure
Start PostgreSQL, RabbitMQ, Elasticsearch, and MailHog:
```bash
docker compose up -d
```

### 2. Run Backend (Spring Boot)
Generate a strong JWT secret and start the Spring Boot application:
```powershell
$env:JWT_SECRET = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
./mvnw spring-boot:run
```

### 3. Run Frontend (Next.js)
Install dependencies and run the dashboard:
```bash
cd logmetric-ui
npm install
npm run dev
```
*(Copy `.env.example` to `.env.local` first.)*

## 📚 Documentation

Dive deeper into LogMetric's internals:

- [🏗️ Architecture & Design](docs/architecture.md)
- [🔌 API Reference](docs/api-reference.md)
- [🔒 Security Practices](docs/security.md)

## 🧪 Testing

Run the comprehensive 115+ test suite (unit & integration) ensuring robust RBAC and tenant-isolation:
```bash
./mvnw verify
```
