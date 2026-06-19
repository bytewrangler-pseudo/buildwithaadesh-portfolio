class TerminalResume {
  constructor() {
    this.output = document.getElementById("output");
    this.input = document.getElementById("command-input");
    this.terminal = document.querySelector(".terminal");
    this.terminalContainer = document.querySelector(".terminal-container");
    this.contextMenu = document.querySelector(".context-menu");
    this.terminals = [{ input: this.input, history: [], historyIndex: -1 }];
    this.activeTerminal = 0;
    this.activeTerminalContent = null;
    this.resizing = null;

    // Properties personalized for Aadesh Pandey
    this.currentTheme = localStorage.getItem("theme") || "default";
    this.projects = [];
    this.skills = {};
    this.fileSystem = {};
    this.gameActive = false;
    this.gameHandler = null;

    // Initialize modals matching your DOM IDs
    this.themeModal = document.getElementById("theme-modal");
    this.projectsModal = document.getElementById("projects-modal");
    this.skillsModal = document.getElementById("skills-modal");

    // Initialize theme selector
    this.themeToggle = document.getElementById("theme-toggle");

    this.setupEventListeners();
    this.loadProjects();
    this.loadSkills();
    this.setupFileSystem();
    this.init();
  }

  init() {
    // Apply saved theme
    this.handleThemeChange(this.currentTheme);

    // Set up modal close buttons matching your CSS overlay rules
    document.querySelectorAll(".close-button").forEach((button) => {
      button.addEventListener("click", () => {
        this.closeModal(button.closest(".modal"));
      });
    });

    // Theme toggle interaction
    if (this.themeToggle) {
      this.themeToggle.addEventListener("click", () => {
        this.showModal(this.themeModal);
      });
    }

    // Hide language toggle since it's obsolete in this deployment
    const languageToggle = document.getElementById("language-toggle");
    if (languageToggle && languageToggle.parentElement) {
      languageToggle.parentElement.style.display = "none";
    }

    // Theme selection configuration parsing
    document.querySelectorAll(".theme-option").forEach((option) => {
      option.addEventListener("click", () => {
        this.handleThemeChange(option.dataset.theme);
      });
    });

    this.printWelcomeMessage();
    if (this.input) this.input.focus();
    this.setupContextMenu();
  }

  setupContextMenu() {
    // Handle right-click on terminal content structures
    if (this.terminalContainer) {
      this.terminalContainer.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        const terminalContent = e.target.closest(".terminal-content");
        if (terminalContent) {
          this.activeTerminalContent = terminalContent;
          this.showContextMenu(e.clientX, e.clientY);
        }
      });
    }

    // Hide custom context menu on outside click execution
    document.addEventListener("click", () => {
      if (this.contextMenu) this.contextMenu.classList.remove("active");
    });

    // Handle menu context action selections
    if (this.contextMenu) {
      this.contextMenu.addEventListener("click", (e) => {
        const action = e.target.dataset.action;
        if (action) {
          this.handleContextMenuAction(action);
        }
      });
    }
  }

  showContextMenu(x, y) {
    if (!this.contextMenu) return;
    this.contextMenu.style.left = `${x}px`;
    this.contextMenu.style.top = `${y}px`;
    this.contextMenu.classList.add("active");

    // Dynamic visibility for close action depending on terminal trees
    const closeOption = this.contextMenu.querySelector('[data-action="close-split"]');
    if (closeOption && this.terminalContainer) {
      const isMainTerminal = this.activeTerminalContent === this.terminalContainer.firstElementChild;
      closeOption.style.display = isMainTerminal ? "none" : "block";
    }
  }

  handleContextMenuAction(action) {
    if (!this.activeTerminalContent) return;

    switch (action) {
      case "split-h":
        this.splitTerminal("horizontal", this.activeTerminalContent);
        break;
      case "split-v":
        this.splitTerminal("vertical", this.activeTerminalContent);
        break;
      case "close-split":
        this.closeSplit(this.activeTerminalContent);
        break;
    }
    if (this.contextMenu) this.contextMenu.classList.remove("active");
  }

  setupEventListeners() {
    // Interactive focus management for window split trees
    if (this.terminalContainer) {
      this.terminalContainer.addEventListener("click", (e) => {
        const terminalContent = e.target.closest(".terminal-content");
        if (terminalContent) {
          const input = terminalContent.querySelector("input");
          if (input) {
            input.focus();
            this.activeTerminal = this.terminals.findIndex((t) => t.input === input);
          }
        }
      });
    }

    // Hotkey hooks: Layout window modifiers
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        const activeContent = this.terminals[this.activeTerminal].input.closest(".terminal-content");
        if (activeContent) this.splitTerminal("horizontal", activeContent);
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        const activeContent = this.terminals[this.activeTerminal].input.closest(".terminal-content");
        if (activeContent) this.splitTerminal("vertical", activeContent);
      }
    });

    if (this.input) this.setupInputHandlers(this.input);
  }

  setupInputHandlers(inputElement) {
    inputElement.addEventListener("keydown", (e) => {
      const terminal = this.terminals.find((t) => t.input === inputElement);
      if (!terminal) return;

      if (e.key === "Enter") {
        this.handleCommand(inputElement);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this.navigateHistory("up", terminal);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        this.navigateHistory("down", terminal);
      } else if (e.key === "l" && e.ctrlKey) {
        e.preventDefault();
        const outputElement = inputElement.closest(".terminal-content").querySelector("[id^='output']");
        if (outputElement) {
          outputElement.innerHTML = "";
          this.printWelcomeMessage(outputElement);
        }
      } else if (e.key === "Tab") {
        e.preventDefault();
        this.handleTabCompletion(inputElement);
      }
    });
  }

  handleTabCompletion(inputElement) {
    const currentInput = inputElement.value.toLowerCase().trim();
    const commands = [
      "help", "about", "skills", "experience", "education", "contact", 
      "clear", "projects", "skills-visual", "game", "exit-game", 
      "matrix", "stop-matrix", "weather", "calc", "calculate", "pdf", "linkedin-cover"
    ];

    const matches = commands.filter((cmd) => cmd.startsWith(currentInput));

    if (matches.length === 1) {
      inputElement.value = matches[0];
    } else if (matches.length > 1 && currentInput) {
      const outputElement = inputElement.closest(".terminal-content").querySelector("[id^='output']");
      if (outputElement) {
        const matchesText = `\nPossible commands:\n${matches.join("  ")}`;
        this.printToOutput(outputElement, matchesText, "info");
      }
    }
  }

  navigateHistory(direction, terminal) {
    if (direction === "up" && terminal.historyIndex < terminal.history.length - 1) {
      terminal.historyIndex++;
    } else if (direction === "down" && terminal.historyIndex > -1) {
      terminal.historyIndex--;
    }

    if (terminal.historyIndex >= 0 && terminal.historyIndex < terminal.history.length) {
      terminal.input.value = terminal.history[terminal.history.length - 1 - terminal.historyIndex];
    } else {
      terminal.input.value = "";
    }
  }

  splitTerminal(direction, sourceTerminal) {
    const parentContainer = sourceTerminal.parentElement;
    const isAlreadySplit = parentContainer.children.length > 1;
    const splitClass = direction === "horizontal" ? "split-h" : "split-v";

    if (!isAlreadySplit || !parentContainer.classList.contains(splitClass)) {
      const newContainer = document.createElement("div");
      newContainer.className = `terminal-container ${splitClass}`;

      sourceTerminal.parentElement.insertBefore(newContainer, sourceTerminal);
      newContainer.appendChild(sourceTerminal);
      this.createNewTerminalContent(newContainer);
    } else {
      this.createNewTerminalContent(parentContainer);
    }
  }

  createNewTerminalContent(container) {
    const newContent = document.createElement("div");
    newContent.className = "terminal-content";
    const timestamp = Date.now();
    newContent.innerHTML = `
      <div id="output-${timestamp}" class="terminal-output"></div>
      <div class="input-line">
        <span class="prompt">➜</span>
        <input type="text" id="command-input-${timestamp}" class="command-input" />
      </div>
    `;

    if (container.children.length > 0) {
      const handle = document.createElement("div");
      handle.className = `resize-handle ${container.classList.contains("split-h") ? "horizontal" : "vertical"}`;
      container.lastElementChild.appendChild(handle);
      this.setupResizeHandle(handle);
    }

    container.appendChild(newContent);

    const newInput = newContent.querySelector(".command-input");
    this.setupInputHandlers(newInput);

    this.terminals.push({
      input: newInput,
      history: [],
      historyIndex: -1,
    });

    const newOutput = newContent.querySelector(`#output-${timestamp}`);
    this.printWelcomeMessage(newOutput);

    newInput.focus();
    this.activeTerminal = this.terminals.length - 1;
  }

  setupResizeHandle(handle) {
    const isHorizontal = handle.classList.contains("horizontal");

    const startResize = (e) => {
      e.preventDefault();
      this.resizing = {
        handle,
        startX: e.clientX,
        startY: e.clientY,
        parentContainer: handle.closest(".terminal-container"),
        element: handle.parentElement,
        initialSize: isHorizontal ? handle.parentElement.offsetWidth : handle.parentElement.offsetHeight,
      };

      document.addEventListener("mousemove", resize);
      document.addEventListener("mouseup", stopResize);
    };

    const resize = (e) => {
      if (!this.resizing) return;

      const { parentContainer, element, startX, startY, initialSize } = this.resizing;
      const containerRect = parentContainer.getBoundingClientRect();

      if (isHorizontal) {
        const deltaX = e.clientX - startX;
        const newWidth = initialSize + deltaX;
        const maxWidth = containerRect.width - 150;

        if (newWidth >= 150 && newWidth <= maxWidth) {
          const percentage = (newWidth / containerRect.width) * 100;
          element.style.flex = "none";
          element.style.width = `${percentage}%`;
        }
      } else {
        const deltaY = e.clientY - startY;
        const newHeight = initialSize + deltaY;
        const maxHeight = containerRect.height - 100;

        if (newHeight >= 100 && newHeight <= maxHeight) {
          const percentage = (newHeight / containerRect.height) * 100;
          element.style.flex = "none";
          element.style.height = `${percentage}%`;
        }
      }
    };

    const stopResize = () => {
      this.resizing = null;
      document.removeEventListener("mousemove", resize);
      document.removeEventListener("mouseup", stopResize);
    };

    handle.addEventListener("mousedown", startResize);
  }

  closeSplit(terminalContent) {
    const index = this.terminals.findIndex((t) => t.input.closest(".terminal-content") === terminalContent);
    if (index !== -1) {
      this.terminals.splice(index, 1);
    }
    
    const parentContainer = terminalContent.parentElement;
    terminalContent.remove();

    if (parentContainer && parentContainer !== this.terminalContainer && parentContainer.children.length === 0) {
      parentContainer.remove();
    }
    
    if (this.terminals.length > 0) {
      this.activeTerminal = Math.min(this.activeTerminal, this.terminals.length - 1);
      this.terminals[this.activeTerminal].input.focus();
    }
  }

  printToOutput(outputElement, text, className = "", useTypewriter = false) {
    if (!outputElement) return Promise.resolve();
    if (!text) {
      outputElement.innerHTML = "";
      return Promise.resolve();
    }

    const line = document.createElement("div");
    line.className = className;
    line.style.whiteSpace = "pre-wrap";
    line.style.marginBottom = "0.5rem";

    outputElement.appendChild(line);
    this.scrollToBottom(outputElement.closest(".terminal-content"));

    if (useTypewriter && !text.includes("<")) {
      return this.typeText(line, text, 20);
    } else if (useTypewriter && text.includes("<")) {
      return this.typeHTML(line, text, 20);
    } else {
      line.innerHTML = text;
      return Promise.resolve();
    }
  }

  scrollToBottom(terminalContent) {
    if (!terminalContent) return;
    if (terminalContent.scrollHeight > terminalContent.clientHeight) {
      const maxScroll = terminalContent.scrollHeight - terminalContent.clientHeight;
      terminalContent.scrollTop = maxScroll;
      requestAnimationFrame(() => {
        terminalContent.scrollTop = maxScroll;
      });
    }
  }

  handleCommand(inputElement) {
    const terminal = this.terminals.find((t) => t.input === inputElement);
    if (!terminal) return;

    const command = inputElement.value.trim().toLowerCase();
    const outputElement = inputElement.closest(".terminal-content").querySelector("[id^='output']");

    this.printToOutput(outputElement, `➜ ${command}`, "command");
    terminal.history.push(inputElement.value.trim());
    terminal.historyIndex = -1;
    inputElement.value = "";

    const [cmd, ...args] = command.split(" ");

    switch (cmd) {
      case "help":
        this.showHelp(outputElement);
        break;
      case "about":
        this.showAbout(outputElement);
        break;
      case "experience":
        this.showExperience(outputElement);
        break;
      case "education":
        this.showEducation(outputElement);
        break;
      case "skills":
        this.showSkills(outputElement);
        break;
      case "contact":
        this.showContact(outputElement);
        break;
      case "clear":
        outputElement.innerHTML = "";
        this.printWelcomeMessage(outputElement);
        break;
      case "projects":
        this.showProjects();
        break;
      case "skills-visual":
        this.showSkillsVisualization();
        break;
      case "game":
        this.initGame(outputElement);
        break;
      case "pdf":
        this.generatePDF();
        break;
      case "linkedin-cover":
        this.generateLinkedInCover(outputElement);
        break;
      case "exit-game":
        this.endGame();
        this.printToOutput(outputElement, "Game session terminated.", "info");
        break;
      case "matrix":
        this.startMatrixEffect(outputElement);
        break;
      case "stop-matrix":
        this.stopMatrixEffect();
        this.printToOutput(outputElement, "Matrix effect stopped.", "info");
        break;
      case "weather":
        this.showWeather(args.join(" "), outputElement);
        break;
      case "calc":
      case "calculate":
        this.calculate(args.join(" "), outputElement);
        break;
      case "":
        break;
      default:
        this.printToOutput(outputElement, `Command not found: ${command}. Type 'help' for directions.`, "error");
    }

    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  printWelcomeMessage(outputElement = this.output) {
    if (!outputElement) return;
    const asciiArt = `███╗   ███╗ █████╗ ██████╗ ██╗ ██████╗
████╗ ████║██╔══██╗██╔══██╗██║██╔═══██╗
██╔████╔██║███████║██████╔╝██║██║   ██║
██║╚██╔╝██║██╔══██║██╔══██╗██║██║   ██║
██║ ╚═╝ ██║██║  ██║██║  ██║██║╚██████╔╝
╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝ ╚═════╝ `;

    const divider = "─────────────────────────────────────────────────";

    const welcome =
      this.wrapWithColor(asciiArt + "\n", "#ff8c00") +
      this.wrapWithColor(divider + "\n", "#555555") +
      this.wrapWithColor("              Interactive Terminal Resume\n", "#ffffff") +
      this.wrapWithColor("         Full-Stack Developer • Backend Infrastructure\n", "#ffaa33") +
      this.wrapWithColor(divider + "\n\n", "#555555") +
      this.wrapWithColor("Type ", "#ffffff") +
      this.wrapWithColor("'help'", "#98fb98") +
      this.wrapWithColor(" to view the environment commands\n", "#ffffff") +
      this.wrapWithColor("Press ", "#ffffff") +
      this.wrapWithColor("'tab'", "#98fb98") +
      this.wrapWithColor(" to invoke parameter auto-completion.", "#ffffff");

    const helpDiv = document.createElement("div");
    helpDiv.innerHTML = welcome;
    outputElement.appendChild(helpDiv);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  showHelp(outputElement = this.output) {
    const title = this.wrapWithColor("🚀 Core Directory Commands\n\n", "#ffaa33");

    const mainCommands =
      this.wrapWithColor("Main Controls:\n", "#00ffff") +
      this.wrapWithColor("• help", "#98fb98") + "       " + this.wrapWithColor("Print execution manual\n", "#ffffff") +
      this.wrapWithColor("• about", "#98fb98") + "      " + this.wrapWithColor("Display bio summary overview\n", "#ffffff") +
      this.wrapWithColor("• skills", "#98fb98") + "     " + this.wrapWithColor("View technical stack metrics\n", "#ffffff") +
      this.wrapWithColor("• experience", "#98fb98") + " " + this.wrapWithColor("Print deployment history profiles\n", "#ffffff") +
      this.wrapWithColor("• education", "#98fb98") + "  " + this.wrapWithColor("Show academic records\n", "#ffffff") +
      this.wrapWithColor("• contact", "#98fb98") + "    " + this.wrapWithColor("Expose endpoints and networks\n", "#ffffff") +
      this.wrapWithColor("• clear", "#98fb98") + "      " + this.wrapWithColor("Wipe logs from running stream\n", "#ffffff");

    const utilityCommands =
      "\n" + this.wrapWithColor("System Utilities:\n", "#00ffff") +
      this.wrapWithColor("• projects", "#98fb98") + "   " + this.wrapWithColor("Open system modal containing projects\n", "#ffffff") +
      this.wrapWithColor("• skills-visual", "#98fb98") + " " + this.wrapWithColor("Display interactive expertise bars\n", "#ffffff") +
      this.wrapWithColor("• game", "#98fb98") + "      " + this.wrapWithColor("Initialize sandbox processing task\n", "#ffffff") +
      this.wrapWithColor("• matrix", "#98fb98") + "    " + this.wrapWithColor("Render matrix stream background\n", "#ffffff") +
      this.wrapWithColor("• weather", "#98fb98") + "   " + this.wrapWithColor("Query localized outdoor atmospheric metrics\n", "#ffffff") +
      this.wrapWithColor("• calc", "#98fb98") + "      " + this.wrapWithColor("Process mathematical formulas safely\n", "#ffffff") +
      this.wrapWithColor("• pdf", "#98fb98") + "       " + this.wrapWithColor("Print running context window to document\n", "#ffffff") +
      this.wrapWithColor("• linkedin-cover", "#98fb98") + " " + this.wrapWithColor("Build interactive header profile asset\n", "#ffffff");

    const shortcuts =
      "\n" + this.wrapWithColor("Key Bindings:\n", "#ff8c00") +
      this.wrapWithColor("• ↑ / ↓", "#98fb98") + "       " + this.wrapWithColor("Traverse history stack entries\n", "#ffffff") +
      this.wrapWithColor("• Tab", "#98fb98") + "         " + this.wrapWithColor("Complete active command parameters\n", "#ffffff") +
      this.wrapWithColor("• Ctrl + L", "#98fb98") + "    " + this.wrapWithColor("Flush current viewport logs\n", "#ffffff") +
      this.wrapWithColor("• Ctrl+Shift+H", "#98fb98") + " " + this.wrapWithColor("Execute split pane horizontally\n", "#ffffff") +
      this.wrapWithColor("• Ctrl+Shift+V", "#98fb98") + " " + this.wrapWithColor("Execute split pane vertically\n", "#ffffff");

    const helpDiv = document.createElement("div");
    helpDiv.innerHTML = title + mainCommands + utilityCommands + shortcuts;
    outputElement.appendChild(helpDiv);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  showAbout(outputElement = this.output) {
    const about = `<span style="color: #ff8c00; font-weight: bold;">✨ Engineer Profile Summary</span>

${this.wrapWithColor("┌─────────────────────────────────────────────────────────┐", "#ff8c00")}
${this.wrapWithColor("│", "#ff8c00")} ${this.wrapWithColor("Software Developer and Educator focused on modern backend ", "#ffffff")}
${this.wrapWithColor("│", "#ff8c00")} ${this.wrapWithColor("architecture, scaling microservices, and databases.     ", "#ffffff")}
${this.wrapWithColor("└─────────────────────────────────────────────────────────┘", "#ff8c00")}

${this.wrapWithColor("⚡ Primary Domain", "#ffaa33")}
   ${this.wrapWithColor("Designing high-performance infrastructure stacks with Node.js,", "#ffffff")}
   ${this.wrapWithColor("PostgreSQL ecosystems, and reverse-proxy deployment nodes.", "#ffffff")}

${this.wrapWithColor("⚡ Research Sectors", "#ffaa33")}
   ${this.wrapWithColor("Cybersecurity, digital forensics pipelines, and infrastructure", "#ffffff")}
   ${this.wrapWithColor("hardening operations.", "#ffffff")}`;

    const aboutDiv = document.createElement("div");
    aboutDiv.innerHTML = about;
    outputElement.appendChild(aboutDiv);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  wrapWithColor(text, color) {
    return `<span style="color: ${color}">${text}</span>`;
  }

  typeText(element, text, speed = 30) {
    if (!element || !text) return Promise.resolve();
    return new Promise((resolve) => {
      let index = 0;
      element.textContent = "";
      element.style.display = "inline-block";

      const interval = setInterval(() => {
        if (index < text.length) {
          element.textContent += text.charAt(index);
          index++;
        } else {
          clearInterval(interval);
          resolve();
        }
      }, speed);
    });
  }

  async typeHTML(element, html, speed = 30) {
    if (!element || !html) return Promise.resolve();

    const temp = document.createElement("div");
    temp.innerHTML = html;

    const walker = document.createTreeWalker(temp, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null, false);
    const nodes = [];
    let currentNode;
    while ((currentNode = walker.nextNode())) {
      nodes.push(currentNode);
    }

    element.innerHTML = "";

    for (const node of nodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        const span = document.createElement("span");
        element.appendChild(span);
        await this.typeText(span, node.textContent, speed);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const clone = node.cloneNode(false);
        element.appendChild(clone);
        if (node.tagName === "STYLE" || !node.hasChildNodes()) {
          clone.innerHTML = node.innerHTML;
        }
      }
    }
    return Promise.resolve();
  }

  showExperience(outputElement = this.output) {
    const experience = `<span style="color: #ffaa33; font-weight: bold;">💼 Deployment & Professional History</span>

<span style="color: #00ffff;">ASSISTANT PROFESSOR | Computer Science & Engineering Node</span>
${this.wrapWithColor("KES Shroff College of Arts and Commerce | Mumbai, India", "#ffffff")}
  • Lead course tracks for Data Structures, Digital Forensics, Cyber Law, and Discrete Mathematics.
  • Guide deployment patterns for full-stack environments.

<span style="color: #00ffff;">BACKEND ARCHITECT & SYSTEM CONSULTANT</span>
${this.wrapWithColor("Independent Tech Operations", "#ffffff")}
  • Engineer and coordinate multi-tier APIs using Node.js and PostgreSQL engines.
  • Configure production VPS routing using Nginx reverse proxy rules and process pools managed by PM2.`;

    const expDiv = document.createElement("div");
    expDiv.innerHTML = experience;
    outputElement.appendChild(expDiv);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  showEducation(outputElement = this.output) {
    const education = `<span style="color: #ff79c6; font-weight: bold;">🎓 Academic Formations</span>\n\n` +
      this.wrapWithColor("• Engineering & Computer Science Specialization\n", "#00ffff") +
      this.wrapWithColor("  Advanced preparation in algorithmic data trees, cyber laws, and computing frameworks.\n", "#ffffff");

    const eduDiv = document.createElement("div");
    eduDiv.innerHTML = education;
    outputElement.appendChild(eduDiv);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  showSkills(outputElement = this.output) {
    const skillsText = `<span style="color: #98fb98; font-weight: bold;">🛡️ Engineering Architecture Capabilities</span>\n\n` +
      this.wrapWithColor("Backend Ecosystem & Infrastructure:\n", "#00ffff") +
      this.wrapWithColor("  Node.js, Express, PostgreSQL (Neon Tech), Relational Database Design, REST APIs, Microservices\n\n", "#ffffff") +
      this.wrapWithColor("Server Coordination & DevOps Tools:\n", "#00ffff") +
      this.wrapWithColor("  Nginx Reverse Proxy Configurations, Port Mappings, SSL Management, PM2 Runtime Engine, Linux VPS Environments\n\n", "#ffffff") +
      this.wrapWithColor("Core Theoretical Foundations:\n", "#00ffff") +
      this.wrapWithColor("  Data Structures and Algorithms (DSA), Cyber Security & Digital Forensics, Discrete Mathematics Frameworks")

    const skillsDiv = document.createElement("div");
    skillsDiv.innerHTML = skillsText;
    outputElement.appendChild(skillsDiv);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  showContact(outputElement = this.output) {
    const contactText = `<span style="color: #f1fa8c; font-weight: bold;">📨 Communication Endpoints</span>\n\n` +
      this.wrapWithColor("• Active Location: ", "#00ffff") + this.wrapWithColor("Kandivali, Mumbai, India\n", "#ffffff") +
      this.wrapWithColor("• Networking Base: ", "#00ffff") + this.wrapWithColor("Aadesh Pandey Terminal Workspace Profile Environment", "#ffffff");

    const contactDiv = document.createElement("div");
    contactDiv.innerHTML = contactText;
    outputElement.appendChild(contactDiv);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  loadProjects() {
    this.projects = [
      { name: "Clinic Chain Management Framework", desc: "Multi-panel architecture supporting Doctor, Patient, and Admin portals. Designed dynamic appointment engines running over PostgreSQL backends." },
      { name: "Mumbai Transit Flow Modeler", desc: "Data modeling project processing local train timings and route sequencing schedules for rapid lookup algorithms." },
      { name: "Nginx High-Availability Gateway", desc: "VPS production array utilizing Nginx rules to reverse proxy port ranges across multiple live service nodes." }
    ];
  }

  showProjects() {
    if (!this.projectsModal) return;
    this.showModal(this.projectsModal);
    const grid = this.projectsModal.querySelector(".creator-projects-grid") || this.projectsModal.querySelector(".modal-body");
    if (grid) {
      grid.innerHTML = this.projects.map(proj => `
        <div class="creator-item" style="border: 1px solid var(--border-color); padding: 15px; margin-bottom: 10px; border-radius: 6px; background: rgba(0,0,0,0.2);">
          <h3 style="color: var(--text-bright); margin-bottom: 5px; font-family: inherit;">${proj.name}</h3>
          <p style="color: #ffffff; font-size: 0.9rem; font-family: inherit;">${proj.desc}</p>
        </div>
      `).join('');
    }
  }

  loadSkills() {
    this.skills = {
      "Backend API Architecture": 95,
      "Relational Database Modeling": 92,
      "VPS Production Deployment & Nginx": 89,
      "Cyber Law & Security Concepts": 85
    };
  }

  showSkillsVisualization() {
    if (!this.skillsModal) return;
    this.showModal(this.skillsModal);
    const body = this.skillsModal.querySelector(".modal-body");
    if (body) {
      body.innerHTML = '<h3 style="color: var(--text-highlight); margin-bottom: 15px; font-family: inherit;">Proficiency Matrix</h3>' + 
        Object.entries(this.skills).map(([skill, val]) => `
          <div style="margin-bottom: 12px; font-family: inherit;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #fff;">
              <span>${skill}</span><span>${val}%</span>
            </div>
            <div style="width: 100%; background: #333; height: 10px; border-radius: 5px; overflow: hidden;">
              <div style="width: ${val}%; background: var(--text-color); height: 100%;"></div>
            </div>
          </div>
        `).join('');
    }
  }

  setupFileSystem() {
    this.fileSystem = {
      "readme.txt": "Aadesh Pandey - Interactive Platform Shell Environment terminal initialization logs.",
      "config.json": '{\n  "environment": "vps_production",\n  "proxy": "nginx_reverse",\n  "active_ports": "4010-4050"\n}'
    };
  }

  showModal(modalElement) {
    if (modalElement) {
      modalElement.style.display = "flex";
      modalElement.classList.add("open");
    }
  }

  closeModal(modalElement) {
    if (modalElement) {
      modalElement.style.display = "none";
      modalElement.classList.remove("open");
    }
  }

  handleThemeChange(themeName) {
    document.body.className = "";
    if (themeName !== "default") {
      document.body.classList.add(`theme-${themeName}`);
    }
    localStorage.setItem("theme", themeName);
    this.currentTheme = themeName;
    if (this.themeModal) this.closeModal(this.themeModal);
  }

  initGame(outputElement) {
    this.gameActive = true;
    this.printToOutput(outputElement, "🎮 Initializing mathematical guess combination sandbox...", "success");
    this.printToOutput(outputElement, "System Core: Predict the target code string! Type guess equations using standard formatting.", "info");
    
    const target = Math.floor(Math.random() * 10) + 1;
    this.printToOutput(outputElement, "Hint: The number ranges between 1 and 10. Type 'calc <number>' to check compliance.", "info");
    this.gameHandler = target; 
  }

  endGame() {
    this.gameActive = false;
    this.gameHandler = null;
  }

  startMatrixEffect(outputElement) {
    this.stopMatrixEffect();
    if (!outputElement) return;
    
    const container = document.createElement("div");
    container.className = "matrix-container";
    container.style.width = "100%";
    container.style.height = "300px";
    container.style.position = "relative";
    container.style.background = "#000";
    container.style.overflow = "hidden";
    container.style.marginTop = "10px";
    
    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    container.appendChild(canvas);
    
    outputElement.appendChild(container);
    
    const ctx = canvas.getContext("2d");
    canvas.width = container.clientWidth;
    canvas.height = 300;

    const matrixChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789📡⚙️🔒";
    const alphabet = matrixChars.split("");

    const fontSize = 16;
    const columns = canvas.width / fontSize;

    const rainDrops = [];
    for (let x = 0; x < columns; x++) {
      rainDrops[x] = 1;
    }

    const draw = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#0F0";
      ctx.font = fontSize + "px monospace";

      for (let i = 0; i < rainDrops.length; i++) {
        const text = alphabet[Math.floor(Math.random() * alphabet.length)];
        ctx.fillText(text, i * fontSize, rainDrops[i] * fontSize);

        if (rainDrops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          rainDrops[i] = 0;
        }
        rainDrops[i]++;
      }
    };

    this.matrixInterval = setInterval(draw, 30);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  stopMatrixEffect() {
    if (this.matrixInterval) {
      clearInterval(this.matrixInterval);
      this.matrixInterval = null;
    }
  }

  showWeather(location, outputElement) {
    const loc = location || "Mumbai";
    const weatherContainer = document.createElement("div");
    weatherContainer.className = "weather-container";
    weatherContainer.style.border = "1px solid var(--border-color)";
    weatherContainer.style.padding = "10px";
    weatherContainer.style.marginTop = "10px";
    weatherContainer.style.borderRadius = "4px";
    
    weatherContainer.innerHTML = `
      <div class="weather-header" style="color: var(--text-bright); font-weight: bold;">🌤️ Environmental Station Report: ${loc}</div>
      <div class="weather-body" style="color: #ffffff; margin-top: 5px;">
        Atmospheric Mode: Clean Stream Flow<br/>
        Temperature: 31°C / Thermal Feel: 35°C<br/>
        Humidity Index: 68% | Node Vector: NW 12 km/h
      </div>
    `;
    outputElement.appendChild(weatherContainer);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  calculate(expression, outputElement) {
    if (!expression) {
      this.printToOutput(outputElement, "Error: Provide equation fields. E.g., 'calc 4 * 5'", "error");
      return;
    }
    try {
      const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, "");
      const result = new Function(`return ${sanitized}`)();
      
      if (this.gameActive && parseInt(sanitized.trim()) === this.gameHandler) {
        this.printToOutput(outputElement, `🎯 Equation Output Evaluated: ${result} - Target verified! Sandboxed puzzle resolved successfully.`, "success");
        this.endGame();
      } else {
        this.printToOutput(outputElement, `🔢 Equation Output Evaluated: ${result}`, "success");
      }
    } catch (err) {
      this.printToOutput(outputElement, "Evaluation Failure: Equation contains unparsable mathematical tokens.", "error");
    }
  }

  generatePDF() {
    window.print();
  }

  generateLinkedInCover(outputElement) {
    if (!outputElement) return;
    const coverContainer = document.createElement("div");
    coverContainer.style.width = "100%";
    coverContainer.style.maxWidth = "750px";
    coverContainer.style.height = "240px";
    coverContainer.style.background = "linear-gradient(135deg, #141414 0%, #1f1f1f 100%)";
    coverContainer.style.border = "2px dashed var(--text-color)";
    coverContainer.style.position = "relative";
    coverContainer.style.margin = "15px 0";
    coverContainer.style.display = "flex";
    coverContainer.style.flexDirection = "column";
    coverContainer.style.justifyContent = "center";
    coverContainer.style.alignItems = "center";
    coverContainer.style.borderRadius = "8px";

    const title = document.createElement("h2");
    title.textContent = "AADESH PANDEY";
    title.style.color = "var(--text-color)";
    title.style.fontFamily = "inherit";
    title.style.letterSpacing = "3px";
    coverContainer.appendChild(title);

    const sub = document.createElement("div");
    sub.textContent = "FULL-STACK DEVELOPER | BACKEND INFRASTRUCTURE ARCHITECT";
    sub.style.color = "#ffffff";
    sub.style.fontSize = "13px";
    sub.style.marginTop = "10px";
    sub.style.fontFamily = "inherit";
    sub.style.letterSpacing = "1px";
    coverContainer.appendChild(sub);

    outputElement.appendChild(coverContainer);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }
}

// Initialize application space on document state ready
document.addEventListener("DOMContentLoaded", () => {
  window.TerminalApp = new TerminalResume();
});
