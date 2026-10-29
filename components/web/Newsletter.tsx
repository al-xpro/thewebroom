import { PlaceholdersAndVanishInput } from "../ui/placeholder-vanish-input";

export default function Newsletter() {
  return (
    <section className="relative divider-fade-top py-10 space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor="newsletter-email" className="type-label">Newsletter</label>
        <p className="type-meta">New posts, now and then.</p>
      </div>
      <PlaceholdersAndVanishInput placeholder="Email" className="w-full" id="newsletter-email" />
    </section>
  );
}
