import { geminiService } from "../services/gemini.service.js";
import { productRepository } from "../repositories/product.repository.js";
import { AgentRequest, AgentResponse, ToolActivity, ChatMessage } from "../schemas/agent.schema.js";
import { ProjectState } from "../schemas/project.schema.js";

export class AgentOrchestrator {
  public async processRequest(req: AgentRequest): Promise<AgentResponse> {
    const useMock = req.useMock !== undefined ? req.useMock : process.env.USE_MOCK_AI === "true";

    let fallbackNotice = "";
    if (!useMock && geminiService.isAvailable()) {
      try {
        const { replyText, updatedProjectState, toolActivity, suggestedActions } =
          await geminiService.generateResponse(
            req.message,
            req.image,
            req.history || [],
            req.projectState
          );

        const newMsg: ChatMessage = {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: replyText,
          timestamp: new Date().toISOString(),
          toolActivity,
        };

        return {
          message: newMsg,
          projectState: updatedProjectState,
          suggestedActions,
          toolActivity,
        };
      } catch (error: any) {
        console.warn("Real Gemini API call failed or unavailable, falling back to intelligent Mock AI engine:", error);
        const errMsg = error?.message?.split("\n")[0] || String(error);
        fallbackNotice = `> ⚠️ **Live Gemini API Notice:** Google Gemini API returned a quota or connection error (*${errMsg}*). Automatically routed to our High-Fidelity Local Engine right now:\n\n---\n\n`;
      }
    } else if (!useMock && !geminiService.isAvailable()) {
      fallbackNotice = `> ⚠️ **Live Gemini API Notice:** API Key is not configured or invalid in \`.env\`. Automatically routed to High-Fidelity Local Engine:\n\n---\n\n`;
    }

    // Execute high-fidelity Mock AI mode
    const mockRes = await this.runMockEngine(req);
    if (fallbackNotice && mockRes.message) {
      mockRes.message.content = fallbackNotice + mockRes.message.content;
    }
    return mockRes;
  }

