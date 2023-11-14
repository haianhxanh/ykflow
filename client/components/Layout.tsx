import { useEffect, useState } from "react";
import Header from "./Header";
import Main from "./Main";

export default function Layout({ children }: { children: any }) {
  return (
    <>
      <Header>{children}</Header>
      <Main>{children}</Main>
    </>
  );
}
