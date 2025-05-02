import { Loader2 } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import type { JSX, RefAttributes } from "react";

export function ButtonLoading(
  props: JSX.IntrinsicAttributes &
    ButtonProps &
    RefAttributes<HTMLButtonElement>,
) {
  return (
    <Button {...props} disabled>
      <Loader2 className="animate-spin" />
      Počkejte prosím
    </Button>
  );
}
