require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT) || 3333;

const MISTRAL_KEY = (process.env.MISTRAL_API_KEY || "").trim();

const SYSTEM_PROMPT = `Voce e o assistente virtual da loja Moldes Rosanets (moldes digitais, costura, impressao A4 e plotter).
Regras:
- Responda em portugues do Brasil, de forma curta e clara (ate uns 4 paragrafos curtos).
- Ajude sobre moldes, tamanhos em geral, formatos de arquivo, impressao, e orientacao para usar o site (catalogo, botao Detalhes, compra pela Hotmart).
- Nao invente precos, prazos legais ou politicas: se nao tiver certeza, diga que o ideal e confirmar no WhatsApp da loja.
- Nunca diga que o usuario ja comprou algo ou que voce acessa pedidos: voce nao tem acesso a dados de compra.
- Se a pergunta for fora do escopo da loja ou voce nao souber responder com seguranca, termine sugerindo contato pelo WhatsApp da loja.`;

app.use(express.json({ limit: "48kb" }));
app.use(express.static(path.join(__dirname)));

app.get("/api/chat-config", function (req, res) {
  res.json({
    whatsappPhone: (process.env.WHATSAPP_PHONE || "").replace(/\D/g, ""),
    whatsappMessage: process.env.WHATSAPP_MESSAGE || "Ola! Vim pelo site Moldes Rosanets e preciso de ajuda.",
  });
});

app.post("/api/chat", async function (req, res) {
  if (!MISTRAL_KEY) {
    return res.status(500).json({ error: "Chave da API ausente. Defina MISTRAL_API_KEY no arquivo .env" });
  }

  var text = typeof req.body.text === "string" ? req.body.text.trim() : "";
  var history = Array.isArray(req.body.history) ? req.body.history : [];

  if (!text || text.length > 4000) {
    return res.status(400).json({ error: "Mensagem invalida ou muito longa" });
  }

  var messages = [{ role: "system", content: SYSTEM_PROMPT }];
  var i;
  for (i = 0; i < history.length && i < 16; i++) {
    var m = history[i];
    if (!m || (m.role !== "user" && m.role !== "assistant")) continue;
    var c = typeof m.content === "string" ? m.content.slice(0, 8000) : "";
    if (!c) continue;
    messages.push({ role: m.role, content: c });
  }
  messages.push({ role: "user", content: text });

  try {
    var r = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + MISTRAL_KEY,
      },
      body: JSON.stringify({
        model: process.env.MISTRAL_MODEL || "mistral-small-latest",
        messages: messages,
        temperature: 0.35,
        max_tokens: 700,
      }),
    });

    var raw = await r.text();
    if (!r.ok) {
      console.error("Mistral HTTP", r.status, raw.slice(0, 500));
      return res.status(502).json({
        error: "Nao foi possivel obter resposta do assistente virtual agora. Tente de novo ou use o WhatsApp.",
      });
    }

    var data = JSON.parse(raw);
    var reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    reply = typeof reply === "string" ? reply.trim() : "";
    if (!reply) {
      return res.status(502).json({ error: "Resposta vazia do assistente virtual. Use o WhatsApp se precisar." });
    }
    res.json({ reply: reply });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao contactar o assistente virtual. Use o WhatsApp." });
  }
});

app.listen(PORT, function () {
  console.log("Moldes Rosanets — servidor em http://localhost:" + PORT);
  console.log("Abra index.html ou catalogo.html por esse endereco para o chat funcionar.");
});
