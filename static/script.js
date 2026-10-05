/**
 * ============================================================================
 * TCP Three-Way Handshake Simulator
 * Computer Networks Lab Mini Project
 * Frontend JavaScript Simulation Controller
 * ============================================================================
 */

(function () {
    'use strict';

    // -------------------------------------------------------------------------
    // DOM Element References
    // -------------------------------------------------------------------------
    const btnStart = document.getElementById('btn-start');
    const btnStep = document.getElementById('btn-step');
    const btnStepText = document.getElementById('btn-step-text');
    const btnReset = document.getElementById('btn-reset');
    const btnReplay = document.getElementById('btn-replay');
    const btnFail = document.getElementById('btn-fail');
    const btnRetryFail = document.getElementById('btn-retry-fail');

    const globalStatusDot = document.getElementById('global-status-dot');
    const globalStatusText = document.getElementById('global-status-text');
    const stageHint = document.getElementById('stage-hint');

    // Host Nodes
    const clientNode = document.getElementById('client-node');
    const serverNode = document.getElementById('server-node');
    const clientState = document.getElementById('client-state');
    const serverState = document.getElementById('server-state');

    // Network Track & Animated Packet
    const networkTrack = document.getElementById('network-track');
    const flyingPacket = document.getElementById('flying-packet');
    const packetTag = document.getElementById('packet-tag');
    const packetMiniSeq = document.getElementById('packet-mini-seq');
    const packetArrow = document.getElementById('packet-arrow');
    const packetDropBox = document.getElementById('packet-drop-box');

    // Banners
    const bannerEstablished = document.getElementById('banner-established');
    const bannerFailed = document.getElementById('banner-failed');

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
    const statSteps = document.getElementById('stat-steps');
    const statStatus = document.getElementById('stat-status');

    // Ladder Diagram & Sequence Table
    const flowSyn = document.getElementById('flow-syn');
    const flowSynAck = document.getElementById('flow-synack');
    const flowAck = document.getElementById('flow-ack');
    const flowEstBox = document.getElementById('flow-est-box');

    const rowSyn = document.getElementById('row-syn');
    const rowSynAck = document.getElementById('row-synack');
    const rowAck = document.getElementById('row-ack');

    // Timeline Log
    const timelineList = document.getElementById('timeline-list');

    // -------------------------------------------------------------------------
    // Simulation State Model
    // -------------------------------------------------------------------------
    const state = {
        currentStep: 0,         // 0: Initial, 1: SYN, 2: SYN-ACK, 3: ACK, 4: ESTABLISHED
        isAnimating: false,     // True when a packet is currently flying
        isAutoPlaying: false,   // True when auto simulation is running
        packetsSent: 0,
        packetsReceived: 0,
        timerIds: [],
        timelineSeconds: 0
    };

    // -------------------------------------------------------------------------
    // Speed Helper
    // -------------------------------------------------------------------------
    function getSelectedSpeed() {
        const checkedRadio = document.querySelector('input[name="speed"]:checked');
        return checkedRadio ? parseInt(checkedRadio.value, 10) : 1500;
    }

    // -------------------------------------------------------------------------
    // Timeline Logger
    // -------------------------------------------------------------------------
    function addTimelineEntry(timeStr, type, message) {
        const emptyMsg = timelineList.querySelector('.timeline-empty');
        if (emptyMsg) {
            emptyMsg.remove();
        }

        const entry = document.createElement('div');
        entry.className = `timeline-entry log-${type.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

        let badgeClass = 'tl-badge-syn';
        if (type === 'SYN') badgeClass = 'tl-badge-syn';
        else if (type === 'SYN-ACK') badgeClass = 'tl-badge-synack';
        else if (type === 'ACK') badgeClass = 'tl-badge-ack';
        else if (type === 'ESTABLISHED') badgeClass = 'tl-badge-ack';
        else if (type === 'ERROR') badgeClass = 'tl-badge-error';

        entry.innerHTML = `
            <span class="tl-time">${timeStr}</span>
            <span class="tl-badge ${badgeClass}">${type}</span>
            <span class="tl-msg">${message}</span>
        `;

        timelineList.appendChild(entry);
        timelineList.scrollTop = timelineList.scrollHeight;
    }

    // -------------------------------------------------------------------------
    // Safe Timeout Tracker
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
    // Animation Engine: Move Packet Across Network Track
    // -------------------------------------------------------------------------
    function animatePacket(direction, label, miniSeq, durationMs, onArrival) {
        const isVertical = window.innerWidth <= 768;
        const trackRect = networkTrack.getBoundingClientRect();
        const packetRect = flyingPacket.getBoundingClientRect();

        flyingPacket.classList.add('active-packet');
        packetTag.textContent = label;
        packetMiniSeq.textContent = miniSeq;

        // Color coding packet border and tag
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
            // Horizontal layout
            const maxTravelX = networkTrack.clientWidth - flyingPacket.offsetWidth;
            const startX = direction === 'C2S' ? 0 : maxTravelX;
            const targetX = direction === 'C2S' ? maxTravelX : 0;

            packetArrow.innerHTML = direction === 'C2S' ? '&rarr;' : '&larr;';
            flyingPacket.style.top = '50%';
            flyingPacket.style.transform = 'translateY(-50%)';
            flyingPacket.style.left = `${startX}px`;

            // Force reflow
            void flyingPacket.offsetWidth;

            flyingPacket.style.transition = `left ${durationMs}ms cubic-bezier(0.4, 0, 0.2, 1)`;
            flyingPacket.style.left = `${targetX}px`;
        } else {
            // Vertical layout (Mobile)
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
    // Packet Information Panel Updater
    // -------------------------------------------------------------------------
    function updatePacketPanel(stepNumber) {
        packetWaiting.style.display = 'none';
        packetContent.style.display = 'flex';

        if (stepNumber === 1) {
            packetTagHeader.textContent = 'SYN';
            pdType.textContent = 'SYN';
            pdType.style.color = 'var(--accent-cyan)';
            pdDirection.textContent = 'Client → Server';
            pdSeq.textContent = '1000';
            pdAck.textContent = '-';
            pdFlags.innerHTML = `
                <span class="flag-pill active">SYN = 1</span>
                <span class="flag-pill">ACK = 0</span>
                <span class="flag-pill">FIN = 0</span>
            `;
            pdPurpose.textContent = 'Request TCP connection & synchronize sequence numbers';
            pdExplanation.textContent = 'The client sends a SYN packet with Seq=1000 to initiate a TCP connection. No application data is sent.';
        } else if (stepNumber === 2) {
            packetTagHeader.textContent = 'SYN-ACK';
            pdType.textContent = 'SYN-ACK';
            pdType.style.color = 'var(--accent-purple)';
            pdDirection.textContent = 'Server → Client';
            pdSeq.textContent = '5000';
            pdAck.textContent = '1001 (1000 + 1)';
            pdFlags.innerHTML = `
                <span class="flag-pill active">SYN = 1</span>
                <span class="flag-pill active">ACK = 1</span>
                <span class="flag-pill">FIN = 0</span>
            `;
            pdPurpose.textContent = 'Acknowledge client SYN & synchronize server sequence number';
            pdExplanation.textContent = 'The server acknowledges receipt of SYN (Ack=1001) and sends its own initial sequence number (Seq=5000).';
        } else if (stepNumber === 3) {
            packetTagHeader.textContent = 'ACK';
            pdType.textContent = 'ACK';
            pdType.style.color = 'var(--accent-green)';
            pdDirection.textContent = 'Client → Server';
            pdSeq.textContent = '1001';
            pdAck.textContent = '5001 (5000 + 1)';
            pdFlags.innerHTML = `
                <span class="flag-pill">SYN = 0</span>
                <span class="flag-pill active">ACK = 1</span>
                <span class="flag-pill">FIN = 0</span>
            `;
            pdPurpose.textContent = 'Confirm server response and establish connection';
            pdExplanation.textContent = 'The client acknowledges the server\'s SYN (Ack=5001). Sequence numbers are synchronized; data transmission can begin.';
        }
    }

    // -------------------------------------------------------------------------
    // Handshake Execution: Step 1 (SYN)
    // -------------------------------------------------------------------------
    function executeStep1(callback) {
        state.isAnimating = true;
        updateButtonsForRunning();
        const duration = getSelectedSpeed();

        stageHint.textContent = 'Step 1 of 3: Client is transmitting SYN packet to Server...';

        // Update Stepper
        stepItems[0].classList.add('active');

        // Update Sequence Table & Ladder
        rowSyn.classList.add('active-row');
        flowSyn.classList.add('active');

        // Node Highlights
        clientNode.classList.add('highlight');
        clientState.className = 'state-badge state-syn-sent';
        clientState.textContent = 'SYN-SENT';

        // State Machine Flow
        fstateClosed.classList.remove('active');
        fstateSynSent.classList.add('active');

        // Timeline Log
        addTimelineEntry('00:00', 'SYN', 'Client sends SYN packet (Seq = 1000)');

        // Stats update
        state.packetsSent = 1;
        statSent.textContent = state.packetsSent;
        statSteps.textContent = '1 / 3';
        statStatus.textContent = 'SYN-SENT';
        globalStatusDot.className = 'status-dot dot-progress';
        globalStatusText.textContent = 'SYN-SENT';

        updatePacketPanel(1);

        // Animate Packet Client -> Server
        animatePacket('C2S', 'SYN', 'Seq: 1000', duration, () => {
            // Arrival at Server
            clientNode.classList.remove('highlight');
            serverNode.classList.add('highlight');

            serverState.className = 'state-badge state-syn-rcvd';
            serverState.textContent = 'SYN-RECEIVED';

            state.packetsReceived = 1;
            statRcvd.textContent = state.packetsReceived;

            addTimelineEntry('00:01', 'SYN', 'Server receives SYN packet (Seq = 1000)');
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
    // Handshake Execution: Step 2 (SYN-ACK)
    // -------------------------------------------------------------------------
    function executeStep2(callback) {
        state.isAnimating = true;
        updateButtonsForRunning();
        const duration = getSelectedSpeed();

        stageHint.textContent = 'Step 2 of 3: Server is transmitting SYN-ACK packet to Client...';

        // Update Stepper
        stepItems[1].classList.add('active');

        // Update Sequence Table & Ladder
        rowSyn.classList.remove('active-row');
        rowSynAck.classList.add('active-row');
        flowSyn.classList.remove('active');
        flowSynAck.classList.add('active');

        // Node Highlights
        serverNode.classList.add('highlight');

        // State Machine Flow
        fstateSynSent.classList.remove('active');
        fstateSynRcvd.classList.add('active');

        // Timeline Log
        addTimelineEntry('00:02', 'SYN-ACK', 'Server sends SYN-ACK packet (Seq = 5000, Ack = 1001)');

        // Stats update
        state.packetsSent = 2;
        statSent.textContent = state.packetsSent;
        statSteps.textContent = '2 / 3';
        statStatus.textContent = 'SYN-RECEIVED';
        globalStatusText.textContent = 'SYN-RECEIVED';

        updatePacketPanel(2);

        // Animate Packet Server -> Client
        animatePacket('S2C', 'SYN-ACK', 'Ack: 1001', duration, () => {
            // Arrival at Client
            serverNode.classList.remove('highlight');
            clientNode.classList.add('highlight');

            state.packetsReceived = 2;
            statRcvd.textContent = state.packetsReceived;

            addTimelineEntry('00:03', 'SYN-ACK', 'Client receives SYN-ACK packet (Seq = 5000, Ack = 1001)');
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
    // Handshake Execution: Step 3 (ACK)
    // -------------------------------------------------------------------------
    function executeStep3(callback) {
        state.isAnimating = true;
        updateButtonsForRunning();
        const duration = getSelectedSpeed();

        stageHint.textContent = 'Step 3 of 3: Client is transmitting final ACK packet to Server...';

        // Update Stepper
        stepItems[2].classList.add('active');

        // Update Sequence Table & Ladder
        rowSynAck.classList.remove('active-row');
        rowAck.classList.add('active-row');
        flowSynAck.classList.remove('active');
        flowAck.classList.add('active');

        // Node Highlights
        clientNode.classList.add('highlight');
        clientState.className = 'state-badge state-established';
        clientState.textContent = 'ESTABLISHED';

        // Timeline Log
        addTimelineEntry('00:04', 'ACK', 'Client sends ACK packet (Seq = 1001, Ack = 5001)');

        // Stats update
        state.packetsSent = 3;
        statSent.textContent = state.packetsSent;
        statSteps.textContent = '3 / 3 (100%)';

        updatePacketPanel(3);

        // Animate Packet Client -> Server
        animatePacket('C2S', 'ACK', 'Ack: 5001', duration, () => {
            // Arrival at Server
            clientNode.classList.remove('highlight');
            serverNode.classList.add('highlight');

            serverState.className = 'state-badge state-established';
            serverState.textContent = 'ESTABLISHED';

            state.packetsReceived = 3;
            statRcvd.textContent = state.packetsReceived;

            addTimelineEntry('00:05', 'ACK', 'Server receives ACK packet (Seq = 1001, Ack = 5001)');
            stepItems[2].classList.remove('active');
            stepItems[2].classList.add('completed');
            stepConnectors[2].classList.add('completed');

            safeTimeout(() => {
                serverNode.classList.remove('highlight');
                finishConnectionEstablished();
                state.isAnimating = false;
                state.currentStep = 3;

                if (typeof callback === 'function') {
                    callback();
                }
            }, 400);
        });
    }

    // -------------------------------------------------------------------------
    // Connection Established Finalization
    // -------------------------------------------------------------------------
    function finishConnectionEstablished() {
        stageHint.textContent = 'Connection Established! Handshake complete.';

        // Stepper item 4
        stepItems[3].classList.add('completed');

        // State machine card
        fstateSynRcvd.classList.remove('active');
        fstateEst.classList.add('active');

        // Ladder Box
        flowAck.classList.remove('active');
        flowEstBox.classList.add('active');

        // Global status
        globalStatusDot.className = 'status-dot dot-established';
        globalStatusText.textContent = 'ESTABLISHED';
        statStatus.textContent = 'ESTABLISHED';
        statStatus.style.color = 'var(--accent-green)';

        // Timeline log
        addTimelineEntry('00:06', 'ESTABLISHED', '✓ TCP Connection ESTABLISHED. Ready for bidirectional data.');

        // Hide flying packet
        flyingPacket.classList.remove('active-packet');

        // Reveal Success Banner
        bannerEstablished.classList.add('show');

        // Update button states
        btnStart.disabled = true;
        btnStep.disabled = true;
        btnStepText.textContent = 'Completed';
        btnReset.disabled = false;
        btnReplay.disabled = false;
        btnFail.disabled = true;
        state.isAutoPlaying = false;
    }

    // -------------------------------------------------------------------------
    // Simulation: Connection Failure / Timeout Test
    // -------------------------------------------------------------------------
    function simulateConnectionFailure() {
        resetSimulation();
        state.isAnimating = true;
        updateButtonsForRunning();
        const duration = getSelectedSpeed();

        stageHint.textContent = 'Simulating Connection Failure: Client sends SYN, but server is unreachable...';

        // Stepper
        stepItems[0].classList.add('active');
        rowSyn.classList.add('active-row');
        flowSyn.classList.add('active');

        clientNode.classList.add('highlight');
        clientState.className = 'state-badge state-syn-sent';
        clientState.textContent = 'SYN-SENT';

        fstateClosed.classList.remove('active');
        fstateSynSent.classList.add('active');

        statSent.textContent = '1';
        statSteps.textContent = 'Timeout';
        statStatus.textContent = 'SYN-SENT';
        globalStatusDot.className = 'status-dot dot-progress';
        globalStatusText.textContent = 'SYN-SENT';

        updatePacketPanel(1);
        addTimelineEntry('00:00', 'SYN', 'Client sends SYN packet (Seq = 1000)');

        // Animate packet halfway across the network track
        const isVertical = window.innerWidth <= 768;
        flyingPacket.classList.add('active-packet');
        packetTag.textContent = 'SYN';
        packetMiniSeq.textContent = 'Seq: 1000';
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

        // Mid-way packet drop & timeout
        safeTimeout(() => {
            flyingPacket.classList.remove('active-packet');
            packetDropBox.classList.add('show');
            clientNode.classList.remove('highlight');

            addTimelineEntry('00:03', 'ERROR', 'Retransmission timeout (RTO = 3000ms expired)');
            addTimelineEntry('00:03', 'ERROR', 'Destination unreachable: No response from Server 192.168.1.20:8080');

            safeTimeout(() => {
                packetDropBox.classList.remove('show');
                clientState.className = 'state-badge state-closed';
                clientState.textContent = 'CLOSED';

                globalStatusDot.className = 'status-dot dot-failed';
                globalStatusText.textContent = 'CONNECTION TIMEOUT';
                statStatus.textContent = 'FAILED';
                statStatus.style.color = 'var(--accent-red)';

                bannerFailed.classList.add('show');
                stageHint.textContent = 'Handshake failed: Connection timed out.';

                state.isAnimating = false;
                btnStart.disabled = true;
                btnStep.disabled = true;
                btnReset.disabled = false;
                btnReplay.disabled = true;
                btnFail.disabled = true;
            }, 1000);

        }, duration * 0.7);
    }

    // -------------------------------------------------------------------------
    // Full Auto-Run Simulation
    // -------------------------------------------------------------------------
    function startFullSimulation() {
        if (state.isAnimating) return;
        resetSimulation();
        state.isAutoPlaying = true;

        const delayBetweenSteps = getSelectedSpeed() + 450;

        executeStep1(() => {
            if (!state.isAutoPlaying) return;
            safeTimeout(() => {
                executeStep2(() => {
                    if (!state.isAutoPlaying) return;
                    safeTimeout(() => {
                        executeStep3();
                    }, delayBetweenSteps);
                });
            }, delayBetweenSteps);
        });
    }

    // -------------------------------------------------------------------------
    // Step-by-Step Manual Controller
    // -------------------------------------------------------------------------
    function handleStepClick() {
        if (state.isAnimating) return;

        if (state.currentStep === 0) {
            executeStep1();
        } else if (state.currentStep === 1) {
            executeStep2();
        } else if (state.currentStep === 2) {
            executeStep3();
        }
    }

    // -------------------------------------------------------------------------
    // Button State Management
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
    // Reset Simulation to Initial State
    // -------------------------------------------------------------------------
    function resetSimulation() {
        clearAllTimers();
        state.currentStep = 0;
        state.isAnimating = false;
        state.isAutoPlaying = false;
        state.packetsSent = 0;
        state.packetsReceived = 0;

        // Reset stage hints and global status
        stageHint.textContent = 'Click "Start Simulation" or "Step-by-Step" to begin';
        globalStatusDot.className = 'status-dot dot-closed';
        globalStatusText.textContent = 'CLOSED';

        // Reset Host Nodes
        clientNode.classList.remove('highlight');
        serverNode.classList.remove('highlight');
        clientState.className = 'state-badge state-closed';
        clientState.textContent = 'CLOSED';
        serverState.className = 'state-badge state-listen';
        serverState.textContent = 'LISTEN';

        // Reset Packet Element & Drop Warning
        flyingPacket.classList.remove('active-packet');
        flyingPacket.style.transition = 'none';
        flyingPacket.style.left = '0px';
        flyingPacket.style.top = '50%';
        packetDropBox.classList.remove('show');

        // Reset Stepper
        stepItems.forEach(item => {
            item.classList.remove('active', 'completed');
        });
        stepConnectors.forEach(conn => {
            conn.classList.remove('completed');
        });

        // Reset Banners
        bannerEstablished.classList.remove('show');
        bannerFailed.classList.remove('show');

        // Reset Packet Details Card
        packetWaiting.style.display = 'block';
        packetContent.style.display = 'none';
        packetTagHeader.textContent = 'None';

        // Reset State Machine Card
        [fstateClosed, fstateSynSent, fstateSynRcvd, fstateEst].forEach(el => el.classList.remove('active'));
        fstateClosed.classList.add('active');

        // Reset Network Stats
        statSent.textContent = '0';
        statRcvd.textContent = '0';
        statSteps.textContent = '0 / 3';
        statStatus.textContent = 'CLOSED';
        statStatus.style.color = 'var(--text-primary)';

        // Reset Ladder and Seq Table
        [rowSyn, rowSynAck, rowAck].forEach(r => r.classList.remove('active-row'));
        [flowSyn, flowSynAck, flowAck, flowEstBox].forEach(f => f.classList.remove('active'));

        // Reset Timeline Log
        timelineList.innerHTML = '<div class="timeline-empty">Timeline logs will appear here during execution...</div>';

        // Reset Buttons
        btnStart.disabled = false;
        btnStep.disabled = false;
        btnStepText.textContent = 'Step-by-Step (Step 1)';
        btnReset.disabled = false;
        btnReplay.disabled = true;
        btnFail.disabled = false;
    }

    // -------------------------------------------------------------------------
    // Event Listeners
    // -------------------------------------------------------------------------
    btnStart.addEventListener('click', startFullSimulation);
    btnStep.addEventListener('click', handleStepClick);
    btnReset.addEventListener('click', resetSimulation);
    btnReplay.addEventListener('click', startFullSimulation);
    btnFail.addEventListener('click', simulateConnectionFailure);
    btnRetryFail.addEventListener('click', startFullSimulation);

    // Keyboard Shortcuts (Space: Start/Next Step, R: Reset, F: Fail)
    window.addEventListener('keydown', (e) => {
        // Ignore if user is inside an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.code === 'Space') {
            e.preventDefault();
            if (state.currentStep === 0 && !state.isAnimating) {
                startFullSimulation();
            } else if (!state.isAnimating && state.currentStep < 3) {
                handleStepClick();
            }
        } else if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            resetSimulation();
        } else if (e.key === 'f' || e.key === 'F') {
            e.preventDefault();
            if (!state.isAnimating) {
                simulateConnectionFailure();
            }
        }
    });

    // Handle Window Resize to keep packet layout accurate
    window.addEventListener('resize', () => {
        if (!state.isAnimating && state.currentStep === 0) {
            flyingPacket.style.left = '0px';
        }
    });

    // Initial console banner
    console.log("%c TCP Three-Way Handshake Simulator Initialized ", "background: #0284c7; color: #fff; font-weight: bold; padding: 4px;");

})();

