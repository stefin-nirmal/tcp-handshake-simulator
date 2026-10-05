"""
TCP Three-Way Handshake Simulator
Computer Networks Lab Mini Project
Backend: Python + Flask with MySQL Database & Session Authentication
"""

import os
import sqlite3
from flask import Flask, render_template, jsonify, request, redirect, url_for, session, flash

try:
    import pymysql
    pymysql.install_as_MySQLdb()
    PYMYSQL_AVAILABLE = True
except ImportError:
    PYMYSQL_AVAILABLE = False

app = Flask(__name__)
app.secret_key = 'tcp-handshake-simulator-secret-key-cn-lab'

# Database Configuration (MySQL local with Stefin@59 credentials)
MYSQL_CONFIG = {
    'host': os.environ.get('DB_HOST', '127.0.0.1'),
    'user': os.environ.get('DB_USER', 'root'),
    'password': os.environ.get('DB_PASSWORD', 'Stefin@59'),
    'database': os.environ.get('DB_NAME', 'tcp_simulator_db'),
    'port': int(os.environ.get('DB_PORT', 3306)),
    'cursorclass': pymysql.cursors.DictCursor if PYMYSQL_AVAILABLE else None,
    'autocommit': True
}

# SQLite Fallback path (used if MySQL server is unreachable, e.g. on serverless Vercel)
SQLITE_PATH = '/tmp/handshake_simulator.db' if os.environ.get('VERCEL') else os.path.join(
    os.path.dirname(os.path.abspath(__file__)), 'handshake_simulator.db'
)

DB_ENGINE = "UNKNOWN"


def get_db():
    """Returns a database connection (MySQL preferred, SQLite fallback)."""
    global DB_ENGINE
    if PYMYSQL_AVAILABLE:
        try:
            conn = pymysql.connect(**MYSQL_CONFIG)
            DB_ENGINE = "MySQL (localhost:3306 - tcp_simulator_db)"
            return conn, "mysql"
        except Exception as e:
            # Fallback to SQLite if MySQL is unreachable
            pass

    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    DB_ENGINE = "SQLite (handshake_simulator.db)"
    return conn, "sqlite"


def init_db():
    """Initializes tables and seeds default users in the database."""
    global DB_ENGINE
    conn, engine = get_db()
    cursor = conn.cursor()

    if engine == "mysql":
        # 1. Users Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(100) NOT NULL,
                role VARCHAR(30) NOT NULL DEFAULT 'Student',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ''')

        # 2. Simulation Records Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS simulation_records (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL,
                role VARCHAR(30) NOT NULL,
                mode VARCHAR(60) NOT NULL,
                client_isn INT NOT NULL,
                server_isn INT NOT NULL,
                status VARCHAR(30) NOT NULL,
                packets_sent INT NOT NULL,
                packets_received INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ''')

        # Seed default users
        cursor.execute('SELECT COUNT(*) AS cnt FROM users')
        row = cursor.fetchone()
        cnt = row['cnt'] if isinstance(row, dict) else row[0]
        if cnt == 0:
            default_users = [
                ('student', 'network123', 'Student'),
                ('faculty', 'admin123', 'Faculty'),
                ('admin', 'admin', 'Admin')
            ]
            cursor.executemany(
                'INSERT INTO users (username, password, role) VALUES (%s, %s, %s)',
                default_users
            )
            conn.commit()

    else:
        # SQLite Schema
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'Student',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS simulation_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                role TEXT NOT NULL,
                mode TEXT NOT NULL,
                client_isn INTEGER NOT NULL,
                server_isn INTEGER NOT NULL,
                status TEXT NOT NULL,
                packets_sent INTEGER NOT NULL,
                packets_received INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute('SELECT COUNT(*) FROM users')
        if cursor.fetchone()[0] == 0:
            default_users = [
                ('student', 'network123', 'Student'),
                ('faculty', 'admin123', 'Faculty'),
                ('admin', 'admin', 'Admin')
            ]
            cursor.executemany(
                'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                default_users
            )
            conn.commit()

    conn.close()


# Initialize database upon start
try:
    init_db()
except Exception as e:
    print(f"Database initialization warning: {e}")

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
    """Renders the login page and authenticates users against the database."""
    if 'user' in session:
        return redirect(url_for('index'))

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        selected_role = request.form.get('role', 'Student')

        if not username or not password:
            flash('Please provide both username/roll number and password.', 'error')
            return render_template('login.html')

        conn, engine = get_db()
        cursor = conn.cursor()

        if engine == "mysql":
            cursor.execute(
                'SELECT * FROM users WHERE LOWER(username) = LOWER(%s) AND password = %s',
                (username, password)
            )
            user_row = cursor.fetchone()
        else:
            cursor.execute(
                'SELECT * FROM users WHERE LOWER(username) = LOWER(?) AND password = ?',
                (username, password)
            )
            user_row = cursor.fetchone()

        if user_row:
            role = user_row['role'] if isinstance(user_row, dict) else user_row[3]
            uname = user_row['username'] if isinstance(user_row, dict) else user_row[1]
            conn.close()

            session['user'] = {
                'username': uname,
                'role': role
            }
            flash(f'Signed in successfully as {uname} ({role})!', 'success')
            return redirect(url_for('index'))

        # Convenience for student evaluation: allow auto-creation if len >= 3
        if len(username) >= 3 and len(password) >= 3:
            try:
                if engine == "mysql":
                    cursor.execute(
                        'INSERT INTO users (username, password, role) VALUES (%s, %s, %s)',
                        (username, password, selected_role)
                    )
                else:
                    cursor.execute(
                        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                        (username, password, selected_role)
                    )
                conn.commit()
            except Exception:
                pass

            conn.close()
            session['user'] = {
                'username': username,
                'role': selected_role
            }
            flash(f'Signed in successfully as {username} ({selected_role})!', 'success')
            return redirect(url_for('index'))

        conn.close()
        flash('Invalid credentials. Use student/network123 or click Quick Demo Access.', 'error')

    return render_template('login.html')


