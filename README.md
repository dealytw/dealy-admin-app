# Coupon Admin Panel

A modern React admin panel for managing coupons stored in Strapi v5 Cloud. Features a spreadsheet-like interface with drag-to-reorder, inline editing, and comprehensive CRUD operations.

## Features

- 🔐 **Secure Authentication** - Login with Strapi Users & Permissions
- 📊 **Spreadsheet Interface** - AG Grid with inline editing and filters  
- 🎯 **Drag-to-Reorder** - Visual priority management with row dragging
- 🏪 **Merchant Management** - Modal-based merchant selection
- 🎨 **Dark Theme** - Beautiful UI with semantic design tokens
- 🔄 **Real-time Updates** - Batch saving with optimistic updates
- 📱 **Responsive Design** - Works on desktop and tablet

## Quick Start

### 1. Environment Setup

Copy the example environment file and configure your Strapi URL:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```bash
VITE_STRAPI_URL=https://your-strapi-instance.com
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` to access the admin panel.

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
- Add your frontend URL (e.g., `http://localhost:5173`)
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

## Usage

### Authentication
1. Navigate to `/login`
2. Enter your Strapi editor credentials
3. JWT tokens are stored in session storage

### Coupon Management
- **Inline Editing**: Click any editable cell to modify values
- **Batch Saving**: Edit multiple rows, then click "Save (n)" 
- **Drag Reordering**: Use drag handles to reorder by priority
- **Merchant Selection**: Click merchant names to open selection modal
- **Filtering**: Use toolbar filters for text search and dropdowns

### Data Architecture

The app uses a clean **port-adapter pattern** for easy migration:

```
src/
├── domain/          # Business types and interfaces
├── data/            # Strapi adapters and API client  
├── components/      # UI components
├── pages/           # Route components
└── contexts/        # React contexts
```

This architecture allows switching to Next.js API routes later without changing UI code.

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

### Future Enhancements
- **Metrics Dashboard**: GA4 and Search Console integration (requires server-side credentials)
- **Rich Text Editor**: Modal editing for description/editor_tips fields
- **Bulk Operations**: Multi-select and bulk actions
- **Export/Import**: CSV/Excel data management

## Deployment

For production deployment:

1. Build the application:
```bash
npm run build
```

2. Deploy the `dist/` folder to your hosting provider
3. Set the production `VITE_STRAPI_URL` environment variable
4. Update CORS settings in Strapi for your production domain

## Migration to Next.js

When ready to migrate to Next.js App Router:

1. The domain layer (`src/domain/`) moves unchanged
2. Replace data adapters with Next.js API routes
3. UI components require minimal changes
4. Add server-side environment variables and middleware

The clean architecture makes this migration straightforward.

## Troubleshooting

### Common Issues

**401 Unauthorized**
- Check VITE_STRAPI_URL is correct
- Verify user has Editor role permissions
- Ensure CORS is configured properly

**Network Errors**
- Confirm Strapi instance is running
- Check browser network tab for blocked requests
- Verify API endpoints are published in Strapi

**Grid Not Loading**
- Check browser console for JavaScript errors
- Verify AG Grid CSS is loading properly
- Ensure data format matches expected Coupon interface

For additional support, check the browser dev tools console and network tabs for detailed error information.