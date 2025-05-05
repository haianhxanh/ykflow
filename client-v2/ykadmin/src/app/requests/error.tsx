"use client";

import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container mx-auto flex h-[50vh] flex-col items-center justify-center">
      <h2 className="mb-4 text-2xl font-bold">Něco se pokazilo!</h2>
      <Button onClick={() => reset()}>Zkusit znovu</Button>
    </div>
  );
}
