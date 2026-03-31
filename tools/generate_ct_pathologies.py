#!/usr/bin/env python3
"""
Generate synthetic pathological CT PNG series from healthy series.

This is for simulation/demo purposes only. It does NOT create medically valid data.

Usage example:
  python tools/generate_ct_pathologies.py --imaging-root public/imaging
"""

from __future__ import annotations

import argparse
import json
import math
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import numpy as np
from PIL import Image, ImageFilter


@dataclass(frozen=True)
class Preset:
    region: str
    name: str
    description: str
    apply_fn: Callable[[list[np.ndarray], random.Random], list[np.ndarray]]


def load_series(folder: Path) -> list[np.ndarray]:
    manifest = folder / "manifest.json"
    files: list[Path] = []
    if manifest.exists():
        try:
            payload = json.loads(manifest.read_text(encoding="utf-8"))
            files = [folder / f for f in payload.get("files", [])]
        except Exception:
            files = []
    if not files:
        files = sorted(
            [*folder.glob("slice-*.png"), *folder.glob("slice-*.jpg"), *folder.glob("slice-*.webp")]
        )
    arrays: list[np.ndarray] = []
    for file in files:
        if not file.exists():
            continue
        img = Image.open(file).convert("L")
        arrays.append(np.asarray(img, dtype=np.float32))
    return arrays


def save_series(folder: Path, arrays: list[np.ndarray], meta: dict) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    files: list[str] = []
    for index, arr in enumerate(arrays, start=1):
        clipped = np.clip(arr, 0, 255).astype(np.uint8)
        out_name = f"slice-{index:03d}.png"
        Image.fromarray(clipped, mode="L").save(folder / out_name)
        files.append(out_name)
    payload = {
        "count": len(files),
        "files": files,
        "syntheticPathology": True,
        **meta,
    }
    (folder / "manifest.json").write_text(
        json.dumps(payload, ensure_ascii=True, indent=2), encoding="utf-8"
    )


def smooth_mask(mask: np.ndarray, radius: float) -> np.ndarray:
    img = Image.fromarray((np.clip(mask, 0, 1) * 255).astype(np.uint8), mode="L")
    return np.asarray(img.filter(ImageFilter.GaussianBlur(radius=radius)), dtype=np.float32) / 255.0


def circle_mask(shape: tuple[int, int], cx: float, cy: float, radius: float) -> np.ndarray:
    h, w = shape
    yy, xx = np.ogrid[:h, :w]
    return (((xx - cx) ** 2 + (yy - cy) ** 2) <= (radius**2)).astype(np.float32)


def ellipse_mask(shape: tuple[int, int], cx: float, cy: float, rx: float, ry: float) -> np.ndarray:
    h, w = shape
    yy, xx = np.ogrid[:h, :w]
    base = ((xx - cx) / max(rx, 1)) ** 2 + ((yy - cy) / max(ry, 1)) ** 2
    return (base <= 1.0).astype(np.float32)


def blend(arr: np.ndarray, mask: np.ndarray, target_value: float, strength: float = 1.0) -> np.ndarray:
    alpha = np.clip(mask * strength, 0.0, 1.0)
    return (arr * (1.0 - alpha)) + (target_value * alpha)


def add_noise(arr: np.ndarray, rng: random.Random, sigma: float = 3.0) -> np.ndarray:
    noise = np.random.default_rng(rng.randint(0, 2**31 - 1)).normal(0, sigma, arr.shape)
    return arr + noise.astype(np.float32)


def build_body_mask(slice_arr: np.ndarray) -> np.ndarray:
    h, w = slice_arr.shape
    soft = np.asarray(
        Image.fromarray(np.clip(slice_arr, 0, 255).astype(np.uint8), mode="L").filter(ImageFilter.GaussianBlur(radius=1.8)),
        dtype=np.float32,
    )
    raw = soft > max(14.0, float(np.percentile(soft, 45)) * 0.22)
    mask = np.zeros((h, w), dtype=np.float32)
    for y in range(h):
        xs = np.where(raw[y])[0]
        if xs.size < 5:
            continue
        x0, x1 = int(xs.min()), int(xs.max())
        mask[y, x0:x1 + 1] = 1.0
    return smooth_mask(mask, 1.2)


