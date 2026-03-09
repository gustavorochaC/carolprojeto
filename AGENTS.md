# AGENTS.md — CT-e Extractor

Guia de referência para agentes de IA que operam neste repositório.

---

## Estrutura do Repositório

O projeto real está em `ct-e-to-excel/`. A raiz do repositório contém apenas
arquivos estáticos para GitHub Pages e a pasta `docs/` com o build publicado.

```
Carol/
├── docs/                  # build estático publicado na raiz do GitHub Pages
├── ct-e-to-excel/         # SUBPROJETO PRINCIPAL — trabalhe sempre aqui
│   ├── src/
│   │   ├── components/    # componentes React (UI customizados)
│   │   │   └── ui/        # 49 componentes shadcn/ui (código-fonte local)
│   │   ├── hooks/         # hooks customizados (use-mobile, use-toast)
│   │   ├── lib/           # lógica de negócio e utilitários
│   │   │   ├── types.ts         # FONTE DA VERDADE — interfaces e constantes
│   │   │   ├── pdfExtractor.ts  # extração PDF.js + OCR Tesseract (fallback)
│   │   │   ├── excelGenerator.ts
│   │   │   ├── storage.ts       # persistência IndexedDB
│   │   │   └── utils.ts
│   │   ├── pages/         # Index.tsx, History.tsx, NotFound.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
│   ├── eslint.config.js
│   └── package.json
```

---

## Comandos de Build, Lint e Dev

Todos os comandos devem ser executados dentro de `ct-e-to-excel/`.

```bash
# Instalar dependências
npm install          # ou: bun install

# Servidor de desenvolvimento (porta 8080)
npm run dev

# Build de produção (saída em docs/)
npm run build

# Build em modo desenvolvimento
npm run build:dev

# Lint (ESLint)
npm run lint

# Preview do build
npm run preview

# Deploy para GitHub Pages
npm run deploy       # executa build automaticamente via predeploy
```

### Testes

**Não há framework de testes configurado neste projeto.** Não existe Vitest,
Jest, nem qualquer script `test`. Não tente rodar `npm test` — não funciona.

---

## Configuração TypeScript

O projeto usa **três tsconfigs** em referência composta:

- `tsconfig.app.json` — código da aplicação (`src/`), `target: ES2020`, `strict: false`
- `tsconfig.node.json` — apenas `vite.config.ts`, `strict: true`
- `tsconfig.json` — raiz, só referencia os dois acima e define paths

**Atenção:** TypeScript está em modo **não-estrito** (`strict: false`,
`noImplicitAny: false`, `strictNullChecks: false`, `noUnusedLocals: false`).
Não altere isso sem necessidade — o projeto foi construído com essas configurações.

Alias de path configurado em todos os tsconfigs e no vite:
```ts
"@/*" → "./src/*"
// Exemplo: import { cn } from "@/lib/utils"
```

---

## Lint e Formatação

- **ESLint v9** com flat config (`eslint.config.js`)
- Plugins: `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- `@typescript-eslint/no-unused-vars` está **desativado** — variáveis não usadas não causam erro
- **Não há Prettier, Biome, ou qualquer formatador automático configurado**
- Apenas arquivos `*.ts` e `*.tsx` são verificados pelo ESLint

```bash
npm run lint    # verificar todos os arquivos
```

---

## Estilo de Código

### Imports — Ordem

```ts
// 1. React
import { useState, useEffect, useCallback } from 'react';

// 2. Bibliotecas externas
import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet } from 'lucide-react';

// 3. Componentes internos (alias @/)
import { Button } from '@/components/ui/button';
import ExcelPreview from '@/components/ExcelPreview';

// 4. Libs e utilitários internos
import { generateExcel } from '@/lib/excelGenerator';
import { cn } from '@/lib/utils';

// 5. Tipos (sempre com `import type`)
import type { CTeData } from '@/lib/pdfExtractor';
```

### Nomenclatura

| Elemento | Convenção | Exemplo |
|---|---|---|
| Componentes React | PascalCase | `ExcelPreview`, `ResultCard` |
| Páginas | PascalCase | `Index`, `History` |
| Hooks customizados | camelCase + prefixo `use` | `useIsMobile` |
| Funções utilitárias | camelCase | `extractCTeData`, `parseMoneyPtBrToNumber` |
| Constantes globais | UPPER_SNAKE_CASE | `EXCEL_COLUMNS`, `MONEY_COLUMNS` |
| Interfaces | PascalCase | `CTeExtractedData`, `SidebarProps` |
| Types derivados | PascalCase | `ExcelColumnKey`, `EditInputType` |
| Arquivos de componente | PascalCase | `ExcelPreview.tsx` |
| Arquivos de hook | kebab-case | `use-mobile.tsx` |
| Arquivos de lib | camelCase | `pdfExtractor.ts` |

### Componentes

```tsx
// Interface de props sempre antes do componente
interface MyComponentProps {
  value: string;
  onAction: () => void;
  optional?: boolean;
}