  private async runMockEngine(req: AgentRequest): Promise<AgentResponse> {
    const userMsgLower = req.message.toLowerCase().trim();
    const hasImage = Boolean(req.image);
    let state = JSON.parse(JSON.stringify(req.projectState)) as ProjectState;
    const toolActivities: ToolActivity[] = [];
    let replyText = "";
    let suggestedActions: string[] = [];

    // Simulate tool activity latency and steps
    const recordTool = (tool: string, label: string) => {
      toolActivities.push({
        tool,
        status: "completed",
        displayLabel: label,
      });
    };

    // --- Greeting / Identity Scenario ---
    if (!hasImage && ["hi", "hello", "hey", "hi there", "hello there", "good morning", "good evening", "good afternoon", "who are you", "what is your name"].includes(userMsgLower)) {
      replyText = `### Hi! I'm MR. Plus AI Agent, how can I help you today? ✨

I'm your dedicated digital project architect and shopping advisor. Unlike a standard search bar, I can synthesize multi-step DIY plans, diagnose broken household items from photos, and optimize your entire shopping basket to strictly respect your budget.

#### Try starting with a quick demo scenario:
- 🌿 **"I want to set up a small balcony garden. My budget is ₹8,000."**
- 🏡 **"I'm moving into my first apartment. Build me an essentials list under ₹15,000."**
- 🔧 **Upload a photo** of a broken cabinet hinge or fixture and ask: **"How can I fix this?"**
- 🔌 **"I need the thing used to organize loose charging cables, but I don't know what it's called."**

Just let me know what you're aiming for, and I'll help you build a plan, find the right products, and keep everything within your budget!`;

      suggestedActions = [
        "Set up a small balcony garden (₹8,000)",
        "First apartment essentials under ₹15,000",
        "How can I fix a loose cabinet hinge?",
        "Find cable organizer and desk tidy box",
      ];
    }
    // --- Scenario 3: Image Upload / Broken Item Analysis ---
    else if (hasImage || userMsgLower.includes("fix this") || userMsgLower.includes("broken") || userMsgLower.includes("hinge")) {
      recordTool("search_products", "Found 3 relevant cabinet hardware & tool products");
      recordTool("update_project_plan", "Initialized Cabinet Hinge Repair workspace");

      state.status = "planning";
      state.title = "Cabinet Hinge Repair & Reinforcement";
      state.goal = "Repair loose or stripped cabinet hinge mounting points safely";
      state.imageAnalysis = {
        imageUrl: req.image || "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=500&q=80",
        observations: [
          "A concealed metal cabinet hinge is clearly visible on the inner door frame",
          "The top mounting screws appear loose or partially pulled out from the particle board/wood",
          "The hinge cup alignment is slightly off center"
        ],
        possibleIssue: "The mounting screw holes have become stripped or enlarged over time, causing the hinge to sag or detach under door weight.",
        confidence: "medium",
        additionalInformationNeeded: [
          "A close-up image of the mounting holes without the hinge attached to confirm if the wood fiber is stripped out."
        ]
      };

      state.steps = [
        {
          id: "step_fix_1",
          title: "Inspect & Tighten Existing Screws",
          description: "Attempt gentle tightening with a manual screwdriver. Avoid overtightening if wood is stripped.",
          status: "complete",
          relatedProductIds: ["prod_tool_001"]
        },
        {
          id: "step_fix_2",
          title: "Install Hinge Repair Reinforcement Plates",
          description: "Mount stainless steel repair plates over the stripped area to create a fresh, heavy-duty anchor zone for hinge screws.",
          status: "active",
          relatedProductIds: ["prod_hard_003"]
        },
        {
          id: "step_fix_3",
          title: "Replace with Soft-Close Hinges (Optional)",
          description: "If the old hinge mechanism is bent or rusted, swap both hinges for smooth hydraulic soft-close dampers.",
          status: "pending",
          relatedProductIds: ["prod_hard_002"]
        }
      ];

      state.shoppingList = [
        {
          productId: "prod_hard_003",
          quantity: 1,
          priority: "essential",
          reason: "Directly solves stripped cabinet screw holes by bridging the damaged wood with stainless steel anchor plates."
        },
        {
          productId: "prod_hard_002",
          quantity: 1,
          priority: "recommended",
          reason: "Upgrades the door with hydraulic damping so slamming won't stress the new screw mounting points."
        },
        {
          productId: "prod_tool_001",
          quantity: 1,
          priority: "optional",
          reason: "Cordless drill driver makes drilling pilot holes and securing stainless steel plates effortless."
        }
      ];

      const basket = productRepository.calculateBasket(state.shoppingList, 2000);
      state.budget = {
        maximum: 2000,
        currentTotal: basket.subtotal,
        remaining: basket.budgetRemaining || null
      };

      replyText = `### AI Multimodal Inspection & Diagnosis

I've analyzed the photo of your cabinet hinge. Here is what I discovered:

**Detected Issue:**
The mounting screws securing the hinge cup to the cabinet frame appear loose. In particle board and MDF cabinets, repeated opening and closing often strips out the wood threads over time.

**My Confidence Level:** \`Medium\`
*(To be 100% sure the wood isn't cracked deeper, a close-up photo of the bare mounting holes would help!)*

#### Recommended Safe DIY Solution:
Instead of trying to fill the stripped holes with toothpicks and glue, the most professional and lasting fix is installing a **Stainless Steel Hinge Repair Plate Kit (\`₹299\`)**. This plate screws securely into healthy wood around the damaged zone and provides fresh, pre-threaded anchor points for your hinge!

Check the **left workspace** to review the complete 3-step repair plan and recommended products. Would you like me to check compatibility or find nearby stores with these parts in stock?`;

      suggestedActions = [
        "How do I install the repair plate?",
        "Show cheaper alternatives",
        "Find nearby store in stock",
        "Can I fix without tools?"
      ];
    }
    // --- Scenario 1: Balcony Garden Setup ---
    else if (userMsgLower.includes("balcony garden") || (userMsgLower.includes("garden") && !userMsgLower.includes("reduce"))) {
      recordTool("search_products", "Found 10 relevant Gardening & Outdoor products");
      recordTool("check_product_compatibility", "Verified 5 garden products are fully compatible");
      recordTool("calculate_basket", "Optimized basket within ₹8,000 max budget");
      recordTool("update_project_plan", "Built Balcony Garden workspace (₹5,840 total)");

      state.status = "planning";
      state.title = "Balcony Garden Project";
      state.goal = "Create a small, lush, low-maintenance balcony garden under ₹8,000";
      state.preferences = ["Small space", "Low maintenance", "Warm aesthetic"];

      state.steps = [
        {
          id: "step_gard_1",
          title: "Prepare the Space & Soil",
          description: "Clean the balcony area and mix organic potting soil with perlite for optimal drainage.",
          status: "active",
          relatedProductIds: ["prod_gard_003", "prod_gard_008"],
          estimatedCost: 749
        },
        {
          id: "step_gard_2",
          title: "Add Plant Containers & Railing Planters",
          description: "Mount self-watering rail planters and vertical stands to maximize vertical space without cluttering the floor.",
          status: "pending",
          relatedProductIds: ["prod_gard_001", "prod_gard_002", "prod_gard_006"],
          estimatedCost: 3398
        },
        {
          id: "step_gard_3",
          title: "Equip Essential Gardening Tools",
          description: "Set up durable stainless steel trowel, pruning shears, and precision watering can for regular care.",
          status: "pending",
          relatedProductIds: ["prod_gard_004", "prod_gard_007"],
          estimatedCost: 1098
        },
        {
          id: "step_gard_4",
          title: "Add Organization & Decorative Lighting",
          description: "Install outdoor waterproof smart RGBW LED strip lights along the railing or planter edges.",
          status: "pending",
          relatedProductIds: ["prod_elec_001"],
          estimatedCost: 1199
        }
      ];

      state.shoppingList = [
        {
          productId: "prod_gard_001",
          quantity: 1,
          priority: "essential",
          reason: "Selected because self-watering reservoirs prevent overwatering and save floor space by attaching directly to railings."
        },
        {
          productId: "prod_gard_002",
          quantity: 1,
          priority: "essential",
          reason: "3-Tier vertical design allows growing 9+ plants in a compact 55cm footprint."
        },
        {
          productId: "prod_gard_003",
          quantity: 1,
          priority: "essential",
          reason: "Enriched organic blend provides essential nutrients and perlite prevents root rot in containers."
        },
        {
          productId: "prod_gard_004",
          quantity: 1,
          priority: "essential",
          reason: "Covers all basic hand tools (trowel, fork, shears, gloves) required for planting and maintenance."
        },
        {
          productId: "prod_gard_006",
          quantity: 1,
          priority: "recommended",
          reason: "Ceramic herb pots with bamboo trays add a clean, warm aesthetic to tabletop or shelf spaces."
        },
        {
          productId: "prod_gard_007",
          quantity: 1,
          priority: "recommended",
          reason: "Long narrow spout reaches deep foliage without splashing soil onto your balcony tiles."
        },
        {
          productId: "prod_elec_001",
          quantity: 1,
          priority: "optional",
          reason: "Waterproof smart LED strip creates stunning warm evening ambiance for relaxing outdoors."
        }
      ];

      const basket = productRepository.calculateBasket(state.shoppingList, 8000);
      state.budget = {
        maximum: 8000,
        currentTotal: basket.subtotal,
        remaining: basket.budgetRemaining || null
      };

      replyText = `### Your Custom Balcony Garden Plan is Ready! 🌿

I've structured a complete 4-step project plan tailored to your **₹8,000 budget** and low-maintenance goals.

#### Budget & Basket Summary:
- **Total Basket:** \`₹${basket.subtotal}\` across **${basket.itemCount} items**
- **Budget Margin:** You have \`₹${basket.budgetRemaining}\` remaining below your ₹8,000 limit!

#### Why These Products?
1. **Vertical & Railing Planters (\`₹2,749\` total):** By utilizing your balcony railing (\`prod_gard_001\`) and a 3-tier vertical stand (\`prod_gard_002\`), we keep 80% of your floor clear while tripling planting capacity!
2. **Essential Tool & Soil Setup (\`₹1,049\`):** Enriched perlite potting soil paired with a 5-piece stainless steel tool kit ensures roots thrive without root rot.
3. **Ambiance Lighting (\`₹1,199\` - Optional):** IP65 waterproof smart LED strips along the railing create warm evening aesthetics.

Take a look at the **Dynamic Workspace on the left** to explore each step and product card. You can adjust quantities, swap products, or modify constraints anytime!`;

      suggestedActions = [
        "Reduce budget to ₹6,000 and remove lighting",
        "Show cheaper planter alternatives",
        "Find physical stores with these in stock",
        "Add automatic drip irrigation"
      ];
    }
    // --- Scenario 1 Follow-up: Reduce budget to ₹6,000 and remove lighting ---
    else if (userMsgLower.includes("reduce") || userMsgLower.includes("remove lighting") || userMsgLower.includes("6,000") || userMsgLower.includes("6000")) {
      recordTool("update_project_plan", "Removed optional lighting & re-budgeted to ₹6,000");
      recordTool("find_product_alternatives", "Recalculated essential & recommended basket items");
      recordTool("calculate_basket", "New subtotal: ₹4,640 (₹1,360 remaining of ₹6,000)");

      state.title = "Balcony Garden Project (Budget Optimized)";
      state.preferences = ["Small space", "Low maintenance", "Strict ₹6,000 Budget"];

      // Remove lighting step and related product
      state.steps = state.steps.filter((s) => !s.title.toLowerCase().includes("lighting") && !s.id.includes("step_gard_4"));
      state.shoppingList = state.shoppingList.filter((item) => item.productId !== "prod_elec_001");

      const basket = productRepository.calculateBasket(state.shoppingList, 6000);
      state.budget = {
        maximum: 6000,
        currentTotal: basket.subtotal,
        remaining: basket.budgetRemaining || null
      };

      replyText = `### Project Updated: Budget Reduced to ₹6,000 & Lighting Removed ✨

I've immediately updated your project plan and shopping basket on the left workspace:

#### What Changed:
- **Removed Optional Lighting:** Dropped the Smart Wi-Fi LED Strip Lights (\`prod_elec_001\`), instantly saving **₹1,199**.
- **Updated Budget Ceiling:** Lowered maximum target from ₹8,000 to **₹6,000**.
- **New Total:** Your basket is now **\`₹${basket.subtotal}\`** for **${basket.itemCount} core items**.
- **Remaining Buffer:** You are safely **\`₹${basket.budgetRemaining}\`** under your new ₹6,000 limit!

The remaining items cover 100% of the essential containers, potting mix, tools, and ceramic planters needed for a thriving, low-maintenance balcony garden without any unnecessary frills. How does this look to you?`;

      suggestedActions = [
        "Find physical stores with these in stock",
        "Show cheaper alternatives for vertical stand",
        "Generate printable shopping list",
        "Proceed to checkout"
      ];
    }
    // --- Scenario 2: First Apartment Essentials (₹15,000) ---
    else if (userMsgLower.includes("apartment") || userMsgLower.includes("essentials") || userMsgLower.includes("moving")) {
      recordTool("search_products", "Found 12 top-rated Apartment Essential products across 4 categories");
      recordTool("calculate_basket", "Built tiered essentials basket (₹13,342 total)");
      recordTool("update_project_plan", "Initialized New Apartment Setup workspace");

      state.status = "planning";
      state.title = "First Apartment Move-In Essentials";
      state.goal = "Equip new apartment with high-quality daily essentials under ₹15,000";
      state.preferences = ["Stainless steel cookware", "Space-saving organization", "Essential tools"];

      state.steps = [
        {
          id: "step_apt_1",
          title: "Kitchen Cooking & Dining Essentials",
          description: "Equip kitchen with tri-ply stainless steel cookware and heat-resistant silicone utensils.",
          status: "active",
          relatedProductIds: ["prod_kit_001", "prod_kit_002", "prod_kit_004"],
          estimatedCost: 5997
        },
        {
          id: "step_apt_2",
          title: "Home Tool & Emergency Maintenance Kit",
          description: "Have basic hammer, pliers, screwdriver set, and extension power strips ready for furniture assembly and setup.",
          status: "pending",
          relatedProductIds: ["prod_tool_002", "prod_elec_003"],
          estimatedCost: 2098
        },
        {
          id: "step_apt_3",
          title: "Bathroom & Storage Organization",
          description: "Install rust-proof shower caddy, quick-dry memory foam bath mat, and rolling utility storage cart.",
          status: "pending",
          relatedProductIds: ["prod_bath_001", "prod_bath_002", "prod_stor_005"],
          estimatedCost: 2897
        },
        {
          id: "step_apt_4",
          title: "Cleaning & Waste Management",
          description: "Set up soft-close stainless steel step trash can and microfiber cleaning towels.",
          status: "pending",
          relatedProductIds: ["prod_home_004", "prod_home_003"],
          estimatedCost: 1448
        }
      ];

      state.shoppingList = [
        { productId: "prod_kit_001", quantity: 1, priority: "essential", reason: "Pro-grade 7-piece tri-ply stainless steel cookware set covering frying, boiling, and sautéing." },
        { productId: "prod_kit_002", quantity: 1, priority: "essential", reason: "10-piece BPA-free silicone utensils protect cookware and handle temperatures up to 230°C." },
        { productId: "prod_tool_002", quantity: 1, priority: "essential", reason: "46-piece hand tool kit needed for flat-pack furniture assembly and quick home fixes." },
        { productId: "prod_elec_003", quantity: 1, priority: "essential", reason: "6-outlet surge protector with 20W USB-C port protects electronics and charges laptops safely." },
        { productId: "prod_home_004", quantity: 1, priority: "essential", reason: "12L fingerprint-proof step trash can keeps kitchen waste odorless and hygienic." },
        { productId: "prod_bath_001", quantity: 1, priority: "recommended", reason: "3-tier rust-proof stainless steel hanging shower caddy eliminates shower floor clutter." },
        { productId: "prod_bath_002", quantity: 1, priority: "recommended", reason: "Ultra-plush memory foam bath mat set with non-slip rubber backing." },
        { productId: "prod_stor_005", quantity: 1, priority: "recommended", reason: "3-tier rolling metal cart fits tightly between appliances or in pantry spaces." },
        { productId: "prod_kit_004", quantity: 1, priority: "optional", reason: "Airtight borosilicate glass containers keep leftovers fresh and won't stain or absorb odors." },
        { productId: "prod_home_003", quantity: 1, priority: "optional", reason: "Pack of 12 streak-free microfiber cloths for spotless windows and counters." }
      ];

      const basket = productRepository.calculateBasket(state.shoppingList, 15000);
      state.budget = {
        maximum: 15000,
        currentTotal: basket.subtotal,
        remaining: basket.budgetRemaining || null
      };

      replyText = `### Welcome to Your New Apartment Setup Planner! 🏡

Moving into your first apartment is exciting! To make sure you get lasting, high-quality gear without overspending, I've curated a balanced **10-item essential move-in basket** within your **₹15,000 budget**.

#### Basket Breakdown by Priority:
- **Essential Items (₹7,244):** Tri-Ply Stainless Steel Cookware (\`prod_kit_001\`), Silicone Utensils (\`prod_kit_002\`), 46-Piece Tool Kit (\`prod_tool_002\`), Surge Protector (\`prod_elec_003\`), and Stainless Step Trash Can (\`prod_home_004\`).
- **Recommended Comforts (₹2,897):** Hanging Shower Caddy, Memory Foam Bath Rugs, and a 3-Tier Rolling Storage Cart (\`prod_stor_005\`).
- **Optional Upgrades (₹1,498):** Glass Meal Prep Containers (\`prod_kit_004\`) and Microfiber Towel Pack.

#### Total Budget Status:
- **Current Subtotal:** \`₹${basket.subtotal}\`
- **Budget Remaining:** \`₹${basket.budgetRemaining}\` saved under your ₹15,000 limit!

Notice on the **left workspace** how we separated everything cleanly into logical rooms. If you already own cookware or kitchen tools, just let me know ("I already have kitchen items") and I will remove them and reallocate your budget!`;

      suggestedActions = [
        "I already have kitchen items, remove them",
        "Add smart lighting bulbs",
        "Show cheaper storage box alternatives",
        "Find physical stores nearby"
      ];
    }
    // --- Scenario 2 Follow-up: Remove kitchen items ---
    else if (userMsgLower.includes("already have kitchen") || userMsgLower.includes("remove kitchen")) {
      recordTool("update_project_plan", "Filtered out all Kitchen category items");
      recordTool("calculate_basket", "Recalculated subtotal: ₹6,146 (₹8,854 remaining savings)");

      state.title = "First Apartment Move-In Essentials (Kitchen Excluded)";
      state.steps = state.steps.filter((s) => !s.title.toLowerCase().includes("kitchen") && !s.id.includes("step_apt_1"));
      state.shoppingList = state.shoppingList.filter((item) => {
        const prod = productRepository.getProductById(item.productId);
        return prod?.category !== "Kitchen";
      });

      const basket = productRepository.calculateBasket(state.shoppingList, 15000);
      state.budget = {
        maximum: 15000,
        currentTotal: basket.subtotal,
        remaining: basket.budgetRemaining || null
      };

      replyText = `### Kitchen Items Removed: ₹7,196 Saved! 🍳->🚫

I've removed all cookware, glass food containers, and silicone utensils from your apartment plan since you already have them covered!

#### Updated Budget & Basket:
- **New Subtotal:** **\`₹${basket.subtotal}\`** (down from ₹13,342)
- **Available Remaining Budget:** **\`₹${basket.budgetRemaining}\`**

With nearly ₹8,850 in freed-up budget, you can now comfortably keep this cash as savings, or we can invest part of it into:
1. **A Cordless Power Drill (\`prod_tool_001\` - ₹2,499)** for effortless wall mounting and curtain rod installation.
2. **Bohemian Cotton Area Rug (\`prod_home_001\` - ₹1,199)** to warm up your living space.

Check your **left workspace** to see the streamlined list and updated progress tracker!`;

      suggestedActions = [
        "Add the Cordless Drill and Bohemian Rug",
        "Keep remaining as cash buffer",
        "Find nearby store with current items",
        "Download final shopping list"
      ];
    }
    // --- Scenario 4: Product Discovery ("I don't know what this product is called") ---
    else if (userMsgLower.includes("cables") || userMsgLower.includes("organize loose") || userMsgLower.includes("don't know what it's called") || userMsgLower.includes("called")) {
      recordTool("search_products", "Searched keywords: 'cable', 'organizer', 'wire', 'cord'");
      recordTool("get_product_details", "Retrieved specifications for Cable Management Box & Silicone Clips");
      recordTool("update_project_plan", "Created Cable Management & Desk Declutter plan");

      state.status = "discovering";
      state.title = "Desk Cable Management & Clutter Organization";
      state.goal = "Conceal messy power strips and route loose charging cables cleanly";
      
      state.steps = [
        {
          id: "step_cabl_1",
          title: "Conceal Power Strips & Plugs",
          description: "Enclose unsightly surge protectors and excess cord length inside a fire-retardant Cable Management Box.",
          status: "active",
          relatedProductIds: ["prod_stor_006"]
        },
        {
          id: "step_cabl_2",
          title: "Route & Secure Loose Charging Wires",
          description: "Attach silicone desktop clips near the desk edge and bundle excess wire with self-adhesive velcro straps.",
          status: "pending",
          relatedProductIds: ["prod_stor_007"]
        }
      ];

      state.shoppingList = [
        {
          productId: "prod_stor_006",
          quantity: 1,
          priority: "essential",
          reason: "Fire-retardant ABS enclosure hides power strips safely away from pets and children while keeping cords organized."
        },
        {
          productId: "prod_stor_007",
          quantity: 1,
          priority: "essential",
          reason: "Pack of 20 silicone clips and velcro straps keep phone and laptop charging cables within easy reach on the desk."
        }
      ];

      const basket = productRepository.calculateBasket(state.shoppingList, 1500);
      state.budget = {
        maximum: 1500,
        currentTotal: basket.subtotal,
        remaining: basket.budgetRemaining || null
      };

      replyText = `### Found Exactly What You Need: Cable Management Box & Clips! 🔌✨

You described the frustration of loose, tangled charging cables and bulky power strips under or on your desk. In our retail catalogue, these exact solutions are called:

#### 1. **Minimalist Cable Management & Wire Organizer Box (\`₹499\`)** (\`prod_stor_006\`)
- **What it does:** A sleek, fire-retardant ABS box with pass-through slots on both ends. You place your power strip right inside, plug in your chargers, snap the lid shut, and all the messy plugs disappear instantly!

#### 2. **Silicone Cable Management Clips & Adhesive Ties (\`₹249\`)** (\`prod_stor_007\`)
- **What it does:** Includes 10 soft desktop clips with peel-and-stick backing so your phone and USB-C cables never fall off the back of the desk again, plus 10 adjustable hook-and-loop velcro straps to bundle loose wires cleanly.

#### Combined Basket Cost: **\`₹748\`**
Both items work seamlessly together (\`check_product_compatibility\` verified). Check out the product cards on the **left workspace**! Would you like me to add a **Heavy-Duty 6-Outlet Surge Protector with USB-C (\`₹799\`)** to complete the setup?`;

      suggestedActions = [
        "Add the Surge Protector with USB-C",
        "Show alternative storage organizers",
        "Find store in Indiranagar with these in stock",
        "Checkout this bundle"
      ];
    }
    // --- Product Replacement / Cheaper Alternatives request ---
    else if (userMsgLower.includes("cheaper") || userMsgLower.includes("replace") || userMsgLower.includes("alternatives")) {
      recordTool("find_product_alternatives", "Found 3 budget and value alternatives");
      recordTool("calculate_basket", "Recalculated potential savings");

      const currentList = state.shoppingList.length > 0 ? state.shoppingList : [
        { productId: "prod_stor_003", quantity: 1, priority: "essential" as const, reason: "Current item" }
      ];

      replyText = `### Exploring Product Alternatives & Budget Optimizations 💡

I've searched our catalog for high-quality alternatives to help optimize your budget or match specific features:

#### Featured Swap & Alternatives:
- **Current Choice:** \`Storage Box Pro (60L Weatherproof)\` — **₹999**
- **Budget Choice:** \`Storage Box Basic (25L Stackable with Lid)\` — **₹499** (*Save ₹500!*)
- **Best Value:** \`Storage Box Plus (40L Stackable with Wheels)\` — **₹699** (*Save ₹300!*)

Whenever you view a product card on the **left workspace**, you can click the **[Replace]** button to instantly swap it for any of these alternatives. The AI will recalculate your basket subtotal and remaining budget in real time without any page reloads!`;

      suggestedActions = [
        "Replace with Storage Box Basic (₹499)",
        "Replace with Storage Box Plus (₹699)",
        "Find nearby store in stock",
        "Back to project plan"
      ];
    }
    // --- Store Discovery request ---
    else if (userMsgLower.includes("store") || userMsgLower.includes("indiranagar") || userMsgLower.includes("nearby") || userMsgLower.includes("stock")) {
      recordTool("find_nearby_stores", "Found 4 stores near Bengaluru / Indiranagar");

      const stores = productRepository.findStores({});
      replyText = `### Nearby Retail Stores & Live Inventory Status 📍

Good news! We checked physical inventory across our retail stores for your current basket items:

#### 1. **DIY Hub Flagship Store — Indiranagar** (*1.8 km away*)
- **Address:** 100 Feet Road, Indiranagar, Bengaluru, KA 560038
- **Stock Status:** \`18 items in stock\` (All current basket items ready for immediate pickup!)
- **Hours:** 9:00 AM – 9:30 PM (Daily) | Phone: +91 80 4123 5678

#### 2. **DIY Hub Express — Koramangala** (*4.2 km away*)
- **Address:** 80 Feet Road, 4th Block, Koramangala, Bengaluru, KA 560034
- **Stock Status:** \`15 items in stock\`

You can reserve these items online now for **2-Hour Store Pickup** or have them dispatched for same-day home delivery!`;

      suggestedActions = [
        "Reserve for 2-Hour Pickup at Indiranagar",
        "Switch to Same-Day Home Delivery",
        "Review final shopping list",
        "Start a new project"
      ];
    }
    // --- General / Default Fallback Handling ---
    else {
      recordTool("search_products", `Searched products matching query: "${req.message.slice(0, 30)}..."`);
      const found = productRepository.searchProducts({ query: req.message, limit: 5 });

      if (found.length > 0 && state.shoppingList.length === 0) {
        state.status = "planning";
        state.title = `${found[0].category} Project Discovery`;
        state.goal = req.message;
        state.shoppingList = found.slice(0, 3).map((p) => ({
          productId: p.id,
          quantity: 1,
          priority: "essential" as const,
          reason: `Discovered from catalog search matching your inquiry for ${p.name}.`
        }));
        const basket = productRepository.calculateBasket(state.shoppingList, null);
        state.budget = {
          maximum: null,
          currentTotal: basket.subtotal,
          remaining: null
        };
      }

      if (found.length > 0) {
        replyText = `### Catalog Discovery for "${req.message}" 🛠️\n\nI searched our inventory across our 11 retail categories and discovered **${found.length} exact matches** for your project request, including **${found[0].name} (\`₹${found[0].price}\`)**.\n\nI have pre-populated these items into your **left workspace**. You can adjust quantities, view compatibility details, or click **[Replace]** to check out alternative models!`;
      } else {
        replyText = `### Product Inquiry: "${req.message}" 🛋️\n\nI searched our live retail inventory for **"${req.message}"**. Currently, our catalog specializes in 11 core DIY and Home Improvement categories (Gardening, Power Tools, Hardware, Smart Storage, Kitchen, Bathroom, & Electrical), so we don't currently carry exact items matching "${req.message}".\n\nHowever, our AI Advisor is ready to help you plan custom room upgrades, solve household repair problems, or discover complementary organization & tool items! What kind of space or project are you setting up?`;
      }

      replyText += `\n\n#### Popular Starter Project Scenarios:\n- **"Help me set up a balcony garden under ₹8,000"**\n- **"I'm moving into a new apartment. Build me an essentials list under ₹15,000"**\n- **"I don't know what this product is called (cable organizer)"**\n- Or upload a photo of a broken hinge or household problem!`;

      suggestedActions = [
        "Set up a balcony garden under ₹8,000",
        "Build apartment essentials list under ₹15,000",
        "Upload broken item photo for analysis",
        "Find cable organizer box"
      ];
    }

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "assistant",
      content: replyText,
      timestamp: new Date().toISOString(),
      toolActivity: toolActivities
    };

    return {
      message: newMsg,
      projectState: state,
      suggestedActions,
      toolActivity: toolActivities
    };
  }
}

export const agentOrchestrator = new AgentOrchestrator();