def build_thorax_lung_masks(slice_arr: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    h, w = slice_arr.shape
    body = build_body_mask(slice_arr) > 0.25
    dark = slice_arr < float(np.percentile(slice_arr[body], 24)) if np.any(body) else slice_arr < 30
    vertical_band = np.zeros_like(body, dtype=bool)
    vertical_band[int(h * 0.18): int(h * 0.88), int(w * 0.08): int(w * 0.92)] = True
    lung_candidate = body & dark & vertical_band
    left = np.zeros_like(slice_arr, dtype=np.float32)
    right = np.zeros_like(slice_arr, dtype=np.float32)
    mid = int(w * 0.5)
    left[:, :mid] = lung_candidate[:, :mid].astype(np.float32)
    right[:, mid:] = lung_candidate[:, mid:].astype(np.float32)
    return smooth_mask(left, 1.5), smooth_mask(right, 1.5)


def build_brain_mask(slice_arr: np.ndarray) -> np.ndarray:
    h, w = slice_arr.shape
    body = build_body_mask(slice_arr) > 0.35
    medium = (slice_arr > float(np.percentile(slice_arr, 30))) & (slice_arr < float(np.percentile(slice_arr, 92)))
    central = np.zeros_like(body, dtype=bool)
    central[int(h * 0.16): int(h * 0.88), int(w * 0.18): int(w * 0.82)] = True
    mask = (body & medium & central).astype(np.float32)
    return smooth_mask(mask, 1.8)


def build_intracranial_mask(slice_arr: np.ndarray) -> np.ndarray:
    """Conservative intracranial ROI to prevent lesions outside skull."""
    h, w = slice_arr.shape
    head = build_body_mask(slice_arr) > 0.35
    central_ellipse = ellipse_mask(
        slice_arr.shape,
        cx=w * 0.5,
        cy=h * 0.43,
        rx=w * 0.27,
        ry=h * 0.26,
    ) > 0.20
    upper_region = np.zeros_like(head, dtype=bool)
    upper_region[: int(h * 0.72), :] = True
    inner = head & central_ellipse & upper_region
    return smooth_mask(inner.astype(np.float32), 1.4)


def build_head_parenchyma_mask(slice_arr: np.ndarray) -> np.ndarray:
    intracranial = build_intracranial_mask(slice_arr) > 0.40
    brain = build_brain_mask(slice_arr) > 0.36
    return smooth_mask((intracranial & brain).astype(np.float32), 1.2)


def find_best_head_slice(stack: list[np.ndarray]) -> int:
    if not stack:
        return 0
    best_idx = len(stack) // 2
    best_score = -1.0
    start = int(len(stack) * 0.20)
    end = int(len(stack) * 0.78)
    if end <= start:
        start, end = 0, len(stack)
    for idx in range(start, end):
        slc = stack[idx]
        intracranial_area = float(np.sum(build_intracranial_mask(slc) > 0.42))
        brain_area = float(np.sum(build_head_parenchyma_mask(slc) > 0.34))
        score = intracranial_area + (0.35 * brain_area)
        if score > best_score:
            best_score = score
            best_idx = idx
    return best_idx


def build_head_bleed_focus_mask(slice_arr: np.ndarray, side_right: bool) -> np.ndarray:
    h, w = slice_arr.shape
    parenchyma = build_head_parenchyma_mask(slice_arr) > 0.34
    hemi = np.zeros_like(parenchyma, dtype=bool)
    if side_right:
        hemi[:, int(w * 0.52): int(w * 0.76)] = True
    else:
        hemi[:, int(w * 0.24): int(w * 0.48)] = True
    vertical = np.zeros_like(parenchyma, dtype=bool)
    vertical[int(h * 0.20): int(h * 0.54), :] = True
    return smooth_mask((parenchyma & hemi & vertical).astype(np.float32), 1.2)


def pick_mask_point(mask: np.ndarray, rng: random.Random, fallback: tuple[float, float]) -> tuple[float, float]:
    ys, xs = np.where(mask > 0.45)
    if xs.size == 0:
        return fallback
    idx = rng.randint(0, xs.size - 1)
    return float(xs[idx]), float(ys[idx])


def suppress_outside_head_artifacts(arr: np.ndarray) -> np.ndarray:
    head_mask = build_body_mask(arr)
    outside = head_mask < 0.18
    fixed = arr.copy()
    fixed[outside] = np.minimum(fixed[outside], 8.0)
    return fixed


def apply_3d_ball(
    stack: list[np.ndarray],
    center_slice: int,
    cx: float,
    cy: float,
    radius_xy: float,
    radius_z: int,
    target_value: float,
    blur_radius: float,
    strength: float = 1.0,
    constraint_stack: list[np.ndarray] | None = None,
) -> list[np.ndarray]:
    result = [s.copy() for s in stack]
    for idx in range(max(0, center_slice - radius_z), min(len(stack), center_slice + radius_z + 1)):
        z_dist = abs(idx - center_slice) / max(radius_z, 1)
        if z_dist > 1:
            continue
        r_factor = math.sqrt(max(0.0, 1.0 - z_dist**2))
        r = max(2.0, radius_xy * r_factor)
        mask = circle_mask(result[idx].shape, cx, cy, r)
        mask = smooth_mask(mask, blur_radius)
        if constraint_stack is not None and idx < len(constraint_stack):
            constraint = np.clip(constraint_stack[idx], 0.0, 1.0)
            mask = mask * constraint
        result[idx] = blend(result[idx], mask, target_value=target_value, strength=strength)
    return result


def preset_head_bleed(stack: list[np.ndarray], rng: random.Random) -> list[np.ndarray]:
    if not stack:
        return stack
    h, w = stack[0].shape
    base_cs = find_best_head_slice(stack)
    cs = max(0, min(len(stack) - 1, base_cs + rng.randint(-2, 2)))
    side_right = rng.random() < 0.5
    ref = stack[cs]
    focus_ref = build_head_bleed_focus_mask(ref, side_right=side_right)
    fallback_x = w * (0.60 if side_right else 0.40)
    cx, cy = pick_mask_point(focus_ref, rng, fallback=(fallback_x, h * 0.39))
    radius = min(h, w) * (0.038 + rng.random() * 0.016)
    focus_stack = [build_head_bleed_focus_mask(s, side_right=side_right) for s in stack]
    out = apply_3d_ball(
        stack,
        cs,
        cx,
        cy,
        radius,
        radius_z=5,
        target_value=230,
        blur_radius=1.0,
        strength=0.92,
        constraint_stack=focus_stack,
    )
    return [suppress_outside_head_artifacts(add_noise(s, rng, sigma=2.8)) for s in out]


def preset_head_ischemia(stack: list[np.ndarray], rng: random.Random) -> list[np.ndarray]:
    if not stack:
        return stack
    result = [s.copy() for s in stack]
    h, w = result[0].shape
    base_cs = find_best_head_slice(result)
    cs = max(0, min(len(result) - 1, base_cs + rng.randint(-2, 2)))
    parenchyma_ref = build_head_parenchyma_mask(result[max(0, min(len(result) - 1, cs))])
    side_right = rng.random() < 0.5
    focus_ref = build_head_bleed_focus_mask(result[cs], side_right=side_right)
    bx, by = pick_mask_point(focus_ref * parenchyma_ref, rng, fallback=(w * (0.60 if side_right else 0.40), h * 0.40))
    for idx in range(max(0, cs - 6), min(len(result), cs + 7)):
        zf = 1.0 - (abs(idx - cs) / 7.0)
        if zf <= 0:
            continue
        cx = bx + (rng.random() - 0.5) * w * 0.02
        cy = by + (rng.random() - 0.5) * h * 0.02
        rx = w * (0.08 + rng.random() * 0.025) * zf
        ry = h * (0.06 + rng.random() * 0.02) * zf
        mask = ellipse_mask(result[idx].shape, cx, cy, rx, ry)
        mask = mask * build_head_bleed_focus_mask(result[idx], side_right=side_right) * build_head_parenchyma_mask(result[idx])
        mask = smooth_mask(mask, 1.8)
        local_target = float(np.percentile(result[idx], 27))
        result[idx] = blend(result[idx], mask, target_value=local_target, strength=0.60)
    return [suppress_outside_head_artifacts(add_noise(s, rng, sigma=2.2)) for s in result]


def preset_thorax_pneumonia(stack: list[np.ndarray], rng: random.Random) -> list[np.ndarray]:
    if not stack:
        return stack
    result = [s.copy() for s in stack]
    h, w = result[0].shape
    start = int(len(result) * 0.32)
    end = int(len(result) * 0.72)
    # Fixed side improves recognizability and ROI verification in dev preview.
    side_left = False
    for idx in range(start, end):
        zf = 1.0 - abs((idx - (start + end) / 2) / ((end - start) / 2 + 1))
        if zf <= 0:
            continue
        left_lung, right_lung = build_thorax_lung_masks(result[idx])
        lung = left_lung if side_left else right_lung
        base_cx, base_cy = pick_mask_point(lung, rng, fallback=(w * 0.66, h * 0.62))
        mask_total = np.zeros_like(result[idx], dtype=np.float32)
        for _ in range(4):
            cx = base_cx + (rng.random() - 0.5) * w * 0.045
            cy = base_cy + (rng.random() - 0.5) * h * 0.045
            rx = w * (0.055 + rng.random() * 0.02) * zf
            ry = h * (0.07 + rng.random() * 0.03) * zf
            m = ellipse_mask(result[idx].shape, cx, cy, rx, ry)
            mask_total = np.clip(mask_total + m, 0, 1)
        mask = smooth_mask(mask_total * (lung > 0.28), 1.6)
        target = min(240.0, float(np.percentile(result[idx], 90)) + 14.0)
        result[idx] = blend(result[idx], mask, target_value=target, strength=0.74)
    return [add_noise(s, rng, sigma=2.4) for s in result]


def preset_thorax_pneumothorax(stack: list[np.ndarray], rng: random.Random) -> list[np.ndarray]:
    if not stack:
        return stack
    result = [s.copy() for s in stack]
    h, w = result[0].shape
    # Fixed side improves recognizability and ROI verification in dev preview.
    side_left = True
    start = int(len(result) * 0.30)
    end = int(len(result) * 0.78)
    for idx in range(start, end):
        zf = 1.0 - abs((idx - (start + end) / 2) / ((end - start) / 2 + 1))
        if zf <= 0:
            continue
        left_lung, right_lung = build_thorax_lung_masks(result[idx])
        lung = left_lung if side_left else right_lung
        lung_bin = lung > 0.35
        if not np.any(lung_bin):
            continue
        x_indices = np.where(lung_bin)[1]
        edge_x = int(np.min(x_indices) + 2) if side_left else int(np.max(x_indices) - 2)
        stripe_width = max(5, int(w * (0.026 + 0.018 * zf)))
        mask = np.zeros_like(result[idx], dtype=np.float32)
        if side_left:
            mask[:, :edge_x + stripe_width] = lung_bin[:, :edge_x + stripe_width].astype(np.float32)
        else:
            mask[:, edge_x - stripe_width:] = lung_bin[:, edge_x - stripe_width:].astype(np.float32)
        mask = smooth_mask(mask, 1.5)
        result[idx] = blend(result[idx], mask, target_value=4.0, strength=0.66)
        # pleural line to avoid "painted block" look
        line_mask = np.zeros_like(result[idx], dtype=np.float32)
        lx = edge_x + (1 if side_left else -1)
        line_mask[:, max(0, lx - 1): min(w, lx + 1)] = lung_bin[:, max(0, lx - 1): min(w, lx + 1)].astype(np.float32)
        result[idx] = blend(result[idx], smooth_mask(line_mask, 0.8), target_value=175.0, strength=0.40)
    return [add_noise(s, rng, sigma=2.2) for s in result]


def preset_abdomen_appendicitis(stack: list[np.ndarray], rng: random.Random) -> list[np.ndarray]:
    if not stack:
        return stack
    h, w = stack[0].shape
    cs = int(len(stack) * 0.62) + rng.randint(-5, 5)
    cx = w * (0.62 + rng.random() * 0.04)
    cy = h * (0.70 + rng.random() * 0.05)
    radius = min(h, w) * (0.028 + rng.random() * 0.012)
    out = apply_3d_ball(stack, cs, cx, cy, radius, radius_z=3, target_value=208, blur_radius=1.4, strength=0.72)
    return [add_noise(s, rng, sigma=2.6) for s in out]


def preset_abdomen_pancreatitis(stack: list[np.ndarray], rng: random.Random) -> list[np.ndarray]:
    if not stack:
        return stack
    result = [s.copy() for s in stack]
    h, w = result[0].shape
    start = int(len(result) * 0.42)
    end = int(len(result) * 0.70)
    for idx in range(start, end):
        zf = 1.0 - abs((idx - (start + end) / 2) / ((end - start) / 2 + 1))
        if zf <= 0:
            continue
        cx = w * (0.50 + (rng.random() - 0.5) * 0.05)
        cy = h * (0.58 + (rng.random() - 0.5) * 0.06)
        rx = w * (0.10 + rng.random() * 0.03) * zf
        ry = h * (0.045 + rng.random() * 0.02) * zf
        mask = ellipse_mask(result[idx].shape, cx, cy, rx, ry)
        mask = smooth_mask(mask, 1.7)
        target = min(232.0, float(np.percentile(result[idx], 86)) + 10.0)
        result[idx] = blend(result[idx], mask, target_value=target, strength=0.56)
    return [add_noise(s, rng, sigma=2.4) for s in result]


def preset_abdomen_ileus(stack: list[np.ndarray], rng: random.Random) -> list[np.ndarray]:
    if not stack:
        return stack
    result = [s.copy() for s in stack]
    h, w = result[0].shape
    start = int(len(result) * 0.38)
    end = int(len(result) * 0.76)
    for idx in range(start, end):
        zf = 1.0 - abs((idx - (start + end) / 2) / ((end - start) / 2 + 1))
        if zf <= 0:
            continue
        for _ in range(2):
            cx = w * (0.40 + rng.random() * 0.25)
            cy = h * (0.52 + rng.random() * 0.20)
            r = min(h, w) * (0.04 + rng.random() * 0.015) * zf
            mask = circle_mask(result[idx].shape, cx, cy, r)
            ring = np.clip(mask - smooth_mask(mask, 1.4) * 0.65, 0, 1)
            mask = smooth_mask(mask, 1.3)
            target = min(236.0, float(np.percentile(result[idx], 91)) + 12.0)
            result[idx] = blend(result[idx], mask, target_value=target, strength=0.46)
            result[idx] = blend(result[idx], ring, target_value=162.0, strength=0.34)
    return [add_noise(s, rng, sigma=2.3) for s in result]


PRESETS: list[Preset] = [
    Preset("kopf", "bleed", "Intrakranielle Blutung (synthetisch)", preset_head_bleed),
    Preset("kopf", "ischemia", "Ischaemisches Areal (synthetisch)", preset_head_ischemia),
    Preset("thorax", "pneumonia", "Pneumonie-Infiltrat (synthetisch)", preset_thorax_pneumonia),
    Preset("thorax", "pneumothorax", "Pneumothorax-Muster (synthetisch)", preset_thorax_pneumothorax),
    Preset("abdomen", "appendicitis", "Appendizitisnaher Fokus (synthetisch)", preset_abdomen_appendicitis),
    Preset("abdomen", "pancreatitis", "Pankreatitisnahes Muster (synthetisch)", preset_abdomen_pancreatitis),
    Preset("abdomen", "ileus", "Ileusnahes Muster (synthetisch)", preset_abdomen_ileus),
]


def region_presets(region: str) -> list[Preset]:
    return [p for p in PRESETS if p.region == region]


def process_region(root: Path, region: str, seed: int) -> tuple[int, int]:
    source = root / "ct" / region / "gesund"
    stack = load_series(source)
    if not stack:
        print(f"[SKIP] {region}: keine gesunde Serie gefunden in {source}")
        return (0, 0)
    generated = 0
    failed = 0
    for idx, preset in enumerate(region_presets(region), start=1):
        try:
            rng = random.Random(seed + (hash(region) & 0xFFFF) + idx * 991)
            out_stack = preset.apply_fn(stack, rng)
            out_dir = root / "ct" / region / "krank" / preset.name
            save_series(
                out_dir,
                out_stack,
                meta={
                    "region": region,
                    "preset": preset.name,
                    "description": preset.description,
                    "sourceFolder": str(source),
                },
            )
            print(f"[OK] {region}/{preset.name}: {len(out_stack)} slices")
            generated += 1
        except Exception as exc:  # pragma: no cover
            print(f"[FAIL] {region}/{preset.name}: {exc}")
            failed += 1
    return (generated, failed)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate synthetic CT pathology series from healthy PNG slices.")
    parser.add_argument("--imaging-root", default="public/imaging", help="Imaging root path")
    parser.add_argument("--seed", type=int, default=1337, help="Random seed")
    args = parser.parse_args()

    root = Path(args.imaging_root).resolve()
    print(f"Imaging root: {root}")
    total_ok = 0
    total_fail = 0
    for region in ("kopf", "thorax", "abdomen"):
        ok, fail = process_region(root, region, args.seed)
        total_ok += ok
        total_fail += fail
    print(f"Done. generated={total_ok} failed={total_fail}")


if __name__ == "__main__":
    main()
