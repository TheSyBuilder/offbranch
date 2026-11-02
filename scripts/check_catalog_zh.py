#!/usr/bin/env python3
"""Validate the complete Chinese catalog and write a review report.

python3 scripts/check_catalog_zh.py [public/data/catalog-zh.json]
python3 scripts/check_catalog_zh.py --meta public/data/catalog-zh.meta.json --require-meta

Structural errors, absent Chinese text, explicit generation artifacts and bad
checksums fail. Numeric/token changes and possible truncation are review flags:
they do not automatically reject legitimate translated names or terminology.
The default report lives in ignored artifacts/, never in the shipped catalog.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HAN = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]")
NUMBERS = re.compile(r"\d+(?:[.,]\d+)*%?")
# Terms with established Chinese equivalents are checked against both forms.
# Names remain valid Latin text; this is not a ban on English proper nouns.
TECHNICAL_TERMS = {
    "C++": (), "C#": (), ".NET": (), "CPython": (), "Python": (),
    "Rust": (), "JavaScript": (), "TypeScript": (), "Ruby": (), "LLVM": (),
    "TensorFlow": (), "PyTorch": (), "NumPy": (), "SciPy": (), "Jupyter": (),
    "micrograd": (), "makemore": (), "CUDA": (), "OpenAI": (),
    "SQL": (), "NoSQL": (), "HTML": (), "CSS": (), "HTTP": (), "HTTPS": (),
    "TCP": (), "UDP": (), "Unicode": (), "ASCII": (), "UTF-8": (),
    "GPT": (), "GPT-2": (), "GPT-3": (), "GPT-4": (), "ChatGPT": (),
    "RLHF": ("人类反馈强化学习", "人类反馈的强化学习"),
    "LLM": ("大语言模型", "大型语言模型"),
    "LLMs": ("大语言模型", "大型语言模型"),
    "NLP": ("自然语言处理",), "CNN": ("卷积神经网络",),
    "RNN": ("循环神经网络", "递归神经网络"),
    "LSTM": ("长短期记忆",), "SVM": ("支持向量机",),
    "GPU": ("图形处理器",), "CPU": ("中央处理器",),
    "API": ("应用程序接口", "接口"), "JIT": ("即时编译",),
    "AGI": ("通用人工智能",), "AI": ("人工智能",),
    "FORTRAN": ("Fortran",), "IBM": ("国际商业机器",),
}
ARTIFACTS = re.compile(r"<\/?think>|<\|(?:im_start|im_end|assistant|system|user|endoftext)[^>]*\|>|\[/?INST\]", re.I)
PLACEHOLDERS = re.compile(r"TODO_TRANSLATION|TRANSLATION_ERROR|^\s*(?:待翻译|翻译失败|无法完成翻译)(?:\s*[。！.!]?\s*$|[:：])", re.I)
INSTRUCTION_LEAKS = re.compile(
    r"(?:^|\n)\s*(?:assistant|system|user|analysis|final)\s*:|"
    r"here (?:is|are) (?:the|your) (?:chinese )?translation|"
    r"(?:以下|下面)是.{0,14}(?:翻译|译文)|译文如下|"
    r"(?:^|[\n。！？])\s*作为(?:一个|一名)?\s*(?:AI|人工智能|语言模型)(?:助手|语言模型|模型)?[，,]|"
    r"ignore (?:all )?(?:previous|prior|above) instructions|"
    r"忽略.{0,8}(?:指令|提示)|我(?:无法|不能)(?:翻译|完成此请求)", re.I,
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_json(path: Path) -> object:
    def unique_keys(pairs: list[tuple[str, object]]) -> dict:
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError(f"Duplicate JSON key in {path}: {key}")
            result[key] = value
        return result
    return json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=unique_keys)


def contains_term(text: str, term: str) -> bool:
    # ASCII boundaries protect C++/C#/.NET while allowing Chinese adjacency.
    return re.search(r"(?<![A-Za-z0-9_])" + re.escape(term) + r"(?![A-Za-z0-9_])", text, re.I) is not None


def numeric_tokens(text: str) -> set[str]:
    # File suffixes are not claims; zero-padded chapter numbers are equivalent.
    prose = re.sub(r"\.(?:mp3|mp4|webm|mkv|avi|mov)\b", "", text, flags=re.I)
    result = set()
    for match in NUMBERS.findall(prose):
        match = match.replace(",", "")
        match = re.sub(r"^0+(?=\d)", "", match)
        result.add(match)
    return result


def large_quantities(text: str) -> set[Decimal]:
    """Normalize explicit large quantities across English and Chinese units.

    This supplements digit checks: 4.5 billion -> 4.5 亿 keeps every digit but
    changes the value tenfold. It remains a review signal, not a rejection.
    """
    number = r"\d+(?:,\d{3})*(?:\.\d+)?"
    scales = {"million": 10**6, "billion": 10**9, "trillion": 10**12,
              "万亿": 10**12, "千万": 10**7, "百万": 10**6,
              "十亿": 10**9, "亿": 10**8, "万": 10**4, "千": 1000, "": 1}
    result = {Decimal(value.replace(",", "")) * scales[unit.casefold()]
              for value, unit in re.findall(r"(" + number + r")\s+(million|billion|trillion)\b", text, re.I)}
    result.update(Decimal(value.replace(",", "")) * scales[unit]
                  for value, unit in re.findall(r"(" + number + r")\s*(万亿|千万|百万|十亿|亿|万|千)?", text))
    digits = dict(zip("零〇一二两三四五六七八九", (0, 0, 1, 2, 2, 3, 4, 5, 6, 7, 8, 9)))
    units = {"十": 10, "百": 100, "千": 1000, "万": 10000, "亿": 100000000}
    for match in re.finditer(r"[零〇一二两三四五六七八九十百千万亿]+", text):
        token = match.group(0)
        if re.search(r"\d\s*$", text[:match.start()]):
            continue  # Its Arabic prefix was already parsed with this unit.
        if not any(unit in token for unit in ("万", "亿")):
            continue
        total = section = current = 0
        for char in token:
            if char in digits:
                current = digits[char]
            elif units[char] < 10000:
                section += (current or 1) * units[char]
                current = 0
            elif char == "万":
                total += (section + current or 1) * 10000
                section = current = 0
            else:
                total = (total + section + current or 1) * 100000000
                section = current = 0
        result.add(Decimal(total + section + current))
    return {value for value in result if value >= 1000}


def validate(catalog: dict, translated: object) -> dict:
    issues: list[dict] = []

    def add(severity: str, code: str, video_id: str = "", field: str = "", detail: str = "") -> None:
        issues.append({"severity": severity, "code": code, "id": video_id, "field": field, "detail": detail})

    source_videos = catalog.get("videos", [])
    by_id = {video["id"]: video for video in source_videos}
    if len(by_id) != len(source_videos):
        add("error", "duplicate_source_ids")
    if not isinstance(translated, dict):
        add("error", "invalid_top_level", detail="Expected an object keyed by source video ID")
        return {"sourceVersion": catalog.get("version"), "expectedCount": len(by_id), "actualCount": 0, "issues": issues}

    for video_id in sorted(by_id.keys() - translated.keys()):
        add("error", "missing_id", video_id)
    for video_id in sorted(translated.keys() - by_id.keys()):
        add("error", "unknown_id", video_id)

    for video_id in sorted(by_id.keys() & translated.keys()):
        record = translated[video_id]
        if not isinstance(record, dict):
            add("error", "invalid_record", video_id, detail="Expected title?, summary, whyHn")
            continue
        for key in sorted(set(record) - {"title", "summary", "whyHn"}):
            add("error", "unknown_field", video_id, key)
        for field in ("title", "summary", "whyHn"):
            if field == "title" and field not in record:
                continue
            target = record.get(field)
            if not isinstance(target, str) or not target.strip():
                add("error", "missing_text", video_id, field)
                continue
            source = by_id[video_id].get(field, "")
            han_count = len(HAN.findall(target))
            if field != "title" and not han_count:
                add("error", "missing_chinese", video_id, field)
            if field == "title" and not han_count and HAN.search(source) is None:
                # Proper-name titles may validly remain Latin; surface for review.
                add("review", "latin_title", video_id, field, target[:160])
            for pattern, code in ((ARTIFACTS, "generation_artifact"), (PLACEHOLDERS, "translation_placeholder")):
                match = pattern.search(target)
                if match and not pattern.search(source):
                    add("error", code, video_id, field, match.group(0))
            leak = INSTRUCTION_LEAKS.search(target)
            if leak and not INSTRUCTION_LEAKS.search(source):
                add("review", "possible_instruction_leak", video_id, field, leak.group(0))
            if target.lstrip().startswith("```"):
                add("error", "code_fence_wrapper", video_id, field)
            if target.lstrip().startswith('{"'):
                add("review", "nested_json", video_id, field)
            if "\\n" in target or "\\u" in target:
                add("review", "literal_escape", video_id, field)
            if "\ufffd" in target:
                add("error", "replacement_character", video_id, field)
            traditional = set(re.findall(r"[術學網說錄這們為體資數與並實現觀電發軟編]", target))
            if traditional:
                add("review", "possible_traditional_chinese", video_id, field, "".join(sorted(traditional)))
            if len(re.findall(r"[\u0400-\u04ff]", target)) >= 3 and not re.search(r"[\u0400-\u04ff]", source):
                add("review", "unexpected_cyrillic", video_id, field, target[:160])

            missing_numbers = numeric_tokens(source) - numeric_tokens(target)
            if missing_numbers:
                add("review", "numeric_change", video_id, field, ", ".join(sorted(missing_numbers)))
            if re.search(r"\d\s+(?:million|billion|trillion)\b", source, re.I):
                # Only compare normalized large claims, not unrelated dates.
                expected = {Decimal(value.replace(",", "")) * {"million": 10**6, "billion": 10**9, "trillion": 10**12}[unit.casefold()]
                            for value, unit in re.findall(r"(\d+(?:,\d{3})*(?:\.\d+)?)\s+(million|billion|trillion)\b", source, re.I)}
                changed = expected - large_quantities(target)
                if changed:
                    add("review", "large_quantity_change", video_id, field, ", ".join(format(value, "f") for value in sorted(changed)))
            missing_terms = [term for term, alternatives in TECHNICAL_TERMS.items()
                             if contains_term(source, term) and not contains_term(target, term)
                             and not any(alternative.casefold() in target.casefold() for alternative in alternatives)]
            if missing_terms:
                add("review", "technical_token_change", video_id, field, ", ".join(missing_terms))
            source_chars = len(re.sub(r"\s", "", source))
            target_chars = len(re.sub(r"\s", "", target))
            if field != "title" and source_chars >= 100 and target_chars < max(16, source_chars * 0.13):
                add("review", "possibly_truncated", video_id, field, f"{source_chars} source characters → {target_chars} translated characters")
            if field != "title" and source_chars >= 40 and target_chars > source_chars * 1.8:
                add("review", "unexpected_expansion", video_id, field, f"{source_chars} source characters → {target_chars} translated characters")
            if field != "title" and re.search(r"(?:因为|但是|并且|以及|包括|例如|首先|因此|其中|对于|通过|和|或|与|在)$", target.strip()):
                add("review", "dangling_sentence", video_id, field, target[-50:])
            if target.rstrip().endswith(("…", "...")) and not source.rstrip().endswith(("…", "...")):
                add("review", "new_ellipsis", video_id, field, target[-50:])
            if re.search(r"(.{12,}?)\1{3,}", target, re.S):
                add("error", "repetition_loop", video_id, field)
            latin_count = len(re.findall(r"[A-Za-z]", target))
            if field != "title" and latin_count > 100 and latin_count > han_count * 3:
                add("review", "mostly_latin_prose", video_id, field, f"{latin_count} Latin letters; {han_count} Chinese characters")

    return {"sourceVersion": catalog.get("version"), "expectedCount": len(by_id), "actualCount": len(translated), "issues": issues}


def check_manifest(catalog: dict, source_path: Path, translation_path: Path, manifest: object) -> list[dict]:
    expected = {
        "sourceVersion": catalog.get("version"),
        "sourceSha256": sha256(source_path),
        "translationSha256": sha256(translation_path),
    }
    issues = []
    if not isinstance(manifest, dict):
        return [{"severity": "error", "code": "invalid_manifest", "id": "", "field": "", "detail": "Expected a JSON object"}]
    for key, value in expected.items():
        if manifest.get(key) != value:
            issues.append({"severity": "error", "code": "manifest_mismatch", "id": "", "field": key, "detail": f"Expected {value}; got {manifest.get(key)!r}"})
    return issues


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("translation", nargs="?", type=Path, default=ROOT / "public/data/catalog-zh.json")
    parser.add_argument("--source", type=Path, default=ROOT / "public/data/catalog.json")
    parser.add_argument("--meta", type=Path, default=ROOT / "public/data/catalog-zh.meta.json")
    parser.add_argument("--require-meta", action="store_true")
    parser.add_argument("--report", type=Path, default=ROOT / "artifacts/catalog-zh-review.json")
    parser.add_argument("--strict-review", action="store_true", help="Also fail on review flags; normally they need editorial inspection")
    args = parser.parse_args()
    try:
        catalog = load_json(args.source)
        translated = load_json(args.translation)
        report = validate(catalog, translated)
        if len(catalog.get("videos", [])) != 6454:
            report["issues"].append({"severity": "error", "code": "unexpected_source_count", "id": "", "field": "", "detail": "Expected the full 6,454-video source catalog"})
        report["sourceSha256"] = sha256(args.source)
        report["translationSha256"] = sha256(args.translation)
        if args.meta.is_file():
            metadata = load_json(args.meta)
            report["issues"].extend(check_manifest(catalog, args.source, args.translation, metadata))
        elif args.require_meta:
            report["issues"].append({"severity": "error", "code": "missing_manifest", "id": "", "field": "", "detail": str(args.meta)})
    except (OSError, ValueError, TypeError, KeyError) as error:
        print(f"Cannot validate catalog: {error}")
        return 1
    counts = Counter(issue["severity"] for issue in report["issues"])
    report["counts"] = {"errors": counts["error"], "review": counts["review"]}
    report["checksByCode"] = dict(sorted(Counter(issue["code"] for issue in report["issues"]).items()))
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Chinese catalog: {report['actualCount']}/{report['expectedCount']} IDs, {counts['error']} errors, {counts['review']} review flags")
    print(f"Review report: {args.report}")
    for issue in [issue for issue in report["issues"] if issue["severity"] == "error"][:12]:
        print(f"  {issue['code']}: {issue['id']} {issue['field']} {issue['detail']}")
    return int(bool(counts["error"] or (args.strict_review and counts["review"])))


if __name__ == "__main__":
    raise SystemExit(main())
