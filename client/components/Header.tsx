import { TRANSLATIONS, URLS } from "@/utils/constants";
import { Grid, Button } from "@mui/material";
import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function Header({ children }: { children: any }) {
  const { status, data } = useSession();
  const pathname = usePathname();

  return (
    <>
      <div className="flex justify-center my-4">
        <Link href="/">
          <Image
            src="/yeskrabicky-logo.png"
            width={100}
            height={200}
            alt="logo"
          />
        </Link>
      </div>

      {pathname != URLS.LOGIN && (
        <Grid container className="flex justify-center">
          {status !== "authenticated" && (
            <Button
              variant="outlined"
              onClick={() => {
                signIn();
              }}
            >
              {TRANSLATIONS.LOGIN}
            </Button>
          )}
          {status === "authenticated" && (
            <Button
              variant="outlined"
              onClick={() => {
                signOut();
              }}
            >
              {TRANSLATIONS.LOGOUT}
            </Button>
          )}
        </Grid>
      )}
    </>
  );
}
