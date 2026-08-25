#!/usr/bin/env python3
"""Chạy lệnh trong session riêng để tiến trình sống độc lập với shell gọi nó.

Dùng: detach.py <log_file> <cmd> [args...]  → in PID ra stdout.

`nohup ... &` chưa đủ: tiến trình vẫn nằm trong process group của shell, nên bị
hạ khi shell (hoặc terminal/agent) kết thúc phiên.
"""

import os
import sys


def main() -> int:
    if len(sys.argv) < 3:
        print("dùng: detach.py <log_file> <cmd> [args...]", file=sys.stderr)
        return 2

    log_path, cmd = sys.argv[1], sys.argv[2:]

    read_fd, write_fd = os.pipe()

    pid = os.fork()
    if pid > 0:
        os.close(write_fd)
        with os.fdopen(read_fd) as reader:
            child_pid = reader.read().strip()
        os.waitpid(pid, 0)
        if not child_pid:
            return 1
        print(child_pid)
        return 0

    os.close(read_fd)
    os.setsid()

    pid = os.fork()
    if pid > 0:
        with os.fdopen(write_fd, "w") as writer:
            writer.write(str(pid))
        os._exit(0)

    os.close(write_fd)
    log_fd = os.open(log_path, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o644)
    devnull_fd = os.open(os.devnull, os.O_RDONLY)
    os.dup2(devnull_fd, 0)
    os.dup2(log_fd, 1)
    os.dup2(log_fd, 2)

    try:
        os.execvp(cmd[0], cmd)
    except OSError as err:
        os.write(2, f"detach: không chạy được {cmd[0]}: {err}\n".encode())
        os._exit(127)


if __name__ == "__main__":
    sys.exit(main())
