# UI guidelines

Use this file for all UI work in this repository. It defines the shared look and the reusable UI patterns.

The source preview is [`docs/ui-preview.html`](docs/ui-preview.html). It is a separate visual example. Its records and interactions are not part of the application.

## Shared theme

The single theme file is `client/src/styles.css`. Add shared tokens there. Do not add a second colour or spacing system.

### Colours

| Token | Value | Use |
|---|---|---|
| `canvas` | `#F7F5F0` | Main page background |
| `surface` | `#FFFFFF` | Cards, panels, forms, and menus |
| `surface-hover` | `#F0EEE8` | Hover fill for quiet controls |
| `ink` | `#262522` | Main text |
| `muted` | `#6D6A63` | Secondary text |
| `action` | `#4F5A45` | Main action and focus colour |
| `action-hover` | `#3D4735` | Main action hover |
| `action-soft` | `#E9ECDF` | Selected and success fill |
| `action-ink` | `#3E4A32` | Text on `action-soft` |
| `border` | `#DEDAD2` | Borders and dividers |
| `danger` | `#A6362B` | Destructive actions and errors |
| `danger-soft` | `#F9E9E5` | Error fill |

Use the exact values above. Do not use colour alone to show a state. Add a word or an icon with an accessible name.

### Fonts and text

| Use | Font | Weight |
|---|---|---|
| Body, labels, and controls | DM Sans, then Arial, then sans-serif | 400 by default; 500 for labels and buttons; 600 for emphasis |
| Display headings | Lora, then Georgia, then serif | 400 by default; 500 or 600 only for emphasis |

The page loads DM Sans and Lora from Google Fonts. The local font stacks remain in place if the network is unavailable. Body text starts at 16px with a 1.6 line height. Use these sizes:

| Use | Size |
|---|---:|
| Page heading | 36-48px |
| Section heading | 28-38px |
| Card heading | 22-24px |
| Body | 16px |
| Secondary copy | 14px |
| Labels and table headings | 12-14px |
| Small metadata | 11-12px |

Use Lora for headings. Do not use all caps for long text. Keep labels short.

### Space, size, and shape

Use a 4px spacing step. Tailwind `1` means 4px, `2` means 8px, `3` means 12px, and `4` means 16px. Use larger values as multiples of 4px.

| Item | Rule |
|---|---|
| Page content | Up to 1200px wide, centered |
| Text form | Up to 672px wide |
| Form control | At least 46px high |
| Button | At least 46px high; small action at least 40px |
| Control corner | 8px |
| Card corner | 10px |
| Panel corner | 12px |
| Card shadow | `0 12px 40px rgb(38 37 34 / 4%)` |
| Menu shadow | `0 12px 28px rgb(38 37 34 / 12%)` |
| Project card image | 1.35:1 ratio; use `object-fit: cover` |
| Detail or gallery image | Keep the source ratio when possible. Use `object-fit: cover` only when a crop is safe. |

### Breakpoints

Use the shared Tailwind breakpoints in `styles.css`:

| Name | Width | Use |
|---|---:|---|
| `sm` | 400px | Small phone changes |
| `md` | 701px | Switch between phone and wide layouts |
| `lg` | 1000px | Wide navigation and columns |

Keep pages usable at 320px. Do not let the page itself scroll from side to side. A wide table may scroll inside its own wrapper.

### Focus and motion

- Keep a clear focus ring on every link, button, and form control.
- Use a 3px action-colour outline with a 3px offset.
- Keep keyboard focus visible. Do not remove the outline without adding a clear replacement.
- Give enabled buttons a short hover and pressed response. Keep the response visible without relying on colour alone.
- Respect `prefers-reduced-motion`. Remove or shorten motion when the user asks for less motion.
- Do not use movement to show an error, success, or selection.

## Shared shell for the four roles

All role pages use the same header and main content width. The header shows the site name, the role's links, the user's name and role, and `Logout`. Below 1000px, use the menu button. It must show its open state to assistive tools. Close the menu after the user selects a link or presses Escape.

