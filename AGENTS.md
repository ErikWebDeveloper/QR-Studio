# QR Studio — Agent Instructions

## 1. Project Overview

Build a modern, self-hosted QR Code Generator application that runs entirely through Docker.

The application must allow users to generate highly customizable QR codes through two independent interfaces:

1. A modern web application.
2. A REST API designed for programmatic and automated QR generation.

The project should offer functionality comparable to commercial QR code generator platforms, with a particular focus on visual customization, batch generation and automation.

### Main objectives

- Generate QR codes from URLs and arbitrary text.
- Customize the visual appearance of QR codes.
- Generate transparent PNG and SVG files.
- Generate multiple QR codes in a single API request.
- Download individual QR codes or entire batches as ZIP archives.
- Specify custom filenames for generated files.
- Provide an intuitive visual editor with real-time preview.
- Run the entire application using Docker Compose.
- Keep the architecture modular and extensible.

The application will initially be self-hosted, but its architecture should allow future multi-user functionality and API key management.

---

## 2. Product Philosophy

The application should feel like a polished commercial product, not an internal developer utility.

Prioritize:

- Excellent user experience.
- Fast QR generation.
- High-quality exports.
- Extensive customization.
- Reliable QR scanning.
- Simple API integration.
- Minimal deployment complexity.

The application must be usable by both non-technical users and developers.

Do not compromise QR readability for visual appearance.

---

## 3. Recommended Technology Stack

Use a modern TypeScript ecosystem.

### Frontend

- React.
- TypeScript.
- Vite.
- Tailwind CSS.
- shadcn/ui or an equivalent component system.
- Lucide icons.

### Backend

- Node.js.
- TypeScript.
- Fastify or an equivalent lightweight HTTP framework.
- REST API.
- Zod for request validation.

### QR Generation

Evaluate `qr-code-styling` as the primary QR rendering library.

The rendering implementation must be isolated behind a QR generation service so that the underlying library can be replaced without modifying the API or frontend.

The QR engine should support:

- SVG generation.
- PNG generation.
- Transparent backgrounds.
- Custom dot shapes.
- Custom corner shapes.
- Gradients.
- Embedded logos.
- Configurable dimensions.
- Error correction levels.

If the selected library does not support a particular export or feature reliably, evaluate complementary libraries.

### Infrastructure

- Docker.
- Docker Compose.
- Multi-stage Docker builds.
- Persistent Docker volumes where necessary.
- Environment-based configuration.

### General principles

- Use TypeScript throughout the application.
- Prefer maintainable and modular code.
- Avoid unnecessary dependencies.
- Avoid overengineering the initial version.
- Keep frontend and backend responsibilities clearly separated.
- Validate all API inputs.
- Never trust user-provided filenames or filesystem paths.

---

## 4. Application Architecture

Organize the project into clearly separated modules.

Suggested structure:

```text
qr-studio/
│
├── apps/
│   ├── web/
│   │   ├── src/
│   │   └── Dockerfile
│   │
│   └── api/
│       ├── src/
│       │   ├── routes/
│       │   ├── services/
│       │   ├── schemas/
│       │   ├── middleware/
│       │   ├── workers/
│       │   └── utils/
│       │
│       └── Dockerfile
│
├── packages/
│   ├── qr-engine/
│   ├── shared/
│   └── config/
│
├── storage/
│
├── docker-compose.yml
├── .env.example
├── .dockerignore
├── README.md
└── AGENTS.md
```

This structure is a recommendation, not a rigid requirement. Adjust it if another structure improves maintainability.

### QR Engine

Create a dedicated QR generation module.

It must expose reusable functions such as:

- `generateQRCode()`
- `generateQRCodeSVG()`
- `generateQRCodePNG()`
- `generateQRCodeBatch()`
- `validateQRCodeOptions()`

Both the web application and API must use the same generation engine.

Do not implement QR generation independently in the frontend and backend.

---

## 5. QR Code Customization

Customization is one of the most important features of the application.

