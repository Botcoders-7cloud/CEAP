"""
CEAP Service — Judge0 Integration
Handles code submission to Judge0 and result processing.
"""
import httpx
from typing import Optional
from app.config import settings

# Judge0 language IDs
# Ref: https://github.com/judge0/judge0/blob/master/docs/api/languages.md
LANGUAGE_MAP = {
    "python": 71,       # Python 3.8.1
    "cpp": 54,          # C++ (GCC 9.2.0)
    "java": 62,         # Java (OpenJDK 13.0.1)
    "javascript": 63,   # JavaScript (Node.js 12.14.0)
    "c": 50,            # C (GCC 9.2.0)
}

LANGUAGE_NAMES = {
    "python": "Python 3",
    "cpp": "C++ (GCC)",
    "java": "Java",
    "javascript": "JavaScript (Node.js)",
    "c": "C",
}


class JudgeService:
    """Client for Judge0 CE API."""

    def __init__(self):
        self.base_url = settings.JUDGE0_URL
        self.api_key = settings.JUDGE0_API_KEY
        self.headers = {}
        if self.api_key:
            self.headers["X-Auth-Token"] = self.api_key

    async def submit(
        self,
        source_code: str,
        language: str,
        stdin: str = "",
        expected_output: Optional[str] = None,
        time_limit: float = 2.0,
        memory_limit: int = 262144,
    ) -> dict:
        """
        Submit code to Judge0 for execution.
        Returns the submission token for polling results.
        """
        language_id = LANGUAGE_MAP.get(language)
        if not language_id:
            raise ValueError(f"Unsupported language: {language}")

        payload = {
            "source_code": source_code,
            "language_id": language_id,
            "stdin": stdin,
            "expected_output": expected_output,
            "cpu_time_limit": time_limit,
            "memory_limit": memory_limit,
            "enable_network": False,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/submissions?base64_encoded=false&wait=false",
                json=payload,
                headers=self.headers,
                timeout=10.0,
            )

        if response.status_code not in (200, 201):
            raise Exception(f"Judge0 submission failed: {response.status_code} - {response.text}")

        return response.json()

    async def get_result(self, token: str) -> dict:
        """Poll Judge0 for submission result."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/submissions/{token}?base64_encoded=false&fields=*",
                headers=self.headers,
                timeout=10.0,
            )

        if response.status_code != 200:
            raise Exception(f"Judge0 result fetch failed: {response.status_code}")

        return response.json()

    async def submit_batch(self, submissions: list[dict]) -> list[dict]:
        """Submit multiple code executions in a batch."""
        batch_payload = {"submissions": []}

        for sub in submissions:
            language_id = LANGUAGE_MAP.get(sub["language"])
            batch_payload["submissions"].append({
                "source_code": sub["source_code"],
                "language_id": language_id,
                "stdin": sub.get("stdin", ""),
                "expected_output": sub.get("expected_output"),
                "cpu_time_limit": sub.get("time_limit", 2.0),
                "memory_limit": sub.get("memory_limit", 262144),
                "enable_network": False,
            })

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/submissions/batch?base64_encoded=false",
                json=batch_payload,
                headers=self.headers,
                timeout=30.0,
            )

        if response.status_code not in (200, 201):
            raise Exception(f"Judge0 batch submission failed: {response.status_code}")

        return response.json()

    async def get_batch_results(self, tokens: list[str]) -> list[dict]:
        """Get results for a batch of submissions."""
        token_str = ",".join(tokens)
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/submissions/batch?tokens={token_str}&base64_encoded=false&fields=*",
                headers=self.headers,
                timeout=30.0,
            )

        if response.status_code != 200:
            raise Exception(f"Judge0 batch result failed: {response.status_code}")

        return response.json().get("submissions", [])

    @staticmethod
    def parse_status(status_id: int) -> str:
        """Convert Judge0 status ID to our status string."""
        STATUS_MAP = {
            1: "queued",
            2: "running",
            3: "accepted",
            4: "wrong_answer",
            5: "tle",
            6: "compile_error",
            7: "runtime_error",  # SIGSEGV
            8: "runtime_error",  # SIGXFSZ
            9: "runtime_error",  # SIGFPE
            10: "runtime_error", # SIGABRT
            11: "runtime_error", # NZEC
            12: "runtime_error", # Other
            13: "runtime_error", # Internal Error
            14: "mle",          # Memory Limit Exceeded
        }
        return STATUS_MAP.get(status_id, "runtime_error")


judge_service = JudgeService()
