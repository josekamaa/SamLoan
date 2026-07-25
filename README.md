# SAM Loans - Soft Loan Application

A comprehensive web application for managing soft loans with user registration, loan applications, and admin oversight.

## Features

- User registration and authentication
- Loan application submission
- Admin dashboard for loan management
- Loan approval/rejection workflow
- Fund disbursement tracking
- User management
- Real-time updates with Supabase

## Technology Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Supabase (PostgreSQL)
- Authentication: Supabase Auth
- Hosting: Vercel

## Getting Started

### Prerequisites

- Node.js (for local development)
- Supabase account
- Vercel account (for deployment)

### Local Development

1. Clone the repository
2. Configure Supabase:
   - Create a new project on Supabase
   - Run the SQL schema from `supabase-config.js`
   - Copy your project URL and anon key
3. Update `js/supabase-config.js` with your credentials
4. Open `index.html` in your browser

### Deployment to Vercel

1. Push your code to GitHub
2. Log in to Vercel
3. Import your repository
4. Configure environment variables:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_KEY`: Your Supabase anon key
5. Deploy

### Admin Setup

To create an admin user:
1. Register a user through the application
2. In Supabase dashboard, update the user's role to 'admin' in the users table

## Database Schema

The application uses the following tables:
- `users`: User profiles with roles
- `loans`: Loan applications and status
- `repayments`: Loan repayment tracking (future implementation)

## Security

- Row Level Security (RLS) policies in Supabase
- JWT authentication
- Role-based access control

## Support

For any issues or questions, please contact the development team.

---

**SAM Loans** - Simplifying access to soft loans