const MyComponent = ({ value, onAction, optional }: MyComponentProps) => {
  return <div>{value}</div>;
};

export default MyComponent;  // export default para componentes/páginas
```

### Tipos e Interfaces

```ts
// Constantes como readonly com `as const`
export const EXCEL_COLUMNS = ['Data', 'Numero_CTE', ...] as const;

// Type derivado do array de constantes
export type ExcelColumnKey = typeof EXCEL_COLUMNS[number];

// Record para mapeamentos
export const LABELS: Record<ExcelColumnKey, string> = { ... };

// Partial<T> para objetos construídos incrementalmente
const data: Partial<CTeExtractedData> = {};
```

### Tratamento de Erros

```ts
// Padrão em handlers async de componentes
try {
  const result = await someAsyncOperation();
  // ...
} catch (err: any) {
  const message = err instanceof Error ? err.message : 'Mensagem de fallback';
  setError(message);
  console.error('Contexto do erro:', err);
}

// Em funções de lib, lançar erros com mensagens legíveis
throw new Error('Erro ao processar CT-e. Verifique se o arquivo é válido.');

// Erros identificáveis por string de mensagem
if (error.message === 'OCR_FAILED') { ... }
```

### Classes CSS e Tailwind

```tsx
// Sempre usar cn() para combinar classes condicionais
import { cn } from '@/lib/utils';

<div className={cn(
  "base-classes here",
  isActive && "active-classes",
  disabled && "opacity-50 cursor-not-allowed"
)} />

// Utilitários CSS customizados definidos em src/index.css:
// .card-hover   → hover com sombra e elevação
// .btn-press    → active:scale-[0.98]
// .glass        → backdrop-blur com borda
// .gradient-text → gradiente de texto
// .table-row-hover → hover em linhas de tabela
```

---

## Arquitetura e Padrões Importantes

### Fonte da Verdade: `src/lib/types.ts`

**Este é o arquivo mais importante da aplicação.** Centraliza:
- `EXCEL_COLUMNS` — ordem exata das colunas no Excel (imutável)
- `EXCEL_COLUMN_LABELS` — labels de exibição no UI
- `MONEY_COLUMNS`, `COMPUTED_COLUMNS`, `ALWAYS_EDITABLE_COLUMNS` — controle de comportamento
- `COLUMN_TO_FIELD_MAP` — mapeamento coluna Excel → campo `CTeExtractedData`
- Interfaces `CTeExcelRow` e `CTeExtractedData`
- Função `toExcelRow()` para conversão

Ao adicionar ou renomear colunas, **sempre comece em `types.ts`**.

### Pipeline de Extração de PDF

```
PDF upload
  → PDF.js (extração nativa de texto com coordenadas X/Y)
  → parseCteFromContext() (busca por âncoras de texto via regex)
  → validateCriticalFields() (chaveAcesso, Numero_CTe, Cliente, Cobranca_CTE)
  → se inválido ou texto < 50 chars: OCR via Tesseract.js (somente página 1)
  → merge: campos vazios preenchidos com resultado do OCR
  → fillDefaults() → CTeExtractedData completo
```

### Persistência: IndexedDB (storage.ts)

- Dados agrupados por chave `YYYY-MM` (mês de processamento, não de emissão)
- Cada entrada contém `{ monthYear: string, cteList: CTeData[] }`
- Todas as funções são async e retornam Promises wrappadas manualmente
- Funções exportadas: `addCTeToStorage`, `getCTesFromCurrentMonth`,
  `getCTesByMonth`, `deleteCTe`, `updateCTe`, `updateCTePedagio`, `clearMonthData`

### Componentes shadcn/ui

Os 49 componentes em `src/components/ui/` são **código-fonte local** — podem e
devem ser editados diretamente. Usam `cva` (class-variance-authority) para
variantes e `cn()` para composição. O `Button` é o exemplo canônico do padrão.

### Tema Escuro

Implementado manualmente em `Layout.tsx` via `useState` + toggle da classe `dark`
em `document.documentElement`. As variáveis CSS de tema estão em `src/index.css`
sob `@layer base { :root { ... } .dark { ... } }`.

---

## Arquivos de Regras de IA

- `.cursor/` — existe mas está **vazia**
- `.github/workflows/` — existe mas está **vazia**
- Não há `.cursorrules`, `.github/copilot-instructions.md`, nem outros `AGENTS.md`
