#!/usr/bin/env python3
"""Regression tests for legacy and extended Bunraku Frame representations."""

import unittest
from dataclasses import replace
from pathlib import Path
import socket
import subprocess
import sys
import time

from bunraku_protocol import (
    BONES,
    BONE_NAMES,
    BunrakuFrame,
    ProtocolError,
    build_frame,
    extract_vmc_bones,
    extract_vmc_blends,
    frame_from_vmc,
    parse_frame,
    vmc_bundle_from_frame,
)
from bunraku_frame_to_vmc import destination_port
from vmc_to_bunraku_frame import destinations, parser as encoder_parser


def sample_frame() -> BunrakuFrame:
    transforms = tuple(
        (index / 10, index / 20, index / 30, 0.0, 0.0, 0.0, 1.0)
        for index in range(len(BONES))
    )
    return BunrakuFrame("Test Avatar", "unit-test", 42, 1.25, transforms)


def sample_extended_frame() -> BunrakuFrame:
    return replace(
        sample_frame(),
        extra_transforms=(
            ("LeftIndexProximal", (0.01, 0.02, 0.03, 0.0, 0.0, 0.1, 0.995)),
            ("RightIndexProximal", (-0.01, 0.02, 0.03, 0.0, 0.0, -0.1, 0.995)),
        ),
        blends=(("Blink", 0.75), ("Joy", 0.25)),
    )


