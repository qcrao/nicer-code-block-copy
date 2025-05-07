// src/index.tsx
import createObserver from "roamjs-components/dom/createObserver";

// Define Timer type without relying on NodeJS namespace
type Timer = ReturnType<typeof setTimeout>;

// Plugin instance tracking
let isPluginLoaded = false;
let mainObserver: MutationObserver | null = null;
let debounceTimer: Timer | null = null;

const config = {
  tabTitle: "Nicer Code Block Copy",
  settings: [
    {
      id: "enable-inline-code-copy-button",
      name: "Enable copy button on inline code blocks",
      description:
        "If enabled, a copy button will appear on inline code blocks when hovering",
      default: true,
      action: {
        type: "switch",
        onChange: (evt: any) => {
          inlineCopyEnabled = evt.target.checked;
          reinitializePlugin();
        },
      },
    },
    {
      id: "enable-highlight-copy-button",
      name: "Enable copy button on highlighted text",
      description:
        "If enabled, a copy button will appear on highlighted text when hovering",
      default: true,
      action: {
        type: "switch",
        onChange: (evt: any) => {
          highlightCopyEnabled = evt.target.checked;
          reinitializePlugin();
        },
      },
    },
  ],
};

const runners = {
  menuItems: [] as any[],
  observers: [] as any[],
};

let inlineCopyEnabled = true;
let highlightCopyEnabled = true;
let extensionAPIRef: any = null;

/**
 * 重新初始化插件
 * 在设置更改时调用，确保正确清理并重新创建所有必要的元素
 */
const reinitializePlugin = () => {
  try {
    // 清理当前运行的观察者和元素
    cleanupPlugin();

    // 重新初始化
    injectStyles();
    setupMainObserver();
    processExistingElements(); // 立即处理当前页面上的元素
  } catch (error) {
    console.error("Error reinitializing plugin:", error);
  }
};

/**
 * 清理插件，移除所有观察者和DOM元素
 */
const cleanupPlugin = () => {
  removeObservers();
  cleanupExistingWrappers();
  removeStyles();

  // 清理主MutationObserver
  if (mainObserver) {
    mainObserver.disconnect();
    mainObserver = null;
  }

  // 清理防抖计时器
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
};

// Add CSS styles for hover effects
const injectStyles = () => {
  const styleId = "nicer-code-block-copy-styles";
  if (document.getElementById(styleId)) {
    removeStyles(); // 如果样式已存在，先移除
  }

  const styleEl = document.createElement("style");
  styleEl.id = styleId;
  styleEl.innerHTML = `
    .inline-code-wrapper,
    .highlight-wrapper {
      position: relative;
      display: inline-block;
    }
    
    .inline-code-wrapper .copy-code-button,
    .highlight-wrapper .copy-code-button {
      visibility: hidden;
      opacity: 0;
      transition: opacity 0.2s ease;
      position: absolute;
      top: -18px;
      right: 0;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 3px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
      padding: 2px;
      margin: 0;
    }
    
    .inline-code-wrapper:hover .copy-code-button,
    .highlight-wrapper:hover .copy-code-button {
      visibility: visible;
      opacity: 1;
    }
    
    .rm-code-block .copy-code-button {
      margin-right: 5px;
    }
    
    .copy-code-button .copy-icon {
      height: 16px;
      width: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `;
  document.head.appendChild(styleEl);
};

const removeStyles = () => {
  const styleEl = document.getElementById("nicer-code-block-copy-styles");
  if (styleEl) styleEl.remove();
};

