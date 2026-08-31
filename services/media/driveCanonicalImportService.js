import { preflightAnalyzePackage, commitMediaPackage } from "./mediaCommitService.js";
import { loadCatalogSnapshot } from "../catalog/catalogDataService.js";

export const CANONICAL_DRIVE_FOLDER_ID = "12Y6FxQKKBC94FEH1lKWM5lfhPYMjroXp";
export const AUDITED_COLLECTION_ZIP_COUNT = 23;
export const AUDITED_CANONICAL_ASSET_COUNT = 1402;

function authHeaders(accessToken) {
  if (!accessToken) throw new Error("DRIVE_ACCESS_REQUIRED: Conecte a conta Google proprietária com permissão de leitura do Drive.");
  return { Authorization: `Bearer ${accessToken}` };
}

async function driveJson(url, accessToken) {
  const response = await fetch(url, { headers: authHeaders(accessToken) });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`DRIVE_API_${response.status}: ${text || response.statusText}`);
  }
  return response.json();
}

export async function listCanonicalCollectionZips(accessToken) {
  const files = [];
  let pageToken = "";
  do {
    const query = `'${CANONICAL_DRIVE_FOLDER_ID}' in parents and trashed = false`;
    const params = new URLSearchParams({
      q: query,
      fields: "nextPageToken,files(id,name,mimeType,size,modifiedTime)",
      orderBy: "name",
      pageSize: "100",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const data = await driveJson(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, accessToken);
    files.push(...(data.files || []));
    pageToken = data.nextPageToken || "";
  } while (pageToken);

  return files
    .filter((file) => file.mimeType === "application/zip" && /^COL-[A-Z0-9]+_.+\.zip$/i.test(file.name || ""))
    .sort((a, b) => String(a.name).localeCompare(String(b.name), "pt-BR"));
}

export async function downloadDriveZip(fileId, accessToken) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, { headers: authHeaders(accessToken) });
  if (!response.ok) throw new Error(`DRIVE_DOWNLOAD_${response.status}: ${response.statusText}`);
  return response.arrayBuffer();
}

export async function importCanonicalDrivePackages(accessToken, { onProgress } = {}) {
  const zips = await listCanonicalCollectionZips(accessToken);
  if (zips.length !== AUDITED_COLLECTION_ZIP_COUNT) {
    throw new Error(`DRIVE_AUDIT_MISMATCH: esperados ${AUDITED_COLLECTION_ZIP_COUNT} ZIPs canônicos, encontrados ${zips.length}. A importação foi bloqueada para não misturar backup/quarentena.`);
  }

  const summary = {
    expectedZips: AUDITED_COLLECTION_ZIP_COUNT,
    expectedAssets: AUDITED_CANONICAL_ASSET_COUNT,
    processedZips: 0,
    analyzedAssets: 0,
    committedAssets: 0,
    alreadyExistingAssets: 0,
    replacementRequired: 0,
    notFound: 0,
    invalid: 0,
    conflicts: 0,
    failedCommits: 0,
    packages: [],
  };

  let snapshot = await loadCatalogSnapshot();
  let existingMediaIndex = snapshot.mediaIndex || [];

  for (let index = 0; index < zips.length; index += 1) {
    const zip = zips[index];
    onProgress?.({ phase: "download", index: index + 1, total: zips.length, filename: zip.name, summary: { ...summary } });
    const buffer = await downloadDriveZip(zip.id, accessToken);

    onProgress?.({ phase: "preflight", index: index + 1, total: zips.length, filename: zip.name, summary: { ...summary } });
    const report = await preflightAnalyzePackage(buffer, {
      collections: snapshot.collections || [],
      characters: snapshot.characters || [],
      cards: snapshot.characters || [],
      items: snapshot.items || [],
      bosses: [],
    }, existingMediaIndex);

    summary.analyzedAssets += report.counts.totalFiles;
    summary.alreadyExistingAssets += report.counts.alreadyExists;
    summary.replacementRequired += report.counts.replacementRequired;
    summary.notFound += report.counts.notFound;
    summary.invalid += report.counts.invalid;
    summary.conflicts += report.counts.conflicts;

    onProgress?.({ phase: "commit", index: index + 1, total: zips.length, filename: zip.name, report, summary: { ...summary } });
    const commit = await commitMediaPackage(report, { confirmReplacements: false });
    summary.committedAssets += commit.committedCount || 0;
    summary.failedCommits += commit.failedCount || 0;
    summary.processedZips += 1;
    summary.packages.push({ filename: zip.name, counts: report.counts, commit: { committedCount: commit.committedCount, failedCount: commit.failedCount, success: commit.success } });

    // Refresh the media index between packages so duplicate/replacement detection
    // remains accurate for the whole 23-ZIP run without retaining all image bytes.
    snapshot = await loadCatalogSnapshot();
    existingMediaIndex = snapshot.mediaIndex || [];
    onProgress?.({ phase: "package-complete", index: index + 1, total: zips.length, filename: zip.name, summary: { ...summary } });
  }

  summary.importedOrAlreadyPresent = summary.committedAssets + summary.alreadyExistingAssets;
  summary.auditCountMatches = summary.analyzedAssets === AUDITED_CANONICAL_ASSET_COUNT;
  onProgress?.({ phase: "complete", index: zips.length, total: zips.length, summary: { ...summary } });
  return summary;
}

export default { listCanonicalCollectionZips, downloadDriveZip, importCanonicalDrivePackages };