| Role | Home | Current links |
|---|---|---|
| User Admin | `/admin` | Dashboard, User Accounts, User Profiles |
| Interior Designer | `/designer` | Dashboard, Company Info, Current projects, Past projects |
| Customer | `/customer` | Dashboard, Search IDPs, My Shortlist |
| Platform Manager | `/manager` | Dashboard, IDP Categories, Reports |

Keep one clear page heading. Do not add a subtitle, welcome text, or instructions to use the menu.

## Current pages and future page patterns

The routes below are in `client/src/App.jsx`.

| Page | Current state | Story area |
|---|---|---|
| `/login` | Server-backed login with a user ID and password. The server reads the role from the linked user profile. | Sign in to one of the four roles. |
| `/register` | Choose an account type. | Public sign-up for Customer or Interior Designer. |
| `/register/customer`, `/register/designer` | Server-backed account creation. | Create a Customer or Interior Designer account. |
| `/admin` | Existing role dashboard with a page heading. | User Admin home. No dashboard data is defined in the stories. |
| `/admin/accounts` | Existing title placeholder. | User account create, view, update, delete, and search. |
| `/admin/profiles` | Existing title placeholder. | User profile create, view, update, delete, and search. |
| `/designer` | Design studio with saved project totals, recent projects and a material study. | Interior Designer home. Uses the current and past project APIs. |
| `/designer/company` | Existing title placeholder. | Company information create, view, update, delete, and search. |
| `/designer/current-idps` | Folder gallery with search, server sorting, numbered pages, forms, photo upload and a project dialog. | Current IDP create, view, update, delete, and search. View and shortlist counts are not implemented. |
| `/designer/past-idps` | Folder gallery with search, server sorting, numbered pages, forms, photo upload and a project dialog. | Past IDP create, view, update, delete, and search. |
| `/customer` | Existing role dashboard with a page heading. | Customer home. No dashboard data is defined in the stories. |
| `/customer/search` | Existing title placeholder. | Search, view, and save IDPs. |
| `/customer/shortlist` | Existing title placeholder. | Search and view a shortlist. The stories use both saved IDPs and shortlisted designers. See `To confirm` below. |
| `/manager` | Existing role dashboard with a page heading. | Platform Manager home. No dashboard data is defined in the stories. |
| `/manager/categories` | Existing title placeholder. | IDP category create, view, update, delete, and search. |
| `/manager/reports` | Existing title placeholder. | Daily, weekly, and monthly reports. |
| `*` | Existing not-found title placeholder. | No business story is defined for this route. |

Login, registration and role checks use the server API. Do not add a role selector to the login form or allow public sign-up as User Admin or Platform Manager.

### Source items to confirm

- **To confirm:** User account and user profile stories say `delete`. The task allocation says `Suspend User Account (#9)` and `Suspend User Profile (#4)`. Keep the action open until the team confirms it.
- **To confirm:** Customer stories say to save IDPs. Other stories refer to a shortlist of designers. The task allocation also uses `Save IDP to Shortlist`, `Search Shortlisted IDP`, and `View Shortlisted IDP`. Confirm what `My Shortlist` contains before building this feature.

Do not silently choose one meaning. Do not assign work or ownership from these notes.

## Reusable component rules

### Buttons

Use `Button` from `client/src/components/Button.jsx`. Keep one clear main action on a form or page. Use `secondary` for a safe return or view action. Use `danger` only for a confirmed destructive action.

The shared component accepts `primary`, `secondary`, `success`, `danger`, `warning`, `info`, `light`, `dark`, `outline-primary`, `outline-secondary`, `outline-success`, `outline-danger`, `outline-warning`, `outline-info`, `outline-light`, `outline-dark`, and `link`. `ResultsTable` keeps its existing `actions` API and passes each `variant` to `Button`.

Set a button type. Use `type="submit"` for a form action. Use `type="button"` for every other button. Disable a button while its action cannot run. For a pending action, set `loading`; keep the action name visible.
After an action finishes, show a short success or error message. Do not show success while work is still pending.

### Forms and validation

