# Contributing to Autonomous

Thank you for your interest in contributing to Autonomous! This document outlines how to get started, the coding standards we follow, and the process for submitting changes.

---

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Code Style Guidelines](#code-style-guidelines)
3. [Running Tests](#running-tests)
4. [Pull Request Process](#pull-request-process)
5. [Reporting Issues](#reporting-issues)
6. [Code of Conduct](#code-of-conduct)

---

## Development Environment Setup

Please refer to the [Quick Start section in the README](./README.md#quick-start) for full setup instructions. In summary:

**Docker (recommended):**
```bash
cp .env.example .env   # Edit .env with your values
docker-compose up -d --build
```

**Local development:**

1. **Backend** — navigate to `backend/`, install dependencies, and start the dev server:
   ```bash
   cd backend
   pip install -r requirements.txt
   alembic upgrade head
   python app/seed.py
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

2. **Frontend** — navigate to `autonomous-frontend/`, install dependencies, and start:
   ```bash
   cd autonomous-frontend
   npm install
   REACT_APP_API_URL=http://localhost:8000 npm start
   ```

---

## Code Style Guidelines

### Python (Backend)

- **Formatter**: [black](https://black.readthedocs.io/) — run `black .` from the `backend/` directory.
- **Linter**: [flake8](https://flake8.pycqa.org/) — run `flake8 .` from the `backend/` directory.
- Follow [PEP 8](https://pep8.org/) conventions.
- Use type hints for all function signatures.
- Keep functions focused and small; prefer composition over large monolithic functions.

### JavaScript / JSX (Frontend)

- **Linter**: [ESLint](https://eslint.org/) via the `react-app` config — run `npm run lint` from the `autonomous-frontend/` directory (or `CI=true npm run build` to catch warnings).
- Use functional components with React hooks.
- Avoid committing `console.log` statements.

---

## Running Tests

### Backend

```bash
cd backend
python -m pytest tests/ -v
```

All 56+ tests must pass before submitting a PR.

### Frontend

```bash
cd autonomous-frontend
npm test
```

---

## Pull Request Process

1. **Fork** the repository and create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Commit** your changes using emoji commit prefixes that the project uses:
   | Emoji | When to use |
   |-------|-------------|
   | 🧪 | Adding or updating tests |
   | ⚡ | Performance improvements |
   | 🔒 | Security fixes |
   | 🧹 | Code cleanup / refactoring |
   | ✨ | New features |
   | 🐛 | Bug fixes |
   | 📄 | Documentation |

   Example: `git commit -m "🔒 Restrict CORS to configured origins"`

3. **Push** your branch and **open a Pull Request** against `main`.

4. Fill out the [Pull Request template](./.github/PULL_REQUEST_TEMPLATE.md) completely.

5. Ensure all CI checks pass (lint, tests, Docker build).

6. A maintainer will review your PR and may request changes.

---

## Reporting Issues

Please use the GitHub issue templates:

- 🐛 [Bug Report](./.github/ISSUE_TEMPLATE/bug_report.md) — for unexpected behaviour or crashes.
- ✨ [Feature Request](./.github/ISSUE_TEMPLATE/feature_request.md) — for new feature ideas.

When reporting a bug, include:
- Steps to reproduce
- Expected vs. actual behaviour
- Your OS, browser, deployment method, and version/commit

---

## Code of Conduct

This project adopts the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you agree to uphold this standard. Please report unacceptable behaviour to the project maintainers.
