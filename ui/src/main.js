import './style.css'

// Object Storage UI Application
class ObjectStorageUI {
  constructor() {
    this.files = [];
    this.statuses = [];
    this.systemStatus = [];
    this.migrationLog = [];
    this.init();
  }

  async init() {
    document.querySelector('#app').innerHTML = `
      <header class="main-header">
        <h1 class="project-title">Distributed Storage System Simulator</h1>
      </header>
      <section class="diagram-section">
        <div class="diagram-controls">
          <h2>Simulate GET Operation</h2>
          <div class="scenario-select-row">
            <label for="scenarioSelect">Scenario:</label>
            <select id="scenarioSelect">
              <option value="all_healthy">All Healthy</option>
              <option value="extent_down">Any Extent Node Down</option>
              <option value="partition_down">Partition Manager Down</option>
              <option value="frontend_down">Front-End Service Down</option>
              <option value="file_not_found">File Not Found</option>
            </select>
          </div>
          <form id="getForm">
            <input type="text" id="getFileName" placeholder="Enter file name (e.g. report.pdf)" required />
            <button class="btn btn-primary" type="submit">Simulate GET</button>
          </form>
        </div>
        <div id="getSimulation"></div>
      </section>
      <div class="container">
        <main class="main">
          <section class="control-panel-section">
            <h2>Component Control Panel</h2>
            <div id="controlPanel"></div>
            <div id="migrationLog"></div>
          </section>
          <section class="files-section">
            <h2>Files <span class="file-count" id="fileCount">(0)</span></h2>
            <div class="files-list" id="filesList">
              <div class="empty-state">
                <div class="empty-icon">📂</div>
                <p>No files available yet</p>
              </div>
            </div>
          </section>
        </main>
      </div>
    `;
    await this.fetchSystemStatus();
    await this.fetchFiles();
    this.renderDiagram();
    this.setupUploadSimulation();
    this.setupGetSimulation();
    this.setupControlPanel();
  }

  async fetchSystemStatus() {
    try {
      const res = await fetch('http://localhost:8080/files/system/status');
      this.systemStatus = await res.json();
    } catch (e) {
      this.systemStatus = [];
    }
    this.renderDiagram();
  }

  async fetchMigrationLog() {
    // For now, migration info is only returned on POST, so we keep a local log
    return this.migrationLog || [];
  }

  async setupControlPanel() {
    await this.fetchSystemStatus();
    this.renderControlPanel();
  }

