(() => {
  const SAVE_KEY = "darkstone_save_v1";
  const ACTION_MS = 6000;
  const ACTION_ID = "jewelcrafting";
  const ACTION_LOCK_KEY = "ds_action_lock_v1";

  const TEMPLATE = `
    <div class="profXpShell">
      <div class="profXpCard">
        <div class="profXpHead">
          <span aria-hidden="true">&#128142;</span>
          <span>Jewelcrafting Lvl: <span id="jewelcraftLevel">1</span></span>
        </div>
        <div style="width:100%;">
          <div class="profXpTrack">
            <div id="jewelcraftXPBar" style="height:100%;width:0%;background:linear-gradient(90deg,#3aa4ff,#7bdbff);"></div>
            <div style="position:absolute;top:50%;left:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;">XP</div>
            <div style="position:absolute;top:50%;right:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;"><span id="jewelcraftXPCurrent">0</span>/<span id="jewelcraftXPNext">100</span></div>
          </div>
        </div>
      </div>
    </div>

    <div class="profXpShell">
      <div id="artisanBonusBox" class="profBonusCard" style="padding:12px;width:100%;min-height:56px;display:flex;align-items:flex-start;gap:10px;">
        <div style="font-weight:800;font-size:14px;white-space:nowrap;line-height:1.05;text-align:center;">Bonus<br>XP</div>
        <div style="width:1px;align-self:stretch;background:#333;"></div>
        <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-start;gap:2px;padding-top:2px;">
          <div style="display:grid;grid-template-columns:0.8fr 1px 1.1fr 1px 1.5fr 1px 1fr;gap:8px;font-size:11px;font-weight:700;opacity:.9;text-align:center;align-items:center;">
            <div>Pet</div>
            <div style="width:1px;align-self:stretch;background:#333;"></div>
            <div>Building</div>
            <div style="width:1px;align-self:stretch;background:#333;"></div>
            <div style="font-size:10px;line-height:1;white-space:nowrap;align-self:center;">Double Craft</div>
            <div style="width:1px;align-self:stretch;background:#333;"></div>
            <div>Potion</div>
          </div>
          <div style="height:1px;background:#333;width:100%;"></div>
          <div style="display:grid;grid-template-columns:0.8fr 1px 1.1fr 1px 1.5fr 1px 1fr;gap:8px;min-height:14px;align-items:stretch;text-align:center;font-size:11px;font-weight:700;color:#cfe7ff;">
            <div id="artisanBonusPetValue">+0%</div>
            <div style="width:1px;align-self:stretch;background:#333;"></div>
            <div id="artisanBonusBuildingValue">+0%</div>
            <div style="width:1px;align-self:stretch;background:#333;"></div>
            <div id="artisanBonusDoubleValue">+0%</div>
            <div style="width:1px;align-self:stretch;background:#333;"></div>
            <div id="artisanBonusPotionValue">+0%</div>
          </div>
        </div>
      </div>
    </div>

    <div class="profActionRow">
      <button id="backBtn">Back</button>
      <button id="startBtn">Start</button>
      <button id="stopBtn" disabled>Stop</button>
    </div>

    <div class="profActionCard">
      <div style="display:flex;gap:12px;align-items:center;">
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;min-width:86px;">
          <div style="font-weight:800;font-size:18px;text-align:center;" id="recipeName">Gem</div>
          <img id="recipeImg" src="" alt="" class="profChoiceThumb" style="width:86px;height:86px;border-radius:12px;object-fit:cover;">
        </div>
        <div style="flex:1;">
          <div id="recipeMeta" style="font-size:12px;opacity:.82;line-height:1.45;"></div>
          <div id="timerWrap" style="margin-top:12px;display:none;">
            <div style="display:flex;justify-content:space-between;font-size:12px;opacity:.9;">
              <span>Refining...</span>
              <span id="timerText">6.0s</span>
            </div>
            <div style="height:5px;background:#222;border:1px solid #333;border-radius:6px;margin-top:6px;overflow:hidden;">
              <div id="timerBar" style="height:100%;width:0%;border-radius:6px;background:linear-gradient(90deg,#b63a3a,#e05555);"></div>
            </div>
          </div>

          <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
            <div style="opacity:.85;font-size:12px;">Target amount:</div>
            <input id="targetInput" type="number" min="1" step="1" placeholder="e.g. 100" class="profTargetInput">
            <button id="targetBtn">Craft Target</button>
            <div id="targetStatus" style="opacity:.85;font-size:12px;"></div>
          </div>
        </div>
      </div>

      <div id="msg" style="margin-top:12px;opacity:.92;"></div>
    </div>
  `;

  const RECIPES = [
    { id: "rough_ruby", name: "Rough Ruby", refinedName: "Refined Ruby", reqLevel: 1, img: "images/gems/rough_ruby.png", refinedImg: "images/gems/refined_ruby.png", xp: 15, inputQty: 1, outputId: "refined_ruby", outputName: "Refined Ruby", outputImg: "images/gems/refined_ruby.png", verb: "Refined" },
    { id: "rough_sapphire", name: "Rough Sapphire", refinedName: "Refined Sapphire", reqLevel: 1, img: "images/gems/rough_sapphire.png", refinedImg: "images/gems/refined_sapphire.png", xp: 15, inputQty: 1, outputId: "refined_sapphire", outputName: "Refined Sapphire", outputImg: "images/gems/refined_sapphire.png", verb: "Refined" },
    { id: "rough_emerald", name: "Rough Emerald", refinedName: "Refined Emerald", reqLevel: 1, img: "images/gems/rough_emerald.png", refinedImg: "images/gems/refined_emerald.png", xp: 15, inputQty: 1, outputId: "refined_emerald", outputName: "Refined Emerald", outputImg: "images/gems/refined_emerald.png", verb: "Refined" },
    { id: "rough_topaz", name: "Rough Topaz", refinedName: "Refined Topaz", reqLevel: 1, img: "images/gems/rough_topaz.png", refinedImg: "images/gems/refined_topaz.png", xp: 15, inputQty: 1, outputId: "refined_topaz", outputName: "Refined Topaz", outputImg: "images/gems/refined_topaz.png", verb: "Refined" },
    { id: "rough_amethyst", name: "Rough Amethyst", refinedName: "Refined Amethyst", reqLevel: 1, img: "images/gems/rough_amethyst.png", refinedImg: "images/gems/refined_amethyst.png", xp: 15, inputQty: 1, outputId: "refined_amethyst", outputName: "Refined Amethyst", outputImg: "images/gems/refined_amethyst.png", verb: "Refined" },
    { id: "refined_ruby", name: "Refined Ruby", refinedName: "Flawless Ruby", reqLevel: 5, img: "images/gems/refined_ruby.png", refinedImg: "images/gems/flawless_ruby.png", xp: 30, inputQty: 3, outputId: "flawless_ruby", outputName: "Flawless Ruby", outputImg: "images/gems/flawless_ruby.png", verb: "Crafted" },
    { id: "refined_sapphire", name: "Refined Sapphire", refinedName: "Flawless Sapphire", reqLevel: 5, img: "images/gems/refined_sapphire.png", refinedImg: "images/gems/flawless_sapphire.png", xp: 30, inputQty: 3, outputId: "flawless_sapphire", outputName: "Flawless Sapphire", outputImg: "images/gems/flawless_sapphire.png", verb: "Crafted" },
    { id: "refined_emerald", name: "Refined Emerald", refinedName: "Flawless Emerald", reqLevel: 5, img: "images/gems/refined_emerald.png", refinedImg: "images/gems/flawless_emerald.png", xp: 30, inputQty: 3, outputId: "flawless_emerald", outputName: "Flawless Emerald", outputImg: "images/gems/flawless_emerald.png", verb: "Crafted" },
    { id: "refined_topaz", name: "Refined Topaz", refinedName: "Flawless Topaz", reqLevel: 5, img: "images/gems/refined_topaz.png", refinedImg: "images/gems/flawless_topaz.png", xp: 30, inputQty: 3, outputId: "flawless_topaz", outputName: "Flawless Topaz", outputImg: "images/gems/flawless_topaz.png", verb: "Crafted" },
    { id: "refined_amethyst", name: "Refined Amethyst", refinedName: "Flawless Amethyst", reqLevel: 5, img: "images/gems/refined_amethyst.png", refinedImg: "images/gems/flawless_amethyst.png", xp: 30, inputQty: 3, outputId: "flawless_amethyst", outputName: "Flawless Amethyst", outputImg: "images/gems/flawless_amethyst.png", verb: "Crafted" },
    { id: "flawless_ruby", name: "Flawless Ruby", refinedName: "Masterwork Ruby", reqLevel: 10, img: "images/gems/flawless_ruby.png", refinedImg: "images/gems/masterwork_ruby.png", xp: 45, inputQty: 3, outputId: "masterwork_ruby", outputName: "Masterwork Ruby", outputImg: "images/gems/masterwork_ruby.png", verb: "Crafted" },
    { id: "flawless_sapphire", name: "Flawless Sapphire", refinedName: "Masterwork Sapphire", reqLevel: 10, img: "images/gems/flawless_sapphire.png", refinedImg: "images/gems/masterwork_sapphire.png", xp: 45, inputQty: 3, outputId: "masterwork_sapphire", outputName: "Masterwork Sapphire", outputImg: "images/gems/masterwork_sapphire.png", verb: "Crafted" },
    { id: "flawless_emerald", name: "Flawless Emerald", refinedName: "Masterwork Emerald", reqLevel: 10, img: "images/gems/flawless_emerald.png", refinedImg: "images/gems/masterwork_emerald.png", xp: 45, inputQty: 3, outputId: "masterwork_emerald", outputName: "Masterwork Emerald", outputImg: "images/gems/masterwork_emerald.png", verb: "Crafted" },
    { id: "flawless_topaz", name: "Flawless Topaz", refinedName: "Masterwork Topaz", reqLevel: 10, img: "images/gems/flawless_topaz.png", refinedImg: "images/gems/masterwork_topaz.png", xp: 45, inputQty: 3, outputId: "masterwork_topaz", outputName: "Masterwork Topaz", outputImg: "images/gems/masterwork_topaz.png", verb: "Crafted" },
    { id: "flawless_amethyst", name: "Flawless Amethyst", refinedName: "Masterwork Amethyst", reqLevel: 10, img: "images/gems/flawless_amethyst.png", refinedImg: "images/gems/masterwork_amethyst.png", xp: 45, inputQty: 3, outputId: "masterwork_amethyst", outputName: "Masterwork Amethyst", outputImg: "images/gems/masterwork_amethyst.png", verb: "Crafted" },
    { id: "masterwork_ruby", name: "Masterwork Ruby", refinedName: "Exquisite Ruby", reqLevel: 15, img: "images/gems/masterwork_ruby.png", refinedImg: "images/gems/exquisite_ruby.png", xp: 60, inputQty: 3, outputId: "exquisite_ruby", outputName: "Exquisite Ruby", outputImg: "images/gems/exquisite_ruby.png", verb: "Crafted" },
    { id: "masterwork_sapphire", name: "Masterwork Sapphire", refinedName: "Exquisite Sapphire", reqLevel: 15, img: "images/gems/masterwork_sapphire.png", refinedImg: "images/gems/exquisite_sapphire.webp", xp: 60, inputQty: 3, outputId: "exquisite_sapphire", outputName: "Exquisite Sapphire", outputImg: "images/gems/exquisite_sapphire.webp", verb: "Crafted" },
    { id: "masterwork_emerald", name: "Masterwork Emerald", refinedName: "Exquisite Emerald", reqLevel: 15, img: "images/gems/masterwork_emerald.png", refinedImg: "images/gems/exquisite_emerald.png", xp: 60, inputQty: 3, outputId: "exquisite_emerald", outputName: "Exquisite Emerald", outputImg: "images/gems/exquisite_emerald.png", verb: "Crafted" },
    { id: "masterwork_topaz", name: "Masterwork Topaz", refinedName: "Exquisite Topaz", reqLevel: 15, img: "images/gems/masterwork_topaz.png", refinedImg: "images/gems/exquisite_topaz.png", xp: 60, inputQty: 3, outputId: "exquisite_topaz", outputName: "Exquisite Topaz", outputImg: "images/gems/exquisite_topaz.png", verb: "Crafted" },
    { id: "masterwork_amethyst", name: "Masterwork Amethyst", refinedName: "Exquisite Amethyst", reqLevel: 15, img: "images/gems/masterwork_amethyst.png", refinedImg: "images/gems/exquisite_amethyst.png", xp: 60, inputQty: 3, outputId: "exquisite_amethyst", outputName: "Exquisite Amethyst", outputImg: "images/gems/exquisite_amethyst.png", verb: "Crafted" },
    {
      recipeId: "refined_orb_of_attack",
      name: "Refined Orb of Attack",
      refinedName: "Refined Orb of Attack",
      reqLevel: 1,
      img: "images/orbs/Refined_Orb_of_Attack.webp",
      refinedImg: "images/orbs/Refined_Orb_of_Attack.webp",
      xp: 30,
      outputId: "refined_orb_of_attack",
      outputName: "Refined Orb of Attack",
      outputImg: "images/orbs/Refined_Orb_of_Attack.webp",
      verb: "Crafted",
      returnHref: "jewelcrafting.html?tab=enchanting-orbs&orbView=refined",
      ingredients: [
        { id: "orb_of_creation", name: "Orb of Creation", qty: 1 },
        { id: "refined_ruby", name: "Refined Ruby", qty: 1 }
      ]
    },
    {
      recipeId: "refined_orb_of_defense",
      name: "Refined Orb of Defense",
      refinedName: "Refined Orb of Defense",
      reqLevel: 1,
      img: "images/orbs/Refined_orb_of_defense.webp",
      refinedImg: "images/orbs/Refined_orb_of_defense.webp",
      xp: 30,
      outputId: "refined_orb_of_defense",
      outputName: "Refined Orb of Defense",
      outputImg: "images/orbs/Refined_orb_of_defense.webp",
      verb: "Crafted",
      returnHref: "jewelcrafting.html?tab=enchanting-orbs&orbView=refined",
      ingredients: [
        { id: "orb_of_creation", name: "Orb of Creation", qty: 1 },
        { id: "refined_sapphire", name: "Refined Sapphire", qty: 1 }
      ]
    },
    {
      recipeId: "refined_orb_of_xp",
      name: "Refined Orb of XP",
      refinedName: "Refined Orb of XP",
      reqLevel: 1,
      img: "images/orbs/refined_orb_of_xp.webp",
      refinedImg: "images/orbs/refined_orb_of_xp.webp",
      xp: 30,
      outputId: "refined_orb_of_xp",
      outputName: "Refined Orb of XP",
      outputImg: "images/orbs/refined_orb_of_xp.webp",
      verb: "Crafted",
      returnHref: "jewelcrafting.html?tab=enchanting-orbs&orbView=refined",
      ingredients: [
        { id: "orb_of_creation", name: "Orb of Creation", qty: 1 },
        { id: "refined_emerald", name: "Refined Emerald", qty: 1 }
      ]
    },
    {
      recipeId: "refined_orb_of_gold",
      name: "Refined Orb of Gold",
      refinedName: "Refined Orb of Gold",
      reqLevel: 1,
      img: "images/orbs/Refined_orb_of_gold.webp",
      refinedImg: "images/orbs/Refined_orb_of_gold.webp",
      xp: 30,
      outputId: "refined_orb_of_gold",
      outputName: "Refined Orb of Gold",
      outputImg: "images/orbs/Refined_orb_of_gold.webp",
      verb: "Crafted",
      returnHref: "jewelcrafting.html?tab=enchanting-orbs&orbView=refined",
      ingredients: [
        { id: "orb_of_creation", name: "Orb of Creation", qty: 1 },
        { id: "refined_topaz", name: "Refined Topaz", qty: 1 }
      ]
    },
    {
      recipeId: "refined_orb_of_luck",
      name: "Refined Orb of Luck",
      refinedName: "Refined Orb of Luck",
      reqLevel: 1,
      img: "images/orbs/refined_orb_of_luck.webp",
      refinedImg: "images/orbs/refined_orb_of_luck.webp",
      xp: 30,
      outputId: "refined_orb_of_luck",
      outputName: "Refined Orb of Luck",
      outputImg: "images/orbs/refined_orb_of_luck.webp",
      verb: "Crafted",
      returnHref: "jewelcrafting.html?tab=enchanting-orbs&orbView=refined",
      ingredients: [
        { id: "orb_of_creation", name: "Orb of Creation", qty: 1 },
        { id: "refined_amethyst", name: "Refined Amethyst", qty: 1 }
      ]
    },
    {
      recipeId: "flawless_orb_of_attack",
      name: "Flawless Orb of Attack",
      refinedName: "Flawless Orb of Attack",
      reqLevel: 5,
      img: "images/orbs/flawless_orb_of_attack.webp",
      refinedImg: "images/orbs/flawless_orb_of_attack.webp",
      xp: 45,
      outputId: "flawless_orb_of_attack",
      outputName: "Flawless Orb of Attack",
      outputImg: "images/orbs/flawless_orb_of_attack.webp",
      verb: "Crafted",
      returnHref: "jewelcrafting.html?tab=enchanting-orbs&orbView=flawless",
      ingredients: [
        { id: "orb_of_creation", name: "Orb of Creation", qty: 1 },
        { id: "flawless_ruby", name: "Flawless Ruby", qty: 1 }
      ]
    },
    {
      recipeId: "flawless_orb_of_defense",
      name: "Flawless Orb of Defense",
      refinedName: "Flawless Orb of Defense",
      reqLevel: 5,
      img: "images/orbs/flawless_orb_of_defense.webp",
      refinedImg: "images/orbs/flawless_orb_of_defense.webp",
      xp: 45,
      outputId: "flawless_orb_of_defense",
      outputName: "Flawless Orb of Defense",
      outputImg: "images/orbs/flawless_orb_of_defense.webp",
      verb: "Crafted",
      returnHref: "jewelcrafting.html?tab=enchanting-orbs&orbView=flawless",
      ingredients: [
        { id: "orb_of_creation", name: "Orb of Creation", qty: 1 },
        { id: "flawless_sapphire", name: "Flawless Sapphire", qty: 1 }
      ]
    },
    {
      recipeId: "flawless_orb_of_xp",
      name: "Flawless Orb of XP",
      refinedName: "Flawless Orb of XP",
      reqLevel: 5,
      img: "images/orbs/flawless_orb_of_xp.webp",
      refinedImg: "images/orbs/flawless_orb_of_xp.webp",
      xp: 45,
      outputId: "flawless_orb_of_xp",
      outputName: "Flawless Orb of XP",
      outputImg: "images/orbs/flawless_orb_of_xp.webp",
      verb: "Crafted",
      returnHref: "jewelcrafting.html?tab=enchanting-orbs&orbView=flawless",
      ingredients: [
        { id: "orb_of_creation", name: "Orb of Creation", qty: 1 },
        { id: "flawless_emerald", name: "Flawless Emerald", qty: 1 }
      ]
    },
    {
      recipeId: "flawless_orb_of_gold",
      name: "Flawless Orb of Gold",
      refinedName: "Flawless Orb of Gold",
      reqLevel: 5,
      img: "images/orbs/flawless_orb_of_gold.webp",
      refinedImg: "images/orbs/flawless_orb_of_gold.webp",
      xp: 45,
      outputId: "flawless_orb_of_gold",
      outputName: "Flawless Orb of Gold",
      outputImg: "images/orbs/flawless_orb_of_gold.webp",
      verb: "Crafted",
      returnHref: "jewelcrafting.html?tab=enchanting-orbs&orbView=flawless",
      ingredients: [
        { id: "orb_of_creation", name: "Orb of Creation", qty: 1 },
        { id: "flawless_topaz", name: "Flawless Topaz", qty: 1 }
      ]
    },
    {
      recipeId: "flawless_orb_of_luck",
      name: "Flawless Orb of Luck",
      refinedName: "Flawless Orb of Luck",
      reqLevel: 5,
      img: "images/orbs/flawless_orb_of_luck.webp",
      refinedImg: "images/orbs/flawless_orb_of_luck.webp",
      xp: 45,
      outputId: "flawless_orb_of_luck",
      outputName: "Flawless Orb of Luck",
      outputImg: "images/orbs/flawless_orb_of_luck.webp",
      verb: "Crafted",
      returnHref: "jewelcrafting.html?tab=enchanting-orbs&orbView=flawless",
      ingredients: [
        { id: "orb_of_creation", name: "Orb of Creation", qty: 1 },
        { id: "flawless_amethyst", name: "Flawless Amethyst", qty: 1 }
      ]
    },
    {
      recipeId: "masterwork_orb_of_attack",
      name: "Masterwork Orb of Attack",
      refinedName: "Masterwork Orb of Attack",
      reqLevel: 10,
      img: "images/orbs/masterwork_orb_of_attack.webp",
      refinedImg: "images/orbs/masterwork_orb_of_attack.webp",
      xp: 60,
      outputId: "masterwork_orb_of_attack",
      outputName: "Masterwork Orb of Attack",
      outputImg: "images/orbs/masterwork_orb_of_attack.webp",
      verb: "Crafted",
      returnHref: "jewelcrafting.html?tab=enchanting-orbs&orbView=masterwork",
      ingredients: [
        { id: "orb_of_creation", name: "Orb of Creation", qty: 1 },
        { id: "masterwork_ruby", name: "Masterwork Ruby", qty: 1 }
      ]
    },
    {
      recipeId: "masterwork_orb_of_defense",
      name: "Masterwork Orb of Defense",
      refinedName: "Masterwork Orb of Defense",
      reqLevel: 10,
      img: "images/orbs/masterwork_orb_of_defense.webp",
      refinedImg: "images/orbs/masterwork_orb_of_defense.webp",
      xp: 60,
      outputId: "masterwork_orb_of_defense",
      outputName: "Masterwork Orb of Defense",
      outputImg: "images/orbs/masterwork_orb_of_defense.webp",
      verb: "Crafted",
      returnHref: "jewelcrafting.html?tab=enchanting-orbs&orbView=masterwork",
      ingredients: [
        { id: "orb_of_creation", name: "Orb of Creation", qty: 1 },
        { id: "masterwork_sapphire", name: "Masterwork Sapphire", qty: 1 }
      ]
    },
    {
      recipeId: "masterwork_orb_of_xp",
      name: "Masterwork Orb of XP",
      refinedName: "Masterwork Orb of XP",
      reqLevel: 10,
      img: "images/orbs/masterwork_orb_of_xp.webp",
      refinedImg: "images/orbs/masterwork_orb_of_xp.webp",
      xp: 60,
      outputId: "masterwork_orb_of_xp",
      outputName: "Masterwork Orb of XP",
      outputImg: "images/orbs/masterwork_orb_of_xp.webp",
      verb: "Crafted",
      returnHref: "jewelcrafting.html?tab=enchanting-orbs&orbView=masterwork",
      ingredients: [
        { id: "orb_of_creation", name: "Orb of Creation", qty: 1 },
        { id: "masterwork_emerald", name: "Masterwork Emerald", qty: 1 }
      ]
    },
    {
      recipeId: "masterwork_orb_of_gold",
      name: "Masterwork Orb of Gold",
      refinedName: "Masterwork Orb of Gold",
      reqLevel: 10,
      img: "images/orbs/masterwork_orb_of_gold.webp",
      refinedImg: "images/orbs/masterwork_orb_of_gold.webp",
      xp: 60,
      outputId: "masterwork_orb_of_gold",
      outputName: "Masterwork Orb of Gold",
      outputImg: "images/orbs/masterwork_orb_of_gold.webp",
      verb: "Crafted",
      returnHref: "jewelcrafting.html?tab=enchanting-orbs&orbView=masterwork",
      ingredients: [
        { id: "orb_of_creation", name: "Orb of Creation", qty: 1 },
        { id: "masterwork_topaz", name: "Masterwork Topaz", qty: 1 }
      ]
    },
    {
      recipeId: "masterwork_orb_of_luck",
      name: "Masterwork Orb of Luck",
      refinedName: "Masterwork Orb of Luck",
      reqLevel: 10,
      img: "images/orbs/masterwork_orb_of_luck.webp",
      refinedImg: "images/orbs/masterwork_orb_of_luck.webp",
      xp: 60,
      outputId: "masterwork_orb_of_luck",
      outputName: "Masterwork Orb of Luck",
      outputImg: "images/orbs/masterwork_orb_of_luck.webp",
      verb: "Crafted",
      returnHref: "jewelcrafting.html?tab=enchanting-orbs&orbView=masterwork",
      ingredients: [
        { id: "orb_of_creation", name: "Orb of Creation", qty: 1 },
        { id: "masterwork_amethyst", name: "Masterwork Amethyst", qty: 1 }
      ]
    },
    {
      recipeId: "exquisite_orb_of_attack",
      name: "Exquisite Orb of Attack",
      refinedName: "Exquisite Orb of Attack",
      reqLevel: 15,
      img: "images/orbs/exquisite_orb_of_attack.webp",
      refinedImg: "images/orbs/exquisite_orb_of_attack.webp",
      xp: 75,
      outputId: "exquisite_orb_of_attack",
      outputName: "Exquisite Orb of Attack",
      outputImg: "images/orbs/exquisite_orb_of_attack.webp",
      verb: "Crafted",
      returnHref: "jewelcrafting.html?tab=enchanting-orbs&orbView=exquisite",
      ingredients: [
        { id: "orb_of_creation", name: "Orb of Creation", qty: 1 },
        { id: "exquisite_ruby", name: "Exquisite Ruby", qty: 1 }
      ]
    },
    {
      recipeId: "exquisite_orb_of_defense",
      name: "Exquisite Orb of Defense",
      refinedName: "Exquisite Orb of Defense",
      reqLevel: 15,
      img: "images/orbs/exquisite_orb_of_defense.webp",
      refinedImg: "images/orbs/exquisite_orb_of_defense.webp",
      xp: 75,
      outputId: "exquisite_orb_of_defense",
      outputName: "Exquisite Orb of Defense",
      outputImg: "images/orbs/exquisite_orb_of_defense.webp",
      verb: "Crafted",
      returnHref: "jewelcrafting.html?tab=enchanting-orbs&orbView=exquisite",
      ingredients: [
        { id: "orb_of_creation", name: "Orb of Creation", qty: 1 },
        { id: "exquisite_sapphire", name: "Exquisite Sapphire", qty: 1 }
      ]
    },
    {
      recipeId: "exquisite_orb_of_xp",
      name: "Exquisite Orb of XP",
      refinedName: "Exquisite Orb of XP",
      reqLevel: 15,
      img: "images/orbs/exquisite_orb_of_xp.webp",
      refinedImg: "images/orbs/exquisite_orb_of_xp.webp",
      xp: 75,
      outputId: "exquisite_orb_of_xp",
      outputName: "Exquisite Orb of XP",
      outputImg: "images/orbs/exquisite_orb_of_xp.webp",
      verb: "Crafted",
      returnHref: "jewelcrafting.html?tab=enchanting-orbs&orbView=exquisite",
      ingredients: [
        { id: "orb_of_creation", name: "Orb of Creation", qty: 1 },
        { id: "exquisite_emerald", name: "Exquisite Emerald", qty: 1 }
      ]
    },
    {
      recipeId: "exquisite_orb_of_gold",
      name: "Exquisite Orb of Gold",
      refinedName: "Exquisite Orb of Gold",
      reqLevel: 15,
      img: "images/orbs/exquisite_orb_of_gold.webp",
      refinedImg: "images/orbs/exquisite_orb_of_gold.webp",
      xp: 75,
      outputId: "exquisite_orb_of_gold",
      outputName: "Exquisite Orb of Gold",
      outputImg: "images/orbs/exquisite_orb_of_gold.webp",
      verb: "Crafted",
      returnHref: "jewelcrafting.html?tab=enchanting-orbs&orbView=exquisite",
      ingredients: [
        { id: "orb_of_creation", name: "Orb of Creation", qty: 1 },
        { id: "exquisite_topaz", name: "Exquisite Topaz", qty: 1 }
      ]
    },
    {
      recipeId: "exquisite_orb_of_luck",
      name: "Exquisite Orb of Luck",
      refinedName: "Exquisite Orb of Luck",
      reqLevel: 15,
      img: "images/orbs/exquisite_orb_of_luck.webp",
      refinedImg: "images/orbs/exquisite_orb_of_luck.webp",
      xp: 75,
      outputId: "exquisite_orb_of_luck",
      outputName: "Exquisite Orb of Luck",
      outputImg: "images/orbs/exquisite_orb_of_luck.webp",
      verb: "Crafted",
      returnHref: "jewelcrafting.html?tab=enchanting-orbs&orbView=exquisite",
      ingredients: [
        { id: "orb_of_creation", name: "Orb of Creation", qty: 1 },
        { id: "exquisite_amethyst", name: "Exquisite Amethyst", qty: 1 }
      ]
    }
  ];

  const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  let timer = null;
  let timerAnim = null;
  let actionStartAt = 0;
  let running = false;
  let completed = 0;
  let targetAmount = null;
  let recipe = null;

  function loadActionLock() {
    try { return JSON.parse(localStorage.getItem(ACTION_LOCK_KEY) || "null"); }
    catch { return null; }
  }

  function saveActionLock(lock) {
    localStorage.setItem(ACTION_LOCK_KEY, JSON.stringify(lock || null));
  }

  function isLockExpired(lock, now) {
    if (!lock || !lock.active) return true;
    const last = Number(lock.lastPing || 0);
    return (now - last) > ACTION_MS * 2;
  }

  function acquireActionLock() {
    const now = Date.now();
    const lock = loadActionLock();
    if (lock && !isLockExpired(lock, now)) {
      if (lock.actionId && lock.actionId !== ACTION_ID) {
        return { ok: false, msg: "You are tired. Another action is running." };
      }
      if (now < Number(lock.nextAllowedTs || 0)) {
        const wait = Math.max(0, Number(lock.nextAllowedTs || 0) - now);
        return { ok: false, msg: `You are tired. Wait ${(wait / 1000).toFixed(1)}s.` };
      }
    }
    saveActionLock({
      actionId: ACTION_ID,
      active: true,
      nextAllowedTs: now + ACTION_MS,
      lastPing: now
    });
    return { ok: true };
  }

  function getActionWaitMs() {
    const now = Date.now();
    const lock = loadActionLock();
    if (lock && lock.actionId === ACTION_ID && Number.isFinite(Number(lock.nextAllowedTs))) {
      return Math.max(0, Number(lock.nextAllowedTs) - now);
    }
    return ACTION_MS;
  }

  function touchActionLock() {
    const now = Date.now();
    const lock = loadActionLock();
    if (!lock || lock.actionId !== ACTION_ID) return;
    lock.active = true;
    lock.lastPing = now;
    lock.nextAllowedTs = now + ACTION_MS;
    saveActionLock(lock);
  }

  function releaseActionLock() {
    const lock = loadActionLock();
    if (lock && lock.actionId === ACTION_ID) {
      lock.active = false;
      saveActionLock(lock);
    }
  }

  function loadSave() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {}; }
    catch { return {}; }
  }

  function setSave(next) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(next));
  }
  function appendJewelcraftingReceipt(save, receipt){
    if (!save || typeof save !== "object") return;
    const current = Array.isArray(save.recentCraftRewards) ? save.recentCraftRewards : [];
    current.unshift(receipt && typeof receipt === "object" ? receipt : {});
    save.recentCraftRewards = current.slice(0, 20);
  }
  function commitJewelcraftingTick(save, payload = {}){
    const next = save && typeof save === "object" ? save : {};
    const receipt = {
      id: `jewelcrafting:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`,
      at: new Date().toISOString(),
      profession: "jewelcrafting",
      itemName: String(payload.itemName || ""),
      itemId: String(payload.itemId || ""),
      outputQty: Math.max(1, num(payload.outputQty, 1)),
      xp: Math.max(0, num(payload.xp, 0))
    };
    appendJewelcraftingReceipt(next, receipt);
    next.lastCraftRewardAt = Date.now();
    setSave(next);
    window.dispatchEvent(new Event("ds:save"));
    window.DSAuth?.prioritizeCloudSaveSync?.();
    void window.DSAuth?.invokeActionJournal?.({
      actionId: receipt.id,
      actionKind: "jewelcrafting-craft",
      sourcePage: "jewelcrafting_action.html",
      payload: {
        recipeId: String(payload.recipeId || ""),
        itemId: receipt.itemId,
        itemName: receipt.itemName,
        outputQty: receipt.outputQty,
        xp: receipt.xp,
        completedAt: receipt.at
      }
    }).catch((error) => {
      console.warn("[jewelcrafting] action journal failed", error);
    });
  }

  function roundLevelXP(v){
    v = Math.max(1, Math.round(Number(v) || 1));
    if (v >= 10000000) return Math.ceil(v / 50000) * 50000;
    if (v >= 1000000) return Math.ceil(v / 10000) * 10000;
    if (v >= 100000) return Math.ceil(v / 5000) * 5000;
    if (v >= 10000) return Math.ceil(v / 500) * 500;
    if (v >= 1000) return Math.ceil(v / 100) * 100;
    return Math.round(v);
  }

  function xpNextForLevel(level){
    const L = Math.max(1, Math.floor(Number(level) || 1));
    let xp = 100;
    for (let cur = 2; cur <= L; cur++) {
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
      else if (prev <= 200) {
        const t = (prev - 105) / 95;
        rate = 1.04 - 0.03 * t;
      }
      xp *= rate;
    }
    return roundLevelXP(xp);
  }

  function ensureSave(save) {
    save = save && typeof save === "object" ? save : {};
    if (!Array.isArray(save.inventory)) save.inventory = [];
    if (!save.consumables || typeof save.consumables !== "object") save.consumables = {};
    save.jewelcraftingLevel = Math.max(1, num(save.jewelcraftingLevel, 1));
    save.jewelcraftingXP = Math.max(0, num(save.jewelcraftingXP, 0));
    save.jewelcraftingXPNext = Math.max(1, num(save.jewelcraftingXPNext, xpNextForLevel(save.jewelcraftingLevel)));
    if (!Number.isFinite(Number(save.inventoryMaxSlots))) save.inventoryMaxSlots = 1000;
    return save;
  }

  function xpBarGradient(pct){
    if (pct < 25) return "linear-gradient(90deg,#b84a4a,#e06a6a)";
    if (pct < 50) return "linear-gradient(90deg,#c66a2b,#eea043)";
    if (pct < 75) return "linear-gradient(90deg,#4e9a43,#79c96b)";
    return "linear-gradient(90deg,#2f9e5b,#7be39e)";
  }

  function getPotionTier(item){
    if (!item) return 1;
    const id = String(item.id || "");
    const m = id.match(/_(\d+)$/);
    if (m) return Math.max(1, Math.min(7, Number(m[1]) || 1));
    return 1;
  }

  function getArtisanPotionBonus(save){
    const cons = save && typeof save.consumables === "object" ? save.consumables : {};
    let bonus = 0;
    ["quick_potion1", "quick_potion2"].forEach((slot) => {
      const it = cons[slot];
      if (!it) return;
      const qty = Number.isFinite(Number(it.quantity ?? it.qty)) ? Number(it.quantity ?? it.qty) : 1;
      if (qty <= 0) return;
      const id = String(it.id || "").toLowerCase();
      const name = String(it.name || "").toLowerCase();
      if (!id.includes("artisan_insight") && !name.includes("artisan insight")) return;
      bonus += getPotionTier(it);
    });
    return bonus;
  }

  function tickArtisanPotionActions(save, actions = 1){
    if (!save || typeof save !== "object" || !save.consumables || typeof save.consumables !== "object") return false;
    let changed = false;
    ["quick_potion1", "quick_potion2"].forEach((slot) => {
      const it = save.consumables[slot];
      if (!it) return;
      const id = String(it.id || "").toLowerCase();
      const name = String(it.name || "").toLowerCase();
      if (!id.includes("artisan_insight") && !name.includes("artisan insight")) return;
      let qty = Number.isFinite(Number(it.quantity ?? it.qty)) ? Number(it.quantity ?? it.qty) : 1;
      if (qty <= 0) { save.consumables[slot] = null; changed = true; return; }
      let left = Number(it.actionsLeft);
      if (!Number.isFinite(left) || left <= 0) left = 100;
      let remaining = Math.max(0, Math.floor(left));
      let steps = Math.max(1, Math.floor(actions));
      while (steps-- > 0 && qty > 0) {
        remaining -= 1;
        if (remaining <= 0) {
          qty -= 1;
          if (qty <= 0) {
            save.consumables[slot] = null;
            remaining = 0;
            changed = true;
            break;
          }
          remaining = 100;
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

  function getArtisanBonuses(save) {
    const petBonus = window.DS?.pets?.getArtisanPetBonuses?.(save?.pets?.artisan) || { professionXpPct: 0, doubleCraftPct: 0 };
    const potionPct = Math.max(0, getArtisanPotionBonus(save) * 0.01);
    const buildingPct = Math.max(0, num(save?.jewelcrafterAtelierLevel, 0)) * 0.0005;
    return {
      petXpPct: num(petBonus.professionXpPct, 0),
      doublePct: num(petBonus.doubleCraftPct, 0),
      buildingPct,
      potionPct
    };
  }

  function formatPct(value) {
    return `+${(num(value, 0) * 100).toFixed(1)}%`;
  }

  function findRecipe(id) {
    return RECIPES.find((entry) => String(entry.recipeId || entry.id || "") === String(id || "")) || RECIPES[0];
  }

  function getRecipeIngredients(entry) {
    if (Array.isArray(entry?.ingredients) && entry.ingredients.length) {
      return entry.ingredients.map((ingredient) => ({
        id: String(ingredient.id || ""),
        name: String(ingredient.name || ingredient.id || "Item"),
        qty: Math.max(1, Math.trunc(num(ingredient.qty, 1)))
      }));
    }
    return [{
      id: String(entry?.id || ""),
      name: String(entry?.name || "Item"),
      qty: Math.max(1, Math.trunc(num(entry?.inputQty, 1)))
    }];
  }

  function getRecipeFromHref(href = window.location.href) {
    try {
      const url = new URL(href, window.location.origin);
      return findRecipe(url.searchParams.get("recipe") || "");
    } catch {
      return RECIPES[0];
    }
  }

  function itemKey(item) {
    return [item.type || "", item.id || "", item.name || ""].join("::");
  }

  function addItem(save, item, qty = 1) {
    if (window.DSInventory?.addItem) {
      return window.DSInventory.addItem(save, item, qty, { stack: true, stackKeyFn: itemKey });
    }
    const key = itemKey(item);
    const existing = save.inventory.find((entry) => entry && itemKey(entry) === key);
    if (existing) {
      existing.quantity = Math.max(1, num(existing.quantity ?? existing.qty, 1)) + qty;
      return true;
    }
    save.inventory.push({ ...item, quantity: qty });
    return true;
  }

  function getQty(save, id) {
    const match = (save.inventory || []).find((item) => String(item?.id || "") === id);
    return match ? Math.max(0, num(match.quantity ?? match.qty, 1)) : 0;
  }

  function removeQuantity(save, id, amount = 1) {
    const idx = (save.inventory || []).findIndex((item) => String(item?.id || "") === id);
    if (idx < 0) return false;
    const item = save.inventory[idx];
    const qty = Math.max(1, num(item.quantity ?? item.qty, 1));
    const need = Math.max(1, Math.trunc(num(amount, 1)));
    if (qty < need) return false;
    if (qty > need) item.quantity = qty - need;
    else save.inventory.splice(idx, 1);
    return true;
  }

  function gainJewelcraftingXp(save, baseXp) {
    const bonuses = getArtisanBonuses(save);
    const totalMult = 1 + bonuses.petXpPct + bonuses.buildingPct + bonuses.potionPct;
    const gained = Math.max(1, Math.round(num(baseXp, 0) * totalMult));
    save.jewelcraftingXP += gained;
    save.jewelcraftingXPNext = xpNextForLevel(save.jewelcraftingLevel);
    while (save.jewelcraftingXP >= save.jewelcraftingXPNext) {
      save.jewelcraftingXP -= save.jewelcraftingXPNext;
      save.jewelcraftingLevel += 1;
      save.jewelcraftingXPNext = xpNextForLevel(save.jewelcraftingLevel);
      window.DS?.announcements?.professionLevel?.(save, "Jewelcrafting", save.jewelcraftingLevel);
    }
    return gained;
  }

  function updateHeader() {
    const save = ensureSave(loadSave());
    const lvlEl = document.getElementById("jewelcraftLevel");
    const curEl = document.getElementById("jewelcraftXPCurrent");
    const nextEl = document.getElementById("jewelcraftXPNext");
    const barEl = document.getElementById("jewelcraftXPBar");
    if (lvlEl) lvlEl.textContent = String(save.jewelcraftingLevel);
    if (curEl) curEl.textContent = String(save.jewelcraftingXP);
    if (nextEl) nextEl.textContent = String(save.jewelcraftingXPNext);
    const pct = save.jewelcraftingXPNext > 0 ? clamp((save.jewelcraftingXP / save.jewelcraftingXPNext) * 100, 0, 100) : 0;
    if (barEl) {
      barEl.style.width = `${pct.toFixed(1)}%`;
      barEl.style.background = xpBarGradient(pct);
    }
  }

  function updateBonusBox() {
    const save = ensureSave(loadSave());
    const bonuses = getArtisanBonuses(save);
    const petEl = document.getElementById("artisanBonusPetValue");
    const buildingEl = document.getElementById("artisanBonusBuildingValue");
    const doubleEl = document.getElementById("artisanBonusDoubleValue");
    const potionEl = document.getElementById("artisanBonusPotionValue");
    if (petEl) petEl.textContent = formatPct(bonuses.petXpPct);
    if (buildingEl) buildingEl.textContent = formatPct(bonuses.buildingPct);
    if (doubleEl) doubleEl.textContent = formatPct(bonuses.doublePct);
    if (potionEl) potionEl.textContent = formatPct(bonuses.potionPct);
  }

  function setMessage(text, bad = false) {
    const msg = document.getElementById("msg");
    if (!msg) return;
    msg.innerHTML = text || "";
    msg.style.color = bad ? "#ff9e9e" : "#d8d8e8";
  }

  function buildCraftMessage(recipe, outputQty, xpGain, isLast = false) {
    const outputName = recipe.outputName || recipe.refinedName || recipe.name;
    const outputImg = recipe.outputImg || recipe.refinedImg || recipe.img;
    const lastText = isLast ? " (last)" : "";
    return `You obtained ${outputQty} <img src="${outputImg}" alt="${outputName}" style="width:18px;height:18px;vertical-align:-3px;margin:0 4px 0 6px;border-radius:4px;object-fit:cover;">${outputName}${lastText} (+${xpGain} XP)`;
  }

  function renderRecipe() {
    recipe = recipe || getRecipeFromHref();
    const nameEl = document.getElementById("recipeName");
    const imgEl = document.getElementById("recipeImg");
    const metaEl = document.getElementById("recipeMeta");
    const save = ensureSave(loadSave());
    const ingredients = getRecipeIngredients(recipe);
    if (nameEl) nameEl.textContent = recipe.outputName || recipe.refinedName || recipe.name;
    if (imgEl) {
      imgEl.src = recipe.outputImg || recipe.refinedImg || recipe.img;
      imgEl.alt = recipe.outputName || recipe.refinedName || recipe.name;
    }
    if (metaEl) {
      metaEl.textContent = ingredients
        .map((ingredient) => `Needs ${ingredient.qty} ${ingredient.name} (${getQty(save, ingredient.id)} owned)`)
        .join(" | ");
    }
  }

  function stopRun() {
    if (timer) window.clearTimeout(timer);
    timer = null;
    if (timerAnim) window.cancelAnimationFrame(timerAnim);
    timerAnim = null;
    running = false;
    actionStartAt = 0;
    releaseActionLock();
    const timerWrap = document.getElementById("timerWrap");
    const startBtn = document.getElementById("startBtn");
    const stopBtn = document.getElementById("stopBtn");
    if (timerWrap) timerWrap.style.display = "none";
    const timerBar = document.getElementById("timerBar");
    const timerText = document.getElementById("timerText");
    if (timerBar) timerBar.style.width = "0%";
    if (timerText) timerText.textContent = `${(ACTION_MS / 1000).toFixed(1)}s`;
    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
  }

  function updateTimer() {
    const timerWrap = document.getElementById("timerWrap");
    const timerText = document.getElementById("timerText");
    const timerBar = document.getElementById("timerBar");
    if (!timerWrap || !timerText || !timerBar || !running) return;
    timerWrap.style.display = "";
    const elapsed = Date.now() - actionStartAt;
    const remain = Math.max(0, ACTION_MS - elapsed);
    const pct = clamp((elapsed / ACTION_MS) * 100, 0, 100);
    timerText.textContent = `${(remain / 1000).toFixed(1)}s`;
    timerBar.style.width = `${pct.toFixed(1)}%`;
  }

  function startCooldownUI(remainingMs = ACTION_MS) {
    const timerWrap = document.getElementById("timerWrap");
    const timerText = document.getElementById("timerText");
    const timerBar = document.getElementById("timerBar");
    if (!timerWrap || !timerText || !timerBar) return;

    timerWrap.style.display = "";
    const rem = Math.max(0, Math.min(ACTION_MS, remainingMs));
    actionStartAt = performance.now() - (ACTION_MS - rem);

    const tick = (now) => {
      if (!running) {
        timerAnim = null;
        return;
      }
      const elapsed = now - actionStartAt;
      const pct = clamp((elapsed / ACTION_MS) * 100, 0, 100);
      const remain = Math.max(0, ACTION_MS - elapsed);
      timerText.textContent = `${(remain / 1000).toFixed(1)}s`;
      timerBar.style.width = `${pct.toFixed(1)}%`;
      if (pct < 100) timerAnim = window.requestAnimationFrame(tick);
      else timerAnim = null;
    };

    if (timerAnim) window.cancelAnimationFrame(timerAnim);
    timerAnim = window.requestAnimationFrame(tick);
  }

  function runSingleAction() {
    const save = ensureSave(loadSave());
    if (save.jewelcraftingLevel < recipe.reqLevel) {
      setMessage("Your Jewelcrafting level is too low for this recipe.", true);
      stopRun();
      return;
    }
    const ingredients = getRecipeIngredients(recipe);
    const missingIngredient = ingredients.find((ingredient) => getQty(save, ingredient.id) < ingredient.qty);
    if (missingIngredient) {
      setMessage(`No more ${missingIngredient.name}.`, true);
      stopRun();
      renderRecipe();
      return;
    }
    ingredients.forEach((ingredient) => removeQuantity(save, ingredient.id, ingredient.qty));

    const bonuses = getArtisanBonuses(save);
    let outputQty = 1;
    if (Math.random() < bonuses.doublePct) outputQty += 1;

    addItem(save, {
      type: "material",
      id: recipe.outputId,
      name: recipe.outputName || recipe.refinedName,
      img: recipe.outputImg || recipe.refinedImg || recipe.img
    }, outputQty);

    const xpGain = gainJewelcraftingXp(save, recipe.xp);
    tickArtisanPotionActions(save, 1);

    commitJewelcraftingTick(save, {
      recipeId: recipe.recipeId || recipe.outputId,
      itemName: recipe.outputName || recipe.refinedName,
      itemId: recipe.outputId,
      outputQty,
      xp: xpGain
    });
    completed += 1;
    renderRecipe();
    updateHeader();
    updateBonusBox();

    if (targetAmount != null && completed >= targetAmount) {
      setMessage(`Target completed! ${buildCraftMessage(recipe, outputQty, xpGain, true)}`);
      stopRun();
      return;
    }
    setMessage(buildCraftMessage(recipe, outputQty, xpGain, false));
    touchActionLock();
  }

  function scheduleNextCraft(runImmediately = false) {
    if (!running) return;
    if (runImmediately) {
      runSingleAction();
      return;
    }
    const waitMs = getActionWaitMs();
    startCooldownUI(waitMs);
    timer = window.setTimeout(function loop() {
      if (!running) return;
      runSingleAction();
      if (!running) return;
      scheduleNextCraft(false);
    }, waitMs);
  }

  function startRun() {
    if (running) return;
    const save = ensureSave(loadSave());
    if (save.jewelcraftingLevel < recipe.reqLevel) {
      setMessage("Your Jewelcrafting level is too low for this recipe.", true);
      return;
    }
    const ingredients = getRecipeIngredients(recipe);
    const missingIngredient = ingredients.find((ingredient) => getQty(save, ingredient.id) < ingredient.qty);
    if (missingIngredient) {
      setMessage(`You need ${missingIngredient.qty} ${missingIngredient.name}.`, true);
      return;
    }
    const lock = acquireActionLock();
    if (!lock.ok) {
      setMessage(lock.msg, true);
      return;
    }
    running = true;
    completed = 0;
    document.getElementById("startBtn")?.setAttribute("disabled", "disabled");
    const stopBtn = document.getElementById("stopBtn");
    if (stopBtn) stopBtn.disabled = false;
    setMessage("Refining started.");
    scheduleNextCraft(true);
    if (!running) return;
    scheduleNextCraft(false);
  }

  function bindEvents() {
    document.getElementById("backBtn")?.addEventListener("click", () => {
      const href = recipe?.returnHref || "jewelcrafting.html";
      if (window.DSUI?.navigateWithinShell?.(href)) return;
      window.location.href = href;
    });
    document.getElementById("startBtn")?.addEventListener("click", () => {
      const target = Math.max(0, Math.trunc(num(document.getElementById("targetInput")?.value, 0)));
      targetAmount = target > 0 ? target : null;
      startRun();
    });
    document.getElementById("stopBtn")?.addEventListener("click", () => {
      setMessage("Refining stopped.");
      stopRun();
    });
    document.getElementById("targetBtn")?.addEventListener("click", () => {
      const target = Math.max(1, Math.trunc(num(document.getElementById("targetInput")?.value, 1)));
      const status = document.getElementById("targetStatus");
      targetAmount = target;
      if (status) status.textContent = `Target set to ${target}.`;
    });
  }

  function mount(root = null, href = window.location.href) {
    const left = root || document.getElementById("leftPanel");
    if (!left) return false;
    left.innerHTML = TEMPLATE;
    document.title = "Darkstone Chronicles - Jewelcrafting Action";
    recipe = getRecipeFromHref(href);
    stopRun();
    renderRecipe();
    updateHeader();
    updateBonusBox();
    bindEvents();
    return true;
  }

  function currentPage() {
    return String(window.location.pathname || "").split("/").pop().toLowerCase() || "index.html";
  }

  window.DSJewelcraftingAction = {
    mount,
    getAdminItems: () => {
      const byKey = new Map();
      const add = (item) => {
        if (!item?.id || !item?.name) return;
        byKey.set(itemKey(item), { ...item, quantity: 1 });
      };
      RECIPES.forEach((entry) => {
        getRecipeIngredients(entry).forEach((ingredient) => {
          add({
            type: "material",
            id: ingredient.id,
            name: ingredient.name,
            img: entry.id === ingredient.id ? entry.img : ""
          });
        });
        add({
          type: "material",
          id: entry.outputId,
          name: entry.outputName || entry.refinedName,
          img: entry.outputImg || entry.refinedImg || entry.img
        });
      });
      return Array.from(byKey.values());
    }
  };

  window.addEventListener("DOMContentLoaded", () => {
    if (currentPage() !== "jewelcrafting_action.html") return;
    mount();
  });
})();
