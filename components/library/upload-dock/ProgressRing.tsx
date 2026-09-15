import { AlertIcon, CheckIcon } from "@/components/ui/icons";

type Props = {
  percent: number;
  done: boolean;
  failed: boolean;
};

const RADIUS = 13;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Circular batch progress; turns into a tick or an alert when settled. */
export default function ProgressRing({ percent, done, failed }: Props) {
  if (done) {
    return (
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-white">
        <CheckIcon className="h-4 w-4" />
      </span>
    );
  }

  if (failed) {
    return (
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-danger/15 text-danger">
        <AlertIcon className="h-4.5 w-4.5" />
      </span>
    );
  }

  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0 -rotate-90">
      <circle cx="16" cy="16" r={RADIUS} fill="none" stroke="var(--fill-strong)" strokeWidth="3" />
      <circle
        cx="16"
        cy="16"
        r={RADIUS}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - percent / 100)}
        style={{ transition: "stroke-dashoffset .3s ease" }}
      />
    </svg>
  );
}
