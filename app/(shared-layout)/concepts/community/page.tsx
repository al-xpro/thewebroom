import { TOPICS } from "@/convex/topics";
import { activity, avatar, people } from "../data";

// Who writes here and what's happening: members, who's online, recent activity, topics.
export default function CommunityConcept() {
  const online = people.filter((p) => p.online);
  return (
    <>
      <div className="flex items-end justify-between gap-4 py-10">
        <h1 className="type-display">Community</h1>
        <p className="type-meta inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-[#3FA35B]" /> {online.length} here now
        </p>
      </div>

      <section className="section-minimal">
        <h2 className="type-label">Writers</h2>
        <ul className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          {people.map((p) => (
            <li key={p.handle} className="flex items-center gap-3">
              <span className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatar(p.handle)} alt="" className="size-9 rounded-full" />
                {p.online && <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-white bg-[#3FA35B] dark:border-black" />}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="type-meta text-xs truncate">{p.bio}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="section-minimal">
        <h2 className="type-label">Lately</h2>
        <ul className="space-y-3">
          {activity.map((a, i) => (
            <li key={i} className="flex items-baseline justify-between gap-4 text-sm">
              <p className="font-light text-[#666666] dark:text-[#A0A0A0]">
                <span className="font-medium text-black dark:text-white">{people.find((p) => p.handle === a.who)?.name}</span>{" "}
                {a.text} <span className="text-black dark:text-white">{a.target}</span>
              </p>
              <span className="type-meta text-xs shrink-0">{a.when}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="section-minimal">
        <h2 className="type-label">Topics</h2>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((t, i) => (
            <span key={t} className="rounded-full bg-black/5 px-3 py-1.5 text-sm dark:bg-white/10">
              {t} <span className="type-meta text-xs tabular-nums">{[38, 24, 17, 9][i]}</span>
            </span>
          ))}
        </div>
      </section>
    </>
  );
}
