# Inscrição Evento dos Servidores

React + Vite + tRPC + NextAuth + MySQL (Drizzle ORM)

## Desenvolvimento

```bash
pnpm install
pnpm dev
```

## Build e Deploy (Vercel)

```bash
pnpm build
```

## Banco de Dados

```bash
pnpm db:migrate    # Aplicar migrações
pnpm db:push       # Gerar e aplicar novas migrações
```

## Variáveis de Ambiente

```env
DATABASE_URL=mysql://user:pass@host:3306/dbname
NEXTAUTH_SECRET=random-string
NEXTAUTH_URL=https://your-app.vercel.app
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```
