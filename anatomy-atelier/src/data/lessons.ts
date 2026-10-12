export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface Lesson {
  id: string;
  organId: string;
  title: string;
  summary: string;
  objectives: string[];
  quiz: QuizQuestion[];
}

export const lessons: Lesson[] = [
  {
    id: "heart-basics",
    organId: "heart",
    title: "How the heart pumps blood",
    summary: "Trace a drop of blood through the heart's four chambers and valves.",
    objectives: [
      "Name the four chambers of the heart",
      "Explain the difference between pulmonary and systemic circulation",
      "Describe what triggers each heartbeat",
    ],
    quiz: [
      {
        question: "Which chamber pumps oxygenated blood out to the rest of the body?",
        options: ["Right atrium", "Right ventricle", "Left ventricle", "Left atrium"],
        correctIndex: 2,
      },
      {
        question: "What structure initiates each normal heartbeat?",
        options: ["Aortic valve", "Sinoatrial node", "Coronary artery", "Pericardium"],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "brain-lobes",
    organId: "brain",
    title: "Mapping the brain's lobes",
    summary: "Learn what each lobe of the cerebrum is responsible for.",
    objectives: [
      "Identify the frontal, parietal, temporal, and occipital lobes",
      "Connect the cerebellum to balance and coordination",
      "Explain the brainstem's role in vital functions",
    ],
    quiz: [
      {
        question: "Which structure regulates breathing and heart rate?",
        options: ["Frontal lobe", "Brainstem", "Hippocampus", "Occipital lobe"],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "lungs-gas-exchange",
    organId: "lungs",
    title: "Gas exchange in the lungs",
    summary: "Follow a breath of air from the trachea down to the alveoli.",
    objectives: [
      "Describe the path air takes from the trachea to the alveoli",
      "Explain how oxygen and carbon dioxide are exchanged",
      "Compare the right and left lung's lobes",
    ],
    quiz: [
      {
        question: "Where does gas exchange actually occur?",
        options: ["Trachea", "Bronchi", "Alveoli", "Diaphragm"],
        correctIndex: 2,
      },
    ],
  },
  {
    id: "liver-functions",
    organId: "liver",
    title: "The liver's many jobs",
    summary: "Explore why the liver is called the body's chemical factory.",
    objectives: [
      "List three functions of the liver",
      "Explain the liver's dual blood supply",
      "Describe how the liver regenerates",
    ],
    quiz: [
      {
        question: "What fluid does the liver produce to help digest fat?",
        options: ["Insulin", "Bile", "Mucus", "Saliva"],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "kidneys-filtration",
    organId: "kidneys",
    title: "How kidneys filter blood",
    summary: "Understand the nephron, the kidney's microscopic filtering unit.",
    objectives: [
      "Describe the role of a nephron",
      "Explain how kidneys regulate fluid balance",
      "Connect kidney function to blood pressure",
    ],
    quiz: [
      {
        question: "About how many nephrons does each kidney contain?",
        options: ["About one thousand", "About one hundred thousand", "About one million", "About one billion"],
        correctIndex: 2,
      },
    ],
  },
  {
    id: "eye-vision",
    organId: "eye",
    title: "From light to sight",
    summary: "Follow light as it travels through the eye to become a visual signal.",
    objectives: [
      "Name the structures light passes through to reach the retina",
      "Differentiate rods from cones",
      "Explain the optic nerve's role",
    ],
    quiz: [
      {
        question: "Which cells are responsible for color vision?",
        options: ["Rods", "Cones", "Melanocytes", "Keratinocytes"],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "intestine-digestion",
    organId: "intestine",
    title: "Absorption and elimination",
    summary: "Compare the roles of the small and large intestine.",
    objectives: [
      "Explain what the small intestine absorbs",
      "Describe the large intestine's role in water reabsorption",
      "Understand the gut microbiome's role in digestion",
    ],
    quiz: [
      {
        question: "Which part of the intestine absorbs most nutrients?",
        options: ["Colon", "Small intestine", "Appendix", "Rectum"],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "pancreas-hormones",
    organId: "pancreas",
    title: "Insulin, glucagon, and digestion",
    summary: "See how the pancreas balances blood sugar and aids digestion.",
    objectives: [
      "Differentiate the pancreas's exocrine and endocrine roles",
      "Explain what insulin and glucagon do",
      "Connect pancreatic dysfunction to diabetes",
    ],
    quiz: [
      {
        question: "Which cells secrete insulin?",
        options: ["Alpha cells", "Beta cells", "Acinar cells", "Kupffer cells"],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "skin-layers",
    organId: "skin",
    title: "The three layers of skin",
    summary: "Explore the epidermis, dermis, and hypodermis.",
    objectives: [
      "Name the three layers of skin",
      "Explain the skin's role in temperature regulation",
      "Describe how the epidermis renews itself",
    ],
    quiz: [
      {
        question: "Which layer contains blood vessels and nerve endings?",
        options: ["Epidermis", "Dermis", "Hypodermis", "Cuticle"],
        correctIndex: 1,
      },
    ],
  },
];

export function getLessonsForOrgan(organId: string): Lesson[] {
  return lessons.filter((lesson) => lesson.organId === organId);
}
