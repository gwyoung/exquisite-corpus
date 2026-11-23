import type { Requirement } from "@/lib/utils/validation";

type Props = {
  id: string;
  requirements: Requirement[];
  /** After a failed submit, unmet requirements are shown as errors. */
  showErrors: boolean;
};

/** A live checklist of field requirements; each item ticks off once it's met. */
const RequirementList = ({ id, requirements, showErrors }: Props) => (
  <ul id={id} className="mt-1.5 space-y-0.5 text-sm" aria-live="polite">
    {requirements.map(({ label, met }) => (
      <li
        key={label}
        className={met ? "text-green-700" : showErrors ? "text-red-700" : "text-stone-500"}
      >
        <span aria-hidden="true">{met ? "✓" : showErrors ? "✗" : "○"}</span>{" "}
        {label}
        <span className="sr-only">{met ? " (met)" : " (not met yet)"}</span>
      </li>
    ))}
  </ul>
);

export default RequirementList;
