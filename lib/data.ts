import { BookUser, HomeIcon, LibraryBig, LogIn, User, UserPlus } from "lucide-react";

export const NavbarDataBlog = [
  { href: "/", icon: HomeIcon, label: "Home" },
  { href: "/posts", icon: LibraryBig, label: "Posts" },
];

// If the user is authenticated

export const NavbarDataUser = [
  { href: "/my-posts", icon: BookUser, label: "My Posts" },
  { href: "/profile", icon: User, label: "Profile" },
];

// If the user is not authenticated
export const NavbarDataUnauth = [
  { href: "/auth/login", icon: LogIn, label: "Login" },
  { href: "/auth/sign-up", icon: UserPlus, label: "Sign Up" },
];



// Posts page

export const Topics = [
  "Web Architecture",
  "UI Engineering",
  "AI for Developers",
  "Productivity",
];