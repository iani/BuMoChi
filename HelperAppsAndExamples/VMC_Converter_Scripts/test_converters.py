import unittest

from osc_codec import OscBundle, OscMessage, decode_packet, encode_message, encode_packet
from vmc_envelope import ADDRESS, unwrap_vmc_packet, wrap_vmc_packet


class ConverterTests(unittest.TestCase):
    def sample_bundle(self):
        return OscBundle(
            1,
            (
                OscMessage(
                    "/VMC/Ext/Root/Pos",
                    "sfffffff",
                    ("root", 0.0, 1.0, 2.0, 0.0, 0.0, 0.0, 1.0),
                ),
                OscMessage(
                    "/VMC/Ext/Bone/Pos",
                    "sfffffff",
                    ("Hips", 0.1, 0.2, 0.3, 0.0, 0.0, 0.0, 1.0),
                ),
                OscMessage("/VMC/Ext/Blend/Val", "sf", ("Blink_L", 0.5)),
                OscMessage("/VMC/Ext/Blend/Apply", "", ()),
            ),
        )

    def test_vmc_bundle_round_trip(self):
        original_bytes = encode_packet(self.sample_bundle())
        original = decode_packet(original_bytes)
        envelope = wrap_vmc_packet(original, "alice", 42)
        transmitted = decode_packet(encode_message(envelope))
        reconstructed = unwrap_vmc_packet(transmitted)
        self.assertEqual(encode_packet(reconstructed), original_bytes)

    def test_identity_is_present(self):
        envelope = wrap_vmc_packet(self.sample_bundle(), "alice", 42)
        self.assertEqual(envelope.address, ADDRESS)
        self.assertEqual(envelope.arguments[1], "alice")
        self.assertEqual(envelope.arguments[2], 42)

    def test_single_message_round_trip(self):
        message = OscMessage("/VMC/Ext/T", "f", (1.25,))
        envelope = wrap_vmc_packet(message, "bob", 7)
        self.assertEqual(unwrap_vmc_packet(envelope), message)


if __name__ == "__main__":
    unittest.main()