Build the rendering engine around a configuration object that can be shared between the frontend and API.

### 5.1 Dot styles

Allow users to customize the appearance of individual QR modules.

Initial styles to support:

- Square.
- Rounded.
- Circle / Dot.
- Extra rounded.
- Classy.
- Classy rounded.

Keep the architecture extensible for additional styles.

### 5.2 Corner squares

The three large QR positioning markers must be independently customizable.

Supported styles should include:

- Square.
- Rounded.
- Circle.
- Classy.
- Outpoint.
- Inpoint.

### 5.3 Corner dots

Allow independent customization of the smaller internal positioning markers.

Supported styles should include:

- Square.
- Circle.
- Rounded.
- Heart, if supported by the rendering library.

### 5.4 Colors

Allow independent color configuration for:

- Main QR dots.
- Corner squares.
- Corner dots.
- Background.

Support:

- HEX colors.
- RGB colors.
- Gradients.

### 5.5 Gradients

Support linear and radial gradients where supported by the rendering engine.

Allow users to define:

- Gradient type.
- Starting color.
- Ending color.
- Rotation or direction.

### 5.6 Background

Background configuration must support:

- Solid colors.
- Transparent background.
- Gradient background.
- Rounded background corners.

IMPORTANT:

Transparent backgrounds must produce actual alpha transparency in PNG files and must not introduce an unwanted white background.

SVG exports must preserve transparency as well.

### 5.7 Logo embedding

Allow users to upload a logo and place it in the center of the QR code.

Options:

- Upload PNG, SVG or other explicitly supported image formats.
- Adjust logo size.
- Adjust logo margin.
- Enable or disable a background behind the logo.
- Customize the logo background color.

Use appropriate error correction when logos are enabled.

Warn users when a logo or other customization could compromise QR readability.

Validate uploaded files and restrict file sizes.

### 5.8 QR dimensions and quality

Allow users to configure:

- Width.
- Height.
- Export resolution.
- Margin / quiet zone.
- Error correction level.

Supported QR error correction levels:

- L.
- M.
- Q.
- H.

Default to a sensible balance between capacity and readability.

Never remove the required quiet zone by default.

---

## 6. Export Formats

The application must support:

### PNG

- Standard PNG.
- Transparent PNG.
- Configurable resolution.
- Preserve alpha transparency.

### SVG

- Vector-based output.
- Scalable without quality loss.
- Preserve transparent backgrounds.
- Suitable for graphic design software and websites.

### Future formats

Keep the export system extensible for:

- WebP.
- PDF.
- Other vector formats.

Do not implement every format in the MVP.

### Download behavior

Users must be able to:

- Download one QR code.
- Download all generated QR codes.
- Download a batch as a ZIP archive.

Allow custom filenames.

Sanitize filenames to prevent directory traversal and filesystem issues.

---

## 7. Web Application

The browser interface should provide a professional QR creation experience.

### 7.1 Main dashboard

Create a clean dashboard with:

- Application branding.
- New QR Code action.
- QR generation history, if enabled.
- Batch generation section.
- API documentation access.
- Settings.

### 7.2 QR Editor

The editor is the primary application interface.

Use a two-column layout:

LEFT:
- Configuration panel.
- Customization options.
- Input fields.

RIGHT:
- Large live QR preview.
- Preview background controls.
- Download actions.

The interface should update the QR preview when configuration changes.

Avoid requiring users to press a Generate button after every customization.

### 7.3 Editor sections

Organize settings into logical groups:

**Content**
- URL or text.
- Content validation.
- Optional name.

**Dots**
- Shape.
- Color.
- Gradient.

**Corners**
- Outer corner style.
- Inner corner style.
- Individual colors.

**Background**
- Color.
- Gradient.
- Transparency.

**Logo**
- Upload.
- Size.
- Margin.
- Background.

**Export**
- PNG.
- SVG.
- Resolution.
- Dimensions.

### 7.4 Transparency preview

When transparent background is selected, show a checkerboard pattern behind the QR preview.

