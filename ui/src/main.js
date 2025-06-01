import './style.css'

// Object Storage UI Application
class ObjectStorageUI {
  constructor() {
    this.files = [];
    this.statuses = [];
    this.systemStatus = [];
    this.migrationLog = [];
    this.partitionServers = [];
    this.pmLeaderLog = [];
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
          <section class="partition-server-section">
            <h2>Partition Manager</h2>
            <div class="partition-server-list" id="partitionServerList"></div>
            <div class="pm-leader-log" id="pmLeaderLog"></div>
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
    await this.fetchPartitionServers();
    await this.fetchPmLeaderElectionLog();
    this.renderDiagram();
    this.setupUploadSimulation();
    this.setupGetSimulation();
    this.setupControlPanel();
    this.renderPartitionServers();
    this.renderPmLeaderElectionLog();
    const testBtn = document.createElement('button');
    testBtn.textContent = 'Test Left Arrow';
    testBtn.style.position = 'fixed';
    testBtn.style.top = '10px';
    testBtn.style.right = '10px';
    testBtn.onclick = () => {
      const arrow = document.getElementById('arrow2');
      if (arrow) {
        arrow.textContent = '←';
        console.log('Set arrow2 to ←, now textContent is:', arrow.textContent);
      } else {
        console.log('arrow2 not found');
      }
    };
    document.body.appendChild(testBtn);
  }

  async fetchSystemStatus() {
    try {
      const res = await fetch('http://localhost:8080/files/system/status');
      this.systemStatus = await res.json();
    } catch (e) {
      this.systemStatus = [];
    }
    this.renderDiagram();
    await this.fetchPartitionServers();
    await this.fetchPmLeaderElectionLog();
  }

  async fetchMigrationLog() {
    // For now, migration info is only returned on POST, so we keep a local log
    return this.migrationLog || [];
  }

  async fetchPartitionServers() {
    try {
      const res = await fetch('http://localhost:8080/files/partition-servers');
      this.partitionServers = await res.json();
    } catch (e) {
      this.partitionServers = [];
    }
    this.renderPartitionServers();
  }

