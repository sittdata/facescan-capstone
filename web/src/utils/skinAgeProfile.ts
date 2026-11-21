export type CollagenPhaseId =
  | "peak_collagen"
  | "preventive_preaging"
  | "structural_maturation"
  | "deep_restorative";

export interface CollagenPhaseInfo {
  phase: number;
  id: CollagenPhaseId;
  nameTh: string;
  nameEn: string;
  stageTh: string;
  stageEn: string;
  ageBracketTh: string;
  ageBracketEn: string;
  characteristicsTh: string;
  characteristicsEn: string;
  preventiveFocusTh: string;
  preventiveFocusEn: string;
  badgeClass: string;
  barColor: string;
}

export interface VitalityStatusTag {
  labelTh: string;
  labelEn: string;
  variant: "healthy" | "preventive" | "warning" | "alert";
  badgeClass: string;
}

export interface FirmnessCorrelation {
  tier: number;
  tierName: string;
  labelTh: string;
  descriptionTh: string;
}

export interface AnatomicalSexStandard {
  standardTitleTh: string;
  standardTitleEn: string;
  sexLabelTh: string;
  sexLabelEn: string;
  clinicalContextTh: string;
  clinicalContextEn: string;
  confidencePercent: number;
}

export interface SkinVitalityProfile {
  estimatedAge: number;
  formattedAge: string;
  ageSd?: number;
  formattedAgeSd?: string;
  ageRangeText: string;
  spectrumPercentage: number;
  phase: CollagenPhaseInfo;
  statusTag: VitalityStatusTag;
  firmnessCorrelation?: FirmnessCorrelation;
}

