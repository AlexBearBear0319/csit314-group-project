# Interior Designer IDP setup

This setup covers account roles, login sessions, current and past Interior Designer Projects (IDPs), and project images.

## 1. Prepare account tables

Open the Supabase SQL Editor. Review and run [`auth-account-schema.sql`](auth-account-schema.sql) first. It creates or updates these tables:

| Table | Purpose |
| --- | --- |
| `user_profile` | The four role names and their active status |
| `user_account` | User ID, bcrypt password, name, email, optional date of birth/photo, status and role link |
| `user_session` | Hashed login token, CSRF token and 8-hour expiry |

The account role link is `user_account."profileId"` → `user_profile.id`. The role names are `User Admin`, `Interior Designer`, `Customer`, and `Platform Manager`. The script does not change existing roles, account IDs, projects, or passwords. It prints rows that need review. Match any existing accounts to the right role and reset imported plain-text passwords with the tool in section 5.

The main account columns are:

| Table | Column | Type | Rule |
| --- | --- | --- | --- |
| `user_profile` | `id` | integer identity | Primary key |
| `user_profile` | `name` | varchar | One of the four role names |
| `user_profile` | `description` | text | Optional role description |
| `user_profile` | `status` | varchar | `active` or `suspended` |
| `user_account` | `id` | integer identity | Primary key; existing values stay the same |
| `user_account` | `username` | varchar | Required user ID; sign-up treats it as case-insensitive |
| `user_account` | `password` | varchar | Required bcrypt hash; never store plain text |
| `user_account` | `name`, `email` | varchar | Required for new accounts |
| `user_account` | `dob`, `photo` | date, text | Optional |
| `user_account` | `status` | varchar | `active` or `suspended` |
| `user_account` | `"profileId"` | integer | Foreign key to `user_profile.id` |
| `user_session` | `account_id` | integer | Foreign key to `user_account.id` |
| `user_session` | `token_hash`, `csrf_token` | varchar | Server-managed session values |
| `user_session` | `expires_at` | timestamp with time zone | Eight hours after sign-in |

Next, review and run [`interior-designer-idps.sql`](interior-designer-idps.sql). It creates the project and image tables. It also creates `user_session` if it is not there yet.

## 2. Create the image bucket

In Supabase, create the private bucket `designer-idp-images` with a 5 MB file size limit. Allow `image/jpeg`, `image/png`, and `image/webp`.

The SQL turns on row-level security and removes direct `anon` and `authenticated` table access. The app uses the backend database connection. The backend checks project ownership for every request.

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

The backend does not create or seed tables when it starts. Use a server database connection that can read and write these tables, such as the `postgres` connection shown in `server/.env.example`.

## 4. Set Vercel environment variables

For one Vercel deployment, set the project root to this repository and the framework to **Services**. Leave `VITE_API_URL` empty. The root [`vercel.json`](../vercel.json) sends `/api/*` to the server and other paths to the client. Keep the Vercel site origin in `FRONTEND_URL`. Vercel requires the Services framework setting when the project uses its multi-service configuration.

If the client and API use separate hosts, set this value to the API origin and redeploy the client:

| Variable | Value |
| --- | --- |
| `VITE_API_URL` | Backend origin, such as `https://your-api.onrender.com`; do not add `/api` |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |

The publishable key may be in the website. The secret key must stay on the backend. Add the exact Vercel site address to the backend's `FRONTEND_URL` value so browser requests can pass CORS checks.

## 5. Check API and account data

Open these addresses for the deployed backend:

| Address | Expected result |
| --- | --- |
| `/api/health` | HTTP 200 and `{"status":"ok"}` when the API process is running |
| `/api/health/ready` | HTTP 200 and all checks show `ok` when the database, required tables and bucket are ready |

If readiness returns HTTP 503, read the `checks` values and `schemaIssues`. `database` means the backend cannot connect to PostgreSQL. `schemaIssues` lists missing table or column names. `storage` means the bucket, key or bucket settings are not ready. These responses do not show credentials or database errors.

The browser uses the backend API for login, registration and project actions. It sends images to Supabase Storage with a short-lived upload link. The backend checks and records each image after upload.

Login accepts `username` and `password`. The server reads the role from `user_account."profileId"`; do not send a role value from the browser. Public sign-up is available only for Customer and Interior Designer accounts.

Run the read-only account check from the project folder with `npm run auth:audit --workspace server`. It reports account IDs, user IDs, role links, password-hash status, project counts and duplicate IDs or emails. It does not print password values or hashes.

To reset one password, run `npm run auth:provision --workspace server -- --username=USER_ID` in a private terminal. Type the exact user ID, then enter the new password twice. The command keeps the account and project IDs and revokes that account's old sessions. Add `--role="Customer"`, `--role="Interior Designer"`, `--role="User Admin"`, or `--role="Platform Manager"` only when you intend to change a broken role link. Do not put a password in the command.

If the page says image cleanup is pending, run `npm run storage:cleanup --workspace server` in an environment with the backend variables set. The command retries Storage deletes for expired uploads and queued cleanup tasks.

## 6. Test the project pages

Use an active Interior Designer account. Do not use the shared database seed command.

1. Sign in on the Vercel site.
2. Open **Current IDPs**. Add a project, then view, edit, search and delete it.
3. Add a JPEG, PNG or WebP image. View the project and check the image and image text.
4. Open **Past IDPs**. Add a project with a completion date. Search by project name, property type, design style and completion date.
5. Edit the past project, remove an image, then delete the project.

To check API access with local code, run `npm test` and `npm run build` from the project folder. The API tests use a temporary SQLite database and do not connect to Supabase. The live health links confirm the deployed API, database, schema and Storage connection.

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

| Method | Route | Use |
| --- | --- | --- |
| `POST` | `/api/login` | Sign in with user ID and password; role comes from the database |
| `POST` | `/api/register/customer` | Create a Customer account |
| `POST` | `/api/register/designer` | Create an Interior Designer account |
| `GET` | `/api/session` | Check the signed-in account and session expiry |
| `DELETE` | `/api/session` | End the signed-in session |
