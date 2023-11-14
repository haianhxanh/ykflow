import { TRANSLATIONS } from "@/utils/constants";
import { Card, Link, Grid, Button } from "@mui/material";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const card = (
  <>
    <CardContent className="text-center">
      <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
        Požadavky zákazníků o pozastavení Krabiček
      </Typography>
    </CardContent>
    <CardActions className="justify-center">
      <Link href="/pozadavky" underline="none">
        {"Zobrazit požadavky"}
      </Link>
    </CardActions>
  </>
);
export default function Home({ children }: { children: any }) {
  const { status, data } = useSession();
  return (
    <>
      {status == "authenticated" && (
        <Grid container spacing={2} className="p-8 flex justify-center">
          <Grid item xs={12} md={6}>
            <Card variant="outlined">{card}</Card>
          </Grid>
        </Grid>
      )}
    </>
  );
}
