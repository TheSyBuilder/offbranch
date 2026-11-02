import copy
import json
import tempfile
import unittest
from pathlib import Path

from check_catalog_zh import check_manifest, large_quantities, load_json, numeric_tokens, sha256, validate


class CatalogZhValidationTests(unittest.TestCase):
    def setUp(self):
        self.catalog = {"version": "2026-10-31", "videos": [
            {"id": "example0001", "title": "C++ in 2026", "summary": "An introduction to Python, C++, C#, .NET and RLHF in 2026, with a detailed explanation of the methods and practical examples.", "whyHn": "HN recommends this explanation of RLHF."},
            {"id": "example0002", "title": "John Backus", "summary": "John Backus describes FORTRAN and the IBM team.", "whyHn": "HN recommends this oral history."},
        ]}
        self.translated = {
            "example0001": {"title": "2026 年的 C++", "summary": "这段介绍讲解了 2026 年的 Python、C++、C#、.NET 和 RLHF，并详细解释所用方法与实际案例。", "whyHn": "HN 推荐它对人类反馈强化学习的讲解。"},
            "example0002": {"title": "John Backus", "summary": "John Backus 讲述了 FORTRAN 与 IBM 团队的故事。", "whyHn": "HN 推荐这段口述历史。"},
        }

    def codes(self, translated=None):
        return {issue["code"] for issue in validate(self.catalog, self.translated if translated is None else translated)["issues"]}

    def test_complete_translation_and_proper_names_are_valid(self):
        issues = validate(self.catalog, self.translated)["issues"]
        self.assertFalse(any(issue["severity"] == "error" for issue in issues))
        self.assertEqual({issue["code"] for issue in issues}, {"latin_title"})

    def test_missing_and_unknown_ids_are_rejected(self):
        translated = copy.deepcopy(self.translated)
        translated["unexpected1"] = translated.pop("example0002")
        self.assertTrue({"missing_id", "unknown_id"}.issubset(self.codes(translated)))

    def test_english_only_or_blank_required_fields_are_rejected(self):
        self.translated["example0001"]["summary"] = "English only summary."
        self.translated["example0002"]["whyHn"] = " "
        self.assertTrue({"missing_chinese", "missing_text"}.issubset(self.codes()))

    def test_title_is_optional_but_model_extra_fields_are_rejected(self):
        del self.translated["example0001"]["title"]
        self.assertNotIn("missing_text", self.codes())
        self.translated["example0001"]["reasoning"] = "秘密思考"
        self.assertIn("unknown_field", self.codes())

    def test_missing_numbers_and_technical_tokens_are_reviewed(self):
        self.translated["example0001"]["summary"] = "这是一段关于 Python 与强化学习的介绍。"
        issues = validate(self.catalog, self.translated)["issues"]
        flags = [issue for issue in issues if issue["code"] in {"numeric_change", "technical_token_change"}]
        self.assertEqual(len(flags), 2)
        self.assertTrue(all(issue["severity"] == "review" for issue in flags))
        self.assertIn("C++", flags[1]["detail"])
        self.assertIn("C#", flags[1]["detail"])
        self.assertIn(".NET", flags[1]["detail"])

    def test_obvious_model_artifacts_and_truncation_are_detected(self):
        self.translated["example0001"]["summary"] = "简介。"
        self.translated["example0002"]["whyHn"] = "以下是翻译：<think>考虑</think>HN 推荐这段视频。"
        self.assertTrue({"generation_artifact", "possibly_truncated", "possible_instruction_leak"}.issubset(self.codes()))

    def test_repetition_loop_is_rejected(self):
        self.translated["example0001"]["summary"] = "这是一段不断重复的无效中文翻译内容。" * 8
        self.assertIn("repetition_loop", self.codes())

    def test_manifest_checks_source_and_translation_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "catalog.json"
            translated = Path(directory) / "catalog-zh.json"
            source.write_text(json.dumps(self.catalog))
            translated.write_text(json.dumps(self.translated))
            meta = {"sourceVersion": self.catalog["version"], "sourceSha256": sha256(source), "translationSha256": sha256(translated)}
            self.assertEqual(check_manifest(self.catalog, source, translated, meta), [])
            translated.write_text(translated.read_text() + "\n")
            issues = check_manifest(self.catalog, source, translated, meta)
            self.assertEqual([issue["field"] for issue in issues], ["translationSha256"])

    def test_duplicate_json_keys_do_not_silently_overwrite_records(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "duplicate.json"
            path.write_text('{"same": 1, "same": 2}')
            with self.assertRaisesRegex(ValueError, "Duplicate JSON key"):
                load_json(path)

    def test_numeric_checks_ignore_file_extensions_and_leading_zero_formatting(self):
        self.assertEqual(numeric_tokens("Lecture 01 - example.mp4, 200,000 units at 0.05%"), {"1", "200000", "0.05%"})

    def test_large_quantities_preserve_value_across_units(self):
        self.assertEqual(large_quantities("4.5 billion, 5 million, 10 trillion"), large_quantities("45 亿、五百万、十万亿"))
        self.assertEqual(large_quantities("1.3 million miles"), large_quantities("130 万英里"))
        self.assertNotEqual(large_quantities("1.3 million miles"), large_quantities("13 万英里"))
        self.catalog["videos"][0]["title"] = "4.5 Billion Years in 1 Hour"
        self.translated["example0001"]["title"] = "4.5 亿年浓缩在 1 小时"
        self.assertIn("large_quantity_change", self.codes())
        self.translated["example0001"]["title"] = "45 亿年浓缩在 1 小时"
        self.assertNotIn("large_quantity_change", self.codes())

    def test_mixed_script_or_traditional_chinese_is_reviewed(self):
        self.translated["example0002"]["summary"] = "這是一場關於語言的技術演講，也是 подкаст。"
        codes = self.codes()
        self.assertIn("possible_traditional_chinese", codes)
        self.assertIn("unexpected_cyrillic", codes)

    def test_ai_subject_matter_and_complete_title_are_not_generation_leaks(self):
        self.translated["example0002"]["title"] = "交通缓行措施无处不在"
        self.translated["example0002"]["whyHn"] = "HN 将其作为 AI 内容的参考案例。"
        self.assertNotIn("possible_instruction_leak", self.codes())
        self.assertNotIn("dangling_sentence", self.codes())
        self.translated["example0002"]["whyHn"] = "作为人工智能辅助工具的虚构示例被引用。"
        self.assertNotIn("possible_instruction_leak", self.codes())
        self.translated["example0002"]["whyHn"] = "作为一个 AI，我无法完成此请求。"
        self.assertIn("possible_instruction_leak", self.codes())

    def test_prose_about_translation_failures_is_not_a_placeholder(self):
        self.translated["example0002"]["whyHn"] = "在有关机器翻译失败的讨论中被用作玩笑回复。"
        self.assertNotIn("translation_placeholder", self.codes())
        for placeholder in ("翻译失败", "翻译失败。", "翻译失败：无法解析", "TRANSLATION_ERROR"):
            self.translated["example0002"]["whyHn"] = placeholder
            self.assertIn("translation_placeholder", self.codes())


if __name__ == "__main__":
    unittest.main()
