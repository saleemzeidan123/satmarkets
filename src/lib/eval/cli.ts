import { GOLD_PROFILES, casesFor, type GoldProfile } from "./gold";
import { deterministicSubject, formatReport, modelSubject, runSuite, type Subject } from "./run";

// ADV-3B. Running the suite from a terminal.
//
//   npm run eval                     the deterministic baseline over the whole set
//   npm run eval -- --subject=model  the provider chain, which today reports that
//                                    no provider is configured
//   npm run eval -- --profile=short_prose
//
// It exists so that the evidence in a closure record is something a reader can
// reproduce rather than something they have to take on trust. It writes to
// stdout, it never writes a file, and it exits non-zero only on a graded
// failure: an unavailable subject is not an error, it is a fact about today.

const arg = (name: string): string | undefined => {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
};

async function main(): Promise<number> {
  const which = arg("subject") ?? "deterministic";
  const subject: Subject = which === "model" ? modelSubject() : deterministicSubject();

  const profile = arg("profile") as GoldProfile | undefined;
  if (profile && !GOLD_PROFILES.includes(profile)) {
    process.stdout.write(`unknown profile ${profile}; expected one of ${GOLD_PROFILES.join(", ")}\n`);
    return 2;
  }

  const report = await runSuite(subject, profile ? { cases: casesFor(profile) } : {});
  process.stdout.write(`${formatReport(report)}\n`);
  return report.fail === 0 ? 0 : 1;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (e: unknown) => {
    process.stdout.write(`the evaluation harness failed to run: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 2;
  }
);
