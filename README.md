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
│   ├── server.js        # Express API + SQLite + AI endpointy + statické soubory
│   ├── gemini.js        # AI helpery, validace, deduplikace a testovatelné utility
│   ├── gemini.test.js   # unit testy AI helperů
│   ├── api.test.js      # integrační testy API endpointů
│   └── package.json
├── Dockerfile           # multi-stage build (React → Node)
├── docker-compose.yml
└── data/                # SQLite databáze (vznikne automaticky)
```

## AI generování vět

AI vrstva používá Gemini přes backend a je navržená tak, aby byla odolnější vůči výpadkům a změnám modelů:

- backend si přes `ListModels` skládá seznam dostupných modelů pro `generateContent`
- preferuje stabilnější Flash modely a umí fallback mezi více kandidáty
- dočasné chyby (`rate limit`, `high demand`, `try again later` apod.) zkouší vícekrát, než přejde na další model
- odpověď vynucuje jako JSON přes `responseMimeType: "application/json"` a `responseSchema`
- AI věty se validují, deduplikují a ukládají do SQLite cache
- cache má limit `120` aktivních AI vět na každé písmeno

### Review status AI vět

Každá AI věta může mít ve storage jeden z těchto stavů:

- `active` — používá se do cvičení
- `hidden` — zůstává uložená, ale do cvičení se už nenabízí
- `rejected` — označená jako špatná, zůstává jen pro správu / audit

### Diagnostika AI

Backend vrací AI metadata přes:

- `GET /api/settings`
- `GET /api/ai-debug`

Najdete tam například:

- poslední úspěšný model
- poslední chybu
- počet retry pokusů
- poslední AI pokusy
- přehled aktivních / skrytých / špatných AI vět po písmenech
- cache limit a cílový počet vět na jedno generování

### Správa AI vět v UI

V rodičovském panelu lze:

- generovat další AI věty po jednotlivých písmenech
- zobrazit poslední model, chybu a retry count
- prohlížet jednotlivé AI věty
- ručně větu skrýt
- označit ji jako špatnou
- obnovit ji zpět mezi aktivní
- smazat ji jednotlivě

## Testy

### Frontend build

```bash
npm run build
```

### Backend helper testy

```bash
cd backend
npm test
```

### Backend API integrační testy

Tyto testy počítají s prostředím, kde jsou dostupné backend závislosti a správná Node verze. Nejjednodušší je pustit je v Dockeru:

```bash
docker compose up --build -d
docker compose run --rm vyjmenovana-slova npm run test:api
```

`api.test.js` používá dočasnou SQLite databázi a mock AI režim, takže nevolá skutečné Gemini API.

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
