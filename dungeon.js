// dungeon.js β€” Darkstone Chronicles (Dungeons: entry + run) //668
// Works on:
// - dungeon.html (list)  -> DS_DUNGEON.enterCrypt()
// - dungeon_run.html (battle) -> auto-start if active run exists

(() => {
  const SAVE_KEY = "darkstone_save_v1";
  const ACTIVE_KEY = "ds_active_dungeon_v1";
  const PENDING_KEY = "ds_pending_dungeon_v1";

  const TICK_MS = 6000;
  const POST_WAVE_PAUSE_MS = TICK_MS;
  const STAT_POINTS_PER_LEVEL = 5;
  const MAX_WAVE_ROUNDS = 15;
  const CRYPT_SIGIL_ITEM = { type:"material", name:"Crypt Sigil", img:"images/items/sigils/crypt_sigil.webp" };
  const ROUGH_GEM_DROP_CHANCE = 1 / 100;
  const ORB_OF_CREATION_DROP_CHANCE = 1 / 30;
  const ORB_OF_CREATION_ITEM = { type:"material", id:"orb_of_creation", name:"Orb of Creation", img:"images/ui/orb_of_creation.webp" };
  const ROUGH_GEM_POOL = [
    { type:"material", id:"rough_ruby", name:"Rough Ruby", img:"images/gems/rough_ruby.png" },
    { type:"material", id:"rough_sapphire", name:"Rough Sapphire", img:"images/gems/rough_sapphire.png" },
    { type:"material", id:"rough_emerald", name:"Rough Emerald", img:"images/gems/rough_emerald.png" },
    { type:"material", id:"rough_topaz", name:"Rough Topaz", img:"images/gems/rough_topaz.png" },
    { type:"material", id:"rough_amethyst", name:"Rough Amethyst", img:"images/gems/rough_amethyst.png" }
  ];
  const DUNGEON_LIST_TEMPLATE = `
    <h1 style="color:#ead39b;text-shadow:0 1px 0 rgba(87, 58, 16, .95),0 0 10px rgba(0,0,0,.34),0 2px 8px rgba(0,0,0,.72);">Dungeons</h1>
    <div style="width:90%;max-width:900px;margin:0 auto;">
      <div id="dungeonCards" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;justify-items:center;"></div>
      <div id="msg" style="margin-top:10px;text-align:center;opacity:.9;"></div>
    </div>
  `;
  const DUNGEON_RUN_TEMPLATE = `
    <h1 id="dungeonTitle">&#127984; Dungeon</h1>

    <div id="battleWrap" style="width:90%;max-width:700px;margin:18px auto;">
      <div id="prepText" style="margin:0 0 8px 0;font-size:12px;opacity:.85;"></div>
      <div id="enterDungeonRow" style="display:none;justify-content:center;margin:0 0 12px 0;">
        <button id="enterDungeonBtn" style="min-width:180px;">Enter Dungeon</button>
      </div>
      <div id="runAgainRow" style="display:none;justify-content:center;margin:0 0 12px 0;">
        <button id="runAgainBtn" style="min-width:160px;">Run Again</button>
      </div>

      <div id="vsCard" style="display:none;position:relative;align-items:center;justify-content:space-between;gap:10px;background:#151520;border-radius:12px;border:2px solid #333;padding:12px;">
        <div style="flex:1;text-align:center;">
          <img id="heroImg" src="images/hero.png" alt="Hero" style="width:90px;height:90px;border-radius:10px;border:2px solid #333;object-fit:cover;">
          <div id="heroInfo" style="margin-top:8px;font-size:14px;"></div>
          <div style="height:10px;background:#222;border:1px solid #333;border-radius:6px;margin-top:6px;">
            <div id="heroHpBar" style="height:100%;width:100%;border-radius:6px;"></div>
          </div>
          <div id="heroHpText" style="margin-top:4px;font-size:12px;opacity:.9;"></div>
        </div>

        <div style="font-size:28px;font-weight:bold;opacity:.9;">VS</div>

        <div style="flex:1;text-align:center;">
          <img id="mobImg" src="" alt="Mob" style="width:90px;height:90px;border-radius:10px;border:2px solid #333;object-fit:cover;">
          <div id="mobInfo" style="margin-top:8px;font-size:14px;"></div>
          <div style="height:10px;background:#222;border:1px solid #333;border-radius:6px;margin-top:6px;">
            <div id="mobHpBar" style="height:100%;width:100%;border-radius:6px;"></div>
          </div>
          <div id="mobHpText" style="margin-top:4px;font-size:12px;opacity:.9;"></div>
        </div>
      </div>

      <div id="waveCard" style="display:none;position:relative;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px;background:#151520;border-radius:12px;border:2px solid #333;padding:42px 12px 18px;min-height:186px;box-sizing:border-box;">
        <div id="runTimerWrap" style="position:absolute;left:10px;top:8px;display:flex;align-items:center;gap:6px;opacity:.8;font-size:12px;pointer-events:none;">
          <span>β±</span>
          <span id="runTimer" style="font-weight:800;letter-spacing:.4px;">00:00</span>
        </div>
        <div style="position:absolute;left:50%;top:12px;transform:translateX(-50%);display:flex;justify-content:center;align-items:center;pointer-events:none;">
          <div id="waveLabel" style="font-weight:700;text-align:center;"></div>
        </div>
        <div style="display:flex;justify-content:center;align-items:center;align-self:center;">
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:150px;">
            <div style="display:flex;align-items:flex-start;justify-content:center;gap:10px;width:100%;">
              <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:0 0 auto;">
                <img id="waveHeroImg" src="images/hero.png" alt="Hero" style="width:82px;height:82px;border-radius:10px;border:2px solid #333;object-fit:cover;flex:0 0 auto;">
                <div style="width:74px;height:6px;background:#222;border:1px solid #333;border-radius:999px;overflow:hidden;">
                  <div id="waveHeroHpBar" style="height:100%;width:100%;border-radius:999px;background:linear-gradient(90deg, #39d98a, #198754);"></div>
                </div>
                <div id="waveHeroHpText" style="font-size:10px;opacity:.85;line-height:1;"></div>
                <div id="waveHeroDamageText" style="display:none;margin-top:2px;padding:4px 8px;border-radius:999px;border:1px solid rgba(210, 80, 80, .35);background:rgba(60, 18, 18, .82);box-shadow:0 0 10px rgba(150, 30, 30, .16);font-size:9px;font-weight:700;line-height:1;text-align:center;color:#ffe1e1;white-space:nowrap;"></div>
              </div>
              <div id="wavePetStack" style="display:none;flex-direction:column;align-items:center;justify-content:space-between;height:82px;flex:0 0 auto;">
                <div id="waveCombatPetBadge" style="display:none;flex-direction:column;align-items:center;gap:3px;flex:0 0 auto;">
                  <div id="waveCombatPetIcon" style="width:34px;height:34px;border-radius:9px;border:2px solid #333;background:#101522;color:#eef2ff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;overflow:hidden;box-sizing:border-box;"></div>
                  <div style="width:34px;height:4px;background:#222;border:1px solid #333;border-radius:999px;overflow:hidden;">
                    <div id="waveCombatPetXpBar" style="height:100%;width:0%;border-radius:999px;background:#4aa3ff;"></div>
                  </div>
                </div>
                <div id="waveFortunePetBadge" style="display:none;flex-direction:column;align-items:center;gap:3px;flex:0 0 auto;">
                  <div id="waveFortunePetIcon" style="width:34px;height:34px;border-radius:9px;border:2px solid #333;background:#101522;color:#eef2ff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;overflow:hidden;box-sizing:border-box;"></div>
                  <div style="width:34px;height:4px;background:#222;border:1px solid #333;border-radius:999px;overflow:hidden;">
                    <div id="waveFortunePetXpBar" style="height:100%;width:0%;border-radius:999px;background:#4aa3ff;"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:center;align-self:center;min-width:126px;">
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;">
            <img src="images/ui/my_vs_icon.webp" alt="VS" style="width:126px;height:126px;object-fit:contain;display:block;">
            <div id="encounterStatus" style="min-height:28px;font-size:12px;line-height:1.2;opacity:.92;text-align:center;max-width:160px;"></div>
          </div>
        </div>
        <div style="display:flex;justify-content:center;align-items:center;align-self:center;min-width:0;">
          <div style="min-width:0;display:flex;flex-direction:column;align-items:center;gap:4px;position:relative;width:120px;">
            <div id="waveMobInfo" style="position:absolute;left:50%;top:-28px;transform:translateX(-50%);font-size:13px;opacity:.9;text-align:center;white-space:nowrap;"></div>
            <img id="waveMobImg" src="" alt="Mob" style="width:82px;height:82px;border-radius:10px;border:2px solid #333;object-fit:cover;">
            <div style="width:74px;height:6px;background:#222;border:1px solid #333;border-radius:999px;overflow:hidden;">
              <div id="waveHpBar" style="height:100%;width:0%;border-radius:999px;background:linear-gradient(90deg, #ff5555, #bb0000);"></div>
            </div>
            <div id="waveHpText" style="font-size:10px;opacity:.85;line-height:1;"></div>
            <div id="waveMobDamageText" style="display:none;margin-top:2px;padding:4px 8px;border-radius:999px;border:1px solid rgba(70, 190, 120, .35);background:rgba(20, 50, 30, .78);box-shadow:0 0 10px rgba(20, 120, 60, .14);font-size:9px;font-weight:700;line-height:1;text-align:center;color:#dff7e8;white-space:nowrap;"></div>
          </div>
        </div>

        <div id="battleLog" style="grid-column:1 / -1;min-height:18px;margin-top:6px;font-size:12px;line-height:1.2;opacity:.92;text-align:center;"></div>
      </div>

      <div id="cooldownWrap" style="margin-top:10px;display:none;">
        <div style="display:flex;justify-content:space-between;font-size:12px;opacity:.9;">
          <span id="cooldownLabel">Next</span>
          <span id="cooldownText">6.0s</span>
        </div>
        <div style="height:10px;background:#222;border:1px solid #333;border-radius:6px;margin-top:6px;overflow:hidden;">
          <div id="cooldownBar" style="height:100%;width:0%;border-radius:6px;"></div>
        </div>
      </div>
    </div>
  `;
  let __dungeonListMounted = false;
  let __dungeonListOpenPanel = null;
  let __dungeonListOutsideClick = null;
  let __dungeonListResize = null;
  let __dungeonRunMounted = false;
  let __dungeonRunEnterHandler = null;
  let __dungeonRunAgainHandler = null;

  const DUNGEON_DEFS = [
    {
      id: "ice",
      name: "Frostveil Citadel",
      setId: "frostveil",
      setName: "Frostveil",
      reqLevel: 10,
      entryCost: 10,
      rewards: { goldMin: 400, goldMax: 800, xpMin: 450, xpMax: 700 },
      waves: [
        ["frost_wisp", "Frost Wisp"],
        ["glacier_mite", "Glacier Mite"],
        ["icebound_reaver", "Icebound Reaver"],
        ["shard_golem", "Shard Golem"],
        ["snow_zealot", "Snow Zealot"]
      ],
      boss: ["auric_frostlord", "Auric Frostlord"]
    },
    {
      id: "ash",
      name: "Ashen Vault",
      setId: "ashen_guard",
      setName: "Ashen Guard",
      reqLevel: 20,
      entryCost: 14,
      rewards: { goldMin: 800, goldMax: 1300, xpMin: 700, xpMax: 1050 },
      waves: [
        ["cinder_rat", "Cinder Rat"],
        ["smoke_imp", "Smoke Imp"],
        ["char_hound", "Char Hound"],
        ["ember_fiend", "Ember Fiend"],
        ["slag_keeper", "Slag Keeper"]
      ],
      boss: ["vault_pyrelord", "Vault Pyrelord"]
    },
    {
      id: "bog",
      name: "Mirewake Hollow",
      setId: "mirewake",
      setName: "Mirewake",
      reqLevel: 30,
      entryCost: 18,
      rewards: { goldMin: 1300, goldMax: 1900, xpMin: 1050, xpMax: 1500 },
      waves: [
        ["fen_larva", "Fen Larva"],
        ["bog_shambler", "Bog Shambler"],
        ["miretoad", "Miretoad"],
        ["rot_stalker", "Rot Stalker"],
        ["plague_bulwark", "Plague Bulwark"]
      ],
      boss: ["mirewake_abomination", "Mirewake Abomination"]
    },
    {
      id: "thorn",
      name: "Thornmaw Den",
      setId: "thornbound",
      setName: "Thornbound",
      reqLevel: 40,
      entryCost: 22,
      rewards: { goldMin: 1900, goldMax: 2600, xpMin: 1500, xpMax: 2000 },
      waves: [
        ["briar_sprite", "Briar Sprite"],
        ["razor_vine", "Razor Vine"],
        ["thorn_howler", "Thorn Howler"],
        ["root_mauler", "Root Mauler"],
        ["sap_guardian", "Sap Guardian"]
      ],
      boss: ["thornmaw_matriarch", "Thornmaw Matriarch"]
    },
    {
      id: "storm",
      name: "Stormwatch Spire",
      setId: "stormwatch",
      setName: "Stormwatch",
      reqLevel: 50,
      entryCost: 26,
      rewards: { goldMin: 2600, goldMax: 3400, xpMin: 2000, xpMax: 2600 },
      waves: [
        ["gust_watcher", "Gust Watcher"],
        ["hail_hunter", "Hail Hunter"],
        ["thunderbound_scout", "Thunderbound Scout"],
        ["storm_warden", "Storm Warden"],
        ["skybreaker", "Skybreaker"]
      ],
      boss: ["tempest_archon", "Tempest Archon"]
    },
    {
      id: "dusk",
      name: "Duskwall Sanctum",
      setId: "duskwall",
      setName: "Duskwall",
      reqLevel: 60,
      entryCost: 30,
      rewards: { goldMin: 3400, goldMax: 4300, xpMin: 2600, xpMax: 3300 },
      waves: [
        ["shade_mote", "Shade Mote"],
        ["gloom_knight", "Gloom Knight"],
        ["veil_serpent", "Veil Serpent"],
        ["night_binder", "Night Binder"],
        ["twilight_colossus", "Twilight Colossus"]
      ],
      boss: ["duskwall_revenant", "Duskwall Revenant"]
    },
    {
      id: "sand",
      name: "Sunscar Pyramid",
      setId: "sunscar",
      setName: "Sunscar",
      reqLevel: 70,
      entryCost: 34,
      rewards: { goldMin: 4300, goldMax: 5300, xpMin: 3300, xpMax: 4100 },
      waves: [
        ["sand_wisp", "Sand Wisp"],
        ["scarab_sworn", "Scarab Sworn"],
        ["dune_reaver", "Dune Reaver"],
        ["sun_guard", "Sun Guard"],
        ["glass_juggernaut", "Glass Juggernaut"]
      ],
      boss: ["pharaoh_of_cinders", "Pharaoh of Cinders"]
    },
    {
      id: "void",
      name: "Voidscar Nexus",
      setId: "voidscar",
      setName: "Voidscar",
      reqLevel: 80,
      entryCost: 38,
      rewards: { goldMin: 5300, goldMax: 6400, xpMin: 4100, xpMax: 5000 },
      waves: [
        ["rift_mote", "Rift Mote"],
        ["void_drone", "Void Drone"],
        ["nexus_harrier", "Nexus Harrier"],
        ["starved_watcher", "Starved Watcher"],
        ["abyss_engine", "Abyss Engine"]
      ],
      boss: ["voidscar_sovereign", "Voidscar Sovereign"]
    },
    {
      id: "blood",
      name: "Bloodforge Bastion",
      setId: "bloodforge",
      setName: "Bloodforge",
      reqLevel: 90,
      entryCost: 42,
      rewards: { goldMin: 6400, goldMax: 7600, xpMin: 5000, xpMax: 6000 },
      waves: [
        ["iron_thrall", "Iron Thrall"],
        ["blood_smith", "Blood Smith"],
        ["forge_hound", "Forge Hound"],
        ["chain_colossus", "Chain Colossus"],
        ["anvil_tyrant", "Anvil Tyrant"]
      ],
      boss: ["bloodforge_overlord", "Bloodforge Overlord"]
    },
    {
      id: "celestial",
      name: "Celestial Apex",
      setId: "celestial_apex",
      setName: "Celestial Apex",
      reqLevel: 100,
      entryCost: 48,
      rewards: { goldMin: 7600, goldMax: 9100, xpMin: 6000, xpMax: 7200 },
      waves: [
        ["starling_echo", "Starling Echo"],
        ["astral_keeper", "Astral Keeper"],
        ["comet_stalker", "Comet Stalker"],
        ["halo_sentinel", "Halo Sentinel"],
        ["zenith_devourer", "Zenith Devourer"]
      ],
      boss: ["apex_paragon", "Apex Paragon"]
    }
  ];

  const FIGHT_ZONE_END_MOBS = [
    { lvl: 9, hp: 110, atk: 44, def: 20 },
    { lvl: 19, hp: 260, atk: 84, def: 40 },
    { lvl: 29, hp: 520, atk: 124, def: 60 },
    { lvl: 39, hp: 1200, atk: 164, def: 80 },
    { lvl: 49, hp: 2600, atk: 204, def: 100 },
    { lvl: 59, hp: 5000, atk: 244, def: 120 },
    { lvl: 69, hp: 8200, atk: 284, def: 140 },
    { lvl: 79, hp: 13500, atk: 324, def: 160 },
    { lvl: 89, hp: 17000, atk: 364, def: 180 },
    { lvl: 99, hp: 22000, atk: 404, def: 200 }
  ];

  function titleCaseLowerToken(token){
    return String(token || "")
      .split("_")
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function makeSetItems(setId, setName, reqLevel){
    const tierIndex = Math.max(0, Math.min(9, Math.floor(Math.max(10, reqLevel) / 10) - 1));
    const setTierStats = [
      { helmet: 11, chest: 15, belt: 7,  pants: 12, gloves: 7,  boots: 7  },
      { helmet: 18, chest: 26, belt: 12, pants: 21, gloves: 12, boots: 12 },
      { helmet: 23, chest: 32, belt: 14, pants: 26, gloves: 14, boots: 14 },
      { helmet: 31, chest: 40, belt: 18, pants: 34, gloves: 18, boots: 18 },
      { helmet: 39, chest: 50, belt: 22, pants: 42, gloves: 22, boots: 22 },
      { helmet: 47, chest: 60, belt: 26, pants: 50, gloves: 26, boots: 26 },
      { helmet: 51, chest: 66, belt: 30, pants: 54, gloves: 30, boots: 30 },
      { helmet: 57, chest: 74, belt: 34, pants: 60, gloves: 34, boots: 34 },
      { helmet: 63, chest: 82, belt: 38, pants: 66, gloves: 38, boots: 38 },
      { helmet: 69, chest: 90, belt: 42, pants: 72, gloves: 42, boots: 42 }
    ][tierIndex];
    const attackSlotOverrides = {
      frostveil: ["gloves"],
      ashen_guard: ["belt", "gloves"],
      mirewake: ["boots"],
      thornbound: ["gloves", "pants"],
      stormwatch: ["belt"],
      duskwall: ["gloves", "boots"],
      sunscar: ["belt", "helmet"],
      voidscar: ["gloves"],
      bloodforge: ["belt", "boots"],
      celestial_apex: ["gloves", "helmet"]
    };
    const defs = [
      ["helmet", "Helm", 0, setTierStats.helmet, "helm"],
      ["chest", "Cuirass", 0, setTierStats.chest, "cuirass"],
      ["belt", "Belt", 0, setTierStats.belt, "belt"],
      ["pants", "Pants", 0, setTierStats.pants, "pants"],
      ["gloves", "Gloves", 0, setTierStats.gloves, "gloves"],
      ["boots", "Boots", 0, setTierStats.boots, "boots"]
    ];
    return defs.map(([slot, suffix, atk, def, file]) => ({
      ...(attackSlotOverrides[setId]?.includes(slot)
        ? { atk: Math.max(1, def), def: 0 }
        : { atk, def }),
      type: "gear",
      setId,
      slot,
      baseName: `${setName} ${suffix}`,
      name: `${setName} ${suffix}`,
      reqLevel,
      rarity: "legendary",
      img: `images/items/sets/${setId}/${setId}_${file}.png`
    }));
  }

  function zoneEndStatsForTier(tier){
    return FIGHT_ZONE_END_MOBS[Math.max(0, Math.min(FIGHT_ZONE_END_MOBS.length - 1, tier))] || FIGHT_ZONE_END_MOBS[0];
  }

  function makeWaves(dungeonId, waveDefs, reqLevel, tier){
    const source = zoneEndStatsForTier(tier);
    const bossHp = Math.round(source.hp * 1.5);
    const bossAtk = Math.round(source.atk * 1.5);
    const bossDef = Math.round(source.def * 1.5);
    const halfHp = bossHp * 0.5;
    const halfAtk = bossAtk * 0.5;
    const halfDef = bossDef * 0.5;
    const scales = [0.82, 0.9, 1.0, 1.08, 1.16];

    return waveDefs.map(([mobId, mobName], idx) => ({
      id: mobId,
      name: mobName,
      lvl: reqLevel + (idx * 2),
      hp: Math.max(1, Math.round(halfHp * scales[idx])),
      atk: Math.max(1, Math.round(halfAtk * scales[idx])),
      def: Math.max(0, Math.round(halfDef * scales[idx])),
      img: `images/mobs/dungeons/${dungeonId}/${mobId}.png`
    }));
  }

  function makeBoss(dungeonId, bossDef, reqLevel, tier){
    const [bossId, bossName] = bossDef;
    const source = zoneEndStatsForTier(tier);
    return {
      id: bossId,
      name: bossName,
      lvl: Math.max(reqLevel + 8, source.lvl + 10),
      hp: Math.max(1, Math.round(source.hp * 1.5)),
      atk: Math.max(1, Math.round(source.atk * 1.5)),
      def: Math.max(0, Math.round(source.def * 1.5)),
      img: `images/mobs/dungeons/${dungeonId}/${bossId}.png`
    };
  }

  const DUNGEONS = Object.fromEntries(
    DUNGEON_DEFS.map((def, idx) => {
      const tier = idx;
      return [def.id, {
        id: def.id,
        name: def.name,
        thumb: `images/dungeons/${def.id}_thumb.png`,
        reqLevel: def.reqLevel,
        entryCost: def.entryCost,
        rewards: def.rewards,
        description: `${def.waves.length} waves -> Boss. ${def.setName} 6-piece legendary set: chance for 1 item per completion.`,
        dropMode: "setChance",
        setChance: 1 / 25,
        setItems: makeSetItems(def.setId, def.setName, def.reqLevel),
        waves: makeWaves(def.id, def.waves, def.reqLevel, tier),
        boss: makeBoss(def.id, def.boss, def.reqLevel, tier)
      }];
    })
  );

  // ===== Helpers =====
    const el = (id) => document.getElementById(id);
    const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);
    const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
    const randInt = (min,max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const POTION_ACTIONS = 100;

    function getPotionTier(item){
      if (!item) return 1;
      const id = String(item.id || "");
      const m = id.match(/_(\d+)$/);
      if (m) return Math.max(1, Math.min(7, Number(m[1]) || 1));
      const name = String(item.name || "").toUpperCase();
      const roman = [" VII"," VI"," V"," IV"," III"," II"," I"];
      const map = { " I":1, " II":2, " III":3, " IV":4, " V":5, " VI":6, " VII":7 };
      for (const r of roman) if (name.includes(r)) return map[r];
      return 1;
    }
    function getPotionBonuses(save){
      let atkPct = 0;
      let defPct = 0;
      let luckPct = 0;
      const cons = (save && typeof save.consumables === "object") ? save.consumables : {};
      ["quick_potion1","quick_potion2"].forEach((slot) => {
        const it = cons[slot];
        if (!it) return;
        const qty = num(it.quantity ?? it.qty, 1);
        if (qty <= 0) return;
        const id = String(it.id || "").toLowerCase();
        const name = String(it.name || "").toLowerCase();
        const isStrength = id.includes("strength") || name.includes("strength potion");
        const isDefense = id.includes("defense") || name.includes("defense potion");
        const isLuck = id.includes("luck") || name.includes("luck potion");
        if (!isStrength && !isDefense && !isLuck) return;
        const tier = Math.max(1, Math.min(5, getPotionTier(it)));
        const pct = tier * 0.04;
        const luck = tier * 0.03;
        if (isStrength) atkPct += pct;
        if (isDefense) defPct += pct;
        if (isLuck) luckPct += luck;
      });
      return { atkPct, defPct, luckPct };
    }
    function tickPotionActions(save, actions = 1){
      if (!save || typeof save !== "object") return false;
      if (!save.consumables || typeof save.consumables !== "object") return false;
      let changed = false;
      ["quick_potion1","quick_potion2"].forEach((slot) => {
        const it = save.consumables[slot];
        if (!it) return;
        const id = String(it.id || "").toLowerCase();
        const name = String(it.name || "").toLowerCase();
        const isStrength = id.includes("strength") || name.includes("strength potion");
        const isDefense = id.includes("defense") || name.includes("defense potion");
        const isLuck = id.includes("luck") || name.includes("luck potion");
        if (!isStrength && !isDefense && !isLuck) return;
        let qty = num(it.quantity ?? it.qty, 1);
        if (qty <= 0) { save.consumables[slot] = null; changed = true; return; }
        let left = Number(it.actionsLeft);
        if (!Number.isFinite(left) || left <= 0) left = POTION_ACTIONS;
        let remaining = Math.max(0, Math.floor(left));
        let steps = Math.max(1, Math.floor(actions));
        while (steps-- > 0 && qty > 0){
          remaining -= 1;
          if (remaining <= 0){
            qty -= 1;
            if (qty <= 0){
              save.consumables[slot] = null;
              remaining = 0;
              changed = true;
              break;
            }
            remaining = POTION_ACTIONS;
          }
        }
        if (save.consumables[slot]) {
          it.quantity = qty;
          it.actionsLeft = remaining;
          changed = true;
        }
      });
      return changed;
    }

  function buildingBonusPct(level){
    const lvl = Math.max(0, num(level, 0));
    return lvl * 0.0005;
  }

  function loadSave(){
    try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {}; }
    catch { return {}; }
  }

  function setSave(next){
    localStorage.setItem(SAVE_KEY, JSON.stringify(next));
  }

  function savePatch(patch){
    const s = loadSave();
    Object.assign(s, patch);
    setSave(s);
  }

  function loadActive(){
    try { return JSON.parse(localStorage.getItem(ACTIVE_KEY) || "null"); }
    catch { return null; }
  }
  function setActive(obj){
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(obj));
  }
  function clearActive(){
    localStorage.removeItem(ACTIVE_KEY);
  }
  function loadPending(){
    try { return JSON.parse(localStorage.getItem(PENDING_KEY) || "null"); }
    catch { return null; }
  }
  function setPending(obj){
    localStorage.setItem(PENDING_KEY, JSON.stringify(obj));
  }
  function clearPending(){
    localStorage.removeItem(PENDING_KEY);
  }

  function saveActivePatch(patch){
    const cur = loadActive() || {};
    setActive({ ...cur, ...patch });
  }

  function getDungeon(id){
    return DUNGEONS[id] || null;
  }

  function listDungeons(){
    return Object.values(DUNGEONS);
  }

  function setDungeonTitle(name){
    const t = el("dungeonTitle");
    if (t) t.innerHTML = `&#127984; ${name || "Dungeon"}`;
  }

  function fmtMMSS(totalSec){
    totalSec = Math.max(0, Math.floor(totalSec));
    const mm = String(Math.floor(totalSec/60)).padStart(2,"0");
    const ss = String(totalSec%60).padStart(2,"0");
    return `${mm}:${ss}`;
  }

  // ===== Totals from equipment (same pattern as fight.js) =====
  function isBattleCharmItem(it){
    if (!it) return false;
    if (String(it.type || "").toLowerCase() === "battle_charm") return true;
    if (String(it.subType || "").toLowerCase() === "battle_charm") return true;
    return /battle charm/i.test(String(it.name || ""));
  }

  function battleCharmQty(it){
    return Math.max(0, Math.floor(num(it?.quantity ?? it?.qty, 0)));
  }

  function getBattleCharmAttackBonus(saveObj){
    const charm = saveObj?.battleCharm;
    if (!isBattleCharmItem(charm) || battleCharmQty(charm) <= 0) return 0;
    return Math.max(0, num(charm.attackBonus, charm.atkBonus ?? charm.atk ?? 0));
  }

  function tickBattleCharmBreak(saveObj){
    const charm = saveObj?.battleCharm;
    if (!isBattleCharmItem(charm) || battleCharmQty(charm) <= 0) return false;
    if (Math.random() >= (1 / 15)) return false;
    const nextQty = battleCharmQty(charm) - 1;
    if (nextQty > 0) charm.quantity = nextQty;
    else saveObj.battleCharm = null;
    return true;
  }

  function isDefenseCharmItem(it){
    if (!it) return false;
    if (String(it.type || "").toLowerCase() === "defense_charm") return true;
    if (String(it.subType || "").toLowerCase() === "defense_charm") return true;
    return /defense charm/i.test(String(it.name || ""));
  }

  function defenseCharmQty(it){
    return Math.max(0, Math.floor(num(it?.quantity ?? it?.qty, 0)));
  }

  function getDefenseCharmDefenseBonus(saveObj){
    const charm = saveObj?.defenseCharm;
    if (!isDefenseCharmItem(charm) || defenseCharmQty(charm) <= 0) return 0;
    return Math.max(0, num(charm.defenseBonus, charm.defBonus ?? charm.def ?? 0));
  }

  function tickDefenseCharmBreak(saveObj){
    const charm = saveObj?.defenseCharm;
    if (!isDefenseCharmItem(charm) || defenseCharmQty(charm) <= 0) return false;
    if (Math.random() >= (1 / 15)) return false;
    const nextQty = defenseCharmQty(charm) - 1;
    if (nextQty > 0) charm.quantity = nextQty;
    else saveObj.defenseCharm = null;
    return true;
  }

  function recomputeTotalsAndSave(){
    const cur = loadSave();
    const baseAtk = num(cur.heroAttack, 10);
    const baseDef = num(cur.heroDefense, 10);

    let atkB = 0, defB = 0;
    const eq = (cur && typeof cur.equipment === "object") ? cur.equipment : {};
    Object.values(eq).forEach(it => {
      if(!it) return;
      atkB += num(it.atk, 0);
      defB += num(it.def, 0);
    });

    function getSetCounts(equipment){
      const counts = {};
      Object.values(equipment || {}).forEach(it => {
        if(!it) return;
        const sid = String(it.setId || "").toLowerCase();
        if (sid){
          counts[sid] = (counts[sid] || 0) + 1;
          return;
        }
        const n = String(it.baseName || it.name || "").toLowerCase();
        if (n.includes("cryptwarden")) counts.cryptwarden = (counts.cryptwarden || 0) + 1;
      });
      return counts;
    }

    function tierPct(count, tiers){
      let pct = 0;
      for (const [need, val] of tiers){
        if (count >= need) pct = val;
      }
      return pct;
    }

    function getSetBonusPcts(equipment){
      const counts = getSetCounts(equipment);
      const cryptCount = counts.cryptwarden || 0;
      const iceCount = counts.icewarden || 0;
      const frostCount = counts.frostveil || 0;

      const cryptAtk = tierPct(cryptCount, [[2,0.02],[3,0.04],[4,0.06]]);
      const icePct = tierPct(iceCount, [[2,0.02],[4,0.04],[6,0.06],[8,0.08],[10,0.10]]);
      const goldPct = tierPct(frostCount, [[2,0.04],[4,0.08],[6,0.12]]);

      return {
        atkPct: cryptAtk + icePct,
        defPct: icePct,
        goldPct
      };
    }

    const bonuses = getSetBonusPcts(eq);
    const rawAtk = baseAtk + atkB + getBattleCharmAttackBonus(cur);
    const rawDef = baseDef + defB + getDefenseCharmDefenseBonus(cur);
    const attackTotal = Math.floor(rawAtk * (1 + bonuses.atkPct));
    const defenseTotal = Math.floor(rawDef * (1 + bonuses.defPct));

    savePatch({
      attackTotal,
      defenseTotal,
      setBonusAtkPct: bonuses.atkPct,
      setBonusDefPct: bonuses.defPct,
      setBonusGoldPct: bonuses.goldPct
    });
    return {
      rawAtk,
      rawDef,
      atkPct: bonuses.atkPct,
      defPct: bonuses.defPct,
      attackTotal,
      defenseTotal
    };
  }

    function getHeroRuntime(){
      const s = loadSave();
      const totals = recomputeTotalsAndSave();

    const heroLevel = Math.max(1, num(s.heroLevel, 1));

    // Use UI.js persistent hp fields
    const hpMax = Math.max(1, num(s.heroHPMax, 100));
    const hp = clamp(num(s.heroHP, hpMax), 0, hpMax);

    const stMax = Math.max(1, num(s.staminaMax, 100));
    const stamina = clamp(num(s.stamina, stMax), 0, stMax);

      const potionBonus = getPotionBonuses(s);
      const buildingPct = buildingBonusPct(s.cryptHallLevel);

      return {
        level: heroLevel,
        atk: Math.floor(totals.rawAtk * (1 + totals.atkPct + buildingPct + potionBonus.atkPct)),
        def: Math.floor(totals.rawDef * (1 + totals.defPct + buildingPct + potionBonus.defPct)),
        hpMax,
        hp,
        stamina,
        staminaMax: stMax,
        portrait: String(s.heroPortrait || "images/hero.png")
      };
    }

    function getEquipmentEnchantBonuses(equipment){
      const out = { xpPct: 0, goldPct: 0, luckPct: 0 };
      Object.values(equipment || {}).forEach((it) => {
        if (!it) return;
        out.xpPct += Math.max(0, num(it.enchantXpPct, 0));
        out.goldPct += Math.max(0, num(it.enchantGoldPct, 0));
        out.luckPct += Math.max(0, num(it.enchantLuckPct, 0));
      });
      return out;
    }

  function setHeroHP(hp, hpMax){
    savePatch({ heroHP: hp, heroHPMax: hpMax, lastActiveTs: Date.now() });
  }

  function spendStamina(cost){
    const s = loadSave();
    const stMax = Math.max(1, num(s.staminaMax, 100));
    const st = clamp(num(s.stamina, stMax), 0, stMax);
    if(st < cost) return false;
    s.stamina = st - cost;
    setSave(s);
    return true;
  }

  function addGold(amount){
    const s = loadSave();
    s.gold = num(s.gold, 0) + Math.max(0, num(amount, 0));
    setSave(s);
  }

  function itemStackKey(it){
    return [
      it.type || "",
      it.name || "",
      it.slot || "",
      it.reqLevel ?? 1,
      it.atk ?? 0,
      it.def ?? 0,
      it.rarity || ""
    ].join("::");
  }

  function addItemToInventory(item){
    if(!item) return;
    const s = loadSave();
    if(!Array.isArray(s.inventory)) s.inventory = [];
    const invApi = window.DSInventory;

    const isGear = (item?.type === "gear") || !!item?.slot;
    const qty = Math.max(1, num(item.quantity ?? item.qty, 1));

    if (isGear){
      if (invApi?.addItem) {
        const res = invApi.addItem(s, item, qty, { stack: false });
        if (!res?.ok) return;
      } else {
        for (let i = 0; i < qty; i++){
          s.inventory.push({ ...item, quantity: 1 });
        }
      }
      setSave(s);
      return;
    }

    const stackableTypes = new Set(["ore","material","consumable","food","fish","meat"]);
    if (stackableTypes.has(item.type)){
      if (invApi?.addItem) {
        const res = invApi.addItem(s, item, qty, { stack: true, stackKeyFn: itemStackKey });
        if (!res?.ok) return;
      } else {
        const key = itemStackKey(item);
        const ex = s.inventory.find(i => i && itemStackKey(i) === key);
        if (ex) ex.quantity = num(ex.quantity, 1) + qty;
        else s.inventory.push({ ...item, quantity: qty });
      }
    } else {
      if (invApi?.addItem) {
        const res = invApi.addItem(s, item, qty, { stack: false });
        if (!res?.ok) return;
      } else {
        for (let i = 0; i < qty; i++){
          s.inventory.push({ ...item, quantity: 1 });
        }
      }
    }

    setSave(s);
  }

  // ===== Hero XP (match your fight logic for level ups, but DO NOT hardcode hpMax formula) =====
  function addHeroXP(amount){
    const s = loadSave();

    let heroXP = num(s.heroXP, 0) + Math.max(0, num(amount, 0));
    let heroXPNext = Math.max(1, num(s.heroXPNext, 100));
    let heroLevel = Math.max(1, num(s.heroLevel, 1));

    let baseAtk = num(s.heroAttack, 10);
    let baseDef = num(s.heroDefense, 10);
    let statPoints = Math.max(0, num(s.heroStatPoints, 0));

    let ups = 0;
    while(heroXP >= heroXPNext){
      heroXP -= heroXPNext;
      heroLevel++;
      heroXPNext = Math.floor(heroXPNext * 1.5);
      statPoints += STAT_POINTS_PER_LEVEL;
      ups++;
      window.DS?.announcements?.combatLevel?.(s, heroLevel);
    }

    s.heroXP = heroXP;
    s.heroXPNext = heroXPNext;
    s.heroLevel = heroLevel;
    s.heroAttack = baseAtk;
    s.heroDefense = baseDef;
    s.heroStatPoints = statPoints;

    setSave(s);
    recomputeTotalsAndSave();

    return ups;
  }
  function addDungeonCompanionXP(totalCombatXP){
    const api = window.DS?.pets;
    const total = Math.max(0, Math.floor(num(totalCombatXP, 0)));
    if (!api) {
      return {
        playerXpGain: total,
        combatPetXpGain: 0,
        fortunePetXpGain: 0,
        combatLevelUps: 0,
        fortuneLevelUps: 0,
        combatPetName: "",
        fortunePetName: "",
        combatNewLevel: 0,
        fortuneNewLevel: 0
      };
    }
    const s = loadSave();
    if (!s.pets || typeof s.pets !== "object") s.pets = {};

    const combatPetXpGain = api?.isPetActive?.("combat", s.pets.combat) ? Math.max(0, Math.floor(total * 0.10)) : 0;
    const fortunePetXpGain = api?.isPetActive?.("fortune", s.pets.fortune) ? Math.max(0, Math.floor(total * 0.10)) : 0;
    const playerXpGain = Math.max(0, total - combatPetXpGain - fortunePetXpGain);

    let combatLevelUps = 0;
    let combatPetName = "";
    let combatNewLevel = 0;
    if (combatPetXpGain > 0 && api.splitXpWithPet) {
      const result = api.splitXpWithPet(s, "combat", combatPetXpGain * 10);
      combatLevelUps = num(result?.petLevelUps, 0);
      combatPetName = String(result?.petName || "Combat Pet");
      combatNewLevel = num(result?.petLevel, 0);
    }

    let fortuneLevelUps = 0;
    let fortunePetName = "";
    let fortuneNewLevel = 0;
    if (fortunePetXpGain > 0 && api.splitXpWithPet) {
      const result = api.splitXpWithPet(s, "fortune", fortunePetXpGain * 10);
      fortuneLevelUps = num(result?.petLevelUps, 0);
      fortunePetName = String(result?.petName || "Fortune Pet");
      fortuneNewLevel = num(result?.petLevel, 0);
    }

    setSave(s);
    return {
      playerXpGain,
      combatPetXpGain,
      fortunePetXpGain,
      combatLevelUps,
      fortuneLevelUps,
      combatPetName,
      fortunePetName,
      combatNewLevel,
      fortuneNewLevel
    };
  }

  // ===== Damage formulas =====
  // Waves: classic min 1 (normal)
  function dmgWave(att, def){
    const v = Math.floor(num(att,0) - num(def,0) * 0.6);
    return Math.max(1, v);
  }

  // Boss: if att <= def => 0β€“1 dmg; else ~difference with small variance
  function dmgBoss(att, def){
    att = num(att,0); def = num(def,0);
    if(att <= def) return (Math.random() < 0.5) ? 0 : 1;
    const diff = att - def;
    const v = 0.90 + Math.random() * 0.20; // Β±10%
    return Math.max(1, Math.floor(diff * v));
  }

  function rollSetDrops(dungeon){
    const items = dungeon?.setItems || [];
    if (!items.length) return [];
    const save = loadSave();
    const fortuneBonuses = window.DS?.pets?.getFortunePetBonuses
      ? (window.DS.pets.getFortunePetBonuses(save?.pets?.fortune) || {})
      : {};
    const potionBonuses = getPotionBonuses(save);
    const enchantBonuses = getEquipmentEnchantBonuses(save.equipment);
    const luckMult = 1 + Math.max(0, num(fortuneBonuses.luckPct, 0)) + Math.max(0, num(potionBonuses.luckPct, 0)) + Math.max(0, num(enchantBonuses.luckPct, 0));

    if (dungeon.dropMode === "onePerRun"){
      const pick = items[randInt(0, items.length - 1)];
      return pick ? [{ ...pick, quantity: 1 }] : [];
    }

    if (dungeon.dropMode === "setChance"){
      if (Math.random() >= ((dungeon.setChance ?? 0) * luckMult)) return [];
      const pick = items[randInt(0, items.length - 1)];
      return pick ? [{ ...pick, quantity: 1 }] : [];
    }

    if (dungeon.dropMode === "perItem"){
      const out = [];
      const p = (dungeon.perItemChance ?? 0) * luckMult;
      for (const it of items){
        if (Math.random() < p) out.push({ ...it, quantity: 1 });
      }
      return out;
    }

    return [];
  }

  function pushLog(text){
    const log = runDOM.battleLog();
    if(!log) return;
    log.innerHTML = text || "";
  }

  function clearLog(){
    const log = runDOM.battleLog();
    if(log) log.innerHTML = "";
  }

  const runDOM = {
    stageTitle: () => el("stageTitle"),
    prepText: () => el("prepText"),
    enterRow: () => el("enterDungeonRow"),
    enterBtn: () => el("enterDungeonBtn"),
    runAgainRow: () => el("runAgainRow"),
    runAgainBtn: () => el("runAgainBtn"),
    runTimer: () => el("runTimer"),

    heroImg: () => el("heroImg"),
    mobImg: () => el("mobImg"),
    heroInfo: () => el("heroInfo"),
    mobInfo: () => el("mobInfo"),

    heroHpBar: () => el("heroHpBar"),
    mobHpBar: () => el("mobHpBar"),
    heroHpText: () => el("heroHpText"),
    mobHpText: () => el("mobHpText"),

    battleLog: () => el("battleLog"),

    cooldownWrap: () => el("cooldownWrap"),
    cooldownBar: () => el("cooldownBar"),
    cooldownText: () => el("cooldownText"),
    cooldownLabel: () => el("cooldownLabel"),
    waveCard: () => el("waveCard"),
    waveHeroImg: () => el("waveHeroImg"),
    waveMobImg: () => el("waveMobImg"),
    waveLabel: () => el("waveLabel"),
    encounterStatus: () => el("encounterStatus"),
    waveMobInfo: () => el("waveMobInfo"),
    wavePetStack: () => el("wavePetStack"),
    waveCombatPetBadge: () => el("waveCombatPetBadge"),
    waveCombatPetIcon: () => el("waveCombatPetIcon"),
    waveCombatPetXpBar: () => el("waveCombatPetXpBar"),
    waveFortunePetBadge: () => el("waveFortunePetBadge"),
    waveFortunePetIcon: () => el("waveFortunePetIcon"),
    waveFortunePetXpBar: () => el("waveFortunePetXpBar"),
    waveHeroHpBar: () => el("waveHeroHpBar"),
    waveHeroHpText: () => el("waveHeroHpText"),
    waveHeroDamageText: () => el("waveHeroDamageText"),
    waveHpBar: () => el("waveHpBar"),
    waveHpText: () => el("waveHpText"),
    waveMobDamageText: () => el("waveMobDamageText"),
  };

  function getPetDisplay(slotKey){
    const s = loadSave();
    const pet = window.DS?.pets?.normalizePet ? window.DS.pets.normalizePet(slotKey, s?.pets?.[slotKey]) : s?.pets?.[slotKey];
    if (pet && pet.active === false) return null;
    if (!pet || typeof pet !== "object") return null;
    const level = Math.max(1, num(pet.level, 1));
    const xp = Math.max(0, num(pet.xp, 0));
    const xpNext = Math.max(1, num(pet.xpNext, 100));
    return {
      name: String(pet.name || "Combat Pet"),
      img: String(pet.img || "").trim(),
      iconText: String(pet.iconText || "PET"),
      xpPct: clamp((xp / xpNext) * 100, 0, 100)
    };
  }

  function renderCombatPetBadge(){
    const stack = runDOM.wavePetStack();
    const badge = runDOM.waveCombatPetBadge();
    const icon = runDOM.waveCombatPetIcon();
    const xpBar = runDOM.waveCombatPetXpBar();
    const fortuneBadge = runDOM.waveFortunePetBadge();
    const fortuneIcon = runDOM.waveFortunePetIcon();
    const fortuneXpBar = runDOM.waveFortunePetXpBar();
    if (!stack || !badge || !icon || !xpBar || !fortuneBadge || !fortuneIcon || !fortuneXpBar) return;

    const renderPet = (pet, badgeEl, iconEl, xpBarEl) => {
      if (!pet) {
        badgeEl.style.display = "none";
        iconEl.innerHTML = "";
        iconEl.textContent = "";
        xpBarEl.style.width = "0%";
        return false;
      }
      badgeEl.style.display = "flex";
      if (pet.img) {
        iconEl.innerHTML = `<img src="${pet.img}" alt="${pet.name}" style="width:100%;height:100%;object-fit:cover;">`;
      } else {
        iconEl.innerHTML = "";
        iconEl.textContent = pet.iconText;
      }
      xpBarEl.style.width = `${pet.xpPct}%`;
      return true;
    };

    const hasCombat = renderPet(getPetDisplay("combat"), badge, icon, xpBar);
    const hasFortune = renderPet(getPetDisplay("fortune"), fortuneBadge, fortuneIcon, fortuneXpBar);
    stack.style.display = (hasCombat || hasFortune) ? "flex" : "none";
    if (hasCombat && hasFortune) {
      stack.style.justifyContent = "space-between";
    } else {
      stack.style.justifyContent = "center";
    }
  }

  function renderVS(hero, enemy, stageLabel){
    const st = runDOM.stageTitle();
    if(st) st.textContent = stageLabel || "Waves";
    const pt = runDOM.prepText();
    if(pt) pt.textContent = "";

    const waveCard = runDOM.waveCard();
    if(waveCard) waveCard.style.display = "grid";

    const heroImg = runDOM.waveHeroImg();
    if(heroImg) heroImg.src = hero.portrait || "images/hero.png";
    renderCombatPetBadge();

    const mobImg = runDOM.waveMobImg();
    if(mobImg) mobImg.src = enemy.img || "";

    const wl = runDOM.waveLabel();
    if(wl) wl.textContent = stageLabel || "Wave";

    const mi = runDOM.waveMobInfo();
    if(mi) mi.textContent = `${enemy.name}`;
    const es = runDOM.encounterStatus();
    if(es) es.textContent = "";

    const heroHpBar = runDOM.waveHeroHpBar();
    const heroHpText = runDOM.waveHeroHpText();
    const hPct = hero.hpMax ? (hero.hp / hero.hpMax) * 100 : 0;
    if(heroHpBar) heroHpBar.style.width = `${Math.max(0, hPct)}%`;
    if(heroHpBar) heroHpBar.parentElement.style.display = "";
    if(heroHpText) heroHpText.textContent = `${Math.max(0, hero.hp)} / ${hero.hpMax} HP`;
    if(heroHpText) heroHpText.style.display = "";

    const mobHpBar = runDOM.waveHpBar();
    const mobHpText = runDOM.waveHpText();

    const ePct = enemy.hpMax ? (enemy.hp / enemy.hpMax) * 100 : 0;
    if(mobHpBar) mobHpBar.style.width = `${Math.max(0, ePct)}%`;
    if(mobHpBar) mobHpBar.parentElement.style.display = "";
    if(mobHpText) mobHpText.textContent = `${Math.max(0, enemy.hp)} / ${enemy.hpMax} HP`;
    if(mobHpText) mobHpText.style.display = "";

    const heroDamageText = runDOM.waveHeroDamageText();
    const mobDamageText = runDOM.waveMobDamageText();
    if(heroDamageText){
      heroDamageText.textContent = "";
      heroDamageText.style.display = "none";
    }
    if(mobDamageText){
      mobDamageText.textContent = "";
      mobDamageText.style.display = "none";
    }
  }

  function renderIntro(hero, dungeon){
    const st = runDOM.stageTitle();
    if(st) st.textContent = "Entering Dungeon";
    const pt = runDOM.prepText();
    if(pt) pt.textContent = "";

    const waveCard = runDOM.waveCard();
    if(waveCard) waveCard.style.display = "grid";

    const heroImg = runDOM.waveHeroImg();
    if(heroImg) heroImg.src = hero.portrait || "images/hero.png";
    renderCombatPetBadge();

    const mobImg = runDOM.waveMobImg();
    if(mobImg) mobImg.src = dungeon?.thumb || "";

    const wl = runDOM.waveLabel();
    if(wl) wl.textContent = "";

    const mi = runDOM.waveMobInfo();
    if(mi) mi.textContent = dungeon?.name || "Dungeon";
    const es = runDOM.encounterStatus();
    if(es) es.textContent = "";

    const heroHpBar = runDOM.waveHeroHpBar();
    const heroHpText = runDOM.waveHeroHpText();
    const hPct = hero.hpMax ? (hero.hp / hero.hpMax) * 100 : 0;
    if(heroHpBar) heroHpBar.style.width = `${Math.max(0, hPct)}%`;
    if(heroHpBar) heroHpBar.parentElement.style.display = "";
    if(heroHpText) heroHpText.textContent = `${Math.max(0, hero.hp)} / ${hero.hpMax} HP`;
    if(heroHpText) heroHpText.style.display = "";

    const mobHpBar = runDOM.waveHpBar();
    const mobHpText = runDOM.waveHpText();
    if(mobHpBar) mobHpBar.parentElement.style.display = "none";
    if(mobHpBar) mobHpBar.style.width = "0%";
    if(mobHpText) mobHpText.textContent = "";
    if(mobHpText) mobHpText.style.display = "none";

    const heroDamageText = runDOM.waveHeroDamageText();
    const mobDamageText = runDOM.waveMobDamageText();
    if(heroDamageText){
      heroDamageText.textContent = "";
      heroDamageText.style.display = "none";
    }
    if(mobDamageText){
      mobDamageText.textContent = "";
      mobDamageText.style.display = "none";
    }

    const enterRow = runDOM.enterRow();
    if(enterRow) enterRow.style.display = "flex";
    const enterBtn = runDOM.enterBtn();
    if(enterBtn) enterBtn.textContent = loadActive() ? "Continue Dungeon" : "Enter Dungeon";
    const runAgainRow = runDOM.runAgainRow();
    if(runAgainRow) runAgainRow.style.display = "none";
  }

  function setEncounterStatus(text){
    const es = runDOM.encounterStatus();
    if(es) es.textContent = text || "";
  }

  function setEncounterDamage(heroTaken = "", mobDealt = ""){
    const heroDamageText = runDOM.waveHeroDamageText();
    const mobDamageText = runDOM.waveMobDamageText();
    if(heroDamageText){
      if(heroTaken === ""){
        heroDamageText.textContent = "";
        heroDamageText.style.display = "none";
      } else {
        heroDamageText.textContent = `Damage Taken: ${Math.max(0, Number(heroTaken) || 0)}`;
        heroDamageText.style.display = "block";
      }
    }
    if(mobDamageText){
      if(mobDealt === ""){
        mobDamageText.textContent = "";
        mobDamageText.style.display = "none";
      } else {
        mobDamageText.textContent = `Damage Dealt: ${Math.max(0, Number(mobDealt) || 0)}`;
        mobDamageText.style.display = "block";
      }
    }
  }

  function renderBlankStage(label){
    const st = runDOM.stageTitle();
    if(st) st.textContent = label || "Waves";
    const pt = runDOM.prepText();
    if(pt) pt.textContent = "";
    const waveCard = runDOM.waveCard();
    if(waveCard) waveCard.style.display = "none";
    const enterRow = runDOM.enterRow();
    if(enterRow) enterRow.style.display = "none";
    const runAgainRow = runDOM.runAgainRow();
    if(runAgainRow) runAgainRow.style.display = "none";
    setEncounterStatus("");
  }

  function showRunAgain(){
    const enterRow = runDOM.enterRow();
    if(enterRow) enterRow.style.display = "none";
    const runAgainRow = runDOM.runAgainRow();
    if(runAgainRow) runAgainRow.style.display = "flex";
  }

  // ===== Cooldown UI =====
  let cdAnimId = null;
  let cdStart = 0;
  let cdDurationMs = TICK_MS;

  function stopCooldownUI(){
    if(cdAnimId) cancelAnimationFrame(cdAnimId);
    cdAnimId = null;
    const w = runDOM.cooldownWrap();
    const b = runDOM.cooldownBar();
    const t = runDOM.cooldownText();
    if(w) w.style.display = "none";
    if(b) b.style.width = "0%";
    if(t) t.textContent = (cdDurationMs/1000).toFixed(1) + "s";
  }

  function startCooldownUI(label, durationMs = TICK_MS){
    const w = runDOM.cooldownWrap();
    const b = runDOM.cooldownBar();
    const t = runDOM.cooldownText();
    const l = runDOM.cooldownLabel();
    if(!w || !b || !t) return;

    if(l) l.textContent = label || "Next";
    w.style.display = "";
    cdStart = performance.now();
    cdDurationMs = durationMs;

    const tick = (now) => {
      const elapsed = now - cdStart;
      const p = Math.min(1, elapsed / cdDurationMs);

      b.style.width = (p * 100).toFixed(1) + "%";
      b.style.background = "linear-gradient(90deg, #ffaa00, #bb6600)";

      const remain = Math.max(0, (cdDurationMs - elapsed) / 1000);
      t.textContent = remain.toFixed(1) + "s";

      if(p < 1 && state.running){
        cdAnimId = requestAnimationFrame(tick);
      } else {
        cdAnimId = null;
      }
    };

    if(cdAnimId) cancelAnimationFrame(cdAnimId);
    cdAnimId = requestAnimationFrame(tick);
  }

  // ===== Run timer =====
  let timerInt = null;
  let runStartMs = 0;

  function startRunTimer(startMs){
    runStartMs = Number.isFinite(Number(startMs)) ? Number(startMs) : Date.now();
    const rt = runDOM.runTimer();
    if(rt) rt.textContent = "00:00";

    if(timerInt) clearInterval(timerInt);
    timerInt = setInterval(() => {
      const sec = (Date.now() - runStartMs) / 1000;
      const elT = runDOM.runTimer();
      if(elT) elT.textContent = fmtMMSS(sec);
    }, 500);
  }

  function stopRunTimer(){
    if(timerInt) clearInterval(timerInt);
    timerInt = null;
  }

  // ===== Run state =====
  const state = {
    running: false,
    phase: "idle",   // idle | prepare | waves | boss | end
    waveIndex: 0,
    enemy: null,
    dungeon: null,
    loopTimer: null,
    startedOnce: false
  };

  function persistRunState(){
    const active = loadActive();
    if(!state.dungeon || !active || active.id !== state.dungeon.id) return;
    saveActivePatch({
      id: state.dungeon.id,
      startedAt: Date.now(),
      runState: {
        phase: state.phase,
        waveIndex: state.waveIndex,
        enemy: state.enemy ? { ...state.enemy } : null,
        bossRound,
        runStartMs
      }
    });
  }

  function clearLoop(){
    if(state.loopTimer){
      clearTimeout(state.loopTimer);
      state.loopTimer = null;
    }
  }

  function failDungeon(reason){
    state.running = false;
    state.phase = "end";
    clearLoop();
    stopCooldownUI();
    stopRunTimer();

    pushLog(`Dungeon failed${reason ? ": " + reason : ""}`);
    clearActive();
    clearPending();
    const st = runDOM.stageTitle();
    if(st) st.textContent = "Failed";
    showRunAgain();
  }

  function winDungeon(){
    state.running = false;
    state.phase = "end";
    clearLoop();
    stopCooldownUI();
    stopRunTimer();

    const dungeon = state.dungeon;
    if (!dungeon){
      clearActive();
      clearPending();
      const st = runDOM.stageTitle();
      if(st) st.textContent = "Completed";
      showRunAgain();
      return;
    }

    // ===== Rewards =====
    const fortuneBonuses = window.DS?.pets?.getFortunePetBonuses
      ? (window.DS.pets.getFortunePetBonuses(loadSave()?.pets?.fortune) || {})
      : {};
    const rewardSave = loadSave();
    const enchantBonuses = getEquipmentEnchantBonuses(rewardSave.equipment);
    const goldBase = randInt(dungeon.rewards.goldMin, dungeon.rewards.goldMax);
    const goldGain = Math.floor(goldBase * (1 + Math.max(0, num(fortuneBonuses.goldPct, 0)) + Math.max(0, num(enchantBonuses.goldPct, 0))));
    const xpBase = randInt(dungeon.rewards.xpMin, dungeon.rewards.xpMax);
    const boostedXpBase = Math.max(0, Math.floor(xpBase * (1 + Math.max(0, num(enchantBonuses.xpPct, 0)))));
    const petXpResult = addDungeonCompanionXP(boostedXpBase);
    const xpGain = petXpResult.playerXpGain;

    addGold(goldGain);
    const ups = addHeroXP(xpGain);

    const drops = rollSetDrops(dungeon);
    for (const it of drops) addItemToInventory(it);
    drops
      .filter((it) => String(it?.rarity || "").toLowerCase() === "legendary")
      .forEach((it) => window.DS?.announcements?.legendaryDrop?.(loadSave(), it));

    let cryptSigil = null;
    const potionBonuses = getPotionBonuses(loadSave());
    if (Math.random() < ((1 / 75) * (1 + Math.max(0, num(fortuneBonuses.luckPct, 0)) + Math.max(0, num(potionBonuses.luckPct, 0)) + Math.max(0, num(enchantBonuses.luckPct, 0))))) {
      cryptSigil = { ...CRYPT_SIGIL_ITEM, quantity: 1 };
      addItemToInventory(cryptSigil);
    }
    const roughGemDrop = Math.random() < ROUGH_GEM_DROP_CHANCE
      * (1 + Math.max(0, num(fortuneBonuses.luckPct, 0)) + Math.max(0, num(potionBonuses.luckPct, 0)) + Math.max(0, num(enchantBonuses.luckPct, 0)))
      ? { ...ROUGH_GEM_POOL[randInt(0, ROUGH_GEM_POOL.length - 1)], quantity: 1 }
      : null;
    if (roughGemDrop) addItemToInventory(roughGemDrop);
    const orbOfCreationDrop = Math.random() < ORB_OF_CREATION_DROP_CHANCE
      * (1 + Math.max(0, num(fortuneBonuses.luckPct, 0)) + Math.max(0, num(potionBonuses.luckPct, 0)) + Math.max(0, num(enchantBonuses.luckPct, 0)))
      ? { ...ORB_OF_CREATION_ITEM, quantity: 1 }
      : null;
    if (orbOfCreationDrop) addItemToInventory(orbOfCreationDrop);

    window.DS?.stats?.inc?.("dungeonsCompleted", 1);

    const elapsed = fmtMMSS((Date.now() - runStartMs) / 1000);

    const obtainedDrops = [];
    if (drops.length) obtainedDrops.push(drops[0]);
    if (cryptSigil) obtainedDrops.push(cryptSigil);
    if (roughGemDrop) obtainedDrops.push(roughGemDrop);
    if (orbOfCreationDrop) obtainedDrops.push(orbOfCreationDrop);
    const obtainedHtml = obtainedDrops.length
      ? `<div style="margin-top:8px;display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;"><span style="display:inline-flex;align-items:center;line-height:1;">You obtained:</span>${obtainedDrops.map(it => `<span style="display:inline-flex;align-items:center;gap:5px;line-height:1;"><img src="${it.img || ""}" alt="${it.name || "Item"}" style="width:16px;height:16px;border-radius:4px;object-fit:cover;">${it.name || "Item"}</span>`).join("")}</div>`
      : "";
    const petXpHtml = `${petXpResult.combatPetXpGain > 0 ? ` <span style="display:inline-flex;align-items:center;gap:4px;margin-left:8px;"><span>${petXpResult.combatPetName} XP +${petXpResult.combatPetXpGain}</span></span>` : ""}${petXpResult.fortunePetXpGain > 0 ? ` <span style="display:inline-flex;align-items:center;gap:4px;margin-left:8px;"><span>${petXpResult.fortunePetName} XP +${petXpResult.fortunePetXpGain}</span></span>` : ""}`;
    const petLevelHtml = `${petXpResult.combatLevelUps > 0 ? `<div style="margin-top:6px;color:#9ff0b7;font-weight:800;">${petXpResult.combatPetName} reached Lvl ${petXpResult.combatNewLevel}</div>` : ""}${petXpResult.fortuneLevelUps > 0 ? `<div style="margin-top:6px;color:#9ff0b7;font-weight:800;">${petXpResult.fortunePetName} reached Lvl ${petXpResult.fortuneNewLevel}</div>` : ""}`;
    pushLog(`Dungeon Completed! <span style="display:inline-flex;align-items:center;gap:4px;margin-left:8px;"><span>&#127942;</span><span>XP +${xpGain}</span></span> <span style="display:inline-flex;align-items:center;gap:4px;margin-left:8px;"><span>&#128176;</span><span>Gold +${goldGain}</span></span>${petXpHtml}${obtainedHtml}${petLevelHtml}`);

    clearActive();
    clearPending();
    const st = runDOM.stageTitle();
    if(st) st.textContent = "Completed";
    showRunAgain();
  }

  // ===== Core loop =====
  function startPrepare(){
    state.phase = "prepare";
    stopCooldownUI();

    const dungeon = state.dungeon;
    if (!dungeon){
      failDungeon("missing dungeon config");
      return;
    }

    const hero = getHeroRuntime();
    state.enemy = null;
    renderIntro(hero, dungeon);
    persistRunState();
  }

  function beginDungeonFlow(){
    if(!state.dungeon) return;
    const enterRow = runDOM.enterRow();
    if(enterRow) enterRow.style.display = "none";
    const runAgainRow = runDOM.runAgainRow();
    if(runAgainRow) runAgainRow.style.display = "none";

    const active = loadActive();
    if(!active){
      const pending = loadPending();
      if(!pending || pending.id !== state.dungeon.id){
        pushLog("No pending dungeon found.");
        return;
      }
      const hero = getHeroRuntime();
      const reqLevel = Math.max(1, num(state.dungeon.reqLevel, 1));
      if(hero.level < reqLevel){
        pushLog(`Requires Hero Level ${reqLevel}.`);
        const enterRowRetry = runDOM.enterRow();
        if(enterRowRetry) enterRowRetry.style.display = "flex";
        return;
      }
      if(hero.stamina < state.dungeon.entryCost || !spendStamina(state.dungeon.entryCost)){
        pushLog(`Not enough stamina. Need ${state.dungeon.entryCost} Stamina.`);
        const enterRowRetry = runDOM.enterRow();
        if(enterRowRetry) enterRowRetry.style.display = "flex";
        return;
      }
      setActive({
        id: state.dungeon.id,
        startedAt: Date.now(),
        runState: null
      });
      clearPending();
    }

    state.running = true;
    state.startedOnce = true;

    if(state.phase === "prepare"){
      const rs = loadActive()?.runState || null;
      startRunTimer(rs?.runStartMs || Date.now());
      if(!rs) pushLog(`Entered ${state.dungeon.name}. (-${state.dungeon.entryCost} stamina)`);
      const hero = getHeroRuntime();
      renderIntro(hero, state.dungeon);
      persistRunState();
      startCooldownUI("Entering dungeon");
      clearLoop();
      state.loopTimer = setTimeout(() => {
        if(!state.running) return;
        stopCooldownUI();
        startWaves(true);
      }, TICK_MS);
      return;
    }

    const rs = loadActive()?.runState || null;
    startRunTimer(rs?.runStartMs || Date.now());
    if(rs) pushLog(`Resumed ${state.dungeon.name}.`);

    if(state.phase === "waves"){
      if(state.enemy){
        const hero = getHeroRuntime();
        renderVS(hero, state.enemy, "Wave " + (state.waveIndex + 1) + "/" + state.dungeon.waves.length);
      }
      startCooldownUI("Fight starts");
      clearLoop();
      state.loopTimer = setTimeout(() => {
        if(!state.running) return;
        stopCooldownUI();
        runWaveEncounter();
      }, TICK_MS);
      return;
    }

    if(state.phase === "boss"){
      if(state.enemy){
        const hero = getHeroRuntime();
        renderVS(hero, state.enemy, "Boss");
      }
      startCooldownUI("Boss starts");
      clearLoop();
      state.loopTimer = setTimeout(() => {
        if(!state.running) return;
        stopCooldownUI();
        runBossRound();
      }, TICK_MS);
    }
  }

  function startWaves(runFirstImmediately = false){
    state.phase = "waves";
    state.waveIndex = 0;
    persistRunState();
    nextWave(runFirstImmediately);
  }

  function nextWave(runImmediately = false){
    if(!state.running) return;

    if(state.waveIndex >= state.dungeon.waves.length){
      startBossImmediateFirstRound();
      return;
    }

    const mob = state.dungeon.waves[state.waveIndex];
    state.enemy = { ...mob, hpMax: mob.hp, hp: mob.hp };

    clearLog();
    pushLog(`π§ Wave ${state.waveIndex + 1}: ${mob.name}`);

    const hero = getHeroRuntime();
    renderVS(hero, state.enemy, "Wave " + (state.waveIndex + 1) + "/" + state.dungeon.waves.length);
    persistRunState();

    if(runImmediately){
      runWaveEncounter();
      return;
    }

    startCooldownUI("Fight starts");
    clearLoop();
    state.loopTimer = setTimeout(() => {
      if(!state.running) return;
      stopCooldownUI();
      runWaveEncounter();
    }, TICK_MS);
  }

  function runWaveEncounter(){
    if(!state.running || state.phase !== "waves") return;

    let hero = getHeroRuntime();
    const enemy = state.enemy;
    let lastHeroD = 0;
    let totalHeroDamageTaken = 0;
    let totalDamageDealt = 0;

    let rounds = 0;
    while(hero.hp > 0 && enemy.hp > 0 && rounds < MAX_WAVE_ROUNDS){
      rounds++;

      const hd = dmgWave(hero.atk, enemy.def);
      lastHeroD = hd;
      totalDamageDealt += hd;
      enemy.hp -= hd;
      if(enemy.hp <= 0) break;

      const md = dmgWave(enemy.atk, hero.def);
      totalHeroDamageTaken += md;
      hero.hp -= md;
    }

    hero.hp = Math.max(0, hero.hp);
    enemy.hp = Math.max(0, enemy.hp);

      setHeroHP(hero.hp, hero.hpMax);
      renderVS(hero, enemy, "Wave " + (state.waveIndex + 1) + "/" + state.dungeon.waves.length);
      setEncounterDamage(totalHeroDamageTaken, totalDamageDealt);
      persistRunState();
      const potionSave = loadSave();
      const potionChanged = tickPotionActions(potionSave, 1);
      const charmChanged = tickBattleCharmBreak(potionSave);
      const defenseCharmChanged = tickDefenseCharmBreak(potionSave);
      if (charmChanged || defenseCharmChanged) {
        const baseAtk = num(potionSave.heroAttack, 10);
        const baseDef = num(potionSave.heroDefense, 10);
        let atkB = 0, defB = 0;
        Object.values(potionSave.equipment || {}).forEach((it) => {
          if (!it) return;
          atkB += num(it.atk, 0);
          defB += num(it.def, 0);
        });
        potionSave.attackTotal = Math.floor((baseAtk + atkB + getBattleCharmAttackBonus(potionSave)) * (1 + num(potionSave.setBonusAtkPct, 0)));
        potionSave.defenseTotal = Math.floor((baseDef + defB + getDefenseCharmDefenseBonus(potionSave)) * (1 + num(potionSave.setBonusDefPct, 0)));
      }
      if (potionChanged || charmChanged || defenseCharmChanged) {
        savePatch({
          consumables: potionSave.consumables,
          battleCharm: potionSave.battleCharm,
          defenseCharm: potionSave.defenseCharm,
          attackTotal: potionSave.attackTotal,
          defenseTotal: potionSave.defenseTotal
        });
      }
      if(hero.hp <= 0){
        failDungeon(`died on Wave ${state.waveIndex + 1}`);
        return;
      }

    if(enemy.hp > 0 && rounds >= MAX_WAVE_ROUNDS){
      failDungeon(`Wave ${state.waveIndex + 1} stalled (too tanky)`);
      return;
    }

    pushLog(`Cleared Wave ${state.waveIndex + 1} in ${rounds} rounds.`);
    setEncounterStatus("");
    state.waveIndex++;
    persistRunState();
    clearLoop();
    startCooldownUI("Next wave", TICK_MS);
    state.loopTimer = setTimeout(() => {
      if(!state.running) return;
      stopCooldownUI();
      nextWave(true);
    }, TICK_MS);
  }

  // ===== Boss =====
  let bossRound = 0;

  function startBossImmediateFirstRound(){
    state.phase = "boss";
    bossRound = 0;

    const bossDef = state.dungeon.boss;
    state.enemy = { ...bossDef, hpMax: bossDef.hp, hp: bossDef.hp };
    const hero = getHeroRuntime();
    renderVS(hero, state.enemy, "Boss");
    clearLog();
    pushLog("Boss: " + state.dungeon.boss.name);

    persistRunState();
    clearLoop();
    runBossRound();
  }

  function runBossRound(){
    if(!state.running || state.phase !== "boss") return;

    bossRound++;
    let hero = getHeroRuntime();
    const boss = state.enemy;

    const heroD = dmgBoss(hero.atk, boss.def);
    boss.hp = Math.max(0, boss.hp - heroD);
    persistRunState();

    if(boss.hp <= 0){
      renderVS(hero, boss, "Boss");
      setEncounterDamage(0, heroD);
      pushLog(`Round ${bossRound}`);
      winDungeon();
      return;
    }

    const bossD = dmgBoss(boss.atk, hero.def);
    hero.hp = Math.max(0, hero.hp - bossD);

      setHeroHP(hero.hp, hero.hpMax);
      renderVS(hero, boss, "Boss");
      setEncounterDamage(bossD, heroD);
      pushLog(`Round ${bossRound}`);
      const potionSave = loadSave();
      const potionChanged = tickPotionActions(potionSave, 1);
      const charmChanged = tickBattleCharmBreak(potionSave);
      const defenseCharmChanged = tickDefenseCharmBreak(potionSave);
      if (charmChanged || defenseCharmChanged) {
        const baseAtk = num(potionSave.heroAttack, 10);
        const baseDef = num(potionSave.heroDefense, 10);
        let atkB = 0, defB = 0;
        Object.values(potionSave.equipment || {}).forEach((it) => {
          if (!it) return;
          atkB += num(it.atk, 0);
          defB += num(it.def, 0);
        });
        potionSave.attackTotal = Math.floor((baseAtk + atkB + getBattleCharmAttackBonus(potionSave)) * (1 + num(potionSave.setBonusAtkPct, 0)));
        potionSave.defenseTotal = Math.floor((baseDef + defB + getDefenseCharmDefenseBonus(potionSave)) * (1 + num(potionSave.setBonusDefPct, 0)));
      }
      if (potionChanged || charmChanged || defenseCharmChanged) {
        savePatch({
          consumables: potionSave.consumables,
          battleCharm: potionSave.battleCharm,
          defenseCharm: potionSave.defenseCharm,
          attackTotal: potionSave.attackTotal,
          defenseTotal: potionSave.defenseTotal
        });
      }

      if(hero.hp <= 0){
        failDungeon("killed by boss");
        return;
      }

    startCooldownUI("Next boss");
    clearLoop();
    state.loopTimer = setTimeout(() => {
      if(!state.running) return;
      stopCooldownUI();
      runBossRound();
    }, TICK_MS);
  }

  // ===== Public: enterDungeon (used by dungeon.html) =====
  function enterDungeon(id){
    const dungeon = getDungeon(id);
    if(!dungeon) return { ok:false, msg:"Unknown dungeon." };

    const hero = getHeroRuntime();
    const reqLevel = Math.max(1, num(dungeon.reqLevel, 1));
    if(hero.level < reqLevel){
      return { ok:false, msg:`Requires Hero Level ${reqLevel}.` };
    }
    setPending({
      id: dungeon.id,
      queuedAt: Date.now(),
      autoStart: true
    });

    return { ok:true };
  }

  function enterIce(){ return enterDungeon("ice"); }

  function ensureDungeonListStyles() {
    if (document.getElementById("ds-dungeon-list-styles")) return;
    const style = document.createElement("style");
    style.id = "ds-dungeon-list-styles";
    style.textContent = `
      @media (max-width: 680px) {
        #dungeonCards {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: 10px !important;
        }
        .dungeonCard { max-width: 104px !important; }
        .dungeonLootBtn {
          top: 2px !important;
          right: 50% !important;
          transform: translateX(61px) !important;
          width: 22px !important;
          height: 22px !important;
          border-radius: 7px !important;
        }
        .dungeonLootBtn img { width: 14px !important; height: 14px !important; }
        .dungeonCardInner { gap: 8px !important; }
        .dungeonEnterBtn {
          padding: 0 !important;
          border: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          min-height: 0 !important;
        }
        .dungeonCardImg { width: 72px !important; height: 72px !important; border-radius: 8px !important; }
        .dungeonInfo {
          width: 104px !important;
          min-height: 94px !important;
          padding: 5px 5px 6px !important;
          border-radius: 8px !important;
        }
        .dungeonName {
          min-height: 24px !important;
          font-size: 10px !important;
          line-height: 1.05 !important;
          white-space: normal !important;
          word-break: break-word !important;
        }
        .dungeonReq, .dungeonCost {
          margin-top: 3px !important;
          font-size: 10px !important;
          line-height: 1.05 !important;
        }
        .dungeonStats {
          margin-top: 6px !important;
          padding-top: 5px !important;
          gap: 4px !important;
        }
        .dungeonStatBox {
          border-radius: 8px !important;
          padding: 4px 2px !important;
          gap: 2px !important;
        }
        .dungeonStatIcon { font-size: 13px !important; }
        .dungeonStatValue { font-size: 10px !important; }
      }
      @media (max-width: 480px) {
        #dungeonCards { gap: 8px !important; }
        .dungeonCard { max-width: 96px !important; }
        .dungeonLootBtn { transform: translateX(55px) !important; }
        .dungeonCardImg { width: 66px !important; height: 66px !important; }
        .dungeonInfo {
          width: 96px !important;
          min-height: 90px !important;
          padding: 4px 4px 5px !important;
        }
        .dungeonName { font-size: 9px !important; }
        .dungeonReq, .dungeonCost, .dungeonStatValue { font-size: 9px !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function isCompactDungeonMobile() {
    return window.matchMedia("(max-width: 680px)").matches;
  }

  function applyDungeonLootPanelLayout(panel, anchorEl = null) {
    if (!panel) return;

    if (isCompactDungeonMobile()) {
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 360;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 640;
      const panelWidth = Math.min(250, Math.max(210, viewportWidth - 110));
      const panelHeight = Math.min(360, Math.max(280, viewportHeight * 0.52));
      let left = Math.max(10, (viewportWidth - panelWidth) / 2);
      let top = Math.max(12, (viewportHeight - panelHeight) / 2);

      if (anchorEl && typeof anchorEl.getBoundingClientRect === "function") {
        const anchorCard = anchorEl.closest?.(".dungeonCard");
        const rect = (anchorCard || anchorEl).getBoundingClientRect();
        left = Math.min(
          Math.max(10, rect.left + (rect.width / 2) - (panelWidth / 2)),
          Math.max(10, viewportWidth - panelWidth - 10)
        );
        const preferredTop = rect.top + 8;
        const maxTop = Math.max(12, viewportHeight - panelHeight - 12);
        top = Math.min(Math.max(12, preferredTop), maxTop);
        if (top < 12) top = 12;
      }

      panel.style.position = "fixed";
      panel.style.left = `${Math.round(left)}px`;
      panel.style.top = `${Math.round(top)}px`;
      panel.style.transform = "";
      panel.style.width = `${Math.round(panelWidth)}px`;
      panel.style.maxWidth = `${Math.round(panelWidth)}px`;
      panel.style.maxHeight = `${Math.round(panelHeight)}px`;
      panel.style.overflowY = "auto";
      panel.style.overflowX = "hidden";
      panel.style.zIndex = "120";
      return;
    }

    panel.style.position = "absolute";
    panel.style.left = "calc(100% + 8px)";
    panel.style.top = "8px";
    panel.style.transform = "";
    panel.style.width = "260px";
    panel.style.maxWidth = "min(260px,calc(100vw - 40px))";
    panel.style.maxHeight = "";
    panel.style.overflowY = "";
    panel.style.overflowX = "";
    panel.style.zIndex = "20";
  }

  function openDungeonLootPanelFor(lootPanel, currentOpenPanelRef, anchorEl = null) {
    if (!lootPanel) return currentOpenPanelRef || null;
    if (currentOpenPanelRef && currentOpenPanelRef !== lootPanel) {
      currentOpenPanelRef.closest?.(".dungeonCard")?.classList.remove("lootOpen");
      currentOpenPanelRef.style.display = "none";
    }
    applyDungeonLootPanelLayout(lootPanel, anchorEl);
    lootPanel.closest?.(".dungeonCard")?.classList.add("lootOpen");
    lootPanel.style.display = "block";
    return lootPanel;
  }

  function closeDungeonLootPanelFor(lootPanel, currentOpenPanelRef) {
    if (!lootPanel) return currentOpenPanelRef || null;
    lootPanel.closest?.(".dungeonCard")?.classList.remove("lootOpen");
    lootPanel.style.display = "none";
    return currentOpenPanelRef === lootPanel ? null : currentOpenPanelRef;
  }

  function unmountDungeonList() {
    if (__dungeonListOutsideClick) {
      document.removeEventListener("click", __dungeonListOutsideClick);
      __dungeonListOutsideClick = null;
    }
    if (__dungeonListResize) {
      window.removeEventListener("resize", __dungeonListResize);
      __dungeonListResize = null;
    }
    __dungeonListOpenPanel = null;
    __dungeonListMounted = false;
    const left = document.getElementById("leftPanel");
    if (left) {
      left.style.background = "";
      left.style.border = "";
      left.style.borderRadius = "";
    }
  }

  function unmountDungeonRun() {
    const enterBtn = runDOM.enterBtn();
    const runAgainBtn = runDOM.runAgainBtn();
    if (enterBtn && __dungeonRunEnterHandler) {
      enterBtn.removeEventListener("click", __dungeonRunEnterHandler);
    }
    if (runAgainBtn && __dungeonRunAgainHandler) {
      runAgainBtn.removeEventListener("click", __dungeonRunAgainHandler);
    }
    __dungeonRunEnterHandler = null;
    __dungeonRunAgainHandler = null;
    resetMountedRunState();
    __dungeonRunMounted = false;
  }

  function mountDungeonList(root = null) {
    const left = root || document.getElementById("leftPanel");
    if (!left) return false;

    if (__dungeonListMounted) unmountDungeonList();

    ensureDungeonListStyles();
    left.innerHTML = DUNGEON_LIST_TEMPLATE;
    document.title = "Darkstone Chronicles - Dungeons";

    const msgEl = document.getElementById("msg");
    const cardsWrap = document.getElementById("dungeonCards");
    if (!msgEl || !cardsWrap) return false;

    __dungeonListMounted = true;
    __dungeonListOpenPanel = null;
    const setMsg = (t) => { msgEl.textContent = t || ""; };

    function doEnter(id, btn) {
      if (!window.DS_DUNGEON || typeof window.DS_DUNGEON.enterDungeon !== "function") {
        setMsg("dungeon.js not loaded (DS_DUNGEON missing).");
        return;
      }

      const active = window.DS_DUNGEON.getActive ? window.DS_DUNGEON.getActive() : null;
      if (active && active.id) {
        const wantResume = window.confirm("You already have an active dungeon. Resume?");
        if (wantResume) {
          if (!window.DSUI?.navigateWithinShell?.("dungeon_run.html")) {
            window.location.href = "dungeon_run.html";
          }
          return;
        }
        window.DS_DUNGEON.clearActive?.();
      }

      if (btn) btn.disabled = true;
      setMsg("Preparing for battle...");

      const res = window.DS_DUNGEON.enterDungeon(id);
      if (!res || !res.ok) {
        setMsg((res && res.msg) ? res.msg : "Cannot enter.");
        if (btn) btn.disabled = false;
        return;
      }

      if (!window.DSUI?.navigateWithinShell?.("dungeon_run.html")) {
        window.location.href = "dungeon_run.html";
      }
    }

    const dungeons = listDungeons();
    if (!dungeons.length) {
      setMsg("No dungeons configured.");
      return true;
    }

    cardsWrap.innerHTML = "";
    dungeons.forEach((d) => {
      const card = document.createElement("div");
      card.className = "dungeonCard";

      const lootItems = [...(d.setItems || [])];
      lootItems.push({ type:"material", name:"Crypt Sigil", rarity:"rare", img:"images/items/sigils/crypt_sigil.webp", _label:"Bonus Drop" });
      const lootHtml = lootItems.map((it) => {
        const stats = [];
        if (Number.isFinite(Number(it.atk)) && Number(it.atk) !== 0) stats.push(`ATK ${it.atk}`);
        if (Number.isFinite(Number(it.def)) && Number(it.def) !== 0) stats.push(`DEF ${it.def}`);
        if (Number.isFinite(Number(it.reqLevel))) stats.push(`Req Lv ${it.reqLevel}`);
        const isSetItem = !!it.setId;
        const rarityKey = String(it.rarity || "").toLowerCase();
        const rarityBg =
          isSetItem ? "#2a0a0d" :
          rarityKey === "mythic" ? "#0b2a2e" :
          rarityKey === "legendary" ? "#2b1a0b" :
          rarityKey === "epic" ? "#1a0f2e" :
          rarityKey === "rare" ? "#0f1b2e" :
          rarityKey === "uncommon" ? "#0f141b" :
          rarityKey === "common" ? "#0b0b0b" :
          "#1b1b24";
        const rarityBorder =
          isSetItem ? "#7c2d35" :
          rarityKey === "mythic" ? "#2aa7b0" :
          rarityKey === "legendary" ? "#d18a1f" :
          rarityKey === "epic" ? "#7d4bc2" :
          rarityKey === "rare" ? "#3d73c9" :
          rarityKey === "uncommon" ? "#4c667f" :
          rarityKey === "common" ? "#3a3a46" :
          "#2a2a3a";
        const meta = [it._label || it.rarity || it.type || "", ...stats].filter(Boolean).join(" | ");
        return `
          <div style="display:flex;gap:8px;align-items:center;background:#151520;border:1px solid ${rarityBorder};border-radius:8px;padding:6px 8px;">
            <img src="${it.img || ""}" alt="${it.name || "Item"}" style="width:32px;height:32px;border-radius:6px;border:1px solid ${rarityBorder};background:${rarityBg};object-fit:cover;flex:0 0 auto;">
            <div style="min-width:0;display:flex;flex-direction:column;align-items:flex-start;text-align:left;">
              <div style="font-size:12px;font-weight:800;line-height:1.1;">${it.name || "Item"}</div>
              <div style="font-size:10px;opacity:.75;line-height:1.25;">${meta}</div>
            </div>
          </div>
        `;
      }).join("");

      card.innerHTML = `
        <button type="button" class="dungeonLootBtn" style="position:absolute;top:8px;right:8px;width:28px;height:28px;background:#222438;border:1px solid #3a3d5c;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;z-index:2;">
          <img src="images/ui/my_treasure_chest.png" alt="Loot" style="width:18px;height:18px;display:block;image-rendering:auto;">
        </button>
        <div class="dungeonCardInner">
          <button type="button" class="dungeonEnterBtn" aria-label="Enter ${d.name}">
            <img src="${d.thumb}" alt="${d.name}" class="dungeonCardImg">
          </button>
          <div class="dungeonInfo">
            <div class="dungeonName">${d.name}</div>
            <div class="dungeonReq">Req Lv ${d.reqLevel}</div>
            <div class="dungeonCost">Cost: ${d.entryCost} Stamina</div>
            <div class="dungeonStats">
              <div class="dungeonStatBox">
                <div class="dungeonStatIcon" aria-hidden="true">&#128151;</div>
                <div class="dungeonStatValue">${new Intl.NumberFormat("el-GR").format(Number(d.boss?.hp || 0))}</div>
              </div>
              <div class="dungeonStatBox">
                <div class="dungeonStatIcon" aria-hidden="true">&#9876;&#65039;</div>
                <div class="dungeonStatValue">${new Intl.NumberFormat("el-GR").format(Number(d.boss?.atk || 0))}</div>
              </div>
              <div class="dungeonStatBox">
                <div class="dungeonStatIcon" aria-hidden="true">&#128737;&#65039;</div>
                <div class="dungeonStatValue">${new Intl.NumberFormat("el-GR").format(Number(d.boss?.def || 0))}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="dungeonLootPanel">
          <div class="dungeonLootPanelHeader">
            <div class="dungeonLootPanelTitle">Drops</div>
            <button type="button" class="dungeonLootClose" style="background:#222438;border:1px solid #3a3d5c;color:#ddd;width:24px;height:24px;border-radius:999px;font-size:12px;cursor:pointer;">x</button>
          </div>
          <div class="dungeonLootPanelList">
            ${lootHtml}
          </div>
        </div>
      `;

      const lootBtn = card.querySelector(".dungeonLootBtn");
      const lootPanel = card.querySelector(".dungeonLootPanel");
      const lootClose = card.querySelector(".dungeonLootClose");
      const enterBtn = card.querySelector(".dungeonEnterBtn");

      const toggleLootPanel = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!lootPanel) return;
        const willOpen = lootPanel.style.display === "none";
        __dungeonListOpenPanel = willOpen
          ? openDungeonLootPanelFor(lootPanel, __dungeonListOpenPanel, lootBtn)
          : closeDungeonLootPanelFor(lootPanel, __dungeonListOpenPanel);
      };

      lootBtn?.addEventListener("click", toggleLootPanel);
      lootBtn?.addEventListener("touchend", toggleLootPanel, { passive: false });
      lootClose?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        __dungeonListOpenPanel = closeDungeonLootPanelFor(lootPanel, __dungeonListOpenPanel);
      });
      lootPanel?.addEventListener("click", (e) => e.stopPropagation());
      enterBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        doEnter(d.id, null);
      });

      cardsWrap.appendChild(card);
    });

    cardsWrap.onclick = (e) => {
      if (e.target === cardsWrap && __dungeonListOpenPanel) {
        __dungeonListOpenPanel = closeDungeonLootPanelFor(__dungeonListOpenPanel, __dungeonListOpenPanel);
      }
    };

    __dungeonListOutsideClick = (e) => {
      if (e.target?.closest?.(".dungeonLootBtn, .dungeonLootPanel, .dungeonLootClose")) return;
      if (__dungeonListOpenPanel) {
        __dungeonListOpenPanel = closeDungeonLootPanelFor(__dungeonListOpenPanel, __dungeonListOpenPanel);
      }
    };
    document.addEventListener("click", __dungeonListOutsideClick);

    __dungeonListResize = () => {
      if (__dungeonListOpenPanel) {
        applyDungeonLootPanelLayout(
          __dungeonListOpenPanel,
          __dungeonListOpenPanel.parentElement?.querySelector?.(".dungeonLootBtn") || null
        );
      }
    };
    window.addEventListener("resize", __dungeonListResize);

    return true;
  }

  function mountDungeonRun(root = null) {
    const left = root || document.getElementById("leftPanel");
    if (!left) return false;

    unmountDungeonList();
    if (__dungeonRunMounted) unmountDungeonRun();
    resetMountedRunState();

    left.innerHTML = DUNGEON_RUN_TEMPLATE;
    document.title = "Darkstone Chronicles - Dungeon Run";

    __dungeonRunEnterHandler = () => {
      startActiveRun();
    };
    __dungeonRunAgainHandler = () => {
      const res = runAgainActive();
      if (!res.ok) pushLog(res.msg || "Could not start dungeon again.");
    };

    const mounted = mountActiveRun();
    if (!mounted.ok) return false;

    runDOM.enterBtn()?.addEventListener("click", __dungeonRunEnterHandler);
    runDOM.runAgainBtn()?.addEventListener("click", __dungeonRunAgainHandler);
    __dungeonRunMounted = true;
    if (mounted.autoStart) {
      window.setTimeout(() => {
        const result = startActiveRun();
        if (!result.ok) pushLog(result.msg || "Could not start dungeon.");
      }, 0);
    }
    return true;
  }

  // ===== Public: startActiveRun (used by dungeon_run.html auto-start) =====
  function mountActiveRun(){
    const active = loadActive();
    const pending = loadPending();
    const source = active || pending;
    const dungeon = source ? getDungeon(source.id) : null;
    if(!source || !dungeon) return { ok:false, msg:"No dungeon selected." };
    const shouldAutoStart = !!pending?.autoStart && !active;

    // must be on run page (DOM exists)
    if(!runDOM.battleLog() || !runDOM.heroHpBar() || !runDOM.mobHpBar()){
      return { ok:false, msg:"Not on dungeon_run page (missing DOM)." };
    }

    if(state.startedOnce || state.dungeon) return { ok:true };

    state.dungeon = dungeon;
    state.running = false;

    // reset log
    const log = runDOM.battleLog();
    if(log) log.innerHTML = "";

    setDungeonTitle(dungeon.name);
    const rs = active?.runState || null;
    if(rs && rs.phase && rs.phase !== "end"){
      state.phase = rs.phase;
      state.waveIndex = Math.max(0, num(rs.waveIndex, 0));
      state.enemy = rs.enemy || null;
      bossRound = Math.max(0, num(rs.bossRound, 0));
      const hero = getHeroRuntime();
      if(state.phase === "prepare" && !state.enemy){
        renderIntro(hero, dungeon);
      } else if(!state.enemy && state.phase === "waves"){
        const mob = dungeon.waves[state.waveIndex] || dungeon.waves[0];
        if(mob){
          state.enemy = { ...mob, hpMax: mob.hp, hp: mob.hp };
        }
      } else if(!state.enemy && state.phase === "boss"){
        const bossDef = dungeon.boss;
        state.enemy = { ...bossDef, hpMax: bossDef.hp, hp: bossDef.hp };
      }

      if(state.enemy){
        const label = (state.phase === "boss")
          ? "Boss"
          : "Wave " + (state.waveIndex + 1) + "/" + state.dungeon.waves.length;
        renderVS(hero, state.enemy, label);
      }
      const enterRow = runDOM.enterRow();
      if(enterRow) enterRow.style.display = "flex";
      const enterBtn = runDOM.enterBtn();
      if(enterBtn) enterBtn.textContent = "Continue Dungeon";
      return { ok:true, autoStart: false };
    }

    state.phase = "prepare";
    state.waveIndex = 0;
    state.enemy = null;
    bossRound = 0;
    startPrepare();
    return { ok:true, autoStart: shouldAutoStart };
  }

  function startActiveRun(){
    if(state.running) return { ok:false, msg:"Already running." };
    if(!state.dungeon){
      const mounted = mountActiveRun();
      if(!mounted.ok) return mounted;
    }
    beginDungeonFlow();
    return { ok:true };
  }

  function resetMountedRunState(){
    state.running = false;
    state.phase = "idle";
    state.waveIndex = 0;
    state.enemy = null;
    state.dungeon = null;
    state.loopTimer = null;
    state.startedOnce = false;
    bossRound = 0;
    stopCooldownUI();
    stopRunTimer();
  }

  function runAgainActive(){
    const dungeonId = state.dungeon?.id;
    if(!dungeonId) return { ok:false, msg:"No dungeon selected." };
    const entered = enterDungeon(dungeonId);
    if(!entered.ok) return entered;
    resetMountedRunState();
    clearActive();
    return mountActiveRun();
  }

  // ===== Pause integration (inspector etc.) =====
  window.addEventListener("ds:pause", () => {
    if(!state.running) return;
    state.running = false;
    clearLoop();
    stopCooldownUI();
    stopRunTimer();
    persistRunState();
  });

  window.addEventListener("ds:resume", () => {});

  // ===== Export global =====
  window.DS_DUNGEON = {
    listDungeons,
    enterDungeon,
    enterIce,
    mountDungeonList,
    unmountDungeonList,
    mountDungeonRun,
    unmountDungeonRun,
    mountActiveRun,
    startActiveRun,
    runAgainActive,
    getActive: () => loadActive(),
    getPending: () => loadPending(),
    clearActive,
    getAdminItems: () => [
      { ...CRYPT_SIGIL_ITEM, quantity: 1 },
      { ...ORB_OF_CREATION_ITEM, quantity: 1 }
    ]
  };

  // ===== Auto-start if we are on dungeon_run.html =====
  window.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("dungeonCards") && !runDOM.battleLog()) {
      mountDungeonList();
    }
    // Only attempt auto start if run DOM exists
    if(runDOM.battleLog() && runDOM.heroHpBar() && runDOM.mobHpBar()){
      const active = loadActive();
      const pending = loadPending();
      const current = active || pending;
      if(current && getDungeon(current.id)){
        mountDungeonRun();
      }
    }
  });
  window.addEventListener("ds:save", () => {
    if (!runDOM.waveCard() || runDOM.waveCard().style.display === "none") return;
    renderCombatPetBadge();
  });

  window.addEventListener("beforeunload", () => {
    if(state.running) persistRunState();
  });
})();

















