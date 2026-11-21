/**
 * Clinical Medical Line Art Diagrams for Aesthetic Procedures.
 * Pure SVG vector components with theme token compliance, responsive scaling,
 * Before vs After anatomical contours, and directional correction vectors.
 */
import * as Dialog from "@radix-ui/react-dialog";
import {
  CheckCircle2,
  Info,
  Layers,
  Maximize2,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import type { ProcedureRecommendation } from "../../api/schemas";
import { Button } from "../ui/Button";

export type DiagramMode = "thumbnail" | "expanded" | "before" | "after" | "vectors" | "compare";

export interface ProcedureAsset {
  compare: string;
  before: string;
  after: string;
  alt: string;
}

export const PROCEDURE_ASSETS: Record<string, ProcedureAsset> = {
  chin_augmentation: {
    compare: "/procedures/chin_augmentation_compare.webp",
    before: "/procedures/chin_augmentation_before.webp",
    after: "/procedures/chin_augmentation_after.webp",
    alt: "ภาพตัวอย่างหัตถการเสริมคาง",
  },
  rhinoplasty: {
    compare: "/procedures/rhinoplasty_compare.webp",
    before: "/procedures/rhinoplasty_before.webp",
    after: "/procedures/rhinoplasty_after.webp",
    alt: "ภาพตัวอย่างหัตถการปรับแต่งทรงจมูก",
  },
  botulinum_toxin_masseter: {
    compare: "/procedures/botulinum_toxin_masseter_compare.webp",
    before: "/procedures/botulinum_toxin_masseter_before.webp",
    after: "/procedures/botulinum_toxin_masseter_after.webp",
    alt: "ภาพตัวอย่างหัตถการโบท็อกซ์ลดกราม",
  },
  lip_augmentation: {
    compare: "/procedures/lip_augmentation_compare.webp",
    before: "/procedures/lip_augmentation_before.webp",
    after: "/procedures/lip_augmentation_after.webp",
    alt: "ภาพตัวอย่างหัตถการฟิลเลอร์ริมฝีปาก",
  },
  hyaluronic_acid_filler_nasolabial: {
    compare: "/procedures/hyaluronic_acid_filler_nasolabial_compare.webp",
    before: "/procedures/hyaluronic_acid_filler_nasolabial_before.webp",
    after: "/procedures/hyaluronic_acid_filler_nasolabial_after.webp",
    alt: "ภาพตัวอย่างหัตถการฟิลเลอร์ร่องแก้ม",
  },
  skin_tightening: {
    compare: "/procedures/skin_tightening_compare.webp",
    before: "/procedures/skin_tightening_before.webp",
    after: "/procedures/skin_tightening_after.webp",
    alt: "ภาพตัวอย่างหัตถการยกกระชับผิวด้วยพลังงาน",
  },
  thread_lift: {
    compare: "/procedures/thread_lift_compare.webp",
    before: "/procedures/thread_lift_before.webp",
    after: "/procedures/thread_lift_after.webp",
    alt: "ภาพตัวอย่างหัตถการร้อยไหมพยุงกรอบหน้า",
  },
  botulinum_toxin_wrinkles: {
    compare: "/procedures/botulinum_toxin_wrinkles_compare.webp",
    before: "/procedures/botulinum_toxin_wrinkles_before.webp",
    after: "/procedures/botulinum_toxin_wrinkles_after.webp",
    alt: "ภาพตัวอย่างหัตถการโบท็อกซ์ริ้วรอยส่วนบน",
  },
};

export interface ProcedureDiagramMetadata {
  titleTh: string;
  titleEn: string;
  anatomicalAreaTh: string;
  targetLandmarks: string[];
  correctionVectorsTh: string[];
  clinicalSignificanceTh: string;
}

export const PROCEDURE_DIAGRAM_METADATA: Record<string, ProcedureDiagramMetadata> = {
  rhinoplasty: {
    titleTh: "ปรับแต่งทรงจมูก",
    titleEn: "Structural Rhinoplasty & Nasal Vector Optimization",
    anatomicalAreaTh: "จมูก",
    targetLandmarks: [
      "Pronasale (Nasal Tip)",
      "Nasion / Nasofrontal Angle (P1)",
      "Alar Base (F6)",
      "Nasolabial Angle (P2)",
    ],
    correctionVectorsTh: [
      "เวกเตอร์หมุนยกปลายจมูก: ปรับมุมจมูก-ริมฝีปาก (P2) สู่ 95°-105°",
      "เวกเตอร์ความพุ่งของปลายจมูก: ปรับอัตราส่วน Goode สู่ 0.55-0.60",
      "เวกเตอร์รวบความกว้างปีกจมูก: บีบกระชับความกว้างปีกจมูก (F6) ให้สมดุลกับระยะหัวตา (ICD)",
    ],
    clinicalSignificanceTh:
      "การปรับแต่งโครงสร้างจมูกมุ่งเน้นการยกปลายจมูกที่งุ้มลงให้เชิดขึ้นในมุมที่รับกับริมฝีปากบน พร้อมจัดระเบียบความกว้างของปีกจมูกเพื่อสร้างสัดส่วนใบหน้าส่วนกลางที่ได้ดุลยภาพ",
  },
  chin_augmentation: {
    titleTh: "ปรับมิติปลายคาง",
    titleEn: "Chin Projection & Vertical Proportion Harmonization",
    anatomicalAreaTh: "คางและแนวกรามล่าง",
    targetLandmarks: [
      "Pogonion (Pog)",
      "Gnathion (Gn) / Menton (Me)",
      "Ricketts' Aesthetic E-Line (P4)",
      "Labiomental Groove",
    ],
    correctionVectorsTh: [
      "เวกเตอร์เสริมยื่นด้านหน้า: ดันจุด Pogonion ไปด้านหน้ารับกับเส้นระนาบ E-line (0 ถึง -2 มม.)",
      "เวกเตอร์เพิ่มความยาวแนวดิ่ง: ปรับสัดส่วนใบหน้าส่วนล่าง (F1/F2) ให้ได้สัดส่วน 1 ใน 3 มาตรฐาน",
      "เวกเตอร์กำหนดแนวร่องคาง: ปรับมุมรอยต่อริมฝีปากล่างและคางให้ได้มุมกายวิภาคมาตรฐาน",
    ],
    clinicalSignificanceTh:
      "แก้ไขภาวะคางถอยร่น โดยปรับตำแหน่งปลายคางให้สอดคล้องกับแนวริมฝีปากและจมูกตามเกณฑ์ Ricketts' E-line เพื่อให้กรอบหน้าส่วนล่างได้สัดส่วน",
  },
  botulinum_toxin_masseter: {
    titleTh: "โบท็อกซ์ลดกราม ปรับรูปหน้าเรียว",
    titleEn: "Masseter Muscle Chemodenervation & Lower Face Tapering",
    anatomicalAreaTh: "มุมกรามและกล้ามเนื้อบดเคี้ยว",
    targetLandmarks: [
      "Superficial Masseter Muscle Belly",
      "Gonion (Mandibular Angle)",
      "Bigonial Width Line",
      "Marginal Mandibular Nerve Safety Zone",
    ],
    correctionVectorsTh: [
      "เวกเตอร์ยุบตัวเข้าด้านใน: ลดความหนาของมวลกล้ามเนื้อกรามซ้าย-ขวา 2-4 มม. ต่อข้าง",
      "เวกเตอร์ปรับแนวโค้งกรอบหน้า: เปลี่ยนโครงสร้างกรอบหน้าล่างจากทรงสี่เหลี่ยมเป็นทรงรูปไข่เรียว",
    ],
    clinicalSignificanceTh:
      "การคลายตัวของกล้ามเนื้อ Masseter ช่วยลดแรงตึงตัวและลดขนาดมวลกล้ามเนื้อที่หนาตัว ส่งผลให้ความกว้างของใบหน้าส่วนล่างเรียวเล็กลงอย่างสมส่วน",
  },
  lip_augmentation: {
    titleTh: "ปรับมิติมุมปากและริมฝีปาก",
    titleEn: "Vermilion Fullness & Cupid's Bow Volumetric Definition",
    anatomicalAreaTh: "ริมฝีปาก",
    targetLandmarks: [
      "Philtral Columns & Cupid's Bow",
      "Vermilion Border (White Roll)",
      "Upper-to-Lower Lip Ratio (F8 Golden Ratio 1:1.6)",
      "Oral Commissures (Mouth Corners)",
    ],
    correctionVectorsTh: [
      "เวกเตอร์ยกมุมปาก: ปรับมุมปากให้อยู่ในแนวระนาบปกติ",
      "เวกเตอร์ความหนาริมฝีปากล่าง: ปรับสัดส่วนริมฝีปากบนต่อล่างตามเกณฑ์ 1:1.6",
      "เวกเตอร์เน้นขอบกระจับ: เสริมความชัดเจนของขอบริมฝีปากบน",
    ],
    clinicalSignificanceTh:
      "ปรับสัดส่วนความหนาและขอบริมฝีปากด้วยไฮยาลูโรนิกให้สอดคล้องกับเกณฑ์สัดส่วนริมฝีปากบนต่อล่าง (F8 Ratio)",
  },
  skin_tightening: {
    titleTh: "ยกกระชับด้วยคลื่นพลังงาน",
    titleEn: "Non-Surgical Energy-Based SMAS Tightening & Neocollagenesis",
    anatomicalAreaTh: "ชั้นพังผืด SMAS และผิวหนังชั้นหนังแท้",
    targetLandmarks: [
      "SMAS Fascial Plane (4.5mm depth)",
      "Deep Dermal Matrix (3.0mm & 1.5mm)",
      "Mandibular Border & Jowl Descent Zone",
      "Zygomaticus Ligamentous Anchor",
    ],
    correctionVectorsTh: [
      "เวกเตอร์หดกระชับชั้น SMAS: ส่งผ่านพลังงานความร้อนกระตุ้นการหดตัวในแนวเฉียงขึ้นสู่ขมับ",
      "เวกเตอร์ยกกระพุ้งแก้ม: ดึงรั้งก้อนเนื้อเยื่อกระพุ้งแก้มที่คล้อยให้กลับขึ้นมาเหนือขอบกระดูกกราม",
      "เวกเตอร์กระตุ้นคอลลาเจน: ฟื้นฟูความยืดหยุ่นของโครงสร้างตาข่ายเส้นใยผิว",
    ],
    clinicalSignificanceTh:
      "การส่งพลังงานคลื่นเสียงโฟกัสหรือคลื่นวิทยุลงสู่ชั้นพังผืด SMAS ก่อให้เกิดจุดความร้อนเพื่อกระตุ้นการหดกระชับของเนื้อเยื่อชั้นลึกโดยไม่ต้องผ่าตัด ชะลอการหย่อนคล้อยในระยะยาว",
  },
  thread_lift: {
    titleTh: "ร้อยไหมพยุงกรอบหน้า",
    titleEn: "Mechanical Tissue Suspension & Vector Repositioning",
    anatomicalAreaTh: "แนวกรามและร่องแก้มส่วนล่าง",
    targetLandmarks: [
      "Temporal Fascia Entry Anchor",
      "Malar Fat Pad Descent Axis",
      "Pre-jowl Sulcus & Marionette Line",
      "Subcutaneous Tissue Plane",
    ],
    correctionVectorsTh: [
      "เวกเตอร์ดึงพยุงกลไกเงี่ยงไหม: ดึงเนื้อเยื่อแนวกรามและกระพุ้งแก้มขึ้นในทิศ 45° สู่โหนกแก้ม",
      "เวกเตอร์ลดร่องมุมปาก: พยุงรอยต่อมุมปากและร่องน้ำหมากให้ตื้นขึ้นทันทีหลังทำ",
      "เวกเตอร์กระตุ้นพังผืดคอลลาเจน: สร้างแนวพังผืดใหม่ตามแนวไหมเพื่อความคงทนของโครงสร้าง",
    ],
    clinicalSignificanceTh:
      "ใช้ไหมละลายชนิดมีเงี่ยงเกี่ยวเนื้อเยื่อใต้ผิวหนังเพื่อยกพยุงก้อนไขมันและผิวหนังที่หย่อนคล้อยขึ้นสู่ตำแหน่งทางกายวิภาคเดิม ให้ผลลัพธ์การยกกระชับที่เห็นได้ทันที",
  },
  botulinum_toxin_wrinkles: {
    titleTh: "โบท็อกซ์ริ้วรอยส่วนบน",
    titleEn: "Upper-Face Dynamic Rhytid Neuromodulation",
    anatomicalAreaTh: "หน้าผากและหว่างคิ้ว",
    targetLandmarks: [
      "Frontalis Muscle Fibers",
      "Corrugator Supercilii & Procerus",
      "Orbicularis Oculi Lateral Bands",
      "Brow Apex Balance Points",
    ],
    correctionVectorsTh: [
      "เวกเตอร์คลายแรงเกร็งแนวขวาง: ผ่อนคลายกล้ามเนื้อหน้าผากเพื่อลบริ้วรอยแนวนอน",
      "เวกเตอร์คลายรอยขมวดคิ้ว: สลายแรงดึงเข้าหากึ่งกลางของรอยย่นเลข 11",
      "เวกเตอร์ปรับสมดุลแนวคิ้ว: ควบคุมระดับความสูงยอดคิ้วสองข้างให้สมมาตร",
    ],
    clinicalSignificanceTh:
      "ยับยั้งการหลั่งสารสื่อประสาทในกล้ามเนื้อที่แสดงอารมณ์ส่วนบน ลดการพับตัวของผิวหนังขณะเลิกคิ้วหรือขมวดคิ้ว ป้องกันการเกิดริ้วรอยถาวรบนหน้าผาก",
  },
  hyaluronic_acid_filler_nasolabial: {
    titleTh: "ฟิลเลอร์เติมเต็มร่องแก้ม",
    titleEn: "Pyriform Aperture Structural Support & Fold Softening",
    anatomicalAreaTh: "ร่องแก้มและข้างปีกจมูก",
    targetLandmarks: [
      "Pyriform Aperture Bony Margin",
      "Facial Artery Safety Course",
      "Deep Nasolabial Fat Compartment",
      "Sub-alar Fossa",
    ],
    correctionVectorsTh: [
      "เวกเตอร์หนุนกระดูกชั้นลึก: หนุนฐานกระดูกข้างปีกจมูกที่ยุบตัวให้ดันตัวออกมาด้านหน้า",
      "เวกเตอร์เกลี่ยรอยพับผิว: เติมเต็มร่องรอยต่อระหว่างแก้มและริมฝีปากบนให้เรียบเนียน",
    ],
    clinicalSignificanceTh:
      "แก้ไขการยุบตัวของกระดูกฐานจมูกและการคล้อยตัวของแก้มส่วนกลาง โดยเสริมฐานกระดูกชั้นลึกเพื่อพยุงร่องแก้มให้ตื้นขึ้น",
  },
  hyaluronic_acid_filler_temple: {
    titleTh: "ฟิลเลอร์เติมเต็มขมับตอบ",
    titleEn: "Temporal Fossa Volumization & Lateral Contour Smoothing",
    anatomicalAreaTh: "ขมับและกรอบหน้าส่วนบน",
    targetLandmarks: [
      "Superior Temporal Line",
      "Deep Temporal Fascia & Muscle",
      "Zygomatic Arch Superior Border",
      "Superficial Temporal Artery Safe Zone",
    ],
    correctionVectorsTh: [
      "เวกเตอร์ขยายมิติขมับสู่ด้านข้าง: เติมเต็มรอยบุ๋มขมับที่ตอบให้โค้งมนรับกับโหนกแก้ม",
      "เวกเตอร์เชื่อมต่อแนวกะโหลกศีรษะ: ปรับเส้นรอบรูปหน้าไม่ให้เว้าแหว่งเป็นทรงผลถั่วลิสง",
    ],
    clinicalSignificanceTh:
      "ฟื้นฟูการฝ่อตัวของไขมันและกล้ามเนื้อบริเวณขมับ เชื่อมต่อสัดส่วนระหว่างหน้าผากและโหนกแก้มให้เป็นเส้นโค้งที่นุ่มนวลสมดุล",
  },
  mandibular_contouring: {
    titleTh: "ศัลยกรรมตัดแต่งมุมกราม",
    titleEn: "Bony Mandibular Angle Reduction & Curved Ostectomy",
    anatomicalAreaTh: "กระดูกขากรรไกรล่าง",
    targetLandmarks: [
      "Gonial Bony Flare",
      "Inferior Alveolar Nerve Canal",
      "Mandibular Basal Border",
      "Ramus Posterior Border",
    ],
    correctionVectorsTh: [
      "เวกเตอร์ตัดแต่งกระดูกส่วนเกิน: ตัดมุมกระดูกกรามที่ผายกว้างออกตามแนวโค้งธรรมชาติ",
      "เวกเตอร์ปรับองศามุมกราม: ขยายมุมกรามจากต่ำกว่า 115° ขึ้นสู่ 120°-125° ตามแนวระนาบกระดูก",
    ],
    clinicalSignificanceTh:
      "ผ่าตัดปรับมุมกระดูกขากรรไกรล่างเพื่อลดความกว้างของใบหน้าส่วนล่างจากโครงสร้างกระดูก โดยรักษาแนวขอบกระดูกขากรรไกรและตำแหน่งของเส้นประสาท",
  },
  orthognathic_surgery: {
    titleTh: "ศัลยกรรมเลื่อนขากรรไกร",
    titleEn: "Bimaxillary / Mandibular Skeletal Repositioning",
    anatomicalAreaTh: "โครงกระดูกขากรรไกรบนและล่าง",
    targetLandmarks: [
      "Maxillary Le Fort I Plane",
      "Mandibular BSSO Osteotomy Split",
      "Dental Occlusal Plane",
      "A-Point & B-Point Skeletal Relation",
    ],
    correctionVectorsTh: [
      "เวกเตอร์เลื่อนตำแหน่งกระดูกขากรรไกร: เลื่อนขากรรไกรล่างไปด้านหน้าหรือด้านหลังสู่ความสัมพันธ์ Class I",
      "เวกเตอร์ปรับระนาบการสบฟัน: ปรับระนาบการเคี้ยวและการสบฟันให้เข้าที่",
    ],
    clinicalSignificanceTh:
      "ผ่าตัดปรับตำแหน่งกระดูกขากรรไกรและการสบฟันเพื่อแก้ปัญหาการทำงาน การเคี้ยว การหายใจ และโครงสร้างใบหน้า",
  },
  surgical_facelift: {
    titleTh: "ศัลยกรรมยกกระชับดึงหน้า",
    titleEn: "Deep-Plane / High-SMAS Facial & Neck Rhytidectomy",
    anatomicalAreaTh: "โครงสร้างใบหน้าและลำคอชั้นลึก",
    targetLandmarks: [
      "High-SMAS Flap Axis",
      "Platysma Muscle Bands",
      "Cervicomental Angle",
      "Periauricular Incision Line",
    ],
    correctionVectorsTh: [
      "เวกเตอร์ดึงชั้น SMAS ใบหน้าส่วนกลาง: ดึงพยุงเนื้อเยื่อแก้มขึ้นเฉียงไปด้านหลังบนสู่ขมับ",
      "เวกเตอร์เย็บกระชับลำคอ: ดึงกระชับกล้ามเนื้อคอเพื่อสร้างมุมใต้คาง (<105°)",
    ],
    clinicalSignificanceTh:
      "ผ่าตัดจัดตำแหน่งชั้น SMAS และกล้ามเนื้อคอ พร้อมตัดผิวหนังส่วนเกิน เพื่อลดความหย่อนคล้อยของเนื้อเยื่อใบหน้าส่วนล่างและลำคอ",
  },
};

/** Shared SVG Vector Arrowheads & Defs */
function SvgDefs() {
  return (
    <defs>
      {/* Accent Correction Vector Marker */}
      <marker
        id="vector-arrow-accent"
        viewBox="0 0 10 10"
        refX="6"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--accent)" />
      </marker>

      {/* Emerald Target Arrowhead Marker */}
      <marker
        id="vector-arrow-emerald"
        viewBox="0 0 10 10"
        refX="6"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#059669" />
      </marker>

      {/* Neutral Guide Line Marker */}
      <marker
        id="vector-arrow-neutral"
        viewBox="0 0 10 10"
        refX="6"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="currentColor" opacity="0.6" />
      </marker>
    </defs>
  );
}

