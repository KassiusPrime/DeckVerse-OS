from __future__ import annotations

import hashlib
import io
import json
import os
import shutil
import sys
import tempfile
import time
import urllib.parse
import zipfile
from pathlib import Path

import requests
from PIL import Image, ImageOps
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

ASSETS = {
    # --- 32 Assets pre-definidos ---
    "CSM_character_spear_hybrid.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/3/3c/Spear_Hybrid_Part_2.png/revision/latest",
    "CSM_character_miri_sugo.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/3/3a/Miri_Sugo.png/revision/latest",
    "CSM_character_fumiko_mifune.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/6/60/Fumiko_Mifune_Infobox.png/revision/latest",
    "CSM_character_yuko.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/0/00/Volume_13_%28Textless%29.png/revision/latest",
    "CSM_character_haruka_iseumi.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/b/b1/Haruka.png/revision/latest",
    "CSM_character_seigi_akoku.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/7/7a/Devil_Hunter_Infobox.png/revision/latest",
    "CSM_character_nobana_higashiyama.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/5/57/Nobana_Higashiyama.png/revision/latest",
    "CSM_character_michiko_tendo.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/b/bb/Michiko_Tendo_anime.png/revision/latest",
    "CSM_character_yutaro_kurose.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/b/b9/Volume_19_%28Textless%29.png/revision/latest",
    "CSM_character_kusakabe.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/6/67/Kusakabe.png/revision/latest",
    "CSM_character_tolka.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/8/80/Quanxi_infobox.png/revision/latest",
    "CSM_character_aldo.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/8/8f/Unnamed_Public_Safety_Higher-Up.png/revision/latest",
    "CSM_character_cosmo.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/0/09/Quanxi%27s_Four_Fiends.png/revision/latest",
    "CSM_character_long.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/0/00/Long-1.png/revision/latest",
    "CSM_character_pingtsi.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/4/43/Pingtsi.png/revision/latest",
    "CSM_character_tsugihagi.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/9/9b/Tsugihagi.png/revision/latest",
    "CSM_character_whip_hybrid.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/6/69/Whip_Hybrid_%28Human_Form%29.png/revision/latest",
    "CSM_character_fakesaw_man.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/9/90/Fake_Chainsaw_Man.png/revision/latest",
    "CSM_character_princi.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/8/8a/Angel_Devil_Reze_Arc_anime_design.png/revision/latest",
    "CSM_boss_death_devil.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/e/e4/Volume_14_%28Textless%29.png/revision/latest",
    "CSM_boss_fire_devil.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/7/7e/Fire_Devil.png/revision/latest",
    "CSM_boss_aging_devil.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/8/8d/Aging_Devil.png/revision/latest",
    "CSM_boss_future_devil.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/6/69/Future_Devil.png/revision/latest",
    "CSM_boss_curse_devil.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/d/d0/Chainsaw_Man_in_Hell.png/revision/latest",
    "CSM_boss_fox_devil.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/d/d0/Chainsaw_Man_in_Hell.png/revision/latest",
    "CSM_boss_ghost_devil.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/0/01/Ghost_Devil_anime.png/revision/latest",
    "CSM_boss_eternity_devil.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/f/fa/Eternity_Devil_anime.png/revision/latest",
    "CSM_boss_bat_devil.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/7/78/Bat_Devil_anime.png/revision/latest",
    "CSM_boss_leech_devil.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/8/8c/Leech_Devil_anime.png/revision/latest",
    "CSM_boss_justice_devil.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/8/8c/Justice_Devil.png/revision/latest",
    "CSM_boss_zombie_devil.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/e/e0/Zombie_Devil_anime.png/revision/latest",
    "CSM_boss_typhoon_devil.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/d/d0/Chainsaw_Man_in_Hell.png/revision/latest",

    # --- Novos personagens faltantes ---
    "CSM_character_hirokazu_arai.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/6/6e/Arai.png/revision/latest",
    "CSM_character_madoka.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/b/b8/Madoka.png/revision/latest",
    "CSM_character_nail_fiend.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/4/4f/Nail_Fiend.png/revision/latest",
    "CSM_character_bucky.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/e/eb/Bucky.png/revision/latest",
    "CSM_character_taiyo_hayakawa.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/1/12/Taiyo_anime.png/revision/latest",
    "CSM_character_meowy.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/5/52/Meowy_anime.png/revision/latest",
    "CSM_character_joey.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/e/e0/Joey.png/revision/latest",
    "CSM_character_elder_immortal_brother.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/0/03/Elder_Immortal_Brother.png/revision/latest",
    "CSM_character_subaru.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/7/77/Subaru.png/revision/latest",
    "CSM_character_tamaoki.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/3/36/Tamaoki.png/revision/latest",
    "CSM_character_nomo.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/c/c6/Nomo_Reze_Arc_anime_design.png/revision/latest",
    "CSM_character_class_president.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/4/4b/Class_president.png/revision/latest",
    "CSM_character_mr_tanaka.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/a/ab/Tanaka.png/revision/latest",
    "CSM_character_yakuza_boss.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/f/f3/Mob_boss_anime.png/revision/latest",

    # --- Novos bosses e demonios ---
    "CSM_boss_hell_devil.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/c/cc/Hell_Devil.png/revision/latest",
    "CSM_boss_snake_devil.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/7/7a/Snake_Devil_eating_and_defeating_Ghost_Devil.png/revision/latest",
    "CSM_boss_punishment_devil.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/2/2a/Punishment_Devil.png/revision/latest",
    "CSM_boss_octopus_devil.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/5/58/Octopus_Devil_Arm.png/revision/latest",
    "CSM_boss_stone_devil.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/f/fc/Stone_Devil.png/revision/latest",
    "CSM_boss_doll_devil.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/f/f7/Doll_Devil_in_Tolka%27s_body2.png/revision/latest",
    "CSM_boss_guillotine_devil.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/5/59/Guillotine_Devil.png/revision/latest",
    "CSM_boss_cockroach_devil.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/4/4a/Cockroach_devil.png/revision/latest",
    "CSM_boss_centipede_devil.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/6/69/Centipede_Devil_restrains_Pochita.png/revision/latest",
    "CSM_boss_caterpillar_devil.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/2/22/Caterpillar_Devil.png/revision/latest",
    "CSM_boss_ear_devil.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/4/4a/Ear_Devil.png/revision/latest",
    "CSM_boss_mouth_devil.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/1/1b/Mouth_Devil.png/revision/latest",
    "CSM_boss_muscle_devil.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/0/05/Muscle_Devil.png/revision/latest",
    "CSM_boss_sea_cucumber_devil.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/f/f4/Sea_Cucumber_Devil_anime.png/revision/latest",
    "CSM_boss_tomato_devil.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/7/7b/Tomato_Devil_anime.png/revision/latest",
    "CSM_boss_skin_devil.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/3/3a/Skin_Devil_contract.png/revision/latest",
    "CSM_boss_mold_devil.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/1/15/Mold_Devil_effect.png/revision/latest",

    # --- Itens e equipamentos ---
    "CSM_item_tanaka_spine_sword.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/9/90/Volume_12_%28Textless%29.png/revision/latest",
    "CSM_item_super_chainsaw_man_motorcycle.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/9/9b/Volume_20_%28Textless%29.png/revision/latest",
    "CSM_item_uniform_sword.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/9/90/Volume_12_%28Textless%29.png/revision/latest",
    "CSM_item_aquarium_spear.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/0/03/Asa_remembers_her_mother%27s_final_moments.png/revision/latest",
    "CSM_item_room_606_sword.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/9/9b/Volume_20_%28Textless%29.png/revision/latest",
    "CSM_item_angel_lifespan_sword.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/8/8a/Angel_Devil_Reze_Arc_anime_design.png/revision/latest",
    "CSM_item_power_blood_hammer.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/a/ac/Power_anime_design_2.png/revision/latest",
    "CSM_item_power_blood_scythe.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/c/c0/Power_attacks_the_Sea_Cucumber_Devil.png/revision/latest",
    "CSM_item_chainsaw_pull_cord.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/b/b0/Denji_Reze_Arc_anime_design.png/revision/latest",
    "CSM_item_reze_bomb_pin.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/1/19/Reze_Infobox.png/revision/latest",
    "CSM_item_kobenis_car.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/3/3c/Kobeni%27s_car.png/revision/latest",
    "CSM_item_gun_devil_flesh.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/e/eb/Gun_devil.png/revision/latest",
    "CSM_item_kishibe_hunting_knives.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/3/32/Kishibe_anime_design.png/revision/latest",
    "CSM_item_kishibe_flask.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/3/32/Kishibe_anime_design.png/revision/latest",
    "CSM_item_makima_control_chains.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/0/05/Hybrids_attacking_Chainsaw.png/revision/latest",
    "CSM_item_devil_hunter_suit.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/c/cb/Aki_Reze_Arc_anime_design.png/revision/latest",
    "CSM_item_fami_scale_earrings.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/e/e4/Volume_14_%28Textless%29.png/revision/latest",
    "CSM_item_nail_fiend_hammer.jpg": "https://static.wikia.nocookie.net/chainsaw-man/images/4/4f/Nail_Fiend.png/revision/latest",
}

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36"


