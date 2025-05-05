import { HydrateClient } from "@/trpc/server";
import { Typography } from "@/components/ui/typography";
export default async function Home() {
  return (
    <HydrateClient>
      <main className="flex min-h-screen w-full flex-col items-center justify-center">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <Typography variant="h1">Žádosti</Typography>
        </div>
      </main>
    </HydrateClient>
  );
}
