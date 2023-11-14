import { useSession } from "next-auth/react";

export default function Main({ children }: { children: any }) {
  return <>{children}</>;
}
