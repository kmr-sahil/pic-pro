import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth";
import UploadSection from "@/components/UploadSection";
import FileGrid from "@/components/FileGrid";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Media Vault</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{session.user.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="text-sm text-gray-400 hover:text-white transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 flex flex-col gap-10">
        <UploadSection />
        <FileGrid />
      </main>
    </div>
  );
}
