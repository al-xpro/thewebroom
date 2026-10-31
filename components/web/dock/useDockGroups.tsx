import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Bookmark,
  BookUser,
  Bot,
  LogIn,
  Pencil,
  PenLine,
  ScrollText,
  Search,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { NavbarDataBlog } from "@/lib/data";
import { Kbd } from "@/components/ui/kbd";
import type { DockEntry, DockGroup } from "./types";

const onPage = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

interface Options {
  pathname: string;
  isAuthenticated: boolean;
  unreadNotifications: number;
  onSearch: () => void;
  // Called when a group opens or closes, before the items change.
  onSwitch: () => void;
}

// The dock shows a few items; related ones sit in a group that branches out in place, with
// a back button, so the dock never needs more room. A group stays open while you move
// between its pages, and closes only with the back button.
export function useDockGroups({ pathname, isAuthenticated, unreadNotifications, onSearch, onSwitch }: Options) {
  const [group, setGroup] = useState<DockGroup | null>(null);
  // Labels are hidden while the dock changes size: they're placed against its left edge,
  // which moves as the dock grows or shrinks.
  const [isSwitchingGroup, setIsSwitchingGroup] = useState(false);

  const openGroup = (next: DockGroup | null) => {
    setGroup(next);
    setIsSwitchingGroup(true);
    onSwitch();
  };
  useEffect(() => {
    if (!isSwitchingGroup) return;
    const t = setTimeout(() => setIsSwitchingGroup(false), 350);
    return () => clearTimeout(t);
  }, [isSwitchingGroup, group]);

  const groups: Record<DockGroup, DockEntry[]> = {
    write: [
      { key: "create", label: "Create", icon: Pencil, href: "/create" },
      { key: "agents", label: "Agents", icon: Bot, href: "/mcp" },
      { key: "rules", label: "Rules", icon: ScrollText, href: "/rules" },
    ],
    people: [
      { key: "following", label: "Following", icon: UserPlus, href: "/following" },
      { key: "community", label: "Community", icon: Users, href: "/community" },
    ],
    you: isAuthenticated
      ? [
          { key: "profile", label: "Profile", icon: User, href: "/profile", avatar: true },
          { key: "notifications", label: "Notifications", icon: Bell, href: "/notifications", dot: unreadNotifications > 0 },
          { key: "my-posts", label: "My posts", icon: BookUser, href: "/my-posts" },
          { key: "reading-list", label: "Reading list", icon: Bookmark, href: "/reading-list" },
        ]
      : [
          { key: "login", label: "Log in", icon: LogIn, href: "/auth/login" },
          { key: "sign-up", label: "Sign up", icon: UserPlus, href: "/auth/sign-up" },
        ],
  };

  // Landing on a page that belongs to a group (a link, a reload) opens that group.
  const pageGroup = (Object.keys(groups) as DockGroup[]).find((key) =>
    groups[key].some((child) => child.href && onPage(pathname, child.href))
  );
  const [groupPath, setGroupPath] = useState<string | null>(null);
  if (groupPath !== pathname) {
    setGroupPath(pathname);
    if (pageGroup && pageGroup !== group) setGroup(pageGroup);
  }

  const entries: DockEntry[] = group
    ? [{ key: "back", label: "Back", icon: ArrowLeft, onClick: () => openGroup(null) }, ...groups[group]]
    : [
        ...NavbarDataBlog.map((item) => ({ key: item.href, label: item.label, icon: item.icon, href: item.href })),
        {
          key: "search",
          label: (
            <div key="search-label">
              Search &nbsp;<Kbd>⌘</Kbd> <Kbd>K</Kbd>
            </div>
          ),
          icon: Search,
          onClick: onSearch,
        },
        { key: "write", label: "Write", icon: PenLine, group: "write" },
        { key: "people", label: "People", icon: Users, group: "people" },
        { key: "you", label: isAuthenticated ? "You" : "Account", icon: User, group: "you", avatar: true, dot: unreadNotifications > 0 },
      ];

  const isActive = (entry: DockEntry) =>
    entry.href
      ? entry.href === "/"
        ? pathname === "/"
        : onPage(pathname, entry.href)
      : entry.group
        ? groups[entry.group].some((child) => child.href && onPage(pathname, child.href))
        : false;

  return { group, openGroup, entries, isActive, isSwitchingGroup };
}
