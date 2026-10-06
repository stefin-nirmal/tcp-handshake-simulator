/**
 * ============================================================================
 * Live TCP Three-Way Handshake & Network Analysis System
 * Computer Networks Lab Mini Project
 * Frontend Controller: Live OS Sockets + MySQL Database Integration
 * ============================================================================
 */

(function () {
    'use strict';

    // -------------------------------------------------------------------------
    // DOM Element References
    // -------------------------------------------------------------------------
    // Action Buttons
    const btnStart = document.getElementById('btn-start');
    const btnStep = document.getElementById('btn-step');
    const btnStepText = document.getElementById('btn-step-text');
    const btnReset = document.getElementById('btn-reset');
    const btnReplay = document.getElementById('btn-replay');
    const btnFail = document.getElementById('btn-fail');
    const btnRetryFail = document.getElementById('btn-retry-fail');
    const btnRefreshDb = document.getElementById('btn-refresh-db');
    const btnClearDb = document.getElementById('btn-clear-db');

    // Status & Stage
    const globalStatusDot = document.getElementById('global-status-dot');
    const globalStatusText = document.getElementById('global-status-text');
    const stageHint = document.getElementById('stage-hint');

    // Host Nodes & Metadata
    const clientNode = document.getElementById('client-node');
    const serverNode = document.getElementById('server-node');
    const clientState = document.getElementById('client-state');
    const serverState = document.getElementById('server-state');
    const clientIpVal = document.getElementById('client-ip-val');
    const clientPortVal = document.getElementById('client-port-val');
    const clientIsnVal = document.getElementById('client-isn-val');
    const serverIpVal = document.getElementById('server-ip-val');
    const serverPortVal = document.getElementById('server-port-val');
    const serverIsnVal = document.getElementById('server-isn-val');

    // Network Wire & Flying Packet
    const networkTrack = document.getElementById('network-track');
    const flyingPacket = document.getElementById('flying-packet');
    const packetTag = document.getElementById('packet-tag');
    const packetMiniSeq = document.getElementById('packet-mini-seq');
    const packetArrow = document.getElementById('packet-arrow');
    const packetDropBox = document.getElementById('packet-drop-box');
    const packetDropText = document.getElementById('packet-drop-text');

    // Banners
    const bannerEstablished = document.getElementById('banner-established');
    const bannerFailed = document.getElementById('banner-failed');
    const bannerRttVal = document.getElementById('banner-rtt-val');
    const bannerRecordIdVal = document.getElementById('banner-record-id-val');
    const bannerCIsn = document.getElementById('banner-c-isn');
    const bannerSIsn = document.getElementById('banner-s-isn');
    const bannerSAck = document.getElementById('banner-s-ack');
    const bannerCAckSeq = document.getElementById('banner-c-ack-seq');
    const bannerCAckVal = document.getElementById('banner-c-ack-val');
    const bannerFailedDesc = document.getElementById('banner-failed-desc');

    // Stepper
    const stepItems = [
        document.getElementById('stepper-1'),
        document.getElementById('stepper-2'),
        document.getElementById('stepper-3'),
        document.getElementById('stepper-4')
    ];
    const stepConnectors = [
        document.getElementById('conn-1'),
        document.getElementById('conn-2'),
        document.getElementById('conn-3')
    ];

    // Packet Details Card
    const packetWaiting = document.getElementById('packet-waiting');
    const packetContent = document.getElementById('packet-content');
    const packetTagHeader = document.getElementById('packet-tag-header');
    const pdType = document.getElementById('pd-type');
    const pdDirection = document.getElementById('pd-direction');
    const pdSeq = document.getElementById('pd-seq');
    const pdAck = document.getElementById('pd-ack');
    const pdFlags = document.getElementById('pd-flags');
    const pdPurpose = document.getElementById('pd-purpose');
    const pdExplanation = document.getElementById('pd-explanation');

    // State Flow Card
    const fstateClosed = document.getElementById('fstate-closed');
    const fstateSynSent = document.getElementById('fstate-syn-sent');
    const fstateSynRcvd = document.getElementById('fstate-syn-rcvd');
    const fstateEst = document.getElementById('fstate-est');

    // Statistics Card
    const statSent = document.getElementById('stat-sent');
    const statRcvd = document.getElementById('stat-rcvd');
    const statRtt = document.getElementById('stat-rtt');
    const statRecId = document.getElementById('stat-rec-id');
    const statEngineTag = document.getElementById('stat-engine-tag');

    // Ladder Diagram Elements
    const ladderCEndpoint = document.getElementById('ladder-c-endpoint');
    const ladderSEndpoint = document.getElementById('ladder-s-endpoint');
    const flowSyn = document.getElementById('flow-syn');
    const flowSynSeq = document.getElementById('flow-syn-seq');
    const flowSynAck = document.getElementById('flow-synack');
    const flowSynackSeq = document.getElementById('flow-synack-seq');
    const flowSynackAck = document.getElementById('flow-synack-ack');
    const flowAck = document.getElementById('flow-ack');
    const flowAckSeq = document.getElementById('flow-ack-seq');
    const flowAckAck = document.getElementById('flow-ack-ack');
    const flowEstBox = document.getElementById('flow-est-box');

    // Arithmetic Section Elements
    const mathClientIsn = document.getElementById('math-client-isn');
    const mathServerIsn = document.getElementById('math-server-isn');
    const tableSynSeq = document.getElementById('table-syn-seq');
    const tableSynackSeq = document.getElementById('table-synack-seq');
    const tableSynackAck = document.getElementById('table-synack-ack');
    const tableAckSeq = document.getElementById('table-ack-seq');
    const tableAckAck = document.getElementById('table-ack-ack');
    const rowSyn = document.getElementById('row-syn');
    const rowSynAck = document.getElementById('row-synack');
    const rowAck = document.getElementById('row-ack');

    // Timeline Log & MySQL Table
    const timelineList = document.getElementById('timeline-list');
    const dbRecordsTbody = document.getElementById('db-records-tbody');
    const dbEngineBadge = document.getElementById('db-engine-badge');

    // -------------------------------------------------------------------------
    // Application State Model
    // -------------------------------------------------------------------------
    const state = {
        currentStep: 0,         // 0: Initial, 1: SYN, 2: SYN-ACK, 3: ACK, 4: ESTABLISHED
        isAnimating: false,     // True during an in-flight packet
        isAutoPlaying: false,   // True when full auto handshake is running
        packetsSent: 0,
        packetsReceived: 0,
        timerIds: [],
        liveData: null          // Stores the real OS socket data from /api/live_handshake
    };

    // -------------------------------------------------------------------------
    // Animation Speed Helper
    // -------------------------------------------------------------------------
    function getSelectedSpeed() {
        const checkedRadio = document.querySelector('input[name="speed"]:checked');
        return checkedRadio ? parseInt(checkedRadio.value, 10) : 1500;
    }

    // -------------------------------------------------------------------------
    // High-Resolution Timestamp Helper
    // -------------------------------------------------------------------------
    function getElapsedStamp(offsetMs = 0) {
        const now = new Date();
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        const ms = String(now.getMilliseconds()).padStart(3, '0');
        return `${m}:${s}.${ms}`;
    }

    // -------------------------------------------------------------------------
    // Timeline Logger
    // -------------------------------------------------------------------------
    function addTimelineEntry(type, message, customTime = null) {
        if (!timelineList) return;
        const emptyMsg = timelineList.querySelector('.timeline-empty');
        if (emptyMsg) {
            emptyMsg.remove();
        }

        const entry = document.createElement('div');
        const cleanType = type.toLowerCase().replace(/[^a-z0-9]/g, '');
        entry.className = `timeline-entry log-${cleanType}`;

        let badgeClass = 'tl-badge-syn';
        if (type === 'SYN') badgeClass = 'tl-badge-syn';
        else if (type === 'SYN-ACK') badgeClass = 'tl-badge-synack';
        else if (type === 'ACK') badgeClass = 'tl-badge-ack';
        else if (type === 'ESTABLISHED') badgeClass = 'tl-badge-ack';
        else if (type === 'MYSQL') badgeClass = 'tl-badge-syn';
        else if (type === 'ERROR' || type === 'TIMEOUT') badgeClass = 'tl-badge-error';

        const timeStr = customTime || getElapsedStamp();

        entry.innerHTML = `
            <span class="tl-time">${timeStr}</span>
            <span class="tl-badge ${badgeClass}">${type}</span>
            <span class="tl-msg">${message}</span>
        `;

        timelineList.appendChild(entry);
        timelineList.scrollTop = timelineList.scrollHeight;
    }

    // -------------------------------------------------------------------------
    // Safe Timeout Management
    // -------------------------------------------------------------------------
    function safeTimeout(callback, delay) {
        const id = setTimeout(callback, delay);
        state.timerIds.push(id);
        return id;
    }

    function clearAllTimers() {
        state.timerIds.forEach(id => clearTimeout(id));
        state.timerIds = [];
    }

    // -------------------------------------------------------------------------
    // Packet Flight Animation Engine
    // -------------------------------------------------------------------------
    function animatePacket(direction, label, miniSeq, durationMs, onArrival) {
        const isVertical = window.innerWidth <= 768;
        flyingPacket.classList.add('active-packet');
        packetTag.textContent = label;
        packetMiniSeq.textContent = miniSeq;

        // Visual theme by packet type
        if (label === 'SYN') {
            flyingPacket.style.borderColor = 'var(--accent-cyan)';
            packetTag.style.color = 'var(--accent-cyan)';
            packetArrow.style.color = 'var(--accent-cyan)';
        } else if (label === 'SYN-ACK') {
            flyingPacket.style.borderColor = 'var(--accent-purple)';
            packetTag.style.color = 'var(--accent-purple)';
            packetArrow.style.color = 'var(--accent-purple)';
        } else if (label === 'ACK') {
            flyingPacket.style.borderColor = 'var(--accent-green)';
            packetTag.style.color = 'var(--accent-green)';
            packetArrow.style.color = 'var(--accent-green)';
        }

        flyingPacket.style.transition = 'none';

        if (!isVertical) {
            const maxTravelX = networkTrack.clientWidth - flyingPacket.offsetWidth;
            const startX = direction === 'C2S' ? 0 : maxTravelX;
            const targetX = direction === 'C2S' ? maxTravelX : 0;

            packetArrow.innerHTML = direction === 'C2S' ? '&rarr;' : '&larr;';
            flyingPacket.style.top = '50%';
            flyingPacket.style.transform = 'translateY(-50%)';
            flyingPacket.style.left = `${startX}px`;

            void flyingPacket.offsetWidth; // Force CSS repaint

            flyingPacket.style.transition = `left ${durationMs}ms cubic-bezier(0.4, 0, 0.2, 1)`;
            flyingPacket.style.left = `${targetX}px`;
        } else {
            const maxTravelY = networkTrack.clientHeight - flyingPacket.offsetHeight;
            const startY = direction === 'C2S' ? 0 : maxTravelY;
            const targetY = direction === 'C2S' ? maxTravelY : 0;

            packetArrow.innerHTML = direction === 'C2S' ? '&darr;' : '&uarr;';
            flyingPacket.style.left = '50%';
            flyingPacket.style.transform = 'translateX(-50%)';
            flyingPacket.style.top = `${startY}px`;

            void flyingPacket.offsetHeight;

            flyingPacket.style.transition = `top ${durationMs}ms cubic-bezier(0.4, 0, 0.2, 1)`;
            flyingPacket.style.top = `${targetY}px`;
        }

        safeTimeout(() => {
            if (typeof onArrival === 'function') {
                onArrival();
            }
        }, durationMs);
    }

    // -------------------------------------------------------------------------
    // Packet Inspector Details Panel
    // -------------------------------------------------------------------------
    function updatePacketPanel(stepNumber, data) {
        if (!packetWaiting || !packetContent) return;
        packetWaiting.style.display = 'none';
        packetContent.style.display = 'flex';

        const clientIsn = data ? data.client_isn : 1000;
        const serverIsn = data ? data.server_isn : 5000;
        const synAckVal = data ? data.syn_ack_num : (clientIsn + 1);
        const finalAckVal = data ? data.final_ack_num : (serverIsn + 1);

        if (stepNumber === 1) {
            packetTagHeader.textContent = 'SYN';
            pdType.textContent = 'SYN (Synchronize)';
            pdType.style.color = 'var(--accent-cyan)';
            pdDirection.textContent = `Client (${data ? data.client_port : 5000}) → Server (${data ? data.server_port : 8080})`;
            pdSeq.textContent = clientIsn;
            pdAck.textContent = '-';
            pdFlags.innerHTML = `
                <span class="flag-pill active">SYN = 1</span>
                <span class="flag-pill">ACK = 0</span>
                <span class="flag-pill">FIN = 0</span>
            `;
            pdPurpose.textContent = 'Initiate live TCP socket & propose client starting sequence number (ISN)';
            pdExplanation.textContent = `Client generated a 32-bit Initial Sequence Number (ISN = ${clientIsn}) via kernel PRNG. No application data payload is transferred yet.`;
        } else if (stepNumber === 2) {
            packetTagHeader.textContent = 'SYN-ACK';
            pdType.textContent = 'SYN-ACK';
            pdType.style.color = 'var(--accent-purple)';
            pdDirection.textContent = `Server (${data ? data.server_port : 8080}) → Client (${data ? data.client_port : 5000})`;
            pdSeq.textContent = serverIsn;
            pdAck.textContent = `${synAckVal} (${clientIsn} + 1)`;
            pdFlags.innerHTML = `
                <span class="flag-pill active">SYN = 1</span>
                <span class="flag-pill active">ACK = 1</span>
                <span class="flag-pill">FIN = 0</span>
            `;
            pdPurpose.textContent = 'Acknowledge client SYN & propose independent server starting sequence number';
            pdExplanation.textContent = `Server acknowledged client ISN with Ack=${synAckVal} and generated its own return channel sequence number (Seq=${serverIsn}).`;
        } else if (stepNumber === 3) {
            packetTagHeader.textContent = 'ACK';
            pdType.textContent = 'ACK (Acknowledge)';
            pdType.style.color = 'var(--accent-green)';
            pdDirection.textContent = `Client (${data ? data.client_port : 5000}) → Server (${data ? data.server_port : 8080})`;
            pdSeq.textContent = synAckVal;
            pdAck.textContent = `${finalAckVal} (${serverIsn} + 1)`;
            pdFlags.innerHTML = `
                <span class="flag-pill">SYN = 0</span>
                <span class="flag-pill active">ACK = 1</span>
                <span class="flag-pill">FIN = 0</span>
            `;
            pdPurpose.textContent = 'Confirm server sequence number; bidirectional byte stream channel established';
            pdExplanation.textContent = `Client acknowledged server Seq with Ack=${finalAckVal}. Both ends are synchronized. Socket descriptor is ready for read/write calls.`;
        }
    }

    // -------------------------------------------------------------------------
    // Synchronize UI Metadata with Real OS Socket Values
    // -------------------------------------------------------------------------
    function applyLiveSocketMetadata(data) {
        state.liveData = data;

        // Client and Server Nodes
        if (clientIpVal) clientIpVal.textContent = data.client_ip;
        if (clientPortVal) clientPortVal.textContent = data.client_port;
        if (clientIsnVal) clientIsnVal.textContent = data.client_isn;

        if (serverIpVal) serverIpVal.textContent = data.server_ip;
        if (serverPortVal) serverPortVal.textContent = data.server_port;
        if (serverIsnVal) serverIsnVal.textContent = data.server_isn;

        // Network Statistics
        if (statRtt) statRtt.textContent = `${data.rtt_ms} ms`;
        if (statRecId) statRecId.textContent = `#${data.record_id || '--'}`;

        // Ladder Diagram Endpoints & Labels
        if (ladderCEndpoint) ladderCEndpoint.textContent = `${data.client_ip}:${data.client_port}`;
        if (ladderSEndpoint) ladderSEndpoint.textContent = `${data.server_ip}:${data.server_port}`;

        if (flowSynSeq) flowSynSeq.textContent = data.client_isn;
        if (flowSynackSeq) flowSynackSeq.textContent = data.server_isn;
        if (flowSynackAck) flowSynackAck.textContent = data.syn_ack_num;
        if (flowAckSeq) flowAckSeq.textContent = data.syn_ack_num;
        if (flowAckAck) flowAckAck.textContent = data.final_ack_num;

        // Arithmetic Math Section
        if (mathClientIsn) mathClientIsn.textContent = `Seq = ${data.client_isn}`;
        if (mathServerIsn) mathServerIsn.textContent = `Seq = ${data.server_isn}`;

        if (tableSynSeq) tableSynSeq.textContent = data.client_isn;
        if (tableSynackSeq) tableSynackSeq.textContent = data.server_isn;
        if (tableSynackAck) tableSynackAck.textContent = data.syn_ack_num;
        if (tableAckSeq) tableAckSeq.textContent = data.syn_ack_num;
        if (tableAckAck) tableAckAck.textContent = data.final_ack_num;

        // Established Banner Details
        if (bannerRttVal) bannerRttVal.textContent = `${data.rtt_ms} ms`;
        if (bannerRecordIdVal) bannerRecordIdVal.textContent = `#${data.record_id || '--'}`;
        if (bannerCIsn) bannerCIsn.textContent = data.client_isn;
        if (bannerSIsn) bannerSIsn.textContent = data.server_isn;
        if (bannerSAck) bannerSAck.textContent = data.syn_ack_num;
        if (bannerCAckSeq) bannerCAckSeq.textContent = data.syn_ack_num;
        if (bannerCAckVal) bannerCAckVal.textContent = data.final_ack_num;
    }

    // -------------------------------------------------------------------------
    // Handshake Step 1: Client -> Server (SYN)
    // -------------------------------------------------------------------------
    function executeStep1(data, callback) {
        state.isAnimating = true;
        updateButtonsForRunning();
        const duration = getSelectedSpeed();

        stageHint.textContent = `Step 1/3: Client transmitting SYN (Seq = ${data.client_isn}) to 127.0.0.1:${data.server_port}...`;

        // Stepper
        stepItems[0].classList.add('active');

        // Ladder & Table
        rowSyn.classList.add('active-row');
        flowSyn.classList.add('active');

        // Node Highlights & States
        clientNode.classList.add('highlight');
        clientState.className = 'state-badge state-syn-sent';
        clientState.textContent = 'SYN-SENT';

        // State Machine Flow
        fstateClosed.classList.remove('active');
        fstateSynSent.classList.add('active');

        // Stats update
        state.packetsSent = 1;
        statSent.textContent = state.packetsSent;
        globalStatusDot.className = 'status-dot dot-progress';
        globalStatusText.textContent = 'SYN-SENT';

        updatePacketPanel(1, data);

        // Timeline Log
        addTimelineEntry('SYN', `Client transmits SYN packet [Seq = ${data.client_isn}, Source Port = ${data.client_port}]`);

        // Animate Packet
        animatePacket('C2S', 'SYN', `Seq: ${data.client_isn}`, duration, () => {
            // Arrival at Server
            clientNode.classList.remove('highlight');
            serverNode.classList.add('highlight');

            serverState.className = 'state-badge state-syn-rcvd';
            serverState.textContent = 'SYN-RECEIVED';

            state.packetsReceived = 1;
            statRcvd.textContent = state.packetsReceived;

            addTimelineEntry('SYN', `Server (127.0.0.1:${data.server_port}) receives SYN from Client port ${data.client_port}`);
            stepItems[0].classList.remove('active');
            stepItems[0].classList.add('completed');
            stepConnectors[0].classList.add('completed');

            safeTimeout(() => {
                serverNode.classList.remove('highlight');
                state.isAnimating = false;
                state.currentStep = 1;
                btnStepText.textContent = 'Step-by-Step (Step 2: SYN-ACK)';
                updateButtonsAfterStep();

                if (typeof callback === 'function') {
                    callback();
                }
            }, 300);
        });
    }

    // -------------------------------------------------------------------------
    // Handshake Step 2: Server -> Client (SYN-ACK)
    // -------------------------------------------------------------------------
    function executeStep2(data, callback) {
        state.isAnimating = true;
        updateButtonsForRunning();
        const duration = getSelectedSpeed();

        stageHint.textContent = `Step 2/3: Server transmitting SYN-ACK (Seq = ${data.server_isn}, Ack = ${data.syn_ack_num}) to Client...`;

        // Stepper
        stepItems[1].classList.add('active');

        // Ladder & Table
        rowSyn.classList.remove('active-row');
        rowSynAck.classList.add('active-row');
        flowSyn.classList.remove('active');
        flowSynAck.classList.add('active');

        // Node Highlights
        serverNode.classList.add('highlight');

        // State Machine Flow
        fstateSynSent.classList.remove('active');
        fstateSynRcvd.classList.add('active');

        // Stats update
        state.packetsSent = 2;
        statSent.textContent = state.packetsSent;
        globalStatusText.textContent = 'SYN-RECEIVED';

        updatePacketPanel(2, data);

        // Timeline Log
        addTimelineEntry('SYN-ACK', `Server responds with SYN-ACK [Seq = ${data.server_isn}, Ack = ${data.syn_ack_num}]`);

        // Animate Packet
        animatePacket('S2C', 'SYN-ACK', `Ack: ${data.syn_ack_num}`, duration, () => {
            // Arrival at Client
            serverNode.classList.remove('highlight');
            clientNode.classList.add('highlight');

            state.packetsReceived = 2;
            statRcvd.textContent = state.packetsReceived;

            addTimelineEntry('SYN-ACK', `Client receives SYN-ACK. Sequence number verified (+1 offset matches).`);
            stepItems[1].classList.remove('active');
            stepItems[1].classList.add('completed');
            stepConnectors[1].classList.add('completed');

            safeTimeout(() => {
                clientNode.classList.remove('highlight');
                state.isAnimating = false;
                state.currentStep = 2;
                btnStepText.textContent = 'Step-by-Step (Step 3: ACK)';
                updateButtonsAfterStep();

                if (typeof callback === 'function') {
                    callback();
                }
            }, 300);
        });
    }

    // -------------------------------------------------------------------------
    // Handshake Step 3: Client -> Server (ACK)
    // -------------------------------------------------------------------------
    function executeStep3(data, callback) {
        state.isAnimating = true;
        updateButtonsForRunning();
        const duration = getSelectedSpeed();

        stageHint.textContent = `Step 3/3: Client sending final ACK (Ack = ${data.final_ack_num}) to complete handshake...`;

        // Stepper
        stepItems[2].classList.add('active');

        // Ladder & Table
        rowSynAck.classList.remove('active-row');
        rowAck.classList.add('active-row');
        flowSynAck.classList.remove('active');
        flowAck.classList.add('active');

        // Node Highlights
        clientNode.classList.add('highlight');
        clientState.className = 'state-badge state-established';
        clientState.textContent = 'ESTABLISHED';

        // Stats update
        state.packetsSent = 3;
        statSent.textContent = state.packetsSent;

        updatePacketPanel(3, data);

        // Timeline Log
        addTimelineEntry('ACK', `Client transmits final ACK [Seq = ${data.syn_ack_num}, Ack = ${data.final_ack_num}]`);

        // Animate Packet
        animatePacket('C2S', 'ACK', `Ack: ${data.final_ack_num}`, duration, () => {
            // Arrival at Server
            clientNode.classList.remove('highlight');
            serverNode.classList.add('highlight');

            serverState.className = 'state-badge state-established';
            serverState.textContent = 'ESTABLISHED';

            state.packetsReceived = 3;
            statRcvd.textContent = state.packetsReceived;

            addTimelineEntry('ACK', `Server verifies ACK. Full-duplex connection channel open!`);
            stepItems[2].classList.remove('active');
            stepItems[2].classList.add('completed');
            stepConnectors[2].classList.add('completed');

            safeTimeout(() => {
                serverNode.classList.remove('highlight');
                finishConnectionEstablished(data);
                state.isAnimating = false;
                state.currentStep = 3;

                if (typeof callback === 'function') {
                    callback();
                }
            }, 400);
        });
    }

    // -------------------------------------------------------------------------
    // Finalization: Connection Established & Saved to MySQL
    // -------------------------------------------------------------------------
    function finishConnectionEstablished(data) {
        stageHint.textContent = `Live TCP Handshake Completed! Connection Established in ${data.rtt_ms} ms. Saved to MySQL.`;

        // Stepper item 4
        stepItems[3].classList.add('completed');

        // State Machine Card
        fstateSynRcvd.classList.remove('active');
        fstateEst.classList.add('active');

        // Ladder Diagram Footer
        flowAck.classList.remove('active');
        flowEstBox.classList.add('active');

        // Global Status
        globalStatusDot.className = 'status-dot dot-established';
        globalStatusText.textContent = 'ESTABLISHED';

        // Flying Packet Cleanup
        flyingPacket.classList.remove('active-packet');

        // Timeline Logs
        addTimelineEntry('ESTABLISHED', `✓ Live OS TCP Socket connection active (RTT: ${data.rtt_ms} ms, Data verified)`);
        addTimelineEntry('MYSQL', `✓ Session metrics saved to MySQL table live_tcp_handshakes (Record ID #${data.record_id})`);

        // Reveal Established Success Banner
        bannerEstablished.classList.add('show');

        // Reload MySQL Database Records Table
        loadDatabaseRecords(data.record_id);

        // Button States
        btnStart.disabled = true;
        btnStep.disabled = true;
        btnStepText.textContent = 'Completed';
        btnReset.disabled = false;
        btnReplay.disabled = false;
        btnFail.disabled = true;
        state.isAutoPlaying = false;
    }

    // -------------------------------------------------------------------------
    // Full Auto-Run Execution (⚡ Execute Live TCP Handshake)
    // -------------------------------------------------------------------------
    function startLiveHandshake() {
        if (state.isAnimating) return;
        resetSimulation();
        state.isAutoPlaying = true;
        updateButtonsForRunning();

        stageHint.textContent = 'Creating real OS TCP sockets & measuring kernel round-trip latency...';
        addTimelineEntry('SYN', 'Initiating live OS TCP socket connection over loopback 127.0.0.1...');

        // Perform live OS socket call and MySQL record creation
        fetch('/api/live_handshake', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ simulate_failure: false })
        })
        .then(res => res.json())
        .then(data => {
            if (!data.success) {
                throw new Error(data.error || 'Failed to establish live socket');
            }

            // Sync live socket data across UI
            applyLiveSocketMetadata(data);
            addTimelineEntry('SYN', `Live socket bound: Client Port ${data.client_port} ➔ Server Port ${data.server_port}`);

            const delayBetweenSteps = getSelectedSpeed() + 450;

            // Step 1: SYN
            executeStep1(data, () => {
                if (!state.isAutoPlaying) return;
                safeTimeout(() => {
                    // Step 2: SYN-ACK
                    executeStep2(data, () => {
                        if (!state.isAutoPlaying) return;
                        safeTimeout(() => {
                            // Step 3: ACK
                            executeStep3(data);
                        }, delayBetweenSteps);
                    });
                }, delayBetweenSteps);
            });
        })
        .catch(err => {
            console.error('Socket execution error:', err);
            addTimelineEntry('ERROR', `Socket execution failed: ${err.message}`);
            stageHint.textContent = `Error: ${err.message}`;
            state.isAnimating = false;
            state.isAutoPlaying = false;
            updateButtonsAfterStep();
        });
    }

    // -------------------------------------------------------------------------
    // Step-by-Step Manual Controller
    // -------------------------------------------------------------------------
    function handleStepClick() {
        if (state.isAnimating) return;

        if (state.currentStep === 0) {
            // Need to fetch live socket first if not already fetched
            stageHint.textContent = 'Initializing live OS socket connection for Step 1...';
            updateButtonsForRunning();

            fetch('/api/live_handshake', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ simulate_failure: false })
            })
            .then(res => res.json())
            .then(data => {
                if (!data.success) throw new Error(data.error || 'Failed');
                applyLiveSocketMetadata(data);
                addTimelineEntry('SYN', `Live OS socket bound: Client ${data.client_port} ➔ Server ${data.server_port}`);
                executeStep1(data);
            })
            .catch(err => {
                console.error(err);
                stageHint.textContent = `Error: ${err.message}`;
                updateButtonsAfterStep();
            });

        } else if (state.currentStep === 1) {
            if (state.liveData) {
                executeStep2(state.liveData);
            }
        } else if (state.currentStep === 2) {
            if (state.liveData) {
                executeStep3(state.liveData);
            }
        }
    }

    // -------------------------------------------------------------------------
    // Socket Timeout / Packet Dropped Failure Test
    // -------------------------------------------------------------------------
    function simulateConnectionTimeout() {
        if (state.isAnimating) return;
        resetSimulation();
        state.isAnimating = true;
        updateButtonsForRunning();
        const duration = getSelectedSpeed();

        stageHint.textContent = 'Simulating connection timeout: Connecting to unopened port with 800ms socket timeout...';
        addTimelineEntry('TIMEOUT', 'Initiating live socket connection to closed port 127.0.0.1:59999...');

        fetch('/api/live_handshake', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ simulate_failure: true })
        })
        .then(res => res.json())
        .then(data => {
            state.liveData = data;
            applyLiveSocketMetadata(data);

            // Stepper Step 1
            stepItems[0].classList.add('active');
            rowSyn.classList.add('active-row');
            flowSyn.classList.add('active');

            clientNode.classList.add('highlight');
            clientState.className = 'state-badge state-syn-sent';
            clientState.textContent = 'SYN-SENT';

            fstateClosed.classList.remove('active');
            fstateSynSent.classList.add('active');

            statSent.textContent = '1';
            globalStatusDot.className = 'status-dot dot-progress';
            globalStatusText.textContent = 'SYN-SENT';

            updatePacketPanel(1, data);
            addTimelineEntry('SYN', `Client transmitted SYN [Seq = ${data.client_isn}] to 127.0.0.1:59999`);

            // Animate packet halfway across the network track
            const isVertical = window.innerWidth <= 768;
            flyingPacket.classList.add('active-packet');
            packetTag.textContent = 'SYN';
            packetMiniSeq.textContent = `Seq: ${data.client_isn}`;
            flyingPacket.style.borderColor = 'var(--accent-red)';
            packetTag.style.color = 'var(--accent-red)';
            packetArrow.style.color = 'var(--accent-red)';
            flyingPacket.style.transition = 'none';

            if (!isVertical) {
                const halfwayX = (networkTrack.clientWidth - flyingPacket.offsetWidth) * 0.55;
                flyingPacket.style.left = '0px';
                flyingPacket.style.top = '50%';
                flyingPacket.style.transform = 'translateY(-50%)';
                void flyingPacket.offsetWidth;

                flyingPacket.style.transition = `left ${duration * 0.7}ms ease-out`;
                flyingPacket.style.left = `${halfwayX}px`;
            } else {
                const halfwayY = (networkTrack.clientHeight - flyingPacket.offsetHeight) * 0.55;
                flyingPacket.style.top = '0px';
                flyingPacket.style.left = '50%';
                flyingPacket.style.transform = 'translateX(-50%)';
                void flyingPacket.offsetHeight;

                flyingPacket.style.transition = `top ${duration * 0.7}ms ease-out`;
                flyingPacket.style.top = `${halfwayY}px`;
            }

            // Drop packet mid-flight
            safeTimeout(() => {
                flyingPacket.classList.remove('active-packet');
                if (packetDropText) {
                    packetDropText.textContent = `Socket Timeout (${data.rtt_ms} ms) / Unreachable!`;
                }
                packetDropBox.classList.add('show');
                clientNode.classList.remove('highlight');

                addTimelineEntry('TIMEOUT', `Socket error: ${data.error_detail || 'Connection Timed Out'}`);
                addTimelineEntry('MYSQL', `Timeout event logged to MySQL database: Record #${data.record_id}`);

                safeTimeout(() => {
                    packetDropBox.classList.remove('show');
                    clientState.className = 'state-badge state-closed';
                    clientState.textContent = 'CLOSED';

                    globalStatusDot.className = 'status-dot dot-failed';
                    globalStatusText.textContent = 'TIMEOUT / DROPPED';

                    if (bannerFailedDesc) {
                        bannerFailedDesc.textContent = `Client SYN to 127.0.0.1:59999 received no response within ${data.rtt_ms} ms. Timeout event saved to MySQL table live_tcp_handshakes (ID #${data.record_id}).`;
                    }
                    bannerFailed.classList.add('show');
                    stageHint.textContent = `Connection Timed Out (${data.rtt_ms} ms). Logged to MySQL.`;

                    // Reload MySQL database records table
                    loadDatabaseRecords(data.record_id);

                    state.isAnimating = false;
                    btnStart.disabled = true;
                    btnStep.disabled = true;
                    btnReset.disabled = false;
                    btnReplay.disabled = true;
                    btnFail.disabled = true;
                }, 1000);

            }, duration * 0.7);

        })
        .catch(err => {
            console.error('Failure simulation error:', err);
            stageHint.textContent = `Timeout test error: ${err.message}`;
            state.isAnimating = false;
            updateButtonsAfterStep();
        });
    }

    // -------------------------------------------------------------------------
    // Button State Controller
    // -------------------------------------------------------------------------
    function updateButtonsForRunning() {
        btnStart.disabled = true;
        btnStep.disabled = true;
        btnReset.disabled = false;
        btnReplay.disabled = true;
        btnFail.disabled = true;
    }

    function updateButtonsAfterStep() {
        if (state.isAutoPlaying) return;
        btnStart.disabled = false;
        btnStep.disabled = false;
        btnReset.disabled = false;
        btnReplay.disabled = false;
        btnFail.disabled = false;
    }

    // -------------------------------------------------------------------------
    // Reset Simulator & Stage to Clean State
    // -------------------------------------------------------------------------
    function resetSimulation() {
        clearAllTimers();
        state.currentStep = 0;
        state.isAnimating = false;
        state.isAutoPlaying = false;
        state.packetsSent = 0;
        state.packetsReceived = 0;
        state.liveData = null;

        stageHint.textContent = 'Click "⚡ Execute Live TCP Handshake" to initiate real OS socket connection';
        globalStatusDot.className = 'status-dot dot-closed';
        globalStatusText.textContent = 'CLOSED';

        // Host Nodes
        clientNode.classList.remove('highlight');
        serverNode.classList.remove('highlight');
        clientState.className = 'state-badge state-closed';
        clientState.textContent = 'CLOSED';
        serverState.className = 'state-badge state-listen';
        serverState.textContent = 'LISTEN';

        // Reset Node Metadata
        if (clientIpVal) clientIpVal.textContent = '127.0.0.1';
        if (clientPortVal) clientPortVal.textContent = 'Dynamic (OS)';
        if (clientIsnVal) clientIsnVal.textContent = 'RFC 793 (32-bit)';
        if (serverIpVal) serverIpVal.textContent = '127.0.0.1';
        if (serverPortVal) serverPortVal.textContent = 'Dynamic (OS)';
        if (serverIsnVal) serverIsnVal.textContent = 'RFC 793 (32-bit)';

        // Flying Packet & Drop Box
        flyingPacket.classList.remove('active-packet');
        flyingPacket.style.transition = 'none';
        flyingPacket.style.left = '0px';
        flyingPacket.style.top = '50%';
        packetDropBox.classList.remove('show');

        // Stepper
        stepItems.forEach(item => item.classList.remove('active', 'completed'));
        stepConnectors.forEach(conn => conn.classList.remove('completed'));

        // Banners
        bannerEstablished.classList.remove('show');
        bannerFailed.classList.remove('show');

        // Packet Details Panel
        packetWaiting.style.display = 'block';
        packetContent.style.display = 'none';
        packetTagHeader.textContent = 'None';

        // State Flow Card
        [fstateClosed, fstateSynSent, fstateSynRcvd, fstateEst].forEach(el => el.classList.remove('active'));
        fstateClosed.classList.add('active');

        // Network Statistics
        statSent.textContent = '0';
        statRcvd.textContent = '0';
        if (statRtt) statRtt.textContent = '-- ms';
        if (statRecId) statRecId.textContent = '#--';

        // Ladder Diagram & Table
        [rowSyn, rowSynAck, rowAck].forEach(r => r.classList.remove('active-row'));
        [flowSyn, flowSynAck, flowAck, flowEstBox].forEach(f => f.classList.remove('active'));

        // Reset Math & Ladder Labels
        if (ladderCEndpoint) ladderCEndpoint.textContent = '127.0.0.1';
        if (ladderSEndpoint) ladderSEndpoint.textContent = '127.0.0.1';
        if (flowSynSeq) flowSynSeq.textContent = '1000';
        if (flowSynackSeq) flowSynackSeq.textContent = '5000';
        if (flowSynackAck) flowSynackAck.textContent = '1001';
        if (flowAckSeq) flowAckSeq.textContent = '1001';
        if (flowAckAck) flowAckAck.textContent = '5001';

        if (mathClientIsn) mathClientIsn.textContent = 'Seq = 1000';
        if (mathServerIsn) mathServerIsn.textContent = 'Seq = 5000';
        if (tableSynSeq) tableSynSeq.textContent = '1000';
        if (tableSynackSeq) tableSynackSeq.textContent = '5000';
        if (tableSynackAck) tableSynackAck.textContent = '1001';
        if (tableAckSeq) tableAckSeq.textContent = '1001';
        if (tableAckAck) tableAckAck.textContent = '5001';

        // Reset Timeline
        timelineList.innerHTML = '<div class="timeline-empty">Live OS socket events and MySQL write logs will appear here...</div>';

        // Reset Buttons
        btnStart.disabled = false;
        btnStep.disabled = false;
        btnStepText.textContent = 'Step-by-Step (Step 1)';
        btnReset.disabled = false;
        btnReplay.disabled = true;
        btnFail.disabled = false;
    }

    // -------------------------------------------------------------------------
    // Load & Render MySQL Database Records
    // -------------------------------------------------------------------------
    function loadDatabaseRecords(highlightId = null) {
        if (!dbRecordsTbody) return;

        fetch('/api/records')
            .then(res => res.json())
            .then(data => {
                if (dbEngineBadge && data.engine) {
                    dbEngineBadge.innerHTML = `<span class="badge-live-dot"></span> ${escapeHtml(data.engine)}`;
                }
                if (statEngineTag && data.engine) {
                    statEngineTag.textContent = data.engine.includes('MySQL') ? 'MySQL Active' : 'SQLite Fallback';
                }

                const records = data.records || [];
                if (records.length === 0) {
                    dbRecordsTbody.innerHTML = `
                        <tr>
                            <td colspan="11" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                                No live handshake records in MySQL yet. Click <strong>"⚡ Execute Live TCP Handshake"</strong> above!
                            </td>
                        </tr>
                    `;
                    return;
                }

                dbRecordsTbody.innerHTML = records.map(r => {
                    const isEstablished = r.socket_status === 'ESTABLISHED';
                    const statusTag = isEstablished
                        ? '<span class="status-tag-est">✓ ESTABLISHED</span>'
                        : '<span class="status-tag-fail">&#9888; TIMEOUT</span>';

                    const isHighlighted = highlightId && Number(r.id) === Number(highlightId);
                    const rowClass = isHighlighted ? 'highlight-new-row' : '';

                    return `
                        <tr class="${rowClass}">
                            <td class="font-code" style="font-weight: 700; color: var(--accent-cyan);">#${r.id}</td>
                            <td><strong>${escapeHtml(r.username)}</strong></td>
                            <td class="font-code text-cyan">${escapeHtml(r.client_ip)}:${r.client_port}</td>
                            <td class="font-code text-purple">${escapeHtml(r.server_ip)}:${r.server_port}</td>
                            <td class="font-code">${r.client_isn}</td>
                            <td class="font-code">${r.server_isn}</td>
                            <td class="font-code text-yellow">${r.syn_ack_num}</td>
                            <td class="font-code text-yellow">${r.final_ack_num}</td>
                            <td><span class="rtt-pill">${r.rtt_ms} ms</span></td>
                            <td>${statusTag}</td>
                            <td style="font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(r.created_at)}</td>
                        </tr>
                    `;
                }).join('');
            })
            .catch(err => {
                console.warn('Failed to load database records:', err);
                dbRecordsTbody.innerHTML = `
                    <tr>
                        <td colspan="11" style="text-align: center; color: #f87171; padding: 1.5rem;">
                            Error connecting to MySQL records API.
                        </td>
                    </tr>
                `;
            });
    }

    // -------------------------------------------------------------------------
    // Clear Database Records
    // -------------------------------------------------------------------------
    function clearDatabaseRecords() {
        if (!confirm('Are you sure you want to clear all live handshake logs from the MySQL database?')) {
            return;
        }

        fetch('/api/clear_records', { method: 'POST' })
            .then(res => res.json())
            .then(() => {
                loadDatabaseRecords();
                addTimelineEntry('MYSQL', 'Cleared all live handshake history from MySQL table.');
            })
            .catch(err => alert('Failed to clear database logs: ' + err.message));
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // -------------------------------------------------------------------------
    // Event Listeners
    // -------------------------------------------------------------------------
    btnStart.addEventListener('click', startLiveHandshake);
    btnStep.addEventListener('click', handleStepClick);
    btnReset.addEventListener('click', resetSimulation);
    btnReplay.addEventListener('click', startLiveHandshake);
    btnFail.addEventListener('click', simulateConnectionTimeout);
    btnRetryFail.addEventListener('click', startLiveHandshake);

    if (btnRefreshDb) {
        btnRefreshDb.addEventListener('click', () => loadDatabaseRecords());
    }
    if (btnClearDb) {
        btnClearDb.addEventListener('click', clearDatabaseRecords);
    }

    // Keyboard Shortcuts (Space: Start / Step, R: Reset, F: Timeout)
    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            return;
        }

        if (e.code === 'Space') {
            e.preventDefault();
            if (state.currentStep === 0 && !state.isAnimating) {
                startLiveHandshake();
            } else if (!state.isAnimating && state.currentStep < 3) {
                handleStepClick();
            }
        } else if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            resetSimulation();
        } else if (e.key === 'f' || e.key === 'F') {
            e.preventDefault();
            if (!state.isAnimating) {
                simulateConnectionTimeout();
            }
        }
    });

    // Window Resize Handler
    window.addEventListener('resize', () => {
        if (!state.isAnimating && state.currentStep === 0) {
            flyingPacket.style.left = '0px';
        }
    });

    // Initial Load
    console.log("%c Live TCP Handshake & MySQL Engine Initialized ", "background: #0284c7; color: #fff; font-weight: bold; padding: 4px;");
    loadDatabaseRecords();

})();
