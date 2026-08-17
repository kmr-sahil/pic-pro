import { redirect } from "next/navigation";

import Library from "@/components/library/Library";
import { UploadProvider } from "@/components/upload/UploadProvider";
import { auth } from "@/lib/auth";
import { getLibrary } from "@/lib/data";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const data = await getLibrary(session.user.id);

  return (
    <UploadProvider>
      <Library
        data={data}
        user={{
          name: session.user.name ?? null,
          email: session.user.email ?? "",
          image: session.user.image ?? null,
        }}
      />
    </UploadProvider>
  );
}
