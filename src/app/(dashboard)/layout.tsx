import { Suspense } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { approvalService } from "@/lib/services/approval-service";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { reservations } = await approvalService.getPendingCounts();
  const pendingCount = reservations;

  return (
    <SidebarProvider>
      <AppSidebar pendingCount={pendingCount} />
      <SidebarInset className="min-w-0">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Suspense fallback={<div className="flex items-center justify-center h-32 text-muted-foreground">読み込み中...</div>}>
            {children}
          </Suspense>
        </main>
      </SidebarInset>
      <Toaster richColors />
    </SidebarProvider>
  );
}