Use `FormField` for a labelled input, select, text area, or file input. Use `FormFields` for a short create or update form. Keep the current props: `fields`, `initial`, `submitLabel`, and `onSubmit`. You can also pass `errors`, `disabled`, and `isSubmitting`.

- Put a visible label beside each field. A placeholder is not a label.
- Mark required fields in HTML and in the visible label.
- Use the input type that matches the value, such as `email`, `date`, or `number`.
- Show an error beside the field. Set `aria-invalid` and link the error with `aria-describedby`.
- Keep the value after a validation error.
- Do not clear a form when save fails.
- For project use cases #22 and #27, the user confirmed on 30 October 2026 that only the creation date stays fixed. Do not provide a creation-date input or accept a client-supplied creation timestamp. Keep the past project's completion-date input editable and validate it as a real calendar date on the server.
- Map server field errors to the affected controls. Focus the first invalid control. Keep draft text after a rejected write. If some image steps succeed before a failure, update saved image data and keep only unfinished upload steps for retry. Show success only when all selected steps finish.
- Disable fields while the form is locked or saving.
- Show a loading state on the submit button while saving.
- Ask only for values that the story or client confirms.

### Search and filters

Use `SearchBar` for a keyword search. Keep its `placeholder` and `onSearch(keyword)` props. Use visible labels for filters. Use buttons with `aria-pressed` for on/off filter chips. Keep the chosen filter visible and easy to remove. Do not add filter values without a story or client decision.

### Tables

Use `ResultsTable` with its current `columns`, `rows`, and `actions` props. Keep the optional `ariaLabel`. Use a real table with column headings. Keep each action labelled. On a narrow screen, scroll the table wrapper, not the page. Use `No results found.` for an empty result set. Do not fill an empty table with sample records.

### Project cards, galleries, and details

Current and past IDPs use the shared project folder card. Show the project name, property type, design style, and image count. Past IDPs also show the completion date. Use a 1.35:1 folder and saved project photos. Use a plain folder when a project has no photo preview. Use a frosted front panel over the photo sheets. Assemble the folder as it enters view. Let the panel lean toward the pointer. On hover or keyboard focus, lift the sheets. When the folder opens, fan out its photo sheets as buttons. Add demo records only when the user asks. Mark them with `[Demo]` and keep existing records.

Show three project cards per row on wide screens, two on tablet screens, and one on phone screens. Load nine projects per page from the API. Return the total and page count. Load preview images for the selected page and load the full gallery when a user opens a project.

Default both collections to FIFO: creation date ascending, then ID ascending. Offer Oldest first, Newest first, Name A–Z and Name Z–A. State that oldest/newest use creation date in the option labels. Apply search and sort on the server before pagination. Use an ID tie-breaker for every order. Name sorting ignores letter case. Search and sort changes start at page 1. CRUD reloads and retry keep the selected search, sort and page. After a delete empties the last page, show the last valid page.

Keep Previous and Next with disabled bounds and the page count. Add numbered page buttons with `aria-current="page"` on the current page. Show the first page, last page and current page's neighbours. Use gaps for omitted ranges and keep controls within a 320px page. After a page change, focus the results heading. Do not take focus from an open form.

Distinguish loading, a failed read, an empty collection and a search with no matches. A failed read must hide old cards and show an error with Try again. Clear the read error after a successful retry. Cancel old reads when the selection changes, and ignore any late result.

Give each folder an accessible open and close action. Add photos opens the project editor. Keep View project visible and open project details in a modal dialog. Keep Open/Close folder, View, Edit, and Delete in a keyboard-accessible More menu. A photo sheet opens the viewer at that photo. Do not hide an action on hover. Support Enter, Space, Escape, and arrow keys in the menu. Keep a visible focus ring and usable touch targets. Respect reduced motion.

Use `DetailsView` for a label and value list. Keep each field name visible. In the project dialog, keep the image at its source ratio and fit it inside the viewer; do not crop it. Limit the image area to 52% of the viewport height or 32rem. For a gallery, keep the image order and do not advance automatically. Put arrows and photo dots below the image with 44px controls. Support phone swipes and left/right arrow keys. Wrap in both directions. Show the photo position, loading state, and a clear error if an image fails. Return focus to the control that opened the dialog. Keep key content in view. For multiple uploads, keep each selected image visible and show which image is uploading. Do not add project metrics or company facts without a source.