  async fetchPmLeaderElectionLog() {
    try {
      const res = await fetch('http://localhost:8080/files/partition-manager/leader-election-log');
      this.pmLeaderLog = await res.json();
    } catch (e) {
      this.pmLeaderLog = [];
    }
    this.renderPmLeaderElectionLog();
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
        await this.fetchPartitionServers();
        await this.fetchPmLeaderElectionLog();
        // If Partition Manager was brought down, poll for status/log update
        if (name === 'Partition Manager' && newStatus === 'down') {
          let pollCount = 0;
          const poll = async () => {
            pollCount++;
            await this.fetchSystemStatus();
            await this.fetchPartitionServers();
            await this.fetchPmLeaderElectionLog();
            this.renderControlPanel();
            const pm = this.systemStatus.find(c => c.name === 'Partition Manager');
            const logHasComplete = (this.pmLeaderLog || []).some(l => l.includes('Leader election complete'));
            if ((pm && pm.status === 'up' && logHasComplete) || pollCount >= 6) {
              return;
            } else {
              setTimeout(poll, 200);
            }
          };
          poll();
        }
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
          <div class="file-details">
            <b>Primary:</b> <span class="extent-primary">${file.primary || '-'}</span><br>
            <b>Secondary 1:</b> <span class="extent-secondary">${file.secondary1 || '-'}</span><br>
            <b>Secondary 2:</b> <span class="extent-secondary">${file.secondary2 || '-'}</span>
          </div>
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
        // --- Custom simulation steps for FE->PM, FE<-PM, FE->PS ---
        let customPath = [];
        if (path.length >= 3) {
          // FE -> PM
          customPath.push({ from: path[0], to: path[1], dir: 'right' });
          // FE <- PM
          customPath.push({ from: path[1], to: path[0], dir: 'left' });
          // FE -> PS (X)
          customPath.push({ from: path[0], to: path[2], dir: 'right' });
          // Continue with rest of path (from PS onwards)
          for (let i = 2; i < path.length - 1; i++) {
            customPath.push({ from: path[i], to: path[i+1], dir: 'right' });
          }
        } else {
          // fallback to default path
          for (let i = 0; i < path.length - 1; i++) {
            customPath.push({ from: path[i], to: path[i+1], dir: 'right' });
          }
        }
        // Highlight FE node first
        let i = 0;
        const feBox = document.getElementById('frontend');
        if (feBox) {
          feBox.classList.add('active');
          setTimeout(() => {
            feBox.classList.remove('active');
            highlightStep();
          }, 600);
        } else {
          highlightStep();
        }
        function highlightStep() {
          // Reset all arrows to default (→) except the current one
          document.querySelectorAll('.diagram-arrow').forEach(a => {
            a.classList.remove('active-arrow', 'arrow-left', 'arrow-right');
          });
          document.querySelectorAll('.diagram-box').forEach(b => b.classList.remove('active'));
          if (i < customPath.length) {
            const fromId = getBoxIdByName(customPath[i].from);
            const toId = getBoxIdByName(customPath[i].to);
            if (toId) {
              document.querySelectorAll('.diagram-box').forEach(b => b.classList.remove('active'));
              document.getElementById(toId).classList.add('active');
            }
            // Find the arrow between from and to
            let arrowId = null;
            if (fromId && toId) {
              if (fromId === 'frontend' && toId === 'partition') arrowId = 'arrow1';
              else if (fromId === 'partition' && toId === 'frontend') arrowId = 'arrow1';
              else if (fromId === 'frontend' && toId.startsWith('partitionserver')) arrowId = 'arrow2';
              else if (fromId === 'partition' && toId.startsWith('partitionserver')) arrowId = 'arrow2';
              else if (fromId.startsWith('partitionserver') && toId === 'streammanager') arrowId = 'arrow3';
              else if (fromId === 'streammanager' && toId.startsWith('extent')) arrowId = 'arrow4';
            }
            if (arrowId) {
              const arrowEl = document.getElementById(arrowId);
              if (arrowEl) {
                arrowEl.classList.add('active-arrow', 'arrow-right');
                setArrowDirection(arrowEl, 'right');
              }
            }
            i++;
            setTimeout(highlightStep, 800);
          } else {
            // Only reverse-animate the main request path (skip handshake steps)
            let handshakeSteps = 0;
            if (customPath.length >= 3 && customPath[0].from === 'Front-End Service' && customPath[0].to === 'Partition Manager' && customPath[1].from === 'Partition Manager' && customPath[1].to === 'Front-End Service') {
              handshakeSteps = 2;
            }
            let j = customPath.length - 1;
            function highlightReturn() {
              console.log('highlightReturn called, j =', j, 'handshakeSteps =', handshakeSteps);
              document.querySelectorAll('.diagram-arrow').forEach(a => {
                a.classList.remove('active-arrow', 'arrow-left', 'arrow-right');
                setArrowDirection(a, 'right');
              });
              document.querySelectorAll('.diagram-box').forEach(b => b.classList.remove('active', 'return'));
              if (j >= handshakeSteps) {
                const fromId = getBoxIdByName(customPath[j].from);
                if (fromId) {
                  document.querySelectorAll('.diagram-box').forEach(b => b.classList.remove('return'));
                  document.getElementById(fromId).classList.add('return');
                }
                // Use the same arrow logic as above
                let arrowId = null;
                const step = customPath[j];
                console.log('Return step:', step && step.from, '->', step && step.to);
                // Swap for return path
                const returnFrom = step && step.to;
                const returnTo = step && step.from;
                if (
                  (returnFrom === 'Front-End Service' && returnTo === 'Partition Manager') ||
                  (returnFrom === 'Partition Manager' && returnTo === 'Front-End Service')
                ) arrowId = 'arrow1';
                else if (
                  (returnFrom === 'Front-End Service' && returnTo.startsWith('Partition Server')) ||
                  (returnFrom.startsWith('Partition Server') && returnTo === 'Front-End Service') ||
                  (returnFrom === 'Partition Manager' && returnTo.startsWith('Partition Server')) ||
                  (returnFrom.startsWith('Partition Server') && returnTo === 'Partition Manager')
                ) arrowId = 'arrow2';
                else if (
                  (returnFrom.startsWith('Partition Server') && returnTo === 'Stream Manager') ||
                  (returnFrom === 'Stream Manager' && returnTo.startsWith('Partition Server'))
                ) arrowId = 'arrow3';
                else if (
                  (returnFrom === 'Stream Manager' && returnTo.startsWith('Extent Node')) ||
                  (returnFrom.startsWith('Extent Node') && returnTo === 'Stream Manager')
                ) arrowId = 'arrow4';
                // After arrowId logic
                console.log('Matching:', {returnFrom, returnTo, arrowId});
                if (arrowId) {
                  const arrowEl = document.getElementById(arrowId);
                  if (arrowEl) {
                    arrowEl.classList.remove('arrow-right');
                    arrowEl.classList.add('active-arrow', 'arrow-left');
                    console.log('Setting left arrow for', arrowId, 'at j =', j);
                    setArrowDirection(arrowEl, 'left');
                  }
                }
                j--;
                setTimeout(highlightReturn, 600);
              } else {
                // Reset all after response
                document.querySelectorAll('.diagram-box').forEach(b => b.classList.remove('active', 'return'));
                document.querySelectorAll('.diagram-arrow').forEach(a => {
                  a.classList.remove('active-arrow', 'arrow-left', 'arrow-right');
                });
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
                }, 400);
              }
            }
            setTimeout(highlightReturn, 700);
          }
        }
        function getBoxIdByName(name) {
          if (name === 'Front-End Service') return 'frontend';
          if (name === 'Partition Manager') return 'partition';
          if (name === 'Stream Manager') return 'streammanager';
          if (name.startsWith('Partition Server')) return 'partitionserver' + name.split(' ')[2];
          if (name.startsWith('Extent Node')) return 'extent' + name.split(' ')[2];
          return null;
        }
        data.components.forEach((comp, idx) => {
          const boxId = getBoxIdByName(comp.name);
          if (boxId && comp.status === 'down') {
            document.getElementById(boxId).classList.add('down');
          }
        });
        document.querySelectorAll('.diagram-arrow').forEach(a => setArrowDirection(a, 'right'));
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
      { name: 'Partition Server 1', status: 'up' },
      { name: 'Partition Server 2', status: 'up' },
      { name: 'Partition Server 3', status: 'up' },
      { name: 'Stream Manager', status: 'up' },
      { name: 'Extent Node 1', status: 'up' },
      { name: 'Extent Node 2', status: 'up' },
      { name: 'Extent Node 3', status: 'up' },
      { name: 'Extent Node 4', status: 'up' },
      { name: 'Extent Node 5', status: 'up' },
    ];
    // Find each group
    const frontend = comps.find(c => c.name === 'Front-End Service');
    const partition = comps.find(c => c.name === 'Partition Manager');
    const partitionServers = comps.filter(c => c.name.startsWith('Partition Server'));
    const streamManager = comps.find(c => c.name === 'Stream Manager');
    const extents = comps.filter(c => c.name.startsWith('Extent Node'));
    // Diagram layout: horizontal row, with vertical stacks for partition servers and extent nodes
    let html = `<div class="get-diagram diagram-row-aligned">
      <div class="diagram-col">
        <div class="diagram-box" id="frontend">Front-End<br>Service</div>
      </div>
      <div class="multi-arrow diagram-arrow" id="arrow1"><span class="arrow-right-el">→</span><span class="arrow-left-el" style="display:none;">←</span></div>
      <div class="diagram-col">
        <div class="diagram-box" id="partition">Partition<br>Manager</div>
      </div>
      <div class="multi-arrow diagram-arrow" id="arrow2"><span class="arrow-right-el">→</span><span class="arrow-left-el" style="display:none;">←</span></div>
      <div class="diagram-col diagram-col-center">
        <div class="diagram-group-label">Partition Servers</div>
        <div class="partition-stack-vertical">`;
    partitionServers.forEach((ps, i) => {
      html += `<div class="diagram-box partition-server-box small-box" id="partitionserver${i+1}">${ps.name}</div>`;
    });
    html += `</div></div>
      <div class="multi-arrow diagram-arrow" id="arrow3"><span class="arrow-right-el">→</span><span class="arrow-left-el" style="display:none;">←</span></div>
      <div class="diagram-col">
        <div class="diagram-box" id="streammanager">Stream<br>Manager</div>
      </div>
      <div class="multi-arrow diagram-arrow" id="arrow4"><span class="arrow-right-el">→</span><span class="arrow-left-el" style="display:none;">←</span></div>
      <div class="diagram-col diagram-col-extents">
        <div class="extent-heading-stack">
          <div class="extent-heading-center"><span class="diagram-group-label">Extent Nodes</span></div>
          <div class="extent-stack-vertical">`;
    extents.forEach((e, i) => {
      html += `<div class="diagram-box extent-node-box small-box" id="extent${i+1}">${e.name}</div>`;
    });
    html += `</div></div></div>`;
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
    if (name === 'Stream Manager') return 'streammanager';
    if (name.startsWith('Partition Server')) return 'partitionserver' + name.split(' ')[2];
    if (name.startsWith('Extent Node')) return 'extent' + name.split(' ')[2];
    return null;
  }

  renderPartitionServers() {
    const psList = document.getElementById('partitionServerList');
    if (!psList) return;
    if (!this.partitionServers || this.partitionServers.length === 0) {
      psList.innerHTML = `<div class="empty-state"><div class="empty-icon">🗄️</div><p>No partition servers available</p></div>`;
      return;
    }
    psList.innerHTML = this.partitionServers.map(ps => `
      <div class="partition-server-item${ps.status === 'down' ? ' down' : ''}">
        <span class="status-light ${ps.status}"></span>
        <span class="ps-name">${ps.name}</span>
        <span class="ps-status">(${ps.status})</span>
        <div class="ps-files">
          <span class="ps-files-label">Files:</span>
          <span class="ps-files-list">${ps.files.length > 0 ? ps.files.map(f => `<span class="ps-file">${f}</span>`).join(', ') : '<i>None</i>'}</span>
        </div>
      </div>
    `).join('');
  }

  renderPmLeaderElectionLog() {
    const logDiv = document.getElementById('pmLeaderLog');
    if (!logDiv) return;
    if (!this.pmLeaderLog || this.pmLeaderLog.length === 0) {
      logDiv.innerHTML = '';
      return;
    }
    logDiv.innerHTML = `<div class="pm-leader-log-title">Partition Manager Leader Election Log:</div>` +
      this.pmLeaderLog.map(entry => `<div class="pm-leader-log-entry">${entry}</div>`).join('');
  }
}

// Initialize the application
const app = new ObjectStorageUI();
window.app = app;

function setArrowDirection(arrowEl, dir) {
  const right = arrowEl.querySelector('.arrow-right-el');
  const left = arrowEl.querySelector('.arrow-left-el');
  if (!right || !left) return;
  if (dir === 'right') {
    right.style.display = '';
    left.style.display = 'none';
  } else {
    right.style.display = 'none';
    left.style.display = '';
  }
  console.log('setArrowDirection:', arrowEl.id, dir);
}
