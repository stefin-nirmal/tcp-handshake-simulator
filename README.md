# TCP Three-Way Handshake Simulator

> **Computer Networks Lab Mini Project**  
> An interactive, educational visual simulation of the Transmission Control Protocol (TCP) Three-Way Handshake connection establishment process.

---

## 1. Project Overview

In Computer Networks, **TCP (Transmission Control Protocol)** is a connection-oriented, reliable transport layer protocol (OSI Layer 4). Before two devices can exchange user data (such as HTTP/HTTPS, FTP, or SSH traffic), they must first establish an active session using the **Three-Way Handshake**:

1. **SYN** (Synchronize) — Client requests connection.
2. **SYN-ACK** (Synchronize + Acknowledge) — Server responds and agrees.
3. **ACK** (Acknowledge) — Client confirms, connection becomes **ESTABLISHED**.

This web application visually simulates this entire procedure in real-time, detailing sequence numbers, acknowledgment numbers, TCP state transitions, network metrics, and failure handling.

---

## 2. Key Objectives

* **Demystify the Handshake:** Clearly visualize packets traversing between Client (`192.168.1.10:5000`) and Server (`192.168.1.20:8080`).
* **Explain Sequence Numbers:** Show why and how Initial Sequence Numbers (ISNs) are selected and why acknowledgment numbers increment by `+1` (SYN flag consumes 1 sequence number space).
* **Track TCP State Transitions:** Observe `CLOSED` &rarr; `SYN-SENT` &rarr; `SYN-RECEIVED` &rarr; `ESTABLISHED` in real-time.
* **Support Lab Vivas & Demos:** Provide interactive step-by-step controls, configurable speeds (Slow for viva explanations, Normal, Fast), and failure simulation (RTO timeout).

---

## 3. Technology Stack

* **Frontend:**
  * **HTML5:** Semantic architecture, accessible forms, modern layout.
  * **CSS3:** Custom properties (CSS variables), modern dark-blue networking dashboard, CSS Keyframe animations, fully responsive grid and flexbox.
  * **JavaScript (Vanilla ES6+):** Pure event-driven simulation engine with timer controls, state tracking, and keyboard shortcuts.
* **Backend:**
  * **Python 3:** Application logic.
  * **Flask:** Lightweight WSGI web framework serving static templates and `/api/info` endpoint.
* **Database:**
  * **MySQL:** Primary production database (`tcp_simulator_db` on `localhost:3306`) storing user credentials and simulation experiment records.
  * **SQLite Fallback:** Automatic cloud fallback (`handshake_simulator.db`) for zero-configuration deployment on platforms like Vercel.

---

## 4. Project Directory Structure

```text
tcp-handshake-simulator/
│
├── app.py                  # Flask backend server with MySQL database & REST API
├── requirements.txt        # Python dependency manifest (Flask, PyMySQL)
├── README.md               # Complete project documentation & viva guide
├── .gitignore              # Ignores venv/, caches, and local databases
│
├── templates/
│   ├── index.html          # Web dashboard interface with live DB records table
│   ├── login.html          # CN Lab portal login page
│   └── register.html       # Student / Faculty account registration page
│
└── static/
    ├── style.css           # Modern networking theme stylesheet & animations
    └── script.js           # Handshake animation controller & live DB logger
```

---

## 5. Installation and Setup

### Prerequisites
* **Python 3.8 or higher** installed on your machine.
* A modern web browser (Google Chrome, Microsoft Edge, Firefox, or Safari).

### Step 1: Open Terminal / Command Prompt
Navigate to the project folder:
```bash
cd "c:\Users\stefi\Desktop\cn mini project"
```

### Step 2: (Optional but Recommended) Create Virtual Environment
```bash
python -m venv venv
```

Activate the virtual environment:
* **Windows (Command Prompt / PowerShell):**
  ```powershell
  venv\Scripts\activate
  ```
* **macOS / Linux:**
  ```bash
  source venv/bin/activate
  ```

### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Run the Application
```bash
python app.py
```

### Step 5: Open in Web Browser & Sign In
Open your browser and visit:
```text
http://127.0.0.1:5000
```
You will be directed to the **CN Lab Portal Login** page.

#### Default Demo Credentials:
* **Student Login:** Username: `student` | Password: `network123`
* **Faculty Login:** Username: `faculty` | Password: `admin123`
* **Quick Access:** Click either **"Quick Student Demo Login"** or **"Quick Faculty Demo"** to sign in instantly with one click.

---

## 6. How to Use the Simulator

