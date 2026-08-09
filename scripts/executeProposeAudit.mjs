// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Execute PROPOSE Audit & Output Official Report
// ════════════════════════════════════════════════════════════════════════════

import { dataQualityEngine } from "../services/ai/dataQualityEngine.js";

console.log("🛡️ Running Official PROPOSE / DRY-RUN Data Quality Audit...\n");

async function run() {
  const logs = [];
  const result = await dataQualityEngine.runDataQualityAudit({
    mode: "PROPOSE",
    dryRun: true,
    onLog: (msg, type) => {
      logs.push(`[${type ? type.toUpperCase() : "INFO"}] ${msg}`);
    }
  });

  console.log("================ DATA QUALITY ENGINE REPORT ================");
  console.log(JSON.stringify(result.report, null, 2));
  console.log("============================================================");

  console.log("\nTop 50 High-Risk Records:");
  result.report.highRiskRecords.slice(0, 50).forEach((rec, idx) => {
    console.log(`${idx + 1}. [${rec.primaryState.toUpperCase()}] ${rec.name} (Current: ${rec.currentCollection} → Suggested: ${rec.suggestedCollection}) - Reason: ${rec.reason}`);
  });
}

run().catch(err => {
  console.error("Audit Execution Error:", err);
  process.exit(1);
});
