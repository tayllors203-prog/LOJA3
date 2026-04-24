(function () {
  var waPhone = "";
  var waMsg = "Ola! Vim pelo site Moldes Rosanets e preciso de ajuda.";
  var chatHistory = [];
  var currentTopic = "";

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function appendMsg(role, text, extraClass) {
    var wrap = document.getElementById("assist-molde-scroll");
    if (!wrap) return;
    var div = el("div", "assist-molde-msg assist-molde-msg--" + role + (extraClass ? " " + extraClass : ""));
    div.textContent = text;
    wrap.appendChild(div);
    wrap.scrollTop = wrap.scrollHeight;
  }

  function waHref() {
    if (!waPhone || waPhone.length < 10) return "#";
    var q = encodeURIComponent(waMsg);
    return "https://wa.me/" + waPhone + "?text=" + q;
  }

  function setWaLink(a) {
    if (!a) return;
    if (waPhone && waPhone.length >= 10) {
      a.href = waHref();
      a.classList.remove("is-disabled");
      a.removeAttribute("aria-disabled");
    } else {
      a.href = "#";
      a.classList.add("is-disabled");
      a.setAttribute("aria-disabled", "true");
      a.title = "Configure WHATSAPP_PHONE no arquivo .env (apenas numeros, ex.: 5511999998888)";
    }
  }

  function loadConfig() {
    return fetch("/api/chat-config")
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        waPhone = (data.whatsappPhone || "").replace(/\D/g, "");
        if (data.whatsappMessage) waMsg = String(data.whatsappMessage);
        var a = document.getElementById("assist-molde-wa");
        setWaLink(a);
      })
      .catch(function () {
        var a = document.getElementById("assist-molde-wa");
        setWaLink(a);
      });
  }

  function showCompose() {
    var menu = document.getElementById("assist-molde-menu");
    var comp = document.getElementById("assist-molde-compose");
    if (menu) menu.classList.add("is-hidden");
    if (comp) comp.classList.add("is-visible");
  }

  function sendToApi(userText) {
    var sendBtn = document.getElementById("assist-molde-send");
    var ta = document.getElementById("assist-molde-input");
    if (sendBtn) sendBtn.disabled = true;
    appendMsg("user", userText);

    var payload = {
      text: currentTopic ? "[Topico: " + currentTopic + "]\n\n" + userText : userText,
      history: chatHistory,
    };

    return fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (r) {
        return r.json().then(function (data) {
          return { ok: r.ok, data: data };
        });
      })
      .then(function (res) {
        if (!res.ok || !res.data.reply) {
          var err = (res.data && res.data.error) || "Nao foi possivel responder agora.";
          appendMsg("bot", err, "assist-molde-msg--err");
          appendMsg(
            "bot",
            "Se preferir, fale com a gente no WhatsApp — use o botao verde abaixo.",
            ""
          );
          return;
        }
        chatHistory.push({ role: "user", content: userText });
        chatHistory.push({ role: "assistant", content: res.data.reply });
        if (chatHistory.length > 14) {
          chatHistory = chatHistory.slice(-14);
        }
        appendMsg("bot", res.data.reply, "");
      })
      .catch(function () {
        appendMsg("bot", "Erro de conexao. Verifique se o servidor esta rodando (npm start) ou tente o WhatsApp.", "assist-molde-msg--err");
      })
      .then(function () {
        if (sendBtn) sendBtn.disabled = false;
        if (ta) {
          ta.value = "";
          ta.focus();
        }
      });
  }

  function branchIntro(topicId, userLines) {
    currentTopic = topicId;
    appendMsg("bot", userLines, "");
    showCompose();
  }

  function buildUI() {
    if (document.getElementById("assist-molde-root")) return;

    var root = el("div", "", "");
    root.id = "assist-molde-root";

    var fab = el("button", "assist-molde-fab", "&#128172;");
    fab.type = "button";
    fab.setAttribute("aria-label", "Abrir assistente de molde");
    fab.id = "assist-molde-fab";

    var panel = el("div", "assist-molde-panel", "");
    panel.id = "assist-molde-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Assistente de molde");

    var head = el("div", "assist-molde-head", "");
    head.appendChild(el("h2", "", "Assistente de molde"));
    var closeBtn = el("button", "assist-molde-close", "&times;");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Fechar chat");
    head.appendChild(closeBtn);

    var scroll = el("div", "assist-molde-scroll", "");
    scroll.id = "assist-molde-scroll";

    var menu = el("div", "assist-molde-menu", "");
    menu.id = "assist-molde-menu";

    var b1 = el("button", "assist-molde-opt", "Compra, pagamento e arquivos (A4 / plotter)");
    b1.type = "button";
    b1.setAttribute("data-branch", "compra");
    var b2 = el("button", "assist-molde-opt", "Tamanhos, tecidos e modelagem");
    b2.type = "button";
    b2.setAttribute("data-branch", "tamanhos");
    var b3 = el("button", "assist-molde-opt", "Outra duvida — assistente virtual");
    b3.type = "button";
    b3.setAttribute("data-branch", "outro");
    var b4 = el("button", "assist-molde-opt", "Ir direto ao WhatsApp");
    b4.type = "button";
    b4.setAttribute("data-branch", "wa");

    menu.appendChild(b1);
    menu.appendChild(b2);
    menu.appendChild(b3);
    menu.appendChild(b4);

    var compose = el("div", "assist-molde-compose", "");
    compose.id = "assist-molde-compose";
    var ta = el("textarea", "", "");
    ta.id = "assist-molde-input";
    ta.setAttribute("aria-label", "Sua mensagem para o assistente virtual");
    ta.placeholder = "Escreva sua duvida e envie para o assistente virtual...";
    var row = el("div", "assist-molde-row", "");
    var send = el("button", "assist-molde-send", "Enviar");
    send.type = "button";
    send.id = "assist-molde-send";
    row.appendChild(send);
    compose.appendChild(ta);
    compose.appendChild(row);

    var foot = el("div", "assist-molde-foot", "");
    var wa = el("a", "assist-molde-wa", "WhatsApp — nao resolveu?");
    wa.id = "assist-molde-wa";
    wa.target = "_blank";
    wa.rel = "noopener noreferrer";
    wa.href = "#";
    var hint = el(
      "p",
      "assist-molde-hint",
      "MoldesRosanets."
    );
    foot.appendChild(wa);
    foot.appendChild(hint);

    panel.appendChild(head);
    panel.appendChild(scroll);
    panel.appendChild(menu);
    panel.appendChild(compose);
    panel.appendChild(foot);

    root.appendChild(fab);
    root.appendChild(panel);
    document.body.appendChild(root);

    function openPanel() {
      panel.classList.add("is-open");
      fab.setAttribute("aria-expanded", "true");
      loadConfig();
    }

    function closePanel() {
      panel.classList.remove("is-open");
      fab.setAttribute("aria-expanded", "false");
    }

    function resetChat() {
      scroll.innerHTML = "";
      chatHistory = [];
      currentTopic = "";
      menu.classList.remove("is-hidden");
      compose.classList.remove("is-visible");
      appendMsg(
        "bot",
        "Ola! Sou o assistente virtual de moldes. Escolha um assunto abaixo ou va direto ao WhatsApp se preferir falar com uma pessoa.",
        ""
      );
    }

    fab.addEventListener("click", function () {
      if (panel.classList.contains("is-open")) {
        closePanel();
      } else {
        resetChat();
        openPanel();
      }
    });

    closeBtn.addEventListener("click", closePanel);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && panel.classList.contains("is-open")) closePanel();
    });

    menu.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-branch]");
      if (!btn) return;
      var br = btn.getAttribute("data-branch");
      if (br === "wa") {
        if (waPhone && waPhone.length >= 10) {
          window.open(waHref(), "_blank", "noopener,noreferrer");
        }
        return;
      }
      if (br === "compra") {
        branchIntro(
          "Compra, pagamento e arquivos",
          "As compras dos moldes digitais costumam ser feitas pelos links da Hotmart nos botoes Comprar. Apos a compra, voce recebe o acesso ao arquivo conforme a plataforma. Formatos (A4, plotter/tamanho real) dependem de cada produto — veja tambem o botao Detalhes no card. Escreva abaixo o que voce precisa (ex.: nao achei o PDF, duvida sobre impressora) e o assistente virtual complementa."
        );
      } else if (br === "tamanhos") {
        branchIntro(
          "Tamanhos, tecidos e modelagem",
          "Tamanhos, sugestoes de tecido e o que vem no arquivo variam por molde. No site, abra o botao Detalhes no produto para ler o resumo. Se quiser, descreva sua duvida abaixo (ex.: qual tamanho do corset, malha ou plano) e o assistente virtual ajuda com o que for possivel."
        );
      } else if (br === "outro") {
        branchIntro(
          "Outra duvida",
          "Pode escrever sua duvida abaixo. Se o assistente virtual nao tiver certeza, vamos sugerir falar no WhatsApp."
        );
      }
    });

    send.addEventListener("click", function () {
      var v = (ta.value || "").trim();
      if (!v) return;
      sendToApi(v);
    });

    ta.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send.click();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildUI);
  } else {
    buildUI();
  }
})();
