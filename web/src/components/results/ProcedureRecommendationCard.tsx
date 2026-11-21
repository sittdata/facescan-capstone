import { CheckCircle2, Sliders, Sparkles } from "lucide-react";
import { useState } from "react";
import type { ProcedureRecommendation } from "../../api/schemas";
import { Button } from "../ui/Button";
import {
  ProcedureDiagramModal,
  ProcedureDiagramThumbnail,
} from "./ProcedureDiagram";

interface Props {
  recommendations?: ProcedureRecommendation[] | null;
  onOpenSimulation?: () => void;
  filterNonRecommended?: boolean;
  excludeStructural?: boolean;
}

export const PROCEDURE_TITLES: Record<string, string> = {
  chin_augmentation: "ปรับมิติปลายคาง",
  lip_augmentation: "ปรับมิติมุมปากและริมฝีปาก",
  rhinoplasty: "ปรับแต่งทรงจมูก",
  botulinum_toxin_masseter: "โบท็อกซ์ลดกราม ปรับรูปหน้าเรียว",
  botulinum_toxin_wrinkles: "โบท็อกซ์ริ้วรอยส่วนบน",
  hyaluronic_acid_filler_nasolabial: "ฟิลเลอร์เติมเต็มร่องแก้ม",
  hyaluronic_acid_filler_temple: "ฟิลเลอร์เติมเต็มขมับตอบ",
  skin_tightening: "ยกกระชับด้วยคลื่นพลังงาน",
  thread_lift: "ร้อยไหมพยุงกรอบหน้า",
  mandibular_contouring: "ศัลยกรรมตัดแต่งมุมกราม",
  orthognathic_surgery: "ศัลยกรรมเลื่อนขากรรไกร",
  surgical_facelift: "ศัลยกรรมยกกระชับดึงหน้า",
};

export const FACIAL_AREAS: Record<string, { label: string; badgeClass: string }> = {
  nose: { label: "จมูก", badgeClass: "border-line bg-surface text-ink-2" },
  chin: { label: "คาง", badgeClass: "border-line bg-surface text-ink-2" },
  lips: { label: "ริมฝีปาก", badgeClass: "border-line bg-surface text-ink-2" },
  jawline: { label: "กรอบหน้า", badgeClass: "border-line bg-surface text-ink-2" },
  upper_face: { label: "ส่วนบน/หน้าผาก", badgeClass: "border-line bg-surface text-ink-2" },
  midface: { label: "ร่องแก้ม", badgeClass: "border-line bg-surface text-ink-2" },
  temple: { label: "ขมับ", badgeClass: "border-line bg-surface text-ink-2" },
  skin: { label: "ผิวพรรณ", badgeClass: "border-line bg-surface text-ink-2" },
  skeletal: { label: "ขากรรไกร", badgeClass: "border-line bg-surface text-ink-2" },
  face: { label: "ใบหน้า/ดึงหน้า", badgeClass: "border-line bg-surface text-ink-2" },
};

export const DEFAULT_PROCEDURE_AREAS: Record<string, string> = {
  chin_augmentation: "chin",
  lip_augmentation: "lips",
  rhinoplasty: "nose",
  botulinum_toxin_masseter: "jawline",
  botulinum_toxin_wrinkles: "upper_face",
  hyaluronic_acid_filler_nasolabial: "midface",
  hyaluronic_acid_filler_temple: "temple",
  skin_tightening: "skin",
  thread_lift: "jawline",
  mandibular_contouring: "jawline",
  orthognathic_surgery: "skeletal",
  surgical_facelift: "face",
};

