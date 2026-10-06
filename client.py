"""
============================================================================
Live TCP Handshake Client
Computer Networks Lab Mini Project
Standalone Client Script to Execute Live Handshakes & Log to MySQL
============================================================================

Usage:
    python client.py
    python client.py --user "laptop_client"
    python client.py --host 127.0.0.1 --port 5000 --user "student_2"
    python client.py --fail   (Simulate connection timeout)
"""

import sys
import time
import argparse
import urllib.request
import json

def run_client(host="127.0.0.1", port=5000, username="external_client", simulate_failure=False):
    url = f"http://{host}:{port}/api/live_handshake"

    print("\n" + "=" * 65)
    print("      TCP THREE-WAY HANDSHAKE - LIVE CLIENT NODE")
    print("=" * 65)
    print(f"[*] Target Server : http://{host}:{port}")
    print(f"[*] Client User   : {username}")
    print(f"[*] Mode          : {'Connection Failure Test' if simulate_failure else 'Standard Live Handshake'}")
    print("-" * 65)

    payload = json.dumps({
        "username": username,
        "simulate_failure": simulate_failure
    }).encode('utf-8')

    req = urllib.request.Request(
        url,
        data=payload,
        headers={'Content-Type': 'application/json'}
    )

    print("[*] Initiating OS TCP Socket handshake...")
    t_start = time.perf_counter()

    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            elapsed_ms = round((time.perf_counter() - t_start) * 1000, 3)

            if not res_data.get('success'):
                print(f"[!] Server reported error: {res_data.get('error')}")
                return

            client_ip = res_data.get('client_ip')
            client_port = res_data.get('client_port')
            server_ip = res_data.get('server_ip')
            server_port = res_data.get('server_port')
            c_isn = res_data.get('client_isn')
            s_isn = res_data.get('server_isn')
            syn_ack = res_data.get('syn_ack_num')
            final_ack = res_data.get('final_ack_num')
            rtt_ms = res_data.get('rtt_ms')
            status = res_data.get('socket_status')
            rec_id = res_data.get('record_id')
            db_engine = res_data.get('engine')

            if simulate_failure:
                print(f"\n[!] [STEP 1] SYN sent from {client_ip}:{client_port} to {server_ip}:{server_port} (Seq = {c_isn})")
                print(f"[!] [TIMEOUT] Server did not respond within timeout window.")
                print(f"[!] Socket Status : {status}")
                print(f"[+] MySQL Log     : Stored in database as Record #{rec_id}")
            else:
                print(f"\n[+] [SOCKET BOUND] Client Ephemeral Port: {client_port} | Server Port: {server_port}")
                print(f"[+] [STEP 1: SYN]     Client -> Server | Seq = {c_isn}")
                print(f"[+] [STEP 2: SYN-ACK] Server -> Client | Seq = {s_isn}, Ack = {syn_ack} (ISN + 1)")
                print(f"[+] [STEP 3: ACK]     Client -> Server | Seq = {syn_ack}, Ack = {final_ack} (ISN + 1)")
                print("-" * 65)
                print(f"[SUCCESS] TCP Socket Status : {status}")
                print(f"[SUCCESS] Kernel Socket RTT : {rtt_ms} ms")
                print(f"[SUCCESS] HTTP Request Time : {elapsed_ms} ms")
                print(f"[SUCCESS] MySQL Database    : Saved in 'live_tcp_handshakes' (Record #{rec_id})")
                print(f"[SUCCESS] Database Engine   : {db_engine}")

            print("=" * 65 + "\n")

    except urllib.error.URLError as e:
        print(f"\n[!] Connection Error: Unable to reach server at http://{host}:{port}")
        print(f"    Reason: {e.reason}")
        print("    Please make sure 'python app.py' is running first!\n")
    except Exception as e:
        print(f"\n[!] Unexpected Error: {e}\n")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Live TCP Handshake Client Node")
    parser.add_argument("--host", default="127.0.0.1", help="Server host IP (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=5000, help="Server port (default: 5000)")
    parser.add_argument("--user", default="external_client", help="Client username/identifier")
    parser.add_argument("--fail", action="store_true", help="Simulate a socket timeout failure")

    args = parser.parse_args()
    run_client(host=args.host, port=args.port, username=args.user, simulate_failure=args.fail)
