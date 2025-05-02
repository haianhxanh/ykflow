"use client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@radix-ui/react-dropdown-menu";
import {
  Home,
  Inbox,
  Calendar,
  Search,
  Settings,
  ChevronUp,
  User2,
} from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";

// TODO: menu items
const items = [
  {
    title: "Úvod",
    url: "#",
    icon: Home,
  },
  {
    title: "Detaily firmy", // company details
    url: "#",
    icon: Inbox,
  },
  {
    title: "Pro zákazníky", // for customers
    url: "#",
    icon: Calendar,
  },
  {
    title: "Propojení", // integartions
    url: "#",
    icon: Search,
  },
  {
    title: "Statistiky", // stats
    url: "#",
    icon: Settings,
  },
  {
    title: "Podmínky", // terms & conditions
    url: "#",
    icon: Settings,
  },
  {
    title: "Profily mazlíčků", // pet profiles
    url: "#",
    icon: Settings,
  },
  {
    title: "Kontakt",
    url: "#",
    icon: Settings,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith("/auth");
  if (isAuthPage) return null;

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* TODO: adjust */}
            <div className="mt-2 ml-2 flex items-center">
              <Image src="/logo.svg" alt="yk logo" width="200" height="50" />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {/* TODO: make this svg */}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <User2 /> IncredibleClinic
                  <ChevronUp className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width]"
              >
                <DropdownMenuItem>
                  {/* TODO: to be implemented */}
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
