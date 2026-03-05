"use strict";

const STORAGE_KEY = "ai-news-assistant-settings-v2";
const GENERATION_LIMIT = 30;
const RECENT_HOURS = 48;
const MODEL_CANDIDATE_LIMIT = 200;
const LEFT_MIN_ITEMS = 100;
const SOURCE_FETCH_ATTEMPTS = 4;

const CHINESE_SOURCES = [
  { name: "IT之家 RSS", url: "https://www.ithome.com/rss/", weight: 1.22 },
  { name: "IT之家 智能时代", url: "https://rsshub.app/ithome/next", weight: 1.18 },
  { name: "IT之家 AI 标签", url: "https://rsshub.app/ithome/tag/ai", weight: 1.22 },
  { name: "36Kr 快讯", url: "https://rsshub.app/36kr/newsflashes", weight: 1.08 },
  { name: "MIT 科技评论中文", url: "https://rsshub.app/mittrchina/index", weight: 1.02 }
];

const DEFAULT_SOURCES = [
  { name: "OpenAI News", url: "https://openai.com/news/rss.xml", weight: 1.35 },
  { name: "Google AI Blog", url: "https://blog.google/technology/ai/rss/", weight: 1.28 },
  { name: "Microsoft AI Blog", url: "https://blogs.microsoft.com/ai/feed/", weight: 1.2 },
  { name: "Anthropic News", url: "https://www.anthropic.com/news/rss.xml", weight: 1.25 },
  { name: "NVIDIA Blog", url: "https://blogs.nvidia.com/feed/", weight: 1.15 },
  { name: "AWS ML Blog", url: "https://aws.amazon.com/blogs/machine-learning/feed/", weight: 1.1 },
  { name: "Hugging Face Blog", url: "https://huggingface.co/blog/feed.xml", weight: 1.2 },
  { name: "DeepMind Blog", url: "https://deepmind.google/blog/rss.xml", weight: 1.25 },
  { name: "TechCrunch AI", url: "https://techcrunch.com/category/artificial-intelligence/feed/", weight: 1.0 },
  { name: "VentureBeat AI", url: "https://venturebeat.com/category/ai/feed/", weight: 1.0 },
  { name: "The Verge AI", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", weight: 0.95 },
  { name: "MIT Tech Review AI", url: "https://www.technologyreview.com/topic/artificial-intelligence/feed/", weight: 0.95 }
].concat(CHINESE_SOURCES);

const EMERGENCY_SOURCES = [
  {
    name: "Google News AI (EN)",
    url: "https://news.google.com/rss/search?q=(AI+model+launch+OR+AI+product+release+OR+AI+algorithm+update)+when:2d&hl=en-US&gl=US&ceid=US:en",
    weight: 0.96
  },
  {
    name: "Google News AI (ZH)",
    url: "https://news.google.com/rss/search?q=(人工智能+发布+OR+大模型+更新+OR+AI+新技术)+when:2d&hl=zh-CN&gl=CN&ceid=CN:zh-Hans",
    weight: 1.02
  },
  {
    name: "Google News GenAI",
    url: "https://news.google.com/rss/search?q=(generative+AI+model+release+OR+multimodal+AI+update)+when:2d&hl=en-US&gl=US&ceid=US:en",
    weight: 0.94
  },
  { name: "ArXiv cs.AI", url: "https://export.arxiv.org/rss/cs.AI", weight: 0.8 },
  { name: "ArXiv cs.LG", url: "https://export.arxiv.org/rss/cs.LG", weight: 0.78 }
];

const DEFAULT_SETTINGS = {
  model: "rules-local",
  recentOnly: true,
  includeKeywords: "",
  excludeKeywords: "扫地机器人,合作伙伴招募",
  promptTemplate: "聚焦AI新产品、技术突破和模型/算法重大更新，避免泛合作与教育辅助应用。",
  sources: DEFAULT_SOURCES,
  modelRuntime: {
    mode: "rules_only",
    provider: "openai_compatible",
    baseUrl: "",
    apiKey: "",
    modelName: ""
  }
};

const AI_TERMS = [
  "ai", "artificial intelligence", "machine learning", "deep learning", "large language model", "llm",
  "foundation model", "transformer", "multimodal", "reasoning model", "agent", "inference",
  "人工智能", "大模型", "模型", "算法", "多模态", "智能体", "推理", "生成式", "神经网络"
];

const PRODUCT_TERMS = [
  "launch", "launched", "release", "released", "unveil", "unveiled", "introduce", "introduced",
  "debut", "ship", "ships", "now available", "rollout", "roll out", "new product", "new model",
  "new feature", "open source", "open-sourced", "发布", "推出", "上线", "开源", "首发", "发布了", "推出了"
];

const BREAKTHROUGH_TERMS = [
  "breakthrough", "state-of-the-art", "sota", "novel architecture", "new architecture", "new algorithm",
  "benchmark", "latency", "throughput", "reasoning", "context window", "compression", "mixture-of-experts",
  "quantization", "agentic", "突破", "新架构", "新算法", "性能提升", "精度提升", "推理加速", "长上下文", "实时生成"
];

const UPDATE_TERMS = [
  "update", "updated", "upgrade", "major update", "improved", "improvement", "new version", "v2", "v3",
  "feature update", "api update", "迭代", "重大更新", "升级", "更新", "版本更新", "功能更新", "api升级"
];

const NOVELTY_TERMS = [
  "first", "world first", "new record", "record", "real-time", "open weights", "agentic workflow",
  "video generation", "coding model", "math benchmark", "on-device", "long-context", "成本降低",
  "首个", "首次", "里程碑", "重大进展", "显著降低", "显著提升", "突破性"
];

const PARTNERSHIP_TERMS = [
  "partnership", "partner", "strategic cooperation", "mou", "memorandum", "alliance", "合作", "战略合作", "联合宣布"
];

const EXCLUDE_TERMS = [
  "robot vacuum", "vacuum cleaner", "robovac", "扫地机器人", "清洁机器人",
  "partner recruitment", "channel recruitment", "合作伙伴招募", "渠道招募",
  "exam prep", "test prep", "education assistant", "ai押题", "押题卷", "作业辅导",
  "industry trend report", "年度趋势报告", "宏观趋势解读"
];

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "to", "of", "for", "in", "on", "with", "by", "from",
  "ai", "new", "model", "models", "launches", "launch", "released", "release", "introduces",
  "announces", "update", "updated", "breaking", "news", "blog", "today", "this", "that"
]);

const COMPANY_PATTERNS = [
  { name: "OpenAI", regex: /\bopenai\b|chatgpt|gpt-?\d|o\d/i },
  { name: "Google", regex: /\bgoogle\b|gemini|deepmind/i },
  { name: "Anthropic", regex: /\banthropic\b|claude/i },
  { name: "Microsoft", regex: /\bmicrosoft\b|copilot/i },
  { name: "Meta", regex: /\bmeta\b|llama\s?\d|ai\.meta/i },
  { name: "NVIDIA", regex: /\bnvidia\b|cuda|tensorrt/i },
  { name: "Amazon", regex: /\bamazon\b|aws|bedrock/i },
  { name: "Apple", regex: /\bapple\b|apple intelligence/i },
  { name: "xAI", regex: /\bxai\b|grok/i },
  { name: "Mistral", regex: /\bmistral\b/i },
  { name: "Hugging Face", regex: /\bhugging face\b/i },
  { name: "百度", regex: /百度|文心/i },
  { name: "阿里", regex: /阿里|通义千问|qwen/i },
  { name: "腾讯", regex: /腾讯|混元/i },
  { name: "字节", regex: /字节|豆包/i }
];

const state = {
  settings: loadSettings(),
  rawItems: [],
  generations: [],
  activeGenerationId: "",
  dragId: "",
  selectedRawIds: new Set()
};

const elements = {
  modelSelect: document.getElementById("modelSelect"),
  settingsBtn: document.getElementById("settingsBtn"),
  generateBtn: document.getElementById("generateBtn"),
  statusLine: document.getElementById("statusLine"),
  sourceHint: document.getElementById("sourceHint"),
  recentOnlyToggle: document.getElementById("recentOnlyToggle"),
  rawNewsList: document.getElementById("rawNewsList"),
  rawEmptyState: document.getElementById("rawEmptyState"),
  pickSelectedBtn: document.getElementById("pickSelectedBtn"),
  quickPickBtn: document.getElementById("quickPickBtn"),
  selectedNewsList: document.getElementById("selectedNewsList"),
  selectedEmptyState: document.getElementById("selectedEmptyState"),
  generationSelect: document.getElementById("generationSelect"),
  saveBtn: document.getElementById("saveBtn"),
  copyBtn: document.getElementById("copyBtn"),
  settingsDialog: document.getElementById("settingsDialog"),
  settingsForm: document.getElementById("settingsForm"),
  sourcesInput: document.getElementById("sourcesInput"),
  includeKeywordsInput: document.getElementById("includeKeywordsInput"),
  excludeKeywordsInput: document.getElementById("excludeKeywordsInput"),
  promptTemplateInput: document.getElementById("promptTemplateInput"),
  modelModeSelect: document.getElementById("modelModeSelect"),
  providerSelect: document.getElementById("providerSelect"),
  llmBaseUrlInput: document.getElementById("llmBaseUrlInput"),
  llmApiKeyInput: document.getElementById("llmApiKeyInput"),
  llmModelNameInput: document.getElementById("llmModelNameInput"),
  modelConfigHint: document.getElementById("modelConfigHint"),
  resetSettingsBtn: document.getElementById("resetSettingsBtn"),
  cancelSettingsBtn: document.getElementById("cancelSettingsBtn"),
  saveSettingsBtn: document.getElementById("saveSettingsBtn")
};

init();

