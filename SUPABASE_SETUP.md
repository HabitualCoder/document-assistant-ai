# Supabase PostgreSQL Setup Guide

## 🔧 **Getting Your Supabase Database URL**

### **Step 1: Get Your Supabase Project Details**

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **Database**
4. Find your **Connection string** section

### **Step 2: Get Your Database Password**

1. In the same **Database** settings page
2. Look for **Database Password** section
3. If you don't have one, click **Generate new password**
4. **Save this password** - you'll need it!

### **Step 3: Construct Your DATABASE_URL**

Your `DATABASE_URL` should look like this:

```
postgres://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

**Replace:**
- `[YOUR-PASSWORD]` with your database password
- `[YOUR-PROJECT-REF]` with your project reference (found in your Supabase URL)

### **Step 4: Set Up Environment Variables**

#### **For Local Development:**
Create `.env.local` with:
```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
SUPABASE_URL="https://[YOUR-PROJECT-REF].supabase.co"
SUPABASE_ANON_KEY="your_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
```

#### **For Vercel Deployment:**
Add these environment variables in your Vercel dashboard:
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### **Step 5: Run Database Migrations**

```bash
# Generate Prisma client
npx prisma generate

# Push schema to Supabase
npx prisma db push

# Optional: Seed database
npx prisma db seed
```

### **Step 6: Verify Connection**

```bash
# Test database connection
npx prisma db pull
```

## 🚨 **Important Notes**

1. **Never commit your `.env.local` file** - it contains sensitive credentials
2. **Use different passwords** for development and production
3. **Enable Row Level Security (RLS)** in Supabase for production
4. **Monitor your database usage** in Supabase dashboard

## 🔍 **Troubleshooting**

### **Connection Issues:**
- Check if your IP is whitelisted in Supabase
- Verify the password is correct
- Ensure the project reference is correct

### **Migration Issues:**
- Run `npx prisma db push --force-reset` to reset schema
- Check Supabase logs for detailed error messages

### **Performance:**
- Consider upgrading your Supabase plan for production
- Monitor query performance in Supabase dashboard
