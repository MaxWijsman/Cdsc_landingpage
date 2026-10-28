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

The four keys are products, team, contact, and learning. The central star opens the embedded AI Office Quest by default (`learning.mode: "embedded"`). To use an external learning page instead, set `learning.mode: "external"` and supply `learning.url`. Empty or invalid external URLs show Coming soon. Valid HTTPS, HTTP, mailto, and tel URLs open in the same tab. The configuration is public.

Change teamName to update the large heading and page title. Update the fallback title and labels in public/index.html too for visitors without JavaScript. The former headline, introduction, and description settings are no longer used.

## Motion

The logo's three circuit branches connect directly to Products, Team, and Contact in that order. All three branches keep moving gently and independently. The selected branch also extends along its connection, carrying its orange terminal with it, over half its previous distance using the original animation timing. Each three-second cycle extends, holds, retracts, then returns to gentle motion for 600 ms before the next chapter highlights. Changing hover or keyboard focus while a branch is extended first retracts that branch over 450 ms. The original small orange pulse runs only from the terminal circle to the chapter. The unlettered star remains the AI Learning Track link. The heading spans the graphic above the logo and links. On mobile, the circuits follow their turns beside the logo to the stacked chapters.

The icon-only pause button freezes decorative animation and changes to a play icon for resuming. Its accessible name and tooltip describe the action. Reduced-motion preferences stop automatic movement and cycling while retaining static hover/focus feedback. Hidden tabs suspend animation. Without JavaScript, the logo, name, and inactive destination labels remain visible.

## GitHub Pages

1. Push the project to the repository's main branch.
2. In Settings → Pages → Build and deployment, select GitHub Actions.
3. Run Deploy GitHub Pages in Actions, or push another change.
4. Open the URL reported by the successful deployment.

The workflow publishes public/. If the default branch differs from main, update the workflow trigger. GitHub Pages must be enabled before the deployment can succeed. See [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## GitLab Pages

Push the project, including .gitlab-ci.yml, to the GitLab default branch. With CI runners and Pages enabled, the pipeline publishes public/. Find the URL under Deploy → Pages. The configuration uses current GitLab.com pages.publish syntax; older self-managed versions may require their version's syntax. See [GitLab Pages](https://docs.gitlab.com/user/project/pages/).

The GitLab deployment job runs in the official python:3.11-alpine image. It logs the Python version, checks every static file at root and repository-subpath URLs, and deploys public/ directly. A separate test-stage job uses node:24-alpine for the JavaScript tests. No pip packages, Node.js, or compilation are needed in the Python deployment image. Python 3.11's built-in HTTP server can also serve public/ for local review using the preview command above.

Both hosts use the same files and relative URLs, including when hosted under a repository subpath. There is no backend, build step, or package installation.

## Checks

    node --check public/app.js
    node --check public/site-config.js
    node --test
    python tests/check_static_site.py

Behavioral checks cover the landing page, all five games, scoring and safety caps, evidence and policy content, lazy loading, modal dismissal, progress recovery, replay and completion. Visual browser review is also needed after layout changes. GitHub Pages deployment waits for the JavaScript tests and the Python 3.11 Alpine static check.

## AI Office Quest

Select the orange star to open a bottom-sheet practice console. All games are available immediately:

1. **Inbox Inferno** — assemble and refine prompts across two email scenarios.
2. **Delegate or Don’t?** — sort eight workplace tasks by the appropriate level of AI assistance.
3. **Fix My AI!** — repair two summaries with up to three feedback moves each.
4. **Hallucination Hunter** — investigate six claims against fictional evidence.
5. **Data Danger** — redact two fictional documents and choose a safe workflow.

Responses are deterministic simulations, labelled Simulated AI. No external model, account, backend, telemetry, or API key is used. All names and documents are fictional. Data Danger's fictional policies are in `public/learning/content.js`; replace them only with reviewed organisational rules and update the relevant game revision.

The console uses a native modal dialog. Escape, the close button, and intentional backdrop clicks close it; keyboard focus returns to the star. The landing-page circuits pause while the console is open and respect the visitor's previous pause choice when it closes. Phones and short screens get a larger sheet. Reduced-motion preferences remove decorative transitions.

Progress is saved under `cdsc.ai-office-quest.v1` in browser localStorage after meaningful choices. It is specific to the browser and origin and does not sync between devices or between GitHub and GitLab. Private-mode restrictions, corrupted data, and storage failures fall back to an in-memory session. Unsupported saved formats are preserved until the user confirms Reset progress.

Each game has a 0–100 score and up to three stars: 40 earns one, 70 earns two, and 90 earns three. Unresolved critical safety errors cap an attempt at 39. Completion records participation; it does not certify competence. Replays preserve best scores. AI Ready — Practice is earned when all five best scores are at least 70 with no unresolved critical safety errors.

Content and game code are loaded on first opening. New games implement the existing registry contract in `public/learning/core.js` and register a createAttempt/reduce/evaluate/render/hydrate module, with versioned content and tests. Bump the game's revision when incompatible scenario or scoring changes should invalidate old results; other games' progress remains intact.

## Asset sources

- Logo.png: supplied CDSC logo, unchanged.
- public/assets/fonts/RO-SansWebText-Regular.woff2: https://www.defensie.nl/assets/fonts/v1/RO-SansWebText-Regular.woff2
- public/assets/fonts/RobotoCondensed-Bold.woff2: https://www.defensie.nl/assets/fonts/v1/RobotoCondensed-Bold.woff2
- public/assets/fonts/Orbitron.ttf: https://github.com/google/fonts/tree/main/ofl/orbitron (SIL Open Font License, included as OFL-Orbitron.txt).
