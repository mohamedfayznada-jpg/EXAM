# EXAM — Student Assessment Platform

Production-ready architecture target: React/TypeScript frontend + Supabase PostgreSQL/Auth.

## Supabase migration

Create a Supabase project, then run the SQL in `supabase/schema.sql` in the Supabase SQL Editor.

The schema provides:
- profiles with student/admin roles
- exams
- questions and options
- exam attempts
- submitted answers
- server-side scoring fields
- Row Level Security policies
- timestamps and useful indexes

## Environment variables

Create a local `.env` file (never commit it):

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Current repository

The current browser MVP remains available in `index.html`, `app.js`, and `styles.css`. The next migration step is replacing its LocalStorage repository with Supabase queries and Supabase Auth.

## Security

Do not put the Supabase service-role key in browser code. Only the publishable/anon key belongs in the frontend, with RLS enabled.

## Production roadmap

1. Supabase Auth
2. Database-backed exams/questions/attempts
3. Admin CRUD and Question Bank
4. Secure server-side submission/scoring
5. Analytics and reports
6. Deployment
