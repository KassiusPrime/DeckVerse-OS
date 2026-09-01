from __future__ import annotations

import importlib.util
import json
import tempfile
import time
import zipfile
from pathlib import Path
from urllib.parse import quote

MODULE_PATH = Path(__file__).with_name("download_csm_assets.py")
spec = importlib.util.spec_from_file_location("csm_downloader", MODULE_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError("Unable to load CSM downloader")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

FILE_FALLBACKS = {
    "CSM_character_elder_immortal_brother.jpg": "ThugEldest.PNG",
    "CSM_character_mr_tanaka.jpg": "Mr tanaka.png",
    "CSM_boss_punishment_devil.jpg": "Punishement devil.png",
    "CSM_boss_caterpillar_devil.jpg": "Justice Devil.png",
    "CSM_boss_skin_devil.jpg": "Power runs over Denji and Kurose.png",
    "CSM_boss_mold_devil.jpg": "Kato.png",
}

for asset_name, wiki_filename in FILE_FALLBACKS.items():
    mod.ASSETS[asset_name] = (
        "https://chainsaw-man.fandom.com/wiki/Special:Redirect/file/"
        + quote(wiki_filename, safe="")
    )

OUTPUT_ZIP = Path("CSM_81_assets_preview.zip")
REPORT = Path("CSM_81_assets_preview_report.json")


def main() -> int:
    if len(mod.ASSETS) != 81:
        raise RuntimeError(f"Expected 81 assets, found {len(mod.ASSETS)}")

    s = mod.session()
    report = {"mapped_assets": 81, "assets": [], "failures": []}

    with tempfile.TemporaryDirectory(prefix="csm_preview_") as td:
        root = Path(td)
        for i, (filename, url) in enumerate(mod.ASSETS.items(), 1):
            target = root / filename
            print(f"[{i:02d}/81] {filename}", flush=True)
            try:
                data, resolved = mod.fetch_image(s, url)
                meta = mod.save_real_jpeg(data, target)
                report["assets"].append({"name": filename, "source": url, "resolved": resolved, **meta})
                print(f"  OK {meta['width']}x{meta['height']} {meta['bytes']} bytes", flush=True)
            except Exception as exc:
                report["failures"].append({"name": filename, "source": url, "error": str(exc)})
                print(f"  ERROR {exc}", flush=True)
            time.sleep(0.05)

        report["downloaded_assets"] = len(report["assets"])
        report["failure_count"] = len(report["failures"])
        REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

        if report["failures"]:
            return 2

        with zipfile.ZipFile(OUTPUT_ZIP, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
            for p in sorted(root.iterdir()):
                if p.is_file():
                    z.write(p, p.name)

    with zipfile.ZipFile(OUTPUT_ZIP, "r") as z:
        names = z.namelist()
        assert z.testzip() is None
        assert len(names) == 81
        assert len(names) == len(set(names))
        assert all(n.startswith("CSM_") and n.endswith(".jpg") for n in names)

    print(f"Preview ready: {OUTPUT_ZIP} ({OUTPUT_ZIP.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
