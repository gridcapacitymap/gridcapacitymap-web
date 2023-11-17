import os
import unittest

from ..datadump import xlsx_importer


class TestConnectionRequestImport(unittest.TestCase):
    def runTest(self):
        resource_dir = os.path.join(
            os.path.dirname(os.path.realpath(__file__)), "resources"
        )
        xlsx_importer.jsonschema_path = os.path.join(
            resource_dir, "GridConnectionRequest.schema.json"
        )

        imp = xlsx_importer.ConnectionRequestsImporter()
        dest = os.path.join(resource_dir, "connection_requests_test.xlsx")
        serialized = imp.run(dest)

        self.assertIn("gridConnectionRequestList", serialized)
        self.assertIn("gridConnectionRequest", serialized["gridConnectionRequestList"])
        self.assertEqual(
            len(serialized["gridConnectionRequestList"]["gridConnectionRequest"]), 49
        )

        self.assertIn("gridConnectionScenarioList", serialized)
        self.assertIn(
            "gridConnectionScenario", serialized["gridConnectionScenarioList"]
        )
        self.assertEqual(
            len(serialized["gridConnectionScenarioList"]["gridConnectionScenario"]), 7
        )
