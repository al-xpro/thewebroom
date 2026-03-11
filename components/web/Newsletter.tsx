import { FieldLabel } from "../ui/field";
import { PlaceholdersAndVanishInput } from "../ui/placeholder-vanish-input";

export default function Newsletter() {
  return (
    <section className="relative flex-1 flex flex-col items-start justify-center text-center gap-5 py-5">
      <div className="flex flex-col w-full h-full items-center justify-start py-4 px-6 sm:px-8 gap-5 rounded-4xl bg-[#EDEDED] dark:bg-[#0A0A0A]">
        <div className="flex w-full items-center justify-between pb-4">
          <FieldLabel className="text-md text-lg md:text-2xl font-semibold text-left" htmlFor="email">Newsletter</FieldLabel>
          <p className="text-left md:text-xl leading-normal text-paragraph">Over 100+ devs</p>
        </div>

        <div className="flex flex-col w-full items-start justify-between gap-5">
          <PlaceholdersAndVanishInput placeholder="Email address" className="w-full" id="email" />
        </div>

        <div>
          <p className="text-left pt-4 text-lg leading-normal text-paragraph">
            Love reading? Sign up for our newsletter to receive the latest updates on web
            development and more!
          </p>
        </div>
      </div>
    </section>
  );
}