function init() {
  ensureChineseSourceCoverage();
  syncSettingsToUI();
  bindEvents();
  renderSourceHint();
  refreshModelHint();
  setStatus("就绪。点击“生成最新新闻”开始抓取并筛选。");
}

function bindEvents() {
  elements.settingsBtn.addEventListener("click", openSettingsDialog);
  elements.generateBtn.addEventListener("click", generateNews);
  elements.pickSelectedBtn.addEventListener("click", pickSelectedRawToRight);
  elements.quickPickBtn.addEventListener("click", quickPickTopFromLeft);
  elements.copyBtn.addEventListener("click", copyCurrentGeneration);
  elements.saveBtn.addEventListener("click", saveCurrentGeneration);
  elements.modelSelect.addEventListener("change", onModelSelectChange);
  elements.recentOnlyToggle.addEventListener("change", onRecentToggleChange);
  elements.generationSelect.addEventListener("change", onGenerationSelectChange);
  elements.resetSettingsBtn.addEventListener("click", onResetSettings);
  elements.cancelSettingsBtn.addEventListener("click", () => elements.settingsDialog.close("cancel"));
  elements.settingsForm.addEventListener("submit", onSaveSettings);
  elements.modelModeSelect.addEventListener("change", onModelConfigChange);
  elements.providerSelect.addEventListener("change", onModelConfigChange);
}

function syncSettingsToUI() {
  ensureModelSelectOption(state.settings.modelRuntime.modelName);
  if (state.settings.model) {
    elements.modelSelect.value = state.settings.model;
  }
  elements.recentOnlyToggle.checked = !!state.settings.recentOnly;
}

function onModelSelectChange() {
  const value = elements.modelSelect.value;
  state.settings.model = value;
  if (value !== "rules-local") {
    state.settings.modelRuntime.modelName = value;
  }
  persistSettings();
}

function onRecentToggleChange() {
  state.settings.recentOnly = elements.recentOnlyToggle.checked;
  persistSettings();
  if (state.rawItems.length > 0) {
    renderRawNews(applyTimeFilterWithMinimum(state.rawItems, state.settings.recentOnly, LEFT_MIN_ITEMS));
  }
}

function onGenerationSelectChange() {
  state.activeGenerationId = elements.generationSelect.value;
  renderSelectedNews();
}

function onModelConfigChange() {
  refreshModelHint();
}

function openSettingsDialog() {
  const runtime = state.settings.modelRuntime;
  elements.sourcesInput.value = serializeSources(state.settings.sources);
  elements.includeKeywordsInput.value = state.settings.includeKeywords || "";
  elements.excludeKeywordsInput.value = state.settings.excludeKeywords || "";
  elements.promptTemplateInput.value = state.settings.promptTemplate || "";
  elements.modelModeSelect.value = runtime.mode;
  elements.providerSelect.value = runtime.provider;
  elements.llmBaseUrlInput.value = runtime.baseUrl;
  elements.llmApiKeyInput.value = runtime.apiKey;
  elements.llmModelNameInput.value = runtime.modelName;
  refreshModelHint();
  elements.settingsDialog.showModal();
}

function onResetSettings() {
  state.settings = cloneSettings(DEFAULT_SETTINGS);
  persistSettings();
  syncSettingsToUI();
  renderSourceHint();
  refreshModelHint();
  elements.sourcesInput.value = serializeSources(state.settings.sources);
  elements.includeKeywordsInput.value = state.settings.includeKeywords;
  elements.excludeKeywordsInput.value = state.settings.excludeKeywords;
  elements.promptTemplateInput.value = state.settings.promptTemplate;
  elements.modelModeSelect.value = state.settings.modelRuntime.mode;
  elements.providerSelect.value = state.settings.modelRuntime.provider;
  elements.llmBaseUrlInput.value = state.settings.modelRuntime.baseUrl;
  elements.llmApiKeyInput.value = state.settings.modelRuntime.apiKey;
  elements.llmModelNameInput.value = state.settings.modelRuntime.modelName;
  setStatus("已恢复默认设置。");
}

function onSaveSettings(event) {
  event.preventDefault();

  const parsedSources = parseSources(elements.sourcesInput.value);
  if (parsedSources.length === 0) {
    setStatus("保存失败：至少保留 1 个有效信源。");
    return;
  }

  const runtime = {
    mode: elements.modelModeSelect.value,
    provider: elements.providerSelect.value,
    baseUrl: elements.llmBaseUrlInput.value.trim(),
    apiKey: elements.llmApiKeyInput.value.trim(),
    modelName: elements.llmModelNameInput.value.trim()
  };

  state.settings.sources = mergeMissingSources(parsedSources, CHINESE_SOURCES);
  state.settings.includeKeywords = elements.includeKeywordsInput.value.trim();
  state.settings.excludeKeywords = elements.excludeKeywordsInput.value.trim();
  state.settings.promptTemplate = elements.promptTemplateInput.value.trim();
  state.settings.modelRuntime = runtime;

  if (runtime.modelName) {
    ensureModelSelectOption(runtime.modelName);
    elements.modelSelect.value = runtime.modelName;
    state.settings.model = runtime.modelName;
  }

  persistSettings();
  renderSourceHint();
  refreshModelHint();
  elements.settingsDialog.close("save");
  setStatus("设置已保存。");
}

function refreshModelHint() {
  const mode = elements.modelModeSelect.value || state.settings.modelRuntime.mode;
  const provider = elements.providerSelect.value || state.settings.modelRuntime.provider;
  if (!elements.modelConfigHint) {
    return;
  }
  if (mode === "rules_only") {
    elements.modelConfigHint.textContent = "当前模式不依赖模型，直接用信源抓取 + 本地规则筛选，最稳定。";
    return;
  }
  if (mode === "llm_assist") {
    elements.modelConfigHint.textContent = "需要支持 Chat Completions 的模型接口（OpenAI 兼容）。模型用于二次筛选与总结，新闻抓取仍来自已配置的信源。";
    return;
  }
  if (provider === "dashscope") {
    elements.modelConfigHint.textContent = "联网搜索模式建议使用支持联网能力的 Qwen 模型（DashScope 兼容接口），并确保账号已开通搜索能力。";
  } else {
    elements.modelConfigHint.textContent = "联网搜索模式需要平台支持 Web Search Tool（例如 OpenAI Responses 的 web_search）。普通聊天模型本身不等于可联网搜索。";
  }
}

async function generateNews() {
  const sources = state.settings.sources || [];
  if (sources.length === 0) {
    setStatus("没有可用信源，请先在“提示词设置”中配置。");
    return;
  }

  toggleBusy(true);
  try {
    setStatus(`正在抓取 ${sources.length} 个信源...`);
    const settled = await Promise.allSettled(sources.map((source) => fetchSourceItems(source)));
    const errors = [];
    const allItems = [];
    const failedSources = [];

    settled.forEach((entry, idx) => {
      if (entry.status === "fulfilled") {
        allItems.push(...entry.value);
      } else {
        failedSources.push(sources[idx]);
      }
    });

    if (failedSources.length > 0) {
      setStatus(`首次抓取失败 ${failedSources.length} 个信源，正在自动重试...`);
      const retrySettled = await Promise.allSettled(failedSources.map((source) => fetchSourceItems(source)));
      retrySettled.forEach((entry, idx) => {
        if (entry.status === "fulfilled") {
          allItems.push(...entry.value);
          return;
        }
        errors.push(`${failedSources[idx].name}：${entry.reason.message || "重试仍失败"}`);
      });
    }

    let normalizedItems = dedupeRawItems(allItems).sort(sortByDateDesc);
    let candidatePool = applyTimeFilter(normalizedItems, state.settings.recentOnly);
    if (candidatePool.length < LEFT_MIN_ITEMS) {
      setStatus(`48小时内候选仅 ${candidatePool.length} 条，正在启用兜底信源补抓...`);
      const emergency = await fetchEmergencySourceItems(sources);
      if (emergency.items.length > 0) {
        allItems.push(...emergency.items);
        normalizedItems = dedupeRawItems(allItems).sort(sortByDateDesc);
        candidatePool = applyTimeFilter(normalizedItems, state.settings.recentOnly);
      }
      if (emergency.errors.length > 0) {
        errors.push(...emergency.errors);
      }
    }

    const leftQualified = pickQualifiedNewsForLeft(candidatePool, state.settings, LEFT_MIN_ITEMS);
    const leftItems = backfillLeftItems(
      leftQualified.items,
      candidatePool,
      LEFT_MIN_ITEMS,
      state.settings.recentOnly
    );
    setStatus(`已抓取 ${normalizedItems.length} 条，48小时内候选 ${leftItems.length} 条，正在翻译左侧新闻为中文...`);
    const localizedItems = await ensureChineseForRawItems(leftItems, state.settings.modelRuntime);
    state.rawItems = localizedItems;
    state.selectedRawIds.clear();
    const timeFiltered = applyTimeFilterWithMinimum(localizedItems, state.settings.recentOnly, LEFT_MIN_ITEMS);
    renderRawNews(timeFiltered);

    setStatus(`候选 ${timeFiltered.length} 条，正在严格筛选与去重...`);
    const selected = pickFinalNews(timeFiltered, state.settings);
    let finalItems = selected.map((item) => ({ ...item, finalText: buildSummary(item) }));

    const runtime = state.settings.modelRuntime;
    if (runtime.mode !== "rules_only") {
      const validation = validateRuntime(runtime);
      if (!validation.ok) {
        setStatus(`已生成规则版 ${finalItems.length} 条；模型模式未生效：${validation.message}`);
      } else {
        setStatus("正在调用模型进行二次筛选...");
        try {
          const modelItems = await runModelPipeline(finalItems, timeFiltered, state.settings);
          if (modelItems.length > 0) {
            finalItems = modelItems;
            setStatus(`模型处理完成：输出 ${finalItems.length} 条。`);
          }
        } catch (error) {
          setStatus(`模型调用失败，已回退规则结果：${error.message || "未知错误"}`);
        }
      }
    }

    setStatus("正在将结果自动翻译为中文...");
    finalItems = await ensureChineseForItems(finalItems, runtime);

    pushGeneration(finalItems.slice(0, GENERATION_LIMIT));
    renderSelectedNews();
    renderGenerationSelect();

    if (runtime.mode === "rules_only") {
      const errorText = errors.length > 0 ? `；${errors.length} 个信源失败` : "";
      setStatus(`生成完成：${finalItems.length} 条精选${errorText}。`);
    }
  } finally {
    toggleBusy(false);
  }
}