This is only a visual indicator.

The actual exported image must have transparent pixels.

### 7.5 Batch generation interface

Create a dedicated batch generation screen.

Users should be able to provide multiple QR entries through:

- Manual entry.
- CSV upload.
- JSON upload.

Each entry should contain:

- URL or text.
- Filename.
- Optional individual name.

Allow users to select whether every QR uses:

1. The same global design configuration.
2. Individual design configurations.

Show a preview of the batch before generating.

Display:

- Total QR codes.
- Valid entries.
- Invalid entries.
- Generation progress.
- Completed items.
- Failed items.

When processing finishes, provide a ZIP download.

---

## 8. REST API

The REST API is a core feature, not an optional extension.

It must expose the same generation capabilities as the web interface.

Use versioned endpoints:

`/api/v1/...`

### 8.1 Generate one QR code

Endpoint:

`POST /api/v1/qr/generate`

Example request:

```json
{
  "data": "https://example.com",
  "filename": "example-website",
  "format": "png",
  "size": 1024,
  "design": {
    "dots": {
      "type": "rounded",
      "color": "#000000"
    },
    "cornersSquare": {
      "type": "square",
      "color": "#000000"
    },
    "cornersDot": {
      "type": "dot",
      "color": "#000000"
    },
    "background": {
      "transparent": true
    },
    "errorCorrectionLevel": "H"
  }
}
```

Expected behavior:

- Validate request.
- Generate QR code.
- Return the generated file with the correct MIME type.
- Respect the requested filename.

Support both PNG and SVG.

### 8.2 Generate multiple QR codes

Endpoint:

`POST /api/v1/qr/batch`

This is a particularly important endpoint.

It must support generating dozens or hundreds of QR codes in a single request.

Example:

```json
{
  "format": "png",
  "size": 1024,
  "design": {
    "dots": {
      "type": "rounded",
      "color": "#111111"
    },
    "background": {
      "transparent": true
    }
  },
  "items": [
    {
      "data": "https://example.com/page-1",
      "filename": "qr-page-1"
    },
    {
      "data": "https://example.com/page-2",
      "filename": "qr-page-2"
    },
    {
      "data": "https://example.com/page-3",
      "filename": "qr-page-3"
    }
  ]
}
```

Expected behavior:

1. Validate the batch.
2. Generate each QR code using the shared design configuration.
3. Use each item's filename.
4. Package generated files into a ZIP archive.
5. Return the ZIP archive.

The archive must contain files with their requested names.

Example:

```text
qr-page-1.png
qr-page-2.png
qr-page-3.png
```

Support individual item overrides where possible.

### 8.3 Batch processing considerations

Do not assume that every batch will be small.

Implement:

- Configurable batch limits.
- Concurrency limits.
- Input validation.
- Memory-efficient processing.
- Proper ZIP stream handling.
- Cleanup of temporary files.
- Useful error reporting.

For larger batches, support asynchronous processing.

Suggested endpoints:

`POST /api/v1/qr/batch/jobs`

`GET /api/v1/qr/batch/jobs/:jobId`

`GET /api/v1/qr/batch/jobs/:jobId/download`

Possible job statuses:

- Pending.
- Processing.
- Completed.
- Failed.

A completed job should expose its downloadable ZIP.

Avoid keeping temporary files indefinitely.

### 8.4 Additional endpoints

Implement:

`GET /api/v1/health`

Health check.

`GET /api/v1/qr/formats`

Supported output formats.

`GET /api/v1/qr/styles`

Supported QR customization options.

`GET /api/v1/docs`

API documentation, preferably OpenAPI / Swagger.

### 8.5 API security

Include:

- Request validation.
- Configurable maximum batch size.
- Payload size limits.
- Rate limiting.
- Secure filename handling.
- Optional API key authentication.
- Appropriate CORS configuration.

API keys must be configurable through environment variables or persistent application settings.

Do not expose internal filesystem paths or stack traces in API responses.

Since this is a self-hosted application, avoid introducing unnecessary authentication complexity into the initial MVP.