// -----------------------------------------------------------------------------
// Individual Medical Vector SVG Diagrams
// -----------------------------------------------------------------------------

function RhinoplastySvg({ mode = "vectors" }: { mode?: DiagramMode }) {
  const showBefore = mode === "before" || mode === "vectors" || mode === "thumbnail" || mode === "expanded" || mode === "compare";
  const showAfter = mode === "after" || mode === "vectors" || mode === "thumbnail" || mode === "expanded" || mode === "compare";
  const showVectors = mode === "vectors" || mode === "thumbnail" || mode === "expanded" || mode === "compare";

  return (
    <svg
      role="img"
      aria-label="Rhinoplasty Transformation Vector Diagram"
      viewBox="0 0 360 220"
      className="w-full h-auto text-ink select-none"
    >
      <SvgDefs />

      {/* Background grid guide */}
      <line x1="40" y1="180" x2="320" y2="180" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="2 4" />
      <line x1="160" y1="20" x2="160" y2="200" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="2 4" />

      {/* Stable Cranial & Forehead Base (Anatomical Anchor) */}
      <path
        d="M 60 25 Q 90 25 110 40 Q 120 52 125 70"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />

      {/* Subnasale, Philtrum, and Upper Lip Base */}
      <path
        d="M 142 165 Q 146 180 155 195 L 160 205"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />

      {/* BEFORE CONTOUR (Dashed, drooping tip, prominent dorsal hump) */}
      {showBefore && (
        <g strokeDasharray="4 3" opacity={mode === "before" ? 1 : 0.45}>
          {/* Dorsum with slight hump down to drooping tip */}
          <path
            d="M 125 70 Q 145 105 158 128 Q 162 145 152 158 Q 142 162 142 165"
            fill="none"
            stroke="currentColor"
            strokeWidth={mode === "before" ? "2.5" : "1.75"}
            strokeLinecap="round"
          />
          {/* Alar base before (flared) */}
          <path
            d="M 130 148 Q 120 152 124 165"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
      )}

      {/* AFTER CONTOUR (Solid, supratip break, elevated & projected tip) */}
      {showAfter && (
        <g>
          {/* Refined smooth dorsum with supratip break and elevated projected tip */}
          <path
            d="M 125 70 L 152 118 Q 170 132 168 145 Q 158 156 142 165"
            fill="none"
            stroke={mode === "after" ? "var(--accent)" : "currentColor"}
            strokeWidth={mode === "after" ? "2.5" : "2"}
            strokeLinecap="round"
          />
          {/* Alar base after (refined and narrowed) */}
          <path
            d="M 134 148 Q 128 153 132 165"
            fill="none"
            stroke={mode === "after" ? "var(--accent)" : "currentColor"}
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </g>
      )}

      {/* TRANSFORMATION VECTORS & CLINICAL CALLOUTS */}
      {showVectors && (
        <g>
          {/* 1. Tip Projection Vector (Forward) */}
          <line
            x1="152"
            y1="145"
            x2="175"
            y2="137"
            stroke="var(--accent)"
            strokeWidth="2.25"
            markerEnd="url(#vector-arrow-accent)"
          />
          <circle cx="152" cy="145" r="3" fill="var(--accent)" />

          {/* 2. Tip Cephalic Rotation Vector (Curved Upward) */}
          <path
            d="M 154 160 Q 166 160 172 147"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            markerEnd="url(#vector-arrow-accent)"
          />

          {/* 3. Dorsal Reduction / Refinement Vector (Inward) */}
          <line
            x1="156"
            y1="110"
            x2="148"
            y2="114"
            stroke="var(--accent)"
            strokeWidth="1.75"
            markerEnd="url(#vector-arrow-accent)"
          />

          {/* Nasolabial Angle Guide Line (P2) */}
          <line x1="142" y1="165" x2="185" y2="155" stroke="currentColor" strokeOpacity="0.35" strokeDasharray="2 2" />
          <line x1="142" y1="165" x2="148" y2="195" stroke="currentColor" strokeOpacity="0.35" strokeDasharray="2 2" />

          {/* Text Labels */}
          <text x="180" y="132" fill="var(--accent)" fontSize="10" fontWeight="600">
            Tip Rotation 95°-105°
          </text>
          <text x="180" y="146" fill="currentColor" opacity="0.75" fontSize="9">
            Projection (Goode 0.58)
          </text>
          <text x="160" y="98" fill="currentColor" opacity="0.6" fontSize="9">
            Dorsum Alignment
          </text>
        </g>
      )}

      {/* Inset Label / Header badge inside SVG */}
      <rect x="15" y="15" width="105" height="22" rx="4" fill="var(--surface)" stroke="currentColor" strokeOpacity="0.2" />
      <text x="24" y="30" fill="currentColor" fontSize="10" fontWeight="600">
        Lateral Rhinoplasty
      </text>
    </svg>
  );
}

