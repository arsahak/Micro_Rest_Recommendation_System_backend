# Micro_Rest_Recommendation_System — Backend API

A Node.js, Express, and TypeScript backend API combining authentication, coaching-center/education management, e-commerce, and an AI knowledge-base chatbot.

## Features

- ✅ Authentication (credentials + social login: Google, Facebook, GitHub) with JWT access tokens
- ✅ User & sub-user management with role-based permissions
- ✅ Admissions, attendance, exams, and fee management for a coaching/education center
- ✅ SMS notifications (Bulk SMS BD) — attendance reports, exam schedules/results, fee reminders
- ✅ QR code generation, bulk generation, and verification
- ✅ Site portfolio/branding settings (logo, favicon)
- ✅ E-commerce: products, categories, orders, customers, reviews
- ✅ AI chatbot with a RAG pipeline (OpenAI + Pinecone) over an uploaded PDF knowledge base
- ✅ MongoDB + Mongoose, TypeScript throughout

## Environment Variables

Create a `.env` file in the backend directory:

```env
NODE_ENV=development
PORT=8000
APP_NAME="Micro_Rest_Recommendation_System"

MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?appName=Cluster0

JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# SMTP, Cloudinary, ImgBB, Pinecone, OpenAI — see .env for full list
```

## Installation

```bash
npm install
npm run dev      # development (nodemon)
npm run build    # compile TypeScript
npm start        # run compiled build
```

## API Endpoints

### Auth (`/api/auth`)
- `POST /register`, `POST /login`, `POST /signin/social` — public
- `GET /me`, `POST /logout` — requires `Authorization: Bearer <token>`

### Users (`/api/users`) — requires auth
- `GET /sub-users`, `POST /sub-users`, `PUT /sub-users/:id`, `DELETE /sub-users/:id`
- `PUT /sub-users/:id/permissions`

### Admissions (`/api/admission`) — requires auth
- `GET /`, `GET /stats`, `GET /:id`, `POST /`, `PUT|PATCH /:id`, `DELETE /:id`

### Attendance (`/api/attendance`) — requires auth
- `POST /`, `POST /batch`, `GET /`, `GET /stats`, `GET /report`, `POST /report/sms`, `DELETE /:id`

### Exams (`/api/exam`) — requires auth
- `POST /`, `GET /`, `GET /stats`, `GET /:id`, `PUT|PATCH /:id`, `DELETE /:id`
- `POST /schedule/sms`
- `POST /results`, `POST /results/batch`, `GET /results`, `POST /results/sms`

### Fees (`/api/fee`) — requires auth
- `POST /`, `POST /bulk`, `GET /`, `GET /stats`, `GET /:id`, `PUT|PATCH /:id`, `DELETE /:id`
- `POST /reminder/sms`, `POST /overdue/sms`, `POST /payment/sms`

### SMS (`/api/sms`) — requires auth
- `POST /send`, `POST /bulk`, `POST /bulk/custom`, `POST /send/students`
- `GET /`, `GET /stats`, `GET /:id`

### QR Codes (`/api/qrcode`)
- `POST /`, `GET /`, `GET /:id`, `PUT|PATCH /:id`, `DELETE /:id`, `POST /bulk` — requires auth
- `POST /verify` — public (for scanning)

### Portfolio (`/api/portfolio`)
- `GET /` — public
- `POST /`, `PUT|PATCH /` — requires auth, multipart upload (`appLogo`, `favicon`)

### Dashboard (`/api/dashboard`) — requires auth
- `GET /overview` — e-commerce statistics

### E-commerce
- **Products** (`/api/products`): public `GET /`, `GET /:id`; admin/staff `POST /`, `PUT /:id`, `DELETE /:id`, `PATCH /:id/stock`, `POST /bulk-update`, `GET /low-stock`
- **Categories** (`/api/categories`): public `GET /`, `GET /tree`, `GET /:id`; admin/staff `POST /`, `PUT /:id`, `DELETE /:id`
- **Orders** (`/api/orders`): customer `GET /my-orders`, `POST /`; admin/staff `GET /`, `GET /stats`, `GET /recent`, `PUT /:id`, `PATCH /:id/status`, `PATCH /:id/payment`, `POST /:id/refund`, `DELETE /:id`
- **Customers** (`/api/customers`): public signup/signin/password-reset; authenticated self-service (`/me`, addresses); admin/staff management
- **Reviews** (`/api/reviews`): public `GET /`; customer `POST /`; admin/staff `PATCH /:id/status`, `POST /:id/reply`, `DELETE /:id`

### AI Chatbot
- **Chatbot** (`/api/chatbot`): `POST /query`, `GET /conversation/:sessionId`, `GET /conversations`, `DELETE /conversation/:sessionId`, `GET /stats`
- **Knowledge Base** (`/api/knowledge-base`): `POST /upload` (PDF), `GET /list`, `GET /stats`, `GET /:id`, `DELETE /:id`

## Response Format

```json
{ "success": true, "message": "...", "data": { ... } }
```
```json
{ "success": false, "message": "Error message" }
```

## Project Structure

```
backend/
├── config/        # DB connection, JWT utilities
├── controller/     # Route handlers for every module
├── middleware/     # auth, upload
├── modal/          # Mongoose schemas
├── routes/         # Express routers
├── services/       # OpenAI / Pinecone / PDF / RAG services
├── server.ts       # Express app setup
└── package.json
```

## Development

- `npm run dev` — start development server with nodemon
- `npm run build` — compile TypeScript to JavaScript
- `npm start` — start production server
- `npm run type-check` — type-check without building
- `npm run create-super-user` — create/update the admin super user
- `npm run test-ai-setup` — validate OpenAI/Pinecone/MongoDB configuration