---

## 9. Docker Deployment

The entire application must run through Docker Compose.

The deployment experience should be as simple as:

```bash
docker compose up -d
```

The web interface and API should be accessible through a single public port, preferably using a reverse proxy or integrated routing layer.

Example:

```text
http://localhost:3000
```

### Docker requirements

- Multi-stage builds.
- Small production images.
- Non-root containers where practical.
- Health checks.
- Restart policies.
- Persistent storage when required.
- Environment variable configuration.
- No requirement to install Node.js on the host.

Provide:

- `docker-compose.yml`
- `.env.example`
- Dockerfiles.
- `.dockerignore`.
- Deployment instructions.

### Configuration

Example environment variables:

```env
APP_PORT=3000
NODE_ENV=production

API_KEY=

MAX_BATCH_SIZE=500
BATCH_CONCURRENCY=4

STORAGE_PATH=/app/storage
TEMP_PATH=/app/storage/temp

RATE_LIMIT_ENABLED=true
```

These values are examples. Validate them and provide sensible defaults.

Do not require a database for the initial QR generation functionality.

If generation history or persistent job management requires storage, introduce a lightweight database only when justified.

---

## 10. Design System

The application should have a modern, polished SaaS aesthetic.

Design references:

- Modern developer dashboards.
- Premium QR generator platforms.
- Clean creative tools.
- Professional design editors.

### Visual direction

- Minimalist interface.
- Clear hierarchy.
- Well-organized configuration panels.
- Smooth transitions.
- Subtle shadows.
- Rounded components.
- High-quality typography.
- Consistent spacing.

Use a dark or neutral visual foundation with a carefully selected accent color.

Avoid excessive gradients, unnecessary animations and visual clutter.

### UX requirements

- Responsive design.
- Desktop-first editor experience.
- Mobile-friendly dashboard.
- Clear loading states.
- Empty states.
- Error states.
- Toast notifications.
- Accessible controls.
- Keyboard navigation.

The QR preview must remain visually prominent.

The transparency checkerboard must be distinguishable from the QR itself.

---

## 11. QR Readability and Validation

QR reliability is more important than decorative appearance.

Implement safeguards.

Consider:

- Minimum contrast.
- Quiet zone preservation.
- Error correction.
- Logo size restrictions.
- QR density.
- Output resolution.

Warn users when a design may be difficult to scan.

Where feasible, add automated QR decoding tests using a separate decoder library.

Test generated QR codes against their original input.

Do not assume that successful image rendering means the QR code is readable.

A generated QR must decode to the original input.

---

## 12. Testing

Create automated tests for the generation engine and API.

### QR Engine tests

- Valid URL generation.
- Arbitrary text generation.
- PNG output.
- SVG output.
- Transparent PNG output.
- Custom dot styles.
- Custom corner styles.
- Gradient generation.
- Logo embedding.
- Invalid configuration handling.

### Batch tests

- Generate 50 QR codes.
- Verify filenames.
- Verify ZIP contents.
- Verify individual item overrides.
- Handle invalid entries.
- Handle duplicate filenames safely.
- Handle large payloads within configured limits.

### API tests

- Valid requests.
- Invalid requests.
- Missing required fields.
- Unsupported formats.
- Oversized batches.
- Authentication failures.
- Rate limiting.
- Job status and download.

### Docker tests

Verify that:

- The application starts using Docker Compose.
- The web interface loads.
- API endpoints work.
- Health checks pass.
- Generated files are available for download.
- Temporary storage is cleaned correctly.

---

## 13. Development Roadmap

Build the application incrementally.

Do not attempt to implement everything simultaneously.

### Phase 1 — Foundation

- Initialize project.
- Configure TypeScript.
- Create frontend and backend.
- Implement Docker Compose.
- Create basic QR generation engine.
- Generate PNG and SVG.
- Implement health endpoint.

Acceptance criteria:

A user can start the application using Docker and generate a basic QR code.

