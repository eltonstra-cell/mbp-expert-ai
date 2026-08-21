# MBP Expert AI v2.0

Fundação da versão profissional do sistema.

## Nesta versão
- novo dashboard
- cadastro de empresas
- consulta de CNPJ
- empresa ativa
- persistência local organizada
- estrutura pronta para banco online e autenticação

## Próxima etapa
- banco de dados online
- login
- checklist modular
- fotos e áudio
- não conformidades completas
- plano de ação
- relatórios PDF
- IA técnica

## v2.37 — Correções de isolamento e rastreabilidade
- Visitas filtradas pela empresa ativa, com proteção contra navegação para visita de outra empresa.
- Checklist diferencia NC ativa, em tratamento e resolvida sem apagar o achado original.
- NC reaberta exige nova evidência registrada após a reabertura antes de nova conclusão.
- Conclusão após prazo vencido fica explicitamente registrada no histórico, preservando prazo original e data/hora da conclusão.


## v2.38 — Relatório profissional e cadastros editáveis

- Responsável pela visita passa a ser obrigatório na criação da inspeção.
- Campo opcional de identificação profissional do consultor, exibido no relatório/PDF.
- Conclusão técnica separada das observações iniciais, com sugestão automática baseada nos resultados da inspeção.
- Inspeções concluídas sem conclusão manual recebem sugestão técnica automática no fechamento.
- Cadastro de empresas pode ser editado após a criação, inclusive o responsável pelo estabelecimento usado na assinatura do relatório.
- Relatório preserva observações iniciais e usa a conclusão técnica específica para o fechamento.


## v2.39 — Sincronização robusta no encerramento

- Evita corrida entre gravação imediata, autosave e consulta periódica ao finalizar/reabrir inspeções.
- Faz até 3 tentativas antes de considerar uma falha real de sincronização.
- Após falha de resposta, consulta a nuvem para confirmar se o servidor já recebeu a alteração.
- Trata como sucesso conflitos em que a nuvem já contém exatamente o estado que acabou de ser salvo.
- O alerta de falha só aparece depois das tentativas e da verificação do estado remoto.
