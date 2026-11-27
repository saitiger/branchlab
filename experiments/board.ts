import { programReport } from "./gates.js";
import { syntheticAllowed } from "./program.js";

const rows = programReport();
for (const { spec, report } of rows) {
  console.log(`${spec.flag}`);
  console.log(`  event ${spec.primaryEvent} ${spec.aggregation} ${spec.direction}`);
  console.log(`  ${spec.controlKey}=${spec.controlValue} | ${spec.treatmentKey}=${spec.treatmentValue}`);
  if (report) {
    console.log(`  synthetic: ${report.pass ? "gate passed" : "gate failed"}. ${report.summary}`);
    console.log("  child result: none");
  } else if (!syntheticAllowed(spec)) {
    console.log(`  synthetic: not used. ${spec.claim}`);
  }
}