class BunrakuProtocolTests(unittest.TestCase):
    def assert_transforms_almost_equal(self, actual, expected):
        self.assertEqual(len(actual), len(expected))
        for actual_bone, expected_bone in zip(actual, expected):
            for actual_value, expected_value in zip(actual_bone, expected_bone):
                self.assertAlmostEqual(actual_value, expected_value, places=6)

    def assert_named_transforms_almost_equal(self, actual, expected):
        self.assertEqual(tuple(name for name, _ in actual), tuple(name for name, _ in expected))
        self.assert_transforms_almost_equal(
            tuple(transform for _, transform in actual),
            tuple(transform for _, transform in expected),
        )

    def test_bunraku_message_is_below_transport_limit(self):
        self.assertLessEqual(len(build_frame(sample_frame())), 1200)

    def test_bunraku_round_trip_preserves_metadata_and_transforms(self):
        expected = sample_frame()
        actual = parse_frame(build_frame(expected))
        self.assertEqual(actual.avatar, expected.avatar)
        self.assertEqual(actual.source, expected.source)
        self.assertEqual(actual.frame_id, expected.frame_id)
        self.assertAlmostEqual(actual.timestamp, expected.timestamp)
        self.assertIsNone(actual.target_port)
        self.assert_transforms_almost_equal(actual.transforms, expected.transforms)

    def test_routed_round_trip_preserves_target_port(self):
        expected = replace(sample_frame(), target_port=39540)
        packet = build_frame(expected)
        self.assertLessEqual(len(packet), 1200)
        actual = parse_frame(packet)
        self.assertEqual(actual.target_port, 39540)
        self.assertEqual(actual.avatar, expected.avatar)
        self.assert_transforms_almost_equal(actual.transforms, expected.transforms)

    def test_extended_round_trip_preserves_fingers_and_face(self):
        expected = sample_extended_frame()
        packet = build_frame(expected)
        self.assertLessEqual(len(packet), 8192)
        actual = parse_frame(packet)
        self.assert_named_transforms_almost_equal(actual.extra_transforms, expected.extra_transforms)
        self.assertEqual(tuple(name for name, _ in actual.blends), ("Blink", "Joy"))
        self.assertAlmostEqual(actual.blends[0][1], 0.75)
        self.assertAlmostEqual(actual.blends[1][1], 0.25)

    def test_extended_routed_round_trip_preserves_destination(self):
        expected = replace(sample_extended_frame(), target_port=39539)
        actual = parse_frame(build_frame(expected))
        self.assertEqual(actual.target_port, 39539)
        self.assert_named_transforms_almost_equal(actual.extra_transforms, expected.extra_transforms)

    def test_routed_destination_wins_over_legacy_fallback(self):
        frame = replace(sample_frame(), target_port=39540)
        self.assertEqual(destination_port(frame, 39539, set()), 39540)

    def test_legacy_destination_uses_command_line_fallback(self):
        self.assertEqual(destination_port(sample_frame(), 39539, set()), 39539)

    def test_legacy_frame_without_fallback_is_rejected(self):
        with self.assertRaises(ProtocolError):
            destination_port(sample_frame(), None, set())

    def test_destination_allow_list_is_enforced(self):
        frame = replace(sample_frame(), target_port=39540)
        with self.assertRaises(ProtocolError):
            destination_port(frame, None, {39539})

    def test_invalid_routed_port_is_rejected(self):
        with self.assertRaises(ProtocolError):
            build_frame(replace(sample_frame(), target_port=0))

    def test_vmc_round_trip_preserves_all_canonical_bones(self):
        expected = sample_frame()
        vmc = vmc_bundle_from_frame(expected)
        bones = extract_vmc_bones(vmc)
        self.assertEqual(tuple(bones), BONE_NAMES)
        actual = frame_from_vmc(vmc, expected.avatar, expected.source, 43, 2.0)
        self.assert_transforms_almost_equal(actual.transforms, expected.transforms)

    def test_vmc_round_trip_preserves_extra_bones_and_face(self):
        expected = sample_extended_frame()
        vmc = vmc_bundle_from_frame(expected)
        actual = frame_from_vmc(vmc, expected.avatar, expected.source, 43, 2.0)
        self.assert_named_transforms_almost_equal(actual.extra_transforms, expected.extra_transforms)
        actual_blends = dict(actual.blends)
        self.assertAlmostEqual(actual_blends["Blink"], 0.75)
        self.assertAlmostEqual(actual_blends["Joy"], 0.25)
        self.assertEqual(extract_vmc_blends(vmc), actual_blends)

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

    def test_encoder_defaults_to_local_bmc_and_oscgroups(self):
        args = encoder_parser().parse_args([])
        self.assertEqual(args.listen_port, 39537)
        self.assertEqual(
            destinations(args),
            (
                ("Bmc", "127.0.0.1", 57130),
                ("OSCGroups", "127.0.0.1", 22244),
            ),
        )

    def test_encoder_output_can_be_disabled(self):
        args = encoder_parser().parse_args(["--no-oscgroups"])
        self.assertEqual(destinations(args), (("Bmc", "127.0.0.1", 57130),))

    def test_legacy_target_alias_does_not_duplicate_bmc_endpoint(self):
        args = encoder_parser().parse_args(["--target-port", "57130"])
        self.assertEqual(destinations(args), (("Bmc", "127.0.0.1", 57130),))

    def test_encoder_fans_one_frame_out_to_both_destinations(self):
        receivers = [socket.socket(socket.AF_INET, socket.SOCK_DGRAM) for _ in range(2)]
        ingress_probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sender = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        process = None
        try:
            for receiver in receivers:
                receiver.bind(("127.0.0.1", 0))
                receiver.settimeout(2.0)
            target_ports = [receiver.getsockname()[1] for receiver in receivers]
            ingress_probe.bind(("127.0.0.1", 0))
            ingress_port = ingress_probe.getsockname()[1]
            ingress_probe.close()

            encoder = Path(__file__).with_name("vmc_to_bunraku_frame.py")
            process = subprocess.Popen(
                [
                    sys.executable, str(encoder),
                    "--listen-port", str(ingress_port),
                    "--bmc-port", str(target_ports[0]),
                    "--oscgroups-port", str(target_ports[1]),
                    "--stats-interval", "0",
                ],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            time.sleep(0.15)
            sender.sendto(
                vmc_bundle_from_frame(sample_extended_frame()),
                ("127.0.0.1", ingress_port),
            )

            received = [parse_frame(receiver.recvfrom(65507)[0]) for receiver in receivers]
            self.assertEqual(received[0].avatar, "Ishidomaru")
            self.assertEqual(received[1].avatar, "Ishidomaru")
            self.assert_transforms_almost_equal(received[0].transforms, received[1].transforms)
            self.assert_named_transforms_almost_equal(
                received[0].extra_transforms, sample_extended_frame().extra_transforms
            )
            self.assertEqual(dict(received[0].blends), dict(sample_extended_frame().blends))
        finally:
            if process is not None:
                process.terminate()
                try:
                    process.wait(timeout=2.0)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=2.0)
            for receiver in receivers:
                receiver.close()
            ingress_probe.close()
            sender.close()

    def test_one_decoder_dispatches_two_routed_frames(self):
        receivers = [socket.socket(socket.AF_INET, socket.SOCK_DGRAM) for _ in range(2)]
        ingress_probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sender = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        process = None
        try:
            for receiver in receivers:
                receiver.bind(("127.0.0.1", 0))
                receiver.settimeout(2.0)
            target_ports = [receiver.getsockname()[1] for receiver in receivers]
            ingress_probe.bind(("127.0.0.1", 0))
            ingress_port = ingress_probe.getsockname()[1]
            ingress_probe.close()

            decoder = Path(__file__).with_name("bunraku_frame_to_vmc.py")
            command = [
                sys.executable, str(decoder),
                "--listen-port", str(ingress_port),
                "--stats-interval", "0",
            ]
            for port in target_ports:
                command.extend(("--allow-target-port", str(port)))
            process = subprocess.Popen(
                command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
            time.sleep(0.15)

            for index, port in enumerate(target_ports):
                frame = replace(
                    sample_extended_frame(), avatar=f"Avatar{index}",
                    frame_id=index, target_port=port,
                )
                sender.sendto(build_frame(frame), ("127.0.0.1", ingress_port))

            for index, receiver in enumerate(receivers):
                packet, _ = receiver.recvfrom(65507)
                bones = extract_vmc_bones(packet)
                self.assertEqual(tuple(bones)[:len(BONE_NAMES)], BONE_NAMES)
                self.assertIn("LeftIndexProximal", bones)
                self.assertAlmostEqual(extract_vmc_blends(packet)["Blink"], 0.75)
        finally:
            if process is not None:
                process.terminate()
                try:
                    process.wait(timeout=2.0)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=2.0)
            for receiver in receivers:
                receiver.close()
            ingress_probe.close()
            sender.close()


if __name__ == "__main__":
    unittest.main()
