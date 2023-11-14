import { TRANSLATIONS } from "@/utils/constants";
import {
  Button,
  Container,
  FormControl,
  FormHelperText,
  Grid,
  Input,
  InputLabel,
} from "@mui/material";
import { SignInResponse, signIn, useSession } from "next-auth/react";
import router from "next/router";
import { FormEventHandler, useEffect, useState } from "react";

export default function Login() {
  const [user, setUser] = useState({ username: "", password: "" });
  const { status, data } = useSession();

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const { error } = (await signIn("credentials", {
      username: user.username,
      password: user.password,
      redirect: false,
    })) as unknown as SignInResponse;

    if (error) {
      window.alert(TRANSLATIONS.INCORRECT_CREDENTIALS);
    } else {
      router.push("/");
    }
  };
  return (
    <>
      <form onSubmit={handleSubmit}>
        <Container className="flex justify-center w-full">
          <Grid
            container
            xs={12}
            md={12}
            gap={2}
            className="p-8 justify-center"
          >
            <Grid container xs={12} gap={2} className="justify-center">
              <Grid item>
                <FormControl>
                  <InputLabel htmlFor="username">
                    {TRANSLATIONS.USERNAME}
                  </InputLabel>
                  <Input
                    id="username"
                    onChange={({ target }) =>
                      setUser({ ...user, username: target.value })
                    }
                  />
                </FormControl>
              </Grid>
              <Grid item>
                <FormControl>
                  <InputLabel htmlFor="password">
                    {TRANSLATIONS.PASSWORD}
                  </InputLabel>
                  <Input
                    id="password"
                    onChange={({ target }) =>
                      setUser({ ...user, password: target.value })
                    }
                  />
                </FormControl>
              </Grid>
            </Grid>

            <Grid item>
              <Button type="submit" variant="outlined">
                {TRANSLATIONS.LOGIN}
              </Button>
            </Grid>
          </Grid>
        </Container>
      </form>
    </>
  );
}
