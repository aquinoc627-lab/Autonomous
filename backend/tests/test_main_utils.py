import unittest
import sys
from unittest.mock import MagicMock

# Mock out modules that are not installed
sys.modules['fastapi'] = MagicMock()
sys.modules['fastapi.middleware'] = MagicMock()
sys.modules['fastapi.middleware.cors'] = MagicMock()
sys.modules['uvicorn'] = MagicMock()
sys.modules['shodan'] = MagicMock()
sys.modules['requests'] = MagicMock()
sys.modules['urllib3'] = MagicMock()
sys.modules['PIL'] = MagicMock()
sys.modules['PIL.ExifTags'] = MagicMock()
sys.modules['PIL.Image'] = MagicMock()

# Now import the function to test
from backend.main import get_decimal_from_dms

class TestMainUtils(unittest.TestCase):
    def test_get_decimal_from_dms_positive(self):
        # 34° 0' 0" N -> 34.0
        self.assertEqual(get_decimal_from_dms((34, 0, 0), 'N'), 34.0)
        # 118° 15' 0" E -> 118.25
        self.assertEqual(get_decimal_from_dms((118, 15, 0), 'E'), 118.25)

    def test_get_decimal_from_dms_negative(self):
        # 34° 0' 0" S -> -34.0
        self.assertEqual(get_decimal_from_dms((34, 0, 0), 'S'), -34.0)
        # 118° 15' 0" W -> -118.25
        self.assertEqual(get_decimal_from_dms((118, 15, 0), 'W'), -118.25)

    def test_get_decimal_from_dms_zero(self):
        self.assertEqual(get_decimal_from_dms((0, 0, 0), 'N'), 0.0)
        self.assertEqual(get_decimal_from_dms((0, 0, 0), 'S'), 0.0)

    def test_get_decimal_from_dms_floats(self):
        # 34.5° 30.0' 45.0" N
        expected = 34.5 + (30.0 / 60.0) + (45.0 / 3600.0)
        self.assertAlmostEqual(get_decimal_from_dms((34.5, 30.0, 45.0), 'N'), expected)

    def test_get_decimal_from_dms_lowercase_ref(self):
        self.assertEqual(get_decimal_from_dms((34, 0, 0), 'S'), -34.0)
        self.assertEqual(get_decimal_from_dms((34, 0, 0), 's'), -34.0)
        self.assertEqual(get_decimal_from_dms((118, 15, 0), 'w'), -118.25)
        self.assertEqual(get_decimal_from_dms((34, 0, 0), 'n'), 34.0)

if __name__ == '__main__':
    unittest.main()
