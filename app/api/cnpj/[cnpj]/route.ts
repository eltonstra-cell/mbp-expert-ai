import { NextResponse } from "next/server";
import { semCpf, titularEPessoaFisica } from "@/lib/cnpjConsulta";

type NormalizedCompany = {
  source: "BrasilAPI" | "CNPJ.ws";
  cnpj: string;
  nome_fantasia: string;
  razao_social: string;
  descricao_situacao_cadastral: string;
  cnae_fiscal: string;
  cnae_fiscal_descricao: string;
  data_inicio_atividade: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  municipio: string;
  uf: string;
  ddd_telefone_1: string;
  ddd_telefone_2: string;
  email: string;
  cnaes_secundarios: { codigo: string; descricao: string }[];
  natureza_juridica: string;
  codigo_natureza_juridica: string;
  opcao_pelo_mei: boolean;
};

function normalizeBrasilApi(data: any, cnpj: string): NormalizedCompany {
  return {
    source: "BrasilAPI",
    cnpj: data?.cnpj || cnpj,
    nome_fantasia: data?.nome_fantasia || "",
    razao_social: data?.razao_social || "",
    descricao_situacao_cadastral: data?.descricao_situacao_cadastral || "",
    cnae_fiscal: String(data?.cnae_fiscal || ""),
    cnae_fiscal_descricao: data?.cnae_fiscal_descricao || "",
    data_inicio_atividade: data?.data_inicio_atividade || "",
    logradouro: data?.logradouro || "",
    numero: data?.numero || "",
    complemento: data?.complemento || "",
    bairro: data?.bairro || "",
    cep: data?.cep || "",
    municipio: data?.municipio || "",
    uf: data?.uf || "",
    ddd_telefone_1: data?.ddd_telefone_1 || "",
    ddd_telefone_2: data?.ddd_telefone_2 || "",
    email: data?.email || "",
    cnaes_secundarios: (Array.isArray(data?.cnaes_secundarios) ? data.cnaes_secundarios : []).map((c: any) => ({ codigo: String(c?.codigo ?? ""), descricao: String(c?.descricao ?? "") })),
    natureza_juridica: String(data?.natureza_juridica || ""),
    codigo_natureza_juridica: String(data?.codigo_natureza_juridica ?? ""),
    opcao_pelo_mei: Boolean(data?.opcao_pelo_mei),
  };
}

function normalizeCnpjWs(data: any, cnpj: string): NormalizedCompany {
  const est = data?.estabelecimento || {};
  const principal = est?.atividade_principal || est?.atividade_principal?.[0] || {};
  const cidade = est?.cidade?.nome || est?.municipio?.nome || "";
  const estado = est?.estado?.sigla || est?.uf || "";

  const fone1 =
    est?.ddd1 && est?.telefone1
      ? `(${est.ddd1}) ${est.telefone1}`
      : est?.telefone1 || "";

  const fone2 =
    est?.ddd2 && est?.telefone2
      ? `(${est.ddd2}) ${est.telefone2}`
      : est?.telefone2 || "";

  return {
    source: "CNPJ.ws",
    cnpj: est?.cnpj || cnpj,
    nome_fantasia: est?.nome_fantasia || "",
    razao_social: data?.razao_social || "",
    descricao_situacao_cadastral: est?.situacao_cadastral || "",
    cnae_fiscal: String(principal?.id || ""),
    cnae_fiscal_descricao: principal?.descricao || "",
    data_inicio_atividade: est?.data_inicio_atividade || "",
    logradouro: [est?.tipo_logradouro, est?.logradouro].filter(Boolean).join(" "),
    numero: est?.numero || "",
    complemento: est?.complemento || "",
    bairro: est?.bairro || "",
    cep: est?.cep || "",
    municipio: cidade,
    uf: estado,
    ddd_telefone_1: fone1,
    ddd_telefone_2: fone2,
    email: est?.email || "",
    cnaes_secundarios: (Array.isArray(est?.atividades_secundarias) ? est.atividades_secundarias : []).map((c: any) => ({ codigo: String(c?.id ?? ""), descricao: String(c?.descricao ?? "") })),
    natureza_juridica: String(data?.natureza_juridica?.descricao || ""),
    codigo_natureza_juridica: String(data?.natureza_juridica?.id ?? ""),
    opcao_pelo_mei: Boolean(data?.simples?.mei === "Sim" || data?.simples?.mei === true),
  };
}

// LGPD: empresário individual / MEI tem o nome do titular (e o CPF) na razão social. Isso nem sai do servidor para o navegador.
function protegerDadosDePessoa(dados: NormalizedCompany): NormalizedCompany {
  const pessoaFisica = titularEPessoaFisica({ naturezaJuridica: dados.natureza_juridica, codigoNaturezaJuridica: dados.codigo_natureza_juridica, opcaoPeloMei: dados.opcao_pelo_mei });
  return { ...dados, razao_social: pessoaFisica ? "" : semCpf(dados.razao_social), nome_fantasia: semCpf(dados.nome_fantasia), email: pessoaFisica ? "" : dados.email };
}

async function tryBrasilApi(cnpj: string) {
  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`BrasilAPI respondeu ${res.status}`);
  }

  const data = await res.json();
  return normalizeBrasilApi(data, cnpj);
}

async function tryCnpjWs(cnpj: string) {
  const res = await fetch(`https://publica.cnpj.ws/cnpj/${cnpj}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": "PontoCerto/2.0",
    },
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.detalhes || body?.details || body?.titulo || body?.title || "";
    } catch {}

    throw new Error(`CNPJ.ws respondeu ${res.status}${detail ? ` - ${detail}` : ""}`);
  }

  const data = await res.json();
  return normalizeCnpjWs(data, cnpj);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cnpj: string }> }
) {
  const { cnpj } = await params;
  const normalized = cnpj.replace(/\D/g, "");

  if (normalized.length !== 14) {
    return NextResponse.json(
      { error: "CNPJ inválido. Informe os 14 dígitos." },
      { status: 400 }
    );
  }

  const errors: string[] = [];

  try {
    const data = await tryBrasilApi(normalized);
    return NextResponse.json(protegerDadosDePessoa(data));
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Falha na BrasilAPI");
  }

  try {
    const data = await tryCnpjWs(normalized);
    return NextResponse.json(protegerDadosDePessoa(data));
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Falha na CNPJ.ws");
  }

  return NextResponse.json(
    {
      error:
        "Não foi possível consultar o CNPJ agora. Tente novamente em alguns instantes.",
      detail: errors,
    },
    { status: 502 }
  );
}
