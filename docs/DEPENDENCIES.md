# Required Python Libraries - MMS General

## Overview
This document lists all required Python libraries for the MMS General project. Dependencies are organized by category and purpose.

---

## Core Web Framework

| Library | Version | Purpose |
|---------|---------|---------|
| **fastapi** | 0.111.1 | Modern web framework for building APIs |
| **uvicorn** | 0.27.1 | ASGI server for running FastAPI applications |
| **starlette** | 0.37.2 | Lightweight ASGI framework (FastAPI dependency) |
| **gunicorn** | 21.2.0 | Production-grade HTTP server |

---

## Database & ORM

| Library | Version | Purpose |
|---------|---------|---------|
| **sqlmodel** | 0.0.19 | SQL database ORM combining SQLAlchemy + Pydantic |
| **sqlalchemy** | 2.0.37 | SQL toolkit and Object-Relational Mapping |
| **alembic** | 1.14.1 | Database migration tool |
| **psycopg** | 3.2.4 | PostgreSQL adapter for Python |
| **psycopg2** | 2.9.10 | PostgreSQL adapter (alternative) |
| **psycopg-binary** | 3.2.4 | PostgreSQL adapter with binary support |
| **greenlet** | 3.1.1 | Lightweight concurrency for database connections |

---

## Authentication & Security

| Library | Version | Purpose |
|---------|---------|---------|
| **bcrypt** | 4.0.1 | Password hashing library |
| **passlib** | 1.7.4 | Password hashing library with bcrypt support |
| **python-jose** | 3.3.0 | JSON Web Token (JWT) implementation |
| **cryptography** | 44.0.0 | Cryptographic recipes and primitives |
| **slowapi** | 0.1.9 | Rate limiting for FastAPI |

---

## Data Validation & Serialization

| Library | Version | Purpose |
|---------|---------|---------|
| **pydantic** | 2.10.6 | Data validation and settings management |
| **pydantic-core** | 2.27.2 | Core validation engine for Pydantic |
| **pydantic-settings** | 2.7.1 | Settings management with Pydantic |
| **email-validator** | 2.2.0 | Email address validation |
| **dnspython** | 2.7.0 | DNS toolkit for email validation |
| **annotated-types** | 0.7.0 | Type annotations library |

---

## Request/Response Handling

| Library | Version | Purpose |
|---------|---------|---------|
| **httpx** | 0.27.2 | Modern HTTP client |
| **httpcore** | 1.0.7 | Low-level HTTP client |
| **python-multipart** | 0.0.9 | Multipart form data parsing |
| **h11** | 0.14.0 | HTTP/1.1 protocol implementation |

---

## Email & Communication

| Library | Version | Purpose |
|---------|---------|---------|
| **emails** | 0.6 | Modern email library |
| **premailer** | 3.10.0 | CSS inlining for emails |

---

## Data Processing & Analysis

| Library | Version | Purpose |
|---------|---------|---------|
| **pandas** | 2.2.3 | Data manipulation and analysis |
| **numpy** | 2.2.2 | Numerical computing |
| **pyarrow** | 19.0.0 | Apache Arrow data format |

---

## Visualization & Reporting

| Library | Version | Purpose |
|---------|---------|---------|
| **streamlit** | 1.41.1 | Data app framework |
| **altair** | 5.5.0 | Declarative visualization |
| **pillow** | 11.1.0 | Image processing |

---

## Logging & Monitoring

| Library | Version | Purpose |
|---------|---------|---------|
| **sentry-sdk** | 1.45.1 | Error tracking and performance monitoring |

---

## Templating & Markup

| Library | Version | Purpose |
|---------|---------|---------|
| **jinja2** | 3.1.5 | Template engine |
| **markupsafe** | 3.0.2 | String escaping for safe template rendering |
| **lxml** | 5.3.0 | XML and HTML processing |
| **cssselect** | 1.2.0 | CSS selector parsing |
| **cssutils** | 2.11.1 | CSS parsing and manipulation |

---

## Utilities & Common Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| **typing-extensions** | 4.12.2 | Backported typing features |
| **python-dateutil** | 2.9.0 | Date and time utilities |
| **pytz** | 2024.2 | Timezone definitions |
| **tenacity** | 8.5.0 | Retrying library for failed operations |
| **requests** | 2.32.3 | HTTP library |
| **idna** | 3.10 | Internationalized domain names |
| **charset-normalizer** | 3.4.1 | Character encoding detection |
| **certifi** | 2024.12.14 | Mozilla CA bundle |
| **six** | 1.17.0 | Python 2/3 compatibility |

---

## Configuration & Environment