function getCurrentLeftItems() {
  return applyTimeFilterWithMinimum(state.rawItems, state.settings.recentOnly, LEFT_MIN_ITEMS);
}

async function quickPickTopFromLeft() {
  const leftItems = getCurrentLeftItems();
  if (leftItems.length === 0) {
    setStatus("左侧没有可筛选新闻，请先点击“生成最新新闻”。");
    return;
  }

  toggleBusy(true);
  try {
    setStatus(`正在从左侧列表筛选优质${GENERATION_LIMIT}条...`);
    const picked = pickFinalNews(leftItems, state.settings).slice(0, GENERATION_LIMIT);
    let items = picked.map((item) => ({
      ...item,
      finalText: buildSummary(item)
    }));
    items = await ensureChineseForItems(items, state.settings.modelRuntime);
    pushGeneration(items);
    renderSelectedNews();
    renderGenerationSelect();
    setStatus(`已从左侧筛选 ${items.length} 条进入右侧。`);
  } finally {
    toggleBusy(false);
  }
}

async function pickSelectedRawToRight() {
  const leftItems = getCurrentLeftItems();
  if (leftItems.length === 0) {
    setStatus("左侧没有新闻可选择，请先点击“生成最新新闻”。");
    return;
  }

  const selected = leftItems.filter((item) => state.selectedRawIds.has(item.id));
  if (selected.length === 0) {
    setStatus("请先勾选左侧新闻，再点击“勾选加入精选”。");
    return;
  }

  toggleBusy(true);
  try {
    const merged = dedupeRawItems(selected)
      .map((item) => {
        const reviewed = reviewRelevance(item, state.settings, true);
        return {
          ...item,
          categories: reviewed.categories && reviewed.categories.length > 0 ? reviewed.categories : ["手动精选"],
          totalScore: reviewed.totalScore || 6
        };
      })
      .sort(sortByScoreDesc)
      .slice(0, GENERATION_LIMIT)
      .map((item) => ({
        ...item,
        finalText: buildSummary(item)
      }));

    const translated = await ensureChineseForItems(merged, state.settings.modelRuntime);
    pushGeneration(translated);
    renderSelectedNews();
    renderGenerationSelect();
    setStatus(`已将勾选的 ${translated.length} 条新闻加入右侧精选。`);
  } finally {
    toggleBusy(false);
  }
}

function validateRuntime(runtime) {
  if (!runtime.baseUrl) {
    return { ok: false, message: "未配置 Base URL" };
  }
  if (!runtime.apiKey) {
    return { ok: false, message: "未配置 API Key" };
  }
  if (!runtime.modelName) {
    return { ok: false, message: "未配置 Model ID" };
  }
  return { ok: true };
}

async function runModelPipeline(localItems, candidateItems, settings) {
  const runtime = settings.modelRuntime;
  if (runtime.mode === "llm_web_search") {
    const external = await runModelWebSearch(runtime, settings);
    if (external.length > 0) {
      return mergeExternalWithLocal(external, localItems);
    }
  }
  return runModelAssist(localItems, candidateItems, runtime, settings);
}

async function runModelAssist(localItems, candidateItems, runtime, settings) {
  const candidates = candidateItems.slice(0, MODEL_CANDIDATE_LIMIT).map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    source: item.sourceName,
    published_at: formatDate(item.publishedAt),
    company: item.company || "",
    link: item.link || ""
  }));

  const messages = [
    {
      role: "system",
      content: "你是AI新闻编辑。只允许输出JSON，不要输出任何解释。严格筛选AI新产品、AI技术突破、模型/算法重大更新；排除扫地机器人、合作伙伴招募、泛合作稿。"
    },
    {
      role: "user",
      content: [
        `请从候选中选出最多${GENERATION_LIMIT}条，去重并保持公司多样性。`,
        "输出格式必须是：",
        "{\"items\":[{\"id\":\"候选ID\",\"summary\":\"一句话中文总结，含产品/技术名与关键变化\"}]}",
        "候选列表JSON：",
        JSON.stringify(candidates),
        "附加偏好：",
        settings.promptTemplate || "无",
        "额外优先关键词：",
        settings.includeKeywords || "无",
        "额外排除关键词：",
        settings.excludeKeywords || "无"
      ].join("\n")
    }
  ];

  const text = await requestModelText(runtime, messages, runtime.mode === "llm_web_search");
  const parsed = parseJsonFromText(text);
  const outputItems = parsed && Array.isArray(parsed.items) ? parsed.items : [];
  if (outputItems.length === 0) {
    return localItems;
  }

  const byId = new Map(localItems.map((item) => [item.id, item]));
  const chosen = [];
  outputItems.forEach((entry) => {
    const id = typeof entry.id === "string" ? entry.id : "";
    const summary = typeof entry.summary === "string" ? formatFinalSummaryLine(entry.summary) : "";
    if (!id || !byId.has(id)) {
      return;
    }
    const base = byId.get(id);
    if (chosen.some((item) => item.id === id)) {
      return;
    }
    chosen.push({
      ...base,
      finalText: summary || base.finalText || buildSummary(base)
    });
  });

  if (chosen.length < GENERATION_LIMIT) {
    localItems.forEach((item) => {
      if (chosen.length >= GENERATION_LIMIT) {
        return;
      }
      if (!chosen.some((picked) => picked.id === item.id)) {
        chosen.push(item);
      }
    });
  }
  return chosen.slice(0, GENERATION_LIMIT);
}

async function runModelWebSearch(runtime, settings) {
  const messages = [
    {
      role: "system",
      content: "你是AI新闻情报助手。请检索并筛选最近48小时内与AI新产品、AI技术突破、模型/算法重大更新直接相关的新闻。只输出JSON。"
    },
    {
      role: "user",
      content: [
        `请输出最多${GENERATION_LIMIT}条，去重并保持公司多样性。`,
        "排除：扫地机器人、合作伙伴招募、泛合作公告、教育辅助应用、宽泛趋势稿。",
        "输出格式：",
        "{\"items\":[{\"summary\":\"一句话中文总结\",\"source\":\"媒体/机构\",\"link\":\"https://...\",\"published_at\":\"YYYY-MM-DD HH:mm\"}]}",
        "附加偏好：",
        settings.promptTemplate || "无"
      ].join("\n")
    }
  ];

  const text = await requestModelText(runtime, messages, true);
  const parsed = parseJsonFromText(text);
  if (!parsed || !Array.isArray(parsed.items)) {
    return [];
  }
  return parsed.items
    .map((entry) => ({
      summary: formatFinalSummaryLine(entry.summary || ""),
      source: cleanText(entry.source || "模型搜索"),
      link: normalizeUrl(entry.link || ""),
      publishedAt: parseDate(entry.published_at || "")
    }))
    .filter((entry) => entry.summary.length >= 12)
    .slice(0, GENERATION_LIMIT);
}

function mergeExternalWithLocal(externalItems, localItems) {
  const output = externalItems.map((entry, idx) => ({
    id: `model_${Date.now()}_${idx}`,
    sourceName: entry.source || "模型搜索",
    sourceWeight: 1,
    link: entry.link || "",
    canonicalLink: canonicalizeUrl(entry.link || ""),
    title: formatFinalSummaryLine(entry.summary || "").slice(0, 60),
    summary: formatFinalSummaryLine(entry.summary || ""),
    publishedAt: entry.publishedAt || Date.now(),
    company: detectCompany(formatFinalSummaryLine(entry.summary || "")),
    categories: ["AI新产品/技术动态"],
    finalText: formatFinalSummaryLine(entry.summary || "")
  }));

  if (output.length >= GENERATION_LIMIT) {
    return output.slice(0, GENERATION_LIMIT);
  }

  localItems.forEach((item) => {
    if (output.length >= GENERATION_LIMIT) {
      return;
    }
    if (output.some((entry) => isNearDuplicateText(entry.finalText, item.finalText || buildSummary(item)))) {
      return;
    }
    output.push(item);
  });
  return output.slice(0, GENERATION_LIMIT);
}

function isNearDuplicateText(a, b) {
  return jaccardSimilarity(tokenize(a), tokenize(b)) >= 0.72;
}

async function requestModelText(runtime, messages, useWebSearch) {
  const baseUrl = normalizeBaseUrl(runtime.baseUrl);
  if (runtime.provider === "openai_compatible" && useWebSearch) {
    try {
      return await requestResponsesWebSearch(baseUrl, runtime, messages);
    } catch (error) {
      return requestChatCompletions(baseUrl, runtime, messages, false);
    }
  }
  return requestChatCompletions(baseUrl, runtime, messages, useWebSearch && runtime.provider === "dashscope");
}

async function ensureChineseForItems(items, runtime) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const translated = await Promise.all(items.map(async (item) => {
    const origin = cleanOutputLine(item.finalText || buildSummary(item));
    const zh = await ensureChineseText(origin, runtime);
    return {
      ...item,
      finalText: formatFinalSummaryLine(zh || origin)
    };
  }));
  return translated;
}

