(() => {
  "use strict";

  const CONFIG_URL = "./mosaic-config.json";
  const ENCRYPTED_ASSET_URL = "./assets/skald-museum-art-mosaic.enc";
  const ENCRYPTED_CATALOG_URL = "./assets/skald-museum-art-map.enc";
  const SCHEMA_VERSION = 2;
  const MIN_SCALE = 0.005;
  const MAX_SCALE = 10;
  const DRAG_THRESHOLD = 5;

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
  const artworkPicker = document.querySelector("[data-artwork-picker]");
  const artworkSelection = document.querySelector("[data-artwork-selection]");
  const artworkInfo = document.querySelector("[data-artwork-info]");
  const artworkIndex = document.querySelector("[data-artwork-index]");
  const artworkTitle = document.querySelector("[data-artwork-title]");
  const artworkCreator = document.querySelector("[data-artwork-creator]");
  const artworkMuseum = document.querySelector("[data-artwork-museum]");
  const artworkStatus = document.querySelector("[data-artwork-status]");
  const artworkLicense = document.querySelector("[data-artwork-license]");
  const artworkProvider = document.querySelector("[data-artwork-provider]");
  const artworkSourceLinks = document.querySelector("[data-artwork-source-links]");

  const activePointers = new Map();
  const view = {
    loaded: false,
    fitted: true,
    scale: 1,
    x: 0,
    y: 0,
    gesture: null,
    gestureMoved: false,
    suppressClick: false,
    objectUrl: null,
    unlocking: false,
    artworks: [],
    selected: null,
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

  const mosaicAdditionalData = (plaintextContract) =>
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

  const catalogAdditionalData = (plaintextContract) =>
    new TextEncoder().encode(
      [
        "skald-mosaic-catalog-v2",
        `mediaType=${plaintextContract.mediaType}`,
        `bytes=${plaintextContract.bytes}`,
        `sha256=${plaintextContract.sha256}`,
        `width=${plaintextContract.width}`,
        `height=${plaintextContract.height}`,
        `artworkCount=${plaintextContract.artworkCount}`,
      ].join("\n"),
    );

  const sha256Hex = async (value) =>
    [...new Uint8Array(await crypto.subtle.digest("SHA-256", value))]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

  const isPositiveInteger = (value) => Number.isSafeInteger(value) && value > 0;

  const loadConfig = async () => {
    const response = await fetch(CONFIG_URL, {
      cache: "no-store",
      credentials: "omit",
    });
    if (!response.ok) throw new Error("The encrypted mosaic is not available.");
    const config = await response.json();
    const catalogContract = config?.catalog?.plaintext;

    if (
      config?.schemaVersion !== SCHEMA_VERSION ||
      config?.plaintext?.mediaType !== "image/jpeg" ||
      !isPositiveInteger(config?.plaintext?.bytes) ||
      !/^[a-f0-9]{64}$/.test(config?.plaintext?.sha256 ?? "") ||
      !isPositiveInteger(config?.plaintext?.width) ||
      !isPositiveInteger(config?.plaintext?.height) ||
      config?.kdf?.name !== "PBKDF2" ||
      config?.kdf?.hash !== "SHA-256" ||
      !Number.isSafeInteger(config?.kdf?.iterations) ||
      config.kdf.iterations < 600_000 ||
      config?.verifier?.hash !== "SHA-256" ||
      config?.cipher?.name !== "AES-GCM" ||
      config?.cipher?.url !== ENCRYPTED_ASSET_URL ||
      catalogContract?.mediaType !== "application/json" ||
      !isPositiveInteger(catalogContract?.bytes) ||
      !/^[a-f0-9]{64}$/.test(catalogContract?.sha256 ?? "") ||
      catalogContract?.width !== config.plaintext.width ||
      catalogContract?.height !== config.plaintext.height ||
      !isPositiveInteger(catalogContract?.artworkCount) ||
      config?.catalog?.cipher?.name !== "AES-GCM" ||
      config.catalog.cipher.url !== ENCRYPTED_CATALOG_URL
    ) {
      throw new Error("Invalid encrypted-mosaic metadata.");
    }

    const imageIv = decodeBase64(config.cipher.iv, 12);
    const catalogIv = decodeBase64(config.catalog.cipher.iv, 12);
    if (equalBytes(imageIv, catalogIv)) {
      throw new Error("Invalid encrypted-mosaic metadata.");
    }

    return {
      plaintext: config.plaintext,
      iterations: config.kdf.iterations,
      salt: decodeBase64(config.kdf.salt, 16),
      verifier: decodeBase64(config.verifier.value, 32),
      image: {
        iv: imageIv,
        assetUrl: config.cipher.url,
      },
      catalog: {
        plaintext: catalogContract,
        iv: catalogIv,
        assetUrl: config.catalog.cipher.url,
      },
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

  const decryptBytes = (encrypted, key, iv, additionalData) =>
    crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData,
        tagLength: 128,
      },
      key,
      encrypted,
    );

  const parseHttpsUrl = (value) => {
    if (!value) return null;
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url.href : null;
    } catch {
      return null;
    }
  };

  const validateArtworkMap = (catalog, config) => {
    if (
      catalog?.width !== config.plaintext.width ||
      catalog?.height !== config.plaintext.height ||
      !Array.isArray(catalog?.artworks) ||
      catalog.artworks.length !== config.catalog.plaintext.artworkCount
    ) {
      throw new Error("The artwork catalog does not match the mosaic.");
    }

    const ids = new Set();
    const cells = new Set();
    for (const [offset, artwork] of catalog.artworks.entries()) {
      if (
        artwork?.index !== offset + 1 ||
        typeof artwork?.id !== "string" ||
        !/^[a-z0-9][a-z0-9-]*$/.test(artwork.id) ||
        ids.has(artwork.id) ||
        !["x", "y", "width", "height"].every((field) => Number.isSafeInteger(artwork[field])) ||
        artwork.x < 0 ||
        artwork.y < 0 ||
        artwork.width <= 0 ||
        artwork.height <= 0 ||
        artwork.x + artwork.width > catalog.width ||
        artwork.y + artwork.height > catalog.height ||
        !["title", "creator", "date", "source_provider", "license"].every(
          (field) => typeof artwork[field] === "string" && artwork[field].trim(),
        ) ||
        typeof artwork.on_view !== "boolean" ||
        !(parseHttpsUrl(artwork.museum_url) || parseHttpsUrl(artwork.file_page_url))
      ) {
        throw new Error("The artwork catalog contains an invalid record.");
      }

      const cell = `${artwork.x}:${artwork.y}:${artwork.width}:${artwork.height}`;
      if (cells.has(cell)) throw new Error("The artwork catalog contains an invalid record.");
      if (
        artwork.on_view &&
        !["museum", "gallery", "as_of"].every(
          (field) => typeof artwork[field] === "string" && artwork[field].trim(),
        )
      ) {
        throw new Error("The artwork catalog contains an invalid display claim.");
      }

      ids.add(artwork.id);
      cells.add(cell);
    }

    return catalog.artworks;
  };

  const renderSelection = () => {
    if (!view.selected || !view.loaded) {
      artworkSelection.hidden = true;
      return;
    }
    artworkSelection.style.left = `${view.x + view.selected.x * view.scale}px`;
    artworkSelection.style.top = `${view.y + view.selected.y * view.scale}px`;
    artworkSelection.style.width = `${view.selected.width * view.scale}px`;
    artworkSelection.style.height = `${view.selected.height * view.scale}px`;
    artworkSelection.hidden = false;
  };

  const render = () => {
    image.style.transform = `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`;
    zoomOutput.value = `${Math.round(view.scale * 100)}%`;
    zoomOutput.textContent = zoomOutput.value;
    renderSelection();
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

  const clearPicker = () => {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Choose artwork…";
    artworkPicker.replaceChildren(option);
    artworkPicker.value = "";
    artworkPicker.disabled = true;
  };

  const populatePicker = () => {
    clearPicker();
    const fragment = document.createDocumentFragment();
    for (const artwork of view.artworks) {
      const option = document.createElement("option");
      option.value = artwork.id;
      option.textContent = `${String(artwork.index).padStart(3, "0")} · ${artwork.title} — ${artwork.museum || artwork.source_provider}`;
      fragment.append(option);
    }
    artworkPicker.append(fragment);
    artworkPicker.disabled = false;
  };

  const clearArtworkText = () => {
    for (const element of [
      artworkIndex,
      artworkTitle,
      artworkCreator,
      artworkMuseum,
      artworkStatus,
      artworkLicense,
      artworkProvider,
    ]) {
      element.textContent = "";
    }
    artworkSourceLinks.replaceChildren();
  };

  const closeArtworkDetails = () => {
    view.selected = null;
    artworkInfo.hidden = true;
    artworkSelection.hidden = true;
    artworkPicker.value = "";
    clearArtworkText();
  };

  const formatAsOf = (value) => {
    if (!/^\d{4}-\d{2}$/.test(value ?? "")) return value || "";
    const [year, month] = value.split("-").map(Number);
    if (month < 1 || month > 12) return value;
    return new Intl.DateTimeFormat("en", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, 1)));
  };

  const addSourceLink = (url, label) => {
    const safeUrl = parseHttpsUrl(url);
    if (!safeUrl) return;
    const link = document.createElement("a");
    link.href = safeUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = label;
    artworkSourceLinks.append(link);
  };

  const showArtworkDetails = (artwork) => {
    view.selected = artwork;
    artworkIndex.textContent = String(artwork.index).padStart(3, "0");
    artworkTitle.textContent = artwork.title;
    artworkCreator.textContent = [artwork.creator, artwork.date].filter(Boolean).join(" · ");
    artworkMuseum.textContent = artwork.museum || artwork.source_provider;
    if (artwork.on_view) {
      artworkStatus.textContent = [
        "On view",
        artwork.gallery,
        artwork.as_of ? `as of ${formatAsOf(artwork.as_of)}` : "",
      ].filter(Boolean).join(" · ") + ". Display status can change; check the museum before visiting.";
    } else {
      artworkStatus.textContent = artwork.as_of
        ? `Collection record · checked ${formatAsOf(artwork.as_of)}.`
        : "Collection record.";
    }
    artworkLicense.textContent = artwork.license;
    artworkProvider.textContent = `Source metadata: ${artwork.source_provider}`;
    artworkSourceLinks.replaceChildren();
    if (artwork.museum_url) {
      addSourceLink(artwork.museum_url, "Open museum record ↗");
    }
    if (artwork.file_page_url && artwork.file_page_url !== artwork.museum_url) {
      addSourceLink(artwork.file_page_url, artwork.museum_url ? "Open image source ↗" : "Open source record ↗");
    }
    artworkPicker.value = artwork.id;
    artworkInfo.hidden = false;
    renderSelection();
  };

  const artworkAt = (clientX, clientY) => {
    const bounds = stage.getBoundingClientRect();
    const imageX = (clientX - bounds.left - view.x) / view.scale;
    const imageY = (clientY - bounds.top - view.y) / view.scale;
    return view.artworks.find(
      (artwork) =>
        imageX >= artwork.x &&
        imageX < artwork.x + artwork.width &&
        imageY >= artwork.y &&
        imageY < artwork.y + artwork.height,
    );
  };

  const showArtworkAt = (clientX, clientY) => {
    const artwork = artworkAt(clientX, clientY);
    if (artwork) showArtworkDetails(artwork);
  };

  const focusArtwork = (artwork) => {
    const bounds = stage.getBoundingClientRect();
    const focusScale = Math.min(
      bounds.width / (artwork.width * 1.8),
      bounds.height / (artwork.height * 1.8),
      1,
    );
    view.scale = clamp(focusScale, MIN_SCALE, MAX_SCALE);
    view.x = bounds.width / 2 - (artwork.x + artwork.width / 2) * view.scale;
    view.y = bounds.height / 2 - (artwork.y + artwork.height / 2) * view.scale;
    view.fitted = false;
    render();
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

  const loadEncryptedBytes = async (url) => {
    const response = await fetch(url, {
      cache: "no-store",
      credentials: "omit",
    });
    if (!response.ok) throw new Error("The encrypted mosaic is not available.");
    return response.arrayBuffer();
  };

  const decryptMosaic = async (password) => {
    if (!crypto?.subtle) throw new Error("This browser cannot open the encrypted mosaic.");
    const config = await loadConfig();
    const key = await deriveKey(password, config);
    if (!key) return false;

    accessStatus.textContent = "Access accepted. Decrypting the museum-art atlas…";
    const [encryptedImage, encryptedCatalog] = await Promise.all([
      loadEncryptedBytes(config.image.assetUrl),
      loadEncryptedBytes(config.catalog.assetUrl),
    ]);
    const [plaintextImage, plaintextCatalog] = await Promise.all([
      decryptBytes(
        encryptedImage,
        key,
        config.image.iv,
        mosaicAdditionalData(config.plaintext),
      ),
      decryptBytes(
        encryptedCatalog,
        key,
        config.catalog.iv,
        catalogAdditionalData(config.catalog.plaintext),
      ),
    ]);

    const imageBytes = new Uint8Array(plaintextImage);
    if (
      plaintextImage.byteLength !== config.plaintext.bytes ||
      (await sha256Hex(plaintextImage)) !== config.plaintext.sha256 ||
      imageBytes.length < 4 ||
      imageBytes[0] !== 0xff ||
      imageBytes[1] !== 0xd8 ||
      imageBytes[2] !== 0xff ||
      imageBytes.at(-2) !== 0xff ||
      imageBytes.at(-1) !== 0xd9
    ) {
      throw new Error("The decrypted mosaic is not a readable image.");
    }
    if (
      plaintextCatalog.byteLength !== config.catalog.plaintext.bytes ||
      (await sha256Hex(plaintextCatalog)) !== config.catalog.plaintext.sha256
    ) {
      throw new Error("The decrypted artwork catalog is not approved.");
    }

    let catalog;
    try {
      catalog = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(plaintextCatalog));
    } catch {
      throw new Error("The decrypted artwork catalog is not readable.");
    }
    const artworks = validateArtworkMap(catalog, config);

    view.objectUrl = URL.createObjectURL(
      new Blob([plaintextImage], { type: config.plaintext.mediaType }),
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

    view.artworks = artworks;
    view.loaded = true;
    image.hidden = false;
    placeholder.hidden = true;
    download.href = view.objectUrl;
    download.download = "skald-museum-art-mosaic.jpg";
    download.hidden = false;
    status.textContent = `${image.naturalWidth.toLocaleString()} × ${image.naturalHeight.toLocaleString()} pixels · decrypted in this tab · ${artworks.length} artwork records`;
    populatePicker();
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
      accessStatus.textContent = "The image and artwork records are decrypted only in this tab after access is accepted.";
      input.disabled = false;
      submit.disabled = false;
      view.unlocking = false;
    }
  };

  const resetPointers = () => {
    activePointers.clear();
    view.gesture = null;
    view.gestureMoved = false;
    view.suppressClick = false;
    stage.classList.remove("is-dragging");
  };

  const lock = () => {
    view.loaded = false;
    view.scale = 1;
    view.x = 0;
    view.y = 0;
    view.artworks = [];
    resetPointers();
    closeArtworkDetails();
    clearPicker();
    image.hidden = true;
    image.removeAttribute("src");
    image.style.transform = "";
    placeholder.hidden = false;
    status.textContent = "Encrypted mosaic locked.";
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

  const beginGesture = () => {
    const points = [...activePointers.values()];
    if (points.length === 1) {
      const point = points[0];
      view.gesture = {
        type: "pan",
        startX: point.x,
        startY: point.y,
        imageX: view.x,
        imageY: view.y,
      };
      return;
    }
    if (points.length >= 2) {
      const [first, second] = points;
      const deltaX = second.x - first.x;
      const deltaY = second.y - first.y;
      view.gesture = {
        type: "pinch",
        distance: Math.max(1, Math.hypot(deltaX, deltaY)),
        centerX: (first.x + second.x) / 2,
        centerY: (first.y + second.y) / 2,
        scale: view.scale,
        imageX: view.x,
        imageY: view.y,
      };
      view.gestureMoved = true;
      view.suppressClick = true;
    }
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
  document.querySelector("[data-action='close-details']").addEventListener("click", closeArtworkDetails);

  artworkPicker.addEventListener("change", () => {
    const artwork = view.artworks.find((candidate) => candidate.id === artworkPicker.value);
    if (!artwork) {
      closeArtworkDetails();
      return;
    }
    focusArtwork(artwork);
    showArtworkDetails(artwork);
  });

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
    if (!view.loaded || (event.pointerType === "mouse" && event.button !== 0)) return;
    if (activePointers.size === 0) {
      view.gestureMoved = false;
      view.suppressClick = false;
    }
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try {
      stage.setPointerCapture(event.pointerId);
    } catch {
      activePointers.delete(event.pointerId);
      return;
    }
    beginGesture();
    stage.classList.add("is-dragging");
  });

  stage.addEventListener("pointermove", (event) => {
    if (!activePointers.has(event.pointerId) || !view.gesture) return;
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...activePointers.values()];

    if (view.gesture.type === "pan" && points.length === 1) {
      const point = points[0];
      const deltaX = point.x - view.gesture.startX;
      const deltaY = point.y - view.gesture.startY;
      if (Math.hypot(deltaX, deltaY) > DRAG_THRESHOLD) {
        view.gestureMoved = true;
        view.suppressClick = true;
      }
      view.x = view.gesture.imageX + deltaX;
      view.y = view.gesture.imageY + deltaY;
      view.fitted = false;
      render();
      return;
    }

    if (view.gesture.type === "pinch" && points.length >= 2) {
      const [first, second] = points;
      const deltaX = second.x - first.x;
      const deltaY = second.y - first.y;
      const centerX = (first.x + second.x) / 2;
      const centerY = (first.y + second.y) / 2;
      const nextScale = clamp(
        view.gesture.scale * Math.hypot(deltaX, deltaY) / view.gesture.distance,
        MIN_SCALE,
        MAX_SCALE,
      );
      const bounds = stage.getBoundingClientRect();
      const imageX = (view.gesture.centerX - bounds.left - view.gesture.imageX) / view.gesture.scale;
      const imageY = (view.gesture.centerY - bounds.top - view.gesture.imageY) / view.gesture.scale;
      view.x = centerX - bounds.left - imageX * nextScale;
      view.y = centerY - bounds.top - imageY * nextScale;
      view.scale = nextScale;
      view.fitted = false;
      view.gestureMoved = true;
      view.suppressClick = true;
      render();
    }
  });

  const finishPointer = (event) => {
    if (!activePointers.has(event.pointerId)) return;
    activePointers.delete(event.pointerId);
    if (activePointers.size > 0) {
      beginGesture();
    } else {
      view.gesture = null;
      stage.classList.remove("is-dragging");
    }
  };

  stage.addEventListener("pointerup", finishPointer);
  stage.addEventListener("pointercancel", finishPointer);

  stage.addEventListener("click", (event) => {
    if (!view.loaded) return;
    if (view.suppressClick || view.gestureMoved) {
      view.suppressClick = false;
      view.gestureMoved = false;
      return;
    }
    showArtworkAt(event.clientX, event.clientY);
  });

  stage.addEventListener("keydown", (event) => {
    if (!view.loaded) return;
    const panStep = event.shiftKey ? 160 : 48;
    const bounds = stage.getBoundingClientRect();
    const actions = {
      "+": () => zoomFromCenter(1.25),
      "=": () => zoomFromCenter(1.25),
      "-": () => zoomFromCenter(0.8),
      "0": showActualSize,
      f: fitImage,
      F: fitImage,
      Enter: () => showArtworkAt(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2),
      " ": () => showArtworkAt(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2),
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

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !artworkInfo.hidden) {
      event.preventDefault();
      closeArtworkDetails();
      stage.focus({ preventScroll: true });
    }
  });

  window.addEventListener("resize", () => {
    if (view.loaded && view.fitted) fitImage();
  });

  window.addEventListener("pagehide", () => {
    if (view.objectUrl) URL.revokeObjectURL(view.objectUrl);
  });
})();
