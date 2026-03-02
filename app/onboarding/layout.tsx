import { ReactNode } from "react";
import Image from "next/image";
import { Logo } from "../Logo";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen relative flex w-full">
      <div className="relative hidden lg:block w-1/2">
        <Image
          src="/side-background.jpg"
          alt="side background"
          fill
          sizes="50vw"
          priority
          className="object-cover pointer-events-none"
        />

        <div className="relative z-10 flex h-full flex-col justify-between p-10">
          <div className="flex items-center gap-4">
            <Logo />
            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">The Web Room</h1>
          </div>

          <blockquote className="text-left md:text-xl leading-normal">
            &quot;Never thought it was possible to have such a large community, but here we
            are.&quot;
            <span className="mt-2 block opacity-80">- Dale Larrison (Founder)</span>
          </blockquote>
        </div>
      </div>

      <div className="relative flex w-full lg:w-1/2 items-center justify-center p-6">
        {children}
      </div>
    </div>
  );
}