async function copyCode(e: Event, blockUID: string) {
  let eid = `[:block/uid "${blockUID}"]`;

  let codeBlock = (window as any).roamAlphaAPI.data.pull(
    "[:block/string]",
    eid
  )[":block/string"];

  // Modified regex to handle hyphens and other special characters in language names
  const codeBlockRegex = /```([a-zA-Z0-9+#\-_ ]*)([\s\S]*?)```/;

  // Find the match in the markdown string
  const match = codeBlock.match(codeBlockRegex);

  // If a match is found, copy the code
  if (match) {
    const code = match[2].trim();

    try {
      await navigator.clipboard.writeText(code);
      // Add visual feedback
      const button = (e.target as HTMLElement).closest(".copy-code-button");
      if (button) {
        const icon = button.querySelector(".copy-icon");
        if (icon) {
          icon.innerHTML = "✓"; // Success checkmark
          setTimeout(() => {
            icon.innerHTML = "📋"; // Back to clipboard
          }, 1000);
        }
      }
    } catch (err) {
      console.error("Could not copy text: ", err);
    }
  }
}

async function copyInlineCode(e: Event) {
  const button = (e.target as HTMLElement).closest(".copy-code-button");
  const wrapper = button?.closest(".inline-code-wrapper");
  const codeElement = wrapper?.querySelector("code");

  if (!codeElement) return;

  const code = codeElement.innerText;

  try {
    await navigator.clipboard.writeText(code);
    // Add visual feedback
    const icon = button?.querySelector(".copy-icon");
    if (icon) {
      icon.innerHTML = "✓"; // Success checkmark
      setTimeout(() => {
        icon.innerHTML = "📋"; // Back to clipboard
      }, 1000);
    }
  } catch (err) {
    console.error("Could not copy text: ", err);
  }
}

async function copyHighlightedText(e: Event) {
  const button = (e.target as HTMLElement).closest(".copy-code-button");
  const wrapper = button?.closest(".highlight-wrapper");
  const highlightElement = wrapper?.querySelector(".rm-highlight");

  if (!highlightElement) return;

  const text = highlightElement.textContent || "";

  try {
    await navigator.clipboard.writeText(text);
    // Add visual feedback
    const icon = button?.querySelector(".copy-icon");
    if (icon) {
      icon.innerHTML = "✓"; // Success checkmark
      setTimeout(() => {
        icon.innerHTML = "📋"; // Back to clipboard
      }, 1000);
    }
  } catch (err) {
    console.error("Could not copy text: ", err);
  }
}

const createCopyButton = (blockUID: string) => {
  const button = document.createElement("span");
  button.className =
    "bp3-button bp3-minimal bp3-small copy-code-button dont-focus-block";
  button.tabIndex = 0;

  const icon = document.createElement("span");
  icon.className = "copy-icon";
  icon.innerHTML = "📋"; // Using emoji icon
  icon.id = blockUID;
  button.appendChild(icon);

  return button;
};

function createCodeBlockButton(blockUID: string, codeBlock: HTMLElement) {
  // Check if a button already exists
  if (codeBlock.querySelector(".copy-code-button")) return;

  const copyButton = createCopyButton(blockUID);
  const settingsBar = codeBlock.querySelector(
    ".rm-code-block__settings-bar"
  )?.lastElementChild;

  if (!settingsBar) return;

  copyButton.addEventListener("click", (e) => {
    copyCode(e, blockUID);
  });

  settingsBar.insertAdjacentElement("beforebegin", copyButton);
}

function createInlineCodeButton(blockUID: string, codeElement: HTMLElement) {
  // Skip if already wrapped
  if (codeElement.parentElement?.classList.contains("inline-code-wrapper"))
    return;

  // Create wrapper to hold the code and button
  const wrapper = document.createElement("span");
  wrapper.className = "inline-code-wrapper";

  // Insert wrapper before code element
  codeElement.parentNode?.insertBefore(wrapper, codeElement);

  // Move code element into wrapper
  wrapper.appendChild(codeElement);

  // Create and add button
  const copyButton = createCopyButton(blockUID);
  copyButton.addEventListener("click", copyInlineCode);
  wrapper.appendChild(copyButton);
}

