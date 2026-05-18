// ============================================
//  EDITE AQUI — Configurações da lanchonete
// ============================================
const OWNER_WHATSAPP_NUMBER = "5568992526571"; // DDI + DDD + número

const RESTAURANT = {
  name: "Burger do Chefe",
  hours: "Ter–Dom · 18h às 23h30",
};

const STORE_ADDRESS  = "Próximo ao Senac, Brasiléia - AC";
const STORE_MAPS_URL = "https://www.google.com/maps?q=Brasileia,AC";

const DELIVERY_FEES = { retirada: 0, Brasileia: 5, "Epitaciolândia": 7 };

const PRODUCTS = [
  { id: "hamburguer",          name: "Hambúrguer",          description: "Pão, alface, tomate, carne, queijo, calabresa e batata palha.",                   price: 13, image: "img/hambuger 1.jpeg", category: "burger", tag: "Top vendido"     },
  { id: "hamburguer-especial", name: "Hambúrguer Especial",  description: "Pão, alface, tomate, carne, queijo, presunto, calabresa, bacon e batata palha.",  price: 18, image: "img/hanburge 2.jpeg",  category: "burger"                           },
  { id: "hamburguer-duplo",    name: "Hambúrguer Duplo",     description: "Pão, alface, tomate, 2 carnes, 2 queijos, 2 presuntos, 2 bacons e batata palha.", price: 23, image: "img/hanburge 3.jpeg", category: "burger", tag: "Pra fome grande" },
  { id: "coca-2l",  name: "Coca-Cola 2L", description: "Refrigerante gelado 2 litros, ideal pra família.", price: 15, image: "img/coca lalaala.png", category: "drink" },
  { id: "monster",  name: "Monster",      description: "Energético gelado pra dar aquele gás.",          price: 26, image: "img/moster hhaahhaha.jpeg", category: "drink" },
];

const fmt = (n) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ============================================
//  Segurança — sanitiza HTML antes de inserir
// ============================================
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ============================================
//  Estado do pedido
// ============================================
const PAY_LABEL = { pix: "Pix", credito: "Cartão de crédito", debito: "Cartão de débito", dinheiro: "Dinheiro em mão" };

let state = {
  items: [],          // [{ product, qty }]
  step: 1,
  orderType: null,
  customer: { name: "", notes: "", street: "", number: "", neighborhood: "", complement: "", reference: "", coords: null },
  payment: null,
  change: "",
};

const subtotal = () => state.items.reduce((s, i) => s + i.qty * i.product.price, 0);
const fee      = () => DELIVERY_FEES[state.orderType] || 0;
const total    = () => subtotal() + fee();
const count    = () => state.items.reduce((s, i) => s + i.qty, 0);

function addItem(product) {
  const found = state.items.find(i => i.product.id === product.id);
  if (found) found.qty++;
  else state.items.push({ product, qty: 1 });
}
function setQty(id, qty) {
  if (qty <= 0) state.items = state.items.filter(i => i.product.id !== id);
  else { const f = state.items.find(i => i.product.id === id); if (f) f.qty = qty; }
}
function resetOrder() {
  state.items = [];
  state.orderType = null;
  state.customer = { name: "", notes: "", street: "", number: "", neighborhood: "", complement: "", reference: "", coords: null };
  state.payment = null;
  state.change = "";
  // Reset GPS UI
  const btnGps = document.getElementById("btn-gps");
  const gpsStatus = document.getElementById("gps-status");
  const verifyLink = document.getElementById("gps-verify-link");
  if (btnGps) { btnGps.textContent = "📍 Usar minha localização via GPS"; btnGps.classList.remove("captured"); }
  if (gpsStatus) { gpsStatus.textContent = ""; gpsStatus.classList.add("hidden"); }
  if (verifyLink) verifyLink.classList.add("hidden");
}

