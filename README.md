# Local Service Finder

A home-services directory for Greater Noida with a full-screen photographic hero and a matching admin panel. Search by service and locality, compare prices and working hours, save providers, and track visit requests by reference number.

The demo uses fictional providers and ratings. The admin panel can update request statuses and control which providers appear in the directory.

## Run locally

Install Node.js 24 or newer, then open a terminal in the repository folder.

```sh
npm start
```

Open [the directory](http://localhost:3000/) or [the admin panel](http://localhost:3000/admin) in your browser. The project has no npm dependencies to install. On Windows, you can also double-click `start-windows.bat`.

The local server listens on loopback and uses an in-memory database. Its request and visibility changes reset when you stop it. Saved providers and locality preferences are stored in the browser.

## Project layout

| Path | Purpose |
| --- | --- |
| `_app/public/` | Main site, admin interface, provider data and bundled assets |
| `_app/worker/handler.js` | Directory, request tracking and admin API |
| `_app/drizzle/` | Database schema migrations |
| `_app/scripts/` | Local preview and Worker build |

Run `npm run build` to generate the Worker under `_app/dist/`. The hosted setup supplies the `DB` binding and gates the entire app, including its admin API, behind owner sign-in.

The root HTML and asset files serve the earlier GitHub Pages demo. Its original local backend is available with `npm run start:legacy`. See the [earlier version's setup instructions](https://github.com/Abhii-08/local-service-finder/blob/2c1eb6354608fdb88a7059aa4b082be805765cc9/README.md) for that demo.

## Photography

- Hero, [Anete Lusina](https://www.pexels.com/photo/man-screwing-light-bulb-into-lamp-4792521/)
- Electrical, [ranjeet](https://www.pexels.com/photo/a-man-is-working-on-an-electrical-panel-27928761/)
- Plumbing and appliance repair, [Bulat843](https://www.pexels.com/photo/plumber-repairing-pipe-with-wrench-indoors-32588548/) and [appliance photo](https://www.pexels.com/photo/technician-repairing-appliance-in-workshop-32588545/)
- Tutoring, [Ketut Subiyanto](https://www.pexels.com/photo/young-indian-female-student-during-individual-tutoring-lesson-at-home-4308096/)

Developed by Abhishek.
