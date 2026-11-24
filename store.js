const $ = id => document.getElementById(id);
let P = [], tier = [0, 1e9], shown = 24;
let cart = [];
const COUNTRIES = ["United Kingdom","Germany","EIRE","Lithuania","France","Netherlands","Iran","Turkey","Italy","Spain","United States","Canada"];

function refresh() {
  P = products(allRows());
  const rows = allRows();
  $("heroStats").innerHTML = [
    [P.length, "products"], [num(rows.reduce((s, r) => s + r.quantity, 0)), "units sold"],
    [orders(rows).length, "orders"], [new Set(rows.map(r => r.country)).size, "countries"]
  ].map(s => `<div class="stat"><b>${s[0]}</b><span>${s[1]}</span></div>`).join("");
  renderGrid();
  const cur = $("cprod").value;
  $("cprod").innerHTML = [...P].sort((a, b) => a.name.localeCompare(b.name))
    .map(p => `<option value="${esc(p.name)}">${esc(p.name)}</option>`).join("");
  if (cur) $("cprod").value = cur;
  syncPrice();
}

function cube(p) {
  const i = iconFor(p.name);
  return `<div class="scene"><div class="tilt"><div class="cube" style="--h:${hueFor(p.name)}">
    <div class="f fr">${i}</div><div class="f bk">${i}</div><div class="f rt">${i}</div><div class="f lf">${i}</div><div class="f tp"></div><div class="f bt"></div>
  </div></div></div><div class="shadow"></div>`;
}

function renderGrid() {
  const q = $("q").value.trim().toLowerCase(), s = $("sort").value;
  const list = P.filter(p => p.price >= tier[0] && p.price < tier[1] && p.name.toLowerCase().includes(q));
  list.sort((a, b) => s === "orders" ? b.orderCount - a.orderCount : s === "pa" ? a.price - b.price : s === "pd" ? b.price - a.price : b.qty - a.qty);
  $("grid").innerHTML = list.slice(0, shown).map(p => `
    <article class="pcard">${cube(p)}
      <div class="pname">${esc(p.name.toLowerCase())}</div>
      <div class="price">${money(p.price)}</div>
      <div class="meta"><b>${num(p.qty)}</b> units sold &bull; in <b>${p.orderCount}</b> ${p.orderCount === 1 ? "order" : "orders"}</div>
      <button class="btn sm" data-add="${esc(p.name)}">Order this</button>
    </article>`).join("") || `<p class="empty">No products match these filters.</p>`;
  $("count").textContent = `Showing ${Math.min(shown, list.length)} of ${list.length}`;
  $("more").hidden = shown >= list.length;
}

// Mouse tilt + "Order this" buttons
$("grid").addEventListener("mousemove", e => {
  const c = e.target.closest(".pcard"); if (!c) return;
  const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
  c.querySelector(".tilt").style.transform = `rotateX(${-16 - y * 40}deg) rotateY(${x * 50}deg)`;
});
$("grid").addEventListener("mouseout", e => {
  const c = e.target.closest(".pcard");
  if (c && !c.contains(e.relatedTarget)) c.querySelector(".tilt").style.transform = "";
});
$("grid").addEventListener("click", e => {
  const b = e.target.closest("[data-add]"); if (!b) return;
  $("cprod").value = b.dataset.add; syncPrice();
  addItem(); $("order").scrollIntoView();
});

$("q").addEventListener("input", () => { shown = 24; renderGrid(); });
$("sort").addEventListener("change", renderGrid);
$("more").addEventListener("click", () => { shown += 24; renderGrid(); });
$("tiers").addEventListener("click", e => {
  const b = e.target.closest(".chip"); if (!b) return;
  document.querySelectorAll("#tiers .chip").forEach(c => c.classList.toggle("on", c === b));
  tier = b.dataset.t === "all" ? [0, 1e9] : b.dataset.t.split("-").map(Number);
  shown = 24; renderGrid();
});

