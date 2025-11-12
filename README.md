# T-Yap Backend API

Digital Transport Payment Solution - Express.js TypeScript Backend

## Quick Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Git

### Installation

1. **Clone and install dependencies**
```bash
git clone <repository-url>
cd T-Yap
npm install
```

2. **Database setup**
```bash
# Create PostgreSQL database
createdb tyap_db

# Copy environment file
cp .env.example .env
```

3. **Configure environment variables**
Edit `.env` file:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/tyap_db"
JWT_SECRET="your-super-secret-jwt-key"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

4. **Run database migrations**
```bash
npx prisma migrate dev
npx prisma generate
```

5. **Start development server**
```bash
npm run dev
```

## API Documentation

Visit `http://localhost:3000/api-docs` for interactive Swagger documentation.

## Available Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify` - Email verification
- `POST /api/auth/create-pin` - Transaction PIN setup

### Health Check
- `GET /health` - Server status

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run migrate  # Run database migrations
npm test         # Run tests
```

## Project Structure

```
src/
├── config/         # Configuration files
├── controllers/    # Request handlers
├── middleware/     # Express middleware
├── routes/         # API routes
├── services/       # Business logic
├── utils/          # Utility functions
└── server.ts       # Main server file
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| DATABASE_URL | PostgreSQL connection string | Yes |
| JWT_SECRET | JWT signing secret | Yes |
| SMTP_USER | Email service username | Yes |
| SMTP_PASS | Email service password | Yes |
| PORT | Server port (default: 3000) | No |

## Authentication Flow

1. **Signup** → Email verification code sent
2. **Verify** → Email confirmed
3. **Create PIN** → Transaction PIN setup
4. **Login** → JWT token returned

## Tech Stack

- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT + bcrypt
- **Documentation**: Swagger/OpenAPI
- **Validation**: Joi
- **Email**: Nodemailer