// ============================================
//  Navegação
// ============================================
function goTo(n) {
  state.step = n;

  document.querySelectorAll(".step").forEach(el => el.classList.remove("active"));
  document.getElementById(`step-${n}`).classList.add("active");

  document.querySelectorAll(".s-item").forEach(el => {
    const s = Number(el.dataset.step);
    el.classList.remove("active", "done");
    if (s === n) el.classList.add("active");
    if (s < n)  { el.classList.add("done"); el.querySelector("span").textContent = "✓"; }
    else         el.querySelector("span").textContent = s;
  });

  [1,2,3,4].forEach(i => {
    const line = document.getElementById(`line${i}${i+1}`);
    if (line) line.classList.toggle("done", i < n);
  });

  document.getElementById("btn-restart").classList.toggle("hidden", n === 1);
  document.getElementById("bottom-bar").style.display = n === 1 ? "flex" : "none";

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (n === 5) renderReview();
}

// ============================================
//  Cardápio
// ============================================
function renderCard(p) {
  const inCart = state.items.find(i => i.product.id === p.id);
  const qty    = inCart?.qty ?? 0;
  // Dados de produto são controlados pelo desenvolvedor (sem risco XSS)
  return `
    <article class="prod-card">
      <div class="prod-img-wrap">
        <img class="prod-img" src="${p.image}" alt="${p.name}" loading="lazy" />
        ${p.tag ? `<span class="prod-badge">${p.tag}</span>` : ""}
        ${qty > 0 ? `<span class="prod-incart">✓ ${qty} no carrinho</span>` : ""}
      </div>
      <div class="prod-body">
        <div>
          <h3 class="prod-name">${p.name}</h3>
          <p class="prod-desc">${p.description}</p>
        </div>
        <span class="prod-price">${fmt(p.price)}</span>
        ${qty === 0
          ? `<button class="btn-hero full" data-add="${p.id}">🛍 Adicionar</button>`
          : `<div class="qty-ctrl">
               <button class="qty-btn" data-dec="${p.id}">−</button>
               <span class="qty-num">${qty}</span>
               <button class="qty-btn" data-inc="${p.id}">+</button>
             </div>`}
      </div>
    </article>`;
}

function renderGrids() {
  ["burger", "drink"].forEach(cat => {
    const id   = cat === "burger" ? "grid-burgers" : "grid-drinks";
    const grid = document.getElementById(id);
    grid.innerHTML = PRODUCTS.filter(p => p.category === cat).map(renderCard).join("");
  });

  document.querySelectorAll("[data-add]").forEach(b => b.addEventListener("click", () => { addItem(PRODUCTS.find(p => p.id === b.dataset.add)); renderGrids(); updateBottomBar(); }));
  document.querySelectorAll("[data-inc]").forEach(b => b.addEventListener("click", () => { setQty(b.dataset.inc, (state.items.find(i=>i.product.id===b.dataset.inc)?.qty||0)+1); renderGrids(); updateBottomBar(); }));
  document.querySelectorAll("[data-dec]").forEach(b => b.addEventListener("click", () => { setQty(b.dataset.dec, (state.items.find(i=>i.product.id===b.dataset.dec)?.qty||0)-1); renderGrids(); updateBottomBar(); }));
}

function updateBottomBar() {
  const c = count();
  document.getElementById("bb-count").textContent = c === 0 ? "Carrinho vazio" : `${c} ${c === 1 ? "item" : "itens"}`;
  document.getElementById("bb-total").textContent  = fmt(subtotal());
  document.getElementById("btn-continue-1").disabled = state.items.length === 0;
}

