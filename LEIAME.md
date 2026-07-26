# Gestão de Capitação — publicando no GitHub e usando no Android

## 1. Subir para o GitHub

1. Crie um repositório novo no GitHub (pode ser público)
2. Envie todos os arquivos desta pasta para a raiz do repositório:
   `index.html`, `app.js`, `data.js`, `styles.css`, `manifest.json`,
   `sw.js` e a pasta `icons/` inteira
3. No repositório, vá em **Settings → Pages**
4. Em "Branch", selecione `main` (ou `master`) e a pasta `/ (root)`,
   depois clique em **Save**
5. Aguarde 1-2 minutos. O GitHub mostra o link do site, algo como:
   `https://seu-usuario.github.io/nome-do-repositorio/`

Esse link já é `https://`, então o Service Worker (`sw.js`) funciona
normalmente — o app passa a carregar offline depois da primeira
visita e fica instalável no celular.

## 2. Instalar no Android

Com o site publicado no GitHub Pages, abra o link no **Chrome do
Android**:

- Toque no menu (⋮) → **"Adicionar à tela inicial"** (ou vai aparecer
  um aviso automático "Instalar app")
- Isso cria um ícone (o prato com faca e garfo) na tela inicial que
  abre o app em tela cheia, sem a barra do navegador, e funciona
  offline depois da primeira abertura

## 3. Se quiser um `.apk` de verdade (opcional)

Com o site já publicado no GitHub Pages, você pode gerar um `.apk`
assinado sem escrever código, usando o **PWABuilder**:

1. Acesse **https://www.pwabuilder.com**
2. Cole o link do seu GitHub Pages e clique em "Start"
3. Clique em **"Package for Stores"** → **Android**
4. Baixe o pacote (vem com o `.apk`/`.aab` pronto)
5. Envie o `.apk` para o celular e instale (ative "Instalar de fontes
   desconhecidas" quando pedir)

## Sobre os dados

O app salva tudo (itens, receitas, plano de captação, histórico) no
armazenamento local do navegador (`localStorage`), dentro do próprio
aparelho — por padrão nada é enviado para o GitHub nem para nenhum
servidor. Isso quer dizer que, sem configurar a sincronização abaixo,
os dados **não aparecem automaticamente** em outros dispositivos, e se
o app for desinstalado ou o cache do navegador for limpo, os dados
salvos se perdem. Use o botão **Exportar CSV** de vez em quando como
backup extra, se os dados forem importantes.

A base de itens e receitas que já vem pronta no arquivo `data.js` foi
mantida exatamente como estava — nenhum dado foi alterado.

## 4. Sincronização via Google Sheets (dados iguais em qualquer aparelho)

O app agora tem uma aba **"Sincronização"** no menu lateral. Ela
permite enviar os dados deste dispositivo para uma planilha do Google
(backup) e baixar esses dados em qualquer outro dispositivo
(restaurar). É grátis e não exige nenhum servidor próprio: a própria
planilha guarda os dados.

### 4.1 Criar o "servidor" na planilha (fazer uma única vez)

1. Acesse **https://sheets.google.com** e crie uma planilha nova
   (ex: "Gestão de Capitação - Dados").
2. No menu da planilha, vá em **Extensões → Apps Script**.
3. Apague o conteúdo do editor e cole todo o conteúdo do arquivo
   `CodigoGoogleSheets.gs` (incluso nesta pasta).
4. Nesse código, troque o valor de `TOKEN_SECRETO` por uma senha só
   sua (qualquer texto sem espaços, ex: `capitacao2026xy`). Essa senha
   evita que outra pessoa que descubra o link consiga ler ou apagar
   seus dados.
5. Clique em **Implantar → Nova implantação**:
   - Tipo: **App da Web**
   - Executar como: **Eu** (sua conta)
   - Quem pode acessar: **Qualquer pessoa**
   - Clique em **Implantar** e autorize as permissões pedidas pelo
     Google (é o próprio script pedindo acesso à sua planilha).
6. Copie o **link do app da Web** (termina em `/exec`). É esse link
   que você vai colar dentro do app, no passo seguinte.

Sempre que editar o script depois, é preciso criar uma **nova
implantação** (ou gerenciar implantações → editar → nova versão) para
as mudanças valerem no link.

### 4.2 Configurar cada dispositivo

Em cada aparelho onde você usa o app (celular, tablet, computador):

1. Abra o app e vá na aba **Sincronização**.
2. Cole o link `/exec` do passo anterior em "Link do Google Apps
   Script".
3. Digite a mesma senha (`TOKEN_SECRETO`) definida no script.
4. Opcionalmente, dê um nome a este dispositivo (ex: "Celular da
   cozinha") — isso ajuda a saber de onde veio o último backup.
5. Clique em **Salvar configuração**.

Essa configuração fica salva no `localStorage` daquele aparelho, então
só é preciso fazer isso uma vez por dispositivo.

### 4.3 Usar no dia a dia

- **Enviar para a nuvem**: pega os dados deste aparelho e substitui o
  que está salvo na planilha.
- **Baixar da nuvem**: pega o que está salvo na planilha e substitui
  os dados deste aparelho.
- O envio/download **substitui** os dados por completo — não faz
  mescla automática de alterações feitas em dois aparelhos ao mesmo
  tempo. Para não perder trabalho, combine uma rotina simples: sempre
  **baixar** antes de começar a editar em um aparelho, e sempre
  **enviar** depois de terminar as alterações.
- A aba "Sincronização" mostra a data/hora do último backup e de qual
  dispositivo ele veio, para ajudar a saber se vale a pena baixar
  antes de editar.
- Como reforço, a planilha também guarda um histórico de backups
  anteriores (colunas mais à direita da aba "dados"), então dá para
  recuperar uma versão anterior manualmente lá dentro se algo for
  substituído por engano.
