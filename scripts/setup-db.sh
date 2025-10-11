#!/bin/bash
# Database setup script for production

echo "Setting up database tables..."

# Generate Prisma client
npx prisma generate

# Push schema to create tables
npx prisma db push

echo "Database setup complete!"
