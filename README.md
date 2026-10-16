# ITM Capta

Painel inicial de inteligência de editais e captação de recursos para o Instituto Taquara Mais.

## O que já está incluído

- Painel com métricas e lista de oportunidades.
- Catálogo de fontes cadastradas no Supabase.
- Busca e filtro por status.
- Formulário para registrar oportunidades manualmente.
- Ligação com as tabelas `opportunities` e `funding_sources`.
- Configuração preparada para publicação em Cloudflare Pages.
- Sem credenciais privadas embutidas no código.

## O que ainda não está implementado

- Coleta automática de editais.
- Validação automática de regulamentos.
- Alertas por e-mail ou WhatsApp.
- Login e papéis de usuário no frontend.
- Testes de segurança e revisão das políticas RLS para uma equipe real.

Não trate o painel como sistema pronto para dados confidenciais até concluir essas etapas. O status “aberto confirmado” deve ser usado somente após verificação da fonte oficial.

## 1. Configurar localmente

Instale Node.js LTS. Na pasta do projeto:

```bash
npm install
cp .env.example .env.local
```

No Windows PowerShell, use:

```powershell
Copy-Item .env.example .env.local
```

No Supabase, abra o projeto `itm-capta` e copie a **chave pública anon/publishable** em Project Settings / API Keys. Coloque-a em `VITE_SUPABASE_ANON_KEY` no `.env.local`. Nunca use `service_role`, `secret key`, senha do banco ou token pessoal no frontend.

Depois:

```bash
npm run dev
```

## 2. Criar repositório no GitHub

1. Entre em https://github.com/new
2. Nome do repositório: `itm-capta`
3. Recomenda-se **Private** enquanto o projeto estiver em construção.
4. Não adicione segredos ao repositório. O `.gitignore` já exclui `.env`.
5. Envie os arquivos desta pasta para o repositório.

Se estiver usando Git instalado:

```bash
git init
git add .
git commit -m "feat: primeira versão do ITM Capta"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/itm-capta.git
git push -u origin main
```

## 3. Publicar em Cloudflare Pages

1. Acesse https://dash.cloudflare.com/
2. Vá para Workers & Pages e crie uma aplicação Pages conectada ao Git.
3. Escolha o repositório `itm-capta`.
4. Framework preset: `Vite`.
5. Build command: `npm run build`.
6. Build output directory: `dist`.
7. Em Settings / Environment variables, configure:
   - `VITE_SUPABASE_URL` = `https://skdsulzqkghptucchjsk.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = sua chave pública anon/publishable
8. Faça o deploy e teste o endereço gerado.

As variáveis `VITE_*` ficam acessíveis no navegador. Use somente a chave pública, com políticas RLS seguras. Nunca exponha chaves secretas.

## 4. Checklist antes de compartilhar com a equipe

- [ ] Revisar e restringir políticas RLS para usuários autorizados.
- [ ] Implementar Supabase Auth e proteger operações de escrita.
- [ ] Confirmar que nenhuma chave secreta foi enviada ao Git.
- [ ] Testar criação, leitura, erros e permissões com contas diferentes.
- [ ] Configurar domínio próprio se necessário.
- [ ] Implementar coleta e alertas em backend seguro, com limite de frequência e logs.
- [ ] Confirmar custos, limites e termos dos serviços escolhidos.

## Arquitetura

- Frontend: React + Vite.
- Banco: Supabase Postgres já criado para o ITM Capta.
- Hospedagem sugerida: Cloudflare Pages.
- Automação futura: Supabase Edge Functions + agendamento autorizado, com logs e verificação oficial.