| Library | Version | Purpose |
|---------|---------|---------|
| **python-dotenv** | 1.0.1 | Load environment variables from .env files |
| **pyyaml** | 6.0.2 | YAML parser and emitter |

---

## CLI & Command Line Tools

| Library | Version | Purpose |
|---------|---------|---------|
| **typer** | 0.15.1 | CLI library for FastAPI |
| **fastapi-cli** | 0.0.7 | FastAPI command line interface |
| **click** | 8.1.8 | CLI creation toolkit |
| **rich** | 13.9.4 | Rich terminal output library |
| **rich-toolkit** | 0.13.2 | Additional Rich utilities |
| **shellingham** | 1.5.4 | Shell detection |

---

## Development & Testing

| Library | Version | Purpose |
|---------|---------|---------|
| **pytest** | 8.3.4 | Testing framework |
| **mypy** | 1.14.1 | Static type checker |
| **ruff** | 0.3.7 | Fast Python linter |
| **pre-commit** | 3.8.0 | Git hook framework |
| **coverage** | 7.6.10 | Code coverage measurement |

---

## Type Stubs for Development

| Library | Version | Purpose |
|---------|---------|---------|
| **types-python-jose** | 3.3.4 | Type hints for python-jose |
| **types-passlib** | 1.7.7 | Type hints for passlib |
| **mypy-extensions** | 1.0.0 | MyPy extensions |

---

## JSON & Data Formats

| Library | Version | Purpose |
|---------|---------|---------|
| **jsonschema** | 4.23.0 | JSON Schema validation |
| **jsonschema-specifications** | 2024.10.1 | JSON Schema specifications |
| **protobuf** | 5.29.3 | Protocol buffers serialization |

---

## Version Control & Repository

| Library | Version | Purpose |
|---------|---------|---------|
| **gitpython** | 3.1.44 | Python interface to Git |
| **gitdb** | 4.0.12 | Git object database (GitPython dependency) |

---

## Performance & Async

| Library | Version | Purpose |
|---------|---------|---------|
| **anyio** | 4.8.0 | Async compatibility layer |
| **sniffio** | 1.3.1 | Detect async library (anyio dependency) |
| **uvloop** | 0.21.0 | Drop-in replacement for asyncio event loop |
| **httptools** | 0.6.4 | HTTP parsing (uvicorn dependency) |
| **websockets** | 14.2 | WebSocket protocol implementation |

---

## Other Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| **markdown-it-py** | 3.0.0 | Markdown parser |
| **mdurl** | 0.1.2 | URL utilities for markdown |
| **pygments** | 2.19.1 | Syntax highlighting |
| **watchdog** | 6.0.0 | File system event monitoring |
| **watchfiles** | 1.0.4 | File change detection |
| **pluggy** | 1.5.0 | Plugin system |
| **iniconfig** | 2.0.0 | INI config parser |
| **packaging** | 24.2 | Package version utilities |
| **attrs** | 25.1.0 | Class helpers |
| **toml** | 0.10.2 | TOML parser |
| **tornado** | 6.4.2 | Web framework (streamlit dependency) |
| **cachetools** | 5.5.1 | Caching decorators |
| **narwhals** | 1.24.1 | Schema and API compatibility |
| **rpds-py** | 0.22.3 | Rust-backed data structures |
| **referencing** | 0.36.2 | JSON reference handling |
| **pydeck** | 0.9.1 | Deck.gl visualization (streamlit dependency) |

---

## Python Version & Runtime

- **Python**: 3.11.11 or higher (^3.11.11)
- **Platform**: Cross-platform (Windows, macOS, Linux)

---

## Installation

### Using pip (from requirements.txt)
```bash
pip install -r requirements.txt
```

### Using Poetry (from pyproject.toml)
```bash
poetry install
```

### Installing a specific library
```bash
pip install <library_name>==<version>
```

---

## Total Count

- **Total Libraries**: 105+
- **Main Dependencies**: ~70
- **Development Dependencies**: ~15
- **Type Stubs**: ~3

---

## Security Notes

1. **Password Hashing**: Uses bcrypt (v4.0.1) for secure password storage
2. **JWT Tokens**: Uses python-jose with cryptography for secure token generation
3. **Rate Limiting**: Uses slowapi to prevent abuse
4. **Email Validation**: Uses email-validator with DNS verification
5. **Error Tracking**: Uses sentry-sdk for monitoring in production

---

## Production Deployment

For production deployment, ensure:
- All libraries are listed in `requirements.txt` or locked in `poetry.lock`
- Use specific versions (not wildcards) in production
- Install dependencies in a virtual environment
- Run `pip install -r requirements.txt` before deployment

---

Last Updated: March 28, 2026
