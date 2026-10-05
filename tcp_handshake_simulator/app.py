"""
TCP Three-Way Handshake Simulator
Computer Networks Lab Mini Project
Backend: Python + Flask with Session Authentication
"""

from flask import Flask, render_template, jsonify, request, redirect, url_for, session, flash

app = Flask(__name__)
app.secret_key = 'tcp-handshake-simulator-secret-key-cn-lab'

# Simulation data model for API access
HANDSHAKE_METADATA = {
    "protocol": "TCP (Transmission Control Protocol)",
    "layer": "Transport Layer (OSI Layer 4)",
    "type": "Connection-Oriented, Full-Duplex, Reliable",
    "nodes": {
        "client": {
            "name": "Client",
            "ip": "192.168.1.10",
            "port": 5000,
            "isn": 1000,
            "description": "Initiator of the TCP connection"
        },
        "server": {
            "name": "Server",
            "ip": "192.168.1.20",
            "port": 8080,
            "isn": 5000,
            "description": "Listening host accepting incoming connections"
        }
    },
    "steps": [
        {
            "step": 1,
            "packet": "SYN",
            "sender": "Client",
            "receiver": "Server",
            "seq": 1000,
            "ack": None,
            "flags": {"SYN": 1, "ACK": 0, "FIN": 0, "RST": 0},
            "client_state": "SYN-SENT",
            "server_state": "SYN-RECEIVED",
            "purpose": "Client requests connection and establishes Initial Sequence Number (ISN = 1000)",
            "explanation": "The client sends a SYN packet with Seq=1000 to initiate the connection. SYN consumes 1 sequence number."
        },
        {
            "step": 2,
            "packet": "SYN-ACK",
            "sender": "Server",
            "receiver": "Client",
            "seq": 5000,
            "ack": 1001,
            "flags": {"SYN": 1, "ACK": 1, "FIN": 0, "RST": 0},
            "client_state": "ESTABLISHED",
            "server_state": "SYN-RECEIVED",
            "purpose": "Server acknowledges client SYN and sends its own synchronization sequence (ISN = 5000)",
            "explanation": "The server acknowledges Client's SYN by setting Ack=1001 (1000+1) and sends its own SYN with Seq=5000."
        },
        {
            "step": 3,
            "packet": "ACK",
            "sender": "Client",
            "receiver": "Server",
            "seq": 1001,
            "ack": 5001,
            "flags": {"SYN": 0, "ACK": 1, "FIN": 0, "RST": 0},
            "client_state": "ESTABLISHED",
            "server_state": "ESTABLISHED",
            "purpose": "Client acknowledges server SYN, completing the three-way handshake",
            "explanation": "The client sends an ACK with Ack=5001 (5000+1) and Seq=1001. Both sides are now in the ESTABLISHED state."
        }
    ],
    "states": [
        {"state": "CLOSED", "description": "No active connection or pending socket."},
        {"state": "LISTEN", "description": "Server is waiting for an incoming connection request."},
        {"state": "SYN-SENT", "description": "Client has sent a SYN packet and is awaiting SYN-ACK."},
        {"state": "SYN-RECEIVED", "description": "Server received SYN, sent SYN-ACK, and is awaiting final ACK."},
        {"state": "ESTABLISHED", "description": "Connection successfully created; full-duplex data transfer can begin."}
    ]
}


@app.route('/login', methods=['GET', 'POST'])
def login():
    """Renders the login page and authenticates users."""
    if 'user' in session:
        return redirect(url_for('index'))

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        role = request.form.get('role', 'Student')

        if not username or not password:
            flash('Please provide both username/roll number and password.', 'error')
            return render_template('login.html')

        # Authentication rules:
        # 1. Preset demo accounts
        # 2. Or allow any roll number for easy viva evaluation if password is provided
        valid = False
        if username.lower() == 'student' and password == 'network123':
            valid = True
            role = 'Student'
        elif username.lower() == 'faculty' and password == 'admin123':
            valid = True
            role = 'Faculty'
        elif username.lower() == 'admin' and password == 'admin':
            valid = True
            role = 'Admin'
        elif len(username) >= 3 and len(password) >= 3:
            # Flexible student login (e.g. 2024CS101)
            valid = True

        if valid:
            session['user'] = {
                'username': username,
                'role': role
            }
            flash(f'Signed in successfully as {username} ({role})!', 'success')
            return redirect(url_for('index'))
        else:
            flash('Invalid credentials. Use student/network123 or click Quick Demo Access.', 'error')

    return render_template('login.html')


@app.route('/logout')
def logout():
    """Logs the user out and clears session."""
    session.pop('user', None)
    flash('You have been logged out successfully.', 'info')
    return redirect(url_for('login'))


@app.route('/')
def index():
    """Serves the main interactive simulator webpage (Protected)."""
    if 'user' not in session:
        return redirect(url_for('login'))
    return render_template('index.html', user=session.get('user'))


@app.route('/api/info', methods=['GET'])
def get_info():
    """Returns technical details and packet metadata for the TCP handshake."""
    return jsonify(HANDSHAKE_METADATA)


@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint to verify backend status."""
    return jsonify({"status": "healthy", "service": "TCP Handshake Simulator"})


if __name__ == '__main__':
    print("=" * 60)
    print("  TCP Three-Way Handshake Simulator")
    print("  Computer Networks Mini Project")
    print("  Login at: http://127.0.0.1:5000/login")
    print("  Simulator at: http://127.0.0.1:5000")
    print("=" * 60)
    app.run(debug=True, host='127.0.0.1', port=5000)
