"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { NeonAuthUIProvider } from "@neondatabase/auth/react/ui";
import { authClient } from "@/lib/auth/client";

export default function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <NeonAuthUIProvider
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      onSessionChange={() => router.refresh()}
      redirectTo="/"
      signUp={false}
      defaultTheme="light"
      Link={({ href, className, children: linkChildren }) => (
        <Link href={href} className={className}>{linkChildren}</Link>
      )}
    >
      {children}
    </NeonAuthUIProvider>
  );
}
