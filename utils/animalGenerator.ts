import { Animal } from '@/types/app';

// Mock data for animal generation
const animalNames = [
  { name: 'Red Fox', scientific: 'Vulpes vulpes', category: 'Mammal', habitat: 'Forest' },
  { name: 'Bald Eagle', scientific: 'Haliaeetus leucocephalus', category: 'Bird', habitat: 'Mountains' },
  { name: 'Gray Wolf', scientific: 'Canis lupus', category: 'Mammal', habitat: 'Forest' },
  { name: 'American Bison', scientific: 'Bison bison', category: 'Mammal', habitat: 'Plains' },
  { name: 'Grizzly Bear', scientific: 'Ursus arctos horribilis', category: 'Mammal', habitat: 'Mountains' },
  { name: 'Monarch Butterfly', scientific: 'Danaus plexippus', category: 'Insect', habitat: 'Meadows' },
  { name: 'Blue Jay', scientific: 'Cyanocitta cristata', category: 'Bird', habitat: 'Forest' },
  { name: 'Eastern Box Turtle', scientific: 'Terrapene carolina', category: 'Reptile', habitat: 'Woodland' },
  { name: 'American Alligator', scientific: 'Alligator mississippiensis', category: 'Reptile', habitat: 'Wetlands' },
  { name: 'White-tailed Deer', scientific: 'Odocoileus virginianus', category: 'Mammal', habitat: 'Forest' },
  { name: 'Great Blue Heron', scientific: 'Ardea herodias', category: 'Bird', habitat: 'Wetlands' },
  { name: 'Raccoon', scientific: 'Procyon lotor', category: 'Mammal', habitat: 'Forest' },
  { name: 'Bobcat', scientific: 'Lynx rufus', category: 'Mammal', habitat: 'Forest' },
  { name: 'Barn Owl', scientific: 'Tyto alba', category: 'Bird', habitat: 'Grasslands' },
  { name: 'Bullfrog', scientific: 'Lithobates catesbeianus', category: 'Amphibian', habitat: 'Wetlands' },
  { name: 'Pileated Woodpecker', scientific: 'Dryocopus pileatus', category: 'Bird', habitat: 'Forest' },
  { name: 'River Otter', scientific: 'Lontra canadensis', category: 'Mammal', habitat: 'Rivers' },
  { name: 'Snowy Owl', scientific: 'Bubo scandiacus', category: 'Bird', habitat: 'Tundra' },
  { name: 'Mountain Lion', scientific: 'Puma concolor', category: 'Mammal', habitat: 'Mountains' },
  { name: 'Spotted Salamander', scientific: 'Ambystoma maculatum', category: 'Amphibian', habitat: 'Forest' },
];

const rarities = ['common', 'common', 'common', 'uncommon', 'uncommon', 'rare', 'legendary'] as const;

const descriptions = [
  "This fascinating animal is known for its adaptability and resourcefulness. It has a distinctive appearance and plays an important role in its ecosystem.",
  "A remarkable species that has evolved unique traits to thrive in its habitat. Scientists continue to study its behavior and ecological significance.",
  "This animal exhibits complex social behaviors and has developed specialized adaptations for survival in challenging environments.",
  "An iconic species that represents the biodiversity of its native region. Conservation efforts are crucial for ensuring its continued existence.",
  "Known for its distinctive features and behaviors, this animal has cultural significance in many indigenous traditions.",
];

const funFactsPool = [
  "Can live up to 20 years in the wild",
  "Has specialized adaptations for hunting at night",
  "Can travel at speeds of up to 35 miles per hour",
  "Uses complex vocalizations to communicate with others of its species",
  "Changes its coat/plumage color seasonally for camouflage",
  "Can remember the locations of hundreds of food caches",
  "Has a highly developed sense of smell that's 100 times more sensitive than humans",
  "Forms lifelong pair bonds with its mate",
  "Can survive months without food by entering a state of torpor",
  "Has been featured in indigenous folklore for centuries",
  "Plays a crucial role in seed dispersal in its ecosystem",
  "Can detect prey from over a mile away",
  "Uses tools to obtain food in the wild",
  "Has specialized teeth/claws that continuously grow throughout its life",
  "Can regulate its body temperature to adapt to extreme conditions",
  "Migrates thousands of miles each year",
  "Has a complex system of underground tunnels and chambers",
  "Can regenerate lost limbs or appendages",
  "Produces venom that has potential medical applications",
  "Has evolved specialized camouflage that makes it nearly invisible in its habitat",
];

// Helper function to get random item from array
const getRandomItem = <T>(array: readonly T[] | T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

// Helper function to get random subset of array
const getRandomSubset = <T>(array: T[], count: number): T[] => {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Generate random animal data
export const generateAnimalData = (): Animal => {
  const animalInfo = getRandomItem(animalNames);
  const rarity = getRandomItem(rarities) as "common" | "uncommon" | "rare" | "legendary";
  const description = getRandomItem(descriptions);
  const funFactsCount = Math.floor(Math.random() * 3) + 2; // 2-4 fun facts
  const funFacts = getRandomSubset(funFactsPool, funFactsCount);
  
  return {
    name: animalInfo.name,
    scientificName: animalInfo.scientific,
    description,
    category: animalInfo.category,
    habitat: animalInfo.habitat,
    rarity,
    funFacts,
  };
};