export const COLLAGEN_PHASES: Record<CollagenPhaseId, CollagenPhaseInfo> = {
  peak_collagen: {
    phase: 1,
    id: "peak_collagen",
    nameTh: "Phase 1: Peak Collagen Phase",
    nameEn: "Phase 1: Peak Collagen Phase",
    stageTh: "ระยะความสมบูรณ์คอลลาเจนสูงสุด",
    stageEn: "Peak Collagen Density & Elasticity",
    ageBracketTh: "< 25 ปี",
    ageBracketEn: "< 25 yrs",
    characteristicsTh:
      "ชั้นคอลลาเจนและอิลาสตินหนาแน่นเต็มที่ เซลล์ผิวฟื้นฟูตัวเองได้รวดเร็ว ความยืดหยุ่นและความชุ่มชื้นอยู่ในเกณฑ์สูงสุด",
    characteristicsEn:
      "High collagen density and elastin structural integrity, optimal cellular turnover, and maximal skin elasticity.",
    preventiveFocusTh:
      "เน้นการปกป้องเกราะป้องกันผิว (Skin Barrier) และทากันแดดสม่ำเสมอเพื่อคงความหนาแน่นของคอลลาเจนตามธรรมชาติ",
    preventiveFocusEn:
      "Focus on photoprotection and barrier maintenance to preserve natural collagen reserve.",
    badgeClass: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
    barColor: "#10b981",
  },
  preventive_preaging: {
    phase: 2,
    id: "preventive_preaging",
    nameTh: "Phase 2: Preventive Pre-aging Phase",
    nameEn: "Phase 2: Preventive Pre-aging Phase",
    stageTh: "ระยะเริ่มชะลอวัยเชิงป้องกัน",
    stageEn: "Preventive Pre-aging Phase",
    ageBracketTh: "25 - 34 ปี",
    ageBracketEn: "25 - 34 yrs",
    characteristicsTh:
      "การสร้างคอลลาเจนเริ่มลดลงเฉลี่ยปีละ ~1% เส้นใยอิลาสตินเริ่มคลายตัว ริ้วรอยแรกเริ่ม (Fine Lines) อาจปรากฏรอบดวงตาและร่องแก้มเมื่อแสดงอารมณ์",
    characteristicsEn:
      "Collagen synthesis declines by ~1% annually. Early fine lines and minor micro-expression creases may begin to manifest.",
    preventiveFocusTh:
      "เริ่มต้นใช้สารต้านอนุมูลอิสระ (Antioxidants) เสริมคอลลาเจน และเริ่มทำหัตถการกระตุ้นผิวชั้นตื้นเพื่อชะลอริ้วรอยแรกเริ่ม",
    preventiveFocusEn:
      "Incorporate active antioxidants, topical retinoids, and preventive non-invasive collagen stimulation.",
    badgeClass: "border border-accent/30 bg-accent/10 text-accent",
    barColor: "#1c64c4",
  },
  structural_maturation: {
    phase: 3,
    id: "structural_maturation",
    nameTh: "Phase 3: Structural Maturation Phase",
    nameEn: "Phase 3: Structural Maturation Phase",
    stageTh: "ระยะการเปลี่ยนแปลงเชิงโครงสร้าง",
    stageEn: "Structural Maturation Phase",
    ageBracketTh: "35 - 44 ปี",
    ageBracketEn: "35 - 44 yrs",
    characteristicsTh:
      "ชั้นไขมันใต้ผิว (Fat Pads) เริ่มฝ่อตัวและเคลื่อนตัวลง เส้นใยพังผืดยึดผิวหย่อนยาน เกิดร่องลึกและความหย่อนคล้อยระดับปานกลางบริเวณแนวกรามและร่องแก้ม",
    characteristicsEn:
      "Gradual depletion of fat pads, weakening of retaining ligaments, and visible midface descent.",
    preventiveFocusTh:
      "เน้นการยกกระชับโครงสร้างผิวชั้นลึก (SMAS Lifting เช่น HIFU/Ultherapy) ร่วมกับการเติมเต็มปริมาตรผิวที่สูญเสีย (Volume Restoration)",
    preventiveFocusEn:
      "Deep tissue tightening targeting SMAS layer alongside strategic volume replacement and structural recontouring.",
    badgeClass: "border border-amber-500/30 bg-amber-500/10 text-amber-600",
    barColor: "#f59e0b",
  },
  deep_restorative: {
    phase: 4,
    id: "deep_restorative",
    nameTh: "Phase 4: Deep Restorative Phase",
    nameEn: "Phase 4: Deep Restorative Phase",
    stageTh: "ระยะฟื้นฟูโครงสร้างเชิงลึก",
    stageEn: "Deep Restorative Phase",
    ageBracketTh: "45 ปีขึ้นไป",
    ageBracketEn: "45+ yrs",
    characteristicsTh:
      "โครงสร้างผิวชั้นลึก (SMAS) และกระดูกเบ้าตา/แนวกรามเริ่มทรุดตัว ผิวสูญเสียความหนาแน่นและคอลลาเจนอย่างมีนัยสำคัญ เกิดความหย่อนคล้อยชัดเจน",
    characteristicsEn:
      "Significant loss of dermal density, bone remodeling at orbital/mandibular margins, and pronounced soft-tissue laxity.",
    preventiveFocusTh:
      "ฟื้นฟูโครงสร้างหลายระดับ (Multimodal Restoration) ร่วมกันระหว่างการยกกระชับชั้นลึกและการเติมเต็มปริมาตรผิว",
    preventiveFocusEn:
      "Multimodal structural approach combining deep-plane tightening with targeted volume replenishment.",
    badgeClass: "border border-rose-500/30 bg-rose-500/10 text-rose-600",
    barColor: "#f43f5e",
  },
};

export function getCollagenPhase(age: number): CollagenPhaseInfo {
  if (age < 25) {
    return COLLAGEN_PHASES.peak_collagen;
  }
  if (age < 35) {
    return COLLAGEN_PHASES.preventive_preaging;
  }
  if (age < 45) {
    return COLLAGEN_PHASES.structural_maturation;
  }
  return COLLAGEN_PHASES.deep_restorative;
}

export function calculateSpectrumPercentage(age: number): number {
  if (!Number.isFinite(age)) return 50;
  let pct: number;
  if (age <= 18) {
    pct = 0;
  } else if (age < 25) {
    pct = ((age - 18) / (25 - 18)) * 25;
  } else if (age < 35) {
    pct = 25 + ((age - 25) / (35 - 25)) * 25;
  } else if (age < 45) {
    pct = 50 + ((age - 35) / (45 - 35)) * 25;
  } else if (age < 65) {
    pct = 75 + ((age - 45) / (65 - 45)) * 25;
  } else {
    pct = 100;
  }
  return Math.min(100, Math.max(0, Math.round(pct * 10) / 10));
}

