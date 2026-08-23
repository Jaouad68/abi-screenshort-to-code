export type BodySystem =
  | "Cardiovascular"
  | "Nervous"
  | "Respiratory"
  | "Digestive"
  | "Urinary"
  | "Sensory"
  | "Endocrine"
  | "Integumentary";

export interface KeyFact {
  label: "Size" | "Weight" | "Daily" | "Location" | "Blood supply" | "Function";
  value: string;
}

export interface Hotspot {
  id: string;
  label: string;
  description: string;
  /** Local-space position relative to the organ group's origin. */
  position: [number, number, number];
}

export interface ClinicalNote {
  condition: string;
  description: string;
}

export interface MicroscopicView {
  tissueType: string;
  cellTypes: string[];
  funFact: string;
}

export interface Organ {
  id: string;
  name: string;
  system: BodySystem;
  tagline: string;
  description: string;
  keyFacts: KeyFact[];
  medicalImportance: string;
  didYouKnow: string;
  /** Base hex color used for the 3D material and UI accents. */
  color: string;
  hotspots: Hotspot[];
  microscopic: MicroscopicView;
  clinicalNotes: ClinicalNote[];
  /** Approximate position on a full-body silhouette, in percent (0-100). */
  bodyPosition: { x: number; y: number };
}

export const organs: Organ[] = [
  {
    id: "heart",
    name: "Heart",
    system: "Cardiovascular",
    tagline: "The tireless pump",
    description:
      "A muscular organ that pumps blood throughout the body, delivering oxygen and nutrients to every cell.",
    keyFacts: [
      { label: "Size", value: "About the size of a clenched fist" },
      { label: "Weight", value: "250 - 350 g" },
      { label: "Daily", value: "~100,000 beats, ~7,500 L of blood pumped" },
      { label: "Location", value: "Slightly left of center, between the lungs" },
      { label: "Blood supply", value: "Left and right coronary arteries" },
      { label: "Function", value: "Circulates blood through four chambers and valves" },
    ],
    medicalImportance:
      "Its rhythm is set by the sinoatrial node's electrical signals; disruption causes arrhythmias, and blocked coronary arteries can trigger a heart attack.",
    didYouKnow:
      "Over an average lifetime your heart beats roughly 2.5 billion times, without ever truly resting between beats.",
    color: "#c0433c",
    hotspots: [
      {
        id: "heart-right-atrium",
        label: "Right atrium",
        description: "Receives deoxygenated blood returning from the body via the vena cavae.",
        position: [0.55, 0.55, 0.3],
      },
      {
        id: "heart-left-ventricle",
        label: "Left ventricle",
        description: "The thickest chamber; pumps oxygenated blood into the aorta and out to the body.",
        position: [-0.3, -0.4, 0.4],
      },
      {
        id: "heart-aorta",
        label: "Aorta",
        description: "The body's largest artery, carrying oxygen-rich blood away from the heart.",
        position: [0.1, 1.05, 0],
      },
      {
        id: "heart-coronary",
        label: "Coronary arteries",
        description: "Supply oxygen-rich blood to the heart muscle itself.",
        position: [0.2, 0.2, 0.75],
      },
    ],
    microscopic: {
      tissueType: "Cardiac muscle (myocardium)",
      cellTypes: ["Cardiomyocytes", "Purkinje fibers", "Cardiac fibroblasts"],
      funFact:
        "Cardiomyocytes are locked together by intercalated discs, letting electrical signals spread almost instantly for a synchronized contraction.",
    },
    clinicalNotes: [
      {
        condition: "Myocardial infarction",
        description: "A blocked coronary artery starves heart muscle of oxygen, causing tissue damage.",
      },
      {
        condition: "Arrhythmia",
        description: "Abnormal electrical signaling causes the heart to beat too fast, too slow, or irregularly.",
      },
      {
        condition: "Heart failure",
        description: "The heart can no longer pump efficiently enough to meet the body's needs.",
      },
    ],
    bodyPosition: { x: 50, y: 30 },
  },
  {
    id: "brain",
    name: "Brain",
    system: "Nervous",
    tagline: "Command center of the body",
    description:
      "Coordinates thought, movement, and sensation through a network of roughly 86 billion neurons.",
    keyFacts: [
      { label: "Size", value: "~15 cm long" },
      { label: "Weight", value: "1.3 - 1.4 kg" },
      { label: "Daily", value: "Uses ~20% of the body's energy at rest" },
      { label: "Location", value: "Cranial cavity, protected by skull and meninges" },
      { label: "Blood supply", value: "Internal carotid and vertebral arteries (Circle of Willis)" },
      { label: "Function", value: "Processes sensation, movement, cognition, and memory" },
    ],
    medicalImportance:
      "Blood flow interruptions cause strokes within minutes; because neurons rarely regenerate, rapid treatment is critical to limit lasting damage.",
    didYouKnow:
      "The brain itself has no pain receptors — brain surgery can be performed on an awake patient without them feeling the incision.",
    color: "#d98b8b",
    hotspots: [
      {
        id: "brain-frontal",
        label: "Frontal lobe",
        description: "Governs reasoning, planning, movement, and personality.",
        position: [0, 0.55, 0.7],
      },
      {
        id: "brain-cerebellum",
        label: "Cerebellum",
        description: "Fine-tunes balance, coordination, and motor timing.",
        position: [0, -0.35, -0.75],
      },
      {
        id: "brain-brainstem",
        label: "Brainstem",
        description: "Regulates breathing, heart rate, and consciousness.",
        position: [0, -0.75, -0.1],
      },
      {
        id: "brain-hippocampus",
        label: "Hippocampus",
        description: "Central to forming new long-term memories.",
        position: [0.5, -0.1, 0.1],
      },
    ],
    microscopic: {
      tissueType: "Nervous tissue (grey and white matter)",
      cellTypes: ["Neurons", "Astrocytes", "Oligodendrocytes", "Microglia"],
      funFact: "The brain contains an estimated 100 trillion synaptic connections between neurons.",
    },
    clinicalNotes: [
      { condition: "Stroke", description: "Interrupted blood flow deprives brain tissue of oxygen, killing cells within minutes." },
      { condition: "Alzheimer's disease", description: "Progressive neurodegeneration that impairs memory and cognition." },
      { condition: "Epilepsy", description: "Abnormal electrical activity causes recurrent seizures." },
    ],
    bodyPosition: { x: 50, y: 6 },
  },
  {
    id: "lungs",
    name: "Lungs",
    system: "Respiratory",
    tagline: "The gas-exchange engine",
    description:
      "A pair of spongy organs that exchange oxygen and carbon dioxide between the air we breathe and the bloodstream.",
    keyFacts: [
      { label: "Size", value: "~25 cm tall each" },
      { label: "Weight", value: "Right ~450 g, left ~400 g" },
      { label: "Daily", value: "~20,000 breaths, ~11,000 L of air moved" },
      { label: "Location", value: "Thoracic cavity, flanking the heart" },
      { label: "Blood supply", value: "Pulmonary arteries and veins" },
      { label: "Function", value: "Gas exchange across ~480 million alveoli" },
    ],
    medicalImportance:
      "Chronic exposure to smoke or pollutants damages alveoli and airways, reducing the surface area available for oxygen exchange.",
    didYouKnow:
      "The right lung has three lobes while the left has only two, leaving room for the heart.",
    color: "#e0a6a1",
    hotspots: [
      {
        id: "lungs-right",
        label: "Right lung",
        description: "Three lobes: superior, middle, and inferior.",
        position: [0.55, 0.1, 0.2],
      },
      {
        id: "lungs-left",
        label: "Left lung",
        description: "Two lobes, smaller to make space for the heart.",
        position: [-0.55, 0.1, 0.2],
      },
      {
        id: "lungs-trachea",
        label: "Trachea",
        description: "The windpipe that splits into the two main bronchi.",
        position: [0, 1.0, 0.1],
      },
      {
        id: "lungs-alveoli",
        label: "Alveoli",
        description: "Tiny air sacs where oxygen and carbon dioxide are exchanged with the blood.",
        position: [0.3, -0.5, 0.4],
      },
    ],
    microscopic: {
      tissueType: "Alveolar epithelium",
      cellTypes: ["Type I pneumocytes", "Type II pneumocytes", "Alveolar macrophages"],
      funFact: "Fully unfolded, the alveolar surface of both lungs covers roughly the area of a tennis court.",
    },
    clinicalNotes: [
      { condition: "Asthma", description: "Airway inflammation and constriction narrow the bronchi, restricting airflow." },
      { condition: "COPD", description: "Progressive damage to airways and alveoli reduces lung capacity over time." },
      { condition: "Pneumonia", description: "Infection fills alveoli with fluid, impairing gas exchange." },
    ],
    bodyPosition: { x: 50, y: 28 },
  },
  {
    id: "liver",
    name: "Liver",
    system: "Digestive",
    tagline: "The body's chemical factory",
    description:
      "The largest internal organ, responsible for metabolism, detoxification, and producing the bile that digests fat.",
    keyFacts: [
      { label: "Size", value: "~15 cm across" },
      { label: "Weight", value: "~1.5 kg" },
      { label: "Daily", value: "Filters ~1.5 L of blood every minute" },
      { label: "Location", value: "Upper right abdomen, under the diaphragm" },
      { label: "Blood supply", value: "Hepatic artery and hepatic portal vein" },
      { label: "Function", value: "Metabolism, detoxification, bile and protein production" },
    ],
    medicalImportance:
      "The liver can regenerate up to 50% of its mass within weeks of injury, but repeated damage from alcohol or infection leads to permanent scarring (cirrhosis).",
    didYouKnow:
      "It performs over 500 distinct functions, from storing glycogen to producing most of the proteins in blood plasma.",
    color: "#8a4a3a",
    hotspots: [
      {
        id: "liver-right-lobe",
        label: "Right lobe",
        description: "The larger of the liver's two main lobes.",
        position: [0.5, 0, 0.2],
      },
      {
        id: "liver-left-lobe",
        label: "Left lobe",
        description: "Smaller lobe, positioned toward the stomach.",
        position: [-0.5, 0.1, 0.3],
      },
      {
        id: "liver-gallbladder",
        label: "Gallbladder",
        description: "Stores and concentrates bile produced by the liver.",
        position: [0.35, -0.55, 0.5],
      },
      {
        id: "liver-portal-vein",
        label: "Portal vein",
        description: "Carries nutrient-rich blood from the intestines to the liver for processing.",
        position: [0, -0.2, -0.4],
      },
    ],
    microscopic: {
      tissueType: "Hepatic lobules",
      cellTypes: ["Hepatocytes", "Kupffer cells", "Stellate cells"],
      funFact: "Hepatocytes are arranged in hexagonal lobules radiating around a central vein, the liver's functional unit.",
    },
    clinicalNotes: [
      { condition: "Cirrhosis", description: "Chronic damage replaces healthy tissue with scar tissue, impairing function." },
      { condition: "Hepatitis", description: "Viral infection or toxins inflame liver tissue." },
      { condition: "Fatty liver disease", description: "Excess fat accumulation in hepatocytes impairs liver function." },
    ],
    bodyPosition: { x: 58, y: 40 },
  },
  {
    id: "kidneys",
    name: "Kidneys",
    system: "Urinary",
    tagline: "The master filters",
    description:
      "A pair of bean-shaped organs that filter waste from the blood and balance the body's fluids and electrolytes.",
    keyFacts: [
      { label: "Size", value: "~11 cm, roughly fist-sized" },
      { label: "Weight", value: "~150 g each" },
      { label: "Daily", value: "Filters ~180 L of blood, produces 1 - 2 L of urine" },
      { label: "Location", value: "Either side of the spine, below the ribcage" },
      { label: "Blood supply", value: "Renal arteries (~20-25% of cardiac output)" },
      { label: "Function", value: "Filtration, fluid balance, and blood pressure regulation" },
    ],
    medicalImportance:
      "Kidneys also produce erythropoietin, the hormone that signals bone marrow to make red blood cells, linking kidney health to anemia risk.",
    didYouKnow:
      "Each kidney contains about one million nephrons, its microscopic filtering units.",
    color: "#7a3b52",
    hotspots: [
      {
        id: "kidneys-cortex",
        label: "Renal cortex",
        description: "The outer region, dense with filtering nephrons.",
        position: [0.2, 0.4, 0.3],
      },
      {
        id: "kidneys-medulla",
        label: "Renal medulla",
        description: "The inner region that concentrates urine.",
        position: [0, -0.1, 0],
      },
      {
        id: "kidneys-nephron",
        label: "Nephrons",
        description: "Roughly one million per kidney, each filtering blood plasma.",
        position: [-0.3, 0.2, 0.4],
      },
      {
        id: "kidneys-ureter",
        label: "Ureter",
        description: "Carries urine from the kidney to the bladder.",
        position: [0, -0.9, 0],
      },
    ],
    microscopic: {
      tissueType: "Renal parenchyma",
      cellTypes: ["Podocytes", "Tubular epithelial cells", "Mesangial cells"],
      funFact: "Laid end to end, the tubules of all the nephrons in both kidneys would stretch about 80 kilometers.",
    },
    clinicalNotes: [
      { condition: "Kidney stones", description: "Mineral deposits crystallize in the urinary tract, causing severe pain." },
      { condition: "Chronic kidney disease", description: "Progressive loss of filtering function over months or years." },
      { condition: "Pyelonephritis", description: "Bacterial infection of the kidney, often ascending from the bladder." },
    ],
    bodyPosition: { x: 50, y: 42 },
  },
  {
    id: "eye",
    name: "Eye",
    system: "Sensory",
    tagline: "Window to the world",
    description:
      "A finely tuned optical organ that converts light into the neural signals the brain interprets as sight.",
    keyFacts: [
      { label: "Size", value: "~24 mm in diameter" },
      { label: "Weight", value: "~7 - 8 g" },
      { label: "Daily", value: "Blinks ~15,000 - 20,000 times" },
      { label: "Location", value: "Orbital socket of the skull" },
      { label: "Blood supply", value: "Ophthalmic artery" },
      { label: "Function", value: "Phototransduction of light into neural signals" },
    ],
    medicalImportance:
      "The retina's photoreceptors have no capacity to regenerate once lost, which is why conditions like glaucoma cause irreversible vision loss if untreated.",
    didYouKnow:
      "Each eye holds about 120 million rod cells for low-light vision and 6 million cone cells for color vision.",
    color: "#3f7a8c",
    hotspots: [
      {
        id: "eye-cornea",
        label: "Cornea",
        description: "The clear front surface that provides most of the eye's focusing power.",
        position: [0, 0, 0.95],
      },
      {
        id: "eye-lens",
        label: "Lens",
        description: "Fine-tunes focus by changing shape for near and far objects.",
        position: [0, 0, 0.4],
      },
      {
        id: "eye-retina",
        label: "Retina",
        description: "Light-sensitive layer lining the back of the eye, containing photoreceptors.",
        position: [0, 0, -0.9],
      },
      {
        id: "eye-optic-nerve",
        label: "Optic nerve",
        description: "Carries visual signals from the retina to the brain.",
        position: [0.2, -0.1, -1.1],
      },
    ],
    microscopic: {
      tissueType: "Neural retina",
      cellTypes: ["Rod photoreceptors", "Cone photoreceptors", "Retinal pigment epithelium"],
      funFact: "The retina processes the equivalent of about 36,000 bits of visual information every hour.",
    },
    clinicalNotes: [
      { condition: "Myopia", description: "The eyeball is too long, focusing distant images in front of the retina." },
      { condition: "Cataracts", description: "The lens becomes progressively cloudy, blurring vision." },
      { condition: "Glaucoma", description: "Elevated eye pressure damages the optic nerve, often painlessly." },
    ],
    bodyPosition: { x: 50, y: 5 },
  },
  {
    id: "intestine",
    name: "Intestine",
    system: "Digestive",
    tagline: "The nutrient highway",
    description:
      "A long, coiled tube that absorbs nutrients from digested food and reclaims water before waste is eliminated.",
    keyFacts: [
      { label: "Size", value: "Small intestine ~6-7 m, large intestine ~1.5 m" },
      { label: "Weight", value: "~2 kg combined" },
      { label: "Daily", value: "Food transit takes roughly 24 - 72 hours" },
      { label: "Location", value: "Coiled through the abdominal cavity" },
      { label: "Blood supply", value: "Superior and inferior mesenteric arteries" },
      { label: "Function", value: "Nutrient absorption and water reclamation" },
    ],
    medicalImportance:
      "The gut lining hosts most of the body's immune tissue, and its resident microbiome influences digestion, immunity, and even mood.",
    didYouKnow:
      "The small intestine's inner surface is covered in finger-like villi that, unfolded, would cover roughly the area of a tennis court.",
    color: "#c58a4f",
    hotspots: [
      {
        id: "intestine-duodenum",
        label: "Duodenum",
        description: "The first, shortest segment, where bile and pancreatic enzymes join digestion.",
        position: [0.4, 0.5, 0.2],
      },
      {
        id: "intestine-jejunum-ileum",
        label: "Jejunum & ileum",
        description: "The main sites of nutrient absorption in the small intestine.",
        position: [0, 0, 0.3],
      },
      {
        id: "intestine-colon",
        label: "Colon",
        description: "Reabsorbs water and forms waste into stool.",
        position: [-0.4, 0.4, -0.3],
      },
      {
        id: "intestine-appendix",
        label: "Appendix",
        description: "A small pouch attached to the colon, thought to help maintain gut bacteria.",
        position: [-0.35, -0.6, 0.2],
      },
    ],
    microscopic: {
      tissueType: "Intestinal mucosa",
      cellTypes: ["Enterocytes", "Goblet cells", "Paneth cells"],
      funFact: "The gut microbiome living in the intestine comprises tens of trillions of bacteria.",
    },
    clinicalNotes: [
      { condition: "Irritable bowel syndrome", description: "Chronic changes in bowel habits without visible structural damage." },
      { condition: "Crohn's disease", description: "Chronic inflammation that can affect any part of the digestive tract." },
      { condition: "Appendicitis", description: "Inflammation of the appendix, often requiring surgical removal." },
    ],
    bodyPosition: { x: 50, y: 52 },
  },
  {
    id: "pancreas",
    name: "Pancreas",
    system: "Endocrine",
    tagline: "The dual-duty gland",
    description:
      "A gland behind the stomach that produces digestive enzymes and the hormones insulin and glucagon.",
    keyFacts: [
      { label: "Size", value: "~15 cm long" },
      { label: "Weight", value: "~70 - 100 g" },
      { label: "Daily", value: "Secretes ~1.5 L of digestive enzymes" },
      { label: "Location", value: "Behind the stomach, upper abdomen" },
      { label: "Blood supply", value: "Branches of the splenic and mesenteric arteries" },
      { label: "Function", value: "Digestive enzyme secretion and blood sugar regulation" },
    ],
    medicalImportance:
      "The islets of Langerhans make up only about 1-2% of the pancreas by volume, yet their insulin and glucagon output governs blood sugar throughout the body.",
    didYouKnow:
      "The pancreas produces enough digestive enzymes each day to break down its own tissue, held in check only by protective inhibitors.",
    color: "#d9a441",
    hotspots: [
      {
        id: "pancreas-head",
        label: "Head",
        description: "The widest part, nestled against the duodenum.",
        position: [0.55, 0.1, 0.1],
      },
      {
        id: "pancreas-body",
        label: "Body",
        description: "The middle section, running behind the stomach.",
        position: [0, 0.05, 0.1],
      },
      {
        id: "pancreas-tail",
        label: "Tail",
        description: "The narrow end, reaching toward the spleen.",
        position: [-0.6, 0.1, -0.1],
      },
      {
        id: "pancreas-islets",
        label: "Islets of Langerhans",
        description: "Clusters of hormone-producing cells, including insulin-secreting beta cells.",
        position: [0.1, 0.25, 0.15],
      },
    ],
    microscopic: {
      tissueType: "Exocrine and endocrine pancreatic tissue",
      cellTypes: ["Acinar cells", "Alpha cells", "Beta cells"],
      funFact: "Beta cells within the islets are the body's only source of insulin.",
    },
    clinicalNotes: [
      { condition: "Diabetes mellitus", description: "Insufficient insulin production or response impairs blood sugar control." },
      { condition: "Pancreatitis", description: "Inflammation, often from digestive enzymes activating prematurely." },
      { condition: "Pancreatic cancer", description: "Tumors that are often diagnosed late due to few early symptoms." },
    ],
    bodyPosition: { x: 46, y: 39 },
  },
  {
    id: "skin",
    name: "Skin",
    system: "Integumentary",
    tagline: "The body's largest organ",
    description:
      "A protective, multi-layered barrier that regulates temperature, senses the environment, and shields internal tissues.",
    keyFacts: [
      { label: "Size", value: "~1.5 - 2 m² of surface area" },
      { label: "Weight", value: "~4 kg, roughly 16% of body weight" },
      { label: "Daily", value: "Sheds tens of thousands of dead cells per minute" },
      { label: "Location", value: "Covers the entire external body" },
      { label: "Blood supply", value: "Dense dermal capillary networks" },
      { label: "Function", value: "Barrier protection, thermoregulation, and sensation" },
    ],
    medicalImportance:
      "As the body's first line of defense, broken skin dramatically raises infection risk, which is why burns and large wounds are treated so urgently.",
    didYouKnow:
      "The epidermis fully renews itself roughly every 27 days, replacing nearly the entire outer layer each month.",
    color: "#e6b98c",
    hotspots: [
      {
        id: "skin-epidermis",
        label: "Epidermis",
        description: "The thin, outermost layer that forms the body's waterproof barrier.",
        position: [0, 0.3, 0.5],
      },
      {
        id: "skin-dermis",
        label: "Dermis",
        description: "Contains blood vessels, nerves, and collagen that give skin its strength and elasticity.",
        position: [0, 0, 0.2],
      },
      {
        id: "skin-hypodermis",
        label: "Hypodermis",
        description: "The fatty layer beneath the dermis that cushions and insulates the body.",
        position: [0, -0.3, -0.2],
      },
      {
        id: "skin-follicle",
        label: "Hair follicle",
        description: "The structure that grows and anchors each hair.",
        position: [0.35, 0.2, 0.45],
      },
    ],
    microscopic: {
      tissueType: "Stratified squamous epithelium",
      cellTypes: ["Keratinocytes", "Melanocytes", "Langerhans cells"],
      funFact: "Melanocytes produce the pigment melanin, which determines skin color and helps absorb UV radiation.",
    },
    clinicalNotes: [
      { condition: "Eczema", description: "Chronic inflammation causes dry, itchy, irritated patches." },
      { condition: "Psoriasis", description: "An autoimmune condition speeds skin cell turnover, forming scaly plaques." },
      { condition: "Melanoma", description: "A cancer of melanocytes; the most serious form of skin cancer." },
    ],
    bodyPosition: { x: 35, y: 55 },
  },
];

export function getOrganById(id: string): Organ | undefined {
  return organs.find((organ) => organ.id === id);
}

export function searchOrgans(query: string): Organ[] {
  const q = query.trim().toLowerCase();
  if (!q) return organs;
  return organs.filter(
    (organ) =>
      organ.name.toLowerCase().includes(q) ||
      organ.system.toLowerCase().includes(q) ||
      organ.tagline.toLowerCase().includes(q)
  );
}

export function groupBySystem(list: Organ[] = organs): Record<BodySystem, Organ[]> {
  return list.reduce(
    (acc, organ) => {
      (acc[organ.system] ??= []).push(organ);
      return acc;
    },
    {} as Record<BodySystem, Organ[]>
  );
}
