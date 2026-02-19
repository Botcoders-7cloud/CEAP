"""
CEAP Service — Code Execution Engine
Supports:
  1. Judge0 via RapidAPI  (production — set JUDGE0_API_KEY)
  2. Judge0 self-hosted    (docker — set JUDGE0_URL to your host)
  3. Local subprocess      (demo — no external services needed)
"""
import asyncio
import subprocess
import tempfile
import os
import httpx
from typing import Optional
from app.config import settings

# Judge0 language IDs
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

# RapidAPI Judge0 host
RAPIDAPI_HOST = "judge0-ce.p.rapidapi.com"


class JudgeService:
    """Code execution client — auto-selects backend based on config."""

    def __init__(self):
        self.base_url = settings.JUDGE0_URL
        self.api_key = settings.JUDGE0_API_KEY
        self.use_rapidapi = RAPIDAPI_HOST in self.base_url
        self.use_local = not self.api_key and "localhost" in self.base_url

        # Build headers based on backend type
        self.headers = {"Content-Type": "application/json"}
        if self.use_rapidapi and self.api_key:
            self.headers["X-RapidAPI-Key"] = self.api_key
            self.headers["X-RapidAPI-Host"] = RAPIDAPI_HOST
        elif self.api_key:
            self.headers["X-Auth-Token"] = self.api_key

    @property
    def mode(self) -> str:
        if self.use_local:
            return "local"
        elif self.use_rapidapi:
            return "rapidapi"
        else:
            return "self-hosted"

    # ── Main API — used by submissions.py ───────────────────

    async def execute(
        self,
        source_code: str,
        language: str,
        stdin: str = "",
        expected_output: Optional[str] = None,
        time_limit: float = 2.0,
        memory_limit: int = 262144,
    ) -> dict:
        """
        Execute code and return result.
        Returns dict with: status, stdout, stderr, compile_output,
                           time, memory, status_id
        """
        if self.use_local:
            return await self._execute_local(
                source_code, language, stdin, expected_output, time_limit
            )
        else:
            return await self._execute_judge0(
                source_code, language, stdin, expected_output,
                time_limit, memory_limit
            )

    # ── Judge0 backend (RapidAPI or self-hosted) ────────────

    async def _execute_judge0(
        self,
        source_code: str,
        language: str,
        stdin: str,
        expected_output: Optional[str],
        time_limit: float,
        memory_limit: int,
    ) -> dict:
        language_id = LANGUAGE_MAP.get(language)
        if not language_id:
            return self._error_result(f"Unsupported language: {language}")

        payload = {
            "source_code": source_code,
            "language_id": language_id,
            "stdin": stdin,
            "expected_output": expected_output,
            "cpu_time_limit": time_limit,
            "memory_limit": memory_limit,
            "enable_network": False,
        }

        try:
            # Submit
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/submissions?base64_encoded=false&wait=false",
                    json=payload,
                    headers=self.headers,
                    timeout=15.0,
                )

            if response.status_code not in (200, 201):
                return self._error_result(
                    f"Judge0 submission failed: {response.status_code} - {response.text}"
                )

            token = response.json().get("token")
            if not token:
                return self._error_result("No token returned from Judge0")

            # Poll for result (max 30 seconds)
            for _ in range(15):
                await asyncio.sleep(2)
                async with httpx.AsyncClient() as client:
                    result_resp = await client.get(
                        f"{self.base_url}/submissions/{token}"
                        f"?base64_encoded=false&fields=*",
                        headers=self.headers,
                        timeout=10.0,
                    )
                if result_resp.status_code != 200:
                    continue

                judge_result = result_resp.json()
                status_id = judge_result.get("status", {}).get("id", 0)
                if status_id >= 3:  # Finished
                    return self._parse_judge0_result(judge_result, expected_output)

            return self._error_result("Judge0 execution timed out (polling)")

        except httpx.ConnectError:
            if self.use_local:
                return await self._execute_local(
                    source_code, language, stdin, expected_output, time_limit
                )
            return self._error_result(
                "Cannot connect to Judge0. Set JUDGE0_API_KEY for RapidAPI "
                "or run Judge0 locally with Docker."
            )
        except Exception as e:
            return self._error_result(str(e))

    def _parse_judge0_result(self, jr: dict, expected_output: Optional[str]) -> dict:
        status_id = jr.get("status", {}).get("id", 0)
        stdout = jr.get("stdout") or ""
        stderr = jr.get("stderr") or ""
        compile_output = jr.get("compile_output") or ""
        time_sec = float(jr.get("time") or 0)
        memory_kb = float(jr.get("memory") or 0)

        # Determine pass/fail
        passed = False
        if status_id == 3:  # Accepted
            passed = True
        elif expected_output is not None and status_id >= 3:
            passed = stdout.strip() == expected_output.strip()

        return {
            "status": self.parse_status(status_id),
            "status_id": status_id,
            "stdout": stdout,
            "stderr": stderr,
            "compile_output": compile_output,
            "time": int(time_sec * 1000),       # ms
            "memory": int(memory_kb),            # KB
            "passed": passed,
        }

    # ── Local subprocess backend (demo mode) ────────────────

    async def _execute_local(
        self,
        source_code: str,
        language: str,
        stdin: str,
        expected_output: Optional[str],
        time_limit: float,
    ) -> dict:
        """Execute code locally using subprocess. Supports Python, JS, C, C++."""
        runners = {
            "python": self._run_python,
            "javascript": self._run_javascript,
            "c": self._run_c,
            "cpp": self._run_cpp,
            "java": self._run_java,
        }
        runner = runners.get(language)
        if not runner:
            return self._error_result(
                f"Local execution doesn't support '{language}' yet. "
                f"Supported: {', '.join(runners.keys())}"
            )

        try:
            return await runner(source_code, stdin, expected_output, time_limit)
        except Exception as e:
            return self._error_result(str(e))

    async def _run_python(self, code, stdin, expected, timeout):
        return await self._run_subprocess(
            ["python3", "-c", code], stdin, expected, timeout
        )

    async def _run_javascript(self, code, stdin, expected, timeout):
        return await self._run_subprocess(
            ["node", "-e", code], stdin, expected, timeout
        )

    async def _run_c(self, code, stdin, expected, timeout):
        return await self._compile_and_run(
            code, ".c", ["gcc", "-o"], stdin, expected, timeout
        )

    async def _run_cpp(self, code, stdin, expected, timeout):
        return await self._compile_and_run(
            code, ".cpp", ["g++", "-o"], stdin, expected, timeout
        )

    async def _run_java(self, code, stdin, expected, timeout):
        with tempfile.TemporaryDirectory() as tmpdir:
            # Extract class name (look for "public class X")
            import re
            match = re.search(r'public\s+class\s+(\w+)', code)
            class_name = match.group(1) if match else "Main"
            src = os.path.join(tmpdir, f"{class_name}.java")
            with open(src, "w") as f:
                f.write(code)
            # Compile
            proc = await asyncio.create_subprocess_exec(
                "javac", src,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=tmpdir,
            )
            _, cerr = await proc.communicate()
            if proc.returncode != 0:
                return {
                    "status": "compile_error",
                    "status_id": 6,
                    "stdout": "",
                    "stderr": "",
                    "compile_output": cerr.decode(errors="replace"),
                    "time": 0, "memory": 0, "passed": False,
                }
            return await self._run_subprocess(
                ["java", "-cp", tmpdir, class_name],
                stdin, expected, timeout,
            )

    async def _compile_and_run(self, code, ext, compiler_cmd, stdin, expected, timeout):
        with tempfile.TemporaryDirectory() as tmpdir:
            src = os.path.join(tmpdir, f"main{ext}")
            binary = os.path.join(tmpdir, "main")
            with open(src, "w") as f:
                f.write(code)

            # Compile
            proc = await asyncio.create_subprocess_exec(
                *compiler_cmd, binary, src,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _, cerr = await proc.communicate()
            if proc.returncode != 0:
                return {
                    "status": "compile_error",
                    "status_id": 6,
                    "stdout": "",
                    "stderr": "",
                    "compile_output": cerr.decode(errors="replace"),
                    "time": 0, "memory": 0, "passed": False,
                }

            # Run
            return await self._run_subprocess(
                [binary], stdin, expected, timeout
            )

    async def _run_subprocess(self, cmd, stdin, expected, timeout):
        import time as _time
        start = _time.monotonic()
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                proc.communicate(input=(stdin or "").encode()),
                timeout=timeout,
            )
        except asyncio.TimeoutError:
            try:
                proc.kill()
            except Exception:
                pass
            return {
                "status": "tle",
                "status_id": 5,
                "stdout": "",
                "stderr": "Time Limit Exceeded",
                "compile_output": "",
                "time": int(timeout * 1000),
                "memory": 0,
                "passed": False,
            }

        elapsed = int((_time.monotonic() - start) * 1000)
        stdout = stdout_bytes.decode(errors="replace")
        stderr = stderr_bytes.decode(errors="replace")

        if proc.returncode != 0:
            return {
                "status": "runtime_error",
                "status_id": 11,
                "stdout": stdout,
                "stderr": stderr,
                "compile_output": "",
                "time": elapsed,
                "memory": 0,
                "passed": False,
            }

        passed = False
        if expected is not None:
            passed = stdout.strip() == expected.strip()
        else:
            passed = True  # No expected output means just run

        return {
            "status": "accepted" if passed else "wrong_answer",
            "status_id": 3 if passed else 4,
            "stdout": stdout,
            "stderr": stderr,
            "compile_output": "",
            "time": elapsed,
            "memory": 0,
            "passed": passed,
        }

    # ── Helpers ─────────────────────────────────────────────

    @staticmethod
    def _error_result(message: str) -> dict:
        return {
            "status": "runtime_error",
            "status_id": 11,
            "stdout": "",
            "stderr": message,
            "compile_output": "",
            "time": 0,
            "memory": 0,
            "passed": False,
        }

    @staticmethod
    def parse_status(status_id: int) -> str:
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
