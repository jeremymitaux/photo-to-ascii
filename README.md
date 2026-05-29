# Photo to ASCII

A free, in-browser tool that turns any photo into ASCII art. Inspired by the look and feel of asciiart.eu, but focused on a single job: converting images into text art. Made this with Claude for an activity we did in Oregon Blockchain Group.

## Features

- Drag & drop, click-to-upload, or paste from clipboard
- Adjustable output width (40–300 characters)
- Multiple character ramps: standard, detailed (70 chars), block, binary, dots, ASCII-art
- Custom character ramp
- Brightness and contrast controls
- Invert and color modes
- Live preview that auto-fits to the panel
- Download as `.txt` or `.png`
- Copy to clipboard
- Built-in samples
- Dark and light themes (persisted)
- 100% client-side — no uploads, no tracking

## Run locally

It's a static site. Just open `index.html` in a browser, or serve with any static server:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy

This repo is set up for GitHub Pages. After pushing to `main`, enable Pages in repo settings (Source: `Deploy from a branch`, Branch: `main` / `/ (root)`).

## License

MIT