// ---- Order form ----
const prod = () => P.find(p => p.name === $("cprod").value);
function syncPrice() { const p = prod(); $("cprice").value = p ? money(p.price) : ""; }
$("cprod").addEventListener("change", syncPrice);

function note(t) { $("msg").textContent = t || ""; }
function addItem() {
  const p = prod(), q = parseInt($("cqty").value, 10);
  if (!p) return note("Choose a product first.");
  if (!q || q < 1) return note("Quantity must be at least 1.");
  note();
  const ex = cart.find(i => i.description === p.name);
  if (ex) ex.quantity += q; else cart.push({description: p.name, stockcode: p.stockcode, unitprice: p.price, quantity: q});
  $("receipt").hidden = true; renderCart();
}
$("addItem").addEventListener("click", addItem);

function renderCart() {
  $("cart").innerHTML = cart.map((i, k) => `<li><span>${esc(i.description.toLowerCase())}<br><span class="meta">${i.quantity} × ${money(i.unitprice)}</span></span>
    <span>${money(i.quantity * i.unitprice)} <button data-rm="${k}" aria-label="Remove item">&times;</button></span></li>`).join("") || `<li class="empty" style="display:block">No items yet. Pick a product and press “Add to order”.</li>`;
  $("cartTotal").textContent = money(cart.reduce((s, i) => s + i.quantity * i.unitprice, 0));
}
$("cart").addEventListener("click", e => { const b = e.target.closest("[data-rm]"); if (b) { cart.splice(+b.dataset.rm, 1); renderCart(); } });

function newCode() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let c;
  do { c = "ORD-" + Array.from({length: 6}, () => A[Math.floor(Math.random() * A.length)]).join(""); }
  while (orders(allRows()).some(o => o.code === c));
  return c;
}

$("submit").addEventListener("click", () => {
  const name = $("cname").value.trim();
  if (!name) return note("Enter the customer name.");
  if (!cart.length) return note("Add at least one product to the order.");
  note();
  const now = new Date(), code = newCode();
  saveOrder({code, customer: name, customerid: Math.floor(10000 + Math.random() * 90000), country: $("ccountry").value,
    date: now.toISOString().slice(0, 10), hour: now.getHours(), items: cart});
  $("newCode").textContent = code; $("receipt").hidden = false;
  cart = []; renderCart(); refresh();
});
$("copy").addEventListener("click", () => { navigator.clipboard?.writeText($("newCode").textContent); $("copy").textContent = "Copied"; setTimeout(() => $("copy").textContent = "Copy code", 1500); });

// ---- Order lookup ----
function find() {
  const c = $("code").value.trim().toLowerCase(), out = $("result");
  if (!c) { out.innerHTML = `<p class="empty">Enter an order code to see its details.</p>`; return; }
  const o = orders(allRows()).find(o => o.code.toLowerCase() === c);
  if (!o) { out.innerHTML = `<p class="empty">No order found with code “${esc($("code").value.trim())}”. Check the code and try again.</p>`; return; }
  out.innerHTML = `<div class="bar"><span class="tag">Order ${esc(o.code)}</span><span class="meta">${esc(o.date)} &bull; ${esc(o.country)} &bull; customer ${esc(o.customerid)}</span></div>
    <div class="tw"><table><thead><tr><th>Product</th><th class="n">Qty</th><th class="n">Unit price</th><th class="n">Amount</th></tr></thead><tbody>
    ${o.lines.map(l => `<tr><td>${esc(l.description)}</td><td class="n">${num(l.quantity)}</td><td class="n">${money(l.unitprice)}</td><td class="n">${money(l.total_amount)}</td></tr>`).join("")}
    </tbody></table></div><div class="total"><span>${o.units} units</span><span>${money(o.total)}</span></div>`;
}
$("find").addEventListener("click", find);
$("code").addEventListener("keydown", e => e.key === "Enter" && find());

// init
const extra = new Set(COUNTRIES.concat(allRows().map(r => r.country)));
$("ccountry").innerHTML = [...extra].sort().map(c => `<option>${esc(c)}</option>`).join("");
$("ccountry").value = "United Kingdom";
refresh(); renderCart();
