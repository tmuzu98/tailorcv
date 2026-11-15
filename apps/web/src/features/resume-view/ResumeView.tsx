import type { Resume } from "@tailorcv/shared";
import type { ReactNode } from "react";

/**
 * Read-only view of a `Resume` (FE-4). Shows every section that has content and skips the empty
 * ones, so it works for sparse resumes too. Reused later for the tailored preview (Day 16).
 * All values are rendered as plain text: nothing from the resume is ever treated as HTML or as
 * a link target.
 */
export function ResumeView({ resume }: { resume: Resume }) {
  const { basics } = resume;
  const contact = [basics.email, basics.phone, basics.location].filter(isFilled);
  const links = basics.links.filter((link) => isFilled(link.url));
  const skills = resume.skills.filter((group) => group.items.length > 0);
  const additional = resume.additionalSections.filter((section) => section.items.length > 0);

  return (
    <article aria-label={`Resume of ${basics.fullName}`} className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">{basics.fullName}</h2>
        {isFilled(basics.headline) && <p className="text-slate-700">{basics.headline}</p>}
        {contact.length > 0 && (
          <ul aria-label="Contact details" className={`mt-2 ${INLINE_LIST}`}>
            {contact.map((value) => (
              <li key={value}>{value}</li>
            ))}
          </ul>
        )}
        {links.length > 0 && (
          <ul aria-label="Links" className={`mt-1 ${INLINE_LIST}`}>
            {links.map((link) => (
              <li key={`${link.label}:${link.url}`}>
                {isFilled(link.label) && <span className="text-slate-500">{link.label}: </span>}
                <span className="break-all">{link.url}</span>
              </li>
            ))}
          </ul>
        )}
      </header>

      {isFilled(basics.summary) && (
        <Section title="Summary">
          <p className="text-sm text-slate-700">{basics.summary}</p>
        </Section>
      )}

      {resume.experience.length > 0 && (
        <Section title="Experience">
          {resume.experience.map((job) => (
            <Entry
              key={job.id}
              title={job.title}
              subtitle={joinFilled([job.company, job.location])}
              dates={dateRange(job.startDate, job.endDate)}
            >
              <Bullets items={job.bullets} />
            </Entry>
          ))}
        </Section>
      )}

      {resume.education.length > 0 && (
        <Section title="Education">
          {resume.education.map((school) => (
            <Entry
              key={school.id}
              title={school.institution}
              subtitle={joinFilled([school.degree, school.field])}
              dates={dateRange(school.startDate, school.endDate)}
            >
              <Bullets items={school.details} />
            </Entry>
          ))}
        </Section>
      )}

      {skills.length > 0 && (
        <Section title="Skills">
          <dl className="space-y-2 text-sm">
            {skills.map((group) => (
              <div key={group.id} className="sm:flex sm:gap-2">
                <dt className="shrink-0 font-medium text-slate-900">{group.category}:</dt>
                <dd className="text-slate-700">{group.items.join(", ")}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      {resume.projects.length > 0 && (
        <Section title="Projects">
          {resume.projects.map((project) => (
            <Entry key={project.id} title={project.name} subtitle={project.url}>
              {isFilled(project.description) && (
                <p className="mt-1 text-sm text-slate-700">{project.description}</p>
              )}
              <Bullets items={project.bullets} />
              {project.technologies.length > 0 && (
                <p className="mt-1 text-sm text-slate-600">
                  <span className="font-medium text-slate-900">Technologies:</span>{" "}
                  {project.technologies.join(", ")}
                </p>
              )}
            </Entry>
          ))}
        </Section>
      )}

      {resume.certifications.length > 0 && (
        <Section title="Certifications">
          <ul className="space-y-1 text-sm text-slate-700">
            {resume.certifications.map((cert) => (
              <li key={cert.id}>
                <span className="font-medium text-slate-900">{cert.name}</span>
                {joinFilled([cert.issuer, cert.date]) && (
                  <span> · {joinFilled([cert.issuer, cert.date])}</span>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {additional.map((section) => (
        <Section key={section.id} title={section.title}>
          <ul className={BULLET_LIST}>
            {section.items.map((item, index) => (
              <li key={`${section.id}_${index}`}>{item}</li>
            ))}
          </ul>
        </Section>
      ))}
    </article>
  );
}

const INLINE_LIST = "flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600";
const BULLET_LIST = "mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700";

const isFilled = (value: string | undefined): value is string =>
  value !== undefined && value.trim() !== "";

const joinFilled = (values: (string | undefined)[]) => values.filter(isFilled).join(" · ");

/** "Jan 2021 – Present", or just the one date the resume gives. */
function dateRange(start: string | undefined, end: string | undefined) {
  return [start, end].filter(isFilled).join(" – ");
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="border-t border-slate-200 pt-4">
      <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">{title}</h3>
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  );
}

function Entry(props: { title: string; subtitle?: string; dates?: string; children?: ReactNode }) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <p className="font-medium text-slate-900">{props.title}</p>
        {isFilled(props.dates) && <p className="text-sm text-slate-500">{props.dates}</p>}
      </div>
      {isFilled(props.subtitle) && (
        <p className="text-sm break-words text-slate-600">{props.subtitle}</p>
      )}
      {props.children}
    </div>
  );
}

function Bullets({ items }: { items: { id: string; text: string }[] }) {
  const filled = items.filter((item) => isFilled(item.text));
  if (filled.length === 0) return null;
  return (
    <ul className={BULLET_LIST}>
      {filled.map((item) => (
        <li key={item.id}>{item.text}</li>
      ))}
    </ul>
  );
}
