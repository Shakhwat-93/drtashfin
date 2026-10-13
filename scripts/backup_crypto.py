#!/usr/bin/env python3
"""
==============================================================================
Doctor Patient Management System — Authenticated Backup Encryption Engine
==============================================================================
Envelope Format v2 (`DRTBKP02`):
  - Magic (8 bytes): b"DRTBKP02"
  - Header Length (4 bytes, uint32 BE)
  - Canonical JSON Envelope Header (UTF-8, authenticated as GCM AAD):
      {
        "alg": "AES-256-GCM",
        "created_at": "<ISO-8601 UTC>",
        "iter": 600000,
        "kdf": "PBKDF2-HMAC-SHA256",
        "kid": "<key-id>",
        "nonce_b64": "<12-byte CSPRNG nonce>",
        "plaintext_sha256": "<hex>",
        "plaintext_size": <int>,
        "salt_b64": "<32-byte CSPRNG salt>",
        "tag_bits": 128,
        "v": 2
      }
  - Ciphertext + 16-byte (128-bit) AES-256-GCM Authentication Tag

Backward Compatibility (`v1` — `Salted__`):
  - Transparently detects legacy OpenSSL `aes-256-cbc -pbkdf2 -iter 100000`
    backups (`Salted__` header), decrypts them using the active or archived
    keys, and verifies gzip stream integrity (`1f 8b` + `gzip.decompress`).
==============================================================================
"""

import base64
import datetime
import gzip
import hashlib
import json
import os
import struct
import subprocess
import sys
from pathlib import Path
from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

MAGIC_V2 = b"DRTBKP02"
MAGIC_V1 = b"Salted__"
PBKDF2_ITERATIONS_V2 = 600_000
SALT_BYTES_V2 = 32
NONCE_BYTES_V2 = 12
KEY_BYTES = 32


def load_passphrase(key_file: str) -> bytes:
    raw = Path(key_file).read_bytes().strip()
    if not raw:
        raise ValueError(f"Encryption key file is empty: {key_file}")
    return raw


def candidate_key_files(primary_key_file: str, keys_dir: str = "/etc/drtashfin-backup/keys", kid: str = "") -> list[str]:
    candidates: list[str] = []
    if kid and keys_dir:
        specific = os.path.join(keys_dir, f"{kid}.key")
        if os.path.isfile(specific):
            candidates.append(specific)
    if primary_key_file and os.path.isfile(primary_key_file) and primary_key_file not in candidates:
        candidates.append(primary_key_file)
    if keys_dir and os.path.isdir(keys_dir):
        for entry in sorted(os.listdir(keys_dir)):
            if entry.endswith(".key"):
                full = os.path.join(keys_dir, entry)
                if full not in candidates:
                    candidates.append(full)
    return candidates


def encrypt_v2(input_path: str, output_path: str, key_file: str, kid: str = "k1-primary") -> dict:
    passphrase = load_passphrase(key_file)
    plaintext = Path(input_path).read_bytes()
    plaintext_sha256 = hashlib.sha256(plaintext).hexdigest()
    plaintext_size = len(plaintext)

    salt = os.urandom(SALT_BYTES_V2)
    nonce = os.urandom(NONCE_BYTES_V2)
    derived_key = hashlib.pbkdf2_hmac("sha256", passphrase, salt, PBKDF2_ITERATIONS_V2, dklen=KEY_BYTES)

    header_obj = {
        "alg": "AES-256-GCM",
        "created_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "iter": PBKDF2_ITERATIONS_V2,
        "kdf": "PBKDF2-HMAC-SHA256",
        "kid": kid,
        "nonce_b64": base64.b64encode(nonce).decode("ascii"),
        "plaintext_sha256": plaintext_sha256,
        "plaintext_size": plaintext_size,
        "salt_b64": base64.b64encode(salt).decode("ascii"),
        "tag_bits": 128,
        "v": 2,
    }
    header_bytes = json.dumps(header_obj, sort_keys=True, separators=(",", ":")).encode("utf-8")
    prefix = MAGIC_V2 + struct.pack(">I", len(header_bytes)) + header_bytes

    aesgcm = AESGCM(derived_key)
    ciphertext_with_tag = aesgcm.encrypt(nonce, plaintext, prefix)

    out_bytes = prefix + ciphertext_with_tag
    Path(output_path).write_bytes(out_bytes)
    os.chmod(output_path, 0o600)

    return {
        "format": "v2",
        "alg": "AES-256-GCM",
        "kid": kid,
        "encrypted_size": len(out_bytes),
        "encrypted_sha256": hashlib.sha256(out_bytes).hexdigest(),
        "plaintext_size": plaintext_size,
        "plaintext_sha256": plaintext_sha256,
    }


