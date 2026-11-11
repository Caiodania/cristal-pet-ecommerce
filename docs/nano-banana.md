# Prévias com Nano Banana: quadros e esculturas

O adaptador `server/providers/nano-banana.ts` atende os dois produtos. Ele chama o Gemini apenas no servidor, guarda o resultado no Storage privado existente e devolve ao navegador um link temporário. `IMAGE_PROVIDER=mock` continua disponível e identifica as imagens como demonstração.

## Ativar na Netlify

1. Aplique **somente a nova migration** `supabase/migrations/0004_quadros.sql` ao Supabase existente, depois das três anteriores. Ela adiciona os campos dos quadros e a reserva atômica de geração; não apague nem recrie o banco. Publique o código desta versão depois da migration.
2. Cadastre nas variáveis de ambiente da **função** da Netlify:

   | Variável | Valor |
   |---|---|
   | `IMAGE_PROVIDER` | `nano-banana` |
   | `GEMINI_API_KEY` | Chave do projeto Gemini com faturamento e acesso ao modelo |
   | `GEMINI_IMAGE_MODEL` | `gemini-3.1-flash-image` (padrão, configurável) |
   | `GEMINI_TIMEOUT_MS` | `45000` (padrão; permitido de 1000 a 50000) |
   | `GEMINI_ESTIMATED_COST_CENTS` | Reserva conservadora, positiva, em centavos de **real** por tentativa |
   | `PREVIEW_DAILY_BUDGET_CENTS` | Teto positivo para as reservas de custo na janela de 24 horas |
   | `MODEL_PROVIDER` | `mock`, até integrar e validar um provedor 3D real |
   | `MODEL_AUTO` | `never`, até validar a produção de esculturas |

   Mantenha as configurações Supabase, autenticação, administrador e domínio já utilizadas. Nunca prefixe a chave Gemini com `NEXT_PUBLIC_`. Não coloque a chave no Git ou em conteúdo de páginas.
3. Defina a estimativa por tentativa após conferir a [tabela de preços do Google](https://ai.google.dev/gemini-api/docs/pricing), considerando texto, imagens de entrada, imagem de saída, câmbio e margem. O número é um controle interno conservador, **não a cobrança exata do Google**. A integração se recusa a iniciar sem estimativa e teto positivos. Configure também o orçamento/alertas do projeto Google.
4. Faça um novo deploy na Netlify para carregar as variáveis. Com uma conta de teste da loja, gere uma prévia de cada produto, confira o resultado e envie um pedido misto. No painel, valide foto, arte, escolhas e endereço; somente a escultura deve oferecer geração 3D. Esse teste real usa a API paga e não foi executado no desenvolvimento.

## Fluxo e recuperação

O serviço marca a prévia como `generating` e reserva o custo **antes** de enviar ao Google. A operação no banco serializa a reserva de orçamento e impede duas gerações concorrentes para a mesma prévia. Conta, cota por rede e cota compartilhada entre os produtos continuam valendo.

O endpoint `generateContent` é síncrono. O adaptador devolve `submit.result` com os bytes, e o serviço persiste a imagem antes de responder. Não há fila em memória, base64 em `jobId` ou trabalho disparado depois que a função respondeu. A imagem gerada não passa pelo payload da resposta HTTP para o cliente.

A chamada Google tem prazo de 45 segundos, deixando margem para Supabase dentro do [limite de 60 segundos das funções síncronas Netlify](https://docs.netlify.com/build/functions/configuration/). Se o modelo frequentemente ultrapassar esse prazo, a evolução é um worker/fila persistente; aumentar a espera do navegador não aumenta o limite da função. Não há repetição automática de chamadas pagas. Um timeout ou falha incerta mantém a reserva, pois o Google pode ter processado a requisição. Falhas têm mensagem segura e permitem nova tentativa explícita; foto recusada pede outra foto.

## Arte e produção dos quadros

- Esculturas usam pose, cor, nome e a referência de estilo da Mel existente.
- Quadros usam estilo, nome e proporção do tamanho escolhido. Nunca recebem a referência de escultura. A arte gerada é frontal e sem moldura desenhada; a moldura escolhida é um acabamento físico do parceiro.
- A prévia é gerada em 1K. **Não é automaticamente um arquivo final para impressão**. Antes de encaminhar ao parceiro, confira semelhança, grafia, recorte, resolução, sangria, cores e a aprovação do cliente. O painel permite baixar foto e prévia; os estados do pedido continuam manuais.
- Nenhum pedido é enviado automaticamente a um fornecedor. Registre fornecedor, revisão, encaminhamento e prazo nas anotações internas do pedido.
- Tamanhos/acabamentos iniciais e preços em `content/quadros.ts` precisam de confirmação comercial. Preços indefinidos permanecem “A combinar”.

## Contrato e testes

Foi implementado o REST `v1/models/{modelo}:generateContent`, com `x-goog-api-key`, imagens inline e `generationConfig.responseFormat.image`, conforme o [guia oficial de geração de imagens com generateContent](https://ai.google.dev/gemini-api/docs/generate-content/image-generation). O modelo padrão é configurável para acompanhar disponibilidade no projeto Google. A integração não depende de uma SDK nem de acesso direto do navegador ao Google.

Os testes em `server/__tests__/nano-banana.test.ts` usam HTTP simulado e cobrem configuração, payload, imagens, recusas, limite de resposta, timeout, segurança das mensagens e persistência independente de memória no mock. As validações de pedidos/cota/banco ficam nos testes de quadros e migrations. Nenhuma chave real é necessária para executar `npm test` e `npm run test:sql`.
