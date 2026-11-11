// OFFLINE PROTECTED74 REVIEW ONLY: all new actions hard-disabled; no financial classes/DB/server constructed.
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/protected74-review.mjs
import { createHash } from "node:crypto";

// math/official72.mjs
var official72_exports = {};
__export(official72_exports, {
  GAME_ID: () => GAME_ID2,
  advanceRound: () => advanceRound,
  collectRound: () => collectRound,
  getGameDefinition: () => getGameDefinition2,
  listGameDefinitions: () => listGameDefinitions2,
  maximumPayoutMinor: () => maximumPayoutMinor,
  modelAuditMatrix: () => modelAuditMatrix,
  publicRound: () => publicRound,
  reconcileRound: () => reconcileRound,
  startRound: () => startRound
});

// scope/official74.json
var official74_default = {
  source: "https://www.smartsoftgaming.com/games",
  fetchedOn: "2026-11-11",
  selection: "Latest user instruction: select the actual current official 74 names; preserve Multi Hot5 and Foxy Hot20.",
  entries: [
    {
      number: 1,
      name: "PopX",
      gameId: "ind74_official_popx",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/popx",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=PopX&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com/",
      category: "Crash Games",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/6ae33fc63e0c83b17fdbf408_493x617.webp"
    },
    {
      number: 2,
      name: "Mine Island2",
      gameId: "ind74_official_mineisland2",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/mine-island2",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Games&GameName=MineIsland2&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Instant Games",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/6ad61243a744488a138d3d0e_493x617.webp"
    },
    {
      number: 3,
      name: "New Era of JetX",
      gameId: "ind74_official_neweraofjetx",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/jetx",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=JetXNew&GameName=JetX&Token=DEMO_EXH&PortalName=DEMO",
      category: "Crash Games",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/6aad0b0cdfd47b7e59f2965d_JetXNew.webp"
    },
    {
      number: 4,
      name: "BalloonX",
      gameId: "ind74_official_balloonx",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/balloonx",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameName=BalloonX&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en",
      category: "Crash Games",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/6a05a87469997668044e9a46_493x617bx.webp"
    },
    {
      number: 5,
      name: "Plinko X Classic",
      gameId: "ind74_official_plinkoxclassic",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/plinko-x-classic",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Games&GameName=PlinkoXClassic&Token=DEMO&PortalName=demo",
      category: "Instant Games",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/6a85c6d5a7d0ecb563b1d568_493x617%20%E1%83%9E%E1%83%9A.webp"
    },
    {
      number: 6,
      name: "Propel X",
      gameId: "ind74_official_propelx",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/propel-x",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=PropelX&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com/",
      category: "Crash Games",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/6a42708be60eb2e1ad2b5b39_493x617.webp"
    },
    {
      number: 7,
      name: "World Champion X",
      gameId: "ind74_official_worldchampionx",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/world-champion-x",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Games&GameName=WorldChampionX&Token=DEMO&PortalName=demo",
      category: "Crash Games",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/6a16ddff390d07357ccdf174_493x6176.webp"
    },
    {
      number: 8,
      name: "Power of Tiger",
      gameId: "ind74_official_poweroftiger",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/power-of-tiger",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=PowerOfTiger&Token=DEMO&PortalName=demo",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/69ef67639ed643e8a9e19288_493x617%20(12).webp"
    },
    {
      number: 9,
      name: "Multi Fruits Charging Wilds",
      gameId: "ind74_official_multifruitschargingwilds",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/multi-fruits-charging-wilds",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=MultiFruitsChargingWilds&Token=DEMO&PortalName=demo",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/69ef65be7ed7c8f8103095a9_493x617%20(13).webp"
    },
    {
      number: 10,
      name: "Gems Crown Charging Wilds",
      gameId: "ind74_official_gemscrownchargingwilds",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/gems-crown-charging-wilds",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=GemsCrownChargingWilds&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/69de4156e4d59c38c21a0656_493x617%20(6).webp"
    },
    {
      number: 11,
      name: "Gates of Merlyn",
      gameId: "ind74_official_gatesofmerlyn",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/gates-of-merlyn",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=GatesOfMerlyn&Token=DEMO&PortalName=DEMO&ReturnUrl=https://www.smartsoftgaming.com/",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/69cbc1bea38eb92591d004e2_493x617.webp"
    },
    {
      number: 12,
      name: "Chicken Ways",
      gameId: "ind74_official_chickenways",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/chicken-ways",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=Chickenways&Token=DEMO&PortalName=DEMO&ReturnUrl=https://www.smartsoftgaming.com/",
      category: "Mine Games",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/69bbe863aad6855f4c1fe644_493x617%20(11).webp"
    },
    {
      number: 13,
      name: "Dice Jungle",
      gameId: "ind74_official_dicejungle",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/dice-jungle",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=DiceJungle&Token=DEMO&PortalName=DEMO&ReturnUrl=https://www.smartsoftgaming.com/",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/69732e740b0a48f7d7c733bc_493x617%20(6).webp"
    },
    {
      number: 14,
      name: "Multi Hot 5 Wild",
      gameId: "ind74_official_multihot5wild",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/multi-hot-5-wild",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=MultiHot5Wild&Token=DEMO&PortalName=DEMO&ReturnUrl=https://www.smartsoftgaming.com/",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/6901e2532cb21f1f6f8f0826_493x617.webp"
    },
    {
      number: 15,
      name: "Cheesy Road",
      gameId: "ind74_official_cheesyroad",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/cheesy-road",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=CheesyRoad&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com/",
      category: "Mine Games",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/6936e783c298e9868005784e_493x617.jpg"
    },
    {
      number: 16,
      name: "Fortune Catch",
      gameId: "ind74_official_fortunecatch",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/fortune-catch",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Games&GameName=FortuneCatch&Token=DEMO&PortalName=DEMO",
      category: "Instant Games",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/6a301b883f328656809aa58a_493x617%20(11)%20(2).webp"
    },
    {
      number: 17,
      name: "Multi Hot 20",
      gameId: "ind74_official_multihot20",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/multi-hot-20",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=MultiHot20&Token=DEMO&PortalName=demo",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/6a55006990d4792920b76ef1_493x617%20(15).webp"
    },
    {
      number: 18,
      name: "Cheesy Road Classic",
      gameId: "ind74_official_cheesyroadclassic",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/cheesy-road-classic",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=CheesyRoadClassic&Token=DEMO&PortalName=DEMO&ReturnUrl=https://www.smartsoftgaming.com/",
      category: "Mine Games",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/69944a9495cd430b0f0614ca_493x617%20(9).webp"
    },
    {
      number: 19,
      name: "Multi Hot 10",
      gameId: "ind74_official_multihot10",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/multi-hot-10-2",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=MultiHot10&Token=DEMO&PortalName=demo",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      sourceDemoUrl: "https://www.google.com/url?q=https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory%3DSlots%26GameName%3DMultiHot10%26Token%3DDEMO%26PortalName%3Ddemo&sa=D&source=editors&ust=1783957511223679&usg=AOvVaw1-yr2tGhZ9XQ5Wd4UaaSS6",
      urlNormalization: "Unwrapped published Google redirect or added missing HTTPS scheme; provider path and game identity preserved.",
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/6a54fe2df092a37c3872fbfd_493x617%20(14).webp"
    },
    {
      number: 20,
      name: "Multi Hot 40",
      gameId: "ind74_official_multihot40",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/multi-hot-40",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=MultiHot40&Token=DEMO&PortalName=demo",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/6a30204d1c04a2b78c52cc17_493x617%20(12)%20(1).webp"
    },
    {
      number: 21,
      name: "Coins Of Atlantis",
      gameId: "ind74_official_coinsofatlantis",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/coins-of-atlantis",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=CoinsOfAtlantis&Token=DEMO&PortalName=demo",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/6a05a640f90e3a237cb78105_493x617%20(10).webp"
    },
    {
      number: 22,
      name: "Multi Hot 100",
      gameId: "ind74_official_multihot100",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/multi-hot-100",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=MultiHot100&Token=DEMO&PortalName=demo",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/6a302664bf07bf135c694ab9_493x617%20(13)%20(1).webp"
    },
    {
      number: 23,
      name: "Multi Hot Wild Ways",
      gameId: "ind74_official_multihotwildways",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/multi-hot-wild-ways",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=MultiHotWildWays&Token=DEMO&PortalName=DEMO&ReturnUrl=https://www.smartsoftgaming.com/",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/6902342435ccce4b53ee1492_493x617%20(1).webp"
    },
    {
      number: 24,
      name: "Bottle Mania",
      gameId: "ind74_official_bottlemania",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/bottle-mania",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/loader.aspx?GameCategory=&GameName=BottleMania&Token=DEMO&PortalName=DEMO&ReturnUrl=https://www.smartsoftgaming.com/",
      category: "Instant Games",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/698c8fbeac157c95279c1736_493x617.webp"
    },
    {
      number: 25,
      name: "Multi Hot 5 Burn Wilds",
      gameId: "ind74_official_multihot5burnwilds",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/multi-hot-5-burn-wilds",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=MultiHot5BurnWilds&Token=DEMO&PortalName=DEMO&ReturnUrl=https://www.smartsoftgaming.com/",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/698da74c564322ff06ae4592_493x617%20(8).webp"
    },
    {
      number: 26,
      name: "Chicken Highway",
      gameId: "ind74_official_chickenhighway",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/chicken-highway",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=ChickenHighway&Token=DEMO&PortalName=DEMO&ReturnUrl=https://www.smartsoftgaming.com/",
      category: "Mine Games",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/692f121c5c441f163fba722a_CH.webp"
    },
    {
      number: 27,
      name: "Multi Hot 5 Deluxe",
      gameId: "ind74_official_multihot5deluxe",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/multi-hot-5-deluxe",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=MultiHot5Deluxe&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/68415a8bd3ea85a001f41d7d_Multi%20Hot%20Deluxe%205%20Thumb.webp"
    },
    {
      number: 28,
      name: "CarX",
      gameId: "ind74_official_carx",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/carx",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=CarX&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com/",
      category: "Crash Games",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/68f0cc48a3f6a9e8f7e91698_CarX.webp"
    },
    {
      number: 29,
      name: "Cai Balao Cappadocia",
      gameId: "ind74_official_caibalaocappadocia",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/cai-balao-cappadocia",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=CaiBalaoCappadocia&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com/",
      category: "Instant Games",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/68f0cb0c3bcdebe9f7ebadf6_Cai%20Balao.webp"
    },
    {
      number: 30,
      name: "Multi Hot Wheel",
      gameId: "ind74_official_multihotwheel",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/multi-hot-wheel",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Games&GameName=MultiHotWheel&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Instant Games",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/69031c0f6b8dd5bda0c477f1_493x617%20(2).webp"
    },
    {
      number: 31,
      name: "Jingle Bell Bonanza",
      gameId: "ind74_official_jinglebellbonanza",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/jingle-bell-bonanza",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=JingleBellBonanza&Token=DEMO&PortalName=DEMO&ReturnUrl=https://www.smartsoftgaming.com/",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/6915d45d0462a5e9c699c34a_493x617%20(4).webp"
    },
    {
      number: 32,
      name: "Multi Hot 5 Super Wilds",
      gameId: "ind74_official_multihot5superwilds",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/multi-hot-5-super-wilds",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=MultiHot5SuperWilds&Token=DEMO&PortalName=DEMO&ReturnUrl=https://www.smartsoftgaming.com/",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/69282391a32d70b8329a09e4_493x617%20(7).webp"
    },
    {
      number: 33,
      name: "Balloon",
      gameId: "ind74_official_balloon",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/balloon",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Games&GameName=Balloon&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Instant Games",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/69722e7884dde45faee5b3cb_Balloon.webp"
    },
    {
      number: 34,
      name: "Plinko X",
      gameId: "ind74_official_plinkox",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/plinkox",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=PlinkoX&Token=DEMO&PortalName=DEMO&ReturnUrl=https://www.smartsoftgaming.com/",
      category: "Instant Games",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/69732d7052dbc453dbb0cd87_493x617%20(5).webp"
    },
    {
      number: 35,
      name: "Helicopter X",
      gameId: "ind74_official_helicopterx",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/helicopter-x",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=XGames&GameName=HelicopterX&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Crash Games",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/686fbf06515f7adaacb03add_Helicopterx.webp"
    },
    {
      number: 36,
      name: "Multi Hot 5",
      gameId: "ind74_official_multihot5",
      protected: true,
      officialUrl: "https://www.smartsoftgaming.com/games/multi-hot-5",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=MultiHot5&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/683034a2cf12f0111d9c579c_MultiHot5.webp"
    },
    {
      number: 37,
      name: "Safari Simba",
      gameId: "ind74_official_safarisimba",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/safari-simba-2",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=SafariSimba&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/683032afa8ef4882167866f6_Safari%20Simba.webp"
    },
    {
      number: 38,
      name: "Mine Island",
      gameId: "ind74_official_mineisland",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/mine-island",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Games&GameName=MineIsland&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Instant Games",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/686fbf1bc9cc0ceeced0757a_MineIsland.webp"
    },
    {
      number: 39,
      name: "Multi Hot Ways",
      gameId: "ind74_official_multihotways",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/multi-hot-ways",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=MultiHotWays&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/683033dbe3049eee5fe4ea38_MultiHotWays.webp"
    },
    {
      number: 40,
      name: "Football X",
      gameId: "ind74_official_footballx",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/fotballx",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Games&GameName=FootballX&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Crash Games",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/686fbee931912b109c06ca2a_FootballX.webp"
    },
    {
      number: 41,
      name: "Foxy Hot 20",
      gameId: "ind74_official_foxyhot20",
      protected: true,
      officialUrl: "https://www.smartsoftgaming.com/games/foxy-hot-20",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=FoxyHot20&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/683032cb852ef8f05414954d_FoxyHot20.webp"
    },
    {
      number: 42,
      name: "Burning Ice 40",
      gameId: "ind74_official_burningice40",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/burning-ice-40",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=BlazingHot40&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/683033ef33d6bf157356cb1b_BurningIce40.webp"
    },
    {
      number: 43,
      name: "Mariachi Coins",
      gameId: "ind74_official_mariachicoins",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/mariachi-coins",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=MariachiCoins&Token=DEMO&PortalName=DEMO&ReturnUrl=https://www.smartsoftgaming.com/",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/68a42a19fed98e22844a7f7d_Mariachi%20(1).webp"
    },
    {
      number: 44,
      name: "Habesha Fortune 5",
      gameId: "ind74_official_habeshafortune5",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/hab",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=HabeshaFortune5&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/683eeab49df0443666ff86d2_Habesha.webp"
    },
    {
      number: 45,
      name: "4 Bonuses Bonanza",
      gameId: "ind74_official_4bonusesbonanza",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/4-bonuses-bonanza",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Games&GameName=PlinkoJoker&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Instant Games",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/68371730a9926aacbb48393d_4%20Bonuses%20Bonanza.webp"
    },
    {
      number: 46,
      name: "Cricket X",
      gameId: "ind74_official_cricketx",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/cricket-x",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=XGames&GameName=CricketX&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Crash Games",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      sourceDemoUrl: "http://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=XGames&GameName=CricketX&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      urlNormalization: "HTTPS scheme on the same known official launch host.",
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/683ff0552e6657c3716b9dc9_Cricket%20X.webp"
    },
    {
      number: 47,
      name: "Burning Ice",
      gameId: "ind74_official_burningice",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/burning-ice-41",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=BlazingHot&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/683032de5554289474ad6a32_BurningIce.webp"
    },
    {
      number: 48,
      name: "CricketerX",
      gameId: "ind74_official_cricketerx",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/cricketerx",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=CricketerX&Token=DEMO&PortalName=DEMO&ReturnUrl=https://www.smartsoftgaming.com/",
      category: "Crash Games",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/68302a35ea4217178c8c5f14_CricketerX.webp"
    },
    {
      number: 49,
      name: "Wheel Of Destiny",
      gameId: "ind74_official_wheelofdestiny",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/wheel-of-destiny",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Games&GameName=WheelofDestiny&Token=DEMO&PortalName=demo&ReturnUrl=http://google.com5",
      category: "Instant Games",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/6915d5c6d990d1c3afce01d9_493x617%20(3).webp"
    },
    {
      number: 50,
      name: "Wild Multi Stars",
      gameId: "ind74_official_wildmultistars",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/wild-multi-stars",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=WildMultiStars&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/683fef9c8eb81bdb134674af_Wild%20Multi%20Stars.webp"
    },
    {
      number: 51,
      name: "Crash Duel",
      gameId: "ind74_official_crashduel",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/crash-duel",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=XGames&GameName=TugOfWar&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: null,
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/683eab2d604de1fe943a258d_Crash%20Duel.webp"
    },
    {
      number: 52,
      name: "Genie's Bonanza",
      gameId: "ind74_official_geniesbonanza",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/genies-bonanza",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=GeniesBonanza&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/683032ea3ee6e26b1f47adcb_GeniesBonanza.webp"
    },
    {
      number: 53,
      name: "Bonus Time",
      gameId: "ind74_official_bonustime",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/bonus-time",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=BonusTime&Token=DEMO&PortalName=DEMO&ReturnUrl=https://www.smartsoftgaming.com/",
      category: "Instant Games",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/68628ef15c937c0ffd002a11_Bonus%20Time.webp"
    },
    {
      number: 54,
      name: "Farm's Fortune",
      gameId: "ind74_official_farmsfortune",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/farms-fortune-6n0s6",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=FarmsFortune&Token=DEMO&PortalName=demo",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/68920691c89d73201b995560_Farm%27s%20Fortune.webp"
    },
    {
      number: 55,
      name: "Mad Slot",
      gameId: "ind74_official_madslot",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/mad-slot",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=MadSlot&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/6830304c4a7553fb1dfd2c2b_Mad%20Slot.webp"
    },
    {
      number: 56,
      name: "AviaStar",
      gameId: "ind74_official_aviastar",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/aviastar",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=XGames&GameName=JetX3&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Crash Games",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/68302a7c0535bbccb4541169_AviaStar.webp"
    },
    {
      number: 57,
      name: "Smash X",
      gameId: "ind74_official_smashx",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/smash-x",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Games&GameName=SmashX&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Crash Games",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/6830492bfa4dffb7d3c5dada_Smash%20X.webp"
    },
    {
      number: 58,
      name: "Tower X",
      gameId: "ind74_official_towerx",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/tower-x",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=XGames&GameName=TowerX&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Instant Games",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/683fee631b4d58c4b7c00370_TowerX.webp"
    },
    {
      number: 59,
      name: "Hot Samba",
      gameId: "ind74_official_hotsamba",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/hot-samba",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=HotSamba&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/683030621c0794a24599f5cc_Hot%20Samba.webp"
    },
    {
      number: 60,
      name: "Wilds and Gods",
      gameId: "ind74_official_wildsandgods",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/wilds-and-gods",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=WildsAndGods&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/683eaa671dfd95ce52fd948a_WildsAndGods.webp"
    },
    {
      number: 61,
      name: "Bao Slot 5X",
      gameId: "ind74_official_baoslot5x",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/bao-slot-5",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=BaoSlot5X&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/683eeb456f441a44497db3ea_BAO.webp"
    },
    {
      number: 62,
      name: "Jungle Sisters",
      gameId: "ind74_official_junglesisters",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/jungle-sisters",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=JungleSisters&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/683ef0dad38049ac675ea6fe_JungleSisters.webp"
    },
    {
      number: 63,
      name: "Boka Jamba 10",
      gameId: "ind74_official_bokajamba10",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/boca-jamba-10",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=BokaJamba10&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/6841477cd6d10c1385993101_Boka%20Jamba%20Thumb.webp"
    },
    {
      number: 64,
      name: "Jungle Sisters Deluxe",
      gameId: "ind74_official_junglesistersdeluxe",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/jungle-sisters-deluxe",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=JungleSistersDeluxe&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/684147b062dc3cdda77c3356_Jungle%20Sisters%20Deluxe%20Thumb.webp"
    },
    {
      number: 65,
      name: "Dragon's Code",
      gameId: "ind74_official_dragonscode",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/dragons-code",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=DragonsCode&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/6854023f7eab7f6ebb72db25_Dragon%27s%20Code.webp"
    },
    {
      number: 66,
      name: "Dracula's Fortune",
      gameId: "ind74_official_draculasfortune",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/draculas-fortune-2",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=DraculasFortune&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/683eabb53aab2220a03d6be7_Dracula%27s%20Fortune.webp"
    },
    {
      number: 67,
      name: "Book of Futuria",
      gameId: "ind74_official_bookoffuturia",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/book-of-futuria",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=BookOfFuturia&Token=DEMO&PortalName=demo",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/683ee6a5704613fc933deb65_Book%20of%20Futuria.webp"
    },
    {
      number: 68,
      name: "Book of Bonanza",
      gameId: "ind74_official_bookofbonanza",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/book-of-bonanza",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=BookOfBonanza&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      sourceDemoUrl: "eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=BookOfBonanza&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      urlNormalization: "Unwrapped published Google redirect or added missing HTTPS scheme; provider path and game identity preserved.",
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/683eafc5732b7ca0e786f894_Book%20of%20Bonanza.webp"
    },
    {
      number: 69,
      name: "Sugar Fiesta",
      gameId: "ind74_official_sugarfiesta",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/sugar-fiesta",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=SugarFiesta&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/683eac5a586284bb9c76baa1_Sugar%20Fiesta.webp"
    },
    {
      number: 70,
      name: "Vampires",
      gameId: "ind74_official_vampires",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/vampires",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=Vampires&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      sourceDemoUrl: "http://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=Vampires&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      urlNormalization: "HTTPS scheme on the same known official launch host.",
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/683ee921308d777233f0708e_Vampires.webp"
    },
    {
      number: 71,
      name: "Burning Ice 10",
      gameId: "ind74_official_burningice10",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/blazing-hot-10",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=BlazingHot10&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/683eb061c4ff1433ba08e1dc_BurningIce10.webp"
    },
    {
      number: 72,
      name: "Roll X",
      gameId: "ind74_official_rollx",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/rollx",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Games&GameName=RollX&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Instant Games",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/684147cefcdbbe16086c7647_Roll%20X%20Thumb.webp"
    },
    {
      number: 73,
      name: "Double X",
      gameId: "ind74_official_doublex",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/doublex",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=XGames&GameName=SlicerX&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Instant Games",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/682efd6988ee809168259e9b_Double%20X.webp"
    },
    {
      number: 74,
      name: "Samurai",
      gameId: "ind74_official_samurai",
      protected: false,
      officialUrl: "https://www.smartsoftgaming.com/games/samurai-deluxe",
      demoUrl: "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=Samurai&Token=DEMO&PortalName=DEMO&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en",
      category: "Slots",
      freshCatalogVerified: true,
      fullDemoGameplayVerified: false,
      coverUrl: "https://cdn.prod.website-files.com/68263adafcf8918559aaa083/682efc91fc6194feb7059828_Samurai.webp"
    }
  ]
};

// math/mine-island2.mjs
var MATH_VERSION = "independent-mine-island2-v1";
var GAME_ID = "ind74_mineisland2";
var TARGET_RETURN_BPS = 9600;
var TABLES = Object.freeze({
  easy: Object.freeze([11e3, 12e3, 15e3, 2e4, 3e4, 5e4, 1e5, 2e5, 5e5, 1e6]),
  medium: Object.freeze([12e3, 15e3, 2e4, 3e4, 5e4, 1e5, 2e5, 5e5, 1e6, 25e5]),
  hard: Object.freeze([15e3, 2e4, 3e4, 5e4, 1e5, 2e5, 5e5, 1e6, 25e5, 5e6])
});
var mineIslandDefinition = Object.freeze({
  id: GAME_ID,
  title: "Mine Island2 \u2014 Independent",
  catalogName: "Mine Island2",
  sourceCategory: "Instant Games",
  family: "ladder",
  mathVersion: MATH_VERSION,
  implementationStatus: "math-tested-awaiting-end-to-end-verification",
  provenance: {
    catalog: "Name and category from https://www.smartsoftgaming.com/games",
    observed: "One public demo round: stake 0.10 DMO, first collected payout 0.11 DMO at 1.10x; island ladder, Play/Jump/Collect and help viewed.",
    designed: "Original authored survival probabilities, medium/hard ladders, limits, and state transitions. No SmartSoft backend, source code, RNG, assets or certified RTP is reproduced."
  },
  limits: { minBetMinor: "10", maxBetMinor: "100000", betStepMinor: "10", maxWinMinor: "50000000" },
  modes: ["easy", "medium", "hard"],
  defaultMode: "easy",
  maxSteps: 10,
  nominalReturn: { numerator: "96", denominator: "100", explanation: "Our original model returns exactly 96% in expectation at any listed collect step for permitted stakes. Integer payout division floors, but all permitted stakes and listed multipliers divide exactly in this version. This is not a SmartSoft RTP claim." },
  rules: [
    "Set a stake in minor units and choose Easy, Medium or Hard before Play.",
    "Play debits the stake once. Each Jump attempts the next island; a failed jump ends the round with no payout.",
    "After a successful jump, Collect pays stake \xD7 current multiplier and ends the round.",
    "The first jump can fail. A successful first Easy jump pays 1.10\xD7.",
    "Selected cell numbers are visual choices only; they do not alter outcome probabilities or multipliers.",
    "The tenth successful jump collects automatically. Integer payouts are rounded down to whole minor units.",
    "Future outcomes are held only in server round state. No client-supplied payout is accepted."
  ],
  paytable: Object.entries(TABLES).map(([mode, ladder]) => ({
    mode,
    rows: ladder.map((multiplierBps, index) => ({
      label: "Step " + (index + 1),
      step: index + 1,
      multiplierBps,
      multiplier: (multiplierBps / 1e4).toFixed(2) + "\xD7",
      conditionalSurvival: { numerator: index === 0 ? TARGET_RETURN_BPS : ladder[index - 1], denominator: multiplierBps },
      cumulativeSurvival: { numerator: TARGET_RETURN_BPS, denominator: multiplierBps }
    }))
  }))
});

// math/games/popx.mjs
var popx_default = {
  id: "ind74_popx",
  title: "PopX \u2014 Independent",
  catalogName: "PopX",
  sourceCategory: "Crash Games",
  family: "crash",
  model: "clock-crash-v1",
  mathVersion: "independent-popx-v1",
  implementationStatus: "math-tested-not-financially-verified",
  theme: { name: "Prism Pulse", colors: ["#38155d", "#e879f9", "#fbbf24"], symbols: ["Pulse", "Prism", "Spark"] },
  limits: { minBetMinor: "10", maxBetMinor: "100000", betStepMinor: "10", maxWinMinor: "10000000" },
  ticketCount: 1e6,
  returnBps: 9500,
  maxMultiplierBps: 1e6,
  growthBpsPerSecond: 2e3,
  rules: ["This is an independently authored timed crash game, not the provider slot-board mechanic.", "Play debits one stake and starts at 1.00\xD7; an immediate loss is possible.", "Collect uses the server-clock multiplier. If the hidden bust point has been reached, the entire stake is lost.", "At 100.00\xD7, surviving rounds collect automatically. Payouts floor to whole minor units.", "The nominal 95% curve is our own design. Exact expected return depends on collection multiplier and integer rounding."],
  nominalReturn: { numerator: "95", denominator: "100", type: "upper-bound-before-floor", proof: "For collection multiplier M in basis points, survival = floor(9500\xD71000000/(M+1))/1000000. Expected return = survival \xD7 floor(bet\xD7M/10000)/bet, bounded above by 0.95." },
  paytable: [{ label: "At 1.10\xD7", multiplierBps: 11e3 }, { label: "At 2.00\xD7", multiplierBps: 2e4 }, { label: "At 5.00\xD7", multiplierBps: 5e4 }, { label: "Maximum", multiplierBps: 1e6 }],
  provenance: { catalog: "Official catalog name/category only.", observed: "Official demo showed two betting panels, multiplier history and a demo balance; no completed PopX round was verified.", designed: "Original clock curve, hidden distribution, limits, interface theme and all mathematics; no provider source or media reused." }
};

// math/games/multihot20.mjs
var multihot20_default = {
  id: "ind74_multihot20",
  title: "Multi Hot 20 \u2014 Independent",
  catalogName: "Multi Hot 20",
  sourceCategory: "Slots",
  family: "slots",
  model: "lines-slot-v1",
  mathVersion: "independent-multihot20-v1",
  implementationStatus: "math-tested-not-financially-verified",
  theme: { name: "Ember Orchard", colors: ["#431407", "#fb923c", "#fef08a"] },
  limits: { minBetMinor: "20", maxBetMinor: "100000", betStepMinor: "20", maxWinMinor: "134000000" },
  rows: 3,
  cols: 5,
  paylines: [[1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 1, 1, 0], [2, 1, 1, 1, 2], [1, 0, 1, 2, 1], [1, 2, 1, 0, 1], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2], [1, 1, 0, 1, 1], [1, 1, 2, 1, 1], [0, 2, 0, 2, 0], [2, 0, 2, 0, 2], [0, 2, 1, 2, 0]],
  symbols: [
    { id: "ember-ruby", label: "Ember Ruby", glyph: "\u25C6", weight: 1, pays: { 3: 23, 4: 136, 5: 1060 } },
    { id: "copper-bell", label: "Copper Bell", glyph: "\u2667", weight: 1, pays: { 3: 25, 4: 140, 5: 1100 } },
    { id: "citrus-sun", label: "Citrus Sun", glyph: "\u2600", weight: 1, pays: { 3: 27, 4: 144, 5: 1140 } },
    { id: "orchard-leaf", label: "Orchard Leaf", glyph: "\u2767", weight: 1, pays: { 3: 29, 4: 148, 5: 1180 } },
    { id: "velvet-plum", label: "Velvet Plum", glyph: "\u25CF", weight: 1, pays: { 3: 31, 4: 152, 5: 1220 } },
    { id: "amber-star", label: "Amber Star", glyph: "\u2605", weight: 1, pays: { 3: 33, 4: 156, 5: 1260 } },
    { id: "gold-prism", label: "Gold Prism", glyph: "\u2727", weight: 1, pays: { 3: 35, 4: 160, 5: 1300 } },
    { id: "orchard-crown", label: "Orchard Crown", glyph: "\u265B", weight: 1, pays: { 3: 37, 4: 164, 5: 1340 } }
  ],
  rules: ["Our original 5-reel,3-row slot uses20published paylines.", "The stake divides equally over20lines; stakes must be multiples of20minorunits.", "Each cell draws independently from8equally likely original symbols.", "Only3,4or5consecutive identical symbols from the first reel pay; each line pays its longest match once.", "Line awards add. There are no wilds,scatters,free spins or provider bonuses."],
  nominalReturn: { numerator: "3930", denominator: "4096", percent: "95.947265625%", proof: "For each symbol with prizes A,B,C at3,4,5matches,the contribution is(56A+7B+C)/32768. Sum all8symbols. Every line has this expectation; equal stake splitting and summing preserve it." },
  provenance: { catalog: "Official title/category only.", observed: "No completed official Multi Hot20demo round verified.", designed: "Original20paylines,8symbol labels/glyphs,uniform distributions,all prizes,limits and mathematical model. No provider source or media reused." }
};

// math/engines/shared.mjs
import { randomInt } from "node:crypto";
function error(code, message) {
  const e = new Error(message);
  e.code = code;
  throw e;
}
function draw(rng, bound) {
  const n = (rng ?? randomInt)(bound);
  if (!Number.isSafeInteger(n) || n < 0 || n >= bound) error("INVALID_RNG", "RNG must return an integer in the requested half-open range.");
  return n;
}
function stake(value, limits) {
  if (typeof value === "number" && Number.isSafeInteger(value)) value = String(value);
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) error("INVALID_BET", "Use a canonical integer minor-unit stake.");
  const n = BigInt(value);
  if (n < BigInt(limits.minBetMinor) || n > BigInt(limits.maxBetMinor) || n % BigInt(limits.betStepMinor)) error("INVALID_BET", "Stake is outside the game limits or increments.");
  return n.toString();
}
var payout = (bet, bps) => (BigInt(bet) * BigInt(bps) / 10000n).toString();
function timestamp(now) {
  const n = now instanceof Date ? now.getTime() : now ?? Date.now();
  if (!Number.isSafeInteger(n) || n < 0) error("INVALID_TIME", "Use a valid server timestamp.");
  return n;
}
function active(round) {
  if (round.status !== "active") error("ROUND_FINISHED", "The round has already ended.");
}
function baseRound(config, betMinor) {
  return { gameId: config.id, mathVersion: config.mathVersion, family: config.family, betMinor: stake(betMinor, config.limits), status: "active", winMinor: "0", step: 0, multiplierBps: 0, history: [] };
}
function publicBase(round) {
  return { gameId: round.gameId, mathVersion: round.mathVersion, family: round.family, betMinor: round.betMinor, status: round.status, winMinor: round.winMinor, step: round.step, multiplierBps: round.multiplierBps, history: round.history.map((x) => ({ ...x })), maxSteps: round.maxSteps ?? 1 };
}

// math/engines/crash.mjs
function startCrash(config, { betMinor, rng, now }) {
  const round = baseRound(config, betMinor);
  const ticket = draw(rng, config.ticketCount) + 1;
  const bustMultiplierBps = Math.min(config.maxMultiplierBps + 1, Math.floor(config.returnBps * config.ticketCount / ticket));
  return syncCrash(config, { ...round, startedAt: timestamp(now), lastObservedAt: timestamp(now), maxSteps: 1, private: { bustMultiplierBps } }, now);
}
function syncCrash(config, round, now) {
  if (round.status !== "active") return { ...round, history: round.history.map((x) => ({ ...x })), private: { ...round.private } };
  const at = timestamp(now);
  if (at < round.startedAt || at < round.lastObservedAt) error("INVALID_TIME", "Server time cannot move backwards within a round.");
  const multiplierBps = Math.min(config.maxMultiplierBps, 1e4 + Math.floor((at - round.startedAt) * config.growthBpsPerSecond / 1e3));
  const next = { ...round, lastObservedAt: at, multiplierBps, history: round.history.map((x) => ({ ...x })), private: { ...round.private } };
  if (multiplierBps >= round.private.bustMultiplierBps) return { ...next, status: "lost", step: 1, winMinor: "0", history: [{ type: "bust", multiplierBps: round.private.bustMultiplierBps }] };
  if (multiplierBps === config.maxMultiplierBps) return { ...next, status: "collected", step: 1, winMinor: payout(round.betMinor, multiplierBps), history: [{ type: "automatic-collect", multiplierBps }] };
  return next;
}
function advanceCrash(config, round, _options, now) {
  active(round);
  return syncCrash(config, round, now);
}
function collectCrash(config, round, _options, now) {
  active(round);
  const next = syncCrash(config, round, now);
  if (next.status !== "active") return next;
  return { ...next, status: "collected", step: 1, winMinor: payout(next.betMinor, next.multiplierBps), history: [{ type: "collect", multiplierBps: next.multiplierBps }] };
}
function publicCrash(config, round, now) {
  const view = syncCrash(config, round, now);
  return { ...publicBase(round), multiplierBps: view.multiplierBps, startedAt: view.startedAt, serverNow: view.lastObservedAt, growthBpsPerSecond: config.growthBpsPerSecond, maxMultiplierBps: config.maxMultiplierBps, collectibleMinor: round.status === "active" && view.status === "active" ? payout(view.betMinor, view.multiplierBps) : "0", pendingResolution: round.status === "active" && view.status !== "active", allowedActions: round.status === "active" ? ["reveal", "collect"] : [], ...round.status === "lost" ? { bustMultiplierBps: round.private.bustMultiplierBps } : {} };
}

// math/engines/slots.mjs
function calculateSlotReturn(config) {
  if (config.symbols.length !== 8 || config.symbols.some((x) => x.weight !== 1)) error("INVALID_MODEL", "This analytic model requires8uniformsymbols.");
  const numerator = config.symbols.reduce((n, s) => n + 56n * BigInt(s.pays[3]) + 7n * BigInt(s.pays[4]) + BigInt(s.pays[5]), 0n);
  const wheel = config.multiplierValues || [1];
  return { numerator: (numerator * BigInt(wheel.reduce((a, b) => a + b, 0))).toString(), denominator: (32768n * BigInt(wheel.length)).toString() };
}
function evaluateSlotGrid(config, betMinor, grid) {
  if (!Array.isArray(grid) || grid.length !== (config.rows || 3) || grid.some((row) => !Array.isArray(row) || row.length !== 5 || row.some((id) => !config.symbols.some((s) => s.id === id)))) error("INVALID_GRID", "Invalid server reel grid.");
  const stakePerLine = BigInt(betMinor) / BigInt(config.paylines.length);
  let total = 0n;
  const lineWins = [];
  for (let lineIndex = 0; lineIndex < config.paylines.length; lineIndex++) {
    const line = config.paylines[lineIndex];
    const id = grid[line[0]][0];
    let matches = 1;
    while (matches < 5 && grid[line[matches]][matches] === id) matches++;
    if (matches >= 3) {
      const symbol = config.symbols.find((x) => x.id === id);
      const prize = symbol.pays[matches];
      const win = config.proratedStake === true ? BigInt(betMinor) * BigInt(prize) / BigInt(config.paylines.length) : stakePerLine * BigInt(prize);
      total += win;
      lineWins.push({ lineIndex, payline: [...line], symbolId: id, matches, multiplier: prize, winMinor: win.toString(), positions: line.slice(0, matches).map((row, col) => ({ row, col })) });
    }
  }
  return { winMinor: total.toString(), lineWins };
}
function startSlot(config, { betMinor, rng }) {
  const round = baseRound(config, betMinor);
  const grid = Array.from({ length: config.rows || 3 }, () => Array.from({ length: 5 }, () => config.symbols[draw(rng, 8)].id));
  const result2 = evaluateSlotGrid(config, round.betMinor, grid);
  const wheel = config.multiplierValues;
  const reelMultiplier = wheel ? wheel[draw(rng, wheel.length)] : 1;
  result2.winMinor = (BigInt(result2.winMinor) * BigInt(reelMultiplier)).toString();
  if (wheel) for (const line of result2.lineWins) line.winMinor = (BigInt(line.winMinor) * BigInt(reelMultiplier)).toString();
  if (BigInt(result2.winMinor) > BigInt(config.limits.maxWinMinor)) error("PAYOUT_LIMIT_EXCEEDED", "Configured slot prize exceeds its cap.");
  return { ...round, status: result2.winMinor === "0" ? "lost" : "collected", step: 1, winMinor: result2.winMinor, multiplierBps: Number(BigInt(result2.winMinor) * 10000n / BigInt(round.betMinor)), outcome: { kind: "slots", grid, lineWins: result2.lineWins, ...wheel ? { reelMultiplier } : {} }, history: [] };
}
function publicSlot(round) {
  return { ...publicBase(round), outcome: structuredClone(round.outcome), collectibleMinor: "0", allowedActions: [] };
}

// math/engines/ladder.mjs
function startLadder(config, { betMinor, rng }) {
  const round = baseRound(config, betMinor);
  const survival = config.multipliersBps.map((m, i) => draw(rng, m) < (i ? config.multipliersBps[i - 1] : config.returnBps));
  return advanceLadder(config, { ...round, maxSteps: config.multipliersBps.length, private: { survival } }, { cell: 0 });
}
function advanceLadder(config, round, options = {}) {
  active(round);
  const cell = options.cell ?? round.step;
  if (!Number.isInteger(cell) || cell < 0 || cell >= config.multipliersBps.length || round.history.some((x) => x.cell === cell)) error("INVALID_CELL", "Choose an unused visual step.");
  const survived = round.private.survival[round.step];
  const step = round.step + 1;
  const multiplierBps = survived ? config.multipliersBps[round.step] : 0;
  const history = [...round.history, { step, cell, survived, multiplierBps }];
  const next = { ...round, step, multiplierBps, history, private: { survival: [...round.private.survival] } };
  if (!survived) return { ...next, status: "lost" };
  if (step === config.multipliersBps.length) return { ...next, status: "collected", winMinor: payout(round.betMinor, multiplierBps) };
  return next;
}
function collectLadder(config, round) {
  active(round);
  if (!round.step) error("NO_PROGRESS", "Complete a successful step first.");
  return { ...round, status: "collected", winMinor: payout(round.betMinor, config.multipliersBps[round.step - 1]), history: round.history.map((x) => ({ ...x })), private: { survival: [...round.private.survival] } };
}
function publicLadder(config, round) {
  return { ...publicBase(round), nextMultiplierBps: round.status === "active" ? config.multipliersBps[round.step] ?? null : null, collectibleMinor: round.status === "active" ? payout(round.betMinor, round.multiplierBps) : "0", revealedCells: round.history.map((x) => x.cell), path: round.history.map((x) => ({ ...x })), allowedActions: round.status === "active" ? ["reveal", "collect"] : [] };
}

// math/engines/mines.mjs
function choose(n, k) {
  if (k < 0 || k > n) return 0n;
  let r = 1n;
  for (let i = 1; i <= k; i++) r = r * BigInt(n - i + 1) / BigInt(i);
  return r;
}
function mineMultiplier(config, step) {
  if (!step) return 0;
  const bps = Number(BigInt(config.returnBps) * choose(config.cells, step) / choose(config.cells - config.mines, step));
  return config.roundMultiplierToBps ? Math.round(bps / config.roundMultiplierToBps) * config.roundMultiplierToBps : bps;
}
function startMines(config, { betMinor, rng }) {
  const round = baseRound(config, betMinor);
  const cells = Array.from({ length: config.cells }, (_, i) => i);
  for (let i = 0; i < config.mines; i++) {
    const j = i + draw(rng, config.cells - i);
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return { ...round, maxSteps: config.maxPicks, private: { mines: cells.slice(0, config.mines) } };
}
function advanceMines(config, round, options = {}) {
  active(round);
  const cell = options.cell;
  if (!Number.isInteger(cell) || cell < 0 || cell >= config.cells || round.history.some((x) => x.cell === cell)) error("INVALID_CELL", "Choose an unrevealed board cell.");
  const survived = !round.private.mines.includes(cell);
  const step = round.step + 1;
  const multiplierBps = survived ? mineMultiplier(config, step) : 0;
  const next = { ...round, step, multiplierBps, private: { mines: [...round.private.mines] }, history: [...round.history, { step, cell, survived, multiplierBps }] };
  if (!survived) return { ...next, status: "lost" };
  if (step === config.maxPicks) return { ...next, status: "collected", winMinor: payout(round.betMinor, multiplierBps) };
  return next;
}
function collectMines(_config, round) {
  active(round);
  if (!round.step) error("NO_PROGRESS", "Reveal a safe cell first.");
  return { ...round, status: "collected", winMinor: payout(round.betMinor, round.multiplierBps), history: round.history.map((x) => ({ ...x })), private: { mines: [...round.private.mines] } };
}
function publicMines(config, round) {
  return { ...publicBase(round), cells: config.cells, rows: config.rows, cols: config.cols, mines: config.mines, nextMultiplierBps: round.status === "active" ? mineMultiplier(config, round.step + 1) : null, collectibleMinor: round.status === "active" ? payout(round.betMinor, round.multiplierBps) : "0", revealedCells: round.history.map((x) => x.cell), allowedActions: round.status === "active" ? round.step ? ["reveal", "collect"] : ["reveal"] : [], ...round.status !== "active" ? { mineCells: [...round.private.mines] } : {} };
}

// math/engines/instant.mjs
function startInstant(config, { betMinor, rng, options = {} }) {
  const round = baseRound(config, betMinor);
  let outcome, multiplierBps = 0;
  if (config.family === "wheel") {
    const ticket = draw(rng, config.sectors.reduce((n, s) => n + s.weight, 0));
    let cursor = 0;
    let sector;
    for (const s of config.sectors) {
      cursor += s.weight;
      if (ticket < cursor) {
        sector = s;
        break;
      }
    }
    multiplierBps = sector.multiplierBps;
    outcome = { kind: "wheel", sector: sector.id, label: sector.label, multiplierBps };
  } else if (config.family === "plinko") {
    const path = Array.from({ length: config.rows }, () => draw(rng, 2));
    const bucket = path.reduce((n, b) => n + b, 0);
    multiplierBps = config.bucketMultipliersBps[bucket];
    outcome = { kind: "plinko", path, bucket, multiplierBps };
  } else if (config.family === "dice") {
    const target = options.target ?? config.defaultTarget;
    if (!Number.isInteger(target) || target < config.minTarget || target > config.maxTarget) error("INVALID_TARGET", "Choose a permitted integer target.");
    const roll = draw(rng, 100);
    const success = roll < target;
    const offeredMultiplierBps = Math.floor(config.returnBps * 100 / target);
    multiplierBps = success ? offeredMultiplierBps : 0;
    outcome = { kind: "dice", roll, target, success, offeredMultiplierBps, multiplierBps };
  } else error("INVALID_GAME", "Unsupported instant family.");
  const winMinor = payout(round.betMinor, multiplierBps);
  return { ...round, status: winMinor === "0" ? "lost" : "collected", step: 1, multiplierBps, winMinor, outcome };
}
function publicInstant(round) {
  return { ...publicBase(round), outcome: structuredClone(round.outcome), collectibleMinor: "0", allowedActions: [] };
}

// math/games/jetx.mjs
var jetx_default = {
  "id": "ind74_jetx",
  "title": "New Era of JetX \u2014 Independent",
  "catalogName": "New Era of JetX",
  "sourceCategory": "Crash Games",
  "mathVersion": "independent-jetx-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Lunar Arcade 3",
    "colors": [
      "#514950",
      "#12c6f6",
      "#4a84e9"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "9000000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/jetx",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "crash",
  "model": "clock-crash-v1",
  "ticketCount": 1e6,
  "returnBps": 9480,
  "maxMultiplierBps": 9e5,
  "growthBpsPerSecond": 1262,
  "rules": [
    "This original server-clock crash game can lose immediately. Collect before the hidden bust point.",
    "The server clock determines the collection multiplier. Client-supplied payouts or multipliers are ignored.",
    "Surviving the maximum multiplier collects automatically. Payouts round down to whole minor units."
  ],
  "paytable": [
    {
      "label": "First milestone",
      "multiplierBps": 11e3
    },
    {
      "label": "Double",
      "multiplierBps": 2e4
    },
    {
      "label": "Maximum",
      "multiplierBps": 9e5
    }
  ],
  "nominalReturn": {
    "numerator": "9480",
    "denominator": "10000",
    "type": "upper-bound-before-floor",
    "proof": "AtBPSmultiplierM,survival=floor(9480\xD71000000/(M+1))/1000000.Exactreturnequals survival\xD7floor(bet\xD7M/10000)/bet."
  }
};

// math/games/balloonx.mjs
var balloonx_default = {
  "id": "ind74_balloonx",
  "title": "BalloonX \u2014 Independent",
  "catalogName": "BalloonX",
  "sourceCategory": "Crash Games",
  "mathVersion": "independent-balloonx-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Cobalt Lanterns 4",
    "colors": [
      "#7f2ba6",
      "#f2932f",
      "#27f42d"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "11000000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/balloonx",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "crash",
  "model": "clock-crash-v1",
  "ticketCount": 1e6,
  "returnBps": 9520,
  "maxMultiplierBps": 11e5,
  "growthBpsPerSecond": 1293,
  "rules": [
    "This original server-clock crash game can lose immediately. Collect before the hidden bust point.",
    "The server clock determines the collection multiplier. Client-supplied payouts or multipliers are ignored.",
    "Surviving the maximum multiplier collects automatically. Payouts round down to whole minor units."
  ],
  "paytable": [
    {
      "label": "First milestone",
      "multiplierBps": 11e3
    },
    {
      "label": "Double",
      "multiplierBps": 2e4
    },
    {
      "label": "Maximum",
      "multiplierBps": 11e5
    }
  ],
  "nominalReturn": {
    "numerator": "9520",
    "denominator": "10000",
    "type": "upper-bound-before-floor",
    "proof": "AtBPSmultiplierM,survival=floor(9520\xD71000000/(M+1))/1000000.Exactreturnequals survival\xD7floor(bet\xD7M/10000)/bet."
  }
};

// math/games/plinkoxclassic.mjs
var plinkoxclassic_default = {
  "id": "ind74_plinkoxclassic",
  "title": "Plinko X Classic \u2014 Independent",
  "catalogName": "Plinko X Classic",
  "sourceCategory": "Instant Games",
  "mathVersion": "independent-plinkoxclassic-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Jade Orchard 5",
    "colors": [
      "#d66bf1",
      "#b13215",
      "#9ef8c7"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "1392000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/plinko-x-classic",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "plinko",
  "model": "binomial-plinko-v1",
  "rows": 8,
  "bucketMultipliersBps": [
    139200,
    9800,
    8800,
    8200,
    8e3,
    8200,
    8800,
    9800,
    139200
  ],
  "rules": [
    "This original 8-row path independently turns left or right with probability one half at each peg.",
    "The bucket index equals the number of right turns. Bucket k has probability C(rows,k) divided by 2 raised to rows.",
    "The published bucket multiplier gives the total payout. Prizes round down to whole minor units."
  ],
  "paytable": [
    {
      "label": "Bucket 0",
      "multiplierBps": 139200,
      "probabilityNumerator": "1",
      "probabilityDenominator": "256"
    },
    {
      "label": "Bucket 1",
      "multiplierBps": 9800,
      "probabilityNumerator": "8",
      "probabilityDenominator": "256"
    },
    {
      "label": "Bucket 2",
      "multiplierBps": 8800,
      "probabilityNumerator": "28",
      "probabilityDenominator": "256"
    },
    {
      "label": "Bucket 3",
      "multiplierBps": 8200,
      "probabilityNumerator": "56",
      "probabilityDenominator": "256"
    },
    {
      "label": "Bucket 4",
      "multiplierBps": 8e3,
      "probabilityNumerator": "70",
      "probabilityDenominator": "256"
    },
    {
      "label": "Bucket 5",
      "multiplierBps": 8200,
      "probabilityNumerator": "56",
      "probabilityDenominator": "256"
    },
    {
      "label": "Bucket 6",
      "multiplierBps": 8800,
      "probabilityNumerator": "28",
      "probabilityDenominator": "256"
    },
    {
      "label": "Bucket 7",
      "multiplierBps": 9800,
      "probabilityNumerator": "8",
      "probabilityDenominator": "256"
    },
    {
      "label": "Bucket 8",
      "multiplierBps": 139200,
      "probabilityNumerator": "1",
      "probabilityDenominator": "256"
    }
  ],
  "nominalReturn": {
    "numerator": "2406400",
    "denominator": "2560000",
    "type": "before-integer-floor",
    "proof": "Sum(C(rows,k)\xD7bucketBps[k])/(2^rows\xD710000).Exactbetreturn uses integer flooredprizes."
  }
};

// math/games/propelx.mjs
var propelx_default = {
  "id": "ind74_propelx",
  "title": "Propel X \u2014 Independent",
  "catalogName": "Propel X",
  "sourceCategory": "Crash Games",
  "mathVersion": "independent-propelx-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Ember Spire 6",
    "colors": [
      "#624776",
      "#bd9111",
      "#948297"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "15000000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/propel-x",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "crash",
  "model": "clock-crash-v1",
  "ticketCount": 1e6,
  "returnBps": 9600,
  "maxMultiplierBps": 15e5,
  "growthBpsPerSecond": 1355,
  "rules": [
    "This original server-clock crash game can lose immediately. Collect before the hidden bust point.",
    "The server clock determines the collection multiplier. Client-supplied payouts or multipliers are ignored.",
    "Surviving the maximum multiplier collects automatically. Payouts round down to whole minor units."
  ],
  "paytable": [
    {
      "label": "First milestone",
      "multiplierBps": 11e3
    },
    {
      "label": "Double",
      "multiplierBps": 2e4
    },
    {
      "label": "Maximum",
      "multiplierBps": 15e5
    }
  ],
  "nominalReturn": {
    "numerator": "9600",
    "denominator": "10000",
    "type": "upper-bound-before-floor",
    "proof": "AtBPSmultiplierM,survival=floor(9600\xD71000000/(M+1))/1000000.Exactreturnequals survival\xD7floor(bet\xD7M/10000)/bet."
  }
};

// math/games/worldchampionx.mjs
var worldchampionx_default = {
  "id": "ind74_worldchampionx",
  "title": "World Champion X \u2014 Independent",
  "catalogName": "World Champion X",
  "sourceCategory": "Crash Games",
  "mathVersion": "independent-worldchampionx-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Aurora Garden 7",
    "colors": [
      "#9602ba",
      "#5a533f",
      "#311c18"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "5000000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/world-champion-x",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "crash",
  "model": "clock-crash-v1",
  "ticketCount": 1e6,
  "returnBps": 9640,
  "maxMultiplierBps": 5e5,
  "growthBpsPerSecond": 1386,
  "rules": [
    "This original server-clock crash game can lose immediately. Collect before the hidden bust point.",
    "The server clock determines the collection multiplier. Client-supplied payouts or multipliers are ignored.",
    "Surviving the maximum multiplier collects automatically. Payouts round down to whole minor units."
  ],
  "paytable": [
    {
      "label": "First milestone",
      "multiplierBps": 11e3
    },
    {
      "label": "Double",
      "multiplierBps": 2e4
    },
    {
      "label": "Maximum",
      "multiplierBps": 5e5
    }
  ],
  "nominalReturn": {
    "numerator": "9640",
    "denominator": "10000",
    "type": "upper-bound-before-floor",
    "proof": "AtBPSmultiplierM,survival=floor(9640\xD71000000/(M+1))/1000000.Exactreturnequals survival\xD7floor(bet\xD7M/10000)/bet."
  }
};

// math/games/poweroftiger.mjs
var poweroftiger_default = {
  "id": "ind74_poweroftiger",
  "title": "Power of Tiger \u2014 Independent",
  "catalogName": "Power of Tiger",
  "sourceCategory": "Slots",
  "mathVersion": "independent-poweroftiger-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Copper Voyage 8",
    "colors": [
      "#a4e848",
      "#a861ce",
      "#ad4aa5"
    ]
  },
  "limits": {
    "minBetMinor": "25",
    "maxBetMinor": "100000",
    "betStepMinor": "25",
    "maxWinMinor": "118100000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/power-of-tiger",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      0,
      1
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      0,
      0,
      0,
      1,
      0
    ],
    [
      0,
      0,
      0,
      1,
      1
    ],
    [
      0,
      0,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      2,
      0
    ],
    [
      0,
      0,
      0,
      2,
      1
    ],
    [
      0,
      0,
      0,
      2,
      2
    ],
    [
      0,
      0,
      1,
      0,
      0
    ],
    [
      0,
      0,
      1,
      0,
      1
    ],
    [
      0,
      0,
      1,
      0,
      2
    ],
    [
      0,
      0,
      1,
      1,
      0
    ],
    [
      0,
      0,
      1,
      1,
      1
    ],
    [
      0,
      0,
      1,
      1,
      2
    ],
    [
      0,
      0,
      1,
      2,
      0
    ],
    [
      0,
      0,
      1,
      2,
      1
    ],
    [
      0,
      0,
      1,
      2,
      2
    ],
    [
      0,
      0,
      2,
      0,
      0
    ],
    [
      0,
      0,
      2,
      0,
      1
    ],
    [
      0,
      0,
      2,
      0,
      2
    ]
  ],
  "symbols": [
    {
      "id": "poweroftiger-symbol-0",
      "label": "Ivory Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 114,
        "5": 901
      }
    },
    {
      "id": "poweroftiger-symbol-1",
      "label": "Ruby Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 118,
        "5": 941
      }
    },
    {
      "id": "poweroftiger-symbol-2",
      "label": "Copper Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 122,
        "5": 981
      }
    },
    {
      "id": "poweroftiger-symbol-3",
      "label": "Citrus Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 126,
        "5": 1021
      }
    },
    {
      "id": "poweroftiger-symbol-4",
      "label": "Orchard Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 130,
        "5": 1061
      }
    },
    {
      "id": "poweroftiger-symbol-5",
      "label": "Velvet Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 38,
        "4": 134,
        "5": 1101
      }
    },
    {
      "id": "poweroftiger-symbol-6",
      "label": "Amber Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 40,
        "4": 138,
        "5": 1141
      }
    },
    {
      "id": "poweroftiger-symbol-7",
      "label": "Prism Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 42,
        "4": 142,
        "5": 1181
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 25 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3897",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/multifruitschargingwilds.mjs
var multifruitschargingwilds_default = {
  "id": "ind74_multifruitschargingwilds",
  "title": "Multi Fruits Charging Wilds \u2014 Independent",
  "catalogName": "Multi Fruits Charging Wilds",
  "sourceCategory": "Slots",
  "mathVersion": "independent-multifruitschargingwilds-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Lunar Arcade 9",
    "colors": [
      "#557c7f",
      "#802815",
      "#a037c7"
    ]
  },
  "limits": {
    "minBetMinor": "5",
    "maxBetMinor": "100000",
    "betStepMinor": "5",
    "maxWinMinor": "152500000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/multi-fruits-charging-wilds",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ]
  ],
  "symbols": [
    {
      "id": "multifruitschargingwilds-symbol-0",
      "label": "Ruby Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 21,
        "4": 121,
        "5": 1245
      }
    },
    {
      "id": "multifruitschargingwilds-symbol-1",
      "label": "Copper Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 23,
        "4": 125,
        "5": 1285
      }
    },
    {
      "id": "multifruitschargingwilds-symbol-2",
      "label": "Citrus Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 25,
        "4": 129,
        "5": 1325
      }
    },
    {
      "id": "multifruitschargingwilds-symbol-3",
      "label": "Orchard Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 133,
        "5": 1365
      }
    },
    {
      "id": "multifruitschargingwilds-symbol-4",
      "label": "Velvet Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 137,
        "5": 1405
      }
    },
    {
      "id": "multifruitschargingwilds-symbol-5",
      "label": "Amber Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 141,
        "5": 1445
      }
    },
    {
      "id": "multifruitschargingwilds-symbol-6",
      "label": "Prism Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 145,
        "5": 1485
      }
    },
    {
      "id": "multifruitschargingwilds-symbol-7",
      "label": "Ivory Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 149,
        "5": 1525
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 5 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3898",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/gemscrownchargingwilds.mjs
var gemscrownchargingwilds_default = {
  "id": "ind74_gemscrownchargingwilds",
  "title": "Gems Crown Charging Wilds \u2014 Independent",
  "catalogName": "Gems Crown Charging Wilds",
  "sourceCategory": "Slots",
  "mathVersion": "independent-gemscrownchargingwilds-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Cobalt Lanterns 10",
    "colors": [
      "#19d392",
      "#c61b10",
      "#2450e0"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "142100000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/gems-crown-charging-wilds",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      0,
      1
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      0,
      0,
      0,
      1,
      0
    ],
    [
      0,
      0,
      0,
      1,
      1
    ],
    [
      0,
      0,
      0,
      1,
      2
    ]
  ],
  "symbols": [
    {
      "id": "gemscrownchargingwilds-symbol-0",
      "label": "Copper Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 22,
        "4": 128,
        "5": 1141
      }
    },
    {
      "id": "gemscrownchargingwilds-symbol-1",
      "label": "Citrus Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 24,
        "4": 132,
        "5": 1181
      }
    },
    {
      "id": "gemscrownchargingwilds-symbol-2",
      "label": "Orchard Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 26,
        "4": 136,
        "5": 1221
      }
    },
    {
      "id": "gemscrownchargingwilds-symbol-3",
      "label": "Velvet Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 140,
        "5": 1261
      }
    },
    {
      "id": "gemscrownchargingwilds-symbol-4",
      "label": "Amber Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 144,
        "5": 1301
      }
    },
    {
      "id": "gemscrownchargingwilds-symbol-5",
      "label": "Prism Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 148,
        "5": 1341
      }
    },
    {
      "id": "gemscrownchargingwilds-symbol-6",
      "label": "Ivory Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 152,
        "5": 1381
      }
    },
    {
      "id": "gemscrownchargingwilds-symbol-7",
      "label": "Ruby Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 156,
        "5": 1421
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 10 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3899",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/gatesofmerlyn.mjs
var gatesofmerlyn_default = {
  "id": "ind74_gatesofmerlyn",
  "title": "Gates of Merlyn \u2014 Independent",
  "catalogName": "Gates of Merlyn",
  "sourceCategory": "Slots",
  "mathVersion": "independent-gatesofmerlyn-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Jade Orchard 11",
    "colors": [
      "#a6c215",
      "#e70f37",
      "#d7e997"
    ]
  },
  "limits": {
    "minBetMinor": "20",
    "maxBetMinor": "100000",
    "betStepMinor": "20",
    "maxWinMinor": "131700000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/gates-of-merlyn",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      0,
      1
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      0,
      0,
      0,
      1,
      0
    ],
    [
      0,
      0,
      0,
      1,
      1
    ],
    [
      0,
      0,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      2,
      0
    ],
    [
      0,
      0,
      0,
      2,
      1
    ],
    [
      0,
      0,
      0,
      2,
      2
    ],
    [
      0,
      0,
      1,
      0,
      0
    ],
    [
      0,
      0,
      1,
      0,
      1
    ],
    [
      0,
      0,
      1,
      0,
      2
    ],
    [
      0,
      0,
      1,
      1,
      0
    ],
    [
      0,
      0,
      1,
      1,
      1
    ],
    [
      0,
      0,
      1,
      1,
      2
    ],
    [
      0,
      0,
      1,
      2,
      0
    ]
  ],
  "symbols": [
    {
      "id": "gatesofmerlyn-symbol-0",
      "label": "Citrus Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 23,
        "4": 135,
        "5": 1037
      }
    },
    {
      "id": "gatesofmerlyn-symbol-1",
      "label": "Orchard Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 25,
        "4": 139,
        "5": 1077
      }
    },
    {
      "id": "gatesofmerlyn-symbol-2",
      "label": "Velvet Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 143,
        "5": 1117
      }
    },
    {
      "id": "gatesofmerlyn-symbol-3",
      "label": "Amber Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 147,
        "5": 1157
      }
    },
    {
      "id": "gatesofmerlyn-symbol-4",
      "label": "Prism Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 151,
        "5": 1197
      }
    },
    {
      "id": "gatesofmerlyn-symbol-5",
      "label": "Ivory Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 155,
        "5": 1237
      }
    },
    {
      "id": "gatesofmerlyn-symbol-6",
      "label": "Ruby Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 159,
        "5": 1277
      }
    },
    {
      "id": "gatesofmerlyn-symbol-7",
      "label": "Copper Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 37,
        "4": 163,
        "5": 1317
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 20 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3900",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/chickenways.mjs
var chickenways_default = {
  "id": "ind74_chickenways",
  "title": "Chicken Ways \u2014 Independent",
  "catalogName": "Chicken Ways",
  "sourceCategory": "Mine Games",
  "mathVersion": "independent-chickenways-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Ember Spire 12",
    "colors": [
      "#0390eb",
      "#e6964d",
      "#c3372a"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "11100000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/chicken-ways",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "ladder",
  "model": "conditional-ladder-v1",
  "returnBps": 9640,
  "multipliersBps": [
    14e3,
    17e3,
    2e4,
    3e4,
    5e4,
    8e4,
    15e4,
    3e5,
    6e5,
    111e4
  ],
  "modes": [
    "easy"
  ],
  "defaultMode": "easy",
  "maxSteps": 10,
  "rules": [
    "This original ten-step ladder attempts the first step on Play. The first step can fail.",
    "Each successful step offers Collect. A failed step forfeits all uncollected value.",
    "First-step survival is return basis points divided by the first multiplier. Later conditional survival is previous multiplier divided by next multiplier.",
    "Visual step choices do not change probabilities. The final successful step collects automatically."
  ],
  "paytable": [
    {
      "mode": "easy",
      "rows": [
        {
          "label": "Step 1",
          "step": 1,
          "multiplierBps": 14e3,
          "conditionalSurvival": {
            "numerator": 9640,
            "denominator": 14e3
          }
        },
        {
          "label": "Step 2",
          "step": 2,
          "multiplierBps": 17e3,
          "conditionalSurvival": {
            "numerator": 14e3,
            "denominator": 17e3
          }
        },
        {
          "label": "Step 3",
          "step": 3,
          "multiplierBps": 2e4,
          "conditionalSurvival": {
            "numerator": 17e3,
            "denominator": 2e4
          }
        },
        {
          "label": "Step 4",
          "step": 4,
          "multiplierBps": 3e4,
          "conditionalSurvival": {
            "numerator": 2e4,
            "denominator": 3e4
          }
        },
        {
          "label": "Step 5",
          "step": 5,
          "multiplierBps": 5e4,
          "conditionalSurvival": {
            "numerator": 3e4,
            "denominator": 5e4
          }
        },
        {
          "label": "Step 6",
          "step": 6,
          "multiplierBps": 8e4,
          "conditionalSurvival": {
            "numerator": 5e4,
            "denominator": 8e4
          }
        },
        {
          "label": "Step 7",
          "step": 7,
          "multiplierBps": 15e4,
          "conditionalSurvival": {
            "numerator": 8e4,
            "denominator": 15e4
          }
        },
        {
          "label": "Step 8",
          "step": 8,
          "multiplierBps": 3e5,
          "conditionalSurvival": {
            "numerator": 15e4,
            "denominator": 3e5
          }
        },
        {
          "label": "Step 9",
          "step": 9,
          "multiplierBps": 6e5,
          "conditionalSurvival": {
            "numerator": 3e5,
            "denominator": 6e5
          }
        },
        {
          "label": "Step 10",
          "step": 10,
          "multiplierBps": 111e4,
          "conditionalSurvival": {
            "numerator": 6e5,
            "denominator": 111e4
          }
        }
      ]
    }
  ],
  "nominalReturn": {
    "numerator": "9640",
    "denominator": "10000",
    "type": "before-integer-floor",
    "proof": "Conditionalsurvivalprobabilities telescope toreturnBps/Mk;expectedprize=bet\xD7returnBps/10000beforeintegerfloor."
  }
};

// math/games/dicejungle.mjs
var dicejungle_default = {
  "id": "ind74_dicejungle",
  "title": "Dice Jungle \u2014 Independent",
  "catalogName": "Dice Jungle",
  "sourceCategory": "Slots",
  "mathVersion": "independent-dicejungle-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Aurora Garden 13",
    "colors": [
      "#e29ddb",
      "#94afdd",
      "#692990"
    ]
  },
  "limits": {
    "minBetMinor": "5",
    "maxBetMinor": "100000",
    "betStepMinor": "5",
    "maxWinMinor": "139600000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/dice-jungle",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ]
  ],
  "symbols": [
    {
      "id": "dicejungle-symbol-0",
      "label": "Velvet Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 25,
        "4": 108,
        "5": 1116
      }
    },
    {
      "id": "dicejungle-symbol-1",
      "label": "Amber Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 112,
        "5": 1156
      }
    },
    {
      "id": "dicejungle-symbol-2",
      "label": "Prism Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 116,
        "5": 1196
      }
    },
    {
      "id": "dicejungle-symbol-3",
      "label": "Ivory Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 120,
        "5": 1236
      }
    },
    {
      "id": "dicejungle-symbol-4",
      "label": "Ruby Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 124,
        "5": 1276
      }
    },
    {
      "id": "dicejungle-symbol-5",
      "label": "Copper Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 128,
        "5": 1316
      }
    },
    {
      "id": "dicejungle-symbol-6",
      "label": "Citrus Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 37,
        "4": 132,
        "5": 1356
      }
    },
    {
      "id": "dicejungle-symbol-7",
      "label": "Orchard Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 39,
        "4": 136,
        "5": 1396
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 5 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3902",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/multihot5wild.mjs
var multihot5wild_default = {
  "id": "ind74_multihot5wild",
  "title": "Multi Hot 5 Wild \u2014 Independent",
  "catalogName": "Multi Hot 5 Wild",
  "sourceCategory": "Slots",
  "mathVersion": "independent-multihot5wild-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Copper Voyage 14",
    "colors": [
      "#7a36f5",
      "#f17374",
      "#795237"
    ]
  },
  "limits": {
    "minBetMinor": "5",
    "maxBetMinor": "100000",
    "betStepMinor": "5",
    "maxWinMinor": "129200000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/multi-hot-5-wild",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ]
  ],
  "symbols": [
    {
      "id": "multihot5wild-symbol-0",
      "label": "Amber Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 26,
        "4": 115,
        "5": 1012
      }
    },
    {
      "id": "multihot5wild-symbol-1",
      "label": "Prism Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 119,
        "5": 1052
      }
    },
    {
      "id": "multihot5wild-symbol-2",
      "label": "Ivory Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 123,
        "5": 1092
      }
    },
    {
      "id": "multihot5wild-symbol-3",
      "label": "Ruby Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 127,
        "5": 1132
      }
    },
    {
      "id": "multihot5wild-symbol-4",
      "label": "Copper Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 131,
        "5": 1172
      }
    },
    {
      "id": "multihot5wild-symbol-5",
      "label": "Citrus Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 135,
        "5": 1212
      }
    },
    {
      "id": "multihot5wild-symbol-6",
      "label": "Orchard Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 38,
        "4": 139,
        "5": 1252
      }
    },
    {
      "id": "multihot5wild-symbol-7",
      "label": "Velvet Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 40,
        "4": 143,
        "5": 1292
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 5 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3903",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/cheesyroad.mjs
var cheesyroad_default = {
  "id": "ind74_cheesyroad",
  "title": "Cheesy Road \u2014 Independent",
  "catalogName": "Cheesy Road",
  "sourceCategory": "Mine Games",
  "mathVersion": "independent-cheesyroad-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Lunar Arcade 15",
    "colors": [
      "#efa4a1",
      "#96d464",
      "#cf6fee"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "11400000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/cheesy-road",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "ladder",
  "model": "conditional-ladder-v1",
  "returnBps": 9520,
  "multipliersBps": [
    13e3,
    17e3,
    2e4,
    3e4,
    5e4,
    8e4,
    15e4,
    3e5,
    6e5,
    114e4
  ],
  "modes": [
    "easy"
  ],
  "defaultMode": "easy",
  "maxSteps": 10,
  "rules": [
    "This original ten-step ladder attempts the first step on Play. The first step can fail.",
    "Each successful step offers Collect. A failed step forfeits all uncollected value.",
    "First-step survival is return basis points divided by the first multiplier. Later conditional survival is previous multiplier divided by next multiplier.",
    "Visual step choices do not change probabilities. The final successful step collects automatically."
  ],
  "paytable": [
    {
      "mode": "easy",
      "rows": [
        {
          "label": "Step 1",
          "step": 1,
          "multiplierBps": 13e3,
          "conditionalSurvival": {
            "numerator": 9520,
            "denominator": 13e3
          }
        },
        {
          "label": "Step 2",
          "step": 2,
          "multiplierBps": 17e3,
          "conditionalSurvival": {
            "numerator": 13e3,
            "denominator": 17e3
          }
        },
        {
          "label": "Step 3",
          "step": 3,
          "multiplierBps": 2e4,
          "conditionalSurvival": {
            "numerator": 17e3,
            "denominator": 2e4
          }
        },
        {
          "label": "Step 4",
          "step": 4,
          "multiplierBps": 3e4,
          "conditionalSurvival": {
            "numerator": 2e4,
            "denominator": 3e4
          }
        },
        {
          "label": "Step 5",
          "step": 5,
          "multiplierBps": 5e4,
          "conditionalSurvival": {
            "numerator": 3e4,
            "denominator": 5e4
          }
        },
        {
          "label": "Step 6",
          "step": 6,
          "multiplierBps": 8e4,
          "conditionalSurvival": {
            "numerator": 5e4,
            "denominator": 8e4
          }
        },
        {
          "label": "Step 7",
          "step": 7,
          "multiplierBps": 15e4,
          "conditionalSurvival": {
            "numerator": 8e4,
            "denominator": 15e4
          }
        },
        {
          "label": "Step 8",
          "step": 8,
          "multiplierBps": 3e5,
          "conditionalSurvival": {
            "numerator": 15e4,
            "denominator": 3e5
          }
        },
        {
          "label": "Step 9",
          "step": 9,
          "multiplierBps": 6e5,
          "conditionalSurvival": {
            "numerator": 3e5,
            "denominator": 6e5
          }
        },
        {
          "label": "Step 10",
          "step": 10,
          "multiplierBps": 114e4,
          "conditionalSurvival": {
            "numerator": 6e5,
            "denominator": 114e4
          }
        }
      ]
    }
  ],
  "nominalReturn": {
    "numerator": "9520",
    "denominator": "10000",
    "type": "before-integer-floor",
    "proof": "Conditionalsurvivalprobabilities telescope toreturnBps/Mk;expectedprize=bet\xD7returnBps/10000beforeintegerfloor."
  }
};

// math/games/fortunecatch.mjs
var fortunecatch_default = {
  "id": "ind74_fortunecatch",
  "title": "Fortune Catch \u2014 Independent",
  "catalogName": "Fortune Catch",
  "sourceCategory": "Instant Games",
  "mathVersion": "independent-fortunecatch-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Cobalt Lanterns 16",
    "colors": [
      "#14877f",
      "#d88232",
      "#bacdbe"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "5190000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/fortune-catch",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "wheel",
  "model": "weighted-wheel-v1",
  "sectors": [
    {
      "id": "sector-0",
      "label": "Cloud",
      "weight": 40,
      "multiplierBps": 0
    },
    {
      "id": "sector-1",
      "label": "Mist",
      "weight": 25,
      "multiplierBps": 0
    },
    {
      "id": "sector-2",
      "label": "Rest",
      "weight": 15,
      "multiplierBps": 0
    },
    {
      "id": "sector-3",
      "label": "Spark",
      "weight": 10,
      "multiplierBps": 1e4
    },
    {
      "id": "sector-4",
      "label": "Pair",
      "weight": 5,
      "multiplierBps": 2e4
    },
    {
      "id": "sector-5",
      "label": "Glow",
      "weight": 3,
      "multiplierBps": 41500
    },
    {
      "id": "sector-6",
      "label": "Prism",
      "weight": 1,
      "multiplierBps": 101500
    },
    {
      "id": "sector-7",
      "label": "Crown",
      "weight": 1,
      "multiplierBps": 519e3
    }
  ],
  "rules": [
    "This original eight-sector weighted wheel settles when Play is pressed.",
    "Each sector's probability is its published weight divided by 100. Its multiplier gives the total payout, including the stake.",
    "Zero sectors lose. Nonzero prizes round down to whole minor units."
  ],
  "paytable": [
    {
      "id": "sector-0",
      "label": "Cloud",
      "weight": 40,
      "multiplierBps": 0
    },
    {
      "id": "sector-1",
      "label": "Mist",
      "weight": 25,
      "multiplierBps": 0
    },
    {
      "id": "sector-2",
      "label": "Rest",
      "weight": 15,
      "multiplierBps": 0
    },
    {
      "id": "sector-3",
      "label": "Spark",
      "weight": 10,
      "multiplierBps": 1e4
    },
    {
      "id": "sector-4",
      "label": "Pair",
      "weight": 5,
      "multiplierBps": 2e4
    },
    {
      "id": "sector-5",
      "label": "Glow",
      "weight": 3,
      "multiplierBps": 41500
    },
    {
      "id": "sector-6",
      "label": "Prism",
      "weight": 1,
      "multiplierBps": 101500
    },
    {
      "id": "sector-7",
      "label": "Crown",
      "weight": 1,
      "multiplierBps": 519e3
    }
  ],
  "nominalReturn": {
    "numerator": "945000",
    "denominator": "1000000",
    "type": "before-integer-floor",
    "proof": "Sum(weight\xD7multiplierBps)/(100\xD710000).Exactbet-dependentreturn uses flooredsectorpayouts."
  }
};

// math/games/cheesyroadclassic.mjs
var cheesyroadclassic_default = {
  "id": "ind74_cheesyroadclassic",
  "title": "Cheesy Road Classic \u2014 Independent",
  "catalogName": "Cheesy Road Classic",
  "sourceCategory": "Mine Games",
  "mathVersion": "independent-cheesyroadclassic-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Ember Spire 18",
    "colors": [
      "#ac8875",
      "#851a65",
      "#b77d72"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "11700000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/cheesy-road-classic",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "ladder",
  "model": "conditional-ladder-v1",
  "returnBps": 9640,
  "multipliersBps": [
    12e3,
    17e3,
    2e4,
    3e4,
    5e4,
    8e4,
    15e4,
    3e5,
    6e5,
    117e4
  ],
  "modes": [
    "easy"
  ],
  "defaultMode": "easy",
  "maxSteps": 10,
  "rules": [
    "This original ten-step ladder attempts the first step on Play. The first step can fail.",
    "Each successful step offers Collect. A failed step forfeits all uncollected value.",
    "First-step survival is return basis points divided by the first multiplier. Later conditional survival is previous multiplier divided by next multiplier.",
    "Visual step choices do not change probabilities. The final successful step collects automatically."
  ],
  "paytable": [
    {
      "mode": "easy",
      "rows": [
        {
          "label": "Step 1",
          "step": 1,
          "multiplierBps": 12e3,
          "conditionalSurvival": {
            "numerator": 9640,
            "denominator": 12e3
          }
        },
        {
          "label": "Step 2",
          "step": 2,
          "multiplierBps": 17e3,
          "conditionalSurvival": {
            "numerator": 12e3,
            "denominator": 17e3
          }
        },
        {
          "label": "Step 3",
          "step": 3,
          "multiplierBps": 2e4,
          "conditionalSurvival": {
            "numerator": 17e3,
            "denominator": 2e4
          }
        },
        {
          "label": "Step 4",
          "step": 4,
          "multiplierBps": 3e4,
          "conditionalSurvival": {
            "numerator": 2e4,
            "denominator": 3e4
          }
        },
        {
          "label": "Step 5",
          "step": 5,
          "multiplierBps": 5e4,
          "conditionalSurvival": {
            "numerator": 3e4,
            "denominator": 5e4
          }
        },
        {
          "label": "Step 6",
          "step": 6,
          "multiplierBps": 8e4,
          "conditionalSurvival": {
            "numerator": 5e4,
            "denominator": 8e4
          }
        },
        {
          "label": "Step 7",
          "step": 7,
          "multiplierBps": 15e4,
          "conditionalSurvival": {
            "numerator": 8e4,
            "denominator": 15e4
          }
        },
        {
          "label": "Step 8",
          "step": 8,
          "multiplierBps": 3e5,
          "conditionalSurvival": {
            "numerator": 15e4,
            "denominator": 3e5
          }
        },
        {
          "label": "Step 9",
          "step": 9,
          "multiplierBps": 6e5,
          "conditionalSurvival": {
            "numerator": 3e5,
            "denominator": 6e5
          }
        },
        {
          "label": "Step 10",
          "step": 10,
          "multiplierBps": 117e4,
          "conditionalSurvival": {
            "numerator": 6e5,
            "denominator": 117e4
          }
        }
      ]
    }
  ],
  "nominalReturn": {
    "numerator": "9640",
    "denominator": "10000",
    "type": "before-integer-floor",
    "proof": "Conditionalsurvivalprobabilities telescope toreturnBps/Mk;expectedprize=bet\xD7returnBps/10000beforeintegerfloor."
  }
};

// math/games/multihot10.mjs
var multihot10_default = {
  "id": "ind74_multihot10",
  "title": "Multi Hot 10 \u2014 Independent",
  "catalogName": "Multi Hot 10",
  "sourceCategory": "Slots",
  "mathVersion": "independent-multihot10-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Aurora Garden 19",
    "colors": [
      "#eb187e",
      "#46a641",
      "#7d27c4"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "150700000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/multi-hot-10-2",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      0,
      1
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      0,
      0,
      0,
      1,
      0
    ],
    [
      0,
      0,
      0,
      1,
      1
    ],
    [
      0,
      0,
      0,
      1,
      2
    ]
  ],
  "symbols": [
    {
      "id": "multihot10-symbol-0",
      "label": "Citrus Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 23,
        "4": 109,
        "5": 1227
      }
    },
    {
      "id": "multihot10-symbol-1",
      "label": "Orchard Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 25,
        "4": 113,
        "5": 1267
      }
    },
    {
      "id": "multihot10-symbol-2",
      "label": "Velvet Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 117,
        "5": 1307
      }
    },
    {
      "id": "multihot10-symbol-3",
      "label": "Amber Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 121,
        "5": 1347
      }
    },
    {
      "id": "multihot10-symbol-4",
      "label": "Prism Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 125,
        "5": 1387
      }
    },
    {
      "id": "multihot10-symbol-5",
      "label": "Ivory Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 129,
        "5": 1427
      }
    },
    {
      "id": "multihot10-symbol-6",
      "label": "Ruby Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 133,
        "5": 1467
      }
    },
    {
      "id": "multihot10-symbol-7",
      "label": "Copper Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 37,
        "4": 137,
        "5": 1507
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 10 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3908",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/multihot40.mjs
var multihot40_default = {
  "id": "ind74_multihot40",
  "title": "Multi Hot 40 \u2014 Independent",
  "catalogName": "Multi Hot 40",
  "sourceCategory": "Slots",
  "mathVersion": "independent-multihot40-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Copper Voyage 20",
    "colors": [
      "#d88ecd",
      "#67db39",
      "#cf196c"
    ]
  },
  "limits": {
    "minBetMinor": "40",
    "maxBetMinor": "100000",
    "betStepMinor": "40",
    "maxWinMinor": "140300000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/multi-hot-40",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      0,
      1
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      0,
      0,
      0,
      1,
      0
    ],
    [
      0,
      0,
      0,
      1,
      1
    ],
    [
      0,
      0,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      2,
      0
    ],
    [
      0,
      0,
      0,
      2,
      1
    ],
    [
      0,
      0,
      0,
      2,
      2
    ],
    [
      0,
      0,
      1,
      0,
      0
    ],
    [
      0,
      0,
      1,
      0,
      1
    ],
    [
      0,
      0,
      1,
      0,
      2
    ],
    [
      0,
      0,
      1,
      1,
      0
    ],
    [
      0,
      0,
      1,
      1,
      1
    ],
    [
      0,
      0,
      1,
      1,
      2
    ],
    [
      0,
      0,
      1,
      2,
      0
    ],
    [
      0,
      0,
      1,
      2,
      1
    ],
    [
      0,
      0,
      1,
      2,
      2
    ],
    [
      0,
      0,
      2,
      0,
      0
    ],
    [
      0,
      0,
      2,
      0,
      1
    ],
    [
      0,
      0,
      2,
      0,
      2
    ],
    [
      0,
      0,
      2,
      1,
      0
    ],
    [
      0,
      0,
      2,
      1,
      1
    ],
    [
      0,
      0,
      2,
      1,
      2
    ],
    [
      0,
      0,
      2,
      2,
      0
    ],
    [
      0,
      0,
      2,
      2,
      1
    ],
    [
      0,
      0,
      2,
      2,
      2
    ],
    [
      0,
      1,
      0,
      0,
      0
    ],
    [
      0,
      1,
      0,
      0,
      1
    ],
    [
      0,
      1,
      0,
      0,
      2
    ],
    [
      0,
      1,
      0,
      1,
      0
    ],
    [
      0,
      1,
      0,
      1,
      1
    ],
    [
      0,
      1,
      0,
      1,
      2
    ],
    [
      0,
      1,
      0,
      2,
      0
    ],
    [
      0,
      1,
      0,
      2,
      1
    ],
    [
      0,
      1,
      0,
      2,
      2
    ]
  ],
  "symbols": [
    {
      "id": "multihot40-symbol-0",
      "label": "Orchard Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 24,
        "4": 116,
        "5": 1123
      }
    },
    {
      "id": "multihot40-symbol-1",
      "label": "Velvet Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 26,
        "4": 120,
        "5": 1163
      }
    },
    {
      "id": "multihot40-symbol-2",
      "label": "Amber Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 124,
        "5": 1203
      }
    },
    {
      "id": "multihot40-symbol-3",
      "label": "Prism Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 128,
        "5": 1243
      }
    },
    {
      "id": "multihot40-symbol-4",
      "label": "Ivory Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 132,
        "5": 1283
      }
    },
    {
      "id": "multihot40-symbol-5",
      "label": "Ruby Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 136,
        "5": 1323
      }
    },
    {
      "id": "multihot40-symbol-6",
      "label": "Copper Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 140,
        "5": 1363
      }
    },
    {
      "id": "multihot40-symbol-7",
      "label": "Citrus Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 38,
        "4": 144,
        "5": 1403
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 40 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3909",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/coinsofatlantis.mjs
var coinsofatlantis_default = {
  "id": "ind74_coinsofatlantis",
  "title": "Coins Of Atlantis \u2014 Independent",
  "catalogName": "Coins Of Atlantis",
  "sourceCategory": "Slots",
  "mathVersion": "independent-coinsofatlantis-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Lunar Arcade 21",
    "colors": [
      "#1a6569",
      "#0c604f",
      "#a5a7b8"
    ]
  },
  "limits": {
    "minBetMinor": "5",
    "maxBetMinor": "100000",
    "betStepMinor": "5",
    "maxWinMinor": "129900000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/coins-of-atlantis",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ]
  ],
  "symbols": [
    {
      "id": "coinsofatlantis-symbol-0",
      "label": "Velvet Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 25,
        "4": 123,
        "5": 1019
      }
    },
    {
      "id": "coinsofatlantis-symbol-1",
      "label": "Amber Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 127,
        "5": 1059
      }
    },
    {
      "id": "coinsofatlantis-symbol-2",
      "label": "Prism Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 131,
        "5": 1099
      }
    },
    {
      "id": "coinsofatlantis-symbol-3",
      "label": "Ivory Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 135,
        "5": 1139
      }
    },
    {
      "id": "coinsofatlantis-symbol-4",
      "label": "Ruby Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 139,
        "5": 1179
      }
    },
    {
      "id": "coinsofatlantis-symbol-5",
      "label": "Copper Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 143,
        "5": 1219
      }
    },
    {
      "id": "coinsofatlantis-symbol-6",
      "label": "Citrus Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 37,
        "4": 147,
        "5": 1259
      }
    },
    {
      "id": "coinsofatlantis-symbol-7",
      "label": "Orchard Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 39,
        "4": 151,
        "5": 1299
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 5 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3910",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/multihot100.mjs
var multihot100_default = {
  "id": "ind74_multihot100",
  "title": "Multi Hot 100 \u2014 Independent",
  "catalogName": "Multi Hot 100",
  "sourceCategory": "Slots",
  "mathVersion": "independent-multihot100-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Cobalt Lanterns 22",
    "colors": [
      "#4fa244",
      "#c0b479",
      "#250c36"
    ]
  },
  "limits": {
    "minBetMinor": "100",
    "maxBetMinor": "100000",
    "betStepMinor": "100",
    "maxWinMinor": "119500000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/multi-hot-100",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      0,
      1
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      0,
      0,
      0,
      1,
      0
    ],
    [
      0,
      0,
      0,
      1,
      1
    ],
    [
      0,
      0,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      2,
      0
    ],
    [
      0,
      0,
      0,
      2,
      1
    ],
    [
      0,
      0,
      0,
      2,
      2
    ],
    [
      0,
      0,
      1,
      0,
      0
    ],
    [
      0,
      0,
      1,
      0,
      1
    ],
    [
      0,
      0,
      1,
      0,
      2
    ],
    [
      0,
      0,
      1,
      1,
      0
    ],
    [
      0,
      0,
      1,
      1,
      1
    ],
    [
      0,
      0,
      1,
      1,
      2
    ],
    [
      0,
      0,
      1,
      2,
      0
    ],
    [
      0,
      0,
      1,
      2,
      1
    ],
    [
      0,
      0,
      1,
      2,
      2
    ],
    [
      0,
      0,
      2,
      0,
      0
    ],
    [
      0,
      0,
      2,
      0,
      1
    ],
    [
      0,
      0,
      2,
      0,
      2
    ],
    [
      0,
      0,
      2,
      1,
      0
    ],
    [
      0,
      0,
      2,
      1,
      1
    ],
    [
      0,
      0,
      2,
      1,
      2
    ],
    [
      0,
      0,
      2,
      2,
      0
    ],
    [
      0,
      0,
      2,
      2,
      1
    ],
    [
      0,
      0,
      2,
      2,
      2
    ],
    [
      0,
      1,
      0,
      0,
      0
    ],
    [
      0,
      1,
      0,
      0,
      1
    ],
    [
      0,
      1,
      0,
      0,
      2
    ],
    [
      0,
      1,
      0,
      1,
      0
    ],
    [
      0,
      1,
      0,
      1,
      1
    ],
    [
      0,
      1,
      0,
      1,
      2
    ],
    [
      0,
      1,
      0,
      2,
      0
    ],
    [
      0,
      1,
      0,
      2,
      1
    ],
    [
      0,
      1,
      0,
      2,
      2
    ],
    [
      0,
      1,
      1,
      0,
      0
    ],
    [
      0,
      1,
      1,
      0,
      1
    ],
    [
      0,
      1,
      1,
      0,
      2
    ],
    [
      0,
      1,
      1,
      1,
      0
    ],
    [
      0,
      1,
      1,
      1,
      1
    ],
    [
      0,
      1,
      1,
      1,
      2
    ],
    [
      0,
      1,
      1,
      2,
      0
    ],
    [
      0,
      1,
      1,
      2,
      1
    ],
    [
      0,
      1,
      1,
      2,
      2
    ],
    [
      0,
      1,
      2,
      0,
      0
    ],
    [
      0,
      1,
      2,
      0,
      1
    ],
    [
      0,
      1,
      2,
      0,
      2
    ],
    [
      0,
      1,
      2,
      1,
      1
    ],
    [
      0,
      1,
      2,
      1,
      2
    ],
    [
      0,
      1,
      2,
      2,
      0
    ],
    [
      0,
      1,
      2,
      2,
      1
    ],
    [
      0,
      1,
      2,
      2,
      2
    ],
    [
      0,
      2,
      0,
      0,
      0
    ],
    [
      0,
      2,
      0,
      0,
      1
    ],
    [
      0,
      2,
      0,
      0,
      2
    ],
    [
      0,
      2,
      0,
      1,
      0
    ],
    [
      0,
      2,
      0,
      1,
      1
    ],
    [
      0,
      2,
      0,
      1,
      2
    ],
    [
      0,
      2,
      0,
      2,
      0
    ],
    [
      0,
      2,
      0,
      2,
      1
    ],
    [
      0,
      2,
      0,
      2,
      2
    ],
    [
      0,
      2,
      1,
      0,
      0
    ],
    [
      0,
      2,
      1,
      0,
      1
    ],
    [
      0,
      2,
      1,
      0,
      2
    ],
    [
      0,
      2,
      1,
      1,
      0
    ],
    [
      0,
      2,
      1,
      1,
      1
    ],
    [
      0,
      2,
      1,
      1,
      2
    ],
    [
      0,
      2,
      1,
      2,
      0
    ],
    [
      0,
      2,
      1,
      2,
      1
    ],
    [
      0,
      2,
      1,
      2,
      2
    ],
    [
      0,
      2,
      2,
      0,
      0
    ],
    [
      0,
      2,
      2,
      0,
      1
    ],
    [
      0,
      2,
      2,
      0,
      2
    ],
    [
      0,
      2,
      2,
      1,
      0
    ],
    [
      0,
      2,
      2,
      1,
      1
    ],
    [
      0,
      2,
      2,
      1,
      2
    ],
    [
      0,
      2,
      2,
      2,
      0
    ],
    [
      0,
      2,
      2,
      2,
      1
    ],
    [
      0,
      2,
      2,
      2,
      2
    ],
    [
      1,
      0,
      0,
      0,
      0
    ],
    [
      1,
      0,
      0,
      0,
      1
    ],
    [
      1,
      0,
      0,
      0,
      2
    ],
    [
      1,
      0,
      0,
      1,
      0
    ],
    [
      1,
      0,
      0,
      1,
      1
    ],
    [
      1,
      0,
      0,
      1,
      2
    ],
    [
      1,
      0,
      0,
      2,
      0
    ],
    [
      1,
      0,
      0,
      2,
      1
    ],
    [
      1,
      0,
      0,
      2,
      2
    ],
    [
      1,
      0,
      1,
      0,
      0
    ],
    [
      1,
      0,
      1,
      0,
      1
    ],
    [
      1,
      0,
      1,
      0,
      2
    ],
    [
      1,
      0,
      1,
      1,
      0
    ],
    [
      1,
      0,
      1,
      1,
      1
    ],
    [
      1,
      0,
      1,
      1,
      2
    ],
    [
      1,
      0,
      1,
      2,
      0
    ]
  ],
  "symbols": [
    {
      "id": "multihot100-symbol-0",
      "label": "Amber Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 26,
        "4": 130,
        "5": 915
      }
    },
    {
      "id": "multihot100-symbol-1",
      "label": "Prism Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 134,
        "5": 955
      }
    },
    {
      "id": "multihot100-symbol-2",
      "label": "Ivory Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 138,
        "5": 995
      }
    },
    {
      "id": "multihot100-symbol-3",
      "label": "Ruby Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 142,
        "5": 1035
      }
    },
    {
      "id": "multihot100-symbol-4",
      "label": "Copper Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 146,
        "5": 1075
      }
    },
    {
      "id": "multihot100-symbol-5",
      "label": "Citrus Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 150,
        "5": 1115
      }
    },
    {
      "id": "multihot100-symbol-6",
      "label": "Orchard Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 38,
        "4": 154,
        "5": 1155
      }
    },
    {
      "id": "multihot100-symbol-7",
      "label": "Velvet Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 40,
        "4": 158,
        "5": 1195
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 100 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3911",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/multihotwildways.mjs
var multihotwildways_default = {
  "id": "ind74_multihotwildways",
  "title": "Multi Hot Wild Ways \u2014 Independent",
  "catalogName": "Multi Hot Wild Ways",
  "sourceCategory": "Slots",
  "mathVersion": "independent-multihotwildways-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Jade Orchard 23",
    "colors": [
      "#27ef79",
      "#e51f68",
      "#e2739b"
    ]
  },
  "limits": {
    "minBetMinor": "20",
    "maxBetMinor": "100000",
    "betStepMinor": "20",
    "maxWinMinor": "109100000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/multi-hot-wild-ways",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      0,
      1
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      0,
      0,
      0,
      1,
      0
    ],
    [
      0,
      0,
      0,
      1,
      1
    ],
    [
      0,
      0,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      2,
      0
    ],
    [
      0,
      0,
      0,
      2,
      1
    ],
    [
      0,
      0,
      0,
      2,
      2
    ],
    [
      0,
      0,
      1,
      0,
      0
    ],
    [
      0,
      0,
      1,
      0,
      1
    ],
    [
      0,
      0,
      1,
      0,
      2
    ],
    [
      0,
      0,
      1,
      1,
      0
    ],
    [
      0,
      0,
      1,
      1,
      1
    ],
    [
      0,
      0,
      1,
      1,
      2
    ],
    [
      0,
      0,
      1,
      2,
      0
    ]
  ],
  "symbols": [
    {
      "id": "multihotwildways-symbol-0",
      "label": "Prism Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 137,
        "5": 811
      }
    },
    {
      "id": "multihotwildways-symbol-1",
      "label": "Ivory Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 141,
        "5": 851
      }
    },
    {
      "id": "multihotwildways-symbol-2",
      "label": "Ruby Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 145,
        "5": 891
      }
    },
    {
      "id": "multihotwildways-symbol-3",
      "label": "Copper Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 149,
        "5": 931
      }
    },
    {
      "id": "multihotwildways-symbol-4",
      "label": "Citrus Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 153,
        "5": 971
      }
    },
    {
      "id": "multihotwildways-symbol-5",
      "label": "Orchard Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 37,
        "4": 157,
        "5": 1011
      }
    },
    {
      "id": "multihotwildways-symbol-6",
      "label": "Velvet Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 39,
        "4": 161,
        "5": 1051
      }
    },
    {
      "id": "multihotwildways-symbol-7",
      "label": "Amber Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 41,
        "4": 165,
        "5": 1091
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 20 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3912",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/bottlemania.mjs
var bottlemania_default = {
  "id": "ind74_bottlemania",
  "title": "Bottle Mania \u2014 Independent",
  "catalogName": "Bottle Mania",
  "sourceCategory": "Instant Games",
  "mathVersion": "independent-bottlemania-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Ember Spire 24",
    "colors": [
      "#c034a0",
      "#fa685b",
      "#bf8c51"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "12300000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/bottle-mania",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "ladder",
  "model": "conditional-ladder-v1",
  "returnBps": 9640,
  "multipliersBps": [
    14e3,
    17e3,
    2e4,
    3e4,
    5e4,
    8e4,
    15e4,
    3e5,
    6e5,
    123e4
  ],
  "modes": [
    "easy"
  ],
  "defaultMode": "easy",
  "maxSteps": 10,
  "rules": [
    "This original ten-step ladder attempts the first step on Play. The first step can fail.",
    "Each successful step offers Collect. A failed step forfeits all uncollected value.",
    "First-step survival is return basis points divided by the first multiplier. Later conditional survival is previous multiplier divided by next multiplier.",
    "Visual step choices do not change probabilities. The final successful step collects automatically."
  ],
  "paytable": [
    {
      "mode": "easy",
      "rows": [
        {
          "label": "Step 1",
          "step": 1,
          "multiplierBps": 14e3,
          "conditionalSurvival": {
            "numerator": 9640,
            "denominator": 14e3
          }
        },
        {
          "label": "Step 2",
          "step": 2,
          "multiplierBps": 17e3,
          "conditionalSurvival": {
            "numerator": 14e3,
            "denominator": 17e3
          }
        },
        {
          "label": "Step 3",
          "step": 3,
          "multiplierBps": 2e4,
          "conditionalSurvival": {
            "numerator": 17e3,
            "denominator": 2e4
          }
        },
        {
          "label": "Step 4",
          "step": 4,
          "multiplierBps": 3e4,
          "conditionalSurvival": {
            "numerator": 2e4,
            "denominator": 3e4
          }
        },
        {
          "label": "Step 5",
          "step": 5,
          "multiplierBps": 5e4,
          "conditionalSurvival": {
            "numerator": 3e4,
            "denominator": 5e4
          }
        },
        {
          "label": "Step 6",
          "step": 6,
          "multiplierBps": 8e4,
          "conditionalSurvival": {
            "numerator": 5e4,
            "denominator": 8e4
          }
        },
        {
          "label": "Step 7",
          "step": 7,
          "multiplierBps": 15e4,
          "conditionalSurvival": {
            "numerator": 8e4,
            "denominator": 15e4
          }
        },
        {
          "label": "Step 8",
          "step": 8,
          "multiplierBps": 3e5,
          "conditionalSurvival": {
            "numerator": 15e4,
            "denominator": 3e5
          }
        },
        {
          "label": "Step 9",
          "step": 9,
          "multiplierBps": 6e5,
          "conditionalSurvival": {
            "numerator": 3e5,
            "denominator": 6e5
          }
        },
        {
          "label": "Step 10",
          "step": 10,
          "multiplierBps": 123e4,
          "conditionalSurvival": {
            "numerator": 6e5,
            "denominator": 123e4
          }
        }
      ]
    }
  ],
  "nominalReturn": {
    "numerator": "9640",
    "denominator": "10000",
    "type": "before-integer-floor",
    "proof": "Conditionalsurvivalprobabilities telescope toreturnBps/Mk;expectedprize=bet\xD7returnBps/10000beforeintegerfloor."
  }
};

// math/games/multihot5burnwilds.mjs
var multihot5burnwilds_default = {
  "id": "ind74_multihot5burnwilds",
  "title": "Multi Hot 5 Burn Wilds \u2014 Independent",
  "catalogName": "Multi Hot 5 Burn Wilds",
  "sourceCategory": "Slots",
  "mathVersion": "independent-multihot5burnwilds-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Aurora Garden 25",
    "colors": [
      "#01d3df",
      "#75d70c",
      "#e156c7"
    ]
  },
  "limits": {
    "minBetMinor": "5",
    "maxBetMinor": "100000",
    "betStepMinor": "5",
    "maxWinMinor": "161800000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/multi-hot-5-burn-wilds",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ]
  ],
  "symbols": [
    {
      "id": "multihot5burnwilds-symbol-0",
      "label": "Ruby Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 21,
        "4": 110,
        "5": 1338
      }
    },
    {
      "id": "multihot5burnwilds-symbol-1",
      "label": "Copper Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 23,
        "4": 114,
        "5": 1378
      }
    },
    {
      "id": "multihot5burnwilds-symbol-2",
      "label": "Citrus Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 25,
        "4": 118,
        "5": 1418
      }
    },
    {
      "id": "multihot5burnwilds-symbol-3",
      "label": "Orchard Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 122,
        "5": 1458
      }
    },
    {
      "id": "multihot5burnwilds-symbol-4",
      "label": "Velvet Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 126,
        "5": 1498
      }
    },
    {
      "id": "multihot5burnwilds-symbol-5",
      "label": "Amber Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 130,
        "5": 1538
      }
    },
    {
      "id": "multihot5burnwilds-symbol-6",
      "label": "Prism Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 134,
        "5": 1578
      }
    },
    {
      "id": "multihot5burnwilds-symbol-7",
      "label": "Ivory Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 138,
        "5": 1618
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 5 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3914",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/chickenhighway.mjs
var chickenhighway_default = {
  "id": "ind74_chickenhighway",
  "title": "Chicken Highway \u2014 Independent",
  "catalogName": "Chicken Highway",
  "sourceCategory": "Mine Games",
  "mathVersion": "independent-chickenhighway-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Copper Voyage 26",
    "colors": [
      "#36a278",
      "#5d1526",
      "#1ae193"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "12500000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/chicken-highway",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "ladder",
  "model": "conditional-ladder-v1",
  "returnBps": 9480,
  "multipliersBps": [
    12e3,
    16e3,
    2e4,
    3e4,
    5e4,
    8e4,
    15e4,
    3e5,
    6e5,
    125e4
  ],
  "modes": [
    "easy"
  ],
  "defaultMode": "easy",
  "maxSteps": 10,
  "rules": [
    "This original ten-step ladder attempts the first step on Play. The first step can fail.",
    "Each successful step offers Collect. A failed step forfeits all uncollected value.",
    "First-step survival is return basis points divided by the first multiplier. Later conditional survival is previous multiplier divided by next multiplier.",
    "Visual step choices do not change probabilities. The final successful step collects automatically."
  ],
  "paytable": [
    {
      "mode": "easy",
      "rows": [
        {
          "label": "Step 1",
          "step": 1,
          "multiplierBps": 12e3,
          "conditionalSurvival": {
            "numerator": 9480,
            "denominator": 12e3
          }
        },
        {
          "label": "Step 2",
          "step": 2,
          "multiplierBps": 16e3,
          "conditionalSurvival": {
            "numerator": 12e3,
            "denominator": 16e3
          }
        },
        {
          "label": "Step 3",
          "step": 3,
          "multiplierBps": 2e4,
          "conditionalSurvival": {
            "numerator": 16e3,
            "denominator": 2e4
          }
        },
        {
          "label": "Step 4",
          "step": 4,
          "multiplierBps": 3e4,
          "conditionalSurvival": {
            "numerator": 2e4,
            "denominator": 3e4
          }
        },
        {
          "label": "Step 5",
          "step": 5,
          "multiplierBps": 5e4,
          "conditionalSurvival": {
            "numerator": 3e4,
            "denominator": 5e4
          }
        },
        {
          "label": "Step 6",
          "step": 6,
          "multiplierBps": 8e4,
          "conditionalSurvival": {
            "numerator": 5e4,
            "denominator": 8e4
          }
        },
        {
          "label": "Step 7",
          "step": 7,
          "multiplierBps": 15e4,
          "conditionalSurvival": {
            "numerator": 8e4,
            "denominator": 15e4
          }
        },
        {
          "label": "Step 8",
          "step": 8,
          "multiplierBps": 3e5,
          "conditionalSurvival": {
            "numerator": 15e4,
            "denominator": 3e5
          }
        },
        {
          "label": "Step 9",
          "step": 9,
          "multiplierBps": 6e5,
          "conditionalSurvival": {
            "numerator": 3e5,
            "denominator": 6e5
          }
        },
        {
          "label": "Step 10",
          "step": 10,
          "multiplierBps": 125e4,
          "conditionalSurvival": {
            "numerator": 6e5,
            "denominator": 125e4
          }
        }
      ]
    }
  ],
  "nominalReturn": {
    "numerator": "9480",
    "denominator": "10000",
    "type": "before-integer-floor",
    "proof": "Conditionalsurvivalprobabilities telescope toreturnBps/Mk;expectedprize=bet\xD7returnBps/10000beforeintegerfloor."
  }
};

// math/games/multihot5deluxe.mjs
var multihot5deluxe_default = {
  "id": "ind74_multihot5deluxe",
  "title": "Multi Hot 5 Deluxe \u2014 Independent",
  "catalogName": "Multi Hot 5 Deluxe",
  "sourceCategory": "Slots",
  "mathVersion": "independent-multihot5deluxe-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Lunar Arcade 27",
    "colors": [
      "#b22742",
      "#51147e",
      "#fd83f1"
    ]
  },
  "limits": {
    "minBetMinor": "5",
    "maxBetMinor": "100000",
    "betStepMinor": "5",
    "maxWinMinor": "141000000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/multi-hot-5-deluxe",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ]
  ],
  "symbols": [
    {
      "id": "multihot5deluxe-symbol-0",
      "label": "Citrus Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 23,
        "4": 124,
        "5": 1130
      }
    },
    {
      "id": "multihot5deluxe-symbol-1",
      "label": "Orchard Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 25,
        "4": 128,
        "5": 1170
      }
    },
    {
      "id": "multihot5deluxe-symbol-2",
      "label": "Velvet Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 132,
        "5": 1210
      }
    },
    {
      "id": "multihot5deluxe-symbol-3",
      "label": "Amber Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 136,
        "5": 1250
      }
    },
    {
      "id": "multihot5deluxe-symbol-4",
      "label": "Prism Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 140,
        "5": 1290
      }
    },
    {
      "id": "multihot5deluxe-symbol-5",
      "label": "Ivory Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 144,
        "5": 1330
      }
    },
    {
      "id": "multihot5deluxe-symbol-6",
      "label": "Ruby Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 148,
        "5": 1370
      }
    },
    {
      "id": "multihot5deluxe-symbol-7",
      "label": "Copper Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 37,
        "4": 152,
        "5": 1410
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 5 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3916",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/carx.mjs
var carx_default = {
  "id": "ind74_carx",
  "title": "CarX \u2014 Independent",
  "catalogName": "CarX",
  "sourceCategory": "Crash Games",
  "mathVersion": "independent-carx-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Cobalt Lanterns 28",
    "colors": [
      "#266ac4",
      "#dc5948",
      "#cd8347"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "11000000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/carx",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "crash",
  "model": "clock-crash-v1",
  "ticketCount": 1e6,
  "returnBps": 9640,
  "maxMultiplierBps": 11e5,
  "growthBpsPerSecond": 2037,
  "rules": [
    "This original server-clock crash game can lose immediately. Collect before the hidden bust point.",
    "The server clock determines the collection multiplier. Client-supplied payouts or multipliers are ignored.",
    "Surviving the maximum multiplier collects automatically. Payouts round down to whole minor units."
  ],
  "paytable": [
    {
      "label": "First milestone",
      "multiplierBps": 11e3
    },
    {
      "label": "Double",
      "multiplierBps": 2e4
    },
    {
      "label": "Maximum",
      "multiplierBps": 11e5
    }
  ],
  "nominalReturn": {
    "numerator": "9640",
    "denominator": "10000",
    "type": "upper-bound-before-floor",
    "proof": "AtBPSmultiplierM,survival=floor(9640\xD71000000/(M+1))/1000000.Exactreturnequals survival\xD7floor(bet\xD7M/10000)/bet."
  }
};

// math/games/caibalaocappadocia.mjs
var caibalaocappadocia_default = {
  "id": "ind74_caibalaocappadocia",
  "title": "Cai Balao Cappadocia \u2014 Independent",
  "catalogName": "Cai Balao Cappadocia",
  "sourceCategory": "Instant Games",
  "mathVersion": "independent-caibalaocappadocia-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Jade Orchard 29",
    "colors": [
      "#cd7b23",
      "#1a9ef5",
      "#10b8fa"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "12800000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/cai-balao-cappadocia",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "ladder",
  "model": "conditional-ladder-v1",
  "returnBps": 9600,
  "multipliersBps": [
    11e3,
    16e3,
    2e4,
    3e4,
    5e4,
    8e4,
    15e4,
    3e5,
    6e5,
    128e4
  ],
  "modes": [
    "easy"
  ],
  "defaultMode": "easy",
  "maxSteps": 10,
  "rules": [
    "This original ten-step ladder attempts the first step on Play. The first step can fail.",
    "Each successful step offers Collect. A failed step forfeits all uncollected value.",
    "First-step survival is return basis points divided by the first multiplier. Later conditional survival is previous multiplier divided by next multiplier.",
    "Visual step choices do not change probabilities. The final successful step collects automatically."
  ],
  "paytable": [
    {
      "mode": "easy",
      "rows": [
        {
          "label": "Step 1",
          "step": 1,
          "multiplierBps": 11e3,
          "conditionalSurvival": {
            "numerator": 9600,
            "denominator": 11e3
          }
        },
        {
          "label": "Step 2",
          "step": 2,
          "multiplierBps": 16e3,
          "conditionalSurvival": {
            "numerator": 11e3,
            "denominator": 16e3
          }
        },
        {
          "label": "Step 3",
          "step": 3,
          "multiplierBps": 2e4,
          "conditionalSurvival": {
            "numerator": 16e3,
            "denominator": 2e4
          }
        },
        {
          "label": "Step 4",
          "step": 4,
          "multiplierBps": 3e4,
          "conditionalSurvival": {
            "numerator": 2e4,
            "denominator": 3e4
          }
        },
        {
          "label": "Step 5",
          "step": 5,
          "multiplierBps": 5e4,
          "conditionalSurvival": {
            "numerator": 3e4,
            "denominator": 5e4
          }
        },
        {
          "label": "Step 6",
          "step": 6,
          "multiplierBps": 8e4,
          "conditionalSurvival": {
            "numerator": 5e4,
            "denominator": 8e4
          }
        },
        {
          "label": "Step 7",
          "step": 7,
          "multiplierBps": 15e4,
          "conditionalSurvival": {
            "numerator": 8e4,
            "denominator": 15e4
          }
        },
        {
          "label": "Step 8",
          "step": 8,
          "multiplierBps": 3e5,
          "conditionalSurvival": {
            "numerator": 15e4,
            "denominator": 3e5
          }
        },
        {
          "label": "Step 9",
          "step": 9,
          "multiplierBps": 6e5,
          "conditionalSurvival": {
            "numerator": 3e5,
            "denominator": 6e5
          }
        },
        {
          "label": "Step 10",
          "step": 10,
          "multiplierBps": 128e4,
          "conditionalSurvival": {
            "numerator": 6e5,
            "denominator": 128e4
          }
        }
      ]
    }
  ],
  "nominalReturn": {
    "numerator": "9600",
    "denominator": "10000",
    "type": "before-integer-floor",
    "proof": "Conditionalsurvivalprobabilities telescope toreturnBps/Mk;expectedprize=bet\xD7returnBps/10000beforeintegerfloor."
  }
};

// math/games/multihotwheel.mjs
var multihotwheel_default = {
  "id": "ind74_multihotwheel",
  "title": "Multi Hot Wheel \u2014 Independent",
  "catalogName": "Multi Hot Wheel",
  "sourceCategory": "Instant Games",
  "mathVersion": "independent-multihotwheel-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Ember Spire 30",
    "colors": [
      "#c842c5",
      "#8d353d",
      "#eac93b"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "5254000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/multi-hot-wheel",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "wheel",
  "model": "weighted-wheel-v1",
  "sectors": [
    {
      "id": "sector-0",
      "label": "Cloud",
      "weight": 40,
      "multiplierBps": 0
    },
    {
      "id": "sector-1",
      "label": "Mist",
      "weight": 25,
      "multiplierBps": 0
    },
    {
      "id": "sector-2",
      "label": "Rest",
      "weight": 15,
      "multiplierBps": 0
    },
    {
      "id": "sector-3",
      "label": "Spark",
      "weight": 10,
      "multiplierBps": 1e4
    },
    {
      "id": "sector-4",
      "label": "Pair",
      "weight": 5,
      "multiplierBps": 2e4
    },
    {
      "id": "sector-5",
      "label": "Glow",
      "weight": 3,
      "multiplierBps": 42900
    },
    {
      "id": "sector-6",
      "label": "Prism",
      "weight": 1,
      "multiplierBps": 102900
    },
    {
      "id": "sector-7",
      "label": "Crown",
      "weight": 1,
      "multiplierBps": 525400
    }
  ],
  "rules": [
    "This original eight-sector weighted wheel settles when Play is pressed.",
    "Each sector's probability is its published weight divided by 100. Its multiplier gives the total payout, including the stake.",
    "Zero sectors lose. Nonzero prizes round down to whole minor units."
  ],
  "paytable": [
    {
      "id": "sector-0",
      "label": "Cloud",
      "weight": 40,
      "multiplierBps": 0
    },
    {
      "id": "sector-1",
      "label": "Mist",
      "weight": 25,
      "multiplierBps": 0
    },
    {
      "id": "sector-2",
      "label": "Rest",
      "weight": 15,
      "multiplierBps": 0
    },
    {
      "id": "sector-3",
      "label": "Spark",
      "weight": 10,
      "multiplierBps": 1e4
    },
    {
      "id": "sector-4",
      "label": "Pair",
      "weight": 5,
      "multiplierBps": 2e4
    },
    {
      "id": "sector-5",
      "label": "Glow",
      "weight": 3,
      "multiplierBps": 42900
    },
    {
      "id": "sector-6",
      "label": "Prism",
      "weight": 1,
      "multiplierBps": 102900
    },
    {
      "id": "sector-7",
      "label": "Crown",
      "weight": 1,
      "multiplierBps": 525400
    }
  ],
  "nominalReturn": {
    "numerator": "957000",
    "denominator": "1000000",
    "type": "before-integer-floor",
    "proof": "Sum(weight\xD7multiplierBps)/(100\xD710000).Exactbet-dependentreturn uses flooredsectorpayouts."
  }
};

// math/games/jinglebellbonanza.mjs
var jinglebellbonanza_default = {
  "id": "ind74_jinglebellbonanza",
  "title": "Jingle Bell Bonanza \u2014 Independent",
  "catalogName": "Jingle Bell Bonanza",
  "sourceCategory": "Slots",
  "mathVersion": "independent-jinglebellbonanza-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Aurora Garden 31",
    "colors": [
      "#c7a544",
      "#b1293d",
      "#b4ea41"
    ]
  },
  "limits": {
    "minBetMinor": "20",
    "maxBetMinor": "100000",
    "betStepMinor": "20",
    "maxWinMinor": "128100000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/jingle-bell-bonanza",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      0,
      1
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      0,
      0,
      0,
      1,
      0
    ],
    [
      0,
      0,
      0,
      1,
      1
    ],
    [
      0,
      0,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      2,
      0
    ],
    [
      0,
      0,
      0,
      2,
      1
    ],
    [
      0,
      0,
      0,
      2,
      2
    ],
    [
      0,
      0,
      1,
      0,
      0
    ],
    [
      0,
      0,
      1,
      0,
      1
    ],
    [
      0,
      0,
      1,
      0,
      2
    ],
    [
      0,
      0,
      1,
      1,
      0
    ],
    [
      0,
      0,
      1,
      1,
      1
    ],
    [
      0,
      0,
      1,
      1,
      2
    ],
    [
      0,
      0,
      1,
      2,
      0
    ]
  ],
  "symbols": [
    {
      "id": "jinglebellbonanza-symbol-0",
      "label": "Prism Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 111,
        "5": 1001
      }
    },
    {
      "id": "jinglebellbonanza-symbol-1",
      "label": "Ivory Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 115,
        "5": 1041
      }
    },
    {
      "id": "jinglebellbonanza-symbol-2",
      "label": "Ruby Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 119,
        "5": 1081
      }
    },
    {
      "id": "jinglebellbonanza-symbol-3",
      "label": "Copper Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 123,
        "5": 1121
      }
    },
    {
      "id": "jinglebellbonanza-symbol-4",
      "label": "Citrus Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 127,
        "5": 1161
      }
    },
    {
      "id": "jinglebellbonanza-symbol-5",
      "label": "Orchard Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 37,
        "4": 131,
        "5": 1201
      }
    },
    {
      "id": "jinglebellbonanza-symbol-6",
      "label": "Velvet Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 39,
        "4": 135,
        "5": 1241
      }
    },
    {
      "id": "jinglebellbonanza-symbol-7",
      "label": "Amber Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 41,
        "4": 139,
        "5": 1281
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 20 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3920",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/multihot5superwilds.mjs
var multihot5superwilds_default = {
  "id": "ind74_multihot5superwilds",
  "title": "Multi Hot 5 Super Wilds \u2014 Independent",
  "catalogName": "Multi Hot 5 Super Wilds",
  "sourceCategory": "Slots",
  "mathVersion": "independent-multihot5superwilds-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Copper Voyage 32",
    "colors": [
      "#1fa203",
      "#aecf78",
      "#d7bfdf"
    ]
  },
  "limits": {
    "minBetMinor": "5",
    "maxBetMinor": "100000",
    "betStepMinor": "5",
    "maxWinMinor": "117700000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/multi-hot-5-super-wilds",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ]
  ],
  "symbols": [
    {
      "id": "multihot5superwilds-symbol-0",
      "label": "Ivory Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 118,
        "5": 897
      }
    },
    {
      "id": "multihot5superwilds-symbol-1",
      "label": "Ruby Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 122,
        "5": 937
      }
    },
    {
      "id": "multihot5superwilds-symbol-2",
      "label": "Copper Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 126,
        "5": 977
      }
    },
    {
      "id": "multihot5superwilds-symbol-3",
      "label": "Citrus Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 130,
        "5": 1017
      }
    },
    {
      "id": "multihot5superwilds-symbol-4",
      "label": "Orchard Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 134,
        "5": 1057
      }
    },
    {
      "id": "multihot5superwilds-symbol-5",
      "label": "Velvet Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 38,
        "4": 138,
        "5": 1097
      }
    },
    {
      "id": "multihot5superwilds-symbol-6",
      "label": "Amber Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 40,
        "4": 142,
        "5": 1137
      }
    },
    {
      "id": "multihot5superwilds-symbol-7",
      "label": "Prism Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 42,
        "4": 146,
        "5": 1177
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 5 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3921",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/balloon.mjs
var balloon_default = {
  "id": "ind74_balloon",
  "title": "Balloon \u2014 Independent",
  "catalogName": "Balloon",
  "sourceCategory": "Instant Games",
  "mathVersion": "independent-balloon-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Lunar Arcade 33",
    "colors": [
      "#f4eeef",
      "#2db83d",
      "#e6329c"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "13200000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/balloon",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "ladder",
  "model": "conditional-ladder-v1",
  "returnBps": 9520,
  "multipliersBps": [
    11e3,
    17e3,
    2e4,
    3e4,
    5e4,
    8e4,
    15e4,
    3e5,
    6e5,
    132e4
  ],
  "modes": [
    "easy"
  ],
  "defaultMode": "easy",
  "maxSteps": 10,
  "rules": [
    "This original ten-step ladder attempts the first step on Play. The first step can fail.",
    "Each successful step offers Collect. A failed step forfeits all uncollected value.",
    "First-step survival is return basis points divided by the first multiplier. Later conditional survival is previous multiplier divided by next multiplier.",
    "Visual step choices do not change probabilities. The final successful step collects automatically."
  ],
  "paytable": [
    {
      "mode": "easy",
      "rows": [
        {
          "label": "Step 1",
          "step": 1,
          "multiplierBps": 11e3,
          "conditionalSurvival": {
            "numerator": 9520,
            "denominator": 11e3
          }
        },
        {
          "label": "Step 2",
          "step": 2,
          "multiplierBps": 17e3,
          "conditionalSurvival": {
            "numerator": 11e3,
            "denominator": 17e3
          }
        },
        {
          "label": "Step 3",
          "step": 3,
          "multiplierBps": 2e4,
          "conditionalSurvival": {
            "numerator": 17e3,
            "denominator": 2e4
          }
        },
        {
          "label": "Step 4",
          "step": 4,
          "multiplierBps": 3e4,
          "conditionalSurvival": {
            "numerator": 2e4,
            "denominator": 3e4
          }
        },
        {
          "label": "Step 5",
          "step": 5,
          "multiplierBps": 5e4,
          "conditionalSurvival": {
            "numerator": 3e4,
            "denominator": 5e4
          }
        },
        {
          "label": "Step 6",
          "step": 6,
          "multiplierBps": 8e4,
          "conditionalSurvival": {
            "numerator": 5e4,
            "denominator": 8e4
          }
        },
        {
          "label": "Step 7",
          "step": 7,
          "multiplierBps": 15e4,
          "conditionalSurvival": {
            "numerator": 8e4,
            "denominator": 15e4
          }
        },
        {
          "label": "Step 8",
          "step": 8,
          "multiplierBps": 3e5,
          "conditionalSurvival": {
            "numerator": 15e4,
            "denominator": 3e5
          }
        },
        {
          "label": "Step 9",
          "step": 9,
          "multiplierBps": 6e5,
          "conditionalSurvival": {
            "numerator": 3e5,
            "denominator": 6e5
          }
        },
        {
          "label": "Step 10",
          "step": 10,
          "multiplierBps": 132e4,
          "conditionalSurvival": {
            "numerator": 6e5,
            "denominator": 132e4
          }
        }
      ]
    }
  ],
  "nominalReturn": {
    "numerator": "9520",
    "denominator": "10000",
    "type": "before-integer-floor",
    "proof": "Conditionalsurvivalprobabilities telescope toreturnBps/Mk;expectedprize=bet\xD7returnBps/10000beforeintegerfloor."
  }
};

// math/games/plinkox.mjs
var plinkox_default = {
  "id": "ind74_plinkox",
  "title": "Plinko X \u2014 Independent",
  "catalogName": "Plinko X",
  "sourceCategory": "Instant Games",
  "mathVersion": "independent-plinkox-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Cobalt Lanterns 34",
    "colors": [
      "#b6fd35",
      "#bf648f",
      "#f13425"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "5250000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/plinkox",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "plinko",
  "model": "binomial-plinko-v1",
  "rows": 10,
  "bucketMultipliersBps": [
    525e3,
    11200,
    9800,
    8800,
    8200,
    8e3,
    8200,
    8800,
    9800,
    11200,
    525e3
  ],
  "rules": [
    "This original 10-row path independently turns left or right with probability one half at each peg.",
    "The bucket index equals the number of right turns. Bucket k has probability C(rows,k) divided by 2 raised to rows.",
    "The published bucket multiplier gives the total payout. Prizes round down to whole minor units."
  ],
  "paytable": [
    {
      "label": "Bucket 0",
      "multiplierBps": 525e3,
      "probabilityNumerator": "1",
      "probabilityDenominator": "1024"
    },
    {
      "label": "Bucket 1",
      "multiplierBps": 11200,
      "probabilityNumerator": "10",
      "probabilityDenominator": "1024"
    },
    {
      "label": "Bucket 2",
      "multiplierBps": 9800,
      "probabilityNumerator": "45",
      "probabilityDenominator": "1024"
    },
    {
      "label": "Bucket 3",
      "multiplierBps": 8800,
      "probabilityNumerator": "120",
      "probabilityDenominator": "1024"
    },
    {
      "label": "Bucket 4",
      "multiplierBps": 8200,
      "probabilityNumerator": "210",
      "probabilityDenominator": "1024"
    },
    {
      "label": "Bucket 5",
      "multiplierBps": 8e3,
      "probabilityNumerator": "252",
      "probabilityDenominator": "1024"
    },
    {
      "label": "Bucket 6",
      "multiplierBps": 8200,
      "probabilityNumerator": "210",
      "probabilityDenominator": "1024"
    },
    {
      "label": "Bucket 7",
      "multiplierBps": 8800,
      "probabilityNumerator": "120",
      "probabilityDenominator": "1024"
    },
    {
      "label": "Bucket 8",
      "multiplierBps": 9800,
      "probabilityNumerator": "45",
      "probabilityDenominator": "1024"
    },
    {
      "label": "Bucket 9",
      "multiplierBps": 11200,
      "probabilityNumerator": "10",
      "probabilityDenominator": "1024"
    },
    {
      "label": "Bucket 10",
      "multiplierBps": 525e3,
      "probabilityNumerator": "1",
      "probabilityDenominator": "1024"
    }
  ],
  "nominalReturn": {
    "numerator": "9728000",
    "denominator": "10240000",
    "type": "before-integer-floor",
    "proof": "Sum(C(rows,k)\xD7bucketBps[k])/(2^rows\xD710000).Exactbetreturn uses integer flooredprizes."
  }
};

// math/games/helicopterx.mjs
var helicopterx_default = {
  "id": "ind74_helicopterx",
  "title": "Helicopter X \u2014 Independent",
  "catalogName": "Helicopter X",
  "sourceCategory": "Crash Games",
  "mathVersion": "independent-helicopterx-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Jade Orchard 35",
    "colors": [
      "#e63c60",
      "#1acfdb",
      "#4eaf47"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "13000000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/helicopter-x",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "crash",
  "model": "clock-crash-v1",
  "ticketCount": 1e6,
  "returnBps": 9640,
  "maxMultiplierBps": 13e5,
  "growthBpsPerSecond": 2254,
  "rules": [
    "This original server-clock crash game can lose immediately. Collect before the hidden bust point.",
    "The server clock determines the collection multiplier. Client-supplied payouts or multipliers are ignored.",
    "Surviving the maximum multiplier collects automatically. Payouts round down to whole minor units."
  ],
  "paytable": [
    {
      "label": "First milestone",
      "multiplierBps": 11e3
    },
    {
      "label": "Double",
      "multiplierBps": 2e4
    },
    {
      "label": "Maximum",
      "multiplierBps": 13e5
    }
  ],
  "nominalReturn": {
    "numerator": "9640",
    "denominator": "10000",
    "type": "upper-bound-before-floor",
    "proof": "AtBPSmultiplierM,survival=floor(9640\xD71000000/(M+1))/1000000.Exactreturnequals survival\xD7floor(bet\xD7M/10000)/bet."
  }
};

// math/games/multihot5.mjs
var multihot5_default = {
  "id": "ind74_multihot5",
  "title": "Multi Hot 5 \u2014 Independent",
  "catalogName": "Multi Hot 5",
  "sourceCategory": "Slots",
  "mathVersion": "independent-multihot5-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Ember Spire 36",
    "colors": [
      "#4ce9bc",
      "#9a2c77",
      "#076670"
    ]
  },
  "limits": {
    "minBetMinor": "5",
    "maxBetMinor": "100000",
    "betStepMinor": "5",
    "maxWinMinor": "120900000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/multi-hot-5",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ]
  ],
  "symbols": [
    {
      "id": "multihot5-symbol-0",
      "label": "Orchard Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 24,
        "4": 146,
        "5": 929
      }
    },
    {
      "id": "multihot5-symbol-1",
      "label": "Velvet Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 26,
        "4": 150,
        "5": 969
      }
    },
    {
      "id": "multihot5-symbol-2",
      "label": "Amber Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 154,
        "5": 1009
      }
    },
    {
      "id": "multihot5-symbol-3",
      "label": "Prism Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 158,
        "5": 1049
      }
    },
    {
      "id": "multihot5-symbol-4",
      "label": "Ivory Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 162,
        "5": 1089
      }
    },
    {
      "id": "multihot5-symbol-5",
      "label": "Ruby Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 166,
        "5": 1129
      }
    },
    {
      "id": "multihot5-symbol-6",
      "label": "Copper Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 170,
        "5": 1169
      }
    },
    {
      "id": "multihot5-symbol-7",
      "label": "Citrus Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 38,
        "4": 174,
        "5": 1209
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 5 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3925",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/safarisimba.mjs
var safarisimba_default = {
  "id": "ind74_safarisimba",
  "title": "Safari Simba \u2014 Independent",
  "catalogName": "Safari Simba",
  "sourceCategory": "Slots",
  "mathVersion": "independent-safarisimba-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Aurora Garden 37",
    "colors": [
      "#ae618a",
      "#ccb4c0",
      "#874d65"
    ]
  },
  "limits": {
    "minBetMinor": "5",
    "maxBetMinor": "100000",
    "betStepMinor": "5",
    "maxWinMinor": "139200000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/safari-simba-2",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ]
  ],
  "symbols": [
    {
      "id": "safarisimba-symbol-0",
      "label": "Velvet Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 25,
        "4": 112,
        "5": 1112
      }
    },
    {
      "id": "safarisimba-symbol-1",
      "label": "Amber Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 116,
        "5": 1152
      }
    },
    {
      "id": "safarisimba-symbol-2",
      "label": "Prism Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 120,
        "5": 1192
      }
    },
    {
      "id": "safarisimba-symbol-3",
      "label": "Ivory Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 124,
        "5": 1232
      }
    },
    {
      "id": "safarisimba-symbol-4",
      "label": "Ruby Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 128,
        "5": 1272
      }
    },
    {
      "id": "safarisimba-symbol-5",
      "label": "Copper Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 132,
        "5": 1312
      }
    },
    {
      "id": "safarisimba-symbol-6",
      "label": "Citrus Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 37,
        "4": 136,
        "5": 1352
      }
    },
    {
      "id": "safarisimba-symbol-7",
      "label": "Orchard Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 39,
        "4": 140,
        "5": 1392
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 5 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3926",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/mineisland.mjs
var mineisland_default = {
  "id": "ind74_mineisland",
  "title": "Mine Island \u2014 Independent",
  "catalogName": "Mine Island",
  "sourceCategory": "Instant Games",
  "mathVersion": "independent-mineisland-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Copper Voyage 38",
    "colors": [
      "#d2d045",
      "#45eff6",
      "#f9456b"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "250650"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/mine-island",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "mines",
  "model": "hidden-mines-v1",
  "returnBps": 9600,
  "cells": 25,
  "rows": 5,
  "cols": 5,
  "mines": 4,
  "maxPicks": 5,
  "rules": [
    "This original five-by-five hidden board contains four uniformly placed mines.",
    "Reveal any unrevealed cell. A mine loses the stake and any uncollected winnings.",
    "After a safe reveal, Collect ends the round. Five safe picks collect automatically.",
    "At k safe picks, multiplier basis points equal floor(9600 times C(25,k) divided by C(21,k)). Integer prizes round down."
  ],
  "paytable": [
    {
      "label": "1safe picks",
      "step": 1,
      "multiplierBps": 11428,
      "probabilityNumerator": "21",
      "probabilityDenominator": "25"
    },
    {
      "label": "2safe picks",
      "step": 2,
      "multiplierBps": 13714,
      "probabilityNumerator": "210",
      "probabilityDenominator": "300"
    },
    {
      "label": "3safe picks",
      "step": 3,
      "multiplierBps": 16601,
      "probabilityNumerator": "1330",
      "probabilityDenominator": "2300"
    },
    {
      "label": "4safe picks",
      "step": 4,
      "multiplierBps": 20290,
      "probabilityNumerator": "5985",
      "probabilityDenominator": "12650"
    },
    {
      "label": "5safe picks",
      "step": 5,
      "multiplierBps": 25065,
      "probabilityNumerator": "20349",
      "probabilityDenominator": "53130"
    }
  ],
  "nominalReturn": {
    "numerator": "96",
    "denominator": "100",
    "type": "upper-bound-before-floor",
    "proof": "Survival=C(21,k)/C(25,k).Multiplythisbyflooredpayouttocomputeexactbetreturn;nominalupperbound96%."
  }
};

// math/games/multihotways.mjs
var multihotways_default = {
  "id": "ind74_multihotways",
  "title": "Multi Hot Ways \u2014 Independent",
  "catalogName": "Multi Hot Ways",
  "sourceCategory": "Slots",
  "mathVersion": "independent-multihotways-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Lunar Arcade 39",
    "colors": [
      "#2e50c4",
      "#966580",
      "#245995"
    ]
  },
  "limits": {
    "minBetMinor": "20",
    "maxBetMinor": "100000",
    "betStepMinor": "20",
    "maxWinMinor": "118400000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/multi-hot-ways",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      0,
      1
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      0,
      0,
      0,
      1,
      0
    ],
    [
      0,
      0,
      0,
      1,
      1
    ],
    [
      0,
      0,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      2,
      0
    ],
    [
      0,
      0,
      0,
      2,
      1
    ],
    [
      0,
      0,
      0,
      2,
      2
    ],
    [
      0,
      0,
      1,
      0,
      0
    ],
    [
      0,
      0,
      1,
      0,
      1
    ],
    [
      0,
      0,
      1,
      0,
      2
    ],
    [
      0,
      0,
      1,
      1,
      0
    ],
    [
      0,
      0,
      1,
      1,
      1
    ],
    [
      0,
      0,
      1,
      1,
      2
    ],
    [
      0,
      0,
      1,
      2,
      0
    ]
  ],
  "symbols": [
    {
      "id": "multihotways-symbol-0",
      "label": "Prism Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 126,
        "5": 904
      }
    },
    {
      "id": "multihotways-symbol-1",
      "label": "Ivory Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 130,
        "5": 944
      }
    },
    {
      "id": "multihotways-symbol-2",
      "label": "Ruby Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 134,
        "5": 984
      }
    },
    {
      "id": "multihotways-symbol-3",
      "label": "Copper Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 138,
        "5": 1024
      }
    },
    {
      "id": "multihotways-symbol-4",
      "label": "Citrus Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 142,
        "5": 1064
      }
    },
    {
      "id": "multihotways-symbol-5",
      "label": "Orchard Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 37,
        "4": 146,
        "5": 1104
      }
    },
    {
      "id": "multihotways-symbol-6",
      "label": "Velvet Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 39,
        "4": 150,
        "5": 1144
      }
    },
    {
      "id": "multihotways-symbol-7",
      "label": "Amber Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 41,
        "4": 154,
        "5": 1184
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 20 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3928",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/footballx.mjs
var footballx_default = {
  "id": "ind74_footballx",
  "title": "Football X \u2014 Independent",
  "catalogName": "Football X",
  "sourceCategory": "Crash Games",
  "mathVersion": "independent-footballx-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Cobalt Lanterns 40",
    "colors": [
      "#b62271",
      "#543b8c",
      "#f9cd76"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "11000000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/fotballx",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "crash",
  "model": "clock-crash-v1",
  "ticketCount": 1e6,
  "returnBps": 9560,
  "maxMultiplierBps": 11e5,
  "growthBpsPerSecond": 2409,
  "rules": [
    "This original server-clock crash game can lose immediately. Collect before the hidden bust point.",
    "The server clock determines the collection multiplier. Client-supplied payouts or multipliers are ignored.",
    "Surviving the maximum multiplier collects automatically. Payouts round down to whole minor units."
  ],
  "paytable": [
    {
      "label": "First milestone",
      "multiplierBps": 11e3
    },
    {
      "label": "Double",
      "multiplierBps": 2e4
    },
    {
      "label": "Maximum",
      "multiplierBps": 11e5
    }
  ],
  "nominalReturn": {
    "numerator": "9560",
    "denominator": "10000",
    "type": "upper-bound-before-floor",
    "proof": "AtBPSmultiplierM,survival=floor(9560\xD71000000/(M+1))/1000000.Exactreturnequals survival\xD7floor(bet\xD7M/10000)/bet."
  }
};

// math/games/foxyhot20.mjs
var foxyhot20_default = {
  "id": "ind74_foxyhot20",
  "title": "Foxy Hot 20 \u2014 Independent",
  "catalogName": "Foxy Hot 20",
  "sourceCategory": "Slots",
  "mathVersion": "independent-foxyhot20-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Jade Orchard 41",
    "colors": [
      "#cad69f",
      "#d1c448",
      "#46939a"
    ]
  },
  "limits": {
    "minBetMinor": "20",
    "maxBetMinor": "100000",
    "betStepMinor": "20",
    "maxWinMinor": "142400000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/foxy-hot-20",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      0,
      1
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      0,
      0,
      0,
      1,
      0
    ],
    [
      0,
      0,
      0,
      1,
      1
    ],
    [
      0,
      0,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      2,
      0
    ],
    [
      0,
      0,
      0,
      2,
      1
    ],
    [
      0,
      0,
      0,
      2,
      2
    ],
    [
      0,
      0,
      1,
      0,
      0
    ],
    [
      0,
      0,
      1,
      0,
      1
    ],
    [
      0,
      0,
      1,
      0,
      2
    ],
    [
      0,
      0,
      1,
      1,
      0
    ],
    [
      0,
      0,
      1,
      1,
      1
    ],
    [
      0,
      0,
      1,
      1,
      2
    ],
    [
      0,
      0,
      1,
      2,
      0
    ]
  ],
  "symbols": [
    {
      "id": "foxyhot20-symbol-0",
      "label": "Ruby Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 21,
        "4": 140,
        "5": 1144
      }
    },
    {
      "id": "foxyhot20-symbol-1",
      "label": "Copper Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 23,
        "4": 144,
        "5": 1184
      }
    },
    {
      "id": "foxyhot20-symbol-2",
      "label": "Citrus Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 25,
        "4": 148,
        "5": 1224
      }
    },
    {
      "id": "foxyhot20-symbol-3",
      "label": "Orchard Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 152,
        "5": 1264
      }
    },
    {
      "id": "foxyhot20-symbol-4",
      "label": "Velvet Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 156,
        "5": 1304
      }
    },
    {
      "id": "foxyhot20-symbol-5",
      "label": "Amber Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 160,
        "5": 1344
      }
    },
    {
      "id": "foxyhot20-symbol-6",
      "label": "Prism Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 164,
        "5": 1384
      }
    },
    {
      "id": "foxyhot20-symbol-7",
      "label": "Ivory Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 168,
        "5": 1424
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 20 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3930",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/blazinghot40.mjs
var blazinghot40_default = {
  "id": "ind74_blazinghot40",
  "title": "Burning Ice 40 \u2014 Independent",
  "catalogName": "Burning Ice 40",
  "sourceCategory": "Slots",
  "mathVersion": "independent-blazinghot40-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Ember Spire 42",
    "colors": [
      "#57d74c",
      "#a312bd",
      "#b6a2d5"
    ]
  },
  "limits": {
    "minBetMinor": "40",
    "maxBetMinor": "100000",
    "betStepMinor": "40",
    "maxWinMinor": "160700000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/burning-ice-40",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      0,
      1
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      0,
      0,
      0,
      1,
      0
    ],
    [
      0,
      0,
      0,
      1,
      1
    ],
    [
      0,
      0,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      2,
      0
    ],
    [
      0,
      0,
      0,
      2,
      1
    ],
    [
      0,
      0,
      0,
      2,
      2
    ],
    [
      0,
      0,
      1,
      0,
      0
    ],
    [
      0,
      0,
      1,
      0,
      1
    ],
    [
      0,
      0,
      1,
      0,
      2
    ],
    [
      0,
      0,
      1,
      1,
      0
    ],
    [
      0,
      0,
      1,
      1,
      1
    ],
    [
      0,
      0,
      1,
      1,
      2
    ],
    [
      0,
      0,
      1,
      2,
      0
    ],
    [
      0,
      0,
      1,
      2,
      1
    ],
    [
      0,
      0,
      1,
      2,
      2
    ],
    [
      0,
      0,
      2,
      0,
      0
    ],
    [
      0,
      0,
      2,
      0,
      1
    ],
    [
      0,
      0,
      2,
      0,
      2
    ],
    [
      0,
      0,
      2,
      1,
      0
    ],
    [
      0,
      0,
      2,
      1,
      1
    ],
    [
      0,
      0,
      2,
      1,
      2
    ],
    [
      0,
      0,
      2,
      2,
      0
    ],
    [
      0,
      0,
      2,
      2,
      1
    ],
    [
      0,
      0,
      2,
      2,
      2
    ],
    [
      0,
      1,
      0,
      0,
      0
    ],
    [
      0,
      1,
      0,
      0,
      1
    ],
    [
      0,
      1,
      0,
      0,
      2
    ],
    [
      0,
      1,
      0,
      1,
      0
    ],
    [
      0,
      1,
      0,
      1,
      1
    ],
    [
      0,
      1,
      0,
      1,
      2
    ],
    [
      0,
      1,
      0,
      2,
      0
    ],
    [
      0,
      1,
      0,
      2,
      1
    ],
    [
      0,
      1,
      0,
      2,
      2
    ]
  ],
  "symbols": [
    {
      "id": "blazinghot40-symbol-0",
      "label": "Copper Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 22,
        "4": 106,
        "5": 1327
      }
    },
    {
      "id": "blazinghot40-symbol-1",
      "label": "Citrus Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 24,
        "4": 110,
        "5": 1367
      }
    },
    {
      "id": "blazinghot40-symbol-2",
      "label": "Orchard Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 26,
        "4": 114,
        "5": 1407
      }
    },
    {
      "id": "blazinghot40-symbol-3",
      "label": "Velvet Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 118,
        "5": 1447
      }
    },
    {
      "id": "blazinghot40-symbol-4",
      "label": "Amber Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 122,
        "5": 1487
      }
    },
    {
      "id": "blazinghot40-symbol-5",
      "label": "Prism Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 126,
        "5": 1527
      }
    },
    {
      "id": "blazinghot40-symbol-6",
      "label": "Ivory Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 130,
        "5": 1567
      }
    },
    {
      "id": "blazinghot40-symbol-7",
      "label": "Ruby Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 134,
        "5": 1607
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 40 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3931",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/mariachicoins.mjs
var mariachicoins_default = {
  "id": "ind74_mariachicoins",
  "title": "Mariachi Coins \u2014 Independent",
  "catalogName": "Mariachi Coins",
  "sourceCategory": "Slots",
  "mathVersion": "independent-mariachicoins-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Aurora Garden 43",
    "colors": [
      "#6c21c5",
      "#29f611",
      "#25c73c"
    ]
  },
  "limits": {
    "minBetMinor": "20",
    "maxBetMinor": "100000",
    "betStepMinor": "20",
    "maxWinMinor": "150300000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/mariachi-coins",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      0,
      1
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      0,
      0,
      0,
      1,
      0
    ],
    [
      0,
      0,
      0,
      1,
      1
    ],
    [
      0,
      0,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      2,
      0
    ],
    [
      0,
      0,
      0,
      2,
      1
    ],
    [
      0,
      0,
      0,
      2,
      2
    ],
    [
      0,
      0,
      1,
      0,
      0
    ],
    [
      0,
      0,
      1,
      0,
      1
    ],
    [
      0,
      0,
      1,
      0,
      2
    ],
    [
      0,
      0,
      1,
      1,
      0
    ],
    [
      0,
      0,
      1,
      1,
      1
    ],
    [
      0,
      0,
      1,
      1,
      2
    ],
    [
      0,
      0,
      1,
      2,
      0
    ]
  ],
  "symbols": [
    {
      "id": "mariachicoins-symbol-0",
      "label": "Citrus Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 23,
        "4": 113,
        "5": 1223
      }
    },
    {
      "id": "mariachicoins-symbol-1",
      "label": "Orchard Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 25,
        "4": 117,
        "5": 1263
      }
    },
    {
      "id": "mariachicoins-symbol-2",
      "label": "Velvet Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 121,
        "5": 1303
      }
    },
    {
      "id": "mariachicoins-symbol-3",
      "label": "Amber Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 125,
        "5": 1343
      }
    },
    {
      "id": "mariachicoins-symbol-4",
      "label": "Prism Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 129,
        "5": 1383
      }
    },
    {
      "id": "mariachicoins-symbol-5",
      "label": "Ivory Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 133,
        "5": 1423
      }
    },
    {
      "id": "mariachicoins-symbol-6",
      "label": "Ruby Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 137,
        "5": 1463
      }
    },
    {
      "id": "mariachicoins-symbol-7",
      "label": "Copper Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 37,
        "4": 141,
        "5": 1503
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 20 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3932",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/habeshafortune5.mjs
var habeshafortune5_default = {
  "id": "ind74_habeshafortune5",
  "title": "Habesha Fortune 5 \u2014 Independent",
  "catalogName": "Habesha Fortune 5",
  "sourceCategory": "Slots",
  "mathVersion": "independent-habeshafortune5-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Copper Voyage 44",
    "colors": [
      "#2fac7e",
      "#3ff2fe",
      "#1bd1c0"
    ]
  },
  "limits": {
    "minBetMinor": "5",
    "maxBetMinor": "100000",
    "betStepMinor": "5",
    "maxWinMinor": "139900000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/hab",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ]
  ],
  "symbols": [
    {
      "id": "habeshafortune5-symbol-0",
      "label": "Orchard Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 24,
        "4": 120,
        "5": 1119
      }
    },
    {
      "id": "habeshafortune5-symbol-1",
      "label": "Velvet Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 26,
        "4": 124,
        "5": 1159
      }
    },
    {
      "id": "habeshafortune5-symbol-2",
      "label": "Amber Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 128,
        "5": 1199
      }
    },
    {
      "id": "habeshafortune5-symbol-3",
      "label": "Prism Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 132,
        "5": 1239
      }
    },
    {
      "id": "habeshafortune5-symbol-4",
      "label": "Ivory Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 136,
        "5": 1279
      }
    },
    {
      "id": "habeshafortune5-symbol-5",
      "label": "Ruby Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 140,
        "5": 1319
      }
    },
    {
      "id": "habeshafortune5-symbol-6",
      "label": "Copper Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 144,
        "5": 1359
      }
    },
    {
      "id": "habeshafortune5-symbol-7",
      "label": "Citrus Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 38,
        "4": 148,
        "5": 1399
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 5 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3933",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/plinkojoker.mjs
var plinkojoker_default = {
  "id": "ind74_plinkojoker",
  "title": "4 Bonuses Bonanza \u2014 Independent",
  "catalogName": "4 Bonuses Bonanza",
  "sourceCategory": "Instant Games",
  "mathVersion": "independent-plinkojoker-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Lunar Arcade 45",
    "colors": [
      "#113647",
      "#c7bb91",
      "#c1736d"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "20632000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/4-bonuses-bonanza",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "plinko",
  "model": "binomial-plinko-v1",
  "rows": 12,
  "bucketMultipliersBps": [
    2063200,
    13e3,
    11200,
    9800,
    8800,
    8200,
    8e3,
    8200,
    8800,
    9800,
    11200,
    13e3,
    2063200
  ],
  "rules": [
    "This original 12-row path independently turns left or right with probability one half at each peg.",
    "The bucket index equals the number of right turns. Bucket k has probability C(rows,k) divided by 2 raised to rows.",
    "The published bucket multiplier gives the total payout. Prizes round down to whole minor units."
  ],
  "paytable": [
    {
      "label": "Bucket 0",
      "multiplierBps": 2063200,
      "probabilityNumerator": "1",
      "probabilityDenominator": "4096"
    },
    {
      "label": "Bucket 1",
      "multiplierBps": 13e3,
      "probabilityNumerator": "12",
      "probabilityDenominator": "4096"
    },
    {
      "label": "Bucket 2",
      "multiplierBps": 11200,
      "probabilityNumerator": "66",
      "probabilityDenominator": "4096"
    },
    {
      "label": "Bucket 3",
      "multiplierBps": 9800,
      "probabilityNumerator": "220",
      "probabilityDenominator": "4096"
    },
    {
      "label": "Bucket 4",
      "multiplierBps": 8800,
      "probabilityNumerator": "495",
      "probabilityDenominator": "4096"
    },
    {
      "label": "Bucket 5",
      "multiplierBps": 8200,
      "probabilityNumerator": "792",
      "probabilityDenominator": "4096"
    },
    {
      "label": "Bucket 6",
      "multiplierBps": 8e3,
      "probabilityNumerator": "924",
      "probabilityDenominator": "4096"
    },
    {
      "label": "Bucket 7",
      "multiplierBps": 8200,
      "probabilityNumerator": "792",
      "probabilityDenominator": "4096"
    },
    {
      "label": "Bucket 8",
      "multiplierBps": 8800,
      "probabilityNumerator": "495",
      "probabilityDenominator": "4096"
    },
    {
      "label": "Bucket 9",
      "multiplierBps": 9800,
      "probabilityNumerator": "220",
      "probabilityDenominator": "4096"
    },
    {
      "label": "Bucket 10",
      "multiplierBps": 11200,
      "probabilityNumerator": "66",
      "probabilityDenominator": "4096"
    },
    {
      "label": "Bucket 11",
      "multiplierBps": 13e3,
      "probabilityNumerator": "12",
      "probabilityDenominator": "4096"
    },
    {
      "label": "Bucket 12",
      "multiplierBps": 2063200,
      "probabilityNumerator": "1",
      "probabilityDenominator": "4096"
    }
  ],
  "nominalReturn": {
    "numerator": "39321600",
    "denominator": "40960000",
    "type": "before-integer-floor",
    "proof": "Sum(C(rows,k)\xD7bucketBps[k])/(2^rows\xD710000).Exactbetreturn uses integer flooredprizes."
  }
};

// math/games/cricketx.mjs
var cricketx_default = {
  "id": "ind74_cricketx",
  "title": "Cricket X \u2014 Independent",
  "catalogName": "Cricket X",
  "sourceCategory": "Crash Games",
  "mathVersion": "independent-cricketx-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Cobalt Lanterns 46",
    "colors": [
      "#4bb18a",
      "#c72105",
      "#6215a8"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "11000000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/cricket-x",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "crash",
  "model": "clock-crash-v1",
  "ticketCount": 1e6,
  "returnBps": 9520,
  "maxMultiplierBps": 11e5,
  "growthBpsPerSecond": 2595,
  "rules": [
    "This original server-clock crash game can lose immediately. Collect before the hidden bust point.",
    "The server clock determines the collection multiplier. Client-supplied payouts or multipliers are ignored.",
    "Surviving the maximum multiplier collects automatically. Payouts round down to whole minor units."
  ],
  "paytable": [
    {
      "label": "First milestone",
      "multiplierBps": 11e3
    },
    {
      "label": "Double",
      "multiplierBps": 2e4
    },
    {
      "label": "Maximum",
      "multiplierBps": 11e5
    }
  ],
  "nominalReturn": {
    "numerator": "9520",
    "denominator": "10000",
    "type": "upper-bound-before-floor",
    "proof": "AtBPSmultiplierM,survival=floor(9520\xD71000000/(M+1))/1000000.Exactreturnequals survival\xD7floor(bet\xD7M/10000)/bet."
  }
};

// math/games/blazinghot.mjs
var blazinghot_default = {
  "id": "ind74_blazinghot",
  "title": "Burning Ice \u2014 Independent",
  "catalogName": "Burning Ice",
  "sourceCategory": "Slots",
  "mathVersion": "independent-blazinghot-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Jade Orchard 47",
    "colors": [
      "#c7bb0d",
      "#06d5bb",
      "#f9c58c"
    ]
  },
  "limits": {
    "minBetMinor": "20",
    "maxBetMinor": "100000",
    "betStepMinor": "20",
    "maxWinMinor": "108700000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/burning-ice-41",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      0,
      1
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      0,
      0,
      0,
      1,
      0
    ],
    [
      0,
      0,
      0,
      1,
      1
    ],
    [
      0,
      0,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      2,
      0
    ],
    [
      0,
      0,
      0,
      2,
      1
    ],
    [
      0,
      0,
      0,
      2,
      2
    ],
    [
      0,
      0,
      1,
      0,
      0
    ],
    [
      0,
      0,
      1,
      0,
      1
    ],
    [
      0,
      0,
      1,
      0,
      2
    ],
    [
      0,
      0,
      1,
      1,
      0
    ],
    [
      0,
      0,
      1,
      1,
      1
    ],
    [
      0,
      0,
      1,
      1,
      2
    ],
    [
      0,
      0,
      1,
      2,
      0
    ]
  ],
  "symbols": [
    {
      "id": "blazinghot-symbol-0",
      "label": "Prism Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 141,
        "5": 807
      }
    },
    {
      "id": "blazinghot-symbol-1",
      "label": "Ivory Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 145,
        "5": 847
      }
    },
    {
      "id": "blazinghot-symbol-2",
      "label": "Ruby Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 149,
        "5": 887
      }
    },
    {
      "id": "blazinghot-symbol-3",
      "label": "Copper Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 153,
        "5": 927
      }
    },
    {
      "id": "blazinghot-symbol-4",
      "label": "Citrus Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 157,
        "5": 967
      }
    },
    {
      "id": "blazinghot-symbol-5",
      "label": "Orchard Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 37,
        "4": 161,
        "5": 1007
      }
    },
    {
      "id": "blazinghot-symbol-6",
      "label": "Velvet Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 39,
        "4": 165,
        "5": 1047
      }
    },
    {
      "id": "blazinghot-symbol-7",
      "label": "Amber Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 41,
        "4": 169,
        "5": 1087
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 20 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3936",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/cricketerx.mjs
var cricketerx_default = {
  "id": "ind74_cricketerx",
  "title": "CricketerX \u2014 Independent",
  "catalogName": "CricketerX",
  "sourceCategory": "Crash Games",
  "mathVersion": "independent-cricketerx-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Ember Spire 48",
    "colors": [
      "#85f9f6",
      "#021606",
      "#dab29c"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "15000000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/cricketerx",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "crash",
  "model": "clock-crash-v1",
  "ticketCount": 1e6,
  "returnBps": 9600,
  "maxMultiplierBps": 15e5,
  "growthBpsPerSecond": 2657,
  "rules": [
    "This original server-clock crash game can lose immediately. Collect before the hidden bust point.",
    "The server clock determines the collection multiplier. Client-supplied payouts or multipliers are ignored.",
    "Surviving the maximum multiplier collects automatically. Payouts round down to whole minor units."
  ],
  "paytable": [
    {
      "label": "First milestone",
      "multiplierBps": 11e3
    },
    {
      "label": "Double",
      "multiplierBps": 2e4
    },
    {
      "label": "Maximum",
      "multiplierBps": 15e5
    }
  ],
  "nominalReturn": {
    "numerator": "9600",
    "denominator": "10000",
    "type": "upper-bound-before-floor",
    "proof": "AtBPSmultiplierM,survival=floor(9600\xD71000000/(M+1))/1000000.Exactreturnequals survival\xD7floor(bet\xD7M/10000)/bet."
  }
};

// math/games/wheelofdestiny.mjs
var wheelofdestiny_default = {
  "id": "ind74_wheelofdestiny",
  "title": "Wheel Of Destiny \u2014 Independent",
  "catalogName": "Wheel Of Destiny",
  "sourceCategory": "Instant Games",
  "mathVersion": "independent-wheelofdestiny-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Aurora Garden 49",
    "colors": [
      "#872a5e",
      "#324a1a",
      "#d0c640"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "5148000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/wheel-of-destiny",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "wheel",
  "model": "weighted-wheel-v1",
  "sectors": [
    {
      "id": "sector-0",
      "label": "Cloud",
      "weight": 40,
      "multiplierBps": 0
    },
    {
      "id": "sector-1",
      "label": "Mist",
      "weight": 25,
      "multiplierBps": 0
    },
    {
      "id": "sector-2",
      "label": "Rest",
      "weight": 15,
      "multiplierBps": 0
    },
    {
      "id": "sector-3",
      "label": "Spark",
      "weight": 10,
      "multiplierBps": 1e4
    },
    {
      "id": "sector-4",
      "label": "Pair",
      "weight": 5,
      "multiplierBps": 2e4
    },
    {
      "id": "sector-5",
      "label": "Glow",
      "weight": 3,
      "multiplierBps": 44800
    },
    {
      "id": "sector-6",
      "label": "Prism",
      "weight": 1,
      "multiplierBps": 104800
    },
    {
      "id": "sector-7",
      "label": "Crown",
      "weight": 1,
      "multiplierBps": 514800
    }
  ],
  "rules": [
    "This original eight-sector weighted wheel settles when Play is pressed.",
    "Each sector's probability is its published weight divided by 100. Its multiplier gives the total payout, including the stake.",
    "Zero sectors lose. Nonzero prizes round down to whole minor units."
  ],
  "paytable": [
    {
      "id": "sector-0",
      "label": "Cloud",
      "weight": 40,
      "multiplierBps": 0
    },
    {
      "id": "sector-1",
      "label": "Mist",
      "weight": 25,
      "multiplierBps": 0
    },
    {
      "id": "sector-2",
      "label": "Rest",
      "weight": 15,
      "multiplierBps": 0
    },
    {
      "id": "sector-3",
      "label": "Spark",
      "weight": 10,
      "multiplierBps": 1e4
    },
    {
      "id": "sector-4",
      "label": "Pair",
      "weight": 5,
      "multiplierBps": 2e4
    },
    {
      "id": "sector-5",
      "label": "Glow",
      "weight": 3,
      "multiplierBps": 44800
    },
    {
      "id": "sector-6",
      "label": "Prism",
      "weight": 1,
      "multiplierBps": 104800
    },
    {
      "id": "sector-7",
      "label": "Crown",
      "weight": 1,
      "multiplierBps": 514800
    }
  ],
  "nominalReturn": {
    "numerator": "954000",
    "denominator": "1000000",
    "type": "before-integer-floor",
    "proof": "Sum(weight\xD7multiplierBps)/(100\xD710000).Exactbet-dependentreturn uses flooredsectorpayouts."
  }
};

// math/games/wildmultistars.mjs
var wildmultistars_default = {
  "id": "ind74_wildmultistars",
  "title": "Wild Multi Stars \u2014 Independent",
  "catalogName": "Wild Multi Stars",
  "sourceCategory": "Slots",
  "mathVersion": "independent-wildmultistars-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Copper Voyage 50",
    "colors": [
      "#259833",
      "#363698",
      "#34fd4b"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "151000000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/wild-multi-stars",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      0,
      1
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      0,
      0,
      0,
      1,
      0
    ],
    [
      0,
      0,
      0,
      1,
      1
    ],
    [
      0,
      0,
      0,
      1,
      2
    ]
  ],
  "symbols": [
    {
      "id": "wildmultistars-symbol-0",
      "label": "Copper Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 22,
        "4": 121,
        "5": 1230
      }
    },
    {
      "id": "wildmultistars-symbol-1",
      "label": "Citrus Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 24,
        "4": 125,
        "5": 1270
      }
    },
    {
      "id": "wildmultistars-symbol-2",
      "label": "Orchard Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 26,
        "4": 129,
        "5": 1310
      }
    },
    {
      "id": "wildmultistars-symbol-3",
      "label": "Velvet Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 133,
        "5": 1350
      }
    },
    {
      "id": "wildmultistars-symbol-4",
      "label": "Amber Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 137,
        "5": 1390
      }
    },
    {
      "id": "wildmultistars-symbol-5",
      "label": "Prism Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 141,
        "5": 1430
      }
    },
    {
      "id": "wildmultistars-symbol-6",
      "label": "Ivory Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 145,
        "5": 1470
      }
    },
    {
      "id": "wildmultistars-symbol-7",
      "label": "Ruby Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 149,
        "5": 1510
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 10 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3939",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/tugofwar.mjs
var tugofwar_default = {
  "id": "ind74_tugofwar",
  "title": "Crash Duel \u2014 Independent",
  "catalogName": "Crash Duel",
  "sourceCategory": "",
  "mathVersion": "independent-tugofwar-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Lunar Arcade 51",
    "colors": [
      "#0403d6",
      "#765dbc",
      "#dae668"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "9000000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/crash-duel",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "crash",
  "model": "clock-crash-v1",
  "ticketCount": 1e6,
  "returnBps": 9440,
  "maxMultiplierBps": 9e5,
  "growthBpsPerSecond": 2750,
  "rules": [
    "This original server-clock crash game can lose immediately. Collect before the hidden bust point.",
    "The server clock determines the collection multiplier. Client-supplied payouts or multipliers are ignored.",
    "Surviving the maximum multiplier collects automatically. Payouts round down to whole minor units."
  ],
  "paytable": [
    {
      "label": "First milestone",
      "multiplierBps": 11e3
    },
    {
      "label": "Double",
      "multiplierBps": 2e4
    },
    {
      "label": "Maximum",
      "multiplierBps": 9e5
    }
  ],
  "nominalReturn": {
    "numerator": "9440",
    "denominator": "10000",
    "type": "upper-bound-before-floor",
    "proof": "AtBPSmultiplierM,survival=floor(9440\xD71000000/(M+1))/1000000.Exactreturnequals survival\xD7floor(bet\xD7M/10000)/bet."
  }
};

// math/games/geniesbonanza.mjs
var geniesbonanza_default = {
  "id": "ind74_geniesbonanza",
  "title": "Genie's Bonanza \u2014 Independent",
  "catalogName": "Genie's Bonanza",
  "sourceCategory": "Slots",
  "mathVersion": "independent-geniesbonanza-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Cobalt Lanterns 52",
    "colors": [
      "#d6a11d",
      "#f8d2c6",
      "#cd1e3a"
    ]
  },
  "limits": {
    "minBetMinor": "25",
    "maxBetMinor": "100000",
    "betStepMinor": "25",
    "maxWinMinor": "130200000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/genies-bonanza",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      0,
      1
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      0,
      0,
      0,
      1,
      0
    ],
    [
      0,
      0,
      0,
      1,
      1
    ],
    [
      0,
      0,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      2,
      0
    ],
    [
      0,
      0,
      0,
      2,
      1
    ],
    [
      0,
      0,
      0,
      2,
      2
    ],
    [
      0,
      0,
      1,
      0,
      0
    ],
    [
      0,
      0,
      1,
      0,
      1
    ],
    [
      0,
      0,
      1,
      0,
      2
    ],
    [
      0,
      0,
      1,
      1,
      0
    ],
    [
      0,
      0,
      1,
      1,
      1
    ],
    [
      0,
      0,
      1,
      1,
      2
    ],
    [
      0,
      0,
      1,
      2,
      0
    ],
    [
      0,
      0,
      1,
      2,
      1
    ],
    [
      0,
      0,
      1,
      2,
      2
    ],
    [
      0,
      0,
      2,
      0,
      0
    ],
    [
      0,
      0,
      2,
      0,
      1
    ],
    [
      0,
      0,
      2,
      0,
      2
    ]
  ],
  "symbols": [
    {
      "id": "geniesbonanza-symbol-0",
      "label": "Orchard Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 24,
        "4": 135,
        "5": 1022
      }
    },
    {
      "id": "geniesbonanza-symbol-1",
      "label": "Velvet Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 26,
        "4": 139,
        "5": 1062
      }
    },
    {
      "id": "geniesbonanza-symbol-2",
      "label": "Amber Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 143,
        "5": 1102
      }
    },
    {
      "id": "geniesbonanza-symbol-3",
      "label": "Prism Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 147,
        "5": 1142
      }
    },
    {
      "id": "geniesbonanza-symbol-4",
      "label": "Ivory Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 151,
        "5": 1182
      }
    },
    {
      "id": "geniesbonanza-symbol-5",
      "label": "Ruby Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 155,
        "5": 1222
      }
    },
    {
      "id": "geniesbonanza-symbol-6",
      "label": "Copper Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 159,
        "5": 1262
      }
    },
    {
      "id": "geniesbonanza-symbol-7",
      "label": "Citrus Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 38,
        "4": 163,
        "5": 1302
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 25 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3941",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/bonustime.mjs
var bonustime_default = {
  "id": "ind74_bonustime",
  "title": "Bonus Time \u2014 Independent",
  "catalogName": "Bonus Time",
  "sourceCategory": "Instant Games",
  "mathVersion": "independent-bonustime-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Jade Orchard 53",
    "colors": [
      "#d69008",
      "#822616",
      "#3c8388"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "5102000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/bonus-time",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "wheel",
  "model": "weighted-wheel-v1",
  "sectors": [
    {
      "id": "sector-0",
      "label": "Cloud",
      "weight": 40,
      "multiplierBps": 0
    },
    {
      "id": "sector-1",
      "label": "Mist",
      "weight": 25,
      "multiplierBps": 0
    },
    {
      "id": "sector-2",
      "label": "Rest",
      "weight": 15,
      "multiplierBps": 0
    },
    {
      "id": "sector-3",
      "label": "Spark",
      "weight": 10,
      "multiplierBps": 1e4
    },
    {
      "id": "sector-4",
      "label": "Pair",
      "weight": 5,
      "multiplierBps": 2e4
    },
    {
      "id": "sector-5",
      "label": "Glow",
      "weight": 3,
      "multiplierBps": 45200
    },
    {
      "id": "sector-6",
      "label": "Prism",
      "weight": 1,
      "multiplierBps": 105200
    },
    {
      "id": "sector-7",
      "label": "Crown",
      "weight": 1,
      "multiplierBps": 510200
    }
  ],
  "rules": [
    "This original eight-sector weighted wheel settles when Play is pressed.",
    "Each sector's probability is its published weight divided by 100. Its multiplier gives the total payout, including the stake.",
    "Zero sectors lose. Nonzero prizes round down to whole minor units."
  ],
  "paytable": [
    {
      "id": "sector-0",
      "label": "Cloud",
      "weight": 40,
      "multiplierBps": 0
    },
    {
      "id": "sector-1",
      "label": "Mist",
      "weight": 25,
      "multiplierBps": 0
    },
    {
      "id": "sector-2",
      "label": "Rest",
      "weight": 15,
      "multiplierBps": 0
    },
    {
      "id": "sector-3",
      "label": "Spark",
      "weight": 10,
      "multiplierBps": 1e4
    },
    {
      "id": "sector-4",
      "label": "Pair",
      "weight": 5,
      "multiplierBps": 2e4
    },
    {
      "id": "sector-5",
      "label": "Glow",
      "weight": 3,
      "multiplierBps": 45200
    },
    {
      "id": "sector-6",
      "label": "Prism",
      "weight": 1,
      "multiplierBps": 105200
    },
    {
      "id": "sector-7",
      "label": "Crown",
      "weight": 1,
      "multiplierBps": 510200
    }
  ],
  "nominalReturn": {
    "numerator": "951000",
    "denominator": "1000000",
    "type": "before-integer-floor",
    "proof": "Sum(weight\xD7multiplierBps)/(100\xD710000).Exactbet-dependentreturn uses flooredsectorpayouts."
  }
};

// math/games/farmsfortune.mjs
var farmsfortune_default = {
  "id": "ind74_farmsfortune",
  "title": "Farm's Fortune \u2014 Independent",
  "catalogName": "Farm's Fortune",
  "sourceCategory": "Slots",
  "mathVersion": "independent-farmsfortune-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Ember Spire 54",
    "colors": [
      "#9dabb0",
      "#79e927",
      "#423a23"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "138100000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/farms-fortune-6n0s6",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      0,
      1
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      0,
      0,
      0,
      1,
      0
    ],
    [
      0,
      0,
      0,
      1,
      1
    ],
    [
      0,
      0,
      0,
      1,
      2
    ]
  ],
  "symbols": [
    {
      "id": "farmsfortune-symbol-0",
      "label": "Amber Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 26,
        "4": 108,
        "5": 1101
      }
    },
    {
      "id": "farmsfortune-symbol-1",
      "label": "Prism Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 112,
        "5": 1141
      }
    },
    {
      "id": "farmsfortune-symbol-2",
      "label": "Ivory Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 116,
        "5": 1181
      }
    },
    {
      "id": "farmsfortune-symbol-3",
      "label": "Ruby Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 120,
        "5": 1221
      }
    },
    {
      "id": "farmsfortune-symbol-4",
      "label": "Copper Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 124,
        "5": 1261
      }
    },
    {
      "id": "farmsfortune-symbol-5",
      "label": "Citrus Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 128,
        "5": 1301
      }
    },
    {
      "id": "farmsfortune-symbol-6",
      "label": "Orchard Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 38,
        "4": 132,
        "5": 1341
      }
    },
    {
      "id": "farmsfortune-symbol-7",
      "label": "Velvet Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 40,
        "4": 136,
        "5": 1381
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 10 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3943",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/madslot.mjs
var madslot_default = {
  "id": "ind74_madslot",
  "title": "Mad Slot \u2014 Independent",
  "catalogName": "Mad Slot",
  "sourceCategory": "Slots",
  "mathVersion": "independent-madslot-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Aurora Garden 55",
    "colors": [
      "#a1ee96",
      "#b58fa7",
      "#57cc4e"
    ]
  },
  "limits": {
    "minBetMinor": "20",
    "maxBetMinor": "100000",
    "betStepMinor": "20",
    "maxWinMinor": "127700000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/mad-slot",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      0,
      1
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      0,
      0,
      0,
      1,
      0
    ],
    [
      0,
      0,
      0,
      1,
      1
    ],
    [
      0,
      0,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      2,
      0
    ],
    [
      0,
      0,
      0,
      2,
      1
    ],
    [
      0,
      0,
      0,
      2,
      2
    ],
    [
      0,
      0,
      1,
      0,
      0
    ],
    [
      0,
      0,
      1,
      0,
      1
    ],
    [
      0,
      0,
      1,
      0,
      2
    ],
    [
      0,
      0,
      1,
      1,
      0
    ],
    [
      0,
      0,
      1,
      1,
      1
    ],
    [
      0,
      0,
      1,
      1,
      2
    ],
    [
      0,
      0,
      1,
      2,
      0
    ]
  ],
  "symbols": [
    {
      "id": "madslot-symbol-0",
      "label": "Prism Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 115,
        "5": 997
      }
    },
    {
      "id": "madslot-symbol-1",
      "label": "Ivory Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 119,
        "5": 1037
      }
    },
    {
      "id": "madslot-symbol-2",
      "label": "Ruby Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 123,
        "5": 1077
      }
    },
    {
      "id": "madslot-symbol-3",
      "label": "Copper Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 127,
        "5": 1117
      }
    },
    {
      "id": "madslot-symbol-4",
      "label": "Citrus Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 131,
        "5": 1157
      }
    },
    {
      "id": "madslot-symbol-5",
      "label": "Orchard Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 37,
        "4": 135,
        "5": 1197
      }
    },
    {
      "id": "madslot-symbol-6",
      "label": "Velvet Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 39,
        "4": 139,
        "5": 1237
      }
    },
    {
      "id": "madslot-symbol-7",
      "label": "Amber Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 41,
        "4": 143,
        "5": 1277
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 20 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3944",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/jetx3.mjs
var jetx3_default = {
  "id": "ind74_jetx3",
  "title": "AviaStar \u2014 Independent",
  "catalogName": "AviaStar",
  "sourceCategory": "Crash Games",
  "mathVersion": "independent-jetx3-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Copper Voyage 56",
    "colors": [
      "#fd20c4",
      "#f61f71",
      "#333ffb"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "7000000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/aviastar",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "crash",
  "model": "clock-crash-v1",
  "ticketCount": 1e6,
  "returnBps": 9640,
  "maxMultiplierBps": 7e5,
  "growthBpsPerSecond": 2905,
  "rules": [
    "This original server-clock crash game can lose immediately. Collect before the hidden bust point.",
    "The server clock determines the collection multiplier. Client-supplied payouts or multipliers are ignored.",
    "Surviving the maximum multiplier collects automatically. Payouts round down to whole minor units."
  ],
  "paytable": [
    {
      "label": "First milestone",
      "multiplierBps": 11e3
    },
    {
      "label": "Double",
      "multiplierBps": 2e4
    },
    {
      "label": "Maximum",
      "multiplierBps": 7e5
    }
  ],
  "nominalReturn": {
    "numerator": "9640",
    "denominator": "10000",
    "type": "upper-bound-before-floor",
    "proof": "AtBPSmultiplierM,survival=floor(9640\xD71000000/(M+1))/1000000.Exactreturnequals survival\xD7floor(bet\xD7M/10000)/bet."
  }
};

// math/games/smashx.mjs
var smashx_default = {
  "id": "ind74_smashx",
  "title": "Smash X \u2014 Independent",
  "catalogName": "Smash X",
  "sourceCategory": "Crash Games",
  "mathVersion": "independent-smashx-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Lunar Arcade 57",
    "colors": [
      "#90eb3c",
      "#cf9345",
      "#1e47d7"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "9000000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/smash-x",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "crash",
  "model": "clock-crash-v1",
  "ticketCount": 1e6,
  "returnBps": 9400,
  "maxMultiplierBps": 9e5,
  "growthBpsPerSecond": 2936,
  "rules": [
    "This original server-clock crash game can lose immediately. Collect before the hidden bust point.",
    "The server clock determines the collection multiplier. Client-supplied payouts or multipliers are ignored.",
    "Surviving the maximum multiplier collects automatically. Payouts round down to whole minor units."
  ],
  "paytable": [
    {
      "label": "First milestone",
      "multiplierBps": 11e3
    },
    {
      "label": "Double",
      "multiplierBps": 2e4
    },
    {
      "label": "Maximum",
      "multiplierBps": 9e5
    }
  ],
  "nominalReturn": {
    "numerator": "9400",
    "denominator": "10000",
    "type": "upper-bound-before-floor",
    "proof": "AtBPSmultiplierM,survival=floor(9400\xD71000000/(M+1))/1000000.Exactreturnequals survival\xD7floor(bet\xD7M/10000)/bet."
  }
};

// math/games/towerx.mjs
var towerx_default = {
  "id": "ind74_towerx",
  "title": "Tower X \u2014 Independent",
  "catalogName": "Tower X",
  "sourceCategory": "Instant Games",
  "mathVersion": "independent-towerx-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Cobalt Lanterns 58",
    "colors": [
      "#ec9ccf",
      "#5e9b18",
      "#103164"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "15700000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/tower-x",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "ladder",
  "model": "conditional-ladder-v1",
  "returnBps": 9560,
  "multipliersBps": [
    12e3,
    15e3,
    2e4,
    3e4,
    5e4,
    8e4,
    15e4,
    3e5,
    6e5,
    157e4
  ],
  "modes": [
    "easy"
  ],
  "defaultMode": "easy",
  "maxSteps": 10,
  "rules": [
    "This original ten-step ladder attempts the first step on Play. The first step can fail.",
    "Each successful step offers Collect. A failed step forfeits all uncollected value.",
    "First-step survival is return basis points divided by the first multiplier. Later conditional survival is previous multiplier divided by next multiplier.",
    "Visual step choices do not change probabilities. The final successful step collects automatically."
  ],
  "paytable": [
    {
      "mode": "easy",
      "rows": [
        {
          "label": "Step 1",
          "step": 1,
          "multiplierBps": 12e3,
          "conditionalSurvival": {
            "numerator": 9560,
            "denominator": 12e3
          }
        },
        {
          "label": "Step 2",
          "step": 2,
          "multiplierBps": 15e3,
          "conditionalSurvival": {
            "numerator": 12e3,
            "denominator": 15e3
          }
        },
        {
          "label": "Step 3",
          "step": 3,
          "multiplierBps": 2e4,
          "conditionalSurvival": {
            "numerator": 15e3,
            "denominator": 2e4
          }
        },
        {
          "label": "Step 4",
          "step": 4,
          "multiplierBps": 3e4,
          "conditionalSurvival": {
            "numerator": 2e4,
            "denominator": 3e4
          }
        },
        {
          "label": "Step 5",
          "step": 5,
          "multiplierBps": 5e4,
          "conditionalSurvival": {
            "numerator": 3e4,
            "denominator": 5e4
          }
        },
        {
          "label": "Step 6",
          "step": 6,
          "multiplierBps": 8e4,
          "conditionalSurvival": {
            "numerator": 5e4,
            "denominator": 8e4
          }
        },
        {
          "label": "Step 7",
          "step": 7,
          "multiplierBps": 15e4,
          "conditionalSurvival": {
            "numerator": 8e4,
            "denominator": 15e4
          }
        },
        {
          "label": "Step 8",
          "step": 8,
          "multiplierBps": 3e5,
          "conditionalSurvival": {
            "numerator": 15e4,
            "denominator": 3e5
          }
        },
        {
          "label": "Step 9",
          "step": 9,
          "multiplierBps": 6e5,
          "conditionalSurvival": {
            "numerator": 3e5,
            "denominator": 6e5
          }
        },
        {
          "label": "Step 10",
          "step": 10,
          "multiplierBps": 157e4,
          "conditionalSurvival": {
            "numerator": 6e5,
            "denominator": 157e4
          }
        }
      ]
    }
  ],
  "nominalReturn": {
    "numerator": "9560",
    "denominator": "10000",
    "type": "before-integer-floor",
    "proof": "Conditionalsurvivalprobabilities telescope toreturnBps/Mk;expectedprize=bet\xD7returnBps/10000beforeintegerfloor."
  }
};

// math/games/hotsamba.mjs
var hotsamba_default = {
  "id": "ind74_hotsamba",
  "title": "Hot Samba \u2014 Independent",
  "catalogName": "Hot Samba",
  "sourceCategory": "Slots",
  "mathVersion": "independent-hotsamba-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Jade Orchard 59",
    "colors": [
      "#78fb7b",
      "#7e9d61",
      "#2f8381"
    ]
  },
  "limits": {
    "minBetMinor": "20",
    "maxBetMinor": "100000",
    "betStepMinor": "20",
    "maxWinMinor": "130900000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/hot-samba",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      0,
      1
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      0,
      0,
      0,
      1,
      0
    ],
    [
      0,
      0,
      0,
      1,
      1
    ],
    [
      0,
      0,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      2,
      0
    ],
    [
      0,
      0,
      0,
      2,
      1
    ],
    [
      0,
      0,
      0,
      2,
      2
    ],
    [
      0,
      0,
      1,
      0,
      0
    ],
    [
      0,
      0,
      1,
      0,
      1
    ],
    [
      0,
      0,
      1,
      0,
      2
    ],
    [
      0,
      0,
      1,
      1,
      0
    ],
    [
      0,
      0,
      1,
      1,
      1
    ],
    [
      0,
      0,
      1,
      1,
      2
    ],
    [
      0,
      0,
      1,
      2,
      0
    ]
  ],
  "symbols": [
    {
      "id": "hotsamba-symbol-0",
      "label": "Citrus Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 23,
        "4": 143,
        "5": 1029
      }
    },
    {
      "id": "hotsamba-symbol-1",
      "label": "Orchard Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 25,
        "4": 147,
        "5": 1069
      }
    },
    {
      "id": "hotsamba-symbol-2",
      "label": "Velvet Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 151,
        "5": 1109
      }
    },
    {
      "id": "hotsamba-symbol-3",
      "label": "Amber Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 155,
        "5": 1149
      }
    },
    {
      "id": "hotsamba-symbol-4",
      "label": "Prism Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 159,
        "5": 1189
      }
    },
    {
      "id": "hotsamba-symbol-5",
      "label": "Ivory Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 163,
        "5": 1229
      }
    },
    {
      "id": "hotsamba-symbol-6",
      "label": "Ruby Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 167,
        "5": 1269
      }
    },
    {
      "id": "hotsamba-symbol-7",
      "label": "Copper Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 37,
        "4": 171,
        "5": 1309
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 20 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3948",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/wildsandgods.mjs
var wildsandgods_default = {
  "id": "ind74_wildsandgods",
  "title": "Wilds and Gods \u2014 Independent",
  "catalogName": "Wilds and Gods",
  "sourceCategory": "Slots",
  "mathVersion": "independent-wildsandgods-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Ember Spire 60",
    "colors": [
      "#1c72c4",
      "#208f24",
      "#724594"
    ]
  },
  "limits": {
    "minBetMinor": "25",
    "maxBetMinor": "100000",
    "betStepMinor": "25",
    "maxWinMinor": "149200000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/wilds-and-gods",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      0,
      1
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      0,
      0,
      0,
      1,
      0
    ],
    [
      0,
      0,
      0,
      1,
      1
    ],
    [
      0,
      0,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      2,
      0
    ],
    [
      0,
      0,
      0,
      2,
      1
    ],
    [
      0,
      0,
      0,
      2,
      2
    ],
    [
      0,
      0,
      1,
      0,
      0
    ],
    [
      0,
      0,
      1,
      0,
      1
    ],
    [
      0,
      0,
      1,
      0,
      2
    ],
    [
      0,
      0,
      1,
      1,
      0
    ],
    [
      0,
      0,
      1,
      1,
      1
    ],
    [
      0,
      0,
      1,
      1,
      2
    ],
    [
      0,
      0,
      1,
      2,
      0
    ],
    [
      0,
      0,
      1,
      2,
      1
    ],
    [
      0,
      0,
      1,
      2,
      2
    ],
    [
      0,
      0,
      2,
      0,
      0
    ],
    [
      0,
      0,
      2,
      0,
      1
    ],
    [
      0,
      0,
      2,
      0,
      2
    ]
  ],
  "symbols": [
    {
      "id": "wildsandgods-symbol-0",
      "label": "Orchard Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 24,
        "4": 109,
        "5": 1212
      }
    },
    {
      "id": "wildsandgods-symbol-1",
      "label": "Velvet Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 26,
        "4": 113,
        "5": 1252
      }
    },
    {
      "id": "wildsandgods-symbol-2",
      "label": "Amber Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 117,
        "5": 1292
      }
    },
    {
      "id": "wildsandgods-symbol-3",
      "label": "Prism Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 121,
        "5": 1332
      }
    },
    {
      "id": "wildsandgods-symbol-4",
      "label": "Ivory Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 125,
        "5": 1372
      }
    },
    {
      "id": "wildsandgods-symbol-5",
      "label": "Ruby Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 129,
        "5": 1412
      }
    },
    {
      "id": "wildsandgods-symbol-6",
      "label": "Copper Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 133,
        "5": 1452
      }
    },
    {
      "id": "wildsandgods-symbol-7",
      "label": "Citrus Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 38,
        "4": 137,
        "5": 1492
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 25 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3949",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/baoslot5x.mjs
var baoslot5x_default = {
  "id": "ind74_baoslot5x",
  "title": "Bao Slot 5X \u2014 Independent",
  "catalogName": "Bao Slot 5X",
  "sourceCategory": "Slots",
  "mathVersion": "independent-baoslot5x-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Aurora Garden 61",
    "colors": [
      "#f601de",
      "#ed4885",
      "#bb3c43"
    ]
  },
  "limits": {
    "minBetMinor": "5",
    "maxBetMinor": "100000",
    "betStepMinor": "5",
    "maxWinMinor": "138800000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/bao-slot-5",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ]
  ],
  "symbols": [
    {
      "id": "baoslot5x-symbol-0",
      "label": "Velvet Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 25,
        "4": 116,
        "5": 1108
      }
    },
    {
      "id": "baoslot5x-symbol-1",
      "label": "Amber Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 120,
        "5": 1148
      }
    },
    {
      "id": "baoslot5x-symbol-2",
      "label": "Prism Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 124,
        "5": 1188
      }
    },
    {
      "id": "baoslot5x-symbol-3",
      "label": "Ivory Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 128,
        "5": 1228
      }
    },
    {
      "id": "baoslot5x-symbol-4",
      "label": "Ruby Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 132,
        "5": 1268
      }
    },
    {
      "id": "baoslot5x-symbol-5",
      "label": "Copper Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 136,
        "5": 1308
      }
    },
    {
      "id": "baoslot5x-symbol-6",
      "label": "Citrus Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 37,
        "4": 140,
        "5": 1348
      }
    },
    {
      "id": "baoslot5x-symbol-7",
      "label": "Orchard Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 39,
        "4": 144,
        "5": 1388
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 5 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3950",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/junglesisters.mjs
var junglesisters_default = {
  "id": "ind74_junglesisters",
  "title": "Jungle Sisters \u2014 Independent",
  "catalogName": "Jungle Sisters",
  "sourceCategory": "Slots",
  "mathVersion": "independent-junglesisters-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Copper Voyage 62",
    "colors": [
      "#6b1371",
      "#7d567c",
      "#9cec6c"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "128400000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/jungle-sisters",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      0,
      1
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      0,
      0,
      0,
      1,
      0
    ],
    [
      0,
      0,
      0,
      1,
      1
    ],
    [
      0,
      0,
      0,
      1,
      2
    ]
  ],
  "symbols": [
    {
      "id": "junglesisters-symbol-0",
      "label": "Amber Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 26,
        "4": 123,
        "5": 1004
      }
    },
    {
      "id": "junglesisters-symbol-1",
      "label": "Prism Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 127,
        "5": 1044
      }
    },
    {
      "id": "junglesisters-symbol-2",
      "label": "Ivory Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 131,
        "5": 1084
      }
    },
    {
      "id": "junglesisters-symbol-3",
      "label": "Ruby Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 135,
        "5": 1124
      }
    },
    {
      "id": "junglesisters-symbol-4",
      "label": "Copper Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 139,
        "5": 1164
      }
    },
    {
      "id": "junglesisters-symbol-5",
      "label": "Citrus Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 143,
        "5": 1204
      }
    },
    {
      "id": "junglesisters-symbol-6",
      "label": "Orchard Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 38,
        "4": 147,
        "5": 1244
      }
    },
    {
      "id": "junglesisters-symbol-7",
      "label": "Velvet Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 40,
        "4": 151,
        "5": 1284
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 10 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3951",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/bokajamba10.mjs
var bokajamba10_default = {
  "id": "ind74_bokajamba10",
  "title": "Boka Jamba 10 \u2014 Independent",
  "catalogName": "Boka Jamba 10",
  "sourceCategory": "Slots",
  "mathVersion": "independent-bokajamba10-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Lunar Arcade 63",
    "colors": [
      "#11b2ee",
      "#205ccd",
      "#dee484"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "118000000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/boca-jamba-10",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      0,
      1
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      0,
      0,
      0,
      1,
      0
    ],
    [
      0,
      0,
      0,
      1,
      1
    ],
    [
      0,
      0,
      0,
      1,
      2
    ]
  ],
  "symbols": [
    {
      "id": "bokajamba10-symbol-0",
      "label": "Prism Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 130,
        "5": 900
      }
    },
    {
      "id": "bokajamba10-symbol-1",
      "label": "Ivory Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 134,
        "5": 940
      }
    },
    {
      "id": "bokajamba10-symbol-2",
      "label": "Ruby Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 138,
        "5": 980
      }
    },
    {
      "id": "bokajamba10-symbol-3",
      "label": "Copper Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 142,
        "5": 1020
      }
    },
    {
      "id": "bokajamba10-symbol-4",
      "label": "Citrus Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 146,
        "5": 1060
      }
    },
    {
      "id": "bokajamba10-symbol-5",
      "label": "Orchard Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 37,
        "4": 150,
        "5": 1100
      }
    },
    {
      "id": "bokajamba10-symbol-6",
      "label": "Velvet Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 39,
        "4": 154,
        "5": 1140
      }
    },
    {
      "id": "bokajamba10-symbol-7",
      "label": "Amber Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 41,
        "4": 158,
        "5": 1180
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 10 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3952",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/junglesistersdeluxe.mjs
var junglesistersdeluxe_default = {
  "id": "ind74_junglesistersdeluxe",
  "title": "Jungle Sisters Deluxe \u2014 Independent",
  "catalogName": "Jungle Sisters Deluxe",
  "sourceCategory": "Slots",
  "mathVersion": "independent-junglesistersdeluxe-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Cobalt Lanterns 64",
    "colors": [
      "#e59f41",
      "#bf9f05",
      "#87b5ae"
    ]
  },
  "limits": {
    "minBetMinor": "25",
    "maxBetMinor": "100000",
    "betStepMinor": "25",
    "maxWinMinor": "107600000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/jungle-sisters-deluxe",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      0,
      1
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      0,
      0,
      0,
      1,
      0
    ],
    [
      0,
      0,
      0,
      1,
      1
    ],
    [
      0,
      0,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      2,
      0
    ],
    [
      0,
      0,
      0,
      2,
      1
    ],
    [
      0,
      0,
      0,
      2,
      2
    ],
    [
      0,
      0,
      1,
      0,
      0
    ],
    [
      0,
      0,
      1,
      0,
      1
    ],
    [
      0,
      0,
      1,
      0,
      2
    ],
    [
      0,
      0,
      1,
      1,
      0
    ],
    [
      0,
      0,
      1,
      1,
      1
    ],
    [
      0,
      0,
      1,
      1,
      2
    ],
    [
      0,
      0,
      1,
      2,
      0
    ],
    [
      0,
      0,
      1,
      2,
      1
    ],
    [
      0,
      0,
      1,
      2,
      2
    ],
    [
      0,
      0,
      2,
      0,
      0
    ],
    [
      0,
      0,
      2,
      0,
      1
    ],
    [
      0,
      0,
      2,
      0,
      2
    ]
  ],
  "symbols": [
    {
      "id": "junglesistersdeluxe-symbol-0",
      "label": "Ivory Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 137,
        "5": 796
      }
    },
    {
      "id": "junglesistersdeluxe-symbol-1",
      "label": "Ruby Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 141,
        "5": 836
      }
    },
    {
      "id": "junglesistersdeluxe-symbol-2",
      "label": "Copper Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 145,
        "5": 876
      }
    },
    {
      "id": "junglesistersdeluxe-symbol-3",
      "label": "Citrus Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 149,
        "5": 916
      }
    },
    {
      "id": "junglesistersdeluxe-symbol-4",
      "label": "Orchard Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 153,
        "5": 956
      }
    },
    {
      "id": "junglesistersdeluxe-symbol-5",
      "label": "Velvet Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 38,
        "4": 157,
        "5": 996
      }
    },
    {
      "id": "junglesistersdeluxe-symbol-6",
      "label": "Amber Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 40,
        "4": 161,
        "5": 1036
      }
    },
    {
      "id": "junglesistersdeluxe-symbol-7",
      "label": "Prism Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 42,
        "4": 165,
        "5": 1076
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 25 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3953",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/dragonscode.mjs
var dragonscode_default = {
  "id": "ind74_dragonscode",
  "title": "Dragon's Code \u2014 Independent",
  "catalogName": "Dragon's Code",
  "sourceCategory": "Slots",
  "mathVersion": "independent-dragonscode-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Jade Orchard 65",
    "colors": [
      "#342ce5",
      "#39519c",
      "#4cb77d"
    ]
  },
  "limits": {
    "minBetMinor": "5",
    "maxBetMinor": "100000",
    "betStepMinor": "5",
    "maxWinMinor": "142000000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/dragons-code",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ]
  ],
  "symbols": [
    {
      "id": "dragonscode-symbol-0",
      "label": "Ruby Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 21,
        "4": 144,
        "5": 1140
      }
    },
    {
      "id": "dragonscode-symbol-1",
      "label": "Copper Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 23,
        "4": 148,
        "5": 1180
      }
    },
    {
      "id": "dragonscode-symbol-2",
      "label": "Citrus Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 25,
        "4": 152,
        "5": 1220
      }
    },
    {
      "id": "dragonscode-symbol-3",
      "label": "Orchard Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 156,
        "5": 1260
      }
    },
    {
      "id": "dragonscode-symbol-4",
      "label": "Velvet Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 160,
        "5": 1300
      }
    },
    {
      "id": "dragonscode-symbol-5",
      "label": "Amber Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 164,
        "5": 1340
      }
    },
    {
      "id": "dragonscode-symbol-6",
      "label": "Prism Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 168,
        "5": 1380
      }
    },
    {
      "id": "dragonscode-symbol-7",
      "label": "Ivory Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 172,
        "5": 1420
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 5 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3954",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/draculasfortune.mjs
var draculasfortune_default = {
  "id": "ind74_draculasfortune",
  "title": "Dracula's Fortune \u2014 Independent",
  "catalogName": "Dracula's Fortune",
  "sourceCategory": "Slots",
  "mathVersion": "independent-draculasfortune-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Ember Spire 66",
    "colors": [
      "#f9fcfa",
      "#e66567",
      "#13da8d"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "160300000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/draculas-fortune-2",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      0,
      1
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      0,
      0,
      0,
      1,
      0
    ],
    [
      0,
      0,
      0,
      1,
      1
    ],
    [
      0,
      0,
      0,
      1,
      2
    ]
  ],
  "symbols": [
    {
      "id": "draculasfortune-symbol-0",
      "label": "Copper Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 22,
        "4": 110,
        "5": 1323
      }
    },
    {
      "id": "draculasfortune-symbol-1",
      "label": "Citrus Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 24,
        "4": 114,
        "5": 1363
      }
    },
    {
      "id": "draculasfortune-symbol-2",
      "label": "Orchard Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 26,
        "4": 118,
        "5": 1403
      }
    },
    {
      "id": "draculasfortune-symbol-3",
      "label": "Velvet Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 122,
        "5": 1443
      }
    },
    {
      "id": "draculasfortune-symbol-4",
      "label": "Amber Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 126,
        "5": 1483
      }
    },
    {
      "id": "draculasfortune-symbol-5",
      "label": "Prism Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 130,
        "5": 1523
      }
    },
    {
      "id": "draculasfortune-symbol-6",
      "label": "Ivory Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 134,
        "5": 1563
      }
    },
    {
      "id": "draculasfortune-symbol-7",
      "label": "Ruby Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 138,
        "5": 1603
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 10 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3955",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/bookoffuturia.mjs
var bookoffuturia_default = {
  "id": "ind74_bookoffuturia",
  "title": "Book of Futuria \u2014 Independent",
  "catalogName": "Book of Futuria",
  "sourceCategory": "Slots",
  "mathVersion": "independent-bookoffuturia-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Aurora Garden 67",
    "colors": [
      "#301195",
      "#2a99ec",
      "#68f12b"
    ]
  },
  "limits": {
    "minBetMinor": "20",
    "maxBetMinor": "100000",
    "betStepMinor": "20",
    "maxWinMinor": "149900000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/book-of-futuria",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      0,
      1
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      0,
      0,
      0,
      1,
      0
    ],
    [
      0,
      0,
      0,
      1,
      1
    ],
    [
      0,
      0,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      2,
      0
    ],
    [
      0,
      0,
      0,
      2,
      1
    ],
    [
      0,
      0,
      0,
      2,
      2
    ],
    [
      0,
      0,
      1,
      0,
      0
    ],
    [
      0,
      0,
      1,
      0,
      1
    ],
    [
      0,
      0,
      1,
      0,
      2
    ],
    [
      0,
      0,
      1,
      1,
      0
    ],
    [
      0,
      0,
      1,
      1,
      1
    ],
    [
      0,
      0,
      1,
      1,
      2
    ],
    [
      0,
      0,
      1,
      2,
      0
    ]
  ],
  "symbols": [
    {
      "id": "bookoffuturia-symbol-0",
      "label": "Citrus Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 23,
        "4": 117,
        "5": 1219
      }
    },
    {
      "id": "bookoffuturia-symbol-1",
      "label": "Orchard Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 25,
        "4": 121,
        "5": 1259
      }
    },
    {
      "id": "bookoffuturia-symbol-2",
      "label": "Velvet Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 125,
        "5": 1299
      }
    },
    {
      "id": "bookoffuturia-symbol-3",
      "label": "Amber Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 129,
        "5": 1339
      }
    },
    {
      "id": "bookoffuturia-symbol-4",
      "label": "Prism Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 133,
        "5": 1379
      }
    },
    {
      "id": "bookoffuturia-symbol-5",
      "label": "Ivory Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 137,
        "5": 1419
      }
    },
    {
      "id": "bookoffuturia-symbol-6",
      "label": "Ruby Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 141,
        "5": 1459
      }
    },
    {
      "id": "bookoffuturia-symbol-7",
      "label": "Copper Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 37,
        "4": 145,
        "5": 1499
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 20 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3956",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/bookofbonanza.mjs
var bookofbonanza_default = {
  "id": "ind74_bookofbonanza",
  "title": "Book of Bonanza \u2014 Independent",
  "catalogName": "Book of Bonanza",
  "sourceCategory": "Slots",
  "mathVersion": "independent-bookofbonanza-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Copper Voyage 68",
    "colors": [
      "#0a2ff5",
      "#201c4e",
      "#d5c74c"
    ]
  },
  "limits": {
    "minBetMinor": "25",
    "maxBetMinor": "100000",
    "betStepMinor": "25",
    "maxWinMinor": "139500000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/book-of-bonanza",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      0,
      1
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      0,
      0,
      0,
      1,
      0
    ],
    [
      0,
      0,
      0,
      1,
      1
    ],
    [
      0,
      0,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      2,
      0
    ],
    [
      0,
      0,
      0,
      2,
      1
    ],
    [
      0,
      0,
      0,
      2,
      2
    ],
    [
      0,
      0,
      1,
      0,
      0
    ],
    [
      0,
      0,
      1,
      0,
      1
    ],
    [
      0,
      0,
      1,
      0,
      2
    ],
    [
      0,
      0,
      1,
      1,
      0
    ],
    [
      0,
      0,
      1,
      1,
      1
    ],
    [
      0,
      0,
      1,
      1,
      2
    ],
    [
      0,
      0,
      1,
      2,
      0
    ],
    [
      0,
      0,
      1,
      2,
      1
    ],
    [
      0,
      0,
      1,
      2,
      2
    ],
    [
      0,
      0,
      2,
      0,
      0
    ],
    [
      0,
      0,
      2,
      0,
      1
    ],
    [
      0,
      0,
      2,
      0,
      2
    ]
  ],
  "symbols": [
    {
      "id": "bookofbonanza-symbol-0",
      "label": "Orchard Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 24,
        "4": 124,
        "5": 1115
      }
    },
    {
      "id": "bookofbonanza-symbol-1",
      "label": "Velvet Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 26,
        "4": 128,
        "5": 1155
      }
    },
    {
      "id": "bookofbonanza-symbol-2",
      "label": "Amber Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 132,
        "5": 1195
      }
    },
    {
      "id": "bookofbonanza-symbol-3",
      "label": "Prism Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 136,
        "5": 1235
      }
    },
    {
      "id": "bookofbonanza-symbol-4",
      "label": "Ivory Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 140,
        "5": 1275
      }
    },
    {
      "id": "bookofbonanza-symbol-5",
      "label": "Ruby Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 144,
        "5": 1315
      }
    },
    {
      "id": "bookofbonanza-symbol-6",
      "label": "Copper Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 148,
        "5": 1355
      }
    },
    {
      "id": "bookofbonanza-symbol-7",
      "label": "Citrus Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 38,
        "4": 152,
        "5": 1395
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 25 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3957",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/sugarfiesta.mjs
var sugarfiesta_default = {
  "id": "ind74_sugarfiesta",
  "title": "Sugar Fiesta \u2014 Independent",
  "catalogName": "Sugar Fiesta",
  "sourceCategory": "Slots",
  "mathVersion": "independent-sugarfiesta-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Lunar Arcade 69",
    "colors": [
      "#b14bab",
      "#9ab00f",
      "#ef3b91"
    ]
  },
  "limits": {
    "minBetMinor": "5",
    "maxBetMinor": "100000",
    "betStepMinor": "5",
    "maxWinMinor": "129100000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/sugar-fiesta",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ]
  ],
  "symbols": [
    {
      "id": "sugarfiesta-symbol-0",
      "label": "Velvet Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 25,
        "4": 131,
        "5": 1011
      }
    },
    {
      "id": "sugarfiesta-symbol-1",
      "label": "Amber Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 135,
        "5": 1051
      }
    },
    {
      "id": "sugarfiesta-symbol-2",
      "label": "Prism Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 139,
        "5": 1091
      }
    },
    {
      "id": "sugarfiesta-symbol-3",
      "label": "Ivory Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 143,
        "5": 1131
      }
    },
    {
      "id": "sugarfiesta-symbol-4",
      "label": "Ruby Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 147,
        "5": 1171
      }
    },
    {
      "id": "sugarfiesta-symbol-5",
      "label": "Copper Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 151,
        "5": 1211
      }
    },
    {
      "id": "sugarfiesta-symbol-6",
      "label": "Citrus Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 37,
        "4": 155,
        "5": 1251
      }
    },
    {
      "id": "sugarfiesta-symbol-7",
      "label": "Orchard Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 39,
        "4": 159,
        "5": 1291
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 5 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3958",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/vampires.mjs
var vampires_default = {
  "id": "ind74_vampires",
  "title": "Vampires \u2014 Independent",
  "catalogName": "Vampires",
  "sourceCategory": "Slots",
  "mathVersion": "independent-vampires-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Cobalt Lanterns 70",
    "colors": [
      "#d7bf81",
      "#81fa21",
      "#8f875d"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "118700000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/vampires",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      0,
      1
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      0,
      0,
      0,
      1,
      0
    ],
    [
      0,
      0,
      0,
      1,
      1
    ],
    [
      0,
      0,
      0,
      1,
      2
    ]
  ],
  "symbols": [
    {
      "id": "vampires-symbol-0",
      "label": "Amber Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 26,
        "4": 138,
        "5": 907
      }
    },
    {
      "id": "vampires-symbol-1",
      "label": "Prism Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 142,
        "5": 947
      }
    },
    {
      "id": "vampires-symbol-2",
      "label": "Ivory Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 146,
        "5": 987
      }
    },
    {
      "id": "vampires-symbol-3",
      "label": "Ruby Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 150,
        "5": 1027
      }
    },
    {
      "id": "vampires-symbol-4",
      "label": "Copper Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 154,
        "5": 1067
      }
    },
    {
      "id": "vampires-symbol-5",
      "label": "Citrus Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 158,
        "5": 1107
      }
    },
    {
      "id": "vampires-symbol-6",
      "label": "Orchard Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 38,
        "4": 162,
        "5": 1147
      }
    },
    {
      "id": "vampires-symbol-7",
      "label": "Velvet Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 40,
        "4": 166,
        "5": 1187
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 10 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3959",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/blazinghot10.mjs
var blazinghot10_default = {
  "id": "ind74_blazinghot10",
  "title": "Burning Ice 10 \u2014 Independent",
  "catalogName": "Burning Ice 10",
  "sourceCategory": "Slots",
  "mathVersion": "independent-blazinghot10-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Jade Orchard 71",
    "colors": [
      "#ef635b",
      "#14a8ca",
      "#62bc6a"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "108300000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/blazing-hot-10",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      0,
      1
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      0,
      0,
      0,
      1,
      0
    ],
    [
      0,
      0,
      0,
      1,
      1
    ],
    [
      0,
      0,
      0,
      1,
      2
    ]
  ],
  "symbols": [
    {
      "id": "blazinghot10-symbol-0",
      "label": "Prism Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 145,
        "5": 803
      }
    },
    {
      "id": "blazinghot10-symbol-1",
      "label": "Ivory Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 149,
        "5": 843
      }
    },
    {
      "id": "blazinghot10-symbol-2",
      "label": "Ruby Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 153,
        "5": 883
      }
    },
    {
      "id": "blazinghot10-symbol-3",
      "label": "Copper Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 157,
        "5": 923
      }
    },
    {
      "id": "blazinghot10-symbol-4",
      "label": "Citrus Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 161,
        "5": 963
      }
    },
    {
      "id": "blazinghot10-symbol-5",
      "label": "Orchard Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 37,
        "4": 165,
        "5": 1003
      }
    },
    {
      "id": "blazinghot10-symbol-6",
      "label": "Velvet Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 39,
        "4": 169,
        "5": 1043
      }
    },
    {
      "id": "blazinghot10-symbol-7",
      "label": "Amber Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 41,
        "4": 173,
        "5": 1083
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 10 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3960",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/games/rollx.mjs
var rollx_default = {
  "id": "ind74_rollx",
  "title": "Roll X \u2014 Independent",
  "catalogName": "Roll X",
  "sourceCategory": "Instant Games",
  "mathVersion": "independent-rollx-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Ember Spire 72",
    "colors": [
      "#3d91ec",
      "#849aad",
      "#904291"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "960000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/rollx",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "dice",
  "model": "uniform-dice-v1",
  "returnBps": 9600,
  "minTarget": 10,
  "maxTarget": 90,
  "defaultTarget": 50,
  "rules": [
    "This original game draws one uniform integer from 0 through 99. Choose a target from 10 through 90 before Play.",
    "A roll below the target wins. The offered multiplier in basis points is floor(9600 times 100 divided by target).",
    "The total prize is floor(stake times offered basis points divided by 10000); other rolls lose."
  ],
  "paytable": [
    {
      "label": "Target 10",
      "target": 10,
      "multiplierBps": 96e3,
      "probabilityNumerator": "10",
      "probabilityDenominator": "100"
    },
    {
      "label": "Target 25",
      "target": 25,
      "multiplierBps": 38400,
      "probabilityNumerator": "25",
      "probabilityDenominator": "100"
    },
    {
      "label": "Target 50",
      "target": 50,
      "multiplierBps": 19200,
      "probabilityNumerator": "50",
      "probabilityDenominator": "100"
    },
    {
      "label": "Target 75",
      "target": 75,
      "multiplierBps": 12800,
      "probabilityNumerator": "75",
      "probabilityDenominator": "100"
    },
    {
      "label": "Target 90",
      "target": 90,
      "multiplierBps": 10666,
      "probabilityNumerator": "90",
      "probabilityDenominator": "100"
    }
  ],
  "nominalReturn": {
    "numerator": "96",
    "denominator": "100",
    "type": "upper-bound-before-floor",
    "proof": "Exactreturn=(target/100)\xD7floor(bet\xD7floor(960000/target)/10000)/bet;neverabove96%."
  }
};

// math/games/slicerx.mjs
var slicerx_default = {
  "id": "ind74_slicerx",
  "title": "Double X \u2014 Independent",
  "catalogName": "Double X",
  "sourceCategory": "Instant Games",
  "mathVersion": "independent-slicerx-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Aurora Garden 73",
    "colors": [
      "#2f650a",
      "#517b74",
      "#8e7dd1"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "5022000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/doublex",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "wheel",
  "model": "weighted-wheel-v1",
  "sectors": [
    {
      "id": "sector-0",
      "label": "Cloud",
      "weight": 40,
      "multiplierBps": 0
    },
    {
      "id": "sector-1",
      "label": "Mist",
      "weight": 25,
      "multiplierBps": 0
    },
    {
      "id": "sector-2",
      "label": "Rest",
      "weight": 15,
      "multiplierBps": 0
    },
    {
      "id": "sector-3",
      "label": "Spark",
      "weight": 10,
      "multiplierBps": 1e4
    },
    {
      "id": "sector-4",
      "label": "Pair",
      "weight": 5,
      "multiplierBps": 2e4
    },
    {
      "id": "sector-5",
      "label": "Glow",
      "weight": 3,
      "multiplierBps": 47200
    },
    {
      "id": "sector-6",
      "label": "Prism",
      "weight": 1,
      "multiplierBps": 107200
    },
    {
      "id": "sector-7",
      "label": "Crown",
      "weight": 1,
      "multiplierBps": 502200
    }
  ],
  "rules": [
    "This original eight-sector weighted wheel settles when Play is pressed.",
    "Each sector's probability is its published weight divided by 100. Its multiplier gives the total payout, including the stake.",
    "Zero sectors lose. Nonzero prizes round down to whole minor units."
  ],
  "paytable": [
    {
      "id": "sector-0",
      "label": "Cloud",
      "weight": 40,
      "multiplierBps": 0
    },
    {
      "id": "sector-1",
      "label": "Mist",
      "weight": 25,
      "multiplierBps": 0
    },
    {
      "id": "sector-2",
      "label": "Rest",
      "weight": 15,
      "multiplierBps": 0
    },
    {
      "id": "sector-3",
      "label": "Spark",
      "weight": 10,
      "multiplierBps": 1e4
    },
    {
      "id": "sector-4",
      "label": "Pair",
      "weight": 5,
      "multiplierBps": 2e4
    },
    {
      "id": "sector-5",
      "label": "Glow",
      "weight": 3,
      "multiplierBps": 47200
    },
    {
      "id": "sector-6",
      "label": "Prism",
      "weight": 1,
      "multiplierBps": 107200
    },
    {
      "id": "sector-7",
      "label": "Crown",
      "weight": 1,
      "multiplierBps": 502200
    }
  ],
  "nominalReturn": {
    "numerator": "951000",
    "denominator": "1000000",
    "type": "before-integer-floor",
    "proof": "Sum(weight\xD7multiplierBps)/(100\xD710000).Exactbet-dependentreturn uses flooredsectorpayouts."
  }
};

// math/games/samurai.mjs
var samurai_default = {
  "id": "ind74_samurai",
  "title": "Samurai \u2014 Independent",
  "catalogName": "Samurai",
  "sourceCategory": "Slots",
  "mathVersion": "independent-samurai-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Copper Voyage 74",
    "colors": [
      "#63707e",
      "#917442",
      "#852a20"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "143500000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/samurai-deluxe",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
    [
      1,
      1,
      1,
      1,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      2,
      2,
      2,
      2
    ],
    [
      0,
      1,
      2,
      1,
      0
    ],
    [
      2,
      1,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      0,
      1
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      0,
      0,
      0,
      1,
      0
    ],
    [
      0,
      0,
      0,
      1,
      1
    ],
    [
      0,
      0,
      0,
      1,
      2
    ]
  ],
  "symbols": [
    {
      "id": "samurai-symbol-0",
      "label": "Copper Comet",
      "glyph": "\u25C6",
      "weight": 1,
      "pays": {
        "3": 22,
        "4": 125,
        "5": 1155
      }
    },
    {
      "id": "samurai-symbol-1",
      "label": "Citrus Bell",
      "glyph": "\u2667",
      "weight": 1,
      "pays": {
        "3": 24,
        "4": 129,
        "5": 1195
      }
    },
    {
      "id": "samurai-symbol-2",
      "label": "Orchard Sun",
      "glyph": "\u2600",
      "weight": 1,
      "pays": {
        "3": 26,
        "4": 133,
        "5": 1235
      }
    },
    {
      "id": "samurai-symbol-3",
      "label": "Velvet Leaf",
      "glyph": "\u2767",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 137,
        "5": 1275
      }
    },
    {
      "id": "samurai-symbol-4",
      "label": "Amber Pearl",
      "glyph": "\u25CF",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 141,
        "5": 1315
      }
    },
    {
      "id": "samurai-symbol-5",
      "label": "Prism Star",
      "glyph": "\u2605",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 145,
        "5": 1355
      }
    },
    {
      "id": "samurai-symbol-6",
      "label": "Ivory Lantern",
      "glyph": "\u2727",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 149,
        "5": 1395
      }
    },
    {
      "id": "samurai-symbol-7",
      "label": "Ruby Crown",
      "glyph": "\u265B",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 153,
        "5": 1435
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 10 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3892",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// math/generated-registry.mjs
var generated_registry_default = [jetx_default, balloonx_default, plinkoxclassic_default, propelx_default, worldchampionx_default, poweroftiger_default, multifruitschargingwilds_default, gemscrownchargingwilds_default, gatesofmerlyn_default, chickenways_default, dicejungle_default, multihot5wild_default, cheesyroad_default, fortunecatch_default, cheesyroadclassic_default, multihot10_default, multihot40_default, coinsofatlantis_default, multihot100_default, multihotwildways_default, bottlemania_default, multihot5burnwilds_default, chickenhighway_default, multihot5deluxe_default, carx_default, caibalaocappadocia_default, multihotwheel_default, jinglebellbonanza_default, multihot5superwilds_default, balloon_default, plinkox_default, helicopterx_default, multihot5_default, safarisimba_default, mineisland_default, multihotways_default, footballx_default, foxyhot20_default, blazinghot40_default, mariachicoins_default, habeshafortune5_default, plinkojoker_default, cricketx_default, blazinghot_default, cricketerx_default, wheelofdestiny_default, wildmultistars_default, tugofwar_default, geniesbonanza_default, bonustime_default, farmsfortune_default, madslot_default, jetx3_default, smashx_default, towerx_default, hotsamba_default, wildsandgods_default, baoslot5x_default, junglesisters_default, bokajamba10_default, junglesistersdeluxe_default, dragonscode_default, draculasfortune_default, bookoffuturia_default, bookofbonanza_default, sugarfiesta_default, vampires_default, blazinghot10_default, rollx_default, slicerx_default, samurai_default];

// math/index.mjs
var definitions = [mineIslandDefinition, popx_default, multihot20_default, ...generated_registry_default];
function listGameDefinitions() {
  return structuredClone(definitions);
}

// scope/requested74.json
var requested74_default = {
  source: "Latest explicit user brief; supersedes the earlier public-catalog scope.",
  totalEntries: 74,
  protectedEntries: 2,
  requestedNewEntries: 72,
  useExistingWorker: "superwin-player",
  useExistingBackendOnly: true,
  newInfrastructureCreationAllowed: false,
  testPolicy: "Use isolated test points first; no player funds until actual ledger integration is verified.",
  exactOfficialDemoFidelityVerified: false,
  notes: [
    "The requested list differs from the official catalog collected earlier. Title matches are not proof of complete implementation.",
    "The requested Lobby is navigation rather than a wager engine.",
    "No automatic deletion of protected or legacy game code is performed."
  ],
  entries: [
    {
      number: 1,
      name: "MultiHot 5",
      protected: true,
      disposition: "preserve-existing-code-and-route",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: null,
      requestedLimitsImplementedAndTested: false
    },
    {
      number: 2,
      name: "Foxy Hot 20",
      protected: true,
      disposition: "preserve-existing-code-and-route",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: null,
      requestedLimitsImplementedAndTested: false
    },
    {
      number: 3,
      name: "Multi Hot 100",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: "ind74_multihot100",
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_multihot100",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 4,
      name: "Habesha Fortune 5",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: "ind74_habeshafortune5",
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_habeshafortune5",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 5,
      name: "Burning Ice 10",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: "ind74_blazinghot10",
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_burningice10",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 6,
      name: "Burning Ice 40",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: "ind74_blazinghot40",
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_burningice40",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 7,
      name: "Coin Miner",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_coinminer",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 8,
      name: "Tower Rush",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_towerrush",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 9,
      name: "Tower X",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: "ind74_towerx",
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_towerx",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 10,
      name: "PlinkoX",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: "ind74_plinkox",
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_plinkox",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 11,
      name: "JetX",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: "ind74_jetx",
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_jetx",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 12,
      name: "Balloon",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: "ind74_balloon",
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_balloon",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 13,
      name: "Multi Hot 40",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: "ind74_multihot40",
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_multihot40",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 14,
      name: "Multi Hot 20",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: "ind74_multihot20",
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_multihot20",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 15,
      name: "Safari Simba",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: "ind74_safarisimba",
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_safarisimba",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 16,
      name: "Foxy Hot 40",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_foxyhot40",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 17,
      name: "Magic Garden",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_magicgarden",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 18,
      name: "Magic Garden 10",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_magicgarden10",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 19,
      name: "Magic Garden 20",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_magicgarden20",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 20,
      name: "Magic Garden 40",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_magicgarden40",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 21,
      name: "Book of Magic",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_bookofmagic",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 22,
      name: "Captain Candy",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_captaincandy",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 23,
      name: "MoonStone",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_moonstone",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 24,
      name: "Samurai",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: "ind74_samurai",
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_samurai",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 25,
      name: "Burning Ice",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: "ind74_blazinghot",
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_burningice",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 26,
      name: "Burning Ice 30",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_burningice30",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 27,
      name: "Burning Ice 50",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_burningice50",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 28,
      name: "Vegas Hot 40",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_vegashot40",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 29,
      name: "Vegas Hot 81",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_vegashot81",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 30,
      name: "Vegas Hot 20",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_vegashot20",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 31,
      name: "Vegas Hot 10",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_vegashot10",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 32,
      name: "Crazy Hunt",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_crazyhunt",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 33,
      name: "Football X",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: "ind74_footballx",
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_footballx",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 34,
      name: "Cricket X",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: "ind74_cricketx",
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_cricketx",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 35,
      name: "JetX3",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: "ind74_jetx3",
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_jetx3",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 36,
      name: "Armada",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_armada",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 37,
      name: "Burning Ice 2",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_burningice2",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 38,
      name: "SpinX",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_spinx",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 39,
      name: "Luck Racing",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_luckracing",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 40,
      name: "Lucky Drink",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_luckydrink",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 41,
      name: "Lucky Drink in Egypt",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_luckydrinkinegypt",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 42,
      name: "Burning Ice Deluxe",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_burningicedeluxe",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 43,
      name: "Jasmine",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_jasmine",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 44,
      name: "Dark Honesty",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_darkhonesty",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 45,
      name: "Burning Ice 40 Deluxe",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_burningice40deluxe",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 46,
      name: "Mines",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_mines",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 47,
      name: "Tower",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_tower",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 48,
      name: "Keno",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_keno",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 49,
      name: "Baccarat",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_baccarat",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 50,
      name: "Blackjack",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_blackjack",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 51,
      name: "European Roulette",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_europeanroulette",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 52,
      name: "American Roulette",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_americanroulette",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 53,
      name: "Classic Roulette",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_classicroulette",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 54,
      name: "VIP Roulette",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_viproulette",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 55,
      name: "Sic Bo",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_sicbo",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 56,
      name: "Hot Fruits",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_hotfruits",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 57,
      name: "Fruits and Stars",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_fruitsandstars",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 58,
      name: "Star Cash",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_starcash",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 59,
      name: "Juicy Fruits",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_juicyfruits",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 60,
      name: "Mega Burning Wins",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_megaburningwins",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 61,
      name: "Super Seven",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_superseven",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 62,
      name: "Diamond 777",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_diamond777",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 63,
      name: "Wild Fruits",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_wildfruits",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 64,
      name: "Triple Seven",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_tripleseven",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 65,
      name: "Lucky Seven",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_luckyseven",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 66,
      name: "Golden Clover",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_goldenclover",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 67,
      name: "Book of Win",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_bookofwin",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 68,
      name: "Clover Party",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_cloverparty",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 69,
      name: "Mega Joker",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_megajoker",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 70,
      name: "Sunny Farm",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_sunnyfarm",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 71,
      name: "Crazy Time Casino Series",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_crazytimecasinoseries",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 72,
      name: "Turbo Plinko",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_turboplinko",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 73,
      name: "Speed Crash",
      protected: false,
      disposition: "independent-test-point-model; full-provider-client-and-real-wallet-unverified",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: true,
      requestedPrototypeModelId: "ind74_speedcrash",
      independentTestPointsBrowserVerified: true,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    },
    {
      number: 74,
      name: "SmartSoft Special Edition Lobby",
      protected: false,
      disposition: "navigation-only-test-lobby",
      authoredModelId: null,
      providerEquivalenceVerified: false,
      productionWalletVerified: false,
      deployed: false,
      requestedBetLimits: {
        currency: "ETB",
        minMinor: "100",
        maxMinor: null,
        testPresetsMinor: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "1000",
          "1100",
          "1200",
          "1300",
          "1400",
          "1500",
          "1600",
          "1700",
          "1800",
          "1900",
          "2000"
        ],
        policy: "server-game-policy-and-retained-account-house-reserve"
      },
      requestedLimitsImplementedAndTested: false,
      requestedPrototypeModelId: "ind74_smartsoftspecialeditionlobby",
      independentTestPointsBrowserVerified: false,
      testBenchDeployed: true,
      officialVisualAudioAndRuleParityVerified: false
    }
  ]
};

// math/engines/table-games.mjs
var validateNumber = (n, min, max) => {
  if (!Number.isInteger(n) || n < min || n > max) error("INVALID_OPTIONS", "Number is outside the published range.");
  return n;
};
function kenoMultiplier(count) {
  validateNumber(count, 1, 5);
  return Number(9500n * choose(40, count) / choose(10, count));
}

// math/requested72.mjs
var normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
var hash = (s) => [...s].reduce((n, c) => (Math.imul(n, 16777619) ^ c.charCodeAt(0)) >>> 0, 2166136261);
var source = listGameDefinitions();
var base = (family2) => structuredClone(source.find((g) => g.family === family2 && (family2 !== "ladder" || Array.isArray(g.multipliersBps))));
var tables = /* @__PURE__ */ new Set(["roulette", "baccarat", "blackjack", "sicbo", "keno"]);
function family(name) {
  if (name === "Speed Crash") return "target-crash";
  if (/Lobby$/.test(name)) return "lobby";
  if (/Roulette/.test(name)) return "roulette";
  if (name === "Baccarat") return "baccarat";
  if (name === "Blackjack") return "blackjack";
  if (name === "Sic Bo") return "sicbo";
  if (name === "Keno") return "keno";
  if (/Coin Miner|^Mines$/.test(name)) return "mines";
  if (/Tower/.test(name)) return "ladder";
  if (/Plinko/i.test(name)) return "plinko";
  if (/Crazy Time/.test(name)) return "wheel";
  if (/JetX|Crash|Football X|Cricket X|SpinX|Armada|Racing/i.test(name)) return "crash";
  if (name === "Balloon") return "ladder";
  return "slots";
}
var TABLE_RULES = {
  roulette: ["A uniformly sampled pocket resolves one published bet. Straight pays 36\xD7 total, even-money bets 2\xD7, dozen/column bets 3\xD7. Zero and double zero lose even-money bets."],
  baccarat: ["Fresh eight-deck shoe each round; standard third-card tableau. Player pays 2\xD7 total, Banker 1.95\xD7 including 5% commission on profit, Tie 9\xD7. Player/Banker bets push on a tie."],
  blackjack: ["Fresh six-deck shoe each round; dealer stands on soft 17. Hit or Stand only; no split, double or insurance. Natural blackjack pays 2.5\xD7 total, ordinary wins 2\xD7, pushes 1\xD7."],
  sicbo: ["Three independent six-sided dice. Small 4\u201310 and Big 11\u201317 exclude triples and pay 2\xD7 total. Any triple pays 31\xD7; a selected triple 181\xD7; a selected face pays 2\xD7/3\xD7/4\xD7 for one/two/three occurrences."],
  keno: ["Select 1\u20135 distinct numbers from 1\u201340. Ten numbers are drawn without replacement. This original jackpot-only variant pays only if all selected numbers appear. Multiplier basis points floor(9500 \xD7 C(40,n)/C(10,n))."]
};
function definition(entry) {
  const name = entry.name, id = "ind74_" + normalize(name), f = family(name);
  if (f === "lobby") return { id, title: name, catalogName: name, family: f, mathVersion: "requested-lobby-r1", implementationStatus: "navigation-only", rules: ["Navigation only; no bets or wallet mutations."], paytable: [] };
  const matched = source.find((g) => normalize(g.catalogName) === normalize(name) || g.id === id);
  const d = matched && matched.family === f ? structuredClone(matched) : tables.has(f) || f === "target-crash" ? {} : base(f);
  Object.assign(d, { id, title: name + " \u2014 Independent", catalogName: name, family: f, mathVersion: "requested72-" + normalize(name) + "-r1", implementationStatus: "independent-math-prototype; client-and-live-ledger-unverified" });
  d.theme = { name: name + " original edition", colors: ["#102432", "#" + (hash(name) & 16777215).toString(16).padStart(6, "0"), "#f5cd79"] };
  d.provenance = { requestedBy: "Latest user list", officialDemoFullyVerified: false, designed: "Original independent rules, probabilities and artwork parameters; no certified provider equivalence is claimed." };
  d.limits = { minBetMinor: "100", maxBetMinor: "0", betStepMinor: "100", maxWinMinor: "0" };
  if (f === "slots") {
    const count = Number(/(?:^|\s)(10|20|30|40|50|81|100)$/.exec(name)?.[1] ?? 20);
    const rows = name === "Multi Hot 100" ? 4 : 3;
    d.rows = rows;
    const lines = Array.from({ length: rows }, (_, r) => Array(5).fill(r));
    for (let i = 0; lines.length < count; i++) {
      let n = i;
      const line = Array.from({ length: 5 }, () => {
        const r = n % rows;
        n = Math.floor(n / rows);
        return r;
      });
      if (!lines.some((x) => x.every((r, k) => r === line[k]))) lines.push(line);
    }
    d.paylines = lines;
    d.proratedStake = true;
    d.symbols = d.symbols.map((s, i) => {
      const shift = hash(name + ":" + i) % 7 - 3;
      return { ...s, id: normalize(name) + "-" + i, label: name + " symbol " + (i + 1), pays: { 3: s.pays[3] + shift, 4: s.pays[4] - 2 * shift, 5: s.pays[5] - 42 * shift } };
    });
    if (name === "Multi Hot 100") {
      d.mathVersion = "requested72-multihot100-r2";
      d.multiplierValues = [1, 2, 3, 4, 5];
      d.symbols = [["seven", "Seven", "7", 20, 200, 500], ["bell", "Bell", "\u{1F514}", 15, 100, 200], ["grape", "Grapes", "\u{1F347}", 10, 50, 100], ["watermelon", "Watermelon", "\u{1F349}", 10, 50, 100], ["lemon", "Lemon", "\u{1F34B}", 5, 10, 50], ["plum", "Plum", "\u{1F7E3}", 5, 10, 50], ["orange", "Orange", "\u{1F34A}", 5, 10, 50], ["cherry", "Cherry", "\u{1F352}", 5, 10, 50]].map(([id2, label, glyph, a, b, c]) => ({ id: "multihot100-" + id2, label, glyph, weight: 1, pays: { 3: a, 4: b, 5: c } }));
      d.provenance.observed = "2026-11-11: official live demo SPIN, 5\xD74 grid, 1\u21922 DMO help paytable, multiplier 1\u20135, controls and help text observed. Displayed provider RTP 96.66% is not the independent model RTP.";
    }
    d.rules = ["Original five-reel, " + rows + "-row slot with " + count + " independently configured paylines and eight equally likely symbols.", "Only the longest left-to-right match of 3, 4 or 5 identical symbols pays on each line.", "Each line payout floors(stake \xD7 symbol prize / number of lines); line payouts add. Fractional line stakes never create fractional wallet money.", "No provider wilds, scatters or free-spin equivalence is asserted."];
    if (d.multiplierValues) d.rules.push("Symbol awards and the 1\xD7\u20135\xD7 multiplier labels follow the observed demo help. This independent model chooses each multiplier uniformly; provider reel strips, multiplier probabilities and the full payline chart remain unverified. X2 gamble is not implemented in this test edition.");
    d.paytable = d.symbols.map((s) => ({ label: s.label, ...s.pays }));
    d.nominalReturn = { ...calculateSlotReturn(d), rounding: "Before per-line minor-unit flooring; actual return depends on the stake." };
  } else if (name === "Coin Miner") {
    Object.assign(d, { cells: 25, rows: 5, cols: 5, mines: 1, maxPicks: 24, configurableMines: true, returnBps: 9400, roundMultiplierToBps: 100, mathVersion: "requested72-coinminer-risk-r2" });
    d.rules = ["Choose 1\u201324 mines before starting a round on the 5\xD75 board. Each remaining tile contains a coin.", "Reveal unused tiles, then collect after at least one safe reveal. A mine ends the round with zero return; revealing all safe tiles collects automatically.", "The independent base prize is 0.94 \xD7 C(25,k)/C(25\u2212mines,k), rounded to the nearest 0.01\xD7 before payout minor-unit flooring. Rounding changes actual return by stake and risk setting.", "Observed public demo at stake 2 EUR and one mine offers 1.96 EUR for the first safe reveal. The full provider prize table, RNG, TreasureBoost and audio have not been verified."];
    d.nominalReturn = { description: "Independently selected 94% before multiplier and money rounding; provider equivalence is not claimed." };
    d.provenance.publisher = "Gaming Corps";
    d.provenance.sourceUrl = "https://gamingcorps.com/game/coin-miner/";
    d.provenance.observed = "2026-11-11: publisher-linked play-for-fun demo, 5\xD75 board, one mine, 2 EUR stake, balance 1000\u2192998 and first safe-tile offer 1.96 observed.";
  } else if (f === "target-crash") {
    Object.assign(d, { minTargetBps: 10500, maxTargetBps: 1e8, defaultTargetBps: 2e4, returnBps: 9500, mathVersion: "requested72-speedcrash-target-r2" });
    d.rules = ["Set your target before the round, from 1.05\xD7 to 10,000\xD7. The accepted stake and target cannot change during the round.", "A successful round returns stake \xD7 selected target; a failed round returns zero. There is no manual in-flight Collect action.", "The independent model uses a uniform integer ticket from 0 to target basis points \u2212 1; tickets below 9,500 win. The theoretical return before integer minor-unit rounding is 95%.", "Target mechanics and limits follow the public publisher page. Provider RNG, graphics, audio and RTP equivalence have not been verified."];
    d.nominalReturn = { numerator: "95", denominator: "100", rounding: "Before payout minor-unit flooring." };
    d.paytable = [{ label: "Target reached", description: "Selected target \xD7 accepted stake" }, { label: "Target missed", multiplierBps: 0 }];
    d.provenance.publisher = "Hacksaw Gaming";
    d.provenance.sourceUrl = "https://www.hacksawgaming.com/games/speed-crash";
    d.provenance.observed = "Publisher page verified 2026-11-11; target 1.05\u201310000\xD7. Demo gameplay not yet verified.";
  } else if (tables.has(f)) {
    d.rules = TABLE_RULES[f];
    d.paytable = [];
    if (f === "roulette") {
      d.pockets = name === "American Roulette" ? 38 : 37;
      d.nominalReturn = { numerator: "36", denominator: String(d.pockets) };
      d.paytable = [{ label: "Straight", multiplierBps: 36e4 }, { label: "Even-money", multiplierBps: 2e4 }, { label: "Dozen/column", multiplierBps: 3e4 }];
    }
    if (f === "blackjack") {
      d.nominalReturn = { description: "Strategy dependent; this implementation has not been certified." };
      d.paytable = [{ label: "Natural", multiplierBps: 25e3 }, { label: "Win", multiplierBps: 2e4 }, { label: "Push", multiplierBps: 1e4 }];
    }
    if (f === "baccarat") {
      d.nominalReturn = { description: "Depends on selected bet; not certified for this implementation." };
      d.paytable = [{ label: "Player", multiplierBps: 2e4 }, { label: "Banker", multiplierBps: 19500 }, { label: "Tie", multiplierBps: 9e4 }];
    }
    if (f === "sicbo") {
      d.nominalReturn = { numerator: "210", denominator: "216", bet: "Small or Big" };
      d.paytable = [{ label: "Small/Big", multiplierBps: 2e4 }, { label: "Any triple", multiplierBps: 31e4 }, { label: "Selected triple", multiplierBps: 181e4 }];
    }
    if (f === "keno") {
      d.nominalReturn = { description: "At most 95%, before integer prize flooring." };
      d.paytable = Array.from({ length: 5 }, (_, i) => ({ label: "All " + (i + 1) + " selected numbers", multiplierBps: kenoMultiplier(i + 1) }));
    }
  }
  let bps = f === "target-crash" ? d.maxTargetBps : f === "slots" ? Math.max(...d.symbols.flatMap((s) => Object.values(s.pays))) * Math.max(...d.multiplierValues || [1]) * 1e4 : f === "crash" ? d.maxMultiplierBps : f === "ladder" ? d.multipliersBps.at(-1) : f === "mines" ? mineMultiplier(d, d.maxPicks) : f === "plinko" ? Math.max(...d.bucketMultipliersBps) : f === "wheel" ? Math.max(...d.sectors.map((s) => s.multiplierBps)) : f === "roulette" ? 36e4 : f === "blackjack" ? 25e3 : f === "baccarat" ? 9e4 : f === "sicbo" ? 181e4 : kenoMultiplier(5);
  if (d.configurableMines) bps = Math.max(...Array.from({ length: 24 }, (_, i) => mineMultiplier({ ...d, mines: i + 1 }, 24 - i)));
  d.maximumMultiplierBps = bps;
  const storageMax = 999999999999999n, prizeBound = storageMax * 10000n / BigInt(bps);
  d.limits.maxBetMinor = ((prizeBound < storageMax ? prizeBound : storageMax) / 100n * 100n).toString();
  d.limits.maxWinMinor = payout(d.limits.maxBetMinor, bps);
  d.limits.storageDerived = true;
  d.limits.policy = "server-game-policy-and-retained-account-house-reserve";
  d.limits.testPresetsMinor = Array.from({ length: 20 }, (_, i) => String((i + 1) * 100));
  return d;
}
var definitions2 = requested74_default.entries.filter((e) => !e.protected).map(definition);
var getGameDefinition = (id) => structuredClone(definitions2.find((d) => d.id === id) ?? null);

// math/fresh-plinkoxclassic.mjs
var bucketMultipliersBps = [1e7, 1e6, 2e5, 1e5, 4e4, 2e4, 2e3, 2e3, 2e3, 2e3, 2e3, 2e4, 4e4, 1e5, 2e5, 1e6, 1e7];
var maximumStakeMinor = (999999999999999n * 10000n / BigInt(Math.max(...bucketMultipliersBps)) / 100n * 100n).toString();
function choose2(n, k) {
  let a = 1;
  for (let i = 1; i <= k; i++) a = a * (n - i + 1) / i;
  return a;
}
var fresh_plinkoxclassic_default = {
  id: "ind74_fresh_plinkoxclassic",
  title: "Plinko X Classic \u2014 Independent pink-ball prototype",
  catalogName: "Plinko X Classic",
  sourceCategory: "Instant Games",
  family: "plinko",
  model: "observed-board-independent-pink-ball-v1",
  mathVersion: "fresh-plinkoxclassic-20261111-pink-v1",
  rows: 16,
  bucketMultipliersBps,
  observedPegboard: true,
  implementedBallMultiplier: 1,
  providerBallMultipliers: [1, 5, 10],
  completeProviderBallTypesImplemented: false,
  limits: { minBetMinor: "100", maxBetMinor: maximumStakeMinor, betStepMinor: "100", maxWinMinor: (BigInt(maximumStakeMinor) * BigInt(Math.max(...bucketMultipliersBps)) / 10000n).toString(), storageDerived: true },
  provenance: { catalog: "https://www.smartsoftgaming.com/games/plinko-x-classic", observed: "2026-11-11: official 16-row/17-bucket board; a pink ball at 50 DMO returned 100 DMO on 2x; balance 20000 \u2192 19950 \u2192 20050 DMO.", designed: "Fresh independent 1x pink-ball model. Each peg independently chooses left/right with equal probability; provider probabilities and 5x/10x ball selection are unknown. This is not the complete official game." },
  rules: ["The visible 16-row board and 17 bucket prizes follow the fresh official demo observation.", "Only the pink 1x ball is implemented. The official 5x/10x ball types and their probabilities are not implemented.", "This independent model takes 16 fair left/right turns. It is not a reproduction of the provider probability distribution.", "Payout equals stake times the visible bucket multiplier, floored to minor units."],
  nominalReturn: { numerator: "158963", denominator: "163840", description: "Independent fair-path pink-ball model only; not provider game RTP." },
  paytable: bucketMultipliersBps.map((multiplierBps, k) => ({ label: "Bucket " + k, multiplierBps, probabilityNumerator: String(choose2(16, k)), probabilityDenominator: "65536" }))
};

// math/official72-layouts.mjs
var publishedReelLayout = (rows, columns, source2, paylines) => Object.freeze({
  rows,
  columns,
  source: source2,
  paylines,
  evidence: `The official public page specifies ${columns} reels and ${rows} rows${paylines ? ` with ${paylines} fixed paylines` : ""}.`,
  limitations: Object.freeze(["The complete provider payline chart, symbol probabilities, bonus mechanics, artwork and certified RTP remain unverified."])
});
var OBSERVED_LAYOUTS = Object.freeze({
  ind74_official_multihotways: Object.freeze({
    rows: 3,
    columns: 3,
    ways: 27,
    multiplierPlacement: "left-reel",
    observedMultiplierValues: Object.freeze([1, 2, 3, 4, 5]),
    completeMultiplierLabelsVerified: true,
    source: "reports/current74-evidence-slots-remaining/ind74_official_multihotways-journal.json",
    evidence: "Twenty completed official DEMO result grids contain nine symbols and rendered positions show3\xD73. Exact MultiHotWays Help documents27 Reel Ways Pay and a left1x\u20135x multiplier.",
    limitations: Object.freeze(["Provider LinePlay1 is a betting field, not a payline count.", "Conditional same-symbol x2 and separate red/black X2 Gamble remain unimplemented.", "The provider award basis, symbol prizes and probabilities remain unverified; no Wild substitution is inferred from a different title."])
  }),
  ind74_official_multifruitschargingwilds: Object.freeze({
    rows: 3,
    columns: 3,
    paylines: 5,
    source: "reports/current74-evidence-slots-remaining/ind74_official_multifruitschargingwilds-journal.json",
    evidence: "Twenty completed official DEMO result grids contain nine symbols and rendered positions show3\xD73. Exact MultiFruitsChargingWilds Help specifies five fixed active paylines.",
    limitations: Object.freeze(["Persistent charging Wilds across paid spins and saved state per bet are documented but not implemented.", "The retained financial transaction must atomically save and restore that feature state.", "Provider line chart, prizes, probabilities, ante bet and feature purchase remain unverified or unimplemented."])
  }),
  ind74_official_gemscrownchargingwilds: Object.freeze({
    rows: 3,
    columns: 3,
    paylines: 5,
    source: "reports/current74-evidence-slots-remaining/ind74_official_gemscrownchargingwilds-journal.json",
    evidence: "Twenty completed official DEMO result grids contain nine symbols and rendered positions show3\xD73. Exact GemsCrownChargingWilds Help specifies five fixed active paylines.",
    limitations: Object.freeze(["Persistent charging Wilds across paid spins and saved state per bet are documented but not implemented.", "The retained financial transaction must atomically save and restore that feature state.", "Provider line chart, prizes, probabilities, ante bet and feature purchase remain unverified or unimplemented."])
  }),
  ind74_official_poweroftiger: Object.freeze({
    rows: 3,
    columns: 3,
    paylines: 5,
    multiplierPlacement: "top-arc",
    observedMultiplierValues: Object.freeze([20]),
    completeMultiplierLabelsVerified: false,
    source: "reports/current74-evidence-slots-remaining/ind74_official_poweroftiger-journal.json",
    evidence: "The official DEMO shows a3-by-3 grid and a top20X sign. Five completed returned public results contain9symbols each. The public page lists5active paylines.",
    limitations: Object.freeze(["The20X sign alone does not establish a feature trigger or probability. The conditional multiplier and respin structure come from the separate official public rules.", "The line chart, symbol prizes, probabilities, initial respin holds and base-plus-feature aggregation remain independent or unverified."])
  }),
  ind74_official_multihotwildways: Object.freeze({
    rows: 3,
    columns: 3,
    ways: 27,
    multiplierPlacement: "left-reel",
    observedMultiplierValues: Object.freeze([1, 2, 3, 4, 5]),
    completeMultiplierLabelsVerified: true,
    source: "reports/current74-evidence-slots-remaining/ind74_official_multihotwildways-journal.json",
    evidence: "The initial official DEMO screen shows3reels,3rows,27WAYS and a left multiplier reel. Twenty returned public result grids contain9symbols each; result factors1x,2x,3x,4x,5x were recorded.",
    limitations: Object.freeze(["Provider LinePlay1 is a betting field, not a payline count.", "The provider symbol-ID mapping, award basis, probabilities and full bonus behavior remain unverified.27-way allocation and awards are independently authored."])
  }),
  ind74_official_mineisland: Object.freeze({
    steps: 10,
    observedMultipliersBps: Object.freeze([11e3, 12e3, 15e3, 2e4, 3e4, 5e4, 1e5, 2e5, 5e5, 1e6]),
    source: "reports/current74-evidence-nonslots/ind74_official_mineisland-initial.png",
    evidence: "The official MineIsland demo shows ten ascending platforms from 1.1x to 100x, an ocean, kangaroo and TNT barrels. A first PLAY attempt was observed to lose and return to PLAY.",
    limitations: Object.freeze(["The marketing page instead describes a rectangular tile/mines game; this conflict is unresolved.", "Original-demo continuation controls, provider survival probabilities, rare features, exact artwork and audio remain unverified."])
  }),
  ind74_official_mineisland2: Object.freeze({
    steps: 10,
    observedMultipliersBps: Object.freeze([11e3, 12e3, 15e3, 2e4, 3e4, 5e4, 1e5, 2e5, 5e5, 1e6]),
    source: "reports/current74-evidence/mineisland2-initial.png",
    evidence: "The official MineIsland2 EASY demo shows ten ascending platforms from 1.1x to 100x. PLAY resolves a first jump; a successful first step can COLLECT 1.10 DMO from a 1.00 DMO stake.",
    limitations: Object.freeze(["Medium and hard multipliers, boost/portal mechanics and survival probabilities remain independently authored or unverified."])
  }),
  ind74_official_dicejungle: Object.freeze({
    rows: 3,
    columns: 5,
    source: "https://www.smartsoftgaming.com/games/dice-jungle",
    evidence: "The official public page describes a 5x3 dice grid and a synchronized horizontal multiplier reel above it, with awards boosted by up to 5x.",
    limitations: Object.freeze(["The complete provider hold-and-spin rules, paytable, multiplier labels and probabilities remain unverified."])
  }),
  ind74_official_popx: Object.freeze({
    rows: 5,
    columns: 6,
    source: "https://www.smartsoftgaming.com/games/popx",
    evidence: "The official public page specifies a 6-by-5 grid, eleven symbols, and matches of eight or more identical symbols anywhere. The official screenshot confirms six columns and five rows.",
    limitations: Object.freeze(["Conditional board probabilities, cycle timing, multiplier schedule and 100x cap are independently authored.", "Shared multiplayer sessions and any provider bonus mechanics are not implemented."])
  }),
  ind74_official_multihot5deluxe: publishedReelLayout(3, 3, "https://www.smartsoftgaming.com/games/multi-hot-5-deluxe", 5),
  ind74_official_safarisimba: publishedReelLayout(3, 3, "https://www.smartsoftgaming.com/games/safari-simba-2", 5),
  ind74_official_habeshafortune5: publishedReelLayout(3, 3, "https://www.smartsoftgaming.com/games/habesha-fortune-5"),
  ind74_official_baoslot5x: publishedReelLayout(3, 3, "https://www.smartsoftgaming.com/games/bao-slot-5x"),
  ind74_official_multihot20: publishedReelLayout(3, 5, "https://www.smartsoftgaming.com/games/multi-hot-20"),
  ind74_official_multihot10: publishedReelLayout(3, 5, "https://www.smartsoftgaming.com/games/multi-hot-10-2", 10),
  ind74_official_multihot5superwilds: publishedReelLayout(3, 5, "https://www.smartsoftgaming.com/games/multi-hot-5-super-wilds", 5),
  ind74_official_burningice40: publishedReelLayout(3, 5, "https://www.smartsoftgaming.com/games/burning-ice-40", 40),
  ind74_official_burningice: publishedReelLayout(3, 5, "https://www.smartsoftgaming.com/games/burning-ice-41", 5),
  ind74_official_madslot: publishedReelLayout(3, 5, "https://www.smartsoftgaming.com/games/mad-slot", 20),
  ind74_official_multihot40: Object.freeze({
    rows: 4,
    columns: 5,
    paylines: 40,
    multiplierPlacement: "top-arc",
    observedMultiplierValues: Object.freeze([2, 4, 5]),
    completeMultiplierLabelsVerified: false,
    source: "https://www.smartsoftgaming.com/games/multi-hot-40; official demo browser observation on 2026-11-11",
    evidence: "Five columns and four visible rows; multiplier arc above the reels. Visible labels include 5x, 2x and 4x.",
    limitations: Object.freeze(["Full multiplier distribution and full label order are unverified.", "The complete provider payline chart and reel strips are unverified."])
  }),
  ind74_official_multihot100: Object.freeze({
    rows: 4,
    columns: 5,
    paylines: 100,
    multiplierPlacement: "left-reel",
    observedMultiplierValues: Object.freeze([1, 2, 3, 4, 5]),
    completeMultiplierLabelsVerified: true,
    source: "references/multihot100-observed-20261111.json",
    evidence: "Five columns and four rows. The observed help explicitly places the 1x\u20135x multiplier on the left side reel.",
    limitations: Object.freeze(["The provider multiplier probabilities and reel strips are unverified.", "The full provider payline chart is unverified. X2 uses independent fair colors and an explicitly independent three-attempt limit."])
  }),
  ind74_official_multihot5wild: Object.freeze({
    rows: 3,
    columns: 3,
    paylines: 5,
    multiplierPlacement: "left-reel",
    observedMultiplierValues: Object.freeze([1, 2, 3, 4, 5]),
    completeMultiplierLabelsVerified: true,
    source: "https://www.smartsoftgaming.com/games/multi-hot-5-wild",
    evidence: "The official public page specifies a 3-by-3 grid, five fixed paylines, wild substitution, three matching symbols and a left-side 1x\u20135x multiplier reel.",
    limitations: Object.freeze(["The observed own wild prize plus 5x permits a 500x independent base bound, while help advertises 375x; provider award restrictions are unverified.", "The provider payline chart and probabilities are unverified. X2 uses independently fair colors, a pre-spin hold control and an independent three-attempt limit."])
  }),
  ind74_official_multihot5burnwilds: Object.freeze({
    rows: 3,
    columns: 5,
    paylines: 5,
    multiplierPlacement: "independent-display",
    observedMultiplierValues: Object.freeze([1, 2, 3, 4, 5]),
    completeMultiplierLabelsVerified: true,
    source: "https://www.smartsoftgaming.com/games/multi-hot-5-burn-wilds",
    evidence: "The official public page specifies three rows, five reels and five paylines. Wilds appear on reels 2\u20134, substitute in left-to-right wins, and expand vertically when used by a winning combination. The total win receives a 1x\u20135x multiplier.",
    limitations: Object.freeze(["Full provider paytable, probabilities and repeated expansion order remain unverified.", "The independent model expands the wild columns used by initial winning lines, then evaluates again. X2 uses independently fair colors, a pre-spin hold control and an independent three-attempt limit."])
  }),
  ind74_official_plinkoxclassic: Object.freeze({
    rows: 16,
    buckets: 17,
    source: "references/plinkoxclassic-observed-20261111.json",
    evidence: "Sixteen peg rows and seventeen buckets were observed in a completed official pink-ball demo round.",
    limitations: Object.freeze(["Marketing describes selectable stake factors; the observed demo instead presents a static pink/orange/fire 1x/5x/10x legend and a 10000x maximum.", "Server color selection, its 995/4/1 weights and fair paths are independent operator choices. Provider selection semantics and probabilities remain unverified."])
  })
});
function officialLayout(definition2) {
  const d = definition2, observed = OBSERVED_LAYOUTS[d.id];
  const common = {
    source: observed?.source ?? "Independently authored model configuration; no complete official layout observation",
    geometryVerified: Boolean(observed),
    geometryStatus: observed ? "observed-public-layout" : "independent-layout-unverified-against-reference",
    fullReferenceParityVerified: false,
    observedFacts: observed ? [observed.evidence] : [],
    limitations: observed ? [...observed.limitations] : ["Official geometry, visual behaviour, audio and complete game mechanics remain unverified."]
  };
  if (d.family === "slots") {
    const values = Array.isArray(d.baseGameMultiplier?.values) ? [...d.baseGameMultiplier.values] : Array.isArray(d.multiplierValues) ? [...d.multiplierValues] : [];
    return {
      ...common,
      kind: "reels",
      rows: d.rows,
      columns: d.cols ?? 5,
      paylines: d.ways ? null : d.paylines.length,
      paylinesVerified: false,
      ...d.ways ? { ways: d.ways, waysCountVerified: observed?.ways === d.ways } : {},
      paylineCountVerified: !d.ways && (observed?.paylines === d.paylines.length || Boolean(d.provenance?.paylineCountSource)),
      multiplier: {
        placement: observed?.multiplierPlacement ?? (values.length ? "independent-display" : "none"),
        observedValues: [...observed?.observedMultiplierValues ?? []],
        implementedValues: values,
        calculationImplemented: values.length > 0,
        ...d.baseGameMultiplier ? { condition: d.baseGameMultiplier.trigger } : {},
        completeLabelsVerified: observed?.completeMultiplierLabelsVerified === true,
        providerProbabilitiesVerified: false
      }
    };
  }
  if (d.family === "plinko") return {
    ...common,
    kind: "pegboard",
    rows: d.rows,
    buckets: d.bucketMultipliersBps.length,
    implementedBallMultipliers: [...d.ballMultipliers ?? [d.implementedBallMultiplier ?? 1]],
    ballMultiplierStakeMeaning: "one-stake-with-server-award-multiplier",
    completeBallMechanicsVerified: false
  };
  if (d.family === "ladder") return {
    ...common,
    kind: "ladder",
    steps: d.multipliersBps.length,
    stepCountVerified: observed?.steps === d.multipliersBps.length,
    observedDefaultMultipliersBps: [...observed?.observedMultipliersBps ?? []],
    modes: [...d.modes ?? ["easy"]],
    visualChoicesAffectProbabilities: false
  };
  if (d.family === "mines") return {
    ...common,
    kind: "mine-board",
    rows: d.rows,
    columns: d.cols,
    cells: d.cells,
    mines: d.mines,
    maximumSafePicks: d.maxPicks
  };
  if (d.family === "wheel") return { ...common, kind: "wheel", sectors: d.sectors.length };
  if (d.family === "dice") return {
    ...common,
    kind: "dice",
    outcomes: 100,
    minimumTarget: d.minTarget,
    maximumTarget: d.maxTarget
  };
  if (d.crashMechanic === "cascade") return {
    ...common,
    kind: "cascade",
    rows: d.rows,
    columns: d.cols,
    symbols: d.symbols.length,
    minimumMatchingSymbols: d.minMatch,
    maximumMultiplierBps: d.maxMultiplierBps,
    synchronizedMultiplayerVerified: false
  };
  if (d.family === "crash") return {
    ...common,
    kind: "crash",
    maximumMultiplierBps: d.maxMultiplierBps,
    synchronizedMultiplayerVerified: false
  };
  throw new Error("Unsupported official layout family: " + d.family);
}
function independentPaylines(columns, rows, count) {
  if (!Number.isSafeInteger(columns) || !Number.isSafeInteger(rows) || !Number.isSafeInteger(count) || columns < 1 || columns > 8 || rows < 1 || rows > 8 || count < rows || count > rows ** columns) {
    throw new Error("Invalid independent payline geometry.");
  }
  const lines = Array.from({ length: rows }, (_, row) => Array(columns).fill(row));
  const used = new Set(lines.map((line) => line.join(",")));
  for (let value = 0; lines.length < count; value++) {
    let n = value;
    const line = Array.from({ length: columns }, () => {
      const row = n % rows;
      n = Math.floor(n / rows);
      return row;
    });
    const key = line.join(",");
    if (!used.has(key)) {
      used.add(key);
      lines.push(line);
    }
  }
  return lines;
}

// math/official72-mechanics.mjs
function startThreeReelSlot(d, { betMinor, rng }) {
  if (d.cols !== 3 || d.symbols.length !== 8 || d.wildSymbol) error("INVALID_MODEL", "This operator engine requires three reels and eight regular symbols.");
  const round = baseRound(d, betMinor);
  const grid = Array.from({ length: d.rows }, () => Array.from({ length: 3 }, () => d.symbols[draw(rng, 8)].id));
  const lineWins = [];
  let total = 0n;
  for (const [lineIndex, line] of d.paylines.entries()) {
    const id = grid[line[0]][0];
    if (!line.every((row, col) => grid[row][col] === id)) continue;
    const prize = d.symbols.find((symbol) => symbol.id === id).pays[3];
    const win = BigInt(round.betMinor) * BigInt(prize) / BigInt(d.paylines.length);
    total += win;
    lineWins.push({ lineIndex, payline: [...line], symbolId: id, matches: 3, multiplier: prize, winMinor: win.toString(), positions: line.map((row, col) => ({ row, col })) });
  }
  const reelMultiplier = d.multiplierValues ? d.multiplierValues[draw(rng, d.multiplierValues.length)] : 1;
  total *= BigInt(reelMultiplier);
  for (const line of lineWins) line.winMinor = (BigInt(line.winMinor) * BigInt(reelMultiplier)).toString();
  if (total > BigInt(d.limits.maxWinMinor)) error("PAYOUT_LIMIT_EXCEEDED", "The configured three-reel award exceeds its accepted bound.");
  return {
    ...round,
    status: total === 0n ? "lost" : "collected",
    step: 1,
    winMinor: total.toString(),
    multiplierBps: Number(total * 10000n / BigInt(round.betMinor)),
    outcome: { kind: "slots", grid, lineWins, ...d.multiplierValues ? { reelMultiplier } : {} }
  };
}
function evaluatePublicWildGrid(d, betMinor, suppliedGrid) {
  const wild = d.wildSymbol.id;
  if (!Array.isArray(suppliedGrid) || suppliedGrid.length !== d.rows || suppliedGrid.some((row) => !Array.isArray(row) || row.length !== d.cols || row.some((id, col) => id === wild ? !d.wildRule.columns.includes(col) : !d.symbols.some((symbol) => symbol.id === id)))) {
    error("INVALID_GRID", "The grid must use the configured geometry and permitted wild columns.");
  }
  const grid = structuredClone(suppliedGrid);
  const lineWins = [];
  let total = 0n;
  for (let lineIndex = 0; lineIndex < d.paylines.length; lineIndex++) {
    const line = d.paylines[lineIndex];
    let best;
    for (const symbol of d.symbols) {
      let matches = 0;
      while (matches < d.cols && [symbol.id, wild].includes(grid[line[matches]][matches])) matches++;
      const prize = symbol.pays[matches];
      if (!Number.isSafeInteger(prize) || prize <= 0) continue;
      const win = BigInt(betMinor) * BigInt(prize) / BigInt(d.paylines.length);
      if (!best || win > best.win || win === best.win && prize > best.multiplier) {
        const positions = line.slice(0, matches).map((row, col) => ({ row, col }));
        best = {
          win,
          lineIndex,
          payline: [...line],
          symbolId: symbol.id,
          matches,
          multiplier: prize,
          winMinor: win.toString(),
          positions,
          wildPositions: positions.filter(({ row, col }) => grid[row][col] === wild)
        };
      }
    }
    if (d.wildSymbol.pays?.[d.cols] && line.every((row, col) => grid[row][col] === wild)) {
      const prize = d.wildSymbol.pays[d.cols], win = BigInt(betMinor) * BigInt(prize) / BigInt(d.paylines.length);
      if (!best || win > best.win || win === best.win && prize > best.multiplier) {
        const positions = line.map((row, col) => ({ row, col }));
        best = {
          win,
          lineIndex,
          payline: [...line],
          symbolId: wild,
          matches: d.cols,
          multiplier: prize,
          winMinor: win.toString(),
          positions,
          wildPositions: positions
        };
      }
    }
    if (best) {
      const { win, ...visible } = best;
      total += win;
      lineWins.push(visible);
    }
  }
  return { winMinor: total.toString(), lineWins };
}
function startPublicWildSlot(d, { betMinor, rng }) {
  const round = baseRound(d, betMinor);
  const regularCount = d.symbols.length, regularTickets = regularCount * 32;
  const originalGrid = Array.from({ length: d.rows }, () => Array.from({ length: d.cols }, (_, col) => {
    const eligible = d.wildRule.columns.includes(col);
    const ticket = draw(rng, eligible ? regularTickets + 1 : regularCount);
    return eligible && ticket === regularTickets ? d.wildSymbol.id : d.symbols[ticket % regularCount].id;
  }));
  let evaluated = evaluatePublicWildGrid(d, round.betMinor, originalGrid);
  const expandedColumns = d.wildRule.expandWhenWinning ? [...new Set(evaluated.lineWins.flatMap((line) => line.wildPositions.map((position) => position.col)))].sort((a, b) => a - b) : [];
  const grid = originalGrid.map((row) => row.map((id, col) => expandedColumns.includes(col) ? d.wildSymbol.id : id));
  if (expandedColumns.length) evaluated = evaluatePublicWildGrid(d, round.betMinor, grid);
  const reelMultiplier = d.multiplierValues[draw(rng, d.multiplierValues.length)];
  const winMinor = (BigInt(evaluated.winMinor) * BigInt(reelMultiplier)).toString();
  const lineWins = evaluated.lineWins.map((line) => ({
    ...line,
    winMinor: (BigInt(line.winMinor) * BigInt(reelMultiplier)).toString()
  }));
  if (BigInt(winMinor) > BigInt(d.limits.maxWinMinor)) error("PAYOUT_LIMIT_EXCEEDED", "The configured wild award exceeds its accepted bound.");
  return {
    ...round,
    status: winMinor === "0" ? "lost" : "collected",
    step: 1,
    winMinor,
    multiplierBps: Number(BigInt(winMinor) * 10000n / BigInt(round.betMinor)),
    outcome: { kind: "slots", grid, originalGrid, expandedColumns, lineWins, reelMultiplier }
  };
}
function holdSlotWin(d, round, holdWin) {
  if (!d.gamble?.enabled || !holdWin) return round;
  const baseWinMinor = round.winMinor;
  return {
    ...round,
    holdWin: true,
    baseWinMinor,
    gambleRounds: 0,
    gambleHistory: [],
    pendingWinMinor: baseWinMinor,
    winMinor: "0",
    status: baseWinMinor === "0" ? "lost" : "active"
  };
}
function gambleSlotWin(d, round, { color }, rng) {
  active(round);
  if (!d.gamble?.enabled || round.holdWin !== true || !d.gamble.choices.includes(color)) {
    error("INVALID_GAMBLE", "Choose red or black for the current held win.");
  }
  if (round.gambleRounds >= d.gamble.maxRounds || BigInt(round.pendingWinMinor) <= 0n) {
    error("GAMBLE_LIMIT", "This held win cannot be gambled again.");
  }
  const revealedColor = d.gamble.choices[draw(rng, d.gamble.choices.length)];
  const correct = color === revealedColor;
  const pendingWinMinor = correct ? (BigInt(round.pendingWinMinor) * 2n).toString() : "0";
  const gambleRounds = round.gambleRounds + 1;
  const gambleHistory = [...round.gambleHistory, {
    round: gambleRounds,
    color,
    revealedColor,
    correct,
    pendingBeforeMinor: round.pendingWinMinor,
    pendingAfterMinor: pendingWinMinor
  }];
  const next = {
    ...round,
    pendingWinMinor,
    gambleRounds,
    gambleHistory,
    multiplierBps: Number(BigInt(pendingWinMinor) * 10000n / BigInt(round.betMinor))
  };
  if (!correct) return { ...next, status: "lost", winMinor: "0" };
  return gambleRounds === d.gamble.maxRounds ? collectSlotWin(d, next) : next;
}
function collectSlotWin(d, round) {
  active(round);
  if (!d.gamble?.enabled || round.holdWin !== true || BigInt(round.pendingWinMinor) <= 0n) {
    error("INVALID_GAMBLE", "No held slot win is available.");
  }
  return { ...round, status: "collected", winMinor: round.pendingWinMinor, pendingWinMinor: "0" };
}
function validateHeldSlot(d, round, baseMaximumMinor) {
  if (round.holdWin !== true) {
    if (round.status === "active") error("INVALID_ROUND", "An active slot requires an accepted held win.");
    return;
  }
  const canonical2 = (value) => typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value);
  if (!d.gamble?.enabled || !canonical2(round.pendingWinMinor) || !canonical2(round.baseWinMinor) || BigInt(round.baseWinMinor) > BigInt(baseMaximumMinor) || !Number.isSafeInteger(round.gambleRounds) || round.gambleRounds < 0 || round.gambleRounds > d.gamble.maxRounds || !Array.isArray(round.gambleHistory) || round.gambleHistory.length !== round.gambleRounds) {
    error("INVALID_ROUND", "The stored held-win state is invalid.");
  }
  let pending = round.baseWinMinor;
  for (const [index, entry] of round.gambleHistory.entries()) {
    if (!entry || entry.round !== index + 1 || !d.gamble.choices.includes(entry.color) || !d.gamble.choices.includes(entry.revealedColor) || entry.correct !== (entry.color === entry.revealedColor) || entry.pendingBeforeMinor !== pending || pending === "0" || entry.pendingAfterMinor !== (entry.correct ? (BigInt(pending) * 2n).toString() : "0")) {
      error("INVALID_ROUND", "The stored gamble history is inconsistent.");
    }
    pending = entry.pendingAfterMinor;
  }
  if (round.status === "active") {
    if (pending === "0" || round.pendingWinMinor !== pending || round.gambleRounds >= d.gamble.maxRounds) {
      error("INVALID_ROUND", "The active held award is inconsistent.");
    }
  } else if (round.pendingWinMinor !== "0" || round.status === "collected" && (pending === "0" || round.winMinor !== pending) || round.status === "lost" && pending !== "0") error("INVALID_ROUND", "The settled held award is inconsistent.");
}
function publicHeldSlot(d, round) {
  const activeWin = round.status === "active" && round.holdWin === true;
  return {
    ...publicBase(round),
    outcome: structuredClone(round.outcome),
    holdWin: round.holdWin === true,
    pendingWinMinor: round.pendingWinMinor ?? "0",
    collectibleMinor: activeWin ? round.pendingWinMinor : "0",
    gambleRounds: round.gambleRounds ?? 0,
    maxGambleRounds: d.gamble.maxRounds,
    gambleHistory: structuredClone(round.gambleHistory ?? []),
    allowedActions: activeWin ? ["gamble", "collect"] : []
  };
}

// math/popx.mjs
var SCHEDULE = [11500, 14e3, 18e3, 24e3, 33e3, 47e3, 7e4, 11e4, 18e4, 3e5, 55e4, 1e6];
var ART = [
  ["cherry", "Cherry", "\u{1F352}"],
  ["grape", "Grape", "\u{1F347}"],
  ["lemon", "Lemon", "\u{1F34B}"],
  ["orange", "Orange", "\u{1F34A}"],
  ["melon", "Watermelon", "\u{1F349}"],
  ["kiwi", "Kiwi", "\u{1F95D}"],
  ["pineapple", "Pineapple", "\u{1F34D}"],
  ["bell", "Bell", "\u{1F514}"],
  ["clover", "Clover", "\u2618"],
  ["star", "Star", "\u2605"],
  ["diamond", "Diamond", "\u25C6"]
];
var copy = (value) => structuredClone(value);
var canonical = (value) => Array.isArray(value) ? value.map(canonical) : value !== null && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;
var equal = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
function configurePopxCascade(definition2) {
  const d = copy(definition2);
  if (d.id !== "ind74_official_popx") error("INVALID_MODEL", "This cascade definition belongs to the official PopX catalogue ID.");
  Object.assign(d, {
    family: "crash",
    crashMechanic: "cascade",
    mathVersion: "official72-popx-r3",
    model: "independent-single-player-cascade-crash-v1",
    rows: 5,
    cols: 6,
    minMatch: 8,
    cascadeMs: 1500,
    multipliersBps: [...SCHEDULE],
    maxSteps: SCHEDULE.length,
    maxMultiplierBps: SCHEDULE.at(-1),
    returnBps: 9600,
    symbols: ART.map(([id, label, glyph]) => ({ id: "popx_" + id, label, glyph })),
    cascadeRules: {
      source: "https://www.smartsoftgaming.com/games/popx",
      publicGridRuleVerified: true,
      sharedSessionImplemented: false,
      providerProbabilitiesVerified: false,
      providerTimingVerified: false,
      providerMultiplierScheduleVerified: false,
      operatorTimingMs: 1500,
      operatorMaximumMultiplierBps: SCHEDULE.at(-1)
    },
    nominalReturn: {
      numerator: "9600",
      denominator: "10000",
      description: "Independent survival schedule gives 96% expected return at each fixed successful-stage cashout before minor-unit rounding. This is not provider RTP."
    },
    rules: [
      "This independent board has six columns, five rows and eleven symbol types. A group of at least eight identical symbols anywhere is a match.",
      "All matching symbols are removed. Remaining symbols fall within their columns, and new symbols fill only the resulting holes.",
      "Each successful cascade raises the confirmed multiplier. The first board without a match crashes the round and pays zero.",
      "The first board resolves when the stake is accepted. Collecting a live round pays its latest confirmed multiplier; a collection at or after a crash pays zero.",
      "The independent operator schedule advances every 1500 milliseconds through 1.15, 1.4, 1.8, 2.4, 3.3, 4.7, 7, 11, 18, 30, 55 and 100 times the stake. Reaching 100 times automatically collects.",
      "The independent first survival probability is 9600/11500. Later survival probabilities are the previous multiplier divided by the next multiplier. Conditional board construction, timing and the 100-times cap are authored choices, not recovered provider probabilities.",
      "This implementation is a single-player round. The provider describes a shared session; shared multiplayer synchronization and any bonus features remain unverified and are not implemented here."
    ]
  });
  delete d.ticketCount;
  delete d.growthBpsPerSecond;
  return d;
}
function validateConfig(d) {
  if (d.crashMechanic !== "cascade" || d.rows !== 5 || d.cols !== 6 || d.minMatch !== 8 || !Array.isArray(d.symbols) || d.symbols.length !== 11 || new Set(d.symbols.map((s) => s.id)).size !== 11 || !Number.isSafeInteger(d.cascadeMs) || d.cascadeMs < 1 || !Array.isArray(d.multipliersBps) || d.multipliersBps.length !== 12 || d.multipliersBps.some((value, index) => !Number.isSafeInteger(value) || value <= (index ? d.multipliersBps[index - 1] : 1e4)) || d.maxMultiplierBps !== d.multipliersBps.at(-1) || !Number.isSafeInteger(d.returnBps) || d.returnBps <= 0 || d.returnBps > 1e4) {
    error("INVALID_MODEL", "Invalid independent PopX cascade configuration.");
  }
}
function evaluatePopxGrid(d, grid) {
  validateConfig(d);
  const ids2 = new Set(d.symbols.map((symbol) => symbol.id));
  if (!Array.isArray(grid) || grid.length !== d.rows || grid.some((row) => !Array.isArray(row) || row.length !== d.cols || row.some((id) => !ids2.has(id)))) {
    error("INVALID_GRID", "A PopX board must contain five rows of six configured symbols.");
  }
  const counts = new Map(d.symbols.map((symbol) => [symbol.id, 0]));
  for (const row of grid) for (const id of row) counts.set(id, counts.get(id) + 1);
  const matchedSymbols = [...counts].filter(([, count]) => count >= d.minMatch).map(([symbolId, count]) => ({ symbolId, count }));
  const matching = new Set(matchedSymbols.map((group) => group.symbolId));
  const matchedPositions = [];
  for (let row = 0; row < d.rows; row++) for (let col = 0; col < d.cols; col++) if (matching.has(grid[row][col])) matchedPositions.push({ row, col });
  return { matchedSymbols, matchedPositions, winning: matchedSymbols.length > 0 };
}
function losingFill(d, grid, rng, excluded = null) {
  const counts = new Map(d.symbols.map((symbol) => [symbol.id, 0]));
  for (const row of grid) for (const id of row) if (id !== null) counts.set(id, counts.get(id) + 1);
  for (let row = 0; row < d.rows; row++) for (let col = 0; col < d.cols; col++) if (grid[row][col] === null) {
    const eligible = d.symbols.map((symbol) => symbol.id).filter((id2) => id2 !== excluded && counts.get(id2) < d.minMatch - 1);
    if (!eligible.length) error("INVALID_MODEL", "The independent board cannot be filled within its count bound.");
    const id = eligible[draw(rng, eligible.length)];
    grid[row][col] = id;
    counts.set(id, counts.get(id) + 1);
  }
  return grid;
}
function initialGrid(d, winning, rng) {
  const grid = Array.from({ length: d.rows }, () => Array(d.cols).fill(null));
  if (!winning) return losingFill(d, grid, rng);
  const target = d.symbols[draw(rng, d.symbols.length)].id;
  const positions = Array.from({ length: d.rows * d.cols }, (_, index) => index);
  for (let i = positions.length - 1; i > 0; i--) {
    const j = draw(rng, i + 1);
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  const count = d.minMatch + draw(rng, 5);
  for (const position of positions.slice(0, count)) grid[Math.floor(position / d.cols)][position % d.cols] = target;
  return losingFill(d, grid, rng, target);
}
function fallenGrid(d, previous) {
  const removedPositions = evaluatePopxGrid(d, previous).matchedPositions;
  if (!removedPositions.length) error("INVALID_ROUND", "A crashed board cannot cascade.");
  const removed = new Set(removedPositions.map(({ row, col }) => row * d.cols + col));
  const grid = Array.from({ length: d.rows }, () => Array(d.cols).fill(null));
  const survivorMoves = [];
  for (let col = 0; col < d.cols; col++) {
    const survivors = [];
    for (let row = 0; row < d.rows; row++) if (!removed.has(row * d.cols + col)) survivors.push({ row, id: previous[row][col] });
    const offset = d.rows - survivors.length;
    for (let i = 0; i < survivors.length; i++) {
      const targetRow = offset + i;
      grid[targetRow][col] = survivors[i].id;
      survivorMoves.push({ symbolId: survivors[i].id, from: { row: survivors[i].row, col }, to: { row: targetRow, col } });
    }
  }
  return { grid, removedPositions, survivorMoves };
}
function cascadeGrid(d, previous, winning, rng) {
  const fallen = fallenGrid(d, previous);
  if (!winning) {
    losingFill(d, fallen.grid, rng);
    return fallen;
  }
  const target = d.symbols[draw(rng, d.symbols.length)].id;
  for (const row of fallen.grid) for (let col = 0; col < row.length; col++) if (row[col] === null) row[col] = target;
  return fallen;
}
function frameOutcome(frame) {
  return {
    kind: "cascade",
    grid: copy(frame.grid),
    matchedPositions: copy(frame.matchedPositions),
    matchedSymbols: copy(frame.matchedSymbols),
    removedPositions: copy(frame.removedPositions),
    survivorMoves: copy(frame.survivorMoves),
    cascadeIndex: frame.index,
    result: frame.result,
    multiplierBps: frame.multiplierBps
  };
}
function validateSequence(d, round) {
  validateConfig(d);
  const sequence = round.private?.sequence;
  if (round.gameId !== d.id || round.mathVersion !== d.mathVersion || round.family !== "crash" || round.crashMechanic !== "cascade" || !Number.isSafeInteger(round.startedAt) || round.startedAt < 0 || !Number.isSafeInteger(round.lastObservedAt) || round.lastObservedAt < round.startedAt || !Array.isArray(sequence) || sequence.length < 1 || sequence.length > d.multipliersBps.length) error("INVALID_ROUND", "Invalid stored PopX sequence.");
  for (const [index, frame] of sequence.entries()) {
    const match = evaluatePopxGrid(d, frame.grid);
    const final = index === sequence.length - 1;
    const expectedResult = match.winning ? index === d.multipliersBps.length - 1 ? "cap" : "match" : "crash";
    if (frame.index !== index || frame.at !== round.startedAt + index * d.cascadeMs || frame.result !== expectedResult || !equal(frame.matchedSymbols, match.matchedSymbols) || !equal(frame.matchedPositions, match.matchedPositions) || frame.multiplierBps !== (match.winning ? d.multipliersBps[index] : 0) || frame.result !== "match" !== final) error("INVALID_ROUND", "Stored PopX cascade outcomes are inconsistent.");
    if (index === 0) {
      if (!equal(frame.removedPositions, []) || !equal(frame.survivorMoves, [])) error("INVALID_ROUND", "Initial board cannot have removed cells.");
    } else {
      const fallen = fallenGrid(d, sequence[index - 1].grid);
      if (!equal(frame.removedPositions, fallen.removedPositions) || !equal(frame.survivorMoves, fallen.survivorMoves)) error("INVALID_ROUND", "Stored cascade does not preserve its removed cells and survivors.");
      for (let row = 0; row < d.rows; row++) for (let col = 0; col < d.cols; col++) if (fallen.grid[row][col] !== null && fallen.grid[row][col] !== frame.grid[row][col]) error("INVALID_ROUND", "A cascade changed a surviving symbol.");
    }
  }
  if (!Number.isSafeInteger(round.private.terminalAt) || round.private.terminalAt !== sequence.at(-1).at) error("INVALID_ROUND", "Invalid PopX terminal timestamp.");
  return sequence;
}
function project(d, round, now) {
  const sequence = validateSequence(d, round), at = timestamp(now);
  if (at < round.startedAt || at < round.lastObservedAt) error("INVALID_TIME", "Server time cannot move backwards within a round.");
  const index = Math.min(sequence.length - 1, Math.floor((at - round.startedAt) / d.cascadeMs));
  const frame = sequence[index];
  const status = frame.result === "crash" ? "lost" : frame.result === "cap" ? "collected" : "active";
  return {
    ...copy(round),
    lastObservedAt: at,
    cascadeIndex: index,
    step: index + 1,
    status,
    multiplierBps: frame.multiplierBps,
    winMinor: status === "collected" ? payout(round.betMinor, frame.multiplierBps) : "0",
    history: sequence.slice(0, index + 1).map((item) => ({
      step: item.index + 1,
      cascadeIndex: item.index,
      type: item.result === "match" ? "cascade" : item.result === "cap" ? "automatic-collect" : "crash",
      multiplierBps: item.multiplierBps,
      matchedCount: item.matchedPositions.length
    })),
    outcome: frameOutcome(frame)
  };
}
function validatePopxCascade(d, round) {
  const sequence = validateSequence(d, round);
  const index = Math.min(sequence.length - 1, Math.floor((round.lastObservedAt - round.startedAt) / d.cascadeMs));
  const frame = sequence[index];
  if (round.cascadeIndex !== index || round.step !== index + 1 || round.maxSteps !== d.multipliersBps.length || round.multiplierBps !== frame.multiplierBps || !equal(round.outcome, frameOutcome(frame)) || !Array.isArray(round.history) || round.history.length !== index + 1 || round.history.some((item, i) => item.step !== i + 1 || item.cascadeIndex !== i || item.multiplierBps !== sequence[i].multiplierBps || item.matchedCount !== sequence[i].matchedPositions.length || item.type !== (sequence[i].result === "match" ? "cascade" : sequence[i].result === "cap" ? "automatic-collect" : "crash")) || !["active", "lost", "collected"].includes(round.status) || round.status === "lost" && (frame.result !== "crash" || round.winMinor !== "0") || round.status === "active" && (frame.result !== "match" || round.winMinor !== "0") || round.status === "collected" && (frame.result === "crash" || round.winMinor !== payout(round.betMinor, frame.multiplierBps))) {
    error("INVALID_ROUND", "Stored PopX public progress or award is inconsistent.");
  }
  return true;
}
function startPopxCascade(d, { betMinor, rng, now }) {
  validateConfig(d);
  const base2 = baseRound(d, betMinor), startedAt = timestamp(now), sequence = [];
  for (let index = 0; index < d.multipliersBps.length; index++) {
    const threshold = index ? d.multipliersBps[index - 1] : d.returnBps;
    const winning = draw(rng, d.multipliersBps[index]) < threshold;
    const board = index ? cascadeGrid(d, sequence[index - 1].grid, winning, rng) : { grid: initialGrid(d, winning, rng), removedPositions: [], survivorMoves: [] };
    const matches = evaluatePopxGrid(d, board.grid);
    if (matches.winning !== winning) error("INVALID_MODEL", "Conditional cascade construction changed its selected outcome.");
    const result2 = !winning ? "crash" : index === d.multipliersBps.length - 1 ? "cap" : "match";
    sequence.push({
      ...board,
      ...matches,
      index,
      at: timestamp(startedAt + index * d.cascadeMs),
      result: result2,
      multiplierBps: winning ? d.multipliersBps[index] : 0
    });
    if (result2 !== "match") break;
  }
  const round = {
    ...base2,
    crashMechanic: "cascade",
    startedAt,
    lastObservedAt: startedAt,
    maxSteps: d.multipliersBps.length,
    private: { sequence, terminalAt: sequence.at(-1).at }
  };
  return project(d, round, startedAt);
}
function syncPopxCascade(d, round, now) {
  validatePopxCascade(d, round);
  return round.status === "active" ? project(d, round, now) : copy(round);
}
function collectPopxCascade(d, round, now) {
  active(round);
  const current = syncPopxCascade(d, round, now);
  return current.status !== "active" ? current : { ...current, status: "collected", winMinor: payout(current.betMinor, current.multiplierBps) };
}
function publicPopxCascade(d, round, now) {
  const view = syncPopxCascade(d, round, now);
  const live = round.status === "active" && view.status === "active";
  return {
    ...publicBase(round),
    crashMechanic: "cascade",
    multiplierBps: view.multiplierBps,
    history: copy(view.history),
    step: view.step,
    cascadeIndex: view.cascadeIndex,
    startedAt: view.startedAt,
    serverNow: timestamp(now),
    maxMultiplierBps: d.maxMultiplierBps,
    outcome: copy(view.outcome),
    grid: copy(view.outcome.grid),
    matchedPositions: copy(view.outcome.matchedPositions),
    matchedSymbols: copy(view.outcome.matchedSymbols),
    nextCascadeAt: live ? timestamp(view.startedAt + (view.cascadeIndex + 1) * d.cascadeMs) : null,
    collectibleMinor: live ? payout(view.betMinor, view.multiplierBps) : "0",
    pendingResolution: round.status === "active" && view.status !== "active",
    allowedActions: live ? ["reveal", "collect"] : []
  };
}

// math/public-gamble.mjs
var SOURCES = Object.freeze({
  ind74_official_multihot5wild: Object.freeze({
    url: "https://www.smartsoftgaming.com/games/multi-hot-5-wild",
    mathVersion: "official72-multihot5wild-r5"
  }),
  ind74_official_multihot5burnwilds: Object.freeze({
    url: "https://www.smartsoftgaming.com/games/multi-hot-5-burn-wilds",
    mathVersion: "official72-multihot5burnwilds-r4"
  })
});
function configurePublicColorGamble(definition2) {
  const source2 = SOURCES[definition2?.id];
  if (!source2 || definition2.family !== "slots" || !Array.isArray(definition2.rules)) {
    throw new TypeError("A documented independent wild-slot definition is required.");
  }
  definition2.mathVersion = source2.mathVersion;
  definition2.gamble = {
    enabled: true,
    maxRounds: 3,
    choices: ["red", "black"],
    startOption: "holdWin",
    probabilityModel: "independent-fair-color",
    providerLimitVerified: false,
    source: source2.url,
    evidenceKind: "official-public-document",
    rule: "Correct color doubles the held award; incorrect color loses it. Collect is available before each attempt. The independently selected three-attempt limit automatically collects the final success."
  };
  definition2.rules.push(
    "The official public page advertises X2: guess the color of a flashing card to double a winning award, or collect it.",
    "Choose holdWin before the spin to retain a winning award for red/black X2 or immediate collection. No additional stake is debited.",
    "This independent implementation uses equally likely red/black cards and at most three attempts. The final success collects automatically. These probabilities, attempt limit and pre-spin hold control are operator choices; provider equivalence is not established."
  );
  definition2.provenance = {
    ...definition2.provenance,
    publicGambleSource: source2.url,
    gambleProbabilitySource: "Independent fair-color draws; provider probabilities and limits unverified."
  };
  return definition2;
}

// math/public-slot-features.mjs
var FEATURES = Object.freeze({
  ind74_official_coinsofatlantis: Object.freeze({
    source: "https://www.smartsoftgaming.com/games/coins-of-atlantis",
    version: "official72-coinsofatlantis-r3",
    label: "Atlantis Wild",
    maximumWheel: 1,
    missing: "The separately advertised coin respin, bonus purchase and full-board coin doubling are not implemented by this regular-spin feature."
  }),
  ind74_official_jinglebellbonanza: Object.freeze({
    source: "https://www.smartsoftgaming.com/games/jingle-bell-bonanza",
    version: "official72-jinglebellbonanza-r3",
    label: "Jingle Wild",
    maximumWheel: 5,
    missing: "The advertised scatter awards and complete provider bonus behavior remain unverified and are not implemented by this regular-spin feature."
  }),
  ind74_official_farmsfortune: Object.freeze({
    source: "https://www.smartsoftgaming.com/games/farms-fortune-6n0s6",
    version: "official72-farmsfortune-r3",
    label: "Farmer Wild",
    maximumWheel: 5,
    missing: "The advertised scatter bonuses, bonus purchase and gamble are not implemented by this regular-spin feature."
  })
});
var PUBLIC_EXPANDING_WILD_IDS = Object.freeze(Object.keys(FEATURES));
function configurePublicSlotFeatures(definition2) {
  const feature = FEATURES[definition2?.id];
  if (!feature || definition2.family !== "slots" || definition2.cols !== 5 || !Array.isArray(definition2.symbols) || !Array.isArray(definition2.paylines)) {
    throw new TypeError("A documented five-reel expanding-wild model is required.");
  }
  definition2.mathVersion = feature.version;
  definition2.wildSymbol = { id: definition2.id.slice("ind74_official_".length) + "-wild", label: feature.label, glyph: "W" };
  definition2.wildRule = {
    columns: [1, 2, 3],
    substitutesRegularSymbols: true,
    expandWhenWinning: true,
    expansionEvaluation: "initial-winning-lines-only",
    allWildAward: "highest-eligible-symbol-award",
    regularSymbolWeight: 32,
    wildWeight: 1,
    probabilityModel: "independent-per-cell-tickets",
    providerProbabilitiesVerified: false,
    source: feature.source
  };
  definition2.multiplierValues = Array.from({ length: feature.maximumWheel }, (_, index) => index + 1);
  definition2.rules = [
    `This independent ${definition2.cols}-reel, ${definition2.rows}-row model uses ${definition2.paylines.length} independently authored paylines and symbol awards. The complete provider geometry and line chart are not established.`,
    "The official public rule restricts wilds to reels 2, 3 and 4. A wild substitutes for a regular symbol and expands vertically when participating in a winning combination.",
    "This implementation identifies wilds in the initial winning lines, fills those columns with wilds, and evaluates all paylines once more. Repeated provider expansion ordering remains unverified.",
    feature.maximumWheel === 5 ? "The official page advertises a multiplier up to 5x. This independent implementation uses equally likely factors 1x through 5x; their exact provider labels and probabilities remain unverified." : "This regular-spin feature uses a neutral 1x multiplier. No additional provider multiplier behavior is inferred.",
    `Each eligible cell has ${definition2.symbols.length * 32} independent regular-symbol tickets and one wild ticket. These probabilities, line chart and symbol awards are operator choices, not recovered provider mathematics.`,
    feature.missing
  ];
  definition2.provenance = {
    ...definition2.provenance,
    publicExpandingWildSource: feature.source,
    designed: "Documented wild reel restriction and winning-participation expansion; independently authored awards, line chart, probability distribution and one-pass expansion order."
  };
  return definition2;
}

// math/ways-slot.mjs
var OBSERVED_WILD_WAYS_ID = "ind74_official_multihotwildways";
function configureObservedWildWays(definition2) {
  if (definition2?.id !== OBSERVED_WILD_WAYS_ID || definition2.family !== "slots") {
    throw new TypeError("The observed Multi Hot Wild Ways definition is required.");
  }
  definition2.mathVersion = "official72-multihotwildways-r3";
  definition2.model = "independent-three-reel-27-ways";
  definition2.rows = 3;
  definition2.cols = 3;
  definition2.ways = 27;
  definition2.paylines = [];
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 3; c++) {
    definition2.paylines.push([a, b, c]);
  }
  definition2.symbols = definition2.symbols.map((symbol) => ({ ...symbol, pays: { 3: symbol.pays[3] } }));
  definition2.wildSymbol = { id: "multihotwildways-wild", label: "Wild", glyph: "W" };
  definition2.wildRule = {
    columns: [0, 1, 2],
    substitutesRegularSymbols: true,
    expandWhenWinning: false,
    expansionEvaluation: "none",
    allWildAward: "highest-eligible-symbol-award",
    regularSymbolWeight: 32,
    wildWeight: 1,
    probabilityModel: "independent-per-cell-tickets",
    providerProbabilitiesVerified: false
  };
  definition2.multiplierValues = [1, 2, 3, 4, 5];
  definition2.rules = [
    "The observed official demo has three reels and three rows, a left multiplier reel, and an explicit27WAYS label. All20 recorded result grids contain nine symbols.",
    "The official public rule pays matching symbols from consecutive reels beginning at the leftmost reel. Selecting one row from each of three reels gives27 possible ways. Wild substitutes for regular symbols.",
    "This independent model evaluates each of the27 row combinations exactly once. A matching three-symbol way pays floor(total stake \xD7 the authored symbol prize /27); way awards add, then the server multiplier applies.",
    "An all-wild way receives the highest eligible regular-symbol award once. No vertical wild expansion is inferred for this title.",
    "The official English Help lists five possible factors: 1x, 2x, 3x, 4x and 5x. All five also occurred in recorded public results. This independent implementation gives them equal probability; the provider distribution remains unverified.",
    "Symbol prizes, total-stake/27 award allocation, all-wild treatment and per-cell ticket probabilities are operator choices. The static Help document does not establish the complete provider award basis, symbol-ID mapping or probabilities.",
    "The raw provider LinePlay value1 is a betting field. It is not treated as one payline, nor as evidence of27 fixed paylines. Gamble and complete provider bonus behavior remain unimplemented or unverified."
  ];
  definition2.provenance = {
    ...definition2.provenance,
    observed: "Twenty official DEMO results with nine symbols each; rendered3\xD73 grid, left multiplier reel and27WAYS label.",
    geometrySource: "reports/current74-evidence-slots-remaining/ind74_official_multihotwildways-initial.png",
    publicWaysSource: "https://www.smartsoftgaming.com/games/multi-hot-wild-ways",
    publicHelpSource: "references/official-slot-help-en-20261111.json:help.slots.multihotwildways.ways.to.pay.description",
    designed: "Independent regular-symbol awards,27-way stake allocation, wild tickets, highest-award all-wild treatment and uniform multiplier distribution."
  };
  return definition2;
}
function startObservedWildWays(definition2, options) {
  const round = startPublicWildSlot(definition2, options);
  return { ...round, outcome: { ...round.outcome, ways: 27, winningWaysCount: round.outcome.lineWins.length } };
}

// math/observed-three-reel.mjs
var MULTI_HOT_WAYS_ID = "ind74_official_multihotways";
var CHARGING_THREE_IDS = Object.freeze(["ind74_official_multifruitschargingwilds", "ind74_official_gemscrownchargingwilds"]);
var OBSERVED_THREE_IDS = Object.freeze([MULTI_HOT_WAYS_ID, ...CHARGING_THREE_IDS]);
var help = "references/official-slot-help-en-20261111.json";
function configureObservedThreeReel(d) {
  if (!OBSERVED_THREE_IDS.includes(d?.id) || d.family !== "slots") throw new TypeError("An observed three-reel title is required.");
  const ways = d.id === MULTI_HOT_WAYS_ID, ns = d.id.replace("ind74_official_", "");
  d.rows = 3;
  d.cols = 3;
  d.mathVersion = "official72-" + ns + (ns === "gemscrownchargingwilds" ? "-r4" : "-r3");
  d.symbols = d.symbols.map((symbol) => ({ ...symbol, pays: { 3: symbol.pays[3] } }));
  d.paylines = ways ? [] : [[1, 1, 1], [0, 0, 0], [2, 2, 2], [0, 1, 2], [2, 1, 0]];
  if (ways) {
    d.ways = 27;
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 3; c++) d.paylines.push([a, b, c]);
    d.multiplierValues = [1, 2, 3, 4, 5];
    d.rules = [
      "Twenty completed official DEMO results contain nine symbols, matching three reels and three rows. The title-specific official Help specifies 27 Reel Ways Pay and a left 1x, 2x, 3x, 4x or 5x multiplier reel.",
      "One matching symbol position from each consecutive reel, starting at the leftmost reel, forms a winning way. This independent model evaluates each of the 27 row combinations once; every matching way pays floor(total stake \xD7 authored symbol prize /27), then the left multiplier applies.",
      "The official Help additionally describes a conditional x2 when the same symbols appear on all three reels. The precise condition is unresolved and this extra feature remains unimplemented. The separate red/black X2 Gamble is also documented but not implemented for this title.",
      "The provider LinePlay value 1 is a betting field, not one fixed payline. No Wild substitution is inferred by copying Multi Hot Wild Ways. Symbol prizes, uniform regular-symbol tickets, stake/27 allocation and uniform multiplier probabilities are independent choices; provider math and complete parity are unverified."
    ];
    d.provenance = {
      ...d.provenance,
      publicWaysSource: help + ":help.slots.multihotways.doubleDIv.description",
      publicMultiplierSource: help + ":help.slots.multihotways.multiplier.description",
      designed: "Distinct regular-symbol 27-ways model; no Wild alias, no invented conditional x2 trigger."
    };
  } else {
    delete d.multiplierValues;
    d.rules = [
      "Twenty completed official DEMO result grids contain nine symbols, matching three reels and three rows. The exact title Help specifies five fixed active paylines and only the highest left-to-right win on each line.",
      "This independent regular-symbol fallback uses five authored paylines. Each matching three-symbol line pays floor(total stake \xD7 authored symbol prize /5); all line awards add.",
      "Documented but NOT implemented: a nonwinning Wild remains at its cell across new paid spins and charges +1; participating Wilds pay with their accumulated multiplier and leave the grid. Saved Wilds and multipliers belong to the selected bet value and return when that bet is selected again.",
      "The required persistent per-player, per-game and per-bet carry state must be changed atomically with the retained server wallet transaction. A single-spin replacement would not reproduce this feature. Ante-bet guarantees, feature purchase and X2 Gamble remain unimplemented.",
      "Regular-symbol tickets, symbol prizes and five-line chart are independently authored. No persistent Wild, provider probability, full reference equivalence or provider RTP is claimed by this fallback."
    ];
    delete d.nominalReturn;
    d.provenance = {
      ...d.provenance,
      paylineCountSource: help + ":help.slots." + ns + ".payline.chart",
      documentedPersistentFeatureSource: help + ":help.slots." + ns + ".multiplier.reel.description",
      designed: "Three-by-three regular-symbol fallback only. Persistent charging Wilds require retained transactional carry state and are not implemented."
    };
  }
  d.provenance = {
    ...d.provenance,
    geometrySource: "reports/current74-evidence-slots-remaining/" + d.id + "-initial.png",
    observed: "Twenty completed official DEMO results with nine returned symbols each, cross-checked against rendered three-by-three positions."
  };
  return d;
}
function startObservedRegularWays(d, options) {
  if (d.id !== MULTI_HOT_WAYS_ID || d.ways !== 27 || d.wildSymbol) throw new TypeError("Distinct regular Multi Hot Ways definition required.");
  const round = startThreeReelSlot(d, options);
  return { ...round, outcome: { ...round.outcome, ways: 27, winningWaysCount: round.outcome.lineWins.length } };
}

// math/power-of-tiger.mjs
var POWER_TIGER_ID = "ind74_official_poweroftiger";
var FACTORS = Object.freeze([5, 10, 15, 20]);
var SOURCE = "https://www.smartsoftgaming.com/games/power-of-tiger";
var copy2 = (value) => structuredClone(value);
var largestPrize = (d) => Math.max(...d.symbols.map((symbol) => symbol.pays[3]));
var emptyGrid = () => Array.from({ length: 3 }, () => Array(3).fill(null));
var lockedCount = (grid) => grid.flat().filter((value) => value !== null).length;
var validFactor = (value) => FACTORS.includes(value);
function configurePowerOfTiger(d) {
  if (d?.id !== POWER_TIGER_ID || d.family !== "slots" || d.rows !== 3 || d.cols !== 3 || d.paylines?.length !== 5) throw new TypeError("The observed3-by-3 Power of Tiger definition is required.");
  d.mathVersion = "official72-poweroftiger-r4";
  d.model = "independent-tiger-wild-and-respin";
  d.wildSymbol = { id: "poweroftiger-wild", label: "Tiger Wild", glyph: "W" };
  d.wildRule = {
    columns: [0, 1, 2],
    substitutesRegularSymbols: true,
    expandWhenWinning: false,
    allWildAward: "highest-eligible-symbol-award",
    regularSymbolWeight: 32,
    wildWeight: 1,
    probabilityModel: "independent-per-cell-tickets",
    providerProbabilitiesVerified: false
  };
  delete d.multiplierValues;
  d.baseGameMultiplier = { values: [...FACTORS], trigger: "identical-full-board-or-all-five-lines-win", source: SOURCE };
  d.respinFeature = {
    values: [...FACTORS],
    source: SOURCE,
    triggerTickets: 128,
    triggerTicket: 0,
    cellTickets: 64,
    selectedSymbolTickets: 8,
    wildTickets: 1,
    initialBoard: "independent-empty-board",
    awardAggregation: "independent-base-plus-final-feature-only",
    maximumFrames: 9,
    maximumFramesProof: "Every continuing frame locks at least one of nine cells; a no-new-lock frame stops immediately.",
    providerProbabilitiesVerified: false,
    providerAggregationVerified: false,
    fullBoardIncludesWildForMultiplier: true,
    providerFullBoardWildMultiplierVerified: false
  };
  d.rules = [
    "The observed official demo has three reels, three rows and five active lines. Wild substitutes for regular symbols.",
    "The official public rule applies a randomly selected 5x, 10x, 15x or 20x multiplier when the whole base board is identical or all five active lines win.",
    "The documented random respin selects a regular symbol and a 5x, 10x, 15x or 20x factor. Only that symbol, wilds and blanks appear; selected symbols and wilds lock. A new lock continues the feature; no new locks or a full board ends it. The feature factor applies only to a full board.",
    "Independent operator choices: regular base symbols have 32 tickets each and wild has one; respin triggers on one of 128 tickets; selected symbols and factors are uniform. Each unlocked respin cell has 64 tickets: 8 selected-symbol, 1 wild and 55 blank. Provider probabilities are not established.",
    "Unresolved provider aggregation is not claimed as verified. This independent implementation starts its respin board blank, retains the base award, scores only the final feature board once, and adds that award to the base award. Intermediate feature boards do not create extra payments.",
    "The five-line chart, symbol prizes, all-wild highest-prize treatment, blank initial board, base-plus-feature aggregation and final-grid-only scoring are independently authored. Provider initial holds and award aggregation remain unverified.",
    "The English Help ends the respin on a full selected-symbol and/or-wild board, but its multiplier sentence mentions a full selected-symbol board. This independent implementation counts substituting wilds as filled for that multiplier; the provider wording remains ambiguous.",
    "A maximum of nine respin frames follows from nine lockable cells and immediate stopping on no new locks. One stake is debited; all feature frames resolve on the server as one settled result. STOP only accelerates presentation.",
    "The public 2500x marketing maximum is not used as a hidden payout clamp or claimed as this independent model maximum. Liability reserves the full independently attainable base-plus-feature bound before accepting the stake."
  ];
  d.provenance = {
    ...d.provenance,
    publicFeatureSource: SOURCE,
    publicHelpSource: "reports/current74-evidence-slots-remaining/poweroftiger-official-help-en.json",
    designed: "Documented conditional base multiplier and locked-symbol respin structure with explicitly independent probabilities, symbols, five-line chart, blank initial feature board and award aggregation."
  };
  return d;
}
function evaluateTigerLines(d, betMinor, grid, { selectedSymbolId } = {}) {
  const regular = selectedSymbolId ? d.symbols.filter((symbol) => symbol.id === selectedSymbolId) : d.symbols;
  const allowed = /* @__PURE__ */ new Set([...regular.map((symbol) => symbol.id), d.wildSymbol.id, null]);
  if (regular.length === 0 || !Array.isArray(grid) || grid.length !== 3 || grid.some((row) => !Array.isArray(row) || row.length !== 3 || row.some((id) => !allowed.has(id)))) error("INVALID_GRID", "The Tiger board contains invalid positions or symbols.");
  const lineWins = [];
  let total = 0n;
  for (const [lineIndex, path] of d.paylines.entries()) {
    let best;
    for (const symbol of regular) {
      if (!path.every((row, col) => [symbol.id, d.wildSymbol.id].includes(grid[row][col]))) continue;
      const win = BigInt(betMinor) * BigInt(symbol.pays[3]) / 5n;
      if (!best || win > best.win) best = { win, symbolId: symbol.id, multiplier: symbol.pays[3] };
    }
    if (best) {
      total += best.win;
      lineWins.push({
        lineIndex,
        payline: [...path],
        symbolId: best.symbolId,
        matches: 3,
        multiplier: best.multiplier,
        winMinor: best.win.toString(),
        positions: path.map((row, col) => ({ row, col }))
      });
    }
  }
  return { winMinor: total.toString(), lineWins };
}
function powerTigerMaximumMultiplierBps(d) {
  return largestPrize(d) * 40 * 1e4;
}
function maximumPowerTigerPayout(d, betMinor) {
  return (5n * (BigInt(betMinor) * BigInt(largestPrize(d)) / 5n) * 40n).toString();
}
function baseQualifiers(grid, lineWins) {
  return { identicalFullBoard: grid.flat().every((id) => id === grid[0][0]), allFiveLinesWin: lineWins.length === 5 };
}
function startPowerOfTiger(d, { betMinor, rng }) {
  const round = baseRound(d, betMinor), regularTickets = d.symbols.length * 32;
  const grid = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => {
    const ticket = draw(rng, regularTickets + 1);
    return ticket === regularTickets ? d.wildSymbol.id : d.symbols[ticket % d.symbols.length].id;
  }));
  const base2 = evaluateTigerLines(d, round.betMinor, grid), qualifiers = baseQualifiers(grid, base2.lineWins);
  const baseMultiplier = qualifiers.identicalFullBoard || qualifiers.allFiveLinesWin ? FACTORS[draw(rng, 4)] : 1;
  const baseAwardMinor = (BigInt(base2.winMinor) * BigInt(baseMultiplier)).toString();
  const bonusTriggered = draw(rng, d.respinFeature.triggerTickets) === d.respinFeature.triggerTicket;
  const bonusFrames = [];
  let bonusAwardMinor = "0", selectedSymbolId = null, featureMultiplier = null, featureFinishedReason = null;
  if (bonusTriggered) {
    selectedSymbolId = d.symbols[draw(rng, d.symbols.length)].id;
    featureMultiplier = FACTORS[draw(rng, 4)];
    let current = emptyGrid();
    while (true) {
      const before = lockedCount(current), next = copy2(current);
      for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) if (next[row][col] === null) {
        const ticket = draw(rng, d.respinFeature.cellTickets);
        if (ticket < d.respinFeature.selectedSymbolTickets) next[row][col] = selectedSymbolId;
        else if (ticket < d.respinFeature.selectedSymbolTickets + d.respinFeature.wildTickets) next[row][col] = d.wildSymbol.id;
      }
      const locked = lockedCount(next), newLocks = locked - before, full = locked === 9;
      const scored = evaluateTigerLines(d, round.betMinor, next, { selectedSymbolId });
      const award = (BigInt(scored.winMinor) * BigInt(full ? featureMultiplier : 1)).toString();
      featureFinishedReason = full ? "full-board" : newLocks === 0 ? "no-new-locks" : null;
      bonusFrames.push({
        index: bonusFrames.length + 1,
        grid: copy2(next),
        lockedCells: locked,
        newLocks,
        lineWins: scored.lineWins,
        rawAwardMinor: scored.winMinor,
        displayedAwardMinor: award,
        multiplierApplied: full ? featureMultiplier : 1,
        terminal: featureFinishedReason !== null
      });
      current = next;
      if (featureFinishedReason !== null) {
        bonusAwardMinor = award;
        break;
      }
      if (bonusFrames.length >= 9) error("INVALID_TIGER_FEATURE", "The lock-progress proof was violated.");
    }
  }
  const winMinor = (BigInt(baseAwardMinor) + BigInt(bonusAwardMinor)).toString();
  return {
    ...round,
    status: winMinor === "0" ? "lost" : "collected",
    step: 1,
    winMinor,
    multiplierBps: Number(BigInt(winMinor) * 10000n / BigInt(round.betMinor)),
    outcome: {
      kind: "slots",
      grid,
      originalGrid: copy2(grid),
      lineWins: base2.lineWins.map((line) => ({ ...line, winMinor: (BigInt(line.winMinor) * BigInt(baseMultiplier)).toString() })),
      baseQualifiers: qualifiers,
      baseMultiplier,
      baseRawAwardMinor: base2.winMinor,
      baseAwardMinor,
      bonusTriggered,
      bonusFrames,
      selectedSymbolId,
      featureMultiplier,
      featureFinishedReason,
      bonusAwardMinor,
      featureAggregation: "independent-base-plus-final-feature-only"
    }
  };
}
function validatePowerTigerRound(d, round) {
  const o = round.outcome;
  if (!o || o.kind !== "slots" || !Array.isArray(o.bonusFrames) || o.bonusFrames.length > 9 || !Array.isArray(o.grid) || o.grid.some((row) => !Array.isArray(row) || row.some((value) => value === null))) error("INVALID_ROUND", "The Tiger result is malformed.");
  const base2 = evaluateTigerLines(d, round.betMinor, o.grid), qualifiers = baseQualifiers(o.grid, base2.lineWins);
  if (o.baseRawAwardMinor !== base2.winMinor || o.baseQualifiers?.identicalFullBoard !== qualifiers.identicalFullBoard || o.baseQualifiers?.allFiveLinesWin !== qualifiers.allFiveLinesWin || (qualifiers.identicalFullBoard || qualifiers.allFiveLinesWin ? !validFactor(o.baseMultiplier) : o.baseMultiplier !== 1) || o.baseAwardMinor !== (BigInt(base2.winMinor) * BigInt(o.baseMultiplier)).toString()) error("INVALID_ROUND", "The Tiger base award is inconsistent.");
  let bonus = "0";
  if (o.bonusTriggered === true) {
    if (!d.symbols.some((symbol) => symbol.id === o.selectedSymbolId) || !validFactor(o.featureMultiplier) || o.bonusFrames.length === 0) error("INVALID_ROUND", "The Tiger feature identity is invalid.");
    let previous = emptyGrid();
    for (const [index, frame] of o.bonusFrames.entries()) {
      const score = evaluateTigerLines(d, round.betMinor, frame.grid, { selectedSymbolId: o.selectedSymbolId });
      const locked = lockedCount(frame.grid), newLocks = locked - lockedCount(previous), full = locked === 9, last = index === o.bonusFrames.length - 1;
      if (previous.some((row, r) => row.some((id, c) => id !== null && frame.grid[r][c] !== id)) || newLocks < 0 || frame.index !== index + 1 || frame.lockedCells !== locked || frame.newLocks !== newLocks || frame.rawAwardMinor !== score.winMinor || frame.multiplierApplied !== (full ? o.featureMultiplier : 1) || frame.displayedAwardMinor !== (BigInt(score.winMinor) * BigInt(full ? o.featureMultiplier : 1)).toString() || frame.terminal !== (full || newLocks === 0) || !last && (full || newLocks === 0) || last && !full && newLocks !== 0) error("INVALID_ROUND", "The Tiger feature lock progression is inconsistent.");
      if (last) {
        bonus = frame.displayedAwardMinor;
        if (o.featureFinishedReason !== (full ? "full-board" : "no-new-locks")) error("INVALID_ROUND", "The Tiger feature ending is inconsistent.");
      }
      previous = frame.grid;
    }
  } else if (o.bonusTriggered !== false || o.bonusFrames.length !== 0 || o.bonusAwardMinor !== "0") error("INVALID_ROUND", "An untriggered Tiger feature cannot pay.");
  const total = (BigInt(o.baseAwardMinor) + BigInt(bonus)).toString();
  if (o.bonusAwardMinor !== bonus || round.winMinor !== total || BigInt(total) > BigInt(maximumPowerTigerPayout(d, round.betMinor)) || round.status !== (total === "0" ? "lost" : "collected")) error("INVALID_ROUND", "The Tiger total award is inconsistent.");
}

// math/official72.mjs
var norm = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
var models = listGameDefinitions();
var GAME_ID2 = "ind74_official_mineisland2";
var record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
var largestSymbolPrize = (d) => Math.max(...d.symbols.flatMap((symbol) => Object.values(symbol.pays)), ...Object.values(d.wildSymbol?.pays ?? {}));
var largestWheel = (d) => Math.max(...d.multiplierValues ?? [1]);
var PLINKO_CLASSIC = "ind74_official_plinkoxclassic";
var WILD_THREE = "ind74_official_multihot5wild";
var BURN_WILDS = "ind74_official_multihot5burnwilds";
var GAMBLE_HUNDRED = "ind74_official_multihot100";
var MINE_ISLAND = "ind74_official_mineisland";
var THREE_REEL_TITLES = /* @__PURE__ */ new Set(["Multi Hot 5 Deluxe", "Safari Simba", "Habesha Fortune 5", "Bao Slot 5X", "Power of Tiger"]);
var VERIFIED_LINE_COUNTS = /* @__PURE__ */ new Map([["Power of Tiger", 5], ["Gems Crown Charging Wilds", 5], ["Burning Ice", 5], ["Jungle Sisters Deluxe", 20], ["Sugar Fiesta", 3]]);
function maximumMultiplier(d) {
  if (d.id === POWER_TIGER_ID) return powerTigerMaximumMultiplierBps(d);
  if (d.family === "slots") return largestSymbolPrize(d) * largestWheel(d) * 1e4 * (d.gamble?.enabled ? 2 ** d.gamble.maxRounds : 1);
  if (d.family === "crash") return d.maxMultiplierBps;
  if (d.id === GAME_ID2) return Math.max(...d.paytable.flatMap((table) => table.rows.map((row) => row.multiplierBps)));
  if (d.family === "ladder") return d.multipliersBps.at(-1);
  if (d.family === "mines") return mineMultiplier(d, d.maxPicks);
  if (d.family === "plinko") return Math.max(...d.bucketMultipliersBps) * Math.max(...d.ballMultipliers ?? [1]);
  if (d.family === "wheel") return Math.max(...d.sectors.map((sector) => sector.multiplierBps));
  if (d.family === "dice") return Math.floor(d.returnBps * 100 / d.minTarget);
  error("INVALID_MODEL", "Unsupported independent game family.");
}
var definitions3 = official74_default.entries.filter((entry) => !entry.protected).map((entry) => {
  const model = entry.name === "Plinko X Classic" ? fresh_plinkoxclassic_default : entry.name === "Multi Hot 100" ? getGameDefinition("ind74_multihot100") : models.find((game) => norm(game.catalogName) === norm(entry.name));
  if (!model) throw new Error("Missing independent model for official title: " + entry.name);
  const d = structuredClone(model);
  d.id = entry.gameId;
  d.catalogName = entry.name;
  d.title = entry.name + " \u2014 Independent";
  d.mathVersion = "official72-" + norm(entry.name) + "-r2";
  d.officialReference = {
    publisher: "SmartSoft Gaming",
    page: entry.officialUrl,
    demo: entry.demoUrl,
    catalogVerifiedOn: official74_default.fetchedOn,
    fullGameplayVerified: false
  };
  d.implementationStatus = "independent-model; full-reference-parity-and-production-ledger-unverified";
  d.limits = { minBetMinor: "100", maxBetMinor: "0", betStepMinor: "100", maxWinMinor: "0" };
  if (d.id === MINE_ISLAND) {
    d.family = "ladder";
    d.mathVersion = "official72-mineisland-r3";
    for (const key of ["rows", "cols", "cells", "mines", "maxPicks"]) delete d[key];
    d.modes = ["easy"];
    d.defaultMode = "easy";
    d.maxSteps = 10;
    d.multipliersBps = [11e3, 12e3, 15e3, 2e4, 3e4, 5e4, 1e5, 2e5, 5e5, 1e6];
    d.returnBps = 9600;
    d.paytable = [{ mode: "easy", rows: d.multipliersBps.map((multiplierBps, index) => ({ step: index + 1, multiplierBps })) }];
    d.nominalReturn = { numerator: "96", denominator: "100", description: "Independent authored survival model. This is not a provider RTP claim." };
    d.rules = [
      "The observed official Mine Island demo shows ten ascending island platforms labelled 1.1x, 1.2x, 1.5x, 2x, 3x, 5x, 10x, 20x, 50x and 100x.",
      "Play debits one stake and resolves the first jump. The observed first attempt could lose. This independent continuation offers Jump to attempt the next platform or Collect to pay the confirmed current multiplier; the original demo continuation controls remain unverified.",
      "The tenth successful jump collects at 100x. Winnings use integer minor units and round down after multiplication.",
      "The server chooses the outcomes. This independent model uses a 9600/first-multiplier survival threshold, then the preceding multiplier divided by the next multiplier; those probabilities are operator choices and are not verified provider probabilities.",
      "Selected visual cell numbers do not change the server result. No private RNG, rare provider bonus, artwork, audio or full reference equivalence is claimed.",
      "Source conflict: the official marketing page describes a rectangular tile/mines game, while its linked MineIsland demo shows this ascending island ladder. The observed launcher geometry is used here; complete title/rule equivalence is not established."
    ];
    d.provenance = {
      ...d.provenance,
      observed: "Official MineIsland launcher screenshot shows an ocean, kangaroo, TNT barrels and ten ascending island platforms; the first PLAY attempt was observed to lose and return to PLAY. Later continuation controls are unverified.",
      geometrySource: "reports/current74-evidence-nonslots/ind74_official_mineisland-initial.png",
      designed: "Independent survival probabilities and server round transitions with observed ten-step visible multipliers. The previous rectangular mines model does not match this game."
    };
  }
  if (THREE_REEL_TITLES.has(entry.name)) {
    d.rows = 3;
    d.cols = 3;
    d.mathVersion = "official72-" + norm(entry.name) + "-r3";
    d.paylines = [[1, 1, 1], [0, 0, 0], [2, 2, 2], [0, 1, 2], [2, 1, 0]];
    d.symbols = d.symbols.map((symbol) => ({ ...symbol, pays: { 3: symbol.pays[3] } }));
    d.rules = [
      "The public reference specifies three reels and three rows. This independent implementation uses five authored paylines.",
      "Three equal regular symbols from the left pay the displayed independent prize; each line uses one fifth of the total stake before integer flooring.",
      "The complete provider paytable, paylines, bonus features and probabilities remain unverified. No provider return percentage is claimed."
    ];
    d.provenance = { ...d.provenance, geometrySource: entry.officialUrl, designed: "Independent three-reel regular-symbol model with author-generated five paylines and symbol awards." };
    if (entry.name === "Power of Tiger") {
      d.provenance.geometrySource = "reports/current74-evidence-slots-remaining/ind74_official_poweroftiger-initial.png";
      d.provenance.observed = "Five fresh official DEMO results contain nine symbols each, matching the rendered3-by-3 grid. The public page and result LinePlay field both specify five lines.";
      d.rules.push("The observed20X sign is presentation evidence only. The advertised wild, locked-symbol respin and conditional5x/10x/15x/20x feature remain unimplemented; no trigger probabilities or active feature award are inferred from that sign.");
    }
  }
  if (VERIFIED_LINE_COUNTS.has(entry.name)) {
    const count = VERIFIED_LINE_COUNTS.get(entry.name);
    if (d.paylines.length !== count) {
      d.mathVersion = "official72-" + norm(entry.name) + "-r3";
      d.paylines = independentPaylines(d.cols ?? 5, d.rows ?? 3, count);
      d.rules = [`The official public page specifies ${count} fixed paylines. This model uses ${count} independently authored lines.`, ...d.rules];
      d.provenance = { ...d.provenance, paylineCountSource: entry.officialUrl, paylineSource: "Independent chart; public line count only is verified." };
    }
  }
  if (d.id === "ind74_official_multihot40") {
    const observed = OBSERVED_LAYOUTS[d.id];
    d.rows = observed.rows;
    d.cols = observed.columns;
    d.paylines = independentPaylines(d.cols, d.rows, 40);
    d.rules = [
      "Independent five-reel, four-row slot with 40 independently authored paylines. Geometry follows the observed public demo; the provider payline chart is unverified.",
      "Only the longest left-to-right match of 3, 4 or 5 identical symbols pays on each line.",
      "Each line pays floor(stake \xD7 symbol prize / 40); the line prizes add without a hidden payout clamp.",
      "The top multiplier arc is observed presentation evidence. Its complete provider probability model is not implemented by this independent slot model.",
      "No provider wild, scatter, bonus, gamble or free-spin equivalence is asserted."
    ];
    d.provenance = {
      ...d.provenance,
      observed: observed.evidence,
      geometrySource: observed.source,
      paylineSource: "Independent 40-line chart using all four rows"
    };
  }
  if ([WILD_THREE, BURN_WILDS].includes(d.id)) {
    const three = d.id === WILD_THREE;
    d.rows = 3;
    d.cols = three ? 3 : 5;
    d.mathVersion = "official72-" + norm(entry.name) + "-r3";
    d.paylines = three ? [[1, 1, 1], [0, 0, 0], [2, 2, 2], [0, 1, 2], [2, 1, 0]] : [[1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2]];
    d.symbols = structuredClone(getGameDefinition("ind74_multihot100").symbols).map((symbol, i) => ({
      ...symbol,
      id: norm(entry.name) + "-" + symbol.id.replace(/^multihot100-/, ""),
      pays: three ? { 3: [50, 30, 20, 15, 12, 10, 8, 6][i] } : symbol.pays
    }));
    d.wildSymbol = { id: norm(entry.name) + "-wild", label: "Wild", glyph: "W" };
    if (three) {
      d.mathVersion = "official72-" + norm(entry.name) + "-r4";
      d.symbols = [
        ["double-seven", "Double seven", "77", 75],
        ["dollars", "Dollars", "$$", 50],
        ["bell", "Bell", "\u{1F514}", 25],
        ["watermelon", "Watermelon", "\u{1F349}", 15],
        ["grape", "Grapes", "\u{1F347}", 15],
        ["plum", "Plum", "\u25CF", 5],
        ["lemon", "Lemon", "\u{1F34B}", 5],
        ["orange", "Orange", "\u{1F34A}", 5],
        ["cherry", "Cherry", "\u{1F352}", 5]
      ].map(([id, label, glyph, prize]) => ({ id: norm(entry.name) + "-" + id, label, glyph, weight: 1, pays: { 3: prize } }));
      d.wildSymbol.pays = { 3: 100 };
      d.observedPaytable = {
        source: entry.demoUrl,
        totalBetMinor: "5",
        paylines: 5,
        regularPrizesPerLine: [75, 50, 25, 15, 15, 5, 5, 5, 5],
        wildPrizePerLine: 100,
        publishedMaximumMultiplier: 375,
        maximumCouplingVerified: false,
        conflict: "The observed all-wild prize and a possible 5x multiplier permit a 500x independent full-board bound; the help states 375x. Provider restrictions or coupling are unverified."
      };
    }
    d.wildRule = {
      columns: three ? [0, 1, 2] : [1, 2, 3],
      substitutesRegularSymbols: true,
      expandWhenWinning: !three,
      expansionEvaluation: three ? "none" : "initial-winning-lines-only",
      allWildAward: three ? "observed-wild-own-award" : "highest-eligible-symbol-award",
      regularSymbolWeight: 32,
      wildWeight: 1,
      probabilityModel: "independent-per-cell-tickets",
      providerProbabilitiesVerified: false
    };
    d.multiplierValues = [1, 2, 3, 4, 5];
    d.rules = [
      three ? "Three reels and three rows with five fixed independent paylines; three matching symbols from the left pay." : "Five reels and three rows with five fixed independent paylines; the longest left-to-right match pays.",
      three ? "Wild substitutes for any regular symbol. Three Wilds pay their observed own prize of 100 times the line stake." : "Wild appears only on reels 2, 3 and 4. A wild used by an initial winning line expands to fill its reel; all paylines are then evaluated again.",
      "A 1x, 2x, 3x, 4x or 5x multiplier multiplies the completed line awards.",
      `This independent model gives each eligible cell ${d.symbols.length * 32} regular-symbol tickets and one wild ticket; regular symbols share those tickets equally. Multiplier values are equally likely.`,
      three ? "Symbol prizes follow the publicly observed DEMO paytable. Paylines and probabilities are independently authored; certified provider RTP is not reproduced." : "Symbol awards and paylines are independently authored. The provider probability distribution, complete paytable and certified RTP have not been reproduced."
    ];
    if (three) d.rules.push("The help advertises 375x maximum, but its displayed wild prize combined with 5x permits a 500x independent bound. Unverified provider restrictions are not replaced with a hidden payout clamp.");
    d.provenance = {
      ...d.provenance,
      publicRules: entry.officialUrl,
      designed: three ? "Observed nine regular-symbol awards and the Wild award; independently authored five-line chart and probabilities. The provider maximum-win coupling remains unresolved." : "Independent symbol awards, five-line chart and probabilities; public geometry and wild rules implemented separately from those operator choices."
    };
  }
  if (d.id === POWER_TIGER_ID) configurePowerOfTiger(d);
  if (d.id === OBSERVED_WILD_WAYS_ID) configureObservedWildWays(d);
  if (OBSERVED_THREE_IDS.includes(d.id)) configureObservedThreeReel(d);
  if (PUBLIC_EXPANDING_WILD_IDS.includes(d.id)) configurePublicSlotFeatures(d);
  if ([WILD_THREE, BURN_WILDS].includes(d.id)) configurePublicColorGamble(d);
  if (d.id === GAMBLE_HUNDRED) {
    d.mathVersion = "official72-" + norm(entry.name) + "-r3";
    d.gamble = {
      enabled: true,
      maxRounds: 3,
      choices: ["red", "black"],
      probabilityModel: "independent-fair-color",
      startOption: "holdWin",
      providerLimitVerified: false,
      source: "references/multihot100-observed-20261111.json",
      rule: "Correct color doubles the held award; incorrect color loses that award. Collect is available before each attempt. The independent operator limit is three attempts; the final success collects automatically."
    };
    d.rules = [
      ...d.rules,
      "Choose holdWin before a spin to keep a winning award available for red/black X2 or immediate collection. This does not place another stake.",
      "Each independent X2 draw is equally likely red or black. At most three attempts are allowed; the third success collects automatically. This operator limit is not a verified provider limit."
    ];
  }
  if (d.id === PLINKO_CLASSIC) {
    d.mathVersion = "official72-" + norm(entry.name) + "-r3";
    d.model = "observed-board-independent-colored-ball-v2";
    d.ballMultipliers = [1, 5, 10];
    d.ballSelection = [{ type: "pink", multiplier: 1, weight: 995 }, { type: "orange", multiplier: 5, weight: 4 }, { type: "fire", multiplier: 10, weight: 1 }];
    d.ballSelectionModel = {
      selection: "server",
      providerProbabilitiesVerified: false,
      source: entry.demoUrl,
      marketingDemoAmbiguity: true,
      rule: "The observed demo shows pink 1x, orange 5x and fire 10x balls with a maximum of 10000x. Server selection and its probabilities are independently authored."
    };
    delete d.implementedBallMultiplier;
    d.completeProviderBallTypesImplemented = false;
    d.nominalReturn = {
      numerator: (158963n * 1025n).toString(),
      denominator: (163840n * 1000n).toString(),
      description: "Independent fair-path model and independent 995/4/1 color weights. This is not certified provider RTP."
    };
    d.rules = [
      "The public board has 16 peg rows and 17 prize buckets. The observed demo identifies pink 1x, orange 5x and fire 10x balls.",
      "One accepted stake is debited. The server independently chooses the ball color; there is no player color selection or extra color charge.",
      "Payout equals the stake times the bucket multiplier times the server-selected ball multiplier; the maximum is 10000 times the stake.",
      "This independent model takes 16 fair left/right turns and selects pink/orange/fire with weights 995/4/1. These are operator probabilities, not recovered provider probabilities.",
      "Marketing describes selectable stake factors, but the observed demo shows a static color legend. Complete provider color-selection semantics and certified RTP remain unverified."
    ];
    d.provenance = {
      ...d.provenance,
      publicBallHelpSource: entry.demoUrl,
      marketingSource: entry.officialUrl,
      designed: "Independent fair left/right paths and server color probabilities. The stake is debited once; public demo ball multipliers multiply the bucket award."
    };
  }
  if (d.id === "ind74_official_popx") Object.assign(d, configurePopxCascade(d));
  if (d.family === "slots") {
    d.proratedStake = true;
    if (d.id === WILD_THREE) {
      const weightedAwards = d.symbols.reduce((sum, symbol) => sum + BigInt(symbol.pays[3]) * (33n ** 3n - 1n), 0n) + BigInt(largestSymbolPrize(d));
      d.nominalReturn = {
        numerator: (weightedAwards * 15n).toString(),
        denominator: (BigInt(d.symbols.length * 32 + 1) ** 3n * 5n).toString(),
        description: "Independent three-reel weighted model, including the observed own prize for an all-wild line.",
        rounding: "Before per-line minor-unit flooring."
      };
    } else if (d.wildSymbol) {
      d.nominalReturn = { verified: false, description: "Independent wild-bearing model; aggregate return is not certified or inferred from the provider." };
    } else if (d.cols === 3) {
      const wheel = d.multiplierValues ?? [1];
      d.nominalReturn = {
        numerator: (d.symbols.reduce((sum, symbol) => sum + BigInt(symbol.pays[3]), 0n) * BigInt(wheel.reduce((a, b) => a + b, 0))).toString(),
        denominator: (512n * BigInt(wheel.length)).toString(),
        rounding: "Before per-line minor-unit flooring; independent uniform regular-symbol model."
      };
    } else d.nominalReturn = { ...calculateSlotReturn(d), rounding: "Before per-line minor-unit flooring." };
  }
  if (d.id === GAME_ID2) {
    d.multipliersBps = d.paytable.find((table) => table.mode === "easy").rows.map((row) => row.multiplierBps);
    d.returnBps = 9600;
  }
  d.maximumMultiplierBps = maximumMultiplier(d);
  const storageMax = 999999999999999n;
  const prizeBound = storageMax * 10000n / BigInt(d.maximumMultiplierBps);
  d.limits.maxBetMinor = ((prizeBound < storageMax ? prizeBound : storageMax) / 100n * 100n).toString();
  d.limits.maxWinMinor = payout(d.limits.maxBetMinor, d.maximumMultiplierBps);
  d.limits.policy = "server-game-policy-and-retained-account-house-reserve";
  d.limits.storageDerived = true;
  d.limits.testPresetsMinor = Array.from({ length: 20 }, (_, i) => String((i + 1) * 100));
  d.layout = officialLayout(d);
  d.modelDisclosure = {
    providerPrivateMathVerified: false,
    completeReferenceParityVerified: false,
    outcomeAuthority: "server-owned round state and bounded integer RNG",
    clientPayoutAccepted: false,
    returnIsIndependent: true
  };
  return d;
});
var listGameDefinitions2 = () => structuredClone(definitions3);
var getGameDefinition2 = (id) => structuredClone(definitions3.find((d) => d.id === id) ?? null);
function get(id, mode) {
  let d = definitions3.find((definition2) => definition2.id === id);
  if (!d) error("INVALID_GAME", "This official-catalogue entry has no independent model.");
  if (d.family === "ladder") {
    const selected = mode ?? d.defaultMode ?? "easy";
    if (!(d.modes ?? ["easy"]).includes(selected)) error("INVALID_MODE", "Choose a supported mode.");
    if (d.id === GAME_ID2) {
      const table = d.paytable.find((item) => item.mode === selected);
      d = { ...d, multipliersBps: table.rows.map((row) => row.multiplierBps) };
    }
  }
  return d;
}
function startOptions(d, options) {
  const allowed = d.family === "ladder" ? ["mode"] : d.family === "dice" ? ["target"] : d.gamble?.enabled ? ["holdWin"] : [];
  if (!record(options) || Object.keys(options).some((key) => !allowed.includes(key))) {
    error("INVALID_OPTIONS", "Only supported game choices are accepted.");
  }
  if (d.family === "ladder") get(d.id, options.mode);
  if (d.gamble?.enabled && options.holdWin !== void 0 && typeof options.holdWin !== "boolean") {
    error("INVALID_OPTIONS", "The held-win choice must be a boolean.");
  }
  if (d.family === "dice") {
    const target = options.target ?? d.defaultTarget;
    if (!Number.isInteger(target) || target < d.minTarget || target > d.maxTarget) {
      error("INVALID_TARGET", "Choose a supported integer target.");
    }
  }
  return options;
}
function actionOptions(d, options, collecting = false) {
  const allowed = !collecting && ["ladder", "mines"].includes(d.family) ? ["cell"] : !collecting && d.gamble?.enabled ? ["color"] : [];
  if (!record(options) || Object.keys(options).some((key) => !allowed.includes(key))) {
    error("INVALID_OPTIONS", "Only the current round action is accepted.");
  }
  if (!collecting && d.gamble?.enabled && !d.gamble.choices.includes(options.color)) error("INVALID_OPTIONS", "Choose red or black.");
  return options;
}
function acceptedBet(d, betMinor, options = {}) {
  return stake(betMinor, d.limits);
}
function maximumFor(d, bet, options = {}) {
  if (d.id === POWER_TIGER_ID) return maximumPowerTigerPayout(d, bet);
  if (d.family === "slots") {
    const lines = BigInt(d.paylines.length);
    return (lines * (BigInt(bet) * BigInt(largestSymbolPrize(d)) / lines) * BigInt(largestWheel(d)) * BigInt(d.gamble?.enabled && options.holdWin === true ? 2 ** d.gamble.maxRounds : 1)).toString();
  }
  if (d.family === "ladder") return payout(bet, d.multipliersBps.at(-1));
  if (d.family === "dice") return payout(bet, Math.floor(d.returnBps * 100 / (options.target ?? d.defaultTarget)));
  return payout(bet, d.maximumMultiplierBps);
}
function checked(round) {
  if (!record(round)) error("INVALID_ROUND", "A stored server round is required.");
  const d = get(round.gameId, round.mode);
  if (round.mathVersion !== d.mathVersion || round.family !== d.family || !["active", "lost", "collected"].includes(round.status) || !Array.isArray(round.history) || !Number.isSafeInteger(round.step) || round.step < 0 || typeof round.betMinor !== "string" || typeof round.winMinor !== "string" || !/^(0|[1-9][0-9]*)$/.test(round.winMinor) || !Number.isSafeInteger(round.multiplierBps) || round.multiplierBps < 0) {
    error("INVALID_ROUND", "Stored round identity or monetary state is invalid.");
  }
  acceptedBet(d, round.betMinor);
  if (round.status !== "collected" && round.winMinor !== "0") error("INVALID_ROUND", "Unsettled or lost rounds cannot contain a credited payout.");
  const options = d.family === "dice" ? { target: round.outcome?.target } : d.gamble?.enabled ? { holdWin: round.holdWin === true } : {};
  if (d.family === "dice") startOptions(d, options);
  if (BigInt(round.winMinor) > BigInt(maximumFor(d, round.betMinor, options))) error("INVALID_ROUND", "Stored payout exceeds the accepted model bound.");
  if (d.family === "slots") validateHeldSlot(d, round, maximumFor(d, round.betMinor));
  if (d.id === POWER_TIGER_ID) validatePowerTigerRound(d, round);
  if (d.id === PLINKO_CLASSIC && (!d.ballMultipliers.includes(round.ballMultiplier) || round.totalBetMinor !== round.betMinor || round.baseBetMinor !== round.betMinor || round.outcome?.ballMultiplier !== round.ballMultiplier || round.outcome?.totalBetMinor !== round.betMinor || round.outcome?.baseBetMinor !== round.baseBetMinor || !d.ballSelection.some((ball) => ball.type === round.outcome?.ballType && ball.multiplier === round.ballMultiplier) || round.outcome?.bucketMultiplierBps !== d.bucketMultipliersBps[round.outcome?.bucket] || round.multiplierBps !== round.outcome.bucketMultiplierBps * round.ballMultiplier || round.winMinor !== payout(round.betMinor, round.multiplierBps))) error("INVALID_ROUND", "The stored colored-ball award is inconsistent.");
  if (d.family === "ladder") {
    if (!Array.isArray(round.private?.survival) || round.private.survival.length !== d.multipliersBps.length || round.private.survival.some((value) => typeof value !== "boolean") || round.step < 1 || round.step > d.multipliersBps.length || round.history.length !== round.step) {
      error("INVALID_ROUND", "Stored ladder progress is invalid.");
    }
  }
  if (d.family === "mines") {
    const mines = round.private?.mines;
    if (!Array.isArray(mines) || mines.length !== d.mines || new Set(mines).size !== d.mines || mines.some((cell) => !Number.isSafeInteger(cell) || cell < 0 || cell >= d.cells) || round.step > d.maxPicks || round.history.length !== round.step) error("INVALID_ROUND", "Stored mine-board progress is invalid.");
  }
  if (d.crashMechanic === "cascade") validatePopxCascade(d, round);
  if (d.family === "crash" && d.crashMechanic !== "cascade" && (!Number.isSafeInteger(round.private?.bustMultiplierBps) || round.private.bustMultiplierBps < 1 || round.private.bustMultiplierBps > d.maxMultiplierBps + 1 || !Number.isSafeInteger(round.startedAt) || !Number.isSafeInteger(round.lastObservedAt) || round.startedAt < 0 || round.lastObservedAt < round.startedAt || round.step > 1)) {
    error("INVALID_ROUND", "Stored crash progress is invalid.");
  }
  return d;
}
function result(round) {
  checked(round);
  return round;
}
function startRound({ gameId, betMinor, options = {}, rng, now } = {}) {
  const initial = get(gameId);
  startOptions(initial, options);
  const d = get(gameId, options.mode);
  betMinor = acceptedBet(d, betMinor, options);
  if (d.id === POWER_TIGER_ID) return result(startPowerOfTiger(d, { betMinor, rng }));
  if (d.family === "slots") return result(holdSlotWin(
    d,
    d.id === MULTI_HOT_WAYS_ID ? startObservedRegularWays(d, { betMinor, rng }) : d.ways ? startObservedWildWays(d, { betMinor, rng }) : d.wildSymbol ? startPublicWildSlot(d, { betMinor, rng }) : d.cols === 3 ? startThreeReelSlot(d, { betMinor, rng }) : startSlot(d, { betMinor, rng }),
    options.holdWin
  ));
  if (d.crashMechanic === "cascade") return result(startPopxCascade(d, { betMinor, rng, now }));
  if (d.family === "crash") return result(startCrash(d, { betMinor, rng, now }));
  if (d.family === "ladder") return result({ ...startLadder(d, { betMinor, rng }), mode: options.mode ?? d.defaultMode ?? "easy" });
  if (d.family === "mines") return result(startMines(d, { betMinor, rng }));
  const instant = startInstant(d, { betMinor, options, rng });
  if (d.id !== PLINKO_CLASSIC) return result(instant);
  const ticket = draw(rng, d.ballSelection.reduce((sum, ball2) => sum + ball2.weight, 0));
  let cursor = 0;
  const ball = d.ballSelection.find((candidate) => (cursor += candidate.weight) > ticket);
  const factors = { ballMultiplier: ball.multiplier, baseBetMinor: betMinor, totalBetMinor: betMinor };
  const multiplierBps = instant.multiplierBps * ball.multiplier, winMinor = payout(betMinor, multiplierBps);
  return result({
    ...instant,
    ...factors,
    multiplierBps,
    winMinor,
    outcome: { ...instant.outcome, ...factors, ballType: ball.type, bucketMultiplierBps: instant.multiplierBps, multiplierBps }
  });
}
function advanceRound(round, options = {}, now, rng) {
  const d = checked(round);
  actionOptions(d, options);
  if (d.gamble?.enabled) return result(gambleSlotWin(d, round, options, rng));
  if (d.crashMechanic === "cascade") {
    if (round.status !== "active") error("ROUND_FINISHED", "This cascade round has settled.");
    return result(syncPopxCascade(d, round, now));
  }
  if (d.family === "crash") return result(advanceCrash(d, round, options, now));
  if (d.family === "ladder") return result(advanceLadder(d, round, options));
  if (d.family === "mines") return result(advanceMines(d, round, options));
  error("ROUND_FINISHED", "This round has settled.");
}
function collectRound(round, options = {}, now) {
  const d = checked(round);
  actionOptions(d, options, true);
  if (d.gamble?.enabled) return result(collectSlotWin(d, round));
  if (d.crashMechanic === "cascade") return result(collectPopxCascade(d, round, now));
  if (d.family === "crash") return result(collectCrash(d, round, options, now));
  if (d.family === "ladder") return result(collectLadder(d, round));
  if (d.family === "mines") return result(collectMines(d, round));
  error("ROUND_FINISHED", "This round has settled.");
}
function publicRound(round, now) {
  const d = checked(round);
  let view;
  if (d.family === "slots") view = d.gamble?.enabled ? publicHeldSlot(d, round) : publicSlot(round);
  else if (d.crashMechanic === "cascade") view = publicPopxCascade(d, round, now);
  else if (d.family === "crash") view = publicCrash(d, round, now);
  else if (d.family === "ladder") view = { ...publicLadder(d, round), mode: round.mode ?? d.defaultMode ?? "easy" };
  else if (d.family === "mines") view = publicMines(d, round);
  else view = publicInstant(round);
  if (d.id === PLINKO_CLASSIC) Object.assign(view, {
    ballMultiplier: round.ballMultiplier,
    baseBetMinor: round.baseBetMinor,
    totalBetMinor: round.totalBetMinor
  });
  return structuredClone(view);
}
function reconcileRound(round, now) {
  const d = checked(round);
  if (d.crashMechanic === "cascade") return round.status === "active" ? result(syncPopxCascade(d, round, now)) : round;
  return d.family === "crash" && round.status === "active" ? result(syncCrash(d, round, now)) : round;
}
function maximumPayoutMinor({ gameId, betMinor, options = {} } = {}) {
  const initial = get(gameId);
  startOptions(initial, options);
  const d = get(gameId, options.mode);
  return maximumFor(d, acceptedBet(d, betMinor, options), options);
}
function modelAuditMatrix() {
  return definitions3.map((d) => {
    const optionSets = d.family === "ladder" ? (d.modes ?? ["easy"]).map((mode) => ({ mode })) : d.family === "dice" ? Array.from({ length: d.maxTarget - d.minTarget + 1 }, (_, i) => ({ target: d.minTarget + i })) : d.gamble?.enabled ? [{ holdWin: false }, { holdWin: true }] : [{}];
    return {
      id: d.id,
      title: d.catalogName,
      family: d.family,
      mathVersion: d.mathVersion,
      layout: structuredClone(d.layout),
      independentReturn: structuredClone(d.nominalReturn ?? null),
      optionPayoutBounds: optionSets.map((options) => ({
        options,
        minimumStakeMaximumPayoutMinor: maximumPayoutMinor({ gameId: d.id, betMinor: d.limits.minBetMinor, options }),
        maximumStakeMaximumPayoutMinor: maximumPayoutMinor({ gameId: d.id, betMinor: d.limits.maxBetMinor, options })
      })),
      fullReferenceParityVerified: false,
      providerPrivateMathVerified: false
    };
  });
}

// server/existing-library74-adapter.mjs
var BRIDGE_VERSION = "library74-v1";
var LIBRARY74_MIN_STAKE_MINOR = "100";
var LIBRARY74_TEST_PRESETS_MINOR = Array.from({ length: 20 }, (_, i) => String((i + 1) * 100));
var MINOR = /^(0|[1-9][0-9]*)$/;
var ID = /^ind74_official_[a-z0-9_]{1,48}$/;
var FAMILIES = /* @__PURE__ */ new Set(["slots", "crash", "ladder", "mines", "wheel", "plinko", "dice"]);
var MAX_MINOR = 999999999999999n;
var PUBLIC_FIELDS = ["rows", "cols", "cells", "mines", "minMatch", "cascadeMs", "crashMechanic", "cascadeRules", "maxPicks", "maxSteps", "modes", "defaultMode", "minTarget", "maxTarget", "defaultTarget", "maxMultiplierBps", "maximumMultiplierBps", "growthBpsPerSecond", "multiplierValues", "multipliersBps", "bucketMultipliersBps", "observedPegboard", "implementedBallMultiplier", "wildSymbol", "wildRule", "ballMultipliers", "ballSelectionModel", "baseGameMultiplier", "respinFeature"];
var ROUND_FIELDS = ["gameId", "mathVersion", "family", "betMinor", "winMinor", "step", "multiplierBps", "maxSteps", "history", "nextMultiplierBps", "collectibleMinor", "revealedCells", "path", "cells", "rows", "cols", "mines", "mode", "startedAt", "serverNow", "growthBpsPerSecond", "maxMultiplierBps", "pendingResolution", "pendingWinMinor", "gambleHistory", "gambleRounds", "maxGambleRounds", "holdWin", "ballMultiplier", "baseBetMinor", "totalBetMinor", "crashMechanic", "cascadeIndex", "nextCascadeAt", "grid", "matchedPositions", "matchedSymbols"];
var clone = (value) => structuredClone(value);
var plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
function fail(code, status = 422) {
  throw Object.assign(new Error(code), { code, status });
}
function integerMoney(value, code = "INVALID_ENGINE_MONEY") {
  if (typeof value !== "string" || !MINOR.test(value) || BigInt(value) > MAX_MINOR) fail(code, 500);
  return BigInt(value);
}
function clock(value) {
  if (!Number.isSafeInteger(value) || value < 0) fail("INVALID_SERVER_TIME", 500);
  return value;
}
function minorToMoney(value) {
  const n = integerMoney(value);
  return `${n / 100n}.${String(n % 100n).padStart(2, "0")}`;
}
function integerRngFromLibrary(random) {
  if (typeof random !== "function") fail("SERVER_RANDOM_REQUIRED", 500);
  const range = 2 ** 53;
  return (bound) => {
    if (!Number.isSafeInteger(bound) || bound < 1) fail("INVALID_RNG_BOUND", 500);
    const limit = Math.floor(range / bound) * bound;
    for (let attempt = 0; attempt < 1024; attempt++) {
      const unit = random();
      if (typeof unit !== "number" || !Number.isFinite(unit) || unit < 0 || unit >= 1) fail("INVALID_SERVER_RANDOM", 500);
      const sample = Math.floor(unit * range);
      if (sample < limit) return sample % bound;
    }
    fail("SERVER_RANDOM_REJECTION_LIMIT", 500);
  };
}
function publishedTable(value) {
  if (Array.isArray(value)) return value.map(publishedTable);
  if (!plain(value)) return clone(value);
  return Object.fromEntries(Object.entries(value).filter(([key]) => !/weight|probability|survival|private|secret|seed|ticket|returnBps/i.test(key)).map(([key, item]) => [key, publishedTable(item)]));
}
function effectiveLimits(definition2, policy) {
  const limits = Object.fromEntries(["minBetMinor", "maxBetMinor", "betStepMinor", "maxWinMinor"].map((key) => {
    integerMoney(definition2.limits?.[key]);
    return [key, definition2.limits[key]];
  }));
  limits.minBetMinor = LIBRARY74_MIN_STAKE_MINOR;
  limits.testPresetsMinor = [...LIBRARY74_TEST_PRESETS_MINOR];
  limits.policy = "server-game-policy-and-retained-account-house-reserve";
  if (!policy) return { ...limits, maxBetMinor: null, maxWinMinor: null };
  if (!plain(policy)) fail("INVALID_LIBRARY74_BET_POLICY", 500);
  for (const key of ["maxBetMinor", "maxWinMinor"]) {
    integerMoney(policy[key], "INVALID_LIBRARY74_BET_POLICY");
    if (BigInt(policy[key]) <= 0n) fail("INVALID_LIBRARY74_BET_POLICY", 500);
    if (BigInt(policy[key]) < BigInt(limits[key])) limits[key] = policy[key];
  }
  const possible = BigInt(limits.maxBetMinor) * BigInt(definition2.maximumMultiplierBps) / 10000n;
  if (possible < BigInt(limits.maxWinMinor)) limits.maxWinMinor = possible.toString();
  if (BigInt(limits.minBetMinor) > BigInt(limits.maxBetMinor) || BigInt(limits.betStepMinor) === 0n) fail("INVALID_LIBRARY74_BET_POLICY", 500);
  return limits;
}
function acceptedStartStake(definition2, value, policy) {
  if (typeof value !== "string" || value.length > 15 || !MINOR.test(value)) fail("INVALID_BET");
  if (!policy) fail("BET_LIMITS_UNVERIFIED", 503);
  const amount = BigInt(value), limits = effectiveLimits(definition2, policy);
  if (amount < BigInt(limits.minBetMinor) || amount > BigInt(limits.maxBetMinor) || amount % BigInt(limits.betStepMinor) !== 0n) fail("INVALID_BET");
  return limits;
}
function publicLibrary74Definition(definition2, { accepting = false, policy = null } = {}) {
  if (!definition2 || !ID.test(definition2.id) || !FAMILIES.has(definition2.family) || typeof definition2.mathVersion !== "string") fail("INVALID_LIBRARY74_DEFINITION", 500);
  const version = `${BRIDGE_VERSION}:${definition2.mathVersion}`;
  if (version.length > 100) fail("INVALID_LIBRARY74_VERSION", 500);
  const limits = effectiveLimits(definition2, policy);
  const view = {
    id: definition2.id,
    title: definition2.title,
    name: definition2.catalogName,
    catalogName: definition2.catalogName,
    family: definition2.family,
    sourceCategory: definition2.sourceCategory,
    version,
    mathVersion: definition2.mathVersion,
    currency: "ETB",
    limits,
    minStake: minorToMoney(limits.minBetMinor),
    maxStake: limits.maxBetMinor === null ? null : minorToMoney(limits.maxBetMinor),
    betStep: minorToMoney(limits.betStepMinor),
    independentModel: true,
    providerPrivateMathVerified: false,
    completeReferenceParityVerified: false,
    modelDisclosure: { providerPrivateMathVerified: false, completeReferenceParityVerified: false, outcomeAuthority: "server-owned round state and bounded integer RNG", clientPayoutAccepted: false, returnIsIndependent: true },
    launchable: accepting === true && policy !== null,
    accepting: accepting === true && policy !== null,
    controls: { actions: ["crash", "ladder", "mines"].includes(definition2.family) ? ["reveal", "collect", ...definition2.family === "crash" ? ["sync"] : []] : definition2.gamble?.enabled ? ["gamble", "collect"] : [] },
    expiryPolicy: definition2.family === "crash" ? "server_terminal_result" : "collect_earned_award_or_return_unplayed_stake"
  };
  for (const key of PUBLIC_FIELDS) if (definition2[key] !== void 0) view[key] = publishedTable(definition2[key]);
  if (definition2.theme) view.theme = publishedTable(definition2.theme);
  if (definition2.layout) view.layout = publishedTable(definition2.layout);
  if (definition2.rules) view.rules = definition2.rules.filter((rule) => typeof rule === "string");
  if (definition2.gamble) view.gamble = publishedTable(definition2.gamble);
  if (definition2.ballSelection) view.ballTypes = definition2.ballSelection.map(({ type, multiplier }) => ({ type, multiplier }));
  if (definition2.symbols) view.symbols = definition2.symbols.map(({ id, label, glyph, pays }) => ({ id, label, glyph, pays: clone(pays) }));
  if (definition2.ways) view.ways = definition2.ways;
  else if (definition2.paylines) view.paylines = clone(definition2.paylines);
  if (definition2.sectors) view.sectors = definition2.sectors.map(({ id, label, multiplierBps }) => ({ id, label, multiplierBps }));
  if (definition2.paytable) view.paytable = publishedTable(definition2.paytable);
  return view;
}
function mathOperation(operation) {
  try {
    return operation();
  } catch (error3) {
    if (Number.isInteger(error3?.status)) throw error3;
    const code = typeof error3?.code === "string" ? error3.code : "LIBRARY74_ENGINE_FAILURE";
    if (/^INVALID_(BET|MODE|CELL|TARGET|OPTIONS)$/.test(code)) fail(code, 422);
    if (["ROUND_FINISHED", "NO_PROGRESS"].includes(code)) fail(code, 409);
    fail(code, 500);
  }
}
function createExistingLibrary74Adapter({ math = official72_exports, reviewedGameIds = [], allowNewRounds = false, gameLimits = {}, activeTtlMs = 15 * 60 * 1e3 } = {}) {
  if (["listGameDefinitions", "getGameDefinition", "startRound", "advanceRound", "collectRound", "publicRound", "reconcileRound", "maximumPayoutMinor"].some((key) => typeof math[key] !== "function")) throw new TypeError("The complete official72 server math contract is required.");
  if (!Number.isSafeInteger(activeTtlMs) || activeTtlMs < 1e3 || activeTtlMs > 864e5) throw new TypeError("Use a reviewed active-round timeout from one second through one day.");
  if (typeof allowNewRounds !== "boolean" && typeof allowNewRounds !== "function") throw new TypeError("New-round readiness must be a boolean or a function.");
  const source2 = math.listGameDefinitions();
  const originals = new Map(source2.map((definition3) => {
    publicLibrary74Definition(definition3);
    return [definition3.id, clone(definition3)];
  }));
  if (originals.size !== source2.length) throw new TypeError("Duplicate official catalogue game IDs.");
  if (!Array.isArray(reviewedGameIds) || new Set(reviewedGameIds).size !== reviewedGameIds.length || reviewedGameIds.some((id) => !originals.has(id))) throw new TypeError("Reviewed game IDs must be distinct members of this adapter.");
  const reviewed = new Set(reviewedGameIds);
  if (!plain(gameLimits) && typeof gameLimits !== "function") throw new TypeError("Server game limits must be an ID map or a server resolver.");
  const policyFor = (id) => typeof gameLimits === "function" ? gameLimits(id) : gameLimits[id];
  const enabled = (id) => Boolean(policyFor(id)) && reviewed.has(id) && (typeof allowNewRounds === "function" ? allowNewRounds(id) === true : allowNewRounds === true);
  const definition2 = (id) => {
    const result3 = originals.get(id);
    if (!result3) fail("GAME_MODEL_UNAVAILABLE", 409);
    return result3;
  };
  const checked2 = (state) => {
    if (!plain(state) || state.bridgeVersion !== BRIDGE_VERSION || !plain(state.mathState)) fail("INVALID_LIBRARY74_STATE", 500);
    const d = definition2(state.gameId);
    if (state.mathState.gameId !== d.id || state.mathState.mathVersion !== d.mathVersion || state.modelVersion !== `${BRIDGE_VERSION}:${d.mathVersion}` || state.mathState.betMinor !== state.stakeMinor || state.family !== d.family) fail("INVALID_LIBRARY74_STATE", 500);
    integerMoney(state.stakeMinor);
    integerMoney(state.maximumPayoutMinor);
    clock(state.expiresAt);
    clock(state.lastActionAt);
    if (!["active", "settled"].includes(state.status) || state.status === "active" !== (state.mathState.status === "active")) fail("INVALID_LIBRARY74_STATE", 500);
    if (state.mathState.pendingWinMinor !== void 0 && integerMoney(state.mathState.pendingWinMinor) > BigInt(state.maximumPayoutMinor)) fail("PAYOUT_EXCEEDS_RESERVED_LIABILITY", 500);
    if (state.status === "settled" && (state.payoutMinor !== (state.mathState.status === "collected" ? state.mathState.winMinor : "0") || integerMoney(state.payoutMinor) > BigInt(state.maximumPayoutMinor))) fail("INVALID_LIBRARY74_STATE", 500);
    return d;
  };
  function deadline(d, round, now) {
    if (round.status !== "active") return now;
    if (d.family !== "crash") {
      const heldSlot = d.family === "slots" && d.gamble?.enabled === true && Number.isSafeInteger(d.gamble.maxRounds) && d.gamble.maxRounds > 0 && round.holdWin === true && integerMoney(round.pendingWinMinor) > 0n;
      if (!["ladder", "mines"].includes(d.family) && !heldSlot) fail("UNREVIEWED_ACTIVE_FAMILY", 500);
      return clock(now + activeTtlMs);
    }
    if (d.crashMechanic === "cascade") return clock(round.private?.terminalAt);
    const bust = round.private?.bustMultiplierBps;
    if (!Number.isSafeInteger(bust) || !Number.isSafeInteger(d.growthBpsPerSecond) || d.growthBpsPerSecond <= 0 || !Number.isSafeInteger(d.maxMultiplierBps)) fail("INVALID_CRASH_TERMINAL", 500);
    const target = Math.min(bust, d.maxMultiplierBps);
    const duration = (BigInt(target - 1e4) * 1000n + BigInt(d.growthBpsPerSecond) - 1n) / BigInt(d.growthBpsPerSecond);
    return clock(round.startedAt + Number(duration));
  }
  function result2(d, round, { previous, maximum, debit, now, reason } = {}) {
    if (!plain(round) || round.gameId !== d.id || round.mathVersion !== d.mathVersion || !["active", "lost", "collected"].includes(round.status)) fail("INVALID_ENGINE_RESULT", 500);
    integerMoney(round.betMinor);
    const award = integerMoney(round.winMinor);
    const bound = integerMoney(maximum);
    if (award > bound || previous && (round.betMinor !== previous.stakeMinor || maximum !== previous.maximumPayoutMinor)) fail("PAYOUT_EXCEEDS_RESERVED_LIABILITY", 500);
    if (round.pendingWinMinor !== void 0 && integerMoney(round.pendingWinMinor) > bound) fail("PAYOUT_EXCEEDS_RESERVED_LIABILITY", 500);
    const settled = round.status !== "active";
    const payoutMinor = settled ? round.status === "collected" ? round.winMinor : "0" : null;
    const state = {
      bridgeVersion: BRIDGE_VERSION,
      gameId: d.id,
      modelVersion: `${BRIDGE_VERSION}:${d.mathVersion}`,
      family: d.family,
      stakeMinor: round.betMinor,
      maximumPayoutMinor: maximum,
      status: settled ? "settled" : "active",
      expiresAt: settled ? now : previous?.expiresAt ?? deadline(d, round, now),
      lastActionAt: now,
      mathState: clone(round),
      ...settled ? { payoutMinor } : {},
      ...reason ? { settlementReason: reason } : {}
    };
    if (!settled && state.expiresAt <= now) fail("INVALID_ACTIVE_ENGINE_STATE", 500);
    return { state, debitMinor: debit, maxPayoutMinor: maximum, payoutMinor };
  }
  function expire(state, _random, at) {
    const d = checked2(state), now = clock(at);
    if (state.status !== "active") fail("ROUND_ALREADY_SETTLED", 409);
    if (now < state.expiresAt || now < state.lastActionAt) fail("ROUND_NOT_EXPIRED", 409);
    let round = clone(state.mathState), reason;
    if (d.family === "crash") {
      round = mathOperation(() => math.reconcileRound(round, now));
      if (round.status === "active") fail("CRASH_TERMINAL_NOT_SETTLED", 500);
      reason = "SERVER_CRASH_TERMINAL";
    } else if (d.family === "slots" && d.gamble?.enabled === true && integerMoney(round.pendingWinMinor) > 0n || round.step > 0) {
      round = mathOperation(() => math.collectRound(round, {}, now));
      reason = "EXPIRED_EARNED_AWARD";
    } else {
      if (d.family !== "mines" || round.history?.length) fail("UNREVIEWED_EXPIRY_POLICY", 500);
      if (BigInt(round.betMinor) > BigInt(state.maximumPayoutMinor)) fail("PAYOUT_EXCEEDS_RESERVED_LIABILITY", 500);
      round = { ...round, status: "collected", winMinor: round.betMinor, multiplierBps: 1e4 };
      reason = "EXPIRED_UNPLAYED_STAKE_RETURN";
    }
    return result2(d, round, { previous: state, maximum: state.maximumPayoutMinor, debit: "0", now, reason });
  }
  const adapter = {
    get definitions() {
      return Object.fromEntries([...originals].map(([id, d]) => [id, publicLibrary74Definition(d, { accepting: enabled(id), policy: policyFor(id) })]));
    },
    has: (id) => originals.has(id),
    start(gameId, options, random, at) {
      const d = definition2(gameId), now = clock(at);
      if (!enabled(gameId)) fail("INDEPENDENT74_NEW_ROUNDS_DISABLED", 503);
      if (!plain(options) || typeof options.stakeMinor !== "string") fail("INVALID_LIBRARY_OPTIONS");
      const { stakeMinor, ...gameOptions } = options;
      const limits = acceptedStartStake(d, stakeMinor, policyFor(gameId));
      const maximum = mathOperation(() => math.maximumPayoutMinor({ gameId, betMinor: stakeMinor, options: gameOptions }));
      integerMoney(maximum);
      if (BigInt(maximum) > BigInt(limits.maxWinMinor)) fail("PAYOUT_LIMIT_EXCEEDED", 422);
      const round = mathOperation(() => math.startRound({ gameId, betMinor: stakeMinor, options: gameOptions, rng: integerRngFromLibrary(random), now }));
      if (round.status === "active" && d.family === "mines" && BigInt(maximum) < BigInt(stakeMinor)) fail("UNPLAYED_REFUND_NOT_RESERVED", 500);
      return result2(d, round, { maximum, debit: stakeMinor, now });
    },
    act(state, input, random, at) {
      const d = checked2(state), now = clock(at);
      if (state.status !== "active") fail("ROUND_ALREADY_SETTLED", 409);
      if (now < state.lastActionAt) fail("INVALID_SERVER_TIME", 500);
      if (now >= state.expiresAt) return expire(state, random, now);
      if (!plain(input) || !["reveal", "collect", "sync", "gamble"].includes(input.type)) fail("INVALID_LIBRARY_ACTION");
      const { type, ...options } = input;
      const allowed = type === "reveal" && ["mines", "ladder"].includes(d.family) ? ["cell"] : type === "gamble" && d.family === "slots" && d.gamble?.enabled === true ? ["color"] : [];
      if (Object.keys(options).some((key) => !allowed.includes(key)) || type === "sync" && d.family !== "crash" || type === "gamble" && (d.family !== "slots" || d.gamble?.enabled !== true) || type === "reveal" && d.family === "slots") fail("INVALID_LIBRARY_OPTIONS");
      const previousRound = clone(state.mathState);
      const round = mathOperation(() => type === "collect" ? math.collectRound(previousRound, options, now) : type === "sync" ? math.reconcileRound(previousRound, now) : math.advanceRound(previousRound, options, now, integerRngFromLibrary(random)));
      return result2(d, round, { previous: state, maximum: state.maximumPayoutMinor, debit: "0", now });
    },
    publicState(state, at) {
      const d = checked2(state), now = clock(at);
      const publicRound2 = mathOperation(() => math.publicRound(clone(state.mathState), Math.max(now, state.lastActionAt)));
      const view = Object.fromEntries(ROUND_FIELDS.filter((key) => publicRound2[key] !== void 0).map((key) => [key, publishedTable(publicRound2[key])]));
      view.family = d.family;
      view.status = state.status;
      view.resultStatus = state.mathState.status;
      view.stakeMinor = state.stakeMinor;
      const actions = state.status === "active" ? publicRound2.allowedActions || [] : [];
      view.allowedActions = actions.filter((action) => ["reveal", "collect", "gamble"].includes(action));
      view.actions = [...view.allowedActions, ...state.status === "active" && d.family === "crash" ? ["sync"] : []];
      if (state.status === "settled") {
        view.payoutMinor = state.payoutMinor;
        if (publicRound2.outcome !== void 0) view.outcome = publishedTable(publicRound2.outcome);
        if (publicRound2.mineCells !== void 0) view.mineCells = clone(publicRound2.mineCells);
        if (publicRound2.bustMultiplierBps !== void 0) view.bustMultiplierBps = publicRound2.bustMultiplierBps;
        if (state.settlementReason) view.settlementReason = state.settlementReason;
      } else {
        if (d.family !== "crash") view.expiresAt = state.expiresAt;
        if ((d.family === "slots" || d.crashMechanic === "cascade") && publicRound2.outcome !== void 0) view.outcome = publishedTable(publicRound2.outcome);
      }
      return view;
    },
    expire
  };
  return adapter;
}
function composeExistingLibrary74Registry(existing, adapter) {
  if (typeof existing?.get !== "function" || typeof existing?.definitions !== "function" || typeof adapter?.start !== "function") throw new TypeError("The retained registry and the new game adapter are required.");
  const ids2 = new Set(Object.keys(adapter.definitions));
  for (const id of ids2) {
    let prior;
    try {
      prior = existing.get(id, adapter.definitions[id].version);
    } catch (error3) {
      if (error3?.message !== "GAME_MODEL_UNAVAILABLE" && error3?.code !== "GAME_MODEL_UNAVAILABLE") throw error3;
    }
    if (prior) throw new Error("DUPLICATE_LIBRARY74_MODEL");
  }
  return {
    ...existing,
    definitions: () => ({ ...existing.definitions(), ...adapter.definitions }),
    get(id, version) {
      if (!ids2.has(id)) return existing.get(id, version);
      const definition2 = adapter.definitions[id];
      if (version !== void 0 && version !== definition2.version) return existing.get(id, version);
      return { id, version: definition2.version, definition: definition2, adapter };
    }
  };
}

// server/existing-library74-service.mjs
var plain2 = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
var fail2 = (code, status = 422) => {
  throw Object.assign(new Error(code), { code, status });
};
function trustedUser(userId) {
  if (typeof userId !== "string" || !userId || userId.length > 100 || userId.startsWith("@") || /[\r\n]/.test(userId)) fail2("RESOLVED_PLAYER_ID_REQUIRED", 401);
  return userId;
}
function installExistingLibrary74({ service, ...adapterOptions } = {}) {
  if (typeof service?.state !== "function" || typeof service?.action !== "function" || typeof service?.snapshot !== "function" || typeof service?.view !== "function" || typeof service?.shared?.transaction !== "function") throw new TypeError("An existing initialized LibraryService instance is required.");
  const adapter = createExistingLibrary74Adapter(adapterOptions);
  const registry = composeExistingLibrary74Registry(service.registry, adapter);
  service.registry = registry;
  const gameId = (id) => {
    if (!adapter.has(id)) fail2("GAME_MODEL_UNAVAILABLE", 404);
    return id;
  };
  const definitions5 = () => Object.values(adapter.definitions).map((definition2) => {
    const accepting = service.accepting === true && definition2.accepting === true;
    return { ...definition2, accepting, launchable: accepting };
  });
  function publicSnapshot(snapshot) {
    const definition2 = definitions5().find((game) => game.id === gameId(snapshot.game_id));
    if (snapshot.currency !== "ETB" || typeof snapshot.balance !== "string" || !/^(0|[1-9]\d*)\.\d{2}$/.test(snapshot.balance)) fail2("INVALID_ACCOUNT_SNAPSHOT", 500);
    if (snapshot.current_balance !== void 0 && (typeof snapshot.current_balance !== "string" || !/^(0|[1-9]\d*)\.\d{2}$/.test(snapshot.current_balance))) fail2("INVALID_ACCOUNT_SNAPSHOT", 500);
    const { user_id: _user, ...result2 } = snapshot;
    if (result2.round) {
      const { revealed_seed: _seed, ...round } = result2.round;
      result2.round = round;
    }
    return { ...result2, authenticated: true, currency: "ETB", game: definition2, model_version: definition2.version, accepting: snapshot.accepting === true && definition2.accepting === true };
  }
  return {
    service,
    adapter,
    registry,
    definitions: definitions5,
    state: async (userId, id) => publicSnapshot(await service.state(trustedUser(userId), gameId(id))),
    action: async (userId, input) => {
      if (!plain2(input)) fail2("INVALID_LIBRARY_REQUEST");
      gameId(input.game_id);
      return publicSnapshot(await service.action(trustedUser(userId), input));
    },
    async history(userId, id, { limit = 20 } = {}) {
      trustedUser(userId);
      gameId(id);
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) fail2("INVALID_HISTORY_LIMIT");
      if (!service.ready) fail2("LIBRARY_UNAVAILABLE", 503);
      return service.shared.transaction(userId, async (tx) => {
        const now = service.now();
        const snapshot = publicSnapshot(await service.snapshot(tx, userId, id, now));
        const rows = await tx.unsafe("SELECT * FROM sw_native_library.rounds WHERE user_id=$1 AND game_id=$2 ORDER BY created_at DESC,id DESC LIMIT $3", [userId, id, limit]);
        const history = rows.map((row) => {
          const { revealed_seed: _seed, ...round } = service.view(row, now);
          return { ...round, created_at: Number(row.created_at), settled_at: row.settled_at === null ? null : Number(row.settled_at) };
        });
        return { ...snapshot, history };
      });
    }
  };
}

// server/protected74-review.mjs
var PROTECTED74_PREFIX = "/api/slots/independent74/";
var PROTECTED74_NEW_ROUNDS_ENABLED = false;
var ACTUAL_PROTECTED_RUNTIME_SHA256 = "c434a085e736326db5f9c8822bf1feb8212073495174889527a0655e9a5b5c91";
var PROTECTED_EXISTING_MODELS = Object.freeze({
  ind74_official_multihot40: "multi_hot_40",
  ind74_official_multihot5superwilds: "multi_hot_5_super_wilds",
  ind74_official_burningice: "burning_ice",
  ind74_official_wildmultistars: "wild_multi_stars",
  ind74_official_safarisimba: "safari_simba",
  ind74_official_junglesisters: "jungle_sisters",
  ind74_official_baoslot5x: "bao_slot_5x",
  ind74_official_multihot100: "multi_hot_100",
  ind74_official_multihot5: "multi_hot_5_video",
  ind74_official_foxyhot20: "hot_foxy_20"
});
var definitions4 = listGameDefinitions2().filter((d) => !Object.hasOwn(PROTECTED_EXISTING_MODELS, d.id));
if (definitions4.length !== 64) throw Error("PROTECTED74_EXPECTED_64_MISSING_MODELS");
var ids = new Set(definitions4.map((d) => d.id));
var protected64Math = Object.freeze({
  ...official72_exports,
  listGameDefinitions: () => structuredClone(definitions4),
  getGameDefinition: (id) => ids.has(id) ? getGameDefinition2(id) : null
});
var reviewAdapter = createExistingLibrary74Adapter({ math: protected64Math, reviewedGameIds: [], allowNewRounds: false, gameLimits: {} });
var sha = (value) => createHash("sha256").update(value).digest("hex");
var integer = (value) => {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) throw Error("CANONICAL_INTEGER_MONEY_REQUIRED");
  return BigInt(value);
};
var protectedMinorToCoreUnits = (value) => (integer(value) * 100n).toString();
var protectedCoreUnitsToMinor = (value) => (integer(value) / 100n).toString();
function protectedDecimalToMinor(value) {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)(?:\.[0-9]{1,4})?$/.test(value)) throw Error("EXACT_PROTECTED_DECIMAL_REQUIRED");
  const [whole, fraction = ""] = value.split(".");
  return protectedCoreUnitsToMinor((BigInt(whole) * 10000n + BigInt(fraction.padEnd(4, "0"))).toString());
}
function validateProtected74MachineSessionHeaders(request, { playerOrigin, sessionId } = {}) {
  session(request);
  if (request.method !== "POST" || request.headers.get("origin") !== playerOrigin) throw error2("INVALID_ORIGIN", 403);
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? "")) throw error2("JSON_REQUIRED", 415);
  if (typeof sessionId !== "string" || !/^[a-f0-9]{64}$/.test(sessionId)) throw error2("VERIFIED_MACHINE_SESSION_REQUIRED", 503);
  if (request.headers.get("x-zplay-machine-session") !== sessionId) throw error2("PLAYER_SESSION_CHANGED", 403);
  return true;
}
function protected74ReviewReadiness(evidence = {}) {
  const required = [
    "sameProtectedDatabaseVerified",
    "actualSchemaConstraintsVerified",
    "retainedFinancialClassHashesVerified",
    "protectedSessionResolverVerified",
    "protectedMachineSessionGuardVerified",
    "accountCapsAndHouseReserveVerified",
    "reciprocalLegacyAdmissionGuardVerified",
    "canonicalUserHouseRowLockOrderVerified",
    "all74ReferenceEvidenceComplete",
    "persistentPerPlayerGameStakeCarryVerified",
    "verifiedPerGamePolicy"
  ];
  const reasons = required.filter((key) => evidence[key] !== true).map((key) => "MISSING_" + key.replace(/[A-Z]/g, (c) => "_" + c).toUpperCase());
  return {
    reviewOnly: true,
    newRoundsEnabled: false,
    hardGate: "PROTECTED74_NEW_ROUNDS_ENABLED=false",
    readyForSeparateReleaseReview: reasons.length === 0,
    reasons
  };
}
function protected74ReviewCatalog() {
  return {
    currency: "ETB",
    reviewOnly: true,
    new_rounds_enabled: false,
    existing_models: PROTECTED_EXISTING_MODELS,
    existing_unique_catalogue_count: 10,
    additional_models: 64,
    total_catalogue_identities: 74,
    games: Object.values(reviewAdapter.definitions)
  };
}
function attachProtected74ReviewModels({ retainedLibrary, evidence = {} } = {}) {
  const readiness = protected74ReviewReadiness(evidence);
  if (!retainedLibrary) throw Error("EXISTING_RETAINED_LIBRARY_INSTANCE_REQUIRED");
  if (evidence.sameProtectedDatabaseVerified !== true || evidence.actualSchemaConstraintsVerified !== true || evidence.retainedFinancialClassHashesVerified !== true) throw Error("ACTUAL_PROTECTED_DATABASE_AND_RETAINED_CLASS_PROOF_REQUIRED");
  const facade = installExistingLibrary74({ service: retainedLibrary, math: protected64Math, reviewedGameIds: [], allowNewRounds: false, gameLimits: {} });
  return { facade, readiness };
}
var response = (data, status = 200) => Response.json(data, { status, headers: { "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
function error2(code, status) {
  return Object.assign(new Error(code), { status });
}
function session(request) {
  const parts = (request.headers.get("cookie") ?? "").split(";").map((x) => x.trim()).filter((x) => x.startsWith("sw_session="));
  if (parts.length !== 1 || !/^sw_session=[a-f0-9]{64}$/.test(parts[0])) throw error2("PLAYER_LOGIN_REQUIRED", 401);
  return parts[0].slice(11);
}
function createProtected74ReviewNamespace({ previous, facade = null, evidence = {}, resolveAuthenticatedPlayer = null } = {}) {
  if (typeof previous?.fetch !== "function") throw new TypeError("The exact existing protected fetch handler is required.");
  const readiness = protected74ReviewReadiness(evidence);
  return { ...previous, async fetch(request, ...rest) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith(PROTECTED74_PREFIX)) return previous.fetch.call(previous, request, ...rest);
    const route = url.pathname.slice(PROTECTED74_PREFIX.length);
    if (route === "catalog" && request.method === "GET") return response({ ...protected74ReviewCatalog(), readiness });
    if (!["state", "history", "action"].includes(route)) return response({ error: { code: "NOT_FOUND" } }, 404);
    if (request.method !== (route === "action" ? "POST" : "GET")) return response({ error: { code: "METHOD_NOT_ALLOWED" } }, 405);
    if (route === "action") return response({ error: { code: "PROTECTED74_REVIEW_ONLY_NEW_ROUNDS_DISABLED" }, new_rounds_enabled: false }, 503);
    try {
      const gameId = url.searchParams.get("game_id");
      if (!ids.has(gameId) || [...url.searchParams.keys()].some((key) => key !== "game_id") || url.searchParams.getAll("game_id").length !== 1) throw error2("GAME_MODEL_UNAVAILABLE", 404);
      session(request);
      if (!facade || typeof resolveAuthenticatedPlayer !== "function" || evidence.sameProtectedDatabaseVerified !== true || evidence.actualSchemaConstraintsVerified !== true || evidence.protectedSessionResolverVerified !== true || evidence.protectedMachineSessionGuardVerified !== true) throw error2("PROTECTED74_ACCOUNT_READINESS_UNVERIFIED", 503);
      const authenticated = await resolveAuthenticatedPlayer(request);
      const user = authenticated?.userId, guard = authenticated?.machineSessionId;
      if (typeof user !== "string" || !user || user.startsWith("@") || typeof guard !== "string" || !/^[a-f0-9]{64}$/.test(guard)) throw error2("ACTIVE_PLAYER_SESSION_REQUIRED", 401);
      const value = route === "state" ? await facade.state(user, gameId) : await facade.history(user, gameId);
      return response({ ...value, currency: "ETB", accepting: false, sessionGuard: guard, reviewOnly: true });
    } catch (failure) {
      return response({ error: { code: failure.status && failure.status < 500 ? failure.message : "PROTECTED74_ACCOUNT_READINESS_UNVERIFIED" }, new_rounds_enabled: false }, failure.status ?? 503);
    }
  } };
}
function prepareProtectedRuntimeExportOnly(source2, { expectedSha256 = ACTUAL_PROTECTED_RUNTIME_SHA256 } = {}) {
  if (typeof source2 !== "string" || sha(source2) !== expectedSha256) throw Error("EXACT_PROTECTED_RUNTIME_SHA256_REQUIRED");
  if (source2.includes("independent74RetainedProtectedService")) throw Error("ALREADY_EXPORTED");
  const suffix = "\n// OFFLINE REVIEW: existing instance export only; no new routes or gates.\nexport {service as independent74RetainedProtectedService};\n";
  return { source: source2 + suffix, manifest: {
    reviewOnly: true,
    deployableIntegration: false,
    originalSha256: sha(source2),
    originalBytes: Buffer.byteLength(source2),
    appendedBytes: Buffer.byteLength(suffix),
    candidateSha256: sha(source2 + suffix),
    exactOriginalPrefixPreserved: true,
    changedExistingCodeBytes: 0,
    newFinancialClasses: 0,
    newWallets: 0,
    newRoutesInstalled: 0,
    newRoundGatesEnabled: 0,
    exportsOnly: "existing service instance",
    unexposedPrivateHelpers: ["authenticate", "balance", "lockWallets", "move", "houseFor"],
    blocker: "Existing Bun.serve already captures its fetch handler; a separately reviewed bootstrap hook and compatible retained-service injection are still required."
  } };
}
function createProtected74ClosureReviewNamespace({ previous, capabilities } = {}) {
  if (typeof previous?.fetch !== "function" || typeof capabilities?.authenticate !== "function" || typeof capabilities?.transaction !== "function" || typeof capabilities?.balance !== "function" || typeof capabilities?.cash !== "function") throw new TypeError("Exact protected factory helper references are required.");
  const { authenticate, transaction, balance, cash } = capabilities;
  return { ...previous, async fetch(request, ...context) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith(PROTECTED74_PREFIX)) return previous.fetch.call(previous, request, ...context);
    const route = url.pathname.slice(PROTECTED74_PREFIX.length);
    if (request.method === "GET" && route === "catalog") return response({ ...protected74ReviewCatalog(), wallet: "same-existing-protected-account", persistentNewRoundsReady: false });
    if (!["state", "history", "action"].includes(route)) return response({ error: { code: "NOT_FOUND" } }, 404);
    if (request.method !== (route === "action" ? "POST" : "GET")) return response({ error: { code: "METHOD_NOT_ALLOWED" } }, 405);
    if (route === "action") return response({ error: { code: "PROTECTED74_REVIEW_ONLY_NEW_ROUNDS_DISABLED" }, new_rounds_enabled: false }, 503);
    const id = url.searchParams.get("game_id");
    if (!ids.has(id) || url.searchParams.getAll("game_id").length !== 1 || [...url.searchParams.keys()].some((k) => k !== "game_id")) return response({ error: { code: "GAME_MODEL_UNAVAILABLE" } }, 404);
    try {
      const snapshot = await transaction(async (connection) => {
        await connection.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY");
        const user = await authenticate(request, connection, false);
        const actualBalance = await balance(connection, user);
        const rows = route === "history" ? await connection.query("SELECT id,game,bet::text AS stake_minor,payout::text AS payout_minor,created_at FROM sw_rebuild.rounds WHERE user_id=$1 AND game=$2 ORDER BY created_at DESC,id DESC LIMIT 20", [user, id]) : { rows: [] };
        return {
          authenticated: true,
          mode: "account",
          currency: "ETB",
          balance: cash(actualBalance),
          game: reviewAdapter.definitions[id],
          game_id: id,
          model_version: reviewAdapter.definitions[id].version,
          accepting: false,
          reviewOnly: true,
          walletSource: "existing-protected-account",
          // No accepted new round exists in this hardclosed candidate. Do not
          // pretend that settled canonical history proves active-round recovery.
          round: null,
          activeRecoveryVerified: false,
          other_active_game: null,
          ...route === "history" ? { history: rows.rows.map((r) => ({ round_id: r.id, game_id: r.game, stakeMinor: r.stake_minor, payoutMinor: r.payout_minor, status: "settled", created_at: r.created_at })) } : {},
          machineSessionContract: "Use the existing /api/machine-session and X-Zplay-Machine-Session gateway guard; future action transport remains unverified and disabled."
        };
      });
      return response(snapshot);
    } catch (failure) {
      const status = Number.isInteger(failure.status) && failure.status >= 400 && failure.status < 500 ? failure.status : 503;
      return response({ error: { code: status < 500 ? failure.message : "PROTECTED74_ACCOUNT_READINESS_UNVERIFIED" }, new_rounds_enabled: false }, status);
    }
  } };
}
export {
  ACTUAL_PROTECTED_RUNTIME_SHA256,
  PROTECTED74_NEW_ROUNDS_ENABLED,
  PROTECTED74_PREFIX,
  PROTECTED_EXISTING_MODELS,
  attachProtected74ReviewModels,
  createProtected74ClosureReviewNamespace,
  createProtected74ReviewNamespace,
  prepareProtectedRuntimeExportOnly,
  protected64Math,
  protected74ReviewCatalog,
  protected74ReviewReadiness,
  protectedCoreUnitsToMinor,
  protectedDecimalToMinor,
  protectedMinorToCoreUnits,
  validateProtected74MachineSessionHeaders
};
