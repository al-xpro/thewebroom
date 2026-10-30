import Link from "next/link";
import { withNext } from "@/lib/next-path";

// For personal pages viewed signed out.
export function SignInPrompt({ title, text, next }: { title: string; text: string; next: string }) {
  return (
    <div className="space-y-3 py-10">
      <h1 className="type-display">{title}</h1>
      <p className="type-body">
        {text}{" "}
        <Link href={withNext("/auth/login", next)} className="underline underline-offset-4 text-black dark:text-white">
          Log in
        </Link>{" "}
        or{" "}
        <Link href={withNext("/auth/sign-up", next)} className="underline underline-offset-4 text-black dark:text-white">
          sign up
        </Link>
        .
      </p>
    </div>
  );
}
