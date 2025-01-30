console.debug("in content.js");

let animationState = "stopped";
let currentPhase = 0;
let animationTimer = null;
let widget = null;
let isPlacementMode = false;

function createWidget() {
  const div = document.createElement("div");
  div.className = "breathing-widget";
  div.innerHTML = `
    <div class="circle"></div>
    <div class="progress">
      <div class="dot"></div>
    </div>
    <div class="inner-circle"></div>
    <div class="phase">Click to start</div>
  `;
  return div;
}

function animatePhase(widget, phase) {
  const progress = widget.querySelector(".progress");
  const innerCircle = widget.querySelector(".inner-circle");
  const phaseText = widget.querySelector(".phase");

  progress.style.animation = "none";
  innerCircle.style.animation = "none";

  void progress.offsetWidth;
  void innerCircle.offsetWidth;

  switch (phase) {
    case 0:
      phaseText.textContent = "In";
      progress.style.animation = "clockwise 4s linear forwards";
      innerCircle.style.animation = "expand 4s linear forwards";
      break;
    case 1:
      phaseText.textContent = "Hold";
      progress.style.transform = "rotate(360deg)";
      innerCircle.style.transform = "scale(1)";
      break;
    case 2:
      phaseText.textContent = "Out";
      progress.style.animation = "counterclockwise 4s linear forwards";
      innerCircle.style.animation = "contract 4s linear forwards";
      break;
    case 3:
      phaseText.textContent = "Hold";
      progress.style.transform = "rotate(0deg)";
      innerCircle.style.transform = "scale(0.8)";
      break;
  }
}

function toggleAnimation(widget) {
  if (animationState === "stopped") {
    animationState = "running";
    currentPhase = 0;

    function animate() {
      if (animationState === "running") {
        animatePhase(widget, currentPhase);
        animationTimer = setTimeout(() => {
          currentPhase = (currentPhase + 1) % 4;
          animate();
        }, 4000);
      }
    }

    animate();
  } else {
    animationState = "stopped";
    clearTimeout(animationTimer);

    const progress = widget.querySelector(".progress");
    const innerCircle = widget.querySelector(".inner-circle");
    const phaseText = widget.querySelector(".phase");

    progress.style.animation = "none";
    innerCircle.style.animation = "none";
    progress.style.transform = "rotate(0deg)";
    innerCircle.style.transform = "scale(0.8)";
    phaseText.textContent = "Click to start";
  }
}

async function initWidget() {
  const hostname = window.location.hostname;
  const widgetData = await chrome.storage.local.get(hostname);

  if (widgetData[hostname]) {
    widget = createWidget();
    document.body.appendChild(widget);

    const { x, y } = widgetData[hostname];
    widget.style.left = x + "px";
    widget.style.top = y + "px";

    widget.onclick = (e) => {
      e.stopPropagation();
      if (!isPlacementMode) {
        toggleAnimation(widget);
      }
    };
  }
}

function enablePlacementMode() {
  if (!widget) {
    widget = createWidget();
    document.body.appendChild(widget);
  }

  isPlacementMode = true;
  widget.classList.add("placement-mode");

  function handleMouseMove(e) {
    widget.style.left = e.clientX - 30 + "px";
    widget.style.top = e.clientY - 30 + "px";
  }

  function handleClick(e) {
    isPlacementMode = false;
    widget.classList.remove("placement-mode");
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("click", handleClick);

    const hostname = window.location.hostname;
    const position = {
      x: parseInt(widget.style.left),
      y: parseInt(widget.style.top),
    };

    chrome.storage.local.set({ [hostname]: position });

    widget.onclick = (e) => {
      e.stopPropagation();
      if (!isPlacementMode) {
        toggleAnimation(widget);
      }
    };
  }

  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("click", handleClick);
}

initWidget();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "enablePlacement") {
    enablePlacementMode();
  } else if (request.action === "removeWidget") {
    if (widget) {
      widget.remove();
      widget = null;
    }
  }
});
