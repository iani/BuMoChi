#!/usr/bin/env python3
"""Regression tests for the fixed Bunraku Frame wire representation."""

import unittest

from bunraku_protocol import (
    BONES,
    BONE_NAMES,
    BunrakuFrame,
    ProtocolError,
    build_frame,
    extract_vmc_bones,
    frame_from_vmc,
    parse_frame,
    vmc_bundle_from_frame,
)


def sample_frame() -> BunrakuFrame:
    transforms = tuple(
        (index / 10, index / 20, index / 30, 0.0, 0.0, 0.0, 1.0)
        for index in range(len(BONES))
    )
    return BunrakuFrame("Test Avatar", "unit-test", 42, 1.25, transforms)


class BunrakuProtocolTests(unittest.TestCase):
    def assert_transforms_almost_equal(self, actual, expected):
        self.assertEqual(len(actual), len(expected))
        for actual_bone, expected_bone in zip(actual, expected):
            for actual_value, expected_value in zip(actual_bone, expected_bone):
                self.assertAlmostEqual(actual_value, expected_value, places=6)

    def test_bunraku_message_is_below_transport_limit(self):
        self.assertLessEqual(len(build_frame(sample_frame())), 1200)

    def test_bunraku_round_trip_preserves_metadata_and_transforms(self):
        expected = sample_frame()
        actual = parse_frame(build_frame(expected))
        self.assertEqual(actual.avatar, expected.avatar)
        self.assertEqual(actual.source, expected.source)
        self.assertEqual(actual.frame_id, expected.frame_id)
        self.assertAlmostEqual(actual.timestamp, expected.timestamp)
        self.assert_transforms_almost_equal(actual.transforms, expected.transforms)

    def test_vmc_round_trip_preserves_all_canonical_bones(self):
        expected = sample_frame()
        vmc = vmc_bundle_from_frame(expected)
        bones = extract_vmc_bones(vmc)
        self.assertEqual(tuple(bones), BONE_NAMES)
        actual = frame_from_vmc(vmc, expected.avatar, expected.source, 43, 2.0)
        self.assert_transforms_almost_equal(actual.transforms, expected.transforms)

    def test_missing_bone_is_rejected(self):
        frame = sample_frame()
        incomplete = BunrakuFrame(
            frame.avatar, frame.source, frame.frame_id, frame.timestamp,
            frame.transforms[:-1],
        )
        with self.assertRaises(ProtocolError):
            build_frame(incomplete)

    def test_malformed_packet_is_rejected(self):
        with self.assertRaises(ProtocolError):
            parse_frame(b"not OSC")


if __name__ == "__main__":
    unittest.main()
