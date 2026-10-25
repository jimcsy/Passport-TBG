import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { clearAdminSession, getAdminSession } from "@/lib/auth/session";
import { FloatingActionButton } from "@/components/admin/FloatingActionButton";
import { AdminNavigation } from "@/components/admin/AdminNavigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();

  // Keep the unauthenticated login screen outside the workspace navigation.
  if (!session) {
    if (headers().get("x-portal-path") !== "/trainer/login") redirect("/trainer/login");
    return <>{children}</>;
  }

  async function signOut() {
    "use server";
    await clearAdminSession();
    redirect("/trainer/login");
  }

  return (
    <div className="min-h-screen bg-beat-canvas">
      <AdminNavigation
        admin={{
          fullName: session.fullName,
          employeeId: session.employeeId,
          role: session.role,
        }}
        signOut={signOut}
      />

      {/* Main Content Area */}
      <main id="trainer-main" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-6 pb-28 outline-none sm:px-8 sm:pt-8 md:pb-28 xl:px-0">
        <div className="min-w-0 space-y-6">
          {children}
        </div>
      </main>
      <FloatingActionButton />
    </div>
  );
}
