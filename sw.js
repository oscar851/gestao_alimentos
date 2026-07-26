// Service Worker do Gestão de Capitação
// Estratégia: cache-first para os arquivos do app, com atualização em segundo plano.
// Suba a versão do cache sempre que publicar uma nova versão dos arquivos no GitHub.
const CACHE_VERSION = "gestao-capitacao-v2";

const ARQUIVOS_LOCAIS = [
  "./",
  "./index.html",
  "./app.js",
  "./data.js",
  "./styles.css",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-192-maskable.png",
  "./icons/icon-512-maskable.png",
];

const ARQUIVOS_EXTERNOS = [
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      await cache.addAll(ARQUIVOS_LOCAIS);
      // Recursos externos são melhor-esforço: se estiver offline na
      // primeira instalação, entram no cache na próxima vez que houver rede.
      await Promise.all(
        ARQUIVOS_EXTERNOS.map((url) =>
          fetch(url, { mode: "no-cors" })
            .then((resp) => cache.put(url, resp))
            .catch(() => {}),
        ),
      );
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(
          chaves
            .filter((chave) => chave !== CACHE_VERSION)
            .map((chave) => caches.delete(chave)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((resposta) => {
          if (resposta && resposta.status === 200) {
            const copia = resposta.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copia));
          }
          return resposta;
        })
        .catch(() => cached);

      // Retorna o cache imediatamente se existir (rápido e funciona offline),
      // e atualiza o cache por trás dos panos para a próxima visita.
      return cached || fetchPromise;
    }),
  );
});