function createHighlightButton(
  blockUID: string,
  highlightElement: HTMLElement
) {
  // Skip if already wrapped
  if (highlightElement.parentElement?.classList.contains("highlight-wrapper"))
    return;

  // Create wrapper to hold the highlight and button
  const wrapper = document.createElement("span");
  wrapper.className = "highlight-wrapper";

  // Insert wrapper before highlight element
  highlightElement.parentNode?.insertBefore(wrapper, highlightElement);

  // Move highlight element into wrapper
  wrapper.appendChild(highlightElement);

  // Create and add button
  const copyButton = createCopyButton(blockUID);
  copyButton.addEventListener("click", copyHighlightedText);
  wrapper.appendChild(copyButton);
}

function removeObservers() {
  // Loop through observers and disconnect
  try {
    for (const observer of runners.observers) {
      if (observer && typeof observer.disconnect === "function") {
        observer.disconnect();
      }
    }
    runners.observers = [];
  } catch (error) {
    console.error("Error removing observers:", error);
  }
}

function cleanupExistingWrappers() {
  // 清理所有现有的包装器和按钮
  try {
    // 首先移除所有事件监听器，防止内存泄漏
    document.querySelectorAll(".copy-code-button").forEach((btn) => {
      const clone = btn.cloneNode(true);
      if (btn.parentNode) {
        btn.parentNode.replaceChild(clone, btn);
      }
    });

    // 移除所有按钮
    document
      .querySelectorAll(".copy-code-button")
      .forEach((btn) => btn.remove());

    // 解开内联代码元素
    document.querySelectorAll(".inline-code-wrapper").forEach((wrapper) => {
      const code = wrapper.querySelector("code");
      if (code) {
        // 创建克隆节点以移除事件监听器
        const codeClone = code.cloneNode(true);
        wrapper.parentNode?.insertBefore(codeClone, wrapper);
        wrapper.remove();
      }
    });

    // 解开高亮元素
    document.querySelectorAll(".highlight-wrapper").forEach((wrapper) => {
      const highlight = wrapper.querySelector(".rm-highlight");
      if (highlight) {
        // 创建克隆节点以移除事件监听器
        const highlightClone = highlight.cloneNode(true);
        wrapper.parentNode?.insertBefore(highlightClone, wrapper);
        wrapper.remove();
      }
    });
  } catch (error) {
    console.error("Error cleaning up wrappers:", error);
  }
}

/**
 * 处理代码块
 */
function processCodeBlocks() {
  try {
    const codeBlocks = document.querySelectorAll(".rm-code-block");
    for (const codeBlock of codeBlocks) {
      const roamBlock = codeBlock.closest(".roam-block");
      if (!roamBlock) continue;

      const blockUID = roamBlock.id.split("-").pop();
      if (!blockUID) continue;

      createCodeBlockButton(blockUID, codeBlock as HTMLElement);
    }
  } catch (error) {
    console.error("Error processing code blocks:", error);
  }
}

/**
 * 处理内联代码
 */
function processInlineCode() {
  if (!inlineCopyEnabled) return;

  try {
    document.querySelectorAll("code").forEach((codeElement) => {
      // Skip code elements that are within code blocks
      if (codeElement.closest(".rm-code-block")) return;

      // Skip if already wrapped
      if (codeElement.parentElement?.classList.contains("inline-code-wrapper"))
        return;

      const blockParent = codeElement.closest(".roam-block");
      if (!blockParent) return;

      const blockUID = blockParent.id.split("-").pop();
      if (!blockUID) return;

      createInlineCodeButton(blockUID, codeElement as HTMLElement);
    });
  } catch (error) {
    console.error("Error processing inline code:", error);
  }
}

/**
 * 处理高亮文本
 */
function processHighlights() {
  if (!highlightCopyEnabled) return;

  try {
    document.querySelectorAll(".rm-highlight").forEach((highlightElement) => {
      // Skip highlights that are already processed
      if (
        highlightElement.parentElement?.classList.contains("highlight-wrapper")
      )
        return;

      const blockParent = highlightElement.closest(".roam-block");
      if (!blockParent) return;

      const blockUID = blockParent.id.split("-").pop();
      if (!blockUID) return;

      createHighlightButton(blockUID, highlightElement as HTMLElement);
    });
  } catch (error) {
    console.error("Error processing highlights:", error);
  }
}

