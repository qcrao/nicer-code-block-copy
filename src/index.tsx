// src/index.tsx
import createObserver from "roamjs-components/dom/createObserver";

// Define Timer type without relying on NodeJS namespace
type Timer = ReturnType<typeof setTimeout>;

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
          onunload();
          createObservers();
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
          onunload();
          createObservers();
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

// Add CSS styles for hover effects
const injectStyles = () => {
  const styleId = "nicer-code-block-copy-styles";
  if (document.getElementById(styleId)) return;

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
  for (const observer of runners.observers) {
    observer.disconnect();
  }
  runners.observers = [];
}

function createObservers() {
  // Find and enhance code blocks
  const codeBlockObserver = createObserver(() => {
    const codeBlocks = document.querySelectorAll(".rm-code-block");

    for (const codeBlock of codeBlocks) {
      const roamBlock = codeBlock.closest(".roam-block");
      if (!roamBlock) continue;

      const blockUID = roamBlock.id.split("-").pop();
      if (!blockUID) continue;

      createCodeBlockButton(blockUID, codeBlock as HTMLElement);
    }
  });

  runners.observers.push(codeBlockObserver);

  if (inlineCopyEnabled) {
    const inlineCodeBlockObserver = createObserver(() => {
      document.querySelectorAll("code").forEach((codeElement) => {
        // Skip code elements that are within code blocks
        if (codeElement.closest(".rm-code-block")) return;

        const blockParent = codeElement.closest(".roam-block");
        if (!blockParent) return;

        const blockUID = blockParent.id.split("-").pop();
        if (!blockUID) return;

        createInlineCodeButton(blockUID, codeElement as HTMLElement);
      });
    });

    runners.observers.push(inlineCodeBlockObserver);
  }

  if (highlightCopyEnabled) {
    const highlightObserver = createObserver(() => {
      document.querySelectorAll(".rm-highlight").forEach((highlightElement) => {
        // Skip highlights that are already processed
        if (
          highlightElement.parentElement?.classList.contains(
            "highlight-wrapper"
          )
        )
          return;

        const blockParent = highlightElement.closest(".roam-block");
        if (!blockParent) return;

        const blockUID = blockParent.id.split("-").pop();
        if (!blockUID) return;

        createHighlightButton(blockUID, highlightElement as HTMLElement);
      });
    });

    runners.observers.push(highlightObserver);
  }
}

function setSettingDefault(
  extensionAPI: any,
  settingId: string,
  settingDefault: boolean
): boolean {
  const storedSetting = extensionAPI.settings.get(settingId);
  if (storedSetting === null) {
    extensionAPI.settings.set(settingId, settingDefault);
    return settingDefault;
  }
  return storedSetting;
}

function onload({ extensionAPI }: { extensionAPI: any }) {
  console.log("Loading nicer code block copy plugin");

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

  extensionAPI.settings.panel.create(config);

  injectStyles();
  createObservers();
}

function onunload() {
  console.log("Unloading nicer code block copy plugin");

  // Remove all copy buttons and wrappers
  document.querySelectorAll(".copy-code-button").forEach((btn) => btn.remove());

  // Unwrap inline code elements
  document.querySelectorAll(".inline-code-wrapper").forEach((wrapper) => {
    const code = wrapper.querySelector("code");
    if (code) {
      wrapper.parentNode?.insertBefore(code, wrapper);
      wrapper.remove();
    }
  });

  // Unwrap highlight elements
  document.querySelectorAll(".highlight-wrapper").forEach((wrapper) => {
    const highlight = wrapper.querySelector(".rm-highlight");
    if (highlight) {
      wrapper.parentNode?.insertBefore(highlight, wrapper);
      wrapper.remove();
    }
  });

  removeObservers();
  removeStyles();
}

export default {
  onload,
  onunload,
};
