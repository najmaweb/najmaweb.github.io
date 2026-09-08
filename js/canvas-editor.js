document.addEventListener("DOMContentLoaded", () => {
  // 1. Inisialisasi Fabric Canvas
  const canvas = new fabric.Canvas("editorCanvas", {
    backgroundColor: "#ffffff",
    selection: true,
  });

  const colorPicker = document.getElementById("colorPicker");
  const layerList = document.getElementById("layerList");
  const layerCount = document.getElementById("layerCount");
  let objectCounter = 0;

  // Helper: Penamai unik untuk setiap layer baru
  function assignLayerMeta(obj, customName = null) {
    objectCounter++;
    obj.id =
      "layer_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4);
    obj.layerName =
      customName ||
      `${obj.type.charAt(0).toUpperCase() + obj.type.slice(1)} #${objectCounter}`;
  }

  // ==========================================
  // SINKRONISASI DAFTAR LAYER (RENDER UI)
  // ==========================================
  function renderLayerManager() {
    const objects = canvas.getObjects().slice().reverse(); // Urutan teratas di tampilkan paling atas
    layerCount.textContent = objects.length;

    if (objects.length === 0) {
      layerList.innerHTML = `<div class="text-xs text-slate-400 text-center py-8">Belum ada objek di kanvas</div>`;
      return;
    }

    layerList.innerHTML = "";
    const activeObj = canvas.getActiveObject();

    objects.forEach((obj) => {
      if (!obj.id) assignLayerMeta(obj);

      const isSelected = activeObj === obj;
      const isVisible = obj.visible !== false;
      const isLocked = obj.lockMovementX && obj.lockMovementY;

      const itemDiv = document.createElement("div");
      itemDiv.className = `layer-item border p-2 rounded flex items-center justify-between text-xs gap-2 cursor-pointer transition ${isSelected ? "active font-medium" : "hover:bg-slate-50"}`;
      itemDiv.dataset.id = obj.id;

      itemDiv.innerHTML = `
                <div class="flex items-center gap-2 overflow-hidden flex-1 select-none">
                    <span class="truncate text-slate-700">${obj.layerName}</span>
                </div>
                <div class="flex items-center gap-1">
                    <!-- Toggle Reorder (Up / Down) -->
                    <button class="btn-up p-1 hover:bg-slate-200 rounded text-slate-500" title="Naikkan Layer">▲</button>
                    <button class="btn-down p-1 hover:bg-slate-200 rounded text-slate-500" title="Turunkan Layer">▼</button>
                    <!-- Toggle Visibility -->
                    <button class="btn-vis p-1 hover:bg-slate-200 rounded text-slate-600" title="Toggle Show/Hide">
                        ${isVisible ? "👁️" : "🙈"}
                    </button>
                    <!-- Toggle Lock -->
                    <button class="btn-lock p-1 hover:bg-slate-200 rounded text-slate-600" title="Toggle Lock/Unlock">
                        ${isLocked ? "🔒" : "🔓"}
                    </button>
                </div>
            `;

      // Click pada item layer = Seleksi Objek di Canvas
      itemDiv.addEventListener("click", (e) => {
        if (e.target.tagName === "BUTTON") return;
        canvas.setActiveObject(obj);
        canvas.renderAll();
      });

      // Action: Naikkan Layer
      itemDiv.querySelector(".btn-up").addEventListener("click", () => {
        canvas.bringForward(obj);
        canvas.renderAll();
        renderLayerManager();
      });

      // Action: Turunkan Layer
      itemDiv.querySelector(".btn-down").addEventListener("click", () => {
        canvas.sendBackwards(obj);
        canvas.renderAll();
        renderLayerManager();
      });

      // Action: Lock / Unlock Layer
      itemDiv.querySelector(".btn-lock").addEventListener("click", () => {
        const lockState = !obj.lockMovementX;
        obj.set({
          lockMovementX: lockState,
          lockMovementY: lockState,
          lockRotation: lockState,
          lockScalingX: lockState,
          lockScalingY: lockState,
          hasControls: !lockState,
        });
        canvas.renderAll();
        renderLayerManager();
      });

      // Action: Toggle Visibility
      itemDiv.querySelector(".btn-vis").addEventListener("click", () => {
        obj.set("visible", !obj.visible);
        if (!obj.visible) canvas.discardActiveObject();
        canvas.renderAll();
        renderLayerManager();
      });

      layerList.appendChild(itemDiv);
    });
  }

  // Listeners Event Fabric.js untuk Auto-update Panel Layer
  canvas.on("object:added", renderLayerManager);
  canvas.on("object:removed", renderLayerManager);
  canvas.on("selection:created", renderLayerManager);
  canvas.on("selection:updated", renderLayerManager);
  canvas.on("selection:cleared", renderLayerManager);

  // ==========================================
  // MANAJEMEN PENAMBAHAN OBJEK
  // ==========================================

  // Stamp
  document.querySelectorAll(".stamp-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const imgUrl = this.getAttribute("data-url");
      const name = this.getAttribute("data-name");

      fabric.loadSVGFromURL(imgUrl, (objects, options) => {
        const svgObj = fabric.util.groupSVGElements(objects, options);
        assignLayerMeta(svgObj, name);
        svgObj.set({
          left: 100,
          top: 100,
          scaleX: 1.5,
          scaleY: 1.5,
          fill: colorPicker.value,
        });
        if (svgObj.isType("group")) {
          svgObj.forEachObject((o) => o.set("fill", colorPicker.value));
        }
        canvas.add(svgObj);
        canvas.setActiveObject(svgObj);
      });
    });
  });
  // Bentuk Geometris & Teks

  // Color Picker Control
  colorPicker.addEventListener("input", (e) => {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    const val = e.target.value;
    if (activeObj.type === "line") activeObj.set("stroke", val);
    else if (activeObj.isType("group"))
      activeObj.forEachObject((o) => o.set("fill", val));
    else activeObj.set("fill", val);

    canvas.renderAll();
  });

  // Hapus Objek & Reset
  document.getElementById("btnDelete").addEventListener("click", () => {
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length) {
      activeObjects.forEach((obj) => canvas.remove(obj));
      canvas.discardActiveObject();
    }
  });

  document.getElementById("btnClear").addEventListener("click", () => {
    if (confirm("Kosongkan seluruh kanvas?")) {
      canvas.clear();
      canvas.setBackgroundColor("#ffffff", canvas.renderAll.bind(canvas));
      objectCounter = 0;
    }
  });

  // Export PNG
  document.getElementById("btnExport").addEventListener("click", () => {
    const dataURL = canvas.toDataURL({ format: "png", quality: 1 });
    const a = document.createElement("a");
    a.download = "canvas-output.png";
    a.href = dataURL;
    a.click();
  });

  //start control position

  // ==========================================
  // KONTROL POSISI LAYER OBJEK (FABRIC.JS)
  // ==========================================

  // 1. Pindahkan Objek Ke Paling Depan
  document.getElementById("btnBringToFront").addEventListener("click", () => {
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.bringToFront(activeObject);
      canvas.discardActiveObject(); // Reset seleksi agar rendering layer bersih
      canvas.setActiveObject(activeObject);
      canvas.renderAll();
    }
  });

  // 2. Majukan Objek Satu Tingkat (Satu Step Ke Depan)
  document.getElementById("btnBringForward").addEventListener("click", () => {
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.bringForward(activeObject);
      canvas.renderAll();
    }
  });

  // 3. Mundurkan Objek Satu Tingkat (Satu Step Ke Belakang)
  document.getElementById("btnSendBackward").addEventListener("click", () => {
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.sendBackwards(activeObject);
      canvas.renderAll();
    }
  });

  // 4. Pindahkan Objek Ke Paling Belakang
  document.getElementById("btnSendToBack").addEventListener("click", () => {
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.sendToBack(activeObject);
      canvas.discardActiveObject();
      canvas.setActiveObject(activeObject);
      canvas.renderAll();
    }
  });
  //end control position
  //start control text
  // ==========================================
  // KONTROL FONT FAMILY & FONT SIZE
  // ==========================================
  const fontFamilySelect = document.getElementById("fontFamily");
  const fontSizeInput = document.getElementById("fontSize");

  // 1. Ubah Font Family pada Teks Aktif
  fontFamilySelect.addEventListener("change", (e) => {
    const activeObj = canvas.getActiveObject();
    if (
      activeObj &&
      (activeObj.type === "i-text" || activeObj.type === "text")
    ) {
      activeObj.set("fontFamily", e.target.value);
      canvas.renderAll();
    }
  });

  // 2. Ubah Font Size pada Teks Aktif
  fontSizeInput.addEventListener("input", (e) => {
    const activeObj = canvas.getActiveObject();
    if (
      activeObj &&
      (activeObj.type === "i-text" || activeObj.type === "text")
    ) {
      const newSize = parseInt(e.target.value, 10);
      if (!isNaN(newSize) && newSize > 0) {
        activeObj.set("fontSize", newSize);
        canvas.renderAll();
      }
    }
  });

  // 3. Sinkronkan nilai kontrol saat Objek Teks dipilih di Kanvas
  canvas.on("selection:created", updateTextControls);
  canvas.on("selection:updated", updateTextControls);

  function updateTextControls() {
    const activeObj = canvas.getActiveObject();
    if (
      activeObj &&
      (activeObj.type === "i-text" || activeObj.type === "text")
    ) {
      fontFamilySelect.value = activeObj.fontFamily || "sans-serif";
      fontSizeInput.value = activeObj.fontSize || 24;
    }
  }

  // 4. Set Nilai Font & Size saat Membuat Teks Baru
  document.getElementById("addText").addEventListener("click", () => {
    const text = new fabric.IText("Teks Baru", {
      left: 150,
      top: 150,
      fill: colorPicker.value,
      fontSize: parseInt(fontSizeInput.value, 10) || 24,
      fontFamily: fontFamilySelect.value || "sans-serif",
    });
    assignLayerMeta(text, "Teks");
    canvas.add(text);
    canvas.setActiveObject(text);
  });
  // ==========================================
  // KONTROL FORMAT TEKS (BOLD, ITALIC, UNDERLINE)
  // ==========================================
  const btnBold = document.getElementById("btnBold");
  const btnItalic = document.getElementById("btnItalic");
  const btnUnderline = document.getElementById("btnUnderline");

  // Helper: Cek apakah objek saat ini adalah teks
  function getActiveTextObject() {
    const activeObj = canvas.getActiveObject();
    if (
      activeObj &&
      (activeObj.type === "i-text" || activeObj.type === "text")
    ) {
      return activeObj;
    }
    return null;
  }

  // 1. Toggle Bold
  btnBold.addEventListener("click", () => {
    const textObj = getActiveTextObject();
    if (!textObj) return;

    const isBold = textObj.fontWeight === "bold";
    textObj.set("fontWeight", isBold ? "normal" : "bold");
    canvas.renderAll();
    updateTextFormatUI(textObj);
  });

  // 2. Toggle Italic
  btnItalic.addEventListener("click", () => {
    const textObj = getActiveTextObject();
    if (!textObj) return;

    const isItalic = textObj.fontStyle === "italic";
    textObj.set("fontStyle", isItalic ? "normal" : "italic");
    canvas.renderAll();
    updateTextFormatUI(textObj);
  });

  // 3. Toggle Underline
  btnUnderline.addEventListener("click", () => {
    const textObj = getActiveTextObject();
    if (!textObj) return;

    const isUnderline = textObj.underline === true;
    textObj.set("underline", !isUnderline);
    canvas.renderAll();
    updateTextFormatUI(textObj);
  });

  // 4. Update Status Visual Tombol (Aktif / Non-aktif)
  function updateTextFormatUI(textObj) {
    if (textObj) {
      // Style untuk status BOLD aktif
      if (textObj.fontWeight === "bold") {
        btnBold.classList.add(
          "bg-blue-100",
          "border-blue-500",
          "text-blue-700",
        );
      } else {
        btnBold.classList.remove(
          "bg-blue-100",
          "border-blue-500",
          "text-blue-700",
        );
      }

      // Style untuk status ITALIC aktif
      if (textObj.fontStyle === "italic") {
        btnItalic.classList.add(
          "bg-blue-100",
          "border-blue-500",
          "text-blue-700",
        );
      } else {
        btnItalic.classList.remove(
          "bg-blue-100",
          "border-blue-500",
          "text-blue-700",
        );
      }

      // Style untuk status UNDERLINE aktif
      if (textObj.underline) {
        btnUnderline.classList.add(
          "bg-blue-100",
          "border-blue-500",
          "text-blue-700",
        );
      } else {
        btnUnderline.classList.remove(
          "bg-blue-100",
          "border-blue-500",
          "text-blue-700",
        );
      }
    } else {
      // Reset warna tombol jika bukan objek teks
      [btnBold, btnItalic, btnUnderline].forEach((btn) => {
        btn.classList.remove("bg-blue-100", "border-blue-500", "text-blue-700");
      });
    }
  }

  // 5. Integrasi dengan Event Seleksi Canvas
  canvas.on("selection:created", () => updateTextControls());
  canvas.on("selection:updated", () => updateTextControls());
  canvas.on("selection:cleared", () => {
    updateTextFormatUI(null);
  });

  // Perbarui fungsi updateTextControls yang sudah ada
  function updateTextControls() {
    const textObj = getActiveTextObject();
    if (textObj) {
      fontFamilySelect.value = textObj.fontFamily || "sans-serif";
      fontSizeInput.value = textObj.fontSize || 24;
      updateTextFormatUI(textObj);
    } else {
      updateTextFormatUI(null);
    }
  }

  // ==========================================
  // KONTROL TEXT ALIGNMENT (LEFT, CENTER, RIGHT)
  // ==========================================
  const btnAlignLeft = document.getElementById("btnAlignLeft");
  const btnAlignCenter = document.getElementById("btnAlignCenter");
  const btnAlignRight = document.getElementById("btnAlignRight");

  // 1. Fungsi Set Text Alignment
  function setTextAlign(alignment) {
    const textObj = getActiveTextObject();
    if (!textObj) return;

    textObj.set("textAlign", alignment);
    canvas.renderAll();
    updateTextAlignUI(alignment);
  }

  // 2. Event Listeners Tombol Alignment
  btnAlignLeft.addEventListener("click", () => setTextAlign("left"));
  btnAlignCenter.addEventListener("click", () => setTextAlign("center"));
  btnAlignRight.addEventListener("click", () => setTextAlign("right"));

  // 3. Update Visual UI Tombol Alignment Aktif
  function updateTextAlignUI(currentAlign) {
    const alignBtns = {
      left: btnAlignLeft,
      center: btnAlignCenter,
      right: btnAlignRight,
    };

    // Reset semua gaya tombol alignment
    Object.values(alignBtns).forEach((btn) => {
      btn.classList.remove("bg-blue-100", "border-blue-500", "text-blue-700");
    });

    // Tandai tombol yang aktif jika ada
    if (currentAlign && alignBtns[currentAlign]) {
      alignBtns[currentAlign].classList.add(
        "bg-blue-100",
        "border-blue-500",
        "text-blue-700",
      );
    }
  }

  // 4. Integrasikan dengan Fungsi updateTextControls
  // Perbarui fungsi updateTextControls yang sudah ada sebelumnya:
  function updateTextControls() {
    const textObj = getActiveTextObject();
    if (textObj) {
      fontFamilySelect.value = textObj.fontFamily || "sans-serif";
      fontSizeInput.value = textObj.fontSize || 24;
      updateTextFormatUI(textObj);
      updateTextAlignUI(textObj.textAlign || "left"); // Sync UI Alignment
    } else {
      updateTextFormatUI(null);
      updateTextAlignUI(null);
    }
  }
  //end control text
  //start custom object
  // ==========================================
  // KONTROL UPLOAD GAMBAR LOKAL
  // ==========================================
  const imageUploader = document.getElementById("imageUploader");

  imageUploader.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Gunakan FileReader untuk membaca gambar lokal sebagai Data URL
    const reader = new FileReader();

    reader.onload = (event) => {
      const imgDataUrl = event.target.result;

      // Muat gambar ke Fabric.js
      fabric.Image.fromURL(imgDataUrl, (img) => {
        // Autoscale: Batasi ukuran maksimal gambar saat masuk kanvas (misal max 300px)
        const maxDimension = 300;
        if (img.width > maxDimension || img.height > maxDimension) {
          const scale = maxDimension / Math.max(img.width, img.height);
          img.scale(scale);
        }

        // Posisikan gambar di tengah kanvas
        img.set({
          left: (canvas.width - img.getScaledWidth()) / 2,
          top: (canvas.height - img.getScaledHeight()) / 2,
        });

        // Beri metadata nama layer sesuai nama file gambar
        const fileName =
          file.name.length > 15
            ? file.name.substring(0, 15) + "..."
            : file.name;
        assignLayerMeta(img, `Gambar (${fileName})`);

        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();

        // Reset input file agar bisa mengupload file yang sama lagi jika perlu
        imageUploader.value = "";
      });
    };

    reader.readAsDataURL(file);
  });
  //end custom object
  //start background remover
  // ==========================================
  // FITUR PENGHAPUS BACKGROUND (CLIENT-SIDE)
  // ==========================================

  const btnRemoveBgModal = document.getElementById("btnRemoveBgModal");
  const bgRemoverModal = document.getElementById("bgRemoverModal");
  const btnCloseBgModal = document.getElementById("btnCloseBgModal");
  const btnCancelBg = document.getElementById("btnCancelBg");
  const btnApplyRemoveBg = document.getElementById("btnApplyRemoveBg");
  const previewCanvas = document.getElementById("previewRemoveBgCanvas");
  const previewCtx = previewCanvas.getContext("2d");
  const bgToleranceInput = document.getElementById("bgTolerance");
  const toleranceVal = document.getElementById("toleranceVal");

  let targetImgObj = null;
  let originalImageData = null;
  let targetColor = { r: 255, g: 255, b: 255 }; // Default warna putih

  // 1. Tampilkan tombol "Hapus Background" hanya jika objek terpilih adalah Gambar
  canvas.on("selection:created", checkImageSelection);
  canvas.on("selection:updated", checkImageSelection);
  canvas.on("selection:cleared", () =>
    btnRemoveBgModal.classList.add("hidden"),
  );

  function checkImageSelection() {
    const activeObj = canvas.getActiveObject();
    if (activeObj && activeObj.type === "image") {
      btnRemoveBgModal.classList.remove("hidden");
    } else {
      btnRemoveBgModal.classList.add("hidden");
    }
  }

  // 2. Buka Modal & Render Gambar ke Preview Canvas
  btnRemoveBgModal.addEventListener("click", () => {
    targetImgObj = canvas.getActiveObject();
    if (!targetImgObj || targetImgObj.type !== "image") return;

    const imgElement = targetImgObj._element;
    previewCanvas.width = imgElement.naturalWidth || imgElement.width;
    previewCanvas.height = imgElement.naturalHeight || imgElement.height;

    // Gambar ulang ke preview canvas
    previewCtx.drawImage(imgElement, 0, 0);
    originalImageData = previewCtx.getImageData(
      0,
      0,
      previewCanvas.width,
      previewCanvas.height,
    );

    // Buka Modal
    bgRemoverModal.classList.remove("hidden");
    processBgRemoval(); // Run initial removal
  });

  // 3. Ambil Warna yang Di-klik User pada Canvas Preview
  previewCanvas.addEventListener("click", (e) => {
    const rect = previewCanvas.getBoundingClientRect();
    const scaleX = previewCanvas.width / rect.width;
    const scaleY = previewCanvas.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    const pixel = previewCtx.getImageData(x, y, 1, 1).data;
    targetColor = { r: pixel[0], g: pixel[1], b: pixel[2] };

    processBgRemoval();
  });

  // 4. Update Sensitivitas Toleransi Warna
  bgToleranceInput.addEventListener("input", (e) => {
    toleranceVal.textContent = e.target.value;
    processBgRemoval();
  });

  // 5. Algoritma Penghapus Warna Background (Color Distance Thresholding)
  function processBgRemoval() {
    if (!originalImageData) return;

    const tolerance = parseInt(bgToleranceInput.value, 10);
    const imgData = new ImageData(
      new Uint8ClampedArray(originalImageData.data),
      originalImageData.width,
      originalImageData.height,
    );
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Hitung jarak Euclidean warna piksel dengan warna target
      const distance = Math.sqrt(
        Math.pow(r - targetColor.r, 2) +
          Math.pow(g - targetColor.g, 2) +
          Math.pow(b - targetColor.b, 2),
      );

      // Jika jarak warna masuk dalam toleransi, buat transparan (Alpha = 0)
      if (distance <= tolerance) {
        data[i + 3] = 0;
      }
    }

    previewCtx.putImageData(imgData, 0, 0);
  }

  // 6. Terapkan Hasil Kembali ke Fabric.js Canvas
  btnApplyRemoveBg.addEventListener("click", () => {
    if (!targetImgObj) return;

    const newImgUrl = previewCanvas.toDataURL("image/png");

    fabric.Image.fromURL(newImgUrl, (newImg) => {
      newImg.set({
        left: targetImgObj.left,
        top: targetImgObj.top,
        scaleX: targetImgObj.scaleX,
        scaleY: targetImgObj.scaleY,
        angle: targetImgObj.angle,
        id: targetImgObj.id,
        layerName: targetImgObj.layerName + " (No BG)",
      });

      canvas.remove(targetImgObj);
      canvas.add(newImg);
      canvas.setActiveObject(newImg);
      canvas.renderAll();

      closeModal();
    });
  });

  // Close Modal Handler
  function closeModal() {
    bgRemoverModal.classList.add("hidden");
    targetImgObj = null;
    originalImageData = null;
  }

  btnCloseBgModal.addEventListener("click", closeModal);
  btnCancelBg.addEventListener("click", closeModal);
  //end background remover
  //start border only
  // ==========================================
  // KONTROL BORDER & FILL UNTUK PERSEGI & LINGKARAN
  // ==========================================
  const shapeControls = document.getElementById("shapeControls");
  const transparentFill = document.getElementById("transparentFill");
  const strokeColorPicker = document.getElementById("strokeColorPicker");
  const strokeWidthInput = document.getElementById("strokeWidthInput");

  // Helper: Cek apakah objek terpilih adalah Shape (Rect / Circle)
  function getActiveShapeObject() {
    const activeObj = canvas.getActiveObject();
    if (
      activeObj &&
      (activeObj.type === "rect" || activeObj.type === "circle")
    ) {
      return activeObj;
    }
    return null;
  }

  // 1. Toggle Transparan Fill (Tanpa Isi / Hanya Border)
  transparentFill.addEventListener("change", (e) => {
    const shape = getActiveShapeObject();
    if (!shape) return;

    if (e.target.checked) {
      shape.set("fill", "transparent");
      // Jika stroke belum ada, set otomatis dari stroke picker
      if (!shape.stroke || shape.strokeWidth === 0) {
        shape.set({
          stroke: strokeColorPicker.value,
          strokeWidth: parseInt(strokeWidthInput.value, 10) || 2,
        });
      }
    } else {
      shape.set("fill", colorPicker.value);
    }
    canvas.renderAll();
  });

  // 2. Ubah Warna Border (Stroke Color)
  strokeColorPicker.addEventListener("input", (e) => {
    const shape = getActiveShapeObject();
    if (!shape) return;

    shape.set("stroke", e.target.value);
    canvas.renderAll();
  });

  // 3. Ubah Ketebalan Border (Stroke Width)
  strokeWidthInput.addEventListener("input", (e) => {
    const shape = getActiveShapeObject();
    if (!shape) return;

    const width = parseInt(e.target.value, 10);
    shape.set("strokeWidth", isNaN(width) ? 0 : width);
    canvas.renderAll();
  });

  // 4. Sinkronkan Toolbar saat Objek Shape Dipilih di Canvas
  canvas.on("selection:created", updateShapeControls);
  canvas.on("selection:updated", updateShapeControls);
  canvas.on("selection:cleared", () => shapeControls.classList.add("hidden"));

  function updateShapeControls() {
    const shape = getActiveShapeObject();
    if (shape) {
      shapeControls.classList.remove("hidden");

      // Sync nilai checkbox transparan
      transparentFill.checked =
        shape.fill === "transparent" || shape.fill === "";

      // Sync warna dan ketebalan border
      strokeColorPicker.value = shape.stroke || "#000000";
      strokeWidthInput.value =
        shape.strokeWidth !== undefined ? shape.strokeWidth : 2;
    } else {
      shapeControls.classList.add("hidden");
    }
  }

  // 5. Update Fungsi Pembuatan Persegi & Lingkaran Baru
  document.getElementById("addRect").addEventListener("click", () => {
    const isTransparent = transparentFill.checked;
    const rect = new fabric.Rect({
      left: 120,
      top: 120,
      width: 100,
      height: 80,
      fill: isTransparent ? "transparent" : colorPicker.value,
      stroke: strokeColorPicker.value,
      strokeWidth: isTransparent
        ? parseInt(strokeWidthInput.value, 10) || 2
        : parseInt(strokeWidthInput.value, 10) || 0,
      rx: 4,
      ry: 4,
    });
    assignLayerMeta(rect, "Persegi");
    canvas.add(rect);
    canvas.setActiveObject(rect);
  });

  document.getElementById("addCircle").addEventListener("click", () => {
    const isTransparent = transparentFill.checked;
    const circle = new fabric.Circle({
      left: 150,
      top: 150,
      radius: 45,
      fill: isTransparent ? "transparent" : colorPicker.value,
      stroke: strokeColorPicker.value,
      strokeWidth: isTransparent
        ? parseInt(strokeWidthInput.value, 10) || 2
        : parseInt(strokeWidthInput.value, 10) || 0,
    });
    assignLayerMeta(circle, "Lingkaran");
    canvas.add(circle);
    canvas.setActiveObject(circle);
  });
  //end border only
  //start line property
  // ==========================================
  // KONTROL STYLE GARIS & PANAH (FABRIC.JS)
  // ==========================================
  const lineControls = document.getElementById("lineControls");
  const lineDashStyle = document.getElementById("lineDashStyle");
  const lineArrowStyle = document.getElementById("lineArrowStyle");

  // Helper: Cek apakah objek terpilih adalah Garis (Line) atau Group Garis+Panah
  function getActiveLineObject() {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return null;

    if (activeObj.type === "line" || activeObj.isLineGroup) {
      return activeObj;
    }
    return null;
  }

  // 1. Array Dash Pattern untuk Fabric.js
  function getStrokeDashArray(style, strokeWidth) {
    const sw = strokeWidth || 2;
    switch (style) {
      case "dashed":
        return [sw * 4, sw * 2]; // Panjang garis 4x tebal, spasi 2x tebal
      case "dotted":
        return [sw, sw * 2]; // Titik setebal garis, spasi 2x tebal
      default:
        return null; // Solid Line
    }
  }

  // 2. Fungsi Membuat Kepala Panah (Arrowhead Polygon)
  function createArrowHead(x, y, angle, color) {
    return new fabric.Polygon(
      [
        { x: 0, y: 0 },
        { x: -12, y: -6 },
        { x: -12, y: 6 },
      ],
      {
        fill: color,
        left: x,
        top: y,
        angle: angle,
        originX: "center",
        originY: "center",
        selectable: false,
      },
    );
  }

  // 3. Re-build Objek Garis saat Style/Panah Diubah
  function updateLineObject() {
    const activeObj = getActiveLineObject();
    if (!activeObj) return;

    // Ambil parameter garis saat ini
    let x1, y1, x2, y2, strokeColor, strokeWidth;

    if (activeObj.isLineGroup) {
      const lineElem = activeObj.item(0);
      strokeColor = lineElem.stroke;
      strokeWidth = lineElem.strokeWidth;

      // Ambil koordinat absolut titik ujung dari group
      const matrix = activeObj.calcTransformMatrix();
      const p1 = fabric.util.transformPoint(
        { x: lineElem.x1, y: lineElem.y1 },
        matrix,
      );
      const p2 = fabric.util.transformPoint(
        { x: lineElem.x2, y: lineElem.y2 },
        matrix,
      );
      x1 = p1.x;
      y1 = p1.y;
      x2 = p2.x;
      y2 = p2.y;
    } else {
      x1 = activeObj.x1;
      y1 = activeObj.y1;
      x2 = activeObj.x2;
      y2 = activeObj.y2;
      strokeColor = activeObj.stroke;
      strokeWidth = activeObj.strokeWidth;
    }

    const dashPattern = getStrokeDashArray(lineDashStyle.value, strokeWidth);
    const arrowType = lineArrowStyle.value;

    // Hitung Sudut Rotasi Panah
    const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

    // Buat Elemen Line Dasar
    const baseLine = new fabric.Line([x1, y1, x2, y2], {
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      strokeDashArray: dashPattern,
      originX: "center",
      originY: "center",
    });

    let finalObj;

    if (arrowType === "none") {
      finalObj = baseLine;
    } else {
      const groupItems = [baseLine];

      if (arrowType === "end" || arrowType === "both") {
        groupItems.push(createArrowHead(x2, y2, angle, strokeColor));
      }
      if (arrowType === "start" || arrowType === "both") {
        groupItems.push(createArrowHead(x1, y1, angle + 180, strokeColor));
      }

      finalObj = new fabric.Group(groupItems, {
        left: Math.min(x1, x2),
        top: Math.min(y1, y2),
        isLineGroup: true,
        dashStyle: lineDashStyle.value,
        arrowStyle: arrowType,
      });
    }

    finalObj.isLineGroup = arrowType !== "none";
    finalObj.dashStyle = lineDashStyle.value;
    finalObj.arrowStyle = arrowType;
    assignLayerMeta(finalObj, "Garis");

    canvas.remove(activeObj);
    canvas.add(finalObj);
    canvas.setActiveObject(finalObj);
    canvas.renderAll();
  }

  // 4. Event Listener Control Garis
  lineDashStyle.addEventListener("change", updateLineObject);
  lineArrowStyle.addEventListener("change", updateLineObject);

  // 5. Sync Toolbar saat Garis Dipilih
  canvas.on("selection:created", updateLineControls);
  canvas.on("selection:updated", updateLineControls);
  canvas.on("selection:cleared", () => lineControls.classList.add("hidden"));

  function updateLineControls() {
    const lineObj = getActiveLineObject();
    if (lineObj) {
      lineControls.classList.remove("hidden");
      lineDashStyle.value = lineObj.dashStyle || "solid";
      lineArrowStyle.value = lineObj.arrowStyle || "none";
    } else {
      lineControls.classList.add("hidden");
    }
  }

  // 6. Update Tombol Tambah Garis Baru (+ Garis)
  document.getElementById("addLine").addEventListener("click", () => {
    const strokeWidth = parseInt(strokeWidthInput.value, 10) || 3;
    const dashPattern = getStrokeDashArray(lineDashStyle.value, strokeWidth);
    const arrowType = lineArrowStyle.value;

    const x1 = 150,
      y1 = 150,
      x2 = 300,
      y2 = 150;
    const strokeColor = colorPicker.value;

    const baseLine = new fabric.Line([x1, y1, x2, y2], {
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      strokeDashArray: dashPattern,
    });

    let lineObj;

    if (arrowType === "none") {
      lineObj = baseLine;
    } else {
      const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
      const groupItems = [baseLine];

      if (arrowType === "end" || arrowType === "both") {
        groupItems.push(createArrowHead(x2, y2, angle, strokeColor));
      }
      if (arrowType === "start" || arrowType === "both") {
        groupItems.push(createArrowHead(x1, y1, angle + 180, strokeColor));
      }

      lineObj = new fabric.Group(groupItems, {
        isLineGroup: true,
      });
    }

    lineObj.dashStyle = lineDashStyle.value;
    lineObj.arrowStyle = arrowType;
    assignLayerMeta(lineObj, "Garis");

    canvas.add(lineObj);
    canvas.setActiveObject(lineObj);
    canvas.renderAll();
  });
  //end line property
  //start grid and snap
  // ==========================================
  // RULER, GRID, & SNAP TO GRID SYSTEM
  // ==========================================

  const btnToggleGrid = document.getElementById("btnToggleGrid");
  const btnToggleSnap = document.getElementById("btnToggleSnap");
  const statusGrid = document.getElementById("statusGrid");
  const statusSnap = document.getElementById("statusSnap");
  const rulerTop = document.getElementById("rulerTop");
  const rulerLeft = document.getElementById("rulerLeft");

  const GRID_SIZE = 20; // Ukuran grid dalam piksel (20x20 px)
  let isGridVisible = false;
  let isSnapEnabled = false;
  let gridGroup = null;

  // ------------------------------------------
  // 1. DIBUAT DENGAN OVERLAY CANVAS / PATTERN GRID
  // ------------------------------------------
  function renderGrid() {
    // Hapus grid lama jika ada
    if (gridGroup) {
      canvas.remove(gridGroup);
      gridGroup = null;
    }

    if (!isGridVisible) {
      canvas.renderAll();
      return;
    }

    const gridLines = [];
    const width = canvas.width;
    const height = canvas.height;

    // Garis Vertikal
    for (let i = 0; i < width / GRID_SIZE; i++) {
      gridLines.push(
        new fabric.Line([i * GRID_SIZE, 0, i * GRID_SIZE, height], {
          stroke: "#e2e8f0",
          strokeWidth: 1,
          selectable: false,
          evented: false,
        }),
      );
    }

    // Garis Horizontal
    for (let j = 0; j < height / GRID_SIZE; j++) {
      gridLines.push(
        new fabric.Line([0, j * GRID_SIZE, width, j * GRID_SIZE], {
          stroke: "#e2e8f0",
          strokeWidth: 1,
          selectable: false,
          evented: false,
        }),
      );
    }

    gridGroup = new fabric.Group(gridLines, {
      selectable: false,
      evented: false,
      excludeFromExport: true, // Agar grid tidak terbawa saat ekspor gambar/PDF
    });

    canvas.add(gridGroup);
    canvas.sendToBack(gridGroup); // Tempatkan grid di background paling bawah
    canvas.renderAll();
  }

  // ------------------------------------------
  // 2. RENDER PENGGARIS (RULER TOP & LEFT)
  // ------------------------------------------
  function drawRulers() {
    const width = canvas.width;
    const height = canvas.height;

    // Clear Rulers
    rulerTop.innerHTML = "";
    rulerLeft.innerHTML = "";

    // Render Ruler Atas
    for (let x = 0; x < width; x += 50) {
      const mark = document.createElement("div");
      mark.className =
        "absolute border-l border-slate-400 h-2 bottom-0 text-[8px] pl-0.5 leading-none";
      mark.style.left = `${x}px`;
      if (x % 100 === 0) {
        mark.className =
          "absolute border-l border-slate-600 h-3.5 bottom-0 text-[9px] pl-0.5 leading-none font-semibold";
        mark.innerText = x;
      }
      rulerTop.appendChild(mark);
    }

    // Render Ruler Kiri
    for (let y = 0; y < height; y += 50) {
      const mark = document.createElement("div");
      mark.className =
        "absolute border-t border-slate-400 w-2 right-0 text-[8px] pt-0.5 pr-0.5 text-right leading-none";
      mark.style.top = `${y}px`;
      if (y % 100 === 0) {
        mark.className =
          "absolute border-t border-slate-600 w-3.5 right-0 text-[9px] pt-0.5 pr-0.5 text-right leading-none font-semibold";
        mark.innerText = y;
      }
      rulerLeft.appendChild(mark);
    }
  }

  // Inisialisasi penggaris saat halaman dimuat
  drawRulers();

  // ------------------------------------------
  // 3. LOGIKA SNAP TO GRID SAAT DRAG OBJEK
  // ------------------------------------------
  canvas.on("object:moving", (options) => {
    if (!isSnapEnabled) return;

    const obj = options.target;

    // Bulatkan koordinat posisi ke kelipatan GRID_SIZE terdekat
    obj.set({
      left: Math.round(obj.left / GRID_SIZE) * GRID_SIZE,
      top: Math.round(obj.top / GRID_SIZE) * GRID_SIZE,
    });
  });

  // Snap saat objek di-resize
  canvas.on("object:scaling", (options) => {
    if (!isSnapEnabled) return;

    const obj = options.target;
    const newWidth =
      Math.round((obj.width * obj.scaleX) / GRID_SIZE) * GRID_SIZE;
    const newHeight =
      Math.round((obj.height * obj.scaleY) / GRID_SIZE) * GRID_SIZE;

    obj.set({
      scaleX: newWidth / obj.width,
      scaleY: newHeight / obj.height,
    });
  });

  // ------------------------------------------
  // 4. EVENT LISTENERS TOGGLE
  // ------------------------------------------
  btnToggleGrid.addEventListener("click", () => {
    isGridVisible = !isGridVisible;
    statusGrid.textContent = isGridVisible ? "ON" : "OFF";
    statusGrid.className = isGridVisible
      ? "font-bold text-emerald-600"
      : "font-bold text-red-500";
    renderGrid();
  });

  btnToggleSnap.addEventListener("click", () => {
    isSnapEnabled = !isSnapEnabled;
    statusSnap.textContent = isSnapEnabled ? "ON" : "OFF";
    statusSnap.className = isSnapEnabled
      ? "font-bold text-emerald-600"
      : "font-bold text-red-500";
  });
  //end grid and snap

  //start flipper
  const imageFlipControls = document.getElementById("imageFlipControls");
  const btnFlipX = document.getElementById("btnFlipX");
  const btnFlipY = document.getElementById("btnFlipY");

  // Helper: Cek apakah objek terpilih adalah Gambar / Stamp / Group Svg
  function getActiveImageObject() {
    const activeObj = canvas.getActiveObject();
    if (
      activeObj &&
      (activeObj.type === "image" || activeObj.type === "group")
    ) {
      return activeObj;
    }
    return null;
  }

  // 1. Toggle Flip Horizontal (Flip X)
  btnFlipX.addEventListener("click", () => {
    const activeObj = getActiveImageObject();
    if (!activeObj) return;

    activeObj.set("flipX", !activeObj.flipX);
    canvas.renderAll();
    updateFlipButtonsState(activeObj);
  });

  // 2. Toggle Flip Vertical (Flip Y)
  btnFlipY.addEventListener("click", () => {
    const activeObj = getActiveImageObject();
    if (!activeObj) return;

    activeObj.set("flipY", !activeObj.flipY);
    canvas.renderAll();
    updateFlipButtonsState(activeObj);
  });

  // 3. Update Tampilan Tombol saat Objek Dipilih
  canvas.on("selection:created", checkFlipControls);
  canvas.on("selection:updated", checkFlipControls);
  canvas.on("selection:cleared", () =>
    imageFlipControls.classList.add("hidden"),
  );

  function checkFlipControls() {
    const activeObj = getActiveImageObject();
    if (activeObj) {
      imageFlipControls.classList.remove("hidden");
      updateFlipButtonsState(activeObj);
    } else {
      imageFlipControls.classList.add("hidden");
    }
  }

  // Ubah gaya tombol jika status flip sedang aktif (ON)
  function updateFlipButtonsState(obj) {
    if (obj.flipX) {
      btnFlipX.classList.add(
        "bg-indigo-50",
        "border-indigo-300",
        "text-indigo-600",
      );
    } else {
      btnFlipX.classList.remove(
        "bg-indigo-50",
        "border-indigo-300",
        "text-indigo-600",
      );
    }

    if (obj.flipY) {
      btnFlipY.classList.add(
        "bg-indigo-50",
        "border-indigo-300",
        "text-indigo-600",
      );
    } else {
      btnFlipY.classList.remove(
        "bg-indigo-50",
        "border-indigo-300",
        "text-indigo-600",
      );
    }
  }
  //end flipper
  //start objects
  loadImage = (objUrl) => {
    fabric.loadSVGFromString(objUrl, function (objects, options) {
      const obj = fabric.util.groupSVGElements(objects, options);
      obj.set({
        left: 50,
        top: 50,
      });
      canvas.add(obj);
      canvas.renderAll();
    });
  };
  axe = document.getElementById("stampAxe");
  axe.addEventListener("click", function () {
    loadImage(axeUrl);
  });
  Baloon2 = document.getElementById("stampBaloon2");
  Baloon2.addEventListener("click", function () {
    loadImage(stampBaloon2);
  });
  Baloon1 = document.getElementById("stampBaloon1");
  Baloon1.addEventListener("click", function () {
    loadImage(stampBaloon1);
  });
  Television1 = document.getElementById("stampTelevision1");
  Television1.addEventListener("click", function () {
    loadImage(stampTelevision1);
  });
  //end objects
  //start templater
  // ==========================================
  // FITUR TEMPLATE DARI KUMPULAN OBJEK (FABRIC.JS)
  // ==========================================

  const btnSaveTemplate = document.getElementById("btnSaveTemplate");
  const selectTemplateList = document.getElementById("selectTemplateList");

  // Key penyimpanan lokal (bisa diganti dengan endpoint API Laravel)
  const STORAGE_KEY = "canvas_templates_db";

  // Custom properties yang harus ikut diekspor oleh Fabric.js
  const CUSTOM_PROPERTIES = [
    "id",
    "layerName",
    "isLineGroup",
    "dashStyle",
    "arrowStyle",
  ];

  // ------------------------------------------
  // 1. SIMPAN TEMPLATE (SELEKSI ATAU SELURUH KANVAS)
  // ------------------------------------------
  btnSaveTemplate.addEventListener("click", () => {
    const activeObj = canvas.getActiveObject();
    let templateData = [];

    const templateName = prompt("Masukkan nama template:");
    if (!templateName) return;

    if (activeObj) {
      // Jika ada objek/grup yang sedang dipilih
      if (activeObj.type === "activeSelection") {
        // Pengguna memilih beberapa objek sekaligus (Multi-select)
        templateData = activeObj.toGroup().toObject(CUSTOM_PROPERTIES).objects;
        canvas.discardActiveObject(); // Un-group kembali setelah diambil
      } else {
        // Objek tunggal atau Group biasa
        templateData = [activeObj.toObject(CUSTOM_PROPERTIES)];
      }
    } else {
      // Jika tidak ada objek terpilih, simpan SELURUH objek di kanvas (kecuali grid)
      const allObjects = canvas
        .getObjects()
        .filter((obj) => !obj.excludeFromExport);
      if (allObjects.length === 0) {
        alert("Tidak ada objek di kanvas untuk dijadikan template!");
        return;
      }
      templateData = allObjects.map((obj) => obj.toObject(CUSTOM_PROPERTIES));
    }

    // Simpan ke LocalStorage (Atau kirim via fetch/axios ke Controller Laravel)
    const templates = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    templates[templateName] = templateData;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));

    alert(`Template "${templateName}" berhasil disimpan!`);
    loadTemplateDropdown();
  });
  // ------------------------------------------
  // 2. TAMPILKAN DAFTAR TEMPLATE DI DROPDOWN
  // ------------------------------------------
  function loadTemplateDropdown() {
    selectTemplateList.innerHTML =
      '<option value="">-- Muat Template --</option>';
    const templates = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");

    Object.keys(templates).forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      selectTemplateList.appendChild(option);
    });
  }

  // Inisialisasi daftar template saat aplikasi dimuat
  loadTemplateDropdown();
  //start errorr
  // ------------------------------------------
  // 3. MUAT TEMPLATE KE KANVAS (APPEND OBJEK)
  // ------------------------------------------
  selectTemplateList.addEventListener("change", (e) => {
    const templateName = e.target.value;
    if (!templateName) return;

    const templates = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const templateData = templates[templateName];

    if (!templateData) return;

    // Enkapsulasi objek JSON ke dalam Fabric.js Objects
    fabric.util.enlivenObjects(templateData, (enlivenedObjects) => {
      const addedObjects = [];

      enlivenedObjects.forEach((obj) => {
        // Geser sedikit posisi objek template agar tidak menumpuk sempurna di titik (0,0)
        obj.set({
          left: obj.left + 20,
          top: obj.top + 20,
        });

        canvas.add(obj);
        addedObjects.push(obj);
      });

      // Seleksi otomatis seluruh objek template yang baru dimasukkan
      if (addedObjects.length > 1) {
        const sel = new fabric.ActiveSelection(addedObjects, {
          canvas: canvas,
        });
        canvas.setActiveObject(sel);
      } else if (addedObjects.length === 1) {
        canvas.setActiveObject(addedObjects[0]);
      }

      canvas.renderAll();
      selectTemplateList.value = ""; // Reset dropdown
    });
  });
  //end errorr
  //end templater
  //start template saver
  // ==========================================
  // EXPORT & IMPORT TEMPLATE SEBAGAI FILE .JSON
  // ==========================================

  const btnExportJson = document.getElementById("btnExportJson");
  const importJsonInput = document.getElementById("importJsonInput");

  // Properti kustom yang harus ikut tersimpan
  /*const CUSTOM_PROPERTIES = [
    "id",
    "layerName",
    "isLineGroup",
    "dashStyle",
    "arrowStyle",
  ];
*/
  // 1. DOWLOAD TEMPLATE KE FILE .JSON
  btnExportJson.addEventListener("click", () => {
    const activeObj = canvas.getActiveObject();
    let templateData = [];

    if (activeObj) {
      if (activeObj.type === "activeSelection") {
        templateData = activeObj.toGroup().toObject(CUSTOM_PROPERTIES).objects;
        canvas.discardActiveObject();
      } else {
        templateData = [activeObj.toObject(CUSTOM_PROPERTIES)];
      }
    } else {
      const allObjects = canvas
        .getObjects()
        .filter((obj) => !obj.excludeFromExport);
      if (allObjects.length === 0) {
        alert("Tidak ada objek di kanvas untuk diekspor!");
        return;
      }
      templateData = allObjects.map((obj) => obj.toObject(CUSTOM_PROPERTIES));
    }

    // Format menjadi string JSON
    const jsonString = JSON.stringify(templateData, null, 2);

    // Buat element anchor sementara untuk proses download
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `template-canvas-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });

  // 2. IMPOR & BACA FILE .JSON KE KANVAS
  importJsonInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
      alert("Format file harus berupa .json");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const templateData = JSON.parse(event.target.result);

        if (!Array.isArray(templateData)) {
          alert("Struktur file JSON template tidak valid!");
          return;
        }

        fabric.util.enlivenObjects(templateData, (enlivenedObjects) => {
          const addedObjects = [];

          enlivenedObjects.forEach((obj) => {
            canvas.add(obj);
            addedObjects.push(obj);
          });

          if (addedObjects.length > 1) {
            const sel = new fabric.ActiveSelection(addedObjects, {
              canvas: canvas,
            });
            canvas.setActiveObject(sel);
          } else if (addedObjects.length === 1) {
            canvas.setActiveObject(addedObjects[0]);
          }

          canvas.renderAll();
          importJsonInput.value = ""; // Reset input
        });
      } catch (err) {
        alert("Gagal membaca file JSON!");
        console.error(err);
      }
    };

    reader.readAsText(file);
  });
  //end template saver
  //start artistik text
  // ==========================================
  // FITUR TEKS ARTISTIK (FABRIC.JS)
  // ==========================================

  const artisticTextControls = document.getElementById("artisticTextControls");
  const textPresetSelect = document.getElementById("textPresetSelect");
  const btnToggleShadow = document.getElementById("btnToggleShadow");
  const textStrokeColor = document.getElementById("textStrokeColor");
  const textStrokeWidth = document.getElementById("textStrokeWidth");

  // Helper: Cek apakah objek terpilih adalah Teks
  function getActiveTextObject() {
    const activeObj = canvas.getActiveObject();
    if (
      activeObj &&
      (activeObj.type === "i-text" ||
        activeObj.type === "text" ||
        activeObj.type === "textbox")
    ) {
      return activeObj;
    }
    return null;
  }

  // 1. Terapkan Preset Efek Teks Artistik
  textPresetSelect.addEventListener("change", (e) => {
    const textObj = getActiveTextObject();
    if (!textObj) return;

    const preset = e.target.value;

    switch (preset) {
      case "neon":
        // Efek Neon Menyala
        textObj.set({
          fill: "#ffffff",
          stroke: "#ff007f",
          strokeWidth: 2,
          shadow: new fabric.Shadow({
            color: "#ff007f",
            blur: 20,
            offsetX: 0,
            offsetY: 0,
          }),
        });
        break;

      case "3d":
        // Efek 3D Pop Out
        textObj.set({
          fill: "#f59e0b",
          stroke: "#78350f",
          strokeWidth: 1.5,
          shadow: new fabric.Shadow({
            color: "#78350f",
            blur: 0,
            offsetX: 4,
            offsetY: 4,
          }),
        });
        break;

      case "gradient":
        // Efek Gradiasi Warna Sunset
        const gradient = new fabric.Gradient({
          type: "linear",
          gradientUnits: "pixels",
          coords: { x1: 0, y1: 0, x2: textObj.width, y2: 0 },
          colorStops: [
            { offset: 0, color: "#ec4899" },
            { offset: 0.5, color: "#8b5cf6" },
            { offset: 1, color: "#3b82f6" },
          ],
        });
        textObj.set({
          fill: gradient,
          stroke: "",
          strokeWidth: 0,
          shadow: null,
        });
        break;

      case "outline":
        // Efek Teks Transparan dengan Outline Tebal
        textObj.set({
          fill: "transparent",
          stroke: "#0f172a",
          strokeWidth: 3,
          shadow: null,
        });
        break;

      default:
        break;
    }

    canvas.renderAll();
  });

  // 2. Custom Stroke (Garis Tepi) Teks
  textStrokeColor.addEventListener("input", (e) => {
    const textObj = getActiveTextObject();
    if (!textObj) return;

    textObj.set("stroke", e.target.value);
    canvas.renderAll();
  });

  textStrokeWidth.addEventListener("input", (e) => {
    const textObj = getActiveTextObject();
    if (!textObj) return;

    textObj.set("strokeWidth", parseInt(e.target.value, 10) || 0);
    canvas.renderAll();
  });

  // 3. Toggle Shadow Sederhana
  btnToggleShadow.addEventListener("click", () => {
    const textObj = getActiveTextObject();
    if (!textObj) return;

    if (textObj.shadow) {
      textObj.set("shadow", null);
    } else {
      textObj.set(
        "shadow",
        new fabric.Shadow({
          color: "rgba(0,0,0,0.4)",
          blur: 8,
          offsetX: 3,
          offsetY: 3,
        }),
      );
    }
    canvas.renderAll();
  });

  // 4. Sync Toolbar saat Objek Teks Dipilih
  canvas.on("selection:created", syncArtisticTextControls);
  canvas.on("selection:updated", syncArtisticTextControls);
  canvas.on("selection:cleared", () =>
    artisticTextControls.classList.add("hidden"),
  );

  function syncArtisticTextControls() {
    const textObj = getActiveTextObject();
    if (textObj) {
      artisticTextControls.classList.remove("hidden");
      textStrokeColor.value = textObj.stroke || "#000000";
      textStrokeWidth.value = textObj.strokeWidth || 0;
    } else {
      artisticTextControls.classList.add("hidden");
    }
  }
  //end artistik text
  document.getElementById("ikonBaloon1").innerHTML = stampBaloon1;
  document.getElementById("ikonBaloon2").innerHTML = stampBaloon2;
  document.getElementById("ikonTelevision1").innerHTML = stampTelevision1;
});
