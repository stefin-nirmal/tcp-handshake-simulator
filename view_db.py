"""
Quick Database Viewer for TCP Handshake Mini Project
Run this anytime: python view_db.py
"""

import pymysql

def view_database():
    try:
        conn = pymysql.connect(
            host='127.0.0.1',
            user='root',
            password='Stefin@59',
            database='tcp_simulator_db'
        )
        cur = conn.cursor()
        
        print("\n" + "=" * 75)
        print("           MYSQL DATABASE: tcp_simulator_db")
        print("=" * 75)

        # 1. Users Table
        print("\n[TABLE: users]")
        cur.execute("SELECT id, username, password, role, created_at FROM users")
        users = cur.fetchall()
        print(f"{'ID':<4} | {'Username':<15} | {'Role':<12} | {'Password':<15} | {'Created At'}")
        print("-" * 75)
        for u in users:
            print(f"{u[0]:<4} | {u[1]:<15} | {u[3]:<12} | {u[2]:<15} | {u[4]}")

        # 2. Live Handshakes Table
        print("\n" + "=" * 75)
        print("[TABLE: live_tcp_handshakes]")
        cur.execute("""
            SELECT id, username, client_port, server_port, client_isn, server_isn, 
                   rtt_ms, socket_status, created_at 
            FROM live_tcp_handshakes ORDER BY id DESC LIMIT 10
        """)
        handshakes = cur.fetchall()
        print(f"{'ID':<4} | {'User':<10} | {'Client':<8} | {'Server':<8} | {'Client ISN':<12} | {'RTT (ms)':<8} | {'Status':<16} | {'Created At'}")
        print("-" * 95)
        for h in handshakes:
            print(f"{h[0]:<4} | {h[1]:<10} | {h[2]:<8} | {h[3]:<8} | {h[4]:<12} | {str(h[6]):<8} | {h[7]:<16} | {h[8]}")

        print("\n" + "=" * 75 + "\n")
        conn.close()

    except Exception as e:
        print(f"Error connecting to MySQL: {e}")

if __name__ == '__main__':
    view_database()

