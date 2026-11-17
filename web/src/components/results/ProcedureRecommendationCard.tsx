import { Sliders, Sparkles } from "lucide-react";
import type { ProcedureRecommendation } from "../../api/schemas";
import { Button } from "../ui/Button";

interface Props {
  recommendations?: ProcedureRecommendation[] | null;
  onOpenSimulation?: () => void;
}

export const PROCEDURE_TITLES: Record<string, string> = {
  chin_augmentation: "ปรับมิติปลายคาง (Chin Augmentation)",
  lip_augmentation: "ปรับมิติมุมปากและริมฝีปาก (Lip Augmentation)",
  rhinoplasty: "ปรับแต่งทรงจมูก (Rhinoplasty)",
  botulinum_toxin_masseter: "โบท็อกซ์ลดกราม ปรับรูปหน้าเรียว (Masseter Botulinum Toxin)",
  botulinum_toxin_wrinkles: "โบท็อกซ์ริ้วรอยส่วนบน (Upper-Face Anti-Wrinkle Botox)",
  hyaluronic_acid_filler_nasolabial: "ฟิลเลอร์เติมเต็มร่องแก้ม (Nasolabial Fold Filler)",
  hyaluronic_acid_filler_temple: "ฟิลเลอร์เติมเต็มขมับตอบ (Temporal Volume Restoration)",
  skin_tightening: "ยกกระชับด้วยคลื่นพลังงาน (HIFU / Ultherapy / RF)",
  thread_lift: "ร้อยไหมพยุงกรอบหน้า (Barbed Thread Lift)",
  mandibular_contouring: "ศัลยกรรมตัดแต่งมุมกราม (Mandibular Angle Ostectomy)",
  orthognathic_surgery: "ศัลยกรรมเลื่อนขากรรไกร (Orthognathic Surgery)",
  surgical_facelift: "ศัลยกรรมยกกระชับดึงหน้า (Surgical Rhytidectomy)",
};

