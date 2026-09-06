 # Great Vision Fashion

Great Vision Fashion is a static two-page boutique fashion site.

## Structure

- `index.html` - home, brand story, services, values, social links and contact CTA.
- `catalog.html` - categorized women's collection, WhatsApp inquiries and men's coming-soon block.
- `admin.html` - protected content dashboard for uploading and organizing website images.
- `CSS/style.css` - shared responsive editorial styling.
- `CSS/admin.css` - dashboard styling and responsive admin layout.
- `JS/admin.js` - Supabase authentication, image upload and library management.
- `JS/catalog.js` - loads categorized online catalog images into the public catalog.
- `JS/script.js` - hero slider, theme toggle, and online hero image loading.
- `JS/supabase-config.js` - public Supabase project configuration.
- `IMAGES/` - local hero and collection assets.

The retired `about.html` content is now part of the home page. The old misspelled `catlog.html` URL has been replaced by `catalog.html`.

## Local preview

Because this is a static site, it can be opened directly through `index.html`, or served from the project directory with any static file server. Use `admin.html` for the protected content dashboard. Keep the uppercase `CSS/`, `IMAGES/`, and `JS/` directory casing when deploying to a case-sensitive host.

## Deployment

Upload the project directory to a static host such as Netlify or GitHub Pages. Set the publish directory to the project root. The public pages and dashboard load Supabase's browser client from jsDelivr, so the deployed site needs internet access. Verify that the host serves `index.html`, `catalog.html` and `admin.html`, preserves the existing WhatsApp, Facebook and Instagram destinations, and uses the Supabase `site-images` bucket plus `content_images` table.

## Dashboard workflow

1. Sign in at `admin.html` with a Supabase Authentication user.
2. Choose an image, enter its name, select `Catalog` or `Hero slider`, and choose a catalog category when needed.
3. Click `Upload to website`.
4. Confirm the image appears in `Your visual library`, then refresh the public catalog.

The dashboard uses the Supabase publishable key only. Never place a Supabase secret or service-role key in this repository.
This Website can be viewed through this link.
https://greatvisionfashion.netlify.app
