# Quick_AI

A modern full-stack AI SaaS platform built with React 19, Express, TailwindCSS, PostgreSQL (Neon), Redis (BullMQ), and Clerk Authentication.

---

## 📐 Architecture & Deployment Workflow

![System Architecture](./image.png)

### Workflow Breakdown

1. **Client / Frontend**:
   - Built with **React 19** & **Vite**.
   - Static build assets are synced to **AWS S3** and distributed globally with low latency via **AWS CloudFront CDN**.

2. **CI/CD Pipeline (GitHub Actions)**:
   - Automated linting, testing, and formatting on code push.
   - Builds backend Docker image tagged with commit SHA (`${{ github.sha }}`) and `:latest`.
   - Pushes image to **Docker Hub Registry**.
   - Triggers deployment to **AWS EC2** via secure SSH action.

3. **Backend / Kubernetes Cluster (AWS EC2)**:
   - Hosted on an AWS EC2 instance running lightweight Kubernetes (**k3s / MicroK8s**).
   - Manages application configurations with **K8s ConfigMaps** and sensitive credentials with **K8s Secrets**.
   - Runs backend instances across multiple pods using **K8s Deployments** with zero-downtime rolling updates.
   - Exposes backend services through a **K8s NodePort / Ingress** (`http://EC2-IP:30000`).

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, TailwindCSS, Framer Motion, GSAP, Lucide Icons, Clerk React
- **Backend**: Node.js, Express 5, Socket.io, BullMQ, Neon PostgreSQL, Redis, Cloudinary
- **AI Integrations**: Google Gemini API, OpenAI / OpenRouter, ClipDrop API
- **DevOps & Cloud**: Docker, Kubernetes (K3s), GitHub Actions CI/CD, AWS EC2, AWS S3, AWS CloudFront

---

## 📁 Project Structure

```text
Quick_AI/
├── .github/
│   └── workflows/
│       ├── ci.yml            # Automated CI checks (linting, build)
│       └── deploy.yml        # Multi-tier deployment to S3/CloudFront & EC2 K8s
├── client/                   # Vite + React 19 frontend
├── server/                   # Express 5 backend & workers
│   ├── configs/              # Database, Redis & Cloudinary configs
│   ├── controllers/          # AI generation & feature controllers
│   ├── middlewares/          # Clerk auth & rate limiting
│   ├── routes/               # Express API routes
│   ├── workers/              # BullMQ background task workers
│   └── dockerfile            # Multi-stage optimized Node.js Dockerfile
├── K8s/                      # Kubernetes manifests (Deployment, Service, ConfigMap)
└── image.png                 # Architecture diagram
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Redis (local or Upstash/cloud)
- PostgreSQL (Neon or local)

### 2. Environment Setup

#### Client (`client/.env`)
```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_BASE_URL=http://localhost:3000
```

#### Server (`server/.env`)
```env
PORT=3000
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
GEMINI_API_KEY=your_gemini_key
OPENROUTER_API_KEY=your_openrouter_key
CLIPDROP_API_KEY=your_clipdrop_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
FRONTEND_ORIGIN=http://localhost:5173
```

### 3. Running Locally

#### Run Backend
```bash
cd server
npm install
npm run dev
```

#### Run Frontend
```bash
cd client
npm install
npm run dev
```

---

## 🐳 Docker & Kubernetes Deployment

### Local Docker Build
```bash
cd server
docker build -t quickai-backend:latest .
docker run -p 3000:3000 --env-file .env quickai-backend:latest
```

### Deploying to Kubernetes on EC2
```bash
# Apply all Kubernetes manifests in one shot
kubectl apply -f K8s/

# Verify rollout status
kubectl rollout status deployment/quickai-backend
```
