# Supabase commerce setup

This directory contains the server-side commerce schema for Shin's House.

## Migration
Apply `migrations/202609210001_commerce_core.sql` to the dedicated Shin's House Supabase project before enabling commerce.

The migration creates:
- products and stock
- orders and order items
- order status history
- subscription plans and requests
- API rate-limit counters
- transactional RPCs for order creation, cancellation and payment notices

## Security model
- RLS is enabled on commerce tables.
- `anon` and `authenticated` receive no direct table access.
- Netlify Functions use the server-only `SUPABASE_SERVICE_ROLE_KEY`.
- The service-role key must never be placed in browser JavaScript or committed to Git.

## Required Netlify variables
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ACTION_TOKEN_SECRET` (long random value, 32+ bytes recommended)
- business/customer/bank variables from `.env.example`

Keep `COMMERCE_ENABLED=false` until the migration is applied and the complete launch checklist passes.

## Order integrity
The browser submits only product IDs and quantities. `create_order_transaction` locks the selected product rows, validates availability/stock, calculates the current server-side price, inserts the order/items, and decrements stock in one database transaction.

## Public order actions
The API returns short-lived-by-context HMAC-style action tokens generated server-side from `ACTION_TOKEN_SECRET`; the secret is never stored in the browser or database. Customer cancellation is limited to `입금 대기`, and cancellation restores stock transactionally.