export function getAnatomicalSexStandard(
  sex: "female" | "male" | "unspecified",
  confidence: number
): AnatomicalSexStandard {
  const conf = Math.max(0, Math.min(1, Number.isFinite(confidence) ? confidence : 0));
  const confidencePercent = Math.round(conf * 100);

  if (sex === "female") {
    return {
      standardTitleTh: "เกณฑ์สรีรวิทยากายวิภาคเพศหญิง",
      standardTitleEn: "Female Reference Standard",
      sexLabelTh: "เพศหญิง",
      sexLabelEn: "Female Reference",
      clinicalContextTh:
        "ใช้อ้างอิงอัตราส่วน Golden Ratio สากล แนวกระดูกกรามมนโค้ง ความนุ่มนวลของพวงแก้ม และความกลมกลืนของสัดส่วนใบหน้าแบบสตรี",
      clinicalContextEn:
        "Calibrated against female cranial benchmarks: softer mandibular angle, delicate zygomatic projection, and curved facial transition.",
      confidencePercent,
    };
  }

  if (sex === "male") {
    return {
      standardTitleTh: "เกณฑ์สรีรวิทยากายวิภาคเพศชาย",
      standardTitleEn: "Male Reference Standard",
      sexLabelTh: "เพศชาย",
      sexLabelEn: "Male Reference",
      clinicalContextTh:
        "ใช้อ้างอิงมุมกรอบหน้า (Gonial Angle) ที่คมชัด แนวกระดูกคางที่ได้รูป และความหนาแน่นของโครงสร้างกล้ามเนื้อใบหน้าตามเกณฑ์บุรุษ",
      clinicalContextEn:
        "Calibrated against male cranial benchmarks: pronounced gonial angle, squared chin base, and defined mandibular ramus contour.",
      confidencePercent,
    };
  }

  return {
    standardTitleTh: "เกณฑ์สรีรวิทยากลาง",
    standardTitleEn: "Neutral Reference Standard",
    sexLabelTh: "เกณฑ์มาตรฐานกลาง",
    sexLabelEn: "Neutral Standard",
    clinicalContextTh:
      "ใช้อ้างอิงสัดส่วนมาตรฐานความสมดุลใบหน้า (Facial Proportions) ตามค่าเฉลี่ยประชากรทั่วไปโดยไม่จำกัดเพศ",
    clinicalContextEn:
      "Calibrated against universal facial balance and golden proportion averages without gender-specific baseline bias.",
    confidencePercent,
  };
}

