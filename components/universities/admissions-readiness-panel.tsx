"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarPlus,
  CheckCircle2,
  CircleHelp,
  Clock3,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLearnerProfile, type LearnerProfile } from "@/lib/learner/store";
import { ADMISSIONS_TESTS } from "@/lib/universities/admissions-data";
import {
  evaluateAdmissionsReadiness,
  findAdmissionsPolicy,
  findNextBookableTestSession,
} from "@/lib/universities/admissions-readiness";
import type {
  AdmissionsRequirementState,
  AdmissionsTestId,
  AdmissionsTestSession,
  ApplicantRoute,
  ApplicantType,
  UniversityApplication,
} from "@/lib/universities/types";

interface AdmissionsReadinessPanelProps {
  institutionId: string;
  programmeId: string;
  intakeYear: number;
  applicantRoute: ApplicantRoute;
  applicantType?: ApplicantType;
  profile?: LearnerProfile | null;
  application?: UniversityApplication;
  forcePersonalized?: boolean;
  onAddTestPlan?: (
    testId: AdmissionsTestId,
    testName: string,
    session: AdmissionsTestSession,
  ) => void;
}

const STATE_STYLES: Record<AdmissionsRequirementState, string> = {
  SATISFIED_APPEARS: "bg-emerald-50 text-emerald-800",
  LIKELY_SATISFIED: "bg-emerald-50 text-emerald-800",
  ACTION_NEEDED: "bg-rose-50 text-rose-800",
  ACTION_REQUIRED: "bg-rose-50 text-rose-800",
  TEST_REQUIRED: "bg-rose-50 text-rose-800",
  TEST_RECOMMENDED: "bg-amber-50 text-amber-900",
  POSSIBLE_EXEMPTION: "bg-sky-50 text-sky-800",
  MISSING_INFORMATION: "bg-amber-50 text-amber-900",
  OPTIONAL: "bg-sky-50 text-sky-800",
  NOT_REQUIRED: "bg-emerald-50 text-emerald-800",
  NOT_APPLICABLE: "bg-slate-100 text-slate-700",
  NEEDS_VERIFICATION: "bg-amber-50 text-amber-900",
  CONFLICTING_INFORMATION: "bg-rose-50 text-rose-800",
  UNKNOWN: "bg-slate-100 text-slate-700",
};

const STATE_LABELS: Record<AdmissionsRequirementState, string> = {
  SATISFIED_APPEARS: "Appears satisfied",
  LIKELY_SATISFIED: "Likely satisfied",
  ACTION_NEEDED: "Action needed",
  ACTION_REQUIRED: "Action required",
  TEST_REQUIRED: "Test required",
  TEST_RECOMMENDED: "Test recommended",
  POSSIBLE_EXEMPTION: "Possible exemption",
  MISSING_INFORMATION: "Information needed",
  OPTIONAL: "Optional",
  NOT_REQUIRED: "Not required",
  NOT_APPLICABLE: "Not applicable",
  NEEDS_VERIFICATION: "Needs verification",
  CONFLICTING_INFORMATION: "Conflicting information",
  UNKNOWN: "Unknown",
};

