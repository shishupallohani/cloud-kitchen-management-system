/**
 * config.js
 * -----------------------------------------------------------------------
 * Centralized, editable configuration. Change brand/contact copy here —
 * nothing else in the codebase should hardcode these values.
 * -----------------------------------------------------------------------
 */

export const SITE = {
  brandName: "Charroti",
  brandTagline: "Kitchen",
  metaDescription:
    "Charroti Kitchen — homestyle Indian food, made fresh every day. See today's menu and order for delivery.",
  contact: {
    phone: "+91 90000 00000",
    whatsapp: "919000000000", // digits only, used for wa.me links
    email: "hello@charrotikitchen.example",
    location: "Sector 62, Noida, Uttar Pradesh",
    hours: "12:00 PM – 9:30 PM, all days",
  },
};

// Permanent food catalog — "Kitchen Favorites".
// Local images live in assets/images/. Swap the .svg placeholders for
// real .jpg/.webp photography whenever you have it; keep the filenames
// the same and nothing else needs to change.
export const STATIC_CATALOG = [
  {
    id: "dal-tadka",
    name: "Dal Tadka",
    description: "Slow-simmered lentils, finished with a hot ghee tempering.",
    image: "assets/images/dal.svg",
    category: "Dal",
  },
  {
    id: "paneer-curry",
    name: "Paneer Curry",
    description: "Soft home-set paneer in a rich onion-tomato gravy.",
    image: "assets/images/paneer.svg",
    category: "Paneer",
  },
  {
    id: "mushroom-masala",
    name: "Mushroom Masala",
    description: "Button mushrooms tossed in a masala of ginger and garam.",
    image: "assets/images/mushroom.svg",
    category: "Main Course",
  },
  {
    id: "aloo-gobi",
    name: "Aloo Gobi",
    description: "Potatoes and cauliflower, dry-roasted with turmeric and cumin.",
    image: "assets/images/aloo-gobi.svg",
    category: "Vegetables",
  },
  {
    id: "bhindi-fry",
    name: "Bhindi Fry",
    description: "Okra pan-fried until crisp at the edges, lightly spiced.",
    image: "assets/images/bhindi.svg",
    category: "Vegetables",
  },
  {
    id: "chole",
    name: "Chole",
    description: "Chickpeas simmered overnight in a deep, tangy masala.",
    image: "assets/images/chole.svg",
    category: "Main Course",
  },
  {
    id: "rajma",
    name: "Rajma",
    description: "Kidney beans in a slow-cooked tomato gravy, Punjabi style.",
    image: "assets/images/rajma.svg",
    category: "Main Course",
  },
  {
    id: "seasonal-vegetable",
    name: "Seasonal Vegetable Curry",
    description: "Whatever's freshest that week, cooked simply and well.",
    image: "assets/images/seasonal-vegetable.svg",
    category: "Vegetables",
  },
  {
    id: "jeera-rice",
    name: "Jeera Rice",
    description: "Basmati rice tempered with cumin and a whisper of ghee.",
    image: "assets/images/jeera-rice.svg",
    category: "Rice",
  },
  {
    id: "veg-pulao",
    name: "Veg Pulao",
    description: "Fragrant rice layered with seasonal vegetables and whole spices.",
    image: "assets/images/pulao.svg",
    category: "Rice",
  },
  {
    id: "steamed-rice",
    name: "Steamed Rice",
    description: "Plain steamed basmati, cooked fresh for every order.",
    image: "assets/images/steamed-rice.svg",
    category: "Rice",
  },
  {
    id: "chapati",
    name: "Chapati",
    description: "Hand-rolled, made on the tawa to order.",
    image: "assets/images/chapati.svg",
    category: "Indian Breads",
  },
  {
    id: "roti",
    name: "Roti",
    description: "Whole-wheat and soft, finished with a touch of ghee.",
    image: "assets/images/roti.svg",
    category: "Indian Breads",
  },
  {
    id: "salad-raita",
    name: "Salad & Raita",
    description: "Crisp seasonal salad alongside a cooling home-set raita.",
    image: "assets/images/salad.svg",
    category: "Sides",
  },
];

export const CATEGORIES = [
  "All",
  "Main Course",
  "Dal",
  "Paneer",
  "Vegetables",
  "Rice",
  "Indian Breads",
  "Sides",
];
