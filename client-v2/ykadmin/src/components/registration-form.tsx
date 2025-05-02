"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import Image from "next/image";
import { z } from "zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { api } from "@/trpc/react";

import { toast } from "sonner";
import { ButtonLoading } from "./ui/button-loading";
import { useState } from "react";
import { signIn } from "next-auth/react";

// I think this is duplicated TODO:
type Credentials = {
  email: string;
  password: string;
};

const schema = z
  .object({
    email: z.string().email("Neplatný email"),
    password: z.string().min(6, "Heslo musí mít alespoň 6 znaků"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hesla se neshodují",
    path: ["confirmPassword"],
  });

export function RegistrationForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const registerMutation = api.auth.register.useMutation();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: Credentials) => {
    setIsLoading(true);
    try {
      await registerMutation.mutateAsync({
        email: data.email,
        password: data.password,
      });
      toast.success("Registrace úspěšná! Přesměrování...");
      await signIn("credentials", {
        redirect: true,
        email: data.email,
        password: data.password,
      });
    } catch (error) {
      // TODO: messy, needs better generic handling
      if (
        (error as any)?.name === "TRPCClientError" && // eslint-disable-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        (error as any)?.data?.httpStatus === 409 // eslint-disable-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      ) {
        toast.error("Tento e-mail již existuje.");
        return;
      }
      toast.error("Nastala neočekávaná chyba. Zkuste to prosím znovu.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="email@example.cz"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heslo</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="*******" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Potvrdit heslo</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="*******" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ButtonLoading */}
              {isLoading && <ButtonLoading />}
              {!isLoading && (
                <Button type="submit" className="w-full">
                  Registrovat se
                </Button>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
      <div className="text-muted-foreground text-center text-xs [&_a]:underline">
        Už máte účet?{" "}
        <a
          href="/auth/login"
          className="hover:text-primary underline underline-offset-4"
        >
          Přihlásit se
        </a>
      </div>
    </div>
  );
}