function StateIcon({ state }: { state: AdmissionsRequirementState }) {
  if (["SATISFIED_APPEARS", "LIKELY_SATISFIED", "NOT_REQUIRED"].includes(state))
    return <CheckCircle2 className="h-4 w-4" />;
  if (
    [
      "ACTION_NEEDED",
      "ACTION_REQUIRED",
      "TEST_REQUIRED",
      "CONFLICTING_INFORMATION",
    ].includes(state)
  )
    return <AlertCircle className="h-4 w-4" />;
  if (
    ["MISSING_INFORMATION", "TEST_RECOMMENDED", "NEEDS_VERIFICATION"].includes(
      state,
    )
  )
    return <Clock3 className="h-4 w-4" />;
  return <CircleHelp className="h-4 w-4" />;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function AdmissionsReadinessPanel({
  institutionId,
  programmeId,
  intakeYear,
  applicantRoute,
  applicantType,
  profile: suppliedProfile,
  application,
  forcePersonalized = false,
  onAddTestPlan,
}: AdmissionsReadinessPanelProps) {
  const { isGuest } = useAuth();
  const [localProfile, setLocalProfile] = useState<LearnerProfile | null>(
    suppliedProfile ?? null,
  );

  useEffect(() => {
    if (suppliedProfile !== undefined) setLocalProfile(suppliedProfile);
    else setLocalProfile(getLearnerProfile());
  }, [suppliedProfile]);

  const policy = useMemo(
    () =>
      findAdmissionsPolicy({
        institutionId,
        programmeId,
        intakeYear,
        applicantRoute,
        applicantType,
      }),
    [applicantRoute, applicantType, institutionId, intakeYear, programmeId],
  );
  const readiness = useMemo(
    () =>
      evaluateAdmissionsReadiness({
        profile: localProfile,
        institutionId,
        programmeId,
        intakeYear,
        applicantRoute,
        applicantType,
        application,
      }),
    [
      applicantRoute,
      applicantType,
      application,
      institutionId,
      intakeYear,
      localProfile,
      programmeId,
    ],
  );
  const showPersonalized = forcePersonalized || !isGuest;

  if (!showPersonalized) {
    return (
      <Card className="p-5">
        <h2 className="text-xl font-semibold text-slate-950">
          Published admissions requirements
        </h2>
        {policy ? (
          <div className="mt-4 space-y-4">
            {policy.english ? (
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {policy.english.label}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Accepted routes include{" "}
                  {policy.english.exemptions
                    .map(
                      (rule) =>
                        `${rule.curriculum} ${rule.subjectNames.join(" or ")}`,
                    )
                    .join("; ")}{" "}
                  and published English tests.
                </p>
              </div>
            ) : null}
            {policy.admissionsTests?.map((requirement) => (
              <div key={requirement.id}>
                <p className="text-sm font-semibold text-slate-900">
                  {requirement.label}{" "}
                  <span
                    className={`ml-2 rounded px-2 py-0.5 text-xs ${requirement.requiredness === "REQUIRED" ? STATE_STYLES.ACTION_NEEDED : STATE_STYLES.OPTIONAL}`}
                  >
                    {requirement.requiredness.toLowerCase().replace(/_/g, " ")}
                  </span>
                </p>
              </div>
            ))}
            <a
              href={policy.source.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-sky-700"
            >
              Official policy · Verified {formatDate(policy.source.lastVerifiedAt)}
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            No verified policy is structured for this exact programme, route,
            and intake. Unknown does not mean not required.
          </p>
        )}
        <p className="mt-4 text-sm text-slate-600">
          <Link href="/auth/login" className="font-medium text-sky-700">
            Sign in
          </Link>{" "}
          to compare these rules with your academic profile.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-sky-700">
            Admissions readiness
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            What you still need
          </h2>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold ${readiness.state === "READY_APPEARS" ? STATE_STYLES.SATISFIED_APPEARS : readiness.state === "ACTION_NEEDED" ? STATE_STYLES.ACTION_NEEDED : readiness.state === "MISSING_INFORMATION" ? STATE_STYLES.MISSING_INFORMATION : STATE_STYLES.UNKNOWN}`}
        >
          {readiness.state === "READY_APPEARS"
            ? "No known gaps"
            : readiness.state.toLowerCase().replace(/_/g, " ")}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        For {intakeYear} entry via{" "}
        {applicantRoute.toLowerCase().replace(/_/g, " ")}. This compares
        recorded evidence with published rules; it is not an admission decision.
      </p>
      <div className="mt-5 divide-y divide-slate-200">
        {readiness.checks.map((check) => (
          <div key={check.id} className="py-4 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-slate-950">{check.label}</p>
              <span
                className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold ${STATE_STYLES[check.state]}`}
              >
                <StateIcon state={check.state} />
                {STATE_LABELS[check.state]}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{check.explanation}</p>
            {check.evidence?.length ? (
              <p className="mt-1 text-xs text-slate-500">
                Evidence: {check.evidence.join(", ")}
              </p>
            ) : null}
            {check.actions.map((action) => (
              <p
                key={action}
                className="mt-2 text-sm font-medium text-slate-800"
              >
                Next: {action}
              </p>
            ))}
            {check.source ? (
              <a
                href={check.source.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-sky-700"
              >
                Official source · Verified {formatDate(check.source.lastVerifiedAt)}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        ))}
      </div>
      {policy?.admissionsTests?.length ? (
        <div className="mt-5 border-t border-slate-200 pt-4">
          <h3 className="text-sm font-semibold text-slate-950">
            Test dates and booking
          </h3>
          <div className="mt-3 space-y-3">
            {Array.from(
              new Set(
                policy.admissionsTests.flatMap(
                  (requirement) => requirement.acceptedTests,
                ),
              ),
            ).map((testId) => {
              const definition = ADMISSIONS_TESTS.find(
                (test) => test.id === testId,
              );
              const session = findNextBookableTestSession(testId, new Date());
              if (!definition) return null;
              return (
                <div
                  key={testId}
                  className="flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <Link
                      href={`/universities/tests/${testId.toLowerCase()}`}
                      className="text-sm font-semibold text-sky-700"
                    >
                      {definition.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {session
                        ? `${session.label} • register by ${formatDate(session.registrationDeadline)}`
                        : "No current verified bookable session in MuksBooks"}
                    </p>
                  </div>
                  {session && onAddTestPlan ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        onAddTestPlan(testId, definition.name, session)
                      }
                    >
                      <CalendarPlus className="mr-2 h-4 w-4" />
                      Add to plan
                    </Button>
                  ) : (
                    <a
                      href={definition.bookingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-sky-700"
                    >
                      Official booking <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
