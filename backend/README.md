# Endpoint Portal API

This is the backend for the initial milestone of the endpoint management portal.

## Features
- Express server
- PostgreSQL connection setup
- Health endpoint at `/api/health`
- Basic logging and error handling
- Environment-based configuration

## Prerequisites
- Node.js 18+
- PostgreSQL 14+

## Setup
1. Copy `.env.example` to `.env`
2. Update the PostgreSQL settings in `.env`
3. Install dependencies:

```bash
npm install
```

## Start the server

```bash
npm start
```

For development mode:

```bash
npm run dev
```

## Test the API

```bash
curl http://localhost:3000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "endpoint-portal-api"
}
```