function ChinAugmentationSvg({ mode = "vectors" }: { mode?: DiagramMode }) {
  const showBefore = mode === "before" || mode === "vectors" || mode === "thumbnail" || mode === "expanded" || mode === "compare";
  const showAfter = mode === "after" || mode === "vectors" || mode === "thumbnail" || mode === "expanded" || mode === "compare";
  const showVectors = mode === "vectors" || mode === "thumbnail" || mode === "expanded" || mode === "compare";

  return (
    <svg
      role="img"
      aria-label="Chin Augmentation & E-Line Projection Diagram"
      viewBox="0 0 360 220"
      className="w-full h-auto text-ink select-none"
    >
      <SvgDefs />

      {/* Ricketts' Aesthetic E-Line (Reference plane from nasal tip to pogonion) */}
      <line
        x1="182"
        y1="25"
        x2="162"
        y2="205"
        stroke="var(--accent)"
        strokeOpacity="0.45"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      <text x="186" y="35" fill="var(--accent)" fontSize="9" fontWeight="600">
        Ricketts' E-Line
      </text>

      {/* Nose Base & Upper Lip Outline */}
      <path
        d="M 172 30 Q 165 55 150 75 Q 155 85 160 95 Q 152 105 146 115"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />

      {/* Lower Lip (Labrale inferius) & Labiomental Fold */}
      <path
        d="M 146 115 Q 158 122 154 135 Q 146 145 145 152"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />

      {/* Submental Neck Line */}
      <path
        d="M 115 195 Q 105 200 95 210"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />

      {/* BEFORE RETRUDED CHIN CONTOUR (Dashed, chin falls 6mm behind E-line) */}
      {showBefore && (
        <g strokeDasharray="4 3" opacity={mode === "before" ? 1 : 0.45}>
          <path
            d="M 145 152 Q 142 168 136 182 Q 128 194 115 195"
            fill="none"
            stroke="currentColor"
            strokeWidth={mode === "before" ? "2.5" : "1.75"}
            strokeLinecap="round"
          />
        </g>
      )}

      {/* AFTER AUGMENTED CHIN CONTOUR (Solid, projected forward to touch E-line) */}
      {showAfter && (
        <g>
          <path
            d="M 145 152 Q 162 165 160 182 Q 148 198 115 195"
            fill="none"
            stroke={mode === "after" ? "var(--accent)" : "currentColor"}
            strokeWidth={mode === "after" ? "2.5" : "2"}
            strokeLinecap="round"
          />
        </g>
      )}

      {/* CORRECTION VECTORS & LANDMARKS */}
      {showVectors && (
        <g>
          {/* Horizontal Anterior Advancement Vector */}
          <line
            x1="136"
            y1="172"
            x2="162"
            y2="172"
            stroke="var(--accent)"
            strokeWidth="2.5"
            markerEnd="url(#vector-arrow-accent)"
          />
          <circle cx="136" cy="172" r="3" fill="var(--accent)" />

          {/* Vertical Elongation Vector */}
          <line
            x1="150"
            y1="180"
            x2="150"
            y2="196"
            stroke="var(--accent)"
            strokeWidth="2"
            markerEnd="url(#vector-arrow-accent)"
          />

          {/* Landmark Dots */}
          <circle cx="160" cy="182" r="3" fill="var(--accent)" />
          <text x="170" y="174" fill="var(--accent)" fontSize="10" fontWeight="600">
            Pogonion (Pog)
          </text>
          <text x="170" y="186" fill="currentColor" opacity="0.75" fontSize="9">
            +4 to 6mm Forward
          </text>
          <text x="156" y="208" fill="currentColor" opacity="0.6" fontSize="9">
            Vertical Ratio (1:2)
          </text>

          {/* Labiomental angle callout */}
          <path d="M 148 138 Q 142 146 146 154" fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" />
          <text x="80" y="148" fill="currentColor" opacity="0.7" fontSize="9">
            Labiomental Groove
          </text>
        </g>
      )}

      {/* Label Badge */}
      <rect x="15" y="15" width="130" height="22" rx="4" fill="var(--surface)" stroke="currentColor" strokeOpacity="0.2" />
      <text x="24" y="30" fill="currentColor" fontSize="10" fontWeight="600">
        Chin Projection & E-Line
      </text>
    </svg>
  );
}

