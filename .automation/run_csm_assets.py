from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from urllib.parse import quote

MODULE_PATH = Path(__file__).with_name("download_csm_assets.py")
spec = importlib.util.spec_from_file_location("csm_downloader", MODULE_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError("Unable to load CSM downloader")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

# The six source filenames supplied in the original mapping were removed/renamed
# on the Fandom CDN. Use live wiki file redirects so the current file hash is
# resolved by MediaWiki instead of hard-coding a stale nocookie path.
FILE_FALLBACKS = {
    "CSM_character_elder_immortal_brother.jpg": "ThugEldest.PNG",
    "CSM_character_mr_tanaka.jpg": "Mr tanaka.png",
    "CSM_boss_punishment_devil.jpg": "Punishement devil.png",
    # The former community label 'Caterpillar Devil' is now identified on the
    # wiki as the Justice Devil; keep the requested DeckVerse filename stable.
    "CSM_boss_caterpillar_devil.jpg": "Justice Devil.png",
    # Skin Devil and Mold Devil have no known physical appearance. Their old
    # effect/contract uploads were removed, so use the closest surviving wiki
    # visual of the demonstrated contract/effect instead of inventing artwork.
    "CSM_boss_skin_devil.jpg": "Power runs over Denji and Kurose.png",
    "CSM_boss_mold_devil.jpg": "Kato.png",
}

for asset_name, wiki_filename in FILE_FALLBACKS.items():
    mod.ASSETS[asset_name] = (
        "https://chainsaw-man.fandom.com/wiki/Special:Redirect/file/"
        + quote(wiki_filename, safe="")
    )

if __name__ == "__main__":
    raise SystemExit(mod.main())
