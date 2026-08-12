# Screenshot Capture List

Data de geração: 2026-08-12

## Finalidade

Este documento organiza as capturas de tela recomendadas para a futura versão em PDF da documentação técnica da plataforma.

## Capturas recomendadas

| Tela | Estado necessário | Resolução recomendada | Finalidade no documento | O que anonimizar |
| --- | --- | --- | --- | --- |
| Tela inicial | Usuário autenticado, período selecionado, sem erro | 1600x1000 | Mostrar contexto operacional, unidade, conectividade e ação de iniciar coleta | nomes pessoais, identificadores locais se existirem |
| Tela inicial com coleta em andamento | Coleta ativa, indicador de completude visível | 1600x1000 | Evidenciar continuidade da coleta e persistência local | nomes pessoais |
| Formulário de coleta | Etapa intermediária com campos preenchidos | 1600x1200 | Mostrar estrutura do instrumento e preenchimento por módulos | qualquer dado textual inserido manualmente |
| Formulário de revisão | Etapa de revisão antes do fechamento | 1600x1200 | Mostrar validação, completude e indicadores derivados | observações digitadas pelo usuário |
| Tela de registros | Lista com estados variados: rascunho, fechado, recebido | 1600x1000 | Demonstrar rastreabilidade local e ciclo de vida das coletas | datas sensíveis ou nomes de pessoas, se houver |
| Tela de sincronização | Itens pendentes selecionados | 1600x1000 | Mostrar fila persistente e operação manual de sincronização | IDs locais visíveis |
| Tela de sincronização após sucesso | Histórico recente com recebimento técnico | 1600x1000 | Ilustrar confirmação de envio | timestamps sensíveis, se necessário |
| Dashboard geral | Filtros ativos e três KPIs visíveis | 1600x1100 | Apresentar camada analítica atual | qualquer informação de contexto não pública |
| Dashboard responsivo | Mesma área em viewport móvel | 430x932 | Evidenciar comportamento responsivo | mesmos cuidados anteriores |
| Auditoria | Tela de auditoria aberta para perfil autorizado | 1600x1000 | Ilustrar trilha administrativa central | nome de usuário, timestamps e metadados sensíveis |
| Página de login | Tela limpa sem credenciais visíveis | 1440x900 | Introdução visual do fluxo | nunca mostrar senha ou hints sensíveis |

## Orientações de captura

1. Preferir dados demonstrativos já existentes no seed do ambiente.
2. Não incluir senha, cookie, token, chave, host interno, IP privado ou variáveis de ambiente.
3. Ocultar dados pessoais se houver nomes ou observações digitadas manualmente.
4. Para as capturas do dashboard, registrar tanto a visão desktop quanto a visão móvel.
5. Quando possível, manter a mesma unidade e período entre capturas relacionadas para consistência editorial.

## Placeholders do documento principal

As capturas acima correspondem principalmente aos seguintes placeholders já previstos no relatório técnico:

- Figura 6 — Dashboard geral
- Tela inicial
- Formulário de coleta
- Dashboard em dispositivo móvel
- Registros
- Sincronização