async function ensureChineseForRawItems(items, runtime) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const batchSize = 6;
  const output = [];
  for (let idx = 0; idx < items.length; idx += batchSize) {
    const batch = items.slice(idx, idx + batchSize);
    const translatedBatch = await Promise.all(batch.map(async (item) => {
      const originalTitle = cleanText(item.title || "");
      if (!originalTitle) {
        return item;
      }
      const titleZh = await ensureChineseText(originalTitle, runtime);
      const normalizedTitle = cleanText((titleZh || originalTitle).replace(/[。！？]+$/g, ""));
      return {
        ...item,
        titleZh: normalizedTitle || originalTitle
      };
    }));
    output.push(...translatedBatch);
  }
  return output;
}

async function ensureChineseText(text, runtime) {
  const clean = cleanOutputLine(text);
  if (!clean) {
    return "";
  }
  if (isMostlyChinese(clean)) {
    return normalizeChineseSentence(clean);
  }

  const fromModel = await translateWithConfiguredModel(clean, runtime);
  if (fromModel && isMostlyChinese(fromModel)) {
    return normalizeChineseSentence(fromModel);
  }

  const fromFreeApi = await translateWithFreeApi(clean);
  if (fromFreeApi) {
    return normalizeChineseSentence(fromFreeApi);
  }
  return normalizeChineseSentence(clean);
}

async function translateWithConfiguredModel(text, runtime) {
  const validation = validateRuntime(runtime || {});
  if (!validation.ok) {
    return "";
  }

  try {
    const baseUrl = normalizeBaseUrl(runtime.baseUrl);
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${runtime.apiKey}`
      },
      body: JSON.stringify({
        model: runtime.modelName,
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content: "你是专业翻译助手。请将用户文本翻译成自然简洁的中文，只返回翻译结果。"
          },
          {
            role: "user",
            content: text
          }
        ]
      })
    });

    if (!response.ok) {
      return "";
    }
    const data = await response.json();
    const content = data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : "";
    if (typeof content === "string") {
      return cleanOutputLine(content);
    }
    if (Array.isArray(content)) {
      return cleanOutputLine(content.map((part) => (part && part.text ? part.text : "")).join(""));
    }
  } catch (error) {
    return "";
  }
  return "";
}

async function translateWithFreeApi(text) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (!response.ok) {
      return "";
    }
    const data = await response.json();
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
      return "";
    }
    const result = data[0]
      .map((part) => (Array.isArray(part) && typeof part[0] === "string" ? part[0] : ""))
      .join("")
      .trim();
    return result;
  } catch (error) {
    return "";
  }
}

function isMostlyChinese(text) {
  const zhCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const letterCount = (text.match(/[A-Za-z]/g) || []).length;
  if (zhCount >= 8 && zhCount >= letterCount) {
    return true;
  }
  return zhCount > 0 && zhCount / Math.max(1, text.length) > 0.25;
}

function normalizeChineseSentence(text) {
  let line = cleanOutputLine(text)
    .replace(/^[`"'“”]+|[`"'“”]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!line) {
    return "";
  }
  if (!/[。！？]$/.test(line)) {
    line += "。";
  }
  return line;
}

function formatFinalSummaryLine(text) {
  const raw = stripNewsLeadNormalized(cleanOutputLine(text || ""))
    .replace(/^[\d\s.\u3001-]+/, "")
    .replace(/[\u201C\u201D"'`]/g, "")
    .replace(/\s*[,;\uFF0C\uFF1B]\s*/g, "\uFF0C")
    .replace(/[ ]{2,}/g, " ")
    .trim();

  if (!raw) {
    return "";
  }

  const clauses = splitSummaryClauses(raw)
    .map((part) => stripNewsLeadNormalized(part))
    .map((part) => part.replace(/^[\d\s.\u3001-]+/, "").replace(/\.{3,}|…+/g, "").trim())
    .filter((part) => part.length >= 6)
    .filter((part) => !isBoilerplateClause(part));

  const selected = [];
  clauses.forEach((part) => {
    if (selected.some((saved) => saved.includes(part) || part.includes(saved) || isNearDuplicateText(saved, part))) {
      return;
    }
    selected.push(part);
  });

  let line = selected.slice(0, 3).join("\uFF0C");
  if (!line) {
    line = raw.replace(/\.{3,}|…+/g, "").trim();
  }

  line = stripNewsLeadNormalized(line)
    .replace(/[\uFF0C\u3002\uFF01\uFF1F]{2,}/g, "\u3002")
    .replace(/[，,\s]+$/g, "")
    .replace(/[\u3002\uFF01\uFF1F]\s*$/g, "")
    .trim();

  if (!line) {
    return "";
  }
  if (!/[\u3002\uFF01\uFF1F]$/.test(line)) {
    line += "\u3002";
  }
  return line;
}

function splitSummaryClauses(text) {
  return cleanOutputLine(text || "")
    .split(/[。！？!?；;\n，,]/)
    .map((part) => part.replace(/^[\d\s.\u3001-]+/, "").trim())
    .filter(Boolean);
}

function isBoilerplateClause(text) {
  const clause = cleanOutputLine(text || "").trim();
  if (!clause) {
    return true;
  }
  if (/\.{3,}|…+/.test(clause)) {
    return true;
  }
  const patterns = [
    /read more|continue reading|点击|查看全文|原文|转载|本文|相关阅读/i,
    /^(今日|近日|日前|目前)\s*[^，。；]{0,24}(发文|表示|称|宣布|介绍)/i,
    /^据[^，。；]{0,18}(消息|报道|报导|介绍)/i,
    /(官方微博|官方公众号|发文介绍|发文表示|发文称)/i,
    /^(消息人士|业内人士|有媒体)/i
  ];
  return patterns.some((regex) => regex.test(clause));
}

function scoreDetailClause(text) {
  const clause = cleanOutputLine(text || "");
  let score = 0;
  if (/推出|发布|上线|升级|更新|开源|首发|支持|新增|集成|实现|突破|提升|降低|刷新|模型|算法|系统|平台|推理|多模态|Agent|GPT|Claude|Qwen|Gemini|Seed|Copilot/i.test(clause)) {
    score += 3;
  }
  if (/(\d+(\.\d+)?\s*(%|亿|万|K|M|B|ms|倍|美元|元|tokens?|参数)|\d{2,})/i.test(clause)) {
    score += 2;
  }
  if (/(准确率|时延|吞吐|上下文|benchmark|性能)/i.test(clause)) {
    score += 1;
  }
  if (/发文|消息|报道|报导/.test(clause)) {
    score -= 2;
  }
  if (clause.length >= 14 && clause.length <= 88) {
    score += 1;
  }
  return score;
}

function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/\/+$/, "");
}

async function requestResponsesWebSearch(baseUrl, runtime, messages) {
  const response = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${runtime.apiKey}`
    },
    body: JSON.stringify({
      model: runtime.modelName,
      input: messages,
      tools: [{ type: "web_search_preview" }],
      temperature: 0.2
    })
  });
  if (!response.ok) {
    throw new Error(`Responses API错误：HTTP ${response.status}`);
  }
  const data = await response.json();
  const text = extractResponsesText(data);
  if (!text) {
    throw new Error("Responses API无可用文本输出");
  }
  return text;
}

function extractResponsesText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }
  if (!Array.isArray(data.output)) {
    return "";
  }
  const chunks = [];
  data.output.forEach((item) => {
    if (!item || !Array.isArray(item.content)) {
      return;
    }
    item.content.forEach((entry) => {
      if (entry && typeof entry.text === "string") {
        chunks.push(entry.text);
      }
    });
  });
  return chunks.join("\n").trim();
}

async function requestChatCompletions(baseUrl, runtime, messages, enableSearch) {
  const payload = {
    model: runtime.modelName,
    messages,
    temperature: 0.2,
    response_format: { type: "json_object" }
  };
  if (enableSearch) {
    payload.enable_search = true;
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${runtime.apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Chat Completions错误：HTTP ${response.status}`);
  }

  const data = await response.json();
  const content = data && data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : "";

  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content.map((part) => (part && part.text ? part.text : "")).join("\n");
  }
  return "";
}

function parseJsonFromText(text) {
  if (!text || typeof text !== "string") {
    return null;
  }
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    // noop
  }

  const fenced = trimmed.match(/```json\s*([\s\S]*?)```/i) || trimmed.match(/```\s*([\s\S]*?)```/);
  if (fenced && fenced[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch (error) {
      // noop
    }
  }

  const firstObj = trimmed.indexOf("{");
  const lastObj = trimmed.lastIndexOf("}");
  if (firstObj >= 0 && lastObj > firstObj) {
    try {
      return JSON.parse(trimmed.slice(firstObj, lastObj + 1));
    } catch (error) {
      // noop
    }
  }

  const firstArr = trimmed.indexOf("[");
  const lastArr = trimmed.lastIndexOf("]");
  if (firstArr >= 0 && lastArr > firstArr) {
    try {
      return { items: JSON.parse(trimmed.slice(firstArr, lastArr + 1)) };
    } catch (error) {
      // noop
    }
  }
  return null;
}

function pushGeneration(items) {
  const id = `gen_${Date.now()}`;
  state.generations.unshift({ id, createdAt: new Date().toISOString(), items });
  state.activeGenerationId = id;
}

function renderGenerationSelect() {
  const value = state.activeGenerationId;
  const options = ['<option value="">当前生成</option>'];
  state.generations.forEach((gen, idx) => {
    const label = `${idx + 1}. ${formatTime(gen.createdAt)} (${gen.items.length}条)`;
    options.push(`<option value="${escapeHtml(gen.id)}">${escapeHtml(label)}</option>`);
  });
  elements.generationSelect.innerHTML = options.join("");
  elements.generationSelect.value = value || "";
}

function getActiveGeneration() {
  if (!state.activeGenerationId) {
    return state.generations[0] || null;
  }
  return state.generations.find((entry) => entry.id === state.activeGenerationId) || null;
}

