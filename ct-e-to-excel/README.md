# CT-e Extractor

Aplicação web para extração automática de dados de CT-es (Conhecimento de Transporte Eletrônico) em PDF e exportação para Excel. Desenvolvida para uso interno, com processamento 100% local — nenhum dado sai da máquina.

## Funcionalidades

- **Upload em lote** — processe vários CT-es de uma vez, com barra de progresso e status por arquivo
- **Extração automática** — extrai dados via PDF.js (nativo) com fallback para OCR (Tesseract.js) quando necessário
- **Deduplicação** — detecta automaticamente CT-es duplicados pela chave de acesso (44 dígitos)
- **Preview e edição** — visualize os dados extraídos em tabela editável antes de exportar
- **Exportação Excel** — gera `.xlsx` com colunas na ordem correta e formatação monetária
- **Histórico por mês** — navegue pelos CT-es processados em meses anteriores
- **Relatório de qualidade** — identifica campos críticos ausentes (❌ Crítico / ⚠️ Parcial / ✅ Completo)
- **Tema escuro** — suporte nativo a dark mode

## Campos extraídos

| Coluna | Descrição |
|---|---|
| Data | Data de emissão (DD/MM/YYYY) |
| Numero_CTE | Número do CT-e |
| Transportadora | Tomador do serviço |
| Origem | Remetente |
| Cliente | Destinatário |
| Localidade | Município do destinatário |
| UF | Estado do destinatário |
| Placas_Veiculo | Placa(s) do veículo (Modal Rodoviário) |
| Condicao | Sempre `Venda` |
| Nota_Fiscal | Série/Nº do documento |
| Valor_NF | Valor total da carga |
| Valor_Frete | Valor do frete (componente) |
| Valor_Seguro | Calculado: `Valor_NF × 0,0005` |
| Pedagio | Manual (editável, padrão 0) |
| Frete_Total | Total da prestação do serviço |
| Frete_c_ICMS | Valor total da prestação do serviço |
| Cobranca_CTE | Valor a receber |

## Como rodar

### Pré-requisitos

- [Node.js](https://nodejs.org/) 18 ou superior

### Instalação

```bash
git clone https://github.com/gustavorochaC/carolprojeto
cd carolprojeto/ct-e-to-excel
npm install
npm run dev
```

A aplicação ficará disponível em `http://localhost:8080`.

### Build de produção

```bash
npm run build
```

O build é gerado na pasta `docs/`.

## Tecnologias

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [PDF.js](https://mozilla.github.io/pdf.js/) — extração nativa de texto
- [Tesseract.js](https://tesseract.projectnaptha.com/) — OCR de fallback
- [SheetJS (xlsx)](https://sheetjs.com/) — geração de Excel
- IndexedDB — persistência local dos dados
