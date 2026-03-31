#!/usr/bin/env python3
"""
Convert DICOM files into PNG slices for MediSim imaging folders.

Usage example:
  python tools/convert_dicom_series.py ^
    --source "imaging-source" ^
    --target "public/imaging"
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Iterable, List, Tuple

import numpy as np

try:
    import pydicom
except Exception as exc:  # pragma: no cover
    raise SystemExit(
        "Missing dependency 'pydicom'. Install with: pip install pydicom numpy pillow"
    ) from exc

try:
    from PIL import Image
except Exception as exc:  # pragma: no cover
    raise SystemExit(
        "Missing dependency 'Pillow'. Install with: pip install pydicom numpy pillow"
    ) from exc


CT_REGIONS = ("kopf", "thorax", "abdomen", "angio")
BUCKETS = ("gesund", "krank")


def first_numeric_value(value, default: float | None = None) -> float | None:
    """Return first numeric element for DICOM scalar/MultiValue fields."""
    if value is None:
        return default
    if isinstance(value, (list, tuple)):
        if not value:
            return default
        return first_numeric_value(value[0], default=default)
    # pydicom MultiValue is sequence-like but not list/tuple
    if hasattr(value, "__iter__") and not isinstance(value, (str, bytes, np.ndarray)):
        seq = list(value)
        if not seq:
            return default
        return first_numeric_value(seq[0], default=default)
    try:
        return float(value)
    except Exception:
        return default


def iter_dicom_files(folder: Path) -> Iterable[Path]:
    if not folder.exists():
        return []
    return sorted(folder.rglob("*.dcm"))


def read_instance_number(path: Path) -> float:
    try:
        ds = pydicom.dcmread(str(path), stop_before_pixels=True, force=True)
        return float(getattr(ds, "InstanceNumber", 0))
    except Exception:
        return 0.0


def read_pixel_data(path: Path) -> np.ndarray | None:
    try:
        ds = pydicom.dcmread(str(path), force=True)
        arr = ds.pixel_array
    except Exception:
        return None

    arr = np.asarray(arr)
    if arr.ndim == 3:
        # Multi-frame DICOM: take center frame
        arr = arr[arr.shape[0] // 2]

    slope = first_numeric_value(getattr(ds, "RescaleSlope", 1.0), default=1.0) or 1.0
    intercept = first_numeric_value(getattr(ds, "RescaleIntercept", 0.0), default=0.0) or 0.0
    arr = arr.astype(np.float32) * slope + intercept

    wc = first_numeric_value(getattr(ds, "WindowCenter", None), default=None)
    ww = first_numeric_value(getattr(ds, "WindowWidth", None), default=None)

    if wc is not None and ww not in (None, 0):
        center = wc
        width = ww
        lower = center - width / 2.0
        upper = center + width / 2.0
    else:
        lower = float(np.percentile(arr, 2))
        upper = float(np.percentile(arr, 98))
        if upper <= lower:
            upper = lower + 1.0

    arr = np.clip(arr, lower, upper)
    arr = (arr - lower) / (upper - lower)
    arr = (arr * 255.0).astype(np.uint8)
    return arr


def select_slices(paths: List[Path], max_slices: int) -> List[Path]:
    if not paths:
        return []
    if max_slices <= 0 or max_slices >= len(paths):
        return paths
    if max_slices == 1:
        return [paths[len(paths) // 2]]
    indices = [int(round((len(paths) - 1) * (i / (max_slices - 1)))) for i in range(max_slices)]
    unique = []
    seen = set()
    for idx in indices:
        candidate = paths[max(0, min(len(paths) - 1, idx))]
        if candidate in seen:
            continue
        seen.add(candidate)
        unique.append(candidate)
    return unique


def convert_series(source_folder: Path, target_folder: Path, max_slices: int = 0) -> Tuple[int, int]:
    paths = list(iter_dicom_files(source_folder))
    if not paths:
        return (0, 0)

    ordered = sorted(paths, key=read_instance_number)
    selected = select_slices(ordered, max_slices)
    target_folder.mkdir(parents=True, exist_ok=True)

    written = 0
    failed = 0
    written_files: List[str] = []
    for idx, dicom_path in enumerate(selected, start=1):
        pixels = read_pixel_data(dicom_path)
        if pixels is None:
            failed += 1
            continue
        out_name = f"slice-{idx:03d}.png"
        out_path = target_folder / out_name
        Image.fromarray(pixels).save(out_path)
        written += 1
        written_files.append(out_name)

    manifest_path = target_folder / "manifest.json"
    manifest_payload = {
        "count": written,
        "files": written_files,
    }
    manifest_path.write_text(json.dumps(manifest_payload, ensure_ascii=True, indent=2), encoding="utf-8")
    return (written, failed)


def process_all(source_root: Path, target_root: Path, max_slices: int = 0) -> None:
    # CT folders
    for region in CT_REGIONS:
        for bucket in BUCKETS:
            src = source_root / "ct" / region / bucket
            dst = target_root / "ct" / region / bucket
            written, failed = convert_series(src, dst, max_slices=max_slices)
            print(f"[CT] {region}/{bucket}: written={written} failed={failed}")

    # HKL folders
    for bucket in BUCKETS:
        src = source_root / "hkl" / bucket
        dst = target_root / "hkl" / bucket
        written, failed = convert_series(src, dst, max_slices=max_slices)
        print(f"[HKL] {bucket}: written={written} failed={failed}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert DICOM folders to PNG slices.")
    parser.add_argument("--source", default="imaging-source", help="Source root with .dcm files")
    parser.add_argument("--target", default="public/imaging", help="Target root for PNG slices")
    parser.add_argument("--max-slices", type=int, default=0, help="Limit slices per series (0 = all)")
    args = parser.parse_args()

    source_root = Path(args.source).resolve()
    target_root = Path(args.target).resolve()
    print(f"Source: {source_root}")
    print(f"Target: {target_root}")

    process_all(source_root, target_root, max_slices=args.max_slices)


if __name__ == "__main__":
    main()
