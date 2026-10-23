# Interior Designer IDP setup

This setup covers current and past Interior Designer Projects (IDPs), login sessions and project images. It does not change existing account or profile tables.

## 1. Add the database tables

Open the Supabase SQL Editor. Review and run [`interior-designer-idps.sql`](interior-designer-idps.sql). The script stops if `public.user_account` or `public.user_profile` does not exist.

| Table | Purpose |
| --- | --- |
| `interior_design_project` | Current and past project details |
| `project_image` | Image details and the private Storage path |
| `user_session` | Revocable browser login sessions |
| `idp_image_upload_intent` | Temporary image upload records |
| `idp_image_cleanup_task` | Images waiting for a Storage delete retry |

`interior_design_project` fields:

| Field | Type | Rule |
| --- | --- | --- |
| `id` | integer | Project ID |
| `name` | varchar(160) | Required project name |
| `description` | text | Optional description |
| `property_type` | varchar(80) | Optional property type |
| `design_style` | varchar(80) | Optional design style |
| `status` | varchar(16) | `current` or `past` |
| `completion_date` | date | Required for a past project; empty for a current project |
| `designer_account_id` | integer | Owner ID from `user_account.id` |
| `created_at`, `updated_at` | timestamp with time zone | Record dates |

`project_image` fields:

| Field | Type | Rule |
| --- | --- | --- |
| `id` | integer | Image record ID |
| `project_id` | integer | Parent project ID |
| `storage_path` | varchar(512) | Private object path in the bucket |
| `file_name` | varchar(255) | Original file name |
| `content_type` | varchar(80) | JPEG, PNG or WebP |
| `size_bytes` | integer | 1 to 5,242,880 bytes |
| `alt_text` | varchar(240) | Image text |
| `sort_order` | integer | Image order |

The SQL turns on row-level security and removes direct `anon` and `authenticated` table access. The app uses the backend database connection. The backend checks project ownership for every request.

## 2. Create the image bucket

In Supabase, open **Storage** and create this bucket:

- Name: `designer-idp-images`
- Public: off
- Maximum file size: `5 MB`
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`

Keep the bucket private. The app uses short-lived signed upload and view links. It does not need SQL changes to Supabase Storage tables.

## 3. Set backend environment variables

Set these on the backend host, such as Render. Keep `SUPABASE_SECRET_KEY` on the server. Do not add it to Vercel or a variable that starts with `VITE_`.

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Supabase PostgreSQL connection string |
| `FRONTEND_URL` | Full Vercel site address; add each preview address separated by commas when needed |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Supabase server secret key |
| `SUPABASE_STORAGE_BUCKET` | `designer-idp-images` |
| `NODE_ENV` | `production` on the live backend; local value is `development` |
| `PORT` | Set by the host; local default is `3000` |

The backend uses the existing account tables for login. It does not create or seed tables when it starts. Use a backend database connection with access to the tables, such as the `postgres` connection shown in `server/.env.example`.

## 4. Set Vercel environment variables

Add these to the Vercel project, then redeploy the site:

| Variable | Value |
| --- | --- |
| `VITE_API_URL` | Backend origin, such as `https://your-api.onrender.com`; do not add `/api` |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |

The publishable key may be in the website. The secret key must stay on the backend. Add the exact Vercel site address to the backend's `FRONTEND_URL` value so browser requests can pass CORS checks.

## 5. Check the API links

Open these addresses for the deployed backend:

| Address | Expected result |
| --- | --- |
| `/api/health` | HTTP 200 and `{"status":"ok"}` when the API process is running |
| `/api/health/ready` | HTTP 200 and all checks show `ok` when the database, tables and bucket are ready |

If readiness returns HTTP 503, read the `checks` values. `database` means the backend cannot connect to PostgreSQL. `schema` means a required table is missing. `storage` means the bucket, key or bucket settings are not ready. These responses do not show credentials or database errors.

The browser uses the backend API for login and project actions. It sends images to Supabase Storage with a short-lived upload link. The backend checks and records each image after upload.

If the page says image cleanup is pending, run `npm run storage:cleanup --workspace server` in an environment with the backend variables set. The command retries Storage deletes for expired uploads and queued cleanup tasks.

## 6. Test the project pages

Use an active Interior Designer account. Do not use the shared database seed command.

1. Sign in on the Vercel site.
2. Open **Current IDPs**. Add a project, then view, edit, search and delete it.
3. Add a JPEG, PNG or WebP image. View the project and check the image and image text.
4. Open **Past IDPs**. Add a project with a completion date. Search by project name, property type, design style and completion date.
5. Edit the past project, remove an image, then delete the project.

To check API access with local code, run `npm test` and `npm run build` from the project folder. The API tests use a temporary SQLite database and do not connect to Supabase. The live checks above confirm the deployed database and Storage connection.

## API routes

| Method | Route | Use |
| --- | --- | --- |
| `GET`, `POST` | `/api/designer/current-idps` | Search or add current projects |
| `GET`, `PUT`, `DELETE` | `/api/designer/current-idps/:id` | View, edit or delete a current project |
| `GET`, `POST` | `/api/designer/past-idps` | Search or add past projects |
| `GET`, `PUT`, `DELETE` | `/api/designer/past-idps/:id` | View, edit or delete a past project |
| `POST` | `/api/designer/:type-idps/:id/images/upload-url` | Create a scoped upload link |
| `POST` | `/api/designer/:type-idps/:id/images/:intentId/complete` | Check the upload and save image details |
| `PATCH`, `DELETE` | `/api/designer/:type-idps/:id/images/:imageId` | Edit image text or remove an image |

The current and past routes keep their results separate. The server gets the owner ID from the signed-in session, not from the browser request.
