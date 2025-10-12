# youtube-trend-analysis
Análise automatizada de tendências do YouTube usando n8n e GPT-4.1 Mini

Requisitos atendidos
 Workflow principal no n8n
 Integração via API (YouTube)
 Uso de LLM para análise (GPT-4.1-mini)
Estrutura do Workflow
Node GET VIDEO YT → busca vídeos do YouTube.
Node GET CHANNEL YT → busca informações dos canais.
Node Aggregate LLM Input → calcula métricas, scores e organiza os dados.
Node GPT 4.1 MINI → gera 15 ideias de conteúdo.
Node Parse LLM Output → transforma a saída em JSON estruturado.
Node Final JSON Output → agrega dados para enviar ao Google Sheets.
Node Prepare Sheet → transforma JSON final em linhas para a planilha.
Node Save to Google Sheets → salva os resultados no Sheets.
Diagrama do Workflow
Diagrama Mermaid

Fontes de dados utilizadas
YouTube API (Vídeos e Canais): fornece métricas de engajamento, views, likes, comentários, datas de publicação e número de inscritos.
Por quê: necessário para calcular scores e identificar oportunidades de conteúdo.
Prompts utilizados
Veja o arquivo prompts.md

Scripts auxiliares
Veja o arquivo scripts.md

Entregáveis
Planilha com os resultados.
Vídeo Loom mostrando funcionamento (5-10 min).
Instruções para rodar
Clone o repositório.
Importe o workflow no n8n.
Configure as credenciais do YouTube API e OpenAI.
Execute o workflow.
Confira os resultados na aba "Analise" do Google Sheets.