### Phase 2 — Visual QR Editor

- Create dashboard.
- Create QR editor.
- Add real-time preview.
- Implement dot styles.
- Implement corner customization.
- Implement colors.
- Implement transparent backgrounds.
- Add PNG and SVG downloads.

Acceptance criteria:

A user can create a customized QR code, preview it and download it with transparency.

### Phase 3 — REST API

- Implement single QR generation.
- Implement batch generation.
- Add filenames.
- Implement ZIP export.
- Add request validation.
- Document the API.

Acceptance criteria:

An external application can generate 50 customized QR codes in one API request and receive a ZIP containing all 50 correctly named files.

### Phase 4 — Batch Interface

- CSV import.
- JSON import.
- Manual entry.
- Global design configuration.
- Per-item configuration.
- Batch progress.
- ZIP download.

Acceptance criteria:

A user can upload a list of URLs and download all generated QR codes in one archive.

### Phase 5 — Advanced Features

- Logo uploads.
- Gradients.
- Templates.
- Saved designs.
- Generation history.
- Asynchronous jobs.
- Optional API key management.

Acceptance criteria:

The application provides a complete and reliable QR creation workflow.

---

## 14. Development Rules for the Agent

Follow these instructions throughout development.

1. Always inspect the existing project before making architectural changes.
2. Do not overwrite working functionality without a clear reason.
3. Use TypeScript and strict typing.
4. Keep modules small and responsibilities separated.
5. Avoid duplicating QR generation logic.
6. Keep the API independent of frontend implementation details.
7. Validate every external input.
8. Never trust filenames supplied by API consumers.
9. Do not store temporary files indefinitely.
10. Keep Docker deployment functional after every major phase.
11. Write tests for important business logic.
12. Document environment variables and API endpoints.
13. Do not introduce unnecessary infrastructure.
14. Prefer simple, maintainable solutions over premature optimization.
15. Do not mark a feature as completed until it has been tested.

### Implementation workflow

Before implementing a phase:

1. Analyze the requirements.
2. Inspect the existing codebase.
3. Define the implementation plan.
4. Identify dependencies.
5. Implement the feature.
6. Run tests.
7. Verify Docker compatibility.
8. Update documentation.

If a technical decision has significant architectural implications, explain the alternatives before committing to it.

Do not silently remove or simplify requested functionality.

---

## 15. Definition of Done

The MVP is considered complete when all the following conditions are satisfied:

- [ ] Application runs entirely through Docker.
- [ ] Web interface is accessible from a browser.
- [ ] QR codes can be generated from URLs and arbitrary text.
- [ ] QR dot shapes can be customized.
- [ ] QR corner shapes can be customized.
- [ ] Colors can be customized independently.
- [ ] Transparent PNG export works.
- [ ] SVG export works.
- [ ] QR codes can be downloaded individually.
- [ ] REST API supports single QR generation.
- [ ] REST API supports batch generation.
- [ ] Batch generation supports custom filenames.
- [ ] Batch generation returns a ZIP archive.
- [ ] A batch of 50 QR codes works reliably.
- [ ] Generated QR codes can be decoded successfully.
- [ ] API documentation is available.
- [ ] Docker deployment instructions are documented.

The most important acceptance test is:

**Send 50 different URLs through the batch API, generate 50 customized QR codes with transparent backgrounds, assign a different filename to every item and receive one ZIP archive containing all 50 valid PNG files.**

This workflow must work without manually interacting with the web interface.

---

## 16. Final Product Vision

QR Studio should evolve into a complete QR generation platform.

Potential future features:

- QR templates.
- Bulk generation from spreadsheets.
- Multiple export presets.
- Branded QR codes.
- Logo libraries.
- Saved design configurations.
- API usage statistics.
- API key management.
- Multi-user support.
- Dynamic QR codes.
- Redirect management.
- Scan analytics.
- Expiration dates.
- Custom domains.

These features are future possibilities, not MVP requirements.

Prioritize a reliable, beautiful and fully functional static QR generation platform first.
