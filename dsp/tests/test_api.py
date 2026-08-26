import unittest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

class TestDSPEndpoints(unittest.TestCase):

    def test_read_root(self):
        response = client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "DSP Service is operational"})

    def test_extract_empty_file_fails(self):
        response = client.post("/extract", files={"audio": ("empty.wav", b"", "audio/wav")})
        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.json())

if __name__ == "__main__":
    unittest.main()