function MasseterBotoxSvg({ mode = "vectors" }: { mode?: DiagramMode }) {
  const showBefore = mode === "before" || mode === "vectors" || mode === "thumbnail" || mode === "expanded" || mode === "compare";
  const showAfter = mode === "after" || mode === "vectors" || mode === "thumbnail" || mode === "expanded" || mode === "compare";
  const showVectors = mode === "vectors" || mode === "thumbnail" || mode === "expanded" || mode === "compare";

  return (
    <svg
      role="img"
      aria-label="Masseter Botulinum Toxin Reduction Diagram"
      viewBox="0 0 360 220"
      className="w-full h-auto text-ink select-none"
    >
      <SvgDefs />

      {/* Symmetry Midline Guide */}
      <line x1="180" y1="20" x2="180" y2="200" stroke="currentColor" strokeOpacity="0.12" strokeDasharray="3 3" />

      {/* Upper Face & Lips Contour (Constant baseline) */}
      <path
        d="M 125 40 Q 180 50 235 40 M 150 70 Q 180 75 210 70 M 160 90 Q 180 96 200 90"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.4"
      />

      {/* Chin Apex (Constant anchor) */}
      <path
        d="M 165 190 Q 180 196 195 190"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* BEFORE CONTOUR (Square lower face, bulging masseter muscles laterally) */}
      {showBefore && (
        <g strokeDasharray="4 3" opacity={mode === "before" ? 1 : 0.45}>
          {/* Left Flared Masseter */}
          <path
            d="M 125 40 Q 100 80 92 120 Q 86 155 125 178 L 165 190"
            fill="none"
            stroke="currentColor"
            strokeWidth={mode === "before" ? "2.5" : "1.75"}
            strokeLinecap="round"
          />
          {/* Right Flared Masseter */}
          <path
            d="M 235 40 Q 260 80 268 120 Q 274 155 235 178 L 195 190"
            fill="none"
            stroke="currentColor"
            strokeWidth={mode === "before" ? "2.5" : "1.75"}
            strokeLinecap="round"
          />

          {/* Bigonial Width Indicator Before */}
          <line x1="88" y1="140" x2="272" y2="140" stroke="currentColor" strokeOpacity="0.3" strokeDasharray="2 3" />
        </g>
      )}

      {/* AFTER CONTOUR (Tapered, slim V-contour, reduced transverse lower face) */}
      {showAfter && (
        <g>
          {/* Left Tapered Mandibular Border */}
          <path
            d="M 125 40 Q 112 85 110 120 Q 110 152 138 175 L 165 190"
            fill="none"
            stroke={mode === "after" ? "var(--accent)" : "currentColor"}
            strokeWidth={mode === "after" ? "2.5" : "2"}
            strokeLinecap="round"
          />
          {/* Right Tapered Mandibular Border */}
          <path
            d="M 235 40 Q 248 85 250 120 Q 250 152 222 175 L 195 190"
            fill="none"
            stroke={mode === "after" ? "var(--accent)" : "currentColor"}
            strokeWidth={mode === "after" ? "2.5" : "2"}
            strokeLinecap="round"
          />
        </g>
      )}

      {/* CORRECTION VECTORS & INJECTION GRIDS */}
      {showVectors && (
        <g>
          {/* Left Masseter Inward Reduction Vector */}
          <line
            x1="86"
            y1="140"
            x2="114"
            y2="140"
            stroke="var(--accent)"
            strokeWidth="2.5"
            markerEnd="url(#vector-arrow-accent)"
          />
          <circle cx="86" cy="140" r="3" fill="var(--accent)" />

          {/* Right Masseter Inward Reduction Vector */}
          <line
            x1="274"
            y1="140"
            x2="246"
            y2="140"
            stroke="var(--accent)"
            strokeWidth="2.5"
            markerEnd="url(#vector-arrow-accent)"
          />
          <circle cx="274" cy="140" r="3" fill="var(--accent)" />

          {/* Safe-zone Clinical Injection Points (Left) */}
          <circle cx="118" cy="132" r="3.5" fill="#059669" />
          <circle cx="128" cy="145" r="3.5" fill="#059669" />
          <circle cx="122" cy="158" r="3.5" fill="#059669" />

          {/* Safe-zone Clinical Injection Points (Right) */}
          <circle cx="242" cy="132" r="3.5" fill="#059669" />
          <circle cx="232" cy="145" r="3.5" fill="#059669" />
          <circle cx="238" cy="158" r="3.5" fill="#059669" />

          {/* Callouts */}
          <text x="35" y="132" fill="var(--accent)" fontSize="9" fontWeight="600">
            -3mm Inward
          </text>
          <text x="282" y="132" fill="var(--accent)" fontSize="9" fontWeight="600">
            -3mm Inward
          </text>
          <text x="180" y="112" textAnchor="middle" fill="#059669" fontSize="9" fontWeight="600">
            Safe Injection Zone
          </text>
          <text x="180" y="212" textAnchor="middle" fill="currentColor" opacity="0.75" fontSize="10">
            Tapered V-Contour (Gonial Angle &gt; 120°)
          </text>
        </g>
      )}

      {/* Label Badge */}
      <rect x="15" y="15" width="135" height="22" rx="4" fill="var(--surface)" stroke="currentColor" strokeOpacity="0.2" />
      <text x="24" y="30" fill="currentColor" fontSize="10" fontWeight="600">
        Masseter Muscle Reduction
      </text>
    </svg>
  );
}

