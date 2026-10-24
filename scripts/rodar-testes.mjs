// Roda os testes em duas levas. Os que abrem Chrome + `next start` (E2e e PDF) rodam UM POR VEZ: em paralelo eles disputam CPU e portas
// e o teste do PDF da capa estourava o tempo sob carga (passava sozinho). Os de lógica pura rodam em paralelo, como antes.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arquivos = readdirSync(path.join(raiz, "tests")).filter((nome) => nome.endsWith(".test.mjs")).map((nome) => path.join("tests", nome));
const noNavegador = (arquivo) => /(E2e|Pdf)\.test\.mjs$/.test(arquivo);
const leva = (lista, extra = []) => spawnSync(process.execPath, ["--experimental-strip-types", "--test", ...extra, ...lista], { cwd: raiz, stdio: "inherit" }).status ?? 1;

const puros = arquivos.filter((arquivo) => !noNavegador(arquivo));
const lentos = arquivos.filter(noNavegador);
const a = leva(puros);
const b = lentos.length ? leva(lentos, ["--test-concurrency=1"]) : 0;
process.exit(a || b ? 1 : 0);
