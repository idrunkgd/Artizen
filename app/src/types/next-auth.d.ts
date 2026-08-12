// Augmentation de type NextAuth pour Artizen.
// Le callback session() enrichit session.user avec les champs multi-tenant
// (cf. src/lib/auth.ts). On les declare ici pour un typage strict cote app.
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      organizationId: string | null;
      organizationName: string | null;
      role: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    organizationId: string | null;
    organizationName: string | null;
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    organizationId: string | null;
    organizationName: string | null;
    role: string;
  }
}
