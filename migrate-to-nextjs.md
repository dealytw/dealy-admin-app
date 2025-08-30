# Migration Guide: React + Vite → Next.js

This guide helps you migrate from the old React + Vite setup to the new Next.js version.

## What Changed

### 1. Build System
- **Before**: Vite + React Router
- **After**: Next.js 15 with App Router

### 2. File Structure
```
# Old Structure
src/
├── App.tsx           # Main app component
├── main.tsx          # Entry point
└── pages/            # Route components

# New Structure  
src/app/
├── layout.tsx        # Root layout
├── page.tsx          # Home page
├── login/page.tsx    # Login route
├── dashboard/page.tsx # Dashboard route
└── coupon-editor/page.tsx # Editor route
```

### 3. Routing
- **Before**: `react-router-dom` with `<Route>` components
- **After**: Next.js file-based routing in `src/app/` directory

### 4. Environment Variables
- **Before**: `VITE_STRAPI_URL`
- **After**: `NEXT_PUBLIC_STRAPI_URL`

## Migration Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Environment Variables
```bash
cp env.example .env.local
# Edit .env.local with your Strapi URL
```

### 3. Start Development
```bash
npm run dev
```

## Key Benefits of Next.js Version

1. **Better Performance**: Server-side optimizations and automatic code splitting
2. **SEO Friendly**: Better meta tags and server-side rendering capabilities
3. **Built-in Middleware**: Route protection and authentication handling
4. **TypeScript Support**: Native TypeScript integration
5. **Production Ready**: Optimized builds and deployment options

## What Stayed the Same

- All UI components and design
- AG Grid spreadsheet functionality
- Authentication flow
- Data models and business logic
- Strapi v5 integration

## Troubleshooting Migration

### Common Issues

1. **Build Errors**: Ensure all dependencies are installed
2. **Environment Variables**: Check `.env.local` file exists
3. **Port Conflicts**: Next.js runs on 3000 by default (not 5173)
4. **TypeScript Errors**: Run `npm run build` to check for type issues

### Rollback Plan

If you need to rollback:
1. Keep your old `src/` directory as backup
2. The new Next.js version is in `src/app/`
3. You can restore the old setup by reverting package.json and config files

## Next Steps

1. Test the application with your Strapi backend
2. Configure CORS in Strapi for the new port (3000)
3. Update any deployment scripts
4. Test authentication and coupon management features