function renderRawNews(items) {
  if (!items || items.length === 0) {
    elements.rawNewsList.classList.add("hidden");
    elements.rawEmptyState.classList.remove("hidden");
    return;
  }

  elements.rawNewsList.innerHTML = items.map((item) => {
    const displayTitle = cleanText(item.titleZh || item.title || "");
    const titleNode = item.link
      ? `<a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(displayTitle)}</a>`
      : escapeHtml(displayTitle);
    const company = item.company ? `<span class="chip">${escapeHtml(item.company)}</span>` : "";
    const checked = state.selectedRawIds.has(item.id) ? "checked" : "";
    return (
      `<li class="news-item">
        <div class="news-item-top">
          <input class="pick-check" type="checkbox" data-id="${escapeHtml(item.id)}" ${checked}>
          <p class="news-item-title">${titleNode}</p>
        </div>
        <div class="news-item-meta">
          <span class="chip">${escapeHtml(item.sourceName || "未知来源")}</span>
          ${company}
          <span>${escapeHtml(formatDate(item.publishedAt))}</span>
        </div>
      </li>`
    );
  }).join("");

  elements.rawNewsList.classList.remove("hidden");
  elements.rawEmptyState.classList.add("hidden");
  bindRawItemEvents();
}

function bindRawItemEvents() {
  elements.rawNewsList.querySelectorAll(".pick-check").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const id = checkbox.dataset.id;
      if (!id) {
        return;
      }
      if (checkbox.checked) {
        state.selectedRawIds.add(id);
      } else {
        state.selectedRawIds.delete(id);
      }
    });
  });
}

function renderSelectedNews() {
  const active = getActiveGeneration();
  if (!active || active.items.length === 0) {
    elements.selectedNewsList.classList.add("hidden");
    elements.selectedEmptyState.classList.remove("hidden");
    return;
  }

  elements.selectedNewsList.innerHTML = active.items.map((item) => {
    const tags = Array.isArray(item.categories)
      ? item.categories.map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join("")
      : "";
    const sourceName = item.sourceName || "未知来源";
    const sourceInfo = item.link
      ? `<div class="selected-source">信息源：<a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">原文链接</a>（${escapeHtml(sourceName)}）</div>`
      : `<div class="selected-source">信息源：${escapeHtml(sourceName)}</div>`;
    return (
      `<li class="selected-card" draggable="true" data-id="${escapeHtml(item.id)}">
        <button class="drag-handle" type="button" title="拖动排序">☰</button>
        <div>
          <textarea class="summary-input" data-id="${escapeHtml(item.id)}">${escapeHtml(item.finalText || buildSummary(item))}</textarea>
          <div class="selected-meta">
            <span class="chip">${escapeHtml(item.sourceName || "未知来源")}</span>
            <span>${escapeHtml(formatDate(item.publishedAt))}</span>
            ${tags}
          </div>
          ${sourceInfo}
        </div>
      </li>`
    );
  }).join("");

  elements.selectedNewsList.classList.remove("hidden");
  elements.selectedEmptyState.classList.add("hidden");
  bindSelectedItemEvents();
}

function bindSelectedItemEvents() {
  const active = getActiveGeneration();
  if (!active) {
    return;
  }

  const cards = elements.selectedNewsList.querySelectorAll(".selected-card");
  cards.forEach((card, idx) => {
    const dragButton = card.querySelector(".drag-handle");
    let actions = card.querySelector(".card-actions");
    if (dragButton) {
      dragButton.textContent = "☰";
      if (!actions) {
        actions = document.createElement("div");
        actions.className = "card-actions";
        card.insertBefore(actions, card.firstElementChild);
        actions.appendChild(dragButton);
      }
      if (!actions.querySelector(".delete-item-btn")) {
        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "delete-item-btn";
        deleteBtn.title = "删除该条";
        deleteBtn.dataset.id = card.dataset.id || "";
        deleteBtn.textContent = "删除";
        actions.appendChild(deleteBtn);
      }
    }

    const textarea = card.querySelector(".summary-input");
    if (!textarea) {
      return;
    }
    let summaryRow = textarea.closest(".summary-row");
    if (!summaryRow) {
      summaryRow = document.createElement("div");
      summaryRow.className = "summary-row";
      textarea.parentNode.insertBefore(summaryRow, textarea);
      summaryRow.appendChild(textarea);
    }
    let orderNode = summaryRow.querySelector(".summary-order");
    if (!orderNode) {
      orderNode = document.createElement("span");
      orderNode.className = "summary-order";
      summaryRow.insertBefore(orderNode, textarea);
    }
    orderNode.textContent = `${idx + 1}.`;
    autoResizeSummaryInput(textarea);
  });

  elements.selectedNewsList.querySelectorAll(".summary-input").forEach((input) => {
    input.addEventListener("input", () => {
      autoResizeSummaryInput(input);
      const target = active.items.find((item) => item.id === input.dataset.id);
      if (target) {
        target.finalText = cleanOutputLine(input.value);
      }
    });
  });

  elements.selectedNewsList.querySelectorAll(".delete-item-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.id;
      if (!id) {
        return;
      }
      const index = active.items.findIndex((item) => item.id === id);
      if (index < 0) {
        return;
      }
      active.items.splice(index, 1);
      renderSelectedNews();
      setStatus(`已删除 1 条精选，当前剩余 ${active.items.length} 条。`);
    });
  });

  elements.selectedNewsList.querySelectorAll(".selected-card").forEach((card) => {
    card.addEventListener("dragstart", () => {
      state.dragId = card.dataset.id;
      card.classList.add("dragging");
    });
    card.addEventListener("dragover", (event) => {
      event.preventDefault();
      card.classList.add("drop-target");
    });
    card.addEventListener("dragleave", () => {
      card.classList.remove("drop-target");
    });
    card.addEventListener("drop", (event) => {
      event.preventDefault();
      card.classList.remove("drop-target");
      reorderActiveGeneration(state.dragId, card.dataset.id);
    });
    card.addEventListener("dragend", () => {
      state.dragId = "";
      card.classList.remove("dragging");
      card.classList.remove("drop-target");
    });
  });
}

function reorderActiveGeneration(fromId, toId) {
  const active = getActiveGeneration();
  if (!active || !fromId || !toId || fromId === toId) {
    return;
  }
  const fromIndex = active.items.findIndex((item) => item.id === fromId);
  const toIndex = active.items.findIndex((item) => item.id === toId);
  if (fromIndex < 0 || toIndex < 0) {
    return;
  }
  const moved = active.items.splice(fromIndex, 1)[0];
  active.items.splice(toIndex, 0, moved);
  renderSelectedNews();
}

function autoResizeSummaryInput(textarea) {
  if (!textarea) {
    return;
  }
  textarea.style.height = "auto";
  const nextHeight = Math.max(68, textarea.scrollHeight + 2);
  textarea.style.height = `${nextHeight}px`;
}

async function copyCurrentGeneration() {
  const active = getActiveGeneration();
  if (!active || active.items.length === 0) {
    setStatus("当前没有可复制内容。");
    return;
  }
  const text = buildMorningBriefCopyText(active.items, new Date());
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      fallbackCopy(text);
    }
    setStatus(`已复制 ${active.items.length} 条新闻到剪贴板。`);
  } catch (error) {
    fallbackCopy(text);
    setStatus(`已复制 ${active.items.length} 条新闻到剪贴板。`);
  }
}

function buildMorningBriefCopyText(items, date) {
  const today = date || new Date();
  const headline = `AI早报  ${today.getFullYear()}年${pad2(today.getMonth() + 1)}月${pad2(today.getDate())}日`;
  const rows = items.map((item, idx) => `${idx + 1}.${cleanOutputLine(item.finalText || buildSummary(item))}`);
  const blankLine = "\r\n\r\n";
  return `${headline}${blankLine}${rows.join(blankLine)}`;
}

function saveCurrentGeneration() {
  const active = getActiveGeneration();
  if (!active || active.items.length === 0) {
    setStatus("当前没有可保存内容。");
    return;
  }
  const text = active.items.map((item, idx) => `${idx + 1}.${cleanOutputLine(item.finalText || buildSummary(item))}`).join("\n");
  const now = new Date();
  const filename = `ai-news-${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}-${pad2(now.getHours())}${pad2(now.getMinutes())}.txt`;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
  setStatus(`已保存文件：${filename}`);
}

function renderSourceHint() {
  const names = (state.settings.sources || []).map((entry) => entry.name);
  if (names.length === 0) {
    elements.sourceHint.textContent = "当前未配置信源";
    return;
  }
  const preview = names.slice(0, 5).join("、");
  const suffix = names.length > 5 ? ` 等 ${names.length} 个` : ` 共 ${names.length} 个`;
  elements.sourceHint.textContent = `当前信源：${preview}${suffix}`;
}

async function fetchSourceItems(source) {
  let lastError = null;
  const maxAttempts = SOURCE_FETCH_ATTEMPTS;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const xmlText = await fetchFeedText(source.url);
      const parsed = parseFeed(xmlText, source);
      if (parsed.length > 0) {
        return parsed;
      }
      throw new Error("feed returned empty list");
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts - 1) {
        await sleep(650 * (attempt + 1));
      }
    }
  }
  throw lastError || new Error("fetch source failed");
}