export function getSkinVitalityProfile(
  predictedAge: number,
  ageSd?: number,
  saggingTier?: number
): SkinVitalityProfile {
  const safeAge = Math.max(1, Number.isFinite(predictedAge) ? predictedAge : 25);
  const phase = getCollagenPhase(safeAge);
  const spectrumPercentage = calculateSpectrumPercentage(safeAge);

  const formattedAgeSd =
    ageSd !== undefined && Number.isFinite(ageSd) && ageSd > 0
      ? ageSd.toFixed(1)
      : undefined;

  // Age range text calculation
  let ageRangeText: string;
  if (ageSd && ageSd > 0) {
    const minAge = Math.max(1, Math.round(safeAge - ageSd));
    let maxAge = Math.round(safeAge + ageSd);
    if (minAge >= maxAge) {
      maxAge = minAge + 1;
    }
    ageRangeText = `${minAge} - ${maxAge} ปี`;
  } else {
    const minAge = Math.max(1, Math.round(safeAge - 2));
    let maxAge = Math.round(safeAge + 2);
    if (minAge >= maxAge) {
      maxAge = minAge + 1;
    }
    ageRangeText = `${minAge} - ${maxAge} ปี`;
  }

  // Correlate status tag & tissue firmness
  let statusTag: VitalityStatusTag;
  let firmnessCorrelation: FirmnessCorrelation | undefined;

  if (saggingTier === 1) {
    if (safeAge < 25) {
      statusTag = {
        labelTh: "อ่อนเยาว์สมวัย",
        labelEn: "Youthful Vitality",
        variant: "healthy",
        badgeClass: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
      };
    } else if (safeAge < 35) {
      statusTag = {
        labelTh: "ผิวพรรณกระชับเต่งตึง",
        labelEn: "Firm & Youthful",
        variant: "healthy",
        badgeClass: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
      };
    } else if (safeAge < 45) {
      statusTag = {
        labelTh: "ผิวกระชับกว่าเกณฑ์วัย",
        labelEn: "Well-preserved Firmness",
        variant: "healthy",
        badgeClass: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
      };
    } else {
      statusTag = {
        labelTh: "ผิวพรรณกระชับกว่าวัย",
        labelEn: "Remarkable Firmness",
        variant: "healthy",
        badgeClass: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
      };
    }
    firmnessCorrelation = {
      tier: 1,
      tierName: "Firm",
      labelTh: "ความกระชับสูง",
      descriptionTh: "โครงสร้างเนื้อเยื่อและผิวพรรณมีความกระชับสูง สอดคล้องกับความยืดหยุ่นที่ดี",
    };
  } else if (saggingTier === 2) {
    if (safeAge < 25) {
      statusTag = {
        labelTh: "เริ่มหย่อนคล้อยก่อนวัย",
        labelEn: "Early Tissue Laxity",
        variant: "warning",
        badgeClass: "border border-amber-500/30 bg-amber-500/10 text-amber-600",
      };
    } else {
      statusTag = {
        labelTh: "เริ่มหย่อนคล้อยตามวัย",
        labelEn: "Moderate Maturation",
        variant: "warning",
        badgeClass: "border border-amber-500/30 bg-amber-500/10 text-amber-600",
      };
    }
    firmnessCorrelation = {
      tier: 2,
      tierName: "Moderate",
      labelTh: "หย่อนคล้อยปานกลาง",
      descriptionTh: "เนื้อเยื่อเริ่มคลายตัวระดับปานกลางตามวัฏจักรคอลลาเจน ควรดูแลเชิงป้องกัน",
    };
  } else if (saggingTier === 3) {
    if (safeAge < 35) {
      statusTag = {
        labelTh: "หย่อนคล้อยเร็วกว่าเกณฑ์วัย",
        labelEn: "Accelerated Laxity",
        variant: "alert",
        badgeClass: "border border-rose-500/30 bg-rose-500/10 text-rose-600",
      };
    } else {
      statusTag = {
        labelTh: "ต้องการการฟื้นฟูโครงสร้าง",
        labelEn: "Restorative Need",
        variant: "alert",
        badgeClass: "border border-rose-500/30 bg-rose-500/10 text-rose-600",
      };
    }
    firmnessCorrelation = {
      tier: 3,
      tierName: "Advanced",
      labelTh: "หย่อนคล้อยชัดเจน",
      descriptionTh: "เนื้อเยื่อและผิวชั้นลึกมีความหย่อนคล้อยชัดเจน เหมาะกับการฟื้นฟูโครงสร้าง",
    };
  } else {
    // Age-based default vitality tag if saggingTier not provided
    if (safeAge < 25) {
      statusTag = {
        labelTh: "อ่อนเยาว์สมวัย",
        labelEn: "Youthful Vitality",
        variant: "healthy",
        badgeClass: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
      };
    } else if (safeAge < 35) {
      statusTag = {
        labelTh: "เริ่มชะลอวัยเชิงป้องกัน",
        labelEn: "Preventive Vitality",
        variant: "preventive",
        badgeClass: "border border-accent/30 bg-accent/10 text-accent",
      };
    } else if (safeAge < 45) {
      statusTag = {
        labelTh: "เริ่มเปลี่ยนแปลงตามวัย",
        labelEn: "Early Maturation",
        variant: "warning",
        badgeClass: "border border-amber-500/30 bg-amber-500/10 text-amber-600",
      };
    } else {
      statusTag = {
        labelTh: "ต้องการการฟื้นฟูโครงสร้าง",
        labelEn: "Restorative Focus",
        variant: "alert",
        badgeClass: "border border-rose-500/30 bg-rose-500/10 text-rose-600",
      };
    }
  }

  return {
    estimatedAge: safeAge,
    formattedAge: safeAge.toFixed(1),
    ageSd,
    formattedAgeSd,
    ageRangeText,
    spectrumPercentage,
    phase,
    statusTag,
    firmnessCorrelation,
  };
}
