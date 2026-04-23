"""One-shot script: connect via password and install SSH public key."""
import paramiko
import sys

HOST = "149.28.111.89"
USER = "root"
PASSWORD = "V7.wwzfKiE?uQ,R-"
PUB_KEY = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFx5ZPXOvlFedg5c3FFA+di9Kjw6V21XTF3tgLzxv5zY ckpaz@gooltech.app"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

print(f"Connecting to {HOST}...")
client.connect(HOST, username=USER, password=PASSWORD, timeout=20)
print("Connected!")

cmds = [
    "mkdir -p ~/.ssh && chmod 700 ~/.ssh",
    f"grep -qxF '{PUB_KEY}' ~/.ssh/authorized_keys 2>/dev/null || echo '{PUB_KEY}' >> ~/.ssh/authorized_keys",
    "chmod 600 ~/.ssh/authorized_keys",
    "uname -a",
    "cat /etc/os-release | head -2",
]

for cmd in cmds:
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out:
        print(f"$ {cmd}\n{out}")
    if err:
        print(f"ERR: {err}", file=sys.stderr)

client.close()
print("\nDone. SSH key installed.")