// ============================================
//  Revisão — com escapeHtml em todos os campos
//  do usuário para evitar XSS
// ============================================
function renderReview() {
  const burgers = state.items.filter(i => i.product.category === "burger");
  const drinks  = state.items.filter(i => i.product.category === "drink");
  const sub     = subtotal(), f = fee(), tot = total();

  // Dados inseridos pelo usuário — todos sanitizados
  const safeCustomer = {
    name:         escapeHtml(state.customer.name),
    notes:        escapeHtml(state.customer.notes),
    street:       escapeHtml(state.customer.street),
    number:       escapeHtml(state.customer.number),
    neighborhood: escapeHtml(state.customer.neighborhood),
    complement:   escapeHtml(state.customer.complement),
    reference:    escapeHtml(state.customer.reference),
    change:       escapeHtml(state.change),
  };

  const itemRows = (list) => list.map(i => `
    <div class="rev-item">
      <span class="rev-item-name"><strong>${i.qty}x</strong> ${escapeHtml(i.product.name)} · ${fmt(i.product.price)}</span>
      <span class="rev-item-price">${fmt(i.product.price * i.qty)}</span>
    </div>`).join("");

  const orderLabel = state.orderType === "retirada" ? "Retirada no local"
    : state.orderType === "Brasileia" ? "Entrega em Brasiléia"
    : "Entrega em Epitaciolândia";

  let addrHtml;
  if (state.orderType === "retirada") {
    addrHtml = `<div class="rev-row"><span>Local</span><span>${escapeHtml(STORE_ADDRESS)}</span></div>`;
  } else if (state.customer.coords) {
    const lat = state.customer.coords.lat;
    const lng = state.customer.coords.lng;
    const mapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}`;
    addrHtml = `
      <div class="rev-row"><span>Localização</span><span>GPS capturado</span></div>
      <div class="rev-row"><span>Link</span><a href="${mapsUrl}" target="_blank" style="color:var(--orange)">Ver no Maps</a></div>`;
  } else {
    addrHtml = `
      <div class="rev-row"><span>Rua</span><span>${safeCustomer.street}, ${safeCustomer.number}</span></div>
      <div class="rev-row"><span>Bairro</span><span>${safeCustomer.neighborhood}</span></div>
      ${safeCustomer.complement ? `<div class="rev-row"><span>Complemento</span><span>${safeCustomer.complement}</span></div>` : ""}
      ${safeCustomer.reference  ? `<div class="rev-row"><span>Referência</span><span>${safeCustomer.reference}</span></div>` : ""}`;
  }

  document.getElementById("review-card").innerHTML = `
    <div class="rev-card">
      <h3 class="rev-card-title">Cliente</h3>
      <div class="rev-row"><span>Nome</span><span>${safeCustomer.name}</span></div>
      <div class="rev-row"><span>Tipo de pedido</span><span>${escapeHtml(orderLabel)}</span></div>
      ${safeCustomer.notes ? `<div class="rev-row"><span>Observação</span><span>${safeCustomer.notes}</span></div>` : ""}
    </div>
    <div class="rev-card">
      <h3 class="rev-card-title">Itens</h3>
      ${burgers.length ? `<p class="rev-sub">Hambúrgueres</p><div class="rev-items">${itemRows(burgers)}</div>` : ""}
      ${drinks.length  ? `<p class="rev-sub" style="margin-top:12px">Bebidas</p><div class="rev-items">${itemRows(drinks)}</div>` : ""}
    </div>
    <div class="rev-card">
      <h3 class="rev-card-title">${state.orderType === "retirada" ? "Retirada no local" : "Endereço de entrega"}</h3>
      ${addrHtml}
    </div>
    <div class="rev-card">
      <h3 class="rev-card-title">Pagamento</h3>
      <div class="rev-row"><span>Forma</span><span>${escapeHtml(PAY_LABEL[state.payment] || "—")}</span></div>
      ${state.payment === "dinheiro" && safeCustomer.change ? `<div class="rev-row"><span>Troco para</span><span>${safeCustomer.change}</span></div>` : ""}
    </div>
    <div class="rev-card">
      <h3 class="rev-card-title">Total</h3>
      <div class="rev-row"><span>Subtotal</span><span>${fmt(sub)}</span></div>
      <div class="rev-row"><span>Taxa de entrega</span><span>${fmt(f)}</span></div>
      <div class="rev-total">
        <span class="rev-total-label">Total</span>
        <span class="rev-total-val">${fmt(tot)}</span>
      </div>
    </div>`;
}

// ============================================
//  WhatsApp
// ============================================
function buildMessage() {
  const sub = subtotal(), f = fee(), tot = total();
  const obs  = state.customer.notes.trim() || "Nenhuma";
  const troco = state.payment === "dinheiro" && state.change.trim() ? `\n💵 Troco para: ${state.change.trim()}` : "";
  const items = state.items.map(i => `   • ${i.qty}x ${i.product.name} — ${fmt(i.product.price)} (${fmt(i.product.price * i.qty)})`).join("\n");

  if (state.orderType === "retirada") {
    return `🍔 *NOVO PEDIDO — RETIRADA NO LOCAL*\n\n👤 *Cliente:* ${state.customer.name}\n\n🛒 *Pedido:*\n${items}\n\n💰 Subtotal: ${fmt(sub)}\n🚚 Taxa de entrega: ${fmt(0)}\n✅ *Total: ${fmt(tot)}*\n\n💳 Forma de pagamento: ${PAY_LABEL[state.payment]}${troco}\n\n📝 Observação: ${obs}\n\n📍 Tipo de pedido: Cliente vai retirar no local.\n📌 Endereço da lanchonete: ${STORE_ADDRESS}`;
  } else if (state.customer.coords) {
    const mapsLink = `https://www.google.com/maps?q=${state.customer.coords.lat},${state.customer.coords.lng}`;
    return `🍔 *NOVO PEDIDO — ENTREGA COM GPS*\n\n👤 *Cliente:* ${state.customer.name}\n\n🛒 *Pedido:*\n${items}\n\n🏙️ Cidade: ${state.orderType}\n\n📍 Localização GPS do cliente: ${mapsLink}\n\n💰 Subtotal: ${fmt(sub)}\n🚚 Taxa de entrega: ${fmt(f)}\n✅ *Total: ${fmt(tot)}*\n\n💳 Forma de pagamento: ${PAY_LABEL[state.payment]}${troco}\n\n📝 Observação: ${obs}`;
  } else {
    return `🍔 *NOVO PEDIDO — ENTREGA*\n\n👤 *Cliente:* ${state.customer.name}\n\n🛒 *Pedido:*\n${items}\n\n🏙️ Cidade: ${state.orderType}\n\n📍 *Endereço:*\n   Rua: ${state.customer.street}, nº ${state.customer.number}\n   Bairro: ${state.customer.neighborhood}\n   Complemento: ${state.customer.complement || "—"}\n   Ponto de referência: ${state.customer.reference || "—"}\n\n💰 Subtotal: ${fmt(sub)}\n🚚 Taxa de entrega: ${fmt(f)}\n✅ *Total: ${fmt(tot)}*\n\n💳 Forma de pagamento: ${PAY_LABEL[state.payment]}${troco}\n\n📝 Observação: ${obs}`;
  }
}

