import { FadeImage } from "@/components/ui/fade-image";
import { Logo } from "@/app/Logo";

// The image half of the auth and onboarding pages, on large screens.
export function AuthSidePanel() {
  return (
    <div className="relative hidden lg:block w-1/2 bg-[#EDEDED] dark:bg-[#0A0A0A]">
      <FadeImage
        src="/side-background.jpg"
        alt=""
        fill
        sizes="50vw"
        priority
        className="object-cover pointer-events-none"
      />
      <div className="relative z-10 flex h-full flex-col justify-between p-10">
        <div className="flex items-center gap-3">
          <Logo />
          <p className="type-title">The Web Room</p>
        </div>
        <p className="text-xl font-light">Read and write about the web.</p>
      </div>
    </div>
  );
}
