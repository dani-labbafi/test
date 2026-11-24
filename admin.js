const $ = id => document.getElementById(id);
const BLUES = ["#3b82f6","#22d3ee","#7dd3fc","#1d4ed8","#60a5fa","#0ea5e9","#818cf8","#38bdf8","#2563eb","#67e8f9"];
let rows = [], ords = [], prods = [], charts = {};

if (window.Chart) { Chart.defaults.color = "#8da6d4"; Chart.defaults.borderColor = "#1d3868"; Chart.defaults.font.family = "'Plus Jakarta Sans','Segoe UI',sans-serif"; }
function mk(id, cfg) {
  if (!window.Chart) return;
  charts[id]?.destroy();
  cfg.options = Object.assign({responsive: true, maintainAspectRatio: false}, cfg.options);
  charts[id] = new Chart($(id), cfg);
}
const sumBy = (arr, key, val) => arr.reduce((m, r) => (m[r[key]] = (m[r[key]] || 0) + val(r), m), {});

function load() {
  const all = allRows(), c = $("fc").value;
  rows = c && c !== "all" ? all.filter(r => r.country === c) : all;
  ords = orders(rows); prods = products(rows);
  kpis(); drawCharts(); orderTable(); productTable(); countryTable(all);
}

function kpis() {
  const rev = rows.reduce((s, r) => s + r.total_amount, 0), units = rows.reduce((s, r) => s + r.quantity, 0);
  const best = [...prods].sort((a, b) => b.revenue - a.revenue)[0];
  $("kpis").innerHTML = [
    ["Total revenue", money(rev)], ["Orders", num(ords.length)], ["Units sold", num(units)],
    ["Average order value", money(ords.length ? rev / ords.length : 0)],
    ["Customers", num(new Set(rows.map(r => r.customerid)).size)], ["Products sold", num(prods.length)],
    ["Top product by revenue", best ? best.name.toLowerCase().slice(0, 22) : "-"]
  ].map(k => `<div class="kpi"><span>${k[0]}</span><b style="${k[0].startsWith("Top") ? "font-size:1rem;text-transform:capitalize" : ""}">${esc(k[1])}</b></div>`).join("");
}

function drawCharts() {
  const byDate = sumBy(rows, "date", r => r.total_amount), dates = Object.keys(byDate).sort();
  mk("c1", {type: "line", data: {labels: dates, datasets: [{label: "Revenue ($)", data: dates.map(d => +byDate[d].toFixed(2)), borderColor: "#7dd3fc", backgroundColor: "#3b82f633", fill: true, tension: .3, pointRadius: 3}]}});
  const top = [...prods].sort((a, b) => b.qty - a.qty).slice(0, 10);
  mk("c2", {type: "bar", data: {labels: top.map(p => p.name.toLowerCase().slice(0, 16)), datasets: [{label: "Units sold", data: top.map(p => p.qty), backgroundColor: "#3b82f6", borderRadius: 5}]}, options: {indexAxis: "y", plugins: {legend: {display: false}}}});
  const byC = sumBy(rows, "country", r => r.total_amount);
  mk("c3", {type: "doughnut", data: {labels: Object.keys(byC), datasets: [{data: Object.values(byC).map(v => +v.toFixed(2)), backgroundColor: BLUES, borderColor: "#0a1a38"}]}, options: {plugins: {legend: {position: "right"}}}});
  const hrs = {}; ords.forEach(o => { const h = o.lines[0].hour; hrs[h] = (hrs[h] || 0) + 1; });
  const hl = Object.keys(hrs).map(Number).sort((a, b) => a - b);
  mk("c4", {type: "bar", data: {labels: hl.map(h => h + ":00"), datasets: [{label: "Orders", data: hl.map(h => hrs[h]), backgroundColor: "#22d3ee", borderRadius: 5}]}, options: {plugins: {legend: {display: false}}}});
}

function orderTable() {
  const q = $("oq").value.trim().toLowerCase();
  const list = ords.filter(o => !q || o.code.toLowerCase().includes(q) || o.country.toLowerCase().includes(q) || o.lines.some(l => l.description.toLowerCase().includes(q)))
    .sort((a, b) => b.date.localeCompare(a.date));
  $("otb").innerHTML = list.map(o => `<tr><td><span class="tag">${esc(o.code)}</span></td><td>${esc(o.date)}</td><td>${esc(o.country)}</td><td>${esc(o.customerid)}</td>
    <td class="n">${o.lines.length}</td><td class="n">${num(o.units)}</td><td class="n">${money(o.total)}</td></tr>`).join("") || `<tr><td colspan="7" class="empty">No orders match.</td></tr>`;
}

function productTable() {
  const q = $("pq").value.trim().toLowerCase(), k = $("ps").value;
  $("ptb").innerHTML = prods.filter(p => p.name.toLowerCase().includes(q)).sort((a, b) => b[k] - a[k]).map(p =>
    `<tr><td style="text-transform:capitalize">${esc(p.name.toLowerCase())}</td><td class="n">${money(p.price)}</td><td class="n">${num(p.qty)}</td><td class="n">${p.orderCount}</td><td class="n">${money(p.revenue)}</td></tr>`).join("")
    || `<tr><td colspan="5" class="empty">No products match.</td></tr>`;
}

function countryTable(all) {
  const tot = all.reduce((s, r) => s + r.total_amount, 0), m = {};
  orders(all).forEach(o => { const c = m[o.country] ||= {o: 0, u: 0, r: 0}; c.o++; c.u += o.units; c.r += o.total; });
  $("ctb").innerHTML = Object.entries(m).sort((a, b) => b[1].r - a[1].r).map(([n, c]) =>
    `<tr><td>${esc(n)}</td><td class="n">${c.o}</td><td class="n">${num(c.u)}</td><td class="n">${money(c.r)}</td><td class="n">${(c.r / tot * 100).toFixed(1)}%</td></tr>`).join("");
}

$("fc").addEventListener("change", load);
$("oq").addEventListener("input", orderTable);
$("pq").addEventListener("input", productTable);
$("ps").addEventListener("change", productTable);
$("reset").addEventListener("click", () => { if (confirm("Delete all orders placed through the store? Original data stays.")) { clearSavedOrders(); load(); } });
$("csv").addEventListener("click", () => {
  const head = "order_code,date,country,customer,items,units,total";
  const body = ords.map(o => [o.code, o.date, `"${o.country}"`, o.customerid, o.lines.length, o.units, o.total.toFixed(2)].join(","));
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([head + "\n" + body.join("\n")], {type: "text/csv"}));
  a.download = "orders.csv"; a.click();
});

$("fc").innerHTML = `<option value="all">All countries</option>` + [...new Set(allRows().map(r => r.country))].sort().map(c => `<option>${esc(c)}</option>`).join("");
load();
