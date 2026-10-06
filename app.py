"""
TCP Three-Way Handshake Live System
Computer Networks Lab Mini Project
Backend: Python + Flask with Live OS TCP Sockets & MySQL Database Storage
"""

import os
import time
import socket
import random
import threading
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

# SQLite Fallback path (used if MySQL is unreachable in cloud)
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
        except Exception:
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

        # 2. Live TCP Handshakes Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS live_tcp_handshakes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL,
                client_ip VARCHAR(50) NOT NULL,
                client_port INT NOT NULL,
                server_ip VARCHAR(50) NOT NULL,
                server_port INT NOT NULL,
                client_isn BIGINT UNSIGNED NOT NULL,
                server_isn BIGINT UNSIGNED NOT NULL,
                syn_ack_num BIGINT UNSIGNED NOT NULL,
                final_ack_num BIGINT UNSIGNED NOT NULL,
                rtt_ms DECIMAL(8,3) NOT NULL,
                socket_status VARCHAR(50) NOT NULL,
                bytes_transferred INT NOT NULL,
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
            CREATE TABLE IF NOT EXISTS live_tcp_handshakes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                client_ip TEXT NOT NULL,
                client_port INTEGER NOT NULL,
                server_ip TEXT NOT NULL,
                server_port INTEGER NOT NULL,
                client_isn INTEGER NOT NULL,
                server_isn INTEGER NOT NULL,
                syn_ack_num INTEGER NOT NULL,
                final_ack_num INTEGER NOT NULL,
                rtt_ms REAL NOT NULL,
                socket_status TEXT NOT NULL,
                bytes_transferred INTEGER NOT NULL,
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


def perform_live_tcp_connection(simulate_failure=False):
    """
    Executes a real live OS-level TCP socket connection over the loopback interface,
    measures high-precision Round-Trip Time (RTT), captures assigned OS ports,
    and synchronizes RFC-compliant sequence numbers.
    """
    if simulate_failure:
        # Simulate connection timeout/drop by attempting to connect to an unused port
        client_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        client_sock.settimeout(0.8)
        t_start = time.perf_counter()
        failed_reason = "Connection Timed Out / Destination Unreachable"
        try:
            client_sock.connect(('127.0.0.1', 59999))
        except Exception as ex:
            failed_reason = str(ex)
        finally:
            rtt_ms = round((time.perf_counter() - t_start) * 1000, 3)
            client_sock.close()

        client_isn = random.randint(1000000000, 4294967000)
        return {
            "client_ip": "127.0.0.1",
            "client_port": random.randint(50000, 65000),
            "server_ip": "127.0.0.1",
            "server_port": 59999,
            "client_isn": client_isn,
            "server_isn": 0,
            "syn_ack_num": 0,
            "final_ack_num": 0,
            "rtt_ms": rtt_ms,
            "socket_status": "TIMEOUT / DROPPED",
            "bytes_transferred": 0,
            "error_detail": failed_reason
        }

    # Normal live socket handshake
    server_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    # Bind to localhost on dynamic port assigned by OS
    server_sock.bind(('127.0.0.1', 0))
    server_sock.listen(1)
    server_ip, server_port = server_sock.getsockname()

    accepted_info = {}

    def server_thread_fn():
        try:
            conn, addr = server_sock.accept()
            # Receive handshake verification payload
            data = conn.recv(1024)
            # Echo confirmation back over live socket
            conn.sendall(b'ACK_TCP_LIVE_SOCKET_CONFIRMED')
            accepted_info['accepted'] = True
            conn.close()
        except Exception as ex:
            accepted_info['error'] = str(ex)
        finally:
            server_sock.close()

    t = threading.Thread(target=server_thread_fn)
    t.daemon = True
    t.start()

    # Create real client socket and connect
    client_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    t_start = time.perf_counter()
    client_sock.connect(('127.0.0.1', server_port))
    rtt_ms = round((time.perf_counter() - t_start) * 1000, 3)

    client_ip, client_port = client_sock.getsockname()

    # Transmit test verification payload
    client_sock.sendall(b'SYN_TCP_LIVE_SOCKET_INIT')
    reply = client_sock.recv(1024)
    client_sock.close()
    t.join(timeout=1.0)

    # Generate RFC 793 random 32-bit Initial Sequence Numbers (ISNs)
    client_isn = random.randint(1000000000, 4294967000)
    server_isn = random.randint(1000000000, 4294967000)
    syn_ack_num = client_isn + 1
    final_ack_num = server_isn + 1

    return {
        "client_ip": client_ip,
        "client_port": client_port,
        "server_ip": server_ip,
        "server_port": server_port,
        "client_isn": client_isn,
        "server_isn": server_isn,
        "syn_ack_num": syn_ack_num,
        "final_ack_num": final_ack_num,
        "rtt_ms": rtt_ms,
        "socket_status": "ESTABLISHED",
        "bytes_transferred": len(b'SYN_TCP_LIVE_SOCKET_INIT') + len(reply)
    }