export const CATEGORY_TAGS: Record<string, { label: string; badgeClass: string }> = {
  surgical: { label: "ศัลยกรรมผ่าตัด", badgeClass: "border-line-strong bg-notice text-ink" },
  injection: { label: "หัตถการฉีด", badgeClass: "border-accent bg-paper text-accent" },
  energy_device: { label: "เครื่องยกกระชับ", badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  thread: { label: "ร้อยไหม", badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
};

export const DEFAULT_PROCEDURE_CATEGORIES: Record<string, string> = {
  chin_augmentation: "injection",
  lip_augmentation: "injection",
  rhinoplasty: "surgical",
  botulinum_toxin_masseter: "injection",
  botulinum_toxin_wrinkles: "injection",
  hyaluronic_acid_filler_nasolabial: "injection",
  hyaluronic_acid_filler_temple: "injection",
  skin_tightening: "energy_device",
  thread_lift: "thread",
  mandibular_contouring: "surgical",
  orthognathic_surgery: "surgical",
  surgical_facelift: "surgical",
};

export function getPriorityTag(intensity: number): { label: string; badgeClass: string } {
  if (intensity >= 0.65) {
    return { label: "แนะนำสูง", badgeClass: "bg-rose-500/10 text-rose-600 border-rose-500/20" };
  }
  if (intensity >= 0.35) {
    return { label: "แนะนำปานกลาง", badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
  }
  if (intensity > 0) {
    return { label: "ข้อแนะนำเริ่มต้น", badgeClass: "border-accent bg-paper text-accent" };
  }
  return { label: "สัดส่วนสมดุล", badgeClass: "border-line bg-paper text-ink-3" };
}

export function getSpecificAction(rec: ProcedureRecommendation): string | null {
  if (rec.specific_action) return rec.specific_action;
  if (rec.intensity <= 0) return null;
  if (rec.title_th && rec.title_th !== PROCEDURE_TITLES[rec.procedure]) {
    return rec.title_th;
  }

  const metrics = rec.triggering_metrics ?? [];
  const rationale = (rec.rationale ?? "").toLowerCase();

  switch (rec.procedure) {
    case "rhinoplasty": {
      const hasAlar = metrics.some((m) => m.includes("F6") || m.includes("alar"));
      const hasTip = metrics.some((m) => m.includes("P3a") || m.includes("P2") || m.includes("tip"));
      const hasRadix = metrics.some((m) => m.includes("P1") || m.includes("nasofrontal"));
      if (hasAlar && hasTip) return "เสริมจมูกยกปลายพุ่งและตัดปีกจมูก";
      if (hasAlar) return "ตัดปีกจมูก (ลดความกว้าง)";
      if (hasTip) return "เสริมจมูกยกปลายพุ่ง";
      if (hasRadix) return "เสริมสันจมูกปรับมิติหัวตา";
      return "ศัลยกรรมปรับโครงสร้างทรงจมูก";
    }
    case "chin_augmentation": {
      const hasProfile = metrics.some((m) => m.includes("P4") || m.includes("eline"));
      const hasVertical = metrics.some((m) => m.includes("F1") || m.includes("F2"));
      const hasCeph = metrics.some((m) => m.includes("class_ii") || m.includes("ceph"));
      if (hasProfile && hasVertical) return "เสริมคางยื่นรับสัดส่วน E-line และเพิ่มความยาวใบหน้า";
      if (hasProfile) return "เสริมคางยื่นรับสัดส่วน E-line";
      if (hasVertical) return "เสริมคางเพิ่มความยาวใบหน้า";
      if (hasCeph) return "เสริมคางปรับโครงสร้างแนวกราม";
      return "เสริมคางปรับมิติปลายคาง";
    }
    case "lip_augmentation": {
      if (rationale.includes("lower lip") || rationale.includes("ริมฝีปากล่าง")) {
        return "ฟิลเลอร์เพิ่มความอวบอิ่มริมฝีปากล่าง";
      }
      if (rationale.includes("upper lip") || rationale.includes("ริมฝีปากบน")) {
        return "ฟิลเลอร์เพิ่มมิติริมฝีปากบนและยกมุมปาก";
      }
      return "ฟิลเลอร์ปรับความอิ่มฟูและมิติริมฝีปาก";
    }
    case "botulinum_toxin_masseter":
      return "โบท็อกซ์ลดขนาดกล้ามเนื้อกราม ปรับรูปหน้าเรียว";
    case "botulinum_toxin_wrinkles": {
      const hasBrow = metrics.some((m) => m.includes("brow"));
      if (hasBrow) return "โบท็อกซ์ปรับสมดุลแนวคิ้วและลดริ้วรอยหน้าผาก";
      return "โบท็อกซ์ลดริ้วรอยหน้าผากและหว่างคิ้ว";
    }
    case "hyaluronic_acid_filler_nasolabial": {
      const hasPyriform = metrics.some((m) => m.includes("P2") || m.includes("sna"));
      if (hasPyriform) return "ฟิลเลอร์หนุนฐานกระดูกปีกจมูกและร่องแก้มลึก";
      return "ฟิลเลอร์เติมเต็มร่องแก้ม";
    }
    case "hyaluronic_acid_filler_temple":
      return "ฟิลเลอร์เติมเต็มขมับตอบ ปรับมิติกรอบหน้าส่วนบน";
    case "skin_tightening": {
      if (rationale.includes("tier 1") || rationale.includes("early")) {
        return "ทำคลื่นพลังงานยกกระชับระดับเริ่มต้น";
      }
      return "ยกกระชับผิวและชั้น SMAS ด้วยคลื่นพลังงาน";
    }
    case "thread_lift": {
      if (rationale.includes("tier 3") || rationale.includes("advanced")) {
        return "ร้อยไหมยกพยุงทิศทางเนื้อเยื่อกรอบหน้า";
      }
      return "ร้อยไหมเงี่ยงละลายพยุงกรอบหน้าและกระพุ้งแก้ม";
    }
    case "mandibular_contouring":
      return "ศัลยกรรมผ่าตัดลดขนาดกระดูกมุมกราม";
    case "orthognathic_surgery": {
      if (metrics.some((m) => m.includes("class_ii"))) {
        return "ศัลยกรรมผ่าตัดเลื่อนขากรรไกรล่างมาด้านหน้า";
      }
      if (metrics.some((m) => m.includes("class_iii"))) {
        return "ศัลยกรรมผ่าตัดเลื่อนขากรรไกรแก้ไขคางยื่น";
      }
      return "ศัลยกรรมผ่าตัดเลื่อนขากรรไกร";
    }
    case "surgical_facelift":
      return "ศัลยกรรมผ่าตัดดึงหน้าชั้น SMAS และเย็บกระชับลำคอ";
    default:
      return null;
  }
}

export const RATIONALE_TH: Record<string, string> = {
  "Lip vermilion fullness and sagittal projection are within reference ranges.":
    "ความหนาและมิติความนูนของริมฝีปากอยู่ในเกณฑ์อ้างอิงที่ได้สัดส่วนสมดุลแล้ว",
  "Chin projection and vertical proportions are within reference ranges.":
    "มิติความยาวคางและสัดส่วนใบหน้าส่วนล่างอยู่ในเกณฑ์อ้างอิงที่ได้สัดส่วนสมดุลแล้ว",
  "Chin augmentation (filler or implant) is contraindicated due to Skeletal Class III prognathism (mandibular excess or midface hypoplasia). Adding chin volume would exacerbate lower-face anterior protrusion; orthognathic surgical consultation is recommended instead.":
    "ข้อห้ามทางการแพทย์: มีภาวะกระดูกขากรรไกรล่างยื่นผิดรูป (Skeletal Class III) การฉีดฟิลเลอร์หรือเสริมคางจะทำให้คางยื่นล้ำยิ่งขึ้น แนะนำปรึกษาแพทย์ศัลยกรรมเลื่อนขากรรไกร",
  "Cephalometric skeletal analysis confirms severe Skeletal Class II retrognathia. Soft-tissue chin filler provides only limited aesthetic camouflage and cannot correct underlying mandibular hypoplasia or airway compromise; corrective orthognathic surgery is the primary clinical treatment.":
    "การวิเคราะห์กระดูกเซฟาโลเมตริกส์ยืนยันภาวะคางถอยร่นรุนแรง (Severe Class II) การเสริมคางหรือฉีดฟิลเลอร์ช่วยพรางมิติได้จำกัด ไม่สามารถแก้ปัญหากระดูกขากรรไกรหดสั้นหรือทางเดินหายใจแคบได้ การผ่าตัดเลื่อนขากรรไกรเป็นการรักษาหลัก",
  "Cephalometric skeletal analysis confirms moderate Skeletal Class II retrognathia. Chin filler or implant can offer partial aesthetic camouflage, but orthognathic mandibular advancement is recommended for definitive skeletal correction.":
    "การวิเคราะห์กระดูกเซฟาโลเมตริกส์ยืนยันภาวะคางถอยร่นปานกลาง (Moderate Class II) การเสริมคางช่วยพรางรูปหน้าได้บางส่วน แต่แนะนำการผ่าตัดเลื่อนขากรรไกรล่างเพื่อการแก้ไขเชิงโครงสร้างที่ถาวร",
  "Cephalometric skeletal analysis confirms mild Skeletal Class II retrognathia, which is well-suited for non-surgical chin filler or implant camouflage.":
    "การวิเคราะห์กระดูกเซฟาโลเมตริกส์ยืนยันภาวะคางถอยเล็กน้อย (Mild Class II) เหมาะอย่างยิ่งสำหรับการเสริมคางหรือฉีดฟิลเลอร์ปรับมิติพรางโครงหน้า",
  "Nasal proportions, tip rotation, and projection are within reference ranges.":
    "มิติสัดส่วนทรงจมูก ปลายจมูก และความพุ่งอยู่ในเกณฑ์อ้างอิงที่ได้สัดส่วนสมดุลแล้ว",
  "Nasal proportions and tip projection are within reference ranges.":
    "มิติความกว้างและปลายจมูกอยู่ในเกณฑ์อ้างอิงที่ได้สัดส่วนสมดุลแล้ว",
  "Mandibular angle width and masseter volume are in harmony with facial proportions.":
    "มิติมุมขากรรไกรและขนาดกล้ามเนื้อกรามอยู่ในเกณฑ์สมดุลตามสัดส่วนใบหน้าแล้ว",
  "Upper face dynamic vectors and brow contours display smooth, harmonious muscular tone.":
    "มิติการเคลื่อนไหวและแรงตึงตัวของกล้ามเนื้อส่วนบนอยู่ในเกณฑ์ราบเรียบสมดุลแล้ว",
  "Upper facial dynamic lines and brow vector symmetry are well-balanced.":
    "ริ้วรอยจากการเคลื่อนไหวของกล้ามเนื้อส่วนบนและความสมมาตรของแนวคิ้วอยู่ในเกณฑ์สมดุลดี",
  "Nasolabial fold contours and pyriform aperture projection are youthfully supported without soft-tissue deficit.":
    "ร่องแก้มและฐานกระดูกข้างปีกจมูกมีความอิ่มเอิบ ไม่พบการยุบตัวของชั้นไขมัน",
  "Nasolabial transition and paranasal structural volume are youthful and well-supported.":
    "รอยต่อร่องแก้มและโครงสร้างข้างปีกจมูกมีความอิ่มเอิบและได้รับการพยุงที่ดี ไม่พบการยุบตัว",
  "Perioral soft tissue descent accentuates nasolabial crease deepening.":
    "การคล้อยตัวของเนื้อเยื่อรอบช่องปากส่งผลให้ร่องแก้มดูลึกและเด่นชัดขึ้น",
  "Temporal fossa volume and bitemporal contour are in balanced anatomical proportion.":
    "มิติความกว้างของขมับและเนื้อเยื่อส่วนบนอยู่ในเกณฑ์สมดุล ไม่พบภาวะขมับตอบ",
  "Temporal fossa contour and bitemporal-to-zygomatic proportions are well-balanced.":
    "มิติร่องขมับและสัดส่วนความกว้างขมับต่อโหนกแก้มอยู่ในเกณฑ์สมดุล",
  "Bony mandibular angle and basal bone dimensions are balanced without structural skeletal flare.":
    "โครงสร้างกระดูกขากรรไกรล่างและมุมกรามได้รูปสมดุล ไม่พบกระดูกกรามผายกว้างผิดปกติ",
  "Mandibular bony contour and gonial angle are within physiological aesthetic boundaries.":
    "โครงสร้างกระดูกขากรรไกรล่างและมุมกรามอยู่ในเกณฑ์สมดุลตามธรรมชาติ",
  "Skeletal and occlusal relationships display harmonic Class I alignment without indication for orthognathic surgical intervention.":
    "ความสัมพันธ์ของกระดูกขากรรไกรและการสบฟันอยู่ในเกณฑ์ Class I ปกติ ไม่มีข้อบ่งชี้สำหรับการผ่าตัดเลื่อนขากรรไกร",
  "Skeletal jaw relationships are balanced (Class I); orthognathic surgery is not indicated.":
    "ความสัมพันธ์ของกระดูกขากรรไกรอยู่ในเกณฑ์ Class I ปกติ ไม่มีข้อบ่งชี้สำหรับการผ่าตัดเลื่อนขากรรไกร",
  "Cephalometric analysis indicates harmonious skeletal jaw bases (Skeletal Class I); corrective orthognathic surgery is not clinically indicated.":
    "การวิเคราะห์กระดูกเซฟาโลเมตริกส์บ่งชี้ว่าฐานกระดูกขากรรไกรสมดุล (Class I) ไม่มีข้อบ่งชี้ทางการแพทย์สำหรับการผ่าตัดเลื่อนขากรรไกร",
  "Mild Skeletal Class II retrognathia. Corrective orthognathic jaw surgery is an elective option; aesthetic camouflage (chin filler or implant) or orthodontic compensation is generally preferred.":
    "กระดูกขากรรไกรล่างถอยร่นระดับเล็กน้อย (Class II) การผ่าตัดเลื่อนขากรรไกรเป็นทางเลือกเพิ่มเติม โดยทั่วไปแนะนำการปรับมิติพรางด้วยฟิลเลอร์/เสริมคาง หรือการจัดฟันชดเชย",
  "Moderate Skeletal Class II malocclusion with mandibular retrognathia. Orthognathic bilateral sagittal split osteotomy (BSSO) mandibular advancement is clinically indicated to establish functional occlusion and restore lower-face projection.":
    "การสบฟันผิดปกติร่วมกับขากรรไกรล่างถอยร่นปานกลาง (Class II) มีข้อบ่งชี้ทางการแพทย์สำหรับการผ่าตัดเลื่อนขากรรไกรล่างมาด้านหน้า (BSSO) เพื่อแก้ไขการสบฟันและเพิ่มมิติความพุ่งของใบหน้าส่วนล่าง",
  "Severe Skeletal Class II mandibular deficiency with high sagittal discrepancy. Corrective orthognathic surgery (BSSO advancement ± Le Fort I osteotomy) is strongly recommended to resolve substantial skeletal disharmony, masticatory dysfunction, and potential pharyngeal airway collapse.":
    "กระดูกขากรรไกรล่างถอยร่นรุนแรงและมีความคลาดเคลื่อนในแนวหน้าหลังสูง แนะนำอย่างยิ่งสำหรับการผ่าตัดเลื่อนขากรรไกร (BSSO advancement ± Le Fort I) เพื่อแก้ไขความผิดรูปของกระดูก ฟื้นฟูการบดเคี้ยว และป้องกันภาวะทางเดินหายใจยุบตัว",
  "Mild Skeletal Class III discrepancy. Orthognathic surgery may be considered if orthodontic dental camouflage is insufficient. Non-surgical chin volume addition is contraindicated.":
    "ขากรรไกรล่างยื่นระดับเล็กน้อย (Class III) อาจพิจารณาการผ่าตัดหากการจัดฟันพรางไม่เพียงพอ และมีข้อห้ามสำหรับการฉีดฟิลเลอร์หรือเสริมคาง",
  "Moderate Skeletal Class III malocclusion with mandibular prognathism or midface retrusion. Corrective orthognathic surgery (mandibular setback ± maxillary advancement) is clinically indicated for functional bite correction and profile balance.":
    "การสบฟันผิดปกติร่วมกับขากรรไกรล่างยื่นหรือใบหน้าส่วนกลางถอยร่นปานกลาง (Class III) มีข้อบ่งชี้ทางการแพทย์สำหรับการผ่าตัดเลื่อนขากรรไกร (mandibular setback ± maxillary advancement) เพื่อแก้ไขการสบฟันและความสมดุลของใบหน้า",
  "Severe Skeletal Class III skeletal deformity (prominent mandibular excess and negative overjet). Two-jaw corrective orthognathic surgery (Le Fort I maxillary advancement with BSSO mandibular setback) is strongly recommended to restore chewing function, TMJ stability, and facial harmony.":
    "ความผิดรูปของโครงสร้างกระดูกขากรรไกรล่างยื่นรุนแรงและการสบฟันกลับ (Class III) แนะนำอย่างยิ่งสำหรับการผ่าตัดเลื่อนขากรรไกรสองขากรรไกร (Two-Jaw Le Fort I + BSSO) เพื่อฟื้นฟูการเคี้ยวอาหาร ความมั่นคงของข้อต่อขากรรไกร และความสมดุลรูปหน้า",
  "Facial skin and subcutaneous structures display high firmness; routine preventive skincare recommended without energy-based tightening.":
    "โครงสร้างผิวและความกระชับอยู่ในระดับดีเยี่ยม แนะนำการดูแลบำรุงผิวตามปกติโดยยังไม่จำเป็นต้องใช้คลื่นพลังงานยกกระชับ",
  "Facial skin and soft-tissue architecture display youthful firmness (Tier 1); no energy-based skin tightening indicated.":
    "โครงสร้างผิวหน้าและเนื้อเยื่อมีความกระชับอ่อนเยาว์ (Tier 1) ยังไม่มีข้อบ่งชี้ในการทำหัตถการยกกระชับด้วยคลื่นพลังงาน",
  "Mandibular and malar vectors show preserved anatomical position; suspension thread lifting is not indicated.":
    "แนวกรามและโหนกแก้มอยู่ในตำแหน่งกายวิภาคที่กระชับสมบูรณ์ ยังไม่มีข้อบ่งชี้สำหรับการร้อยไหมพยุงกรอบหน้า",
  "Facial soft tissue vectors exhibit minimal ptosis; mechanical thread suspension is not clinically indicated.":
    "เนื้อเยื่อใบหน้ามีความหย่อนคล้อยน้อยมาก ยังไม่มีข้อบ่งชี้ทางการแพทย์สำหรับการร้อยไหมพยุงโครงสร้าง",
  "Facial structural contours are within non-surgical boundaries; invasive surgical rhytidectomy is not indicated.":
    "โครงสร้างกรอบหน้าอยู่ในเกณฑ์ที่ไม่จำเป็นต้องผ่าตัด ยังไม่มีข้อบ่งชี้สำหรับการผ่าตัดดึงหน้า",
  "Facial structural contours show low-to-moderate descent (Tier 1-2); invasive surgical facelift is not indicated.":
    "โครงสร้างกรอบหน้ามีความหย่อนคล้อยระดับต่ำถึงปานกลาง (Tier 1-2) ยังไม่มีข้อบ่งชี้สำหรับการผ่าตัดดึงหน้า",
};

export function translateRationale(text?: string | null): string {
  if (!text) return "";
  if (RATIONALE_TH[text]) return RATIONALE_TH[text];
  let s = text;

  // Proportions & Aesthetics
  s = s.replace(/Lip vermilion fullness and sagittal projection are within reference ranges\./g, "ความหนาและมิติความนูนของริมฝีปากอยู่ในเกณฑ์อ้างอิงที่ได้สัดส่วนสมดุลแล้ว");
  s = s.replace(/Chin projection and vertical proportions are within reference ranges\./g, "มิติความยาวคางและสัดส่วนใบหน้าส่วนล่างอยู่ในเกณฑ์อ้างอิงที่ได้สัดส่วนสมดุลแล้ว");
  s = s.replace(/Nasal proportions, tip rotation, and projection are within reference ranges\./g, "มิติสัดส่วนทรงจมูก ปลายจมูก และความพุ่งอยู่ในเกณฑ์อ้างอิงที่ได้สัดส่วนสมดุลแล้ว");
  s = s.replace(/Nasal proportions and tip projection are within reference ranges\./g, "มิติความกว้างและปลายจมูกอยู่ในเกณฑ์อ้างอิงที่ได้สัดส่วนสมดุลแล้ว");
  s = s.replace(/Mandibular angle width and masseter volume are in harmony with facial proportions\./g, "มิติมุมขากรรไกรและขนาดกล้ามเนื้อกรามอยู่ในเกณฑ์สมดุลตามสัดส่วนใบหน้าแล้ว");
  s = s.replace(/Upper face dynamic vectors and brow contours display smooth, harmonious muscular tone\./g, "มิติการเคลื่อนไหวและแรงตึงตัวของกล้ามเนื้อส่วนบนอยู่ในเกณฑ์ราบเรียบสมดุลแล้ว");
  s = s.replace(/Upper facial dynamic lines and brow vector symmetry are well-balanced\./g, "ริ้วรอยจากการเคลื่อนไหวของกล้ามเนื้อส่วนบนและความสมมาตรของแนวคิ้วอยู่ในเกณฑ์สมดุลดี");
  s = s.replace(/Nasolabial fold contours and pyriform aperture projection are youthfully supported without soft-tissue deficit\./g, "ร่องแก้มและฐานกระดูกข้างปีกจมูกมีความอิ่มเอิบ ไม่พบการยุบตัวของชั้นไขมัน");
  s = s.replace(/Nasolabial transition and paranasal structural volume are youthful and well-supported\./g, "รอยต่อร่องแก้มและโครงสร้างข้างปีกจมูกมีความอิ่มเอิบและได้รับการพยุงที่ดี ไม่พบการยุบตัว");
  s = s.replace(/Temporal fossa volume and bitemporal contour are in balanced anatomical proportion\./g, "มิติความกว้างของขมับและเนื้อเยื่อส่วนบนอยู่ในเกณฑ์สมดุล ไม่พบภาวะขมับตอบ");
  s = s.replace(/Temporal fossa contour and bitemporal-to-zygomatic proportions are well-balanced\./g, "มิติร่องขมับและสัดส่วนความกว้างขมับต่อโหนกแก้มอยู่ในเกณฑ์สมดุล");
  s = s.replace(/Bony mandibular angle and basal bone dimensions are balanced without structural skeletal flare\./g, "โครงสร้างกระดูกขากรรไกรล่างและมุมกรามได้รูปสมดุล ไม่พบกระดูกกรามผายกว้างผิดปกติ");
  s = s.replace(/Mandibular bony contour and gonial angle are within physiological aesthetic boundaries\./g, "โครงสร้างกระดูกขากรรไกรล่างและมุมกรามอยู่ในเกณฑ์สมดุลตามธรรมชาติ");
  s = s.replace(/Skeletal and occlusal relationships display harmonic Class I alignment without indication for orthognathic surgical intervention\./g, "ความสัมพันธ์ของกระดูกขากรรไกรและการสบฟันอยู่ในเกณฑ์ Class I ปกติ ไม่มีข้อบ่งชี้สำหรับการผ่าตัดเลื่อนขากรรไกร");
  s = s.replace(/Skeletal jaw relationships are balanced \(Class I\); orthognathic surgery is not indicated\./g, "ความสัมพันธ์ของกระดูกขากรรไกรอยู่ในเกณฑ์ Class I ปกติ ไม่มีข้อบ่งชี้สำหรับการผ่าตัดเลื่อนขากรรไกร");
  s = s.replace(/Cephalometric analysis indicates harmonious skeletal jaw bases \(Skeletal Class I\); corrective orthognathic surgery is not clinically indicated\./g, "การวิเคราะห์กระดูกเซฟาโลเมตริกส์บ่งชี้ว่าฐานกระดูกขากรรไกรสมดุล (Class I) ไม่มีข้อบ่งชี้ทางการแพทย์สำหรับการผ่าตัดเลื่อนขากรรไกร");

  // Chin & Profile
  s = s.replace(/Lower lip position relative to Ricketts' E-line \(P4: ([^)]+)\) indicates chin retrusion in profile\./g, "ตำแหน่งริมฝีปากล่างเมื่อเทียบกับเส้น E-line (P4: $1) บ่งชี้ว่าคางมีการถอยร่นเมื่อมองจากด้านข้าง");
  s = s.replace(/Upper lip position relative to Ricketts' E-line \(P4: ([^)]+)\) indicates relative chin retrusion in profile\./g, "ตำแหน่งริมฝีปากบนเมื่อเทียบกับเส้น E-line (P4: $1) บ่งชี้ว่าคางถอยเมื่อมองจากด้านข้าง");
  s = s.replace(/Lower face proportion \(F1: ([^)]+)\) is shorter than classical third \(33\.3%\)\./g, "สัดส่วนใบหน้าส่วนล่าง (F1: $1) สั้นกว่าสัดส่วนมาตรฐาน 1 ใน 3");
  s = s.replace(/Lip vermilion ratio \(F8: ([^)]+)\) departs from classical phi proportion \(lower lip vermilion height is relatively thin\)\./g, "สัดส่วนความหนาริมฝีปาก (F8: $1) เบี่ยงเบนจากสัดส่วนทองคำ (ริมฝีปากล่างค่อนข้างบาง)");
  s = s.replace(/Lip vermilion ratio \(F8: ([^)]+)\) departs from classical phi proportion \(upper lip vermilion height is relatively thin\)\./g, "สัดส่วนความหนาริมฝีปาก (F8: $1) เบี่ยงเบนจากสัดส่วนทองคำ (ริมฝีปากบนค่อนข้างบาง)");
  s = s.replace(/Upper lip \(P4: ([^)]+)\) is positioned behind Ricketts' aesthetic E-line plane\./g, "ริมฝีปากบน (P4: $1) อยู่ด้านหลังระนาบความงาม E-line");
  s = s.replace(/Lower lip \(P4: ([^)]+)\) is positioned behind Ricketts' aesthetic E-line plane\./g, "ริมฝีปากล่าง (P4: $1) อยู่ด้านหลังระนาบความงาม E-line");
  s = s.replace(/Alar base width \(F6: ([^)]+)\) is wider than intercanthal distance\./g, "ความกว้างปีกจมูก (F6: $1) กว้างกว่าระยะหัวตา");
  s = s.replace(/Alar base width relative to intercanthal distance \(F6: ([^)]+)\) exceeds classical canon proportion\./g, "ความกว้างปีกจมูกเทียบกับระยะหัวตา (F6: $1) กว้างกว่าเกณฑ์มาตรฐาน");
  s = s.replace(/Lower face ratio \(F2: ([^)]+)\) indicates relatively short chin height compared to upper lip\./g, "สัดส่วนใบหน้าส่วนล่าง (F2: $1) บ่งชี้ว่าคางสั้นเมื่อเทียบกับริมฝีปากบน");
  s = s.replace(/Middle-to-lower third ratio \(F1: ([^)]+)\) indicates lower face vertical deficit compared to midface\./g, "สัดส่วนใบหน้าส่วนกลางต่อส่วนล่าง (F1: $1) บ่งชี้ว่าใบหน้าส่วนล่างสั้นกว่าใบหน้าส่วนกลาง");
  s = s.replace(/Nasofrontal angle \(P1: ([^)]+)\) is acute, indicating deep nasal radix transition\./g, "มุมหัวตา-สันจมูก (P1: $1) แคบ โคนสันจมูกลึก");
  s = s.replace(/Nasofrontal angle \(P1: ([^)]+)\) is obtuse, indicating flattened nasal dorsum-forehead angle\./g, "มุมหัวตา-สันจมูก (P1: $1) ป้าน สันจมูกแบนเรียบ");
  s = s.replace(/Nasolabial angle \(P2: ([^)]+)\) is acute, indicating downward nasal tip rotation\./g, "มุมจมูก-ริมฝีปาก (P2: $1) แคบ ปลายจมูกงุ้มลง");
  s = s.replace(/Nasolabial angle \(P2: ([^)]+)\) is obtuse, indicating upward nasal tip rotation\./g, "มุมจมูก-ริมฝีปาก (P2: $1) กว้าง ปลายจมูกเชิดขึ้น");
  s = s.replace(/Nasal tip projection ratio \(P3a Goode: ([^)]+)\) is below reference range\./g, "ความพุ่งของปลายจมูกตามเกณฑ์ Goode (P3a: $1) ต่ำกว่าเกณฑ์มาตรฐาน");
  s = s.replace(/Nose tip projection \(P3a Goode: ([^)]+)\) is below classical reference\./g, "ความพุ่งของปลายจมูกตามเกณฑ์ Goode (P3a: $1) ต่ำกว่าเกณฑ์มาตรฐาน");
  s = s.replace(/Nose tip projection \(P3a Goode: ([^)]+)\) is above classical reference\./g, "ความพุ่งของปลายจมูกตามเกณฑ์ Goode (P3a: $1) สูงกว่าเกณฑ์มาตรฐาน");

  // Masseter Botox & Mandibular
  s = s.replace(
    /Gonial angle \(([^)]+)°\) indicates strong masseteric muscle attachment and square jaw pattern; botulinum toxin type A to masseter muscles can significantly reduce transverse lower face width\./g,
    "มุมกราม ($1°) บ่งชี้การยึดเกาะของกล้ามเนื้อกรามที่หนาตัวและใบหน้าทรงเหลี่ยม การฉีดโบท็อกซ์ลดขนาดกล้ามเนื้อกราม (Masseter Botox) จะช่วยลดความกว้างใบหน้าส่วนล่างได้อย่างมีประสิทธิภาพ"
  );
  s = s.replace(
    /Hypodivergent skeletal pattern \(FMA: ([^)]+)°\) indicates high masticatory muscle tone and masseter hypertrophy\./g,
    "โครงสร้างกระดูกหน้าสั้น (FMA: $1°) สัมพันธ์กับแรงบดเคี้ยวสูงและกล้ามเนื้อกรามหนาตัวผิดปกติ"
  );
  s = s.replace(
    /Vertical-to-bizygomatic facial ratio \(F10: ([^)]+)\) indicates transverse lower facial width dominance\./g,
    "อัตราส่วนความยาวใบหน้าต่อความกว้างโหนกแก้ม (F10: $1) บ่งชี้ความกว้างส่วนล่างที่เด่นชัด"
  );
  s = s.replace(
    /Middle-to-lower third ratio \(F1: ([^)]+)\) indicates wide, square lower facial morphology\./g,
    "สัดส่วนใบหน้าส่วนกลางต่อส่วนล่าง (F1: $1) บ่งชี้โครงสร้างใบหน้าส่วนล่างที่กว้างทรงเหลี่ยม"
  );
  s = s.replace(
    /Cephalometric gonial angle \(([^)]+)° < 115°\) indicates marked bony mandibular angle prominence; surgical mandibular angle ostectomy is indicated as bone flare cannot be resolved by neuromodulators alone\./g,
    "มุมกรามทางเซฟาโลเมตริกส์ ($1° < 115°) บ่งชี้กระดูกมุมกรามผายยื่นชัดเจน การผ่าตัดตัดแต่งมุมกรามมีข้อบ่งชี้เนื่องจากโครงสร้างกระดูกไม่สามารถลดขนาดได้ด้วยโบท็อกซ์"
  );
  s = s.replace(
    /Severe hypodivergent skeletal base \(FMA: ([^)]+)°\) with pronounced bony mandibular flare\./g,
    "โครงสร้างกระดูกหน้าสั้นระดับรุนแรง (FMA: $1°) ร่วมกับกระดูกขากรรไกรล่างหนาผายออกชัดเจน"
  );
  s = s.replace(
    /Very acute gonial angle \(([^)]+)°\) indicates severe bony mandibular angle prominence and square jaw deformity; ostectomy or contouring surgery provides definitive bony reduction\./g,
    "มุมกรามแคบมาก ($1°) บ่งชี้กระดูกมุมกรามผายยื่นชัดเจนจนเกิดรูปหน้าเหลี่ยม การผ่าตัดตัดแต่งมุมกรามจะช่วยลดขนาดกระดูกได้อย่างถาวร"
  );
  s = s.replace(
    /Marked hypodivergent pattern \(FMA: ([^)]+)°\) demonstrates thick bony mandibular base beyond muscular correction alone\./g,
    "โครงสร้างกระดูกขากรรไกรหนาตัวเด่นชัด (FMA: $1°) ซึ่งเกินกว่าการแก้ไขด้วยการฉีดโบท็อกซ์เพียงอย่างเดียว"
  );

  // Wrinkle Botox
  s = s.replace(
    /Upper facial third height \(F1: ([^)]+)\) indicates elevated frontalis dynamic strain and forehead line tendency\./g,
    "สัดส่วนความสูงใบหน้าส่วนบน (F1: $1) สัมพันธ์กับแรงดึงตัวของกล้ามเนื้อหน้าผาก (Frontalis) และแนวโน้มริ้วรอยแนวนอน"
  );
  s = s.replace(
    /Upper facial third proportion \(F1: ([^)]+)\) indicates dynamic frontalis muscular strain in forehead region\./g,
    "สัดส่วนใบหน้าส่วนบน (F1: $1) สัมพันธ์กับการทำงานหนักของกล้ามเนื้อหน้าผาก (Frontalis) ทำให้เกิดริ้วรอยแนวนอน"
  );
  s = s.replace(
    /Upper facial third \(F1: ([^)]+)\) is compressed, associated with persistent glabellar frown depressor hyperactivity\./g,
    "สัดส่วนใบหน้าส่วนบน (F1: $1) แคบ สัมพันธ์กับการทำงานหนักต่อเนื่องของกล้ามเนื้อขมวดคิ้ว (Glabellar frown depressor)"
  );
  s = s.replace(
    /Upper facial third proportion \(F1: ([^)]+)\) indicates corrugator supercilii hyperactivity with deep glabellar furrowing\./g,
    "สัดส่วนใบหน้าส่วนบน (F1: $1) สัมพันธ์กับการเกร็งตัวของกล้ามเนื้อหัวคิ้ว (Corrugator) ทำให้เกิดริ้วรอยขมวดคิ้วลึก"
  );
  s = s.replace(
    /Brow apex height asymmetry \(F11: ([^)]+)\) indicates uneven frontalis muscle contraction; micro-botulinum toxin can balance brow vectors\./g,
    "ระดับความสูงยอดคิ้วไม่สมมาตร (F11: $1) จากการหดเกร็งของกล้ามเนื้อหน้าผากไม่เท่ากัน การฉีดโบท็อกซ์ปรับสมดุลสามารถช่วยปรับระดับแนวคิ้วได้"
  );
  s = s.replace(
    /Brow apex vertical height asymmetry \(([^)]+)\) suggests differential frontalis\/orbicularis muscle tone\./g,
    "ระดับความสูงยอดคิ้วไม่สมมาตร ($1) จากความตึงตัวของกล้ามเนื้อสองข้างที่ไม่เท่ากัน"
  );
  s = s.replace(
    /Medial brow offset asymmetry \(F11: ([^)]+) %ICD\) reflects asymmetrical corrugator supercilii tone\./g,
    "ตำแหน่งหัวคิ้วสองข้างเหลื่อมล้ำ (F11: $1 %ICD) สะท้อนแรงดึงตัวของกล้ามเนื้อหัวคิ้ว (Corrugator) ที่ไม่เท่ากัน"
  );
  s = s.replace(
    /Brow medial head vertical offset \(([^)]+)px\) indicates asymmetric corrugator and depressor supercilii dynamic pull\./g,
    "ตำแหน่งหัวคิ้วสองข้างเหลื่อมล้ำ ($1px) จากแรงดึงของกล้ามเนื้อรอบคิ้วไม่เท่ากัน"
  );
  s = s.replace(
    /Posterior forehead inclination \(P5: ([^)]+)°\) promotes compensatory dynamic frontalis elevation rhytids\./g,
    "ความลาดเอียงของหน้าผากไปด้านหลัง (P5: $1°) กระตุ้นการยกกล้ามเนื้อหน้าผากชดเชยจนเกิดริ้วรอย"
  );
  s = s.replace(
    /Steep nasofrontal angle \(P1: ([^)]+)°\) with acute P5 \(([^)]+)°\) indicates prominent procerus furrowing\./g,
    "มุมหัวตาสันจมูก (P1: $1°) ร่วมกับมุมหัวคิ้ว (P5: $2°) บ่งชี้ริ้วรอยย่นสันจมูกจากกล้ามเนื้อ Procerus"
  );

  // HA Fillers (Nasolabial & Temple)
  s = s.replace(
    /Perioral soft tissue descent accentuates nasolabial crease deepening\./g,
    "การคล้อยตัวของเนื้อเยื่อรอบช่องปากส่งผลให้ร่องแก้มดูลึกและเด่นชัดขึ้น"
  );
  s = s.replace(
    /Deep nasolabial fold depth score \(([^)]+)%\) warrants structural deep-bolus hyaluronic acid filler\./g,
    "ร่องแก้มลึก ($1%) มีข้อบ่งชี้ในการฉีดฟิลเลอร์ไฮยาลูโรนิกแอซิดชั้นลึกเพื่อพยุงร่องแก้ม"
  );
  s = s.replace(
    /Midfacial structural laxity \(([^%]+)%\) contributes to medial fat pad descent over the nasolabial fold\./g,
    "ความหย่อนคล้อยของเนื้อเยื่อใบหน้าส่วนกลาง ($1%) ส่งผลให้ก้อนไขมันแก้มคล้อยตัวลงมาทับร่องแก้ม"
  );
  s = s.replace(
    /Midface soft-tissue laxity \(([^)]+)%\) with descending malar fat pad deepens nasolabial creases\./g,
    "ความหย่อนคล้อยของเนื้อเยื่อใบหน้าส่วนกลาง ($1%) ร่วมกับการคล้อยตัวของก้อนไขมันแก้มส่งผลให้ร่องแก้มดูลึกขึ้น"
  );
  s = s.replace(
    /Acute nasolabial angle \(P2: ([^)]+)°\) reflects deep pyriform aperture recession, benefiting from structural HA filler bolus\./g,
    "มุมจมูก-ริมฝีปาก (P2: $1°) แคบ สะท้อนการยุบตัวของฐานกระดูกข้างปีกจมูก (Pyriform) เหมาะกับการฉีดฟิลเลอร์หนุนกระดูกชั้นลึก"
  );
  s = s.replace(
    /Acute nasolabial angle \(P2: ([^)]+)°\) with alar crease depression indicates sub-alar pyriform aperture volume deficiency\./g,
    "มุมจมูก-ริมฝีปาก (P2: $1°) ร่วมกับรอยบุ๋มข้างปีกจมูก บ่งชี้การยุบตัวของกระดูกฐานปีกจมูก (Pyriform aperture)"
  );
  s = s.replace(
    /Cephalometric maxillary retrusion \(SNA: ([^)]+)°\) predisposes to deep paranasal hollows\./g,
    "กระดูกขากรรไกรบนถอยร่นตามเกณฑ์เซฟาโลเมตริกส์ (SNA: $1°) ทำให้เกิดรอยบุ๋มลึกข้างปีกจมูก"
  );
  s = s.replace(
    /Cephalometric maxillary retrusion indicates deficient skeletal pyriform support requiring deep structural filler boluses\./g,
    "กระดูกขากรรไกรบนถอยร่น ขาดแรงพยุงโครงสร้างฐานปีกจมูก เหมาะกับการฉีดฟิลเลอร์หนุนกระดูกชั้นลึก"
  );
  s = s.replace(
    /Temporal width in outer facial fifths \(F3: ([^)]+)\) falls below Neoclassical canon \(0\.200\), indicating temporal fossa hollowing\./g,
    "สัดส่วนความกว้างขมับใน 1 ใน 5 ของใบหน้า (F3: $1) ต่ำกว่าเกณฑ์มาตรฐาน (0.200) บ่งชี้ภาวะขมับตอบ"
  );
  s = s.replace(
    /Temporal outer fifths ratio \(F5: ([^)]+)\) indicates temporal hollowing and skeletonized upper lateral facial contour\./g,
    "สัดส่วนความกว้างขมับ (F5: $1) บ่งชี้ภาวะขมับตอบ เห็นแนวกระดูกขมับชัดเจน"
  );
  s = s.replace(
    /Bitemporal-to-bizygomatic width ratio \(([^)]+)\) indicates significant temporal hollowing \(peanut-shaped face contour\)\./g,
    "อัตราส่วนขมับต่อโหนกแก้ม ($1) บ่งชี้ขมับตอบชัดเจนจนเกิดรูปหน้าทรงผลถั่วลิสง (Peanut-shaped)"
  );
  s = s.replace(
    /Outer facial fifth asymmetry \(F11: ([^)]+)\) indicates uneven bitemporal soft-tissue volume\./g,
    "ความไม่สมมาตรของความกว้างขมับสองข้าง (F11: $1) บ่งชี้การยุบตัวของเนื้อเยื่อขมับที่ไม่เท่ากัน"
  );
  s = s.replace(
    /Bitemporal width asymmetry indicates uneven temporal fossa soft tissue atrophy\./g,
    "ความกว้างขมับซ้ายขวาไม่สมมาตร จากการฝ่อตัวของเนื้อเยื่อบริเวณขมับไม่เท่ากัน"
  );

  // Orthognathic Surgery
  s = s.replace(
    /Skeletal Class III malocclusion \(ANB: ([^,]+), Wits: ([^)]+)\) with prominent mandibular prognathism warrants multidisciplinary orthognathic surgery \(BSSO\/Le Fort I\) for definitive skeletal and occlusal correction\./g,
    "โครงสร้างกระดูกขากรรไกรล่างยื่นผิดรูป Skeletal Class III (ANB: $1, Wits: $2) มีข้อบ่งชี้การผ่าตัดเลื่อนขากรรไกร (BSSO/Le Fort I) ร่วมกับการจัดฟัน"
  );
  s = s.replace(
    /Severe Skeletal Class II malocclusion \(ANB: ([^,]+), Wits: ([^)]+)\) with mandibular retrognathia warrants bilateral sagittal split osteotomy \(BSSO\) mandibular advancement\./g,
    "โครงสร้างกระดูกขากรรไกรล่างถอยร่นรุนแรง Skeletal Class II (ANB: $1, Wits: $2) มีข้อบ่งชี้การผ่าตัดเลื่อนขากรรไกรล่างมาด้านหน้า (BSSO)"
  );

  // Sagging and laxity procedure rationales
  s = s.replace(
    /Early boundary structural laxity \(([^%]+)%\); preventive low-intensity focused ultrasound or RF may delay soft-tissue descent\./g,
    "เริ่มมีความหย่อนคล้อยระยะเริ่มต้น ($1%) การทำอัลตราซาวด์โฟกัสหรือคลื่นวิทยุ (HIFU/RF) พลังงานระดับเริ่มต้นเพื่อการป้องกัน สามารถช่วยชะลอการหย่อนคล้อยของเนื้อเยื่อได้"
  );
  s = s.replace(
    /Moderate structural laxity \(Tier (?:2|\d+), Laxity Score: ([^%]+)%\) is optimally indicated for High-Intensity Focused Ultrasound \(HIFU\/Ultherapy\) or Monopolar RF \(Thermage\) to stimulate deep collagen remodeling and SMAS fascial contraction without surgery\./g,
    "ความหย่อนคล้อยระดับปานกลาง (Tier 2, คะแนนความหย่อนคล้อย: $1%) มีข้อบ่งชี้เหมาะสมที่สุดในการทำคลื่นเสียงโฟกัสความเข้มข้นสูง (HIFU/Ultherapy) หรือคลื่นวิทยุขั้วเดี่ยว (Thermage) เพื่อกระตุ้นการสร้างคอลลาเจนใหม่ในชั้นลึกและหดกระชับชั้นพังผืด SMAS โดยไม่ต้องผ่าตัด"
  );
  s = s.replace(
    /Advanced structural laxity \(Tier (?:3|\d+), Laxity Score: ([^%]+)%\) receives moderate dermal tightening benefit from energy devices, but deep structural ptosis typically warrants surgical or suspension repositioning for definitive rejuvenation\./g,
    "ความหย่อนคล้อยระดับสูง (Tier 3, คะแนนความหย่อนคล้อย: $1%) การใช้คลื่นพลังงานช่วยฟื้นฟูผิวชั้นหนังแท้ได้ระดับปานกลาง แต่การหย่อนคล้อยของโครงสร้างชั้นลึกควรพิจารณาการร้อยไหมหรือศัลยกรรมผ่าตัดเพื่อผลลัพธ์ที่ชัดเจน"
  );
  s = s.replace(
    /Mild-to-moderate descent of malar and mandibular soft tissue \(Tier ([^,]+), Laxity: ([^%]+)%\) indicates absorbable barbed suspension threads \(PDO\/PLLA\) for mechanical repositioning of descending jowl and perioral tissue vectors\./g,
    "การคล้อยตัวระดับเล็กน้อยถึงปานกลางของเนื้อเยื่อโหนกแก้มและแนวกราม (Tier $1, ความหย่อนคล้อย: $2%) เหมาะสำหรับการร้อยไหมเงี่ยงละลาย (PDO/PLLA) เพื่อดึงพยุงและปรับตำแหน่งเนื้อเยื่อกระพุ้งแก้มและรอบมุมปาก"
  );
  s = s.replace(
    /Advanced tissue laxity \(Tier (?:3|\d+), Laxity: ([^%]+)%\) provides moderate indication for thread lifting as a minimally invasive vector-lifting alternative when surgical rhytidectomy is contraindicated or declined\./g,
    "ความหย่อนคล้อยระดับสูง (Tier 3, ความหย่อนคล้อย: $1%) เป็นข้อบ่งชี้ระดับปานกลางสำหรับการร้อยไหมยกกระชับ ในกรณีที่ต้องการทางเลือกแบบบาดเจ็บน้อยหรือยังไม่พร้อมสำหรับการผ่าตัดดึงหน้า"
  );
  s = s.replace(
    /Advanced morphological structural laxity \(Tier (?:3|\d+), Laxity Score: ([^%]+)%\) warrants surgical SMAS or deep-plane rhytidectomy with platysmaplasty for definitive anatomical repositioning and redundant skin envelope excision\./g,
    "ความหย่อนคล้อยเชิงโครงสร้างระดับสูง (Tier 3, คะแนนความหย่อนคล้อย: $1%) เหมาะสำหรับการผ่าตัดดึงหน้าชั้น SMAS หรือ Deep-Plane ร่วมกับการเย็บกระชับกล้ามเนื้อคอ เพื่อปรับตำแหน่งโครงสร้างทางกายวิภาคและตัดผิวหนังส่วนเกินอย่างถาวร"
  );

  return s;
}

