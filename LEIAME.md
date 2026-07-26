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

O app continua salvando tudo (itens, receitas, plano de captação) no
armazenamento local do navegador (`localStorage`), dentro do próprio
aparelho — nada é enviado para o GitHub nem para nenhum servidor. Isso
também quer dizer que os dados **não sincronizam** entre dispositivos
diferentes, e se o app for desinstalado ou o cache do navegador for
limpo, os dados salvos se perdem. Use o botão **Exportar CSV** de vez
em quando como backup, se os dados forem importantes.

A base de itens e receitas que já vem pronta no arquivo `data.js` foi
mantida exatamente como estava — nenhum dado foi alterado.