function LipAugmentationSvg({ mode = "vectors" }: { mode?: DiagramMode }) {
  const showBefore = mode === "before" || mode === "vectors" || mode === "thumbnail" || mode === "expanded" || mode === "compare";
  const showAfter = mode === "after" || mode === "vectors" || mode === "thumbnail" || mode === "expanded" || mode === "compare";
  const showVectors = mode === "vectors" || mode === "thumbnail" || mode === "expanded" || mode === "compare";

  return (
    <svg
      role="img"
      aria-label="Lip Fullness & Cupid's Bow Transformation Diagram"
      viewBox="0 0 360 220"
      className="w-full h-auto text-ink select-none"
    >
      <SvgDefs />

      {/* Philtral Column Guides */}
      <line x1="168" y1="25" x2="171" y2="70" stroke="currentColor" strokeOpacity="0.25" strokeDasharray="2 2" />
      <line x1="192" y1="25" x2="189" y2="70" stroke="currentColor" strokeOpacity="0.25" strokeDasharray="2 2" />

      {/* Oral Stoma / Mouth Opening Line (Reference) */}
      <path
        d="M 90 110 Q 135 116 180 114 Q 225 116 270 110"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.4"
      />

      {/* BEFORE (Thin upper & lower vermilion, flat Cupid's bow, downturned oral commissures) */}
      {showBefore && (
        <g strokeDasharray="4 3" opacity={mode === "before" ? 1 : 0.45}>
          {/* Upper Lip Thin Contour */}
          <path
            d="M 90 110 Q 130 96 168 90 Q 180 96 192 90 Q 230 96 270 110"
            fill="none"
            stroke="currentColor"
            strokeWidth={mode === "before" ? "2.5" : "1.75"}
            strokeLinecap="round"
          />
          {/* Lower Lip Thin Contour */}
          <path
            d="M 90 110 Q 180 134 270 110"
            fill="none"
            stroke="currentColor"
            strokeWidth={mode === "before" ? "2.5" : "1.75"}
            strokeLinecap="round"
          />
        </g>
      )}

      {/* AFTER (Plump vermilion, defined Cupid's bow, Golden 1:1.6 ratio, lifted corners) */}
      {showAfter && (
        <g>
          {/* Upper Lip Everted & Defined Contour */}
          <path
            d="M 90 106 Q 130 84 168 72 Q 180 82 192 72 Q 230 84 270 106"
            fill="none"
            stroke={mode === "after" ? "var(--accent)" : "currentColor"}
            strokeWidth={mode === "after" ? "2.5" : "2"}
            strokeLinecap="round"
          />
          {/* Lower Lip Volumized Contour */}
          <path
            d="M 90 106 Q 180 156 270 106"
            fill="none"
            stroke={mode === "after" ? "var(--accent)" : "currentColor"}
            strokeWidth={mode === "after" ? "2.5" : "2"}
            strokeLinecap="round"
          />
        </g>
      )}

      {/* VECTORS & CALLOUTS */}
      {showVectors && (
        <g>
          {/* Cupid's Bow Peaks Elevation Vectors */}
          <line
            x1="168"
            y1="88"
            x2="168"
            y2="74"
            stroke="var(--accent)"
            strokeWidth="2"
            markerEnd="url(#vector-arrow-accent)"
          />
          <line
            x1="192"
            y1="88"
            x2="192"
            y2="74"
            stroke="var(--accent)"
            strokeWidth="2"
            markerEnd="url(#vector-arrow-accent)"
          />

          {/* Lower Vermilion Tubercle Volumization Vectors */}
          <line
            x1="150"
            y1="126"
            x2="150"
            y2="148"
            stroke="var(--accent)"
            strokeWidth="2"
            markerEnd="url(#vector-arrow-accent)"
          />
          <line
            x1="210"
            y1="126"
            x2="210"
            y2="148"
            stroke="var(--accent)"
            strokeWidth="2"
            markerEnd="url(#vector-arrow-accent)"
          />

          {/* Oral Commissure Lift Vectors */}
          <line
            x1="92"
            y1="112"
            x2="88"
            y2="102"
            stroke="var(--accent)"
            strokeWidth="2"
            markerEnd="url(#vector-arrow-accent)"
          />
          <line
            x1="268"
            y1="112"
            x2="272"
            y2="102"
            stroke="var(--accent)"
            strokeWidth="2"
            markerEnd="url(#vector-arrow-accent)"
          />

          {/* Ratio Callout */}
          <text x="180" y="60" textAnchor="middle" fill="var(--accent)" fontSize="9" fontWeight="600">
            Cupid's Bow Definition
          </text>
          <text x="180" y="174" textAnchor="middle" fill="var(--accent)" fontSize="10" fontWeight="600">
            Golden Ratio 1 : 1.6 Fullness
          </text>
          <text x="45" y="104" fill="currentColor" opacity="0.75" fontSize="8">
            Lift Corner
          </text>
          <text x="282" y="104" fill="currentColor" opacity="0.75" fontSize="8">
            Lift Corner
          </text>
        </g>
      )}

      {/* Label Badge */}
      <rect x="15" y="15" width="130" height="22" rx="4" fill="var(--surface)" stroke="currentColor" strokeOpacity="0.2" />
      <text x="24" y="30" fill="currentColor" fontSize="10" fontWeight="600">
        Lip Volumetric Harmonization
      </text>
    </svg>
  );
}

function SkinTighteningSvg({ mode = "vectors" }: { mode?: DiagramMode }) {
  const showBefore = mode === "before" || mode === "vectors" || mode === "thumbnail" || mode === "expanded" || mode === "compare";
  const showAfter = mode === "after" || mode === "vectors" || mode === "thumbnail" || mode === "expanded" || mode === "compare";
  const showVectors = mode === "vectors" || mode === "thumbnail" || mode === "expanded" || mode === "compare";

  return (
    <svg
      role="img"
      aria-label="SMAS Skin Tightening Energy Device Vector Diagram"
      viewBox="0 0 360 220"
      className="w-full h-auto text-ink select-none"
    >
      <SvgDefs />

      {/* Stable Ear & Cranial Reference */}
      <path
        d="M 225 60 Q 240 85 235 110 Q 225 125 220 120"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.4"
      />

      {/* Cheekbone & Zygoma Baseline */}
      <path
        d="M 120 70 Q 165 75 215 65"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.3"
      />

      {/* BEFORE (Sagging jowl tissue drooping under mandibular line, deep nasolabial crease) */}
      {showBefore && (
        <g strokeDasharray="4 3" opacity={mode === "before" ? 1 : 0.45}>
          {/* Sagging Jowl Bulge */}
          <path
            d="M 110 80 Q 130 110 135 140 Q 138 180 160 190 Q 185 198 220 155 L 225 125"
            fill="none"
            stroke="currentColor"
            strokeWidth={mode === "before" ? "2.5" : "1.75"}
            strokeLinecap="round"
          />
          {/* Deepened Nasolabial Fold */}
          <path d="M 125 85 Q 132 115 142 135" fill="none" stroke="currentColor" strokeWidth="1.75" />
        </g>
      )}

      {/* AFTER (Compact, elevated soft-tissue envelope, lifted jowl, taut mandibular contour) */}
      {showAfter && (
        <g>
          {/* Taut Mandibular Contour */}
          <path
            d="M 110 80 Q 138 105 145 130 Q 152 165 178 175 Q 205 172 225 125"
            fill="none"
            stroke={mode === "after" ? "var(--accent)" : "currentColor"}
            strokeWidth={mode === "after" ? "2.5" : "2"}
            strokeLinecap="round"
          />
        </g>
      )}

      {/* VECTORS & SMAS COAGULATION ZONES */}
      {showVectors && (
        <g>
          {/* SMAS Vector 1: Mandibular Angle to Preauricular Anchor */}
          <line
            x1="165"
            y1="185"
            x2="210"
            y2="135"
            stroke="var(--accent)"
            strokeWidth="2.5"
            markerEnd="url(#vector-arrow-accent)"
          />

          {/* SMAS Vector 2: Mid-Jowl to Zygomatic Anchor */}
          <line
            x1="145"
            y1="150"
            x2="190"
            y2="95"
            stroke="var(--accent)"
            strokeWidth="2.5"
            markerEnd="url(#vector-arrow-accent)"
          />

          {/* SMAS Vector 3: Nasolabial Elevation */}
          <line
            x1="135"
            y1="120"
            x2="175"
            y2="75"
            stroke="var(--accent)"
            strokeWidth="2"
            markerEnd="url(#vector-arrow-accent)"
          />

          {/* Micro-Thermal Coagulation Points (HIFU/Ultherapy depth indicator) */}
          <circle cx="160" cy="120" r="3" fill="#059669" />
          <circle cx="175" cy="110" r="3" fill="#059669" />
          <circle cx="190" cy="100" r="3" fill="#059669" />
          <circle cx="170" cy="140" r="3" fill="#059669" />
          <circle cx="185" cy="130" r="3" fill="#059669" />

          {/* Energy Wave Concentric Arcs */}
          <path d="M 150 160 Q 165 170 180 155" fill="none" stroke="var(--accent)" strokeOpacity="0.4" strokeWidth="1" />
          <path d="M 145 168 Q 165 180 185 162" fill="none" stroke="var(--accent)" strokeOpacity="0.3" strokeWidth="1" />

          {/* Text Callouts */}
          <text x="218" y="105" fill="var(--accent)" fontSize="9" fontWeight="600">
            SMAS 4.5mm Vector
          </text>
          <text x="110" y="202" fill="var(--accent)" fontSize="9" fontWeight="600">
            Jowl Soft-Tissue Lift
          </text>
          <text x="210" y="160" fill="#059669" fontSize="8">
            Thermal Coagulation
          </text>
        </g>
      )}

      {/* Label Badge */}
      <rect x="15" y="15" width="140" height="22" rx="4" fill="var(--surface)" stroke="currentColor" strokeOpacity="0.2" />
      <text x="24" y="30" fill="currentColor" fontSize="10" fontWeight="600">
        SMAS Energy Tightening
      </text>
    </svg>
  );
}

