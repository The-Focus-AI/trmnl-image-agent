export const DISPATCH_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Fraunces:opsz,wght@9..144,700;9..144,800;9..144,900&family=IBM+Plex+Mono:wght@600;700&family=IBM+Plex+Sans:wght@500;600;700&display=swap');

  :root {
    --ink: #000000;
    --paper: #ffffff;
    --font-display: 'Fraunces', Georgia, serif;
    --font-cond: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    --font-sans: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    --font-mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html, body {
    width: 800px;
    height: 480px;
    overflow: hidden;
    background: var(--paper);
    color: var(--ink);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    text-rendering: geometricPrecision;
  }

  /* Interactive Desktop Preview (?frame=1) — automatically hidden on <=805px TRMNL Screenshot viewport */
  body.preview-mode {
    width: 100vw;
    min-height: 100vh;
    height: auto;
    overflow: auto;
    background: #18181b;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    gap: 16px;
  }

  .preview-toolbar {
    display: none;
  }

  body.preview-mode .preview-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 8px;
    max-width: 920px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: #f4f4f5;
  }

  .preview-group {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #27272a;
    padding: 5px 9px;
    border-radius: 6px;
    border: 1px solid #3f3f46;
  }

  .preview-group span {
    color: #a1a1aa;
    font-size: 11px;
    margin-right: 4px;
    text-transform: uppercase;
  }

  .preview-link {
    color: #e4e4e7;
    text-decoration: none;
    padding: 4px 9px;
    border-radius: 4px;
    font-weight: 700;
  }

  .preview-link:hover {
    background: #3f3f46;
  }

  .preview-link.active {
    background: #ffffff;
    color: #000000;
  }

  body.preview-mode .device-bezel {
    padding: 22px 24px 28px;
    background: #e6e3dc;
    border-radius: 18px;
    box-shadow: 0 28px 64px rgba(0, 0, 0, 0.6), inset 0 1px 0 #ffffff;
    border: 2px solid #d4d0c7;
  }

  /* Optional 1-bit monochrome quantization preview filter (ONLY in desktop preview) */
  body.preview-mode.eink-sim .screen {
    filter: url(#trmnl-1bit-threshold);
  }

  .device-caption {
    display: none;
  }

  body.preview-mode .device-caption {
    display: flex;
    justify-content: space-between;
    margin-top: 11px;
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.06em;
    color: #52525b;
    text-transform: uppercase;
  }

  @media (max-width: 805px) {
    body.preview-mode {
      width: 800px;
      height: 480px;
      min-height: 480px;
      overflow: hidden;
      padding: 0;
      background: #fff;
      display: block;
    }
    body.preview-mode .preview-toolbar,
    body.preview-mode .device-caption {
      display: none !important;
    }
    body.preview-mode .device-bezel {
      padding: 0;
      border: none;
      border-radius: 0;
      box-shadow: none;
      background: transparent;
    }
    body.preview-mode.eink-sim .screen {
      filter: none;
    }
  }

  /* =========================================================================
     CORE 800x480 ROOM-READABLE POSTER CANVAS
     Minimum font floor: 14px bold tags | 17-20px body | 23-76px headlines & heroes
     ========================================================================= */
  .screen {
    width: 800px;
    height: 480px;
    background: #ffffff;
    color: #000000;
    overflow: hidden;
    position: relative;
    padding: 16px 22px;
    display: flex;
    flex-direction: column;
  }

  .hazard-stripe {
    background: repeating-linear-gradient(
      -45deg,
      #000000,
      #000000 10px,
      #ffffff 10px,
      #ffffff 20px
    );
  }

  /* Persistent Top Masthead Strip across Cards 1-4 */
  .top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 10px;
    border-bottom: 3.5px solid #000000;
    flex-shrink: 0;
    gap: 12px;
  }

  .brand-lockup {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .brand-title {
    font-family: var(--font-display);
    font-weight: 900;
    font-size: 27px;
    letter-spacing: -0.01em;
    line-height: 1;
    text-transform: uppercase;
  }

  .top-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  .top-date {
    font-family: var(--font-cond);
    font-weight: 800;
    font-size: 18px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .weather-pill {
    background: #000000;
    color: #ffffff;
    font-family: var(--font-cond);
    font-weight: 800;
    font-size: 18px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    padding: 3px 10px;
    line-height: 1.15;
    white-space: nowrap;
  }

  /* High-Contrast Tags */
  .tag-inv {
    display: inline-block;
    background: #000000;
    color: #ffffff;
    font-family: var(--font-cond);
    font-weight: 800;
    font-size: 14px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 2px 8px;
    line-height: 1.2;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .tag-outline {
    display: inline-block;
    border: 2px solid #000000;
    background: #ffffff;
    color: #000000;
    font-family: var(--font-cond);
    font-weight: 800;
    font-size: 14px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 1.5px 8px;
    line-height: 1.2;
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* Line Clamps */
  .clamp-1 {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    overflow: hidden;
  }
  .clamp-2 {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
  }
  .clamp-3 {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    overflow: hidden;
  }
`;
