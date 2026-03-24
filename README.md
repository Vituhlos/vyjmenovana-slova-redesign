# Vyjmenovaná slova

React appka pro procvičování vyjmenovaných slov (B, F, L, M, P, S, V, Z). Obsahuje:

- **Věty s doplňováním** — jedno nebo více prázdných míst v jedné větě
- **Chytáky** — věty s i/í (ne vyjmenovaná slova), aby to nebylo příliš mechanické
- **Historie cvičení** — backend ukládá výsledky do SQLite, lze si prohlédnout přes panel v appce

## Struktura projektu

```
├── src/
│   ├── App.jsx          # hlavní React komponenta
│   ├── sentenceBank.js  # databáze vět (640+ vět, 8 písmen)
│   └── main.jsx
├── backend/
│   ├── server.js        # Express API + servírování statických souborů
│   └── package.json
├── Dockerfile           # multi-stage build (React → Node)
├── docker-compose.yml
└── data/                # SQLite databáze (vznikne automaticky)
```

## Lokální spuštění

Potřebuješ spustit backend i frontend zvlášť:

```bash
# Frontend (dev server s proxy na backend)
npm install
npm run dev
# běží na http://localhost:3000

# Backend (v druhém terminálu)
cd backend
npm install
node server.js
# běží na http://localhost:3001
```

## Docker (produkce)

Jeden kontejner — Node server obsluhuje jak API (`/api/*`), tak statický React build.

```bash
docker compose up --build -d
```

Appka poběží na `http://localhost:8080`.

Data (SQLite) jsou uložena do `./data/` na hostu přes volume mount.

### Ruční build bez compose

```bash
docker build -t vyjmenovana-slova:latest .
docker run -d --name vyjmenovana-slova -p 8080:3001 -v $(pwd)/data:/app/data vyjmenovana-slova:latest
```

## Unraid

V projektu je připravený template [unraid-vyjmenovana-slova.xml](unraid-vyjmenovana-slova.xml).

1. Zbuilduj a pushni image do registry:
   ```bash
   docker build -t ghcr.io/TVUJ_UCET/vyjmenovana-slova:latest .
   docker push ghcr.io/TVUJ_UCET/vyjmenovana-slova:latest
   ```
2. V Unraidu otevři `Docker` → `Add Container` → `Advanced View`
3. Použij XML template nebo ručně nastav:
   - **Repository**: tvoje image
   - **Network Type**: `bridge`
   - **Host Port**: `8080`, **Container Port**: `3001`
   - **Volume**: cesta na hostu → `/app/data` (pro persistenci dat)
