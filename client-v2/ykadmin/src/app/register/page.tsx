import { RegistrationForm } from "@/components/registration-form";

export default function RegistrationPage() {
  return (
    <main className="bg-muted flex min-h-screen w-full">
      <div className="m-auto flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <RegistrationForm />
        </div>
      </div>
    </main>
  );
}
