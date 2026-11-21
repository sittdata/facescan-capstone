/**
 * Hairstyle Optical Balancing Diagrams & Modal Inspection.
 * Pure SVG vector components with design token compliance, responsive scaling,
 * Before head silhouettes vs After hairstyle contours, and directional flow vectors.
 */
import * as Dialog from "@radix-ui/react-dialog";
import {
  CheckCircle2,
  Info,
  Layers,
  Maximize2,
  Scissors,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../ui/Button";

export type HairDiagramMode = "thumbnail" | "compare" | "vectors" | "result" | "before" | "lookbook";

export interface HairDiagramMetadata {
  titleTh: string;
  titleEn: string;
  balancingRoleTh: string;
  flowVectorsTh: string[];
  targetAnatomyTh: string[];
  stylingTipsTh: string;
}

export type CoreHairKey =
  | "long_layers"
  | "curtain_bangs"
  | "collarbone_lob"
  | "soft_waves"
  | "slick_back"
  | "comma_hair"
  | "modern_crew"
  | "pompadour_quiff"
  | "french_crop"
  | "chin_goatee"
  | "stubble_jawline"
  | "clean_shave"
  | "pixie_bob";

export interface HairAsset {
  image: string;
  alt: string;
}

export const HAIR_ASSETS: Record<string, HairAsset> = {
  comma_hair: { image: "/hairstyles/comma_hair.webp", alt: "ภาพผลลัพธ์จำลองทรงคอมม่าเปิดหน้าผาก" },
  slick_back: { image: "/hairstyles/slick_back.webp", alt: "ภาพผลลัพธ์จำลองทรงสลิคแบ็คอันเดอร์คัท" },
  modern_crew: { image: "/hairstyles/modern_crew.webp", alt: "ภาพผลลัพธ์จำลองทรงครูว์คัตทันสมัย" },
  pompadour_quiff: { image: "/hairstyles/pompadour_quiff.webp", alt: "ภาพผลลัพธ์จำลองทรงปอมปาดัวร์ควิฟยกสูง" },
  french_crop: { image: "/hairstyles/french_crop.webp", alt: "ภาพผลลัพธ์จำลองทรงเท็กซ์เจอร์ครอป" },
  chin_goatee: { image: "/hairstyles/chin_goatee.webp", alt: "ภาพผลลัพธ์จำลองการจัดแต่งเคราแพะปลายคาง" },
  stubble_jawline: { image: "/hairstyles/stubble_jawline.webp", alt: "ภาพผลลัพธ์จำลองการจัดแต่งเคราตอสั้นแต่งขอบกราม" },
  clean_shave: { image: "/hairstyles/clean_shave.webp", alt: "ภาพผลลัพธ์จำลองการโกนเกลี้ยงเปิดกรอบหน้า" },
  curtain_bangs: { image: "/hairstyles/curtain_bangs.webp", alt: "ภาพผลลัพธ์จำลองทรงหน้าม้าซีทรูสไตล์เกาหลี" },
  long_layers: { image: "/hairstyles/long_layers.webp", alt: "ภาพผลลัพธ์จำลองทรงผมยาวสไลด์เลเยอร์" },
  collarbone_lob: { image: "/hairstyles/collarbone_lob.webp", alt: "ภาพผลลัพธ์จำลองทรงบ็อบระดับกระดูกไหปลาร้า" },
  soft_waves: { image: "/hairstyles/soft_waves.webp", alt: "ภาพผลลัพธ์จำลองทรงลอนคลื่นธรรมชาติแสกข้าง" },
  pixie_bob: { image: "/hairstyles/pixie_bob.webp", alt: "ภาพผลลัพธ์จำลองทรงบ็อบสั้นสไลด์เท็กซ์เจอร์" },
};

export const HAIR_DIAGRAM_METADATA: Record<CoreHairKey, HairDiagramMetadata> & Record<string, HairDiagramMetadata | undefined> = {
  long_layers: {
    titleTh: "ผมยาวสไลด์เลเยอร์ล้อมกรอบหน้า",
    titleEn: "Long Face-Framing Layers",
    balancingRoleTh: "พรางความกว้างของแก้มและกระดูกขากรรไกร พร้อมดึงสายตาในแนวดิ่งให้โครงหน้าดูเรียวยาวและนุ่มนวล",
    flowVectorsTh: [
      "เวกเตอร์สไลด์ล้อมกรอบหน้า (Inward Framing): สไลด์ปลายผมโค้งเข้าหาแนวกรามเพื่อลดทอนความกว้าง",
      "เวกเตอร์ทิ้งตัวแนวดิ่ง (Vertical Elongation): ปลายผมยาวระดับไหปลาร้าช่วยยืดสัดส่วนใบหน้าให้ดูเพรียว",
      "เวกเตอร์ยกโคนกระหม่อมเบาๆ (Subtle Crown Lift): สร้างความโปร่งด้านบนไม่ให้ผมลีบแบน",
    ],
    targetAnatomyTh: ["โหนกแก้ม (Zygoma)", "แนวกราม (Jawline)", "กระดูกไหปลาร้า (Clavicle)"],
    stylingTipsTh: "ใช้แปรงกลมไดร์ม้วนเข้าหาใบหน้าช่วงปลาย เพื่อให้เลเยอร์ทิ้งตัวโอบรับกรอบหน้าอย่างเป็นธรรมชาติ",
  },
  curtain_bangs: {
    titleTh: "หน้าม้าซีทรูสไตล์เกาหลี",
    titleEn: "Curtain Bangs & Soft Layers",
    balancingRoleTh: "ลดทอนความสูงของหน้าผากและเบรกความยาวใบหน้า พร้อมเปิดพื้นที่ดวงตาให้ดูสว่างมีมิติ",
    flowVectorsTh: [
      "เวกเตอร์แสกกลางโค้งออก (Outward Arching Part): แสกผมเปิดกึ่งกลางแล้วโค้งออกด้านข้างระดับหางตา",
      "เวกเตอร์เชื่อมต่อโหนกแก้ม (Cheekbone Transition): ปลายหน้าม้าสไลด์เชื่อมกับผมด้านข้างอย่างกลมกลืน",
      "เวกเตอร์ลดพื้นที่หน้าผาก (Forehead Softening): บดบังมุมหน้าผากด้านข้างสร้างเส้นโค้งนุ่มนวล",
    ],
    targetAnatomyTh: ["แนวไรผมหน้าผาก (Trichion)", "หางคิ้วและโหนกแก้ม (Lateral Brow & Zygoma)", "ขมับ (Temple)"],
    stylingTipsTh: "ม้วนโรลแกนใหญ่บริเวณหน้าม้าไปด้านหน้า แล้วเป่าลมร้อนก่อนปัดออกด้านข้างสองฝั่ง",
  },
  collarbone_lob: {
    titleTh: "บ็อบระดับกระดูกไหปลาร้า",
    titleEn: "Classic Collarbone Lob / Asymmetrical Lob",
    balancingRoleTh: "สร้างฐานแนวนอนบริเวณลำคอเพื่อลดความยาวหน้า หรือใช้เส้นเฉียงเทข้างตัดทอนความกลมของใบหน้า",
    flowVectorsTh: [
      "เวกเตอร์ฐานรับลำคอ (Horizontal Collarbone Rest): ปลายผมตัดระดับกระดูกไหปลาร้าช่วยพยุงสัดส่วนล่าง",
      "เวกเตอร์เส้นนำสายตาเฉียง (Diagonal Angular Flow): ทรงบ็อบเทช่วยสร้างมิติคมชัดตัดความโค้งมน",
      "เวกเตอร์งุ้มปลายเบาๆ (Subtle In-Curve): ปลายผมงุ้มเข้าเล็กน้อยเพื่อพยุงแนวกราม",
    ],
    targetAnatomyTh: ["แนวกรามล่าง (Mandibular Line)", "มุมคาง (Menton)", "กระดูกไหปลาร้า (Clavicle)"],
    stylingTipsTh: "หนีบตรงโดยหักข้อมือเข้าด้านในเล็กน้อยตอนถึงปลายผม เพื่อให้ทรงผมเกาะทรงสวยตลอดวัน",
  },
  soft_waves: {
    titleTh: "ลอนคลื่นธรรมชาติวอลลุ่มด้านข้าง",
    titleEn: "Natural Soft Waves & Mid-Length Volume",
    balancingRoleTh: "เติมเต็มมิติความกว้างด้านข้างระดับใบหูถึงบ่า ลดความรู้สึกยาวชะลูดของใบหน้าและเพิ่มความละมุน",
    flowVectorsTh: [
      "เวกเตอร์ขยายมิติด้านข้าง (Lateral Volume Expansion): ลอนคลื่นระดับใบหูสร้างมิติความกว้างแนวนอน",
      "เวกเตอร์คลื่นทรงเอส (Flowing S-Wave): เส้นสายโค้งเว้าช่วยลดความแข็งคมของโครงหน้า",
      "เวกเตอร์กระจายน้ำหนักปลายผม (Weight Redistribution): ผ่อนคลายช่วงปลายไม่ให้หนักทึบ",
    ],
    targetAnatomyTh: ["ระดับใบหู (Auricular Level)", "ข้างแก้ม (Cheek Contours)", "ช่วงบ่า (Shoulder Level)"],
    stylingTipsTh: "ใช้แกนม้วนลอนขนาดใหญ่ ม้วนลอนออกจากใบหน้า แล้วใช้หวีซี่ห่างสางเบาๆ เพื่อให้ได้ลอนธรรมชาติ",
  },
  slick_back: {
    titleTh: "ทรงสลิคแบ็คและอันเดอร์คัทคลาสสิก",
    titleEn: "Slick Back Undercut & Mid Fade",
    balancingRoleTh: "เปิดกรอบหน้าทั้งหมดเพื่อขับเน้นแนวกราม สัดส่วนหน้าผาก และความคมชัดของสัดส่วนสมดุล",
    flowVectorsTh: [
      "เวกเตอร์เสยไปด้านหลัง (Straight Backward Pull): หวีปาดผมจากแนวไรผมตรงสู่ท้ายทอย",
      "เวกเตอร์กระชับด้านข้าง (Clean Side Taper): ไถด้านข้างระดับกลางเพื่อลดความกว้างศีรษะ",
      "เวกเตอร์เปิดสันกระดูก (Bone Structure Reveal): ขับเน้นสันคิ้วและกระดูกโหนกแก้ม",
    ],
    targetAnatomyTh: ["แนวไรผมหน้าผาก (Trichion)", "ขมับและมุมกราม (Temple & Gonion)", "ท้ายทอย (Occiput)"],
    stylingTipsTh: "ใส่โพเมดสูตรเงาปานกลางขณะผมหมาด ใช้หวีซี่ถี่ปาดไปด้านหลังตรงๆ แล้วเซ็ตด้วยลมเย็น",
  },
  comma_hair: {
    titleTh: "ทรงคอมม่าเปิดหน้าผากสไตล์โมเดิร์น",
    titleEn: "Modern Comma Hair & Textured Side Swept",
    balancingRoleTh: "เปิดหน้าผากบางส่วนแบบ 60:40 สร้างจุดโฟกัสนำสายตาแบบอสมมาตรที่ช่วยปรับรูปหน้าให้ดูเพรียวมีมิติ",
    flowVectorsTh: [
      "เวกเตอร์โค้งรูปคอมม่า (Inward Comma Arc): ปอยผมหน้าม้าโค้งงุ้มเข้าหากึ่งกลางหน้าผากคล้ายเครื่องหมายจุลภาค",
      "เวกเตอร์ยกโคนแสกข้าง (Root Lift Parting): ยกโคนผมฝั่งแสก 60% เพื่อสร้างความโปร่งและมีวอลลุ่ม",
      "เวกเตอร์ทิ้งน้ำหนักด้านข้าง (Tapered Side Flow): หวีผมด้านข้างแนบชิดกระชับรูปศีรษะ",
    ],
    targetAnatomyTh: ["กึ่งกลางหน้าผาก (Mid-Forehead)", "แนวคิ้ว (Eyebrow Line)", "ขมับ (Temple)"],
    stylingTipsTh: "ไดร์ยกโคนผมฝั่งที่เยอะกว่า แล้วใช้นิ้วมือหรือเครื่องหนีบดัดปลายให้โค้งงุ้มเข้าหาระหว่างคิ้ว",
  },
  modern_crew: {
    titleTh: "ทรงครูว์คัตทันสมัยไล่เฟด",
    titleEn: "Modern Textured Crew Cut & High Fade",
    balancingRoleTh: "ลดความกว้างด้านข้างด้วยการไถเฟด และจัดทรงด้านบนให้มีเท็กซ์เจอร์ เพิ่มความคมชัดและคลีน",
    flowVectorsTh: [
      "เวกเตอร์ยกปลายผมด้านหน้า (Forward-Upward Texture): เซ็ตเสยยกปลายผมด้านหน้าขึ้นเฉียง",
      "เวกเตอร์ไล่น้ำหนักแนวดิ่ง (Vertical Fade Transition): ไถไล่ระดับเฟดจากสั้นมากด้านล่างขึ้นสู่ด้านบน",
      "เวกเตอร์ลดปริมาตรด้านข้าง (Lateral Slimming): กระชับโครงสร้างช่วงขมับให้รูปหน้าเพรียวขึ้น",
    ],
    targetAnatomyTh: ["มุมกะโหลกศีรษะข้าง (Parietal Ridge)", "ไรผมหน้าผาก (Hairline)", "แนวกราม (Jawline)"],
    stylingTipsTh: "ใช้แมตต์แว็กซ์ปริมาณเล็กน้อย ขยี้บริเวณโคนผมด้านบนแล้วใช้นิ้วดึงแต่งปลายผมให้ตั้งขึ้น",
  },
  pompadour_quiff: {
    titleTh: "ทรงปอมปาดัวร์และควิฟยกโคนสูง",
    titleEn: "High Volume Pompadour / Structured Quiff",
    balancingRoleTh: "เพิ่มความสูงและมิติแนวดิ่งอย่างเด่นชัด ยืดสัดส่วนใบหน้าที่สั้นหรือกะทัดรัดให้ดูยาวสง่า",
    flowVectorsTh: [
      "เวกเตอร์ยกโคนสูงแนวดิ่ง (High Vertical Root Elevation): ดึงและยกโคนผมด้านหน้าขึ้น 3-5 ซม.",
      "เวกเตอร์ม้วนพับไปด้านหลัง (Roll-Back Arc): ม้วนลอนผมด้านบนให้โค้งทอดไปด้านหลัง",
      "เวกเตอร์บีบกระชับด้านข้าง (Tight Side Compression): ไถข้างสั้นเพื่อให้ความสูงด้านบนเด่นชัดสูงสุด",
    ],
    targetAnatomyTh: ["กระหม่อม (Vertex)", "แนวกึ่งกลางหน้าผาก (Mid-Forehead)", "แนวขมับ (Temporal Crest)"],
    stylingTipsTh: "ใช้แปรงกลมม้วนยกโคนผมด้านหน้าขณะเป่าไดร์ร้อน แล้วใช้สเปรย์ฝุ่นล็อคทรงให้อยู่ตัวตลอดวัน",
  },
  french_crop: {
    titleTh: "ทรงเท็กซ์เจอร์ครอปมีหน้าม้า",
    titleEn: "Textured French Crop & Blunt Fringe",
    balancingRoleTh: "ตัดทอนความยาวของใบหน้าและหน้าผากด้วยหน้าม้าตัดตรง พร้อมเพิ่มเท็กซ์เจอร์ด้านบนให้ดูมีมิติ",
    flowVectorsTh: [
      "เวกเตอร์ตัดทอนแนวนอน (Horizontal Fringe Cut): แนวหน้าม้าสั้นช่วยสร้างเส้นแบ่งขอบเขตหน้าผาก",
      "เวกเตอร์ชี้ไปข้างหน้า (Forward Textured Direction): หวีเซ็ตเส้นผมด้านบนพุ่งตรงมาข้างหน้า",
      "เวกเตอร์เฟดต่ำประคองฐาน (Low Taper Support): ไถเฟดระดับต่ำเพื่อรักษาความหนาและสมดุลศีรษะ",
    ],
    targetAnatomyTh: ["หน้าผากส่วนบน (Upper Forehead)", "แนวคิ้ว (Eyebrow Line)", "ขมับ (Temple Area)"],
    stylingTipsTh: "ใช้แป้งเซ็ตผมโรยบนผมแห้ง แล้วใช้ปลายนิ้วขยำสร้างริ้วผมพุ่งมาข้างหน้าอย่างเป็นธรรมชาติ",
  },
  chin_goatee: {
    titleTh: "เคราแพะเรียวปลายคาง",
    titleEn: "Tailored Chin Goatee & Mustache",
    balancingRoleTh: "ยืดมิติความยาวแนวดิ่งให้ปลายคาง ช่วยให้คางที่สั้นหรือถอยดูยาวและได้สัดส่วน V-Line สมดุลขึ้น",
    flowVectorsTh: [
      "เวกเตอร์ยืดมิติคางแนวดิ่ง (Vertical Chin Extension): จัดแต่งเคราปลายคางเป็นแนวสามเหลี่ยมคว่ำลากยาวลงล่าง",
      "เวกเตอร์เปิดกรอบหน้าด้านข้าง (Lateral Jawline Clearance): โกนแก้มสองข้างให้เกลี้ยงเกลาเพื่อลดความกลม",
    ],
    targetAnatomyTh: ["จุดปลายคาง (Menton / Pogonion)", "ร่องริมฝีปากล่าง (Labiomental Groove)", "แนวกราม (Jawline)"],
    stylingTipsTh: "เล็มเคราปลายคางความยาว 8-12 มม. โกนแก้มและขอบกรามให้เรียบเนียน ใช้มีดโกนสะบัดหนังกันขอบให้คมชัด",
  },
  stubble_jawline: {
    titleTh: "เคราตอสั้นแต่งขอบกราม",
    titleEn: "Crisp Stubble & Jawline Definition",
    balancingRoleTh: "ตีกรอบแนวกรามให้ดูคมชัดแกร่งแบบ Masculine และช่วยพรางไขมันใต้คางหรือแก้มอิ่ม",
    flowVectorsTh: [
      "เวกเตอร์กำหนดขอบกราม (Crisp Jawline Border): กันขอบเคราตอสั้นตามแนวกระดูกขากรรไกรล่าง",
      "เวกเตอร์สร้างเงาใต้คาง (Submental Shadowing): การไว้ตอสั้นช่วยสร้างมิติแสงเงาให้กรอบหน้ากระชับ",
    ],
    targetAnatomyTh: ["แนวกระดูกขากรรไกร (Mandibular Border)", "มุมกราม (Gonion)", "คอหอยส่วนบน (Submental Area)"],
    stylingTipsTh: "ใช้ปัตตาเลี่ยนเบอร์ 1 (2-3 มม.) ไถสม่ำเสมอ กันขอบแก้มเฉียงตรงจากหูสู่มุมปาก โกนส่วนลำคอออกทั้งหมด",
  },
  clean_shave: {
    titleTh: "โกนเกลี้ยงเปิดกรอบหน้า",
    titleEn: "Clean Shaven & Natural Jawline Contour",
    balancingRoleTh: "เปิดโชว์แนวกรามและสัดส่วนใบหน้าที่สมดุลตามธรรมชาติอย่างเต็มที่",
    flowVectorsTh: [
      "เวกเตอร์เปิดโครงสร้างกระดูก (Bone Structure Illumination): เผยความคมชัดของแนวกรามตามธรรมชาติ",
      "เวกเตอร์ปรับผิวเรียบเนียน (Smooth Texture Balancing): ลดการบดบังของเส้นขนเพื่อขับเน้นความสว่าง",
    ],
    targetAnatomyTh: ["กรอบหน้าและแนวกราม (Mandibular Contour)", "ปลายคาง (Menton)", "แก้ม (Cheek Planes)"],
    stylingTipsTh: "โกนเกลี้ยงด้วยโฟมโกนหนวดและมีดโกนคม ปลอบประโลมผิวหลังโกนด้วย Aftershave Balm ไร้แอลกอฮอล์",
  },
  pixie_bob: {
    titleTh: "บ็อบสั้นสไลด์เท็กซ์เจอร์",
    titleEn: "Textured Short Pixie Bob",
    balancingRoleTh: "เปิดกรอบหน้าและช่วงคอ ขับเน้นแนวกรามและสันกระดูกให้โดดเด่น",
    flowVectorsTh: [
      "เวกเตอร์เทเฉียงรับแนวกราม (Diagonal Jawline Flow): ปอยผมด้านหน้าเทลงมารับกับขอบกราม",
      "เวกเตอร์ยกทุยด้านหลัง (Occipital Lift): สไลด์ทุยด้านหลังสร้างมิติหัวทุยสวยงาม",
    ],
    targetAnatomyTh: ["แนวกราม (Jawline)", "ท้ายทอย (Occiput)", "ลำคอ (Neckline)"],
    stylingTipsTh: "ใช้มูสจัดแต่งทรงขยี้เบาๆ ด้านหลัง ไดร์เป่ายกโคนและเซ็ตปอยผมด้านข้างให้เฉียงขนานแนวกราม",
  },
};

export function getHairMetadata(key?: string | null, title?: string | null): HairDiagramMetadata {
  if (key && HAIR_DIAGRAM_METADATA[key]) {
    return HAIR_DIAGRAM_METADATA[key]!;
  }
  const lowerKey = (key || "").toLowerCase();
  const lowerTitle = (title || "").toLowerCase();
  if (lowerKey.includes("layer") || lowerTitle.includes("เลเยอร์") || lowerTitle.includes("สไลด์")) {
    return HAIR_DIAGRAM_METADATA.long_layers;
  }
  if (lowerKey.includes("bang") || lowerTitle.includes("หน้าม้า")) {
    return HAIR_DIAGRAM_METADATA.curtain_bangs;
  }
  if (lowerKey.includes("lob") || lowerKey.includes("bob") || lowerTitle.includes("บ็อบ")) {
    return HAIR_DIAGRAM_METADATA.collarbone_lob;
  }
  if (lowerKey.includes("wave") || lowerTitle.includes("ลอน") || lowerTitle.includes("คลื่น")) {
    return HAIR_DIAGRAM_METADATA.soft_waves;
  }
  if (lowerKey.includes("pompadour") || lowerKey.includes("quiff") || lowerTitle.includes("ปอมปาดัวร์") || lowerTitle.includes("ควิฟ")) {
    return HAIR_DIAGRAM_METADATA.pompadour_quiff;
  }
  if (lowerKey.includes("crop") || lowerTitle.includes("ครอป")) {
    return HAIR_DIAGRAM_METADATA.french_crop;
  }
  if (
    lowerKey.includes("crew") ||
    lowerTitle.includes("ครูว์") ||
    lowerKey.includes("fade") ||
    lowerTitle.includes("เฟด") ||
    lowerKey.includes("undercut") ||
    lowerTitle.includes("อันเดอร์คัท")
  ) {
    return HAIR_DIAGRAM_METADATA.modern_crew;
  }
  if (lowerKey.includes("slick") || lowerTitle.includes("สลิค")) {
    return HAIR_DIAGRAM_METADATA.slick_back;
  }
  if (
    lowerKey.includes("comma") ||
    lowerTitle.includes("คอมม่า") ||
    lowerKey.includes("part") ||
    lowerTitle.includes("แสก") ||
    lowerKey.includes("two_block") ||
    lowerKey.includes("two-block") ||
    lowerTitle.includes("ทูบล็อค")
  ) {
    return HAIR_DIAGRAM_METADATA.comma_hair;
  }
  if (lowerKey.includes("goatee") || lowerTitle.includes("เคราแพะ")) {
    return HAIR_DIAGRAM_METADATA.chin_goatee;
  }
  if (lowerKey.includes("stubble") || lowerTitle.includes("ตอเครา")) {
    return HAIR_DIAGRAM_METADATA.stubble_jawline;
  }
  if (lowerKey.includes("shave") || lowerTitle.includes("โกนเกลี้ยง")) {
    return HAIR_DIAGRAM_METADATA.clean_shave;
  }
  if (lowerKey.includes("pixie") || lowerTitle.includes("พิกซี่")) {
    return HAIR_DIAGRAM_METADATA.pixie_bob;
  }

  return {
    titleTh: title || "ทรงผมปรับสมดุลสัดส่วนใบหน้า",
    titleEn: "Optical Balancing Hairstyle Architecture",
    balancingRoleTh: "ปรับแต่งวอลลุ่มและทิศทางเส้นผมเพื่อสร้างดุลยภาพที่สมบูรณ์แบบตามสัดส่วนโครงหน้าจริง",
    flowVectorsTh: [
      "เวกเตอร์ปรับระดับวอลลุ่ม (Volumetric Balancing): วางน้ำหนักเส้นผมในตำแหน่งที่เกื้อหนุนรูปหน้า",
      "เวกเตอร์นำสายตา (Optical Flow): สร้างเส้นนำสายตาเพื่อขับเน้นจุดเด่นของโครงหน้า",
    ],
    targetAnatomyTh: ["กรอบหน้า (Facial Contour)", "แนวกราม (Jawline)", "หน้าผาก (Forehead)"],
    stylingTipsTh: "จัดแต่งทรงผมตามแนวลูกศรเพื่อผลลัพธ์การปรับสมดุลที่เป็นธรรมชาติสูงสุด",
  };
}

/** SVG Vector Arrowhead Definitions */
function HairSvgDefs() {
  return (
    <defs>
      <marker
        id="hair-vector-arrow-accent"
        viewBox="0 0 10 10"
        refX="6"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--accent)" />
      </marker>
      <marker
        id="hair-vector-arrow-emerald"
        viewBox="0 0 10 10"
        refX="6"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#059669" />
      </marker>
      <marker
        id="hair-vector-arrow-neutral"
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
// Pure SVG Hairstyle Diagram Component
// -----------------------------------------------------------------------------

export interface HairSvgDiagramProps {
  styleKey?: string;
  title?: string;
  mode?: HairDiagramMode;
  className?: string;
}

export function HairSvgDiagram({
  styleKey = "",
  title,
  mode = "vectors",
  className = "w-full h-auto text-ink select-none",
}: HairSvgDiagramProps) {
  const showBefore = mode === "before" || mode === "compare";
  const showVectors = mode === "vectors" || mode === "thumbnail" || mode === "compare";
  const showAfter = mode !== "before";

  // Normalize key to standard set
  let key = styleKey;
  if (!key || !HAIR_DIAGRAM_METADATA[key]) {
    const meta = getHairMetadata(key, title);
    const foundEntry = Object.entries(HAIR_DIAGRAM_METADATA).find(
      ([, v]) => v != null && (v.titleEn === meta.titleEn || v.titleTh === meta.titleTh)
    );
    if (foundEntry) {
      key = foundEntry[0];
    } else {
      key = "long_layers";
    }
  }

  return (
    <svg
      role="img"
      aria-label={`Hairstyle optical balancing diagram for ${key}`}
      viewBox="0 0 320 300"
      className={className}
    >
      <HairSvgDefs />

      {/* Subtle Background Proportion Guides */}
      <line
        x1="40"
        y1="145"
        x2="280"
        y2="145"
        stroke="currentColor"
        strokeOpacity="0.1"
        strokeDasharray="2 4"
      />
      <line
        x1="160"
        y1="30"
        x2="160"
        y2="280"
        stroke="currentColor"
        strokeOpacity="0.1"
        strokeDasharray="2 4"
      />

      {/* Anatomical Head Base: Neck & Shoulders */}
      <path
        d="M 125 240 Q 120 265 110 285 L 60 295 M 195 240 Q 200 265 210 285 L 260 295"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.5"
      />

      {/* Anatomical Jawline & Chin */}
      <path
        d="M 90 145 C 90 190 115 245 160 252 C 205 245 230 190 230 145"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />

      {/* Ears */}
      <path
        d="M 90 145 C 80 148 80 170 92 175"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeOpacity="0.6"
      />
      <path
        d="M 230 145 C 240 148 240 170 228 175"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeOpacity="0.6"
      />

      {/* Facial Features (Eyes, Eyebrows, Nose, Lips) */}
      <g stroke="currentColor" strokeOpacity="0.65" strokeLinecap="round" fill="none">
        {/* Eyebrows */}
        <path d="M 115 136 Q 130 132 142 136" strokeWidth="1.5" />
        <path d="M 178 136 Q 190 132 205 136" strokeWidth="1.5" />
        {/* Eyes */}
        <path d="M 118 147 Q 130 143 140 147" strokeWidth="1.25" />
        <circle cx="129" cy="147" r="1.5" fill="currentColor" />
        <path d="M 180 147 Q 190 143 202 147" strokeWidth="1.25" />
        <circle cx="191" cy="147" r="1.5" fill="currentColor" />
        {/* Nose bridge and tip */}
        <path d="M 160 142 L 158 172 Q 158 178 164 178" strokeWidth="1.25" />
        {/* Lips */}
        <path d="M 148 205 Q 160 203 172 205" strokeWidth="1.25" />
        <path d="M 152 209 Q 160 214 168 209" strokeWidth="1" />
      </g>

      {/* Natural Cranium & Baseline Hairline (Before Anchor) */}
      {showBefore ? (
        <g stroke="currentColor" strokeLinecap="round" fill="none">
          {/* Natural Cranial Outline */}
          <path
            d="M 90 145 C 90 90 115 65 160 65 C 205 65 230 90 230 145"
            strokeWidth="1.75"
            strokeDasharray="4 3"
            strokeOpacity="0.75"
          />
          {/* Baseline Hairline */}
          <path
            d="M 105 118 Q 130 98 160 98 Q 190 98 215 118"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            strokeOpacity="0.5"
          />
        </g>
      ) : (
        /* Muted background cranium guide */
        <path
          d="M 90 145 C 90 90 115 65 160 65 C 205 65 230 90 230 145"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="2 4"
          strokeOpacity="0.25"
        />
      )}

      {/* AFTER HAIRSTYLE PATHS & OPTICAL VECTORS */}
      {showAfter && (
        <>
          {key === "long_layers" && (
            <g>
              {/* Hairstyle Outer Volume & Face-Framing Strands */}
              <path
                d="M 160 48 C 110 48 75 90 75 165 C 75 220 70 260 65 285"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
              />
              <path
                d="M 160 48 C 210 48 245 90 245 165 C 245 220 250 260 255 285"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
              />
              {/* Inward In-Curve Face-Framing Strands */}
              <path
                d="M 105 115 C 100 150 110 185 130 215 C 138 228 128 260 115 285"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M 215 115 C 220 150 210 185 190 215 C 182 228 192 260 205 285"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              {/* Parting detail */}
              <path
                d="M 155 48 Q 153 75 152 98"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />

              {/* Optical Balancing Vectors */}
              {showVectors && (
                <g>
                  {/* Vertical Crown Lift Vector */}
                  <line
                    x1="160"
                    y1="68"
                    x2="160"
                    y2="42"
                    stroke="var(--accent)"
                    strokeWidth="2"
                    markerEnd="url(#hair-vector-arrow-accent)"
                  />
                  {/* Inward Slimming Vectors along cheeks */}
                  <path
                    d="M 85 175 Q 98 195 124 212"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="1.75"
                    markerEnd="url(#hair-vector-arrow-accent)"
                  />
                  <path
                    d="M 235 175 Q 222 195 196 212"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="1.75"
                    markerEnd="url(#hair-vector-arrow-accent)"
                  />
                  {/* Elongation Flow along clavicle */}
                  <line
                    x1="70"
                    y1="245"
                    x2="70"
                    y2="280"
                    stroke="#059669"
                    strokeWidth="1.75"
                    strokeDasharray="3 3"
                    markerEnd="url(#hair-vector-arrow-emerald)"
                  />
                  <line
                    x1="250"
                    y1="245"
                    x2="250"
                    y2="280"
                    stroke="#059669"
                    strokeWidth="1.75"
                    strokeDasharray="3 3"
                    markerEnd="url(#hair-vector-arrow-emerald)"
                  />
                </g>
              )}
            </g>
          )}

          {key === "curtain_bangs" && (
            <g>
              {/* Mid-length Hair Volume */}
              <path
                d="M 160 52 C 105 52 75 95 75 160 C 75 220 80 255 85 275"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M 160 52 C 215 52 245 95 245 160 C 245 220 240 255 235 275"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              {/* Sweeping Curtain Bangs Arcs */}
              <path
                d="M 160 92 C 150 102 130 108 115 130 C 108 142 110 160 115 175"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2.25"
                strokeLinecap="round"
              />
              <path
                d="M 160 92 C 170 102 190 108 205 130 C 212 142 210 160 205 175"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2.25"
                strokeLinecap="round"
              />
              {/* Center Part Line */}
              <path
                d="M 160 52 L 160 92"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />

              {/* Optical Balancing Vectors */}
              {showVectors && (
                <g>
                  {/* Left Sweeping Arc Vector */}
                  <path
                    d="M 152 95 Q 132 108 118 132"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="2"
                    markerEnd="url(#hair-vector-arrow-accent)"
                  />
                  {/* Right Sweeping Arc Vector */}
                  <path
                    d="M 168 95 Q 188 108 202 132"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="2"
                    markerEnd="url(#hair-vector-arrow-accent)"
                  />
                  {/* Side Expansion Vector */}
                  <line
                    x1="90"
                    y1="165"
                    x2="68"
                    y2="165"
                    stroke="#059669"
                    strokeWidth="1.75"
                    markerEnd="url(#hair-vector-arrow-emerald)"
                  />
                  <line
                    x1="230"
                    y1="165"
                    x2="252"
                    y2="165"
                    stroke="#059669"
                    strokeWidth="1.75"
                    markerEnd="url(#hair-vector-arrow-emerald)"
                  />
                </g>
              )}
            </g>
          )}

          {key === "collarbone_lob" && (
            <g>
              {/* Lob Outer Contour (falls to clavicle with gentle C-curve) */}
              <path
                d="M 155 52 C 105 52 82 95 80 170 L 80 255 C 80 268 95 272 110 270"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
              />
              <path
                d="M 155 52 C 205 52 238 95 240 170 L 240 255 C 240 268 225 272 210 270"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
              />
              {/* Subtle Asymmetric Side Part */}
              <path
                d="M 150 52 Q 148 75 145 102"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              {/* Inward Tuck C-Curl Lines */}
              <path
                d="M 85 240 Q 88 268 112 268"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M 235 240 Q 232 268 208 268"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* Optical Balancing Vectors */}
              {showVectors && (
                <g>
                  {/* Clavicle Reference Base Horizontal Guide */}
                  <line
                    x1="65"
                    y1="270"
                    x2="255"
                    y2="270"
                    stroke="currentColor"
                    strokeOpacity="0.3"
                    strokeDasharray="3 3"
                  />
                  {/* Inward Tuck Curl Vectors */}
                  <path
                    d="M 75 252 Q 80 272 106 270"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="1.75"
                    markerEnd="url(#hair-vector-arrow-accent)"
                  />
                  <path
                    d="M 245 252 Q 240 272 214 270"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="1.75"
                    markerEnd="url(#hair-vector-arrow-accent)"
                  />
                  {/* Linear Vertical Guidance Vector */}
                  <line
                    x1="80"
                    y1="160"
                    x2="80"
                    y2="225"
                    stroke="#059669"
                    strokeWidth="1.75"
                    markerEnd="url(#hair-vector-arrow-emerald)"
                  />
                  <line
                    x1="240"
                    y1="160"
                    x2="240"
                    y2="225"
                    stroke="#059669"
                    strokeWidth="1.75"
                    markerEnd="url(#hair-vector-arrow-emerald)"
                  />
                </g>
              )}
            </g>
          )}

          {key === "soft_waves" && (
            <g>
              {/* Voluminous S-Curve Outer Outlines */}
              <path
                d="M 155 50 C 110 50 82 85 70 125 C 60 160 78 185 70 220 C 64 245 72 268 80 285"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
              />
              <path
                d="M 155 50 C 200 50 238 85 250 125 C 260 160 242 185 250 220 C 256 245 248 268 240 285"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
              />
              {/* Inner Wave Strands */}
              <path
                d="M 90 135 C 75 165 92 195 82 225 C 78 245 88 270 95 285"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
              <path
                d="M 230 135 C 245 165 228 195 238 225 C 242 245 232 270 225 285"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="1.75"
                strokeLinecap="round"
              />

              {/* Optical Balancing Vectors */}
              {showVectors && (
                <g>
                  {/* Lateral Volume Expansion Arrows at Ear Level */}
                  <line
                    x1="98"
                    y1="150"
                    x2="60"
                    y2="150"
                    stroke="var(--accent)"
                    strokeWidth="2"
                    markerEnd="url(#hair-vector-arrow-accent)"
                  />
                  <line
                    x1="222"
                    y1="150"
                    x2="260"
                    y2="150"
                    stroke="var(--accent)"
                    strokeWidth="2"
                    markerEnd="url(#hair-vector-arrow-accent)"
                  />
                  {/* S-Wave Dynamic Motion Indicator */}
                  <path
                    d="M 68 180 Q 82 198 72 220"
                    fill="none"
                    stroke="#059669"
                    strokeWidth="1.75"
                    markerEnd="url(#hair-vector-arrow-emerald)"
                  />
                  <path
                    d="M 252 180 Q 238 198 248 220"
                    fill="none"
                    stroke="#059669"
                    strokeWidth="1.75"
                    markerEnd="url(#hair-vector-arrow-emerald)"
                  />
                </g>
              )}
            </g>
          )}

          {key === "slick_back" && (
            <g>
              {/* Sleek Top Volume swept straight back */}
              <path
                d="M 102 110 C 102 55 125 45 160 45 C 195 45 218 55 218 110"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
              />
              {/* Directional Streamlines */}
              <path d="M 125 105 Q 130 65 160 55" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M 160 102 L 160 50" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M 195 105 Q 190 65 160 55" fill="none" stroke="currentColor" strokeWidth="1.5" />
              {/* Clean Mid-Fade Tapered Sides */}
              <path
                d="M 102 110 L 92 145 L 94 175"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M 218 110 L 228 145 L 226 175"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* Optical Balancing Vectors */}
              {showVectors && (
                <g>
                  {/* Front-to-Back Flow Arrows */}
                  <line
                    x1="160"
                    y1="98"
                    x2="160"
                    y2="48"
                    stroke="var(--accent)"
                    strokeWidth="2"
                    markerEnd="url(#hair-vector-arrow-accent)"
                  />
                  <line
                    x1="135"
                    y1="102"
                    x2="145"
                    y2="62"
                    stroke="var(--accent)"
                    strokeWidth="1.75"
                    markerEnd="url(#hair-vector-arrow-accent)"
                  />
                  <line
                    x1="185"
                    y1="102"
                    x2="175"
                    y2="62"
                    stroke="var(--accent)"
                    strokeWidth="1.75"
                    markerEnd="url(#hair-vector-arrow-accent)"
                  />
                  {/* Side Compression Vectors (Fade Inward) */}
                  <line
                    x1="70"
                    y1="140"
                    x2="88"
                    y2="140"
                    stroke="#059669"
                    strokeWidth="1.75"
                    markerEnd="url(#hair-vector-arrow-emerald)"
                  />
                  <line
                    x1="250"
                    y1="140"
                    x2="232"
                    y2="140"
                    stroke="#059669"
                    strokeWidth="1.75"
                    markerEnd="url(#hair-vector-arrow-emerald)"
                  />
                </g>
              )}
            </g>
          )}

          {key === "comma_hair" && (
            <g>
              {/* Asymmetric 60:40 Top Volume */}
              <path
                d="M 96 112 C 96 60 120 48 160 48 C 200 48 224 60 224 112"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
              />
              {/* Lifted Root Parting */}
              <path
                d="M 138 100 Q 135 65 125 58"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
              {/* The Iconic Comma Fringe Arc */}
              <path
                d="M 138 100 C 150 92 188 95 192 118 C 195 132 180 144 168 138"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Swept Side Section */}
              <path
                d="M 136 100 Q 115 106 102 120"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />

              {/* Optical Balancing Vectors */}
              {showVectors && (
                <g>
                  {/* Inward Comma Arc Vector */}
                  <path
                    d="M 148 98 Q 185 102 172 135"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="2"
                    markerEnd="url(#hair-vector-arrow-accent)"
                  />
                  {/* Root Lift Vector on the 60% side */}
                  <line
                    x1="135"
                    y1="95"
                    x2="120"
                    y2="60"
                    stroke="#059669"
                    strokeWidth="1.75"
                    markerEnd="url(#hair-vector-arrow-emerald)"
                  />
                  {/* Eye-level Focus Point Dot */}
                  <circle cx="168" cy="138" r="2.5" fill="var(--accent)" />
                </g>
              )}
            </g>
          )}

          {key === "modern_crew" && (
            <g>
              {/* Cropped Textured Top */}
              <path
                d="M 98 105 C 98 68 122 62 160 62 C 198 62 222 68 222 105"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              {/* Upward textured crest strokes */}
              <path d="M 135 80 L 140 66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M 152 76 L 158 63" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M 168 76 L 172 63" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M 185 80 L 180 66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              {/* Subtle hairline upward flick */}
              <path
                d="M 115 110 Q 160 98 205 110"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              {/* High Skin Fade Sides */}
              <path d="M 98 105 L 94 150" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 3" strokeOpacity="0.6" />
              <path d="M 222 105 L 226 150" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 3" strokeOpacity="0.6" />

              {/* Optical Balancing Vectors */}
              {showVectors && (
                <g>
                  {/* Forward-Upward Texture Vector */}
                  <line
                    x1="160"
                    y1="96"
                    x2="160"
                    y2="66"
                    stroke="var(--accent)"
                    strokeWidth="2"
                    markerEnd="url(#hair-vector-arrow-accent)"
                  />
                  {/* High Fade Vertical Gradient Vectors */}
                  <line
                    x1="82"
                    y1="160"
                    x2="85"
                    y2="115"
                    stroke="#059669"
                    strokeWidth="1.75"
                    markerEnd="url(#hair-vector-arrow-emerald)"
                  />
                  <line
                    x1="238"
                    y1="160"
                    x2="235"
                    y2="115"
                    stroke="#059669"
                    strokeWidth="1.75"
                    markerEnd="url(#hair-vector-arrow-emerald)"
                  />
                </g>
              )}
            </g>
          )}

          {key === "pompadour_quiff" && (
            <g>
              {/* High Volume Pompadour Crown Roll */}
              <path
                d="M 98 108 C 98 55 118 32 160 32 C 202 32 222 55 222 108"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Dramatic Roll-Back Quiff Curves */}
              <path
                d="M 125 105 C 130 55 145 36 160 36 C 180 36 195 55 200 105"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M 140 98 Q 160 45 178 98"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              {/* Compressed Faded Sides */}
              <path d="M 98 108 L 92 155" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.7" />
              <path d="M 222 108 L 228 155" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.7" />

              {/* Optical Balancing Vectors */}
              {showVectors && (
                <g>
                  {/* High Vertical Root Lift Vector (+3-5 cm) */}
                  <line
                    x1="160"
                    y1="85"
                    x2="160"
                    y2="28"
                    stroke="var(--accent)"
                    strokeWidth="2.5"
                    markerEnd="url(#hair-vector-arrow-accent)"
                  />
                  {/* Roll-Back Sweeping Vector */}
                  <path
                    d="M 152 42 Q 170 32 182 52"
                    fill="none"
                    stroke="#059669"
                    strokeWidth="1.75"
                    markerEnd="url(#hair-vector-arrow-emerald)"
                  />
                  {/* Tight Side Compression Inward Vectors */}
                  <line
                    x1="70"
                    y1="130"
                    x2="88"
                    y2="130"
                    stroke="#059669"
                    strokeWidth="1.75"
                    markerEnd="url(#hair-vector-arrow-emerald)"
                  />
                  <line
                    x1="250"
                    y1="130"
                    x2="232"
                    y2="130"
                    stroke="#059669"
                    strokeWidth="1.75"
                    markerEnd="url(#hair-vector-arrow-emerald)"
                  />
                </g>
              )}
            </g>
          )}

          {key === "french_crop" && (
            <g>
              {/* Textured Top Silhouette */}
              <path
                d="M 96 112 C 96 65 120 58 160 58 C 200 58 224 65 224 112"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
              />
              {/* Forward Choppy Texture Strokes */}
              <path d="M 135 68 L 138 88" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M 152 64 L 154 92" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M 168 64 L 166 92" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M 185 68 L 182 88" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              {/* Horizontal Blunt Fringe Line across forehead */}
              <path
                d="M 115 116 L 205 116"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Optical Balancing Vectors */}
              {showVectors && (
                <g>
                  {/* Forward Directional Flow Vector */}
                  <line
                    x1="160"
                    y1="72"
                    x2="160"
                    y2="108"
                    stroke="var(--accent)"
                    strokeWidth="2"
                    markerEnd="url(#hair-vector-arrow-accent)"
                  />
                  {/* Horizontal Fringe Dividing Guideline */}
                  <line
                    x1="90"
                    y1="116"
                    x2="230"
                    y2="116"
                    stroke="var(--accent)"
                    strokeWidth="1.25"
                    strokeDasharray="3 3"
                  />
                  {/* Forehead Shortening Indicator Brackets */}
                  <path
                    d="M 85 98 L 82 107 L 85 116"
                    fill="none"
                    stroke="#059669"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M 235 98 L 238 107 L 235 116"
                    fill="none"
                    stroke="#059669"
                    strokeWidth="1.5"
                  />
                </g>
              )}
            </g>
          )}
        </>
      )}
    </svg>
  );
}

