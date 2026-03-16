(function initVideoToGifTool() {
  "use strict";

  document.documentElement.lang = "zh-CN";
  document.title = "视频转 GIF 工具";
  document.body.innerHTML = [
    '<div class="bg-shape bg-shape-a" aria-hidden="true"></div>',
    '<div class="bg-shape bg-shape-b" aria-hidden="true"></div>',
    '<main class="page">',
    '  <header class="hero">',
    '    <p class="badge">本地转换工具</p>',
    '    <h1>上传视频，一键转 GIF</h1>',
    '    <p>文件只在浏览器本地处理，不会上传到服务器。</p>',
    "  </header>",
    '  <section class="panel">',
    '    <label class="drop-zone" id="dropZone">',
    '      <input id="videoInput" type="file" accept="video/*">',
    '      <span class="drop-title">点击选择或拖拽视频文件到这里</span>',
    '      <span class="drop-subtitle">支持 MP4 / MOV / WEBM 等常见格式</span>',
    "    </label>",
    '    <div class="control-grid">',
    '      <label>开始时间（秒）<input id="startSec" type="number" min="0" step="0.1" value="0"></label>',
    '      <label>截取时长（秒）<input id="durationSec" type="number" min="0.2" step="0.1" value="5"></label>',
    '      <label>输出宽度（像素）<input id="widthPx" type="number" min="120" step="10" value="480"></label>',
    '      <label>帧率（FPS）<input id="fps" type="number" min="5" max="30" step="1" value="12"></label>',
    '      <label>质量档位<select id="quality">',
    '        <option value="high">高质量（更清晰）</option>',
    '        <option value="medium" selected>均衡</option>',
    '        <option value="low">快速（体积更小）</option>',
    "      </select></label>",
    "    </div>",
    '    <div class="action-row">',
    '      <button id="convertBtn" class="btn-main" type="button" disabled>开始转换</button>',
    '      <a id="downloadBtn" class="btn-ghost is-disabled" href="#" download>下载 GIF</a>',
    "    </div>",
    '    <p id="statusText" class="status">请先选择一个视频文件。</p>',
    '    <div class="progress-track" aria-hidden="true"><div id="progressBar" class="progress-bar"></div></div>',
    "  </section>",
    '  <section class="preview-grid">',
    '    <article class="panel card">',
    '      <div class="panel-head"><h2>原视频预览</h2><p id="videoMeta" class="meta">未选择文件</p></div>',
    '      <video id="sourcePreview" controls preload="metadata"></video>',
    "    </article>",
    '    <article class="panel card">',
    '      <div class="panel-head"><h2>GIF 结果</h2><p id="gifMeta" class="meta">尚未生成</p></div>',
    '      <img id="gifPreview" class="is-empty" alt="GIF 预览">',
    "    </article>",
    "  </section>",
    '  <footer class="footnote">无需安装 ffmpeg，直接双击打开页面也可转换。</footer>',
    "</main>",
  ].join("");

  var state = {
    selectedFile: null,
    sourceUrl: "",
    gifUrl: "",
    sourceDuration: NaN,
    isConverting: false,
  };

  var qualityMap = {
    high: { dither: 0, frameLimit: 320, sampleStride: 1 },
    medium: { dither: 0, frameLimit: 260, sampleStride: 2 },
    low: { dither: 0, frameLimit: 220, sampleStride: 3 },
  };

  var bayer4x4 = [
    0, 8, 2, 10,
    12, 4, 14, 6,
    3, 11, 1, 9,
    15, 7, 13, 5,
  ];

  var el = {
    dropZone: document.getElementById("dropZone"),
    videoInput: document.getElementById("videoInput"),
    startSec: document.getElementById("startSec"),
    durationSec: document.getElementById("durationSec"),
    widthPx: document.getElementById("widthPx"),
    fps: document.getElementById("fps"),
    quality: document.getElementById("quality"),
    convertBtn: document.getElementById("convertBtn"),
    downloadBtn: document.getElementById("downloadBtn"),
    statusText: document.getElementById("statusText"),
    progressBar: document.getElementById("progressBar"),
    sourcePreview: document.getElementById("sourcePreview"),
    gifPreview: document.getElementById("gifPreview"),
    videoMeta: document.getElementById("videoMeta"),
    gifMeta: document.getElementById("gifMeta"),
  };

  function setStatus(message, isError) {
    el.statusText.textContent = message;
    el.statusText.classList.toggle("is-error", Boolean(isError));
  }

  function setProgress(value) {
    var safe = Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0;
    el.progressBar.style.width = String(Math.round(safe * 100)) + "%";
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return "0 B";
    }
    var units = ["B", "KB", "MB", "GB"];
    var idx = 0;
    var value = bytes;
    while (value >= 1024 && idx < units.length - 1) {
      value /= 1024;
      idx += 1;
    }
    return value.toFixed(value >= 100 || idx === 0 ? 0 : 1) + " " + units[idx];
  }

  function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return "--:--";
    }
    var mins = Math.floor(seconds / 60);
    var secs = Math.floor(seconds % 60);
    return String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function sanitizeName(name) {
    return String(name || "")
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60);
  }

  function cleanupObjectUrl(url) {
    if (url) {
      URL.revokeObjectURL(url);
    }
  }

  function resetGifResult() {
    cleanupObjectUrl(state.gifUrl);
    state.gifUrl = "";
    el.gifPreview.src = "";
    el.gifPreview.classList.add("is-empty");
    el.downloadBtn.classList.add("is-disabled");
    el.downloadBtn.removeAttribute("href");
    el.gifMeta.textContent = "尚未生成";
  }

  function updateConvertButtonState() {
    el.convertBtn.disabled = state.isConverting || !state.selectedFile;
    el.convertBtn.textContent = state.isConverting ? "转换中..." : "开始转换";
  }

  function updateSourceMeta() {
    if (!state.selectedFile) {
      el.videoMeta.textContent = "未选择文件";
      return;
    }
    var parts = [state.selectedFile.name, formatBytes(state.selectedFile.size)];
    if (Number.isFinite(state.sourceDuration)) {
      parts.push(formatDuration(state.sourceDuration));
    }
    if (el.sourcePreview.videoWidth && el.sourcePreview.videoHeight) {
      parts.push(String(el.sourcePreview.videoWidth) + "x" + String(el.sourcePreview.videoHeight));
    }
    el.videoMeta.textContent = parts.join(" | ");
  }

  function onFileSelected(file) {
    if (!file) {
      return;
    }

    var mimeOk = String(file.type || "").startsWith("video/");
    var nameOk = /\.(mp4|mov|m4v|webm|avi|mkv|mpeg|mpg|wmv|flv|3gp)$/i.test(file.name);
    if (!mimeOk && !nameOk) {
      setStatus("请选择视频文件（MP4 / MOV / WEBM 等）。", true);
      return;
    }

    if (file.size > 350 * 1024 * 1024) {
      setStatus("视频超过 350MB，浏览器内转换容易失败，请先压缩或裁剪。", true);
      return;
    }

    state.selectedFile = file;
    state.sourceDuration = NaN;
    resetGifResult();
    cleanupObjectUrl(state.sourceUrl);
    state.sourceUrl = URL.createObjectURL(file);

    el.sourcePreview.src = state.sourceUrl;
    el.sourcePreview.load();
    updateSourceMeta();
    updateConvertButtonState();
    setProgress(0);
    setStatus("视频已就绪，点击“开始转换”。");
  }

  function waitForEvent(target, eventName, errorName) {
    return new Promise(function (resolve, reject) {
      var onDone = function () {
        target.removeEventListener(eventName, onDone);
        target.removeEventListener(errorName, onError);
        resolve();
      };
      var onError = function () {
        target.removeEventListener(eventName, onDone);
        target.removeEventListener(errorName, onError);
        reject(new Error("视频解码失败"));
      };
      target.addEventListener(eventName, onDone, { once: true });
      target.addEventListener(errorName, onError, { once: true });
    });
  }

  async function seekVideo(video, timeSec) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var cleanup = function () {
        video.removeEventListener("seeked", onSeeked);
        video.removeEventListener("error", onError);
      };
      var onSeeked = function () {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        resolve();
      };
      var onError = function () {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        reject(new Error("视频定位失败"));
      };
      video.addEventListener("seeked", onSeeked);
      video.addEventListener("error", onError);
      try {
        video.currentTime = timeSec;
      } catch (err) {
        cleanup();
        reject(err);
      }
    });
  }

  function rgbToKey15(r, g, b) {
    return ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
  }

  function key15ToRgb(key) {
    var r5 = (key >> 10) & 31;
    var g5 = (key >> 5) & 31;
    var b5 = key & 31;
    return [
      Math.round((r5 * 255) / 31),
      Math.round((g5 * 255) / 31),
      Math.round((b5 * 255) / 31),
    ];
  }

  function collectHistogram(rgba, width, height, histogram, sampleStride) {
    var stride = Math.max(1, sampleStride);
    for (var y = 0; y < height; y += stride) {
      var rowOffset = y * width * 4;
      for (var x = 0; x < width; x += stride) {
        var i = rowOffset + x * 4;
        var a = rgba[i + 3];
        if (a < 16) {
          continue;
        }
        var key = rgbToKey15(rgba[i], rgba[i + 1], rgba[i + 2]);
        histogram[key] += 1;
      }
    }
  }

  function buildPaletteFromHistogram(histogram, maxColors) {
    var max = Math.max(1, Math.min(256, maxColors || 256));
    var buckets = [];
    for (var key = 0; key < histogram.length; key += 1) {
      var count = histogram[key];
      if (count > 0) {
        buckets.push({ key: key, count: count });
      }
    }

    if (!buckets.length) {
      var emptyPalette = new Uint8Array(256 * 3);
      return emptyPalette;
    }

    buckets.sort(function (a, b) {
      return b.count - a.count;
    });

    var palette = new Uint8Array(256 * 3);
    var used = Math.min(max, buckets.length);

    for (var i = 0; i < used; i += 1) {
      var rgb = key15ToRgb(buckets[i].key);
      palette[i * 3] = rgb[0];
      palette[i * 3 + 1] = rgb[1];
      palette[i * 3 + 2] = rgb[2];
    }

    var fillIndex = used > 0 ? used - 1 : 0;
    for (var j = used; j < 256; j += 1) {
      palette[j * 3] = palette[fillIndex * 3];
      palette[j * 3 + 1] = palette[fillIndex * 3 + 1];
      palette[j * 3 + 2] = palette[fillIndex * 3 + 2];
    }

    return palette;
  }

  function buildLookup15ToPalette(palette) {
    var lookup = new Uint8Array(32768);
    for (var key = 0; key < 32768; key += 1) {
      var rgb = key15ToRgb(key);
      var bestIdx = 0;
      var bestDist = Infinity;

      for (var p = 0; p < 256; p += 1) {
        var pr = palette[p * 3];
        var pg = palette[p * 3 + 1];
        var pb = palette[p * 3 + 2];
        var dr = rgb[0] - pr;
        var dg = rgb[1] - pg;
        var db = rgb[2] - pb;
        var dist = dr * dr + dg * dg + db * db;
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = p;
          if (dist === 0) {
            break;
          }
        }
      }
      lookup[key] = bestIdx;
    }
    return lookup;
  }

  function quantizeWithLookup(rgba, width, height, lookup, ditherStrength) {
    var pixels = new Uint8Array(width * height);
    var offset = 0;
    for (var y = 0; y < height; y += 1) {
      for (var x = 0; x < width; x += 1) {
        var r = rgba[offset];
        var g = rgba[offset + 1];
        var b = rgba[offset + 2];
        var a = rgba[offset + 3];
        offset += 4;

        if (a < 16) {
          pixels[y * width + x] = 0;
          continue;
        }

        if (ditherStrength > 0) {
          var matrixValue = bayer4x4[(y & 3) * 4 + (x & 3)] - 7.5;
          var delta = (matrixValue * ditherStrength) / 16;
          r = clamp(Math.round(r + delta), 0, 255);
          g = clamp(Math.round(g + delta), 0, 255);
          b = clamp(Math.round(b + delta), 0, 255);
        }

        var key = rgbToKey15(r, g, b);
        pixels[y * width + x] = lookup[key];
      }
    }
    return pixels;
  }

  function encodeLzwSafe(indices) {
    var minCodeSize = 8;
    var clearCode = 1 << minCodeSize;
    var endCode = clearCode + 1;
    var codeSize = minCodeSize + 1;
    var output = [];
    var bitBuffer = 0;
    var bitCount = 0;

    function emit(code) {
      bitBuffer |= code << bitCount;
      bitCount += codeSize;
      while (bitCount >= 8) {
        output.push(bitBuffer & 255);
        bitBuffer = bitBuffer >>> 8;
        bitCount -= 8;
      }
    }

    emit(clearCode);
    for (var i = 0; i < indices.length; i += 1) {
      emit(indices[i]);
      emit(clearCode);
    }
    emit(endCode);

    if (bitCount > 0) {
      output.push(bitBuffer & 255);
    }
    return new Uint8Array(output);
  }

  function GifWriter(width, height, palette, loop) {
    this.width = width;
    this.height = height;
    this.bytes = [];
    this.loop = typeof loop === "number" ? loop : 0;
    this._writeHeader(palette);
  }

  GifWriter.prototype._pushByte = function (value) {
    this.bytes.push(value & 255);
  };

  GifWriter.prototype._pushWord = function (value) {
    this._pushByte(value & 255);
    this._pushByte((value >> 8) & 255);
  };

  GifWriter.prototype._pushAscii = function (text) {
    for (var i = 0; i < text.length; i += 1) {
      this._pushByte(text.charCodeAt(i));
    }
  };

  GifWriter.prototype._writeHeader = function (palette) {
    this._pushAscii("GIF89a");
    this._pushWord(this.width);
    this._pushWord(this.height);
    this._pushByte(0xF7);
    this._pushByte(0);
    this._pushByte(0);
    for (var i = 0; i < 256 * 3; i += 1) {
      this._pushByte(palette[i] || 0);
    }
    this._pushByte(0x21);
    this._pushByte(0xFF);
    this._pushByte(11);
    this._pushAscii("NETSCAPE2.0");
    this._pushByte(3);
    this._pushByte(1);
    this._pushWord(this.loop);
    this._pushByte(0);
  };

  GifWriter.prototype._pushSubBlocks = function (rawBytes) {
    var idx = 0;
    while (idx < rawBytes.length) {
      var size = Math.min(255, rawBytes.length - idx);
      this._pushByte(size);
      for (var i = 0; i < size; i += 1) {
        this._pushByte(rawBytes[idx + i]);
      }
      idx += size;
    }
    this._pushByte(0);
  };

  GifWriter.prototype.addFrame = function (indexedPixels, delayCs) {
    this._pushByte(0x21);
    this._pushByte(0xF9);
    this._pushByte(4);
    this._pushByte(0x00);
    this._pushWord(delayCs);
    this._pushByte(0);
    this._pushByte(0);

    this._pushByte(0x2C);
    this._pushWord(0);
    this._pushWord(0);
    this._pushWord(this.width);
    this._pushWord(this.height);
    this._pushByte(0x00);

    var minCodeSize = 8;
    var compressed = encodeLzwSafe(indexedPixels);
    this._pushByte(minCodeSize);
    this._pushSubBlocks(compressed);
  };

  GifWriter.prototype.finish = function () {
    this._pushByte(0x3B);
    return new Uint8Array(this.bytes);
  };

  async function convertToGif() {
    if (!state.selectedFile || state.isConverting) {
      return;
    }

    var startSec = Number(el.startSec.value);
    var durationSec = Number(el.durationSec.value);
    var widthPx = Number(el.widthPx.value);
    var fps = Number(el.fps.value);
    var quality = qualityMap[el.quality.value] || qualityMap.medium;

    if (!Number.isFinite(startSec) || startSec < 0) {
      setStatus("开始时间必须大于等于 0。", true);
      return;
    }
    if (!Number.isFinite(durationSec) || durationSec <= 0) {
      setStatus("截取时长必须大于 0。", true);
      return;
    }
    if (!Number.isFinite(widthPx) || widthPx < 120) {
      setStatus("输出宽度不能小于 120。", true);
      return;
    }
    if (!Number.isFinite(fps) || fps < 5 || fps > 30) {
      setStatus("帧率需在 5 到 30 之间。", true);
      return;
    }

    if (Number.isFinite(state.sourceDuration)) {
      if (startSec >= state.sourceDuration) {
        setStatus("开始时间不能超过视频总时长。", true);
        return;
      }
      durationSec = Math.min(durationSec, Math.max(0.2, state.sourceDuration - startSec));
      el.durationSec.value = String(Math.round(durationSec * 10) / 10);
    }

    widthPx = Math.round(clamp(widthPx, 120, 1280));
    fps = Math.round(clamp(fps, 5, 30));
    el.widthPx.value = String(widthPx);
    el.fps.value = String(fps);

    var frameCount = Math.max(1, Math.round(durationSec * fps));
    if (frameCount > quality.frameLimit) {
      setStatus("帧数过多（" + frameCount + " 帧），请减小时长或 FPS 后重试。", true);
      return;
    }

    state.isConverting = true;
    updateConvertButtonState();
    resetGifResult();
    setProgress(0.01);
    setStatus("准备视频解码...");

    try {
      var workVideo = document.createElement("video");
      workVideo.preload = "auto";
      workVideo.muted = true;
      workVideo.playsInline = true;
      workVideo.src = state.sourceUrl;

      await waitForEvent(workVideo, "loadedmetadata", "error");

      var aspect = workVideo.videoWidth / workVideo.videoHeight;
      if (!Number.isFinite(aspect) || aspect <= 0) {
        throw new Error("无法读取视频尺寸");
      }

      var gifWidth = widthPx;
      var gifHeight = Math.max(2, Math.round(gifWidth / aspect));
      if (gifHeight > 720) {
        gifHeight = 720;
        gifWidth = Math.max(2, Math.round(gifHeight * aspect));
      }

      var canvas = document.createElement("canvas");
      canvas.width = gifWidth;
      canvas.height = gifHeight;
      var ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        throw new Error("浏览器不支持 Canvas 读写");
      }

      var frameTimes = [];
      for (var tIndex = 0; tIndex < frameCount; tIndex += 1) {
        frameTimes.push(startSec + tIndex / fps);
      }

      var histogram = new Uint32Array(32768);
      for (var aIndex = 0; aIndex < frameTimes.length; aIndex += 1) {
        setStatus("第 1/3 步：分析颜色 " + (aIndex + 1) + "/" + frameTimes.length + "...");
        await seekVideo(workVideo, frameTimes[aIndex]);
        ctx.drawImage(workVideo, 0, 0, gifWidth, gifHeight);
        var analysisImageData = ctx.getImageData(0, 0, gifWidth, gifHeight);
        collectHistogram(analysisImageData.data, gifWidth, gifHeight, histogram, quality.sampleStride);
        setProgress(((aIndex + 1) / frameTimes.length) * 0.45);
      }

      setStatus("第 2/3 步：生成自适应调色板...");
      var palette = buildPaletteFromHistogram(histogram, 256);
      var lookup = buildLookup15ToPalette(palette);
      var writer = new GifWriter(gifWidth, gifHeight, palette, 0);
      var frameDelayCs = Math.max(1, Math.round(100 / fps));
      setProgress(0.5);

      for (var eIndex = 0; eIndex < frameTimes.length; eIndex += 1) {
        setStatus("第 3/3 步：编码 GIF " + (eIndex + 1) + "/" + frameTimes.length + "...");
        await seekVideo(workVideo, frameTimes[eIndex]);
        ctx.drawImage(workVideo, 0, 0, gifWidth, gifHeight);
        var encodeImageData = ctx.getImageData(0, 0, gifWidth, gifHeight);
        var indexed = quantizeWithLookup(encodeImageData.data, gifWidth, gifHeight, lookup, quality.dither);
        writer.addFrame(indexed, frameDelayCs);
        setProgress(0.5 + ((eIndex + 1) / frameTimes.length) * 0.5);
      }

      setStatus("打包 GIF 数据...");
      var gifBytes = writer.finish();
      var gifBlob = new Blob([gifBytes], { type: "image/gif" });
      state.gifUrl = URL.createObjectURL(gifBlob);

      el.gifPreview.src = state.gifUrl;
      el.gifPreview.classList.remove("is-empty");
      el.gifMeta.textContent = formatBytes(gifBlob.size) + " | " + gifWidth + "x" + gifHeight + " | " + fps + "fps";

      el.downloadBtn.href = state.gifUrl;
      el.downloadBtn.download = (sanitizeName(state.selectedFile.name) || "output") + ".gif";
      el.downloadBtn.classList.remove("is-disabled");

      setProgress(1);
      setStatus("转换完成，可以预览并下载 GIF。");
    } catch (error) {
      console.error(error);
      setProgress(0);
      setStatus("转换失败：" + (error && error.message ? error.message : "未知错误"), true);
    } finally {
      state.isConverting = false;
      updateConvertButtonState();
    }
  }

  el.videoInput.addEventListener("change", function (evt) {
    var file = evt.target.files && evt.target.files[0];
    onFileSelected(file);
  });

  el.dropZone.addEventListener("dragover", function (evt) {
    evt.preventDefault();
    el.dropZone.classList.add("is-dragging");
  });

  el.dropZone.addEventListener("dragleave", function () {
    el.dropZone.classList.remove("is-dragging");
  });

  el.dropZone.addEventListener("drop", function (evt) {
    evt.preventDefault();
    el.dropZone.classList.remove("is-dragging");
    var file = evt.dataTransfer && evt.dataTransfer.files && evt.dataTransfer.files[0];
    onFileSelected(file);
  });

  el.convertBtn.addEventListener("click", function () {
    convertToGif();
  });

  el.downloadBtn.addEventListener("click", function (evt) {
    if (el.downloadBtn.classList.contains("is-disabled")) {
      evt.preventDefault();
    }
  });

  el.sourcePreview.addEventListener("loadedmetadata", function () {
    if (Number.isFinite(el.sourcePreview.duration)) {
      state.sourceDuration = el.sourcePreview.duration;
      if (Number(el.durationSec.value) > state.sourceDuration) {
        el.durationSec.value = String(Math.max(0.2, Math.floor(state.sourceDuration * 10) / 10));
      }
    }
    updateSourceMeta();
  });

  window.addEventListener("beforeunload", function () {
    cleanupObjectUrl(state.sourceUrl);
    cleanupObjectUrl(state.gifUrl);
  });

  updateConvertButtonState();
})();
