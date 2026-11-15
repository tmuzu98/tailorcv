import {
  RESUME_ADDITION_LIMITS,
  resumeHasSkill,
  type AddableBasicsField,
  type Resume,
  type ResumeAdditions,
} from "@tailorcv/shared";
import type { ReactNode } from "react";
import { AddCertification } from "./AddCertification";
import { InlineAdd } from "./InlineAdd";

const LIMITS = RESUME_ADDITION_LIMITS;

/**
 * Compact summary of the parsed resume for the review step (D-85): one line per job, school,
 * project and certification, with the long text (bullet points, details) folded away, plus
 * "+ Add" controls for things the PDF didn't have. `resume` is what was read from the PDF and is
 * never changed here; everything the user adds lives in `additions` and can be removed again.
 * All values are rendered as plain text.
 */
export function ResumeSummary({
  resume,
  additions,
  onChange,
}: {
  resume: Resume;
  additions: ResumeAdditions;
  onChange: (additions: ResumeAdditions) => void;
}) {
  const { basics } = resume;
  const links = basics.links.filter((link) => isFilled(link.url));
  const skillGroups = resume.skills.filter((group) => group.items.length > 0);
  const skillCount = skillGroups.reduce((n, group) => n + group.items.length, 0);
  const otherSections = resume.additionalSections.filter((section) => section.items.length > 0);

  const setBasics = (field: AddableBasicsField, value: string | undefined) =>
    onChange({ ...additions, basics: { ...additions.basics, [field]: value } });

  const addSkill = (skill: string) => {
    const already =
      resumeHasSkill(resume, skill) ||
      additions.skills.some((s) => s.toLowerCase() === skill.toLowerCase());
    if (already) return `"${skill}" is already listed.`;
    if (additions.skills.length >= LIMITS.maxSkills) {
      return `You can add up to ${LIMITS.maxSkills} skills.`;
    }
    onChange({ ...additions, skills: [...additions.skills, skill] });
    return null;
  };

  const addBullet = (experienceId: string, text: string) => {
    if (additions.bullets.length >= LIMITS.maxBullets) {
      return `You can add up to ${LIMITS.maxBullets} bullet points.`;
    }
    onChange({ ...additions, bullets: [...additions.bullets, { experienceId, text }] });
    return null;
  };

  const contactRow = (field: AddableBasicsField, label: string, placeholder: string) => {
    const parsed = basics[field];
    const added = additions.basics[field];
    return (
      <Row label={label}>
        {isFilled(parsed) ? (
          parsed
        ) : isFilled(added) ? (
          <Added
            label={`Remove ${label.toLowerCase()}`}
            onRemove={() => setBasics(field, undefined)}
          >
            {added}
          </Added>
        ) : (
          <InlineAdd
            label={`Add ${label.toLowerCase()}`}
            placeholder={placeholder}
            maxLength={LIMITS.maxFieldChars}
            onAdd={(value) => {
              setBasics(field, value);
              return null;
            }}
          />
        )}
      </Row>
    );
  };

  return (
    <div className="divide-y divide-slate-200">
      <Section title="Contact">
        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <Row label="Name">{basics.fullName}</Row>
          {contactRow("headline", "Headline", "e.g. Senior Frontend Engineer")}
          {contactRow("email", "Email", "you@example.com")}
          {contactRow("phone", "Phone", "Phone number")}
          {contactRow("location", "Location", "City, State")}
          {links.length > 0 && (
            <Row label="Links">
              <span className="break-all">{links.map((link) => link.url).join(" · ")}</span>
            </Row>
          )}
        </dl>
        {isFilled(basics.summary) && (
          <Fold label={`Summary (${countWords(basics.summary)} words)`}>
            <p className="mt-1 text-sm text-slate-700">{basics.summary}</p>
          </Fold>
        )}
      </Section>

      <Section title="Experience" count={resume.experience.length}>
        {resume.experience.length === 0 && <Empty>No work experience found in your PDF.</Empty>}
        {resume.experience.map((job) => {
          const added = additions.bullets
            .map((bullet, index) => ({ ...bullet, index }))
            .filter((bullet) => bullet.experienceId === job.id);
          return (
            <Item
              key={job.id}
              title={job.title}
              detail={joinFilled([job.company, job.location])}
              dates={dateRange(job.startDate, job.endDate)}
            >
              <FoldedList
                label={plural(job.bullets.length, "bullet point", "bullet points")}
                items={job.bullets}
              />
              {added.length > 0 && (
                <ul className="space-y-1 text-sm text-slate-700">
                  {added.map((bullet) => (
                    <li key={bullet.index}>
                      <Added
                        label={`Remove bullet point: ${bullet.text}`}
                        onRemove={() =>
                          onChange({
                            ...additions,
                            bullets: additions.bullets.filter((_, i) => i !== bullet.index),
                          })
                        }
                      >
                        {bullet.text}
                      </Added>
                    </li>
                  ))}
                </ul>
              )}
              <InlineAdd
                label={`Add a bullet point to ${job.title}`}
                placeholder="Something you did in this job that your resume doesn't mention"
                maxLength={LIMITS.maxBulletChars}
                onAdd={(text) => addBullet(job.id, text)}
              />
            </Item>
          );
        })}
      </Section>

      <Section title="Education" count={resume.education.length}>
        {resume.education.length === 0 && <Empty>No education found in your PDF.</Empty>}
        {resume.education.map((school) => (
          <Item
            key={school.id}
            title={school.institution}
            detail={joinFilled([school.degree, school.field])}
            dates={dateRange(school.startDate, school.endDate)}
          >
            <FoldedList
              label={plural(school.details.length, "detail", "details")}
              items={school.details}
            />
          </Item>
        ))}
      </Section>

      <Section title="Skills" count={skillCount + additions.skills.length}>
        {skillCount === 0 && additions.skills.length === 0 && (
          <Empty>No skills found in your PDF.</Empty>
        )}
        {skillGroups.length > 0 && (
          <dl className="space-y-1 text-sm">
            {skillGroups.map((group) => (
              <div key={group.id}>
                <dt className="inline font-medium text-slate-900">{group.category}: </dt>
                <dd className="inline text-slate-700">{group.items.join(", ")}</dd>
              </div>
            ))}
          </dl>
        )}
        {additions.skills.length > 0 && (
          <ul aria-label="Skills you added" className="flex flex-wrap gap-2 text-sm text-slate-700">
            {additions.skills.map((skill) => (
              <li key={skill} className="rounded-full border border-indigo-200 bg-indigo-50 px-3">
                <Added
                  badge={false}
                  label={`Remove skill: ${skill}`}
                  onRemove={() =>
                    onChange({ ...additions, skills: additions.skills.filter((s) => s !== skill) })
                  }
                >
                  {skill}
                </Added>
              </li>
            ))}
          </ul>
        )}
        <InlineAdd
          label="Add a skill"
          placeholder="A skill you have that isn't listed"
          maxLength={LIMITS.maxSkillChars}
          onAdd={addSkill}
        />
      </Section>

      {resume.projects.length > 0 && (
        <Section title="Projects" count={resume.projects.length}>
          {resume.projects.map((project) => (
            <Item
              key={project.id}
              title={project.name}
              detail={joinFilled([project.technologies.join(", "), project.url])}
            >
              {isFilled(project.description) && (
                <p className="text-sm text-slate-700">{project.description}</p>
              )}
              <FoldedList
                label={plural(project.bullets.length, "bullet point", "bullet points")}
                items={project.bullets}
              />
            </Item>
          ))}
        </Section>
      )}

      <Section
        title="Certifications"
        count={resume.certifications.length + additions.certifications.length}
      >
        {(resume.certifications.length > 0 || additions.certifications.length > 0) && (
          <ul className="space-y-1 text-sm text-slate-700">
            {resume.certifications.map((cert) => (
              <li key={cert.id}>{joinFilled([cert.name, cert.issuer, cert.date])}</li>
            ))}
            {additions.certifications.map((cert, index) => (
              <li key={`added_${index}`}>
                <Added
                  label={`Remove certification: ${cert.name}`}
                  onRemove={() =>
                    onChange({
                      ...additions,
                      certifications: additions.certifications.filter((_, i) => i !== index),
                    })
                  }
                >
                  {joinFilled([cert.name, cert.issuer, cert.date])}
                </Added>
              </li>
            ))}
          </ul>
        )}
        <AddCertification
          onAdd={(cert) => {
            if (additions.certifications.length >= LIMITS.maxCertifications) {
              return `You can add up to ${LIMITS.maxCertifications} certifications.`;
            }
            onChange({ ...additions, certifications: [...additions.certifications, cert] });
            return null;
          }}
        />
      </Section>

      {otherSections.length > 0 && (
        <Section title="Other">
          <dl className="space-y-1 text-sm">
            {otherSections.map((section) => (
              <div key={section.id}>
                <dt className="inline font-medium text-slate-900">{section.title}: </dt>
                <dd className="inline text-slate-700">{section.items.join(", ")}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}
    </div>
  );
}

const isFilled = (value: string | undefined): value is string =>
  value !== undefined && value.trim() !== "";
const joinFilled = (values: (string | undefined)[]) => values.filter(isFilled).join(" · ");
const dateRange = (start: string | undefined, end: string | undefined) =>
  [start, end].filter(isFilled).join(" – ");
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const countWords = (text: string) => text.trim().split(/\s+/).length;

function Section(props: { title: string; count?: number; children: ReactNode }) {
  return (
    <section aria-label={props.title} className="py-4 first:pt-0 last:pb-0">
      <h2 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
        {props.count === undefined ? props.title : `${props.title} (${props.count})`}
      </h2>
      <div className="mt-2 space-y-3">{props.children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-20 shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 flex-1 text-slate-900">{children}</dd>
    </div>
  );
}

/** One line per entry: title · detail on the left, dates on the right, extras below. */
function Item(props: { title: string; detail?: string; dates?: string; children?: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <p className="min-w-0 text-sm break-words">
          <span className="font-medium text-slate-900">{props.title}</span>
          {isFilled(props.detail) && <span className="text-slate-600"> · {props.detail}</span>}
        </p>
        {isFilled(props.dates) && <p className="text-sm text-slate-500">{props.dates}</p>}
      </div>
      {props.children}
    </div>
  );
}

function Fold({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-slate-600 hover:text-slate-900">{label}</summary>
      {children}
    </details>
  );
}

function FoldedList({ label, items }: { label: string; items: { id: string; text: string }[] }) {
  const filled = items.filter((item) => isFilled(item.text));
  if (filled.length === 0) return null;
  return (
    <Fold label={label}>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">
        {filled.map((item) => (
          <li key={item.id}>{item.text}</li>
        ))}
      </ul>
    </Fold>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}

/** Something the user added: marked as theirs, with a remove button. */
function Added(props: {
  label: string;
  onRemove: () => void;
  badge?: boolean;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2">
      <span>{props.children}</span>
      {props.badge !== false && (
        <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-xs text-indigo-700">
          Added by you
        </span>
      )}
      <button
        type="button"
        aria-label={props.label}
        onClick={props.onRemove}
        className="rounded text-xs text-slate-500 underline hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        Remove
      </button>
    </span>
  );
}