async function fetchEmergencySourceItems(existingSources) {
  const existingKeys = new Set(
    (existingSources || [])
      .map((entry) => normalizeSourceUrlKey(entry.url))
      .filter(Boolean)
  );
  const fallbackSources = normalizeSourceArray(EMERGENCY_SOURCES)
    .filter((entry) => {
      const key = normalizeSourceUrlKey(entry.url);
      return key && !existingKeys.has(key);
    });

  if (fallbackSources.length === 0) {
    return { items: [], errors: [] };
  }

  const settled = await Promise.allSettled(fallbackSources.map((source) => fetchSourceItems(source)));
  const items = [];
  const errors = [];
  settled.forEach((entry, idx) => {
    if (entry.status === "fulfilled") {
      items.push(...entry.value);
      return;
    }
    errors.push(`${fallbackSources[idx].name}：${entry.reason && entry.reason.message ? entry.reason.message : "抓取失败"}`);
  });

  return { items, errors };
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function fetchFeedText(url) {
  const hostPath = url.replace(/^https?:\/\//i, "");
  const candidates = [
    url,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://r.jina.ai/http://${hostPath}`,
    `https://r.jina.ai/https://${hostPath}`
  ];

  let lastError = null;
  for (const target of candidates) {
    try {
      const response = await fetchWithTimeout(target, 22000);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const text = await response.text();
      if (looksLikeFeed(text)) {
        return text;
      }
      throw new Error("非有效RSS/Atom内容");
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(lastError ? lastError.message : "抓取失败");
}

function looksLikeFeed(text) {
  return /<rss[\s>]|<feed[\s>]|<rdf:RDF/i.test(text || "");
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AI-News-Assistant/1.0",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, text/plain, */*"
      }
    });
  } finally {
    window.clearTimeout(timer);
  }
}

function parseFeed(xmlText, source) {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("XML解析失败");
  }
  const rssItems = Array.from(doc.querySelectorAll("item")).map((node) => parseRssItem(node, source));
  const atomItems = Array.from(doc.querySelectorAll("entry")).map((node) => parseAtomEntry(node, source));
  return rssItems.concat(atomItems).filter(Boolean);
}

function parseRssItem(node, source) {
  const title = getNodeText(node, "title");
  const linkNode = node.querySelector("link");
  const linkValue = (linkNode && (linkNode.getAttribute("href") || linkNode.textContent)) || getNodeText(node, "guid");
  const link = normalizeUrl(linkValue, source.url);
  const summary = getNodeText(node, "description") || getNodeText(node, "content\\:encoded") || getNodeText(node, "summary");
  const dateText = getNodeText(node, "pubDate") || getNodeText(node, "dc\\:date") || getNodeText(node, "date");
  return buildFeedItem(source, title, link, summary, dateText);
}

function parseAtomEntry(node, source) {
  const title = getNodeText(node, "title");
  const link = normalizeUrl(getAtomLink(node), source.url);
  const summary = getNodeText(node, "summary") || getNodeText(node, "content");
  const dateText = getNodeText(node, "updated") || getNodeText(node, "published");
  return buildFeedItem(source, title, link, summary, dateText);
}

function getAtomLink(entry) {
  const alternate = entry.querySelector("link[rel='alternate']");
  if (alternate && alternate.getAttribute("href")) {
    return alternate.getAttribute("href");
  }
  const link = entry.querySelector("link");
  if (!link) {
    return "";
  }
  return link.getAttribute("href") || link.textContent || "";
}

function getNodeText(root, selector) {
  const node = root.querySelector(selector);
  return node ? node.textContent.trim() : "";
}

function buildFeedItem(source, title, link, summary, dateText) {
  const safeTitle = cleanText(title);
  if (!safeTitle || safeTitle.length < 4) {
    return null;
  }
  const safeSummary = cleanText(stripHtml(summary || ""));
  return {
    id: `raw_${Math.random().toString(36).slice(2, 11)}`,
    sourceName: source.name,
    sourceWeight: Number.isFinite(source.weight) ? source.weight : 1,
    link: link || "",
    canonicalLink: canonicalizeUrl(link || ""),
    title: safeTitle,
    summary: safeSummary,
    publishedAt: parseDate(dateText),
    company: detectCompany(`${safeTitle} ${safeSummary}`)
  };
}

function dedupeRawItems(items) {
  const map = new Map();
  items.forEach((item) => {
    const key = item.canonicalLink || normalizeTitleKey(item.title);
    if (!key) {
      return;
    }
    const prev = map.get(key);
    if (!prev || item.publishedAt > prev.publishedAt) {
      map.set(key, item);
    }
  });
  return Array.from(map.values());
}

function applyTimeFilter(items, enabled) {
  if (!enabled) {
    return items.slice();
  }
  const cutoff = Date.now() - RECENT_HOURS * 3600 * 1000;
  return items.filter((item) => Number.isFinite(item.publishedAt) && item.publishedAt > 0 && item.publishedAt >= cutoff);
}

function applyTimeFilterWithMinimum(items, enabled, minimumCount) {
  const full = items.slice();
  if (!enabled) {
    return full;
  }
  const recent = applyTimeFilter(full, true);
  return recent;
}

function pickQualifiedNewsForLeft(items, settings, minimumCount = LEFT_MIN_ITEMS) {
  const targetCount = Math.max(1, Number(minimumCount) || LEFT_MIN_ITEMS);
  const strictPool = items
    .map((item) => ({ ...item, ...reviewRelevance(item, settings, false) }))
    .filter((item) => item.accept)
    .sort(sortByScoreDesc);
  const strictMerged = dedupeSelected(strictPool);

  const strictIds = new Set(strictMerged.map((item) => item.id));
  const relaxedPool = items
    .filter((item) => !strictIds.has(item.id))
    .map((item) => ({ ...item, ...reviewRelevance(item, settings, true) }))
    .filter((item) => item.accept)
    .sort(sortByScoreDesc);
  const relaxedMerged = dedupeSelected(relaxedPool);

  let combined = dedupeSelected(strictMerged.concat(relaxedMerged).sort(sortByScoreDesc));
  combined = diversifyByCompany(combined, combined.length);

  if (combined.length < targetCount) {
    const existingIds = new Set(combined.map((item) => item.id));
    const fallbackPool = items
      .filter((item) => !existingIds.has(item.id))
      .map((item) => ({ ...item, ...reviewLeftFallback(item, settings) }))
      .filter((item) => item.accept)
      .sort(sortByScoreDesc);
    const fallbackMerged = dedupeSelected(fallbackPool);
    combined = dedupeSelected(combined.concat(fallbackMerged).sort(sortByScoreDesc));
    combined = diversifyByCompany(combined, combined.length);
  }

  if (combined.length < targetCount) {
    const includeTerms = splitKeywords(settings.includeKeywords);
    const excludeTerms = splitKeywords(settings.excludeKeywords);
    const existingKeys = new Set(
      combined
        .map((item) => item.canonicalLink || normalizeTitleKey(item.title))
        .filter(Boolean)
    );
    const basicPool = items
      .filter((item) => {
        const key = item.canonicalLink || normalizeTitleKey(item.title);
        if (!key || existingKeys.has(key)) {
          return false;
        }
        const text = normalizeMatchText(`${item.title} ${item.summary}`);
        if (containsAny(text, EXCLUDE_TERMS.concat(excludeTerms))) {
          return false;
        }
        if (!containsAny(text, AI_TERMS)) {
          return false;
        }
        if (includeTerms.length > 0 && !containsAny(text, includeTerms)) {
          return false;
        }
        existingKeys.add(key);
        return true;
      })
      .map((item) => ({
        ...item,
        accept: true,
        totalScore: (item.sourceWeight || 1) + Math.max(0, 1.5 - (Date.now() - item.publishedAt) / 86400000),
        categories: ["AI动态"]
      }));
    combined = combined.concat(basicPool);
  }

  const mode = strictMerged.length > 0 ? "strict" : (relaxedMerged.length > 0 ? "relaxed" : "fallback");
  return { mode, items: combined };
}

function backfillLeftItems(currentItems, allItems, minimumCount, recentOnly) {
  const targetCount = Math.max(1, Number(minimumCount) || LEFT_MIN_ITEMS);
  if (currentItems.length >= targetCount) {
    return currentItems;
  }

  const cutoff = Date.now() - RECENT_HOURS * 3600 * 1000;
  const sourcePool = (allItems || []).filter((item) => {
    if (!recentOnly) {
      return true;
    }
    return Number.isFinite(item.publishedAt) && item.publishedAt > 0 && item.publishedAt >= cutoff;
  });

  const existingKeys = new Set(
    currentItems
      .map((item) => item.canonicalLink || normalizeTitleKey(item.title))
      .filter(Boolean)
  );
  const filteredSupplement = sourcePool.filter((item) => {
    const key = item.canonicalLink || normalizeTitleKey(item.title);
    if (!key || existingKeys.has(key)) {
      return false;
    }
    const text = normalizeMatchText(`${item.title} ${item.summary}`);
    if (containsAny(text, EXCLUDE_TERMS)) {
      return false;
    }
    if (!containsAny(text, AI_TERMS)) {
      return false;
    }
    existingKeys.add(key);
    return true;
  });

  const supplemented = currentItems.concat(filteredSupplement);
  if (supplemented.length >= targetCount) {
    return supplemented;
  }

  const broadSupplement = sourcePool.filter((item) => {
    const key = item.canonicalLink || normalizeTitleKey(item.title);
    if (!key || existingKeys.has(key)) {
      return false;
    }
    const text = normalizeMatchText(`${item.title} ${item.summary}`);
    if (containsAny(text, EXCLUDE_TERMS)) {
      return false;
    }
    existingKeys.add(key);
    return true;
  });
  return supplemented.concat(broadSupplement);
}