function ThreadLiftSvg({ mode = "vectors" }: { mode?: DiagramMode }) {
  const showBefore = mode === "before" || mode === "vectors" || mode === "thumbnail" || mode === "expanded" || mode === "compare";
  const showAfter = mode === "after" || mode === "vectors" || mode === "thumbnail" || mode === "expanded" || mode === "compare";
  const showVectors = mode === "vectors" || mode === "thumbnail" || mode === "expanded" || mode === "compare";

  return (
    <svg
      role="img"
      aria-label="Barbed Thread Lift Suspension Vector Diagram"
      viewBox="0 0 360 220"
      className="w-full h-auto text-ink select-none"
    >
      <SvgDefs />

      {/* Ear & Hairline Anchor Zone */}
      <path
        d="M 230 45 Q 245 75 240 105 Q 230 115 225 110"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.4"
      />

      {/* Temporal Hairline Entry Point (Primary Anchor) */}
      <circle cx="215" cy="40" r="4" fill="var(--accent)" />
      <text x="180" y="35" textAnchor="end" fill="var(--accent)" fontSize="9" fontWeight="600">
        Temporal Anchor
      </text>

      {/* BEFORE (Sagging malar fat pad, pronounced marionette line) */}
      {showBefore && (
        <g strokeDasharray="4 3" opacity={mode === "before" ? 1 : 0.45}>
          <path
            d="M 105 85 Q 125 125 130 155 Q 135 192 165 196 Q 195 198 230 145"
            fill="none"
            stroke="currentColor"
            strokeWidth={mode === "before" ? "2.5" : "1.75"}
            strokeLinecap="round"
          />
        </g>
      )}

      {/* AFTER (Elevated malar apex, sharp jawline, restored youthful angle) */}
      {showAfter && (
        <g>
          <path
            d="M 105 85 Q 130 110 140 135 Q 150 172 180 178 Q 210 174 230 145"
            fill="none"
            stroke={mode === "after" ? "var(--accent)" : "currentColor"}
            strokeWidth={mode === "after" ? "2.5" : "2"}
            strokeLinecap="round"
          />
        </g>
      )}

      {/* BARBED THREAD TRAJECTORIES & TRACTION VECTORS */}
      {showVectors && (
        <g>
          {/* Thread Trajectory 1: Temporal Entry to Nasolabial Fold */}
          <line x1="215" y1="40" x2="130" y2="120" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 3" />
          {/* Cogs / Barbs along thread 1 */}
          <path d="M 175 75 L 180 82 M 160 90 L 165 97 M 145 105 L 150 112" stroke="currentColor" strokeWidth="1.5" />
          {/* Vector 1 Arrow */}
          <line
            x1="140"
            y1="110"
            x2="195"
            y2="60"
            stroke="var(--accent)"
            strokeWidth="2.5"
            markerEnd="url(#vector-arrow-accent)"
          />

          {/* Thread Trajectory 2: Temporal Entry to Jowl Sulcus */}
          <line x1="215" y1="40" x2="155" y2="180" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 3" />
          {/* Cogs / Barbs along thread 2 */}
          <path d="M 195 85 L 202 90 M 180 120 L 187 125 M 165 155 L 172 160" stroke="currentColor" strokeWidth="1.5" />
          {/* Vector 2 Arrow */}
          <line
            x1="160"
            y1="170"
            x2="200"
            y2="75"
            stroke="var(--accent)"
            strokeWidth="2.5"
            markerEnd="url(#vector-arrow-accent)"
          />

          {/* Callouts */}
          <text x="210" y="85" fill="var(--accent)" fontSize="9" fontWeight="600">
            Mechanical Traction
          </text>
          <text x="100" y="130" fill="currentColor" opacity="0.8" fontSize="8">
            Malar Repositioning
          </text>
          <text x="130" y="205" fill="currentColor" opacity="0.8" fontSize="8">
            Jowl Suspension
          </text>
        </g>
      )}

      {/* Label Badge */}
      <rect x="15" y="15" width="135" height="22" rx="4" fill="var(--surface)" stroke="currentColor" strokeOpacity="0.2" />
      <text x="24" y="30" fill="currentColor" fontSize="10" fontWeight="600">
        Barbed Thread Suspension
      </text>
    </svg>
  );
}

function WrinkleBotoxSvg({ mode = "vectors" }: { mode?: DiagramMode }) {
  const showBefore = mode === "before" || mode === "vectors" || mode === "thumbnail" || mode === "expanded" || mode === "compare";
  const showAfter = mode === "after" || mode === "vectors" || mode === "thumbnail" || mode === "expanded" || mode === "compare";
  const showVectors = mode === "vectors" || mode === "thumbnail" || mode === "expanded" || mode === "compare";

  return (
    <svg
      role="img"
      aria-label="Upper Face Anti-Wrinkle Neuromodulation Diagram"
      viewBox="0 0 360 220"
      className="w-full h-auto text-ink select-none"
    >
      <SvgDefs />

      {/* Eyebrow Contours (Constant landmarks) */}
      <path
        d="M 105 130 Q 135 110 165 125 M 195 125 Q 225 110 255 130"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Glabella / Midline */}
      <line x1="180" y1="30" x2="180" y2="190" stroke="currentColor" strokeOpacity="0.12" strokeDasharray="3 3" />

      {/* BEFORE (Dynamic horizontal furrows and glabellar '11' frown lines) */}
      {showBefore && (
        <g strokeDasharray="4 3" opacity={mode === "before" ? 1 : 0.45}>
          {/* Horizontal Forehead Lines */}
          <path d="M 115 65 Q 180 60 245 65" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M 120 85 Q 180 80 240 85" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M 125 105 Q 180 100 235 105" fill="none" stroke="currentColor" strokeWidth="2" />
          {/* Glabellar '11' Lines */}
          <line x1="174" y1="118" x2="174" y2="142" stroke="currentColor" strokeWidth="2.25" />
          <line x1="186" y1="118" x2="186" y2="142" stroke="currentColor" strokeWidth="2.25" />
        </g>
      )}

      {/* AFTER (Relaxed, smooth canvas) */}
      {showAfter && (
        <g>
          {/* Smooth forehead arcs */}
          <path d="M 115 65 Q 180 60 245 65" fill="none" stroke="var(--accent)" strokeOpacity="0.15" strokeWidth="1" />
          <path d="M 120 85 Q 180 80 240 85" fill="none" stroke="var(--accent)" strokeOpacity="0.15" strokeWidth="1" />
        </g>
      )}

      {/* VECTORS & CLINICAL INJECTION SITES */}
      {showVectors && (
        <g>
          {/* Frontalis Horizontal Relaxation Vectors */}
          <line
            x1="180"
            y1="75"
            x2="225"
            y2="75"
            stroke="var(--accent)"
            strokeWidth="2"
            markerEnd="url(#vector-arrow-accent)"
          />
          <line
            x1="180"
            y1="75"
            x2="135"
            y2="75"
            stroke="var(--accent)"
            strokeWidth="2"
            markerEnd="url(#vector-arrow-accent)"
          />

          {/* Glabellar Decontraction Vectors (Releasing Corrugator) */}
          <line
            x1="174"
            y1="130"
            x2="160"
            y2="130"
            stroke="var(--accent)"
            strokeWidth="2"
            markerEnd="url(#vector-arrow-accent)"
          />
          <line
            x1="186"
            y1="130"
            x2="200"
            y2="130"
            stroke="var(--accent)"
            strokeWidth="2"
            markerEnd="url(#vector-arrow-accent)"
          />

          {/* Standard FDA Injection Sites */}
          <circle cx="180" cy="148" r="3" fill="#059669" />
          <circle cx="168" cy="126" r="3" fill="#059669" />
          <circle cx="192" cy="126" r="3" fill="#059669" />
          <circle cx="145" cy="116" r="3" fill="#059669" />
          <circle cx="215" cy="116" r="3" fill="#059669" />

          {/* Callouts */}
          <text x="180" y="50" textAnchor="middle" fill="var(--accent)" fontSize="9" fontWeight="600">
            Frontalis Muscle Relaxation
          </text>
          <text x="180" y="175" textAnchor="middle" fill="var(--accent)" fontSize="9" fontWeight="600">
            Glabellar Decontraction ('11' Lines)
          </text>
          <text x="180" y="195" textAnchor="middle" fill="#059669" fontSize="8">
            Target Neuromodulation Sites
          </text>
        </g>
      )}

      {/* Label Badge */}
      <rect x="15" y="15" width="145" height="22" rx="4" fill="var(--surface)" stroke="currentColor" strokeOpacity="0.2" />
      <text x="24" y="30" fill="currentColor" fontSize="10" fontWeight="600">
        Anti-Wrinkle Neuromodulation
      </text>
    </svg>
  );
}

