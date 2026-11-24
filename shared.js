// Shared helpers: data loading, saved orders (localStorage), product aggregation
const KEY = "sales_orders_v1";
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = v => "$" + Number(v).toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2});
const num = v => Number(v).toLocaleString("en-US");

function savedOrders() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
}
function saveOrder(o) {
  try { localStorage.setItem(KEY, JSON.stringify(savedOrders().concat(o))); } catch (e) {}
}
function clearSavedOrders() {
  try { localStorage.removeItem(KEY); } catch (e) {}
}

// All sales rows = original data.js + orders placed through the store
function allRows() {
  const base = (window.data || []).map(r => ({...r, description: r.description.trim()}));
  const mine = savedOrders().flatMap(o => o.items.map(i => ({
    invoiceno: o.code, stockcode: i.stockcode, description: i.description,
    quantity: i.quantity, unitprice: i.unitprice, customerid: o.customerid,
    country: o.country, date: o.date, hour: o.hour,
    total_amount: +(i.quantity * i.unitprice).toFixed(2)
  })));
  return base.concat(mine);
}

// One entry per product: units sold, number of orders containing it, price, revenue
function products(rows) {
  const m = new Map();
  rows.forEach(r => {
    let p = m.get(r.description);
    if (!p) m.set(r.description, p = {name: r.description, stockcode: r.stockcode, price: r.unitprice, qty: 0, revenue: 0, orders: new Set()});
    p.qty += r.quantity; p.revenue += r.total_amount; p.orders.add(String(r.invoiceno));
  });
  return [...m.values()].map(p => ({...p, orderCount: p.orders.size}));
}

// One entry per order (invoice)
function orders(rows) {
  const m = new Map();
  rows.forEach(r => {
    const k = String(r.invoiceno);
    let o = m.get(k);
    if (!o) m.set(k, o = {code: k, date: r.date, country: r.country, customerid: r.customerid, lines: [], units: 0, total: 0});
    o.lines.push(r); o.units += r.quantity; o.total += r.total_amount;
  });
  return [...m.values()];
}

const ICONS = [["HEART","❤️"],["BOTTLE","🍶"],["BAG","👜"],["CANDLE","🕯️"],["HOLDER","🕯️"],["CARD","🃏"],["MICE","🐭"],["DOLL","🪆"],["TOY","🧸"],["BOX","📦"],["TIN","🥫"],["LIGHT","💡"],["LAMP","💡"],["CAKE","🍰"],["TEA","🍵"],["COFFEE","☕"],["MUG","☕"],["CUP","☕"],["BIRD","🐦"],["CLOCK","⏰"],["FRAME","🖼️"],["CHRISTMAS","🎄"],["STAR","⭐"],["FLOWER","🌸"],["PAPER","📄"],["BUNTING","🚩"],["SIGN","🪧"],["TOWEL","🧺"],["JAR","🫙"],["PEN","✏️"],["BELL","🔔"],["BASKET","🧺"],["MAGIC","🎨"],["TISSUE","🧻"],["MATCH","🔥"]];
const iconFor = n => { const u = n.toUpperCase(); const f = ICONS.find(i => u.includes(i[0])); return f ? f[1] : "🎁"; };
const hueFor = n => { let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) % 997; return 190 + h % 55; }; // stays in the blue range