export const RATIONALE_TH: Record<string, string> = {
  "Lip vermilion fullness and sagittal projection are within reference ranges.":
    "ความหนาและมิติความนูนของริมฝีปากอยู่ในเกณฑ์อ้างอิงที่ได้สัดส่วนสมดุลแล้ว",
  "Chin projection and vertical proportions are within reference ranges.":
    "มิติความยาวคางและสัดส่วนใบหน้าส่วนล่างอยู่ในเกณฑ์อ้างอิงที่ได้สัดส่วนสมดุลแล้ว",
  "Nasal proportions, tip rotation, and projection are within reference ranges.":
    "มิติสัดส่วนทรงจมูก ปลายจมูก และความพุ่งอยู่ในเกณฑ์อ้างอิงที่ได้สัดส่วนสมดุลแล้ว",
  "Nasal proportions and tip projection are within reference ranges.":
    "มิติความกว้างและปลายจมูกอยู่ในเกณฑ์อ้างอิงที่ได้สัดส่วนสมดุลแล้ว",
  "Mandibular angle width and masseter volume are in harmony with facial proportions.":
    "มิติมุมขากรรไกรและขนาดกล้ามเนื้อกรามอยู่ในเกณฑ์สมดุลตามสัดส่วนใบหน้าแล้ว",
  "Upper face dynamic vectors and brow contours display smooth, harmonious muscular tone.":
    "มิติการเคลื่อนไหวและแรงตึงตัวของกล้ามเนื้อส่วนบนอยู่ในเกณฑ์ราบเรียบสมดุลแล้ว",
  "Nasolabial fold contours and pyriform aperture projection are youthfully supported without soft-tissue deficit.":
    "ร่องแก้มและฐานกระดูกข้างปีกจมูกมีความอิ่มเอิบ ไม่พบการยุบตัวของชั้นไขมัน",
  "Temporal fossa volume and bitemporal contour are in balanced anatomical proportion.":
    "มิติความกว้างของขมับและเนื้อเยื่อส่วนบนอยู่ในเกณฑ์สมดุล ไม่พบภาวะขมับตอบ",
  "Bony mandibular angle and basal bone dimensions are balanced without structural skeletal flare.":
    "โครงสร้างกระดูกขากรรไกรล่างและมุมกรามได้รูปสมดุล ไม่พบกระดูกกรามผายกว้างผิดปกติ",
  "Skeletal and occlusal relationships display harmonic Class I alignment without indication for orthognathic surgical intervention.":
    "ความสัมพันธ์ของกระดูกขากรรไกรและการสบฟันอยู่ในเกณฑ์ Class I ปกติ ไม่มีข้อบ่งชี้สำหรับการผ่าตัดเลื่อนขากรรไกร",
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
  s = s.replace(/Nasolabial fold contours and pyriform aperture projection are youthfully supported without soft-tissue deficit\./g, "ร่องแก้มและฐานกระดูกข้างปีกจมูกมีความอิ่มเอิบ ไม่พบการยุบตัวของชั้นไขมัน");
  s = s.replace(/Temporal fossa volume and bitemporal contour are in balanced anatomical proportion\./g, "มิติความกว้างของขมับและเนื้อเยื่อส่วนบนอยู่ในเกณฑ์สมดุล ไม่พบภาวะขมับตอบ");
  s = s.replace(/Bony mandibular angle and basal bone dimensions are balanced without structural skeletal flare\./g, "โครงสร้างกระดูกขากรรไกรล่างและมุมกรามได้รูปสมดุล ไม่พบกระดูกกรามผายกว้างผิดปกติ");
  s = s.replace(/Skeletal and occlusal relationships display harmonic Class I alignment without indication for orthognathic surgical intervention\./g, "ความสัมพันธ์ของกระดูกขากรรไกรและการสบฟันอยู่ในเกณฑ์ Class I ปกติ ไม่มีข้อบ่งชี้สำหรับการผ่าตัดเลื่อนขากรรไกร");

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
    /Very acute gonial angle \(([^)]+)°\) indicates severe bony mandibular angle prominence and square jaw deformity; ostectomy or contouring surgery provides definitive bony reduction\./g,
    "มุมกรามแคบมาก ($1°) บ่งชี้กระดูกมุมกรามผายยื่นชัดเจนจนเกิดรูปหน้าเหลี่ยม การผ่าตัดตัดแต่งมุมกรามจะช่วยลดขนาดกระดูกได้อย่างถาวร"
  );
  s = s.replace(
    /Marked hypodivergent pattern \(FMA: ([^)]+)°\) demonstrates thick bony mandibular base beyond muscular correction alone\./g,
    "โครงสร้างกระดูกขากรรไกรหนาตัวเด่นชัด (FMA: $1°) ซึ่งเกินกว่าการแก้ไขด้วยการฉีดโบท็อกซ์เพียงอย่างเดียว"
  );

  // Wrinkle Botox
  s = s.replace(
    /Upper facial third proportion \(F1: ([^)]+)\) indicates dynamic frontalis muscular strain in forehead region\./g,
    "สัดส่วนใบหน้าส่วนบน (F1: $1) สัมพันธ์กับการทำงานหนักของกล้ามเนื้อหน้าผาก (Frontalis) ทำให้เกิดริ้วรอยแนวนอน"
  );
  s = s.replace(
    /Upper facial third proportion \(F1: ([^)]+)\) indicates corrugator supercilii hyperactivity with deep glabellar furrowing\./g,
    "สัดส่วนใบหน้าส่วนบน (F1: $1) สัมพันธ์กับการเกร็งตัวของกล้ามเนื้อหัวคิ้ว (Corrugator) ทำให้เกิดริ้วรอยขมวดคิ้วลึก"
  );
  s = s.replace(
    /Brow apex vertical height asymmetry \(([^)]+)\) suggests differential frontalis\/orbicularis muscle tone\./g,
    "ระดับความสูงยอดคิ้วไม่สมมาตร ($1) จากความตึงตัวของกล้ามเนื้อสองข้างที่ไม่เท่ากัน"
  );
  s = s.replace(
    /Brow medial head vertical offset \(([^)]+)px\) indicates asymmetric corrugator and depressor supercilii dynamic pull\./g,
    "ตำแหน่งหัวคิ้วสองข้างเหลื่อมล้ำ ($1px) จากแรงดึงของกล้ามเนื้อรอบคิ้วไม่เท่ากัน"
  );
  s = s.replace(
    /Steep nasofrontal angle \(P1: ([^)]+)°\) with acute P5 \(([^)]+)°\) indicates prominent procerus furrowing\./g,
    "มุมหัวตาสันจมูก (P1: $1°) ร่วมกับมุมหัวคิ้ว (P5: $2°) บ่งชี้ริ้วรอยย่นสันจมูกจากกล้ามเนื้อ Procerus"
  );

  // HA Fillers (Nasolabial & Temple)
  s = s.replace(
    /Deep nasolabial fold depth score \(([^)]+)%\) warrants structural deep-bolus hyaluronic acid filler\./g,
    "ร่องแก้มลึก ($1%) มีข้อบ่งชี้ในการฉีดฟิลเลอร์ไฮยาลูโรนิกแอซิดชั้นลึกเพื่อพยุงร่องแก้ม"
  );
  s = s.replace(
    /Midface soft-tissue laxity \(([^)]+)%\) with descending malar fat pad deepens nasolabial creases\./g,
    "ความหย่อนคล้อยของเนื้อเยื่อใบหน้าส่วนกลาง ($1%) ร่วมกับการคล้อยตัวของก้อนไขมันแก้มส่งผลให้ร่องแก้มดูลึกขึ้น"
  );
  s = s.replace(
    /Acute nasolabial angle \(P2: ([^)]+)°\) with alar crease depression indicates sub-alar pyriform aperture volume deficiency\./g,
    "มุมจมูก-ริมฝีปาก (P2: $1°) ร่วมกับรอยบุ๋มข้างปีกจมูก บ่งชี้การยุบตัวของกระดูกฐานปีกจมูก (Pyriform aperture)"
  );
  s = s.replace(
    /Cephalometric maxillary retrusion indicates deficient skeletal pyriform support requiring deep structural filler boluses\./g,
    "กระดูกขากรรไกรบนถอยร่น ขาดแรงพยุงโครงสร้างฐานปีกจมูก เหมาะกับการฉีดฟิลเลอร์หนุนกระดูกชั้นลึก"
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

export function ProcedureRecommendationCard({ recommendations, onOpenSimulation }: Props) {
  if (!recommendations || recommendations.length === 0) return null;

  // Sort descending by recommendation intensity / priority percentage
  const sorted = [...recommendations].sort((a, b) => b.intensity - a.intensity);

  return (
    <div className="border border-line bg-surface p-4 overflow-hidden break-words">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent" />
          <div>
            <h3 className="text-sm font-semibold text-ink">
              ข้อเสนอแนะหัตถการความงาม (Aesthetic Recommendations)
            </h3>
            <p className="text-sm text-ink-2">
              เรียงลำดับความจำเป็นตามการวิเคราะห์สัดส่วนใบหน้า โครงสร้างกระดูก และความหย่อนคล้อย
            </p>
          </div>
        </div>
        <span className="border border-line bg-paper px-2 py-1 text-sm text-ink-2">
          AI Suggested
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {sorted.map((rec) => {
          const title = PROCEDURE_TITLES[rec.procedure] ?? rec.procedure;
          const pct = Math.round(rec.intensity * 100);
          const isRecommended = rec.intensity > 0;

          return (
            <div key={rec.procedure} className="border border-line bg-paper p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">{title}</span>
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

              {isRecommended && (
                <div className="mt-2 h-2 w-full bg-line overflow-hidden">
                  <div
                    className="h-2 bg-accent transition-all"
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
                      className="border border-line bg-surface px-2 py-1 text-sm text-ink-2"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {onOpenSimulation && (
        <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-t border-line pt-3">
          <p className="text-sm text-ink-2">
            ทดลองจำลองการปรับแต่งรูปทรงใบหน้าตามสัดส่วนที่แนะนำ
          </p>
          <Button variant="secondary" onClick={onOpenSimulation}>
            <Sliders size={16} className="text-accent" />
            <span>ทดลองจำลองใบหน้า</span>
          </Button>
        </div>
      )}
    </div>
  );
}
