// Verificação do cadastro de empresa no app de verdade (navegador sem janela): consulta de CNPJ como proposta (empresa comum e MEI), sem sinal,
// tipo sugerido pelo CNAE, pacote por tipo, nome próprio com setor oficial sugerido e equipamentos em chips com cópia e desfazer.
// A consulta de CNPJ é simulada dentro da página (nada sai da máquina). Só dados de teste; nunca a Churrascaria do Chico.
// Uso: npm run build && node --experimental-strip-types scripts/verificar-cadastro.mjs [--saida pasta]
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { abrirNavegador } from "./navegador-cdp.mjs";
import { iniciarApp, montarEstado } from "./verificar-capa-pdf.mjs";

const EMAIL = "elton.teste@example.com";
const CHAVE = `mbp-expert-ai-v2:usuario:${encodeURIComponent(EMAIL)}`;
const CHAVE_NAV = `mbp-expert-ai:navegacao:v1:usuario:${encodeURIComponent(EMAIL)}`;
const saida = process.argv.includes("--saida") ? process.argv[process.argv.indexOf("--saida") + 1] : null;
if (saida) mkdirSync(saida, { recursive: true });

const resultados = [];
const registrar = (nome, ok, detalhe = "") => {
  resultados.push({ nome, ok });
  console.log(`${ok ? "PASSOU" : "FALHOU"}  ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
};

// CNPJs de teste válidos (dígitos verificadores conferidos): 11.222.333/0001-81 (restaurante) e 34.028.316/0001-03 (MEI de teste).
const CNPJ_EMPRESA = "11222333000181";
const CNPJ_MEI = "11444777000161";
const servidorFalso = `
  const __f = window.fetch.bind(window);
  const flag = (k) => localStorage.getItem(k) === "1";
  Object.defineProperty(navigator, "onLine", { get: () => !flag("__off") });
  window.fetch = async (entrada, opcoes = {}) => {
    const url = String(entrada && entrada.url ? entrada.url : entrada);
    const json = (c, s = 200) => new Response(JSON.stringify(c), { status: s, headers: { "content-type": "application/json" } });
    if (url.startsWith("/api/cnpj/")) {
      if (flag("__off")) throw new TypeError("Failed to fetch");
      localStorage.setItem("__consultas", String(Number(localStorage.getItem("__consultas") || 0) + 1));
      if (flag("__falha")) return json({ error: "indisponível" }, 502);
      const c = url.split("/").pop();
      if (c === "${CNPJ_MEI}") return json({ source: "BrasilAPI", cnpj: c, razao_social: "", nome_fantasia: "Marmitas da Casa", descricao_situacao_cadastral: "ATIVA", cnae_fiscal: "5620104", cnae_fiscal_descricao: "Fornecimento de alimentos preparados preponderantemente para consumo domiciliar", cnaes_secundarios: [], natureza_juridica: "Empresário (Individual)", codigo_natureza_juridica: "2135", opcao_pelo_mei: true, logradouro: "RUA DOS TESTES", numero: "5", complemento: "", bairro: "CENTRO", cep: "90000000", municipio: "PORTO ALEGRE", uf: "RS", ddd_telefone_1: "", email: "" });
      return json({ source: "BrasilAPI", cnpj: c, razao_social: "RESTAURANTE SABOR DE TESTE LTDA", nome_fantasia: "Sabor de Teste", descricao_situacao_cadastral: "ATIVA", cnae_fiscal: "5611201", cnae_fiscal_descricao: "Restaurantes e similares", cnaes_secundarios: [{ codigo: "5611203", descricao: "Lanchonetes, casas de chá, de sucos e similares" }], natureza_juridica: "Sociedade Empresária Limitada", codigo_natureza_juridica: "2062", opcao_pelo_mei: false, logradouro: "AVENIDA DO TESTE", numero: "100", complemento: "SALA 1", bairro: "CENTRO", cep: "90010000", municipio: "PORTO ALEGRE", uf: "EX", ddd_telefone_1: "5133333333", email: "contato@teste.example" });
    }
    if (url.startsWith("/api/access/session")) return flag("__off") ? Promise.reject(new TypeError("x")) : json({ authenticated: true, user: { id: "u1", email: ${JSON.stringify(EMAIL)}, name: "Elton Volmir Strapazon" } });
    if (url.startsWith("/api/state")) { if (flag("__off")) throw new TypeError("Failed to fetch"); const s = JSON.parse(localStorage.getItem("__srv")); if (url.includes("meta=1")) return json({ configured: true, updatedAt: s.updatedAt }); if ((opcoes.method || "GET") === "PUT") { const c = JSON.parse(opcoes.body); if (c.expectedUpdatedAt !== s.updatedAt) return json({ ok: false, conflict: true, configured: true, data: s.data, updatedAt: s.updatedAt }, 409); const n = { data: c.data, updatedAt: new Date().toISOString() }; localStorage.setItem("__srv", JSON.stringify(n)); return json({ ok: true, configured: true, updatedAt: n.updatedAt }); } return json({ configured: true, data: s.data, updatedAt: s.updatedAt }); }
    return __f(entrada, opcoes);
  };`;

const app = await iniciarApp();
const n = await abrirNavegador({ porta: 9600 + Math.floor(Math.random() * 90) });
const js = (c) => n.avaliar(c);
const texto = () => js("document.body.innerText");
const flag = (k, v) => js(`localStorage.setItem(${JSON.stringify(k)}, ${v ? '"1"' : '"0"'})`);
const esperar = async (cond, ms = 12000) => {
  const limite = Date.now() + ms;
  while (Date.now() < limite) {
    if (await cond()) return true;
    await n.esperar(200);
  }
  return false;
};
const clicar = (rotulo) => js(`(()=>{const b=[...document.querySelectorAll("button")].find(x=>x.innerText.trim()===${JSON.stringify(rotulo)});if(!b)return false;b.click();return true})()`);
const clicarContendo = (parte) => js(`(()=>{const b=[...document.querySelectorAll("button")].find(x=>x.innerText.includes(${JSON.stringify(parte)}));if(!b)return false;b.click();return true})()`);
const digitar = async (seletor, valor) => {
  await js(`(()=>{const el=document.querySelector(${JSON.stringify(seletor)});el.focus();const d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value");d.set.call(el,${JSON.stringify(valor)});el.dispatchEvent(new Event("input",{bubbles:true}))})()`);
};
const foto = async (nome) => {
  if (saida) writeFileSync(path.join(saida, `${nome}.png`), await n.imagem());
};

try {
  await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await n.ir("about:blank");
  const e = await montarEstado();
  // Empresa de teste com ambientes (dois de nome próprio) e um equipamento, para as partes 7 e 8.
  Object.assign(e.db.empresas["beyond-nutri"], {
    tipo: "Restaurante",
    setoresManual: ["Cozinha / Produção", "Estoque de matérias-primas, ingredientes e embalagens", "Salão", "Cozinha da frente"],
    equipamentosSetores: [{ id: "eq-1", setor: "Cozinha / Produção", nome: "Refrigerador", quantidade: 2, estado: "Não avaliado", observacao: "" }],
  });
  const semente = `if(!localStorage.getItem("__semeado")){localStorage.setItem("__semeado","1");localStorage.setItem(${JSON.stringify(CHAVE)},${JSON.stringify(JSON.stringify(e.db))});localStorage.setItem(${JSON.stringify(CHAVE_NAV)},JSON.stringify({view:"empresas"}));localStorage.setItem("mbp-expert-ai:offline-session:v1",JSON.stringify({id:"u1",email:${JSON.stringify(EMAIL)},name:"Elton Volmir Strapazon"}));localStorage.setItem("__srv",JSON.stringify({data:${JSON.stringify(e.db)},updatedAt:"2026-10-22T10:00:00.000Z"}));}`;
  await n.enviar("Page.addScriptToEvaluateOnNewDocument", { source: servidorFalso + semente });
  await n.ir(app.base);
  await esperar(async () => /Nova empresa/.test(await texto()), 20000);
  await n.esperar(1500);
  await clicarContendo("Nova empresa");
  await esperar(async () => js('!!document.querySelector("input[aria-invalid]")||[...document.querySelectorAll("span")].some(s=>s.innerText==="CNPJ")'), 10000);
  const campoCnpj = `section[aria-label="Nova empresa"] label input`;

  // 1. CNPJ inválido: avisa no campo, na hora, e não consulta.
  await digitar(campoCnpj, "11222333000182");
  await n.esperar(700);
  registrar("1a. CNPJ com dígito verificador errado: aviso na hora, no campo", /CNPJ inválido/.test(await texto()));
  registrar("1b. e a consulta não é feita", Number(await js('localStorage.getItem("__consultas")||0')) === 0);

  // 2. CNPJ válido: consulta sozinha, chega como PROPOSTA (nada preenchido até "Usar estes dados").
  await digitar(campoCnpj, CNPJ_EMPRESA);
  const veioProposta = await esperar(async () => /Dados encontrados para este CNPJ/.test(await texto()), 12000);
  registrar("2a. CNPJ válido: a consulta chega como proposta com botão 'Usar estes dados'", veioProposta && /Usar estes dados/.test(await texto()));
  const antes = await js(`[...document.querySelectorAll("section[aria-label='Nova empresa'] label")].map(l=>({r:l.querySelector("span")?.innerText||"",v:l.querySelector("input,textarea")?.value||""})).filter(x=>x.r.includes("Razão social")||x.r.includes("Nome fantasia")).map(x=>x.v).join("|")`);
  registrar("2b. nada foi preenchido antes de o RT confirmar", antes === "|" || antes === "", JSON.stringify(antes));
  registrar("2c. a proposta traz CNAE principal e secundários (recolhíveis, com código e descrição)", (await texto()).includes("5611-2/01") && (await texto()).includes("CNAEs secundários (1)") && (await js(`(()=>{const d=document.querySelector(".cnpj-prop-cnaes");return !!d&&!d.open&&d.textContent.includes("5611-2/03 · Lanchonetes")})()`)));
  registrar("2c2. a proposta mostra a fonte usada e a UF 'EX' da consulta não aparece (vira RS pelo CEP)", /fonte: BrasilAPI/.test(await texto()) && !/ EX/.test(await js(`document.querySelector(".cnpj-proposta").innerText`)) && /Porto Alegre|PORTO ALEGRE/.test(await js(`document.querySelector(".cnpj-proposta").innerText`)));
  await foto("1-proposta");
  await clicar("Usar estes dados");
  await n.esperar(500);
  const depois = await js(`[...document.querySelectorAll("section[aria-label='Nova empresa'] label")].map(l=>({r:l.querySelector("span")?.innerText||"",v:l.querySelector("input,textarea")?.value||""})).filter(x=>x.r.includes("Razão social")||x.r.includes("Nome fantasia")).map(x=>x.v).join("|")`);
  registrar("2d. 'Usar estes dados' preenche razão social e fantasia", depois.includes("RESTAURANTE SABOR DE TESTE LTDA") && depois.includes("Sabor de Teste"), depois);
  registrar("2e. campos da consulta ficam marcados 'da consulta'", /da consulta/.test(await texto()));
  registrar("2e2. UF vem RS (deduzida pelo CEP) com aviso 'UF não veio da consulta, confirme' e telefone formatado", /UF não veio da consulta, confirme/.test(await texto()) && (await js(`JSON.stringify([...document.querySelectorAll("section[aria-label='Nova empresa'] input")].map(i=>i.value))`)).includes("(51) 3333-3333") && (await js(`JSON.stringify([...document.querySelectorAll("section[aria-label='Nova empresa'] input")].map(i=>i.value))`)).includes("RS"));
  registrar("2f. o CNAE sugere o tipo 'Restaurante', marcado 'sugerido pelo CNAE', com opção de trocar", /sugerido pelo CNAE/.test(await texto()) && (await js(`[...document.querySelectorAll("button")].some(b=>b.innerText.includes("Confirmar tipo"))`)));
  await js(`(()=>{const el=[...document.querySelectorAll("section[aria-label='Nova empresa'] label")].find(l=>(l.querySelector("span")?.innerText||"").includes("Nome fantasia")).querySelector("input");el.focus();const d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value");d.set.call(el,"Sabor de Teste Centro");el.dispatchEvent(new Event("input",{bubbles:true}))})()`);
  await n.esperar(300);
  const marcasFantasia = await js(`(()=>{const l=[...document.querySelectorAll("section[aria-label='Nova empresa'] label")].find(l=>(l.querySelector("span")?.innerText||"").includes("Nome fantasia"));return l.querySelector(".chip-consulta")?"marcado":"sem marca"})()`);
  registrar("2g. editar o campo tira a marca 'da consulta'", marcasFantasia === "sem marca");

  // 3. Pacote do tipo: propõe ambientes, equipamentos e fluxos; o RT desmarca e confirma; desfazer.
  registrar("3a. o tipo propõe ambientes, equipamentos e fluxos, sem criar nada ainda", /o app propõe \d+ ambientes?, \d+ equipamentos? e \d+ fluxos?/.test(await texto()) && /Nada é criado sem a sua confirmação/.test(await texto()));
  await clicar("Ver e escolher");
  await n.esperar(300);
  registrar("3a2. 'Ver e escolher' abre uma JANELA (mo\dal) com título 'Pacote \de Restaurante · N ambientes, N equipamentos, N fluxos' e ro\dapé fixo", await js(`(()=>{const j=\document.querySelector(".esc-janela.pacote-janela");if(!j)return false;const t=j.querySelector("h2").innerText;const r=j.querySelector(".esc-ro\dape");return /^Pacote \de Restaurante · \\d+ ambientes, \\d+ equipamentos, \\d+ fluxos$/.test(t)&&!!r&&[...r.querySelectorAll("button")].map(b=>b.innerText).join("|")==="Agora não|Aplicar o que está marca\do"&&j.getBoun\dingClientRect().bottom<=innerHeight})()`));
  registrar("3a3. títulos \do grupo em negrito e 16px ou mais, com '13 \de 13 marca\dos'; nomes curtos nos ambientes", await js(`(()=>{const t=\document.querySelector(".pacote-grupo-titulo");const cs=getCompute\dStyle(t);const conta=\document.querySelector(".pacote-grupo-conta").innerText;const itens=[...\document.querySelectorAll(".esc-opcao-titulo")].map(x=>x.innerText);return Number(cs.fontWeight)>=700&&parseFloat(cs.fontSize)>=16&&/^\\d+ \de \\d+ marca\dos$/.test(conta)&&itens.inclu\des("Cozinha")&&itens.inclu\des("Central \de gás")&&itens.inclu\des("Refeitório")})()`));
  await foto("2-pacote");
  await js(`[...document.querySelectorAll(".pacote-aba")].find(b=>b.innerText.startsWith("Equipamentos")).click()`);
  await n.esperar(200);
  registrar("3a4. equipamentos agrupados sob o nome do ambiente, sem repetir o ambiente em cada item", await js(`(()=>{const g=[...document.querySelectorAll(".pacote-eq-ambiente")].map(x=>x.innerText);const itens=[...document.querySelectorAll(".esc-opcao-titulo")].map(x=>x.innerText);return g.includes("Cozinha")&&itens.includes("Fritadeira")&&!itens.some(x=>x.includes("·"))})()`));
  await js(`[...document.querySelectorAll(".pacote-aba")].find(b=>b.innerText.startsWith("Ambientes")).click()`);
  await js(`(()=>{const l=[...document.querySelectorAll(".esc-opcao")].find(x=>x.innerText.includes("Cozinha"));l.querySelector("input").click()})()`);
  await n.esperar(200);
  registrar("3a5. desmarcar o ambiente Cozinha avisa que os equipamentos também saíram", /equipamentos também saíram/.test(await texto()));
  await js(`(()=>{const l=[...document.querySelectorAll(".esc-opcao")].find(x=>x.innerText.includes("Cozinha"));l.querySelector("input").click()})()`);
  await n.esperar(200);
  registrar("3a6. marcar a Cozinha de novo devolve os equipamentos", /equipamentos voltaram/.test(await texto()));
  await js(`[...document.querySelectorAll(".pacote-aba")].find(b=>b.innerText.startsWith("Equipamentos")).click()`);
  await n.esperar(150);
  await foto("2b-equipamentos");
  await js(`[...document.querySelectorAll(".pacote-aba")].find(b=>b.innerText.startsWith("Fluxos")).click()`);
  await n.esperar(200);
  registrar("3a7. Fluxos: 'cada fluxo marcado adiciona 3 perguntas', resumo por setor e escolha de setor em cada fluxo; os 4 sem setor padrão pedem a escolha", await js(`(()=>{const t=document.querySelector(".pacote-janela").innerText;const resumo=document.querySelector(".pacote-fluxo-resumo")?.innerText||"";const linhas=document.querySelectorAll(".pacote-fluxo-linha").length;return /Cada fluxo marcado adiciona 3 perguntas ao setor dele/.test(t)&&/\\d+ fluxos? = \\d+ perguntas na /.test(resumo)&&/fluxos sem setor não somam perguntas/.test(resumo)&&linhas===11&&t.includes("Escolha o setor deste fluxo")})()`));
  await foto("2c-fluxos");
  await js(`[...document.querySelectorAll(".pacote-aba")].find(b=>b.innerText.startsWith("Ambientes")).click()`);
  await n.esperar(100);
  await js(`[...document.querySelectorAll(".pacote-aba")].find(b=>b.innerText.startsWith("Equipamentos")).click()`);
  await js(`(()=>{const l=[...document.querySelectorAll(".esc-opcao")].find(x=>x.innerText.includes("Fritadeira"));l.querySelector("input").click()})()`);
  await clicar("Aplicar o que está marcado");
  await n.esperar(500);
  registrar("3b. aplicado: aparece 'Pacote de Restaurante aplicado' com Desfazer", /Pacote de Restaurante aplicado/.test(await texto()) && (await js(`[...document.querySelectorAll("button")].some(b=>b.innerText.trim()==="Desfazer")`)));
  await clicar("Desfazer");
  await n.esperar(400);
  registrar("3c. Desfazer devolve o cadastro ao que era (de novo propõe o pacote)", /o app propõe/.test(await texto()));

  // 4. MEI: nome do titular e CPF não entram.
  await js(`localStorage.setItem("__consultas","0")`);
  await digitar(campoCnpj, CNPJ_MEI);
  const veioMei = await esperar(async () => /Empresário individual ou MEI/.test(await texto()), 12000);
  registrar("4a. MEI: a proposta avisa que o nome do titular e o CPF não são guardados", veioMei);
  await clicar("Usar estes dados");
  await n.esperar(500);
  const campos = await js(`JSON.stringify([...document.querySelectorAll("section[aria-label='Nova empresa'] input,section[aria-label='Nova empresa'] textarea")].map(i=>i.value))`);
  registrar("4b. MEI: razão social fica vazia (inclusive a da consulta anterior) e a fantasia vem; nenhum CPF em nenhum campo", campos.includes("Marmitas da Casa") && !campos.includes("RESTAURANTE SABOR") && !/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/.test(campos.replace(/\d{14}/g, "")), "");
  registrar("4c. MEI: pede o nome do estabelecimento", /nome do titular não é guardado|nome do estabelecimento/.test(await texto()));
  await foto("3-mei");

  // 5. Sem sinal: cadastro manual segue; a consulta vira proposta depois.
  await flag("__off", true);
  await js(`window.dispatchEvent(new Event("offline"))`);
  await digitar(campoCnpj, "11222333000181");
  await n.esperar(600);
  await clicarContendo("Buscar");
  await n.esperar(500);
  registrar("5a. sem sinal: mensagem curta e o cadastro manual segue normal", /Sem sinal: preencha à mão/.test(await texto()));
  await js(`(()=>{const el=[...document.querySelectorAll("section[aria-label='Nova empresa'] label")].find(l=>(l.querySelector("span")?.innerText||"").includes("Razão social")).querySelector("input");el.focus();const d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value");d.set.call(el,"Digitada Sem Sinal Ltda");el.dispatchEvent(new Event("input",{bubbles:true}))})()`);
  await n.esperar(300);
  registrar("5b. sem sinal: dá para digitar normalmente", (await js(`JSON.stringify([...document.querySelectorAll("section[aria-label='Nova empresa'] input")].map(i=>i.value))`)).includes("Digitada Sem Sinal Ltda"));
  await flag("__off", false);
  await js(`window.dispatchEvent(new Event("online"))`);
  await clicarContendo("Buscar");
  registrar("5c. com o sinal de volta, a consulta refeita chega como proposta", await esperar(async () => /Dados encontrados para este CNPJ/.test(await texto()), 12000));
  await clicar("Ignorar");
  await n.esperar(300);
  registrar("5d. 'Ignorar' descarta a proposta sem mexer no que foi digitado", !/Dados encontrados para este CNPJ/.test(await texto()) && (await js(`JSON.stringify([...document.querySelectorAll("section[aria-label='Nova empresa'] input")].map(i=>i.value))`)).includes("Digitada Sem Sinal Ltda"));

  // 6. Falha da consulta não trava.
  await flag("__falha", true);
  await clicarContendo("Buscar");
  registrar("6. consulta com falha: mensagem curta, sem travar e sem bloquear o cadastro", await esperar(async () => /Não consegui consultar o CNPJ agora/.test(await texto()), 8000));
  await flag("__falha", false);
  await foto("4-cadastro");

  // 7. Nome próprio com setor oficial sugerido (Cadastros › Ambientes): o RT confirma com um toque.
  await js(`localStorage.setItem("__semeado","1")`);
  await n.ir(app.base);
  await esperar(async () => /Cadastros/.test(await texto()), 20000);
  await n.esperar(1200);
  await js('[...document.querySelectorAll(".tr .tr-item")].find((b) => b.innerText.trim().startsWith("Mais"))?.click()');
  await clicar("Cadastros");
  await esperar(async () => /Ambientes/.test(await texto()), 15000);
  await clicarContendo("Ambientes");
  const veioSugestao = await esperar(async () => /Setor oficial: Refeitório e salão de consumação/.test(await texto()), 15000);
  registrar("7a. 'Salão' sugere o setor oficial 'Refeitório e salão de consumação', marcado 'sugerido'", veioSugestao && /sugerido/.test(await texto()));
  registrar("7b. a sugestão mostra a fonte (Portaria SES/RS 799/2023, item e data de conferência)", (await texto()).includes("Portaria SES/RS nº 799/2023, item 3.21 · conferido em"));
  await foto("5-setor-sugerido");
  await js(`(()=>{const li=[...document.querySelectorAll("li")].find(x=>x.innerText.includes("Salão")&&x.innerText.includes("Vincular"));[...li.querySelectorAll("button")].find(b=>b.innerText.includes("Vincular")).click()})()`);
  await n.esperar(600);
  registrar("7c. um toque vincula e marca o setor oficial; o nome próprio continua sendo o exibido", (await js(`[...document.querySelectorAll("li")].some(x=>x.innerText.includes("Salão")&&x.innerText.includes("Nome próprio"))`)) && (await js(`[...document.querySelectorAll("li")].some(x=>x.innerText.trim().startsWith("Refeitório e salão de consumação"))`)));
  registrar("7d. nome próprio sem palavra reconhecida não recebe sugestão", !/Sala da diretoria/.test(await texto()));

  // 8. Equipamentos em chips por ambiente, copiar para outros ambientes com desfazer, limite de temperatura sugerido.
  await clicarContendo("Equipamentos");
  const chips = await esperar(async () => /Refrigerador ×2/.test(await texto()), 10000);
  registrar("8a. equipamentos aparecem como chips dentro do ambiente", chips);
  await clicar("+ Freezer").catch(() => false);
  await clicarContendo("+ Fogão");
  await n.esperar(400);
  registrar("8b. um toque na sugestão do tipo adiciona o equipamento ao ambiente", /Fogão/.test(await js(`[...document.querySelectorAll(".cad-chip:not(.cad-chip--mais)")].map(c=>c.innerText).join("|")`)));
  await clicarContendo("Copiar para outros ambientes");
  await n.esperar(300);
  await js(`(()=>{const l=[...document.querySelectorAll(".cad-copiar-destino")].find(x=>x.innerText.includes("Estoque"));l.querySelector("input").click()})()`);
  await foto("6-copiar");
  await clicar("Copiar");
  await n.esperar(500);
  registrar("8c. copiar para outro ambiente: confirma e avisa quantos foram copiados, com Desfazer", /equipamentos? copiados?/.test(await texto()) && (await js(`[...document.querySelectorAll(".cad-copia-aviso button")].some(b=>b.innerText.trim()==="Desfazer")`)));
  const noEstoque = await js(`(()=>{const g=[...document.querySelectorAll(".cad-grupo")].find(x=>x.querySelector(".cad-grupo-titulo span").title.startsWith("Estoque de matérias-primas"));return g?g.innerText:""})()`);
  registrar("8d. o equipamento copiado aparece no ambiente de destino", /Refrigerador/.test(noEstoque) && /Fogão/.test(noEstoque), noEstoque.replace(/\n+/g, " ").slice(0, 80));
  await js(`[...document.querySelectorAll(".cad-copia-aviso button")].find(b=>b.innerText.trim()==="Desfazer").click()`);
  await n.esperar(500);
  const depoisDesfazer = await js(`(()=>{const g=[...document.querySelectorAll(".cad-grupo")].find(x=>x.querySelector(".cad-grupo-titulo span").title.startsWith("Estoque de matérias-primas"));return g?g.innerText:""})()`);
  registrar("8e. Desfazer tira só o que a cópia criou", !/Refrigerador/.test(depoisDesfazer) && /Refrigerador ×2/.test(await texto()));
  await clicarContendo("+ Câmara fria");
  await n.esperar(400);
  await js(`(()=>{const c=[...document.querySelectorAll(".cad-chip-nome")].find(x=>x.innerText.includes("Câmara fria"));c.click()})()`);
  await n.esperar(400);
  registrar("8f. equipamento refrigerado vem com limite de temperatura sugerido e a fonte da norma, para o RT confirmar", (await texto()).includes("Limite sugerido pelo tipo do equipamento: até 5 °C") && (await texto()).includes("Portaria SES/RS nº 799/2023, item 10.09"));
  await clicar("Confirmar limite");
  await n.esperar(300);
  registrar("8g. o RT confirma o limite", /Limite confirmado: até 5 °C/.test(await texto()));
  await foto("7-limite");
} catch (erro) {
  registrar(`erro na verificação: ${erro.message}`, false);
} finally {
  await n.fechar();
  app.parar();
}

const falhas = resultados.filter((r) => !r.ok);
console.log(`\n${resultados.length - falhas.length} de ${resultados.length} passaram.`);
process.exit(falhas.length ? 1 : 0);