function NasolabialFillerSvg({ mode = "vectors" }: { mode?: DiagramMode }) {
  const showBefore = mode === "before" || mode === "vectors" || mode === "thumbnail" || mode === "expanded" || mode === "compare";
  const showAfter = mode === "after" || mode === "vectors" || mode === "thumbnail" || mode === "expanded" || mode === "compare";
  const showVectors = mode === "vectors" || mode === "thumbnail" || mode === "expanded" || mode === "compare";

  return (
    <svg
      role="img"
      aria-label="Nasolabial & Pyriform Structural Filler Diagram"
      viewBox="0 0 360 220"
      className="w-full h-auto text-ink select-none"
    >
      <SvgDefs />

      {/* Nose Base & Alar Aperture Outline */}
      <path
        d="M 120 40 Q 150 45 160 70 Q 165 95 145 110 Q 130 115 120 110"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />

      {/* Lip Corner & Upper Lip */}
      <path
        d="M 145 110 Q 155 130 165 155 Q 155 175 140 185"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.4"
      />

      {/* BEFORE (Sunken pyriform fossa, deep groove line in nasolabial region) */}
      {showBefore && (
        <g strokeDasharray="4 3" opacity={mode === "before" ? 1 : 0.45}>
          {/* Deep fold line */}
          <path
            d="M 142 105 Q 168 140 178 185"
            fill="none"
            stroke="currentColor"
            strokeWidth={mode === "before" ? "2.5" : "2"}
            strokeLinecap="round"
          />
          {/* Pyriform bony recession indentation */}
          <circle cx="148" cy="112" r="8" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
        </g>
      )}

      {/* AFTER (Restored paranasal volume, supported fold, smoothed transition) */}
      {showAfter && (
        <g>
          {/* Softened shallow transition line */}
          <path
            d="M 142 105 Q 156 138 165 185"
            fill="none"
            stroke={mode === "after" ? "var(--accent)" : "currentColor"}
            strokeWidth={mode === "after" ? "2" : "1.5"}
            strokeOpacity="0.5"
            strokeLinecap="round"
          />
        </g>
      )}

      {/* VECTORS & DEEP BOLUS SITES */}
      {showVectors && (
        <g>
          {/* Deep Pyriform Aperture Bolus Vector (Anterior projection) */}
          <circle cx="148" cy="112" r="5" fill="#059669" />
          <line
            x1="148"
            y1="112"
            x2="175"
            y2="108"
            stroke="var(--accent)"
            strokeWidth="2.5"
            markerEnd="url(#vector-arrow-accent)"
          />

          {/* Subdermal Linear Retrograde Vector along Fold */}
          <line
            x1="168"
            y1="165"
            x2="152"
            y2="128"
            stroke="var(--accent)"
            strokeWidth="2"
            markerEnd="url(#vector-arrow-accent)"
          />

          {/* Callouts */}
          <text x="182" y="106" fill="var(--accent)" fontSize="9" fontWeight="600">
            Pyriform Support Bolus
          </text>
          <text x="175" y="152" fill="var(--accent)" fontSize="9" fontWeight="600">
            Linear Retrograde Fanning
          </text>
          <text x="182" y="120" fill="#059669" fontSize="8">
            Deep Periosteal Plane
          </text>
        </g>
      )}

      {/* Label Badge */}
      <rect x="15" y="15" width="140" height="22" rx="4" fill="var(--surface)" stroke="currentColor" strokeOpacity="0.2" />
      <text x="24" y="30" fill="currentColor" fontSize="10" fontWeight="600">
        Pyriform & Nasolabial Filler
      </text>
    </svg>
  );
}

function UniversalFallbackSvg({
  procedureKey,
  mode = "vectors",
}: {
  procedureKey: string;
  mode?: DiagramMode;
}) {
  const showBefore = mode === "before" || mode === "vectors" || mode === "thumbnail" || mode === "expanded" || mode === "compare";
  const showAfter = mode === "after" || mode === "vectors" || mode === "thumbnail" || mode === "expanded" || mode === "compare";
  const showVectors = mode === "vectors" || mode === "thumbnail" || mode === "expanded" || mode === "compare";

  const meta = PROCEDURE_DIAGRAM_METADATA[procedureKey] ?? {
    titleTh: procedureKey,
    titleEn: "Aesthetic Vector Optimization",
    anatomicalAreaTh: "ใบหน้า (Facial Structure)",
    targetLandmarks: ["Facial Thirds", "Lateral Contour", "Symmetry Plane"],
    correctionVectorsTh: [
      "เวกเตอร์ปรับสัดส่วนใบหน้า (Facial Proportion Vector): ปรับมิติให้สอดคล้องกับเกณฑ์อ้างอิง",
      "เวกเตอร์เพิ่มความกระชับ (Structural Elevation Vector): พยุงแนวขอบของกรอบหน้า",
    ],
    clinicalSignificanceTh:
      "การปรับมิติโครงสร้างใบหน้าตามเกณฑ์กายวิภาคศาสตร์เพื่อสัดส่วนที่สมดุล",
  };

  return (
    <svg
      role="img"
      aria-label={`${meta.titleTh} Vector Diagram`}
      viewBox="0 0 360 220"
      className="w-full h-auto text-ink select-none"
    >
      <SvgDefs />

      {/* Head & Facial Profile Outline */}
      <path
        d="M 120 30 Q 180 25 210 60 Q 220 85 220 110 Q 215 145 190 175 Q 165 195 130 190 L 110 185"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />

      {/* Facial Thirds Reference Lines */}
      <line x1="100" y1="60" x2="230" y2="60" stroke="currentColor" strokeOpacity="0.15" strokeDasharray="2 3" />
      <line x1="100" y1="110" x2="230" y2="110" stroke="currentColor" strokeOpacity="0.15" strokeDasharray="2 3" />
      <line x1="100" y1="160" x2="230" y2="160" stroke="currentColor" strokeOpacity="0.15" strokeDasharray="2 3" />

      {/* Baseline Arc */}
      {showBefore && (
        <path
          d="M 130 145 Q 160 175 190 155"
          fill="none"
          stroke="currentColor"
          strokeDasharray="4 3"
          strokeOpacity={mode === "before" ? 1 : 0.4}
          strokeWidth="2"
        />
      )}

      {/* Target Arc */}
      {showAfter && (
        <path
          d="M 130 145 Q 155 160 190 145"
          fill="none"
          stroke={mode === "after" ? "var(--accent)" : "currentColor"}
          strokeWidth="2.25"
          strokeLinecap="round"
        />
      )}

      {/* Directional Correction Vector */}
      {showVectors && (
        <g>
          <line
            x1="160"
            y1="168"
            x2="175"
            y2="140"
            stroke="var(--accent)"
            strokeWidth="2.5"
            markerEnd="url(#vector-arrow-accent)"
          />
          <circle cx="160" cy="168" r="3" fill="var(--accent)" />

          {/* Text Callout */}
          <text x="180" y="132" fill="var(--accent)" fontSize="9" fontWeight="600">
            Clinical Correction Vector
          </text>
          <text x="180" y="146" fill="currentColor" opacity="0.75" fontSize="8">
            Harmonization & Symmetry
          </text>
        </g>
      )}

      {/* Label Badge */}
      <rect x="15" y="15" width="135" height="22" rx="4" fill="var(--surface)" stroke="currentColor" strokeOpacity="0.2" />
      <text x="24" y="30" fill="currentColor" fontSize="10" fontWeight="600">
        {meta.anatomicalAreaTh}
      </text>
    </svg>
  );
}

// Export individual SVGs for raw vector access if required
export {
  ChinAugmentationSvg,
  LipAugmentationSvg,
  MasseterBotoxSvg,
  NasolabialFillerSvg,
  RhinoplastySvg,
  SkinTighteningSvg,
  ThreadLiftSvg,
  UniversalFallbackSvg,
  WrinkleBotoxSvg,
};