/**
 * 处理当前页面上的所有元素
 */
function processExistingElements() {
  processCodeBlocks();
  processInlineCode();
  processHighlights();
}

/**
 * 设置主MutationObserver以监视DOM变化
 */
function setupMainObserver() {
  // 确保先移除旧的observer
  if (mainObserver) {
    mainObserver.disconnect();
    mainObserver = null;
  }

  // 初始化防抖计时器
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  // 创建新的MutationObserver
  mainObserver = new MutationObserver((mutations) => {
    // 使用防抖机制避免过于频繁的处理
    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      // 检查是否有相关变化
      const hasRelevantChanges = mutations.some((mutation) => {
        return Array.from(mutation.addedNodes).some((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return false;

          const element = node as Element;
          return (
            // 检查是否是代码块
            element.classList?.contains("rm-code-block") ||
            element.querySelector?.(".rm-code-block") ||
            // 检查是否是内联代码
            element.tagName === "CODE" ||
            element.querySelector?.("code") ||
            // 检查是否是高亮文本
            element.classList?.contains("rm-highlight") ||
            element.querySelector?.(".rm-highlight")
          );
        });
      });

      if (hasRelevantChanges) {
        console.log("Relevant DOM changes detected, updating elements...");
        processExistingElements();
      }
    }, 300); // 300ms防抖延迟
  });

  // 开始观察整个文档
  mainObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  console.log("Main observer setup complete");
}

function setSettingDefault(
  extensionAPI: any,
  settingId: string,
  settingDefault: boolean
): boolean {
  try {
    const storedSetting = extensionAPI.settings.get(settingId);
    if (storedSetting === null) {
      extensionAPI.settings.set(settingId, settingDefault);
      return settingDefault;
    }
    return storedSetting;
  } catch (error) {
    console.error(`Error setting default for ${settingId}:`, error);
    return settingDefault;
  }
}

function onload({ extensionAPI }: { extensionAPI: any }) {
  console.log("Loading nicer code block copy plugin");

  // 避免重复加载
  if (isPluginLoaded) {
    console.log("Plugin already loaded, cleaning up before reinitializing");
    try {
      onunload();
    } catch (e) {
      console.error("Error unloading existing instance:", e);
    }
  }

  // 保存extensionAPI的引用
  extensionAPIRef = extensionAPI;

  try {
    // 加载设置
    inlineCopyEnabled = setSettingDefault(
      extensionAPI,
      "enable-inline-code-copy-button",
      true
    );

    highlightCopyEnabled = setSettingDefault(
      extensionAPI,
      "enable-highlight-copy-button",
      true
    );

    // 创建设置面板
    extensionAPI.settings.panel.create(config);

    // 注入样式
    injectStyles();

    // 设置主MutationObserver
    setupMainObserver();

    // 立即处理当前页面上的元素
    processExistingElements();

    // 标记插件已加载
    isPluginLoaded = true;
    console.log("Nicer code block copy plugin successfully loaded");

    // 返回true表示加载成功
    return true;
  } catch (error) {
    console.error("Error loading plugin:", error);
    // 尝试清理
    try {
      cleanupPlugin();
    } catch (e) {
      console.error("Error cleaning up after failed load:", e);
    }
    isPluginLoaded = false;
    return false;
  }
}

function onunload() {
  if (!isPluginLoaded) {
    console.log("Plugin not loaded, nothing to unload");
    return true;
  }

  console.log("Unloading nicer code block copy plugin");

  try {
    // 清理所有内容
    cleanupPlugin();

    // 重置状态
    isPluginLoaded = false;
    console.log("Nicer code block copy plugin successfully unloaded");

    // 返回true表示卸载成功
    return true;
  } catch (error) {
    console.error("Error unloading plugin:", error);
    return false;
  }
}

export default {
  onload,
  onunload,
};
