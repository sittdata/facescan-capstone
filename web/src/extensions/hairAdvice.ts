import type { Result } from "../api/schemas";

export type Gender = "female" | "male";

export interface HairRecommendation {
  key: string;
  name: string;
  description: string;
  benefit: string;
  category: "hair" | "beard";
  image: string;
  barberInstructions: string;
}

export interface HairAdviceProfile {
  gender: Gender;
  features: {
    vertical: {
      type: "elongated" | "balanced" | "compact";
      label: string;
      description: string;
      ratio: number;
    };
    forehead: {
      type: "high" | "balanced" | "short";
      label: string;
      description: string;
      fraction: number;
    };
    jawline: {
      type: "prominent_angular" | "tapered_v" | "soft_rounded";
      label: string;
      description: string;
    };
  };
  opticalPrinciples: {
    volumePlacement: string;
    partingTechnique: string;
    contourFocus: string;
  };
  recommendations: HairRecommendation[];
  avoidStyles: Array<{
    name: string;
    reason: string;
  }>;
  eyewear: {
    shapes: string[];
    tip: string;
  };
}

export const STYLE_CATALOG: Record<string, {
  name: string;
  description: string;
  benefit: string;
  category: "hair" | "beard";
  image: string;
  barberInstructions: string;
}> = {
  // Men's Haircuts
  comma_hair: {
    name: "ทรงคอมม่าเปิดหน้าผาก (Comma Hair / Textured Side Swept)",
    description: "เซ็ตผมแสกข้าง 60:40 ปลายผมโค้งเข้าหากึ่งกลางหน้าผาก",
    benefit: "สร้างเส้นสายนำสายตาที่ดูทันสมัยและมีมิติสมดุล",
    category: "hair",
    image: "/hairstyles/comma_hair.webp",
    barberInstructions: "ตัดทรง Two-block หรือ Drop Cut ไถข้าง Low Taper ไว้ผมด้านบนยาวประมาณ 8-10 ซม. สำหรับดัดหรือเซ็ตปลายม้วนเข้าแบบคอมม่า",
  },
  slick_back: {
    name: "ทรงสลิคแบ็คและอันเดอร์คัทคลาสสิก (Slick Back Undercut)",
    description: "หวีเสยเรียบหรือเซ็ตด้านบนตามแนวผม ไถข้างระดับกลาง (Mid Fade)",
    benefit: "โชว์แนวกรามและสัดส่วนหน้าที่สมดุลได้อย่างโดดเด่น",
    category: "hair",
    image: "/hairstyles/slick_back.webp",
    barberInstructions: "ตัด Undercut หรือ Mid Fade เบอร์ 2 ด้านบนยาวประมาณ 10-12 ซม. สไลด์ปลายเพื่อหวีเสยเรียบไปด้านหลัง",
  },
  modern_crew: {
    name: "ทรงครูว์คัตทันสมัย (Modern Crew Cut)",
    description: "ตัดสั้นสบาย ดูแลง่าย ด้านบนยาวกว่าด้านข้างเล็กน้อย",
    benefit: "เสริมบุคลิกทะมัดทะแมง ขับเน้นโครงสร้างหน้าแบบ Masculine",
    category: "hair",
    image: "/hairstyles/modern_crew.webp",
    barberInstructions: "ตัด Modern Crew Cut ไถข้าง Taper Fade เบอร์ 1.5 ด้านบนยาว 3.5 ซม. ซอย Point Cut ให้มีเท็กซ์เจอร์",
  },
  pompadour_quiff: {
    name: "ทรงปอมปาดัวร์และควิฟยกสูง (Pompadour / High Quiff)",
    description: "เซ็ตผมด้านบนให้ตั้งยกโคนสูง ปัดเสยไปด้านหลัง",
    benefit: "เพิ่มความสูงและมิติแนวดิ่งอย่างเห็นได้ชัด ทำให้โครงหน้าดูยาวคมขึ้น",
    category: "hair",
    image: "/hairstyles/pompadour_quiff.webp",
    barberInstructions: "ตัด Taper Fade ด้านข้าง ด้านบนด้านหน้ายาวประมาณ 7-9 ซม. ไล่สั้นลงไปทางด้านหลัง เซ็ตยกโคนไดร์ลมร้อน",
  },
  french_crop: {
    name: "ทรงเท็กซ์เจอร์ครอปมีหน้าม้า (Textured French Crop)",
    description: "ซอยผมด้านบนเป็นเลเยอร์ มีหน้าม้าสั้นปรกหน้าผาก ไถข้างแบบ Taper ต่ำ",
    benefit: "หน้าม้าช่วยตัดทอนความยาวหน้าผาก และไม่ทำให้หน้าดูยาวเกินไป",
    category: "hair",
    image: "/hairstyles/french_crop.webp",
    barberInstructions: "ตัด Textured French Crop ไถข้าง Low Fade หน้าม้าตัดตรงสั้นเหนือคิ้ว ซอยด้านบนให้แตกเป็นช่อมีมิติ",
  },
  // Men's Facial Hair Grooming
  chin_goatee: {
    name: "เคราแพะเรียวปลายคาง (Tailored Goatee)",
    description: "ไว้หนวดและเคราเฉพาะปลายคาง โกนแก้มสองข้างให้เกลี้ยงเกลา",
    benefit: "เพิ่มมิติความยาวแนวดิ่งให้ปลายคาง ช่วยให้คางที่สั้นหรือถอยดูยาวและได้สัดส่วน V-Shape ขึ้น",
    category: "beard",
    image: "/hairstyles/chin_goatee.webp",
    barberInstructions: "โกนแก้มและแนวกรามให้เกลี้ยง เล็มหนวดและเคราปลายคางเป็นทรงสามเหลี่ยมคว่ำ ความยาวประมาณ 8-12 มม. แต่งขอบให้คมชัด",
  },
  stubble_jawline: {
    name: "เคราตอสั้นแต่งขอบกราม (Crisp Stubble)",
    description: "ไว้ตอเคราสั้นความยาว 2-3 มม. ตัดแต่งขอบแก้มและลำคอให้คมชัด",
    benefit: "เน้นขอบกรามให้คมชัด พรางแก้มอิ่มหรือเหนียงใต้คาง ขับเน้นบุคลิกแข็งแกร่ง",
    category: "beard",
    image: "/hairstyles/stubble_jawline.webp",
    barberInstructions: "ใช้ปัตตาเลี่ยนเบอร์ 1 (ประมาณ 2-3 มม.) ไถทั่วแนวกรามและคาง กันขอบแก้มเป็นเส้นตรงเฉียงลงมาระดับมุมปาก โกนส่วนลำคอออกทั้งหมด",
  },
  clean_shave: {
    name: "โกนเกลี้ยงเปิดกรอบหน้า (Clean Shaven)",
    description: "โกนหนวดเคราเกลี้ยงเกลา ผิวสะอาดเนียนเรียบ",
    benefit: "เปิดโชว์แนวกรามและสัดส่วนใบหน้าที่สมดุลตามธรรมชาติอย่างเต็มที่",
    category: "beard",
    image: "/hairstyles/clean_shave.webp",
    barberInstructions: "โกนเกลี้ยงด้วยมีดโกนสะบัดหนัง ดูแลผิวหลังโกนด้วย Aftershave Balm เพื่อลดการระคายเคือง",
  },
  // Women's Styles
  curtain_bangs: {
    name: "หน้าม้าซีทรูสไตล์เกาหลี (Curtain Bangs & Soft Layers)",
    description: "หน้าม้าบางโปร่งแบ่งกึ่งกลาง สไลด์เชื่อมต่อกับผมข้างแก้ม",
    benefit: "ช่วยลดทอนความสูงของหน้าผากและตัดความยาวใบหน้าได้อย่างเป็นธรรมชาติ",
    category: "hair",
    image: "/hairstyles/curtain_bangs.webp",
    barberInstructions: "ตัดหน้าม้าซีทรูแสกกลาง ความยาวระดับปลายจมูก สไลด์เฉียงเชื่อมต่อกับปอยผมข้างแก้ม",
  },
  long_layers: {
    name: "ผมยาวสไลด์เลเยอร์ล้อมกรอบหน้า (Long Face-Framing Layers)",
    description: "สไลด์ปลายผมระดับไหปลาร้า ปล่อยผมทิ้งตัวล้อมแก้ม",
    benefit: "ช่วยอำพรางความกลมข้างแก้มและดึงสายตาให้ใบหน้าดูเรียวยาวขึ้น",
    category: "hair",
    image: "/hairstyles/long_layers.webp",
    barberInstructions: "สไลด์เลเยอร์ระดับไหปลาร้า ไล่ระดับปลายผมให้ทิ้งตัวเข้าหากรอบหน้า ลดความหนาช่วงปลายเพื่อความพลิ้วไหว",
  },
  collarbone_lob: {
    name: "บ็อบเทระดับไหปลาร้า (Long Asymmetrical Lob)",
    description: "ผมบ็อบยาวประบ่า ด้านหน้ายาวกว่าด้านหลังเล็กน้อย",
    benefit: "เส้นนำสายตาเฉียงของผมบ็อบเทช่วยตัดทอนความโค้งมนของกรอบหน้า",
    category: "hair",
    image: "/hairstyles/collarbone_lob.webp",
    barberInstructions: "ตัดผมบ็อบยาวประบ่า ด้านหน้ายาวเทกว่าด้านหลังเล็กน้อย สไลด์ปลายผมบางเบา",
  },
  soft_waves: {
    name: "ลอนคลื่นธรรมชาติแสกข้าง (Natural Soft Waves)",
    description: "ผมยาวประบ่าหรือยาวกลางหลัง ดัดลอนคลายให้ทิ้งตัวพลิ้วไหว",
    benefit: "ขับเน้นสัดส่วนที่สมดุล และช่วยให้ลุคดูละมุนสง่างาม",
    category: "hair",
    image: "/hairstyles/soft_waves.webp",
    barberInstructions: "ซอยเลเยอร์ระดับกลาง สไลด์ปลายผมให้พลิ้ว ดัดลอนใหญ่คลายๆ แบบธรรมชาติ",
  },
  pixie_bob: {
    name: "บ็อบสั้นสไลด์เท็กซ์เจอร์ (Textured Short Bob)",
    description: "สไตล์โมเดิร์น ปลายผมชี้รับกับแนวกราม ช่วยขับเน้นลำคอระหง",
    benefit: "เปิดกรอบหน้าและช่วงคอ ขับเน้นแนวกรามและสันกระดูกให้โดดเด่น",
    category: "hair",
    image: "/hairstyles/pixie_bob.webp",
    barberInstructions: "ตัดบ็อบสั้นสไลด์ทุยด้านหลัง ด้านหน้ายาวเทลงมาระดับมุมกราม ซอยปลายให้เบาโปร่ง",
  },
};

