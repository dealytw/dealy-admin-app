# Strapi Coupons Admin - Next.js Version

A modern Next.js admin panel for managing coupons stored in Strapi v5 Cloud. Features a spreadsheet-like interface with drag-to-reorder, inline editing, and comprehensive CRUD operations.

## Features

- 🔐 **Secure Authentication** - Login with Strapi Users & Permissions
- 📊 **Spreadsheet Interface** - AG Grid with inline editing and filters  
- 🎯 **Drag-to-Reorder** - Visual priority management with row dragging
- 🏪 **Merchant Management** - Modal-based merchant selection
- 🎨 **Dark Theme** - Beautiful UI with semantic design tokens
- 🔄 **Real-time Updates** - Batch saving with optimistic updates
- 📱 **Responsive Design** - Works on desktop and tablet
- ⚡ **Next.js 15** - App Router with server-side optimizations

## Quick Start

### 1. Environment Setup

Copy the example environment file and configure your Strapi URL:

```bash
cp env.example .env.local
```

Edit `.env.local`:
```bash
NEXT_PUBLIC_STRAPI_URL=https://your-strapi-instance.com
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to access the admin panel.

## Strapi v5 Backend Setup

### Required Collections

#### 1. Merchant Collection
```javascript
// Collection: merchants
{
  name: "string" (required),
  slug: "string" (optional)
}
```

#### 2. Coupon Collection
```javascript
// Collection: coupons
{
  coupon_uid: "string" (unique),
  merchant: "relation" (Many-to-One → Merchant),
  market: "enumeration" (US, UK, CA, etc.),
  coupon_title: "string" (required),
  value: "string",
  code: "string", 
  coupon_type: "enumeration" (percentage, fixed, etc.),
  affiliate_link: "string",
  description: "rich text (blocks)",
  editor_tips: "rich text (blocks)",
  priority: "number" (required, default: 1),
  starts_at: "date",
  expires_at: "date",
  coupon_status: "enumeration" (upcoming, active, expired),
  user_count: "number",
  last_click_at: "datetime",
  display_count: "number", 
  site: "string"
}
```

### Configuration Steps

#### 1. Enable CORS
In your Strapi admin panel:
- Go to **Settings → Global Settings → CORS**
- Add your frontend URL (e.g., `http://localhost:3000`)
- Enable credentials support

#### 2. Users & Permissions Setup
- Go to **Settings → Users & Permissions Plugin → Roles**
- Create an **Editor** role with these permissions:
  - **Coupons**: Find, FindOne, Create, Update, Delete
  - **Merchants**: Find, FindOne
- Create editor users and assign them the Editor role

#### 3. API Configuration
- Ensure **Draft & Publish** is disabled for coupons (recommended)
- Verify API endpoints are accessible at `/api/coupons` and `/api/merchants`

## Next.js Specific Features

### App Router Structure
```
src/app/
├── layout.tsx          # Root layout with providers
├── page.tsx            # Home page with auth redirect
├── login/page.tsx      # Authentication page
├── dashboard/page.tsx  # Dashboard overview
└── coupon-editor/page.tsx # Coupon management
```

### Middleware
- Route protection based on authentication status
- Automatic redirects for authenticated/unauthenticated users
- JWT validation support

### Environment Variables
- `NEXT_PUBLIC_STRAPI_URL`: Your Strapi instance URL
- `STRAPI_API_TOKEN`: Optional API token for server-side operations

## API Endpoints Used

- `POST /api/auth/local` - Authentication
- `GET /api/coupons?populate[merchant]=*&sort=priority:asc` - List coupons
- `POST /api/coupons` - Create coupon  
- `PUT /api/coupons/:documentId` - Update coupon
- `DELETE /api/coupons/:documentId` - Delete coupon
- `GET /api/merchants?sort=name:asc` - List merchants

## Development Notes

### Strapi v5 Specifics
- Uses `documentId` (string) for updates, not numeric `id`
- Request bodies must be wrapped as `{ data: {...} }`  
- Responses return `{ data: [...] }` format
- Relations use `{ connect: [id] }` syntax

### Next.js Optimizations
- Client-side authentication with JWT storage
- Server-side middleware for route protection
- Optimized bundle splitting with dynamic imports
- Built-in TypeScript support

## Deployment

For production deployment:

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

3. Deploy to your hosting provider (Vercel, Netlify, etc.)
4. Set the production `NEXT_PUBLIC_STRAPI_URL` environment variable
5. Update CORS settings in Strapi for your production domain

## Troubleshooting

### Common Issues

**401 Unauthorized**
- Check NEXT_PUBLIC_STRAPI_URL is correct
- Verify user has Editor role permissions
- Ensure CORS is configured properly

**Build Errors**
- Ensure all dependencies are installed
- Check TypeScript compilation errors
- Verify environment variables are set

**Runtime Errors**
- Check browser console for JavaScript errors
- Verify AG Grid CSS is loading properly
- Ensure data format matches expected Coupon interface

For additional support, check the browser dev tools console and network tabs for detailed error information.
