import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="bg-muted flex min-h-screen w-full">
      <div className="m-auto flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