/** Unified 3D Aesthetic Illustration and Diagram Dispatcher */
export function ProcedureSvgDiagram({
  procedure,
  mode = "compare",
  forceSvg = false,
}: {
  procedure: string;
  mode?: DiagramMode;
  forceSvg?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const asset = PROCEDURE_ASSETS[procedure];

  if (asset && !forceSvg && !imgError) {
    let src = asset.compare;
    let label = "ภาพเปรียบเทียบ";
    if (mode === "before") {
      src = asset.before;
      label = "ก่อนทำ";
    } else if (mode === "after") {
      src = asset.after;
      label = "ผลลัพธ์เป้าหมาย";
    }

    const isThumbnail = mode === "thumbnail";
    const isPortrait = mode === "before" || mode === "after";

    return (
      <div
        className="relative w-full overflow-hidden rounded-control bg-paper flex items-center justify-center select-none"
        data-testid={`procedure-illustration-${procedure}`}
      >
        <img
          key={src}
          src={src}
          alt={`${asset.alt} - ${label}`}
          loading={isThumbnail ? "lazy" : "eager"}
          onError={() => setImgError(true)}
          className={`rounded-control transition-all duration-200 ${
            isThumbnail
              ? "w-full max-h-[160px] object-cover"
              : isPortrait
                ? "max-h-[420px] w-auto max-w-full object-contain mx-auto"
                : "max-h-[420px] w-full h-auto object-contain mx-auto"
          }`}
        />
        {!isThumbnail && (
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-ink text-surface text-sm rounded-control pointer-events-none">
            3D Educational Reference
          </div>
        )}
      </div>
    );
  }

  // Fallback to SVG diagram
  switch (procedure) {
    case "rhinoplasty":
      return <RhinoplastySvg mode={mode} />;
    case "chin_augmentation":
      return <ChinAugmentationSvg mode={mode} />;
    case "botulinum_toxin_masseter":
      return <MasseterBotoxSvg mode={mode} />;
    case "lip_augmentation":
      return <LipAugmentationSvg mode={mode} />;
    case "skin_tightening":
      return <SkinTighteningSvg mode={mode} />;
    case "thread_lift":
      return <ThreadLiftSvg mode={mode} />;
    case "botulinum_toxin_wrinkles":
      return <WrinkleBotoxSvg mode={mode} />;
    case "hyaluronic_acid_filler_nasolabial":
      return <NasolabialFillerSvg mode={mode} />;
    default:
      return <UniversalFallbackSvg procedureKey={procedure} mode={mode} />;
  }
}

export const ProcedureIllustration = ProcedureSvgDiagram;

// -----------------------------------------------------------------------------
// Procedure Diagram Inline Thumbnail Component
// -----------------------------------------------------------------------------

interface ThumbnailProps {
  procedure: string;
  title: string;
  onExpand: () => void;
}

export function ProcedureDiagramThumbnail({ procedure, title, onExpand }: ThumbnailProps) {
  return (
    <div className="mt-3 border border-line bg-surface p-3 rounded-control">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1 text-sm font-semibold text-ink">
          <Sparkles size={15} className="text-accent" />
          <span>ภาพจำลองตัวอย่างผลลัพธ์</span>
        </div>
        <span className="border border-line bg-paper px-2 py-1 text-sm text-ink-3 rounded-control">
          ภาพตัวอย่างหัตถการ
        </span>
      </div>

      {/* Click-to-expand preview box */}
      <div
        role="button"
        tabIndex={0}
        onClick={onExpand}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onExpand();
          }
        }}
        aria-label={`คลิกเพื่อดูภาพขยายและตัวอย่างหัตถการ ${title}`}
        className="group relative cursor-pointer overflow-hidden border border-line rounded-control bg-paper transition-all duration-200 hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
      >
        <div className="p-2 flex items-center justify-center max-h-[170px] overflow-hidden">
          <ProcedureSvgDiagram procedure={procedure} mode="thumbnail" />
        </div>

        {/* Hover / Focus Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-ink/10 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
          <span className="flex items-center gap-2 border border-line bg-surface px-3 py-1 text-sm font-semibold text-ink rounded-control">
            <Maximize2 size={14} className="text-accent" />
            <span>ดูภาพขยายเปรียบเทียบ</span>
          </span>
        </div>
      </div>

      {/* Caption & Quick Legend */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-ink-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-control bg-line-strong" />
            <span>ก่อนทำ</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-control bg-accent" />
            <span className="text-ink font-medium">หลังปรับแก้</span>
          </span>
        </div>
        <button
          type="button"
          onClick={onExpand}
          className="text-accent hover:underline font-medium flex items-center gap-1 text-sm cursor-pointer"
        >
          <span>ดูภาพขยาย</span>
          <Maximize2 size={13} />
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Procedure Diagram Modal Component (Radix Dialog)
// -----------------------------------------------------------------------------

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendation: ProcedureRecommendation | null;
  defaultTitle?: string;
  specificAction?: string | null;
  areaLabel?: string;
  categoryLabel?: string;
}

export function ProcedureDiagramModal({
  open,
  onOpenChange,
  recommendation,
  defaultTitle = "",
  specificAction = null,
  areaLabel = "",
  categoryLabel = "",
}: ModalProps) {
  const [viewMode, setViewMode] = useState<DiagramMode>("compare");

  if (!recommendation) return null;

  const procedure = recommendation.procedure;
  const meta = PROCEDURE_DIAGRAM_METADATA[procedure] ?? {
    titleTh: defaultTitle || procedure,
    titleEn: "Clinical Aesthetic Transformation Diagram",
    anatomicalAreaTh: areaLabel || "ใบหน้า",
    targetLandmarks: ["Anatomical Landmarks", "Facial Harmony Planes"],
    correctionVectorsTh: [
      "เวกเตอร์ปรับมิติโครงสร้างใบหน้า",
      "เวกเตอร์เพิ่มความกระชับและความสมดุล",
    ],
    clinicalSignificanceTh:
      "การปรับแต่งโครงสร้างเพื่อเสริมสร้างดุลยภาพและความเป็นธรรมชาติของสัดส่วนใบหน้าโดยรวม",
  };

  const titleDisplay = specificAction || recommendation.title_th || defaultTitle || meta.titleTh;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-field -translate-x-1/2 -translate-y-1/2 border border-line bg-surface p-4 md:p-6 rounded-control max-h-[90vh] overflow-y-auto"
          style={{ maxWidth: 660 }}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-line pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {areaLabel && (
                  <span className="border border-line bg-paper px-2 py-1 text-sm font-medium rounded-control text-ink-2">
                    {areaLabel}
                  </span>
                )}
                {categoryLabel && (
                  <span className="border border-line bg-paper px-2 py-1 text-sm font-medium rounded-control text-accent">
                    {categoryLabel}
                  </span>
                )}
                <span className="border border-line bg-paper px-2 py-1 text-sm text-ink-3 rounded-control">
                  ภาพตัวอย่างหัตถการ
                </span>
              </div>
              <Dialog.Title className="text-lg font-semibold text-ink">
                {titleDisplay}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-ink-2">
                {meta.titleEn}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="ปิดหน้าต่างแผนภาพ"
                className="p-1 text-ink-2 hover:text-ink border border-line rounded-control hover:bg-paper cursor-pointer"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-line pb-3">
            <span className="text-sm font-medium text-ink-3">มุมมอง:</span>
            <button
              type="button"
              onClick={() => setViewMode("compare")}
              className={`px-3 py-1 text-sm font-medium rounded-control cursor-pointer border transition-colors ${
                viewMode === "compare" || viewMode === "vectors"
                  ? "border-accent bg-accent text-surface"
                  : "border-line bg-paper text-ink hover:border-line-strong"
              }`}
            >
              ภาพเปรียบเทียบ
            </button>
            <button
              type="button"
              onClick={() => setViewMode("before")}
              className={`px-3 py-1 text-sm font-medium rounded-control cursor-pointer border transition-colors ${
                viewMode === "before"
                  ? "border-accent bg-accent text-surface"
                  : "border-line bg-paper text-ink hover:border-line-strong"
              }`}
            >
              ก่อนทำ
            </button>
            <button
              type="button"
              onClick={() => setViewMode("after")}
              className={`px-3 py-1 text-sm font-medium rounded-control cursor-pointer border transition-colors ${
                viewMode === "after"
                  ? "border-accent bg-accent text-surface"
                  : "border-line bg-paper text-ink hover:border-line-strong"
              }`}
            >
              ผลลัพธ์เป้าหมาย
            </button>
          </div>

          {/* High-Resolution 3D Illustration Display Area */}
          <div className="mt-4 border border-line bg-paper p-3 md:p-4 rounded-control flex flex-col items-center justify-center">
            <div className="w-full max-w-field">
              <ProcedureSvgDiagram procedure={procedure} mode={viewMode} />
            </div>

            {/* In-Modal Diagram Legend / Educational Reference Note */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-ink-2 border-t border-line pt-3 w-full">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-control bg-line-strong" />
                  <span>ก่อนทำ</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-control bg-accent" />
                  <span className="font-semibold text-accent">ผลลัพธ์เป้าหมาย</span>
                </span>
              </div>
              <span className="text-sm text-ink-3">
                *ภาพประกอบเพื่อการศึกษาทางการแพทย์
              </span>
            </div>
          </div>

          {/* Detailed Clinical Vector Breakdown */}
          <div className="mt-4 border border-line bg-surface p-4 rounded-control space-y-3">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-accent shrink-0" />
              <h4 className="text-sm font-semibold text-ink">
                เวกเตอร์ทิศทางการรักษาทางการแพทย์
              </h4>
            </div>

            <ul className="space-y-2 text-sm text-ink-2">
              {meta.correctionVectorsTh.map((vectorText, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-accent shrink-0 mt-1" />
                  <span>{vectorText}</span>
                </li>
              ))}
            </ul>

            {/* Target Landmarks */}
            <div className="border-t border-line pt-3 mt-3">
              <span className="text-sm font-semibold text-ink">จุดอ้างอิงทางกายวิภาค:</span>
              <div className="mt-2 flex flex-wrap gap-1">
                {meta.targetLandmarks.map((lm) => (
                  <span
                    key={lm}
                    className="border border-line bg-paper px-2 py-1 text-sm text-ink-2 rounded-control"
                  >
                    {lm}
                  </span>
                ))}
              </div>
            </div>

            {/* Clinical Rationale & Significance */}
            <div className="border-t border-line pt-3 mt-3 flex items-start gap-2">
              <Info size={16} className="text-ink-3 shrink-0 mt-1" />
              <p className="text-sm text-ink-3">
                {meta.clinicalSignificanceTh}
              </p>
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="mt-6 flex justify-end">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              ปิดหน้าต่าง
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
