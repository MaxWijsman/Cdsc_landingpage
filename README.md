# COMMIT Datascience Cell

A simple static portal: an orange futuristic team heading above the full graphic, a large CDSC logo, and Products, Team, Contact links. The central orange star is the AI Learning Track link. Animated circuits highlight the destinations in turn.

The light background, royal orange, ministry blue, RO Sans text, and condensed link headings follow the public [Defensie.nl](https://www.defensie.nl/) design. The main heading uses the open-source Orbitron typeface. Fonts are served locally. The original CDSC logo is preserved; the animated mark is an SVG reconstruction.

## Preview

Run from this folder:

    python -m http.server 8080 --bind 127.0.0.1 --directory public

Open <http://localhost:8080>. Stop with Ctrl+C. Opening public/index.html directly also works.

## Set the links

Edit public/site-config.js. For each destination, set its URL:

    products: { label: "Products", url: "https://example.org/products" }

The four keys are products, team, contact, and learning. Set learning.url to the external page that the central star should open. Empty or invalid URLs show Coming soon on the three chapters, and the star's accessible label and tooltip indicate Coming soon. Valid HTTPS, HTTP, mailto, and tel URLs open in the same tab. The configuration is public.

Change teamName to update the large heading and page title. Update the fallback title and labels in public/index.html too for visitors without JavaScript. The former headline, introduction, and description settings are no longer used.

## Motion

The logo's three circuit branches connect directly to Products, Team, and Contact in that order. All three branches keep moving gently and independently. The selected branch also extends along its connection, carrying its orange terminal with it, at half the original selection speed. Each six-second cycle extends, holds, retracts, then returns to gentle motion for 1200 ms before the next chapter highlights. Changing hover or keyboard focus while a branch is extended first retracts that branch over 900 ms. The original small orange pulse runs only from the terminal circle to the chapter. The unlettered star remains the AI Learning Track link. The heading spans the graphic above the logo and links. On mobile, the circuits follow their turns beside the logo to the stacked chapters.

The icon-only pause button freezes decorative animation and changes to a play icon for resuming. Its accessible name and tooltip describe the action. Reduced-motion preferences stop automatic movement and cycling while retaining static hover/focus feedback. Hidden tabs suspend animation. Without JavaScript, the logo, name, and inactive destination labels remain visible.

## GitHub Pages

1. Push the project to the repository's main branch.
2. In Settings → Pages → Build and deployment, select GitHub Actions.
3. Run Deploy GitHub Pages in Actions, or push another change.
4. Open the URL reported by the successful deployment.

The workflow publishes public/. If the default branch differs from main, update the workflow trigger. GitHub Pages must be enabled before the deployment can succeed. See [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## GitLab Pages

Push the project, including .gitlab-ci.yml, to the GitLab default branch. With CI runners and Pages enabled, the pipeline publishes public/. Find the URL under Deploy → Pages. The configuration uses current GitLab.com pages.publish syntax; older self-managed versions may require their version's syntax. See [GitLab Pages](https://docs.gitlab.com/user/project/pages/).

The GitLab job runs in the official python:3.11-alpine image. It logs the Python version, checks the published files, and deploys public/ directly. No pip packages, Node.js, or compilation are needed in this image. Python 3.11's built-in HTTP server can also serve public/ for local review using the preview command above.

Both hosts use the same files and relative URLs, including when hosted under a repository subpath. There is no backend, build step, or package installation.

## Checks

    node --check public/app.js
    node --check public/site-config.js
    node --test tests/site.test.cjs

Behavioral checks cover URL activation, four-way highlighting, hover and keyboard focus, connector alignment on desktop and mobile, resizing, pause/resume, hidden tabs, reduced motion, and static assets. Visual browser review is also recommended after layout changes.

## Asset sources

- Logo.png: supplied CDSC logo, unchanged.
- public/assets/fonts/RO-SansWebText-Regular.woff2: https://www.defensie.nl/assets/fonts/v1/RO-SansWebText-Regular.woff2
- public/assets/fonts/RobotoCondensed-Bold.woff2: https://www.defensie.nl/assets/fonts/v1/RobotoCondensed-Bold.woff2
- public/assets/fonts/Orbitron.ttf: https://github.com/google/fonts/tree/main/ofl/orbitron (SIL Open Font License, included as OFL-Orbitron.txt).
