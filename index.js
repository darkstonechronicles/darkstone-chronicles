(() => {
  function currentPage() {
    const page = String(window.location.pathname || "").split("/").pop().toLowerCase().trim();
    if (!page) return "index.html";
    if (!page.includes(".")) return `${page}.html`;
    return page;
  }

  const HOME_TEMPLATE = `
    <div id="homeHub">
      <div class="hubNav">
        <button class="hubNavBtn" id="goFight" type="button" aria-label="Fighting Fields" data-open-tab-href="fight.html">
          <span class="hubIconFrame" aria-hidden="true"><img class="hubIconImg" src="images/ui/fight.webp" alt=""></span>
        </button>
        <div class="hubLabel">Fighting Fields</div>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goProfessions" type="button" aria-label="Professions" data-open-tab-href="professions.html">
          <span class="hubIconFrame" aria-hidden="true"><img class="hubIconImg" src="images/ui/professions.webp" alt=""></span>
        </button>
        <div class="hubLabel">Professions</div>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goOverview" type="button" aria-label="Overview" data-open-tab-href="professions_overview.html">
          <span class="hubIconFrame" aria-hidden="true"><img class="hubIconImg" src="images/ui/overview.webp" alt=""></span>
        </button>
        <div class="hubLabel">Overview</div>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goDungeons" type="button" aria-label="Dungeons" data-open-tab-href="dungeons.html">
          <span class="hubIconFrame" aria-hidden="true"><img class="hubIconImg" src="images/ui/dungeons.webp" alt=""></span>
        </button>
        <div class="hubLabel">Dungeons</div>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goBuildings" type="button" aria-label="Buildings" data-open-tab-href="buildings.html">
          <span class="hubIconFrame" aria-hidden="true"><img class="hubIconImg" src="images/ui/buildings.webp" alt=""></span>
        </button>
        <div class="hubLabel">Buildings</div>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goChallenges" type="button" aria-label="Challenges" data-open-tab-href="challenges.html">
          <span class="hubIconFrame" aria-hidden="true"><img class="hubIconImg" src="images/ui/challenges.webp" alt=""></span>
        </button>
        <div class="hubLabel">Challenges</div>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goQuests" type="button" aria-label="Quests">
          <span class="hubIconFrame" aria-hidden="true"><span style="font-size:28px;line-height:1;">Q</span></span>
        </button>
        <div class="hubLabel">Quests</div>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goEquip" type="button" aria-label="Equipment" data-open-tab-href="equipment.html">
          <span class="hubIconFrame" aria-hidden="true"><img class="hubIconImg hubIconImgEquip" src="images/ui/equipment.webp" alt=""></span>
        </button>
        <div class="hubLabel">Equipment</div>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goMarket" type="button" aria-label="Market" data-open-tab-href="market.html">
          <span class="hubIconFrame" aria-hidden="true"><img class="hubIconImg" src="images/ui/market.webp" alt=""></span>
        </button>
        <div class="hubLabel">Market</div>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goShop" type="button" aria-label="Shop" data-open-tab-href="shop.html">
          <span class="hubIconFrame" aria-hidden="true"><img class="hubIconImg" src="images/ui/darkstone_coin.webp" alt=""></span>
        </button>
        <div class="hubLabel">Shop</div>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goBank" type="button" aria-label="Bank" data-open-tab-href="bank.html">
          <span class="hubIconFrame" aria-hidden="true"><img class="hubIconImg" src="images/ui/bank.webp" alt=""></span>
        </button>
        <div class="hubLabel">Bank</div>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goStats" type="button" aria-label="My Stats" data-open-tab-href="stats.html">
          <span class="hubIconFrame" aria-hidden="true"><img class="hubIconImg" src="images/ui/stats.webp" alt=""></span>
        </button>
        <div class="hubLabel">My Stats</div>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goSendItem" type="button" aria-label="Send Item">
          <span class="hubIconFrame" aria-hidden="true"><img class="hubIconImg" src="images/ui/party.webp" alt=""></span>
        </button>
        <div class="hubLabel">Send Item</div>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goPlayers" type="button" aria-label="Players">
          <span class="hubIconFrame" aria-hidden="true"><img class="hubIconImg" src="images/ui/stats.webp" alt=""></span>
        </button>
        <div class="hubLabel">Players</div>
      </div>
    </div>
  `;

  const PLAYERS_VIEW_TEMPLATE = `
    <div id="playersViewRoot" style="max-width:980px;margin:0 auto;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
        <div>
          <h1 style="margin-bottom:6px;">Players</h1>
          <div style="opacity:.86;">All players in the game, online and offline, with last activity.</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <button id="playersBackHome" type="button" style="min-width:0;padding:8px 12px;border-radius:10px;border:1px solid rgba(166,124,64,.82);background:linear-gradient(180deg,#4e3a22,#2b2015);color:#fff3d7;font-weight:800;cursor:pointer;">Back</button>
          <button id="playersRefreshBtn" type="button" style="min-width:0;padding:8px 12px;border-radius:10px;border:1px solid rgba(166,124,64,.82);background:linear-gradient(180deg,#6c4a24,#3b2814);color:#fff3d7;font-weight:800;cursor:pointer;">Refresh</button>
        </div>
      </div>
      <div id="playersPanelStatus" style="margin-bottom:12px;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);font-size:13px;color:#eef2ff;">Loading players...</div>
      <div id="playersPanelList" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;"></div>
    </div>
  `;
  const PLAYER_PROFILE_VIEW_TEMPLATE = `
    <div id="playerProfileViewRoot" style="max-width:980px;margin:0 auto;">
      <div id="playerProfileStatus" style="display:none;margin-bottom:12px;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);font-size:13px;color:#eef2ff;"></div>
      <div style="display:grid;gap:14px;">
        <div style="position:relative;padding:18px 16px;border-radius:16px;border:1px solid rgba(166,124,64,.72);background:linear-gradient(180deg, rgba(56,42,24,.52), rgba(22,18,20,.94));box-shadow:0 18px 38px rgba(0,0,0,.24);">
          <button id="playerProfileBackBtn" type="button" style="position:absolute;right:14px;top:14px;min-width:0;padding:8px 12px;border-radius:10px;border:1px solid rgba(166,124,64,.82);background:linear-gradient(180deg,#4e3a22,#2b2015);color:#fff3d7;font-weight:800;cursor:pointer;">Back</button>
          <div style="display:grid;justify-items:center;gap:10px;text-align:center;">
            <div id="playerProfileAvatarWrap" style="width:124px;height:124px;border-radius:24px;border:1px solid rgba(166,124,64,.72);background:#0f1219;overflow:hidden;box-shadow:0 12px 28px rgba(0,0,0,.28);"></div>
            <div id="playerProfileName" style="font-size:28px;font-weight:900;color:#f3ead6;line-height:1.1;">Hero</div>
            <div id="playerProfileMeta" style="font-size:13px;color:#d9ccb0;">Offline</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
              <button id="playerTabOverview" type="button" style="min-width:160px;height:42px;border-radius:12px;border:1px solid rgba(166,124,64,.86);background:linear-gradient(180deg,#6c4a24,#3b2814);color:#fff2d6;font-size:13px;font-weight:900;cursor:pointer;">Overview</button>
              <button id="playerTabEquipment" type="button" style="min-width:160px;height:42px;border-radius:12px;border:1px solid rgba(166,124,64,.56);background:linear-gradient(180deg,#3d3220,#241b14);color:#eadcbc;font-size:13px;font-weight:900;cursor:pointer;">Equipment</button>
              <button id="playerWhisperBtn" type="button" style="min-width:160px;height:42px;border-radius:12px;border:1px solid rgba(126,190,255,.55);background:#1e355a;color:#eef6ff;font-size:13px;font-weight:900;cursor:pointer;">Whisper</button>
            </div>
          </div>
        </div>
        <div id="playerProfileContent" style="min-height:320px;"></div>
      </div>
    </div>
  `;

  const el = (id, scope = document) => scope.getElementById(id);
  const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);
  const fmt = (v) => new Intl.NumberFormat("el-GR").format(num(v, 0));
  const QUEST_LIMIT = 500;
  const QUEST_PROFESSIONS = [
    { id: "fighting", label: "Fighting", statKey: "fightsWon", unit: "fights won", levelKey: "heroLevel", xpKey: "heroXP", xpNextKey: "heroXPNext", href: "fight.html" },
    { id: "mining", label: "Mining", statKey: "miningTicks", unit: "mining actions", levelKey: "miningLevel", xpKey: "miningXP", xpNextKey: "miningXPNext", href: "mining.html" },
    { id: "woodcutting", label: "Woodcutting", statKey: "woodGatherTicks", unit: "woodcutting actions", levelKey: "woodcuttingLevel", xpKey: "woodcuttingXP", xpNextKey: "woodcuttingXPNext", href: "woodcutting.html" },
    { id: "hunting", label: "Hunting", statKey: "huntingTicks", unit: "hunting actions", levelKey: "huntingLevel", xpKey: "huntingXP", xpNextKey: "huntingXPNext", href: "hunting.html" },
    { id: "fishing", label: "Fishing", statKey: "fishingTicks", unit: "fishing actions", levelKey: "fishingLevel", xpKey: "fishingXP", xpNextKey: "fishingXPNext", href: "fishing.html" },
    { id: "cooking", label: "Cooking", statKey: "cookingCrafts", unit: "cooking actions", levelKey: "cookingLevel", xpKey: "cookingXP", xpNextKey: "cookingXPNext", href: "cooking.html" },
    { id: "herbalism", label: "Herbalism", statKey: "herbalismTicks", unit: "herbalism actions", levelKey: "herbalismLevel", xpKey: "herbalismXP", xpNextKey: "herbalismXPNext", href: "herbalism.html" },
    { id: "forge", label: "Forge", statKey: "barsCrafted", unit: "forge actions", levelKey: "blacksmithLevel", xpKey: "blacksmithXP", xpNextKey: "blacksmithXPNext", divisor: 4, href: "forge.html" },
    { id: "carpentry", label: "Carpentry", statKey: "planksCrafted", unit: "carpentry actions", levelKey: "carpentryLevel", xpKey: "carpentryXP", xpNextKey: "carpentryXPNext", divisor: 4, href: "carpentry.html" },
    { id: "alchemy", label: "Alchemy", statKey: "alchemyTicks", unit: "alchemy actions", levelKey: "alchemyLevel", xpKey: "alchemyXP", xpNextKey: "alchemyXPNext", divisor: 3, href: "alchemy.html" },
    { id: "dungeon", label: "Dungeon", statKey: "dungeonsCompleted", unit: "dungeons completed", levelKey: "heroLevel", xpKey: "heroXP", xpNextKey: "heroXPNext", divisor: 8, href: "dungeons.html" }
  ];
  const QUEST_RESOURCE_POOLS = {
    mining: [
      { id: "copper_ore", name: "Copper Ore", req: 1, img: "images/ores/copper_ore.webp", href: "mining_action.html?ore=copper_ore" },
      { id: "silver_ore", name: "Silver Ore", req: 10, img: "images/ores/silver_ore.webp", href: "mining_action.html?ore=silver_ore" },
      { id: "iron_ore", name: "Iron Ore", req: 20, img: "images/ores/iron_ore.webp", href: "mining_action.html?ore=iron_ore" },
      { id: "mithril_ore", name: "Mithril Ore", req: 30, img: "images/ores/mithril_ore.webp", href: "mining_action.html?ore=mithril_ore" },
      { id: "adamant_ore", name: "Adamant Ore", req: 40, img: "images/ores/adamant_ore.webp", href: "mining_action.html?ore=adamant_ore" },
      { id: "obsidian_ore", name: "Obsidian Ore", req: 50, img: "images/ores/obsidian_ore.webp", href: "mining_action.html?ore=obsidian_ore" },
      { id: "crystal_ore", name: "Crystal Ore", req: 60, img: "images/ores/crystal_ore.webp", href: "mining_action.html?ore=crystal_ore" },
      { id: "sulfur_ore", name: "Sulfur Ore", req: 70, img: "images/ores/sulfur_ore.webp", href: "mining_action.html?ore=sulfur_ore" },
      { id: "rose_quartz_ore", name: "Rose Quartz Ore", req: 80, img: "images/ores/rose_quartz_ore.webp", href: "mining_action.html?ore=rose_quartz_ore" },
      { id: "darkstone_ore", name: "Darkstone Ore", req: 90, img: "images/ores/darkstone_ore.webp", href: "mining_action.html?ore=darkstone_ore" }
    ],
    woodcutting: [
      { id: "ash_log", name: "Ash Log", req: 1, img: "images/wood/logs/ash_log.webp", href: "wood_gather_action.html?wood=ash" },
      { id: "pine_log", name: "Pine Log", req: 10, img: "images/wood/logs/pine_log.webp", href: "wood_gather_action.html?wood=pine" },
      { id: "birch_log", name: "Birch Log", req: 20, img: "images/wood/logs/birch_log.webp", href: "wood_gather_action.html?wood=birch" },
      { id: "oak_log", name: "Oak Log", req: 30, img: "images/wood/logs/oak_log.webp", href: "wood_gather_action.html?wood=oak" },
      { id: "cedar_log", name: "Cedar Log", req: 40, img: "images/wood/logs/cedar_log.webp", href: "wood_gather_action.html?wood=cedar" },
      { id: "maple_log", name: "Maple Log", req: 50, img: "images/wood/logs/maple_log.webp", href: "wood_gather_action.html?wood=maple" },
      { id: "ironwood_log", name: "Ironwood Log", req: 60, img: "images/wood/logs/ironwood_log.webp", href: "wood_gather_action.html?wood=ironwood" },
      { id: "heartwood_log", name: "Heartwood Log", req: 70, img: "images/wood/logs/heartwood_log.webp", href: "wood_gather_action.html?wood=heartwood" },
      { id: "darkwood_log", name: "Darkwood Log", req: 80, img: "images/wood/logs/darkwood_log.webp", href: "wood_gather_action.html?wood=darkwood" },
      { id: "ebony_log", name: "Ebony Log", req: 90, img: "images/wood/logs/ebony_log.webp", href: "wood_gather_action.html?wood=ebony" }
    ],
    hunting: [
      { id: "raw_shadow_hare_meat", name: "Raw Shadow Hare Meat", req: 1, img: "images/meat/shadow_hare_raw.webp", href: "hunting_action.html?target=shadow_hare" },
      { id: "raw_rotfeather_turkey_meat", name: "Raw Rotfeather Turkey Meat", req: 10, img: "images/meat/rotfeather_turkey_raw.webp", href: "hunting_action.html?target=rotfeather_turkey" },
      { id: "raw_gloom_fox_meat", name: "Raw Gloom Fox Meat", req: 20, img: "images/meat/gloom_fox_raw.webp", href: "hunting_action.html?target=gloom_fox" },
      { id: "raw_bloodtusk_boar_meat", name: "Raw Bloodtusk Boar Meat", req: 30, img: "images/meat/bloodtusk_boar_raw.webp", href: "hunting_action.html?target=bloodtusk_boar" },
      { id: "raw_night_wolf_meat", name: "Raw Night Wolf Meat", req: 40, img: "images/meat/night_wolf_raw.webp", href: "hunting_action.html?target=night_wolf" },
      { id: "raw_stonehorn_ram_meat", name: "Raw Stonehorn Ram Meat", req: 50, img: "images/meat/stonehorn_ram_raw.webp", href: "hunting_action.html?target=stonehorn_ram" },
      { id: "raw_thorn_stag_meat", name: "Raw Thorn Stag Meat", req: 60, img: "images/meat/thorn_stag_raw.webp", href: "hunting_action.html?target=thorn_stag" },
      { id: "raw_grave_bear_meat", name: "Raw Grave Bear Meat", req: 70, img: "images/meat/bear_raw.webp", href: "hunting_action.html?target=grave_bear" },
      { id: "raw_dire_warg_meat", name: "Raw Dire Warg Meat", req: 80, img: "images/meat/dire_warg_raw.webp", href: "hunting_action.html?target=dire_warg" },
      { id: "raw_forest_troll_meat", name: "Raw Forest Troll Meat", req: 90, img: "images/meat/troll_raw.webp", href: "hunting_action.html?target=forest_troll" }
    ],
    herbalism: [
      { id: "greenleaf", name: "Greenleaf", req: 1, img: "images/herbalism/herbs/greenleaf.png", href: "herbalism_action.html?zone=verdant_hollow" },
      { id: "sungrass", name: "Sungrass", req: 15, img: "images/herbalism/herbs/sungrass.png", href: "herbalism_action.html?zone=sunspire_plains" },
      { id: "ironroot", name: "Ironroot", req: 30, img: "images/herbalism/herbs/ironroot.png", href: "herbalism_action.html?zone=ironwood_depths" },
      { id: "frost_bloom", name: "Frost Bloom", req: 45, img: "images/herbalism/herbs/frost_bloom.png", href: "herbalism_action.html?zone=frostpetal_vale" },
      { id: "shadow_mint", name: "Shadow Mint", req: 60, img: "images/herbalism/herbs/shadow_mint.png", href: "herbalism_action.html?zone=duskmire_thicket" },
      { id: "goldthorn", name: "Goldthorn", req: 75, img: "images/herbalism/herbs/goldthorn.png", href: "herbalism_action.html?zone=aurathorn_expanse" },
      { id: "ember_lotus", name: "Ember Lotus", req: 90, img: "images/herbalism/herbs/ember_lotus.png", href: "herbalism_action.html?zone=emberfall_sanctuary" }
    ]
  };
  const QUEST_FISHING_SPOTS = [
    { id: "Mangrove_Spirit_Swamp", req: 1, title: "Mangrove Spirit Swamp", fish: [
      { id: "mud_minnow", name: "Mud Minnow", img: "images/fish/mud_minnow.webp", chance: 0.70 },
      { id: "bog_carp", name: "Bog Carp", img: "images/fish/bog_carp.webp", chance: 0.30 }
    ] },
    { id: "Crystal_Stream", req: 10, title: "Crystal Stream", fish: [
      { id: "shiner_fish", name: "Shiner Fish", img: "images/fish/shiner_fish.webp", chance: 0.70 },
      { id: "golden_perch", name: "Golden Perch", img: "images/fish/golden_perch.webp", chance: 0.30 }
    ] },
    { id: "Emerald_Forest_Lake", req: 20, title: "Emerald Forest Lake", fish: [
      { id: "spiny_sunfish", name: "Spiny Sunfish", img: "images/fish/spiny_sunfish.webp", chance: 0.70 },
      { id: "striped_bass", name: "Striped Bass", img: "images/fish/striped_bass.webp", chance: 0.30 }
    ] },
    { id: "Canyon_Thunder_River", req: 30, title: "Canyon Thunder River", fish: [
      { id: "stone_catfish", name: "Stone Catfish", img: "images/fish/stone_catfish.webp", chance: 0.70 },
      { id: "crystal_pike", name: "Crystal Pike", img: "images/fish/crystal_pike.webp", chance: 0.30 }
    ] },
    { id: "Moon_Lotus_Pond", req: 40, title: "Moon Lotus Pond", fish: [
      { id: "moon_carp", name: "Moon Carp", img: "images/fish/moon_carp.webp", chance: 0.70 },
      { id: "glass_eel", name: "Glass Eel", img: "images/fish/glass_eel.webp", chance: 0.30 }
    ] },
    { id: "Frozen_Aurora_River", req: 50, title: "Frozen Aurora River", fish: [
      { id: "frost_salmon", name: "Frost Salmon", img: "images/fish/frost_salmon.webp", chance: 0.70 },
      { id: "glacier_char", name: "Glacier Char", img: "images/fish/glacier_char.webp", chance: 0.30 }
    ] },
    { id: "Glacier_Mirror_Lake", req: 60, title: "Glacier Mirror Lake", fish: [
      { id: "ice_sturgeon", name: "Ice Sturgeon", img: "images/fish/ice_sturgeon.webp", chance: 0.70 },
      { id: "spiral_horn_gar", name: "Spiral Horn Gar", img: "images/fish/spiral_horn_gar.webp", chance: 0.30 }
    ] },
    { id: "Sunken_Coral_Sea", req: 70, title: "Sunken Coral Sea", fish: [
      { id: "storm_mackerel", name: "Storm Mackerel", img: "images/fish/storm_mackerel.webp", chance: 0.70 },
      { id: "lantern_pike", name: "Lantern Pike", img: "images/fish/lantern_pike.webp", chance: 0.30 }
    ] },
    { id: "Abyssal_Glow_Depths", req: 80, title: "Abyssal Glow Depths", fish: [
      { id: "ghost_ray", name: "Ghost Ray", img: "images/fish/ghost_ray.webp", chance: 0.70 },
      { id: "hammerhead_pike", name: "Hammerhead Pike", img: "images/fish/hammerhead_pike.webp", chance: 0.30 }
    ] },
    { id: "Leviathan_Rift_Trench", req: 90, title: "Leviathan Rift Trench", fish: [
      { id: "void_angler", name: "Void Angler", img: "images/fish/void_angler.webp", chance: 0.70 },
      { id: "leviathan_marlin", name: "Leviathan Marlin", img: "images/fish/leviathan_marlin.webp", chance: 0.30 }
    ] }
  ];
  const QUEST_FORGE_MATERIALS = [
    { id: "copper", name: "Copper", req: 1 },
    { id: "silver", name: "Silver", req: 10 },
    { id: "iron", name: "Iron", req: 20 },
    { id: "mithril", name: "Mithril", req: 30 },
    { id: "adamant", name: "Adamant", req: 40 },
    { id: "obsidian", name: "Obsidian", req: 50 },
    { id: "crystal", name: "Crystal", req: 60 },
    { id: "sulfur", name: "Sulfur", req: 70 },
    { id: "rose_quartz", name: "Rose Quartz", req: 80 },
    { id: "darkstone", name: "Darkstone", req: 90 }
  ];
  const QUEST_FORGE_MAIN_HAND_NAMES = {
    copper: "Sword",
    silver: "Mace",
    iron: "Axe",
    mithril: "Sword",
    adamant: "Axe",
    obsidian: "Sword",
    crystal: "Sword",
    sulfur: "Sword",
    rose_quartz: "Sword",
    darkstone: "Mace"
  };
  const QUEST_FORGE_SLOTS = [
    { id: "helmet", label: "Helmet" },
    { id: "chest", label: "Chest" },
    { id: "belt", label: "Belt" },
    { id: "pants", label: "Pants" },
    { id: "gloves", label: "Gloves" },
    { id: "boots", label: "Boots" },
    { id: "main_hand", label: "Main Hand" },
    { id: "shield", label: "Shield" },
    { id: "bracers", label: "Bracers" },
    { id: "shoulders", label: "Shoulders" }
  ];
  const QUEST_CARPENTRY_PLANKS = [
    { id: "ash_plank", name: "Ash Plank", req: 1, img: "images/wood/planks/ash_plank.png", href: "wood_sawmill_action.html?recipe=ash_plank" },
    { id: "pine_plank", name: "Pine Plank", req: 10, img: "images/wood/planks/pine_plank.png", href: "wood_sawmill_action.html?recipe=pine_plank" },
    { id: "birch_plank", name: "Birch Plank", req: 20, img: "images/wood/planks/birch_plank.png", href: "wood_sawmill_action.html?recipe=birch_plank" },
    { id: "oak_plank", name: "Oak Plank", req: 30, img: "images/wood/planks/oak_plank.png", href: "wood_sawmill_action.html?recipe=oak_plank" },
    { id: "cedar_plank", name: "Cedar Plank", req: 40, img: "images/wood/planks/cedar_plank.png", href: "wood_sawmill_action.html?recipe=cedar_plank" },
    { id: "maple_plank", name: "Maple Plank", req: 50, img: "images/wood/planks/maple_plank.png", href: "wood_sawmill_action.html?recipe=maple_plank" },
    { id: "ironwood_plank", name: "Ironwood Plank", req: 60, img: "images/wood/planks/ironwood_plank.png", href: "wood_sawmill_action.html?recipe=ironwood_plank" },
    { id: "heartwood_plank", name: "Heartwood Plank", req: 70, img: "images/wood/planks/heartwood_plank.png", href: "wood_sawmill_action.html?recipe=heartwood_plank" },
    { id: "darkwood_plank", name: "Darkwood Plank", req: 80, img: "images/wood/planks/darkwood_plank.png", href: "wood_sawmill_action.html?recipe=darkwood_plank" },
    { id: "ebony_plank", name: "Ebony Plank", req: 90, img: "images/wood/planks/ebony_plank.png", href: "wood_sawmill_action.html?recipe=ebony_plank" }
  ];
  const QUEST_ALCHEMY_ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
  const QUEST_ALCHEMY_TIERS = [
    { tier: 1, req: 1 },
    { tier: 2, req: 15 },
    { tier: 3, req: 30 },
    { tier: 4, req: 45 },
    { tier: 5, req: 60 },
    { tier: 6, req: 75 },
    { tier: 7, req: 90 }
  ];
  const QUEST_ALCHEMY_POTIONS = [
    { id: "strength", label: "Strength Potion" },
    { id: "defense", label: "Defense Potion" },
    { id: "gathering_insight", label: "Gathering Insight" },
    { id: "artisan_insight", label: "Artisan Insight" },
    { id: "luck", label: "Luck Potion" }
  ];
  const PLAYER_EQUIP_SLOTS = [
    "helmet", "shoulders", "chest", "bracers",
    "mainHand", "offHand", "gloves", "belt",
    "pants", "boots", "ring", "amulet"
  ];
  const PLAYER_SLOT_LABELS = {
    helmet: "Helmet",
    shoulders: "Shoulders",
    chest: "Chest",
    bracers: "Bracers",
    mainHand: "Main Hand",
    offHand: "Off Hand",
    gloves: "Gloves",
    belt: "Belt",
    pants: "Pants",
    boots: "Boots",
    ring: "Ring",
    amulet: "Amulet"
  };
  const playersPanelState = {
    loading: false,
    profileLoading: false,
    players: [],
    status: "",
    error: false,
    selectedUserId: "",
    selectedProfile: null,
    profileError: "",
    profileTab: "overview"
  };

  function loadSave() {
    try { return JSON.parse(localStorage.getItem("darkstone_save_v1") || "{}") || {}; }
    catch { return {}; }
  }

  function setSave(save) {
    localStorage.setItem("darkstone_save_v1", JSON.stringify(save && typeof save === "object" ? save : {}));
    window.dispatchEvent(new Event("ds:save"));
    Promise.resolve(window.DSAuth?.syncCloudSaveNow?.({ waitForPending: true })).catch(() => {});
  }

  function roundXPNext(value) {
    value = Math.max(1, Math.round(Number(value) || 1));
    if (value >= 10000000) return Math.ceil(value / 50000) * 50000;
    if (value >= 1000000) return Math.ceil(value / 10000) * 10000;
    if (value >= 100000) return Math.ceil(value / 5000) * 5000;
    if (value >= 10000) return Math.ceil(value / 500) * 500;
    if (value >= 1000) return Math.ceil(value / 100) * 100;
    return Math.round(value);
  }

  function xpNextForLevel(level) {
    const L = Math.max(1, Math.floor(Number(level) || 1));
    let xp = 100;
    for (let cur = 2; cur <= L; cur += 1) {
      const prev = cur - 1;
      let rate = 1.01;
      if (prev <= 3) rate = 2.0;
      else if (prev <= 6) rate = 1.5;
      else if (prev <= 10) rate = 1.3;
      else if (prev <= 20) rate = 1.18;
      else if (prev <= 35) rate = 1.12;
      else if (prev <= 50) rate = 1.10;
      else if (prev <= 70) rate = 1.075;
      else if (prev <= 85) rate = 1.06;
      else if (prev <= 99) rate = 1.05;
      else if (prev <= 105) rate = 1.05 - 0.002 * (prev - 100);
      else if (prev <= 200) rate = 1.04 - 0.03 * ((prev - 105) / 95);
      xp *= rate;
    }
    return roundXPNext(xp);
  }

  function getQuestProfession(id) {
    return QUEST_PROFESSIONS.find((entry) => entry.id === id) || QUEST_PROFESSIONS[0];
  }

  function ensureQuests(save) {
    save = save && typeof save === "object" ? save : {};
    if (!save.quests || typeof save.quests !== "object") save.quests = {};
    save.quests.completed = Math.max(0, Math.min(QUEST_LIMIT, Math.floor(num(save.quests.completed, 0))));
    if (save.quests.active && typeof save.quests.active !== "object") save.quests.active = null;
    if (save.quests.completed >= QUEST_LIMIT) save.quests.active = null;
    return save;
  }

  function getStatsTotal(save) {
    return save?.stats?.total && typeof save.stats.total === "object" ? save.stats.total : {};
  }

  function questActionRange(questNo, profession) {
    const tier = Math.floor((Math.max(1, questNo) - 1) / 20);
    let min = 80 + tier * 50;
    let max = 100 + tier * 50;
    const divisor = Math.max(1, num(profession?.divisor, 1));
    if (divisor > 1) {
      min = Math.max(1, Math.ceil(min / divisor));
      max = Math.max(min, Math.ceil(max / divisor));
    }
    return { min, max };
  }

  function randomInt(min, max) {
    min = Math.ceil(num(min, 0));
    max = Math.floor(num(max, min));
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomQuestProfession() {
    return QUEST_PROFESSIONS[randomInt(0, QUEST_PROFESSIONS.length - 1)] || QUEST_PROFESSIONS[0];
  }

  function randomQuestTarget(questNo, profession) {
    const range = questActionRange(questNo, profession);
    return randomInt(range.min, range.max);
  }

  function forgeEquipmentName(material, slot) {
    const suffix = slot.id === "main_hand" ? (QUEST_FORGE_MAIN_HAND_NAMES[material.id] || slot.label) : slot.label;
    return `${material.name} ${suffix}`;
  }

  function forgeQuestResourcePool() {
    const bars = QUEST_FORGE_MATERIALS.map((material) => ({
      id: `${material.id}_bar`,
      name: `${material.name} Bar`,
      req: material.req,
      img: `images/bars/${material.id}_bar.png`,
      href: `forge_action.html?recipe=${encodeURIComponent(`${material.id}_bar`)}`
    }));
    const equipment = QUEST_FORGE_MATERIALS.flatMap((material) => QUEST_FORGE_SLOTS.map((slot) => ({
      id: `${material.id}_${slot.id}`,
      name: forgeEquipmentName(material, slot),
      req: material.req,
      img: `images/items/forge_crafted/${material.id}/${material.id}_${slot.id}.webp`,
      href: `forge_action.html?recipe=${encodeURIComponent(`${material.id}_${slot.id}`)}`
    })));
    return bars.concat(equipment);
  }

  function cookingQuestResourcePool() {
    const meats = (QUEST_RESOURCE_POOLS.hunting || []).map((meat) => {
      const cookedId = String(meat.id || "").replace(/^raw_/, "cooked_");
      return {
        id: cookedId,
        name: String(meat.name || "").replace(/^Raw\b/, "Cooked"),
        req: meat.req,
        levelKey: "huntingLevel",
        img: String(meat.img || "").replace("_raw.webp", "_cooked.webp"),
        href: `cooking_action.html?recipe=${encodeURIComponent(cookedId)}`
      };
    });
    const fish = QUEST_FISHING_SPOTS.flatMap((spot) => (Array.isArray(spot.fish) ? spot.fish : []).map((entry) => {
      const cookedId = `cooked_${entry.id}`;
      return {
        id: cookedId,
        name: `Cooked ${entry.name}`,
        req: spot.req,
        levelKey: "fishingLevel",
        img: `images/food/${cookedId}.webp`,
        href: `cooking_action.html?recipe=${encodeURIComponent(cookedId)}`
      };
    }));
    return meats.concat(fish);
  }

  function alchemyQuestResourcePool() {
    return QUEST_ALCHEMY_TIERS.flatMap((tier) => QUEST_ALCHEMY_POTIONS.map((potion) => ({
      id: `${potion.id}_potion_${tier.tier}`,
      name: `${potion.label} ${QUEST_ALCHEMY_ROMAN[tier.tier - 1] || tier.tier}`,
      req: tier.req,
      img: `images/alchemy/potions/${potion.id}_${tier.tier}.webp`,
      href: `alchemy_action.html?recipe=${encodeURIComponent(`${potion.id}_${tier.tier}`)}`
    })));
  }

  function questResourcePoolForProfession(profession) {
    if (profession?.id === "forge") return forgeQuestResourcePool();
    if (profession?.id === "carpentry") return QUEST_CARPENTRY_PLANKS;
    if (profession?.id === "cooking") return cookingQuestResourcePool();
    if (profession?.id === "alchemy") return alchemyQuestResourcePool();
    return QUEST_RESOURCE_POOLS[profession?.id];
  }

  function itemMatchKey(value) {
    return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  }

  function inventoryCount(save, targetItem) {
    if (!targetItem) return 0;
    const targetId = itemMatchKey(targetItem.id);
    const targetName = itemMatchKey(targetItem.name);
    const inventory = Array.isArray(save?.inventory) ? save.inventory : [];
    return inventory.reduce((sum, item) => {
      const itemId = itemMatchKey(item?.id);
      const itemName = itemMatchKey(item?.name);
      if ((targetId && itemId === targetId) || (targetName && itemName === targetName)) {
        return sum + Math.max(1, num(item.quantity ?? item.qty, 1));
      }
      return sum;
    }, 0);
  }

  function removeQuestItemsFromInventory(save, targetItem, qtyNeeded) {
    if (!targetItem) return true;
    let remaining = Math.max(1, Math.floor(num(qtyNeeded, 1)));
    const inventory = Array.isArray(save?.inventory) ? save.inventory : [];
    const targetId = itemMatchKey(targetItem.id);
    const targetName = itemMatchKey(targetItem.name);
    for (let i = inventory.length - 1; i >= 0 && remaining > 0; i -= 1) {
      const item = inventory[i];
      const itemId = itemMatchKey(item?.id);
      const itemName = itemMatchKey(item?.name);
      if (!((targetId && itemId === targetId) || (targetName && itemName === targetName))) continue;
      const qty = Math.max(1, Math.floor(num(item.quantity ?? item.qty, 1)));
      if (qty <= remaining) {
        remaining -= qty;
        inventory.splice(i, 1);
      } else {
        item.quantity = qty - remaining;
        if ("qty" in item) item.qty = item.quantity;
        remaining = 0;
      }
    }
    return remaining <= 0;
  }

  function randomUnlockedQuestItem(save, profession) {
    const pool = questResourcePoolForProfession(profession);
    if (!Array.isArray(pool) || !pool.length) return null;
    const unlocked = pool.filter((item) => {
      const levelKey = item.levelKey || profession.levelKey;
      const level = Math.max(1, Math.floor(num(save?.[levelKey], 1)));
      return level >= num(item.req, 1);
    });
    return unlocked.length ? unlocked[randomInt(0, unlocked.length - 1)] : pool[0];
  }

  function randomFishingQuestItem(save, range) {
    const level = Math.max(1, Math.floor(num(save?.fishingLevel, 1)));
    const spots = QUEST_FISHING_SPOTS.filter((spot) => level >= num(spot.req, 1));
    const spot = (spots.length ? spots : [QUEST_FISHING_SPOTS[0]])[randomInt(0, Math.max(0, (spots.length || 1) - 1))];
    const fishList = Array.isArray(spot?.fish) ? spot.fish : [];
    const common = fishList.find((fish) => num(fish.chance, 0) >= 0.7) || fishList[0];
    const rare = fishList.find((fish) => num(fish.chance, 0) < 0.7) || fishList[1] || common;
    const fish = Math.random() < 0.70 ? common : rare;
    const ratio = num(fish?.chance, 0.70) >= 0.7 ? 0.70 : 0.30;
    const baseTarget = randomInt(range.min, range.max);
    return {
      id: fish.id,
      name: fish.name,
      img: fish.img,
      href: `fishing_action.html?spot=${encodeURIComponent(spot.id)}`,
      zoneId: spot.id,
      zoneName: spot.title,
      chance: num(fish.chance, ratio),
      target: Math.max(1, Math.ceil(baseTarget * ratio))
    };
  }

  function questProgress(save) {
    const active = save?.quests?.active;
    if (!active) return 0;
    if (active.kind === "resource" && active.item) {
      return Math.max(0, Math.min(num(active.target, 0), inventoryCount(save, active.item)));
    }
    const total = getStatsTotal(save);
    return Math.max(0, Math.min(num(active.target, 0), num(total[active.statKey], 0) - num(active.startValue, 0)));
  }

  function startRandomQuest(save = ensureQuests(loadSave())) {
    if (save.quests.completed >= QUEST_LIMIT || save.quests.active) return save;
    save.quests.pendingNext = null;
    const questNo = save.quests.completed + 1;
    const profession = randomQuestProfession();
    const range = questActionRange(questNo, profession);
    const stats = getStatsTotal(save);
    const item = profession.id === "fishing"
      ? randomFishingQuestItem(save, range)
      : randomUnlockedQuestItem(save, profession);
    const target = item?.target || randomInt(range.min, range.max);
    save.quests.active = {
      questNo,
      professionId: profession.id,
      label: profession.label,
      statKey: profession.statKey,
      unit: item ? item.name : profession.unit,
      target,
      startValue: item ? inventoryCount(save, item) : num(stats[profession.statKey], 0),
      kind: item ? "resource" : "actions",
      item: item ? {
        id: item.id,
        name: item.name,
        img: item.img,
        href: item.href
      } : null
    };
    setSave(save);
    return save;
  }

  function addQuestRewardXP(save, profession) {
    const levelKey = profession.levelKey;
    const xpKey = profession.xpKey;
    const xpNextKey = profession.xpNextKey;
    save[levelKey] = Math.max(1, Math.floor(num(save[levelKey], 1)));
    save[xpKey] = Math.max(0, Math.floor(num(save[xpKey], 0)));
    save[xpNextKey] = Math.max(1, Math.floor(num(save[xpNextKey], xpNextForLevel(save[levelKey]))));
    const rewardXp = Math.max(1, Math.ceil(save[xpNextKey] * 0.20));
    save[xpKey] += rewardXp;
    while (save[xpKey] >= save[xpNextKey]) {
      save[xpKey] -= save[xpNextKey];
      save[levelKey] += 1;
      save[xpNextKey] = xpNextForLevel(save[levelKey]);
      if (profession.id === "fighting" || profession.id === "dungeon") {
        save.heroStatPoints = Math.max(0, num(save.heroStatPoints, 0)) + 5;
        window.DS?.announcements?.combatLevel?.(save, save.heroLevel);
      } else {
        window.DS?.announcements?.professionLevel?.(save, profession.label, save[levelKey]);
      }
    }
    return rewardXp;
  }

  function claimQuestReward() {
    const save = ensureQuests(loadSave());
    const active = save.quests.active;
    if (!active || questProgress(save) < num(active.target, 0)) return;
    const profession = getQuestProfession(active.professionId);
    if (active.kind === "resource" && active.item && !removeQuestItemsFromInventory(save, active.item, active.target)) return;
    const rewardXp = addQuestRewardXP(save, profession);
    const reward = {
      questNo: active.questNo,
      professionId: profession.id,
      label: profession.label,
      xp: rewardXp,
      claimedAt: Date.now()
    };
    save.quests.lastReward = reward;
    save.quests.pendingNext = reward;
    save.quests.completed = Math.min(QUEST_LIMIT, Math.max(num(save.quests.completed, 0), num(active.questNo, 1)));
    save.quests.active = null;
    setSave(save);
    renderQuestsPanel();
  }

  function startNextQuestFromHome() {
    const save = ensureQuests(loadSave());
    if (save.quests.completed >= QUEST_LIMIT) {
      save.quests.pendingNext = null;
      save.quests.active = null;
      setSave(save);
      renderQuestsPanel();
      return;
    }
    save.quests.pendingNext = null;
    save.quests.active = null;
    startRandomQuest(save);
    renderQuestsPanel();
  }

  function renderQuestsPanel(root = null) {
    const left = root || el("leftPanel");
    if (!left) return;
    let save = ensureQuests(loadSave());
    const pending = save.quests.pendingNext && typeof save.quests.pendingNext === "object" ? save.quests.pendingNext : null;
    if (!pending && !save.quests.active && save.quests.completed < QUEST_LIMIT) {
      save = startRandomQuest(save);
    }
    const active = save.quests.active;
    const completed = Math.max(0, Math.min(QUEST_LIMIT, num(save.quests.completed, 0)));
    const questNo = Math.min(QUEST_LIMIT, completed + 1);
    const last = save.quests.lastReward || null;
    const done = completed >= QUEST_LIMIT;
    const progress = active ? questProgress(save) : 0;
    const ready = active && progress >= num(active.target, 0);
    left.innerHTML = `
      <div id="questsPanel" style="max-width:920px;margin:0 auto;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
          <div>
            <h1 style="margin-bottom:6px;">Quests</h1>
            <div style="opacity:.86;">Quest ${fmt(Math.min(completed + 1, QUEST_LIMIT))} / ${fmt(QUEST_LIMIT)}</div>
          </div>
          <button id="questsBackHome" type="button" style="min-width:0;padding:8px 12px;border-radius:10px;border:1px solid rgba(166,124,64,.82);background:linear-gradient(180deg,#4e3a22,#2b2015);color:#fff3d7;font-weight:800;cursor:pointer;">Back</button>
        </div>
        ${pending ? `
          <div style="padding:16px;border-radius:14px;border:1px solid rgba(80,142,91,.74);background:rgba(25,66,38,.42);">
            <div style="font-size:22px;font-weight:900;color:#b9ffc8;">Quest ${fmt(pending.questNo)} completed</div>
            <div style="margin-top:8px;opacity:.9;">You obtained:</div>
            <div style="margin-top:4px;font-weight:900;color:#b9ffc8;">${fmt(pending.xp)} ${esc(pending.label)} XP</div>
            ${done ? `<div style="margin-top:12px;font-weight:800;">All 500 quests completed.</div>` : `
              <button id="questNextBtn" type="button" style="margin-top:12px;min-width:0;padding:8px 12px;border-radius:10px;border:1px solid rgba(80,142,91,.86);background:linear-gradient(180deg,#2f7f5c,#1d513b);color:#eaffef;font-weight:900;cursor:pointer;">Next Quest</button>
            `}
          </div>
        ` : last && !last.skipped ? `<div style="margin-bottom:12px;padding:10px 12px;border-radius:10px;border:1px solid rgba(80,142,91,.74);background:rgba(25,66,38,.42);color:#b9ffc8;font-weight:800;">Quest ${fmt(last.questNo)} reward claimed: ${esc(last.label)} XP +${fmt(last.xp)}</div>` : ""}
        ${!pending && done ? `
          <div style="padding:18px;border-radius:14px;border:1px solid rgba(166,124,64,.72);background:rgba(255,255,255,.04);text-align:center;font-weight:900;">All 500 quests completed.</div>
        ` : !pending && active ? `
          <div style="padding:16px;border-radius:14px;border:1px solid rgba(166,124,64,.72);background:linear-gradient(180deg,rgba(56,42,24,.52),rgba(22,18,20,.94));">
            <div style="font-size:22px;font-weight:900;">Quest ${fmt(active.questNo)} - ${esc(active.label)}</div>
            <div style="margin-top:8px;opacity:.9;">${active.kind === "resource" ? "Give" : "Complete"} ${fmt(active.target)} ${esc(active.unit)}.</div>
            <div style="margin-top:12px;height:14px;border-radius:8px;border:1px solid rgba(122,91,49,.82);background:#15151c;overflow:hidden;">
              <div style="height:100%;width:${Math.max(0, Math.min(100, (progress / Math.max(1, num(active.target, 1))) * 100)).toFixed(2)}%;background:linear-gradient(90deg,#2f7f5c,#8ee2a3);"></div>
            </div>
            <div style="margin-top:8px;font-weight:800;">${fmt(progress)} / ${fmt(active.target)}</div>
            <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;">
              <button id="questGoActionBtn" type="button" style="min-width:0;padding:8px 12px;border-radius:10px;border:1px solid rgba(166,124,64,.82);background:linear-gradient(180deg,#6c4a24,#3b2814);color:#fff3d7;font-weight:900;cursor:pointer;">Go</button>
              ${ready ? `<button id="questClaimBtn" type="button" style="min-width:0;padding:8px 12px;border-radius:10px;border:1px solid rgba(80,142,91,.86);background:linear-gradient(180deg,#2f7f5c,#1d513b);color:#eaffef;font-weight:900;cursor:pointer;">Claim Rewards</button>` : ""}
            </div>
          </div>
        ` : !pending ? `
          <div style="padding:16px;border-radius:14px;border:1px solid rgba(166,124,64,.72);background:linear-gradient(180deg,rgba(56,42,24,.52),rgba(22,18,20,.94));">
            <div style="font-size:22px;font-weight:900;">Quest ${fmt(questNo)}</div>
            <div style="margin-top:8px;opacity:.9;">A random quest will appear here.</div>
          </div>
        ` : ""}
      </div>
    `;
    document.getElementById("questsBackHome")?.addEventListener("click", () => mountHome());
    document.getElementById("questNextBtn")?.addEventListener("click", startNextQuestFromHome);
    document.getElementById("questClaimBtn")?.addEventListener("click", claimQuestReward);
    document.getElementById("questGoActionBtn")?.addEventListener("click", () => {
      const profession = getQuestProfession(active?.professionId);
      navigateHomeTarget(active?.item?.href || profession.href);
    });
  }

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function isGearItem(item) {
    return (item?.type === "gear") || Boolean(item?.slot);
  }

  function currentUserId() {
    return String(window.DSAuth?.getUser?.()?.id || "").trim();
  }

  function formatLastActivity(iso) {
    if (!iso) return "No activity yet";
    const at = new Date(iso);
    if (Number.isNaN(at.getTime())) return "No activity yet";
    const diff = Math.max(0, Date.now() - at.getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return at.toLocaleString("el-GR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatPresenceLabel(player) {
    if (!player) return "Offline";
    if (player.isOnline) return "Online now";
    const pageLabel = player.lastSeenPage
      ? (window.DSAuth?.getPresencePageLabel?.(player.lastSeenPage) || "In Game")
      : "In Game";
    return `${formatLastActivity(player.lastSeenAt)} - ${pageLabel}`;
  }

  function buildOverviewSummary(overview = {}) {
    const professionStats = overview.stats && typeof overview.stats === "object" ? overview.stats : {};
    return [
      { label: "Hero Level", value: `${fmt(overview.heroLevel || 1)} / ${fmt(overview.heroXP || 0)} XP` },
      { label: "Combat Power", value: fmt(overview.combatPower || 0) },
      { label: "Gold", value: fmt(overview.totalGold || 0) },
      { label: "Dungeons", value: fmt(overview.dungeonsCompleted || 0) },
      { label: "HP", value: `${fmt(overview.heroHP || 0)} / ${fmt(overview.heroHPMax || 0)}` },
      { label: "Stamina", value: `${fmt(overview.stamina || 0)} / ${fmt(overview.staminaMax || 0)}` },
      { label: "Attack", value: fmt(overview.heroAttack || 0) },
      { label: "Defense", value: fmt(overview.heroDefense || 0) },
      { label: "Mining", value: `Lv ${fmt(professionStats.mining?.level || 1)} / ${fmt(professionStats.mining?.xp || 0)} XP` },
      { label: "Forge", value: `Lv ${fmt(professionStats.forge?.level || 1)} / ${fmt(professionStats.forge?.xp || 0)} XP` },
      { label: "Woodcutting", value: `Lv ${fmt(professionStats.woodcutting?.level || 1)} / ${fmt(professionStats.woodcutting?.xp || 0)} XP` },
      { label: "Carpentry", value: `Lv ${fmt(professionStats.carpentry?.level || 1)} / ${fmt(professionStats.carpentry?.xp || 0)} XP` },
      { label: "Hunting", value: `Lv ${fmt(professionStats.hunting?.level || 1)} / ${fmt(professionStats.hunting?.xp || 0)} XP` },
      { label: "Fishing", value: `Lv ${fmt(professionStats.fishing?.level || 1)} / ${fmt(professionStats.fishing?.xp || 0)} XP` },
      { label: "Cooking", value: `Lv ${fmt(professionStats.cooking?.level || 1)} / ${fmt(professionStats.cooking?.xp || 0)} XP` },
      { label: "Herbalism", value: `Lv ${fmt(professionStats.herbalism?.level || 1)} / ${fmt(professionStats.herbalism?.xp || 0)} XP` },
      { label: "Alchemy", value: `Lv ${fmt(professionStats.alchemy?.level || 1)} / ${fmt(professionStats.alchemy?.xp || 0)} XP` },
      { label: "Enchanting", value: `Lv ${fmt(professionStats.enchanting?.level || 1)} / ${fmt(professionStats.enchanting?.xp || 0)} XP` }
    ];
  }

  function getPlayersPanelElements() {
    return {
      root: document.getElementById("playersViewRoot"),
      status: document.getElementById("playersPanelStatus"),
      list: document.getElementById("playersPanelList")
    };
  }

  function getPlayerProfileElements() {
    return {
      root: document.getElementById("playerProfileViewRoot"),
      status: document.getElementById("playerProfileStatus"),
      avatarWrap: document.getElementById("playerProfileAvatarWrap"),
      name: document.getElementById("playerProfileName"),
      meta: document.getElementById("playerProfileMeta"),
      tabOverview: document.getElementById("playerTabOverview"),
      tabEquipment: document.getElementById("playerTabEquipment"),
      content: document.getElementById("playerProfileContent")
    };
  }

  function getSendableInventoryEntries() {
    const save = loadSave();
    const inventory = Array.isArray(save.inventory) ? save.inventory : [];
    return inventory
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item && Math.max(1, num(item.quantity ?? item.qty, 1)) > 0);
  }

  function ensureSendItemModal() {
    let modal = document.getElementById("dsSendItemModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "dsSendItemModal";
    modal.__sendState = {
      open: false,
      selectedIndex: -1,
      sending: false,
      recipientName: "",
      status: "",
      error: false
    };
    modal.style.cssText = [
      "display:none",
      "position:fixed",
      "inset:0",
      "z-index:360",
      "background:rgba(5,7,12,.72)",
      "backdrop-filter:blur(8px)",
      "padding:16px",
      "align-items:center",
      "justify-content:center"
    ].join(";");

    modal.innerHTML = `
      <div id="dsSendItemCard" style="width:min(980px, calc(100vw - 24px));max-height:min(86vh, 860px);overflow:auto;border-radius:16px;border:1px solid rgba(166,124,64,.72);background:linear-gradient(180deg, rgba(34,26,20,.98), rgba(15,12,14,.98));box-shadow:0 24px 60px rgba(0,0,0,.42);padding:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;">
          <div>
            <div style="font-size:12px;font-weight:800;opacity:.72;letter-spacing:.4px;">TEMPORARY FEATURE</div>
            <div style="font-size:22px;font-weight:900;color:#f3ead6;">Send Item</div>
          </div>
          <button id="dsSendItemClose" type="button" style="min-width:0;padding:8px 12px;border-radius:10px;border:1px solid rgba(166,124,64,.82);background:linear-gradient(180deg,#4e3a22,#2b2015);color:#fff3d7;font-weight:800;cursor:pointer;">Close</button>
        </div>

        <div id="dsSendItemStatus" style="margin-bottom:12px;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);font-size:13px;color:#eef2ff;">Choose a player and an item from your inventory.</div>

        <div style="display:grid;grid-template-columns:minmax(0,1.2fr) minmax(280px,.8fr);gap:14px;">
          <div style="min-width:0;">
            <div style="font-size:15px;font-weight:900;color:#f3ead6;margin-bottom:8px;">Your Inventory</div>
            <div id="dsSendItemList" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;"></div>
          </div>

          <div style="min-width:0;display:grid;gap:12px;align-content:start;">
            <div style="padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);display:grid;gap:10px;">
              <label style="display:grid;gap:6px;">
                <span style="font-size:12px;font-weight:800;opacity:.86;">Recipient Nickname</span>
                <input id="dsSendItemRecipient" type="text" placeholder="Type exact nickname" style="height:40px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#10131d;color:#eef2ff;padding:0 12px;">
              </label>
              <label style="display:grid;gap:6px;">
                <span style="font-size:12px;font-weight:800;opacity:.86;">Quantity</span>
                <input id="dsSendItemQty" type="number" min="1" step="1" value="1" style="height:40px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#10131d;color:#eef2ff;padding:0 12px;">
              </label>
              <div id="dsSendItemSelected" style="padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);font-size:13px;color:#d9ccb0;">No item selected.</div>
              <button id="dsSendItemConfirm" type="button" style="height:42px;border-radius:12px;border:1px solid rgba(166,124,64,.86);background:linear-gradient(180deg,#6c4a24,#3b2814);color:#fff2d6;font-size:14px;font-weight:900;cursor:pointer;">Send Item</button>
              <div style="font-size:12px;opacity:.76;line-height:1.4;">If the other player does not have enough inventory space, the transfer will be blocked.</div>
            </div>
          </div>
        </div>
      </div>
    `;

    const close = () => {
      modal.__sendState.open = false;
      modal.style.display = "none";
    };

    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
    });
    modal.querySelector("#dsSendItemClose")?.addEventListener("click", close);

    modal.querySelector("#dsSendItemRecipient")?.addEventListener("input", (e) => {
      modal.__sendState.recipientName = String(e.target.value || "");
    });

    modal.querySelector("#dsSendItemQty")?.addEventListener("input", () => {
      renderSendItemModal();
    });

    modal.querySelector("#dsSendItemList")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-send-item-index]");
      if (!btn) return;
      modal.__sendState.selectedIndex = Math.max(0, Math.floor(Number(btn.dataset.sendItemIndex) || 0));
      renderSendItemModal();
    });

    modal.querySelector("#dsSendItemConfirm")?.addEventListener("click", async () => {
      const state = modal.__sendState || {};
      if (state.sending) return;

      const entries = getSendableInventoryEntries();
      const selected = entries.find((entry) => entry.index === state.selectedIndex) || null;
      if (!selected?.item) {
        state.status = "Choose an item first.";
        state.error = true;
        renderSendItemModal();
        return;
      }

      const recipientInput = modal.querySelector("#dsSendItemRecipient");
      const qtyInput = modal.querySelector("#dsSendItemQty");
      const recipientName = String(recipientInput?.value || state.recipientName || "").trim();
      const maxQty = isGearItem(selected.item) ? 1 : Math.max(1, num(selected.item.quantity ?? selected.item.qty, 1));
      let quantity = Math.floor(Number(qtyInput?.value));
      if (!Number.isFinite(quantity)) quantity = 1;
      quantity = Math.max(1, Math.min(maxQty, quantity));
      if (qtyInput) qtyInput.value = String(quantity);

      if (!recipientName) {
        state.status = "Write the other player's nickname.";
        state.error = true;
        renderSendItemModal();
        return;
      }

      try {
        state.sending = true;
        state.status = "Sending item...";
        state.error = false;
        renderSendItemModal();
        const result = await window.DSAuth?.invokeSendItem?.({
          recipientName,
          item: selected.item,
          quantity
        });
        const sentName = String(result?.sentItem?.name || selected.item.name || "Item");
        state.status = `Sent ${quantity}x ${sentName} to ${recipientName}.`;
        state.error = false;
        state.selectedIndex = -1;
        renderSendItemModal();
      } catch (error) {
        state.status = error?.message || "Failed to send item.";
        state.error = true;
        renderSendItemModal();
      } finally {
        state.sending = false;
        renderSendItemModal();
      }
    });

    document.body.appendChild(modal);
    return modal;
  }

  function renderSendItemModal() {
    const modal = ensureSendItemModal();
    const state = modal.__sendState || {};
    const entries = getSendableInventoryEntries();
    const selected = entries.find((entry) => entry.index === state.selectedIndex) || null;
    const recipientInput = modal.querySelector("#dsSendItemRecipient");
    const qtyInput = modal.querySelector("#dsSendItemQty");
    const statusEl = modal.querySelector("#dsSendItemStatus");
    const listEl = modal.querySelector("#dsSendItemList");
    const selectedEl = modal.querySelector("#dsSendItemSelected");
    const confirmBtn = modal.querySelector("#dsSendItemConfirm");

    if (recipientInput && recipientInput.value !== String(state.recipientName || "")) {
      recipientInput.value = String(state.recipientName || "");
    }

    if (statusEl) {
      statusEl.textContent = state.status || "Choose a player and an item from your inventory.";
      statusEl.style.color = state.error ? "#ffd8de" : "#eef2ff";
      statusEl.style.borderColor = state.error ? "rgba(179,72,92,.4)" : "rgba(255,255,255,.08)";
      statusEl.style.background = state.error ? "rgba(78,22,34,.4)" : "rgba(255,255,255,.03)";
    }

    if (listEl) {
      listEl.innerHTML = entries.length
        ? entries.map(({ item, index }) => {
            const qty = Math.max(1, num(item.quantity ?? item.qty, 1));
            const active = selected?.index === index;
            return `
              <button type="button" data-send-item-index="${index}" style="display:flex;align-items:center;gap:10px;min-width:0;padding:10px;border-radius:12px;border:1px solid ${active ? "rgba(199,155,68,.98)" : "rgba(255,255,255,.08)"};background:${active ? "linear-gradient(180deg, rgba(111,83,32,.58), rgba(48,34,18,.92))" : "rgba(255,255,255,.03)"};color:#f3ead6;cursor:pointer;text-align:left;">
                <span style="width:44px;height:44px;flex:0 0 auto;border-radius:10px;border:1px solid rgba(166,124,64,.6);background:#0f1219;display:flex;align-items:center;justify-content:center;overflow:hidden;">
                  ${item.img ? `<img src="${esc(item.img)}" alt="${esc(item.name || "Item")}" style="width:100%;height:100%;object-fit:cover;">` : `<span style="font-size:11px;font-weight:900;">IT</span>`}
                </span>
                <span style="min-width:0;display:flex;flex-direction:column;gap:3px;">
                  <span style="font-size:13px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(item.name || "Item")}</span>
                  <span style="font-size:11px;opacity:.78;">${esc(item.type || "item")}${item.slot ? ` • ${esc(item.slot)}` : ""}${qty > 1 ? ` • x${qty}` : ""}</span>
                </span>
              </button>
            `;
          }).join("")
        : `<div style="padding:14px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);opacity:.82;">Your inventory is empty.</div>`;
    }

    if (selectedEl) {
      if (!selected?.item) {
        selectedEl.textContent = "No item selected.";
      } else {
        const qty = Math.max(1, num(selected.item.quantity ?? selected.item.qty, 1));
        selectedEl.textContent = `${selected.item.name || "Item"}${selected.item.slot ? ` (${selected.item.slot})` : ""} • Available: ${qty}`;
      }
    }

    const maxQty = selected?.item
      ? (isGearItem(selected.item) ? 1 : Math.max(1, num(selected.item.quantity ?? selected.item.qty, 1)))
      : 1;
    if (qtyInput) {
      let qty = Math.floor(Number(qtyInput.value));
      if (!Number.isFinite(qty)) qty = 1;
      qty = Math.max(1, Math.min(maxQty, qty));
      qtyInput.value = String(qty);
      qtyInput.max = String(maxQty);
      qtyInput.disabled = !selected?.item || maxQty <= 1 || state.sending;
    }

    if (confirmBtn) {
      const qty = qtyInput ? Math.max(1, Math.floor(Number(qtyInput.value) || 1)) : 1;
      confirmBtn.disabled = !selected?.item || state.sending || !entries.length;
      confirmBtn.textContent = state.sending ? "Sending..." : `Send${selected?.item ? ` ${qty}x ${selected.item.name || "Item"}` : " Item"}`;
      confirmBtn.style.opacity = confirmBtn.disabled ? ".7" : "1";
      confirmBtn.style.cursor = confirmBtn.disabled ? "default" : "pointer";
    }
  }

  function openSendItemModal() {
    const modal = ensureSendItemModal();
    modal.__sendState.open = true;
    modal.style.display = "flex";
    renderSendItemModal();
  }

  function ensurePlayersModal() {
    let modal = document.getElementById("dsPlayersModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "dsPlayersModal";
    modal.__playersState = {
      open: false,
      loading: false,
      profileLoading: false,
      players: [],
      status: "",
      error: false,
      selectedUserId: "",
      selectedProfile: null,
      profileError: "",
      equipmentOpen: false
    };
    modal.style.cssText = [
      "display:none",
      "position:fixed",
      "inset:0",
      "z-index:360",
      "background:rgba(5,7,12,.72)",
      "backdrop-filter:blur(8px)",
      "padding:16px",
      "align-items:center",
      "justify-content:center"
    ].join(";");

    modal.innerHTML = `
      <div id="dsPlayersCard" style="width:min(1180px, calc(100vw - 24px));max-height:min(88vh, 920px);overflow:auto;border-radius:16px;border:1px solid rgba(166,124,64,.72);background:linear-gradient(180deg, rgba(34,26,20,.98), rgba(15,12,14,.98));box-shadow:0 24px 60px rgba(0,0,0,.42);padding:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap;">
          <div>
            <div style="font-size:12px;font-weight:800;opacity:.72;letter-spacing:.4px;">TEMPORARY FEATURE</div>
            <div style="font-size:22px;font-weight:900;color:#f3ead6;">Players</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <button id="dsPlayersRefresh" type="button" style="min-width:0;padding:8px 12px;border-radius:10px;border:1px solid rgba(166,124,64,.82);background:linear-gradient(180deg,#6c4a24,#3b2814);color:#fff3d7;font-weight:800;cursor:pointer;">Refresh</button>
            <button id="dsPlayersClose" type="button" style="min-width:0;padding:8px 12px;border-radius:10px;border:1px solid rgba(166,124,64,.82);background:linear-gradient(180deg,#4e3a22,#2b2015);color:#fff3d7;font-weight:800;cursor:pointer;">Close</button>
          </div>
        </div>

        <div id="dsPlayersStatus" style="margin-bottom:12px;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);font-size:13px;color:#eef2ff;">Loading players...</div>

        <div style="display:grid;grid-template-columns:minmax(300px, 380px) minmax(0,1fr);gap:14px;align-items:start;">
          <div style="min-width:0;">
            <div id="dsPlayersList" style="display:grid;gap:8px;"></div>
          </div>
          <div style="min-width:0;">
            <div id="dsPlayerProfilePane" style="padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);min-height:320px;"></div>
          </div>
        </div>
      </div>
    `;

    const close = () => {
      modal.__playersState.open = false;
      modal.style.display = "none";
    };

    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
    });
    modal.querySelector("#dsPlayersClose")?.addEventListener("click", close);
    modal.querySelector("#dsPlayersRefresh")?.addEventListener("click", () => {
      loadPlayersDirectory(true);
    });
    modal.querySelector("#dsPlayersList")?.addEventListener("click", (e) => {
      const avatarBtn = e.target.closest("[data-player-avatar-id]");
      if (!avatarBtn) return;
      openPlayerProfile(String(avatarBtn.dataset.playerAvatarId || ""));
    });
    modal.querySelector("#dsPlayerProfilePane")?.addEventListener("click", (e) => {
      const equipBtn = e.target.closest("[data-player-equip-toggle]");
      if (!equipBtn) return;
      const state = modal.__playersState || {};
      state.equipmentOpen = !state.equipmentOpen;
      renderPlayersModal();
    });

    document.body.appendChild(modal);
    return modal;
  }

  async function loadPlayersDirectory(force = false) {
    const modal = ensurePlayersModal();
    const state = modal.__playersState || {};
    if (state.loading && !force) return;

    state.loading = true;
    state.status = "Loading players...";
    state.error = false;
    renderPlayersModal();

    try {
      await window.DSAuth?.ready;
      const client = window.DSAuth?.getClient?.();
      if (!client) throw new Error("Player service is unavailable.");

      const [presence, publicStatsRes] = await Promise.all([
        window.DSAuth?.fetchPresenceSnapshot?.(),
        client.from("player_public_stats").select("user_id, hero_name, hero_level, hero_xp, combat_power, total_gold, dungeons_completed")
      ]);

      if (publicStatsRes?.error) throw publicStatsRes.error;

      const publicRows = Array.isArray(publicStatsRes?.data) ? publicStatsRes.data : [];
      const publicMap = new Map(publicRows.map((row) => [String(row.user_id || ""), row]));
      const me = currentUserId();

      const players = (Array.isArray(presence?.players) ? presence.players : [])
        .map((player) => {
          const stats = publicMap.get(String(player.id || "")) || {};
          return {
            ...player,
            heroLevel: Math.max(1, num(stats.hero_level, 1)),
            heroXP: Math.max(0, num(stats.hero_xp, 0)),
            combatPower: Math.max(0, num(stats.combat_power, 0)),
            totalGold: Math.max(0, num(stats.total_gold, 0)),
            dungeonsCompleted: Math.max(0, num(stats.dungeons_completed, 0)),
            isSelf: String(player.id || "") === me
          };
        })
        .sort((a, b) => {
          if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
          if (a.heroLevel !== b.heroLevel) return b.heroLevel - a.heroLevel;
          const aSeen = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
          const bSeen = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
          return bSeen - aSeen || String(a.name || "").localeCompare(String(b.name || ""));
        });

      state.players = players;
      state.status = `${players.filter((player) => player.isOnline).length} online - ${players.length} total players`;
      state.error = false;

      const selectedStillExists = players.some((player) => player.id === state.selectedUserId);
      if (!selectedStillExists) {
        state.selectedUserId = players[0]?.id || "";
        state.selectedProfile = null;
        state.equipmentOpen = false;
      }

      renderPlayersModal();
      if (state.selectedUserId) {
        await openPlayerProfile(state.selectedUserId, { force });
      }
    } catch (error) {
      state.status = error?.message || "Failed to load players.";
      state.error = true;
      renderPlayersModal();
    } finally {
      state.loading = false;
      renderPlayersModal();
    }
  }

  async function openPlayerProfile(userId, options = {}) {
    const modal = ensurePlayersModal();
    const state = modal.__playersState || {};
    const targetUserId = String(userId || "").trim();
    if (!targetUserId) return;
    const sameUser = state.selectedUserId === targetUserId;
    state.selectedUserId = targetUserId;
    state.profileError = "";
    if (!sameUser || options.force) {
      state.selectedProfile = null;
      state.equipmentOpen = false;
    }
    state.profileLoading = true;
    renderPlayersModal();

    try {
      const result = await window.DSAuth?.invokePlayerProfile?.({ targetUserId });
      if (state.selectedUserId !== targetUserId) return;
      state.selectedProfile = result || null;
      state.profileError = "";
    } catch (error) {
      if (state.selectedUserId !== targetUserId) return;
      state.selectedProfile = null;
      state.profileError = error?.message || "Failed to load player profile.";
    } finally {
      if (state.selectedUserId === targetUserId) {
        state.profileLoading = false;
        renderPlayersModal();
      }
    }
  }

  function renderPlayerEquipmentGrid(equipment = {}) {
    return PLAYER_EQUIP_SLOTS.map((slot) => {
      const item = equipment?.[slot] || null;
      const slotLabel = PLAYER_SLOT_LABELS[slot] || slot;
      const stats = [];
      if (num(item?.atk, 0) > 0) stats.push(`ATK +${fmt(item.atk)}`);
      if (num(item?.def, 0) > 0) stats.push(`DEF +${fmt(item.def)}`);
      return `
        <div style="padding:10px;border-radius:12px;border:1px solid rgba(166,124,64,.42);background:rgba(0,0,0,.16);display:grid;gap:6px;">
          <div style="font-size:11px;font-weight:800;color:#cbb58b;letter-spacing:.3px;">${esc(slotLabel)}</div>
          <div style="display:flex;align-items:center;gap:10px;min-width:0;">
            <span style="width:44px;height:44px;flex:0 0 auto;border-radius:10px;border:1px solid rgba(166,124,64,.56);background:#0f1219;display:flex;align-items:center;justify-content:center;overflow:hidden;">
              ${item?.img ? `<img src="${esc(item.img)}" alt="${esc(item.name || slotLabel)}" style="width:100%;height:100%;object-fit:cover;">` : `<span style="font-size:10px;font-weight:900;color:#8c8570;">Empty</span>`}
            </span>
            <span style="min-width:0;display:grid;gap:2px;">
              <span style="font-size:13px;font-weight:900;color:#f3ead6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(item?.name || "Empty Slot")}</span>
              <span style="font-size:11px;opacity:.8;color:#d9ccb0;">${item ? esc(stats.join(" / ") || item.rarity || "Equipped item") : "Nothing equipped"}</span>
            </span>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderPlayersModal() {
    const modal = ensurePlayersModal();
    const state = modal.__playersState || {};
    const statusEl = modal.querySelector("#dsPlayersStatus");
    const listEl = modal.querySelector("#dsPlayersList");
    const paneEl = modal.querySelector("#dsPlayerProfilePane");

    if (statusEl) {
      statusEl.textContent = state.status || "Browse all players in the game.";
      statusEl.style.color = state.error ? "#ffd8de" : "#eef2ff";
      statusEl.style.borderColor = state.error ? "rgba(179,72,92,.4)" : "rgba(255,255,255,.08)";
      statusEl.style.background = state.error ? "rgba(78,22,34,.4)" : "rgba(255,255,255,.03)";
    }

    if (listEl) {
      listEl.innerHTML = state.players.length
        ? state.players.map((player) => {
            const active = state.selectedUserId === player.id;
            return `
              <div style="display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:center;padding:10px;border-radius:12px;border:1px solid ${active ? "rgba(199,155,68,.98)" : "rgba(255,255,255,.08)"};background:${active ? "linear-gradient(180deg, rgba(111,83,32,.58), rgba(48,34,18,.92))" : "rgba(255,255,255,.03)"};">
                <button type="button" data-player-avatar-id="${esc(player.id)}" style="width:56px;height:56px;border-radius:14px;border:1px solid rgba(166,124,64,.64);background:#0f1219;display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer;padding:0;">
                  <img src="${esc(player.avatarUrl || "images/hero.png")}" alt="${esc(player.name || "Hero")}" style="width:100%;height:100%;object-fit:cover;">
                </button>
                <div style="min-width:0;display:grid;gap:4px;">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span style="font-size:15px;font-weight:900;color:#f3ead6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(player.name || "Hero")}${player.isSelf ? " (You)" : ""}</span>
                    <span style="padding:3px 8px;border-radius:999px;font-size:11px;font-weight:900;color:${player.isOnline ? "#e6ffef" : "#f3ead6"};background:${player.isOnline ? "rgba(25,107,61,.55)" : "rgba(255,255,255,.08)"};">${player.isOnline ? "Online" : "Offline"}</span>
                  </div>
                  <div style="font-size:12px;color:#d9ccb0;">Level ${fmt(player.heroLevel || 1)} - XP ${fmt(player.heroXP || 0)}</div>
                  <div style="font-size:12px;color:#c6cbd8;">${esc(formatPresenceLabel(player))}</div>
                </div>
              </div>
            `;
          }).join("")
        : `<div style="padding:14px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);opacity:.82;">No players found yet.</div>`;
    }

    if (!paneEl) return;

    if (!state.selectedUserId) {
      paneEl.innerHTML = `<div style="display:grid;place-items:center;min-height:300px;color:#d9ccb0;opacity:.86;">Choose a player portrait to open the profile window.</div>`;
      return;
    }

    if (state.profileLoading) {
      paneEl.innerHTML = `<div style="display:grid;place-items:center;min-height:300px;color:#f3ead6;">Loading profile...</div>`;
      return;
    }

    if (state.profileError) {
      paneEl.innerHTML = `<div style="display:grid;gap:10px;"><div style="padding:12px;border-radius:12px;border:1px solid rgba(179,72,92,.45);background:rgba(78,22,34,.4);color:#ffd8de;">${esc(state.profileError)}</div></div>`;
      return;
    }

    const profilePayload = state.selectedProfile || {};
    const profile = profilePayload.profile || {};
    const overview = profilePayload.overview || {};
    const equipment = profilePayload.equipment || {};
    const summary = buildOverviewSummary(overview);
    const currentPlayer = state.players.find((player) => player.id === state.selectedUserId) || null;

    paneEl.innerHTML = `
      <div style="display:grid;gap:14px;">
        <div style="display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px;align-items:start;">
          <div style="display:grid;gap:10px;justify-items:center;">
            <div style="width:112px;height:112px;border-radius:20px;border:1px solid rgba(166,124,64,.7);background:#0f1219;overflow:hidden;box-shadow:0 10px 24px rgba(0,0,0,.28);">
              <img src="${esc(profile.avatarUrl || currentPlayer?.avatarUrl || "images/hero.png")}" alt="${esc(profile.name || currentPlayer?.name || "Hero")}" style="width:100%;height:100%;object-fit:cover;">
            </div>
            <button type="button" data-player-equip-toggle="1" style="min-width:180px;height:40px;border-radius:12px;border:1px solid rgba(166,124,64,.86);background:linear-gradient(180deg,#6c4a24,#3b2814);color:#fff2d6;font-size:13px;font-weight:900;cursor:pointer;">${state.equipmentOpen ? "Hide Equipment" : "View Equipment"}</button>
          </div>
          <div style="min-width:0;display:grid;gap:8px;">
            <div style="font-size:24px;font-weight:900;color:#f3ead6;line-height:1.1;">${esc(profile.name || currentPlayer?.name || "Hero")}</div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span style="padding:4px 10px;border-radius:999px;font-size:11px;font-weight:900;color:${currentPlayer?.isOnline ? "#e6ffef" : "#f3ead6"};background:${currentPlayer?.isOnline ? "rgba(25,107,61,.55)" : "rgba(255,255,255,.08)"};">${currentPlayer?.isOnline ? "Online" : "Offline"}</span>
              <span style="font-size:12px;color:#d9ccb0;">Last activity: ${esc(formatLastActivity(profile.lastSeenAt || currentPlayer?.lastSeenAt))}</span>
            </div>
            <div style="font-size:13px;color:#c6cbd8;">Last page: ${esc(window.DSAuth?.getPresencePageLabel?.(profile.lastSeenPage || currentPlayer?.lastSeenPage || "") || "In Game")}</div>
            <div style="padding:12px;border-radius:12px;border:1px solid rgba(166,124,64,.32);background:rgba(0,0,0,.14);display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;">
              ${summary.map((entry) => `
                <div style="padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);">
                  <div style="font-size:11px;font-weight:800;letter-spacing:.3px;color:#cbb58b;opacity:.9;">${esc(entry.label)}</div>
                  <div style="margin-top:4px;font-size:14px;font-weight:900;color:#f3ead6;line-height:1.35;">${esc(entry.value)}</div>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
        ${state.equipmentOpen ? `
          <div style="display:grid;gap:10px;">
            <div style="font-size:16px;font-weight:900;color:#f3ead6;">Equipped Gear</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;">
              ${renderPlayerEquipmentGrid(equipment)}
            </div>
          </div>
        ` : ""}
      </div>
    `;
  }

  function openPlayersModal() {
    const modal = ensurePlayersModal();
    modal.__playersState.open = true;
    modal.style.display = "flex";
    renderPlayersModal();
    loadPlayersDirectory();
  }

  function renderPlayersPanel() {
    const els = getPlayersPanelElements();
    if (!els.root) return;

    if (els.status) {
      els.status.textContent = playersPanelState.status || "Browse all players in the game.";
      els.status.style.color = playersPanelState.error ? "#ffd8de" : "#eef2ff";
      els.status.style.borderColor = playersPanelState.error ? "rgba(179,72,92,.4)" : "rgba(255,255,255,.08)";
      els.status.style.background = playersPanelState.error ? "rgba(78,22,34,.4)" : "rgba(255,255,255,.03)";
    }

    if (els.list) {
      els.list.innerHTML = playersPanelState.players.length
        ? playersPanelState.players.map((player) => {
            return `
              <button type="button" data-player-panel-avatar-id="${esc(player.id)}" style="display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:center;padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);cursor:pointer;text-align:left;color:inherit;">
                <span style="width:60px;height:60px;border-radius:16px;border:1px solid rgba(166,124,64,.64);background:#0f1219;display:flex;align-items:center;justify-content:center;overflow:hidden;">
                  <img src="${esc(player.avatarUrl || "images/hero.png")}" alt="${esc(player.name || "Hero")}" style="width:100%;height:100%;object-fit:cover;">
                </span>
                <span style="min-width:0;display:grid;gap:4px;">
                  <span style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span style="font-size:15px;font-weight:900;color:#f3ead6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(player.name || "Hero")}${player.isSelf ? " (You)" : ""}</span>
                    <span style="padding:3px 8px;border-radius:999px;font-size:11px;font-weight:900;color:${player.isOnline ? "#e6ffef" : "#f3ead6"};background:${player.isOnline ? "rgba(25,107,61,.55)" : "rgba(255,255,255,.08)"};">${player.isOnline ? "Online" : "Offline"}</span>
                  </span>
                  <span style="font-size:12px;color:#d9ccb0;">Level ${fmt(player.heroLevel || 1)} - XP ${fmt(player.heroXP || 0)}</span>
                  <span style="font-size:12px;color:#c6cbd8;">${esc(formatPresenceLabel(player))}</span>
                </span>
              </button>
            `;
          }).join("")
        : `<div style="padding:14px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);opacity:.82;">No players found yet.</div>`;
    }
  }

  function renderPlayerProfileView() {
    const els = getPlayerProfileElements();
    if (!els.root) return;

    const currentPlayer = playersPanelState.players.find((player) => player.id === playersPanelState.selectedUserId) || null;
    const profilePayload = playersPanelState.selectedProfile || {};
    const profile = profilePayload.profile || {};
    const overview = profilePayload.overview || {};
    const equipment = profilePayload.equipment || {};
    const summary = buildOverviewSummary(overview);

    if (els.name) els.name.textContent = profile.name || currentPlayer?.name || "Hero";
    if (els.meta) {
      els.meta.textContent = currentPlayer
        ? `Level ${fmt(currentPlayer.heroLevel || 1)} - ${formatPresenceLabel(currentPlayer)}`
        : "Public player profile";
    }
    if (els.avatarWrap) {
      els.avatarWrap.innerHTML = `<img src="${esc(profile.avatarUrl || currentPlayer?.avatarUrl || "images/hero.png")}" alt="${esc(profile.name || currentPlayer?.name || "Hero")}" style="width:100%;height:100%;object-fit:cover;">`;
    }
    if (els.status) {
      if (playersPanelState.profileLoading) {
        els.status.style.display = "";
        els.status.textContent = "Loading profile...";
        els.status.style.color = "#eef2ff";
        els.status.style.borderColor = "rgba(255,255,255,.08)";
        els.status.style.background = "rgba(255,255,255,.03)";
      } else if (playersPanelState.profileError) {
        els.status.style.display = "";
        els.status.textContent = playersPanelState.profileError;
        els.status.style.color = "#ffd8de";
        els.status.style.borderColor = "rgba(179,72,92,.4)";
        els.status.style.background = "rgba(78,22,34,.4)";
      } else {
        els.status.style.display = "none";
      }
    }
    if (els.tabOverview) {
      const active = playersPanelState.profileTab === "overview";
      els.tabOverview.style.background = active ? "linear-gradient(180deg,#6c4a24,#3b2814)" : "linear-gradient(180deg,#3d3220,#241b14)";
      els.tabOverview.style.borderColor = active ? "rgba(166,124,64,.86)" : "rgba(166,124,64,.56)";
      els.tabOverview.style.color = active ? "#fff2d6" : "#eadcbc";
    }
    if (els.tabEquipment) {
      const active = playersPanelState.profileTab === "equipment";
      els.tabEquipment.style.background = active ? "linear-gradient(180deg,#6c4a24,#3b2814)" : "linear-gradient(180deg,#3d3220,#241b14)";
      els.tabEquipment.style.borderColor = active ? "rgba(166,124,64,.86)" : "rgba(166,124,64,.56)";
      els.tabEquipment.style.color = active ? "#fff2d6" : "#eadcbc";
    }
    if (!els.content) return;

    if (playersPanelState.profileLoading) {
      els.content.innerHTML = `<div style="display:grid;place-items:center;min-height:320px;padding:20px;border-radius:16px;border:1px solid rgba(166,124,64,.3);background:rgba(255,255,255,.03);color:#f3ead6;">Loading profile...</div>`;
      return;
    }

    if (playersPanelState.profileError) {
      els.content.innerHTML = `<div style="display:grid;place-items:center;min-height:320px;padding:20px;border-radius:16px;border:1px solid rgba(166,124,64,.3);background:rgba(255,255,255,.03);color:#d9ccb0;">Could not load this player profile.</div>`;
      return;
    }

    if (playersPanelState.profileTab === "equipment") {
      els.content.innerHTML = `
        <div style="padding:16px;border-radius:16px;border:1px solid rgba(166,124,64,.72);background:linear-gradient(180deg, rgba(56,42,24,.32), rgba(22,18,20,.94));box-shadow:0 18px 38px rgba(0,0,0,.24);">
          <div style="font-size:18px;font-weight:900;color:#f3ead6;margin-bottom:12px;text-align:center;">Equipment</div>
          <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;">
            ${renderPlayerEquipmentGrid(equipment)}
          </div>
        </div>
      `;
      return;
    }

    els.content.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;">
        ${summary.map((entry) => `
          <div style="background:linear-gradient(180deg, rgba(86,64,38,.34), rgba(26,23,26,.16) 42%, rgba(0,0,0,.10) 100%), linear-gradient(180deg, #34281d 0%, #1d1a1d 100%);border:1px solid rgba(126,94,50,.88);border-radius:12px;padding:10px 11px;box-shadow:0 0 0 1px rgba(28,20,12,.84), inset 0 1px 0 rgba(255,228,178,.08), inset 0 -10px 16px rgba(0,0,0,.14), 0 10px 18px rgba(0,0,0,.18);">
            <div style="font-size:12px;font-weight:900;color:#f3ead6;text-shadow:0 1px 0 rgba(74,47,14,.95),0 0 8px rgba(0,0,0,.3),0 2px 6px rgba(0,0,0,.58);">${esc(entry.label)}</div>
            <div style="margin-top:8px;font-size:18px;font-weight:900;color:#fff1cf;line-height:1.3;">${esc(entry.value)}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  async function loadPlayersPanel(force = false) {
    if (playersPanelState.loading && !force) return;
    playersPanelState.loading = true;
    playersPanelState.status = "Loading players...";
    playersPanelState.error = false;
    renderPlayersPanel();

    try {
      await window.DSAuth?.ready;
      const client = window.DSAuth?.getClient?.();
      if (!client) throw new Error("Player service is unavailable.");

      const [presence, publicStatsRes] = await Promise.all([
        window.DSAuth?.fetchPresenceSnapshot?.(),
        client.from("player_public_stats").select("user_id, hero_name, hero_level, hero_xp, combat_power, total_gold, dungeons_completed")
      ]);

      if (publicStatsRes?.error) throw publicStatsRes.error;

      const publicRows = Array.isArray(publicStatsRes?.data) ? publicStatsRes.data : [];
      const publicMap = new Map(publicRows.map((row) => [String(row.user_id || ""), row]));
      const me = currentUserId();

      playersPanelState.players = (Array.isArray(presence?.players) ? presence.players : [])
        .map((player) => {
          const stats = publicMap.get(String(player.id || "")) || {};
          return {
            ...player,
            heroLevel: Math.max(1, num(stats.hero_level, 1)),
            heroXP: Math.max(0, num(stats.hero_xp, 0)),
            combatPower: Math.max(0, num(stats.combat_power, 0)),
            totalGold: Math.max(0, num(stats.total_gold, 0)),
            dungeonsCompleted: Math.max(0, num(stats.dungeons_completed, 0)),
            isSelf: String(player.id || "") === me
          };
        })
        .sort((a, b) => {
          if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
          if (a.heroLevel !== b.heroLevel) return b.heroLevel - a.heroLevel;
          const aSeen = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
          const bSeen = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
          return bSeen - aSeen || String(a.name || "").localeCompare(String(b.name || ""));
        });

      playersPanelState.status = `${playersPanelState.players.filter((player) => player.isOnline).length} online - ${playersPanelState.players.length} total players`;
      playersPanelState.error = false;

      const selectedStillExists = playersPanelState.players.some((player) => player.id === playersPanelState.selectedUserId);
      if (!selectedStillExists) {
        playersPanelState.selectedUserId = "";
        playersPanelState.selectedProfile = null;
        playersPanelState.profileTab = "overview";
      }

      renderPlayersPanel();
      if (playersPanelState.selectedUserId) {
        await openPlayersPanelProfile(playersPanelState.selectedUserId, { force });
      }
    } catch (error) {
      playersPanelState.status = error?.message || "Failed to load players.";
      playersPanelState.error = true;
      renderPlayersPanel();
    } finally {
      playersPanelState.loading = false;
      renderPlayersPanel();
    }
  }

  async function openPlayersPanelProfile(userId, options = {}) {
    const targetUserId = String(userId || "").trim();
    if (!targetUserId) return;
    const sameUser = playersPanelState.selectedUserId === targetUserId;
    playersPanelState.selectedUserId = targetUserId;
    playersPanelState.profileError = "";
    if (!sameUser || options.force) {
      playersPanelState.selectedProfile = null;
      playersPanelState.profileTab = "overview";
    }
    if (options.mountView !== false) mountPlayerProfileView();
    playersPanelState.profileLoading = true;
    renderPlayerProfileView();

    try {
      const result = await window.DSAuth?.invokePlayerProfile?.({ targetUserId });
      if (playersPanelState.selectedUserId !== targetUserId) return;
      playersPanelState.selectedProfile = result || null;
      playersPanelState.profileError = "";
    } catch (error) {
      if (playersPanelState.selectedUserId !== targetUserId) return;
      playersPanelState.selectedProfile = null;
      playersPanelState.profileError = error?.message || "Failed to load player profile.";
    } finally {
      if (playersPanelState.selectedUserId === targetUserId) {
        playersPanelState.profileLoading = false;
        renderPlayerProfileView();
      }
    }
  }

  function selectedProfilePlayer() {
    const currentPlayer = playersPanelState.players.find((player) => player.id === playersPanelState.selectedUserId) || null;
    const profile = playersPanelState.selectedProfile?.profile || {};
    const id = String(profile.id || currentPlayer?.id || playersPanelState.selectedUserId || "");
    if (!id || id === currentUserId()) return null;
    return {
      id,
      name: String(profile.name || currentPlayer?.name || "Player"),
      avatarUrl: String(profile.avatarUrl || currentPlayer?.avatarUrl || ""),
      isOnline: Boolean(currentPlayer?.isOnline),
      lastSeenPage: String(profile.lastSeenPage || currentPlayer?.lastSeenPage || ""),
      heroLevel: Math.max(1, num(playersPanelState.selectedProfile?.overview?.heroLevel ?? currentPlayer?.heroLevel, 1))
    };
  }

  function openExternalPlayerProfile(player = {}) {
    const id = String(player.id || "").trim();
    if (!id) return false;
    const existing = playersPanelState.players.find((entry) => entry.id === id);
    if (!existing) {
      playersPanelState.players.push({
        id,
        name: String(player.name || "Player"),
        avatarUrl: String(player.avatarUrl || "images/hero.png"),
        isOnline: Boolean(player.isOnline),
        lastSeenAt: player.lastSeenAt || null,
        lastSeenPage: String(player.lastSeenPage || ""),
        heroLevel: Math.max(1, num(player.heroLevel, 1)),
        heroXP: Math.max(0, num(player.heroXP, 0)),
        isSelf: id === currentUserId()
      });
    }
    openPlayersPanelProfile(id, { mountView: true });
    return true;
  }

  function bindPlayersPanel() {
    document.getElementById("playersBackHome")?.addEventListener("click", () => mountHome());
    document.getElementById("playersRefreshBtn")?.addEventListener("click", () => loadPlayersPanel(true));
    document.getElementById("playersPanelList")?.addEventListener("click", (e) => {
      const avatarBtn = e.target.closest("[data-player-panel-avatar-id]");
      if (!avatarBtn) return;
      openPlayersPanelProfile(String(avatarBtn.dataset.playerPanelAvatarId || ""), { mountView: true });
    });
  }

  function bindPlayerProfileView() {
    document.getElementById("playerProfileBackBtn")?.addEventListener("click", () => mountPlayersView());
    document.getElementById("playerTabOverview")?.addEventListener("click", () => {
      playersPanelState.profileTab = "overview";
      renderPlayerProfileView();
    });
    document.getElementById("playerTabEquipment")?.addEventListener("click", () => {
      playersPanelState.profileTab = "equipment";
      renderPlayerProfileView();
    });
    document.getElementById("playerWhisperBtn")?.addEventListener("click", (event) => {
      const player = selectedProfilePlayer();
      if (!player) return;
      window.DSUI?.openWhisperWithPlayer?.(player);
      const btn = event.currentTarget;
      if (btn) {
        btn.textContent = "Chat Opened";
        btn.disabled = true;
        btn.style.borderColor = "rgba(157,255,180,.7)";
        btn.style.background = "linear-gradient(180deg,rgba(28,104,58,.95),rgba(17,68,39,.95))";
        btn.style.color = "#effff4";
        btn.style.cursor = "default";
      }
    });
  }

  function mountPlayerProfileView() {
    const left = el("leftPanel");
    if (!left) return false;
    left.innerHTML = PLAYER_PROFILE_VIEW_TEMPLATE;
    document.title = "Darkstone Chronicles";
    bindPlayerProfileView();
    renderPlayerProfileView();
    return true;
  }

  function mountPlayersView() {
    const left = el("leftPanel");
    if (!left) return false;
    playersPanelState.selectedUserId = "";
    playersPanelState.selectedProfile = null;
    playersPanelState.profileError = "";
    playersPanelState.profileLoading = false;
    playersPanelState.profileTab = "overview";
    left.innerHTML = PLAYERS_VIEW_TEMPLATE;
    document.title = "Darkstone Chronicles";
    bindPlayersPanel();
    renderPlayersPanel();
    loadPlayersPanel(true);
    return true;
  }

  function navigateHomeTarget(href) {
    if (window.DSUI?.navigateWithinShell?.(href)) return;
    window.location.href = href;
  }

  function bindHomeNav(scope = document) {
    const bindings = [
      ["goFight", "fight.html"],
      ["goProfessions", "professions.html"],
      ["goOverview", "professions_overview.html"],
      ["goDungeons", "dungeons.html"],
      ["goBuildings", "buildings.html"],
      ["goChallenges", "challenges.html"],
      ["goEquip", "equipment.html"],
      ["goMarket", "market.html"],
      ["goShop", "shop.html"],
      ["goBank", "bank.html"],
      ["goStats", "stats.html"]
    ];

    bindings.forEach(([id, href]) => {
      const btn = el(id, scope);
      if (!btn || btn.dataset.dsHomeBound === "1") return;
      btn.dataset.dsHomeBound = "1";
      btn.addEventListener("click", () => navigateHomeTarget(href));
    });

    const sendBtn = el("goSendItem", scope);
    if (sendBtn && sendBtn.dataset.dsHomeBound !== "1") {
      sendBtn.dataset.dsHomeBound = "1";
      sendBtn.addEventListener("click", () => openSendItemModal());
    }

    const playersBtn = el("goPlayers", scope);
    if (playersBtn && playersBtn.dataset.dsHomeBound !== "1") {
      playersBtn.dataset.dsHomeBound = "1";
      playersBtn.addEventListener("click", () => mountPlayersView());
    }

    const questsBtn = el("goQuests", scope);
    if (questsBtn && questsBtn.dataset.dsHomeBound !== "1") {
      questsBtn.dataset.dsHomeBound = "1";
      questsBtn.addEventListener("click", () => renderQuestsPanel());
    }
  }

  function mountHome(root = null) {
    const left = root || el("leftPanel");
    if (!left) return false;
    left.innerHTML = HOME_TEMPLATE;
    document.title = "Darkstone Chronicles";
    bindHomeNav(document);
    return true;
  }

  function initExistingHome() {
    if (currentPage() !== "index.html") return false;
    if (!el("homeHub")) return false;
    return mountHome();
  }

  window.DSHome = {
    mount: mountHome,
    openSendItemModal,
    openPlayersModal: mountPlayersView,
    openPlayerProfile: openExternalPlayerProfile
  };

  window.addEventListener("DOMContentLoaded", () => {
    initExistingHome();
  });
})();