def session() -> requests.Session:
    s = requests.Session()
    retries = Retry(total=4, connect=4, read=4, status=4, backoff_factor=0.75,
                    status_forcelist=(429, 500, 502, 503, 504), allowed_methods=frozenset(["GET"]))
    s.mount("https://", HTTPAdapter(max_retries=retries))
    s.headers.update({"User-Agent": UA, "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"})
    return s


def image_ok(data: bytes) -> bool:
    if len(data) < 256:
        return False
    try:
        with Image.open(io.BytesIO(data)) as im:
            im.verify()
        return True
    except Exception:
        return False


def fetch_image(s: requests.Session, url: str) -> tuple[bytes, str]:
    candidates = [url]
    if "/revision/latest" in url:
        candidates.append(url.split("/revision/latest", 1)[0])
    errors: list[str] = []
    for candidate in candidates:
        try:
            r = s.get(candidate, timeout=60, allow_redirects=True)
            if r.ok and image_ok(r.content):
                return r.content, r.url
            errors.append(f"{candidate} -> HTTP {r.status_code}, {len(r.content)} bytes")
        except Exception as exc:
            errors.append(f"{candidate} -> {type(exc).__name__}: {exc}")

    # Fallback via MediaWiki API using the filename embedded in the source URL.
    raw_file = url.split("/revision/latest", 1)[0].rsplit("/", 1)[-1]
    wiki_file = urllib.parse.unquote(raw_file)
    try:
        api = s.get(
            "https://chainsaw-man.fandom.com/api.php",
            params={"action": "query", "format": "json", "prop": "imageinfo", "iiprop": "url", "titles": f"File:{wiki_file}"},
            timeout=60,
        )
        api.raise_for_status()
        pages = api.json().get("query", {}).get("pages", {})
        for page in pages.values():
            info = page.get("imageinfo") or []
            if info and info[0].get("url"):
                resolved = info[0]["url"]
                r = s.get(resolved, timeout=60, allow_redirects=True)
                if r.ok and image_ok(r.content):
                    return r.content, r.url
                errors.append(f"api:{resolved} -> HTTP {r.status_code}, {len(r.content)} bytes")
    except Exception as exc:
        errors.append(f"api:{wiki_file} -> {type(exc).__name__}: {exc}")

    raise RuntimeError(" | ".join(errors))


