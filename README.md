## Shorty

One-page, deterministic GitHub URL shortener that encodes/decode raw/blob links entirely in the browser using the Unix dictionary and TikToken subword pieces.

### Highlights

- **Static + client-side** – drop `index.html` and `words.txt` anywhere (GitHub Pages, selfdotsend.com, etc.) and it works without a server.
- **Deterministic encoding** – raw/blob URLs become readable slugs like `owner/repo/file`, with dictionary hits compressed into two-character markers. Decoding mirrors the process so hashes can be shared safely.
- **Smart UX** – copy-friendly result cards, loader banner reused for hash-based redirects, and the decode field accepts either a shortcode or a full URL (`https://host#shortcode`).
- **Auto redirect** – visiting `/shorty#whatever` loads the dictionary/tokenizer and automatically redirects after a short countdown, showing the same overlay used by manual decodes.

### Usage

1. Serve the folder (e.g., `python -m http.server` from the repo root) or open `index.html` directly.
2. Paste a raw GitHub URL (or a regular `github.com/.../blob/...` link) into **Raw/Direct GitHub URL** and click **Shorten URL**.
3. Copy the shortcode or shareable URL using the inline buttons. Opening that URL (with the hash) on any host running this page will download the original file.
4. Paste a shortcode or a full `https://host#shortcode` link into the **Shortcode or URL** input to reverse the process. The decoded panel provides copy buttons for both the raw and GitHub blob variants.

### Development Notes

- `words.txt` is the Unix dictionary plus a few project-specific tokens. The script loads it, builds an index per first letter, and tracks the longest word to keep decomposition efficient.
- TikToken (`js-tiktoken@1.0.21`) is imported via CDN. We wait for both the dictionary and tokenizer before enabling the interface so we never produce/handle incompatible hashes.
- No bundler/tooling is required. Edit `index.html`, refresh, done.

### Lightweight decoder

Need redirects without the UI? Drop `<script src="embed-shorty.js"></script>` on any page in this folder (or copy the file alongside `words.txt`). Visiting `https://selfdotsend.com/#shortcode` triggers the same dictionary-based decoder and immediately redirects to the raw GitHub file; `https://selfdotsend.com/?shortcode` handles the box-drawing variant.

### Planned Extensions

- Additional custom dictionary pages for frequently encoded owners/repos.
- Optional branch detection beyond `main`/`master`.
