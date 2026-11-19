# model-router

Roteia cada turno para o modelo Claude mais barato que dá conta: tarefas simples (perguntas, renomear, formatar, resumir) vão para o Haiku, as médias para o Sonnet e as complexas (refatoração, arquitetura, debug difícil, vários arquivos, prompts longos) para o Opus. Primeiro uma heurística local, de graça; se o prompt for ambíguo, o Haiku classifica. O modelo escolhido vale para o turno inteiro, inclusive após chamadas de ferramenta. Subagentes não são alterados.