@app.route('/register', methods=['GET', 'POST'])
def register():
    """Registers a new student or faculty account into the database."""
    if 'user' in session:
        return redirect(url_for('index'))

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        confirm_password = request.form.get('confirm_password', '').strip()
        role = request.form.get('role', 'Student')

        if not username or not password:
            flash('All fields are required.', 'error')
            return render_template('register.html')

        if password != confirm_password:
            flash('Passwords do not match.', 'error')
            return render_template('register.html')

        if len(password) < 4:
            flash('Password must be at least 4 characters long.', 'error')
            return render_template('register.html')

        conn, engine = get_db()
        cursor = conn.cursor()

        if engine == "mysql":
            cursor.execute('SELECT id FROM users WHERE LOWER(username) = LOWER(%s)', (username,))
            existing = cursor.fetchone()
        else:
            cursor.execute('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', (username,))
            existing = cursor.fetchone()

        if existing:
            conn.close()
            flash('Username or Roll Number already registered. Please login.', 'error')
            return render_template('register.html')

        if engine == "mysql":
            cursor.execute(
                'INSERT INTO users (username, password, role) VALUES (%s, %s, %s)',
                (username, password, role)
            )
        else:
            cursor.execute(
                'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                (username, password, role)
            )
        conn.commit()
        conn.close()

        session['user'] = {
            'username': username,
            'role': role
        }
        flash(f'Account created successfully! Welcome, {username}.', 'success')
        return redirect(url_for('index'))

    return render_template('register.html')


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
    return render_template('index.html', user=session.get('user'), db_engine=DB_ENGINE)


@app.route('/api/info', methods=['GET'])
def get_info():
    """Returns technical details and packet metadata for the TCP handshake."""
    data = dict(HANDSHAKE_METADATA)
    data["database"] = DB_ENGINE
    return jsonify(data)


@app.route('/api/records', methods=['GET'])
def get_records():
    """Fetches recent simulation experiment records from the database."""
    conn, engine = get_db()
    cursor = conn.cursor()

    if engine == "mysql":
        cursor.execute('SELECT * FROM simulation_records ORDER BY id DESC LIMIT 15')
        rows = cursor.fetchall()
        records = [
            {
                "id": r["id"],
                "username": r["username"],
                "role": r["role"],
                "mode": r["mode"],
                "client_isn": r["client_isn"],
                "server_isn": r["server_isn"],
                "status": r["status"],
                "packets_sent": r["packets_sent"],
                "packets_received": r["packets_received"],
                "created_at": str(r["created_at"])
            }
            for r in rows
        ]
    else:
        cursor.execute('SELECT * FROM simulation_records ORDER BY id DESC LIMIT 15')
        rows = cursor.fetchall()
        records = [
            {
                "id": r["id"],
                "username": r["username"],
                "role": r["role"],
                "mode": r["mode"],
                "client_isn": r["client_isn"],
                "server_isn": r["server_isn"],
                "status": r["status"],
                "packets_sent": r["packets_sent"],
                "packets_received": r["packets_received"],
                "created_at": str(r["created_at"])
            }
            for r in rows
        ]

    conn.close()
    return jsonify({"engine": DB_ENGINE, "records": records})


@app.route('/api/log_simulation', methods=['POST'])
def log_simulation():
    """Logs an executed handshake experiment into the database."""
    data = request.get_json() or {}
    user = session.get('user', {'username': 'Anonymous', 'role': 'Guest'})

    mode = data.get('mode', 'Automatic Handshake')
    status = data.get('status', 'ESTABLISHED')
    client_isn = data.get('client_isn', 1000)
    server_isn = data.get('server_isn', 5000)
    packets_sent = data.get('packets_sent', 3)
    packets_received = data.get('packets_received', 3)

    conn, engine = get_db()
    cursor = conn.cursor()

    if engine == "mysql":
        cursor.execute('''
            INSERT INTO simulation_records 
            (username, role, mode, client_isn, server_isn, status, packets_sent, packets_received)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ''', (user['username'], user['role'], mode, client_isn, server_isn, status, packets_sent, packets_received))
        record_id = cursor.lastrowid
    else:
        cursor.execute('''
            INSERT INTO simulation_records 
            (username, role, mode, client_isn, server_isn, status, packets_sent, packets_received)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (user['username'], user['role'], mode, client_isn, server_isn, status, packets_sent, packets_received))
        record_id = cursor.lastrowid

    conn.commit()
    conn.close()

    return jsonify({"success": True, "record_id": record_id, "engine": DB_ENGINE})


@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint to verify backend status."""
    return jsonify({"status": "healthy", "service": "TCP Handshake Simulator", "database": DB_ENGINE})


if __name__ == '__main__':
    print("=" * 60)
    print("  TCP Three-Way Handshake Simulator")
    print("  Computer Networks Mini Project with Database Support")
    print(f"  Database Engine: {DB_ENGINE}")
    print("  Login at: http://127.0.0.1:5000/login")
    print("  Simulator at: http://127.0.0.1:5000")
    print("=" * 60)
    app.run(debug=True, host='127.0.0.1', port=5000)
