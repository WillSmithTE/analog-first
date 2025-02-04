const ANIMATION_DURATION_MS = 4000;
const WIDGET_SIZE_PX = 20;

const PHASES = {
  INHALE: {
    index: 0,
    text: "In",
    progress: { animation: "clockwise 4s linear forwards" },
    circle: { animation: "expand 4s linear forwards" },
  },
  HOLD_FULL: {
    index: 1,
    text: "Hold",
    progress: { transform: "rotate(360deg)" },
    circle: { transform: "scale(1)" },
  },
  EXHALE: {
    index: 2,
    text: "Out",
    progress: { animation: "counterclockwise 4s linear forwards" },
    circle: { animation: "contract 4s linear forwards" },
  },
  HOLD_EMPTY: {
    index: 3,
    text: "Hold",
    progress: { transform: "rotate(0deg)" },
    circle: { transform: "scale(0.8)" },
  },
};

class BreathingWidget {
  constructor() {
    this.element = null;
    this.animationState = "stopped";
    this.currentPhase = 0;
    this.animationTimer = null;
    this.isPlacementMode = false;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
  }

  createElement() {
    const div = document.createElement("div");
    div.className = "breathing-widget";
    div.style.opacity = "0.3";
    div.innerHTML = `
      <div class="circle"></div>
      <div class="progress">
        <div class="dot"></div>
      </div>
      <div class="inner-circle"></div>
      <div class="phase" style="font-size: 8px;">Start</div>
    `;

    div.addEventListener("mouseenter", () => {
      div.style.opacity = "0.8";
    });
    div.addEventListener("mouseleave", () => {
      if (this.animationState !== "running") {
        div.style.opacity = "0.3";
      }
    });

    div.addEventListener("mousedown", this.handleDragStart.bind(this));
    document.addEventListener("mousemove", this.handleDragMove.bind(this));
    document.addEventListener("mouseup", this.handleDragEnd.bind(this));

    return div;
  }

  handleDragStart(e) {
    if (this.isPlacementMode) return;

    this.isDragging = true;
    const rect = this.element.getBoundingClientRect();

    this.dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    this.element.style.cursor = "grabbing";
    this.element.style.opacity = "0.8";
  }

  handleDragMove(e) {
    if (!this.isDragging) return;

    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    const rawX = e.clientX + scrollX - this.dragOffset.x;
    const rawY = e.clientY + scrollY - this.dragOffset.y;

    const { x, y } = this.constrainToViewport(rawX, rawY);
    this.setPosition(x, y);

    this.savePosition();
  }

  handleDragEnd() {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.element.style.cursor = "grab";

    if (this.animationState !== "running") {
      this.element.style.opacity = "0.3";
    }
  }

  constrainToViewport(x, y) {
    const maxX = document.documentElement.scrollWidth - WIDGET_SIZE_PX * 2;
    const maxY = document.documentElement.scrollHeight - WIDGET_SIZE_PX * 2;

    return {
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY)),
    };
  }

  async savePosition() {
    const hostname = window.location.hostname;
    const position = {
      x: parseInt(this.element.style.left),
      y: parseInt(this.element.style.top),
    };
    await chrome.storage.local.set({ [hostname]: position });
  }

  animatePhase(phase) {
    const progress = this.element.querySelector(".progress");
    const innerCircle = this.element.querySelector(".inner-circle");
    const phaseText = this.element.querySelector(".phase");

    progress.style.animation = "none";
    innerCircle.style.animation = "none";

    void progress.offsetWidth;
    void innerCircle.offsetWidth;

    const phaseConfig = Object.values(PHASES)[phase];
    phaseText.textContent = phaseConfig.text;

    Object.assign(progress.style, phaseConfig.progress);
    Object.assign(innerCircle.style, phaseConfig.circle);
  }

  resetAnimation() {
    const progress = this.element.querySelector(".progress");
    const innerCircle = this.element.querySelector(".inner-circle");
    const phaseText = this.element.querySelector(".phase");

    progress.style.animation = "none";
    innerCircle.style.animation = "none";
    progress.style.transform = "rotate(0deg)";
    innerCircle.style.transform = "scale(0.8)";
    phaseText.textContent = "Start";
    this.element.style.opacity = "0.3";
  }

  toggleAnimation() {
    if (this.animationState === "stopped") {
      this.startAnimation();
    } else {
      this.stopAnimation();
    }
  }

  startAnimation() {
    this.animationState = "running";
    this.currentPhase = 0;
    this.element.style.opacity = "0.5";

    const animate = () => {
      if (this.animationState === "running") {
        this.animatePhase(this.currentPhase);
        this.animationTimer = setTimeout(() => {
          this.currentPhase =
            (this.currentPhase + 1) % Object.keys(PHASES).length;
          animate();
        }, ANIMATION_DURATION_MS);
      }
    };

    animate();
  }

  stopAnimation() {
    this.animationState = "stopped";
    clearTimeout(this.animationTimer);
    this.resetAnimation();
  }

  setPosition(x, y) {
    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;
  }

  enablePlacementMode() {
    if (!this.element) {
      this.element = this.createElement();
      document.body.appendChild(this.element);
    }

    this.isPlacementMode = true;
    this.element.classList.add("placement-mode");
    this.element.style.opacity = "0.8";

    let lastMouseX = 0;
    let lastMouseY = 0;

    const updatePosition = () => {
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;

      const rawX = lastMouseX + scrollX - WIDGET_SIZE_PX;
      const rawY = lastMouseY + scrollY - WIDGET_SIZE_PX;

      const { x, y } = this.constrainToViewport(rawX, rawY);
      this.setPosition(x, y);
    };

    const handleMouseMove = (e) => {
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      updatePosition();
    };

    const handleScroll = () => {
      if (this.isPlacementMode) {
        updatePosition();
      }
    };

    const removeEventListeners = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("scroll", handleScroll);
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        removeEventListeners();
        this.remove();
      }
    };

    const handleClick = async () => {
      this.isPlacementMode = false;
      this.element.classList.remove("placement-mode");
      this.element.style.opacity = "0.3";

      removeEventListeners();

      await this.savePosition();
      this.setupClickHandler();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("scroll", handleScroll);
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleEscape);
  }

  setupClickHandler() {
    let dragThreshold = 5;
    let startX, startY;

    this.element.addEventListener("mousedown", (e) => {
      startX = e.clientX;
      startY = e.clientY;
    });

    this.element.addEventListener("mouseup", (e) => {
      const deltaX = Math.abs(e.clientX - startX);
      const deltaY = Math.abs(e.clientY - startY);

      // Only toggle animation if it wasn't a drag
      if (deltaX < dragThreshold && deltaY < dragThreshold) {
        this.toggleAnimation();
      }
    });
  }

  async initialize() {
    const hostname = window.location.hostname;
    const widgetData = await chrome.storage.local.get(hostname);

    if (widgetData[hostname]) {
      this.element = this.createElement();
      document.body.appendChild(this.element);

      const { x, y } = widgetData[hostname];
      this.setPosition(x, y);
      this.setupClickHandler();
    }
  }

  remove() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}

const breathingWidget = new BreathingWidget();
breathingWidget.initialize();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "enablePlacement":
      breathingWidget.enablePlacementMode();
      break;
    case "removeWidget":
      breathingWidget.remove();
      break;
  }
});
