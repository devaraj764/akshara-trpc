# Akshara Server

A secure Node.js/TypeScript server with tRPC, JWT authentication, and Drizzle ORM.

## Features

- 🔐 **JWT Authentication** with access/refresh tokens
- 🛡️ **Security Best Practices** (rate limiting, password hashing, token rotation)
- 🚀 **tRPC** for type-safe API
- 📊 **Drizzle ORM** for database operations
- 🎯 **TypeScript** for type safety
- ⚡ **Fast Development** with hot reload

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Copy the example environment file and update it with your settings:

```bash
cp .env.example .env
```

**Important**: Update the following in your `.env` file:

- `JWT_ACCESS_SECRET` - Strong secret for access tokens
- `JWT_REFRESH_SECRET` - Strong secret for refresh tokens
- `DATABASE_URL` - Your PostgreSQL connection string

### 3. Database Setup

Make sure PostgreSQL is running and create your database:

```sql
CREATE DATABASE akshara_db;
```

Run database migrations:

```bash
npm run db:push
```

### 4. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:generate` - Generate database migrations
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Drizzle Studio

## API Routes

### Authentication
- `POST /trpc/auth.signUp` - User registration
- `POST /trpc/auth.signIn` - User login
- `POST /trpc/auth.refreshToken` - Refresh access token

### User Management
- `GET /trpc/user.getProfile` - Get current user profile
- `PUT /trpc/user.updateProfile` - Update user profile
- `GET /trpc/user.getAllUsers` - Get all users (admin only)

### Other Services
- Student management (`/trpc/student.*`)
- Teacher management (`/trpc/teacher.*`)
- Class management (`/trpc/class.*`)
- Attendance tracking (`/trpc/attendance.*`)
- Organization management (`/trpc/organization.*`)
- Fee management (`/trpc/fee.*`)

## Authentication Flow

1. **Sign Up/Sign In**: Returns access token (15m) + refresh token (7d)
2. **API Requests**: Include access token in `Authorization: Bearer <token>`
3. **Token Refresh**: Use refresh token to get new access token
4. **Security**: Automatic token rotation, rate limiting, secure password hashing

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `JWT_ACCESS_SECRET` | Access token secret | **Required** |
| `JWT_REFRESH_SECRET` | Refresh token secret | **Required** |
| `ACCESS_TOKEN_EXPIRY` | Access token expiry | `15m` |
| `REFRESH_TOKEN_EXPIRY` | Refresh token expiry | `7d` |
| `DATABASE_URL` | PostgreSQL URL | **Required** |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |

## Security Features

- ✅ **Password Strength Validation** (8+ chars, mixed case, numbers, symbols)
- ✅ **Rate Limiting** (5 attempts, 30min lockout)
- ✅ **Token Rotation** (refresh tokens invalidated on use)
- ✅ **Secure Hashing** (bcrypt with 12 rounds)
- ✅ **CORS Protection**
- ✅ **Token Blacklisting**
- ✅ **Multi-device Session Management**

## Production Deployment

1. **Environment**: Set `NODE_ENV=production`
2. **Secrets**: Generate strong JWT secrets
3. **Database**: Use production PostgreSQL instance
4. **SSL**: Enable HTTPS in production
5. **Monitoring**: Set up logging and monitoring

## Development

### Project Structure

```
src/
├── db/           # Database schema and connection
├── routes/       # tRPC route definitions
├── services/     # Business logic services
├── types.db.ts   # Type definitions
└── index.ts      # Server entry point
```

### Adding New Routes

1. Create service in `src/services/`
2. Add route definition in `src/routes/`
3. Export route in main router (`src/index.ts`)

## Troubleshooting

**Database Connection Issues**:
- Verify PostgreSQL is running
- Check DATABASE_URL format: `postgresql://user:pass@host:port/db`

**JWT Errors**:
- Ensure JWT secrets are set and different
- Check token expiry format (e.g., '15m', '7d')

**TypeScript Errors**:
- Run `npm run build` to check compilation
- Ensure all imports are correct

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## License

MIT License