function reviewLeftFallback(item, settings) {
  const text = normalizeMatchText(`${item.title} ${item.summary}`);
  const includeTerms = splitKeywords(settings.includeKeywords);
  const excludeTerms = splitKeywords(settings.excludeKeywords);

  if (containsAny(text, EXCLUDE_TERMS.concat(excludeTerms))) {
    return { accept: false };
  }
  if (!containsAny(text, AI_TERMS)) {
    return { accept: false };
  }

  const productHits = countHits(text, PRODUCT_TERMS);
  const breakthroughHits = countHits(text, BREAKTHROUGH_TERMS);
  const updateHits = countHits(text, UPDATE_TERMS);
  const noveltyHits = countHits(text, NOVELTY_TERMS);
  const signalHits = productHits + breakthroughHits + updateHits;

  if (signalHits === 0 && noveltyHits === 0) {
    return { accept: false };
  }
  if (includeTerms.length > 0 && !containsAny(text, includeTerms) && signalHits < 1) {
    return { accept: false };
  }

  const categories = [];
  if (productHits > 0) {
    categories.push("AI新产品");
  }
  if (breakthroughHits > 0) {
    categories.push("AI新技术突破");
  }
  if (updateHits > 0) {
    categories.push("模型/算法更新");
  }
  if (categories.length === 0) {
    categories.push("AI动态");
  }

  const ageHours = Math.max(0, (Date.now() - item.publishedAt) / 3600000);
  const recencyScore = Math.max(0, 1.5 - ageHours / 48);
  const score = 1.8
    + Math.min(3, productHits * 1.1)
    + Math.min(3, breakthroughHits * 1.2)
    + Math.min(2.5, updateHits * 1.1)
    + Math.min(1.5, noveltyHits * 0.7)
    + (item.sourceWeight || 1)
    + recencyScore;

  return {
    accept: true,
    totalScore: score,
    categories
  };
}

function pickFinalNews(items, settings) {
  const strictScored = items
    .map((item) => ({ ...item, ...reviewRelevance(item, settings, false) }))
    .filter((item) => item.accept);

  let pool = strictScored;
  if (strictScored.length < GENERATION_LIMIT) {
    const existingIds = new Set(strictScored.map((item) => item.id));
    const relaxedScored = items
      .filter((item) => !existingIds.has(item.id))
      .map((item) => ({ ...item, ...reviewRelevance(item, settings, true) }))
      .filter((item) => item.accept);
    pool = strictScored.concat(relaxedScored);
  }

  const merged = dedupeSelected(pool.sort(sortByScoreDesc));
  return diversifyByCompany(merged, GENERATION_LIMIT).slice(0, GENERATION_LIMIT);
}

function reviewRelevance(item, settings, relaxed) {
  const text = normalizeMatchText(`${item.title} ${item.summary}`);
  const includeTerms = splitKeywords(settings.includeKeywords);
  const excludeTerms = splitKeywords(settings.excludeKeywords);

  if (containsAny(text, EXCLUDE_TERMS.concat(excludeTerms))) {
    return { accept: false };
  }
  if (!containsAny(text, AI_TERMS)) {
    return { accept: false };
  }

  const productHits = countHits(text, PRODUCT_TERMS);
  const breakthroughHits = countHits(text, BREAKTHROUGH_TERMS);
  const updateHits = countHits(text, UPDATE_TERMS);
  if (productHits + breakthroughHits + updateHits === 0) {
    return { accept: false };
  }

  const partnershipHits = countHits(text, PARTNERSHIP_TERMS);
  if (partnershipHits > 0 && productHits + breakthroughHits + updateHits < 2) {
    return { accept: false };
  }

  if (includeTerms.length > 0 && !containsAny(text, includeTerms)) {
    const weakSignal = productHits + updateHits < 2 && breakthroughHits < 1;
    if (weakSignal) {
      return { accept: false };
    }
  }

  const categories = [];
  if (productHits > 0) {
    categories.push("AI新产品");
  }
  if (breakthroughHits > 0) {
    categories.push("AI新技术突破");
  }
  if (updateHits > 0) {
    categories.push("模型/算法更新");
  }

  const noveltyHits = countHits(text, NOVELTY_TERMS);
  const ageHours = Math.max(0, (Date.now() - item.publishedAt) / 3600000);
  const recencyScore = Math.max(0, 2 - ageHours / 24);
  const numberBonus = /(\d{2,}|%|ms|x\b|倍|参数|tokens?)/i.test(text) ? 1 : 0;
  const includeBonus = includeTerms.length > 0 && containsAny(text, includeTerms) ? 1.2 : 0;

  let score = 3;
  score += Math.min(4, productHits * 1.6);
  score += Math.min(5, breakthroughHits * 2.2);
  score += Math.min(4, updateHits * 1.8);
  score += Math.min(2, noveltyHits * 0.8);
  score += (item.sourceWeight || 1) + recencyScore + numberBonus + includeBonus;

  const threshold = relaxed ? 7.1 : 8.2;
  if (score < threshold) {
    return { accept: false };
  }

  return {
    accept: true,
    totalScore: score,
    categories
  };
}

function dedupeSelected(items) {
  const kept = [];
  items.forEach((item) => {
    const index = kept.findIndex((existing) => isDuplicateEvent(item, existing));
    if (index < 0) {
      kept.push(item);
      return;
    }
    kept[index] = item.totalScore >= kept[index].totalScore ? mergeDuplicate(item, kept[index]) : mergeDuplicate(kept[index], item);
  });
  return kept.sort(sortByScoreDesc);
}

function isDuplicateEvent(a, b) {
  if (a.canonicalLink && b.canonicalLink && a.canonicalLink === b.canonicalLink) {
    return true;
  }
  const sameCompany = a.company && b.company && a.company === b.company;
  const sim = jaccardSimilarity(tokenize(a.title), tokenize(b.title));
  if (sameCompany && sim >= 0.62) {
    return true;
  }
  return sim >= 0.78;
}

function mergeDuplicate(primary, secondary) {
  const sourceName = primary.sourceName === secondary.sourceName
    ? primary.sourceName
    : `${primary.sourceName}/${secondary.sourceName}`;

  return {
    ...primary,
    sourceName,
    summary: primary.summary.length >= secondary.summary.length ? primary.summary : secondary.summary,
    categories: Array.from(new Set((primary.categories || []).concat(secondary.categories || []))),
    totalScore: Math.max(primary.totalScore || 0, secondary.totalScore || 0)
  };
}

function diversifyByCompany(items, limit) {
  const output = [];
  const counter = new Map();

  items.forEach((item) => {
    if (output.length >= limit) {
      return;
    }
    const company = item.company || "其他";
    const cap = company === "其他" ? 4 : 3;
    const count = counter.get(company) || 0;
    if (count >= cap) {
      return;
    }
    output.push(item);
    counter.set(company, count + 1);
  });

  if (output.length < limit) {
    items.forEach((item) => {
      if (output.length >= limit) {
        return;
      }
      if (!output.some((entry) => entry.id === item.id)) {
        output.push(item);
      }
    });
  }
  return output;
}

function buildSummary(item) {
  const title = trimTitle(stripNewsLeadNormalized(item.title || item.summary || ""));
  const detail = extractKeyDetail(item.summary || "");
  const clauses = [];

  if (title) {
    clauses.push(title);
  }
  if (detail && !clauses.some((saved) => saved.includes(detail) || detail.includes(saved) || isNearDuplicateText(saved, detail))) {
    clauses.push(detail);
  }

  let line = clauses.join("，");
  if (!line) {
    line = stripNewsLeadNormalized(item.summary || "");
  }

  if (item.company && line && !containsCompanyName(line, item.company)) {
    line = `${item.company}：${line}`;
  }

  line = formatFinalSummaryLine(line);
  if (!line) {
    return "该新闻条目缺少可提炼内容。";
  }
  return line;
}

function extractKeyDetail(summary) {
  if (!summary) {
    return "";
  }
  const clauses = splitSummaryClauses(summary)
    .map((part) => stripNewsLeadNormalized(part))
    .map((part) => part.replace(/\.{3,}|…+/g, "").trim())
    .filter((part) => part.length >= 8)
    .filter((part) => !isBoilerplateClause(part));

  if (clauses.length === 0) {
    return "";
  }
  const ranked = clauses
    .map((part) => ({ part, score: scoreDetailClause(part) }))
    .sort((a, b) => (b.score - a.score) || (b.part.length - a.part.length));

  return ranked[0].part;
}

function toggleBusy(isBusy) {
  elements.generateBtn.disabled = isBusy;
  elements.copyBtn.disabled = isBusy;
  elements.saveBtn.disabled = isBusy;
  elements.generateBtn.textContent = isBusy ? "生成中..." : "⟳ 生成最新新闻";
}

function setStatus(message) {
  elements.statusLine.textContent = message;
}

function fallbackCopy(text) {
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.top = "-9999px";
  document.body.appendChild(area);
  area.focus();
  area.select();
  document.execCommand("copy");
  document.body.removeChild(area);
}

function loadSettings() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return cloneSettings(DEFAULT_SETTINGS);
  }
  try {
    return normalizeSettings(JSON.parse(raw));
  } catch (error) {
    return cloneSettings(DEFAULT_SETTINGS);
  }
}

function persistSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
}

function normalizeSettings(input) {
  const normalized = cloneSettings(DEFAULT_SETTINGS);
  normalized.model = typeof input.model === "string" ? input.model : normalized.model;
  normalized.recentOnly = typeof input.recentOnly === "boolean" ? input.recentOnly : normalized.recentOnly;
  normalized.includeKeywords = typeof input.includeKeywords === "string" ? input.includeKeywords : normalized.includeKeywords;
  normalized.excludeKeywords = typeof input.excludeKeywords === "string" ? input.excludeKeywords : normalized.excludeKeywords;
  normalized.promptTemplate = typeof input.promptTemplate === "string" ? input.promptTemplate : normalized.promptTemplate;
  normalized.sources = Array.isArray(input.sources) ? normalizeSourceArray(input.sources) : normalized.sources;
  normalized.sources = mergeMissingSources(normalized.sources, CHINESE_SOURCES);

  const runtime = input && typeof input.modelRuntime === "object" ? input.modelRuntime : {};
  normalized.modelRuntime = {
    mode: typeof runtime.mode === "string" ? runtime.mode : normalized.modelRuntime.mode,
    provider: typeof runtime.provider === "string" ? runtime.provider : normalized.modelRuntime.provider,
    baseUrl: typeof runtime.baseUrl === "string" ? runtime.baseUrl : normalized.modelRuntime.baseUrl,
    apiKey: typeof runtime.apiKey === "string" ? runtime.apiKey : normalized.modelRuntime.apiKey,
    modelName: typeof runtime.modelName === "string" ? runtime.modelName : normalized.modelRuntime.modelName
  };
  if (normalized.modelRuntime.modelName) {
    normalized.model = normalized.modelRuntime.modelName;
  }
  return normalized;
}

