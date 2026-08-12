import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: creds.email },
          include: { memberships: { include: { organization: true }, take: 1 } }
        });
        if (!user || !user.active) return null;
        const ok = await bcrypt.compare(creds.password, user.passwordHash);
        if (!ok) return null;
        const m = user.memberships[0];
        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          organizationId: m?.organizationId ?? null,
          organizationName: m?.organization?.name ?? null,
          role: m?.role ?? "PATRON"
        } as any;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.organizationId = (user as any).organizationId;
        token.organizationName = (user as any).organizationName;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as any).id = token.id;
      (session.user as any).organizationId = token.organizationId;
      (session.user as any).organizationName = token.organizationName;
      (session.user as any).role = token.role;
      return session;
    }
  }
};
