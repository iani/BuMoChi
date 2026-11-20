import unittest
from unittest.mock import Mock, patch
import bmc_godot_service as service


class WindowsPortsTests(unittest.TestCase):
    def test_ipv4_ipv6_and_pid_parsing(self):
        output = '''Active Connections
  Proto Local Address Foreign Address State PID
  UDP 127.0.0.1:39539 *:* 1234
  UDP [::]:39540 *:* 5678
  TCP 127.0.0.1:39541 0.0.0.0:0 LISTENING 1234
'''
        with patch.object(service.subprocess, 'run', return_value=Mock(stdout=output)):
            self.assertEqual(service.windows_udp_listeners(), [(39539, 1234), (39540, 5678)])

    def test_listening_checks_owner(self):
        with patch.object(service.os, 'name', 'nt'), patch.object(
                service, 'windows_udp_listeners', return_value=[(39539, 1234), (39540, 5678)]):
            self.assertEqual(service.listening_ports(1234, [39539, 39540]), [39539])
            self.assertEqual(service.occupied_ports([39539, 39540, 39541]), [39539, 39540])


if __name__ == '__main__':
    unittest.main()
