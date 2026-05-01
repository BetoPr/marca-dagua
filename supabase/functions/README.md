# Supabase Edge Functions — Asaas

Funcoes serverless usadas pra integrar com a Asaas (gateway de pagamento BR).
Todas precisam de variaveis de ambiente configuradas no Supabase Dashboard
(Settings > Edge Functions > Secrets).

## Variaveis necessarias

```
ASAAS_API_KEY=<chave da API — sandbox: $aact_...>
ASAAS_API_URL=https://sandbox.asaas.com/api/v3   # ou https://api.asaas.com/v3 em prod
ASAAS_WEBHOOK_TOKEN=<token aleatorio gerado por voce, casa com header>
SUPABASE_URL=https://htaihtmpnwzyxamkhnty.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key — Settings > API>
```

> ⚠️ **NUNCA** commit a `ASAAS_API_KEY` ou `SERVICE_ROLE_KEY` no git.

## Funcoes

### 1. `asaas-create-subscription`
Chamada pelo frontend (logged user) ao clicar em "Assinar Pro".

- Cria/recupera customer no Asaas (`POST /v3/customers`)
- Cria assinatura (`POST /v3/subscriptions`) com `billingType: UNDEFINED`,
  cycle MONTHLY, value 19.90, externalReference = user.id
- Salva `asaas_customer_id` e `asaas_subscription_id` em `profiles`
- Cria registro em `subscriptions` com status `pending`
- Retorna `invoiceUrl` da primeira cobranca pra o frontend redirecionar

Body esperado:
```json
{ "cpf": "12345678900", "phone": "11999999999" }
```

### 2. `asaas-webhook`
Endpoint publico que recebe POSTs do Asaas a cada evento de cobranca.

- Valida header `asaas-access-token` contra `ASAAS_WEBHOOK_TOKEN`
- Faz upsert em `payment_events` (idempotencia via event.id)
- Processa eventos:
  - `PAYMENT_RECEIVED` / `PAYMENT_CONFIRMED` em assinatura: `users.plan = 'pro'`,
    `pro_until = nextDueDate + 3 dias`
  - `PAYMENT_OVERDUE`: `subscriptions.status = 'overdue'` (mantem pro_until)
  - `SUBSCRIPTION_INACTIVATED` / `SUBSCRIPTION_DELETED`: rebaixa pra free
- Sempre retorna 200 rapido (Asaas exige < 5s)

URL apos deploy: `https://htaihtmpnwzyxamkhnty.supabase.co/functions/v1/asaas-webhook`
Cadastrar essa URL no painel Asaas (Configuracoes > Webhooks).

### 3. `asaas-cancel-subscription`
Chamada pelo frontend (logged user) em `/assinatura.html`.

- Valida que a assinatura pertence ao user (RLS via JWT)
- Chama `DELETE /v3/subscriptions/{id}` no Asaas
- Atualiza `subscriptions.status = 'canceled'`
- Mantem `users.plan = 'pro'` ate `pro_until` (cliente continua Pro ate o fim do ciclo)

## Deploy

Como o site nao usa Supabase CLI local, deploy via MCP:

```
mcp__claude_ai_Supabase__deploy_edge_function
  project_id: htaihtmpnwzyxamkhnty
  name: asaas-create-subscription
  files: [{ name: 'index.ts', content: ... }]
```

## Testes locais

Pra desenvolver/testar local antes de deploy, use Supabase CLI:
```
supabase functions serve asaas-webhook --env-file ./supabase/.env.local
```

E mock Asaas com `curl`:
```
curl -X POST localhost:54321/functions/v1/asaas-webhook \
  -H "asaas-access-token: $TOKEN" \
  -d '{"event":"PAYMENT_RECEIVED","payment":{...}}'
```
