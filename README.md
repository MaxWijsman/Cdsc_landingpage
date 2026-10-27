# COMMIT Datascience Cell

A simple static portal: a large CDSC logo, the team name underneath, and four external links. Animated circuits connect the logo to each destination and highlight them in turn.

The light background, royal orange, ministry blue, RO Sans text, and condensed headings follow the public [Defensie.nl](https://www.defensie.nl/) design. Fonts are served locally. The original CDSC logo is preserved; the animated mark is an SVG reconstruction.

## Preview

Run from this folder:

    python -m http.server 8080 --bind 127.0.0.1 --directory public

Open <http://localhost:8080>. Stop with Ctrl+C. Opening public/index.html directly also works.

## Set the links

Edit public/site-config.js. For each destination, set its URL:

    products: { label: "Products", url: "https://example.org/products" }

The four keys are products, contact, team, and learning. Empty or invalid URLs show Coming soon. Valid HTTPS, HTTP, mailto, and tel URLs open in the same tab. The configuration is public.

Change teamName to update the large heading and page title. Update the fallback title and labels in public/index.html too for visitors without JavaScript. The former headline, introduction, and description settings are no longer used.

## Motion

The logo's three circuit branches feed four destinations by forking the middle branch. Routes and link borders light up in sequence; hovering or focusing a link selects its route. On mobile, the circuits run beside the title to the stacked links.

Pause motion freezes decorative animation. Reduced-motion preferences stop automatic movement and cycling while retaining static hover/focus feedback. Hidden tabs suspend animation. Without JavaScript, the logo, name, and inactive destination labels remain visible.

## GitHub Pages

1. Push the project to the repository's main branch.
2. In Settings → Pages → Build and deployment, select GitHub Actions.
3. Run Deploy GitHub Pages in Actions, or push another change.
4. Open the URL reported by the successful deployment.

The workflow publishes public/. If the default branch differs from main, update the workflow trigger. GitHub Pages must be enabled before the deployment can succeed. See [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## GitLab Pages

Push the project, including .gitlab-ci.yml, to the GitLab default branch. With CI runners and Pages enabled, the pipeline publishes public/. Find the URL under Deploy → Pages. The configuration uses current GitLab.com pages.publish syntax; older self-managed versions may require their version's syntax. See [GitLab Pages](https://docs.gitlab.com/user/project/pages/).

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
