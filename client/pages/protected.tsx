import { NextPage } from "next";
import { useSession } from "next-auth/react";

const Protected: NextPage = (): JSX.Element => {
  const session = useSession();
  return <>You have to log in first</>;
};

export default Protected;
