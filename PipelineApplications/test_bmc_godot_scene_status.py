"""Status must identify the scene, not only its containing Godot project."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

import bmc_godot_service as service


class SceneStatusTests(unittest.TestCase):
    def setUp(self):
        self.process = Mock(pid=1234)
        self.process.poll.return_value = None
        service.PROJECT_PROCESSES['/test/project'] = self.process
        service.PROJECT_SCENES['/test/project'] = 'res://first.tscn'

    def tearDown(self):
        service.PROJECT_PROCESSES.clear()
        service.PROJECT_SCENES.clear()
        service.PROJECT_LOGS.clear()

    def status(self, scene):
        with tempfile.TemporaryDirectory() as folder:
            request = Path(folder) / 'check.request'
            output = Path(folder) / 'report.json'
            request.write_text('\n'.join([
                'status', '/unused/godot', '/test/project', scene,
                str(output), '39539',
            ]) + '\n')
            with patch.object(service, 'listening_ports', return_value=[39539]), \
                    patch.object(service.time, 'sleep'):
                service.process_request(request)
            return json.loads(output.read_text())

    def test_selected_scene_running(self):
        report = self.status('res://first.tscn')
        self.assertTrue(report['running'])
        self.assertTrue(report['listening'])

    def test_another_scene_in_same_project_is_not_running(self):
        report = self.status('res://second.tscn')
        self.assertFalse(report['running'])
        self.assertFalse(report['listening'])

    def test_stopped_process_is_not_running(self):
        self.process.poll.return_value = 0
        self.assertFalse(self.status('res://first.tscn')['running'])

    def test_cleanup_clears_scene_tracking(self):
        service.stop_launched_projects()
        self.assertEqual(service.PROJECT_SCENES, {})


if __name__ == '__main__':
    unittest.main()
