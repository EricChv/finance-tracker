import * as React from "react"
import {
  IconChartBar,
  IconDashboard,
  IconCreditCard,
  IconWallet,
  IconReceipt,
  IconSettings,
  IconLogout,
  IconInnerShadowTop,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: IconDashboard,
    },
    {
      title: "Transactions",
      url: "#",
      icon: IconReceipt,
    },
    {
      title: "Accounts",
      url: "/accounts",
      icon: IconWallet,
    },
  ],
}

export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & { user?: { name: string; email: string; avatar?: string } }) {
  const defaultUser = {
    name: "User",
    email: "user@example.com",
    avatar: "/avatars/user.jpg",
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="#" className="flex items-center gap-2">
                <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                    <path d="M7 2h10"></path>
                    <path d="M5 6h14"></path>
                    <rect width="18" height="12" x="3" y="10" rx="2"></rect>
                  </svg>
                </div>
                <span className="text-base font-semibold">Spending Tracker</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="pt-2">
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user || defaultUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