// -----------------------------------------------------------------------------
// Hairstyle Diagram Inline Thumbnail Component
// -----------------------------------------------------------------------------

export interface HairDiagramThumbnailProps {
  styleKey: string;
  title: string;
  onExpand: () => void;
  category?: "hair" | "beard";
}

export function HairDiagramThumbnail({ styleKey, title, onExpand, category }: HairDiagramThumbnailProps) {
  const asset = HAIR_ASSETS[styleKey];
  const [imgError, setImgError] = useState(false);
  const isBeard = category === "beard" || styleKey.includes("goatee") || styleKey.includes("stubble") || styleKey.includes("shave");

  return (
    <div className="mt-3 border border-line bg-surface p-3 rounded-control">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1 text-sm font-semibold text-ink">
          <Sparkles size={15} className="text-accent" />
          <span>{isBeard ? "สไตล์หนวดเคราจำลอง" : "ภาพจำลองทรงผม"}</span>
        </div>
        <span className="border border-line bg-paper px-2 py-1 text-sm text-ink-3 rounded-control">
          {isBeard ? "Facial Hair Lookbook" : "Optical Balancing"}
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
        aria-label={`คลิกเพื่อดูภาพขยายและสถาปัตยกรรมทรงผม ${title}`}
        className="group relative cursor-pointer overflow-hidden border border-line rounded-control bg-paper transition-all duration-200 hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
      >
        <div className="flex items-center justify-center max-h-[180px] overflow-hidden bg-paper">
          {asset && !imgError ? (
            <img
              src={asset.image}
              alt={asset.alt}
              onError={() => setImgError(true)}
              className="w-full h-[180px] object-cover object-top transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-[180px] flex items-center justify-center text-ink-3 text-sm">
              ภาพตัวอย่างสไตล์
            </div>
          )}
        </div>

        {/* Hover / Focus Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-ink/15 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
          <span className="flex items-center gap-2 border border-line bg-surface px-3 py-1 text-sm font-semibold text-ink rounded-control">
            <Maximize2 size={14} className="text-accent" />
            <span>แตะเพื่อขยาย</span>
          </span>
        </div>
      </div>

      {/* Caption & Quick Legend */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-ink-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-control bg-accent" />
            <span className="text-ink font-medium">ภาพผลลัพธ์จริง (After)</span>
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
// Hairstyle Diagram Modal Component (Radix Dialog)
// -----------------------------------------------------------------------------

export interface HairDiagramModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diagramKey?: string;
  title?: string;
  barberInstructions?: string;
  category?: "hair" | "beard";
}

export function HairDiagramModal({
  open,
  onOpenChange,
  diagramKey = "",
  title = "",
  barberInstructions,
  category,
}: HairDiagramModalProps) {
  const [viewMode, setViewMode] = useState<"compare" | "vectors" | "result" | "lookbook">("compare");
  const [copied, setCopied] = useState(false);
  const asset = HAIR_ASSETS[diagramKey];
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (open) {
      setViewMode("compare");
      setCopied(false);
      setImgError(false);
    }
  }, [open, diagramKey]);

  if (!diagramKey && !title) return null;

  const meta = getHairMetadata(diagramKey, title);
  const isBeard = category === "beard" || diagramKey.includes("goatee") || diagramKey.includes("stubble") || diagramKey.includes("shave");

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
                <span className="border border-line bg-paper px-2 py-1 text-sm font-medium rounded-control text-accent">
                  {isBeard ? "Beard Grooming" : "Optical Balancing"}
                </span>
                <span className="border border-line bg-paper px-2 py-1 text-sm text-ink-3 rounded-control">
                  {isBeard ? "ภาพจำลองจัดแต่งหนวดเครา" : "ภาพจำลองสถาปัตยกรรมทรงผม"}
                </span>
              </div>
              <Dialog.Title className="text-lg font-semibold text-ink">
                {title || meta.titleTh}
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

          {/* High-Resolution Photorealistic Lookbook Image */}
          <div className="mt-4 border border-line bg-paper p-3 rounded-control flex flex-col items-center justify-center">
            {asset ? (
              <img
                src={asset.image}
                alt={asset.alt}
                className="w-full max-h-[420px] object-contain rounded-control border border-line bg-surface"
              />
            ) : (
              <div className="w-full h-[240px] flex items-center justify-center text-ink-3 text-sm">
                ไม่พบภาพตัวอย่าง
              </div>
            )}
            <div className="mt-2 flex items-center justify-between w-full text-sm text-ink-3">
              <span className="flex items-center gap-1 font-medium text-ink">
                <span className="inline-block w-2 h-2 rounded-control bg-accent" />
                <span>ภาพตัวอย่างผลลัพธ์จริง (After Lookbook)</span>
              </span>
            </div>
          </div>

          {/* Barber Instructions Section */}
          {barberInstructions && (
            <div className="mt-4 border border-line bg-surface p-3 rounded-control">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-accent">
                  <Scissors size={15} />
                  <span>คำสั่งสำหรับบอกช่าง (Barber Instructions)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(barberInstructions);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-2 py-1 text-sm border border-line rounded-control bg-paper text-ink hover:text-accent cursor-pointer flex items-center gap-1"
                >
                  {copied ? "คัดลอกแล้ว ✓" : "คัดลอกข้อความ"}
                </button>
              </div>
              <p className="text-sm text-ink-2 mt-1">{barberInstructions}</p>
            </div>
          )}

          {/* Balancing Role / Benefit */}
          <div className="mt-4 border border-line bg-surface p-3 rounded-control">
            <span className="text-sm font-semibold text-ink">จุดเด่นในการเสริมโครงหน้า:</span>
            <p className="mt-1 text-sm text-ink-2">{meta.balancingRoleTh}</p>
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
