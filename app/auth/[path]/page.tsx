import { AuthView } from "@neondatabase/auth/react/ui";
import { authViewPaths } from "@neondatabase/auth/react/ui/server";
import { authEnvironmentStatus } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

export default async function AuthPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  if (!authEnvironmentStatus().configured) {
    return (
      <main className="min-h-screen bg-[#f4f7fb] p-6">
        <section className="mx-auto mt-16 max-w-xl rounded-2xl bg-white p-6 shadow-sm">
          <div className="text-xs font-extrabold uppercase text-amber-700">v2.46 • Preparação segura</div>
          <h1 className="mt-2 text-2xl font-extrabold">Login ainda não ativado</h1>
          <p className="mt-3 text-sm text-slate-600">
            O diretório pode ser preparado, mas o login só será liberado depois de habilitar o Neon Auth e cadastrar as duas variáveis secretas na Vercel.
          </p>
          <a href="/" className="mt-5 inline-block rounded-xl bg-[#17365D] px-4 py-3 font-bold text-white">Voltar ao sistema</a>
        </section>
      </main>
    );
  }
  return (
    <main className="auth-shell">
      <section className="auth-brand-panel" aria-label="MBP Expert AI">
        <div className="auth-brand-mark">
          <div className="auth-shield" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2.8 20 6v5.8c0 4.9-3.3 8-8 9.4-4.7-1.4-8-4.5-8-9.4V6l8-3.2Z" />
              <path d="m8.2 12 2.3 2.3 5.4-5.4" />
            </svg>
          </div>
          <div>
            <div className="auth-brand-name">MBP Expert AI</div>
            <div className="auth-brand-caption">Segurança dos Alimentos</div>
          </div>
        </div>

        <div className="auth-brand-message">
          <div className="auth-kicker">Gestão técnica inteligente</div>
          <h1>Inspeções mais claras, rápidas e organizadas.</h1>
          <p>Empresas, visitas e evidências reunidas em um único lugar.</p>
        </div>

        <div className="auth-brand-foot">Seus registros continuam protegidos e sincronizados.</div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-mobile-brand">
          <div className="auth-shield" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2.8 20 6v5.8c0 4.9-3.3 8-8 9.4-4.7-1.4-8-4.5-8-9.4V6l8-3.2Z" />
              <path d="m8.2 12 2.3 2.3 5.4-5.4" />
            </svg>
          </div>
          <div>
            <div className="auth-brand-name">MBP Expert AI</div>
            <div className="auth-brand-caption">Segurança dos Alimentos</div>
          </div>
        </div>

        <div className="auth-form-wrap">
          <div className="auth-welcome">
            <div className="auth-kicker">Bem-vindo</div>
            <h2>Acesse sua conta</h2>
            <p>Entre para continuar seu trabalho de onde parou.</p>
          </div>
          <AuthView
            pathname={path}
            localization={{
              SIGN_IN: "Entrar",
              SIGN_IN_DESCRIPTION: "Use o e-mail e a senha cadastrados no sistema.",
              EMAIL: "E-mail",
              PASSWORD: "Senha",
              EMAIL_PLACEHOLDER: "seu@email.com",
              PASSWORD_PLACEHOLDER: "Digite sua senha",
              FORGOT_PASSWORD_LINK: "Esqueceu sua senha?",
              SIGN_IN_ACTION: "Entrar",
            }}
            classNames={{
              base: "auth-card",
              header: "auth-card-header",
              content: "auth-card-content",
              footer: "auth-card-footer",
              form: {
                base: "auth-fields",
                label: "auth-label",
                input: "auth-input",
                primaryButton: "auth-submit",
                forgotPasswordLink: "auth-forgot",
              },
            }}
          />
          <p className="auth-help">Problemas para entrar? Fale com o administrador do sistema.</p>
        </div>
      </section>
    </main>
  );
}