  renderControlPanel() {
    const controlPanel = document.getElementById('controlPanel');
    if (!this.systemStatus) return;
    controlPanel.innerHTML = this.systemStatus.map(comp => `
      <div class="comp-group">
        <span class="status-light ${comp.status}"></span>
        <span class="comp-name">${comp.name}</span>
        <button class="btn-toggle" data-name="${comp.name}" data-status="${comp.status}">
          ${comp.status === 'up' ? 'Bring Down' : 'Bring Up'}
        </button>
      </div>
    `).join('');
    controlPanel.querySelectorAll('.btn-toggle').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const name = btn.getAttribute('data-name');
        const currentStatus = btn.getAttribute('data-status');
        const newStatus = currentStatus === 'up' ? 'down' : 'up';
        const res = await fetch('http://localhost:8080/files/system/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, status: newStatus })
        });
        const data = await res.json();
        this.migrationLog = data.migrations || [];
        this.showMigrationLog();
        await this.fetchSystemStatus();
        await this.fetchFiles();
        this.renderControlPanel();
        this.renderFiles();
        this.renderDiagram();
      });
    });
    this.showMigrationLog();
  }

  showMigrationLog() {
    const migrationLogDiv = document.getElementById('migrationLog');
    if (this.migrationLog && this.migrationLog.length > 0) {
      migrationLogDiv.innerHTML = `<div class="migration-title">Background Process: File Replication</div>` +
        this.migrationLog.map(m => `
          <div class="migration-item">
            <span>File <b>${m.file}</b> migrated from <b>${m.from}</b> to <b>${m.to}</b></span>
          </div>
        `).join('');
    } else {
      migrationLogDiv.innerHTML = '';
    }
  }

  setupUploadSimulation() {
    const uploadArea = document.getElementById('uploadArea');
    if (!uploadArea) return;
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    let selectedFiles = [];

    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      selectedFiles = Array.from(e.dataTransfer.files);
      uploadBtn.disabled = selectedFiles.length === 0;
    });
    fileInput.addEventListener('change', (e) => {
      selectedFiles = Array.from(e.target.files);
      uploadBtn.disabled = selectedFiles.length === 0;
    });
    uploadBtn.addEventListener('click', () => {
      if (selectedFiles.length === 0) return;
      this.simulateUpload(selectedFiles);
      selectedFiles = [];
      fileInput.value = '';
      uploadBtn.disabled = true;
    });
  }

  simulateUpload(files) {
    const statusSection = document.getElementById('statusSection');
    files.forEach(file => {
      const statusId = Math.random().toString(36).substr(2, 9);
      this.statuses.push({ id: statusId, name: file.name, status: 'processing' });
      this.renderStatuses();
      setTimeout(() => {
        // Simulate upload success and add to files list (mock only)
        this.statuses = this.statuses.map(s => s.id === statusId ? { ...s, status: 'success' } : s);
        if (!this.files.some(f => f.name === file.name)) {
          this.files.push({ name: file.name, location: 'Simulated Node' });
        }
        this.renderFiles();
        this.renderStatuses();
      }, 1200 + Math.random() * 1000);
    });
  }

  renderStatuses() {
    const statusSection = document.getElementById('statusSection');
    if (!this.statuses.length) {
      statusSection.innerHTML = '';
      return;
    }
    statusSection.innerHTML = this.statuses.map(s => `
      <div class="status-item status-${s.status}">
        <span>${s.name}</span>
        <span>${s.status === 'processing' ? 'Uploading...' : (s.status === 'success' ? 'Uploaded' : 'Error')}</span>
      </div>
    `).join('');
  }

  async fetchFiles() {
    try {
      const res = await fetch('http://localhost:8080/files');
      if (!res.ok) throw new Error('Failed to fetch files');
      this.files = await res.json();
      this.renderFiles();
    } catch (e) {
      this.files = [];
      this.renderFiles();
      document.getElementById('filesList').innerHTML = `<div class="error">Failed to fetch files from backend.</div>`;
    }
  }

  renderFiles() {
    const filesList = document.getElementById('filesList');
    const fileCount = document.getElementById('fileCount');
    fileCount.textContent = `(${this.files.length})`;
    if (this.files.length === 0) {
      filesList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📂</div>
          <p>No files available yet</p>
        </div>
      `;
      return;
    }
    filesList.innerHTML = this.files.map(file => `
      <div class="file-item completed">
        <div class="file-icon">${this.getFileIcon(file.name)}</div>
        <div class="file-info">
          <div class="file-name">${file.name}</div>
          <div class="file-details">Stored at: <b>${file.location}</b></div>
        </div>
      </div>
    `).join('');
  }

  getFileIcon(name) {
    if (name.endsWith('.pdf')) return '📄';
    if (name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png')) return '🖼️';
    if (name.endsWith('.txt')) return '📝';
    return '📎';
  }

  setupGetSimulation() {
    const getForm = document.getElementById('getForm');
    const getFileName = document.getElementById('getFileName');
    const getSimulation = document.getElementById('getSimulation');
    const scenarioSelect = document.getElementById('scenarioSelect');
    getForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const filename = getFileName.value.trim();
      const scenario = scenarioSelect.value;
      if (!filename) return;
      getSimulation.innerHTML = '<div>Simulating...</div>';
      // Scenario logic: if scenario is not all_healthy, first bring down a component
      if (scenario !== 'all_healthy' && scenario !== 'file_not_found') {
        let compName = '';
        if (scenario === 'extent_down') {
          // Bring down a random up extent node
          const upNodes = this.systemStatus.filter(c => c.name.startsWith('Extent Node') && c.status === 'up');
          if (upNodes.length > 0) compName = upNodes[0].name;
        } else if (scenario === 'partition_down') {
          compName = 'Partition Manager';
        } else if (scenario === 'frontend_down') {
          compName = 'Front-End Service';
        }
        if (compName) {
          await fetch('http://localhost:8080/files/system/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: compName, status: 'down' })
          });
          await this.fetchSystemStatus();
          await this.fetchFiles();
          this.renderControlPanel();
          this.renderFiles();
          this.renderDiagram();
        }
      }
      // Now simulate GET
      try {
        const res = await fetch('http://localhost:8080/files/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename })
        });
        const data = await res.json();
        getSimulation.innerHTML = this.getDiagramHtml(data.components);
        const path = data.path;
        let i = 0;
        function highlightStep() {
          document.querySelectorAll('.diagram-arrow').forEach(a => a.classList.remove('active-arrow', 'arrow-left', 'arrow-right'));
          document.querySelectorAll('.diagram-box').forEach(b => b.classList.remove('active'));
          if (i < path.length) {
            const boxId = getBoxIdByName(path[i]);
            if (boxId) {
              document.querySelectorAll('.diagram-box').forEach(b => b.classList.remove('active'));
              document.getElementById(boxId).classList.add('active');
            }
            if (i > 0) {
              const arrowId = `arrow${i}`;
              const arrowEl = document.getElementById(arrowId);
              if (arrowEl) {
                arrowEl.classList.add('active-arrow', 'arrow-right');
                arrowEl.textContent = '→';
              }
            }
            i++;
            setTimeout(highlightStep, 800);
          } else {
            let j = path.length - 1;
            function highlightReturn() {
              document.querySelectorAll('.diagram-arrow').forEach(a => a.classList.remove('active-arrow', 'arrow-left', 'arrow-right'));
              document.querySelectorAll('.diagram-box').forEach(b => b.classList.remove('active', 'return'));
              if (j > 0) {
                const boxId = getBoxIdByName(path[j-1]);
                if (boxId) {
                  document.querySelectorAll('.diagram-box').forEach(b => b.classList.remove('return'));
                  document.getElementById(boxId).classList.add('return');
                }
                const arrowId = `arrow${j}`;
                const arrowEl = document.getElementById(arrowId);
                if (arrowEl) {
                  arrowEl.classList.add('active-arrow', 'arrow-left');
                  arrowEl.textContent = '←';
                }
                j--;
                setTimeout(highlightReturn, 600);
              } else {
                const resultDiv = document.createElement('div');
                if (data.result === 'success') {
                  resultDiv.className = 'success get-result';
                  resultDiv.innerHTML = data.message;
                } else {
                  resultDiv.className = 'error get-result';
                  resultDiv.innerHTML = data.message;
                }
                resultDiv.style.opacity = 0;
                getSimulation.appendChild(resultDiv);
                setTimeout(() => {
                  resultDiv.style.transition = 'opacity 0.7s, box-shadow 0.7s';
                  resultDiv.style.opacity = 1;
                  resultDiv.style.boxShadow = '0 0 16px 2px #764ba2';
                  setTimeout(() => {
                    document.querySelectorAll('.diagram-box').forEach(b => b.classList.remove('active', 'return'));
                    document.querySelectorAll('.diagram-arrow').forEach(a => {
                      a.classList.remove('active-arrow', 'arrow-left', 'arrow-right');
                      a.textContent = '→';
                    });
                  }, 1200);
                }, 400);
              }
            }
            setTimeout(highlightReturn, 700);
          }
        }
        function getBoxIdByName(name) {
          if (name === 'Front-End Service') return 'frontend';
          if (name === 'Partition Manager') return 'partition';
          if (name === 'Extent Node 1') return 'extent1';
          if (name === 'Extent Node 2') return 'extent2';
          if (name === 'Extent Node 3') return 'extent3';
          return null;
        }
        data.components.forEach((comp, idx) => {
          const boxId = getBoxIdByName(comp.name);
          if (boxId && comp.status === 'down') {
            document.getElementById(boxId).classList.add('down');
          }
        });
        highlightStep();
      } catch (err) {
        getSimulation.innerHTML = '<div class="error">Error simulating GET request.</div>';
      }
    });
  }

  getDiagramHtml(components) {
    // If no components, fallback to default
    const comps = components || [
      { name: 'Front-End Service', status: 'up' },
      { name: 'Partition Manager', status: 'up' },
      { name: 'Extent Node 1', status: 'up' },
      { name: 'Extent Node 2', status: 'up' },
      { name: 'Extent Node 3', status: 'up' },
    ];
    // Find each
    const frontend = comps.find(c => c.name === 'Front-End Service');
    const partition = comps.find(c => c.name === 'Partition Manager');
    const extents = comps.filter(c => c.name.startsWith('Extent Node'));
    // Add arrow IDs for animation
    let html = `<div class="get-diagram diagram-row-grouped">
      <div class="diagram-box" id="frontend">Front-End Service</div>
      <div class="diagram-arrow" id="arrow1">→</div>
      <div class="diagram-box" id="partition">Partition Manager</div>
      <div class="diagram-arrow" id="arrow2">→</div>
      <div class="extent-group-box">`;
    extents.forEach((e, i) => {
      html += `<div class=\"diagram-box extent-node-box\" id=\"extent${i+1}\">${e.name}</div>`;
      if (i < extents.length - 1) {
        html += `<div class=\"diagram-arrow\" id=\"arrow${3 + i}\">→</div>`;
      }
    });
    html += `</div></div>`;
    return html;
  }

  renderDiagram(components) {
    // If no components provided, use current systemStatus
    const comps = components || this.systemStatus || [];
    document.getElementById('getSimulation').innerHTML = this.getDiagramHtml(comps);
    // Mark down components visually
    comps.forEach((comp, idx) => {
      const boxId = this.getBoxIdByName(comp.name);
      if (boxId && comp.status === 'down') {
        const el = document.getElementById(boxId);
        if (el) el.classList.add('down');
      }
    });
  }

  getBoxIdByName(name) {
    if (name === 'Front-End Service') return 'frontend';
    if (name === 'Partition Manager') return 'partition';
    if (name === 'Extent Node 1') return 'extent1';
    if (name === 'Extent Node 2') return 'extent2';
    if (name === 'Extent Node 3') return 'extent3';
    return null;
  }
}

// Initialize the application
const app = new ObjectStorageUI();
window.app = app;
