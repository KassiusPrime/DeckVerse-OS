import { db } from "../base44Client.js";
import { runDataQualityAudit } from "../services/ai/dataQualityEngine.js";

async function main() {
  const auditRes = await runDataQualityAudit({ dryRun: true, mode: "PROPOSE" });
  const proposals = auditRes.report?.proposals || [];

  const FORBIDDEN = ["thor", "zeus", "hades", "poseidon", "loki", "odin", "gilgamesh", "enkidu", "ishtar", "ereshkigal", "amaterasu", "susanoo", "batman", "goku"];

  function isSafe(p) {
    const name = (p.name || "").toLowerCase();
    return !FORBIDDEN.some(f => name.includes(f));
  }

  console.log("--- 1. Metadata candidates ---");
  proposals.filter(isSafe).filter(p => p.primaryState === "metadata" || p.suggestedType === "metadata").slice(0, 5).forEach(p => console.log(p));

  console.log("\n--- 2. Collection fix candidates ---");
  proposals.filter(isSafe).filter(p => p.suggestedCollection !== p.currentCollection && p.collectionConfidence >= 0.90).slice(0, 5).forEach(p => console.log(p));

  console.log("\n--- 3. Quarantine candidates ---");
  proposals.filter(isSafe).filter(p => p.primaryState === "quarantine").slice(0, 5).forEach(p => console.log(p));
}

main();