Keep photo links private. If a link is missing or a photo fails to load, request fresh links through the authenticated project detail API. Limit automatic recovery to one request per project view every five minutes. Share an active refresh within that view. Show Refreshing photo(s) while it runs and Retry photo(s) after a persistent failure. A retry must reset image loading/error state even when the image ID or URL is unchanged. Cancel refreshes when their view closes. Use this recovery for folders, detail carousels and recent-project thumbnails.

### Designer studio

Use cream, olive and warm material colours with Lora headings. Use simple architectural lines for empty image covers. Do not make a concept illustration look like a saved client photo.

Read project totals from API pagination. Request `sort=recent` explicitly for dashboard reads: edit time descending, then ID descending. Show at most four recent projects from the first page of each collection. The collection pages' FIFO default must not change which projects count as recent. Open a project in a dialog. Keep errors separate from an empty collection, and provide a retry action when loading fails.

Use the Remotion player for the room study. The animation shows structure, furniture, then small details. Start with the finished room. Play starts one reveal; Pause stops it; Play at the end replays it. Do not loop or advance project photos automatically. Keep the three material choices available with or without motion. When reduced motion is on, show the finished still and hide the playback control. Keep the player in the designer route so other roles do not load it.

Use short hover and press feedback, loading placeholders and a short dialog entrance. Remove movement when reduced motion is on. At 320px, keep the page within the viewport and allow only the photo-dot strip to scroll if needed.

### Delete and suspend confirmation

Use a confirmation dialog only after the team confirms the action. State the record name and the action. Use `Cancel` and one clear destructive button. Keep focus inside the dialog. Return focus to the control that opened it when it closes. Do not treat `delete` and `suspend` as the same action.

### Reports and dates

The report page is a future pattern. Use an appropriate date control for the selected report: one date for a daily report, a week or date range for a weekly report, and a month for a monthly report. Keep the selected period visible with the report. Show only fields from the report story. Do not create test totals or claim a report is correct without data evidence.

### Empty, error, success, disabled, and loading states

- **Empty:** Say what is empty. Add one action only when the story defines a next step.
- **Error:** State the error in plain words near the affected control. Keep user input.
- **Success:** Confirm the completed action in one short line.
- **Disabled:** Keep the control readable and show why only when that helps the user.
- **Loading:** Keep the action name visible, set `aria-busy`, and prevent a second submit.
- Use `Message` for a page-level success or error. Errors use an alert. Success uses a polite status.
- Do not show a success message before the work completes.

## JSX examples

These examples use the current shared components and theme.

```jsx
import Button from './components/Button';
import FormFields from './components/FormFields';
import Message from './components/Message';
import ResultsTable from './components/ResultsTable';

<section className="rounded-panel border border-border bg-surface p-6 shadow-card">
  <h1 className="font-display text-4xl text-ink">User Accounts</h1>
  <Message type="error" text={error} />
  <FormFields
    fields={fields}
    initial={initialValues}
    errors={fieldErrors}
    isSubmitting={saving}
    submitLabel="Save"
    onSubmit={save}
  />
  <Button type="button" variant="danger">Danger action</Button>
</section>

<ResultsTable
  ariaLabel="User accounts"
  columns={[{ key: 'name', label: 'Name' }, { key: 'status', label: 'Status' }]}
  rows={accounts}
  actions={[{ label: 'View', variant: 'secondary', onClick: viewAccount }]}
/>
```

## Sources

The page map and open items use [`Project Specification.pdf`](../Project%20Specification.pdf), [`User_stories.docx`](../User_stories.docx), and the current [CSIT314 Software Development Methodology use cases #20–29](https://docs.google.com/document/d/1LCz1gytxAVCVnetGHFwgSOnSOo6z1IXAum7QIdvXE4s/edit?tab=t.0). Ask the client when a source does not define a detail.
