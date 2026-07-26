/**
 * ============================================================
 * GESTÃO DE CAPITAÇÃO — SINCRONIZAÇÃO VIA GOOGLE SHEETS
 * ============================================================
 * Este script transforma uma Planilha Google num "servidor" simples
 * que guarda os dados do app (itens, receitas, plano, histórico) e
 * permite que qualquer dispositivo envie (backup) ou baixe (restaurar)
 * esses dados. Não precisa de nenhum servidor pago.
 *
 * COMO INSTALAR (passo a passo):
 * 1. Acesse https://sheets.google.com e crie uma planilha nova
 *    (pode chamar de "Gestão de Capitação - Dados", por exemplo).
 * 2. No menu da planilha, vá em Extensões → Apps Script.
 * 3. Apague todo o conteúdo do editor e cole TODO o conteúdo deste
 *    arquivo no lugar.
 * 4. Troque o valor de TOKEN_SECRETO abaixo por uma senha só sua
 *    (qualquer texto, sem espaços, ex: "capitacao2026xy").
 * 5. Clique em "Implantar" (Deploy) → "Nova implantação".
 *    - Tipo: "App da Web" (Web app)
 *    - Executar como: "Eu" (sua conta)
 *    - Quem pode acessar: "Qualquer pessoa" (Anyone)
 *    Clique em "Implantar" e autorize as permissões pedidas.
 * 6. Copie o "URL do app da Web" que aparece (termina em /exec).
 *    Esse é o link que você vai colar dentro do app, na aba
 *    "Sincronização".
 * 7. Toda vez que você editar este script, é preciso criar uma
 *    NOVA implantação (ou gerenciar implantações → editar → nova
 *    versão) para as mudanças valerem.
 *
 * Os dados ficam guardados na própria planilha (aba "dados"), então
 * você também pode abri-la a qualquer momento no navegador para ver
 * o JSON bruto salvo, caso precise conferir ou recuperar algo.
 * ============================================================
 */

// TROQUE por uma senha só sua antes de implantar.
// Ela evita que outra pessoa que descubra o link consiga ler/escrever
// os seus dados.
const TOKEN_SECRETO = "troque-esta-senha-123";

const NOME_ABA = "dados";

function doGet(e) {
  try {
    const token = e.parameter.token;
    if (token !== TOKEN_SECRETO) {
      return responder({ ok: false, erro: "Token inválido." });
    }

    const aba = obterAba();
    const conteudo = aba.getRange("A1").getValue();
    const atualizadoEm = aba.getRange("B1").getValue();
    const dispositivo = aba.getRange("C1").getValue();

    if (!conteudo) {
      return responder({ ok: true, dados: null, atualizadoEm: null, dispositivo: null });
    }

    return responder({
      ok: true,
      dados: JSON.parse(conteudo),
      atualizadoEm: atualizadoEm ? String(atualizadoEm) : null,
      dispositivo: dispositivo || null,
    });
  } catch (err) {
    return responder({ ok: false, erro: String(err) });
  }
}

function doPost(e) {
  try {
    const corpo = JSON.parse(e.postData.contents);
    if (corpo.token !== TOKEN_SECRETO) {
      return responder({ ok: false, erro: "Token inválido." });
    }

    const aba = obterAba();
    const agora = new Date().toISOString();

    aba.getRange("A1").setValue(JSON.stringify(corpo.dados));
    aba.getRange("B1").setValue(agora);
    aba.getRange("C1").setValue(corpo.dispositivo || "dispositivo desconhecido");

    // Guarda também uma cópia de segurança com carimbo de data/hora,
    // assim é possível recuperar uma versão anterior se algo der errado.
    aba.appendRow([agora, corpo.dispositivo || "desconhecido", JSON.stringify(corpo.dados)]);

    return responder({ ok: true, atualizadoEm: agora });
  } catch (err) {
    return responder({ ok: false, erro: String(err) });
  }
}

function obterAba() {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  let aba = planilha.getSheetByName(NOME_ABA);
  if (!aba) {
    aba = planilha.insertSheet(NOME_ABA);
    aba.getRange("A1:C1").setValues([["", "", ""]]);
    aba.getRange("E1:G1").setValues([["Histórico de backups (carimbo, dispositivo, dados)", "", ""]]);
  }
  return aba;
}

function responder(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}