export function getStyleRec(key: string, custom?: Partial<HairRecommendation>): HairRecommendation {
  const item = STYLE_CATALOG[key];
  if (!item) {
    return {
      key,
      name: custom?.name ?? key,
      description: custom?.description ?? "",
      benefit: custom?.benefit ?? "",
      category: custom?.category ?? "hair",
      image: custom?.image ?? `/hairstyles/${key}.webp`,
      barberInstructions: custom?.barberInstructions ?? "",
    };
  }
  return {
    key,
    name: custom?.name ?? item.name,
    description: custom?.description ?? item.description,
    benefit: custom?.benefit ?? item.benefit,
    category: custom?.category ?? item.category,
    image: custom?.image ?? item.image,
    barberInstructions: custom?.barberInstructions ?? item.barberInstructions,
  };
}

/**
 * Derives comprehensive hairstyle, beard grooming and eyewear guidance directly from
 * facial anatomical measurements (F10 golden ratio, F1 facial thirds, etc.)
 * without assigning rigid face shape labels.
 */
export function generateHairAdvice(result: Result, gender: Gender = "female"): HairAdviceProfile {
  // 1. Vertical length-to-width ratio
  const goldenRatio = result.metrics["F10_golden_ratio"]?.value;
  let verticalRatio = 1.38; // standard default

  if (typeof goldenRatio === "number" && !Number.isNaN(goldenRatio) && goldenRatio > 0.5 && goldenRatio < 2.5) {
    verticalRatio = goldenRatio;
  } else if (
    typeof result.landmarks.menton?.y === "number" &&
    typeof result.landmarks.trichion?.y === "number" &&
    typeof result.landmarks.bizygomatic_left?.x === "number" &&
    typeof result.landmarks.bizygomatic_right?.x === "number"
  ) {
    const height = Math.abs(result.landmarks.menton.y - result.landmarks.trichion.y);
    const width = Math.abs(result.landmarks.bizygomatic_left.x - result.landmarks.bizygomatic_right.x);
    if (width > 0) {
      verticalRatio = height / width;
    }
  }

  const verticalType: "elongated" | "balanced" | "compact" =
    verticalRatio > 1.46 ? "elongated" : verticalRatio < 1.28 ? "compact" : "balanced";

  const verticalInfo = {
    elongated: {
      label: "โครงหน้ายาวเด่นชัด (Elongated Profile)",
      description: `ความยาวใบหน้ามากกว่าความกว้างพอสมควร (อัตราส่วน ${verticalRatio.toFixed(2)}) ต้องการเพิ่มมิติความกว้างด้านข้าง`,
    },
    balanced: {
      label: "สัดส่วนความยาวสมดุล (Balanced Proportion)",
      description: `ความยาวและสัดส่วนความกว้างสมดุลตามธรรมชาติ (อัตราส่วน ${verticalRatio.toFixed(2)}) ปรับเข้ากับทรงผมได้หลากหลาย`,
    },
    compact: {
      label: "สัดส่วนกระชับ/กว้าง (Compact Profile)",
      description: `ความยาวและสัดส่วนความกว้างใกล้เคียงกัน (อัตราส่วน ${verticalRatio.toFixed(2)}) ต้องการเพิ่มมิติแนวดิ่งให้ดูโปร่งขึ้น`,
    },
  }[verticalType];

  // 2. Forehead (Upper Third) proportion
  const upperThird = result.metrics["F1_upper_third"]?.value;
  let foreheadFraction = 0.33;
  if (typeof upperThird === "number" && !Number.isNaN(upperThird) && upperThird > 0.1 && upperThird < 0.6) {
    foreheadFraction = upperThird;
  }

  const foreheadType: "high" | "balanced" | "short" =
    foreheadFraction > 0.36 ? "high" : foreheadFraction < 0.30 ? "short" : "balanced";

  const foreheadInfo = {
    high: {
      label: "หน้าผากกว้าง/สูง (High Forehead)",
      description: `พื้นที่หน้าผากคิดเป็น ${(foreheadFraction * 100).toFixed(1)}% ของใบหน้า เหมาะกับการมีผมหน้าม้าหรือเลเยอร์ปรกกรอบหน้าผาก`,
    },
    balanced: {
      label: "หน้าผากสมดุล (Balanced Forehead)",
      description: `สัดส่วนหน้าผากประมาณ ${(foreheadFraction * 100).toFixed(1)}% อยู่ในเกณฑ์มาตรฐาน สามารถเปิดหรือปิดหน้าผากได้ตามต้องการ`,
    },
    short: {
      label: "หน้าผากกระชับ/แคบ (Compact Forehead)",
      description: `สัดส่วนหน้าผากประมาณ ${(foreheadFraction * 100).toFixed(1)}% ควรเน้นทรงผมเปิดหน้าผากเพื่อเพิ่มพื้นที่สว่าง`,
    },
  }[foreheadType];

  // 3. Jawline & Lower Face Structure
  const lowerThird = result.metrics["F1_lower_third"]?.value;
  const lowerFaceRatio = result.metrics["F2_lower_face_ratio"]?.value;

  let jawType: "prominent_angular" | "tapered_v" | "soft_rounded" = "soft_rounded";
  if (typeof lowerThird === "number" && lowerThird > 0.36) {
    jawType = "prominent_angular";
  } else if (typeof lowerFaceRatio === "number" && lowerFaceRatio < 0.45) {
    jawType = "tapered_v";
  } else if (verticalType === "compact") {
    jawType = "soft_rounded";
  } else if (verticalType === "elongated") {
    jawType = "prominent_angular";
  }

  const jawInfo = {
    prominent_angular: {
      label: "แนวกรามคมชัดมีเหลี่ยมมุม (Angular Jawline)",
      description: "กระดูกขากรรไกรคมชัด เส้นกรอบหน้าแกร่ง เหมาะกับทรงผมที่ลดทอนความแข็งและเพิ่มความนุ่มนวล",
    },
    tapered_v: {
      label: "คางเรียวสอบ/คางแหลม (Tapered / V-Line)",
      description: "ช่วงล่างของใบหน้าเรียวสอบลงมายังปลายคาง เหมาะกับทรงผมที่เพิ่มวอลลุ่มช่วงคอและคางเพื่อสร้างสมดุล",
    },
    soft_rounded: {
      label: "แนวกรามโค้งมนนุ่มนวล (Soft / Curved Jawline)",
      description: "กรอบหน้าและแนวกรามมีความโค้งมน แก้มอิ่มสวย เหมาะกับทรงผมที่สร้างมุมเงาและเพิ่มมิติแนวดิ่ง",
    },
  }[jawType];

  // 4. Optical Principles & Volume Placement
  let volumePlacement = "";
  let partingTechnique = "";
  let contourFocus = "";

  if (verticalType === "compact") {
    volumePlacement = "วางวอลลุ่มบนกระหม่อมยกโคนสูง (Crown Volume) และควบคุมวอลลุ่มด้านข้างไม่ให้พองฟูเกินใบหู";
    partingTechnique = "แสกข้างลึก (Deep Side Part 70:30) หรือเปิดหน้าผาก เพื่อช่วยนำสายตาลากขึ้นในแนวดิ่ง";
    contourFocus = "สร้างเส้นนำสายตาในแนวดิ่งเพื่อพรางแก้มอิ่มและยืดความยาวใบหน้า";
  } else if (verticalType === "elongated") {
    volumePlacement = "เติมวอลลุ่มและความหนาช่วงด้านข้างระดับใบหูถึงประบ่า และลดความสูงบนกระหม่อม";
    partingTechnique = "หน้าม้าซีทรู (Curtain Bangs) หรือหน้าม้าปัดข้าง เพื่อตัดทอนความยาวแนวดิ่งของหน้าผาก";
    contourFocus = "เพิ่มมิติแนวนอนเพื่อเบรกความยาวหน้าให้ดูกะทัดรัดและอ่อนหวานขึ้น";
  } else {
    volumePlacement = "รักษาสมดุลวอลลุ่มผมให้ทิ้งตัวเป็นธรรมชาติรอบกรอบหน้า ไม่หนักไปทางด้านใดด้านหนึ่ง";
    partingTechnique = "แสกกลางธรรมชาติ (Center Part) หรือแสกข้างโปร่ง เพื่อขับเน้นความสมดุลของใบหน้า";
    contourFocus = "เน้นเลเยอร์ล้อมกรอบหน้า (Face-Framing Layers) ขับเน้นจุดเด่นตามธรรมชาติ";
  }

  if (foreheadType === "high" && !partingTechnique.includes("หน้าม้า")) {
    partingTechnique += " ร่วมกับหน้าม้าปัดเฉียงเพื่อลดพื้นที่หน้าผากด้านบน";
  } else if (foreheadType === "short") {
    partingTechnique = "หลีกเลี่ยงหน้าม้าทึบ ควรเปิดหน้าผากหรือแสกกลางโปร่งสบาย";
  }

  // 5. Recommendations tailored by Gender and Key Features
  const recommendations: HairRecommendation[] = [];
  const avoidStyles: Array<{ name: string; reason: string }> = [];
  let eyewearShapes: string[] = [];
  let eyewearTip = "";

  if (gender === "female") {
    if (verticalType === "compact") {
      recommendations.push(
        getStyleRec("long_layers", {
          benefit: "ช่วยอำพรางความกลมข้างแก้มและดึงสายตาให้ใบหน้าดูเรียวยาวขึ้น",
        }),
        getStyleRec("collarbone_lob", {
          benefit: "เส้นนำสายตาเฉียงของผมบ็อบเทช่วยตัดทอนความโค้งมนของกรอบหน้า",
        }),
        getStyleRec("soft_waves", {
          name: "ทรงแสกข้างลึกดัดลอนคลาย (Deep Side-Part with Loose Waves)",
          description: "แสกข้าง 70:30 เซ็ตยกโคนผมด้านบนเล็กน้อย ปลายผมลอนคลื่นใหญ่",
          benefit: "เปิดหน้าผากสร้างมิติแนวดิ่ง และเพิ่มความหรูหรามีมิติ",
        })
      );
      avoidStyles.push(
        {
          name: "ผมบ็อบสั้นเต่อระดับคางตัดตรงทึบ (Blunt Chin Bob)",
          reason: "จะเน้นขอบแนวกรามให้ดูกว้างและทำให้ใบหน้าดูกลมมนยิ่งขึ้น",
        },
        {
          name: "ผมดัดลอนพองฟูรอบใบหู (Wide Volume Perm)",
          reason: "การวางวอลลุ่มหนาด้านข้างจะขยายมิติความกว้างของหน้า",
        }
      );
      eyewearShapes = ["กรอบทรงเหลี่ยม (Square / Rectangle)", "ทรงแคทอายเฉียง (Geometric Cat-Eye)"];
      eyewearTip = "เลือกกรอบที่มีเหลี่ยมมุมคมชัดเพื่อตัดทอนความโค้งมนของใบหน้า หลีกเลี่ยงกรอบกลมมนขนาดเล็ก";
    } else if (verticalType === "elongated") {
      recommendations.push(
        getStyleRec("soft_waves", {
          name: "ผมดัดลอนคลายวอลลุ่มข้างใบหู (Mid-Length Side Volume Waves)",
          description: "ผมยาวประบ่า ดัดลอนคลื่นแบบโปร่งช่วงข้างใบหูลงไปถึงบ่า",
          benefit: "ช่วยเติมเต็มความกว้างแนวนอน ทำให้ใบหน้าดูสั้นกระชับและสมดุลขึ้น",
        }),
        getStyleRec("curtain_bangs", {
          benefit: "ช่วยลดทอนความสูงของหน้าผากและตัดความยาวใบหน้าได้อย่างเป็นธรรมชาติ",
        }),
        getStyleRec("collarbone_lob", {
          name: "บ็อบหนาประบ่ามีวอลลุ่มปลาย (Textured Bob with In-Curve)",
          description: "ผมบ็อบยาวระดับคอ ปลายผมงุ้มเข้าเล็กน้อยสร้างฐานรับคาง",
          benefit: "สร้างฐานแนวนอนบริเวณลำคอ ทำให้หน้าไม่ดูยาวชะลูด",
        })
      );
      avoidStyles.push(
        {
          name: "ผมยาวตรงดิ่งเรียบแบน (Pin-Straight Center Part)",
          reason: "เส้นผมที่ตรงดิ่งจะนำสายตาในแนวดิ่ง ยิ่งทำให้ใบหน้าดูยาวยืดขึ้นไปอีก",
        },
        {
          name: "ทรงเซ็ตกระหม่อมสูงหรือตีโป่ง (High Crown Bouffant)",
          reason: "การเพิ่มความสูงด้านบนจะยิ่งเพิ่มความยาวหน้าเกินจุดสมดุล",
        }
      );
      eyewearShapes = ["กรอบทรง Oversized", "กรอบทรงเหลี่ยมมนขอบหนา", "ทรง Aviator ขอบลึก"];
      eyewearTip = "เลือกกรอบที่มีความลึกในแนวดิ่ง (Tall lenses) เพื่อช่วยแบ่งพื้นที่ใบหน้า หลีกเลี่ยงกรอบแคบแนวนอน";
    } else {
      // Balanced
      recommendations.push(
        getStyleRec("soft_waves", {
          benefit: "ขับเน้นสัดส่วนที่สมดุล และช่วยให้ลุคดูละมุนสง่างาม",
        }),
        getStyleRec("collarbone_lob", {
          name: "บ็อบระดับกระดูกไหปลาร้า (Classic Collarbone Lob)",
          benefit: "เป็นทรงที่ช่วยขับเน้นโครงหน้าและช่วงคอให้ดูเรียวระหง",
        }),
        getStyleRec("long_layers", {
          name: "ทรงผมเปิดหน้าผากรวบหางม้าต่ำ (Sleek Low Ponytail / Bun)",
          description: "รวบผมเปิดกรอบหน้า ปล่อยปอยผมด้านข้างบาง ๆ สองฝั่ง",
          benefit: "โชว์สัดส่วนหน้าผากและสันกรามที่สมดุลได้อย่างมั่นใจ",
        })
      );
      avoidStyles.push(
        {
          name: "ผมหน้าม้าหนาเตอะทึบตัน (Heavy Blunt Bangs)",
          reason: "อาจปิดทับสัดส่วนครึ่งบนที่สมดุลไปโดยไม่จำเป็น",
        },
        {
          name: "ทรงผมที่จัดแต่งแข็งเกร็งไร้มิติ",
          reason: "ควรปล่อยให้เส้นผมเคลื่อนไหวตามธรรมชาติเพื่อรับกับโครงหน้า",
        }
      );
      eyewearShapes = ["ทรงหยดน้ำ (Panto)", "ทรงเหลี่ยมมน (Wayfarer)", "ทรงเรขาคณิตเรียบหรู"];
      eyewearTip = "โครงหน้าสมดุลสามารถใส่แว่นตาได้เกือบทุกทรง ให้เลือกขนาดความกว้างของกรอบพอดีกับโหนกแก้ม";
    }

    if (jawType === "prominent_angular") {
      recommendations.unshift(
        getStyleRec("long_layers", {
          name: "ผมสไลด์ปลายไล่ระดับรอบกราม (Graduated Chin-Length Layers)",
          description: "สไลด์ปลายผมนุ่มนวลล้อมรอบแนวกรามและลำคอ",
          benefit: "ปลายผมนุ่มนวลช่วยลดความแข็งคมของกระดูกขากรรไกรได้อย่างยอดเยี่ยม",
        })
      );
    }
  } else {
    // Male
    if (verticalType === "compact") {
      recommendations.push(
        getStyleRec("pompadour_quiff", {
          benefit: "เพิ่มความสูงและมิติแนวดิ่งอย่างเห็นได้ชัด ทำให้โครงหน้าดูยาวคมขึ้น",
        }),
        getStyleRec("modern_crew", {
          name: "อันเดอร์คัทหรือเฟดสูง (High Skin Fade with Textured Top)",
          description: "ไถข้างเตียนแบบ High Fade ปล่อยด้านบนมีความยาวไว้เซ็ต",
          benefit: "ตัดทอนความกว้างของใบหน้าด้านข้าง ช่วยให้กรอบหน้ากระชับดูคลีน",
        }),
        getStyleRec("comma_hair", {
          name: "ทรงไอวี่ลีกแสกข้างยกโคน (Ivy League / Side Part Quiff)",
          description: "ตัดสั้นสไตล์สุภาพ ไถข้างระดับกลาง เซ็ตเสยปาดเฉียงขึ้น",
          benefit: "เพิ่มมิติเรียบหรู เสริมความคมชัดโดยไม่ทำให้หน้าดูกลม",
        })
      );
      avoidStyles.push(
        {
          name: "ทรงกะลาครอบหรือหน้าม้าตรง (Bowl Cut / Flat Fringe)",
          reason: "จะเน้นความกลมของใบหน้าและทำให้ช่วงหน้าผากดูสั้นตันลง",
        },
        {
          name: "ผมยาวเสมอขอบหูไม่มีเลเยอร์ (Full Side Bulk)",
          reason: "ความหนาด้านข้างจะดันมิติหน้าให้ดูกว้างขึ้น",
        }
      );
      eyewearShapes = ["กรอบทรงสี่เหลี่ยมคม (Square)", "กรอบทรง Wayfarer ขอบชัด"];
      eyewearTip = "เลือกกรอบทรงเหลี่ยมขอบชัดเจนเพื่อตัดความโค้งมนและสร้างมิติสันกระดูก";
    } else if (verticalType === "elongated") {
      recommendations.push(
        getStyleRec("french_crop", {
          benefit: "หน้าม้าช่วยตัดทอนความยาวหน้าผาก และไม่ทำให้หน้าดูยาวเกินไป",
        }),
        getStyleRec("comma_hair", {
          name: "คลาสสิกไซด์พาร์ทแสกข้าง (Classic Side Part with Low Fade)",
          description: "หวีแสกข้างแบบธรรมชาติ ปล่อยด้านข้างมีความหนาพอประมาณ",
          benefit: "รักษาความกว้างแนวนอนของศีรษะ ไม่ให้หน้าดูสอบลีบยาวชะลูด",
        }),
        getStyleRec("comma_hair", {
          name: "ทรงทูบล็อคมีวอลลุ่มด้านข้าง (Two-Block with Side Volume)",
          description: "ผมสไตล์เกาหลี ปล่อยด้านข้างทิ้งตัวมีวอลลุ่มเบา ๆ และมีผมหน้าม้าปัด",
          benefit: "ช่วยเติมเต็มความกว้างให้โครงหน้าสมส่วนน่ามอง",
        })
      );
      avoidStyles.push(
        {
          name: "ทรงเซ็ตผมตั้งสูงมาก (High Pompadour / Faux Hawk สูง)",
          reason: "จะยิ่งดึงสายตาขึ้นบน ทำให้ใบหน้าที่ยาวอยู่แล้วดูยาวยิ่งขึ้น",
        },
        {
          name: "การไถข้างเตียนสูงจัด (High Skin Fade)",
          reason: "การเปิดข้างเตียนหมดจะทำให้หน้าดูผอมแคบและยาวยื่น",
        }
      );
      eyewearShapes = ["กรอบสี่เหลี่ยมจัตุรัสใหญ่ (Oversized Square)", "กรอบสะพานคู่ (Double Bridge)", "ทรง Aviator"];
      eyewearTip = "เลือกกรอบที่เลนส์มีความลึกเพื่อแบ่งสัดส่วนใบหน้า หลีกเลี่ยงแว่นกรอบแคบชิดตา";
    } else {
      // Balanced
      recommendations.push(
        getStyleRec("slick_back", {
          benefit: "โชว์แนวกรามและสัดส่วนหน้าที่สมดุลได้อย่างโดดเด่น",
        }),
        getStyleRec("comma_hair", {
          benefit: "สร้างเส้นสายนำสายตาที่ดูทันสมัยและมีมิติสมดุล",
        }),
        getStyleRec("modern_crew", {
          benefit: "เสริมบุคลิกทะมัดทะแมง ขับเน้นโครงสร้างหน้าแบบ Masculine",
        })
      );
      avoidStyles.push(
        {
          name: "ทรงผมที่ยาวรุงรังบดบังกรอบหน้า",
          reason: "ควรเปิดให้เห็นโครงสร้างสมดุลของใบหน้าอย่างมั่นใจ",
        },
        {
          name: "หน้าม้าทึบตันปิดคิ้วทั้งหมด",
          reason: "บดบังสัดส่วนดวงตาและหน้าผากที่สมดุล",
        }
      );
      eyewearShapes = ["กรอบ Clubmaster / Browline", "กรอบทรงเหลี่ยมมนคลาสสิก", "กรอบทรงรี"];
      eyewearTip = "โครงหน้าสมดุลเหมาะกับแว่นตาทุกสไตล์ ให้เลือกตามสไตล์การแต่งกายและบุคลิกภาพ";
    }

    if (jawType === "prominent_angular") {
      recommendations.unshift(
        getStyleRec("french_crop", {
          name: "ทรงซอฟต์ครอปและตอเคราแต่งคม (Soft Crop with Beard Contour)",
          description: "ผมสั้นมีเท็กซ์เจอร์คู่กับตอเคราสั้นตัดแต่งแนวกราม",
          benefit: "ขับเน้นเสน่ห์ของกระดูกกรามแกร่งคมชัดได้อย่างลงตัว",
        })
      );
    }

    // --- Beard & Facial Hair Grooming Recommendation for Men ---
    let beardRec: HairRecommendation;
    if ((typeof lowerFaceRatio === "number" && lowerFaceRatio < 0.45) || jawType === "tapered_v") {
      beardRec = getStyleRec("chin_goatee");
    } else if (jawType === "prominent_angular" || (typeof lowerThird === "number" && lowerThird > 0.36)) {
      beardRec = getStyleRec("stubble_jawline");
    } else {
      beardRec = getStyleRec("clean_shave");
    }
    recommendations.push(beardRec);
  }

  const finalRecommendations =
    gender === "male"
      ? [
          ...recommendations.filter((r) => r.category === "hair").slice(0, 3),
          ...recommendations.filter((r) => r.category === "beard").slice(0, 1),
        ]
      : recommendations.slice(0, 4);

  return {
    gender,
    features: {
      vertical: {
        type: verticalType,
        label: verticalInfo.label,
        description: verticalInfo.description,
        ratio: Number(verticalRatio.toFixed(2)),
      },
      forehead: {
        type: foreheadType,
        label: foreheadInfo.label,
        description: foreheadInfo.description,
        fraction: Number((foreheadFraction * 100).toFixed(1)),
      },
      jawline: {
        type: jawType,
        label: jawInfo.label,
        description: jawInfo.description,
      },
    },
    opticalPrinciples: {
      volumePlacement,
      partingTechnique,
      contourFocus,
    },
    recommendations: finalRecommendations,
    avoidStyles: avoidStyles.slice(0, 2),
    eyewear: {
      shapes: eyewearShapes,
      tip: eyewearTip,
    },
  };
}
