(() => {
  "use strict";

  const CONFIG_URL = "./mosaic-config.json";
  const ENCRYPTED_ASSET_URL = "./assets/skald-museum-art-mosaic.enc";
  const ENCRYPTED_CATALOG_URL = "./assets/skald-museum-art-map.enc";
  const ENCRYPTED_VIEWER_URL = "./assets/skald-museum-art-viewer.enc";
  const VIEWER_PACK_MEDIA_TYPE = "application/vnd.skald.mosaic-viewer-pack";
  const SCHEMA_VERSION = 2;
  const MIN_SCALE = 0.005;
  const MAX_SCALE = 4;
  const DRAG_THRESHOLD = 5;
  const WHEEL_ZOOM_SPEED = 0.0025;
  const TILE_ENTER_SCALE = 0.25;
  const TILE_EXIT_SCALE = 0.2;
  const MAX_RENDERED_TILES = 2;
  const TILE_OVERSCAN = 600;
  const TILE_UPDATE_DELAY_MS = 90;

  const gate = document.querySelector("[data-access-gate]");
  const form = document.querySelector("[data-access-form]");
  const input = document.querySelector("[data-access-input]");
  const submit = document.querySelector("[data-access-submit]");
  const accessError = document.querySelector("[data-access-error]");
  const accessStatus = document.querySelector("[data-access-status]");
  const viewer = document.querySelector("[data-mosaic-viewer]");
  const stage = document.querySelector("[data-mosaic-stage]");
  const atlas = document.querySelector("[data-mosaic-atlas]");
  const overview = document.querySelector("[data-mosaic-overview]");
  const tileContainer = document.querySelector("[data-mosaic-tiles]");
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
  const pendingRevocations = new Set();
  let renderFrameId = null;
  let tileUpdateTimer = null;
  const view = {
    loaded: false,
    fitted: true,
    scale: 1,
    x: 0,
    y: 0,
    gesture: null,
    gestureMoved: false,
    suppressClick: false,
    width: 0,
    height: 0,
    stageBounds: null,
    config: null,
    key: null,
    viewerPack: null,
    overviewUrl: null,
    tileLayers: [],
    tileElements: new Map(),
    tileUrls: new Map(),
    tilesActive: false,
    tileGeneration: 0,
    downloadUrl: null,
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

  const canonicalJson = (value) => {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  };

  const viewerPackAdditionalData = (plaintextContract, manifest) =>
    new TextEncoder().encode(
      [
        "skald-mosaic-viewer-pack-v1",
        `mediaType=${plaintextContract.mediaType}`,
        `bytes=${plaintextContract.bytes}`,
        `sha256=${plaintextContract.sha256}`,
        `width=${plaintextContract.width}`,
        `height=${plaintextContract.height}`,
        `layerCount=${plaintextContract.layerCount}`,
        `manifestSha256=${plaintextContract.manifestSha256}`,
        `manifest=${canonicalJson(manifest)}`,
      ].join("\n"),
    );

  const sha256Hex = async (value) =>
    [...new Uint8Array(await crypto.subtle.digest("SHA-256", value))]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

  const isPositiveInteger = (value) => Number.isSafeInteger(value) && value > 0;

  const hasExactKeys = (value, expectedKeys) => {
    if (!value || Array.isArray(value) || typeof value !== "object") return false;
    const actualKeys = Object.keys(value).sort();
    const approvedKeys = [...expectedKeys].sort();
    return actualKeys.length === approvedKeys.length &&
      actualKeys.every((key, index) => key === approvedKeys[index]);
  };

  const rectanglesOverlap = (left, right) =>
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y;

  const validateViewerManifest = (manifest, width, height) => {
    const layerKeys = [
      "role",
      "id",
      "sourcePath",
      "sha256",
      "offset",
      "bytes",
      "naturalWidth",
      "naturalHeight",
      "x",
      "y",
      "width",
      "height",
    ];
    if (
      !hasExactKeys(manifest, ["schemaVersion", "width", "height", "layers"]) ||
      manifest.schemaVersion !== 1 ||
      manifest.width !== width ||
      manifest.height !== height ||
      !Array.isArray(manifest.layers) ||
      manifest.layers.length < 2
    ) {
      throw new Error("Invalid encrypted-mosaic viewer manifest.");
    }

    const ids = new Set();
    const paths = new Set();
    const tiles = [];
    let overviewLayer = null;
    let expectedOffset = 0;
    for (const layer of manifest.layers) {
      if (
        !hasExactKeys(layer, layerKeys) ||
        !["overview", "tile"].includes(layer.role) ||
        typeof layer.id !== "string" ||
        !/^[a-z0-9][a-z0-9-]*$/.test(layer.id) ||
        typeof layer.sourcePath !== "string" ||
        !/^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\/\/)[A-Za-z0-9._/-]+\.jpe?g$/i.test(
          layer.sourcePath,
        ) ||
        !/^[a-f0-9]{64}$/.test(layer.sha256 ?? "") ||
        layer.offset !== expectedOffset ||
        !isPositiveInteger(layer.bytes) ||
        !["naturalWidth", "naturalHeight", "width", "height"].every(
          (field) => isPositiveInteger(layer[field]),
        ) ||
        !["x", "y"].every(
          (field) => Number.isSafeInteger(layer[field]) && layer[field] >= 0,
        ) ||
        layer.x + layer.width > width ||
        layer.y + layer.height > height ||
        ids.has(layer.id) ||
        paths.has(layer.sourcePath)
      ) {
        throw new Error("Invalid encrypted-mosaic viewer layer.");
      }
      ids.add(layer.id);
      paths.add(layer.sourcePath);
      expectedOffset += layer.bytes;

      if (layer.role === "overview") {
        if (
          overviewLayer ||
          layer.x !== 0 ||
          layer.y !== 0 ||
          layer.width !== width ||
          layer.height !== height ||
          layer.naturalWidth * layer.height !== layer.naturalHeight * layer.width
        ) {
          throw new Error("Invalid encrypted-mosaic overview layer.");
        }
        overviewLayer = layer;
      } else {
        if (
          layer.naturalWidth !== layer.width ||
          layer.naturalHeight !== layer.height ||
          tiles.some((tile) => rectanglesOverlap(tile, layer))
        ) {
          throw new Error("Invalid encrypted-mosaic tile layer.");
        }
        tiles.push(layer);
      }
    }

    if (
      !overviewLayer ||
      tiles.reduce((area, tile) => area + tile.width * tile.height, 0) !== width * height
    ) {
      throw new Error("The encrypted-mosaic tiles do not cover the atlas.");
    }
    return { manifest, overviewLayer, tileLayers: tiles, bytes: expectedOffset };
  };

  const loadConfig = async () => {
    const response = await fetch(CONFIG_URL, {
      cache: "no-store",
      credentials: "omit",
    });
    if (!response.ok) throw new Error("The encrypted mosaic is not available.");
    const config = await response.json();
    const catalogContract = config?.catalog?.plaintext;
    const viewerContract = config?.viewer?.plaintext;

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
      config.catalog.cipher.url !== ENCRYPTED_CATALOG_URL ||
      !hasExactKeys(viewerContract, [
        "mediaType",
        "bytes",
        "sha256",
        "width",
        "height",
        "layerCount",
        "manifestSha256",
      ]) ||
      viewerContract.mediaType !== VIEWER_PACK_MEDIA_TYPE ||
      !isPositiveInteger(viewerContract.bytes) ||
      !/^[a-f0-9]{64}$/.test(viewerContract.sha256 ?? "") ||
      viewerContract.width !== config.plaintext.width ||
      viewerContract.height !== config.plaintext.height ||
      !isPositiveInteger(viewerContract.layerCount) ||
      !/^[a-f0-9]{64}$/.test(viewerContract.manifestSha256 ?? "") ||
      config?.viewer?.cipher?.name !== "AES-GCM" ||
      config.viewer.cipher.url !== ENCRYPTED_VIEWER_URL
    ) {
      throw new Error("Invalid encrypted-mosaic metadata.");
    }

    const viewerManifest = validateViewerManifest(
      config.viewer.manifest,
      config.plaintext.width,
      config.plaintext.height,
    );
    if (
      viewerContract.bytes !== viewerManifest.bytes ||
      viewerContract.layerCount !== viewerManifest.manifest.layers.length ||
      viewerContract.manifestSha256 !==
        await sha256Hex(new TextEncoder().encode(canonicalJson(viewerManifest.manifest)))
    ) {
      throw new Error("Invalid encrypted-mosaic viewer metadata.");
    }

    const imageIv = decodeBase64(config.cipher.iv, 12);
    const catalogIv = decodeBase64(config.catalog.cipher.iv, 12);
    const viewerIv = decodeBase64(config.viewer.cipher.iv, 12);
    if (
      equalBytes(imageIv, catalogIv) ||
      equalBytes(imageIv, viewerIv) ||
      equalBytes(catalogIv, viewerIv)
    ) {
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
      viewer: {
        plaintext: viewerContract,
        iv: viewerIv,
        assetUrl: config.viewer.cipher.url,
        manifest: viewerManifest.manifest,
        overviewLayer: viewerManifest.overviewLayer,
        tileLayers: viewerManifest.tileLayers,
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
      !Array.isArray(catalog?.tiles) ||
      catalog.tiles.length !== config.viewer.tileLayers.length ||
      !Array.isArray(catalog?.artworks) ||
      catalog.artworks.length !== config.catalog.plaintext.artworkCount
    ) {
      throw new Error("The artwork catalog does not match the mosaic.");
    }

    for (const [index, tile] of catalog.tiles.entries()) {
      const layer = config.viewer.tileLayers[index];
      if (
        tile?.path !== layer.sourcePath.replace(/^viewer\//, "") ||
        !["x", "y", "width", "height"].every(
          (field) => tile[field] === layer[field],
        )
      ) {
        throw new Error("The artwork catalog tiles do not match the mosaic viewer.");
      }
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

  const measureStage = () => {
    const bounds = stage.getBoundingClientRect();
    view.stageBounds = {
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
    };
    return view.stageBounds;
  };

  const currentStageBounds = () => view.stageBounds ?? measureStage();

  const hideDetailTiles = () => {
    view.tileGeneration += 1;
    if (tileUpdateTimer !== null) {
      clearTimeout(tileUpdateTimer);
      tileUpdateTimer = null;
    }
    if (!tileContainer.hidden) {
      tileContainer.hidden = true;
      for (const element of view.tileElements.values()) element.hidden = true;
    }
    if (view.scale < TILE_EXIT_SCALE) {
      view.tilesActive = false;
      for (const layerId of [...view.tileUrls.keys()]) unloadTile(layerId);
    }
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

  const applyRender = () => {
    const overviewScale = view.scale * view.width / overview.naturalWidth;
    overview.style.transform =
      `translate3d(${view.x}px, ${view.y}px, 0) scale(${overviewScale})`;
    renderSelection();
    const zoomText = `${Math.round(view.scale * 100)}%`;
    if (zoomOutput.value !== zoomText) {
      zoomOutput.value = zoomText;
      zoomOutput.textContent = zoomText;
    }
    scheduleTileUpdate();
  };

  const render = () => {
    if (renderFrameId !== null) {
      cancelAnimationFrame(renderFrameId);
      renderFrameId = null;
    }
    hideDetailTiles();
    applyRender();
  };

  const scheduleRender = () => {
    hideDetailTiles();
    if (renderFrameId !== null) return;
    renderFrameId = requestAnimationFrame(() => {
      renderFrameId = null;
      applyRender();
    });
  };

  const fitImage = () => {
    if (!view.loaded) return;
    const bounds = measureStage();
    const inset = Math.min(48, bounds.width * 0.06, bounds.height * 0.06);
    const widthScale = (bounds.width - inset * 2) / view.width;
    const heightScale = (bounds.height - inset * 2) / view.height;
    view.scale = clamp(Math.min(widthScale, heightScale), MIN_SCALE, MAX_SCALE);
    view.x = (bounds.width - view.width * view.scale) / 2;
    view.y = (bounds.height - view.height * view.scale) / 2;
    view.fitted = true;
    render();
  };

  const showActualSize = () => {
    if (!view.loaded) return;
    const bounds = measureStage();
    view.scale = 1;
    view.x = (bounds.width - view.width) / 2;
    view.y = (bounds.height - view.height) / 2;
    view.fitted = false;
    render();
  };

  const zoomAt = (
    nextScale,
    clientX,
    clientY,
    deferRender = false,
    bounds = currentStageBounds(),
  ) => {
    if (!view.loaded) return;
    const localX = clientX - bounds.left;
    const localY = clientY - bounds.top;
    const imageX = (localX - view.x) / view.scale;
    const imageY = (localY - view.y) / view.scale;
    view.scale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    view.x = localX - imageX * view.scale;
    view.y = localY - imageY * view.scale;
    view.fitted = false;
    if (deferRender) scheduleRender();
    else render();
  };

  const zoomFromCenter = (factor) => {
    const bounds = measureStage();
    zoomAt(
      view.scale * factor,
      bounds.left + bounds.width / 2,
      bounds.top + bounds.height / 2,
      false,
      bounds,
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
    const bounds = currentStageBounds();
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
    const bounds = measureStage();
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

  const loadImage = async (element, objectUrl) => {
    let resolveLoad;
    let rejectLoad;
    const loaded = new Promise((resolvePromise, rejectPromise) => {
      resolveLoad = resolvePromise;
      rejectLoad = rejectPromise;
    });
    const onLoad = () => resolveLoad();
    const onError = () => rejectLoad(new Error("The decrypted mosaic viewer is not readable."));
    element.addEventListener("load", onLoad, { once: true });
    element.addEventListener("error", onError, { once: true });
    element.src = objectUrl;
    try {
      if (typeof element.decode === "function") await element.decode();
      else await loaded;
    } catch {
      if (!element.complete || element.naturalWidth === 0) await loaded;
    } finally {
      element.removeEventListener("load", onLoad);
      element.removeEventListener("error", onError);
    }
  };

  const layerBytes = (layer) =>
    new Uint8Array(view.viewerPack, layer.offset, layer.bytes);

  const layerObjectUrl = (layer) =>
    URL.createObjectURL(new Blob([layerBytes(layer)], { type: "image/jpeg" }));

  const loadLayerImage = async (element, layer, objectUrl) => {
    await loadImage(element, objectUrl);
    if (
      element.naturalWidth !== layer.naturalWidth ||
      element.naturalHeight !== layer.naturalHeight
    ) {
      throw new Error("The decrypted mosaic viewer dimensions do not match its approval.");
    }
  };

  const revokeAfterOverviewPaint = (objectUrl) => {
    pendingRevocations.add(objectUrl);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!pendingRevocations.delete(objectUrl)) return;
        URL.revokeObjectURL(objectUrl);
      });
    });
  };

  const unloadTile = (layerId, expectedObjectUrl = null) => {
    const element = view.tileElements.get(layerId);
    const objectUrl = view.tileUrls.get(layerId);
    if (expectedObjectUrl && objectUrl !== expectedObjectUrl) return;
    if (element) {
      element.hidden = true;
      element.removeAttribute("src");
    }
    if (objectUrl) revokeAfterOverviewPaint(objectUrl);
    view.tileUrls.delete(layerId);
  };

  const loadTile = async (layer) => {
    if (!view.viewerPack) return false;
    const element = view.tileElements.get(layer.id);
    if (!element) return false;
    let objectUrl = view.tileUrls.get(layer.id);
    if (!objectUrl) {
      objectUrl = layerObjectUrl(layer);
      view.tileUrls.set(layer.id, objectUrl);
    }
    try {
      await loadLayerImage(element, layer, objectUrl);
      return view.tileUrls.get(layer.id) === objectUrl;
    } catch {
      unloadTile(layer.id, objectUrl);
      return false;
    }
  };

  const nextAnimationFrame = () =>
    new Promise((resolveFrame) => requestAnimationFrame(resolveFrame));

  const setTileGeometry = (element, layer) => {
    element.style.left = `${view.x + layer.x * view.scale}px`;
    element.style.top = `${view.y + layer.y * view.scale}px`;
    element.style.width = `${layer.width * view.scale}px`;
    element.style.height = `${layer.height * view.scale}px`;
  };

  const updateVisibleTiles = async (generation) => {
    if (!view.loaded) return;
    if (generation !== view.tileGeneration) return;
    if (activePointers.size > 0 || view.gesture) return;
    if (
      (!view.tilesActive && view.scale < TILE_ENTER_SCALE) ||
      (view.tilesActive && view.scale < TILE_EXIT_SCALE)
    ) {
      view.tilesActive = false;
      for (const layerId of view.tileUrls.keys()) unloadTile(layerId);
      return;
    }
    view.tilesActive = true;

    const bounds = currentStageBounds();
    const viewport = {
      left: -view.x / view.scale - TILE_OVERSCAN,
      top: -view.y / view.scale - TILE_OVERSCAN,
      right: (bounds.width - view.x) / view.scale + TILE_OVERSCAN,
      bottom: (bounds.height - view.y) / view.scale + TILE_OVERSCAN,
    };
    const viewportCenter = {
      x: (viewport.left + viewport.right) / 2,
      y: (viewport.top + viewport.bottom) / 2,
    };
    const visibleLayers = view.tileLayers
      .filter(
        (layer) =>
          layer.x < viewport.right &&
          layer.x + layer.width > viewport.left &&
          layer.y < viewport.bottom &&
          layer.y + layer.height > viewport.top,
      )
      .sort((left, right) => {
        const leftDistance = Math.hypot(
          left.x + left.width / 2 - viewportCenter.x,
          left.y + left.height / 2 - viewportCenter.y,
        );
        const rightDistance = Math.hypot(
          right.x + right.width / 2 - viewportCenter.x,
          right.y + right.height / 2 - viewportCenter.y,
        );
        return leftDistance - rightDistance;
      })
      .slice(0, MAX_RENDERED_TILES);
    const visible = new Set(visibleLayers.map((layer) => layer.id));

    for (const layerId of [...view.tileUrls.keys()]) {
      if (!visible.has(layerId)) unloadTile(layerId);
    }
    const loaded = await Promise.all(visibleLayers.map(loadTile));
    if (
      generation !== view.tileGeneration ||
      !view.loaded ||
      view.scale < TILE_EXIT_SCALE
    ) {
      return;
    }

    const readyLayers = visibleLayers.filter((_, index) => loaded[index]);
    let revealedTileCount = 0;
    for (const layer of readyLayers) {
      const element = view.tileElements.get(layer.id);
      if (element) setTileGeometry(element, layer);
    }
    await nextAnimationFrame();
    await nextAnimationFrame();
    if (
      generation !== view.tileGeneration ||
      !view.loaded ||
      view.scale < TILE_EXIT_SCALE
    ) {
      return;
    }

    for (const layer of readyLayers) {
      const element = view.tileElements.get(layer.id);
      if (
        element &&
        view.tileUrls.has(layer.id) &&
        element.complete &&
        element.naturalWidth > 0
      ) {
        element.hidden = false;
        revealedTileCount += 1;
      }
    }
    tileContainer.hidden = revealedTileCount === 0;
  };

  const scheduleTileUpdate = () => {
    if (tileUpdateTimer !== null) clearTimeout(tileUpdateTimer);
    const generation = view.tileGeneration;
    tileUpdateTimer = setTimeout(() => {
      tileUpdateTimer = null;
      void updateVisibleTiles(generation);
    }, TILE_UPDATE_DELAY_MS);
  };

  const buildTileElements = () => {
    tileContainer.replaceChildren();
    view.tileElements.clear();
    const fragment = document.createDocumentFragment();
    for (const layer of view.tileLayers) {
      const element = document.createElement("img");
      element.className = "mosaic-tile";
      element.alt = "";
      element.draggable = false;
      element.decoding = "async";
      element.dataset.tileId = layer.id;
      element.hidden = true;
      view.tileElements.set(layer.id, element);
      fragment.append(element);
    }
    tileContainer.append(fragment);
  };

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
    const [encryptedViewer, encryptedCatalog] = await Promise.all([
      loadEncryptedBytes(config.viewer.assetUrl),
      loadEncryptedBytes(config.catalog.assetUrl),
    ]);
    const [plaintextViewer, plaintextCatalog] = await Promise.all([
      decryptBytes(
        encryptedViewer,
        key,
        config.viewer.iv,
        viewerPackAdditionalData(config.viewer.plaintext, config.viewer.manifest),
      ),
      decryptBytes(
        encryptedCatalog,
        key,
        config.catalog.iv,
        catalogAdditionalData(config.catalog.plaintext),
      ),
    ]);

    if (
      plaintextViewer.byteLength !== config.viewer.plaintext.bytes ||
      (await sha256Hex(plaintextViewer)) !== config.viewer.plaintext.sha256
    ) {
      throw new Error("The decrypted mosaic viewer is not approved.");
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

    view.width = config.plaintext.width;
    view.height = config.plaintext.height;
    view.config = config;
    view.key = key;
    view.viewerPack = plaintextViewer;
    view.tileLayers = config.viewer.tileLayers;
    view.artworks = artworks;
    buildTileElements();
    view.overviewUrl = layerObjectUrl(config.viewer.overviewLayer);
    try {
      await loadLayerImage(overview, config.viewer.overviewLayer, view.overviewUrl);
      overview.hidden = false;
    } catch (error) {
      URL.revokeObjectURL(view.overviewUrl);
      view.overviewUrl = null;
      overview.removeAttribute("src");
      throw error;
    }

    view.loaded = true;
    atlas.hidden = false;
    placeholder.hidden = true;
    download.hidden = false;
    download.disabled = false;
    status.textContent = `${view.width.toLocaleString()} × ${view.height.toLocaleString()} pixels · progressive encrypted viewer · ${artworks.length} artwork records`;
    populatePicker();
    return true;
  };

  const triggerFullResolutionDownload = () => {
    const anchor = document.createElement("a");
    anchor.href = view.downloadUrl;
    anchor.download = "skald-museum-art-mosaic.jpg";
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  };

  const downloadFullResolutionImage = async () => {
    if (!view.loaded || !view.config || !view.key || download.disabled) return;
    if (view.downloadUrl) {
      triggerFullResolutionDownload();
      return;
    }

    download.disabled = true;
    download.textContent = "Preparing full-resolution image…";
    status.textContent = "Decrypting the full-resolution download in this tab…";
    try {
      const encryptedImage = await loadEncryptedBytes(view.config.image.assetUrl);
      const plaintextImage = await decryptBytes(
        encryptedImage,
        view.key,
        view.config.image.iv,
        mosaicAdditionalData(view.config.plaintext),
      );
      const imageBytes = new Uint8Array(plaintextImage);
      if (
        plaintextImage.byteLength !== view.config.plaintext.bytes ||
        (await sha256Hex(plaintextImage)) !== view.config.plaintext.sha256 ||
        imageBytes.length < 4 ||
        imageBytes[0] !== 0xff ||
        imageBytes[1] !== 0xd8 ||
        imageBytes[2] !== 0xff ||
        imageBytes.at(-2) !== 0xff ||
        imageBytes.at(-1) !== 0xd9
      ) {
        throw new Error("The decrypted mosaic is not a readable image.");
      }
      view.downloadUrl = URL.createObjectURL(
        new Blob([plaintextImage], { type: view.config.plaintext.mediaType }),
      );
      triggerFullResolutionDownload();
      status.textContent = `${view.width.toLocaleString()} × ${view.height.toLocaleString()} pixels · full-resolution download ready · ${view.artworks.length} artwork records`;
    } catch {
      status.textContent = "The full-resolution download is unavailable. Please try again.";
    } finally {
      download.disabled = false;
      download.textContent = "Download full-resolution image";
    }
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
      lock(false);
      accessError.textContent = "The encrypted viewing room is unavailable. Please try again.";
      accessError.hidden = false;
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

  function lock(restoreFocus = true) {
    if (renderFrameId !== null) {
      cancelAnimationFrame(renderFrameId);
      renderFrameId = null;
    }
    if (tileUpdateTimer !== null) {
      clearTimeout(tileUpdateTimer);
      tileUpdateTimer = null;
    }
    view.loaded = false;
    view.tileGeneration += 1;
    view.scale = 1;
    view.x = 0;
    view.y = 0;
    view.width = 0;
    view.height = 0;
    view.stageBounds = null;
    view.artworks = [];
    resetPointers();
    closeArtworkDetails();
    clearPicker();
    tileContainer.hidden = true;
    for (const layerId of view.tileUrls.keys()) unloadTile(layerId);
    for (const objectUrl of pendingRevocations) URL.revokeObjectURL(objectUrl);
    pendingRevocations.clear();
    view.tileElements.clear();
    view.tileLayers = [];
    view.tilesActive = false;
    tileContainer.replaceChildren();
    if (view.overviewUrl) URL.revokeObjectURL(view.overviewUrl);
    view.overviewUrl = null;
    overview.hidden = true;
    overview.removeAttribute("src");
    overview.style.transform = "";
    atlas.hidden = true;
    atlas.style.transform = "";
    atlas.style.width = "";
    atlas.style.height = "";
    view.viewerPack = null;
    view.key = null;
    view.config = null;
    placeholder.hidden = false;
    status.textContent = "Encrypted mosaic locked.";
    download.hidden = true;
    download.disabled = false;
    download.textContent = "Download full-resolution image";
    if (view.downloadUrl) URL.revokeObjectURL(view.downloadUrl);
    view.downloadUrl = null;
    viewer.hidden = true;
    gate.hidden = false;
    document.body.dataset.locked = "true";
    input.value = "";
    if (restoreFocus) input.focus({ preventScroll: true });
  }

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
      const bounds = currentStageBounds();
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
        boundsLeft: bounds.left,
        boundsTop: bounds.top,
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
  document.querySelector("[data-action='lock']").addEventListener("click", () => lock());
  document.querySelector("[data-action='close-details']").addEventListener("click", closeArtworkDetails);
  download.addEventListener("click", downloadFullResolutionImage);

  artworkPicker.addEventListener("change", () => {
    const artwork = view.artworks.find((candidate) => candidate.id === artworkPicker.value);
    if (!artwork) {
      closeArtworkDetails();
      return;
    }
    focusArtwork(artwork);
    showArtworkDetails(artwork);
  });

  const wheelDeltaPixels = (event, bounds) => {
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
    if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * bounds.height;
    return event.deltaY;
  };

  stage.addEventListener(
    "wheel",
    (event) => {
      if (!view.loaded) return;
      event.preventDefault();
      const bounds = currentStageBounds();
      const delta = clamp(wheelDeltaPixels(event, bounds), -240, 240);
      zoomAt(
        view.scale * Math.exp(-delta * WHEEL_ZOOM_SPEED),
        event.clientX,
        event.clientY,
        true,
        bounds,
      );
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
    hideDetailTiles();
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
      scheduleRender();
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
      const imageX =
        (view.gesture.centerX - view.gesture.boundsLeft - view.gesture.imageX) /
        view.gesture.scale;
      const imageY =
        (view.gesture.centerY - view.gesture.boundsTop - view.gesture.imageY) /
        view.gesture.scale;
      view.x = centerX - view.gesture.boundsLeft - imageX * nextScale;
      view.y = centerY - view.gesture.boundsTop - imageY * nextScale;
      view.scale = nextScale;
      view.fitted = false;
      view.gestureMoved = true;
      view.suppressClick = true;
      scheduleRender();
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
      scheduleTileUpdate();
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
    const bounds = currentStageBounds();
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
    view.stageBounds = null;
    if (view.loaded && view.fitted) fitImage();
    else if (view.loaded) measureStage();
  });

  window.addEventListener("scroll", () => {
    view.stageBounds = null;
  }, { passive: true });

  if ("ResizeObserver" in window) {
    new ResizeObserver(() => {
      view.stageBounds = null;
      if (view.loaded && view.fitted) fitImage();
      else if (view.loaded) measureStage();
    }).observe(stage);
  }

  window.addEventListener("pagehide", () => lock(false));
})();