def save_real_jpeg(data: bytes, target: Path) -> dict:
    with Image.open(io.BytesIO(data)) as source:
        source.load()
        im = ImageOps.exif_transpose(source)
        original_format = source.format
        if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
            rgba = im.convert("RGBA")
            bg = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
            bg.alpha_composite(rgba)
            im = bg.convert("RGB")
        else:
            im = im.convert("RGB")
        target.parent.mkdir(parents=True, exist_ok=True)
        im.save(target, format="JPEG", quality=92, optimize=True, progressive=True)
        return {"source_format": original_format, "width": im.width, "height": im.height, "bytes": target.stat().st_size}


def safe_extract(z: zipfile.ZipFile, dest: Path) -> None:
    root = dest.resolve()
    for member in z.infolist():
        out = (dest / member.filename).resolve()
        if root not in out.parents and out != root:
            raise RuntimeError(f"Unsafe ZIP member: {member.filename}")
        if member.is_dir():
            out.mkdir(parents=True, exist_ok=True)
        else:
            out.parent.mkdir(parents=True, exist_ok=True)
            with z.open(member) as src, open(out, "wb") as dst:
                shutil.copyfileobj(src, dst)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    if len(ASSETS) != 81:
        raise RuntimeError(f"Expected 81 mapped assets, found {len(ASSETS)}")

    base_zip = Path(sys.argv[1] if len(sys.argv) > 1 else "COL-CSM_Chainsaw-Man.zip")
    output_zip = Path(sys.argv[2] if len(sys.argv) > 2 else "COL-CSM_Chainsaw-Man.final.zip")
    report_path = Path(sys.argv[3] if len(sys.argv) > 3 else "csm_asset_report.json")
    if not base_zip.exists():
        raise FileNotFoundError(base_zip)

    report = {
        "base_zip": str(base_zip),
        "base_sha256": sha256(base_zip),
        "mapped_assets": len(ASSETS),
        "naming_rule": "CSM_* -> COL-CSM_* to match existing DeckVerse collection",
        "jpeg_rule": "Decode source image and re-encode as actual JPEG (quality 92)",
        "assets": [],
        "failures": [],
    }

    s = session()
    with tempfile.TemporaryDirectory(prefix="csm_pack_") as td:
        root = Path(td) / "root"
        root.mkdir()
        with zipfile.ZipFile(base_zip, "r") as z:
            original_members = z.namelist()
            safe_extract(z, root)
        report["original_members"] = len(original_members)

        for index, (name, url) in enumerate(ASSETS.items(), 1):
            target_name = "COL-" + name
            target = root / target_name
            print(f"[{index:02d}/{len(ASSETS)}] {target_name}", flush=True)
            try:
                data, resolved = fetch_image(s, url)
                meta = save_real_jpeg(data, target)
                report["assets"].append({"name": target_name, "source": url, "resolved": resolved, **meta})
                print(f"  OK {meta['width']}x{meta['height']} {meta['bytes']} bytes", flush=True)
            except Exception as exc:
                msg = str(exc)
                report["failures"].append({"name": target_name, "source": url, "error": msg})
                print(f"  ERROR {msg}", flush=True)
            time.sleep(0.08)

        all_files = sorted(p for p in root.rglob("*") if p.is_file())
        jpgs = [p for p in all_files if p.suffix.lower() in {".jpg", ".jpeg"}]
        report["final_files"] = len(all_files)
        report["final_jpeg_files"] = len(jpgs)
        report["downloaded_assets"] = len(report["assets"])
        report["failure_count"] = len(report["failures"])

        if report["failures"]:
            report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
            print(f"FAILED: {len(report['failures'])} assets could not be downloaded", file=sys.stderr)
            return 2

        tmp_zip = output_zip.with_suffix(output_zip.suffix + ".tmp")
        with zipfile.ZipFile(tmp_zip, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as out:
            for p in all_files:
                out.write(p, p.relative_to(root).as_posix())
        os.replace(tmp_zip, output_zip)

    report["output_zip"] = str(output_zip)
    report["output_size_bytes"] = output_zip.stat().st_size
    report["output_sha256"] = sha256(output_zip)
    with zipfile.ZipFile(output_zip, "r") as z:
        bad = z.testzip()
        report["zip_test"] = "ok" if bad is None else f"bad member: {bad}"
        report["zip_members"] = len(z.namelist())
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({k: report[k] for k in ["mapped_assets", "downloaded_assets", "failure_count", "zip_members", "output_size_bytes", "output_sha256", "zip_test"]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
