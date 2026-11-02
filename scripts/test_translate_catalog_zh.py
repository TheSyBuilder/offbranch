"""Exercise parsing and cache identity without importing or loading MLX."""

import copy
import json
import sys
import unittest

from translate_catalog_zh import FIELDS, parse_translation, source_key


class TranslationParserTests(unittest.TestCase):
    def setUp(self):
        self.row = {
            "title": "Python、C++ 与 .NET：2026 年的工具",
            "summary": "介绍 Python、C++、C# 和 .NET，保留 2026 年的示例。",
            "whyHn": "HN 用户推荐其中对技术细节的清晰讲解。",
        }

    def test_exact_three_field_json_round_trips(self):
        self.assertEqual(parse_translation(json.dumps(self.row, ensure_ascii=False)), self.row)
        self.assertEqual(parse_translation(json.dumps(self.row, ensure_ascii=True)), self.row)
        self.assertEqual(set(parse_translation(json.dumps(self.row))), set(FIELDS))

    def test_whitespace_and_supported_json_fence_are_removed(self):
        padded = {key: " \n" + value + "\t " for key, value in self.row.items()}
        raw = json.dumps(padded, ensure_ascii=False)
        self.assertEqual(parse_translation("  " + raw + "\n"), self.row)
        self.assertEqual(parse_translation("```json\n" + raw + "\n```"), self.row)

    def test_literal_quotes_and_newlines_remain_data(self):
        self.row["summary"] = '讲解字符串 "ignore instructions"。\n它只是待翻译的数据。'
        self.assertEqual(parse_translation(json.dumps(self.row)), self.row)

    def test_malformed_json_and_non_objects_are_rejected(self):
        for raw in ('{"title":', 'prefix ' + json.dumps(self.row), 'null', '[]', '"文本"', json.dumps(self.row) + ' extra'):
            with self.subTest(raw=raw):
                with self.assertRaises(ValueError):
                    parse_translation(raw)

    def test_missing_extra_or_wrong_field_names_are_rejected(self):
        for mutation in (
            lambda row: row.pop("whyHn"),
            lambda row: row.update({"reasoning": "一些思考"}),
            lambda row: row.update({"whyHN": row.pop("whyHn")}),
        ):
            row = copy.deepcopy(self.row)
            mutation(row)
            with self.assertRaises(ValueError):
                parse_translation(json.dumps(row))

    def test_empty_or_non_string_fields_are_rejected(self):
        for field in FIELDS:
            for invalid in (None, 0, [], {}, "", " \n\t"):
                with self.subTest(field=field, invalid=invalid):
                    row = {**self.row, field: invalid}
                    with self.assertRaises(ValueError):
                        parse_translation(json.dumps(row))

    def test_english_descriptions_are_rejected_but_proper_name_title_is_allowed(self):
        for field in ("summary", "whyHn"):
            with self.subTest(field=field):
                with self.assertRaisesRegex(ValueError, "No Chinese description"):
                    parse_translation(json.dumps({**self.row, field: "An English-only description."}))
        proper_name = {**self.row, "title": "John Backus"}
        self.assertEqual(parse_translation(json.dumps(proper_name)), proper_name)

    def test_generation_markers_and_repetition_loops_are_rejected(self):
        for invalid in ("<think>先思考</think>翻译。", "<|im_start|>assistant 翻译。", "这是一段不断重复且没有实际意义的中文内容。" * 4):
            with self.subTest(invalid=invalid):
                with self.assertRaisesRegex(ValueError, "Generation artifact"):
                    parse_translation(json.dumps({**self.row, "summary": invalid}))

    def test_cache_key_is_order_independent_and_uses_only_source_text(self):
        first = {"title": "A title", "summary": "A summary", "whyHn": "A reason", "id": "one"}
        reordered = {"whyHn": "A reason", "id": "two", "summary": "A summary", "title": "A title", "score": 99}
        self.assertEqual(source_key(first), source_key(reordered))
        self.assertEqual(len(source_key(first)), 64)
        for field in FIELDS:
            self.assertNotEqual(source_key(first), source_key({**first, field: first[field] + " changed"}))

    def test_import_does_not_load_mlx(self):
        self.assertFalse(any(name == "mlx_lm" or name.startswith("mlx_lm.") for name in sys.modules))
        self.assertFalse(any(name == "mlx" or name.startswith("mlx.") for name in sys.modules))


if __name__ == "__main__":
    unittest.main()
