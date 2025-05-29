import './style.css'

// Object Storage UI Application
class ObjectStorageUI {
  constructor() {
    this.files = [];
    this.init();
  }

  init() {
    document.querySelector('#app').innerHTML = `
      <div class="container">
        <header class="header">
          <h1>🗄️ Distributed Object Storage</h1>
          <p>Minimalistic file management interface</p>
        </header>
        
        <main class="main">
          <section class="upload-section">
            <h2>Upload File</h2>
            <div class="upload-area" id="uploadArea">
              <input type="file" id="fileInput" multiple hidden>
              <div class="upload-content">
                <div class="upload-icon">📁</div>
                <p>Click to select files or drag and drop</p>
                <button class="btn btn-primary" id="selectBtn">Select Files</button>
              </div>
            </div>
            <div class="upload-progress" id="uploadProgress" style="display: none;">
              <div class="progress-bar">
                <div class="progress-fill" id="progressFill"></div>
              </div>
              <span id="progressText">0%</span>
            </div>
          </section>

          <section class="files-section">
            <h2>Files <span class="file-count" id="fileCount">(0)</span></h2>
            <div class="files-list" id="filesList">
              <div class="empty-state">
                <div class="empty-icon">📂</div>
                <p>No files uploaded yet</p>
              </div>
            </div>
          </section>
        </main>
      </div>
    `;

    this.setupEventListeners();
  }

  setupEventListeners() {
    const fileInput = document.getElementById('fileInput');
    const selectBtn = document.getElementById('selectBtn');
    const uploadArea = document.getElementById('uploadArea');

    // File selection
    selectBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => this.handleFileSelection(e.target.files));

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      this.handleFileSelection(e.dataTransfer.files);
    });
  }

  handleFileSelection(files) {
    if (files.length === 0) return;

    Array.from(files).forEach(file => {
      this.uploadFile(file);
    });
  }

  uploadFile(file) {
    const fileId = Date.now() + Math.random();
    const fileData = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadTime: new Date(),
      status: 'uploading'
    };

    this.files.push(fileData);
    this.renderFiles();
    this.simulateUpload(fileData);
  }

  simulateUpload(fileData) {
    const progressElement = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    progressElement.style.display = 'block';
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        setTimeout(() => {
          progressElement.style.display = 'none';
          fileData.status = 'completed';
          this.renderFiles();
        }, 500);
      }

      progressFill.style.width = `${progress}%`;
      progressText.textContent = `${Math.round(progress)}%`;
    }, 200);
  }

  renderFiles() {
    const filesList = document.getElementById('filesList');
    const fileCount = document.getElementById('fileCount');

    fileCount.textContent = `(${this.files.length})`;

    if (this.files.length === 0) {
      filesList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📂</div>
          <p>No files uploaded yet</p>
        </div>
      `;
      return;
    }

    filesList.innerHTML = this.files.map(file => `
      <div class="file-item ${file.status}">
        <div class="file-icon">${this.getFileIcon(file.type)}</div>
        <div class="file-info">
          <div class="file-name">${file.name}</div>
          <div class="file-details">
            ${this.formatFileSize(file.size)} • ${file.uploadTime.toLocaleString()}
          </div>
        </div>
        <div class="file-status">
          ${file.status === 'uploading' ? '⏳' : '✅'}
        </div>
        <div class="file-actions">
          <button class="btn btn-small" onclick="app.downloadFile('${file.id}')">📥 Download</button>
          <button class="btn btn-small btn-danger" onclick="app.deleteFile('${file.id}')">🗑️ Delete</button>
        </div>
      </div>
    `).join('');
  }

  getFileIcon(type) {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎥';
    if (type.startsWith('audio/')) return '🎵';
    if (type.includes('pdf')) return '📄';
    if (type.includes('text')) return '📝';
    return '📎';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  downloadFile(fileId) {
    const file = this.files.find(f => f.id == fileId);
    if (file) {
      // Simulate download
      console.log(`Downloading: ${file.name}`);
      alert(`Download initiated for: ${file.name}`);
    }
  }

  deleteFile(fileId) {
    if (confirm('Are you sure you want to delete this file?')) {
      this.files = this.files.filter(f => f.id != fileId);
      this.renderFiles();
    }
  }
}

// Initialize the application
const app = new ObjectStorageUI();

// Make app globally available for button onclick handlers
window.app = app;
