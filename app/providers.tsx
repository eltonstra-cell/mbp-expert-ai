"use client";

import Link from "next/link";
import { NeonAuthUIProvider } from "@neondatabase/auth/react/ui";
import { authClient } from "@/lib/auth/client";
import DialogHost from "@/components/DialogHost";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NeonAuthUIProvider
      authClient={authClient}
      navigate={(href) => window.location.assign(href)}
      replace={(href) => window.location.replace(href)}
      redirectTo="/"
      signUp={false}
      defaultTheme="light"
      Link={({ href, className, children: linkChildren }) => (
        <Link href={href} className={className}>{linkChildren}</Link>
      )}
    >
      {children}
      <DialogHost />
    </NeonAuthUIProvider>
  );
}
