import { Router } from "express";

const router = Router();

const MACRO_EVENTS = [
  {
    id: "us-china-tech",
    title: "US-China Tech Trade Fragmentation",
    category: "Trade",
    region: "Asia-Pacific",
    impactScore: 88,
    direction: "Bullish",
    affectedSectors: ["Semiconductors", "Networking", "Defense Tech"],
    description: "US export controls on advanced chips and AI hardware to China accelerating domestic semiconductor buildout and supply chain reshoring.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "oil-100",
    title: "Oil Prices Above $100/bbl",
    category: "Energy",
    region: "Global",
    impactScore: 75,
    direction: "Bullish",
    affectedSectors: ["Energy", "Nuclear", "Alternative Energy"],
    description: "Sustained high oil prices driving accelerated investment in energy grid infrastructure, nuclear power, and alternative energy sources.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "chips-act",
    title: "Domestic Semiconductor Manufacturing Incentives",
    category: "Regulatory",
    region: "United States",
    impactScore: 82,
    direction: "Bullish",
    affectedSectors: ["Semiconductors", "Advanced Manufacturing", "Defense"],
    description: "CHIPS Act funding and IRA tax incentives driving $500B+ in domestic semiconductor fab investments through 2030.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ai-data-center",
    title: "AI Data Center Buildout — $1.6T Networking",
    category: "Technology",
    region: "United States",
    impactScore: 95,
    direction: "Bullish",
    affectedSectors: ["Networking", "AI Infrastructure", "Power Management"],
    description: "Hyperscaler capex commitments exceeding $1.6T for AI data center buildout creating massive demand for optical networking and power infrastructure.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "taiwan-risk",
    title: "Taiwan Strait Tension",
    category: "Geopolitical",
    region: "Asia-Pacific",
    impactScore: 71,
    direction: "Bearish",
    affectedSectors: ["Semiconductors", "Consumer Electronics", "Supply Chain"],
    description: "Ongoing Taiwan Strait tensions posing tail risk to global semiconductor supply chains and fab capacity.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "fed-rates",
    title: "Fed Holding Rates Elevated",
    category: "Monetary",
    region: "United States",
    impactScore: 60,
    direction: "Bearish",
    affectedSectors: ["Growth Tech", "Real Estate", "Small Cap"],
    description: "Federal Reserve maintaining restrictive monetary policy longer than expected, pressuring high-multiple growth stocks.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "national-security-tech",
    title: "National Security Tech Mandates",
    category: "Regulatory",
    region: "United States",
    impactScore: 78,
    direction: "Bullish",
    affectedSectors: ["Defense Tech", "Quantum Computing", "Satellite Communications"],
    description: "DOD and NSA mandating domestic-sourced quantum-resistant encryption and satellite communication infrastructure by 2027.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "russia-ukraine",
    title: "Russia-Ukraine Conflict — Energy Disruption",
    category: "Geopolitical",
    region: "Europe",
    impactScore: 65,
    direction: "Neutral",
    affectedSectors: ["Energy", "Defense", "Agriculture"],
    description: "Ongoing conflict sustaining European energy security concerns and driving defense spending increases across NATO members.",
    updatedAt: new Date().toISOString(),
  },
];

const MACRO_THEMES = [
  {
    id: "ai-infra",
    name: "AI Infrastructure Supercycle",
    description: "The multi-year buildout of AI compute, networking, and power infrastructure driven by hyperscaler capex and enterprise AI adoption.",
    momentum: "Accelerating",
    relatedKeywords: ["AI Data Center", "1.6T Networking", "GPU Supply", "Power Infrastructure"],
    topStocks: ["NVDA", "AVGO", "ANET", "VST", "LITE"],
  },
  {
    id: "reshoring",
    name: "US Tech Reshoring & Domestic Manufacturing",
    description: "Government-backed incentives and geopolitical pressure driving semiconductor and advanced manufacturing back to US soil.",
    momentum: "Accelerating",
    relatedKeywords: ["CHIPS Act", "Domestic Semiconductor", "Reshoring", "National Security"],
    topStocks: ["ONTO", "WOLF", "SMCI", "MRVL"],
  },
  {
    id: "quantum",
    name: "Quantum Computing Commercialization",
    description: "Early-stage quantum companies securing government contracts and achieving error correction milestones ahead of schedule.",
    momentum: "Accelerating",
    relatedKeywords: ["National Security Tech", "Quantum", "Error Correction", "NSA"],
    topStocks: ["IONQ", "QUBT", "RGTI"],
  },
  {
    id: "energy-transition",
    name: "Energy Grid Modernization",
    description: "Aging US power grid facing unprecedented demand from AI data centers and EVs, driving grid modernization and nuclear renaissance.",
    momentum: "Stable",
    relatedKeywords: ["Energy Grid", "Nuclear Power", "Grid Modernization", "eVTOL"],
    topStocks: ["CEG", "VST", "ACHR", "ASTS"],
  },
];

router.get("/macro/heatmap", async (_req, res) => {
  res.json(MACRO_EVENTS);
});

router.get("/macro/themes", async (_req, res) => {
  res.json(MACRO_THEMES);
});

export default router;
