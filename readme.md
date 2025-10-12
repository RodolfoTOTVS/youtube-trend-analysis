# Sistema de Pesquisa de Tendências para YouTube

## Descrição
Este workflow no **n8n** utiliza integração via API do YouTube e um agente LLM (GPT-4.1-mini) para gerar **15 ideias de conteúdo de alto potencial de viralização** para um nicho específico. Os resultados finais são salvos em uma **planilha Google Sheets**.

## Requisitos atendidos
- [x] Workflow principal no n8n
- [x] Integração via API (YouTube)
- [x] Uso de LLM para análise (GPT-4.1-mini)

## Estrutura do Workflow
1. Node **GET VIDEO YT** → busca vídeos do YouTube.
2. Node **GET CHANNEL YT** → busca informações dos canais.
3. Node **Aggregate LLM Input** → calcula métricas, scores e organiza os dados.
4. Node **GPT 4.1 MINI** → gera 15 ideias de conteúdo.
5. Node **Parse LLM Output** → transforma a saída em JSON estruturado.
6. Node **Final JSON Output** → agrega dados para enviar ao Google Sheets.
7. Node **Prepare Sheet** → transforma JSON final em linhas para a planilha.
8. Node **Save to Google Sheets** → salva os resultados no Sheets.

## Diagrama do Workflow
![Diagrama Mermaid](./diagram.mmd)

## Fontes de dados utilizadas
- **YouTube API (Vídeos e Canais)**: fornece métricas de engajamento, views, likes, comentários, datas de publicação e número de inscritos.  
  **Por quê:** necessário para calcular scores e identificar oportunidades de conteúdo.

## Prompts utilizados
Veja o arquivo [prompts.md](./prompts.md)

## Scripts auxiliares
Veja o arquivo [scripts.md](./scripts.md)

## Entregáveis
- Planilha com os resultados.
- Vídeo Loom mostrando funcionamento (5-10 min).

## Instruções para rodar
1. Clone o repositório.
2. Importe o workflow no n8n.
3. Configure as credenciais do YouTube API e OpenAI.
4. Execute o workflow.
5. Confira os resultados na aba "Analise" do Google Sheets.
