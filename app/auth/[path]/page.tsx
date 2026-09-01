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
  return <AuthView pathname={path} />;
}
