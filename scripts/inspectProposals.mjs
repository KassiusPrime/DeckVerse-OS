import { db } from "../base44Client.js";
import { runDataQualityAudit } from "../services/ai/dataQualityEngine.js";
import { createEntityKey } from "../src/utils/entityIdentity.js";

async function main() {
  const auditRes = await runDataQualityAudit({ dryRun: true, mode: "PROPOSE" });
  const proposals = auditRes.report?.proposals || [];

  console.log(`Total proposals generated: ${proposals.length}`);

  // Filter out forbidden ambiguous entities
  const FORBIDDEN_NAMES = new Set([
    "thor", "zeus", "hades", "poseidon", "loki", "odin", "gilgamesh",
    "enkidu", "ishtar", "ereshkigal", "amaterasu", "susanoo", "batman", "goku"
  ]);

  const safeProposals = proposals.filter(p => {
    const norm = (p.name || "").toLowerCase().trim();
    if (FORBIDDEN_NAMES.has(norm)) return false;
    for (const f of FORBIDDEN_NAMES) {
      if (norm.includes(f)) return false;
    }
    return true;
  });

  console.log(`Safe proposals (excluding forbidden list): ${safeProposals.length}`);

  // Group by category
  const metadataCandidates = safeProposals.filter(p => p.primaryState === "metadata" || p.suggestedType === "metadata");
  const quarantineCandidates = safeProposals.filter(p => p.primaryState === "quarantine");
  const collectionFixCandidates = safeProposals.filter(p => p.suggestedCollection !== p.currentCollection && p.collectionConfidence >= 0.90);
  const itemCandidates = safeProposals.filter(p => p.suggestedType === "item");
  const bossCandidates = safeProposals.filter(p => p.suggestedType === "boss");
  const characterCandidates = safeProposals.filter(p => p.primaryState === "valid" && p.suggestedType === "character");

  console.log("\n--- Metadata Candidates ---");
  console.log(metadataCandidates.slice(0, 5));

  console.log("\n--- Quarantine Candidates ---");
  console.log(quarantineCandidates.slice(0, 5));

  console.log("\n--- Collection Fix Candidates ---");
  console.log(collectionFixCandidates.slice(0, 5));

  console.log("\n--- Item Candidates ---");
  console.log(itemCandidates.slice(0, 5));

  console.log("\n--- Boss Candidates ---");
  console.log(bossCandidates.slice(0, 5));

  console.log("\n--- Character Candidates ---");
  console.log(characterCandidates.slice(0, 5));
}

main().catch(console.error);
