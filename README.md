# QR Studio

Self-hosted QR code generator with a polished visual editor and a REST API. Both interfaces use the **same** QR generation engine, so what you preview in the browser is exactly what the API exports.

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up -d
```

- Web app: <http://localhost:3000>
- API health: <http://localhost:3000/api/v1/health>
- Swagger UI: <http://localhost:3000/api/v1/docs>

No Node.js installation is required on the host. The web app and API are published through a single nginx port.

## Features

- Live QR editor with instant preview, styles, presets and transparency checkerboard.
- Dot styles: square, rounded, dot, extra rounded, classy, classy rounded.
- Corner square styles: square, rounded, extra rounded, dot, circle, classy, classy rounded, outpoint, inpoint.
- Corner dot styles: square, dot, circle, rounded, heart, classy, classy rounded.
- Solid/transparent/gradient backgrounds, rounded background corners, independent colors.
- Center logos with size, margin, background and radius controls (error correction is raised to `H`).
- Real alpha transparency in PNG and SVG exports.
- Individual download and batch ZIP export with sanitized, unique filenames.
- Asynchronous batch jobs with progress polling, TTL cleanup and download endpoint.
- OpenAPI 3 documentation, request validation, rate limiting and optional API key auth.

## Architecture

```text
apps/
  api/                 Fastify REST API (generate, batch, jobs, docs)
  web/                 React + Vite + Tailwind editor and dashboard
packages/
  qr-engine/           Shared renderer: matrix -> SVG, PNG, batch, validation
  shared/              Zod schemas, style catalog, filename utilities
storage/               Runtime storage mount (temp files and job archives)
docker-compose.yml     Single-port deployment
```

`qrcode-generator` builds the QR matrix. A pure SVG renderer in `packages/qr-engine` draws the customizable modules; the API rasterizes that SVG to PNG with `sharp` and streams ZIP files with `archiver`. The browser renders the identical SVG for the live preview. No QR logic is duplicated.

## API examples

### Generate one QR code

```bash
curl -X POST http://localhost:3000/api/v1/qr/generate \
  -H 'Content-Type: application/json' \
  -o example-website.png \
  -d '{
    "data": "https://example.com",
    "filename": "example-website",
    "format": "png",
    "size": 1024,
    "design": {
      "dots": { "type": "rounded", "color": "#111111" },
      "background": { "transparent": true },
      "errorCorrectionLevel": "H"
    }
  }'
```

### Batch of 50 QR codes in one request

```bash
curl -X POST http://localhost:3000/api/v1/qr/batch \
  -H 'Content-Type: application/json' \
  -o batch.zip \
  -d '{
    "format": "png",
    "size": 1024,
    "design": { "background": { "transparent": true } },
    "items": [
      { "data": "https://example.com/1", "filename": "qr-page-1" },
      { "data": "https://example.com/2", "filename": "qr-page-2" }
    ]
  }'
```

The archive contains `qr-page-1.png`, `qr-page-2.png`, etc. For large batches use `POST /api/v1/qr/batch/jobs`, poll `GET /api/v1/qr/batch/jobs/:jobId`, then download from `GET /api/v1/qr/batch/jobs/:jobId/download`.

### Authentication

If `API_KEY` is set, send `x-api-key: <key>` on generation endpoints. Health and docs remain public.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `APP_PORT` | `3000` | Public host port |
| `NODE_ENV` | `production` | Runtime mode |
| `API_KEY` | empty | Optional API key |
| `MAX_BATCH_SIZE` | `500` | Maximum items per batch |
| `BATCH_CONCURRENCY` | `4` | Concurrent QR renders |
| `MAX_PAYLOAD` | `12mb` | Maximum request body |
| `RATE_LIMIT_ENABLED` | `true` | Enable rate limiting |
| `RATE_LIMIT_MAX` | `120` | Requests per window |
| `RATE_LIMIT_WINDOW` | `1 minute` | Rate limit window |
| `JOB_TTL_MINUTES` | `60` | Job/results retention |
| `STORAGE_PATH` | `/app/storage` | Persistent storage in container |
| `TEMP_PATH` | `/app/storage/temp` | Temporary job archives |
| `LOG_LEVEL` | `info` | API log level |
| `CORS_ORIGIN` | `*` | Allowed origins |

Job archives and temporary files are removed after the configured TTL. No database is required.

## Local development

```bash
npm install
npm run dev:api     # http://localhost:3001
npm run dev:web     # http://localhost:5173 (proxies /api to 3001)
```

## Verification

```bash
npm run typecheck
npm test
npm run build
docker compose up -d --build
```

The test suite checks PNG/SVG output, transparency, all style families, gradients, logos, decoding with ZXing and jsQR, 50-item batches with unique filenames, ZIP contents, validation, oversized batches, API keys, rate limiting, and the async job lifecycle.

## Readability notes

- The default quiet zone is 4 modules and error correction defaults to `H`.
- The editor warns about low contrast, transparent backgrounds, small quiet zones, gradients and oversized logos.
- Export resolution defaults to 1024px; generated codes are verified against decoders in automated tests.
- Transparent QR codes must be placed on a light background to remain scannable.