1. **Sign In:** Use the demo credentials or quick access buttons to enter the dashboard.
2. **Start Simulation:** Click the green **Start Simulation** button to run the entire three-way handshake automatically with realistic inter-packet delays.
2. **Step-by-Step Mode:** Click **Step-by-Step** to manually step through:
   * Click 1: Step 1 (SYN)
   * Click 2: Step 2 (SYN-ACK)
   * Click 3: Step 3 (ACK) &rarr; Connection Established
3. **Reset:** Resets all host states, packet positions, counters, and logs back to `CLOSED`.
4. **Replay:** Restarts the full simulation from the beginning.
5. **Simulate Failure:** Demonstrates what happens when the Client transmits a SYN packet but the Server is unreachable or unresponsive (Retransmission Timeout / RTO expiry).
6. **Adjust Speed:** Use the top-right speed selector:
   * **Slow (Viva):** 2.5 seconds per packet flight (ideal for presenting to professors).
   * **Normal:** 1.5 seconds per packet flight.
   * **Fast:** 0.8 seconds per packet flight.
7. **Keyboard Shortcuts:**
   * <kbd>Space</kbd>: Start simulation or advance to next step.
   * <kbd>R</kbd>: Reset simulation.
   * <kbd>F</kbd>: Trigger Failure simulation.

---

## 7. Understanding the Handshake Math

| Step | Packet | Sender &rarr; Receiver | Sequence No (`Seq`) | Acknowledgment No (`Ack`) | Explanation |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | **SYN** | Client &rarr; Server | `1000` | `-` | Client chooses initial sequence number `ISN = 1000`. |
| **2** | **SYN-ACK** | Server &rarr; Client | `5000` | `1001` | Server acknowledges client SYN (`1000 + 1 = 1001`) and sends its own `ISN = 5000`. |
| **3** | **ACK** | Client &rarr; Server | `1001` | `5001` | Client acknowledges server SYN (`5000 + 1 = 5001`). Both hosts are now `ESTABLISHED`. |

> **Why `+1`?** In TCP, the SYN and FIN control flags logically consume **1 byte of sequence number space** even though they contain 0 bytes of payload data. Therefore, the acknowledgment increments the sender's sequence number by 1.

---

## 8. Viva Questions and Answers

### Q1: What is the main purpose of the TCP Three-Way Handshake?
**Answer:** To synchronize sequence numbers between the client and server, verify that both communication channels (client-to-server and server-to-client) are operational, and allocate socket buffers and control blocks on both endpoints.

### Q2: What do SYN and ACK stand for?
**Answer:** 
* **SYN:** Synchronize (requests synchronization of sequence numbers).
* **ACK:** Acknowledgment (confirms receipt of previous sequence numbers).

### Q3: Why does TCP use a Three-Way Handshake instead of a Two-Way Handshake?
**Answer:** TCP is a full-duplex (bidirectional) protocol. Both sides must independently propose their own Initial Sequence Number (ISN) and have it acknowledged by the other side. A two-way handshake leaves the server uncertain whether the client received its sequence number, and could cause duplicate, delayed packets in the network to establish false "half-open" connections.

### Q4: Why do Sequence Numbers increase by 1 during the handshake if no data is sent?
**Answer:** RFC 793 specifies that pure control segments carrying SYN or FIN flags consume exactly 1 sequence number space to guarantee reliable delivery and acknowledgment.

### Q5: What are the TCP states experienced by the Client during the handshake?
**Answer:** `CLOSED` &rarr; `SYN-SENT` &rarr; `ESTABLISHED`.

### Q6: What are the TCP states experienced by the Server during the handshake?
**Answer:** `LISTEN` &rarr; `SYN-RECEIVED` &rarr; `ESTABLISHED`.

### Q7: What is an Initial Sequence Number (ISN) and why is it randomized?
**Answer:** The ISN is the starting sequence number for a TCP byte stream. It is randomized rather than starting from 0 to prevent confusion with old duplicate packets from prior closed connections and to defend against TCP sequence prediction / spoofing attacks.

### Q8: What happens if the server does not reply to a SYN packet?
**Answer:** The client's retransmission timer (RTO - Retransmission Time-Out) expires. The client will retransmit the SYN packet a few times before giving up and returning a "Connection Timed Out" error to the application layer.

### Q9: Which layer of the OSI model does TCP operate in?
**Answer:** Layer 4 — The Transport Layer.

### Q10: How does connection termination differ from connection establishment?
**Answer:** Connection establishment takes **3 steps** (Three-Way Handshake: SYN, SYN-ACK, ACK), while standard graceful connection termination takes **4 steps** (Four-Way Handshake: FIN, ACK, FIN, ACK) because TCP connections are full-duplex and each direction can be closed independently.

