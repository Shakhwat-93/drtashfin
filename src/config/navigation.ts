import {
  LayoutDashboard,
  Users,
  Stethoscope,
  CalendarClock,
  FlaskConical,
  FileText,
  FolderOpen,
  Activity,
  BarChart3,
  ShieldCheck,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

export interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

export const NAVIGATION_SECTIONS: NavigationSection[] = [
  {
    title: "OVERVIEW",
    items: [
      {
        name: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
        exact: true,
      },
    ],
  },
  {
    title: "PATIENTS",
    items: [
      {
        name: "Patients",
        href: "/patients",
        icon: Users,
      },
      {
        name: "Consultations",
        href: "/consultations",
        icon: Stethoscope,
      },
      {
        name: "Follow-ups",
        href: "/follow-ups",
        icon: CalendarClock,
      },
    ],
  },
  {
    title: "CLINICAL",
    items: [
      {
        name: "Investigations",
        href: "/investigations",
        icon: FlaskConical,
      },
      {
        name: "Prescriptions",
        href: "/prescriptions",
        icon: FileText,
      },
      {
        name: "Documents",
        href: "/documents",
        icon: FolderOpen,
      },
    ],
  },
  {
    title: "PROCEDURES",
    items: [
      {
        name: "Operations",
        href: "/operations",
        icon: Activity,
      },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      {
        name: "Reports",
        href: "/reports",
        icon: BarChart3,
      },
      {
        name: "Audit Logs",
        href: "/audit-logs",
        icon: ShieldCheck,
      },
      {
        name: "Settings",
        href: "/settings",
        icon: Settings,
      },
    ],
  },
];
