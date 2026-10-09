# Plano — Inscrição Evento dos Servidores

## Objetivo

Entregar um aplicativo web em React/TypeScript com duas experiências: inscrição pública para servidores e painel administrativo protegido. A persistência será feita pelo banco MySQL gerenciado do projeto, via Drizzle, e as regras críticas de capacidade serão implementadas no servidor com transação e bloqueio lógico de capacidade.

## Escopo desta entrega

- Formulário público com as 23 escolas/setores oficiais.
- Funcionário obrigatório e acompanhante opcional, limitado a um.
- Aceite obrigatório das regras.
- Indicador de pessoas ocupadas, capacidade total e vagas restantes.
- Confirmação com protocolo após a inscrição.
- Painel administrativo visualizável para usuários autorizados, com métricas, filtros, busca, edição, cancelamento, histórico e exportação CSV.
- Rotas `/` e `/admin`.
- Login administrativo via Manus OAuth já fornecido pelo starter; o proprietário do projeto é administrador por padrão.
- API tRPC para inscrições, dashboard e mutações administrativas.

## Arquitetura

### Frontend

- React + Vite + TypeScript.
- Wouter para rotas.
- TanStack Query via tRPC para sincronização dos dados.
- Tailwind CSS e componentes Radix existentes para controles acessíveis.
- Formulário com estado local controlado e mensagens de erro preservando valores preenchidos.

### Backend

- Express + tRPC.
- Drizzle ORM sobre MySQL gerenciado.
- Inscrição, cancelamento e alteração de acompanhante passam por funções de servidor.
- A operação de criação usa transação com leitura/atualização de uma linha de capacidade, garantindo `pessoas_ativas + quantidade <= 200`.
- Auditoria registra ações administrativas sem expor dados desnecessários em logs.

### Dados

- `users` existente do starter para autenticação e papel.
- `eventSettings` para capacidade e contadores.
- `registrations` para inscrição, protocolo, dados do servidor, acompanhante, status e aceite.
- `auditLogs` para ações administrativas.

## Estrutura de projeto

```text
client/src/
  App.tsx                 rotas e providers
  index.css               tokens visuais, layout e acessibilidade
  pages/Home.tsx          inscrição pública
  pages/Admin.tsx         dashboard administrativo
  components/             controles e componentes do starter
  lib/trpc.ts             cliente tipado
server/
  db.ts                   conexão e queries
  routers.ts              procedimentos públicos e protegidos
drizzle/
  schema.ts               tabelas e tipos
public/
  manus-routes.json       manifesto de rotas
app.config.ts             metadado de logo do projeto
plan.md                   plano e decisões de design
```

## Direção visual

### Movimento de design

**Editorial institucional contemporâneo:** uma interface de serviço público que combina precisão administrativa com acolhimento humano. A página não será um formulário genérico centralizado; terá uma composição assimétrica com uma faixa lateral de contexto e um cartão de inscrição de leitura muito clara.

### Princípios

1. **Clareza operacional:** cada decisão do usuário aparece com rótulo direto, estado visível e próximo passo inequívoco.
2. **Calma e confiança:** azul-petróleo profundo, branco quente e verde de confirmação evitam a estética fria de sistemas burocráticos.
3. **Ritmo editorial:** títulos grandes, divisores finos e blocos compactos criam uma leitura semelhante a um boletim institucional bem editado.
4. **Acessibilidade primeiro:** contraste forte, foco visível, estados com texto e navegação por teclado em todo o fluxo.

### Filosofia de cor

- **Azul-petróleo** como cor proprietária: remete a estabilidade, serviço e confiança sem parecer corporativo demais.
- **Laranja âmbar** usado com moderação para destacar capacidade e pontos de atenção.
- **Verde sálvia** para sucesso e confirmação.
- **Areia clara** como fundo, criando sensação de documento impresso e reduzindo fadiga visual.

### Paradigma de layout

Na página pública, uma coluna lateral contextual apresenta a capacidade e as regras em um bloco fixo/estável; a coluna principal acomoda o formulário em seções curtas. Em telas menores, o contexto sobe para uma faixa compacta e o formulário ocupa a largura inteira. No painel, uma barra lateral estreita abriga navegação e identidade; o conteúdo usa cartões de métricas e uma tabela ampla.

### Elementos de assinatura

- Marca textual com pequeno símbolo de “duas presenças” formado por dois círculos alinhados, remetendo a servidor e acompanhante.
- Faixa de capacidade com anel/progresso e números grandes.
- Divisores editoriais e marcadores de seção numerados.

### Interações e animação

- Transições de 150–220ms apenas em hover, foco, expansão de acompanhante e confirmação.
- O indicador de vagas atualiza com uma transição suave, sem animações contínuas.
- Erros aparecem próximos ao campo com leve deslocamento vertical, respeitando `prefers-reduced-motion`.
- O envio troca o CTA por estado de processamento e evita duplo clique.

### Tipografia

- **Manrope** para títulos, métricas e elementos de marca.
- **Inter** para campos, tabelas, rótulos e corpo de texto.
- Título de página grande, subtítulos compactos e labels de alta legibilidade.

### Essência da marca

**Posicionamento:** a forma mais clara e segura de confirmar sua presença no evento dos servidores.  
**Personalidade:** confiável, acolhedora, organizada.

### Voz da marca

Direta, cordial e institucional sem formalismo excessivo.

- Headline: “Sua presença começa aqui.”
- Confirmação: “Inscrição registrada. Até o encontro.”

### Wordmark e cor proprietária

Wordmark “encontro” em Manrope semibold, acompanhado de dois pontos circulares conectados por uma linha curta. Cor proprietária: `#0F4C5C` (azul-petróleo de serviço).

## Fluxos principais

### Inscrição pública

1. Usuário acessa `/`.
2. Lê capacidade e regras resumidas.
3. Seleciona escola/setor e preenche nome/função.
4. Expande acompanhante opcional e informa o nome se escolher sim.
5. Marca aceite.
6. Envia; servidor valida, reserva 1 ou 2 pessoas atomicamente e grava.
7. Recebe protocolo e resumo.

### Administração

1. Usuário acessa `/admin`.
2. Se não autenticado, vê ação de login Manus OAuth.
3. Usuário autenticado sem papel `admin` recebe bloqueio de permissão.
4. Administrador vê KPIs, distribuição por setor e tabela.
5. Pode filtrar, editar e cancelar, com auditoria.
6. Pode exportar os registros filtrados em CSV.

## Critérios preservados

- Capacidade absoluta: 200 pessoas.
- Funcionário = 1 pessoa; funcionário com acompanhante = 2.
- No máximo um acompanhante.
- Controles críticos no servidor/banco.
- Cancelamento libera vagas.
- As 23 opções oficiais devem ser exibidas e validadas.
- Painel protegido, histórico, exportação e totais por escola/setor.
- Sem localStorage como banco principal.