function cloneSettings(value) {
  return {
    model: value.model,
    recentOnly: value.recentOnly,
    includeKeywords: value.includeKeywords,
    excludeKeywords: value.excludeKeywords,
    promptTemplate: value.promptTemplate,
    sources: (value.sources || []).map((entry) => ({ ...entry })),
    modelRuntime: { ...value.modelRuntime }
  };
}

function ensureChineseSourceCoverage() {
  const merged = mergeMissingSources(state.settings.sources || [], CHINESE_SOURCES);
  if (merged.length !== (state.settings.sources || []).length) {
    state.settings.sources = merged;
    persistSettings();
  }
}

function parseSources(input) {
  return normalizeSourceArray(
    input
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split("|").map((part) => part.trim()).filter(Boolean);
        if (parts.length === 1) {
          return buildSource(parts[0], parts[0], "1");
        }
        if (parts.length === 2) {
          return buildSource(parts[0], parts[1], "1");
        }
        return buildSource(parts[0], parts[1], parts[2]);
      })
  );
}

function normalizeSourceArray(entries) {
  return (entries || [])
    .map((entry) => buildSource(entry.name, entry.url, entry.weight))
    .filter(Boolean);
}

function mergeMissingSources(existingSources, requiredSources) {
  const base = normalizeSourceArray(existingSources || []);
  const seen = new Set(base.map((entry) => normalizeSourceUrlKey(entry.url)).filter(Boolean));
  (requiredSources || []).forEach((entry) => {
    const built = buildSource(entry.name, entry.url, entry.weight);
    if (!built) {
      return;
    }
    const key = normalizeSourceUrlKey(built.url);
    if (!key || seen.has(key)) {
      return;
    }
    base.push(built);
    seen.add(key);
  });
  return base;
}

function normalizeSourceUrlKey(url) {
  const normalized = normalizeUrl(url);
  return normalized ? normalized.replace(/\/+$/, "").toLowerCase() : "";
}

function buildSource(nameValue, urlValue, weightValue) {
  const url = normalizeUrl(urlValue);
  if (!url) {
    return null;
  }
  const weight = Number.parseFloat(weightValue);
  return {
    name: cleanText(nameValue || inferSourceNameFromUrl(url)) || inferSourceNameFromUrl(url),
    url,
    weight: Number.isFinite(weight) ? Math.min(2, Math.max(0.5, weight)) : 1
  };
}

function serializeSources(sources) {
  return (sources || [])
    .map((entry) => `${entry.name}|${entry.url}|${entry.weight}`)
    .join("\n");
}

function ensureModelSelectOption(modelName) {
  const value = cleanText(modelName);
  if (!value || value === "rules-local") {
    return;
  }
  const exists = Array.from(elements.modelSelect.options).some((option) => option.value === value);
  if (!exists) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    elements.modelSelect.appendChild(option);
  }
}

function inferSourceNameFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch (error) {
    return "未知信源";
  }
}

function normalizeUrl(url, base) {
  if (!url) {
    return "";
  }
  try {
    return new URL(url, base || undefined).href;
  } catch (error) {
    return "";
  }
}

function canonicalizeUrl(url) {
  if (!url) {
    return "";
  }
  try {
    const parsed = new URL(url);
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "source"]
      .forEach((key) => parsed.searchParams.delete(key));
    parsed.hash = "";
    return `${parsed.hostname}${parsed.pathname}${parsed.search}`.replace(/\/$/, "").toLowerCase();
  } catch (error) {
    return "";
  }
}

function parseDate(value) {
  if (!value) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function detectCompany(text) {
  for (const entry of COMPANY_PATTERNS) {
    if (entry.regex.test(text || "")) {
      return entry.name;
    }
  }
  return "";
}

function containsCompanyName(line, company) {
  return !!(line && company && line.toLowerCase().includes(company.toLowerCase()));
}

function normalizeMatchText(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[\u200b-\u200f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitKeywords(text) {
  return (text || "")
    .split(/[，,]/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function containsAny(text, terms) {
  return (terms || []).some((term) => text.includes(term.toLowerCase()));
}

function countHits(text, terms) {
  return (terms || []).reduce((total, term) => total + (text.includes(term.toLowerCase()) ? 1 : 0), 0);
}

function tokenize(text) {
  return normalizeTitleKey(text)
    .split(" ")
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function normalizeTitleKey(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function jaccardSimilarity(tokensA, tokensB) {
  if (tokensA.length === 0 || tokensB.length === 0) {
    return 0;
  }
  const a = new Set(tokensA);
  const b = new Set(tokensB);
  let inter = 0;
  a.forEach((token) => {
    if (b.has(token)) {
      inter += 1;
    }
  });
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function trimTitle(title) {
  return cleanText(title).replace(/\s*[-|｜]\s*(openai|techcrunch|venturebeat|the verge|mit technology review|microsoft|google)$/i, "");
}

function stripHtml(html) {
  if (!html) {
    return "";
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body ? (doc.body.textContent || "") : "";
}

function cleanText(text) {
  return (text || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanOutputLine(text) {
  return cleanText(text).replace(/\s*[\r\n]+\s*/g, " ");
}

function stripNewsLead(text) {
  let line = cleanOutputLine(text || "");
  if (!line) {
    return "";
  }

  const leadPatterns = [
    /^(?:据|来源[:：]\s*)?\s*(?:IT之家|IT\s*Home|36氪|快科技|新浪科技|财联社|钛媒体|机器之心|量子位|澎湃新闻|界面新闻|网易科技|腾讯科技|搜狐科技|虎嗅|TechCrunch|The Verge|VentureBeat)\s*(?:(?:\d{4}\s*年\s*)?\d{1,2}\s*月\s*\d{1,2}\s*日)?\s*(?:上午|下午|晚间|凌晨)?\s*(?:消息|报道|讯|电)\s*[，,:：-]?\s*/i,
    /^(?:(?:\d{4}\s*年\s*)?\d{1,2}\s*月\s*\d{1,2}\s*日)\s*(?:上午|下午|晚间|凌晨)?\s*(?:消息|报道|讯|电)\s*[，,:：-]?\s*/i
  ];

  for (const pattern of leadPatterns) {
    line = line.replace(pattern, "").trim();
  }
  return line;
}

function stripNewsLeadNormalized(text) {
  let line = cleanOutputLine(text || "");
  if (!line) {
    return "";
  }

  const sourceLeadPattern = new RegExp(
    "^(?:\\u636e|\\u6765\\u6e90[:\\uFF1A]\\s*)?\\s*(?:IT\\u4e4b\\u5bb6|IT\\s*Home|36\\u6c2a|\\u5feb\\u79d1\\u6280|\\u65b0\\u6d6a\\u79d1\\u6280|\\u8d22\\u8054\\u793e|\\u949b\\u5a92\\u4f53|\\u673a\\u5668\\u4e4b\\u5fc3|\\u91cf\\u5b50\\u4f4d|\\u6f8e\\u6e43\\u65b0\\u95fb|\\u754c\\u9762\\u65b0\\u95fb|\\u7f51\\u6613\\u79d1\\u6280|\\u817e\\u8baf\\u79d1\\u6280|\\u641c\\u72d0\\u79d1\\u6280|\\u864e\\u55c5|TechCrunch|The\\s+Verge|VentureBeat)\\s*(?:(?:\\d{4}\\s*\\u5e74\\s*)?\\d{1,2}\\s*\\u6708\\s*\\d{1,2}\\s*\\u65e5)?\\s*(?:\\u4e0a\\u5348|\\u4e0b\\u5348|\\u665a\\u95f4|\\u51cc\\u6668)?\\s*(?:\\u6d88\\u606f|\\u62a5\\u9053|\\u8baf|\\u7535)\\s*[\\uFF0C,:\\uFF1A-]?\\s*",
    "i"
  );
  const dateLeadPattern = new RegExp(
    "^(?:(?:\\d{4}\\s*\\u5e74\\s*)?\\d{1,2}\\s*\\u6708\\s*\\d{1,2}\\s*\\u65e5)\\s*(?:\\u4e0a\\u5348|\\u4e0b\\u5348|\\u665a\\u95f4|\\u51cc\\u6668)?\\s*(?:\\u6d88\\u606f|\\u62a5\\u9053|\\u8baf|\\u7535)\\s*[\\uFF0C,:\\uFF1A-]?\\s*",
    "i"
  );

  for (let i = 0; i < 2; i += 1) {
    line = line.replace(sourceLeadPattern, "").replace(dateLeadPattern, "").trim();
  }
  return line;
}

function sortByDateDesc(a, b) {
  return b.publishedAt - a.publishedAt;
}

function sortByScoreDesc(a, b) {
  if ((b.totalScore || 0) !== (a.totalScore || 0)) {
    return (b.totalScore || 0) - (a.totalScore || 0);
  }
  return b.publishedAt - a.publishedAt;
}

function formatDate(timestamp) {
  if (!timestamp) {
    return "未知时间";
  }
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function formatTime(isoText) {
  const date = new Date(isoText);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}