export function ProcedureRecommendationCard({
  recommendations,
  onOpenSimulation,
  filterNonRecommended = false,
  excludeStructural = false,
}: Props) {
  const [selectedDiagramRec, setSelectedDiagramRec] = useState<ProcedureRecommendation | null>(null);

  if (!recommendations) return null;
  if (recommendations.length === 0 && !filterNonRecommended) return null;

  // Filter 0% non-recommended items if filterNonRecommended is enabled
  let displayed = filterNonRecommended
    ? recommendations.filter((r) => r && r.intensity > 0)
    : recommendations;

  // Filter out sagittal/structural procedures (chin & nose) when viewing frontal scan
  if (excludeStructural) {
    displayed = displayed.filter(
      (r) => r && r.procedure !== "chin_augmentation" && r.procedure !== "rhinoplasty"
    );
  }

  // Sort descending by recommendation intensity / priority percentage
  const sorted = [...displayed].sort((a, b) => b.intensity - a.intensity);

  return (
    <div
      id="procedure-recommendations"
      className="border border-line bg-surface p-4 overflow-hidden break-words"
    >
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent" />
          <div>
            <h3 className="text-sm font-semibold text-ink">
              ข้อเสนอแนะหัตถการความงาม
            </h3>
            <p className="text-sm text-ink-2">
              {excludeStructural
                ? "ประเมินและเรียงลำดับหัตถการผิวพรรณ กล้ามเนื้อ และความกระชับจากภาพหน้าตรง"
                : "ประเมินและเรียงลำดับเฉพาะหัตถการที่มีข้อบ่งชี้ตามสัดส่วนใบหน้า โครงสร้างกระดูก และความกระชับ"}
            </p>
          </div>
        </div>
        <span className="border border-line bg-paper px-2 py-1 text-sm text-ink-2">
          Clinical Assessment
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="mt-4 flex items-start gap-3 border border-emerald-500/20 bg-emerald-500/10 p-4 rounded-control">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-1" />
          <div>
            <h4 className="text-sm font-semibold text-emerald-600">
              สัดส่วนใบหน้าทุกมิติอยู่ในเกณฑ์สมดุล
            </h4>
            <p className="mt-1 text-sm text-ink-2">
              จากการวิเคราะห์สัดส่วนใบหน้า โครงสร้างกระดูก และความกระชับของผิว ทุกมิติอยู่ในเกณฑ์มาตรฐานความงามคลินิก ไม่พบจุดที่จำเป็นต้องได้รับการปรับแต่งหรือทำหัตถการทางการแพทย์ในขณะนี้ แนะนำการดูแลบำรุงผิวตามปกติเพื่อคงความอ่อนเยาว์ในระยะยาว
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {sorted.map((rec) => {
            const defaultTitle = PROCEDURE_TITLES[rec.procedure] ?? rec.procedure;
            const specificAction = getSpecificAction(rec);
            const pct = Math.round(rec.intensity * 100);
            const isRecommended = rec.intensity > 0;
            const areaKey = rec.area || DEFAULT_PROCEDURE_AREAS[rec.procedure] || "face";
            const areaInfo = FACIAL_AREAS[areaKey];
            const catKey = rec.action_type || DEFAULT_PROCEDURE_CATEGORIES[rec.procedure] || "surgical";
            const categoryInfo = CATEGORY_TAGS[catKey];
            const priorityInfo = getPriorityTag(rec.intensity);

            return (
              <div key={rec.procedure} className="border border-line bg-paper p-3 overflow-hidden break-words">
                {/* Header Row: Area Badge, Category Tag, Priority Tag & Intensity % */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
                  <div className="flex flex-wrap items-center gap-1">
                    {areaInfo && (
                      <span className={`border px-2 py-1 text-sm font-medium rounded-control ${areaInfo.badgeClass}`}>
                        {areaInfo.label}
                      </span>
                    )}
                    {categoryInfo && (
                      <span className={`border px-2 py-1 text-sm font-medium rounded-control ${categoryInfo.badgeClass}`}>
                        {categoryInfo.label}
                      </span>
                    )}
                    {isRecommended && (
                      <span className={`border px-2 py-1 text-sm font-semibold rounded-control ${priorityInfo.badgeClass}`}>
                        {priorityInfo.label}
                      </span>
                    )}
                  </div>
                  <span
                    className={
                        isRecommended
                          ? "text-sm font-semibold text-accent"
                          : "text-sm font-semibold text-ink-3"
                    }
                  >
                    {isRecommended ? `แนะนำระดับ ${pct}%` : "สัดส่วนสมดุล (0%)"}
                  </span>
                </div>

                {/* Specific Action Title & Reference Subtitle */}
                <div className="mt-2">
                  {isRecommended && (specificAction || rec.title_th) ? (
                    <div>
                      <div className="text-base font-semibold text-ink">
                        {specificAction || rec.title_th}
                      </div>
                      <div className="mt-1 text-sm text-ink-3">
                        หัตถการอ้างอิง: <span className="font-semibold text-ink-2">{defaultTitle}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm font-semibold text-ink">{defaultTitle}</span>
                  )}
                </div>

                {isRecommended && (
                  <div className="mt-2 h-2 w-full bg-line overflow-hidden rounded-control">
                    <div
                      className="h-2 bg-accent transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                    />
                  </div>
                )}

                <p className="mt-2 text-sm text-ink-2">
                  {translateRationale(rec.rationale)}
                </p>

                {(rec.triggering_metrics ?? []).length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <span className="text-sm text-ink-3">เกณฑ์ที่เกี่ยวข้อง:</span>
                    {(rec.triggering_metrics ?? []).map((m) => (
                      <span
                        key={m}
                        className="border border-line bg-surface px-2 py-1 text-sm text-ink-2 rounded-control"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                )}

                {/* Clinical Line Art Vector Diagram Thumbnail */}
                {isRecommended && (
                  <ProcedureDiagramThumbnail
                    procedure={rec.procedure}
                    title={specificAction || rec.title_th || defaultTitle}
                    onExpand={() => setSelectedDiagramRec(rec)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Clinical Diagram Expanded Inspection Modal */}
      <ProcedureDiagramModal
        open={Boolean(selectedDiagramRec)}
        onOpenChange={(open) => {
          if (!open) setSelectedDiagramRec(null);
        }}
        recommendation={selectedDiagramRec}
        defaultTitle={
          selectedDiagramRec
            ? (PROCEDURE_TITLES[selectedDiagramRec.procedure] ?? selectedDiagramRec.procedure)
            : ""
        }
        specificAction={selectedDiagramRec ? getSpecificAction(selectedDiagramRec) : null}
        areaLabel={
          selectedDiagramRec
            ? (FACIAL_AREAS[selectedDiagramRec.area || DEFAULT_PROCEDURE_AREAS[selectedDiagramRec.procedure] || "face"]?.label ?? "")
            : ""
        }
        categoryLabel={
          selectedDiagramRec
            ? (CATEGORY_TAGS[selectedDiagramRec.action_type || DEFAULT_PROCEDURE_CATEGORIES[selectedDiagramRec.procedure] || "surgical"]?.label ?? "")
            : ""
        }
      />

      {onOpenSimulation && (
        <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-t border-line pt-3">
          <p className="text-sm text-ink-2">
            ทดลองจำลองการปรับแต่งรูปทรงใบหน้าตามสัดส่วนที่แนะนำ
          </p>
          <Button variant="secondary" onClick={onOpenSimulation}>
            <Sliders size={16} className="text-accent" />
            <span>เปิดหน้าต่างจำลองผลลัพธ์หัตถการ</span>
          </Button>
        </div>
      )}
    </div>
  );
}
