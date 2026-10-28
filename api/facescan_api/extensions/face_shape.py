"""
Facial Shape Classifier & Styling Guide (Ported from DSI314).
Classifies face shapes into 6 anthropometric categories:
- Oval (หน้ารูปไข่)
- Round (หน้ากลม)
- Square (หน้าเหลี่ยม)
- Heart (หน้ารูปหัวใจ)
- Oblong / Long (หน้ายาว)
- Diamond (หน้ารูปเพชร)

Uses pure NumPy anthropometric Gaussian distributions (Farkas et al.)
without requiring scikit-learn.
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Tuple
import numpy as np

FACE_SHAPES = ["Oval", "Round", "Square", "Heart", "Oblong", "Diamond"]

FACE_SHAPES_TH: Dict[str, str] = {
    "Oval": "หน้ารูปไข่ (Oval)",
    "Round": "หน้ากลม (Round)",
    "Square": "หน้าเหลี่ยม (Square)",
    "Heart": "หน้ารูปหัวใจ (Heart)",
    "Oblong": "หน้ายาว (Oblong)",
    "Diamond": "หน้ารูปเพชร (Diamond)",
}

FACE_SHAPE_DESCRIPTIONS: Dict[str, str] = {
    "Oval": "ความยาวใบหน้ามากกว่าความกว้างประมาณ 1.4-1.5 เท่า แนวกรามโค้งมน โหนกแก้มกว้างกว่าแนวกรามเล็กน้อย สัดส่วนสมดุลตามธรรมชาติ",
    "Round": "ความยาวและความกว้างของใบหน้าใกล้เคียงกัน แนวกรามโค้งมน แก้มอิ่มสวย ไม่มีมุมเหลี่ยมที่เด่นชัด",
    "Square": "ความกว้างของหน้าผาก โหนกแก้ม และแนวกรามใกล้เคียงกัน แนวกรามคมชัด มีมุมเหลี่ยมที่เด่นชัด มั่นคง",
    "Heart": "หน้าผากและโหนกแก้มกว้าง เรียวสอบลงมายังคางแหลมหรือมนเล็กน้อย คล้ายรูปสามเหลี่ยมหัวกลับ",
    "Oblong": "ใบหน้ามีความยาวมากกว่าความกว้างอย่างชัดเจน หน้าผาก โหนกแก้ม และกรามมีความกว้างใกล้เคียงกัน",
    "Diamond": "โหนกแก้มเป็นจุดที่กว้างที่สุดของใบหน้า หน้าผากและแนวกรามค่อนข้างแคบ คางเรียวแหลม",
}

# 1. Styling Advice for Females
STYLING_ADVICE_FEMALE: Dict[str, Dict[str, List[str]]] = {
    "Oval": {
        "hairstyles": [
            "สามารถไว้ทรงผมได้แทบทุกทรง ทั้งผมสั้น บ็อบ ผมยาวตรง หรือผมลอนคลาย",
            "ทรงผมเปิดหน้าผากหรือแสกกลางจะช่วยเน้นสัดส่วนสมดุลของใบหน้าได้ดีที่สุด",
            "หลีกเลี่ยงผมหน้าม้าหนาเตอะที่อาจปิดหน้าผากจนบดบังสัดส่วนธรรมชาติ",
        ],
        "glasses": [
            "กรอบแว่นทรงเรขาคณิต ทรงเหลี่ยมมน หรือทรง Cat-eye",
            "เลือกกรอบที่มีความกว้างพอดีหรือกว้างกว่าโหนกแก้มเล็กน้อย",
        ],
        "aesthetic_focus": [
            "รักษาสมดุลความชุ่มชื้นและมิติความสม่ำเสมอของผิว",
            "เน้นการแต่งหน้าเสริมจุดเด่นตามธรรมชาติโดยไม่ต้องคอนทัวร์หนัก",
        ],
    },
    "Round": {
        "hairstyles": [
            "ผมยาวตรงสไลด์เลเยอร์ช่วงคาง (Long layered cut) ช่วยพรางแก้มให้หน้าดูเรียว",
            "ทรงผมแสกข้างลึก (Deep side part) หรือเปิดหน้าผากเพื่อเพิ่มมิติแนวดิ่ง",
            "หลีกเลี่ยงผมบ็อบสั้นระดับคางที่ปลายงุ้มเข้า หรือผมดัดลอนพองฟูด้านข้าง",
        ],
        "glasses": [
            "กรอบแว่นทรงเหลี่ยม ทรงสี่เหลี่ยมผืนผ้า (Rectangular / Wayfarer) เบรกความกลม",
            "หลีกเลี่ยงกรอบแว่นทรงกลมหรือทรงรีขนาดเล็ก",
        ],
        "aesthetic_focus": [
            "คอนทัวร์บริเวณกรอบหน้าข้างแก้มเพื่อสร้างมิติและเงา",
            "ไฮไลต์บริเวณสันจมูกและปลายคางเพื่อช่วยยืดสัดส่วนแนวดิ่ง",
        ],
    },
    "Square": {
        "hairstyles": [
            "ผมดัดลอนคลื่นนุ่มนวล (Soft waves) ช่วยลดความแข็งของมุมกราม",
            "ผมสไลด์ปลายประบ่าล้อมกรอบหน้า หรือผมแสกข้างลดความเหลี่ยม",
            "หลีกเลี่ยงผมบ็อบตัดตรงระดับแนวกราม หรือผมหน้าม้าตัดตรงทึบ",
        ],
        "glasses": [
            "กรอบแว่นทรงกลม ทรงรี (Round / Oval) หรือทรง Aviator เบรกเหลี่ยมกราม",
            "หลีกเลี่ยงกรอบแว่นทรงสี่เหลี่ยมหนาคม",
        ],
        "aesthetic_focus": [
            "ปัดบลัชออนทรงกลมมนบนพวงแก้มเพื่อลดความคมของเหลี่ยมมุม",
            "ไฮไลต์จุดกึ่งกลางหน้าผากและคางเพื่อดึงสายตาเข้าสู่แนวกึ่งกลาง",
        ],
    },
    "Heart": {
        "hairstyles": [
            "ผมบ็อบยาวประบ่า (Lob) ที่มีวอลลุ่มช่วงปลายเพื่อบาลานซ์กับหน้าผาก",
            "ผมหน้าม้าปัดข้าง (Side-swept bangs) ช่วยพรางความกว้างของหน้าผาก",
            "หลีกเลี่ยงทรงผมตีโป่งสูงบนกระหม่อม หรือผมสั้นกุดที่เน้นหน้าผากกว้าง",
        ],
        "glasses": [
            "กรอบแว่นทรง Cat-eye หรือกรอบที่ช่วงล่างกว้างกว่าช่วงบน",
            "หลีกเลี่ยงกรอบที่มีลวดลายหรือประดับหนาช่วงบนของแว่น",
        ],
        "aesthetic_focus": [
            "คอนทัวร์บริเวณขมับด้านข้างเพื่อลดความกว้างของหน้าผาก",
            "เติมเต็มมิติช่วงคางให้สมดุลกับส่วนบนของใบหน้า",
        ],
    },
    "Oblong": {
        "hairstyles": [
            "ผมหน้าม้าตรงหรือหน้าม้าซีทรู (Curtain bangs) ช่วยลดความยาวหน้าผากได้อย่างดี",
            "ผมดัดลอนมีวอลลุ่มด้านข้าง (Side volume) ช่วยเพิ่มความกว้างให้ใบหน้า",
            "หลีกเลี่ยงผมยาวตรงดิ่ง หรือทรงผมที่ยกโคนสูงมากเกินไปบนกระหม่อม",
        ],
        "glasses": [
            "กรอบแว่นขนาดใหญ่ (Oversized) หรือกรอบที่มีสะพานแว่นเด่นชัดเพื่อแบ่งสัดส่วน",
            "หลีกเลี่ยงแว่นทรงแคบหรือทรงยาวแนวตั้ง",
        ],
        "aesthetic_focus": [
            "เน้นความกว้างของสัดส่วนโหนกแก้มและริมฝีปาก",
            "ปัดบลัชออนแนวนอนเพื่อลดมิติความยาวของใบหน้า",
        ],
    },
    "Diamond": {
        "hairstyles": [
            "ผมหน้าม้าปัดข้าง หรือผมเปิดข้างทัดหู ช่วยเน้นโหนกแก้มที่โดดเด่นอย่างลงตัว",
            "ผมบ็อบประบ่าเพิ่มความหนาบริเวณปลายคางเพื่อบาลานซ์กับโหนกแก้ม",
            "หลีกเลี่ยงการเปิดหน้าผากและรวบตึงทั้งหมด หรือผมพองฟูเฉพาะช่วงโหนกแก้ม",
        ],
        "glasses": [
            "กรอบแว่นทรง Cat-eye ทรงรี หรือทรง Browline ที่มีดีเทลช่วงบน",
            "หลีกเลี่ยงกรอบแว่นทรงแคบที่ปลายกรอบสิ้นสุดพอดีกับโหนกแก้ม",
        ],
        "aesthetic_focus": [
            "แต่งเติมมิติบริเวณขมับเพื่อให้แนวกรอบหน้าเชื่อมต่อกันอย่างนุ่มนวล",
            "บาลานซ์ความเด่นของโหนกแก้มให้รับกับปลายคาง",
        ],
    },
}

# 2. Styling Advice for Males
STYLING_ADVICE_MALE: Dict[str, Dict[str, List[str]]] = {
    "Oval": {
        "hairstyles": [
            "เหมาะกับทรงผมเกือบทุกสไตล์ เช่น Slick Back, Classic Side Part หรือ Quiff",
            "ทรง Crew Cut หรือ Ivy League ช่วยขับเน้นโครงหน้าที่ได้รูปสมดุล",
            "หลีกเลี่ยงผมหน้าม้าหนาปิดหน้าผากมิดชิดที่จะทำให้ใบหน้าดูกลมมนเกินไป",
        ],
        "glasses": [
            "กรอบแว่นทรง Wayfarer, Clubmaster หรือทรงสี่เหลี่ยมผืนผ้ามุมมน",
            "เลือกกรอบที่มีความกว้างพอดีกับขมับเพื่อรักษาบาลานซ์ธรรมชาติ",
        ],
        "aesthetic_focus": [
            "เน้นการเล็มแต่งกรอบหน้าและแนวกรามให้สะอาด คมชัด",
            "ไว้ตอเคราสั้น (Short Stubble) ที่ตัดแต่งเป็นระเบียบ",
        ],
    },
    "Round": {
        "hairstyles": [
            "ทรง Pompadour, High Quiff หรือ Faux Hawk ยกผมด้านบนสูงเพื่อเพิ่มมิติแนวดิ่ง",
            "ไถข้างแบบ High Fade หรือ Undercut ช่วยตัดความกลมด้านข้างของแก้ม",
            "หลีกเลี่ยงทรงผมกะลาครอบ (Bowl cut) หรือผมยาวเสมอกันรอบหัว",
        ],
        "glasses": [
            "กรอบแว่นทรงเหลี่ยมมุมคม (Square / Rectangular frames) เพื่อตัดความโค้งมน",
            "หลีกเลี่ยงกรอบทรงกลมหรือทรงหยดน้ำที่ทำให้หน้าดูกลมยิ่งขึ้น",
        ],
        "aesthetic_focus": [
            "ไว้เคราแพะหรือเคราปลายคาง (Goatee / Van Dyke) ช่วยยืดรูปหน้าให้ดูยาวคมขึ้น",
            "ตัดแต่งเคราข้างแก้มให้บาง เลี่ยงเคราข้างแก้มหนาที่ทำให้หน้ากว้าง",
        ],
    },
    "Square": {
        "hairstyles": [
            "ทรง Buzz Cut, Crew Cut หรือ Side Part สั้น ช่วยขับเน้นแนวกรามแกร่งแบบ Masculine",
            "ทรง Textured Undercut ที่มีความพริ้วด้านบนเล็กน้อยเพื่อลดความกระด้าง",
            "หลีกเลี่ยงทรงผมแสกกลางเรียบแบน หรือผมบ็อบยาวปรกกราม",
        ],
        "glasses": [
            "กรอบแว่นทรงกลม ทรงรี หรือทรงหยดน้ำ (Round / Aviator) เพื่อช่วยเกลี่ยเหลี่ยมมุม",
            "เลือกกรอบขอบบางเพื่อไม่ให้ใบหน้าดูหนักเกินไป",
        ],
        "aesthetic_focus": [
            "เน้นความคมชัดของสันกรามตามธรรมชาติ",
            "ไว้เคราตอแบบ Heavy Stubble ล้อมกรอบกราม เพิ่มเสน่ห์คมเข้ม",
        ],
    },
    "Heart": {
        "hairstyles": [
            "ทรง Textured Fringe หรือ Messy Quiff ที่ปล่อยผมลงมาปรกหน้าผากบางส่วน",
            "ทรงผมที่มีความยาวระดับปานกลาง (Medium length) มีวอลลุ่มช่วงข้างใบหู",
            "หลีกเลี่ยงการไถข้างเตียนเปิดหน้าผากกว้างทั้งหมด (High & Tight)",
        ],
        "glasses": [
            "กรอบแว่นทรงรี หรือกรอบที่มีขอบล่างกว้างกว่าขอบบนเพื่อบาลานซ์ปลายคาง",
            "หลีกเลี่ยงกรอบแว่นหนาเตอะหรือกรอบทรงกว้างเกินไป",
        ],
        "aesthetic_focus": [
            "ไว้เคราเต็มช่วงแนวกรามและคาง (Full Beard) เพื่อเพิ่มความหนาและบาลานซ์คางเล็ก",
            "เล็มแต่งหนวดให้รับกับแนวกรามเพื่อสร้างสมดุลสัดส่วน",
        ],
    },
    "Oblong": {
        "hairstyles": [
            "ทรง Side Part มีวอลลุ่มด้านข้าง หรือ Textured Crop มีผมหน้าม้าสั้นปรกหน้าผาก",
            "ทรง Taper Fade ด้านข้างที่ไม่สั้นเตียนเกินไป เพื่อรักษาความกว้างของศีรษะ",
            "หลีกเลี่ยงทรงที่เซ็ตผมยกสูงมาก เช่น Pompadour สูง เพราะจะทำให้หน้าดูยาวยิ่งขึ้น",
        ],
        "glasses": [
            "กรอบแว่นขนาดใหญ่ (Oversized) หรือทรงสี่เหลี่ยมจัตุรัสที่มีสะพานแว่นคู่ (Double bridge)",
            "หลีกเลี่ยงแว่นทรงแคบเล็กที่เน้นความยาวของใบหน้า",
        ],
        "aesthetic_focus": [
            "ไว้หนวดหรือเคราแนวนอนสั้นๆ เพื่อช่วยตัดมิติความยาวของใบหน้า",
            "หลีกเลี่ยงเคราแพะยาวที่ชี้ลงด้านล่าง",
        ],
    },
    "Diamond": {
        "hairstyles": [
            "ทรง Textured Crop, French Crop หรือ Side Part แสกข้างที่มีเลเยอร์นุ่มนวล",
            "ทรง Low to Mid Fade (หลีกเลี่ยง High Skin Fade เตียน เพราะจะเน้นโหนกแก้มกว้าง)",
            "ไว้ผมด้านบนให้มีความหนาและตกลงมาปรกขมับเล็กน้อย เพื่อบาลานซ์หน้าผากแคบ",
        ],
        "glasses": [
            "กรอบแว่นทรง Browline หรือทรง Wayfarer ขอบมน ที่มีรายละเอียดช่วงบนชัดเจน",
            "หลีกเลี่ยงกรอบแว่นทรงแคบที่ความกว้างสิ้นสุดตรงตำแหน่งโหนกแก้มพอดี",
        ],
        "aesthetic_focus": [
            "ไว้เคราสั้นทรงเหลี่ยมมนช่วงปลายคางเพื่อเพิ่มความกว้างและบาลานซ์คางแหลม",
            "ตัดแต่งแนวเคราข้างแก้มให้เรียบร้อยเพื่อไม่ให้โหนกแก้มดูกว้างเกินไป",
        ],
    },
}

# Anthropometric distribution parameters (Mean, Std) from Farkas clinical distributions
ANTHRO_DISTRIBUTIONS: Dict[str, Dict[str, Tuple[float, float]]] = {
    "Oval": {
        "length_to_width_ratio": (1.42, 0.06),
        "forehead_to_cheekbone_ratio": (0.86, 0.04),
        "jaw_to_cheekbone_ratio": (0.76, 0.04),
        "forehead_to_jaw_ratio": (1.13, 0.05),
        "chin_angle_deg": (92.0, 5.0),
        "chin_roundness_index": (0.52, 0.04),
        "lower_face_height_ratio": (0.34, 0.03),
        "cheekbone_prominence": (1.23, 0.05),
    },
    "Round": {
        "length_to_width_ratio": (1.18, 0.06),
        "forehead_to_cheekbone_ratio": (0.88, 0.04),
        "jaw_to_cheekbone_ratio": (0.83, 0.04),
        "forehead_to_jaw_ratio": (1.06, 0.04),
        "chin_angle_deg": (108.0, 6.0),
        "chin_roundness_index": (0.64, 0.05),
        "lower_face_height_ratio": (0.31, 0.03),
        "cheekbone_prominence": (1.17, 0.04),
    },
    "Square": {
        "length_to_width_ratio": (1.20, 0.06),
        "forehead_to_cheekbone_ratio": (0.94, 0.04),
        "jaw_to_cheekbone_ratio": (0.93, 0.04),
        "forehead_to_jaw_ratio": (1.01, 0.04),
        "chin_angle_deg": (115.0, 6.0),
        "chin_roundness_index": (0.68, 0.05),
        "lower_face_height_ratio": (0.33, 0.03),
        "cheekbone_prominence": (1.07, 0.04),
    },
    "Heart": {
        "length_to_width_ratio": (1.38, 0.06),
        "forehead_to_cheekbone_ratio": (0.97, 0.04),
        "jaw_to_cheekbone_ratio": (0.66, 0.04),
        "forehead_to_jaw_ratio": (1.47, 0.06),
        "chin_angle_deg": (76.0, 5.0),
        "chin_roundness_index": (0.40, 0.04),
        "lower_face_height_ratio": (0.32, 0.03),
        "cheekbone_prominence": (1.22, 0.05),
    },
    "Oblong": {
        "length_to_width_ratio": (1.68, 0.07),
        "forehead_to_cheekbone_ratio": (0.91, 0.04),
        "jaw_to_cheekbone_ratio": (0.88, 0.04),
        "forehead_to_jaw_ratio": (1.03, 0.05),
        "chin_angle_deg": (98.0, 6.0),
        "chin_roundness_index": (0.56, 0.04),
        "lower_face_height_ratio": (0.38, 0.03),
        "cheekbone_prominence": (1.11, 0.04),
    },
    "Diamond": {
        "length_to_width_ratio": (1.40, 0.06),
        "forehead_to_cheekbone_ratio": (0.75, 0.04),
        "jaw_to_cheekbone_ratio": (0.68, 0.04),
        "forehead_to_jaw_ratio": (1.10, 0.05),
        "chin_angle_deg": (80.0, 5.0),
        "chin_roundness_index": (0.43, 0.04),
        "lower_face_height_ratio": (0.33, 0.03),
        "cheekbone_prominence": (1.40, 0.06),
    },
}

# Key MediaPipe face mesh landmarks
TRICHION = 10
MENTON = 152
ZYGOMATIC_R = 234
ZYGOMATIC_L = 454
TEMPLE_R = 103
TEMPLE_L = 332
GONION_R = 172
GONION_L = 397
SUBNASALE = 2
CHIN_WIDE_R = 148
CHIN_WIDE_L = 377


def extract_face_shape_features(landmarks: np.ndarray) -> Dict[str, float]:
    """Extracts 8 scale-invariant anthropometric features from 2D coordinates."""
    pts = np.asarray(landmarks)[:, :2]

    def d(i1: int, i2: int) -> float:
        return float(np.linalg.norm(pts[i1] - pts[i2]))

    face_height = d(TRICHION, MENTON)
    cheekbone_width = max(d(ZYGOMATIC_R, ZYGOMATIC_L), 1.0)
    forehead_width = d(TEMPLE_R, TEMPLE_L)
    jaw_width = d(GONION_R, GONION_L)
    chin_width = d(CHIN_WIDE_R, CHIN_WIDE_L)
    lower_face_height = d(SUBNASALE, MENTON)

    # Chin angle
    v_r = pts[GONION_R] - pts[MENTON]
    v_l = pts[GONION_L] - pts[MENTON]
    nr = np.linalg.norm(v_r)
    nl = np.linalg.norm(v_l)
    if nr > 1e-4 and nl > 1e-4:
        cos_a = np.clip(np.dot(v_r, v_l) / (nr * nl), -1.0, 1.0)
        chin_angle_deg = float(np.degrees(np.arccos(cos_a)))
    else:
        chin_angle_deg = 90.0

    return {
        "length_to_width_ratio": face_height / cheekbone_width,
        "forehead_to_cheekbone_ratio": forehead_width / cheekbone_width,
        "jaw_to_cheekbone_ratio": jaw_width / cheekbone_width,
        "forehead_to_jaw_ratio": forehead_width / max(jaw_width, 1.0),
        "chin_angle_deg": chin_angle_deg,
        "chin_roundness_index": chin_width / max(jaw_width, 1.0),
        "lower_face_height_ratio": lower_face_height / max(face_height, 1.0),
        "cheekbone_prominence": cheekbone_width / max(0.5 * (forehead_width + jaw_width), 1.0),
    }


def classify_face_shape(landmarks: np.ndarray, sex: Optional[str] = "female") -> Dict[str, Any]:
    """
    Classifies 468/478 Face Mesh landmarks into one of the 6 face shapes.
    Uses log-likelihood under anthropometric Gaussian models.
    Returns gender-separated styling recommendations.
    """
    feats = extract_face_shape_features(landmarks)

    log_probs = {}
    for shape, dist in ANTHRO_DISTRIBUTIONS.items():
        ll = 0.0
        for fname, (mean, std) in dist.items():
            x = feats.get(fname, mean)
            z = (x - mean) / max(std, 1e-4)
            ll += -0.5 * (z ** 2) - math.log(max(std, 1e-4))
        log_probs[shape] = ll

    # Softmax for calibrated probabilities
    max_ll = max(log_probs.values())
    exp_probs = {k: math.exp(v - max_ll) for k, v in log_probs.items()}
    total = sum(exp_probs.values())
    probs = {k: round(v / total, 3) for k, v in exp_probs.items()}

    best_shape = max(probs, key=probs.get)
    advice_f = STYLING_ADVICE_FEMALE.get(best_shape, STYLING_ADVICE_FEMALE["Oval"])
    advice_m = STYLING_ADVICE_MALE.get(best_shape, STYLING_ADVICE_MALE["Oval"])

    # Selected advice by requested sex
    target_advice = advice_m if sex == "male" else advice_f

    return {
        "shape": best_shape,
        "name_th": FACE_SHAPES_TH.get(best_shape, best_shape),
        "confidence": probs[best_shape],
        "probabilities": probs,
        "description": FACE_SHAPE_DESCRIPTIONS.get(best_shape, ""),
        "hairstyles": target_advice["hairstyles"],
        "glasses": target_advice["glasses"],
        "aesthetic_focus": target_advice["aesthetic_focus"],
        "styling": {
            "female": advice_f,
            "male": advice_m,
        },
        "metrics": {k: round(v, 3) for k, v in feats.items()},
    }