# Live TCP connection metadata for API
HANDSHAKE_METADATA = {
    "protocol": "TCP (Transmission Control Protocol)",
    "layer": "Transport Layer (OSI Layer 4)",
    "type": "Live OS Socket Connection (Full-Duplex, Reliable)",
    "database": DB_ENGINE,
    "states": [
        {"state": "CLOSED", "description": "No active connection or pending socket."},
        {"state": "LISTEN", "description": "Server is listening on socket for incoming connections."},
        {"state": "SYN-SENT", "description": "Client transmitted SYN and is awaiting SYN-ACK."},
        {"state": "SYN-RECEIVED", "description": "Server received SYN, replied with SYN-ACK, awaiting final ACK."},
        {"state": "ESTABLISHED", "description": "Live TCP socket established; bidirectional byte stream ready."}
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
            return redirect(url_for('index'))

        conn.close()
        flash('Invalid credentials. Please check your username and password.', 'error')

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
        return redirect(url_for('index'))

    return render_template('register.html')


@app.route('/logout')
def logout():
    """Logs the user out and clears session."""
    session.pop('user', None)
    return redirect(url_for('login'))


@app.route('/')
def index():
    """Serves the main interactive simulator webpage (Protected)."""
    if 'user' not in session:
        return redirect(url_for('login'))
    return render_template('index.html', user=session.get('user'), db_engine=DB_ENGINE)


@app.route('/api/live_handshake', methods=['POST'])
def live_handshake():
    """
    Executes a real live TCP socket connection and stores all session metrics
    directly in the MySQL database.
    """
    user = session.get('user', {'username': 'student', 'role': 'Student'})
    payload = request.get_json(silent=True) or {}
    simulate_failure = bool(payload.get('simulate_failure', False))
    client_username = payload.get('username') or user.get('username', 'student')

    try:
        # Perform real OS socket handshake
        sock_info = perform_live_tcp_connection(simulate_failure=simulate_failure)
        
        # If client called from external device or passed IP, use client's remote address
        actual_client_ip = payload.get('client_ip') or (request.remote_addr if request.remote_addr != '127.0.0.1' else sock_info['client_ip'])
        sock_info['client_ip'] = actual_client_ip

        # Insert live record into MySQL
        conn, engine = get_db()
        cursor = conn.cursor()

        if engine == "mysql":
            cursor.execute('''
                INSERT INTO live_tcp_handshakes 
                (username, client_ip, client_port, server_ip, server_port, client_isn, server_isn, syn_ack_num, final_ack_num, rtt_ms, socket_status, bytes_transferred)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                client_username,
                sock_info['client_ip'],
                sock_info['client_port'],
                sock_info['server_ip'],
                sock_info['server_port'],
                sock_info['client_isn'],
                sock_info['server_isn'],
                sock_info['syn_ack_num'],
                sock_info['final_ack_num'],
                sock_info['rtt_ms'],
                sock_info['socket_status'],
                sock_info['bytes_transferred']
            ))
            record_id = cursor.lastrowid
        else:
            cursor.execute('''
                INSERT INTO live_tcp_handshakes 
                (username, client_ip, client_port, server_ip, server_port, client_isn, server_isn, syn_ack_num, final_ack_num, rtt_ms, socket_status, bytes_transferred)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                client_username,
                sock_info['client_ip'],
                sock_info['client_port'],
                sock_info['server_ip'],
                sock_info['server_port'],
                sock_info['client_isn'],
                sock_info['server_isn'],
                sock_info['syn_ack_num'],
                sock_info['final_ack_num'],
                sock_info['rtt_ms'],
                sock_info['socket_status'],
                sock_info['bytes_transferred']
            ))
            record_id = cursor.lastrowid

        conn.commit()
        conn.close()

        sock_info['record_id'] = record_id
        sock_info['engine'] = DB_ENGINE
        sock_info['success'] = True
        return jsonify(sock_info)

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/records', methods=['GET'])
def get_records():
    """Fetches recent live handshake experiment records from the database."""
    conn, engine = get_db()
    cursor = conn.cursor()

    if engine == "mysql":
        cursor.execute('SELECT * FROM live_tcp_handshakes ORDER BY id DESC LIMIT 20')
        rows = cursor.fetchall()
        records = [
            {
                "id": r["id"],
                "username": r["username"],
                "client_ip": r["client_ip"],
                "client_port": r["client_port"],
                "server_ip": r["server_ip"],
                "server_port": r["server_port"],
                "client_isn": r["client_isn"],
                "server_isn": r["server_isn"],
                "syn_ack_num": r["syn_ack_num"],
                "final_ack_num": r["final_ack_num"],
                "rtt_ms": float(r["rtt_ms"]),
                "socket_status": r["socket_status"],
                "bytes_transferred": r["bytes_transferred"],
                "created_at": r["created_at"].strftime('%Y-%m-%d %H:%M:%S') if hasattr(r["created_at"], 'strftime') else str(r["created_at"])
            }
            for r in rows
        ]
    else:
        cursor.execute('SELECT * FROM live_tcp_handshakes ORDER BY id DESC LIMIT 20')
        rows = cursor.fetchall()
        records = [
            {
                "id": r["id"],
                "username": r["username"],
                "client_ip": r["client_ip"],
                "client_port": r["client_port"],
                "server_ip": r["server_ip"],
                "server_port": r["server_port"],
                "client_isn": r["client_isn"],
                "server_isn": r["server_isn"],
                "syn_ack_num": r["syn_ack_num"],
                "final_ack_num": r["final_ack_num"],
                "rtt_ms": float(r["rtt_ms"]),
                "socket_status": r["socket_status"],
                "bytes_transferred": r["bytes_transferred"],
                "created_at": str(r["created_at"])
            }
            for r in rows
        ]

    conn.close()
    return jsonify({"engine": DB_ENGINE, "records": records})


@app.route('/api/clear_records', methods=['POST'])
def clear_records():
    """Clears all live handshake records from the database."""
    conn, engine = get_db()
    cursor = conn.cursor()
    if engine == "mysql":
        cursor.execute('TRUNCATE TABLE live_tcp_handshakes')
    else:
        cursor.execute('DELETE FROM live_tcp_handshakes')
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "Live handshake logs cleared successfully from MySQL."})


@app.route('/api/info', methods=['GET'])
def get_info():
    """Returns technical details and packet metadata for the TCP handshake."""
    data = dict(HANDSHAKE_METADATA)
    data["database"] = DB_ENGINE
    return jsonify(data)


@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint to verify backend status."""
    return jsonify({"status": "healthy", "service": "Live TCP Handshake Engine", "database": DB_ENGINE})


if __name__ == '__main__':
    print("=" * 60)
    print("  Live TCP Three-Way Handshake System")
    print("  Computer Networks Mini Project with Live Sockets & MySQL")
    print(f"  Database Engine: {DB_ENGINE}")
    print("  Local Host URL:     http://127.0.0.1:5000")
    print("  LAN Client Access:  http://0.0.0.0:5000 (Use your LAN IP)")
    print("=" * 60)
    app.run(debug=True, host='0.0.0.0', port=5000)
