/**
 * Pagamento (plano PRO). Desligado até segundas ordens: tudo fica liberado e não aparecem selos "PRO"/"GRÁTIS"
 * nem o ecrã de assinatura. O código do PRO mantém-se; para o reativar, basta pôr `true` aqui (e marcar as
 * aulas pagas com "premium": true nos ficheiros de src/data/aulas).
 */
export const PAGAMENTO_ATIVO = false
