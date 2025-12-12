# Ansible Deployment Archive (2025-12)

## ⚠️ STATO: DEPRECATO

Questo deployment Ansible è stato **archiviato** il 12 dicembre 2025.

### Motivo dell'Archiviazione

La strategia di deployment verrà **riprogettata da zero** per allinearsi meglio con:

- Architettura Platformatic Watt
- Container orchestration (Docker Compose / Kubernetes)
- CI/CD moderno (GitHub Actions)
- Infrastructure as Code (Terraform / Pulumi)

### Contenuto Archiviato

```
ansible-2025/
├── ansible/                          # Directory playbook originale
│   ├── playbooks/
│   │   ├── deploy-gateway.yml
│   │   ├── security-audit.yml
│   │   ├── bootstrap.yml
│   │   └── ...
│   └── inventory/
│       ├── hosts.ini
│       └── group_vars/
│
└── scripts/                          # Script di automazione
    ├── ansible.sh
    ├── ansible-production.sh
    ├── bootstrap-server.sh
    ├── deploy-production.sh
    ├── deploy-staging.sh
    ├── deploy-test.sh
    ├── generate-ansible-inventory.sh
    ├── generate-secrets.sh
    ├── load-production-env.sh
    ├── run-remote-tests.sh
    └── test-production-deployment.sh
```

### Comandi package.json Rimossi

```json
"ansible": "bash scripts/ansible.sh",
"ansible:ping": "...",
"ansible:staging:security": "...",
"ansible:staging:audit": "...",
"ansible:staging:discovery": "...",
"ansible:staging:cleanup": "...",
"ansible:staging:deploy": "...",
"ansible:prod:discovery": "...",
"ansible:prod:security": "...",
"ansible:prod:audit": "...",
"ansible:prod:deploy": "..."
```

### Riferimenti per Nuova Strategia

**ADR da scrivere**: `docs/architecture/decisions/00XX-deployment-strategy.md`

**Possibili Direzioni**:

1. **Docker Compose** (staging/test)
2. **Kubernetes** (production)
3. **Platformatic Cloud** (managed)
4. **GitHub Actions** + SSH deploy (semplice)

### Accesso Archivio

Questa versione è conservata per **reference storico** e **audit trail**.

**NON USARE** per nuovi deployment.

---

**Archiviato**: 2025-12-12  
**Progetto**: Tech Citizen Software Gateway  
**Commit**: [vedere git log]
