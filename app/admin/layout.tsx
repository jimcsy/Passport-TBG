import { getAdminSession } from "@/lib/auth/session";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();

  // If unauthenticated (e.g. login page), render child directly without sidebar
  if (!session) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-beat-canvas">
      {/* Persistent BEAT Maroon Sidebar */}
      <AdminSidebar
        admin={{
          fullName: session.fullName,
          employeeId: session.employeeId,
          role: session.role,
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 md:p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
