export interface MemoryPhoto {
  id: string;
  url: string;
  title: string;
  caption: string;
  date: string;
  location: string;
}

export interface TreasureChest {
  id: string;
  name: string;
  locationDescription: string;
  opened: boolean;
  position: [number, number, number];
  noteTitle: string;
  noteBody: string;
  tag: string;
}

export type SceneLocation = 'outdoor_trail' | 'farmhouse_porch' | 'indoor_party';

export interface GameQuestState {
  hasWalked: boolean;
  chestsFound: number;
  totalChests: number;
  doorUnlocked: boolean;
  enteredHouse: boolean;
  candlesBlown: boolean;
  cakeCut: boolean;
  parentsGreeted: boolean;
  tvWatched: boolean;
  allPhotosViewed: boolean;
}

export const MEMORY_PHOTOS: MemoryPhoto[] = [
  {
    id: 'memory-1',
    url: '/assets/aistudio/memory_1.jpg',
    title: "Sanchary's Radiant Festive Glow",
    caption: 'That breathtaking smile in crimson and golden embroidery, with intricate henna on your hands. Sanchary, you light up every room you walk into!',
    date: 'Festive Season',
    location: 'Celebration Day'
  },
  {
    id: 'memory-2',
    url: '/assets/aistudio/memory_2.jpg',
    title: 'Sanchary in Regal Royal Blue',
    caption: 'Draped in regal blue silk under sunny skies and palm trees. Calm, elegant, and effortlessly graceful—pure Sanchary royalty.',
    date: 'Sunny Day Out',
    location: 'Park Promenade'
  },
  {
    id: 'memory-3',
    url: '/assets/aistudio/memory_3.jpg',
    title: 'Pure Sanchary Joy & Sweet Laughter',
    caption: 'Floral dress, sweetest laughter, catching you in your candid best. Your genuine warmth makes everyone around you feel so deeply comforted.',
    date: 'Cherished Dinner',
    location: 'Cozy Cafe'
  },
  {
    id: 'memory-4',
    url: '/assets/aistudio/memory_4.jpg',
    title: "Sanchary's Everyday Magic",
    caption: 'Plaid shirt, playful smile, and that iconic hand-in-hair laugh. Proof that every ordinary day turns into a core memory when spent with you, Sanchary!',
    date: 'Bestie Hangout',
    location: 'Office Lounge'
  }
];

export const INITIAL_CHESTS: TreasureChest[] = [
  {
    id: 'chest-1',
    name: 'Frosty Pine Cache',
    locationDescription: 'Hidden beneath the snow-laden evergreen pines along the mountain trail',
    opened: false,
    position: [-10, 0.4, 18],
    noteTitle: 'Note #1: The Mountain Wind Whispers to Sanchary',
    noteBody: 'Dearest Sanchary,\n\nEven in the coldest mountain frost, having you in my life has always felt like hot chocolate by a crackling hearth. Thank you for walking through every season of life beside me, making every steep climb feel like an unforgettable adventure. Happy Birthday, my wonderful bestie!',
    tag: 'Mountain Trail'
  },
  {
    id: 'chest-2',
    name: 'Porch Lantern Crate',
    locationDescription: 'Tucked beside the warm wooden entrance of the mountain chalet',
    opened: false,
    position: [3.8, 0.6, 6.2],
    noteTitle: 'Note #2: The Golden Threshold for Sanchary',
    noteBody: 'To our irreplaceable Sanchary:\n\nYou are about to step into a home full of warmth, love, and people who adore you more than words can express! Never forget how talented, compassionate, and truly one-of-a-kind you are. May this new year bring you endless triumphs, peace, and gigantic smiles.',
    tag: 'Farmhouse Porch'
  },
  {
    id: 'chest-3',
    name: 'Fireside Keepsake Box',
    locationDescription: 'Resting by the cozy stone fireplace in the living hall',
    opened: false,
    position: [-4.2, 0.5, -4.5],
    noteTitle: 'Note #3: Secrets by the Hearth for Sanchary',
    noteBody: 'A heartfelt wish for Sanchary:\n\nI hope today reminds you of how deeply cherished and special you are. From our endless late-night chats to the silly inside jokes nobody else understands, having you as my best friend is the greatest blessing. Blow out the candles and make the biggest wish—you deserve the entire universe!',
    tag: 'Living Hearth'
  }
];
