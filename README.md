# COMMIT Datascience Cell

A static landing page for the COMMIT Datascience Cell (CDSC), with an animated SVG logo and four configurable external destinations. Plain HTML, CSS, and JavaScript; no installation, build step, or backend required.

## Preview locally

From this folder, run:

```powershell
python -m http.server 8080 --bind 127.0.0.1 --directory public
```

Open <http://localhost:8080>. Stop the server with Ctrl+C. You can also open `public/index.html` directly to view the page.

## Update content and links

Edit `public/site-config.js`. It contains the team name, short name, three headline lines, introduction, and four destinations. For example:

```js
products: {
  label: "Products",
  description: "Explore our products.",
  url: "https://example.org/products",
},
```

Empty or invalid URLs show non-clickable **Coming soon** cards and navigation labels. Valid `https:`, `http:`, `mailto:`, and `tel:` destinations turn both the card and corresponding navigation label into links. Links open in the current tab. For email, set Contact to an address such as `mailto:your-team@example.org`. Replace examples with your actual destinations.

The configuration is public; put only public content in it. Update the fallback copy in `public/index.html` too if you need custom content to appear without JavaScript or in link previews and search engines that do not execute JavaScript. The page title and description are also updated from configuration in the browser. The footer year is in the HTML.

## Publish on GitHub Pages

1. Create a GitHub repository and push this folder to its default branch.
2. The workflow listens to `main`. If your default branch has another name, update `on.push.branches` in `.github/workflows/pages.yml` to match.
3. In **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source.
4. Push an update or run **Deploy GitHub Pages** from the Actions tab on your default branch.
5. Find the published URL in the deployment output or repository Pages settings.

The workflow publishes only `public/`. See [GitHub's Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Publish on GitLab Pages

1. Create a GitLab project and push this folder, including `.gitlab-ci.yml`, to its default branch.
2. Ensure a CI runner and Pages are enabled for the project. The `deploy-pages` job publishes `public/` on default-branch pushes.
3. Find the published URL under **Deploy → Pages** after the pipeline succeeds.

The configuration uses the current `pages.publish` syntax supported by GitLab.com. Older self-managed GitLab installations may need their version's Pages syntax. See [GitLab Pages documentation](https://docs.gitlab.com/user/project/pages/).

## Assets and motion

- `Logo.png` is the untouched source image; `public/assets/Logo.png` is an identical deployable copy used in the header.
- The hero is an SVG reconstruction. Its gear and spark stay still while its three connected branches extend and bend independently. The SVG and branch coordinates live in `public/index.html` and `public/app.js`.
- **Pause motion** freezes all continuous decoration; **Resume motion** continues from the same position. This choice lasts for the current page visit.
- A device's reduced-motion preference takes priority and displays the complete stationary logo. Background tabs suspend animation.
- Without JavaScript, content and the logo remain visible, and destination placeholders remain inactive.
- All assets are local and use relative paths. The same `public/` directory works at a domain root, under a repository subpath, or on a custom domain.

## Checks

With Node.js installed, run:

```powershell
node --check public/app.js
node --check public/site-config.js
node --test tests/site.test.cjs
```

The dependency-free behavioral checks cover destination activation, missing and unsafe URLs, configurable text, circuit attachment and terminal alignment, pause/resume, hidden tabs, and reduced motion. Also inspect the page at mobile, tablet, and desktop widths after changing its layout.
