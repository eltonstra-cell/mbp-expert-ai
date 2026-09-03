import { randomUUID } from "node:crypto";
import { getNeonAuth } from "@/lib/auth/server";
import {
  autorizaAcaoServidor,
  obterAcessoServidor,
} from "@/lib/serverAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mensagemDoErro(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const message = "message" in error ? error.message : "";
  return typeof message === "string" ? message : "";
}

export async function POST(request: Request) {
  try {
    const acesso = await obterAcessoServidor();
    if (!autorizaAcaoServidor(acesso, "usuarios.gerenciar") || !acesso.data) {
      return Response.json(
        { error: "Somente um Administrador pode enviar acessos." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const usuarioId = typeof body?.usuarioId === "string" ? body.usuarioId.trim() : "";
    const usuario = acesso.data.usuarios.find((item) => item.id === usuarioId);
    if (!usuario) {
      return Response.json({ error: "Usuário preparado não encontrado." }, { status: 404 });
    }
    if (usuario.status === "Suspenso") {
      return Response.json(
        { error: "Restaure este usuário antes de enviar o acesso." },
        { status: 409 }
      );
    }

    const auth = getNeonAuth();
    if (!auth) {
      return Response.json({ error: "Neon Auth não configurado." }, { status: 503 });
    }

    const email = usuario.email.trim().toLocaleLowerCase("pt-BR");
    const { data: lista, error: erroLista } = await auth.admin.listUsers({
      query: {
        searchValue: email,
        searchField: "email",
        searchOperator: "contains",
        limit: 10,
      },
    });

    if (erroLista) {
      const detalhe = mensagemDoErro(erroLista);
      return Response.json(
        {
          error:
            detalhe ||
            "A conta principal ainda precisa ser marcada como Administrador no Neon.",
          requiresNeonAdmin: true,
        },
        { status: 403 }
      );
    }

    const existente = lista?.users?.some(
      (item) => item.email.trim().toLocaleLowerCase("pt-BR") === email
    );

    if (!existente) {
      // A senha temporária nunca é mostrada nem armazenada pelo MBP. O usuário
      // recebe imediatamente um link seguro para definir a própria senha.
      const senhaTemporaria = `${randomUUID()}-Aa1!`;
      const { error: erroCriacao } = await auth.admin.createUser({
        email,
        password: senhaTemporaria,
        name: usuario.nome,
        role: "user",
      });
      if (erroCriacao) {
        return Response.json(
          { error: mensagemDoErro(erroCriacao) || "Não foi possível criar a conta no Neon." },
          { status: 502 }
        );
      }
    }

    const origem = new URL(request.url).origin;
    const { error: erroEmail } = await auth.requestPasswordReset({
      email,
      redirectTo: `${origem}/auth/reset-password`,
    });
    if (erroEmail) {
      return Response.json(
        {
          error:
            mensagemDoErro(erroEmail) ||
            "A conta foi criada, mas o e-mail para definir a senha não pôde ser enviado.",
        },
        { status: 502 }
      );
    }

    return Response.json({
      ok: true,
      accountCreated: !existente,
      message: "Acesso enviado. A pessoa deve abrir o e-mail para definir a senha.",
    });
  } catch (error) {
    console.error("POST /api/access/invite", error);
    return Response.json(
      { error: "Não foi possível enviar o acesso agora." },
      { status: 500 }
    );
  }
}
