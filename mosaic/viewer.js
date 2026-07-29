(() => {
  "use strict";

  const CONFIG_URL = "./mosaic-config.json";
  const ENCRYPTED_ASSET_URL = "./assets/skald-museum-art-mosaic.enc";
  const SCHEMA_VERSION = 2;
  const MIN_SCALE = 0.005;
  const MAX_SCALE = 10;

  const gate = document.querySelector("[data-access-gate]");
  const form = document.querySelector("[data-access-form]");
  const input = document.querySelector("[data-access-input]");
  const submit = document.querySelector("[data-access-submit]");
  const accessError = document.querySelector("[data-access-error]");
  const accessStatus = document.querySelector("[data-access-status]");
  const viewer = document.querySelector("[data-mosaic-viewer]");
  const stage = document.querySelector("[data-mosaic-stage]");
  const image = document.querySelector("[data-mosaic-image]");
  const placeholder = document.querySelector("[data-asset-placeholder]");
  const status = document.querySelector("[data-asset-status]");
  const zoomOutput = document.querySelector("[data-zoom-output]");
  const download = document.querySelector("[data-download]");

  const view = {
    loaded: false,
    fitted: true,
    scale: 1,
    x: 0,
    y: 0,
    drag: null,
    objectUrl: null,
    unlocking: false,
  };

  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

  const decodeBase64 = (value, expectedLength) => {
    if (typeof value !== "string") throw new Error("Invalid encrypted-mosaic metadata.");
    const decoded = Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
    if (decoded.length !== expectedLength) {
      throw new Error("Invalid encrypted-mosaic metadata.");
    }
    return decoded;
  };

  const equalBytes = (left, right) => {
    if (left.length !== right.length) return false;
    let difference = 0;
    for (let index = 0; index < left.length; index += 1) {
      difference |= left[index] ^ right[index];
    }
    return difference === 0;
  };

  const additionalData = (plaintextContract) =>
    new TextEncoder().encode(
      [
        "skald-mosaic-v2",
        `mediaType=${plaintextContract.mediaType}`,
        `bytes=${plaintextContract.bytes}`,
        `sha256=${plaintextContract.sha256}`,
        `width=${plaintextContract.width}`,
        `height=${plaintextContract.height}`,
      ].join("\n"),
    );

  const sha256Hex = async (value) =>
    [...new Uint8Array(await crypto.subtle.digest("SHA-256", value))]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

  const loadConfig = async () => {
    const response = await fetch(CONFIG_URL, {
      cache: "no-store",
      credentials: "omit",
    });
    if (!response.ok) throw new Error("The encrypted mosaic is not available.");
    const config = await response.json();

    if (
      config?.schemaVersion !== SCHEMA_VERSION ||
      config?.plaintext?.mediaType !== "image/jpeg" ||
      !Number.isSafeInteger(config?.plaintext?.bytes) ||
      config.plaintext.bytes <= 0 ||
      !/^[a-f0-9]{64}$/.test(config?.plaintext?.sha256 ?? "") ||
      !Number.isSafeInteger(config?.plaintext?.width) ||
      config.plaintext.width <= 0 ||
      !Number.isSafeInteger(config?.plaintext?.height) ||
      config.plaintext.height <= 0 ||
      config?.kdf?.name !== "PBKDF2" ||
      config?.kdf?.hash !== "SHA-256" ||
      !Number.isSafeInteger(config?.kdf?.iterations) ||
      config.kdf.iterations < 600_000 ||
      config?.verifier?.hash !== "SHA-256" ||
      config?.cipher?.name !== "AES-GCM" ||
      config?.cipher?.url !== ENCRYPTED_ASSET_URL
    ) {
      throw new Error("Invalid encrypted-mosaic metadata.");
    }

    return {
      plaintext: config.plaintext,
      iterations: config.kdf.iterations,
      salt: decodeBase64(config.kdf.salt, 16),
      verifier: decodeBase64(config.verifier.value, 32),
      iv: decodeBase64(config.cipher.iv, 12),
      assetUrl: config.cipher.url,
    };
  };

  const deriveKey = async (password, config) => {
    const passwordKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password.normalize("NFKC")),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    const bits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        salt: config.salt,
        iterations: config.iterations,
      },
      passwordKey,
      512,
    );
    const derived = new Uint8Array(bits);
    const verifier = new Uint8Array(await crypto.subtle.digest("SHA-256", derived.slice(32)));
    if (!equalBytes(verifier, config.verifier)) return null;

    return crypto.subtle.importKey(
      "raw",
      derived.slice(0, 32),
      "AES-GCM",
      false,
      ["decrypt"],
    );
  };

  const render = () => {
    image.style.transform = `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`;
    zoomOutput.value = `${Math.round(view.scale * 100)}%`;
    zoomOutput.textContent = zoomOutput.value;
  };

  const fitImage = () => {
    if (!view.loaded) return;
    const bounds = stage.getBoundingClientRect();
    const inset = Math.min(48, bounds.width * 0.06, bounds.height * 0.06);
    const widthScale = (bounds.width - inset * 2) / image.naturalWidth;
    const heightScale = (bounds.height - inset * 2) / image.naturalHeight;
    view.scale = clamp(Math.min(widthScale, heightScale), MIN_SCALE, MAX_SCALE);
    view.x = (bounds.width - image.naturalWidth * view.scale) / 2;
    view.y = (bounds.height - image.naturalHeight * view.scale) / 2;
    view.fitted = true;
    render();
  };

  const showActualSize = () => {
    if (!view.loaded) return;
    const bounds = stage.getBoundingClientRect();
    view.scale = 1;
    view.x = (bounds.width - image.naturalWidth) / 2;
    view.y = (bounds.height - image.naturalHeight) / 2;
    view.fitted = false;
    render();
  };

  const zoomAt = (nextScale, clientX, clientY) => {
    if (!view.loaded) return;
    const bounds = stage.getBoundingClientRect();
    const localX = clientX - bounds.left;
    const localY = clientY - bounds.top;
    const imageX = (localX - view.x) / view.scale;
    const imageY = (localY - view.y) / view.scale;
    view.scale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    view.x = localX - imageX * view.scale;
    view.y = localY - imageY * view.scale;
    view.fitted = false;
    render();
  };

  const zoomFromCenter = (factor) => {
    const bounds = stage.getBoundingClientRect();
    zoomAt(
      view.scale * factor,
      bounds.left + bounds.width / 2,
      bounds.top + bounds.height / 2,
    );
  };

  const loadImage = (objectUrl) =>
    new Promise((resolveLoad, rejectLoad) => {
      image.addEventListener("load", resolveLoad, { once: true });
      image.addEventListener(
        "error",
        () => rejectLoad(new Error("The decrypted mosaic is not a readable image.")),
        { once: true },
      );
      image.src = objectUrl;
    });

  const decryptMosaic = async (password) => {
    if (!crypto?.subtle) throw new Error("This browser cannot open the encrypted mosaic.");
    const config = await loadConfig();
    const key = await deriveKey(password, config);
    if (!key) return false;

    accessStatus.textContent = "Access accepted. Decrypting the museum-art atlas…";
    const response = await fetch(config.assetUrl, {
      cache: "no-store",
      credentials: "omit",
    });
    if (!response.ok) throw new Error("The encrypted mosaic is not available.");
    const encrypted = await response.arrayBuffer();
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: config.iv,
        additionalData: additionalData(config.plaintext),
        tagLength: 128,
      },
      key,
      encrypted,
    );
    const bytes = new Uint8Array(plaintext);
    if (
      plaintext.byteLength !== config.plaintext.bytes ||
      (await sha256Hex(plaintext)) !== config.plaintext.sha256 ||
      bytes.length < 4 ||
      bytes[0] !== 0xff ||
      bytes[1] !== 0xd8 ||
      bytes[2] !== 0xff ||
      bytes.at(-2) !== 0xff ||
      bytes.at(-1) !== 0xd9
    ) {
      throw new Error("The decrypted mosaic is not a readable image.");
    }

    view.objectUrl = URL.createObjectURL(
      new Blob([plaintext], { type: config.plaintext.mediaType }),
    );
    try {
      await loadImage(view.objectUrl);
      if (
        image.naturalWidth !== config.plaintext.width ||
        image.naturalHeight !== config.plaintext.height
      ) {
        throw new Error("The decrypted mosaic dimensions do not match its approval.");
      }
    } catch (error) {
      URL.revokeObjectURL(view.objectUrl);
      view.objectUrl = null;
      image.removeAttribute("src");
      throw error;
    }

    view.loaded = true;
    image.hidden = false;
    placeholder.hidden = true;
    download.href = view.objectUrl;
    download.download = "skald-museum-art-mosaic.jpg";
    download.hidden = false;
    status.textContent = `${image.naturalWidth.toLocaleString()} × ${image.naturalHeight.toLocaleString()} pixels · decrypted in this tab`;
    return true;
  };

  const unlock = async (password) => {
    if (view.unlocking) return;
    view.unlocking = true;
    submit.disabled = true;
    input.disabled = true;
    accessError.hidden = true;
    accessStatus.textContent = "Checking the encrypted access key…";

    try {
      const decrypted = await decryptMosaic(password);
      if (!decrypted) {
        accessError.textContent = "The access word is not recognized.";
        accessError.hidden = false;
        input.select();
        return;
      }

      input.value = "";
      gate.hidden = true;
      viewer.hidden = false;
      document.body.dataset.locked = "false";
      fitImage();
      stage.focus({ preventScroll: true });
    } catch {
      accessError.textContent = "The encrypted viewing room is unavailable. Please try again.";
      accessError.hidden = false;
      input.select();
    } finally {
      accessStatus.textContent = "The image is decrypted only in this tab after access is accepted.";
      input.disabled = false;
      submit.disabled = false;
      view.unlocking = false;
    }
  };

  const lock = () => {
    view.loaded = false;
    view.drag = null;
    view.scale = 1;
    view.x = 0;
    view.y = 0;
    image.hidden = true;
    image.removeAttribute("src");
    placeholder.hidden = false;
    download.hidden = true;
    download.removeAttribute("href");
    if (view.objectUrl) URL.revokeObjectURL(view.objectUrl);
    view.objectUrl = null;
    viewer.hidden = true;
    gate.hidden = false;
    document.body.dataset.locked = "true";
    input.value = "";
    input.focus({ preventScroll: true });
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await unlock(input.value);
  });

  document.querySelector("[data-action='zoom-in']").addEventListener("click", () => zoomFromCenter(1.25));
  document.querySelector("[data-action='zoom-out']").addEventListener("click", () => zoomFromCenter(0.8));
  document.querySelector("[data-action='fit']").addEventListener("click", fitImage);
  document.querySelector("[data-action='actual']").addEventListener("click", showActualSize);
  document.querySelector("[data-action='lock']").addEventListener("click", lock);

  stage.addEventListener(
    "wheel",
    (event) => {
      if (!view.loaded) return;
      event.preventDefault();
      zoomAt(view.scale * Math.exp(-event.deltaY * 0.0015), event.clientX, event.clientY);
    },
    { passive: false },
  );

  stage.addEventListener("dblclick", (event) => {
    zoomAt(view.scale * 1.75, event.clientX, event.clientY);
  });

  stage.addEventListener("pointerdown", (event) => {
    if (!view.loaded || event.button !== 0) return;
    stage.setPointerCapture(event.pointerId);
    view.drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      imageX: view.x,
      imageY: view.y,
    };
    view.fitted = false;
    stage.classList.add("is-dragging");
  });

  stage.addEventListener("pointermove", (event) => {
    if (!view.drag || view.drag.pointerId !== event.pointerId) return;
    view.x = view.drag.imageX + event.clientX - view.drag.startX;
    view.y = view.drag.imageY + event.clientY - view.drag.startY;
    render();
  });

  const finishDrag = (event) => {
    if (!view.drag || view.drag.pointerId !== event.pointerId) return;
    view.drag = null;
    stage.classList.remove("is-dragging");
  };

  stage.addEventListener("pointerup", finishDrag);
  stage.addEventListener("pointercancel", finishDrag);

  stage.addEventListener("keydown", (event) => {
    if (!view.loaded) return;
    const panStep = event.shiftKey ? 160 : 48;
    const actions = {
      "+": () => zoomFromCenter(1.25),
      "=": () => zoomFromCenter(1.25),
      "-": () => zoomFromCenter(0.8),
      "0": showActualSize,
      f: fitImage,
      F: fitImage,
      ArrowLeft: () => {
        view.x += panStep;
        view.fitted = false;
        render();
      },
      ArrowRight: () => {
        view.x -= panStep;
        view.fitted = false;
        render();
      },
      ArrowUp: () => {
        view.y += panStep;
        view.fitted = false;
        render();
      },
      ArrowDown: () => {
        view.y -= panStep;
        view.fitted = false;
        render();
      },
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  });

  window.addEventListener("resize", () => {
    if (view.loaded && view.fitted) fitImage();
  });

  window.addEventListener("pagehide", () => {
    if (view.objectUrl) URL.revokeObjectURL(view.objectUrl);
  });
})();
