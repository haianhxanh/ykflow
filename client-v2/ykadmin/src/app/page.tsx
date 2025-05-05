import { api, HydrateClient } from "@/trpc/server";
import { Typography } from "@/components/ui/typography";
import { RequestList } from "@/components/requests/request-list";

export default async function Home() {
  const requests = await getRequests();
  return (
    <HydrateClient>
      <main className="flex min-h-screen w-full flex-col items-center justify-center">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <Typography variant="h1">Žádosti</Typography>
          <RequestList requests={requests} />
        </div>
      </main>
    </HydrateClient>
  );
}

async function getRequests() {
  const requests = await api.request.getAll();
  return requests;
}
