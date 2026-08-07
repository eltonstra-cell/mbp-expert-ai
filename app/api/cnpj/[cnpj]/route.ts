import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cnpj: string }> }
) {
  const { cnpj } = await params;
  const normalized = cnpj.replace(/\D/g, "");

  if (normalized.length !== 14) {
    return NextResponse.json({ error: "CNPJ inválido." }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/${normalized}`,
      { cache: "no-store" }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.message || "Empresa não encontrada." },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Falha temporária ao consultar o CNPJ." },
      { status: 502 }
    );
  }
}