def inspect_envelope(input_path: str) -> dict:
    data = Path(input_path).read_bytes()
    if len(data) < 16:
        raise ValueError("Encrypted file is truncated or too small.")

    magic = data[:8]
    if magic == MAGIC_V2:
        header_len = struct.unpack(">I", data[8:12])[0]
        if 12 + header_len > len(data):
            raise ValueError("Corrupted v2 envelope header length.")
        header = json.loads(data[12 : 12 + header_len].decode("utf-8"))
        return {
            "format": "v2",
            "magic": "DRTBKP02",
            "encrypted_size": len(data),
            "encrypted_sha256": hashlib.sha256(data).hexdigest(),
            "header": header,
        }
    elif magic == MAGIC_V1:
        return {
            "format": "v1",
            "magic": "Salted__",
            "alg": "AES-256-CBC (OpenSSL legacy)",
            "kdf": "PBKDF2-HMAC-SHA256",
            "iter": 100000,
            "encrypted_size": len(data),
            "encrypted_sha256": hashlib.sha256(data).hexdigest(),
        }
    else:
        raise ValueError("Unrecognized backup encryption header.")


def decrypt_any(input_path: str, output_path: str, key_file: str, keys_dir: str = "/etc/drtashfin-backup/keys") -> dict:
    data = Path(input_path).read_bytes()
    if len(data) < 16:
        raise ValueError("Encrypted file is truncated or invalid.")

    magic = data[:8]

    # 1. Version 2: DRTBKP02 Authenticated AES-256-GCM
    if magic == MAGIC_V2:
        header_len = struct.unpack(">I", data[8:12])[0]
        header_end = 12 + header_len
        if header_end + 16 > len(data):
            raise ValueError("Corrupted v2 backup envelope: missing header or GCM authentication tag.")

        try:
            header = json.loads(data[12:header_end].decode("utf-8"))
        except Exception as exc:
            raise ValueError(f"Corrupted v2 backup envelope JSON header: {exc}") from exc

        if header.get("v") != 2 or header.get("alg") != "AES-256-GCM":
            raise ValueError(f"Unsupported v2 header parameters: {header.get('alg')}")

        salt = base64.b64decode(header["salt_b64"])
        nonce = base64.b64decode(header["nonce_b64"])
        iterations = int(header.get("iter", PBKDF2_ITERATIONS_V2))
        kid = str(header.get("kid", ""))
        aad = data[:header_end]
        ciphertext_with_tag = data[header_end:]

        candidates = candidate_key_files(key_file, keys_dir, kid)
        if not candidates:
            raise FileNotFoundError("No candidate decryption key files found.")

        plaintext = None
        matched_key = None
        for cand in candidates:
            passphrase = load_passphrase(cand)
            derived_key = hashlib.pbkdf2_hmac("sha256", passphrase, salt, iterations, dklen=KEY_BYTES)
            aesgcm = AESGCM(derived_key)
            try:
                plaintext = aesgcm.decrypt(nonce, ciphertext_with_tag, aad)
                matched_key = os.path.basename(cand)
                break
            except InvalidTag:
                continue

        if plaintext is None:
            raise RuntimeError("AuthenticationTagVerificationError: GCM authentication tag verification failed (tampered ciphertext/AAD or wrong key).")

        actual_sha256 = hashlib.sha256(plaintext).hexdigest()
        expected_sha256 = header.get("plaintext_sha256")
        expected_size = header.get("plaintext_size")

        if expected_sha256 and actual_sha256 != expected_sha256:
            raise RuntimeError(f"Plaintext SHA-256 mismatch after GCM decryption: expected {expected_sha256}, got {actual_sha256}")
        if expected_size is not None and len(plaintext) != int(expected_size):
            raise RuntimeError(f"Plaintext size mismatch: expected {expected_size}, got {len(plaintext)}")

        # Verify valid gzip stream before writing
        gzip.decompress(plaintext[:0])  # module warm-up
        if plaintext[:2] == b"\x1f\x8b":
            # Full decompression integrity check in memory
            _ = gzip.decompress(plaintext)

        Path(output_path).write_bytes(plaintext)
        os.chmod(output_path, 0o600)
        return {
            "format": "v2",
            "alg": "AES-256-GCM",
            "kid": kid,
            "matched_key": matched_key,
            "tag_verified": True,
            "plaintext_size": len(plaintext),
            "plaintext_sha256": actual_sha256,
        }

    # 2. Version 1: Legacy OpenSSL Salted__ AES-256-CBC PBKDF2-100000
    if magic == MAGIC_V1:
        candidates = candidate_key_files(key_file, keys_dir, "")
        for cand in candidates:
            res = subprocess.run(
                [
                    "openssl",
                    "enc",
                    "-d",
                    "-aes-256-cbc",
                    "-salt",
                    "-pbkdf2",
                    "-iter",
                    "100000",
                    "-pass",
                    f"file:{cand}",
                    "-in",
                    input_path,
                    "-out",
                    output_path,
                ],
                capture_output=True,
                text=True,
            )
            if res.returncode == 0 and os.path.isfile(output_path):
                plaintext = Path(output_path).read_bytes()
                try:
                    _ = gzip.decompress(plaintext)
                except Exception:
                    continue
                os.chmod(output_path, 0o600)
                return {
                    "format": "v1",
                    "alg": "AES-256-CBC (legacy backward-compatible)",
                    "matched_key": os.path.basename(cand),
                    "gzip_verified": True,
                    "plaintext_size": len(plaintext),
                    "plaintext_sha256": hashlib.sha256(plaintext).hexdigest(),
                }
        if os.path.isfile(output_path):
            os.remove(output_path)
        raise RuntimeError("Legacy v1 AES-256-CBC decryption or gzip integrity check failed.")

    raise ValueError("Unrecognized backup format (expected DRTBKP02 or Salted__).")


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: backup_crypto.py [encrypt|decrypt|verify|inspect] ...", file=sys.stderr)
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "encrypt":
        if len(sys.argv) < 5:
            print("Usage: backup_crypto.py encrypt <in_file> <out_file> <key_file> [kid]", file=sys.stderr)
            sys.exit(1)
        in_f, out_f, key_f = sys.argv[2], sys.argv[3], sys.argv[4]
        kid = sys.argv[5] if len(sys.argv) > 5 else "k1-primary"
        info = encrypt_v2(in_f, out_f, key_f, kid)
        print(json.dumps(info))
    elif cmd == "decrypt":
        if len(sys.argv) < 5:
            print("Usage: backup_crypto.py decrypt <in_file> <out_file> <key_file> [keys_dir]", file=sys.stderr)
            sys.exit(1)
        in_f, out_f, key_f = sys.argv[2], sys.argv[3], sys.argv[4]
        keys_d = sys.argv[5] if len(sys.argv) > 5 else "/etc/drtashfin-backup/keys"
        info = decrypt_any(in_f, out_f, key_f, keys_d)
        print(json.dumps(info))
    elif cmd == "verify":
        if len(sys.argv) < 4:
            print("Usage: backup_crypto.py verify <in_file> <key_file> [keys_dir]", file=sys.stderr)
            sys.exit(1)
        in_f, key_f = sys.argv[2], sys.argv[3]
        keys_d = sys.argv[4] if len(sys.argv) > 4 else "/etc/drtashfin-backup/keys"
        tmp_out = f"{in_f}.verify_tmp_{os.getpid()}"
        try:
            info = decrypt_any(in_f, tmp_out, key_f, keys_d)
            print(json.dumps(info))
        finally:
            if os.path.exists(tmp_out):
                os.remove(tmp_out)
    elif cmd == "inspect":
        if len(sys.argv) < 3:
            print("Usage: backup_crypto.py inspect <in_file>", file=sys.stderr)
            sys.exit(1)
        info = inspect_envelope(sys.argv[2])
        print(json.dumps(info))
    else:
        print(f"Unknown command: {cmd}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
