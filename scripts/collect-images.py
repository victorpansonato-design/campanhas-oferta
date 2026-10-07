"""Compatibility entry point: build only explicitly verified official course images."""
import runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).with_name("build-verified-images.py")), run_name="__main__")
