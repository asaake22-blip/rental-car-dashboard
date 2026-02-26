"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  Building2,
  Users,
  Upload,
  CheckCircle,
  Car,
  FileText,
  Wrench,
  MapPin,
  Landmark,
  Banknote,
  CreditCard,
  CalendarDays,
  LayoutGrid,
  Clock,
  Tag,
  Receipt,
  ListChecks,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  {
    group: "概要",
    items: [
      { title: "ダッシュボード", href: "/", icon: LayoutDashboard },
    ],
  },
  {
    group: "経理",
    items: [
      { title: "取引先", href: "/accounts", icon: Building2 },
      { title: "見積書", href: "/quotations", icon: FileText },
      { title: "請求書", href: "/invoices", icon: FileText },
      { title: "入金管理", href: "/payments", icon: Banknote },
      { title: "目標管理", href: "/targets", icon: Target },
    ],
  },
  {
    group: "車両管理",
    items: [
      { title: "車両一覧", href: "/vehicles", icon: Car },
      { title: "リース契約", href: "/lease-contracts", icon: FileText },
      { title: "点検・整備", href: "/inspections", icon: Wrench },
      { title: "駐車場マップ", href: "/parking", icon: MapPin },
    ],
  },
  {
    group: "貸渡管理",
    items: [
      { title: "予約一覧", href: "/reservations", icon: CalendarDays },
      { title: "配車表", href: "/dispatch", icon: LayoutGrid },
      { title: "業務予定", href: "/daily-schedule", icon: Clock },
      { title: "車両クラス", href: "/vehicle-classes", icon: Tag },
      { title: "料金プラン", href: "/rate-plans", icon: Receipt },
      { title: "オプション", href: "/rate-options", icon: ListChecks },
    ],
  },
  {
    group: "マスタ管理",
    items: [
      { title: "営業所マスタ", href: "/offices", icon: Landmark },
      { title: "会社マスタ", href: "/masters/companies", icon: Building2 },
      { title: "顧客マスタ", href: "/masters/customers", icon: Users },
      { title: "担当営業マスタ", href: "/masters/sales-reps", icon: Users },
      { title: "決済端末", href: "/terminals", icon: CreditCard },
    ],
  },
  {
    group: "管理",
    items: [
      { title: "インポート", href: "/import", icon: Upload },
      { title: "承認一覧", href: "/approvals", icon: CheckCircle },
    ],
  },
];

interface AppSidebarProps {
  pendingCount?: number;
}

export function AppSidebar({ pendingCount = 0 }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <h1 className="text-lg font-bold">営業管理</h1>
        <p className="text-xs text-muted-foreground">
          レンタカー事業ダッシュボード
        </p>
      </SidebarHeader>
      <SidebarContent className="[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-sidebar-border hover:[&::-webkit-scrollbar-thumb]:bg-sidebar-foreground/20">
        {navItems.map((group) => (
          <SidebarGroup key={group.group}>
            <SidebarGroupLabel>{group.group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        item.href === "/"
                          ? pathname === "/"
                          : pathname.startsWith(item.href)
                      }
                    >
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                        {item.href === "/approvals" && pendingCount > 0 && (
                          <Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1.5 text-xs">
                            {pendingCount}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname.startsWith("/settings")}
            >
              <Link href="/settings">
                <Settings className="size-4" />
                <span>設定</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <p className="px-2 pb-1 text-[10px] text-muted-foreground">
          v0.1.0
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
