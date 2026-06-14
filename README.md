This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

1. Neon PostgreSQL
- Go to https://neon.tech, create a project
- Copy the connection string into .env.local â DATABASE_URL
- Then run: npx prisma db push to create the tables

2. Google OAuth
- Go to Google Cloud Console (https://console.cloud.google.com) â APIs & Services â Credentials
- Create an OAuth 2.0 Client ID (Web application)
- Add http://localhost:3000/api/auth/callback/google as an authorized redirect URI
- Copy the Client ID and Secret into .env.local â AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET

3. AWS S3
- Create an S3 bucket, disable "Block all public access" (so uploaded files can be viewed)
- Add a bucket policy that allows s3:GetObject for * (public read)
- Create an IAM user with s3:PutObject and s3:GetObject on that bucket
- Copy credentials into .env.local

4. Run
npx prisma db push   # create tables
npm run dev          # start at http://localhost:3000

â» Baked for 7m 51s
# pic-pro
