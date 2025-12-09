# Documentation Index

Welcome to Tech Citizen Gateway documentation. This guide helps you navigate the available resources.

---

## 🚀 Quick Links

| I want to...                      | Go to                                                |
| --------------------------------- | ---------------------------------------------------- |
| **Get started in 15 minutes**     | [Getting Started](../README.md#quick-start)          |
| **Setup development environment** | [DX Setup Guide](./guides/DX_SETUP.md)               |
| **Learn testing strategies**      | [Testing Guide](./development/TESTING.md)            |
| **Configure infrastructure**      | [Infrastructure](./infrastructure/INFRASTRUCTURE.md) |
| **Deploy to production**          | [Production Setup](./operations/PRODUCTION_SETUP.md) |
| **Understand architecture**       | [ADRs](./architecture/decisions/)                    |
| **Report security vulnerability** | [Security Policy](../SECURITY.md)                    |
| **Follow course materials**       | [Course Index](./learning/COURSE_INDEX.md)           |
| **Check project roadmap**         | [Roadmap](./project/ROADMAP.md)                      |

---

## 📂 Documentation Structure

### Guides (Setup & Onboarding)

- **[DX Setup](./guides/DX_SETUP.md)** - Developer experience stack (ESLint, Prettier, Husky, Release automation)

### Development

- **[Testing](./development/TESTING.md)** - Smoke tests, flaky tests, test pyramid
- **[Platformatic Config](./development/PLATFORMATIC.md)** - Watt configuration guide
- **[Git Workflow](./development/GIT_WORKFLOW.md)** - Branching, commits, releases

### Architecture

- **[Decisions (ADRs)](./architecture/decisions/)** - Architecture Decision Records
  - [0001: Minimal Infrastructure](./architecture/decisions/0001-minimal-infrastructure-yagni.md)

### Infrastructure

- **[Infrastructure Guide](./infrastructure/INFRASTRUCTURE.md)** - Docker, deployment, environment config, IaC testing

### Operations

- **[Production Setup](./operations/PRODUCTION_SETUP.md)** - Hetzner, Cloudflare, DNS, secrets, deployment
- **[Ansible Playbooks](./operations/ANSIBLE.md)** - Multi-environment automation

### Learning

- **[Course Index](./learning/COURSE_INDEX.md)** - Complete course materials
- **[Course Content](./learning/COURSE.md)** - Full course text
- **[Tech Stack References](./learning/COURSE_REFERENCES.md)** - Modern stack 2025

### Project Management

- **[Roadmap](./project/ROADMAP.md)** - Epics and milestones
- **[Backlog](./project/BACKLOG.md)** - Sprint planning

### Sessions

- **[2025-12-08 Analysis](./sessions/2025-12-08-analysis.md)** - Gateway binding issues
- **[2025-12-08 Gateway Binding](./sessions/2025-12-08-gateway-binding.md)** - Network debugging

---

## 🎯 By Role

### New Contributors

1. [README](../README.md) - Project overview
2. [Contributing Guide](../CONTRIBUTING.md) - How to contribute
3. [DX Setup](./guides/DX_SETUP.md) - Local environment setup
4. [Testing](./development/TESTING.md) - Testing fundamentals

### Developers

1. [Platformatic Config](./development/PLATFORMATIC.md) - Framework configuration
2. [Git Workflow](./development/GIT_WORKFLOW.md) - Branching strategy
3. [Infrastructure](./infrastructure/INFRASTRUCTURE.md) - Docker Compose, services
4. [Course Materials](./learning/COURSE_INDEX.md) - Learning resources

### DevOps/SRE

1. [Production Setup](./operations/PRODUCTION_SETUP.md) - Deployment checklist
2. [Ansible Playbooks](./operations/ANSIBLE.md) - Automation scripts
3. [Infrastructure](./infrastructure/INFRASTRUCTURE.md) - Full stack setup
4. [Security Policy](../SECURITY.md) - Hardening checklist

### Project Managers

1. [Roadmap](./project/ROADMAP.md) - Strategic planning
2. [Backlog](./project/BACKLOG.md) - Current sprints
3. [ADRs](./architecture/decisions/) - Technical decisions

---

## 📊 Documentation Statistics

| Category       |  Files |     Lines |
| -------------- | -----: | --------: |
| Guides         |      1 |       916 |
| Development    |      3 |       475 |
| Architecture   |      1 |        92 |
| Infrastructure |      1 |       720 |
| Operations     |      2 |       482 |
| Learning       |      4 |     3,600 |
| Project        |      2 |       733 |
| Sessions       |      2 |       382 |
| **Total**      | **16** | **7,400** |

---

## 🔍 Search Tips

### Find by Topic

```bash
# Search all documentation
grep -r "search term" docs/

# Search specific category
grep -r "Docker" docs/infrastructure/
grep -r "test" docs/development/
```

### Browse by Date

```bash
# Recent changes
git log --oneline -- docs/

# File history
git log --follow docs/guides/DX_SETUP.md
```

---

## 🤝 Contributing to Docs

Documentation lives in Git and follows the same workflow as code:

1. **Create branch**: `git checkout -b docs/improve-testing-guide`
2. **Edit Markdown**: Use your favorite editor
3. **Commit**: `git commit -m "docs: improve testing examples"`
4. **PR**: Submit for review

### Style Guide

- Use **Markdown** for all documentation
- Follow **[Prettier](../.prettierrc)** formatting
- Include **code examples** where applicable
- Add **diagrams** for complex concepts (Mermaid preferred)

---

## 📚 External Resources

- **Platformatic Docs**: https://docs.platformatic.dev/
- **Fastify Docs**: https://fastify.dev/docs/
- **Docker Compose**: https://docs.docker.com/compose/
- **Ansible**: https://docs.ansible.com/

---

**Last Updated**: 2025-12-09  
**Maintainer**: Antonio Cittadino  
**License**: MIT