// ============================================
//  Inicialização
// ============================================
document.addEventListener("DOMContentLoaded", () => {

  renderGrids();
  updateBottomBar();

  document.getElementById("btn-logo").addEventListener("click", () => { resetOrder(); renderGrids(); updateBottomBar(); goTo(1); });
  document.getElementById("btn-restart").addEventListener("click", () => { if (confirm("Recomeçar o pedido?")) { resetOrder(); renderGrids(); updateBottomBar(); goTo(1); } });

  document.getElementById("btn-continue-1").addEventListener("click", () => {
    if (state.items.length === 0) { alert("Adicione pelo menos 1 item ao carrinho para continuar 🍔"); return; }
    goTo(2);
  });

  // Stepper (navega para etapas já visitadas)
  document.querySelectorAll(".s-bubble[data-goto]").forEach(btn => {
    btn.addEventListener("click", () => {
      const n = Number(btn.dataset.goto);
      if (n <= state.step) goTo(n);
    });
  });

  // Botões data-goto genéricos
  document.querySelectorAll("[data-goto]").forEach(btn => {
    if (!btn.classList.contains("s-bubble")) {
      btn.addEventListener("click", () => goTo(Number(btn.dataset.goto)));
    }
  });

  // ENTREGA
  document.querySelectorAll(".opt-row").forEach(row => {
    row.addEventListener("click", () => {
      document.querySelectorAll(".opt-row").forEach(r => r.classList.remove("selected"));
      row.classList.add("selected");
      state.orderType = row.dataset.type;
      document.getElementById("btn-next-2").disabled = false;
    });
  });
  document.getElementById("btn-next-2").addEventListener("click", () => {
    if (!state.orderType) { alert("Escolha como você quer receber seu pedido."); return; }
    const isPickup = state.orderType === "retirada";
    document.getElementById("addr-block").classList.toggle("hidden", isPickup);
    document.getElementById("pickup-card").classList.toggle("hidden", !isPickup);
    goTo(3);
  });

  // DADOS
  const form = document.getElementById("customer-form");
  form.addEventListener("input", e => {
    const t = e.target;
    if (t.name === "name")         state.customer.name         = t.value;
    if (t.name === "notes")        state.customer.notes        = t.value;
    if (t.name === "street")       state.customer.street       = t.value;
    if (t.name === "number")       state.customer.number       = t.value;
    if (t.name === "neighborhood") state.customer.neighborhood = t.value;
    if (t.name === "complement")   state.customer.complement   = t.value;
    if (t.name === "reference")    state.customer.reference    = t.value;
  });

  // GPS
  const btnGps    = document.getElementById("btn-gps");
  const gpsStatus = document.getElementById("gps-status");
  btnGps.addEventListener("click", () => {
    if (!navigator.geolocation) { gpsStatus.textContent = "❌ Navegador não suporta GPS. Preencha manualmente."; gpsStatus.classList.remove("hidden"); return; }
    btnGps.textContent = "📡 Capturando localização...";
    navigator.geolocation.getCurrentPosition(
      pos => {
        state.customer.coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        btnGps.textContent = "✓ Localização capturada (toque para atualizar)";
        btnGps.classList.add("captured");
        gpsStatus.textContent = `📌 Lat: ${pos.coords.latitude.toFixed(5)} · Lng: ${pos.coords.longitude.toFixed(5)}`;
        gpsStatus.classList.remove("hidden");
        // Link de verificação no Maps
        const verifyLink = document.getElementById("gps-verify-link");
        verifyLink.href = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
        verifyLink.classList.remove("hidden");
      },
      err => {
        btnGps.textContent = "📍 Usar minha localização via GPS";
        btnGps.classList.remove("captured");
        gpsStatus.textContent = `❌ Erro: ${escapeHtml(err.message)}. Preencha o endereço abaixo.`;
        gpsStatus.classList.remove("hidden");
        document.getElementById("gps-verify-link").classList.add("hidden");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  document.getElementById("btn-next-3").addEventListener("click", () => {
    const err = document.getElementById("form-error");
    err.textContent = "";
    if (!state.customer.name.trim()) { err.textContent = "Informe seu nome para o vendedor identificar o pedido."; return; }
    if (state.orderType !== "retirada") {
      const { street, number, neighborhood } = state.customer;
      const hasManual = street.trim() && number.trim() && neighborhood.trim();
      if (!hasManual && !state.customer.coords) { err.textContent = "Preencha o endereço completo OU envie sua localização por GPS."; return; }
    }
    goTo(4);
  });

  // PAGAMENTO
  document.querySelectorAll(".pay-opt").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".pay-opt").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      state.payment = btn.dataset.pay;
      document.getElementById("btn-next-4").disabled = false;
      document.getElementById("pay-note-pix").classList.toggle("hidden",  state.payment !== "pix");
      document.getElementById("pay-note-card").classList.toggle("hidden", state.payment !== "credito" && state.payment !== "debito");
      document.getElementById("troco-block").classList.toggle("hidden",   state.payment !== "dinheiro");
    });
  });
  document.getElementById("troco-input").addEventListener("input", e => { state.change = e.target.value; });
  document.getElementById("btn-next-4").addEventListener("click", () => {
    if (!state.payment) { alert("Escolha a forma de pagamento."); return; }
    goTo(5);
  });

  // ENVIO WHATSAPP
  document.getElementById("btn-send").addEventListener("click", () => {
    if (!state.orderType || !state.payment) { alert("Faltam informações no pedido."); return; }
    const url = `https://wa.me/${OWNER_WHATSAPP_NUMBER}?text=${encodeURIComponent(buildMessage())}`;
    window.open(url, "_blank");
    setTimeout(() => { resetOrder(); renderGrids(); updateBottomBar(); goTo(1); }, 800);
  });

  goTo(1);
});
